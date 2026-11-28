// **نسخُ خطّة Opus المرقّمة** (ترحيل ٢٠٠، §4.hb — قرارُ المالك ٦: «كلُّ حفظٍ نسخةٌ مرقّمة بمَن ومتى ولماذا») — القواعدُ الصرفة المشتركة.
//
//  • `PlanSnapshot` — الخطّةُ كلُّها في لقطةٍ واحدة لا تتغيّر: المراحلُ وتمارينُها **بنصّ بطاقاتها يومَ الحفظ** (خطواتٌ و«توقّف إذا» وصور)، والأجهزةُ
//    بأسمائها وموديل BTL وبرنامجه وقيمه بمصدرها، والاحتياطاتُ وقواعدُ التوقّف والبرنامجُ المنزليّ، والمقاييسُ والمصادرُ والممنوع، وما بُنيت عليه
//    (`basis` — المعاينةُ وبصمتُها وطلباتُ اعتماد العلامة الحمراء). فالنسخةُ ن تُطبع بعد أشهر كما اعتُمدت (المرحلةُ ٨).
//  • `composePlanColumns` — أعمدةُ الخطّة الحيّة من اللقطة (القاعدةُ نفسُها التي كتب بها Opus الخطّةَ المنتظرة)، **وسطرُ «الأجهزةُ الممنوعة»
//    يُعاد تركيبُه دائماً من `forbidden`** (يحسبه الخادم) — فمسحُ الاحتياطات لا يُسقطه.
//  • `parsePlanEdit` — جسمُ «تعديل الخطّة» بصرامة (مفتاحٌ مجهول في أيّ مستوى ⟵ خطأ)، و`applyPlanEdit` يبني المرشَّحَ قبل البوّابات،
//    وما يحسبه الخادمُ لا يُقرأ من الجسم أبداً (الوضعُ والبروتوكولُ والممنوعُ ونصوصُ البروتوكول والبطاقات والأسماءُ و`basis`).
//  • `snapshotFromAmendDelta` / `snapshotFromAmendFull` — تعديلُ Opus: في المكتبة **فرقٌ** على مراحل النسخة النافذة، وخارجَها الخطّةُ كاملة.
//  • `diffSnapshots` / `diffSummaryAr` — الفرقُ بين نسختين بالأقسام، وكلُّ تغييرٍ بمن أحدثه (البوّابات · Opus · المعتمِد).
import { btlLineText, rescalePhaseRanges, type BtlLine, type GateProtocolDevice } from "./physio_agent_gates";
import { btlModelById } from "./btl_devices";
import { arCount, arDigits, normalizeSourceUrl, type AgentSource, type PlanMeasure, type SubmittedPlan } from "./physio_agent";
import { normalizeDose, DEVICE_TEXT_MAX, PROTOCOL_TEXT_MAX } from "./physio_protocols";

export const SNAPSHOT_SCHEMA = 1;

export interface SnapCard { steps: string | null; stepsEn: string | null; stopIf: string | null; stopIfEn: string | null; images: unknown[]; updatedAt: string | null }
export interface SnapDevice {
  deviceCode: string; nameAr: string; nameEn: string;
  use: "core" | "adjunct"; minutes: number | null; everyDays: number | null; times: number | null;
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  evidence: string | null; reasonAr: string; reasonEn: string; btl: BtlLine | null; protocolParams: Record<string, string>;
}
export interface SnapExercise {
  exerciseId: number; nameAr: string; nameEn: string;
  sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null; card: SnapCard | null;
}
export interface SnapPhase {
  position: number; nameAr: string; nameEn: string; sessionFrom: number | null; sessionTo: number | null;
  timeframe: string | null; timeframeEn: string | null; goals: string | null; goalsEn: string | null; education: string | null; educationEn: string | null;
  progressCriteria: string | null; progressCriteriaEn: string | null; notes: string | null; notesEn: string | null;
  exercises: SnapExercise[];
}
export interface SnapForbidden { deviceCode: string; nameAr: string; reasonAr: string; source: "exam" | "approver" }
export interface SnapExerciseChange { kind: "substitute" | "remove" | "add"; phase: number; fromId: number | null; toId: number | null; reasonAr: string; by: "opus" | "approver" }
export interface SnapSource extends AgentSource { addedBy: "opus" | "approver"; fetchedInJob: number | null }
export interface SnapTexts {
  goalsAr: string | null; goalsEn: string | null; precautionsAr: string | null; precautionsEn: string | null; stopRulesAr: string | null; stopRulesEn: string | null;
  homeProgramAr: string | null; homeProgramEn: string | null; rationaleAr: string | null; rationaleEn: string | null;
}
export interface SnapProtocolTexts {
  goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null;
  contraindications: string | null; contraindicationsEn: string | null; precautions: string | null; precautionsEn: string | null;
}
export interface SnapBasis {
  examId: number | null; examFingerprint: string | null; gateCode: string | null; redFlagReviewIds: number[]; approverConstraintReviewIds: number[];
  branchId: number; protocolUpdatedAt: string | null;
}
export interface PlanSnapshot {
  schema: 1;
  mode: "library" | "out_of_library";
  protocolId: number | null;
  draftProtocolId: number | null;
  protocolCode: string | null;
  titleAr: string; titleEn: string;
  track: { nameAr: string; nameEn: string; whyEn: string } | null;
  startingPhase: number;
  totalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null;
  texts: SnapTexts;
  protocolTexts: SnapProtocolTexts;
  forbidden: SnapForbidden[];
  devices: SnapDevice[];
  phases: SnapPhase[];
  exerciseChanges: SnapExerciseChange[];
  phaseNotes: { phase: number; noteAr: string; noteEn: string | null }[];
  measuresOwn: boolean; measures: PlanMeasure[];
  sources: SnapSource[];
  removed: { deviceCode: string; reasonAr: string; by: "gate" | "model" | "approver"; code: string | null }[];
  basis: SnapBasis;
}

export const EMPTY_PROTOCOL_TEXTS: SnapProtocolTexts = { goals: null, goalsEn: null, exercises: null, exercisesEn: null, contraindications: null,
  contraindicationsEn: null, precautions: null, precautionsEn: null };

// ══ التسميات ═══════════════════════════════════════════════════════════════════════════════════════════
export const VERSION_HOWS = ["approval", "direct_edit", "opus_revision"] as const;
export type VersionHow = (typeof VERSION_HOWS)[number];
export const VERSION_HOW_LABELS: Record<VersionHow, string> = { approval: "الاعتماد", direct_edit: "تعديلٌ مباشر", opus_revision: "تعديلٌ من Bionic AI" };
export const versionLabel = (n: number): string => `النسخة ${arDigits(n)}`;
/** سببُ النسخة الثانية حين عُدّلت الخطّةُ قبل نظام النسخ (§4.hb ١.٢) — بصدقٍ: لا يُعرف مَن ولا متى ولا أيُّ الجلسات بعدها. */
export const BACKFILL_DIVERGENT_REASON = "تعديلاتٌ قبل نظام النسخ — لا يُعرف مَن ومتى ولا أيُّ الجلسات بعدها";

// ══ الأعمدة الحيّة ══════════════════════════════════════════════════════════════════════════════════════
const join = (...xs: (string | null | undefined)[]) => xs.filter((x) => x && x.trim()).join("\n\n") || null;
export const FORBIDDEN_LINE_PREFIX = "الأجهزةُ الممنوعة لهذا المريض: ";
export function forbiddenLine(f: readonly SnapForbidden[]): string | null {
  if (!f.length) return null;
  //  جهازٌ ممنوعٌ بسببين يُذكر مرّةً بسببيه.
  const by = new Map<string, { nameAr: string; reasons: string[] }>();
  for (const x of f) { const e = by.get(x.deviceCode) ?? { nameAr: x.nameAr, reasons: [] }; if (!e.reasons.includes(x.reasonAr)) e.reasons.push(x.reasonAr); by.set(x.deviceCode, e); }
  return `${FORBIDDEN_LINE_PREFIX}${Array.from(by.values()).map((e) => `${e.nameAr} (${e.reasons.join("؛ ")})`).join("؛ ")}`;
}

