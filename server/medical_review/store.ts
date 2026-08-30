// طبقةُ بيانات مراجعة الطبيب — الإنشاء والقرار والقراءة المركّبة.
//
// ══ ما تحرسه هذه الطبقة ═══════════════════════════════════════════════
// (١) **العلاج الطبيعي لا يدخل**: تُردّ قيمتُه هنا وتُردّ في القاعدة معاً.
// (٢) **الفرع حاجز**: كلّ قراءةٍ وكلّ كتابة تُقيَّد بنطاق المنادي — والصفّ
//     يُقرأ من القاعدة لا من جسم الطلب، فرقمٌ ملفَّق لا يُخرج أحداً من فرعه.
// (٣) **قرارٌ واحد لكلّ طلب**: القرار يقع بـ`UPDATE ... WHERE status =
//     'pending'` فيحسم السباقَ صفُّ القاعدة لا ترتيبُ الشيفرة.
// (٤) **ولا معاينةً زائفة**: لا شيء هنا يكتب في `medical_exams` إطلاقاً.

import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  isReviewServiceType, isReviewKind, isReviewPath, isReviewDecision,
  isPathAllowedForKind, isAwaitingFullExam, STATUS_AFTER,
  type ReviewServiceType, type ReviewKind, type ReviewPath, type ReviewDecision,
} from "@shared/medical_review";
import { activeExamSql } from "../medical/active_exam";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";

export class ReviewError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
    this.name = "ReviewError";
  }
}

export interface ReviewRow {
  id: number;
  patientId: number;
  serviceType: ReviewServiceType;
  caseId: number | null;
  branchId: number | null;
  deviceEpisodeId: number | null;
  workOrderId: number | null;
  visitId: number | null;
  requestedPath: ReviewPath;
  reviewKind: ReviewKind;
  receptionNote: string | null;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  status: string;
  decision: ReviewDecision | null;
  decidedBy: number | null;
  decidedByName: string | null;
  decidedAt: string | null;
  doctorNote: string | null;
  examId: number | null;
}

/** بطاقةُ القرار — كلُّ ما يحتاجه الطبيب ليقرّر بلا فتح صفحاتٍ أخرى. */
export interface ReviewCard extends ReviewRow {
  patientName: string;
  patientCode: string | null;
  patientPhone: string | null;
  branchName: string | null;
  /** تصنيفُ الاستقبال للمريض نفسه (`new` | `past`) — سياقٌ لا قاعدة. */
  patientClassification: string | null;
  /** الجهاز الحالي أو السابق كما هو مسجَّل على الخيط. */
  caseDetails: Record<string, any> | null;
  /** حلقةُ الجهاز إن كانت مرساةً: رقمُها في الخيط وحالتُها وما طُلب فيها. */
  episode: {
    id: number; sequenceNumber: number; status: string;
    /**
     * **ما طُلب** (`patient_device_episodes.requested_item`، ترحيل ٠٦٠) —
     * لقطةٌ للعرض لا سلطة.
     *
     * تقرؤها البطاقةُ لتسمّي الحركةَ باسمها: «بيع جزء من طرف صناعي — القالب»
     * بدل «أخرى — أمر تصنيع» التي لا تقول للمشرف شيئاً. **ولا يُنتزَع الجزءُ
     * من نصٍّ حرّ**: العمودُ المحروسُ بقيدٍ في القاعدة هو المصدر.
     */
    requestedItem: string | null;
  } | null;
  /** أمرُ التصنيع/الصيانة إن كان مرساةً. */
  workOrder: {
    id: number; purpose: string; status: string; currentStage: string;
    expertUserId: number | null; expertName: string | null;
  } | null;
  /** الزيارة إن كانت مرساةً. */
  visit: { id: number; visitDate: string | null; notes: string | null } | null;
  /** آخرُ معاينةٍ موقّعة في هذا الاختصاص — إن وُجدت. */
  lastExam: {
    id: number; doctorName: string; createdAt: string;
    diagnosis: string | null; plan: string | null;
  } | null;
}

const clean = (v: unknown): string | null => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length > 0 ? t : null;
};

const scopeClause = (branchIds: number[] | null, col: string) =>
  branchIds === null
    ? sql`TRUE`
    : branchIds.length === 0
      ? sql`FALSE`
      : sql`${sql.raw(col)} IN (${sql.join(branchIds.map((id) => sql`${id}`), sql`, `)})`;

/**
 * إنشاءُ طلبِ مراجعة — **والمرساة تُتحقَّق من انتمائها للمريض**.
 *
 * رقمُ حلقةٍ أو أمرٍ أو زيارةٍ يخصّ مريضاً آخر يُردّ، فلا يصير الطلبُ جسراً
 * يُظهر بيانات ملفٍّ لا يملكه المنادي. والفرع يُقرأ من صفّ المريض لا من
 * جسم الطلب.
 */
