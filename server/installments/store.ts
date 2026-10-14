// **نظامُ الأقساط** (ترحيل ١٤٢، §4.ea) — طبقةُ البيانات. القواعدُ الصرفة في `shared/installments.ts`.
//
//   • الفتحُ داخل معاملة الدفعة نفسِها (`createPlanFromPaymentsTx`): خطّةٌ رُفضت لا تترك دفعةً، ولا خطّةَ بلا دفعة.
//   • ما دُفع للخطّة يُقرأ حيّاً من الدفعات (`PAID_TOWARD`) — لا عمودَ يُحدَّث فيشيخ.
//   • التعديلُ والإلغاءُ يُرجعان ما قبلهما وما بعدهما لسطر التدقيق في النقطة.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { installmentCount, planFigures, type InstallmentInput, type PlanFigures } from "@shared/installments";

export class InstallmentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Executor = { execute(q: any): Promise<any> };

/** ما دُفع على قسم الخطّة **بعد** الدفعة التي فتحتها — أيُّ دفعةٍ، من أيّ باب، ومن أيّ فرع. */
const PAID_TOWARD = sql.raw(`(SELECT COALESCE(SUM(pp.amount), 0) FROM payments pp
  WHERE pp.case_id = ip.case_id AND pp.id > COALESCE(ip.opening_payment_id, 0))`);
/** دينُ القسم كلُّه الآن — خطّةٌ صار قسمُها بلا دين (خصمٌ أو تعديلُ كلفة) مكتملةٌ ولو لم تبلغ أقساطُها. */
const CASE_REMAINING = sql.raw(`(pc.cost - (SELECT COALESCE(SUM(pq.amount), 0) FROM payments pq WHERE pq.case_id = ip.case_id))`);

export interface PlanRow {
  id: number; patientId: number; branchId: number; caseId: number; caseType: string;
  totalAmount: number; installmentAmount: number; numberOfInstallments: number; firstDueDate: string;
  reminderTime: string; status: string; notes: string | null;
  guarantorName: string | null; guarantorPhone: string | null;
  createdBy: string | null; createdAt: string; updatedAt: string | null; updatedByName: string | null;
  cancelledAt: string | null; cancelledByName: string | null; cancelReason: string | null; completedAt: string | null;
  patientName: string; patientCode: string | null; patientPhone: string | null; branchName: string | null;
  paidToward: number; caseRemaining: number;
}
export type PlanView = PlanRow & { figures: PlanFigures; effectiveStatus: "active" | "completed" | "cancelled" };

const SELECT_PLANS = sql`
  SELECT ip.id, ip.patient_id AS "patientId", ip.branch_id AS "branchId", ip.case_id AS "caseId", pc.case_type AS "caseType",
         ip.total_amount AS "totalAmount", ip.installment_amount AS "installmentAmount",
         ip.number_of_installments AS "numberOfInstallments", to_char(ip.start_date, 'YYYY-MM-DD') AS "firstDueDate",
         ip.reminder_time AS "reminderTime", ip.status, ip.notes, ip.guarantor_name AS "guarantorName", ip.guarantor_phone AS "guarantorPhone",
         ip.created_by AS "createdBy", ip.created_at AS "createdAt", ip.updated_at AS "updatedAt", ip.updated_by_name AS "updatedByName",
         ip.cancelled_at AS "cancelledAt", ip.cancelled_by_name AS "cancelledByName", ip.cancel_reason AS "cancelReason",
         ip.completed_at AS "completedAt",
         p.name AS "patientName", p.patient_code AS "patientCode", p.phone AS "patientPhone", b.name AS "branchName",
         ${PAID_TOWARD}::bigint AS "paidToward", ${CASE_REMAINING}::bigint AS "caseRemaining"
    FROM installment_plans ip
    JOIN patient_cases pc ON pc.id = ip.case_id
    JOIN patients p ON p.id = ip.patient_id
    LEFT JOIN branches b ON b.id = ip.branch_id`;

export function viewOf(r: any, today: string): PlanView {
  const row: PlanRow = { ...r, paidToward: Number(r.paidToward), caseRemaining: Number(r.caseRemaining),
    totalAmount: Number(r.totalAmount), installmentAmount: Number(r.installmentAmount) };
  const f = planFigures({ totalAmount: row.totalAmount, installmentAmount: row.installmentAmount, firstDueDate: row.firstDueDate,
    paidToward: row.paidToward, today });
  //  قسمٌ صار بلا دين ⟵ الخطّةُ مكتملة، ولا متأخّرَ فيها ولا قسطَ تالياً.
  const figures: PlanFigures = row.caseRemaining <= 0 && !f.completed
    ? { ...f, completed: true, nextIndex: null, nextDueDate: null, nextAmount: 0, overdueCount: 0, overdueAmount: 0, remaining: 0 }
    : f;
  const effectiveStatus = row.status === "cancelled" ? "cancelled" : row.status === "completed" || figures.completed ? "completed" : "active";
  return { ...row, figures, effectiveStatus };
}

