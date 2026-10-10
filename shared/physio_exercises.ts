// **مكتبةُ التمارين ومراحلُ البروتوكول ومعاملاتُ الأجهزة** (ترحيل ١١٨، §4.cx — ٢٠٢٦-١٠-٠٩).
//
// ملاحظةُ سليم (المشرف العام) على البروتوكولات: «ضعيفةٌ وسطحية، معلوماتٌ عامّة يعرفها أيُّ معالج — نحتاج تفاصيلَ دقيقة هي التي تصنع
// الفرق، ولكلّ تمرينٍ صورٌ وطريقةُ أدائه حتى يُعمل صحيحاً». فقرّر المالك:
//   • **التمرينُ بطاقةٌ في مكتبةٍ مستقلّة** يُكتب مرّةً ويُربط بكلّ بروتوكولٍ يحتاجه: الهدف، ووضعيةُ البداية، والخطواتُ مرقّمة، والجرعة،
//     والأخطاءُ الشائعة، والأسهلُ والأصعب، ومتى يتوقّف، والأدوات، وصورٌ لكلّ خطوةٍ مهمّة.
//   • **البروتوكولُ مراحل**، ولكلّ مرحلةٍ أهدافُها وما يُقال للمريض وتمارينُها بجرعتها **ومعيارٌ مكتوبٌ للانتقال**.
//   • **معاملاتُ الأجهزة بخاناتٍ لكلّ جهاز** بدل سطرٍ حرّ — فلا يبقى سطرُ جهازٍ ناقصاً دون أن يُرى نقصُه.
//   • **الصورُ من الإنترنت يجمعها المالك**: لكلّ صورةٍ رمزٌ ثابت وكلماتُ بحثٍ إنكليزية؛ يرفعها فتُضغَط وتوضع في المستودع، وقائمةُ
//     ما وصل في `shared/physio_exercise_media.ts`.
//   • **وكلُّ ذلك مسوّدةٌ حتى يعتمده المشرفُ العام أو المسؤول** — بقواعد البروتوكول نفسِها (`canEditProtocols` · `canApproveProtocols`
//     · `statusAfterEdit`).
import type { ProtocolLang } from "./physio_protocols";

// ── نوعُ التمرين ومنطقتُه ───────────────────────────────────────────────────────
export const EXERCISE_KINDS = [
  "mobility", "stretch", "strength", "motor_control", "endurance", "aerobic", "balance", "functional", "breathing", "neural",
] as const;
export type ExerciseKind = (typeof EXERCISE_KINDS)[number];
export const EXERCISE_KIND_LABELS: Record<ExerciseKind, string> = {
  mobility: "حركة ومدى", stretch: "تمطيط", strength: "تقوية", motor_control: "تحكّم حركي", endurance: "تحمّل عضلي",
  aerobic: "هوائي", balance: "توازن", functional: "وظيفي", breathing: "تنفّس واسترخاء", neural: "انزلاق عصبي",
};
export const EXERCISE_KIND_LABELS_EN: Record<ExerciseKind, string> = {
  mobility: "Mobility", stretch: "Stretch", strength: "Strength", motor_control: "Motor control", endurance: "Muscular endurance",
  aerobic: "Aerobic", balance: "Balance", functional: "Functional", breathing: "Breathing & relaxation", neural: "Neural mobility",
};
export const isExerciseKind = (v: unknown): v is ExerciseKind => typeof v === "string" && (EXERCISE_KINDS as readonly string[]).includes(v);

