//  **اسمُ مكان الجهاز من خريطة OpenStreetMap** (§4.gl).
//
//    https://nominatim.openstreetmap.org/reverse
//
//  مجانيّ ويُسمح بالاستعمال التجاريّ بشروطه، وتُحترم هنا كلُّها:
//    • تعريفٌ صريحٌ في `User-Agent` (الجالبُ نفسُه للأرصاد).
//    • **طلبٌ واحد في الثانية على الأكثر** للخادم كلِّه (`SPACING_MS` — طابورٌ واحد).
//    • **الحفظُ**: الاسمُ لكلّ مكانٍ مقرَّب يُجلب مرّةً واحدة ويبقى، والفشلُ لا يُعاد قبل ساعة.
//    • وذكرُ المصدر في تفصيل الشريحة (`GEO_CREDIT` — «© OpenStreetMap»).
//
//  **وحدٌّ للأماكن الجديدة** (`admitPlace`): كلُّ مكانٍ جديد طلبٌ للأرصاد وطلبان للخريطة، فلا يُفتح أكثرُ من ستّين مكاناً جديداً
//  في الساعة للخادم كلِّه — وما زاد يأخذ مدينةَ الفرع كما كان.
import { placeNameFromAddress } from "@shared/weather";
import { WEATHER_USER_AGENT, weatherFetch } from "./metno";

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
const SPACING_MS = 1100;
const FETCH_TIMEOUT_MS = 6000;
export const GEO_RETRY_MS = 60 * 60 * 1000;
const MAX_NAMES = 500;
export const NEW_PLACES_PER_HOUR = 60;

export const reverseUrl = (lat: number, lon: number, lang: "ar" | "en") =>
  `${ENDPOINT}?format=jsonv2&lat=${lat}&lon=${lon}&zoom=10&accept-language=${lang}`;

interface NameEntry { ar: string | null; en: string | null; nextTryAt: number; inflight: Promise<void> | null }
const names = new Map<string, NameEntry>();
let queue: Promise<unknown> = Promise.resolve();
let lastAt = 0;
const seen = new Map<string, number>();
let windowStart = 0;
let windowCount = 0;

/** للاختبار وحده. */
export function resetGeocodeForTests() {
  names.clear();
  seen.clear();
  queue = Promise.resolve();
  lastAt = 0;
  windowStart = 0;
  windowCount = 0;
}

/** هل يُخدم هذا المكان؟ المعروفُ من قبل نعم دائماً، والجديدُ ما بقي في حدّ الساعة. */
export function admitPlace(key: string, nowMs: number): boolean {
  if (seen.has(key)) return true;
  if (nowMs - windowStart >= 60 * 60 * 1000) {
    windowStart = nowMs;
    windowCount = 0;
  }
  if (windowCount >= NEW_PLACES_PER_HOUR) return false;
  windowCount++;
  seen.set(key, nowMs);
  if (seen.size > MAX_NAMES) seen.delete(seen.keys().next().value!);
  return true;
}

/** طلبٌ واحد بعد الآخر، وبينهما ثانيةٌ على الأقلّ. */
function spaced<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastAt + SPACING_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastAt = Date.now();
    return job();
  });
  queue = run.catch(() => {});
  return run;
}

async function fetchName(lat: number, lon: number, lang: "ar" | "en"): Promise<string | null> {
  return spaced(async () => {
    try {
      const res = await weatherFetch(reverseUrl(lat, lon, lang), {
        headers: { "User-Agent": WEATHER_USER_AGENT, Accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.status !== 200) {
        console.warn(`[weather] geocode ${lat},${lon}: HTTP ${res.status}`);
        return null;
      }
      const body = await res.json();
      return placeNameFromAddress(body?.address);
    } catch (e: any) {
      console.warn(`[weather] geocode ${lat},${lon}: ${e?.name === "TimeoutError" ? "انتهت المهلة" : e?.message ?? e}`);
      return null;
    }
  });
}

/**
 * **اسمُ المكان بالعربية والإنكليزية** — أو `null` لما لم يُعرف بعد. أوّلُ طلبٍ للمكان ينتظر الجلب، وما بعده من المحفوظ.
 * والعربيُّ وحده يكفي ليُحفظ (الإنكليزيُّ للزرّ، وإن فشل قام العربيُّ مقامه).
 */
export async function placeName(key: string, lat: number, lon: number, nowMs = Date.now()): Promise<{ ar: string; en: string } | null> {
  let e = names.get(key);
  if (!e) {
    e = { ar: null, en: null, nextTryAt: 0, inflight: null };
    names.set(key, e);
    if (names.size > MAX_NAMES) names.delete(names.keys().next().value!);
  }
  if (!e.ar && !e.inflight && nowMs >= e.nextTryAt) {
    const entry = e;
    entry.inflight = (async () => {
      const ar = await fetchName(lat, lon, "ar");
      if (!ar) {
        entry.nextTryAt = nowMs + GEO_RETRY_MS;
        return;
      }
      entry.ar = ar;
      entry.en = (await fetchName(lat, lon, "en")) ?? ar;
    })().finally(() => { entry.inflight = null; });
  }
  if (!e.ar && e.inflight) await e.inflight;
  return e.ar ? { ar: e.ar, en: e.en ?? e.ar } : null;
}
