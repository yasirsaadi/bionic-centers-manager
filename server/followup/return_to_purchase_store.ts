// «عاد للشراء» — طبقةُ البيانات (ترحيل ٠٧٢).
//
// ══ الواقعة ═══════════════════════════════════════════════════════════
// مريضٌ طلب جهازاً، عايَنه طبيب، سجّل الاستقبالُ «لم يشترِ». بعد أسابيع
// يعود يريد **الجهازَ نفسَه**. لا مريضَ جديداً، ولا حالةً جديدة، ولا حلقةَ
// جديدة، ولا محوَ التاريخ القديم — حلقةٌ واحدة تعود `awaiting_exam` فتُوقَّع
// لها معاينةٌ ثانية، والمتابعةُ القديمة `closed_without_purchase` تبقى
// كما هي بسببها وتاريخها.
//
// ══ الذرّية ═══════════════════════════════════════════════════════════
// إعادةُ الحلقة إلى `awaiting_exam` وإنشاءُ طلبِ مراجعةٍ كامل **عمليةٌ
// واحدة أو لا شيء**: `revertEpisodeToAwaitingExam` (المخزنُ القانونيّ في
// `device_episodes/store.ts`، بُني أصلاً لإلغاء المعاينة — ترحيل ٠٦١) و
// `createReviewRequestTx` (النواةُ المُستخلَصة من `medical_review/store.ts`
// لهذه الغاية) تحت معاملةٍ واحدة، بلا نسخةٍ من قواعد أيٍّ منهما هنا.
//
// ══ وكلُّ إعادة تحقّقٍ تحت القفل — لا ثقةً بما أرسله العميل ═══════════════
// بين لحظة عرض الخيار على الشاشة ولحظة الضغط قد يمرّ وقت: يُصنَّع الأمرُ
// من طلبٍ آخر، تُلغى الحلقة، يُرسَل طلبُ مراجعةٍ آخر عن الجهاز نفسِه. فكلُّ
// شرطٍ يُعاد قراءتُه من القاعدة **تحت `FOR UPDATE`** لحظةَ التنفيذ، لا من
// قائمة الأهليّة التي عُرضت قبل ثوانٍ.

import { db } from "../db";
import { sql } from "drizzle-orm";
import { FollowupError } from "./store";
import { revertEpisodeToAwaitingExam } from "../device_episodes/store";
import { createReviewRequestTx, ReviewError, type ReviewRow } from "../medical_review/store";

