//  **الساعةُ والطقسُ في رأس القائمة** (§4.es — طلبُ المالك ٢٠٢٦-١٠-١٩، والبديلُ «ج»: شريحتان).
//
//  قواعدُ محضة يقرؤها الخادمُ والشاشةُ معاً، بلا شبكةٍ ولا قاعدة:
//    • مدينةُ الفرع **من اسمه** (`cityForBranchName`) — لا من رقمه، فالفرعُ الجديد أو المُعاد ترقيمُه لا يأخذ طقسَ غيره،
//      وما لا تُعرف مدينتُه **لا طقسَ له** (الشريحةُ تختفي) بدل أن يُخمَّن.
//    • حالةُ الطقس بالعربية من رمز الأرصاد النرويجية (`conditionOf`).
//    • حرارةُ **الآن** من سلسلة الساعات المحفوظة (`currentFromSeries`) — تُحسب عند كلّ طلب لا عند الجلب، فتتبدّل مع الوقت.
//    • الساعةُ بنظام ١٢ ساعة بتوقيت بغداد (`formatClock12`) — **بلا Intl**: العراقُ بلا توقيتٍ صيفيّ منذ ٢٠٠٨ فالفرقُ +٣ ثابت،
//      ومتصفّحٌ ناقصُ بيانات اللغة كان سيكتب «AM» بدل «ص».
import { normalizeWithMap } from "./protocol_search";

export interface WeatherCity {
  key: string;
  /** الاسمُ الظاهر في الشريحة. */
  name: string;
  nameEn: string;
  /** أربعُ خاناتٍ عشرية حدٌّ أقصى — شرطُ الأرصاد النرويجية (الخامسةُ تُرَدّ ٤٠٣). */
  lat: number;
  lon: number;
  /** كلماتٌ يُعرف بها الفرعُ من اسمه. */
  match: string[];
}

export const WEATHER_CITIES: WeatherCity[] = [
  { key: "baghdad", name: "بغداد", nameEn: "Baghdad", lat: 33.3152, lon: 44.3661, match: ["بغداد"] },
  { key: "karbala", name: "كربلاء", nameEn: "Karbala", lat: 32.616, lon: 44.0249, match: ["كربلاء", "كربلا"] },
  { key: "nasiriyah", name: "الناصرية", nameEn: "Nasiriyah", lat: 31.0439, lon: 46.2573, match: ["ذي قار", "ذيقار", "الناصرية", "ناصرية"] },
  { key: "mosul", name: "الموصل", nameEn: "Mosul", lat: 36.335, lon: 43.1189, match: ["الموصل", "موصل", "نينوى"] },
  { key: "kirkuk", name: "كركوك", nameEn: "Kirkuk", lat: 35.4681, lon: 44.3922, match: ["كركوك"] },
];

/** مدينةُ «كل الفروع» للمسؤول العامّ — المركزُ الرئيس. */
export const HEAD_OFFICE_CITY = WEATHER_CITIES[0];

const norm = (s: string) => normalizeWithMap(s).norm;

export function cityForBranchName(name: string | null | undefined): WeatherCity | null {
  const n = norm(String(name ?? ""));
  if (!n) return null;
  return WEATHER_CITIES.find((c) => c.match.some((m) => n.includes(norm(m)))) ?? null;
}

export type WeatherKind =
  | "clear" | "fair" | "partly" | "cloudy" | "fog"
  | "drizzle" | "rain" | "heavy_rain" | "thunder" | "sleet" | "snow";

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: "صافٍ",
  fair: "صحو",
  partly: "غائم جزئياً",
  cloudy: "غائم",
  fog: "ضباب",
  drizzle: "مطر خفيف",
  rain: "ماطر",
  heavy_rain: "مطر غزير",
  thunder: "عاصفة رعدية",
  sleet: "مطر وثلج",
  snow: "ثلج",
};

/** للواجهة الإنكليزية (زرُّ اللغة). */
export const WEATHER_LABELS_EN: Record<WeatherKind, string> = {
  clear: "Clear",
  fair: "Fair",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  drizzle: "Light rain",
  rain: "Rain",
  heavy_rain: "Heavy rain",
  thunder: "Thunderstorm",
  sleet: "Sleet",
  snow: "Snow",
};

export const weatherLabel = (kind: WeatherKind | null | undefined, en = false): string | null =>
  kind ? (en ? WEATHER_LABELS_EN : WEATHER_LABELS)[kind] ?? null : null;

export interface WeatherCondition { kind: WeatherKind; night: boolean; label: string }

