// **المصالحة** (§4.ha ٤.٢ والفقرة ٥) — بعد كلّ طلب اعتمادٍ وقرارِه، وكلِّ توقيعٍ وتنقيحٍ وإلغاءٍ لمعاينة، ومن العامل دورياً:
// أحدثُ معاينةٍ حيّة وحدها تعمل عليها وظيفة؛ وما على أقدمَ منها يُلغى (`superseded_by_newer_exam`) وخطّتُه المنتظرة تقدُم؛ والبوّابةُ التي
// أُغلقت تلغي وظيفتَها (`gate_closed`)؛ وبلا وظيفةٍ والبوّابةُ مفتوحة والمُطلِقُ تلقائيّ ⟵ تُوضع وظيفة. كلُّه تحت قفل المريض في المعاملة.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { examAgentGate } from "../physio_exam_reviews/store";
import { newestV2ExamId } from "./context";
import {
  activeJobOfPatient, cancelActiveJobsTx, enqueueTx, lockPatientAgent, markStaleOpusPlansTx, signalJob, SYSTEM_ACTOR, type Actor, type JobRecord,
} from "./store";
import type { JobTrigger } from "@shared/physio_agent";
import { agentEnabled } from "./model";

let nudge: () => void = () => {};
export function setWorkerNudge(fn: () => void): void { nudge = fn; }

export async function reconcilePatientJobs(tx: any, patientId: number, actor: Actor, trigger: JobTrigger): Promise<{ enqueued: JobRecord | null }> {
  const newest = await newestV2ExamId(tx, patientId);
  //  §4.hb — اقتراحُ «تعديل» منتظرٌ على معاينةٍ لم تعد الأحدث يقدُم الآن (لا عند محاولة حفظه) — فلا يبقى في شارة المعتمِد.
  const { markProposalsStaleTx } = await import("./versions");
  if (newest !== null) {
    await cancelActiveJobsTx(tx, { patientId, exceptExamId: newest, reason: "superseded_by_newer_exam", actor });
    await markStaleOpusPlansTx(tx, { patientId, exceptExamId: newest, reason: "superseded_by_newer_exam", actor });
    await markProposalsStaleTx(tx, { patientIds: [patientId], exceptExamId: newest, reason: "superseded_by_newer_exam", actor });
  } else {
    await cancelActiveJobsTx(tx, { patientId, reason: "exam_cancelled", actor });
    await markProposalsStaleTx(tx, { patientIds: [patientId], reason: "exam_cancelled", actor });
  }
  const active = await activeJobOfPatient(tx, patientId);
  if (active && newest !== null && active.examId === newest) {
    const gate = await examAgentGate(newest, tx);
    if (!gate.allowed) await cancelActiveJobsTx(tx, { patientId, examId: newest, reason: "gate_closed", actor });
  }
  if (newest === null || !agentEnabled()) return { enqueued: null };
  if (await activeJobOfPatient(tx, patientId)) return { enqueued: null };
  const r = await enqueueTx(tx, { examId: newest, trigger, actor });
  return { enqueued: "job" in r ? r.job : null };
}

/** **في معاملةٍ وقفلٍ خاصّين** — بعد توقيع المعاينة (أطلق وانسَ؛ والعاملُ يصلح ما يضيع). */
export async function autoReconcile(patientId: number, trigger: JobTrigger, actor: Actor = SYSTEM_ACTOR): Promise<JobRecord | null> {
  try {
    const r = await db.transaction(async (tx) => {
      await lockPatientAgent(tx, patientId);
      return reconcilePatientJobs(tx, patientId, actor, trigger);
    });
    if (r.enqueued) { nudge(); await signalJob(r.enqueued); }
    return r.enqueued;
  } catch (e) {
    console.error("[physio-agent] reconcile failed:", e);
    return null;
  }
}

