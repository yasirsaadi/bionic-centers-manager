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
