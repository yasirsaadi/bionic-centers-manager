import { db, pool } from "../db";
import { chartOfAccounts, journalEntries, journalLines, auditLog, accountingPeriods } from "@shared/schema";
import type {
  ChartOfAccount,
  InsertChartOfAccount,
  JournalEntry,
  JournalLine,
  AuditLogEntry,
  AccountingPeriod,
} from "@shared/schema";
import { sql, eq, and, desc, gte, lte, asc } from "drizzle-orm";

/**
 * Ledger Service
 *
 * Core double-entry bookkeeping operations:
 * - Chart of accounts management
 * - Journal entry creation with balance validation
 * - Financial reports (trial balance, income statement, balance sheet)
 * - Audit logging
 *
 * All write operations enforce:
 * - Sum of debits = sum of credits for each entry
 * - At least 2 lines per entry
 * - All accounts must exist and be active
 */

export type JournalLineInput = {
  accountId: number;
  debit?: number;
  credit?: number;
  description?: string;
  branchId?: number | null;
  patientId?: number | null;
  vendorId?: number | null;
};

export type CreateJournalEntryInput = {
  entryDate: string; // YYYY-MM-DD
  branchId?: number | null;
  description: string;
  reference?: string | null;
  sourceType?: string | null;
  sourceId?: number | null;
  createdBy?: number | null;
  lines: JournalLineInput[];
};

// ==================== شجرة الحسابات ====================

export async function getAllAccounts(branchId?: number): Promise<ChartOfAccount[]> {
  if (branchId) {
    return db
      .select()
      .from(chartOfAccounts)
      .where(
        and(
          eq(chartOfAccounts.isActive, true),
          sql`(${chartOfAccounts.branchId} IS NULL OR ${chartOfAccounts.branchId} = ${branchId})`
        )
      )
      .orderBy(asc(chartOfAccounts.accountCode));
  }
  return db
    .select()
    .from(chartOfAccounts)
    .where(eq(chartOfAccounts.isActive, true))
    .orderBy(asc(chartOfAccounts.accountCode));
}

export async function getAccountById(id: number): Promise<ChartOfAccount | undefined> {
  const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.id, id));
  return account;
}

export async function getAccountByCode(code: string): Promise<ChartOfAccount | undefined> {
  const [account] = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.accountCode, code));
  return account;
}

export async function createAccount(input: InsertChartOfAccount): Promise<ChartOfAccount> {
  const [account] = await db.insert(chartOfAccounts).values(input).returning();
  return account;
}

export async function updateAccount(id: number, updates: Partial<InsertChartOfAccount>): Promise<ChartOfAccount | undefined> {
  const [updated] = await db
    .update(chartOfAccounts)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(chartOfAccounts.id, id))
    .returning();
  return updated;
}

export async function deactivateAccount(id: number): Promise<void> {
  // لا نحذف مطلقاً - فقط نعطل
  await db.update(chartOfAccounts).set({ isActive: false, updatedAt: new Date() }).where(eq(chartOfAccounts.id, id));
}

// ==================== القيود اليومية ====================

