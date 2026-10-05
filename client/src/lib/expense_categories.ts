// **فئاتُ المصاريف المدمجة** — منقولةٌ بحرفها من `pages/Accounting.tsx` لتقرأها صفحةُ «دفتر القاصة» (§4.ca) من المصدر نفسِه.
// Labels match the categories returned by the AI categorize endpoint exactly,
// so the AI suggestion can be matched on either `label` or `value`.
export const EXPENSE_CATEGORIES = [
  { value: "salaries", label: "رواتب" },
  { value: "rent", label: "إيجارات" },
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