export const BODY_REGIONS = [
  "lumbar", "thoracic", "cervical", "shoulder", "elbow", "wrist_hand", "hip", "knee", "ankle_foot", "whole_body",
] as const;
export type BodyRegion = (typeof BODY_REGIONS)[number];
export const BODY_REGION_LABELS: Record<BodyRegion, string> = {
  lumbar: "أسفل الظهر", thoracic: "أعلى الظهر", cervical: "الرقبة", shoulder: "الكتف", elbow: "المرفق", wrist_hand: "الرسغ واليد",
  hip: "الورك", knee: "الركبة", ankle_foot: "الكاحل والقدم", whole_body: "الجسم كلّه",
};
export const BODY_REGION_LABELS_EN: Record<BodyRegion, string> = {
  lumbar: "Lumbar spine", thoracic: "Thoracic spine", cervical: "Cervical spine", shoulder: "Shoulder", elbow: "Elbow",
  wrist_hand: "Wrist & hand", hip: "Hip", knee: "Knee", ankle_foot: "Ankle & foot", whole_body: "Whole body",
};
export const isBodyRegion = (v: unknown): v is BodyRegion => typeof v === "string" && (BODY_REGIONS as readonly string[]).includes(v);

/** نصوصُ البطاقة ذاتُ النسختين — والإنكليزيةُ في `<field>En`. الخطواتُ والأخطاءُ سطرٌ لكلّ بند. */
export const EXERCISE_TEXT_FIELDS = [
  "purpose", "startPosition", "steps", "cues", "easier", "harder", "stopIf", "equipment", "doseNote",
] as const;
export type ExerciseTextField = (typeof EXERCISE_TEXT_FIELDS)[number];

/** نصوصُ المرحلة ذاتُ النسختين. */
export const PHASE_TEXT_FIELDS = ["timeframe", "goals", "education", "progressCriteria", "notes"] as const;
export type PhaseTextField = (typeof PHASE_TEXT_FIELDS)[number];

// ── الصور ─────────────────────────────────────────────────────────────────────
/**
 * **صورةٌ مخطَّطة** في البطاقة: رمزٌ ثابت يُسمّى به الملفّ، وما يجب أن تُظهره بالعربية والإنكليزية، وكلماتُ بحثٍ إنكليزية يبحث بها
 * المالك. والملفُّ نفسُه — حين يصل — يُسجَّل في `physio_exercise_media.ts` لا هنا.
 */
export interface ExerciseImagePlan { key: string; captionAr: string; captionEn: string; search: string }
export const IMAGE_KEY_RE = /^[a-z0-9][a-z0-9-]{2,59}$/;

export function normalizeImagePlans(input: unknown): ExerciseImagePlan[] | string {
  if (input === undefined || input === null) return [];
  if (!Array.isArray(input) || input.length > 8) return "صورُ التمرين قائمةٌ من ثمانٍ على الأكثر";
  const out: ExerciseImagePlan[] = [];
  for (const r of input) {
    const key = typeof r?.key === "string" ? r.key.trim().toLowerCase() : "";
    if (!IMAGE_KEY_RE.test(key)) return "رمزُ الصورة حروفٌ إنكليزية صغيرة وأرقام وشرطة";
    if (out.some((x) => x.key === key)) return "رمزُ صورةٍ مكرّر";
    const captionAr = str(r?.captionAr, 300) ?? "";
    const captionEn = str(r?.captionEn, 300) ?? "";
    if (!captionAr && !captionEn) return "اكتب ما تُظهره كلُّ صورة";
    out.push({ key, captionAr, captionEn, search: str(r?.search, 120) ?? "" });
  }
  return out;
}

// ── الجرعة ───────────────────────────────────────────────────────────────────
export interface Dose {
  sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote?: string | null; doseNoteEn?: string | null;
}
export const DOSE_LIMITS = { sets: [1, 10], reps: [1, 100], holdSeconds: [1, 600], restSeconds: [0, 600] } as const;

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const arDigits = (n: number | string) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);

/**
 * **سطرُ الجرعة** كما يقرؤه المنفّذ: «٣ مجموعات × ١٠ تكرارات لكلّ جانب · ثبات ٥ ث · راحة ٣٠ ث · مرّتان يومياً».
 * جرعةُ المرحلة تغلب جرعةَ البطاقة حقلاً حقلاً (`mergeDose`).
 */
