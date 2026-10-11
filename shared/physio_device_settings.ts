// **إعداداتُ الجهاز التي يملؤها المشرفُ قبل الاعتماد، والموعدُ الدوريّ للجهاز** (ترحيل ١٣١، §4.dn — ٢٠٢٦-١٠-١١).
//
// قرارُ المالك بعد ملاحظة سليم («لم تُدخَل الموجاتُ الصادمة في خشونة الركبة، وهي أهمُّ جهاز — ولدينا أحدثُ جهازٍ من BTL»):
//   • **تدخل الموجاتُ الصادمة البروتوكولاتِ المفصَّلةَ السبعة**، وما ثبت بالدليل يُكتب فيها (الموضعُ والجرعةُ في التجارب والموانع).
//   • **وإعداداتُ الجهاز نفسِه** (نوعُه وشدّتُه وتردّدُه ونبضاتُه) **خاناتٌ فارغة يملؤها سليم من جهازه** — «ونبّهه أن يملأها»:
//     **فلا يُعتمد بروتوكولٌ ولا يُعاد اعتمادُه وفيه جهازٌ مستعمَلٌ ناقصُ الإعدادات** (`protocolSettingsBlockers`).
//   • **والموجاتُ الصادمة مرّةً في الأسبوع** لا في كلّ جلسة: «الموعدُ الدوريّ» (`every_days` · `times`) يُخرج الجهازَ من التناوب ومن «كلّ جلسة»
//     فيُطلب حين يحين موعدُه وحده (`scheduleState`) — ولا قيدَ جديدَ على الموظّفين: الموعدُ يُسقط طلبَ السبب حين لم يحن، ولا يمنع التنفيذ.
import { DEVICE_PARAM_LABELS } from "./physio_exercises";
import { centreUseOf } from "./physio_protocols";

/** خانةٌ إلزامية: مفتاحٌ واحد، أو بدائلُ يكفي أحدُها (الشدّةُ بالبار للشعاعيّ أو بالمللي جول للمركّز). */
export interface RequiredSetting { keys: readonly string[]; ar: string; en: string }

/**
 * **الخاناتُ الإلزامية لكلّ جهاز** حين يكون مستعمَلاً في البروتوكول (أساسيّاً أو مساعداً) — بالرمز لا بالسطر، فكلُّ بروتوكولٍ فيه الجهازُ
 * تحكمه القاعدةُ نفسُها، والمزروعُ الذي يُفصَّل غداً كذلك. والجهازُ الذي «لا يُستخدم» لا يُطلب له شيء.
 */
export const DEVICE_REQUIRED_SETTINGS: Record<string, readonly RequiredSetting[]> = {
  shockwaves: [
    { keys: ["mode"], ar: "نوعُ الجهاز (شعاعيّ أو مركّز)", en: "Device type (radial or focused)" },
    { keys: ["pressureBar", "energyMj"], ar: "الشدّة (بالبار للشعاعيّ أو بالمللي جول/مم² للمركّز)", en: "Intensity (bar for radial, mJ/mm² for focused)" },
    { keys: ["frequencyHz"], ar: "التردّد", en: "Frequency" },
    { keys: ["impulses"], ar: "عددُ النبضات", en: "Impulses" },
  ],
};

const filled = (params: Record<string, string> | null | undefined, key: string) =>
  typeof params?.[key] === "string" && params[key].trim() !== "";

/** الخاناتُ الإلزامية الناقصة في سطر جهاز — فارغةٌ لجهازٍ بلا قاعدة أو لا يُستخدم. */
export function missingDeviceSettings(line: {
  code: string | null | undefined; params?: Record<string, string> | null; centreUse?: unknown; evidence?: unknown;
}): RequiredSetting[] {
  const rules = DEVICE_REQUIRED_SETTINGS[line.code ?? ""];
  if (!rules || centreUseOf(line) === "not_used") return [];
  return rules.filter((r) => !r.keys.some((k) => filled(line.params, k)));
}

export interface SettingsBlocker { code: string; nameAr: string; nameEn: string; missing: RequiredSetting[] }

/** **موانعُ الاعتماد**: كلُّ جهازٍ مستعمَلٍ ناقصِ الإعدادات، باسمه وخاناته. */
export function protocolSettingsBlockers(lines: readonly {
  code: string | null | undefined; nameAr?: string | null; nameEn?: string | null;
  params?: Record<string, string> | null; centreUse?: unknown; evidence?: unknown;
}[]): SettingsBlocker[] {
  return lines.map((l) => ({ code: String(l.code ?? ""), nameAr: l.nameAr ?? String(l.code ?? ""), nameEn: l.nameEn ?? String(l.code ?? ""), missing: missingDeviceSettings(l) }))
    .filter((b) => b.missing.length > 0);
}

/** رسالةُ الرفض — تُعرض للمشرف كما هي. */
export function settingsBlockedMessage(blockers: readonly SettingsBlocker[]): string {
  return "لا يُعتمد البروتوكولُ قبل إعدادات الجهاز — املأ من جهازكم: "
    + blockers.map((b) => `${b.nameAr}: ${b.missing.map((m) => m.ar).join("، ")}`).join(" · ");
}

