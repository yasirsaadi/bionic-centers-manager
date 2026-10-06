// **المدقّقُ الماليّ في المساعد** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.cd) — جردٌ ومطابقةٌ وكشفُ حركات.
//
// ══ المبدأ الحاكم — نفسُ مبدأ `reports.ts` ═══════════════════════════════════════════════
// كلُّ رقمٍ هنا يُحسب **في الخادم** من مصادر التطبيق نفسِها: الوارد والمصاريفُ والصافي والديون من `getAccountingSummary`
// (رقمُ صفحة المحاسبة والتقرير اليومي)، والدفترُ من `cashBookPeriod` (حسابُ ورقة الدفتر يوماً يوماً)، ونسبةُ الدكتور من
// `ownerDrawingsForPeriod`. والنموذجُ يكتب التقريرَ من حقائقَ جاهزة — **لا يجمع ولا يطرح ولا يقدّر**. فالمطابقةُ نفسُها
// (`checks`) تُحسب هنا، ويصل النموذجَ حكمُها (`ok` / `warn` / `fail`) ودليلُه.
//
// ══ النطاق ══════════════════════════════════════════════════════════════════════════════
// يُحسم في `registry.ts` قبل الوصول هنا: مديرُ الفرع ⟵ فرعُه النشط وحده، والمسؤولُ ⟵ ما يختاره أو كلُّ الفروع.
// وقاصةُ الدكتور (`includeDrBox`) للمسؤول وحده — مالُ المالك الخاصّ لا يصل مديرَ فرع.

import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "../../db";
import { storage, baghdadDayBounds } from "../../storage";
import { auditLog, branches, expenses, patientCases, patients, payments, cashBookEntries } from "@shared/schema";
import { activePatientDrizzle } from "../../patients/active_patient";
import { categoryArabicLabel, detectAnomalies } from "../../anomalies/detector";
import { DEPARTMENT_LABELS, isDepartment } from "@shared/service_taxonomy";
import { branchCashConfig, CASH_BOOK_LABELS, HOSPITAL_RATIO_CATEGORY, ATABAH_RATIO_CATEGORY, type CashBook } from "@shared/cash_book";
import { cashBookPeriod, ownerDrawingsForPeriod } from "../../cash_book/store";
import { ownerSummary } from "../../cash_book/dr_box";
import { todayInBaghdad } from "./reports";

const TOP = 10;
const DAY_MS = 86_400_000;
const BAGHDAD_MS = 3 * 3_600_000;

const baghdadDay = (d: Date | string | null): string | null =>
  d ? new Date(new Date(d).getTime() + BAGHDAD_MS).toISOString().slice(0, 10) : null;
const departmentLabel = (t: string | null | undefined) => (isDepartment(t) ? DEPARTMENT_LABELS[t] : "بلا قسم");
const sectionLabel = (s: string | null | undefined) =>
  s === "prosthetic" ? "الأطراف والمساند" : s === "physio" ? "العلاج الطبيعي" : "مشترك";
/** اسمُ الباب بالعربية — ومعه بابا النسبتين اللذان لا يعرفهما كاشفُ الشذوذ. */
const catLabel = (c: string) =>
  c === HOSPITAL_RATIO_CATEGORY ? "نسبة المستشفى" : c === ATABAH_RATIO_CATEGORY ? "نسبة العتبة" : categoryArabicLabel(c);
/** مطابقةٌ عربيةٌ متسامحة: بلا «ال» التعريف ولا تشكيل — «علاج طبيعي» تطابق «العلاج الطبيعي». */
const normAr = (x: string) => x.replace(/[\u064B-\u0652]/g, "").replace(/(^|\s)ال/g, "$1").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").trim().toLowerCase();
const matches = (label: string, raw: string | null | undefined, wanted: string) =>
  raw === wanted || normAr(label).includes(normAr(wanted));
const byAmountThenLabel = (a: { amount: number; label: string }, b: { amount: number; label: string }) =>
  b.amount - a.amount || a.label.localeCompare(b.label, "ar");
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

