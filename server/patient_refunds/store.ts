// **طلبُ استرجاع مبلغٍ لمريض** (ترحيل ١٩١، §4.fz) — طبقةُ البيانات.
//
// الاعتمادُ يكتب **حركةً مستقلّة** بالكاتب الواحد للردّ (`recordRefundPaymentTx` — صفٌّ سالبٌ في `payments` بيوم الاعتماد وقيدُه المرآة)،
// والدفعةُ الأصلية لا تُمَسّ. وكلُّ ما يقرّر المالَ يُعاد قراءتُه **تحت القفل** لحظةَ الاعتماد: الملفُّ قائمٌ لا في السلّة، والحالةُ للمريض نفسِه،
// والمبلغُ لا يتجاوز صافي ما دُفع لها الآن. وقفلُ المريض هو قفلُ إغلاق الحالة نفسُه (`919`)، فلا يتسابق استرجاعان ولا استرجاعٌ وإغلاق.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { recordRefundPaymentTx } from "../accounting/refund_payment";
import { CLOSURE_PAYMENT_TAG, type ClosureServiceType } from "@shared/case_closure";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { REFUND_CASE_LABELS, REFUND_EXCEEDS_ERROR, refundReasonLabel } from "@shared/patient_refunds";

export class RefundError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Tx = { execute: (q: any) => Promise<any> };

async function rows<T = Record<string, any>>(ex: Tx, q: any): Promise<T[]> {
  const r = await ex.execute(q);
  return (r.rows ?? []) as T[];
}

export interface RequestRow {
  id: number; patientId: number; caseId: number; caseType: string; branchId: number; amount: number;
  reason: string; detail: string; netPaidAtRequest: number | null; status: string;
  requestedBy: number | null; requestedByName: string | null; requestedAt: string;
  decidedBy: number | null; decidedByName: string | null; decidedAt: string | null; decisionNote: string | null;
  deductHospital: boolean | null; reduceCost: boolean | null; costBefore: number | null; costAfter: number | null;
  paymentId: number | null;
  patientName?: string | null; patientCode?: string | null; branchName?: string | null;
}

const SELECT_ROW = sql`
  SELECT r.id, r.patient_id AS "patientId", r.case_id AS "caseId", r.case_type AS "caseType", r.branch_id AS "branchId",
         r.amount, r.reason, r.detail, r.net_paid_at_request AS "netPaidAtRequest", r.status,
         r.requested_by AS "requestedBy", r.requested_by_name AS "requestedByName", r.requested_at AS "requestedAt",
         r.decided_by AS "decidedBy", r.decided_by_name AS "decidedByName", r.decided_at AS "decidedAt",
         r.decision_note AS "decisionNote", r.deduct_hospital AS "deductHospital", r.reduce_cost AS "reduceCost",
         r.cost_before AS "costBefore", r.cost_after AS "costAfter", r.payment_id AS "paymentId",
         p.name AS "patientName", p.patient_code AS "patientCode", b.name AS "branchName"
    FROM patient_refund_requests r
    JOIN patients p ON p.id = r.patient_id
    LEFT JOIN branches b ON b.id = r.branch_id`;

/** صافي ما دُفع للحالة (والاسترجاعُ السابق سالبٌ فيه)، وما استُرجع منها قبلُ موجباً — كما يقرؤه إغلاقُ الحالة. */
export async function caseMoneyTx(ex: Tx, caseId: number): Promise<{ net: number; refunded: number }> {
  const [r] = await rows<{ net: number; refunded: number }>(ex, sql`
    SELECT COALESCE(SUM(amount), 0)::int AS net,
           COALESCE(SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END), 0)::int AS refunded
      FROM payments WHERE case_id = ${caseId}`);
  return { net: Number(r?.net ?? 0), refunded: Number(r?.refunded ?? 0) };
}

