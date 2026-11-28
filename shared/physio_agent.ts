// **وكيلُ Opus يكتب خطّةَ العلاج الطبيعي من المعاينة** (§4.ha — المرحلةُ الثانية، ترحيل ١٩٩) — القواعدُ الصرفة المشتركة:
// حالاتُ الوظيفة ومراحلُها بالعربية، وأشكالُ ما يرسله النموذجُ (مخطّطاتُ الأدوات) ومحلّلاتُها التي **تعيد التحقّق من كلّ شيء** —
// فالمخطّطُ على السلك بلا حدودٍ رقمية (`STRICT_TOOLS` = false)، والحدودُ هنا وفي البوّابات (`physio_agent_gates.ts`).
// ومَن يرى خطّةَ Opus المنتظرة (`planAccessFor`): المعتمِدُ كاملةً، وغيرُه سطراً واحداً «خطّة Opus بانتظار الاعتماد».
import { arabicPluralCategory, type CountForms } from "./staff_greeting";
import { canApproveProtocols, type ProtocolSessionLike, DEVICE_TEXT_MAX, PROTOCOL_TEXT_MAX } from "./physio_protocols";
import { canReadPlans, planVisibleTo } from "./physio_plans";

export const OPUS_MODEL_ID = "claude-opus-5-5";

// ══ الحالاتُ والمراحل ══════════════════════════════════════════════════════════════════════════════════
export const JOB_STATUSES = ["queued", "running", "needs_answers", "needs_exam_revision", "succeeded", "failed", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
export const ACTIVE_JOB_STATUSES: readonly JobStatus[] = ["queued", "running", "needs_answers"];
export const TERMINAL_JOB_STATUSES: readonly JobStatus[] = ["needs_exam_revision", "succeeded", "failed", "cancelled"];
export const isActiveJobStatus = (s: unknown): boolean => (ACTIVE_JOB_STATUSES as readonly string[]).includes(String(s));
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  queued: "بالدور — سيبدأ Bionic AI قريباً",
  running: "Bionic AI يعمل على الخطّة",
  needs_answers: "Bionic AI يسأل قبل أن يكتب",
  needs_exam_revision: "وجد Bionic AI ما لم تسجّله المعاينة — عدّل المعاينة",
  succeeded: "كتب Bionic AI الخطّة — بانتظار الاعتماد",
  failed: "لم يكتب Bionic AI الخطّة",
  cancelled: "أُلغيت",
};
export const JOB_STAGES = ["reading", "research", "writing", "review", "audit", "gates", "questions", "saving"] as const;
export type JobStage = (typeof JOB_STAGES)[number];
export const JOB_STAGE_LABELS: Record<JobStage, string> = {
  reading: "يقرأ المعاينة", research: "يبحث في الإرشادات", writing: "يكتب الخطّة", review: "المراجع يدقّق",
  audit: "المدقّق", gates: "البوّابات في الشيفرة", questions: "ينتظر الأجوبة", saving: "يحفظ الخطّة",
};
export const JOB_TRIGGERS = ["exam_signed", "red_flag_approved", "exam_revised", "manual", "reconcile", "approver_return", "approver_request"] as const;
export type JobTrigger = (typeof JOB_TRIGGERS)[number];
export const AUTO_TRIGGERS: readonly JobTrigger[] = ["exam_signed", "red_flag_approved", "exam_revised", "reconcile"];
/** **وظيفةُ «تعديل»** (ترحيل ٢٠٠، §4.hb): `return` — المعتمِدُ يعيد الخطّةَ المنتظرة إلى Opus بملاحظة؛ `amend` — يطلب تعديلَ خطّةٍ معتمَدة. */
export const REVISE_SCOPES = ["return", "amend"] as const;
export type ReviseScope = (typeof REVISE_SCOPES)[number];
export const REVISE_TRIGGER: Record<ReviseScope, JobTrigger> = { return: "approver_return", amend: "approver_request" };
/** حالُ اقتراح Opus بعد الاعتماد — منتظرٌ حتى يحفظه المعتمِد أو يتجاهله، أو يقدُم، أو يحلّ محلَّه طلبٌ أحدث نجح. */
export const PROPOSAL_STATUSES = ["pending", "accepted", "discarded", "stale", "superseded"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];
export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  pending: "بانتظار حفظك", accepted: "حُفظ نسخةً جديدة", discarded: "تُجوهل", stale: "قدُم — تغيّرت الخطّةُ أو المعاينة بعده", superseded: "حلّ محلَّه اقتراحٌ أحدث",
};

export const MAX_QUESTION_ROUNDS = 3;
export const MAX_QUESTIONS_PER_ROUND = 5;
export const MAX_WRITER_ROUNDS = 2;
export const JOB_MAX_FAILURES = 5;
export const WEB_SEARCH_BUDGET = 60;
export const WEB_FETCH_BUDGET = 80;
/** **سقفُ السياق الليّن** — حين يبلغ ما يُرسَل في الجولة (المدخلُ والمقروءُ والمكتوبُ من التخزين) هذا الحدّ يُقال للنموذج «اكتفِ بالبحث وقدّم»
 *  (نافذةُ Opus مليونُ رمز، وكلُّ صفحةٍ تُفتح تبقى في المحادثة). */
export const CONTEXT_SOFT_LIMIT_TOKENS = 650_000;

