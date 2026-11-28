// **ما يراه Opus — وما لا يراه أبداً** (§4.ha، الفقرة ٣.٤). يُبنى من القاعدة لكلّ تشغيل: المعاينةُ بنصّها الإنكليزيّ، والعمرُ والجنس والوزن،
// والتواريخُ صريحة، والموانعُ الحتمية **مسبقاً**، وملاحظاتُ المعتمِدين كلُّها، وتاريخُ المريض، وفهرسُ المكتبة، وأجهزةُ الفرع، وكتالوجُ BTL.
// **ولا اسمَ ولا هاتفَ ولا رمزَ ملفٍّ ولا عنوانَ ولا محافظةَ ولا اسمَ موظّف** — وما كتبه الموظّفون نصّاً حرّاً يُنقّى قبل أن يدخل.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { readStoredAssessment } from "@shared/physio_initial_assessment";
import {
  anyAssessmentEnglishText, conditionOf, examAskableFields, examCautionInputsMissing, examGateInputsMissing, examGroupConfirmed, examMustAskBeforePlan,
  examRuleset, examV2Acuity, forbiddenDevices, isExamV2, moduleOf, type PhysioExamV2,
} from "@shared/physio_exam_v2";
import { baghdadTodayYmd } from "@shared/visit_date";
import { btlCatalogForModel } from "@shared/btl_devices";
import { patientIdentifierSet, redactAuthoredText, redactDeep, type IdentifierSet } from "@shared/physio_agent_privacy";
import { mergeForbidden, type GateContext, type GateExercise, type GateForbidden, type GateProtocol } from "@shared/physio_agent_gates";
import { MAX_QUESTION_ROUNDS, protocolSessionCeiling, WEB_FETCH_BUDGET, WEB_SEARCH_BUDGET, type QaRound } from "@shared/physio_agent";
import { AGE_GROUPS, PROTOCOL_CATEGORIES, centreUseOf } from "@shared/physio_protocols";
import { BODY_REGIONS, EXERCISE_KINDS } from "@shared/physio_exercises";
import { planLineFromProtocol } from "@shared/physio_plan_diff";
import { V2_DEVICE_NAMES } from "@shared/physio_exam_v2";
import { examFingerprint } from "./fingerprint";
import { textSafetyHitsOf } from "@shared/physio_exam_text_safety";

const rows = (r: any): Record<string, any>[] => (r?.rows ?? []) as Record<string, any>[];
const clip = (s: unknown, n: number): string | null => (typeof s === "string" && s.trim() ? s.trim().slice(0, n) : null);

export interface ExamRow {
  id: number; patientId: number; branchId: number | null; caseType: string; doctorId: number | null; doctorName: string;
  assessment: unknown; diagnosis: string | null; chiefComplaint: string | null; clinicalFindings: string | null; plan: string | null; notes: string | null;
  signedAt: string | null; cancelled: boolean;
}

export async function loadExam(ex: any, examId: number, lock = false): Promise<ExamRow | null> {
  const q = sql`SELECT me.*, EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = me.id) AS cancelled
                  FROM medical_exams me WHERE me.id = ${examId}`;
  const e = rows(await ex.execute(lock ? sql`${q} FOR UPDATE OF me` : q))[0];
  if (!e) return null;
  return {
    id: Number(e.id), patientId: Number(e.patient_id), branchId: e.branch_id == null ? null : Number(e.branch_id), caseType: String(e.case_type),
    doctorId: e.doctor_id == null ? null : Number(e.doctor_id), doctorName: String(e.doctor_name ?? ""), assessment: e.assessment,
    diagnosis: e.diagnosis ?? null, chiefComplaint: e.chief_complaint ?? null, clinicalFindings: e.clinical_findings ?? null, plan: e.plan ?? null,
    notes: e.notes ?? null, signedAt: e.signed_at ? new Date(e.signed_at).toISOString() : null, cancelled: Boolean(e.cancelled),
  };
}
export const fingerprintOf = (e: ExamRow): string => examFingerprint(e);

