// عامل الصادر — يقرأ المستحقّ ويرسله عبر واتساب.
//
// ══ الموضع في السلسلة ═══════════════════════════════════════════════════
// حدثُ مريض (أو حفظُ ملفّ) ⇒ صفٌّ في الصادر **داخل معاملة العمل** ⇒ **هنا**
// ⇒ Meta. وهذا الفاصل هو ما يجعل عطلَ واتساب غيرَ مؤثّر: المعاملةُ التجارية
// انتهت وثُبِّتت قبل أن يبدأ هذا العامل، فلا شيءَ يتراجع مهما فشل الإرسال.
// **ولا يُردّ تسجيلُ مريضٍ لأن Meta متعثّرة.**
//
// ══ ولا حلقة ضيّقة ══════════════════════════════════════════════════════
// دورة كل دقيقة، وكل دورة تأخذ دفعةً محدودة. والفشل يؤجَّل بتباعد متزايد
// لا يُعاد فوراً. فرقمٌ حظر المركز لا يُنتج آلاف النداءات.
//
// ══ وقالبٌ لا يُضبَط ليس فشلاً ══════════════════════════════════════════
// مشغّلٌ لم يُنهِ اعتماد قالبه في Meta بعدُ **لا تُحرَق صفوفُه**: لا تُحجَز،
// ولا يُنادى المزوّد، ولا يُزاد عدّادُ محاولة. تبقى `pending` بـ٠ محاولات
// حتى يظهر اسمُ القالب — ثم تُرسَل الصفوفُ **نفسُها** بلا تدخّل.

import { renderNotification, templateKindFor } from "./render";
import { patientWhatsappEnabled, templateReady, type TemplateKind } from "../patient_whatsapp/config";
import { sendTemplate } from "../patient_whatsapp/client";
import {
  claimDue, contactForDelivery, markFailed, markSent, markSkipped,
  PATIENT_CHANNEL, type DeliveryErrorCode,
} from "./outbox";

/** كل دقيقة. الإشعارُ ليس آنيّاً بطبعه، والدفعة تُفرِّغ المتراكم سريعاً. */
export const DISPATCH_INTERVAL_MS = 60_000;
const BATCH = 20;

export interface DispatchSummary {
  claimed: number;
  sent: number;
  failed: number;
  skipped: number;
}

/**
 * أنواعُ القوالب الجاهزة الآن — تُحسَب في كلّ دورة.
 *
 * متغيّرٌ يُضاف على Render يبدأ الإرسالَ في الدورة التالية بلا نشرِ شيفرة،
 * والصفوفُ التي كانت تنتظر تجد طريقَها من تلقائها.
 */
function readyKinds(): TemplateKind[] {
  return (["welcome", "update"] as const).filter((k) => templateReady(k));
}

/**
 * دورة واحدة. تُصدَّر كي يستدعيها الاختبار مباشرةً — وكي يُكبَس عليها فور
 * حفظ المريض فيصل الترحيب في ثوانٍ لا في دقيقة.
 *
 * **لا ترمي أبداً**: هي تعمل في مؤقّت، ورميةٌ غير ملتقَطة هناك تُسقط
 * العملية كلّها على Render.
 */
