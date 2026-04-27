import { db } from "../db";
import { chartOfAccounts } from "@shared/schema";
import type { Payment, Expense, Invoice, InvoiceItem, Purchase } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { createJournalEntry, logAudit } from "./ledger";
import type { JournalLineInput } from "./ledger";

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

// خريطة فئات المصاريف → رموز حسابات المصروفات.
// المفاتيح مُطبَّعة: حروف صغيرة، بدون تشكيل، همزات موحَّدة.
const EXPENSE_CATEGORY_MAP: Record<string, string> = {
  "رواتب": "5100",
  "راتب": "5100",
  "اجور": "5100",
  "اجر": "5100",
  "مرتبات": "5100",
  "مرتب": "5100",
  "salary": "5100",
  "salaries": "5100",
  "wages": "5100",
  "ايجارات": "5200",
  "ايجار": "5200",
  "كراء": "5200",
  "استئجار": "5200",
  "rent": "5200",
  "مستلزمات طبية": "5300",
  "مستلزمات": "5300",
  "ادوات طبية": "5300",
  "مواد طبية": "5300",
  "ادوية": "5300",
  "مستهلكات": "5300",
  "medical supplies": "5300",
  "supplies": "5300",
  "صيانة": "5400",
  "اصلاح": "5400",
  "تصليح": "5400",
  "maintenance": "5400",
  "repair": "5400",
  "كهرباء ومياه": "5500",
  "كهرباء": "5500",
  "ماء": "5500",
  "مياه": "5500",
  "فاتورة كهرباء": "5500",
  "فاتورة ماء": "5500",
  "utilities": "5500",
  "electricity": "5500",
  "water": "5500",
  "اتصالات": "5600",
  "انترنت": "5600",
  "هاتف": "5600",
  "تلفون": "5600",
  "موبايل": "5600",
  "internet": "5600",
  "phone": "5600",
  "تسويق": "5700",
  "اعلان": "5700",
  "اعلانات": "5700",
  "دعاية": "5700",
  "marketing": "5700",
  "advertising": "5700",
  "نقل": "5800",
  "مواصلات": "5800",
  "اجرة": "5800",
  "بنزين": "5800",
  "وقود": "5800",
  "transport": "5800",
  "fuel": "5800",
  "ضيافة": "5810",
  "طعام": "5810",
  "وجبات": "5810",
  "قهوة": "5810",
  "شاي": "5810",
  "meals": "5810",
  "hospitality": "5810",
  "قرطاسية": "5820",
  "ورق": "5820",
  "اقلام": "5820",
  "دفاتر": "5820",
  "stationery": "5820",
  "office supplies": "5820",
  "رسوم بنكية": "5900",
  "عمولة بنك": "5900",
  "bank fees": "5900",
  "اخرى": "5990",
  "متفرقات": "5990",
  "other": "5990",
  "misc": "5990",
};

// خريطة أنواع العلاج → رموز حسابات الإيرادات.
// المفاتيح مُطبَّعة: حروف صغيرة، بدون تشكيل، همزات موحَّدة.
const REVENUE_TYPE_MAP: Record<string, string> = {
  // علاج طبيعي → 4100
  "علاج طبيعي": "4100",
  "علاج فيزيائي": "4100",
  "فيزيائي": "4100",
  "تاهيل": "4100",
  "تاهيلي": "4100",
  "اعادة تاهيل": "4100",
  "علاج": "4100",
  "physiotherapy": "4100",
  "physical therapy": "4100",
  "physio": "4100",
  "pt": "4100",
  "rehab": "4100",
  // أطراف صناعية → 4200
  "طرف صناعي": "4200",
  "طرف اصطناعي": "4200",
  "اطراف صناعية": "4200",
  "اطراف اصطناعية": "4200",
  "طرف": "4200",
  "اطراف": "4200",
  "صناعي": "4200",
  "اصطناعي": "4200",
  "prosthetic": "4200",
  "prosthetics": "4200",
  "prosthesis": "4200",
  "prostheses": "4200",
  // مساند طبية → 4300
  "مسند": "4300",
  "مساند": "4300",
  "مسند طبي": "4300",
  "مساند طبية": "4300",
  "حزام طبي": "4300",
  "دعامة": "4300",
  "support": "4300",
  "supports": "4300",
  "medical support": "4300",
  "brace": "4300",
  // خدمات إضافية → 4400
  "خدمات اضافية": "4400",
  "خدمة اضافية": "4400",
  "اضافية": "4400",
  "اضافي": "4400",
  "additional": "4400",
  "extra": "4400",
};