/** **أحدثُ معاينة علاجٍ طبيعيّ حيّة على الاستمارة الثانية للمريض** — بها وحدها يعمل Opus. */
export async function newestV2ExamId(ex: any, patientId: number): Promise<number | null> {
  const r = rows(await ex.execute(sql`
    SELECT me.id FROM medical_exams me
     WHERE me.patient_id = ${patientId} AND me.case_type = 'physiotherapy' AND me.assessment->>'form' = 'BC-PT-02'
       AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = me.id)
     ORDER BY me.signed_at DESC NULLS LAST, me.id DESC LIMIT 1`))[0];
  return r ? Number(r.id) : null;
}

export async function patientIds(ex: any, patientId: number): Promise<IdentifierSet> {
  const p = rows(await ex.execute(sql`SELECT name, phone, phone_e164, patient_code FROM patients WHERE id = ${patientId}`))[0] ?? {};
  const aliases = rows(await ex.execute(sql`SELECT code FROM patient_code_aliases WHERE patient_id = ${patientId}`)).map((a) => String(a.code));
  //  ما يحفظه النظامُ عن المريض ومَن معه خارجَ صفّه: رقمُ الجنسية واسمُ المرافق («استمارة استرداد مبلغ»)، والكفيلُ وهاتفُه (الأقساط).
  const refunds = rows(await ex.execute(sql`SELECT companion_name, national_id FROM patient_refund_requests WHERE patient_id = ${patientId}`));
  const guarantors = rows(await ex.execute(sql`SELECT guarantor_name, guarantor_phone FROM installment_plans WHERE patient_id = ${patientId}`));
  const ids = patientIdentifierSet({ name: p.name, phones: [p.phone, p.phone_e164, ...guarantors.map((g) => g.guarantor_phone)], patientCode: p.patient_code,
    nationalIds: refunds.map((r) => r.national_id), companionNames: [...refunds.map((r) => r.companion_name), ...guarantors.map((g) => g.guarantor_name)] });
  for (const a of aliases) { ids.exact.push(a.toLowerCase()); const d = a.replace(/\D/g, ""); if (d.length >= 4) ids.digitRuns.push(d); }
  return ids;
}

/** الممنوعُ بقرار المعتمِدين على هذه المعاينة (ترحيل ١٩٩) — رموزُ أجهزةٍ معروفة. */
export interface ApproverConstraint { examIsThis: boolean; decidedAt: string | null; note: string; flags: { question: string; action: string }[]; forbiddenDevices: string[] }

export async function approverConstraints(ex: any, patientId: number, examId: number, ids: IdentifierSet): Promise<ApproverConstraint[]> {
  const r = rows(await ex.execute(sql`
    SELECT rv.* FROM physio_exam_red_flag_reviews rv JOIN medical_exams me ON me.id = rv.exam_id
     WHERE rv.patient_id = ${patientId} AND rv.status = 'approved' AND me.case_type = 'physiotherapy'
       AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = rv.exam_id)
     ORDER BY rv.decided_at, rv.id`));
  return r.map((x) => ({
    examIsThis: Number(x.exam_id) === examId, decidedAt: x.decided_at ? new Date(x.decided_at).toISOString() : null,
    note: redactAuthoredText(x.decision_note ?? "", ids),
    flags: (Array.isArray(x.flags) ? x.flags : []).map((f: any) => ({ question: String(f.questionAr ?? ""), action: String(f.actionAr ?? "") })),
    forbiddenDevices: Array.isArray(x.forbidden_devices) ? x.forbidden_devices.map(String) : [],
  }));
}

/** **الممنوعُ كلُّه**: المعاينةُ (`forbiddenDevices`) ثمّ ما أضافه المعتمِدون على هذه المعاينة. */
export function forbiddenOf(exam: ExamRow, constraints: readonly ApproverConstraint[], today: string): GateForbidden[] {
  const fromExam = forbiddenDevices(readStoredAssessment(exam.assessment), { today });
  const approver = constraints.filter((c) => c.examIsThis).flatMap((c) => c.forbiddenDevices.map((d) => ({ deviceCode: d, reasonAr: `بقرار المعتمِد: ${c.note.slice(0, 200)}` })));
  return mergeForbidden(fromExam, approver);
}

