//  **أقسامُ التصدير** — ما يختاره الموظّفُ قبل Excel أو PDF (طلبُ المالك ٢٠٢٦-٠٩-٢٧): قسمٌ أو قسمان أو الكلّ.
//  منطقٌ خالص بلا React ولا شبكة. والخادمُ (`/api/patients/registry?services=`) يحكم بالشرط نفسِه على
//  الجدول والعدّ: في «حسب التاريخ» نشاطُ اليوم **من القسم نفسِه**، وفي «جميع المرضى» مَن يحمل القسمَ في ملفّه.

export const EXPORT_SERVICES = [
  { key: "physiotherapy", label: "علاج طبيعي" },
  { key: "prosthetic", label: "أطراف صناعية" },
  { key: "medical_support", label: "مساند طبية" },
] as const;
export type ExportService = (typeof EXPORT_SERVICES)[number]["key"];
export const ALL_EXPORT_SERVICES: ExportService[] = EXPORT_SERVICES.map((s) => s.key);

function ordered(selected: readonly string[]): ExportService[] {
  return ALL_EXPORT_SERVICES.filter((k) => selected.includes(k));
}

/**
 *  قيمةُ `services` للخادم — **`null` حين تُختار الثلاثة**: «الكلّ» يشمل أيضاً مَن لا قسمَ في ملفّه بعد
 *  (مسجَّلٌ بلا تصنيف)، واختيارُ الثلاثة يعني «لا ترشيح» لا «مَن له أحدُ الثلاثة».
 */
export function exportServicesParam(selected: readonly string[]): string | null {
  const s = ordered(selected);
  return s.length === 0 || s.length === ALL_EXPORT_SERVICES.length ? null : s.join(",");
}

/** وصفُ الاختيار في عنوان PDF. */
export function exportServicesLabel(selected: readonly string[]): string {
  const s = ordered(selected);
  if (s.length === 0 || s.length === ALL_EXPORT_SERVICES.length) return "كل الأقسام";
  return s.map((k) => EXPORT_SERVICES.find((e) => e.key === k)!.label).join(" + ");
}

/** وسمُ اسم الملفّ. */
export function exportServicesFileTag(selected: readonly string[]): string {
  const p = exportServicesParam(selected);
  return p ? p.replace(/,/g, "-") : "all";
}
