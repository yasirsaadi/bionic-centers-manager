// **البوّاباتُ الحتمية بعد Opus** (§4.ha — قرارُ المالك: «بوّاباتٌ حتمية في الشيفرة بعد النموذج») — دالّةٌ صرفة بلا قاعدة بيانات.
//
// النموذجُ يقترح، والشيفرةُ تحكم: الجهازُ الممنوعُ بالمعاينة أو بقرار المعتمِد يُحذف بسببه، وغيرُ المتوفّر في الفرع يُحذف، وفي وضع المكتبة
// **الخطّةُ تُبنى من البروتوكول نفسِه** (`buildLibraryPlan` — مراحلُه وتمارينُه وإعداداتُ أجهزته)، وما يختاره النموذجُ داخلَ حدوده وحدها
// (العددُ حتى سقفه بالتمديد المكتوب، والدقائقُ والتواترُ لا فوقه، وأجهزتُه وحدها، والتمارينُ بطاقاتٌ معتمَدة بأرقامها). والبرنامجُ ليس في
// الكتالوج ⟵ يُحذف، والقيمةُ الاحتياطية خارجَ نطاق الشركة أو بلا مصدرٍ فُتح ⟵ **تُحذف ولا تُقصّ**. وكلُّ حذفٍ أو قصٍّ سطرٌ في السجلّ يراه المعتمِد.
import { btlModelById, btlModelsFor, unitAr, type BtlModel } from "./btl_devices";
import { AGE_GROUPS, PROTOCOL_CATEGORIES, TOTAL_SESSIONS_MAX, doseError, normalizeDose, type CentreUse } from "./physio_protocols";
import { BODY_REGIONS, EXERCISE_KINDS } from "./physio_exercises";
import { arDigits, normalizeSourceUrl, protocolSessionCeiling, type AgentSource, type LibraryProtocolDraft, type PlanMeasure, type ProposedCard,
  type SubmittedPlan } from "./physio_agent";
import { findAuthoredLeaks, type IdentifierSet } from "./physio_agent_privacy";
import { examCautionInputsMissing, examGateInputsMissing, examGroupConfirmed, examRuleset, examV2MissingLabel, isExamV2, protocolsOfExam, V3_OTHER_GROUP } from "./physio_exam_v2";
import { textSafetyConflictsOf } from "./physio_exam_text_safety";

// ══ السياق ══════════════════════════════════════════════════════════════════════════════════════════════
export interface GateProtocolDevice {
  deviceCode: string; centreUse: CentreUse; evidence: string; minutes: number | null; everyDays: number | null; times: number | null;
  params: Record<string, string>;
  /** نصُّ المعاملات كما تنسخه الخطّةُ من البروتوكول (`planLineFromProtocol`) — سطرُ الإعدادات ثمّ الوصف. */
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
}
export interface GatePhaseExercise {
  exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null;
}
export interface GatePhase {
  position: number; nameAr: string; nameEn: string; sessionFrom: number | null; sessionTo: number | null;
  timeframe: string | null; timeframeEn: string | null; goals: string | null; goalsEn: string | null; education: string | null; educationEn: string | null;
  progressCriteria: string | null; progressCriteriaEn: string | null; notes: string | null; notesEn: string | null;
  exercises: GatePhaseExercise[];
}
export interface GateProtocol {
  id: number; code: string; status: string; origin: string; isArchived: boolean;
  totalSessions: number | null; maxTotalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null;
  devices: GateProtocolDevice[]; phases: GatePhase[];
}
export interface GateExercise { archived: boolean; status: string; kind: string; region: string }
export interface GateForbidden { deviceCode: string; reasonAr: string; source: "exam" | "approver" }
export interface GateContext {
  agentGate: { allowed: boolean; code: string; reason: string };
  forbidden: readonly GateForbidden[];
  knownDeviceCodes: ReadonlySet<string>;
  branchAvailable: ReadonlySet<string>;
  protocol: GateProtocol | null;
  exercises: ReadonlyMap<number, GateExercise>;
  fetchedUrls: ReadonlySet<string>;
  searchedUrls: ReadonlySet<string>;
  libraryIds: ReadonlySet<number>;
  ids: IdentifierSet;
  /** جولاتُ الكاتب انتهت ⟵ بعضُ ما كان «راجِع» يصير حذفاً. */
  final: boolean;
  at?: string;
  /** §4.hd — **معاينةُ الإصدار الثالث** (المخزَّنة): تأكيدُ المجموعة ومدخلاتُ البوّابات والحذر بوّاباتٌ مانعة. وغائبٌ للثانية. */
  examConfirm?: ExamConfirmInput | null;
}

/** §4.hd — **معاينةُ الإصدار الثالث للبوّابات**: المخزَّنةُ، ونصوصُها الحرّة وأجوبةُ أسئلة Bionic AI النصّية (لتنبيهات النصّ ضدّ ورقة السلامة). */
export interface ExamConfirmInput { exam: unknown; texts?: readonly (string | null | undefined)[] }
/** رموزُ ما يلزم الفاحصَ أن يكمله في المعاينة — بها يُعرف أنّ الوظيفةَ تنتهي `exam_confirmation_needed` لا «بوّاباتٌ مانعة». */
export const EXAM_CONFIRM_CODES: ReadonlySet<string> = new Set([
  "exam_group_unconfirmed", "exam_gate_inputs_missing", "exam_caution_inputs_missing", "library_protocol_group_other", "library_protocol_outside_group",
  "exam_text_safety_conflict",
]);
export interface ExamConfirmIssue { code: string; target: string | null; reasonAr: string; keys: string[] }
/**
 * **ما يمنع خطّةً على معاينة الإصدار الثالث** — قاعدةٌ واحدة لكتابة Bionic AI (`applyPlanGates`) ولتعديل الخطّة بعد اعتمادها (`applyEditGates`):
 * المجموعةُ وحالتُها، ومدخلاتُ الموانع، ومدخلاتُ سلامة التمرين بأجهزة الخطّة وبروتوكولها (و«خارج المكتبة» مدخلاتُ الشدّة كلُّها)،
 * وبروتوكولُ المكتبة من مجموعة المعاينة وحالتِها، والنصُّ الحرّ الذي يخالف ورقةَ السلامة ولم يؤكّده الفاحص.
 */
