// Manufacturing data layer — all DB access for the prosthetic/medical-support
// module. Enforces the core rules at the query level:
//   - per-EXPERT isolation (expert sees only expert_user_id = his id)
//   - expert-safe patient projection (NO financial fields ever selected)
//   - append-only history & rework (no delete methods exist here)
//   - atomic patient + work-order creation via a real transaction.

import { db } from "../db";
import {
  patients, branches, systemUsers, visits, patientCases, costEntries,
  prostheticWorkOrders as WO,
  prostheticWorkHistory as WH,
  prostheticReworkEvents as RW,
  patientDeviceEpisodes as PDE,
  type InsertPatient, type Patient, type ProstheticWorkOrder,
} from "@shared/schema";
import { and, eq, or, inArray, notInArray, sql, desc, asc } from "drizzle-orm";
import { normalizePhone, DEFAULT_PHONE_COUNTRY } from "@shared/phone";
import { buildPatientSearch, trigramReady } from "../patient_search/sql";
import { activePatientDrizzle } from "../patients/active_patient";
import { recordOrderCreatedEvent, recordStageEvent, recordDeliveryDateEvent } from "./events";
import {
  syncEpisodeToOrderTerminalState, lockCaseAndReadOpenEpisode,
  isDeviceServiceType, DeviceEpisodeError, resolveDeviceTargetTx,
} from "../device_episodes/store";
import { parseComponent, componentLabel } from "@shared/prosthetic_parts";

// Thrown when a maintenance order can't be opened because the patient still has
// an open (non-completed, non-cancelled) order. The route maps it to 409.
export class ActiveOrderError extends Error {
  constructor() { super("active order exists"); this.name = "ActiveOrderError"; }
}

/**
 * هل يوجد أمرٌ مفتوح **يزاحم** هذا الأمر؟
 *
 * ══ لماذا صار السؤال بحسب الغرض والجهاز ═══════════════════════════════
 * كان الحارس يسأل: «هل للمريض أمرٌ مفتوح من هذه الخدمة؟» — وكان صحيحاً
 * يوم كان له جهازٌ واحد من كل نوع. أمّا اليوم فطرفٌ مسلَّم يحتاج صيانة
 * وطرفٌ جديد قيد التصنيع عملان مستقلّان على جهازين مختلفين، ولا معنى
 * لأن يمنع أحدهما الآخر.
 *
 * فالمزاحمة الحقيقية ثلاث لا أكثر:
 *   - بناءٌ أوليٌّ يزاحم بناءً أولياً آخر لنفس (المريض، النوع).
 *   - وصيانةُ جهازٍ مسجَّل تزاحم صيانةً أخرى **لذلك الجهاز بعينه**.
 *   - وصيانةُ جهازٍ غير مسجَّل تزاحم مثيلتها لنفس (المريض، النوع)،
 *     إذ لا هوية تفرّق بين جهازين لا حلقة لهما.
 *
 * والفهارس الثلاثة في ترحيل ٠٥١ تحرس الشروط نفسها في القاعدة، فهذا
 * الفحص يعطي الرسالة والقاعدة تعطي الضمان.
 */
export async function hasOpenOrder(params: {
  patientId: number;
  serviceType: string;
  purpose: "initial_build" | "maintenance";
  /** للصيانة فقط: الجهاز المقصود. `null` = جهازٌ غير مسجَّل. */
  deviceEpisodeId?: number | null;
}): Promise<boolean> {
  const rows = await db.execute<{ id: number }>(sql`
    SELECT id FROM prosthetic_work_orders
     WHERE status NOT IN ('completed', 'cancelled')
       AND ${buildCompetitionFilter(params)}
     LIMIT 1
  `);
  return (rows.rows ?? []).length > 0;
}

/**
 * شرط المزاحمة — مشترَك بين الفحص المسبق والحارس داخل المعاملة.
 *
 * ══ الفرعان متناظران الآن (ترحيل ٠٧٣) ═══════════════════════════════════
 * **بناءٌ أوليٌّ بحلقةٍ محدَّدة الهوية ⟶ الحلقةُ نفسُها فقط تُزاحمه** — تماماً
 * كالصيانة. مريضٌ يملك بناءً أوّلياً مفتوحاً لحلقةٍ (جهازٍ) ثمّ يفتح عمليةً
 * **مستقلّة** لحلقةٍ أخرى (قرارُ المالك: أيّ عددٍ من العمليات المتوازية)
 * لم يعد يُرفَض — المزاحمةُ الحقيقية الوحيدة أمرا عملٍ لنفس الحلقة بعينها.
 * **وغيابُ الهويّة يبقى على القاعدة القديمة بحرفها**: صفوفٌ تاريخية أو
 * مسارٌ لا يحمل حلقة (`createWorkOrderForExisting` حين لا حلقةَ حيّة) —
 * لا هويّةَ جهازٍ تُميّز بينها، فتبقى المزاحمةُ بـ(مريض، خدمة) فقط.
 */
function buildCompetitionFilter(params: {
  patientId: number;
  serviceType: string;
  purpose: "initial_build" | "maintenance";
  deviceEpisodeId?: number | null;
}) {
  if (params.purpose === "initial_build") {
    if (params.deviceEpisodeId != null) {
      return sql`purpose = 'initial_build' AND device_episode_id = ${params.deviceEpisodeId}`;
    }
    return sql`patient_id = ${params.patientId}
      AND service_type = ${params.serviceType}
      AND COALESCE(purpose, 'initial_build') = 'initial_build'
      AND device_episode_id IS NULL`;
  }
  if (params.deviceEpisodeId != null) {
    return sql`purpose = 'maintenance' AND device_episode_id = ${params.deviceEpisodeId}`;
  }
  return sql`patient_id = ${params.patientId}
    AND service_type = ${params.serviceType}
    AND purpose = 'maintenance'
    AND device_episode_id IS NULL`;
}

/**
 * **هل لهذا المريض جهازٌ سابق من هذه الخدمة؟**
 *
 * ══ لماذا يلزم ═════════════════════════════════════════════════════════
 * اختصارُ «بدء التصنيع وإسناد خبير» موروثٌ لمريضٍ سُجِّل **للمعاينة فقط**:
 * بلا كلفةٍ ولا خبيرٍ ولا أمر — ثم قرّر الشراء. وحارسُه كان «لا أمرَ نشط»،
 * فمتى اكتمل أمرُه الأول صار «غيرَ نشط» **فعاد الاختصارُ يظهر** — يبدأ
 * جهازاً ثانياً بلا حلقةٍ ولا معاينةٍ جديدة ولا سعر.
 *
 * ══ وما يُعَدّ «جهازاً سابقاً» ═════════════════════════════════════════
 * أيُّ أمرِ بناءٍ سابق **مهما كانت حالته** — مكتملاً أو ملغى أو نشطاً —
 * أو أيُّ حلقةِ جهاز. فحتى الملغى يعني أن الملفّ عرف هذا الباب مرّة،
 * والعائدُ بعده يمرّ بالمسار الكامل لا بالاختصار.
 *
 * **ولا يُقرأ منه شيءٌ للحذف**: هذا سؤالُ بابٍ لا حكمٌ على تاريخ. الأمرُ
 * المكتمل وخبيرُه يبقيان معروضين كما هما.
 */
export async function hasPriorDevice(params: {
  patientId: number; serviceType: string;
}): Promise<boolean> {
  const orders = await db.execute<{ id: number }>(sql`
    SELECT id FROM prosthetic_work_orders
     WHERE patient_id = ${params.patientId}
       AND service_type = ${params.serviceType}
       AND purpose = 'initial_build'
     LIMIT 1
  `);
  if ((orders.rows ?? []).length > 0) return true;
  const eps = await db.execute<{ id: number }>(sql`
    SELECT e.id FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id AND pc.patient_id = e.patient_id
     WHERE e.patient_id = ${params.patientId}
       AND pc.case_type = ${params.serviceType}
     LIMIT 1
  `);
  return (eps.rows ?? []).length > 0;
}

/** نفس الشرط، داخل معاملة المُستدعي. */
export async function hasOpenOrderTx(
  tx: { execute: (q: any) => Promise<any> },
  params: {
    patientId: number; serviceType: string;
    purpose: "initial_build" | "maintenance"; deviceEpisodeId?: number | null;
  },
): Promise<boolean> {
  const rows = await tx.execute(sql`
    SELECT id FROM prosthetic_work_orders
     WHERE status NOT IN ('completed', 'cancelled')
       AND ${buildCompetitionFilter(params)}
     LIMIT 1
  `);
  return (rows.rows ?? []).length > 0;
}
import {
  FIRST_STAGE, MAINTENANCE_DONE_STAGES, REWORK_TYPE, stagesForOrder,
  currentStageEnteredAt, parseDeliveryDateNote,
  deliveryDateSetNote, deliveryDateChangeNote,
  type StageHistoryRow,
} from "@shared/manufacturing";

export const EXPERT_ROLE = "prosthetics_expert";

// أول مرحلة في مسار الأمر. البناء الأولي يبدأ من المراحل الست الجديدة،
// والصيانة تبقى على دورتها القصيرة كما هي (لم تُبسَّط في هذه المهمة).
function firstStageFor(serviceType: string, purpose?: string | null): string {
  return stagesForOrder(serviceType, purpose)[0];
}

// Display name of the expert an order is being assigned to — recorded inside
// the creation history note so the FIRST assignee stays on the permanent
// record even after later reassignments.
async function expertNameOf(tx: any, expertUserId: number): Promise<string> {
  const [u] = await tx.select({ displayName: systemUsers.displayName })
    .from(systemUsers).where(eq(systemUsers.id, expertUserId));
  return u?.displayName ?? `#${expertUserId}`;
}


// ---- experts roster (data-driven; never hardcoded) ---------------------------

export interface ExpertOption { id: number; displayName: string; }

