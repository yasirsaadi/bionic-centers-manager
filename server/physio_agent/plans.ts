// **خطّةُ Opus: الحفظُ والاعتمادُ والحذفُ والعرضُ للمعتمِد** (§4.ha الفقرتان ٧.٣ و٧.٤).
//  • الحفظُ في معاملةٍ واحدة تحت قفل المريض: ملكيّةُ الوظيفة (`locked_by` = هذا العامل)، والمعاينةُ وبصمتُها وأنّها الأحدث، والبوّابةُ **داخل المعاملة**،
//    ثمّ البوّاباتُ الحتمية مرّةً أخيرة (`final`) — وما تغيّر ⟵ تُلغى الوظيفةُ ولا صفَّ خطّة. والخطّةُ «بانتظار الاعتماد»، **كاتبُها الفاحص**.
//  • الاعتمادُ للمعتمِد من «الخطّة المقترحة» وحدها (`fromProposal`)، وبإقرارٍ بكلّ ملاحظةٍ كبيرة لم تُحلّ، ولا على خطّةٍ قدُمت أو لمريضٍ له خطّةٌ قائمة؛
//    و«خارج المكتبة» يصير معها **بروتوكولاً مسوّدة** من نصوصه العامّة (لا من مبرّراته لهذا المريض) وبطاقاتٍ مسوّدة.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { examAgentGate } from "../physio_exam_reviews/store";
import { applyPlanGates, EXAM_CONFIRM_CODES, type GateLogEntry, type GatedPlan } from "@shared/physio_agent_gates";
import { isOpusAwaiting, JOB_ERROR_TEXTS, type Issue, type SubmittedPlan } from "@shared/physio_agent";
import { normalizeDose } from "@shared/physio_protocols";
import { buildGateContext, fingerprintOf, loadExam, newestV2ExamId, forbiddenOf, approverConstraints, patientIds } from "./context";
import { AgentStop } from "./model";
import { approveOpusPlanVersioned, deviceLabels, materializeAwaitingTx, onOpusPlanClosingTx, proposalHashOf, snapshotFromGatedTx, writeChildRowsTx,
  type Refused } from "./versions";
import { composePlanColumns, diffSnapshots, diffSummaryAr } from "@shared/physio_plan_versions";
import { hasActivePlan, jobOf, lockPatientAgent, notifyApproversTx, notifyExaminerTx, type JobRecord } from "./store";
import { V2_DEVICE_NAMES } from "@shared/physio_exam_v2";
import { baghdadTodayYmd } from "@shared/visit_date";
import { findAuthoredLeaks } from "@shared/physio_agent_privacy";

const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];

export class OpusPlanError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export type SaveOutcome =
  | { kind: "succeeded"; planId: number; job: JobRecord }
  | { kind: "cancelled"; code: string; job: JobRecord | null }
  | { kind: "failed"; code: string; detail: string; job: JobRecord | null };

const AW = sql`origin = 'opus' AND status IN ('draft','pending','returned')`;

async function deviceIdsByCode(tx: any): Promise<Map<string, number>> {
  return new Map(rows(await tx.execute(sql`SELECT id, code FROM devices`)).map((d) => [String(d.code), Number(d.id)]));
}

