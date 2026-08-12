// عميل Bot API لبوت المريض — `sendMessage` وحدها اليوم.
//
// ══ بلا مكتبة ═══════════════════════════════════════════════════════════
// Bot API طلبُ HTTPS واحد، و`fetch` في Node 20 يكفيه. ومكتبة كاملة كانت
// ستجرّ معها استقصاءً (polling) وحالةً وتبعيات لا نحتاج منها شيئاً.
//
// ══ والتوكن في المسار — فلا يُطبع خطأٌ خام أبداً ════════════════════════
// عنوان Bot API يحمل التوكن في مساره: `/bot<TOKEN>/sendMessage`. فأي خطأ
// شبكة قد يحمل العنوان في نصّه أو في `cause`، وطباعتُه تسرّب التوكن إلى
// سجلّ Render. لذلك **لا يُطبع كائن الخطأ ولا رسالته** — اسم النوع وحده،
// وهو يكفي للتشخيص (`AbortError` مهلة، `TypeError` شبكة) ولا يحمل عنواناً.

import { patientBotConfig } from "./config";

/** مهلة الطلب. تلغرام سريع، والانتظار الطويل يعلّق مستمع الـwebhook. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface SendResult {
  ok: boolean;
  /** سبب مصنَّف للتشخيص — **بلا نصّ خطأ خام**. */
  reason?: "disabled" | "timeout" | "network" | "api_error";
}

/**
 * يرسل رسالة نصّية. **لا يرمي أبداً** — يُرجع نتيجة.
 *
 * الرمي هنا كان سيصعد إلى معالج الـwebhook فيُفشل طلباً نجح فيه ما يهمّ
 * (الربط في القاعدة). فالإرسال «أطلق وأبلغ»: يقول نجح أم لا، ولا يُسقط شيئاً.
 */
export async function sendMessage(chatId: string, text: string): Promise<SendResult> {
  const config = patientBotConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
      signal: controller.signal,
    });
    if (!res.ok) {
      // **ولا جسم الردّ يُطبع**: تلغرام يعيد العنوان أحياناً في وصف الخطأ.
      console.error(`[patient-telegram] sendMessage failed with status ${res.status}`);
      return { ok: false, reason: "api_error" };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Unknown";
    console.error(`[patient-telegram] sendMessage error (${name})`);
    return { ok: false, reason: name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
