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
import { deviceDiscountRefs } from "@shared/discount";
import {
  computeCommercialPrice, isFollowupReason, isTerminal,
  type CommercialPriceChange, type FollowupReason, type FollowupStatus,
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
  /** رايةُ الطبيب «يرغب بالشراء الآن» — `null` تعني «لا إشارة» لا «رفض». */
  purchaseInterestAt: string | null;
  purchaseInterestBy: number | null;
  purchaseInterestByName: string | null;
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
  purchaseInterestAt: r.purchase_interest_at ?? null,
  purchaseInterestBy: r.purchase_interest_by === null || r.purchase_interest_by === undefined
    ? null : Number(r.purchase_interest_by),
  purchaseInterestByName: r.purchase_interest_by_name ?? null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SELECT_COLS = sql`id, patient_id, case_id, device_episode_id, medical_exam_id, branch_id,
  service_type, status, approved_price, price_source, selected_expert_user_id,
  next_follow_up_at,
  no_scheduled_follow_up, last_reason, last_note, last_contact_at, closed_reason,
  closed_at, converted_at, converted_work_order_id,
  purchase_interest_at, purchase_interest_by, purchase_interest_by_name,
  created_at, updated_at`;

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
           f.purchase_interest_at, f.purchase_interest_by, f.purchase_interest_by_name,
           f.created_at, f.updated_at,
           e.doctor_name AS exam_doctor_name, e.signed_at AS exam_signed_at,
           u.display_name AS selected_expert_name,
           cl.actor_name AS closed_by_name, cl.created_at AS closed_event_at,
           cl.note AS closed_note
      FROM post_exam_followups f
      LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
      LEFT JOIN system_users u ON u.id = f.selected_expert_user_id
      --  مَن سجّل «لم يشترِ» ومتى وبأي ملاحظة — من دفتر الأحداث نفسه.
      --  ولا جدولَ ملاحظاتٍ ثانٍ: دفترُ الأحداث يحمل الفاعل والسبب
      --  والملاحظة والزمن منذ ٠٥٣، وإنشاءُ ثانٍ يجعلهما ينحرفان.
      LEFT JOIN LATERAL (
        SELECT actor_name, created_at, note FROM post_exam_followup_events
         WHERE followup_id = f.id AND event_type = 'closed_without_purchase'
         ORDER BY id DESC LIMIT 1
      ) cl ON TRUE
     WHERE f.patient_id = ${patientId}
     ORDER BY (f.status NOT IN ('closed_without_purchase','converted','closed_exam_cancelled')) DESC, f.id DESC
  `);
  return (r.rows ?? []).map((x: any) => ({
    ...toRow(x),
    examDoctorName: x.exam_doctor_name ?? null,
    examSignedAt: x.exam_signed_at ?? null,
    //  **القرارُ يبقى مقروءاً بعد الإغلاق**: مَن سجّله ومتى وبأي ملاحظة.
    //  والملاحظةُ لا تختفي — هي في الحدث وفي `last_note` معاً.
    closedByName: x.closed_by_name ?? null,
    closedEventAt: x.closed_event_at ?? null,
    closedNote: x.closed_note ?? null,
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
       AND status NOT IN ('closed_without_purchase', 'converted', 'closed_exam_cancelled')
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
       AND status NOT IN ('closed_without_purchase', 'converted', 'closed_exam_cancelled')
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

// ── تصحيحُ الطبيب لسعره الأصلي ───────────────────────────────────────────

/**
 * **هل يجوز للطبيب أن يصحّح كلفة جهازه؟ وهل يتبعه السعرُ التجاري؟**
 *
 * ══ الواقعةُ التي بُنيت لها (لاحظها المالك على الإنتاج) ═══════════════════
 * كتب الطبيبُ ٦,٠٠٠,٠٠٠ ثم تبيّن أن الصحيح ٦,٥٠٠,٠٠٠. فتح «تعديل» على
 * معاينته وصحّحها — **ولم يتغيّر سعرُ المتابعة**. فاضطرّ المالك إلى
 * «تحديد السعر النهائي» ليصلح خطأً إملائياً في رقم.
 *
 * وهذا **خلطٌ مفهوميّ**: «تحديد السعر النهائي» قرارٌ تجاريّ لمدير الفرع —
 * «نبيعه لهذا المريض بكذا». وتصحيحُ الطبيبِ رقمَه قبل البيع ليس قراراً
 * تجارياً بل **تصحيحُ ما أراد قولَه أصلاً**.
 *
 * ══ والبيعُ وحدَه لم يعد يجمّد الرقم (تصحيحُ ٢٠٢٦-٠٨-٢٢) ═════════════════
 * الواقعةُ الثانية: وقّع الطبيبُ ١,٧٠٠,٠٠٠ وهو يقصد ١,٧٥٠,٠٠٠، فاشترى
 * المريضُ وبدأ التصنيع — ثمّ اكتُشف الخطأ. والقاعدةُ القديمة «بِيع ⟶
 * مجمَّد» كانت تقفل البابَ الصحيح وتترك المالكَ يصلح رقماً من شاشة تعديل
 * المريض العامّة، فيتحرّك مجموعُ المريض وحدَه ويبقى سعرُ المتابعة وسعرُ
 * الحلقة على الخطأ. **إخفاءُ البابِ لا يمنع التصحيح — يمنع أن يكون نظيفاً.**
 *
 * فالسؤالُ ليس «أبِيع أم لا» بل **«ممّن يأتي الرقمُ القائم؟»**:
 *   - `price_source = 'exam'` ⟶ الرقمُ ما زال رقمَ الطبيب، فتصحيحُه تصحيحُ
 *     مصدرِه — ويُنزَل على الحلقة والكلفة والمجموع والدفتر **بمعاملةٍ واحدة**.
 *   - `manager_set` / `discount_applied` / `approved_change` ⟶ **قرارٌ
 *     تجاريٌّ صريح** حلّ محلَّ رقم الطبيب. تُصحَّح المعاينةُ ولا يُمَسّ.
 *
 * ══ والشروطُ التي تُفحَص، كلٌّ منها يحمي شيئاً مختلفاً ═══════════════════
 *   ① **لا طلبَ خصمٍ معلَّق** على **هذا الجهاز بعينه**: الطلبُ محسوبٌ على
 *     الأصلي القديم، وتحريكُه تحته يغيّر ما سيوقّع عليه المعتمِد. **يُردّ.**
 *   ② **السعرُ ما زال أصلُه المعاينة** — وإلّا فالقرارُ التجاريّ سيّدُ نفسه،
 *     قبل البيع وبعده سواء. **وهذا الفحصُ يسبق فحصَ البيع** كي يقرأ الطبيبُ
 *     سببَه الحقيقيّ بدل أن يُخفيه «تم اعتماد البيع» خلفه.
 *   ③ **وبعد البيع تلزم حلقةُ جهازٍ يمكن تصحيحُها**: بلا `device_episode_id`
 *     لا هويّةَ للجهاز الذي يُصحَّح سعرُه — والمسارُ القديم (بلا حلقة) يبقى
 *     مجمَّداً بصدق، لأنه لا يملك أين يُنزِل الفرق.
 *
 * والنتائجُ ثلاثةُ أصناف: `sync` و`sync_after_sale` **تُنزلان** التصحيح ·
 * `keep_commercial` و`frozen` و`no_followup` **تُبقيان** السعرَ التجاري
 * ويمضي التصحيحُ على المعاينة وحدها · و`blocked` **تردّ**.
 */
export type ExamPriceVerdict =
  | { kind: "sync"; followupId: number; previousPrice: number }
  /**
   * بِيع الجهازُ وما زال سعرُه سعرَ المعاينة — يُصحَّح ويُنزَل على المال
   * كلِّه ذرّياً. ويحمل هويّةَ الحلقة كي لا يُبحَث عنها ثانيةً بـ(مريض+قسم).
   */
  | {
    kind: "sync_after_sale"; followupId: number; previousPrice: number;
    deviceEpisodeId: number; episodeStatus: string;
  }
  | { kind: "no_followup" }
  | { kind: "keep_commercial"; reason: string }
  | { kind: "frozen"; reason: string }
  | { kind: "blocked"; reason: string };

/** قائمةُ مراجعَ مُعلَّمةً — لا مصفوفةً يبنيها المحرّك سجلّاً لا نصّاً. */
const refList = (refs: string[]) => sql.join(refs.map((r) => sql`${r}`), sql`, `);

/** مراجعُ الجهاز من صفٍّ خام — نفسُ القاعدة المشتركة، بلا تحويلٍ كامل. */
function refsForRow(row: any): string[] {
  return deviceDiscountRefs({
    followupId: Number(row.id),
    deviceEpisodeId: row.device_episode_id === null || row.device_episode_id === undefined
      ? null : Number(row.device_episode_id),
    serviceType: String(row.service_type),
  });
}

export async function classifyExamPriceChange(params: {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  deviceEpisodeId: number | null;
}): Promise<ExamPriceVerdict> {
  const r = params.deviceEpisodeId !== null
    ? await db.execute(sql`
        SELECT id, status, approved_price, price_source, converted_work_order_id,
               device_episode_id, service_type
          FROM post_exam_followups
         WHERE patient_id = ${params.patientId}
           AND device_episode_id = ${params.deviceEpisodeId}
         ORDER BY id DESC LIMIT 1
      `)
    : await db.execute(sql`
        SELECT id, status, approved_price, price_source, converted_work_order_id,
               device_episode_id, service_type
          FROM post_exam_followups
         WHERE patient_id = ${params.patientId}
           AND service_type = ${params.serviceType}
           AND device_episode_id IS NULL
         ORDER BY id DESC LIMIT 1
      `);
  const row = (r.rows ?? [])[0] as any;
  //  لا متابعة: معاينةٌ روتينية أو ملفٌّ قديم — لا شيء يُزامَن، ولا شيء
  //  يُمنَع. التصحيحُ يمضي على المعاينة وحدها.
  if (!row) return { kind: "no_followup" };

  // ④ **الطلبُ المعلَّق يردّ** — وهو الفحصُ الأسبق لأنه الوحيد الذي يمنع.
  //
  //  **ومرجعُ الجهاز بعينه لا المريضَ كلَّه**: العائدُ يملك أكثر من جهاز،
  //  وخصمٌ معلَّقٌ على طرفِه الأول لا علاقةَ له بتصحيح سعر الثاني. وكان
  //  الفحصُ بـ(مريض + قسم) يجمّد الجهاز الثاني بسبب الأول.
  const pend = await db.execute(sql`
    SELECT id FROM service_discount_requests
     WHERE patient_id = ${params.patientId}
       AND department = ${params.serviceType}
       AND status = 'pending'
       AND context_ref IN (${refList(refsForRow(row))})
     LIMIT 1
  `);
  if ((pend.rows ?? []).length > 0) {
    return {
      kind: "blocked",
      reason: "يوجد طلب خصم بانتظار الاعتماد محسوبٌ على السعر السابق —"
        + " احسم الطلب (اعتماداً أو رفضاً أو إلغاءً) ثم صحّح السعر."
        + " ويمكنك تعديل بقية المعاينة الآن بلا تغيير السعر.",
    };
  }

  // ② خصمٌ اعتُمد، أو قرارٌ تجاريٌّ صريح حلّ محلّ سعر المعاينة.
  //
  //  **وهذا يسبق فحصَ البيع عمداً**: القرارُ التجاريُّ سيّدُ نفسه قبل البيع
  //  وبعده سواء، وترتيبُه بعد البيع كان يُخفيه خلف «تم اعتماد البيع» —
  //  فيقرأ الطبيبُ سبباً غيرَ سببه ويظنّ أن البيعَ هو المانع.
  const source = String(row.price_source ?? "exam");
  if (source !== "exam") {
    //  **والعبارةُ تقول ما وقع وما لم يقع**: المستخدم يجب ألّا يظنّ أن
    //  السعرَ التجاري تحرّك وهو لم يتحرّك.
    return {
      kind: "keep_commercial",
      reason: "تم تصحيح سعر المعاينة، لكن السعر التجاري المعتمد بقي كما هو"
        + " لأنه عُدّل بقرار تجاري مستقل."
        + (source === "discount_applied" ? " (السعر الحالي خصمٌ معتمَد)" : ""),
    };
  }

  // ③ بِيع الجهازُ وسعرُه ما زال سعرَ المعاينة ⟶ **يُصحَّح ويُنزَل**.
  if (String(row.status) === "converted" || row.converted_work_order_id !== null) {
    //  **وهويّةُ الجهاز شرطٌ لا تحسين**: الفرقُ يُنزَل على حلقةٍ بعينها
    //  (§٥)، فبلا حلقةٍ لا مكانَ نظيفاً له. والمسارُ القديم يبقى مجمَّداً
    //  بصدق بدل أن يُخمَّن له جهازٌ بـ(مريض + قسم) فيُصاب غيرُ المقصود.
    const episodeId = row.device_episode_id === null || row.device_episode_id === undefined
      ? null : Number(row.device_episode_id);
    if (episodeId === null) {
      return {
        kind: "frozen",
        reason: "تم اعتماد البيع على مسار قديم بلا هويّة جهاز —"
          + " تصحيح السعر هنا لا يعرف أين يُنزل الفرق. راجع الإدارة.",
      };
    }
    const ep = await db.execute(sql`
      SELECT status FROM patient_device_episodes WHERE id = ${episodeId} LIMIT 1
    `);
    const st = (ep.rows ?? [])[0]?.status;
    const status = st === null || st === undefined ? null : String(st);
    //  والحلقةُ يجب أن تكون فعلاً في التصنيع أو مسلَّمة: `converted` مع
    //  حلقةٍ ملغاة أو تنتظر الفحص حالٌ غيرُ متّسقة، والتخمينُ فيها أسوأ
    //  من الردّ. ولا تُلمَس حالةُ الحلقة هنا ولا هناك — الغرضُ سعرُها.
    if (status !== "in_manufacturing" && status !== "delivered") {
      return {
        kind: "frozen",
        reason: "حالة طلب الجهاز لا تسمح بتصحيح السعر الآن —"
          + " حدّث الصفحة، وإن تكرّر فراجع الإدارة.",
      };
    }
    return {
      kind: "sync_after_sale", followupId: Number(row.id),
      previousPrice: Number(row.approved_price ?? 0),
      deviceEpisodeId: episodeId, episodeStatus: status,
    };
  }

  return {
    kind: "sync", followupId: Number(row.id),
    previousPrice: Number(row.approved_price ?? 0),
  };
}

/**
 * **يُنزل تصحيحَ الطبيب على السعر التجاري** — بحدثٍ يقرأه الجميع.
 *
 * ══ يُنادى **داخل معاملة تنقيح المعاينة نفسها** ═══════════════════════
 * كان يُنادى بعدها: تُحفَظ النسخةُ الجديدة أوّلاً، ثم يُحاوَل التزامن. وسقوطُ
 * الثانية كان يترك النظام في حالٍ لا يجوز أن توجد — معاينةٌ تقول ٦,٥٠٠,٠٠٠
 * ومتابعةٌ تقول ٦,٠٠٠,٠٠٠، والاستعلاماتُ تقبض على الثانية. فصارتا معاملةً
 * واحدة: تنجحان معاً أو تسقطان معاً، ويبقى الرقمُ القديم في الاثنين.
 *
 * ══ ويُعيد فحصَ الشروط **تحت القفل** ═══════════════════════════════════
 * التصنيفُ (`classifyExamPriceChange`) لقطةٌ بلا قفل، وبينها وبين الكتابة
 * قد يعتمد أحدٌ خصماً أو يؤكّد شراءً أو **يفتح طلبَ خصمٍ محسوباً على الرقم
 * القديم**. والقفلُ على صفّ المتابعة هو نقطةُ التسلسل التي يشترك فيها
 * البابان: `requestDiscount` يأخذه أيضاً قبل أن يكتب طلبَه.
 *
 * **ويُرمى ولا يُرجَع `null`**: النداءُ داخل معاملةٍ تحمل تنقيحَ المعاينة،
 * فالرميُ وحده يُرجِعها — و«لم أفعل شيئاً» بصمتٍ كان يترك النسخةَ محفوظة.
 */
export async function applyExamPriceCorrection(params: {
  followupId: number; newPrice: number; actor: Actor; tx?: any;
}): Promise<FollowupRow> {
  const price = Number(params.newPrice);
  if (!Number.isInteger(price) || price <= 0) {
    throw new FollowupError("كلفة الجهاز يجب أن تكون مبلغاً موجباً بالدينار الصحيح", 400);
  }
  const DRIFT = "تغيّرت حالة الملفّ التجاري أثناء الحفظ — لم يُعدَّل شيء. حدّث الصفحة وأعد المحاولة.";
  const body = async (tx: any) => {
    const cur = await lockFollowup(tx, params.followupId, PRICEABLE);
    //  **الشروطُ تُعاد تحت القفل**: التصنيفُ لقطةٌ قد تشيخ.
    if (cur.priceSource !== "exam" || cur.convertedWorkOrderId !== null) {
      throw new FollowupError(DRIFT, 409);
    }
    if (cur.approvedPrice === price) throw new FollowupError(DRIFT, 409);
    //  **وطلبُ الخصم المعلَّق يُفحَص هنا** لا في التصنيف وحده: هو الطرفُ
    //  الآخر من السباق، وقد وُلد بعد التصنيف وقبل هذا السطر. وتحريكُ
    //  الأصلِ تحته يجعل خصماً معتمَداً يُحسَب على رقمٍ لم يعد قائماً.
    //  **وبمرجع هذه المتابعة وحدها** — لا بكلّ طلبات المريض: العائدُ يملك
    //  أكثر من جهاز، والخصمُ على أحدهما لا يمسّ الآخر.
    const pend = await tx.execute(sql`
      SELECT id FROM service_discount_requests
       WHERE patient_id = ${cur.patientId}
         AND department = ${cur.serviceType}
         AND status = 'pending'
         AND context_ref IN (${refList(deviceDiscountRefs({
           followupId: cur.id, deviceEpisodeId: cur.deviceEpisodeId,
           serviceType: cur.serviceType,
         }))})
       LIMIT 1
    `);
    if ((pend.rows ?? []).length > 0) {
      throw new FollowupError(
        "فُتح طلب خصم على السعر السابق أثناء الحفظ — لم يُعدَّل شيء."
        + " احسم الطلب ثم صحّح السعر.", 409,
      );
    }
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET approved_price = ${price}, updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
         AND price_source = 'exam' AND converted_work_order_id IS NULL
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(DRIFT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      //  **نوعٌ خاصٌّ به لا `commercial_price_set`**: ذاك قرارُ مديرٍ
      //  تجاريّ، وهذا تصحيحُ طبيبٍ لرقمه. وخلطُهما كان سيجعل التقرير يقرأ
      //  تصحيحاً إملائياً قراراً تجارياً.
      eventType: "exam_price_corrected",
      fromStatus: cur.status, toStatus: cur.status,
      payload: {
        previousPrice: cur.approvedPrice, finalPrice: price,
        previousPriceSource: cur.priceSource,
        setByUserId: params.actor.userId, setByName: params.actor.userName,
      },
      actor: params.actor,
    });
    return toRow(row);
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

/**
 * **تصحيحُ سعر جهازٍ بِيع فعلاً — بمعاملةٍ واحدة تشمل المالَ كلَّه.**
 *
 * ══ الواقعة ═════════════════════════════════════════════════════════════
 * وقّع الطبيبُ ١,٧٠٠,٠٠٠ وهو يقصد ١,٧٥٠,٠٠٠. اشترى المريضُ وبدأ التصنيع،
 * ثمّ اكتُشف الخطأ. والبابُ الصحيح كان مقفلاً، فصُحّح الرقمُ من شاشة تعديل
 * المريض العامّة: تحرّك `patients.total_cost` وحدَه، وبقيت المتابعةُ
 * والحلقةُ وكلفةُ الخيط على الرقم الخطأ. **بابٌ مقفلٌ لا يمنع التصحيح —
 * يمنع أن يقع في مكانٍ واحد.**
 *
 * ══ ستّةُ مواضعَ تتحرّك معاً أو لا يتحرّك شيء ════════════════════════════
 * المتابعة · الحلقة · كلفةُ الخيط · مجموعُ المريض · قيدُ الدفتر · الحدث.
 * والمعاينةُ وتدقيقُها من المُستدعي **داخل المعاملة نفسها** — فالسبعةُ
 * ذرّةٌ واحدة. وسقوطُ أيّها يُرجِع الجميعَ إلى الرقم القديم المتّسق.
 *
 * ══ والفروقُ تُضاف ولا تُكتب فوق ═══════════════════════════════════════
 * `patient_cases.cost` تراكمُ الخيط كلِّه و`patients.total_cost` تراكمُ
 * الملفّ كلِّه: كتابةُ سعر الجهاز عليهما تبتلع كلَّ ما قبله. فيُحسب الفرقُ
 * ويُضاف — وهو مبدأُ `assignManufacturing` نفسُه، مُعاداً استعمالُه لا
 * منسوخاً: تلك تبيع، وهذه تصحّح رقماً مباعاً.
 *
 * ══ ولا يُخمَّن اتّساقُ ما لم نكتبه نحن ═════════════════════════════════
 * الشرطُ الوحيد هو **تطابقُ سعر المتابعة وسعر الحلقة** — وهما رقمان
 * يكتبهما مسارُ البيع نفسه في معاملةٍ واحدة، فاختلافُهما خللٌ تاريخيّ
 * يُردّ ليراه إنسان. أمّا `total_cost` فلا يُقارَن بشيء: المالكُ صحّح ملفّاتٍ
 * يدوياً من الشاشة العامّة، ومريضٌ صحيحُ الحلقة لا يجوز أن يُمنَع لأن
 * مجموعَه لا يطابق فرضاً. **يُضاف الفرقُ ولا يُدّعى علمٌ بالماضي.**
 */
export async function applyExamPriceCorrectionAfterSale(params: {
  followupId: number;
  /** المعاينةُ التي يُصحَّح سعرُها — تُطابَق بالهويّة تحت القفل. */
  medicalExamId: number;
  examDeviceEpisodeId: number | null;
  newPrice: number;
  /** إلزاميٌّ: تصحيحُ مالٍ بعد البيع لا يقع بلا سببٍ مكتوب. */
  reason: string;
  actor: Actor;
  tx: any;
}): Promise<{ followup: FollowupRow; delta: number; deviceEpisodeId: number }> {
  const price = Number(params.newPrice);
  if (!Number.isInteger(price) || price <= 0) {
    throw new FollowupError("كلفة الجهاز يجب أن تكون مبلغاً موجباً بالدينار الصحيح", 400);
  }
  const reason = (params.reason ?? "").trim();
  if (reason.length === 0) {
    throw new FollowupError(
      "تصحيح سعر جهاز بعد البيع يتطلّب سبباً مكتوباً — اكتب سبب التصحيح ثم أعد المحاولة", 400,
    );
  }
  const DRIFT = "تغيّرت حالة الملفّ التجاري أثناء الحفظ — لم يُعدَّل شيء. حدّث الصفحة وأعد المحاولة.";
  const tx = params.tx;
  const {
    lockEpisodeForPriceCorrection, correctEpisodeAgreedCost, PRICE_CORRECTABLE_STATUSES,
  } = await import("../device_episodes/store");

  // ① المتابعةُ تُقفَل **بلا شرط حالة**: البيعُ هو الحالُ المقصود هنا،
  //    و`PRICEABLE` تستثنيه عمداً لأنها للتسعير قبل البيع.
  const r = await tx.execute(sql`
    SELECT ${SELECT_COLS} FROM post_exam_followups WHERE id = ${params.followupId} FOR UPDATE
  `);
  const curRow = (r.rows ?? [])[0];
  if (!curRow) throw new FollowupError("المتابعة غير موجودة", 404);
  const cur = toRow(curRow);

  // ② **وأنها متابعةُ هذه المعاينة بعينها** — لا أوّلُ متابعةٍ للمريض.
  const belongs = (cur.medicalExamId !== null && cur.medicalExamId === params.medicalExamId)
    || (params.examDeviceEpisodeId !== null && cur.deviceEpisodeId === params.examDeviceEpisodeId);
  if (!belongs) throw new FollowupError(DRIFT, 409);

  // ③ الشروطُ تُعاد **تحت القفل**: التصنيفُ لقطةٌ قد تشيخ.
  if (cur.priceSource !== "exam") throw new FollowupError(DRIFT, 409);
  const sold = cur.status === "converted" || cur.convertedWorkOrderId !== null;
  if (!sold) throw new FollowupError(DRIFT, 409);
  if (cur.deviceEpisodeId === null) throw new FollowupError(DRIFT, 409);
  if (cur.approvedPrice === price) throw new FollowupError(DRIFT, 409);

  // ④ الحلقةُ تُقفَل ويُتحقَّق انتماؤها — مريضاً وخيطاً وحالة.
  const ep = await lockEpisodeForPriceCorrection(tx, cur.deviceEpisodeId);
  if (!ep) throw new FollowupError(DRIFT, 409);
  if (ep.patientId !== cur.patientId || (cur.caseId !== null && ep.caseId !== cur.caseId)) {
    throw new FollowupError(DRIFT, 409);
  }
  if (!(PRICE_CORRECTABLE_STATUSES as readonly string[]).includes(ep.status)) {
    throw new FollowupError(DRIFT, 409);
  }

  // ⑤ **ولا يُصحَّح ملفٌّ رقماه مختلفان أصلاً**: المتابعةُ والحلقةُ يكتبهما
  //    مسارُ البيع في معاملةٍ واحدة، فاختلافُهما خللٌ سابق. وإضافةُ فرقٍ
  //    فوق خللٍ تُنتج رقماً ثالثاً لا يفسّره أحد.
  if (ep.agreedCost !== cur.approvedPrice) {
    throw new FollowupError(
      "سعر المتابعة وسعر طلب الجهاز غير متطابقين في هذا الملفّ"
      + ` (${cur.approvedPrice.toLocaleString("en-US")} مقابل ${ep.agreedCost.toLocaleString("en-US")} د.ع)`
      + " — يحتاج مراجعة إدارية قبل التصحيح.", 409,
    );
  }

  // ⑥ وطلبُ الخصم المعلَّق **بمرجع هذا الجهاز وحده** — الطرفُ الآخر من
  //    السباق: قد وُلد بعد التصنيف وقبل هذا السطر.
  const pend = await tx.execute(sql`
    SELECT id FROM service_discount_requests
     WHERE patient_id = ${cur.patientId}
       AND department = ${cur.serviceType}
       AND status = 'pending'
       AND context_ref IN (${refList(deviceDiscountRefs({
         followupId: cur.id, deviceEpisodeId: cur.deviceEpisodeId,
         serviceType: cur.serviceType,
       }))})
     LIMIT 1
  `);
  if ((pend.rows ?? []).length > 0) {
    throw new FollowupError(
      "فُتح طلب خصم على السعر السابق أثناء الحفظ — لم يُعدَّل شيء."
      + " احسم الطلب ثم صحّح السعر.", 409,
    );
  }

  const delta = price - cur.approvedPrice;

  // ⑦ المتابعة — بشرطٍ في `WHERE` يمنع الكتابةَ فوق تغيّرٍ متزامن.
  const upd = await tx.execute(sql`
    UPDATE post_exam_followups
       SET approved_price = ${price}, updated_at = NOW()
     WHERE id = ${cur.id} AND status = ${cur.status}
       AND price_source = 'exam' AND approved_price = ${cur.approvedPrice}
    RETURNING ${SELECT_COLS}
  `);
  const row = (upd.rows ?? [])[0];
  if (!row) throw new FollowupError(DRIFT, 409);

  // ⑧ الحلقة — سعرُها وحدَه. **ولا حالةَ تُلمَس**: جهازٌ سُلِّم يبقى مسلَّماً.
  const moved = await correctEpisodeAgreedCost(tx, {
    episodeId: ep.id, agreedCost: price, expectStatus: ep.status,
  });
  if (!moved) throw new FollowupError(DRIFT, 409);

  // ⑨ كلفةُ الخيط ومجموعُ المريض — **زيادةٌ ذرّية في القاعدة** لا كتابةُ
  //    قيمةٍ قُرئت سلفاً: خيطان يتحرّكان معاً لا يمحو أحدُهما الآخر.
  if (delta !== 0) {
    if (cur.caseId !== null) {
      await tx.execute(sql`
        UPDATE patient_cases
           SET cost = GREATEST(0, COALESCE(cost, 0) + ${delta}),
               cost_source = 'manual', updated_at = NOW()
         WHERE id = ${cur.caseId}
      `);
    }
    await tx.execute(sql`
      UPDATE patients
         SET total_cost = GREATEST(0, COALESCE(total_cost, 0) + ${delta})
       WHERE id = ${cur.patientId}
    `);
    // ⑩ قيدٌ **مؤرَّخٌ موقَّع** — والأصلُ لا يُعاد كتابتُه ولا يُحذف: بيعُ
    //    الأمس وقع بسعره، وتصحيحُ اليوم حدثُ اليوم. فيقرأ التقريرُ الاثنين.
    await tx.execute(sql`
      INSERT INTO cost_entries
        (patient_id, branch_id, amount, source, case_id, device_episode_id, notes)
      VALUES (${cur.patientId}, ${cur.branchId}, ${delta}, 'exam_price_correction',
              ${cur.caseId}, ${ep.id}, ${"تصحيح سعر المعاينة بعد البيع — " + reason})
    `);
  }

  // ⑪ الحدثُ نفسُه الذي يقرأه الجميع، موسوماً بأنه وقع بعد البيع.
  await appendEvent(tx, {
    followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
    eventType: "exam_price_corrected",
    fromStatus: cur.status, toStatus: cur.status,
    note: reason,
    payload: {
      previousPrice: cur.approvedPrice, finalPrice: price, delta,
      previousPriceSource: cur.priceSource,
      afterSale: true, deviceEpisodeId: ep.id, episodeStatus: ep.status,
      correctionReason: reason,
      setByUserId: params.actor.userId, setByName: params.actor.userName,
    },
    actor: params.actor,
  });

  return { followup: toRow(row), delta, deviceEpisodeId: ep.id };
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
 * «وافق المريض على السعر المعتمد» ⟶ `purchase_approval_pending`.
 *
 * ══ مسارٌ متروك — للتوافق الرجعي وحده ═════════════════════════════════
 * **لا تناديه الواجهة بعد اليوم**، وبابُ العمل صار `confirmPurchase`:
 * الموظّف يسجّل الشراء فيقع البيع في الحال. وهذه تبقى لأن نافذةً مفتوحةً
 * منذ ما قبل النشر قد تُرسل إليها، ولأن حذفها كان سيكسر عميلاً قديماً بلا
 * فائدة.
 *
 * وما تُنتجه **ليس طريقاً مسدوداً**: `purchase_approval_pending` صارت
 * ضمن `CONFIRMABLE`، فالموظّف يستأنف منها بضغطةٍ واحدة.
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
        "لا يوجد سعر معتمد لهذا الجهاز — يحدّده الطبيب في المعاينة، أو يُدخله الاستعلامات عند تأكيد الشراء", 409);
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
 * الصفّ نفسه يعود حيّاً وتبقى أحداثه كلّها، ويُلحق به `reopened`.
 *
 * ══ ولا بوّابةَ طبيبٍ هنا — وهذا مقصود ══════════════════════════════════
 * مريضٌ لم يشترِ في آذار وعاد في أيّار **لا يحتاج معاينةً جديدة لأن الوقت
 * مرّ**. معاينتُه في تاريخه، والجهازُ هو الجهاز. فالموظّف يعيد فتح الملفّ،
 * ومديرُ الفرع يحدّث السعر إن تغيّر، والاستقبال يبيع. ولا مرحلةَ زمنيةٍ
 * تُسقِط قراراً سريرياً صحيحاً.
 *
 * وإن كان هناك **سببٌ سريريّ فعلي** — جهازٌ آخر، أو حالةٌ تبدّلت — فذلك
 * مسارٌ سريريٌّ يبدأ صراحةً بمعاينةٍ جديدة، لا بابٌ يفتحه مرورُ الأيام.
 *
 * **ورايةُ «يرغب بالشراء الآن» تُنزَع**: دورةٌ جديدة تبدأ بلا إشارةٍ من
 * دورةٍ انتهت — وإلّا ظهر الملفُّ في رأس طابور الاستعلامات برغبةٍ قالها
 * المريضُ قبل شهرين وعدل عنها.
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
             purchase_interest_at = NULL, purchase_interest_by = NULL,
             purchase_interest_by_name = NULL,
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

// ── إشارةُ الطبيب ────────────────────────────────────────────────────────

/** الحالاتُ الحيّة التي تُرفع فيها الراية — والمنتهيتان خارجها بداهةً. */
//  **هي الحالاتُ الحيّة الثلاث بعينها** التي تعرض فيها `allowedActions`
//  الزرّ — فلا يقبل الخادمُ ما لا تعرضه الشاشة ولا العكس.
const SIGNALABLE: FollowupStatus[] = [
  "awaiting_patient_decision", "follow_up", "price_approved_waiting_patient",
];

/**
 * «المريض يرغب بالشراء الآن» — **رايةُ تسليمٍ إلى الاستعلامات**.
 *
 * ══ ولا تفعل شيئاً غير ذلك ══════════════════════════════════════════════
 * لا حالةَ تتغيّر · لا سعرَ يتحرّك · لا كلفةَ تُقيَّد · لا تصنيعَ يبدأ · لا
 * دفعةَ تُنشأ. الملفُّ يبقى **بانتظار قرار المريض** كما كان، ويظهر في
 * طابور الاستعلامات مرفوعَ الراية فيُتَّصَل به أوّلاً.
 *
 * ══ ولماذا لا تُرفع مرّتين ═════════════════════════════════════════════
 * الضغطةُ المكرّرة **لا تُنشئ حدثاً ثانياً** ولا تغيّر صاحبَ الراية: أوّلُ
 * مَن رفعها هو مَن رفعها. فلا يمتلئ التاريخ بضجيجِ نقرات، ولا ينسب
 * السجلُّ الإشارةَ إلى آخر مَن مرّ عليها.
 *
 * وتُنزَع عند إعادة الفتح: دورةٌ تجاريةٌ جديدة تبدأ بلا رايةٍ من دورةٍ
 * انتهت قبل شهرين.
 */
export async function signalPurchaseInterest(params: {
  followupId: number; note?: string | null; actor: Actor;
}): Promise<{ followup: FollowupRow; alreadySignaled: boolean }> {
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, SIGNALABLE);
    //  مرفوعةٌ من قبل: تُعاد كما هي بلا حدثٍ ثانٍ — idempotent صريحة.
    if (cur.purchaseInterestAt !== null) {
      return { followup: cur, alreadySignaled: true };
    }
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET purchase_interest_at = NOW(),
             purchase_interest_by = ${params.actor.userId},
             purchase_interest_by_name = ${params.actor.userName},
             updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
         AND purchase_interest_at IS NULL
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      //  **والحالةُ لا تتغيّر**: `fromStatus === toStatus` عمداً، فالحدث
      //  يقول «وقع شيء» لا «انتقل الملفّ».
      eventType: "purchase_interest_signaled",
      fromStatus: cur.status, toStatus: cur.status, note: params.note ?? null,
      payload: { approvedPrice: cur.approvedPrice, priceSource: cur.priceSource },
      actor: params.actor,
    });
    return { followup: toRow(row), alreadySignaled: false };
  });
}

// ── السعر التجاري ────────────────────────────────────────────────────────

/** الحالاتُ الحيّة التي يُحدَّد فيها السعر التجاري. */
const PRICEABLE: FollowupStatus[] = [
  "awaiting_patient_decision", "follow_up",
  //  توافقٌ رجعي: صفوفٌ حُسمت أو احتُجزت بالمسار القديم يبقى الفرعُ قادراً
  //  على تسعيرها — وإلّا تجمّدت بانتظار مسارٍ لم يعد قائماً.
  "price_approved_waiting_patient", "purchase_approval_pending",
];

/**
 * **تحديدُ السعر التجاري النهائي — قرارٌ لا طلب.**
 *
 * ══ ما زال ══════════════════════════════════════════════════════════════
 * صفُّ طلبٍ يُنشأ · حالةٌ `price_approval_pending` تُحتجز · طابورٌ ينتظر
 * طبيباً · واعتمادٌ يُضغط. كلُّ ذلك كان يقف بين المريض وقرارٍ **تجاريّ**
 * اتّخذه مديرُ الفرع أصلاً في المكالمة نفسها.
 *
 * ══ وما بقي ═════════════════════════════════════════════════════════════
 * كتابةٌ واحدةٌ تحت القفل: `approved_price` و`price_source = manager_set`.
 * وحدثٌ واحد يحمل **كلّ ما يحتاجه المراجع بعد سنة**: السعرين والفرقَ
 * ونسبتَه والسببَ والملاحظةَ والفاعلَ ورقمَه واسمَه وزمنَه. ولا جدولَ
 * ثانٍ: `post_exam_followup_events` هو دفترُ هذا الملفّ منذ ٠٥٣، وحقيقةٌ
 * ماليةٌ ثانيةٌ تنحرف عن الأولى يوماً.
 *
 * ══ ولا دينارَ يتحرّك هنا ═══════════════════════════════════════════════
 * **لا كلفةَ مريض ولا كلفةَ حالة ولا قيدَ دفتر ولا دفعةَ ولا أمرَ تصنيع.**
 * السعرُ رقمٌ محفوظٌ ينتظر أن يقول المريضُ نعم؛ وحين يقولها يؤكّد الموظّف
 * الشراءَ فيصير الرقمُ مالاً — في تلك اللحظة وحدها.
 */
export async function setCommercialPrice(params: {
  followupId: number; finalPrice: number; reason?: string | null;
  note?: string | null; actor: Actor;
}): Promise<{ followup: FollowupRow; change: CommercialPriceChange }> {
  const reason = (params.reason ?? "").trim();
  return await db.transaction(async (tx) => {
    const cur = await lockFollowup(tx, params.followupId, PRICEABLE);

    //  **الحسابُ تحت القفل على السعر المقفول**: لو حُسب قبله لأمكن أن
    //  يُسجَّل فرقٌ نُسب إلى سعرٍ تغيّر بينهما.
    const change = computeCommercialPrice({
      previousPrice: cur.approvedPrice, finalPrice: Number(params.finalPrice),
    });
    if (!change.ok) throw new FollowupError(change.error ?? "السعر غير صالح", 400);
    //  والسببُ إلزاميٌّ **عند التغيير وحده**: تأكيدُ الرقم كما هو ليس قراراً
    //  يُبرَّر، وتغييرُه مالٌ يُسأل عنه.
    if (change.changed && !reason) {
      throw new FollowupError("سبب تغيير السعر مطلوب", 400);
    }

    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET approved_price = ${change.finalPrice},
             price_source = 'manager_set',
             last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);

    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      //  نوعٌ جديد ولا يُعاد استعمال `price_approved`: القديم يعني «اعتمده
      //  طبيبٌ بعد طلب»، والجديد يعني «قرّره مديرُ الفرع». وخلطُهما تحت اسمٍ
      //  واحد كان سيجعل تاريخ ما قبل التبسيط يُقرأ كتاريخ ما بعده.
      eventType: "commercial_price_set",
      fromStatus: cur.status, toStatus: cur.status,
      reason: reason || null, note: params.note ?? null,
      payload: {
        previousPrice: change.previousPrice,
        finalPrice: change.finalPrice,
        difference: change.difference,
        percentageDifference: change.percentageDifference,
        changed: change.changed,
        previousPriceSource: cur.priceSource,
        setByUserId: params.actor.userId,
        setByName: params.actor.userName,
      },
      actor: params.actor,
    });
    return { followup: toRow(row), change };
  });
}

/**
 * **تثبيتُ السعر المعتمد بعد اعتماد خصم** — يناديه مسارُ الخصم وحده.
 *
 * ══ ولماذا لا يُعاد استعمالُ `setCommercialPrice` ═══════════════════════
 * لأن ذاك بابُ **قرارِ مديرِ الفرع** بحرّاسه: سببٌ إلزاميّ عند التغيير،
 * ومصدرٌ `manager_set`، ورفضُ الصفر. والخصمُ المعتمد سبقه سببُه المنظَّم
 * وموافقةُ معتمِدٍ مخوَّل، وقد يكون صفراً حين يكون تبرّعاً. فخلطُ البابين
 * كان سيعني إمّا إضعافَ حُرّاسِ التسعير اليدوي، وإمّا منعَ التبرّع.
 *
 * ══ ولا دينارَ يتحرّك هنا ═══════════════════════════════════════════════
 * **لا كلفةَ مريض ولا كلفةَ حالة ولا قيدَ دفتر ولا دفعةَ ولا أمرَ تصنيع.**
 * هذه كتابةُ رقمٍ ينتظر `confirmPurchase` — وهي وحدها مَن يصيّره مالاً.
 *
 * والخبيرُ يُكتب هنا حين أرسله الطلبُ الأصلي: الموظّف اختاره قبل أن يطلب
 * الخصم، فلا يُطلب منه اختيارُه ثانيةً بعد أيامٍ من الاعتماد.
 */
export async function setApprovedPriceForDiscount(params: {
  followupId: number; finalPrice: number; expertUserId?: number | null;
  actor: Actor;
  /** معاملةُ المُستدعي — اعتمادُ الخصم يكتب السعرَ ويبيع في حدثٍ واحد. */
  tx?: any;
}): Promise<FollowupRow> {
  const price = Number(params.finalPrice);
  if (!Number.isInteger(price) || price < 0) {
    throw new FollowupError("السعر المعتمد غير صالح", 400);
  }
  const body = async (tx: any) => {
    const cur = await lockFollowup(tx, params.followupId, PRICEABLE);
    //  خبيرُ الطلب إن وُجد، وإلّا فالمختارُ سابقاً كما هو — **ولا يُمحى**.
    const expertUserId = params.expertUserId ?? cur.selectedExpertUserId;
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET approved_price = ${price},
             price_source = 'approved_change',
             selected_expert_user_id = ${expertUserId},
             last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "discount_price_applied",
      fromStatus: cur.status, toStatus: cur.status,
      payload: {
        previousPrice: cur.approvedPrice, finalPrice: price,
        previousPriceSource: cur.priceSource,
        expertUserId, setByUserId: params.actor.userId,
        setByName: params.actor.userName,
      },
      actor: params.actor,
    });
    return toRow(row);
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

/**
 * **أولُ سعرٍ للجهاز حين سكتت المعاينة** — يكتبه الاستعلامات، بلا اعتماد.
 *
 * ══ لماذا ليس خصماً ولا قرارَ مدير ═══════════════════════════════════════
 * الطبيبُ **قد** يكتب كلفةَ الجهاز في معاينته، وقد يتركها. وحين يتركها لم
 * يكن للجهاز سعرٌ أصليٌّ قطّ — فأولُ رقمٍ يُكتب ليس تخفيضاً لشيء، بل هو
 * **إعلانُ السعر الطبيعي** نفسه. وإيقافُ البيع على مدير الفرع لأن الطبيب
 * نسي حقلاً عقوبةٌ للمريض على سهوٍ لا شأن له به.
 *
 * ══ والحارسُ في الشرط لا في الدور ═══════════════════════════════════════
 * تعمل **فقط حين يكون السعر المعتمد صفراً** — أي «غير مسعَّر». فمتى وُجد
 * سعرٌ موجب (من المعاينة أو من مديرٍ أو من أوّل كتابةٍ كهذه) صار تخفيضُه
 * خصماً يمرّ ببابه. فلا تصير هذه النقطةُ باباً خلفياً لخفض سعرٍ قائم.
 *
 * ولا دينارَ يتحرّك هنا: رقمٌ ينتظر تأكيدَ الشراء كسعر المعاينة تماماً.
 */
export async function setInitialCommercialPrice(params: {
  followupId: number; originalPrice: number; actor: Actor; tx?: any;
}): Promise<FollowupRow> {
  const price = Number(params.originalPrice);
  if (!Number.isInteger(price) || price <= 0) {
    throw new FollowupError("السعر الأصلي يجب أن يكون مبلغاً موجباً بالدينار الصحيح", 400);
  }
  const body = async (tx: any) => {
    const cur = await lockFollowup(tx, params.followupId, PRICEABLE);
    //  **الشرطُ يُفحَص تحت القفل**: بين قراءة الشاشة وهذه اللحظة قد يكون
    //  مديرٌ سعّره، فلا يُكتب فوق سعرٍ صار موجباً.
    if (cur.approvedPrice > 0) {
      throw new FollowupError(
        "لهذا الجهاز سعر معتمد بالفعل — تخفيضه يمرّ بطلب خصم، ورفعه لمدير الفرع", 409);
    }
    const upd = await tx.execute(sql`
      UPDATE post_exam_followups
         SET approved_price = ${price}, price_source = 'reception_set',
             last_contact_at = NOW(), updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status} AND approved_price <= 0
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "initial_price_set", fromStatus: cur.status, toStatus: cur.status,
      payload: {
        previousPrice: cur.approvedPrice, finalPrice: price,
        previousPriceSource: cur.priceSource,
        setByUserId: params.actor.userId, setByName: params.actor.userName,
      },
      actor: params.actor,
    });
    return toRow(row);
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
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

