// **حقيقةُ مال الفواتير — بابٌ واحد** — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:invoice-cash`.
//
// ══ العطبُ الذي يثبته هذا الملفّ إغلاقَه ═══════════════════════════════════
// كان في التطبيق طريقان للقبض على فاتورة، ولكلٍّ نصفُ الحقيقة:
//   `POST /collect` — صفُّ دفعةٍ حقيقيّ (فيراه الوارد)، **لكن قيدُه خطأ**
//     (`createJournalForPayment`: مدين الصندوق/دائن الإيراد — يكرّر الإيراد
//     على فاتورةٍ أصدرت إيرادَها بالفعل).
//   `POST /payment` — قيدُه صحيح (`createJournalForInvoicePayment`: مدين
//     الصندوق/دائن الذمم)، **لكن بلا صفّ دفعةٍ إطلاقاً** وبلا فحص فرع.
// والآن كاتبٌ واحد (`server/accounting/invoice_cash.ts`) يملك الاثنين معاً،
// وكلا البابين ينادِيه بعينه.
//
// ══ الحارسُ الفعليّ هو `server/db.ts` نفسُه — لا هذا القسم ═══════════════
// `import { pool } from "./db"` أدناه يُرفَع (hoisting) فيُنفَّذ عند تحميل
// الوحدة **قبل** أيّ سطرٍ من جسم هذا الملفّ — بما فيه القسمُ ٠ التالي —
// مهما كان موضعُ سطر الاستيراد نصّاً. فالحارسُ الحقيقيُّ الذي يمنع اتّصالاً
// غيرَ آمن هو حارسُ `db.ts` القائم أصلاً (مُثبَتٌ في `test:db-safety`)، لا
// شيءٌ يحتاج تكراره هنا. **والقسمُ ٠ توثيقٌ صريحٌ لقرار هذا التشغيل
// بالذات** — يُطبَع في مخرجات الاختبار نفسِه ليقرأه المراجعُ مباشرةً، لا
// إعادةَ تنفيذٍ للحارس.

import { readFileSync } from "fs";
import { join } from "path";
import { checkDatabaseSafety } from "./db_url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

console.log("\n── ٠. الحارسُ الجديد يسمح بقاعدة الاختبار الفعلية ──");
{
  //  **لا يُطبَع الرابطُ ولا بيانات الاعتماد** — القرارُ وحده.
  const decision = checkDatabaseSafety({ env: process.env, argv: process.argv });
  check(decision.isTest, "٠١. العمليةُ تُكتشَف اختباراً (argv[1] ينتهي بـ.test.ts)");
  check(decision.allowed,
    "٠٢. **والحارسُ يسمح بالقاعدة الفعلية المحلولة** — وإلّا توقّفنا هنا",
    `source=${decision.source} local=${decision.verdict?.local} rejection=${decision.verdict?.rejection ?? "(none)"}`);
  if (!decision.allowed) {
    console.error("\n❌ رُفضت القاعدةُ من الحارس — لا يمكن المتابعة بأمان.\n" + decision.reason);
    process.exit(1);
  }
}

console.log("\n── ١. عقدُ الشاشة — Accounting.tsx لم تعد تنادي /payment القديمة ──");
{
  const src = readFileSync(join(import.meta.dirname, "../client/src/pages/Accounting.tsx"), "utf8");

  //  **يُنزَع التعليقُ أوّلاً** — تعليقٌ يشرح غيابَ نداءٍ للـ`/payment`
  //  القديمة يذكر الكلمةَ بالضرورة، فقراءةُ الجسم خاماً كانت تجعل شرحَ
  //  الإصلاح دليلاً على أنه لم يقع. (نفسُ درسِ `db_safety.test.ts`.)
  const stripComments = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, " ").split("\n").map((l) => l.replace(/\/\/.*$/, "")).join("\n");

  const iStart = src.indexOf("const createInvoiceMutation = useMutation({");
  const iEnd = src.indexOf("onSuccess: (invoice: any) =>", iStart);
  check(iStart > 0 && iEnd > iStart, "١٠. ووُجد جسمُ `createInvoiceMutation` لنفحصه");
  const mutationFnBody = stripComments(iStart > 0 && iEnd > iStart ? src.slice(iStart, iEnd) : "");

  check(!mutationFnBody.includes("/payment"),
    "١١. **ولا نداءَ لـ`/payment` في شيفرةٍ تُنفَّذ داخل `createInvoiceMutation`** — لا استبدالَ ولا نداءٍ ثانٍ",
    JSON.stringify(mutationFnBody));
  check(mutationFnBody.includes('apiRequest("POST", "/api/invoices", data)'),
    "١٢. **و`data` (ومعها `paidNow`) تُرسَل كما هي إلى `/api/invoices` مباشرةً** — طلبٌ واحد لا اثنان");

  // والبابُ القديمُ نفسُه يبقى قائماً في الخادم (توافقاً) — هذا الفحصُ على
  // الشاشة وحدها. وزرّ «تسجيل قبض» يبقى ينادي `/collect` كما كان، بلا تغيير
  // في هذه الدفعة.
  check(src.includes("${collectInvoice!.id}/collect"),
    "١٣. وزرُّ «تسجيل قبض» ما زال ينادي `/collect` كما كان — لا تغييرَ هناك");
}

// ══════════════════════════════════════════════════════════════════════════
//  من هنا فصاعداً: قاعدةُ بيانات حقيقية. الحارسُ أعلاه أثبت أنها آمنة.
// ══════════════════════════════════════════════════════════════════════════

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createJournalForPayment, createJournalForInvoice, createJournalForInvoicePayment } from "./accounting/auto_journal";

