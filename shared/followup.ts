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
  price_approval_pending: "بانتظار اعتماد السعر",
  price_approved_waiting_patient: "بانتظار تأكيد المريض بعد تعديل السعر",
  purchase_approval_pending: "بانتظار اعتماد الشراء",
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
 * مَن يعتمد السعر أو الشراء — **طبيبٌ مخوَّل أو المسؤول العام حصراً**.
 *
 * ومديرُ الفرع **ليس منهما عمداً**: السعر قرارٌ وقّعه الطبيب في سجلٍّ سريري،
 * فمن يعتمد تعديله طبيبٌ لا إداريّ. وهذا هو الفرق الذي تحرسه هذه الدالّة —
 * والخادم يعيد فحصه على كل كتابة، فسحبُ الصلاحية يسري فوراً.
 *
 * وليس شرطاً أن يكون **طبيب المعاينة نفسه**: أي طبيبٍ مخوَّل في الفرع
 * يعتمد، وإلّا تجمّد ملفّ المريض حتى يعود زميلٌ من إجازته.
 */
export function canApprove(s: FollowupSessionLike | null | undefined): boolean {
  if (s?.isAdmin === true) return true;
  //  المقارنة صريحة: صلاحيةٌ غامضة القيمة تُقرأ «لا».
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

/** الأزرار المسموحة لهذه الجلسة على متابعةٍ في هذه الحالة. */
export function allowedActions(
  s: FollowupSessionLike | null | undefined, status: string,
): string[] {
  const out: string[] = [];
  const mayRecord = canRecordFollowup(s);
  const mayApprove = canApprove(s);

  if (status === "awaiting_patient_decision" || status === "follow_up") {
    if (mayRecord) out.push("accept_price", "defer", "close", "request_price_change");
  } else if (status === "price_approval_pending") {
    //  المتابِع يرى «بانتظار الاعتماد» ولا زرّ له — والطبيب/المسؤول يقرّر.
    if (mayApprove) out.push("approve_price", "reject_price");
  } else if (status === "price_approved_waiting_patient") {
    //  اعتمادُ الطبيب للتخفيض **ليس شراءً**: يبقى أن يوافق المريض فعلاً.
    if (mayRecord) out.push("patient_accepted_new_price", "defer", "close");
  } else if (status === "purchase_approval_pending") {
    if (mayApprove) out.push("approve_purchase");
  } else if (status === "closed_without_purchase") {
    if (mayRecord) out.push("reopen");
  }
  return out;
}