/** الأرقامُ الهنديّة في نصوص Opus المعروضة (كلُّ اللوح بها، فلا يجتمع «٢» و«2» في سطرٍ واحد). */
export const arDigits = (n: number | string): string => String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
/** المعدودُ بجمعه العربيّ وأرقامٍ هنديّة: «جلسة واحدة» · «جلستان» · «٣ جلسات» · «١٢ جلسةً» · «١٠٠ جلسة». */
export function arCount(n: number, f: CountForms): string {
  const c = arabicPluralCategory(n);
  if (c === "one") return f.one;
  if (c === "two") return f.two;
  return `${arDigits(Math.trunc(n))} ${f[c]}`;
}
export const COUNT_FORMS = {
  device: { one: "جهازاً واحداً", two: "جهازين", few: "أجهزة", many: "جهازاً", other: "جهاز" },
  value: { one: "قيمةً واحدة", two: "قيمتين", few: "قيم", many: "قيمةً", other: "قيمة" },
  issue: { one: "ملاحظة واحدة", two: "ملاحظتان", few: "ملاحظات", many: "ملاحظةً", other: "ملاحظة" },
  source: { one: "مصدراً واحداً", two: "مصدرين", few: "مصادر", many: "مصدراً", other: "مصدر" },
  session: { one: "جلسة واحدة", two: "جلستان", few: "جلسات", many: "جلسةً", other: "جلسة" },
  week: { one: "أسبوع واحد", two: "أسبوعان", few: "أسابيع", many: "أسبوعاً", other: "أسبوع" },
  set: { one: "مجموعة واحدة", two: "مجموعتان", few: "مجموعات", many: "مجموعةً", other: "مجموعة" },
  rep: { one: "تكرار واحد", two: "تكراران", few: "تكرارات", many: "تكراراً", other: "تكرار" },
  second: { one: "ثانية واحدة", two: "ثانيتان", few: "ثوانٍ", many: "ثانيةً", other: "ثانية" },
  day: { one: "يوم واحد", two: "يومان", few: "أيام", many: "يوماً", other: "يوم" },
  time: { one: "مرّة واحدة", two: "مرّتان", few: "مرّات", many: "مرّةً", other: "مرّة" },
  minute: { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقةً", other: "دقيقة" },
} satisfies Record<string, CountForms>;

/** ملاحظاتُ المراحل على لوح Opus — عددٌ بلا محتوى الخطّة (يراها الفاحصُ وغيرُ المعتمِد). */
export function gatesStageNote(removedDevices: number, otherEntries: number): string {
  if (!removedDevices && !otherEntries) return "لم تحذف البوّاباتُ شيئاً";
  const parts = [removedDevices ? `حذفت ${arCount(removedDevices, COUNT_FORMS.device)}` : null, otherEntries ? `عدّلت أو حذفت ${arCount(otherEntries, COUNT_FORMS.value)}` : null].filter(Boolean);
  return `البوّاباتُ في الشيفرة: ${parts.join(" و")}`;
}
export function reviewStageNote(verdict: string, issues: number, who: "reviewer" | "auditor"): string {
  const name = who === "reviewer" ? "المراجع" : "المدقّق";
  if (!issues) return `${name}: لا ملاحظات`;
  return `${name}: ${arCount(issues, COUNT_FORMS.issue)}${verdict === "revise" ? " — طلب تعديلاً" : ""}`;
}
export const researchStageNote = (fetched: number): string => `فتح ${arCount(fetched, COUNT_FORMS.source)}`;

export const OPUS_AWAITING_LABEL = "خطّة Bionic AI بانتظار الاعتماد";
export const OPUS_OUT_OF_LIBRARY_LABEL = "خارج المكتبة";

/** رسائلُ الإيقاف والإخفاق بالعربية — كلُّ `error_code` يُكتب معه نصُّه. */
export const JOB_ERROR_TEXTS: Record<string, string> = {
  cancelled_by_user: "ألغاها مستخدم",
  superseded_by_newer_exam: "وُقّعت معاينةٌ أحدث لهذا المريض",
  exam_changed: "تغيّرت المعاينةُ بعد طلب الخطّة",
  exam_cancelled: "أُلغيت المعاينة",
  gate_closed: "بوّابةُ الوكيل مغلقة (علامةٌ حمراء لم تُعتمد أو المعاينةُ ناقصة)",
  patient_deleted: "المريضُ في السلّة",
  patient_merged: "دُمج ملفُّ المريض",
  has_active_plan: "للمريض خطّةٌ قائمة معتمَدة",
  agent_declined: "يرى Bionic AI ألّا تُكتب خطّةٌ الآن",
  unresolved_critical: "بقيت ملاحظةٌ حرجة لم تُحلّ",
  empty_plan: "لم تبقَ في الخطّة أجهزةٌ ولا تمارين بعد البوّابات",
  gates_blocking: "لم تمرّ الخطّةُ من البوّابات الحتمية",
  refusal: "رفض Bionic AI إكمالَ هذه الحالة لأسباب السلامة — تُكتب الخطّةُ يدوياً",
  identifier_leak: "أُوقف الإرسال: في النصّ ما يشبه اسمَ المريض أو هاتفَه أو رمزَه",
  identifier_in_query: "أُوقف البحث: طلب Bionic AI بحثاً فيه ما يشبه هويّةَ المريض",
  too_many_turns: "تجاوز Bionic AI عددَ الجولات المسموح دون أن يُنهي",
  paused_too_long: "توقّف البحثُ مراراً دون أن يكتمل",
  output_truncated: "انقطع ردُّ Bionic AI قبل أن يكتمل",
  no_submission: "أنهى Bionic AI دون أن يقدّم الخطّة",
  research_budget: "تجاوز Bionic AI حدَّ البحث لهذه الوظيفة",
  context_too_long: "طالت المحادثةُ أكثرَ ممّا تتّسع له خدمةُ Claude",
  api_unavailable: "خدمةُ Claude غيرُ متاحة بعد عدّة محاولات",
  api_error: "رفضت خدمةُ Claude الطلب",
  timeout: "تجاوزت الوظيفةُ وقتَها مراراً",
  worker_lost: "توقّف العاملُ عن الوظيفة مراراً",
  internal: "خطأٌ داخليّ في الوكيل",
  //  ترحيل ٢٠٠ (§4.hb) — وظيفةُ «تعديل».
  plan_discarded: "حُذفت الخطّةُ المنتظرة",
  plan_closed: "أُوقفت الخطّةُ أو تخرّج المريض",
  plan_deleted: "حُذفت الخطّة",
  plan_not_awaiting: "لم تعد الخطّةُ تنتظر الاعتماد",
  plan_not_amendable: "الخطّةُ ليست خطّةَ Bionic AI معتمَدة",
  base_version_changed: "عُدّلت الخطّةُ إلى نسخةٍ أحدث قبل أن يُنهي Bionic AI",
  revision_declined: "يرى Bionic AI ألّا يُنفَّذ التعديلُ المطلوب",
  revision_no_change: "لم يغيّر Bionic AI شيئاً في الخطّة بعد البوّابات",
  questions_in_revision: "سأل Bionic AI مرّتين — الأسئلةُ غيرُ متاحة في التعديل",
  patient_trashed: "المريضُ في السلّة",
  proposal_new_request: "حلّ محلَّه طلبٌ أحدث نجح",
  edited_directly: "عُدّلت الخطّةُ مباشرةً بعده",
};

/** **سببُ الإخفاق مفصَّلاً للمعتمِد** (C3) — الرموزُ في `error_detail` بأسبابها العربية حيث تُعرف، وإلّا نصُّ الإخفاق وحده. */
export function jobErrorDetailAr(code: string | null, detail: string | null, reasons: Record<string, string> = {}): string | null {
  if (!code) return null;
  const base = JOB_ERROR_TEXTS[code] ?? code;
  if (!detail) return base;
  const parts = detail.split(",").map((c) => c.trim()).filter(Boolean);
  const named = parts.map((c) => reasons[c]).filter(Boolean);
  if (named.length && named.length === parts.length) return `${base}: ${Array.from(new Set(named)).join("؛ ")}`;
  if (code === "api_error" || code === "internal" || code === "api_unavailable") return `${base} (${detail.slice(0, 200)})`;
  return base;
}

// ══ الأسئلة ═════════════════════════════════════════════════════════════════════════════════════════════
export const QUESTION_AFFECTS = ["exam_field", "preference", "history"] as const;
export type QuestionAffects = (typeof QUESTION_AFFECTS)[number];
export interface AgentQuestion { id: string; textAr: string; whyEn: string; affects: QuestionAffects }
export interface QaAnswer { id: string; questionAr: string; affects: QuestionAffects; answer: string }
export interface QaRound { round: number; at: string; byName: string | null; answers: QaAnswer[] }

const str = (v: unknown, max: number): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strOrNull = (v: unknown, max: number): string | null => { const s = str(v, max); return s ? s : null; };
const intOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);
const numOrNull = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : {});