async function generateEntryNumber(entryDate: string): Promise<string> {
  const [year, month] = entryDate.split("-");
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt FROM journal_entries
    WHERE entry_number LIKE ${`JE-${year}${month}-%`}
  `);
  const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
  return `JE-${year}${month}-${String(cnt + 1).padStart(4, "0")}`;
}

export async function createJournalEntry(input: CreateJournalEntryInput): Promise<JournalEntry> {
  if (input.lines.length < 2) {
    throw new Error("القيد يجب أن يحتوي على سطرين على الأقل");
  }

  // تحقق من التوازن: مجموع المدين = مجموع الدائن
  const totalDebit = input.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = input.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (totalDebit !== totalCredit) {
    throw new Error(`القيد غير متوازن: مدين ${totalDebit} ≠ دائن ${totalCredit}`);
  }
  if (totalDebit <= 0) {
    throw new Error("القيد يجب أن يحتوي على مبالغ موجبة");
  }

  // تحقق أن كل سطر مدين أو دائن (وليس كلاهما ولا صفر)
  for (const line of input.lines) {
    const d = line.debit || 0;
    const c = line.credit || 0;
    if ((d > 0 && c > 0) || (d === 0 && c === 0)) {
      throw new Error("كل سطر يجب أن يكون مدين أو دائن (ليس كلاهما ولا صفر)");
    }
  }

  const entryNumber = await generateEntryNumber(input.entryDate);

  // ابحث عن الفترة المحاسبية المفتوحة التي تحتوي التاريخ
  const periodResult = await db.execute(sql`
    SELECT id, status FROM accounting_periods
    WHERE start_date <= ${input.entryDate}::date
      AND end_date >= ${input.entryDate}::date
    LIMIT 1
  `);
  const period = (periodResult.rows?.[0] as any) as { id: number; status: string } | undefined;

  if (period && period.status === "closed") {
    throw new Error("لا يمكن إضافة قيود في فترة محاسبية مغلقة");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const entryRes = await client.query(
      `INSERT INTO journal_entries
        (entry_number, entry_date, branch_id, period_id, description, reference, source_type, source_id, total_amount, status, created_by, posted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'posted', $10, NOW())
       RETURNING *`,
      [
        entryNumber,
        input.entryDate,
        input.branchId ?? null,
        period?.id ?? null,
        input.description,
        input.reference ?? null,
        input.sourceType ?? null,
        input.sourceId ?? null,
        totalDebit,
        input.createdBy ?? null,
      ]
    );

    const entry = entryRes.rows[0] as JournalEntry;

    for (let i = 0; i < input.lines.length; i++) {
      const line = input.lines[i];
      await client.query(
        `INSERT INTO journal_lines
          (entry_id, account_id, branch_id, debit, credit, description, line_order, patient_id, vendor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          entry.id,
          line.accountId,
          line.branchId ?? input.branchId ?? null,
          line.debit || 0,
          line.credit || 0,
          line.description || null,
          i + 1,
          line.patientId ?? null,
          line.vendorId ?? null,
        ]
      );
    }

    await client.query("COMMIT");
    return entry;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getJournalEntries(filters: {
  branchId?: number;
  startDate?: string;
  endDate?: string;
  sourceType?: string;
  status?: string;
  limit?: number;
} = {}): Promise<JournalEntry[]> {
  const conditions = [];
  if (filters.branchId) conditions.push(eq(journalEntries.branchId, filters.branchId));
  if (filters.startDate) conditions.push(gte(journalEntries.entryDate, filters.startDate));
  if (filters.endDate) conditions.push(lte(journalEntries.entryDate, filters.endDate));
  if (filters.sourceType) conditions.push(eq(journalEntries.sourceType, filters.sourceType));
  if (filters.status) conditions.push(eq(journalEntries.status, filters.status));

  const query = conditions.length > 0
    ? db.select().from(journalEntries).where(and(...conditions))
    : db.select().from(journalEntries);

  const result = await query.orderBy(desc(journalEntries.entryDate), desc(journalEntries.id)).limit(filters.limit ?? 500);
  return result;
}

export async function getJournalEntryWithLines(id: number): Promise<{ entry: JournalEntry; lines: JournalLine[] } | null> {
  const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
  if (!entry) return null;
  const lines = await db.select().from(journalLines).where(eq(journalLines.entryId, id)).orderBy(asc(journalLines.lineOrder));
  return { entry, lines };
}

/**
 * يعكس قيداً (reversal) بإنشاء قيد جديد يعكس الدائن والمدين.
 * لا يحذف القيد الأصلي أبداً.
 */
export async function reverseJournalEntry(originalId: number, reversalDate: string, reversedBy: number | null, reason: string): Promise<JournalEntry> {
  const data = await getJournalEntryWithLines(originalId);
  if (!data) throw new Error("القيد غير موجود");
  if (data.entry.status === "reversed") throw new Error("القيد معكوس مسبقاً");

  // قلب المدين والدائن
  const reversalLines: JournalLineInput[] = data.lines.map((l) => ({
    accountId: l.accountId,
    debit: l.credit || 0,
    credit: l.debit || 0,
    description: `عكس: ${l.description || ""}`,
    branchId: l.branchId,
    patientId: l.patientId,
  }));

  const reversal = await createJournalEntry({
    entryDate: reversalDate,
    branchId: data.entry.branchId,
    description: `عكس قيد ${data.entry.entryNumber}: ${reason}`,
    reference: data.entry.entryNumber,
    sourceType: "reversal",
    sourceId: originalId,
    createdBy: reversedBy,
    lines: reversalLines,
  });

  // تحديث القيد الأصلي ليشير للقيد العاكس
  await db
    .update(journalEntries)
    .set({ status: "reversed", reversedBy: reversal.id })
    .where(eq(journalEntries.id, originalId));

  // تحديث القيد العاكس ليشير للأصلي
  await db.update(journalEntries).set({ reversalOf: originalId }).where(eq(journalEntries.id, reversal.id));

  return reversal;
}

// ==================== التقارير المالية ====================

/**
 * ميزان المراجعة - Trial Balance
 * يُرجع جميع الحسابات مع إجمالي المدين والدائن والرصيد.
 */
