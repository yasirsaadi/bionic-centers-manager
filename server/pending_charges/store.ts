/**
 * **المراجعةُ المالية لعملياتِ «بلا معاينة»** — طبقةُ البيانات الوحيدة.
 *
 * **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
 *
 * ══ ولا حسابَ ثانٍ يُكتب هنا ═══════════════════════════════════════════════
 * الاعتمادُ ينادي **الكاتبَ القانونيّ القائم** لنوع العملية:
 *   صيانة  ⟶ `postMaintenanceFee` — الكتابةُ نفسُها التي تناديها الصيانةُ
 *             كاملةُ الأجر، لا نسخةٌ ثانية.
 *   بيعُ جزء ⟶ `storage.assignManufacturing` — الكاتبُ القانونيّ للبيع، بلا
 *             حرفٍ يتغيّر فيه.
 * فلا حسابُ دفترٍ يُكرَّر، ولا ينحرف أحدُ النسختين يوماً.
 *
 * ══ ولماذا يُنشأ أمرُ الصيانة الآن وأمرُ البيع عند الاعتماد ═══════════════
 * **الصيانةُ عملٌ يجري الآن**: الخبيرُ يفتح الجهازَ ويصلحه، والأجرُ قد يكون
 * صفراً بحقٍّ (خدمةٌ مجّانية واقعةٌ حقيقية). فالأمرُ يُفتَح بأجرٍ صفر —
 * وليس ذلك سعراً ملفَّقاً — ويُقيَّد الأجرُ عند الاعتماد.
 *
 * **والبيعُ سعرٌ وإسنادٌ معاً**: `assignManufacturing` تُسعّر وتُسنِد في فعلٍ
 * واحد لا ينفصل. ففتحُ أمرٍ بسعر صفر ثمّ رفعُه كان **يخترع سعراً** — وهو
 * بالضبط الالتباسُ الذي أُغلق في المرحلة الثانية («صفرٌ» ≠ «لم يُدخَل»).
 * فهويّةُ العملية قبل الاعتماد هي **الحلقةُ** (مفتوحةٌ بما طُلب بالضبط) ومعها
 * صفُّ المبلغ المعلَّق، والأمرُ يُولَد مع المال في نداءٍ واحد.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import {
  isPendingChargeKind, isEditableByReception,
  type PendingChargeKind, type PendingChargeStatus,
} from "@shared/pending_charge";

export class ChargeError extends Error {
  status: number;
  constructor(message: string, status = 409) {
    super(message);
    this.name = "ChargeError";
    this.status = status;
  }
}

const CONFLICT = "تغيّرت حالة العملية بواسطة مستخدم آخر. حدّث الصفحة وحاول مجدداً.";

/**
 * **اصطدامُ الفهرس الجزئيّ يُقرأ عربياً** — لا خطأَ خادمٍ عارٍ في السجلّ.
 *
 * `uq_psc_open_episode_sale` و`uq_psc_open_work_order` هما الحارسُ الحقيقيّ
 * ضدّ صفَّين معلَّقين على العملية نفسِها. وضغطةٌ ثانيةٌ تصطدم بأحدهما فعلٌ
 * متوقَّعٌ لا عطل، فتستحقّ ٤٠٩ برسالةٍ تقول ما جرى.
 */
function asChargeError(e: any): never {
  if (e?.code === "23505" && String(e?.constraint ?? "").startsWith("uq_psc_")) {
    throw new ChargeError("لهذه العملية مبلغ معلّق بالفعل — حدّث الصفحة", 409);
  }
  throw e;
}

export interface ChargeRow {
  id: number;
  patientId: number;
  branchId: number | null;
  caseId: number | null;
  deviceEpisodeId: number | null;
  workOrderId: number | null;
  serviceType: string;
  operationKind: PendingChargeKind;
  requestedItem: string | null;
  maintenanceComponent: string | null;
  externalDevice: boolean;
  saleExpertUserId: number | null;
  amount: number;
  note: string | null;
  status: PendingChargeStatus;
  createdBy: number | null;
  createdByName: string | null;
  createdAt: string;
  submittedAt: string;
  returnReason: string | null;
  returnedAt: string | null;
  returnedByName: string | null;
  reviewedByName: string | null;
  reviewedAt: string | null;
  appliedAt: string | null;
  appliedWorkOrderId: number | null;
}