export function doseLine(d: Dose, perSide: boolean, lang: ProtocolLang): string {
  const parts: string[] = [];
  const n = (v: number) => (lang === "en" ? String(v) : arDigits(v));
  if (lang === "en") {
    if (d.sets && d.reps) parts.push(`${d.sets} × ${d.reps} reps${perSide ? " each side" : ""}`);
    else if (d.sets) parts.push(`${d.sets} sets${perSide ? " each side" : ""}`);
    else if (d.reps) parts.push(`${d.reps} reps${perSide ? " each side" : ""}`);
    if (d.holdSeconds) parts.push(`hold ${d.holdSeconds} s`);
    if (d.restSeconds) parts.push(`rest ${d.restSeconds} s`);
  } else {
    const side = perSide ? " لكلّ جانب" : "";
    if (d.sets && d.reps) parts.push(`${n(d.sets)} × ${n(d.reps)} تكرار${side}`);
    else if (d.sets) parts.push(`${n(d.sets)} مجموعات${side}`);
    else if (d.reps) parts.push(`${n(d.reps)} تكرار${side}`);
    if (d.holdSeconds) parts.push(`ثبات ${n(d.holdSeconds)} ث`);
    if (d.restSeconds) parts.push(`راحة ${n(d.restSeconds)} ث`);
  }
  const note = lang === "en" ? (d.doseNoteEn || d.doseNote) : (d.doseNote || d.doseNoteEn);
  if (note) parts.push(note);
  return parts.join(" · ");
}

/** جرعةُ المرحلة فوق جرعة البطاقة — الحقلُ الفارغ في المرحلة يأخذ قيمةَ البطاقة. */
export function mergeDose(card: Dose, phase: Partial<Dose> | null | undefined): Dose {
  const pick = <K extends keyof Dose>(k: K) => (phase?.[k] ?? card[k] ?? null) as Dose[K];
  return {
    sets: pick("sets"), reps: pick("reps"), holdSeconds: pick("holdSeconds"), restSeconds: pick("restSeconds"),
    doseNote: pick("doseNote"), doseNoteEn: pick("doseNoteEn"),
  };
}

// ── معاملاتُ الأجهزة بخانات ────────────────────────────────────────────────────
// **القيمُ بلا لغة** (أرقامٌ ووحداتٌ دولية: Hz · MHz · W/cm² · µs · bar · J · nm · mW · %)، والتسمياتُ باللغتين. وما كان وصفاً
// (موضعُ الأقطاب، وضعيةُ المريض) يبقى في سطر «المعاملات» النصّيّ بنسختيه كما كان.
export const DEVICE_PARAM_LABELS = {
  durationMin: { ar: "المدّة", en: "Duration", unit: "min" },
  frequencyHz: { ar: "التردّد", en: "Frequency", unit: "Hz" },
  frequencyMhz: { ar: "التردّد", en: "Frequency", unit: "MHz" },
  intensityWcm2: { ar: "الشدّة", en: "Intensity", unit: "W/cm²" },
  dutyCycle: { ar: "نسبة النبض", en: "Duty cycle", unit: "%" },
  currentType: { ar: "نوع التيار", en: "Current type", unit: "" },
  pulseWidthUs: { ar: "عرض النبضة", en: "Pulse width", unit: "µs" },
  intensity: { ar: "مستوى الشدّة", en: "Intensity level", unit: "" },
  onOff: { ar: "تشغيل / إطفاء", en: "On / off", unit: "s" },
  wavelengthNm: { ar: "الطول الموجي", en: "Wavelength", unit: "nm" },
  powerMw: { ar: "القدرة", en: "Power", unit: "mW" },
  doseJ: { ar: "الجرعة لكلّ نقطة", en: "Dose per point", unit: "J" },
  points: { ar: "عدد النقاط", en: "Points", unit: "" },
  pressureBar: { ar: "الضغط", en: "Pressure", unit: "bar" },
  energyMj: { ar: "كثافة الطاقة", en: "Energy flux density", unit: "mJ/mm²" },
  impulses: { ar: "عدد النبضات", en: "Impulses", unit: "" },
  sessions: { ar: "عدد الجلسات وتباعدها", en: "Sessions & interval", unit: "" },
  forcePctBw: { ar: "قوّة الشدّ", en: "Traction force", unit: "% BW" },
  holdRestS: { ar: "شدّ / راحة", en: "Hold / rest", unit: "s" },
  intensityMt: { ar: "الشدّة المغناطيسية", en: "Field intensity", unit: "mT" },
  mode: { ar: "النمط", en: "Mode", unit: "" },
  powerPct: { ar: "القدرة", en: "Power", unit: "%" },
  pressureMmhg: { ar: "الضغط", en: "Pressure", unit: "mmHg" },
  cycleS: { ar: "الدورة", en: "Cycle", unit: "s" },
  distanceCm: { ar: "المسافة عن الجلد", en: "Distance from skin", unit: "cm" },
  layers: { ar: "طبقات المنشفة", en: "Towel layers", unit: "" },
  temperatureC: { ar: "الحرارة", en: "Temperature", unit: "°C" },
  rangeDeg: { ar: "المدى", en: "Range", unit: "°" },
  speed: { ar: "السرعة", en: "Speed", unit: "" },
  bwsPct: { ar: "دعم وزن الجسم", en: "Body-weight support", unit: "%" },
  guidancePct: { ar: "قوّة التوجيه", en: "Guidance force", unit: "%" },
  needleSize: { ar: "مقاس الإبرة", en: "Needle size", unit: "mm" },
} as const;
export type DeviceParamKey = keyof typeof DEVICE_PARAM_LABELS;