// ── تأكيد الشراء ─────────────────────────────────────────────────────────

/** الحالاتُ الحيّة التي يجوز فيها تأكيد الشراء. */
const CONFIRMABLE: FollowupStatus[] = [
  "awaiting_patient_decision",
  "follow_up",
  "price_approved_waiting_patient",
  //  توافقٌ رجعي: صفوفٌ احتُجزت قبل هذا التبسيط تُستأنف من مكانها.
  "purchase_approval_pending",
];

/**
 * تأكيدُ الشراء — **الاستقبال ومديرُ الفرع**، وهو ما يبدأ البيع فعلاً.
 *
 * ══ ما تغيّر ولماذا ══════════════════════════════════════════════════
 * كان الطريق خطوتين: يسجّل الموظّف موافقة المريض ⟶ `purchase_approval_pending`،
 * ثم يعتمدها طبيبٌ أو مسؤول ⟶ `converted`. والخطوة الثانية كانت **تصنيفاً
 * خاطئاً**: المريض قَبِل السعر المعتمد نفسه بلا تغيير حرف، فلا شيء
 * يُعتمَد — إنما تُسجَّل واقعة. وثمنُها كان: ملفٌّ واقفٌ بلا زرٍّ بيد
 * الموظّف، ودفعةٌ تُردّ لأن الكلفة لم تُقيَّد بعد.
 *
 * فصارت خطوةً واحدة من الحالة الحيّة مباشرةً إلى `converted`.
 *
 * ══ وما لم يتغيّر — وهو الأهمّ ═══════════════════════════════════════
 * • **السعر يُقرأ من الصفّ تحت القفل** لا من الطلب. فلا يُهرَّب رقم.
 * • **الخبير كذلك**: يُقرأ من `selected_expert_user_id` لا من الجسم.
 * • **الباب واحد**: `storage.assignManufacturing` بمعاملة المُستدعي — لا
 *   مسارَ تصنيعٍ ثانٍ يُكتب هنا.
 * • **الذرّية**: `converted` بلا تصنيع كذبةٌ في الشاشة، وتصنيعٌ بلا سجلٍّ
 *   ثقبٌ في التدقيق. فينجحان معاً أو لا يبقى منهما شيء.
 *
 * ══ وطبقتا حمايةٍ من الضغطة المزدوجة ══════════════════════════════════
 * ١. قفلُ المتابعة + شرطُ الحالة: الثاني ينتظر الأول ثم يقرأ `converted`
 *    فيُردّ بـ409.
 * ٢. وحارسُ `assignManufacturing` القائم (فحصٌ داخل المعاملة + الفهرس
 *    الجزئي من ترحيل ٠٢١/٠٥١): أمرُ بناءٍ فعّالٌ واحد لكل (مريض، خدمة).
 * فلو سقطت الأولى يوماً بقيت الثانية تمنع أمرين.
 */
