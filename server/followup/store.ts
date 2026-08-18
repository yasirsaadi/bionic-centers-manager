// طبقةُ بيانات متابعة ما بعد المعاينة.
//
// ══ قاعدةُ هذا الملفّ ═══════════════════════════════════════════════════
// **كلّ انتقالٍ يقفل صفَّه ويشترط حالته الحالية.** الموظّفون يعملون على
// النظام الآن، فضغطتان متزامنتان على «اعتماد الشراء» ليستا فرضاً نظرياً.
// ولا `last-write-wins` صامت في أي مكان: مَن وصل ثانياً يُردّ بـ409 صريحة
// تطلب تحديث الصفحة، فلا يظنّ أن فعله نفذ وهو لم ينفذ.
//
// والحراسة طبقتان لا واحدة: قفلُ الصفّ + شرطُ الحالة في التطبيق، وفهارس
// التفرّد الجزئية في القاعدة (ترحيل ٠٥٣). فلو أخطأ التطبيق يوماً بقيت
// القاعدة ترفض.
//
// ══ وما لا يفعله هذا الملفّ ═════════════════════════════════════════════
// **لا يصنع شيئاً.** اعتمادُ الشراء ينادي `storage.assignManufacturing`
// نفسها — الباب القائم الوحيد للبيع — ويمرّر إليها معاملته فيصير الأمرُ
// وسجلُّ الاعتماد حدثاً واحداً. فلا منطقَ تصنيعٍ ثانٍ يُكتب هنا ولا ينحرف
// عن الأول لاحقاً.

import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import {
  isFollowupReason, isTerminal, type FollowupReason, type FollowupStatus,
} from "@shared/followup";

/** خطأُ عملٍ بحالة HTTP — تُرجعها النقطة كما هي بدل 500. */
export class FollowupError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = "FollowupError";
    this.status = status;
  }
}

const CONFLICT = "تغيّرت حالة المتابعة بواسطة مستخدم آخر. حدّث الصفحة وحاول مجدداً.";

export interface FollowupRow {
  id: number;
  patientId: number;
  caseId: number | null;
  deviceEpisodeId: number | null;
  medicalExamId: number | null;
  branchId: number | null;
  serviceType: "prosthetic" | "medical_support";
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
  selectedExpertUserId: number | null;
  nextFollowUpAt: string | null;
  noScheduledFollowUp: boolean;
  lastReason: string | null;
  lastNote: string | null;
  lastContactAt: string | null;
  closedReason: string | null;
  closedAt: string | null;
  convertedAt: string | null;
  convertedWorkOrderId: number | null;
  createdAt: string;
  updatedAt: string;
}

