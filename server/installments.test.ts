// **نظامُ الأقساط** (قرارُ المالك ٢٠٢٦-١٠-١٤، ترحيل ١٤٢، §4.ea) — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:installments`.
//
//   • **أ**: القواعدُ الصرفة — العددُ والمواعيدُ وآخرُ الشهر، وما دُفع والتالي والمتأخّر، والتذكيرُ بنافذته وبما قبل فتح الخطّة، والمدخلات.
//   • **ب**: الفتحُ مع الدفعة في معاملتها — المبلغُ دينُ القسم بعدها، وخطّةٌ نشطةٌ واحدة للقسم، وقسمٌ واحد، وخطأُ الخطّة لا يترك دفعة.
//   • **ج**: الأرقامُ والقوائم — ما دُفع بعد الفتح، والمتأخّر، ونطاقُ الفرع، ومَن يرى (المرضى **ودفعاتِهم**).
//   • **د**: التعديلُ والإلغاءُ للمسؤول ومدير الفرع وحدهما، في فرعه، بسطر تدقيق — والإلغاءُ يفتح القسمَ لخطّةٍ جديدة.
//   • **هـ**: التذكير — قبل يومٍ وفي يومه بالساعة، مرّةً واحدة، وللموظّفين (فرعُ الخطّة) وللمريض في تلغرام (رسالتان للجهة نفسِها)،
//     ولا تذكيرَ لقسطٍ دُفع ولا لخطّةٍ ملغاة أو لمريضٍ في السلّة، ولا لما فات بيوم، ولا عن لحظةٍ قبل فتح الخطّة؛ والاكتمال.
//   • **و**: حذفُ المريض بخطّته وتذكيراتها، والدمجُ ينقل الخطّةَ إلى قسم الهدف، وخطّتان نشطتان على القسم نفسِه تردّان الدمج.

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { seedChartOfAccounts } from "./migrations/seed_chart_of_accounts";
import * as migration142 from "./migrations/142_installments";
import { runInstallmentRemindersOnce } from "./installments/reminders";
import { createPlanFromPaymentsTx, InstallmentError } from "./installments/store";
import { resolveStaffRecipients } from "./staff_telegram/dispatcher";
import { renderTelegramText } from "./patient_notifications/render";
import { baghdadTodayYmd } from "@shared/visit_date";
import {
  addDaysYmd, addMonthsYmd, baghdadMoment, dueDates, installmentCount, parseInstallmentInput, planFigures, remindersDue,
} from "@shared/installments";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 7013;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الأقساط";
const BG = 1, DQ = 2;
const ADMIN = 9971, MGR = 9972, RECV = 9973, MGR_DQ = 9974, DOC = 9975, RECV_DQ = 9976;
const USERS = [ADMIN, MGR, RECV, MGR_DQ, DOC, RECV_DQ];
const TODAY = baghdadTodayYmd();
const PAY_PERMS = { canViewPatients: true, canViewPayments: true, canAddPayments: true };

const sess = (userId: number, role: string, branchId: number, permissions: any) => ({
  userId, role, isAdmin: false, branchId, accessibleBranches: [branchId], displayName: `u${userId}`, permissions,
});
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BG, accessibleBranches: [BG, DQ], displayName: "المسؤول", permissions: PAY_PERMS },
  mgr: sess(MGR, "branch_manager", BG, PAY_PERMS),
  recv: sess(RECV, "reception", BG, PAY_PERMS),
  mgrDq: sess(MGR_DQ, "branch_manager", DQ, PAY_PERMS),
  //  الطبيبُ يرى الملفَّ بلا مال — فلا يرى الأقساط.
  doc: sess(DOC, "doctor", BG, { canViewPatients: true }),
  recvDq: sess(RECV_DQ, "reception", DQ, PAY_PERMS),
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const LIMB = "أطراف صناعية";
const SUPPORT = "مساند طبية";
/** مريضٌ بقسمٍ (أو قسمين) بكلفةٍ يدوية — ويرجع معرّفَه ومعرّفاتِ أقسامه. */
async function mkPatient(label: string, branch: number, cases: { type: string; cost: number }[]) {
  const total = cases.reduce((s, c) => s + c.cost, 0);
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$3,$4,'new') RETURNING id`, [`${MARK} ${label}`, MARK, branch, total]);
  const caseIds: Record<string, number> = {};
  for (const c of cases) {
    const [r] = await q<{ id: number }>(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
       VALUES ($1,$2,$3,$4,'manual','active') RETURNING id`, [p.id, branch, c.type, c.cost]);
    caseIds[c.type] = r.id;
  }
  return { id: Number(p.id), cases: caseIds };
}
const plan = (over: any = {}) => ({ monthlyAmount: 200_000, firstDueDate: addMonthsYmd(TODAY, 1), reminderTime: "09:30", ...over });
const pay = (s: any, patientId: number, branchId: number, amount: number, installmentPlan?: any, extra: any = {}) =>
  http("POST", "/api/payments", s, { patientId, branchId, amount, paymentTreatmentType: LIMB, ...extra, ...(installmentPlan ? { installmentPlan } : {}) });
