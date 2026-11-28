// **اعتمادُ العلامة الحمراء في معاينة العلاج الطبيعي** (ترحيل ١٩٨، §4.gz — قرارُ المالك ٢٠٢٦-١١-٢٧) — طبقةُ البيانات.
//
// المعاينةُ مختومة (ترحيل ٠٢٨): **لا يُكتب صفُّ `medical_exams` هنا أبداً** — قراءةٌ وقفلٌ وحدهما. والطلبُ وقرارُه صفٌّ مستقلّ،
// وكلُّ كتابةٍ بسطر تدقيقٍ في معاملتها (`logAudit` بـ`tx`: سقوطُ التدقيق يُسقط القرار)، وتنبيهُ تلغرام في المعاملة نفسِها.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { enqueueStaffEvent } from "../staff_telegram/outbox";
import { isExamCancelled } from "../medical/active_exam";
import { lockPatientAgent } from "../physio_agent/store";
import { reconcilePatientJobs, nudgeWorkerNow } from "../physio_agent/reconcile";
import { signalJob } from "../physio_agent/store";
import {
  agentGateFor, examV2Missing, isExamV2, newestOtherExamReview, redFlagsOf, RED_FLAG_URGENCY_AR, type AgentGate, type RedFlagReviewSummary,
} from "@shared/physio_exam_v2";

export class ReviewError extends Error {
  constructor(public status: number, message: string, public code: string) { super(message); }
}

export interface ReviewActor { userId: number | null; name: string | null; isApprover: boolean; ip: string | null; userAgent: string | null }

const NOTE_MAX = 2000;
export const cleanNote = (v: unknown): string => (typeof v === "string" ? v.trim().slice(0, NOTE_MAX) : "");

const iso = (v: unknown): string | null => (v ? new Date(v as any).toISOString() : null);
function summaryOf(r: Record<string, any>): RedFlagReviewSummary {
  return {
    id: Number(r.id), status: r.status, flags: Array.isArray(r.flags) ? r.flags : [],
    examinerNote: r.examiner_note ?? null, decisionNote: r.decision_note ?? null,
    requestedById: r.requested_by == null ? null : Number(r.requested_by),
    requestedByName: r.requested_by_name ?? null, requestedAt: iso(r.requested_at),
    decidedByName: r.decided_by_name ?? null, decidedAt: iso(r.decided_at),
  };
}

interface ExamRow {
  id: number; patientId: number; branchId: number | null; caseType: string; doctorId: number | null; doctorName: string; assessment: unknown; diagnosis: string | null;
  /** فرعُ تسجيل المريض (`patients.branch_id`) — به يُفحص النطاق، لا بفرع المعاينة. */
  patientBranchId: number | null;
}
async function examRow(ex: any, examId: number, lock = false): Promise<ExamRow | null> {
  //  **قفلٌ لا كتابة** — `FOR UPDATE OF me` على المعاينة المختومة يُسلسل طلبَين على المعاينة نفسِها ولا يمسّ الختم (الترِكر على UPDATE وحده).
  const cols = sql`SELECT me.id, me.patient_id, me.branch_id, me.case_type, me.doctor_id, me.doctor_name, me.assessment, me.diagnosis,
                          p.branch_id AS patient_branch_id
                     FROM medical_exams me LEFT JOIN patients p ON p.id = me.patient_id WHERE me.id = ${examId}`;
  const r = await ex.execute(lock ? sql`${cols} FOR UPDATE OF me` : cols);
  const e = (r.rows ?? [])[0] as Record<string, any> | undefined;
  if (!e) return null;
  return {
    id: Number(e.id), patientId: Number(e.patient_id), branchId: e.branch_id == null ? null : Number(e.branch_id), caseType: String(e.case_type),
    doctorId: e.doctor_id == null ? null : Number(e.doctor_id), doctorName: String(e.doctor_name ?? ""), assessment: e.assessment, diagnosis: e.diagnosis ?? null,
    patientBranchId: e.patient_branch_id == null ? null : Number(e.patient_branch_id),
  };
}

/**
 * **آخرُ طلبٍ لكلّ معاينة علاجٍ طبيعيّ حيّة للمريض** (بلا الملغاة وبلا ما بُدّل اختصاصُه) — به تُحسب البوّابةُ على مستوى المريض:
 * المعلَّقُ أو المرفوضُ الأحدثُ على معاينةٍ أخرى يوقف هذه (`newestOtherExamReview`).
 */