const COLS = sql`id, patient_id, branch_id, case_id, device_episode_id, work_order_id,
  service_type, operation_kind, requested_item, maintenance_component, external_device,
  sale_expert_user_id, amount, note, status, created_by, created_by_name, created_at, submitted_at,
  return_reason, returned_at, returned_by_name, reviewed_by_name, reviewed_at,
  applied_at, applied_work_order_id`;

const toRow = (r: any): ChargeRow => ({
  id: Number(r.id),
  patientId: Number(r.patient_id),
  branchId: r.branch_id === null || r.branch_id === undefined ? null : Number(r.branch_id),
  caseId: r.case_id === null || r.case_id === undefined ? null : Number(r.case_id),
  deviceEpisodeId: r.device_episode_id === null || r.device_episode_id === undefined
    ? null : Number(r.device_episode_id),
  workOrderId: r.work_order_id === null || r.work_order_id === undefined
    ? null : Number(r.work_order_id),
  serviceType: String(r.service_type),
  operationKind: r.operation_kind,
  requestedItem: r.requested_item ?? null,
  maintenanceComponent: r.maintenance_component ?? null,
  externalDevice: Boolean(r.external_device),
  saleExpertUserId: r.sale_expert_user_id === null || r.sale_expert_user_id === undefined
    ? null : Number(r.sale_expert_user_id),
  amount: Number(r.amount ?? 0),
  note: r.note ?? null,
  status: r.status,
  createdBy: r.created_by === null || r.created_by === undefined ? null : Number(r.created_by),
  createdByName: r.created_by_name ?? null,
  createdAt: r.created_at,
  submittedAt: r.submitted_at,
  returnReason: r.return_reason ?? null,
  returnedAt: r.returned_at ?? null,
  returnedByName: r.returned_by_name ?? null,
  reviewedByName: r.reviewed_by_name ?? null,
  reviewedAt: r.reviewed_at ?? null,
  appliedAt: r.applied_at ?? null,
  appliedWorkOrderId: r.applied_work_order_id === null || r.applied_work_order_id === undefined
    ? null : Number(r.applied_work_order_id),
});

export interface Actor { userId: number | null; userName: string | null }

/** يُلحق حدثاً — **داخل معاملة المُستدعي دائماً** فلا ينفصل عن انتقاله. */
async function appendEvent(tx: any, p: {
  chargeId: number; patientId: number; branchId: number | null;
  eventType: string; fromStatus?: string | null; toStatus?: string | null;
  reason?: string | null; note?: string | null;
  payload?: Record<string, unknown>; actor: Actor;
}): Promise<void> {
  await tx.execute(sql`
    INSERT INTO pending_service_charge_events
      (charge_id, patient_id, branch_id, event_type, from_status, to_status,
       reason, note, payload, actor_user_id, actor_name)
    VALUES (${p.chargeId}, ${p.patientId}, ${p.branchId}, ${p.eventType},
            ${p.fromStatus ?? null}, ${p.toStatus ?? null}, ${p.reason ?? null},
            ${p.note ?? null}, ${JSON.stringify(p.payload ?? {})}::jsonb,
            ${p.actor.userId}, ${p.actor.userName})
  `);
}

/** يقفل الصفَّ ويشترط حالته — **نقطةُ التسلسل الوحيدة** لكلّ انتقال. */
async function lockCharge(
  tx: any, chargeId: number, expect: PendingChargeStatus[],
): Promise<ChargeRow> {
  const r = await tx.execute(sql`
    SELECT ${COLS} FROM pending_service_charges WHERE id = ${chargeId} FOR UPDATE
  `);
  const row = (r.rows ?? [])[0];
  if (!row) throw new ChargeError("العملية غير موجودة", 404);
  const cur = toRow(row);
  if (!expect.includes(cur.status)) {
    //  **والمعتمدُ يقول ذلك صراحةً** — لا «تغيّرت الحالة» عارية: الطبيبُ
    //  الثاني يحتاج أن يعرف أن زميله اعتمدها لا أن يظنّ عطلاً.
    throw new ChargeError(
      cur.status === "approved"
        ? "هذه العملية اعتُمدت بالفعل وقُيّد مبلغُها — لا تُعتمد مرّتين."
        : CONFLICT, 409);
  }
  return cur;
}

