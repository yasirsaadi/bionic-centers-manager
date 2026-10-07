// **خطّةُ العلاج الطبيعي للمريض واعتمادُها** (ترحيل ١٠٩، §4.cm — المرحلةُ الثالثة، ٢٠٢٦-١٠-٠٧).
//
// قراراتُ المالك:
//   • الأخصائيُّ يكتب الخطّةَ من بروتوكول المكتبة (تمتلئ منه) ويعدّلها لهذا المريض — **والأجهزةُ المتوفّرة في فرعه وحدها**.
//   • **مسوّدةٌ لا يُنفّذها أحد** حتى تُعتمَد. والاعتمادُ **بالمالك (المسؤول) أو سليم (المشرف العام)** — يكفي أحدُهما، ويصلهما التنبيه.
//   • **بروتوكولٌ غيرُ معتمَد يُبنى عليه** بشارةٍ ظاهرة «بروتوكول غير معتمد بعد».
//   • **تعديلُ المعتمَدة بيد الأخصائيّ يعيدها إلى الاعتماد**. والمنفّذُ (معالج · تقنيّ · مدرّب) يرى ولا يعدّل.
//   • **الخططُ القديمة** (`treatment_plans`) تبقى للقراءة في التبويب نفسِه.
import { canApproveProtocols, canConsultProtocols, canEditProtocols, canReadProtocols, type ProtocolSessionLike } from "./physio_protocols";
import { hasAnyRole, PHYSIO_ROLES } from "./user_roles";

export const PLAN_STATUSES = ["draft", "pending", "approved", "returned", "stopped"] as const;
export type PlanStatus = (typeof PLAN_STATUSES)[number];
export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = {
  draft: "مسوّدة",
  pending: "بانتظار الاعتماد",
  approved: "معتمَدة",
  returned: "أُعيدت بملاحظة",
  stopped: "موقوفة",
};
export const PLAN_STATUS_LABELS_EN: Record<PlanStatus, string> = {
  draft: "Draft",
  pending: "Pending approval",
  approved: "Approved",
  returned: "Returned with a note",
  stopped: "Stopped",
};

/** النصوصُ ذاتُ النسختين — والإنكليزيةُ في `<field>En`. */
export const PLAN_TEXT_FIELDS = ["goals", "exercises", "precautions", "notes"] as const;

/** **يكتب ويعدّل ويُسند ويوقف**: الأخصائيُّ والمشرفُ العام والمسؤول — قاعدةُ تعديل البروتوكول نفسُها. */
export const canWritePlans = (s: ProtocolSessionLike | null | undefined): boolean => canEditProtocols(s);
/** **يعتمد ويعيد**: المسؤولُ والمشرفُ العام. */
export const canApprovePlans = (s: ProtocolSessionLike | null | undefined): boolean => canApproveProtocols(s);
/** **يحذف** الخطّة: المسؤولُ والمشرفُ العام **حصراً** (طلبُ المالك ٢٠٢٦-١٠-٠٧) — والأخصائيُّ يوقفها ولا يحذفها. */
export const canDeletePlans = (s: ProtocolSessionLike | null | undefined): boolean => canApproveProtocols(s);
/** **يقرأ** الخطط: مَن يقرأ المكتبة. */
export const canReadPlans = (s: ProtocolSessionLike | null | undefined): boolean => canReadProtocols(s);

/** **المنفّذُ يرى المعتمَدة والموقوفة وحدهما** — المسوّدةُ لم تُقرَّر بعد فلا تُنفَّذ. والمستشيرُ (الطبيبُ ومديرُ الفرع) يرى كلَّ شيء. */
export function planVisibleTo(s: ProtocolSessionLike | null | undefined, status: string): boolean {
  if (!canReadPlans(s)) return false;
  return canConsultProtocols(s) || status === "approved" || status === "stopped";
}

/** يُعدَّل ما لم يُوقَف. */
export const isPlanEditable = (status: string): boolean => status !== "stopped";

/**
 * **الحالةُ بعد التعديل**: المعتمَدةُ تعود «بانتظار الاعتماد» ما لم يكن المعدِّلُ ممّن يعتمد؛ والمُعادةُ والمسوّدةُ تبقيان حتى «إرسال للاعتماد»؛
 * والمنتظِرةُ تبقى منتظِرة.
 */
export function planStatusAfterEdit(current: PlanStatus, editor: ProtocolSessionLike | null | undefined): PlanStatus {
  if (current === "approved") return canApprovePlans(editor) ? "approved" : "pending";
  return current;
}

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
}): string | null {
  const ids = p.items.map((i) => i.deviceId);
  if (new Set(ids).size !== ids.length) return "بندٌ مكرّر";
  const plan = new Set(p.planDeviceIds);
  if (ids.length !== plan.size || ids.some((d) => !plan.has(d))) return "البنودُ بنودُ الخطّة بأعيانها — لا يُضاف جهازٌ ولا يُحذف بند";
  if (!p.items.some((i) => i.done)) return "لم يُعلَّم أيُّ بندٍ «نُفّذ» — لا جلسةَ تُسجَّل";
  if (p.items.some((i) => !i.done && !(i.note ?? "").trim())) return "اكتب سببَ كلّ بندٍ لم يُنفَّذ";
  if (p.needleDeviceId != null && !p.canDryNeedle && p.items.some((i) => i.deviceId === p.needleDeviceId && i.done)) {
    return "بندُ الإبر الجافة يُعلَّم «نُفّذ» بيد حامل «يطبّق الإبر الجافة» وحده";
  }
  return null;
}

/** **نوعُ العلاج في زيارة الجلسة** — من البنود المنفّذة، بقائمة «تسجيل زيارة جلسة علاج طبيعي» نفسِها. */
export function sessionTreatmentType(doneCodes: readonly string[]): string {
  if (doneCodes.includes("robotik")) return "روبوت";
  if (doneCodes.some((c) => c !== "exercise" && c !== "needle")) return "أجهزة علاج طبيعي";
  if (doneCodes.includes("needle")) return "أبر صينية";
  return "تمارين تأهيلية";
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
