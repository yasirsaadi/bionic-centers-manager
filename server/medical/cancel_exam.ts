// إلغاءُ معاينةٍ موقّعة — **معاملةٌ واحدة، وحُرّاسٌ قبل كلّ شيء**.
//
// ══ ما يفعله ═══════════════════════════════════════════════════════════
// يضيف صفَّ إلغاءٍ (ترحيل ٠٦١) فتتوقّف المعاينةُ عن كونها **سلطةً سريرية**:
// لا تفتح بوّابةَ التصنيع، ولا تعطي سعراً، ولا مواصفات، ولا شارةَ «تم
// تحديد»، ولا تُخرج المريضَ من طابور الطبيب. والمعاينةُ نفسُها ونسخُها
// وملاحقُها وتوقيعُ الطبيب **تبقى كلُّها كما هي**.
//
// ══ وما لا يفعله ═══════════════════════════════════════════════════════
// **لا يتراجع عن مالٍ ولا عن تصنيع.** أمرُ تصنيعٍ بدأ، أو بيعٌ اعتُمد، أو
// دفعةٌ قُبضت — كلُّها وقائعُ لها مساراتُ إلغائها الخاصّة، وسحبُها من هنا
// «تنظيفاً» كان سيترك المالَ معلَّقاً بلا حدثٍ يفسّره. فحين يوجد أثرٌ
// تجاريٌّ لا رجعةَ فيه **يُردّ الإلغاء ٤٠٩** برسالةٍ تقول أين المسار.
//
// **ولا يرجع بحقول المريض إلى ما كانت.** التوقيعُ يكتب الوصفةَ على صفّ
// المريض عبر المسار القائم، وليس ثمّة لقطةٌ لما كان قبله لكلّ حقلٍ قديم.
// فتخمينُ «ما كان» كان سيكتب ماضياً لم يقع. والحمايةُ الحقيقية أن ترجع
// الحلقةُ إلى `awaiting_exam`: فلا يُصنَّع شيءٌ حتى تُوقَّع معاينةٌ مصحَّحة
// تكتب إسقاطَها الصحيح بالمسار نفسه.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { isExamCancelled } from "./active_exam";
import { deviceDiscountRefs } from "@shared/discount";
import { revertEpisodeToAwaitingExam } from "../device_episodes/store";

export class ExamCancelError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ExamCancelError";
    this.status = status;
  }
}

/** الرسالةُ الواحدة لكلّ ما وقع تجارياً — تقول أين المسار الصحيح. */
const SOLD =
  "لا يمكن إلغاء هذه المعاينة بعد تنفيذ الخدمة المرتبطة بها."
  + " يجب إلغاء العملية التجارية/التصنيع من مسارها أولاً.";

export interface CancelOutcome {
  examId: number;
  patientId: number;
  /** الحلقةُ التي أُعيدت إلى «بانتظار المعاينة» — أو `null`. */
  episodeReset: number | null;
  /** المتابعةُ التي أُغلقت بسبب الإلغاء — أو `null`. */
  followupRetired: number | null;
}

export interface ExamForPermission {
  id: number;
  patientId: number;
  branchId: number | null;
  caseType: string;
  doctorId: number | null;
  deviceEpisodeId: number | null;
}

/** صفُّ المعاينة كما تحتاجه طبقةُ الإذن — قبل فتح المعاملة. */
export async function examForPermission(examId: number): Promise<ExamForPermission | null> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT me.id, me.patient_id, me.case_type, me.doctor_id, me.device_episode_id,
           p.branch_id
      FROM medical_exams me
      JOIN patients p ON p.id = me.patient_id
     WHERE me.id = ${examId}
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    patientId: Number(row.patient_id),
    branchId: row.branch_id === null || row.branch_id === undefined ? null : Number(row.branch_id),
    caseType: String(row.case_type),
    doctorId: row.doctor_id === null || row.doctor_id === undefined ? null : Number(row.doctor_id),
    deviceEpisodeId: row.device_episode_id === null || row.device_episode_id === undefined
      ? null : Number(row.device_episode_id),
  };
}