export interface PlanColumns {
  titleAr: string; titleEn: string; goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null;
  precautions: string | null; precautionsEn: string | null; notes: string | null; notesEn: string | null;
  sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null; totalSessions: number | null; startingPhase: number;
  outOfLibrary: boolean; sources: { title: string; url: string; org: string | null; year: number | null; usedFor: string | null }[]; measuresOwn: boolean;
}
/** **أعمدةُ الخطّة من اللقطة** — القاعدةُ نفسُها التي كُتبت بها الخطّةُ المنتظرة (`createPlanFromAgentTx`). */
export function composePlanColumns(s: PlanSnapshot): PlanColumns {
  const t = s.texts; const p = s.protocolTexts;
  const dose = normalizeDose({ sessionsPerWeek: s.sessionsPerWeek, durationWeeks: null, totalSessions: s.totalSessions });
  return {
    titleAr: s.titleAr.slice(0, 300), titleEn: s.titleEn.slice(0, 300),
    goals: join(t.goalsAr, p.goals), goalsEn: join(t.goalsEn, p.goalsEn), exercises: p.exercises, exercisesEn: p.exercisesEn,
    precautions: join(p.contraindications, p.precautions, t.precautionsAr, t.stopRulesAr ? `قواعدُ التوقّف: ${t.stopRulesAr}` : null, forbiddenLine(s.forbidden)),
    precautionsEn: join(p.contraindicationsEn, p.precautionsEn, t.precautionsEn, t.stopRulesEn ? `Stop rules: ${t.stopRulesEn}` : null),
    notes: join(t.rationaleAr, t.homeProgramAr ? `البرنامجُ المنزليّ: ${t.homeProgramAr}` : null),
    notesEn: join(t.rationaleEn, t.homeProgramEn ? `Home program: ${t.homeProgramEn}` : null),
    sessionsPerWeek: dose.sessionsPerWeek, durationWeeks: dose.durationWeeks, sessionMinutes: s.sessionMinutes, totalSessions: dose.totalSessions,
    startingPhase: s.startingPhase, outOfLibrary: s.mode === "out_of_library",
    sources: s.sources.map((x) => ({ title: x.title, url: x.url, org: x.org, year: x.year, usedFor: x.usedFor })), measuresOwn: s.measuresOwn,
  };
}

// ══ البصمة ═════════════════════════════════════════════════════════════════════════════════════════════
/** JSON بمفاتيحَ مرتّبة — فلا يغيّر ترتيبُ المفاتيح البصمة. */
export function canonicalJson(v: unknown): string {
  if (v === undefined) return "null";
  if (v === null || typeof v !== "object") return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonicalJson).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}
export const snapshotHash = (s: PlanSnapshot, hasher: (text: string) => string): string => hasher(canonicalJson(s));
/** المحتوى وحده — بلا `basis` ولا `removed` (أهل تغيّر شيءٌ في الخطّة؟). */
export function snapshotContent(s: PlanSnapshot): Omit<PlanSnapshot, "basis" | "removed"> {
  const { basis: _b, removed: _r, ...rest } = s;
  return rest;
}
export const sameContent = (a: PlanSnapshot, b: PlanSnapshot): boolean => canonicalJson(snapshotContent(a)) === canonicalJson(snapshotContent(b));
export const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

// ══ جسمُ «تعديل الخطّة» ════════════════════════════════════════════════════════════════════════════════
export interface PlanEditDevice {
  deviceCode: string; use: "core" | "adjunct"; minutes: number | null; everyDays: number | null; times: number | null; noteAr: string | null;
  btlModelId: string | null; program: string | null; fallback: { key: string; value: number; source: string }[];
}
export interface PlanEditExercise { exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null; doseNote: string | null }
export interface PlanEditPhase {
  position: number; nameAr: string; sessionFrom: number | null; sessionTo: number | null; goals: string | null; progressCriteria: string | null;
  education: string | null; notes: string | null; exercises: PlanEditExercise[];
}
export interface PlanEdit {
  totalSessions: number | null; sessionsPerWeek: number | null; sessionMinutes: number | null; startingPhase: number;
  devices: PlanEditDevice[];
  phases: PlanEditPhase[];
  exerciseReasons: { phase: number; exerciseId: number; reasonAr: string }[];
  texts: { precautionsAr: string | null; stopRulesAr: string | null; homeProgramAr: string | null; goalsAr: string | null };
  measures: PlanMeasure[] | null;
  keepSourceUrls: string[];
  addSources: { title: string; url: string; org: string | null; year: number | null }[];
}

const EDIT_KEYS = ["totalSessions", "sessionsPerWeek", "sessionMinutes", "startingPhase", "devices", "phases", "exerciseReasons", "texts", "measures", "keepSourceUrls", "addSources"];
const DEVICE_KEYS = ["deviceCode", "use", "minutes", "everyDays", "times", "noteAr", "btlModelId", "program", "fallback"];
const FALLBACK_KEYS = ["key", "value", "source"];
const PHASE_KEYS = ["position", "nameAr", "sessionFrom", "sessionTo", "goals", "progressCriteria", "education", "notes", "exercises"];
const EXERCISE_KEYS = ["exerciseId", "sets", "reps", "holdSeconds", "restSeconds", "doseNote"];
const REASON_KEYS = ["phase", "exerciseId", "reasonAr"];
const TEXT_KEYS = ["precautionsAr", "stopRulesAr", "homeProgramAr", "goalsAr"];
const MEASURE_KEYS = ["code", "nameAr", "nameEn", "unitAr", "unitEn", "min", "max", "higherIsBetter"];
const SOURCE_KEYS = ["title", "url", "org", "year"];