/** الخاناتُ لكلّ جهاز (برمز جدول `devices`). التمارينُ بلا خانات — برنامجُها في المراحل. */
export const DEVICE_PARAM_FIELDS: Record<string, DeviceParamKey[]> = {
  megnatik: ["frequencyHz", "intensityMt", "durationMin"],
  laser: ["wavelengthNm", "powerMw", "doseJ", "points", "mode"],
  tecar: ["mode", "powerPct", "durationMin"],
  exercise: [],
  ultrasound: ["frequencyMhz", "intensityWcm2", "dutyCycle", "durationMin"],
  traction: ["forcePctBw", "holdRestS", "durationMin", "mode"],
  shockwaves: ["mode", "pressureBar", "energyMj", "impulses", "frequencyHz", "sessions"],
  electro: ["currentType", "frequencyHz", "pulseWidthUs", "intensity", "onOff", "durationMin"],
  compression: ["pressureMmhg", "cycleS", "durationMin"],
  infrared: ["distanceCm", "durationMin"],
  hot_pack: ["temperatureC", "layers", "durationMin"],
  wax: ["temperatureC", "mode", "durationMin"],
  cpm: ["rangeDeg", "speed", "durationMin"],
  robotik: ["bwsPct", "speed", "guidancePct", "durationMin"],
  needle: ["needleSize", "points", "sessions"],
};

/** يطبّع خاناتِ جهاز: المعروفةُ له وحدها، نصٌّ قصير، والفارغُ يُسقَط. */
export function normalizeDeviceParams(deviceCode: string | null | undefined, input: unknown): Record<string, string> | string {
  if (input === undefined || input === null) return {};
  if (typeof input !== "object" || Array.isArray(input)) return "معاملاتُ الجهاز غير صالحة";
  const allowed = new Set<string>(DEVICE_PARAM_FIELDS[deviceCode ?? ""] ?? []);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (v === null || v === undefined || (typeof v === "string" && !v.trim())) continue;
    if (!allowed.has(k)) return `خانةٌ لا تخصّ هذا الجهاز: ${k}`;
    if (typeof v !== "string" && typeof v !== "number") return "قيمةُ الخانة نصٌّ أو رقم";
    const s = String(v).trim().slice(0, 80);
    if (s) out[k] = s;
  }
  return out;
}