export async function createReviewRequest(params: {
  patientId: number;
  serviceType: string;
  requestedPath: string;
  reviewKind: string;
  receptionNote?: unknown;
  deviceEpisodeId?: number | null;
  workOrderId?: number | null;
  visitId?: number | null;
  createdBy: number | null;
  /** نطاقُ المنادي — `null` للمسؤول. */
  branchIds: number[] | null;
}): Promise<ReviewRow> {
  //  ══ **«عاد للشراء» مملوكةٌ لتدفّقها الخاصّ وحده** (ترحيل ٠٧٢) ═════════
  //  صار `return_to_purchase` قيمةً صحيحة في `isReviewKind`، فهذا البابُ
  //  العامّ كان يقبلها كأيّ سببٍ آخر — أيّ منادٍ يعرف الاسمَ (أو يخمّنه)
  //  يستطيع فتحَ طلبٍ بلا حلقةٍ حقيقية `closed_without_purchase` خلفه.
  //  والمسارُ الشرعيّ الوحيد `executeReturnToPurchase`
  //  (`server/followup/return_to_purchase_store.ts`) ينادي
  //  `createReviewRequestTx` **مباشرةً** داخل معاملته الخاصّة — بعد أن أعاد
  //  التحقّق الكامل من الحلقة والمتابعة تحت القفل. فهذا الغلافُ العامّ
  //  يرفضها هنا صراحةً، قبل أن تبلغ النواةَ، مهما كانت صلاحيةُ المنادي —
  //  والنواةُ نفسُها تبقى بلا قيدٍ إضافي لتخدم ذلك المسارَ الوحيد.
  if (params.reviewKind === "return_to_purchase") {
    throw new ReviewError(
      "«عاد للشراء» يُنشأ آلياً من مساره الخاصّ وحده — لا من هذا الباب العامّ", 400,
    );
  }
  return await db.transaction((tx) => createReviewRequestTx(tx, params));
}

/**
 * **نواةُ `createReviewRequest`، مُهيَّأةٌ للانضمام إلى معاملة المنادي.**
 *
 * ══ لماذا انقسمت ═══════════════════════════════════════════════════════
 * `createReviewRequest` تفتح معاملتها الخاصّة دائماً — مناسبةٌ لكلّ منادٍ
 * لا يحتاج غيرها. لكنّ تدفّق «عاد للشراء» (ترحيل ٠٧٢) يحتاج أن يُعيد حلقةَ
 * الجهاز إلى `awaiting_exam` **وينشئ طلبَ المراجعة معاً** — عمليةٌ واحدة أو
 * لا شيء. فاستُخلصت النواةُ لتقبل معاملة المستدعي حرفاً بحرف، بلا تكرار
 * قواعد التحقّق (المريضُ والفرعُ والمرساة) في مكانٍ ثانٍ.
 *
 * نفسُ نمط `startDeviceEpisode`/`startDeviceEpisodeTx` في
 * `device_episodes/store.ts` حرفياً.
 */
