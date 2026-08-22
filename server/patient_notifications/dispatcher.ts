// عامل الصادر — يقرأ المستحقّ ويرسله.
//
// ══ الموضع في السلسلة ═══════════════════════════════════════════════════
// حدث المريض ⇒ صفٌّ في الصادر (داخل معاملة التصنيع) ⇒ **هنا** ⇒ تلغرام.
// وهذا الفاصل هو ما يجعل فشل تلغرام غير مؤثّر: المعاملة التجارية انتهت
// وثُبِّتت قبل أن يبدأ هذا العامل، فلا شيء يتراجع مهما فشل الإرسال.
//
// ══ ولا حلقة ضيّقة ══════════════════════════════════════════════════════
// دورة كل دقيقة، وكل دورة تأخذ دفعةً محدودة. والفشل يؤجَّل بتباعد متزايد
// لا يُعاد فوراً. فحسابٌ حظر البوت لا يُنتج آلاف النداءات.

import { renderNotification, isLinkNotificationType } from "./render";
import { enabledChannels, transportFor, type SendMode } from "./transports";
import {
  claimDue, contactForDelivery, markFailed, markSent, markSkipped,
} from "./outbox";

/** كل دقيقة. تلغرام ليس آنيّاً بطبعه، والدفعة تُفرِّغ المتراكم سريعاً. */
export const DISPATCH_INTERVAL_MS = 60_000;
const BATCH = 20;

export interface DispatchSummary {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * دورة واحدة. تُصدَّر كي يستدعيها الاختبار مباشرةً — وكي يُكبَس عليها فور
 * الربط فتصل رسالة الترحيب في ثوانٍ لا في دقيقة.
 *
 * **لا ترمي أبداً**: هي تعمل في مؤقّت، ورميةٌ غير ملتقَطة هناك تُسقط
 * العملية كلّها على Render.
 */
export async function dispatchOnce(limit = BATCH): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  // **لا ناقلَ مُعدّاً ⇒ لا حجزَ إطلاقاً.** والصفوفُ تبقى `pending` كما هي:
  // مركزٌ لم يُعدّ قناةً بعد لا تُحرَق رسائلُه في تباعدِ إعادةٍ لا يعالج شيئاً.
  const channels = enabledChannels();
  if (channels.length === 0) return summary;

  let claimed: Awaited<ReturnType<typeof claimDue>>;
  try {
    // **ولا يُحجَز إلا ما لقناته ناقلٌ الآن** — فصفُّ تلغرام يبقى لتلغرام،
    // ولا يُخطّى لمجرّد أن واتساب أُضيف بجواره.
    claimed = await claimDue(limit, channels);
  } catch {
    console.error("[patient-notifications] claim failed");
    return summary;
  }
  summary.claimed = claimed.length;

  for (const row of claimed) {
    try {
      // ── جهة الاتصال تُقرأ الآن لا وقت الاستحقاق ──────────────────────
      // بينهما قد تُسحَب: المريض فكّ الربط، أو الموظّف سحبه. فالمسحوبة
      // تُخطّى ولا تُرسَل — والقراءة الحيّة هي ما يجعل ذلك ممكناً أصلاً،
      // ولذلك لا يُخزَّن معرّف الحساب في الصادر.
      const contact = await contactForDelivery(row.patientContactId);
      // **وقناةُ الجهة تُقارَن بقناة الصفّ** لا بثابتٍ في الشيفرة: الصفُّ
      // استُحقّ لهذه الجهة على هذه القناة، واختلافُهما يعني صفّاً لا يُفهَم.
      if (!contact || contact.revokedAt !== null || contact.channel !== row.channel) {
        await markSkipped(row.id);
        summary.skipped++;
        continue;
      }

      // **الناقلُ من قناة الصفّ** — ولا شرطَ قناةٍ في جسم هذه الحلقة.
      const transport = transportFor(row.channel);
      if (!transport) {
        await markSkipped(row.id);
        summary.skipped++;
        continue;
      }

      // والقناةُ تصل العارضَ ليصدق سطرُ الترحيب — ولا شيءَ غيره يقرؤها.
      const text = renderNotification(
        row.notificationType, row.payload as any, { channel: row.channel },
      );
      if (!text) {
        // نوعٌ لا نصّ له أو حمولة ناقصة: يُخطّى ولا يُعاد إلى الأبد.
        await markSkipped(row.id, "render_failed");
        summary.skipped++;
        continue;
      }

      // رسالةُ الربط تقع بعد ثوانٍ من رسالة المريض ⇒ نافذةٌ مفتوحة. وما
      // عداها قد يقع بعد أسابيع ⇒ قالبٌ معتمَد. وتلغرام يتجاهل التمييز.
      const mode: SendMode = isLinkNotificationType(row.notificationType)
        ? "session" : "initiated";

      const res = await transport.send(contact.externalId, text, mode);
      if (res.ok) {
        await markSent(row.id);
        summary.sent++;
        continue;
      }

      await markFailed(row.id, row.attemptCount, res.code ?? transport.disabledCode);
      summary.failed++;
    } catch {
      // خطأ غير متوقَّع على صفٍّ واحد لا يوقف الدفعة. ولا يُطبع نصّه: قد
      // يحمل عنوان Bot API وفيه التوكن، أو جسمَ خطأ Graph وفيه معرّفات.
      console.error("[patient-notifications] delivery failed");
      try {
        const t = transportFor(row.channel);
        await markFailed(
          row.id, row.attemptCount,
          t ? (t.channel === "whatsapp" ? "whatsapp_api_error" : "telegram_api_error")
            : "render_failed",
        );
        summary.failed++;
      } catch { /* القاعدة نفسها متعثّرة — الدورة التالية تلتقطه */ }
    }
  }
  return summary;
}

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * يبدأ العامل الدوري. **لا تداخل**: دورة لا تبدأ قبل أن تنتهي سابقتها،
 * وإلا تسابقتا على الطابور نفسه في كل دقيقة بطيئة.
 */
export function startNotificationDispatcher(): void {
  if (timer) return;
  const channels = enabledChannels();
  if (channels.length === 0) {
    console.log("[patient-notifications] dispatcher idle — no patient channel configured");
    return;
  }
  console.log(`[patient-notifications] dispatcher started — channels: ${channels.join(", ")}`);
  timer = setInterval(() => {
    if (running) return;
    running = true;
    void dispatchOnce()
      .catch(() => { /* dispatchOnce لا ترمي، وهذا حزامٌ ثانٍ */ })
      .finally(() => { running = false; });
  }, DISPATCH_INTERVAL_MS);
  // لا يمنع الخروج: خدمةٌ تُغلق لا تنتظر مؤقّتاً.
  timer.unref?.();
}

export function stopNotificationDispatcher(): void {
  if (timer) { clearInterval(timer); timer = null; }
}

/**
 * كبسة واحدة بعد فعلٍ يستحقّ رسالةً فوريّة (الربط مثلاً) — «أطلق وانسَ».
 * فشلها لا يعني شيئاً: الدورة الدورية ستلتقط ما بقي.
 */
export function nudgeDispatcher(): void {
  void dispatchOnce().catch(() => { /* الدورة الدورية تكفي */ });
}