// Active experts allowed to work in `branchId`: role = prosthetics_expert AND
// active AND (branchIds jsonb contains the branch OR primary branchId matches).
export async function getExpertsForBranch(branchId: number): Promise<ExpertOption[]> {
  const rows = await db
    .select({ id: systemUsers.id, displayName: systemUsers.displayName })
    .from(systemUsers)
    .where(
      and(
        // A pure expert OR anyone carrying the expert capability flag
        // (e.g. an accountant / branch-manager who also does mold work).
        or(eq(systemUsers.role, EXPERT_ROLE), eq(systemUsers.canWorkAsExpert, true)),
        eq(systemUsers.isActive, true),
        or(
          sql`${systemUsers.branchIds} @> ${JSON.stringify([branchId])}::jsonb`,
          eq(systemUsers.branchId, branchId),
        ),
      ),
    )
    .orderBy(asc(systemUsers.displayName));
  return rows;
}

// Server-side validation that an expert may be assigned to a branch. Returns
// the reason on failure so the route can 400/403 accurately.
export async function validateExpertForBranch(
  expertUserId: number,
  branchId: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return await validateExpertForBranchTx(db, expertUserId, branchId);
}

/**
 * **النسخةُ التي تقرأ داخل معاملة المُستدعي** — والقاعدةُ واحدة لا اثنتان.
 *
 * اعتمادُ مبلغٍ معلَّق (٠٦٧) قد يقع بعد يومٍ من إرساله: يُوقَف الخبيرُ أو
 * يُنقَل بين اللحظتين. فيُعاد التحقّق **تحت القفل قبل قيد الدينار** — ولو
 * قرأنا من خارج المعاملة لقرأنا لقطةً قد تشيخ قبل أن نكتب.
 *
 * والمنطقُ حرفٌ واحد لا يتكرّر: `validateExpertForBranch` تنادِيها بالاتصال
 * العامّ، وهذه بمعاملةٍ مفتوحة.
 */
export async function validateExpertForBranchTx(
  tx: any,
  expertUserId: number,
  branchId: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const [u] = await tx.select().from(systemUsers).where(eq(systemUsers.id, expertUserId));
  if (!u) return { ok: false, reason: "الخبير غير موجود" };
  if (!u.isActive) return { ok: false, reason: "حساب الخبير غير فعّال" };
  // Pure expert OR a user carrying the expert capability flag.
  if (u.role !== EXPERT_ROLE && !u.canWorkAsExpert) return { ok: false, reason: "المستخدم ليس خبير أطراف" };
  const branchIds = Array.isArray(u.branchIds) ? (u.branchIds as number[]) : [];
  const allowed = branchIds.includes(branchId) || u.branchId === branchId;
  if (!allowed) return { ok: false, reason: "الخبير غير مسموح له بالعمل في هذا الفرع" };
  return { ok: true };
}

// ---- expert-safe patient projection (financial fields NEVER selected) --------

export const expertPatientColumns = {
  id: patients.id,
  name: patients.name,
  age: patients.age,
  weight: patients.weight,
  height: patients.height,
  injuryDate: patients.injuryDate,
  injuryCause: patients.injuryCause,
  medicalCondition: patients.medicalCondition,
  amputationSite: patients.amputationSite,
  prostheticType: patients.prostheticType,
  supportType: patients.supportType,
  injurySide: patients.injurySide,
  patientClassification: patients.patientClassification,
} as const;

// ---- backdating helper (mirrors storage.createPatient behaviour) -------------

function resolveCreatedAt(registrationDate?: string | null): Date | undefined {
  if (!registrationDate) return undefined;
  const baghdadOffset = 3 * 60 * 60 * 1000;
  const nowBaghdad = new Date(Date.now() + baghdadOffset);
  const todayBaghdad = nowBaghdad.toISOString().split("T")[0];
  if (registrationDate === todayBaghdad) return undefined; // let defaultNow() handle it
  const [year, month, day] = registrationDate.split("-").map(Number);
  const backdated = new Date(Date.UTC(
    year, month - 1, day,
    nowBaghdad.getUTCHours(), nowBaghdad.getUTCMinutes(), nowBaghdad.getUTCSeconds(),
  ));
  return new Date(backdated.getTime() - baghdadOffset);
}

// ---- atomic patient + work-order creation ------------------------------------

export interface NewWorkOrderParams {
  serviceType: string;
  expertUserId: number;
  expectedDeliveryDate?: string | null;
  assignedBy: number | null;
}

// Creates the patient AND its first work order AND the first history row in a
// single transaction. If the work order fails, the patient insert rolls back.
export async function createPatientWithWorkOrder(
  insertPatient: InsertPatient,
  wo: NewWorkOrderParams,
): Promise<{ patient: Patient; workOrder: ProstheticWorkOrder }> {
  const { registrationDate, ...patientData } = insertPatient as InsertPatient & { registrationDate?: string | null };
  const values: any = { ...patientData };
  const createdAt = resolveCreatedAt(registrationDate);
  if (createdAt) values.createdAt = createdAt;
  // This is the SECOND path that inserts a patient row (storage.createPatient
  // is the first). No live caller reaches it today, but leaving it un-normalized
  // would mean the moment one does, it writes a patient whose phone_e164 is
  // silently absent — invisible to duplicate detection and to the review list.
  {
    const n = normalizePhone(values.phone, values.phoneCountry || DEFAULT_PHONE_COUNTRY);
    values.phone = n.raw || null;
    values.phoneE164 = n.e164;
    values.phoneCountry = n.country;
    values.phoneStatus = n.status;
  }

  return await db.transaction(async (tx) => {
    const [patient] = await tx.insert(patients).values(values).returning();
    const [workOrder] = await tx.insert(WO).values({
      patientId: patient.id,
      branchId: patient.branchId,
      expertUserId: wo.expertUserId,
      serviceType: wo.serviceType,
      status: "active",
      currentStage: FIRST_STAGE,
      expectedDeliveryDate: wo.expectedDeliveryDate ?? null,
      assignedBy: wo.assignedBy,
    }).returning();
    const [created] = await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: FIRST_STAGE,
      notes: `إنشاء أمر التصنيع وإسناده للخبير ${await expertNameOf(tx, wo.expertUserId)}`,
      performedBy: wo.assignedBy,
    }).returning({ id: WH.id });
    await recordOrderCreatedEvent(tx, {
      order: workOrder, stage: FIRST_STAGE, historyId: created.id,
    });
    return { patient, workOrder };
  });
}

// Work order for a patient who already exists (admin / branch manager).
export async function createWorkOrderForExisting(params: {
  patientId: number;
  branchId: number;
  serviceType: string;
  expertUserId: number;
  expectedDeliveryDate?: string | null;
  assignedBy: number | null;
  purpose?: string;
}): Promise<ProstheticWorkOrder> {
  const purpose = params.purpose === "maintenance" ? "maintenance" : "initial_build";
  return await db.transaction(async (tx) => {
    // In-tx per-service guard (backed by the partial unique index) — the
    // route's pre-check alone was a check-then-act race.
    // المزاحمة بحسب الغرض — لا بحسب الخدمة وحدها. (هذه النقطة تنشئ صيانةً
    // غير مسندة لجهازٍ بعينه، فتُقاس على مثيلتها غير المسندة.)
    if (await hasOpenOrderTx(tx, {
      patientId: params.patientId, serviceType: params.serviceType,
      purpose, deviceEpisodeId: null,
    })) throw new ActiveOrderError();

    // **ولا بناءٌ أوليّ يتيم.** فحص النقطة وحده check-then-act: بينه وبين
    // هنا قد تُفتح حلقة، فيُولَد أمرٌ بلا هوية وتبقى حلقةٌ مفتوحة بلا أمر.
    // القفل على صفّ الخيط — نقطة القفل نفسها التي يستعملها
    // `startDeviceEpisode` — يجعل الطريقين متسلسلين: إمّا يسبق الأمر
    // الحلقةَ فيمرّ، وإمّا تسبق الحلقةُ فتمنعه. ولا حالة نصفية.
    // والصيانة خارج هذا كلّه: جهازها قائم ولا تفتح حلقة.
    if (purpose === "initial_build" && isDeviceServiceType(params.serviceType)) {
      const { episode } = await lockCaseAndReadOpenEpisode(tx, {
        patientId: params.patientId, serviceType: params.serviceType,
      });
      if (episode) {
        throw new DeviceEpisodeError(
          "لدى المريض طلب جهاز جديد قيد الإجراء — أكمِله عبر «تخصيص وإسناد خبير» بعد المعاينة", 409,
        );
      }
    }

    const [workOrder] = await tx.insert(WO).values({
      patientId: params.patientId,
      branchId: params.branchId,
      expertUserId: params.expertUserId,
      serviceType: params.serviceType,
      purpose,
      status: "active",
      currentStage: firstStageFor(params.serviceType, purpose),
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      assignedBy: params.assignedBy,
    }).returning();
    const [created] = await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: firstStageFor(params.serviceType, purpose),
      notes: `${purpose === "maintenance" ? "إنشاء أمر صيانة لمريض موجود" : "إنشاء أمر تصنيع لمريض موجود"} — الخبير المسؤول: ${await expertNameOf(tx, params.expertUserId)}`,
      performedBy: params.assignedBy,
    }).returning({ id: WH.id });
    // الصيانة تُصفّى داخل الجسر بحسب `purpose` — لا شرط مكرَّر هنا.
    await recordOrderCreatedEvent(tx, {
      order: workOrder, stage: firstStageFor(params.serviceType, purpose),
      historyId: created.id,
    });
    return workOrder;
  });
}

