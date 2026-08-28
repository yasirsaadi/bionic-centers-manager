/**
 * **عملياتُ «بلا معاينة»** — طبقةُ البيانات الوحيدة.
 *
 * ══ القاعدةُ الحاكمة (قرارُ المالك — تُلغي ما قبلها) ═══════════════════════
 * **العمليةُ والمالُ يمضيان من الاستعلامات، والطبيبُ يراجع الحركةَ إشرافياً
 * فقط.**
 *
 * والقاعدةُ القديمة — «العمليةُ تمضي والمالُ ينتظر» — لم تعد سارية: كانت
 * تُبقي مالاً مشروعاً وقع فعلاً **خارج الدفتر والتقارير** حتى يفرغ طبيبٌ
 * لشاشةٍ ماليّةٍ ليست من عمله.
 *
 * ══ ولا حسابَ ثانٍ يُكتب هنا (وهذا لم يتغيّر) ═════════════════════════════
 * الكاتبُ **القانونيُّ القائم** لكلّ نوع، يُنادى في **معاملة العملية نفسِها**:
 *   صيانة   ⟶ `postMaintenanceFee` من داخل `createMaintenanceOrderWithVisit`
 *              — الكتابةُ نفسُها التي تناديها الصيانةُ كاملةُ الأجر.
 *   بيعُ جزء ⟶ `applyDeviceSaleFinancialsTx` على أمر العمل الذي فتحته
 *              `startDeviceSaleOperationallyTx` قبلها بسطر.
 * فلا حسابُ دفترٍ يُكرَّر، ولا ينحرف أحدُ النسختين يوماً.
 *
 * ══ ونصفا البيع كما هما ═════════════════════════════════════════════════
 *   `startDeviceSaleOperationallyTx` — الأمرُ والحلقةُ والسجلّ، **بلا دينار**.
 *   `applyDeviceSaleFinancialsTx`    — المجموعُ والكلفةُ والقيد، **بلا عمل**.
 * ومسارُ المعاينة يركّبهما في `assignManufacturing` كما كان بحرفه، وهذا
 * المسارُ يركّبهما بالترتيب عينه.
 *
 * ══ والصفرُ لا يُخترَع ═══════════════════════════════════════════════════
 * «بلا أجور» تعني **لا قيدَ ولا كلفةَ ولا دينار** — لا سعراً صفرياً ملفَّقاً.
 * وهي واقعةٌ تُحفَظ على أمر العمل (`no_exam_no_charge`) فلا يُستدَلّ عليها
 * بغياب صفّ. ولا التباسَ بين «مجّانيّ» و«لم يُدخَل».
 *
 * ══ والصفوفُ المعلَّقة تاريخٌ لا مسار ═══════════════════════════════════
 * `createDeviceSaleOperation` و`createMaintenanceOperation` **لا تكتبان في
 * `pending_service_charges` إطلاقاً**. والدوالُّ الباقية أدناه
 * (`approveCharge` · `returnCharge` · `resubmitCharge` · القراءات) تخدم
 * **الصفوفَ الموروثة المفتوحة وحدها** حتى يُنهيها إنسان — ومَن يُنهيها
 * الاستقبالُ ومديرُ الفرع والمسؤول، لا طبيب.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { storage } from "../storage";
import { belongsToActivePatientSql } from "../patients/active_patient";
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
  deviceOrigin: string | null;
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
  service_type, operation_kind, requested_item, maintenance_component, device_origin,
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
  deviceOrigin: r.device_origin ?? null,
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
 * **بيعُ جزءٍ على مسار «بلا معاينة» — العملُ والمالُ معاً في معاملةٍ واحدة.**
 *
 * ══ القاعدةُ الجديدة (قرارُ المالك) ═════════════════════════════════════
 * **المبلغُ الذي يُدخله الاستقبالُ نهائيٌّ لحظتَه.** فلا صفَّ معلَّقاً يُنشأ،
 * ولا طابورَ اعتماد، ولا مالَ يقع خارج الدفتر بانتظار مَن يفرغ له.
 *
 * ══ ونصفا البيع القائمان بلا نسخةٍ ثانية ════════════════════════════════
 * `startDeviceSaleOperationallyTx` تفتح الأمرَ وتنقل الحلقة (بلا دينار)، ثمّ
 * `applyDeviceSaleFinancialsTx` تقيّد الكلفةَ على المريض والحالة والحلقة
 * ودفترِ القيود — **وهما الكاتبان اللذان يناديهما مسارُ المعاينة نفسُه**
 * (`assignManufacturing` تركّبهما بالترتيب عينه). فلا محاسبةَ ثانية تنحرف.
 *
 * ══ ومرّةً واحدة بالضبط ═════════════════════════════════════════════════
 * المالُ يقع **في معاملة فتح الأمر نفسِها**. فحارسُ الأمر النشط وقفلُ الخيط
 * و`uq_pde_case_open` — التي تمنع أمراً ثانياً — تمنع قيداً ثانياً معه:
 * ضغطتان متزامنتان ⟶ الثانيةُ ترتدّ قبل أن تكتب ديناراً، ولا نصفَ كتابة.
 *
 * والهويّةُ الدقيقة هي الحلقةُ بما طُلب بالضبط، ويُتحقَّق **تحت القفل
 * القانونيّ** (الخيطُ ثمّ الحلقة) أنها لهذا المريض وأن مسارَها `no_exam`.
 */
