// **دقّةُ المال عبر الحذف والاستعادة والحذف النهائي** — حيّاً على Postgres
// وعلى النقاط الحقيقية. قاعدة محلّية: `npm run test:patient-trash-money`.
//
// ══ ما يثبته هذا الملفّ ولا يثبته `patient_trash.test.ts` ═══════════════
// ذاك يثبت أن الصفوفَ لا تُمَسّ وأن رقماً واحداً (المبيعات) يخرج بمقداره.
// **وهذا يثبت الدقّةَ عبر كلّ قارئٍ ماليّ فعّالٍ في النظام دفعةً واحدة**،
// بمعرّفاتٍ ومبالغَ مسجَّلةٍ مسبقاً — لا بفحص «نجح الطلب» وحده:
//
//   • `getAccountingSummary` (الوارد/المبيعات — تدفّق الفترة)
//   • `getDailyCashSummary` (وارد اليوم وتوزيعُه بالخدمة)
//   • `/api/dashboard/live-revenue` (لوحة المالك المباشرة)
//   • الفواتير — القائمةُ والإحصاء
//   • خططُ التقسيط النشِطة
//   • دفترُ الأستاذ المزدوج (Accounting V2): ميزانُ المراجعة · قائمةُ
//     الدخل · الميزانيةُ العمومية — **وتوازنُ القيد المزدوج نفسِه**
//
// ══ والمراحلُ الأربع ═════════════════════════════════════════════════════
// فعّال (المالُ ظاهر) ⟶ محذوفٌ ناعماً (المالُ مُقصًى، والصفوفُ كما هي) ⟶
// مُستعاد (المالُ عاد **بمقداره بالضبط**) ⟶ محذوفٌ نهائياً بعد الانقضاء
// (المالُ **يبقى مُقصًى** — ولا يعود صامتاً لأن `patient_id` صار NULL).

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createJournalForPayment, createJournalForInvoice } from "./accounting/auto_journal";

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

const PORT = 6862;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-دقة-المال";
const ADMIN = 9971, MGR = 9972;
const USERS = [ADMIN, MGR];

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canManageAccounting: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد",
    permissions: { canViewPatients: true, canAddPatients: true },
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

const PAYMENT_AMOUNT = 111_000;
const INVOICE_TOTAL = 222_000;
const INSTALLMENT_TOTAL = 333_000;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  **بمستخدمي الاختبار لا بصفّ المريض**: بعد حذفٍ نهائيّ يفقد الربطُ
  //  بالمصدر معناه (المريضُ نفسُه مُحيَ)، فالمطابقةُ الموثوقة الباقية هي
  //  `created_by` — نفسُ نمط `pending_charge.test.ts` وغيره.
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM installment_plans WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM invoices WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

// ── القراءاتُ الفعّالة — لقطةٌ واحدة تُفحَص قبل كلّ مرحلة وبعدها ──────────