// Maintenance from the "new visit" flow: create the maintenance work order AND
// the visit row in ONE transaction — so a returning patient's صيانة is either
// fully recorded (order + visit) or not at all. This removes the two-call race
// that could orphan an order (with no visit) and then wedge retries via the
// one-active-order 409 guard. The active-order check runs inside the same tx.
export async function createMaintenanceOrderWithVisit(params: {
  patientId: number;
  branchId: number;
  serviceType: string;
  expertUserId: number;
  // Optional now: the expert commits to the delivery date at the mold stage,
  // same as initial builds — reception no longer invents one.
  expectedDeliveryDate: string | null;
  assignedBy: number | null;
  visitNotes: string;
  visitDate: Date;
  // أجور الصيانة. The amount is the staff's call — zero or otherwise, no
  // warranty assumption. When > 0 it is booked the same way a
  // confirmed device price is: onto the device case's cost AND onto
  // patients.total_cost, so it reaches totalRevenue, the section split, and
  // the patient's remaining — and payments are then collected as usual.
  cost: number;
  /**
   * الجهاز المقصود بالصيانة. `null` = جهازٌ قديم غير مسجَّل — وهو قرارُ
   * موظّفٍ صريح لا افتراضٌ من الخادم. يُتحقَّق منه هنا داخل المعاملة مهما
   * فحصته النقطة، فالمعرّف لا يُوثَق به قادماً من العميل.
   */
  deviceEpisodeId?: number | null;
  /** إقرارٌ صريح بأن الجهاز المُصان قديمٌ غير مسجَّل. */
  legacyUnrecordedDevice?: boolean;
  /**
   * **منشأُ الجهاز المُصان** (ترحيل ٠٦٧) — يُحفَظ على الأمر نفسِه.
   *
   * ثلاثُ حقائق لا اثنتان: `registered` له حلقتُه · `center_unrecorded`
   * **صنعناه نحن** قبل النظام · `external` صُنع خارج المركز. ووسمُ الثاني
   * بالثالث يصف عملَنا بأنه عملُ غيرنا في كلّ تقريرِ ضمانٍ لاحق.
   *
   * و`undefined` تعني «لم يُسأل» — فيبقى العمودُ فارغاً صادقاً، ولا يُخمَّن.
   */
  deviceOrigin?: string | null;
  /**
   * **«بلا أجر» واقعةٌ تُحفَظ** (ترحيل ٠٦٧) — لا غيابُ صفّ معلَّق.
   *
   * `undefined` للصيانة كاملةِ الأجر بنقطتها القائمة: ليست من هذا المسار،
   * فيبقى العمودُ `NULL` صادقاً ولا يُكتب عليها معنىً لم يُسأل عنه.
   */
  noExamNoCharge?: boolean;
  /**
   * **الشروطُ التجاريةُ المُهيكَلة** (ترحيل ٠٦٩، المرحلة الثالثة) — للصيانة
   * المبسّطة وحدها. `undefined`/`null` لكلّ نداءٍ آخر (اعتمادُ الخصم
   * الموروث عبر `server/discounts/store.ts`، أو صيانةٌ لا تحمل هذا الشكل)،
   * فتبقى الأعمدةُ الثلاثة `NULL` — صدقٌ لا نقص.
   *
   * `finalPrice` **لا يُقرأ من هنا** — هو `params.cost` نفسُه، فلا مصدرَ
   * حقيقةٍ ثانٍ للرقم الذي يقيّده `postMaintenanceFee` أدناه.
   */
  commercialTerms?: { originalPrice: number; kind: "normal" | "discount" | "free" } | null;
  /**
   * **الجزءُ المُصان** (ترحيل ٠٦٠) — إلزاميٌّ للأطراف الصناعية.
   *
   * كانت الصيانة تُفتَح بلا أن يُقال أيُّ جزءٍ يُصان، فيصل الخبيرَ أمرٌ عليه
   * أن يسأل عنه — ويبقى السجلُّ عاجزاً عن الجواب: كم ركبةً صُلّحت هذا العام.
   * ويُطلَب **حتى للجهاز القديم غير المسجَّل**: الجهازُ مجهولٌ والجزءُ ليس كذلك.
   */
  maintenanceComponent?: string | null;
  /**
   * **معاملةُ المُستدعي** — يمرّرها اعتمادُ الخصم فيصير الحسمُ والتنفيذ
   * والختم معاملةً واحدة: تنجح معاً أو تسقط معاً. ومَن لا يمرّر شيئاً يفتح
   * معاملته كما كان — نفسُ نمط `assignManufacturing` منذ ٠٥٣.
   */
  tx?: any;
}): Promise<ProstheticWorkOrder & {
  /**
   * **معرّفُ الزيارة المُنشأة معه** (المرحلة الخامسة — «المبلغ المدفوع
   * الآن») — لا يكتبه هذا الملفّ لأيّ غرضٍ آخر؛ المستدعي (`createMaintenance
   * Operation`) يستعمله وحده ليربط دفعةَ القبض الفوريّة **بهذه الزيارة
   * بعينها**، نفسَ نمط `payments.visit_id` القائم منذ ترحيل ٠٣٨. حقلٌ
   * إضافيٌّ صرفٌ على الشكل القديم — لا مستدعٍ سابقاً (`server/discounts/
   * store.ts`) يتأثّر بحرف.
   */
  visitId: number;
}> {
  const body = async (tx: any) => {
    // **الهوية تُحسم هنا، لا في النقطة.** ما تقرؤه النقطة للعرض قد يشيخ:
    // جهازٌ يُسلَّم بين قراءتها وكتابتنا يصير محلّاً للصيانة، فقرارُ «لا
    // أجهزة مسجَّلة ⟶ صيانةٌ بلا هوية» المبنيّ على لقطةٍ بائتة يُنتج
    // الصفَّ الملتبس نفسه. والقفل على صفّ الخيط يجعل الترتيب صريحاً.
    //  **الجزءُ يُتحقَّق منه هنا** — داخل المعاملة كالهوية، ومهما فحصته
    //  النقطة: ما يصل من العميل لا يُوثَق به. والأطرافُ وحدها لها أجزاء.
    const parsedComponent = parseComponent(params.maintenanceComponent);
    if (!parsedComponent.ok) throw new DeviceEpisodeError(parsedComponent.error!, 400);
    if (params.serviceType === "prosthetic" && !parsedComponent.value) {
      throw new DeviceEpisodeError("حدّد الجزء المراد صيانته", 400);
    }
    const component = params.serviceType === "prosthetic" ? parsedComponent.value : null;

    const targetEpisodeId = isDeviceServiceType(params.serviceType)
      ? await resolveDeviceTargetTx(tx, {
          patientId: params.patientId,
          serviceType: params.serviceType,
          requestedEpisodeId: params.deviceEpisodeId,
          explicitLegacy: params.legacyUnrecordedDevice === true,
          //  الصيانة لجهازٍ **مسلَّم** وحده: ما لم يُسلَّم بعد ليس جهازاً يُصان.
          eligibleStatuses: ["delivered"],
          chooseMessage: "حدّد الجهاز المراد صيانته — أو اختر «جهاز قديم غير مسجَّل»",
        })
      : null;

    // صيانةُ جهازٍ مسجَّل تُقاس على **ذلك الجهاز**، وغير المسجَّلة على
    // (المريض، الخدمة). وبناءُ جهازٍ جديد لا يمنع صيانة القديم إطلاقاً.
    if (await hasOpenOrderTx(tx, {
      patientId: params.patientId, serviceType: params.serviceType,
      purpose: "maintenance", deviceEpisodeId: targetEpisodeId,
    })) throw new ActiveOrderError();

    const [workOrder] = await tx.insert(WO).values({
      patientId: params.patientId,
      branchId: params.branchId,
      expertUserId: params.expertUserId,
      serviceType: params.serviceType,
      purpose: "maintenance",
      status: "active",
      currentStage: firstStageFor(params.serviceType, "maintenance"),
      expectedDeliveryDate: params.expectedDeliveryDate ?? null,
      assignedBy: params.assignedBy,
      deviceEpisodeId: targetEpisodeId,
      maintenanceComponent: component,
      //  **الواقعةُ على السجلّ التشغيليّ** — فتبقى ولو كانت الخدمةُ بلا أجر.
      deviceOrigin: params.deviceOrigin ?? null,
      noExamNoCharge: params.noExamNoCharge ?? null,
      //  **الشروطُ التجاريةُ المُهيكَلة** (ترحيل ٠٦٩) — `finalPrice` هو
      //  `params.cost` نفسُه، فلا رقمَ ثانياً يُخترَع أو ينحرف عنه.
      maintenanceOriginalPrice: params.commercialTerms?.originalPrice ?? null,
      maintenanceFinalPrice: params.commercialTerms ? params.cost : null,
      maintenancePriceKind: params.commercialTerms?.kind ?? null,
    }).returning();
    await tx.insert(WH).values({
      workOrderId: workOrder.id,
      actionType: "created",
      fromStage: null,
      toStage: firstStageFor(params.serviceType, "maintenance"),
      notes: `إنشاء أمر صيانة${component ? ` — ${componentLabel(component)}` : ""}`
        + ` لمريض موجود — الخبير المسؤول: ${await expertNameOf(tx, params.expertUserId)}`,
      performedBy: params.assignedBy,
    });
    // Attribute the visit to the matching case so it shows in the patient's
    // per-case tabs (case-filtered views hide caseId-null rows by default).
    //  والنوعُ صريحٌ لأن `tx` صارت مفتوحةً لتقبل معاملةَ المُستدعي.
    const caseRows: { id: number; caseType: string }[] = await tx
      .select({ id: patientCases.id, caseType: patientCases.caseType })
      .from(patientCases).where(eq(patientCases.patientId, params.patientId));
    const caseId = caseRows.find((c) => c.caseType === params.serviceType)?.id
      ?? caseRows.find((c) => c.caseType === "physiotherapy")?.id
      ?? caseRows[0]?.id ?? null;
    const [visit] = await tx.insert(visits).values({
      patientId: params.patientId,
      branchId: params.branchId,
      visitDate: params.visitDate,
      // Deliberately NOT the "تكلفة:" marker format — syncPatientCases parses
      // that marker to reallocate base costs, and maintenance fees are booked
      // directly below, not via markers.
      //  **والجزءُ في نصّ الزيارة أيضاً** — يقرؤه مَن يفتح سجلّ الزيارات
      //  بلا أن يفتح الأمر. والعمودُ المنظَّم يبقى هو المصدر لا هذا النصّ.
      //
      //  **وملاحظةُ الموظّف تبقى كما كتبها**: الجزءُ يُضاف إليها ولا يحلّ
      //  محلّها — «صيانة الطرف القديم» معلومةٌ لا يملكها النظام.
      notes: [component ? `صيانة ${componentLabel(component)}` : null,
        params.visitNotes,
        params.cost > 0 ? `أجور الصيانة: ${params.cost.toLocaleString("en-US")} د.ع` : ""]
        .filter(Boolean).join(" — "),
      treatmentType: null,
      caseId,
      deviceEpisodeId: targetEpisodeId,
      createdBy: params.assignedBy,
    }).returning({ id: visits.id });

    if (params.cost > 0) {
      await postMaintenanceFee(tx, {
        patientId: params.patientId, branchId: params.branchId,
        serviceType: params.serviceType, cost: params.cost,
        deviceEpisodeId: targetEpisodeId,
      });
    }
    return { ...workOrder, visitId: visit.id };
  };
  return params.tx ? await body(params.tx) : await db.transaction(body);
}

