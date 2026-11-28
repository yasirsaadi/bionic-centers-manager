// **وظائفُ Opus — طبقةُ البيانات** (ترحيل ١٩٩، §4.ha الفقرة ٤). كلُّ انتقالٍ في معاملةٍ بسطر تدقيقٍ فيها (`logAudit` بـ`tx`)، وكلُّ ما يمسّ
// مريضاً تحت **قفله الاستشاريّ** (`lockPatientAgent`) — فطلبُ الاعتماد وقرارُه والتوقيعُ والتنقيحُ والإلغاءُ والحفظُ لا يتسابقون على حالٍ واحد.
// والانتقالاتُ التي يقوم بها العاملُ محروسةٌ بـ`locked_by` = هو و`status = 'running'`: صفرُ صفوفٍ ⟵ سرقها غيرُه، فيتركها صامتاً.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { notifyChange, notifyUser } from "../live/updates";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import {
  AUTO_TRIGGERS, isActiveJobStatus, JOB_ERROR_TEXTS, JOB_MAX_FAILURES, MAX_QUESTION_ROUNDS, validateAnswers,
  type AgentQuestion, type JobStatus, type JobTrigger, type QaRound,
} from "@shared/physio_agent";
import { examAgentGate } from "../physio_exam_reviews/store";
import { fingerprintOf, loadExam, newestV2ExamId } from "./context";
import { agentEnabled } from "./model";
import { physioOfferingBranchIds } from "../physio_plans/store";
import { isExamV2 } from "@shared/physio_exam_v2";
import { readStoredAssessment } from "@shared/physio_initial_assessment";
import { GATE_REASONS } from "@shared/physio_agent_gates";

export class AgentJobError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export interface Actor { userId: number | null; name: string | null; ip?: string | null; userAgent?: string | null }
export const SYSTEM_ACTOR: Actor = { userId: null, name: "Claude Opus" };

export interface JobRecord {
  id: number; patientId: number; examId: number; branchId: number; kind: string; trigger: JobTrigger; status: JobStatus; stage: string | null;
  stages: { stage: string; at: string; noteAr?: string | null }[]; examFingerprint: string; questions: AgentQuestion[]; qa: QaRound[];
  questionRounds: number; failures: number; maxFailures: number; runs: number; runAfter: Date; lockedAt: Date | null; lockedBy: string | null;
  heartbeatAt: Date | null; cancelRequested: boolean; cancelReason: string | null; startedAt: Date | null; finishedAt: Date | null;
  errorCode: string | null; error: string | null; errorDetail: string | null; checkpoint: Record<string, any>; result: Record<string, any>;
  requestedBy: number | null; requestedByName: string | null; createdAt: Date; updatedAt: Date;
}
const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];
export function jobOf(r: Record<string, any>): JobRecord {
  return {
    id: Number(r.id), patientId: Number(r.patient_id), examId: Number(r.exam_id), branchId: Number(r.branch_id), kind: r.kind, trigger: r.trigger,
    status: r.status, stage: r.stage ?? null, stages: r.stages ?? [], examFingerprint: r.exam_fingerprint, questions: r.questions ?? [], qa: r.qa ?? [],
    questionRounds: Number(r.question_rounds), failures: Number(r.failures), maxFailures: Number(r.max_failures), runs: Number(r.runs),
    runAfter: r.run_after, lockedAt: r.locked_at ?? null, lockedBy: r.locked_by ?? null, heartbeatAt: r.heartbeat_at ?? null,
    cancelRequested: Boolean(r.cancel_requested), cancelReason: r.cancel_reason ?? null, startedAt: r.started_at ?? null, finishedAt: r.finished_at ?? null,
    errorCode: r.error_code ?? null, error: r.error ?? null, errorDetail: r.error_detail ?? null, checkpoint: r.checkpoint ?? {}, result: r.result ?? {},
    requestedBy: r.requested_by == null ? null : Number(r.requested_by), requestedByName: r.requested_by_name ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
  };
}

