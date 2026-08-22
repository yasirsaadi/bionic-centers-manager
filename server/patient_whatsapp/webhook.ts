// نقطةُ webhook لواتساب المريض — **نقطةٌ عامّة ثانية، بحارسٍ أقوى**.
//
// ══ بلا جلسة، وما يحرسها بدلاً منها ═════════════════════════════════════
// Meta هي مَن يناديها ولا جلسةَ لها. فالحارسان:
//
//   • **GET**: `hub.verify_token` — آليّةُ المزوّد نفسه للتحقّق من ملكيّة
//     النقطة. وهي الموضعُ **الوحيد** الذي يمرّ فيه سرٌّ عبر سلسلة استعلام،
//     ولا خيار: Meta لا تعرف غيرها. ولذلك هو سرٌّ منفصل عن كلّ ما عداه —
//     تسريبُه لا يعطي أحداً قدرةَ إرسال ولا قدرةَ تزوير.
//   • **POST**: توقيعُ `X-Hub-Signature-256` — HMAC-SHA256 بسرِّ التطبيق
//     **على الجسم الخام**. والخامُ لا المُفكَّك: `JSON.parse` ثم
//     `JSON.stringify` يعيد ترتيبَ المفاتيح ويغيّر المسافات، فيختلف التوقيع
//     عن جسمٍ صحيح. و`express.json({ verify })` في `server/index.ts` يلتقط
//     الخام أصلاً في `req.rawBody` — فلا يحتاج هذا الملفّ محلِّلاً ثانياً
//     ولا مسارَ `express.raw` موازياً.
//
// ══ ولا ثقة بشكل التحديث ════════════════════════════════════════════════
// ما يصل هنا نصٌّ من الإنترنت. كلُّ حقلٍ يُفحص قبل قراءته، وما لا نفهمه
// يُتجاهَل بـ200: إيصالاتُ التسليم (`statuses`) والصور والصوت وردودُ الأزرار
// والمجموعات وأيُّ حقلٍ آخر. و200 ليست تساهلاً — هي ما يمنع Meta من إعادة
// الإرسال إلى الأبد لتحديثٍ لن نعالجه أصلاً.
//
// ══ والهويّةُ من المزوّد، والملفُّ من التذكرة ═══════════════════════════
// **التذكرةُ تقرّر أيّ ملفّ. والمرسِلُ يقرّر أيّ حساب.** ولا يُقرأ من جسم
// الطلب اسمٌ ولا رقمُ مريضٍ ولا شيءٌ يدّعيه المرسِل عن نفسه — ولا يُقرأ
// `patients.phone` إطلاقاً: رقمٌ في ملفّ ليس موافقةَ صاحبه.
//
// ══ ولا تمييز في الرسائل ════════════════════════════════════════════════
// «غير موجودة» و«مسحوبة» و«مستهلَكة» و«منتهية» تُجيب بنصٍّ **واحد**. فرقٌ
// في الردّ يجعل الرابطَ أداةَ استكشاف.

import type { Express } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import { LinkTokenError } from "../patient_contacts/store";
import { patientCodesReply, NO_LINKED_PATIENT } from "../patient_code/messages";
import {
  patientWhatsappConfig, patientWhatsappStatusLine,
  WHATSAPP_WEBHOOK_PATH, LINK_COMMAND, normalizeWhatsappId,
} from "./config";
import { sendText } from "./client";
// الوسيط: هو مَن يعرف التصنيع، لا هذه الوحدة.
import { redeemAndWelcome } from "../patient_notifications/welcome";
import { nudgeDispatcher } from "../patient_notifications/dispatcher";

export { WHATSAPP_WEBHOOK_PATH };
const SIGNATURE_HEADER = "x-hub-signature-256";

/** رسائلُ المريض — عربية، قصيرة، وبلا معلومةٍ داخلية واحدة. */
export const WHATSAPP_MESSAGES = {
  invalid: "رابط الربط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد من المركز.",
  noPayload: "لبدء الربط، افتح رابط الربط الذي زوّدك به المركز.",
  noLinkedPatient: NO_LINKED_PATIENT,
} as const;

/**
 * مقارنةٌ ثابتة الزمن.
 *
 * تُقارَن **بصمتا** النصّين لا النصّان: `timingSafeEqual` ترمي على اختلاف
 * الطول، فالمقارنةُ المباشرة كانت تُسرّب الطولَ عبر فرق المسار. والبصمتان
 * بطولٍ واحد دائماً، فلا يبقى إلا زمنٌ ثابت.
 */
