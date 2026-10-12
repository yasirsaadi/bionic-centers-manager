// **ورقةُ تمارين البيت** (§4.ds — «الطلب الثاني»، الشقُّ الثاني): قرارُ المالك (§4.cx): «طباعةٌ وإرسالٌ عبر تلغرام مع اسم الفرع والشعار».
//
// الورقةُ تمارينُ مرحلةٍ من نسخة المريض (`physio_plan_phases`) بجرعتها وصورها وطريقة أدائها، **وما يصلح للبيت منها افتراضاً** (`homeSuitable`)
// والمعالجُ يضيف أو يحذف قبل الطباعة. **وما يُرسَل عبر تلغرام هو الورقةُ المطبوعة نفسُها** ملفَّ PDF (ترويسةُ الفرع وشعارُه) — فما يصل المريضَ
// هو ما يراه المعالجُ على الشاشة حرفاً. والقواعدُ هنا بلا شاشةٍ ولا قاعدة: يقرؤها الخادمُ والصفحةُ معاً.
import { phaseForSession } from "./physio_plans";

/** أقصى حجمٍ للملفّ المرسَل — صفحاتُ A4 مصوَّرة؛ ورقةٌ بعشرين تمريناً بصورها دون ذلك بكثير، وتلغرام يقبل حتى ٥٠ م.ب. */
export const HOME_SHEET_MAX_BYTES = 15 * 1024 * 1024;
/** أقصى عددٍ للتمارين في ورقة — كحدّ تمارين الجلسة. */
export const HOME_SHEET_MAX_EXERCISES = 40;

/** **الورقةُ من خطّةٍ بدأ علاجُها** — معتمَدة، أو انتهت (موقوفة · تخرّج: برنامجُ ما بعد العلاج). المسوّدةُ لم تُقرَّر فلا تصل المريض. */
export const HOME_SHEET_STATUSES = ["approved", "stopped", "graduated"] as const;
export const homeSheetAllowed = (status: string): boolean => (HOME_SHEET_STATUSES as readonly string[]).includes(status);
export const HOME_SHEET_NOT_STARTED = "ورقةُ تمارين البيت من خطّةٍ بدأ علاجُها";

/**
 * **مرحلةُ الورقة افتراضاً: مرحلةُ آخر جلسةٍ نُفّذت** — المريضُ يأخذ إلى البيت ما أدّاه اليوم؛ وقبل أيّ جلسةٍ الأولى. ويختار المعالجُ غيرَها.
 * (والجلسةُ التالية تأخذ مرحلةَ رقمها في «إنهاء الجلسة» — §4.dr.)
 */
export function homeSheetDefaultPhase(
  phases: readonly { position: number; sessionFrom?: number | null; sessionTo?: number | null }[],
  sessionsSoFar: number,
): number | null {
  return phaseForSession(phases, Math.max(1, sessionsSoFar));
}

/** **تمارينُ الورقة افتراضاً**: ما يصلح للبيت من تمارين المرحلة، بترتيبها فيها. */
export function homeSheetDefaultExercises(exercises: readonly { exerciseId: number; exercise: { homeSuitable: boolean } }[]): number[] {
  return exercises.filter((e) => e.exercise.homeSuitable).map((e) => e.exerciseId);
}

/** **فحصُ ما يُرسَل**: تمارينُ من المرحلة نفسِها، بلا تكرار، وواحدٌ على الأقلّ. */
export function homeSheetSelectionError(p: { phaseExerciseIds: readonly number[]; exerciseIds: readonly number[] }): string | null {
  if (p.exerciseIds.length === 0) return "اختر تمريناً واحداً على الأقلّ للورقة";
  if (p.exerciseIds.length > HOME_SHEET_MAX_EXERCISES) return `أقصى التمارين في الورقة ${HOME_SHEET_MAX_EXERCISES}`;
  if (new Set(p.exerciseIds).size !== p.exerciseIds.length) return "تمرينٌ مكرّر في الورقة";
  const inPhase = new Set(p.phaseExerciseIds);
  if (p.exerciseIds.some((id) => !inPhase.has(id))) return "تمارينُ الورقة من تمارين المرحلة المختارة وحدها";
  return null;
}

/** «12,7,3» ⟵ أرقامٌ صحيحة موجبة؛ وغيرُ ذلك `null`. */
export function parseIdList(raw: unknown): number[] | null {
  if (typeof raw !== "string") return null;
  const parts = raw.split(",").map((x) => x.trim()).filter((x) => x.length > 0);
  if (parts.length > HOME_SHEET_MAX_EXERCISES * 2) return null;
  const ids = parts.map(Number);
  return ids.every((n) => Number.isInteger(n) && n > 0) ? ids : null;
}

/** **ملفُّ PDF حقّاً** — يبدأ بـ`%PDF-`؛ فلا يُرسَل للمريض ما ليس ورقة. */
export function isPdfBytes(buf: Uint8Array | null | undefined): boolean {
  if (!buf || buf.length < 5) return false;
  return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d;
}

/** خطواتُ البطاقة سطراً لكلّ خطوة — بلا ترقيمٍ مكتوبٍ في النصّ (الورقةُ ترقّمها). */
export function stepLines(steps: string | null | undefined): string[] {
  return String(steps ?? "").split("\n").map((l) => l.replace(/^\s*(?:[0-9٠-٩]+[.)\-–]|[•\-–])\s*/, "").trim()).filter(Boolean);
}

/** اسمُ الملفّ في تلغرام — حروفٌ لاتينية تسلم في كلّ هاتف. */
export function homeSheetFileName(patientCode: string | null | undefined, planId: number): string {
  const code = String(patientCode ?? "").replace(/[^A-Za-z0-9-]/g, "");
  return `home-exercises-${/[A-Za-z0-9]/.test(code) ? code : `plan-${planId}`}.pdf`;
}

/**
 * **نصُّ الرسالة مع الملفّ** — يكتبه الخادمُ من الخطّة لا من الصفحة: البرنامجُ ومرحلتُه وعددُ تمارينه، واسمُ المركز ومدينتُه (الترويسةُ نفسُها).
 * بلا اسمٍ ولا هاتف: الملفُّ نفسُه يحمل اسمَ المريض.
 */
export function homeSheetCaption(p: { centerName: string; city: string | null; phaseName: string | null; count: number }): string {
  const lines = [
    "برنامج تمارينك المنزلية",
    p.phaseName ? `${p.phaseName} — ${arCount(p.count)}` : arCount(p.count),
    [p.centerName, p.city].filter(Boolean).join(" — "),
    "أدِّ التمارين كما في الورقة، وتوقّف وراجعنا إن ظهر ما يُذكر تحت «توقّف إذا».",
    "نتمنى لكم الصحة والسلامة الدائمة",
  ];
  return lines.join("\n");
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const ar = (n: number) => String(n).replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);
function arCount(n: number): string {
  if (n === 1) return "تمرينٌ واحد";
  if (n === 2) return "تمرينان";
  return n >= 3 && n <= 10 ? `${ar(n)} تمارين` : `${ar(n)} تمريناً`;
}