/** **ما يُعرض من الوظيفة** — بلا نتيجتها الداخلية (المسوّداتُ والمراجعاتُ للمعتمِد من «الخطّة المقترحة» وحدها). */
export function jobView(j: JobRecord, planId: number | null = null) {
  return {
    id: j.id, examId: j.examId, patientId: j.patientId, status: j.status, stage: j.stage, stages: j.stages, trigger: j.trigger,
    questions: j.status === "needs_answers" ? j.questions : [], questionRounds: j.questionRounds, qa: j.qa.map((r) => ({ round: r.round, at: r.at, byName: r.byName,
      answers: r.answers.map((a) => ({ id: a.id, questionAr: a.questionAr, answer: a.answer })) })),
    failures: j.failures, maxFailures: j.maxFailures, cancelRequested: j.cancelRequested,
    errorCode: j.errorCode, error: j.error,
    decline: j.status === "failed" && j.errorCode === "agent_declined" ? j.result?.decline ?? null : null,
    newFinding: j.status === "needs_exam_revision" ? j.result?.newFinding ?? null : null,
    unresolvedCritical: j.errorCode === "unresolved_critical" ? [...(j.result?.unresolved?.reviewer ?? []), ...(j.result?.unresolved?.auditor ?? [])].filter((i: any) => i.severity === "critical") : [],
    //  أيُّ بوّابةٍ أوقفت الخطّة — بأسبابها العربية لا برموزها (الرموزُ في `error_detail`).
    blockingGates: j.status === "failed" && (j.errorCode === "gates_blocking" || j.errorCode === "empty_plan")
      ? Array.from(new Set(String(j.errorDetail ?? "").split(",").map((c) => c.trim()).filter(Boolean))).map((code) => ({ code, reasonAr: GATE_REASONS[code] ?? "بوّابةٌ حتمية" }))
      : [],
    startedAt: j.startedAt, finishedAt: j.finishedAt, createdAt: j.createdAt, requestedByName: j.requestedByName, planId,
  };
}

/** نقطةُ الاستئناف بعد أسئلة: بلا خطّةٍ مقبولة ولا مرحلة — العدّاداتُ والمصادرُ وحدها. */
export function questionCheckpoint(cp: Record<string, any> | null | undefined): Record<string, any> {
  const c = cp ?? {};
  return { ...(c.webCounts ? { webCounts: c.webCounts } : {}), ...(c.usage ? { usage: c.usage } : {}),
    ...(c.fetchedUrls ? { fetchedUrls: c.fetchedUrls } : {}), ...(c.searchedUrls ? { searchedUrls: c.searchedUrls } : {}) };
}

/** حالُ خطّة كلّ وظيفة (منتظرة · معتمَدة · …) بلا ما فيها — لملخّص صفّ المعاينة ولوح Opus. */
export async function planStatusesOfJobs(jobIds: number[], ex: any = db): Promise<Map<number, { planId: number; status: string }>> {
  const out = new Map<number, { planId: number; status: string }>();
  if (!jobIds.length) return out;
  for (const r of rows(await ex.execute(sql`SELECT id, status, agent_job_id FROM physio_plans
      WHERE agent_job_id IN (${sql.join(jobIds.map((i) => sql`${i}`), sql`, `)})`))) out.set(Number(r.agent_job_id), { planId: Number(r.id), status: String(r.status) });
  return out;
}

/** **لماذا لا يُشغَّل Opus يدوياً الآن** — الفحوصُ نفسُها التي يردّ بها `enqueueTx` بلا كتابة، فلا يُعرض زرٌّ يردّه الخادمُ ٤٠٩.
 *  (الوظيفةُ النشطة تقولها حالُها، والتفعيلُ يقوله `enabled`.) */
