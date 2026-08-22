// عميلُ Cloud API لواتساب المريض — **قالبٌ فقط، ولا شيء غيره**.
//
// ══ لماذا القالبُ وحده ══════════════════════════════════════════════════
// كلُّ رسالةٍ نرسلها **يبدأها المركز**: ترحيبُ التسجيل يقع لحظةَ الحفظ،
// وتحديثُ المرحلة قد يقع بعد ثلاثة أسابيع من آخر كلمةٍ قالها المريض. ولا
// نافذةَ محادثةٍ مفتوحة يجوز افتراضُها في أيٍّ منهما — سياسةُ واتساب تشترط
// قالباً معتمَداً لما يبدأه العمل. فالنصُّ الحرّ لا مكانَ له هنا أصلاً.
//
// ══ بلا مكتبة ═══════════════════════════════════════════════════════════
// نداءُ Graph طلبُ HTTPS واحد، و`fetch` في Node 20 يكفيه. ومكتبةُ Meta
// الكاملة كانت ستجرّ استقصاءً وحالةً وتبعيات لا نحتاج منها حرفاً.
//
// ══ ولا يُطبع سرٌّ ولا جسمُ ردّ ══════════════════════════════════════════
// التوكن في ترويسة `Authorization`، وجسمُ خطأ Graph يحمل `fbtrace_id`
// ومعرّفاتٍ ورقمَ المستقبِل. فـ**لا يُطبع جسمُ ردٍّ ولا كائنُ خطأ ولا
// رسالتُه** — اسمُ نوع الخطأ ورمزُ الحالة وحدهما، وهما يكفيان للتشخيص.
//
// ══ ولا يرمي أبداً ══════════════════════════════════════════════════════
// يُرجع نتيجةً مصنَّفة. الرميُ كان سيصعد إلى عامل الصادر فيُسقط الدفعة كلَّها
// من أجل صفٍّ واحد.

import { patientWhatsappConfig, templateNameFor, type TemplateKind } from "./config";

/** مهلةُ الطلب. Graph سريع، والانتظارُ الطويل يعلّق عامل الصادر. */
const REQUEST_TIMEOUT_MS = 10_000;

export interface WhatsappSendResult {
  ok: boolean;
  /** سببٌ مصنَّف للتشخيص — **بلا نصّ خطأ خام ولا جسم ردّ**. */
  reason?: "disabled" | "no_template" | "timeout" | "network" | "api_error" | "template_error";
}

/**
 * يرسل قالباً بمعامِلٍ واحد.
 *
 * ══ قالبان لا اثنا عشر ═════════════════════════════════════════════════
 * ستُّ مراحل × نوعَي جهاز = اثنا عشر قالباً يُعتمَد كلٌّ منها في Meta على
 * حدة، وأيُّ تعديلٍ في صياغةٍ عربية يعيد دورةَ الاعتماد كلَّها. فقالبان
 * فقط — ترحيبٌ وتحديث — بمعامِلٍ واحد `{{1}}`:
 *
 *   • الترحيب: `{{1}}` = **رمزُ المريض القانونيّ** (وحده).
 *   • التحديث: `{{1}}` = **نصُّ `renderNotification` نفسه**.
 *
 * فالكتالوجُ يبقى في الشيفرة لا في لوحة Meta، ولا تُكتب صياغةُ المراحل
 * مرّتين. والاسمُ واللغةُ من الإعداد: مركزٌ يغيّر قالبه لا يحتاج نشراً.
 */
export async function sendTemplate(
  toWaId: string,
  kind: TemplateKind,
  bodyParam: string,
): Promise<WhatsappSendResult> {
  const config = patientWhatsappConfig();
  if (!config) return { ok: false, reason: "disabled" };

  const name = templateNameFor(kind);
  // قالبٌ بلا اسمٍ ليس نداءً يُجرَّب: Graph سيردّ ٤٠٠ ويُحرَق عدّادُ محاولاتٍ
  // في انتظارِ إعدادٍ لم يُكمِله أحد. والعاملُ لا يبلغ هنا أصلاً (يفحص
  // `templateReady` قبل الحجز) — وهذا حزامٌ ثانٍ لا أكثر.
  if (!name) return { ok: false, reason: "no_template" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    // العنوان يحمل `phoneNumberId` وهو معرّفُ حساب المركز — **لا يُطبع**.
    const res = await fetch(
      `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          // **لا تُطبع هذه الترويسة في أي مسار.**
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toWaId,
          type: "template",
          template: {
            name,
            language: { code: config.templateLanguage },
            components: [{ type: "body", parameters: [{ type: "text", text: bodyParam }] }],
          },
        }),
        signal: controller.signal,
      },
    );
    if (!res.ok) {
      // رمزُ الحالة وحده. ولا `res.text()` — جسمُ خطأ Graph يحمل معرّفات.
      console.error(`[patient-whatsapp] template send failed with status ${res.status}`);
      // ٤٠٠/٤٠٤ على قالبٍ **مُعدٍّ فعلاً** = رفضٌ حقيقيّ من Meta (غيرُ معتمَد،
      // أو معاملاتُه لا تطابق). وهو عطلُ إعدادٍ لا عطلُ شبكة، فيُميَّز كي
      // يقرأه المشغّل في عمود الخطأ — ويتبع قواعدَ الإعادة كغيره.
      const templateProblem = res.status === 400 || res.status === 404;
      return { ok: false, reason: templateProblem ? "template_error" : "api_error" };
    }
    return { ok: true };
  } catch (err) {
    const name2 = err instanceof Error ? err.name : "Unknown";
    console.error(`[patient-whatsapp] template send error (${name2})`);
    return { ok: false, reason: name2 === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}