export function examConfirmIssues(c: ExamConfirmInput, plan: { deviceCodes: readonly string[]; library: boolean; protocolCode: string | null }): ExamConfirmIssue[] {
  const a = c.exam;
  if (!isExamV2(a) || examRuleset(a) !== "v3") return [];
  const g = (a as any)?.core?.group;
  const out: ExamConfirmIssue[] = [];
  const names = (keys: string[]) => keys.map((k) => examV2MissingLabel(k, g)).join("، ");
  if (!examGroupConfirmed(a)) out.push({ code: "exam_group_unconfirmed", target: "core.group", reasonAr: GATE_REASONS.exam_group_unconfirmed, keys: ["core.group", "module.condition"] });
  const gi = examGateInputsMissing(a);
  if (gi.length) out.push({ code: "exam_gate_inputs_missing", target: gi.join(","), reasonAr: `${GATE_REASONS.exam_gate_inputs_missing}: ${names(gi)}`, keys: gi });
  const cm = examCautionInputsMissing(a, { deviceCodes: plan.deviceCodes, protocolCode: plan.library ? plan.protocolCode : null, outOfLibrary: !plan.library });
  if (cm.length) out.push({ code: "exam_caution_inputs_missing", target: cm.join(","), reasonAr: `${GATE_REASONS.exam_caution_inputs_missing}: ${names(cm)}`, keys: cm });
  if (plan.library && g === V3_OTHER_GROUP) out.push({ code: "library_protocol_group_other", target: "core.group", reasonAr: GATE_REASONS.library_protocol_group_other, keys: ["core.group"] });
  //  §4.hd (المراجعة) — بروتوكولُ مكتبةٍ من غير مجموعة المعاينة وحالتِها يُسقط موانعَ الحالة (الروبوتُ للجلطة وحدها…) — مانعٌ لا ملاحظة.
  const allowed = protocolsOfExam(a);
  if (plan.library && plan.protocolCode && g !== V3_OTHER_GROUP && examGroupConfirmed(a) && allowed.length && !allowed.includes(plan.protocolCode)) {
    out.push({ code: "library_protocol_outside_group", target: `protocol:${plan.protocolCode}`,
      reasonAr: `${GATE_REASONS.library_protocol_outside_group} (${allowed.join("، ")})`, keys: ["core.group", "module.condition"] });
  }
  const hits = textSafetyConflictsOf(a, c.texts ?? []);
  if (hits.length) {
    out.push({ code: "exam_text_safety_conflict", target: hits.map((h) => h.key).join(","),
      reasonAr: `${GATE_REASONS.exam_text_safety_conflict}: ${hits.map((h) => `${h.labelAr} («${h.term}»)`).join("، ")} — صحّح ورقةَ السلامة أو أكّدها في المعاينة`,
      keys: hits.map((h) => h.key) });
  }
  return out;
}

// ══ السجلّ ══════════════════════════════════════════════════════════════════════════════════════════════
export type GateKind = "blocking" | "removed" | "clamped" | "info" | "warning";
export interface GateLogEntry { code: string; kind: GateKind; target: string | null; reasonAr: string; before?: unknown; after?: unknown; at?: string }

export const GATE_REASONS: Record<string, string> = {
  gate_closed: "بوّابةُ الوكيل مغلقة",
  unknown_device: "جهازٌ غيرُ موجود في التطبيق",
  duplicate_device: "جهازٌ مكرّر",
  forbidden: "ممنوع",
  unavailable_in_branch: "غيرُ متوفّرٍ في فرع المريض",
  not_in_protocol: "ليس في البروتوكول",
  not_used: "«لا يُستخدم» في البروتوكول",
  use_clamped: "مساعدٌ في البروتوكول — لا يصير أساسيّاً",
  not_recommended: "غيرُ موصى به في الدليل",
  no_core_device: "لم يبقَ جهازٌ أساسيّ",
  minutes_clamped: "دقائقُ الجهاز فوق الحدّ",
  schedule_from_protocol: "الموعدُ الدوريّ من البروتوكول",
  schedule_invalid: "موعدٌ دوريٌّ غيرُ صالح",
  btl_model_required: "اختر موديلَ الجهاز (شعاعيّ أو مركّز)",
  btl_model_missing: "بلا موديلٍ للجهاز — حُذف السطر",
  btl_model_filled: "الموديلُ الوحيد للجهاز",
  btl_model_forced_null: "جهازٌ بلا موديلٍ في الكتالوج",
  program_stripped: "برنامجٌ غيرُ مسجَّل في الكتالوج",
  param_unknown: "قيمةٌ لا تعرفها الشركةُ لهذا الموديل",
  param_unit_mismatch: "وحدةٌ لا تطابق الموديل",
  param_out_of_range: "خارجَ نطاق الشركة المصنّعة — حُذفت ولم تُقصّ",
  param_cross_rule: "قيدُ الجهاز المتبادل",
  param_unsourced: "قيمةٌ بلا مصدرٍ فُتح",
  param_differs_from_protocol: "تخالف قيمةَ البروتوكول المكتوبة",
  evidence_from_protocol: "درجةُ الدليل من البروتوكول",
  sessions_clamped: "عددُ الجلسات خارجَ حدود البروتوكول",
  spw_clamped: "جلساتُ الأسبوع خارجَ الحدّ",
  session_minutes_clamped: "دقائقُ الجلسة خارجَ الحدّ",
  dose_invalid: "الجرعةُ غيرُ صالحة",
  dose_missing: "عددُ الجلسات غائب",
  phase_ranges_fixed: "نطاقاتُ المراحل أُعيد حسابُها",
  starting_phase_clamped: "مرحلةُ البدء خارجَ المراحل",
  exercise_missing: "تمرينٌ غيرُ موجود في المكتبة",
  exercise_archived: "تمرينٌ مؤرشف",
  exercise_dose_clamped: "جرعةُ التمرين خارجَ الحدّ",
  exercise_not_in_protocol: "تبديلٌ لا يطابق مرحلةَ البروتوكول",
  exercise_draft_substitute: "البديلُ بطاقةٌ غيرُ معتمَدة",
  exercise_draft: "بطاقةُ البروتوكول مسوّدةٌ لم تُعتمد",
  exercise_changed: "تبديلُ تمرين",
  protocol_device_omitted: "جهازٌ في البروتوكول لم يختره Bionic AI",
  source_not_fetched: "مصدرٌ لم يفتحه Bionic AI",
  sources_missing: "خطّةٌ خارج المكتبة بلا مصادر",
  source_dropped: "مصدرٌ لم يظهر في البحث",
  protocol_missing: "البروتوكولُ غيرُ موجود أو مؤرشف أو مسوّدةٌ غيرُ معتمَدة",
  measure_dropped: "مقياسٌ غيرُ صالح",
  measures_from_protocol: "مقاييسُ البروتوكول تحكم",
  card_enum_invalid: "نوعُ البطاقة أو منطقتُها خارجَ القائمة",
  protocol_enum_invalid: "فئةُ البروتوكول أو فئتُه العمرية خارجَ القائمة",
  alternative_unknown: "بديلٌ ليس في المكتبة",
  generic_text_identifier: "في نصّ البروتوكول العامّ ما يشبه هويّةَ المريض",
  empty_plan: "لا أجهزةَ ولا تمارين",
  exam_group_unconfirmed: "مجموعةُ التشخيص وحالتُها لم يؤكّدهما الفاحص",
  exam_gate_inputs_missing: "خانةٌ في المعاينة تحتاجها موانعُ هذه الحالة",
  exam_caution_inputs_missing: "خانةٌ تحتاجها سلامةُ التمرين لم تُسجَّل",
  library_protocol_group_other: "بروتوكولُ المكتبة يحتاج مجموعةَ التشخيص الحقيقية",
  library_protocol_outside_group: "بروتوكولُ المكتبة ليس من مجموعة المعاينة وحالتِها",
  exam_text_safety_conflict: "في النصّ ما يخالف ورقةَ السلامة",
  no_settings: "لا برنامجَ ولا قيمَ احتياطيةً ولا إعداداتٍ في البروتوكول — لا يجد المعالجُ ما يضبط به الجهاز",
};