export async function confirmPurchase(params: {
  followupId: number; note?: string | null; actor: Actor;
  /**
   * **البابُ الوحيد للصفر** — يرفعه مسارُ الخصم لصفٍّ اعتُمدت مجّانيتُه
   * صراحةً، ولا يصل من جسم طلبٍ قطّ.
   *
   * الحارسُ أدناه يقول «صفرٌ = غيرُ مسعَّر»، وهو صحيحٌ لكلّ مَن يناديه
   * اليوم. لكنّ التبرّعَ المعتمَد صفرٌ **قرّره معتمِدٌ مخوَّل** وسُجّل سببُه
   * ومَن أذن به. فلو بقي الحارسُ مطلقاً لَما أمكن التبرّعُ بجهاز؛ ولو
   * أُسقط لعاد كلُّ ملفٍّ لم يُسعَّر بعدُ يمرّ إلى التصنيع بلا سعر.
   */
  allowFreeDonation?: boolean;
  /**
   * معاملةُ المُستدعي — اعتمادُ الخصم يقرّر ويبيع في **معاملةٍ واحدة**، فلا
   * تبقى لحظةٌ يكون فيها الطلبُ «معتمَداً» والبيعُ لم يقع.
   */
  tx?: any;
}): Promise<{ followup: FollowupRow; workOrderId: number }> {
  const body = async (tx: any) => {
    const cur = await lockFollowup(tx, params.followupId, CONFIRMABLE);
    if (cur.approvedPrice <= 0 && params.allowFreeDonation !== true) {
      throw new FollowupError(
        "لا يوجد سعر معتمد لهذا الجهاز — يحدّده الطبيب في المعاينة، أو يُدخله الاستعلامات عند تأكيد الشراء", 409);
    }
    //  وحتى مع الإذن: **سالبٌ لا يمرّ**. التبرّعُ صفرٌ لا خصمٌ فوق السعر.
    if (cur.approvedPrice < 0) {
      throw new FollowupError("السعر المعتمد غير صالح", 409);
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

    //  سجلُّ التأكيد يُكتب **قبل** البيع وفي معاملته: فلا أمرُ تصنيعٍ
    //  يوجد يوماً بلا السطر الذي يفسّر لماذا وُجد.
    //
    //  ونوعُ الحدث جديد (`purchase_confirmed`) ولا يُعاد استعمال
    //  `purchase_approved`: القديم يعني «اعتمده طبيب»، والجديد يعني «سجّله
    //  الموظّف». وخلطُهما تحت اسمٍ واحد كان سيجعل تاريخ ما قبل التبسيط
    //  يُقرأ كتاريخ ما بعده. والصفوف القديمة تبقى باسمها كما كُتبت.
    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "purchase_confirmed", fromStatus: cur.status,
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
             converted_work_order_id = ${workOrderId},
             last_contact_at = NOW(), last_note = ${params.note ?? null}, updated_at = NOW()
       WHERE id = ${cur.id} AND status = ${cur.status}
      RETURNING ${SELECT_COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new FollowupError(CONFLICT, 409);

    await appendEvent(tx, {
      followupId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "converted", fromStatus: cur.status,
      toStatus: "converted",
      payload: { workOrderId, approvedPrice: cur.approvedPrice },
      actor: params.actor,
    });
    return { followup: toRow(row), workOrderId };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
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
        //  **«يرغب بالشراء»**: قرارُ المريض سُجّل والبيعُ لم يُتمّ بعد. وهو
        //  طابورُ عملِ الاستعلامات الحقيقي — لا حالةٌ في آلة حالات.
        : f === "wants_purchase" ? sql`f.purchase_interest_at IS NOT NULL
            AND f.status NOT IN ('converted', 'closed_without_purchase')`
          //  **سلّةُ القديم**: الحالات الثلاث الموروثة في مرشِّحٍ واحد،
          //  فلا تتصدّر الشاشةَ بأسماءٍ لا يفهمها الموظّف.
          : f === "legacy" ? sql`f.status IN ('price_approval_pending',
              'price_approved_waiting_patient', 'purchase_approval_pending')`
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
           f.purchase_interest_at, f.purchase_interest_by_name,
           p.name AS patient_name, p.patient_code, p.phone,
           b.name AS branch_name,
           e.signed_at AS exam_signed_at, e.doctor_name AS exam_doctor_name
      FROM post_exam_followups f
      JOIN patients p ON p.id = f.patient_id
      LEFT JOIN branches b ON b.id = f.branch_id
      LEFT JOIN medical_exams e ON e.id = f.medical_exam_id
     WHERE ${scopeClause(params.scope)} AND ${filterClause}
     ORDER BY
       --  **الرايةُ ترفع الملفَّ إلى الرأس**: مريضٌ قال للطبيب «أريده
       --  اليوم» يُتَّصَل به قبل مَن ينتظر موعدَ متابعةٍ بعد أسبوع.
       CASE WHEN f.purchase_interest_at IS NULL THEN 1 ELSE 0 END,
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
    purchaseInterestAt: x.purchase_interest_at ?? null,
    purchaseInterestByName: x.purchase_interest_by_name ?? null,
    examSignedAt: x.exam_signed_at, examDoctorName: x.exam_doctor_name,
  }));
}