/** مجموعُ المعلَّق على الحالة (عدا طلبٍ بعينه). */
async function pendingOnCaseTx(ex: Tx, caseId: number, exceptId?: number): Promise<number> {
  const [r] = await rows<{ t: number }>(ex, sql`
    SELECT COALESCE(SUM(amount), 0)::int AS t FROM patient_refund_requests
     WHERE case_id = ${caseId} AND status = 'pending' AND id <> ${exceptId ?? 0}`);
  return Number(r?.t ?? 0);
}

/** قفلُ المريض — قفلُ إغلاق الحالة نفسُه — والملفُّ قائمٌ لا في السلّة. */
async function lockPatientTx(tx: Tx, patientId: number) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
  const [p] = await rows<{ id: number; deleted_at: string | null; name: string | null }>(tx, sql`
    SELECT id, deleted_at, name FROM patients WHERE id = ${patientId} FOR UPDATE`);
  if (!p) throw new RefundError(404, "المريض غير موجود");
  if (p.deleted_at) throw new RefundError(409, PATIENT_IN_TRASH_ERROR);
  return p;
}

async function caseOfPatientTx(tx: Tx, patientId: number, caseId: number) {
  const [c] = await rows<{ id: number; case_type: string; cost: number | null }>(tx, sql`
    SELECT id, case_type, cost FROM patient_cases WHERE id = ${caseId} AND patient_id = ${patientId} FOR UPDATE`);
  if (!c) throw new RefundError(409, "الحالة لم تعد في ملفّ هذا المريض — لم يتغيّر شيء");
  return c;
}

/** ما يُعرض في نافذة الطلب: كلُّ حالةٍ للمريض بكلفتها وصافي ما دُفع لها وما استُرجع والمعلَّق والمتاح. */
export async function refundOptions(patientId: number) {
  const cases = await rows<{ id: number; case_type: string; cost: number | null }>(db as any, sql`
    SELECT id, case_type, cost FROM patient_cases WHERE patient_id = ${patientId} ORDER BY id`);
  const out = [];
  for (const c of cases) {
    const m = await caseMoneyTx(db as any, c.id);
    const pending = await pendingOnCaseTx(db as any, c.id);
    out.push({
      caseId: c.id, caseType: c.case_type, label: REFUND_CASE_LABELS[c.case_type] ?? c.case_type,
      cost: Number(c.cost ?? 0), netPaid: m.net, refundedBefore: m.refunded, pending,
      available: Math.max(0, m.net - pending),
    });
  }
  return out;
}

/** أوّلُ دفعةٍ موجبةٍ للحالة في يوم بغداد — لاقتراح «أيُخصم من نسبة المستشفى»: ما دُفع قبل بداية المربّع لم تُعزل نسبتُه فيه. */
export async function caseHasPaymentSince(caseId: number, day: string): Promise<boolean> {
  const [r] = await rows<{ n: number }>(db as any, sql`
    SELECT COUNT(*)::int AS n FROM payments
     WHERE case_id = ${caseId} AND amount > 0 AND (date + interval '3 hours')::date >= ${day}::date`);
  return Number(r?.n ?? 0) > 0;
}

