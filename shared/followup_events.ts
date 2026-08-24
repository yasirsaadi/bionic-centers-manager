// «سجلّ الإجراءات» — ترجمةُ أحداث المتابعة إلى عربيّةٍ يقرأها الموظّف.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// كانت الشاشةُ تعرض اسمَ الحدث كما هو في القاعدة حين لا تجد له ترجمة:
//
//     expert_selected
//     initial_price_set
//     discount_price_applied
//
// وموظّفةُ الاستقبال تقرأ هذا فلا تفهم منه شيئاً — فيصير السجلُّ زينةً
// تُطوى لا أداةً تُسأل. **ولا رمزَ إنجليزيٌّ يظهر لمستخدمٍ بعد اليوم**:
// الدالّةُ هنا تُرجع عنواناً عربياً **لكلّ** نوع، والمجهولُ يُقال بعبارةٍ
// عربية عامّة لا باسمه البرمجيّ.
//
// ══ وترجمةٌ وحدها لا تكفي ═══════════════════════════════════════════════
// «تم تعديل السعر» بلا رقمٍ لا تجيب سؤال مَن يقرأ السجلّ. فكلُّ حدثٍ يخرج
// معه ما خزّنه فعلاً في حمولته: الخبيرُ الذي اختير، والمبلغُ الذي أُدخل،
// والسعرُ قبل الخصم وبعده، ورقمُ أمر التصنيع.
//
// **ولا يُخترَع تفصيل**: حدثٌ قديمٌ خُزّن قبل أن تُضاف حمولتُه يخرج بعنوانه
// وحده — والشاشةُ تعرض معه فاعلَه ووقتَه، فيبقى مقروءاً بلا كذب.
//
// ══ ولماذا لا يُرجَع نصٌّ واحدٌ جاهز ═══════════════════════════════════
// لأن انتقالَ السعر «الأصلي ⟵ النهائي» **ينقلب بصرياً** في صفحةٍ عربية لو
// كُتب نصّاً. فيخرج مفكَّكاً (`transition`) لترسمه الشاشةُ بوحدةٍ معزولة
// (`PriceTransition`) — نفسُ علاج شاشات الخصم.

import { FOLLOWUP_REASON_LABELS, type FollowupReason } from "./followup";
import { requestedItemLabel } from "./prosthetic_parts";

/** ما تحتاجه الترجمةُ من صفّ الحدث — لا أكثر. */
export interface FollowupEventLike {
  eventType?: string | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  reason?: string | null;
  note?: string | null;
  payload?: Record<string, any> | null;
  actorName?: string | null;
  createdAt?: string | null;
}

export interface FollowupEventView {
  /** العنوان العربي — **لا يكون فارغاً ولا إنجليزياً أبداً**. */
  title: string;
  /** انتقالُ سعرٍ يُرسَم بوحدةٍ معزولة عن اتجاه الصفحة. */
  transition?: { from: number; to: number };
  /** أسطرُ التفصيل من الحمولة المخزَّنة — فارغةٌ لحدثٍ قديمٍ بلا حمولة. */
  facts: string[];
}

/** يحوّل الرقم إلى «١٢٣,٤٥٦» بأرقامٍ لاتينية كبقيّة مبالغ النظام. */
const money = (n: unknown): string => Number(n ?? 0).toLocaleString("en-US");

