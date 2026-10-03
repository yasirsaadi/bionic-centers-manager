// **التحقّق من هويّة فاتح البطاقة** — توقيعُ تلغرام على `initData` (§4.bv).
//
// صفحاتُ تلغرام المصغّرة (Mini Apps) تحمل `initData` موقَّعاً بتوكن البوت. والخادمُ وحده يعرف التوكن، فلا يزوّره
// المتصفّح ولا مَن نسخ الرابط. الخوارزميةُ من وثائق تلغرام بحرفها:
//   secret = HMAC_SHA256(key = "WebAppData", data = bot_token)
//   hash   = hex(HMAC_SHA256(key = secret, data = data_check_string))
//   data_check_string = الأزواجُ عدا `hash` مرتّبةً أبجدياً «key=value» يفصلها سطرٌ جديد.
// ومعه **حدُّ عمر**: توقيعٌ قديم (نُسخ من سجلٍّ أو جهاز) لا يُقبل بعد ٢٤ ساعة.
import { createHmac, timingSafeEqual } from "crypto";

export const INIT_DATA_MAX_AGE_SEC = 24 * 60 * 60;

export type InitDataResult =
  | { ok: true; telegramUserId: string; authDate: number }
  | { ok: false; reason: "missing" | "bad_hash" | "expired" | "no_user" };

export function verifyInitData(initData: unknown, botToken: string, nowSec = Math.floor(Date.now() / 1000)): InitDataResult {
  if (typeof initData !== "string" || !initData || !botToken) return { ok: false, reason: "missing" };
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, reason: "bad_hash" };
  const pairs: string[] = [];
  params.forEach((v, k) => { if (k !== "hash") pairs.push(`${k}=${v}`); });
  pairs.sort();
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(pairs.join("\n")).digest();
  const given = Buffer.from(hash, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return { ok: false, reason: "bad_hash" };
  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate) || nowSec - authDate > INIT_DATA_MAX_AGE_SEC) return { ok: false, reason: "expired" };
  try {
    const user = JSON.parse(params.get("user") ?? "null");
    const id = user?.id;
    if (typeof id !== "number" && typeof id !== "string") return { ok: false, reason: "no_user" };
    return { ok: true, telegramUserId: String(id), authDate };
  } catch {
    return { ok: false, reason: "no_user" };
  }
}

/** للاختبار: يبني `initData` موقَّعاً كما يبنيه تلغرام. */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const pairs = Object.entries(fields).map(([k, v]) => `${k}=${v}`).sort();
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secret).update(pairs.join("\n")).digest("hex");
  const params = new URLSearchParams(fields);
  params.set("hash", hash);
  return params.toString();
}
