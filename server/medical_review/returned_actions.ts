// **ما يفعله الاستعلاماتُ بطلبٍ أرجعه الطبيب** (§4.gu — قرارُ المالك ٢٠٢٦-١١-٢٢).
//
// المالك: «حين أعيد معاينة للاستعلامات يجب أن يتمكّن من إمّا إلغائها أو تحويل المريض من علاج طبيعي إلى أطراف أو بالعكس، لأن غالباً
// أسباب الإعادة هذه». وفي القسم القديم: «يُغلَق تلقائياً إن كان فارغاً، وإلّا يبقى كما هو ويُلغى طلبُه وحده».
//
// ثلاثةُ أبوابٍ هنا، وكلٌّ في معاملةٍ واحدة تحت قفل المريض (٩١٩) ثمّ صفّه ثمّ الطلب:
//   • `returnImplicitPhysioExam` — **إرجاعُ صفّ علاجٍ طبيعيٍّ بلا طلبٍ قطّ** (القاعدةُ ③ — مريضٌ جديد لم يُعايَن): يُكتب له طلبٌ
//     مُرجَعٌ عارٍ بقرار الطبيب وسببه (`returned` · `return_to_reception`)، فيخرج من المواضع الثلاثة (`physioReturnedToReceptionSql`)
//     ويدخل «المُرجَعون من الطبيب». ولا يعود إلّا بطلبٍ صريح.
//   • `cancelReturnedRequestTx` — **سحبُ الطلب المُرجَع** بالكتابة القانونية القائمة: حلقةٌ تنتظر ⟵ `cancelExamRequestTx` بحرفها،
//     وإلّا ⟵ `cancelScaffoldRequestsById` (قرارُ الطبيب وسببُه يبقيان، ويُلحَق سطرُ مَن سحب ولماذا).
//   • `cancelReturnedAndCloseTx` — السحبُ ثمّ **إغلاقُ القسم إن صار فارغاً** (`closeCaseIfEmptyTx`) وسطرا التدقيق — يناديه زرُّ
//     «إلغاء الطلب» في «المُرجَعون» وتحويلُ المريض في «طلب معاينة جديدة» معاً، فلا قاعدتان.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { notifyReturnedFromDoctor } from "../staff_telegram/notify";
import { branchOrPatientAccessSql } from "../patients/branch_access";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { specialtyLabel } from "@shared/medical";
import { cancelExamRequestTx, CancelExamRequestError } from "../medical/cancel_exam_request";
import { cancelScaffoldRequestsById } from "../patient_cases/disposal";
import { closeCaseIfEmptyTx, type AutoCloseOutcome } from "../patient_cases/closure";
import { physioImplicitWaitTx } from "../medical/store";
import { lockSpecialtyLevelQueueRequestsTx, returnedRequestStillListedTx } from "./store";

type Executor = { execute: (q: any) => Promise<any> };
type Actor = { userId: number | null; userName: string | null };

async function rows(tx: Executor, q: any): Promise<Record<string, any>[]> {
  const r = await tx.execute(q);
  return (r.rows ?? []) as Record<string, any>[];
}

/** الخطأُ نفسُه الذي تردّه «إلغاء المعاينة» — رسالةٌ عربية ورمزٌ وحالة. */
const fail = (message: string, status: number, code: string) => new CancelExamRequestError(message, status, code);

