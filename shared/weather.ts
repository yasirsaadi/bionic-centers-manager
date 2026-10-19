//  **الساعةُ والطقسُ في رأس القائمة** (§4.es — طلبُ المالك ٢٠٢٦-١٠-١٩، والبديلُ «ج»: شريحتان).
//
//  قواعدُ محضة يقرؤها الخادمُ والشاشةُ معاً، بلا شبكةٍ ولا قاعدة:
//    • مدينةُ الفرع **من اسمه** (`cityForBranchName`) — لا من رقمه، فالفرعُ الجديد أو المُعاد ترقيمُه لا يأخذ طقسَ غيره،
//      وما لا تُعرف مدينتُه **لا طقسَ له** (الشريحةُ تختفي) بدل أن يُخمَّن.
//    • حالةُ الطقس بالعربية من رمز الأرصاد النرويجية (`conditionOf`).
//    • حرارةُ **الآن** من سلسلة الساعات المحفوظة (`currentFromSeries`) — تُحسب عند كلّ طلب لا عند الجلب، فتتبدّل مع الوقت.
//    • الساعةُ بنظام ١٢ ساعة بتوقيت بغداد (`formatClock12`) — **بلا Intl**: العراقُ بلا توقيتٍ صيفيّ منذ ٢٠٠٨ فالفرقُ +٣ ثابت،
//      ومتصفّحٌ ناقصُ بيانات اللغة كان سيكتب «AM» بدل «ص».
//    • **ورصدُ المطارات القريبة** (التكملة — سؤالُ المالك «لماذا لا تقرأ من مصدر محلي أو قريب لتظهر الغبار»): رسالةُ الرصد
//      الساعية لكلّ مطار (`parseMetar`) فيها الغبارُ العالق والمتصاعد والعاصفةُ الترابية والسديمُ والضبابُ والمطرُ والرعد،
//      والحرارةُ المرصودة؛ وقاعدةُ الجمع (`combineWeather`) تأخذ الظاهرةَ من أقرب مطارٍ يرصد ضمن ١٠٠ كم، والحرارةَ منه إن كان
//      ضمن ٣٠ كم، وإلّا فمن التوقّع. والليلُ من ارتفاع الشمس (`isNightAt`) لا من رمز التوقّع.
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
  | "drizzle" | "rain" | "heavy_rain" | "thunder" | "sleet" | "snow"
  //  من رصد المطارات وحده — التوقّعُ لا يعرفها.
  | "dust" | "blowing_dust" | "duststorm" | "haze" | "mist" | "smoke";

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
  dust: "غبار عالق",
  blowing_dust: "غبار متصاعد",
  duststorm: "عاصفة ترابية",
  //  السديمُ (HZ) في رصد العراق غبارٌ جافّ معلَّق في الغالب — فيُسمّى بما يفهمه الموظّف.
  haze: "غبار خفيف",
  mist: "ضباب خفيف",
  smoke: "دخان",
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
  dust: "Dust",
  blowing_dust: "Blowing dust",
  duststorm: "Dust storm",
  haze: "Haze",
  mist: "Mist",
  smoke: "Smoke",
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

// ══ رصدُ المطارات القريبة ══════════════════════════════════════════════════════════════════════

export interface WeatherStation { icao: string; name: string; nameEn: string; lat: number; lon: number }

/**
 * مطاراتُ العراق التي تخدم مدنَ الفروع — **والأقربُ يُحسب لا يُكتب**: كربلاء أقربُ إلى مطار بغداد (٧٥ كم) منها إلى النجف (٧٨ كم).
 * الموصلُ والناصرية لم يرسلا رصداً في الأيّام الثلاثة قبل ٢٠٢٦-١٠-١٩ — يبقيان في القائمة فيُقرآن يومَ يعودان، وإلى أن يعودا
 * فالموصلُ من أربيل (٧٥ كم) والناصريةُ بلا رصد (البصرةُ ١٧٠ كم — أبعدُ من الحدّ).
 */
