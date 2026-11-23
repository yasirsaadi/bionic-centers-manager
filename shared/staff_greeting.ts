// **تحيّةُ الموظّف اليومية** (ترحيل ١٣٣، §4.dp — طلبُ المالك ٢٠٢٦-١٠-١١) — **وإنجازُ الأمس** (§4.gw — قرارُ المالك ٢٠٢٦-١١-٢٣).
//
// «حين يدخل أيُّ موظّفٍ تظهر له عبارةٌ حسب الوقت، لا تختفي إلّا أن يضغط «حسناً»: صباح الخير سليم، دكتور ياسر يتمنّى لك يوم عمل سعيد…»
// وقراراتُه بعد العرض:
//   • **مرّةً واحدة كلَّ يوم** بتوقيت بغداد — على الحساب في الخادم لا على الجهاز (`system_users.last_greeted_on`)، فلا تتكرّر بين الهاتف والحاسوب.
//   • **«صباح الخير» من الفجر حتى الثانية عشرة ظهراً، و«مساء الخير» بعدها.**
//   • **ولا تظهر لحساب المالك نفسِه** (المسؤول).
//   • **ومن ٢٠٢٦-١١-٢٣ (§4.gw)**: بدلَ العبارة العامّة تقول التحيّةُ لكلّ موظّفٍ **ما عمله هو أمس** من سجلّات النظام، ثمّ شكرُ دكتور ياسر —
//     أرقامُه وحده بلا مقارنةٍ ولا ترتيب، **ولا صفرَ يُعرض**: مَن لا عملَ منسوباً إليه أمس (أو كان أمسِ عطلةً) يرى عبارةً من العبارات المتناوبة كما كان.
//     والتذكيرُ الشهريّ بتغيير العبارات تقاعد (العباراتُ صارت احتياطاً).
// والنصوصُ تصلح للموظّف والموظّفة معاً: لا فعلَ ولا صفةَ تتغيّر بجنس المخاطَب — أسماءٌ لا أفعال («تسجيل ٩ مرضى»).

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

/**
 * المحفوظُ في `system_settings` بمفتاح `staff_greeting`. `note`: **سطرُ المالك** (§4.gw) — يظهر للجميع تحت إنجاز الأمس، وفارغُه لا شيء.
 * (`keptAt` من «أبقِها شهراً آخر» القديمة قد يبقى في الصفّ — لا يُقرأ بعد تقاعد التذكير.)
 */
export interface GreetingConfig { phrases: string[]; updatedAt: string; updatedByName: string | null; note?: string | null }
export const GREETING_SETTING_KEY = "staff_greeting";
/** أقصى طول سطر المالك. */
export const GREETING_NOTE_MAX_CHARS = 200;

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

/** يقرأ المحفوظ — وما لم يُحفَظ أو تلف يُرجع العباراتِ الأولى بيومٍ معطى. */
export function readGreetingConfig(raw: string | null | undefined, fallbackDate: string): GreetingConfig {
  try {
    const v = raw ? JSON.parse(raw) : null;
    const phrases = Array.isArray(v?.phrases) ? v.phrases.filter((p: unknown) => typeof p === "string" && p.trim()) : [];
    if (phrases.length && typeof v?.updatedAt === "string") {
      return { phrases, updatedAt: v.updatedAt, updatedByName: v.updatedByName ?? null, note: typeof v.note === "string" && v.note.trim() ? v.note.trim() : null };
    }
  } catch { /* تالف ⟵ الأولى */ }
  return { phrases: [...DEFAULT_GREETINGS], updatedAt: fallbackDate, updatedByName: null, note: null };
}


/** يطبّع سطرَ المالك (§4.gw): سطرٌ واحد بلا أسطرٍ جديدة ولا مسافاتٍ مكرّرة، والفارغُ ⟵ `null` (لا شيء يظهر). ⟵ السطرُ أو رسالةُ الخطأ. */
export function parseGreetingNote(raw: unknown): { note: string | null } | string {
  if (raw === null || raw === undefined) return { note: null };
  if (typeof raw !== "string") return "السطرُ نصّ";
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t) return { note: null };
  if (t.length > GREETING_NOTE_MAX_CHARS) return `السطرُ ${GREETING_NOTE_MAX_CHARS} حرفاً على الأكثر`;
  return { note: t };
}