async function liveReviewsOfPatient(ex: any, patientId: number): Promise<Map<number, RedFlagReviewSummary>> {
  const r = await ex.execute(sql`
    SELECT DISTINCT ON (rv.exam_id) rv.* FROM physio_exam_red_flag_reviews rv
      JOIN medical_exams me ON me.id = rv.exam_id
     WHERE rv.patient_id = ${patientId} AND me.case_type = 'physiotherapy'
       AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = rv.exam_id)
     ORDER BY rv.exam_id, rv.id DESC`);
  const out = new Map<number, RedFlagReviewSummary>();
  for (const row of (r.rows ?? []) as Record<string, any>[]) out.set(Number(row.exam_id), summaryOf(row));
  return out;
}

/** آخرُ طلبٍ لكلّ معاينة — به تقول البطاقةُ حالَها وتحكم البوّابة. */
export async function latestReviews(examIds: number[], ex: any = db): Promise<Map<number, RedFlagReviewSummary>> {
  const out = new Map<number, RedFlagReviewSummary>();
  if (!examIds.length) return out;
  const r = await ex.execute(sql`
    SELECT DISTINCT ON (exam_id) * FROM physio_exam_red_flag_reviews
     WHERE exam_id IN (${sql.join(examIds.map((id) => sql`${id}`), sql`, `)})
     ORDER BY exam_id, id DESC`);
  for (const row of (r.rows ?? []) as Record<string, any>[]) out.set(Number(row.exam_id), summaryOf(row));
  return out;
}

/**
 * **بوّابةُ الوكيل لمعاينة** — تقرؤها المراحلُ اللاحقة قبل أيّ نداءٍ للوكيل: مسموحٌ حين تكون الثانيةَ كاملةً و(بلا علامةٍ حمراء أو
 * باعتمادٍ يغطّيها). قراءةٌ محضة بلا أثر.
 */
export async function examAgentGate(examId: number, ex: any = db): Promise<AgentGate & { examId: number; decisionNote: string | null }> {
  //  `ex` معاملةُ المُستدعي (§4.ha): وكيلُ Opus يقرّر داخل معاملته المقفولة لا بقراءةٍ قبلها.
  const e = await examRow(ex, examId);
  if (!e || e.caseType !== "physiotherapy") return { examId, allowed: false, code: "not_v2", reason: "ليست معاينةَ علاجٍ طبيعيّ", decisionNote: null };
  const review = (await latestReviews([examId], ex)).get(examId) ?? null;
  const otherExamReview = newestOtherExamReview(await liveReviewsOfPatient(ex, e.patientId), examId);
  const gate = agentGateFor({ assessment: e.assessment, diagnosis: e.diagnosis ?? "", cancelled: await isExamCancelled(examId, ex), review, otherExamReview });
  return { ...gate, examId, decisionNote: gate.allowed && review?.status === "approved" ? review.decisionNote : null };
}

async function patientLabel(ex: any, patientId: number, branchId: number | null): Promise<string> {
  const r = await ex.execute(sql`
    SELECT p.name, p.patient_code, b.name AS branch FROM patients p LEFT JOIN branches b ON b.id = ${branchId ?? 0} WHERE p.id = ${patientId}`);
  const p = (r.rows ?? [])[0] as Record<string, any> | undefined;
  return `${p?.name ?? `#${patientId}`}${p?.patient_code ? ` (${p.patient_code})` : ""}${p?.branch ? ` — ${p.branch}` : ""}`;
}
/** نصُّ تلغرام القرار — للفاحص ولمن أرسلها. */
const decidedText = (status: "approved" | "rejected", who: string, note: string, by: string | null) => status === "approved"
  ? `✅ اعتُمدت العلامةُ الحمراء في المعاينة: ${who}\nملاحظةُ الاعتماد: ${note}${by ? `\n— ${by}` : ""}`
  : `⛔ رُفضت العلامةُ الحمراء في المعاينة: ${who}\nتتوقّف المعاينةُ والإحالةُ قائمة.\nالملاحظة: ${note}${by ? `\n— ${by}` : ""}`;
const flagsText = (flags: RedFlagReviewSummary["flags"]) =>
  flags.map((f) => `• ${f.questionAr.slice(0, 140)}\n  الإجراء: ${f.actionAr} (${RED_FLAG_URGENCY_AR[f.urgency as keyof typeof RED_FLAG_URGENCY_AR] ?? f.urgency})`).join("\n");