// ══ الخطّةُ بعد البناء والبوّابات ══════════════════════════════════════════════════════════════════════
export interface BtlLine {
  modelId: string; modelNameEn: string; modelNameAr?: string; program: string | null;
  fallback: { key: string; labelEn: string; labelAr?: string; value: number; unit: string; source: string }[];
  flags: string[];
}
export interface BuiltDevice {
  deviceCode: string; use: "core" | "adjunct"; minutes: number | null; everyDays: number | null; times: number | null;
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  evidence: string | null; reasonAr: string; reasonEn: string; btl: BtlLine | null;
  /** إعداداتُ البروتوكول المكتوبة لهذا الجهاز (تُعرض للمعتمِد بجانب القيم الاحتياطية). */
  protocolParams: Record<string, string>;
}
export interface BuiltPhaseExercise {
  exerciseId: number | null; proposedKey: string | null; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null;
}
export interface BuiltPhase {
  position: number; nameAr: string; nameEn: string; sessionFrom: number | null; sessionTo: number | null;
  timeframe: string | null; timeframeEn: string | null; goals: string | null; goalsEn: string | null; education: string | null; educationEn: string | null;
  progressCriteria: string | null; progressCriteriaEn: string | null; notes: string | null; notesEn: string | null;
  exercises: BuiltPhaseExercise[];
}
export interface GatedPlan {
  mode: SubmittedPlan["mode"]; protocolId: number | null; track: SubmittedPlan["track"]; startingPhase: number;
  totalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null;
  phases: BuiltPhase[]; devices: BuiltDevice[];
  removed: { deviceCode: string; reasonAr: string; by: "gate" | "model"; code: string | null }[];
  exerciseChanges: { phase: number; fromExerciseId: number | null; toExerciseId: number | null; reasonAr: string }[];
  proposedCards: ProposedCard[]; libraryProtocol: LibraryProtocolDraft | null;
  precautionsAr: string | null; precautionsEn: string | null; stopRulesAr: string | null; stopRulesEn: string | null;
  homeProgramAr: string | null; homeProgramEn: string | null; goalsAr: string | null; goalsEn: string | null;
  rationaleAr: string | null; rationaleEn: string | null;
  measures: PlanMeasure[]; alternatives: SubmittedPlan["alternatives"]; assumptions: string[]; sources: AgentSource[];
  phaseNotes: SubmittedPlan["phaseNotes"];
}
export interface GateResult { plan: GatedPlan; log: GateLogEntry[]; blocking: GateLogEntry[] }

const clampInt = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** **نطاقاتُ المراحل بنسبة العدد الجديد** — متّصلةٌ من ١ إلى العدد، ولكلّ مرحلةٍ جلسةٌ على الأقلّ ما أمكن. */
export function rescalePhaseRanges<T extends { sessionFrom: number | null; sessionTo: number | null }>(phases: T[], fromTotal: number | null, toTotal: number): T[] {
  if (!phases.length) return phases;
  const n = phases.length;
  const ends: number[] = [];
  const base = fromTotal && fromTotal > 0 ? fromTotal : null;
  const allRanged = base !== null && phases.every((p) => p.sessionTo !== null && p.sessionTo! >= 1);
  for (let i = 0; i < n; i++) {
    const raw = allRanged ? Math.round((phases[i].sessionTo! * toTotal) / base!) : Math.round(((i + 1) * toTotal) / n);
    ends.push(i === n - 1 ? toTotal : raw);
  }
  let prev = 0;
  return phases.map((p, i) => {
    const minEnd = Math.min(toTotal, prev + 1);
    const maxEnd = toTotal - (n - 1 - i);
    const end = i === n - 1 ? toTotal : clampInt(ends[i], Math.min(minEnd, maxEnd), Math.max(minEnd, maxEnd));
    const from = Math.min(prev + 1, toTotal);
    prev = Math.max(prev, end);
    return { ...p, sessionFrom: from, sessionTo: Math.max(from, end) };
  });
}

/**
 * **خطّةُ المكتبة تُبنى من البروتوكول** — مراحلُه وتمارينُها بجرعتها، وإعداداتُ أجهزته المكتوبة، كما ينسخها «خطة جديدة»؛ والنموذجُ يختار داخلها:
 * التبديلُ والحذفُ والإضافةُ بأرقام بطاقاتٍ **معتمَدة** في مرحلتها، وملاحظاتُ المراحل ملاحظاتٌ لا نصوص. وما لا يطابق ⟵ سطرٌ في السجلّ ويُتجاهل.
 */
