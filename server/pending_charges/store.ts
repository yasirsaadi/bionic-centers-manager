/**
 * **عملياتُ «بلا معاينة»** — طبقةُ البيانات الوحيدة.
 *
 * ══ القاعدةُ الحاكمة اليوم (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨ — تُلغي ما قبلها) ══
 * **العمليةُ والمالُ يمضيان من الاستعلامات، ولا معتمِدَ طبّيٌّ للمال — لا
 * حيّاً ولا استرجاعياً.** بيعُ جزءٍ من طرفٍ صناعي والصيانةُ المبسّطة كلاهما
 * حفظٌ واحد بلا أثرٍ يصل الطبيب إطلاقاً.
 *
 * والقاعدةُ الأقدم — «العمليةُ تمضي والمالُ ينتظر اعتماد طبيب» — لم تعد
 * سارية منذ قرار المالك 2026-08-26: كانت تُبقي مالاً مشروعاً وقع فعلاً
 * **خارج الدفتر والتقارير** حتى يفرغ طبيبٌ لشاشةٍ ماليّةٍ ليست من عمله.
 * والقاعدةُ التي تلتها — «يمضي والطبيبُ يراجع الحركةَ استرجاعياً» — تقاعدت
 * بدورها لبيع الجزء في هذه المرحلة (المرحلة الرابعة): لا سجلَّ مراجعةٍ
 * يُنشأ له بعد اليوم.
 *
 * ══ ولا حسابَ ثانٍ يُكتب هنا (وهذا لم يتغيّر) ═════════════════════════════
 * الكاتبُ **القانونيُّ القائم** لكلّ نوع، يُنادى في **معاملة العملية نفسِها**:
 *   صيانة   ⟶ `postMaintenanceFee` من داخل `createMaintenanceOrderWithVisit`
 *              — الكتابةُ نفسُها التي تناديها الصيانةُ كاملةُ الأجر.
 *   بيعُ جزء ⟶ `applyDeviceSaleFinancialsTx` على أمر العمل الذي فتحته
 *              `startDeviceSaleOperationallyTx` قبلها بسطر، بعد أن تفتح
 *              `startDeviceEpisodeTx` الحلقةَ نفسَها في المعاملة عينها
 *              (المرحلة الرابعة — لا نداءين منفصلين بعد اليوم).
 * فلا حسابُ دفترٍ يُكرَّر، ولا ينحرف أحدُ النسختين يوماً.
 *
 * ══ ونصفا البيع كما هما ═════════════════════════════════════════════════
 *   `startDeviceSaleOperationallyTx` — الأمرُ والحلقةُ والسجلّ، **بلا دينار**.
 *   `applyDeviceSaleFinancialsTx`    — المجموعُ والكلفةُ والقيد، **بلا عمل**.
 * ومسارُ المعاينة يركّبهما في `assignManufacturing` كما كان بحرفه، وهذا
 * المسارُ يركّبهما بالترتيب عينه — وقبلهما `startDeviceEpisodeTx` حين تكون
 * الحلقةُ جديدة.
 *
 * ══ والصفرُ لا يُخترَع ═══════════════════════════════════════════════════
 * «بلا أجور» تعني **لا قيدَ ولا كلفةَ ولا دينار** — لا سعراً صفرياً ملفَّقاً.
 * وهي واقعةٌ تُحفَظ على أمر العمل (`no_exam_no_charge`) فلا يُستدَلّ عليها
 * بغياب صفّ. ولا التباسَ بين «مجّانيّ» و«لم يُدخَل».
 *
 * ══ والصفوفُ المعلَّقة تاريخٌ لا مسار ═══════════════════════════════════
 * `createComponentSaleOperation` و`createMaintenanceOperation` **لا تكتبان
 * في `pending_service_charges` إطلاقاً**. والدوالُّ الباقية أدناه
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
import { DEPARTMENT_LABELS } from "@shared/service_taxonomy";
import {
  isProstheticComponent, type ProstheticComponent, requestedItemLabel,
} from "@shared/prosthetic_parts";
import { DEVICE_PAYMENT_TAGS } from "@shared/device_attribution";

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

/**
 * **دفعةُ القبض الفوريّ — كاتبٌ واحد** يشترك فيه بيعُ الجزء بمساره الثلاثة
 * (حلقةٌ جديدة · حلقةٌ موروثة · إلحاقٌ بجهازٍ قيد التصنيع) والصيانةُ معاً —
 * فلا نسخةَ ثانية من كتابة الدفعة تنحرف بين البابين.
 *
 * ══ الثغرةُ التي يُغلقها ═══════════════════════════════════════════════════
 * بيعُ الجزء والصيانةُ المبسّطة يقيّدان الكلفةَ فوراً — لكن لا شيء كان يسأل
 * هل قبض الموظّفُ ثمنَها الآن أم بقيت ديناً. فمريضٌ اشترى سليكوناً ولم يدفع
 * كان يظهر في التقرير كأنّ ماله وصل لحظةَ تسجيل العملية — لا لأن أحداً قال
 * ذلك، بل لأن لا أحد سأل.
 *
 * ══ ونفسُ قاعدة مسار المعاينة، بابٌ مختلف ═══════════════════════════════
 * `server/followup/store.ts: completeReceptionSale` تكتب دفعةً مماثلة عند
 * إتمام بيع جهازٍ بعد معاينة. هذه الدالّةُ **لا تستبدلها ولا تُعاد كتابةُ
 * منطقها** — نسخةٌ مستقلّة لباب «بلا معاينة» بنفس القاعدة: `paidNow === 0`
 * ⟶ لا دفعةَ إطلاقاً (لا صفراً ملفَّقاً ولا دفعةً فارغة)، والهويّةُ صريحةٌ من
 * المستدعي دائماً لا رصيدَ غيرَ مخصَّص.
 *
 * `deviceEpisodeId`/`visitId` — أحدُهما فقط ذو معنى بحسب البابِ المستدعي
 * (بيعُ الجزء يملك حلقةً، الصيانةُ تملك زيارةً)، والآخرُ `null` — فلا يلتبس
 * أحدُهما بالآخر، ونفسُ نمط `payments.visit_id`/`payments.device_episode_id`
 * القائمَين في الجدول (ترحيلا ٠٣٨/٠٤٩).
 *
 * **والكاتبُ القانونيّ نفسُه**: `storage.createPayment` — بلا حسابٍ ثانٍ ولا
 * تكرارِ منطق `insertPaymentRow`.
 *
 * ══ `typeof === "number"` لا `<= 0` — نفسُ درس `attachToDeviceEpisodeId`
 *    بحرفه ═══════════════════════════════════════════════════════════════
 * مستدعٍ داخليّ قد يُغفل `paidNow` تماماً (تصير `undefined` وقت التشغيل
 * بصرف النظر عمّا يفرضه النوعُ السكونيّ — عدّةُ اختباراتٍ قديمة تنادي
 * `createComponentSaleOperation` مباشرةً بعقدٍ يسبق هذا الحقل). و`undefined
 * <= 0` تُقيَّم `false` في JavaScript، فيمرّ الحارسُ الفضفاضُ ويصل
 * `amount: undefined` إلى القيد — يرفضه العمودُ `NOT NULL` بخطأ قاعدةٍ خامٍ
 * لا برسالةِ تحقّقٍ مفهومة. الفحصُ الصريح بالنوع يرفض `undefined` و`null`
 * و`NaN` بالتساوي — لا ثغرةَ للسهو.
 */