/**
 * يفتح خطّةً على قسم الدفعة/الدفعات التي سُجّلت للتوّ في المعاملة نفسِها. يرمي `InstallmentError` فترتدّ المعاملةُ كلُّها.
 * المبلغُ الكلّيّ = دينُ القسم بعد هذه الدفعات؛ والقسمُ يُقفَل فلا تُفتح عليه خطّتان معاً.
 */
export async function createPlanFromPaymentsTx(tx: Executor, created: { id: number; caseId: number | null; patientId: number; branchId: number }[],
  input: InstallmentInput, actor: { userId: number | null; userName: string | null }) {
  const caseIds = Array.from(new Set(created.map((p) => p.caseId).filter((c): c is number => c != null)));
  if (caseIds.length === 0) throw new InstallmentError(400, "تعذّر معرفة قسم هذه الدفعة — لا تُفتح عليها أقساط");
  if (caseIds.length > 1) throw new InstallmentError(400, "الأقساطُ لقسمٍ واحد — سجّل دفعةَ كلّ قسمٍ وحدها");
  const caseId = caseIds[0];
  const c = (await tx.execute(sql`SELECT id, patient_id, cost FROM patient_cases WHERE id = ${caseId} FOR UPDATE`)).rows[0];
  if (!c) throw new InstallmentError(400, "قسمُ الدفعة غير موجود");
  const paid = Number((await tx.execute(sql`SELECT COALESCE(SUM(amount), 0)::bigint AS paid FROM payments WHERE case_id = ${caseId}`)).rows[0].paid);
  const remaining = Number(c.cost) - paid;
  if (remaining <= 0) throw new InstallmentError(400, "لا دينَ باقٍ على هذا القسم بعد هذه الدفعة — لا حاجة لأقساط");
  const existing = (await tx.execute(sql`SELECT id FROM installment_plans WHERE case_id = ${caseId} AND status = 'active' LIMIT 1`)).rows[0];
  if (existing) throw new InstallmentError(409, "على هذا القسم خطّةُ أقساطٍ قائمة — تُعدَّل من ملفّ المريض");
  const opening = created.reduce((m, p) => Math.max(m, p.id), 0);
  const first = created[0];
  const [row] = (await tx.execute(sql`
    INSERT INTO installment_plans (patient_id, branch_id, case_id, opening_payment_id, total_amount, installment_amount,
      number_of_installments, start_date, interval_days, status, notes, reminder_time, guarantor_name, guarantor_phone,
      created_by, created_by_user_id)
    VALUES (${first.patientId}, ${first.branchId}, ${caseId}, ${opening}, ${remaining}, ${input.monthlyAmount},
      ${installmentCount(remaining, input.monthlyAmount)}, ${input.firstDueDate}, 30, 'active', ${input.notes}, ${input.reminderTime},
      ${input.guarantorName}, ${input.guarantorPhone}, ${actor.userName}, ${actor.userId})
    RETURNING id`)).rows;
  return { id: Number(row.id), caseId, totalAmount: remaining };
}

export async function getPlan(id: number, today: string): Promise<PlanView | null> {
  const r = (await db.execute(sql`${SELECT_PLANS} WHERE ip.id = ${id}`)).rows[0];
  return r ? viewOf(r, today) : null;
}

/** خططُ مريض — كلُّها بحالاتها، الأحدثُ أوّلاً. */
export async function plansForPatient(patientId: number, today: string): Promise<PlanView[]> {
  const rows = (await db.execute(sql`${SELECT_PLANS} WHERE ip.patient_id = ${patientId} ORDER BY ip.created_at DESC`)).rows;
  return rows.map((r: any) => viewOf(r, today));
}

/** الخططُ النشطة لفرعٍ (أو لكلّ الفروع للمسؤول) — للمرضى غير المحذوفين. */
export async function activePlans(branchId: number | null, today: string): Promise<PlanView[]> {
  const rows = (await db.execute(sql`${SELECT_PLANS}
    WHERE ip.status = 'active' AND ip.case_id IS NOT NULL AND p.deleted_at IS NULL
      ${branchId ? sql`AND ip.branch_id = ${branchId}` : sql``}
    ORDER BY ip.start_date, ip.id`)).rows;
  return rows.map((r: any) => viewOf(r, today)).filter((v) => v.effectiveStatus === "active");
}

