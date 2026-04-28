// Smart accounting audit. Complements (does not duplicate) the
// real-time anomaly detector at server/anomalies/detector.ts.
//
// Difference in scope:
//   - anomalies/detector.ts: per-transaction rule checks, runs every
//     time the dashboard loads. Cheap and deterministic.
//   - ai/smart_audit.ts: periodic synthesis across the full accounting
//     picture for a window (default 30 days). Looks at distributions,
//     concentration risk, timing patterns, and asks Sonnet to surface
//     findings a rule-based detector would miss.
//
// Output: a structured list of findings (severity / title / description
// / suggested action) the manager can review one-at-a-time. Sonnet is
// asked to return JSON so the UI can render badges and group by
// severity.
//
// Cost target: ~$0.40-1.50/month at weekly cadence.

import { storage } from "../storage";
import { safeAiComplete, type AiResult } from "./provider";

export interface SmartAuditInput {
  branchId: number | null;
  branchName: string | null;
  windowDays: number; // default 30
}

export interface AuditFinding {
  severity: "low" | "medium" | "high";
  category: string; // e.g. "تركّز موردين", "نمط توقيت", "مصاريف غير معتادة"
  title: string;
  description: string;
  suggestedAction: string;
}

export interface SmartAuditOutput {
  findings: AuditFinding[];
  summary: string;
  generatedAt: string;
  snapshot: AuditSnapshot;
}

interface AuditSnapshot {
  branchId: number | null;
  branchName: string | null;
  windowDays: number;
  range: { start: string; end: string };
  daily: { date: string; revenue: number; expenses: number; net: number }[];
  expenses: {
    total: number;
    byCategory: { category: string; total: number; share: number }[];
  };
  invoices: {
    totalCount: number;
    paidShare: number; // 0–1
    avgInvoice: number;
    avgDiscountShare: number; // 0–1
  };
  receivables: {
    bucket0_30: number;
    bucket31_60: number;
    bucket61_plus: number;
    totalDue: number;
  };
  vendorConcentration: {
    topVendors: { name: string; spend: number; share: number }[];
    purchaseCount: number;
    totalPurchaseSpend: number;
  };
  paymentTiming: {
    earlyMorningCount: number; // before 07:00 local
    lateNightCount: number; // after 22:00 local
    weekendCount: number; // Friday/Saturday
    totalCount: number;
  };
}

const isoDate = (d: Date) => d.toISOString().split("T")[0];
const BAGHDAD_OFFSET_HOURS = 3;

