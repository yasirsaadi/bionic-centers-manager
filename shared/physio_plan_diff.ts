// **ما تختلف به خطّةُ المريض عن بروتوكولها الأصليّ** (ترحيل ١٣٢، §4.do — طلبُ المالك ٢٠٢٦-١٠-١١).
//
// قراراتُ المالك:
//   • **سليم (المشرفُ العام) يعدّل البروتوكولَ الأصليّ كلَّه** — الأجهزةُ (أساسيٌّ أو لا، إزالةٌ وإضافة) والمقاييسُ وغيرُها؛ وحين يعدّل ويعتمد
//     يصير البروتوكولُ كما عدّله. **والأخصائيُّ (أو سليم داخل خطّة مريض) يعدّل خطّةَ ذلك المريض وحدها**.
//   • **«أشّر الذي يتغيّر في خطّة المريض عن البروتوكول الأصليّ»** ليراه الأخصائيُّ وسليم والمالك.
//   • **والمرجعُ البروتوكولُ كما هو الآن** — «الذي اعتمده سليم وعدّله آخرَ مرّة»: فإن عدّل سليم بروتوكولاً بعد أسبوع صار تعديلُه المرجعَ،
//     وتُقارَن به كلُّ خطّة. فالفرقُ قد يأتي من الأخصائيّ أو من تعديل سليم بعد نسخ الخطّة — والصفحةُ تقول ذلك (`protocolChangedSinceCopy`).
//
// **القاعدةُ هنا وحدها** — الخادمُ يحسبها لصفحة الخطّة وللتنبيه، والقاعدةُ نفسُها في الاختبار. وما ليس فرقاً:
//   • جهازٌ مساعدٌ في البروتوكول لم يؤشّره الأخصائيُّ لمريضه — اختيارٌ يتركه البروتوكولُ له (§4.dd)، لا خروجٌ عنه.
//   • ترتيبُ الأجهزة، وعنوانُ الخطّة، و«ملاحظاتُ الأخصائيّ لهذا المريض» — ليست في البروتوكول.
//   • والمقاييسُ ما دامت الخطّةُ تتبع مقاييسَ بروتوكولها (لم تُعدَّل لهذا المريض).
import { centreUseOf, CENTRE_USE_LABELS, CENTRE_USE_LABELS_EN, type ProtocolLang } from "./physio_protocols";
import { deviceParamsLine, PHASE_TEXT_FIELDS } from "./physio_exercises";
import { scheduleLabel } from "./physio_device_settings";
import type { MeasureDef } from "./physio_assessments";

// ── بندُ الخطّة كما يُنسخ من البروتوكول — قاعدةٌ واحدة للنسخ وللمقارنة ─────────────────────────────────────────────
export interface PlanLineFromProtocol {
  deviceId: number; minutes: number | null;
  parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  centreUse: "core" | "adjunct"; everyDays: number | null; times: number | null;
}

/** بندُ خطّةٍ من جهاز بروتوكول: استعمالُه، ودقائقُه، ونصوصُه باللغتين وأوّلُها سطرُ إعداداته (§4.cx). */
export function planLineFromProtocol(l: {
  deviceId: number | string; minutes?: number | null; params?: Record<string, string> | null;
  parameters?: string | null; parametersEn?: string | null; note?: string | null; noteEn?: string | null;
  centreUse?: unknown; evidence?: unknown; everyDays?: number | null; times?: number | null;
}, code: string): PlanLineFromProtocol {
  const withSettings = (settings: string, text: string | null | undefined) => [settings, text].filter((x) => x && x.trim()).join("\n") || null;
  return {
    deviceId: Number(l.deviceId), minutes: l.minutes ?? null,
    parameters: withSettings(deviceParamsLine(code, l.params, "ar"), l.parameters),
    parametersEn: withSettings(deviceParamsLine(code, l.params, "en"), l.parametersEn),
    note: l.note ?? null, noteEn: l.noteEn ?? null, centreUse: centreUseOf(l) === "adjunct" ? "adjunct" : "core",
    everyDays: l.everyDays ?? null, times: l.times ?? null,
  };
}

/** «الموانعُ والاحتياطات» في الخطّة = موانعُ البروتوكول واحتياطاتُه معاً. */
export function protocolPrecautionsText(pr: {
  contraindications?: string | null; precautions?: string | null; contraindicationsEn?: string | null; precautionsEn?: string | null;
}, lang: ProtocolLang): string | null {
  const parts = lang === "en" ? [pr.contraindicationsEn, pr.precautionsEn] : [pr.contraindications, pr.precautions];
  return parts.filter(Boolean).join("\n\n") || null;
}

