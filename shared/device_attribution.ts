// إسناد المال والزيارات إلى جهازٍ بعينه — قواعد نقيّة بلا قاعدة بيانات.
//
// المريض صار يملك أكثر من جهازٍ من النوع نفسه، فسؤال «أيّ جهاز؟» صار
// حقيقياً لكل دفعةٍ وكل زيارة. وهذه الوحدة تجيب عن نصفه المحلّي: أيّ
// **خدمة** يمثّلها وسمُ الدفعة، وهل الوسم مختلطٌ لا يصلح لجهازٍ واحد.
// أمّا النصف الآخر — أيّ حلقةٍ بعينها — فيُحسم في الخادم أمام القاعدة.

export const DEVICE_PAYMENT_TAGS = {
  prosthetic: "أطراف صناعية",
  medical_support: "مساند طبية",
} as const;

export type DeviceService = keyof typeof DEVICE_PAYMENT_TAGS;

/**
 * أيّ خدمةِ جهازٍ يمثّلها وسمُ الدفعة؟
 *
 * `null` تعني «ليست دفعة جهاز» — علاجٌ طبيعي أو استشارة أو غيرهما، وتلك
 * تمضي بمسارها القديم بلا سؤال.
 *
 * ووسمٌ يحمل **الاثنين** يُرجع `"mixed"`: دفعةٌ واحدة لا تمثّل طرفاً
 * ومسنداً معاً، فإسنادها إلى حلقةٍ واحدة يكذب على أحدهما.
 */
export function deviceServiceOfPaymentType(
  paymentTreatmentType: string | null | undefined,
): DeviceService | "mixed" | null {
  if (typeof paymentTreatmentType !== "string" || !paymentTreatmentType.trim()) return null;
  const hasProsthetic = paymentTreatmentType.includes(DEVICE_PAYMENT_TAGS.prosthetic);
  const hasSupport = paymentTreatmentType.includes(DEVICE_PAYMENT_TAGS.medical_support);
  if (hasProsthetic && hasSupport) return "mixed";
  if (hasProsthetic) return "prosthetic";
  if (hasSupport) return "medical_support";
  return null;
}

export interface TreatmentEntryLike {
  treatmentType?: string | null;
}

/**
 * هل تحمل قائمةُ البنود دفعةَ جهازٍ مخلوطةً بغيرها؟
 *
 * دفعةُ الجهاز معاملةٌ **لجهازٍ واحد**. فبندٌ لطرفٍ وآخر لعلاجٍ طبيعي في
 * دفعةٍ واحدة يُنتج صفّاً لا يمكن إسناده: نصفُه لجهازٍ ونصفُه لا.
 */
export function hasMixedDeviceEntries(entries: TreatmentEntryLike[] | null | undefined): boolean {
  if (!Array.isArray(entries)) return false;
  const named = entries.filter((e) => typeof e?.treatmentType === "string" && e.treatmentType.trim());
  if (named.length <= 1) return false;
  return named.some((e) => deviceServiceOfPaymentType(e.treatmentType) !== null);
}