export type Parsed<T> = { ok: true; value: T } | { ok: false; errors: string[] };

export function parseQuestions(input: unknown): Parsed<AgentQuestion[]> {
  const list = arr(obj(input).questions);
  const errors: string[] = [];
  if (list.length < 1 || list.length > MAX_QUESTIONS_PER_ROUND) errors.push(`Send 1–${MAX_QUESTIONS_PER_ROUND} questions.`);
  const seen = new Set<string>();
  const out: AgentQuestion[] = [];
  list.slice(0, MAX_QUESTIONS_PER_ROUND).forEach((raw, i) => {
    const q = obj(raw);
    const id = str(q.id, 40) || `q${i + 1}`;
    const textAr = str(q.text_ar, 500);
    const affects = String(q.affects ?? "");
    if (textAr.length < 10) errors.push(`Question ${id}: text_ar must be 10–500 characters (Arabic).`);
    if (!(QUESTION_AFFECTS as readonly string[]).includes(affects)) errors.push(`Question ${id}: affects must be exam_field, preference or history.`);
    if (seen.has(id)) errors.push(`Question ids must be unique (${id}).`);
    seen.add(id);
    out.push({ id, textAr, whyEn: str(q.why_en, 300), affects: affects as QuestionAffects });
  });
  return errors.length ? { ok: false, errors } : { ok: true, value: out };
}

/** أجوبةُ جولة — كلُّ سؤالٍ مفتوحٍ له جوابٌ نصّيّ ١–٢٠٠٠، **وسؤالُ خانة المعاينة لا يُجاب نصّاً** (تُعدَّل المعاينة). */
export function validateAnswers(questions: readonly AgentQuestion[], raw: unknown):
  { ok: true; answers: QaAnswer[] } | { ok: false; code: "answer_needs_exam_revision" | "answers_incomplete"; error: string } {
  const given = new Map<string, string>();
  for (const a of arr(raw)) { const o = obj(a); const id = str(o.id, 40); if (id) given.set(id, str(o.answer, 2000)); }
  const out: QaAnswer[] = [];
  for (const q of questions) {
    const ans = given.get(q.id) ?? "";
    if (q.affects === "exam_field") {
      if (ans) return { ok: false, code: "answer_needs_exam_revision", error: "هذا السؤالُ عن خانةٍ في المعاينة — عدّل المعاينة بدل الجواب" };
      return { ok: false, code: "answer_needs_exam_revision", error: "في الأسئلة سؤالٌ عن خانةٍ في المعاينة — عدّل المعاينة ليُعاد التشغيل" };
    }
    if (!ans) return { ok: false, code: "answers_incomplete", error: "أجب عن كلّ الأسئلة" };
    out.push({ id: q.id, questionAr: q.textAr, affects: q.affects, answer: ans });
  }
  return { ok: true, answers: out };
}