export async function create(p: {
  patientId: number; caseId: number; branchId: number; amount: number; reason: string; detail: string;
  userId: number | null; userName: string | null;
}, after: (tx: Tx, row: RequestRow, money: { net: number; refunded: number; pending: number; caseType: string }) => Promise<void>,
  /** للمسؤول: الاعتمادُ في المعاملة نفسِها — فشلُه يُسقط الطلبَ معه. */
  andThen?: (tx: Tx, row: RequestRow) => Promise<RequestRow>): Promise<RequestRow> {
  return await db.transaction(async (tx: any) => {
    await lockPatientTx(tx, p.patientId);
    const c = await caseOfPatientTx(tx, p.patientId, p.caseId);
    const m = await caseMoneyTx(tx, p.caseId);
    const pending = await pendingOnCaseTx(tx, p.caseId);
    if (m.net <= 0) throw new RefundError(409, "لا مبلغَ مدفوعاً لهذه الحالة يُسترجع منه");
    if (p.amount > m.net - pending) {
      throw new RefundError(409, pending > 0
        ? `${REFUND_EXCEEDS_ERROR} بعد المعلَّق عليها — المتاح الآن ${(m.net - pending).toLocaleString("en-US")}`
        : REFUND_EXCEEDS_ERROR);
    }
    //  المكرّرُ وحده يُردّ: الطالبُ نفسُه والحالةُ والمبلغُ والتفصيلُ نفسُها معلَّقةٌ قبلُ — ضغطتان على «إرسال».
    const [dup] = await rows<{ id: number }>(tx, sql`
      SELECT id FROM patient_refund_requests
       WHERE case_id = ${p.caseId} AND status = 'pending' AND amount = ${p.amount} AND detail = ${p.detail}
         AND requested_by IS NOT DISTINCT FROM ${p.userId}`);
    if (dup) throw new RefundError(409, `طلبٌ بالمبلغ والتفصيل نفسيهما معلَّقٌ قبلُ (رقم ${dup.id}) — بانتظار المسؤول`);
    const [ins] = await rows<{ id: number }>(tx, sql`
      INSERT INTO patient_refund_requests
        (patient_id, case_id, case_type, branch_id, amount, reason, detail, net_paid_at_request, requested_by, requested_by_name)
      VALUES (${p.patientId}, ${p.caseId}, ${c.case_type}, ${p.branchId}, ${p.amount}, ${p.reason}, ${p.detail}, ${m.net},
              ${p.userId}, ${p.userName})
      RETURNING id`);
    const row = (await rows<RequestRow>(tx, sql`${SELECT_ROW} WHERE r.id = ${ins.id}`))[0];
    await after(tx, row, { ...m, pending, caseType: c.case_type });
    return andThen ? await andThen(tx, row) : row;
  });
}

export async function getRequest(id: number): Promise<RequestRow | null> {
  return (await rows<RequestRow>(db as any, sql`${SELECT_ROW} WHERE r.id = ${id}`))[0] ?? null;
}

export async function listRequests(p: {
  status?: string | null; branchId?: number | null; requestedBy?: number | null; patientId?: number | null; limit?: number;
}): Promise<RequestRow[]> {
  return await rows<RequestRow>(db as any, sql`${SELECT_ROW}
    WHERE (${p.status ?? null}::text IS NULL OR r.status = ${p.status ?? null})
      AND (${p.branchId ?? null}::int IS NULL OR r.branch_id = ${p.branchId ?? null})
      AND (${p.requestedBy ?? null}::int IS NULL OR r.requested_by = ${p.requestedBy ?? null})
      AND (${p.patientId ?? null}::int IS NULL OR r.patient_id = ${p.patientId ?? null})
    ORDER BY r.requested_at DESC, r.id DESC
    LIMIT ${Math.min(Math.max(p.limit ?? 200, 1), 500)}`);
}

export async function pendingCount(): Promise<number> {
  const [r] = await rows<{ n: number }>(db as any, sql`SELECT COUNT(*)::int AS n FROM patient_refund_requests WHERE status = 'pending'`);
  return Number(r?.n ?? 0);
}

/** طلبٌ لم يُحسم بعد على الحالة نفسِها — للبطاقة: «طلباتٌ أخرى معلَّقة». */
export async function otherPendingOnCase(caseId: number, exceptId: number) {
  const [r] = await rows<{ n: number; t: number }>(db as any, sql`
    SELECT COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::int AS t FROM patient_refund_requests
     WHERE case_id = ${caseId} AND status = 'pending' AND id <> ${exceptId}`);
  return { count: Number(r?.n ?? 0), amount: Number(r?.t ?? 0) };
}