/**
 * تطبيع النص العربي والإنجليزي لمقارنة مرنة:
 * - حروف صغيرة
 * - إزالة التشكيل
 * - توحيد الهمزات (أ/إ/آ → ا)
 * - توحيد التاء المربوطة (ة → ه) والألف المقصورة (ى → ي)
 * - تنظيف المسافات المتكرّرة
 */
function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .trim()
    .replace(/[ً-ٰٟ]/g, "") // تشكيل
    .replace(/[آأإ]/g, "ا") // آ/أ/إ → ا
    .replace(/ة/g, "ه") // ة → ه
    .replace(/ى/g, "ي") // ى → ي
    .replace(/\s+/g, " ");
}

function expenseCategoryToAccountCode(category: string): string {
  const key = normalizeText(category);
  if (!key) return "5990";
  if (EXPENSE_CATEGORY_MAP[key]) return EXPENSE_CATEGORY_MAP[key];
  // مطابقة جزئية: أطول المفاتيح أولاً لتجنّب مطابقات خاطئة
  const sorted = Object.entries(EXPENSE_CATEGORY_MAP).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [k, v] of sorted) {
    if (key.includes(k) || k.includes(key)) return v;
  }
  return "5990";
}

function revenueTypeToAccountCode(treatmentType: string | null | undefined): string {
  const key = normalizeText(treatmentType);
  if (!key) return "4900";
  if (REVENUE_TYPE_MAP[key]) return REVENUE_TYPE_MAP[key];
  // مطابقة جزئية: أطول المفاتيح أولاً لتجنّب مطابقات خاطئة
  const sorted = Object.entries(REVENUE_TYPE_MAP).sort(
    ([a], [b]) => b.length - a.length
  );
  for (const [k, v] of sorted) {
    if (key.includes(k) || k.includes(key)) return v;
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
 * يُنشئ قيداً محاسبياً عند إصدار فاتورة مريض (بيع آجل).
 * مدين: الذمم المدينة (1130) — إجمالي الفاتورة (المبلغ المستحق).
 * مدين: الخصومات الممنوحة (4990) — إن وُجد خصم (contra-revenue).
 * دائن: الإيرادات (4100/4200/4300/4400/4900) — موزّعة حسب نوع الخدمة.
 */
export async function createJournalForInvoice(
  invoice: Invoice,
  items: InvoiceItem[] | undefined,
  createdBy?: number | null
): Promise<void> {
  try {
    const total = invoice.total ?? 0;
    if (total <= 0) return;

    const arAccountId = await getAccountIdByCode("1130");
    if (!arAccountId) {
      console.warn(`[auto-journal] AR account 1130 not found for invoice ${invoice.id}`);
      return;
    }

    const discount = invoice.discount ?? 0;
    const subtotal = invoice.subtotal ?? total + discount;
    const lines: JournalLineInput[] = [];

    lines.push({
      accountId: arAccountId,
      debit: total,
      description: `ذمم مدينة - فاتورة ${invoice.invoiceNumber}`,
      branchId: invoice.branchId,
      patientId: invoice.patientId,
    });

    if (discount > 0) {
      const discountAccountId = await getAccountIdByCode("4990");
      if (discountAccountId) {
        lines.push({
          accountId: discountAccountId,
          debit: discount,
          description: `خصم ممنوح - فاتورة ${invoice.invoiceNumber}`,
          branchId: invoice.branchId,
          patientId: invoice.patientId,
        });
      }
    }

    // Group line items by service type → revenue account code
    let itemsSum = 0;
    if (items && items.length > 0) {
      const byCode = new Map<string, number>();
      for (const it of items) {
        const code = revenueTypeToAccountCode(it.serviceType ?? null);
        const amount = it.total ?? 0;
        if (amount <= 0) continue;
        byCode.set(code, (byCode.get(code) ?? 0) + amount);
        itemsSum += amount;
      }

      for (const [code, amount] of byCode) {
        const revenueAccountId = await getAccountIdByCode(code);
        if (!revenueAccountId) {
          console.warn(`[auto-journal] revenue account ${code} not found (invoice ${invoice.id})`);
          return;
        }
        lines.push({
          accountId: revenueAccountId,
          credit: amount,
          description: `إيراد - فاتورة ${invoice.invoiceNumber}`,
          branchId: invoice.branchId,
          patientId: invoice.patientId,
        });
      }
    }

    // If no items or items don't sum to subtotal, put remainder in default revenue (4900)
    const remainder = subtotal - itemsSum;
    if (remainder > 0) {
      const defaultRevenueId = await getAccountIdByCode("4900");
      if (!defaultRevenueId) {
        console.warn(`[auto-journal] default revenue 4900 not found (invoice ${invoice.id})`);
        return;
      }
      lines.push({
        accountId: defaultRevenueId,
        credit: remainder,
        description: `إيراد غير محدد - فاتورة ${invoice.invoiceNumber}`,
        branchId: invoice.branchId,
        patientId: invoice.patientId,
      });
    }

    // Sanity: entry must balance. Expected: Dr total + Dr discount == Cr subtotal.
    const totalDebit = lines.reduce((s, l) => s + (l.debit ?? 0), 0);
    const totalCredit = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (totalDebit !== totalCredit) {
      console.error(
        `[auto-journal] invoice ${invoice.id} unbalanced: Dr ${totalDebit} vs Cr ${totalCredit}. Skipping to prevent broken books.`
      );
      return;
    }

    await createJournalEntry({
      entryDate: dateToISO(invoice.invoiceDate),
      branchId: invoice.branchId,
      description: `فاتورة مريض ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      sourceType: "invoice",
      sourceId: invoice.id,
      createdBy: createdBy ?? null,
      lines,
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for invoice ${invoice.id}:`, err);
  }
}

/**
 * يُنشئ قيداً عند استلام دفعة على فاتورة سابقة.
 * مدين: الصندوق النقدي للفرع.
 * دائن: الذمم المدينة (1130).
 */
export async function createJournalForInvoicePayment(
  invoice: Invoice,
  paymentAmount: number,
  createdBy?: number | null
): Promise<void> {
  try {
    if (!paymentAmount || paymentAmount <= 0) return;

    const cashAccountId = await getCashAccountForBranch(invoice.branchId);
    if (!cashAccountId) {
      console.warn(`[auto-journal] no cash account for branch ${invoice.branchId} (invoice payment ${invoice.id})`);
      return;
    }

    const arAccountId = await getAccountIdByCode("1130");
    if (!arAccountId) {
      console.warn(`[auto-journal] AR account 1130 not found (invoice payment ${invoice.id})`);
      return;
    }

    await createJournalEntry({
      entryDate: new Date().toISOString().split("T")[0],
      branchId: invoice.branchId,
      description: `استلام دفعة على فاتورة ${invoice.invoiceNumber}`,
      reference: invoice.invoiceNumber,
      sourceType: "invoice_payment",
      sourceId: invoice.id,
      createdBy: createdBy ?? null,
      lines: [
        {
          accountId: cashAccountId,
          debit: paymentAmount,
          description: `دفعة نقدية على فاتورة ${invoice.invoiceNumber}`,
          branchId: invoice.branchId,
          patientId: invoice.patientId,
        },
        {
          accountId: arAccountId,
          credit: paymentAmount,
          description: `تسوية ذمم - فاتورة ${invoice.invoiceNumber}`,
          branchId: invoice.branchId,
          patientId: invoice.patientId,
        },
      ],
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for invoice payment ${invoice.id}:`, err);
  }
}

/**
 * يُنشئ قيداً عند تسجيل شراء من مورد.
 * - شراء آجل: مدين المصروف، دائن الذمم الدائنة (2110)
 * - شراء نقدي فوري: مدين المصروف، دائن الصندوق
 */
export async function createJournalForPurchase(
  purchase: Purchase,
  createdBy?: number | null
): Promise<void> {
  try {
    const amount = purchase.totalAmount ?? 0;
    if (amount <= 0) return;

    const expenseCode = expenseCategoryToAccountCode(purchase.category);
    const expenseAccountId = await getAccountIdByCode(expenseCode);
    if (!expenseAccountId) {
      console.warn(`[auto-journal] expense account ${expenseCode} not found (purchase ${purchase.id})`);
      return;
    }

    const isCredit = (purchase.paymentMethod ?? "credit") === "credit";

    let creditAccountId: number | null;
    let creditDescription: string;
    if (isCredit) {
      creditAccountId = await getAccountIdByCode("2110");
      creditDescription = `ذمم دائنة - مورد (شراء ${purchase.purchaseNumber})`;
      if (!creditAccountId) {
        console.warn(`[auto-journal] AP account 2110 not found (purchase ${purchase.id})`);
        return;
      }
    } else {
      creditAccountId = await getCashAccountForBranch(purchase.branchId);
      creditDescription = `دفع شراء نقدي ${purchase.purchaseNumber}`;
      if (!creditAccountId) {
        console.warn(`[auto-journal] no cash account for branch ${purchase.branchId} (purchase ${purchase.id})`);
        return;
      }
    }

    await createJournalEntry({
      entryDate: dateToISO(purchase.purchaseDate),
      branchId: purchase.branchId,
      description: `شراء من مورد - ${purchase.purchaseNumber}${purchase.description ? ` (${purchase.description.slice(0, 80)})` : ""}`,
      reference: purchase.vendorInvoiceNumber || purchase.purchaseNumber,
      sourceType: "purchase",
      sourceId: purchase.id,
      createdBy: createdBy ?? null,
      lines: [
        {
          accountId: expenseAccountId,
          debit: amount,
          description: purchase.description || purchase.category,
          branchId: purchase.branchId,
          vendorId: purchase.vendorId,
        },
        {
          accountId: creditAccountId,
          credit: amount,
          description: creditDescription,
          branchId: purchase.branchId,
          vendorId: purchase.vendorId,
        },
      ],
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for purchase ${purchase.id}:`, err);
  }
}

/**
 * يُنشئ قيداً عند دفع مبلغ لمورد على حساب شراء آجل سابق.
 * مدين: ذمم دائنة (2110) - تخفيض الدين
 * دائن: الصندوق - خروج نقدية
 */
export async function createJournalForVendorPayment(
  purchase: Purchase,
  paymentAmount: number,
  createdBy?: number | null
): Promise<void> {
  try {
    if (!paymentAmount || paymentAmount <= 0) return;

    const cashAccountId = await getCashAccountForBranch(purchase.branchId);
    if (!cashAccountId) {
      console.warn(`[auto-journal] no cash account for branch ${purchase.branchId} (vendor payment ${purchase.id})`);
      return;
    }

    const apAccountId = await getAccountIdByCode("2110");
    if (!apAccountId) {
      console.warn(`[auto-journal] AP account 2110 not found (vendor payment ${purchase.id})`);
      return;
    }

    await createJournalEntry({
      entryDate: new Date().toISOString().split("T")[0],
      branchId: purchase.branchId,
      description: `دفعة لمورد على شراء ${purchase.purchaseNumber}`,
      reference: purchase.vendorInvoiceNumber || purchase.purchaseNumber,
      sourceType: "vendor_payment",
      sourceId: purchase.id,
      createdBy: createdBy ?? null,
      lines: [
        {
          accountId: apAccountId,
          debit: paymentAmount,
          description: `تسوية ذمم مورد - ${purchase.purchaseNumber}`,
          branchId: purchase.branchId,
          vendorId: purchase.vendorId,
        },
        {
          accountId: cashAccountId,
          credit: paymentAmount,
          description: `دفعة نقدية لمورد - ${purchase.purchaseNumber}`,
          branchId: purchase.branchId,
          vendorId: purchase.vendorId,
        },
      ],
    });
  } catch (err) {
    console.error(`[auto-journal] failed to create journal for vendor payment ${purchase.id}:`, err);
  }
}

/**
 * يعكس القيد المرتبط بالدفعة/المصروف عند حذفها.
 */
export async function reverseJournalForSource(
  sourceType: "payment" | "expense" | "invoice" | "invoice_payment" | "purchase" | "vendor_payment",
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
