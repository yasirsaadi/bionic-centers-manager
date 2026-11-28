// **إسنادُ خطّة Bionic AI بأجزائها والبديلُ لغياب المُسنَد** (ترحيل ٢٠١، §4.hc — المرحلةُ الرابعة من «المعاينة ⟵ خطّة Bionic AI»). قواعدُ صرفة.
//
// قرارُ المالك ٧: بعد الاعتماد **يُسند المعتمِدُ** (المسؤولُ أو المشرفُ العام — `canApproveProtocols`) الخطّةَ، وقد تُقسم جزأين: **الأجهزة** (كلُّ سطر جهازٍ غيرُ «تمارين»)
// و**التمارين** (سطرُ «تمارين» إن كان وتمارينُ المراحل). والتنفيذُ للمُسنَد إليه وحده (والمعتمِدُ مستثنى)، وللبديل المعتمَد لغيابه.
// وقرارُ المالك D (٢٠٢٦-١١-٢٨): «ايقاف الخطة حصرا بخاصائي العلاج الطبيعي وانا وسليم وليس معالج» — `canCloseOpusPlans`.
import { AI_BRAND } from "./ai_brand";
import { canApproveProtocols, canWritePatientPlans, type ProtocolSessionLike } from "./physio_protocols";
import { hasRole } from "./user_roles";

export const PLAN_PARTS = ["devices", "exercises"] as const;
export type PlanPart = (typeof PLAN_PARTS)[number];
export const PART_LABELS: Record<PlanPart, string> = { devices: "الأجهزة", exercises: "التمارين" };
export const isPlanPart = (v: unknown): v is PlanPart => v === "devices" || v === "exercises";

/** رمزُ بند «تمارين» بين أجهزة الخطّة — كما في `shared/physio_plans.ts` (لا استيرادَ دائريّ). */
const EXERCISE_CODE = "exercise";
export const partOfDeviceCode = (code: string | null | undefined): PlanPart => (code === EXERCISE_CODE ? "exercises" : "devices");

/** **الأجزاءُ المطلوبة لنسخة** — تُحسب مرّةً حين تُكتب النسخة (`writeVersionTx`) وتُحفظ في `physio_plans.opus_parts`. */
export function requiredParts(p: { devices: readonly { deviceCode?: string | null; code?: string | null }[];
  phases: readonly { exercises: readonly { exerciseId?: number | null }[] }[] }): PlanPart[] {
  const codes = p.devices.map((d) => d.deviceCode ?? d.code ?? null);
  const out: PlanPart[] = [];
  if (codes.some((c) => c !== EXERCISE_CODE)) out.push("devices");
  if (codes.includes(EXERCISE_CODE) || p.phases.some((ph) => ph.exercises.some((x) => x.exerciseId == null || Number(x.exerciseId) > 0))) out.push("exercises");
  return out;
}
export const normalizeParts = (v: unknown): PlanPart[] =>
  Array.isArray(v) ? PLAN_PARTS.filter((p) => v.includes(p)) : [];

/** أقصى مدّة البديل — شاملاً (القيدُ في ٢٠١: `date_to - date_from <= 60`). */
export const SUBSTITUTION_MAX_DAYS = 61;

/** **يُسند خطّةَ Bionic AI** — المعتمِدُ وحده. */
export const canAssignOpusPlans = (s: ProtocolSessionLike | null | undefined): boolean => canApproveProtocols(s);

/**
 * **قرارُ المالك ٢٠٢٦-١١-٢٨ (D)**: إيقافُ خطّة Bionic AI المعتمَدة وتخرّجُها للأخصائيّ والمسؤول والمشرف العام وحدهم — لا المعالج ولا التقنيّ ولا المدرّب ولا الطبيب.
 * **قاعدةٌ مسمّاة مستقلّة**: لا تتّسع إن اتّسع `canWritePatientPlans` يوماً.
 */
