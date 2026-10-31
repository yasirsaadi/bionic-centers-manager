// **خطّةُ العلاج الطبيعي للمريض واعتمادُها** (ترحيل ١٠٩، §4.cm — المرحلةُ الثالثة، ٢٠٢٦-١٠-٠٧).
//
// قراراتُ المالك:
//   • الأخصائيُّ يكتب الخطّةَ من بروتوكول المكتبة (تمتلئ منه) ويعدّلها لهذا المريض — **والأجهزةُ المتوفّرة في فرعه وحدها**.
//   • **مسوّدةٌ لا يُنفّذها أحد** حتى تبدأ. **ويبدؤها كاتبُها بنفسه على أيّ بروتوكولٍ أو بلا بروتوكول** (§4.do — قرارُ المالك ٢٠٢٦-١٠-١١:
//     «تعديلُ أيّ خطّةٍ من الأخصائيّ لا يحتاج اعتمادَ سليم ليبدأ، وإنّما اطّلاعَه أنّ الأخصائيّ عدّل أو أضاف خطّةً للمريض فلان — كن مرناً»)،
//     والمشرفُ يُنبَّه ويراجعها بعدها. (وكان قبلها على بروتوكولٍ اعتمده المشرف وحده — §4.cz.) والمسؤولُ والمشرفُ يعتمدان كما كانا.
//   • **بروتوكولٌ غيرُ معتمَد يُبنى عليه** بشارةٍ ظاهرة «بروتوكول غير معتمد بعد» — للعلم لا للمنع.
//   • **تعديلُ المعتمَدة بيد الأخصائيّ لا يوقفها**: تبقى تُنفَّذ وتعود «بانتظار مراجعة المشرف». والمنفّذُ (معالج · تقنيّ · مدرّب) يرى ولا يعدّل.
//   • **الخططُ القديمة** (`treatment_plans`) تبقى للقراءة في التبويب نفسِه.
import { adjunctTurn, planLineUse, canApproveProtocols, canConsultProtocols, canReadProtocols, canWritePatientPlans, type ProtocolSessionLike } from "./physio_protocols";
import { hasAnyRole, PHYSIO_ROLES } from "./user_roles";
import { isScheduled } from "./physio_device_settings";
import { EXERCISES_WITH_DEVICES } from "./pricing";

export const PLAN_STATUSES = ["draft", "pending", "approved", "returned", "stopped", "graduated"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "مسوّدة",
  pending: "بانتظار الاعتماد",
  approved: "معتمَدة",
  returned: "أُعيدت بملاحظة",
  stopped: "موقوفة",
  //  §4.cp — القرارُ ٤: أنهى علاجَه بتحقّق أهدافه، منفصلةٌ عن «موقوفة» (انقطع).
  graduated: "تخرّج",
};
export const PLAN_STATUS_LABELS_EN: Record<PlanStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  returned: "Returned with a note",
  stopped: "Stopped",
  graduated: "Graduated",
};

/** النصوصُ ذاتُ النسختين — والإنكليزيةُ في `<field>En`. */
export const PLAN_TEXT_FIELDS = ["goals", "exercises", "precautions", "notes"] as const;

/** **يكتب ويعدّل ويُسند ويوقف**: الأخصائيُّ والمشرفُ العام والمسؤول — ويعدّل نسخةَ المريض من البروتوكول كلَّها (§4.dd). */
export const canWritePlans = (s: ProtocolSessionLike | null | undefined): boolean => canWritePatientPlans(s);
/** **يعتمد ويعيد**: المسؤولُ والمشرفُ العام. */
export const canApprovePlans = (s: ProtocolSessionLike | null | undefined): boolean => canApproveProtocols(s);
/** **يحذف الخطّةَ ويغيّر نوعَها**: كاتبُها — الأخصائيُّ والمشرفُ العام والمسؤول (طلبُ المالك ٢٠٢٦-١٠-١٥: «مثل مصطفى وسارة»، وكانا
 *  للمشرف والمسؤول حصراً منذ ٢٠٢٦-١٠-٠٧). والمنفّذُ (معالجٌ · فنّيّ · مدرّب) لا؛ وخطّةٌ لها جلساتٌ أو تقييماتٌ لا تُحذف بيد أحد (§4.eh). */