async function buildAuditSnapshot(input: SmartAuditInput): Promise<AuditSnapshot> {
  const today = new Date();
  const windowDays = Math.max(7, Math.min(90, input.windowDays || 30));
  const start = new Date(today.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const startStr = isoDate(start);
  const endStr = isoDate(today);
  const branchId = input.branchId ?? undefined;

  const [
    payments,
    expensesByCat,
    allInvoices,
    purchases,
    vendors,
  ] = await Promise.all([
    storage.getAllPayments(branchId, startStr, endStr),
    storage.getExpensesByCategory(branchId, startStr, endStr),
    storage.getInvoices(branchId, undefined, undefined, startStr, endStr),
    storage.getPurchases(branchId, undefined, undefined, startStr, endStr),
    storage.getVendors(false),
  ]);

  // Daily totals — useful for spotting bumps.
  const dailyMap = new Map<string, { revenue: number; expenses: number }>();
  for (const p of payments) {
    const d = isoDate(new Date(p.date));
    const cur = dailyMap.get(d) ?? { revenue: 0, expenses: 0 };
    cur.revenue += p.amount;
    dailyMap.set(d, cur);
  }
  // We don't have per-day expense totals broken out by date here without
  // an extra DB call; rely on the category breakdown for distribution
  // signal and fold day-level expenses in by walking expense rows.
  const dailyExpenses = await storage.getExpenses(branchId, startStr, endStr);
  for (const e of dailyExpenses) {
    const d = e.expenseDate;
    const cur = dailyMap.get(d) ?? { revenue: 0, expenses: 0 };
    cur.expenses += e.amount;
    dailyMap.set(d, cur);
  }
  const daily = Array.from(dailyMap.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({ date, revenue: v.revenue, expenses: v.expenses, net: v.revenue - v.expenses }));

  // Expense category share.
  const expensesTotal = expensesByCat.reduce((s, x) => s + x.total, 0);
  const expensesByCategory = expensesByCat.map((c) => ({
    category: c.category,
    total: c.total,
    share: expensesTotal > 0 ? c.total / expensesTotal : 0,
  }));

  // Invoice averages + paid share + discount usage.
  const invoiceCount = allInvoices.length;
  const totalInvoiceAmount = allInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid = allInvoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
  const totalDiscount = allInvoices.reduce((s, i) => s + (i.discount || 0), 0);
  const totalSubtotal = allInvoices.reduce((s, i) => s + (i.subtotal || i.total), 0);
  const invoices = {
    totalCount: invoiceCount,
    paidShare: totalInvoiceAmount > 0 ? totalPaid / totalInvoiceAmount : 0,
    avgInvoice: invoiceCount > 0 ? totalInvoiceAmount / invoiceCount : 0,
    avgDiscountShare: totalSubtotal > 0 ? totalDiscount / totalSubtotal : 0,
  };

  // Receivables aging.
  const ageBuckets = { bucket0_30: 0, bucket31_60: 0, bucket61_plus: 0 };
  for (const inv of allInvoices) {
    const due = inv.total - (inv.paidAmount || 0);
    if (due <= 0) continue;
    const ageDays = Math.floor((today.getTime() - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000));
    if (ageDays <= 30) ageBuckets.bucket0_30 += due;
    else if (ageDays <= 60) ageBuckets.bucket31_60 += due;
    else ageBuckets.bucket61_plus += due;
  }
  const totalDue = ageBuckets.bucket0_30 + ageBuckets.bucket31_60 + ageBuckets.bucket61_plus;

  // Vendor concentration (top 5 + share of total purchase spend).
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const spendByVendor = new Map<number, number>();
  for (const p of purchases) {
    const cur = spendByVendor.get(p.vendorId) ?? 0;
    spendByVendor.set(p.vendorId, cur + p.totalAmount);
  }
  const totalPurchaseSpend = Array.from(spendByVendor.values()).reduce((s, x) => s + x, 0);
  const topVendors = Array.from(spendByVendor.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, spend]) => ({
      name: vendorById.get(id)?.name ?? `#${id}`,
      spend,
      share: totalPurchaseSpend > 0 ? spend / totalPurchaseSpend : 0,
    }));

  // Payment timing — convert UTC payment timestamp to Baghdad-local hour.
  const paymentTiming = {
    earlyMorningCount: 0,
    lateNightCount: 0,
    weekendCount: 0,
    totalCount: payments.length,
  };
  for (const p of payments) {
    const utc = new Date(p.date);
    const baghdadHour = (utc.getUTCHours() + BAGHDAD_OFFSET_HOURS) % 24;
    const baghdadDayOfWeek = (utc.getUTCDay() + (utc.getUTCHours() + BAGHDAD_OFFSET_HOURS >= 24 ? 1 : 0)) % 7;
    if (baghdadHour < 7) paymentTiming.earlyMorningCount += 1;
    if (baghdadHour >= 22) paymentTiming.lateNightCount += 1;
    // Friday=5, Saturday=6 in Iraqi week; JS getUTCDay 0=Sun..6=Sat.
    if (baghdadDayOfWeek === 5 || baghdadDayOfWeek === 6) paymentTiming.weekendCount += 1;
  }

  return {
    branchId: input.branchId,
    branchName: input.branchName,
    windowDays,
    range: { start: startStr, end: endStr },
    daily,
    expenses: { total: expensesTotal, byCategory: expensesByCategory },
    invoices,
    receivables: { ...ageBuckets, totalDue },
    vendorConcentration: {
      topVendors,
      purchaseCount: purchases.length,
      totalPurchaseSpend,
    },
    paymentTiming,
  };
}

