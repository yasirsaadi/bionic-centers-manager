// المراجعةُ اليومية — طبقةُ القراءة. لا كتابةَ هنا إطلاقاً.
//
// ══ نموذجُ قراءةٍ فوق حقائق قائمة — لا مصدرَ حقيقةٍ جديداً ═══════════════
// كلُّ دالّةٍ هنا تقرأ جدولاً تجارياً قائماً وتترجمه إلى `DailyReviewRow`
// (`shared/daily_review.ts`). **ولا كتابةَ واحدة في هذا الملفّ** — لا
// `INSERT` ولا `UPDATE` ولا `DELETE` على أي جدول. يحرسه اختبارٌ معماريّ في
// `server/daily_review.test.ts`.
//
// ══ إعادةُ استعمال، لا نسخةٌ ثانية من منطق العمل ═══════════════════════════
// أسرةُ «حسم ما بعد المعاينة» تنادي `listDecisionQueueResolved` القانونية
// (`server/followup/decision_queue_store.ts`) بنفسها — لا حساب مطابقٍ
// مكتوبٍ هنا يمكن أن ينحرف عنها يوماً.
//
// ══ «مَن سجّل المريض» — دفعةٌ واحدة لكلّ الأسر ══════════════════════════════
// نفسُ الاستعلام (`audit_log`, entity_type='patient', action='create')
// تحتاجه كلُّ أسرةٍ تقريباً، فيُجلَب **مرّةً واحدة** لكلّ معرّفات المرضى
// الظاهرين في الصفحة بدل استعلامٍ لكلّ صفّ.

import { sql } from "drizzle-orm";
import { db } from "../db";
import {
  moneyFromParts,
  workHistoryMovementLabel,
  WORK_HISTORY_OPENING_ACTION_TYPE,
  UNKNOWN_LEGACY_REGISTRAR_LABEL,
  DAILY_REVIEW_FAMILY_LABELS,
  type DailyReviewRow,
  type DailyReviewFilters,
  type DailyReviewServiceType,
} from "@shared/daily_review";
import { listDecisionQueueResolved } from "../followup/decision_queue_store";

const BAGHDAD_TZ = "Asia/Baghdad";

/**
 * شرطُ SQL خام: هل يقع هذا التاريخ (بتوقيت بغداد) في اليوم المطلوب؟
 * `AT TIME ZONE` يقبل نصّاً كمعاملٍ مُقيَّد كما يقبل حرفياً — فلا حاجةَ
 * لـ`sql.raw` هنا، والمنطقةُ الزمنية تُمرَّر كأي قيمةٍ أخرى.
 */
function baghdadDayEq(col: ReturnType<typeof sql>, date: string) {
  return sql`(${col} AT TIME ZONE ${BAGHDAD_TZ})::date = ${date}::date`;
}

function branchClause(col: ReturnType<typeof sql>, branchId: number | null) {
  return branchId === null ? sql`TRUE` : sql`${col} = ${branchId}`;
}

function serviceClause(col: ReturnType<typeof sql>, serviceType: DailyReviewFilters["serviceType"]) {
  return serviceType === "all" ? sql`TRUE` : sql`${col} = ${serviceType}`;
}

// ── «مَن سجّل المريض» — دفعةٌ واحدة ──────────────────────────────────────

async function registrationActorsFor(patientIds: number[]): Promise<Map<number, string | null>> {
  const map = new Map<number, string | null>();
  if (patientIds.length === 0) return map;
  const r = await db.execute<{ entity_id: number; user_name: string | null }>(sql`
    SELECT DISTINCT ON (entity_id) entity_id, user_name
      FROM audit_log
     WHERE entity_type = 'patient' AND action = 'create'
       AND entity_id IN (${sql.join(patientIds.map((id) => sql`${id}`), sql`, `)})
     ORDER BY entity_id, id ASC
  `);
  for (const row of r.rows ?? []) map.set(Number(row.entity_id), row.user_name ?? null);
  return map;
}

function attachRegistrar(rows: DailyReviewRow[], actors: Map<number, string | null>): void {
  for (const row of rows) {
    const name = actors.get(row.patientId) ?? null;
    row.registeredByName = name;
    row.registeredByUnknownLegacy = name === null;
  }
}