export const canDeletePlans = (s: ProtocolSessionLike | null | undefined): boolean => canWritePlans(s);
/** **يقرأ** الخطط: مَن يقرأ المكتبة. */
export const canReadPlans = (s: ProtocolSessionLike | null | undefined): boolean => canReadProtocols(s);

/** **المنفّذُ يرى المعتمَدة والموقوفة وحدهما** — المسوّدةُ لم تُقرَّر بعد فلا تُنفَّذ. والمستشيرُ (الطبيبُ ومديرُ الفرع) يرى كلَّ شيء. */
export function planVisibleTo(s: ProtocolSessionLike | null | undefined, status: string): boolean {
  if (!canReadPlans(s)) return false;
  return canConsultProtocols(s) || status === "approved" || status === "stopped" || status === "graduated";
}

/** يُعدَّل ما لم يُوقَف. */
/** **خطّةٌ منتهية** — موقوفةٌ أو متخرّجة: لا تُعدَّل ولا تُسنَد ولا يُغيَّر نوعُها ولا تُقيَّم. */
export const isPlanClosed = (status: string): boolean => status === "stopped" || status === "graduated";
export const isPlanEditable = (status: string): boolean => !isPlanClosed(status);

/**
 * **الحالةُ بعد التعديل**: كلُّ حالةٍ تبقى كما هي — **والمعتمَدةُ تبقى تُنفَّذ بيد أيّ كاتب** (§4.do — «لا تحتاج اعتمادَ سليم»)؛ والمراجعةُ
 * (`awaiting`) والتنبيهُ يقرّرهما الخادم. والمعاملان باقيان لمَن يستدعيها — لم يعودا يغيّران شيئاً.
 */
export function planStatusAfterEdit(current: PlanStatus, _editor?: ProtocolSessionLike | null, _protocolStatus?: string | null): PlanStatus {
  return current;
}

// ══ الأخصائيُّ يبدأ خطّته بنفسه، والمشرفُ يراجعها بعدها (ترحيل ١٢٠، §4.cz — وعلى أيّ بروتوكول منذ §4.do) ═══════════════════════
//   • **«بدء العلاج»** لكاتب الخطّة من المسوّدة أو المُعادة أو المنتظِرة — فتنزل في ملفّ المريض وتُنفَّذ في الحال، **على أيّ بروتوكولٍ أو بلا
//     بروتوكول** (§4.do — قرارُ المالك ٢٠٢٦-١٠-١١). وكانت قبلها على بروتوكولٍ معتمَد وحده («الأفضل أن يعتمدها سليم ثمّ تبدأ» — تغيّر).
//   • **ويُنبَّه المشرفُ والمسؤول** «خطّةٌ جديدة بدأت — للمراجعة» باسم المريض وكاتبها وما تختلف به عن البروتوكول، فيراجع: يوافق، أو يعدّل،
//     أو يوقف، أو يستبدل نوعَها، أو يحذف.
//   • **ويُنبَّه كاتبُ الخطّة بكلّ ما فعله المشرفُ بها** — موافقةً وتعديلاً وإيقافاً واستبدالاً وحذفاً.
//   • **وتعديلُ الأخصائيّ خطّتَه المعتمَدة** لا يوقف العلاج: تبقى معتمَدةً وتعود «بانتظار مراجعة المشرف»، ويُنبَّه المشرفُ باسم مَن عدّل.
export const PLAN_REVIEW_STATES = ["awaiting", "reviewed"] as const;
export type PlanReviewState = (typeof PLAN_REVIEW_STATES)[number];
export const PLAN_REVIEW_LABELS: Record<PlanReviewState, string> = { awaiting: "بانتظار مراجعة المشرف", reviewed: "راجعها المشرف" };
export const PLAN_REVIEW_LABELS_EN: Record<PlanReviewState, string> = { awaiting: "Awaiting supervisor review", reviewed: "Reviewed by the supervisor" };

