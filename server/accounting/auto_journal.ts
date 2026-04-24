import { db } from "../db";
import { chartOfAccounts } from "@shared/schema";
import type { Payment, Expense } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { createJournalEntry, logAudit } from "./ledger";

/**
 * Auto Journal
 *
 * Automatically creates double-entry journal entries when:
 * - A payment is recorded (Debit Cash, Credit Revenue)
 * - An expense is recorded (Debit Expense Account, Credit Cash)
 *
 * These run AFTER the primary record is inserted, and failures here do not
 * roll back the primary record (legacy path must remain intact).
 */

// خريطة فئات المصاريف → رموز حسابات المصروفات
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  "رواتب": "5100",
  "إيجارات": "5200",
  "إيجار": "5200",
  "مستلزمات طبية": "5300",
  "مستلزمات": "5300",
  "صيانة": "5400",
  "كهرباء ومياه": "5500",
  "كهرباء": "5500",
  "ماء": "5500",
  "اتصالات": "5600",
  "إنترنت": "5600",
  "تسويق": "5700",
  "نقل": "5800",
  "مواصلات": "5800",
  "ضيافة": "5810",
  "قرطاسية": "5820",
  "رسوم بنكية": "5900",
  "أخرى": "5990",
};

const REVENUE_TYPE_MAP: Record<string, string> = {
  "علاج طبيعي": "4100",
  "physiotherapy": "4100",
  "طرف صناعي": "4200",
  "أطراف صناعية": "4200",
  "prosthetic": "4200",
  "مسند": "4300",
  "مساند طبية": "4300",
  "medical_support": "4300",
  "خدمات إضافية": "4400",
};

function expenseCategoryToAccountCode(category: string): string {
  const key = (category || "").trim();
  if (EXPENSE_CATEGORY_MAP[key]) return EXPENSE_CATEGORY_MAP[key];
  for (const [k, v] of Object.entries(EXPENSE_CATEGORY_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "5990";
}

function revenueTypeToAccountCode(treatmentType: string | null | undefined): string {
  if (!treatmentType) return "4900";
  const key = treatmentType.trim().toLowerCase();
  for (const [k, v] of Object.entries(REVENUE_TYPE_MAP)) {
    if (key.includes(k.toLowerCase()) || k.toLowerCase().includes(key)) return v;
  }
  return "4900";
}

async function getCashAccountForBranch(branchId: number): Promise<number | null> {
  const result = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.branchId, branchId),
        eq(chartOfAccounts.accountType, "asset"),
        sql`${chartOfAccounts.accountCode} LIKE '1111%'`
      )
    )
    .limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function getAccountIdByCode(code: string): Promise<number | null> {
  const [acc] = await db.select({ id: chartOfAccounts.id }).from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, code)).limit(1);
  return acc?.id ?? null;
}

function dateToISO(d: Date | string | null | undefined): string {
  if (!d) return new Date().toISOString().split("T")[0];
  if (typeof d === "string") return d.split("T")[0];
  return d.toISOString().split("T")[0];
}

/**
 * يُنشئ قيداً محاسبياً مقابل الدفعة.
 * Safe to fail — لن يؤثر على الدفعة الأصلية.
 */
export async function createJournalForPayment(
  payment: Payment,
  createdBy?: number | null
): Promise<void> {
  try {
    const amount = payment.amount ?? 0;
    if (amount <= 0) return;

    const cashAccountId = await getCashAccountForBranch(payment.branchId);
    if (!cashAccountId) {
      console.warn(`[auto-journal] no cash account for branch ${payment.branchId}, payment ${payment.id}`);
      return;
    }

    const revenueCode = revenueTypeToAccountCode(payment.paymentTreatmentType);
    const revenueAccountId = await getAccountIdByCode(revenueCode);
    if (!revenueAccountId) {
      console.warn(`[auto-journal] revenue account ${revenueCode} not found for payment ${payment.id}`);
      return;
    }

    await createJournalEntry({
      entryDate: dateToISO(payment.date),
      branchId: payment.branchId,
      description: `دفعة مريض - ${payment.paymentTreatmentType || "غير محدد"}`,
      reference: payment.notes || `payment#${payment.id}`,
      sourceType: "payment",
      sourceId: payment.id,
      createdBy: createdBy ?? null,
      lines: [
        {
          accountId: cashAccountId,
          debit: amount,
          description: "استلام دفعة نقدية من مريض",
          branchId: payment.branchId,
          patientId: payment.patientId,
        },
        {
          accountId: revenueAccountId,
          credit: amount,
          description: `إيراد ${payment.paymentTreatmentType || ""}`,
          branchId: payment.branchId,
          patientId: payment.patientId,
        },
      ],
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for payment ${payment.id}:`, err);
  }
}

export async function createJournalForExpense(expense: Expense, createdBy?: number | null): Promise<void> {
  try {
    const amount = expense.amount ?? 0;
    if (amount <= 0) return;

    const cashAccountId = await getCashAccountForBranch(expense.branchId);
    if (!cashAccountId) {
      console.warn(`[auto-journal] no cash account for branch ${expense.branchId}, expense ${expense.id}`);
      return;
    }

    const expenseCode = expenseCategoryToAccountCode(expense.category);
    const expenseAccountId = await getAccountIdByCode(expenseCode);
    if (!expenseAccountId) {
      console.warn(`[auto-journal] expense account ${expenseCode} not found for expense ${expense.id}`);
      return;
    }

    const dateStr = typeof expense.expenseDate === "string" ? expense.expenseDate : new Date().toISOString().split("T")[0];

    await createJournalEntry({
      entryDate: dateStr,
      branchId: expense.branchId,
      description: `مصروف - ${expense.category}${expense.description ? ` (${expense.description.slice(0, 100)})` : ""}`,
      reference: expense.invoiceNumber || `expense#${expense.id}`,
      sourceType: "expense",
      sourceId: expense.id,
      createdBy: createdBy ?? null,
      lines: [
        {
          accountId: expenseAccountId,
          debit: amount,
          description: expense.description || expense.category,
          branchId: expense.branchId,
        },
        {
          accountId: cashAccountId,
          credit: amount,
          description: `دفع مصروف ${expense.category}`,
          branchId: expense.branchId,
        },
      ],
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for expense ${expense.id}:`, err);
  }
}

/**
 * يعكس القيد المرتبط بالدفعة/المصروف عند حذفها.
 */
export async function reverseJournalForSource(
  sourceType: "payment" | "expense" | "invoice",
  sourceId: number,
  reversedBy: number | null,
  reason: string
): Promise<void> {
  try {
    const result = await db.execute(sql`
      SELECT id FROM journal_entries
      WHERE source_type = ${sourceType} AND source_id = ${sourceId} AND status = 'posted'
      LIMIT 1
    `);
    const row = result.rows?.[0] as any;
    if (!row) return;

    const { reverseJournalEntry } = await import("./ledger");
    await reverseJournalEntry(row.id, new Date().toISOString().split("T")[0], reversedBy, reason);
  } catch (err) {
    console.error(`[auto-journal] failed to reverse journal for ${sourceType} ${sourceId}:`, err);
  }
}

export { logAudit };