// ══ الخطّةُ المقدَّمة ══════════════════════════════════════════════════════════════════════════════════
export interface FallbackValue { key: string; value: number; unit: string; source: string }
export interface SubmittedDevice {
  deviceCode: string; use: "core" | "adjunct"; minutes: number | null; everyDays: number | null; times: number | null;
  btlModelId: string | null; program: string | null; fallback: FallbackValue[]; evidence: string | null; reasonAr: string; reasonEn: string;
}
export interface SubmittedPhaseExercise {
  exerciseId: number | null; proposedKey: string | null; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNoteAr: string | null; doseNoteEn: string | null; whyEn: string | null;
}
export interface SubmittedPhase {
  nameAr: string; nameEn: string; sessionFrom: number | null; sessionTo: number | null;
  goalsAr: string | null; goalsEn: string | null; progressAr: string | null; progressEn: string | null; educationAr: string | null; educationEn: string | null;
  exercises: SubmittedPhaseExercise[];
}
export interface ExerciseChange { phase: number; fromExerciseId: number | null; toExerciseId: number | null; reasonAr: string }
export interface ProposedCard {
  key: string; nameAr: string; nameEn: string; kind: string; region: string; purposeEn: string | null; stepsAr: string | null; stepsEn: string | null;
  stopIfAr: string | null; stopIfEn: string | null; sets: number | null; reps: number | null; holdSeconds: number | null; sourceUrl: string;
}
export interface LibraryProtocolDraft {
  titleAr: string; titleEn: string; category: string; ageGroup: string; summaryAr: string | null; summaryEn: string | null; indicationsEn: string | null;
  contraindicationsAr: string | null; contraindicationsEn: string | null; goalsAr: string | null; goalsEn: string | null;
}
export interface AgentSource { title: string; url: string; org: string | null; year: number | null; usedFor: string | null }
export interface PlanMeasure { code: string; nameAr: string; nameEn: string; unitAr: string | null; unitEn: string | null; min: number; max: number; higherIsBetter: boolean }
export interface SubmittedPlan {
  mode: "library" | "out_of_library";
  protocolId: number | null;
  track: { nameAr: string; nameEn: string; whyEn: string } | null;
  startingPhase: number;
  dose: { totalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null; whyEn: string | null };
  phaseNotes: { phase: number; noteAr: string; noteEn: string | null }[];
  phases: SubmittedPhase[];
  devices: SubmittedDevice[];
  removedDevices: { deviceCode: string; reasonAr: string; reasonEn: string | null }[];
  exerciseChanges: ExerciseChange[];
  proposedCards: ProposedCard[];
  libraryProtocol: LibraryProtocolDraft | null;
  precautionsAr: string | null; precautionsEn: string | null; stopRulesAr: string | null; stopRulesEn: string | null;
  homeProgramAr: string | null; homeProgramEn: string | null;
  measures: PlanMeasure[];
  goalsAr: string | null; goalsEn: string | null; rationaleAr: string | null; rationaleEn: string | null;
  alternatives: { protocolId: number; whyNotAr: string }[];
  assumptions: string[];
  sources: AgentSource[];
}

const T = PROTOCOL_TEXT_MAX;
const D = DEVICE_TEXT_MAX;

/** **قفلُ التعديل بعد الاعتماد** (§4.hb ٣.٥): الوضعُ والبروتوكولُ من النسخة النافذة، ولا بطاقاتٍ مقترحة ولا بروتوكولَ عامّاً؛
 *  في المكتبة تعديلٌ بالفرق (`exercise_changes`) بلا مراحل، وخارجَها المراحلُ كاملةً بلا `exercise_changes`. */
export interface AmendLock { mode: "library" | "out_of_library"; protocolId: number | null }