/** **يبدأها كاتبُها بنفسه**: من المسوّدة أو المُعادة أو المنتظِرة — على أيّ بروتوكول (§4.do). */
export const canSelfActivate = (status: string, _protocolStatus?: string | null): boolean =>
  status === "draft" || status === "returned" || status === "pending";
/** **يراجعها المشرف**: معتمَدةٌ بدأها كاتبُها وتنتظر نظرتَه. */
export const canReviewFrom = (status: string, reviewStatus: string | null | undefined): boolean =>
  status === "approved" && reviewStatus === "awaiting";
export const ALREADY_STARTED = "الخطّةُ بدأت من قبل أو انتهت";

export const canSubmitFrom = (status: string): boolean => status === "draft" || status === "returned";
/** يعتمد المعتمِدُ ما لم يُعتمَد بعد — مسوّدةً أو منتظِرةً أو مُعادة. */
export const canApproveFrom = (status: string): boolean => status === "draft" || status === "pending" || status === "returned";
export const canReturnFrom = (status: string): boolean => status === "pending";

/** **يُسنَد إليه**: أدوارُ القسم الأربعة (الأخصائيُّ قد ينفّذ بنفسه). */
export const isPlanAssigneeRole = (u: { role?: string | null; extraRoles?: unknown; roles?: unknown } | null | undefined): boolean =>
  hasAnyRole(u, PHYSIO_ROLES);

export const PLAN_NOT_FOUND = "الخطّة غير موجودة";
export const UNAPPROVED_PROTOCOL_BADGE = "بروتوكول غير معتمد بعد";

// ══ التنفيذ — المرحلةُ الرابعة (ترحيل ١١١، §4.cn — قراراتُ المالك ٢٠٢٦-١٠-٠٧) ═════════════════════════════
//   ١. **ينفّذ أيُّ منفّذٍ من القسم في فرع الخطّة**، والمسنَدُ هو الافتراضيّ في «جلسات اليوم» — فغيابُ المعالج لا يُرجع المريض.
//   ٢. **«إنهاء الجلسة» يكتب زيارةَ جلسة العلاج الطبيعي** (فتُخصم من جلساته المدفوعة) — فلا تُسجَّل الجلسةُ مرّتين.
//   ٣. **العدّاداتُ من التنفيذ لكلّ فرعٍ من يومٍ يختاره المسؤول** (`branches.physio_counts_from`) ويُقفَل الإدخالُ اليدويّ من يومها؛
//      وقبله يعملان معاً فيُقارَن الرقمان. واليومُ يُختار من الغد فصاعداً — فلا يُجمع يدويٌّ وتنفيذٌ في يومٍ واحد.
//   ٤. **بندُ الإبر الجافة لا يُعلَّم «نُفّذ» إلّا بيد حامل «يطبّق الإبر الجافة»**.
//   ٥. **«ملاحظة للأخصائيّ» تنبيهٌ لكاتب الخطّة**، وصفحةٌ تجمع الجلسات التي اختلفت عن الخطّة.
//   والمنفّذُ لا يضيف جهازاً ولا يحذف بنداً — يسجّل ما حدث، والتعديلُ للأخصائيّ.

/** **ينفّذ**: أدوارُ القسم الأربعة، والمسؤولُ والمشرفُ العام. والفرعُ يُفحَص في الخادم. */
export const canExecutePlans = (s: ProtocolSessionLike | null | undefined): boolean =>
  hasAnyRole(s, PHYSIO_ROLES) || canApprovePlans(s);

/** يُلغي جلسةً نُفّذت خطأً (يُرجع الزيارةَ والعدّاد): المسؤولُ والمشرفُ العام. */
export const canCancelSessions = (s: ProtocolSessionLike | null | undefined): boolean => canApprovePlans(s);

export interface ExecutionItemInput { deviceId: number; done: boolean; minutes: number | null; note: string | null }

/**
 * **البنودُ هي بنودُ الخطّة بأعيانها** — لا جهازَ زائد ولا بندَ ناقص ولا مكرَّر؛ وبندٌ واحدٌ نُفّذ على الأقلّ (جلسةٌ بلا شيءٍ نُفّذ لا تُخصم)؛
 * وما لم يُنفَّذ يقول لماذا؛ والإبرُ الجافة لحاملها وحده. يُرجع رسالةَ الخطأ أو `null`.
 */