export async function createReviewRequestTx(tx: any, params: {
  patientId: number;
  serviceType: string;
  requestedPath: string;
  reviewKind: string;
  receptionNote?: unknown;
  deviceEpisodeId?: number | null;
  workOrderId?: number | null;
  visitId?: number | null;
  createdBy: number | null;
  /** نطاقُ المنادي — `null` للمسؤول. */
  branchIds: number[] | null;
}): Promise<ReviewRow> {
  const {
    patientId, serviceType, requestedPath, reviewKind, createdBy, branchIds,
  } = params;

  if (!isReviewServiceType(serviceType)) {
    throw new ReviewError("مراجعة الطبيب للأطراف والمساند فقط", 400);
  }
  if (!isReviewPath(requestedPath)) throw new ReviewError("مسار المراجعة غير صالح", 400);
  if (!isReviewKind(reviewKind)) throw new ReviewError("سبب الزيارة غير صالح", 400);
  //  الجهازُ الجديد لا يكون سريعاً — هنا وفي قيد القاعدة معاً.
  if (!isPathAllowedForKind(reviewKind, requestedPath)) {
    throw new ReviewError("طلبُ جهازٍ جديد يستوجب معاينةً طبية كاملة", 400);
  }

  const pat = await tx.execute<{ id: number; branch_id: number | null; deleted_at: string | null }>(sql`
    SELECT id, branch_id, deleted_at FROM patients WHERE id = ${patientId}
  `);
  const patient = (pat.rows ?? [])[0];
  if (!patient) throw new ReviewError("المريض غير موجود", 404);
  //  **ولا طلبَ مراجعةٍ على ملفٍّ في السلّة** (ترحيل ٠٦٨).
  if (patient.deleted_at) throw new ReviewError(PATIENT_IN_TRASH_ERROR, 409);
  if (branchIds !== null && !branchIds.includes(Number(patient.branch_id))) {
    throw new ReviewError("غير مصرح لك بهذا الفرع", 403);
  }

  //  الخيط إن وُجد. **ليس شرط وجود**: المريض القديم قد لا يحمل خيطاً
  //  مصنَّفاً بعد، وحجبُ المراجعة عنه هو العطبُ الذي جئنا نصلحه.
  const cs = await tx.execute<{ id: number }>(sql`
    SELECT id FROM patient_cases
     WHERE patient_id = ${patientId} AND case_type = ${serviceType}
     LIMIT 1
  `);
  const caseId = (cs.rows ?? [])[0]?.id ?? null;

  const episodeId = numOrNull(params.deviceEpisodeId);
  const orderId = numOrNull(params.workOrderId);
  const visitId = numOrNull(params.visitId);

  if (episodeId !== null) {
    const r = await tx.execute<{ id: number }>(sql`
      SELECT id FROM patient_device_episodes
       WHERE id = ${episodeId} AND patient_id = ${patientId}
    `);
    if ((r.rows ?? []).length === 0) throw new ReviewError("الجهاز غير موجود على ملف المريض", 400);
  }
  if (orderId !== null) {
    const r = await tx.execute<{ id: number }>(sql`
      SELECT id FROM prosthetic_work_orders
       WHERE id = ${orderId} AND patient_id = ${patientId}
    `);
    if ((r.rows ?? []).length === 0) throw new ReviewError("أمر التصنيع غير موجود على ملف المريض", 400);
  }
  if (visitId !== null) {
    const r = await tx.execute<{ id: number }>(sql`
      SELECT id FROM visits
       WHERE id = ${visitId} AND patient_id = ${patientId} AND deleted_at IS NULL
    `);
    if ((r.rows ?? []).length === 0) throw new ReviewError("الزيارة غير موجودة على ملف المريض", 400);
  }

  try {
    const ins = await tx.execute<Record<string, any>>(sql`
      INSERT INTO medical_review_requests
        (patient_id, service_type, case_id, branch_id,
         device_episode_id, work_order_id, visit_id,
         requested_path, review_kind, reception_note, created_by)
      VALUES (${patientId}, ${serviceType}, ${caseId}, ${patient.branch_id ?? null},
              ${episodeId}, ${orderId}, ${visitId},
              ${requestedPath}, ${reviewKind}, ${clean(params.receptionNote)}, ${createdBy})
      RETURNING *
    `);
    return toRow((ins.rows ?? [])[0]);
  } catch (err: any) {
    //  فهرسُ التفرّد الجزئي — طلبٌ معلَّقٌ واحد لكلّ حدث.
    if (String(err?.code) === "23505") {
      throw new ReviewError("لهذا الحدث طلبُ مراجعةٍ معلَّقٌ بالفعل", 409);
    }
    throw err;
  }
}

/**
 * توجيهُ خدمةٍ فعلية إلى الطبيب — **الباب الذي تناديه المسارات القائمة**.
 *
 * ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
 * أوّلُ تنفيذٍ جعل الإرسالَ زرّاً في صفحة المريض. وهذا يعني أن وصولَ الحالة
 * إلى الطبيب يتوقّف على **أن يتذكّر الموظّف** فتحَ صفحةٍ أخرى بعد أن أنهى
 * عمله. وما يعتمد على التذكّر لا يقع: الملفُّ الذي لا يُرسَل لا يُرى، ومَن
 * لا يُرى لا يُعالَج. فصار التوجيهُ جزءاً من الخدمة نفسها — تُفتح حالةٌ أو
 * يُطلَب جهازٌ أو تُفتح صيانةٌ أو تُسجَّل زيارةُ جهاز، فيُنشأ الطلب معها.
 *
 * ══ ولماذا لا يفشل ══════════════════════════════════════════════════════
 * **مُتسامحةٌ مع التكرار عمداً**: طلبٌ معلَّقٌ يغطّي الحدثَ نفسه ⇒ يُعاد كما
 * هو بلا ثانٍ. فضغطتان لا تصنعان بطاقتين، وإعادةُ محاولةٍ بعد انقطاع شبكة
 * لا تُفشل خدمةً نجحت. وما عدا التكرار يُرمى إلى المنادي ليقرّر.
 */
export async function ensureReviewRouting(params: {
  patientId: number;
  serviceType: string;
  reviewKind: string;
  requestedPath: string;
  receptionNote?: unknown;
  deviceEpisodeId?: number | null;
  workOrderId?: number | null;
  visitId?: number | null;
  createdBy: number | null;
  branchIds: number[] | null;
}): Promise<{ created: boolean; request: ReviewRow | null }> {
  //  حارسٌ صامت: العلاج الطبيعي (أو أي نوعٍ آخر) لا يُوجَّه ولا يُخطئ.
  if (!isReviewServiceType(params.serviceType)) return { created: false, request: null };
  try {
    return { created: true, request: await createReviewRequest(params) };
  } catch (err) {
    if (err instanceof ReviewError && err.status === 409) {
      const existing = await findPendingReview(params);
      if (existing) return { created: false, request: existing };
    }
    throw err;
  }
}

