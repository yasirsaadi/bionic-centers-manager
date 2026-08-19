// متابعةُ ما بعد المعاينة — الحالات والأسباب والصلاحيات، **منطقٌ خالص**.
//
// بلا شبكة ولا قاعدة بيانات، فيُختبَر وحده ويُستعمل في الخادم والواجهة معاً.
// وهذا مقصود: قاعدةُ «مَن يعتمد السعر» إن كُتبت مرّتين انحرفت مرّة — فتُخفي
// الواجهةُ زرّاً يقبله الخادم، أو تعرض زرّاً يردّه.
//
// **والحراسة في الخادم لا هنا**: ما في هذا الملفّ يُستعمل للعرض وللقرار
// معاً، لكن الفاعل يُقرأ من الجلسة الموقَّعة في الخادم دائماً.

export const FOLLOWUP_STATUSES = [
  "awaiting_patient_decision",
  "follow_up",
  "price_approval_pending",
  "price_approved_waiting_patient",
  "purchase_approval_pending",
  "closed_without_purchase",
  "converted",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  awaiting_patient_decision: "بانتظار قرار المريض",
  follow_up: "مؤجَّل — متابعة",
  //  المفتاحان يبقيان كما هما في القاعدة — لا ترحيلَ لقيم الحالات ولا
  //  إعادةَ كتابةِ تاريخ. والتسميةُ وحدها تتبع المعنى الجديد.
  price_approval_pending: "بانتظار اعتماد الخصم",
  price_approved_waiting_patient: "بانتظار قرار المريض بعد اعتماد الخصم",
  //  توافقٌ رجعي: لا يدخلها ملفٌّ جديد، والصفوف المحتجزة تُؤكَّد بضغطة.
  purchase_approval_pending: "محتجز قبل التبسيط — أكّد الشراء",
  closed_without_purchase: "مغلق بدون شراء",
  converted: "تحوّل إلى تصنيع",
};

/** الحالتان النهائيّتان — لا متابعةَ بعدهما إلّا بإعادة فتح. */
export const TERMINAL_STATUSES: FollowupStatus[] = ["closed_without_purchase", "converted"];
export const isTerminal = (s: string): boolean =>
  TERMINAL_STATUSES.includes(s as FollowupStatus);

// ── أسباب التأجيل/الإغلاق ────────────────────────────────────────────────
// **سببٌ منظَّم لا حالةٌ منفصلة**: «ينتظر راتباً» و«يقارن مراكز» كلاهما
// تأجيل، واختلافهما بيانٌ للتقرير لا مسارٌ آخر في الشيفرة.
export const FOLLOWUP_REASONS = [
  "price", "needs_time", "waiting_salary_or_finance", "family_decision",
  "comparing_options", "chose_other_center", "not_convinced",
  "health_condition", "cannot_reach", "not_interested_now", "other",
] as const;
export type FollowupReason = (typeof FOLLOWUP_REASONS)[number];

export const FOLLOWUP_REASON_LABELS: Record<FollowupReason, string> = {
  price: "السعر",
  needs_time: "يحتاج وقتاً للتفكير",
  waiting_salary_or_finance: "بانتظار الراتب أو التمويل",
  family_decision: "قرار العائلة",
  comparing_options: "يقارن خيارات أخرى",
  chose_other_center: "اختار مركزاً آخر",
  not_convinced: "غير مقتنع",
  health_condition: "وضعه الصحّي",
  cannot_reach: "تعذّر الوصول إليه",
  not_interested_now: "غير مهتمّ حالياً",
  other: "سبب آخر",
};

export const isFollowupReason = (v: unknown): v is FollowupReason =>
  typeof v === "string" && (FOLLOWUP_REASONS as readonly string[]).includes(v);

// ── الخصم: أسبابُه وحسابُه ───────────────────────────────────────────────
//
// **الخصمُ ليس «تعديلَ سعر»**، ولذلك أسبابُه قائمةٌ مستقلّة عن أسباب
// التأجيل: تلك تقول لماذا لم يشترِ المريض بعد، وهذه تقول لماذا نبيعه بأقلّ.