// ── ① إرجاعُ صفٍّ بلا طلب ─────────────────────────────────────────────────────
export async function returnImplicitPhysioExam(params: {
  patientId: number;
  reason: unknown;
  actor: Actor;
  /** نطاقُ الجلسة — `null` للمسؤول. */
  branchIds: number[] | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<{ requestId: number; patientId: number; branchId: number | null }> {
  const reason = typeof params.reason === "string" ? params.reason.trim() : "";
  if (!reason) throw fail("اكتب سبب الإرجاع — ما الذي يصحّحه الاستعلامات؟", 400, "reason_required");
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${params.patientId})`);
    const [p] = await rows(tx, sql`SELECT id, branch_id, deleted_at FROM patients WHERE id = ${params.patientId} FOR UPDATE`);
    if (!p) throw fail("المريض غير موجود", 404, "patient_missing");
    if (p.deleted_at) throw fail(PATIENT_IN_TRASH_ERROR, 409, "patient_in_trash");
    const [c] = await rows(tx, sql`
      SELECT id, COALESCE(branch_id, ${p.branch_id}) AS branch_id FROM patient_cases
       WHERE patient_id = ${params.patientId} AND case_type = 'physiotherapy' FOR UPDATE
    `);
    //  **النطاقُ قبل كلّ خطأٍ يكشف شيئاً** — بفرع الصفّ في «معايناتي» نفسِه (فرعُ القسم ثمّ التسجيل).
    const scopeBranch = c?.branch_id == null ? (p.branch_id == null ? null : Number(p.branch_id)) : Number(c.branch_id);
    if (params.branchIds !== null && (scopeBranch === null || !params.branchIds.includes(scopeBranch))) {
      throw fail("لا يمكنك التعديل على مريض فرع آخر", 403, "branch_out_of_scope");
    }
    //  **وطلبٌ صريح يُرجَع من زرّه هو** — هذا البابُ للصفّ بلا طلبٍ وحده.
    if ((await lockSpecialtyLevelQueueRequestsTx(tx, { patientId: params.patientId, serviceType: "physiotherapy" })).length > 0) {
      throw fail("لهذا الصفّ طلبُ معاينةٍ صريح — حدّث الصفحة وأرجعه من زرّه", 409, "explicit_request_exists");
    }
    const wait = await physioImplicitWaitTx(tx, params.patientId);
    if (!wait) throw fail("تغيّر هذا الصفّ — حدّث الصفحة", 409, "row_stale");
    const ins = await rows(tx, sql`
      INSERT INTO medical_review_requests
        (patient_id, service_type, case_id, branch_id, requested_path, review_kind, reception_note,
         created_by, status, decision, decided_by, decided_at, doctor_note)
      VALUES (${params.patientId}, 'physiotherapy', ${wait.caseId}, ${wait.branchId}, 'full', 'other',
              ${"قسمُ علاجٍ طبيعيّ ينتظر معاينته الأولى بلا طلب — كُتب الطلبُ عند إرجاعه للاستعلامات"},
              NULL, 'returned', 'return_to_reception', ${params.actor.userId}, NOW(), ${reason})
      RETURNING id, branch_id
    `);
    const requestId = Number(ins[0].id);
    const branchId = ins[0].branch_id == null ? null : Number(ins[0].branch_id);
    await notifyReturnedFromDoctor(tx, {
      patientId: params.patientId, branchId, reason, actorUserId: params.actor.userId,
    });
    await logAudit({
      tx, entityType: "medical_review_request", entityId: requestId, action: "create",
      userId: params.actor.userId, userName: params.actor.userName, branchId,
      newValues: { status: "returned", decision: "return_to_reception", serviceType: "physiotherapy", implicit: true },
      ipAddress: params.ipAddress ?? null, userAgent: params.userAgent ?? null,
      notes: `إرجاع طلب معاينة كاملة إلى الاستعلامات — مريض #${params.patientId} (علاج طبيعي، بلا طلبٍ سابق) · ${reason}`,
    });
    return { requestId, patientId: params.patientId, branchId };
  });
}

// ── ② سحبُ الطلب المُرجَع ─────────────────────────────────────────────────────
export type CancelledReturned = {
  requestId: number; patientId: number; serviceType: string;
  cancelledEpisodeId: number | null; cancelledRequestIds: number[]; branchId: number | null;
};