// ── ١. تسجيلُ المريض ─────────────────────────────────────────────────────
//
// **الزمنُ الموثوق**: سطرُ تدقيق التسجيل (`audit_log.created_at`) حين
// يوجد — هو لحظةُ الفعل الحقيقية، لا `patients.created_at` التي قد تكون
// تاريخاً تجارياً مُدخَلاً بأثرٍ رجعي (تسجيلٌ بتاريخٍ سابق). وحين لا يوجد
// سطرُ تدقيق (ملفٌّ قديم) يُستعمَل `patients.created_at` وحدَه **مكانَ
// الزمن فقط** — لا مكانَ الفاعل: الفاعلُ يبقى «غير معروف — سجل قديم»
// دائماً في هذه الحالة، ولا يُخمَّن من أي مصدرٍ آخر.
async function fetchRegistrationRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT p.id, p.name, p.patient_code, p.branch_id, b.name AS branch_name,
           p.is_amputee, p.is_medical_support, p.created_at AS patient_created_at,
           reg.user_name AS reg_name, reg.created_at AS reg_at
      FROM patients p
      JOIN branches b ON b.id = p.branch_id
      LEFT JOIN LATERAL (
        SELECT user_name, created_at FROM audit_log
         WHERE entity_type = 'patient' AND entity_id = p.id AND action = 'create'
         ORDER BY id ASC LIMIT 1
      ) reg ON TRUE
     WHERE p.deleted_at IS NULL
       AND (p.is_amputee = true OR p.is_medical_support = true)
       AND ${branchClause(sql`p.branch_id`, f.branchId)}
       AND ${f.serviceType === "all"
         ? sql`TRUE`
         : f.serviceType === "prosthetic"
           ? sql`p.is_amputee = true`
           : sql`p.is_medical_support = true`}
       AND ${baghdadDayEq(sql`COALESCE(reg.created_at, p.created_at)`, f.date)}
  `);

  return (r.rows ?? []).map((row) => {
    const isAmputee = Boolean(row.is_amputee);
    const isSupport = Boolean(row.is_medical_support);
    const serviceType: DailyReviewServiceType = isAmputee ? "prosthetic" : "medical_support";
    const both = isAmputee && isSupport;
    const eventAt = (row.reg_at ?? row.patient_created_at) as string;
    const registeredByName = row.reg_name ?? null;
    return {
      id: `registration:${row.id}`,
      family: "registration",
      eventAt: new Date(eventAt).toISOString(),
      patientId: Number(row.id),
      patientName: String(row.name),
      patientCode: row.patient_code ?? null,
      branchId: row.branch_id === null ? null : Number(row.branch_id),
      branchName: row.branch_name ?? null,
      serviceType,
      whyTheyCame: null,
      whatHappened: both
        ? "تسجيل مريض جديد — أطراف صناعية ومساند طبية"
        : `تسجيل مريض جديد — ${isAmputee ? "أطراف صناعية" : "مساند طبية"}`,
      registeredByName,
      registeredByUnknownLegacy: registeredByName === null,
      performedByName: registeredByName, // الحدثُ نفسُه هو التسجيل، فمَن أدّاه هو مَن سجّل.
      doctorName: null,
      expertName: null,
      purchaseDecision: null,
      notBoughtReason: null,
      money: null,
      actualAmountPaid: null,
      paymentActorName: null,
      paymentActorDirect: false,
      businessDate: null,
    } satisfies DailyReviewRow;
  });
}

// ── ٢. معاينةٌ طبية موقّعة ────────────────────────────────────────────────
//
// **الفعّالة والملغاة معاً تُعرَضان** — القراءةُ التدقيقية تبقى كاملة
// (نفسُ مبدأ `server/medical/active_exam.ts`)، لكنّ الملغاةَ توسَم صراحةً
// في `whatHappened` فلا تُقرأ سلطةً سريريةً قائمة.
async function fetchExamRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.patient_id, e.branch_id, e.case_type, e.chief_complaint,
           e.doctor_name, e.signed_at,
           p.name, p.patient_code, b.name AS branch_name,
           (mec.exam_id IS NOT NULL) AS is_cancelled
      FROM medical_exams e
      JOIN patients p ON p.id = e.patient_id AND p.deleted_at IS NULL
      LEFT JOIN branches b ON b.id = e.branch_id
      LEFT JOIN medical_exam_cancellations mec ON mec.exam_id = e.id
     WHERE e.case_type IN ('prosthetic', 'medical_support')
       AND ${branchClause(sql`e.branch_id`, f.branchId)}
       AND ${serviceClause(sql`e.case_type`, f.serviceType)}
       AND ${baghdadDayEq(sql`e.signed_at`, f.date)}
  `);

  return (r.rows ?? []).map((row) => {
    const cancelled = Boolean(row.is_cancelled);
    return {
      id: `exam:${row.id}`,
      family: "exam",
      eventAt: new Date(row.signed_at).toISOString(),
      patientId: Number(row.patient_id),
      patientName: String(row.name),
      patientCode: row.patient_code ?? null,
      branchId: row.branch_id === null ? null : Number(row.branch_id),
      branchName: row.branch_name ?? null,
      serviceType: row.case_type as DailyReviewServiceType,
      whyTheyCame: row.chief_complaint ?? null,
      whatHappened: cancelled ? "معاينة طبية موقّعة (ملغاة لاحقاً)" : "معاينة طبية موقّعة",
      registeredByName: null, // تُملأ دفعةً واحدة لاحقاً
      registeredByUnknownLegacy: false,
      performedByName: row.doctor_name ?? null,
      doctorName: row.doctor_name ?? null,
      expertName: null,
      purchaseDecision: null,
      notBoughtReason: null,
      money: null,
      actualAmountPaid: null,
      paymentActorName: null,
      paymentActorDirect: false,
      businessDate: null,
    } satisfies DailyReviewRow;
  });
}

