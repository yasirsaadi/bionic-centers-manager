import { db } from "../db";
import { chartOfAccounts, branches } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * بذرة شجرة الحسابات القياسية
 * Seeds the standard Iraqi-style chart of accounts.
 *
 * Safety:
 * - Idempotent: checks if account_code exists before inserting
 * - Never updates or deletes existing accounts
 * - Safe to run multiple times
 */

type SeedAccount = {
  code: string;
  nameAr: string;
  nameEn?: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype?: string;
  normalBalance: "debit" | "credit";
  parentCode?: string;
  isSystem?: boolean;
  description?: string;
};

const STANDARD_ACCOUNTS: SeedAccount[] = [
  // ============ 1000 - الأصول ============
  { code: "1000", nameAr: "الأصول", nameEn: "Assets", type: "asset", normalBalance: "debit", isSystem: true },

  // 1100 - الأصول المتداولة
  { code: "1100", nameAr: "الأصول المتداولة", nameEn: "Current Assets", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1000", isSystem: true },
  { code: "1110", nameAr: "الصناديق النقدية", nameEn: "Cash on Hand", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100", isSystem: true },
  { code: "1120", nameAr: "الحسابات البنكية", nameEn: "Bank Accounts", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100", isSystem: true },
  { code: "1130", nameAr: "الذمم المدينة - المرضى", nameEn: "Accounts Receivable - Patients", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100", isSystem: true, description: "ديون المرضى على المراكز" },
  { code: "1140", nameAr: "المخزون - مستلزمات طبية", nameEn: "Inventory - Medical Supplies", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100" },
  { code: "1150", nameAr: "المخزون - أطراف صناعية", nameEn: "Inventory - Prosthetics", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100" },
  { code: "1160", nameAr: "مصاريف مدفوعة مقدماً", nameEn: "Prepaid Expenses", type: "asset", subtype: "current_asset", normalBalance: "debit", parentCode: "1100" },

  // 1200 - الأصول الثابتة
  { code: "1200", nameAr: "الأصول الثابتة", nameEn: "Fixed Assets", type: "asset", subtype: "fixed_asset", normalBalance: "debit", parentCode: "1000", isSystem: true },
  { code: "1210", nameAr: "الأجهزة الطبية", nameEn: "Medical Equipment", type: "asset", subtype: "fixed_asset", normalBalance: "debit", parentCode: "1200" },
  { code: "1220", nameAr: "الأثاث والمعدات المكتبية", nameEn: "Furniture & Office Equipment", type: "asset", subtype: "fixed_asset", normalBalance: "debit", parentCode: "1200" },
  { code: "1230", nameAr: "أجهزة الحاسوب", nameEn: "Computers", type: "asset", subtype: "fixed_asset", normalBalance: "debit", parentCode: "1200" },
  { code: "1240", nameAr: "السيارات", nameEn: "Vehicles", type: "asset", subtype: "fixed_asset", normalBalance: "debit", parentCode: "1200" },
  { code: "1290", nameAr: "مجمع الإهلاك", nameEn: "Accumulated Depreciation", type: "asset", subtype: "contra_asset", normalBalance: "credit", parentCode: "1200", description: "حساب مقابل - رصيده دائن" },

  // ============ 2000 - الخصوم ============
  { code: "2000", nameAr: "الخصوم", nameEn: "Liabilities", type: "liability", normalBalance: "credit", isSystem: true },

  // 2100 - الخصوم المتداولة
  { code: "2100", nameAr: "الخصوم المتداولة", nameEn: "Current Liabilities", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2000", isSystem: true },
  { code: "2110", nameAr: "الذمم الدائنة - الموردون", nameEn: "Accounts Payable - Vendors", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2100", isSystem: true },
  { code: "2120", nameAr: "الرواتب المستحقة", nameEn: "Salaries Payable", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2100" },
  { code: "2130", nameAr: "ضريبة القيمة المضافة المستحقة", nameEn: "VAT Payable", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2100", isSystem: true, description: "خامل حالياً - يُفعّل عند تطبيق الضريبة" },
  { code: "2140", nameAr: "دفعات مقدمة من المرضى", nameEn: "Patient Advances", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2100" },
  { code: "2190", nameAr: "مصاريف مستحقة أخرى", nameEn: "Other Accrued Expenses", type: "liability", subtype: "current_liability", normalBalance: "credit", parentCode: "2100" },

  // ============ 3000 - حقوق الملكية ============
  { code: "3000", nameAr: "حقوق الملكية", nameEn: "Equity", type: "equity", normalBalance: "credit", isSystem: true },
  { code: "3100", nameAr: "رأس المال", nameEn: "Capital", type: "equity", normalBalance: "credit", parentCode: "3000", isSystem: true },
  { code: "3200", nameAr: "الأرباح المحتجزة", nameEn: "Retained Earnings", type: "equity", normalBalance: "credit", parentCode: "3000", isSystem: true },
  { code: "3300", nameAr: "أرباح وخسائر الفترة الحالية", nameEn: "Current Period Profit/Loss", type: "equity", normalBalance: "credit", parentCode: "3000", isSystem: true },
  { code: "3400", nameAr: "السحوبات الشخصية", nameEn: "Owner's Drawings", type: "equity", normalBalance: "debit", parentCode: "3000" },

  // ============ 4000 - الإيرادات ============
  { code: "4000", nameAr: "الإيرادات", nameEn: "Revenue", type: "revenue", normalBalance: "credit", isSystem: true },
  { code: "4100", nameAr: "إيرادات العلاج الطبيعي", nameEn: "Physiotherapy Revenue", type: "revenue", normalBalance: "credit", parentCode: "4000", isSystem: true },
  { code: "4200", nameAr: "إيرادات الأطراف الصناعية", nameEn: "Prosthetics Revenue", type: "revenue", normalBalance: "credit", parentCode: "4000", isSystem: true },
  { code: "4300", nameAr: "إيرادات المساند الطبية", nameEn: "Medical Supports Revenue", type: "revenue", normalBalance: "credit", parentCode: "4000", isSystem: true },
  { code: "4400", nameAr: "إيرادات الخدمات الإضافية", nameEn: "Additional Services Revenue", type: "revenue", normalBalance: "credit", parentCode: "4000" },
  { code: "4900", nameAr: "إيرادات أخرى", nameEn: "Other Revenue", type: "revenue", normalBalance: "credit", parentCode: "4000", isSystem: true },
  { code: "4990", nameAr: "خصومات ممنوحة", nameEn: "Sales Discounts", type: "revenue", subtype: "contra_revenue", normalBalance: "debit", parentCode: "4000", description: "حساب مقابل للإيرادات - يخفضها" },

  // ============ 5000 - المصروفات ============
  { code: "5000", nameAr: "المصروفات", nameEn: "Expenses", type: "expense", normalBalance: "debit", isSystem: true },
  { code: "5100", nameAr: "الرواتب والأجور", nameEn: "Salaries & Wages", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5200", nameAr: "الإيجارات", nameEn: "Rent", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5300", nameAr: "المستلزمات الطبية", nameEn: "Medical Supplies", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5400", nameAr: "الصيانة والإصلاحات", nameEn: "Maintenance & Repairs", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5500", nameAr: "الكهرباء والماء", nameEn: "Utilities", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5600", nameAr: "الاتصالات والإنترنت", nameEn: "Communications & Internet", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
  { code: "5700", nameAr: "التسويق والدعاية", nameEn: "Marketing & Advertising", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5800", nameAr: "النقل والمواصلات", nameEn: "Transportation", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5810", nameAr: "الضيافة والوجبات", nameEn: "Hospitality & Meals", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5820", nameAr: "القرطاسية واللوازم المكتبية", nameEn: "Office Supplies", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5900", nameAr: "الرسوم البنكية", nameEn: "Bank Fees", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5910", nameAr: "مصاريف الإهلاك", nameEn: "Depreciation Expense", type: "expense", normalBalance: "debit", parentCode: "5000" },
  { code: "5990", nameAr: "مصاريف أخرى", nameEn: "Other Expenses", type: "expense", normalBalance: "debit", parentCode: "5000", isSystem: true },
];

// حسابات الصناديق النقدية لكل فرع (تُنشأ ديناميكياً)
function cashAccountsForBranches(allBranches: { id: number; name: string }[]): SeedAccount[] {
  return allBranches.map((branch, idx) => ({
    code: `1111${String(idx + 1).padStart(2, "0")}`,
    nameAr: `الصندوق النقدي - ${branch.name}`,
    nameEn: `Cash - ${branch.name}`,
    type: "asset" as const,
    subtype: "current_asset",
    normalBalance: "debit" as const,
    parentCode: "1110",
    isSystem: true,
    description: `صندوق فرع ${branch.name}`,
  }));
}

export async function seedChartOfAccounts(): Promise<{ created: number; skipped: number }> {
  let created = 0;
  let skipped = 0;

  // نبدأ بالحسابات الرئيسية
  const parentMap = new Map<string, number>();

  // Helper: get or insert account by code
  async function upsertAccount(acc: SeedAccount, branchId?: number) {
    const existing = await db
      .select({ id: chartOfAccounts.id })
      .from(chartOfAccounts)
      .where(eq(chartOfAccounts.accountCode, acc.code))
      .limit(1);

    if (existing.length > 0) {
      parentMap.set(acc.code, existing[0].id);
      skipped++;
      return existing[0].id;
    }

    const parentId = acc.parentCode ? parentMap.get(acc.parentCode) : undefined;

    const [inserted] = await db
      .insert(chartOfAccounts)
      .values({
        accountCode: acc.code,
        accountNameAr: acc.nameAr,
        accountNameEn: acc.nameEn,
        accountType: acc.type,
        accountSubtype: acc.subtype,
        parentId: parentId ?? null,
        branchId: branchId ?? null,
        normalBalance: acc.normalBalance,
        isSystem: acc.isSystem ?? false,
        description: acc.description,
      })
      .returning({ id: chartOfAccounts.id });

    parentMap.set(acc.code, inserted.id);
    created++;
    return inserted.id;
  }

  // ترتيب الإدراج مهم: الآباء قبل الأبناء
  for (const acc of STANDARD_ACCOUNTS) {
    await upsertAccount(acc);
  }

  // صناديق الفروع
  const allBranches = await db.select({ id: branches.id, name: branches.name }).from(branches);
  const cashAccounts = cashAccountsForBranches(allBranches);

  for (let i = 0; i < cashAccounts.length; i++) {
    const acc = cashAccounts[i];
    const branchId = allBranches[i].id;
    await upsertAccount(acc, branchId);
  }

  return { created, skipped };
}

/**
 * يُنشئ الفترة المحاسبية الحالية (الشهر الحالي) تلقائياً إن لم تكن موجودة.
 */
export async function ensureCurrentPeriod(): Promise<void> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const periodName = `${year}-${month}`;

  const existing = await db.execute(
    sql`SELECT id FROM accounting_periods WHERE period_name = ${periodName} LIMIT 1`
  );

  if ((existing.rows?.length ?? 0) > 0) return;

  const startDate = `${year}-${month}-01`;
  const endDate = new Date(year, now.getMonth() + 1, 0).toISOString().split("T")[0];

  await db.execute(sql`
    INSERT INTO accounting_periods (period_name, start_date, end_date, status)
    VALUES (${periodName}, ${startDate}, ${endDate}, 'open')
    ON CONFLICT DO NOTHING
  `);
}