/**
 * «بانتظار موافقتي» — للطبيب والمسؤول. **تعديلاتُ السعر وحدها**.
 *
 * وكانت تحمل معها طابورَ «اعتماد الشراء»: مهامٌّ روتينية لا قرارَ سريرياً
 * فيها، تُغرق شاشة الطبيب وتحبس الفرع حتى يفرغ لها. فخرجت — والاعتماد
 * الباقي اعتمادٌ حقيقي: رقمٌ وقّعه الطبيب يُطلب تغييرُه.
 */
export async function listPendingApprovals(scope: number[] | null): Promise<{
  priceApprovals: any[];
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
  };
}

/**
 * **مرضى هذا الطبيب الذين اشتروا مؤخّراً — قراءةٌ محضة، بلا فعلٍ مطلوب.**
 *
 * ══ لماذا لا نظامَ تنبيهاتٍ عامّ ═══════════════════════════════════════
 * في الريبو قناتان: تلغرام للمالك، وصندوقُ رسائلِ المرضى. وليست فيه بنيةُ
 * تنبيهاتٍ داخلية للموظّفين — وبناءُ واحدةٍ لأجل سطرٍ يقرأه الطبيب مرّةً
 * في اليوم كلفةٌ لا تُسترَدّ. فالمعلومة تُوضَع **حيث يقف الطبيب أصلاً**:
 * قائمةُ عمله. لا صندوقَ يُقرأ ولا رايةَ تُطفأ ولا شيءَ يُضغط.
 *
 * وكلُّ سطرٍ يجيب عن أسئلته الأربعة: **مَن اشترى · ماذا · بكم · ومَن حدّد
 * ذلك السعر**. فإن رأى رقماً يخالف ما كتبه في معاينته عرف مَن يسأل — بلا
 * أن يملك حقَّ الاعتراض عليه، لأن القرار التجاري ليس قراره.
 *
 * والفاعلان يُقرآن من **دفتر الأحداث** لا من أعمدةٍ جديدة: `converted` لا
 * يحمل مَن أكّده، والحدثُ يحمله. فلا عمودَ يُضاف ليكرّر ما هو مكتوب.
 */
