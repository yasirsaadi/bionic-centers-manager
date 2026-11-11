// **نصوصُ تنبيهات الموظّفين لكلّ حدث** (§4.by) — كلُّ دالّةٍ تُنادى من موضع الكتابة نفسِه **داخل معاملته**، وتقرأ
// الاسمَ والرمزَ والفرعَ بالمنفِّذ نفسِه، ثمّ تُدرج صفّاً في الصندوق. **ولا ترمي أبداً**: تنبيهٌ لا يُسقط عملية.
// واسمُ المريض في النصّ بقرار المالك: «مَن سيستلم هو مَن يعرف كلَّ تفاصيل المريض».
import { sql } from "drizzle-orm";
import { DEPARTMENT_LABELS, type Department } from "@shared/service_taxonomy";
import { PURPOSE_LABELS, REASON_CODE_LABELS } from "@shared/manufacturing";
import { enqueueStaffEvent, type Executor } from "./outbox";
import { db } from "../db";
import { noteExamQueued } from "../medical/exam_queued_notice";

async function ctx(ex: Executor | null | undefined, patientId: number, branchId: number | null | undefined) {
  //  فرعُ الحدث، وإن غاب ففرعُ تسجيل المريض — للنصّ وللتوجيه معاً.
  const r = await (ex ?? db).execute(sql`
    SELECT p.name, p.patient_code, b.id AS branch_id, b.name AS branch_name
      FROM patients p LEFT JOIN branches b ON b.id = COALESCE(${branchId ?? null}::int, p.branch_id)
     WHERE p.id = ${patientId}`);
  const row = (r.rows[0] ?? {}) as any;
  const name = String(row.name ?? "").trim();
  const who = name ? `${name}${row.patient_code ? ` (${row.patient_code})` : ""}` : `مريض #${patientId}`;
  return {
    who, branch: row.branch_name ? ` — فرع ${row.branch_name}` : "",
    branchId: row.branch_id == null ? (branchId ?? null) : Number(row.branch_id),
  };
}

/**
 * حارسٌ واحد: أيُّ خطأٍ في التحضير يُبتلَع — **وداخل معاملةٍ بنقطة حفظ**، فخطأٌ في قراءة الاسم لا يُفسد معاملةَ
 * العملية (Postgres يُبطل المعاملةَ كلَّها عند أوّل خطأ لولاها).
 */
async function safe(ex: Executor | null | undefined, fn: () => Promise<void>): Promise<void> {
  const inTx = Boolean(ex) && ex !== (db as unknown);
  try {
    if (inTx) await ex!.execute(sql`SAVEPOINT staff_compose`);
    await fn();
    if (inTx) await ex!.execute(sql`RELEASE SAVEPOINT staff_compose`);
  } catch {
    if (inTx) { try { await ex!.execute(sql`ROLLBACK TO SAVEPOINT staff_compose`); } catch { /* المعاملةُ نفسُها انتهت */ } }
    console.error("[staff-telegram] compose failed");
  }
}

const dept = (s: string | null | undefined) => DEPARTMENT_LABELS[s as Department] ?? "";

/**
 * **خبيرُ الأمر ومَن سجّل الحركة** (طلبُ المالك ٢٠٢٦-١١-٠٨: «لا يظهر مَن قام بذلك، فقط الفرع») — سطرٌ يُلحق برسائل التصنيع
 * التي تذهب للفرع: الخبيرُ المُسنَد إليه الأمرُ الآن، و«سجّله» حين ضغط الزرَّ غيرُه (استقبالٌ أو مسؤول). وأيُّ غيابٍ يُسقط جزءَه وحده.
 */
