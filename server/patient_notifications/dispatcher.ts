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

import { patientBotEnabled } from "../patient_telegram/config";
import { sendMessage } from "../patient_telegram/client";
import { renderNotification } from "./render";
import {
  claimDue, contactForDelivery, markFailed, markSent, markSkipped,
  DELIVERY_CHANNEL, type DeliveryErrorCode,
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
  if (!patientBotEnabled()) return summary;

  let claimed: Awaited<ReturnType<typeof claimDue>>;
  try {
    claimed = await claimDue(limit);
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
      if (!contact || contact.revokedAt !== null || contact.channel !== DELIVERY_CHANNEL) {
        await markSkipped(row.id);
        summary.skipped++;
        continue;
      }

      const text = renderNotification(row.notificationType, row.payload as any);
      if (!text) {
        // نوعٌ لا نصّ له أو حمولة ناقصة: يُخطّى ولا يُعاد إلى الأبد.
        await markSkipped(row.id, "render_failed");
        summary.skipped++;
        continue;
      }

      const res = await sendMessage(contact.externalId, text);
      if (res.ok) {
        await markSent(row.id);
        summary.sent++;
        continue;
      }

      const code: DeliveryErrorCode =
        res.reason === "timeout" ? "telegram_timeout"
        : res.reason === "network" ? "telegram_network"
        : res.reason === "disabled" ? "telegram_disabled"
        : "telegram_api_error";
      await markFailed(row.id, row.attemptCount, code);
      summary.failed++;
    } catch {
      // خطأ غير متوقَّع على صفٍّ واحد لا يوقف الدفعة. ولا يُطبع نصّه:
      // قد يحمل عنوان Bot API وفيه التوكن.
      console.error("[patient-notifications] delivery failed");
      try {
        await markFailed(row.id, row.attemptCount, "telegram_api_error");
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
  if (!patientBotEnabled()) {
    console.log("[patient-notifications] dispatcher idle — patient bot not configured");
    return;
  }
  console.log("[patient-notifications] dispatcher started");
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