export const canCloseOpusPlans = (s: ProtocolSessionLike | null | undefined): boolean =>
  !!s && (s.isAdmin === true || s.permissions?.canSupervisePhysio === true || hasRole(s, "physio_specialist"));
/**
 * مَن يوقف الخطّةَ أو يخرّجها: خطّةُ Bionic AI بقرار المالك D، وغيرُها بقاعدتها كما كانت.
 * **والأخصائيُّ في فرع الخطّة** (`scope` فروعُه، `null` = كلُّها): ملفٌّ أُتيح لفرعه (§4.t) يقرؤه ولا يوقف خطّةَ فرعٍ آخر — كالتنفيذ؛ والمعتمِدان لكلّ الفروع.
 */
export const canClosePlan = (s: ProtocolSessionLike | null | undefined, plan: { origin?: string | null; branchId?: number | null },
  scope: readonly number[] | null = null): boolean => {
  if (plan.origin !== "opus") return canWritePatientPlans(s);
  if (!canCloseOpusPlans(s)) return false;
  return canApproveProtocols(s) || scope === null || plan.branchId == null || scope.includes(Number(plan.branchId));
};
export const closeOpusForbidden = (): string => `يوقف خطّةَ ${AI_BRAND} أو يخرّجها أخصائيُّ العلاج الطبيعي أو المسؤولُ أو المشرفُ العام`;

export interface AssignmentLite { part: PlanPart; userId: number; name: string | null; eligible: boolean; assignedAt?: string | null }
export interface SubstitutionLite {
  id: number; assigneeId: number; substituteId: number; planId: number | null; part: PlanPart | null;
  status: string; effectiveFrom: string | null; dateTo: string;
  /** وقتُ الاعتماد — بديلُ «كلّ خططه» يغطّي ما كان مُسنَداً إليه حين اعتُمد وحده (`assignedAt <= decidedAt`). */
  decidedAt?: string | null;
  /** البديلُ مؤهَّلٌ في فرع هذه الخطّة الآن (نشطٌ ودورٌ من القسم ويعمل فيه). */
  substituteEligibleHere: boolean;
}
export type PartVerdict =
  | { ok: true; via: "approver" | "assignee" | "substitute"; substitutionId: number | null }
  | { ok: false; code: "part_unassigned" | "part_not_yours"; reasonAr: string };

/**
 * **بديلٌ يغطّي هذا الجزءَ من هذه الخطّة لهذا المُسنَد في هذا اليوم** — معتمَدٌ، نطاقُه يشملها، ويومُه بين بدء نفاذه ونهايته، ومؤهَّلٌ في فرعها.
 * **وبديلُ «كلّ خططه» لا يمتدّ إلى ما أُسند بعد اعتماده**: المعتمِدُ وافق على الخطط التي رآها، فجزءٌ أُسند بعدها يحتاج طلباً جديداً.
 */
export const substitutionCovers = (s: SubstitutionLite, planId: number, part: PlanPart, assigneeId: number, date: string, assignedAt?: string | null): boolean =>
  s.status === "approved" && s.assigneeId === assigneeId && (s.planId == null || s.planId === planId) && (s.part == null || s.part === part)
  && s.effectiveFrom != null && s.effectiveFrom <= date && date <= s.dateTo && s.substituteEligibleHere
  && (s.planId != null || !assignedAt || !s.decidedAt || assignedAt <= s.decidedAt);

