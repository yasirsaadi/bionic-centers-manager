// **فئاتُ المصاريف المدمجة** — منقولةٌ بحرفها من `pages/Accounting.tsx` لتقرأها صفحةُ «دفتر القاصة» (§4.ca) من المصدر نفسِه.
// Labels match the categories returned by the AI categorize endpoint exactly,
// so the AI suggestion can be matched on either `label` or `value`.
//
// **بابا القاصتين** (قرارُ المالك ٢٠٢٦-١٠-١١، §4.dj): «أجور مواد» و«رواتب وإيجار» مصروفٌ عاديّ يتراكم كلٌّ في قاصته في دفتر القاصة
// (`reserve`). و«رواتب» و«إيجارات» تقاعدا (`retired`): لا يُعرَضان في نوافذ الكتابة — إلّا لمصروفٍ قديمٍ مكتوبٍ بهما — ويبقيان باسمهما.
export const EXPENSE_CATEGORIES = [
  { value: "materials_reserve", label: "أجور مواد", reserve: true },
  { value: "payroll_rent", label: "رواتب وإيجار", reserve: true },
  { value: "salaries", label: "رواتب", retired: true },
  { value: "rent", label: "إيجارات", retired: true },
  { value: "medical_supplies", label: "مستلزمات طبية" },
  { value: "maintenance", label: "صيانة" },
  { value: "utilities", label: "كهرباء ومياه" },
  { value: "communications", label: "اتصالات" },
  { value: "marketing", label: "تسويق" },
  { value: "transport", label: "نقل" },
  { value: "hospitality", label: "ضيافة" },
  { value: "stationery", label: "قرطاسية" },
  { value: "bank_fees", label: "رسوم بنكية" },
  // Karbala-only: the shrine's percentage. Offered in the expense form only
  // when the selected branch is كربلاء (karbalaOnly), but still labelled
  // everywhere so existing records display correctly.
  { value: "shrine_percentage", label: "نسبة العتبة", karbalaOnly: true },
  // Dhi Qar's hospital share (§4.ca) — computed in the cash book from the day's income, never typed:
  // labelled everywhere, offered in no manual form (sheetOnly).
  { value: "hospital_percentage", label: "نسبة المستشفى", sheetOnly: true },
  { value: "other", label: "أخرى" }
];

/** ما يُعرَض في نافذة كتابة مصروف: لا المتقاعدُ (إلّا الباب الحاليّ لمصروفٍ قديم)، ولا ما للدفتر وحده، ولا ما لكربلاء وحدها إلّا لها. */
export function writableExpenseCategories(opts: { current?: string | null; karbala?: boolean; reserves?: boolean } = {}) {
  return EXPENSE_CATEGORIES.filter((c: any) =>
    !c.sheetOnly
    && (!c.karbalaOnly || opts.karbala)
    && (!c.retired || c.value === opts.current)
    && (opts.reserves !== false || !c.reserve));
}