/** **تنقيحُ المعاينة** — وظيفتُها تُلغى (`exam_changed`) وخطّتُها المنتظرة تقدُم، ثمّ المصالحة (تعيد الكتابة على النصّ الجديد). */
export async function onExamRevised(examId: number, patientId: number, actor: Actor): Promise<void> {
  try {
    const r = await db.transaction(async (tx) => {
      await lockPatientAgent(tx, patientId);
      await cancelActiveJobsTx(tx, { patientId, examId, reason: "exam_changed", actor });
      await markStaleOpusPlansTx(tx, { patientId, examId, reason: "exam_changed", actor });
      await (await import("./versions")).markProposalsStaleTx(tx, { patientIds: [patientId], examId, reason: "exam_changed", actor });
      return reconcilePatientJobs(tx, patientId, actor, "exam_revised");
    });
    if (r.enqueued) { nudge(); await signalJob(r.enqueued); } else { (await import("../live/updates")).notifyChange(null); }
  } catch (e) { console.error("[physio-agent] revise hook failed:", e); }
}

/** **إلغاءُ المعاينة** — داخل معاملة `cancelExam()` بعد صفّ الإلغاء (الطريقان: الزرّ والتصحيحُ الإداريّ): وظيفتُها تُلغى وخطّتُها تقدُم،
 *  ثمّ المصالحة — فقد تصير المعاينةُ السابقة أحدثَ. يعيد الوظيفةَ الجديدة إن وُضعت (يُنبَّه العاملُ بعد الالتزام). */
export async function onExamCancelledTx(tx: any, examId: number, patientId: number, actor: Actor): Promise<JobRecord | null> {
  await lockPatientAgent(tx, patientId);
  await cancelActiveJobsTx(tx, { patientId, examId, reason: "exam_cancelled", actor });
  await markStaleOpusPlansTx(tx, { patientId, examId, reason: "exam_cancelled", actor });
  await (await import("./versions")).markProposalsStaleTx(tx, { patientIds: [patientId], examId, reason: "exam_cancelled", actor });
  return (await reconcilePatientJobs(tx, patientId, actor, "reconcile")).enqueued;
}
export const nudgeWorkerNow = () => nudge();
const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];

/** **السلّةُ والدمج** — كلُّ وظيفةٍ نشطة للمريض تُلغى، وخططُه المنتظرة تقدُم. */
export async function onPatientGoneTx(tx: any, patientId: number, reason: "patient_deleted" | "patient_merged", actor: Actor): Promise<void> {
  await lockPatientAgent(tx, patientId);
  await cancelActiveJobsTx(tx, { patientId, reason, actor, hard: reason === "patient_merged" });
  await markStaleOpusPlansTx(tx, { patientId, reason, actor });
  //  §4.hb — واقتراحُ Opus المنتظر على خطّته المعتمَدة يقدُم (فالاستعادةُ من السلّة لا تُحييه).
  const { markProposalsStaleTx } = await import("./versions");
  await markProposalsStaleTx(tx, { patientIds: [patientId], reason: reason === "patient_merged" ? "patient_merged" : "patient_trashed", actor });
}

/** مدّةُ تذكّر ما تخطّاه المصالِح — بعدها يُعاد فحصُه مرّة (ما يفتح بوّابةً يُصالح بنفسه في الحال: الاعتمادُ والتوقيعُ والتنقيح). */
export const RECONCILE_SKIP_TTL_HOURS = 6;

/** **المصالِحُ الدوريّ** — معاينةٌ ثانية وُقّعت في الأيّام السبعة ولم تُشغَّل على بصمتها (نداءٌ ضاع أو مفتاحٌ أُضيف لاحقاً).
 *  المرشّحون **أحدثُ معاينةٍ حيّة لكلّ مريض** بلا خطّةٍ معتمَدة ولا وظيفةٍ نشطة، والأحدثُ توقيعاً أوّلاً؛ وما تخطّاه `enqueueTx` يُكتب في
 *  `physio_agent_reconcile_skips` فلا يعود إليه قبل ست ساعات — فعشرون مريضاً بخطّةٍ قائمة أو علامةٍ معلَّقة لا يحجبون الحدَّ عن غيرهم.
 *  **ولا يُستبعد بوجود وظيفةٍ أو خطّةٍ سابقة** (مراجعةُ Codex): الحكمُ لبصمة المعاينة الحالية في `enqueueTx`، والتخطّي المحفوظ يسقط بتنقيح
 *  المعاينة أو بطلب اعتمادٍ أو قرارٍ أحدث منه — فنداءٌ ضاع بعد التنقيح أو بعد فتح البوّابة يصلحه المصالِح. */