/** **مَن يسجّل هذا الجزء** — المعتمِد، أو مُسنَدُه المؤهَّل، أو بديلٌ معتمَد يغطّيه في يوم الجلسة. */
export function partVerdict(p: { approver: boolean; userId: number | null; planId: number; part: PlanPart;
  assignment: AssignmentLite | null; substitutions: readonly SubstitutionLite[]; date: string }): PartVerdict {
  if (p.approver) return { ok: true, via: "approver", substitutionId: null };
  const label = PART_LABELS[p.part];
  const a = p.assignment && p.assignment.eligible ? p.assignment : null;
  if (!a) return { ok: false, code: "part_unassigned", reasonAr: `جزءُ «${label}» لم يُسنَد بعد — ينفّذه المسؤولُ أو المشرفُ العام حتى يُسنَد` };
  if (p.userId != null && a.userId === p.userId) return { ok: true, via: "assignee", substitutionId: null };
  const sub = p.userId == null ? null
    : p.substitutions.find((s) => s.substituteId === p.userId && substitutionCovers(s, p.planId, p.part, a.userId, p.date, a.assignedAt ?? null));
  if (sub) return { ok: true, via: "substitute", substitutionId: sub.id };
  return { ok: false, code: "part_not_yours", reasonAr: `جزءُ «${label}» مُسنَدٌ إلى «${a.name ?? "—"}» — يسجّله مُسنَدُه أو بديلٌ معتمَد لهذا اليوم` };
}

export const isSubstitutionExpired = (s: { status: string; dateTo: string }, today: string): boolean => s.status === "pending" && s.dateTo < today;

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const dayNo = (d: string) => Math.round(Date.parse(`${d}T00:00:00Z`) / 86_400_000);
/** يومٌ موجودٌ حقّاً — «2026-02-31» يمرّ بـ`Date.parse` (يصير ٣ آذار) فيُردّ هنا لا خطأً عامّاً من قاعدة البيانات. */
const realDay = (d: string) => YMD.test(d) && !Number.isNaN(dayNo(d)) && new Date(dayNo(d) * 86_400_000).toISOString().slice(0, 10) === d;
/** **طلبُ البديل صالح؟** — التاريخان، ومن اليوم فصاعداً، والمدّة، والسبب. ⟵ الرسالة أو `null`. */
export function substitutionInputError(p: { dateFrom: string; dateTo: string; reason: string; today: string }): string | null {
  if (!realDay(p.dateFrom) || !realDay(p.dateTo)) return "التاريخان بصيغة سنة-شهر-يوم";
  if (p.dateFrom < p.today) return "لا يُطلب بديلٌ ليومٍ مضى";
  if (p.dateTo < p.dateFrom) return "تاريخُ النهاية قبل البداية";
  if (dayNo(p.dateTo) - dayNo(p.dateFrom) + 1 > SUBSTITUTION_MAX_DAYS) return `أقصى مدّة البديل ${SUBSTITUTION_MAX_DAYS.toLocaleString("ar-IQ")} يوماً`;
  const r = (p.reason ?? "").trim();
  if (r.length < 3) return "اكتب سببَ الغياب (ثلاثةُ أحرفٍ على الأقلّ)";
  if (r.length > 500) return "السببُ أطولُ من ٥٠٠ حرف";
  return null;
}

export const SUBSTITUTION_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار الاعتماد", approved: "معتمَد", rejected: "مرفوض", withdrawn: "سحبه صاحبه", lapsed: "أُلغي",
};
export const LAPSE_EXPIRED = "انتهى أجلُه";
export const LAPSE_ASSIGNMENT_CHANGED = "تغيّر الإسناد";
export const LAPSE_PLAN_CLOSED = "أُغلقت الخطّة";
export const lapsedLabel = (reason: string): string => `أُلغي تلقائياً — ${reason}`;
export const endedLabel = (reason: string): string => `أُنهي مبكّراً — ${reason}`;
/** نطاقُ البديل بالكلمات. */
export const substitutionScopeLabel = (s: { planId: number | null; part: PlanPart | null }, planLabel?: string | null): string =>
  `${s.planId == null ? "كلُّ خطط المُسنَد القائمة عند الاعتماد" : (planLabel ?? "خطّةٌ واحدة")} · ${s.part ? PART_LABELS[s.part] : "الأجزاءُ المُسنَدة كلُّها"}`;