export async function knownDeviceCodes(ex: any): Promise<Set<string>> {
  return new Set(rows(await ex.execute(sql`SELECT code FROM devices WHERE is_active`)).map((r) => String(r.code)));
}
export async function branchDeviceCodes(ex: any, branchId: number): Promise<Set<string>> {
  return new Set(rows(await ex.execute(sql`
    SELECT d.code FROM physio_device_branches b JOIN devices d ON d.id = b.device_id
     WHERE b.branch_id = ${branchId} AND b.available AND d.is_active`)).map((r) => String(r.code)));
}

/** **فهرسُ المكتبة** — كلُّ بروتوكولٍ غيرِ مؤرشف، **إلّا مسوّدات Opus غيرَ المعتمَدة** (لا يبني Opus على اقتراحه الذي لم يُعتمد). */
export async function libraryIndex(ex: any) {
  const r = rows(await ex.execute(sql`
    SELECT p.id, p.code, p.title_en, p.title_ar, p.category, p.age_group, p.status, p.total_sessions, p.max_total_sessions, p.sessions_per_week,
           p.session_minutes, p.summary_en, p.origin,
           (SELECT count(*)::int FROM physio_protocol_phases ph WHERE ph.protocol_id = p.id) AS phases
      FROM physio_protocols p
     WHERE NOT p.is_archived AND NOT (p.origin = 'opus' AND p.status <> 'approved')
     ORDER BY p.id`));
  return r.map((p) => ({
    id: Number(p.id), code: String(p.code), titleEn: String(p.title_en ?? ""), titleAr: String(p.title_ar ?? ""), category: p.category, ageGroup: p.age_group,
    status: p.status, totalSessions: p.total_sessions, sessionsPerWeek: p.sessions_per_week, sessionMinutes: p.session_minutes,
    ceiling: protocolSessionCeiling({ totalSessions: p.total_sessions, maxTotalSessions: p.max_total_sessions }), phases: Number(p.phases),
    summaryEn: clip(p.summary_en, 400),
  }));
}

/** البروتوكولُ كما تقرؤه البوّابة — أجهزتُه بنصّ الخطّة المنسوخ ومراحلُه وتمارينُها. */
export async function loadGateProtocol(ex: any, protocolId: number | null): Promise<GateProtocol | null> {
  if (!protocolId) return null;
  const p = rows(await ex.execute(sql`SELECT * FROM physio_protocols WHERE id = ${protocolId}`))[0];
  if (!p) return null;
  const devs = rows(await ex.execute(sql`
    SELECT l.*, d.code FROM physio_protocol_devices l JOIN devices d ON d.id = l.device_id WHERE l.protocol_id = ${protocolId} ORDER BY l.display_order, l.id`));
  const phases = rows(await ex.execute(sql`SELECT * FROM physio_protocol_phases WHERE protocol_id = ${protocolId} ORDER BY position`));
  const links = phases.length ? rows(await ex.execute(sql`
    SELECT * FROM physio_protocol_phase_exercises WHERE phase_id IN (${sql.join(phases.map((x) => sql`${x.id}`), sql`, `)}) ORDER BY position, id`)) : [];
  return {
    id: Number(p.id), code: String(p.code), status: String(p.status), origin: String(p.origin ?? "library"), isArchived: Boolean(p.is_archived),
    totalSessions: p.total_sessions ?? null, maxTotalSessions: p.max_total_sessions ?? null, sessionsPerWeek: p.sessions_per_week ?? null,
    sessionMinutes: p.session_minutes ?? null,
    devices: devs.map((l) => {
      const line = { deviceId: l.device_id, minutes: l.minutes, params: l.params ?? {}, parameters: l.parameters, parametersEn: l.parameters_en,
        note: l.note, noteEn: l.note_en, centreUse: l.centre_use, evidence: l.evidence, everyDays: l.every_days, times: l.times };
      const pl = planLineFromProtocol(line, String(l.code));
      return { deviceCode: String(l.code), centreUse: centreUseOf(line), evidence: String(l.evidence), minutes: l.minutes ?? null,
        everyDays: l.every_days ?? null, times: l.times ?? null, params: (l.params ?? {}) as Record<string, string>,
        parameters: pl.parameters, parametersEn: pl.parametersEn, note: l.note ?? null, noteEn: l.note_en ?? null };
    }),
    phases: phases.map((ph) => ({
      position: Number(ph.position), nameAr: ph.name_ar, nameEn: ph.name_en, sessionFrom: ph.session_from ?? null, sessionTo: ph.session_to ?? null,
      timeframe: ph.timeframe ?? null, timeframeEn: ph.timeframe_en ?? null, goals: ph.goals ?? null, goalsEn: ph.goals_en ?? null,
      education: ph.education ?? null, educationEn: ph.education_en ?? null, progressCriteria: ph.progress_criteria ?? null,
      progressCriteriaEn: ph.progress_criteria_en ?? null, notes: ph.notes ?? null, notesEn: ph.notes_en ?? null,
      exercises: links.filter((l) => Number(l.phase_id) === Number(ph.id)).map((l) => ({
        exerciseId: Number(l.exercise_id), sets: l.sets ?? null, reps: l.reps ?? null, holdSeconds: l.hold_seconds ?? null, restSeconds: l.rest_seconds ?? null,
        doseNote: l.dose_note ?? null, doseNoteEn: l.dose_note_en ?? null, note: l.note ?? null, noteEn: l.note_en ?? null })),
    })),
  };
}