export async function runBlocker(ex: any, examId: number): Promise<{ code: string; reason: string } | null> {
  const b = (code: string, reason: string) => ({ code, reason });
  const exam = await loadExam(ex, examId);
  if (!exam || exam.caseType !== "physiotherapy" || !isExamV2(readStoredAssessment(exam.assessment))) return b("not_v2", "ليست معاينةَ علاجٍ طبيعيّ على الاستمارة الإلزامية");
  if (exam.cancelled) return b("exam_cancelled", "المعاينةُ ملغاة");
  if (await patientTrashed(ex, exam.patientId)) return b("patient_deleted", "المريضُ في السلّة");
  if ((await newestV2ExamId(ex, exam.patientId)) !== exam.id) return b("not_newest", "وُقّعت بعدها معاينةٌ أحدث — يكتب Opus من الأحدث وحدها");
  const gate = await examAgentGate(exam.id, ex);
  if (!gate.allowed) return b("gate_closed", gate.reason);
  if (await hasActivePlan(ex, exam.patientId)) return b("has_active_plan", "للمريض خطّةٌ قائمة معتمَدة — إرجاعُها إلى Opus في المرحلة القادمة");
  if (await awaitingOpusPlanOfExam(ex, exam.id)) return b("opus_plan_pending", "لهذه المعاينة خطّةُ Opus تنتظر الاعتماد — يحذفها المعتمِدُ من «الخطّة المقترحة» إن أراد إعادتَها");
  const patient = rows(await ex.execute(sql`SELECT branch_id FROM patients WHERE id = ${exam.patientId}`))[0];
  const branchId = exam.branchId ?? (patient?.branch_id == null ? null : Number(patient.branch_id));
  if (!(await branchOk(ex, branchId))) return b("branch_unavailable", "فرعُ المعاينة لا يقدّم العلاجَ الطبيعي أو مغلقٌ مؤقتاً");
  return null;
}

export async function lockPatientAgent(tx: any, patientId: number): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('physio_agent_patient'), ${patientId})`);
}

export async function getJob(id: number, ex: any = db): Promise<JobRecord | null> {
  const r = rows(await ex.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${id}`))[0];
  return r ? jobOf(r) : null;
}
export async function latestJobOfExam(examId: number, ex: any = db): Promise<JobRecord | null> {
  const r = rows(await ex.execute(sql`SELECT * FROM physio_agent_jobs WHERE exam_id = ${examId} ORDER BY id DESC LIMIT 1`))[0];
  return r ? jobOf(r) : null;
}
export async function latestJobsOfExams(examIds: number[], ex: any = db): Promise<Map<number, JobRecord>> {
  const out = new Map<number, JobRecord>();
  if (!examIds.length) return out;
  for (const r of rows(await ex.execute(sql`SELECT DISTINCT ON (exam_id) * FROM physio_agent_jobs
      WHERE exam_id IN (${sql.join(examIds.map((i) => sql`${i}`), sql`, `)}) ORDER BY exam_id, id DESC`))) out.set(Number(r.exam_id), jobOf(r));
  return out;
}
export async function planIdOfJob(jobId: number, ex: any = db): Promise<number | null> {
  const r = rows(await ex.execute(sql`SELECT id FROM physio_plans WHERE agent_job_id = ${jobId}`))[0];
  return r ? Number(r.id) : null;
}
export async function activeJobOfPatient(ex: any, patientId: number): Promise<JobRecord | null> {
  const r = rows(await ex.execute(sql`SELECT * FROM physio_agent_jobs WHERE patient_id = ${patientId} AND status IN ('queued','running','needs_answers') LIMIT 1`))[0];
  return r ? jobOf(r) : null;
}
export async function hasActivePlan(ex: any, patientId: number): Promise<boolean> {
  return rows(await ex.execute(sql`SELECT 1 FROM physio_plans WHERE patient_id = ${patientId} AND status = 'approved' LIMIT 1`)).length > 0;
}
export async function awaitingOpusPlanOfExam(ex: any, examId: number): Promise<{ id: number; stale: string | null } | null> {
  const r = rows(await ex.execute(sql`SELECT id, opus_stale_reason FROM physio_plans WHERE source_exam_id = ${examId} AND origin = 'opus'
      AND status IN ('draft','pending','returned') ORDER BY id DESC LIMIT 1`))[0];
  return r ? { id: Number(r.id), stale: r.opus_stale_reason ?? null } : null;
}

