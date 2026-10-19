//  **رصدُ المطارات القريبة** (§4.es التكملة — سؤالُ المالك «لماذا لا تقرأ من مصدر محلي أو قريب لتظهر الغبار»).
//
//    https://aviationweather.gov/api/data/metar
//
//  رسالةُ الرصد الساعية (METAR) لكلّ مطار — تكتبها محطّةُ أرصاد المطار نفسِه في العراق، وتنشرها الأرصادُ الأمريكية (NOAA) للجميع:
//  «في الملك العامّ … لأيّ غرضٍ مشروع» (weather.gov/disclaimer)، بلا ترخيصٍ ولا مفتاح. وفيها ما لا يعرفه التوقّع: الغبارُ العالق
//  والمتصاعد والعاصفةُ الترابية والسديمُ والرؤيةُ بالأمتار، والحرارةُ المرصودة فعلاً.
//
//  وشروطُه تُحترم: تعريفٌ في `User-Agent` (`WEATHER_USER_AGENT` نفسُه)، و**طلبٌ واحد للمطارات كلِّها** كلَّ عشر دقائق على الأكثر
//  (الحدُّ مئةٌ في الدقيقة)، وطلبٌ واحدٌ في الطريق، وتراجعُ خمس دقائق بعد الفشل، ولا جلبَ والتطبيقُ لا يُستعمل.
import { WEATHER_STATIONS, type StationObs } from "@shared/weather";
import { RETRY_AFTER_FAILURE_MS, WEATHER_USER_AGENT, weatherFetch } from "./metno";

const ENDPOINT = "https://aviationweather.gov/api/data/metar";
/** أقلُّ ما بين جلبين — الرسالةُ كلَّ ساعة، والخاصّةُ (`SPECI`) عند تغيّرٍ مفاجئ كعاصفةٍ ترابية. */
export const METAR_REFRESH_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;

let cache: { list: StationObs[]; nextFetchAt: number; inflight: Promise<void> | null } = { list: [], nextFetchAt: 0, inflight: null };
/** للاختبار وحده. */
export function resetMetarCacheForTests() { cache = { list: [], nextFetchAt: 0, inflight: null }; }

export const metarUrl = () => `${ENDPOINT}?ids=${WEATHER_STATIONS.map((s) => s.icao).join(",")}&format=json&hours=3`;

/** الجوابُ ⟵ رسائلُ المطارات بلحظاتها — وما لا يُقرأ يُترك بصمت. */
export function parseMetarJson(body: any): StationObs[] {
  if (!Array.isArray(body)) return [];
  const out: StationObs[] = [];
  for (const m of body) {
    const icao = typeof m?.icaoId === "string" ? m.icaoId.toUpperCase() : null;
    const raw = typeof m?.rawOb === "string" ? m.rawOb : null;
    const at = typeof m?.obsTime === "number" ? m.obsTime * 1000 : Date.parse(String(m?.reportTime ?? ""));
    if (!icao || !raw || !Number.isFinite(at)) continue;
    out.push({ icao, at, raw });
  }
  return out;
}

async function refresh(nowMs: number): Promise<void> {
  try {
    const res = await weatherFetch(metarUrl(), {
      headers: { "User-Agent": WEATHER_USER_AGENT, Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    //  ٢٠٤ = لا رسائلَ في الساعات الثلاث (المطاراتُ كلُّها ساكتة) — جوابٌ صحيح لا فشل.
    if (res.status === 204) { cache.list = []; cache.nextFetchAt = nowMs + METAR_REFRESH_MS; return; }
    if (res.status !== 200) {
      console.warn(`[weather] metar: HTTP ${res.status}`);
      cache.nextFetchAt = nowMs + RETRY_AFTER_FAILURE_MS;
      return;
    }
    cache.list = parseMetarJson(await res.json());
    cache.nextFetchAt = nowMs + METAR_REFRESH_MS;
  } catch (e: any) {
    console.warn(`[weather] metar: ${e?.name === "TimeoutError" ? "انتهت المهلة" : e?.message ?? e}`);
    cache.nextFetchAt = nowMs + RETRY_AFTER_FAILURE_MS;
  }
}

/**
 * **رسائلُ المطارات المحفوظة** — أوّلُ طلبٍ ينتظر الجلب، وما بعده يُقرأ في الحال ويُجدَّد في الخلفية. والقديمُ يبقى بعد الفشل؛
 * و«الحديث» يقرّره `pickObservation` (ساعتان ونصف) لا هذا الحفظ.
 */
export async function metarObservations(nowMs = Date.now()): Promise<StationObs[]> {
  const first = cache.nextFetchAt === 0;
  if (nowMs >= cache.nextFetchAt && !cache.inflight) {
    cache.inflight = refresh(nowMs).finally(() => { cache.inflight = null; });
  }
  if (first && cache.inflight) await cache.inflight;
  return cache.list;
}