type CheckStatus = "ok" | "warn" | "fail";
interface AuditCheck { code: string; label: string; status: CheckStatus; detail: string }

/** سطورُ الدفعات في الفترة — **بشرط المحاسبة نفسِه**: مريضٌ فعّال، فرعُ القبض، يومُ بغداد. */
async function paymentRows(branchId: number | undefined, start: string, end: string) {
  const { start: ts, endExclusive: te } = baghdadDayBounds(start, end);
  return db.select({
    id: payments.id, amount: payments.amount, date: payments.date, notes: payments.notes, isFree: payments.isFreeSessions,
    branchId: payments.branchId, branchName: branches.name,
    code: patients.patientCode, name: patients.name, caseType: patientCases.caseType,
  }).from(payments)
    .innerJoin(patients, eq(patients.id, payments.patientId))
    .innerJoin(branches, eq(branches.id, payments.branchId))
    .leftJoin(patientCases, eq(patientCases.id, payments.caseId))
    .where(and(branchId ? eq(payments.branchId, branchId) : sql`TRUE`, gte(payments.date, ts!), lt(payments.date, te!), activePatientDrizzle()))
    .orderBy(payments.date, payments.id);
}

/** سطورُ المصاريف في الفترة — بتاريخ المصروف والطرفان شاملان، كشرط المحاسبة. */
async function expenseRows(branchId: number | undefined, start: string, end: string) {
  return db.select({
    id: expenses.id, amount: expenses.amount, date: expenses.expenseDate, category: expenses.category, section: expenses.section,
    subcategory: expenses.subcategory, description: expenses.description, notes: expenses.notes, vendor: expenses.vendor,
    createdAt: expenses.createdAt, branchId: expenses.branchId, branchName: branches.name,
  }).from(expenses)
    .innerJoin(branches, eq(branches.id, expenses.branchId))
    .where(and(branchId ? eq(expenses.branchId, branchId) : sql`TRUE`,
      sql`${expenses.expenseDate} >= ${start}`, sql`${expenses.expenseDate} <= ${end}`))
    .orderBy(expenses.expenseDate, expenses.id);
}

function amountOf(json: string | null): number | null {
  if (!json) return null;
  try { const v = JSON.parse(json); return typeof v?.amount === "number" ? v.amount : (v?.amount != null && !isNaN(Number(v.amount)) ? Number(v.amount) : null); }
  catch { return null; }
}

const MONEY_ENTITIES = ["payment", "expense", "cash_book_entry", "cash_book_opening", "invoice", "dr_box_expense", "dr_box_opening"];
const ENTITY_LABELS: Record<string, string> = {
  payment: "دفعة", expense: "مصروف", cash_book_entry: "سطر في دفتر القاصة", cash_book_opening: "رصيد افتتاحي للدفتر",
  invoice: "فاتورة", dr_box_expense: "مصروف من قاصة الدكتور", dr_box_opening: "رصيد افتتاحي لقاصة الدكتور",
};
const ACTION_LABELS: Record<string, string> = { update: "تعديل", delete: "حذف" };

/**
 * **الجردُ والتدقيقُ لفترة** — تقريرٌ واحد بكلّ ما يحتاجه المدقّق، وكلُّ رقمٍ فيه محسوب.
 */
