// **الساعةُ والطقسُ في رأس القائمة** (§4.es) — `npm run test:weather`.
//
// يحرس:
//   ق — القواعدُ الصافية (`shared/weather.ts`): مدينةُ الفرع من اسمه، وحالةُ الطقس من رمز الأرصاد، وحرارةُ «الآن» من السلسلة،
//       والساعةُ بنظام ١٢ ساعة بتوقيت بغداد، والإحداثياتُ بأربع خاناتٍ عشرية.
//   م — الجلبُ (`server/weather/metno.ts`) بمصدرٍ مزيّف لا بالشبكة: التعريفُ في `User-Agent`، ولا جلبَ قبل نصف ساعة ولا قبل `Expires`،
//       و`If-Modified-Since` والـ٣٠٤، والفشلُ يُبقي المحفوظ ويؤخّر المحاولة، وطلبان معاً جلبٌ واحد، والتجديدُ في الخلفية.
//   أ — النقطةُ حيّةً (منفذ ٧٠١٩): بلا جلسة ٤٠١، وكلُّ فرعٍ مدينتُه، و«كل الفروع» للمسؤول بغداد، والفرعُ المجهول والمصدرُ المعطّل ⟵ `null` لا خطأ.
//   ش — مصدرُ الواجهة: الشريحتان في رأس القائمة والسطرُ في شريط الهاتف، والاستطلاعُ لهذه الشريحة وحدها بمفتاح الفرع.
import express from "express";
import fs from "fs";
import path from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  BAGHDAD_OFFSET_MS, SERIES_GRACE_MS, WEATHER_CITIES, cityForBranchName, conditionOf, currentFromSeries, formatClock12, formatTemp,
  weatherLabel,
} from "@shared/weather";
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
  let next: Reply | Error = { status: 200, body: metnoBody(T0, [30, 31, 32]) };
  let gate: Promise<void> | null = null;
  const fn: WeatherFetch = async (url, init) => {
    calls.push({ url, headers: { ...init.headers } });
    if (gate) await gate;
    const r = next;
    if (r instanceof Error) throw r;
    const hs: Record<string, string | null | undefined> = { expires: r.expires, "last-modified": r.lastModified };
    const res: FetchResult = { status: r.status, headers: { get: (n) => hs[n.toLowerCase()] ?? null }, json: async () => r.body };
    return res;
  };
  return {
    calls, fn,
    reply(r: Reply | Error) { next = r; },
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
    same("أ.٢ **فرعُ ذي قار ⟵ الناصرية** بحرارتها وحالتها ورمزِ الليل، و`updatedAt` من الأرصاد",
      [dq.status, dq.body?.weather?.cityKey, dq.body?.weather?.city, dq.body?.weather?.tempC, dq.body?.weather?.kind, dq.body?.weather?.night,
        dq.body?.weather?.label, typeof dq.body?.weather?.updatedAt],
      [200, "nasiriyah", "الناصرية", 24, "partly", true, "غائم جزئياً", "string"]);
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
  } finally {
    httpServer.close();
    setWeatherFetchForTests(null);
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
}

main()
  .catch((e) => { failures++; console.error(e); })
  .finally(async () => {
    console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
    await pool.end().catch(() => {});
    process.exit(failures ? 1 : 0);
  });
