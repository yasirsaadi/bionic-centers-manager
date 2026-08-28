// الخصمُ والمجّاني — **عقدٌ واحد للأقسام الثلاثة**، منطقٌ خالص بلا شبكة.
//
// ══ لماذا واحدٌ لا ثلاثة ════════════════════════════════════════════════
// الطرفُ والمسندُ والعلاجُ الطبيعي تُسعَّر في ثلاث شاشاتٍ مختلفة، لكنّ سؤالَ
// «بكم نبيع ومَن يأذن بالتخفيض» واحدٌ فيها جميعاً. وثلاثةُ أنظمةِ خصمٍ كانت
// ستعني ثلاثَ قواعدِ اعتماد تنحرف إحداها يوماً، وثلاثةَ طوابيرَ يقرؤها
// المدير، وثلاثةَ تعاريفَ لـ«مجّاني».
//
// ══ والحسابُ هنا لا في الشاشة ولا في الخادم ═════════════════════════════
// الشاشةُ تعرض الفرقَ حيّاً والخادمُ يحفظه، فلو حُسب مرّتين لانحرفا مرّة —
// ويرى الموظّف رقماً ويُحفظ غيرُه. والقاعدةُ تُكتب مرّةً واحدة هنا.

import { DEPARTMENTS, type Department } from "./service_taxonomy";

export { DEPARTMENTS };
export type { Department };

// ── أسبابُ الخصم ─────────────────────────────────────────────────────────
//
// **سببٌ منظَّم لا نصٌّ حرّ**: تقريرُ «كم خصمنا ولماذا» لا يُجمَع من نصوصٍ
// كتبها عشرون موظّفاً بعشرين صياغة.
export const DISCOUNT_REASONS = [
  "administrative_instruction",
  "campaign_or_offer",
  "humanitarian",
  "negotiation",
  "special_org_or_employee",
  "other",
] as const;
export type DiscountReason = (typeof DISCOUNT_REASONS)[number];

export const DISCOUNT_REASON_LABELS: Record<DiscountReason, string> = {
  administrative_instruction: "توجيه إداري",
  campaign_or_offer: "حملة أو عرض",
  humanitarian: "حالة إنسانية",
  negotiation: "مفاوضة المريض",
  special_org_or_employee: "جهة خاصة أو موظّف",
  other: "سبب آخر",
};

export const isDiscountReason = (v: unknown): v is DiscountReason =>
  typeof v === "string" && (DISCOUNT_REASONS as readonly string[]).includes(v);

/**
 * سببُ المجّاني — **يُكتب من النظام لا من الموظّف**.
 *
 * «مجّاني» ليس خصماً بمئة بالمئة اختاره أحدٌ من قائمة، بل **تبرّعٌ باسمٍ
 * معلوم**. فالسببُ يُثبَّت هنا كي يُقرأ في التقرير بعبارةٍ واحدة لا بعشرين
 * صياغة، ولا يُترك للكتابة الحرّة.
 */
export const FREE_DONATION_REASON = "donation_dr_yasir" as const;
export const FREE_DONATION_LABEL = "تبرع من دكتور ياسر";

/** عنوانُ السبب — والمجّاني له عبارتُه الثابتة. */
export function discountReasonLabel(v: unknown): string {
  if (v === FREE_DONATION_REASON) return FREE_DONATION_LABEL;
  return isDiscountReason(v) ? DISCOUNT_REASON_LABELS[v] : String(v ?? "—");
}

// ── حالاتُ الطلب ─────────────────────────────────────────────────────────
export const DISCOUNT_STATUSES = ["pending", "approved", "rejected", "cancelled"] as const;
export type DiscountStatus = (typeof DISCOUNT_STATUSES)[number];

