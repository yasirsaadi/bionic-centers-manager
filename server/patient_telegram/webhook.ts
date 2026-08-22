// نقطة webhook لبوت المريض — **النقطة العامّة الوحيدة في النظام**.
//
// ══ لماذا هي بلا جلسة، وما يحرسها بدلاً منها ═══════════════════════════
// تلغرام هو مَن يناديها، ولا جلسة له. فالحارس سرٌّ مشترك يرسله تلغرام في
// ترويسة `X-Telegram-Bot-Api-Secret-Token` — ويُقارَن **مقارنةً ثابتة
// الزمن**، ولا يُقبل من مسار العنوان ولا من جسم الطلب: الترويسة لا تُكتب
// في سجلّات الوسطاء ولا في مراجع المتصفّح، أما سلسلة الاستعلام فتُكتب في
// كليهما — فسرٌّ يمرّ فيها يُسرَّب بمجرّد استعماله.
//
// ══ ولا ثقة بشكل الرسالة ════════════════════════════════════════════════
// ما يصل هنا نصٌّ من الإنترنت. كل حقل يُفحص قبل قراءته، وما لا نفهمه
// يُتجاهَل بـ200: المجموعات والقنوات والرسائل المعدَّلة والأزرار وأي أمرٍ
// آخر. و200 هنا ليست تساهلاً — هي ما يمنع تلغرام من إعادة إرسال ما لن
// نعالجه أبداً حتى ييأس.
//
// ══ والربط أوّلاً، والرسالة بعده ════════════════════════════════════════
// الهوية تُربَط في القاعدة، ثم تُرسَل رسالة التأكيد. فشلُ الإرسال — شبكةً
// أو مهلةً — **لا يتراجع عن ربطٍ نجح**: المريض مرتبط فعلاً، وإلغاء ذلك
// لأن رسالةً لم تصل يقلب نجاحاً إلى فشل بلا سبب.
//
// ══ ولا تمييز في الرسائل ════════════════════════════════════════════════
// «غير موجودة» و«مسحوبة» و«مستهلَكة» و«منتهية» تُجيب بنصٍّ **واحد**. فرقٌ
// في الردّ يجعل الرابط أداةَ استكشاف: مَن يجرّب نصوصاً يعرف أيّها كان
// موجوداً يوماً. والمريض لا يحتاج التفريق أصلاً — علاجه واحد: اطلب رابطاً
// جديداً من المركز.

import type { Express } from "express";
import { createHash, timingSafeEqual } from "crypto";
import { LinkTokenError } from "../patient_contacts/store";
// الرمز وحده — هذه الوحدة لا تعرف الملفّ ولا تقرأ منه شيئاً آخر.
// **والمنطقُ مشتركٌ مع واتساب** في `patient_code/messages.ts`: جوابُ «ما
// رمزُ ملفّي؟» لا يحتمل نسختين تنحرف إحداهما عن الأخرى.
import { patientCodesReply, patientCodesMessage, NO_LINKED_PATIENT } from "../patient_code/messages";
import { patientBotConfig, patientBotStatusLine, PATIENT_WEBHOOK_PATH } from "./config";
import { sendMessage } from "./client";
// الوسيط: هو مَن يعرف التصنيع، لا هذه الوحدة.
import { redeemAndWelcome } from "../patient_notifications/welcome";
import { nudgeDispatcher } from "../patient_notifications/dispatcher";

export { PATIENT_WEBHOOK_PATH };
const SECRET_HEADER = "x-telegram-bot-api-secret-token";

/** رسائل المريض — عربية، قصيرة، وبلا معلومة داخلية واحدة. */
export const MESSAGES = {
  linked: "تم ربط حساب Telegram بملف المريض بنجاح.",
  invalid: "رابط الربط غير صالح أو انتهت صلاحيته. يرجى طلب رابط جديد من المركز.",
  noPayload: "لبدء الربط، افتح رابط الربط الذي زوّدك به المركز.",
  //  **من المصدر المشترك** — نفسُ النصّ حرفياً في القناتين.
  noLinkedPatient: NO_LINKED_PATIENT,
} as const;

/**
 * مقارنة ثابتة الزمن للسرّ.
 *
 * تُقارَن **بصمتا** النصّين لا النصّان: `timingSafeEqual` ترمي على اختلاف
 * الطول، فالمقارنة المباشرة كانت تُسرّب طول السرّ عبر فرق المسار. والبصمتان
 * بطولٍ واحد دائماً، فلا يبقى إلا زمنٌ ثابت.
 */