/** الطلبُ المعلَّق الذي يغطّي هذا الحدث بعينه — مرآةُ فهارس التفرّد الجزئية. */
async function findPendingReview(params: {
  patientId: number; serviceType: string;
  deviceEpisodeId?: number | null; workOrderId?: number | null; visitId?: number | null;
}): Promise<ReviewRow | null> {
  const episodeId = numOrNull(params.deviceEpisodeId);
  const orderId = numOrNull(params.workOrderId);
  const visitId = numOrNull(params.visitId);
  const anchor = episodeId !== null
    ? sql`r.device_episode_id = ${episodeId}`
    : orderId !== null
      ? sql`r.work_order_id = ${orderId}`
      : visitId !== null
        ? sql`r.visit_id = ${visitId}`
        : sql`r.device_episode_id IS NULL AND r.work_order_id IS NULL AND r.visit_id IS NULL
              AND r.patient_id = ${params.patientId} AND r.service_type = ${params.serviceType}`;
  const rows = await db.execute<Record<string, any>>(sql`
    SELECT r.* FROM medical_review_requests r
     WHERE r.status = 'pending' AND ${anchor}
     LIMIT 1
  `);
  const row = (rows.rows ?? [])[0];
  return row ? toRow(row) : null;
}

/**
 * قرارُ الطبيب — **مرّةً واحدة، ومن داخل نطاقه، وعلى المسار السريع وحده**.
 *
 * الحسمُ في `WHERE status = 'pending'`: طبيبان ضغطا معاً فأحدهما يكتب
 * والآخر يُردّ ٤٠٩ بلا أن يدوس قراراً قائماً.
 *
 * **وطلبُ المسار الكامل لا يُقرَّر هنا إطلاقاً**: هو في طابور المعاينة لا في
 * طابور القرار السريع، ونهايتُه توقيعُ معاينةٍ لا ضغطةُ زرّ. والحجبُ في
 * الطبقة لا في الواجهة: طلبٌ ملفَّق بمعرّفٍ صحيح يُردّ كما تُردّ ضغطةٌ في
 * شاشةٍ لا تعرضه أصلاً.
 *
 * **ولا يُكتب هنا في `medical_exams` حرف.** «معاينة كاملة» تعني أن الملفّ
 * يدخل طابورَ المعاينة القائم بحرفه — لا أن نصنع له معاينةً هنا.
 */
export async function decideReviewRequest(params: {
  requestId: number;
  decision: string;
  doctorNote?: unknown;
  doctorUserId: number;
  branchIds: number[] | null;
}): Promise<ReviewRow> {
  const { requestId, decision, doctorUserId, branchIds } = params;
  if (!isReviewDecision(decision)) throw new ReviewError("قرار غير صالح", 400);
  const nextStatus = STATUS_AFTER[decision];

  //  **والإرجاعُ بسببٍ إلزاميّ**: بطاقةٌ ترجع للاستعلامات بلا سبب تُقرأ
  //  «أُعيد» ولا يعرف الموظّفُ ماذا يصحّح — فيعيد إرسالها كما هي، أو يتركها.
  //  والسببُ يبقى في السجلّ: مَن أرجع، ومتى، ولماذا.
  const returnNote = clean(params.doctorNote);
  if (decision === "return_to_reception" && !returnNote) {
    throw new ReviewError("اكتب سبب الإرجاع — ما الذي يصحّحه الاستعلامات؟", 400);
  }

  return await db.transaction(async (tx) => {
    const cur = await tx.execute<{
      id: number; branch_id: number | null; status: string; requested_path: string;
    }>(sql`
      SELECT id, branch_id, status, requested_path FROM medical_review_requests
       WHERE id = ${requestId} FOR UPDATE
    `);
    const row = (cur.rows ?? [])[0];
    if (!row) throw new ReviewError("طلب المراجعة غير موجود", 404);
    if (branchIds !== null && !branchIds.includes(Number(row.branch_id))) {
      throw new ReviewError("غير مصرح لك بهذا الفرع", 403);
    }
    if (row.requested_path === "full") {
      throw new ReviewError(
        "هذا الطلب على مسار المعاينة الكاملة — يُنجَز بتوقيع معاينة لا بقرار سريع", 400,
      );
    }
    if (row.status !== "pending") {
      throw new ReviewError("تمّ البتّ في هذا الطلب بالفعل", 409);
    }

    const upd = await tx.execute<Record<string, any>>(sql`
      UPDATE medical_review_requests
         SET status = ${nextStatus}, decision = ${decision},
             decided_by = ${doctorUserId}, decided_at = NOW(),
             doctor_note = ${returnNote}, updated_at = NOW()
       WHERE id = ${requestId} AND status = 'pending'
      RETURNING *
    `);
    const out = (upd.rows ?? [])[0];
    if (!out) throw new ReviewError("تمّ البتّ في هذا الطلب بالفعل", 409);
    return toRow(out);
  });
}