// ── ٣. حسمُ ما بعد المعاينة — إعادةُ استعمال، لا حسابٌ ثانٍ ────────────────
async function fetchPostExamDecisionRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const { rows } = await listDecisionQueueResolved({
    scope: null, // المراجعةُ اليومية للمسؤول العام وحده — لا حصرَ فرعٍ أمنيّ هنا.
    branchId: f.branchId,
    serviceType: f.serviceType === "all" ? undefined : f.serviceType,
    limit: 5000, // سقفٌ عمليّ لا صفحة — يكفي حتى ليلةً مزدحمة جداً بمراتب.
  });

  const out: DailyReviewRow[] = [];
  for (const d of rows) {
    if (!d.resolvedAt) continue;
    const resolvedAt = new Date(d.resolvedAt);
    if (Number.isNaN(resolvedAt.getTime())) continue;
    // فلترةُ اليوم من التاريخ نفسه المعروض — لا استعلامَ إضافياً.
    const bDay = new Intl.DateTimeFormat("en-CA", { timeZone: BAGHDAD_TZ }).format(resolvedAt);
    if (bDay !== f.date) continue;

    const money = moneyFromParts(d.originalPrice, d.result === "bought" ? d.approvedPrice : null, d.priceKind);
    out.push({
      id: `post_exam_decision:${d.followupId}`,
      family: "post_exam_decision",
      eventAt: resolvedAt.toISOString(),
      patientId: d.patientId,
      patientName: d.patientName,
      patientCode: d.patientCode,
      branchId: d.branchId,
      branchName: d.branchName,
      serviceType: d.serviceType,
      whyTheyCame: null, // يُشتقّ من معاينتها — لا حقلَ مستقلّاً هنا؛ راجع أسرة «٢».
      whatHappened: d.result === "bought" ? "إتمام بيع جهاز — بعد معاينة" : "لم يشترِ — بعد معاينة",
      registeredByName: null,
      registeredByUnknownLegacy: false,
      performedByName: d.resolvedByName ?? null,
      doctorName: null, // القرارُ التجاريّ ليس للطبيب بعد ٤.h/٤.i — لا يُعرَض هنا.
      expertName: d.result === "bought" ? d.selectedExpertName : null,
      purchaseDecision: d.result,
      notBoughtReason: d.result === "not_bought" ? d.notBoughtReasonText : null,
      money: d.result === "bought" ? money : null,
      actualAmountPaid: null, // تُملأ لاحقاً من دفعات الحلقة المرتبطة، إن وُجدت.
      paymentActorName: null,
      paymentActorDirect: false,
      businessDate: null,
    });
  }
  return out;
}