export const WEATHER_STATIONS: WeatherStation[] = [
  { icao: "ORBI", name: "مطار بغداد", nameEn: "Baghdad Airport", lat: 33.263, lon: 44.235 },
  { icao: "ORNI", name: "مطار النجف", nameEn: "Najaf Airport", lat: 31.99, lon: 44.405 },
  { icao: "ORTL", name: "مطار الناصرية", nameEn: "Nasiriyah Airport", lat: 30.936, lon: 46.09 },
  { icao: "ORBM", name: "مطار الموصل", nameEn: "Mosul Airport", lat: 36.306, lon: 43.147 },
  { icao: "ORER", name: "مطار أربيل", nameEn: "Erbil Airport", lat: 36.232, lon: 43.951 },
  { icao: "ORKK", name: "مطار كركوك", nameEn: "Kirkuk Airport", lat: 35.469, lon: 44.3494 },
];

/** الظاهرةُ (غبار، مطر، ضباب…) من مطارٍ ضمن هذه المسافة — والغبارُ والعواصفُ أوسعُ من مدينة. */
export const OBS_WX_MAX_KM = 100;
/** والحرارةُ المرصودة من مطارٍ ضمن هذه وحدها — أبعدُ منها فالتوقّعُ لمدينة الفرع أدقّ. */
export const OBS_TEMP_MAX_KM = 30;
/** رصدٌ أقدمُ من هذا لا يُقرأ — الرسالةُ كلَّ ساعة، فساعتان ونصف تعني أنّ المطار سكت. */
export const OBS_MAX_AGE_MS = 150 * 60 * 1000;

export function distanceKm(aLat: number, aLon: number, bLat: number, bLon: number): number {
  const r = Math.PI / 180;
  const dLat = (bLat - aLat) * r, dLon = (bLon - aLon) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export type SkyCover = "clear" | "fair" | "partly" | "cloudy";
export interface MetarParts {
  temp: number | null;
  /** بالأمتار، و١٠٠٠٠ = «عشرة كيلومترات فأكثر» (`9999` و`CAVOK`). */
  visibilityM: number | null;
  /** مجموعاتُ الطقس الحاضر كما هي (`+DS`، `BLDU`، `HZ`، `-RA`…). */
  wx: string[];
  cover: SkyCover | null;
}

const WX_RE = /^(\+|-|VC)?(MI|PR|BC|DR|BL|SH|TS|FZ)?((DZ|RA|SN|SG|IC|PL|GR|GS|UP|BR|FG|FU|VA|DU|SA|HZ|PY|PO|SQ|FC|SS|DS)+)?$/;

/**
 * **رسالةُ الرصد (METAR) ⟵ أجزاؤها**: الحرارة، والرؤية، والطقسُ الحاضر، والغيوم. وتقف عند `RMK` وتوقّعِ الاتّجاه (`NOSIG` · `TEMPO`
 * · `BECMG`) والطقسِ القريب الماضي (`RE…`) — فما سيقع أو وقع لا يُقرأ «الآن».
 */
export function parseMetar(raw: string | null | undefined): MetarParts {
  const out: MetarParts = { temp: null, visibilityM: null, wx: [], cover: null };
  const tokens = String(raw ?? "").trim().toUpperCase().split(/\s+/).filter(Boolean);
  let rank = -1; // ٠ صافٍ · ١ قليل · ٢ متفرّق · ٣ غائم
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t === "RMK" || t === "NOSIG" || t === "TEMPO" || t === "BECMG" || t.startsWith("RE")) break;
    if (i < 2 && /^(METAR|SPECI|[A-Z]{4})$/.test(t)) continue;
    if (/^\d{6}Z$/.test(t) || t === "AUTO" || t === "COR") continue;
    if (/^(\d{3}|VRB)\d{2,3}(G\d{2,3})?(KT|MPS)$/.test(t) || /^\d{3}V\d{3}$/.test(t)) continue;
    if (t === "CAVOK") { out.visibilityM = 10000; rank = Math.max(rank, 0); continue; }
    if (/^\d{4}$/.test(t)) { const v = Number(t); out.visibilityM = v >= 9999 ? 10000 : v; continue; }
    if (/^P?\d+SM$/.test(t)) { out.visibilityM = Math.min(10000, Math.round(Number(t.replace(/\D/g, "")) * 1609)); continue; }
    if (/^(NSC|SKC|CLR|NCD)$/.test(t)) { rank = Math.max(rank, 0); continue; }
    const cl = t.match(/^(FEW|SCT|BKN|OVC|VV)(\d{3}|\/\/\/)/);
    if (cl) { rank = Math.max(rank, { FEW: 1, SCT: 2, BKN: 3, OVC: 3, VV: 3 }[cl[1]] as number); continue; }
    const tm = t.match(/^(M?\d{2})\/(M?\d{2})?$/);
    if (tm) { out.temp = Number(tm[1].replace("M", "-")); continue; }
    if (t !== "NSW" && WX_RE.test(t) && /[A-Z]{2}/.test(t.replace(/^(\+|-|VC)/, ""))) out.wx.push(t);
  }
  out.cover = rank < 0 ? null : (["clear", "fair", "partly", "cloudy"] as SkyCover[])[rank];
  return out;
}

