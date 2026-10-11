// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp — طلبُ المالك ٢٠٢٦-١٠-١١).
//
// «حين يدخل أيُّ موظّفٍ تظهر له عبارةٌ حسب الوقت، لا تختفي إلّا أن يضغط «حسناً»: صباح الخير سليم، دكتور ياسر يتمنّى لك يوم عمل سعيد…»
// وقراراتُه بعد العرض:
//   • **مرّةً واحدة كلَّ يوم** بتوقيت بغداد — على الحساب في الخادم لا على الجهاز (`system_users.last_greeted_on`)، فلا تتكرّر بين الهاتف والحاسوب.
//   • **«صباح الخير» من الفجر حتى الثانية عشرة ظهراً، و«مساء الخير» بعدها.**
//   • **عشرُ عباراتٍ تتناوب تدعو للفرح**، **وكلَّ شهرٍ يُنبَّه المالكُ ليغيّرها** — وهو يعدّلها من لوحة المسؤول.
//   • **ولا تظهر لحساب المالك نفسِه** (المسؤول) — ويظهر له بدلَها تذكيرُ التغيير حين يحين.
// والعباراتُ تصلح للموظّف والموظّفة معاً: لا فعلَ ولا صفةَ تتغيّر بجنس المخاطَب.

/** **العباراتُ الأولى** — تُكتب في القاعدة بالترحيل، ثمّ يغيّرها المالك. الأولى عبارتُه هو. */
export const DEFAULT_GREETINGS: readonly string[] = [
  "دكتور ياسر يتمنّى لك يومَ عملٍ سعيداً مليئاً بالتفاؤل والنجاح.",
  "دكتور ياسر يقول لك: ابتسامتُك أوّلُ علاجٍ يلقاه مراجعونا — شكراً لوجودك معنا.",
  "دكتور ياسر يتمنّى لك أوقاتاً طيّبة، فكلُّ خطوةٍ يخطوها مريضٌ بفضل عملك نجاحٌ لك.",
  "دكتور ياسر يشكرك على كلّ جهدٍ منك — فبعطائكم يعود المراجعون إلى الحركة والأمل.",
  "دكتور ياسر يتمنّى لك أوقاتاً جميلة، فالفرحُ الذي يزرعه عملُك في قلوب المرضى يعود إليك أضعافاً.",
  "دكتور ياسر يرسل لك تحيّةً من القلب: فريقُنا أقوى بك، وأجملُ بوجودك.",
  "دكتور ياسر يتمنّى لك عملاً مباركاً وراحةَ بال — وكلُّ ابتسامةِ مريضٍ اليوم شهادةٌ على عطائك.",
  "دكتور ياسر يذكّرك أنّ ما نقدّمه يعيد الحركةَ والأملَ إلى الناس — فلنجعل اليومَ يوماً مميّزاً.",
  "دكتور ياسر يتمنّى لك طاقةً إيجابية وابتسامةً لا تفارقك، ونجاحاً يكبر مع كلّ مراجع.",
  "دكتور ياسر فخورٌ بك وبكلّ ما يقدّمه عملُك — أسعد اللهُ أوقاتَك بالخير والرضا.",
];

export const GREETINGS_MIN = 1;
export const GREETINGS_MAX = 20;
export const GREETING_MAX_CHARS = 300;
/** كلَّ كم يوماً يُنبَّه المالكُ ليغيّر العبارات. */
export const GREETING_REMIND_DAYS = 30;

/** المحفوظُ في `system_settings` بمفتاح `staff_greeting`. `keptAt`: «أبقِها شهراً آخر» — يبدأ منه العدُّ كالتغيير. */
export interface GreetingConfig { phrases: string[]; updatedAt: string; updatedByName: string | null; keptAt?: string | null }
export const GREETING_SETTING_KEY = "staff_greeting";
/** حجزُ تذكير تلغرام لدورةٍ واحدة عبر نسخ الخادم — قيمتُه بدايةُ الدورة التي ذُكِّر بها. */
export const GREETING_REMINDER_KEY = "staff_greeting_reminded_cycle";

/** ساعةُ بغداد (UTC+3 بلا توقيتٍ صيفيّ). */
export const baghdadHour = (now: Date = new Date()): number => (now.getUTCHours() + 3) % 24;