/**
 * الإلغاءُ نفسه — **الإذنُ يُفحَص في النقطة قبل النداء**، وهذه تحرس الواقع.
 *
 * الخطواتُ كلُّها في معاملةٍ واحدة: القفل، والحُرّاس، والشاهدة، وإرجاعُ
 * الحلقة، وتقاعدُ المتابعة، وسطرُ التدقيق. تنجح معاً أو لا يتغيّر شيء.
 *
 * وضغطتان متزامنتان: الأولى تكتب الشاهدة، والثانية تصطدم بفهرس التفرّد
 * على `exam_id` فتُردّ ٤٠٩ — **يحسمه صفُّ القاعدة لا ترتيبُ الشيفرة**.
 */
export async function cancelExam(params: {
  examId: number;
  reason: string;
  actor: { userId: number | null; userName: string | null };
  audit?: { ipAddress?: string | null; userAgent?: string | null };
}): Promise<CancelOutcome> {
  const reason = String(params.reason ?? "").trim();
  if (!reason) throw new ExamCancelError("اكتب سبب الإلغاء", 400);

  return await db.transaction(async (tx) => {
    // ── ① المعاينة، مقفولةً ────────────────────────────────────────────
    const ex = await tx.execute<Record<string, any>>(sql`
      SELECT id, patient_id, case_type, device_episode_id, doctor_id
        FROM medical_exams WHERE id = ${params.examId} FOR UPDATE
    `);
    const exam = (ex.rows ?? [])[0];
    if (!exam) throw new ExamCancelError("المعاينة غير موجودة", 404);
    if (await isExamCancelled(params.examId, tx)) {
      throw new ExamCancelError("هذه المعاينة ملغاة بالفعل", 409);
    }
    const patientId = Number(exam.patient_id);
    const episodeId = exam.device_episode_id === null || exam.device_episode_id === undefined
      ? null : Number(exam.device_episode_id);

    const br = await tx.execute<{ branch_id: number | null }>(sql`
      SELECT branch_id FROM patients WHERE id = ${patientId}
    `);
    const branchId = (br.rows ?? [])[0]?.branch_id ?? null;

    // ── ② الحلقة: هل وقع عليها تصنيعٌ أو تسليم؟ ────────────────────────
    let episodeReset: number | null = null;
    if (episodeId !== null) {
      const epq = await tx.execute<{ id: number; status: string }>(sql`
        SELECT id, status FROM patient_device_episodes
         WHERE id = ${episodeId} FOR UPDATE
      `);
      const ep = (epq.rows ?? [])[0];
      if (ep) {
        const st = String(ep.status);
        if (st === "in_manufacturing" || st === "delivered") {
          throw new ExamCancelError(SOLD, 409);
        }
        //  **وأمرُ تصنيعٍ قائم يمنع مهما قالت الحالة**: الحالةُ لقطةٌ قد
        //  تتأخّر، والأمرُ واقعةٌ لا تُنكَر.
        const wo = await tx.execute<{ id: number }>(sql`
          SELECT id FROM prosthetic_work_orders
           WHERE device_episode_id = ${episodeId} AND purpose = 'initial_build'
           LIMIT 1
        `);
        if ((wo.rows ?? []).length > 0) throw new ExamCancelError(SOLD, 409);
        //  «مُعايَنة» ⟵ «بانتظار المعاينة»: **الطلبُ باقٍ، والمعاينةُ سقطت**.
        //  فالمريضُ ما زال يريد الجهاز، وتُوقَّع له معاينةٌ مصحَّحة تطالب
        //  الحلقةَ نفسها ولا تفتح ثانيةً.
        if (st === "examined") episodeReset = episodeId;
      }
    }

    // ── ③ المتابعة: بيعٌ اعتُمد؟ أو قرارٌ تجاريٌّ معلَّق؟ ──────────────
    let followupRetired: number | null = null;
    const fq = await tx.execute<Record<string, any>>(sql`
      SELECT id, status, converted_work_order_id, device_episode_id, service_type
        FROM post_exam_followups
       WHERE medical_exam_id = ${params.examId}
       FOR UPDATE
    `);
    const fu = (fq.rows ?? [])[0];
    if (fu) {
      const fst = String(fu.status);
      if (fst === "converted" || fu.converted_work_order_id !== null) {
        throw new ExamCancelError(SOLD, 409);
      }
      //  **بمرجع هذا الجهاز بعينه** (٢٣٥/٢٣٦): طلبٌ معلَّقٌ على جهازٍ آخر
      //  للمريض نفسه لا يمنع — ولو مُنع لأصبح ملفُّ المريض يقفل بعضُه بعضاً.
      const refs = deviceDiscountRefs({
        followupId: Number(fu.id),
        deviceEpisodeId: fu.device_episode_id ?? null,
        serviceType: String(fu.service_type),
      });
      const dq = await tx.execute<{ id: number }>(sql`
        SELECT id FROM service_discount_requests
         WHERE patient_id = ${patientId} AND status = 'pending'
           AND context_ref IN (${sql.join(refs.map((r) => sql`${r}`), sql`, `)})
         LIMIT 1
      `);
      if ((dq.rows ?? []).length > 0) {
        throw new ExamCancelError(
          "يوجد طلب خصم أو اعتماد معلّق لهذه المعاينة — احسمه أو ألغِه أولاً", 409,
        );
      }
      const pq = await tx.execute<{ id: number }>(sql`
        SELECT id FROM price_change_requests
         WHERE followup_id = ${fu.id} AND status = 'pending' LIMIT 1
      `);
      if ((pq.rows ?? []).length > 0) {
        throw new ExamCancelError(
          "يوجد طلب خصم أو اعتماد معلّق لهذه المعاينة — احسمه أو ألغِه أولاً", 409,
        );
      }
      followupRetired = Number(fu.id);
    }

    // ── ④ الشاهدة ──────────────────────────────────────────────────────
    try {
      await tx.execute(sql`
        INSERT INTO medical_exam_cancellations
          (exam_id, patient_id, branch_id, cancelled_by, cancelled_by_name, reason)
        VALUES (${params.examId}, ${patientId}, ${branchId},
                ${params.actor.userId}, ${params.actor.userName}, ${reason})
      `);
    } catch (e: any) {
      if (String(e?.code) === "23505") {
        throw new ExamCancelError("هذه المعاينة ملغاة بالفعل", 409);
      }
      throw e;
    }

    // ── ⑤ إرجاعُ الحلقة ────────────────────────────────────────────────
    if (episodeReset !== null) {
      //  **بطبقتها لا بـSQL هنا**: كتابةُ الحلقات محصورةٌ في مخزنها،
      //  ويحرس ذلك اختبارُ `test:device-episodes`.
      await revertEpisodeToAwaitingExam(tx, episodeReset);
    }

    // ── ⑥ تقاعدُ المتابعة — بسببها الحقيقي لا بـ«لم يشترِ» ────────────
    if (followupRetired !== null) {
      const fst = String(fu.status);
      await tx.execute(sql`
        UPDATE post_exam_followups
           SET status = 'closed_exam_cancelled', updated_at = NOW()
         WHERE id = ${followupRetired}
      `);
      await tx.execute(sql`
        INSERT INTO post_exam_followup_events
          (followup_id, patient_id, branch_id, event_type, from_status, to_status,
           reason, note, payload, actor_user_id, actor_name)
        VALUES (${followupRetired}, ${patientId}, ${branchId},
                ${"closed_exam_cancelled"}, ${fst}, ${"closed_exam_cancelled"},
                ${"exam_cancelled"}, ${`أُغلقت بسبب إلغاء المعاينة — ${reason}`},
                ${JSON.stringify({ examId: params.examId })}::jsonb,
                ${params.actor.userId}, ${params.actor.userName})
      `);
    }

    // ── ⑦ التدقيق، بالمعاملة نفسها ─────────────────────────────────────
    await logAudit({
      entityType: "medical_exam", entityId: params.examId, action: "update",
      userId: params.actor.userId, userName: params.actor.userName,
      branchId,
      oldValues: { cancelled: false },
      newValues: {
        cancelled: true, reason, patientId,
        caseType: String(exam.case_type),
        episodeReset, followupRetired,
      },
      ipAddress: params.audit?.ipAddress ?? null,
      userAgent: params.audit?.userAgent ?? null,
      notes: `إلغاء معاينة موقّعة #${params.examId} لمريض #${patientId} — ${reason}`
        + `${episodeReset !== null ? " · أُعيد طلب الجهاز إلى بانتظار المعاينة" : ""}`,
      tx,
    });

    return { examId: params.examId, patientId, episodeReset, followupRetired };
  });
}