const AUDIT_SYSTEM_PROMPT = `أنت مدقّق محاسبي عراقي محترف. تراجع بيانات فرع طبيّ وتُصدر قائمة مكتشفات (findings) لمراجعتها.

تركّز على:
1) تركّز موردين (مورد واحد > 60% من المشتريات).
2) ذمم متأخّرة (الفئة 61+ يوم > 30% من إجمالي المتبقّي).
3) مصاريف غير متوازنة (فئة واحدة > 50% بدون سبب واضح).
4) أنماط توقيت غريبة (دفعات قبل 07:00 أو بعد 22:00 بكثرة).
5) معدّل خصم مرتفع (avgDiscountShare > 15%).
6) أيام فيها صافي سلبي شديد.
7) متوسط فاتورة منخفض جداً أو نسبة تحصيل منخفضة (<60%).

أعد فقط JSON صالح بهذه البنية:
{
  "summary": "جملة أو جملتان عن الحالة العامّة",
  "findings": [
    {
      "severity": "low" | "medium" | "high",
      "category": "اسم قصير للفئة بالعربية",
      "title": "عنوان قصير ≤ 80 حرف",
      "description": "وصف الملاحظة في 1-3 جمل بالأرقام الفعلية",
      "suggestedAction": "إجراء عملي مقترح في جملة واحدة"
    }
  ]
}

قواعد صارمة:
- لا تخترع أرقاماً غير موجودة.
- لا تتجاوز 8 مكتشفات.
- إن لم تجد أيّ شيء جدير بالملاحظة، أعد findings فارغة وملخّصاً يقول "لا توجد ملاحظات".
- استخدم العربية الفصحى البسيطة.

تنسيق الإخراج (إلزامي):
- ابدأ ردّك بالحرف "{" مباشرة بدون أيّ مقدّمة.
- انتهِ بالحرف "}" بدون أيّ تعليق ختامي.
- لا تكتب "إليك" أو "بناءً على البيانات" أو أيّ نصّ خارج JSON.
- لا تستخدم \`\`\` ولا code blocks.
- يجب أن يكون JSON صالحاً لـ JSON.parse مباشرة.`;

export async function generateSmartAudit(
  input: SmartAuditInput
): Promise<AiResult<SmartAuditOutput>> {
  const snapshot = await buildAuditSnapshot(input);

  const userPrompt = `راجع البيانات التالية وأصدر التقرير:
\`\`\`json
${JSON.stringify(snapshot, null, 2)}
\`\`\``;

  const result = await safeAiComplete({
    system: AUDIT_SYSTEM_PROMPT,
    user: userPrompt,
    model: "sonnet",
    maxTokens: 1500,
  });

  if (!result.ok) return result;

  // Parse defensively. The model occasionally wraps JSON in code fences
  // or prefixes a sentence even after we tell it not to. Strategy:
  //   1. Strip code fences.
  //   2. Slice from the first `{` to the matching last `}`.
  //   3. Try JSON.parse on that substring.
  //   4. If it still fails, fall back to an empty findings list with a
  //      note in the summary so the UI doesn't blow up — the user sees
  //      "no findings" instead of a hard error.
  let parsed: { summary?: string; findings?: AuditFinding[] };
  const tryParse = (raw: string): typeof parsed | null => {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  };
  const cleaned = result.value.replace(/```json|```/g, "").trim();
  let parsedResult = tryParse(cleaned);
  if (!parsedResult) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      parsedResult = tryParse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }
  if (!parsedResult) {
    console.warn("[smart_audit] could not parse model output:", cleaned.slice(0, 200));
    parsed = {
      summary: "تعذّر استخراج ملاحظات منظّمة من النموذج هذه المرّة. حاول مرّة أخرى أو غيّر النطاق الزمني.",
      findings: [],
    };
  } else {
    parsed = parsedResult;
  }

  const findings: AuditFinding[] = Array.isArray(parsed.findings)
    ? parsed.findings
        .filter(
          (f: any) =>
            f &&
            typeof f.title === "string" &&
            typeof f.description === "string" &&
            typeof f.suggestedAction === "string"
        )
        .slice(0, 8)
        .map((f: any) => ({
          severity: f.severity === "high" ? "high" : f.severity === "low" ? "low" : "medium",
          category: String(f.category ?? "عام"),
          title: String(f.title).slice(0, 120),
          description: String(f.description).slice(0, 600),
          suggestedAction: String(f.suggestedAction).slice(0, 240),
        }))
    : [];

  return {
    ok: true,
    value: {
      findings,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      generatedAt: new Date().toISOString(),
      snapshot,
    },
  };
}

// Cache for 6 hours per (branch, windowDays) — audits don't need to
// re-run on every dashboard refresh. Invalidates implicitly via TTL.
interface CacheEntry {
  output: SmartAuditOutput;
  expiresAt: number;
}
const auditCache = new Map<string, CacheEntry>();
const TTL_MS = 6 * 60 * 60 * 1000;

export async function getOrGenerateSmartAudit(
  input: SmartAuditInput
): Promise<AiResult<SmartAuditOutput>> {
  const key = `${input.branchId ?? "all"}:${input.windowDays}`;
  const cached = auditCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return { ok: true, value: cached.output };
  }
  const result = await generateSmartAudit(input);
  if (result.ok) {
    if (auditCache.size >= 30) {
      const firstKey = auditCache.keys().next().value;
      if (firstKey) auditCache.delete(firstKey);
    }
    auditCache.set(key, { output: result.value, expiresAt: Date.now() + TTL_MS });
  }
  return result;
}