// ── الإنشاء ──────────────────────────────────────────────────────────────

interface CreateBase {
  patientId: number;
  branchId: number | null;
  caseId: number | null;
  serviceType: "prosthetic" | "medical_support";
  /** `null` = **عمليةٌ بلا أجر** — فلا صفَّ ولا اعتماد ولا مسرحيّةَ صفر. */
  amount: number | null;
  note: string | null;
  actor: Actor;
}

/**
 * يكتب صفَّ المبلغ المعلَّق — **ولا يمسّ ديناراً**.
 *
 * ولا يُنشأ صفٌّ لعمليةٍ بلا أجر: `amount === null` تعني «لا مال هنا»،
 * فالعمليةُ تكتمل تشغيلياً وتنتهي. **ولا اعتمادَ لصفر.**
 */
async function insertCharge(tx: any, p: CreateBase & {
  operationKind: PendingChargeKind;
  deviceEpisodeId: number | null;
  workOrderId: number | null;
  requestedItem: string | null;
  maintenanceComponent: string | null;
  externalDevice: boolean;
  saleExpertUserId: number | null;
}): Promise<ChargeRow | null> {
  if (p.amount === null) return null;
  //  **والفهرسُ الجزئيّ هو الحارس** — ضغطتان متزامنتان تصطدمان به، فتُقرأ
  //  اصطدامتُه رسالةً عربيةً صريحة لا خطأَ خادمٍ عارياً في السجلّ.
  const ins = await tx.execute(sql`
    INSERT INTO pending_service_charges
      (patient_id, branch_id, case_id, device_episode_id, work_order_id, service_type,
       operation_kind, requested_item, maintenance_component, external_device,
       sale_expert_user_id, amount, note, status, created_by, created_by_name)
    VALUES (${p.patientId}, ${p.branchId}, ${p.caseId}, ${p.deviceEpisodeId},
            ${p.workOrderId}, ${p.serviceType}, ${p.operationKind}, ${p.requestedItem},
            ${p.maintenanceComponent}, ${p.externalDevice}, ${p.saleExpertUserId},
            ${p.amount}, ${p.note},
            'pending_review', ${p.actor.userId}, ${p.actor.userName})
    RETURNING ${COLS}
  `).catch(asChargeError);
  const row = (ins.rows ?? [])[0];
  if (!row) throw new ChargeError("لهذه العملية مبلغ معلّق بالفعل", 409);
  const charge = toRow(row);
  await appendEvent(tx, {
    chargeId: charge.id, patientId: charge.patientId, branchId: charge.branchId,
    eventType: "created", toStatus: "pending_review", note: p.note,
    payload: {
      amount: charge.amount, operationKind: charge.operationKind,
      requestedItem: charge.requestedItem,
      maintenanceComponent: charge.maintenanceComponent,
      externalDevice: charge.externalDevice,
    },
    actor: p.actor,
  });
  return charge;
}

/**
 * **بيعُ جزءٍ (أو مسندٍ كامل) على مسار «بلا معاينة»**.
 *
 * لا أمرَ تصنيعٍ يُفتَح الآن — والسبب في رأس الملفّ. والهويّةُ الدقيقة هي
 * الحلقةُ المفتوحة بما طُلب بالضبط، ويُتحقَّق تحت القفل أنها **لهذا المريض**
 * وأن مسارَها `no_exam` فعلاً.
 */
export async function createDeviceSaleCharge(p: CreateBase & {
  deviceEpisodeId: number;
  saleExpertUserId: number;
}): Promise<ChargeRow | null> {
  return await db.transaction(async (tx) => {
    const r = await tx.execute(sql`
      SELECT e.id, e.status, e.service_path, e.requested_item, e.case_id, e.patient_id,
             pc.case_type
        FROM patient_device_episodes e
        JOIN patient_cases pc ON pc.id = e.case_id
       WHERE e.id = ${p.deviceEpisodeId} FOR UPDATE OF e
    `);
    const ep = (r.rows ?? [])[0];
    if (!ep) throw new ChargeError("طلب الجهاز غير موجود", 404);
    if (Number(ep.patient_id) !== p.patientId) {
      throw new ChargeError("طلب الجهاز لا يخصّ هذا المريض", 409);
    }
    if (String(ep.service_path) !== "no_exam") {
      throw new ChargeError(
        "هذا الطلب على مسار المعاينة — يمرّ بالطبيب ثم «تفاصيل البيع»", 409);
    }
    if (String(ep.status) !== "awaiting_exam") {
      throw new ChargeError("طلب الجهاز ليس في حالة تسمح بالبيع", 409);
    }
    return await insertCharge(tx, {
      ...p, operationKind: "device_sale",
      deviceEpisodeId: p.deviceEpisodeId, workOrderId: null,
      requestedItem: String(ep.requested_item ?? "full_device"),
      maintenanceComponent: null, externalDevice: false,
      saleExpertUserId: p.saleExpertUserId,
      caseId: p.caseId ?? Number(ep.case_id),
    });
  });
}