/**
 * **إرجاعُ طلبِ معاينةٍ كاملة إلى الاستعلامات — قبل أن تُكتب معاينة.**
 *
 * ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
 * الطلبُ الكامل لا يُقرَّر بضغطةٍ — نهايتُه توقيعُ معاينة. فطلبٌ أُرسل ببيانٍ
 * خاطئ (جهةُ بترٍ مقلوبة، اختصاصٌ غير صحيح) كان **عالقاً إلى الأبد** في
 * قائمة «معايناتي»: لا الطبيبُ يوقّع على خطأ، ولا أحدَ يستطيع سحبَه.
 * والحيلةُ الوحيدة كانت أن يوقّع الطبيبُ معاينةً يعرف أنها خطأ ليُخرجها من
 * قائمته — وهذا أسوأ ما يمكن أن يدفع إليه نظام.
 *
 * فصار له بابُ خروجٍ نظيف: يُوسَم `returned` بسببٍ إلزاميّ، فيخرج من
 * القائمة، **ويُحرَّر فهرسُ التفرّد** (`WHERE status = 'pending'`) فيرسل
 * الاستعلاماتُ طلباً جديداً مصحَّحاً على المرساة نفسها بلا ٤٠٩.
 *
 * ══ وما **لا** يفعله ═══════════════════════════════════════════════════
 * • **لا يُنشئ معاينةً ولا يحذفها ولا يمسّ نسخةً ولا ملحقاً.**
 * • **ولا يمسّ حلقةَ الجهاز ولا أمرَ التصنيع ولا ديناراً**: الخدمةُ التي
 *   وقعت وقعت؛ المُرجَعُ هو **طلبُ المراجعة** لا الحدثُ الذي وثّقه.
 * • **ولا يُرجِع ما وُقّعت له معاينةٌ بعده**: عندئذٍ الطلبُ مُنجَزٌ لا معلَّق،
 *   وإرجاعُه يزوّر تسلسلاً وقع.
 * • **ولا يُرجِع المرءُ طلبَ نفسه**: هذا فعلٌ إشرافيّ — ومَن يصنّف لا
 *   يسحب تصنيفَه بنفسه، وإلّا صار البابُ طريقاً لمحو الأثر.
 */
export async function returnFullRequestToReception(params: {
  requestId: number;
  reason: unknown;
  actorUserId: number;
  branchIds: number[] | null;
}): Promise<ReviewRow> {
  const reason = clean(params.reason);
  if (!reason) {
    throw new ReviewError("اكتب سبب الإرجاع — ما الذي يصحّحه الاستعلامات؟", 400);
  }

  return await db.transaction(async (tx) => {
    const cur = await tx.execute<{
      id: number; branch_id: number | null; status: string; requested_path: string;
      patient_id: number; service_type: string; created_by: number | null;
      decided_at: string | null; created_at: string;
    }>(sql`
      SELECT id, branch_id, status, requested_path, patient_id, service_type,
             created_by, decided_at, created_at
        FROM medical_review_requests
       WHERE id = ${params.requestId} FOR UPDATE
    `);
    const row = (cur.rows ?? [])[0];
    if (!row) throw new ReviewError("طلب المراجعة غير موجود", 404);
    if (params.branchIds !== null && !params.branchIds.includes(Number(row.branch_id))) {
      throw new ReviewError("غير مصرح لك بهذا الفرع", 403);
    }
    //  المنتظرُ معاينةً كاملة وحده: المُرسَل كاملاً، أو المُحال بعد نظرة.
    if (!isAwaitingFullExam(String(row.status), String(row.requested_path))) {
      throw new ReviewError(
        "هذا الطلب لا ينتظر معاينةً كاملة — لا شيء يُرجَع", 400,
      );
    }
    if (Number(row.created_by) === Number(params.actorUserId)) {
      throw new ReviewError(
        "لا تُرجِع طلبك بنفسك — الإرجاع فعلٌ إشرافيّ من مسؤول أو مدير فرع أو طبيب الاختصاص",
        403,
      );
    }
    //  **ولا إرجاعَ بعد توقيع**: معاينةٌ وُقّعت بعد الطلب تعني أنه أُنجز.
    const ex = await tx.execute<{ id: number }>(sql`
      SELECT id FROM medical_exams me
       WHERE me.patient_id = ${row.patient_id}
         AND me.case_type = ${row.service_type}
         AND me.created_at >= COALESCE(${row.decided_at}::timestamptz, ${row.created_at}::timestamptz)
         AND ${activeExamSql("me")}
       LIMIT 1
    `);
    if ((ex.rows ?? []).length > 0) {
      throw new ReviewError("وُقّعت معاينة لهذا الطلب — لا يُرجَع بعد التوقيع", 409);
    }

    const upd = await tx.execute<Record<string, any>>(sql`
      UPDATE medical_review_requests
         SET status = 'returned', decision = 'return_to_reception',
             decided_by = ${params.actorUserId}, decided_at = NOW(),
             doctor_note = ${reason}, updated_at = NOW()
       WHERE id = ${params.requestId}
         AND (status = 'escalated' OR (status = 'pending' AND requested_path = 'full'))
      RETURNING *
    `);
    const out = (upd.rows ?? [])[0];
    if (!out) throw new ReviewError("تغيّرت حالة الطلب — حدّث الصفحة", 409);
    return toRow(out);
  });
}