/**
 * **الطقسُ الحاضر ⟵ حالة** بالأولوية: الرعد · العاصفةُ الترابية · الغبارُ المتصاعد · المطرُ والثلج بشدّتهما · الغبارُ العالق · الضباب ·
 * السديم · الدخان · الضبابُ الخفيف. والقريبُ (`VC…`) يُقرأ كالحاضر للعاصفة الترابية والرعد وحدهما. ولا ظاهرةَ ⟵ `null`.
 */
export function kindFromWx(wx: string[]): WeatherKind | null {
  const groups = wx.map((g) => g.toUpperCase());
  const here = groups.filter((g) => !g.startsWith("VC"));
  const has = (re: RegExp, list = here) => list.some((g) => re.test(g));
  if (has(/TS/, groups)) return "thunder";
  if (has(/DS|SS|PO|FC/, groups)) return "duststorm";
  if (has(/(BL|DR)(DU|SA)/)) return "blowing_dust";
  if (has(/SN|SG/)) return "snow";
  if (has(/PL|GR|GS|IC/)) return "sleet";
  if (has(/RA|DZ/)) {
    if (here.some((g) => g.startsWith("+") && /RA/.test(g))) return "heavy_rain";
    if (here.some((g) => g.startsWith("-") || (/DZ/.test(g) && !/RA/.test(g)))) return "drizzle";
    return "rain";
  }
  if (has(/DU|SA/)) return "dust";
  if (has(/FG/)) return "fog";
  if (has(/HZ/)) return "haze";
  if (has(/FU|VA/)) return "smoke";
  if (has(/BR/)) return "mist";
  return null;
}

/** رصدُ مطارٍ واحد كما يُحفظ في الخادم: الرسالةُ ولحظتُها. */
export interface StationObs { icao: string; at: number; raw: string }

export interface PickedObs { station: WeatherStation; km: number; at: number; parts: MetarParts }

/** **أقربُ مطارٍ ضمن ١٠٠ كم له رصدٌ حديث** (≤ ساعتين ونصف) — والمطارُ الساكت يُتجاوز إلى الذي يليه. */
export function pickObservation(city: Pick<WeatherCity, "lat" | "lon">, list: StationObs[], nowMs: number): PickedObs | null {
  const latest = new Map<string, StationObs>();
  for (const o of list) {
    if (!o || !Number.isFinite(o.at) || o.at > nowMs + 10 * 60 * 1000 || nowMs - o.at > OBS_MAX_AGE_MS) continue;
    const prev = latest.get(o.icao);
    if (!prev || o.at > prev.at) latest.set(o.icao, o);
  }
  const near = WEATHER_STATIONS
    .map((st) => ({ st, km: distanceKm(city.lat, city.lon, st.lat, st.lon) }))
    .filter((x) => x.km <= OBS_WX_MAX_KM && latest.has(x.st.icao))
    .sort((a, b) => a.km - b.km);
  if (!near.length) return null;
  const o = latest.get(near[0].st.icao)!;
  return { station: near[0].st, km: near[0].km, at: o.at, parts: parseMetar(o.raw) };
}

/**
 * **الليلُ من ارتفاع الشمس** عند المدينة (معادلاتُ الشمس المبسّطة — دقيقتان أو ثلاثٌ حول الشروق والغروب): تحت الأفق بأكثر من
 * ٠٫٨٣ درجة ⟵ ليل. فرمزُ القمر يتبع السماءَ لا مصدرَ الحالة.
 */