export async function exerciseMap(ex: any, ids: number[]): Promise<Map<number, GateExercise>> {
  const out = new Map<number, GateExercise>();
  const uniq = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  if (!uniq.length) return out;
  for (const r of rows(await ex.execute(sql`SELECT id, is_archived, status, kind, region FROM physio_exercises WHERE id IN (${sql.join(uniq.map((i) => sql`${i}`), sql`, `)})`))) {
    out.set(Number(r.id), { archived: Boolean(r.is_archived), status: String(r.status), kind: String(r.kind), region: String(r.region) });
  }
  return out;
}

/** تاريخُ المريض في العلاج الطبيعي — بلا أسماء موظّفين ولا نصوصٍ حرّةٍ غيرِ منقّاة. */
async function patientHistory(ex: any, patientId: number, examId: number, ids: IdentifierSet, today: string) {
  const plans = rows(await ex.execute(sql`
    SELECT pl.id, pl.status, pl.origin, pl.total_sessions, pl.created_at, pl.stopped_at, pl.stop_reason, pr.code AS protocol_code, pr.title_en AS protocol_title,
           (SELECT count(*)::int FROM physio_plan_sessions s WHERE s.plan_id = pl.id AND s.cancelled_at IS NULL) AS done
      FROM physio_plans pl LEFT JOIN physio_protocols pr ON pr.id = pl.protocol_id
     WHERE pl.patient_id = ${patientId} ORDER BY pl.created_at DESC LIMIT 10`));
  const planIds = plans.map((p) => Number(p.id));
  const assessments = planIds.length ? rows(await ex.execute(sql`
    SELECT plan_id, kind, assessed_on, pain, scores, decision FROM physio_assessments WHERE plan_id IN (${sql.join(planIds.map((i) => sql`${i}`), sql`, `)})
     ORDER BY assessed_on DESC, id DESC`)) : [];
  const exams = rows(await ex.execute(sql`
    SELECT me.id, me.signed_at, me.diagnosis, me.assessment FROM medical_exams me
     WHERE me.patient_id = ${patientId} AND me.case_type = 'physiotherapy' AND me.id <> ${examId}
       AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = me.id)
     ORDER BY me.signed_at DESC NULLS LAST, me.id DESC LIMIT 5`));
  return {
    previousPlans: plans.map((p) => ({
      status: p.status, origin: p.origin, protocolCode: p.protocol_code ?? null, protocolTitleEn: p.protocol_title ?? null, totalSessions: p.total_sessions,
      sessionsDone: Number(p.done), createdOn: p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : null,
      stoppedOn: p.stopped_at ? new Date(p.stopped_at).toISOString().slice(0, 10) : null, stopReason: p.stop_reason ? redactAuthoredText(clip(p.stop_reason, 300), ids) : null,
      assessments: assessments.filter((a) => Number(a.plan_id) === Number(p.id)).slice(0, 3).map((a) => ({
        kind: a.kind, on: String(a.assessed_on).slice(0, 10), pain: a.pain, decision: a.decision,
        scores: (Array.isArray(a.scores) ? a.scores : []).slice(0, 12).map((s: any) => ({ code: s?.code ?? null, value: s?.value ?? null })),
      })),
    })),
    priorExams: exams.map((e) => {
      const a = readStoredAssessment(e.assessment);
      return { signedOn: e.signed_at ? new Date(e.signed_at).toISOString().slice(0, 10) : null, form: (a as any)?.form ?? null,
        diagnosis: redactAuthoredText(clip(e.diagnosis, 300), ids), forbidden: forbiddenDevices(a, { today }).map((f) => f.deviceCode) };
    }),
  };
}