export const DISCOUNT_STATUS_LABELS: Record<DiscountStatus, string> = {
  pending: "بانتظار الاعتماد",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

/**
 * عنوانُ الصفحة الموروثة — **خصمٌ سابق، لا طابورُ اعتمادٍ حيّ** (تصحيحٌ
 * تشغيليّ ٢٠٢٦-٠٨-٢٨: تقاعد طابورُ اعتماد الخصومات).
 *
 * كلُّ خصمٍ يُدخله موظّفٌ مخوَّلٌ اليوم يُطبَّق **فوراً** في نفس معاملة
 * الحفظ (`applyDiscountImmediately`)، فلا صفَّ `pending` جديداً يُنشئه
 * عملٌ حيّ بعد اليوم. وما تبقّى في `service_discount_requests` بحالة
 * `pending` هو حصراً بقيّةٌ من قبل هذا التغيير — والعنوانُ يقول ذلك
 * بصراحة بدل «اعتماد».
 *
 * **مصدرٌ واحد** يستورده الشريطُ الجانبيّ والصفحةُ معاً — نفسُ نمط
 * `LEGACY_QUEUE_TITLE` (`shared/pending_charge.ts`) تماماً — فلا نصّان
 * يتفرّقان.
 */
export const DISCOUNT_HISTORY_TITLE = "خصومات سابقة بانتظار الإكمال";

// ── الحساب ───────────────────────────────────────────────────────────────

export interface ServiceDiscount {
  ok: boolean;
  /** رسالةُ الرفض بالعربية — تُعرض في النموذج ويُرجعها الخادم نفسه. */
  error?: string;
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  /** نسبةُ الخصم إلى السعر الأصلي، بمنزلتين. */
  discountPercentage: number;
  isFree: boolean;
  /**
   * **هل يحتاج اعتماداً أصلاً؟**
   *
   * لا — حين يساوي النهائيُّ الأصليَّ. وهذا هو المسار الأغلب، ويجب أن يبقى
   * سريعاً كما هو اليوم: بلا طلبٍ ولا طابورٍ ولا مدير.
   */
  needsApproval: boolean;
}

/**
 * حسابُ الخصم وتحقّقُه — **قاعدةٌ واحدة للشاشة وللخادم**.
 *
 * ══ القواعد ════════════════════════════════════════════════════════════
 * • **السعرُ الأصلي موجبٌ صحيح**: صفرٌ يعني «لم يُسعَّر بعد» لا «مجّاني».
 * • **والنهائيُّ لا يفوق الأصلي**: هذا بابُ خصمٍ لا بابُ رفعِ سعر.
 * • **ومساواتُه إيّاه ليست خصماً**: لا اعتمادَ ولا طلبَ ولا انتظار.
 * • **والمجّاني صريحٌ لا مستنتَج**: `isFree` علمٌ يُرفع قصداً، لا نتيجةُ
 *   كتابةِ صفر. انظر أدناه.
 * • ولا كسورَ دينار — كلُّ أعمدة المال صحيحة.
 *
 * ══ ولماذا لا يُستنتَج «مجّاني» من الصفر ═══════════════════════════════
 * لأن الصفر في هذا النظام **يعني اليوم «غير مسعَّر»** في مسارات الأجهزة:
 * مريضٌ وقّع الطبيبُ معاينته بلا كلفةٍ يحمل صفراً، وهو ليس متبرَّعاً له.
 * فلو قُرئ الصفرُ مجّانياً لصار كلُّ ملفٍّ لم يُسعَّر بعدُ «تبرّعاً» في
 * التقرير، ولخرج من طابور التسعير بلا أن يقرّر ذلك أحد.
 *
 * فالمعادلةُ صريحة: **صفرٌ + علمُ مجّانيٍّ معتمَد = خدمةٌ مجّانية**، وصفرٌ
 * بلا ذلك العلم = **غيرُ مسعَّر**. والفرقُ محفوظٌ في القاعدة لا في النيّة.
 */
export function computeServiceDiscount(params: {
  originalPrice: number;
  /** المطلوب. ويُتجاهَل حين يُرفع علمُ المجّاني — فالمجّاني صفرٌ بالتعريف. */
  finalPrice?: number | null;
  isFree?: boolean;
}): ServiceDiscount {
  const original = Number(params.originalPrice);
  const nil: ServiceDiscount = {
    ok: false, originalPrice: Number.isFinite(original) ? original : 0,
    finalPrice: 0, discountAmount: 0, discountPercentage: 0,
    isFree: false, needsApproval: false,
  };
  if (!Number.isFinite(original) || !Number.isInteger(original) || original <= 0) {
    return { ...nil, error: "السعر الأصلي يجب أن يكون مبلغاً موجباً بالدينار الصحيح" };
  }

  const isFree = params.isFree === true;
  //  **المجّاني صفرٌ بالتعريف** — ولا يُقرأ رقمٌ من الطلب معه، فلا يمرّ
  //  «مجّاني بسعر ٥٠٬٠٠٠» من نداءٍ مباشر.
  const raw = isFree ? 0
    : (params.finalPrice === null || params.finalPrice === undefined
      || params.finalPrice === ("" as any))
      //  الحقلُ الفارغ يعني «بلا خصم» لا «بصفر»: الموظّف الذي لم يلمسه
      //  لم يقرّر تخفيضاً.
      ? original
      : Number(params.finalPrice);

  if (!Number.isFinite(raw) || !Number.isInteger(raw)) {
    return { ...nil, error: "السعر بعد الخصم يجب أن يكون بالدينار الصحيح" };
  }
  if (raw < 0) return { ...nil, error: "السعر بعد الخصم لا يكون سالباً" };
  if (raw > original) {
    return { ...nil, error: "السعر بعد الخصم لا يفوق السعر الأصلي — هذا باب خصم لا رفع سعر" };
  }
  //  **وصفرٌ بلا علمٍ صريح يُردّ**: هو المكانُ الذي يُصنَع فيه الفرقُ بين
  //  «مجّاني» و«غيرِ مسعَّر»، فلا يُترك للاستنتاج.
  if (raw === 0 && !isFree) {
    return {
      ...nil,
      error: "السعر صفر — إن كانت الخدمة مجّانية فاختر «مجاني (تبرع من دكتور ياسر)» صراحةً",
    };
  }

  const discountAmount = original - raw;
  return {
    ok: true, originalPrice: original, finalPrice: raw, discountAmount,
    discountPercentage: Math.round((discountAmount / original) * 10000) / 100,
    isFree,
    //  **لا اعتمادَ بلا خصم**: المسارُ الطبيعي يمرّ كما كان تماماً.
    needsApproval: discountAmount > 0,
  };
}

// ── الصلاحيات ────────────────────────────────────────────────────────────

export interface DiscountSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  branchId?: number | null;
  permissions?: Record<string, any> | null;
}