export async function cancelReturnedRequestTx(tx: Executor, params: {
  requestId: number;
  reason: string;
  actor: Actor;
  branchIds: number[] | null;
  /** التحويلُ يشترط أن يكون الطلبُ لمريضه — ٤٠٠ وإلّا. */
  expectPatientId?: number;
}): Promise<CancelledReturned> {
  const reason = (params.reason ?? "").trim();
  if (!reason) throw fail("سبب الإلغاء إلزامي", 400, "reason_required");
  const [head] = await rows(tx, sql`SELECT patient_id FROM medical_review_requests WHERE id = ${params.requestId}`);
  if (!head) throw fail("الطلب المُرجَع غير موجود", 404, "request_missing");
  const patientId = Number(head.patient_id);
  if (params.expectPatientId !== undefined && patientId !== params.expectPatientId) {
    throw fail("الطلب المُرجَع ليس لهذا المريض", 400, "request_other_patient");
  }
  //  **بترتيب الأقفال القائم**: المريضُ (٩١٩ ثمّ صفُّه) قبل الطلب.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${patientId})`);
  const [p] = await rows(tx, sql`SELECT id, deleted_at FROM patients WHERE id = ${patientId} FOR UPDATE`);
  if (!p) throw fail("المريض غير موجود", 404, "patient_missing");
  if (p.deleted_at) throw fail(PATIENT_IN_TRASH_ERROR, 409, "patient_in_trash");
  const [r] = await rows(tx, sql`
    SELECT r.id, r.patient_id, r.service_type, r.status, r.branch_id, r.device_episode_id, e.status AS ep_status
      FROM medical_review_requests r
      LEFT JOIN patient_device_episodes e ON e.id = r.device_episode_id
     WHERE r.id = ${params.requestId}
       FOR UPDATE OF r
  `);
  //  **والنطاقُ بقاعدة القائمة نفسِها** (فرعُ الطلب أو إتاحةُ الملفّ) — ولا يُسحَب ما لا يراه.
  const [inScope] = await rows(tx, sql`
    SELECT 1 AS ok FROM medical_review_requests r
     WHERE r.id = ${params.requestId} AND ${branchOrPatientAccessSql(params.branchIds, "r.branch_id", "r.patient_id")}
  `);
  if (!inScope) throw fail("غير مصرح لك بهذا الفرع", 403, "branch_out_of_scope");
  if (String(r.status) !== "returned" || !(await returnedRequestStillListedTx(tx, params.requestId))) {
    throw fail("تغيّر هذا الطلب — حدّث الصفحة", 409, "request_not_returned");
  }
  const serviceType = String(r.service_type);
  const episodeId = r.device_episode_id == null ? null : Number(r.device_episode_id);
  if (episodeId !== null && String(r.ep_status) === "awaiting_exam") {
    //  حلقةٌ تنتظر ⟵ **الدالّةُ نفسُها** — تُلغى الحلقةُ ويُسحَب الطلبُ المُرجَع معها.
    const done = await cancelExamRequestTx(tx, {
      patientId, caseType: serviceType as any, deviceEpisodeId: episodeId, reason, actor: params.actor,
      branchIds: params.branchIds,
    });
    return { requestId: params.requestId, patientId, serviceType, ...done };
  }
  await cancelScaffoldRequestsById(tx, { ids: [params.requestId], reason, actor: params.actor });
  return {
    requestId: params.requestId, patientId, serviceType, cancelledEpisodeId: null,
    cancelledRequestIds: [params.requestId], branchId: r.branch_id == null ? null : Number(r.branch_id),
  };
}

// ── ③ السحبُ ثمّ إغلاقُ القسم الفارغ وسطرا التدقيق ─────────────────────────────
export async function cancelReturnedAndCloseTx(tx: Executor, params: {
  requestId: number;
  reason: string;
  actor: Actor;
  branchIds: number[] | null;
  expectPatientId?: number;
  /** ما يُلحَق بسطر التدقيق — «تحويل إلى …» مثلاً. */
  auditSuffix?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<CancelledReturned & { caseClosure: AutoCloseOutcome }> {
  const done = await cancelReturnedRequestTx(tx, params);
  await logAudit({
    tx, entityType: "medical_review_request", entityId: done.requestId, action: "update",
    userId: params.actor.userId, userName: params.actor.userName, branchId: done.branchId,
    oldValues: { status: "returned" },
    newValues: { status: "cancelled", cancelledEpisodeId: done.cancelledEpisodeId, cancelledRequestIds: done.cancelledRequestIds },
    ipAddress: params.ipAddress ?? null, userAgent: params.userAgent ?? null,
    notes: `إلغاء طلب معاينة مُرجَع (${specialtyLabel(done.serviceType)}) للمريض #${done.patientId} — ${params.reason.trim()}`
      + (params.auditSuffix ?? ""),
  });
  const caseClosure = await closeCaseIfEmptyTx(tx, {
    patientId: done.patientId, caseType: done.serviceType as any,
    reason: `بعد إلغاء الطلب المُرجَع #${done.requestId}${params.auditSuffix ?? ""}`,
    actor: params.actor, ipAddress: params.ipAddress, userAgent: params.userAgent,
  });
  return { ...done, caseClosure };
}