/**
 * رمزُ الأرصاد النرويجية (`partlycloudy_day`، `lightrainshowersandthunder_night`، …) ⟵ حالةٌ عربية.
 * الرعدُ يغلب كلَّ ما معه، ثمّ الثلجُ والمطرُ بشدّتهما. ورمزٌ لا يُعرف ⟵ `null` (تظهر الحرارةُ وحدها).
 */
export function conditionOf(symbol: string | null | undefined): WeatherCondition | null {
  const raw = String(symbol ?? "").trim().toLowerCase();
  if (!raw) return null;
  const night = raw.endsWith("_night");
  const base = raw.replace(/_(day|night|polartwilight)$/, "");
  let kind: WeatherKind | null = null;
  if (base.includes("thunder")) kind = "thunder";
  else if (base.includes("sleet")) kind = "sleet";
  else if (base.includes("snow")) kind = "snow";
  else if (base.includes("rain")) kind = base.startsWith("heavy") ? "heavy_rain" : base.startsWith("light") ? "drizzle" : "rain";
  else if (base === "fog") kind = "fog";
  else if (base === "cloudy") kind = "cloudy";
  else if (base === "partlycloudy") kind = "partly";
  else if (base === "fair") kind = "fair";
  else if (base === "clearsky") kind = "clear";
  if (!kind) return null;
  return { kind, night, label: WEATHER_LABELS[kind] };
}

/** ساعةٌ من سلسلة التوقّع: لحظتُها (ميلي ثانية)، وحرارتُها، ورمزُ الساعة التالية. */
export interface WeatherPoint { at: number; temp: number; symbol: string | null }

/** أبعدُ ما تُقرأ منه السلسلةُ بعد آخر نقطة — بعده لا «الآن» فيها. */
export const SERIES_GRACE_MS = 60 * 60 * 1000;

/**
 * **حرارةُ الآن ورمزُها** من السلسلة: الحرارةُ خطّيةٌ بين الساعتين المحيطتين بالآن (فتتبدّل خلال الساعة لا قفزةً على رأسها)،
 * والرمزُ رمزُ الساعة التي فيها الآن. وقبل أوّل نقطة أو بعد آخرها بأكثر من ساعة ⟵ `null`.
 */
export function currentFromSeries(series: WeatherPoint[], nowMs: number): { temp: number; symbol: string | null; at: number } | null {
  const pts = series.filter((p) => Number.isFinite(p.at) && Number.isFinite(p.temp)).sort((a, b) => a.at - b.at);
  if (!pts.length) return null;
  if (nowMs < pts[0].at - SERIES_GRACE_MS || nowMs > pts[pts.length - 1].at + SERIES_GRACE_MS) return null;
  let i = 0;
  while (i + 1 < pts.length && pts[i + 1].at <= nowMs) i++;
  const a = pts[i];
  const b = pts[i + 1];
  const temp = b && nowMs > a.at ? a.temp + ((b.temp - a.temp) * (nowMs - a.at)) / (b.at - a.at) : a.temp;
  return { temp, symbol: a.symbol, at: a.at };
}

const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
export const toArabicDigits = (s: string) => s.replace(/[0-9]/g, (d) => AR_DIGITS[Number(d)]);

/** فرقُ بغداد عن التوقيت العالميّ — ثابتٌ بلا توقيتٍ صيفيّ منذ ٢٠٠٨. */
export const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000;

/** «١٠:٤٥ ص» / «٩:٠٥ م» — بتوقيت بغداد أينما كان الجهاز، والساعةُ بلا صفرٍ قبلها والدقيقةُ بخانتين. والإنكليزية «10:45 AM». */
export function formatClock12(ms: number, en = false): string {
  const d = new Date(ms + BAGHDAD_OFFSET_MS);
  const h24 = d.getUTCHours();
  const h = h24 % 12 || 12;
  const m = String(d.getUTCMinutes()).padStart(2, "0");
  if (en) return `${h}:${m} ${h24 < 12 ? "AM" : "PM"}`;
  return `${toArabicDigits(`${h}:${m}`)} ${h24 < 12 ? "ص" : "م"}`;
}

/** «٣٢°» / «-٢°» — الحرارةُ مقرَّبةً، و«-٠» صفر. */
export function formatTemp(temp: number, en = false): string {
  const r = Math.round(temp);
  const n = String(r === 0 ? 0 : r);
  return `${en ? n : toArabicDigits(n)}°`;
}

/** ما يُرجعه `GET /api/weather` — أو `{ weather: null }` إن لم يُعرف. */
export interface WeatherNow {
  cityKey: string;
  city: string;
  tempC: number;
  kind: WeatherKind | null;
  night: boolean;
  label: string | null;
  /** لحظةُ نشر الأرصاد لهذا التوقّع (`meta.updated_at`). */
  updatedAt: string | null;
}

export const WEATHER_CREDIT = "البيانات من الأرصاد النرويجية";
