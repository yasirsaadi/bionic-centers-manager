import { db, pool } from "../db";
import { payments, expenses, chartOfAccounts, journalEntries } from "@shared/schema";
import { sql, eq, and } from "drizzle-orm";

/**
 * Backfill Journal Entries
 *
 * Generates double-entry journal entries from existing payments and expenses
 * WITHOUT modifying or deleting the original records.
 *
 * Safety:
 * - Idempotent: uses source_type + source_id to detect already-backfilled records
 * - Never modifies the original payments/expenses rows
 * - Wrapped in transactions per entry (one failure doesn't stop the rest)
 * - Can be re-run safely
 *
 * Logic:
 * - Payment (مريض دفع) = Debit Cash, Credit Revenue
 *   - Cash account: per branch (e.g., 111101 for Baghdad cash)
 *   - Revenue account: based on paymentTreatmentType
 * - Expense = Debit Expense Account, Credit Cash
 *   - Expense account: based on category
 *   - Cash account: per branch
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

// خريطة أنواع العلاج → رموز حسابات الإيرادات
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

function expenseCategoryToAccountCode(category: string, subcategory?: string | null): string {
  const key = (category || "").trim();
  if (EXPENSE_CATEGORY_MAP[key]) return EXPENSE_CATEGORY_MAP[key];

  // محاولة تطابق جزئي
  for (const [k, v] of Object.entries(EXPENSE_CATEGORY_MAP)) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "5990"; // مصاريف أخرى كافتراضي
}

function revenueTypeToAccountCode(treatmentType: string | null | undefined): string {
  if (!treatmentType) return "4900"; // إيرادات أخرى
  const key = treatmentType.trim().toLowerCase();
  for (const [k, v] of Object.entries(REVENUE_TYPE_MAP)) {
    if (key.includes(k.toLowerCase()) || k.toLowerCase().includes(key)) return v;
  }
  return "4900";
}

// cache: branch_id → cash account id
const cashAccountCache = new Map<number, number>();

async function getCashAccountForBranch(branchId: number): Promise<number | null> {
  if (cashAccountCache.has(branchId)) return cashAccountCache.get(branchId)!;

  const result = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(
      and(
        eq(chartOfAccounts.branchId, branchId),
        eq(chartOfAccounts.accountType, "asset")
      )
    )
    .limit(1);

  if (result.length === 0) return null;
  cashAccountCache.set(branchId, result[0].id);
  return result[0].id;
}

async function getAccountByCode(code: string): Promise<number | null> {
  const result = await db
    .select({ id: chartOfAccounts.id })
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.accountCode, code))
    .limit(1);
  return result.length > 0 ? result[0].id : null;
}

async function entryNumber(date: Date, prefix = "JE"): Promise<string> {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM journal_entries
    WHERE entry_number LIKE ${`${prefix}-${year}${month}-%`}
  `);
  const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
  return `${prefix}-${year}${month}-${String(cnt + 1).padStart(4, "0")}`;
}

/**
 * ينشئ قيد للدفعة إن لم يكن موجوداً مسبقاً.
 * يفترض وجود خدمة دفع + تحريك إيرادات.
 */