export function executionItemsError(p: {
  planDeviceIds: number[]; items: ExecutionItemInput[]; needleDeviceId: number | null; canDryNeedle: boolean;
  /** **المساعدون الذين ليس دورَهم هذه الجلسة** (ترحيل ١٢٢، §4.cx) — تركُهم ليس «لم يُنفَّذ» فلا يُطلب له سبب. */
  offTurnDeviceIds?: readonly number[];
}): string | null {
  const ids = p.items.map((i) => i.deviceId);
  if (new Set(ids).size !== ids.length) return "بندٌ مكرّر";
  const plan = new Set(p.planDeviceIds);
  if (ids.length !== plan.size || ids.some((d) => !plan.has(d))) return "البنودُ بنودُ الخطّة بأعيانها — لا يُضاف جهازٌ ولا يُحذف بند";
  if (!p.items.some((i) => i.done)) return "لم يُعلَّم أيُّ بندٍ «نُفّذ» — لا جلسةَ تُسجَّل";
  const offTurn = new Set(p.offTurnDeviceIds ?? []);
  if (p.items.some((i) => !i.done && !offTurn.has(i.deviceId) && !(i.note ?? "").trim())) return "اكتب سببَ كلّ بندٍ لم يُنفَّذ";
  if (p.needleDeviceId != null && !p.canDryNeedle && p.items.some((i) => i.deviceId === p.needleDeviceId && i.done)) {
    return "بندُ الإبر الجافة يُعلَّم «نُفّذ» بيد حامل «يطبّق الإبر الجافة» وحده";
  }
  return null;
}

// ══ تعليمُ كلّ تمرينٍ في الجلسة (ترحيل ١٣٤ — «الطلب الثاني»، §4.dr) ═══════════════════════════════════════════════════════
//
// قرارُ المالك (§4.cx): «ضع شيئاً عالمياً وستاندرد» — تمارينُ مرحلة الخطّة الحالية في «إنهاء الجلسة»، **كلُّها «نُفّذ» افتراضاً، ويُلغى ما لم يُنفَّذ بسبب**.

export interface ExerciseItemInput { exerciseId: number; done: boolean; note: string | null }

/**
 * **مرحلةُ هذه الجلسة** — بنطاقات جلسات المراحل (`sessionFrom`–`sessionTo`، §4.dd): التي تحوي رقمَ الجلسة؛ وبعد آخر نطاقٍ الأخيرةُ ذاتُ النطاق؛
 * وبلا نطاقاتٍ الأولى. ⟵ موضعُ المرحلة أو `null` لخطّةٍ بلا مراحل. والمعالجُ يختار غيرَها إن كان مريضُه في مرحلةٍ أخرى.
 */
export function phaseForSession(phases: readonly { position: number; sessionFrom?: number | null; sessionTo?: number | null }[], sessionNumber: number): number | null {
  if (!phases.length) return null;
  const sorted = [...phases].sort((a, b) => a.position - b.position);
  const ranged = sorted.filter((p) => p.sessionFrom != null || p.sessionTo != null);
  const hit = ranged.find((p) => (p.sessionFrom ?? 1) <= sessionNumber && sessionNumber <= (p.sessionTo ?? Number.MAX_SAFE_INTEGER));
  if (hit) return hit.position;
  if (ranged.length) {
    const last = ranged.reduce((a, b) => ((b.sessionTo ?? 0) >= (a.sessionTo ?? 0) ? b : a));
    if (sessionNumber > (last.sessionTo ?? 0)) return last.position;
    return ranged[0].position;
  }
  return sorted[0].position;
}