/**
 * مَن يعتمد خصماً أو تبرّعاً — **المسؤولُ ومديرُ الفرع والمخوَّل صراحةً**.
 *
 * ══ ولماذا لا كلُّ طبيب ════════════════════════════════════════════════
 * الخصمُ قرارٌ **مالي** لا سريري. وجعلُه لكلّ من دورُه «طبيب» كان سيمنح
 * سلطةَ التنازل عن الإيراد لعشرة أطبّاء لم يقرّر أحدٌ أن تكون لهم. فمَن
 * أراد أن يخوّل طبيباً بعينه يرفع له عَلَم `canApproveDiscount` — قراراً
 * مكتوباً على حسابه لا استنتاجاً من دوره.
 *
 * **وسلطةُ المسؤول تُفحَص أوّلاً** فلا يقيّدها دورٌ عاديّ يحمله.
 *
 * **والنطاقُ الجغرافي ليس هنا**: تفرضه النقطةُ من فرع الطلب نفسه — مديرُ
 * فرعٍ لا يعتمد خصمَ فرعٍ آخر ولو كان مديراً.
 */
export function canApproveServiceDiscount(
  s: DiscountSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager") return true;
  //  المقارنة صريحة: صلاحيةٌ غامضة القيمة تُقرأ «لا».
  return s?.permissions?.canApproveDiscount === true;
}

/**
 * مَن يطلب خصماً — **مَن يسعّر الخدمة أصلاً**.
 *
 * وهي بوّابةُ التسعير القائمة نفسُها (`canAddPatients` أو مديرٌ أو مسؤول)،
 * لأن الخصمَ ليس باباً ثانياً بل حقلٌ في نموذج التسعير الذي يملؤه الموظّف.
 */
export function canRequestServiceDiscount(
  s: DiscountSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager" || s?.role === "reception") return true;
  return s?.permissions?.canAddPatients === true;
}