/**
 * طلباتُ المعاينة الكاملة المعلَّقة لمرضى قائمةِ العمل — **هويّةٌ لا أكثر**.
 *
 * قائمةُ «معايناتي» صفٌّ لكلّ (مريض، اختصاص) لا لكلّ طلب، فلا رقمَ طلبٍ
 * فيها يُرجِعه الزرّ. وهذه تُرجع أقدمَ طلبٍ منتظرٍ لكلّ ثنائيّة — وهو
 * الطلبُ الذي وضع المريضَ في القائمة.
 */
export async function pendingFullRequestsFor(params: {
  patientIds: number[];
  branchIds: number[] | null;
}): Promise<{
  patientId: number; serviceType: string; requestId: number; createdBy: number | null;
  /** **سببُ الزيارة** — تعرضه «معايناتي» صراحةً حين يكون `return_to_purchase`. */
  reviewKind: ReviewKind;
}[]> {
  if (params.patientIds.length === 0) return [];
  const rows = await db.execute<Record<string, any>>(sql`
    SELECT DISTINCT ON (r.patient_id, r.service_type)
           r.id, r.patient_id, r.service_type, r.created_by, r.review_kind
      FROM medical_review_requests r
     WHERE r.patient_id IN (${sql.join(params.patientIds.map((p) => sql`${p}`), sql`, `)})
       AND (r.status = 'escalated' OR (r.status = 'pending' AND r.requested_path = 'full'))
       AND ${scopeClause(params.branchIds, "r.branch_id")}
       AND NOT EXISTS (
         SELECT 1 FROM medical_exams me
          WHERE me.patient_id = r.patient_id
            AND me.case_type = r.service_type
            AND me.created_at >= COALESCE(r.decided_at, r.created_at)
            AND ${activeExamSql("me")}
       )
     ORDER BY r.patient_id, r.service_type, r.created_at ASC
  `);
  return (rows.rows ?? []).map((r) => ({
    patientId: Number(r.patient_id),
    serviceType: String(r.service_type),
    requestId: Number(r.id),
    createdBy: numOrNull(r.created_by),
    reviewKind: String(r.review_kind) as ReviewKind,
  }));
}

/**
 * طابورُ القرار السريع — المعلَّقُ **السريع** في نطاقه، الأقدمُ أوّلاً.
 *
 * **ولا استثناءَ للمريض القديم ولا للصيانة**: كلُّ طلبٍ سريعٍ أنشأه الاستقبال
 * يظهر. فهذا الطابور هو بالضبط ما وُجد ليصلح الإقصاءَين.
 *
 * **وطلبُ المسار الكامل لا يظهر هنا بحال**: مكانُه طابور المعاينة القائم،
 * وعرضُه هنا كان سيضع تحت يد الطبيب زرَّ «موافقة» على حالةٍ قيل عنها إنها
 * تحتاج فحصاً — وهو بالضبط ما يمنعه هذا الشرط.
 *
 * والاختصاصات تُرشَّح في **الخادم**: طبيبُ الأطراف لا يرى طلبَ مساند.
 */
export async function listPendingReviews(params: {
  branchIds: number[] | null;
  specialties: readonly string[];
  /**
   * **اليومُ افتراضاً** (تقويمُ بغداد) — هذه شاشةُ عملٍ لا أرشيف. وكومةٌ
   * تاريخيةٌ بلا نهاية تجعل الصفحةَ تُهجَر، فيضيع المتروكُ فيها.
   * و`older` بابٌ واحدٌ لما تُرك بلا مراجعةٍ قبل اليوم.
   */
  window?: "today" | "older" | "all";
}): Promise<ReviewCard[]> {
  const { branchIds, specialties } = params;
  const device = specialties.filter(isReviewServiceType);
  if (device.length === 0) return [];

  const win = params.window ?? "today";
  //  المقارنةُ بتقويم بغداد لا بـUTC: طلبٌ في العاشرة مساءً بغداد يقع في
  //  «غد» بتوقيت UTC، فيختفي من «اليوم» عند مَن أنشأه قبل دقائق.
  const windowClause = win === "all"
    ? sql`TRUE`
    : win === "older"
      ? sql`(r.created_at AT TIME ZONE 'Asia/Baghdad')::date < (NOW() AT TIME ZONE 'Asia/Baghdad')::date`
      : sql`(r.created_at AT TIME ZONE 'Asia/Baghdad')::date = (NOW() AT TIME ZONE 'Asia/Baghdad')::date`;

  const rows = await db.execute<Record<string, any>>(sql`
    SELECT r.*,
           p.name  AS patient_name,
           p.patient_code,
           p.phone AS patient_phone,
           p.patient_classification,
           b.name  AS branch_name,
           pc.details AS case_details,
           cu.display_name AS created_by_name,
           du.display_name AS decided_by_name,
           e.sequence_number AS ep_seq, e.status AS ep_status,
           e.requested_item AS ep_item,
           wo.purpose AS wo_purpose, wo.status AS wo_status,
           wo.current_stage AS wo_stage, wo.expert_user_id AS wo_expert,
           xu.display_name AS wo_expert_name,
           v.visit_date AS v_date, v.notes AS v_notes,
           le.id AS le_id, le.doctor_name AS le_doctor, le.created_at AS le_at,
           le.diagnosis AS le_diagnosis, le.plan AS le_plan
      FROM medical_review_requests r
      JOIN patients p ON p.id = r.patient_id
      LEFT JOIN branches b ON b.id = r.branch_id
      LEFT JOIN patient_cases pc ON pc.id = r.case_id
      LEFT JOIN system_users cu ON cu.id = r.created_by
      LEFT JOIN system_users du ON du.id = r.decided_by
      LEFT JOIN patient_device_episodes e ON e.id = r.device_episode_id
      LEFT JOIN prosthetic_work_orders wo ON wo.id = r.work_order_id
      LEFT JOIN system_users xu ON xu.id = wo.expert_user_id
      LEFT JOIN visits v ON v.id = r.visit_id AND v.deleted_at IS NULL
      -- آخرُ معاينةٍ موقّعة في نفس الاختصاص — سياقٌ للقرار لا شرطٌ له.
      LEFT JOIN LATERAL (
        SELECT me.id, me.doctor_name, me.created_at, me.diagnosis, me.plan
          FROM medical_exams me
         WHERE me.patient_id = r.patient_id AND me.case_type = r.service_type
           AND ${activeExamSql("me")}
         ORDER BY me.created_at DESC LIMIT 1
      ) le ON TRUE
     WHERE r.status = 'pending' AND r.requested_path = 'quick'
       -- **والمحذوفُ يخرج من سطح الإشراف** (ترحيل ٠٦٨).
       AND p.deleted_at IS NULL
       AND ${windowClause}
       AND ${scopeClause(branchIds, "r.branch_id")}
       AND r.service_type IN (${sql.join(device.map((d) => sql`${d}`), sql`, `)})
     ORDER BY r.created_at ASC
  `);
  return (rows.rows ?? []).map(toCard);
}

