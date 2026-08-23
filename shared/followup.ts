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
  //  ══ **طرفيّةٌ ثالثة** (ترحيل ٠٦١) — أُلغيت المعاينةُ التي وُلدت عنها ══
  //  ولا تُوسَم `closed_without_purchase`: معناها المعروض «مغلق بدون شراء»،
  //  والمريضُ لم يرفض الشراء — بل سقطت المعاينةُ نفسُها. وسجلٌّ يقول سبباً
  //  لم يقع أسوأُ من سجلٍّ صامت.
  "closed_exam_cancelled",
  //  ══ **طرفيّةٌ رابعة** (ترحيل ٠٦٤) — صحّحت الإدارةُ عمليةً خاطئة ══════
  //  ولا `closed_without_purchase`: المريضُ لم يرفض شيئاً. ولا
  //  `closed_exam_cancelled`: لم تسقط معاينةٌ سريرياً — بل بطلت العمليةُ
  //  التجارية كلُّها بقرارٍ إداريّ مدقَّق.
  "closed_admin_void",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  awaiting_patient_decision: "بانتظار قرار المريض",
  follow_up: "مؤجَّل — متابعة",
  //  ══ الحالتان التاليتان **توافقٌ رجعي لا مسارٌ حيّ** ══════════════════
  //  لا يدخلهما ملفٌّ جديد بعد اليوم: تغييرُ السعر التجاري صار قراراً
  //  مباشراً لمدير الفرع لا طلباً يُعتمَد. والصفوف المحتجزة فيهما تُحسَم
  //  بمسارها القديم حتى تنفد — بلا ترحيلِ بياناتٍ ولا إعادةِ كتابة تاريخ.
  price_approval_pending: "محتجز قبل التبسيط — بانتظار اعتماد السعر",
  price_approved_waiting_patient: "بانتظار تأكيد المريض بعد تعديل السعر",
  purchase_approval_pending: "محتجز قبل التبسيط — أكّد الشراء",
  closed_without_purchase: "مغلق بدون شراء",
  closed_exam_cancelled: "أُغلقت بسبب إلغاء المعاينة",
  closed_admin_void: "ملغاة إدارياً",
  //  **«تحوّل إلى تصنيع» كانت تصف الآلة لا الواقعة.** والواقعةُ التي تهمّ
  //  الموظّف: المريضُ اشترى، والجهازُ بدأ. والاسمُ المخزَّن `converted` كما
  //  هو — النصُّ المقروء وحده تغيّر.
  converted: "تم الشراء — بدأ التصنيع",
};

/**
 * الحالاتُ التي لم يعد يدخلها ملفٌّ جديد — **قراءةٌ وحسمٌ لا إنشاء**.
 *
 * تُستعمل للعرض («محتجز قبل التبسيط») وللاختبار الذي يمنع عودتها. ولا
 * تُحذف من `FOLLOWUP_STATUSES`: صفوفٌ حيّة تحملها اليوم، وحذفُها من القائمة
 * كان سيجعل الشاشة تعجز عن تسميتها.
 */
export const LEGACY_ONLY_STATUSES: FollowupStatus[] = [
  "price_approval_pending",
  "price_approved_waiting_patient",
  "purchase_approval_pending",
];

/**
 * مرشِّحاتُ شاشة المتابعة — **أربعةٌ حيّة وسلّةٌ للقديم**.
 *
 * كانت الشاشةُ تعرض كلَّ حالةٍ في القاعدة مرشِّحاً مستقلاً، فقرأها الموظّف
 * كلوحةِ إدارةِ آلةِ حالات لا كطابورِ عمل. والمسارُ الحيّ اليوم ثلاثُ
 * محطّات لا أكثر: ينتظر قراره · قرّر ويريد الإكمال · لم يشترِ.
 *
 * و`legacy` سلّةٌ واحدة تجمع الحالات الموروثة الثلاث — تُقرأ ولا تتصدّر.
 */
