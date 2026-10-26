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
  /** **متابعةٌ لدى الخبير** (٠٩٦): من باب الصيانة، بلا أجور — إتمامُ قالب، فطرٌ في قالبٍ جديد، تيست. */
  expertFollowup: "متابعة لدى الخبير",
  /** **القالبُ الاختباري** (٠٩٧، §4.bz): الخبيرُ سلّمه، وعودةُ المريض للنهائي. */
  trialSocket: "تسليم قالب اختباري",
  trialReturn: "عودة للقالب النهائي",
  /** **عاد لأخذ القالب** (§4.cl): اشترى سابقاً ولم يُؤخذ قالبُه يومها — يعود لأمره القائم. */
  moldReturn: "عاد لأخذ القالب",
} as const;

/** «شراء جزء: الركبة». */
export function partPurchaseReason(itemLabel: string): string {
  return `شراء جزء: ${itemLabel}`;
}

/** «شراء طرف صناعي» · «شراء مسند طبي». */
export function devicePurchaseReason(serviceType: string): string {
  return serviceType === "medical_support" ? "شراء مسند طبي" : "شراء طرف صناعي";
}

/** جلسةُ العلاج الطبيعيّ تُسجَّل بلا سببٍ مكتوب («تسجيل زيارة جلسة علاج طبيعي»، §4.av) — فهذا سببُها. */
export const PHYSIO_SESSION_REASON = "جلسة علاج طبيعي";

/**
 * **«سبب الزيارة»** في التقرير اليوميّ وتصدير سجلّ المرضى (طلبُ المالك ٢٠٢٦-١٠-٢٦، §4.fq): السببُ المكتوب للزيارة
 * (`visits.details`) كما هو، وزيارةُ العلاج الطبيعيّ بلا سببٍ مكتوب «جلسة علاج طبيعي»، وغيرُها بلا سببٍ `null` — لا يُخمَّن.
 */
export function visitReasonLabel(details: string | null | undefined, caseType: string | null | undefined): string | null {
  const d = typeof details === "string" ? details.trim() : "";
  if (d) return d;
  return caseType === "physiotherapy" ? PHYSIO_SESSION_REASON : null;
}