// ── شكلُ الفرق ──────────────────────────────────────────────────────────────────────────────────────────────
export type DiffArea = "dose" | "text" | "device" | "phase" | "exercise" | "measure";
export type DiffKind = "added" | "removed" | "changed";
export const DIFF_AREAS: readonly DiffArea[] = ["dose", "device", "measure", "phase", "exercise", "text"];
export const DIFF_AREA_LABELS: Record<DiffArea, string> = {
  dose: "الجرعة", device: "الأجهزة", measure: "مقاييس التقييم", phase: "المراحل", exercise: "التمارين", text: "النصوص",
};
export const DIFF_AREA_LABELS_EN: Record<DiffArea, string> = {
  dose: "Dose", device: "Devices", measure: "Outcome measures", phase: "Phases", exercise: "Exercises", text: "Texts",
};
export const DIFF_KIND_LABELS: Record<DiffKind, string> = { added: "أُضيف", removed: "أُزيل", changed: "عُدّل" };
export const DIFF_KIND_LABELS_EN: Record<DiffKind, string> = { added: "Added", removed: "Removed", changed: "Changed" };

/** خانةٌ اختلفت: قيمةُ البروتوكول ⟵ قيمةُ الخطّة، بالعربية (وبالإنكليزية حين يختلف النصّ). */
export interface DiffField {
  field: string; ar: string; en: string;
  from: string | null; to: string | null;
  fromEn?: string | null; toEn?: string | null;
}
export interface DiffItem {
  area: DiffArea; kind: DiffKind;
  /** مفتاحٌ ثابت تُعلَّم به الخانةُ في مكانها: `dose` · `text:goals` · `device:12` · `phase:2` · `exercise:2:45` · `measure:odi`. */
  key: string;
  nameAr: string; nameEn: string;
  /** سببُ الإضافة أو الإزالة حين يُعرف: «أساسيٌّ في البروتوكول» · «البروتوكول: لا يُستخدم» · «غير متوفّر في فرع الخطّة». */
  noteAr?: string | null; noteEn?: string | null;
  fields?: DiffField[];
}
export interface PlanDiff { items: DiffItem[]; count: number }

// ── المدخلات ────────────────────────────────────────────────────────────────────────────────────────────────
export interface DiffDevice {
  deviceId: number; code?: string | null; nameAr?: string | null; nameEn?: string | null;
  minutes: number | null; parameters: string | null; parametersEn: string | null; note: string | null; noteEn: string | null;
  centreUse?: unknown; everyDays?: number | null; times?: number | null;
}
export interface DiffProtocolDevice extends Omit<DiffDevice, "parameters" | "parametersEn" | "note" | "noteEn"> {
  parameters?: string | null; parametersEn?: string | null; note?: string | null; noteEn?: string | null;
  evidence?: unknown; params?: Record<string, string> | null;
}
export interface DiffExercise {
  exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null;
  exercise?: { nameAr?: string | null; nameEn?: string | null } | null;
}
export interface DiffPhase {
  position: number; nameAr: string; nameEn: string; sessionFrom?: number | null; sessionTo?: number | null;
  exercises: DiffExercise[]; [k: string]: unknown;
}
interface DoseSide { totalSessions: number | null; sessionsPerWeek: number | null; durationWeeks: number | null; sessionMinutes: number | null }
interface TextSide { goals: string | null; goalsEn: string | null; exercises: string | null; exercisesEn: string | null }
export interface DiffPlanSide extends DoseSide, TextSide {
  precautions: string | null; precautionsEn: string | null;
  devices: DiffDevice[]; phases: DiffPhase[];
  /** مقاييسُ هذه الخطّة إن عُدّلت لمريضها — `null`: تتبع بروتوكولَها فلا فرق. */
  measures: MeasureDef[] | null;
}
export interface DiffProtocolSide extends DoseSide, TextSide {
  contraindications: string | null; contraindicationsEn: string | null; precautions: string | null; precautionsEn: string | null;
  devices: DiffProtocolDevice[]; phases: DiffPhase[]; measures: MeasureDef[];
}

// ── أدوات ──────────────────────────────────────────────────────────────────────────────────────────────────
const norm = (v: unknown): string => (v === null || v === undefined ? "" : String(v)).replace(/\s+/g, " ").trim();
const same = (a: unknown, b: unknown) => norm(a) === norm(b);
const show = (v: unknown): string | null => (norm(v) ? String(v).trim() : null);
const num = (v: unknown): string | null => (v === null || v === undefined || v === "" ? null : String(v));