const toRow = (r: any): FollowupRow => ({
  id: Number(r.id),
  patientId: Number(r.patient_id),
  caseId: r.case_id === null ? null : Number(r.case_id),
  deviceEpisodeId: r.device_episode_id === null ? null : Number(r.device_episode_id),
  medicalExamId: r.medical_exam_id === null ? null : Number(r.medical_exam_id),
  branchId: r.branch_id === null ? null : Number(r.branch_id),
  serviceType: r.service_type,
  status: r.status,
  approvedPrice: Number(r.approved_price ?? 0),
  priceSource: r.price_source,
  selectedExpertUserId: r.selected_expert_user_id === null ? null
    : Number(r.selected_expert_user_id),
  nextFollowUpAt: r.next_follow_up_at ?? null,
  noScheduledFollowUp: Boolean(r.no_scheduled_follow_up),
  lastReason: r.last_reason ?? null,
  lastNote: r.last_note ?? null,
  lastContactAt: r.last_contact_at ?? null,
  closedReason: r.closed_reason ?? null,
  closedAt: r.closed_at ?? null,
  convertedAt: r.converted_at ?? null,
  convertedWorkOrderId: r.converted_work_order_id === null ? null : Number(r.converted_work_order_id),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT_COLS = sql`id, patient_id, case_id, device_episode_id, medical_exam_id, branch_id,
  service_type, status, approved_price, price_source, selected_expert_user_id,
  next_follow_up_at,
  no_scheduled_follow_up, last_reason, last_note, last_contact_at, closed_reason,
  closed_at, converted_at, converted_work_order_id, created_at, updated_at`;

export interface Actor {
  userId: number | null;
  userName: string | null;
}

/** يُلحق حدثاً. **يُنادى داخل معاملة المُستدعي دائماً** فلا ينفصل عن انتقاله. */
async function appendEvent(tx: any, params: {
  followupId: number; patientId: number; branchId: number | null;
  eventType: string; fromStatus?: string | null; toStatus?: string | null;
  reason?: string | null; note?: string | null;
  payload?: Record<string, unknown>; actor: Actor;
}): Promise<void> {
  await tx.execute(sql`
    INSERT INTO post_exam_followup_events
      (followup_id, patient_id, branch_id, event_type, from_status, to_status,
       reason, note, payload, actor_user_id, actor_name)
    VALUES (${params.followupId}, ${params.patientId}, ${params.branchId},
            ${params.eventType}, ${params.fromStatus ?? null}, ${params.toStatus ?? null},
            ${params.reason ?? null}, ${params.note ?? null},
            ${JSON.stringify(params.payload ?? {})}::jsonb,
            ${params.actor.userId}, ${params.actor.userName})
  `);
}

/**
 * يقفل المتابعة ويشترط أن تكون في إحدى الحالات المتوقَّعة.
 *
 * **نقطةُ التسلسل الوحيدة** لكل انتقال. `FOR UPDATE` يجعل الطلب الثاني
 * ينتظر الأول ثم يقرأ حالته الجديدة — فيُردّ بدل أن يكتب فوقه.
 */
async function lockFollowup(
  tx: any, followupId: number, expect: FollowupStatus[],
): Promise<FollowupRow> {
  const r = await tx.execute(sql`
    SELECT ${SELECT_COLS} FROM post_exam_followups WHERE id = ${followupId} FOR UPDATE
  `);
  const row = (r.rows ?? [])[0];
  if (!row) throw new FollowupError("المتابعة غير موجودة", 404);
  const cur = toRow(row);
  if (!expect.includes(cur.status)) throw new FollowupError(CONFLICT, 409);
  return cur;
}

// ── الإنشاء ──────────────────────────────────────────────────────────────

/**
 * يُنشئ متابعةً للمعاينة الموقَّعة — **idempotent بالبناء لا بالفحص**.
 *
 * يُنادى داخل معاملة `createExam`، فالمعاينة ومتابعتها يولدان معاً. والتكرار
 * يصطدم بفهرس التفرّد الجزئي (`uq_pef_active_*`) فيُبتلع بـ`ON CONFLICT DO
 * NOTHING`: إعادةُ فتح الصفحة أو ضغطتان متزامنتان تُنتجان صفّاً واحداً.
 *
 * **ولا يبدأ تصنيعاً ولا يغيّر حالة الحلقة ولا يلمس المعاينة.**
 *
 * ══ وليست كلُّ معاينةِ جهازٍ نيّةَ شراء ═══════════════════════════════════
 * النظام يسمح بمعاينةٍ روتينية لمريضٍ يحمل جهازاً سُلّم له سابقاً — فحصُ
 * ملاءمة، أو شكوى، أو متابعةٌ سريرية. وفتحُ «متابعة قرار شراء» لكل معاينةٍ
 * كان سيملأ طوابير الاستعلامات بمرضى لا يشترون شيئاً، فيُبتلع فيها مَن
 * ينتظر فعلاً.
 *
 * فالقاعدة حالتان لا واحدة:
 *   (أ) معاينةٌ **طالبت بحلقةِ جهازٍ تنتظر الفحص** ⟶ متابعةٌ لذلك الجهاز،
 *       فالحلقة نفسها إعلانُ نيّةِ شراءٍ صريح سجّله الاستعلامات.
 *   (ب) بلا حلقة ⟶ **الجهاز الأول وحده**: مريضٌ لم يسبق له أمرُ بناءٍ
 *       أوّليّ قطّ في هذه الخدمة. ومَن له أمرٌ سابق — **أيّاً كانت حالته،
 *       مكتملاً أو ملغى** — معاينتُه الجديدة روتينٌ سريري حتى يفتح
 *       الاستعلامات حلقةً صراحةً.
 *
 * ولذلك يُفحص التاريخ كلّه لا الأوامر الفعّالة وحدها: أمرٌ **مكتمل** دليلُ
 * جهازٍ مسلَّم — وهو بالضبط المريض الذي لا يجوز أن تُفتح له متابعةُ بيع.
 */
export async function ensureFollowupForSignedExam(tx: any, params: {
  patientId: number;
  caseId: number | null;
  deviceEpisodeId: number | null;
  medicalExamId: number;
  branchId: number | null;
  serviceType: "prosthetic" | "medical_support";
  deviceCost: number | null;
  proposedExpertUserId?: number | null;
  actor: Actor;
}): Promise<number | null> {
  const { patientId, deviceEpisodeId, serviceType } = params;

  if (deviceEpisodeId !== null) {
    // الجهاز الذي دخل التصنيع أو سُلّم: القرار اتُّخذ، فلا متابعةَ قرار.
    const ep = await tx.execute(sql`
      SELECT status FROM patient_device_episodes WHERE id = ${deviceEpisodeId}
    `);
    const st = String((ep.rows ?? [])[0]?.status ?? "");
    if (st === "in_manufacturing" || st === "delivered" || st === "cancelled") return null;
  } else {
    // بلا حلقة: **أيُّ أمرِ بناءٍ في التاريخ** يجعلها معاينةً روتينية.
    const wo = await tx.execute(sql`
      SELECT 1 FROM prosthetic_work_orders
       WHERE patient_id = ${patientId} AND service_type = ${serviceType}
         AND COALESCE(purpose, 'initial_build') = 'initial_build'
       LIMIT 1
    `);
    if ((wo.rows ?? []).length > 0) return null;
  }

  const seedPrice = typeof params.deviceCost === "number" && params.deviceCost > 0
    ? params.deviceCost : 0;
  //  خبيرُ الطبيب المقترَح يُبذَر هنا — والاستعلامات تُبقيه أو تغيّره.
  const seedExpert = typeof params.proposedExpertUserId === "number"
    ? params.proposedExpertUserId : null;

  const ins = await tx.execute(sql`
    INSERT INTO post_exam_followups
      (patient_id, case_id, device_episode_id, medical_exam_id, branch_id,
       service_type, status, approved_price, price_source,
       selected_expert_user_id, created_by)
    VALUES (${patientId}, ${params.caseId}, ${deviceEpisodeId}, ${params.medicalExamId},
            ${params.branchId}, ${serviceType}, 'awaiting_patient_decision',
            ${seedPrice}, 'exam', ${seedExpert}, ${params.actor.userId})
    ON CONFLICT DO NOTHING
    RETURNING id
  `);
  const created = (ins.rows ?? [])[0];
  if (!created) return null; // متابعةٌ حيّةٌ قائمة — وهذا هو التفرّد يعمل.

  await appendEvent(tx, {
    followupId: Number(created.id), patientId, branchId: params.branchId,
    eventType: "followup_created", toStatus: "awaiting_patient_decision",
    payload: {
      serviceType, approvedPrice: seedPrice, medicalExamId: params.medicalExamId,
      proposedExpertUserId: seedExpert,
    },
    actor: params.actor,
  });
  return Number(created.id);
}

// ── القراءة ──────────────────────────────────────────────────────────────

export async function getFollowup(id: number): Promise<FollowupRow | null> {
  const r = await db.execute(sql`SELECT ${SELECT_COLS} FROM post_exam_followups WHERE id = ${id}`);
  const row = (r.rows ?? [])[0];
  return row ? toRow(row) : null;
}

/**
 * متابعاتُ مريضٍ واحد — للبطاقة في صفحة المريض. الحيّة أولاً.
 *
 * ومعها **لقطاتُ العرض**: طبيبُ المعاينة وتاريخُها واسمُ الخبير المختار.
 * تُقرأ هنا بـjoin واحد بدل ثلاثة طلبات من الواجهة — وأسماءٌ لا أرقام،
 * فالموظّف يقرأ «د. فلان» لا `#9864`.
 */
export async function getFollowupsForPatient(patientId: number): Promise<
  (FollowupRow & {
    examDoctorName: string | null;
    examSignedAt: string | null;
    selectedExpertName: string | null;
  })[]
> {
  const r = await db.execute(sql`
    SELECT f.id, f.patient_id, f.case_id, f.device_episode_id, f.medical_exam_id,
           f.branch_id, f.service_type, f.status, f.approved_price, f.price_source,
           f.selected_expert_user_id, f.next_follow_up_at, f.no_scheduled_follow_up,
           f.last_reason, f.last_note, f.last_contact_at, f.closed_reason,
           f.closed_at, f.converted_at, f.converted_work_order_id,
           f.created_at, f.updated_at,
           e.doctor_name AS exam_doctor_name, e.signed_at AS exam_signed_at,
           u.display_name AS selected_expert_name
      FROM post_exam_followups f
      LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
      LEFT JOIN system_users u ON u.id = f.selected_expert_user_id
     WHERE f.patient_id = ${patientId}
     ORDER BY (f.status NOT IN ('closed_without_purchase','converted')) DESC, f.id DESC
  `);
  return (r.rows ?? []).map((x: any) => ({
    ...toRow(x),
    examDoctorName: x.exam_doctor_name ?? null,
    examSignedAt: x.exam_signed_at ?? null,
    //  حسابٌ حُذف يترك رقماً بلا اسم — فيظهر الرقم ويختار الموظّف من جديد.
    selectedExpertName: x.selected_expert_name ?? null,
  }));
}

export async function getEvents(followupId: number): Promise<any[]> {
  const r = await db.execute(sql`
    SELECT id, event_type, from_status, to_status, reason, note, payload,
           actor_user_id, actor_name, created_at
      FROM post_exam_followup_events
     WHERE followup_id = ${followupId}
     ORDER BY id DESC
  `);
  return (r.rows ?? []).map((e: any) => ({
    id: Number(e.id), eventType: e.event_type, fromStatus: e.from_status,
    toStatus: e.to_status, reason: e.reason, note: e.note, payload: e.payload,
    actorUserId: e.actor_user_id === null ? null : Number(e.actor_user_id),
    actorName: e.actor_name, createdAt: e.created_at,
  }));
}

export async function getPriceRequests(followupId: number): Promise<any[]> {
  const r = await db.execute(sql`
    SELECT id, current_price, proposed_price, reason, note, status,
           requested_by, requested_by_name, requested_at,
           decided_by, decided_by_name, decided_at, decision_note
      FROM price_change_requests WHERE followup_id = ${followupId} ORDER BY id DESC
  `);
  return (r.rows ?? []).map((p: any) => ({
    id: Number(p.id), currentPrice: Number(p.current_price),
    proposedPrice: Number(p.proposed_price), reason: p.reason, note: p.note,
    status: p.status, requestedBy: p.requested_by === null ? null : Number(p.requested_by),
    requestedByName: p.requested_by_name, requestedAt: p.requested_at,
    decidedBy: p.decided_by === null ? null : Number(p.decided_by),
    decidedByName: p.decided_by_name, decidedAt: p.decided_at, decisionNote: p.decision_note,
  }));
}

/**
 * طلبُ سعرٍ بمعرّفه، ومعه فرعُ متابعته — **لفحص النطاق قبل أي كتابة**.
 *
 * الفرع يُقرأ من المتابعة لا من الطلب: طلبٌ من فرعٍ آخر يُردّ ولو ورد في
 * عنوانٍ صحيح.
 */
export async function getPriceRequestById(id: number): Promise<{
  id: number; followupId: number; branchId: number | null;
  currentPrice: number; proposedPrice: number; status: string;
} | null> {
  const r = await db.execute(sql`
    SELECT r.id, r.followup_id, r.current_price, r.proposed_price, r.status,
           f.branch_id
      FROM price_change_requests r
      JOIN post_exam_followups f ON f.id = r.followup_id
     WHERE r.id = ${id}
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  return {
    id: Number(row.id), followupId: Number(row.followup_id),
    branchId: row.branch_id === null ? null : Number(row.branch_id),
    currentPrice: Number(row.current_price), proposedPrice: Number(row.proposed_price),
    status: String(row.status),
  };
}

/**
 * السعرُ المعتمد تجارياً لجهازٍ بعينه — أو `null` إن لا متابعةَ حيّة له.
 *
 * هذه هي النقطة التي تجعل الاعتماد **ذا أثر**: «تخصيص» يقرأ منها فيحجز
 * السعر المعتمد لا سعر المعاينة الأصلي. وبدونها كان اعتماد الطبيب لتخفيضٍ
 * حبراً على ورق يتجاوزه أول حفظِ تخصيص.
 */
export async function approvedPriceFor(params: {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  deviceEpisodeId: number | null;
}): Promise<number | null> {
  const r = await db.execute(sql`
    SELECT approved_price, price_source FROM post_exam_followups
     WHERE patient_id = ${params.patientId}
       AND service_type = ${params.serviceType}
       AND status NOT IN ('closed_without_purchase', 'converted')
       AND (${params.deviceEpisodeId}::int IS NULL
            OR device_episode_id = ${params.deviceEpisodeId}::int)
     ORDER BY id DESC LIMIT 1
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  const price = Number(row.approved_price ?? 0);
  return price > 0 ? price : null;
}

/** هل لهذا الجهاز متابعةٌ حيّة — أي أن طبقة الاعتماد تحكمه. */
export async function hasActiveFollowup(params: {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
}): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM post_exam_followups
     WHERE patient_id = ${params.patientId} AND service_type = ${params.serviceType}
       AND status NOT IN ('closed_without_purchase', 'converted')
     LIMIT 1
  `);
  return (r.rows ?? []).length > 0;
}

/**
 * هل تحكم طبقةُ الاعتماد **محاولةَ الشراء الجارية** لهذا الجهاز؟
 *
 * ══ لماذا ليست `hasActiveFollowup` ═════════════════════════════════════
 * تلك تسأل «هل ثمّة مفاوضةٌ حيّة» — وهو السؤال الصحيح لحماية السعر. أمّا
 * هنا فالسؤال «هل يجوز بدء بناءٍ من نقطةٍ قديمة»، وجوابُه يختلف في حالةٍ
 * واحدة حاسمة: **`closed_without_purchase`**.
 *
 * إغلاقٌ بلا شراء يعني أن المريض **لم يشترِ**. فاعتبارُه «غير حيّ» كان
 * يفتح النقطتين القديمتين من جديد: يغلق الموظّف الملفّ ثم يبدأ بناءً
 * مباشرةً بلا موافقة مريضٍ ولا اعتماد طبيب — أي أن الإغلاق نفسه يصير
 * مفتاح التجاوز. والعودة الصحيحة: إعادةُ فتحٍ ⟶ قبول ⟶ اعتماد.
 *
 * و`converted` وحدها لا تحكم: ذلك الجهاز مرّ بالمسار الرسمي فعلاً وانتهى.
 *
 * ══ ولماذا ليست «أيُّ متابعةٍ تاريخية تمنع للأبد» ═══════════════════════
 * تلك قاعدةٌ ساذجة تحبس المريض إلى الأبد: مَن أُغلق ملفّه سنة ٢٠٢٤ لا يجوز
 * أن يُمنع جهازُه المستقلّ سنة ٢٠٢٦. فالحكم **لمحاولة الشراء الجارية
 * وحدها**:
 *   • جهازٌ حيٌّ له حلقة ⟶ تحكمه متابعةُ **تلك الحلقة** لا غير.
 *   • ولا حلقة ⟶ تحكمه **أحدثُ متابعةٍ بلا حلقة** لهذا الخيط.
 * فمريضٌ أُغلق ملفّه القديم ثم فتح الاستعلامات له حلقةَ جهازٍ جديد يخرج من
 * حكم القديمة فوراً — والحلقة نفسها هي إعلانُ المحاولة الجديدة.
 *
 * ومريضٌ **بلا متابعةٍ قطّ** لا تحكمه هذه الطبقة أصلاً: يمرّ بمساره القديم
 * حرفاً بحرف.
 */
export async function purchaseGovernedByFollowup(params: {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  /** الحلقة الحيّة إن وُجدت — يحلّها المُستدعي، ولا تُقرأ من العميل. */
  deviceEpisodeId: number | null;
}): Promise<{ governed: boolean; status: string | null }> {
  const r = params.deviceEpisodeId !== null
    ? await db.execute(sql`
        SELECT status FROM post_exam_followups
         WHERE patient_id = ${params.patientId}
           AND device_episode_id = ${params.deviceEpisodeId}
         ORDER BY id DESC LIMIT 1
      `)
    : await db.execute(sql`
        SELECT status FROM post_exam_followups
         WHERE patient_id = ${params.patientId}
           AND service_type = ${params.serviceType}
           AND device_episode_id IS NULL
         ORDER BY id DESC LIMIT 1
      `);
  const row = (r.rows ?? [])[0];
  if (!row) return { governed: false, status: null };
  const status = String(row.status);
  return { governed: status !== "converted", status };
}

// ── الانتقالات ───────────────────────────────────────────────────────────

/** تأجيل: سببٌ منظَّم + موعدٌ أو استثناءٌ صريح. */
export async function recordDeferral(params: {
  followupId: number; reason: string; note?: string | null;
  nextFollowUpAt?: string | null; noScheduledFollowUp?: boolean; actor: Actor;
}): Promise<FollowupRow> {
  if (!isFollowupReason(params.reason)) throw new FollowupError("سبب غير معروف", 400);
  const noSchedule = params.noScheduledFollowUp === true;
  const next = params.nextFollowUpAt ?? null;
  //  «مؤجَّل» بلا موعدٍ ولا استثناء حالةٌ ميتة — تُردّ هنا وتُردّ في القاعدة.
  if (!noSchedule && !next) {
    throw new FollowupError("موعد المتابعة مطلوب، أو اختر «بلا موعد متابعة» صراحةً", 400);
  }
  if (noSchedule && next) {
    throw new FollowupError("لا يجتمع موعدُ متابعةٍ مع «بلا موعد متابعة»", 400);
  }

  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approved_waiting_patient",
    ]);
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = 'follow_up', last_reason = ${params.reason},
             last_note = ${params.note ?? null}, last_contact_at = NOW(),
             next_follow_up_at = ${next}::timestamptz,
             no_scheduled_follow_up = ${noSchedule}, updated_at = NOW()
       WHERE id = ${params.followupId} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "patient_deferred", fromStatus: cur.status, toStatus: "follow_up",
      reason: params.reason, note: params.note ?? null,
      payload: { nextFollowUpAt: next, noScheduledFollowUp: noSchedule },
      actor: params.actor,
    });
    return toRow(row);
  });
}

/** «تواصلتُ معه» بلا تغيير حالة — أثرٌ في التاريخ لا انتقال. */
export async function recordContact(params: {
  followupId: number; note?: string | null; actor: Actor;
}): Promise<FollowupRow> {
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approval_pending",
      "price_approved_waiting_patient", "purchase_approval_pending",
    ]);
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups SET last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${params.followupId} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "contact_recorded", fromStatus: cur.status, toStatus: cur.status,
      note: params.note ?? null, actor: params.actor,
    });
    return toRow(row);
  });
}

/**
 * «وافق المريض على السعر المعتمد» ⟶ بانتظار اعتماد الشراء.
 *
 * **ولا يبدأ تصنيعاً**: موافقةُ المريض ليست اعتماداً، والاعتماد لطبيبٍ
 * أو مسؤول. وهذا هو الفصل الذي تقوم عليه الميزة كلّها.
 */
export async function recordPatientAcceptedPrice(params: {
  followupId: number; note?: string | null; actor: Actor;
}): Promise<FollowupRow> {
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approved_waiting_patient",
    ]);
    if (cur.approvedPrice <= 0) {
      throw new FollowupError(
        "لا يوجد سعر معتمد لهذا الجهاز — يحدّده الطبيب في المعاينة أو يُعتمد تعديلٌ للسعر", 409);
    }
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = 'purchase_approval_pending', last_contact_at = NOW(),
             last_note = ${params.note ?? null}, updated_at = NOW()
       WHERE id = ${params.followupId} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "patient_accepted_price", fromStatus: cur.status,
      toStatus: "purchase_approval_pending", note: params.note ?? null,
      payload: { acceptedPrice: cur.approvedPrice, priceSource: cur.priceSource },
      actor: params.actor,
    });
    return toRow(row);
  });
}

/** إغلاقٌ بلا شراء — **بقرار إنسان دائماً**. لا كرون يغلق أحداً. */
export async function closeWithoutPurchase(params: {
  followupId: number; reason: string; note?: string | null; actor: Actor;
}): Promise<FollowupRow> {
  if (!isFollowupReason(params.reason)) throw new FollowupError("سبب الإغلاق مطلوب", 400);
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approved_waiting_patient",
      "price_approval_pending", "purchase_approval_pending",
    ]);
    // ══ الطلب المعلَّق يُلغى **ولا يُرفض** ═══════════════════════════════
    // «مرفوض» حكمٌ على السعر لا يملكه إلا طبيبٌ أو مسؤول. وكان الإغلاق
    // يسمه `rejected` ويضع الاستعلامات أو مديرَ الفرع في `decided_by` —
    // فيظهر في التاريخ موظّفٌ ردَّ سعراً ليست له صلاحية ردّه، وهو خرقٌ
    // للقاعدة في السجلّ نفسه لا في الواجهة فقط.
    //
    // فـ`cancelled` أثرُ إغلاق الملفّ، و`rejected` يبقى **حصراً** من
    // `decidePriceChange` بيد مَن يعتمد. والمُلغي مسجَّلٌ بمن هو ولماذا.
    const cancelled = await tx.execute<{ id: number; current_price: number; proposed_price: number }>(sql`
      UPDATE price_change_requests
         SET status = 'cancelled', decided_at = NOW(), decided_by = ${params.actor.userId},
             decided_by_name = ${params.actor.userName},
             decision_note = 'أُلغي تلقائياً بإغلاق ملفّ المتابعة بلا شراء'
       WHERE followup_id = ${params.followupId} AND status = 'pending'
      RETURNING id, current_price, proposed_price
    `);
    for (const req of (cancelled.rows ?? [])) {
      await appendEvent(tx, {
        followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
        eventType: "price_request_cancelled", fromStatus: cur.status,
        toStatus: "closed_without_purchase", reason: params.reason,
        note: "أُلغي بإغلاق ملفّ المتابعة — لا يُعدّ رفضاً للسعر",
        payload: {
          requestId: Number(req.id),
          currentPrice: Number(req.current_price),
          proposedPrice: Number(req.proposed_price),
        },
        actor: params.actor,
      });
    }
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = 'closed_without_purchase', closed_reason = ${params.reason},
             closed_at = NOW(), last_reason = ${params.reason},
             last_note = ${params.note ?? null}, last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${params.followupId} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "closed_without_purchase", fromStatus: cur.status,
      toStatus: "closed_without_purchase", reason: params.reason,
      note: params.note ?? null, actor: params.actor,
    });
    return toRow(row);
  });
}

/**
 * إعادةُ الفتح — **حدثٌ جديد لا تصحيحُ قديم**.
 *
 * الصفّ نفسه يعود حيّاً وتبقى أحداثه كلّها، ويُلحق به `reopened`. ولا
 * معاينةَ تنتهي صلاحيتها: مريضٌ عاد بعد سنة معاينتُه القديمة في تاريخه،
 * والطبيب وحده يقرّر إن كان يحتاج معاينةً جديدة بمساره القائم.
 */
export async function reopen(params: {
  followupId: number; toStatus: "awaiting_patient_decision" | "follow_up";
  note?: string | null; nextFollowUpAt?: string | null;
  noScheduledFollowUp?: boolean; actor: Actor;
}): Promise<FollowupRow> {
  const next = params.nextFollowUpAt ?? null;
  const noSchedule = params.noScheduledFollowUp === true;
  if (params.toStatus === "follow_up" && !next && !noSchedule) {
    throw new FollowupError("موعد المتابعة مطلوب، أو اختر «بلا موعد متابعة» صراحةً", 400);
  }
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, ["closed_without_purchase"]);
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = ${params.toStatus}, closed_reason = NULL, closed_at = NULL,
             next_follow_up_at = ${params.toStatus === "follow_up" ? next : null}::timestamptz,
             no_scheduled_follow_up = ${params.toStatus === "follow_up" ? noSchedule : false},
             last_note = ${params.note ?? null}, updated_at = NOW()
       WHERE id = ${params.followupId} AND status = 'closed_without_purchase'
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "reopened", fromStatus: "closed_without_purchase",
      toStatus: params.toStatus, note: params.note ?? null,
      payload: { previousClosedReason: cur.closedReason },
      actor: params.actor,
    });
    return toRow(row);
  });
}

// ── الخبير ───────────────────────────────────────────────────────────────

/**
 * يغيّر الخبير المختار — **قبل التحويل فقط، وبلا أي تصنيع**.
 *
 * الاستعلامات صاحبة هذا الاختيار كما كانت دائماً: الطبيب يقترح والموظّف
 * يقرّر. ولذلك يُسمح به في كل حالةٍ حيّة — حتى وهي بانتظار اعتماد الشراء —
 * فقد يكون الخبير المقترَح في إجازة والقرار قرارُ الفرع.
 *
 * وبعد `converted` **لا يُغيَّر من هنا**: صار للجهاز أمرُ تصنيعٍ حقيقي،
 * وتحويلُ خبيره قرارُ تصنيعٍ يمرّ بنقطة إعادة الإسناد بحُرّاسها هي.
 */
export async function selectExpert(params: {
  followupId: number; expertUserId: number; actor: Actor;
}): Promise<FollowupRow> {
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approval_pending",
      "price_approved_waiting_patient", "purchase_approval_pending",
    ]);
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET selected_expert_user_id = ${params.expertUserId}, updated_at = NOW()
       WHERE id = ${params.followupId} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "expert_selected", fromStatus: cur.status, toStatus: cur.status,
      //  القيمتان معاً: «كان فلاناً فصار فلاناً» يُقرأ من سطرٍ واحد.
      payload: {
        oldExpertUserId: cur.selectedExpertUserId,
        newExpertUserId: params.expertUserId,
      },
      actor: params.actor,
    });
    return toRow(row);
  });
}

// ── السعر ────────────────────────────────────────────────────────────────

/**
 * طلبُ تعديل السعر — **اقتراحٌ لا تعديل**. السعر المعتمد لا يتحرّك بعدُ.
 *
 * والتفرّد الجزئي (`uq_pcr_one_pending`) يمنع طلبين معلّقين على متابعةٍ
 * واحدة، فلا يعتمد طبيبان طلبين متناقضين في اللحظة نفسها.
 */
export async function requestPriceChange(params: {
  followupId: number; proposedPrice: number; reason: string;
  note?: string | null; actor: Actor;
}): Promise<{ followup: FollowupRow; requestId: number }> {
  const proposed = Math.round(Number(params.proposedPrice));
  if (!Number.isFinite(proposed) || proposed < 0) {
    throw new FollowupError("السعر المقترح غير صالح", 400);
  }
  const reason = (params.reason ?? "").trim();
  if (!reason) throw new FollowupError("سبب طلب تعديل السعر مطلوب", 400);

  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, [
      "awaiting_patient_decision", "follow_up", "price_approved_waiting_patient",
    ]);
    let ins;
    try {
      ins = await tx.execute(sql`
        INSERT INTO price_change_requests
          (followup_id, patient_id, branch_id, current_price, proposed_price,
           reason, note, status, requested_by, requested_by_name)
        VALUES (${cur.id}, ${cur.patientId}, ${cur.branchId}, ${cur.approvedPrice},
                ${proposed}, ${reason}, ${params.note ?? null}, 'pending',
                ${params.actor.userId}, ${params.actor.userName})
        RETURNING id
      `);
    } catch (e: any) {
      if (e?.code === "23505") throw new FollowupError("يوجد طلب تعديل سعر معلَّق بالفعل", 409);
      throw e;
    }
    const requestId = Number((ins.rows ?? [])[0].id);
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = 'price_approval_pending', last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "price_change_requested", fromStatus: cur.status,
      toStatus: "price_approval_pending", reason, note: params.note ?? null,
      payload: { requestId, currentPrice: cur.approvedPrice, proposedPrice: proposed },
      actor: params.actor,
    });
    return { followup: toRow(row), requestId };
  });
}

/**
 * اعتمادُ التعديل أو رفضه — **طبيبٌ أو مسؤول** (تفرضه النقطة).
 *
 * والاعتماد **لا يعني شراءً**: ينقل إلى «بانتظار تأكيد المريض»، فيبقى أن
 * يوافق المريض فعلاً على السعر الجديد. والرفض يعيد المتابعة إلى حالةٍ حيّة
 * يستطيع فيها الموظّف قبول السعر الحالي أو التأجيل أو الإغلاق — لا حالةً
 * ميّتة لا مخرج منها.
 *
 * والسعرُ القديم **لا يُمحى**: لقطتُه في الطلب، وقيمتاه في الحدث.
 */
export async function decidePriceChange(params: {
  requestId: number; decision: "approve" | "reject";
  note?: string | null; actor: Actor;
}): Promise<{ followup: FollowupRow; requestId: number }> {
  return await db.transaction(async (tx) => {
    // القفلُ على الطلب أوّلاً: هو محلّ السباق (اعتمادان، أو اعتمادٌ ورفض).
    const rq = await tx.execute(sql`
      SELECT id, followup_id, status, current_price, proposed_price
        FROM price_change_requests WHERE id = ${params.requestId} FOR UPDATE
    `);
    const req = (rq.rows ?? [])[0];
    if (!req) throw new FollowupError("طلب تعديل السعر غير موجود", 404);
    if (String(req.status) !== "pending") {
      throw new FollowupError("هذا الطلب حُسم بالفعل بواسطة مستخدم آخر. حدّث الصفحة.", 409);
    }
    const followupId = Number(req.followup_id);
    const proposed = Number(req.proposed_price);

    const cur = await lockFollowup(tx, followupId, ["price_approval_pending"]);
    const approving = params.decision === "approve";

    const updReq = await tx.execute(sql`
      UPDATE price_change_requests
         SET status = ${approving ? "approved" : "rejected"}, decided_at = NOW(),
             decided_by = ${params.actor.userId}, decided_by_name = ${params.actor.userName},
             decision_note = ${params.note ?? null}
       WHERE id = ${params.requestId} AND status = 'pending'
      RETURNING id
    `);
    if ((updReq.rows ?? []).length === 0) throw new FollowupError(CONFLICT, 409);

    //  الرفض يعيدها حيّةً — والوجهة `awaiting_patient_decision` لأنها الحالة
    //  التي تسمح بكل الخيارات: قبول السعر الحالي، أو تأجيل، أو إغلاق.
    const nextStatus = approving ? "price_approved_waiting_patient" : "awaiting_patient_decision";
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = ${nextStatus},
             approved_price = ${approving ? proposed : cur.approvedPrice},
             price_source = ${approving ? "approved_change" : cur.priceSource},
             updated_at = NOW()
       WHERE id = ${followupId} AND status = 'price_approval_pending'
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);

    await appendEvent(tx, {
      followupId, patientId: cur.patientId, branchId: cur.branchId,
      eventType: approving ? "price_approved" : "price_rejected",
      fromStatus: "price_approval_pending", toStatus: nextStatus,
      note: params.note ?? null,
      //  القيمتان معاً في الحدث: «كان كذا فصار كذا» يُقرأ من سطرٍ واحد.
      payload: {
        requestId: params.requestId,
        oldPrice: cur.approvedPrice,
        newApprovedPrice: approving ? proposed : cur.approvedPrice,
        proposedPrice: proposed,
      },
      actor: params.actor,
    });
    return { followup: toRow(row), requestId: params.requestId };
  });
}

// ── اعتماد الشراء ────────────────────────────────────────────────────────

/**
 * اعتمادُ الشراء — **طبيبٌ أو مسؤول**، وهو ما يبدأ البيع فعلاً.
 *
 * ══ لماذا معاملةٌ واحدة ═══════════════════════════════════════════════
 * `converted` بلا تصنيع كذبةٌ في الشاشة، وتصنيعٌ بلا سجلِّ اعتماد ثقبٌ في
 * التدقيق. فالاثنان في معاملةٍ واحدة: تمرَّر إلى `storage.assignManufacturing`
 * نفسها — الباب القائم الوحيد للبيع — فينجحان معاً أو لا يبقى منهما شيء.
 *
 * ══ وطبقتا حمايةٍ من الضغطة المزدوجة ══════════════════════════════════
 * ١. قفلُ المتابعة + شرطُ `purchase_approval_pending`: الثاني ينتظر الأول
 *    ثم يقرأ `converted` فيُردّ بـ409.
 * ٢. وحارسُ `assignManufacturing` القائم (فحصٌ داخل المعاملة + الفهرس
 *    الجزئي من ترحيل ٠٢١/٠٥١): أمرُ بناءٍ فعّالٌ واحد لكل (مريض، خدمة).
 * فلو سقطت الأولى يوماً بقيت الثانية تمنع أمرين.
 */
export async function approvePurchase(params: {
  followupId: number; note?: string | null; actor: Actor;
}): Promise<{ followup: FollowupRow; workOrderId: number }> {
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, ["purchase_approval_pending"]);
    if (cur.approvedPrice <= 0) {
      throw new FollowupError("لا يوجد سعر معتمد — لا يُعتمد شراءٌ بلا سعر", 409);
    }

    // ══ الخبير يُقرأ من الصفّ **تحت القفل** لا من الطلب ═════════════════
    // اختيارُ الخبير عملُ الاستعلامات، والمعتمِد يعتمد ما اختاروه لا ما
    // يرسله متصفّحه. فلو قُبل رقمٌ من الجسم لصار الاعتماد باباً خلفياً
    // يسند الجهاز لخبيرٍ لم يقرّره أحد — وهذا ما يمنعه هذا السطر.
    const expertUserId = cur.selectedExpertUserId;
    if (expertUserId === null) {
      throw new FollowupError(
        "لم يُختَر خبير لهذا الجهاز — يختاره الاستعلامات قبل اعتماد الشراء", 409);
    }

    //  سجلُّ الاعتماد يُكتب **قبل** البيع وفي معاملته: فلا أمرُ تصنيعٍ
    //  يوجد يوماً بلا السطر الذي يفسّر لماذا وُجد.
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "purchase_approved", fromStatus: "purchase_approval_pending",
      toStatus: "converted", note: params.note ?? null,
      payload: {
        approvedPrice: cur.approvedPrice, priceSource: cur.priceSource,
        expertUserId,
      },
      actor: params.actor,
    });

    //  **المسار الرسمي القائم بحرفه** — لا نسخةَ منه هنا.
    const { workOrderId } = await storage.assignManufacturing({
      patientId: cur.patientId,
      serviceType: cur.serviceType,
      fields: {},
      cost: cur.approvedPrice,
      expertUserId,
      assignedBy: params.actor.userId,
      deviceEpisodeId: cur.deviceEpisodeId,
      tx,
    });

    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET status = 'converted', converted_at = NOW(),
             converted_work_order_id = ${workOrderId}, updated_at = NOW()
       WHERE id = ${cur.id} AND status = 'purchase_approval_pending'
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);

    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "converted", fromStatus: "purchase_approval_pending",
      toStatus: "converted",
      payload: { workOrderId, approvedPrice: cur.approvedPrice },
      actor: params.actor,
    });
    return { followup: toRow(row), workOrderId };
  });
}

// ── الطوابير ─────────────────────────────────────────────────────────────

const scopeClause = (scope: number[] | null) =>
  scope === null ? sql`TRUE`
    : scope.length === 0 ? sql`FALSE`
      : sql`f.branch_id IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;

/** شاشةُ «متابعة ما بعد المعاينة». `scope === null` = مسؤول، كل الفروع. */
export async function listFollowups(params: {
  scope: number[] | null;
  filter?: string;
}): Promise<any[]> {
  const f = params.filter ?? "all";
  const filterClause =
    f === "due_today" ? sql`f.status IN ('awaiting_patient_decision','follow_up')
        AND f.next_follow_up_at IS NOT NULL
        AND f.next_follow_up_at::date <= (NOW() AT TIME ZONE 'Asia/Baghdad')::date`
      : f === "overdue" ? sql`f.status IN ('awaiting_patient_decision','follow_up')
        AND f.next_follow_up_at IS NOT NULL
        AND f.next_follow_up_at::date < (NOW() AT TIME ZONE 'Asia/Baghdad')::date`
        : f === "awaiting_patient_decision" ? sql`f.status = 'awaiting_patient_decision'`
          : f === "price_approval_pending" ? sql`f.status = 'price_approval_pending'`
            : f === "price_approved_waiting_patient" ? sql`f.status = 'price_approved_waiting_patient'`
              : f === "purchase_approval_pending" ? sql`f.status = 'purchase_approval_pending'`
                : f === "follow_up" ? sql`f.status = 'follow_up'`
                  : f === "closed_without_purchase" ? sql`f.status = 'closed_without_purchase'`
                    : sql`f.status NOT IN ('converted')`;

  const r = await db.execute(sql`
    SELECT f.id, f.patient_id, f.branch_id, f.service_type, f.status,
           f.approved_price, f.price_source, f.next_follow_up_at,
           f.no_scheduled_follow_up, f.last_reason, f.last_note, f.last_contact_at,
           f.closed_reason, f.created_at,
           p.name AS patient_name, p.patient_code, p.phone,
           b.name AS branch_name,
           e.signed_at AS exam_signed_at, e.doctor_name AS exam_doctor_name
      FROM post_exam_followups f
      JOIN patients p ON p.id = f.patient_id
      LEFT JOIN branches b ON b.id = f.branch_id
      LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
     WHERE ${scopeClause(params.scope)} AND ${filterClause}
     ORDER BY
       CASE WHEN f.next_follow_up_at IS NULL THEN 1 ELSE 0 END,
       f.next_follow_up_at ASC, f.id DESC
     LIMIT 500
  `);
  return (r.rows ?? []).map((x: any) => ({
    id: Number(x.id), patientId: Number(x.patient_id),
    patientCode: x.patient_code, patientName: x.patient_name, phone: x.phone,
    branchId: x.branch_id === null ? null : Number(x.branch_id),
    branchName: x.branch_name, serviceType: x.service_type, status: x.status,
    approvedPrice: Number(x.approved_price ?? 0), priceSource: x.price_source,
    nextFollowUpAt: x.next_follow_up_at, noScheduledFollowUp: Boolean(x.no_scheduled_follow_up),
    lastReason: x.last_reason, lastNote: x.last_note, lastContactAt: x.last_contact_at,
    closedReason: x.closed_reason, createdAt: x.created_at,
    examSignedAt: x.exam_signed_at, examDoctorName: x.exam_doctor_name,
  }));
}

/** «بانتظار موافقتي» — للطبيب والمسؤول. السعرُ والشراءُ معاً. */
export async function listPendingApprovals(scope: number[] | null): Promise<{
  priceApprovals: any[]; purchaseApprovals: any[];
}> {
  const prices = await db.execute(sql`
    SELECT f.id AS followup_id, f.patient_id, f.service_type, f.branch_id, f.approved_price,
           p.name AS patient_name, p.patient_code, b.name AS branch_name,
           r.id AS request_id, r.current_price, r.proposed_price, r.reason,
           r.note, r.requested_by_name, r.requested_at
      FROM price_change_requests r
      JOIN post_exam_followups f ON f.id = r.followup_id
      JOIN patients p ON p.id = f.patient_id
      LEFT JOIN branches b ON b.id = f.branch_id
     WHERE r.status = 'pending' AND ${scopeClause(scope)}
     ORDER BY r.requested_at ASC LIMIT 200
  `);
  const purchases = await db.execute(sql`
    SELECT f.id AS followup_id, f.patient_id, f.service_type, f.branch_id, f.approved_price,
           f.price_source, f.last_contact_at, f.updated_at,
           p.name AS patient_name, p.patient_code, b.name AS branch_name,
           e.doctor_name AS exam_doctor_name
      FROM post_exam_followups f
      JOIN patients p ON p.id = f.patient_id
      LEFT JOIN branches b ON b.id = f.branch_id
      LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
     WHERE f.status = 'purchase_approval_pending' AND ${scopeClause(scope)}
     ORDER BY f.updated_at ASC LIMIT 200
  `);
  return {
    priceApprovals: (prices.rows ?? []).map((x: any) => ({
      followupId: Number(x.followup_id), requestId: Number(x.request_id),
      patientId: Number(x.patient_id),
      patientCode: x.patient_code, patientName: x.patient_name,
      branchId: x.branch_id === null ? null : Number(x.branch_id),
      branchName: x.branch_name, serviceType: x.service_type,
      currentPrice: Number(x.current_price), proposedPrice: Number(x.proposed_price),
      reason: x.reason, note: x.note, requestedByName: x.requested_by_name,
      requestedAt: x.requested_at,
    })),
    purchaseApprovals: (purchases.rows ?? []).map((x: any) => ({
      followupId: Number(x.followup_id), patientId: Number(x.patient_id),
      patientCode: x.patient_code, patientName: x.patient_name,
      branchId: x.branch_id === null ? null : Number(x.branch_id),
      branchName: x.branch_name, serviceType: x.service_type,
      approvedPrice: Number(x.approved_price ?? 0), priceSource: x.price_source,
      examDoctorName: x.exam_doctor_name, waitingSince: x.updated_at,
    })),
  };
}

export { isTerminal };
export type { FollowupReason, FollowupStatus };
