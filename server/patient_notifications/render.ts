// نصوص رسائل المريض — **المصدر الوحيد**.
//
// ══ مستقلّة عن القناة ═══════════════════════════════════════════════════
// تُرجع نصّاً عارياً: لا HTML ولا Markdown ولا أزرار ولا شيء من تلغرام.
// فحين تُضاف قناة ثانية تأخذ النصّ نفسه، ولا يُعاد كتابة الكتالوج.
//
// ══ وما لا يخرج إلى المريض إطلاقاً ══════════════════════════════════════
// اسم الجهاز · نوع البتر · التشخيص · اسم الخبير · اسم الموظّف · الحالة
// (توقّف/استئناف) · سبب التوقّف · سبب إعادة العمل · النتيجة النهائية ·
// الملاحظات الداخلية · أي مبلغ.
//
// **وأهمّ ما يُحجَب هو الرجوع**: جهازٌ عاد من «جاهز للتجربة» إلى «التصنيع»
// لإعادة عمل فنّي يقرأ صاحبه «التصنيع والتجهيز» — موضعَه الحالي، لا قصّة
// كيف وصله. والسبب محفوظ داخلياً كاملاً.
//
// والحجب بنيوي لا لفظي: الحمولة التي تصل هنا لا تحمل إلا `stage` أو
// `expectedDeliveryDate` أصلاً، فما لا يُمرَّر لا يُطبع.

import { PATIENT_EVENT_TYPES } from "@shared/patient_events";

/**
 * أنواع لا تقابلها أحداث في تاريخ المريض.
 *
 * رسالة الترحيب ولقطة الحالة عند الربط ليستا واقعةً جديدة — لا شيء تغيّر
 * في الجهاز. فاختراع `patient_event` لهما كان سيجعل سجلّ الأحداث يكذب:
 * «تغيّرت المرحلة» في يومٍ لم تتغيّر فيه. لذلك نوعٌ مستقلّ معلَن هنا،
 * وعمود `patient_event_id` يقبل الفراغ لأجلها.
 */
export const LINK_NOTIFICATION_TYPES = {
  WELCOME: "link.welcome",
  CURRENT_STAGE: "link.current_stage",
  DELIVERY_DATE: "link.delivery_date",
} as const;

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

const ORDER_CREATED_TEXT =
  "تم استلام أمر تصنيع جهازك في مركز بايونك وبدأت إجراءات العمل عليه. " +
  "سنوافيك بتحديثات مراحل العمل عبر هذه القناة.";

const WELCOME_TEXT =
  "مرحباً بك في مجموعة مراكز بايونك للأطراف الذكية والعلاج الطبيعي. " +
  "تم ربط حساب Telegram بملفك في نظام بايونك الموحد بنجاح.";

/** نصّ المرحلة حسب موضعها. الأولى والأخيرتان لهنّ صيغهنّ الخاصّة. */
function stageText(stage: unknown): string | null {
  switch (stage) {
    case "order_received": return "حالة جهازك الحالية: استلام أمر التصنيع.";
    case "measurements": return "تم تحديث حالة جهازك: القياسات والتقييم.";
    case "mold": return "تم تحديث حالة جهازك: أخذ وتجهيز القالب.";
    case "manufacturing": return "تم تحديث حالة جهازك: التصنيع والتجهيز.";
    case "ready_for_fitting": return "جهازك جاهز للتجربة والتسليم. يرجى متابعة موعدك مع المركز.";
    case "delivered": return "تم تسجيل تسليم الجهاز بنجاح. نتمنى لكم دوام الصحة والعافية.";
    default: return null;
  }
}

function deliveryDateText(payload: Record<string, unknown>): string | null {
  const date = formatPatientDate(payload.expectedDeliveryDate);
  return date ? `موعد التسليم المتوقع لجهازك: ${date}.` : null;
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
      return ORDER_CREATED_TEXT;

    // الثلاثة تقرأ المرحلة من الحمولة: الأنواع تميّز الأهمّية في السجلّ،
    // والنصّ يتبع الموضع. فلا تكرار لسلّم المراحل في ثلاثة مواضع.
    case PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED:
    case PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY:
    case PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED:
      return stageText(p.stage);

    case PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED:
    case LINK_NOTIFICATION_TYPES.DELIVERY_DATE:
      return deliveryDateText(p);

    case LINK_NOTIFICATION_TYPES.WELCOME:
      return WELCOME_TEXT;

    // لقطة الحالة عند الربط: **حالة** لا **تحديث** — المريض لم يتغيّر عنده
    // شيء الآن، هو فقط يرى أين وصل. فصيغتها ثابتة لكل المراحل.
    case LINK_NOTIFICATION_TYPES.CURRENT_STAGE: {
      const label = typeof p.stage === "string" ? PATIENT_STAGE_LABELS[p.stage] : undefined;
      return label ? `حالة جهازك الحالية: ${label}.` : null;
    }

    // وكل ما عداه لا يُرسَل: إسناد خبير · توقّف · استئناف · صيانة ·
    // تسجيل مريض · دفعة · مواعيد. قائمة بيضاء، فالنوع الجديد صامت حتى
    // يُذكر هنا صراحةً.
    default:
      return null;
  }
}

/** الأنواع التي لها نصّ فعلاً — يُشتقّ لا يُكتب مرّتين. */
export function isSendableType(notificationType: string): boolean {
  // حمولة نموذجية لكل عائلة: النوع الذي لا نصّ له بأي حمولة ليس قابلاً للإرسال.
  return renderNotification(notificationType, { stage: "manufacturing", expectedDeliveryDate: "2026-01-01" }) !== null;
}