/** رقمٌ موجبٌ فعلاً؟ الحمولةُ القديمة قد تحمل `null` أو نصّاً. */
function pos(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** عنوانُ سببٍ من القائمة — والمجهولُ يُعاد كما هو لا يُخفى. */
function reasonLabel(v: unknown): string | null {
  if (typeof v !== "string" || !v) return null;
  return FOLLOWUP_REASON_LABELS[v as FollowupReason] ?? v;
}

/**
 * الصدرُ الذي يخزّنه `server/medical/cancel_exam.ts` قبل سبب مَن ألغى.
 *
 * الملاحظةُ المخزَّنة: «أُغلقت بسبب إلغاء المعاينة — لا يخصّ هذا المريض».
 * والعنوانُ فوقها يقول شطرَها الأول، فيُعرَض مرّتين لو خرجت كما هي.
 */
const CANCEL_NOTE_PREFIX = "أُغلقت بسبب إلغاء المعاينة";

/**
 * سببُ الإلغاء وحدَه — **ولا يُبتَر ما لا يُعرَف شكلُه**.
 *
 * متى بدأت الملاحظةُ بالصدر المعروف نُزع وبقي الخبر. ومتى كُتبت بصيغةٍ
 * أخرى (صفٌّ قديم، أو تغيّرت الصياغةُ في الخادم) تُعرَض كاملةً كما هي —
 * فالقصُّ الأعمى كان سيمحو نصفَ سببٍ حقيقيّ.
 */
function cancellationReason(note: unknown): string | null {
  const t = typeof note === "string" ? note.trim() : "";
  if (!t) return null;
  if (!t.startsWith(CANCEL_NOTE_PREFIX)) return t;
  const rest = t.slice(CANCEL_NOTE_PREFIX.length).replace(/^[\s—–-]+/, "").trim();
  return rest || null;
}

/**
 * العناوينُ العربية لكلّ نوعِ حدثٍ **موجودٍ فعلاً في المستودع**.
 *
 * لا يُخترَع نوعٌ لا يكتبه الخادم. والأنواعُ المعلَّمة «مسار قديم» لا تُنشأ
 * بعد اليوم لكنّ صفوفاً تحملها، فتبقى مترجَمةً كي تُقرأ كما كُتبت.
 */
export const FOLLOWUP_EVENT_TITLES: Record<string, string> = {
  followup_created: "فُتح ملف متابعة ما بعد المعاينة",
  patient_deferred: "تم تأجيل القرار للمتابعة",
  contact_recorded: "تم تسجيل تواصل مع المريض",
  expert_selected: "تم اختيار الخبير",
  initial_price_set: "تم إدخال السعر الأصلي",
  commercial_price_set: "تم تعديل السعر",
  //  **تصحيحُ الطبيب لرقمه ليس قراراً تجارياً** — ولذلك نوعٌ خاصٌّ به:
  //  خلطُه بـ`commercial_price_set` كان سيجعل التقرير يقرأ تصحيحاً إملائياً
  //  قرارَ مديرٍ بالبيع بسعرٍ آخر.
  exam_price_corrected: "صحّح الطبيب السعر الأصلي",
  discount_price_applied: "تم اعتماد الخصم",
  purchase_interest_signaled: "تم تسجيل موافقة المريض على الشراء",
  purchase_confirmed: "تم تأكيد الشراء",
  converted: "تم الشراء — بدأ التصنيع",
  closed_without_purchase: "أُغلق الملف بدون شراء",
  //  ══ إلغاءُ المعاينة (ترحيل ٠٦١) ═══════════════════════════════════
  //  **ولا يُترك للعبارة العامّة**: بلا هذا السطر يقرأ الموظّفُ «إجراء
  //  مسجَّل على الملف» فيظنّ أن أحداً لمس الملفَّ ولا يعرف أن المعاينة
  //  التي وُلد عنها سقطت — وهو الخبرُ الوحيد الذي يحتاجه.
  closed_exam_cancelled: "أُغلقت المتابعة بسبب إلغاء المعاينة",
  administrative_reversal: "أُلغيت العملية إدارياً",
  reopened: "أُعيد فتح الملف",
  //  ══ مسارٌ قديم — يُقرأ ولا يُنشأ ═══════════════════════════════════
  patient_accepted_price: "وافق المريض على السعر (مسار قديم)",
  price_request_cancelled: "أُلغي طلب تعديل السعر",
  price_change_requested: "طُلب تعديل السعر (مسار قديم)",
  price_approved: "اعتُمد تعديل السعر (مسار قديم)",
  price_rejected: "رُفض تعديل السعر (مسار قديم)",
  purchase_approved: "اعتُمد الشراء (مسار قديم)",
};

/**
 * **لا رمزَ إنجليزيٌّ يصل إلى الشاشة** — ولو ظهر نوعٌ لم يُترجَم بعد.
 *
 * وهذا هو الفرقُ عن `?? e.eventType` الذي كان: نوعٌ جديد يُضاف في الخادم
 * وتُنسى ترجمتُه كان يظهر عارياً للموظّف. الآن يظهر «إجراء مسجَّل» —
 * وناقصُ المعلومة أهونُ من رمزٍ لا يفهمه أحد.
 */
export const UNKNOWN_EVENT_TITLE = "إجراء مسجَّل على الملف";

export function followupEventTitle(eventType: unknown): string {
  if (typeof eventType !== "string" || !eventType) return UNKNOWN_EVENT_TITLE;
  return FOLLOWUP_EVENT_TITLES[eventType] ?? UNKNOWN_EVENT_TITLE;
}

/**
 * الحدثُ كما يُعرَض: عنوانٌ عربيّ، وانتقالُ سعرٍ إن وُجد، وأسطرُ تفصيل.
 *
 * `expertName` — الشاشةُ تعرف أسماء خبراء الفرع، والحمولةُ تخزّن الرقم
 * وحده. فتُمرَّر دالّةُ الترجمة ولا تُخمَّن الأسماء هنا. ومَن لا يُعرَف
 * اسمُه يظهر برقمه لا يختفي.
 */
export function followupEventView(
  e: FollowupEventLike | null | undefined,
  expertName?: (id: number) => string | null | undefined,
): FollowupEventView {
  const type = typeof e?.eventType === "string" ? e.eventType : "";
  const p = (e?.payload && typeof e.payload === "object" ? e.payload : {}) as Record<string, any>;
  const out: FollowupEventView = { title: followupEventTitle(type), facts: [] };

  const expert = (id: unknown): string | null => {
    const n = pos(id);
    if (n === null) return null;
    const name = expertName?.(n);
    return name ? name : `#${n}`;
  };

  switch (type) {
    case "followup_created": {
      const price = pos(p.approvedPrice);
      if (price !== null) out.facts.push(`السعر من المعاينة: ${money(price)} د.ع`);
      const proposed = expert(p.proposedExpertUserId);
      if (proposed) out.facts.push(`الخبير المقترح من الطبيب: ${proposed}`);
      break;
    }
    case "patient_deferred": {
      const r = reasonLabel(e?.reason);
      if (r) out.facts.push(`السبب: ${r}`);
      if (p.noScheduledFollowUp === true) out.facts.push("بلا موعد متابعة");
      else if (typeof p.nextFollowUpAt === "string" && p.nextFollowUpAt) {
        out.facts.push(`الموعد القادم: ${dayOnly(p.nextFollowUpAt)}`);
      }
      break;
    }
    case "expert_selected": {
      const to = expert(p.newExpertUserId);
      if (to) out.facts.push(`الخبير: ${to}`);
      const from = expert(p.oldExpertUserId);
      if (from && from !== to) out.facts.push(`بدلاً من: ${from}`);
      break;
    }
    case "initial_price_set": {
      const price = pos(p.finalPrice);
      if (price !== null) out.facts.push(`${money(price)} د.ع`);
      break;
    }
    case "exam_price_corrected": {
      const from = Number(p.previousPrice), to = Number(p.finalPrice);
      if (Number.isFinite(from) && Number.isFinite(to) && to > 0) {
        out.transition = { from, to };
        //  **والفرقُ يُقال صراحةً** حين يتحرّك المال: القارئُ بعد سنة يريد
        //  «كم» قبل أن يطرح رقمين بذهنه. والإشارةُ تُكتب فالنقصان يُقرأ.
        const delta = Number.isFinite(Number(p.delta)) ? Number(p.delta) : to - from;
        if (delta !== 0) {
          out.facts.push(`الفرق: ${delta > 0 ? "+" : "−"}${money(Math.abs(delta))} د.ع`);
        }
      }
      //  وتصحيحُ ما بعد البيع يُميَّز: ذاك رقمٌ لم يقبضه أحد بعد، وهذا مالٌ
      //  قُيِّد في الدفتر وتحرّكت به كلفةُ الجهاز وحسابُ المريض.
      if (p.afterSale === true) {
        out.facts.push("تصحيح بعد البيع — حُدّثت كلفة الجهاز وحساب المريض");
      }
      //  والسببُ **معنوناً**: بلا العنوان يظهر نصُّ الموظّف عائماً بين
      //  الأرقام فلا يُعرَف أهو سببٌ أم ملاحظةٌ أم اسمُ جهاز.
      const why = typeof p.correctionReason === "string" ? p.correctionReason.trim() : "";
      if (why) out.facts.push(`سبب التصحيح: ${why}`);
      break;
    }
    case "commercial_price_set": {
      const from = Number(p.previousPrice), to = Number(p.finalPrice);
      //  **الانتقالُ يُعرَض حين يتغيّر فعلاً**: تثبيتُ السعر كما هو قرارٌ
      //  مسجَّل، لكنّ «٥٠٠,٠٠٠ ⟵ ٥٠٠,٠٠٠» سطرٌ لا يقول شيئاً.
      if (Number.isFinite(from) && Number.isFinite(to) && from !== to && to > 0) {
        out.transition = { from, to };
      } else if (Number.isFinite(to) && to > 0) {
        out.facts.push(`ثُبِّت السعر: ${money(to)} د.ع`);
      }
      const r = reasonLabel(e?.reason);
      if (r) out.facts.push(`السبب: ${r}`);
      break;
    }
    case "discount_price_applied": {
      const from = Number(p.previousPrice), to = Number(p.finalPrice);
      //  والتبرّعُ نهائيُّه صفر — فيُعرَض الانتقالُ إليه لا يُحجَب.
      if (Number.isFinite(from) && from > 0 && Number.isFinite(to)) {
        out.transition = { from, to };
      }
      if (Number.isFinite(to) && to === 0) out.facts.push("خدمة مجانية (تبرّع)");
      break;
    }
    case "purchase_interest_signaled":
    case "patient_accepted_price": {
      const price = pos(p.approvedPrice ?? p.acceptedPrice);
      if (price !== null) out.facts.push(`السعر المعتمد: ${money(price)} د.ع`);
      break;
    }
    case "purchase_confirmed": {
      const price = pos(p.approvedPrice);
      if (price !== null) out.facts.push(`السعر: ${money(price)} د.ع`);
      const ex = expert(p.expertUserId);
      if (ex) out.facts.push(`الخبير: ${ex}`);
      break;
    }
    case "converted": {
      const wo = pos(p.workOrderId);
      if (wo !== null) out.facts.push(`أمر التصنيع: #${wo}`);
      const price = pos(p.approvedPrice);
      if (price !== null) out.facts.push(`السعر: ${money(price)} د.ع`);
      break;
    }
    case "closed_without_purchase": {
      const r = reasonLabel(e?.reason);
      if (r) out.facts.push(`السبب: ${r}`);
      break;
    }
    //  ══ إلغاءُ المعاينة ═══════════════════════════════════════════════
    //  **ولا يُقرأ `e.reason` هنا**: الخادمُ يخزّن فيه `exam_cancelled`
    //  وهو مفتاحٌ داخليٌّ ليس من قائمة أسباب المريض، فـ`reasonLabel`
    //  كانت ستعيده كما هو ⟵ رمزٌ إنجليزيٌّ على شاشة الموظّف. والعنوانُ
    //  فوقَه يقول ما يقوله ذلك المفتاح بالضبط، فلا شيءَ يضيع بإسقاطه.
    //
    //  والخبرُ الحقيقي هو **سببُ الإلغاء الذي كتبه مَن ألغى** — يخرج
    //  معنوناً لا مبتوراً، وبلا تكرار صدر العنوان.
    case "closed_exam_cancelled": {
      const why = cancellationReason(e?.note);
      if (why) out.facts.push(`سبب الإلغاء: ${why}`);
      break;
    }
    //  ══ **حقائقُ التصحيح تُقرأ بلا معجم** ═══════════════════════════════
    //   «طلب الاستبدال الجديد: #88» رقمٌ داخليّ لا يعني شيئاً لموظّفٍ ولا
    //   لمدير. والذي يعنيهما: **ماذا كان وماذا صار**. فالعناوينُ من خريطة
    //   الأجزاء القائمة (`requestedItemLabel`) — ولا معجمَ ثانٍ يُخترَع —
    //   والأرقامُ الداخلية تبقى في الحمولة للتدقيق.
    case "administrative_reversal": {
      const svc = typeof p.serviceType === "string" ? p.serviceType : undefined;
      const prev = typeof p.previousRequestedItem === "string" ? p.previousRequestedItem : null;
      if (prev) out.facts.push(`الطلب السابق: ${requestedItemLabel(prev, svc)}`);
      const next = typeof p.replacementRequestedItem === "string"
        ? p.replacementRequestedItem : null;
      if (next) out.facts.push(`الطلب الجديد: ${requestedItemLabel(next, svc)}`);
      const wo = pos(p.workOrderId);
      if (wo !== null) out.facts.push(`أمر التصنيع السابق: #${wo}`);
      const why = typeof e?.note === "string" ? e.note.trim() : "";
      if (why) out.facts.push(`سبب التصحيح: ${why}`);
      break;
    }
    case "reopened": {
      out.facts.push(e?.toStatus === "follow_up"
        ? "عاد للمتابعة بموعد" : "عاد بانتظار قرار المريض");
      const prev = reasonLabel(p.previousClosedReason);
      if (prev) out.facts.push(`سبب الإغلاق السابق: ${prev}`);
      break;
    }
    case "price_request_cancelled": {
      const from = Number(p.currentPrice), to = Number(p.proposedPrice);
      if (Number.isFinite(from) && Number.isFinite(to) && from > 0 && to > 0) {
        out.transition = { from, to };
      }
      break;
    }
    case "price_approved": {
      const from = Number(p.oldPrice), to = Number(p.newApprovedPrice);
      if (Number.isFinite(from) && Number.isFinite(to) && from !== to && to > 0) {
        out.transition = { from, to };
      }
      break;
    }
    case "price_rejected": {
      const kept = pos(p.oldPrice);
      if (kept !== null) out.facts.push(`بقي السعر: ${money(kept)} د.ع`);
      break;
    }
    default:
      break;
  }

  //  **والملاحظةُ تُعرَض دائماً حين تُكتب** — هي ما يكتبه الموظّف بيده،
  //  وأثمنُ ما في السطر أحياناً. وتُستثنى من الإغلاق لأن البطاقةَ تعرضها
  //  كاملةً فوق السجلّ، فتكرارُها ضجيج. ومن الإلغاء لأنها خرجت أعلاه
  //  معنونةً «سبب الإلغاء» — والسطرُ الواحد مرّتين ضجيجٌ كذلك.
  const note = typeof e?.note === "string" ? e.note.trim() : "";
  if (note && type !== "closed_without_purchase" && type !== "closed_exam_cancelled"
    && type !== "administrative_reversal"
    //  ومن تصحيح السعر: خرج أعلاه معنوناً «سبب التصحيح» — ومرّتين ضجيج.
    && type !== "exam_price_corrected") {
    out.facts.push(note);
  }
  return out;
}

// ── حالةُ الشراء كما تُقال للموظّف ───────────────────────────────────────
//
// ══ العطبُ الذي يغلقه (لاحظه المالك على الإنتاج) ═══════════════════════
// كان سطرُ الموافقة نصّاً ثابتاً: «المريض قرّر الإكمال، ينتظر إتمام البيع»
// — يُعرَض ما دامت الرايةُ مرفوعة، **حتى بعد أن تمّ البيع وفُتح أمرُ
// التصنيع**. فيقرأ الموظّفُ أن الملفّ ينتظره وهو منتهٍ.
//
// والحلُّ **اشتقاقٌ من الحالة الحقيقية** لا نصٌّ محفوظ. والحالةُ هي مصدر
// الحقيقة: `converted` (أو وجودُ أمر تصنيع) تعني «تمّ» ولا تحتمل غير ذلك.

export type PurchasePresentation = "converted" | "discount_pending" | "awaiting" | "admin_void" | "exam_cancelled" | "closed";

export const PURCHASE_STATE_TEXT: Record<PurchasePresentation, string> = {
  converted: "تم الشراء — بدأ التصنيع",
  discount_pending: "المريض وافق على الشراء — بانتظار اعتماد الخصم",
  awaiting: "المريض وافق على الشراء — بانتظار إتمام إجراءات البيع",
  admin_void: "عملية ملغاة إدارياً",
  exam_cancelled: "المعاينة ملغاة",
  closed: "أُغلقت العملية بدون شراء",
};

/**
 * أين وقف الشراء فعلاً — **والتحوّلُ يسبق كلَّ شيء**.
 *
 * `convertedWorkOrderId` تُفحَص مع الحالة لا بدلاً منها: صفٌّ قديمٌ قد
 * يحمل أمرَ تصنيعٍ وحالتُه لم تُحدَّث، ووجودُ الأمر واقعةٌ لا تحتمل الشكّ.
 * فمتى وُجد أحدُهما فالبيعُ تمّ — ولا يُقال «ينتظر إتمام البيع» بعده أبداً.
 */
export function purchasePresentation(f: {
  status?: string | null;
  convertedWorkOrderId?: number | null;
  hasPendingDiscount?: boolean;
} | null | undefined): PurchasePresentation {
  if (f?.status === "closed_admin_void") return "admin_void";
  if (f?.status === "closed_exam_cancelled") return "exam_cancelled";
  if (f?.status === "closed_without_purchase") return "closed";
  if (f?.status === "converted" || pos(f?.convertedWorkOrderId) !== null) return "converted";
  if (f?.hasPendingDiscount === true) return "discount_pending";
  return "awaiting";
}

/** «٢٠٢٦-٠٩-٠١» ⟵ التاريخُ وحده، للمواعيد المستقبلية داخل التفاصيل. */
function dayOnly(v: string): string {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v
    : d.toLocaleDateString("ar-IQ", { year: "numeric", month: "2-digit", day: "2-digit" });
}