export const FOLLOWUP_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "awaiting_patient_decision", label: "بانتظار قرار المريض" },
  { key: "wants_purchase", label: "يرغب بالشراء — أكمل البيع" },
  { key: "closed_without_purchase", label: "مغلق بدون شراء" },
  { key: "legacy", label: "حالات قديمة" },
];

/** الحالاتُ النهائيّة — لا متابعةَ بعدها إلّا بإعادة فتح. */
export const TERMINAL_STATUSES: FollowupStatus[] = [
  "closed_without_purchase", "converted", "closed_exam_cancelled",
  "closed_admin_void",
];
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

// ── مصدرُ السعر المعتمد ──────────────────────────────────────────────────
//
// **مَن قال هذا الرقم** — سؤالٌ يبقى بعد أن يُنسى كلُّ شيء آخر.
export const PRICE_SOURCES = [
  "exam", "manager_set", "approved_change", "reception_set",
] as const;
export type PriceSource = (typeof PRICE_SOURCES)[number];

export const PRICE_SOURCE_SHORT: Record<PriceSource, string> = {
  exam: "من المعاينة",
  manager_set: "حدّده مدير الفرع",
  //  توافقٌ رجعي: اعتمادٌ حُسم بالمسار القديم. **ولا يُسمّى «مدير الفرع»**
  //  لأن مَن اعتمده يومَها كان طبيباً أو مسؤولاً.
  approved_change: "بعد تعديل سعر سابق",
  //  **أولُ سعرٍ حين سكتت المعاينة** — ليس خصماً ولا قرارَ مدير. وله اسمُه
  //  هو: خلطُه بـ`manager_set` كان سيجعل السجلّ ينسب إلى المدير رقماً لم يره.
  //
  //  **والقيمةُ في القاعدة بقيت `reception_set`** — الصفوفُ المكتوبة تحمله،
  //  وتغييرُه كان يعني ترحيلاً لا يشتري شيئاً. أمّا **النصُّ المقروء** فصار
  //  محايداً: البابُ فُتح لكلّ مَن يُتمّ البيع (استقبالٌ ومحاسبٌ وطبيبٌ
  //  ومديرٌ ومسؤول)، فعبارةُ «أدخله الاستعلامات» صارت تكذب على قارئ السجلّ
  //  في أربع حالاتٍ من خمس. ومَن أدخله **بالاسم** في حدث `initial_price_set`
  //  وفي `audit_log` — وهو الموضع الذي يُسأل فيه عن الشخص.
  reception_set: "أُدخل عند إتمام البيع",
};

export const isPriceSource = (v: unknown): v is PriceSource =>
  typeof v === "string" && (PRICE_SOURCES as readonly string[]).includes(v);

/** «بعد الخصم» ونحوه — وقيمةٌ لا تُعرَف تُقرأ «من المعاينة» ولا تُخترَع. */
export function priceSourceShort(v: unknown): string {
  return PRICE_SOURCE_SHORT[isPriceSource(v) ? v : "exam"];
}
/** العبارةُ الكاملة — **مشتقّةٌ لا مكرَّرة**، فلا تنحرف نسختان. */
export function priceSourceLabel(v: unknown): string {
  return `السعر المعتمد ${priceSourceShort(v)}`;
}

/**
 * **مَن يُدخل أولَ سعرٍ للجهاز حين سكتت المعاينة.**
 *
 * كلُّ مَن يُتمّ البيع — استقبالٌ ومديرٌ وطبيبٌ مخوَّل ومسؤول. لأن هذا ليس
 * تخفيضاً ولا قراراً مالياً استثنائياً، بل **إعلانُ السعر الطبيعي** الذي
 * تركه الطبيبُ فارغاً. وإيقافُ المريض على مدير الفرع لسهوِ حقلٍ في المعاينة
 * عقوبةٌ له على ما لا شأن له به.
 *
 * **والحارسُ الحقيقيّ في الخادم شرطٌ لا دور**: لا تُقبل الكتابة إلّا حين
 * يكون السعر المعتمد **صفراً**. فمتى وُجد سعرٌ موجب صار تخفيضُه خصماً يمرّ
 * ببابه، ورفعُه قرارَ مديرٍ يمرّ بـ`canSetCommercialPrice`.
 */
