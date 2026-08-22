// عميلُ Cloud API لواتساب المريض — نصٌّ وقالب، ولا شيء غيرهما.
//
// ══ بلا مكتبة ═══════════════════════════════════════════════════════════
// نداءُ Graph طلبُ HTTPS واحد، و`fetch` في Node 20 يكفيه — نفسُ قرار عميل
// تلغرام. ومكتبةُ Meta الكاملة كانت ستجرّ استقصاءً وحالةً وتبعيات لا نحتاج
// منها حرفاً.
//
// ══ والتوكن في الترويسة — فلا يُطبع خطأٌ خام أبداً ══════════════════════
// خلافاً لتلغرام (توكنُه في المسار)، توكنُ Meta في `Authorization`. وهذا لا
// يعني الأمان: جسمُ ردّ Graph عند الخطأ يحمل `fbtrace_id` ورسائلَ قد تحمل
// معرّفاتٍ ورقمَ المريض. فـ**لا يُطبع جسمُ ردّ ولا كائنُ خطأ ولا رسالتُه** —
// اسمُ نوع الخطأ ورمزُ الحالة وحدهما، وهما يكفيان للتشخيص ولا يحملان شيئاً.
//
// ══ ولا يرمي أبداً ══════════════════════════════════════════════════════
// يُرجع نتيجةً مصنَّفة. الرميُ كان سيصعد إلى عامل الصادر فيُسقط الدفعة كلَّها
// من أجل صفٍّ واحد.

import { patientWhatsappConfig } from "./config";

/** مهلةُ الطلب. Graph سريع، والانتظارُ الطويل يعلّق عامل الصادر. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface WhatsappSendResult {
  ok: boolean;
  /** سببٌ مصنَّف للتشخيص — **بلا نصّ خطأ خام ولا جسم ردّ**. */
  reason?: "disabled" | "timeout" | "network" | "api_error" | "template_error";
}

/** عنوانُ النداء. **لا يُطبع**: يحمل `phoneNumberId` وهو معرّفُ حسابِ المركز. */
function graphUrl(version: string, phoneNumberId: string): string {
  return `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
}

async function post(body: unknown, kind: "text" | "template"): Promise<WhatsappSendResult> {
  const config = patientWhatsappConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(graphUrl(config.graphVersion, config.phoneNumberId), {
      method: "POST",
      headers: {
        // **لا تُطبع هذه الترويسة في أي مسار.**
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      // رمزُ الحالة وحده. ولا `res.text()` — جسمُ خطأ Graph يحمل معرّفات.
      console.error(`[patient-whatsapp] send failed with status ${res.status}`);
      // ٤٠٠ على قالبٍ = قالبٌ غير معتمَد أو معاملاتُه لا تطابق. وهو عطلُ
      // إعدادٍ لا عطلُ شبكة، فيُميَّز كي يقرأه المشغّل في عمود الخطأ.
      const templateProblem = kind === "template" && (res.status === 400 || res.status === 404);
      return { ok: false, reason: templateProblem ? "template_error" : "api_error" };
    }
    return { ok: true };
  } catch (err) {
    const name = err instanceof Error ? err.name : "Unknown";
    console.error(`[patient-whatsapp] send error (${name})`);
    return { ok: false, reason: name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * رسالةٌ نصّية — **لنافذة المحادثة المفتوحة وحدها**.
 *
 * تصلح مباشرةً بعد أن يرسل المريضُ رسالة الربط: نافذةُ الخدمة مفتوحة، ولا
 * قالبَ يلزم. وبعد أن تُغلق النافذة يردّ Graph خطأً — ولذلك لا تُستعمل
 * للتحديثات المتأخّرة، ولا يُصلحها إلحاحٌ ولا إعادةُ محاولة.
 */
export async function sendText(toWaId: string, text: string): Promise<WhatsappSendResult> {
  return post({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toWaId,
    type: "text",
    text: { preview_url: false, body: text },
  }, "text");
}

/**
 * رسالةُ قالبٍ معتمَد — **للتحديثات التي تقع بعد أيامٍ أو أسابيع**.
 *
 * ══ ولماذا قالبٌ واحد لا قالبٌ لكلّ مرحلة ══════════════════════════════
 * ستُّ مراحل × نوعَي جهاز = اثنا عشر قالباً تُعتمَد كلٌّ منها في Meta على
 * حدة، وأيُّ تعديلٍ في صياغةٍ عربية يعيد دورةَ الاعتماد كلَّها. وقالبٌ واحد
 * بمعاملٍ واحد `{{1}}` يجعل **الكتالوج يبقى في `render.ts`** حيث هو — فلا
 * ينتقل نصُّ المريض إلى لوحة Meta ولا يُكتب مرّتين.
 *
 * والاسمُ واللغةُ من الإعداد لا من الشيفرة: مركزٌ يغيّر قالبه لا يحتاج نشراً.
 */
export async function sendTemplate(toWaId: string, bodyParam: string): Promise<WhatsappSendResult> {
  const config = patientWhatsappConfig();
  if (!config) return { ok: false, reason: "disabled" };
  // قالبٌ بلا اسمٍ ليس نداءً يُجرَّب: Graph سيردّ ٤٠٠، والصفُّ سيدخل تباعدَ
  // إعادةٍ لا يعالج شيئاً. فيُقال صراحةً «إعدادٌ ناقص» ويبقى الصفُّ للتالية.
  if (!config.templateName) return { ok: false, reason: "template_error" };
  return post({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: toWaId,
    type: "template",
    template: {
      name: config.templateName,
      language: { code: config.templateLanguage },
      components: [{ type: "body", parameters: [{ type: "text", text: bodyParam }] }],
    },
  }, "template");
}