export async function reconcilerScan(limit = 20): Promise<number> {
  if (!agentEnabled()) return 0;
  const cands = rows(await db.execute(sql`
    SELECT me.id, me.patient_id FROM medical_exams me
      JOIN patients p ON p.id = me.patient_id AND p.deleted_at IS NULL
     WHERE me.case_type = 'physiotherapy' AND me.assessment->>'form' = 'BC-PT-02' AND me.signed_at > now() - interval '7 days'
       AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = me.id)
       AND NOT EXISTS (SELECT 1 FROM medical_exams m2 WHERE m2.patient_id = me.patient_id AND m2.case_type = 'physiotherapy'
                         AND m2.assessment->>'form' = 'BC-PT-02' AND m2.signed_at IS NOT NULL
                         AND (m2.signed_at > me.signed_at OR (m2.signed_at = me.signed_at AND m2.id > me.id))
                         AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c2 WHERE c2.exam_id = m2.id))
       AND NOT EXISTS (SELECT 1 FROM physio_plans ap WHERE ap.patient_id = me.patient_id AND ap.status = 'approved')
       AND NOT EXISTS (SELECT 1 FROM physio_agent_jobs aj WHERE aj.patient_id = me.patient_id AND aj.status IN ('queued','running','needs_answers'))
       AND NOT EXISTS (SELECT 1 FROM physio_agent_reconcile_skips sk WHERE sk.exam_id = me.id
                         AND sk.skipped_at > now() - make_interval(hours => ${RECONCILE_SKIP_TTL_HOURS})
                         AND sk.skipped_at > COALESCE((SELECT max(rv.edited_at) FROM medical_exam_revisions rv WHERE rv.exam_id = me.id), '-infinity')
                         AND sk.skipped_at > COALESCE((SELECT max(GREATEST(fr.requested_at, COALESCE(fr.decided_at, fr.requested_at)))
                                                         FROM physio_exam_red_flag_reviews fr WHERE fr.patient_id = me.patient_id), '-infinity')
                         --  مراجعةُ Codex على #774: إلغاءُ معاينةٍ أحدث للمريض بعد التخطّي يُسقطه (الخطّةُ التي قدُمت بها صار لها أن تُعاد).
                         AND sk.skipped_at > COALESCE((SELECT max(mc.cancelled_at) FROM medical_exam_cancellations mc WHERE mc.patient_id = me.patient_id), '-infinity'))
     ORDER BY me.signed_at DESC, me.id DESC LIMIT ${limit}`));
  let n = 0;
  for (const c of cands) {
    try {
      const r = await db.transaction(async (tx) => {
        await lockPatientAgent(tx, Number(c.patient_id));
        const out = await enqueueTx(tx, { examId: Number(c.id), trigger: "reconcile", actor: SYSTEM_ACTOR, strictFingerprint: true });
        if ("skipped" in out) {
          await tx.execute(sql`INSERT INTO physio_agent_reconcile_skips (exam_id, reason, skipped_at) VALUES (${Number(c.id)}, ${out.skipped}, now())
            ON CONFLICT (exam_id) DO UPDATE SET reason = EXCLUDED.reason, skipped_at = EXCLUDED.skipped_at`);
        }
        return out;
      });
      if ("job" in r) { n++; await signalJob(r.job); }
    } catch (e) { console.error("[physio-agent] reconciler enqueue failed:", e); }
  }
  return n;
}