export function parseSubmittedPlan(input: unknown, amend: AmendLock | null = null): Parsed<SubmittedPlan> {
  const o: Record<string, unknown> = amend ? { ...obj(input) } : obj(input);
  const errors: string[] = [];
  if (amend) {
    if (o.mode !== amend.mode) errors.push(`amend task: mode is locked to "${amend.mode}".`);
    const pid = intOrNull(o.protocol_id);
    if (amend.mode === "library" && pid !== amend.protocolId) errors.push(`amend task: protocol_id is locked to ${amend.protocolId}.`);
    if (amend.mode === "out_of_library" && pid !== null) errors.push("amend task: protocol_id must be null for an out-of-library plan.");
    if (arr(o.proposed_cards).length) errors.push("amend task: proposed_cards must be empty.");
    if (amend.mode === "out_of_library" && arr(o.exercise_changes).length) errors.push("amend task (out-of-library): restate the complete phases and leave exercise_changes empty.");
    if (amend.mode === "out_of_library" && !arr(o.phases).length) errors.push("amend task (out-of-library): phases are required.");
    if (amend.mode === "out_of_library") {
      //  البروتوكولُ العامّ صار مسوّدةً عند الاعتماد ولا يُمسّ — فلا يُطلب.
      o.library_protocol = o.library_protocol ?? { title_ar: "-", title_en: "-", category: "other", age_group: "all" };
    }
  }
  const mode = o.mode === "library" || o.mode === "out_of_library" ? o.mode : null;
  if (!mode) errors.push("mode must be \"library\" or \"out_of_library\".");
  const protocolId = intOrNull(o.protocol_id);
  if (mode === "library" && !protocolId) errors.push("library mode needs protocol_id.");
  const tr = obj(o.track);
  const track = o.track ? { nameAr: str(tr.name_ar, 300), nameEn: str(tr.name_en, 300), whyEn: str(tr.why_en, 2000) } : null;
  const dose = obj(o.dose);
  const devices: SubmittedDevice[] = [];
  const seenDev = new Set<string>();
  for (const raw of arr(o.devices)) {
    const d = obj(raw);
    const code = str(d.device_code, 40);
    if (!code) { errors.push("Every device needs device_code."); continue; }
    if (seenDev.has(code)) { errors.push(`Device ${code} is listed twice.`); continue; }
    seenDev.add(code);
    const use = d.use === "adjunct" ? "adjunct" : d.use === "core" ? "core" : null;
    if (!use) errors.push(`Device ${code}: use must be core or adjunct.`);
    const fallback: FallbackValue[] = [];
    for (const f of arr(d.fallback)) {
      const fo = obj(f);
      const value = numOrNull(fo.value);
      const key = str(fo.key, 60);
      if (!key || value === null) { errors.push(`Device ${code}: every fallback entry needs key and numeric value.`); continue; }
      fallback.push({ key, value, unit: str(fo.unit, 30), source: str(fo.source, 1000) });
    }
    devices.push({
      deviceCode: code, use: use ?? "core", minutes: intOrNull(d.minutes), everyDays: intOrNull(d.every_days), times: intOrNull(d.times),
      btlModelId: strOrNull(d.btl_model_id, 60), program: strOrNull(d.program, 200), fallback, evidence: strOrNull(d.evidence, 40),
      reasonAr: str(d.reason_ar, D), reasonEn: str(d.reason_en, D),
    });
  }
  const phases: SubmittedPhase[] = [];
  for (const raw of arr(o.phases)) {
    const p = obj(raw);
    const exercises: SubmittedPhaseExercise[] = [];
    const seenEx = new Set<string>();
    for (const e of arr(p.exercises)) {
      const x = obj(e);
      const exerciseId = intOrNull(x.exercise_id);
      const proposedKey = strOrNull(x.proposed_key, 80);
      if ((exerciseId === null) === (proposedKey === null)) { errors.push("Each phase exercise needs exactly one of exercise_id or proposed_key."); continue; }
      const k = exerciseId !== null ? `id:${exerciseId}` : `key:${proposedKey}`;
      if (seenEx.has(k)) { errors.push(`Exercise ${k} appears twice in one phase.`); continue; }
      seenEx.add(k);
      exercises.push({ exerciseId, proposedKey, sets: intOrNull(x.sets), reps: intOrNull(x.reps), holdSeconds: intOrNull(x.hold_seconds),
        restSeconds: intOrNull(x.rest_seconds), doseNoteAr: strOrNull(x.dose_note_ar, D), doseNoteEn: strOrNull(x.dose_note_en, D), whyEn: strOrNull(x.why_en, D) });
    }
    phases.push({ nameAr: str(p.name_ar, 300), nameEn: str(p.name_en, 300), sessionFrom: intOrNull(p.session_from), sessionTo: intOrNull(p.session_to),
      goalsAr: strOrNull(p.goals_ar, T), goalsEn: strOrNull(p.goals_en, T), progressAr: strOrNull(p.progress_criteria_ar, T),
      progressEn: strOrNull(p.progress_criteria_en, T), educationAr: strOrNull(p.education_ar, T), educationEn: strOrNull(p.education_en, T), exercises });
  }
  const proposedCards: ProposedCard[] = [];
  for (const raw of arr(o.proposed_cards)) {
    const c = obj(raw);
    const key = str(c.key, 80);
    if (!key) { errors.push("Every proposed card needs key."); continue; }
    //  مفتاحٌ مكرّر يصير رمزاً مكرّراً لبطاقةٍ مسوّدة عند الاعتماد (`physio_exercises.code` فريد) — فيُردّ للكاتب هنا.
    if (proposedCards.some((x) => x.key === key)) { errors.push(`proposed card key ${key} is duplicated — every proposed card needs its own key.`); continue; }
    proposedCards.push({ key, nameAr: str(c.name_ar, 300), nameEn: str(c.name_en, 300), kind: str(c.kind, 40), region: str(c.region, 40),
      purposeEn: strOrNull(c.purpose_en, T), stepsAr: strOrNull(c.steps_ar, T), stepsEn: strOrNull(c.steps_en, T), stopIfAr: strOrNull(c.stop_if_ar, T),
      stopIfEn: strOrNull(c.stop_if_en, T), sets: intOrNull(c.sets), reps: intOrNull(c.reps), holdSeconds: intOrNull(c.hold_seconds), sourceUrl: str(c.source_url, 1000) });
  }
  const knownKeys = new Set(proposedCards.map((c) => c.key));
  for (const p of phases) for (const e of p.exercises) if (e.proposedKey && !knownKeys.has(e.proposedKey)) errors.push(`proposed_key ${e.proposedKey} is not in proposed_cards.`);
  const lp = o.library_protocol ? obj(o.library_protocol) : null;
  const libraryProtocol: LibraryProtocolDraft | null = lp ? {
    titleAr: str(lp.title_ar, 300), titleEn: str(lp.title_en, 300), category: str(lp.category, 40), ageGroup: str(lp.age_group, 40),
    summaryAr: strOrNull(lp.summary_ar, T), summaryEn: strOrNull(lp.summary_en, T), indicationsEn: strOrNull(lp.indications_en, T),
    contraindicationsAr: strOrNull(lp.contraindications_ar, T), contraindicationsEn: strOrNull(lp.contraindications_en, T),
    goalsAr: strOrNull(lp.goals_ar, T), goalsEn: strOrNull(lp.goals_en, T),
  } : null;
  if (mode === "library") {
    if (phases.length) errors.push(amend ? "amend task (library): leave phases empty — express exercise changes through exercise_changes relative to revision.currentVersion." : "library mode: leave phases empty — the phases are copied from the protocol.");
    if (proposedCards.length) errors.push("library mode: proposed_cards must be empty.");
    if (libraryProtocol) errors.push("library mode: library_protocol must be null.");
  }
  if (mode === "out_of_library") {
    if (!libraryProtocol || !libraryProtocol.titleAr || !libraryProtocol.titleEn) errors.push("out_of_library needs library_protocol with title_ar and title_en.");
    if (!phases.length) errors.push("out_of_library needs at least one phase.");
  }
  const measures: PlanMeasure[] = [];
  for (const raw of arr(o.measures)) {
    const m = obj(raw);
    const min = numOrNull(m.min); const max = numOrNull(m.max);
    measures.push({ code: str(m.code, 60), nameAr: str(m.name_ar, 300), nameEn: str(m.name_en, 300), unitAr: strOrNull(m.unit_ar, 60), unitEn: strOrNull(m.unit_en, 60),
      min: min ?? NaN, max: max ?? NaN, higherIsBetter: m.higher_is_better === true });
  }
  const sources: AgentSource[] = arr(o.sources).map((raw) => { const s = obj(raw); return { title: str(s.title, 1000), url: str(s.url, 1000),
    org: strOrNull(s.org, 300), year: intOrNull(s.year), usedFor: strOrNull(s.used_for, 1000) }; }).filter((s) => s.url || s.title);
  const value: SubmittedPlan = {
    mode: (mode ?? "library") as SubmittedPlan["mode"], protocolId, track,
    startingPhase: intOrNull(o.starting_phase) ?? 1,
    dose: { totalSessions: intOrNull(dose.total_sessions), sessionsPerWeek: intOrNull(dose.sessions_per_week), sessionMinutes: intOrNull(dose.session_minutes), whyEn: strOrNull(dose.why_en, 2000) },
    phaseNotes: arr(o.phase_notes).map((raw) => { const n = obj(raw); return { phase: intOrNull(n.phase) ?? 0, noteAr: str(n.note_ar, D), noteEn: strOrNull(n.note_en, D) }; })
      .filter((n) => n.phase > 0 && n.noteAr),
    phases, devices,
    removedDevices: arr(o.removed_devices).map((raw) => { const r = obj(raw); return { deviceCode: str(r.device_code, 40), reasonAr: str(r.reason_ar, D), reasonEn: strOrNull(r.reason_en, D) }; })
      .filter((r) => r.deviceCode),
    exerciseChanges: arr(o.exercise_changes).map((raw) => { const c = obj(raw); return { phase: intOrNull(c.phase) ?? 0, fromExerciseId: intOrNull(c.from_exercise_id),
      toExerciseId: intOrNull(c.to_exercise_id), reasonAr: str(c.reason_ar, D) }; }),
    proposedCards, libraryProtocol,
    precautionsAr: strOrNull(o.precautions_ar, T), precautionsEn: strOrNull(o.precautions_en, T),
    stopRulesAr: strOrNull(o.stop_rules_ar, T), stopRulesEn: strOrNull(o.stop_rules_en, T),
    homeProgramAr: strOrNull(o.home_program_ar, T), homeProgramEn: strOrNull(o.home_program_en, T),
    measures, goalsAr: strOrNull(o.goals_ar, T), goalsEn: strOrNull(o.goals_en, T),
    rationaleAr: strOrNull(o.rationale_ar, T), rationaleEn: strOrNull(o.rationale_en, T),
    alternatives: arr(o.alternatives).map((raw) => { const a = obj(raw); return { protocolId: intOrNull(a.protocol_id) ?? 0, whyNotAr: str(a.why_not_ar, D) }; })
      .filter((a) => a.protocolId > 0),
    assumptions: arr(o.assumptions).map((a) => str(a, D)).filter(Boolean).slice(0, 30),
    sources,
  };
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// ══ المراجعة والتدقيق والرفض والاكتشاف ══════════════════════════════════════════════════════════════════
export const ISSUE_SEVERITIES = ["critical", "major", "minor"] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];
export interface Issue { id: string; severity: IssueSeverity; area: string; problemEn: string; problemAr: string; fixEn: string }
export interface Review { verdict: "pass" | "revise"; summaryAr: string; issues: Issue[]; checked: string[] }
export interface Audit { verdict: "pass" | "concerns"; summaryAr: string; issues: Issue[]; sourcesChecked: { url: string; reachable: boolean; supportsClaim: boolean; noteEn: string }[] }
export interface Decline { by: "writer" | "reviewer"; reasonAr: string; reasonEn: string; recommendedActionAr: string }
export interface NewFinding { kind: "red_flag" | "contraindication"; textAr: string; textEn: string; sourceQuestionId: string | null }