export async function recentPurchasesForDoctor(params: {
  doctorUserId: number; scope: number[] | null; days?: number; limit?: number;
}): Promise<any[]> {
  const days = Number.isFinite(params.days) ? Number(params.days) : 30;
  const limit = Number.isFinite(params.limit) ? Number(params.limit) : 50;
  const r = await db.execute(sql`
    SELECT f.id, f.patient_id, f.service_type, f.branch_id, f.approved_price,
           f.price_source, f.converted_at, f.converted_work_order_id,
           p.name AS patient_name, p.patient_code,
           b.name AS branch_name,
           e.case_type, e.device_cost AS exam_device_cost,
           conf.actor_name AS confirmed_by_name,
           pset.actor_name AS price_set_by_name,
           pset.created_at AS price_set_at,
           pset.payload AS price_payload
      FROM post_exam_followups f
      JOIN medical_exams e ON e.id = f.medical_exam_id
      JOIN patients p ON p.id = f.patient_id
      LEFT JOIN branches b ON b.id = f.branch_id
      LEFT JOIN LATERAL (
        SELECT actor_name FROM post_exam_followup_events
         WHERE followup_id = f.id
           AND event_type IN ('purchase_confirmed', 'purchase_approved')
         ORDER BY id DESC LIMIT 1
      ) conf ON TRUE
      LEFT JOIN LATERAL (
        SELECT actor_name, created_at, payload FROM post_exam_followup_events
         WHERE followup_id = f.id AND event_type = 'commercial_price_set'
         ORDER BY id DESC LIMIT 1
      ) pset ON TRUE
     WHERE e.doctor_id = ${params.doctorUserId}
       AND f.status = 'converted'
       AND f.converted_at IS NOT NULL
       AND f.converted_at >= NOW() - (${days} || ' days')::interval
       AND ${scopeClause(params.scope)}
     ORDER BY f.converted_at DESC
     LIMIT ${limit}
  `);
  return (r.rows ?? []).map((x: any) => ({
    followupId: Number(x.id), patientId: Number(x.patient_id),
    patientName: x.patient_name, patientCode: x.patient_code,
    branchId: x.branch_id === null ? null : Number(x.branch_id),
    branchName: x.branch_name,
    serviceType: x.service_type, caseType: x.case_type,
    finalPrice: Number(x.approved_price ?? 0), priceSource: x.price_source,
    //  سعرُ المعاينة كما وقّعه هو — فيرى الفرقَ بلا حساب.
    examDeviceCost: x.exam_device_cost === null || x.exam_device_cost === undefined
      ? null : Number(x.exam_device_cost),
    purchasedAt: x.converted_at, workOrderId: x.converted_work_order_id === null
      ? null : Number(x.converted_work_order_id),
    confirmedByName: x.confirmed_by_name ?? null,
    //  **ولا يُذكَر مَن حدّد السعر إلّا إن حُدِّد فعلاً**: ملفٌّ بيع بسعر
    //  المعاينة بلا تدخّل يبقى حقلُه فارغاً لا «—» ملفَّقاً.
    priceSetByName: x.price_set_by_name ?? null,
    priceSetAt: x.price_set_at ?? null,
    priceChange: x.price_payload ?? null,
  }));
}