async function createPaidNowPaymentTx(tx: any, p: {
  patientId: number; branchId: number; caseId: number;
  deviceEpisodeId: number | null; visitId: number | null;
  serviceType: "prosthetic" | "medical_support";
  paidNow: number; notes: string;
}): Promise<number | null> {
  if (typeof p.paidNow !== "number" || !Number.isFinite(p.paidNow) || p.paidNow <= 0) return null;
  const payment = await storage.createPayment({
    patientId: p.patientId, branchId: p.branchId, caseId: p.caseId,
    deviceEpisodeId: p.deviceEpisodeId, visitId: p.visitId,
    amount: p.paidNow, paymentTreatmentType: DEVICE_PAYMENT_TAGS[p.serviceType],
    notes: p.notes,
  } as any, tx);
  return payment.id;
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
 * **بيعُ جزءٍ من طرفٍ صناعي، مبسّطاً — حفظٌ واحد يفتح الحلقةَ وأمرَ العمل
 * ويقيّد المبلغ النهائيّ معاً.** (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨ — تُلغي عقدَ
 * «افتح الحلقة أوّلاً ثمّ بِعها» ذا النداءين على `POST /device-episodes` ثمّ
 * `POST /device-sale`.)
 *
 * ══ الثغرةُ التي تُغلقها — نصفُ حالةٍ بين نداءين ═══════════════════════════
 * الشكلُ القديم: نداءٌ أوّل يفتح الحلقةَ (قد ينجح)، ثمّ نداءٌ ثانٍ منفصل
 * يبيعها (قد يفشل — شبكةٌ، تحقّقٌ، إغلاقُ تبويب) — فتبقى حلقةٌ مفتوحةٌ يتيمة
 * بلا أمرٍ ولا مال، والموظّفُ لا يعرف أنجح الحفظ أم لا. **فصار الاثنان
 * حدثاً واحداً** في معاملةٍ واحدة: تُفتَح الحلقةُ هنا نفسِها (لا من نقطةٍ
 * عامّة منفصلة — تلك تقاعدت لهذا الشكل بعينه في
 * `server/device_episodes/routes.ts`) ثمّ تُباع فوراً، أو لا يُكتب شيءٌ
 * إطلاقاً.
 *
 * ══ ثلاثةُ أوضاع — حلقةٌ جديدة، أو استئنافُ حلقةٍ موروثة، أو إلحاقٌ بجهازٍ
 *    قيد التصنيع بالفعل ══════════════════════════════════════════════════
 * **جديدة** (`existingEpisodeId` غائب، ولا جهازَ كاملٍ قيد التصنيع مفتوحاً):
 * `startDeviceEpisodeTx` (`server/device_episodes/store.ts`) تفتحها هنا —
 * نفسُ التنفيذ القانونيّ الذي يفتح حلقاتِ مسار المعاينة، بكلّ ثوابته (حالةُ
 * خيطٍ حقيقية مقفولة، حلقةٌ مفتوحةٌ واحدة، لا أمرَ بناءٍ قديمٍ نشط، تسلسلٌ
 * صحيح تحت القفل).
 *
 * **موروثة** (`existingEpisodeId` حاضر): حلقةٌ فتحها الشكلُ القديم ذو
 * النداءين ولم يكتمل بيعُها. `lockCaseAndReadExactEpisode` تقفلها بهويّتها
 * الدقيقة، ويُتحقَّق أنها لهذا المريض، ومن مسار «بلا معاينة» بعينه، وبجزءٍ
 * حقيقيّ (لا جهازاً كاملاً)، وفي حالةٍ تقبل البيع (`awaiting_exam` بالضبط —
 * أُنشئت ولم تُبَع بعد). **والجزءُ يُشتقّ من الحلقة المقفولة لا من جسم
 * الطلب** — فعميلٌ يرسل جزءاً مغايراً مع `existingEpisodeId` لا يبدّل ما
 * طُلب فعلاً؛ الحلقةُ تقول الحقيقة.
 *
 * **إلحاقٌ بجهازٍ قيد التصنيع** (`attachToDeviceEpisodeId` حاضر — إلزاماً
 * **بقرار الموظّف الصريح لا استنتاجٍ خادميّ**): طرفٌ صناعيٌّ كاملٌ بِيع
 * بالأمس ودخل التصنيع، واليوم يُشترى له جزءٌ إضافيّ (أدابتر مثلاً) لنفس
 * الجهاز. **كان الخادمُ يكتشف هذا الوضعَ تلقائياً** (حلقةٌ مفتوحة `in_
 * manufacturing` لجهازٍ كامل على الخيط) **ويُلحق الجزءَ بصمت** — فصار
 * صريحاً: الشاشةُ تسأل حرفياً «هل هذا الجزء إضافة إلى الطرف الجاري
 * تصنيعه؟» (`shared/component_sale.ts: ATTACH_TO_IN_MANUFACTURING_
 * QUESTION`)، و«نعم» وحدها ترسل معرّف الحلقة صراحةً؛ «لا» أو صمتٌ (لم
 * يُطرَح السؤالُ أصلاً لغياب جهازٍ قيد التصنيع) يعني **حلقةً جديدة** —
 * الوضعَ الثالث أعلاه، بحارسه المستقلّ الأصليّ كاملاً.
 *
 * **ولا ثقةَ بالمعرّف المُرسَل وحده**: `attachComponentToDeviceInManufacturing`
 * تعيد التحقّق الكامل تحت قفلها الخاصّ (`storage.ts:
 * loadInManufacturingDeviceOperationTx`) — حلقةٌ باتت غيرَ `in_manufacturing`،
 * أو لمريضٍ آخر، أو ليست جهازاً كاملاً، تُرفَض ٤٠٩ بصفر كتابة، **مهما ادّعى
 * الطلبُ**؛ معرّفٌ بائتٌ (سباقٌ، تبويبٌ قديم) لا يمرّ لمجرّد صحّة شكله الرقميّ.
 *
 * فيُلحَق الجزءُ بالحلقة والأمر **القائمَين بعينهما**: لا حلقةٌ ثانية، ولا
 * أمرٌ ثانٍ، ولا انتقالُ مرحلة — والسعرُ **يُضاف** إلى كلفة الجهاز القائمة لا
 * يستبدلها. **والخبيرُ يُشتقّ من أمر العمل القائم لا من الطلب** — لا يُسأل
 * الموظّفُ عن خبيرٍ ليُتجاهَل اختيارُه (الشرحُ الكامل في
 * `attachComponentToDeviceInManufacturing` أدناه).
 *
 * ══ ونصفا البيع القائمان بلا نسخةٍ ثانية ════════════════════════════════
 * `startDeviceSaleOperationallyTx` تفتح الأمرَ وتنقل الحلقة (بلا دينار)، ثمّ
 * `applyDeviceSaleFinancialsTx` تقيّد الكلفةَ على المريض والحالة والحلقة
 * ودفترِ القيود — **وهما الكاتبان اللذان يناديهما مسارُ المعاينة نفسُه**
 * (`assignManufacturing` تركّبهما بالترتيب عينه) وطابورُ الإكمال الموروث
 * أدناه. فلا محاسبةَ ثانية تنحرف.
 *
 * ══ والحقيقةُ التجارية مُهيكَلة (ترحيل ٠٧٠) ═════════════════════════════
 * `setEpisodeComponentSaleTermsTx` تكتب السعرَ الأصليَّ ونوعَه على الحلقة —
 * في المعاملة نفسِها، لا سطراً ثانياً ولا تحديثاً لاحقاً بعد `COMMIT`.
 * `agreed_cost` (النهائيُّ الفعليّ) يكتبه `applyDeviceSaleFinancialsTx` كما
 * كان — لا عمودَ ثانياً له.
 *
 * ══ والخبيرُ يُعاد التحقّق منه تحت القفل — **بفرع العملية الحقيقيّ لا لقطة
 * الطلب** (تصحيحٌ لاحق) ═════════════════════════════════════════════════
 * **للوضعين الأوّل والثاني وحدهما** — حلقةٌ جديدة أو استئنافُ حلقةٍ موروثة:
 * الخبيرُ هنا سيُسنَد فعلاً، فيُتحقَّق منه. **أمّا الإلحاقُ (الوضعُ الثالث)
 * فلا يُسنِد خبيراً جديداً إطلاقاً** — يشتقّه من أمر العمل القائم، فلا شيءَ
 * ليُتحقَّق منه هنا (الشرحُ الكامل في `attachComponentToDeviceInManufacturing`).
 * فحصُ النقطة المبكّر (`validateExpertForBranch`، بلا `Tx`) ردٌّ سريعٌ لا
 * سلطةٌ نهائية. الكتابةُ الفعليةُ هنا تراجعه بـ`validateExpertForBranchTx`
 * القانونية **تحت قفل المعاملة** — نفسُ حارس الصيانة المبسّطة (المرحلة
 * الثالثة): خبيرٌ صار غيرَ فعّالٍ بين الفحص المبكّر وهذه اللحظة يُرفَض هنا
 * ولو اجتاز الفحصَ المبكّر.
 *
 * **وكانت تُراجَع بـ`params.branchId` نفسِه** — فرعٌ قرأه الخادمُ من صفّ
 * المريض **قبل** فتح هذه المعاملة. تلك لقطةٌ لا سلطة: مريضٌ يُنقَل بين تلك
 * القراءة وهذا القفل، أو نداءٌ داخليٌّ يمرّر فرعاً لا يطابق العمليةَ فعلاً،
 * يجعل الحارسَ المفترَض أن يكون نهائياً يصدّق سلطةً بائتة أو ملفَّقة —
 * فيُسنَد خبيرُ فرعٍ لعمليةِ فرعٍ آخر ويظنّ الحارسُ أنه فعل صوابه.
 *
 * **فصار الفرعُ الفعليُّ يُشتقّ من الحلقة نفسِها تحت القفل**، لا من
 * `params.branchId`: `branchId` التي يُعيدها `startDeviceEpisodeTx` للحلقة
 * الجديدة (تُشتَقّ هناك من فرع الخيط المقفول أو فرع المريض — عمودٌ
 * `NOT NULL` في القاعدة، فلا حلقةً تخرج منها بفرعٍ فارغ)، أو `locked.branchId`
 * التي يُعيدها `lockCaseAndReadExactEpisode` للحلقة الموروثة (فرعُ صفّها
 * هي، مقفولاً الآن). وهذا **الفرعُ نفسُه** الذي تكتبه `startDeviceSaleOperationallyTx`
 * على أمر العمل لاحقاً (عبر فرع المريض المقفول هناك، وحارسُها الداخليّ
 * القائم — «ولا أمرَ في فرعٍ مرتبطٍ بحلقةٍ من فرعٍ آخر» — يوافق بينهما)،
 * فلا فرعين للعملية الواحدة.
 *
 * ══ والفرعُ الفعليُّ يُقارَن بما أذن له الطالبُ — وإلّا ٤٠٩ بصفر كتابة ═════
 * `params.branchId` يبقى مفيداً بمعنىً آخر: هو الفرعُ الذي تحقّق منه
 * الطالبُ (`canReachBranch` في النقطة) **قبل** فتح هذه المعاملة — إذنٌ لا
 * سلطة. فإن اختلف الفرعُ الفعليّ المقفول أعلاه عنه ⟶ ذلك الإذنُ بائتٌ أو لا
 * يخصّ هذه العمليةَ، ويُردّ ٤٠٩ **قبل** أيّ كتابةٍ تشغيلية أو مالية — لا
 * نصفَ عمليةٍ في فرعٍ لم يُؤذَن له. هذا يُغلق سباقاً حقيقياً: نقلُ مريضٍ (أو
 * خيطه) بين قراءة الفرع في النقطة وفتح هذه المعاملة، أو نداءً داخلياً
 * يمرّر فرعاً لا يطابق العملية. و`params.branchId === null` (لا فرعَ أذن
 * له الطالبُ به أصلاً) لا يُقارَن — لا شيءَ يُخالَف.
 *
 * ══ والفرعُ الفارغُ على حلقةٍ قابلةٍ للاستئناف خللٌ لا حالة ثالثة ═════════
 * كلُّ حلقةٍ تجتاز حراسةَ «قابلةٌ للاستئناف» أعلاه (مسارُها `no_exam`،
 * جزءٌ حقيقيّ، حالتُها `awaiting_exam` بالضبط) وُلدت حتماً من
 * `startDeviceEpisodeTx`/`startDeviceEpisode` — الكاتبُ الوحيد لهذا الشكل
 * من الصفوف منذ ترحيلَي ٠٦٥/٠٦٧ — وهو يكتب فرعها دائماً من عمود
 * `patients.branch_id` غيرِ القابل لـ`NULL`، ولا تحديثٌ لاحقٌ يمسحه. فلا
 * سبيلَ صحيحاً لحلقةٍ كهذه أن تحمل فرعاً فارغاً — والفارغُ حين يقع (تلفٌ
 * لا يُفترَض) **يُرفَض صراحةً بـ٤٠٩ لا يُخمَّن بدلاً منه**، لا يُشتقّ من
 * المريض أو الحالة بديلاً؛ فتخمينُ فرعٍ لعمليةٍ لا يُعرَف فرعُها الحقيقيّ
 * إسنادٌ ماليٌّ لفرعٍ لم يُثبَت.
 *
 * ══ ومرّةً واحدة بالضبط ═══════════════════════════════════════════════════
 * المالُ يقع **في معاملة فتح الأمر نفسِها**. فحارسُ الأمر النشط وقفلُ الخيط
 * و`uq_pde_case_open` — التي تمنع أمراً/حلقةً ثانية — تمنع قيداً ثانياً معه:
 * ضغطتان متزامنتان ⟶ الثانيةُ ترتدّ قبل أن تكتب ديناراً، ولا نصفَ كتابة.
 *
 * ══ ولا `pending_service_charges` إطلاقاً ═══════════════════════════════
 * كما كانت `createDeviceSaleOperation` القديمة تماماً — لا صفَّ معلَّق، ولا
 * طابورَ اعتماد، ولا طبيبَ يراجع.
 */
export async function createComponentSaleOperation(params: {
  patientId: number;
  branchId: number | null;
  expertUserId: number;
  /** ثلاثتُها مُشتقّةٌ سلفاً بـ`deriveComponentSaleOffer` — لا حسابَ هنا. */
  originalPrice: number;
  priceKind: "normal" | "discount" | "free";
  /** = `originalPrice - discountAmount`؛ هو ما يُقيَّد فعلاً (`agreed_cost`). */
  finalPrice: number;
  note: string | null;
  actor: Actor;
  /** **إلزاميٌّ** حين لا يوجد `existingEpisodeId` — بيعُ جزءٍ بلا جزءٍ سؤالٌ بلا جواب. */
  component: ProstheticComponent | null;
  /** استئنافُ حلقةٍ موروثة فتحها الشكلُ القديم ذو النداءين ولم يكتمل بيعُها. */
  existingEpisodeId: number | null;
  /**
   * **إلحاقٌ صريحٌ بجهازٍ كاملٍ قيد التصنيع** — يصل فقط حين أجاب الموظّفُ
   * «نعم» عن سؤال «هل هذا الجزء إضافة إلى الطرف الجاري تصنيعه؟». لا
   * تخمينَ خادميّاً بديلاً: غيابُه (`null`) يعني «لا» أو أن السؤالَ لم
   * يُطرَح أصلاً — وكلاهما يُعامَلان سيّان: حلقةٌ جديدة، بحارس التشغيل
   * المستقلّ الأصليّ كما كان دائماً.
   */
  attachToDeviceEpisodeId: number | null;
  /**
   * **«المبلغ المدفوع الآن» — إلزاميٌّ صراحةً، مُشتقٌّ ومُتحقَّقٌ سلفاً
   * بـ`parseComponentSalePaidNow`** (لا حسابَ هنا). صفرٌ = دَينٌ صريح (سعرٌ
   * موجب وصفرٌ مدفوع)، لا يعني «لم يُدفَع بعد» — والمجّانيّ يصل صفراً دائماً
   * بحكم القاعدة (`finalPrice === 0`).
   */
  paidNow: number;
}): Promise<{
  workOrderId: number; deviceEpisodeId: number; component: string | null;
  finalPrice: number;
  /**
   * **الخبيرُ الفعليّ الذي وقعت باسمه العملية** — لا `params.expertUserId`
   * دائماً: للإلحاق هو خبيرُ أمر العمل القائم المُشتقّ خادميّاً، لا ما
   * أرسله الطلب (والذي لا يُقرأ في تلك الحالة إطلاقاً). يعتمد عليه سجلُّ
   * التدقيق ليقول الحقيقة لا ما طُلب.
   */
  expertUserId: number;
  /** = `params.paidNow` — يُعاد ليقوله الردُّ وسجلُّ التدقيق بلا حسابٍ ثانٍ. */
  paidNow: number;
  /** `null` حين `paidNow === 0` — لا دفعةَ إطلاقاً، لا صفراً ملفَّقاً. */
  paymentId: number | null;
}> {
  const store = await import("../storage");
  const episodes = await import("../device_episodes/store");
  const mfg = await import("../manufacturing/store");
  return await db.transaction(async (tx) => {
    let episodeId: number;
    let component: string | null;
    //  ══ **الفرعُ الفعليّ — من الحلقة المقفولة، لا من `params.branchId`** ══
    //  انظر الشرحَ الكامل في تعليق الدالّة أعلاه. يُشتقّ هنا فور معرفة
    //  الحلقة (جديدةً أو مستأنَفة)، ويُحسَم قبل أيّ كتابةٍ تاليةٍ إطلاقاً.
    let actualOperationBranchId: number | null;

    if (params.existingEpisodeId !== null) {
      //  ══ **استئنافُ حلقةٍ موروثة — بهويّتها الدقيقة تحت القفل القانونيّ** ══
      const locked = await episodes.lockCaseAndReadExactEpisode(tx, {
        patientId: params.patientId, serviceType: "prosthetic",
        episodeId: params.existingEpisodeId,
      });
      const ep = locked.episode;
      if (!ep) {
        throw new ChargeError("الجهاز المحدَّد لا يخصّ هذا المريض أو هذه الخدمة", 409);
      }
      if (ep.servicePath !== "no_exam") {
        throw new ChargeError("هذا الطلب على مسار المعاينة — لا يُكمَل من هنا", 409);
      }
      //  **الجهازُ الكاملُ لا يُباع من هنا** — حلقةٌ موروثة ادّعت خلاف ذلك
      //  لا تُصحَّح بصمت، بل تُردّ: بابُها المعاينةُ أو التصحيحُ الإداريّ.
      if (!isProstheticComponent(ep.requestedItem)) {
        throw new ChargeError(
          "الجهازُ الكاملُ لا يُباع من هنا — يحتاج معاينة الطبيب", 409,
        );
      }
      if (ep.status !== "awaiting_exam") {
        throw new ChargeError("تغيّرت حالة هذا الطلب — حدّث الصفحة", 409);
      }
      episodeId = ep.id;
      //  **والجزءُ من الحلقة المقفولة لا من الطلب** — مصدرُ حقيقةِ ما طُلب.
      component = ep.requestedItem;
      //  **وفرعُها كذلك من صفّها المقفول** — لا من جسم الطلب.
      actualOperationBranchId = locked.branchId;
    } else if (typeof params.attachToDeviceEpisodeId === "number") {
      //  ══ **إلحاقٌ صريحٌ بجهازٍ قيد التصنيع — بقرار الموظّف، لا تخمين
      //  الخادم** ═══════════════════════════════════════════════════════
      //  `typeof === "number"` لا `!== null`: مستدعٍ داخليّ قد يُغفل هذا
      //  الحقلَ تماماً (يصير `undefined` وقت التشغيل بصرف النظر عمّا يفرضه
      //  النوعُ السكونيّ) فيمرّ من الحارس الفضفاض — والتفافُه هنا نحو
      //  «إلحاقٌ بمعرّفٍ غيرِ معروف» كان يكسر الاستعلامَ المُعامَليّ داخل
      //  `lockCaseAndReadExactEpisode` (قيمةٌ `undefined` تُسقِطها دالّةُ
      //  `sql` من نصّ الاستعلام بلا رمز ربطٍ بديل). فحصٌ صريحٌ بالنوع
      //  يرفض `null` و`undefined` ومصفوفةً أو نصّاً بالتساوي — لا ثغرةَ
      //  للسهو.
      //  طرفٌ صناعيٌّ كاملٌ بِيع بالأمس ودخل التصنيع، واليوم يُشترى له جزءٌ
      //  إضافيّ (أدابتر مثلاً). كان الخادمُ يكتشف هذا الوضعَ **تلقائياً**
      //  ويُلحق الجزءَ بصمت — وهذا صار صريحاً بقرار المالك: الشاشةُ تسأل
      //  الموظّفَ حرفياً «هل هذا الجزء إضافة إلى الطرف الجاري تصنيعه؟»،
      //  وجوابُه «نعم» هو ما يرسل هذا الحقلَ — **لا استنتاجٌ خادميٌّ بديل**.
      //
      //  **والخادمُ لا يثق بالمعرّف المُرسَل وحده**: `attachComponentTo
      //  DeviceInManufacturing` تعيد التحقّق الكامل تحت قفلها الخاصّ عبر
      //  `store.loadInManufacturingDeviceOperationTx` — حلقةٌ باتت غيرَ
      //  `in_manufacturing`، أو ليست لهذا المريض، أو ليست جهازاً كاملاً،
      //  تُرفَض ٤٠٩ بصفر كتابة، مهما ادّعى الطلبُ. معرّفٌ بائتٌ أو ملفَّق
      //  لا يمرّ لمجرّد أنه رقمٌ صحيح الشكل.
      if (params.component === null) {
        throw new ChargeError("حدّد الجزء المراد بيعه — اختر من القائمة", 400);
      }
      return await attachComponentToDeviceInManufacturing(tx, {
        episodeId: params.attachToDeviceEpisodeId, params,
      });
    } else {
      //  ══ **حلقةٌ جديدة — الحارسُ المستقلّ الأصليّ بلا تغيير** ═══════════
      //  غيابُ `attachToDeviceEpisodeId` (لم يُسأل الموظّفُ، أو أجاب «لا»)
      //  يعني هذه هي: عمليةٌ جديدة تماماً. `startDeviceEpisodeTx` ترفضها
      //  ٤٠٩ `active_device_operation` إن كان الخيطُ مشغولاً بأيّ حلقةٍ
      //  مفتوحة — **بلا استثناء ولا تخمين لنيّة الموظّف** — وهذا الحارسُ
      //  الأصليّ نفسُه بحرفه، لم يُضعَف ولم يُلتَف عليه.
      if (params.component === null) {
        throw new ChargeError("حدّد الجزء المراد بيعه — اختر من القائمة", 400);
      }
      const episode = await episodes.startDeviceEpisodeTx(tx, {
        patientId: params.patientId, serviceType: "prosthetic",
        createdBy: params.actor.userId,
        requestedItem: params.component, servicePath: "no_exam",
      });
      episodeId = episode.id;
      component = episode.requestedItem;
      //  **وفرعُها ما كتبته `startDeviceEpisodeTx` فعلاً** — مُشتقٌّ هناك
      //  تحت القفل من فرع الخيط أو فرع المريض، لا مُدخَلاً من هذا الطلب.
      actualOperationBranchId = episode.branchId;
    }

    //  ══ **فرعٌ فارغ على حلقةٍ قابلةٍ للاستئناف خللٌ لا حالة ثالثة** — يُرفَض
    //  صراحةً لا يُخمَّن بدلاً منه (الشرحُ الكامل أعلاه). ══════════════════
    if (actualOperationBranchId === null) {
      throw new ChargeError(
        "تعذّر تحديد فرع هذه العملية من صفّها — راجع الإدارة قبل المتابعة", 409,
      );
    }

    //  ══ **والفرعُ الفعليّ يُقارَن بما أذن له الطالبُ — وإلّا ٤٠٩ بصفر كتابة**
    //  (الشرحُ الكامل أعلاه). `null` = لم يُؤذَن بفرعٍ بعينه، فلا شيءَ يُخالَف. ══
    if (params.branchId !== null && params.branchId !== actualOperationBranchId) {
      throw new ChargeError(
        "تغيّر فرع هذه العملية بعد التحقّق منه — أعد تحميل الصفحة وحاول مجدداً", 409,
      );
    }

    //  ══ **الخبيرُ يُعاد التحقّق منه تحت القفل — بفرع العملية الفعليّ** —
    //  لا لقطةَ فحصِ النقطة ولا `params.branchId`. ══════════════════════════
    const expertCheck = await mfg.validateExpertForBranchTx(
      tx, params.expertUserId, actualOperationBranchId,
    );
    if (!expertCheck.ok) {
      throw new ChargeError(`${expertCheck.reason} — تحقّق من الخبير وأعد المحاولة`, 409);
    }

    //  ══ **البيعُ نصفان قانونيّان، بلا نسخةٍ ثانية** ═══════════════════════
    const op = await store.startDeviceSaleOperationallyTx(tx, {
      patientId: params.patientId, serviceType: "prosthetic", fields: {},
      expertUserId: params.expertUserId, assignedBy: params.actor.userId,
      deviceEpisodeId: episodeId, expectServicePath: "no_exam",
      //  **الواقعةُ الصريحة** — لا يُستدَلّ عليها بغياب صفّ لاحقاً.
      noExamNoCharge: params.priceKind === "free",
    });
    await store.applyDeviceSaleFinancialsTx(tx, { operation: op, cost: params.finalPrice });

    //  ══ **والحقيقةُ التجارية المُهيكَلة** (ترحيل ٠٧٠) — في المعاملة نفسِها. ══
    await episodes.setEpisodeComponentSaleTermsTx(tx, {
      episodeId, originalPrice: params.originalPrice, kind: params.priceKind,
    });

    //  ══ **القبضُ الفوريّ — بعد أن يثبت البيعُ فعلاً، في المعاملة نفسِها**
    //  (المرحلة الخامسة) ══════════════════════════════════════════════════
    const paymentId = await createPaidNowPaymentTx(tx, {
      patientId: params.patientId, branchId: actualOperationBranchId,
      caseId: op.caseId, deviceEpisodeId: episodeId, visitId: null,
      serviceType: "prosthetic", paidNow: params.paidNow,
      notes: "دفعة عند بيع الجزء",
    });

    return {
      workOrderId: op.workOrderId, deviceEpisodeId: episodeId,
      component, finalPrice: params.finalPrice, expertUserId: params.expertUserId,
      paidNow: params.paidNow, paymentId,
    };
  });
}

/**
 * ══ إلحاقُ جزءٍ بجهازٍ كاملٍ قيد التصنيع — التنفيذ ═══════════════════════
 *
 * تُنادَى من `createComponentSaleOperation` وحدها، بعد أن تحسم هي الشرط
 * (حلقةٌ مفتوحة · `in_manufacturing` · جهازٌ كامل) تحت قفل الخيط الذي
 * فتحته. وهذه الدالّةُ **لا تثق بذلك القرار وحده**:
 * `store.loadInManufacturingDeviceOperationTx` تعيد التحقّق من كلّ شيءٍ
 * تحت قفلها الخاصّ (الحلقة والأمر والفرع)، بنفس عادة `loadDeviceSaleOperationTx`
 * المجاورة — الشرحُ الكامل هناك.
 *
 * ══ ونصفٌ قانونيّ واحد لا نسخةٌ ثانية، وبلا محاسبةٍ موازية ═══════════════════
 * `applyDeviceSaleFinancialsTx` هي **الكاتبُ الماليّ نفسُه** الذي تناديه كلُّ
 * عملية بيع جهاز — بلا تعديلٍ في حسابها بحرف، فقط نصُّ عرضٍ اختياريّ جديد
 * (`notes`) يصف القيدَ بدقّة («إضافة الأدابتر إلى الطرف قيد التصنيع» بدل
 * النصّ العامّ «تخصيص طرف صناعي») — النصُّ القديم يبقى **الافتراضَ لكلّ
 * نداءٍ آخر بلا استثناء**. السعرُ الممرَّر هو **المجموعُ الجديد** (كلفةُ
 * الجهاز الحالية + سعرُ الجزء)، فتحسب الدالّةُ الفرقَ وتقيّده كما تفعل لأيّ
 * بيعٍ آخر. **ولا `startDeviceSaleOperationallyTx` هنا**: لا حلقةَ جديدة
 * ولا أمرَ جديد ولا انتقالَ حالة — الجهازُ قيد التصنيع أصلاً وأمرُه قائم.
 *
 * ══ والخبيرُ لا يُسأل الموظّفُ عنه ليُتجاهَل — يُشتقّ من أمر العمل القائم
 *    ═══════════════════════════════════════════════════════════════════════
 * الإلحاقُ ليس إسنادَ عملٍ جديد — الجهازُ مُسنَدٌ فعلاً لخبيرٍ يعمل عليه.
 * فمطالبةُ الموظّف باختيار خبيرٍ ثمّ **تجاهلُ اختياره** كانت الخطأ: تسأل
 * ثمّ لا تسمع. فصار `op.expertUserId` — المُشتقُّ من `expert_user_id` على
 * أمر العمل نفسِه بواسطة `loadInManufacturingDeviceOperationTx` — هو
 * المصدرَ الوحيد، **ولا `validateExpertForBranchTx` هنا إطلاقاً**: خبيرٌ
 * مُسنَدٌ فعلاً لأمرٍ نشط سلطتُه التشغيلية قائمة بذاتها (نفسُ مبدأ «الخبيرُ
 * الحاليّ على الأمر هو السلطة» في `loadDeviceSaleOperationTx` المجاورة) —
 * لا حاجةَ لإعادة اعتماده لمجرّد أن جزءاً أُضيف. و`params.expertUserId` —
 * إن وصل من عميلٍ قديم — **لا يُقرأ إطلاقاً** هنا.
 *
 * ══ والسجلُّ التشغيليّ يقول ماذا أُلحِق وبكم ═══════════════════════════════
 * صفٌّ في `prosthetic_work_history` على أمر العمل **القائم بعينه**، بنمط
 * «إعادة الإسناد» (`from_stage = to_stage = المرحلةُ الحالية`) — تسجيلٌ لا
 * انتقالُ مرحلة، فالمرحلةُ الحالية لا تتحرّك بحرف.
 *
 * ══ وبلا `setEpisodeComponentSaleTermsTx` ══════════════════════════════════
 * تلك تكتب «كيف سُعِّرت **هذه الحلقة بعينها**» — وحلقةُ الجهاز الكامل هنا لم
 * تُشترَ عبر مسار بيع الجزء، فتسميتُها بحقول بيع جزءٍ تخلط سعرَ الجهاز بسعر
 * الملحق. سعرُ الجزء ونوعُه يُقالان بوضوحٍ في نصّ السجلّ التشغيليّ بدل ذلك.
 */
async function attachComponentToDeviceInManufacturing(
  tx: any,
  args: {
    episodeId: number;
    params: Parameters<typeof createComponentSaleOperation>[0];
  },
): Promise<{
  workOrderId: number; deviceEpisodeId: number; component: string | null;
  finalPrice: number; expertUserId: number;
  paidNow: number; paymentId: number | null;
}> {
  const { episodeId, params } = args;
  const store = await import("../storage");

  //  ══ **إعادةُ التحقّق الكاملة تحت القفل** — لا ثقةَ بالمعرّف المُرسَل
  //  وحده. حلقةٌ باتت غيرَ `in_manufacturing`، أو ليست لهذا المريض، أو
  //  ليست جهازاً كاملاً ⟶ ٤٠٩ بصفر كتابة (الشرحُ الكامل في
  //  `storage.ts: loadInManufacturingDeviceOperationTx`). ═══════════════════
  const op = await store.loadInManufacturingDeviceOperationTx(tx, {
    patientId: params.patientId, serviceType: "prosthetic",
    episodeId, branchId: params.branchId,
  });

  //  ══ **السعرُ دلتا لا كتابةٌ مطلقة** — المجموعُ الجديد لا سعرُ الجزء وحده
  //  (الشرحُ الكامل في تعليق `loadInManufacturingDeviceOperationTx`). ═══════
  const label = requestedItemLabel(params.component, "prosthetic");
  const newAgreedCost = op.priorEpisodeAgreedCost + params.finalPrice;
  await store.applyDeviceSaleFinancialsTx(tx, {
    operation: op, cost: newAgreedCost,
    //  ══ **نصُّ قيدٍ يصف الواقعة الحقيقية — بلا حسابٍ ثانٍ** ═══════════════
    //  «تخصيص طرف صناعي» العامّ صحيحٌ حين تكون العمليةُ هي البيعَ نفسَه؛
    //  هذه إضافةٌ على جهازٍ **قائم**، فتستحقّ سطراً يقول ذلك بوضوح.
    notes: `إضافة ${label} إلى الطرف قيد التصنيع`,
  });

  //  ══ **والسجلُّ التشغيليّ** — لا انتقالَ مرحلة، فقط ماذا أُلحِق وبكم. ═════
  const priceNote = params.priceKind === "free"
    ? `مجّانيّ (أصلُه ${params.originalPrice.toLocaleString("en-US")} د.ع)`
    : params.priceKind === "discount"
      ? `${params.finalPrice.toLocaleString("en-US")} د.ع`
        + ` (بعد خصمٍ من ${params.originalPrice.toLocaleString("en-US")})`
      : `${params.finalPrice.toLocaleString("en-US")} د.ع`;
  await tx.execute(sql`
    INSERT INTO prosthetic_work_history
      (work_order_id, action_type, from_stage, to_stage, notes, performed_by)
    VALUES (${op.workOrderId}, 'component_added', ${op.currentStage}, ${op.currentStage},
            ${`إلحاقُ جزءٍ بالجهاز قيد التصنيع: ${label} — ${priceNote}`
              + (params.note ? ` — ملاحظة: ${params.note}` : "")},
            ${params.actor.userId})
  `);

  //  ══ **القبضُ الفوريّ للإلحاق أيضاً — نفسُ الكاتب المشترك** (المرحلة
  //  الخامسة) ══════════════════════════════════════════════════════════
  const paymentId = await createPaidNowPaymentTx(tx, {
    patientId: op.patientId, branchId: op.branchId ?? 0,
    caseId: op.caseId, deviceEpisodeId: episodeId, visitId: null,
    serviceType: "prosthetic", paidNow: params.paidNow,
    notes: "دفعة عند إلحاق جزءٍ بجهازٍ قيد التصنيع",
  });

  return {
    workOrderId: op.workOrderId, deviceEpisodeId: episodeId,
    component: params.component, finalPrice: params.finalPrice,
    //  **خبيرُ أمر العمل الفعليّ** — لا `params.expertUserId` — كي يقول
    //  سجلُّ التدقيق مَن نُسِبت إليه العمليةُ فعلاً.
    expertUserId: op.expertUserId,
    paidNow: params.paidNow, paymentId,
  };
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
 *
 * ══ تصحيحٌ لاحق — حارسان معامَليّان قبل الكاتب القانونيّ ═════════════════
 * مراجعةٌ حيّة كشفت ثغرتين هادئتين على هذا المسار تحديداً (المرحلة
 * الثالثة)، لا على مسار الصيانة الموروث ولا على بيع الجزء:
 *
 * ١) **الحالةُ الفعلية، لا عَلَمُ المريض وحده.** `patients.is_amputee`/
 *    `is_medical_support` مجرّد عَلَمَين تقرأهما النقطةُ لتقترح
 *    `serviceType` مبكّراً — وقد ينحرفان عن `patient_cases` الحقيقية
 *    (ملفٌّ قديم لم يُزامَن، أو حالةٌ سُحبت بـ`deleteCaseType` وبقي العَلَمُ
 *    صحيحاً بالخطأ). ولو وصل هذا الانحرافُ إلى `createMaintenanceOrderWithVisit`
 *    بلا فحصٍ هنا، كان مخرجُه الموروث (`caseRows.find(...) ?? physiotherapy
 *    ?? caseRows[0]`) يُسند الزيارةَ والكلفةَ لحالةٍ **لا تخصّ هذه الصيانة
 *    فعلاً** — والمخرجُ الموروث يبقى كما هو لعملائه الأصليين (الصيانةُ
 *    كاملةُ الأجر، واعتمادُ الخصم الموروث)؛ هذا حارسٌ **قبله** خاصٌّ
 *    بالمرحلة الثالثة وحدها، لا تعديلٌ فيه.
 * ٢) **الخبير تحت القفل، لا لقطةَ الطلب.** النقطةُ تتحقّق منه قبل فتح
 *    المعاملة لرسالةِ خطأٍ مبكرة — لكنّ تلك قراءةٌ خارج القفل، وقد يتغيّر
 *    حالُ الخبير بين تلك القراءة وهذه الكتابة. فيُعاد التحقّق هنا
 *    بالدالّة المعامَلية القانونية نفسِها التي يستعملها اعتمادُ بيع الجزء
 *    الموروث أعلاه (`validateExpertForBranchTx`) — لا نسخةَ ثانية.
 *
 * وكلاهما **قبل** أيّ نداءٍ لـ`createMaintenanceOrderWithVisit`: رفضٌ هنا
 * يعني صفرَ كتابة — لا أمرَ ولا زيارةَ ولا قيدَ ولا لمسَ كلفة.
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
  /**
   * **«المبلغ المدفوع الآن» — إلزاميٌّ صراحةً، مُشتقٌّ ومُتحقَّقٌ سلفاً
   * بـ`parseMaintenancePaidNow`** (لا حسابَ هنا). نفسُ قاعدة بيع الجزء
   * بحرفها: صفرٌ = دَينٌ صريح، والمجّانيّ يصل صفراً دائماً.
   */
  paidNow: number;
}): Promise<{
  workOrderId: number; deviceEpisodeId: number | null; finalPrice: number;
  paidNow: number; paymentId: number | null;
}> {
  const mfg = await import("../manufacturing/store");
  return await db.transaction(async (tx) => {
    //  ══ **الحارسُ الأوّل — حالةٌ حقيقية بعينها، لا فرعٌ مخمَّن** ══════════
    //  القفلُ (`FOR UPDATE`) يمنع أيضاً أن يسحب `deleteCaseType` هذه
    //  الحالةَ من تحت هذه المعاملة بين هذا الفحص وكتابة `postMaintenanceFee`
    //  لاحقاً — فلا نصفَ صيانةٍ على حالةٍ اختفت للتوّ.
    const caseCheck = await tx.execute(sql`
      SELECT id FROM patient_cases
       WHERE patient_id = ${p.patientId} AND case_type = ${p.serviceType} AND status = 'active'
       FOR UPDATE
    `);
    const caseRow = (caseCheck.rows ?? [])[0];
    if (!caseRow) {
      throw new ChargeError(
        `لا توجد حالة ${DEPARTMENT_LABELS[p.serviceType]} نشطة مسجَّلة لهذا المريض`
        + " — راجع الملفّ إدارياً قبل تسجيل الصيانة",
        400,
      );
    }
    const caseId = Number(caseRow.id);

    //  ══ **الحارسُ الثاني — الخبيرُ يُعاد التحقّق منه تحت القفل** ═════════
    const expertCheck = await mfg.validateExpertForBranchTx(tx, p.expertUserId, p.branchId ?? 0);
    if (!expertCheck.ok) {
      throw new ChargeError(`${expertCheck.reason} — تحقّق من الخبير وأعد المحاولة`, 409);
    }

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

    //  ══ **القبضُ الفوريّ — بعد أن يفتح الأمرُ فعلاً، في المعاملة نفسِها**
    //  (المرحلة الخامسة) ═══════════════════════════════════════════════════
    //  **`visitId` لا `deviceEpisodeId` هويّةً أساسية**: الصيانةُ تُنشئ زيارةً
    //  دائماً (مسجَّلاً كان الجهازُ أم غير مسجَّل)، فالزيارةُ هي الواقعةُ
    //  التي لا تغيب أبداً — نفسُ نمط `payments.visit_id` القائم منذ ٠٣٨.
    //  والحلقةُ (حين توجد) تُضاف أيضاً لدقّةٍ إضافية لا تتعارض معها.
    const paymentId = await createPaidNowPaymentTx(tx, {
      patientId: p.patientId, branchId: p.branchId ?? 0, caseId,
      deviceEpisodeId: order.deviceEpisodeId ?? null, visitId: order.visitId,
      serviceType: p.serviceType, paidNow: p.paidNow,
      notes: "دفعة عند تسجيل الصيانة",
    });

    return {
      workOrderId: order.id,
      deviceEpisodeId: order.deviceEpisodeId ?? null,
      finalPrice: p.finalPrice,
      paidNow: p.paidNow, paymentId,
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

/**
 * **شارةُ الطابور الموروث** (المرحلة الخامسة) — نفسُ نمط `returnedCounts`
 * بالضبط، لعدد صفوف `pending_review` بدل `returned`.
 *
 * `COUNT(*)` حيّةٌ من القاعدة لا `listLegacyOpen(...).length` — تلك مقصورةٌ
 * بـ`LIMIT 200`، فلو تجاوز الطابورُ الحدَّ صار العددُ المعروض أقلَّ من
 * الحقيقة. والشارةُ يجب أن تبقى دقيقةً مهما اتّسع الطابور.
 */
export async function legacyOpenCount(scope: number[] | null): Promise<number> {
  const r = await db.execute(sql`
    SELECT COUNT(*)::int AS n
      FROM pending_service_charges c
     WHERE c.status = 'pending_review' AND ${scopeClause(scope)}
       AND ${belongsToActivePatientSql("c")}
  `);
  return Number((r.rows ?? [])[0]?.n ?? 0);
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