/** **حفظُ الخطّة وإنهاءُ الوظيفة معاً** — أو الإلغاءُ بالسبب إن تغيّر شيء. `result` يُكتب على الوظيفة في الحالتين. */
export async function createPlanFromAgentTx(job: JobRecord, me: string, submitted: SubmittedPlan, result: Record<string, any>,
  web: { fetched: Set<string>; searched: Set<string> }): Promise<SaveOutcome> {
  return db.transaction(async (tx) => {
    await lockPatientAgent(tx, job.patientId);
    const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${job.id} FOR UPDATE`))[0];
    if (!cur || cur.status !== "running" || cur.locked_by !== me) throw new AgentStop("lost");
    if (cur.cancel_requested) throw new AgentStop("cancel");
    const finish = async (status: string, code: string | null, error: string | null, extra: Record<string, any> = {}, detail: string | null = null) => {
      const r = rows(await tx.execute(sql`UPDATE physio_agent_jobs SET status = ${status}, error_code = ${code}, error = ${error}, error_detail = ${detail},
          result = ${JSON.stringify({ ...result, ...extra })}::jsonb, finished_at = now(), locked_by = NULL, locked_at = NULL, stage = ${status === "succeeded" ? "saving" : cur.stage}, updated_at = now()
        WHERE id = ${job.id} RETURNING *`))[0];
      await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: status, userId: null, userName: "Bionic AI", branchId: job.branchId,
        newValues: { status, code, detail }, notes: error ?? undefined, tx });
      return jobOf(r);
    };
    //  ٢ — المعاينةُ والبوّابةُ داخل المعاملة.
    const exam = await loadExam(tx, job.examId, true);
    const patient = rows(await tx.execute(sql`SELECT deleted_at FROM patients WHERE id = ${job.patientId}`))[0];
    let code: string | null = null;
    if (!exam || exam.cancelled) code = "exam_cancelled";
    else if (!patient || patient.deleted_at) code = "patient_deleted";
    else if (fingerprintOf(exam) !== job.examFingerprint) code = "exam_changed";
    else if ((await newestV2ExamId(tx, job.patientId)) !== job.examId) code = "superseded_by_newer_exam";
    else if (!(await examAgentGate(job.examId, tx)).allowed) code = "gate_closed";
    else if (await hasActivePlan(tx, job.patientId)) code = "has_active_plan";
    if (code) return { kind: "cancelled", code, job: await finish("cancelled", code, JOB_ERROR_TEXTS[code]) };
    //  ٣ — البوّاباتُ مرّةً أخيرة.
    const gate = await examAgentGate(job.examId, tx);
    const ctx = await buildGateContext(tx, { patientId: job.patientId, examId: job.examId, branchId: job.branchId,
      protocolId: submitted.mode === "library" ? submitted.protocolId : null,
      exerciseIds: [...submitted.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId ?? 0)), ...submitted.exerciseChanges.map((c) => c.toExerciseId ?? 0)],
      fetched: web.fetched, searched: web.searched, final: true, at: "saving", agentGate: gate, qa: job.qa });
    const g = applyPlanGates(submitted, ctx);
    const gateLog: GateLogEntry[] = [...(result.gateLog ?? []), ...g.log];
    if (g.blocking.length) {
      const c = g.blocking.some((b) => b.code === "empty_plan") ? "empty_plan"
        : g.blocking.every((b) => EXAM_CONFIRM_CODES.has(b.code)) ? "exam_confirmation_needed" : "gates_blocking";
      //  بوّابةٌ تغلق عند الحفظ (جهازٌ صار ممنوعاً أو غيرَ متوفّرٍ بعد المراجعة): الوظيفةُ تفشل هنا في المعاملة — **ويُنبَّه المعتمِدون والفاحصُ هنا**،
      //  فالعاملُ بعدها لا يجد وظيفةً عاملة يُنهيها ولا يرسل شيئاً.
      const detail = g.blocking.map((b) => (c === "exam_confirmation_needed" ? b.target ?? b.code : b.code)).join(",");
      const failedJob = await finish("failed", c, JOB_ERROR_TEXTS[c], { gateLog, final: { submitted, gated: g.plan } }, detail);
      await notifyApproversTx(tx, failedJob, `⚠️ لم يكتب Bionic AI خطّة: ${JOB_ERROR_TEXTS[c]}`, `/patients/${job.patientId}`);
      await notifyExaminerTx(tx, failedJob, `⚠️ لم يكتب Bionic AI خطّة: ${JOB_ERROR_TEXTS[c]}`);
      return { kind: "failed", code: c, detail, job: failedJob };
    }
    const plan = g.plan;
    //  ٤ — الصفّ: من لقطة الخطّة (§4.hb) بالقاعدة نفسِها التي تكتب بها كلُّ نسخة (`composePlanColumns` · `writeChildRowsTx`).
    const labels = await deviceLabels(tx);
    const snap = await snapshotFromGatedTx(tx, plan, { patientId: job.patientId, branchId: job.branchId, exam,
      forbidden: ctx.forbidden.map((f) => ({ ...f, nameAr: labels.get(f.deviceCode)?.nameAr ?? V2_DEVICE_NAMES[f.deviceCode] ?? f.deviceCode })),
      gateCode: gate.code, sources: { fetchedInJob: job.id } });
    const cols = composePlanColumns(snap);
    const examiner = rows(await tx.execute(sql`SELECT doctor_id, doctor_name FROM medical_exams WHERE id = ${job.examId}`))[0];
    const ins = rows(await tx.execute(sql`
      INSERT INTO physio_plans (patient_id, branch_id, protocol_id, title_ar, title_en, goals, goals_en, exercises, exercises_en, precautions, precautions_en,
        notes, notes_en, sessions_per_week, duration_weeks, session_minutes, total_sessions, status, submitted_at, measures_own, protocol_copied_at,
        origin, source_exam_id, agent_job_id, out_of_library, sources, created_by, created_by_name, updated_by, updated_by_name)
      VALUES (${job.patientId}, ${job.branchId}, ${plan.protocolId}, ${cols.titleAr}, ${cols.titleEn},
        ${cols.goals}, ${cols.goalsEn}, ${cols.exercises}, ${cols.exercisesEn}, ${cols.precautions}, ${cols.precautionsEn}, ${cols.notes}, ${cols.notesEn},
        ${cols.sessionsPerWeek}, ${cols.durationWeeks}, ${cols.sessionMinutes}, ${cols.totalSessions}, 'pending', now(),
        ${cols.measuresOwn}, ${plan.protocolId ? sql`now()` : null},
        'opus', ${job.examId}, ${job.id}, ${cols.outOfLibrary}, ${JSON.stringify(cols.sources)}::jsonb,
        ${examiner?.doctor_id ?? null}, ${examiner?.doctor_name ?? null}, NULL, 'Bionic AI')
      RETURNING id`))[0];
    const planId = Number(ins.id);
    await writeChildRowsTx(tx, planId, snap);
    await logAudit({ entityType: "physio_plan", entityId: planId, action: "create_by_agent", userId: null, userName: "Bionic AI", branchId: job.branchId,
      newValues: { jobId: job.id, examId: job.examId, mode: plan.mode, protocolId: plan.protocolId, devices: plan.devices.map((d) => d.deviceCode),
        removed: plan.removed, totalSessions: plan.totalSessions }, notes: `كتب Bionic AI خطّةً تنتظر الاعتماد من المعاينة #${job.examId}`, tx });
    const done = await finish("succeeded", null, null, { gateLog, final: { submitted, gated: plan } });
    await notifyApproversTx(tx, job, plan.mode === "out_of_library" ? "🤖 خطّةٌ كتبها Bionic AI «خارج المكتبة» تنتظر الاعتماد" : "🤖 خطّةٌ كتبها Bionic AI تنتظر الاعتماد",
      `/physio/plans/${planId}`);
    return { kind: "succeeded", planId, job: done };
  });
}