export async function createDeviceSaleOperation(p: CreateBase & {
  deviceEpisodeId: number;
  saleExpertUserId: number;
}): Promise<{
  workOrderId: number; deviceEpisodeId: number; amount: number | null;
  requestedItem: string | null;
}> {
  const store = await import("../storage");
  return await db.transaction(async (tx) => {
    //  ══ **ترتيبُ قفلٍ واحد لا اثنان** ═══════════════════════════════════
    //  كان هنا قفلٌ تمهيديٌّ على **الحلقة** قبل الخيط — عكسَ الترتيب
    //  القانونيّ (`lockCaseAndReadOpenEpisode`: الخيطُ ثمّ الحلقة). وترتيبان
    //  متعاكسان في نظامٍ واحد يصنعان جمودَ قفلٍ لا يظهر إلّا تحت الضغط.
    //
    //  فحُذف. والحُرّاسُ كلُّها داخل `startDeviceSaleOperationallyTx`:
    //  انتماءُ الحلقة (بقفل الخيط) · مسارُها (`expectServicePath`) ·
    //  حالتُها · الجهازُ الكامل · وفرعُها. **وما طُلب يُقرأ من هناك** —
    //  من الصفّ المقفول لا من قراءةٍ سابقةٍ له.
    const op = await store.startDeviceSaleOperationallyTx(tx, {
      patientId: p.patientId,
      serviceType: p.serviceType,
      fields: {},
      expertUserId: p.saleExpertUserId,
      assignedBy: p.actor.userId,
      deviceEpisodeId: p.deviceEpisodeId,
      expectServicePath: "no_exam",
      //  **الواقعةُ الصريحة** — لا يُستدَلّ عليها بغياب صفّ لاحقاً.
      noExamNoCharge: p.amount === null,
    });

    //  **والمالُ هنا، لا في طابور** — بالكاتب القانونيّ نفسِه وفي المعاملة
    //  نفسِها. و«بلا أجور» تبقى واقعةً صريحة: لا قيدَ ولا صفَّ ولا دينار.
    if (p.amount !== null) {
      await store.applyDeviceSaleFinancialsTx(tx, { operation: op, cost: p.amount });
    }
    return {
      workOrderId: op.workOrderId,
      deviceEpisodeId: p.deviceEpisodeId,
      amount: p.amount,
      //  **وما طُلب يُقرأ من الصفّ المقفول** لا من جسم الطلب — فالسجلُّ
      //  الاسترجاعيُّ يسمّي ما بِيع فعلاً لا ما ادّعاه العميل.
      requestedItem: op.requestedItem ?? null,
    };
  });
}