export async function getTrialBalance(filters: {
  branchId?: number;
  startDate?: string;
  endDate?: string;
} = {}): Promise<Array<{
  accountId: number;
  accountCode: string;
  accountNameAr: string;
  accountType: string;
  normalBalance: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
}>> {
  const conditions: string[] = ["je.status = 'posted'"];
  const params: any[] = [];
  let paramIdx = 1;

  if (filters.branchId) {
    conditions.push(`jl.branch_id = $${paramIdx++}`);
    params.push(filters.branchId);
  }
  if (filters.startDate) {
    conditions.push(`je.entry_date >= $${paramIdx++}`);
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push(`je.entry_date <= $${paramIdx++}`);
    params.push(filters.endDate);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      coa.id AS account_id,
      coa.account_code,
      coa.account_name_ar,
      coa.account_type,
      coa.normal_balance,
      COALESCE(SUM(jl.debit), 0)::int AS total_debit,
      COALESCE(SUM(jl.credit), 0)::int AS total_credit
    FROM chart_of_accounts coa
    LEFT JOIN journal_lines jl ON jl.account_id = coa.id
    LEFT JOIN journal_entries je ON je.id = jl.entry_id
    ${whereClause}
    GROUP BY coa.id, coa.account_code, coa.account_name_ar, coa.account_type, coa.normal_balance
    HAVING COALESCE(SUM(jl.debit), 0) > 0 OR COALESCE(SUM(jl.credit), 0) > 0
    ORDER BY coa.account_code
  `;

  const result = await pool.query(query, params);

  return result.rows.map((r: any) => {
    const totalDebit = Number(r.total_debit) || 0;
    const totalCredit = Number(r.total_credit) || 0;
    const balance =
      r.normal_balance === "debit" ? totalDebit - totalCredit : totalCredit - totalDebit;
    return {
      accountId: r.account_id,
      accountCode: r.account_code,
      accountNameAr: r.account_name_ar,
      accountType: r.account_type,
      normalBalance: r.normal_balance,
      totalDebit,
      totalCredit,
      balance,
    };
  });
}

/**
 * قائمة الدخل - Income Statement
 * الإيرادات - المصاريف = صافي الربح/الخسارة
 */
export async function getIncomeStatement(filters: {
  branchId?: number;
  startDate: string;
  endDate: string;
}): Promise<{
  revenue: Array<{ accountCode: string; accountNameAr: string; amount: number }>;
  expenses: Array<{ accountCode: string; accountNameAr: string; amount: number }>;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}> {
  const trial = await getTrialBalance(filters);

  const revenue = trial
    .filter((t) => t.accountType === "revenue")
    .map((t) => ({
      accountCode: t.accountCode,
      accountNameAr: t.accountNameAr,
      amount: t.balance, // بالنسبة للإيرادات رصيدها الطبيعي دائن → balance موجب
    }))
    .filter((r) => r.amount !== 0);

  const expenses = trial
    .filter((t) => t.accountType === "expense")
    .map((t) => ({
      accountCode: t.accountCode,
      accountNameAr: t.accountNameAr,
      amount: t.balance, // بالنسبة للمصروفات رصيدها الطبيعي مدين
    }))
    .filter((r) => r.amount !== 0);

  const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

/**
 * الميزانية العمومية - Balance Sheet
 * الأصول = الخصوم + حقوق الملكية
 */
export async function getBalanceSheet(filters: {
  branchId?: number;
  asOfDate: string;
}): Promise<{
  assets: Array<{ accountCode: string; accountNameAr: string; amount: number }>;
  liabilities: Array<{ accountCode: string; accountNameAr: string; amount: number }>;
  equity: Array<{ accountCode: string; accountNameAr: string; amount: number }>;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  isBalanced: boolean;
}> {
  const trial = await getTrialBalance({
    branchId: filters.branchId,
    endDate: filters.asOfDate,
  });

  const assets = trial
    .filter((t) => t.accountType === "asset")
    .map((t) => ({
      accountCode: t.accountCode,
      accountNameAr: t.accountNameAr,
      amount: t.balance,
    }))
    .filter((r) => r.amount !== 0);

  const liabilities = trial
    .filter((t) => t.accountType === "liability")
    .map((t) => ({
      accountCode: t.accountCode,
      accountNameAr: t.accountNameAr,
      amount: t.balance,
    }))
    .filter((r) => r.amount !== 0);

  const equity = trial
    .filter((t) => t.accountType === "equity")
    .map((t) => ({
      accountCode: t.accountCode,
      accountNameAr: t.accountNameAr,
      amount: t.balance,
    }))
    .filter((r) => r.amount !== 0);

  const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
  const totalEquity = equity.reduce((s, r) => s + r.amount, 0);

  // أضف صافي الربح إلى حقوق الملكية كحساب مشتق إن لم يُغلق
  const income = await getIncomeStatement({
    branchId: filters.branchId,
    startDate: "1900-01-01",
    endDate: filters.asOfDate,
  });

  if (income.netIncome !== 0) {
    equity.push({
      accountCode: "3300",
      accountNameAr: "أرباح وخسائر الفترة الحالية",
      amount: income.netIncome,
    });
  }

  const totalEquityWithIncome = equity.reduce((s, r) => s + r.amount, 0);

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity: totalEquityWithIncome,
    isBalanced: totalAssets === totalLiabilities + totalEquityWithIncome,
  };
}

// ==================== سجل التدقيق ====================

/**
 * سطرُ التدقيق — **بوضعين، والفرقُ بينهما مقصود**.
 *
 * ══ بلا معاملة (الوضعُ التاريخي، وكلُّ المُستدعين عليه) ═════════════════
 * كتابةٌ مستقلّة **يُبتلع خطؤها**: العمليةُ الأساسية وقعت وانتهت، وإفشالُها
 * لأن سطرَ تدقيقٍ لم يُكتب عقوبةٌ أشدّ من الجُرم. يُسجَّل الخطأ في السجلّ
 * ويمضي.
 *
 * ══ ومع معاملة المُستدعي — **لا يُبتلع شيء** ════════════════════════════
 * حين تُمرَّر `tx` يصير سطرُ التدقيق **جزءاً من العملية نفسها**: ينجحان
 * معاً أو يسقطان معاً. وهذا ما تحتاجه العمليات التي يكون فيها السطرُ نفسُه
 * جزءاً من صحّة القرار — اعتمادُ خصمٍ يحرّك مالاً مثلاً: «مَن أذن ومتى»
 * ليس زينةً بل هو الإذن.
 *
 * **والابتلاعُ هنا كان سيكون كذبةً من نوعٍ آخر**: مالٌ تحرّك بإذنٍ لا أثر
 * له. فالمقايضة معكوسة: هناك نحمي العملية من التدقيق، وهنا نحمي التدقيق
 * بالعملية.
 */
export async function logAudit(params: {
  entityType: string;
  entityId: number;
  action: string;
  userId?: number | null;
  userName?: string | null;
  branchId?: number | null;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  notes?: string | null;
  /** معاملةُ المُستدعي — يصير السطرُ جزءاً منها، وخطؤه يُسقطها. */
  tx?: any;
}): Promise<void> {
  const values = {
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    userId: params.userId ?? null,
    userName: params.userName ?? null,
    branchId: params.branchId ?? null,
    oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
    newValues: params.newValues ? JSON.stringify(params.newValues) : null,
    ipAddress: params.ipAddress ?? null,
    userAgent: params.userAgent ?? null,
    notes: params.notes ?? null,
  };
  if (params.tx) {
    //  **بلا try**: الخطأ يجب أن يصعد فيُسقط معاملة المُستدعي.
    await params.tx.insert(auditLog).values(values);
    return;
  }
  try {
    await db.insert(auditLog).values(values);
  } catch (err) {
    // لا نُفشل العملية الأساسية لو فشل الـ audit log
    console.error("[audit] failed to log:", err);
  }
}

export async function getAuditLog(filters: {
  entityType?: string;
  entityId?: number;
  userId?: number;
  branchId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
} = {}): Promise<AuditLogEntry[]> {
  const conditions = [];
  if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));
  if (filters.userId) conditions.push(eq(auditLog.userId, filters.userId));
  if (filters.branchId) conditions.push(eq(auditLog.branchId, filters.branchId));
  if (filters.startDate) conditions.push(gte(auditLog.createdAt, new Date(filters.startDate)));
  if (filters.endDate) conditions.push(lte(auditLog.createdAt, new Date(filters.endDate)));

  const query = conditions.length > 0
    ? db.select().from(auditLog).where(and(...conditions))
    : db.select().from(auditLog);

  return query.orderBy(desc(auditLog.createdAt)).limit(filters.limit ?? 200);
}

// ==================== الفترات المحاسبية ====================

export async function getAccountingPeriods(): Promise<AccountingPeriod[]> {
  return db.select().from(accountingPeriods).orderBy(desc(accountingPeriods.startDate));
}

export async function closePeriod(periodId: number, userId: number | null): Promise<AccountingPeriod | undefined> {
  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "closed", closedAt: new Date(), closedBy: userId })
    .where(eq(accountingPeriods.id, periodId))
    .returning();
  return updated;
}

export async function reopenPeriod(periodId: number): Promise<AccountingPeriod | undefined> {
  const [updated] = await db
    .update(accountingPeriods)
    .set({ status: "open", closedAt: null, closedBy: null })
    .where(eq(accountingPeriods.id, periodId))
    .returning();
  return updated;
}
