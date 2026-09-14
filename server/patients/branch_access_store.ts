// **منحُ فرعٍ إضافيّ حقَّ الوصول — ومسؤوليةُ العملية المفتوحة معه.**
//
// ══ ما يقع، وما لا يقع أبداً ═════════════════════════════════════════════
// **لا يقع**: لا `patients.branch_id` يتغيّر · ولا دفعةٌ ولا زيارةٌ ولا قيدُ
// كلفةٍ ولا حالةٌ (`patient_cases`) يتحرّك فرعُها · ولا أمرُ عملٍ منتهٍ
// (`completed`/`cancelled`) ولا حلقةٌ مسلَّمةٌ أو ملغاة. **التاريخُ يبقى حيث
// وقع** — حسابُ كربلاء عن أمسٍ لا يتغيّر اليوم.
//
// **يقع**: صفُّ إتاحةٍ واحد. وإن اختار المسؤولُ صراحةً نقلَ **مسؤولية العملية
// المفتوحة**، تنتقل معها الحلقةُ الحيّةُ وأمرُ العمل الحيّ إلى الفرع الجديد
// — وهما عملٌ **جارٍ** لا تاريخٌ مضى: مَن يكمله هو مَن يُنسَب إليه.
//
// ══ والخبيرُ قرارٌ مستقلّ ══════════════════════════════════════════════════
// نقلُ المسؤولية لا يعني تغييرَ الخبير: قد يواصل الخبيرُ الحاليُّ جهازاً بدأه.
// فالخيارُ صريح — إبقاؤه، أو اختيارُ خبيرٍ من **خبراء الفرع الجديد**
// (`validateExpertForBranchTx` القانونية نفسُها، لا قائمةٌ ثانية).
//
// ══ وكلُّه في معاملةٍ واحدة ══════════════════════════════════════════════
// الإتاحةُ ونقلُ المسؤولية وتغييرُ الخبير والتدقيقُ: معاً أو لا شيء.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { validateExpertForBranchTx } from "../manufacturing/store";
import { moveLiveEpisodeToBranchTx } from "../device_episodes/store";
import {
  BranchAccessError, grantBranchAccessTx, revokeBranchAccessTx,
  listPatientBranchAccess, type BranchAccessRow,
} from "./branch_access";

export { BranchAccessError };

/** عمليةٌ مفتوحة — الحلقةُ الحيّة وأمرُ عملها الحيّ إن وُجد. */
export interface OpenOperation {
  episodeId: number | null;
  episodeStatus: string | null;
  serviceType: string | null;
  requestedItem: string | null;
  episodeBranchId: number | null;
  workOrderId: number | null;
  workOrderPurpose: string | null;
  workOrderStatus: string | null;
  workOrderBranchId: number | null;
  expertUserId: number | null;
  expertName: string | null;
}

/**
 * **العملياتُ المفتوحة** — ما يستحقّ سؤالَ «أتُنقَل مسؤوليتُها؟».
 *
 * «مفتوحة» = حلقةٌ لم تُسلَّم ولم تُلغَ ولم تُبطَل إدارياً، **أو** أمرُ عملٍ
 * ليس `completed` ولا `cancelled`. والمنتهي لا يُسأل عنه ولا يُمَسّ.
 */
export async function listOpenOperations(
  patientId: number, tx?: { execute: (q: any) => Promise<any> },
): Promise<OpenOperation[]> {
  const ex = tx ?? (db as any);
  const r = await ex.execute(sql`
    SELECT ep.id AS episode_id, ep.status AS episode_status, ep.branch_id AS episode_branch_id,
           ep.requested_item, c.case_type AS service_type,
           wo.id AS work_order_id, wo.purpose AS wo_purpose, wo.status AS wo_status,
           wo.branch_id AS wo_branch_id, wo.expert_user_id, u.display_name AS expert_name
      FROM patient_device_episodes ep
      JOIN patient_cases c ON c.id = ep.case_id
      LEFT JOIN prosthetic_work_orders wo
             ON wo.device_episode_id = ep.id
            AND wo.status NOT IN ('completed', 'cancelled')
            AND wo.admin_void_reversal_id IS NULL
      LEFT JOIN system_users u ON u.id = wo.expert_user_id
     WHERE ep.patient_id = ${patientId}
       AND ep.status NOT IN ('delivered', 'cancelled')
       AND ep.admin_void_reversal_id IS NULL
     ORDER BY ep.id ASC
  `);
  return (r.rows ?? []).map((x: any) => ({
    episodeId: x.episode_id === null || x.episode_id === undefined ? null : Number(x.episode_id),
    episodeStatus: x.episode_status ?? null,
    serviceType: x.service_type ?? null,
    requestedItem: x.requested_item ?? null,
    episodeBranchId: x.episode_branch_id === null || x.episode_branch_id === undefined
      ? null : Number(x.episode_branch_id),
    workOrderId: x.work_order_id === null || x.work_order_id === undefined
      ? null : Number(x.work_order_id),
    workOrderPurpose: x.wo_purpose ?? null,
    workOrderStatus: x.wo_status ?? null,
    workOrderBranchId: x.wo_branch_id === null || x.wo_branch_id === undefined
      ? null : Number(x.wo_branch_id),
    expertUserId: x.expert_user_id === null || x.expert_user_id === undefined
      ? null : Number(x.expert_user_id),
    expertName: x.expert_name ?? null,
  }));
}