// ════════════════════════════════════════════════════════════════════════════
// **إنجازُ الأمس** (§4.gw — قرارُ المالك ٢٠٢٦-١١-٢٣)
// «بدلَ العبارة العامّة، تقول التحيّةُ لكلّ موظّفٍ ما عمله أمس، ثمّ شكرُ دكتور ياسر».
//   • أمسِ = يومُ بغداد التقويميّ قبل اليوم (٠٠:٠٠ +٠٣ إلى ٠٠:٠٠ +٠٣).
//   • أرقامُ صاحب الحساب وحده، بلا مقارنةٍ ولا ترتيب، ولا صفرَ يُعرض: لا إنجازَ ⟵ العبارةُ المتناوبة.
//   • الأبوابُ بأدوار الحساب (`rolesOf` — اتّحادُها لمن له أكثرُ من دور)، الأعلى أوّلاً، وأربعةُ بنودٍ على الأكثر.
// ════════════════════════════════════════════════════════════════════════════

/** فئاتُ الجمع العربيّ (كـCLDR): ١ · ٢ · ٣–١٠ · ١١–٩٩ · ما سواها (١٠٠، ١٠١، ١٠٢…) — بآخر رقمين. */
export type ArabicPluralCategory = "one" | "two" | "few" | "many" | "other";
export function arabicPluralCategory(n: number): ArabicPluralCategory {
  const k = Math.abs(Math.trunc(n));
  if (k === 1) return "one";
  if (k === 2) return "two";
  const r = k % 100;
  if (r >= 3 && r <= 10) return "few";
  if (r >= 11 && r <= 99) return "many";
  return "other";
}

/**
 * صيغُ المعدود: `one` و`two` كاملتان بلا رقم («مريض واحد» · «مريضين»)، والبقيّةُ بعد الرقم («٣ مرضى» · «١١ مريضاً» · «١٠٠ مريض»).
 * كلُّ صيغةٍ مكتوبةٌ كاملةً لأنّ الإضافةَ والصفةَ تتغيّران بالعدد («جلستَي علاج طبيعي» · «١١ جلسةَ علاج طبيعي»).
 */
export interface CountForms { one: string; two: string; few: string; many: string; other: string }

/** الرقمُ كما يُكتب في التطبيق (أرقامٌ غربيّة بفواصل الآلاف — كالمبالغ). */
export const formatCount = (n: number): string => Math.trunc(n).toLocaleString("en-US");
/** المبلغُ بالدينار كما يُكتب في التطبيق. */
export const formatIqd = (n: number): string => `${Math.round(n).toLocaleString("en-US")} د.ع`;

/** «مريض واحد» · «مريضين» · «3 مرضى» · «11 مريضاً» · «100 مريض». */
export function countPhrase(n: number, f: CountForms): string {
  const c = arabicPluralCategory(n);
  if (c === "one") return f.one;
  if (c === "two") return f.two;
  return `${formatCount(n)} ${f[c]}`;
}

/** ما يُعدّ لكلّ موظّفٍ أمس — كلُّه من أعمدةٍ تنسب الفعلَ إلى صاحبه (§4.gw يذكر مصدرَ كلٍّ). */
export interface YesterdayStats {
  /** مرضى سجّلهم (سطرُ تدقيق التسجيل) وما زالوا خارج السلّة. */
  registrations: number;
  /** دفعاتٌ موجبةٌ استلمها (سطرُ تدقيق الدفعة) وما زالت قائمة، ومجموعُها. */
  payments: number;
  paymentsSum: number;
  /** زياراتٌ سجّلها — بلا زيارات جلسات العلاج الطبيعي (تُعدّ جلساتٍ لمنفّذها). */
  visits: number;
  /** أجهزةٌ سلّمها الخبير، وأوامرُ صيانةٍ أنجزها، وخطواتُ تصنيعٍ تقدّم بها. */
  deliveries: number;
  maintenanceDone: number;
  stageMoves: number;
  /** معايناتٌ وقّعها ولم تُلغَ: الأطرافُ والمساند، والعلاجُ الطبيعي. */
  medicalExams: number;
  physioExams: number;
  /** جلساتُ علاجٍ طبيعيّ أنهاها ولم تُلغَ. */
  physioSessions: number;
}
export type AchievementKey = Exclude<keyof YesterdayStats, "paymentsSum">;
export const EMPTY_YESTERDAY_STATS: YesterdayStats = {
  registrations: 0, payments: 0, paymentsSum: 0, visits: 0, deliveries: 0, maintenanceDone: 0, stageMoves: 0,
  medicalExams: 0, physioExams: 0, physioSessions: 0,
};