/**
 * **طلباتُ المعاينة الكاملة المنتظرة — لسطح الإشراف.**
 *
 * ══ لماذا هنا لا في «معايناتي» ═════════════════════════════════════════
 * قائمةُ «معايناتي» تُبنى من `doctorSpecialties`، فمديرُ الفرع — وهو ليس
 * طبيباً ولا اختصاصَ له — يقرؤها **فارغة دائماً**. فكان يملك قدرةَ الإرجاع
 * ولا يصله شيءٌ يُرجعه: صلاحيةٌ بلا باب.
 *
 * وفتحُ «معايناتي» له كان سيجعله يقف أمام قائمةٍ سريرية بزرّ «كتابة معاينة»
 * — وهو ما لا يجوز. فالبابُ في صفحته هو: قسمٌ صغيرٌ للقراءة والإرجاع، **بلا
 * زرِّ معاينةٍ ولا توقيع**.
 *
 * ولا تُعرَض إلّا **القابلةُ للإرجاع فعلاً**: منتظِرةٌ، وبلا معاينةٍ وُقّعت
 * بعدها — فلا يُعرض زرٌّ يردّه الخادمُ عند الضغط.
 */
export async function listPendingFullRequests(params: {
  branchIds: number[] | null;
  specialties: readonly string[];
}): Promise<ReviewCard[]> {
  const device = params.specialties.filter(isReviewServiceType);
  if (device.length === 0) return [];
  const rows = await db.execute<Record<string, any>>(sql`
    SELECT r.*,
           p.name AS patient_name, p.patient_code, p.phone AS patient_phone,
           p.patient_classification,
           b.name AS branch_name,
           cu.display_name AS created_by_name,
           du.display_name AS decided_by_name
      FROM medical_review_requests r
      JOIN patients p ON p.id = r.patient_id
      LEFT JOIN branches b ON b.id = r.branch_id
      LEFT JOIN system_users cu ON cu.id = r.created_by
      LEFT JOIN system_users du ON du.id = r.decided_by
     WHERE (r.status = 'escalated' OR (r.status = 'pending' AND r.requested_path = 'full'))
       AND p.deleted_at IS NULL
       AND ${scopeClause(params.branchIds, "r.branch_id")}
       AND r.service_type IN (${sql.join(device.map((d) => sql`${d}`), sql`, `)})
       AND NOT EXISTS (
         SELECT 1 FROM medical_exams me
          WHERE me.patient_id = r.patient_id
            AND me.case_type = r.service_type
            AND me.created_at >= COALESCE(r.decided_at, r.created_at)
            AND ${activeExamSql("me")}
       )
     ORDER BY r.created_at ASC
     LIMIT 200
  `);
  return (rows.rows ?? []).map(toCard);
}

/** تاريخُ طلبات مريضٍ واحد — لصفحة المريض. مرتَّبٌ بالأحدث. */
export async function listReviewsForPatient(
  patientId: number, branchIds: number[] | null,
): Promise<ReviewRow[]> {
  const rows = await db.execute<Record<string, any>>(sql`
    SELECT r.*, cu.display_name AS created_by_name, du.display_name AS decided_by_name
      FROM medical_review_requests r
      LEFT JOIN system_users cu ON cu.id = r.created_by
      LEFT JOIN system_users du ON du.id = r.decided_by
     WHERE r.patient_id = ${patientId}
       AND ${scopeClause(branchIds, "r.branch_id")}
     ORDER BY r.created_at DESC
  `);
  return (rows.rows ?? []).map(toRow);
}

