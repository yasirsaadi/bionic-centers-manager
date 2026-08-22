// إعدادُ واتساب المريض — **من البيئة وحدها، ولا حرفَ منه في القاعدة**.
//
// ══ لماذا البيئة لا `system_settings` ═══════════════════════════════════
// بوتُ الإدارة يقرأ توكنه من الجدول عمداً (المالك يلصقه بلا نشر). وهذا
// **لا يصلح هنا** — ولا هناك: توكنُ Meta وسرُّ التطبيق يفتحان قناةً إلى
// **مرضى المركز**، والنسخةُ الاحتياطية اليومية تُرسَل بالبريد. فسرٌّ في
// جدولٍ هو سرٌّ في صندوق بريد. يبقيان في بيئة الخادم: لا يُخزَّنان، ولا
// يُطبعان، ولا يُدقَّقان، ولا يظهران في ردّ.
//
// ══ ولا انهيار حين لا يُضبَط ════════════════════════════════════════════
// مركزٌ لم يُكمل إعداد Meta بعد يجب أن يعمل نظامُه كاملاً — بلا واتساب.
// فالتكاملُ **يُعطَّل نظيفاً**: `null` من كلّ دالّة، وسطرُ إقلاعٍ يقول
// **أسماء** المتغيّرات الناقصة (الأسماء ليست سرّاً، والقيمُ لا تُطبع أبداً).
//
// ══ وقناتان لا واحدة أثناء الانتقال ═════════════════════════════════════
// هذه الوحدة لا تعرف تلغرام ولا تقرأ إعداده. الخلطُ بينهما كان سيجعل
// رسالةً لحسابٍ تصل حساباً آخر — خطأٌ لا يُكتشف إلا بعد وقوعه.

/**
 * مسارُ نقطة الـwebhook. هنا لا في `webhook.ts` كي يقرأه أمرُ إعدادٍ يدويّ
 * **بلا أن يجرّ معه القاعدة** — نفسُ سبب `PATIENT_WEBHOOK_PATH` في تلغرام.
 */
export const WHATSAPP_WEBHOOK_PATH = "/api/integrations/whatsapp/patient/webhook";

/** أسماءُ المتغيّرات. **أسماء** لا قيم — الأسماء تُطبع والقيمُ لا تُطبع. */
export const PATIENT_WHATSAPP_ENV = {
  accessToken: "PATIENT_WHATSAPP_ACCESS_TOKEN",
  phoneNumberId: "PATIENT_WHATSAPP_PHONE_NUMBER_ID",
  businessPhone: "PATIENT_WHATSAPP_BUSINESS_PHONE",
  verifyToken: "PATIENT_WHATSAPP_VERIFY_TOKEN",
  appSecret: "PATIENT_WHATSAPP_APP_SECRET",
  graphVersion: "PATIENT_WHATSAPP_GRAPH_VERSION",
  templateName: "PATIENT_WHATSAPP_TEMPLATE_NAME",
  templateLanguage: "PATIENT_WHATSAPP_TEMPLATE_LANGUAGE",
} as const;

/**
 * المتغيّراتُ التي بلا قيمةٍ لها لا يعمل شيء. والثلاثةُ الأخرى لها افتراضٌ
 * معقول (`graphVersion`) أو تُعطّل **وضعَ القالب وحده** لا التكاملَ كلّه.
 */
const REQUIRED_ENV = [
  PATIENT_WHATSAPP_ENV.accessToken,
  PATIENT_WHATSAPP_ENV.phoneNumberId,
  PATIENT_WHATSAPP_ENV.businessPhone,
  PATIENT_WHATSAPP_ENV.verifyToken,
  PATIENT_WHATSAPP_ENV.appSecret,
] as const;

/** إصدارُ Graph حين لا يُضبَط — يُرفَع بمتغيّرٍ لا بنشرِ شيفرة. */
export const DEFAULT_GRAPH_VERSION = "v21.0";
/** لغةُ القالب حين لا تُضبَط. عربيّة، فالرسائلُ كلُّها عربية. */
export const DEFAULT_TEMPLATE_LANGUAGE = "ar";

export interface PatientWhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
  /** رقمُ المركز التجاري بصيغةٍ دولية بلا رموز — إليه يُرسل المريض الربط. */
  businessPhone: string;
  verifyToken: string;
  appSecret: string;
  graphVersion: string;
  /**
   * اسمُ القالب المعتمَد في Meta — **قد يكون فارغاً**. وفراغُه يعطّل
   * الرسائلَ المتأخّرة وحدها (تحديثات التصنيع)، ولا يمنع الربطَ ولا
   * رسائلَه الفورية. فمركزٌ ينتظر اعتمادَ قالبه يربط مرضاه من اليوم.
   */
  templateName: string;
  templateLanguage: string;
}

