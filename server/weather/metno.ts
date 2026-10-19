//  **طقسُ مدينة الفرع من الأرصاد النرويجية** (§4.es).
//
//    https://api.met.no/weatherapi/locationforecast/2.0/compact
//
//  مجانيّ ويُسمح باستعماله تجارياً بترخيص CC BY 4.0 بشرط ذكر المصدر (`WEATHER_CREDIT` في الشريحة).
//  وشروطُه تُحترم هنا كلُّها:
//    • تعريفٌ صريحٌ في `User-Agent` (اسمُ التطبيق وموقعُ المالك — لا بريدَ ولا عشوائيّ: العشوائيُّ يُحظر).
//    • **لا طلبَ قبل `Expires`**، و`If-Modified-Since` بآخر `Last-Modified` — فالـ٣٠٤ يمدّ المحفوظَ بلا تنزيل.
//    • أربعُ خاناتٍ عشرية للإحداثيات (`WEATHER_CITIES`).
//    • **الخادمُ يجلب، لا كلُّ جهاز**: خمسُ مدنٍ كلَّ نصف ساعة على الأكثر (≤ ٢٤٠ طلباً في اليوم)، وطلبٌ واحدٌ في الطريق لكلّ مدينة.
//    • ولا جلبَ والتطبيقُ لا يُستعمل: الجلبُ يقع حين يطلب موظّفٌ الطقسَ وقد شاخ المحفوظ.
//
//  **والمحفوظُ سلسلةُ الساعات لا رقمٌ واحد**: «الآن» يُحسب منها عند كلّ طلب (`currentFromSeries`)، فتتحرّك الحرارةُ مع الوقت
//  بين جلبين. وإن فشل الجلبُ بقي المحفوظُ يُقرأ ما دام «الآن» فيه، وأُعيدت المحاولةُ بعد خمس دقائق لا مع كلّ طلب.
import { type WeatherCity, type WeatherPoint, currentFromSeries } from "@shared/weather";

const ENDPOINT = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
export const WEATHER_USER_AGENT = process.env.WEATHER_USER_AGENT?.trim() || "BionicCentersManager/1.0 dryasirsabeeh.com";
/** أقلُّ ما بين جلبين لمدينة — ولو قال `Expires` أقلّ. */
export const REFRESH_MS = 30 * 60 * 1000;
/** بعد فشلٍ لا يُعاد الجلبُ قبلها. */
export const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
/** ساعاتٌ تُحفظ من السلسلة — يومان يكفيان «الآن» بين جلبين وما بعدهما. */
const KEEP_POINTS = 48;

export interface FetchResult {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<any>;
}
export type WeatherFetch = (url: string, init: { headers: Record<string, string>; signal?: AbortSignal }) => Promise<FetchResult>;

let fetchImpl: WeatherFetch = (url, init) => fetch(url, init) as unknown as Promise<FetchResult>;
/** للاختبار وحده: مصدرٌ مزيّف بدل الشبكة، و`null` يعيد `fetch`. */
export function setWeatherFetchForTests(f: WeatherFetch | null) {
  fetchImpl = f ?? ((url, init) => fetch(url, init) as unknown as Promise<FetchResult>);
}
/** الجالبُ الواحد للمصدرين (التوقّعُ هنا ورصدُ المطارات في `metar.ts`) — فالمزيّفُ في الاختبار يحلّ محلَّهما معاً. */
export const weatherFetch: WeatherFetch = (url, init) => fetchImpl(url, init);

interface CityCache {
  series: WeatherPoint[];
  updatedAt: string | null;
  lastModified: string | null;
  nextFetchAt: number;
  inflight: Promise<void> | null;
}
const cache = new Map<string, CityCache>();
/** للاختبار وحده. */
export function resetWeatherCacheForTests() { cache.clear(); }