/** «التردّد: 1 MHz · الشدّة: 1.0 W/cm²» بترتيب خانات الجهاز. */
export function deviceParamsLine(deviceCode: string, params: Record<string, string> | null | undefined, lang: ProtocolLang): string {
  if (!params) return "";
  return (DEVICE_PARAM_FIELDS[deviceCode] ?? [])
    .filter((k) => params[k])
    .map((k) => {
      const l = DEVICE_PARAM_LABELS[k];
      const v = params[k];
      const unit = l.unit && !v.includes(l.unit) ? ` ${l.unit}` : "";
      return `${lang === "en" ? l.en : l.ar}: ${v}${unit}`;
    })
    .join(" · ");
}

// ── تطبيعُ البطاقة والمراحل (للخادم وللاختبار) ───────────────────────────────────
function str(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}
function intOrNull(v: unknown, [lo, hi]: readonly [number, number]): number | null | "bad" {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= lo && n <= hi ? n : "bad";
}
function parseDose(b: any): Omit<Dose, "doseNote" | "doseNoteEn"> | string {
  const sets = intOrNull(b?.sets, DOSE_LIMITS.sets);
  const reps = intOrNull(b?.reps, DOSE_LIMITS.reps);
  const holdSeconds = intOrNull(b?.holdSeconds, DOSE_LIMITS.holdSeconds);
  const restSeconds = intOrNull(b?.restSeconds, DOSE_LIMITS.restSeconds);
  if (sets === "bad") return "المجموعات من ١ إلى ١٠";
  if (reps === "bad") return "التكرارات من ١ إلى ١٠٠";
  if (holdSeconds === "bad") return "الثبات من ١ إلى ٦٠٠ ثانية";
  if (restSeconds === "bad") return "الراحة من ٠ إلى ٦٠٠ ثانية";
  return { sets, reps, holdSeconds, restSeconds };
}

export interface ExerciseInput {
  code: string; nameAr: string; nameEn: string; kind: ExerciseKind; region: BodyRegion;
  perSide: boolean; homeSuitable: boolean;
  sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  images: ExerciseImagePlan[];
  [k: string]: unknown;
}

/** جسمُ بطاقة التمرين — أو رسالةُ الخطأ. */
export function parseExerciseBody(b: any): ExerciseInput | string {
  const code = typeof b?.code === "string" ? b.code.trim().toLowerCase() : "";
  if (!/^[a-z0-9][a-z0-9_-]{1,59}$/.test(code)) return "الرمزُ حروفٌ إنكليزية صغيرة وأرقام وشرطة (مثل bird-dog)";
  const nameAr = str(b?.nameAr, 200);
  const nameEn = str(b?.nameEn, 200);
  if (!nameAr || !nameEn) return "اكتب اسمَ التمرين بالعربية والإنكليزية";
  if (!isExerciseKind(b?.kind)) return "اختر نوعَ التمرين";
  if (!isBodyRegion(b?.region)) return "اختر منطقةَ الجسم";
  const dose = parseDose(b);
  if (typeof dose === "string") return dose;
  const images = normalizeImagePlans(b?.images);
  if (typeof images === "string") return images;
  const out: ExerciseInput = {
    code, nameAr, nameEn, kind: b.kind, region: b.region,
    perSide: b?.perSide === true, homeSuitable: b?.homeSuitable !== false, ...dose, images,
  };
  for (const f of EXERCISE_TEXT_FIELDS) {
    const max = f === "doseNote" ? 300 : 4000;
    out[f] = str(b?.[f], max);
    out[`${f}En`] = str(b?.[`${f}En`], max);
  }
  if (!out.steps && !out.stepsEn) return "اكتب خطواتِ الأداء — سطرٌ لكلّ خطوة";
  return out;
}

export interface PhaseExerciseInput {
  exerciseId: number; sets: number | null; reps: number | null; holdSeconds: number | null; restSeconds: number | null;
  doseNote: string | null; doseNoteEn: string | null; note: string | null; noteEn: string | null;
}
export interface PhaseInput {
  nameAr: string; nameEn: string; exercises: PhaseExerciseInput[];
  /** ترحيل ١٢٣ — نطاقُ جلسات المرحلة (١–٦ …). */
  sessionFrom?: number | null; sessionTo?: number | null;
  [k: string]: unknown;
}