async function orderPeople(ex: Executor | null | undefined, orderId: number, actorUserId: number | null | undefined): Promise<string> {
  const r = await (ex ?? db).execute(sql`
    SELECT wo.expert_user_id, e.display_name AS expert, a.display_name AS actor
      FROM prosthetic_work_orders wo
      LEFT JOIN system_users e ON e.id = wo.expert_user_id
      LEFT JOIN system_users a ON a.id = ${actorUserId ?? null}::int
     WHERE wo.id = ${orderId}`);
  const row = (r.rows[0] ?? {}) as any;
  const expert = String(row.expert ?? "").trim();
  const actor = String(row.actor ?? "").trim();
  const byOther = actor && actorUserId != null && Number(row.expert_user_id) !== Number(actorUserId);
  const parts = [expert ? `الخبير: ${expert}` : "", byOther ? `سجّله: ${actor}` : ""].filter(Boolean);
  return parts.length ? `\n${parts.join(" — ")}` : "";
}

export function notifyExamRequest(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number | null; specialty: string; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    //  **ونافذةٌ لمَن أدخله** (§4.em): «أصبح المريض في «معايناتي»» — قبل التلغرام وبمعزلٍ عنه، فتظهر ولو لم يُربط أحد.
    noteExamQueued({ patientId: p.patientId, patient: c.who, department: dept(p.specialty) });
    await enqueueStaffEvent(ex, {
      event: "exam_request", branchId: c.branchId, specialty: p.specialty, excludeUserId: p.actorUserId ?? null,
      text: `🩺 معاينة جديدة في «معايناتي»: ${c.who} — ${dept(p.specialty)}${c.branch}`, linkPath: "/my-exams",
    });
  });
}