export async function financialAudit(params: { branchId: number | undefined; start: string; end: string; includeDrBox: boolean }) {
  const { branchId, start, end } = params;
  const s = await storage.getAccountingSummary(branchId, start, end);
  const [pays, exps] = await Promise.all([paymentRows(branchId, start, end), expenseRows(branchId, start, end)]);
  const scopeBranches = await db.select({ id: branches.id, name: branches.name }).from(branches)
    .where(branchId ? eq(branches.id, branchId) : sql`TRUE`).orderBy(branches.id);

  // ── الوارد ──
  const payTotal = pays.reduce((t, p) => t + p.amount, 0);
  const byDept = new Map<string, { amount: number; count: number }>();
  for (const p of pays) {
    const k = departmentLabel(p.caseType);
    const v = byDept.get(k) ?? { amount: 0, count: 0 };
    v.amount += p.amount; v.count += 1; byDept.set(k, v);
  }
  const payByDay = new Map<string, number>();
  for (const p of pays) { const d = baghdadDay(p.date)!; payByDay.set(d, (payByDay.get(d) ?? 0) + p.amount); }
  const cashIn = {
    total: s.totalPaid, count: pays.length,
    byDepartment: Array.from(byDept.entries()).map(([label, v]) => ({ label, amount: v.amount, count: v.count, sharePct: pct(v.amount, payTotal) }))
      .sort(byAmountThenLabel),
    unclassified: { count: pays.filter((p) => !p.caseType).length, amount: pays.filter((p) => !p.caseType).reduce((t, p) => t + p.amount, 0) },
    freeSessionRows: pays.filter((p) => p.isFree).length,
    zeroOrNegative: pays.filter((p) => p.amount <= 0).map((p) => ({ date: baghdadDay(p.date), patientCode: p.code, amount: p.amount, branch: p.branchName })).slice(0, TOP),
    busiestDays: Array.from(payByDay.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([date, amount]) => ({ date, amount })),
    largest: [...pays].sort((a, b) => b.amount - a.amount).slice(0, TOP).map((p) => ({
      date: baghdadDay(p.date), patientCode: p.code, patientName: p.name, amount: p.amount, department: departmentLabel(p.caseType),
      branch: p.branchName, note: p.notes?.trim()?.slice(0, 80) || null,
    })),
  };

  // ── المصاريف ──
  const expTotal = exps.reduce((t, e) => t + e.amount, 0);
  const byCat = new Map<string, { amount: number; count: number }>();
  for (const e of exps) {
    const k = catLabel(e.category);
    const v = byCat.get(k) ?? { amount: 0, count: 0 };
    v.amount += e.amount; v.count += 1; byCat.set(k, v);
  }
  const dupKey = (e: typeof exps[number]) => `${e.branchId}|${e.date}|${e.category}|${e.amount}`;
  const dupGroups = new Map<string, typeof exps>();
  for (const e of exps) dupGroups.set(dupKey(e), [...(dupGroups.get(dupKey(e)) ?? []), e]);
  const duplicates = Array.from(dupGroups.values()).filter((g) => g.length > 1).map((g) => ({
    date: String(g[0].date), category: catLabel(g[0].category), amount: g[0].amount, times: g.length,
    branch: g[0].branchName, descriptions: g.map((e) => e.description?.trim() || "—").slice(0, 4),
  }));
  const bare = exps.filter((e) => !e.description?.trim() && !e.notes?.trim() && !e.subcategory?.trim() && !e.vendor?.trim());
  //  **مصروفٌ مكتوبٌ بعد يومه بأكثر من ثلاثة أيام** — قيدٌ متأخّر يستحقّ السؤال عن سببه.
  const late = exps.map((e) => ({ e, lagDays: e.createdAt ? Math.floor((Date.parse(`${baghdadDay(e.createdAt)}T00:00:00Z`) - Date.parse(`${e.date}T00:00:00Z`)) / DAY_MS) : 0 }))
    .filter((x) => x.lagDays > 3);
  const expenseDetail = {
    total: s.totalExpenses, count: exps.length,
    byCategory: Array.from(byCat.entries()).map(([label, v]) => ({ label, amount: v.amount, count: v.count, sharePct: pct(v.amount, expTotal) }))
      .sort(byAmountThenLabel),
    bySection: [
      { label: sectionLabel("prosthetic"), amount: s.expensesBySection.devices },
      { label: sectionLabel("physio"), amount: s.expensesBySection.physio },
      { label: sectionLabel(null), amount: s.expensesBySection.shared },
    ],
    largest: [...exps].sort((a, b) => b.amount - a.amount).slice(0, TOP).map((e) => ({
      date: String(e.date), category: catLabel(e.category), amount: e.amount, branch: e.branchName,
      description: [e.subcategory, e.description, e.vendor].map((x) => x?.trim()).filter(Boolean).join(" — ").slice(0, 80) || null,
    })),
    duplicates: duplicates.slice(0, TOP), duplicateGroups: duplicates.length,
    withoutDescription: { count: bare.length, amount: bare.reduce((t, e) => t + e.amount, 0),
      sample: bare.slice(0, 5).map((e) => ({ date: String(e.date), category: catLabel(e.category), amount: e.amount, branch: e.branchName })) },
    enteredLate: { count: late.length, amount: late.reduce((t, x) => t + x.e.amount, 0),
      sample: late.sort((a, b) => b.lagDays - a.lagDays).slice(0, 5).map((x) => ({
        expenseDate: String(x.e.date), enteredOn: baghdadDay(x.e.createdAt), lagDays: x.lagDays,
        category: catLabel(x.e.category), amount: x.e.amount, branch: x.e.branchName })) },
  };

  // ── دفاترُ القاصة ──
  const books: any[] = [];
  for (const b of scopeBranches) {
    for (const book of branchCashConfig(b.name).books) {
      const p = await cashBookPeriod(b.id, book, start, end);
      if (!p) continue;
      books.push({ ...p, bookLabel: CASH_BOOK_LABELS[book as CashBook] });
    }
  }
  const drawings = await ownerDrawingsForPeriod(branchId, start, end);

  // ── الديون ──
  const balances = await storage.getPatientBranchBalances(branchId);
  const debtors = balances.filter((x) => x.cost - x.paid > 0).sort((a, b) => (b.cost - b.paid) - (a.cost - a.paid));
  const creditors = balances.filter((x) => x.paid - x.cost > 0).sort((a, b) => (b.paid - b.cost) - (a.paid - a.cost));
  const ids = [...debtors.slice(0, TOP), ...creditors.slice(0, 5)].map((x) => x.patientId);
  const who = ids.length
    ? await db.select({ id: patients.id, code: patients.patientCode, name: patients.name }).from(patients).where(inArray(patients.id, ids))
    : [];
  const nameOf = (id: number) => who.find((w) => w.id === id);
  const debts = {
    totalOutstanding: s.totalRemaining, debtorsCount: debtors.length, collectionRatePct: s.collectionRate,
    topDebtors: debtors.slice(0, TOP).map((x) => ({ patientCode: nameOf(x.patientId)?.code ?? null, patientName: nameOf(x.patientId)?.name ?? null,
      due: x.cost - x.paid, lastPaymentDate: baghdadDay(x.lastPaymentDate as any) })),
    credits: { total: s.totalCredits, count: creditors.length,
      top: creditors.slice(0, 5).map((x) => ({ patientCode: nameOf(x.patientId)?.code ?? null, patientName: nameOf(x.patientId)?.name ?? null, credit: x.paid - x.cost })) },
  };

  // ── أثرُ التعديل والحذف على المال ──
  const { start: ts, endExclusive: te } = baghdadDayBounds(start, end);
  const entities = params.includeDrBox ? MONEY_ENTITIES : MONEY_ENTITIES.filter((e) => !e.startsWith("dr_box"));
  const trail = await db.select({
    entityType: auditLog.entityType, entityId: auditLog.entityId, action: auditLog.action, userName: auditLog.userName,
    oldValues: auditLog.oldValues, newValues: auditLog.newValues, createdAt: auditLog.createdAt, branchName: branches.name,
  }).from(auditLog).leftJoin(branches, eq(branches.id, auditLog.branchId))
    .where(and(inArray(auditLog.action, ["update", "delete"]), inArray(auditLog.entityType, entities),
      gte(auditLog.createdAt, ts!), lt(auditLog.createdAt, te!), branchId ? eq(auditLog.branchId, branchId) : sql`TRUE`))
    .orderBy(desc(auditLog.createdAt)).limit(1000);
  const trailGroups = new Map<string, { entity: string; action: string; user: string; count: number }>();
  for (const t of trail) {
    const k = `${t.entityType}|${t.action}|${t.userName ?? "—"}`;
    const g = trailGroups.get(k) ?? { entity: ENTITY_LABELS[t.entityType] ?? t.entityType, action: ACTION_LABELS[t.action] ?? t.action, user: t.userName ?? "غير معروف", count: 0 };
    g.count += 1; trailGroups.set(k, g);
  }
  const changes = {
    count: trail.length,
    deletions: trail.filter((t) => t.action === "delete").length,
    byUser: Array.from(trailGroups.values()).sort((a, b) => b.count - a.count).slice(0, 15),
    latest: trail.slice(0, TOP).map((t) => ({
      at: t.createdAt ? new Date(new Date(t.createdAt).getTime() + BAGHDAD_MS).toISOString().slice(0, 16).replace("T", " ") : null,
      entity: ENTITY_LABELS[t.entityType] ?? t.entityType, action: ACTION_LABELS[t.action] ?? t.action, user: t.userName ?? "غير معروف",
      branch: t.branchName, amountBefore: amountOf(t.oldValues), amountAfter: t.action === "delete" ? null : amountOf(t.newValues),
    })),
  };

  // ── تنبيهاتُ كاشف الشذوذ في الفترة ──
  const anomaliesAll = (await detectAnomalies(branchId)).filter((a) => a.date >= start && a.date <= end);
  const anomalies = {
    count: anomaliesAll.length,
    high: anomaliesAll.filter((a) => a.severity === "high").length,
    items: anomaliesAll.slice(0, TOP).map((a) => ({ severity: a.severity, title: a.title, description: a.description, date: a.date, amount: a.amount ?? null, branch: a.branchName ?? null })),
  };

  // ── المطابقات — تُحكم هنا ──
  const checks: AuditCheck[] = [];
  const money = (n: number) => n.toLocaleString("en-US");
  checks.push(payTotal === s.totalPaid
    ? { code: "cash_in_lines", label: "مجموعُ سطور الدفعات = الوارد في المحاسبة", status: "ok", detail: `${money(payTotal)} د.ع من ${pays.length} دفعة` }
    : { code: "cash_in_lines", label: "مجموعُ سطور الدفعات = الوارد في المحاسبة", status: "fail", detail: `السطور ${money(payTotal)} والمحاسبة ${money(s.totalPaid)} — فرقٌ ${money(payTotal - s.totalPaid)}` });
  checks.push(expTotal === s.totalExpenses
    ? { code: "expense_lines", label: "مجموعُ سطور المصاريف = المصاريف في المحاسبة", status: "ok", detail: `${money(expTotal)} د.ع من ${exps.length} مصروف` }
    : { code: "expense_lines", label: "مجموعُ سطور المصاريف = المصاريف في المحاسبة", status: "fail", detail: `السطور ${money(expTotal)} والمحاسبة ${money(s.totalExpenses)}` });
  checks.push(s.netProfit === s.totalPaid - s.totalExpenses
    ? { code: "net", label: "الصافي = الوارد − المصاريف", status: "ok", detail: `${money(s.netProfit)} د.ع` }
    : { code: "net", label: "الصافي = الوارد − المصاريف", status: "fail", detail: `الصافي ${money(s.netProfit)} والفرق ${money(s.totalPaid - s.totalExpenses)}` });
  for (const b of scopeBranches) {
    const own = books.filter((x) => x.branchId === b.id);
    if (!own.length) continue;
    const label = `دفتر القاصة يطابق المحاسبة — ${b.name}`;
    if (own.some((x) => !x.started || x.coveredFrom !== start)) {
      const first = own.filter((x) => x.started).map((x) => x.opening.date).sort()[0];
      checks.push({ code: "book_vs_accounting", label, status: "warn",
        detail: first ? `الدفتر يبدأ ${first} بعد بداية الفترة — المطابقةُ ممكنةٌ من يوم افتتاحه` : "الدفتر لم يُفتح بعد (لا رصيد افتتاحي)" });
      continue;
    }
    const bookPays = own.reduce((t, x) => t + x.period.income - x.period.otherIncome, 0);
    const bookExp = own.reduce((t, x) => t + x.period.expenses, 0);
    const accPays = pays.filter((p) => p.branchId === b.id).reduce((t, p) => t + p.amount, 0);
    const accExp = exps.filter((e) => e.branchId === b.id).reduce((t, e) => t + e.amount, 0);
    checks.push(bookPays === accPays && bookExp === accExp
      ? { code: "book_vs_accounting", label, status: "ok", detail: `دفعات ${money(bookPays)} · مصاريف ${money(bookExp)}` }
      : { code: "book_vs_accounting", label, status: "fail", detail: `الدفتر: دفعات ${money(bookPays)} ومصاريف ${money(bookExp)} · المحاسبة: ${money(accPays)} و${money(accExp)}` });
  }
  for (const x of books.filter((x) => x.started)) {
    const where = `${x.branchName} — ${x.bookLabel}`;
    checks.push(x.negativeDays.length
      ? { code: "book_negative", label: `متبقّي القاصة لم ينزل تحت الصفر — ${where}`, status: "fail",
          detail: `${x.negativeDays.length} يوماً، أدناها ${x.lowest.date} بـ ${money(x.lowest.remaining)} — صادرٌ أكثر من الموجود: وارد لم يُسجَّل أو مصروف زائد` }
      : { code: "book_negative", label: `متبقّي القاصة لم ينزل تحت الصفر — ${where}`, status: "ok", detail: `أدنى متبقٍّ ${money(x.lowest?.remaining ?? x.endRemaining)}` });
    if (x.hospitalRatioPct) {
      checks.push(x.hospitalMismatches.length
        ? { code: "hospital_ratio", label: `نسبة المستشفى المسجَّلة = ${x.hospitalRatioPct}٪ من وارد كلّ يوم — ${where}`, status: "warn",
            detail: `${x.hospitalMismatches.length} يوماً لا تطابق` }
        : { code: "hospital_ratio", label: `نسبة المستشفى المسجَّلة = ${x.hospitalRatioPct}٪ من وارد كلّ يوم — ${where}`, status: "ok", detail: "كلُّ الأيام مطابقة" });
    }
  }
  checks.push(duplicates.length
    ? { code: "expense_duplicates", label: "لا مصاريف مكرّرة (اليوم والباب والمبلغ نفسُها)", status: "warn", detail: `${duplicates.length} مجموعة` }
    : { code: "expense_duplicates", label: "لا مصاريف مكرّرة (اليوم والباب والمبلغ نفسُها)", status: "ok", detail: "لا تكرار" });
  checks.push(bare.length
    ? { code: "expense_bare", label: "كلُّ مصروفٍ له وصف", status: "warn", detail: `${bare.length} مصروفاً بلا وصف بمجموع ${money(expenseDetail.withoutDescription.amount)}` }
    : { code: "expense_bare", label: "كلُّ مصروفٍ له وصف", status: "ok", detail: "كلُّها موصوفة" });
  checks.push(late.length
    ? { code: "expense_late", label: "المصاريفُ تُكتب في يومها (لا بعده بأكثر من ثلاثة أيام)", status: "warn", detail: `${late.length} مصروفاً كُتب متأخّراً` }
    : { code: "expense_late", label: "المصاريفُ تُكتب في يومها (لا بعده بأكثر من ثلاثة أيام)", status: "ok", detail: "لا تأخير" });
  checks.push(changes.deletions
    ? { code: "money_deletions", label: "حذفُ قيودٍ مالية في الفترة", status: "warn", detail: `${changes.deletions} حذفاً — راجع مَن حذف وما المبلغ` }
    : { code: "money_deletions", label: "حذفُ قيودٍ مالية في الفترة", status: "ok", detail: "لا حذف" });
  if (cashIn.unclassified.count) {
    checks.push({ code: "payments_unclassified", label: "كلُّ دفعةٍ منسوبةٌ إلى قسم", status: "warn",
      detail: `${cashIn.unclassified.count} دفعة بلا قسم بمجموع ${money(cashIn.unclassified.amount)}` });
  }

  const drBox = params.includeDrBox ? (await ownerSummary(start, end, todayInBaghdad())) : null;

  return {
    scope: { branch: branchId ? (scopeBranches[0]?.name ?? null) : "كل الفروع", start, end,
      days: Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS) + 1 },
    totals: {
      cashIn: s.totalPaid, expenses: s.totalExpenses, net: s.netProfit, salesValue: s.totalRevenue,
      reductions: s.reductions.total, ownerDrawings: drawings.total, netAfterOwnerDrawings: s.netProfit - drawings.total,
    },
    ownerDrawings: drawings.byBranch.map((b) => ({ branch: b.name, pct: b.pct, amount: b.amount })),
    cashIn, expenses: expenseDetail,
    cashBooks: books.map((x) => x.started ? {
      branch: x.branchName, book: x.bookLabel, openingDate: x.opening.date, coveredFrom: x.coveredFrom,
      startRemaining: x.startRemaining, endRemaining: x.endRemaining, income: x.period.income, otherIncome: x.period.otherIncome,
      expenses: x.period.expenses, drTransfers: x.period.drTransfers, drRatio: x.period.drRatio,
      ratioBalanceStart: x.startRatioBalance, ratioBalanceEnd: x.endRatioBalance, ratioReceived: x.period.ratioReceived,
      negativeDays: x.negativeDays.slice(0, TOP), hospitalMismatches: x.hospitalMismatches.slice(0, TOP),
    } : { branch: x.branchName, book: x.bookLabel, started: false, openingDate: x.openingDate ?? null }),
    debts, changes, anomalies, checks,
    summary: { ok: checks.filter((c) => c.status === "ok").length, warn: checks.filter((c) => c.status === "warn").length, fail: checks.filter((c) => c.status === "fail").length },
    drBox,
  };
}

