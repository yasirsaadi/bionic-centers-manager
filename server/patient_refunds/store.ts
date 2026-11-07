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
import {
  REFUND_CASE_LABELS, REFUND_EXCEEDS_ERROR, REFUND_SESSIONS_EXCEED_ERROR, REFUND_SESSIONS_REQUIRED_ERROR, refundReasonLabel,
  returnedSessionsLine, type ReturnedSessions,
} from "@shared/patient_refunds";
import {
  PHYSIO_KNOWN_TREATMENT_PRICES, describePhysioPlan, physioPlanKeyForPayment, resolvePurchasedSessions, type PhysioPlanEntry,
} from "@shared/pricing";
import { physioSessionRows } from "@shared/physio_sheet_view";

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
  paymentId: number | null; sessionsReturned: ReturnedSessions[] | null;
  patientName?: string | null; patientCode?: string | null; branchName?: string | null;
}

const SELECT_ROW = sql`
  SELECT r.id, r.patient_id AS "patientId", r.case_id AS "caseId", r.case_type AS "caseType", r.branch_id AS "branchId",
         r.amount, r.reason, r.detail, r.net_paid_at_request AS "netPaidAtRequest", r.status,
         r.requested_by AS "requestedBy", r.requested_by_name AS "requestedByName", r.requested_at AS "requestedAt",
         r.decided_by AS "decidedBy", r.decided_by_name AS "decidedByName", r.decided_at AS "decidedAt",
         r.decision_note AS "decisionNote", r.deduct_hospital AS "deductHospital", r.reduce_cost AS "reduceCost",
         r.cost_before AS "costBefore", r.cost_after AS "costAfter", r.payment_id AS "paymentId", r.sessions_returned AS "sessionsReturned",
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

export interface PhysioSessionState {
  treatmentType: string; bought: number; done: number; remaining: number;
  /** معلَّقٌ في طلباتِ استرجاعٍ أخرى على الحالة. */
  pending: number;
  /** ما يجوز إرجاعُه الآن: الباقي غيرُ المحضور ناقصاً المعلَّق. */
  available: number;
  price: number | null;
}

/**
 * **جلساتُ قسم العلاج الطبيعي لكلّ نوع** — بقاعدة ملفّ المريض نفسِها (`resolvePurchasedSessions` ثمّ `physioSessionRows`):
 * دفعاتُ الحالة وما بلا حالة، وزياراتُها بلا حلقة جهاز. والمُرجَعُ سابقاً مطروحٌ بالقاعدة نفسِها.
 */
export async function physioSessionStateTx(ex: Tx, patientId: number, caseId: number, exceptRequestId?: number) {
  const [pt] = await rows<{ physio_plan: unknown; treatment_type: string | null; total_cost: number | null }>(ex, sql`
    SELECT physio_plan, treatment_type, total_cost FROM patients WHERE id = ${patientId}`);
  const [c] = await rows<{ cost: number | null }>(ex, sql`SELECT cost FROM patient_cases WHERE id = ${caseId}`);
  const pays = await rows<{ payment_treatment_type: string | null; session_count: number | null; is_free_sessions: boolean | null; returned_sessions: unknown }>(ex, sql`
    SELECT payment_treatment_type, session_count, is_free_sessions, returned_sessions FROM payments
     WHERE patient_id = ${patientId} AND (case_id = ${caseId} OR case_id IS NULL)`);
  const visits = await rows<{ treatment_type: string | null; details: string | null; notes: string | null }>(ex, sql`
    SELECT treatment_type, details, notes FROM visits
     WHERE patient_id = ${patientId} AND deleted_at IS NULL AND device_episode_id IS NULL
       AND (case_id = ${caseId} OR case_id IS NULL)`);
  const plan = Array.isArray(pt?.physio_plan) ? (pt!.physio_plan as any[]) : null;
  const bought = resolvePurchasedSessions({
    plan, treatmentTypeText: pt?.treatment_type ?? null,
    caseCost: c ? Number(c.cost ?? 0) : Number(pt?.total_cost ?? 0),
    paymentSessions: pays.map((x) => ({
      treatmentType: x.payment_treatment_type, sessionCount: x.session_count, isFree: x.is_free_sessions === true,
      returned: Array.isArray(x.returned_sessions) ? (x.returned_sessions as any[]) : null,
    })),
  });
  const pendingRows = await rows<{ sessions_returned: unknown }>(ex, sql`
    SELECT sessions_returned FROM patient_refund_requests
     WHERE case_id = ${caseId} AND status = 'pending' AND id <> ${exceptRequestId ?? 0}`);
  const pendingBy: Record<string, number> = {};
  for (const r of pendingRows) {
    for (const x of (Array.isArray(r.sessions_returned) ? r.sessions_returned : []) as ReturnedSessions[]) {
      pendingBy[x.treatmentType] = (pendingBy[x.treatmentType] ?? 0) + (Number(x.sessionCount) || 0);
    }
  }
  const state: PhysioSessionState[] = physioSessionRows(bought.byType,
    visits.map((v) => ({ treatmentType: v.treatment_type, details: v.details, notes: v.notes })))
    .map((r) => {
      const remaining = Math.max(0, r.remaining);
      const pending = pendingBy[r.type] ?? 0;
      return { treatmentType: r.type, bought: r.bought, done: r.done, remaining, pending,
        available: Math.max(0, remaining - pending), price: PHYSIO_KNOWN_TREATMENT_PRICES[r.type] ?? null };
    });
  return { state, hasPlan: bought.source === "plan", source: bought.source };
}

/**
 * **فحصُ الجلسات المُرجَعة** — لقسم العلاج الطبيعي مصفوفةٌ إلزامية (والفارغةُ «لا جلسات»)، ولغيره لا شيء.
 * كلُّ نوعٍ من أنواع الحالة، ولا يتجاوز ما يجوز إرجاعُه الآن.
 */
export async function checkReturnedSessionsTx(ex: Tx, p: {
  patientId: number; caseId: number; caseType: string; list: ReturnedSessions[] | null; exceptRequestId?: number;
}): Promise<{ list: ReturnedSessions[] | null; hasPlan: boolean; source: string; state: PhysioSessionState[] }> {
  if (p.caseType !== "physiotherapy") {
    if (p.list && p.list.length) throw new RefundError(400, "الجلساتُ تُرجَع مع قسم العلاج الطبيعي وحده");
    return { list: null, hasPlan: false, source: "none", state: [] };
  }
  if (!p.list) throw new RefundError(400, REFUND_SESSIONS_REQUIRED_ERROR);
  const { state, hasPlan, source } = await physioSessionStateTx(ex, p.patientId, p.caseId, p.exceptRequestId);
  for (const x of p.list) {
    const row = state.find((r) => r.treatmentType === x.treatmentType);
    if (!row) throw new RefundError(409, `لا جلساتِ «${x.treatmentType}» في هذا القسم — لم يتغيّر شيء`);
    if (x.sessionCount > row.available) {
      throw new RefundError(409, `${REFUND_SESSIONS_EXCEED_ERROR} في «${x.treatmentType}» — الممكن الآن ${row.available}`
        + (row.pending > 0 ? ` (ومعلَّقٌ في طلبٍ آخر ${row.pending})` : ""));
    }
  }
  return { list: p.list, hasPlan, source, state };
}

/**
 * **إنقاصُ الخطّة لصاحبها** — بقاعدة `adjustPhysioPlanForGift` (المفتاحُ والقفلُ والنصّ)، **إلّا أنّ الخطّة لا تُفرَّغ**:
 * ما يبلغ الصفرَ كلُّه يبقى مُعلَّماً `depleted` فيبقى العدّادُ على الخطّة لا على الكلفة والدفعات (مراجعةُ Codex).
 */
async function returnFromPlanTx(tx: Tx, patientId: number, list: ReturnedSessions[]) {
  const [row] = await rows<{ physio_plan: unknown }>(tx, sql`SELECT physio_plan FROM patients WHERE id = ${patientId} FOR UPDATE`);
  const current = Array.isArray(row?.physio_plan) ? (row!.physio_plan as PhysioPlanEntry[]) : [];
  const byType: Record<string, number> = {};
  for (const e of current) {
    const t = String(e?.treatmentType ?? "").trim();
    if (t) byType[t] = (byType[t] ?? 0) + Math.max(0, Math.floor(Number(e?.sessionCount) || 0));
  }
  await writePlanTx(tx, patientId, minusReturned(byType, list));
}

function minusReturned(byType: Record<string, number>, list: ReturnedSessions[]): Record<string, number> {
  const out = { ...byType };
  for (const x of list) {
    const key = physioPlanKeyForPayment(x.treatmentType, 1) ?? x.treatmentType;
    out[key] = Math.max(0, (out[key] ?? 0) - x.sessionCount);
  }
  return out;
}

/**
 * **عدّادٌ مشتقٌّ من الكلفة يُجمَّد خطّةً عند الاسترجاع** (مراجعةُ Codex الثانية — كسابقة ترحيل ١٨٨): الاشتقاقُ من الكلفة هشّ،
 * وتخفيضُ الكلفة مع الاسترجاع يُسقطه (٣٤٠ ألفاً لا تُقسم على ٣٥ ألفاً فيرجع العدّادُ إلى جلستي الأقساط). فيُكتب «قبل − المُرجَع»
 * خطّةً حاكمة، والهدايا المحسوبة فيه تُوسَم `plan_credited` كما وسمها ١٨٨ — فحذفُها لاحقاً يُنقص الخطّة.
 */
async function freezeCostPlanTx(tx: Tx, patientId: number, caseId: number, before: PhysioSessionState[], list: ReturnedSessions[]) {
  await rows(tx, sql`SELECT id FROM patients WHERE id = ${patientId} FOR UPDATE`);
  const byType: Record<string, number> = {};
  for (const r of before) if (r.bought > 0) byType[r.treatmentType] = r.bought;
  await writePlanTx(tx, patientId, minusReturned(byType, list));
  await tx.execute(sql`
    UPDATE payments SET plan_credited = true
     WHERE patient_id = ${patientId} AND (case_id = ${caseId} OR case_id IS NULL)
       AND COALESCE(is_free_sessions, false) AND session_count > 0 AND COALESCE(payment_treatment_type, '') <> 'استشارة طبية'`);
}

async function writePlanTx(tx: Tx, patientId: number, byType: Record<string, number>) {
  const live = Object.keys(byType).filter((t) => byType[t] > 0).map((t) => ({ treatmentType: t, sessionCount: byType[t] }));
  const next: PhysioPlanEntry[] = live.length > 0 ? live
    : Object.keys(byType).map((t) => ({ treatmentType: t, sessionCount: 0, depleted: true }));
  await tx.execute(sql`UPDATE patients SET physio_plan = ${JSON.stringify(next)}::jsonb,
                              treatment_type = COALESCE(NULLIF(${describePhysioPlan(next)}, ''), treatment_type)
                        WHERE id = ${patientId}`);
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
      sessions: c.case_type === "physiotherapy" ? (await physioSessionStateTx(db as any, patientId, c.id)).state : null,
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
  /** لقسم العلاج الطبيعي: الجلساتُ المُرجَعة لكلّ نوع (`parseReturnedSessions`) — وإلّا `null`. */
  sessionsReturned: ReturnedSessions[] | null;
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
    const sessions = await checkReturnedSessionsTx(tx, { patientId: p.patientId, caseId: p.caseId, caseType: c.case_type, list: p.sessionsReturned });
    const [ins] = await rows<{ id: number }>(tx, sql`
      INSERT INTO patient_refund_requests
        (patient_id, case_id, case_type, branch_id, amount, reason, detail, net_paid_at_request, requested_by, requested_by_name,
         sessions_returned)
      VALUES (${p.patientId}, ${p.caseId}, ${c.case_type}, ${p.branchId}, ${p.amount}, ${p.reason}, ${p.detail}, ${m.net},
              ${p.userId}, ${p.userName}, ${sessions.list === null ? null : JSON.stringify(sessions.list)}::jsonb)
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
  //  **الجلساتُ المُرجَعة تُعاد فحصاً تحت القفل** — زيارةٌ سُجّلت بعد الطلب تُنقص الباقي، فلا يُرجَع ما حُضر.
  const sessions = await checkReturnedSessionsTx(tx, {
    patientId: cur.patientId, caseId: cur.caseId, caseType: c.case_type,
    list: c.case_type === "physiotherapy" ? (cur.sessionsReturned ?? []) : null, exceptRequestId: cur.id,
  });
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
    notes: `سند ${cur.id} — ${refundReasonLabel(cur.reason)}: ${cur.detail}`
      + (sessions.list && sessions.list.length ? ` — أُرجع ${returnedSessionsLine(sessions.list)}` : ""),
    actorUserId: p.userId,
  });
  //  **والعدّادُ ينقص بما أُرجع** بحسب مصدره: الخطّةُ تُنقَص (والعدّادُ يقرؤها وحدها فلا يُطرح مرّتين)، والمشتقُّ من الكلفة يُجمَّد
  //  خطّةً بـ«قبل − المُرجَع» (فلا يُسقطه تخفيضُ الكلفة ولا يُطرح فوقه)، والدفعاتُ يُكتب على صفّ الاسترجاع فيطرحه `resolvePurchasedSessions`.
  if (sessions.list && sessions.list.length) {
    if (sessions.hasPlan) {
      await returnFromPlanTx(tx, cur.patientId, sessions.list);
    } else if (sessions.source === "cost") {
      await freezeCostPlanTx(tx, cur.patientId, cur.caseId, sessions.state, sessions.list);
    } else {
      //  من الدفعات: الكلفةُ لا تمسّها، فيُكتب العددُ كاملاً على صفّ الاسترجاع ويطرحه العدّاد.
      await tx.execute(sql`UPDATE payments SET returned_sessions = ${JSON.stringify(sessions.list)}::jsonb WHERE id = ${written.paymentId}`);
    }
  }
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