function secretMatches(provided: unknown, expected: string): boolean {
  if (typeof provided !== "string" || provided.length === 0) return false;
  const a = createHash("sha256").update(provided, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * حمولة `/start` إن وُجدت.
 *
 * `null` تعني «ليس أمر بدء» فيُتجاهَل الطلب، و`""` تعني «بدءٌ بلا حمولة»
 * فيُرشَد المريض. والتفريق مقصود: أمرٌ آخر لا يستحقّ رسالة، وبدءٌ عارٍ
 * يستحقّها.
 */
export function parseStartPayload(text: unknown): string | null {
  if (typeof text !== "string") return null;
  const match = text.trim().match(/^\/start(?:@[A-Za-z0-9_]+)?(?:\s+(\S+))?$/);
  if (!match) return null;
  return match[1] ?? "";
}

/**
 * هل هي `/id` — أمرُ «ما رمز ملفّي؟».
 *
 * بلا وسائط إطلاقاً: `/id 5` ليست أمراً بل محاولةُ استعلامٍ عن ملفٍّ آخر،
 * فتُتجاهَل صامتةً كأي أمرٍ مجهول. والهوية من تلغرام وحده على أي حال.
 */
export function isIdCommand(text: unknown): boolean {
  if (typeof text !== "string") return false;
  return /^\/id(?:@[A-Za-z0-9_]+)?$/.test(text.trim());
}

/**
 * نصّ الردّ على `/id` — **يُعاد تصديرُه من المصدر المشترك**.
 *
 * كان يُكتب هنا. ونقلُه إلى `patient_code/messages.ts` كان شرطَ إضافةِ
 * واتساب بلا نسخة ثانية: حدُّ ما يخرج في هذا الجواب هو حدُّ ما يعرفه مَن
 * يمسك هاتفاً، وانحرافُ نسخةٍ عن أختها تسريبٌ في قناةٍ دون أخرى.
 *
 * ويبقى مُصدَّراً من هنا: اختباراتٌ قائمة تستورده، وكسرُها بلا سببٍ ليس
 * ترحيلاً بل ضجيج.
 */
export { patientCodesMessage };

export function registerPatientTelegramWebhook(app: Express) {
  console.log(patientBotStatusLine());

  app.post(PATIENT_WEBHOOK_PATH, async (req: any, res) => {
    const config = patientBotConfig();
    // معطَّل ⇒ لا يُقبل شيء. غياب السرّ لا يعني «بلا حارس».
    if (!config) return res.status(503).json({ ok: false });

    // **الترويسة وحدها** — لا سلسلة استعلام ولا جسم.
    if (!secretMatches(req.headers?.[SECRET_HEADER], config.webhookSecret)) {
      return res.status(401).json({ ok: false });
    }

    try {
      const update = req.body;
      if (!isObject(update)) return res.json({ ok: true });

      // `message` وحدها: تُتجاهَل `edited_message` و`callback_query`
      // و`channel_post` وكل ما سواها بلا أثر.
      const message = update.message;
      if (!isObject(message)) return res.json({ ok: true });

      const chat = message.chat;
      if (!isObject(chat) || chat.type !== "private") return res.json({ ok: true });

      const from = message.from;
      if (!isObject(from)) return res.json({ ok: true });
      const fromId = from.id;
      if (typeof fromId !== "number" && typeof fromId !== "string") return res.json({ ok: true });

      const chatId = String(
        typeof chat.id === "number" || typeof chat.id === "string" ? chat.id : fromId,
      );

      // ══ `/id` — رمزُ ملفّي ═══════════════════════════════════════════
      // **الهوية من تلغرام وحده** (`message.from.id`)، لا من نصّ الرسالة:
      // مَن يكتب رقم ملفٍّ آخر لا يحصل على شيء. والمسحوب ربطُه لا يُحتسب.
      // ولا حدث مريض يُسجَّل: سؤالُ المريض عن رمزه ليس واقعةً في ملفّه.
      if (isIdCommand(message.text)) {
        await sendMessage(chatId, await patientCodesReply("telegram", String(fromId)));
        return res.json({ ok: true });
      }

      const payload = parseStartPayload(message.text);
      if (payload === null) return res.json({ ok: true }); // أمرٌ آخر ⇒ تجاهل صامت

      if (payload === "") {
        await sendMessage(chatId, MESSAGES.noPayload);
        return res.json({ ok: true });
      }

      // **الهوية من تلغرام، وكل ما عداها من التذكرة.** المعرّف نصّاً لا
      // رقماً (معرّفات تلغرام تتجاوز ٣٢-بت)، ولا يُستعمل `username` هويةً
      // فهو يتغيّر، ولا رقم هاتف — ولا ندّعي تحقّقاً لم يجرِ.
      const externalId = String(fromId);

      // **الاستهلاك ورسائله في معاملة واحدة.** تعثّرُ القاعدة يُرجِع
      // الاستهلاك والجهة والصفوف معاً، فيعيد تلغرام المحاولة على تذكرةٍ
      // ما زالت صالحة — بدل مريضٍ مربوط لا يصله شيء ولا أحد يعلم.
      let linked = false;
      try {
        await redeemAndWelcome({ rawToken: payload, externalId });
        linked = true;
      } catch (err) {
        // **الخطأ التقني يصعد** إلى المعالج الخارجي فيردّ 500 ويعيد تلغرام
        // المحاولة. والمبتلَع هنا هو ما كان يصنع الضياع الصامت.
        if (!(err instanceof LinkTokenError)) throw err;
        // منتهية · مسحوبة · مستهلَكة · غير موجودة ⇒ نصٌّ واحد.
        // والمعاد إرساله من تلغرام يقع هنا بـ«مستهلَكة»: بلا صفٍّ ثانٍ،
        // وبلا 500، وبلا تغيير صلة — وهو المطلوب من إعادة المحاولة.
      }

      if (!linked) {
        // لا جهة اتصال ⇒ لا صفّ صادر يُستحقّ له. الردّ مباشر.
        await sendMessage(chatId, MESSAGES.invalid);
        return res.json({ ok: true });
      }

      // كبسة كي يصل الترحيب في ثوانٍ لا في دقيقة. «أطلق وانسَ»، وبعد
      // الحفظ لا قبله.
      nudgeDispatcher();
      return res.json({ ok: true });
    } catch (err) {
      // خطأ غير متوقَّع (قاعدة بيانات مثلاً): **500 عمداً** كي يعيد تلغرام
      // المحاولة. و200 هنا كانت ستبتلع التحديث إلى الأبد.
      // ولا يُطبع الخطأ: قد يحمل نصّ التذكرة من الطلب.
      console.error("[patient-telegram] webhook failed");
      return res.status(500).json({ ok: false });
    }
  });
}
