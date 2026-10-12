// عميل Bot API لبوت المريض — `sendMessage`، و`sendDocument` لورقة تمارين البيت (§4.ds).
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
export async function sendMessage(chatId: string, text: string, replyMarkup?: unknown): Promise<SendResult> {
  const config = patientBotConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
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

/** مهلةُ رفع الملفّ — أطولُ من الرسالة: ورقةٌ مصوَّرة ببضعة ميغابايت. */
const DOCUMENT_TIMEOUT_MS = 60_000;

/**
 * يرسل ملفّاً (ورقةَ تمارين البيت PDF — §4.ds) مع نصٍّ تحته. **لا يرمي أبداً**، ولا يطبع خطأً خاماً (التوكن في العنوان) — كـ`sendMessage`.
 */
export async function sendDocument(chatId: string, bytes: Uint8Array, fileName: string, caption: string): Promise<SendResult> {
  const config = patientBotConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOCUMENT_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", caption.slice(0, 1024));
    form.append("document", new Blob([bytes], { type: "application/pdf" }), fileName);
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendDocument`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(`[patient-telegram] sendDocument failed with status ${res.status}`);
      return { ok: false, reason: "api_error" };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Unknown";
    console.error(`[patient-telegram] sendDocument error (${name})`);
    return { ok: false, reason: name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