/**
 * **«أعِده إلى Opus» — حفظُ الكتابة الجديدة على الخطّة المنتظرة نفسِها** (§4.hb ٣.٦، D1): قفلُ المريض ⟵ الخطّة ⟵ الوظيفة؛ والخطّةُ ما زالت منتظرةً
 * على وظيفة الأساس، والقِدَمُ بممنوعٍ الآن وحده مسموح؛ ثمّ البوّاباتُ النهائية — وما منع ⟵ تفشل الوظيفةُ والخطّةُ كما هي (والاقتراحُ السابق باقٍ).
 */
export async function replaceAwaitingPlanFromAgentTx(job: JobRecord, me: string, submitted: SubmittedPlan, result: Record<string, any>,
  web: { fetched: Set<string>; searched: Set<string> }): Promise<SaveOutcome> {
  return db.transaction(async (tx) => {
    await lockPatientAgent(tx, job.patientId);
    const plan = job.planId ? rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${job.planId} FOR UPDATE`))[0] : null;
    const cur = rows(await tx.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${job.id} FOR UPDATE`))[0];
    if (!cur || cur.status !== "running" || cur.locked_by !== me) throw new AgentStop("lost");
    if (cur.cancel_requested) throw new AgentStop("cancel");
    const finish = async (status: string, code: string | null, extra: Record<string, any> = {}, detail: string | null = null) => {
      const r = rows(await tx.execute(sql`UPDATE physio_agent_jobs SET status = ${status}, error_code = ${code}, error = ${code ? JOB_ERROR_TEXTS[code] ?? code : null},
          error_detail = ${detail}, result = ${JSON.stringify({ ...result, ...extra })}::jsonb, finished_at = now(), locked_by = NULL, locked_at = NULL,
          stage = ${status === "succeeded" ? "saving" : cur.stage}, updated_at = now() WHERE id = ${job.id} RETURNING *`))[0];
      await logAudit({ entityType: "physio_agent_job", entityId: job.id, action: status, userId: null, userName: "Bionic AI", branchId: job.branchId,
        newValues: { status, code, detail }, notes: code ? JOB_ERROR_TEXTS[code] ?? code : "أعاد Bionic AI كتابةَ الخطّة بملاحظة المعتمِد", tx });
      return jobOf(r);
    };
    let code: string | null = null;
    if (!plan) code = "plan_discarded";
    else if (!isOpusAwaiting({ origin: plan.origin, status: plan.status })) code = "plan_not_awaiting";
    else if (Number(plan.agent_job_id) !== job.baseJobId) code = "plan_not_awaiting";
    const exam = await loadExam(tx, job.examId, true);
    if (!code) {
      const pt = rows(await tx.execute(sql`SELECT deleted_at FROM patients WHERE id = ${job.patientId}`))[0];
      if (!exam || exam.cancelled) code = "exam_cancelled";
      else if (!pt || pt.deleted_at) code = "patient_deleted";
      else if (fingerprintOf(exam) !== job.examFingerprint) code = "exam_changed";
      else if ((await newestV2ExamId(tx, job.patientId)) !== job.examId) code = "superseded_by_newer_exam";
      else if (!(await examAgentGate(job.examId, tx)).allowed) code = "gate_closed";
      else if (await hasActivePlan(tx, job.patientId)) code = "has_active_plan";
      else { const st = await opusStaleness(tx, plan!); if (st && st !== "forbidden_now") code = st; }
    }
    if (code) {
      const j = await finish("cancelled", code);
      await notifyApproversTx(tx, j, `⚠️ لم يُعد Bionic AI كتابةَ الخطّة: ${JOB_ERROR_TEXTS[code] ?? code}`, plan ? `/physio/plans/${plan.id}` : `/patients/${job.patientId}`);
      return { kind: "cancelled", code, job: j };
    }
    const gate = await examAgentGate(job.examId, tx);
    const ctx = await buildGateContext(tx, { patientId: job.patientId, examId: job.examId, branchId: job.branchId,
      protocolId: submitted.mode === "library" ? submitted.protocolId : null,
      exerciseIds: [...submitted.phases.flatMap((p) => p.exercises.map((x) => x.exerciseId ?? 0)), ...submitted.exerciseChanges.map((c) => c.toExerciseId ?? 0)],
      fetched: web.fetched, searched: web.searched, final: true, at: "saving", agentGate: gate, qa: job.qa });
    //  الممنوعُ: المعاينةُ ∪ ما منعه المعتمِدون في كلّ اعتمادٍ حيّ للمريض (D10).
    const { forbiddenForPatientTx } = await import("./versions");
    const fp = await forbiddenForPatientTx(tx, job.patientId, exam, null);
    const g = applyPlanGates(submitted, { ...ctx, forbidden: fp.map((f) => ({ deviceCode: f.deviceCode, reasonAr: f.reasonAr, source: f.source })) });
    const gateLog: GateLogEntry[] = [...(result.gateLog ?? []), ...g.log];
    if (g.blocking.length) {
      const c = g.blocking.some((b) => b.code === "empty_plan") ? "empty_plan"
        : g.blocking.every((b) => EXAM_CONFIRM_CODES.has(b.code)) ? "exam_confirmation_needed" : "gates_blocking";
      const detail = g.blocking.map((b) => (c === "exam_confirmation_needed" ? b.target ?? b.code : b.code)).join(",");
      const j = await finish("failed", c, { gateLog, final: { submitted, gated: g.plan } }, detail);
      await notifyApproversTx(tx, j, `⚠️ لم يُعد Bionic AI كتابةَ الخطّة: ${JOB_ERROR_TEXTS[c]} — الاقتراحُ السابق باقٍ`, `/physio/plans/${plan!.id}`);
      return { kind: "failed", code: c, detail, job: j };
    }
    const snap = await snapshotFromGatedTx(tx, g.plan, { patientId: job.patientId, branchId: job.branchId, exam, forbidden: fp, gateCode: gate.code, sources: { fetchedInJob: job.id } });
    const prevJob = job.baseJobId ? rows(await tx.execute(sql`SELECT result FROM physio_agent_jobs WHERE id = ${job.baseJobId}`))[0] : null;
    const prevGated = prevJob?.result?.final?.regated?.gated ?? prevJob?.result?.final?.gated ?? null;
    //  الفرقُ عمّا رآه المعتمِد: الاقتراحُ المصحَّح عند الاعتماد إن كان (`regated.snapshot`)، لا الأصلُ قبل التصحيح.
    const prevCorrected = prevJob?.result?.final?.regated?.snapshot ?? null;
    let diffFromPrevious: unknown = null; let diffSummary: string | null = null;
    if (prevCorrected || prevGated) {
      const prev = prevCorrected ?? await snapshotFromGatedTx(tx, prevGated, { patientId: job.patientId, branchId: job.branchId, exam, forbidden: fp });
      const d = diffSnapshots(prev, snap, g.log, "writer");
      diffFromPrevious = d; diffSummary = diffSummaryAr(d);
    }
    await materializeAwaitingTx(tx, Number(plan!.id), snap, job.id);
    await logAudit({ entityType: "physio_plan", entityId: Number(plan!.id), action: "opus_returned_rewrite", userId: null, userName: "Bionic AI", branchId: plan!.branch_id,
      oldValues: { agentJobId: plan!.agent_job_id }, newValues: { agentJobId: job.id, mode: g.plan.mode, devices: g.plan.devices.map((d) => d.deviceCode), diff: diffSummary },
      notes: "أعاد Bionic AI كتابةَ الخطّة بملاحظة المعتمِد — تنتظر الاعتماد", tx });
    const done = await finish("succeeded", null, { gateLog, final: { submitted, gated: g.plan }, revision: { scope: "return", diffFromPrevious, diffSummaryAr: diffSummary } });
    await notifyApproversTx(tx, done, "🤖 أعاد Bionic AI كتابةَ الخطّة بملاحظة المعتمِد وتنتظر الاعتماد", `/physio/plans/${plan!.id}`);
    return { kind: "succeeded", planId: Number(plan!.id), job: done };
  });
}