/**
 * **قيدُ أجور الصيانة — الكتابةُ الواحدة** (استُخرجت في المرحلة الثالثة).
 *
 * كلفةُ حالة الجهاز (`manual` فتبقى الأتمتةُ بعيدة) + `patients.total_cost`
 * الذي يجمعه `totalRevenue` + سطرٌ واحد في دفتر الكلف. وهي نفسُ الكتابة
 * المزدوجة التي يؤدّيها تأكيدُ «تخصيص».
 *
 * ══ ولماذا صارت دالّةً مستقلّة ═══════════════════════════════════════════
 * مسارُ «بلا معاينة» (المرحلة الثالثة) يفصل **العملَ التشغيليّ** عن **دخول
 * المال**: الصيانةُ تُفتَح ويعمل الخبير، ويبقى المبلغُ معلّقاً حتى يعتمده
 * طبيب. فلو نُسخت هذه الأسطرُ هناك لصار للصيانة حسابان ينحرف أحدُهما يوماً.
 *
 * **فالكتابةُ واحدة ولها نداءان**: الصيانةُ كاملةُ الأجر تناديها في معاملتها،
 * والاعتمادُ يناديها في معاملته — بالمبلغ المعتمَد وبهويّة الجهاز نفسِها.
 */
export async function postMaintenanceFee(tx: any, params: {
  patientId: number;
  branchId: number;
  serviceType: string;
  cost: number;
  deviceEpisodeId: number | null;
}): Promise<void> {
  if (!(params.cost > 0)) return;
  const caseRows: { id: number; caseType: string }[] = await tx
    .select({ id: patientCases.id, caseType: patientCases.caseType })
    .from(patientCases).where(eq(patientCases.patientId, params.patientId));
  const deviceCase = caseRows.find((c) => c.caseType === params.serviceType);
  if (deviceCase) {
    await tx.update(patientCases)
      .set({ cost: sql`${patientCases.cost} + ${params.cost}`, costSource: "manual", updatedAt: new Date() })
      .where(eq(patientCases.id, deviceCase.id));
  }
  await tx.update(patients)
    .set({ totalCost: sql`COALESCE(${patients.totalCost}, 0) + ${params.cost}` })
    .where(eq(patients.id, params.patientId));
  await tx.insert(costEntries).values({
    patientId: params.patientId, branchId: params.branchId,
    amount: params.cost, source: "maintenance", notes: "أجور صيانة",
    deviceEpisodeId: params.deviceEpisodeId,
    //  قسمُ الأجور هو حالةُ الجهاز المُصان بعينه (ترحيل ٠٥٦) — وهي نفسها
    //  التي رُفعت كلفتُها أعلاه، فلا مصدرَ حقيقةٍ ثانٍ.
    caseId: deviceCase?.id ?? null,
  });
}

// ---- order listing + enrichment ----------------------------------------------

export interface OrderFilters {
  branchId?: number;        // restrict to one branch
  branchIds?: number[];     // manager scope (allowed branches)
  serviceType?: string;
  stage?: string;
  status?: string;
  completed?: boolean;      // true = completed only, false = not completed
  expertUserId?: number;    // filter by expert (managers/admin), or forced for experts
  search?: string;          // patient name contains
}

export interface OrderCard {
  id: number;
  patientId: number;
  patientName: string;
  branchId: number;
  branchName: string | null;
  serviceType: string;
  itemType: string | null;   // prostheticType or supportType
  currentStage: string;
  status: string;
  expertUserId: number;
  expertName: string | null;
  assignedAt: string | null; // created_at
  startedAt: string | null;
  expectedDeliveryDate: string | null;
  completedAt: string | null;
  finalResult: string | null;
  reworkCount: number;
  daysInStage: number;
  isOverdue: boolean;
  /**
   * سببُ التوقّف الحاليّ — داخليٌّ بحت (لا يصل المريض)، فارغٌ خارج حالات
   * التوقّف الأربع. أُضيف إلى العرض المشترك (تحكّمُ تباين تنبيهات التسليم،
   * 2026-08-31) كي تفرّق «التنبيهات» بين متأخّرٍ حقّاً ومتأخّرٍ بسببٍ مسجَّل
   * — لا استعلامَ ثانياً موازياً لـ`getOrderDetail`.
   */
  holdReasonCode: string | null;
  holdNote: string | null;
}

function daysSince(d: Date | string | null | undefined): number {
  if (!d) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000));
}

// Builds the WHERE conditions common to expert / manager / admin listings.
function orderConditions(f: OrderFilters) {
  //  **والمحذوفُ يخرج من لوحة التصنيع** (ترحيل ٠٦٨): أمرُه باقٍ بسجلّه
  //  ويعود بعينه عند الاستعادة، ولا يُعرَض على خبيرٍ ليعمل عليه الآن.
  //  و`listOrders` تنضمّ إلى `patients` بـ`innerJoin` أصلاً، فالشرطُ يقع
  //  على الصفّ المنضَمّ نفسِه.
  const c: any[] = [activePatientDrizzle()];
  if (f.expertUserId !== undefined) c.push(eq(WO.expertUserId, f.expertUserId));
  if (f.branchId !== undefined) c.push(eq(WO.branchId, f.branchId));
  if (f.branchIds && f.branchIds.length > 0) c.push(inArray(WO.branchId, f.branchIds));
  if (f.serviceType) c.push(eq(WO.serviceType, f.serviceType));
  if (f.stage) c.push(eq(WO.currentStage, f.stage));
  if (f.status) c.push(eq(WO.status, f.status));
  if (f.completed === true) c.push(eq(WO.status, "completed"));
  if (f.completed === false) c.push(sql`${WO.status} <> 'completed'`);
  // ══ البحث — نفس عقد سجلّ المرضى ═══════════════════════════════════════
  // كان هنا تطبيعٌ ثالثٌ مستقلّ: `translate(name,'أإآةى','اااهي') ILIKE`.
  // فالموظّف يكتب «احمذ» بخطأ حرفٍ فلا يجد شيئاً هنا ويجده في السجلّ،
  // ويكتب رمز المريض فلا يجد، ويكتب «٠٧٧٠» فلا يجد. وصار المصدر واحداً:
  // نفس الشرط ونفس السلّم ونفس الفهارس (ترحيل ٠٥٤).
  if (f.search && f.search.trim()) {
    c.push(buildPatientSearch(f.search, { trigram: trigramReady() }).where);
  }
  return c;
}

export async function listOrders(f: OrderFilters): Promise<OrderCard[]> {
  const conds = orderConditions(f);
  const rows = await db
    .select({
      id: WO.id, patientId: WO.patientId, branchId: WO.branchId,
      serviceType: WO.serviceType, purpose: WO.purpose, currentStage: WO.currentStage, status: WO.status,
      expertUserId: WO.expertUserId, assignedAt: WO.createdAt, startedAt: WO.startedAt,
      expectedDeliveryDate: WO.expectedDeliveryDate, completedAt: WO.completedAt,
      finalResult: WO.finalResult,
      holdReasonCode: WO.holdReasonCode, holdNote: WO.holdNote,
      patientName: patients.name, prostheticType: patients.prostheticType, supportType: patients.supportType,
      branchName: branches.name, expertName: systemUsers.displayName,
    })
    .from(WO)
    .innerJoin(patients, eq(patients.id, WO.patientId))
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(conds.length ? and(...conds) : sql`TRUE`)
    .orderBy(desc(WO.createdAt));

  return enrichOrders(rows);
}