/**
 * **صيانةٌ على مسار «بلا معاينة»** — العملُ يُفتَح الآن، والأجرُ ينتظر.
 *
 * والأمرُ يُفتَح بأجرٍ **صفر** عبر الكاتب القانونيّ نفسِه، فلا سطرَ محاسبةٍ
 * يُكتب (`postMaintenanceFee` تخرج مبكّراً عند الصفر). ثمّ يُقيَّد الأجرُ عند
 * الاعتماد بالدالّة نفسِها.
 *
 * **والجهازُ المصنوع خارج المركز** يُقال كما هو: `externalDevice` واقعةُ
 * منشأٍ صريحة، ويمرّ تشغيلياً بمخرج «جهاز قديم غير مسجَّل» القائم — فلا
 * يُخترَع له أمرُ تصنيعٍ ولا حلقةٌ مسلَّمة عندنا لم تقع.
 */
export async function createMaintenanceCharge(p: CreateBase & {
  expertUserId: number;
  visitNotes: string;
  maintenanceComponent: string | null;
  deviceEpisodeId: number | null;
  externalDevice: boolean;
}): Promise<{ charge: ChargeRow | null; workOrderId: number }> {
  const mfg = await import("../manufacturing/store");
  return await db.transaction(async (tx) => {
    const order = await mfg.createMaintenanceOrderWithVisit({
      patientId: p.patientId,
      branchId: p.branchId ?? 0,
      serviceType: p.serviceType,
      expertUserId: p.expertUserId,
      expectedDeliveryDate: null,
      assignedBy: p.actor.userId,
      visitNotes: p.visitNotes,
      visitDate: new Date(),
      //  **صفرٌ هنا ليس سعراً ملفَّقاً**: الأجرُ لم يدخل المحاسبة بعد، وهو
      //  ما يعنيه هذا المسار بالضبط. والمبلغُ المقترح في الصفّ المعلَّق.
      cost: 0,
      deviceEpisodeId: p.deviceEpisodeId,
      //  جهازٌ خارجيّ أو قديمٌ غير مسجَّل: المخرجُ القائم نفسُه، بلا اختراع.
      legacyUnrecordedDevice: p.deviceEpisodeId === null,
      maintenanceComponent: p.maintenanceComponent,
      tx,
    });
    const charge = await insertCharge(tx, {
      ...p, operationKind: "maintenance",
      deviceEpisodeId: order.deviceEpisodeId ?? null,
      workOrderId: order.id,
      requestedItem: null,
      maintenanceComponent: p.maintenanceComponent,
      externalDevice: p.externalDevice,
      saleExpertUserId: null,
    });
    return { charge, workOrderId: order.id };
  });
}

// ── قرارُ الطبيب ─────────────────────────────────────────────────────────

/**
 * **الاعتماد — ويُقيَّد المبلغُ مرّةً واحدة بالضبط.**
 *
 * القفلُ ثمّ شرطُ الحالة ثمّ `applied_at`: ثلاثُ طبقاتٍ تجعل ضغطتين
 * متزامنتين — أو طبيبين — تُنتجان **قيدَ كلفةٍ واحداً**. والثانيةُ تنتظر
 * القفلَ ثمّ تقرأ `approved` فتُردّ برسالةٍ تقول ما جرى.
 *
 * **والكاتبُ قانونيٌّ قائم** لا نسخةٌ ثانية — انظر رأس الملفّ.
 */