export function notifyOrderAssigned(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; expertUserId: number; purpose?: string | null;
  serviceType?: string | null; actorUserId?: number | null;
  /** «متابعة» بدل عنوان الغرض (ترحيل ٠٩٦). */
  kindLabel?: string;
}) {
  return safe(ex, async () => {
    if (p.actorUserId && p.actorUserId === p.expertUserId) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    const kind = p.kindLabel ?? PURPOSE_LABELS[p.purpose ?? "initial_build"] ?? "";
    await enqueueStaffEvent(ex, {
      event: "order_assigned", targetUserIds: [p.expertUserId],
      text: `🛠️ أمر ${kind} جديد مُسند إليك (رقم ${p.orderId}): ${c.who} — ${dept(p.serviceType)}${c.branch}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

/** **عاد المريضُ للقالب النهائي** (§4.bz) — الأمرُ نفسُه يعود إلى خبيره؛ بنوع «أمرٌ مُسند إليك» نفسِه، فلا نوعَ جديد. */
export function notifyTrialReturn(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; expertUserId: number; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    if (p.actorUserId && p.actorUserId === p.expertUserId) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "order_assigned", targetUserIds: [p.expertUserId],
      text: `🦿 عاد المريض للقالب النهائي (أمر رقم ${p.orderId}): ${c.who}${c.branch}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

/** **عاد المريضُ لأخذ القالب** (§4.cl) — لخبير أمره القائم: المريضُ في المركز الآن. */
export function notifyMoldReturn(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; expertUserId: number; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    if (p.actorUserId && p.actorUserId === p.expertUserId) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "order_assigned", targetUserIds: [p.expertUserId],
      text: `🦿 حضر المريض لأخذ القالب (أمر رقم ${p.orderId}): ${c.who}${c.branch}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

export function notifyOrderReassigned(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; oldExpertUserId: number | null; newExpertUserId: number;
  reason?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    if (p.oldExpertUserId === p.newExpertUserId) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    const why = p.reason ? `\nالسبب: ${p.reason}` : "";
    if (p.newExpertUserId !== p.actorUserId) {
      await enqueueStaffEvent(ex, {
        event: "order_reassigned", targetUserIds: [p.newExpertUserId],
        text: `🔁 حُوِّل إليك أمر التصنيع رقم ${p.orderId}: ${c.who}${c.branch}${why}`,
        linkPath: `/manufacturing/orders/${p.orderId}`,
      });
    }
    if (p.oldExpertUserId && p.oldExpertUserId !== p.actorUserId) {
      await enqueueStaffEvent(ex, {
        event: "order_reassigned", targetUserIds: [p.oldExpertUserId],
        text: `↩️ سُحب منك أمر التصنيع رقم ${p.orderId} وحُوِّل إلى خبير آخر: ${c.who}${c.branch}${why}`,
        linkPath: null,
      });
    }
  });
}

export function notifyReturnedFromDoctor(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number | null; reason?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "returned_from_doctor", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `↩️ أعاد الطبيب المريض ${c.who}${c.branch}${p.reason ? `\nالسبب: ${p.reason}` : ""}`,
      linkPath: "/returned-from-doctor",
    });
  });
}

export function notifyAwaitingDecision(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "awaiting_decision", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `📋 عوين ${c.who} وينتظر الحسم: يشتري أم لا${c.branch}`, linkPath: "/post-exam-followups",
    });
  });
}

export function notifyStage(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; stage: "ready_for_fitting" | "delivered";
  actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    const people = await orderPeople(ex, p.orderId, p.actorUserId);
    const text = p.stage === "ready_for_fitting"
      ? `✅ جاهز للتجربة والتسليم: ${c.who} (أمر ${p.orderId})${c.branch} — يُستدعى المريض${people}`
      : `📦 سُلِّم: ${c.who} (أمر ${p.orderId})${c.branch}${people}`;
    await enqueueStaffEvent(ex, {
      event: p.stage, branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text, linkPath: `/patients/${p.patientId}`,
    });
  });
}

export function notifyHoldRework(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; kind: "hold" | "rework";
  reasonCode?: string | null; note?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    const reason = [p.reasonCode ? REASON_CODE_LABELS[p.reasonCode] ?? p.reasonCode : null, p.note].filter(Boolean).join(" — ");
    const people = await orderPeople(ex, p.orderId, p.actorUserId);
    await enqueueStaffEvent(ex, {
      event: "order_hold_rework", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `${p.kind === "hold" ? "⏸️ توقّف" : "🔧 إعادة عمل على"} أمر التصنيع رقم ${p.orderId}: ${c.who}${c.branch}${people}${reason ? `\nالسبب: ${reason}` : ""}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

/**
 * **تغيّر موعد التسليم** (طلبُ المالك ٢٠٢٦-١١-٠٨: «تأجيل فلان») — يُنادى من `updateDeliveryDate` في معاملته حين يتحرّك موعدٌ قائم؛
 * وأوّلُ تحديدٍ ليس تغييراً فلا يُنبَّه به. بنوع «توقّف أو إعادة عمل» نفسِه (`order_hold_rework`) فيصل مَن يتابع ذاك بلا تفعيلٍ جديد.
 */
export function notifyDeliveryDateChanged(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; fromDate: string; toDate: string;
  reason?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    if (!p.fromDate || p.fromDate === p.toDate) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    const people = await orderPeople(ex, p.orderId, p.actorUserId);
    const verb = p.toDate > p.fromDate ? "📅 تأجيل موعد التسليم" : "📅 تقديم موعد التسليم";
    await enqueueStaffEvent(ex, {
      event: "order_hold_rework", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `${verb} — أمر التصنيع رقم ${p.orderId}: ${c.who}${c.branch}\nمن ${p.fromDate} إلى ${p.toDate}${people}${p.reason ? `\nالسبب: ${p.reason}` : ""}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

/**
 * **طلبُ إلغاء أمر تصنيع** (§4.gd) — الخبيرُ يطلب والمديرُ أو المسؤولُ يقرّر. بنوع «توقّف أو إعادة عمل» نفسِه (`order_hold_rework`)،
 * فيصل مدراءَ الفرع والمسؤولَ الذين يتابعون ذاك بلا تفعيلٍ جديد، ورابطُه صفحةُ الأمر حيث زرّا الموافقة والرفض.
 */
export function notifyCancelRequest(ex: Executor | null | undefined, p: {
  orderId: number; patientId: number; branchId: number | null; note: string; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    const people = await orderPeople(ex, p.orderId, p.actorUserId);
    await enqueueStaffEvent(ex, {
      event: "order_hold_rework", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `🛑 طلب إلغاء أمر التصنيع رقم ${p.orderId} — ينتظر موافقتك: ${c.who}${c.branch}${people}\nالسبب: ${p.note}`,
      linkPath: `/manufacturing/orders/${p.orderId}`,
    });
  });
}

export function notifyPaymentCorrection(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number | null; kind: string; reason?: string | null; actorName?: string | null;
  actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "payment_correction_pending", excludeUserId: p.actorUserId ?? null,
      text: `💳 طلب ${p.kind} دفعة ينتظر قرارك: ${c.who}${c.branch}${p.actorName ? ` — من ${p.actorName}` : ""}${p.reason ? `\nالسبب: ${p.reason}` : ""}`,
      linkPath: "/payment-corrections",
    });
  });
}

/**
 * **طلبُ تصحيح صرفٍ أو سطرِ دفتر** (§4.ce التكملة) — للمسؤول وحده، داخل معاملة الطلب نفسِه: طلبٌ لم يُحفظ لا يُنبَّه به.
 * والرابطُ إلى «طلبات التصحيح» حيث يُعتمد كما يُعتمد من الدفتر — الطلبُ واحدٌ في المكانين.
 */
export function notifyMoneyCorrection(ex: Executor | null | undefined, p: {
  branchId: number; what: string; change: string; reason: string; actorName?: string | null;
  actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const r = await (ex ?? db).execute(sql`SELECT name FROM branches WHERE id = ${p.branchId}`);
    const branch = (r.rows[0] as any)?.name ? ` — فرع ${(r.rows[0] as any).name}` : "";
    await enqueueStaffEvent(ex, {
      event: "money_correction_pending", excludeUserId: p.actorUserId ?? null,
      text: `🧾 طلب تصحيح ${p.what} ينتظر قرارك${branch}${p.actorName ? ` — من ${p.actorName}` : ""}\n${p.change}\nالسبب: ${p.reason}`,
      linkPath: "/payment-corrections#money",
    });
  });
}

/**
 * **طلبُ سحبٍ من القاصات** (§4.fy) — للمسؤول، داخل معاملة الطلب نفسِه. والنصُّ يقول كلَّ ما يحتاجه القرار: الفرعُ والدفترُ والقاصة،
 * والمبلغُ رقماً وكلمات، والرصيدُ الآن وبعده، والغرض، والطالب.
 */
export function notifyReserveWithdrawalPending(ex: Executor | null | undefined, p: {
  branchId: number; bookLabel: string; boxLabel: string; amountText: string; amountWords: string;
  balanceText: string; afterText: string; exceeds: boolean; purpose: string; actorName?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const r = await (ex ?? db).execute(sql`SELECT name FROM branches WHERE id = ${p.branchId}`);
    const branch = (r.rows[0] as any)?.name ? `فرع ${(r.rows[0] as any).name}` : `فرع #${p.branchId}`;
    await enqueueStaffEvent(ex, {
      event: "reserve_withdrawal_pending", excludeUserId: p.actorUserId ?? null,
      text: [
        `💰 طلب سحب من ${p.boxLabel} ينتظر قرارك`,
        `${branch} — ${p.bookLabel}`,
        `المبلغ: ${p.amountText} دينار (${p.amountWords})`,
        `الرصيد الآن: ${p.balanceText} — وبعد السحب: ${p.afterText}${p.exceeds ? " ⚠️ المبلغ أكبر من الرصيد" : ""}`,
        `الغرض: ${p.purpose}`,
        p.actorName ? `الطالب: ${p.actorName}` : "",
      ].filter(Boolean).join("\n"),
      linkPath: "/payment-corrections#withdrawals",
    });
  });
}

/** قرارُ المسؤول على طلب السحب — لطالبه وحده. */
export function notifyReserveWithdrawalDecided(ex: Executor | null | undefined, p: {
  requesterUserId: number; approved: boolean; boxLabel: string; amountText: string; note?: string | null;
}) {
  return safe(ex, async () => {
    await enqueueStaffEvent(ex, {
      event: "reserve_withdrawal_decided", targetUserIds: [p.requesterUserId],
      text: p.approved
        ? `✅ اعتُمد طلبُك للسحب من ${p.boxLabel}: ${p.amountText} دينار — سُجّل في دفتر القاصة${p.note ? `\nملاحظة المسؤول: ${p.note}` : ""}`
        : `❌ رُفض طلبُك للسحب من ${p.boxLabel}: ${p.amountText} دينار — لم يتغيّر شيء${p.note ? `\nالسبب: ${p.note}` : ""}`,
      linkPath: "/cash-book",
    });
  });
}

/**
 * **كلُّ مبلغٍ يدخل أيَّ فرع** (قرارُ المالك ٢٠٢٦-١٠-٠٤، للمسؤول وحده) — يُنادى من `insertPaymentRow`، الكاتبِ
 * الوحيد لصفوف الدفعات الموجبة، فلا بابَ دفعٍ يفلت. والقسمُ من حالة الدفعة، وإن غابت فوسمُها كما كُتب.
 * والصفرُ (جلساتٌ مُهداة) ليس مالاً يدخل فلا يُنبَّه به.
 */
export function notifyPaymentReceived(ex: Executor | null | undefined, p: {
  paymentId: number; patientId: number; branchId: number; amount: number; caseId?: number | null;
  treatmentTag?: string | null; date?: Date | null;
}) {
  return safe(ex, async () => {
    if (!(p.amount > 0)) return;
    const c = await ctx(ex, p.patientId, p.branchId);
    let section = "";
    if (p.caseId != null) {
      const r = await (ex ?? db).execute(sql`SELECT case_type FROM patient_cases WHERE id = ${p.caseId}`);
      section = dept((r.rows[0] as any)?.case_type);
    }
    if (!section && p.treatmentTag) section = dept(p.treatmentTag) || String(p.treatmentTag).trim();
    const day = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    const back = p.date && day(p.date) !== day(new Date()) ? `\nبتاريخ ${day(p.date)}` : "";
    await enqueueStaffEvent(ex, {
      event: "payment_received",
      text: `💰 دفعة ${p.amount.toLocaleString("en-US")} د.ع من ${c.who}${section ? ` — ${section}` : ""}${c.branch}${back}`,
      linkPath: `/patients/${p.patientId}`,
    });
  });
}

export function notifyAiSuggestion(p: { title: string; actorName?: string | null; actorUserId?: number | null }) {
  return safe(null, async () => {
    await enqueueStaffEvent(null, {
      event: "ai_suggestion", excludeUserId: p.actorUserId ?? null,
      text: `💡 اقتراح معرفة جديد للمساعد الذكي${p.actorName ? ` من ${p.actorName}` : ""}: ${p.title}`,
      linkPath: "/admin",
    });
  });
}

/**
 * **طلبُ استرجاع مبلغٍ لمريض** (§4.fz) — للمسؤول، داخل معاملة الطلب نفسِه: المريضُ ورمزُه والفرعُ والقسم، والمبلغُ رقماً وكلمات،
 * وما دفعه وما استُرجع قبله، والسببُ وتفصيلُه، والطالب.
 */
export function notifyRefundPending(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number; caseLabel: string; amountText: string; amountWords: string;
  netPaidText: string; refundedBeforeText: string; reason: string; detail: string; requestId: number;
  actorName?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
    await enqueueStaffEvent(ex, {
      event: "refund_request_pending", excludeUserId: p.actorUserId ?? null,
      text: [
        `↩️ طلب استرجاع بانتظار اعتمادك`,
        `المريض: ${c.who}${c.branch}`,
        `القسم: ${p.caseLabel}`,
        `المبلغ: ${p.amountText} دينار (${p.amountWords})`,
        `صافي ما دفعه: ${p.netPaidText} — واستُرجع قبله: ${p.refundedBeforeText}`,
        `السبب: ${p.reason} — ${p.detail}`,
        p.actorName ? `الطالب: ${p.actorName}` : "",
      ].filter(Boolean).join("\n"),
      linkPath: "/payment-corrections#refunds",
    });
  });
}

/** قرارُ المسؤول على طلب الاسترجاع — لطالبه وحده، وفيه رقمُ السند ليُطبع ويوقّعه المريض. */
export function notifyRefundDecided(ex: Executor | null | undefined, p: {
  requesterUserId: number; approved: boolean; patientName: string; amountText: string; voucherNo: string; patientId: number;
  note?: string | null;
}) {
  return safe(ex, async () => {
    await enqueueStaffEvent(ex, {
      event: "refund_request_decided", targetUserIds: [p.requesterUserId],
      text: p.approved
        ? `✅ اعتُمد الاسترجاع: ${p.patientName} — ${p.amountText} دينار\nسلّم المبلغ للمريض واطبع «استمارة استرداد مبلغ» رقم ${p.voucherNo} ليوقّعها.${p.note ? `\nملاحظة المسؤول: ${p.note}` : ""}`
        : `❌ رُفض طلب الاسترجاع: ${p.patientName} — ${p.amountText} دينار — لم يتغيّر شيء${p.note ? `\nالسبب: ${p.note}` : ""}`,
      linkPath: `/patients/${p.patientId}`,
    });
  });
}

/** **طلبُ تسليمٍ لمستشفى العين** (§4.fz) — للمسؤول: الفرعُ والمبلغُ رقماً وكلمات، والمتبقّي الآن وبعد التسليم، والملاحظة والطالب. */
export function notifyHospitalDeliveryPending(ex: Executor | null | undefined, p: {
  branchId: number; amountText: string; amountWords: string; remainingText: string; afterText: string; exceeds: boolean;
  note?: string | null; actorName?: string | null; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const r = await (ex ?? db).execute(sql`SELECT name FROM branches WHERE id = ${p.branchId}`);
    const branch = (r.rows[0] as any)?.name ? `فرع ${(r.rows[0] as any).name}` : `فرع #${p.branchId}`;
    await enqueueStaffEvent(ex, {
      event: "hospital_delivery_pending", excludeUserId: p.actorUserId ?? null,
      text: [
        `🏥 طلب تسليم لمستشفى العين ينتظر قرارك — ${branch}`,
        `المبلغ: ${p.amountText} دينار (${p.amountWords})`,
        `المتبقّي للمستشفى الآن: ${p.remainingText} — وبعد التسليم: ${p.afterText}${p.exceeds ? " ⚠️ المبلغ أكبر من المتبقّي" : ""}`,
        p.note ? `ملاحظة: ${p.note}` : "",
        p.actorName ? `الطالب: ${p.actorName}` : "",
      ].filter(Boolean).join("\n"),
      linkPath: "/payment-corrections#hospital",
    });
  });
}

/** قرارُ المسؤول على طلب التسليم — لطالبه وحده. */
export function notifyHospitalDeliveryDecided(ex: Executor | null | undefined, p: {
  requesterUserId: number; approved: boolean; amountText: string; note?: string | null;
}) {
  return safe(ex, async () => {
    await enqueueStaffEvent(ex, {
      event: "hospital_delivery_decided", targetUserIds: [p.requesterUserId],
      text: p.approved
        ? `✅ اعتُمد تسليمُ ${p.amountText} دينار لمستشفى العين — نقص مربّع النسبة${p.note ? `\nملاحظة المسؤول: ${p.note}` : ""}`
        : `❌ رُفض طلبُ تسليم ${p.amountText} دينار لمستشفى العين — لم يتغيّر شيء${p.note ? `\nالسبب: ${p.note}` : ""}`,
      linkPath: "/cash-book",
    });
  });
}