/**
 * **الصيانةُ المبسّطة — العملُ والمبلغُ النهائيّ معاً، حفظةً واحدة.**
 * (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨ — تُلغي «الأجرُ ينتظر الطبيب».)
 *
 * والأمرُ يُفتَح **بمبلغه النهائيّ** عبر الكاتب القانونيّ نفسِه
 * (`createMaintenanceOrderWithVisit` تنادي `postMaintenanceFee` داخل معاملتها،
 * وهي تخرج مبكّراً عند الصفر) — وهو **الكاتبُ عينه** الذي تناديه الصيانةُ
 * الموروثة وكاتبُ اعتماد الخصم القديم. فلا نسخةَ ثانية من محاسبة الصيانة.
 *
 * **ومرّةً واحدة**: `uq_pwo_one_open_maint_per_episode` و
 * `uq_pwo_one_open_legacy_maint` (ترحيل ٠٥١) تمنعان أمرَ صيانةٍ مفتوحاً
 * ثانياً على الجهاز نفسِه — والمبلغُ داخل معاملة الأمر، فيرتدّ معه.
 *
 * ══ **بلا مراجعةٍ لاحقة، وبلا منشأ جهاز** (المرحلة الثالثة) ═══════════════
 * لا `routeRetrospectiveReview` تُنادى من هنا — الطبيبُ بلا سلطةٍ على هذا
 * المسار إطلاقاً، فلا حاجةَ لإخباره. و`deviceOrigin` **دائماً `null`** على
 * الصفوف الجديدة: سؤالُ منشأ الجهاز تقاعد مع نافذة «تفاصيل البيع» القديمة.
 *
 * ══ **والشروطُ التجاريةُ مُهيكَلة** (ترحيل ٠٦٩) ═══════════════════════════
 * `originalPrice`/`discountAmount`/`priceKind`/`finalPrice` — مُشتقّةٌ سلفاً
 * في الخادم عبر `deriveMaintenanceOffer` (`shared/maintenance.ts`، إعادةُ
 * تصديرٍ لـ`deriveOfferFromDiscount` من المرحلة الثانية). تُكتب على أمر
 * العمل نفسِه في المعاملة نفسِها — لا سطرَ ثانياً ولا تحديثاً لاحقاً.
 *
 * ولا يُخترَع أمرُ تصنيعٍ ولا حلقةٌ مسلَّمة لجهازٍ لم نسجّله. الغيابُ يُقال
 * غياباً.
 */
export async function createMaintenanceOperation(p: {
  patientId: number;
  branchId: number | null;
  serviceType: "prosthetic" | "medical_support";
  expertUserId: number;
  maintenanceComponent: string | null;
  deviceEpisodeId: number | null;
  legacyUnrecordedDevice: boolean;
  /** ثلاثتُها مُشتقّةٌ سلفاً بـ`deriveMaintenanceOffer` — لا حسابَ هنا. */
  originalPrice: number;
  priceKind: "normal" | "discount" | "free";
  /** = `originalPrice - discountAmount`؛ هو ما يُقيَّد فعلاً (`cost`). */
  finalPrice: number;
  visitNotes: string;
  actor: Actor;
}): Promise<{ workOrderId: number; deviceEpisodeId: number | null; finalPrice: number }> {
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
      //  **المبلغُ النهائيُّ هنا** — يقيّده `postMaintenanceFee` من داخل هذه
      //  الدالّة، وتخرج مبكّراً عند الصفر (مجّانيّ صريح: لا قيدَ ولا كلفةَ
      //  ولا دينار، لكنّ الأمرَ والزيارةَ يُفتحان دائماً — عملٌ حقيقيّ بقيمة صفر).
      cost: p.finalPrice,
      deviceEpisodeId: p.deviceEpisodeId,
      legacyUnrecordedDevice: p.legacyUnrecordedDevice,
      maintenanceComponent: p.maintenanceComponent,
      //  **تقاعد سؤالُ المنشأ** مع تبسيط الصيانة — لا يُسأل ولا يُخترَع.
      deviceOrigin: null,
      //  **توافقٌ تاريخيٌّ فقط**: مجّانيٌّ ⟶ `true`، وإلّا `false` — صفٌّ
      //  جديد يعرف قيمتَه دائماً، فلا `NULL` «لم يُسأل» على صفٍّ سُئل فعلاً.
      noExamNoCharge: p.priceKind === "free",
      commercialTerms: { originalPrice: p.originalPrice, kind: p.priceKind },
      tx,
    });
    return {
      workOrderId: order.id,
      deviceEpisodeId: order.deviceEpisodeId ?? null,
      finalPrice: p.finalPrice,
    };
  });
}