function parseIssues(raw: unknown, prefix: string, errors: string[]): Issue[] {
  return arr(raw).map((x, i) => {
    const o = obj(x);
    const severity = String(o.severity ?? "");
    if (!(ISSUE_SEVERITIES as readonly string[]).includes(severity)) errors.push(`Issue ${i + 1}: severity must be critical, major or minor.`);
    return { id: str(o.id, 40) || `${prefix}${i + 1}`, severity: (severity || "minor") as IssueSeverity, area: str(o.area, 40),
      problemEn: str(o.problem_en, 2000), problemAr: str(o.problem_ar, 2000), fixEn: str(o.fix_en, 2000) };
  });
}
export function parseReview(input: unknown): Parsed<Review> {
  const o = obj(input); const errors: string[] = [];
  const verdict = o.verdict === "pass" || o.verdict === "revise" ? o.verdict : null;
  if (!verdict) errors.push("verdict must be pass or revise.");
  const issues = parseIssues(o.issues, "r", errors);
  if (verdict === "revise" && !issues.length) errors.push("A revise verdict needs at least one issue.");
  return errors.length ? { ok: false, errors } : { ok: true, value: { verdict: verdict!, summaryAr: str(o.summary_ar, 4000), issues, checked: arr(o.checked).map((c) => str(c, 300)).filter(Boolean) } };
}
export function parseAudit(input: unknown): Parsed<Audit> {
  const o = obj(input); const errors: string[] = [];
  const verdict = o.verdict === "pass" || o.verdict === "concerns" ? o.verdict : null;
  if (!verdict) errors.push("verdict must be pass or concerns.");
  const issues = parseIssues(o.issues, "a", errors);
  if (verdict === "concerns" && !issues.length) errors.push("A concerns verdict needs at least one issue.");
  const sourcesChecked = arr(o.sources_checked).map((x) => { const s = obj(x); return { url: str(s.url, 1000), reachable: s.reachable === true,
    supportsClaim: s.supports_claim === true, noteEn: str(s.note_en, 2000) }; });
  return errors.length ? { ok: false, errors } : { ok: true, value: { verdict: verdict!, summaryAr: str(o.summary_ar, 4000), issues, sourcesChecked } };
}
export function parseDecline(input: unknown, by: Decline["by"]): Parsed<Decline> {
  const o = obj(input);
  const reasonAr = str(o.reason_ar, 2000);
  if (reasonAr.length < 5) return { ok: false, errors: ["reason_ar is required."] };
  return { ok: true, value: { by, reasonAr, reasonEn: str(o.reason_en, 2000), recommendedActionAr: str(o.recommended_action_ar, 2000) } };
}
export function parseNewFinding(input: unknown): Parsed<NewFinding> {
  const o = obj(input);
  const kind = o.kind === "red_flag" || o.kind === "contraindication" ? o.kind : null;
  const textAr = str(o.text_ar, 2000);
  if (!kind || textAr.length < 5) return { ok: false, errors: ["kind (red_flag|contraindication) and text_ar are required."] };
  return { ok: true, value: { kind, textAr, textEn: str(o.text_en, 2000), sourceQuestionId: strOrNull(o.source_question_id, 40) } };
}