/** سلسلةُ الساعات من جواب الأرصاد — ما لا يُقرأ يُترك بصمت، فجوابٌ غريبٌ لا يُسقط الخادم. */
export function parseMetno(body: any): { series: WeatherPoint[]; updatedAt: string | null } {
  const ts = Array.isArray(body?.properties?.timeseries) ? body.properties.timeseries : [];
  const series: WeatherPoint[] = [];
  for (const t of ts) {
    const at = Date.parse(String(t?.time ?? ""));
    const temp = t?.data?.instant?.details?.air_temperature;
    if (!Number.isFinite(at) || typeof temp !== "number" || !Number.isFinite(temp)) continue;
    const sym = t?.data?.next_1_hours?.summary?.symbol_code ?? t?.data?.next_6_hours?.summary?.symbol_code ?? null;
    series.push({ at, temp, symbol: typeof sym === "string" ? sym : null });
    if (series.length >= KEEP_POINTS) break;
  }
  const u = body?.properties?.meta?.updated_at;
  return { series, updatedAt: typeof u === "string" ? u : null };
}

/** متى يجوز الجلبُ التالي: لا قبل `Expires` ولا قبل نصف ساعة. */
export function nextFetchTime(nowMs: number, expiresHeader: string | null): number {
  const exp = expiresHeader ? Date.parse(expiresHeader) : NaN;
  return Math.max(nowMs + REFRESH_MS, Number.isFinite(exp) ? exp : 0);
}

async function refresh(city: WeatherCity, entry: CityCache, nowMs: number): Promise<void> {
  const headers: Record<string, string> = { "User-Agent": WEATHER_USER_AGENT, Accept: "application/json" };
  if (entry.lastModified) headers["If-Modified-Since"] = entry.lastModified;
  try {
    const res = await weatherFetch(`${ENDPOINT}?lat=${city.lat}&lon=${city.lon}`, {
      headers,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (res.status === 304) {
      entry.nextFetchAt = nextFetchTime(nowMs, res.headers.get("expires"));
      return;
    }
    if (res.status !== 200) {
      //  ٤٢٩ وأخواتُها: تراجعٌ لا إلحاح — شرطُ المصدر.
      console.warn(`[weather] ${city.key}: HTTP ${res.status}`);
      entry.nextFetchAt = nowMs + RETRY_AFTER_FAILURE_MS;
      return;
    }
    const parsed = parseMetno(await res.json());
    if (!parsed.series.length) {
      console.warn(`[weather] ${city.key}: جوابٌ بلا سلسلة`);
      entry.nextFetchAt = nowMs + RETRY_AFTER_FAILURE_MS;
      return;
    }
    entry.series = parsed.series;
    entry.updatedAt = parsed.updatedAt;
    entry.lastModified = res.headers.get("last-modified");
    entry.nextFetchAt = nextFetchTime(nowMs, res.headers.get("expires"));
  } catch (e: any) {
    console.warn(`[weather] ${city.key}: ${e?.name === "TimeoutError" ? "انتهت المهلة" : e?.message ?? e}`);
    entry.nextFetchAt = nowMs + RETRY_AFTER_FAILURE_MS;
  }
}

/**
 * **طقسُ المدينة الآن** — أو `null`. أوّلُ طلبٍ لمدينة ينتظر الجلب؛ وبعده يُقرأ المحفوظ في الحال ويُجدَّد في الخلفية
 * إن شاخ، فلا ينتظر موظّفٌ الشبكةَ مرّةً ثانية. وطلبان معاً لا يجلبان مرّتين (`inflight`).
 */
export async function cityWeatherNow(city: WeatherCity, nowMs = Date.now()) {
  let entry = cache.get(city.key);
  if (!entry) {
    entry = { series: [], updatedAt: null, lastModified: null, nextFetchAt: 0, inflight: null };
    cache.set(city.key, entry);
  }
  if (nowMs >= entry.nextFetchAt && !entry.inflight) {
    const e = entry;
    e.inflight = refresh(city, e, nowMs).finally(() => { e.inflight = null; });
  }
  if (!entry.series.length && entry.inflight) await entry.inflight;
  const cur = currentFromSeries(entry.series, nowMs);
  return cur ? { ...cur, updatedAt: entry.updatedAt } : null;
}
