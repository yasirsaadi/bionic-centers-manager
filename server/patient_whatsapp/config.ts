// إعدادُ واتساب المريض — **من البيئة وحدها، ولا حرفَ منه في القاعدة**.
//
// ══ لماذا البيئة لا `system_settings` ═══════════════════════════════════
// بوتُ الإدارة يقرأ توكنه من الجدول عمداً (المالك يلصقه بلا نشر). وهذا
// **لا يصلح هنا**: توكنُ Meta يفتح قناةً إلى **مرضى المركز**، والنسخةُ
// الاحتياطية اليومية تُرسَل بالبريد. فسرٌّ في جدولٍ هو سرٌّ في صندوق بريد.
// يبقى في بيئة الخادم: لا يُخزَّن، ولا يُطبَع، ولا يُدقَّق، ولا يظهر في ردّ.
//
// ══ ولا انهيار حين لا يُضبَط ════════════════════════════════════════════
// **حفظُ المريض يجب ألّا يتعلّق بـMeta إطلاقاً.** مركزٌ لم يُكمل إعداده بعد
// يسجّل مرضاه كاملاً، وتبقى رسائلُهم في الطابور حتى يُضبط. فالتكاملُ
// يُعطَّل نظيفاً: `null` من كلّ دالّة، وسطرُ إقلاعٍ يقول **أسماء** الناقص.
//
// ══ وصادرٌ فقط — لا webhook ولا وارد ════════════════════════════════════
// لا ربطَ يُنتظَر، ولا أمرَ يُقرأ، ولا رسالةَ تصل من مريض. فلا `VERIFY_TOKEN`
// ولا `APP_SECRET` ولا نقطةَ عامّة: **ما لا يُستعمَل لا يُحفَظ إعدادُه.**

/** أسماءُ المتغيّرات. **أسماء** لا قيم — الأسماء تُطبع والقيمُ لا تُطبع. */
export const PATIENT_WHATSAPP_ENV = {
  accessToken: "PATIENT_WHATSAPP_ACCESS_TOKEN",
  phoneNumberId: "PATIENT_WHATSAPP_PHONE_NUMBER_ID",
  graphVersion: "PATIENT_WHATSAPP_GRAPH_VERSION",
  welcomeTemplate: "PATIENT_WHATSAPP_WELCOME_TEMPLATE_NAME",
  updateTemplate: "PATIENT_WHATSAPP_UPDATE_TEMPLATE_NAME",
  templateLanguage: "PATIENT_WHATSAPP_TEMPLATE_LANGUAGE",
} as const;

/** بلا هذين لا يمرّ نداءٌ واحد. وما عداهما له افتراضٌ أو يعطّل قالباً بعينه. */
const REQUIRED_ENV = [
  PATIENT_WHATSAPP_ENV.accessToken,
  PATIENT_WHATSAPP_ENV.phoneNumberId,
] as const;

/** إصدارُ Graph حين لا يُضبَط — يُرفَع بمتغيّرٍ لا بنشرِ شيفرة. */
export const DEFAULT_GRAPH_VERSION = "v21.0";
/** لغةُ القالب حين لا تُضبَط. عربيّة، فالرسائلُ كلُّها عربية. */
export const DEFAULT_TEMPLATE_LANGUAGE = "ar";

export interface PatientWhatsappConfig {
  accessToken: string;
  phoneNumberId: string;
  graphVersion: string;
  /**
   * أسماءُ القوالب المعتمَدة في Meta — **قد تكون فارغة**.
   *
   * وفراغُ أحدهما يعطّل **نوعَه وحده**: قالبُ الترحيب الناقص لا يمنع
   * تحديثاتِ التصنيع، والعكس. والصفوفُ تنتظر في الطابور ولا تُهدَر.
   */
  welcomeTemplate: string;
  updateTemplate: string;
  templateLanguage: string;
}

function readEnv(name: string): string {
  const v = process.env[name];
  return typeof v === "string" ? v.trim() : "";
}

/**
 * الإعدادُ أو `null`. يُقرأ عند كلّ نداء لا مرّةً عند الإقلاع: تغييرُ
 * متغيّرٍ في Render يعيد التشغيل أصلاً، والقراءةُ الحيّة تجعل الاختبار
 * يضبط البيئة ويقيس.
 */