export function buildLibraryPlan(protocol: GateProtocol, s: SubmittedPlan, exercises: ReadonlyMap<number, GateExercise>, total: number, log: GateLogEntry[], at?: string): {
  phases: BuiltPhase[]; changes: GatedPlan["exerciseChanges"];
} {
  const add = (e: Omit<GateLogEntry, "at">) => log.push({ ...e, ...(at ? { at } : {}) });
  const phases: BuiltPhase[] = protocol.phases.slice().sort((a, b) => a.position - b.position).map((p, i) => ({
    position: i + 1, nameAr: p.nameAr, nameEn: p.nameEn, sessionFrom: p.sessionFrom, sessionTo: p.sessionTo,
    timeframe: p.timeframe, timeframeEn: p.timeframeEn, goals: p.goals, goalsEn: p.goalsEn, education: p.education, educationEn: p.educationEn,
    progressCriteria: p.progressCriteria, progressCriteriaEn: p.progressCriteriaEn, notes: p.notes, notesEn: p.notesEn,
    exercises: p.exercises.map((x) => ({ exerciseId: x.exerciseId, proposedKey: null, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds,
      restSeconds: x.restSeconds, doseNote: x.doseNote, doseNoteEn: x.doseNoteEn, note: x.note, noteEn: x.noteEn })),
  }));
  for (const ph of phases) for (const x of ph.exercises) {
    const ex = x.exerciseId !== null ? exercises.get(x.exerciseId) : undefined;
    if (ex && ex.status !== "approved") add({ code: "exercise_draft", kind: "info", target: `exercise:${x.exerciseId}`, reasonAr: GATE_REASONS.exercise_draft });
  }
  const changes: GatedPlan["exerciseChanges"] = [];
  for (const c of s.exerciseChanges) {
    const ph = phases.find((p) => p.position === c.phase);
    const target = `phase:${c.phase}:${c.fromExerciseId ?? "+"}→${c.toExerciseId ?? "−"}`;
    const ignore = (code: string) => add({ code, kind: "info", target, reasonAr: GATE_REASONS[code], before: c });
    if (!ph || (c.fromExerciseId === null && c.toExerciseId === null)) { ignore("exercise_not_in_protocol"); continue; }
    const idx = c.fromExerciseId === null ? -1 : ph.exercises.findIndex((x) => x.exerciseId === c.fromExerciseId);
    if (c.fromExerciseId !== null && idx < 0) { ignore("exercise_not_in_protocol"); continue; }
    if (c.toExerciseId !== null) {
      const to = exercises.get(c.toExerciseId);
      if (!to || to.archived) { ignore("exercise_missing"); continue; }
      if (to.status !== "approved") { ignore("exercise_draft_substitute"); continue; }
      if (ph.exercises.some((x) => x.exerciseId === c.toExerciseId)) { ignore("exercise_not_in_protocol"); continue; }
    }
    if (idx >= 0 && c.toExerciseId !== null) {
      ph.exercises[idx] = { ...ph.exercises[idx], exerciseId: c.toExerciseId, note: c.reasonAr || ph.exercises[idx].note };
    } else if (idx >= 0) {
      ph.exercises.splice(idx, 1);
    } else {
      const card = exercises.get(c.toExerciseId!);
      void card;
      ph.exercises.push({ exerciseId: c.toExerciseId, proposedKey: null, sets: null, reps: null, holdSeconds: null, restSeconds: null,
        doseNote: null, doseNoteEn: null, note: c.reasonAr || null, noteEn: null });
    }
    changes.push(c);
    add({ code: "exercise_changed", kind: "info", target, reasonAr: c.reasonAr || GATE_REASONS.exercise_changed });
  }
  for (const n of s.phaseNotes) {
    const ph = phases.find((p) => p.position === n.phase);
    if (!ph) continue;
    ph.notes = [ph.notes, `Bionic AI: ${n.noteAr}`].filter(Boolean).join("\n");
    if (n.noteEn) ph.notesEn = [ph.notesEn, `Bionic AI: ${n.noteEn}`].filter(Boolean).join("\n");
  }
  return { phases: protocol.totalSessions && protocol.totalSessions !== total ? rescalePhaseRanges(phases, protocol.totalSessions, total) : phases, changes };
}

/** سطرُ BTL مكتوباً بجانب معاملات الجهاز في الخطّة. */
export function btlLineText(b: BtlLine | null, lang: "ar" | "en"): string | null {
  if (!b) return null;
  //  النصُّ العربيّ يقرؤه المعالجُ في الجلسة: أسماءُ القيم ووحداتُها بالعربية وأرقامٌ هنديّة؛ واسمُ الموديل اسمُ منتَج.
  if (lang === "ar") {
    const model = btlModelById(b.modelId);
    const vals = b.fallback.map((f) => `${f.labelAr ?? model?.params.find((p) => p.key === f.key)?.labelAr ?? f.labelEn} ${arDigits(f.value)} ${unitAr(f.unit)}`).join("، ");
    return `الجهاز: ${b.modelNameAr ?? model?.nameAr ?? b.modelNameEn} · البرنامج: ${b.program ?? "—"}${vals ? ` · القيم الاحتياطية: ${vals}` : ""}`;
  }
  const vals = b.fallback.map((f) => `${f.labelEn} ${f.value} ${f.unit}`).join(", ");
  return `BTL: ${b.modelNameEn} · program: ${b.program ?? "—"}${vals ? ` · fallback: ${vals}` : ""}`;
}