/** خانةٌ ذاتُ نسختين — مختلفةٌ إن اختلفت العربيةُ أو الإنكليزية. */
function biField(field: string, ar: string, en: string, from: [unknown, unknown], to: [unknown, unknown]): DiffField | null {
  if (same(from[0], to[0]) && same(from[1], to[1])) return null;
  return { field, ar, en, from: show(from[0]), to: show(to[0]), fromEn: show(from[1]), toEn: show(to[1]) };
}
function oneField(field: string, ar: string, en: string, from: unknown, to: unknown, fmt: (v: unknown) => string | null = num): DiffField | null {
  if (same(from, to)) return null;
  return { field, ar, en, from: fmt(from), to: fmt(to) };
}
const present = <T>(xs: (T | null)[]): T[] => xs.filter((x): x is T => x !== null);

const DOSE_FIELDS: { k: keyof DoseSide; ar: string; en: string }[] = [
  { k: "totalSessions", ar: "عدد الجلسات", en: "Total sessions" },
  { k: "sessionsPerWeek", ar: "جلسات/أسبوع", en: "Sessions per week" },
  { k: "sessionMinutes", ar: "دقيقة/جلسة", en: "Minutes per session" },
];
const TEXT_FIELDS: { k: "goals" | "exercises" | "precautions"; ar: string; en: string }[] = [
  { k: "goals", ar: "الأهداف", en: "Goals" },
  { k: "exercises", ar: "التمارين والبرنامج المنزلي", en: "Exercises & home programme" },
  { k: "precautions", ar: "الموانع والاحتياطات", en: "Contraindications & precautions" },
];
const PHASE_FIELD_LABELS: Record<string, { ar: string; en: string }> = {
  timeframe: { ar: "المدّة التقريبية", en: "Timeframe" }, goals: { ar: "أهداف المرحلة", en: "Phase goals" },
  education: { ar: "ما يُقال للمريض", en: "What to tell the patient" }, progressCriteria: { ar: "معيار الانتقال", en: "Progression criteria" },
  notes: { ar: "ملاحظات للمعالج", en: "Notes for the therapist" },
};
const useLabel = (u: unknown, en: boolean) => {
  const k = u === "adjunct" ? "adjunct" : u === "not_used" ? "not_used" : "core";
  return en ? CENTRE_USE_LABELS_EN[k] : CENTRE_USE_LABELS[k];
};
const scheduleText = (l: { everyDays?: number | null; times?: number | null }) => scheduleLabel(l, "ar") || null;
const rangeText = (p: { sessionFrom?: number | null; sessionTo?: number | null }) =>
  p.sessionFrom != null && p.sessionTo != null ? `${p.sessionFrom}–${p.sessionTo}` : null;

/**
 * **الفروقُ كلُّها** بين الخطّة وبروتوكولها الآن. `availableDeviceIds`: أجهزةُ فرع الخطّة المتوفّرة — جهازٌ أساسيٌّ في البروتوكول غائبٌ عن الخطّة
 * يُذكر «أُزيل»، ومعه «غير متوفّر في فرع الخطّة» حين يكون ذلك سببَه.
 */
