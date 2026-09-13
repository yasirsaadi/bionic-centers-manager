// **الحالةُ ذاتُ التاريخ تُغلَق، ومالُها يُردّ بقيدٍ معاكس** — حيّاً على
// Postgres وعلى النقاط الحقيقية. قاعدة محلّية: `npm run test:case-closure`.
//
// ══ الثوابتُ التي يحرسها ═══════════════════════════════════════════════════
//   أ.  الهدمُ للسقالة وحدها — وحالةٌ لها تاريخ تُعرَض للإغلاق لا للحذف.
//   ب.  **ردٌّ كامل** ⟶ صافي المقبوض صفر، والحالةُ مغلقة.
//   ج.  **ردٌّ جزئيّ** ⟶ الصافي ينقص بالمقدار، والمحتفَظُ به مُعلَّل.
//   د.  **صفرُ ردّ** ⟶ لا حركةَ مالية، وسببُ الاحتفاظ إلزاميّ.
//   هـ. **ردٌّ يفوق المقبوض يُرفَض** — بصفر كتابة، والرسالةُ تسمّي الرقمين.
//   و.  **الوارد والإيراد ينقصان بالمقدار** — لا بمقدارٍ آخر ولا بصفر.
//   ز.  **ولا صفَّ تاريخيٍّ يُمَسّ**: بصمةُ المعاينات والتصنيع والتسليم
//       والصيانة والدفعات الأصلية مطابقةٌ قبل الإغلاق وبعده بايتاً.
//   ح.  **والحالةُ تختفي من طوابير العمل** — لا من ملفّ المريض.
//   ط.  الرسائلُ لا تَعِد بإعادةِ محاولةٍ لا تعمل.
//   ي.  التزامنُ، والإغلاقُ مرّتين، والصلاحية.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import {
  computeClosureMoney, parseClosureRequest, CLOSURE_MESSAGES,
} from "@shared/case_closure";
import { previewCaseRemovalTx } from "./patient_cases/closure";
import { seedChartOfAccounts } from "./migrations/seed_chart_of_accounts";

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

const PORT = 6977;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-اغلاق-حالة";
const ADMIN = 99770, MGR = 99771, RECV = 99772, DOC = 99773, EXPERT = 99774;
const USERS = [ADMIN, MGR, RECV, DOC, EXPERT];

type Svc = "prosthetic" | "medical_support";
const perms = {
  canViewPatients: true, canAddPatients: true, canEditPatients: true,
  canDeletePatients: true, canViewPayments: true,
};
const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: perms,
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد", permissions: perms,
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: perms,
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد", permissions: { ...perms, canWriteMedicalExam: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let phoneSeq = 0;
const nextPhone = () => `0771${String(3_000_000 + (phoneSeq += 1))}`;

async function mkPatient(label: string, kind: Svc) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,$6,$2,'40','172','78','بتر',$3,$4,1,$5,$7,false,0,'new')
     RETURNING id`,
    [`${MARK} ${label}`, MARK,
      kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
      kind === "medical_support" ? "مسند ركبة" : null,
      kind === "prosthetic", nextPhone(), kind === "medical_support"]);
  return r[0].id;
}
const mkCase = async (patientId: number, caseType: string, cost = 0) =>
  (await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,$3,'manual','active') RETURNING id`,
    [patientId, caseType, cost]))[0].id;

const mkExam = async (patientId: number, caseId: number, svc: Svc) =>
  (await q<{ id: number }>(
    `INSERT INTO medical_exams
       (patient_id, case_id, branch_id, case_type, doctor_id, doctor_name,
        chief_complaint, clinical_findings, diagnosis, plan, notes, prescription, signed_at)
     VALUES ($1,$2,1,$3,${DOC},'د. سعد','شكوى','فحص','تشخيص','خطة','ملاحظة','{}'::jsonb,NOW())
     RETURNING id`, [patientId, caseId, svc]))[0].id;