export interface EligibleReturnToPurchase {
  /**
   * **`null` لقرارٍ سابقٍ بلا حلقة** — معاينةٌ وُقّعت قبل أن يفتح الاستقبالُ
   * طلبَ جهاز (المسارُ الموروث الذي يصفه ٤.p: «صفرٌ = معاينةٌ بلا جهاز»).
   * الهويّةُ حينئذٍ `followupId` وحدَها، ولا حلقةَ تُخترَع لها.
   */
  episodeId: number | null;
  serviceType: "prosthetic" | "medical_support";
  requestedItem: string | null;
  followupId: number;
  closedAt: string | null;
  closedReason: string | null;
  notBoughtReasonText: string | null;
  examDoctorName: string | null;
  examAt: string | null;
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * **الحلقاتُ المؤهَّلة لـ«عاد للشراء» لهذا المريض** — قراءةٌ محضة.
 *
 * أهليّةٌ حتميّة لا تُخمَّن: `service_path = 'exam'` (طلبُ جهازٍ على مسار
 * المعاينة لا مسارٍ آخر) · `status = 'examined'` (لم تُصنَّع ولم تُلغَ) ·
 * **آخِرُ متابعةٍ على هذه الحلقة بعينها** `closed_without_purchase` (لا
 * متابعةٍ أحدث تحكمها بعد — `hasActiveFollowup`/`purchaseGovernedByFollowup`
 * تسألان السؤال نفسه بمبدأٍ مطابق: أحدثُ متابعةٍ للحلقة، لا أيّةُ متابعةٍ
 * تاريخية) · وبلا طلبِ مراجعةٍ معلَّقٍ بالفعل على الحلقة نفسِها (لا يُعرَض
 * خيارٌ سيرتدّ ٤٠٩ فور الضغط).
 */
export async function listEligibleReturnToPurchase(params: {
  patientId: number;
  branchIds: number[] | null;
}): Promise<EligibleReturnToPurchase[]> {
  const branchClause = params.branchIds === null
    ? sql`TRUE`
    : params.branchIds.length === 0
      ? sql`FALSE`
      : sql`de.branch_id IN (${sql.join(params.branchIds.map((b) => sql`${b}`), sql`, `)})`;

  const r = await db.execute<Record<string, any>>(sql`
    SELECT de.id AS episode_id, de.requested_item, pc.case_type AS service_type,
           f.id AS followup_id, f.closed_at, f.closed_reason, f.not_bought_reason_text,
           me.doctor_name AS exam_doctor_name, me.created_at AS exam_at
      FROM patient_device_episodes de
      JOIN patient_cases pc ON pc.id = de.case_id
      JOIN LATERAL (
        SELECT pf.id, pf.status, pf.closed_at, pf.closed_reason, pf.not_bought_reason_text,
               pf.medical_exam_id
          FROM post_exam_followups pf
         WHERE pf.device_episode_id = de.id
         ORDER BY pf.id DESC
         LIMIT 1
      ) f ON TRUE
      LEFT JOIN medical_exams me ON me.id = f.medical_exam_id
     WHERE de.patient_id = ${params.patientId}
       AND de.service_path = 'exam'
       AND de.status = 'examined'
       AND f.status = 'closed_without_purchase'
       AND ${branchClause}
       -- لا خيارَ يظهر إن كان سيرتدّ فوراً: طلبُ مراجعةٍ معلَّقٌ على هذه
       -- الحلقة بعينها (فهرسُ التفرّد uq_mrr_pending_episode سيرفضه على
       -- أي حال — هذا فحصٌ للعرض الصادق لا الحارسُ الوحيد).
       AND NOT EXISTS (
         SELECT 1 FROM medical_review_requests r
          WHERE r.device_episode_id = de.id AND r.status IN ('pending', 'escalated')
       )
     ORDER BY f.closed_at DESC NULLS LAST, f.id DESC
  `);

  const anchored = (r.rows ?? []).map((row) => ({
    episodeId: Number(row.episode_id) as number | null,
    serviceType: String(row.service_type) as "prosthetic" | "medical_support",
    requestedItem: row.requested_item ?? null,
    followupId: Number(row.followup_id),
    closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
    closedReason: row.closed_reason ?? null,
    notBoughtReasonText: row.not_bought_reason_text ?? null,
    examDoctorName: row.exam_doctor_name ?? null,
    examAt: row.exam_at ? new Date(row.exam_at).toISOString() : null,
  }));

  return [...anchored, ...(await listEligibleWithoutEpisode(params))];
}

/**
 * **القرارُ السابقُ بلا حلقة** — المصدرُ الثاني، ولا ثالثَ له.
 *
 * ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
 * الاستعلامُ أعلاه يبدأ `FROM patient_device_episodes`، فيفترض أن كلَّ قرارِ
 * «لم يشترِ» مرساتُه حلقةُ جهاز. وهذا ليس صحيحاً: توقيعُ معاينةٍ **قبل أن
 * يفتح الاستقبالُ طلبَ جهاز** مسارٌ قائمٌ ومدعوم (٤.p — `resolveExamEpisode`:
 * «صفرٌ = معاينةٌ بلا جهاز (الموروث)»)، فتُولَد المتابعةُ بـ
 * `device_episode_id IS NULL`. ثمّ يسجّل الاستقبالُ «لم يشترِ» عبر البابِ
 * الموروث (`/not-bought` يردّه ٤٠٩ لأنه ليس على مسارٍ بحلقة)، فيصير على
 * الملفّ **قرارُ رفضٍ حقيقيّ لا تراه الأهليّةُ إطلاقاً** — ويقرأ الموظّفُ
 * «لا توجد عملية سابقة مؤهلة» لمريضٍ عاد فعلاً.
 *
 * ══ ولا تُخترَع حلقة ═══════════════════════════════════════════════════
 * الصفُّ يُعرَض بهويّة **متابعته** لا بحلقةٍ لم تقع. والتنفيذُ لا يُنشئ
 * حلقةً ولا يعدّل متابعةً ولا يمسّ معاينةً — يُنشئ **طلبَ المراجعة الكاملة
 * نفسَه** بمرساةٍ على مستوى الاختصاص (`device_episode_id = NULL`)، وهو
 * الشكلُ الذي تعرفه قائمةُ عمل الطبيب أصلاً (٤.p: «الطلبُ العاري… يُدرج
 * المريضَ في القائمة صفّاً بلا حلقة»).
 *
 * ══ وليست توسعةً عمياء — أربعةُ شروطٍ تقابل شروطَ الحلقة واحداً بواحد ═══
 * ١) القرارُ `closed_without_purchase` **وهو الأحدثُ** بين متابعات هذا
 *    (المريض، الاختصاص) التي بلا حلقة — نفسُ مبدأ «أحدثُ متابعةٍ تحكم».
 * ٢) **ولا حلقةَ حيّةً على مسار المعاينة** لهذا الاختصاص: وجودُها يعني أن
 *    الصفَّ المرساةَ أعلاه هو العرضُ الدقيق، فلا يُضاف إليه عرضٌ غامض.
 * ٣) **ولا طلبَ مراجعةٍ معلَّقاً** لهذا (المريض، الاختصاص) — بأيّ مرساة:
 *    المريضُ في طابور الطبيب بالفعل، وطلبٌ ثانٍ يرتدّ على `uq_mrr_pending_bare`.
 * ٤) والفرعُ في نطاق المستخدم — من فرع المتابعة، كما يُقرأ من فرع الحلقة.
 */
async function listEligibleWithoutEpisode(params: {
  patientId: number;
  branchIds: number[] | null;
}): Promise<EligibleReturnToPurchase[]> {
  const branchClause = params.branchIds === null
    ? sql`TRUE`
    : params.branchIds.length === 0
      ? sql`FALSE`
      : sql`f.branch_id IN (${sql.join(params.branchIds.map((b) => sql`${b}`), sql`, `)})`;

  //  **`DISTINCT ON` يلتقط الأحدثَ، والفلترةُ على الحالة تأتي بعده لا قبله**:
  //  فمتابعةٌ أحدثُ بحالةٍ أخرى (حيّةٌ أو مُحوَّلة) تُسقِط الاختصاصَ كلَّه، بدل
  //  أن يُنبَش من تحتها قرارُ رفضٍ قديمٌ لم يعد آخِرَ الكلام على هذا الملفّ.
  const r = await db.execute<Record<string, any>>(sql`
    SELECT * FROM (
      SELECT DISTINCT ON (f.service_type)
             f.id AS followup_id, f.service_type, f.status AS followup_status,
             f.closed_at, f.closed_reason, f.not_bought_reason_text,
             me.doctor_name AS exam_doctor_name, me.created_at AS exam_at
        FROM post_exam_followups f
        LEFT JOIN medical_exams me ON me.id = f.medical_exam_id
       WHERE f.patient_id = ${params.patientId}
         AND f.device_episode_id IS NULL
         AND f.service_type IN ('prosthetic', 'medical_support')
         AND ${branchClause}
         --  ولا يُعرَض عرضٌ غامضٌ بجوار عرضٍ دقيق: حلقةٌ حيّةٌ على مسار
         --  المعاينة لهذا الاختصاص تعني أن المرساةَ هي البابُ الصحيح.
         AND NOT EXISTS (
           SELECT 1 FROM patient_device_episodes de
             JOIN patient_cases pc ON pc.id = de.case_id
            WHERE de.patient_id = f.patient_id
              AND pc.case_type = f.service_type
              AND de.service_path = 'exam'
              AND de.status IN ('awaiting_exam', 'examined')
         )
         --  والمريضُ ليس في طابور الطبيب أصلاً لهذا الاختصاص.
         AND NOT EXISTS (
           SELECT 1 FROM medical_review_requests r
            WHERE r.patient_id = f.patient_id
              AND r.service_type = f.service_type
              AND r.status IN ('pending', 'escalated')
         )
       ORDER BY f.service_type, f.id DESC
    ) latest
     WHERE latest.followup_status = 'closed_without_purchase'
     ORDER BY latest.closed_at DESC NULLS LAST, latest.followup_id DESC
  `);

  return (r.rows ?? [])
    .map((row) => ({
      episodeId: null,
      serviceType: String(row.service_type) as "prosthetic" | "medical_support",
      requestedItem: null,
      followupId: Number(row.followup_id),
      closedAt: row.closed_at ? new Date(row.closed_at).toISOString() : null,
      closedReason: row.closed_reason ?? null,
      notBoughtReasonText: row.not_bought_reason_text ?? null,
      examDoctorName: row.exam_doctor_name ?? null,
      examAt: row.exam_at ? new Date(row.exam_at).toISOString() : null,
    }));
}

/**
 * **«عاد للشراء» — التنفيذ الذرّي.**
 *
 * إعادةُ الحلقة إلى `awaiting_exam` (بالمخزن القانونيّ وحده) وإنشاءُ طلبِ
 * مراجعةٍ `full`/`return_to_purchase` مرساتُه هذه الحلقةُ بعينها — **في
 * معاملةٍ واحدة**، وكلُّ شرطٍ مُعاد تحقّقُه تحت القفل. فشلُ أيّ خطوةٍ يُرجع
 * الجميع: لا حلقةَ عادت بلا طلبٍ يقودها إلى الطبيب، ولا طلبَ بلا حلقةٍ
 * تنتظره.
 *
 * **بلا أثرٍ ماليّ إطلاقاً**: لا دفعةَ ولا كلفةَ ولا قيدَ دفترٍ ولا أمرَ
 * تصنيع — المتابعةُ القديمة والدفعاتُ المرتبطة بها لا تُمَسّ بحرف.
 */
export async function executeReturnToPurchase(params: {
  patientId: number;
  /** `null`/غائب ⟶ قرارٌ سابقٌ بلا حلقة، ويُحسَم بـ`followupId` وحدَه. */
  deviceEpisodeId?: number | null;
  /** هويّةُ القرارِ السابقِ بلا حلقة — تُقرأ حين لا حلقةَ. */
  followupId?: number | null;
  receptionNote?: unknown;
  createdBy: number | null;
  branchIds: number[] | null;
  /** فرعُ جلسة المنادي — لنسبة الطلب الجديد (ترحيل ٠٨٠). */
  sessionBranchId?: number | null;
}): Promise<{ reviewRequest: ReviewRow; episodeId: number | null; serviceType: string }> {
  const episodeId = numOrNull(params.deviceEpisodeId);
  if (episodeId === null) {
    return await executeReturnToPurchaseWithoutEpisode(params);
  }
  if (episodeId <= 0) {
    throw new FollowupError("معرّف الجهاز غير صالح", 400);
  }

  return await db.transaction(async (tx) => {
    // ── ١) الحلقةُ مقفولةً — الهويّةُ والحالةُ والمسارُ تحت القفل ──────────
    const epRows = await tx.execute<{
      id: number; patient_id: number; branch_id: number | null; status: string;
      service_path: string | null; case_id: number; requested_item: string | null;
    }>(sql`
      SELECT de.id, de.patient_id, de.branch_id, de.status, de.service_path,
             de.case_id, de.requested_item
        FROM patient_device_episodes de
       WHERE de.id = ${episodeId}
       FOR UPDATE
    `);
    const ep = (epRows.rows ?? [])[0];
    if (!ep) throw new FollowupError("الجهاز غير موجود", 404);
    if (Number(ep.patient_id) !== Number(params.patientId)) {
      throw new FollowupError("هذا الجهاز لا يخصّ هذا المريض", 400);
    }
    if (params.branchIds !== null && !params.branchIds.includes(Number(ep.branch_id))) {
      throw new FollowupError("غير مصرح لك بهذا الفرع", 403);
    }
    if (ep.service_path !== "exam") {
      throw new FollowupError(
        "هذا الجهاز ليس على مسار المعاينة — «عاد للشراء» لطلبات المعاينة وحدها", 409,
      );
    }
    if (ep.status !== "examined") {
      throw new FollowupError(
        "حالة الجهاز تغيّرت — لم يعد بانتظار قرار «عاد للشراء». حدّث الصفحة", 409,
      );
    }

    // ── ٢) نوعُ الخدمة من الخيط ─────────────────────────────────────────
    const csRows = await tx.execute<{ case_type: string }>(sql`
      SELECT case_type FROM patient_cases WHERE id = ${ep.case_id}
    `);
    const serviceType = (csRows.rows ?? [])[0]?.case_type;
    if (serviceType !== "prosthetic" && serviceType !== "medical_support") {
      throw new FollowupError("نوع الخدمة غير صالح لهذا الطلب", 400);
    }

    // ── ٣) آخِرُ متابعةٍ على هذه الحلقة — يجب أن تكون «لم يشترِ» بعينها ────
    //  **لا تاريخٌ بعيد**: أحدثُ متابعةٍ للحلقة وحدها تحكم — نفسُ مبدأ
    //  `purchaseGovernedByFollowup` حرفياً. متابعةٌ أحدث (نشطةٌ أو مُحوَّلة)
    //  تعني أن «لم يشترِ» لم يعد آخِرَ الكلام على هذا الجهاز.
    const fuRows = await tx.execute<{ id: number; status: string }>(sql`
      SELECT id, status FROM post_exam_followups
       WHERE device_episode_id = ${episodeId}
       ORDER BY id DESC LIMIT 1
       FOR UPDATE
    `);
    const followup = (fuRows.rows ?? [])[0];
    if (!followup || followup.status !== "closed_without_purchase") {
      throw new FollowupError(
        "لا يوجد قرارُ «لم يشترِ» مؤهَّلٌ لهذا الجهاز الآن — حدّث الصفحة", 409,
      );
    }

    // ── ٤) لا طلبَ مراجعةٍ معلَّقٍ على الحلقة نفسِها ──────────────────────
    //  فهرسُ `uq_mrr_pending_episode` سيرفض الإدراج على أي حال؛ هذا فحصٌ
    //  مبكِّرٌ يعطي رسالةً تصف الحال بدل انتظار خطأ ٢٣٥٠٥ من القاعدة.
    const dup = await tx.execute<{ id: number }>(sql`
      SELECT id FROM medical_review_requests
       WHERE device_episode_id = ${episodeId} AND status IN ('pending', 'escalated')
       LIMIT 1
    `);
    if ((dup.rows ?? []).length > 0) {
      throw new FollowupError("يوجد طلبُ مراجعةٍ معلَّقٌ بالفعل على هذا الجهاز", 409);
    }

    // ── ٥) التنفيذ — الحلقةُ ثمّ طلبُ المراجعة، معاً أو لا شيء ──────────
    await revertEpisodeToAwaitingExam(tx, episodeId);

    let reviewRequest: ReviewRow;
    try {
      reviewRequest = await createReviewRequestTx(tx, {
        patientId: params.patientId,
        serviceType,
        requestedPath: "full",
        reviewKind: "return_to_purchase",
        receptionNote: params.receptionNote,
        deviceEpisodeId: episodeId,
        createdBy: params.createdBy,
        branchIds: params.branchIds,
        //  **الطلبُ يتبع حلقتَه** — يقع في طوابير الفرع الذي يملك العملية.
        sessionBranchId: params.sessionBranchId ?? null,
        operationBranchId: ep.branch_id === null ? null : Number(ep.branch_id),
      });
    } catch (err) {
      //  ══ ترجمةٌ عند الحدود — لا نوعَ خطأٍ ثانياً يتسرّب من هذه الطبقة ══
      if (err instanceof ReviewError) throw new FollowupError(err.message, err.status);
      throw err;
    }

    return { reviewRequest, episodeId, serviceType };
  });
}

/**
 * **«عاد للشراء» لقرارٍ سابقٍ بلا حلقة** — طلبُ المراجعة وحدَه.
 *
 * ولا حلقةَ تُفتَح ولا متابعةٌ تُعدَّل ولا معاينةٌ تُمَسّ: لم تكن هناك حلقةٌ
 * قطّ، واختراعُ واحدةٍ الآن يكتب ماضياً لم يقع. الأثرُ الوحيد **صفُّ طلبِ
 * مراجعةٍ كاملة** بمرساةٍ على مستوى الاختصاص — الشكلُ الذي تعرفه قائمةُ
 * عمل الطبيب أصلاً (٤.p)، وحين يوقّع معاينتَه الثانية تُولَد متابعةٌ جديدة
 * بالمسار القائم نفسِه.
 *
 * وكلُّ شرطٍ يُعاد قراءتُه **تحت `FOR UPDATE`** لحظةَ التنفيذ، كالمسار
 * المرساة: بين العرض والضغطة قد يُفتَح طلبُ جهازٍ أو يُرسَل طلبُ مراجعة.
 */
async function executeReturnToPurchaseWithoutEpisode(params: {
  patientId: number;
  followupId?: number | null;
  receptionNote?: unknown;
  createdBy: number | null;
  branchIds: number[] | null;
  sessionBranchId?: number | null;
}): Promise<{ reviewRequest: ReviewRow; episodeId: null; serviceType: string }> {
  const followupId = numOrNull(params.followupId);
  if (followupId === null || followupId <= 0) {
    throw new FollowupError("معرّف العملية السابقة غير صالح", 400);
  }

  return await db.transaction(async (tx) => {
    // ── ١) المتابعةُ مقفولةً — الهويّةُ والحالةُ والمرساةُ تحت القفل ──────
    const fuRows = await tx.execute<{
      id: number; patient_id: number; branch_id: number | null; status: string;
      service_type: string; device_episode_id: number | null;
    }>(sql`
      SELECT id, patient_id, branch_id, status, service_type, device_episode_id
        FROM post_exam_followups
       WHERE id = ${followupId}
       FOR UPDATE
    `);
    const fu = (fuRows.rows ?? [])[0];
    if (!fu) throw new FollowupError("العملية السابقة غير موجودة", 404);
    if (Number(fu.patient_id) !== Number(params.patientId)) {
      throw new FollowupError("هذه العملية لا تخصّ هذا المريض", 400);
    }
    if (params.branchIds !== null && !params.branchIds.includes(Number(fu.branch_id))) {
      throw new FollowupError("غير مصرح لك بهذا الفرع", 403);
    }
    //  **مرساةٌ موجودة ⟶ البابُ الآخر** — لا يُحسَم جهازٌ بعينه من هنا.
    if (fu.device_episode_id !== null) {
      throw new FollowupError(
        "هذه العملية مرتبطةٌ بجهازٍ بعينه — اختر الجهاز من القائمة. حدّث الصفحة", 409,
      );
    }
    const serviceType = String(fu.service_type);
    if (serviceType !== "prosthetic" && serviceType !== "medical_support") {
      throw new FollowupError("نوع الخدمة غير صالح لهذا الطلب", 400);
    }
    if (fu.status !== "closed_without_purchase") {
      throw new FollowupError(
        "لا يوجد قرارُ «لم يشترِ» مؤهَّلٌ لهذه العملية الآن — حدّث الصفحة", 409,
      );
    }

    // ── ٢) وهي ما زالت **آخِرَ** قرارٍ بلا حلقة لهذا الاختصاص ────────────
    const latest = await tx.execute<{ id: number }>(sql`
      SELECT id FROM post_exam_followups
       WHERE patient_id = ${params.patientId}
         AND service_type = ${serviceType}
         AND device_episode_id IS NULL
       ORDER BY id DESC LIMIT 1
    `);
    if (Number((latest.rows ?? [])[0]?.id) !== followupId) {
      throw new FollowupError(
        "تغيّرت حالة الملف — لم تعد هذه آخِرَ عمليةٍ لهذا القسم. حدّث الصفحة", 409,
      );
    }

    // ── ٣) ولا حلقةَ حيّةً على مسار المعاينة لهذا الاختصاص ───────────────
    const live = await tx.execute<{ id: number }>(sql`
      SELECT de.id FROM patient_device_episodes de
        JOIN patient_cases pc ON pc.id = de.case_id
       WHERE de.patient_id = ${params.patientId}
         AND pc.case_type = ${serviceType}
         AND de.service_path = 'exam'
         AND de.status IN ('awaiting_exam', 'examined')
       LIMIT 1
    `);
    if ((live.rows ?? []).length > 0) {
      throw new FollowupError(
        "يوجد طلبُ جهازٍ قائمٌ لهذا القسم — اختر الجهاز من القائمة. حدّث الصفحة", 409,
      );
    }

    // ── ٤) ولا طلبَ مراجعةٍ معلَّقاً لهذا (المريض، الاختصاص) ─────────────
    //  `uq_mrr_pending_bare` يرفض الثانيَ على أي حال؛ هذا فحصٌ مبكِّرٌ يصف
    //  الحال بدل انتظار ٢٣٥٠٥ من القاعدة.
    const dup = await tx.execute<{ id: number }>(sql`
      SELECT id FROM medical_review_requests
       WHERE patient_id = ${params.patientId}
         AND service_type = ${serviceType}
         AND status IN ('pending', 'escalated')
       LIMIT 1
    `);
    if ((dup.rows ?? []).length > 0) {
      throw new FollowupError("يوجد طلبُ مراجعةٍ معلَّقٌ بالفعل لهذا القسم", 409);
    }

    // ── ٥) الأثرُ الوحيد ────────────────────────────────────────────────
    let reviewRequest: ReviewRow;
    try {
      reviewRequest = await createReviewRequestTx(tx, {
        patientId: params.patientId,
        serviceType,
        requestedPath: "full",
        reviewKind: "return_to_purchase",
        receptionNote: params.receptionNote,
        deviceEpisodeId: null,
        createdBy: params.createdBy,
        branchIds: params.branchIds,
        //  **والطلبُ يتبع القرارَ السابق** الذي يستأنفه.
        sessionBranchId: params.sessionBranchId ?? null,
        operationBranchId: fu.branch_id === null ? null : Number(fu.branch_id),
      });
    } catch (err) {
      if (err instanceof ReviewError) throw new FollowupError(err.message, err.status);
      throw err;
    }

    return { reviewRequest, episodeId: null, serviceType };
  });
}