/**
 * **الاعتماد** — في معاملةٍ واحدة: يُحجَز الطلب (ضغطتان ⟵ واحدة تنجح)، ثمّ يُقفَل المريض ويُعاد فحصُ كلِّ ما يقرّر المال،
 * ثمّ — إن اختار المسؤول — تنقص كلفةُ الحالة بالمبلغ (بقيدٍ في دفتر الكلف كقلم الكلفة)، ثمّ تُكتب دفعةُ الاسترجاع بقيدها.
 * وأيُّ فشلٍ يُسقط كلَّ شيء فيبقى الطلبُ معلَّقاً كأن شيئاً لم يقع.
 */
export interface ApproveInput {
  userId: number | null; userName: string | null; note: string | null;
  deductHospital: boolean | null; reduceCost: boolean;
  /** حارسُ متابعة البيع الحيّة قبل تخفيض كلفة جهاز — يُمرَّر من النقطة (قراءةٌ بلا قفل، كقلم الكلفة). */
  hasActiveFollowup: (patientId: number, caseType: string) => Promise<boolean>;
}
type AfterApprove = (tx: Tx, row: RequestRow, done: { paymentId: number; journalPosted: boolean }) => Promise<void>;

/** ما يُفحص قبل معاملة الاعتماد — متابعةُ بيعٍ حيّة تمنع تخفيضَ كلفة الجهاز (كقلم الكلفة). */
export async function approvePrecheck(p: { patientId: number; caseType: string; reduceCost: boolean;
  hasActiveFollowup: ApproveInput["hasActiveFollowup"] }) {
  if (p.reduceCost && (p.caseType === "prosthetic" || p.caseType === "medical_support")
    && await p.hasActiveFollowup(p.patientId, p.caseType)) {
    throw new RefundError(409, "لهذا القسم جهازٌ ينتظر قرار البيع — احسمه أوّلاً، أو اعتمد الاسترجاع بلا تخفيض الكلفة");
  }
}

export async function approve(id: number, p: ApproveInput, after: AfterApprove): Promise<RequestRow> {
  const cur = await getRequest(id);
  if (!cur) throw new RefundError(404, "الطلب غير موجود");
  if (cur.status !== "pending") throw new RefundError(409, "حُسم هذا الطلبُ قبلُ");
  await approvePrecheck({ patientId: cur.patientId, caseType: cur.caseType, reduceCost: p.reduceCost, hasActiveFollowup: p.hasActiveFollowup });
  return await db.transaction(async (tx: any) => approveTx(tx, id, p, after));
}

/**
 * **كتابةُ الاعتماد في معاملةٍ قائمة** — من نقطة الاعتماد، ومن استرجاع المسؤول المباشر داخل معاملة إنشاء الطلب نفسِها
 * (فلا يبقى طلبٌ معلَّقٌ يتيم إن فشل الاعتماد — مراجعةُ ٢٠٢٦-١١-٠٦).
 */