const audit = (tx: any, jobId: number, action: string, actor: Actor, branchId: number | null, newValues: unknown, notes?: string, oldValues?: unknown) =>
  logAudit({ entityType: "physio_agent_job", entityId: jobId, action, userId: actor.userId, userName: actor.name, branchId, newValues, oldValues,
    notes: notes ?? null, ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });

async function patientTrashed(ex: any, patientId: number): Promise<boolean> {
  const r = rows(await ex.execute(sql`SELECT deleted_at FROM patients WHERE id = ${patientId}`))[0];
  return !r || r.deleted_at != null;
}
async function branchOk(ex: any, branchId: number | null): Promise<boolean> {
  if (!branchId) return false;
  const offering = await physioOfferingBranchIds();
  if (!offering.has(branchId)) return false;
  const r = rows(await ex.execute(sql`SELECT temporarily_closed FROM branches WHERE id = ${branchId}`))[0];
  return Boolean(r) && !r.temporarily_closed;
}

export type EnqueueResult = { job: JobRecord } | { skipped: string; reason: string; existing?: JobRecord };

/** **وضعُ وظيفةٍ في الطابور** (§4.ha ٤.٣) — داخل معاملة المُستدعي وقفلِ مريضه. التلقائيُّ يتخطّى بصمت، واليدويُّ يُردّ بالسبب. */
export async function enqueueTx(tx: any, p: { examId: number; trigger: JobTrigger; actor: Actor; strictFingerprint?: boolean; discardPlanId?: number | null }): Promise<EnqueueResult> {
  const skip = (skipped: string, reason: string, existing?: JobRecord): EnqueueResult => ({ skipped, reason, existing });
  if (!agentEnabled()) return skip("disabled", "وكيلُ Opus غيرُ مفعّل (لا مفتاحَ لخدمة Claude)");
  const exam = await loadExam(tx, p.examId, true);
  if (!exam || exam.caseType !== "physiotherapy" || !isExamV2(readStoredAssessment(exam.assessment))) return skip("not_v2", "ليست معاينةَ علاجٍ طبيعيّ على الاستمارة الإلزامية");
  if (exam.cancelled) return skip("exam_cancelled", "المعاينةُ ملغاة");
  if (await patientTrashed(tx, exam.patientId)) return skip("patient_deleted", "المريضُ في السلّة");
  if ((await newestV2ExamId(tx, exam.patientId)) !== exam.id) return skip("not_newest", "ليست أحدثَ معاينة علاجٍ طبيعيّ للمريض");
  const gate = await examAgentGate(exam.id, tx);
  if (!gate.allowed) return skip("gate_closed", gate.reason);
  const active = await activeJobOfPatient(tx, exam.patientId);
  if (active) return skip("job_active", "Opus يعمل على خطّةٍ لهذا المريض الآن", active);
  if (await hasActivePlan(tx, exam.patientId)) return skip("has_active_plan", "للمريض خطّةٌ قائمة معتمَدة — إرجاعُها إلى Opus في المرحلة القادمة");
  const fp = fingerprintOf(exam);
  const awaiting = await awaitingOpusPlanOfExam(tx, exam.id);
  const auto = AUTO_TRIGGERS.includes(p.trigger);
  if (awaiting) {
    if (p.discardPlanId && p.discardPlanId === awaiting.id) {
      await tx.execute(sql`DELETE FROM physio_plans WHERE id = ${awaiting.id}`);
      await logAudit({ entityType: "physio_plan", entityId: awaiting.id, action: "discard_for_rerun", userId: p.actor.userId, userName: p.actor.name,
        branchId: exam.branchId, newValues: { examId: exam.id }, notes: "حُذفت خطّةُ Opus المنتظرة لتُعاد كتابتُها", ipAddress: p.actor.ip ?? null,
        userAgent: p.actor.userAgent ?? null, tx });
    } else if (!(auto && awaiting.stale)) {
      return skip("opus_plan_pending", "لهذه المعاينة خطّةُ Opus تنتظر الاعتماد");
    }
  }
  if (auto) {
    const prev = rows(await tx.execute(sql`SELECT status, error_code, exam_fingerprint FROM physio_agent_jobs WHERE exam_id = ${exam.id} ORDER BY id DESC`));
    if (p.strictFingerprint && prev.some((j) => j.exam_fingerprint === fp)) return skip("already_tried", "جرى تشغيلٌ على هذه المعاينة بنصّها");
    if (prev.some((j) => j.exam_fingerprint === fp && (j.status === "needs_exam_revision" || (j.status === "failed" && j.error_code === "agent_declined")))) {
      return skip("already_decided", "قرّر Opus في هذه المعاينة بنصّها من قبل");
    }
    if (prev.some((j) => j.exam_fingerprint === fp && j.status === "succeeded") && awaiting && !awaiting.stale) return skip("already_planned", "كُتبت خطّةٌ لهذه المعاينة");
  }
  const patient = rows(await tx.execute(sql`SELECT branch_id FROM patients WHERE id = ${exam.patientId}`))[0];
  const branchId = exam.branchId ?? (patient?.branch_id == null ? null : Number(patient.branch_id));
  if (!(await branchOk(tx, branchId))) return skip("branch_unavailable", "فرعُ المعاينة لا يقدّم العلاجَ الطبيعي أو مغلقٌ مؤقتاً");
  const ins = rows(await tx.execute(sql`
    INSERT INTO physio_agent_jobs (patient_id, exam_id, branch_id, trigger, exam_fingerprint, max_failures, requested_by, requested_by_name)
    VALUES (${exam.patientId}, ${exam.id}, ${branchId}, ${p.trigger}, ${fp}, ${JOB_MAX_FAILURES}, ${p.actor.userId}, ${p.actor.name})
    RETURNING *`))[0];
  const job = jobOf(ins);
  await audit(tx, job.id, "enqueue", p.actor, branchId, { examId: exam.id, patientId: exam.patientId, trigger: p.trigger },
    `وُضعت وظيفةُ Opus لكتابة خطّة المعاينة #${exam.id} (${p.trigger})`);
  return { job };
}