export function sunElevationDeg(lat: number, lon: number, ms: number): number {
  const r = Math.PI / 180;
  const d = ms / 86400000 + 2440587.5 - 2451545.0;
  const g = (357.529 + 0.98560028 * d) * r;
  const q = 280.459 + 0.98564736 * d;
  const L = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * r;
  const e = (23.439 - 0.00000036 * d) * r;
  const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
  const dec = Math.asin(Math.sin(e) * Math.sin(L));
  const gmst = ((18.697374558 + 24.06570982441908 * d) % 24) * 15;
  const ha = (gmst + lon) * r - ra;
  return Math.asin(Math.sin(lat * r) * Math.sin(dec) + Math.cos(lat * r) * Math.cos(dec) * Math.cos(ha)) / r;
}
export const isNightAt = (lat: number, lon: number, ms: number) => sunElevationDeg(lat, lon, ms) < -0.833;

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
  /** من أين الحرارة: رصدُ مطارٍ قريب أم التوقّع. */
  tempFrom: "observed" | "forecast";
  /** من أين الحالة: رصدُ المطار (ظاهرةٌ أو غيومُه) أم التوقّع. */
  kindFrom: "observed" | "forecast" | null;
  /** الرصدُ المقروء — المطارُ وبُعدُه ولحظتُه والرؤية. */
  observed: { icao: string; station: string; stationEn: string; km: number; at: string; visibilityKm: number | null } | null;
}

/**
 * **قاعدةُ الجمع** — الرصدُ يغلب التوقّعَ فيما يعرفه:
 *   • الظاهرةُ (غبار، عاصفة ترابية، مطر، رعد، ضباب…) من أقرب مطارٍ يرصد ضمن ١٠٠ كم — التوقّعُ لا يعرف الغبار.
 *   • والغيومُ (صافٍ/صحو/غائم) من المطار إن كان ضمن ٣٠ كم، وإلّا فمن التوقّع.
 *   • والحرارةُ من المطار ضمن ٣٠ كم، وإلّا فتوقّعُ مدينة الفرع.
 *   • ولا توقّعَ ولا مطارَ قريبٌ للحرارة ⟵ `null` (لا رقمَ من مدينةٍ أخرى).
 */
export function combineWeather(
  city: WeatherCity,
  forecast: { temp: number; symbol: string | null; updatedAt: string | null } | null,
  obs: PickedObs | null,
  nowMs: number,
): WeatherNow | null {
  const close = obs != null && obs.km <= OBS_TEMP_MAX_KM;
  const tempObs = close && obs!.parts.temp != null;
  const temp = tempObs ? obs!.parts.temp! : forecast?.temp;
  if (temp == null || !Number.isFinite(temp)) return null;
  const wxKind = obs ? kindFromWx(obs.parts.wx) : null;
  const coverKind = close && obs!.parts.cover ? (obs!.parts.cover as WeatherKind) : null;
  const fcKind = conditionOf(forecast?.symbol)?.kind ?? null;
  const kind = wxKind ?? coverKind ?? fcKind;
  return {
    cityKey: city.key,
    city: city.name,
    tempC: Math.round(temp * 10) / 10,
    kind,
    night: isNightAt(city.lat, city.lon, nowMs),
    label: kind ? WEATHER_LABELS[kind] : null,
    updatedAt: forecast?.updatedAt ?? null,
    tempFrom: tempObs ? "observed" : "forecast",
    kindFrom: wxKind || coverKind ? "observed" : fcKind ? "forecast" : null,
    observed: obs ? {
      icao: obs.station.icao, station: obs.station.name, stationEn: obs.station.nameEn, km: Math.round(obs.km),
      at: new Date(obs.at).toISOString(),
      visibilityKm: obs.parts.visibilityM == null ? null : Math.round(obs.parts.visibilityM / 100) / 10,
    } : null,
  };
}

export const WEATHER_CREDIT = "التوقّع من الأرصاد النرويجية";
export const OBS_CREDIT = "الرصد من مطارات العراق عبر";