const paymentCount = async (pid: number) => Number((await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pid]))[0].n);
const planRow = async (id: number) => (await q(`SELECT * FROM installment_plans WHERE id=$1`, [id]))[0];

async function cleanup() {
  const pids = (await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])).map((r) => Number(r.id));
  for (const id of pids) await storage.deletePatient(id).catch((e) => console.error("cleanup", id, e?.message));
  await q(`DELETE FROM staff_notification_outbox WHERE event_type = 'installment_due'`);
  await q(`DELETE FROM staff_telegram_links WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM staff_notification_prefs WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM audit_log WHERE entity_type = 'installment_plan'`);
}

async function main() {
  console.log("\n── أ. القواعد الصرفة ──");
  same("أ١. العددُ سقفُ القسمة، والأخيرُ ما بقي", [installmentCount(600_000, 200_000), installmentCount(650_000, 200_000), installmentCount(0, 1)], [3, 4, 0]);
  same("أ٢. **شهريّ باليوم نفسِه، وآخرُ الشهر حين لا يوجد** (٣١ يناير ⟵ ٢٨ فبراير ⟵ ٣١ مارس)",
    dueDates("2027-01-31", 3), ["2027-01-31", "2027-02-28", "2027-03-31"]);
  const f = planFigures({ totalAmount: 650_000, installmentAmount: 200_000, firstDueDate: "2027-01-10", paidToward: 250_000, today: "2027-02-11" });
  same("أ٣. **ما دُفع يُطفئ الأقساطَ بالترتيب** — ٢٥٠ ألفاً = القسطُ الأوّل وربعُ الثاني، والثاني متأخّرٌ ببقيّته",
    [f.count, f.paidCount, f.nextIndex, f.nextDueDate, f.nextAmount, f.overdueCount, f.overdueAmount, f.remaining, f.completed],
    [4, 1, 1, "2027-02-10", 150_000, 1, 150_000, 400_000, false]);
  const done = planFigures({ totalAmount: 600_000, installmentAmount: 200_000, firstDueDate: "2027-01-10", paidToward: 600_000, today: "2028-01-01" });
  same("أ٤. ومكتملةٌ بلا متأخّرٍ ولا تالٍ", [done.completed, done.overdueCount, done.nextIndex], [true, 0, null]);
  same("أ٥. ساعةُ بغداد لحظةٌ مطلقة (UTC+3)", baghdadMoment("2027-03-14", "09:30").toISOString(), "2027-03-14T06:30:00.000Z");
  const base = { totalAmount: 600_000, installmentAmount: 200_000, firstDueDate: "2027-03-15", paidToward: 0, reminderTime: "09:30",
    createdAt: new Date("2027-01-01T00:00:00Z") };
  const at = (ymd: string, mins = 0) => new Date(baghdadMoment(ymd, "09:30").getTime() + mins * 60_000);
  same("أ٦. **قبل يومٍ بالساعة** — ولا شيءَ قبلها بدقيقة",
    [remindersDue({ ...base, today: "2027-03-14", now: at("2027-03-14", -1) }), remindersDue({ ...base, today: "2027-03-14", now: at("2027-03-14", 5) })],
    [[], [{ index: 0, kind: "before", dueDate: "2027-03-15" }]]);
  same("أ٧. **وفي يومه** (وتذكيرُ الأمس خرج من نافذة اليوم الواحد)",
    remindersDue({ ...base, today: "2027-03-15", now: at("2027-03-15", 1) }).map((r) => r.kind), ["due"]);
  same("أ٨. **وما فات بيومٍ لا يُرسَل متأخّراً**", remindersDue({ ...base, today: "2027-03-16", now: at("2027-03-15", 24 * 60 + 1) }), []);
  same("أ٩. **ولا عن لحظةٍ قبل فتح الخطّة**",
    remindersDue({ ...base, createdAt: at("2027-03-14", 10), today: "2027-03-14", now: at("2027-03-14", 20) }), []);
  same("أ١٠. وقسطٌ دُفع لا يُذكَّر به — والتالي بعد شهر",
    remindersDue({ ...base, paidToward: 200_000, today: "2027-03-14", now: at("2027-03-14", 5) }), []);
  same("أ١١. المدخلات: القسطُ صحيحٌ موجب، والتاريخُ لا يسبق اليوم ولا يتجاوز سنة، والساعةُ HH:MM، وهاتفُ الكفيل أرقام",
    [parseInstallmentInput({ ...plan(), monthlyAmount: 0 }, TODAY).ok, parseInstallmentInput(plan({ firstDueDate: addDaysYmd(TODAY, -1) }), TODAY).ok,
     parseInstallmentInput(plan({ firstDueDate: addMonthsYmd(TODAY, 13) }), TODAY).ok, parseInstallmentInput(plan({ reminderTime: "25:00" }), TODAY).ok,
     parseInstallmentInput(plan({ guarantorPhone: "abc" }), TODAY).ok, parseInstallmentInput(plan({ monthlyAmount: "200,000" }), TODAY).ok],
    [false, false, false, false, false, true]);
  same("أ١٢. والتعديلُ جزئيّ ويقبل تاريخاً مضى (خطّةٌ بدأت قبل شهور)",
    parseInstallmentInput({ firstDueDate: addDaysYmd(TODAY, -40) }, TODAY, { partial: true }), { ok: true, value: { firstDueDate: addDaysYmd(TODAY, -40) } });

  //  ── التحضير ──
  await q(`INSERT INTO branches (id,name) VALUES ($1,'بغداد'),($2,'ذي قار') ON CONFLICT (id) DO NOTHING`, [BG, DQ]);
  await seedChartOfAccounts();
  for (const [id, role, br] of [[ADMIN, "admin", BG], [MGR, "branch_manager", BG], [RECV, "reception", BG], [MGR_DQ, "branch_manager", DQ],
    [DOC, "doctor", BG], [RECV_DQ, "reception", DQ]] as any[]) {
    //  الصلاحياتُ تُقرأ حيّاً من الحساب في كلّ طلب (§4.ar البند ٧) — فالطبيبُ بلا «رؤية الدفعات» في صفّه لا في جلسته وحدها.
    const money = role !== "doctor";
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
               can_view_patients,can_view_payments,can_add_payments,can_delete_patients)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,$7,$7,$8)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
               can_view_patients=true, can_view_payments=EXCLUDED.can_view_payments, can_add_payments=EXCLUDED.can_add_payments,
               can_delete_patients=EXCLUDED.can_delete_patients`,
      [id, `inst_u${id}`, `u${id}`, role, br, JSON.stringify(role === "admin" ? [BG, DQ] : [br]), money, role === "admin"]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    console.log("\n── ب. الفتح مع الدفعة ──");
    const p1 = await mkPatient("مريض١", BG, [{ type: "prosthetic", cost: 1_000_000 }]);
    const r1 = await pay(S.recv, p1.id, BG, 400_000, plan({ guarantorName: "أبو علي", guarantorPhone: "07701112233", notes: "يدفع أوّلَ كلّ شهر" }));
    const plan1 = Number(r1.body?.installmentPlanId);
    check(r1.status === 201 && plan1 > 0, "ب١. **الدفعةُ ومعها الخطّة (٢٠١) — `installmentPlanId` في الردّ**", JSON.stringify(r1));
    const row1 = await planRow(plan1);
    same("ب٢. **المبلغُ دينُ القسم بعد الدفعة** (٦٠٠ ألف)، والعددُ ٣، والقسمُ ودفعةُ الفتح ومَن فتح والساعةُ والكفيل",
      [Number(row1?.total_amount), Number(row1?.installment_amount), row1?.number_of_installments, row1?.case_id, row1?.opening_payment_id,
       row1?.created_by_user_id, row1?.reminder_time, row1?.guarantor_name, row1?.guarantor_phone, row1?.status, row1?.branch_id],
      [600_000, 200_000, 3, p1.cases.prosthetic, r1.body?.id, RECV, "09:30", "أبو علي", "07701112233", "active", BG]);
    same("ب٣. وسطرُ تدقيق الفتح", (await q(`SELECT action, user_id FROM audit_log WHERE entity_type='installment_plan' AND entity_id=$1`, [plan1])),
      [{ action: "create", user_id: RECV }]);
    const before = await paymentCount(p1.id);
    const dup = await pay(S.recv, p1.id, BG, 50_000, plan());
    same("ب٤. **خطّةٌ نشطةٌ واحدة للقسم** — الثانيةُ ٤٠٩، **ولا دفعةَ حُفظت معها**",
      [dup.status, /قائمة/.test(dup.body?.message ?? ""), /لم تُحفظ الدفعة/.test(dup.body?.message ?? ""), await paymentCount(p1.id)], [409, true, true, before]);
    const bad = await pay(S.recv, p1.id, BG, 50_000, plan({ monthlyAmount: 0 }));
    const past = await pay(S.recv, p1.id, BG, 50_000, plan({ firstDueDate: addDaysYmd(TODAY, -1) }));
    same("ب٥. مدخلاتٌ خاطئة ⟵ ٤٠٠ ولا دفعة", [bad.status, past.status, await paymentCount(p1.id)], [400, 400, before]);
    const p2 = await mkPatient("بلا دين", BG, [{ type: "prosthetic", cost: 100_000 }]);
    const nodebt = await pay(S.recv, p2.id, BG, 100_000, plan());
    same("ب٦. **دفعةٌ تُنهي الدين ⟵ لا أقساط (٤٠٠) ولا دفعة**",
      [nodebt.status, /لا دينَ/.test(nodebt.body?.message ?? ""), await paymentCount(p2.id)], [400, true, 0]);
    const p3 = await mkPatient("قسمان", BG, [{ type: "prosthetic", cost: 500_000 }, { type: "medical_support", cost: 500_000 }]);
    const two = await http("POST", "/api/payments", S.recv, { patientId: p3.id, branchId: BG, amount: 200_000, installmentPlan: plan(),
      treatmentEntries: [{ treatmentType: LIMB, cost: 100_000, sessionCount: 1 }, { treatmentType: SUPPORT, cost: 100_000, sessionCount: 1 }] });
    //  دفعةٌ على جهازين يردّها حارسُ «جهازٌ واحد» قبل الخطّة أصلاً — فحارسُ الخطّة يُقاس في طبقتها مباشرةً.
    //  والمعاملةُ تُرجَع دائماً — فلا تبقى خطّةٌ لو سقط الحارس فتُفسد ما بعدها.
    let oneCaseErr: any = "لم يُرفض";
    await db.transaction(async (tx) => {
      try {
        await createPlanFromPaymentsTx(tx, [
          { id: 1, caseId: p3.cases.prosthetic, patientId: p3.id, branchId: BG },
          { id: 2, caseId: p3.cases.medical_support, patientId: p3.id, branchId: BG },
        ], (parseInstallmentInput(plan(), TODAY) as any).value, { userId: RECV, userName: "u" });
      } catch (e) { oneCaseErr = e; }
      throw new Error("rollback");
    }).catch(() => undefined);
    same("ب٧. **الأقساطُ لقسمٍ واحد** — دفعتان على قسمين ⟵ ٤٠٠ (والطلبُ نفسُه يردّه حارسُ الجهاز الواحد بلا دفعة)",
      [oneCaseErr instanceof InstallmentError ? [oneCaseErr.status, oneCaseErr.message] : String(oneCaseErr), two.status, await paymentCount(p3.id),
       (await q(`SELECT count(*)::int n FROM installment_plans WHERE patient_id=$1`, [p3.id]))[0].n],
      [[400, "الأقساطُ لقسمٍ واحد — سجّل دفعةَ كلّ قسمٍ وحدها"], 400, 0, 0]);
    const normal = await pay(S.recv, p1.id, BG, 50_000);
    same("ب٨. **ودفعةٌ عادية لا تتأثّر** (٢٠١، بلا خطّة) — وتُحسب على أقساط القسم",
      [normal.status, normal.body?.installmentPlanId, await paymentCount(p1.id)], [201, null, before + 1]);

    console.log("\n── ج. الأرقام والقوائم ──");
    const mine = await http("GET", `/api/patients/${p1.id}/installments`, S.recv);
    const v1 = mine.body?.plans?.[0];
    same("ج١. **ما دُفع بعد الفتح** (٥٠ ألفاً) والتالي بقيّتُه (١٥٠ ألفاً) وموعدُه — والاستقبالُ لا يعدّل",
      [mine.status, v1?.figures?.paidToward, v1?.figures?.nextAmount, v1?.figures?.nextDueDate, v1?.figures?.overdueCount, mine.body?.canManage],
      [200, 50_000, 150_000, addMonthsYmd(TODAY, 1), 0, false]);
    same("ج٢. وديونُ الأقسام للنافذة — الباقي والخطّةُ النشطة",
      mine.body?.cases, [{ caseId: p1.cases.prosthetic, caseType: "prosthetic", remaining: 550_000, activePlanId: plan1 }]);
    same("ج٣. **المديرُ يعدّل، والطبيبُ لا يرى (٤٠٣)** — يرى المرضى بلا دفعاتهم",
      [(await http("GET", `/api/patients/${p1.id}/installments`, S.mgr)).body?.canManage, (await http("GET", `/api/patients/${p1.id}/installments`, S.doc)).status,
       (await http("GET", "/api/installments", S.doc)).status, (await http("GET", "/api/installments/overdue-count", S.doc)).status],
      [true, 403, 403, 403]);
    //  خطّةٌ متأخّرة: موعدُها الأوّل قبل أربعين يوماً ⟵ قسطان مرّ يومُهما.
    const p4 = await mkPatient("متأخر", BG, [{ type: "prosthetic", cost: 700_000 }]);
    const plan4 = Number((await pay(S.recv, p4.id, BG, 100_000, plan())).body?.installmentPlanId);
    await q(`UPDATE installment_plans SET start_date = $2 WHERE id=$1`, [plan4, addDaysYmd(TODAY, -40)]);
    const p5 = await mkPatient("قريب", BG, [{ type: "prosthetic", cost: 700_000 }]);
    const plan5 = Number((await pay(S.recv, p5.id, BG, 100_000, plan({ firstDueDate: addDaysYmd(TODAY, 3) }))).body?.installmentPlanId);
    const p6 = await mkPatient("ذي قار", DQ, [{ type: "prosthetic", cost: 700_000 }]);
    const plan6 = Number((await pay(S.recvDq, p6.id, DQ, 100_000, plan())).body?.installmentPlanId);
    await q(`UPDATE installment_plans SET start_date = $2 WHERE id=$1`, [plan6, addDaysYmd(TODAY, -5)]);
    const ids = (r: any) => (r.body ?? []).map((p: any) => p.id).sort((a: number, b: number) => a - b);
    const overdue = await http("GET", "/api/installments?scope=overdue", S.recv);
    same("ج٤. **«متأخّرة»: قسطان مرّ يومُهما** — وفرعُ الجلسة وحده", [ids(overdue), overdue.body?.[0]?.figures?.overdueCount], [[plan4], 2]);
    same("ج٥. «مستحقّة خلال أسبوع» و«كلّ النشطة»",
      [ids(await http("GET", "/api/installments?scope=upcoming", S.recv)), ids(await http("GET", "/api/installments?scope=active", S.recv))],
      [[plan5], [plan1, plan4, plan5].sort((a, b) => a - b)]);
    same("ج٦. **رقمُ الشريط بنطاق الفرع** — بغداد ١، ذي قار ١، والمسؤولُ ٢ وبفرعٍ يختاره ١",
      [(await http("GET", "/api/installments/overdue-count", S.recv)).body?.count, (await http("GET", "/api/installments/overdue-count", S.recvDq)).body?.count,
       (await http("GET", "/api/installments/overdue-count", S.admin)).body?.count, (await http("GET", `/api/installments/overdue-count?branchId=${DQ}`, S.admin)).body?.count],
      [1, 1, 2, 1]);
    const p7 = await mkPatient("في السلة", DQ, [{ type: "prosthetic", cost: 700_000 }]);
    const plan7 = Number((await pay(S.recvDq, p7.id, DQ, 100_000, plan())).body?.installmentPlanId);
    await q(`UPDATE installment_plans SET start_date = $2 WHERE id=$1`, [plan7, addDaysYmd(TODAY, -5)]);
    const before7 = (await http("GET", "/api/installments/overdue-count", S.admin)).body?.count;
    const del7 = await http("DELETE", `/api/patients/${p7.id}`, S.admin, { reason: "تجربة السلّة" });
    same("ج٧. **ومريضُ السلّة خارجَ القوائم**",
      [before7, del7.status, (await http("GET", "/api/installments/overdue-count", S.admin)).body?.count], [3, 200, 2]);

    console.log("\n── د. التعديل والإلغاء ──");
    same("د١. **الاستقبالُ لا يعدّل ولا يلغي (٤٠٣)** — ومديرُ فرعٍ آخر كذلك",
      [(await http("PATCH", `/api/installments/${plan1}`, S.recv, { monthlyAmount: 300_000 })).status,
       (await http("POST", `/api/installments/${plan1}/cancel`, S.recv, { reason: "طلب المريض" })).status,
       (await http("PATCH", `/api/installments/${plan1}`, S.mgrDq, { monthlyAmount: 300_000 })).status, Number((await planRow(plan1)).installment_amount)],
      [403, 403, 403, 200_000]);
    const ed = await http("PATCH", `/api/installments/${plan1}`, S.mgr, { monthlyAmount: 300_000 });
    same("د٢. **المديرُ في فرعه يعدّل والعددُ يُعاد حسابُه** (٦٠٠ ÷ ٣٠٠ = ٢) — بسطر تدقيق",
      [ed.status, (await planRow(plan1)).number_of_installments, (await planRow(plan1)).updated_by_name,
       (await q(`SELECT count(*)::int n FROM audit_log WHERE entity_type='installment_plan' AND entity_id=$1 AND action='update'`, [plan1]))[0].n],
      [200, 2, `u${MGR}`, 1]);
    same("د٣. وطلبٌ بلا تغيير ⟵ ٤٠٠", (await http("PATCH", `/api/installments/${plan1}`, S.mgr, {})).status, 400);
    await q(`INSERT INTO installment_reminders (plan_id, due_index, kind) VALUES ($1,0,'before')`, [plan1]);
    await http("PATCH", `/api/installments/${plan1}`, S.mgr, { reminderTime: "11:00" });
    await http("PATCH", `/api/installments/${plan1}`, S.mgr, { firstDueDate: addMonthsYmd(TODAY, 1), monthlyAmount: 300_000 });
    const keptLog = Number((await q(`SELECT count(*)::int n FROM installment_reminders WHERE plan_id=$1`, [plan1]))[0].n);
    await http("PATCH", `/api/installments/${plan1}`, S.mgr, { firstDueDate: addMonthsYmd(TODAY, 2) });
    same("د٤. **موعدٌ تغيّر ⟵ سجلُّ ما أُرسل يُمحى** فتُذكَّر المواعيدُ الجديدة — والساعةُ أو الموعدُ نفسُه لا يمحوه",
      [keptLog, Number((await q(`SELECT count(*)::int n FROM installment_reminders WHERE plan_id=$1`, [plan1]))[0].n)], [1, 0]);
    same("د٥. الإلغاءُ بلا سبب ⟵ ٤٠٠", (await http("POST", `/api/installments/${plan1}/cancel`, S.mgr, { reason: "" })).status, 400);
    const cn = await http("POST", `/api/installments/${plan1}/cancel`, S.mgr, { reason: "اتّفاقٌ جديد مع المريض" });
    const row1c = await planRow(plan1);
    same("د٦. **والإلغاءُ بسبب** — حالتُه وسببُه ومَن ألغى، وسطرُ تدقيق",
      [cn.status, row1c.status, row1c.cancel_reason, row1c.cancelled_by_name,
       (await q(`SELECT notes FROM audit_log WHERE entity_type='installment_plan' AND entity_id=$1 AND action='cancel'`, [plan1]))[0]?.notes],
      [200, "cancelled", "اتّفاقٌ جديد مع المريض", `u${MGR}`, "اتّفاقٌ جديد مع المريض"]);
    same("د٧. والملغاةُ لا تُعدَّل (٤٠٩)", (await http("PATCH", `/api/installments/${plan1}`, S.mgr, { monthlyAmount: 100_000 })).status, 409);
    const reopen = await pay(S.recv, p1.id, BG, 50_000, plan({ monthlyAmount: 250_000 }));
    same("د٨. **وبعد الإلغاء تُفتح على القسم خطّةٌ جديدة** — على دينه الآن (٥٠٠ ألف ⟵ قسطان)",
      [reopen.status, Number((await planRow(Number(reopen.body?.installmentPlanId)))?.total_amount),
       (await planRow(Number(reopen.body?.installmentPlanId)))?.number_of_installments], [201, 500_000, 2]);

    console.log("\n── هـ. التذكير ──");
    //  التفعيلُ كما يزرعه الترحيل: الاستقبالُ ومدراءُ الفروع النشطون — لا الطبيبُ ولا المسؤول.
    await pool.query(migration142.sql);
    same("هـ١. **الترحيلُ يفعّل «قسطٌ مستحقّ» للاستقبال ومدراء الفروع وحدهم**",
      (await q(`SELECT user_id FROM staff_notification_prefs WHERE event_type='installment_due' AND user_id = ANY($1::int[]) ORDER BY user_id`, [USERS]))
        .map((r) => r.user_id), [MGR, RECV, MGR_DQ, RECV_DQ]);
    for (const u of [MGR, RECV, MGR_DQ, RECV_DQ, DOC]) {
      await q(`INSERT INTO staff_telegram_links (user_id, chat_id) VALUES ($1,$2) ON CONFLICT (user_id) DO NOTHING`, [u, String(70_000 + u)]);
    }
    //  خطّةُ التذكير: أوّلُ قسطٍ ١٥ آذار ٢٠٢٧ بساعة ٠٩:٣٠، وفُتحت قبلها بزمن.
    const DUE = "2027-03-15";
    const mkReminderPlan = async (label: string, branch = BG, s: any = S.recv) => {
      const p = await mkPatient(label, branch, [{ type: "prosthetic", cost: 700_000 }]);
      const id = Number((await pay(s, p.id, branch, 100_000, plan({ guarantorName: "أبو علي", guarantorPhone: "07701112233" }))).body?.installmentPlanId);
      await q(`UPDATE installment_plans SET start_date=$2, created_at='2026-10-01' WHERE id=$1`, [id, DUE]);
      return { p, id };
    };
    const A = await mkReminderPlan("تذكير");
    const [{ patient_code: codeA }] = await q(`SELECT patient_code FROM patients WHERE id=$1`, [A.p.id]);
    await q(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation) VALUES ($1,'telegram',$2,'self')`, [A.p.id, "880001"]);
    const C = await mkReminderPlan("ملغاة");
    await http("POST", `/api/installments/${C.id}/cancel`, S.mgr, { reason: "تجربة الإلغاء" });
    const T = await mkReminderPlan("في السلة");
    await http("DELETE", `/api/patients/${T.p.id}`, S.admin, { reason: "تجربة السلّة" });
    const PD = await mkReminderPlan("دفع قسطه");
    await pay(S.recv, PD.p.id, BG, 200_000);
    const watched = [A.id, C.id, T.id, PD.id];
    const at = (ymd: string, mins: number) => new Date(baghdadMoment(ymd, "09:30").getTime() + mins * 60_000);
    const run = async (now: Date) => (await runInstallmentRemindersOnce(now)).sent.filter((s) => watched.includes(s.planId));

    same("هـ٢. **قبل الساعة بدقيقة لا شيء**", await run(at("2027-03-14", -1)), []);
    same("هـ٣. **قبل الموعد بيوم بالساعة** — للخطّة النشطة وحدها: لا الملغاة ولا مريضُ السلّة ولا مَن دفع قسطَه",
      await run(at("2027-03-14", 5)), [{ planId: A.id, index: 0, kind: "before" }]);
    same("هـ٤. **ومرّةً واحدة** — الدورةُ التالية لا تعيده", await run(at("2027-03-14", 6)), []);
    same("هـ٥. **وفي يومه بالساعة**", await run(at(DUE, 1)), [{ planId: A.id, index: 0, kind: "due" }]);
    same("هـ٦. وسجلُّ ما أُرسل", (await q(`SELECT due_index, kind FROM installment_reminders WHERE plan_id=$1 ORDER BY sent_at, kind`, [A.id])),
      [{ due_index: 0, kind: "before" }, { due_index: 0, kind: "due" }]);
    const staff = await q(`SELECT branch_id, text, link_path FROM staff_notification_outbox WHERE event_type='installment_due' AND link_path=$1 ORDER BY id`, [`/patients/${A.p.id}`]);
    same("هـ٧. **رسالتا الموظّفين** بفرع الخطّة ورابطِ الملفّ",
      staff.map((r) => [r.branch_id, r.link_path]), [[BG, `/patients/${A.p.id}`], [BG, `/patients/${A.p.id}`]]);
    check(/غداً/.test(staff[0]?.text) && /اليوم/.test(staff[1]?.text) && /القسط 1 من 3/.test(staff[0]?.text) && /200,000 دينار/.test(staff[0]?.text)
      && /15\/03\/2027/.test(staff[0]?.text) && /أبو علي — 07701112233/.test(staff[0]?.text) && /أطراف/.test(staff[0]?.text),
      "هـ٨. **ونصُّها**: غداً ثمّ اليوم، القسطُ ١ من ٣، المبلغُ والموعد، والقسم، والكفيل", JSON.stringify(staff.map((r) => r.text)));
    const recips = (await resolveStaffRecipients({ event_type: "installment_due", branch_id: BG, target_user_ids: null, exclude_user_id: null, specialty: null }))
      .map((r) => r.userId).filter((u) => USERS.includes(u)).sort();
    same("هـ٩. **المستلمون: استقبالُ فرع الخطّة ومديرُه** — لا ذي قار ولا الطبيب", recips, [MGR, RECV].sort());
    const deliveries = await q(`SELECT notification_type, channel, payload FROM patient_notification_deliveries WHERE patient_id=$1 ORDER BY id`, [A.p.id]);
    same("هـ١٠. **والمريضُ في تلغرام: رسالتان للجهة نفسِها** (الفهرسُ لم يعد يردّ الثانية)",
      deliveries.map((d) => [d.notification_type, d.channel, d.payload?.kind, d.payload?.amount, d.payload?.index, d.payload?.count]),
      [["installment_due", "telegram", "before", 200_000, 1, 3], ["installment_due", "telegram", "due", 200_000, 1, 3]]);
    const txt = renderTelegramText("installment_due", deliveries[0]?.payload, codeA);
    check(Boolean(txt) && txt!.includes(String(codeA)) && /قسطكم الشهري 200,000 دينار مستحقّ غداً/.test(txt!) && /\(القسط 1 من 3\)/.test(txt!) && !txt!.includes(MARK),
      "هـ١١. **ونصُّ المريض**: رمزُه والمبلغُ والموعدُ ورقمُ القسط — بلا اسم", String(txt));
    same("هـ١٢. **وما فات بأكثر من يوم لا يُرسَل** (الخادمُ كان متوقّفاً)", await run(at("2027-04-15", 24 * 60 + 2)), []);
    same("هـ١٣. ومَن دفع قسطَه الأوّل يُذكَّر بالثاني في وقته",
      await run(at("2027-04-14", 1)), [{ planId: A.id, index: 1, kind: "before" }, { planId: PD.id, index: 1, kind: "before" }]);
    //  خطّةٌ فُتحت اليوم بموعدٍ اليوم وساعة ٠٠:٠٠ ⟵ لحظتا تذكيرها قبل فتحها.
    const pz = await mkPatient("فتحت بعد الساعة", BG, [{ type: "prosthetic", cost: 700_000 }]);
    const planZ = Number((await pay(S.recv, pz.id, BG, 100_000, plan({ firstDueDate: TODAY, reminderTime: "00:00" }))).body?.installmentPlanId);
    same("هـ١٤. **ولا تذكيرَ عن لحظةٍ قبل فتح الخطّة** (فُتحت اليوم بعد ساعة تذكيرها)",
      (await runInstallmentRemindersOnce(new Date())).sent.filter((s) => s.planId === planZ), []);
    //  الاكتمال: قسمٌ صار بلا دين (تعديلُ كلفة) ⟵ «مكتملة» بدورة التذكير.
    await q(`UPDATE patient_cases SET cost = 100000 WHERE id = (SELECT case_id FROM installment_plans WHERE id=$1)`, [planZ]);
    const res = await runInstallmentRemindersOnce(new Date());
    const rz = await planRow(planZ);
    same("هـ١٥. **قسمٌ صار بلا دين ⟵ الخطّةُ مكتملة** بتاريخها", [res.completed >= 1, rz.status, rz.completed_at !== null], [true, "completed", true]);

    console.log("\n── و. الحذف والدمج ──");
    await storage.deletePatient(A.p.id);
    same("و١. **حذفُ المريض نهائياً يحذف خطّتَه وتذكيراتها** بلا خطأ",
      [(await q(`SELECT count(*)::int n FROM installment_plans WHERE id=$1`, [A.id]))[0].n,
       (await q(`SELECT count(*)::int n FROM installment_reminders WHERE plan_id=$1`, [A.id]))[0].n,
       (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [A.p.id]))[0].n], [0, 0, 0]);
    const src = await mkPatient("دمج-مصدر", BG, [{ type: "prosthetic", cost: 700_000 }]);
    const srcPlan = Number((await pay(S.recv, src.id, BG, 100_000, plan())).body?.installmentPlanId);
    const dst = await mkPatient("دمج-هدف", BG, [{ type: "prosthetic", cost: 300_000 }]);
    let mergeErr = "";
    try { await storage.mergePatients(src.id, dst.id); } catch (e: any) { mergeErr = e?.message ?? String(e); }
    const moved = await planRow(srcPlan);
    same("و٢. **الدمجُ ينقل الخطّةَ إلى الهدف وقسمِه** — ولا يسقط على مفتاح القسم",
      [mergeErr, moved?.patient_id, moved?.case_id, moved?.status], ["", dst.id, dst.cases.prosthetic, "active"]);
    const v = (await http("GET", `/api/patients/${dst.id}/installments`, S.recv)).body?.plans?.[0];
    same("و٣. وأرقامُها كما كانت على ملفّ الهدف", [v?.id, v?.figures?.paidToward, Number(v?.totalAmount)], [srcPlan, 0, 600_000]);
    const s2 = await mkPatient("دمج-مصدر٢", BG, [{ type: "prosthetic", cost: 700_000 }]);
    const s2Plan = Number((await pay(S.recv, s2.id, BG, 100_000, plan())).body?.installmentPlanId);
    let clashErr = "";
    try { await storage.mergePatients(s2.id, dst.id); } catch (e: any) { clashErr = e?.message ?? String(e); }
    same("و٤. **خطّتان نشطتان على القسم نفسِه ⟵ يُردّ الدمجُ برسالةٍ صريحة، ولا يتغيّر شيء**",
      [/خطّتا أقساطٍ نشطتان/.test(clashErr), (await planRow(s2Plan))?.patient_id, (await planRow(s2Plan))?.case_id,
       (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [s2.id]))[0].n], [true, s2.id, s2.cases.prosthetic, 1]);
  } finally {
    await cleanup();
    httpServer.close();
  }
  console.log(failures === 0 ? "\n✅ كلُّ التأكيدات نجحت" : `\n❌ ${failures} تأكيداً سقط`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
