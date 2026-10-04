// عميلُ Bot API لبوت الموظّفين — نسخةُ عميل المرضى بحرفها على إعدادٍ آخر: بلا مكتبة، ولا يرمي،
// **ولا يطبع خطأً خاماً** (التوكنُ في مسار العنوان).
import { staffBotConfig } from "./config";

const REQUEST_TIMEOUT_MS = 10_000;

export interface StaffSendResult {
  ok: boolean;
  reason?: "disabled" | "timeout" | "network" | "api_error" | "blocked";
}

export async function sendStaffMessage(chatId: string, text: string, replyMarkup?: unknown): Promise<StaffSendResult> {
  const config = staffBotConfig();
  if (!config) return { ok: false, reason: "disabled" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true, ...(replyMarkup ? { reply_markup: replyMarkup } : {}) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error(`[staff-telegram] sendMessage failed with status ${res.status}`);
      //  ٤٠٣: الموظّفُ حظر البوت أو حذف المحادثة — لا تُعاد المحاولةُ له.
      return { ok: false, reason: res.status === 403 ? "blocked" : "api_error" };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Unknown";
    console.error(`[staff-telegram] sendMessage error (${name})`);
    return { ok: false, reason: name === "TimeoutError" || name === "AbortError" ? "timeout" : "network" };
  }
}
