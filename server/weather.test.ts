// **الساعةُ والطقسُ في رأس القائمة** (§4.es) — `npm run test:weather`.
//
// يحرس:
//   ق — القواعدُ الصافية (`shared/weather.ts`): مدينةُ الفرع من اسمه، وحالةُ الطقس من رمز الأرصاد، وحرارةُ «الآن» من السلسلة،
//       والساعةُ بنظام ١٢ ساعة بتوقيت بغداد، والإحداثياتُ بأربع خاناتٍ عشرية.
//   م — الجلبُ (`server/weather/metno.ts`) بمصدرٍ مزيّف لا بالشبكة: التعريفُ في `User-Agent`، ولا جلبَ قبل نصف ساعة ولا قبل `Expires`،
//       و`If-Modified-Since` والـ٣٠٤، والفشلُ يُبقي المحفوظ ويؤخّر المحاولة، وطلبان معاً جلبٌ واحد، والتجديدُ في الخلفية.
//   ر — رصدُ المطارات القريبة (التكملة): قراءةُ رسالة الرصد الحقيقية (`parseMetar`)، والغبارُ والظواهرُ بأولويّتها (`kindFromWx`)،
//       وأقربُ مطارٍ يرصد ضمن ١٠٠ كم والساكتُ يُتجاوز (`pickObservation`)، وقاعدةُ الجمع (`combineWeather`)، والليلُ من الشمس،
//       وجلبُ الرسائل (`server/weather/metar.ts`) بطلبٍ واحد للمطارات كلِّها وعشرِ دقائق وتراجعٍ بعد الفشل.
//   أ — النقطةُ حيّةً (منفذ ٧٠١٩): بلا جلسة ٤٠١، وكلُّ فرعٍ مدينتُه، و«كل الفروع» للمسؤول بغداد، والفرعُ المجهول والمصدرُ المعطّل ⟵ `null` لا خطأ،
//       وغبارُ مطار بغداد يصل شريحةَ فرع بغداد بحرارة المطار.
//   ش — مصدرُ الواجهة: الشريحتان في رأس القائمة والسطرُ في شريط الهاتف بحجمٍ يُقرأ، والاستطلاعُ لهذه الشريحة وحدها بمفتاح الفرع.
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  BAGHDAD_OFFSET_MS, OBS_MAX_AGE_MS, SERIES_GRACE_MS, WEATHER_CITIES, WEATHER_STATIONS, cityForBranchName, combineWeather, conditionOf,
  currentFromSeries, distanceKm, formatClock12, formatTemp, isNightAt, kindFromWx, parseMetar, pickObservation, sunElevationDeg, weatherLabel,
} from "@shared/weather";
import { metarObservations, metarUrl, parseMetarJson, resetMetarCacheForTests } from "./weather/metar";
import {
  REFRESH_MS, RETRY_AFTER_FAILURE_MS, WEATHER_USER_AGENT, cityWeatherNow, nextFetchTime, parseMetno, resetWeatherCacheForTests,
  setWeatherFetchForTests, type FetchResult, type WeatherFetch,
} from "./weather/metno";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const H = 60 * 60 * 1000;
const T0 = Date.parse("2026-10-19T09:00:00Z");

/** جوابٌ بهيئة الأرصاد النرويجية: ساعاتٌ من `start` بحراراتها ورموزها. */
function metnoBody(start: number, temps: number[], symbols: string[] = []) {
  return {
    type: "Feature",
    properties: {
      meta: { updated_at: new Date(start - 40 * 60_000).toISOString(), units: { air_temperature: "celsius" } },
      timeseries: temps.map((t, i) => ({
        time: new Date(start + i * H).toISOString().replace(".000Z", "Z"),
        data: {
          instant: { details: { air_temperature: t } },
          next_1_hours: { summary: { symbol_code: symbols[i] ?? "clearsky_day" } },
        },
      })),
    },
  };
}

interface Reply { status: number; body?: any; expires?: string | null; lastModified?: string | null }
function fakeSource() {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  //  رصدُ المطارات في سجلٍّ وجوابٍ منفصلين — فعدُّ طلبات التوقّع في «م» لا يختلط به.
  const metarCalls: { url: string; headers: Record<string, string> }[] = [];
  let next: Reply | Error = { status: 200, body: metnoBody(T0, [30, 31, 32]) };
  let nextMetar: Reply | Error = { status: 200, body: [] };
  let gate: Promise<void> | null = null;
  const fn: WeatherFetch = async (url, init) => {
    const isMetar = url.startsWith("https://aviationweather.gov/");
    (isMetar ? metarCalls : calls).push({ url, headers: { ...init.headers } });
    if (gate && !isMetar) await gate;
    const r = isMetar ? nextMetar : next;
    if (r instanceof Error) throw r;
    const hs: Record<string, string | null | undefined> = { expires: r.expires, "last-modified": r.lastModified };
    const res: FetchResult = { status: r.status, headers: { get: (n) => hs[n.toLowerCase()] ?? null }, json: async () => r.body };
    return res;
  };
  return {
    calls, metarCalls, fn,
    reply(r: Reply | Error) { next = r; },
    replyMetar(r: Reply | Error) { nextMetar = r; },
    hold() { let open!: () => void; gate = new Promise<void>((r) => { open = r; }); return () => { gate = null; open(); }; },
  };
}
const settle = () => sleep(10);