const mkOrder = async (patientId: number, svc: Svc, purpose = "initial_build") =>
  (await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage)
     VALUES ($1,1,${EXPERT},$2,$3,'active','new_assignment') RETURNING id`,
    [patientId, svc, purpose]))[0].id;

/**
 * حلقةٌ **منتظرةٌ معاينة** على مسار المعاينة — وهي ما يضع المريضَ فعلاً في
 * خريطة `/api/medical/pending` وقائمة عمل الطبيب بعد المرحلة الأولى (٤.p):
 * الطابورُ صار مقوداً بالحلقة لا بمجرّد وجود حالةٍ بلا معاينة.
 */
const mkAwaitingEpisode = async (patientId: number, caseId: number) =>
  (await q<{ id: number }>(
    `INSERT INTO patient_device_episodes
       (patient_id, case_id, branch_id, sequence_number, status,
        requested_item, service_path, agreed_cost)
     VALUES ($1,$2,1,1,'awaiting_exam','full_device','exam',0) RETURNING id`,
    [patientId, caseId]))[0].id;

const TAG: Record<Svc, string> = { prosthetic: "أطراف صناعية", medical_support: "مساند طبية" };
const mkPayment = async (patientId: number, caseId: number, svc: Svc, amount: number) =>
  (await q<{ id: number }>(
    `INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type, case_id, date)
     VALUES ($1,1,$2,'دفعة اختبار',$3,$4,NOW()) RETURNING id`,
    [patientId, amount, TAG[svc], caseId]))[0].id;

// ── قراءةُ الحال ─────────────────────────────────────────────────────────
const caseStatus = async (caseId: number) =>
  String((await q(`SELECT status FROM patient_cases WHERE id=$1`, [caseId]))[0]?.status ?? "");
const netPaidOf = async (caseId: number) =>
  Number((await q(`SELECT COALESCE(SUM(amount),0)::int n FROM payments WHERE case_id=$1`, [caseId]))[0].n);
const paymentRows = (caseId: number) =>
  q(`SELECT id, amount, notes, payment_treatment_type FROM payments WHERE case_id=$1 ORDER BY id`, [caseId]);

/** بصمةُ كلّ ما يجب أن يبقى بايتاً بايت. */
async function historyFingerprint(patientId: number, caseId: number) {
  return {
    exams: await q(`SELECT id, diagnosis, signed_at FROM medical_exams WHERE case_id=$1 ORDER BY id`, [caseId]),
    orders: await q(`SELECT id, status, current_stage, purpose FROM prosthetic_work_orders
                      WHERE patient_id=$1 ORDER BY id`, [patientId]),
    episodes: await q(`SELECT id, status, agreed_cost, delivered_at FROM patient_device_episodes
                        WHERE case_id=$1 ORDER BY id`, [caseId]),
    positivePayments: await q(`SELECT id, amount, notes FROM payments
                                WHERE case_id=$1 AND amount > 0 ORDER BY id`, [caseId]),
    costEntries: await q(`SELECT id, amount, source FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]),
    caseCost: await q(`SELECT cost FROM patient_cases WHERE id=$1`, [caseId]),
    totalCost: await q(`SELECT total_cost FROM patients WHERE id=$1`, [patientId]),
  };
}

/** الوارد (cash) والإيراد المحصَّل — من نقطة المحاسبة الحقيقية. */
async function accountingCash(): Promise<number> {
  const r = await http("GET", "/api/accounting/summary", S.admin);
  return Number(r.body?.totalPaid ?? 0);
}

const previewOf = (p: number, svc: string, session: any = S.admin) =>
  http("GET", `/api/patients/${p}/case-type/${svc}/removal-preview`, session);