/** **تمارينُ الجلسة هي تمارينُ المرحلة بأعيانها** — لا زائد ولا ناقص ولا مكرّر، وما لم يُنفَّذ يقول لماذا. ⟵ رسالةُ الخطأ أو `null`. */
export function exerciseItemsError(p: { phaseExerciseIds: readonly number[]; items: readonly ExerciseItemInput[] }): string | null {
  const ids = p.items.map((i) => i.exerciseId);
  if (new Set(ids).size !== ids.length) return "تمرينٌ مكرّر";
  const phase = new Set(p.phaseExerciseIds);
  if (ids.length !== phase.size || ids.some((d) => !phase.has(d))) return "التمارينُ تمارينُ المرحلة بأعيانها — لا يُضاف تمرينٌ ولا يُحذف";
  if (p.items.some((i) => !i.done && !(i.note ?? "").trim())) return "اكتب سببَ كلّ تمرينٍ لم يُنفَّذ";
  return null;
}

/**
 * **بندُ «تمارين» وتمارينُه يقولان الشيءَ نفسَه** (§4.dr — ملاحظةُ المراجعة على #622): البندُ «لم يُنفَّذ» (أو ليس دورَه) ⟵ لا تُعلَّم تمارينُه
 * (الشاشةُ لا ترسلها، وسببُه في البند)؛ والبندُ «نُفّذ» وتمارينُه كلُّها «لم يُنفَّذ» ⟵ تناقضٌ يُكتب «نُفّذ» في الزيارة والعدّاد. و`null` = لا بندَ تمارين في الخطّة.
 */
export function exerciseDeviceError(p: { deviceDone: boolean | null; items: readonly ExerciseItemInput[] }): string | null {
  if (p.deviceDone === null || p.items.length === 0) return null;
  if (!p.deviceDone) return "بندُ «تمارين» لم يُنفَّذ — فلا تُعلَّم تمارينُه";
  if (p.items.every((x) => !x.done)) return "لم يُنفَّذ أيُّ تمرين — أزل علامةَ بند «تمارين» واكتب سببه";
  return null;
}

/** رمزُ بند «تمارين» بين أجهزة الخطّة (`devices.code`). */
export const EXERCISE_DEVICE_CODE = "exercise";

/** **مرحلةُ الجلسة الافتراضية تغيّرت تحت يد المعالج** — جلسةٌ سُجّلت للخطّة بعد أن فتح النافذة (§4.dr). */
export const PHASE_MOVED = "سُجّلت جلسةٌ لهذه الخطّة قبل لحظات فتغيّرت مرحلةُ هذه الجلسة — أُعيد تحميلُ تمارينها، راجعها واحفظ";

/**
 * **نوعُ العلاج في زيارة الجلسة** — من البنود المنفّذة، بقائمة «تسجيل زيارة جلسة علاج طبيعي» نفسِها.
 *
 * و**«تمارين مع أجهزة»** (§4.ft) لمن اشتراها وحده (`boughtByType` — `resolvePurchasedSessions().byType`):
 * جلسةٌ فيها التمرينُ وجهازٌ معاً تُعدّ عليها، وجلسةُ تمارينَ وحدها أو أجهزةٍ وحدها تُعدّ عليها **ما لم يشترِ ذلك النوعَ بعينه**
 * — فلا يبقى «باقٍ» على ما اشتراه وجلساتُه تُعدّ على نوعٍ لم يشترِه. ومَن لم يشترِها فقاعدتُه كما كانت حرفاً.
 */
export function sessionTreatmentType(doneCodes: readonly string[], boughtByType: Readonly<Record<string, number>> = {}): string {
  if (doneCodes.includes("robotik")) return "روبوت";
  const withDevice = doneCodes.some((c) => c !== "exercise" && c !== "needle");
  const base = withDevice ? "أجهزة علاج طبيعي" : doneCodes.includes("needle") ? "أبر صينية" : "تمارين تأهيلية";
  if (!((boughtByType[EXERCISES_WITH_DEVICES] ?? 0) > 0) || base === "أبر صينية") return base;
  if (withDevice && doneCodes.includes("exercise")) return EXERCISES_WITH_DEVICES;
  return (boughtByType[base] ?? 0) > 0 ? base : EXERCISES_WITH_DEVICES;
}

/** هل تُكتب جلسةُ هذا اليوم في عدّادات الأجهزة؟ من يوم القفل فصاعداً وحده. */
export const countsFromExecution = (countsFrom: string | null | undefined, sessionDate: string): boolean =>
  Boolean(countsFrom) && sessionDate >= String(countsFrom);