async function enrichOrders(rows: any[]): Promise<OrderCard[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  // عدد مرات إعادة العمل لكل أمر — استعلام مجمَّع واحد، يشمل الصفوف
  // القديمة (recast/resocket) فلا يضيع تاريخها.
  const rework = await db
    .select({ workOrderId: RW.workOrderId, reworkType: RW.reworkType, n: sql<number>`COUNT(*)::int` })
    .from(RW)
    .where(inArray(RW.workOrderId, ids))
    .groupBy(RW.workOrderId, RW.reworkType);
  const reworkByOrder = new Map<number, number>();
  for (const r of rework) {
    reworkByOrder.set(r.workOrderId, (reworkByOrder.get(r.workOrderId) ?? 0) + Number(r.n));
  }

  // متى دخل كل أمر مرحلته الحالية. السجلّ يحمل الأكواد القديمة كما هي
  // (الترحيل 045 لم يمسّه عمداً)، فالمقارنة الحرفية تفشل على كل أمر قديم —
  // ولذلك يمرّ الحساب كلّه عبر `currentStageEnteredAt` المطبِّعة.
  // ويلزمها `fromStage` لتميّز الدخولَ من الحركة داخل المرحلة نفسها.
  const hist = await db
    .select({
      workOrderId: WH.workOrderId, fromStage: WH.fromStage, toStage: WH.toStage,
      createdAt: WH.createdAt,
    })
    .from(WH)
    .where(inArray(WH.workOrderId, ids));
  const histByOrder = new Map<number, StageHistoryRow[]>();
  for (const h of hist) {
    const list = histByOrder.get(h.workOrderId) ?? [];
    list.push({ fromStage: h.fromStage, toStage: h.toStage, at: h.createdAt });
    histByOrder.set(h.workOrderId, list);
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  return rows.map((r) => {
    const stageEntered =
      currentStageEnteredAt(
        { currentStage: r.currentStage, serviceType: r.serviceType, purpose: r.purpose },
        histByOrder.get(r.id) ?? [],
      ) ?? r.startedAt ?? r.assignedAt;
    const notFinished = r.status !== "completed" && r.status !== "cancelled";
    const isOverdue = !!r.expectedDeliveryDate && notFinished
      && String(r.expectedDeliveryDate) < today;
    return {
      id: r.id,
      patientId: r.patientId,
      patientName: r.patientName,
      branchId: r.branchId,
      branchName: r.branchName ?? null,
      serviceType: r.serviceType,
      purpose: r.purpose ?? "initial_build",
      itemType: r.serviceType === "medical_support" ? (r.supportType ?? null) : (r.prostheticType ?? null),
      currentStage: r.currentStage,
      status: r.status,
      expertUserId: r.expertUserId,
      expertName: r.expertName ?? null,
      assignedAt: r.assignedAt ? new Date(r.assignedAt).toISOString() : null,
      startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
      expectedDeliveryDate: r.expectedDeliveryDate ? String(r.expectedDeliveryDate) : null,
      completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
      finalResult: r.finalResult ?? null,
      reworkCount: reworkByOrder.get(r.id) ?? 0,
      daysInStage: daysSince(stageEntered),
      isOverdue,
      holdReasonCode: r.holdReasonCode ?? null,
      holdNote: r.holdNote ?? null,
    };
  });
}

// ---- single order (raw, for authorization checks) ----------------------------

export async function getRawOrder(id: number): Promise<ProstheticWorkOrder | undefined> {
  const [row] = await db.select().from(WO).where(eq(WO.id, id));
  return row;
}

// Full detail for the detail page — expert-safe patient projection + timeline.
export async function getOrderDetail(id: number) {
  const [order] = await db
    .select({
      id: WO.id, patientId: WO.patientId, branchId: WO.branchId, serviceType: WO.serviceType,
      purpose: WO.purpose,
      status: WO.status, currentStage: WO.currentStage, expectedDeliveryDate: WO.expectedDeliveryDate,
      // سبب التوقّف — تقرؤه بطاقة «متوقّف» في صفحة الأمر. داخلي: هذه النقطة
      // للخبير والإدارة، ولا يمرّ منها شيء إلى المريض.
      holdReasonCode: WO.holdReasonCode, holdNote: WO.holdNote,
      startedAt: WO.startedAt, completedAt: WO.completedAt, finalResult: WO.finalResult,
      finalNotes: WO.finalNotes, expertUserId: WO.expertUserId, assignedBy: WO.assignedBy,
      createdAt: WO.createdAt,
      branchName: branches.name, expertName: systemUsers.displayName,
    })
    .from(WO)
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(eq(WO.id, id));
  if (!order) return null;

  //  **وأمرُ ملفٍّ محذوفٍ لا يُفتَح** (ترحيل ٠٦٨): بلا مريضٍ يعود `null`
  //  فتُردّ الصفحةُ ٤٠٤ — وهو الصدق، الأمرُ باقٍ لكن ملفَّه خرج من النظام.
  const [patient] = await db.select(expertPatientColumns).from(patients)
    .where(and(eq(patients.id, order.patientId), activePatientDrizzle()));
  if (!patient) return null;
  const timeline = await db.select({
    id: WH.id, actionType: WH.actionType, fromStage: WH.fromStage, toStage: WH.toStage,
    notes: WH.notes, performedBy: WH.performedBy, createdAt: WH.createdAt,
    performedByName: systemUsers.displayName,
  })
    .from(WH)
    .leftJoin(systemUsers, eq(systemUsers.id, WH.performedBy))
    .where(eq(WH.workOrderId, id))
    .orderBy(asc(WH.createdAt));
  const rework = await db.select({
    id: RW.id, reworkType: RW.reworkType, reasonCode: RW.reasonCode, reasonDetails: RW.reasonDetails,
    stageWhenDetected: RW.stageWhenDetected, createdBy: RW.createdBy, createdAt: RW.createdAt,
    createdByName: systemUsers.displayName,
  })
    .from(RW)
    .leftJoin(systemUsers, eq(systemUsers.id, RW.createdBy))
    .where(eq(RW.workOrderId, id))
    .orderBy(desc(RW.createdAt));

  // عدّاد واحد: نوع إعادة العمل صار واحداً، والصفوف القديمة
  // (recast/resocket) تُحتسب معه فلا يضيع تاريخها.
  const reworkCount = rework.length;

  // سجلّ مواعيد التسليم — مشتقّ من `prosthetic_work_history` لا من جدول
  // جديد. الموعد الحالي وحده لا يكفي: مَن يقرأ الأمر يحتاج أن يرى كم مرّة
  // تحرّك الوعد ولماذا، وإلا صار التأخير بلا تفسير.
  const dateChanges = timeline
    .filter((h) => h.actionType === "date_change")
    .map((h) => ({
      id: h.id,
      ...parseDeliveryDateNote(h.notes),
      byName: h.performedByName ?? null,
      at: h.createdAt ? new Date(h.createdAt).toISOString() : null,
    }));

  return {
    order: {
      ...order,
      expectedDeliveryDate: order.expectedDeliveryDate ? String(order.expectedDeliveryDate) : null,
      startedAt: order.startedAt ? new Date(order.startedAt).toISOString() : null,
      completedAt: order.completedAt ? new Date(order.completedAt).toISOString() : null,
      createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
      reworkCount,
    },
    patient: patient ? { ...patient, branchName: order.branchName ?? null } : null,
    timeline,
    rework,
    dateChanges,
  };
}

// Whether the order has left its FIRST stage. Used to gate who may reassign
// (reception only before work has started). Purpose-aware: a maintenance
// order's first stage is still `new_assignment`, not the build pipeline's.
export function hasStarted(order: ProstheticWorkOrder): boolean {
  return order.currentStage !== firstStageFor(order.serviceType, order.purpose) || !!order.startedAt;
}

// ---- mutations (all append a history row) ------------------------------------

/**
 * ينقل الأمر إلى مرحلة. **لا يلمس الحالة إطلاقاً** — عدا الإنهاء التلقائي
 * عند التسليم أو إنجاز الصيانة، وهو ليس «توقّفاً» بل نهاية المسار.
 *
 * التحقّق من أن الانتقال مشروع (التالية فقط، أو رجوع بإعادة عمل، أو مخرج
 * إداري) يقع في طبقة النقاط قبل الوصول إلى هنا.
 */
export async function updateStage(params: {
  order: ProstheticWorkOrder;
  toStage: string;
  /** نوع السطر في السجلّ: تقدّم عادي أم رجوع بإعادة عمل. */
  actionType?: "stage_change" | "rework";
  notes?: string | null;
  // The promised delivery date, captured when the expert reaches the mold stage.
  // Applied ONLY when the order has no delivery date yet (first commitment) —
  // it is INDEPENDENT of the stage timeline and never overwrites an existing
  // date here, so the promised date stays fixed for accuracy tracking.
  deliveryDate?: string | null;
  /** الحالة الجديدة — تُمرَّر فقط من مسارَي الاستئناف وإعادة العمل. */
  newStatus?: string | null;
  /** يُفرَغ سبب التوقّف حين يعود الأمر إلى العمل. */
  clearHold?: boolean;
  finalResult?: string | null;
  finalNotes?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, toStage } = params;
  const delivered = toStage === "delivered";
  // "تم إنجاز صيانة القالب/الطرف/المسند" is the terminal step of a maintenance
  // episode: reaching it completes the order in the same action, so status and
  // stage can never contradict each other again.
  const maintenanceDone = MAINTENANCE_DONE_STAGES.has(toStage);
  return await db.transaction(async (tx) => {
    const live = await lockOrder(tx, order.id);

    // **الأمر المنتهي لا يتحرّك.** ولا تُغني عنه مقارنةُ الانحراف تحتَه:
    // لقطةٌ تقول `completed` تساوي الحالَ `completed` فتمرّ المقارنة، فيصير
    // المخرج الإداري باباً يُرجع أمراً سُلِّم إلى «التصنيع» وحالته مكتمل.
    // وإعادة فتح أمرٍ منتهٍ — إن لزمت يوماً — عمليةٌ صريحة مدقَّقة، لا
    // استعمالٌ جانبي لمخرج التصحيح.
    assertNotTerminal(live);

    // القفل يسلسل ولا يُبطل: الطلب الثاني ينتظر ثم ينفّذ **بمعطياته هو**.
    // فطلبان بُنيا على `measurements` ينتجان تقدّمين وسطرين، والثاني يصف
    // انتقالاً من مرحلة غادرها الأمر. وطلبٌ بُني على `active` يعيد أمراً
    // أُلغي أو أُوقِف بعده إلى العمل بصمت. المقارنة هنا تمنع الاثنين.
    if (live.currentStage !== order.currentStage || live.status !== order.status) {
      throw new WorkOrderConflictError(live);
    }
    const fromStage = live.currentStage;

    // `COALESCE` كانت تمنع الكتابة المزدوجة لكنها لا تقول **مَن** كتب:
    // كاتبان اختارا التاريخ نفسه يجد كلاهما قيمته في الصفّ بعد التحديث،
    // فيسجّل كلاهما «أنا مَن التزم». القفل يحسمها بحقيقة واحدة — مَن وجد
    // العمود فارغاً هو صاحب الالتزام، وحده.
    const commitsDate = !!params.deliveryDate && live.expectedDeliveryDate === null;

    const patch: any = { currentStage: toStage, updatedAt: new Date() };
    if (!live.startedAt && fromStage === firstStageFor(order.serviceType, order.purpose)) patch.startedAt = new Date();
    if (commitsDate) patch.expectedDeliveryDate = params.deliveryDate;
    if (params.newStatus) patch.status = params.newStatus;
    if (params.clearHold) { patch.holdReasonCode = null; patch.holdNote = null; }
    // ختمٌ واحد للحظة واحدة: تسليم الحلقة هو تسليم أمرها بعينه، فلو ولّد
    // كلٌّ وقته لاختلف الرقمان بأجزاء الثانية وصار لكل جدولٍ روايةٌ.
    const completedAt = new Date();
    if (delivered) {
      patch.status = "completed";
      patch.completedAt = completedAt;
      patch.holdReasonCode = null;
      patch.holdNote = null;
      patch.finalResult = params.finalResult ?? null;
      if (params.finalNotes) patch.finalNotes = params.finalNotes;
    }
    if (maintenanceDone) {
      patch.status = "completed";
      patch.completedAt = completedAt;
      if (params.finalNotes) patch.finalNotes = params.finalNotes;
    }
    const [updated] = await tx.update(WO).set(patch).where(eq(WO.id, order.id)).returning();

    // حلقةُ الجهاز تتبع أمرها إلى نهايته — في المعاملة نفسها. والحارسان
    // (رابطٌ موجود، وغرضٌ بناءٌ أولي) داخل الدالّة، فالصيانة لا تُنهي
    // حلقةً أبداً: جهازٌ يُصان جهازٌ قائم.
    if (delivered) {
      await syncEpisodeToOrderTerminalState(tx, updated, {
        status: "delivered", at: completedAt,
      });
    }

    const [moved] = await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: delivered ? "delivered" : (params.actionType ?? "stage_change"),
      fromStage, toStage,
      notes: params.notes ?? null,
      performedBy: params.performedBy,
    }).returning({ id: WH.id });

    // حدث المريض — في المعاملة نفسها، فالأمر وسجلّه وحدثه ينجحون معاً أو
    // يفشلون معاً. ويشمل هذا المسارَ الإداري: تصحيحُ الإدارة يحرّك المرحلة
    // فعلاً، فالمريض يرى موضعه الجديد (بلا سبب التصحيح).
    // وشرط التغيّر مقصود: «تصحيح» إلى المرحلة نفسها ليس انتقالاً.
    if (toStage !== fromStage) {
      await recordStageEvent(tx, {
        order: updated, stage: toStage, historyId: moved.id,
      });
    }
    // الموعد الأول يُلتزَم به عادةً **هنا** — في نافذة بلوغ القالب، لا في
    // نافذة الموعد المستقلّة. فلولا هذا السطر لَما ظهر أشيعُ التزامٍ بموعد
    // في سجلّ المواعيد إطلاقاً، وبدا الأمر كأنّ موعده وُلد من العدم.
    // والخاسر في السباق يمضي في نقل المرحلة ولا يدّعي التزاماً ليس له.
    if (commitsDate) {
      const [dateRow] = await tx.insert(WH).values({
        workOrderId: order.id,
        actionType: "date_change",
        fromStage: toStage, toStage,
        notes: deliveryDateSetNote(params.deliveryDate!),
        performedBy: params.performedBy,
      }).returning({ id: WH.id });
      // ويستحقّ خبرَه كذلك — مرّةً واحدة. والسباق محسومٌ قبله: `commitsDate`
      // لا تصدق إلا لمن وجد العمود فارغاً **تحت القفل**، فالخاسر لا يصل
      // هنا أصلاً ولا يُصدر حدثاً ثانياً لموعدٍ لم يلتزم به.
      await recordDeliveryDateEvent(tx, {
        order: updated,
        expectedDeliveryDate: params.deliveryDate!,
        historyId: dateRow.id,
      });
    }
    return updated;
  });
}