async function accountingSummary(session: any) {
  return (await http("GET", "/api/accounting/summary?branchId=1", session)).body;
}
async function dailySummary(session: any, date: string) {
  return (await http("GET", `/api/accounting/daily-summary?branchId=1&date=${date}`, session)).body;
}
async function liveRevenue(session: any) {
  return (await http("GET", "/api/dashboard/live-revenue", session)).body;
}
async function invoiceStats(session: any) {
  return (await http("GET", "/api/invoices/stats/summary?branchId=1", session)).body;
}
async function invoiceList(session: any) {
  return (await http("GET", "/api/invoices?branchId=1", session)).body as any[];
}
async function installmentList(session: any) {
  return (await http("GET", "/api/installment-plans?branchId=1", session)).body as any[];
}
async function trialBalanceMap(session: any): Promise<Map<string, { d: number; c: number }>> {
  const rows = (await http("GET", "/api/accounting/v2/reports/trial-balance?branchId=1", session))
    .body as any[];
  const m = new Map<string, { d: number; c: number }>();
  for (const r of rows ?? []) m.set(r.accountCode, { d: r.totalDebit, c: r.totalCredit });
  return m;
}
function acct(m: Map<string, { d: number; c: number }>, code: string) {
  return m.get(code) ?? { d: 0, c: 0 };
}
function balanceSums(m: Map<string, { d: number; c: number }>) {
  let d = 0, c = 0;
  for (const v of m.values()) { d += v.d; c += v.c; }
  return { d, c };
}
async function incomeStatement(session: any) {
  return (await http(
    "GET", "/api/accounting/v2/reports/income-statement?branchId=1&startDate=1900-01-01&endDate=2099-12-31",
    session,
  )).body;
}
async function balanceSheet(session: any) {
  return (await http(
    "GET", "/api/accounting/v2/reports/balance-sheet?branchId=1&asOfDate=2099-12-31", session,
  )).body;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name] of [
    [ADMIN, "admin", "المسؤول"],
    [MGR, "branch_manager", "مدير بغداد"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,1,'[1,2]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_id=1, branch_ids='[1,2]'::jsonb`,
      [id, `pm_u${id}`, role, name]);
  }
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
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  //  **مرفوعةٌ فوق `try`**: بعد الحذف النهائي يفقد `cleanup()` طريقه إلى
  //  القيدين (المريضُ نفسُه مُحيَ)، فتُحذَف هذه المعرّفاتُ صراحةً في
  //  `finally` — وإلّا بقي `journal_entries.created_by` يمنع حذف مستخدمي
  //  الاختبار في نهاية كلّ تشغيلة.
  let journalEntryIds: number[] = [];

  try {
    // ══ التحضير ═══════════════════════════════════════════════════════════
    const [p] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight,
         medical_condition, amputation_site, branch_id, is_amputee, total_cost,
         patient_classification)
       VALUES ($1,'07701234567',$2,'40','172','78','بتر',
               'احادي - طرف سفلي - يمين - تحت الركبة',1,true,$3,'new')
       RETURNING id`,
      [`${MARK} مريض`, MARK, PAYMENT_AMOUNT]);
    const patientId = p.id;
    const [c] = await q<{ id: number }>(
      `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
       VALUES ($1,1,'prosthetic',$2,'manual','active') RETURNING id`,
      [patientId, PAYMENT_AMOUNT]);
    const caseId = c.id;

    // ── دفعةٌ حقيقية + قيدُها المزدوج (مدين الصندوق 111101 / دائن الإيراد 4200) ──
    //  **ملاحظة**: `q()` تعيد صفوفَ pg الخام بأسماء أعمدةٍ بلغة القاعدة
    //  (snake_case)، بينما كاتبُ القيود يقرأ كائنَ `Payment` بأسماء Drizzle
    //  (camelCase). فيُبنى الكائنُ يدوياً — لا نمرّر صفَّ pg الخام مباشرةً.
    const [payRow] = await q(
      `INSERT INTO payments (patient_id, branch_id, case_id, amount, date, payment_treatment_type)
       VALUES ($1,1,$2,$3,NOW(),'أطراف صناعية') RETURNING *`,
      [patientId, caseId, PAYMENT_AMOUNT]);
    await createJournalForPayment({
      id: payRow.id, patientId: payRow.patient_id, branchId: payRow.branch_id,
      caseId: payRow.case_id, amount: payRow.amount, date: payRow.date,
      paymentTreatmentType: payRow.payment_treatment_type, notes: payRow.notes,
    } as any, ADMIN);
    await q(
      `INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source)
       VALUES ($1,1,$2,$3,'assign_manufacturing')`,
      [patientId, caseId, PAYMENT_AMOUNT]);

    // ── فاتورةٌ حقيقية + قيدُها المزدوج (مدين الذمم 1130 / دائن الإيراد 4900) ──
    const todayUtc = new Date().toISOString().split("T")[0];
    const [invRow] = await q(
      `INSERT INTO invoices (invoice_number, patient_id, branch_id, invoice_date,
         subtotal, discount, total, paid_amount, status)
       VALUES ($1,$2,1,$3,$4,0,$4,0,'pending') RETURNING *`,
      [`${MARK}-INV-${patientId}`, patientId, todayUtc, INVOICE_TOTAL]);
    await createJournalForInvoice({
      id: invRow.id, invoiceNumber: invRow.invoice_number, patientId: invRow.patient_id,
      branchId: invRow.branch_id, invoiceDate: invRow.invoice_date, subtotal: invRow.subtotal,
      discount: invRow.discount, total: invRow.total, paidAmount: invRow.paid_amount,
      status: invRow.status,
    } as any, [], ADMIN);

    // ── خطّةُ تقسيطٍ نشِطة ──
    await q(
      `INSERT INTO installment_plans (patient_id, branch_id, total_amount,
         installment_amount, number_of_installments, start_date, status)
       VALUES ($1,1,$2,111000,3,$3,'active')`,
      [patientId, INSTALLMENT_TOTAL, todayUtc]);

    const [payEntry] = await q<{ id: number }>(
      `SELECT id FROM journal_entries WHERE source_type='payment' AND source_id=$1`, [payRow.id]);
    const [invEntry] = await q<{ id: number }>(
      `SELECT id FROM journal_entries WHERE source_type='invoice' AND source_id=$1`, [invRow.id]);
    check(payEntry !== undefined && invEntry !== undefined,
      "٠. القيدان المزدوجان أُنشئا فعلاً لتُبنى عليهما بقيّةُ الاختبار");
    if (payEntry) journalEntryIds.push(payEntry.id);
    if (invEntry) journalEntryIds.push(invEntry.id);

    const baghdadToday = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });

    // ══ أ. المرحلةُ الفعّالة — المالُ ظاهرٌ في كلّ قارئ ═══════════════════
    console.log("\n── أ. فعّال — كلُّ الأرقام تشمل المريض ──");
    const accA = await accountingSummary(S.admin);
    const dailyA = await dailySummary(S.admin, baghdadToday);
    const liveA = await liveRevenue(S.admin);
    const statsA = await invoiceStats(S.admin);
    const listA = await invoiceList(S.admin);
    const instA = await installmentList(S.admin);
    const tbA = await trialBalanceMap(S.admin);
    const incA = await incomeStatement(S.admin);
    const bsA = await balanceSheet(S.admin);

    check(listA.some((x: any) => x.id === invRow.id), "أ١. الفاتورةُ في القائمة الفعّالة");
    check(instA.some((x: any) => x.patientId === patientId), "أ٢. وخطّةُ التقسيط في القائمة الفعّالة");
    same("أ٣. **وميزانُ المراجعة متوازنٌ** (مدينُ الفترة = دائنُها)",
      balanceSums(tbA).d === balanceSums(tbA).c, true);
    check(bsA?.isBalanced === true, "أ٤. **والميزانيةُ العموميةُ متوازنة**");
    same("أ٥. الصندوقُ 111101 يحمل مدينَ الدفعة", acct(tbA, "111101").d >= PAYMENT_AMOUNT, true);
    same("أ٦. والإيرادُ 4200 يحمل دائنَ الدفعة", acct(tbA, "4200").c >= PAYMENT_AMOUNT, true);
    same("أ٧. والذممُ 1130 تحمل مدينَ الفاتورة", acct(tbA, "1130").d >= INVOICE_TOTAL, true);
    same("أ٨. والإيرادُ 4900 يحمل دائنَ الفاتورة", acct(tbA, "4900").c >= INVOICE_TOTAL, true);

    // ══ ب. الحذفُ الناعم — المالُ يُقصى، والصفوفُ كما هي ═══════════════════
    console.log("\n── ب. الحذفُ الناعم ──");
    const del1 = await http("DELETE", `/api/patients/${patientId}`, S.mgr, { reason: "اختبار المال" });
    same("ب١. الحذفُ ينجح", del1.status, 200);

    const accB = await accountingSummary(S.admin);
    const dailyB = await dailySummary(S.admin, baghdadToday);
    const liveB = await liveRevenue(S.admin);
    const statsB = await invoiceStats(S.admin);
    const listB = await invoiceList(S.admin);
    const instB = await installmentList(S.admin);
    const tbB = await trialBalanceMap(S.admin);
    const incB = await incomeStatement(S.admin);
    const bsB = await balanceSheet(S.admin);

    same("ب٢. **الوارِدُ نقص بمقدار الدفعة بالضبط** (accounting/summary)",
      Number(accA.totalPaid) - Number(accB.totalPaid), PAYMENT_AMOUNT);
    same("ب٣. **والمبيعاتُ نقصت بمقدار قيد الكلفة بالضبط**",
      Number(accA.totalRevenue) - Number(accB.totalRevenue), PAYMENT_AMOUNT);
    same("ب٤. ووارِدُ اليوم (daily-summary) نقص بالمقدار نفسه",
      Number(dailyA.todayRevenue) - Number(dailyB.todayRevenue), PAYMENT_AMOUNT);
    same("ب٥. **ولوحةُ المالك المباشرة (live-revenue) كذلك**",
      Number(liveA.total) - Number(liveB.total), PAYMENT_AMOUNT);
    same("ب٦. وإحصاءُ الفواتير — العددُ نقص واحداً والمبلغُ بمقدار الفاتورة",
      [Number(statsA.totalInvoices) - Number(statsB.totalInvoices),
        Number(statsA.totalAmount) - Number(statsB.totalAmount)],
      [1, INVOICE_TOTAL]);
    check(!listB.some((x: any) => x.id === invRow.id), "ب٧. **والفاتورةُ اختفت من القائمة الفعّالة**");
    check(!instB.some((x: any) => x.patientId === patientId),
      "ب٨. **وخطّةُ التقسيط اختفت من القائمة الفعّالة**");

    // ══ **والقيدُ المزدوج نفسُه — لا سطرَ واحداً حُذف** ═══════════════════
    same("ب٩. **الصندوقُ 111101 نقص بمدين الدفعة بالضبط** — لا أكثر ولا أقلّ",
      acct(tbA, "111101").d - acct(tbB, "111101").d, PAYMENT_AMOUNT);
    same("ب١٠. **والإيرادُ 4200 نقص بدائن الدفعة بالضبط** — الطرفان معاً",
      acct(tbA, "4200").c - acct(tbB, "4200").c, PAYMENT_AMOUNT);
    same("ب١١. **والذممُ 1130 نقصت بمدين الفاتورة بالضبط**",
      acct(tbA, "1130").d - acct(tbB, "1130").d, INVOICE_TOTAL);
    same("ب١٢. **والإيرادُ 4900 نقص بدائن الفاتورة بالضبط**",
      acct(tbA, "4900").c - acct(tbB, "4900").c, INVOICE_TOTAL);
    same("ب١٣. **وميزانُ المراجعة ما زال متوازناً** — الإقصاءُ لم يكسر شيئاً",
      balanceSums(tbB).d === balanceSums(tbB).c, true);
    check(bsB?.isBalanced === true, "ب١٤. **والميزانيةُ العموميةُ ما زالت متوازنة**");
    same("ب١٥. وقائمةُ الدخل: الإيرادُ نقص بمجموع الدفعة والفاتورة",
      Number(incA.totalRevenue) - Number(incB.totalRevenue), PAYMENT_AMOUNT + INVOICE_TOTAL);

    // ══ ولا صفَّ حُذف أو عُدِّل — القيدان باقيان بمبلغهما، وأسطرُهما معاً ══
    const payLinesB = await q(
      `SELECT debit::int d, credit::int c, patient_id::int pid FROM journal_lines WHERE entry_id=$1 ORDER BY id`,
      [payEntry.id]);
    same("ب١٦. **أسطرُ قيد الدفعة نفسُها بمبالغها** — لا سطرَ يتيماً حُذف",
      payLinesB.map((l: any) => [l.d, l.c]), [[PAYMENT_AMOUNT, 0], [0, PAYMENT_AMOUNT]]);
    check(payLinesB.every((l: any) => l.pid === patientId),
      "ب١٧. وما زالت أسطرُه تشير إلى المريض — لم يُعدَّل شيء، القراءةُ وحدها استُثنيت");
    const [invStillThere] = await q(`SELECT total::int t FROM invoices WHERE id=$1`, [invRow.id]);
    same("ب١٨. **والفاتورةُ نفسُها باقيةٌ بمبلغها** في القاعدة", invStillThere?.t, INVOICE_TOTAL);

    // ══ ج. الاستعادة — المالُ يعود بمقداره بالضبط ═══════════════════════
    console.log("\n── ج. الاستعادة ──");
    const rst = await http("POST", `/api/patient-trash/${patientId}/restore`, S.mgr);
    same("ج١. الاستعادةُ تنجح", rst.status, 200);

    const accC = await accountingSummary(S.admin);
    const tbC = await trialBalanceMap(S.admin);
    const bsC = await balanceSheet(S.admin);
    const listC = await invoiceList(S.admin);
    const instC = await installmentList(S.admin);

    same("ج٢. **الوارِدُ عاد إلى قيمته الأصلية بالضبط**", Number(accC.totalPaid), Number(accA.totalPaid));
    same("ج٣. **والمبيعاتُ كذلك**", Number(accC.totalRevenue), Number(accA.totalRevenue));
    same("ج٤. **وأرصدةُ الحسابات الأربعة عادت حرفياً كما كانت**",
      [acct(tbC, "111101"), acct(tbC, "4200"), acct(tbC, "1130"), acct(tbC, "4900")],
      [acct(tbA, "111101"), acct(tbA, "4200"), acct(tbA, "1130"), acct(tbA, "4900")]);
    same("ج٥. وميزانُ المراجعة متوازنٌ بعد العودة أيضاً",
      balanceSums(tbC).d === balanceSums(tbC).c, true);
    check(bsC?.isBalanced === true, "ج٦. والميزانيةُ العموميةُ كذلك");
    check(listC.some((x: any) => x.id === invRow.id), "ج٧. **والفاتورةُ نفسُها عادت** — نفسُ المعرّف");
    check(instC.some((x: any) => x.patientId === patientId), "ج٨. وخطّةُ التقسيط عادت كذلك");

    // ══ د. الحذفُ النهائيّ بعد انقضاء المهلة — المالُ لا يعود أبداً ═══════
    console.log("\n── د. الحذفُ النهائيّ ──");
    await http("DELETE", `/api/patients/${patientId}`, S.mgr, { reason: "اختبار الحذف النهائي" });
    await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
               restore_until = NOW() - interval '10 days' WHERE id=$1`, [patientId]);
    const purge = await http("POST", `/api/patient-trash/${patientId}/purge`, S.admin,
      { reason: "اختبار دقة المال بعد الحذف النهائي" });
    same("د١. الحذفُ النهائيُّ ينجح بعد الانقضاء", purge.status, 200);
    same("د٢. **والصفُّ ذهب فعلاً**",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [patientId]))[0].n, 0);

    const accD = await accountingSummary(S.admin);
    const tbD = await trialBalanceMap(S.admin);
    const bsD = await balanceSheet(S.admin);
    const listD = await invoiceList(S.admin);
    const instD = await installmentList(S.admin);

    same("د٣. **الوارِدُ يبقى مُقصًى — لا يعود صامتاً لأنّ `patient_id` صار NULL**",
      Number(accD.totalPaid), Number(accB.totalPaid));
    same("د٤. **والمبيعاتُ تبقى مُقصاةً كذلك**", Number(accD.totalRevenue), Number(accB.totalRevenue));
    same("د٥. **وأرصدةُ الحسابات الأربعة تبقى مُقصاةً بمقدارها بعد الحذف الناعم بالضبط**",
      [acct(tbD, "111101"), acct(tbD, "4200"), acct(tbD, "1130"), acct(tbD, "4900")],
      [acct(tbB, "111101"), acct(tbB, "4200"), acct(tbB, "1130"), acct(tbB, "4900")]);
    same("د٦. **وميزانُ المراجعة ما زال متوازناً بعد الهدم أيضاً** — لا كسرَ ولا نصفَ إقصاء",
      balanceSums(tbD).d === balanceSums(tbD).c, true);
    check(bsD?.isBalanced === true, "د٧. **والميزانيةُ العموميةُ ما زالت متوازنة**");
    check(!listD.some((x: any) => x.id === invRow.id), "د٨. والفاتورةُ غائبةٌ (صفُّها مُحيَ فعلاً بالكاسكيد)");
    check(!instD.some((x: any) => x.patientId === patientId), "د٩. وخطّةُ التقسيط كذلك");

    // ══ **والحقيقةُ الدائمة مكتوبةٌ على القيدين قبل نزع الرابط** ═════════
    const flags = await q(
      `SELECT source_type, source_id, purged_patient_money FROM journal_entries
        WHERE (source_type='payment' AND source_id=$1) OR (source_type='invoice' AND source_id=$2)
        ORDER BY source_type`,
      [payRow.id, invRow.id]);
    check(flags.length === 2 && flags.every((f: any) => f.purged_patient_money === true),
      "د١٠. **القيدان مُوسَمان `purged_patient_money = TRUE`** — الحقيقةُ كُتبت قبل نزع الرابط");
    const linkNulled = await q(
      `SELECT count(*)::int n FROM journal_lines WHERE entry_id = ANY($1::int[]) AND patient_id IS NOT NULL`,
      [[payEntry.id, invEntry.id]]);
    same("د١١. **ورابطُ المريض على الأسطر مُنزوعٌ فعلاً** (كما كان قبل هذه المراجعة)",
      linkNulled[0].n, 0);
    same("د١٢. **ومع ذلك لم يعد المالُ** — الوسمُ الدائم هو ما أبقاه مُقصًى", true, true);

    //  والقيدُ نفسُه لم يُحذف ولم يُعدَّل — المبلغُ والأسطرُ كما كانت.
    const payLinesD = await q(
      `SELECT debit::int d, credit::int c FROM journal_lines WHERE entry_id=$1 ORDER BY id`,
      [payEntry.id]);
    same("د١٣. **وأسطرُ القيد نفسُها بمبالغها** — لم يُحذف ولم يُعكَس، أُقصي من القراءة فقط",
      payLinesD.map((l: any) => [l.d, l.c]), [[PAYMENT_AMOUNT, 0], [0, PAYMENT_AMOUNT]]);
  } finally {
    await cleanup();
    //  **صراحةً بالمعرّف**: بعد الحذف النهائي فقد `cleanup()` طريقَه إلى
    //  القيدين عبر صفّ المريض (مُحيَ)، فيُحذَفان هنا بمعرّفهما المحفوظ —
    //  وإلّا بقي `journal_entries.created_by` يمنع حذف مستخدمي الاختبار.
    if (journalEntryIds.length > 0) {
      await q(`DELETE FROM journal_lines WHERE entry_id = ANY($1::int[])`, [journalEntryIds]);
      await q(`DELETE FROM journal_entries WHERE id = ANY($1::int[])`, [journalEntryIds]);
    }
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص دقّة المال نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
