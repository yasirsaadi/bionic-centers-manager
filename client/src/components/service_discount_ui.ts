// منطقُ حقول الخصم — **خالصٌ بلا React**، ليُختبَر بلا شاشة.
//
// الأزرارُ تُفتح وتُغلق بهذه الدوالّ الثلاث، وهي نفسُ قواعد الخادم معروضةً
// قبل الضغط. ولو بقيت داخل المكوِّن لَما أمكن اختبارُها إلّا بتركيب شجرة —
// فتُترك بلا اختبار، وهي أكثرُ ما يُخطئ فيه المستخدم.

import { computeServiceDiscount, type DiscountReason } from "@shared/discount";

export interface DiscountDraft {
  /** فارغ = بلا خصم. */
  finalPrice: number | null;
  isFree: boolean;
  reason: DiscountReason | "";
  note: string;
}

export const EMPTY_DISCOUNT: DiscountDraft = {
  finalPrice: null, isFree: false, reason: "", note: "",
};

/**
 * **هل في هذه المسوّدة خصمٌ فعلاً؟** — يقرّر المُستدعي أيرسل حقلَ الخصم أم لا.
 *
 * والمساواةُ ليست خصماً: الموظّف الذي أكّد السعر كما هو يمرّ بالمسار
 * الطبيعي بلا طلبٍ ولا طابور — وهذا هو المسارُ الأغلب ويجب أن يبقى سريعاً.
 */
export function hasDiscount(d: DiscountDraft, originalPrice: number): boolean {
  if (d.isFree) return true;
  return d.finalPrice !== null && d.finalPrice !== originalPrice;
}

/** الحمولةُ كما ترسلها الشاشات — بالشكل الذي تقرؤه النقاط الثلاث. */
export function discountPayload(d: DiscountDraft) {
  return {
    finalPrice: d.isFree ? 0 : d.finalPrice,
    isFree: d.isFree,
    reason: d.reason,
    note: d.note.trim() || undefined,
  };
}

/** الشرطُ الذي يمنع الإرسال — نفسُ قواعد الخادم، معروضةً قبل الضغط. */
export function discountBlocked(d: DiscountDraft, originalPrice: number): boolean {
  if (!hasDiscount(d, originalPrice)) return false;
  const calc = computeServiceDiscount({
    originalPrice, finalPrice: d.finalPrice, isFree: d.isFree,
  });
  if (!calc.ok) return true;
  //  والتبرّعُ سببُه من النظام؛ وغيرُه يحتاج سبباً مختاراً.
  return !d.isFree && !d.reason;
}