/**
 * كاتبٌ آخر حرّك الموعد بيننا وبين قراءتنا. لا يُكتب فوقه بصمت — ولا
 * يُسجَّل سطرٌ يدّعي أنّنا انتقلنا من موعدٍ لم يعد قائماً.
 */
export class DeliveryDateConflictError extends Error {
  readonly currentDate: string | null;
  constructor(currentDate: string | null) {
    super("delivery date changed by another writer");
    this.name = "DeliveryDateConflictError";
    this.currentDate = currentDate;
  }
}

/**
 * تغيّر الأمر بين قراءة الطلب وتنفيذه.
 *
 * القفل يسلسل الطلبات زمنياً لكنه **لا يُبطل** طلباً بُني على حال قديمة:
 * الثاني ينتظر ثم ينفّذ بمعطياته هو. فبلا هذه المقارنة يمرّ تقدّمٌ مكرّر،
 * ويعود أمرٌ ألغاه غيرُنا إلى `active` بصمت، ويُكتب سطرٌ يصف حالاً زالت.
 */
export class WorkOrderConflictError extends Error {
  readonly currentStage: string;
  readonly status: string;
  constructor(state: { currentStage: string; status: string }) {
    super("work order changed by another writer");
    this.name = "WorkOrderConflictError";
    this.currentStage = state.currentStage;
    this.status = state.status;
  }
}

/** قيمة عمود التاريخ كنصّ `YYYY-MM-DD` أو `null`. */
function dateStr(v: unknown): string | null {
  return v ? String(v).slice(0, 10) : null;
}

interface LockedOrder {
  currentStage: string;
  status: string;
  expectedDeliveryDate: string | null;
  expertUserId: number;
  startedAt: Date | null;
}

/**
 * يقفل صفّ الأمر داخل المعاملة ويُرجع حاله **الحقيقي** لحظتَها.
 *
 * القفل هو الفرق كلّه: من هنا حتى نهاية المعاملة لا يستطيع كاتبٌ آخر أن
 * يغيّر الصفّ — فما نقرؤه هو ما سنكتب فوقه، لا صورةً قديمة عنه. وكل قرار
 * أو سطرِ سجلٍّ يخصّ هذه الحقول يُبنى على المُرجَع من هنا لا على اللقطة.
 */
async function lockOrder(tx: any, orderId: number): Promise<LockedOrder> {
  const [locked] = await tx
    .select({
      currentStage: WO.currentStage, status: WO.status,
      expectedDeliveryDate: WO.expectedDeliveryDate,
      expertUserId: WO.expertUserId, startedAt: WO.startedAt,
    })
    .from(WO)
    .where(eq(WO.id, orderId))
    .for("update");
  return {
    currentStage: locked?.currentStage ?? "",
    status: locked?.status ?? "",
    expectedDeliveryDate: dateStr(locked?.expectedDeliveryDate),
    expertUserId: locked?.expertUserId ?? 0,
    startedAt: locked?.startedAt ?? null,
  };
}

/** الأمر المنتهي لا يُكتب عليه شيء — والحكم من الصفّ المقفول لا من اللقطة. */
function assertNotTerminal(live: LockedOrder) {
  if (live.status === "completed" || live.status === "cancelled") {
    throw new WorkOrderConflictError(live);
  }
}

export async function updateDeliveryDate(params: {
  order: ProstheticWorkOrder;
  expectedDeliveryDate: string;
  performedBy: number | null;
  // Mandatory (enforced by the route) whenever an EXISTING date is being
  // changed — the promised date is what delivery accuracy is measured
  // against, so moving it must carry its justification into the record.
  reason?: string | null;
  /**
   * الموعد الذي **بُني عليه** الطلب: ما كان معروضاً أمام المستخدم. غيابه
   * يعني «قِس على اللقطة التي قرأها الخادم» — والأدقّ أن ترسله الواجهة،
   * فتبويبةٌ قديمة تُردّ بتعارض بدل أن تكتب فوق قرار غيرها.
   */
  ifCurrentDate?: string | null;
}): Promise<ProstheticWorkOrder> {
  const { order, expectedDeliveryDate } = params;
  const base = params.ifCurrentDate !== undefined
    ? dateStr(params.ifCurrentDate)
    : dateStr(order.expectedDeliveryDate);

  return await db.transaction(async (tx) => {
    const live = await lockOrder(tx, order.id);
    // الموعد هو الوعد الذي تُقاس عليه دقّة التسليم. تحريكه بعد أن انتهى
    // الأمر يعني إعادة كتابة الوعد **بعد معرفة النتيجة** — فيصير كل تسليم
    // في موعده، ويفقد المؤشّر معناه.
    assertNotTerminal(live);
    const actual = live.expectedDeliveryDate;
    // سبقَنا أحد. نخرج بلا كتابة وبلا سطر — والسطر هنا هو بيت القصيد:
    // لو كتبناه لَادّعى انتقالاً من موعدٍ لم يكن قائماً حين كتبنا.
    if (actual !== base) throw new DeliveryDateConflictError(actual);

    // أول تحديد ليس «تغييراً» فلا يُكتب بصيغته: لا موعد سابق له ولا سبب.
    // والتغيير يحمل الموعدين والسبب داخل نصّه، فالسطر يُقرأ وحده بلا
    // مقارنة بسطرٍ آخر — وهذا ما يجعل الأثر دائماً لا مشتقّاً.
    // و`actual` — لا اللقطة — هو ما نكتب فوقه، فالسطر يصف ما جرى فعلاً.
    const notes = actual
      ? deliveryDateChangeNote(actual, expectedDeliveryDate, params.reason ?? "")
      : deliveryDateSetNote(expectedDeliveryDate);

    const [updated] = await tx.update(WO)
      .set({ expectedDeliveryDate, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    const [dateRow] = await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "date_change",
      // الموعد لا يحرّك المرحلة — والطرفان متساويان توثيقاً لذلك.
      // والمرحلة من الصفّ المقفول: لو تقدّم الأمر بيننا وبين قراءتنا لَسمّى
      // السطرُ مرحلةً غادرها الأمر.
      fromStage: live.currentStage, toStage: live.currentStage,
      notes,
      performedBy: params.performedBy,
    }).returning({ id: WH.id });
    // الحدث داخل المعاملة نفسها: الموعد وسطرُه وخبرُ المريض معاً أو لا شيء.
    // ويشمل **أول تحديد** لا التغيير وحده — فمَن ينتظر جهازه يعنيه أن يعرف
    // موعده أوّلَ ما يُحدَّد، لا حين يتغيّر فقط.
    await recordDeliveryDateEvent(tx, {
      order: updated,
      expectedDeliveryDate,
      historyId: dateRow.id,
    });
    return updated;
  });
}

/**
 * إيقاف الأمر — **بلا مساس بالمرحلة إطلاقاً**.
 *
 * هذا هو جوهر الفصل: المريض متورّم فلا يمكن أخذ القالب ⇒ المرحلة تبقى
 * `mold` والحالة تصير `medical_hold`. المواد لم تصل ⇒ المرحلة تبقى
 * `manufacturing` والحالة `waiting_materials`. أين وصل العمل حقيقة ثابتة،
 * والتوقّف ظرف عارض فوقها.
 *
 * السبب داخلي بحت ولا يصل المريض بأي حال.
 */