/** «الجلسات ١–٦» · «Sessions 1–6» — نطاقُ المرحلة إن كُتب. */
export function sessionRangeLabel(ph: { sessionFrom?: number | null; sessionTo?: number | null }, lang: ProtocolLang): string | null {
  const a = ph.sessionFrom ?? null; const b = ph.sessionTo ?? null;
  if (a == null && b == null) return null;
  const n = (x: number) => (lang === "en" ? String(x) : arDigits(x));
  if (a != null && b != null) return lang === "en" ? `Sessions ${n(a)}–${n(b)}` : `الجلسات ${n(a)}–${n(b)}`;
  if (a != null) return lang === "en" ? `From session ${n(a)}` : `من الجلسة ${n(a)}`;
  return lang === "en" ? `Up to session ${n(b!)}` : `حتى الجلسة ${n(b!)}`;
}

/** مراحلُ البروتوكول كاملةً — أو رسالةُ الخطأ. لا تمرينَ مكرّرٌ في المرحلة الواحدة. */
export function parsePhasesBody(input: unknown): PhaseInput[] | string {
  if (!Array.isArray(input) || input.length > 8) return "المراحلُ قائمةٌ من ثمانٍ على الأكثر";
  const out: PhaseInput[] = [];
  for (const p of input) {
    const nameAr = str(p?.nameAr, 200);
    const nameEn = str(p?.nameEn, 200);
    if (!nameAr || !nameEn) return "اكتب اسمَ كلّ مرحلةٍ بالعربية والإنكليزية";
    if (!Array.isArray(p?.exercises) || p.exercises.length > 30) return "تمارينُ المرحلة قائمةٌ من ثلاثين على الأكثر";
    const exercises: PhaseExerciseInput[] = [];
    for (const e of p.exercises) {
      const exerciseId = Number(e?.exerciseId);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) return "تمرينٌ غير صالح";
      if (exercises.some((x) => x.exerciseId === exerciseId)) return "تمرينٌ مكرّر في المرحلة نفسِها";
      const dose = parseDose(e);
      if (typeof dose === "string") return dose;
      exercises.push({ exerciseId, ...dose, doseNote: str(e?.doseNote, 300), doseNoteEn: str(e?.doseNoteEn, 300),
        note: str(e?.note, 1000), noteEn: str(e?.noteEn, 1000) });
    }
    //  ترحيل ١٢٣ (§4.dd) — نطاقُ جلسات المرحلة: من ١ إلى ٣٠٠، والبدايةُ لا تتجاوز النهاية.
    const sessionFrom = intOrNull(p?.sessionFrom, [1, 300]);
    const sessionTo = intOrNull(p?.sessionTo, [1, 300]);
    if (sessionFrom === "bad" || sessionTo === "bad") return "نطاقُ جلسات المرحلة من ١ إلى ٣٠٠";
    if (sessionFrom != null && sessionTo != null && sessionFrom > sessionTo) return `جلساتُ المرحلة «${nameAr}»: البدايةُ بعد النهاية`;
    const phase: PhaseInput = { nameAr, nameEn, exercises, sessionFrom, sessionTo };
    for (const f of PHASE_TEXT_FIELDS) {
      const max = f === "timeframe" ? 120 : 4000;
      phase[f] = str(p?.[f], max);
      phase[`${f}En`] = str(p?.[`${f}En`], max);
    }
    out.push(phase);
  }
  return out;
}

/** سطورُ نصٍّ (خطوات، أخطاء) ⟵ بنود — بلا الفارغ وبلا ترقيمٍ مكتوبٍ باليد في أوّلها. */
export function textLines(v: string | null | undefined): string[] {
  return String(v ?? "").split(/\r?\n/).map((l) => l.replace(/^\s*(?:[-•*]|\d+[.)-]|[٠-٩]+[.)-])\s*/, "").trim()).filter(Boolean);
}
