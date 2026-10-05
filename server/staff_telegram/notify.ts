// **نصوصُ تنبيهات الموظّفين لكلّ حدث** (§4.by) — كلُّ دالّةٍ تُنادى من موضع الكتابة نفسِه **داخل معاملته**، وتقرأ
// الاسمَ والرمزَ والفرعَ بالمنفِّذ نفسِه، ثمّ تُدرج صفّاً في الصندوق. **ولا ترمي أبداً**: تنبيهٌ لا يُسقط عملية.
// واسمُ المريض في النصّ بقرار المالك: «مَن سيستلم هو مَن يعرف كلَّ تفاصيل المريض».
import { sql } from "drizzle-orm";
import { DEPARTMENT_LABELS, type Department } from "@shared/service_taxonomy";
import { PURPOSE_LABELS, REASON_CODE_LABELS } from "@shared/manufacturing";
import { enqueueStaffEvent, type Executor } from "./outbox";
import { db } from "../db";

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

export function notifyExamRequest(ex: Executor | null | undefined, p: {
  patientId: number; branchId: number | null; specialty: string; actorUserId?: number | null;
}) {
  return safe(ex, async () => {
    const c = await ctx(ex, p.patientId, p.branchId);
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
    const text = p.stage === "ready_for_fitting"
      ? `✅ جاهز للتجربة والتسليم: ${c.who} (أمر ${p.orderId})${c.branch} — يُستدعى المريض`
      : `📦 سُلِّم: ${c.who} (أمر ${p.orderId})${c.branch}`;
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
    await enqueueStaffEvent(ex, {
      event: "order_hold_rework", branchId: c.branchId, excludeUserId: p.actorUserId ?? null,
      text: `${p.kind === "hold" ? "⏸️ توقّف" : "🔧 إعادة عمل على"} أمر التصنيع رقم ${p.orderId}: ${c.who}${c.branch}${reason ? `\nالسبب: ${reason}` : ""}`,
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