export async function holdOrder(params: {
  order: ProstheticWorkOrder;
  status: string;          // إحدى حالات التوقّف الأربع
  reasonCode: string;
  note?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, status, reasonCode } = params;
  return await db.transaction(async (tx) => {
    // التوقّف لا يشترط مرحلةً بعينها، فلا يُردّ لتقدّم الأمر — لكنه يُسجَّل
    // على المرحلة **الفعلية** لا على لقطةٍ غادرها. والمنتهي لا يُوقَف.
    const live = await lockOrder(tx, order.id);
    assertNotTerminal(live);
    const [updated] = await tx.update(WO)
      .set({ status, holdReasonCode: reasonCode, holdNote: params.note ?? null, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "status_change",
      // نفس المرحلة على الطرفين — توثيق صريح في السجلّ أن التوقّف لم يحرّكها.
      fromStage: live.currentStage, toStage: live.currentStage,
      notes: `توقّف: ${status} — السبب: ${reasonCode}${params.note ? ` — ${params.note}` : ""}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

/** إلغاء التوقّف: الحالة تعود `active`، والمرحلة **كما هي**. */
export async function resumeOrder(params: {
  order: ProstheticWorkOrder;
  note?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order } = params;
  return await db.transaction(async (tx) => {
    // استئنافٌ لأمرٍ استُؤنف أو انتهى بعد قراءتنا ليس استئنافاً — والحكم
    // من الصفّ المقفول لا من حارس المسار الذي قرأ قبل القفل.
    const live = await lockOrder(tx, order.id);
    assertNotTerminal(live);
    if (live.status === "active") throw new WorkOrderConflictError(live);
    const [updated] = await tx.update(WO)
      .set({ status: "active", holdReasonCode: null, holdNote: null, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "status_change",
      fromStage: live.currentStage, toStage: live.currentStage,
      notes: `استئناف العمل${params.note ? ` — ${params.note}` : ""}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

/**
 * إعادة عمل فني — المسار **الوحيد** للرجوع بمرحلة إلى الخلف.
 *
 * ثلاثة آثار في معاملة واحدة: المرحلة ترجع، والحالة تصير `technical_rework`
 * بسببها، وصفّ في `prosthetic_rework_events` يحفظ ما جرى. والسجلّ يوثّق
 * الرجوع صراحةً `fromStage → toStage`.
 *
 * وللمريض لا شيء من هذا: يرى المرحلة الجديدة فقط، بلا كلمة عن إعادة عمل
 * ولا سبب ولا خطأ.
 */
export async function reworkToStage(params: {
  order: ProstheticWorkOrder;
  returnToStage: string;
  reasonCode: string;
  note?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order, returnToStage, reasonCode } = params;
  return await db.transaction(async (tx) => {
    // مرحلة الرجوع صُودق عليها في المسار مقابل المرحلة **وقت القراءة**.
    // فلو تقدّم الأمر بعدها لَصار «الرجوع» قفزاً إلى الأمام بمصادقةٍ باطلة،
    // ولَكذب `stageWhenDetected` على المرحلة التي اكتُشف فيها العطب.
    const live = await lockOrder(tx, order.id);
    assertNotTerminal(live);
    if (live.currentStage !== order.currentStage) throw new WorkOrderConflictError(live);

    await tx.insert(RW).values({
      workOrderId: order.id,
      reworkType: REWORK_TYPE,
      reasonCode,
      reasonDetails: params.note ?? null,
      stageWhenDetected: live.currentStage,
      createdBy: params.performedBy,
    });
    const [updated] = await tx.update(WO)
      .set({
        currentStage: returnToStage,
        status: "technical_rework",
        holdReasonCode: reasonCode,
        holdNote: params.note ?? null,
        updatedAt: new Date(),
      })
      .where(eq(WO.id, order.id)).returning();
    const [back] = await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "rework",
      fromStage: live.currentStage, toStage: returnToStage,
      notes: `إعادة عمل فني — رجوع من ${live.currentStage} إلى ${returnToStage} — السبب: ${reasonCode}${params.note ? ` — ${params.note}` : ""}`,
      performedBy: params.performedBy,
    }).returning({ id: WH.id });

    // **بيت القصيد في هذه المرحلة كلّها.** السجلّ الداخلي أعلاه يحمل السبب
    // ونوع إعادة العمل والمرحلة التي رجع منها. وحدث المريض لا يحمل منها
    // شيئاً: مرحلةٌ مجرّدة، فيرى أين هو الآن ولا يُشرَح له لماذا رجع.
    await recordStageEvent(tx, {
      order: updated, stage: returnToStage, historyId: back.id,
    });
    return updated;
  });
}

/** إلغاء الأمر — القرار الإداري الوحيد الذي ينهي أمراً بلا تسليم. */
export async function cancelOrder(params: {
  order: ProstheticWorkOrder;
  note?: string | null;
  performedBy: number | null;
}): Promise<ProstheticWorkOrder> {
  const { order } = params;
  return await db.transaction(async (tx) => {
    // إلغاءٌ لأمرٍ أُلغي بعد قراءتنا ليس إلغاءً — والمكتملُ ليس محلّاً
    // للإلغاء أصلاً: جهازٌ سُلِّم لا يُلغى أمرُه بأثر رجعي، وإلا مُحيت
    // نتيجته من الأرقام. والمرحلة من الصفّ المقفول.
    const live = await lockOrder(tx, order.id);
    assertNotTerminal(live);
    const cancelledAt = new Date();
    const [updated] = await tx.update(WO)
      .set({ status: "cancelled", holdReasonCode: null, holdNote: null, updatedAt: cancelledAt })
      .where(eq(WO.id, order.id)).returning();

    // والإلغاء كذلك — بالختم نفسه. والسبب هو ملاحظة الإلغاء إن كتبها
    // المدير، وإلّا يبقى فارغاً: لا يُشتقّ سببٌ من نصٍّ لم يُكتب له.
    // ولا عكسٌ مالي هنا — تصحيح الحساب قرارٌ تجاري صريح لا أثرٌ جانبي.
    await syncEpisodeToOrderTerminalState(tx, updated, {
      status: "cancelled", at: cancelledAt,
      reason: (params.note ?? "").trim() || null,
    });

    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "status_change",
      fromStage: live.currentStage, toStage: live.currentStage,
      notes: `إلغاء الأمر${params.note ? ` — ${params.note}` : ""}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

/**
 * **إبطالُ أمرٍ إدارياً** (ترحيل ٠٦٤) — داخل معاملة المُصحِّح، بلا حُرّاسه.
 *
 * ══ ولماذا ليست `cancelOrder` ═══════════════════════════════════════════
 * تلك بابُ التصنيع الطبيعيّ: تفتح معاملتَها، وترفض المنتهيَ
 * (`assertNotTerminal`)، وتُزامن الحلقةَ إلى حالةٍ طرفيّة. وثلاثتُها لا
 * تصلح هنا — **والباب الطبيعيُّ يبقى بحُرّاسه كما هو**.
 *
 *   ① التصحيحُ الإداريّ جزءٌ من معاملةٍ أكبر تعكس مالاً وتُقاعد متابعةً
 *     وتُلغي معاينة. فمعاملةٌ ثانية تكسر ذرّيةَ الفعل الواحد.
 *   ② والمالكُ يجب أن يصحّح **حتى أمراً اكتمل**: منعُه هو الحبسُ الذي وُلد
 *     هذا الباب لأجل رفعه.
 *   ③ والحلقةُ يتولّاها المُصحِّح بقواعده هو — فحلقةٌ مسلَّمة تبقى مسلَّمة.
 *
 * ══ وما لا يُمَسّ إطلاقاً ════════════════════════════════════════════════
 * **سجلُّ المراحل، والمواد، والخبير، وأحداثُ إعادة العمل، ومواعيدُ التسليم،
 * وختمُ الاكتمال.** أمرٌ اكتمل يبقى `completed` بختمه ويخرج من السلطة
 * التجارية بالوسم وحده — فلا يُقال إن جهازاً سُلِّم لم يُسلَّم. وأمرٌ لم
 * ينتهِ يأخذ الوسمَ و`cancelled` معاً: تلك حالتُه الصحيحة فعلاً.
 *
 * ويُلحَق **سطرُ تاريخٍ صريح** يقول إنه بطل إدارياً ولماذا — فمن يقرأ
 * الأمرَ بعد سنة يجد الروايةَ في مكانها لا في جدولٍ آخر.
 */
export async function voidOrderAdministratively(
  tx: any,
  params: {
    orderId: number;
    reversalId: number;
    reason: string;
    performedBy: number | null;
  },
): Promise<{ wasTerminal: boolean; status: string; currentStage: string | null }> {
  const live = await lockOrder(tx, params.orderId);
  const wasTerminal = live.status === "completed" || live.status === "cancelled";
  await tx.update(WO)
    .set({
      //  المنتهي يبقى على حالته — الوسمُ وحده يرفع سلطتَه.
      ...(wasTerminal ? {} : { status: "cancelled", holdReasonCode: null, holdNote: null }),
      adminVoidReversalId: params.reversalId,
      updatedAt: new Date(),
    })
    .where(eq(WO.id, params.orderId));
  await tx.insert(WH).values({
    workOrderId: params.orderId,
    actionType: "status_change",
    fromStage: live.currentStage, toStage: live.currentStage,
    notes: `إلغاء إداري للعملية — ${params.reason}`
      + (wasTerminal ? " (بقي سجل التنفيذ والتسليم كما هو)" : ""),
    performedBy: params.performedBy,
  });
  return { wasTerminal, status: live.status, currentStage: live.currentStage };
}

export async function reassignExpert(params: {
  order: ProstheticWorkOrder;
  newExpertUserId: number;
  reason: string;
  performedBy: number | null;
  /**
   * قاعدة الاستقبال: لا تحويل بعد بدء العمل. يفحصها المسار قبل القفل،
   * فتُعاد هنا على الصفّ المقفول — وإلا مرّ تحويلٌ بعد تقدّمٍ متزامن.
   */
  requireNotStarted?: boolean;
}): Promise<ProstheticWorkOrder> {
  const { order, newExpertUserId } = params;
  return await db.transaction(async (tx) => {
    const live = await lockOrder(tx, order.id);
    assertNotTerminal(live);
    // الخبير السابق يُقرأ من الصفّ المقفول: لو حوّله غيرُنا بيننا وبين
    // قراءتنا لَسمّى سطرُنا خبيراً لم يكن مسنَداً حين حوّلنا.
    if (live.expertUserId !== order.expertUserId) throw new WorkOrderConflictError(live);
    if (params.requireNotStarted
        && (live.currentStage !== firstStageFor(order.serviceType, order.purpose) || !!live.startedAt)) {
      throw new WorkOrderConflictError(live);
    }
    const [updated] = await tx.update(WO)
      .set({ expertUserId: newExpertUserId, updatedAt: new Date() })
      .where(eq(WO.id, order.id)).returning();
    await tx.insert(WH).values({
      workOrderId: order.id,
      actionType: "reassigned",
      fromStage: live.currentStage, toStage: live.currentStage,
      notes: `تحويل من الخبير ${await expertNameOf(tx, live.expertUserId)} إلى ${await expertNameOf(tx, newExpertUserId)} — السبب: ${params.reason}`,
      performedBy: params.performedBy,
    });
    return updated;
  });
}

// ---- patient-page summary card (authorized non-expert users) -----------------

export async function getActiveOrderSummaryForPatient(patientId: number) {
  const [row] = await db
    .select({
      id: WO.id, serviceType: WO.serviceType, purpose: WO.purpose, status: WO.status, currentStage: WO.currentStage,
      startedAt: WO.startedAt, expectedDeliveryDate: WO.expectedDeliveryDate,
      completedAt: WO.completedAt, finalResult: WO.finalResult, expertUserId: WO.expertUserId,
      expertName: systemUsers.displayName,
    })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .where(eq(WO.patientId, patientId))
    .orderBy(desc(WO.createdAt))
    .limit(1);
  if (!row) return null;
  const rework = await db
    .select({ reworkType: RW.reworkType, n: sql<number>`COUNT(*)::int` })
    .from(RW).where(eq(RW.workOrderId, row.id)).groupBy(RW.reworkType);
  const reworkCount = rework.reduce((n, r) => n + Number(r.n), 0);
  return {
    id: row.id,
    expertUserId: row.expertUserId,
    expertName: row.expertName ?? null,
    serviceType: row.serviceType,
    purpose: row.purpose ?? "initial_build",
    status: row.status,
    currentStage: row.currentStage,
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    expectedDeliveryDate: row.expectedDeliveryDate ? String(row.expectedDeliveryDate) : null,
    completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : null,
    finalResult: row.finalResult ?? null,
    reworkCount,
  };
}

// Every work order for a patient, newest first — the full manufacturing
// history (e.g. عناد built the limb in June, أيوب did a maintenance mold in
// July). Each order is an independent episode with its own expert, service
// type, dates and lifecycle. Read-only shape for the patient page.
export async function getAllOrdersForPatient(patientId: number) {
  const rows = await db
    .select({
      id: WO.id, serviceType: WO.serviceType, purpose: WO.purpose, status: WO.status, currentStage: WO.currentStage,
      startedAt: WO.startedAt, expectedDeliveryDate: WO.expectedDeliveryDate,
      completedAt: WO.completedAt, finalResult: WO.finalResult, createdAt: WO.createdAt,
      expertUserId: WO.expertUserId, expertName: systemUsers.displayName,
      //  **ماذا يُصنَع أو يُصان** (ترحيل ٠٦٠) — يقرؤه الخبيرُ في أمره
      //  والفريقُ في ملفّ المريض، بلا أن يسأل أحد.
      maintenanceComponent: WO.maintenanceComponent,
      deviceEpisodeId: WO.deviceEpisodeId,
      requestedItem: PDE.requestedItem,
      //  **الأمرُ المُبطَل إدارياً يُقال مُبطَلاً** (ترحيل ٠٦٤): يبقى في
      //  السجلّ بمراحله وختمه، لكن الشاشةَ لا تعرضه كعمليةٍ قائمة ولا تفتح
      //  عليه بابَ تصحيحٍ ثانٍ.
      adminVoidReversalId: WO.adminVoidReversalId,
    })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .leftJoin(PDE, eq(PDE.id, WO.deviceEpisodeId))
    .where(eq(WO.patientId, patientId))
    .orderBy(desc(WO.createdAt));
  // Delivery-date changes travel WITH the orders so the patient page can show
  // them to the whole team — the change and its mandatory reason are part of
  // the patient's record, not a private note on the expert's board.
  const orderIds = rows.map((r) => r.id);
  const changes = orderIds.length
    ? await db
        .select({
          workOrderId: WH.workOrderId,
          notes: WH.notes,
          createdAt: WH.createdAt,
          byName: systemUsers.displayName,
        })
        .from(WH)
        .leftJoin(systemUsers, eq(systemUsers.id, WH.performedBy))
        .where(and(inArray(WH.workOrderId, orderIds), eq(WH.actionType, "date_change")))
        .orderBy(asc(WH.createdAt))
    : [];
  const changesByOrder = new Map<number, { note: string; byName: string | null; at: string | null }[]>();
  for (const c of changes) {
    const list = changesByOrder.get(c.workOrderId) ?? [];
    list.push({
      note: c.notes ?? "",
      byName: c.byName ?? null,
      at: c.createdAt ? new Date(c.createdAt).toISOString() : null,
    });
    changesByOrder.set(c.workOrderId, list);
  }

  return rows.map((r) => ({
    id: r.id,
    expertUserId: r.expertUserId,
    expertName: r.expertName ?? null,
    serviceType: r.serviceType,
    purpose: r.purpose ?? "initial_build",
    status: r.status,
    currentStage: r.currentStage,
    startedAt: r.startedAt ? new Date(r.startedAt).toISOString() : null,
    expectedDeliveryDate: r.expectedDeliveryDate ? String(r.expectedDeliveryDate) : null,
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    finalResult: r.finalResult ?? null,
    active: r.status !== "completed" && r.status !== "cancelled",
    adminVoidReversalId: r.adminVoidReversalId ?? null,
    dateChanges: changesByOrder.get(r.id) ?? [],
  }));
}

// ---- admin / manager overview aggregations (done in SQL) ---------------------

export async function getOverview(scope: { branchIds?: number[] | null }) {
  const branchCond = scope.branchIds && scope.branchIds.length > 0
    ? inArray(WO.branchId, scope.branchIds)
    : sql`TRUE`;

  const orders = await db.select({
    id: WO.id, branchId: WO.branchId, expertUserId: WO.expertUserId, serviceType: WO.serviceType,
    status: WO.status, currentStage: WO.currentStage, expectedDeliveryDate: WO.expectedDeliveryDate,
    startedAt: WO.startedAt, completedAt: WO.completedAt, finalResult: WO.finalResult,
    createdAt: WO.createdAt, updatedAt: WO.updatedAt,
    expertName: systemUsers.displayName, branchName: branches.name,
  })
    .from(WO)
    .leftJoin(systemUsers, eq(systemUsers.id, WO.expertUserId))
    .leftJoin(branches, eq(branches.id, WO.branchId))
    .where(branchCond);

  const ids = orders.map((o) => o.id);
  const reworkRows = ids.length
    ? await db.select({ workOrderId: RW.workOrderId, reworkType: RW.reworkType, reasonCode: RW.reasonCode })
        .from(RW).where(inArray(RW.workOrderId, ids))
    : [];

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  const notFinished = (s: string) => s !== "completed" && s !== "cancelled";

  // Per-expert aggregation.
  const experts = new Map<number, any>();
  const stageCounts: Record<string, number> = {};
  const reasonCounts: Record<string, number> = {};
  const branchAgg = new Map<number, any>();
  let overdue = 0, ready = 0, completed = 0, stale = 0;

  const reworkByOrder = new Map<number, number>();
  for (const r of reworkRows) {
    reworkByOrder.set(r.workOrderId, (reworkByOrder.get(r.workOrderId) ?? 0) + 1);
    if (r.reasonCode) reasonCounts[r.reasonCode] = (reasonCounts[r.reasonCode] ?? 0) + 1;
  }

  for (const o of orders) {
    stageCounts[o.currentStage] = (stageCounts[o.currentStage] ?? 0) + 1;
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) overdue++;
    if (o.currentStage === "ready_for_fitting") ready++;
    if (o.status === "completed") completed++;
    if (notFinished(o.status) && daysSince(o.updatedAt) >= 14) stale++;

    const e = experts.get(o.expertUserId) ?? {
      expertUserId: o.expertUserId, expertName: o.expertName ?? `#${o.expertUserId}`,
      total: 0, active: 0, completed: 0, overdue: 0, reworks: 0,
      firstFitSuccess: 0, completedWithResult: 0, durationSum: 0, durationCount: 0,
    };
    e.total++;
    if (notFinished(o.status)) e.active++;
    if (o.status === "completed") {
      e.completed++;
      if (o.finalResult) {
        e.completedWithResult++;
        if (o.finalResult === "first_fit_success") e.firstFitSuccess++;
      }
      if (o.startedAt && o.completedAt) {
        e.durationSum += Math.max(0, (new Date(o.completedAt).getTime() - new Date(o.startedAt).getTime()) / 86_400_000);
        e.durationCount++;
      }
    }
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) e.overdue++;
    e.reworks += reworkByOrder.get(o.id) ?? 0;
    experts.set(o.expertUserId, e);

    const b = branchAgg.get(o.branchId) ?? { branchId: o.branchId, branchName: o.branchName ?? `#${o.branchId}`, total: 0, completed: 0, overdue: 0 };
    b.total++;
    if (o.status === "completed") b.completed++;
    if (!!o.expectedDeliveryDate && notFinished(o.status) && String(o.expectedDeliveryDate) < today) b.overdue++;
    branchAgg.set(o.branchId, b);
  }

  const expertList = Array.from(experts.values()).map((e) => ({
    ...e,
    avgDurationDays: e.durationCount ? Math.round(e.durationSum / e.durationCount) : null,
    firstFitRate: e.completedWithResult ? Math.round((e.firstFitSuccess / e.completedWithResult) * 100) : null,
  })).sort((a, b) => b.total - a.total);

  const topReasons = Object.entries(reasonCounts)
    .map(([code, n]) => ({ code, count: n }))
    .sort((a, b) => b.count - a.count);

  return {
    totals: { total: orders.length, overdue, ready, completed, stale },
    stageCounts,
    experts: expertList,
    topReasons,
    branches: Array.from(branchAgg.values()).sort((a, b) => b.total - a.total),
  };
}

// Guard used by routes: is `stage` valid for the order's service type?
export function stageValidFor(serviceType: string, stage: string, purpose?: string | null): boolean {
  return stagesForOrder(serviceType, purpose).includes(stage);
}