async function backfillPayment(p: typeof payments.$inferSelect): Promise<boolean> {
  // تحقق من وجود قيد سابق للمصدر نفسه
  const existing = await db.execute(sql`
    SELECT id FROM journal_entries
    WHERE source_type = 'payment' AND source_id = ${p.id}
    LIMIT 1
  `);
  if ((existing.rows?.length ?? 0) > 0) return false;

  const cashAccountId = await getCashAccountForBranch(p.branchId);
  if (!cashAccountId) {
    console.warn(`[backfill] no cash account for branch ${p.branchId}, skipping payment ${p.id}`);
    return false;
  }

  const revenueCode = revenueTypeToAccountCode(p.paymentTreatmentType);
  const revenueAccountId = await getAccountByCode(revenueCode);
  if (!revenueAccountId) {
    console.warn(`[backfill] revenue account ${revenueCode} not found, skipping payment ${p.id}`);
    return false;
  }

  const paymentDate = p.date ?? new Date();
  const dateStr = paymentDate.toISOString().split("T")[0];
  const amount = p.amount ?? 0;
  if (amount <= 0) return false;

  const number = await entryNumber(paymentDate);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const entryRes = await client.query(
      `INSERT INTO journal_entries
        (entry_number, entry_date, branch_id, description, reference, source_type, source_id, total_amount, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, 'payment', $6, $7, 'posted', NOW())
       RETURNING id`,
      [
        number,
        dateStr,
        p.branchId,
        `دفعة مريض - ${p.paymentTreatmentType || "غير محدد"}`,
        p.notes || `payment#${p.id}`,
        p.id,
        amount,
      ]
    );
    const entryId = entryRes.rows[0].id;

    // مدين: الصندوق
    await client.query(
      `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, description, line_order, patient_id)
       VALUES ($1, $2, $3, $4, 0, $5, 1, $6)`,
      [entryId, cashAccountId, p.branchId, amount, "استلام دفعة نقدية من مريض", p.patientId]
    );

    // دائن: الإيراد
    await client.query(
      `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, description, line_order, patient_id)
       VALUES ($1, $2, $3, 0, $4, $5, 2, $6)`,
      [entryId, revenueAccountId, p.branchId, amount, `إيراد ${p.paymentTreatmentType || ""}`, p.patientId]
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[backfill] failed for payment ${p.id}:`, err);
    return false;
  } finally {
    client.release();
  }
}

async function backfillExpense(e: typeof expenses.$inferSelect): Promise<boolean> {
  const existing = await db.execute(sql`
    SELECT id FROM journal_entries
    WHERE source_type = 'expense' AND source_id = ${e.id}
    LIMIT 1
  `);
  if ((existing.rows?.length ?? 0) > 0) return false;

  const cashAccountId = await getCashAccountForBranch(e.branchId);
  if (!cashAccountId) {
    console.warn(`[backfill] no cash account for branch ${e.branchId}, skipping expense ${e.id}`);
    return false;
  }

  const expenseCode = expenseCategoryToAccountCode(e.category, e.subcategory);
  const expenseAccountId = await getAccountByCode(expenseCode);
  if (!expenseAccountId) {
    console.warn(`[backfill] expense account ${expenseCode} not found, skipping expense ${e.id}`);
    return false;
  }

  const dateStr = typeof e.expenseDate === "string" ? e.expenseDate : new Date().toISOString().split("T")[0];
  const amount = e.amount ?? 0;
  if (amount <= 0) return false;

  const expenseDate = new Date(dateStr);
  const number = await entryNumber(expenseDate);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const entryRes = await client.query(
      `INSERT INTO journal_entries
        (entry_number, entry_date, branch_id, description, reference, source_type, source_id, total_amount, status, posted_at)
       VALUES ($1, $2, $3, $4, $5, 'expense', $6, $7, 'posted', NOW())
       RETURNING id`,
      [
        number,
        dateStr,
        e.branchId,
        `مصروف - ${e.category}${e.description ? ` (${e.description.slice(0, 100)})` : ""}`,
        e.invoiceNumber || `expense#${e.id}`,
        e.id,
        amount,
      ]
    );
    const entryId = entryRes.rows[0].id;

    // مدين: حساب المصروف
    await client.query(
      `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, description, line_order)
       VALUES ($1, $2, $3, $4, 0, $5, 1)`,
      [entryId, expenseAccountId, e.branchId, amount, e.description || e.category]
    );

    // دائن: الصندوق
    await client.query(
      `INSERT INTO journal_lines (entry_id, account_id, branch_id, debit, credit, description, line_order)
       VALUES ($1, $2, $3, 0, $4, $5, 2)`,
      [entryId, cashAccountId, e.branchId, amount, `دفع مصروف ${e.category}`]
    );

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(`[backfill] failed for expense ${e.id}:`, err);
    return false;
  } finally {
    client.release();
  }
}

export async function backfillJournalEntries(): Promise<{
  paymentsProcessed: number;
  expensesProcessed: number;
  paymentsSkipped: number;
  expensesSkipped: number;
}> {
  cashAccountCache.clear();

  let paymentsProcessed = 0;
  let paymentsSkipped = 0;
  let expensesProcessed = 0;
  let expensesSkipped = 0;

  console.log("[backfill] starting journal backfill...");

  // المدفوعات
  const allPayments = await db.select().from(payments);
  console.log(`[backfill] found ${allPayments.length} payments to check`);
  for (const p of allPayments) {
    const ok = await backfillPayment(p);
    if (ok) paymentsProcessed++;
    else paymentsSkipped++;
  }

  // المصاريف
  const allExpenses = await db.select().from(expenses);
  console.log(`[backfill] found ${allExpenses.length} expenses to check`);
  for (const e of allExpenses) {
    const ok = await backfillExpense(e);
    if (ok) expensesProcessed++;
    else expensesSkipped++;
  }

  console.log(
    `[backfill] done. payments: ${paymentsProcessed} added, ${paymentsSkipped} skipped. expenses: ${expensesProcessed} added, ${expensesSkipped} skipped.`
  );

  return { paymentsProcessed, expensesProcessed, paymentsSkipped, expensesSkipped };
}
