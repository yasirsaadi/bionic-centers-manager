// Anomaly detection — rule-based detector with optional AI explanation.
//
// Scans recent financial records for suspicious patterns and returns a
// unified list of anomalies sorted by severity. Runs purely against the
// database (no LLM call) so it's cheap and fast — the AI layer kicks in
// only when the user explicitly asks for an explanation of a specific
// anomaly via /api/ai/explain-anomaly.

import { db } from "../db";
import { expenses, invoices, patients, payments, visits, branches } from "@shared/schema";
import { and, eq, gte, lte, sql, desc } from "drizzle-orm";

export type AnomalySeverity = "high" | "medium" | "low";

export interface Anomaly {
  // Stable ID so the UI can dismiss / track / link to the source.
  id: string;
  // Type of anomaly — drives icon and explanation in the UI.
  type:
    | "expense_amount_outlier"
    | "expense_duplicate"
    | "invoice_overdue"
    | "patient_no_payment";
  severity: AnomalySeverity;
  // Short Arabic title for the list.
  title: string;
  // One-line Arabic description of why it was flagged.
  description: string;
  // Date relevant to the anomaly (when it happened / when it was created).
  date: string;
  // Branch this anomaly belongs to.
  branchId: number;
  branchName?: string;
  // Reference to the source record so the UI can deep-link.
  source: {
    type: "expense" | "invoice" | "patient";
    id: number;
    name?: string;
  };
  // Numeric amount when relevant (e.g. expense outlier value).
  amount?: number;
  // Extra context the AI explainer can use.
  context?: Record<string, unknown>;
}

/**
 * Runs all detection rules and returns a flat, severity-sorted list.
 * Optionally restricted to a single branch.
 */
export async function detectAnomalies(branchId?: number): Promise<Anomaly[]> {
  const [outliers, duplicates, overdue, noPayments] = await Promise.all([
    detectExpenseAmountOutliers(branchId),
    detectDuplicateExpenses(branchId),
    detectOverdueInvoices(branchId),
    detectPatientsWithoutPayments(branchId),
  ]);

  const branchList = await db.select().from(branches);
  const nameByBranch = new Map(branchList.map((b) => [b.id, b.name]));

  const all = [...outliers, ...duplicates, ...overdue, ...noPayments];
  const severityOrder: Record<AnomalySeverity, number> = { high: 0, medium: 1, low: 2 };

  return all
    .map((a) => ({ ...a, branchName: nameByBranch.get(a.branchId) }))
    .sort((a, b) => {
      const s = severityOrder[a.severity] - severityOrder[b.severity];
      if (s !== 0) return s;
      // Newer first within the same severity bucket.
      return b.date.localeCompare(a.date);
    });
}

// ------------------------- Rule 1: amount outliers -------------------------
//
// For each expense in the last 60 days, compare its amount against the
// median amount of the same category in the same branch over the same
// window. Flag if the expense is more than 5x the median (and the median
// itself is non-trivial, ≥ 50,000 IQD, to avoid noise from tiny categories).
async function detectExpenseAmountOutliers(branchId?: number): Promise<Anomaly[]> {
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const conditions = [gte(expenses.expenseDate, sixtyDaysAgo)];
  if (branchId) conditions.push(eq(expenses.branchId, branchId));

  const recent = await db
    .select()
    .from(expenses)
    .where(and(...conditions));

  // Group by branch + category to compute medians.
  const groups = new Map<string, number[]>();
  for (const e of recent) {
    const key = `${e.branchId}|${e.category}`;
    const arr = groups.get(key) ?? [];
    arr.push(e.amount);
    groups.set(key, arr);
  }
  const medians = new Map<string, number>();
  for (const [key, amounts] of groups) {
    const sorted = [...amounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    medians.set(key, median);
  }

  const anomalies: Anomaly[] = [];
  for (const e of recent) {
    const key = `${e.branchId}|${e.category}`;
    const median = medians.get(key) ?? 0;
    const grpSize = groups.get(key)?.length ?? 0;
    if (median < 50000 || grpSize < 4) continue; // not enough signal
    if (e.amount > median * 5) {
      anomalies.push({
        id: `expense-outlier-${e.id}`,
        type: "expense_amount_outlier",
        severity: e.amount > median * 10 ? "high" : "medium",
        title: "مصروف بمبلغ غير معتاد",
        description: `مصروف ${categoryArabicLabel(e.category)} بمبلغ يفوق متوسّط هذه الفئة بكثير في الفرع.`,
        date: e.expenseDate,
        branchId: e.branchId,
        source: { type: "expense", id: e.id },
        amount: e.amount,
        context: { category: e.category, median, ratio: e.amount / median, description: e.description },
      });
    }
  }
  return anomalies;
}

// --------------------- Rule 2: same-day duplicate expenses ---------------------
//
// Two or more expenses with the same branch, category, and amount on the
// same day are very likely the same expense entered twice by mistake.
async function detectDuplicateExpenses(branchId?: number): Promise<Anomaly[]> {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const conditions = [gte(expenses.expenseDate, ninetyDaysAgo)];
  if (branchId) conditions.push(eq(expenses.branchId, branchId));

  const rows = await db
    .select()
    .from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate));

  // Bucket by (date | branch | category | amount). Any bucket with ≥ 2
  // rows is a duplicate group.
  const buckets = new Map<string, typeof rows>();
  for (const e of rows) {
    const key = `${e.expenseDate}|${e.branchId}|${e.category}|${e.amount}`;
    const arr = buckets.get(key) ?? [];
    arr.push(e);
    buckets.set(key, arr);
  }

  const anomalies: Anomaly[] = [];
  for (const [, group] of buckets) {
    if (group.length < 2) continue;
    // Surface the group as a single anomaly anchored on the first record.
    const first = group[0];
    anomalies.push({
      id: `expense-duplicate-${group.map((g) => g.id).join("-")}`,
      type: "expense_duplicate",
      severity: "high",
      title: `${group.length} مصاريف مكرَّرة في نفس اليوم`,
      description: `${group.length} مصاريف من فئة ${categoryArabicLabel(first.category)} بنفس المبلغ في تاريخ واحد — تحقّق من عدم الإدخال المكرَّر.`,
      date: first.expenseDate,
      branchId: first.branchId,
      source: { type: "expense", id: first.id },
      amount: first.amount,
      context: { count: group.length, ids: group.map((g) => g.id) },
    });
  }
  return anomalies;
}