function constantTimeEquals(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = createHmac("sha256", "cmp").update(provided, "utf8").digest();
  const b = createHmac("sha256", "cmp").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

/**
 * توقيعُ Meta على الجسم الخام.
 *
 * الترويسة `sha256=<hex>`. ويُقارَن **بعد** إعادة الحساب لا قبله، وبمقارنةٍ
 * ثابتة الزمن — فمَن يجرّب توقيعاتٍ لا يتعلّم من زمن الردّ أينَ اختلف.
 */
export function whatsappSignatureFor(rawBody: Buffer | string, appSecret: string): string {
  const mac = createHmac("sha256", appSecret)
    .update(typeof rawBody === "string" ? Buffer.from(rawBody, "utf8") : rawBody)
    .digest("hex");
  return `sha256=${mac}`;
}

function signatureValid(header: unknown, rawBody: unknown, appSecret: string): boolean {
  if (typeof header !== "string" || !header.startsWith("sha256=")) return false;
  // **الخامُ إلزاميّ.** غيابُه يعني أن الجسم لم يُلتقَط — فيُرفض الطلبُ ولا
  // يُعاد بناؤه من المُفكَّك: توقيعٌ على نصٍّ أعدنا نحن تركيبَه لا يُثبت شيئاً.
  if (!Buffer.isBuffer(rawBody) && typeof rawBody !== "string") return false;
  return constantTimeEquals(header, whatsappSignatureFor(rawBody as Buffer | string, appSecret));
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function firstOf(v: unknown): Record<string, unknown> | null {
  return Array.isArray(v) && isObject(v[0]) ? (v[0] as Record<string, unknown>) : null;
}

export interface InboundMessage {
  /** هويّةُ المرسِل من المزوّد — أرقامٌ مطبَّعة. */
  from: string;
  /** نصُّ الرسالة كما كتبه، مشذَّبٌ من الفراغ لا أكثر. */
  text: string;
}

/**
 * يستخرج رسالةً نصّيةً واحدة من تحديث Meta — أو `null`.
 *
 * **قراءةٌ دفاعية حقلاً بحقل**: كلُّ مستوى يُفحص قبل النزول إليه، فلا يصل
 * إلى منطق الربط إلا شكلٌ عرفناه. وكلُّ ما عداه (`statuses`، الصور، الصوت،
 * الأزرار، الحقول الأخرى) يخرج `null` فيُتجاهَل بـ200.
 *
 * والهويّةُ من `messages[].from` — وهو `wa_id` المرسِل عند Meta. **لا**
 * `contacts[].profile.name` (يكتبه صاحبُ الحساب بنفسه ويغيّره متى شاء)،
 * ولا أيُّ رقمٍ في نصّ الرسالة.
 */
export function parseInboundMessage(update: unknown): InboundMessage | null {
  if (!isObject(update)) return null;
  const entry = firstOf(update.entry);
  if (!entry) return null;
  const change = firstOf(entry.changes);
  if (!change) return null;
  // حقلُ الرسائل وحده. `statuses` تصل في نفس البنية بحقلٍ آخر.
  if (change.field !== undefined && change.field !== "messages") return null;
  const value = isObject(change.value) ? change.value : null;
  if (!value) return null;
  const message = firstOf(value.messages);
  if (!message) return null;
  if (message.type !== undefined && message.type !== "text") return null;

  const from = normalizeWhatsappId(message.from);
  if (!from) return null;

  const textNode = isObject(message.text) ? message.text : null;
  const body = textNode && typeof textNode.body === "string" ? textNode.body : "";
  return { from, text: body.trim() };
}

/**
 * حمولةُ أمر الربط إن وُجدت.
 *
 * `null` تعني «ليست أمرَ ربط» فتُتجاهَل، و`""` تعني «ربطٌ بلا تذكرة» فيُرشَد
 * المريض. والتفريقُ مقصود: نصٌّ آخر لا يستحقّ رسالة، وأمرٌ عارٍ يستحقّها.
 *
 * ويُقبل `/start <token>` أيضاً — مَن نسخ رابطَ تلغرام القديم أو أُعطي
 * تعليماتٍ قديمة لا يُترك في العتمة أثناء الانتقال.
 */
export function parseLinkCommand(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const t = text.trim();
  const m = t.match(new RegExp(`^(?:${LINK_COMMAND}|/start)(?:\\s+(\\S+))?$`));
  if (!m) return null;
  return m[1] ?? "";
}

/**
 * هل هي «رمزي» — سؤالُ «ما رمزُ ملفّي؟».
 *
 * بلا وسائطَ إطلاقاً: «رمزي 5» ليست سؤالاً بل محاولةَ استعلامٍ عن ملفٍّ آخر،
 * فتُتجاهَل صامتةً. والهويّةُ من المزوّد على أي حال فلا يفيد الرقمُ شيئاً.
 *
 * و`/id` مقبولٌ معها: نفسُ المفهوم في تلغرام، ومَن اعتاده لا يُطالَب بتعلّم
 * غيره لأننا بدّلنا القناة.
 */
export function isCodeCommand(text: unknown): boolean {
  if (typeof text !== "string") return false;
  return /^(?:رمزي|\/id)$/.test(text.trim());
}

export function registerPatientWhatsappWebhook(app: Express) {
  console.log(patientWhatsappStatusLine());

  // ══ GET — تحقّقُ ملكيّة النقطة ═══════════════════════════════════════
  // Meta تناديها مرّةً عند ضبط الـwebhook. الردُّ **نصُّ التحدّي عارياً**
  // لا JSON — هكذا يشترط المزوّد، وردٌّ آخر يُفشل الضبط بلا رسالةٍ مفهومة.
  app.get(WHATSAPP_WEBHOOK_PATH, (req: any, res) => {
    const config = patientWhatsappConfig();
    if (!config) return res.status(503).json({ ok: false });

    const q = (req.query ?? {}) as Record<string, unknown>;
    const mode = q["hub.mode"];
    const token = q["hub.verify_token"];
    const challenge = q["hub.challenge"];
    if (mode !== "subscribe" || !constantTimeEquals(token, config.verifyToken)) {
      // ٤٠٣ كما يتوقّع المزوّد. **ولا يُقال أيُّ الشرطين فشل.**
      return res.status(403).json({ ok: false });
    }
    return res.status(200).type("text/plain").send(String(challenge ?? ""));
  });

  // ══ POST — التحديثات الواردة ═════════════════════════════════════════
  app.post(WHATSAPP_WEBHOOK_PATH, async (req: any, res) => {
    const config = patientWhatsappConfig();
    // معطَّل ⇒ لا يُقبل شيء. غيابُ السرّ لا يعني «بلا حارس».
    if (!config) return res.status(503).json({ ok: false });

    if (!signatureValid(req.headers?.[SIGNATURE_HEADER], req.rawBody, config.appSecret)) {
      return res.status(401).json({ ok: false });
    }

    try {
      const inbound = parseInboundMessage(req.body);
      // شكلٌ لا نعالجه ⇒ 200 صامتة، فلا تُعيد Meta إرسالَه إلى الأبد.
      if (!inbound) return res.json({ ok: true });

      // ══ «رمزي» — رمزُ ملفّي ═══════════════════════════════════════════
      // **الهويّةُ من المزوّد وحده**، والمنطقُ مشتركٌ مع تلغرام حرفياً.
      // ولا حدثَ مريضٍ يُسجَّل: سؤالُ المريض عن رمزه ليس واقعةً في ملفّه.
      if (isCodeCommand(inbound.text)) {
        await sendText(inbound.from, await patientCodesReply("whatsapp", inbound.from));
        return res.json({ ok: true });
      }

      const rawToken = parseLinkCommand(inbound.text);
      // **ولا محادثةَ آلية**: نصٌّ لا نعرفه يُتجاهَل صامتاً. البوتُ الذي
      // يردّ على كلّ شيء يُغري بالحديث معه، وهذه قناةُ إشعاراتٍ لا محادثة.
      if (rawToken === null) return res.json({ ok: true });

      if (rawToken === "") {
        await sendText(inbound.from, WHATSAPP_MESSAGES.noPayload);
        return res.json({ ok: true });
      }

      // **الاستهلاكُ ورسائلُه في معاملةٍ واحدة.** تعثّرُ القاعدة يُرجِع
      // الاستهلاكَ والجهةَ والصفوفَ معاً، فتبقى التذكرة صالحةً لإعادةِ
      // محاولةِ Meta — بدل مريضٍ مربوطٍ لا يصله شيء ولا أحد يعلم.
      let linked = false;
      try {
        await redeemAndWelcome({ rawToken, externalId: inbound.from });
        linked = true;
      } catch (err) {
        // **الخطأ التقني يصعد** فيردّ ٥٠٠ وتعيد Meta المحاولة. والمبتلَع
        // هنا هو ما كان يصنع الضياعَ الصامت.
        if (!(err instanceof LinkTokenError)) throw err;
        // منتهية · مسحوبة · مستهلَكة · غير موجودة ⇒ نصٌّ واحد. والمعادُ
        // إرسالُه من Meta يقع هنا بـ«مستهلَكة»: بلا صفٍّ ثانٍ وبلا ٥٠٠.
      }

      if (!linked) {
        await sendText(inbound.from, WHATSAPP_MESSAGES.invalid);
        return res.json({ ok: true });
      }

      // كبسةٌ كي يصل الترحيبُ في ثوانٍ لا في دقيقة. «أطلق وانسَ»، وبعد
      // الحفظ لا قبله.
      nudgeDispatcher();
      return res.json({ ok: true });
    } catch {
      // خطأٌ غير متوقَّع (قاعدة بيانات مثلاً): **٥٠٠ عمداً** كي تعيد Meta
      // المحاولة. و200 هنا كانت ستبتلع التحديثَ إلى الأبد.
      // ولا يُطبع الخطأ: قد يحمل نصَّ التذكرة من الطلب.
      console.error("[patient-whatsapp] webhook failed");
      return res.status(500).json({ ok: false });
    }
  });
}