/**
 * **هويّةُ عمليةِ الصيانة — تُقرأ مقفولةً قبل الدينار.**
 *
 * ══ لماذا لا يكفي قفلُ الصفّ المعلَّق ═══════════════════════════════════
 * `postMaintenanceFee` كاتبٌ مطيع: يقيّد ما يُعطى بلا سؤال — وهذا صوابُه،
 * فهو الكتابةُ الواحدة التي تناديها الصيانةُ كاملةُ الأجر أيضاً. لكنّ
 * مناداتَه من هنا بلا مطابقةٍ كانت تعني أن صفّاً عُبث برقم أمره يقيّد أجراً
 * على أمرِ مريضٍ آخر — **والمالُ لا يُصحَّح بعد وقوعه**.
 *
 * ══ والمكتملُ يُقبَل والملغى يُردّ ══════════════════════════════════════
 * «العمليةُ تمضي والمالُ ينتظر» يعني أن الصيانةَ قد **تكتمل** قبل أن يفرغ
 * الطبيبُ لأجرها — فاشتراطُ بقائها «فعّالة» كان سيحبس أجرَ عملٍ تمّ. أمّا
 * الملغاةُ أو المُبطَلةُ إدارياً فبابُها التصحيحُ لا الاعتماد.
 *
 * **والمنشأُ يُطابَق** كذلك: لقطةُ الصفّ يجب أن تقول ما يقوله السجلُّ
 * التشغيليّ، وإلّا عُرض على الطبيب منشأٌ غيرُ الذي وقع.
 */
async function loadMaintenanceOperationTx(tx: any, cur: ChargeRow): Promise<{
  branchId: number; deviceEpisodeId: number | null;
}> {
  const MISMATCH =
    "بيانات الصيانة لا تطابق أمرها المسجَّل — راجع الملفّ إدارياً قبل قيد المبلغ";
  const r = await tx.execute(sql`
    SELECT id, patient_id, branch_id, service_type, purpose, status,
           device_episode_id, maintenance_component, device_origin,
           admin_void_reversal_id
      FROM prosthetic_work_orders WHERE id = ${cur.workOrderId} FOR UPDATE
  `);
  const wo = (r.rows ?? [])[0];
  if (!wo) throw new ChargeError("أمر الصيانة غير موجود", 409);

  if (String(wo.purpose ?? "initial_build") !== "maintenance"
    || Number(wo.patient_id) !== cur.patientId
    || String(wo.service_type) !== cur.serviceType
    || (cur.branchId !== null && Number(wo.branch_id) !== cur.branchId)
    || (wo.maintenance_component ?? null) !== (cur.maintenanceComponent ?? null)
    || (wo.device_origin ?? null) !== (cur.deviceOrigin ?? null)
    || Number(wo.device_episode_id ?? 0) !== Number(cur.deviceEpisodeId ?? 0)) {
    throw new ChargeError(MISMATCH, 409);
  }
  if (String(wo.status) === "cancelled" || wo.admin_void_reversal_id !== null) {
    throw new ChargeError(
      "أمر الصيانة ملغى أو مُبطَل إدارياً — لا يُقيَّد عليه مبلغ."
      + " صحّح العملية من «تصحيح / إلغاء العملية».", 409);
  }

  //  **وجهازُ الصيانة المسجَّل يُطابَق بعينه** — والآخران بلا حلقة، فلا
  //  تُخترَع لهما ولا تُطلَب منهما.
  const episodeId = cur.deviceEpisodeId;
  if (episodeId !== null) {
    const er = await tx.execute(sql`
      SELECT id, patient_id, status, admin_void_reversal_id
        FROM patient_device_episodes WHERE id = ${episodeId} FOR UPDATE
    `);
    const ep = (er.rows ?? [])[0];
    if (!ep || Number(ep.patient_id) !== cur.patientId) throw new ChargeError(MISMATCH, 409);
    if (ep.admin_void_reversal_id !== null || String(ep.status) === "cancelled") {
      throw new ChargeError(
        "جهاز الصيانة ملغى أو مُبطَل إدارياً — لا يُقيَّد عليه مبلغ.", 409);
    }
  }
  return { branchId: Number(wo.branch_id ?? cur.branchId ?? 0), deviceEpisodeId: episodeId };
}

