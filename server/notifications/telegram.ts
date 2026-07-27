// Telegram notifications — the owner's instant "new patient" ping.
//
// Design constraints, in order of importance:
//   1. NEVER in the way: a Telegram failure (bad token, network, rate limit)
//      must not fail or slow the request that triggered it. Every send is
//      fire-and-forget with a logged error, and callers use `void notify…()`.
//   2. Zero-redeploy configuration: the bot token and chat id live in
//      system_settings, editable from the admin panel — not in env vars.
//   3. No libraries: Telegram's Bot API is one HTTPS POST; Node 20's global
//      fetch covers it.
//
// Setup flow (admin panel «تنبيهات تلغرام»): the owner pastes the BotFather
// token and presses the test button; if no chat id is stored yet we resolve it
// from getUpdates (the owner has pressed Start on the bot, so their chat is
// the latest update) and store it.

import { storage } from "../storage";

const SETTING_TOKEN = "telegram_bot_token";
const SETTING_CHAT_ID = "telegram_chat_id";

async function getConfig(): Promise<{ token: string; chatId: string } | null> {
  const [token, chatId] = await Promise.all([
    storage.getSystemSetting(SETTING_TOKEN),
    storage.getSystemSetting(SETTING_CHAT_ID),
  ]);
  if (!token || !chatId) return null;
  return { token, chatId };
}

/** Raw send. Returns true on success; never throws. */
export async function sendTelegram(text: string): Promise<boolean> {
  try {
    const config = await getConfig();
    if (!config) return false; // not configured — silently a no-op
    const res = await fetch(`https://api.telegram.org/bot${config.token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] send failed:", err);
    return false;
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function baghdadTime(): string {
  return new Date().toLocaleString("ar-IQ", {
    timeZone: "Asia/Baghdad",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** The agreed "new patient" message. Name + branch + type + who — no phone. */
export async function notifyNewPatient(params: {
  name: string;
  branchName: string;
  serviceLabel: string;
  registeredBy: string;
}): Promise<void> {
  const text =
    `🆕 <b>مريض جديد</b> — ${escapeHtml(params.name)}\n` +
    `الفرع: ${escapeHtml(params.branchName)} · النوع: ${escapeHtml(params.serviceLabel)}\n` +
    `سجّله: ${escapeHtml(params.registeredBy)} · ${baghdadTime()}`;
  await sendTelegram(text);
}

/**
 * Admin-panel test: verify the token, resolve the chat id from getUpdates when
 * none is stored yet (the owner pressed Start, so their chat is in the
 * updates), persist it, and send a hello. Returns a user-facing Arabic status.
 */
export async function testAndLink(): Promise<{ ok: boolean; message: string; chatId?: string }> {
  const token = await storage.getSystemSetting(SETTING_TOKEN);
  if (!token) return { ok: false, message: "احفظ توكن البوت أولاً" };

  let chatId = await storage.getSystemSetting(SETTING_CHAT_ID);
  try {
    if (!chatId) {
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
      const data: any = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        return { ok: false, message: "التوكن مرفوض من تلغرام — تأكّد من نسخه كاملاً من BotFather" };
      }
      const chats = (data.result ?? [])
        .map((u: any) => u?.message?.chat?.id)
        .filter((id: any) => id !== undefined && id !== null);
      if (chats.length === 0) {
        return {
          ok: false,
          message: "لم أجد محادثة — افتح بوتك في تلغرام واضغط Start ثم أعد المحاولة",
        };
      }
      chatId = String(chats[chats.length - 1]);
      await storage.setSystemSetting(SETTING_CHAT_ID, chatId);
    }
    const sent = await sendTelegram("✅ تم ربط تنبيهات تلغرام — ستصلك رسالة عند تسجيل كل مريض جديد.");
    return sent
      ? { ok: true, message: "أُرسلت رسالة تجريبية — تفقّد تلغرام", chatId }
      : { ok: false, message: "تعذّر الإرسال — تأكّد من التوكن ومن ضغط Start على البوت", chatId };
  } catch (err) {
    console.error("[telegram] test failed:", err);
    return { ok: false, message: "تعذّر الاتصال بتلغرام — حاول مجدداً" };
  }
}

export const TELEGRAM_SETTINGS = { SETTING_TOKEN, SETTING_CHAT_ID };