/** **إلغاءُ الوظائف النشطة** — المنتظرةُ تُلغى في الحال، والعاملةُ يُطلب إيقافُها (`cancel_requested`) فيوقفها النبضُ التالي؛ و`hard` يلغيها في الحال (الدمج). */
export async function cancelActiveJobsTx(tx: any, p: { patientId: number; examId?: number | null; exceptExamId?: number | null; reason: string; actor: Actor; hard?: boolean }): Promise<number[]> {
  const list = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE patient_id = ${p.patientId} AND status IN ('queued','running','needs_answers')
     ${p.examId ? sql`AND exam_id = ${p.examId}` : sql``} ${p.exceptExamId ? sql`AND exam_id <> ${p.exceptExamId}` : sql``} FOR UPDATE`)).map(jobOf);
  const text = JOB_ERROR_TEXTS[p.reason] ?? p.reason;
  for (const j of list) {
    if (j.status === "running" && !p.hard) {
      await tx.execute(sql`UPDATE physio_agent_jobs SET cancel_requested = true, cancel_reason = ${p.reason}, updated_at = now() WHERE id = ${j.id}`);
    } else {
      await tx.execute(sql`UPDATE physio_agent_jobs SET status = 'cancelled', cancel_requested = ${j.status === "running"}, cancel_reason = ${p.reason},
        error_code = ${p.reason}, error = ${text}, finished_at = now(), locked_by = NULL, locked_at = NULL, updated_at = now() WHERE id = ${j.id}`);
    }
    await audit(tx, j.id, j.status === "running" && !p.hard ? "cancel_requested" : "cancel", p.actor, j.branchId, { reason: p.reason, from: j.status }, text);
  }
  return list.map((j) => j.id);
}

/** **خطّةُ Opus المنتظرة تقدُم** حين تتغيّر معاينتُها أو تُلغى أو يُدمج المريض — فلا تُعتمد (`opus_plan_stale`). */
export async function markStaleOpusPlansTx(tx: any, p: { patientId: number; examId?: number | null; exceptExamId?: number | null; reason: string; actor?: Actor }): Promise<number> {
  const r = rows(await tx.execute(sql`UPDATE physio_plans SET opus_stale_reason = ${p.reason}, updated_at = now()
     WHERE patient_id = ${p.patientId} AND origin = 'opus' AND status IN ('draft','pending','returned') AND opus_stale_reason IS NULL
       ${p.examId ? sql`AND source_exam_id = ${p.examId}` : sql``} ${p.exceptExamId ? sql`AND (source_exam_id IS NULL OR source_exam_id <> ${p.exceptExamId})` : sql``}
     RETURNING id, branch_id, source_exam_id`));
  //  متى قدُمت ولماذا — فـ٤٠٩ `opus_plan_stale` عند المعتمِد له أثرٌ في السجلّ.
  for (const x of r) {
    await logAudit({ entityType: "physio_plan", entityId: Number(x.id), action: "opus_stale", userId: p.actor?.userId ?? null, userName: p.actor?.name ?? "Claude Opus",
      branchId: x.branch_id == null ? null : Number(x.branch_id), newValues: { reason: p.reason, examId: x.source_exam_id ?? null },
      notes: `قدُمت خطّةُ Opus المنتظرة: ${JOB_ERROR_TEXTS[p.reason] ?? p.reason}`, tx });
  }
  return r.length;
}

/** مَن يُسأل: كاتبُ المعاينة ومَن طلب الوظيفة — ومَن يكتب معاينةَ العلاج الطبيعي في فرعها. */
async function examinerOf(ex: any, examId: number): Promise<{ id: number | null; name: string }> {
  const r = rows(await ex.execute(sql`SELECT doctor_id, doctor_name FROM medical_exams WHERE id = ${examId}`))[0];
  return { id: r?.doctor_id == null ? null : Number(r.doctor_id), name: String(r?.doctor_name ?? "") };
}
async function patientLabel(ex: any, patientId: number, branchId: number): Promise<string> {
  const r = rows(await ex.execute(sql`SELECT p.name, p.patient_code, b.name AS branch FROM patients p LEFT JOIN branches b ON b.id = ${branchId} WHERE p.id = ${patientId}`))[0];
  return `${r?.name ?? `#${patientId}`}${r?.patient_code ? ` (${r.patient_code})` : ""}${r?.branch ? ` — ${r.branch}` : ""}`;
}
async function physioWritersOfBranch(ex: any, branchId: number): Promise<number[]> {
  const r = rows(await ex.execute(sql`SELECT id FROM system_users u WHERE COALESCE(u.is_active, true)
     AND (u.branch_id = ${branchId} OR COALESCE(u.branch_ids, '[]'::jsonb) @> ${JSON.stringify([branchId])}::jsonb)
     AND (u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist'
          OR ((u.role = 'doctor' OR COALESCE(u.can_write_medical_exam, false)) AND COALESCE(u.medical_specialties, '[]'::jsonb) ? 'physiotherapy'))`));
  return r.map((x) => Number(x.id));
}

/** **تنبيهُ الفاحص** (`physio_opus_questions`) — كاتبُ المعاينة وطالبُ الوظيفة وكاتبو معاينة العلاج الطبيعي في فرعها. */
export async function notifyExaminerTx(tx: any, job: JobRecord, line: string): Promise<number[]> {
  const examiner = await examinerOf(tx, job.examId);
  const targets = Array.from(new Set([examiner.id, job.requestedBy, ...(await physioWritersOfBranch(tx, job.branchId))].filter((x): x is number => x != null)));
  if (targets.length) {
    await enqueueStaffEvent(tx, { event: "physio_opus_questions", targetUserIds: targets,
      text: `${line}: ${await patientLabel(tx, job.patientId, job.branchId)}`, linkPath: `/patients/${job.patientId}` });
  }
  return targets;
}
/** **تنبيهُ المعتمِدين** (`physio_opus_plan_ready`). */
export async function notifyApproversTx(tx: any, job: JobRecord, line: string, linkPath: string): Promise<void> {
  await enqueueStaffEvent(tx, { event: "physio_opus_plan_ready", text: `${line}: ${await patientLabel(tx, job.patientId, job.branchId)}`, linkPath });
}
/** إشارةُ التطبيق الحيّة بعد الالتزام — للجميع ولكاتب المعاينة وطالب الوظيفة. */
export async function signalJob(job: Pick<JobRecord, "examId" | "requestedBy">): Promise<void> {
  notifyChange(null);
  const examiner = await examinerOf(db, job.examId);
  Array.from(new Set([examiner.id, job.requestedBy])).forEach((u) => { if (u) notifyUser(u, "opus"); });
}

/** **أجوبةُ الأسئلة** (§4.ha ٤.٥) — والوظيفةُ تعود للطابور بالأجوبة وميزانيةِ إخفاقٍ جديدة؛ والبوّابةُ تُفحص في المعاملة. */
export async function answerQuestions(jobId: number, raw: unknown, actor: Actor, mayAnswer: (j: JobRecord) => Promise<boolean>): Promise<JobRecord> {
  const job = await db.transaction(async (tx) => {
    const j0 = await getJob(jobId, tx);
    if (!j0) throw new AgentJobError(404, "الوظيفةُ غير موجودة", "job_not_found");
    await lockPatientAgent(tx, j0.patientId);
    const j = jobOf(rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${jobId} FOR UPDATE`))[0]);
    if (!(await mayAnswer(j))) throw new AgentJobError(403, "يجيب كاتبُ معاينة العلاج الطبيعي في فرع المريض أو المعتمِد", "not_answerer");
    if (j.status !== "needs_answers") throw new AgentJobError(409, "لا أسئلةَ مفتوحة على هذه الوظيفة", "no_open_questions");
    const v = validateAnswers(j.questions, raw);
    if (!v.ok) throw new AgentJobError(400, v.error, v.code);
    const gate = await examAgentGate(j.examId, tx);
    if (!gate.allowed) throw new AgentJobError(409, gate.reason, "gate_closed");
    const round: QaRound = { round: j.questionRounds + 1, at: new Date().toISOString(), byName: actor.name, answers: v.answers };
    const up = rows(await tx.execute(sql`UPDATE physio_agent_jobs SET qa = qa || ${JSON.stringify([round])}::jsonb, question_rounds = question_rounds + 1,
        questions = '[]'::jsonb, status = 'queued', stage = NULL, failures = 0, run_after = now(), updated_at = now()
      WHERE id = ${jobId} RETURNING *`))[0];
    await audit(tx, jobId, "answer", actor, j.branchId, { round: round.round, answers: v.answers.map((a) => ({ id: a.id, length: a.answer.length })) },
      `أُجيبت أسئلةُ Opus (الجولة ${round.round} من ${MAX_QUESTION_ROUNDS})`);
    return jobOf(up);
  });
  await signalJob(job);
  return job;
}

/** **«إلغاء»** بيد مجيبٍ أو معتمِد. */
export async function cancelJob(jobId: number, actor: Actor, mayCancel: (j: JobRecord) => Promise<boolean>): Promise<JobRecord> {
  const job = await db.transaction(async (tx) => {
    const j0 = await getJob(jobId, tx);
    if (!j0) throw new AgentJobError(404, "الوظيفةُ غير موجودة", "job_not_found");
    await lockPatientAgent(tx, j0.patientId);
    const j = jobOf(rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${jobId} FOR UPDATE`))[0]);
    if (!(await mayCancel(j))) throw new AgentJobError(403, "يلغيها كاتبُ معاينة العلاج الطبيعي في فرع المريض أو المعتمِد", "not_answerer");
    if (!isActiveJobStatus(j.status)) throw new AgentJobError(409, "الوظيفةُ منتهية", "job_finished");
    await cancelActiveJobsTx(tx, { patientId: j.patientId, examId: j.examId, reason: "cancelled_by_user", actor });
    return (await getJob(jobId, tx))!;
  });
  await signalJob(job);
  return job;
}