// ------------------ Rule 3: invoice overdue without payment ------------------
//
// Invoice with status pending/partial older than 30 days from issue date.
async function detectOverdueInvoices(branchId?: number): Promise<Anomaly[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
  const conditions = [
    sql`${invoices.status} IN ('pending', 'partial')`,
    sql`${invoices.invoiceDate} < ${thirtyDaysAgo}`,
  ];
  if (branchId) conditions.push(eq(invoices.branchId, branchId));

  const overdue = await db
    .select()
    .from(invoices)
    .where(and(...conditions))
    .orderBy(invoices.invoiceDate);

  return overdue.map((inv) => {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(inv.invoiceDate).getTime()) / (24 * 60 * 60 * 1000)
    );
    const remaining = inv.total - (inv.paidAmount ?? 0);
    return {
      id: `invoice-overdue-${inv.id}`,
      type: "invoice_overdue" as const,
      severity: daysOverdue > 90 ? "high" : daysOverdue > 60 ? "medium" : "low",
      title: `فاتورة معلَّقة منذ ${daysOverdue} يوماً`,
      description: `فاتورة ${inv.invoiceNumber} لم تُسدَّد بالكامل، المتبقّي ${formatAmount(remaining)} د.ع.`,
      date: inv.invoiceDate,
      branchId: inv.branchId,
      source: { type: "invoice" as const, id: inv.id, name: inv.invoiceNumber },
      amount: remaining,
      context: { daysOverdue, status: inv.status, patientId: inv.patientId },
    };
  });
}

// ----------------- Rule 4: patient with visits but zero payments -----------------
//
// A patient registered ≥ 14 days ago, with visits, but totalPaid = 0
// likely indicates a missing payment record.
async function detectPatientsWithoutPayments(branchId?: number): Promise<Anomaly[]> {
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const conditions = [
    sql`${patients.totalCost} > 0`,
    sql`${patients.createdAt} < ${fourteenDaysAgo}`,
  ];
  if (branchId) conditions.push(eq(patients.branchId, branchId));

  const candidates = await db
    .select()
    .from(patients)
    .where(and(...conditions));

  const anomalies: Anomaly[] = [];
  for (const p of candidates) {
    const [{ paid } = { paid: 0 }] = await db
      .select({ paid: sql<number>`COALESCE(SUM(${payments.amount}), 0)::int` })
      .from(payments)
      .where(eq(payments.patientId, p.id));
    if (Number(paid) > 0) continue;
    const visitCount = await db
      .select({ c: sql<number>`COUNT(*)::int` })
      .from(visits)
      .where(eq(visits.patientId, p.id));
    if ((visitCount[0]?.c ?? 0) === 0) continue;
    anomalies.push({
      id: `patient-no-payment-${p.id}`,
      type: "patient_no_payment",
      severity: "medium",
      title: "مريض لديه زيارات بدون دفعات",
      description: `${p.name} مسجَّل منذ مدّة ولديه زيارات، لكن لم تُسجَّل أي دفعة. تحقّق من سجل الدفعات.`,
      date: (p.createdAt instanceof Date ? p.createdAt.toISOString() : String(p.createdAt)).split("T")[0],
      branchId: p.branchId,
      source: { type: "patient", id: p.id, name: p.name },
      amount: p.totalCost ?? 0,
      context: { totalCost: p.totalCost, visitCount: visitCount[0]?.c ?? 0 },
    });
  }
  return anomalies;
}

// --------------------------------- helpers ---------------------------------

function categoryArabicLabel(category: string): string {
  const labels: Record<string, string> = {
    salaries: "رواتب",
    rent: "إيجارات",
    medical_supplies: "مستلزمات طبية",
    maintenance: "صيانة",
    utilities: "كهرباء ومياه",
    communications: "اتصالات",
    marketing: "تسويق",
    transport: "نقل",
    hospitality: "ضيافة",
    stationery: "قرطاسية",
    bank_fees: "رسوم بنكية",
    other: "أخرى",
  };
  return labels[category] || category;
}

function formatAmount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