/**
 * **«أرسل للاعتماد»** — بيد كاتب المعاينة أو معتمِد، وبملاحظةٍ إلزامية، وحين في المعاينة علامةٌ «نعم» وحدها.
 * **ومعتمِدٌ يقرّر في الخطوة نفسِها** (`decision` + `decisionNote` إلزامية) — قرارُ المالك: «إن كان الفاحصُ معتمِداً كفى اعتمادُه»:
 *   • الفاحصُ المعتمِد: ملاحظتُه فاحصاً (إلزامية) وملاحظةُ قراره؛
 *   • ومعتمِدٌ على معاينة غيره: **قرارٌ مباشر بملاحظة القرار وحدها** — لا يكتب «ملاحظةَ الفاحص» عن غيره (`examiner_note` فارغ)،
 *     ويصل الفاحصَ القرارُ في تلغرام (مراجعةُ المرحلة الأولى). وبه يُرفع الرفض: المرفوضُ لا يُطلب ثانيةً إلّا بيد معتمِد —
 *     ولو مُحيت علاماتُه بعد الرفض (فالبوّابةُ لا تفتح بمحوها).
 */
/** أجهزةٌ يمنعها المعتمِدُ باعتماده (ترحيل ١٩٩، §4.ha) — رموزُ أجهزةٍ نشطةٍ معروفة، بلا تكرار؛ وغيرُ المعروف ٤٠٠. */
async function cleanForbiddenDevices(ex: any, raw: unknown): Promise<string[]> {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > 20) throw new ReviewError(400, "قائمةُ الأجهزة الممنوعة غير صالحة", "forbidden_devices_invalid");
  const codes = Array.from(new Set(raw.map((x) => String(x ?? "").trim()).filter(Boolean)));
  if (!codes.length) return [];
  const r = await ex.execute(sql`SELECT code FROM devices WHERE is_active AND code IN (${sql.join(codes.map((c) => sql`${c}`), sql`, `)})`);
  const known = new Set(((r.rows ?? []) as any[]).map((x) => String(x.code)));
  if (codes.some((c) => !known.has(c))) throw new ReviewError(400, "جهازٌ غيرُ معروف في قائمة الممنوع", "forbidden_devices_invalid");
  return codes;
}

/** بعد كلّ طلبٍ أو قرار: المصالحةُ في المعاملة (فتحُ وظيفةٍ أو إلغاؤها)، والتنبيهُ بعد الالتزام. */
async function reconcileInTx(tx: any, patientId: number, actor: ReviewActor): Promise<() => Promise<void>> {
  const r = await reconcilePatientJobs(tx, patientId, { userId: actor.userId, name: actor.name, ip: actor.ip, userAgent: actor.userAgent }, "red_flag_approved");
  return async () => { if (r.enqueued) { nudgeWorkerNow(); await signalJob(r.enqueued); } };
}