// ══ مخطّطاتُ الأدوات على السلك ════════════════════════════════════════════════════════════════════════
/** **لا `strict`** — اختبارُ الطلب الحقيقيّ لم يُجرَ (لا مفتاحَ في بيئة التطوير — §4.ha)، والمحلّلاتُ أعلاه حاكمة. */
export const STRICT_TOOLS = false;

type Js = Record<string, unknown>;
const S = (): Js => ({ type: "string" });
const N = (): Js => ({ type: "number" });
const I = (): Js => ({ type: "integer" });
const B = (): Js => ({ type: "boolean" });
const nul = (t: Js): Js => ({ anyOf: [t, { type: "null" }] });
const E = (values: readonly string[]): Js => ({ type: "string", enum: [...values] });
const A = (items: Js): Js => ({ type: "array", items });
export function O(props: Record<string, Js>): Js {
  return { type: "object", properties: props, required: Object.keys(props), additionalProperties: false };
}

const ISSUE_AREAS = ["approver_constraint", "protocol_choice", "contraindication", "pediatric", "pregnancy", "laser_safety", "dose", "exercise",
  "device_settings", "source", "source_mismatch", "privacy", "other"] as const;
const ISSUE = O({ id: S(), severity: E(ISSUE_SEVERITIES), area: E(ISSUE_AREAS), problem_en: S(), problem_ar: S(), fix_en: S() });

export const SUBMIT_PLAN_SCHEMA: Js = O({
  mode: E(["library", "out_of_library"]),
  protocol_id: nul(I()),
  track: nul(O({ name_ar: S(), name_en: S(), why_en: S() })),
  starting_phase: I(),
  dose: O({ total_sessions: nul(I()), sessions_per_week: nul(I()), session_minutes: nul(I()), why_en: nul(S()) }),
  phase_notes: A(O({ phase: I(), note_ar: S(), note_en: nul(S()) })),
  phases: A(O({ name_ar: S(), name_en: S(), session_from: nul(I()), session_to: nul(I()), goals_ar: nul(S()), goals_en: nul(S()),
    progress_criteria_ar: nul(S()), progress_criteria_en: nul(S()), education_ar: nul(S()), education_en: nul(S()),
    exercises: A(O({ exercise_id: nul(I()), proposed_key: nul(S()), sets: nul(I()), reps: nul(I()), hold_seconds: nul(I()), rest_seconds: nul(I()),
      dose_note_ar: nul(S()), dose_note_en: nul(S()), why_en: nul(S()) })) })),
  devices: A(O({ device_code: S(), use: E(["core", "adjunct"]), minutes: nul(I()), every_days: nul(I()), times: nul(I()), btl_model_id: nul(S()),
    program: nul(S()), fallback: A(O({ key: S(), value: N(), unit: S(), source: S() })), evidence: nul(E(["recommended", "optional", "not_recommended"])),
    reason_ar: S(), reason_en: S() })),
  removed_devices: A(O({ device_code: S(), reason_ar: S(), reason_en: nul(S()) })),
  exercise_changes: A(O({ phase: I(), from_exercise_id: nul(I()), to_exercise_id: nul(I()), reason_ar: S() })),
  proposed_cards: A(O({ key: S(), name_ar: S(), name_en: S(), kind: S(), region: S(), purpose_en: nul(S()), steps_ar: nul(S()), steps_en: nul(S()),
    stop_if_ar: nul(S()), stop_if_en: nul(S()), sets: nul(I()), reps: nul(I()), hold_seconds: nul(I()), source_url: S() })),
  library_protocol: nul(O({ title_ar: S(), title_en: S(), category: S(), age_group: S(), summary_ar: nul(S()), summary_en: nul(S()), indications_en: nul(S()),
    contraindications_ar: nul(S()), contraindications_en: nul(S()), goals_ar: nul(S()), goals_en: nul(S()) })),
  precautions_ar: nul(S()), precautions_en: nul(S()), stop_rules_ar: nul(S()), stop_rules_en: nul(S()), home_program_ar: nul(S()), home_program_en: nul(S()),
  measures: A(O({ code: S(), name_ar: S(), name_en: S(), unit_ar: nul(S()), unit_en: nul(S()), min: N(), max: N(), higher_is_better: B() })),
  goals_ar: nul(S()), goals_en: nul(S()), rationale_ar: nul(S()), rationale_en: nul(S()),
  alternatives: A(O({ protocol_id: I(), why_not_ar: S() })),
  assumptions: A(S()),
  sources: A(O({ title: S(), url: S(), org: nul(S()), year: nul(I()), used_for: nul(S()) })),
});
export const ASK_QUESTIONS_SCHEMA: Js = O({ questions: A(O({ id: S(), text_ar: S(), why_en: S(), affects: E(QUESTION_AFFECTS) })) });
export const DECLINE_SCHEMA: Js = O({ reason_ar: S(), reason_en: S(), recommended_action_ar: S() });
export const NEW_FINDING_SCHEMA: Js = O({ kind: E(["red_flag", "contraindication"]), text_ar: S(), text_en: S(), source_question_id: nul(S()) });
export const SUBMIT_REVIEW_SCHEMA: Js = O({ verdict: E(["pass", "revise"]), summary_ar: S(), issues: A(ISSUE), checked: A(S()) });
export const SUBMIT_AUDIT_SCHEMA: Js = O({ verdict: E(["pass", "concerns"]), summary_ar: S(), issues: A(ISSUE),
  sources_checked: A(O({ url: S(), reachable: B(), supports_claim: B(), note_en: S() })) });