/** أبوابُ كلّ دور بترتيبها — الأهمُّ أوّلاً. */
const FRONT_DESK: AchievementKey[] = ["registrations", "payments", "visits"];
const ROLE_ACHIEVEMENTS: Record<string, AchievementKey[]> = {
  branch_manager: FRONT_DESK,
  accountant: FRONT_DESK,
  reception: FRONT_DESK,
  doctor: ["medicalExams", "physioExams"],
  physio_specialist: ["physioExams", "physioSessions"],
  prosthetics_expert: ["deliveries", "maintenanceDone", "stageMoves"],
  therapist: ["physioSessions"],
  physio_technician: ["physioSessions"],
  physio_trainer: ["physioSessions"],
};
/** المشرفُ العامّ للعلاج الطبيعي بعلَمه (سليم مديرُ فرعٍ وهو الأخصائيُّ الأعلى — §4.cg). */
const PHYSIO_SUPERVISOR_ACHIEVEMENTS: AchievementKey[] = ["physioExams", "physioSessions"];
export const MAX_ACHIEVEMENTS = 4;

/** **ما يُعدّ لهذا الحساب** — اتّحادُ أبواب أدواره بترتيبها (الأعلى أوّلاً)، ثمّ علَمُ الإشراف. والمسؤولُ لا شيء (لا تحيّةَ له). */
export function achievementKeysFor(roles: readonly string[], canSupervisePhysio = false): AchievementKey[] {
  if (roles.includes("admin")) return [];
  const out: AchievementKey[] = [];
  const add = (ks: readonly AchievementKey[]) => { for (const k of ks) if (!out.includes(k)) out.push(k); };
  for (const r of roles) add(ROLE_ACHIEVEMENTS[r] ?? []);
  if (canSupervisePhysio) add(PHYSIO_SUPERVISOR_ACHIEVEMENTS);
  return out;
}

const FORMS: Record<AchievementKey, { verb: string; forms: CountForms }> = {
  registrations: { verb: "تسجيل", forms: { one: "مريض واحد", two: "مريضين", few: "مرضى", many: "مريضاً", other: "مريض" } },
  payments: { verb: "استلام", forms: { one: "دفعة واحدة", two: "دفعتين", few: "دفعات", many: "دفعةً", other: "دفعة" } },
  visits: { verb: "تسجيل", forms: { one: "زيارة واحدة", two: "زيارتين", few: "زيارات", many: "زيارةً", other: "زيارة" } },
  deliveries: { verb: "تسليم", forms: { one: "جهاز واحد", two: "جهازين", few: "أجهزة", many: "جهازاً", other: "جهاز" } },
  maintenanceDone: { verb: "إنجاز", forms: { one: "أمر صيانة واحد", two: "أمرَي صيانة", few: "أوامر صيانة", many: "أمرَ صيانة", other: "أمر صيانة" } },
  stageMoves: { verb: "إنجاز", forms: { one: "خطوة واحدة في التصنيع", two: "خطوتين في التصنيع", few: "خطوات في التصنيع", many: "خطوةً في التصنيع", other: "خطوة في التصنيع" } },
  medicalExams: { verb: "توقيع", forms: { one: "معاينة طبية واحدة", two: "معاينتين طبيتين", few: "معاينات طبية", many: "معاينةً طبية", other: "معاينة طبية" } },
  physioExams: { verb: "توقيع", forms: { one: "معاينة علاج طبيعي واحدة", two: "معاينتَي علاج طبيعي", few: "معاينات علاج طبيعي", many: "معاينةَ علاج طبيعي", other: "معاينة علاج طبيعي" } },
  physioSessions: { verb: "إكمال", forms: { one: "جلسة علاج طبيعي واحدة", two: "جلستَي علاج طبيعي", few: "جلسات علاج طبيعي", many: "جلسةَ علاج طبيعي", other: "جلسة علاج طبيعي" } },
};

/** سطرُ البند: «تسجيل 9 مرضى» · «استلام 14 دفعة بمجموع 1,250,000 د.ع». */
export function achievementLine(key: AchievementKey, s: YesterdayStats): string {
  const f = FORMS[key];
  const base = `${f.verb} ${countPhrase(s[key], f.forms)}`;
  return key === "payments" && s.paymentsSum > 0 ? `${base} بمجموع ${formatIqd(s.paymentsSum)}` : base;
}