// ── قرارُ الطبيب ─────────────────────────────────────────────────────────

/**
 * **الاعتماد — ويُقيَّد المبلغُ مرّةً واحدة بالضبط على العملية القائمة.**
 *
 * ══ ولا أمرَ تصنيعٍ ثانٍ ═══════════════════════════════════════════════
 * العملُ بدأ لحظةَ تسجيل العملية — أمرُه قائمٌ وخبيرُه يعمل. فالاعتمادُ
 * **يُدخل المالَ فحسب**: `applyDeviceSaleFinancialsTx` على الأمر نفسِه،
 * لا `assignManufacturing` التي كانت ستفتح أمراً ثانياً وتُنشئ حلقةً ثانية.
 *
 * ══ والهويّةُ تُعاد قراءتُها **تحت القفل** ═══════════════════════════════
 * بين الإرسال والاعتماد قد يمرّ يوم: يُنقَل المريضُ فرعاً · يُوقَف خبير ·
 * يُلغى أمرٌ إدارياً · تتغيّر الحلقة. فلا يُقبَل شيءٌ من لقطةٍ قديمة —
 * المريضُ والفرعُ والخدمةُ والحلقةُ وما طُلب وأمرُ التصنيع والخبير،
 * **كلُّها تُقرأ الآن وتُطابَق**، والتناقضُ يُردّ ٤٠٩ بلا دينار.
 *
 * **والكاتبُ قانونيٌّ قائم** لا نسخةٌ ثانية — انظر رأس الملفّ.
 */
