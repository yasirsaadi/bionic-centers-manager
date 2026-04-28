// Monthly narrative report generator. Given a branch + month, builds a
// rich numerical snapshot from the live database and asks Sonnet to
// turn it into a polished Arabic narrative covering: financial
// summary, month-over-month change, top categories, observations,
// and recommendations.
//
// Why Sonnet (not Haiku): long-form narrative in classical Arabic is
// where the model-quality gap shows most. The cost per report
// (~$0.01-0.02) is irrelevant compared to the time saved drafting it
// manually.
//
// Caching: server-side LRU keyed by `${branchId|all}:${month}`.
// Reports for closed months don't change, so a single generation per
// month per branch is the steady-state cost.

import { storage } from "../storage";
import { safeAiComplete, type AiResult } from "./provider";

export interface MonthlyReportInput {
  branchId: number | null; // null = all branches (admin only)
  branchName: string | null;
  month: string; // "YYYY-MM"
}

export interface MonthlyReportSnapshot {
  branchId: number | null;
  branchName: string | null;
  month: string;
  monthRange: { start: string; end: string };
  prevMonthRange: { start: string; end: string };
  current: {
    revenue: { total: number; paymentCount: number };
    invoices: {
      totalInvoices: number;
      totalAmount: number;
      paidAmount: number;
      pendingAmount: number;
    };
    expenses: { total: number; byCategory: { category: string; total: number }[] };
    newPatients: number;
  };
  previous: {
    revenue: { total: number };
    expenses: { total: number };
    newPatients: number;
  };
  delta: {
    revenuePct: number | null;
    expensesPct: number | null;
    newPatientsPct: number | null;
    netPct: number | null;
  };
}

export interface MonthlyReportOutput {
  narrative: string;
  generatedAt: string;
  snapshot: MonthlyReportSnapshot;
}

function monthBounds(monthStr: string): { start: string; end: string } {
  // monthStr = "YYYY-MM". Returns inclusive [start, end] in YYYY-MM-DD.
  const [y, m] = monthStr.split("-").map(Number);
  if (!y || !m) throw new Error("month must be YYYY-MM");
  const start = new Date(Date.UTC(y, m - 1, 1));
  // Last day of month: day 0 of next month.
  const end = new Date(Date.UTC(y, m, 0));
  const iso = (d: Date) => d.toISOString().split("T")[0];
  return { start: iso(start), end: iso(end) };
}

function prevMonthBounds(monthStr: string): { start: string; end: string; monthStr: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const prevStr = `${prevY}-${String(prevM).padStart(2, "0")}`;
  return { ...monthBounds(prevStr), monthStr: prevStr };
}

function pct(curr: number, prev: number): number | null {
  if (prev === 0) return curr === 0 ? 0 : null; // can't compute % from zero
  return ((curr - prev) / prev) * 100;
}

export async function buildMonthlySnapshot(
  input: MonthlyReportInput
): Promise<MonthlyReportSnapshot> {
  const branchId = input.branchId ?? undefined;
  const curr = monthBounds(input.month);
  const prev = prevMonthBounds(input.month);

  const [
    invoiceStatsCurr,
    expensesCurrByCat,
    paymentsCurr,
    invoiceStatsPrev,
    expensesPrevByCat,
    paymentsPrev,
    allPatients,
  ] = await Promise.all([
    storage.getInvoiceStats(branchId, curr.start, curr.end),
    storage.getExpensesByCategory(branchId, curr.start, curr.end),
    storage.getAllPayments(branchId, curr.start, curr.end),
    storage.getInvoiceStats(branchId, prev.start, prev.end),
    storage.getExpensesByCategory(branchId, prev.start, prev.end),
    storage.getAllPayments(branchId, prev.start, prev.end),
    storage.getPatients(branchId),
  ]);

  const expensesCurrTotal = expensesCurrByCat.reduce((s, x) => s + x.total, 0);
  const expensesPrevTotal = expensesPrevByCat.reduce((s, x) => s + x.total, 0);
  const revenueCurr = paymentsCurr.reduce((s, p) => s + p.amount, 0);
  const revenuePrev = paymentsPrev.reduce((s, p) => s + p.amount, 0);

  const newCurr = allPatients.filter((p) => {
    if (!p.createdAt) return false;
    const d = p.createdAt.toString().split("T")[0];
    return d >= curr.start && d <= curr.end;
  }).length;
  const newPrev = allPatients.filter((p) => {
    if (!p.createdAt) return false;
    const d = p.createdAt.toString().split("T")[0];
    return d >= prev.start && d <= prev.end;
  }).length;

  const netCurr = revenueCurr - expensesCurrTotal;
  const netPrev = revenuePrev - expensesPrevTotal;

  return {
    branchId: input.branchId,
    branchName: input.branchName,
    month: input.month,
    monthRange: curr,
    prevMonthRange: prev,
    current: {
      revenue: { total: revenueCurr, paymentCount: paymentsCurr.length },
      invoices: invoiceStatsCurr,
      expenses: { total: expensesCurrTotal, byCategory: expensesCurrByCat },
      newPatients: newCurr,
    },
    previous: {
      revenue: { total: revenuePrev },
      expenses: { total: expensesPrevTotal },
      newPatients: newPrev,
    },
    delta: {
      revenuePct: pct(revenueCurr, revenuePrev),
      expensesPct: pct(expensesCurrTotal, expensesPrevTotal),
      newPatientsPct: pct(newCurr, newPrev),
      netPct: pct(netCurr, netPrev),
    },
  };
}