// ── ٤. فتحُ صيانة ────────────────────────────────────────────────────────
async function fetchMaintenanceOpenedRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT wo.id AS order_id, wo.patient_id, wo.branch_id, wo.service_type,
           wo.maintenance_component, wo.maintenance_original_price,
           wo.maintenance_final_price, wo.maintenance_price_kind,
           wo.expert_user_id, xu.display_name AS expert_name,
           p.name, p.patient_code, b.name AS branch_name,
           wh.id AS history_id, wh.created_at AS opened_at, wh.performed_by,
           au.display_name AS performed_by_name
      FROM prosthetic_work_orders wo
      JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL
      LEFT JOIN branches b ON b.id = wo.branch_id
      LEFT JOIN system_users xu ON xu.id = wo.expert_user_id
      LEFT JOIN system_users au ON au.id = wo.assigned_by
      -- سطرُ الفتح نفسُه («created») — زمنُه هو زمنُ الحدث الموثوق، لا
      -- wo.created_at (نفسُ العمود عملياً، لكن التاريخيّ الحقيقي مصدره
      -- السجلّ لا صفّ الأمر — نفس المبدأ الذي يحرسه اختبار الحركات أدناه).
      JOIN prosthetic_work_history wh
        ON wh.work_order_id = wo.id AND wh.action_type = 'created'
      LEFT JOIN system_users wu ON wu.id = wh.performed_by
     WHERE wo.purpose = 'maintenance'
       AND ${branchClause(sql`wo.branch_id`, f.branchId)}
       AND ${serviceClause(sql`wo.service_type`, f.serviceType)}
       AND ${baghdadDayEq(sql`wh.created_at`, f.date)}
  `);

  return (r.rows ?? []).map((row) => ({
    id: `maintenance_opened:${row.order_id}`,
    family: "maintenance_opened",
    eventAt: new Date(row.opened_at).toISOString(),
    patientId: Number(row.patient_id),
    patientName: String(row.name),
    patientCode: row.patient_code ?? null,
    branchId: row.branch_id === null ? null : Number(row.branch_id),
    branchName: row.branch_name ?? null,
    serviceType: row.service_type as DailyReviewServiceType,
    whyTheyCame: row.maintenance_component ?? null,
    whatHappened: "فتح صيانة",
    registeredByName: null,
    registeredByUnknownLegacy: false,
    performedByName: row.performed_by_name ?? null,
    doctorName: null, // لا سلطةَ طبّية على الصيانة المبسّطة (٤.ي) — لا يُعرَض حرفاً.
    expertName: row.expert_name ?? null,
    purchaseDecision: null,
    notBoughtReason: null,
    money: moneyFromParts(row.maintenance_original_price, row.maintenance_final_price, row.maintenance_price_kind),
    actualAmountPaid: null,
    paymentActorName: null,
    paymentActorDirect: false,
    businessDate: null,
  } satisfies DailyReviewRow));
}

// ── ٥. بيعُ جزءٍ بلا معاينة ───────────────────────────────────────────────
async function fetchComponentSaleOpenedRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT de.id AS episode_id, de.patient_id, de.branch_id, de.requested_item,
           de.component_sale_original_price, de.component_sale_price_kind, de.agreed_cost,
           wo.id AS order_id, wo.service_type, wo.expert_user_id, xu.display_name AS expert_name,
           p.name, p.patient_code, b.name AS branch_name,
           wh.created_at AS opened_at, au.display_name AS performed_by_name
      FROM patient_device_episodes de
      JOIN prosthetic_work_orders wo ON wo.device_episode_id = de.id AND wo.purpose = 'initial_build'
      JOIN patients p ON p.id = de.patient_id AND p.deleted_at IS NULL
      LEFT JOIN branches b ON b.id = de.branch_id
      LEFT JOIN system_users xu ON xu.id = wo.expert_user_id
      JOIN prosthetic_work_history wh
        ON wh.work_order_id = wo.id AND wh.action_type = 'created'
      LEFT JOIN system_users au ON au.id = wo.assigned_by
     WHERE de.service_path = 'no_exam'
       AND de.component_sale_price_kind IS NOT NULL
       AND ${branchClause(sql`de.branch_id`, f.branchId)}
       AND ${serviceClause(sql`wo.service_type`, f.serviceType)}
       AND ${baghdadDayEq(sql`wh.created_at`, f.date)}
  `);

  return (r.rows ?? []).map((row) => ({
    id: `component_sale_opened:${row.episode_id}`,
    family: "component_sale_opened",
    eventAt: new Date(row.opened_at).toISOString(),
    patientId: Number(row.patient_id),
    patientName: String(row.name),
    patientCode: row.patient_code ?? null,
    branchId: row.branch_id === null ? null : Number(row.branch_id),
    branchName: row.branch_name ?? null,
    serviceType: row.service_type as DailyReviewServiceType,
    whyTheyCame: row.requested_item ?? null,
    whatHappened: "بيع جزء بلا معاينة",
    registeredByName: null,
    registeredByUnknownLegacy: false,
    performedByName: row.performed_by_name ?? null,
    doctorName: null, // آخِرُ باب أُغلق أمام الطبيب على هذا المسار (٤.ك) — لا يُعرَض حرفاً.
    expertName: row.expert_name ?? null,
    purchaseDecision: null,
    notBoughtReason: null,
    money: moneyFromParts(row.component_sale_original_price, row.agreed_cost, row.component_sale_price_kind),
    actualAmountPaid: null,
    paymentActorName: null,
    paymentActorDirect: false,
    businessDate: null,
  } satisfies DailyReviewRow));
}