export async function approveCharge(params: {
  chargeId: number;
  actor: Actor;
  /** يُفحص **تحت القفل** بفرع الصفّ نفسِه لا بفرعٍ يعلنه الطلب. */
  eligible: (charge: ChargeRow) => Promise<{ ok: boolean; reason?: string }>;
}): Promise<{ charge: ChargeRow; workOrderId: number | null }> {
  const store = await import("../storage");
  const mfg = await import("../manufacturing/store");
  return await db.transaction(async (tx) => {
    const cur = await lockCharge(tx, params.chargeId, ["pending_review"]);
    const may = await params.eligible(cur);
    if (!may.ok) throw new ChargeError(may.reason ?? "غير مصرح بمراجعة هذه العملية", 403);

    const workOrderId: number | null = cur.workOrderId;
    if (workOrderId === null) {
      throw new ChargeError(
        "لا يوجد أمر تصنيع لهذه العملية — راجع الملفّ إدارياً قبل قيد المبلغ", 409);
    }

    if (cur.operationKind === "maintenance") {
      //  ══ **وهويّةُ الصيانة تُعاد قراءتُها قبل الدينار** ═══════════════
      //  `postMaintenanceFee` كاتبٌ مطيع: يقيّد ما يُعطى بلا سؤال. فلو
      //  نُودي بلا مطابقةٍ لقُيِّد أجرُ صيانةٍ على أمرٍ لمريضٍ آخر أو على
      //  عمليةٍ أُلغيت — والمالُ لا يُصحَّح بعد وقوعه.
      const op = await loadMaintenanceOperationTx(tx, cur);
      await mfg.postMaintenanceFee(tx, {
        patientId: cur.patientId, branchId: op.branchId,
        serviceType: cur.serviceType, cost: cur.amount,
        deviceEpisodeId: op.deviceEpisodeId,
      });
    } else {
      //  **العمليةُ القائمة تُقرأ بهويّتها كاملة** — والتناقضُ يُردّ.
      const op = await store.loadDeviceSaleOperationTx(tx, {
        patientId: cur.patientId,
        serviceType: cur.serviceType as "prosthetic" | "medical_support",
        workOrderId,
        deviceEpisodeId: cur.deviceEpisodeId,
        branchId: cur.branchId,
        caseId: cur.caseId,
        requestedItem: cur.requestedItem,
      });
      //  ══ **الخبيرُ الحاليُّ على الأمر هو السلطة** ═══════════════════════
      //  لقطةُ الإنشاء (`sale_expert_user_id`) تبقى للتدقيق، **ولا تصير
      //  سلطةً ثانيةً بائتة**: إعادةُ إسنادٍ مشروعةٌ بعد الإرسال يجب ألّا
      //  تُفشل المال. ويُعاد التحقّق من الحاليّ **بفرع أمر العمل**.
      const v = await mfg.validateExpertForBranchTx(tx, op.expertUserId, op.branchId ?? 0);
      if (!v.ok) {
        throw new ChargeError(
          `${v.reason} — صحّح إسناد العملية قبل اعتماد مبلغها`, 409);
      }
      //  **والنصفُ الماليُّ وحده** — لا أمرَ ولا حلقةَ ولا سجلَّ عمل.
      await store.applyDeviceSaleFinancialsTx(tx, { operation: op, cost: cur.amount });
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
  c.maintenance_component, c.device_origin, c.sale_expert_user_id, c.amount, c.note, c.status,
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
 * **طابورُ الإكمال الموروث** — الأحدثُ أوّلاً، ضمن فروع المنادي.
 *
 * ══ ولا فلترةَ باختصاصٍ طبّيّ بعد اليوم ════════════════════════════════
 * كانت هذه القائمةُ تُقصَر على اختصاصات الطبيب لأنه كان المعتمِد. وقد خرج
 * من هذا المسار (قرارُ المالك)، فصار الحاكمُ **نطاقَ الفرع وحده**: مَن
 * يُنهي الصفَّ اليومَ هو الاستقبالُ ومديرُ الفرع والمسؤول، ولا اختصاصَ
 * طبّياً يُسأل عنه أحدُهم.
 *
 * **ولا صفَّ جديد يدخل هنا** — ما بقي مبالغُ عملياتٍ وقعت قبل التغيير.
 */
export async function listLegacyOpen(scope: number[] | null): Promise<ChargeCard[]> {
  const r = await db.execute(sql`
    SELECT ${CARD_COLS}, p.name AS patient_name, p.patient_code, b.name AS branch_name
      FROM pending_service_charges c
      JOIN patients p ON p.id = c.patient_id
      LEFT JOIN branches b ON b.id = c.branch_id
     WHERE c.status = 'pending_review'
       -- **والمحذوفُ يخرج من الطابور** (ترحيل ٠٦٨): صفُّه باقٍ كما هو
       -- ويعود بعينه عند الاستعادة، لكنّه لا يُعرَض ليُقيَّد مالٌ على ملفٍّ
       -- أُخرج من النظام.
       AND p.deleted_at IS NULL
       AND ${scopeClause(scope)}
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
     WHERE c.status = 'returned' AND p.deleted_at IS NULL AND ${scopeClause(scope)}
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
       -- الشارةُ تعدّ ما يُعرَض في الطابور بالضبط، فلا رقمٌ لا يقابله صفّ.
       AND ${belongsToActivePatientSql("c")}
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
