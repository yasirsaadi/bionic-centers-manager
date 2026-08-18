// مراجعةُ الطبيب للأطراف والمساند — المفردات والصلاحيات، **منطقٌ خالص**.
//
// ══ لماذا طبقةٌ جديدة أصلاً ═════════════════════════════════════════════
// قبل هذا كان بابُ الطبيب واحداً: **المعاينة الموقّعة**. وهي سجلٌّ سريريٌّ
// مختوم، ثقيلٌ عن قصد — يُكتب مرّةً ولا يُمحى. فصار كلُّ ما لا يستحقّها
// يمرّ بلا طبيب إطلاقاً: الصيانة الروتينية، والتعديل الصغير، والمريض
// القديم العائد. والنظام كان يُخرجهم من قائمة الطبيب صراحةً
// (`isLegacyPatient` و«الخيط بلا حلقة») فلا يراهم أحد.
//
// والقرار: **كلُّ زيارة أطرافٍ أو مساندَ ذات معنى تصل الطبيب** — لكن بابين
// لا باباً واحداً. فالمريض العائد لتعديلٍ بسيط لا يُجبَر على سجلٍّ سريريٍّ
// كامل، ولا يمرّ بلا نظرةِ طبيب.
//
// ══ والعلاج الطبيعي خارج هذا الملفّ كلّه ═══════════════════════════════
// لا اسمَه هنا ولا قيمةَ تقبله: `REVIEW_SERVICE_TYPES` نوعان فقط، وقيدُ
// `CHECK` في القاعدة يرفض الثالث. فمسارُه — تسجيلاً وتسعيراً وجلساتٍ
// ومعاينةً اختيارية — لا يمرّ من هنا ولا يتأثّر بحرف.

/** الاختصاصان اللذان تحكمهما هذه المراجعة. العلاج الطبيعي ليس منهما. */
export const REVIEW_SERVICE_TYPES = ["prosthetic", "medical_support"] as const;
export type ReviewServiceType = (typeof REVIEW_SERVICE_TYPES)[number];

export const isReviewServiceType = (v: unknown): v is ReviewServiceType =>
  typeof v === "string" && (REVIEW_SERVICE_TYPES as readonly string[]).includes(v);

/**
 * المساران اللذان يختار الاستقبالُ بينهما.
 *
 * **والاستقبال هو المصنِّف لا الخبير**: الخبير يُسأل خارج المسار حين يشكّ
 * الموظّف، لكنّ التصنيف قرارُ الاستقبال ومسؤوليّتُه — فلا ينتظر الملفُّ
 * خبيراً مشغولاً ليبدأ طريقه إلى الطبيب.
 */
export const REVIEW_PATHS = ["quick", "full"] as const;
export type ReviewPath = (typeof REVIEW_PATHS)[number];

export const REVIEW_PATH_LABELS: Record<ReviewPath, string> = {
  quick: "موافقة طبية سريعة",
  full: "معاينة طبية كاملة",
};

export const REVIEW_PATH_HINTS: Record<ReviewPath, string> = {
  quick: "صيانة روتينية · تعديل بسيط · مريض عائد مستقرّ · متابعة جهازٍ موصوف",
  full: "جهاز جديد · تغيّر سريري مهمّ · جرح أو ألم أو مشكلة جلدية · تغيّر قياسٍ أو مواصفة · أي حالة غير واضحة",
};

/** سببُ الزيارة — بيانٌ للطبيب لا مسارٌ في الشيفرة. */
export const REVIEW_KINDS = [
  "new_device", "maintenance", "adjustment", "follow_up", "other",
] as const;
export type ReviewKind = (typeof REVIEW_KINDS)[number];

export const REVIEW_KIND_LABELS: Record<ReviewKind, string> = {
  new_device: "جهاز جديد",
  maintenance: "صيانة",
  adjustment: "تعديل",
  follow_up: "متابعة",
  other: "أخرى",
};

export const isReviewKind = (v: unknown): v is ReviewKind =>
  typeof v === "string" && (REVIEW_KINDS as readonly string[]).includes(v);

export const isReviewPath = (v: unknown): v is ReviewPath =>
  typeof v === "string" && (REVIEW_PATHS as readonly string[]).includes(v);

// ── الحالات والقرارات ────────────────────────────────────────────────────

export const REVIEW_STATUSES = [
  "pending", "approved", "escalated", "returned",
] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  pending: "بانتظار الطبيب",
  approved: "موافقة طبية",
  escalated: "أُحيل إلى معاينة كاملة",
  returned: "أُعيد إلى الاستقبال",
};

/** قرارُ الطبيب الثلاثي. */
export const REVIEW_DECISIONS = [
  "approve", "require_full_exam", "return_to_reception",
] as const;
export type ReviewDecision = (typeof REVIEW_DECISIONS)[number];

export const REVIEW_DECISION_LABELS: Record<ReviewDecision, string> = {
  approve: "موافقة",
  require_full_exam: "يتطلّب معاينة كاملة",
  return_to_reception: "إعادة إلى الاستقبال",
};

export const isReviewDecision = (v: unknown): v is ReviewDecision =>
  typeof v === "string" && (REVIEW_DECISIONS as readonly string[]).includes(v);

/** الحالة التي يصير إليها الطلب بعد كلّ قرار. */
export const STATUS_AFTER: Record<ReviewDecision, ReviewStatus> = {
  approve: "approved",
  require_full_exam: "escalated",
  return_to_reception: "returned",
};

/** المنتهية: لا قرارَ ثانٍ عليها، ويُنشئ الاستقبالُ طلباً جديداً إن لزم. */
export const isDecided = (s: string): boolean => s !== "pending";

// ── الصلاحيات ────────────────────────────────────────────────────────────

export interface ReviewSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  branchId?: number | null;
  permissions?: Record<string, any> | null;
}

/**
 * مَن **ينشئ** الطلب ويصنّفه — الاستقبال ومَن فوقه.
 *
 * `canAddPatients` هي قدرةُ مَن يجلس على الاستقبال فعلاً، وهي نفسها التي
 * تقبلها نقطةُ الصيانة اليوم. فمَن يفتح صيانةً يستطيع أن يرسلها للمراجعة.
 *
 * **والخبير ليس منهم**: هو المنفّذ، ورأيُه يُسأل خارج المسار لا داخله.
 */
export function canCreateReview(s: ReviewSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  if (s?.role === "branch_manager" || s?.role === "reception") return true;
  return s?.permissions?.canAddPatients === true;
}

/**
 * مَن **يقرّر** — طبيبٌ مخوَّل حصراً.
 *
 * ونفسُ قاعدة المعاينة الموقّعة حرفياً: الدور `doctor` يحملها ضمناً، أو
 * `canWriteMedicalExam` صراحةً لمن دورُه شيء آخر. **والمسؤول العام ليس
 * منهم بحكم منصبه**: الموافقة الطبية فعلٌ مهنيّ لا إداريّ، تماماً كالتوقيع.
 *
 * وهذا أضيق من `canCreateReview` عمداً: مَن يصنّف لا يوافق على تصنيفه.
 */
export function canDecideReview(s: ReviewSessionLike | null | undefined): boolean {
  return s?.role === "doctor" || s?.permissions?.canWriteMedicalExam === true;
}