export interface GrantResult {
  created: boolean;
  branchId: number;
  /** العملياتُ التي نُقلت مسؤوليتُها فعلاً — فارغةٌ حين اختار المسؤولُ «لا». */
  movedOperations: { episodeId: number | null; workOrderId: number | null }[];
  expertChanged: boolean;
  access: BranchAccessRow[];
  openOperations: OpenOperation[];
}

export const OPERATION_ANSWER_REQUIRED =
  "لهذا المريض عملية مفتوحة — أجب: هل تُنقل مسؤوليتها إلى الفرع الجديد؟";

export const EXPERT_CHOICE_REQUIRED =
  "اختر: إبقاء الخبير الحالي أو خبيراً من خبراء الفرع الجديد";

/**
 * **إتاحةُ الملفّ لفرعٍ إضافيّ.**
 *
 * `moveOpenOperations`:
 *   • `false` ⟶ الإتاحةُ وحدها. العمليةُ وخبيرُها **كما هما بالضبط**.
 *   • `true`  ⟶ تنتقل الحلقةُ الحيّةُ وأمرُ العمل الحيّ إلى الفرع الجديد،
 *     ومعهما قرارُ الخبير: `keepExpert` يُبقيه، أو `newExpertUserId` يُسنِد
 *     خبيراً من الفرع الجديد بعد التحقّق منه **تحت القفل**.
 *
 * والسؤالُ إلزاميٌّ حين توجد عمليةٌ مفتوحة — `undefined` تُردّ ٤٠٠ ولا
 * تُقرأ «لا» بصمت: إسقاطُ مسؤوليةٍ بالسكوت ليس قراراً.
 */
