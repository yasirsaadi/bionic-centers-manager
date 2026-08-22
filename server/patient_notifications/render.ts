// نصوص رسائل المريض — **المصدر الوحيد**.
//
// ══ مستقلّة عن القناة ═══════════════════════════════════════════════════
// تُرجع نصّاً عارياً: لا HTML ولا Markdown ولا أزرار ولا شيء من تلغرام.
// فحين تُضاف قناة ثانية تأخذ النصّ نفسه، ولا يُعاد كتابة الكتالوج.
//
// ══ وما لا يخرج إلى المريض إطلاقاً ══════════════════════════════════════
// اسم الجهاز ومواصفاته · نوع البتر · التشخيص · اسم الخبير · اسم الموظّف ·
// الحالة (توقّف/استئناف) · سبب التوقّف · سبب إعادة العمل · النتيجة
// النهائية · الملاحظات الداخلية · أي مبلغ.
//
// **وأهمّ ما يُحجَب هو الرجوع**: جهازٌ عاد من «جاهز للتجربة» إلى «التصنيع»
// لإعادة عمل فنّي يقرأ صاحبه «التصنيع والتجهيز» — موضعَه الحالي، لا قصّة
// كيف وصله. والسبب محفوظ داخلياً كاملاً.
//
// والحجب بنيوي لا لفظي: الحمولة التي تصل هنا لا تحمل إلا `stage` أو
// `expectedDeliveryDate`، ومعهما `serviceType` — فما لا يُمرَّر لا يُطبع.
//
// ══ و`serviceType` تصنيفٌ لا وصف ════════════════════════════════════════
// `prosthetic | medical_support` — يقول «أيّ أمرٍ من أمرَيك هذا» ولا يقول
// عن الجهاز حرفاً. وهو الاستثناء الوحيد في القائمة أعلاه، ومسوّغه أن
// المريض بأمرَين متوازيين كان يستلم رسالتين متطابقتين لا يميّزهما.
// وتفصيلُه في `patientDeviceName` أسفل الملفّ.

import { PATIENT_EVENT_TYPES } from "@shared/patient_events";
import { isCanonicalPatientCode } from "@shared/patient_code";

/**
 * **ترحيبُ التسجيل** — النوعُ الوحيد الذي لا يقابله حدثٌ في تاريخ المريض.
 *
 * ══ ولماذا ليس حدثاً ═══════════════════════════════════════════════════
 * فتحُ الملفّ واقعةٌ في السجلّ الإداري لا في تاريخ **الجهاز**. واختراعُ
 * `patient_event` له كان سيجعل سجلَّ الأحداث يقول «تغيّرت المرحلة» في يومٍ
 * لا جهازَ فيه أصلاً. فنوعٌ مستقلٌّ معلَن هنا، وعمودُ `patient_event_id`
 * يقبل الفراغ لأجله — والفهرسُ الجزئيّ
 * `uq_pnd_contact_link_type (contact, type) WHERE patient_event_id IS NULL`
 * يجعله **مرّةً واحدة لكلّ جهة** بحكم القاعدة لا بحكم الشيفرة.
 */
export const REGISTRATION_WELCOME = "registration.welcome";

/**
 * أسماء المراحل الستّ كما يقرؤها المريض. **لا أسماء داخلية ولا رموز.**
 * (وهي منفصلة عن `STAGE_LABELS` في `shared/manufacturing.ts` عمداً: تلك
 * لواجهة الموظّف وتحمل مراحل قديمة موسومة «سابقاً»، وهذه للمريض.)
 */
export const PATIENT_STAGE_LABELS: Record<string, string> = {
  order_received: "استلام أمر التصنيع",
  measurements: "القياسات والتقييم",
  mold: "أخذ وتجهيز القالب",
  manufacturing: "التصنيع والتجهيز",
  ready_for_fitting: "جاهز للتجربة والتسليم",
  delivered: "تم التسليم",
};