export async function requestReview(input: {
  examId: number; actor: ReviewActor; examinerNote: unknown; decision?: unknown; decisionNote?: unknown; branchScopeOk: (e: ExamRow) => Promise<boolean>;
  forbiddenDevices?: unknown;
}): Promise<RedFlagReviewSummary> {
  const note = cleanNote(input.examinerNote);
  const decision = input.decision === undefined || input.decision === null || input.decision === "" ? null : input.decision;
  if (decision !== null && decision !== "approve" && decision !== "reject") throw new ReviewError(400, "القرارُ «اعتماد» أو «رفض»", "decision_invalid");
  if (decision !== null && !input.actor.isApprover) throw new ReviewError(403, "الاعتمادُ للمسؤول والمشرف العام وحدهما", "not_approver");
  const decisionNote = cleanNote(input.decisionNote);
  let after: (() => Promise<void>) | null = null;
  const out = await db.transaction(async (tx) => {
    //  **قفلُ المريض قبل قفل المعاينة** (§4.ha) — ترتيبُ الأقفال الواحد مع وكيل Opus.
    const pre = await examRow(tx, input.examId);
    if (pre) await lockPatientAgent(tx, pre.patientId);
    const e = await examRow(tx, input.examId, true);
    if (!e || e.caseType !== "physiotherapy") throw new ReviewError(404, "المعاينةُ غير موجودة", "exam_not_found");
    if (!(await input.branchScopeOk(e))) throw new ReviewError(403, "لا يمكنك العمل على معاينة فرعٍ آخر", "branch_scope");
    const isAuthor = e.doctorId !== null && e.doctorId === input.actor.userId;
    if (!isAuthor && !input.actor.isApprover) throw new ReviewError(403, "يرسل العلامةَ للاعتماد كاتبُ المعاينة أو المعتمِد", "not_examiner");
    //  قرارُ معتمِدٍ على معاينة غيره مباشرٌ: ملاحظةُ قراره وحدها، ولا «ملاحظةَ فاحص» تُنسب إليه.
    const direct = decision !== null && !isAuthor;
    if (await isExamCancelled(e.id, tx)) throw new ReviewError(409, "المعاينةُ ملغاة", "exam_cancelled");
    if (!isExamV2(e.assessment) || examV2Missing(e.assessment, e.diagnosis ?? "").length) {
      throw new ReviewError(409, "المعاينةُ ليست على الاستمارة الإلزامية كاملةً", "exam_incomplete");
    }
    const last = (await latestReviews([e.id], tx)).get(e.id) ?? null;
    const hits = redFlagsOf(e.assessment);
    //  **ورفعُ الرفض بيد معتمِد ولو مُحيت العلامات** — وإلّا بقيت المعاينةُ موقوفةً بلا باب.
    const liftingRejection = last?.status === "rejected" && input.actor.isApprover && decision !== null;
    if (!hits.length && !liftingRejection) throw new ReviewError(409, "لا علامةَ حمراء في هذه المعاينة", "no_red_flags");
    if (!direct && !note) throw new ReviewError(400, "ملاحظةُ الفاحص للمعتمِد إلزامية", "examiner_note_required");
    if (decision !== null && !decisionNote) throw new ReviewError(400, "ملاحظةُ الاعتماد إلزامية — يقرؤها Bionic AI قيداً على الخطّة", "decision_note_required");
    if (last?.status === "pending") throw new ReviewError(409, "طلبُ اعتمادٍ مفتوحٌ لهذه المعاينة", "review_pending");
    //  **المرفوضُ يوقفها حتى يطلب معتمِد** (قرارُ المالك: «لا تعود إلّا بموافقتك أو موافقة سليم»).
    if (last?.status === "rejected" && !input.actor.isApprover) {
      throw new ReviewError(403, "رُفضت العلامةُ الحمراء — لا تُرسَل ثانيةً إلّا بيد المسؤول أو المشرف العام", "rejected_needs_approver");
    }
    if (last?.status === "approved" && hits.length && hits.every((h) => last.flags.some((f) => f.key === h.key))) {
      throw new ReviewError(409, "اعتُمدت هذه العلاماتُ من قبل", "already_approved");
    }
    const flags = hits.map((h) => ({ key: h.key, questionAr: h.questionAr, actionAr: h.actionAr, urgency: h.urgency }));
    const status = decision === "approve" ? "approved" : decision === "reject" ? "rejected" : "pending";
    const forbidden = decision === "approve" ? await cleanForbiddenDevices(tx, input.forbiddenDevices) : [];
    const ins = await tx.execute(sql`
      INSERT INTO physio_exam_red_flag_reviews (exam_id, patient_id, branch_id, flags, status, examiner_note, decision_note,
             requested_by, requested_by_name, decided_by, decided_by_name, decided_at, forbidden_devices)
      VALUES (${e.id}, ${e.patientId}, ${e.branchId}, ${JSON.stringify(flags)}::jsonb, ${status}, ${direct ? null : note},
              ${decision ? decisionNote : null}, ${input.actor.userId}, ${input.actor.name},
              ${decision ? input.actor.userId : null}, ${decision ? input.actor.name : null}, ${decision ? sql`now()` : null},
              ${JSON.stringify(forbidden)}::jsonb)
      RETURNING *`);
    const row = summaryOf((ins.rows ?? [])[0] as Record<string, any>);
    await logAudit({
      entityType: "physio_exam_red_flag_review", entityId: row.id, action: decision ? `request_and_${decision}` : "request",
      userId: input.actor.userId, userName: input.actor.name, branchId: e.branchId,
      newValues: { examId: e.id, patientId: e.patientId, status, flags: flags.map((f) => f.key), examinerNote: direct ? null : note, decisionNote: decision ? decisionNote : null,
        ...(forbidden.length ? { forbiddenDevices: forbidden } : {}) },
      notes: decision
        ? direct
          ? `${decision === "approve" ? "اعتمد" : "رفض"} المعتمِدُ مباشرةً العلامةَ الحمراء في المعاينة #${e.id} (الفاحص: ${e.doctorName || "—"})`
            + (liftingRejection ? " — بعد رفضٍ سابق" : "")
          : `${decision === "approve" ? "اعتمد" : "رفض"} المعتمِدُ العلامةَ الحمراء في معاينته #${e.id} في الخطوة نفسِها`
        : `أرسل ${isAuthor ? "الفاحصُ" : "المعتمِدُ"} العلامةَ الحمراء في المعاينة #${e.id} للاعتماد`,
      ipAddress: input.actor.ip, userAgent: input.actor.userAgent, tx,
    });
    if (!decision) {
      await enqueueStaffEvent(tx, {
        event: "physio_exam_red_flag_pending", excludeUserId: input.actor.userId,
        text: [`🚩 علامةٌ حمراء تنتظر اعتمادك: ${await patientLabel(tx, e.patientId, e.branchId)}`,
          `الفاحص: ${e.doctorName || input.actor.name || ""}`, flagsText(flags),
          `${isAuthor ? "ملاحظةُ الفاحص" : `ملاحظةُ المرسِل (${input.actor.name ?? ""})`}: ${note}`].join("\n"),
        linkPath: "/physio/approvals",
      });
    } else if (direct && e.doctorId !== null) {
      //  **والفاحصُ يعلم بقرارٍ اتُّخذ على معاينته** — لا يبقى القرارُ عند صاحبه وحده.
      await enqueueStaffEvent(tx, {
        event: "physio_exam_red_flag_decided", targetUserIds: [e.doctorId], excludeUserId: input.actor.userId,
        text: decidedText(status as "approved" | "rejected", await patientLabel(tx, e.patientId, e.branchId), decisionNote, input.actor.name),
        linkPath: `/patients/${e.patientId}`,
      });
    }
    //  **وكيلُ Opus** (§4.ha): طلبٌ معلَّقٌ يوقف وظيفةَ المريض، واعتمادٌ يفتحها.
    after = await reconcileInTx(tx, e.patientId, input.actor);
    return row;
  });
  if (after) await (after as () => Promise<void>)();
  return out;
}