/** مراحلُ الخطّة وتمارينُها — بطاقاتُ المكتبة بأرقامها، وبطاقاتُ «خارج المكتبة» المقترحة بعد أن تُنشأ (`cardIds`). */
async function writeBuiltPhases(tx: any, planId: number, plan: GatedPlan, cardIds: Map<string, number> | null) {
  await tx.execute(sql`DELETE FROM physio_plan_phases WHERE plan_id = ${planId}`);
  for (const ph of plan.phases) {
    const r = rows(await tx.execute(sql`INSERT INTO physio_plan_phases (plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
        goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en)
      VALUES (${planId}, ${ph.position}, ${ph.nameAr}, ${ph.nameEn}, ${ph.sessionFrom}, ${ph.sessionTo}, ${ph.timeframe}, ${ph.timeframeEn}, ${ph.goals}, ${ph.goalsEn},
        ${ph.education}, ${ph.educationEn}, ${ph.progressCriteria}, ${ph.progressCriteriaEn}, ${ph.notes}, ${ph.notesEn}) RETURNING id`))[0];
    const seen = new Set<number>();
    for (const [j, x] of Array.from(ph.exercises.entries())) {
      const id = x.exerciseId ?? (x.proposedKey && cardIds ? cardIds.get(x.proposedKey) ?? null : null);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      await tx.execute(sql`INSERT INTO physio_plan_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds, dose_note, dose_note_en, note, note_en)
        VALUES (${r.id}, ${id}, ${j}, ${x.sets}, ${x.reps}, ${x.holdSeconds}, ${x.restSeconds}, ${x.doseNote}, ${x.doseNoteEn}, ${x.note}, ${x.noteEn})`);
    }
  }
}