/** يومُ القفل من الغد فصاعداً — فلا يجتمع في يومٍ واحد يدويٌّ وتنفيذ. `null` يرفع القفل. */
export function countsFromError(date: string | null, today: string): string | null {
  if (date === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return "اختر تاريخاً صحيحاً";
  if (date <= today) return "يُختار يومُ القفل من الغد فصاعداً — اليومُ وما قبله بقيا يدويّين";
  return null;
}

export const MANUAL_COUNTS_LOCKED_ERROR = "عدّاداتُ هذا الفرع تُحسب من تنفيذ خطط العلاج الطبيعي من هذا اليوم — الإدخالُ اليدويّ مقفل";

// ══ «اقترح خطّة» بالمساعد (§4.co — المرحلةُ الخامسة، ٢٠٢٦-١٠-٠٨) ═══════════════════════════════════════════════
//
// قراراتُ المالك (الأربعُ «توصيتك»):
//   ١. **يختار البروتوكولَ ويعدّله لهذا المريض داخل حدوده** — والخادمُ يتحقّق من كلّ تعديل: **يحذف جهازاً بسبب**، **ويُنقص** الدقائقَ أو الجرعة
//      ولا يزيدها على البروتوكول، **ويكتب ملاحظاتٍ لهذا المريض**. ولا يضيف جهازاً، ولا يختار بروتوكولاً من خارج المكتبة. وما خالف يُرفض ويُقال.
//   ٢. **يقترح من المسوّدات أيضاً** بشارة «بروتوكول غير معتمد بعد» — كاختيار الأخصائيّ اليدويّ اليوم.
//   ٣. **لكاتبي الخطط وحدهم** (الأخصائيّ · المشرف العام · المسؤول).
//   ٤. **حالةُ المريض من معاينة العلاج الطبيعي تلقائياً، وسطرٌ يكتبه الأخصائيّ** — وبلا معاينةٍ يصير السطرُ إلزامياً.
// والمساعدُ **لا يرسل للاعتماد ولا يعتمد**: القبولُ يفتح مسوّدةً يعدّلها الأخصائيّ ويرسلها كالعادة.

/** **يطلب الاقتراح**: كاتبو الخطط وحدهم (قرارُ المالك ٣). */
export const canSuggestPlans = (s: ProtocolSessionLike | null | undefined): boolean => canWritePlans(s);

const clipText = (v: unknown, max: number): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};

export interface SuggestionChoice { protocolId: number; reasonAr: string | null; reasonEn: string | null }

/** **اختيارُ البروتوكولات** — من المكتبة وحدها، بلا تكرار، ثلاثةٌ على الأكثر. ورقمٌ ليس في المكتبة يُسقَط. */
export function validateChoices(raw: unknown, libraryIds: Set<number>): SuggestionChoice[] {
  const list: any[] = Array.isArray((raw as any)?.choices) ? (raw as any).choices : [];
  const out: SuggestionChoice[] = [];
  for (const c of list) {
    const id = Number(c?.protocolId);
    if (!Number.isInteger(id) || !libraryIds.has(id) || out.some((o) => o.protocolId === id)) continue;
    out.push({ protocolId: id, reasonAr: clipText(c?.reasonAr, 500), reasonEn: clipText(c?.reasonEn, 500) });
    if (out.length === 3) break;
  }
  return out;
}

/** سطرُ جهازٍ يجوز في الخطّة: من البروتوكول، غيرُ «غير موصى به»، ومتوفّرٌ في فرعها — ما تمتلئ به الخطّةُ اليدويّةُ نفسُه. */
export interface AllowedLine { deviceId: number; minutes: number | null; nameAr: string; nameEn: string }
export interface PlanDose { sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null }
export const DOSE_FIELDS = ["sessionsPerWeek", "durationWeeks", "sessionMinutes"] as const;
export type DoseField = (typeof DOSE_FIELDS)[number];
const DOSE_CAP: Record<DoseField, number> = { sessionsPerWeek: 7, durationWeeks: 52, sessionMinutes: 240 };
/** سقفُ دقائق جهازٍ لم تُكتب دقائقُه في البروتوكول. */
export const DEVICE_MINUTES_CAP = 60;