const REPORT_SYSTEM_PROMPT = `أنت محلّل مالي عراقي محترف. تكتب تقريراً سردياً شهرياً بالعربية الفصحى البسيطة عن أداء فرع طبيّ متخصّص في الأطراف الصناعية والعلاج الطبيعي.

قواعد الكتابة:
- استخدم نبرة مهنيّة هادئة، لا مبالغة ولا إطراء.
- الأرقام بالدينار العراقي مع فواصل آلاف.
- لا تخترع أرقاماً غير موجودة في البيانات.
- اذكر التغيّرات بوضوح: ارتفاع/انخفاض ونسبة مئوية.
- إن كانت بيانات الشهر السابق فارغة (null أو 0)، قل ذلك ولا تحسب نسبة.
- أنهِ بقسم "ملاحظات وتوصيات" يحوي 2-4 توصيات قصيرة عملية.

البنية المطلوبة (Markdown):
## ملخّص تنفيذي
فقرة قصيرة (3-4 جمل) عن الصورة العامة.

## الأداء المالي
- إجمالي الإيرادات
- إجمالي المصاريف
- صافي الربح/الخسارة
- مقارنة بالشهر الماضي

## الفواتير والذمم
- عدد الفواتير، المدفوع، المتبقي.

## أكبر بنود المصاريف
قائمة من 3-5 فئات.

## الحركة العامّة
- مرضى جُدد، عدد الدفعات.

## ملاحظات وتوصيات
- 2-4 نقاط عمليّة.

اجعل التقرير قراءته 1-2 دقيقة. لا تطل بدون ضرورة.`;

export async function generateMonthlyReport(
  input: MonthlyReportInput
): Promise<AiResult<MonthlyReportOutput>> {
  const snapshot = await buildMonthlySnapshot(input);
  const userPrompt = `اكتب التقرير الشهري للفرع التالي بناءً على هذه البيانات:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;

  const result = await safeAiComplete({
    system: REPORT_SYSTEM_PROMPT,
    user: userPrompt,
    model: "sonnet", // narrative quality matters here
    maxTokens: 1500,
  });

  if (!result.ok) return result;
  return {
    ok: true,
    value: {
      narrative: result.value,
      generatedAt: new Date().toISOString(),
      snapshot,
    },
  };
}

// Tiny in-memory cache. Reports for closed months don't change, so a
// single LLM call per (branch, month) tuple is enough. Capped at 50
// entries to bound memory; oldest evicted on overflow.
const reportCache = new Map<string, MonthlyReportOutput>();

export async function getOrGenerateMonthlyReport(
  input: MonthlyReportInput
): Promise<AiResult<MonthlyReportOutput>> {
  const key = `${input.branchId ?? "all"}:${input.month}`;
  const cached = reportCache.get(key);
  if (cached) return { ok: true, value: cached };

  const result = await generateMonthlyReport(input);
  if (result.ok) {
    if (reportCache.size >= 50) {
      const firstKey = reportCache.keys().next().value;
      if (firstKey) reportCache.delete(firstKey);
    }
    reportCache.set(key, result.value);
  }
  return result;
}