export function canSetInitialCommercialPrice(
  s: FollowupSessionLike | null | undefined,
): boolean {
  return canConfirmPurchase(s);
}

// ── السعر التجاري ────────────────────────────────────────────────────────

export interface CommercialPriceChange {
  ok: boolean;
  /** رسالةُ الرفض بالعربية — تُعرض في النموذج وتُرجعها النقطة نفسها. */
  error?: string;
  previousPrice: number;
  finalPrice: number;
  /** موجبٌ إن ارتفع، سالبٌ إن انخفض — والصفرُ يعني «لم يتغيّر». */
  difference: number;
  /** نسبةُ الفرق إلى السعر السابق، بمنزلتين. صفرٌ إن كان السابق صفراً. */
  percentageDifference: number;
  /** هل تغيّر فعلاً؟ وهو ما يجعل السببَ إلزامياً. */
  changed: boolean;
}

/**
 * تحقّقُ السعر التجاري وحسابُ فرقه — **قاعدةٌ واحدة للشاشة وللخادم**.
 *
 * ══ لماذا لا حدَّ أعلى ولا أدنى غيرَ الصفر ══════════════════════════════
 * لأن هذا **قرارٌ تجاري لا حسابٌ رياضي**. مريضٌ عاد بعد سنةٍ والأسعار
 * تغيّرت فيها مرّتين: سعرُه اليوم قد يفوق ما قالته معاينتُه القديمة، وليس
 * في ذلك خطأ. وحدُّ «أقلَّ من المعاينة» كان سيمنع بيعاً مشروعاً ويدفع
 * الموظّف إلى الالتفاف — والالتفافُ لا يُدقَّق.
 *
 * فالحدُّ الوحيد أن يكون موجباً بالدينار الصحيح: صفرٌ يجعل «تخصيص» يحجز
 * بيعاً بلا مال، وكسرُ الدينار لا مكان له في نظامٍ كلُّ أعمدته صحيحة.
 *
 * ══ ولماذا السبب إلزاميٌّ عند التغيير وحده ══════════════════════════════
 * تأكيدُ السعر كما هو ليس قراراً يُبرَّر. أمّا تغييرُه فمال، ومَن يقرأ
 * الصفَّ بعد سنة يحتاج أن يعرف لماذا — لا أن يستنتج.
 */