/** **خطّةُ Opus قدُمت؟** — سببٌ مكتوب، أو بصمةٌ تغيّرت، أو بوّابةٌ أُغلقت، أو معاينتُها لم تعد الأحدث، أو ممنوعٌ الآن في أجهزتها. */
export async function opusStaleness(ex: any, plan: Record<string, any>): Promise<string | null> {
  if (plan.opus_stale_reason) return String(plan.opus_stale_reason);
  const job = plan.agent_job_id ? rows(await ex.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${plan.agent_job_id}`))[0] : null;
  const exam = plan.source_exam_id ? await loadExam(ex, Number(plan.source_exam_id)) : null;
  if (!exam || exam.cancelled) return "exam_cancelled";
  if (job && fingerprintOf(exam) !== job.exam_fingerprint) return "exam_changed";
  if ((await newestV2ExamId(ex, Number(plan.patient_id))) !== exam.id) return "superseded_by_newer_exam";
  if (!(await examAgentGate(exam.id, ex)).allowed) return "gate_closed";
  const ids = await patientIds(ex, Number(plan.patient_id));
  const forbidden = new Set(forbiddenOf(exam, await approverConstraints(ex, Number(plan.patient_id), exam.id, ids), baghdadTodayYmd()).map((f) => f.deviceCode));
  const codes = rows(await ex.execute(sql`SELECT d.code FROM physio_plan_devices l JOIN devices d ON d.id = l.device_id WHERE l.plan_id = ${plan.id}`)).map((r) => String(r.code));
  if (codes.some((c) => forbidden.has(c))) return "forbidden_now";
  return null;
}

/** الملاحظاتُ الكبيرة التي لم تُحلّ — وعلى المعتمِد الإقرارُ بكلٍّ منها. */
export const unresolvedMajors = (result: Record<string, any>): Issue[] =>
  [...(result?.unresolved?.reviewer ?? []), ...(result?.unresolved?.auditor ?? [])].filter((i: Issue) => i.severity === "major");

/** **اعتمادُ خطّة Opus** (§4.ha ٧.٤، و§4.hb ٤.٥): لما قرأه المعتمِد (الوظيفةُ وبصمةُ الاقتراح)، وبإعادة البوّابات على الحال الآن، وتُكتب معه النسخةُ ١.
 *  ونتيجةٌ لا رميٌ (D14): الاقتراحُ المصحَّح يُحفظ ثمّ يُردّ ٤٠٩ `proposal_changed`. */
export async function approveOpusPlan(planId: number, body: any, actor: { userId: number | null; name: string | null; ip?: string | null; userAgent?: string | null }) {
  return approveOpusPlanVersioned(planId, body, actor, { opusStaleness, hasActivePlan, saveDraftProtocolTx });
}
export type ApproveRefused = Refused;

/** **«خارج المكتبة» ⟵ بروتوكولٌ مسوّدة** — من `library_protocol` العامّ ومراحله وأجهزته ومقاييسه، وبطاقاتٌ مسوّدة لما اقترحه. */
export async function saveDraftProtocolTx(tx: any, planId: number, result: Record<string, any>, actor: { userId: number | null; name: string | null }) {
  const gated = result?.final?.gated as GatedPlan | undefined;
  const lp = gated?.libraryProtocol;
  if (!gated || !lp) throw new OpusPlanError(409, "لا نصَّ بروتوكولٍ عامّ في هذه الخطّة", "no_library_protocol");
  //  النصوصُ العامّة وحدها — والحارسُ يعيد فحصها عن هويّة المريض.
  const plan = rows(await tx.execute(sql`SELECT patient_id FROM physio_plans WHERE id = ${planId}`))[0];
  const ids = await patientIds(tx, Number(plan.patient_id));
  const generic = [Object.values(lp).join("\n"), ...gated.proposedCards.map((c) => Object.values(c).join("\n"))].join("\n");
  if (findAuthoredLeaks(generic, ids).length) throw new OpusPlanError(409, "في نصّ البروتوكول العامّ ما يشبه هويّةَ المريض", "generic_text_identifier");
  const cardIds = new Map<string, number>();
  for (const c of gated.proposedCards) {
    const r = rows(await tx.execute(sql`INSERT INTO physio_exercises (code, name_ar, name_en, kind, region, purpose_en, steps, steps_en, stop_if, stop_if_en,
        sets, reps, hold_seconds, status, created_by, created_by_name, updated_by, updated_by_name)
      VALUES (${`opus-${planId}-${c.key}`.slice(0, 120)}, ${c.nameAr}, ${c.nameEn}, ${c.kind}, ${c.region}, ${c.purposeEn}, ${c.stepsAr}, ${c.stepsEn},
        ${c.stopIfAr}, ${c.stopIfEn}, ${c.sets === null ? null : Math.min(10, Math.max(1, c.sets))}, ${c.reps === null ? null : Math.min(100, Math.max(1, c.reps))},
        ${c.holdSeconds === null || c.holdSeconds <= 0 ? null : Math.min(600, c.holdSeconds)}, 'draft', ${actor.userId}, ${actor.name}, ${actor.userId}, ${actor.name})
      RETURNING id`))[0];
    cardIds.set(c.key, Number(r.id));
    await logAudit({ entityType: "physio_exercise", entityId: Number(r.id), action: "create_by_agent", userId: actor.userId, userName: actor.name,
      newValues: { planId, key: c.key, sourceUrl: c.sourceUrl }, notes: "بطاقةٌ مسوّدة اقترحها Bionic AI", tx });
  }
  const total = gated.totalSessions;
  const dose = normalizeDose({ sessionsPerWeek: gated.sessionsPerWeek, durationWeeks: null, totalSessions: total });
  const refs = gated.sources.map((s) => ({ title: s.title || s.url, org: s.org, year: s.year, url: s.url }));
  const pr = rows(await tx.execute(sql`INSERT INTO physio_protocols (code, title_ar, title_en, category, age_group, summary, summary_en, goals, goals_en,
      contraindications, contraindications_en, sessions_per_week, duration_weeks, session_minutes, total_sessions, max_total_sessions, "references",
      status, origin, source_plan_id, created_by, created_by_name, updated_by, updated_by_name)
    VALUES (${`opus-${planId}`}, ${lp.titleAr}, ${lp.titleEn}, ${lp.category}, ${lp.ageGroup}, ${lp.summaryAr}, ${[lp.summaryEn, lp.indicationsEn ? `Indications: ${lp.indicationsEn}` : null].filter(Boolean).join("\n\n") || null},
      ${lp.goalsAr}, ${lp.goalsEn}, ${lp.contraindicationsAr}, ${lp.contraindicationsEn}, ${dose.sessionsPerWeek}, ${dose.durationWeeks}, ${gated.sessionMinutes},
      ${total}, ${total}, ${JSON.stringify(refs)}::jsonb, 'draft', 'opus', ${planId}, ${actor.userId}, ${actor.name}, ${actor.userId}, ${actor.name}) RETURNING id`))[0];
  const protocolId = Number(pr.id);
  const ids2 = await deviceIdsByCode(tx);
  for (const [i, d] of Array.from(gated.devices.entries())) {
    //  قيمُ BTL ⟵ خاناتُ `DEVICE_REQUIRED_SETTINGS` حيث تتطابق (الموجاتُ الصادمة)، والباقي في نصّ المعاملات.
    const params: Record<string, string> = {};
    if (d.deviceCode === "shockwaves" && d.btl) {
      params.mode = d.btl.modelId === "fswt" ? "focused" : "radial";
      for (const f of d.btl.fallback) {
        const k = f.key === "pressure_bar" ? "pressureBar" : f.key === "energy_flux_mj_mm2" ? "energyMj" : f.key === "frequency_hz" ? "frequencyHz" : f.key === "shocks" ? "impulses" : null;
        if (k) params[k] = String(f.value);
      }
    }
    await tx.execute(sql`INSERT INTO physio_protocol_devices (protocol_id, device_id, evidence, parameters, parameters_en, minutes, note, note_en, params, centre_use, every_days, times, display_order)
      VALUES (${protocolId}, ${ids2.get(d.deviceCode)!}, ${d.evidence === "recommended" || d.evidence === "optional" || d.evidence === "not_recommended" ? d.evidence : d.use === "core" ? "recommended" : "optional"},
        ${d.parameters}, ${d.parametersEn}, ${d.minutes}, ${d.reasonAr || null}, ${d.reasonEn || null}, ${JSON.stringify(params)}::jsonb, ${d.use}, ${d.everyDays}, ${d.times}, ${i})`);
  }
  for (const ph of gated.phases) {
    const r = rows(await tx.execute(sql`INSERT INTO physio_protocol_phases (protocol_id, position, name_ar, name_en, session_from, session_to, goals, goals_en,
        education, education_en, progress_criteria, progress_criteria_en)
      VALUES (${protocolId}, ${ph.position}, ${ph.nameAr}, ${ph.nameEn}, ${ph.sessionFrom}, ${ph.sessionTo}, ${ph.goals}, ${ph.goalsEn}, ${ph.education}, ${ph.educationEn},
        ${ph.progressCriteria}, ${ph.progressCriteriaEn}) RETURNING id`))[0];
    const seen = new Set<number>();
    for (const [j, x] of Array.from(ph.exercises.entries())) {
      const id = x.exerciseId ?? (x.proposedKey ? cardIds.get(x.proposedKey) ?? null : null);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      await tx.execute(sql`INSERT INTO physio_protocol_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds, dose_note, dose_note_en)
        VALUES (${r.id}, ${id}, ${j}, ${x.sets}, ${x.reps}, ${x.holdSeconds}, ${x.restSeconds}, ${x.doseNote}, ${x.doseNoteEn})`);
    }
  }
  for (const [i, m] of Array.from(gated.measures.entries())) {
    await tx.execute(sql`INSERT INTO physio_protocol_measures (protocol_id, code, name_ar, name_en, unit_ar, unit_en, min_value, max_value, higher_is_better, display_order)
      VALUES (${protocolId}, ${m.code}, ${m.nameAr}, ${m.nameEn}, ${m.unitAr}, ${m.unitEn}, ${m.min}, ${m.max}, ${m.higherIsBetter}, ${i})`);
  }
  //  الخطّةُ نفسُها تأخذ بطاقاتِها المقترحة من النسخة ١ (`approveOpusPlanVersioned` تكتب الصفوفَ من اللقطة بأرقام هذه البطاقات).
  await logAudit({ entityType: "physio_protocol", entityId: protocolId, action: "create_by_agent", userId: actor.userId, userName: actor.name,
    newValues: { planId, code: `opus-${planId}`, cards: Array.from(cardIds.values()) }, notes: "بروتوكولٌ مسوّدة من خطّة Bionic AI «خارج المكتبة» المعتمَدة", tx });
  return { protocolId, cardIds };
}

/** **حذفُ خطّة Opus منتظرة** بيد معتمِد — قديمةً أو غيرَ مرغوبة؛ والصورةُ في سطر التدقيق. */
export async function discardOpusPlan(planId: number, actor: { userId: number | null; name: string | null; ip?: string | null; userAgent?: string | null }) {
  return db.transaction(async (tx) => {
    //  D13 — قفلُ المريض أوّلاً ثمّ الخطّة ثمّ وظيفتُها: الحذفُ وحفظُ «أعِده إلى Opus» لا يتقاطعان.
    const p0 = rows(await tx.execute(sql`SELECT patient_id FROM physio_plans WHERE id = ${planId}`))[0];
    if (!p0) throw new OpusPlanError(404, "الخطّة غير موجودة", "plan_not_found");
    await lockPatientAgent(tx, Number(p0.patient_id));
    const plan = rows(await tx.execute(sql`SELECT * FROM physio_plans WHERE id = ${planId} FOR UPDATE`))[0];
    if (!plan) throw new OpusPlanError(404, "الخطّة غير موجودة", "plan_not_found");
    if (!isOpusAwaiting({ origin: plan.origin, status: plan.status })) throw new OpusPlanError(409, "تُحذف من هنا خطّةُ Bionic AI المنتظرة وحدها", "not_awaiting");
    await onOpusPlanClosingTx(tx, planId, "plan_discarded", actor);
    await tx.execute(sql`DELETE FROM physio_plans WHERE id = ${planId}`);
    await logAudit({ entityType: "physio_plan", entityId: planId, action: "opus_discard", userId: actor.userId, userName: actor.name, branchId: plan.branch_id,
      oldValues: plan, notes: "حُذفت خطّةُ Bionic AI منتظرة", ipAddress: actor.ip ?? null, userAgent: actor.userAgent ?? null, tx });
    return plan;
  });
}

/** **«الخطّة المقترحة»** للمعتمِد — كلُّ ما يحتاجه ليقرّر. */
export async function opusProposal(planId: number) {
  const plan = rows(await db.execute(sql`SELECT pl.*, pr.code AS protocol_code, pr.title_ar AS protocol_title_ar FROM physio_plans pl
      LEFT JOIN physio_protocols pr ON pr.id = pl.protocol_id WHERE pl.id = ${planId}`))[0];
  if (!plan || plan.origin !== "opus") return null;
  const job = plan.agent_job_id ? rows(await db.execute(sql`SELECT * FROM physio_agent_jobs WHERE id = ${plan.agent_job_id}`))[0] : null;
  const result = (job?.result ?? {}) as Record<string, any>;
  const gated = result?.final?.gated as GatedPlan | undefined;
  const ids = await patientIds(db, Number(plan.patient_id));
  const constraints = plan.source_exam_id ? await approverConstraints(db, Number(plan.patient_id), Number(plan.source_exam_id), ids) : [];
  const staleReason = isOpusAwaiting({ origin: plan.origin, status: plan.status }) ? await opusStaleness(db, plan) : null;
  //  **أسماءُ التمارين والأجهزة للعرض** — ما تشير إليه الخطّةُ وحدها، فلا تجلب الشاشةُ المكتبةَ كلَّها.
  const exIds = Array.from(new Set([...(gated?.phases ?? []).flatMap((ph) => ph.exercises.map((x) => x.exerciseId)),
    ...(gated?.exerciseChanges ?? []).flatMap((c) => [c.fromExerciseId, c.toExerciseId])].filter((x): x is number => Number.isInteger(x))));
  const exerciseNames: Record<number, { nameAr: string; nameEn: string }> = {};
  if (exIds.length) for (const r of rows(await db.execute(sql`SELECT id, name_ar, name_en FROM physio_exercises WHERE id IN (${sql.join(exIds.map((i) => sql`${i}`), sql`, `)})`)))
    exerciseNames[Number(r.id)] = { nameAr: String(r.name_ar), nameEn: String(r.name_en) };
  const deviceNames: Record<string, { nameAr: string; nameEn: string }> = {};
  for (const r of rows(await db.execute(sql`SELECT code, name_ar, name_en FROM devices`))) deviceNames[String(r.code)] = { nameAr: String(r.name_ar), nameEn: String(r.name_en) };
  return {
    plan: { id: Number(plan.id), patientId: Number(plan.patient_id), status: plan.status, titleAr: plan.title_ar, titleEn: plan.title_en, outOfLibrary: plan.out_of_library,
      protocolId: plan.protocol_id, protocolCode: plan.protocol_code ?? null, protocolTitleAr: plan.protocol_title_ar ?? null, totalSessions: plan.total_sessions,
      sessionsPerWeek: plan.sessions_per_week, sessionMinutes: plan.session_minutes, createdByName: plan.created_by_name, createdAt: plan.created_at },
    job: job ? { id: Number(job.id), status: job.status, trigger: job.trigger, requestedByName: job.requested_by_name, finishedAt: job.finished_at, examId: Number(job.exam_id) } : null,
    final: gated ?? null, submitted: result?.final?.submitted ?? null,
    gateLog: result.gateLog ?? [], removed: gated?.removed ?? [], reviews: result.reviews ?? [], audits: result.audits ?? [],
    unresolved: result.unresolved ?? { reviewer: [], auditor: [] }, majorsToAcknowledge: unresolvedMajors(result).map((i) => i.id),
    sources: gated?.sources ?? [], fetchedUrls: result.fetchedUrls ?? [], proposedCards: gated?.proposedCards ?? [], libraryProtocol: gated?.libraryProtocol ?? null,
    alternatives: gated?.alternatives ?? [], approverConstraints: constraints.map((c) => ({ examIsThis: c.examIsThis, decidedAt: c.decidedAt, note: c.note, flags: c.flags, forbiddenDevices: c.forbiddenDevices })),
    examStale: Boolean(staleReason), staleReason, staleText: staleReason ? (JOB_ERROR_TEXTS[staleReason] ?? "حُظر في المعاينة الآن جهازٌ في الخطّة") : null,
    usage: result.usage ?? null, exerciseNames, deviceNames,
    //  §4.hb — الاعتمادُ لما يُعرض: رقمُ الوظيفة وبصمةُ الاقتراح (والاقتراحُ المصحَّح بالبوّابات عند اعتمادٍ سابق إن كان).
    agentJobId: job ? Number(job.id) : null, proposalHash: job ? proposalHashOf(Number(job.id), result) : null,
    regated: result?.final?.regated ? { snapshot: result.final.regated.snapshot, gateLog: result.final.regated.gateLog ?? [], at: result.final.regated.at ?? null } : null,
    returnRounds: rows(await db.execute(sql`SELECT id, status, error_code, error, revise_note, requested_by_name, created_at, finished_at, result->'revision' AS revision
        FROM physio_agent_jobs WHERE plan_id = ${planId} AND revise_scope = 'return' ORDER BY id`)).map((r) => ({ jobId: Number(r.id), status: r.status, errorCode: r.error_code ?? null,
      error: r.error ?? null, note: r.revise_note, requestedByName: r.requested_by_name ?? null, createdAt: r.created_at, finishedAt: r.finished_at,
      diffFromPrevious: r.revision?.diffFromPrevious ?? null, diffSummaryAr: r.revision?.diffSummaryAr ?? null })),
    activeRevision: rows(await db.execute(sql`SELECT id, status, stage, stages FROM physio_agent_jobs WHERE plan_id = ${planId} AND kind = 'revise'
        AND status IN ('queued','running','needs_answers') LIMIT 1`)).map((r) => ({ jobId: Number(r.id), status: r.status, stage: r.stage, stages: r.stages }))[0] ?? null,
  };
}

/** **طابورُ خطط Opus** — المنتظرةُ الطازجة، والقديمةُ، والمقرَّرة. */
/** اقتراحاتُ Opus المنتظرة على خططٍ معتمَدة قائمة (§4.hb) — لتبويب «تعديلاتٌ مقترحة» وشارته. */
export async function listOpusProposals(limit = 200) {
  const r = rows(await db.execute(sql`SELECT j.id AS job_id, j.base_version, j.revise_note, j.requested_by_name, j.finished_at, pl.id, pl.patient_id, pl.branch_id, pl.title_ar,
      pl.opus_version, p.name AS patient_name, p.patient_code, b.name AS branch_name, j.result->'final'->'revision'->>'diffSummaryAr' AS diff_summary
    FROM physio_agent_jobs j JOIN physio_plans pl ON pl.id = j.plan_id JOIN patients p ON p.id = pl.patient_id LEFT JOIN branches b ON b.id = pl.branch_id
    WHERE j.proposal_status = 'pending' AND p.deleted_at IS NULL ORDER BY j.finished_at, j.id LIMIT ${limit}`));
  return r.map((x) => ({ jobId: Number(x.job_id), planId: Number(x.id), patientId: Number(x.patient_id), branchId: x.branch_id, branchName: x.branch_name, titleAr: x.title_ar,
    baseVersion: x.base_version, currentVersion: x.opus_version, stale: x.base_version !== x.opus_version, request: x.revise_note, requestedByName: x.requested_by_name,
    finishedAt: x.finished_at, diffSummaryAr: x.diff_summary ?? null, patientName: x.patient_name, patientCode: x.patient_code }));
}
export async function pendingProposalCount(): Promise<number> {
  const r = rows(await db.execute(sql`SELECT count(*)::int AS n FROM physio_agent_jobs j JOIN physio_plans pl ON pl.id = j.plan_id JOIN patients p ON p.id = pl.patient_id
     WHERE j.proposal_status = 'pending' AND p.deleted_at IS NULL`))[0];
  return Number(r?.n ?? 0);
}

export async function listOpusPlans(view: "pending" | "stale" | "decided", limit = 200) {
  const cond = view === "pending" ? sql`pl.status = 'pending' AND pl.opus_stale_reason IS NULL`
    : view === "stale" ? sql`pl.status IN ('draft','pending','returned') AND pl.opus_stale_reason IS NOT NULL`
      : sql`pl.status NOT IN ('draft','pending','returned')`;
  const r = rows(await db.execute(sql`SELECT pl.id, pl.patient_id, pl.branch_id, pl.status, pl.title_ar, pl.out_of_library, pl.opus_stale_reason, pl.created_at,
      pl.decided_by_name, pl.decided_at, pl.created_by_name, p.name AS patient_name, p.patient_code, b.name AS branch_name,
      EXISTS (SELECT 1 FROM physio_agent_jobs j WHERE j.plan_id = pl.id AND j.kind = 'revise' AND j.status IN ('queued','running','needs_answers')) AS revising
    FROM physio_plans pl JOIN patients p ON p.id = pl.patient_id LEFT JOIN branches b ON b.id = pl.branch_id
    WHERE pl.origin = 'opus' AND p.deleted_at IS NULL AND ${cond} ORDER BY pl.created_at ${view === "decided" ? sql`DESC` : sql`ASC`}, pl.id LIMIT ${limit}`));
  return r.map((x) => ({ id: Number(x.id), patientId: Number(x.patient_id), branchId: x.branch_id, branchName: x.branch_name, status: x.status, titleAr: x.title_ar,
    outOfLibrary: x.out_of_library, staleReason: x.opus_stale_reason ?? null, createdAt: x.created_at, decidedByName: x.decided_by_name, decidedAt: x.decided_at,
    examinerName: x.created_by_name, patientName: x.patient_name, patientCode: x.patient_code, revising: Boolean(x.revising) }));
}

/** «قدُمت»: خططٌ منتظرة تغيّرت معاينتُها — لا تُعتمد، يحذفها المعتمِد؛ عددُها يُعرض باهتاً بجانب «قدُمت» (لا في الشارة). */
export async function staleOpusCount(): Promise<number> {
  const r = rows(await db.execute(sql`SELECT count(*)::int AS n FROM physio_plans pl JOIN patients p ON p.id = pl.patient_id
     WHERE pl.origin = 'opus' AND pl.status IN ('draft','pending','returned') AND pl.opus_stale_reason IS NOT NULL AND p.deleted_at IS NULL`))[0];
  return Number(r?.n ?? 0);
}
export async function pendingOpusCount(): Promise<number> {
  const r = rows(await db.execute(sql`SELECT count(*)::int AS n FROM physio_plans pl JOIN patients p ON p.id = pl.patient_id
     WHERE pl.origin = 'opus' AND pl.status = 'pending' AND pl.opus_stale_reason IS NULL AND p.deleted_at IS NULL
       AND NOT EXISTS (SELECT 1 FROM physio_agent_jobs j WHERE j.plan_id = pl.id AND j.kind = 'revise' AND j.status IN ('queued','running','needs_answers'))`))[0];
  return Number(r?.n ?? 0);
}
void AW;