/** **قرارُ المعتمِد** — اعتمادٌ أو رفضٌ بملاحظةٍ إلزامية، على طلبٍ مفتوح وحده؛ والجوابُ لطالبه في تلغرام. */
export async function decideReview(input: { reviewId: number; actor: ReviewActor; decision: unknown; note: unknown; forbiddenDevices?: unknown }): Promise<RedFlagReviewSummary> {
  if (!input.actor.isApprover) throw new ReviewError(403, "الاعتمادُ للمسؤول والمشرف العام وحدهما", "not_approver");
  if (input.decision !== "approve" && input.decision !== "reject") throw new ReviewError(400, "القرارُ «اعتماد» أو «رفض»", "decision_invalid");
  const note = cleanNote(input.note);
  if (!note) throw new ReviewError(400, "ملاحظةُ الاعتماد إلزامية — يقرؤها Bionic AI قيداً على الخطّة", "decision_note_required");
  let after: (() => Promise<void>) | null = null;
  const out = await db.transaction(async (tx) => {
    const pre = ((await tx.execute(sql`SELECT patient_id FROM physio_exam_red_flag_reviews WHERE id = ${input.reviewId}`)).rows ?? [])[0] as any;
    if (pre) await lockPatientAgent(tx, Number(pre.patient_id));
    const cur = await tx.execute(sql`SELECT * FROM physio_exam_red_flag_reviews WHERE id = ${input.reviewId} FOR UPDATE`);
    const r = (cur.rows ?? [])[0] as Record<string, any> | undefined;
    if (!r) throw new ReviewError(404, "الطلبُ غير موجود", "review_not_found");
    if (r.status !== "pending") throw new ReviewError(409, "حُسم هذا الطلبُ من قبل", "review_decided");
    if (await isExamCancelled(Number(r.exam_id), tx)) throw new ReviewError(409, "المعاينةُ ملغاة", "exam_cancelled");
    const status = input.decision === "approve" ? "approved" : "rejected";
    const forbidden = status === "approved" ? await cleanForbiddenDevices(tx, input.forbiddenDevices) : [];
    const up = await tx.execute(sql`
      UPDATE physio_exam_red_flag_reviews
         SET status = ${status}, decision_note = ${note}, decided_by = ${input.actor.userId}, decided_by_name = ${input.actor.name}, decided_at = now(),
             forbidden_devices = ${JSON.stringify(forbidden)}::jsonb
       WHERE id = ${input.reviewId} AND status = 'pending' RETURNING *`);
    const row = summaryOf((up.rows ?? [])[0] as Record<string, any>);
    await logAudit({
      entityType: "physio_exam_red_flag_review", entityId: row.id, action: input.decision as string,
      userId: input.actor.userId, userName: input.actor.name, branchId: r.branch_id ?? null,
      oldValues: { status: "pending" }, newValues: { examId: Number(r.exam_id), status, decisionNote: note, ...(forbidden.length ? { forbiddenDevices: forbidden } : {}) },
      notes: `${status === "approved" ? "اعتُمدت" : "رُفضت"} العلامةُ الحمراء في المعاينة #${r.exam_id}`,
      ipAddress: input.actor.ip, userAgent: input.actor.userAgent, tx,
    });
    //  **والجوابُ لطالبه ولكاتب المعاينة معاً** — معتمِدٌ أرسلها عن الفاحص لا يحجب القرارَ عنه (مراجعةُ المرحلة الأولى).
    const doc = await tx.execute(sql`SELECT doctor_id FROM medical_exams WHERE id = ${Number(r.exam_id)}`);
    const doctorId = (doc.rows?.[0] as any)?.doctor_id;
    const targets = Array.from(new Set([r.requested_by, doctorId].filter((x) => x != null).map(Number)))
      .filter((id) => id !== input.actor.userId);
    if (targets.length) {
      await enqueueStaffEvent(tx, {
        event: "physio_exam_red_flag_decided", targetUserIds: targets, excludeUserId: input.actor.userId,
        text: decidedText(status, await patientLabel(tx, Number(r.patient_id), r.branch_id ?? null), note, input.actor.name),
        linkPath: `/patients/${r.patient_id}`,
      });
    }
    after = await reconcileInTx(tx, Number(r.patient_id), input.actor);
    return row;
  });
  if (after) await (after as () => Promise<void>)();
  return out;
}