export const DISCOUNT_REASONS = [
  "doctor_instruction", "patient_negotiation", "financial_hardship",
  "competitor_price", "management_exception", "campaign_or_offer", "other",
] as const;
export type DiscountReason = (typeof DISCOUNT_REASONS)[number];

export const DISCOUNT_REASON_LABELS: Record<DiscountReason, string> = {
  doctor_instruction: "توجيه الطبيب",
  patient_negotiation: "مفاوضة المريض",
  financial_hardship: "حالة مادّية صعبة",
  competitor_price: "سعر مركز منافس",
  management_exception: "استثناء إداري",
  campaign_or_offer: "حملة أو عرض",
  other: "سبب آخر",
};

export const isDiscountReason = (v: unknown): v is DiscountReason =>
  typeof v === "string" && (DISCOUNT_REASONS as readonly string[]).includes(v);

/**
 * **«توجيه الطبيب» سببٌ لا تفويض.**
 *
 * الطبيبُ يقول للموظّف شفهياً «اخصم له مئتين» — فيُسجَّل ذلك سبباً موثَّقاً
 * ويبقى الطلبُ معلَّقاً حتى يعتمده مخوَّلٌ **غيرُ صاحب الطلب**. ولو جعلناه
 * تفويضاً لصار كلُّ خصمٍ يمرّ بجملةٍ لا أثرَ لها في السجلّ.
 */
export const DISCOUNT_REASON_IS_NOT_AUTHORIZATION = "doctor_instruction" as const;

export const DISCOUNT_MODES = ["amount", "percentage"] as const;
export type DiscountMode = (typeof DISCOUNT_MODES)[number];

export const DISCOUNT_MODE_LABELS: Record<DiscountMode, string> = {
  amount: "مبلغ بالدينار",
  percentage: "نسبة مئوية",
};

export const isDiscountMode = (v: unknown): v is DiscountMode =>
  typeof v === "string" && (DISCOUNT_MODES as readonly string[]).includes(v);

/**
 * ترجمةُ سببِ المتابعة القديم إلى سببِ خصم — **لنافذةٍ مفتوحةٍ قبل النشر**.
 *
 * صفحةٌ لم تُحدَّث ترسل سبباً من مفردات التأجيل (`FOLLOWUP_REASONS`) لأن
 * ذلك كان ما تعرضه. فيُترجَم **حتمياً** لا عشوائياً، **والأصلُ يُحفظ** في
 * حمولة الحدث وفي الملاحظة معاً — فلا يضيع ما قاله الموظّف فعلاً.
 *
 * وما لا يقابله شيءٌ بعينه يقع في `other`: تخمينُ سببٍ أدقّ من نصٍّ لا
 * يحمله كذبٌ على التقرير.
 */
export const LEGACY_REASON_TO_DISCOUNT: Record<string, DiscountReason> = {
  price: "patient_negotiation",
  not_convinced: "patient_negotiation",
  comparing_options: "competitor_price",
  chose_other_center: "competitor_price",
  waiting_salary_or_finance: "financial_hardship",
};

export function discountReasonFromLegacy(v: unknown): DiscountReason {
  //  سببُ خصمٍ صحيحٌ يمرّ كما هو: عميلٌ نصفُ محدَّث قد يرسله.
  if (isDiscountReason(v)) return v;
  if (typeof v === "string" && LEGACY_REASON_TO_DISCOUNT[v]) {
    return LEGACY_REASON_TO_DISCOUNT[v];
  }
  return "other";
}

export interface DiscountComputation {
  ok: boolean;
  /** رسالةُ الرفض بالعربية — تُعرض في النموذج وتُرجعها النقطة نفسها. */
  error?: string;
  /** الخصمُ بالدينار بعد التقريب. */
  discountAmount: number;
  /** السعر بعد الخصم. */
  finalPrice: number;
  /** النسبةُ المكافئة — للعرض، بمنزلتين. */
  percentage: number;
}