/** دينُ كلّ قسمٍ للمريض الآن، وخطّتُه النشطة إن وُجدت — لنافذة الدفعة. */
export async function casesForPatient(patientId: number) {
  const rows = (await db.execute(sql`
    SELECT pc.id AS "caseId", pc.case_type AS "caseType",
           (pc.cost - (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE case_id = pc.id))::bigint AS remaining,
           (SELECT id FROM installment_plans WHERE case_id = pc.id AND status = 'active' LIMIT 1) AS "activePlanId"
      FROM patient_cases pc WHERE pc.patient_id = ${patientId} ORDER BY pc.id`)).rows;
  return rows.map((r: any) => ({ caseId: Number(r.caseId), caseType: r.caseType, remaining: Number(r.remaining),
    activePlanId: r.activePlanId == null ? null : Number(r.activePlanId) }));
}

/** التعديلُ (المسؤولُ ومديرُ الفرع): القسطُ وتاريخُ الأوّل والساعةُ والكفيلُ والملاحظة؛ والعددُ يُعاد حسابُه. */
export async function updatePlan(id: number, patch: Partial<InstallmentInput>, actorName: string | null) {
  return db.transaction(async (tx) => {
    const before = (await tx.execute(sql`SELECT * FROM installment_plans WHERE id = ${id} FOR UPDATE`)).rows[0];
    if (!before) throw new InstallmentError(404, "الخطّة غير موجودة");
    if (before.status !== "active") throw new InstallmentError(409, "الخطّةُ ليست نشطة — لا تُعدَّل");
    const monthly = patch.monthlyAmount ?? Number(before.installment_amount);
    const after = (await tx.execute(sql`
      UPDATE installment_plans SET
        installment_amount = ${monthly},
        number_of_installments = ${installmentCount(Number(before.total_amount), monthly)},
        start_date = ${patch.firstDueDate ?? sql`start_date`},
        reminder_time = ${patch.reminderTime ?? sql`reminder_time`},
        guarantor_name = ${patch.guarantorName !== undefined ? patch.guarantorName : sql`guarantor_name`},
        guarantor_phone = ${patch.guarantorPhone !== undefined ? patch.guarantorPhone : sql`guarantor_phone`},
        notes = ${patch.notes !== undefined ? patch.notes : sql`notes`},
        updated_at = now(), updated_by_name = ${actorName}
      WHERE id = ${id} RETURNING *`)).rows[0];
    //  مواعيدُ تغيّرت ⟵ ما أُرسل عن المواعيد القديمة لا يمنع تذكيرَ الجديدة.
    if (patch.firstDueDate !== undefined && patch.firstDueDate !== String(before.start_date).slice(0, 10)) {
      await tx.execute(sql`DELETE FROM installment_reminders WHERE plan_id = ${id}`);
    }
    return { before, after };
  });
}

export async function cancelPlan(id: number, reason: string, actorName: string | null) {
  return db.transaction(async (tx) => {
    const before = (await tx.execute(sql`SELECT * FROM installment_plans WHERE id = ${id} FOR UPDATE`)).rows[0];
    if (!before) throw new InstallmentError(404, "الخطّة غير موجودة");
    if (before.status !== "active") throw new InstallmentError(409, "الخطّةُ ليست نشطة");
    const after = (await tx.execute(sql`
      UPDATE installment_plans SET status = 'cancelled', cancelled_at = now(), cancelled_by_name = ${actorName}, cancel_reason = ${reason},
        updated_at = now(), updated_by_name = ${actorName}
      WHERE id = ${id} RETURNING *`)).rows[0];
    return { before, after };
  });
}

/** الخططُ التي بلغت أقساطُها أو صار قسمُها بلا دين ⟵ «مكتملة» (يُنادى من دورة التذكير). */
export async function completeFinishedPlans(): Promise<number> {
  const r = await db.execute(sql`
    UPDATE installment_plans ip SET status = 'completed', completed_at = now()
      FROM patient_cases pc
     WHERE pc.id = ip.case_id AND ip.status = 'active'
       AND (${PAID_TOWARD} >= ip.total_amount OR ${CASE_REMAINING} <= 0)`);
  return Number(r.rowCount ?? 0);
}