/**
 * **المعاينةُ حيّةٌ في الطابور**: غيرُ ملغاة وما زالت علاجاً طبيعياً — طلبٌ على معاينةٍ أُلغيت (لا يُحسم: `exam_cancelled`) أو بُدّل
 * اختصاصُها لا يبقى في «اعتمادات العلاج الطبيعي» ولا في شارتها إلى الأبد (مراجعةُ المرحلة الأولى). ومَن أعادها علاجاً طبيعياً عاد طلبُه.
 */
const LIVE_EXAM = sql`me.case_type = 'physiotherapy' AND NOT EXISTS (SELECT 1 FROM medical_exam_cancellations c WHERE c.exam_id = rv.exam_id)`;

/** **ما ينتظر المعتمِد** — والمحسومُ للعلم (`decided`)، بالمريض والفرع والفاحص والعلامات. */
export async function listReviews(view: "pending" | "decided", limit = 100) {
  const r = await db.execute(sql`
    SELECT rv.*, p.name AS patient_name, p.patient_code, b.name AS branch_name, me.doctor_id AS examiner_id, me.doctor_name, me.signed_at, me.diagnosis
      FROM physio_exam_red_flag_reviews rv
      JOIN patients p ON p.id = rv.patient_id
      JOIN medical_exams me ON me.id = rv.exam_id
      LEFT JOIN branches b ON b.id = rv.branch_id
     WHERE ${view === "pending" ? sql`rv.status = 'pending'` : sql`rv.status <> 'pending'`}
       AND p.deleted_at IS NULL AND ${LIVE_EXAM}
     ORDER BY ${view === "pending" ? sql`rv.requested_at ASC` : sql`rv.decided_at DESC`}, rv.id
     LIMIT ${limit}`);
  return ((r.rows ?? []) as Record<string, any>[]).map((x) => ({
    ...summaryOf(x), examId: Number(x.exam_id), patientId: Number(x.patient_id), patientName: x.patient_name ?? null,
    patientCode: x.patient_code ?? null, branchId: x.branch_id == null ? null : Number(x.branch_id), branchName: x.branch_name ?? null,
    examinerId: x.examiner_id == null ? null : Number(x.examiner_id), examinerName: x.doctor_name ?? null, signedAt: iso(x.signed_at), diagnosis: x.diagnosis ?? null,
  }));
}

export async function pendingCount(): Promise<number> {
  const r = await db.execute(sql`
    SELECT count(*)::int AS n FROM physio_exam_red_flag_reviews rv JOIN patients p ON p.id = rv.patient_id
      JOIN medical_exams me ON me.id = rv.exam_id
     WHERE rv.status = 'pending' AND p.deleted_at IS NULL AND ${LIVE_EXAM}`);
  return Number(((r.rows ?? [])[0] as any)?.n ?? 0);
}