/** **جسمُ «تعديل الخطّة» بصرامة** (§4.hb ٤.١): كلُّ مفتاحٍ مطلوب وما سواه خطأ، ولا يُتجاهل شيءٌ بصمت. والرسالةُ بالعربية. */
export function parsePlanEdit(raw: unknown): { ok: true; value: PlanEdit } | { ok: false; error: string } {
  const bad = (error: string) => ({ ok: false as const, error });
  const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
  const keysOk = (o: Record<string, unknown>, allowed: string[], where: string): string | null => {
    const extra = Object.keys(o).filter((k) => !allowed.includes(k));
    if (extra.length) return `مفتاحٌ غيرُ معروف في ${where}: ${extra.join("، ")}`;
    const missing = allowed.filter((k) => !(k in o));
    if (missing.length) return `مفتاحٌ ناقص في ${where}: ${missing.join("، ")}`;
    return null;
  };
  const int = (v: unknown, lo: number, hi: number): number | null | undefined => (v === null ? null : Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? v as number : undefined);
  const txt = (v: unknown, max: number): string | null | undefined => (v === null ? null : typeof v === "string" ? (v.trim() ? v.trim().slice(0, max) : null) : undefined);
  if (!isObj(raw)) return bad("جسمُ التعديل غيرُ صالح");
  let e = keysOk(raw, EDIT_KEYS, "التعديل"); if (e) return bad(e);
  const totalSessions = int(raw.totalSessions, 1, 300), sessionsPerWeek = int(raw.sessionsPerWeek, 1, 14), sessionMinutes = int(raw.sessionMinutes, 5, 240);
  if (totalSessions === undefined || sessionsPerWeek === undefined || sessionMinutes === undefined) return bad("الجرعة: العددُ ١–٣٠٠، وجلساتُ الأسبوع ١–١٤، والدقائقُ ٥–٢٤٠");
  const startingPhase = int(raw.startingPhase, 1, 100);
  if (startingPhase === undefined || startingPhase === null) return bad("مرحلةُ البدء رقمٌ صحيح");
  if (!Array.isArray(raw.devices) || raw.devices.length > 40) return bad("قائمةُ الأجهزة غيرُ صالحة");
  const devices: PlanEditDevice[] = [];
  for (const d of raw.devices) {
    if (!isObj(d)) return bad("جهازٌ غيرُ صالح");
    e = keysOk(d, DEVICE_KEYS, "الجهاز"); if (e) return bad(e);
    const code = typeof d.deviceCode === "string" ? d.deviceCode.trim().slice(0, 40) : "";
    if (!code) return bad("جهازٌ بلا رمز");
    if (d.use !== "core" && d.use !== "adjunct") return bad("استعمالُ الجهاز أساسيّ أو مساعد");
    const minutes = int(d.minutes, 1, 120), everyDays = int(d.everyDays, 1, 60), times = int(d.times, 1, 30);
    if (minutes === undefined || everyDays === undefined || times === undefined) return bad(`أرقامُ الجهاز ${code} غيرُ صالحة`);
    const noteAr = txt(d.noteAr, DEVICE_TEXT_MAX), btlModelId = txt(d.btlModelId, 60), program = txt(d.program, 200);
    if (noteAr === undefined || btlModelId === undefined || program === undefined) return bad(`نصوصُ الجهاز ${code} غيرُ صالحة`);
    if (!Array.isArray(d.fallback) || d.fallback.length > 20) return bad(`القيمُ الاحتياطية للجهاز ${code} غيرُ صالحة`);
    const fallback: PlanEditDevice["fallback"] = [];
    for (const f of d.fallback) {
      if (!isObj(f)) return bad("قيمةٌ احتياطية غيرُ صالحة");
      e = keysOk(f, FALLBACK_KEYS, "القيمة الاحتياطية"); if (e) return bad(e);
      if (typeof f.key !== "string" || !f.key.trim() || typeof f.value !== "number" || !Number.isFinite(f.value) || typeof f.source !== "string" || !f.source.trim()) {
        return bad(`كلُّ قيمةٍ احتياطية بمفتاحها ورقمها ومصدرها (${code})`);
      }
      fallback.push({ key: f.key.trim().slice(0, 60), value: f.value, source: f.source.trim().slice(0, 1000) });
    }
    devices.push({ deviceCode: code, use: d.use, minutes, everyDays, times, noteAr, btlModelId, program, fallback });
  }
  if (!Array.isArray(raw.phases) || raw.phases.length > 20) return bad("المراحلُ غيرُ صالحة");
  const phases: PlanEditPhase[] = [];
  for (const p of raw.phases) {
    if (!isObj(p)) return bad("مرحلةٌ غيرُ صالحة");
    e = keysOk(p, PHASE_KEYS, "المرحلة"); if (e) return bad(e);
    const position = int(p.position, 1, 100), sessionFrom = int(p.sessionFrom, 1, 300), sessionTo = int(p.sessionTo, 1, 300);
    if (!position || sessionFrom === undefined || sessionTo === undefined) return bad("رقمُ المرحلة ونطاقُ جلساتها غيرُ صالح");
    const nameAr = txt(p.nameAr, 300);
    if (!nameAr) return bad("اسمُ المرحلة بالعربية");
    const goals = txt(p.goals, PROTOCOL_TEXT_MAX), progressCriteria = txt(p.progressCriteria, PROTOCOL_TEXT_MAX), education = txt(p.education, PROTOCOL_TEXT_MAX), notes = txt(p.notes, PROTOCOL_TEXT_MAX);
    if (goals === undefined || progressCriteria === undefined || education === undefined || notes === undefined) return bad("نصوصُ المرحلة غيرُ صالحة");
    if (!Array.isArray(p.exercises) || p.exercises.length > 40) return bad("تمارينُ المرحلة غيرُ صالحة");
    const exercises: PlanEditExercise[] = [];
    for (const x of p.exercises) {
      if (!isObj(x)) return bad("تمرينٌ غيرُ صالح");
      e = keysOk(x, EXERCISE_KEYS, "التمرين"); if (e) return bad(e);
      const exerciseId = int(x.exerciseId, 1, 2 ** 31 - 1);
      const sets = int(x.sets, -1000, 1000), reps = int(x.reps, -1000, 1000), holdSeconds = int(x.holdSeconds, -10000, 10000), restSeconds = int(x.restSeconds, -10000, 10000);
      const doseNote = txt(x.doseNote, DEVICE_TEXT_MAX);
      if (!exerciseId || sets === undefined || reps === undefined || holdSeconds === undefined || restSeconds === undefined || doseNote === undefined) return bad("أرقامُ التمرين غيرُ صالحة");
      if (exercises.some((y) => y.exerciseId === exerciseId)) return bad("تمرينٌ مكرّر في مرحلةٍ واحدة");
      exercises.push({ exerciseId, sets, reps, holdSeconds, restSeconds, doseNote });
    }
    phases.push({ position, nameAr, sessionFrom, sessionTo, goals, progressCriteria, education, notes, exercises });
  }
  if (!Array.isArray(raw.exerciseReasons) || raw.exerciseReasons.length > 80) return bad("أسبابُ التمارين غيرُ صالحة");
  const exerciseReasons: PlanEdit["exerciseReasons"] = [];
  for (const r of raw.exerciseReasons) {
    if (!isObj(r)) return bad("سببُ تمرينٍ غيرُ صالح");
    e = keysOk(r, REASON_KEYS, "سبب التمرين"); if (e) return bad(e);
    const phase = int(r.phase, 1, 100), exerciseId = int(r.exerciseId, 1, 2 ** 31 - 1), reasonAr = txt(r.reasonAr, DEVICE_TEXT_MAX);
    if (!phase || !exerciseId || !reasonAr || reasonAr.length < 3) return bad("سببُ إضافة التمرين ثلاثةُ أحرفٍ على الأقلّ");
    exerciseReasons.push({ phase, exerciseId, reasonAr });
  }
  if (!isObj(raw.texts)) return bad("النصوصُ غيرُ صالحة");
  e = keysOk(raw.texts, TEXT_KEYS, "النصوص"); if (e) return bad(e);
  const texts = { precautionsAr: txt(raw.texts.precautionsAr, PROTOCOL_TEXT_MAX), stopRulesAr: txt(raw.texts.stopRulesAr, PROTOCOL_TEXT_MAX),
    homeProgramAr: txt(raw.texts.homeProgramAr, PROTOCOL_TEXT_MAX), goalsAr: txt(raw.texts.goalsAr, PROTOCOL_TEXT_MAX) };
  if (Object.values(texts).some((v) => v === undefined)) return bad("النصوصُ غيرُ صالحة");
  let measures: PlanMeasure[] | null = null;
  if (raw.measures !== null) {
    if (!Array.isArray(raw.measures) || raw.measures.length > 10) return bad("المقاييسُ غيرُ صالحة");
    measures = [];
    for (const m of raw.measures) {
      if (!isObj(m)) return bad("مقياسٌ غيرُ صالح");
      e = keysOk(m, MEASURE_KEYS, "المقياس"); if (e) return bad(e);
      if (typeof m.code !== "string" || !m.code.trim() || typeof m.nameAr !== "string" || typeof m.nameEn !== "string" || typeof m.min !== "number" || typeof m.max !== "number"
        || typeof m.higherIsBetter !== "boolean" || (m.unitAr !== null && typeof m.unitAr !== "string") || (m.unitEn !== null && typeof m.unitEn !== "string")) return bad("مقياسٌ غيرُ صالح");
      measures.push({ code: m.code.trim().slice(0, 60), nameAr: m.nameAr.trim().slice(0, 300), nameEn: m.nameEn.trim().slice(0, 300),
        unitAr: (m.unitAr as string | null)?.slice(0, 60) ?? null, unitEn: (m.unitEn as string | null)?.slice(0, 60) ?? null, min: m.min, max: m.max, higherIsBetter: m.higherIsBetter });
    }
  }
  if (!Array.isArray(raw.keepSourceUrls) || raw.keepSourceUrls.some((u) => typeof u !== "string")) return bad("قائمةُ المصادر غيرُ صالحة");
  if (!Array.isArray(raw.addSources) || raw.addSources.length > 20) return bad("المصادرُ المضافة غيرُ صالحة");
  const addSources: PlanEdit["addSources"] = [];
  for (const s of raw.addSources) {
    if (!isObj(s)) return bad("مصدرٌ غيرُ صالح");
    e = keysOk(s, SOURCE_KEYS, "المصدر"); if (e) return bad(e);
    if (typeof s.url !== "string" || !/^https?:\/\//i.test(s.url.trim()) || typeof s.title !== "string" || !s.title.trim()) return bad("المصدرُ عنوانٌ ورابطٌ يبدأ بـ http");
    const year = int(s.year, 1900, 2100);
    if (year === undefined || (s.org !== null && typeof s.org !== "string")) return bad("المصدرُ غيرُ صالح");
    addSources.push({ title: s.title.trim().slice(0, 1000), url: s.url.trim().slice(0, 1000), org: (s.org as string | null)?.trim().slice(0, 300) || null, year });
  }
  return { ok: true, value: { totalSessions, sessionsPerWeek, sessionMinutes, startingPhase, devices, phases, exerciseReasons, texts: texts as PlanEdit["texts"], measures,
    keepSourceUrls: (raw.keepSourceUrls as string[]).slice(0, 100), addSources } };
}

/** **جسمُ التعديل من اللقطة** — لتملأ الشاشةُ نموذجَها، ولتصحيحات البوّابات المقترحة («طبّق تصحيحات البوّابات»). */
export function editFromSnapshot(s: PlanSnapshot): PlanEdit {
  return {
    totalSessions: s.totalSessions, sessionsPerWeek: s.sessionsPerWeek, sessionMinutes: s.sessionMinutes, startingPhase: s.startingPhase,
    devices: s.devices.map((d) => ({ deviceCode: d.deviceCode, use: d.use, minutes: d.minutes, everyDays: d.everyDays, times: d.times, noteAr: d.note,
      btlModelId: d.btl?.modelId ?? null, program: d.btl?.program ?? null, fallback: (d.btl?.fallback ?? []).map((f) => ({ key: f.key, value: f.value, source: f.source })) })),
    phases: s.phases.map((p) => ({ position: p.position, nameAr: p.nameAr, sessionFrom: p.sessionFrom, sessionTo: p.sessionTo, goals: p.goals,
      progressCriteria: p.progressCriteria, education: p.education, notes: p.notes,
      exercises: p.exercises.map((x) => ({ exerciseId: x.exerciseId, sets: x.sets, reps: x.reps, holdSeconds: x.holdSeconds, restSeconds: x.restSeconds, doseNote: x.doseNote })) })),
    exerciseReasons: s.exerciseChanges.filter((c) => c.by === "approver" && c.toId !== null && c.kind !== "remove").map((c) => ({ phase: c.phase, exerciseId: c.toId!, reasonAr: c.reasonAr })),
    texts: { precautionsAr: s.texts.precautionsAr, stopRulesAr: s.texts.stopRulesAr, homeProgramAr: s.texts.homeProgramAr, goalsAr: s.texts.goalsAr },
    measures: s.measuresOwn ? s.measures.map((m) => ({ ...m })) : null,
    keepSourceUrls: s.sources.map((x) => x.url),
    addSources: [],
  };
}

// ══ ما يحتاجه البناءُ من القاعدة (يمرّره الخادم) ══════════════════════════════════════════════════════
export interface SnapLookups {
  cards: ReadonlyMap<number, { nameAr: string; nameEn: string; card: SnapCard }>;
  deviceLabels: ReadonlyMap<string, { nameAr: string; nameEn: string }>;
  /** سطرُ البروتوكول لكلّ جهاز (وضعُ المكتبة) — معاملاتُه المكتوبة وملاحظتُه ودرجةُ دليله. */
  protocolLines: ReadonlyMap<string, GateProtocolDevice> | null;
}

/** سطرُ BTL من موديلٍ وبرنامجٍ وقيم — بالأسماء والوحدات من الكتالوج؛ والمجهولُ يبقى كما هو لتحكم فيه البوّابة. */
export function btlFrom(modelId: string | null, program: string | null, fallback: { key: string; value: number; source: string; unit?: string }[]): BtlLine | null {
  if (!modelId && !program && !fallback.length) return null;
  const m = btlModelById(modelId);
  return {
    modelId: modelId ?? "", modelNameEn: m?.nameEn ?? modelId ?? "", modelNameAr: m?.nameAr, program,
    fallback: fallback.map((f) => { const p = m?.params.find((x) => x.key === f.key);
      return { key: f.key, labelEn: p?.labelEn ?? f.key, labelAr: p?.labelAr, value: f.value, unit: p?.unit ?? f.unit ?? "", source: f.source }; }),
    flags: [],
  };
}
const sameBtlInput = (a: BtlLine | null, b: BtlLine | null): boolean =>
  canonicalJson(a ? { m: a.modelId, p: a.program, f: a.fallback.map((x) => [x.key, x.value, x.source]) } : null)
    === canonicalJson(b ? { m: b.modelId, p: b.program, f: b.fallback.map((x) => [x.key, x.value, x.source]) } : null);

function lineParameters(btl: BtlLine | null, proto: GateProtocolDevice | null, lang: "ar" | "en"): string | null {
  return [lang === "ar" ? proto?.parameters : proto?.parametersEn, btlLineText(btl, lang)].filter(Boolean).join("\n") || null;
}

/** **المرشَّحُ من جسم التعديل** — قبل البوّابات؛ والإنكليزيُّ يبقى من الأساس ما لم يتغيّر نصُّه العربيّ. */
export function applyPlanEdit(base: PlanSnapshot, e: PlanEdit, x: SnapLookups): PlanSnapshot {
  const c = clone(base);
  c.totalSessions = e.totalSessions; c.sessionsPerWeek = e.sessionsPerWeek; c.sessionMinutes = e.sessionMinutes; c.startingPhase = e.startingPhase;
  c.devices = e.devices.map((d) => {
    const b = base.devices.find((y) => y.deviceCode === d.deviceCode) ?? null;
    const proto = x.protocolLines?.get(d.deviceCode) ?? null;
    const btl = btlFrom(d.btlModelId, d.program, d.fallback);
    const keepBtl = b && sameBtlInput(b.btl, btl);
    const label = x.deviceLabels.get(d.deviceCode);
    return {
      deviceCode: d.deviceCode, nameAr: b?.nameAr ?? label?.nameAr ?? d.deviceCode, nameEn: b?.nameEn ?? label?.nameEn ?? d.deviceCode,
      use: d.use, minutes: d.minutes, everyDays: d.everyDays, times: d.times,
      parameters: keepBtl ? b!.parameters : lineParameters(btl, proto, "ar"), parametersEn: keepBtl ? b!.parametersEn : lineParameters(btl, proto, "en"),
      note: d.noteAr, noteEn: b && b.note === d.noteAr ? b.noteEn : null,
      evidence: proto?.evidence ?? b?.evidence ?? null, reasonAr: b?.reasonAr ?? "أضافه المعتمِد", reasonEn: b?.reasonEn ?? "",
      btl: keepBtl ? b!.btl : btl, protocolParams: proto?.params ?? b?.protocolParams ?? {},
    };
  });
  c.phases = e.phases.map((p) => {
    const b = base.phases.find((y) => y.position === p.position) ?? null;
    const keep = <K extends keyof SnapPhase>(ar: K, en: K, v: string | null) => (b && b[ar] === v ? b[en] : null);
    return {
      position: p.position, nameAr: p.nameAr, nameEn: b && b.nameAr === p.nameAr ? b.nameEn : `Phase ${p.position}`, sessionFrom: p.sessionFrom, sessionTo: p.sessionTo,
      timeframe: b?.timeframe ?? null, timeframeEn: b?.timeframeEn ?? null,
      goals: p.goals, goalsEn: keep("goals", "goalsEn", p.goals) as string | null, education: p.education, educationEn: keep("education", "educationEn", p.education) as string | null,
      progressCriteria: p.progressCriteria, progressCriteriaEn: keep("progressCriteria", "progressCriteriaEn", p.progressCriteria) as string | null,
      notes: p.notes, notesEn: keep("notes", "notesEn", p.notes) as string | null,
      exercises: p.exercises.map((ex) => {
        const bx = b?.exercises.find((y) => y.exerciseId === ex.exerciseId) ?? null;
        const card = x.cards.get(ex.exerciseId);
        return { exerciseId: ex.exerciseId, nameAr: bx?.nameAr ?? card?.nameAr ?? `#${ex.exerciseId}`, nameEn: bx?.nameEn ?? card?.nameEn ?? `#${ex.exerciseId}`,
          sets: ex.sets, reps: ex.reps, holdSeconds: ex.holdSeconds, restSeconds: ex.restSeconds, doseNote: ex.doseNote,
          doseNoteEn: bx && bx.doseNote === ex.doseNote ? bx.doseNoteEn : null, note: bx?.note ?? null, noteEn: bx?.noteEn ?? null, card: bx?.card ?? card?.card ?? null };
      }),
    };
  });
  const reasons = new Map(e.exerciseReasons.map((r) => [`${r.phase}:${r.exerciseId}`, r.reasonAr]));
  c.exerciseChanges = [
    ...base.exerciseChanges.filter((ch) => !(ch.by === "approver" && ch.toId !== null && reasons.has(`${ch.phase}:${ch.toId}`))),
    ...e.exerciseReasons.map((r): SnapExerciseChange => ({ kind: "add", phase: r.phase, fromId: null, toId: r.exerciseId, reasonAr: r.reasonAr, by: "approver" })),
  ];
  const t = e.texts;
  c.texts = {
    ...base.texts,
    precautionsAr: t.precautionsAr, precautionsEn: base.texts.precautionsAr === t.precautionsAr ? base.texts.precautionsEn : null,
    stopRulesAr: t.stopRulesAr, stopRulesEn: base.texts.stopRulesAr === t.stopRulesAr ? base.texts.stopRulesEn : null,
    homeProgramAr: t.homeProgramAr, homeProgramEn: base.texts.homeProgramAr === t.homeProgramAr ? base.texts.homeProgramEn : null,
    goalsAr: t.goalsAr, goalsEn: base.texts.goalsAr === t.goalsAr ? base.texts.goalsEn : null,
  };
  c.measuresOwn = e.measures !== null; c.measures = e.measures ?? [];
  const keep = new Set(e.keepSourceUrls.map(normalizeSourceUrl));
  c.sources = [...base.sources.filter((s) => keep.has(normalizeSourceUrl(s.url))),
    ...e.addSources.filter((a) => !base.sources.some((s) => normalizeSourceUrl(s.url) === normalizeSourceUrl(a.url)))
      .map((a): SnapSource => ({ title: a.title, url: a.url, org: a.org, year: a.year, usedFor: null, addedBy: "approver", fetchedInJob: null }))];
  c.removed = [];
  return c;
}

/** سطرُ جهازٍ من تعديل Opus — والموديلُ والبرنامجُ والقيمُ كما هي في الأساس تُبقي سطرَ الأساس (ومصدرَ قيمه). */
function deviceFromSubmitted(d: SubmittedPlan["devices"][number], b: SnapDevice | null, x: SnapLookups): SnapDevice {
  const proto = x.protocolLines?.get(d.deviceCode) ?? null;
  const btl = btlFrom(d.btlModelId, d.program, d.fallback.map((f) => ({ key: f.key, value: f.value, source: f.source, unit: f.unit })));
  const keepBtl = b && sameBtlInput(b.btl, btl);
  const label = x.deviceLabels.get(d.deviceCode);
  const note = [proto?.note, d.reasonAr].filter(Boolean).join("\n") || null;
  return {
    deviceCode: d.deviceCode, nameAr: b?.nameAr ?? label?.nameAr ?? d.deviceCode, nameEn: b?.nameEn ?? label?.nameEn ?? d.deviceCode,
    use: d.use, minutes: d.minutes, everyDays: d.everyDays, times: d.times,
    parameters: keepBtl ? b!.parameters : lineParameters(btl, proto, "ar"), parametersEn: keepBtl ? b!.parametersEn : lineParameters(btl, proto, "en"),
    note: b && b.reasonAr === d.reasonAr ? b.note : note, noteEn: b && b.reasonAr === d.reasonAr ? b.noteEn : [proto?.noteEn, d.reasonEn].filter(Boolean).join("\n") || null,
    evidence: proto?.evidence ?? b?.evidence ?? d.evidence, reasonAr: d.reasonAr, reasonEn: d.reasonEn, btl: keepBtl ? b!.btl : btl,
    protocolParams: proto?.params ?? b?.protocolParams ?? {},
  };
}

function textsFromSubmitted(base: SnapTexts, s: SubmittedPlan): SnapTexts {
  const pick = (ar: string | null, en: string | null, bAr: string | null, bEn: string | null) => (ar === null ? [bAr, bEn] : [ar, ar === bAr ? (en ?? bEn) : en]);
  const [precautionsAr, precautionsEn] = pick(s.precautionsAr, s.precautionsEn, base.precautionsAr, base.precautionsEn);
  const [stopRulesAr, stopRulesEn] = pick(s.stopRulesAr, s.stopRulesEn, base.stopRulesAr, base.stopRulesEn);
  const [homeProgramAr, homeProgramEn] = pick(s.homeProgramAr, s.homeProgramEn, base.homeProgramAr, base.homeProgramEn);
  const [goalsAr, goalsEn] = pick(s.goalsAr, s.goalsEn, base.goalsAr, base.goalsEn);
  const [rationaleAr, rationaleEn] = pick(s.rationaleAr, s.rationaleEn, base.rationaleAr, base.rationaleEn);
  return { precautionsAr, precautionsEn, stopRulesAr, stopRulesEn, homeProgramAr, homeProgramEn, goalsAr, goalsEn, rationaleAr, rationaleEn };
}

const cardExercise = (id: number, x: SnapLookups, dose: Partial<SnapExercise> = {}): SnapExercise => {
  const c = x.cards.get(id);
  return { exerciseId: id, nameAr: c?.nameAr ?? `#${id}`, nameEn: c?.nameEn ?? `#${id}`, sets: null, reps: null, holdSeconds: null, restSeconds: null,
    doseNote: null, doseNoteEn: null, note: null, noteEn: null, card: c?.card ?? null, ...dose };
};

/** **تعديلُ Opus في المكتبة = فرقٌ على النسخة النافذة** (§4.hb D7): المراحلُ مراحلُها، والتبديلُ والحذفُ والإضافةُ من `exercise_changes` بأسبابها،
 *  والأجهزةُ والجرعةُ كما يكتبها، والنطاقاتُ بنسبة العدد الجديد. */
export function snapshotFromAmendDelta(base: PlanSnapshot, s: SubmittedPlan, x: SnapLookups): PlanSnapshot {
  const c = clone(base);
  c.totalSessions = s.dose.totalSessions ?? base.totalSessions;
  c.sessionsPerWeek = s.dose.sessionsPerWeek ?? base.sessionsPerWeek;
  c.sessionMinutes = s.dose.sessionMinutes ?? base.sessionMinutes;
  c.startingPhase = s.startingPhase; c.track = s.track ?? base.track;
  c.devices = s.devices.map((d) => deviceFromSubmitted(d, base.devices.find((y) => y.deviceCode === d.deviceCode) ?? null, x));
  for (const ch of s.exerciseChanges) {
    const ph = c.phases.find((p) => p.position === ch.phase);
    if (!ph || (ch.fromExerciseId === null && ch.toExerciseId === null)) continue;
    const idx = ch.fromExerciseId === null ? -1 : ph.exercises.findIndex((y) => y.exerciseId === ch.fromExerciseId);
    if (ch.fromExerciseId !== null && idx < 0) continue;
    if (ch.toExerciseId !== null && ph.exercises.some((y) => y.exerciseId === ch.toExerciseId)) continue;
    if (idx >= 0 && ch.toExerciseId !== null) {
      const old = ph.exercises[idx];
      ph.exercises[idx] = cardExercise(ch.toExerciseId, x, { sets: old.sets, reps: old.reps, holdSeconds: old.holdSeconds, restSeconds: old.restSeconds, note: ch.reasonAr || old.note });
    } else if (idx >= 0) ph.exercises.splice(idx, 1);
    else ph.exercises.push(cardExercise(ch.toExerciseId!, x, { note: ch.reasonAr || null }));
    c.exerciseChanges.push({ kind: idx >= 0 && ch.toExerciseId !== null ? "substitute" : idx >= 0 ? "remove" : "add", phase: ch.phase,
      fromId: ch.fromExerciseId, toId: ch.toExerciseId, reasonAr: ch.reasonAr, by: "opus" });
  }
  for (const n of s.phaseNotes) {
    const ph = c.phases.find((p) => p.position === n.phase);
    if (!ph) continue;
    ph.notes = [ph.notes, `Bionic AI: ${n.noteAr}`].filter(Boolean).join("\n");
    if (n.noteEn) ph.notesEn = [ph.notesEn, `Bionic AI: ${n.noteEn}`].filter(Boolean).join("\n");
  }
  c.phaseNotes = [...base.phaseNotes, ...s.phaseNotes];
  if (c.totalSessions && base.totalSessions && c.totalSessions !== base.totalSessions) c.phases = rescalePhaseRanges(c.phases, base.totalSessions, c.totalSessions);
  c.texts = textsFromSubmitted(base.texts, s);
  c.sources = s.sources.map((src) => {
    const b = base.sources.find((y) => normalizeSourceUrl(y.url) === normalizeSourceUrl(src.url));
    return b ?? { ...src, addedBy: "opus" as const, fetchedInJob: null };
  });
  c.removed = s.removedDevices.map((r) => ({ deviceCode: r.deviceCode, reasonAr: r.reasonAr, by: "model" as const, code: null }));
  return c;
}

/** **تعديلُ Opus خارجَ المكتبة = الخطّةُ كاملة** — المراحلُ بتمارينها من بطاقات المكتبة، والمقاييسُ والمصادر. */
export function snapshotFromAmendFull(base: PlanSnapshot, s: SubmittedPlan, x: SnapLookups): PlanSnapshot {
  const c = snapshotFromAmendDelta({ ...clone(base), phases: [] }, { ...s, exerciseChanges: [], phaseNotes: [] }, x);
  c.phases = s.phases.map((p, i) => {
    const b = base.phases.find((y) => y.position === i + 1) ?? null;
    return {
      position: i + 1, nameAr: p.nameAr || `المرحلة ${arDigits(i + 1)}`, nameEn: p.nameEn || `Phase ${i + 1}`, sessionFrom: p.sessionFrom, sessionTo: p.sessionTo,
      timeframe: b?.timeframe ?? null, timeframeEn: b?.timeframeEn ?? null, goals: p.goalsAr, goalsEn: p.goalsEn, education: p.educationAr, educationEn: p.educationEn,
      progressCriteria: p.progressAr, progressCriteriaEn: p.progressEn, notes: null, notesEn: null,
      exercises: p.exercises.filter((e) => e.exerciseId !== null).map((e) => {
        const bx = b?.exercises.find((y) => y.exerciseId === e.exerciseId) ?? null;
        return { ...cardExercise(e.exerciseId!, x), card: bx?.card ?? x.cards.get(e.exerciseId!)?.card ?? null, sets: e.sets, reps: e.reps, holdSeconds: e.holdSeconds,
          restSeconds: e.restSeconds, doseNote: e.doseNoteAr, doseNoteEn: e.doseNoteEn, note: e.whyEn, noteEn: e.whyEn };
      }),
    };
  });
  c.exerciseChanges = [];
  c.phaseNotes = base.phaseNotes;
  c.measuresOwn = s.measures.length > 0 || base.measuresOwn;
  c.measures = s.measures.length ? s.measures : base.measures;
  return c;
}

// ══ الفرق ══════════════════════════════════════════════════════════════════════════════════════════════
export type DiffSection = "dose" | "track" | "devices" | "phases" | "exercises" | "precautions" | "stopRules" | "homeProgram" | "goals" | "rationale"
  | "protocolTexts" | "measures" | "sources" | "forbidden" | "other";
export const DIFF_SECTION_LABELS: Record<DiffSection, string> = {
  dose: "الجرعة", track: "المسار", devices: "الأجهزة", phases: "المراحل", exercises: "التمارين", precautions: "الاحتياطات", stopRules: "قواعدُ التوقّف",
  homeProgram: "البرنامجُ المنزليّ", goals: "الأهداف", rationale: "المبرّرات", protocolTexts: "نصوصُ البروتوكول", measures: "المقاييس", sources: "المصادر",
  forbidden: "الأجهزةُ الممنوعة", other: "تغييراتٌ أخرى",
};
/** **أسماءُ الحقول التي لا يقارنها قسمٌ مسمّى** — بالإنكليزية «بالإنكليزية»؛ والحقلُ بلا اسمٍ هنا يُعرض باسمه (لا يسقط). */
const FIELD_LABELS: Record<string, string> = {
  nameAr: "الاسم", nameEn: "الاسمُ بالإنكليزية", timeframe: "المدّة", timeframeEn: "المدّةُ بالإنكليزية", goalsEn: "الأهدافُ بالإنكليزية",
  educationEn: "التثقيفُ بالإنكليزية", progressCriteriaEn: "معاييرُ الانتقال بالإنكليزية", notesEn: "الملاحظاتُ بالإنكليزية",
  doseNoteEn: "ملاحظةُ الجرعة بالإنكليزية", note: "الملاحظة", noteEn: "الملاحظةُ بالإنكليزية", card: "بطاقةُ التمرين",
  parameters: "المعاملات", parametersEn: "المعاملاتُ بالإنكليزية", evidence: "درجةُ الدليل", reasonAr: "السبب", reasonEn: "السببُ بالإنكليزية",
  protocolParams: "معاملاتُ البروتوكول", btl: "إعداداتُ الجهاز", goalsAr: "الأهداف", precautionsEn: "الاحتياطاتُ بالإنكليزية",
  stopRulesEn: "قواعدُ التوقّف بالإنكليزية", homeProgramEn: "البرنامجُ المنزليّ بالإنكليزية", rationaleEn: "المبرّراتُ بالإنكليزية",
  titleAr: "عنوانُ الخطّة", titleEn: "عنوانُ الخطّة بالإنكليزية", mode: "نوعُ الخطّة", protocolId: "البروتوكول", draftProtocolId: "البروتوكولُ المسوّدة",
  protocolCode: "رمزُ البروتوكول", exerciseChanges: "تبديلاتُ التمارين", phaseNotes: "ملاحظاتُ المراحل", title: "العنوان", org: "الجهة", year: "السنة",
  usedFor: "استُعمل لـ", reason: "السبب", source: "المصدر", unitAr: "الوحدة", unitEn: "الوحدةُ بالإنكليزية", min: "الحدُّ الأدنى", max: "الحدُّ الأعلى",
  higherIsBetter: "الأعلى أفضل", addedBy: "أضافه", fetchedInJob: "فُتح في الوظيفة", whyEn: "سببُ المسار بالإنكليزية", sets: "المجموعات", reps: "التكرارات",
  holdSeconds: "ثواني الثبات", restSeconds: "ثواني الراحة", doseNote: "ملاحظةُ الجرعة", sessionFrom: "من الجلسة", sessionTo: "إلى الجلسة",
  goals: "الأهداف", education: "التثقيف", progressCriteria: "معاييرُ الانتقال", notes: "الملاحظات", use: "الاستعمال", minutes: "الدقائق",
  everyDays: "كلّ كم يوم", times: "عددُ المرّات",
};
/** **نسخةٌ فارغة** من عنصرٍ مضاف (مفاتيحُ الهويّة وحدها باقية) — يُقارَن بها فيظهر كلُّ ما في المضاف لا اسمُه وحده. */
function blankOf<T extends object>(x: T, keep: readonly string[]): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(x)) o[k] = keep.includes(k) ? v : Array.isArray(v) ? [] : null;
  return o;
}
/** أسماءُ نصوص البروتوكول في الفرق — بالعربية وحدها (الإنكليزيُّ منها «بالإنكليزية»). */
export const PROTOCOL_TEXT_LABELS: Record<keyof SnapProtocolTexts, string> = {
  goals: "الأهداف", goalsEn: "الأهداف بالإنكليزية", exercises: "التمارين", exercisesEn: "التمارين بالإنكليزية",
  contraindications: "الموانع", contraindicationsEn: "الموانع بالإنكليزية", precautions: "الاحتياطات", precautionsEn: "الاحتياطات بالإنكليزية",
};
export type ChangeBy = "gate" | "writer" | "approver";
export interface Change { kind: "added" | "removed" | "changed"; target: string; labelAr: string; before?: unknown; after?: unknown; by: ChangeBy }
export interface PlanDiff { empty: boolean; sections: { key: DiffSection; labelAr: string; changes: Change[] }[] }
const SECTION_ORDER: DiffSection[] = ["dose", "track", "devices", "phases", "exercises", "precautions", "stopRules", "homeProgram", "goals", "rationale", "protocolTexts",
  "measures", "sources", "forbidden", "other"];

