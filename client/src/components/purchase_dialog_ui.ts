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
 * قائمةُ الخبراء كما أعادها الخادمُ **لهذا البائع** (`sale_experts.ts`) —
 * `undefined` حين لم تُحمَّل بعد، فلا يُحكَم بها على شيء.
 */
export type PurchaseCandidates = readonly { id: number }[] | null | undefined;

/**
 * **الخبيرُ المحفوظ لا يصلح لهذا البائع** (٢٠٢٦-٠٩-٢٤، مراجعةٌ على ٤٠٩).
 *
 * اختار الفرعُ المُتاح (بغداد) أيوبَ على متابعةٍ في ذي قار، ثمّ ضغط استقبالُ
 * ذي قار «اشترى»: النافذةُ تعرض أيوب للقراءة بلا قائمة، والخادمُ يردّ «الخبير
 * لا يعمل في أيّ فرعٍ من فروع هذا المريض المتاحة لك — اختر خبيراً من القائمة»
 * — **ولا قائمة**. فحين تُحمَّل القائمةُ ولا يكون المحفوظُ فيها، يُسأل
 * البائعُ عن خبيرٍ يصلح له في النافذة نفسِها. **ولا يُحكَم قبل التحميل** —
 * القائمةُ الغائبة لا تقول إن المحفوظ لا يصلح.
 */
export function savedExpertOutOfList(
  f: PurchaseFollowupLike | null | undefined, candidates: PurchaseCandidates,
): boolean {
  const saved = f?.selectedExpertUserId;
  if (saved === null || saved === undefined || !Array.isArray(candidates)) return false;
  return !candidates.some((e) => Number(e.id) === Number(saved));
}

/**
 * **ما ينقص لإتمام البيع** — وهو كلُّ ما تسأل عنه النافذة.
 *
 * الموجودُ يُعرَض ولا يُسأل عنه: سعرٌ محفوظٌ لا يُعاد إدخاله (تخفيضُه خصمٌ
 * له بابه)، وخبيرٌ اختير صراحةً لا يُبدَّل من باب البيع.
 */
export function purchaseGaps(
  f: PurchaseFollowupLike | null | undefined, candidates?: PurchaseCandidates,
): {
  needsFirstPrice: boolean; needsExpert: boolean;
} {
  return {
    //  **الصفرُ والفراغ والقيمةُ الغائبة سواء**: «لم يحدّد الطبيب كلفة».
    needsFirstPrice: !(Number(f?.approvedPrice) > 0),
    //  و`null` و`undefined` سواء: لم يُختَر خبيرٌ بعد. **أو اختير خبيرٌ لا
    //  يصلح لهذا البائع** — فيُسأل عن غيره بدل نافذةٍ لا مخرجَ منها.
    needsExpert: f?.selectedExpertUserId === null || f?.selectedExpertUserId === undefined
      || savedExpertOutOfList(f, candidates),
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
  candidates?: PurchaseCandidates;
}): boolean {
  if (params.busy === true) return true;
  const { needsExpert } = purchaseGaps(params.followup, params.candidates);
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
  candidates?: PurchaseCandidates;
}): Record<string, any> {
  const { needsFirstPrice, needsExpert } = purchaseGaps(params.followup, params.candidates);
  const original = purchaseOriginalPrice(params.followup, params.firstPrice);
  return {
    ...(needsFirstPrice ? { originalPrice: Number(params.firstPrice) || 0 } : {}),
    ...(needsExpert ? { expertUserId: Number(params.expertId) } : {}),
    ...(hasDiscount(params.discount, original)
      ? { discount: discountPayload(params.discount) } : {}),
  };
}

/**
 * نصُّ الزرّ — **واحدٌ بلا خصم أو معه** (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨):
 * الخصمُ يُطبَّق فوراً كالسعر الكامل تماماً، فلا فرقَ يعرضه الزرّ.
 */
export function purchaseSubmitLabel(params: {
  followup: PurchaseFollowupLike | null | undefined;
  firstPrice: number; discount: DiscountDraft;
}): string {
  return "تأكيد وبدء التصنيع";
}