export type SuggestionChange =
  | { kind: "remove"; deviceId: number; nameAr: string; nameEn: string; reasonAr: string; reasonEn: string | null }
  | { kind: "minutes"; deviceId: number; nameAr: string; nameEn: string; from: number | null; to: number; reasonAr: string; reasonEn: string | null }
  | { kind: "dose"; field: DoseField; from: number | null; to: number; reasonAr: string; reasonEn: string | null };

export interface SuggestionResult {
  devices: { deviceId: number; minutes: number | null }[];
  dose: PlanDose;
  changes: SuggestionChange[];
  /** ما اقترحه المساعدُ خارج الحدود فرفضه الخادم — يُعرض للأخصائيّ كما هو. */
  rejected: { what: string; whyAr: string }[];
  notesAr: string | null; notesEn: string | null;
  rationaleAr: string | null; rationaleEn: string | null;
}

/**
 * **تعديلاتُ المساعد على البروتوكول المختار** — يُبدأ من سطور البروتوكول الجائزة ودقائقها وجرعته، ثمّ يُقبل من اقتراحه ما كان داخل الحدود وحده:
 *   • **الحذف** لجهازٍ من السطور، بسببٍ مكتوب، ويبقى جهازٌ واحدٌ على الأقلّ.
 *   • **الدقائق** لجهازٍ باقٍ: عددٌ صحيح من ١ إلى دقائق البروتوكول (أو ٦٠ إن لم تُكتب)، غيرُ الحاليّة، بسبب.
 *   • **الجرعة**: من ١ إلى قيمة البروتوكول (أو السقف إن لم تُكتب)، غيرُ الحاليّة، بسبب.
 *   • **الإضافة** — جهازٌ من خارج السطور — تُرفض كلُّها.
 */
export function validateAdjustments(raw: unknown, allowed: AllowedLine[], dose: PlanDose): SuggestionResult {
  const r: any = raw && typeof raw === "object" ? raw : {};
  const lineOf = new Map(allowed.map((l) => [l.deviceId, l]));
  const kept = new Map(allowed.map((l) => [l.deviceId, l.minutes]));
  const out: SuggestionResult = {
    devices: [], dose: { ...dose }, changes: [], rejected: [],
    notesAr: clipText(r.notesAr, 2000), notesEn: clipText(r.notesEn, 2000),
    rationaleAr: clipText(r.rationaleAr, 1500), rationaleEn: clipText(r.rationaleEn, 1500),
  };
  const nameOf = (id: number) => lineOf.get(id)?.nameAr ?? `#${id}`;
  for (const x of Array.isArray(r.remove) ? r.remove : []) {
    const id = Number(x?.deviceId);
    const reasonAr = clipText(x?.reasonAr, 500);
    if (!lineOf.has(id)) { out.rejected.push({ what: `حذف جهاز #${x?.deviceId}`, whyAr: "ليس من أجهزة البروتوكول المتاحة" }); continue; }
    if (!kept.has(id)) continue;
    if (!reasonAr) { out.rejected.push({ what: `حذف ${nameOf(id)}`, whyAr: "بلا سبب" }); continue; }
    if (kept.size === 1) { out.rejected.push({ what: `حذف ${nameOf(id)}`, whyAr: "لا تُحذف أجهزةُ الخطّة كلُّها" }); continue; }
    kept.delete(id);
    const l = lineOf.get(id)!;
    out.changes.push({ kind: "remove", deviceId: id, nameAr: l.nameAr, nameEn: l.nameEn, reasonAr, reasonEn: clipText(x?.reasonEn, 500) });
  }
  for (const x of Array.isArray(r.minutes) ? r.minutes : []) {
    const id = Number(x?.deviceId);
    const to = Number(x?.minutes);
    const reasonAr = clipText(x?.reasonAr, 500);
    const l = lineOf.get(id);
    if (!l || !kept.has(id)) { out.rejected.push({ what: `دقائق جهاز #${x?.deviceId}`, whyAr: "ليس من أجهزة الخطّة" }); continue; }
    const cap = l.minutes ?? DEVICE_MINUTES_CAP;
    if (!Number.isInteger(to) || to < 1 || to > cap) { out.rejected.push({ what: `${l.nameAr}: ${x?.minutes} د`, whyAr: `خارج الحدود (١–${cap})` }); continue; }
    if (to === kept.get(id)) continue;
    if (!reasonAr) { out.rejected.push({ what: `${l.nameAr}: ${to} د`, whyAr: "بلا سبب" }); continue; }
    out.changes.push({ kind: "minutes", deviceId: id, nameAr: l.nameAr, nameEn: l.nameEn, from: kept.get(id) ?? null, to, reasonAr, reasonEn: clipText(x?.reasonEn, 500) });
    kept.set(id, to);
  }
  for (const x of Array.isArray(r.dose) ? r.dose : []) {
    const field = x?.field as DoseField;
    const to = Number(x?.value);
    const reasonAr = clipText(x?.reasonAr, 500);
    if (!(DOSE_FIELDS as readonly string[]).includes(field)) { out.rejected.push({ what: `جرعة «${x?.field}»`, whyAr: "حقلٌ غيرُ معروف" }); continue; }
    const cap = dose[field] ?? DOSE_CAP[field];
    if (!Number.isInteger(to) || to < 1 || to > cap) { out.rejected.push({ what: `${field}: ${x?.value}`, whyAr: `خارج الحدود (١–${cap})` }); continue; }
    if (to === out.dose[field]) continue;
    if (!reasonAr) { out.rejected.push({ what: `${field}: ${to}`, whyAr: "بلا سبب" }); continue; }
    out.changes.push({ kind: "dose", field, from: out.dose[field], to, reasonAr, reasonEn: clipText(x?.reasonEn, 500) });
    out.dose[field] = to;
  }
  for (const x of Array.isArray(r.add) ? r.add : []) {
    out.rejected.push({ what: `إضافة جهاز #${x?.deviceId ?? "?"}`, whyAr: "لا يُضاف جهازٌ من خارج البروتوكول" });
  }
  out.devices = allowed.filter((l) => kept.has(l.deviceId)).map((l) => ({ deviceId: l.deviceId, minutes: kept.get(l.deviceId) ?? null }));
  return out;
}

