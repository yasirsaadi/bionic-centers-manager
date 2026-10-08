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
  return canConsultProtocols(s) || status === "approved" || status === "stopped" || status === "graduated";
}

/** يُعدَّل ما لم يُوقَف. */
/** **خطّةٌ منتهية** — موقوفةٌ أو متخرّجة: لا تُعدَّل ولا تُسنَد ولا يُغيَّر نوعُها ولا تُقيَّم. */
export const isPlanClosed = (status: string): boolean => status === "stopped" || status === "graduated";
export const isPlanEditable = (status: string): boolean => !isPlanClosed(status);

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
