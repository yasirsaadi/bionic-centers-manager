// منطقُ نافذة «اشترى» — **بلا React**، فيُختبَر وحده.
//
// ══ لماذا خارج المكوّن ══════════════════════════════════════════════════
// النافذةُ تخدم أربعَ حالاتٍ بضربِ احتمالين (سعرٌ محفوظ؟ خبيرٌ محفوظ؟)،
// وكلٌّ منها بثلاثةِ مساراتٍ ماليّة (عاديّ · خصم · تبرّع) — اثنتا عشرة
// تركيبة. وتركُها منثورةً في JSX كان يعني أن تُقرأ بالعين ولا تُختبَر.
//
// **والقاعدةُ هنا هي القاعدةُ هناك**: المكوّن ينادي هذه الدوالّ نفسها، فلا
// نسختان تنحرفان — شاشةٌ تُرسل ما يردّه الخادم، أو زرٌّ يُعطَّل بلا سبب.

import { hasDiscount, discountBlocked, discountPayload, type DiscountDraft }
  from "./service_discount_ui";

/** ما تحتاجه النافذةُ من صفّ المتابعة — لا أكثر. */
export interface PurchaseFollowupLike {
  approvedPrice?: number | null;
  selectedExpertUserId?: number | null;
}

/**
 * **ما ينقص لإتمام البيع** — وهو كلُّ ما تسأل عنه النافذة.
 *
 * الموجودُ يُعرَض ولا يُسأل عنه: سعرٌ محفوظٌ لا يُعاد إدخاله (تخفيضُه خصمٌ
 * له بابه)، وخبيرٌ اختير صراحةً لا يُبدَّل من باب البيع.
 */
export function purchaseGaps(f: PurchaseFollowupLike | null | undefined): {
  needsFirstPrice: boolean; needsExpert: boolean;
} {
  return {
    //  **الصفرُ والفراغ والقيمةُ الغائبة سواء**: «لم يحدّد الطبيب كلفة».
    needsFirstPrice: !(Number(f?.approvedPrice) > 0),
    //  و`null` و`undefined` سواء: لم يُختَر خبيرٌ بعد.
    needsExpert: f?.selectedExpertUserId === null || f?.selectedExpertUserId === undefined,
  };
}

/**
 * **السعرُ المرجعيّ للنافذة** — المحفوظ إن وُجد، وإلّا ما يُكتب الآن.
 *
 * وعليه يُحسب الخصمُ: حسابُه على صفرٍ كان يجعل «١٠٠ ألف على ملفٍّ بلا سعر»
 * يبدو رفعاً للسعر لا خصماً.
 */
export function purchaseOriginalPrice(
  f: PurchaseFollowupLike | null | undefined, firstPrice: number,
): number {
  const saved = Number(f?.approvedPrice);
  return saved > 0 ? saved : Number(firstPrice) || 0;
}

/**
 * **متى يُعطَّل زرُّ الإرسال** — ولا شيءَ غير هذه الأسباب.
 *
 * ولا **يُعطَّل لغياب خبيرٍ لم يُسأل عنه بعد**: هذا كان عطبَ الشاشة القديمة
 * — زرٌّ ميّتٌ بلا رسالة، وموظّفٌ يُطرَد إلى شاشةٍ أخرى ثم يُطلَب منه أن
 * يعود. النافذةُ تسأل، والزرُّ ينتظر الإجابة لا الخروج.
 */
export function purchaseBlocked(params: {
  followup: PurchaseFollowupLike | null | undefined;
  firstPrice: number;
  expertId: string;
  discount: DiscountDraft;
  busy?: boolean;
}): boolean {
  if (params.busy === true) return true;
  const { needsExpert } = purchaseGaps(params.followup);
  const original = purchaseOriginalPrice(params.followup, params.firstPrice);
  //  سعرٌ غيرُ موجب: إمّا لم يُكتب بعد، أو كُتب صفراً — وكلاهما لا يُباع به.
  if (!(original > 0)) return true;
  //  خبيرٌ ناقصٌ ولم يُختَر في النافذة.
  if (needsExpert && !params.expertId) return true;
  //  وحُرّاسُ الخصم كما هي — **بلا نسخةٍ ثانية منها**.
  return discountBlocked(params.discount, original);
}

/**
 * **جسمُ الطلب** — نداءٌ واحدٌ يحمل ما نقص فقط.
 *
 * وما لم ينقص **لا يُرسَل إطلاقاً**: إرسالُ سعرٍ على ملفٍّ مسعَّر يجعل
 * الشاشة تبدو كأنها تعيد تسعيره، والخادمُ يتجاهله على أي حال — لكنّ
 * الطلبَ الصادق أوضحُ من طلبٍ يُنقَّى في الطرف الآخر.
 */
export function purchaseBody(params: {
  followup: PurchaseFollowupLike | null | undefined;
  firstPrice: number;
  expertId: string;
  discount: DiscountDraft;
}): Record<string, any> {
  const { needsFirstPrice, needsExpert } = purchaseGaps(params.followup);
  const original = purchaseOriginalPrice(params.followup, params.firstPrice);
  return {
    ...(needsFirstPrice ? { originalPrice: Number(params.firstPrice) || 0 } : {}),
    ...(needsExpert ? { expertUserId: Number(params.expertId) } : {}),
    ...(hasDiscount(params.discount, original)
      ? { discount: discountPayload(params.discount) } : {}),
  };
}

/** نصُّ الزرّ — «إرسال للاعتماد» حين يوجد خصم، وإلّا «تأكيد وبدء التصنيع». */
export function purchaseSubmitLabel(params: {
  followup: PurchaseFollowupLike | null | undefined;
  firstPrice: number; discount: DiscountDraft;
}): string {
  const original = purchaseOriginalPrice(params.followup, params.firstPrice);
  return hasDiscount(params.discount, original) ? "إرسال للاعتماد" : "تأكيد وبدء التصنيع";
}