export const GET_PROTOCOL_SCHEMA: Js = O({ protocol_id: I() });
export const SEARCH_EXERCISES_SCHEMA: Js = O({ query: S(), region: nul(S()), kind: nul(S()), limit: nul(I()) });
export const GET_EXERCISES_SCHEMA: Js = O({ ids: A(I()) });

// ══ المكتبة والمصادر ══════════════════════════════════════════════════════════════════════════════════
/** **سقفُ الجلسات للبروتوكول** — عددُه أو عددُه مع التمديد المكتوب (`max_total_sessions`)، لا تمديدَ يُخترع. */
export function protocolSessionCeiling(p: { totalSessions?: number | null; maxTotalSessions?: number | null }): number {
  const total = p.totalSessions ?? 1;
  return Math.max(total, p.maxTotalSessions ?? total);
}

/** رابطٌ للمقارنة: المخطّطُ والمضيفُ صغيران، بلا جزءٍ بعد «#» ولا شرطةٍ أخيرة ولا `utm_*`. */
export function normalizeSourceUrl(u: string): string {
  try {
    const url = new URL(String(u).trim());
    url.hash = "";
    const keep = Array.from(url.searchParams.entries()).filter(([k]) => !/^utm_/i.test(k));
    url.search = "";
    for (const [k, v] of keep) url.searchParams.append(k, v);
    let s = `${url.protocol.toLowerCase()}//${url.host.toLowerCase()}${url.pathname}${url.search}`;
    if (s.endsWith("/")) s = s.slice(0, -1);
    return s;
  } catch {
    return String(u ?? "").trim().replace(/#.*$/, "").replace(/\/$/, "");
  }
}

// ══ الرؤية ═════════════════════════════════════════════════════════════════════════════════════════════
/** **خطّة Opus منتظرة**: لم يعتمدها معتمِدٌ بعد — فلا يراها ولا ينفّذها غيرُه (قرارُ المالك). */
export const isOpusAwaiting = (p: { origin?: string | null; status: string }): boolean =>
  p.origin === "opus" && ["draft", "pending", "returned"].includes(p.status);

export function planAccessFor(s: ProtocolSessionLike | null | undefined, p: { origin?: string | null; status: string }): "full" | "stub" | "none" {
  if (!canReadPlans(s)) return "none";
  if (isOpusAwaiting(p)) return canApproveProtocols(s) ? "full" : "stub";
  return planVisibleTo(s, p.status) ? "full" : "none";
}

/** السطرُ الوحيد الذي يراه غيرُ المعتمِد — بلا عنوانٍ ولا رابطِ تنفيذ. */
export function opusPlanStub(p: { id: number; patientId: number; status: string; createdAt: Date | string | null }) {
  return { id: p.id, patientId: p.patientId, status: p.status, origin: "opus" as const, stub: true as const, titleAr: OPUS_AWAITING_LABEL,
    createdAt: p.createdAt };
}

/** ما يُسمح على خطّة Opus منتظرة — الاعتمادُ والحذفُ بيد معتمِد وحده؛ وغيرُ ذلك `opus_plan_locked`. */
export const OPUS_AWAITING_ALLOWED = ["approve", "opus-discard", "delete", "opus-return"] as const;
/** **خطّةُ Opus بعد الاعتماد** (§4.hb): تُعدَّل بـ«تعديل الخطّة» و«اطلب من Opus تعديلاً» وحدهما وبيد المعتمِد، فكلُّ حفظٍ نسخة؛
 *  وأبوابُ التعديل القديمة (الخطّةُ والمراحلُ والمقاييسُ وتغييرُ النوع) تُردّ لأيّ أحد. */
export const OPUS_VERSIONED_BLOCKED = ["update", "phases", "measures", "change-protocol"] as const;
export const OPUS_VERSIONED_ERROR = "خطّةُ Bionic AI المعتمَدة تُعدَّل من «تعديل الخطّة» أو «اطلب من Bionic AI تعديلاً» بيد المسؤول أو المشرف العام — فكلُّ حفظٍ نسخةٌ مرقّمة";
export function opusApprovedBlocked(p: { origin?: string | null; status: string }, action: string): string | null {
  if (p.origin !== "opus" || isOpusAwaiting(p)) return null;
  return (OPUS_VERSIONED_BLOCKED as readonly string[]).includes(action) ? OPUS_VERSIONED_ERROR : null;
}
export function opusAwaitingBlocked(p: { origin?: string | null; status: string }, action: string): string | null {
  if (!isOpusAwaiting(p)) return null;
  return (OPUS_AWAITING_ALLOWED as readonly string[]).includes(action) ? null
    : "خطّةُ Bionic AI بانتظار الاعتماد — لا تُعدَّل ولا تُنفَّذ قبل أن يعتمدها المسؤول أو المشرف العام";
}