/**
 * **الخدماتُ التي يحكمها ملفُّ متابعةٍ حيّ** — خريطةُ (مريض ⟶ خدمات).
 *
 * ══ الباب المكرَّر الذي تغلقه ═══════════════════════════════════════════
 * سجلُّ المرضى كان يعرض «تخصيص وإسناد خبير» لكلّ خدمةٍ قرّرها الطبيب ولا
 * أمرَ بناءٍ لها — **بلا أن يعرف أن للمريض ملفَّ متابعةٍ حيّاً يحكمها**.
 * فيضغطه الموظّف، ويردّه الخادمُ بـ409 «لديه متابعة حيّة». بابان ظاهران،
 * وأحدُهما ينتهي دائماً برسالة خطأ.
 *
 * فالشاشةُ تسأل هذه النقطةَ أوّلاً وتُخفي البابَ الذي سيُردّ. **والحارسُ في
 * الخادم لم يُمسّ**: هو الحقيقة، وهذا إخفاءُ زرٍّ لا استبدالُ حراسة.
 *
 * والمنتهيتان خارجها: المُحوَّل صار له أمرُ تصنيع، والمغلق لا يحكم شيئاً —
 * فيعود بابُ التخصيص القديم مشروعاً لمن أُغلق ملفُّه ثم أُعيد فتحُ خدمته
 * بمسارٍ آخر.
 */
export async function governedServices(
  scope: number[] | null,
): Promise<Record<number, string[]>> {
  const r = await db.execute(sql`
    SELECT f.patient_id, f.service_type
      FROM post_exam_followups f
     WHERE f.status NOT IN ('converted', 'closed_without_purchase')
       AND ${scopeClause(scope)}
     LIMIT 5000
  `);
  const out: Record<number, string[]> = {};
  for (const x of (r.rows ?? []) as any[]) {
    const pid = Number(x.patient_id);
    (out[pid] ||= []).push(String(x.service_type));
  }
  return out;
}

export { isTerminal };
export type { FollowupReason, FollowupStatus };