export async function approveTx(tx: Tx, id: number, p: ApproveInput, after: AfterApprove): Promise<RequestRow> {
  const claimed = await rows<{ id: number }>(tx, sql`
    UPDATE patient_refund_requests SET status = 'approved', decided_by = ${p.userId}, decided_by_name = ${p.userName},
           decided_at = now(), decision_note = ${p.note}
     WHERE id = ${id} AND status = 'pending' RETURNING id`);
  if (!claimed.length) throw new RefundError(409, "حُسم هذا الطلبُ قبلُ");
  const cur = (await rows<RequestRow>(tx, sql`${SELECT_ROW} WHERE r.id = ${id}`))[0];
  await lockPatientTx(tx, cur.patientId);
  const c = await caseOfPatientTx(tx, cur.patientId, cur.caseId);
  const m = await caseMoneyTx(tx, cur.caseId);
  if (cur.amount > m.net) {
    throw new RefundError(409, `${REFUND_EXCEEDS_ERROR} الآن (${m.net.toLocaleString("en-US")}) — لم يتغيّر شيء`);
  }
  //  **خطّةُ أقساطٍ نشطة على الحالة** (مراجعةُ ٢٠٢٦-١١-٠٦): الدفعةُ السالبة تُنقص «ما دُفع نحوها» فتُظهر أقساطاً متأخّرة لا يستحقّها المريض —
  //  فلا استرجاعَ قبل أن تُعدَّل الخطّةُ أو تُلغى من صفحة «الأقساط».
  const [plan] = await rows<{ id: number }>(tx, sql`
    SELECT id FROM installment_plans WHERE case_id = ${cur.caseId} AND status = 'active' LIMIT 1`);
  if (plan) {
    throw new RefundError(409, "لهذه الحالة خطّةُ أقساطٍ نشطة — عدّلها أو ألغِها من «الأقساط» أوّلاً، ثمّ اعتمد الاسترجاع");
  }
  let costBefore: number | null = null;
  let costAfter: number | null = null;
  if (p.reduceCost) {
    const [pt] = await rows<{ branch_id: number }>(tx, sql`SELECT branch_id FROM patients WHERE id = ${cur.patientId}`);
    costBefore = Number(c.cost ?? 0);
    costAfter = Math.max(0, costBefore - cur.amount);
    const delta = costAfter - costBefore;
    if (delta !== 0) {
      await tx.execute(sql`UPDATE patient_cases SET cost = ${costAfter}, cost_source = 'manual', updated_at = now()
                            WHERE id = ${cur.caseId} AND patient_id = ${cur.patientId}`);
      await tx.execute(sql`UPDATE patients SET total_cost = COALESCE(total_cost, 0) + ${delta} WHERE id = ${cur.patientId}`);
      await tx.execute(sql`
        INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes)
        VALUES (${cur.patientId}, ${Number(pt?.branch_id ?? cur.branchId)}, ${delta}, 'refund_cost_reduction', ${cur.caseId},
                ${`تخفيض كلفة الحالة مع الاسترجاع — سند ${cur.id}`})`);
    }
  }
  const service = c.case_type as ClosureServiceType;
  const written = await recordRefundPaymentTx(tx, {
    patientId: cur.patientId, branchId: cur.branchId, caseId: cur.caseId, amount: cur.amount,
    paymentTreatmentType: CLOSURE_PAYMENT_TAG[service] ?? null,
    //  «سند ن — السبب: التفصيل» — والدفترُ يكتب قبلها «استرجاع: الاسم»، وجدولُ الدفعات يسمها «استرجاع» بالأحمر.
    notes: `سند ${cur.id} — ${refundReasonLabel(cur.reason)}: ${cur.detail}`,
    actorUserId: p.userId,
  });
  await tx.execute(sql`
    UPDATE patient_refund_requests SET payment_id = ${written.paymentId}, deduct_hospital = ${p.deductHospital},
           reduce_cost = ${p.reduceCost}, cost_before = ${costBefore}, cost_after = ${costAfter}
     WHERE id = ${id}`);
  const row = (await rows<RequestRow>(tx, sql`${SELECT_ROW} WHERE r.id = ${id}`))[0];
  await after(tx, row, { paymentId: written.paymentId, journalPosted: written.journalPosted });
  return row;
}

export async function reject(id: number, p: { userId: number | null; userName: string | null; note: string },
  after: (tx: Tx, row: RequestRow) => Promise<void>): Promise<RequestRow> {
  return await db.transaction(async (tx: any) => {
    const claimed = await rows<{ id: number }>(tx, sql`
      UPDATE patient_refund_requests SET status = 'rejected', decided_by = ${p.userId}, decided_by_name = ${p.userName},
             decided_at = now(), decision_note = ${p.note}
       WHERE id = ${id} AND status = 'pending' RETURNING id`);
    if (!claimed.length) {
      const cur = await getRequest(id);
      throw new RefundError(cur ? 409 : 404, cur ? "حُسم هذا الطلبُ قبلُ" : "الطلب غير موجود");
    }
    const row = (await rows<RequestRow>(tx, sql`${SELECT_ROW} WHERE r.id = ${id}`))[0];
    await after(tx, row);
    return row;
  });
}