/** **بنودُ إنجاز الأمس** — أبوابُ الحساب بترتيبها، **بلا صفر**، وأربعةٌ على الأكثر. فارغةٌ ⟵ العبارةُ المتناوبة. */
export function achievementLines(keys: readonly AchievementKey[], s: YesterdayStats): string[] {
  return keys.filter((k) => s[k] > 0).slice(0, MAX_ACHIEVEMENTS).map((k) => achievementLine(k, s));
}

export const ACHIEVEMENTS_INTRO = "إنجازك أمس:";
export const ACHIEVEMENTS_CLOSING = "دكتور ياسر يشكرك ويتمنّى لك يوماً موفّقاً.";

/** النصُّ كاملاً: «صباح الخير سليم، إنجازك أمس: تسجيل 9 مرضى · استلام 14 دفعة — دكتور ياسر يشكرك ويتمنّى لك يوماً موفّقاً.» */
export function achievementGreetingText(salutation: string, name: string | null | undefined, lines: readonly string[]): string {
  return greetingText(salutation, name, `${ACHIEVEMENTS_INTRO} ${lines.join(" · ")} — ${ACHIEVEMENTS_CLOSING}`);
}

/** اليومُ السابق لتاريخٍ `YYYY-MM-DD`. */
export function previousYmd(ymd: string): string {
  return new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) - 86_400_000).toISOString().slice(0, 10);
}

/** **حدّا يوم بغداد** لحظتين مطلقتين: [٠٠:٠٠ +٠٣ ، ٠٠:٠٠ +٠٣ من اليوم التالي). */
export function baghdadDayBounds(ymd: string): { start: Date; end: Date } {
  const start = new Date(`${ymd}T00:00:00+03:00`);
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

/** جذرُ مفتاح استعلام التحيّة في الواجهة (`["/api/greeting", userId, day]`). */
export const GREETING_QUERY_ROOT = "/api/greeting";

/**
 * **هل تُعيد إشارةُ التحديث العامّة (كتابةُ أيّ أحد) جلبَ هذا الاستعلام؟** (مراجعة — §4.gw) — نعم لكلّ شيءٍ **إلّا التحيّة** ما لم تكن في خطأ:
 * جلبُها يعدّ إنجازَ الأمس في الخادم، والنافذةُ المفتوحة لا تتغيّر بكتابة زميل. والخطأُ يُعاد مع أوّل إشارة كما كان (§4.dp).
 * وإشارةُ صاحبها (`onGreeting` — «حسناً» من جهازه الآخر) خارجَ هذه القاعدة.
 */
export function refreshesOnBroadcast(queryKey: readonly unknown[], status: string): boolean {
  return queryKey[0] !== GREETING_QUERY_ROOT || status === "error";
}

/** ما يحمله جوابُ التحيّة للعرض (`GET /api/greeting`). */
export interface GreetingPayload {
  text: string; salutation?: string; achievements?: readonly string[]; intro?: string; closing?: string; note?: string | null;
}
export type GreetingBody =
  | { mode: "achievements"; salutation: string; intro: string; items: readonly string[]; closing: string; label: string; note: string | null }
  | { mode: "phrase"; text: string; note: string | null };

/**
 * **ما تعرضه النافذة** (`DailyGreeting.tsx`): بنودُ الأمس ⟵ التحيّةُ ثمّ «إنجازك أمس:» ثمّ البنودُ ثمّ الشكر (و`text` كاملاً للقارئ الآليّ وحده — لا يُعرض فتتكرّر التحيّة)؛
 * وبلا بنود ⟵ `text` العبارةُ المتناوبة. وسطرُ المالك في الحالين، والفارغُ لا شيء.
 */
export function greetingBody(g: GreetingPayload): GreetingBody {
  const note = (g.note ?? "").trim() ? (g.note as string) : null;
  const items = g.achievements ?? [];
  if (!items.length) return { mode: "phrase", text: g.text, note };
  return { mode: "achievements", salutation: g.salutation ?? "", intro: g.intro ?? ACHIEVEMENTS_INTRO, items,
    closing: g.closing ?? ACHIEVEMENTS_CLOSING, label: g.text, note };
}