export function patientWhatsappConfig(): PatientWhatsappConfig | null {
  const accessToken = readEnv(PATIENT_WHATSAPP_ENV.accessToken);
  const phoneNumberId = readEnv(PATIENT_WHATSAPP_ENV.phoneNumberId);
  if (!accessToken || !phoneNumberId) return null;
  return {
    accessToken, phoneNumberId,
    graphVersion: readEnv(PATIENT_WHATSAPP_ENV.graphVersion) || DEFAULT_GRAPH_VERSION,
    welcomeTemplate: readEnv(PATIENT_WHATSAPP_ENV.welcomeTemplate),
    updateTemplate: readEnv(PATIENT_WHATSAPP_ENV.updateTemplate),
    templateLanguage: readEnv(PATIENT_WHATSAPP_ENV.templateLanguage) || DEFAULT_TEMPLATE_LANGUAGE,
  };
}

export function patientWhatsappEnabled(): boolean {
  return patientWhatsappConfig() !== null;
}

/** أيُّ القالبين يخصّ هذا الصفّ. */
export type TemplateKind = "welcome" | "update";

/** اسمُ القالب المُعدّ لهذا النوع — أو `""` إن لم يُضبَط بعد. */
export function templateNameFor(kind: TemplateKind): string {
  const c = patientWhatsappConfig();
  if (!c) return "";
  return kind === "welcome" ? c.welcomeTemplate : c.updateTemplate;
}

/**
 * هل يمكن إرسالُ هذا النوع الآن؟
 *
 * **وهذا سؤالُ الطابور لا سؤالُ العميل**: صفٌّ لا قالبَ لنوعه **لا يُحجَز
 * أصلاً** — لا يُنادى Meta، ولا يُعدّ فشلاً، ولا يُحرَق عدّادُ محاولاته في
 * انتظارِ إعدادٍ لم يُكمِله المشغّل بعد. يبقى `pending` بـ`attempt_count = 0`
 * حتى يظهر الاسم، فيُرسَل الصفُّ **نفسُه** بلا تدخّل.
 */
export function templateReady(kind: TemplateKind): boolean {
  return patientWhatsappEnabled() && templateNameFor(kind).length > 0;
}

/** أسماءُ المتغيّرات الإلزامية الناقصة — للتشخيص. لا قيم، فلا تسريب. */
export function missingPatientWhatsappEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !readEnv(name));
}

/** سطرُ حالةٍ واحد عند الإقلاع — **أسماء** الناقص لا قيمه. */
export function patientWhatsappStatusLine(): string {
  const missing = missingPatientWhatsappEnv();
  if (missing.length > 0) {
    return `[patient-whatsapp] disabled — missing env: ${missing.join(", ")}`;
  }
  const pending = ([
    ["welcome", PATIENT_WHATSAPP_ENV.welcomeTemplate],
    ["update", PATIENT_WHATSAPP_ENV.updateTemplate],
  ] as const).filter(([k]) => !templateNameFor(k)).map(([, n]) => n);
  return pending.length === 0
    ? "[patient-whatsapp] enabled"
    : `[patient-whatsapp] enabled — templates pending: ${pending.join(", ")}`;
}

/**
 * وجهةُ واتساب من رقم E.164 — **أرقامٌ فقط كما يشترط المزوّد**.
 *
 * ══ ولا خوارزميةَ تطبيعٍ ثانية هنا ═════════════════════════════════════
 * التطبيعُ كلُّه في `shared/phone.ts` (`normalizePhone`) وهو نقطةُ الخنق
 * الوحيدة في النظام: تقرأ ٠٧٧٠١٢٣٤٥٦٧ و+٩٦٤٧٧٠… و٠٠٩٦٤… والأرقامَ
 * العربية-الهندية، وتُخرج `+9647701234567`. وهذه الدالّة **لا تفعل شيئاً
 * سوى نزع علامة الزائد** — لأن Graph لا يقبلها.
 *
 * وكتابةُ مطبِّعٍ ثانٍ هنا كانت ستُنتج رقمين مختلفين للمريض نفسه: واحدٌ في
 * `phone_e164` وآخرُ في جهة الاتصال، فلا يتطابقان أبداً وهما رقمٌ واحد.
 *
 * **ولا تخمينَ لرقمٍ معطوب**: ما لم يُطبَّع `e164` صالحاً يُردّ `null` —
 * ولا يُرسَل شيءٌ إلى وجهةٍ اخترعناها.
 */
export function whatsappDestination(e164: string | null | undefined): string | null {
  if (typeof e164 !== "string") return null;
  const t = e164.trim();
  if (!/^\+\d{8,15}$/.test(t)) return null;
  return t.slice(1);
}