/** `YYYY-MM-DD` ⇒ `DD/MM/YYYY`. وما لا يطابق الشكل يُردّ فارغاً لا مشوَّهاً. */
export function formatPatientDate(iso: unknown): string | null {
  if (typeof iso !== "string") return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * اسم الجهاز كما يخاطَب به صاحبه — **المصدر الوحيد لهذا التمييز**.
 *
 * ══ لماذا التصنيف وحده ═════════════════════════════════════════════════
 * «جهازك» كانت تكفي حين كان المرسَل إليه واحداً. لكن المركز يخدم صنفين
 * مختلفَين تماماً، ومَن ينتظر مسنداً طبياً يقرأ «جهازك» فلا يعرف أعن مسنده
 * تتحدّث الرسالة أم عن طرفٍ لا يخصّه — خصوصاً مَن يحمل الاثنين معاً، فله
 * أمران متوازيان ورسائلهما متشابهة حرفياً.
 *
 * **والتصنيف العام هو كل ما يخرج**: `prosthetic | medical_support` ولا شيء
 * دونه — لا نوع الطرف، ولا نوع المسند، ولا موضع البتر، ولا التشخيص. فالفرق
 * بين «أيّ أمرٍ من أمرَيك هذا» و«ما هو جهازك بالضبط» هو الفرق بين تمييزٍ
 * يحتاجه المريض وبين ملفٍّ سريري في رسالة.
 *
 * ══ والقيم هي قيم النظام لا أسماء جديدة ═════════════════════════════════
 * `prosthetic_work_orders.service_type` (و`patient_cases.case_type`) لا
 * تعرفان إلا هاتين. والاسم العلمي `Orthosis` صحيح لكنه **ليس** قيمةً في
 * هذا النظام، فلا يُخترَع هنا رمزٌ ثالث لا يكتبه أحد.
 *
 * ══ وما لا يُعرَف يبقى «جهازك» ══════════════════════════════════════════
 * صفوف الصادر التي أُنشئت قبل اليوم لا تحمل `serviceType`، وكذلك أي قيمة
 * مستقبلية لم تُترجَم بعد. فالمجهول يرجع إلى النصّ القديم الآمن **ولا
 * يُرجِع `null`**: رسالةٌ صحيحة أقلّ تحديداً خيرٌ من رسالة تُخطّى بـ
 * `render_failed` فلا تصل صاحبها أبداً.
 */
export function patientDeviceName(serviceType: unknown): string {
  if (serviceType === "prosthetic") return "طرفك الصناعي";
  if (serviceType === "medical_support") return "مسندك الطبي";
  return "جهازك";
}

/** «في مركز بايونك» أُسقطت: النظام يخدم مجموعة مراكز الوارث وبايونك. */
function orderCreatedText(serviceType: unknown): string {
  return `تم استلام أمر تصنيع ${patientDeviceName(serviceType)} وبدأت إجراءات العمل عليه. ` +
    "سنوافيك بتحديثات مراحل العمل عبر هذه القناة.";
}

/**
 * **نصُّ الترحيب كما أملاه المالك — حرفاً بحرف.**
 *
 * ══ وما لا يخرج فيه ════════════════════════════════════════════════════
 * لا تشخيص · لا نوع بتر · لا جهاز ولا مواصفاته · لا سعر ولا دَين · لا اسم
 * طبيبٍ ولا خبير · ولا رقمُ صفٍّ داخليّ. **الاسمُ نفسُه لا يُرسَل**: رسالةٌ
 * تصل رقماً خاطئاً بالاسم تكشف مريضاً، وبالرمز وحده لا تكشف أحداً.
 *
 * ولا يُبنى النصُّ هنا للإرسال — القالبُ المعتمَد في Meta يحمل الصياغةَ
 * الثابتة، و`{{1}}` = **رمزُ المريض وحده**. وهذه الدالّة هي المرجعُ
 * المكتوب لتلك الصياغة، وهي ما يقرؤه الاختبار ليثبت أن لا شيءَ سواه يخرج.
 */
export const WELCOME_LINES = [
  "أهلاً وسهلاً بكم في مجموعة مراكز الدكتور ياسر الساعدي (الوارث وبايونك)",
  "تم تسجيل ملفكم بنجاح في نظام المراكز الموحد.",
  "سنبقيكم على اطلاع عبر هذا الرقم على المواعيد ومراحل الخدمة الخاصة بكم.",
  "رمز ملفكم: {{code}}",
  "نتمنى لكم دوام الصحة والعافية",
] as const;

/**
 * **المعامِلُ الوحيد للقالب** — رمزُ المريض القانونيّ.
 *
 * و`null` تعني «لا ترحيبَ يُرسَل»: ملفٌّ بلا رمزٍ قانونيّ لا نخترع له
 * واحداً، ولا نرسل رسالةً تقول «رمز ملفكم: undefined».
 */
function welcomeParam(payload: Record<string, unknown>): string | null {
  const code = payload.patientCode;
  return isCanonicalPatientCode(code) ? String(code) : null;
}

/** النصُّ الكامل كما يقرؤه المريض — للتوثيق والاختبار لا للإرسال. */
export function welcomePreview(patientCode: string): string {
  return WELCOME_LINES.map((l) => l.replace("{{code}}", patientCode)).join("\n");
}

/**
 * «أين جهازك الآن» بصيغةٍ واحدة لكل المراحل — لقطةُ حاضرٍ لا خبرُ تغيّر.
 * تُستعمل عند الربط، وللمرحلة الأولى حين يُصحَّح أمرٌ راجعاً إليها.
 */
function currentStageText(stage: unknown, serviceType: unknown): string | null {
  const label = typeof stage === "string" ? PATIENT_STAGE_LABELS[stage] : undefined;
  return label ? `حالة ${patientDeviceName(serviceType)} الحالية: ${label}.` : null;
}

/** نصّ المرحلة حسب موضعها. الأولى والأخيرتان لهنّ صيغهنّ الخاصّة. */
function stageText(stage: unknown, serviceType: unknown): string | null {
  const device = patientDeviceName(serviceType);
  switch (stage) {
    // بلوغُ المرحلة الأولى ليس «تحديثاً» — فيقرأها بصيغة اللقطة نفسها،
    // ومن الدالّة نفسها كي لا تُكتب الجملة في موضعين فينحرف أحدهما.
    case "order_received": return currentStageText(stage, serviceType);
    case "measurements": return `تم تحديث حالة ${device}: القياسات والتقييم.`;
    case "mold": return `تم تحديث حالة ${device}: أخذ وتجهيز القالب.`;
    case "manufacturing": return `تم تحديث حالة ${device}: التصنيع والتجهيز.`;
    case "ready_for_fitting": return `أصبح ${device} جاهزاً للتجربة والتسليم. يرجى التواصل مع المركز لتنسيق موعدك.`;
    case "delivered": return `تم تسجيل تسليم ${device} بنجاح. نتمنى لكم دوام الصحة والعافية.`;
    default: return null;
  }
}

function deliveryDateText(payload: Record<string, unknown>): string | null {
  const date = formatPatientDate(payload.expectedDeliveryDate);
  // لام الجرّ تلتصق بالثلاثة سواءً: لجهازك · لطرفك الصناعي · لمسندك الطبي.
  return date ? `موعد التسليم المتوقع ل${patientDeviceName(payload.serviceType)}: ${date}.` : null;
}

/**
 * النوع + الحمولة ⇒ نصّ، أو `null` لما لا نصّ له.
 *
 * و`null` ليست خطأً: نوعٌ لا يُرسَل (إسناد خبير مثلاً) أو حمولةٌ ناقصة
 * تعني «لا رسالة» — فيُخطّى الصفّ ولا يُعاد إلى الأبد.
 */
export function renderNotification(
  notificationType: string,
  payload: Record<string, unknown> | null | undefined,
): string | null {
  const p = payload ?? {};
  switch (notificationType) {
    case PATIENT_EVENT_TYPES.MANUFACTURING_ORDER_CREATED:
      return orderCreatedText(p.serviceType);

    // الثلاثة تقرأ المرحلة من الحمولة: الأنواع تميّز الأهمّية في السجلّ،
    // والنصّ يتبع الموضع. فلا تكرار لسلّم المراحل في ثلاثة مواضع.
    case PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED:
    case PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY:
    case PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED:
      return stageText(p.stage, p.serviceType);

    case PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED:
      return deliveryDateText(p);

    //  **ترحيبُ التسجيل يخرج بمعامِله لا بنصّه**: الصياغةُ الثابتة في
    //  القالب المعتمَد، والمتغيّرُ الوحيد رمزُ المريض. فما يعيده العارضُ
    //  هنا هو ما يُوضَع في `{{1}}` — لا جملةٌ تُرسَل كما هي.
    case REGISTRATION_WELCOME:
      return welcomeParam(p);

    // وكل ما عداه لا يُرسَل: إسناد خبير · توقّف · استئناف · صيانة ·
    // تسجيل مريض · دفعة · مواعيد. قائمة بيضاء، فالنوع الجديد صامت حتى
    // يُذكر هنا صراحةً.
    default:
      return null;
  }
}

/**
 * أيُّ القالبين يخصّ هذا النوع.
 *
 * ══ ولماذا قالبان ══════════════════════════════════════════════════════
 * الترحيبُ صياغةٌ ثابتة كاملة، ومتغيّرُه الوحيد رمزُ المريض. أما التحديثُ
 * فصياغتُه في `renderNotification` وتتغيّر بتغيّر المرحلة، فقالبُه غلافٌ
 * عامّ (`تحديث من …: {{1}}`). ودمجُهما في قالبٍ واحد كان سيجعل الترحيبَ
 * يُقرأ «تحديث من المركز: WB-١٢٣٤٥».
 *
 * والتمييزُ يُشتقّ من ثابتٍ واحد لا من قائمةٍ ثانية تنحرف عنه.
 */
export function templateKindFor(notificationType: string): "welcome" | "update" {
  return notificationType === REGISTRATION_WELCOME ? "welcome" : "update";
}

/**
 * الأنواعُ التي يخدمها قالبُ **الترحيب** — **مشتقّةٌ من التصنيف نفسه**.
 *
 * تُقرأ في `claimDue` لتصفية الطابور **قبل** `LIMIT`. وهي قائمةٌ صغيرة
 * لأن التصنيف نفسَه ثنائيّ: نوعٌ واحد للترحيب، وكلُّ ما عداه تحديث. ولو
 * أُضيف نوعُ ترحيبٍ ثانٍ يوماً فمكانُه هنا وفي `templateKindFor` معاً —
 * ولذلك تُشتقّ منها لا تُكتب بجوارها.
 */
export const WELCOME_NOTIFICATION_TYPES: string[] =
  [REGISTRATION_WELCOME].filter((t) => templateKindFor(t) === "welcome");

/** الأنواع التي لها نصّ فعلاً — يُشتقّ لا يُكتب مرّتين. */
export function isSendableType(notificationType: string): boolean {
  // حمولة نموذجية لكل عائلة: النوع الذي لا نصّ له بأي حمولة ليس قابلاً للإرسال.
  return renderNotification(notificationType, { stage: "manufacturing", expectedDeliveryDate: "2026-01-01" }) !== null;
}