/** **«صباح الخير» من الخامسة حتى قبل الثانية عشرة، و«مساء الخير» ما سواها** (ومنه ما بعد منتصف الليل). */
export function salutationAt(now: Date = new Date()): "صباح الخير" | "مساء الخير" {
  const h = baghdadHour(now);
  return h >= 5 && h < 12 ? "صباح الخير" : "مساء الخير";
}

/** رقمُ اليوم من تاريخٍ `YYYY-MM-DD`. */
const dayNumber = (ymd: string): number => Math.floor(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86_400_000);

/**
 * **عبارةُ اليوم لهذا الموظّف** — تتناوب يوماً بعد يوم، ويبدأ كلُّ موظّفٍ من موضعٍ غيرِ زميله (`userId`)، فيمرّ كلٌّ منهم على العبارات كلّها.
 */
export function phraseFor(phrases: readonly string[], userId: number, todayYmd: string): string {
  const list = phrases.length ? phrases : DEFAULT_GREETINGS;
  const i = ((dayNumber(todayYmd) + Math.abs(Math.trunc(userId))) % list.length + list.length) % list.length;
  return list[i];
}

/** النصُّ كاملاً: «صباح الخير سليم، دكتور ياسر يتمنّى لك…». */
export function greetingText(salutation: string, name: string | null | undefined, phrase: string): string {
  const who = (name ?? "").trim();
  return `${salutation}${who ? ` ${who}` : ""}، ${phrase}`;
}

/** يطبّع العباراتِ من المحرّر: بلا الفارغ والمكرّر، ١–٢٠، وكلٌّ حتى ٣٠٠ حرف. ⟵ القائمةُ أو رسالةُ الخطأ. */
export function parseGreetings(raw: unknown): string[] | string {
  if (!Array.isArray(raw)) return "العباراتُ قائمة";
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v !== "string") return "كلُّ عبارةٍ نصّ";
    const t = v.replace(/\s+/g, " ").trim();
    if (!t) continue;
    if (t.length > GREETING_MAX_CHARS) return `العبارةُ ${GREETING_MAX_CHARS} حرفاً على الأكثر`;
    if (!out.includes(t)) out.push(t);
  }
  if (out.length < GREETINGS_MIN) return "اكتب عبارةً واحدة على الأقلّ";
  if (out.length > GREETINGS_MAX) return `${GREETINGS_MAX} عبارةً على الأكثر`;
  return out;
}

/** **بدايةُ دورة التذكير** — آخرُ تغييرٍ أو «أبقِها» أيّهما أحدث. */
export function greetingCycleStart(c: Pick<GreetingConfig, "updatedAt" | "keptAt">): string {
  return c.keptAt && c.keptAt > c.updatedAt ? c.keptAt : c.updatedAt;
}

/** كم يوماً مضى على بداية الدورة، وهل حان التذكير. */
export function greetingAge(c: Pick<GreetingConfig, "updatedAt" | "keptAt">, now: Date = new Date()): { days: number; due: boolean } {
  const days = Math.floor((now.getTime() - new Date(greetingCycleStart(c)).getTime()) / 86_400_000);
  return { days: Math.max(0, days), due: days >= GREETING_REMIND_DAYS };
}

/** يقرأ المحفوظ — وما لم يُحفَظ أو تلف يُرجع العباراتِ الأولى بيومٍ معطى. */
export function readGreetingConfig(raw: string | null | undefined, fallbackDate: string): GreetingConfig {
  try {
    const v = raw ? JSON.parse(raw) : null;
    const phrases = Array.isArray(v?.phrases) ? v.phrases.filter((p: unknown) => typeof p === "string" && p.trim()) : [];
    if (phrases.length && typeof v?.updatedAt === "string") {
      return { phrases, updatedAt: v.updatedAt, updatedByName: v.updatedByName ?? null, keptAt: typeof v.keptAt === "string" ? v.keptAt : null };
    }
  } catch { /* تالف ⟵ الأولى */ }
  return { phrases: [...DEFAULT_GREETINGS], updatedAt: fallbackDate, updatedByName: null, keptAt: null };
}

/** رسالةُ التذكير الشهريّ للمالك في تلغرام. */
export function greetingReminderText(days: number): string {
  return `🌤️ تذكيرٌ شهريّ: مضى ${days} يوماً على عبارات الترحيب اليومية للموظّفين.\n`
    + "غيّرها من لوحة المسؤول ⟵ «تنبيهات الموظفين» ⟵ «عبارات الترحيب اليومية» — أو اضغط هناك «أبقِها شهراً آخر».";
}