/** **الفرقُ بين نسختين** بالأقسام، بترتيبٍ ثابت. كلُّ تغييرٍ لمسه سطرٌ في سجلّ البوّابات ⟵ `by: "gate"` (تصحيحٌ إلزاميّ)، وإلّا لمن عدّل. */
export function diffSnapshots(a: PlanSnapshot, b: PlanSnapshot, gateLog: readonly { target: string | null; kind?: string }[] = [], by: "writer" | "approver" = "approver"): PlanDiff {
  const out = new Map<DiffSection, Change[]>();
  const gateTargets = gateLog.filter((g) => g.target && g.kind !== "info" && g.kind !== "warning").map((g) => String(g.target));
  const who = (target: string): ChangeBy => (gateTargets.some((g) => g === target || g.startsWith(`${target}:`) || target.startsWith(`${g}:`)) ? "gate" : by);
  const add = (sec: DiffSection, c: Omit<Change, "by">) => { const l = out.get(sec) ?? []; l.push({ ...c, by: who(c.target) }); out.set(sec, l); };
  const eq = (x: unknown, y: unknown) => canonicalJson(x) === canonicalJson(y);
  //  **كلُّ حقلٍ محفوظ له مكانٌ في الفرق** (مراجعةُ Codex على #775): ما لا يقارنه سطرٌ مسمّى أدناه يقارنه هذا بحقله — فلا يُحفظ ما لم يُرَ.
  const rest = (sec: DiffSection, target: string, prefix: string, x: Record<string, unknown>, y: Record<string, unknown>, handled: readonly string[]) => {
    for (const k of Array.from(new Set([...Object.keys(x), ...Object.keys(y)])).sort()) {
      if (handled.includes(k) || eq(x[k], y[k])) continue;
      add(sec, { kind: "changed", target, labelAr: `${prefix}${FIELD_LABELS[k] ?? k}`, before: x[k], after: y[k] });
    }
  };
  for (const [k, label, target] of [["totalSessions", "عددُ الجلسات", "dose.total_sessions"], ["sessionsPerWeek", "جلساتُ الأسبوع", "dose.sessions_per_week"],
    ["sessionMinutes", "دقائقُ الجلسة", "dose.session_minutes"], ["startingPhase", "مرحلةُ البدء", "starting_phase"]] as const) {
    if (!eq(a[k], b[k])) add("dose", { kind: "changed", target, labelAr: label, before: a[k], after: b[k] });
  }
  //  المسارُ حقلاً حقلاً — لا «كان: س ⟵ صار: س» والمتغيّرُ إنكليزيّه (مراجعةُ Codex على #776).
  for (const [k, label] of [["nameAr", "المسار"], ["nameEn", "المسارُ بالإنكليزية"], ["whyEn", "سببُ المسار بالإنكليزية"]] as const) {
    const x = a.track ? a.track[k] : null; const y = b.track ? b.track[k] : null;
    if (!eq(x, y)) add("track", { kind: "changed", target: "track", labelAr: label, before: x, after: y });
  }
  for (const d of b.devices) {
    const o = a.devices.find((y) => y.deviceCode === d.deviceCode);
    const target = `device:${d.deviceCode}`;
    //  الجهازُ المضاف بإعداداته كلِّها (الموديلُ والبرنامجُ والقيمُ الاحتياطية) — لا يُحفظ ما لم يُرَ.
    if (!o) { add("devices", { kind: "added", target, labelAr: d.nameAr, after: { use: d.use, minutes: d.minutes, everyDays: d.everyDays, times: d.times,
      modelId: d.btl?.modelId ?? null, program: d.btl?.program ?? null, fallback: (d.btl?.fallback ?? []).map((f) => [f.key, f.value, f.source]) } });
      rest("devices", target, `${d.nameAr} — `, blankOf(d, ["deviceCode", "nameAr"]), d as unknown as Record<string, unknown>, ["deviceCode", "use", "minutes", "everyDays", "times"]);
      continue; }
    const fields: [string, unknown, unknown][] = [["الاستعمال", o.use, d.use], ["الدقائق", o.minutes, d.minutes], ["الموعدُ الدوريّ", [o.everyDays, o.times], [d.everyDays, d.times]],
      ["الموديل", o.btl?.modelId ?? null, d.btl?.modelId ?? null], ["البرنامج", o.btl?.program ?? null, d.btl?.program ?? null],
      ["القيمُ الاحتياطية", (o.btl?.fallback ?? []).map((f) => [f.key, f.value, f.source]), (d.btl?.fallback ?? []).map((f) => [f.key, f.value, f.source])], ["الملاحظة", o.note, d.note]];
    for (const [label, x, y] of fields) if (!eq(x, y)) add("devices", { kind: "changed", target, labelAr: `${d.nameAr} — ${label}`, before: x, after: y });
    //  ما لا يعرضه سطرُ «القيمُ الاحتياطية» (الوحدةُ والاسمُ الإنكليزيّ لكلّ قيمة) يبقى في «إعداداتُ الجهاز».
    const btlRest = (x: SnapDevice["btl"]) => (x ? { ...x, modelId: null, program: null, fallback: x.fallback.map((f) => ({ key: f.key, labelEn: f.labelEn, unit: f.unit })) } : null);
    rest("devices", target, `${d.nameAr} — `, { ...o, btl: btlRest(o.btl) }, { ...d, btl: btlRest(d.btl) }, ["deviceCode", "use", "minutes", "everyDays", "times", "note"]);
  }
  for (const o of a.devices) if (!b.devices.some((y) => y.deviceCode === o.deviceCode)) add("devices", { kind: "removed", target: `device:${o.deviceCode}`, labelAr: o.nameAr, before: { use: o.use } });
  for (const p of b.phases) {
    let o = a.phases.find((y) => y.position === p.position);
    //  المرحلةُ المضافة تُقارَن بمرحلةٍ فارغة — فيظهر نطاقُها ونصوصُها وتمارينُها كلُّها لا اسمُها وحده (مراجعةُ Codex على #776).
    if (!o) { add("phases", { kind: "added", target: `phase:${p.position}`, labelAr: p.nameAr }); o = blankOf(p, ["position", "nameAr"]) as unknown as SnapPhase; }
    for (const [label, k] of [["الاسم", "nameAr"], ["النطاق", "range"], ["الأهداف", "goals"], ["معاييرُ الانتقال", "progressCriteria"], ["التثقيف", "education"], ["الملاحظات", "notes"]] as const) {
      const x = k === "range" ? [o.sessionFrom, o.sessionTo] : o[k]; const y = k === "range" ? [p.sessionFrom, p.sessionTo] : p[k];
      if (!eq(x, y)) add("phases", { kind: "changed", target: k === "range" ? "phases" : `phase:${p.position}`, labelAr: `${p.nameAr} — ${label}`, before: x, after: y });
    }
    rest("phases", `phase:${p.position}`, `${p.nameAr} — `, o as unknown as Record<string, unknown>, p as unknown as Record<string, unknown>,
      ["position", "nameAr", "sessionFrom", "sessionTo", "goals", "progressCriteria", "education", "notes", "exercises"]);
    for (const ex of p.exercises) {
      const ox = o.exercises.find((y) => y.exerciseId === ex.exerciseId);
      const target = `exercise:${p.position}:${ex.exerciseId}`;
      if (!ox) { add("exercises", { kind: "added", target, labelAr: `${ex.nameAr} (${p.nameAr})`, after: { dose: [ex.sets, ex.reps, ex.holdSeconds, ex.restSeconds, ex.doseNote] } });
        rest("exercises", target, `${ex.nameAr} — `, blankOf(ex, ["exerciseId", "nameAr"]), ex as unknown as Record<string, unknown>,
          ["exerciseId", "sets", "reps", "holdSeconds", "restSeconds", "doseNote"]);
        continue; }
      const dx = [ox.sets, ox.reps, ox.holdSeconds, ox.restSeconds, ox.doseNote]; const dy = [ex.sets, ex.reps, ex.holdSeconds, ex.restSeconds, ex.doseNote];
      if (!eq(dx, dy)) add("exercises", { kind: "changed", target, labelAr: `${ex.nameAr} — الجرعة`, before: dx, after: dy });
      rest("exercises", target, `${ex.nameAr} — `, ox as unknown as Record<string, unknown>, ex as unknown as Record<string, unknown>,
        ["exerciseId", "sets", "reps", "holdSeconds", "restSeconds", "doseNote"]);
    }
    for (const ox of o.exercises) if (!p.exercises.some((y) => y.exerciseId === ox.exerciseId)) add("exercises", { kind: "removed", target: `exercise:${p.position}:${ox.exerciseId}`, labelAr: `${ox.nameAr} (${p.nameAr})` });
  }
  for (const o of a.phases) if (!b.phases.some((y) => y.position === o.position)) add("phases", { kind: "removed", target: `phase:${o.position}`, labelAr: o.nameAr });
  for (const [sec, k] of [["precautions", "precautionsAr"], ["stopRules", "stopRulesAr"], ["homeProgram", "homeProgramAr"], ["goals", "goalsAr"], ["rationale", "rationaleAr"]] as const) {
    if (!eq(a.texts[k], b.texts[k])) add(sec, { kind: "changed", target: `texts.${k}`, labelAr: DIFF_SECTION_LABELS[sec], before: a.texts[k], after: b.texts[k] });
  }
  for (const [sec, k] of [["precautions", "precautionsEn"], ["stopRules", "stopRulesEn"], ["homeProgram", "homeProgramEn"], ["goals", "goalsEn"], ["rationale", "rationaleEn"]] as const) {
    if (!eq(a.texts[k], b.texts[k])) add(sec, { kind: "changed", target: `texts.${k}`, labelAr: FIELD_LABELS[k], before: a.texts[k], after: b.texts[k] });
  }
  for (const k of Object.keys(b.protocolTexts) as (keyof SnapProtocolTexts)[]) {
    if (!eq(a.protocolTexts[k], b.protocolTexts[k])) add("protocolTexts", { kind: "changed", target: `protocol.${k}`, labelAr: `نصُّ البروتوكول: ${PROTOCOL_TEXT_LABELS[k]}`, before: a.protocolTexts[k], after: b.protocolTexts[k] });
  }
  const mA = a.measuresOwn ? a.measures : []; const mB = b.measuresOwn ? b.measures : [];
  if (a.measuresOwn !== b.measuresOwn) add("measures", { kind: "changed", target: "measures", labelAr: b.measuresOwn ? "مقاييسُ خاصّة بالخطّة" : "مقاييسُ البروتوكول", before: a.measuresOwn, after: b.measuresOwn });
  for (const m of mB) { const o = mA.find((y) => y.code === m.code); if (!o) { add("measures", { kind: "added", target: `measure:${m.code}`, labelAr: m.nameAr });
    rest("measures", `measure:${m.code}`, `${m.nameAr} — `, blankOf(m, ["code", "nameAr"]), m as unknown as Record<string, unknown>, ["code"]); } else if (!eq(o, m)) add("measures", { kind: "changed", target: `measure:${m.code}`, labelAr: m.nameAr, before: o, after: m }); }
  for (const o of mA) if (!mB.some((y) => y.code === o.code)) add("measures", { kind: "removed", target: `measure:${o.code}`, labelAr: o.nameAr });
  const u = (s: SnapSource) => normalizeSourceUrl(s.url);
  for (const s of b.sources) if (!a.sources.some((y) => u(y) === u(s))) { add("sources", { kind: "added", target: `source:${u(s)}`, labelAr: s.title || s.url });
    rest("sources", `source:${u(s)}`, `${s.title || s.url} — `, blankOf(s, ["url", "title"]), s as unknown as Record<string, unknown>, ["url"]); }
  for (const s of a.sources) if (!b.sources.some((y) => u(y) === u(s))) add("sources", { kind: "removed", target: `source:${u(s)}`, labelAr: s.title || s.url });
  for (const s of b.sources) { const o = a.sources.find((y) => u(y) === u(s)); if (o) rest("sources", `source:${u(s)}`, `${s.title || s.url} — `,
    o as unknown as Record<string, unknown>, s as unknown as Record<string, unknown>, ["url"]); }
  for (const f of b.forbidden) if (!a.forbidden.some((y) => y.deviceCode === f.deviceCode)) { add("forbidden", { kind: "added", target: `forbidden:${f.deviceCode}`, labelAr: f.nameAr, after: f.reasonAr });
    rest("forbidden", `forbidden:${f.deviceCode}`, `${f.nameAr} — `, blankOf(f, ["deviceCode", "nameAr", "reasonAr"]), f as unknown as Record<string, unknown>, ["deviceCode"]); }
  for (const f of a.forbidden) if (!b.forbidden.some((y) => y.deviceCode === f.deviceCode)) add("forbidden", { kind: "removed", target: `forbidden:${f.deviceCode}`, labelAr: f.nameAr });
  for (const f of b.forbidden) { const o = a.forbidden.find((y) => y.deviceCode === f.deviceCode); if (o) rest("forbidden", `forbidden:${f.deviceCode}`, `${f.nameAr} — `,
    o as unknown as Record<string, unknown>, f as unknown as Record<string, unknown>, ["deviceCode"]); }
  rest("other", "plan", "", snapshotContent(a) as unknown as Record<string, unknown>, snapshotContent(b) as unknown as Record<string, unknown>,
    ["schema", "track", "startingPhase", "totalSessions", "sessionsPerWeek", "sessionMinutes", "texts", "protocolTexts", "forbidden", "devices", "phases",
      "measuresOwn", "measures", "sources"]);
  //  **الشبكةُ الأخيرة**: ما يغيّره الحفظُ (`sameContent`) لا يُعرض «لا تغيير» أبداً.
  if (out.size === 0 && !sameContent(a, b)) add("other", { kind: "changed", target: "plan", labelAr: "تغييرٌ في محتوى الخطّة لم يُسمَّ" });
  const sections = SECTION_ORDER.filter((k) => out.has(k)).map((k) => ({ key: k, labelAr: DIFF_SECTION_LABELS[k], changes: out.get(k)! }));
  return { empty: sections.length === 0, sections };
}

const CHANGE_FORMS = { one: "تغييرٌ واحد آخر", two: "تغييران آخران", few: "تغييرات أخرى", many: "تغييراً آخر", other: "تغيير آخر" };
const VERB: Record<Change["kind"], string> = { added: "أُضيف", removed: "حُذف", changed: "تغيّر" };
/** **ملخّصُ الفرق بالعربية** — أربعُ عباراتٍ على الأكثر بـ« · »، والباقي «و٣ تغييرات أخرى». */
export function diffSummaryAr(d: PlanDiff, max = 4): string {
  const all = d.sections.flatMap((s) => s.changes.map((c) => `${s.labelAr}: ${VERB[c.kind]} ${c.labelAr}`));
  if (!all.length) return "لا تغيير";
  const head = all.slice(0, max).join(" · ");
  const rest = all.length - max;
  return rest > 0 ? `${head} و${arCount(rest, CHANGE_FORMS)}` : head;
}