export async function dispatchOnce(limit = BATCH): Promise<DispatchSummary> {
  const summary: DispatchSummary = { claimed: 0, sent: 0, failed: 0, skipped: 0 };
  if (!patientWhatsappEnabled()) return summary;

  // **ولا حجزَ لنوعٍ لا قالبَ له.** الحجزُ يعني نداءً ثم فشلاً ثم تباعدَ
  // إعادةٍ لا يعالج شيئاً — والمشغّلُ لم يخطئ، هو فقط لم ينتهِ بعد.
  const kinds = readyKinds();
  if (kinds.length === 0) return summary;

  let claimed: Awaited<ReturnType<typeof claimDue>>;
  try {
    claimed = await claimDue(limit, [PATIENT_CHANNEL]);
  } catch {
    console.error("[patient-notifications] claim failed");
    return summary;
  }

  for (const row of claimed) {
    try {
      const kind = templateKindFor(row.notificationType);
      // صفٌّ حُجز ثم تبيّن أن قالبَه غيرُ جاهز (سباقُ إعدادٍ نادر): يُعاد
      // إلى الطابور **بلا عدّ محاولة** — لا يُعدّ فشلاً ولا يُخطّى.
      if (!kinds.includes(kind)) {
        await markPendingAgain(row.id);
        continue;
      }
      summary.claimed++;

      // ── جهة الاتصال تُقرأ الآن لا وقت الاستحقاق ──────────────────────
      // بينهما قد تُسحَب: الموظّف أوقف الإشعارات، أو غيّر الرقم. فالمسحوبة
      // تُخطّى ولا تُرسَل — والقراءةُ الحيّة هي ما يجعل ذلك ممكناً أصلاً،
      // ولذلك لا يُخزَّن الرقمُ في الصادر.
      const contact = await contactForDelivery(row.patientContactId);
      if (!contact || contact.revokedAt !== null || contact.channel !== row.channel) {
        await markSkipped(row.id);
        summary.skipped++;
        continue;
      }

      const param = renderNotification(row.notificationType, row.payload as any);
      if (!param) {
        // نوعٌ لا نصّ له أو حمولة ناقصة: يُخطّى ولا يُعاد إلى الأبد.
        await markSkipped(row.id, "render_failed");
        summary.skipped++;
        continue;
      }

      const res = await sendTemplate(contact.externalId, kind, param);
      if (res.ok) {
        await markSent(row.id);
        summary.sent++;
        continue;
      }

      const code: DeliveryErrorCode =
        res.reason === "timeout" ? "whatsapp_timeout"
        : res.reason === "network" ? "whatsapp_network"
        : res.reason === "disabled" ? "whatsapp_disabled"
        : res.reason === "template_error" ? "whatsapp_template_error"
        : res.reason === "no_template" ? "whatsapp_template_error"
        : "whatsapp_api_error";
      await markFailed(row.id, row.attemptCount, code);
      summary.failed++;
    } catch {
      // خطأ غير متوقَّع على صفٍّ واحد لا يوقف الدفعة. ولا يُطبع نصّه: قد
      // يحمل جسمَ خطأ Graph وفيه معرّفات.
      console.error("[patient-notifications] delivery failed");
      try {
        await markFailed(row.id, row.attemptCount, "whatsapp_api_error");
        summary.failed++;
      } catch { /* القاعدة نفسها متعثّرة — الدورة التالية تلتقطه */ }
    }
  }
  return summary;
}

/**
 * يعيد صفّاً محجوزاً إلى الطابور **بلا عدّ محاولة ولا رمزِ خطأ**.
 *
 * لأن ما وقع ليس فشلَ إرسال: لم يُنادَ مزوّدٌ أصلاً. وعدُّه محاولةً كان
 * سيدفعه في تباعدٍ متزايد حتى ستّ ساعات — عقوبةً على إعدادٍ لم يكتمل.
 */
async function markPendingAgain(id: number): Promise<void> {
  const { deliveriesTable, eq } = await import("./outbox");
  const { db } = await import("../db");
  await db.update(deliveriesTable)
    .set({ status: "pending", lockedAt: null, nextAttemptAt: new Date(), updatedAt: new Date() })
    .where(eq(deliveriesTable.id, id));
}

let timer: NodeJS.Timeout | null = null;
let running = false;

/**
 * يبدأ العامل الدوري. **لا تداخل**: دورة لا تبدأ قبل أن تنتهي سابقتها،
 * وإلا تسابقتا على الطابور نفسه في كل دقيقة بطيئة.
 */
export function startNotificationDispatcher(): void {
  if (timer) return;
  if (!patientWhatsappEnabled()) {
    console.log("[patient-notifications] dispatcher idle — WhatsApp not configured");
    return;
  }
  console.log("[patient-notifications] dispatcher started — channel: whatsapp");
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
 * كبسة واحدة بعد فعلٍ يستحقّ رسالةً فوريّة (حفظُ مريضٍ مثلاً) — «أطلق
 * وانسَ». فشلها لا يعني شيئاً: الدورة الدورية ستلتقط ما بقي.
 */
export function nudgeDispatcher(): void {
  void dispatchOnce().catch(() => { /* الدورة الدورية تكفي */ });
}
