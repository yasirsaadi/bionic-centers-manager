// **شرائطُ الدفعة الكبيرة** (طلبُ المالك ٢٠٢٦-١١-٠٦، §4.ga) — العقدُ المشترك، ثمّ الأبوابُ الحقيقية على Postgres:
// كلُّ ردٍّ ناجح كتب دفعةً (أو دفعاتٍ في حفظٍ واحد) مجموعُها ٣٥٠ ألفاً فما فوق يحمل `X-Big-Payment` بالمبلغ واسم الموظّف،
// وما دونه — أو فشل، أو تراجعت معاملتُه — لا يحملها. `npm run test:big-payment`.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { seedChartOfAccounts } from "./migrations/seed_chart_of_accounts";
import { bigPaymentNoticeMiddleware, notePaymentAmount } from "./payments/big_payment_notice";
import { baghdadTodayYmd } from "@shared/visit_date";
import { addMonthsYmd } from "@shared/installments";
import {
  BIG_PAYMENT_HEADER, BIG_PAYMENT_THRESHOLD, bigPaymentIntensity, decodeBigPayment, encodeBigPayment, isBigPayment,
} from "@shared/big_payment";

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

const PORT = 7031;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-شرائط-الدفعة";
const BG = 9631;
const ADMIN = 9641, RECV = 9642;
const USERS = [ADMIN, RECV];
const LIMB = "أطراف صناعية", SUPPORT = "مساند طبية";
const PAY_PERMS = { canViewPatients: true, canViewPayments: true, canAddPayments: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: BG, accessibleBranches: [BG], displayName: "المسؤول", permissions: PAY_PERMS },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: BG, accessibleBranches: [BG], displayName: "زينب", permissions: PAY_PERMS },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  return (await pool.query(text, params)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any, base = BASE) {
  const res = await fetch(base + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json, big: decodeBigPayment(res.headers.get(BIG_PAYMENT_HEADER)), raw: res.headers.get(BIG_PAYMENT_HEADER) };
}
async function mkPatient(label: string, cases: { type: string; cost: number }[]) {
  const total = cases.reduce((s, c) => s + c.cost, 0);
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
     VALUES ($1,'07701234500',$2,'40','172','78','بتر',$3,$4,'new') RETURNING id`, [`${MARK} ${label}`, MARK, BG, total]);
  for (const c of cases) {
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status) VALUES ($1,$2,$3,$4,'manual','active')`,
      [p.id, BG, c.type, c.cost]);
  }
  return Number(p.id);
}
async function cleanup() {
  for (const r of await q<{ id: number }>(`SELECT id FROM patients WHERE referral_source = $1`, [MARK])) {
    await storage.deletePatient(Number(r.id)).catch((e) => console.error("cleanup", r.id, e?.message));
  }
  await q(`DELETE FROM audit_log WHERE entity_type = 'installment_plan' AND user_id = ANY($1::int[])`, [USERS]);
}