function datesOf(a: PhysioExamV2 | null, today: string) {
  const core = (a?.core ?? {}) as Record<string, any>;
  const weeks = (d: unknown) => {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
    const ms = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`);
    return Number.isFinite(ms) ? Math.floor(ms / (7 * 86400000)) : null;
  };
  return {
    today, weeksSinceOnset: core.onsetKind === "date" ? weeks(core.onsetDate) : null, weeksSinceSurgery: core.surgery === "yes" ? weeks(core.surgeryDate) : null,
    correctedAgeMonths: typeof core.correctedAgeMonths === "number" ? core.correctedAgeMonths : null,
    acuity: a ? examV2Acuity(core, today)?.en ?? null : null,
  };
}

/**
 * **ما في النصّ الحرّ ويخالف ورقةَ السلامة** (§4.hd) — القاعدةُ في `shared/physio_exam_text_safety.ts` (تطبيعٌ عربيّ، ونفيٌ قريب، وتأكيدُ الفاحص):
 * في التشخيص والشكوى والموجودات والملاحظات **وأجوبةِ أسئلة Bionic AI النصّية**. وما لم يؤكّده الفاحص بوّابةٌ مانعة (`exam_text_safety_conflict`).
 */
export function textSafetyHits(a: unknown, texts: (string | null | undefined)[]): { key: string; term: string; acknowledged: boolean }[] {
  return textSafetyHitsOf(a, texts).map((h) => ({ key: h.key, term: h.term, acknowledged: h.acknowledged }));
}
/** النصوصُ التي تُفحص: المعاينةُ وأجوبةُ الأسئلة النصّية. */
export const examSafetyTexts = (exam: Pick<ExamRow, "diagnosis" | "chiefComplaint" | "clinicalFindings" | "notes">, qa: readonly QaRound[] = []): (string | null)[] =>
  [exam.diagnosis, exam.chiefComplaint, exam.clinicalFindings, exam.notes, ...qa.flatMap((r) => (r.answers ?? []).map((x) => x.answer ?? null))];

/** أجوبةُ وظائفَ سابقة على هذه المعاينة نفسِها (أُلغيت بتعديل المعاينة) — بياناتٌ للكاتب، وكلُّ خانةٍ كُتبت بجواب: أما زالت في المعاينة؟ */
async function earlierAnswersOfExam(ex: any, examId: number, beforeJobId: number | null, a: unknown, ids: IdentifierSet) {
  if (!beforeJobId) return [];
  const list = rows(await ex.execute(sql`SELECT id, qa FROM physio_agent_jobs WHERE exam_id = ${examId} AND kind <> 'revise' AND id < ${beforeJobId}
     AND jsonb_array_length(COALESCE(qa, '[]'::jsonb)) > 0 ORDER BY id`));
  const now = isExamV2(a) ? a : null;
  const cur = (key: string) => { const [p, k] = key.split("."); return p === "core" ? now?.core?.[k] : now?.module?.[k]; };
  return list.flatMap((j) => (Array.isArray(j.qa) ? j.qa : []).map((r: any) => ({
    round: r.round, at: r.at, earlierJob: true,
    answers: (Array.isArray(r.answers) ? r.answers : []).map((x: any) => ({ id: x.id, questionAr: x.questionAr, affects: x.affects,
      answer: redactAuthoredText(String(x.answer ?? ""), ids),
      ...(x.fields ? { fields: Object.fromEntries(Object.entries(x.fields).map(([k, v]) => [k,
        { value: v, stillInExam: JSON.stringify(cur(k) ?? null) === JSON.stringify(v ?? null) }])) } : {}) })),
  })));
}

export interface AgentContext {
  exam: ExamRow; fingerprint: string; ids: IdentifierSet; today: string;
  /** §4.hd — الإصدارُ الثالث: ما يُسأل عنه ولماذا (يحكم به `ask_questions` و`submit_plan` في الكاتب). */
  v3: boolean; askable: Set<string>; mustAsk: string[];
  forbidden: GateForbidden[]; constraints: ApproverConstraint[];
  library: Awaited<ReturnType<typeof libraryIndex>>; knownDevices: Set<string>; branchDevices: Set<string>;
  initialUser: string;
  /** §4.hb — «كتلةُ التعديل» من الخادم: آخرُ كتلة نصٍّ في الرسالة الأولى وحدها (والملاحظةُ منقّاة). */
  revisionBlock: string | null;
  /** كائنُ «التعديل» منقّىً في العمق — للمراجع والمدقّق. */
  revisionRedacted: Record<string, unknown> | null;
}

/** ما يقوله الخادمُ لـ Opus في وظيفة «تعديل» بدل مهمّة الكتابة. */
export const REVISION_TASK_LINE = "Revise the existing plan as instructed by the REVISION block.";
export interface RevisionForContext {
  scope: "return" | "amend"; note: string; obj: Record<string, unknown>;
  priorAnswers: { round: number; at: string; examId: number; sameExamAsContext: boolean; answers: { id: string; questionAr: string; affects: string; answer: string }[] }[];
  forbidden: { deviceCode: string; reasonAr: string; source: "exam" | "approver" }[];
}
export function revisionBlockText(scope: string, note: string): string {
  return `<<REVISION BLOCK — issued by the server>>\nscope: ${scope}\nnote: ${note}\n<<END REVISION BLOCK>>`;
}

/** **السياقُ كلُّه** ورسالةُ المستخدم الأولى JSON بمفاتيحَ ثابتة. */
export async function buildAgentContext(job: { id?: number; patientId: number; examId: number; branchId: number; qa: QaRound[]; questionRounds: number }, ex: any = db,
  web: { searches: number; fetches: number } = { searches: 0, fetches: 0 }, revision: RevisionForContext | null = null): Promise<AgentContext> {
  const exam = await loadExam(ex, job.examId);
  if (!exam) throw new Error("exam not found");
  const today = baghdadTodayYmd();
  const ids = await patientIds(ex, job.patientId);
  const a = readStoredAssessment(exam.assessment);
  const v2 = isExamV2(a) ? a : null;
  const constraints = await approverConstraints(ex, job.patientId, exam.id, ids);
  //  §4.hb D10 — في «التعديل» الممنوعُ اتّحادُ المعاينة وكلِّ ما منعه المعتمِدون للمريض (وما منعه في النسخة النافذة).
  const forbidden = revision ? revision.forbidden.map((f) => ({ deviceCode: f.deviceCode, reasonAr: f.reasonAr, source: f.source })) : forbiddenOf(exam, constraints, today);
  const library = await libraryIndex(ex);
  const knownDevices = await knownDeviceCodes(ex);
  const branchDevices = await branchDeviceCodes(ex, job.branchId);
  const devs = rows(await ex.execute(sql`SELECT code, name_en, name_ar FROM devices WHERE is_active ORDER BY display_order`));
  const core = (v2?.core ?? {}) as Record<string, any>;
  const cond = v2 ? conditionOf(core.group, (v2.module ?? {} as any).condition) : null;
  const mod = v2 ? moduleOf(core.group) : null;
  const hint = cond?.protocols?.length ? cond.protocols : mod?.protocols ?? [];
  const p = rows(await ex.execute(sql`SELECT age, weight, height FROM patients WHERE id = ${job.patientId}`))[0] ?? {};
  const num = (v: unknown) => { const n = Number(String(v ?? "").replace(/[^\d.]/g, "")); return Number.isFinite(n) && n > 0 ? n : null; };
  const history = await patientHistory(ex, job.patientId, exam.id, ids, today);
  const examText = redactAuthoredText(anyAssessmentEnglishText(a, { today }) ?? "", ids);
  const v3 = isExamV2(a) && examRuleset(a) === "v3";
  const askableFields = v3 ? examAskableFields(a) : [];
  const mustAsk = v3 && !revision ? examMustAskBeforePlan(a) : [];
  const earlier = !revision && v3 ? await earlierAnswersOfExam(ex, exam.id, job.id ?? null, a, ids) : [];
  const payload: Record<string, unknown> = {
    task: revision ? REVISION_TASK_LINE : "Write one physiotherapy treatment plan for this patient from the signed examination below.",
    today,
    patient: { ageYearsFile: num(p.age), ageYearsExam: core.ageYears ?? null, sex: core.sex ?? null, weightKg: core.weightKg ?? num(p.weight),
      heightCm: num(p.height), pregnant: core.pregnant ?? null, breastfeeding: core.breastfeeding ?? null },
    dates: datesOf(v2, today),
    exam: {
      form: (a as any)?.form ?? null, signedAt: exam.signedAt, diagnosis: redactAuthoredText(clip(exam.diagnosis, 4000), ids),
      chiefComplaint: redactAuthoredText(clip(exam.chiefComplaint, 4000), ids), clinicalFindings: redactAuthoredText(clip(exam.clinicalFindings, 4000), ids),
      plan: redactAuthoredText(clip(exam.plan, 4000), ids), notes: redactAuthoredText(clip(exam.notes, 4000), ids), text: examText,
      conditionGroup: core.group ?? null, condition: (v2?.module as any)?.condition ?? null, suggestedProtocolCodes: hint,
      ...(v3 ? {
        ruleset: "v3", groupConfirmed: examGroupConfirmed(a), gateInputsMissing: examGateInputsMissing(a), cautionInputsMissing: examCautionInputsMissing(a),
        askableFields, textSafetyHits: textSafetyHits(a, examSafetyTexts(exam, job.qa)),
      } : {}),
    },
    constraints: {
      forbiddenDevices: forbidden.map((f) => ({ deviceCode: f.deviceCode, deviceNameEn: devs.find((d) => d.code === f.deviceCode)?.name_en ?? f.deviceCode,
        reasonAr: f.reasonAr, source: f.source })),
      approverConstraints: constraints,
    },
    history,
    //  الأجوبةُ نصٌّ كتبه موظّفٌ — تُنقّى كغيرها، **ولا اسمَ لمن أجاب**.
    //  §4.hb — في «التعديل» أجوبةُ سلسلة الوظائف السابقة (ما أُجيب على معاينةٍ أقدم يُقال إنّه قد يكون قديماً).
    qa: revision
      ? revision.priorAnswers.map((r) => ({ round: r.round, at: r.at, sameExamAsContext: r.sameExamAsContext,
        ...(r.sameExamAsContext ? {} : { note: "answered on an earlier exam — may be outdated (DATA)" }),
        answers: r.answers.map((a) => ({ id: a.id, questionAr: a.questionAr, affects: a.affects, answer: redactAuthoredText(a.answer, ids) })) }))
      : job.qa.map((r) => ({ round: r.round, at: r.at, answers: r.answers.map((a) => ({ id: a.id, questionAr: a.questionAr, affects: a.affects,
        answer: redactAuthoredText(a.answer, ids), ...(a.fields ? { fields: a.fields, writtenToExamVersion: a.examVersion ?? r.examVersion ?? null } : {}) })) })),
    ...(earlier.length ? { earlierAnswers: { note: "Answers given to earlier jobs on this same examination (DATA). The examination wins over any earlier answer: a field whose stillInExam is false was changed by the examiner.", rounds: earlier } } : {}),
    library: { protocols: library, lists: { exerciseKinds: EXERCISE_KINDS, bodyRegions: BODY_REGIONS, protocolCategories: PROTOCOL_CATEGORIES, ageGroups: AGE_GROUPS } },
    branch: { devices: devs.map((d) => ({ code: d.code, nameEn: d.name_en, nameAr: d.name_ar ?? V2_DEVICE_NAMES[d.code] ?? d.code, availableInBranch: branchDevices.has(String(d.code)) })) },
    btlCatalog: btlCatalogForModel(),
    rules: revision
      ? { questionsAvailable: false, webBudget: { searches: WEB_SEARCH_BUDGET, fetches: WEB_FETCH_BUDGET, used: web, reached: web.searches >= WEB_SEARCH_BUDGET || web.fetches >= WEB_FETCH_BUDGET } }
      : { maxQuestionRounds: MAX_QUESTION_ROUNDS, roundsUsed: job.questionRounds, ...(v3 ? { mustAskBeforeSubmit: mustAsk } : {}),
        webBudget: { searches: WEB_SEARCH_BUDGET, fetches: WEB_FETCH_BUDGET, used: web, reached: web.searches >= WEB_SEARCH_BUDGET || web.fetches >= WEB_FETCH_BUDGET } },
  };
  const revisionRedacted = revision ? redactDeep(revision.obj, ids) : null;
  if (revisionRedacted) payload.revision = revisionRedacted;
  return { exam, fingerprint: fingerprintOf(exam), ids, today, v3, askable: new Set(askableFields.map((f) => f.key)), mustAsk, forbidden, constraints, library, knownDevices, branchDevices, initialUser: JSON.stringify(payload),
    revisionBlock: revision ? revisionBlockText(revision.scope, redactAuthoredText(revision.note, ids)) : null, revisionRedacted };
}

/** سياقُ البوّابة — يُعاد بناؤه طازجاً قبل كلّ تطبيق (البوّابةُ والممنوعُ والتوفّرُ تتغيّر). */
export async function buildGateContext(ex: any, p: { patientId: number; examId: number; branchId: number; protocolId: number | null;
  exerciseIds: number[]; fetched: Set<string>; searched: Set<string>; final: boolean; at?: string; agentGate: GateContext["agentGate"]; qa?: readonly QaRound[] }): Promise<GateContext> {
  const exam = await loadExam(ex, p.examId);
  const today = baghdadTodayYmd();
  const ids = await patientIds(ex, p.patientId);
  const constraints = exam ? await approverConstraints(ex, p.patientId, p.examId, ids) : [];
  const protocol = await loadGateProtocol(ex, p.protocolId);
  const exIds = [...p.exerciseIds, ...(protocol?.phases.flatMap((ph) => ph.exercises.map((x) => x.exerciseId)) ?? [])];
  return {
    agentGate: p.agentGate, forbidden: exam ? forbiddenOf(exam, constraints, today) : [],
    knownDeviceCodes: await knownDeviceCodes(ex), branchAvailable: await branchDeviceCodes(ex, p.branchId),
    protocol, exercises: await exerciseMap(ex, exIds), fetchedUrls: p.fetched, searchedUrls: p.searched,
    libraryIds: new Set((await libraryIndex(ex)).map((l) => l.id)), ids, final: p.final, at: p.at,
    examConfirm: exam && isExamV2(readStoredAssessment(exam.assessment)) && examRuleset(readStoredAssessment(exam.assessment)) === "v3"
      ? { exam: readStoredAssessment(exam.assessment), texts: examSafetyTexts(exam, p.qa ?? []) } : null,
  };
}