export function computeCommercialPrice(params: {
  previousPrice: number; finalPrice: number;
}): CommercialPriceChange {
  const previous = Number(params.previousPrice);
  const nil: CommercialPriceChange = {
    ok: false, previousPrice: Number.isFinite(previous) ? previous : 0,
    finalPrice: 0, difference: 0, percentageDifference: 0, changed: false,
  };
  const final = Number(params.finalPrice);
  if (!Number.isFinite(final)) return { ...nil, error: "السعر النهائي غير صالح" };
  if (!Number.isInteger(final)) {
    return { ...nil, error: "السعر النهائي يجب أن يكون بالدينار الصحيح" };
  }
  if (final <= 0) return { ...nil, error: "السعر النهائي يجب أن يكون أكبر من صفر" };

  const difference = final - previous;
  return {
    ok: true, previousPrice: previous, finalPrice: final, difference,
    //  والقسمةُ على صفرٍ لا تُنتج `Infinity` في سجلٍّ يُقرأ: سعرٌ سابقٌ صفرٌ
    //  يعني «لم يُسعَّر بعد»، ونسبةُ الفرق إليه بلا معنى فتبقى صفراً.
    percentageDifference: previous > 0
      ? Math.round((difference / previous) * 10000) / 100 : 0,
    changed: difference !== 0,
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
 * مَن **يقرأ** ملفّ المتابعة — الأربعة، **والطبيبُ منهم**.
 *
 * الطبيبُ يحتاج أن يرى: أشترى مريضُه أم لا، وبكم، وأين وقف الملفّ. فحجبُ
 * القراءة عنه كان سيجعله يسأل الاستعلامات عن نتيجة قرارٍ هو مَن بدأه.
 *
 * ══ ولماذا الدور لا القدرة ═════════════════════════════════════════════
 * `canAddPatients` تُمنح لحساباتٍ كثيرة لأسبابٍ لا علاقة لها بالمتابعة —
 * محاسبٌ يسجّل مريضاً، أو مُدخِل جلسات. فجعلُها بوّابةً كان يفتح ملفّ
 * المتابعة (السعر المعتمد، هاتفُ المريض، سببُ ترّدده، ملاحظاتُ المفاوضة)
 * لمن لا شأن له به.
 *
 * وخبيرُ الأطراف خارجها: هو المنفّذ لا المتابِع، ومحجوبٌ مالياً في كل
 * النظام — فلا تصير المتابعة قناته الجانبية إلى الأسعار.
 *
 * ══ والمحاسبُ داخلها — **ليرى ما سيقبضه** ══════════════════════════════
 * هو أحدُ مَن يُتمّ البيع فعلياً في الفروع: المريضُ يقف عنده بالمال. فحجبُ
 * البطاقة عنه كان يعني أن يُتمّ بيعاً لا يراه. **ولا يفتح له ذلك شيئاً
 * آخر**: التأجيلُ والإغلاقُ وإعادةُ الفتح تبقى خارجه (`canActCommercially`).
 */
export function canViewFollowup(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager" || s?.role === "reception") return true;
  if (s?.role === "accountant") return true;
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * مَن **يعمل** في المتابعة التجارية — الاستقبالُ ومديرُ الفرع والطبيبُ
 * المخوَّل والمسؤول.
 *
 * ══ القاعدةُ الحاكمة: **يستطيع ولا يُطلَب منه** ══════════════════════════
 * **الطبيبُ لا يُشترَط لإتمام بيعٍ أبداً**، ولا حالةَ في هذا المسار تنتظره:
 * الاستقبالُ ومديرُ الفرع يُتمّان كلَّ شيءٍ وحدهما — تأجيلاً وإغلاقاً
 * وإعادةَ فتحٍ وتواصلاً وإسنادَ خبيرٍ وتأكيدَ شراء.
 *
 * لكنه **يستطيع أن يساعد**: مريضٌ واقفٌ أمامه يقول «اشتريتُ» والاستعلامات
 * مشغول — فيسجّلها بدل أن يُرسَل المريضُ ليقف في طابور. مرونةٌ تشغيلية لا
 * تبعيّة: مَن حضر عمل، ولا أحدَ ينتظر أحداً.
 *
 * ══ وما يبقى خارجه ═════════════════════════════════════════════════════
 * **السعرُ التجاري وحده** (`canSetCommercialPrice`): قرارُ «بكم نبيع» يبقى
 * لمن يدير الفرع ويحاسَب على إيراده. وطبيبٌ يحمل `isAdmin` يسعّر — بسلطته
 * لا بدوره.
 *
 * **وسلطةُ المسؤول تُفحَص أوّلاً** في كل بوّابةٍ هنا، فلا يُقيَّد بدورٍ عاديّ
 * يحمله. **والنطاقُ الجغرافي ليس هنا**: يفرضه `canReachBranch` في كل نقطة
 * من صفّ المتابعة نفسه لا من الطلب.
 */
export function canActCommercially(s: FollowupSessionLike | null | undefined): boolean {
  //  **سلطةُ المسؤول تُفحَص أوّلاً دائماً** — قبل أي قيدِ دور. فحسابٌ دورُه
  //  «طبيب» و`isAdmin` صحيحٌ يمرّ من هنا بسلطته لا بدوره.
  if (s?.isAdmin === true) return true;
  if (s?.role === "reception" || s?.role === "branch_manager") return true;
  //  والطبيبُ المخوَّل **يستطيع ولا يُطلَب منه**: يسدّ فراغاً حين يقف
  //  المريضُ أمامه والاستعلامات مشغول — ولا ينتظره أحد.
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * الاسمُ القديم — مُبقىً للتوافق ومطابقٌ لـ`canActCommercially`.
 *
 * @deprecated استعمل `canActCommercially`: الاسمُ الجديد يقول **أيَّ عملٍ**
 * تحرسه البوّابة، فيُقرأ موضعُ ندائه بلا رجوعٍ إلى تعريفها.
 */
export const canRecordFollowup = canActCommercially;

/**
 * مَن يحدّد **السعر التجاري النهائي** — مديرُ الفرع في فرعه، والمسؤول العام.
 *
 * ══ القاعدةُ التي يقوم عليها هذا كلُّه ═══════════════════════════════════
 * **الطبيبُ يملك القرار السريري، والفرعُ يملك القرار التجاري.**
 *
 * الطبيبُ حدّد الجهازَ وسعرَه المرجعيّ في سجلٍّ مختوم — وذلك عملُه وانتهى.
 * أمّا «بكم نبيعه لهذا المريض اليوم» فمسؤوليةُ مَن يدير الفرع ويحاسَب على
 * إيراده. وقرارُه **هو** التخويل: لا طلبَ يُقدَّم ولا اعتمادَ يُنتظَر ولا
 * طابورَ يمتلئ. فما كان ثلاث خطواتٍ وشخصين صار خطوةً وشخصاً واحداً.
 *
 * ══ ولماذا لا الاستقبال ════════════════════════════════════════════════
 * لأن الاستقبال **ينفّذ** البيع بالسعر المحفوظ ولا يضعه. وهذا هو الفصل
 * الوحيد الباقي في المسار — وهو الفصل الذي يهمّ فعلاً.
 *
 * **والنطاقُ الجغرافي ليس هنا**: يفرضه `canReachBranch` في النقطة من صفّ
 * المتابعة نفسه لا من الطلب، فمديرُ فرعٍ آخر يُردّ ولو كان مديراً.
 */
export function canSetCommercialPrice(
  s: FollowupSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  return s?.role === "branch_manager";
}

/**
 * مَن يسجّل **«اشترى — يرغب بإكمال البيع»** — الطبيبُ والاستقبالُ ومديرُ
 * الفرع والمسؤول.
 *
 * ══ قرارُ المريض لا بيعَه ═══════════════════════════════════════════════
 * المريض قال «نعم أريده». مَن سمعها يسجّلها: الطبيبُ وهو يخرج من غرفته،
 * أو موظّفُ الاستعلامات وقد وقف المريضُ أمامه بعدها. **ولا يُشترط أحدٌ
 * بعينه** — ولذلك البابُ مفتوحٌ لمن يتابع الملفّ كلِّه.
 *
 * **ولا يفعل شيئاً آخر إطلاقاً**: لا يسجّل بيعاً ولا يحرّك سعراً ولا يقيّد
 * كلفةً ولا يفتح تصنيعاً ولا يُسنِد خبيراً ولا يقبض ديناراً. إنما يرفع
 * رايةً تقول «هذا المريض ينتظر إتمام البيع» فتضعه في رأس الطابور.
 *
 * وتركُه — وهو الأغلب — **لا يعني أن المريض رفض**: يعني أن لا قرارَ سُجّل،
 * والملفّ يبقى «بانتظار قرار المريض» كما كان. فلا صمتَ يُقرأ رفضاً.
 */
export function canSignalPurchaseInterest(
  s: FollowupSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "reception" || s?.role === "branch_manager") return true;
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * مَن يحسم **طلبَ تعديل سعرٍ قديماً معلَّقاً** — طبيبٌ مخوَّل أو المسؤول.
 *
 * ══ توافقٌ رجعي لا مسارٌ حيّ ════════════════════════════════════════════
 * لا يُنشأ طلبٌ جديد بعد اليوم: تغييرُ السعر صار قراراً مباشراً لمدير
 * الفرع. لكنّ صفوفاً معلَّقةً قد تكون قائمةً لحظةَ النشر، ولا يجوز أن
 * تتجمّد. فتُحسَم **بقانون يومها**: مَن كان يملك اعتمادها يملكه، ومديرُ
 * الفرع يُردّ عنها كما كان يُردّ — لأنها قد تكون **رفعَ سعرٍ** وقّع الطبيبُ
 * على أصله.
 *
 * وهو مسارٌ ينقرض بانقراض ما بقي معلَّقاً منه.
 */
export function canDecideLegacyPriceRequest(
  s: FollowupSessionLike | null | undefined,
): boolean {
  if (s?.isAdmin === true) return true;
  //  المقارنة صريحة: صلاحيةٌ غامضة القيمة تُقرأ «لا».
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}

/**
 * الاسمُ القديم — مُبقىً للتوافق ومطابقٌ لـ`canDecideLegacyPriceRequest`.
 *
 * @deprecated السعرُ التجاري صار `canSetCommercialPrice`. وهذا الاسمُ العاري
 * لا يقول ماذا يُعتمَد — وهو ما جعله يحمل بوّابتين معاً من قبل.
 */
export const canApprove = canDecideLegacyPriceRequest;

/**
 * مَن يؤكّد أن **المريض اشترى** فيبدأ التصنيع — الاستقبالُ ومديرُ الفرع
 * والطبيبُ المخوَّل والمسؤول.
 *
 * ══ تسجيلُ واقعةٍ لا اعتماد ═══════════════════════════════════════════
 * المريض وقف أمام الموظّف وقال نعم بالسعر المحفوظ نفسه، بلا تغيير حرف.
 * ولا سلطةَ تُستأذَن لتسجيل ما وقع — ولذلك **لا اعتمادَ هنا لأحد**، ولا
 * يقف الملفُّ منتظراً دوراً بعينه.
 *
 * والطبيبُ فيها **لأنه قد يحضر**، لا لأنه يُطلَب: الاستقبالُ ومديرُ الفرع
 * يكفيان دائماً.
 *
 * وهي **دالّةٌ مستقلّة لا اسمٌ ثانٍ** لـ`canActCommercially`: تطابقُهما اليوم
 * مصادفةٌ في القيمة لا في المعنى، وربطُهما كان سيجعل أيَّ تضييقٍ لاحقٍ على
 * التسجيل يغلق البيع معه بلا أن ينتبه أحد.
 *
 * ══ والمحاسبُ منهم — **وهنا يظهر ثمرُ فصلِ البوّابتين** ═══════════════════
 * المريضُ يقف عند المحاسب بالمال، فهو أحدُ مَن يُتمّ البيع فعلاً. وإضافتُه
 * إلى `canActCommercially` كانت ستمنحه معه **التأجيلَ والإغلاقَ وإعادةَ
 * الفتح** — وهي إدارةُ ملفٍّ لا قبضُ ثمن. فالبوّابتان المنفصلتان تسمحان
 * بالضبط بما يلزم ولا شيء بعده.
 */
export function canConfirmPurchase(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "reception" || s?.role === "branch_manager") return true;
  if (s?.role === "accountant") return true;
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
 * فالبوّابة **الصلاحيةُ التجارية نفسها + حياةُ الملفّ**، لا قائمةُ الأزرار.
 * وهي مطابقةٌ حرفياً لما تقبله نقطة `POST /api/followups/:id/expert`.
 *
 * **والطبيبُ المخوَّل داخلها**: يستطيع أن يسنِد خبيراً إن حضر — ولا يُطلَب
 * منه ذلك أبداً، فالاستعلامات صاحبةُ هذا الاختيار كما كانت دائماً.
 *
 * ══ والقاعدةُ صارت: **مَن يُتمّ البيع يختار خبيرَه** ═════════════════════
 * كانت مبنيّةً على `canActCommercially`، والاثنتان متطابقتان قيمةً يومَها.
 * لكنّ المعنى المقصود هو الثاني: اختيارُ الخبير **جزءٌ من إتمام البيع** لا
 * من إدارة الملفّ. ولذلك حين دخل المحاسبُ في إتمام البيع دخل معه اختيارُ
 * الخبير — بلا أن يُمنَح تأجيلاً ولا إغلاقاً.
 *
 * وهذا ما يجعل نافذةَ «اشترى» تكفي وحدها: الخبيرُ الناقص يُختار فيها، فلا
 * يُطرَد الموظّف إلى شاشةٍ أخرى ثم يُطلَب منه أن يعود.
 */
export function canSelectExpert(
  s: FollowupSessionLike | null | undefined, status: string,
): boolean {
  //  والمنتهيتان خارجها: المُحوَّل صار له أمرُ تصنيعٍ يُحوَّل خبيرُه من
  //  نقطة إعادة الإسناد بحُرّاسها، والمغلق لا شيء يُسنَد فيه.
  return canConfirmPurchase(s) && !isTerminal(status);
}

/**
 * الأزرار المسموحة لهذه الجلسة على متابعةٍ في هذه الحالة.
 *
 * ══ المسارُ اليومي — **فعلان وقرارٌ تجاري** ═════════════════════════════
 *   الاستقبال: اشترى · لم يشترِ · يحتاج متابعة
 *   مديرُ الفرع: **تحديد السعر النهائي** (قرارٌ لا طلب)
 *   الطبيب: إشارةُ «يرغب بالشراء الآن» (تسليمٌ لا بيع)
 *
 * **ولا خطوةَ اعتمادٍ بينها ولا انتظارَ أحد.** لا اعتمادَ شراء، ولا اعتمادَ
 * خصم، ولا طابورَ موافقات.
 */
export function allowedActions(
  s: FollowupSessionLike | null | undefined, status: string,
): string[] {
  //  **والطبيبُ المخوَّل يرى الأفعالَ التشغيلية كلَّها ومعها إشارتُه** —
  //  ما عدا تحديدَ السعر. وكلُّ ذلك «يستطيع» لا «يجب»: القائمةُ نفسُها
  //  كاملةٌ بيد الاستقبال ومدير الفرع، فلا حالةَ تنتظر طبيباً.
  const out: string[] = [];
  const mayRecord = canActCommercially(s);
  const mayDecideLegacy = canDecideLegacyPriceRequest(s);
  const mayConfirm = canConfirmPurchase(s);
  const maySetPrice = canSetCommercialPrice(s);
  const maySignal = canSignalPurchaseInterest(s);

  if (status === "awaiting_patient_decision" || status === "follow_up") {
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("defer", "close");
    if (maySetPrice) out.push("set_commercial_price");
    if (maySignal) out.push("signal_purchase_interest");
  } else if (status === "price_approval_pending") {
    // ══ توافقٌ رجعي: صفٌّ معلَّقٌ من المسار القديم ══════════════════════
    //  يُحسَم بقانون يومه — ولا يُنشأ مثلُه بعد اليوم.
    if (mayDecideLegacy) out.push("approve_price", "reject_price");
  } else if (status === "price_approved_waiting_patient") {
    //  اعتمادٌ قديمٌ حُسم: يبقى أن يوافق المريض فعلاً، ثم يؤكّده الموظّف
    //  مباشرةً بلا عودةٍ إلى أحد.
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("defer", "close");
    if (maySetPrice) out.push("set_commercial_price");
    if (maySignal) out.push("signal_purchase_interest");
  } else if (status === "purchase_approval_pending") {
    // ══ توافقٌ رجعي لا مسارٌ حيّ ═══════════════════════════════════════
    // لا يدخلها ملفٌّ جديد بعد اليوم. والصفوف المحتجزة فيها من قبلُ تصير
    // **قابلةً للعمل فوراً** بيد الاستقبال: يؤكّد الشراء فتتحوّل كغيرها،
    // أو يغلقها إن عدل المريض. بلا ترحيلِ بيانات ولا إعادةِ كتابة تاريخ.
    if (mayConfirm) out.push("confirm_purchase");
    if (mayRecord) out.push("close");
    if (maySetPrice) out.push("set_commercial_price");
  } else if (status === "closed_without_purchase") {
    //  **ومَن أغلقه يفتحه**: مريضٌ عاد بعد شهرين لا يحتاج طبيباً ليعود إلى
    //  الطابور التجاري — يحتاج موظّفاً يضغط «إعادة فتح».
    if (mayRecord) out.push("reopen");
  }
  return out;
}