export async function approveCharge(params: {
  chargeId: number;
  actor: Actor;
  /** يُفحص **تحت القفل** بفرع الصفّ نفسِه لا بفرعٍ يعلنه الطلب. */
  eligible: (charge: ChargeRow) => Promise<{ ok: boolean; reason?: string }>;
  /** خبيرُ البيع — يُقرأ من الطلب ويُتحقَّق منه في النقطة قبل الوصول. */
  saleExpertUserId?: number | null;
}): Promise<{ charge: ChargeRow; workOrderId: number | null }> {
  return await db.transaction(async (tx) => {
    const cur = await lockCharge(tx, params.chargeId, ["pending_review"]);
    const may = await params.eligible(cur);
    if (!may.ok) throw new ChargeError(may.reason ?? "غير مصرح بمراجعة هذه العملية", 403);

    let workOrderId: number | null = cur.workOrderId;
    if (cur.operationKind === "maintenance") {
      const mfg = await import("../manufacturing/store");
      //  **الكتابةُ الواحدة** التي تناديها الصيانةُ كاملةُ الأجر — بالمبلغ
      //  المعتمَد وبهويّة الجهاز نفسِها التي حُفظت لحظةَ فتح الأمر.
      await mfg.postMaintenanceFee(tx, {
        patientId: cur.patientId, branchId: cur.branchId ?? 0,
        serviceType: cur.serviceType, cost: cur.amount,
        deviceEpisodeId: cur.deviceEpisodeId,
      });
    } else {
      const expert = Number(params.saleExpertUserId);
      if (!Number.isInteger(expert) || expert <= 0) {
        throw new ChargeError("اختر الخبير المسؤول قبل اعتماد البيع", 400);
      }
      //  **الكاتبُ القانونيّ للبيع بحرفه**: يسعّر ويُسنِد ويقيّد في فعلٍ
      //  واحد — فلا حسابَ دفترٍ يُكرَّر هنا.
      const out = await storage.assignManufacturing({
        patientId: cur.patientId,
        serviceType: cur.serviceType as "prosthetic" | "medical_support",
        fields: {},
        cost: cur.amount,
        expertUserId: expert,
        assignedBy: params.actor.userId,
        deviceEpisodeId: cur.deviceEpisodeId,
        tx,
      });
      workOrderId = out.workOrderId;
    }

    const upd = await tx.execute(sql`
      UPDATE pending_service_charges
         SET status = 'approved', reviewed_by = ${params.actor.userId},
             reviewed_by_name = ${params.actor.userName}, reviewed_at = NOW(),
             applied_at = NOW(), applied_work_order_id = ${workOrderId},
             updated_at = NOW()
       WHERE id = ${cur.id} AND status = 'pending_review' AND applied_at IS NULL
      RETURNING ${COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new ChargeError(CONFLICT, 409);

    await appendEvent(tx, {
      chargeId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "approved", fromStatus: "pending_review", toStatus: "approved",
      payload: { amount: cur.amount, workOrderId, operationKind: cur.operationKind },
      actor: params.actor,
    });
    return { charge: toRow(row), workOrderId };
  });
}

/**
 * **الإعادةُ للتصحيح — ولا شيءَ يُهدَم ولا دينارَ يتحرّك.**
 *
 * العمليةُ وقعت فعلاً؛ فالمُعادُ هو **المبلغُ** لا العمل. والسببُ إلزاميّ:
 * إعادةٌ بلا سببٍ تُعيد الموظّفَ إلى التخمين الذي جاء هذا المسار لينهيه.
 */
export async function returnCharge(params: {
  chargeId: number; reason: string; actor: Actor;
  eligible: (charge: ChargeRow) => Promise<{ ok: boolean; reason?: string }>;
}): Promise<ChargeRow> {
  const reason = String(params.reason ?? "").trim();
  if (!reason) throw new ChargeError("سبب الإعادة مطلوب", 400);
  return await db.transaction(async (tx) => {
    const cur = await lockCharge(tx, params.chargeId, ["pending_review"]);
    const may = await params.eligible(cur);
    if (!may.ok) throw new ChargeError(may.reason ?? "غير مصرح بمراجعة هذه العملية", 403);
    const upd = await tx.execute(sql`
      UPDATE pending_service_charges
         SET status = 'returned', return_reason = ${reason}, returned_at = NOW(),
             returned_by = ${params.actor.userId},
             returned_by_name = ${params.actor.userName},
             reviewed_by = ${params.actor.userId},
             reviewed_by_name = ${params.actor.userName}, reviewed_at = NOW(),
             updated_at = NOW()
       WHERE id = ${cur.id} AND status = 'pending_review'
      RETURNING ${COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new ChargeError(CONFLICT, 409);
    await appendEvent(tx, {
      chargeId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "returned", fromStatus: "pending_review", toStatus: "returned",
      reason, payload: { amount: cur.amount }, actor: params.actor,
    });
    return toRow(row);
  });
}

/**
 * **التصحيحُ وإعادةُ الإرسال — على الصفّ نفسِه.**
 *
 * لا صفَّ ثانٍ يُستنسَخ فيُحسَب البيعُ مرّتين، ولا تاريخَ مراجعةٍ يضيع:
 * سببُ الإعادة السابق يبقى في `pending_service_charge_events` كاملاً، ومعه
 * المبلغُ القديم والجديد.
 *
 * **والقديمُ لا يُقيَّد أبداً**: المعتمَدُ هو ما في الصفّ لحظةَ الاعتماد.
 */
export async function resubmitCharge(params: {
  chargeId: number; amount: number; note: string | null; actor: Actor;
  reachable: (charge: ChargeRow) => boolean;
}): Promise<ChargeRow> {
  const amount = Number(params.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ChargeError("المبلغ يجب أن يكون مبلغاً موجباً بالدينار الصحيح", 400);
  }
  return await db.transaction(async (tx) => {
    const cur = await lockCharge(tx, params.chargeId, ["returned"]);
    if (!params.reachable(cur)) {
      throw new ChargeError("غير مصرح لك بهذا الفرع", 403);
    }
    const upd = await tx.execute(sql`
      UPDATE pending_service_charges
         SET status = 'pending_review', amount = ${amount},
             note = ${params.note}, submitted_at = NOW(), updated_at = NOW()
       WHERE id = ${cur.id} AND status = 'returned'
      RETURNING ${COLS}
    `);
    const row = (upd.rows ?? [])[0];
    if (!row) throw new ChargeError(CONFLICT, 409);
    //  حدثان: ما تغيّر، ثمّ إعادةُ الإرسال — فتُقرأ الرحلةُ سطراً سطراً.
    if (amount !== cur.amount || (params.note ?? null) !== cur.note) {
      await appendEvent(tx, {
        chargeId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
        eventType: "corrected", fromStatus: "returned", toStatus: "returned",
        payload: { oldAmount: cur.amount, newAmount: amount },
        note: params.note, actor: params.actor,
      });
    }
    await appendEvent(tx, {
      chargeId: cur.id, patientId: cur.patientId, branchId: cur.branchId,
      eventType: "resubmitted", fromStatus: "returned", toStatus: "pending_review",
      //  **وسببُ الإعادة يبقى في الحدث** — فيُقرأ لماذا صُحّح بعد شهور.
      reason: cur.returnReason, payload: { amount }, actor: params.actor,
    });
    return toRow(row);
  });
}

// ── القراءة ──────────────────────────────────────────────────────────────

const scopeClause = (scope: number[] | null) =>
  scope === null ? sql`TRUE`
    : scope.length === 0 ? sql`FALSE`
      : sql`c.branch_id IN (${sql.join(scope.map((b) => sql`${b}`), sql`, `)})`;

const CARD_COLS = sql`c.id, c.patient_id, c.branch_id, c.case_id, c.device_episode_id,
  c.work_order_id, c.service_type, c.operation_kind, c.requested_item,
  c.maintenance_component, c.external_device, c.sale_expert_user_id, c.amount, c.note, c.status,
  c.created_by, c.created_by_name, c.created_at, c.submitted_at, c.return_reason,
  c.returned_at, c.returned_by_name, c.reviewed_by_name, c.reviewed_at,
  c.applied_at, c.applied_work_order_id`;

export interface ChargeCard extends ChargeRow {
  patientName: string | null;
  patientCode: string | null;
  branchName: string | null;
}

const toCard = (r: any): ChargeCard => ({
  ...toRow(r),
  patientName: r.patient_name ?? null,
  patientCode: r.patient_code ?? null,
  branchName: r.branch_name ?? null,
});

/**
 * **طابورُ الطبيب** — الأحدثُ أوّلاً، ضمن اختصاصاته وفروعه.
 *
 * ولا يخلط بمعايناته ولا بمراجعته الإشرافية ولا بالخصومات: هذا سؤالٌ واحد
 * — «أهذا المبلغُ مشروع؟» — وله شاشتُه.
 */
export async function listForReview(params: {
  specialties: string[]; scope: number[] | null;
}): Promise<ChargeCard[]> {
  if (params.specialties.length === 0) return [];
  const r = await db.execute(sql`
    SELECT ${CARD_COLS}, p.name AS patient_name, p.patient_code, b.name AS branch_name
      FROM pending_service_charges c
      JOIN patients p ON p.id = c.patient_id
      LEFT JOIN branches b ON b.id = c.branch_id
     WHERE c.status = 'pending_review'
       AND ${scopeClause(params.scope)}
       AND c.service_type IN (${sql.join(params.specialties.map((x) => sql`${x}`), sql`, `)})
     ORDER BY c.id DESC
     LIMIT 200
  `);
  return (r.rows ?? []).map(toCard);
}

/** **طابورُ الاستقبال** — المُعادات في فروعه، الأحدثُ أوّلاً. */
export async function listReturned(scope: number[] | null): Promise<ChargeCard[]> {
  const r = await db.execute(sql`
    SELECT ${CARD_COLS}, p.name AS patient_name, p.patient_code, b.name AS branch_name
      FROM pending_service_charges c
      JOIN patients p ON p.id = c.patient_id
      LEFT JOIN branches b ON b.id = c.branch_id
     WHERE c.status = 'returned' AND ${scopeClause(scope)}
     ORDER BY c.returned_at DESC, c.id DESC
     LIMIT 200
  `);
  return (r.rows ?? []).map(toCard);
}

/**
 * **الشارةُ** — عددُ المُعادات في فروع المستخدم، ومنها **ما أنشأه هو**.
 *
 * والمهمّةُ للفرع لا للموظّف (فقد يكون غائباً)، لكنّ صاحبَها يُبلَّغ شخصياً
 * حين يكون حاضراً — فيعرف أن عمليةً من عملياته عادت إليه.
 */
export async function returnedCounts(params: {
  scope: number[] | null; userId: number | null;
}): Promise<{ branch: number; mine: number }> {
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS branch,
           COUNT(*) FILTER (WHERE c.created_by = ${params.userId})::int AS mine
      FROM pending_service_charges c
     WHERE c.status = 'returned' AND ${scopeClause(params.scope)}
  `);
  const row = (r.rows ?? [])[0];
  return { branch: Number(row?.branch ?? 0), mine: Number(row?.mine ?? 0) };
}

/** مبالغُ مريضٍ واحد — لبطاقته. الحيّةُ أوّلاً. */
export async function listForPatient(patientId: number): Promise<ChargeRow[]> {
  const r = await db.execute(sql`
    SELECT ${COLS} FROM pending_service_charges
     WHERE patient_id = ${patientId}
     ORDER BY (status <> 'approved') DESC, id DESC
  `);
  return (r.rows ?? []).map(toRow);
}

export async function getCharge(id: number): Promise<ChargeRow | null> {
  const r = await db.execute(sql`
    SELECT ${COLS} FROM pending_service_charges WHERE id = ${id}
  `);
  const row = (r.rows ?? [])[0];
  return row ? toRow(row) : null;
}

/** رحلةُ الصفّ كاملةً — الأحدثُ أوّلاً. */
export async function getChargeEvents(chargeId: number): Promise<any[]> {
  const r = await db.execute(sql`
    SELECT id, event_type, from_status, to_status, reason, note, payload,
           actor_user_id, actor_name, created_at
      FROM pending_service_charge_events
     WHERE charge_id = ${chargeId}
     ORDER BY id DESC
  `);
  return (r.rows ?? []).map((e: any) => ({
    id: Number(e.id), eventType: e.event_type, fromStatus: e.from_status,
    toStatus: e.to_status, reason: e.reason, note: e.note, payload: e.payload,
    actorUserId: e.actor_user_id === null ? null : Number(e.actor_user_id),
    actorName: e.actor_name, createdAt: e.created_at,
  }));
}

/** حارسٌ للقراءة: أهذا الصفُّ قابلٌ للتصحيح الآن؟ */
export const mayCorrect = (c: ChargeRow): boolean => isEditableByReception(c.status);

export { isPendingChargeKind };