const PORT = 6891;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-قبض-الفواتير";
const ADMIN = 9981, MGR1 = 9982, RECV1 = 9983, MGR2 = 9984, NOPERM = 9985;
const USERS = [ADMIN, MGR1, RECV1, MGR2, NOPERM];

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canManageAccounting: true, canAddPayments: true },
  },
  mgr1: {
    userId: MGR1, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع ١",
    permissions: { canManageAccounting: true },
  },
  recv1: {
    userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبال الفرع ١",
    permissions: { canAddPayments: true },
  },
  mgr2: {
    userId: MGR2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "مدير الفرع ٢",
    permissions: { canManageAccounting: true },
  },
  noperm: {
    userId: NOPERM, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبالٌ بلا صلاحية قبض",
    permissions: {},
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

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM invoices WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function insertPatient(name: string): Promise<number> {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'35','170','70','غير محدد',1,false,0,'new')
     RETURNING id`,
    [name, MARK]);
  return p.id;
}

//  **عدّادٌ يضمن تفرّد رقم الفاتورة** — أكثر من فاتورةٍ بنفس (مريض/فرع/مبلغ)
//  في هذا الملفّ (مثلاً د. و و. كلاهما ١٠٠٠٠٠ على الفرع ١) كانت تتصادم على
//  `invoices_invoice_number_unique` بلا هذا العدّاد.
let invoiceSeq = 0;

/** فاتورةٌ **قائمةٌ مسبقاً** (كما تخرج من نقطة الإصدار) — لاختبار /collect و/payment. */
async function insertIssuedInvoice(patientId: number, branchId: number, total: number): Promise<{ id: number; invoiceNumber: string }> {
  const todayUtc = new Date().toISOString().split("T")[0];
  const invoiceNumber = `${MARK}-${patientId}-${branchId}-${total}-${++invoiceSeq}`;
  const [inv] = await q<{ id: number; invoice_number: string }>(
    `INSERT INTO invoices (invoice_number, patient_id, branch_id, invoice_date,
       subtotal, discount, total, paid_amount, status)
     VALUES ($1,$2,$3,$4,$5,0,$5,0,'pending') RETURNING id, invoice_number`,
    [invoiceNumber, patientId, branchId, todayUtc, total]);
  return { id: inv.id, invoiceNumber: inv.invoice_number };
}

async function journalTypesFor(sourceId: number): Promise<Record<string, number>> {
  const rows = await q<{ source_type: string; n: string }>(
    `SELECT source_type, COUNT(*)::text AS n FROM journal_entries
       WHERE source_id = $1 AND source_type IN ('invoice','invoice_payment','payment')
       GROUP BY source_type`,
    [sourceId]);
  const m: Record<string, number> = {};
  for (const r of rows) m[r.source_type] = Number(r.n);
  return m;
}
/** حالاتُ قيود نوعٍ بعينه على مصدرٍ بعينه — `posted` تعني «لم يُعكَس بعد». */
async function journalStatusesFor(sourceType: string, sourceId: number): Promise<string[]> {
  const rows = await q<{ status: string }>(
    `SELECT status FROM journal_entries WHERE source_type = $1 AND source_id = $2 ORDER BY id`,
    [sourceType, sourceId]);
  return rows.map((r) => r.status);
}
async function journalLinesFor(sourceType: string, sourceId: number): Promise<{ debit: number; credit: number; code: string }[]> {
  const rows = await q<{ debit: string; credit: string; code: string }>(
    `SELECT jl.debit, jl.credit, coa.account_code AS code
       FROM journal_lines jl
       JOIN journal_entries je ON je.id = jl.entry_id
       JOIN chart_of_accounts coa ON coa.id = jl.account_id
      WHERE je.source_type = $1 AND je.source_id = $2 AND je.status = 'posted'
      ORDER BY jl.id`,
    [sourceType, sourceId]);
  return rows.map((r) => ({ debit: Number(r.debit), credit: Number(r.credit), code: r.code }));
}
async function paymentsFor(invoiceId: number): Promise<any[]> {
  return q(`SELECT * FROM payments WHERE invoice_id = $1 ORDER BY id`, [invoiceId]);
}
async function invoiceRow(id: number): Promise<any> {
  const [r] = await q(`SELECT * FROM invoices WHERE id = $1`, [id]);
  return r;
}

//  ══ إثباتُ السباق مضبوطاً — لا ضغطتين متزامنتين بلا حكم ═══════════════════
//  «و» أثبتت أن ضغطتين متزامنتين لا تتجاوزان معاً — لكن أيّتهما تفوز هناك
//  غيرُ محكومة (والقفلُ يكفي لإثبات ذلك). وهذا القسم يحتاج أكثر: إثبات
//  **الاتجاهين** كلٍّ على حدة — القبضُ يفوز مرّةً، والحذفُ يفوز مرّةً أخرى.
//  فيُمسَك القفلُ يدوياً عبر اتّصالٍ خام (`pool.connect()`، معاملةٌ مفتوحة لا
//  تُغلَق)، فيضمن أيّهما بدأ `FOR UPDATE` أوّلاً — ثمّ يُطلَق الطلبُ الحقيقيُّ
//  (`/collect` أو `DELETE`) وهو يصطدم بالقفل نفسِه (`lockInvoiceTx` تحديداً،
//  الدالّةُ الواحدة التي يستعملها البابان)، ثمّ يُحرَّر القفلُ بعد أن يكتب
//  الاتّصالُ الخام **نفسَ الأثر** الذي كانت الكتابةُ «الفائزة» ستتركه —
//  فيقرأ الطلبُ المنتظِر الحالةَ الحقيقية بعد استيقاظه، لا افتراضاً.
//
//  والإثباتُ أن الطلبَ المنتظِر **حقّاً** يصطدم بالقفل (لا ينجح بالصدفة قبل
//  أن يُمسَك) عبر `pg_stat_activity.wait_event_type = 'Lock'` — لا عدّاً
//  زمنياً أعمى.
async function waitForBlockedLockWaiter(excludePid: number, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const rows = await q<{ pid: number }>(
      `SELECT pid FROM pg_stat_activity
        WHERE pid <> $1 AND wait_event_type = 'Lock' AND query ILIKE '%FROM invoices%FOR UPDATE%'`,
      [excludePid]);
    if (rows.length > 0) return;
    await new Promise((r) => setTimeout(r, 40));
  }
  throw new Error("انتهت المهلةُ بانتظار أن يصطدم الطلبُ المتزامن بقفل الصفّ — السباقُ لم يُضبَط");
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branchId] of [
    [ADMIN, "admin", "المسؤول", 1],
    [MGR1, "branch_manager", "مدير الفرع ١", 1],
    [RECV1, "reception", "استقبال الفرع ١", 1],
    [MGR2, "branch_manager", "مدير الفرع ٢", 2],
    [NOPERM, "reception", "استقبالٌ بلا صلاحية", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,$5,to_jsonb(ARRAY[$5]::int[]),true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `ic_u${id}`, role, name, branchId]);
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

  try {
    const p1 = await insertPatient(`${MARK} مريض ١`);
    const p2 = await insertPatient(`${MARK} مريض ٢`);
    const p3 = await insertPatient(`${MARK} مريض ٣`);
    const p4 = await insertPatient(`${MARK} مريض ٤`);

    // ══ أ. القبضُ الجزئيّ ═════════════════════════════════════════════════
    console.log("\n── أ. القبضُ الجزئيّ عبر /collect ──");
    const inv1 = await insertIssuedInvoice(p1, 1, 500_000);
    const rA = await http("POST", `/api/invoices/${inv1.id}/collect`, S.recv1, { amount: 200_000 });
    same("أ١. ٢٠٠ يُقبَل من موظّفٍ يحمل canAddPayments", rA.status, 200);
    same("أ٢. **والاستجابةُ تحمل الدفعةَ والفاتورةَ معاً**",
      [typeof rA.body?.payment?.id, rA.body?.payment?.amount, rA.body?.invoice?.paidAmount, rA.body?.invoice?.status],
      ["number", 200_000, 200_000, "partial"]);

    const payRowsA = await paymentsFor(inv1.id);
    same("أ٣. **صفُّ دفعةٍ حقيقيّ واحد** بـ`invoice_id` مطابق", payRowsA.length, 1);
    same("أ٤. المريضُ والفرعُ والمبلغُ مطابقةٌ تماماً",
      [payRowsA[0].patient_id, payRowsA[0].branch_id, payRowsA[0].amount], [p1, 1, 200_000]);

    const invA = await invoiceRow(inv1.id);
    same("أ٥. **`paid_amount` زاد بالضبط مرّةً واحدة**", invA.paid_amount, 200_000);
    same("أ٦. والحالةُ partial", invA.status, "partial");

    // ══ ب. الاكتمال ══════════════════════════════════════════════════════
    console.log("\n── ب. الاكتمالُ إلى «مدفوعة» ──");
    const rB = await http("POST", `/api/invoices/${inv1.id}/collect`, S.mgr1, { amount: 300_000 });
    same("ب١. المتبقّي ٣٠٠ يُقبَل من مديرِ الفرع", rB.status, 200);
    const invB = await invoiceRow(inv1.id);
    same("ب٢. **`paid_amount` = `total` بالضبط**", [invB.paid_amount, invB.total], [500_000, 500_000]);
    same("ب٣. والحالةُ paid", invB.status, "paid");
    same("ب٤. **صفّا دفعةٍ اثنان فقط** — لا صفَّ زائداً", (await paymentsFor(inv1.id)).length, 2);

    // ══ ج. تجاوزُ المتبقّي ═══════════════════════════════════════════════
    console.log("\n── ج. تجاوزُ المتبقّي — يُرفَض ──");
    const beforeC = await invoiceRow(inv1.id);
    const payCountBeforeC = (await paymentsFor(inv1.id)).length;
    const rC = await http("POST", `/api/invoices/${inv1.id}/collect`, S.mgr1, { amount: 1 });
    same("ج١. **يُردّ ٤٠٠**", rC.status, 400);
    check(typeof rC.body?.error === "string" && rC.body.error.length > 0, "ج٢. برسالةٍ عربية واضحة");
    const afterC = await invoiceRow(inv1.id);
    same("ج٣. **لا صفَّ دفعةٍ جديد**", (await paymentsFor(inv1.id)).length, payCountBeforeC);
    same("ج٤. **ولا تغييرَ على الفاتورة إطلاقاً**",
      [afterC.paid_amount, afterC.status], [beforeC.paid_amount, beforeC.status]);

    // ══ د. فرعٌ آخر ═══════════════════════════════════════════════════════
    console.log("\n── د. فرعٌ آخر — يُرفَض قبل أن يُمَسَّ مال ──");
    const inv2 = await insertIssuedInvoice(p1, 1, 100_000);
    const rD = await http("POST", `/api/invoices/${inv2.id}/collect`, S.mgr2, { amount: 50_000 });
    same("د١. **مديرُ الفرع ٢ يُردّ ٤٠٣** على فاتورةِ الفرع ١", rD.status, 403);
    const invD = await invoiceRow(inv2.id);
    same("د٢. **لا مالَ تحرّك**", [invD.paid_amount, (await paymentsFor(inv2.id)).length], [0, 0]);

    // ══ هـ. بلا صلاحية ═══════════════════════════════════════════════════
    console.log("\n── هـ. مستخدمٌ بلا صلاحية قبض ──");
    const rE = await http("POST", `/api/invoices/${inv2.id}/collect`, S.noperm, { amount: 10_000 });
    same("هـ١. **يُردّ ٤٠٣**", rE.status, 403);
    const invE = await invoiceRow(inv2.id);
    same("هـ٢. **ولا مالَ تحرّك**", [invE.paid_amount, (await paymentsFor(inv2.id)).length], [0, 0]);

    // ══ و. الضغطةُ المزدوجة — قفلُ الصفّ يُسلسِل ═══════════════════════════
    console.log("\n── و. قبضتان متزامنتان على الفاتورة نفسِها ──");
    const inv3 = await insertIssuedInvoice(p1, 1, 100_000);
    const [rF1, rF2] = await Promise.all([
      http("POST", `/api/invoices/${inv3.id}/collect`, S.recv1, { amount: 60_000 }),
      http("POST", `/api/invoices/${inv3.id}/collect`, S.recv1, { amount: 60_000 }),
    ]);
    const statuses = [rF1.status, rF2.status].sort();
    same("و١. **واحدةٌ تنجح (٢٠٠) والأخرى تُرفَض (٤٠٠)** — لا نجاحان معاً", statuses, [200, 400]);
    const invF = await invoiceRow(inv3.id);
    same("و٢. **`paid_amount` = ٦٠٠٠٠ بالضبط — لا ١٢٠٠٠٠**", invF.paid_amount, 60_000);
    same("و٣. **وصفُّ دفعةٍ واحدٌ فقط** على الفاتورة", (await paymentsFor(inv3.id)).length, 1);

    // ══ ز. حقيقةُ القيد المزدوج ══════════════════════════════════════════
    console.log("\n── ز. القيدُ المزدوج — إصدارٌ واحد وقبضان، بلا تكرارِ إيراد ──");
    const typesInv1 = await journalTypesFor(inv1.id);
    same("ز١. **فاتورةٌ واحدة، وقبضان اثنان بالضبط** — ولا قيدَ `payment` إطلاقاً",
      [typesInv1.invoice ?? 0, typesInv1.invoice_payment ?? 0, typesInv1.payment ?? 0], [0, 2, 0]);
    // (`invoice1` أُنشئ بإدراجٍ مباشر بلا قيد إصدار — القسمُ يثبت غياب قيد
    // `payment` لا وجودَ قيد الإصدار الذي لم نطلبه هنا.)

    const linesInv1Payment = await journalLinesFor("invoice_payment", inv1.id);
    const totalDrCash = linesInv1Payment.filter((l) => l.debit > 0).reduce((s, l) => s + l.debit, 0);
    const totalCrAr = linesInv1Payment.filter((l) => l.credit > 0).reduce((s, l) => s + l.credit, 0);
    same("ز٢. **مجموعُ مدين الصندوق عبر القبضين = ٥٠٠٠٠٠** (المجموعُ المقبوض)", totalDrCash, 500_000);
    same("ز٣. **ومجموعُ دائن الذمم (1130) = المبلغ نفسُه** — لا فرقَ ولا تكرارَ إيراد", totalCrAr, 500_000);
    check(linesInv1Payment.every((l) => l.code === "1130" || l.debit > 0),
      "ز٤. وكلُّ سطرِ دائنٍ في قيود القبض هو حساب الذمم 1130 تحديداً");

    const typesInv3 = await journalTypesFor(inv3.id);
    same("ز٥. **والضغطةُ المزدوجة أنتجت قيدَ قبضٍ واحداً فقط** — لا اثنين",
      typesInv3.invoice_payment ?? 0, 1);

    // ══ ح. البديلُ المتقاعد /payment ═══════════════════════════════════════
    console.log("\n── ح. `/api/invoices/:id/payment` — نفسُ الحقيقة المالية ──");
    const inv4 = await insertIssuedInvoice(p1, 1, 150_000);

    const rH_wrongBranch = await http("POST", `/api/invoices/${inv4.id}/payment`, S.mgr2, { amount: 50_000 });
    same("ح١. **فرعٌ آخر يُردّ ٤٠٣ أيضاً** — البديلُ لم يعد بلا فحص فرع", rH_wrongBranch.status, 403);
    same("ح٢. ولا مالَ تحرّك", (await paymentsFor(inv4.id)).length, 0);

    const rH1 = await http("POST", `/api/invoices/${inv4.id}/payment`, S.recv1, { amount: 50_000 });
    same("ح٣. **القبضُ الصحيح ينجح (٢٠٠)**", rH1.status, 200);
    same("ح٤. **والاستجابةُ فاتورةٌ عاريةٌ (توافقاً)** — لا `{invoice,payment}`",
      [rH1.body?.paidAmount, rH1.body?.status, rH1.body?.payment], [50_000, "partial", undefined]);

    const payRowsH = await paymentsFor(inv4.id);
    same("ح٥. **صفُّ دفعةٍ حقيقيّ وُلد فعلاً** — العطبُ الذي كان: لا صفَّ إطلاقاً", payRowsH.length, 1);
    same("ح٦. المريضُ والفرعُ صحيحان", [payRowsH[0].patient_id, payRowsH[0].branch_id], [p1, 1]);

    const typesInv4 = await journalTypesFor(inv4.id);
    same("ح٧. **قيدُ `invoice_payment` — لا `payment`**",
      [typesInv4.invoice_payment ?? 0, typesInv4.payment ?? 0], [1, 0]);

    const rH_over = await http("POST", `/api/invoices/${inv4.id}/payment`, S.recv1, { amount: 999_999 });
    same("ح٨. **وتجاوزُ المتبقّي يُرفَض من البديل أيضاً**", rH_over.status, 400);
    same("ح٩. بلا صفٍّ إضافيّ", (await paymentsFor(inv4.id)).length, 1);

    // ══ ط. الإنشاءُ مع رصيدٍ سابق ودفعةٍ فورية ═══════════════════════════
    console.log("\n── ط. إنشاءُ فاتورةٍ — رصيدٌ سابق + دفعةٌ فورية ──");
    // رصيدٌ سابق: دفعةُ جلساتٍ لم تُخصَّص لفاتورةٍ بعد.
    await q(
      `INSERT INTO payments (patient_id, branch_id, amount, date, payment_treatment_type)
       VALUES ($1,1,80000,NOW(),'علاج طبيعي')`,
      [p2]);

    const rJ1 = await http("POST", "/api/invoices", S.admin, {
      patientId: p2, branchId: 1, invoiceDate: new Date().toISOString().split("T")[0],
      subtotal: 200_000, discount: 0, total: 200_000,
      items: [{ description: `${MARK}-item`, serviceType: "علاج طبيعي", quantity: 1, unitPrice: 200_000, total: 200_000 }],
      applyPriorCredit: true, paidNow: 100_000,
    });
    same("ط١. **الإنشاءُ ينجح** برصيدٍ سابق ودفعةٍ فورية معاً", rJ1.status, 200);
    same("ط٢. **الرصيدُ المطبَّق = ٨٠٠٠٠ بالضبط**", rJ1.body?.creditApplied, 80_000);
    same("ط٣. **و`paidAmount` = الرصيدُ + الدفعةُ الفورية = ١٨٠٠٠٠**", rJ1.body?.paidAmount, 180_000);
    check(rJ1.body?.paidAmount <= rJ1.body?.total, "ط٤. ولا يتجاوز الإجماليَّ أبداً");

    const invJ1Id = rJ1.body?.id;
    const payRowsJ1 = await paymentsFor(invJ1Id);
    same("ط٥. **صفُّ دفعةٍ حقيقيّ وُلد للدفعة الفورية وحدها** (١٠٠٠٠٠ لا ١٨٠٠٠٠)",
      [payRowsJ1.length, payRowsJ1[0]?.amount], [1, 100_000]);

    const typesJ1 = await journalTypesFor(invJ1Id);
    same("ط٦. **قيدُ إصدارٍ واحد وقيدُ قبضٍ واحد** — الرصيدُ السابق لا يُنتج قيدَ قبضٍ ثانٍ",
      [typesJ1.invoice ?? 0, typesJ1.invoice_payment ?? 0], [1, 1]);
    const issueLines = await journalLinesFor("invoice", invJ1Id);
    same("ط٧. **قيدُ الإصدار: مدين الذمم = دائن الإيراد = ٢٠٠٠٠٠**",
      [issueLines.filter((l) => l.debit > 0).reduce((s, l) => s + l.debit, 0),
        issueLines.filter((l) => l.credit > 0).reduce((s, l) => s + l.credit, 0)],
      [200_000, 200_000]);
    const payLinesJ1 = await journalLinesFor("invoice_payment", invJ1Id);
    same("ط٨. **قيدُ القبض على الدفعة الفورية وحدها = ١٠٠٠٠٠** — لا ١٨٠٠٠٠",
      payLinesJ1.filter((l) => l.debit > 0).reduce((s, l) => s + l.debit, 0), 100_000);

    // ── ط.ب: paidNow يتجاوز المتبقّي بعد الرصيد ⟶ تراجعٌ كامل ──
    // **مريضٌ جديدٌ مستقلّ (p4)** لهذه الفقرة تحديداً — لا p2 نفسِها: p2
    // أنفقت رصيدَها الوحيد (٨٠٠٠٠) بالفعل في ط١ أعلاه (صار جزءاً من
    // `paid_amount` الفاتورة الأولى، فحسابُ الرصيد المتاح للفاتورة
    // التالية = ٠ بحقّ — والمعادلةُ تقرأ *كلَّ* دفعات المريض ناقصَ ما هو
    // مطبَّقٌ على فواتيرَ أخرى بالفعل، لا رصيداً منفصلاً يبقى جانباً).
    // فمريضٌ جديدٌ برصيدٍ لم يُلمَس بعد هو الطريقةُ الصحيحةُ لعزل «هل تراجعت
    // المحاولةُ الفاشلة عن استهلاك الرصيد؟» عن «هل الرصيدُ نفدَ شرعاً؟».
    console.log("\n── ط.ب. paidNow يتجاوز المتبقّي بعد الرصيد — لا فاتورةَ نصفَ مكتملة ──");
    await q(
      `INSERT INTO payments (patient_id, branch_id, amount, date, payment_treatment_type)
       VALUES ($1,1,80000,NOW(),'علاج طبيعي')`,
      [p4]);
    const invoiceCountBefore = (await q<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM invoices WHERE patient_id = $1`, [p4]))[0].n;

    const rJ2 = await http("POST", "/api/invoices", S.admin, {
      patientId: p4, branchId: 1, invoiceDate: new Date().toISOString().split("T")[0],
      subtotal: 200_000, discount: 0, total: 200_000,
      items: [{ description: `${MARK}-item2`, serviceType: "علاج طبيعي", quantity: 1, unitPrice: 200_000, total: 200_000 }],
      applyPriorCredit: true, paidNow: 130_000, // المتبقّي بعد رصيدٍ ٨٠٠٠٠ = ١٢٠٠٠٠ فقط
    });
    same("ط٩. **تُرفَض (٤٠٠)** — الدفعةُ الفورية أكبر من المتبقّي بعد الرصيد", rJ2.status, 400);

    const invoiceCountAfter = (await q<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM invoices WHERE patient_id = $1`, [p4]))[0].n;
    same("ط١٠. **ولا فاتورةَ نصفَ مكتملة** — العددُ لم يتغيّر إطلاقاً", invoiceCountAfter, invoiceCountBefore);
    same("   وكان العددُ صفراً قبلها — إذن يبقى صفراً بعدها", invoiceCountAfter, "0");

    // والرصيدُ لم يُستهلَك بالمحاولة الفاشلة — فاتورةٌ صحيحة تالية تطالب به كاملاً.
    const rJ3 = await http("POST", "/api/invoices", S.admin, {
      patientId: p4, branchId: 1, invoiceDate: new Date().toISOString().split("T")[0],
      subtotal: 80_000, discount: 0, total: 80_000,
      items: [{ description: `${MARK}-item3`, serviceType: "علاج طبيعي", quantity: 1, unitPrice: 80_000, total: 80_000 }],
      applyPriorCredit: true, paidNow: 0,
    });
    same("ط١١. **والرصيدُ ٨٠٠٠٠ ما زال متاحاً كاملاً** — المحاولةُ الفاشلة لم تستهلك شيئاً منه",
      [rJ3.status, rJ3.body?.creditApplied, rJ3.body?.status], [200, 80_000, "paid"]);

    // ══ ي. لا انحرافَ في الدفعة العادية (غير المرتبطة بفاتورة) ═══════════
    console.log("\n── ي. لا انحرافَ — الدفعةُ العاديّةُ على قيدها القديم كما هو ──");
    const [payRowK] = await q(
      `INSERT INTO payments (patient_id, branch_id, amount, date, payment_treatment_type)
       VALUES ($1,1,70000,NOW(),'أطراف صناعية') RETURNING *`,
      [p3]);
    await createJournalForPayment({
      id: payRowK.id, patientId: payRowK.patient_id, branchId: payRowK.branch_id,
      amount: payRowK.amount, date: payRowK.date,
      paymentTreatmentType: payRowK.payment_treatment_type, notes: payRowK.notes,
    } as any, ADMIN);
    const typesK = await journalTypesFor(payRowK.id);
    // ملاحظة: `journalTypesFor` تصفّي بـ `source_id` — للدفعة العادية
    // `source_id = payment.id` (لا فاتورة)، فهذا استعلامٌ صحيحٌ بنفس العمود.
    const kRows = await q<{ source_type: string; n: string }>(
      `SELECT source_type, COUNT(*)::text AS n FROM journal_entries
         WHERE source_id = $1 AND source_type = 'payment' GROUP BY source_type`,
      [payRowK.id]);
    same("ي١. **الدفعةُ العاديّةُ تنتج قيدَ `payment` كما كانت دائماً** — لم يتغيّر بحرف",
      kRows.length > 0 ? Number(kRows[0].n) : 0, 1);
    const linesK = await journalLinesFor("payment", payRowK.id);
    same("ي٢. مدين الصندوق = دائن الإيراد = ٧٠٠٠٠ (Dr Cash / Cr Revenue — لا AR)",
      [linesK.filter((l) => l.debit > 0).reduce((s, l) => s + l.debit, 0),
        linesK.filter((l) => l.credit > 0).reduce((s, l) => s + l.credit, 0)],
      [70_000, 70_000]);

    // ══ ك. الحذفُ بعد التسوية المالية — ممنوع ═══════════════════════════════
    // العطبُ المكتشَف: `reverseJournalForSource` يعكس قيداً واحداً فقط
    // (`LIMIT 1`)، فحذفُ فاتورةٍ بقبضتين كان سيُبقي صفَّي دفعتيها ويعكس قيدَ
    // إحداهما وحدها — فيختلف الوارِدُ التشغيليّ عن الدفتر المزدوج.
    console.log("\n── ك. الحذفُ بعد التسوية المالية — ممنوع ──");

    // ── ك.أ: فاتورةٌ بقبضةٍ واحدة ناجحة ──
    const invK1 = await insertIssuedInvoice(p1, 1, 100_000);
    await createJournalForInvoice({
      id: invK1.id, invoiceNumber: invK1.invoiceNumber, patientId: p1, branchId: 1,
      invoiceDate: new Date().toISOString().split("T")[0], subtotal: 100_000, discount: 0,
      total: 100_000, paidAmount: 0, status: "pending",
    } as any, [], ADMIN);
    const rK1collect = await http("POST", `/api/invoices/${invK1.id}/collect`, S.recv1, { amount: 100_000 });
    same("ك.أ١. القبضُ الكاملُ يُمهِّد ينجح", rK1collect.status, 200);

    const paidBeforeK1 = (await paymentsFor(invK1.id)).length;
    const invoiceJournalBeforeK1 = await journalStatusesFor("invoice", invK1.id);
    const paymentJournalBeforeK1 = await journalStatusesFor("invoice_payment", invK1.id);

    const rK1del = await http("DELETE", `/api/invoices/${invK1.id}`, S.mgr1);
    same("ك.أ٢. **الحذفُ يُردّ ٤٠٩** — فاتورةٌ عليها قبضةٌ واحدة", rK1del.status, 409);
    check(typeof rK1del.body?.error === "string" && rK1del.body.error.length > 0,
      "ك.أ٣. برسالةٍ عربية واضحة");

    const invK1After = await invoiceRow(invK1.id);
    check(invK1After !== undefined, "ك.أ٤. **والفاتورةُ ما زالت موجودة**");
    same("ك.أ٥. **وصفُّ الدفعة ما زال موجوداً**", (await paymentsFor(invK1.id)).length, paidBeforeK1);
    same("ك.أ٦. **وقيدُ الإصدار لم يتغيّر** (لا عكسَ)",
      await journalStatusesFor("invoice", invK1.id), invoiceJournalBeforeK1);
    same("ك.أ٧. **وقيدُ القبض لم يتغيّر** (لا عكسَ)",
      await journalStatusesFor("invoice_payment", invK1.id), paymentJournalBeforeK1);
    same("   وكلاهما ما زالا `posted` — لم يُعكَس شيء",
      [invoiceJournalBeforeK1, paymentJournalBeforeK1], [["posted"], ["posted"]]);

    // ── ك.ب: فاتورةٌ بقبضتين جزئيّتين ناجحتين — الحالةُ التي تُثبت إغلاق العطب ──
    const invK2 = await insertIssuedInvoice(p1, 1, 100_000);
    const rK2a = await http("POST", `/api/invoices/${invK2.id}/collect`, S.recv1, { amount: 40_000 });
    const rK2b = await http("POST", `/api/invoices/${invK2.id}/collect`, S.mgr1, { amount: 60_000 });
    same("ك.ب١. القبضتان الجزئيّتان تنجحان معاً", [rK2a.status, rK2b.status], [200, 200]);
    same("ك.ب٢. **وصفّا دفعةٍ حقيقيّان اثنان**", (await paymentsFor(invK2.id)).length, 2);

    const paymentJournalsBeforeK2 = await journalStatusesFor("invoice_payment", invK2.id);
    same("ك.ب٣. **وقيدا قبضٍ منشوران اثنان قبل محاولة الحذف**", paymentJournalsBeforeK2, ["posted", "posted"]);

    const rK2del = await http("DELETE", `/api/invoices/${invK2.id}`, S.admin);
    same("ك.ب٤. **الحذفُ يُردّ ٤٠٩ أيضاً** — قبضتان لا واحدة", rK2del.status, 409);

    same("ك.ب٥. **صفّا الدفعتين معاً ما زالا موجودين** — لا صفَّ اختفى", (await paymentsFor(invK2.id)).length, 2);
    same("ك.ب٦. **وقيدا القبض معاً ما زالا `posted`** — لا عكسَ جزئيّ لأحدهما",
      await journalStatusesFor("invoice_payment", invK2.id), ["posted", "posted"]);
    // ولا قيدَ عكسٍ (`reversal`) وُلد يشير إلى أيٍّ منهما.
    const reversalsK2 = await q<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM journal_entries
         WHERE source_type = 'reversal' AND source_id IN (
           SELECT id FROM journal_entries WHERE source_type = 'invoice_payment' AND source_id = $1
         )`, [invK2.id]);
    same("ك.ب٧. **ولا قيدَ عكسٍ واحداً وُلد** لأيٍّ من القبضتين", Number(reversalsK2[0].n), 0);

    // ── ك.ج: تناقضٌ تاريخيّ دفاعيّ — paid_amount صفرٌ وصفُّ دفعةٍ موجود ──
    const invK3 = await insertIssuedInvoice(p1, 1, 50_000);
    // صفُّ دفعةٍ يُدرَج مباشرةً (محاكاةً لانحرافٍ تاريخيّ) بلا تحديث
    // `paid_amount` — بالضبط ما يحرسه الفحصُ الثاني في `invoiceHasFinancialSettlement`.
    await q(
      `INSERT INTO payments (patient_id, branch_id, amount, date, invoice_id)
       VALUES ($1,1,50000,NOW(),$2)`,
      [p1, invK3.id]);
    const invK3Before = await invoiceRow(invK3.id);
    same("ك.ج١. **`paid_amount` = صفرٌ فعلاً** — التناقضُ التاريخيُّ مقصود", invK3Before.paid_amount, 0);

    const rK3del = await http("DELETE", `/api/invoices/${invK3.id}`, S.admin);
    same("ك.ج٢. **ويُردّ ٤٠٩ رغم أن `paid_amount` صفرٌ** — الفحصُ الثاني وحده كافٍ", rK3del.status, 409);
    check((await invoiceRow(invK3.id)) !== undefined, "ك.ج٣. والفاتورةُ ما زالت موجودة");
    same("ك.ج٤. وصفُّ الدفعة اليتيم ما زال موجوداً", (await paymentsFor(invK3.id)).length, 1);

    // ── ك.د: فاتورةٌ بلا مالٍ إطلاقاً — سلوكُ الحذف القديم كما هو ──
    const invK4 = await insertIssuedInvoice(p1, 1, 75_000);
    await createJournalForInvoice({
      id: invK4.id, invoiceNumber: invK4.invoiceNumber, patientId: p1, branchId: 1,
      invoiceDate: new Date().toISOString().split("T")[0], subtotal: 75_000, discount: 0,
      total: 75_000, paidAmount: 0, status: "pending",
    } as any, [], ADMIN);
    same("ك.د١. **بلا `paid_amount` وبلا صفّ دفعةٍ**",
      [(await invoiceRow(invK4.id)).paid_amount, (await paymentsFor(invK4.id)).length], [0, 0]);

    const rK4del = await http("DELETE", `/api/invoices/${invK4.id}`, S.admin);
    same("ك.د٢. **والحذفُ ينجح كما كان دائماً** — لا تغييرَ على الفاتورة غير المقبوضة", rK4del.status, 200);
    same("ك.د٣. **والفاتورةُ حُذفت فعلاً**", await invoiceRow(invK4.id), undefined);
    same("ك.د٤. **وقيدُ الإصدار عُكس كما كان** — سلوكُ الحذف القديم سليمٌ بلا مساس",
      await journalStatusesFor("invoice", invK4.id), ["reversed"]);

    // ══ ل. السباقُ محكوماً — أيّهما يقفل أوّلاً يحسم، لا الصدفة ═══════════════
    // العطبُ المُكتشَف بعد «ك»: فحصُ التسوية كان يُقرأ **قبل** معاملة الحذف
    // بلا قفل، فقبضٌ متزامنٌ (`collectInvoicePayment`، تقفل صفَّها `FOR
    // UPDATE`) قد ينجز بين القراءة والحذف — فتُحذَف فاتورةٌ وصفُّ دفعتها
    // الجديد يبقى يتيماً. هذا القسمُ يضبط الفوزَ صراحةً بالاتجاهين معاً.
    console.log("\n── ل. السباقُ محكوماً — أيّهما يقفل أوّلاً يحسم ──");

    // ── ل.أ: القبضُ يفوز أوّلاً — الحذفُ ينتظر ثمّ يرى تسويةً حقيقية ──
    const invL1 = await insertIssuedInvoice(p1, 1, 100_000);
    const rc1 = await pool.connect();
    try {
      await rc1.query("BEGIN");
      const { rows: pidRows1 } = await rc1.query("SELECT pg_backend_pid() AS pid");
      const rc1Pid = Number(pidRows1[0].pid);
      //  **القبضُ يقفل الصفَّ أوّلاً — بيقين، لا سباقاً** — الحذفُ لم يُطلَق بعد.
      await rc1.query("SELECT id FROM invoices WHERE id = $1 FOR UPDATE", [invL1.id]);

      //  والآن يُطلَق الحذفُ الحقيقيّ — سيصطدم بالقفل الذي تحمله `rc1`.
      const deleteRacePromise = http("DELETE", `/api/invoices/${invL1.id}`, S.admin);
      await waitForBlockedLockWaiter(rc1Pid);

      //  ومن داخل معاملة القفل، القبضُ «يفوز»: **نفسُ أثر** `applyInvoiceCashTx`
      //  الحقيقيّ — صفُّ دفعةٍ حقيقيّ + تحديثُ الفاتورة — ثمّ COMMIT يُحرِّر القفل.
      await rc1.query(
        `INSERT INTO payments (patient_id, branch_id, amount, date, invoice_id, notes)
         VALUES ($1,1,$2,NOW(),$3,'قبض فاتورة رقم (سباقٌ محكوم — القبض أوّلاً)')`,
        [p1, 40_000, invL1.id]);
      await rc1.query(`UPDATE invoices SET paid_amount = $1, status = 'partial' WHERE id = $2`,
        [40_000, invL1.id]);
      await rc1.query("COMMIT");
      //  والقيدُ المحاسبيّ بعد الـCOMMIT — نفسُ ترتيب `/collect` الحقيقيّ.
      await createJournalForInvoicePayment(
        { id: invL1.id, invoiceNumber: invL1.invoiceNumber, branchId: 1, patientId: p1 } as any,
        40_000, ADMIN);

      const rDel = await deleteRacePromise;
      same("ل.أ١. **الحذفُ ينتظر القفل ثمّ يقرأ التسويةَ الحقيقية فيُرفَض ٤٠٩**", rDel.status, 409);

      const invL1After = await invoiceRow(invL1.id);
      check(invL1After !== undefined, "ل.أ٢. **والفاتورةُ ما زالت موجودة**");
      same("ل.أ٣. **والقبضُ نجح مرّةً واحدة بمقداره بالضبط**", invL1After?.paid_amount, 40_000);
      const payL1 = await paymentsFor(invL1.id);
      same("ل.أ٤. **وصفُّ دفعةٍ حقيقيّ واحد مربوطٌ بالفاتورة — لا يتيم**", payL1.length, 1);
      same("ل.أ٥. **وقيدُ قبضٍ واحدٌ فقط، منشورٌ لا مُعكَس** — لا تكرارَ ولا عكسَ جزئيّ",
        await journalStatusesFor("invoice_payment", invL1.id), ["posted"]);
    } finally {
      rc1.release();
    }

    // ── ل.ب: الحذفُ يفوز أوّلاً — القبضُ ينتظر ثمّ لا يجد فاتورةً، ولا يتيمَ يبقى ──
    const invL2 = await insertIssuedInvoice(p1, 1, 100_000);
    const rc2 = await pool.connect();
    try {
      await rc2.query("BEGIN");
      const { rows: pidRows2 } = await rc2.query("SELECT pg_backend_pid() AS pid");
      const rc2Pid = Number(pidRows2[0].pid);
      //  **الحذفُ يقفل الصفَّ أوّلاً — بيقين** — القبضُ لم يُطلَق بعد.
      await rc2.query("SELECT id FROM invoices WHERE id = $1 FOR UPDATE", [invL2.id]);

      //  والآن يُطلَق القبضُ الحقيقيّ — سيصطدم بالقفل الذي تحمله `rc2`.
      const collectRacePromise = http("POST", `/api/invoices/${invL2.id}/collect`, S.recv1, { amount: 50_000 });
      await waitForBlockedLockWaiter(rc2Pid);

      //  ومن داخل معاملة القفل، الحذفُ «يفوز»: **نفسُ أثر** `deleteInvoiceIfUntouched`
      //  الحقيقيّ لفاتورةٍ نظيفة — حذفُ البنود ثمّ الفاتورة — ثمّ COMMIT يُحرِّر القفل.
      await rc2.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [invL2.id]);
      await rc2.query(`DELETE FROM invoices WHERE id = $1`, [invL2.id]);
      await rc2.query("COMMIT");

      const rCollect = await collectRacePromise;
      same("ل.ب١. **القبضُ ينتظر القفل ثمّ يجد الفاتورةَ غائبةً فيفشل ٤٠٤**", rCollect.status, 404);

      check((await invoiceRow(invL2.id)) === undefined, "ل.ب٢. **والفاتورةُ محذوفةٌ فعلاً**");
      same("ل.ب٣. **ولا صفَّ دفعةٍ وُلد إطلاقاً — لا يتيمَ يشير إلى فاتورةٍ محذوفة**",
        (await paymentsFor(invL2.id)).length, 0);
      same("ل.ب٤. **ولا قيدَ قبضٍ وُلد** — لا مالَ تحرّك فلا شيء يُعكَس أو يُكرَّر",
        (await journalStatusesFor("invoice_payment", invL2.id)).length, 0);
    } finally {
      rc2.release();
    }

  } finally {
    await cleanup();
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كلُّ فحوص حقيقة مال الفواتير نجحت"
    : `❌ ${failures} فشل`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