const closeOf = (p: number, svc: string, body: any, session: any = S.admin) =>
  http("POST", `/api/patients/${p}/case-type/${svc}/close`, session, body);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const s of [
    `DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries
       WHERE source_type='payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids})))`,
    `DELETE FROM journal_entries WHERE source_type='payment' AND source_id IN
       (SELECT id FROM payments WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN
       (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
  ]) await q(s);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name] of [
    [ADMIN, "admin", "null", "المسؤول"],
    [MGR, "branch_manager", "null", "مدير بغداد"],
    [RECV, "reception", "null", "ريام"],
    [DOC, "doctor", '["prosthetic","medical_support"]', "د. سعد"],
    [EXPERT, "prosthetics_expert", "null", "الخبير"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties,can_manage_accounting)
             VALUES ($1,$2,'x',$4,$3,1,'[1,2]'::jsonb,true,$5::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_id=1, branch_ids='[1,2]'::jsonb,
               medical_specialties=EXCLUDED.medical_specialties, can_manage_accounting=true`,
      [id, `cc_u${id}`, role, name, spec]);
  }
  //  **صندوقُ الفرع كما يُنشئه الخادمُ الحقيقيّ** — `seedChartOfAccounts`
  //  تُنادى عند كلّ إقلاع وتشتقّ صندوقاً لكلّ فرع. الفروعُ هنا تُدرَج بعد
  //  الترحيلات، فتُنادى الآن كي يعمل قيدُ الردّ بمساره الإنتاجيّ لا بمسار
  //  التخطّي. (والتخطّي نفسُه مُختبَرٌ صراحةً في القسم «م».)
  await seedChartOfAccounts();
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══ أ. الحسابُ الخالص — بلا قاعدة بيانات ═══════════════════════════════
    console.log("\n── أ. حسابُ الاسترجاع (خالص) ──");
    same("أ١. ردٌّ كامل", computeClosureMoney(300_000, 300_000).kind, "full_refund");
    same("أ٢. ردٌّ جزئيّ", computeClosureMoney(300_000, 120_000).kind, "partial_refund");
    same("أ٣. صفرُ ردّ", computeClosureMoney(300_000, 0).kind, "no_refund");
    same("أ٤. بلا مالٍ أصلاً", computeClosureMoney(0, 0).kind, "no_money");
    same("أ٥. والمحتفَظُ به = الصافي − المردود",
      computeClosureMoney(300_000, 120_000).retainedAmount, 180_000);
    //  **والصافي هو الحدّ، لا مجموعُ الموجب**: استردادٌ سابق يخفضه.
    same("أ٦. صافٍ منخفضٌ باستردادٍ سابق يحدّ الردَّ الثاني",
      parseClosureRequest(50_000, { reason: "س", refundAmount: 80_000 }).ok, false);
    {
      const r = parseClosureRequest(300_000, { reason: "س", refundAmount: 400_000 });
      check(!r.ok && /400,000/.test((r as any).message) && /300,000/.test((r as any).message),
        "أ٧. **ورسالةُ التجاوز تسمّي الرقمين**", JSON.stringify(r));
    }
    same("أ٨. ردٌّ بلا سبب يُرفَض",
      (parseClosureRequest(300_000, { reason: "س", refundAmount: 100_000 }) as any).message,
      CLOSURE_MESSAGES.refundReasonRequired);
    same("أ٩. واحتفاظٌ بلا سبب يُرفَض",
      (parseClosureRequest(300_000, { reason: "س", refundAmount: 300_000 - 1, refundReason: "ر" }) as any).message,
      CLOSURE_MESSAGES.retainedReasonRequired);
    same("أ١٠. وبلا مالٍ لا يُسأل عن احتفاظ",
      parseClosureRequest(0, { reason: "س" }).ok, true);
    same("أ١١. وسببُ الإغلاق إلزاميّ دائماً",
      (parseClosureRequest(0, { reason: "   " }) as any).message, CLOSURE_MESSAGES.reasonRequired);
    same("أ١٢. ومبلغٌ مشوَّه يُرفَض ولا يُقرأ صفراً",
      (parseClosureRequest(100, { reason: "س", refundAmount: "كثير" }) as any).message,
      CLOSURE_MESSAGES.refundNotInteger);
    same("أ١٣. وسالبٌ يُرفَض",
      (parseClosureRequest(100, { reason: "س", refundAmount: -5 }) as any).message,
      CLOSURE_MESSAGES.refundNegative);
    same("أ١٤. وردٌّ على حالةٍ بلا مال يُرفَض",
      (parseClosureRequest(0, { reason: "س", refundAmount: 10, refundReason: "ر" }) as any).message,
      CLOSURE_MESSAGES.refundWithoutMoney);

    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      const L = svc === "prosthetic" ? "أطراف" : "مساند";
      console.log(`\n═══════════════ ${L} ═══════════════`);

      // ══ ب. السقالةُ تُعرَض للهدم، والتاريخُ للإغلاق ═══════════════════════
      console.log(`\n── ب. البابُ يُختار في الخادم (${L}) ──`);
      {
        const p = await mkPatient(`ب-سقالة-${svc}`, svc);
        await mkCase(p, svc);
        const pv = await previewOf(p, svc);
        same("ب١. حالةٌ بلا سجلّ ⟶ هدم", pv.body?.mode, "dispose");
        const closed = await closeOf(p, svc, { reason: "محاولة" });
        same("ب٢. **ولا تُغلَق سقالةٌ** — تُسحَب سحباً", closed.status, 409);
        same("ب٣. والحالةُ ما زالت نشطة",
          (await q(`SELECT status FROM patient_cases WHERE patient_id=$1`, [p]))[0]?.status, "active");
      }
      {
        const p = await mkPatient(`ب-تاريخ-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        const pv = await previewOf(p, svc);
        same("ب٤. حالةٌ بمعاينة ⟶ إغلاق", pv.body?.mode, "close");
        same("ب٥. والحاجزُ يُسمّى", pv.body?.blocker?.code, "signed_exam");
        const del = await http("DELETE", `/api/patients/${p}/case-type/${svc}`, S.admin, { reason: "x" });
        same("ب٦. والحذفُ ما زال مرفوضاً", del.status, 409);
      }

      // ══ ج. ردٌّ كامل ═════════════════════════════════════════════════════
      console.log(`\n── ج. ردٌّ كامل (${L}) ──`);
      {
        const p = await mkPatient(`ج-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        await mkOrder(p, svc);
        await mkPayment(p, c, svc, 200_000);
        await mkPayment(p, c, svc, 100_000);
        const before = await historyFingerprint(p, c);
        const cashBefore = await accountingCash();

        same("ج١. المعاينةُ تقرأ الصافي من القاعدة",
          (await previewOf(p, svc)).body?.money?.netPaid, 300_000);
        const r = await closeOf(p, svc, {
          reason: "أعاد الجهاز", refundAmount: 300_000, refundReason: "ردٌّ كامل بالاتفاق",
        });
        same("ج٢. **الإغلاق بردٍّ كامل ينجح**", r.status, 200);
        same("ج٣. ونوعُه مُشتقٌّ في الخادم", r.body?.money?.kind, "full_refund");
        same("ج٤. **وصافي المقبوض صار صفراً**", await netPaidOf(c), 0);
        same("ج٥. والحالةُ مغلقة", await caseStatus(c), "closed");

        const pays = await paymentRows(c);
        same("ج٦. **والدفعتان الأصليتان كما هما**",
          pays.filter((x: any) => x.amount > 0).map((x: any) => x.amount), [200_000, 100_000]);
        check(pays.some((x: any) => x.amount === -300_000),
          "ج٧. **والاسترجاعُ صفٌّ مستقلٌّ بالسالب**", JSON.stringify(pays));
        check(pays.some((x: any) => x.amount < 0 && /استرجاع/.test(String(x.notes))
          && String(x.payment_treatment_type) === TAG[svc]),
          "ج٨. موسومٌ بقسمه فيُخصَم منه", JSON.stringify(pays));

        same("ج٩. **والوارد نقص بالمقدار بالضبط**", await accountingCash(), cashBefore - 300_000);

        //  قيدُ اليومية المرآة — مدينٌ للإيراد، دائنٌ للصندوق.
        const [refundRow] = pays.filter((x: any) => x.amount < 0);
        const jl = await q(`SELECT l.debit::int d, l.credit::int cr, a.account_code AS code
                              FROM journal_entries e JOIN journal_lines l ON l.entry_id = e.id
                              JOIN chart_of_accounts a ON a.id = l.account_id
                             WHERE e.source_type='payment' AND e.source_id=$1 ORDER BY l.line_order`,
          [refundRow.id]);
        check(jl.length === 2, "ج١٠. **وله قيدُ يوميةٍ بسطرين**", JSON.stringify(jl));
        check(jl.some((x: any) => Number(x.d) === 300_000 && String(x.code).startsWith("4")),
          "ج١١. مدينٌ لحساب الإيراد — فينقص الإيراد", JSON.stringify(jl));
        check(jl.some((x: any) => Number(x.cr) === 300_000 && String(x.code).startsWith("1")),
          "ج١٢. ودائنٌ للصندوق — فيخرج النقد", JSON.stringify(jl));

        const after = await historyFingerprint(p, c);
        same("ج١٣. **ولا معاينةٌ تغيّرت**", after.exams, before.exams);
        same("ج١٤. ولا أمرُ تصنيع", after.orders, before.orders);
        same("ج١٥. ولا دفعةٌ أصلية", after.positivePayments, before.positivePayments);
        same("ج١٦. ولا قيدُ كلفة", after.costEntries, before.costEntries);
        same("ج١٧. ولا كلفةُ الحالة", after.caseCost, before.caseCost);
        same("ج١٨. ولا إجماليُّ المريض", after.totalCost, before.totalCost);
      }

      // ══ د. ردٌّ جزئيّ ════════════════════════════════════════════════════
      console.log(`\n── د. ردٌّ جزئيّ (${L}) ──`);
      {
        const p = await mkPatient(`د-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        await mkPayment(p, c, svc, 300_000);
        const cashBefore = await accountingCash();

        const noReason = await closeOf(p, svc, {
          reason: "إغلاق", refundAmount: 120_000, refundReason: "جزئيّ",
        });
        same("د١. **بلا سبب احتفاظٍ يُرفَض**", noReason.status, 400);
        same("د٢. وبصفر كتابة — الحالةُ نشطة", await caseStatus(c), "active");
        same("د٣. ولا حركةَ مالية", await netPaidOf(c), 300_000);

        const r = await closeOf(p, svc, {
          reason: "إغلاق", refundAmount: 120_000,
          refundReason: "ردٌّ جزئيّ بالاتفاق", retainedReason: "أجور قياسٍ نُفِّذت",
        });
        same("د٤. **ومع السببين ينجح**", r.status, 200);
        same("د٥. بنوعٍ جزئيّ", r.body?.money?.kind, "partial_refund");
        same("د٦. **والصافي نقص بالمقدار وحده**", await netPaidOf(c), 180_000);
        same("د٧. والمحتفَظُ به مُعلَن", r.body?.money?.retainedAmount, 180_000);
        same("د٨. والوارد نقص ١٢٠ ألفاً", await accountingCash(), cashBefore - 120_000);
        same("د٩. والحالةُ مغلقة", await caseStatus(c), "closed");

        const [audit] = await q(
          `SELECT notes FROM audit_log WHERE entity_type='patient_case' AND entity_id=$1
            ORDER BY id DESC LIMIT 1`, [c]);
        const note = String(audit?.notes ?? "");
        check(/120,000/.test(note) && /180,000/.test(note) && /أجور قياس/.test(note),
          "د١٠. **وسطرُ التدقيق يقول الرقمين والسببين**", note);
      }

      // ══ هـ. صفرُ ردّ ═════════════════════════════════════════════════════
      console.log(`\n── هـ. صفرُ ردّ (${L}) ──`);
      {
        const p = await mkPatient(`هـ-${svc}`, svc);
        const c = await mkCase(p, svc, 400_000);
        await mkExam(p, c, svc);
        await mkPayment(p, c, svc, 250_000);
        const cashBefore = await accountingCash();
        const paysBefore = await paymentRows(c);

        const noReason = await closeOf(p, svc, { reason: "إغلاق", refundAmount: 0 });
        same("هـ١. **صفرُ ردٍّ بلا سبب احتفاظٍ يُرفَض**", noReason.status, 400);

        const r = await closeOf(p, svc, {
          reason: "انتهى العلاج", refundAmount: 0, retainedReason: "الخدمة نُفِّذت كاملة",
        });
        same("هـ٢. ومع السبب ينجح", r.status, 200);
        same("هـ٣. بنوع «لم يُردّ»", r.body?.money?.kind, "no_refund");
        same("هـ٤. **ولا حركةَ ماليةٍ تُنشأ إطلاقاً**", await paymentRows(c), paysBefore);
        same("هـ٥. والوارد لم يتغيّر", await accountingCash(), cashBefore);
        same("هـ٦. والحالةُ مغلقة", await caseStatus(c), "closed");
      }

      // ══ و. ردٌّ يفوق المقبوض ══════════════════════════════════════════════
      console.log(`\n── و. تجاوزُ المقبوض (${L}) ──`);
      {
        const p = await mkPatient(`و-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        await mkPayment(p, c, svc, 100_000);
        const paysBefore = await paymentRows(c);
        const cashBefore = await accountingCash();

        const r = await closeOf(p, svc, {
          reason: "إغلاق", refundAmount: 150_000, refundReason: "محاولة تجاوز",
        });
        same("و١. **ردٌّ يفوق الصافي يُرفَض**", r.status, 400);
        check(/100,000/.test(String(r.body?.message)),
          "و٢. والرسالةُ تسمّي الصافي الحقيقي", String(r.body?.message));
        same("و٣. **وبصفر كتابة** — لا حركة", await paymentRows(c), paysBefore);
        same("و٤. ولا وارد تغيّر", await accountingCash(), cashBefore);
        same("و٥. والحالةُ نشطة", await caseStatus(c), "active");
      }

      // ══ ز. لا ردَّ مرّتين — الصافي يحدّ الإغلاقَ التالي ═══════════════════
      console.log(`\n── ز. لا يُردّ المبلغُ مرّتين (${L}) ──`);
      {
        const p = await mkPatient(`ز-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        await mkPayment(p, c, svc, 200_000);
        await closeOf(p, svc, { reason: "إغلاق", refundAmount: 200_000, refundReason: "كامل" });
        same("ز١. الصافي صفرٌ بعد الردّ", await netPaidOf(c), 0);
        const pv = await previewOf(p, svc);
        same("ز٢. **والمعاينةُ تقول الصافي صفراً**", pv.body?.money?.netPaid, 0);
        same("ز٣. وتقول كم رُدّ سابقاً", pv.body?.money?.refundedBefore, 200_000);
        const again = await closeOf(p, svc, {
          reason: "ثانية", refundAmount: 200_000, refundReason: "تكرار",
        });
        same("ز٤. **وإغلاقٌ ثانٍ يُردّ** — مغلقةٌ سلفاً", again.status, 409);
        same("ز٥. ولا حركةَ ثانية", await netPaidOf(c), 0);
      }

      // ══ ح. تختفي من طوابير العمل لا من الملفّ ════════════════════════════
      console.log(`\n── ح. الخروج من العمل (${L}) ──`);
      {
        const p = await mkPatient(`ح-${svc}`, svc);
        const c = await mkCase(p, svc, 100_000);
        //  حلقةٌ منتظرةٌ ⟶ المريضُ في طابور الطبيب فعلاً · ودفعةٌ ⟶ **يُغلَق
        //  ولا يُهدَم**. فالاختفاءُ بعدها اختفاءُ حالةٍ حيّة لا صفٍّ لم يكن.
        await mkAwaitingEpisode(p, c);
        await mkPayment(p, c, svc, 50_000);
        await mkOrder(p, svc);

        const pendBefore = await http("GET", "/api/medical/pending", S.doc);
        const inPendingBefore = JSON.stringify(pendBefore.body ?? {}).includes(`"${p}"`)
          || JSON.stringify(pendBefore.body ?? {}).includes(`:${p},`);
        check(inPendingBefore, "ح١. الإعدادُ: المريضُ في خريطة الانتظار قبل الإغلاق",
          JSON.stringify(pendBefore.body).slice(0, 160));

        const r = await closeOf(p, svc, {
          reason: "انتهى", refundAmount: 0, retainedReason: "الخدمة نُفِّذت",
        });
        same("ح٢. الإغلاق ينجح", r.status, 200);

        const pendAfter = await http("GET", "/api/medical/pending", S.doc);
        const blob = JSON.stringify(pendAfter.body ?? {});
        check(!blob.includes(`"${p}"`) && !blob.includes(`:${p},`),
          "ح٣. **وخرج من خريطة انتظار المعاينة**", blob.slice(0, 200));

        const work = await http("GET", "/api/medical/worklist", S.doc);
        check(!JSON.stringify(work.body ?? {}).includes(`"patientId":${p}`),
          "ح٤. وخرج من قائمة عمل الطبيب");

        //  **ولا يختفي من ملفّ المريض** — التاريخُ يُقرأ.
        const cases = await http("GET", `/api/patients/${p}/cases`, S.admin);
        const blobCases = JSON.stringify(cases.body ?? []);
        check(blobCases.includes(`"${svc}"`),
          "ح٥. **ويبقى في ملفّ المريض بحالته «مغلقة»**", blobCases.slice(0, 200));
        same("ح٦. وأمرُ التصنيع باقٍ",
          (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [p]))[0].n, 1);
      }

      // ══ ط. الصلاحية ══════════════════════════════════════════════════════
      console.log(`\n── ط. الصلاحية (${L}) ──`);
      {
        const p = await mkPatient(`ط-${svc}`, svc);
        const c = await mkCase(p, svc, 100_000);
        await mkExam(p, c, svc);
        for (const [who, s] of [["مديرُ الفرع", S.mgr], ["الاستقبال", S.recv], ["الطبيب", S.doc]] as any[]) {
          same(`ط. ${who} لا يُغلق`, (await closeOf(p, svc, { reason: "x" }, s)).status, 403);
          same(`   ولا يقرأ المعاينة`, (await previewOf(p, svc, s)).status, 403);
        }
        same("ط١. والحالةُ نشطة بعد كلّ محاولة", await caseStatus(c), "active");
        same("ط٢. والمسؤولُ العام يمضي",
          (await closeOf(p, svc, { reason: "إغلاق", refundAmount: 0 })).status, 200);
      }

      // ══ ي. التزامن ═══════════════════════════════════════════════════════
      console.log(`\n── ي. التزامن (${L}) ──`);
      {
        const p = await mkPatient(`ي-${svc}`, svc);
        const c = await mkCase(p, svc, 500_000);
        await mkExam(p, c, svc);
        await mkPayment(p, c, svc, 200_000);
        const body = {
          reason: "إغلاق متزامن", refundAmount: 200_000, refundReason: "كامل",
        };
        const [a, b] = await Promise.all([closeOf(p, svc, body), closeOf(p, svc, body)]);
        same("ي١. **ضغطتان ⟶ نجاحٌ واحد ورفضٌ واحد**",
          [a.status, b.status].sort(), [200, 409]);
        same("ي٢. **وحركةُ استرجاعٍ واحدة لا اثنتان**",
          (await q(`SELECT count(*)::int n FROM payments WHERE case_id=$1 AND amount < 0`, [c]))[0].n, 1);
        same("ي٣. والصافي صفرٌ لا سالب", await netPaidOf(c), 0);
      }
    }

    // ══ ك. حارسُ العقد — الرسائل والمعمار ═════════════════════════════════
    console.log("\n── ك. حارسُ العقد ──");
    {
      const src = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
      const dis = src("server/patient_cases/disposal.ts");
      //  **ولا وعدَ بإعادةِ محاولةٍ لا تعمل**: معاينةٌ موقّعة أو جهازٌ سُلّم
      //  لا يزولان بإعادة الضغط، فالرسالةُ تدلّ على الإغلاق لا على التكرار.
      check(!/أعِد المحاولة/.test(dis),
        "ك١. **لا رسالةَ تَعِد بإعادة محاولةٍ لا تنجح**");
      const closureMentions = (dis.match(/أغلِق الحالة بدل حذفها/g) ?? []).length;
      check(closureMentions >= 5,
        "ك٢. والحواجزُ التاريخية تدلّ على الإغلاق", String(closureMentions));

      const clo = src("server/patient_cases/closure.ts");
      check(!/DELETE\s+FROM/i.test(clo),
        "ك٣. **ولا جملةَ حذفٍ واحدة في مسار الإغلاق**");
      check(!/UPDATE\s+payments/i.test(clo),
        "ك٤. **ولا تعديلَ على دفعةٍ قائمة** — الأصلُ لا يُمَسّ");
      check(/status = 'closed'/.test(clo) && /pg_advisory_xact_lock\(919/.test(clo),
        "ك٥. والإغلاقُ تحت القفل القائم نفسِه");
      //  **كتابةً لا ذِكراً**: الملفُّ يشرح في تعليقاته ما لا يلمسه، فالحارسُ
      //  يبحث عن جملةِ كتابةٍ فعلية لا عن ورود الاسم (درسُ `caseHasEpisodes`).
      check(!/INSERT\s+INTO\s+cost_entries/i.test(clo)
        && !/UPDATE\s+patients\b/i.test(clo)
        && !/UPDATE\s+patient_cases\s+SET[^;]*\bcost\b/i.test(clo),
        "ك٦. ولا يلمس الكلفةَ ولا دفترَ القيود");

      const ui = src("client/src/components/patient/PatientCasesTabs.tsx");
      check(/removal-preview/.test(ui) && /case-type\/\$\{caseRow\.caseType\}\/close/.test(ui),
        "ك٧. **والشاشةُ تقرأ البابَ من الخادم** ثمّ تنادي بابَه");
      //  الصافي **يُقرأ** من ردّ الخادم ولا يُرسَل إليه: عرضُ «المحتفَظ به»
      //  حسابٌ للعين وحدها، والخادمُ يعيد حسابَه تحت القفل ويرفض ما يخالفه.
      check(/money\?*\.?\.netPaid|money\.netPaid/.test(ui),
        "ك٨. **والصافي يُقرأ من الخادم** لا يُشتقّ من الدفعات في المتصفّح");
      check(!/netPaid\s*,/.test(ui) && !/netPaid\s*:/.test(ui),
        "ك٩. **ولا يُرسَل الصافي في جسم الطلب** — لا يُقبَل من العميل سلطةً");
    }

    // ══ ل. العلاجُ الطبيعي يُغلَق بالقاعدة نفسِها ═════════════════════════
    console.log("\n── ل. العلاج الطبيعي ──");
    {
      const p = await mkPatient("ل-فيزيو", "prosthetic");
      const c = await mkCase(p, "physiotherapy", 200_000);
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [p]);
      await q(`INSERT INTO payments (patient_id, branch_id, amount, notes, payment_treatment_type, case_id, date)
               VALUES ($1,1,150000,'دفعة','روبوت',$2,NOW())`, [p, c]);
      const pv = await previewOf(p, "physiotherapy");
      same("ل١. حالةُ فيزيو بمالٍ ⟶ إغلاق", pv.body?.mode, "close");
      same("ل٢. وصافيها مقروء", pv.body?.money?.netPaid, 150_000);
      const r = await closeOf(p, "physiotherapy", {
        reason: "انتهى العلاج", refundAmount: 50_000,
        refundReason: "جلساتٌ لم تُنفَّذ", retainedReason: "جلساتٌ نُفِّذت",
      });
      same("ل٣. والإغلاق ينجح", r.status, 200);
      same("ل٤. والصافي نقص", await netPaidOf(c), 100_000);
      same("ل٥. والحالةُ مغلقة", await caseStatus(c), "closed");
      same("ل٦. **وقُيِّد في اليومية** — الفرعُ مُعَدٌّ", r.body?.journalPosted, true);
    }

    // ══ م. صندوقُ فرعٍ غيرُ مُعَدٍّ لا يحبس مالَ المريض ═══════════════════
    //  `createJournalForPayment` — بابُ **كلّ** دفعةِ مريض — يتخطّى القيدَ
    //  بتحذيرٍ حين لا يكون للفرع صندوقٌ في دليل الحسابات، والدفعةُ تُحفَظ.
    //  فلو رفض الردُّ لنفس السبب لصار المالُ يدخل في ذلك الفرع ولا يخرج.
    //  **فيقع الردُّ ويُقال إنه لم يُقيَّد** — لا يُرفَض ولا يُبتلَع صامتاً.
    console.log("\n── م. صندوقُ الفرع غيرُ مُعَدّ ──");
    {
      const p = await mkPatient("م-بلا-صندوق", "prosthetic");
      const c = await mkCase(p, "prosthetic", 400_000);
      await mkExam(p, c, "prosthetic");
      await mkPayment(p, c, "prosthetic", 250_000);

      //  نُخفي صندوقَ الفرع لحظةَ الاختبار ثمّ نعيده — لا نحذفه.
      const cash = await q<{ id: number; branch_id: number }>(
        `SELECT id, branch_id FROM chart_of_accounts
          WHERE branch_id=1 AND account_type='asset' AND account_code LIKE '1111%' LIMIT 1`);
      check(cash.length === 1, "م٠. الإعدادُ: للفرع صندوقٌ نُخفيه مؤقّتاً");
      await q(`UPDATE chart_of_accounts SET branch_id=NULL WHERE id=$1`, [cash[0].id]);

      let r2: any;
      try {
        r2 = await closeOf(p, "prosthetic", {
          reason: "أعاد الجهاز", refundAmount: 250_000, refundReason: "ردٌّ كامل",
        });
      } finally {
        await q(`UPDATE chart_of_accounts SET branch_id=1 WHERE id=$1`, [cash[0].id]);
      }

      same("م١. **الردُّ يقع رغم نقص الإعداد**", r2.status, 200);
      same("م٢. **ويُقال إنه لم يُقيَّد** — لا يُبتلَع", r2.body?.journalPosted, false);
      same("م٣. وصافي المقبوض صار صفراً فعلاً", await netPaidOf(c), 0);
      const negRows = (await paymentRows(c)).filter((x: any) => x.amount < 0);
      same("م٤. وحركةُ الاسترجاع مكتوبة", negRows.length, 1);
      same("م٥. ولا قيدَ يوميةٍ لها",
        (await q(`SELECT count(*)::int n FROM journal_entries
                   WHERE source_type='payment' AND source_id=$1`, [negRows[0].id]))[0].n, 0);
      const note = String((await q(
        `SELECT notes FROM audit_log WHERE entity_type='patient_case' AND entity_id=$1
          ORDER BY id DESC LIMIT 1`, [c]))[0]?.notes ?? "");
      check(/لم يُقيَّد في اليومية/.test(note),
        "م٦. **وسطرُ التدقيق يقول النقص** فلا يُكتشَف بعد أشهر", note);
      same("م٧. والحالةُ مغلقة", await caseStatus(c), "closed");
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص إغلاق الحالة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