/** تسميةُ الخانة الإلزامية في المحرّر — لتُعلَّم «مطلوبٌ قبل الاعتماد». */
export function requiredSettingKeys(code: string | null | undefined): Set<string> {
  return new Set((DEVICE_REQUIRED_SETTINGS[code ?? ""] ?? []).flatMap((r) => r.keys));
}

// ── الموعدُ الدوريّ ────────────────────────────────────────────────────────────────────────────────────────────
export const SCHEDULE_EVERY_DAYS_MAX = 60;
export const SCHEDULE_TIMES_MAX = 100;

export interface ScheduleLike { everyDays?: number | null; times?: number | null }

/** هل للبند موعدٌ دوريّ؟ — يخرج من «كلّ جلسة» ومن تناوب المساعدين. */
export const isScheduled = (l: ScheduleLike): boolean => Number.isInteger(l.everyDays) && Number(l.everyDays) > 0;

/** يطبّع الخانتين من الطلب: «كلّ … يوماً» ١–٦٠، و«… مرّات» ١–١٠٠ أو بلا حدّ — والمرّاتُ بلا تباعدٍ لا معنى لها. */
export function normalizeSchedule(everyDays: unknown, times: unknown): { everyDays: number | null; times: number | null } | string {
  const n = (v: unknown, hi: number): number | null | "bad" => {
    if (v === undefined || v === null || v === "") return null;
    const x = Number(v);
    return Number.isInteger(x) && x >= 1 && x <= hi ? x : "bad";
  };
  const e = n(everyDays, SCHEDULE_EVERY_DAYS_MAX);
  const t = n(times, SCHEDULE_TIMES_MAX);
  if (e === "bad") return `الموعدُ الدوريّ: كلّ ١–${SCHEDULE_EVERY_DAYS_MAX} يوماً`;
  if (t === "bad") return `عددُ المرّات ١–${SCHEDULE_TIMES_MAX}`;
  if (t !== null && e === null) return "عددُ المرّات يحتاج التباعد — «كلّ كم يوماً»";
  return { everyDays: e, times: t };
}

/** يومٌ بعد أيّام — «YYYY-MM-DD» بلا منطقةٍ زمنية. */
export function addDaysYmd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface ScheduleState {
  /** يُطلب في هذه الجلسة. */
  due: boolean;
  /** نُفّذ كم مرّة قبلها. */
  done: number;
  /** أقربُ يومٍ يحين فيه إن لم يحن. */
  next: string | null;
  /** اكتمل عددُه. */
  complete: boolean;
}

/**
 * **هل يحين موعدُ البند في جلسةٍ بتاريخها؟** — `doneDates` أيّامُ تنفيذه في جلسات الخطّة غير الملغاة قبل هذه الجلسة.
 * أوّلَ مرّة يحين فوراً؛ ثمّ بعد التباعد من آخر تنفيذ؛ ويتوقّف حين يكتمل عددُه.
 */
export function scheduleState(l: ScheduleLike, doneDates: readonly string[], sessionDate: string): ScheduleState {
  const done = doneDates.length;
  if (!isScheduled(l)) return { due: true, done, next: null, complete: false };
  if (l.times != null && done >= l.times) return { due: false, done, next: null, complete: true };
  const last = doneDates.slice().sort().pop();
  if (!last) return { due: true, done, next: null, complete: false };
  const next = addDaysYmd(last, Number(l.everyDays));
  return { due: sessionDate >= next, done, next: sessionDate >= next ? null : next, complete: false };
}

/** «كلّ ٧ أيّام · ٤ مرّات» — للعرض. */
export function scheduleLabel(l: ScheduleLike, lang: "ar" | "en" = "ar"): string {
  if (!isScheduled(l)) return "";
  const every = Number(l.everyDays);
  if (lang === "en") return `Every ${every} day${every === 1 ? "" : "s"}${l.times ? ` · ${l.times} time${l.times === 1 ? "" : "s"}` : ""}`;
  return `كلّ ${every === 7 ? "أسبوع" : `${every} أيّام`}${l.times ? ` · ${l.times} مرّات` : ""}`;
}

/** ملاحظةُ البند الدوريّ الذي لم يحن موعدُه — تُكتب مع الجلسة بدل «سبب عدم التنفيذ». */
export function scheduleOffNote(s: ScheduleState): string {
  if (s.complete) return `موعدٌ دوريّ — اكتمل عددُه (${s.done})`;
  return `موعدٌ دوريّ — لم يحن${s.next ? ` (التالي ${s.next})` : ""}`;
}

/** تسميةُ الخانة للعرض: «النمط» عامّة — وللموجات الصادمة نوعُ الجهاز. */
export function settingLabel(code: string | null | undefined, key: string, lang: "ar" | "en" = "ar"): string {
  const rule = (DEVICE_REQUIRED_SETTINGS[code ?? ""] ?? []).find((r) => r.keys.length === 1 && r.keys[0] === key);
  if (rule) return lang === "en" ? rule.en : rule.ar;
  const l = (DEVICE_PARAM_LABELS as Record<string, { ar: string; en: string }>)[key];
  return l ? (lang === "en" ? l.en : l.ar) : key;
}
