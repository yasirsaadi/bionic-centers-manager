// النواقل — **القناةُ ⟶ كيف تُرسَل**، ولا شيء غيره.
//
// ══ لماذا سجلٌّ لا شرطٌ في العامل ═══════════════════════════════════════
// كان العاملُ ينادي `sendMessage` من تلغرام مباشرةً. وإضافةُ واتساب بشرطٍ
// `if (channel === "whatsapp")` كانت ستضع منطقَ قناتين في جسم حلقةٍ واحدة،
// ثم ثلاثاً، ثم يصير العاملُ يعرف كلَّ مزوّدٍ في العالم.
//
// فالعاملُ يعرف شيئاً واحداً: «أعطني ناقلَ هذا الصفّ». والناقلُ يعرف مزوّدَه
// ولا يعرف الصادرَ ولا التصنيع ولا نصَّ رسالة.
//
// ══ ووضعان لا واحد ══════════════════════════════════════════════════════
// `text` لنافذةِ محادثةٍ مفتوحة، و`template` لما يقع بعدها بأيام. وتلغرام
// لا يفرّق (البوتُ يرسل متى شاء)، فيتجاهل الوضعَ ويرسل نصّاً — والتفريقُ
// ليس تعقيداً زائداً بل واقعُ سياسةِ واتساب.

import { patientBotEnabled } from "../patient_telegram/config";
import { sendMessage } from "../patient_telegram/client";
import { patientWhatsappEnabled } from "../patient_whatsapp/config";
import { sendText, sendTemplate } from "../patient_whatsapp/client";
import { SUPPORTED_CHANNELS, type DeliveryChannel, type DeliveryErrorCode } from "./outbox";

/**
 * وضعُ الإرسال.
 *
 * `session` — بعد رسالةِ المريض مباشرةً: نافذةُ الخدمة مفتوحة فيمرّ النصّ.
 * `initiated` — بدأه المركز بعد يومٍ أو شهر: لا نافذةَ مفتوحة يُفترَض وجودُها،
 *               فيلزم قالبٌ معتمَد.
 */
export type SendMode = "session" | "initiated";

export interface TransportResult {
  ok: boolean;
  /** رمزٌ من القائمة المغلقة — **لا نصَّ مزوّدٍ خام أبداً**. */
  code?: DeliveryErrorCode;
}

export interface PatientTransport {
  channel: DeliveryChannel;
  /** مُعدٌّ بالكامل الآن؟ يُقرأ حيّاً — تغييرُ متغيّرٍ يسري بلا إعادة بناء. */
  enabled(): boolean;
  send(externalId: string, text: string, mode: SendMode): Promise<TransportResult>;
  /** رمزُ «تعذّر لأن الناقل معطَّل» — للحالة التي تُكتشف أثناء الإرسال. */
  disabledCode: DeliveryErrorCode;
}

const telegram: PatientTransport = {
  channel: "telegram",
  enabled: patientBotEnabled,
  disabledCode: "telegram_disabled",
  // **تلغرام لا يعرف نوافذَ خدمة**: البوتُ يرسل إلى مَن بدأ محادثته متى شاء.
  // فالوضعُ يُتجاهَل عمداً لا سهواً — ولا يُخترَع له قالبٌ لا يحتاجه.
  async send(externalId, text) {
    const res = await sendMessage(externalId, text);
    if (res.ok) return { ok: true };
    return {
      ok: false,
      code: res.reason === "timeout" ? "telegram_timeout"
        : res.reason === "network" ? "telegram_network"
        : res.reason === "disabled" ? "telegram_disabled"
        : "telegram_api_error",
    };
  },
};

const whatsapp: PatientTransport = {
  channel: "whatsapp",
  enabled: patientWhatsappEnabled,
  disabledCode: "whatsapp_disabled",
  async send(externalId, text, mode) {
    const res = mode === "session"
      ? await sendText(externalId, text)
      : await sendTemplate(externalId, text);
    if (res.ok) return { ok: true };
    return {
      ok: false,
      code: res.reason === "timeout" ? "whatsapp_timeout"
        : res.reason === "network" ? "whatsapp_network"
        : res.reason === "disabled" ? "whatsapp_disabled"
        : res.reason === "template_error" ? "whatsapp_template_error"
        : "whatsapp_api_error",
    };
  },
};

const REGISTRY: Record<DeliveryChannel, PatientTransport> = { telegram, whatsapp };

export function transportFor(channel: unknown): PatientTransport | null {
  return typeof channel === "string" && channel in REGISTRY
    ? REGISTRY[channel as DeliveryChannel]
    : null;
}

/**
 * القنواتُ التي يمكن إرسالُها الآن فعلاً.
 *
 * تُمرَّر إلى `claimDue` فلا يُحجَز صفٌّ لا ناقلَ له. والقائمةُ تُحسَب في كلّ
 * دورة: متغيّرٌ يُضاف على Render يبدأ الإرسالَ في الدورة التالية بلا نشر.
 */
export function enabledChannels(): DeliveryChannel[] {
  return SUPPORTED_CHANNELS.filter((c) => REGISTRY[c].enabled());
}
