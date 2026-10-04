// إعدادُ بوت الموظّفين — **منفصلٌ تماماً عن بوت المرضى** (§4.by): معرّفُ المحادثة يخصّ كلَّ بوتٍ على حدة،
// فرسالةُ موظّفٍ لا تصل مريضاً ولو أخطأ توجيه، وإيقافُ أحدهما لا يقطع الآخر. ومن البيئة وحدها (كبوت المرضى):
// التوكنُ والسرُّ لا يدخلان القاعدة ولا نسختَها اليومية.
import { publicBaseUrl } from "../patient_telegram/config";

export const STAFF_WEBHOOK_PATH = "/api/integrations/telegram/staff/webhook";

export const STAFF_BOT_ENV = {
  token: "STAFF_TELEGRAM_BOT_TOKEN",
  username: "STAFF_TELEGRAM_BOT_USERNAME",
  webhookSecret: "STAFF_TELEGRAM_WEBHOOK_SECRET",
} as const;

export interface StaffBotConfig { token: string; username: string; webhookSecret: string }

function readEnv(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/** الثلاثةُ معاً أو لا شيء — كبوت المرضى. ويُقرأ عند كلّ نداء. */
export function staffBotConfig(): StaffBotConfig | null {
  const token = readEnv(STAFF_BOT_ENV.token);
  const username = readEnv(STAFF_BOT_ENV.username).replace(/^@/, "");
  const webhookSecret = readEnv(STAFF_BOT_ENV.webhookSecret);
  if (!token || !username || !webhookSecret) return null;
  return { token, username, webhookSecret };
}

export function missingStaffBotEnv(): string[] {
  return Object.values(STAFF_BOT_ENV).filter((name) => !readEnv(name));
}

export function staffBotStatusLine(): string {
  const missing = missingStaffBotEnv();
  return missing.length === 0
    ? "[staff-telegram] enabled"
    : `[staff-telegram] disabled — missing env: ${missing.join(", ")}`;
}

export function staffBotDeepLink(rawToken: string): string | null {
  const config = staffBotConfig();
  if (!config) return null;
  return `https://t.me/${config.username}?start=${encodeURIComponent(rawToken)}`;
}

/** رابطُ صفحةٍ في التطبيق لزرّ الرسالة — أو `null` بلا عنوانٍ عامّ. */
export function appUrl(path: string | null | undefined): string | null {
  const base = publicBaseUrl();
  if (!base || !path) return null;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export { publicBaseUrl };