async function main() {
  // ══ أ. العقدُ المشترك ══
  console.log("\n── أ. العقد ──");
  same("أ١. **الحدُّ ٣٥٠ ألفاً شاملاً** — ٣٤٩٬٩٩٩ لا، و٣٥٠٬٠٠٠ نعم",
    [BIG_PAYMENT_THRESHOLD, isBigPayment(349_999), isBigPayment(350_000), isBigPayment(NaN)], [350_000, false, true, false]);
  same("أ٢. **الترميزُ يحفظ الاسمَ العربيّ** والترويسةُ نصٌّ لاتينيّ",
    [decodeBigPayment(encodeBigPayment({ amount: 400_000, name: "زينب" })), /^[\x21-\x7e]+$/.test(encodeBigPayment({ amount: 400_000, name: "زينب" }))],
    [{ amount: 400_000, name: "زينب" }, true]);
  same("أ٣. **والتالفُ أو ما دون الحدّ لا شيء**",
    [decodeBigPayment(null), decodeBigPayment("%E0%A4%A"), decodeBigPayment(encodeBigPayment({ amount: 1000, name: "x" })),
     decodeBigPayment(encodeURIComponent('{"amount":"x"}'))], [null, null, null, null]);
  same("أ٤. وكلّما كبر المبلغ زادت الشرائط", [bigPaymentIntensity(350_000), bigPaymentIntensity(1_000_000), bigPaymentIntensity(2_000_000)], [1, 1.4, 1.8]);
  let threw = false;
  try { notePaymentAmount(500_000); } catch { threw = true; }
  check(!threw, "أ٥. **وخارجَ طلبٍ لا شيء** — كرونٌ يكتب دفعةً لا يرمي");

  // ══ ب. الوسيطُ وحده ══
  console.log("\n── ب. الوسيط ──");
  const mini = express();
  mini.use((r: any, _res, next) => { r.session = { branchSession: { displayName: "هند" } }; next(); });
  mini.use(bigPaymentNoticeMiddleware);
  mini.get("/two", (_r, res) => { notePaymentAmount(200_000); notePaymentAmount(200_000); res.json({ ok: true }); });
  mini.get("/fail", (_r, res) => { notePaymentAmount(500_000); res.status(500).json({ ok: false }); });
  mini.get("/neg", (_r, res) => { notePaymentAmount(400_000); notePaymentAmount(-300_000); notePaymentAmount("x"); res.json({ ok: true }); });
  const miniServer = mini.listen(PORT + 1);
  await new Promise((r) => miniServer.once("listening", r));
  const M = `http://127.0.0.1:${PORT + 1}`;
  try {
    same("ب١. **حفظٌ واحدٌ بسطرين يُجمع** (٢٠٠ + ٢٠٠ ⟵ ٤٠٠ ألف) باسم الموظّف",
      (await http("GET", "/two", {}, undefined, M)).big, { amount: 400_000, name: "هند" });
    same("ب٢. **ردٌّ فاشل لا شرائطَ له** ولو كُتبت دفعة", (await http("GET", "/fail", {}, undefined, M)).raw, null);
    same("ب٣. والسالبُ (استرجاع) وغيرُ الرقم لا يُحسبان", (await http("GET", "/neg", {}, undefined, M)).big, { amount: 400_000, name: "هند" });
  } finally { miniServer.close(); }

  // ══ ج. الأبوابُ الحقيقية ══
  await q(`INSERT INTO branches (id,name) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`, [BG, `${MARK} بغداد`]);
  await seedChartOfAccounts();
  for (const [id, role] of [[ADMIN, "admin"], [RECV, "reception"]] as const) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_view_payments,can_add_payments)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
               can_view_patients=true, can_view_payments=true, can_add_payments=true`,
      [id, `bp_u${id}`, id === ADMIN ? "المسؤول" : "زينب", role, BG, JSON.stringify([BG])]);
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
    console.log("\n── ج. الأبواب الحقيقية ──");
    const pay = (s: any, patientId: number, amount: number, extra: any = {}) =>
      http("POST", "/api/payments", s, { patientId, branchId: BG, amount, paymentTreatmentType: LIMB, ...extra });
    const p1 = await mkPatient("علي", [{ type: "prosthetic", cost: 3_000_000 }]);
    const r1 = await pay(S.recv, p1, 350_000);
    same("ج١. **«إضافة دفعة» بـ٣٥٠ ألفاً ⟵ الشرائطُ باسم الموظّفة**", [r1.status, r1.big], [201, { amount: 350_000, name: "زينب" }]);
    const r2 = await pay(S.recv, p1, 349_999);
    same("ج٢. **وما دونه يُسجَّل بلا شرائط**", [r2.status, r2.raw], [201, null]);
    const r3 = await pay(S.admin, p1, 2_000_000);
    same("ج٣. **وللمسؤول أيضاً** (قرارُ المالك «لي أيضاً»)", [r3.status, r3.big], [201, { amount: 2_000_000, name: "المسؤول" }]);
    //  «خدمة جديدة» بنوعَي علاج: الخادمُ يكتب دفعةً لكلّ بند — والموظّفُ كتب مبلغاً واحداً.
    const p2 = await mkPatient("علاج", [{ type: "physiotherapy", cost: 0 }]);
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id = $1`, [p2]);
    const r4 = await http("POST", `/api/patients/${p2}/new-service`, S.recv, {
      serviceType: "additional_therapy", serviceCost: 440_000, initialPayment: 440_000,
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 4 }, { treatmentType: "أجهزة علاج طبيعي", sessionCount: 4 }] });
    const rows = await q(`SELECT amount FROM payments WHERE patient_id = $1 AND amount > 0 ORDER BY id`, [p2]);
    same("ج٤. **ضغطةٌ واحدة يقسمها الخادمُ على بندين ⟵ مجموعُها** («خدمة جديدة» بنوعَي علاج)",
      [r4.status < 300, rows.length, rows.reduce((t: number, r: any) => t + Number(r.amount), 0), r4.big],
      [true, 2, 440_000, { amount: 440_000, name: "زينب" }]);
    //  خطّةُ أقساطٍ ثانيةٌ على القسم نفسِه تُرَدّ ٤٠٩ — والدفعةُ معها تتراجع: فلا شرائط.
    const plan = { monthlyAmount: 200_000, firstDueDate: addMonthsYmd(baghdadTodayYmd(), 1), reminderTime: "09:30" };
    const p3 = await mkPatient("أقساط", [{ type: "prosthetic", cost: 3_000_000 }]);
    const ok = await pay(S.recv, p3, 400_000, { installmentPlan: plan });
    const before = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id = $1`, [p3]))[0].n;
    const dup = await pay(S.recv, p3, 400_000, { installmentPlan: plan });
    const after = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id = $1`, [p3]))[0].n;
    same("ج٥. **دفعةٌ تراجعت معاملتُها لا شرائطَ لها** — الأولى بشرائطها، والثانيةُ ٤٠٩ بلا دفعةٍ ولا ترويسة",
      [ok.status, Boolean(ok.big), dup.status, dup.raw, after === before], [201, true, 409, null, true]);
    const r6 = await http("GET", `/api/patients/${p1}`, S.recv);
    same("ج٦. وقراءةٌ لا تكتب دفعةً لا تحمل شيئاً", [r6.status, r6.raw], [200, null]);
  } finally {
    await cleanup().catch((e) => console.error("cleanup failed", e));
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