export function planProtocolDiff(plan: DiffPlanSide, protocol: DiffProtocolSide, availableDeviceIds?: ReadonlySet<number> | null): PlanDiff {
  const items: DiffItem[] = [];

  //  ١. الجرعة — بندٌ واحد بخاناته. والأسابيعُ مشتقّةٌ من العدد، فلا تُقارَن إلّا حين لا عددَ في الطرفين.
  const doseFields = present(DOSE_FIELDS.map((d) => oneField(d.k, d.ar, d.en, protocol[d.k], plan[d.k])));
  if (protocol.totalSessions == null && plan.totalSessions == null) {
    const w = oneField("durationWeeks", "الأسابيع", "Weeks", protocol.durationWeeks, plan.durationWeeks);
    if (w) doseFields.push(w);
  }
  if (doseFields.length) items.push({ area: "dose", kind: "changed", key: "dose", nameAr: "الجرعة", nameEn: "Dose", fields: doseFields });

  //  ٢. الأجهزة.
  const planById = new Map(plan.devices.map((d) => [Number(d.deviceId), d]));
  const protoIds = new Set(protocol.devices.map((d) => Number(d.deviceId)));
  for (const p of protocol.devices) {
    const id = Number(p.deviceId);
    const use = centreUseOf(p);
    const mine = planById.get(id);
    const base = { area: "device" as const, key: `device:${id}`, nameAr: p.nameAr ?? String(p.code ?? id), nameEn: p.nameEn ?? String(p.code ?? id) };
    if (!mine) {
      //  المساعدُ اختيارٌ للأخصائيّ، و«لا يُستخدم» غيابُه هو البروتوكول — الأساسيُّ وحده غيابُه فرق.
      if (use !== "core") continue;
      const unavailable = availableDeviceIds ? !availableDeviceIds.has(id) : false;
      items.push({ ...base, kind: "removed",
        noteAr: unavailable ? "أساسيٌّ في البروتوكول — غيرُ متوفّرٍ في فرع الخطّة" : "أساسيٌّ في البروتوكول",
        noteEn: unavailable ? "Core in the protocol — not available in the plan's branch" : "Core in the protocol" });
      continue;
    }
    if (use === "not_used") {
      items.push({ ...base, kind: "added", noteAr: "البروتوكول: لا يُستخدم", noteEn: "Protocol: not used" });
      continue;
    }
    const want = planLineFromProtocol(p as any, String(p.code ?? ""));
    const fields = present([
      oneField("centreUse", "الاستعمال", "Use", useLabel(want.centreUse, false), useLabel(mine.centreUse, false), show),
      oneField("minutes", "الدقائق", "Minutes", want.minutes, mine.minutes),
      oneField("schedule", "الموعد الدوريّ", "Schedule", scheduleText(want), scheduleText(mine), show),
      biField("parameters", "المعاملات", "Parameters", [want.parameters, want.parametersEn], [mine.parameters, mine.parametersEn]),
      biField("note", "الملاحظة", "Note", [want.note, want.noteEn], [mine.note, mine.noteEn]),
    ]);
    if (fields.length) items.push({ ...base, kind: "changed", fields });
  }
  for (const d of plan.devices) {
    if (protoIds.has(Number(d.deviceId))) continue;
    items.push({ area: "device", kind: "added", key: `device:${d.deviceId}`, nameAr: d.nameAr ?? String(d.code ?? d.deviceId),
      nameEn: d.nameEn ?? String(d.code ?? d.deviceId), noteAr: "ليس في البروتوكول", noteEn: "Not in the protocol" });
  }

  //  ٣. المقاييس — حين عُدّلت لهذا المريض وحدها.
  if (plan.measures) {
    const protoBy = new Map(protocol.measures.map((m) => [m.code, m]));
    const planBy = new Map(plan.measures.map((m) => [m.code, m]));
    const bound = (m: MeasureDef) => `${m.min} – ${m.max}${m.unitAr ? ` ${m.unitAr}` : ""}`;
    const dir = (m: MeasureDef) => (m.higherIsBetter ? "الأعلى أفضل" : "الأقلّ أفضل");
    for (const p of protocol.measures) {
      const mine = planBy.get(p.code);
      const base = { area: "measure" as const, key: `measure:${p.code}`, nameAr: p.nameAr, nameEn: p.nameEn };
      if (!mine) { items.push({ ...base, kind: "removed" }); continue; }
      const fields = present([
        biField("name", "الاسم", "Name", [p.nameAr, p.nameEn], [mine.nameAr, mine.nameEn]),
        oneField("range", "المدى", "Range", bound(p), bound(mine), show),
        oneField("direction", "الاتجاه", "Direction", dir(p), dir(mine), show),
      ]);
      if (fields.length) items.push({ ...base, nameAr: mine.nameAr, nameEn: mine.nameEn, kind: "changed", fields });
    }
    for (const m of plan.measures) {
      if (!protoBy.has(m.code)) items.push({ area: "measure", kind: "added", key: `measure:${m.code}`, nameAr: m.nameAr, nameEn: m.nameEn });
    }
  }

  //  ٤. المراحلُ بمواضعها، وتمارينُ كلّ مرحلةٍ بأعيانها.
  const phaseName = (p: DiffPhase) => ({ nameAr: p.nameAr || `المرحلة ${p.position}`, nameEn: p.nameEn || `Phase ${p.position}` });
  const exName = (e: DiffExercise) => ({ nameAr: e.exercise?.nameAr ?? `#${e.exerciseId}`, nameEn: e.exercise?.nameEn ?? `#${e.exerciseId}` });
  const n = Math.max(protocol.phases.length, plan.phases.length);
  for (let i = 0; i < n; i++) {
    const pr = protocol.phases[i];
    const mine = plan.phases[i];
    const pos = i + 1;
    if (!mine) { items.push({ area: "phase", kind: "removed", key: `phase:${pos}`, ...phaseName(pr) }); continue; }
    if (!pr) { items.push({ area: "phase", kind: "added", key: `phase:${pos}`, ...phaseName(mine) }); continue; }
    const fields = present([
      biField("name", "الاسم", "Name", [pr.nameAr, pr.nameEn], [mine.nameAr, mine.nameEn]),
      oneField("range", "نطاق الجلسات", "Session range", rangeText(pr), rangeText(mine), show),
      ...PHASE_TEXT_FIELDS.map((f) => biField(f, PHASE_FIELD_LABELS[f].ar, PHASE_FIELD_LABELS[f].en, [pr[f], pr[`${f}En`]], [mine[f], mine[`${f}En`]])),
    ]);
    if (fields.length) items.push({ area: "phase", kind: "changed", key: `phase:${pos}`, ...phaseName(mine), fields });
    const exBy = new Map(mine.exercises.map((e) => [Number(e.exerciseId), e]));
    const protoEx = new Set(pr.exercises.map((e) => Number(e.exerciseId)));
    for (const e of pr.exercises) {
      const key = `exercise:${pos}:${e.exerciseId}`;
      const m = exBy.get(Number(e.exerciseId));
      if (!m) { items.push({ area: "exercise", kind: "removed", key, ...exName(e), noteAr: `المرحلة ${pos}`, noteEn: `Phase ${pos}` }); continue; }
      const f = present([
        oneField("sets", "المجموعات", "Sets", e.sets, m.sets),
        oneField("reps", "التكرارات", "Reps", e.reps, m.reps),
        oneField("holdSeconds", "الثبات (ث)", "Hold (s)", e.holdSeconds, m.holdSeconds),
        oneField("restSeconds", "الراحة (ث)", "Rest (s)", e.restSeconds, m.restSeconds),
        biField("doseNote", "الجرعة", "Dose", [e.doseNote, e.doseNoteEn], [m.doseNote, m.doseNoteEn]),
        biField("note", "الملاحظة", "Note", [e.note, e.noteEn], [m.note, m.noteEn]),
      ]);
      if (f.length) items.push({ area: "exercise", kind: "changed", key, ...exName(m), noteAr: `المرحلة ${pos}`, noteEn: `Phase ${pos}`, fields: f });
    }
    for (const e of mine.exercises) {
      if (protoEx.has(Number(e.exerciseId))) continue;
      items.push({ area: "exercise", kind: "added", key: `exercise:${pos}:${e.exerciseId}`, ...exName(e), noteAr: `المرحلة ${pos}`, noteEn: `Phase ${pos}` });
    }
  }

  //  ٥. النصوص.
  for (const t of TEXT_FIELDS) {
    const from: [unknown, unknown] = t.k === "precautions"
      ? [protocolPrecautionsText(protocol, "ar"), protocolPrecautionsText(protocol, "en")]
      : [protocol[t.k], protocol[`${t.k}En` as const]];
    const f = biField(t.k, t.ar, t.en, from, [plan[t.k], plan[`${t.k}En` as const]]);
    if (f) items.push({ area: "text", kind: "changed", key: `text:${t.k}`, nameAr: t.ar, nameEn: t.en, fields: [f] });
  }

  return { items, count: items.length };
}

/** فروقُ موضعٍ بعينه — لعلامته في مكانه. */
export const diffAt = (diff: PlanDiff | null | undefined, key: string): DiffItem | undefined => diff?.items.find((i) => i.key === key);

/** سطرٌ قصير للتنبيه: «تختلف عن البروتوكول في ٣ مواضع: الجرعة، الأجهزة». */
export function diffSummaryLine(diff: PlanDiff): string {
  if (!diff.count) return "مطابقةٌ للبروتوكول الأصليّ";
  const areas = DIFF_AREAS.filter((a) => diff.items.some((i) => i.area === a)).map((a) => DIFF_AREA_LABELS[a]);
  const where = diff.count === 1 ? "موضعٍ واحد" : diff.count === 2 ? "موضعين" : `${diff.count} ${diff.count <= 10 ? "مواضع" : "موضعاً"}`;
  return `تختلف عن البروتوكول في ${where}: ${areas.join("، ")}`;
}