/** خانةُ البروتوكول لمفتاح BTL — مفاتيحُ `DEVICE_REQUIRED_SETTINGS` حيث تتطابق. */
export const BTL_TO_PROTOCOL_KEY: Record<string, string> = {
  pressure_bar: "pressureBar", energy_flux_mj_mm2: "energyMj", frequency_hz: "frequencyHz", shocks: "impulses",
};
const numOf = (s: string | undefined): number | null => {
  if (typeof s !== "string") return null;
  const m = s.replace(/٫/g, ".").replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

function gateBtl(d: { deviceCode: string; btlModelId: string | null; program: string | null; fallback: SubmittedPlan["devices"][number]["fallback"] },
  protocolLine: GateProtocolDevice | null, ctx: GateContext, add: (e: Omit<GateLogEntry, "at">) => void): { btl: BtlLine | null; drop: boolean } {
  const models = btlModelsFor(d.deviceCode);
  const target = `device:${d.deviceCode}`;
  if (!models.length) {
    if (d.btlModelId || d.program || d.fallback.length) add({ code: "btl_model_forced_null", kind: "info", target, reasonAr: GATE_REASONS.btl_model_forced_null, before: d.btlModelId });
    return { btl: null, drop: false };
  }
  let model: BtlModel | null = btlModelById(d.btlModelId);
  if (model && model.deviceCode !== d.deviceCode) model = null;
  if (!model) {
    if (models.length === 1) {
      model = models[0];
      if (d.btlModelId) add({ code: "btl_model_filled", kind: "info", target, reasonAr: GATE_REASONS.btl_model_filled, before: d.btlModelId, after: model.id });
    } else if (ctx.final) {
      add({ code: "btl_model_missing", kind: "removed", target, reasonAr: GATE_REASONS.btl_model_missing, before: d.btlModelId });
      return { btl: null, drop: true };
    } else {
      add({ code: "btl_model_required", kind: "blocking", target, reasonAr: `${GATE_REASONS.btl_model_required}: ${models.map((m) => m.nameAr).join(" أو ")}`, before: d.btlModelId });
      return { btl: null, drop: false };
    }
  }
  let program = d.program;
  if (program && !model.programs.includes(program)) {
    add({ code: "program_stripped", kind: "removed", target, reasonAr: GATE_REASONS.program_stripped, before: program });
    program = null;
  }
  const flags: string[] = [];
  const kept: BtlLine["fallback"] = [];
  for (const f of d.fallback) {
    const p = model.params.find((x) => x.key === f.key);
    const t = `${target}:${f.key}`;
    if (!p) { add({ code: "param_unknown", kind: "removed", target: t, reasonAr: GATE_REASONS.param_unknown, before: f }); continue; }
    if (f.unit && f.unit.toLowerCase().replace(/[²\s]/g, "2") !== p.unit.toLowerCase().replace(/[²\s]/g, "2")) {
      add({ code: "param_unit_mismatch", kind: "removed", target: t, reasonAr: `${GATE_REASONS.param_unit_mismatch} (${unitAr(p.unit)})`, before: f }); continue;
    }
    if (f.value < p.min || f.value > p.max) {
      add({ code: "param_out_of_range", kind: "removed", target: t, reasonAr: `${GATE_REASONS.param_out_of_range} (${arDigits(p.min)}–${arDigits(p.max)} ${unitAr(p.unit)})`, before: f }); continue;
    }
    //  G9b — المصدر: «protocol» حين كتب البروتوكولُ القيمةَ نفسَها، أو رابطٌ فُتح؛ وإلّا تُحذف.
    if (f.source === "protocol") {
      const pk = BTL_TO_PROTOCOL_KEY[f.key];
      const written = protocolLine && pk ? numOf(protocolLine.params[pk]) : null;
      if (written === null) { add({ code: "param_unsourced", kind: "removed", target: t, reasonAr: `${GATE_REASONS.param_unsourced} — البروتوكولُ لم يكتبها`, before: f }); continue; }
      if (written !== f.value) {
        add({ code: "param_differs_from_protocol", kind: "warning", target: t, reasonAr: `${GATE_REASONS.param_differs_from_protocol} (${arDigits(written)})`, before: f, after: written });
        flags.push(`param_differs_from_protocol:${f.key}`);
      }
    } else if (!f.source || !ctx.fetchedUrls.has(normalizeSourceUrl(f.source))) {
      add({ code: "param_unsourced", kind: "removed", target: t, reasonAr: GATE_REASONS.param_unsourced, before: f }); continue;
    }
    kept.push({ key: p.key, labelEn: p.labelEn, labelAr: p.labelAr, value: f.value, unit: p.unit, source: f.source });
  }
  for (const r of model.crossRules) {
    const w = kept.find((k) => k.key === r.whenKey);
    const li = kept.findIndex((k) => k.key === r.limitKey);
    if (w && li >= 0 && w.value > r.whenAbove && kept[li].value > r.max) {
      add({ code: "param_cross_rule", kind: "removed", target: `${target}:${r.limitKey}`, reasonAr: `${GATE_REASONS.param_cross_rule}: ${r.textAr}`, before: kept[li] });
      kept.splice(li, 1);
    }
  }
  return { btl: { modelId: model.id, modelNameEn: model.nameEn, modelNameAr: model.nameAr, program, fallback: kept, flags }, drop: false };
}

/** **البوّاباتُ كلُّها بترتيبها** (G0–G14 في §4.ha). `blocking` غيرُ فارغ ⟵ «راجِع» في الجولات، وفشلُ الوظيفة في النهائيّ. */
export function applyPlanGates(s: SubmittedPlan, ctx: GateContext): GateResult {
  const log: GateLogEntry[] = [];
  const add = (e: Omit<GateLogEntry, "at">) => log.push({ ...e, ...(ctx.at ? { at: ctx.at } : {}) });
  const library = s.mode === "library";
  const pr = library ? ctx.protocol : null;
  const plan: GatedPlan = {
    mode: s.mode, protocolId: library ? s.protocolId : null, track: s.track, startingPhase: s.startingPhase,
    totalSessions: null, sessionsPerWeek: null, sessionMinutes: null, phases: [], devices: [], removed: [], exerciseChanges: [],
    proposedCards: library ? [] : s.proposedCards, libraryProtocol: library ? null : s.libraryProtocol,
    precautionsAr: s.precautionsAr, precautionsEn: s.precautionsEn, stopRulesAr: s.stopRulesAr, stopRulesEn: s.stopRulesEn,
    homeProgramAr: s.homeProgramAr, homeProgramEn: s.homeProgramEn, goalsAr: s.goalsAr, goalsEn: s.goalsEn,
    rationaleAr: s.rationaleAr, rationaleEn: s.rationaleEn, measures: [], alternatives: [], assumptions: s.assumptions, sources: [],
    phaseNotes: s.phaseNotes,
  };
  const done = (): GateResult => ({ plan, log, blocking: log.filter((e) => e.kind === "blocking") });

  //  G0 — البوّابة.
  if (!ctx.agentGate.allowed) { add({ code: "gate_closed", kind: "blocking", target: null, reasonAr: `${GATE_REASONS.gate_closed}: ${ctx.agentGate.reason}` }); return done(); }
  //  G0b — §4.hd: معاينةُ الإصدار الثالث — لا خطّةَ على مجموعةٍ لم تُؤكَّد أو مدخلٍ للموانع أو لسلامة التمرين لم يُسجَّل (الكاتبُ يُردّ قبلها؛ وهذه احتياط).
  if (ctx.examConfirm) {
    for (const i of examConfirmIssues(ctx.examConfirm, { deviceCodes: s.devices.map((d) => d.deviceCode), library, protocolCode: library ? pr?.code ?? null : null })) {
      add({ code: i.code, kind: "blocking", target: i.target, reasonAr: i.reasonAr });
    }
  }
  //  G13b — بروتوكولُ المكتبة موجودٌ حيٌّ معتمَدٌ إن كان من Opus.
  if (library && (!pr || pr.id !== s.protocolId || pr.isArchived || (pr.origin === "opus" && pr.status !== "approved"))) {
    add({ code: "protocol_missing", kind: "blocking", target: `protocol:${s.protocolId}`, reasonAr: GATE_REASONS.protocol_missing });
    return done();
  }

  // ── الجرعة (G10 · G10b · G10c) ──
  const ceiling = pr ? protocolSessionCeiling(pr) : TOTAL_SESSIONS_MAX;
  let total = s.dose.totalSessions;
  if (total === null) total = pr ? pr.totalSessions : (s.phases.length ? Math.max(0, ...s.phases.map((p) => p.sessionTo ?? 0)) || null : null);
  if (total === null) add({ code: "dose_missing", kind: "blocking", target: "dose.total_sessions", reasonAr: GATE_REASONS.dose_missing });
  else if (total < 1 || total > ceiling) {
    const t = clampInt(total, 1, ceiling);
    add({ code: "sessions_clamped", kind: "clamped", target: "dose.total_sessions", reasonAr: `${GATE_REASONS.sessions_clamped} (١–${arDigits(ceiling)})`, before: total, after: t });
    total = t;
  }
  const spwMax = pr?.sessionsPerWeek ? Math.min(7, pr.sessionsPerWeek) : 7;
  let spw = s.dose.sessionsPerWeek ?? pr?.sessionsPerWeek ?? null;
  if (spw !== null && (spw < 1 || spw > spwMax)) {
    const v = clampInt(spw, 1, spwMax);
    add({ code: "spw_clamped", kind: "clamped", target: "dose.sessions_per_week", reasonAr: `${GATE_REASONS.spw_clamped} (١–${arDigits(spwMax)})`, before: spw, after: v });
    spw = v;
  }
  const minMax = pr?.sessionMinutes ? Math.min(90, pr.sessionMinutes) : 90;
  let minutes = s.dose.sessionMinutes ?? pr?.sessionMinutes ?? null;
  if (minutes !== null && (minutes < 10 || minutes > minMax)) {
    const v = clampInt(minutes, Math.min(10, minMax), minMax);
    add({ code: "session_minutes_clamped", kind: "clamped", target: "dose.session_minutes", reasonAr: `${GATE_REASONS.session_minutes_clamped} (١٠–${arDigits(minMax)})`, before: minutes, after: v });
    minutes = v;
  }
  const dose = normalizeDose({ sessionsPerWeek: spw, durationWeeks: null, totalSessions: total });
  const de = doseError(dose);
  if (de) add({ code: "dose_invalid", kind: "blocking", target: "dose", reasonAr: de });
  plan.totalSessions = total; plan.sessionsPerWeek = spw; plan.sessionMinutes = minutes;

  // ── المراحلُ والتمارين ──
  if (library && pr) {
    const built = buildLibraryPlan(pr, s, ctx.exercises, total ?? pr.totalSessions ?? 1, log, ctx.at);
    plan.phases = built.phases; plan.exerciseChanges = built.changes;
    if (s.measures.length) add({ code: "measures_from_protocol", kind: "info", target: "measures", reasonAr: GATE_REASONS.measures_from_protocol });
  } else {
    plan.phases = s.phases.map((p, i) => ({
      position: i + 1, nameAr: p.nameAr || `المرحلة ${arDigits(i + 1)}`, nameEn: p.nameEn || `Phase ${i + 1}`, sessionFrom: p.sessionFrom, sessionTo: p.sessionTo,
      timeframe: null, timeframeEn: null, goals: p.goalsAr, goalsEn: p.goalsEn, education: p.educationAr, educationEn: p.educationEn,
      progressCriteria: p.progressAr, progressCriteriaEn: p.progressEn, notes: null, notesEn: null,
      exercises: p.exercises.flatMap((x): BuiltPhaseExercise[] => {
        if (x.exerciseId !== null) {
          const ex = ctx.exercises.get(x.exerciseId);
          if (!ex) { add({ code: "exercise_missing", kind: "removed", target: `exercise:${x.exerciseId}`, reasonAr: GATE_REASONS.exercise_missing }); return []; }
          if (ex.archived) { add({ code: "exercise_archived", kind: "removed", target: `exercise:${x.exerciseId}`, reasonAr: GATE_REASONS.exercise_archived }); return []; }
        }
        return [{ exerciseId: x.exerciseId, proposedKey: x.proposedKey, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds,
          doseNote: x.doseNoteAr, doseNoteEn: x.doseNoteEn, note: x.whyEn, noteEn: x.whyEn }];
      }),
    }));
    //  G11 — نطاقاتُ المراحل متّصلةٌ من ١ إلى العدد.
    if (total !== null && plan.phases.length) {
      let ok = plan.phases[0].sessionFrom === 1 && plan.phases[plan.phases.length - 1].sessionTo === total;
      for (let i = 0; ok && i < plan.phases.length; i++) {
        const p = plan.phases[i];
        if (p.sessionFrom === null || p.sessionTo === null || p.sessionTo < p.sessionFrom) ok = false;
        else if (i > 0 && p.sessionFrom !== (plan.phases[i - 1].sessionTo ?? 0) + 1) ok = false;
      }
      if (!ok) {
        plan.phases = rescalePhaseRanges(plan.phases.map((p) => ({ ...p, sessionFrom: null, sessionTo: null })), null, total);
        add({ code: "phase_ranges_fixed", kind: "clamped", target: "phases", reasonAr: GATE_REASONS.phase_ranges_fixed });
      }
    }
    //  G13c — المقاييس.
    const seenM = new Set<string>();
    for (const m of s.measures) {
      if (!m.code || !m.nameAr || !m.nameEn || !Number.isFinite(m.min) || !Number.isFinite(m.max) || m.min >= m.max || seenM.has(m.code) || plan.measures.length >= 10) {
        add({ code: "measure_dropped", kind: "removed", target: `measure:${m.code}`, reasonAr: GATE_REASONS.measure_dropped, before: m }); continue;
      }
      seenM.add(m.code); plan.measures.push(m);
    }
  }
  //  G12c — جرعةُ التمرين بحدود قيود القاعدة.
  for (const ph of plan.phases) for (const x of ph.exercises) {
    const before = { sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds };
    if (x.sets !== null) x.sets = clampInt(x.sets, 1, 10);
    if (x.reps !== null) x.reps = clampInt(x.reps, 1, 100);
    if (x.holdSeconds !== null) x.holdSeconds = x.holdSeconds <= 0 ? null : clampInt(x.holdSeconds, 1, 600);
    if (x.restSeconds !== null) x.restSeconds = clampInt(x.restSeconds, 0, 600);
    const after = { sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      add({ code: "exercise_dose_clamped", kind: "clamped", target: `exercise:${x.exerciseId ?? x.proposedKey}`, reasonAr: GATE_REASONS.exercise_dose_clamped, before, after });
    }
  }
  //  G11b — مرحلةُ البدء.
  const nPh = Math.max(1, plan.phases.length);
  if (plan.startingPhase < 1 || plan.startingPhase > nPh) {
    const v = clampInt(plan.startingPhase, 1, nPh);
    add({ code: "starting_phase_clamped", kind: "clamped", target: "starting_phase", reasonAr: GATE_REASONS.starting_phase_clamped, before: plan.startingPhase, after: v });
    plan.startingPhase = v;
  }

  // ── الأجهزة (G1–G9b) ──
  for (const r of s.removedDevices) plan.removed.push({ deviceCode: r.deviceCode, reasonAr: r.reasonAr, by: "model", code: null });
  const forbidden = new Map<string, GateForbidden[]>();
  for (const f of ctx.forbidden) forbidden.set(f.deviceCode, [...(forbidden.get(f.deviceCode) ?? []), f]);
  const seen = new Set<string>();
  const drop = (code: string, deviceCode: string, reasonAr: string) => {
    add({ code, kind: "removed", target: `device:${deviceCode}`, reasonAr });
    plan.removed.push({ deviceCode, reasonAr, by: "gate", code });
  };
  for (const d of s.devices) {
    if (!ctx.knownDeviceCodes.has(d.deviceCode)) { drop("unknown_device", d.deviceCode, GATE_REASONS.unknown_device); continue; }
    if (seen.has(d.deviceCode)) { drop("duplicate_device", d.deviceCode, GATE_REASONS.duplicate_device); continue; }
    seen.add(d.deviceCode);
    const fb = forbidden.get(d.deviceCode);
    if (fb) {
      const byApprover = fb.some((f) => f.source === "approver");
      drop("forbidden", d.deviceCode, `${byApprover && !fb.some((f) => f.source === "exam") ? "ممنوعٌ بقرار المعتمِد" : "ممنوعٌ بالمعاينة"}: ${fb.map((f) => f.reasonAr).join("؛ ")}`);
      continue;
    }
    if (!ctx.branchAvailable.has(d.deviceCode)) { drop("unavailable_in_branch", d.deviceCode, GATE_REASONS.unavailable_in_branch); continue; }
    let line: GateProtocolDevice | null = null;
    let use = d.use;
    if (library && pr) {
      line = pr.devices.find((l) => l.deviceCode === d.deviceCode) ?? null;
      if (!line) { drop("not_in_protocol", d.deviceCode, GATE_REASONS.not_in_protocol); continue; }
      if (line.centreUse === "not_used") { drop("not_used", d.deviceCode, GATE_REASONS.not_used); continue; }
      if (line.centreUse === "adjunct" && use === "core") {
        add({ code: "use_clamped", kind: "clamped", target: `device:${d.deviceCode}`, reasonAr: GATE_REASONS.use_clamped, before: "core", after: "adjunct" });
        use = "adjunct";
      }
      if (d.evidence && d.evidence !== line.evidence) {
        add({ code: "evidence_from_protocol", kind: "info", target: `device:${d.deviceCode}`, reasonAr: GATE_REASONS.evidence_from_protocol, before: d.evidence, after: line.evidence });
      }
    } else if (d.evidence === "not_recommended") { drop("not_recommended", d.deviceCode, GATE_REASONS.not_recommended); continue; }
    //  G5 — الدقائق.
    const minCap = Math.min(line?.minutes ?? 60, minutes ?? 60);
    let dm = d.minutes;
    if (dm !== null && (dm < 1 || dm > minCap)) {
      const v = clampInt(dm, 1, minCap);
      add({ code: "minutes_clamped", kind: "clamped", target: `device:${d.deviceCode}`, reasonAr: `${GATE_REASONS.minutes_clamped} (١–${arDigits(minCap)})`, before: dm, after: v });
      dm = v;
    }
    if (dm === null && line?.minutes) dm = Math.min(line.minutes, minCap);
    //  G6 — الموعدُ الدوريّ.
    let everyDays = d.everyDays; let times = d.times;
    if (line) {
      if (everyDays !== line.everyDays || times !== line.times) {
        if (everyDays !== null || times !== null || line.everyDays !== null) add({ code: "schedule_from_protocol", kind: "info", target: `device:${d.deviceCode}`, reasonAr: GATE_REASONS.schedule_from_protocol, before: { everyDays, times }, after: { everyDays: line.everyDays, times: line.times } });
      }
      everyDays = line.everyDays; times = line.times;
    } else {
      const okE = everyDays === null || (everyDays >= 1 && everyDays <= 60);
      const okT = times === null || (times >= 1 && times <= 30 && everyDays !== null);
      if (!okE || !okT) { add({ code: "schedule_invalid", kind: "clamped", target: `device:${d.deviceCode}`, reasonAr: GATE_REASONS.schedule_invalid, before: { everyDays, times } }); everyDays = null; times = null; }
    }
    //  G7–G9b — موديلُ BTL وبرنامجُه وقيمُه.
    const b = gateBtl(d, line, ctx, add);
    if (b.drop) { plan.removed.push({ deviceCode: d.deviceCode, reasonAr: GATE_REASONS.btl_model_missing, by: "gate", code: "btl_model_missing" }); continue; }
    plan.devices.push({
      deviceCode: d.deviceCode, use, minutes: dm, everyDays, times,
      parameters: [line?.parameters, btlLineText(b.btl, "ar")].filter(Boolean).join("\n") || null,
      parametersEn: [line?.parametersEn, btlLineText(b.btl, "en")].filter(Boolean).join("\n") || null,
      note: [line?.note, d.reasonAr].filter(Boolean).join("\n") || null, noteEn: [line?.noteEn, d.reasonEn].filter(Boolean).join("\n") || null,
      evidence: line ? line.evidence : d.evidence, reasonAr: d.reasonAr, reasonEn: d.reasonEn, btl: b.btl, protocolParams: line?.params ?? {},
    });
    //  G9c — **جهازٌ بلا ما يُضبط**: للموديل قيمٌ رقمية ولا برنامجَ ولا قيمةً احتياطيةً بقيت ولا إعداداتٍ كتبها البروتوكول — المعالجُ لا يجد ما يضعه
    //  في الجهاز. تنبيهٌ للمعتمِد لا منع (أجهزةُ الحرارة والشمع بلا قيمٍ رقمية أصلاً فلا تُنبَّه).
    const modelHasParams = b.btl ? (btlModelById(b.btl.modelId)?.params.length ?? 0) > 0 : false;
    const protoHasSettings = Boolean(line && (line.parameters?.trim() || Object.values(line.params ?? {}).some((v) => String(v ?? "").trim())));
    if (modelHasParams && !b.btl!.program && b.btl!.fallback.length === 0 && !protoHasSettings) {
      add({ code: "no_settings", kind: "warning", target: `device:${d.deviceCode}`, reasonAr: GATE_REASONS.no_settings });
    }
  }
  if (library && pr) {
    for (const l of pr.devices) {
      if (l.centreUse !== "not_used" && !seen.has(l.deviceCode) && !s.removedDevices.some((r) => r.deviceCode === l.deviceCode)) {
        add({ code: "protocol_device_omitted", kind: "info", target: `device:${l.deviceCode}`, reasonAr: GATE_REASONS.protocol_device_omitted });
      }
    }
    //  G4e — بلا جهازٍ أساسيّ: تنبيهٌ لا منع.
    if (!plan.devices.some((d) => d.use === "core")) add({ code: "no_core_device", kind: "warning", target: "devices", reasonAr: GATE_REASONS.no_core_device });
  }

  // ── المصادر (G13 · G13a) ──
  const inFetched = (u: string) => ctx.fetchedUrls.has(normalizeSourceUrl(u));
  if (library) {
    for (const src of s.sources) {
      if (src.url && (inFetched(src.url) || ctx.searchedUrls.has(normalizeSourceUrl(src.url)))) plan.sources.push(src);
      else add({ code: "source_dropped", kind: "removed", target: src.url || src.title, reasonAr: GATE_REASONS.source_dropped });
    }
  } else {
    if (!s.sources.length) add({ code: "sources_missing", kind: "blocking", target: "sources", reasonAr: GATE_REASONS.sources_missing });
    for (const src of s.sources) {
      if (!src.url || !inFetched(src.url)) add({ code: "source_not_fetched", kind: "blocking", target: src.url || src.title, reasonAr: GATE_REASONS.source_not_fetched });
      else plan.sources.push(src);
    }
    for (const c of s.proposedCards) {
      if (!c.sourceUrl || !inFetched(c.sourceUrl)) add({ code: "source_not_fetched", kind: "blocking", target: `card:${c.key}`, reasonAr: GATE_REASONS.source_not_fetched });
      //  G13d — قوائمُ النوع والمنطقة (قيودُ ١١٨ و١٨١).
      if (!(EXERCISE_KINDS as readonly string[]).includes(c.kind) || !(BODY_REGIONS as readonly string[]).includes(c.region)) {
        add({ code: "card_enum_invalid", kind: "blocking", target: `card:${c.key}`, reasonAr: `${GATE_REASONS.card_enum_invalid} (${c.kind}/${c.region})` });
      }
    }
    const lp = s.libraryProtocol;
    if (lp && (!(PROTOCOL_CATEGORIES as readonly string[]).includes(lp.category) || !(AGE_GROUPS as readonly string[]).includes(lp.ageGroup))) {
      add({ code: "protocol_enum_invalid", kind: "blocking", target: "library_protocol", reasonAr: `${GATE_REASONS.protocol_enum_invalid} (${lp.category}/${lp.ageGroup})` });
    }
    //  G13f — نصُّ البروتوكول العامّ والبطاقات لا يحمل هويّةَ المريض.
    const generic = [lp ? Object.values(lp).filter((v) => typeof v === "string").join("\n") : "",
      ...s.proposedCards.map((c) => [c.nameAr, c.nameEn, c.purposeEn, c.stepsAr, c.stepsEn, c.stopIfAr, c.stopIfEn].filter(Boolean).join("\n"))].join("\n");
    if (findAuthoredLeaks(generic, ctx.ids).length) add({ code: "generic_text_identifier", kind: "blocking", target: "library_protocol", reasonAr: GATE_REASONS.generic_text_identifier });
  }
  //  G13e — البدائلُ من المكتبة.
  for (const a of s.alternatives) {
    if (ctx.libraryIds.has(a.protocolId)) plan.alternatives.push(a);
    else add({ code: "alternative_unknown", kind: "removed", target: `protocol:${a.protocolId}`, reasonAr: GATE_REASONS.alternative_unknown });
  }
  //  G14 — خطّةٌ بلا جهازٍ ولا تمرين.
  const exerciseCount = plan.phases.reduce((n, p) => n + p.exercises.length, 0);
  if (!plan.devices.length && !exerciseCount) add({ code: "empty_plan", kind: "blocking", target: null, reasonAr: GATE_REASONS.empty_plan });
  return done();
}

/** الأجهزةُ الممنوعة كما تُعطى للبوّابة وللنموذج: المعاينةُ ثمّ ما أضافه المعتمِد. */
export function mergeForbidden(exam: readonly { deviceCode: string; reasonAr: string }[], approver: readonly { deviceCode: string; reasonAr: string }[]): GateForbidden[] {
  return [...exam.map((f) => ({ ...f, source: "exam" as const })), ...approver.map((f) => ({ ...f, source: "approver" as const }))];
}