// ── ٦. حركاتُ تصنيع/صيانة لاحقة ───────────────────────────────────────────
//
// **`actionType <> 'created'` وحدها** — الفتحُ ممثَّلٌ سلفاً في الأسرتين ٤/٥
// (أو في مسار المعاينة، غير المعروض كأسرةٍ منفصلة هنا لأنه هو نفسُه أسرة ٣
// حين يُشترى). والخبيرُ المعروض هو **الخبير الحاليّ على الأمر** — لا لقطةً
// لحظةَ الحركة؛ القاعدةُ لا تحفظ من كان الخبيرَ حينها فلا يُدَّعى ذلك.
async function fetchManufacturingMovementRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT wh.id AS history_id, wh.work_order_id, wh.action_type, wh.notes, wh.created_at,
           wh.performed_by, pu.display_name AS performed_by_name,
           wo.patient_id, wo.branch_id, wo.service_type, wo.purpose,
           wo.expert_user_id, xu.display_name AS expert_name,
           p.name, p.patient_code, b.name AS branch_name
      FROM prosthetic_work_history wh
      JOIN prosthetic_work_orders wo ON wo.id = wh.work_order_id
      JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL
      LEFT JOIN branches b ON b.id = wo.branch_id
      LEFT JOIN system_users xu ON xu.id = wo.expert_user_id
      LEFT JOIN system_users pu ON pu.id = wh.performed_by
     WHERE wh.action_type <> ${WORK_HISTORY_OPENING_ACTION_TYPE}
       AND ${branchClause(sql`wo.branch_id`, f.branchId)}
       AND ${serviceClause(sql`wo.service_type`, f.serviceType)}
       AND ${baghdadDayEq(sql`wh.created_at`, f.date)}
  `);

  return (r.rows ?? []).map((row) => {
    const label = workHistoryMovementLabel(String(row.action_type), row.notes ?? null);
    const isMaintenance = row.purpose === "maintenance";
    return {
      id: `manufacturing_movement:${row.history_id}`,
      family: "manufacturing_movement",
      eventAt: new Date(row.created_at).toISOString(),
      patientId: Number(row.patient_id),
      patientName: String(row.name),
      patientCode: row.patient_code ?? null,
      branchId: row.branch_id === null ? null : Number(row.branch_id),
      branchName: row.branch_name ?? null,
      serviceType: row.service_type as DailyReviewServiceType,
      whyTheyCame: null,
      whatHappened: isMaintenance ? `${label} (صيانة)` : label,
      registeredByName: null,
      registeredByUnknownLegacy: false,
      performedByName: row.performed_by_name ?? null,
      doctorName: null,
      // الخبيرُ الحاليّ على الأمر — يُعرَض بعنوانٍ يقول ذلك صراحةً في الواجهة،
      // لا كأنه خبيرُ لحظةِ هذه الحركة بعينها.
      expertName: row.expert_name ?? null,
      purchaseDecision: null,
      notBoughtReason: null,
      money: null,
      actualAmountPaid: null,
      paymentActorName: null,
      paymentActorDirect: false,
      businessDate: null,
    } satisfies DailyReviewRow;
  });
}

// ── ٧. دفعاتُ الأجهزة الحقيقية ────────────────────────────────────────────
//
// **التصنيفُ حتميٌّ لا مخمَّن**: فقط دفعةٌ مربوطةٌ بحالةٍ (`case_id`) نوعُها
// أطرافٌ أو مساند صراحةً تُعرَض؛ دفعةٌ بلا حالة، أو بحالة علاج طبيعي، أو
// بحالةٍ لا تُقرأ — **تُستبعَد كلياً**، لا تُصنَّف تخميناً. ومَن قبض لا
// يُعرَض إلا حين يثبته سطرُ تدقيقٍ مباشر (`entity_type='payment'`) على
// الدفعة نفسها — لا استدلالاً من سطرٍ متزامنٍ على كيانٍ آخر.
async function fetchDevicePaymentRows(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT pay.id, pay.patient_id, pay.branch_id, pay.amount, pay.date, pay.notes,
           pc.case_type,
           p.name, p.patient_code, b.name AS branch_name,
           al.user_name AS payer_name, al.created_at AS audit_at
      FROM payments pay
      JOIN patients p ON p.id = pay.patient_id AND p.deleted_at IS NULL
      JOIN patient_cases pc ON pc.id = pay.case_id AND pc.case_type IN ('prosthetic', 'medical_support')
      LEFT JOIN branches b ON b.id = pay.branch_id
      LEFT JOIN LATERAL (
        SELECT user_name, created_at FROM audit_log
         WHERE entity_type = 'payment' AND entity_id = pay.id AND action = 'create'
         ORDER BY id ASC LIMIT 1
      ) al ON TRUE
     WHERE pay.amount > 0
       AND ${branchClause(sql`pay.branch_id`, f.branchId)}
       AND ${serviceClause(sql`pc.case_type`, f.serviceType)}
       AND ${baghdadDayEq(sql`COALESCE(al.created_at, pay.date)`, f.date)}
  `);

  return (r.rows ?? []).map((row) => {
    const direct = row.audit_at != null;
    const eventAt = (row.audit_at ?? row.date) as string;
    return {
      id: `device_payment:${row.id}`,
      family: "device_payment",
      eventAt: new Date(eventAt).toISOString(),
      patientId: Number(row.patient_id),
      patientName: String(row.name),
      patientCode: row.patient_code ?? null,
      branchId: row.branch_id === null ? null : Number(row.branch_id),
      branchName: row.branch_name ?? null,
      serviceType: row.case_type as DailyReviewServiceType,
      whyTheyCame: null,
      whatHappened: "دفعة على جهاز",
      registeredByName: null,
      registeredByUnknownLegacy: false,
      performedByName: null,
      doctorName: null,
      expertName: null,
      purchaseDecision: null,
      notBoughtReason: null,
      money: null,
      actualAmountPaid: Number(row.amount),
      paymentActorName: direct ? (row.payer_name ?? null) : null,
      paymentActorDirect: direct,
      businessDate: row.date ? new Date(row.date).toISOString().slice(0, 10) : null,
    } satisfies DailyReviewRow;
  });
}

