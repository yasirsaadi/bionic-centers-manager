// **سجلُّ الزيارات سجلُّ الحضور كلِّه** (قرارُ المالك ٢٠٢٦-١٠-٠١، §4.aw): كلُّ حضورٍ للمريض يُكتب زيارةً
// سببُها عنوانُها (`visits.details`) — تدريبٌ أو صيانةٌ أو شراءُ جزءٍ أو جهازٍ أو طلبُ معاينةٍ أو استلامٌ.
// والنصوصُ هنا وحدها، فلا يكتب مسارٌ سبباً بصيغةٍ تخالف غيرَه.

export const ATTENDANCE_REASONS = {
  training: "تدريب على الجهاز",
  examRequest: "طلب معاينة طبية",
  returnToPurchase: "عاد للشراء",
  delivery: "استلام الجهاز",
  maintenance: "صيانة",
  followup: "متابعة أو تعديل على جهاز قائم",
} as const;

/** «شراء جزء: الركبة». */
export function partPurchaseReason(itemLabel: string): string {
  return `شراء جزء: ${itemLabel}`;
}

/** «شراء طرف صناعي» · «شراء مسند طبي». */
export function devicePurchaseReason(serviceType: string): string {
  return serviceType === "medical_support" ? "شراء مسند طبي" : "شراء طرف صناعي";
}