async function main() {
  // ══ ق — القواعدُ الصافية ══════════════════════════════════════════════════════════════════
  console.log("\n── ق. القواعدُ الصافية ──");
  same("ق.١ **مدينةُ الفرع من اسمه** — الفروعُ الخمسة بأسمائها على الإنتاج",
    ["بايونك بغداد", "الوارث كربلاء", "بايونك ذي قار", "بايونك الموصل", "بايونك كركوك"].map((n) => cityForBranchName(n)?.key ?? null),
    ["baghdad", "karbala", "nasiriyah", "mosul", "kirkuk"]);
  same("ق.٢ والاسمُ بتشكيلٍ أو همزةٍ أو تاءٍ أخرى يُعرف، و«الناصرية» و«نينوى» كذلك",
    ["فرعُ بَغْدَاد", "مركز كربلا", "فرع الناصريه", "نينوى", "ذى قار"].map((n) => cityForBranchName(n)?.key ?? null),
    ["baghdad", "karbala", "nasiriyah", "mosul", "nasiriyah"]);
  same("ق.٣ **وما لا تُعرف مدينتُه لا يُخمَّن** — «مسؤول النظام» والفرعُ الجديد والفارغ ⟵ `null`",
    ["مسؤول النظام", "فرع البصرة", "", null, undefined].map((n) => cityForBranchName(n as any)), [null, null, null, null, null]);
  check(WEATHER_CITIES.every((c) => [c.lat, c.lon].every((v) => Math.abs(v * 1e4 - Math.round(v * 1e4)) < 1e-6)),
    "ق.٤ **الإحداثياتُ بأربع خاناتٍ عشرية حدّاً** — شرطُ الأرصاد النرويجية (الخامسةُ تُرَدّ ٤٠٣)");

  same("ق.٥ **حالةُ الطقس من رمز الأرصاد** — الصافي والقليل والجزئيّ نهاراً وليلاً، والغائمُ والضباب",
    ["clearsky_day", "clearsky_night", "fair_day", "partlycloudy_night", "cloudy", "fog"].map((s) => conditionOf(s)),
    [
      { kind: "clear", night: false, label: "صافٍ" }, { kind: "clear", night: true, label: "صافٍ" },
      { kind: "fair", night: false, label: "صحو" }, { kind: "partly", night: true, label: "غائم جزئياً" },
      { kind: "cloudy", night: false, label: "غائم" }, { kind: "fog", night: false, label: "ضباب" },
    ]);
  same("ق.٦ والمطرُ بشدّته (والزخّاتُ مثلُه)، **والرعدُ يغلب ما معه**، والثلجُ والمطرُ مع الثلج",
    ["lightrain", "lightrainshowers_day", "rain", "rainshowers_night", "heavyrain", "heavyrainshowersandthunder_night",
      "lightssleetshowersandthunder_day", "sleet", "snowshowers_polartwilight", "heavysnow"].map((s) => [conditionOf(s)?.kind, conditionOf(s)?.night]),
    [["drizzle", false], ["drizzle", false], ["rain", false], ["rain", true], ["heavy_rain", false], ["thunder", true],
      ["thunder", false], ["sleet", false], ["snow", false], ["snow", false]]);
  same("ق.٧ **والرمزُ المجهول لا يُخترع له اسم** ⟵ `null` (تظهر الحرارةُ وحدها)",
    ["dust", "", null, "partlycloudy_dusk"].map((s) => conditionOf(s as any)), [null, null, null, null]);
  same("ق.٨ والإنكليزيةُ لزرّ اللغة", [weatherLabel("partly", true), weatherLabel("thunder"), weatherLabel(null)], ["Partly cloudy", "عاصفة رعدية", null]);

  const series = [{ at: T0, temp: 30, symbol: "partlycloudy_day" }, { at: T0 + H, temp: 31, symbol: "rain" }, { at: T0 + 2 * H, temp: 29, symbol: "cloudy" }];
  same("ق.٩ **حرارةُ الآن خطّيةٌ بين الساعتين** (٩:٣٠ ⟵ ٣٠٫٥) ورمزُها رمزُ ساعتها — فتتحرّك خلال الساعة",
    currentFromSeries(series, T0 + H / 2), { temp: 30.5, symbol: "partlycloudy_day", at: T0 });
  same("ق.١٠ وعلى رأس الساعة قيمتُها، وبعد آخر نقطةٍ بأقلّ من ساعة آخرُها، والترتيبُ لا يهمّ",
    [currentFromSeries([...series].reverse(), T0 + H)?.temp, currentFromSeries(series, T0 + 2 * H + SERIES_GRACE_MS - 1)?.temp,
      currentFromSeries(series, T0 - SERIES_GRACE_MS + 1)?.temp], [31, 29, 30]);
  same("ق.١١ **وخارجَ السلسلة لا «الآن»** — قبل أوّلها بساعة أو بعد آخرها بساعة، والسلسلةُ الفارغة ⟵ `null`",
    [currentFromSeries(series, T0 - SERIES_GRACE_MS - 1), currentFromSeries(series, T0 + 2 * H + SERIES_GRACE_MS + 1), currentFromSeries([], T0)],
    [null, null, null]);

  const at = (iso: string) => Date.parse(iso);
  same("ق.١٢ **الساعةُ بنظام ١٢ ساعة بتوقيت بغداد و«ص / م»** — والظهرُ «١٢ م» ومنتصفُ الليل «١٢ ص»",
    ["2026-10-19T07:45:00Z", "2026-10-19T18:05:00Z", "2026-10-19T21:00:00Z", "2026-10-19T09:00:00Z", "2026-10-19T08:59:59Z"].map((s) => formatClock12(at(s))),
    ["١٠:٤٥ ص", "٩:٠٥ م", "١٢:٠٠ ص", "١٢:٠٠ م", "١١:٥٩ ص"]);
  same("ق.١٣ والإنكليزيةُ «AM / PM» بأرقامها", [formatClock12(at("2026-10-19T07:45:00Z"), true), formatClock12(at("2026-10-19T18:05:00Z"), true)],
    ["10:45 AM", "9:05 PM"]);
  same("ق.١٤ **بغداد +٣ ثابتة** (لا توقيتَ صيفيّ منذ ٢٠٠٨) — يوليو كأكتوبر",
    [BAGHDAD_OFFSET_MS, formatClock12(at("2026-07-01T07:45:00Z"))], [3 * H, "١٠:٤٥ ص"]);
  same("ق.١٥ والحرارةُ مقرَّبةً بأرقامٍ عربية، و«-٠» صفر، والسالبُ بإشارته",
    [formatTemp(31.6), formatTemp(-0.4), formatTemp(-2.6), formatTemp(12.5, true)], ["٣٢°", "٠°", "-٣°", "13°"]);

  // ══ م — الجلب ══════════════════════════════════════════════════════════════════════════════
  console.log("\n── م. الجلبُ من الأرصاد النرويجية (مصدرٌ مزيّف) ──");
  same("م.١ قراءةُ الجواب: الساعاتُ بحراراتها ورموزها و`updated_at` — والغريبُ يُترك بصمت",
    [parseMetno(metnoBody(T0, [30, 31], ["fair_day", "rain"])).series.map((p) => [p.at - T0, p.temp, p.symbol]),
      parseMetno(metnoBody(T0, [30])).updatedAt, parseMetno({ properties: { timeseries: [{ time: "x" }, null, 5] } }).series.length,
      parseMetno(null).series.length],
    [[[0, 30, "fair_day"], [H, 31, "rain"]], new Date(T0 - 40 * 60_000).toISOString(), 0, 0]);
  same("م.٢ **متى الجلبُ التالي**: نصفُ ساعةٍ على الأقلّ، و`Expires` الأبعدُ يُحترم، والمجهولُ لا يُقصّر",
    [nextFetchTime(T0, new Date(T0 + 9 * 60_000).toUTCString()) - T0, nextFetchTime(T0, new Date(T0 + 2 * H).toUTCString()) - T0,
      nextFetchTime(T0, "x") - T0, nextFetchTime(T0, null) - T0],
    [REFRESH_MS, 2 * H, REFRESH_MS, REFRESH_MS]);

  const src = fakeSource();
  setWeatherFetchForTests(src.fn);
  resetWeatherCacheForTests();
  const baghdad = WEATHER_CITIES[0];
  const mosul = WEATHER_CITIES[3];
  src.reply({ status: 200, body: metnoBody(T0, [30, 31, 32], ["partlycloudy_day", "rain", "cloudy"]), expires: new Date(T0 + 9 * 60_000).toUTCString(), lastModified: "Mon, 19 Oct 2026 08:20:13 GMT" });
  const first = await cityWeatherNow(baghdad, T0 + 15 * 60_000);
  same("م.٣ **أوّلُ طلبٍ ينتظر الجلب** ويُرجع حرارةَ الآن (٩:١٥ ⟵ ٣٠٫٢٥) ورمزَ ساعتها",
    [first?.temp, first?.symbol, src.calls.length], [30.25, "partlycloudy_day", 1]);
  const c0 = src.calls[0];
  same("م.٤ **وبتعريفٍ صريح** (اسمُ التطبيق وموقعُ المالك) وإحداثياتٍ كما هي — بلا `If-Modified-Since` في الأوّل",
    [c0.headers["User-Agent"], c0.url.endsWith(`?lat=${baghdad.lat}&lon=${baghdad.lon}`), c0.url.startsWith("https://api.met.no/weatherapi/locationforecast/2.0/compact"),
      "If-Modified-Since" in c0.headers],
    [WEATHER_USER_AGENT, true, true, false]);
  check(/\S+\/\S+ \S+\.\S+/.test(WEATHER_USER_AGENT) && !/@/.test(WEATHER_USER_AGENT), "م.٥ والتعريفُ «اسم/إصدار موقع» بلا بريد", WEATHER_USER_AGENT);

  const later = await cityWeatherNow(baghdad, T0 + 25 * 60_000);
  same("م.٦ **لا جلبَ قبل نصف ساعة** ولو مضى `Expires` (تسعُ دقائق) — والحرارةُ تتحرّك من المحفوظ (٩:٢٥ ⟵ ٣٠٫٤٢)",
    [src.calls.length, Math.round((later?.temp ?? 0) * 100) / 100], [1, 30.42]);

  src.reply({ status: 304, expires: new Date(T0 + 2 * H).toUTCString() });
  const afterHalf = await cityWeatherNow(baghdad, T0 + 46 * 60_000);
  await settle();
  same("م.٧ **بعد نصف ساعة يُجدَّد في الخلفية**: المحفوظُ يُقرأ في الحال، والطلبُ بـ`If-Modified-Since` آخرِ `Last-Modified`",
    [afterHalf?.temp != null, src.calls.length, src.calls[1]?.headers["If-Modified-Since"]], [true, 2, "Mon, 19 Oct 2026 08:20:13 GMT"]);
  await cityWeatherNow(baghdad, T0 + 90 * 60_000);
  await settle();
  same("م.٨ **والـ٣٠٤ يُبقي السلسلةَ ويمدّها إلى `Expires` الأبعد** (الساعةُ الحادية عشرة) — لا جلبَ قبله",
    [src.calls.length, (await cityWeatherNow(baghdad, T0 + 90 * 60_000))?.symbol], [2, "rain"]);

  src.reply({ status: 500 });
  const failAt = T0 + 2 * H + 46 * 60_000;
  const duringFail = await cityWeatherNow(baghdad, failAt);
  await settle();
  same("م.٩ **الفشلُ يُبقي المحفوظ يُقرأ** ما دام «الآن» فيه — والحرارةُ آخرُ ساعة",
    [src.calls.length, duringFail?.temp], [3, 32]);
  await cityWeatherNow(baghdad, failAt + RETRY_AFTER_FAILURE_MS - 1000);
  await settle();
  same("م.١٠ **ولا إلحاحَ بعد الفشل**: لا محاولةَ قبل خمس دقائق", src.calls.length, 3);
  src.reply(new Error("ECONNRESET"));
  await cityWeatherNow(baghdad, failAt + RETRY_AFTER_FAILURE_MS + 1000);
  await settle();
  await cityWeatherNow(baghdad, failAt + RETRY_AFTER_FAILURE_MS + 2000);
  await settle();
  same("م.١١ والانقطاعُ (رميُ خطأ) كالفشل: محاولةٌ واحدة ثمّ تراجع، ولا يسقط الخادم", src.calls.length, 4);
  same("م.١٢ **وبعد آخر السلسلة بساعة لا «الآن»** ⟵ `null` لا رقمٌ قديم",
    await cityWeatherNow(baghdad, T0 + 4 * H), null);

  await settle();
  const before = src.calls.length;
  const release = src.hold();
  src.reply({ status: 200, body: metnoBody(T0, [20, 21]) });
  const both = Promise.all([cityWeatherNow(mosul, T0), cityWeatherNow(mosul, T0)]);
  await settle();
  const callsWhileHeld = src.calls.length - before;
  release();
  const [m1, m2] = await both;
  same("م.١٣ **طلبان معاً لمدينةٍ جديدة جلبٌ واحد** — وكلاهما ينتظره ويأخذ جوابَه",
    [callsWhileHeld, src.calls.length - before, m1?.temp, m2?.temp, src.calls[before]?.url.includes(`lat=${mosul.lat}`)], [1, 1, 20, 20, true]);

  resetWeatherCacheForTests();
  src.reply({ status: 503 });
  same("م.١٤ وأوّلُ طلبٍ والمصدرُ معطّل ⟵ `null`", await cityWeatherNow(baghdad, T0), null);

  // ══ ر — رصدُ المطارات القريبة ═══════════════════════════════════════════════════════════════
  console.log("\n── ر. رصدُ المطارات القريبة (الغبار) ──");
  same("ر.١ **رسالةُ الرصد الحقيقية** (مطار بغداد ٢٠٢٦-١٠-١٩): الحرارة، و«CAVOK» رؤيةٌ ١٠ كم وسماءٌ صافية، ولا ظاهرة",
    parseMetar("METAR ORBI 191200Z 34013KT 310V010 CAVOK 32/09 Q1014 NOSIG"), { temp: 32, visibilityM: 10000, wx: [], cover: "clear" });
  same("ر.٢ والغيومُ بأكثرها (كركوك: قليلةٌ ثمّ متفرّقة ⟵ غائم جزئياً)، و«9999» عشرةُ كيلومترات",
    parseMetar("METAR ORKK 191200Z 30008KT 9999 FEW040 SCT100 30/06 Q1015"), { temp: 30, visibilityM: 10000, wx: [], cover: "partly" });
  same("ر.٣ **والغبارُ المتصاعد كما أرسله مطارُ العقبة يومَها** (BLDU والرؤيةُ ٨ كم)",
    parseMetar("METAR OJAQ 191200Z 32020KT 8000 BLDU NSC 29/14 Q1016 NOSIG"), { temp: 29, visibilityM: 8000, wx: ["BLDU"], cover: "clear" });
  same("ر.٤ والعاصفةُ الترابية الشديدة (+DS) والرؤيةُ ٨٠٠ م والسماءُ محجوبة (VV)",
    parseMetar("METAR ORBI 191300Z 31025G35KT 0800 +DS VV005 38/02 Q1008"), { temp: 38, visibilityM: 800, wx: ["+DS"], cover: "cloudy" });
  same("ر.٥ **وما سيقع أو وقع لا يُقرأ «الآن»** — `BECMG … HZ` و`RERA` تُترك، والسالبُ بحرف M",
    [parseMetar("SPECI ORNI 191330Z 30015KT 3000 DU NSC 35/05 Q1010 BECMG 5000 HZ").wx,
      parseMetar("METAR ORBI 191200Z 05005KT 4000 -TSRA BKN030CB M01/M03 Q1020 RERA").wx,
      parseMetar("METAR ORBI 191200Z 05005KT 4000 -TSRA BKN030CB M01/M03 Q1020 RERA").temp],
    [["DU"], ["-TSRA"], -1]);
  same("ر.٦ والسديمُ مع الغيوم (مطارٌ إيرانيّ يومَها) والرسالةُ الفارغة",
    [parseMetar("METAR OITR 191200Z 07004KT 5000 HZ FEW035CB SCT040 BKN100 22/10 Q1019 A3010"), parseMetar(""), parseMetar(null)],
    [{ temp: 22, visibilityM: 5000, wx: ["HZ"], cover: "cloudy" }, { temp: null, visibilityM: null, wx: [], cover: null },
      { temp: null, visibilityM: null, wx: [], cover: null }]);
  same("ر.٧ **الظاهرةُ بأولويّتها**: الرعد · العاصفةُ الترابية (والقريبةُ منها) · الغبارُ المتصاعد · المطرُ بشدّته قبل الغبار العالق · الضبابُ · السديم · الدخان · الضبابُ الخفيف",
    [["-TSRA"], ["+DS"], ["VCDS"], ["BLDU"], ["BLSA"], ["RA", "DU"], ["DU"], ["+RA"], ["-RA"], ["RA"], ["FG"], ["VCFG"], ["HZ"], ["FU"], ["BR"], []]
      .map(kindFromWx),
    ["thunder", "duststorm", "duststorm", "blowing_dust", "blowing_dust", "rain", "dust", "heavy_rain", "drizzle", "rain", "fog", null, "haze", "smoke", "mist", null]);
  same("ر.٨ والتسمياتُ بالعربية", ["dust", "blowing_dust", "duststorm", "haze"].map((k) => weatherLabel(k as any)),
    ["غبار عالق", "غبار متصاعد", "عاصفة ترابية", "غبار خفيف"]);

  const city = (k: string) => WEATHER_CITIES.find((c) => c.key === k)!;
  const st = (icao: string) => WEATHER_STATIONS.find((x) => x.icao === icao)!;
  const NOW = Date.parse("2026-10-19T12:20:00Z");
  same("ر.٩ **المسافاتُ تُحسب**: بغداد ⟵ مطارها ١٣ كم، و**كربلاء أقربُ إلى مطار بغداد (٧٥) منها إلى النجف (٧٨)**، والموصل ⟵ أربيل ٧٥، والناصرية ⟵ مطارها ٢٠، وكركوك ⟵ مطارها ٤",
    [["baghdad", "ORBI"], ["karbala", "ORBI"], ["karbala", "ORNI"], ["mosul", "ORER"], ["nasiriyah", "ORTL"], ["kirkuk", "ORKK"]]
      .map(([c, s]) => Math.round(distanceKm(city(c).lat, city(c).lon, st(s).lat, st(s).lon))),
    [13, 75, 78, 75, 20, 4]);
  const obs = (icao: string, minsAgo: number, raw: string) => ({ icao, at: NOW - minsAgo * 60_000, raw: `METAR ${icao} 191200Z ${raw}` });
  const list = [obs("ORBI", 20, "34013KT 8000 BLDU NSC 33/05 Q1012"), obs("ORNI", 20, "35011KT CAVOK 34/06 Q1012"),
    obs("ORER", 30, "27009KT 9000 FEW040 29/06 Q1017"), obs("ORKK", 200, "30008KT 9999 FEW040 30/06 Q1015")];
  same("ر.١٠ **أقربُ مطارٍ يرصد**: كربلاء ⟵ بغداد، والموصلُ (مطارُها ساكت) ⟵ أربيل، **ومطارُ كركوك ساكتٌ منذ ٢٠٠ دقيقة فيُتجاوز إلى أربيل (٩٤ كم)**، والناصريةُ لا مطارَ ضمن ١٠٠ كم",
    ["karbala", "mosul", "kirkuk", "nasiriyah"].map((k) => pickObservation(city(k), list, NOW)?.station.icao ?? null),
    ["ORBI", "ORER", "ORER", null]);
  same("ر.١١ وإن سكت مطارُ بغداد فالنجفُ لكربلاء، والأحدثُ من رسائل المطار نفسِه، والرسالةُ «من المستقبل» تُترك",
    [pickObservation(city("karbala"), list.filter((o) => o.icao !== "ORBI"), NOW)?.station.icao,
      pickObservation(city("baghdad"), [obs("ORBI", 90, "00000KT CAVOK 30/05 Q1012"), obs("ORBI", 30, "00000KT 3000 DU NSC 31/05 Q1012")], NOW)?.parts.wx,
      pickObservation(city("baghdad"), [obs("ORBI", -30, "00000KT 3000 DU NSC 31/05 Q1012")], NOW)],
    ["ORNI", ["DU"], null]);
  check(OBS_MAX_AGE_MS === 150 * 60_000 && pickObservation(city("baghdad"), [obs("ORBI", 149, "00000KT CAVOK 30/05 Q1012")], NOW) !== null
    && pickObservation(city("baghdad"), [obs("ORBI", 151, "00000KT CAVOK 30/05 Q1012")], NOW) === null,
    "ر.١٢ **وحدُّ الحداثة ساعتان ونصف** — الرسالةُ كلَّ ساعة، فبعدها المطارُ ساكت");

  const fc = (temp: number, symbol: string) => ({ temp, symbol, updatedAt: "2026-10-19T11:40:00Z" });
  const bgd = combineWeather(city("baghdad"), fc(30.6, "partlycloudy_day"), pickObservation(city("baghdad"), list, NOW), NOW);
  same("ر.١٣ **بغداد: الغبارُ والحرارةُ من مطارها (١٣ كم)** والتوقّعُ يقول «غائم جزئياً ٣١°» — الرصدُ يغلب",
    [bgd?.tempC, bgd?.kind, bgd?.label, bgd?.tempFrom, bgd?.kindFrom, bgd?.observed?.station, bgd?.observed?.km, bgd?.observed?.visibilityKm],
    [33, "blowing_dust", "غبار متصاعد", "observed", "observed", "مطار بغداد", 13, 8]);
  const krb = combineWeather(city("karbala"), fc(34.2, "clearsky_day"), pickObservation(city("karbala"), list, NOW), NOW);
  same("ر.١٤ **كربلاء: الغبارُ من مطار بغداد (٧٥ كم) والحرارةُ من توقّع كربلاء** — حرارةُ مدينةٍ أخرى لا تُنقل",
    [krb?.tempC, krb?.kind, krb?.tempFrom, krb?.kindFrom, krb?.observed?.station], [34.2, "blowing_dust", "forecast", "observed", "مطار بغداد"]);
  const mos = combineWeather(city("mosul"), fc(27, "partlycloudy_day"), pickObservation(city("mosul"), list, NOW), NOW);
  same("ر.١٥ **والمطارُ البعيد بلا ظاهرة لا يغيّر الحالة**: الموصل ⟵ غيومُ أربيل لا تُقرأ (٧٥ كم)، فالحالةُ والحرارةُ من التوقّع",
    [mos?.tempC, mos?.kind, mos?.tempFrom, mos?.kindFrom, mos?.observed?.icao], [27, "partly", "forecast", "forecast", "ORER"]);
  const bgdClear = combineWeather(city("baghdad"), fc(30.6, "partlycloudy_day"), pickObservation(city("baghdad"), [obs("ORBI", 10, "34013KT CAVOK 32/09 Q1014")], NOW), NOW);
  same("ر.١٦ **والمطارُ القريب بلا ظاهرة يقول السماءَ**: «CAVOK» في بغداد ⟵ صافٍ ٣٢° من المطار",
    [bgdClear?.tempC, bgdClear?.kind, bgdClear?.kindFrom], [32, "clear", "observed"]);
  same("ر.١٧ **وبلا توقّع**: بغداد ⟵ حرارةُ مطارها؛ وكربلاء ⟵ `null` (لا حرارةَ من مدينةٍ أخرى)؛ وبلا رصدٍ ولا توقّع ⟵ `null`",
    [combineWeather(city("baghdad"), null, pickObservation(city("baghdad"), list, NOW), NOW)?.tempC,
      combineWeather(city("karbala"), null, pickObservation(city("karbala"), list, NOW), NOW), combineWeather(city("baghdad"), null, null, NOW)],
    [33, null, null]);
  const fcOnly = combineWeather(city("nasiriyah"), fc(36.4, "clearsky_night"), null, NOW);
  same("ر.١٨ وبلا رصد ⟵ التوقّعُ وحده كما كان", [fcOnly?.tempC, fcOnly?.kind, fcOnly?.tempFrom, fcOnly?.kindFrom, fcOnly?.observed],
    [36.4, "clear", "forecast", "forecast", null]);
  const noTemp = combineWeather(city("baghdad"), fc(30.6, "fair_day"), pickObservation(city("baghdad"), [obs("ORBI", 10, "34013KT 9999 FEW040 Q1014")], NOW), NOW);
  same("ر.١٩ ورسالةٌ بلا حرارة ⟵ حرارةُ التوقّع وغيومُ المطار", [noTemp?.tempC, noTemp?.tempFrom, noTemp?.kind], [30.6, "forecast", "fair"]);

  const elevNoon = sunElevationDeg(33.3152, 44.3661, Date.parse("2026-10-19T09:00:00Z"));
  check(elevNoon > 40 && elevNoon < 52, "ر.٢٠ **ارتفاعُ الشمس**: ظهرُ بغداد في أكتوبر نحو ٤٧°", String(elevNoon));
  same("ر.٢١ **والليلُ من الشمس**: بغداد ٢:٣٠ف ليل · ٣:٤٠ف نهار (الشروقُ نحو ٣:٠٥ف) · ١٤:٤٠ف نهار · ١٥:٣٠ف ليل (الغروبُ نحو ١٤:٤٥ف — تقريباً)",
    ["2026-10-19T02:30:00Z", "2026-10-19T03:40:00Z", "2026-10-19T14:20:00Z", "2026-10-19T15:30:00Z"].map((t) => isNightAt(33.3152, 44.3661, Date.parse(t))),
    [true, false, false, true]);
  same("ر.٢٢ ورمزُ القمر في النتيجة من الشمس لا من رمز التوقّع (توقّعٌ «ليليّ» ظهراً ⟵ نهار)",
    combineWeather(city("baghdad"), fc(30, "clearsky_night"), null, Date.parse("2026-10-19T09:00:00Z"))?.night, false);

  same("ر.٢٣ قراءةُ جواب المطارات: المطارُ والرسالةُ ولحظتُها، والغريبُ يُترك",
    [parseMetarJson([{ icaoId: "ORBI", obsTime: 1792411200, rawOb: "METAR ORBI 191200Z CAVOK 32/09" }, { icaoId: 5 }, null, { icaoId: "ORKK", rawOb: "x" }]),
      parseMetarJson({ error: 1 })],
    [[{ icao: "ORBI", at: 1792411200000, raw: "METAR ORBI 191200Z CAVOK 32/09" }], []]);
  check(WEATHER_STATIONS.every((x) => metarUrl().includes(x.icao)) && metarUrl().startsWith("https://aviationweather.gov/api/data/metar?ids=")
    && metarUrl().includes("format=json"), "ر.٢٤ **طلبٌ واحد للمطارات الستّة كلِّها**", metarUrl());
  //  أوقاتٌ صريحة لا من الثابت — فتغييرُه يُسقط الاختبار لا يُجرّه معه.
  const TEN_MIN = 10 * 60_000;
  resetMetarCacheForTests();
  src.replyMetar({ status: 200, body: [{ icaoId: "ORBI", obsTime: Math.floor((T0 - 20 * 60_000) / 1000), rawOb: "METAR ORBI 190840Z 34013KT 8000 BLDU NSC 33/05 Q1012" }] });
  const m0 = src.metarCalls.length;
  const firstObs = await metarObservations(T0);
  same("ر.٢٥ **أوّلُ طلبٍ ينتظر الجلب** وبتعريفٍ صريح", [firstObs.length, firstObs[0]?.icao, src.metarCalls.length - m0, src.metarCalls[m0]?.headers["User-Agent"]],
    [1, "ORBI", 1, WEATHER_USER_AGENT]);
  await metarObservations(T0 + TEN_MIN - 1000);
  same("ر.٢٦ **ولا جلبَ قبل عشر دقائق**", src.metarCalls.length - m0, 1);
  src.replyMetar({ status: 503 });
  const stale = await metarObservations(T0 + TEN_MIN + 1000);
  await settle();
  same("ر.٢٧ **بعدها يُجدَّد في الخلفية، والفشلُ يُبقي المحفوظ**", [src.metarCalls.length - m0, stale.length], [2, 1]);
  await metarObservations(T0 + TEN_MIN + RETRY_AFTER_FAILURE_MS);
  await settle();
  same("ر.٢٨ **ولا إلحاحَ بعد الفشل** — لا محاولةَ قبل خمس دقائق", src.metarCalls.length - m0, 2);
  src.replyMetar({ status: 204 });
  await metarObservations(T0 + TEN_MIN + RETRY_AFTER_FAILURE_MS + 2000);
  await settle();
  same("ر.٢٩ و«لا رسائل» (٢٠٤) جوابٌ صحيح يُفرغ القائمة لا فشل", (await metarObservations(T0 + TEN_MIN + RETRY_AFTER_FAILURE_MS + 3000)).length, 0);
  resetMetarCacheForTests();
  src.replyMetar({ status: 200, body: [] });

  // ══ أ — النقطةُ حيّة ══════════════════════════════════════════════════════════════════════
  console.log("\n── أ. النقطةُ حيّةً (منفذ ٧٠١٩) ──");
  const PORT = 7019;
  const BASE = `http://127.0.0.1:${PORT}`;
  const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    req.session = { destroy: (cb: () => void) => cb() };
    if (h) { try { req.session.branchSession = JSON.parse(Buffer.from(h, "base64").toString("utf8")); } catch { /* */ } }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));
  //  فروعٌ وحساباتٌ حقيقية — المِعترِضةُ الحيّة تقرأ الحسابَ وفروعَه من القاعدة (§4.ar البند ٧)، واسمُ الفرع منها.
  const BR = { dq: 9791, mosul: 9792, unknown: 9793, baghdad: 9794 };
  const USERS = { dq: 9795, mosul: 9796, unknown: 9797, baghdad: 9798 };
  const q = (t: string, p: any[] = []) => pool.query(t, p);
  const cleanup = async () => {
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [Object.values(USERS)]);
    await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [Object.values(BR)]);
  };
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'اختبار الطقس ذي قار'), ($2, 'اختبار الطقس الموصل'), ($3, 'اختبار الطقس البصرة'), ($4, 'اختبار الطقس بغداد')`,
    [BR.dq, BR.mosul, BR.unknown, BR.baghdad]);
  for (const k of Object.keys(USERS) as (keyof typeof USERS)[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
             VALUES ($1, $2, 'x', 'موظّف', 'reception', $3, $4::jsonb, true)`, [USERS[k], `wx-${k}`, BR[k], JSON.stringify([BR[k]])]);
  }
  try {
    resetWeatherCacheForTests();
    const now = Date.now();
    const hour = now - (now % H);
    src.reply({ status: 200, body: metnoBody(hour, [24, 24, 24], ["partlycloudy_night", "partlycloudy_night", "fog"]) });
    const get = async (s: Record<string, unknown> | null) => {
      const r = await fetch(`${BASE}/api/weather`, { headers: s ? { "x-test-session": hdr(s) } : {} });
      return { status: r.status, body: r.status === 200 ? await r.json() : null };
    };
    const staff = (k: keyof typeof USERS, branchName: string) =>
      ({ userId: USERS[k], displayName: "موظّف", role: "reception", isAdmin: false, branchId: BR[k], accessibleBranches: [BR[k]], branchName, permissions: {} });
    same("أ.١ بلا جلسة ٤٠١", (await get(null)).status, 401);
    const dq = await get(staff("dq", "اختبار الطقس ذي قار"));
    const nas = WEATHER_CITIES.find((c) => c.key === "nasiriyah")!;
    same("أ.٢ **فرعُ ذي قار ⟵ الناصرية** بحرارتها وحالتها، والليلُ من الشمس، و`updatedAt` من الأرصاد، **ولا مطارَ يرصد قريباً** فالمصدرُ التوقّع",
      [dq.status, dq.body?.weather?.cityKey, dq.body?.weather?.city, dq.body?.weather?.tempC, dq.body?.weather?.kind, dq.body?.weather?.night,
        dq.body?.weather?.label, typeof dq.body?.weather?.updatedAt, dq.body?.weather?.tempFrom, dq.body?.weather?.observed],
      [200, "nasiriyah", "الناصرية", 24, "partly", isNightAt(nas.lat, nas.lon, Date.now()), "غائم جزئياً", "string", "forecast", null]);
    const mark = src.calls.length;
    same("أ.٣ وكلُّ فرعٍ مدينتُه — والطلبُ بإحداثياتها",
      [(await get(staff("mosul", "اختبار الطقس الموصل"))).body?.weather?.city, src.calls.slice(mark).some((c) => c.url.includes(`lat=${mosul.lat}&lon=${mosul.lon}`))],
      ["الموصل", true]);
    same("أ.٤ **«كل الفروع» للمسؤول العامّ ⟵ بغداد**، وإن اختار فرعاً فطقسُه",
      [(await get({ userId: 2, isAdmin: true, role: "admin", branchId: 0, branchName: "مسؤول النظام", permissions: {} })).body?.weather?.city,
        (await get({ userId: 2, isAdmin: true, role: "admin", branchId: 2, branchName: "الوارث كربلاء", permissions: {} })).body?.weather?.city],
      ["بغداد", "كربلاء"]);
    same("أ.٥ **والفرعُ الذي لا تُعرف مدينتُه لا يُخمَّن له طقس** ⟵ `weather: null` بـ٢٠٠",
      await get(staff("unknown", "اختبار الطقس البصرة")), { status: 200, body: { weather: null } });
    resetWeatherCacheForTests();
    src.reply(new Error("ENOTFOUND"));
    same("أ.٦ **والمصدرُ المعطّل لا يصل الشاشةَ خطأً** ⟵ `weather: null` بـ٢٠٠",
      await get(staff("baghdad", "اختبار الطقس بغداد")), { status: 200, body: { weather: null } });
    resetWeatherCacheForTests();
    resetMetarCacheForTests();
    src.reply({ status: 200, body: metnoBody(hour, [24, 24, 24], ["partlycloudy_day", "partlycloudy_day", "fog"]) });
    src.replyMetar({ status: 200, body: [{ icaoId: "ORBI", obsTime: Math.floor((now - 25 * 60_000) / 1000),
      rawOb: "METAR ORBI 191200Z 31025G35KT 2000 +DS NSC 38/02 Q1008" }] });
    const dust = (await get(staff("baghdad", "اختبار الطقس بغداد"))).body?.weather;
    same("أ.٧ **عاصفةٌ ترابية في مطار بغداد تصل شريحةَ فرع بغداد** بحرارة المطار ورؤيته واسمه — والتوقّعُ يقول «غائم جزئياً ٢٤°»",
      [dust?.kind, dust?.label, dust?.tempC, dust?.tempFrom, dust?.kindFrom, dust?.observed?.station, dust?.observed?.visibilityKm],
      ["duststorm", "عاصفة ترابية", 38, "observed", "observed", "مطار بغداد", 2]);
    const krbLive = (await get({ userId: 2, isAdmin: true, role: "admin", branchId: 2, branchName: "الوارث كربلاء", permissions: {} })).body?.weather;
    same("أ.٨ **وكربلاء تأخذ الغبارَ من مطار بغداد (٧٥ كم) والحرارةَ من توقّعها**", [krbLive?.kind, krbLive?.tempC, krbLive?.tempFrom], ["duststorm", 24, "forecast"]);
  } finally {
    httpServer.close();
    setWeatherFetchForTests(null);
    resetMetarCacheForTests();
    await cleanup();
  }

  // ══ ش — مصدرُ الواجهة ═══════════════════════════════════════════════════════════════════════
  console.log("\n── ش. مصدرُ الواجهة ──");
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
  const sidebar = read("client/src/components/Sidebar.tsx");
  const cw = read("client/src/components/ClockWeather.tsx");
  const header = sidebar.slice(sidebar.indexOf("const sidebarContent = ("), sidebar.indexOf("<nav className="));
  check(header.includes("<SidebarClockWeather />"), "ش.١ **الشريحتان في رأس القائمة** (فتظهران على الحاسوب وفي قائمة الهاتف المنزلقة)");
  const topBar = sidebar.slice(sidebar.indexOf("Mobile Header"), sidebar.indexOf("Mobile Sidebar Overlay"));
  check(topBar.includes("<TopBarClockWeather />"), "ش.٢ **والسطرُ الصغير في شريط الهاتف العلويّ** تحت الاسم");
  check(/queryKey: \["\/api\/weather", session\?\.branchId \?\? null\]/.test(cw), "ش.٣ **مفتاحُ الطقس فرعُ الجلسة** — فيتبدّل بتبديل الفرع");
  check(/refetchInterval: WEATHER_REFETCH_MS/.test(cw) && /WEATHER_REFETCH_MS = 10 \* 60_000/.test(cw),
    "ش.٤ **ويتحدّث كلَّ عشر دقائق** — لهذه الشريحة وحدها");
  check(/refetchInterval: false/.test(read("client/src/lib/queryClient.ts")), "ش.٥ والعامُّ باقٍ `false` (§4.cy)");
  check(cw.includes("WEATHER_CREDIT") && cw.includes("https://www.met.no/en") && cw.includes("creativecommons.org/licenses/by/4.0"),
    "ش.٦ **ومصدرُ الطقس مذكورٌ بترخيصه** في تفصيل الشريحة — شرطُ CC BY 4.0");
  check(/formatClock12\(now, en\)/.test(cw) && /60_000 - \(n % 60_000\)/.test(cw) && /visibilitychange/.test(cw),
    "ش.٧ **والساعةُ تتبدّل على رأس الدقيقة** وحين يعود الهاتفُ من السكون");
  const sidebarFn = cw.slice(cw.indexOf("export function SidebarClockWeather"), cw.indexOf("export function TopBarClockWeather"));
  const topFn = cw.slice(cw.indexOf("export function TopBarClockWeather"));
  check((sidebarFn.match(/text-\[15px\] font-bold/g) ?? []).length === 2 && /w-5 h-5 shrink-0/.test(sidebarFn) && /w-\[18px\] h-\[18px\]/.test(sidebarFn),
    "ش.٨ **الشريحتان بحجمٍ يُقرأ** (ملاحظةُ المالك «صغيرة جداً»): خطٌّ ١٥ نقطة عريض في الاثنتين، ورمزا ١٨ و٢٠ نقطة");
  check(/text-\[14px\] leading-tight font-semibold text-slate-700/.test(topFn) && /w-4 h-4/.test(topFn) && !/text-\[11px\]/.test(topFn),
    "ش.٩ **وسطرُ شريط الهاتف** ١٤ نقطة عريضاً بلونٍ داكن ورمزُه ١٦ نقطة — لا ١١ رمادياً");
  check(/DUSTY\.has\(w\.kind\)/.test(sidebarFn) && /bg-amber-50 ring-amber-300/.test(sidebarFn),
    "ش.١٠ **والغبارُ تُلوَّن شريحتُه بلون التراب** — تنبيهٌ يُرى من بعيد");
  check(cw.includes("OBS_CREDIT") && cw.includes("https://aviationweather.gov/") && /sidebar-weather-observed/.test(cw),
    "ش.١١ **ومصدرُ الرصد مذكور** والمطارُ وبُعدُه ولحظتُه والرؤيةُ في التفصيل");
}

main()
  .catch((e) => { failures++; console.error(e); })
  .finally(async () => {
    console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
    await pool.end().catch(() => {});
    process.exit(failures ? 1 : 0);
  });