function readEnv(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * أرقامٌ فقط. `+964 770 123 4567` و`00964...` و`(770)` كلُّها تصل من بشرٍ
 * يكتبون بيدهم، وMeta لا تعرف إلا الأرقام. والتطبيعُ **في مكانٍ واحد**
 * كي لا يُقارَن رقمٌ مُطبَّع بآخر خام فلا يتطابقان وهما واحد.
 */
export function normalizeWhatsappId(raw: unknown): string {
  if (typeof raw !== "string" && typeof raw !== "number") return "";
  return String(raw).replace(/\D+/g, "");
}

/**
 * الإعدادُ الكامل أو `null`.
 *
 * **الخمسةُ الإلزامية معاً أو لا شيء**: رقمٌ بلا توكن يبني رابطاً يقود إلى
 * محادثةٍ لا نستطيع الردّ فيها، وتوكنٌ بلا سرِّ تطبيق يفتح نقطةً بلا حارس.
 * فالتكاملُ يعمل كاملاً أو يُعطَّل معلَناً — ولا حالةَ بين بين.
 *
 * ويُقرأ عند كلّ نداء لا مرّةً عند الإقلاع: تغييرُ متغيّرٍ في Render يعيد
 * التشغيل أصلاً، والقراءةُ الحيّة تجعل الاختبار يضبط البيئة ويقيس.
 */
export function patientWhatsappConfig(): PatientWhatsappConfig | null {
  const accessToken = readEnv(PATIENT_WHATSAPP_ENV.accessToken);
  const phoneNumberId = readEnv(PATIENT_WHATSAPP_ENV.phoneNumberId);
  const businessPhone = normalizeWhatsappId(readEnv(PATIENT_WHATSAPP_ENV.businessPhone));
  const verifyToken = readEnv(PATIENT_WHATSAPP_ENV.verifyToken);
  const appSecret = readEnv(PATIENT_WHATSAPP_ENV.appSecret);
  if (!accessToken || !phoneNumberId || !businessPhone || !verifyToken || !appSecret) return null;
  return {
    accessToken, phoneNumberId, businessPhone, verifyToken, appSecret,
    graphVersion: readEnv(PATIENT_WHATSAPP_ENV.graphVersion) || DEFAULT_GRAPH_VERSION,
    templateName: readEnv(PATIENT_WHATSAPP_ENV.templateName),
    templateLanguage: readEnv(PATIENT_WHATSAPP_ENV.templateLanguage) || DEFAULT_TEMPLATE_LANGUAGE,
  };
}

export function patientWhatsappEnabled(): boolean {
  return patientWhatsappConfig() !== null;
}

/**
 * هل يمكن إرسالُ **رسالةٍ متأخّرة** (خارج نافذة المحادثة)؟
 *
 * تحتاج قالباً معتمَداً باسمه. وغيابُه ليس عطلاً: الربطُ ورسائلُه الفورية
 * تعمل، وتحديثاتُ التصنيع تنتظر اعتمادَ القالب — وتبقى في الطابور بحالة
 * `pending` تُرسَل حين يُضبَط، لا تُهدَر.
 */
export function patientWhatsappTemplateReady(): boolean {
  const c = patientWhatsappConfig();
  return c !== null && c.templateName.length > 0;
}

/** أسماءُ المتغيّرات الإلزامية الناقصة — للتشخيص. لا قيم، فلا تسريب. */
export function missingPatientWhatsappEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !readEnv(name));
}

/**
 * نصُّ رسالة الربط التي **يرسلها المريضُ بنفسه** إلى المركز.
 *
 * ══ ولماذا يرسلها هو ═══════════════════════════════════════════════════
 * هذا هو الفرقُ كلُّه بين هويّةٍ أثبتها صاحبُها وبين رقمٍ نسخناه من ملفّه.
 * `patients.phone` رقمٌ كتبه موظّفٌ عن ورقة — لا يقول إنّ صاحب حساب واتساب
 * على ذلك الرقم وافق أن تصله تحديثاتُ جهازه، ولا حتى إنّ الرقم ما زال له.
 * فالرسالةُ الواردة هي الموافقة والإثباتُ معاً.
 *
 * والكلمةُ عربيّة بسيطة يفهمها مَن يقرؤها قبل أن يضغط إرسال.
 */
export const LINK_COMMAND = "ربط";

export function linkMessageText(rawToken: string): string {
  return `${LINK_COMMAND} ${rawToken}`;
}

/**
 * الرابطُ العميق الذي يُعطى للمريض — `wa.me` برسالةٍ مُعبّأة.
 *
 * الضغطُ يفتح واتساب على محادثة المركز والنصُّ جاهزٌ في الحقل، فلا ينسخ
 * المريضُ شيئاً ولا يكتبه. ثم **يضغط إرسال بنفسه** — وتلك ضغطتُه هو.
 *
 * **ولا يُخزَّن ولا يُدقَّق**: هو النصُّ الخام نفسه بثوبٍ آخر، فحُكمه حُكمه —
 * يُعاد مرّةً في ردّ الإصدار، ويُحجب من السجلّ باسم حقله.
 */
export function patientWhatsappDeepLink(rawToken: string): string | null {
  const config = patientWhatsappConfig();
  if (!config) return null;
  const raw = String(rawToken ?? "");
  if (!raw) return null;
  return `https://wa.me/${config.businessPhone}?text=${encodeURIComponent(linkMessageText(raw))}`;
}

/** سطرُ حالةٍ واحد عند الإقلاع — **أسماء** الناقص لا قيمه. */
export function patientWhatsappStatusLine(): string {
  const missing = missingPatientWhatsappEnv();
  if (missing.length > 0) {
    return `[patient-whatsapp] disabled — missing env: ${missing.join(", ")}`;
  }
  return patientWhatsappTemplateReady()
    ? "[patient-whatsapp] enabled"
    : `[patient-whatsapp] enabled (text only) — missing env: ${PATIENT_WHATSAPP_ENV.templateName}`;
}