/**
 * حسابُ الخصم وتحقّقُه — **قاعدةٌ واحدة للواجهة وللخادم**.
 *
 * ══ لماذا هنا لا في كلٍّ منهما ══════════════════════════════════════════
 * لو كُتب الحدّان مرّتين لانحرفا مرّة: نموذجٌ يقبل ٩٩٪ ويردّه الخادم، أو
 * أسوأ — نموذجٌ يمنع والخادم يقبل فيمرّ خصمٌ لا يجوز من نداءٍ مباشر.
 * والمعاينةُ سعرٌ وقّعه طبيب، فالحدُّ عليه يُكتب مرّةً واحدة.
 *
 * ══ والقواعد كلُّها هنا ═════════════════════════════════════════════════
 * • **خصمٌ فقط**: السعرُ النهائي أقلُّ من الحالي دائماً. رفعُ السعر ليس
 *   خصماً ولا يمرّ من هذا الباب إطلاقاً.
 * • ولا صفرَ ولا سالب: «خصمٌ بصفر» طلبُ اعتمادٍ بلا مضمون.
 * • والنسبةُ بين صفر ومئة حصراً — ومئةٌ تعني جهازاً مجّانياً، وهو قرارٌ
 *   لا يمرّ بنافذة خصم.
 * • والنهائيُّ موجبٌ دائماً: صفرٌ يجعل «تخصيص» يحجز بيعاً بلا مال.
 * • والتقريبُ إلى الدينار الصحيح — لا كسورَ في نظامٍ كلُّ أعمدته صحيحة.
 *
 * والتقريبُ يقع على **مبلغ الخصم** لا على السعر النهائي، فيبقى
 * `final = current − discount` صحيحاً بالضبط ولا يتولّد دينارُ فرقٍ يظهر
 * لاحقاً في مصالحة الدفتر.
 */
export function computeDiscount(params: {
  currentPrice: number; mode: string; value: number;
}): DiscountComputation {
  const nil: DiscountComputation = { ok: false, discountAmount: 0, finalPrice: 0, percentage: 0 };
  const current = Number(params.currentPrice);
  if (!Number.isFinite(current) || current <= 0) {
    return { ...nil, error: "لا يوجد سعر معتمد لهذا الجهاز — لا يمكن حساب خصم عليه" };
  }
  if (!isDiscountMode(params.mode)) {
    return { ...nil, error: "نوع الخصم يجب أن يكون مبلغاً أو نسبة" };
  }
  const value = Number(params.value);
  if (!Number.isFinite(value)) return { ...nil, error: "قيمة الخصم غير صالحة" };
  if (value <= 0) return { ...nil, error: "قيمة الخصم يجب أن تكون أكبر من صفر" };

  let discountAmount: number;
  if (params.mode === "percentage") {
    if (value >= 100) return { ...nil, error: "نسبة الخصم يجب أن تكون أقل من ١٠٠٪" };
    discountAmount = Math.round((current * value) / 100);
  } else {
    if (!Number.isInteger(value)) {
      return { ...nil, error: "مبلغ الخصم يجب أن يكون بالدينار الصحيح" };
    }
    discountAmount = value;
  }

  //  تقريبُ نسبةٍ صغيرة جدّاً قد يعطي صفراً — فيُردّ صراحةً لا يُمرَّر.
  if (discountAmount <= 0) return { ...nil, error: "قيمة الخصم يجب أن تكون أكبر من صفر" };
  if (discountAmount >= current) {
    return { ...nil, error: "مبلغ الخصم يجب أن يكون أقل من السعر المعتمد" };
  }
  const finalPrice = current - discountAmount;
  if (finalPrice <= 0) return { ...nil, error: "السعر بعد الخصم يجب أن يكون أكبر من صفر" };

  return {
    ok: true, discountAmount, finalPrice,
    percentage: Math.round((discountAmount / current) * 10000) / 100,
  };
}