// ══ كشفُ الحركات — «اجرد لي …» ═══════════════════════════════════════════════════════════

export type LedgerKind = "payments" | "expenses" | "cash_book_entries" | "changes";
export const LEDGER_KINDS: LedgerKind[] = ["payments", "expenses", "cash_book_entries", "changes"];

const ENTRY_KIND_LABELS: Record<string, string> = {
  income_other: "وارد آخر", dr_transfer: "تحويل إلى قاصة الدكتور", ratio_received: "استلام نسبة الدكتور", dr_ratio: "نسبة الدكتور (قديم)",
};

/**
 * **كشفٌ بالسطور ومجموعُه محسوبٌ على كلّ ما طابق** — لا على المعروض وحده: `matchedCount` و`matchedTotal` لكلّ الصفوف
 * المطابقة، و`rows` أوّلُ `limit` منها. فسؤالُ «كم صرفنا على الوقود في أيلول» يُجاب من `matchedTotal` لا بجمع النموذج.
 */
export async function financialLedger(params: {
  branchId: number | undefined; start: string; end: string; kind: LedgerKind;
  department?: string | null; category?: string | null; text?: string | null; minAmount?: number | null; limit: number;
}) {
  const { branchId, start, end, kind, limit } = params;
  const needle = params.text?.trim().toLowerCase() || null;
  const min = typeof params.minAmount === "number" ? params.minAmount : null;
  let rows: Record<string, unknown>[] = [];
  let amounts: number[] = [];

  if (kind === "payments") {
    let list = await paymentRows(branchId, start, end);
    if (params.department) list = list.filter((p) => matches(departmentLabel(p.caseType), p.caseType, params.department!));
    if (min != null) list = list.filter((p) => p.amount >= min);
    if (needle) list = list.filter((p) => [p.name, p.code, p.notes].some((x) => x?.toLowerCase().includes(needle)));
    amounts = list.map((p) => p.amount);
    rows = list.map((p) => ({ date: baghdadDay(p.date), patientCode: p.code, patientName: p.name, amount: p.amount,
      department: departmentLabel(p.caseType), branch: p.branchName, note: p.notes?.trim()?.slice(0, 80) || null }));
  } else if (kind === "expenses") {
    let list = await expenseRows(branchId, start, end);
    if (params.category) list = list.filter((e) => matches(catLabel(e.category), e.category, params.category!));
    if (params.department) list = list.filter((e) => matches(sectionLabel(e.section), e.section, params.department!));
    if (min != null) list = list.filter((e) => e.amount >= min);
    if (needle) list = list.filter((e) => [e.description, e.notes, e.subcategory, e.vendor].some((x) => x?.toLowerCase().includes(needle)));
    amounts = list.map((e) => e.amount);
    rows = list.map((e) => ({ date: String(e.date), category: catLabel(e.category), section: sectionLabel(e.section), amount: e.amount,
      branch: e.branchName, description: [e.subcategory, e.description, e.vendor, e.notes].map((x) => x?.trim()).filter(Boolean).join(" — ").slice(0, 100) || null }));
  } else if (kind === "cash_book_entries") {
    let list = await db.select({ day: cashBookEntries.entryDate, book: cashBookEntries.book, kind: cashBookEntries.kind, amount: cashBookEntries.amount,
      note: cashBookEntries.note, branchName: branches.name }).from(cashBookEntries)
      .innerJoin(branches, eq(branches.id, cashBookEntries.branchId))
      .where(and(branchId ? eq(cashBookEntries.branchId, branchId) : sql`TRUE`, sql`${cashBookEntries.deletedAt} IS NULL`,
        sql`${cashBookEntries.entryDate} >= ${start}`, sql`${cashBookEntries.entryDate} <= ${end}`, sql`${cashBookEntries.kind} <> 'dr_ratio'`))
      .orderBy(cashBookEntries.entryDate, cashBookEntries.id);
    if (params.category) list = list.filter((e) => matches(ENTRY_KIND_LABELS[e.kind] ?? e.kind, e.kind, params.category!));
    if (min != null) list = list.filter((e) => e.amount >= min);
    if (needle) list = list.filter((e) => e.note?.toLowerCase().includes(needle));
    amounts = list.map((e) => e.amount);
    rows = list.map((e) => ({ date: String(e.day), book: CASH_BOOK_LABELS[e.book as CashBook] ?? e.book, kind: ENTRY_KIND_LABELS[e.kind] ?? e.kind,
      amount: e.amount, branch: e.branchName, note: e.note?.trim()?.slice(0, 80) || null }));
  } else {
    const { start: ts, endExclusive: te } = baghdadDayBounds(start, end);
    const list = await db.select({ entityType: auditLog.entityType, action: auditLog.action, userName: auditLog.userName,
      oldValues: auditLog.oldValues, newValues: auditLog.newValues, createdAt: auditLog.createdAt, branchName: branches.name })
      .from(auditLog).leftJoin(branches, eq(branches.id, auditLog.branchId))
      .where(and(inArray(auditLog.action, ["update", "delete"]), inArray(auditLog.entityType, MONEY_ENTITIES.filter((e) => !e.startsWith("dr_box"))),
        gte(auditLog.createdAt, ts!), lt(auditLog.createdAt, te!), branchId ? eq(auditLog.branchId, branchId) : sql`TRUE`))
      .orderBy(desc(auditLog.createdAt)).limit(2000);
    const filtered = list.filter((t) => !needle || (t.userName ?? "").toLowerCase().includes(needle));
    amounts = filtered.map((t) => amountOf(t.oldValues) ?? 0);
    rows = filtered.map((t) => ({
      at: t.createdAt ? new Date(new Date(t.createdAt).getTime() + BAGHDAD_MS).toISOString().slice(0, 16).replace("T", " ") : null,
      entity: ENTITY_LABELS[t.entityType] ?? t.entityType, action: ACTION_LABELS[t.action] ?? t.action, user: t.userName ?? "غير معروف",
      branch: t.branchName, amountBefore: amountOf(t.oldValues), amountAfter: t.action === "delete" ? null : amountOf(t.newValues),
    }));
  }

  return {
    kind, scope: { start, end },
    matchedCount: rows.length,
    matchedTotal: amounts.reduce((t, n) => t + n, 0),
    shown: Math.min(limit, rows.length),
    truncated: rows.length > limit,
    rows: rows.slice(0, limit),
  };
}