export async function grantBranchAccess(params: {
  patientId: number;
  branchId: number;
  actorUserId: number | null;
  actorName: string | null;
  note?: string | null;
  moveOpenOperations?: boolean;
  keepExpert?: boolean;
  newExpertUserId?: number | null;
}): Promise<GrantResult> {
  return await db.transaction(async (tx) => {
    //  قفلُ المريض — نفسُ قفل المسارات الأخرى على هذا الملفّ (٩١٩).
    await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${params.patientId})`);

    const pr = await tx.execute<{ id: number; branch_id: number | null; deleted_at: any }>(sql`
      SELECT id, branch_id, deleted_at FROM patients WHERE id = ${params.patientId} FOR UPDATE
    `);
    const patient = (pr.rows ?? [])[0];
    if (!patient) throw new BranchAccessError("المريض غير موجود", 404);
    if (patient.deleted_at) {
      throw new BranchAccessError("هذا الملف في المحذوفات — استعده أولاً", 409);
    }

    const br = await tx.execute<{ id: number }>(sql`
      SELECT id FROM branches WHERE id = ${params.branchId}
    `);
    if ((br.rows ?? []).length === 0) throw new BranchAccessError("الفرع غير موجود", 404);

    //  **العملياتُ تُقرأ تحت القفل** — لا لقطةَ الشاشة: قد يُفتَح أمرُ تصنيع
    //  بين عرض النافذة والضغطة.
    const open = await listOpenOperations(params.patientId, tx as any);

    if (open.length > 0 && params.moveOpenOperations === undefined) {
      throw new BranchAccessError(OPERATION_ANSWER_REQUIRED, 400);
    }

    const grant = await grantBranchAccessTx(tx as any, {
      patientId: params.patientId,
      branchId: params.branchId,
      homeBranchId: patient.branch_id === null || patient.branch_id === undefined
        ? null : Number(patient.branch_id),
      grantedByUserId: params.actorUserId,
      grantedByName: params.actorName,
      note: params.note ?? null,
    });

    const moved: { episodeId: number | null; workOrderId: number | null }[] = [];
    let expertChanged = false;

    if (open.length > 0 && params.moveOpenOperations === true) {
      //  قرارُ الخبير إلزاميٌّ متى وُجد أمرُ عملٍ حيٌّ له خبير.
      const withOrder = open.filter((o) => o.workOrderId !== null);
      if (withOrder.length > 0
          && params.keepExpert !== true
          && (params.newExpertUserId === null || params.newExpertUserId === undefined)) {
        throw new BranchAccessError(EXPERT_CHOICE_REQUIRED, 400);
      }

      let expertId: number | null = null;
      if (withOrder.length > 0 && params.keepExpert !== true) {
        expertId = Number(params.newExpertUserId);
        //  **خبيرُ الفرع الجديد يُتحقَّق منه تحت القفل** — لا قائمةٌ بائتة.
        const v = await validateExpertForBranchTx(tx, expertId, params.branchId);
        if (!v.ok) throw new BranchAccessError(v.reason, 400);
      }

      for (const op of open) {
        if (op.episodeId !== null) {
          //  **الكتابةُ في طبقتها** — `moveLiveEpisodeToBranchTx` بحُرّاسها
          //  (الحيّةُ وحدها)، والقرارُ هنا. حارسٌ معماريّ يمنع SQL الحلقات
          //  خارج `device_episodes/store.ts`.
          await moveLiveEpisodeToBranchTx(tx as any, {
            episodeId: op.episodeId, branchId: params.branchId,
          });
        }
        if (op.workOrderId !== null) {
          const upd = await tx.execute(sql`
            UPDATE prosthetic_work_orders
               SET branch_id = ${params.branchId},
                   expert_user_id = ${expertId ?? op.expertUserId},
                   updated_at = NOW()
             WHERE id = ${op.workOrderId}
               AND status NOT IN ('completed', 'cancelled')
               AND admin_void_reversal_id IS NULL
            RETURNING id
          `);
          if ((upd.rows ?? []).length > 0) {
            //  **سجلُّ الأمر يقول ما جرى** — الجدولُ مُلحَقٌ لا يُعاد كتابتُه.
            await tx.execute(sql`
              INSERT INTO prosthetic_work_history
                (work_order_id, action_type, notes, performed_by)
              VALUES (${op.workOrderId}, 'status_change',
                      ${`نقل مسؤولية العملية إلى الفرع #${params.branchId}`
                        + (expertId !== null && expertId !== op.expertUserId
                          ? ` — وإسناد الخبير #${expertId}` : " — مع إبقاء الخبير الحالي")},
                      ${params.actorUserId})
            `);
            if (expertId !== null && expertId !== op.expertUserId) expertChanged = true;
          }
        }
        moved.push({ episodeId: op.episodeId, workOrderId: op.workOrderId });
      }
    }

    return {
      created: grant.created,
      branchId: params.branchId,
      movedOperations: moved,
      expertChanged,
      access: await listPatientBranchAccess(params.patientId, tx as any),
      openOperations: await listOpenOperations(params.patientId, tx as any),
    };
  });
}

/**
 * **سحبُ الإتاحة** — الرؤيةُ وحدها تتغيّر.
 *
 * ولا يُعاد شيءٌ إلى فرع التسجيل: أمرُ عملٍ نُقلت مسؤوليتُه يبقى حيث انتقل
 * (العملُ جارٍ هناك فعلاً)، وكلُّ صفٍّ تاريخيّ حيث وقع. سحبُ الرؤية ليس
 * تراجعاً عن عمل.
 */
export async function revokeBranchAccess(params: {
  patientId: number; branchId: number;
}): Promise<{ removed: boolean; access: BranchAccessRow[] }> {
  return await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(919, ${params.patientId})`);
    const removed = await revokeBranchAccessTx(tx as any, params);
    return { removed, access: await listPatientBranchAccess(params.patientId, tx as any) };
  });
}