/**
 * إغلاقُ ما كان ينتظر معاينةً، بالمعاينة التي وُقّعت للتوّ.
 *
 * تُنادى بعد توقيع معاينةٍ فيصير التسلسل مقروءاً: صُنِّف ⟶ انتظر ⟶ عُوين.
 * وتشمل الحالتين اللتين تنتظران التوقيع: **المُرسَل كاملاً** من الاستقبال،
 * و**المُحال** من طبيبٍ نظر نظرةً سريعة.
 *
 * ولماذا يُغلَق لا يُترك معلَّقاً: الطلبُ المعلَّق يحجز فهرسَ التفرّد الجزئي،
 * فمريضٌ عاد بعد أشهرٍ لجهازٍ ثانٍ كان يُردّ بـ«له طلبٌ معلَّقٌ بالفعل» عن
 * طلبٍ أُنجز في حينه. والإغلاق بالحالة `examined` لا بقرارٍ سريع — لأن الذي
 * أنهاه توقيعُ سجلٍّ سريري لا ضغطةُ زرّ.
 *
 * **وفشلُها لا يجوز أن يُسقط توقيعَ سجلٍّ سريري** — فالمنادي يبتلع خطأه
 * عمداً، وقائمةُ العمل تصحّح نفسها على أي حال: شرطُ «لا معاينةَ بعد الطلب»
 * يُخرج المريض منها ولو بقي الصفُّ معلَّقاً.
 */
export async function closeRequestsAwaitingExam(params: {
  patientId: number; serviceType: string; examId: number;
}): Promise<void> {
  if (!isReviewServiceType(params.serviceType)) return;
  await db.execute(sql`
    UPDATE medical_review_requests
       SET exam_id = ${params.examId}, status = 'examined', updated_at = NOW()
     WHERE patient_id = ${params.patientId}
       AND service_type = ${params.serviceType}
       AND (status = 'escalated' OR (status = 'pending' AND requested_path = 'full'))
  `);
}

// ── التحويل ──────────────────────────────────────────────────────────────

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

const iso = (v: any): string | null =>
  v ? new Date(v).toISOString() : null;

function toRow(r: Record<string, any>): ReviewRow {
  return {
    id: Number(r.id),
    patientId: Number(r.patient_id),
    serviceType: String(r.service_type) as ReviewServiceType,
    caseId: r.case_id === null || r.case_id === undefined ? null : Number(r.case_id),
    branchId: r.branch_id === null || r.branch_id === undefined ? null : Number(r.branch_id),
    deviceEpisodeId: numOrNull(r.device_episode_id),
    workOrderId: numOrNull(r.work_order_id),
    visitId: numOrNull(r.visit_id),
    requestedPath: String(r.requested_path) as ReviewPath,
    reviewKind: String(r.review_kind) as ReviewKind,
    receptionNote: r.reception_note ?? null,
    createdBy: numOrNull(r.created_by),
    createdByName: r.created_by_name ?? null,
    createdAt: iso(r.created_at) ?? new Date().toISOString(),
    status: String(r.status),
    decision: r.decision ? (String(r.decision) as ReviewDecision) : null,
    decidedBy: numOrNull(r.decided_by),
    decidedByName: r.decided_by_name ?? null,
    decidedAt: iso(r.decided_at),
    doctorNote: r.doctor_note ?? null,
    examId: numOrNull(r.exam_id),
  };
}

function toCard(r: Record<string, any>): ReviewCard {
  return {
    ...toRow(r),
    patientName: String(r.patient_name ?? ""),
    patientCode: r.patient_code ?? null,
    patientPhone: r.patient_phone ?? null,
    branchName: r.branch_name ?? null,
    patientClassification: r.patient_classification ?? null,
    caseDetails: (r.case_details ?? null) as Record<string, any> | null,
    episode: r.device_episode_id
      ? {
        id: Number(r.device_episode_id),
        sequenceNumber: Number(r.ep_seq ?? 0),
        status: String(r.ep_status ?? ""),
        requestedItem: r.ep_item ?? null,
      }
      : null,
    workOrder: r.work_order_id
      ? {
        id: Number(r.work_order_id),
        purpose: String(r.wo_purpose ?? ""),
        status: String(r.wo_status ?? ""),
        currentStage: String(r.wo_stage ?? ""),
        expertUserId: numOrNull(r.wo_expert),
        expertName: r.wo_expert_name ?? null,
      }
      : null,
    visit: r.visit_id
      ? { id: Number(r.visit_id), visitDate: iso(r.v_date), notes: r.v_notes ?? null }
      : null,
    lastExam: r.le_id
      ? {
        id: Number(r.le_id),
        doctorName: String(r.le_doctor ?? ""),
        createdAt: iso(r.le_at) ?? "",
        diagnosis: r.le_diagnosis ?? null,
        plan: r.le_plan ?? null,
      }
      : null,
  };
}