// ── الصلاحيات ────────────────────────────────────────────────────────────

export interface FollowupSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  branchId?: number | null;
  permissions?: Record<string, any> | null;
}

/**
 * مسؤولو المتابعة — **الأدوار الأربعة وحدها**.
 *
 * ══ لماذا الدور لا القدرة ═══════════════════════════════════════════════
 * `canAddPatients` تُمنح لحساباتٍ كثيرة لأسبابٍ لا علاقة لها بالمتابعة —
 * محاسبٌ يسجّل مريضاً، أو مُدخِل جلسات. فجعلُها بوّابةً كان يفتح ملفّ
 * المتابعة (السعر المعتمد، هاتفُ المريض، سببُ ترّدده، ملاحظاتُ المفاوضة)
 * لمن لا شأن له به. والقاعدة هنا **بالدور**: مَن يتابع المريض فعلاً.
 *
 * وخبيرُ الأطراف خارجها: هو المنفّذ لا المتابِع، ومحجوبٌ مالياً في كل
 * النظام — فلا تصير المتابعة قناته الجانبية إلى الأسعار.
 */
function isFollowupActor(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager" || s?.role === "reception") return true;
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * مَن **يقرأ** ملفّ المتابعة — نفس الأربعة.
 *
 * القراءة هنا ليست أخفّ من الكتابة: الملفّ يحمل السعر المعتمد وسببَ تردّد
 * المريض وهاتفَه. فبوّابةٌ واحدة للاثنين، والفرق في الفعل لا في مَن يدخل.
 */
export function canViewFollowup(s: FollowupSessionLike | null | undefined): boolean {
  return isFollowupActor(s);
}

/**
 * مَن يسجّل قرار المريض — **مسؤوليةُ فرعٍ لا مِلكُ موظّف**.
 *
 * فلا «مالك متابعة» إلزامي: مَن ردّ على الهاتف يسجّل. والتدقيق يحفظ الفاعل
 * في كلّ حدث، فالمسؤولية معروفة بلا أن تُحتكَر المتابعة بموظّفٍ إن غاب
 * تجمّد ملفّ المريض.
 */
export function canRecordFollowup(s: FollowupSessionLike | null | undefined): boolean {
  return isFollowupActor(s);
}

/**
 * مَن يعتمد **الخصم** — المسؤول العام · مديرُ الفرع · الطبيبُ المخوَّل.
 *
 * ══ لماذا دالّةٌ باسمها لا `canApprove` ═════════════════════════════════
 * `canApprove` اسمٌ لا يقول ماذا يُعتمَد، وقد حمل من قبلُ بوّابتين معاً
 * (السعر والشراء) فمرّ خلطُهما سنةً بلا أن ينتبه قارئ. والاسمُ الصريح
 * يجعل أيَّ توسيعٍ لاحقٍ مرئياً في موضع النداء.
 *
 * ══ ولماذا دخل مديرُ الفرع ═════════════════════════════════════════════
 * لأن **الخصم قرارٌ تجاري لا سريري**. الطبيبُ حدّد الجهازَ وسعرَه في سجلٍّ
 * مختوم؛ أمّا «نبيعه بأقلّ لأن المريض لا يقدر» فمسؤوليةُ مَن يدير الفرع
 * ويحاسَب على إيراده. وحصرُه بالطبيب كان يعطّل الفرعَ على مكالمةٍ لا قرارَ
 * طبّياً فيها.
 *
 * والطبيبُ يبقى معتمِداً كذلك: كثيرٌ من الخصومات يقترحها هو، ومنعُه من
 * اعتماد خصمٍ اقترحه غيرُه لا معنى له.
 *
 * ══ ومَن خارجها ═══════════════════════════════════════════════════════
 * الاستقبال (يطلب ولا يعتمد) · المحاسب · المعالج · المسّاح · وخبيرُ
 * الأطراف المحجوب مالياً في كلّ النظام. ولا دورَ جديدٌ اختُرع لهذا.
 *
 * **والنطاقُ الجغرافي ليس هنا**: مديرُ الفرع والطبيب محدودان بفروعهما،
 * ويفرضه `canReachBranch` في النقطة من صفّ المتابعة نفسه لا من الطلب.
 */
export function canApproveDiscount(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager") return true;
  //  المقارنة صريحة: صلاحيةٌ غامضة القيمة تُقرأ «لا».
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * **لا يعتمد أحدٌ طلبَ نفسه** — ولا يرفضه.
 *
 * ══ لماذا الرفضُ ممنوعٌ كالاعتماد ══════════════════════════════════════
 * لأن المطلوب رأيٌ ثانٍ، لا نتيجةٌ بعينها. ومَن يملك أن يرفض طلبَه يملك
 * أن يسحبه من الطابور قبل أن يراه غيرُه، فيضيع أثرُ أنه طُلب أصلاً.
 * والسحبُ له بابُه: إغلاقُ الملفّ يُلغيه `cancelled` بمن ألغاه.
 *
 * وتُفرَض **في الخادم** على `requested_by` المحفوظ في الصفّ — لا على رقمٍ
 * يرسله المتصفّح. والواجهةُ تخفي الزرّ لأنها تقرأ القاعدة نفسها، لكنّ
 * الإخفاء تحسينُ عرضٍ لا حراسة.
 *
 * وطلبٌ قديمٌ بلا `requested_by` (صفٌّ ورثه النظام) لا يصطدم بها: لا صاحبَ
 * له يمكن أن يكون هو المعتمِد.
 */
export function isSelfDecision(
  requestedByUserId: number | null | undefined,
  actorUserId: number | null | undefined,
): boolean {
  return typeof requestedByUserId === "number"
    && typeof actorUserId === "number"
    && requestedByUserId === actorUserId;
}

/**
 * مَن يعتمد **تعديلَ سعرٍ قديماً** — طبيبٌ مخوَّل أو المسؤول العام حصراً.
 *
 * ══ لماذا بقيت هذه القاعدة حيّةً ولم تُوحَّد ═════════════════════════════
 * الصفُّ الذي `discount_mode` فيه فارغ **سابقٌ لهذه المرحلة**، وقد يكون
 * تعديلاً عامّاً — بل **رفعَ سعر**. وسلطةُ الخصم وُسِّعت لمديرِ الفرع لأن
 * الخصمَ قرارٌ تجاري؛ أمّا رفعُ سعرٍ وقّعه طبيبٌ فليس كذلك، ولا يجوز أن
 * يصير قابلاً للاعتماد بيدٍ لم تكن تملكه لحظةَ تقديمه.
 *
 * فالقاعدةُ تُقرأ **من نوع الصفّ لا من تاريخ اليوم**: صفٌّ قديمٌ يُحكَم
 * بقانون يومه، وصفُّ خصمٍ بقانونه. ولا صفَّ قديمٌ جديد يُخلَق بعد اليوم،
 * فهذا مسارٌ ينقرض بانقراض ما بقي معلَّقاً منه.
 *
 * وهي بالحرف ما كانت عليه `canApprove` قبل هذه المرحلة.
 */
export function canApproveLegacyPriceChange(
  s: FollowupSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  //  المقارنة صريحة: صلاحيةٌ غامضة القيمة تُقرأ «لا».
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * الاسمُ القديم — مُبقىً للتوافق، ومطابقٌ لـ`canApproveLegacyPriceChange`.
 *
 * @deprecated استعمل `canApproveDiscount` للخصم الجديد، أو
 * `canApproveLegacyPriceChange` للصفوف القديمة. والاسمُ العاري لا يقول
 * ماذا يُعتمَد — وهذا ما جعله يحمل بوّابتين معاً من قبل.
 */
export const canApprove = canApproveLegacyPriceChange;

/**
 * مَن يقرّر **هذا الطلب بعينه** — تُقرأ من نوع الصفّ لا من تاريخ اليوم.
 *
 * نقطةُ الحقيقة الواحدة التي تنادِيها الواجهةُ والخادم معاً، فلا تعرض
 * الشاشةُ زرّاً يردّه الخادم ولا العكس.
 *
 * @param isLegacy الصفُّ بلا `discount_mode` — سابقٌ لهذه المرحلة.
 * @param requestedByUserId صاحبُ الطلب. **يُطبَّق على الجديد وحده**: منعُ
 *   اعتماد النفس قاعدةٌ وُضعت الآن، وتطبيقُها بأثرٍ رجعيّ على صفٍّ قديم
 *   قد يجمّده إلى الأبد إن كان طالبُه هو المخوَّل الوحيد في فرعه.
 */
export function canDecidePriceRequest(params: {
  session: FollowupSessionLike | null | undefined;
  isLegacy: boolean;
  requestedByUserId?: number | null;
}): boolean {
  if (params.isLegacy) return canApproveLegacyPriceChange(params.session);
  return canApproveDiscount(params.session)
    && !isSelfDecision(params.requestedByUserId, params.session?.userId);
}

/**
 * مَن يؤكّد أن **المريض اشترى** فيبدأ التصنيع — الاستقبال ومديرُ الفرع
 * والطبيبُ والمسؤول.
 *
 * ══ لماذا فُصلت عن `canApprove` ════════════════════════════════════════
 * لأن الفعلين مختلفان في طبيعتهما لا في درجتهما. **تعديلُ السعر اعتماد**:
 * رقمٌ وقّعه الطبيب يُطلب تغييرُه، فيلزم مَن يملك تغييره. أمّا **«اشترى»
 * فتسجيلُ واقعة**: المريض وقف أمام الموظّف وقال نعم بالسعر المعتمد نفسه،
 * بلا تغيير حرف. ولا سلطةَ تُستأذَن لتسجيل ما وقع.
 *
 * وخلطُهما كلّف عملياً: كان الموظّف يسجّل موافقة المريض فيقف الملفّ عند
 * «بانتظار اعتماد الشراء» بلا زرٍّ واحد بيده، حتى يفرغ طبيبٌ لضغطة لا
 * قرارَ سريرياً فيها. والمريضُ ينتظر، **ودفعتُه تُردّ** لأن كلفته لم
 * تُقيَّد بعد.
 *
 * **والسعر لا يزال محروساً**: مَن يريد سعراً آخر يمرّ بطلب تعديلٍ يعتمده
 * `canApprove`. فالمفتوح هو تسجيلُ البيع بالسعر المعتمد، لا تغييرُه.
 *
 * وهي **دالّةٌ مستقلّة لا اسمٌ ثانٍ** لـ`canRecordFollowup`: تطابقُهما اليوم
 * مصادفةٌ في القيمة لا في المعنى، وربطُهما كان سيجعل أيَّ تضييقٍ لاحقٍ على
 * التسجيل يغلق البيع معه بلا أن ينتبه أحد.
 */
export function canConfirmPurchase(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "reception" || s?.role === "branch_manager") return true;
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * هل يجوز لهذه الجلسة اختيار/تغيير الخبير على متابعةٍ في هذه الحالة؟
 *
 * ══ لماذا لا تُشتقّ من `allowedActions` ═════════════════════════════════
 * كانت الواجهة تعرض زرّ الخبير حين `actions.length > 0` — فاختفى عن
 * الاستعلامات في `price_approval_pending` و`purchase_approval_pending`
 * لأن قائمتَهما فارغة هناك (الاعتماد للطبيب). فتجمّد اختيارُ الخبير في
 * الحالتين اللتين هو فيهما ألزمُ ما يكون: البيع على وشك أن يُعتمد، ولا
 * خبيرَ محفوظ — والخادم يقبل التغيير أصلاً.
 *
 * فالبوّابة **صلاحيةُ المتابعة نفسها + حياةُ الملفّ**، لا قائمةُ الأزرار.
 * وهي مطابقةٌ حرفياً لما تقبله نقطة `POST /api/followups/:id/expert`.
 */
export function canSelectExpert(
  s: FollowupSessionLike | null | undefined, status: string,
): boolean {
  //  والمنتهيتان خارجها: المُحوَّل صار له أمرُ تصنيعٍ يُحوَّل خبيرُه من
  //  نقطة إعادة الإسناد بحُرّاسها، والمغلق لا شيء يُسنَد فيه.
  return canRecordFollowup(s) && !isTerminal(status);
}

/**
 * الأزرار المسموحة لهذه الجلسة على متابعةٍ في هذه الحالة.
 *
 * والمسارُ اليومي **ثلاثةُ أفعالٍ وبابٌ للخصم**: اشترى · لم يشترِ · يحتاج
 * متابعة · طلبُ خصم. لا خطوةَ اعتمادِ شراءٍ بينها ولا انتظارَ أحد.
 *
 * @param pending الطلبُ المعلَّق إن وُجد — نوعُه وصاحبُه. فأزرارُ القرار
 *   تتبع **نوع الصفّ**: صفٌّ قديم بسلطته القديمة، وصفُّ خصمٍ بسلطته
 *   الجديدة وبمنع اعتماد النفس. والخادمُ يفرض ذلك كلَّه، وهذا عرضٌ لا حراسة.
 */
export function allowedActions(
  s: FollowupSessionLike | null | undefined, status: string,
  pending?: { isLegacy?: boolean; requestedByUserId?: number | null } | number | null,
): string[] {
  //  توافقٌ مع النداء القديم الذي كان يمرّر رقمَ الطالب مباشرةً.
  const p = typeof pending === "number" || pending === null || pending === undefined
    ? { isLegacy: false, requestedByUserId: pending ?? null }
    : pending;
  const out: string[] = [];
  const mayRecord = canRecordFollowup(s);
  const mayDecide = canDecidePriceRequest({
    session: s, isLegacy: Boolean(p.isLegacy), requestedByUserId: p.requestedByUserId,
  });
  const mayConfirm = canConfirmPurchase(s);

  if (status === "awaiting_patient_decision" || status === "follow_up") {
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("defer", "close", "request_discount");
  } else if (status === "price_approval_pending") {
    //  المتابِع يرى «بانتظار الاعتماد» ولا زرّ له — والمخوَّلُ يقرّر.
    //  والفعلان يحملان اسمَ نوعِ الصفّ، فلا تقول الشاشةُ «خصم» لتعديلٍ عامّ.
    if (mayDecide) {
      out.push(...(p.isLegacy
        ? ["approve_price", "reject_price"]
        : ["approve_discount", "reject_discount"]));
    }
  } else if (status === "price_approved_waiting_patient") {
    //  اعتمادُ الطبيب للتخفيض **ليس شراءً**: يبقى أن يوافق المريض فعلاً —
    //  ثم يؤكّده الموظّف مباشرةً بلا عودةٍ إلى الطبيب.
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("defer", "close");
  } else if (status === "purchase_approval_pending") {
    // ══ توافقٌ رجعي لا مسارٌ حيّ ═══════════════════════════════════════
    // لا يدخلها ملفٌّ جديد بعد اليوم. والصفوف المحتجزة فيها من قبلُ تصير
    // **قابلةً للعمل فوراً** بيد الاستقبال: يؤكّد الشراء فتتحوّل كغيرها،
    // أو يغلقها إن عدل المريض. بلا ترحيلِ بيانات ولا إعادةِ كتابة تاريخ.
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("close");
  } else if (status === "closed_without_purchase") {
    if (mayRecord) out.push("reopen");
  }
  return out;
}