/** نصُّ ردّ المساعد ⟵ كائن. يقبل نصّاً قبل `{` أو بعد `}` (والردُّ يبدأ بـ`{` مملوءاً). */
export function parseModelJson(text: string): Record<string, any> | null {
  const s = String(text ?? "");
  const a = s.indexOf("{");
  const b = s.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    const v = JSON.parse(s.slice(a, b + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? v : null;
  } catch { return null; }
}

/**
 * **المساعدُ في الجلسة القادمة** (ترحيل ١٢٢، §4.cx — قرارُ المالك: «يتناوب لأنّ جلساتنا ٥٠ دقيقة فقط»): المساعدون بترتيبهم في الخطّة،
 * ودورُ أحدهم بعدد الجلسات المسجَّلة قبلها (`adjunctTurn`)؛ والباقون «ليس دورَهم» — تركُهم ليس انحرافاً. والأساسيُّ في كلّ جلسة.
 * **والبندُ الدوريّ** (§4.dn) لا يدخل التناوب — يحكمه موعدُه.
 */
export function sessionAdjuncts(
  lines: readonly { deviceId: number; centreUse?: unknown; displayOrder?: number | null; everyDays?: number | null }[], sessionsSoFar: number,
): { turnDeviceId: number | null; offTurnDeviceIds: number[] } {
  //  §4.dn — **البندُ الدوريّ خارجَ التناوب**: له موعدُه (`scheduleState`)، فلا يأخذ دوراً ولا يُحسب «ليس دورَه».
  const adj = lines.filter((l) => planLineUse(l.centreUse) === "adjunct" && !isScheduled(l))
    .slice().sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)).map((l) => Number(l.deviceId));
  const turnDeviceId = adjunctTurn(adj, sessionsSoFar);
  return { turnDeviceId, offTurnDeviceIds: adj.filter((d) => d !== turnDeviceId) };
}