// ── التجميع ──────────────────────────────────────────────────────────────

/**
 * كلُّ صفوف اليوم المطلوب، مُصنَّفةً حسب الفلاتر ومرتَّبةً بالأحدث أوّلاً.
 *
 * **قراءةٌ فقط بالكامل**: سبعُ دوالٍّ مستقلّة تُنادى معاً، ثم دمجٌ وفرزٌ في
 * الذاكرة — بلا `UNION` في القاعدة (الأشكالُ مختلفةٌ جداً بين الأسر لتبريره)
 * وبلا حسابٍ محاسبيّ من أي نوع.
 */
export async function getDailyReviewEvents(f: DailyReviewFilters): Promise<DailyReviewRow[]> {
  const [registration, exam, postExamDecision, maintenanceOpened, componentSaleOpened, movements, payments] =
    await Promise.all([
      fetchRegistrationRows(f),
      fetchExamRows(f),
      fetchPostExamDecisionRows(f),
      fetchMaintenanceOpenedRows(f),
      fetchComponentSaleOpenedRows(f),
      fetchManufacturingMovementRows(f),
      fetchDevicePaymentRows(f),
    ]);

  const all = [...registration, ...exam, ...postExamDecision, ...maintenanceOpened, ...componentSaleOpened,
    ...movements, ...payments];

  // «مَن سجّل المريض» — دفعةٌ واحدة لكلّ معرّفات المرضى الظاهرين، بدل
  // استعلامٍ لكلّ صفّ (الأسرةُ الأولى تحمله أصلاً من استعلامها الخاصّ).
  const needRegistrar = all.filter((r) => r.family !== "registration");
  const ids = Array.from(new Set(needRegistrar.map((r) => r.patientId)));
  const actors = await registrationActorsFor(ids);
  attachRegistrar(needRegistrar, actors);

  all.sort((a, b) => (a.eventAt < b.eventAt ? 1 : a.eventAt > b.eventAt ? -1 : 0));
  return all;
}

/** أسماءُ الأسر كنصٍّ عربيّ — للواجهة، دون تكرار الخريطة هناك. */
export { DAILY_REVIEW_FAMILY_LABELS, UNKNOWN_LEGACY_REGISTRAR_LABEL };
