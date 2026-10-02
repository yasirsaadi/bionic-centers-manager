// إعداد بوت المريض — من البيئة وحدها.
//
// ══ لماذا البيئة لا قاعدة البيانات ══════════════════════════════════════
// بوت الإدارة (`notifications/telegram.ts`) يقرأ توكنه من `system_settings`
// عمداً: المالك يلصقه من لوحة التحكّم بلا إعادة نشر. وهذا **لا يصلح هنا**.
// توكن بوت المريض يفتح قناةً إلى مرضى المركز، وسرّ الـwebhook هو كل ما
// يفصل نقطتنا العامّة عن أي طارق. وضعُهما في جدول يعني أن نسخة القاعدة
// اليومية — التي تُرسَل بالبريد — تحملهما، وأن كل من يقرأ الجدول يملكهما.
// فيبقيان في بيئة الخادم: لا يُخزَّنان، ولا يُطبعان، ولا يُدقَّقان، ولا
// يظهران في ردّ.
//
// ══ وبوتان منفصلان تماماً ═══════════════════════════════════════════════
// هذه الوحدة لا تعرف بوت الإدارة ولا تقرأ إعداده. الخلط بينهما كان سيجعل
// رسالةً للمالك تصل مريضاً أو العكس — وهو خطأٌ لا يُكتشف إلا بعد وقوعه.

/**
 * مسار نقطة الـwebhook. هنا لا في `webhook.ts` كي يقرأه أمر الإعداد اليدوي
 * **بلا أن يجرّ معه القاعدة**: `webhook.ts` يستورد وحدة التذاكر ومنها
 * `db.ts`، فكان الأمر يطلب `DATABASE_URL` وهو لا يكلّم إلا تلغرام.
 */
export const PATIENT_WEBHOOK_PATH = "/api/integrations/telegram/patient/webhook";

/** أسماء المتغيّرات. **أسماء** لا قيم — الأسماء ليست سرّاً وطباعتها مفيدة. */
export const PATIENT_BOT_ENV = {
  token: "PATIENT_TELEGRAM_BOT_TOKEN",
  username: "PATIENT_TELEGRAM_BOT_USERNAME",
  webhookSecret: "PATIENT_TELEGRAM_WEBHOOK_SECRET",
} as const;

export interface PatientBotConfig {
  token: string;
  username: string;
  webhookSecret: string;
}

function readEnv(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * الإعداد الكامل أو `null`.
 *
 * **الثلاثة معاً أو لا شيء**: اسمُ البوت وحده يبني رابطاً عميقاً يقود إلى
 * بوتٍ لا نستطيع خدمته، والتوكن بلا سرٍّ يفتح نقطةً بلا حارس. فالتكامل
 * يعمل كاملاً أو يُعطَّل معلَناً — ولا حالة بين بين.
 *
 * ويُقرأ عند كل نداء لا مرّة واحدة عند الإقلاع: تغييرُ متغيّر في Render
 * يعيد التشغيل أصلاً، والقراءة الحيّة تجعل الاختبار يضبط البيئة ويقيس.
 */
export function patientBotConfig(): PatientBotConfig | null {
  const token = readEnv(PATIENT_BOT_ENV.token);
  const username = readEnv(PATIENT_BOT_ENV.username).replace(/^@/, "");
  const webhookSecret = readEnv(PATIENT_BOT_ENV.webhookSecret);
  if (!token || !username || !webhookSecret) return null;
  return { token, username, webhookSecret };
}

export function patientBotEnabled(): boolean {
  return patientBotConfig() !== null;
}

/** أسماء المتغيّرات الناقصة — للتشخيص. لا قيم، فلا تسريب. */
export function missingPatientBotEnv(): string[] {
  return Object.values(PATIENT_BOT_ENV).filter((name) => !readEnv(name));
}

/**
 * رابط الربط العميق الذي يُعطى للمريض.
 *
 * `?start=<token>` هو المسار القياسي في تلغرام: الضغط يفتح البوت ويرسل
 * `/start <token>` نيابةً عن المريض، فيصل النصّ إلينا بلا أن ينسخه أحد.
 *
 * **ولا يُخزَّن ولا يُدقَّق**: هو النصّ الخام نفسه بثوبٍ آخر، فحُكمه حُكمه —
 * يُعاد مرّة في ردّ الإصدار، ويُحجب من السجلّ باسم حقله.
 */
export function patientBotDeepLink(rawToken: string): string | null {
  const config = patientBotConfig();
  if (!config) return null;
  return `https://t.me/${config.username}?start=${encodeURIComponent(rawToken)}`;
}

/**
 * سطر حالة واحد عند الإقلاع. يُطبع **أسماء** المتغيّرات الناقصة لا قيمها،
 * فالتشخيص ممكن والسرّ باقٍ.
 */
export function patientBotStatusLine(): string {
  const missing = missingPatientBotEnv();
  return missing.length === 0
    ? "[patient-telegram] enabled"
    : `[patient-telegram] disabled — missing env: ${missing.join(", ")}`;
}