// ── مراجعُ السياق — **هويّةُ الخدمة التي يخصّها الطلب** ───────────────────
//
// ══ العطبُ الذي تغلقه ═══════════════════════════════════════════════════
// المريضُ العائد يملك **أكثر من جهاز**: طرفٌ سُلِّم قبل سنتين، وطلبٌ ثانٍ
// اليوم. وفحصُ «هل لهذا المريض طلبُ خصمٍ معلَّق؟» بـ(مريض + قسم) وحدهما
// يخلط الجهازين: **خصمٌ معلَّقٌ على الجهاز الأول يمنع تصحيحَ سعر الثاني**،
// وبيعٌ اكتمل على الأول يجمّد الثاني — ولا علاقة لأحدهما بالآخر.
//
// فالهويّةُ **دقيقة**: مرجعُ المتابعة نفسِها، أو مرجعُ حلقتها. ولا مرجعَ
// جديد يُخترَع — هذه هي المراجعُ التي تكتبها النقاطُ أصلاً منذ ٠٥٨.

/** طلبٌ وُلد من نافذة «اشترى» — مربوطٌ بمتابعةٍ بعينها. */
export const followupDiscountRef = (followupId: number | string) =>
  `followup:${followupId}`;

/** وطلبٌ وُلد من «تخصيص» على حلقةٍ حيّة — مربوطٌ بالحلقة. */
export const episodeDiscountRef = (episodeId: number | string) =>
  `episode:${episodeId}`;

/**
 * وطلبٌ وُلد من «تخصيص» بلا حلقة — مريضٌ قديم، **جهازُه واحدٌ بالتعريف**
 * إذ لا حلقةَ تميّز جهازاً عن آخر.
 */
export const serviceDiscountRef = (serviceType: string) => `service:${serviceType}`;

/** وصيانةٌ بخصم — مرجعُها نوعُ الخدمة، ولا تلتقي بمسار البيع. */
export const maintenanceDiscountRef = (serviceType: string) =>
  `maintenance:${serviceType}`;

/**
 * و«خدمة جديدة» بخصم — **مرجعُها رمزُ الإرسالة نفسه**.
 *
 * النموذجُ يسكّ رمزاً حين يُفتَح ويرسله مع الطلب (`submission_tokens`)، فضغطةٌ
 * واحدة = خدمةٌ واحدة. والمرجعُ هنا هو ذلك الرمزُ بعينه، فتصير **الضغطةُ
 * الواحدة = طلبَ خصمٍ واحداً** أيضاً: إعادةُ الإرسال بعد انقطاع شبكة، أو
 * ضغطتان متتاليتان، لا تُنتجان طلبين على المدير أن يفرّق بينهما — يردّهما
 * فهرسُ التفرّد في ٠٥٨ على (مريض، قسم، مرجع).
 *
 * ولمن لا رمزَ معه (عميلٌ قديم) مرجعٌ ثابتٌ بنوع الخدمة: يسمح بطلبٍ معلَّقٍ
 * واحد لهذا النوع في كلّ لحظة — حارسٌ أوسع، لكنه حارسٌ لا فراغ.
 */
export const newServiceDiscountRef = (
  submissionToken: string | null | undefined, serviceType: string,
) => {
  const t = typeof submissionToken === "string" ? submissionToken.trim() : "";
  return t ? `new_service:${t}` : `new_service:${serviceType}`;
};

/**
 * **المراجعُ التي تعني «هذا الجهاز بعينه»** — لفحص «هل عليه طلبٌ معلَّق؟».
 *
 * متابعةٌ واحدة قد يُفتَح عليها طلبٌ من بابين: نافذةُ «اشترى» (مرجعُ
 * المتابعة) أو «تخصيص» على حلقتها (مرجعُ الحلقة). وكلاهما **الجهازُ نفسُه**.
 *
 * ومَن لا حلقةَ له يُضاف مرجعُ الخدمة: لا يوجد جهازٌ ثانٍ يخلط به.
 */
export function deviceDiscountRefs(params: {
  followupId: number | string;
  deviceEpisodeId?: number | string | null;
  serviceType: string;
}): string[] {
  const refs = [followupDiscountRef(params.followupId)];
  if (params.deviceEpisodeId !== null && params.deviceEpisodeId !== undefined) {
    refs.push(episodeDiscountRef(params.deviceEpisodeId));
  } else {
    refs.push(serviceDiscountRef(params.serviceType));
  }
  return refs;
}
