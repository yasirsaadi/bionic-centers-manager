// حلقات أجهزة المريض — طبقة البيانات الوحيدة.
//
// **كل SQL يخصّ الحلقات يمرّ من هنا.** لا استعلام حلقةٍ في routes ولا في
// storage.ts: الحلقة كيانٌ له ثوابت دقيقة (شراءٌ مفتوحٌ واحد لكل خيط،
// وتسلسلٌ لا يتكرّر، وحالاتٌ خمس بانتقالات محدودة)، وتوزيعُ حراستها على
// عدّة ملفات هو كيف تنحرف الثوابت بصمت.
//
// ══ ما تملكه الحلقة ═════════════════════════════════════════════════════
// **الشراء**: هوية الجهاز، وترتيبه في خيطه، وحالته، وسعره المتفق عليه.
// أمّا **التنفيذ** — الخبير والمراحل والموعد والتسليم — فيملكه أمر التصنيع.
// ولا حقيقة مكرّرة بين الاثنين.
//
// ══ حدود هذه المرحلة ════════════════════════════════════════════════════
// تنتهي عند: حلقة `awaiting_exam` ⟶ معاينة مرتبطة ⟶ حلقة `examined`.
// لا مال، ولا أمر تصنيع، ولا صيانة. `agreedCost` يبقى صفراً حتى تُبنى نقطة
// اعتماده في المرحلة التالية.

import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  patientDeviceEpisodes as PDE,
  type PatientDeviceEpisodeStatus,
} from "@shared/schema";
import {
  isRequestedItem, isProstheticComponent, componentOfRequest, parseRequestedItem,
  FULL_DEVICE, type RequestedItem, type ProstheticComponent,
} from "@shared/prosthetic_parts";

/** الاختصاصان اللذان يُشترى فيهما جهاز. العلاج الطبيعي لا حلقة له. */
export const DEVICE_SERVICE_TYPES = ["prosthetic", "medical_support"] as const;
export type DeviceServiceType = (typeof DEVICE_SERVICE_TYPES)[number];

export function isDeviceServiceType(v: unknown): v is DeviceServiceType {
  return typeof v === "string" && (DEVICE_SERVICE_TYPES as readonly string[]).includes(v);
}

/** الحالات التي تعني «الشراء ما زال جارياً». مطابقة لشرط uq_pde_case_open. */
export const OPEN_STATUSES: PatientDeviceEpisodeStatus[] = [
  "awaiting_exam", "examined", "in_manufacturing",
];

/** الحالات التي يجوز الإلغاء منها: ما قبل التصنيع فقط. */
export const CANCELLABLE_STATUSES: PatientDeviceEpisodeStatus[] = ["awaiting_exam", "examined"];

/**
 * خطأ عملٍ لا خطأ نظام: يحمل رمز HTTP الصحيح ورسالةً عربية للمستخدم.
 * فتردّ النقطة 409 على «جهاز قيد الإجراء» بدل 500 يخفي السبب.
 */
export class DeviceEpisodeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "DeviceEpisodeError";
    this.status = status;
  }
}

export interface DeviceEpisodeView {
  id: number;
  caseId: number;
  serviceType: string;
  sequenceNumber: number;
  status: string;
  agreedCost: number;
  /**
   * **ما طُلب** (ترحيل ٠٦٠): جهازٌ كامل أو جزءٌ بعينه. والقيمُ في
   * `shared/prosthetic_parts`، والصفوفُ السابقة كلُّها `full_device`.
   *
   * والقيمةُ محايدةٌ بين الأطراف والمساند — العنوانُ يُشتقّ من
   * `serviceType` عند العرض، فلا يُوصَف مسندٌ بأنه طرف.
   */
  requestedItem: RequestedItem;
  /** الجزءُ وحده — `null` للجهاز الكامل. مشتقٌّ ومحروسٌ بقيدٍ يلازم الأوّل. */
  component: ProstheticComponent | null;
  branchId: number | null;
  createdAt: string | null;
  deliveredAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
}

const iso = (v: unknown): string | null =>
  v === null || v === undefined ? null : new Date(v as any).toISOString();

function toView(r: Record<string, any>): DeviceEpisodeView {
  return {
    id: Number(r.id),
    caseId: Number(r.case_id),
    serviceType: String(r.service_type),
    sequenceNumber: Number(r.sequence_number),
    status: String(r.status),
    agreedCost: Number(r.agreed_cost ?? 0),
    //  والغيابُ يُقرأ «جهازاً كاملاً»: صفوفُ ما قبل الترحيل كلُّها كذلك
    //  فعلاً — أطرافاً كانت أو مساند.
    requestedItem: isRequestedItem(r.requested_item) ? r.requested_item : FULL_DEVICE,
    component: isProstheticComponent(r.component) ? r.component : null,
    branchId: r.branch_id === null || r.branch_id === undefined ? null : Number(r.branch_id),
    createdAt: iso(r.created_at),
    deliveredAt: iso(r.delivered_at),
    cancelledAt: iso(r.cancelled_at),
    cancelReason: r.cancel_reason ?? null,
  };
}

/**
 * الحلقة المفتوحة لهذا (المريض، نوع الخدمة) إن وُجدت.
 *
 * `serviceType` يُشتقّ من `patient_cases.case_type` ولا يُخزَّن على الحلقة —
 * مصدر حقيقة واحد، فلا نسختان تنحرفان.
 */
export async function getOpenDeviceEpisode(
  patientId: number,
  serviceType: DeviceServiceType,
): Promise<DeviceEpisodeView | null> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.case_id, pc.case_type AS service_type, e.sequence_number, e.status,
           e.agreed_cost, e.requested_item, e.component,
           e.branch_id, e.created_at, e.delivered_at, e.cancelled_at, e.cancel_reason
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id
     WHERE e.patient_id = ${patientId}
       AND pc.case_type = ${serviceType}
       AND e.status NOT IN ('delivered', 'cancelled')
     LIMIT 1
  `);
  const row = (r.rows ?? [])[0];
  return row ? toView(row) : null;
}

/**
 * الأجهزة **المسلَّمة** لهذه الخدمة — وهي وحدها محلٌّ للصيانة.
 *
 * فما لم يُسلَّم بعد (بانتظار معاينة، أو مُعايَن، أو قيد التصنيع) ليس جهازاً
 * قائماً يُصان، والملغى ليس جهازاً أصلاً.
 */
export async function listDeliveredEpisodes(
  patientId: number,
  serviceType: DeviceServiceType,
): Promise<DeviceEpisodeView[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.case_id, pc.case_type AS service_type, e.sequence_number, e.status,
           e.agreed_cost, e.requested_item, e.component,
           e.branch_id, e.created_at, e.delivered_at, e.cancelled_at, e.cancel_reason
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id AND pc.patient_id = e.patient_id
     WHERE e.patient_id = ${patientId}
       AND pc.case_type = ${serviceType}
       AND e.status = 'delivered'
     ORDER BY e.sequence_number ASC
  `);
  return (r.rows ?? []).map(toView);
}

/**
 * الأجهزة التي يجوز أن يُنسَب إليها **مالٌ داخل** أو **زيارة**.
 *
 * `in_manufacturing` و`delivered`: جهازٌ بيع فعلاً — قائمٌ أو قيد الصنع.
 * وما دونهما لم يُبَع بعد (`awaiting_exam` / `examined`) أو لم يعد
 * موجوداً (`cancelled`)، فنسبةُ دفعةٍ إليه تنسب مالاً إلى لا شيء.
 */
export async function listPayableEpisodes(
  patientId: number,
  serviceType: DeviceServiceType,
): Promise<DeviceEpisodeView[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.case_id, pc.case_type AS service_type, e.sequence_number, e.status,
           e.agreed_cost, e.requested_item, e.component,
           e.branch_id, e.created_at, e.delivered_at, e.cancelled_at, e.cancel_reason
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id AND pc.patient_id = e.patient_id
     WHERE e.patient_id = ${patientId}
       AND pc.case_type = ${serviceType}
       AND e.status IN ('in_manufacturing', 'delivered')
     ORDER BY e.sequence_number ASC
  `);
  return (r.rows ?? []).map(toView);
}

/**
 * **حسمُ هوية الجهاز داخل المعاملة** — للدفعة وللصيانة معاً.
 *
 * ══ لماذا داخل المعاملة لا قبلها ════════════════════════════════════════
 * قراءةٌ قبل المعاملة ترشيحٌ لا قرار: بينها وبين الكتابة قد يُخصَّص جهازٌ
 * فيصير مؤهَّلاً (`examined → in_manufacturing`)، أو يُسلَّم فيصير محلّاً
 * للصيانة، أو يُلغى فيخرج. فقرارُ «لا مرشّح ⟶ اكتب بلا هوية» المبنيّ على
 * لقطةٍ بائتة يُنتج بالضبط الصفَّ الملتبس الذي وُجد هذا كلّه لمنعه.
 *
 * والقفل على **صفّ الخيط** — نقطة القفل نفسها التي يستعملها بدءُ الحلقة
 * والتخصيص — يجعل الترتيب صريحاً لا عشوائياً: مَن ظفر بالقفل أوّلاً رأى
 * حالةً مستقرّة، والثاني يرى نتيجته لا لقطةً قبلها.
 *
 * ══ والمعرّف الصريح لا يُتجاهَل أبداً ═══════════════════════════════════
 * لو أرسل الطلب جهازاً بعينه فهو **قرارُ موظّف**: يُتحقَّق منه دائماً
 * ويُردّ إن لم يصلح — ولا يُبتلع بصمت لمجرّد أن قائمة المرشّحين فارغة.
 * ابتلاعُه يحوّل خطأً ظاهراً إلى صفٍّ صامتٍ بلا هوية.
 */
export async function resolveDeviceTargetTx(
  tx: { execute: (q: any) => Promise<any> },
  params: {
    patientId: number;
    serviceType: DeviceServiceType;
    /** ما وصل في الطلب — أيّ شيء، ويُتحقَّق هنا. */
    requestedEpisodeId: unknown;
    /** إقرارٌ صريح بأن الجهاز قديم/غير مخصَّص. */
    explicitLegacy: boolean;
    /** الحالات التي تصلح لهذا الغرض: البيع شيء والصيانة شيء. */
    eligibleStatuses: readonly string[];
    /** رسالة الطلب حين يتعدّد المرشّحون ولا اختيار. */
    chooseMessage: string;
  },
): Promise<number | null> {
  const hasExplicit = params.requestedEpisodeId != null && params.requestedEpisodeId !== "";
  if (hasExplicit && params.explicitLegacy) {
    throw new DeviceEpisodeError("طلبٌ متناقض: جهازٌ محدَّد و«جهاز قديم» معاً", 400);
  }

  //  القفل أوّلاً — قبل أي قراءة يُبنى عليها قرار.
  await tx.execute(sql`
    SELECT id FROM patient_cases
     WHERE patient_id = ${params.patientId} AND case_type = ${params.serviceType}
     FOR UPDATE
  `);

  if (hasExplicit) {
    const wantId = Number(params.requestedEpisodeId);
    if (!Number.isInteger(wantId) || wantId <= 0) {
      throw new DeviceEpisodeError("معرّف جهاز غير صالح", 400);
    }
    const r = await tx.execute(sql`
      SELECT e.status
        FROM patient_device_episodes e
        JOIN patient_cases pc
          ON pc.id = e.case_id AND pc.patient_id = e.patient_id
         AND pc.case_type = ${params.serviceType}
       WHERE e.id = ${wantId} AND e.patient_id = ${params.patientId}
       FOR UPDATE OF e
    `);
    const row = (r.rows ?? [])[0];
    if (!row) {
      throw new DeviceEpisodeError("الجهاز المحدَّد لا يخصّ هذا المريض أو هذه الخدمة", 400);
    }
    if (!params.eligibleStatuses.includes(String(row.status))) {
      throw new DeviceEpisodeError("الجهاز المحدَّد ليس في حالة تقبل هذا التسجيل", 400);
    }
    return wantId;
  }

  if (params.explicitLegacy) return null;

  // ══ لا اختيار: تُقفَل **كل** حلقات الخيط قبل الحكم ═══════════════════
  // قفلُ الخيط وحده لا يكفي هنا: انتقالُ الحلقة إلى «مُسلَّمة» يجري بتحديثٍ
  // على صفّ الحلقة نفسه ولا يمرّ بالخيط. فقارئٌ يرى «قيد التصنيع» ويقرّر
  // «لا مرشّح ⟶ بلا هوية»، بينما تسليمٌ متزامن يُثبِّت «مُسلَّمة» قبله،
  // يكتب صيانةً بلا هوية لجهازٍ صار مسجَّلاً وقت الكتابة.
  //
  // ولذلك تُقفَل الصفوف نفسها — **كلّها لا المؤهَّلة منها فقط**: الصفّ
  // الذي لا يؤهّل الآن هو بعينه الذي قد يؤهّل بعد لحظة، وقفلُ المؤهَّل
  // وحده يترك المتحوِّل بلا حراسة.
  //
  // فيصير الترتيب حتمياً لا توقيتياً:
  //   • التسليم أوّلاً ⟶ نقرأ «مُسلَّمة» فنطلب اختيار الجهاز.
  //   • نحن أوّلاً ⟶ نمسك القفل، فينتظر التسليم إلى ما بعد كتابتنا.
  // ولا يمكن أن يُثبَّت تسليمٌ ثم تُكتب بعده صيانةٌ بلا هوية.
  const locked = await tx.execute(sql`
    SELECT e.id, e.status
      FROM patient_device_episodes e
      JOIN patient_cases pc
        ON pc.id = e.case_id AND pc.patient_id = e.patient_id
       AND pc.case_type = ${params.serviceType}
     WHERE e.patient_id = ${params.patientId}
     FOR UPDATE OF e
  `);
  const eligible = (locked.rows ?? []).some(
    (r: any) => params.eligibleStatuses.includes(String(r.status)),
  );
  if (eligible) throw new DeviceEpisodeError(params.chooseMessage, 400);
  //  ولا حلقة أصلاً ⟶ قفل الخيط كافٍ: مَن يفتح حلقةً جديدة يمرّ به.
  return null;
}

/**
 * تحقّقٌ من انتماء جهازٍ لمريضٍ وخدمة — يُقرأ عبر الخيط فيُثبَت الزوج.
 * `allowedStatuses` تحدّد ما يصلح للغرض: البيع شيء والزيارة شيء.
 */
export async function verifyEpisodeBelongs(
  patientId: number,
  episodeId: number,
  serviceType: DeviceServiceType,
  allowedStatuses: readonly string[],
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const r = await db.execute<{ status: string }>(sql`
    SELECT e.status
      FROM patient_device_episodes e
      JOIN patient_cases pc
        ON pc.id = e.case_id AND pc.patient_id = e.patient_id AND pc.case_type = ${serviceType}
     WHERE e.id = ${episodeId} AND e.patient_id = ${patientId}
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return { ok: false, reason: "الجهاز المحدَّد لا يخصّ هذا المريض أو هذه الخدمة" };
  if (!allowedStatuses.includes(String(row.status))) {
    return { ok: false, reason: "الجهاز المحدَّد ليس في حالة تقبل هذا التسجيل" };
  }
  return { ok: true };
}

/** كل حلقات المريض، مرتّبةً بالاختصاص ثم بالتسلسل. */
export async function getDeviceEpisodesForPatient(
  patientId: number,
): Promise<DeviceEpisodeView[]> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.case_id, pc.case_type AS service_type, e.sequence_number, e.status,
           e.agreed_cost, e.requested_item, e.component,
           e.branch_id, e.created_at, e.delivered_at, e.cancelled_at, e.cancel_reason
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id
     WHERE e.patient_id = ${patientId}
     ORDER BY pc.case_type ASC, e.sequence_number ASC
  `);
  return (r.rows ?? []).map(toView);
}

/**
 * بدء جهاز جديد على خيط قائم.
 *
 * ══ الحماية من السباق ═════════════════════════════════════════════════
 * طلبان متزامنان لنفس المريض والنوع كانا سيقرآن `MAX(sequence)+1` نفسه
 * فينشئان حلقتين برقمٍ واحد. الحلّ قفلٌ حقيقي على **صفّ الخيط**
 * (`SELECT ... FOR UPDATE` على `patient_cases`): كل شيء بعده — فحص
 * المفتوحة، وحساب التسلسل، والإدراج — يجري متسلسلاً لا متوازياً.
 *
 * والخيط هو نقطة القفل الصحيحة لأنه ثابت الوجود: القفل على «الحلقة
 * المفتوحة» يفشل حين لا توجد واحدة، وهي بالضبط حالة السباق.
 *
 * وخلف القفل يقف فهرسان في القاعدة نفسها — `uq_pde_case_open` و
 * `uq_pde_case_seq` — فحتى لو أُلغي القفل يوماً تبقى الثوابت محروسة.
 */
export async function startDeviceEpisode(params: {
  patientId: number;
  serviceType: DeviceServiceType;
  createdBy: number | null;
  /**
   * **ما طُلب** — جهازٌ كامل أو جزءٌ بعينه (ترحيل ٠٦٠).
   *
   * الغيابُ يُقرأ «جهازاً كاملاً»: نافذةٌ قديمة مفتوحةٌ منذ ما قبل النشر لا
   * ترسله، ولا يجوز أن تُردّ وهي تفعل ما كانت تفعله دائماً.
   *
   * **والجزءُ على مسندٍ طبيّ يُردّ لا يُصحَّح**: تصحيحُه إلى «كامل» — كما
   * كان يفعل هذا السطر — يمرّر طلباً لم يقصده أحد، ويكتب في السجلّ أن
   * المريض طلب مسنداً كاملاً وهو طلب ركبة. والحارسُ هنا لا في النقطة
   * وحدها: ما يصل من العميل لا يُوثَق به، وهذه هي الطبقةُ القانونية.
   */
  requestedItem?: RequestedItem | null;
}): Promise<DeviceEpisodeView> {
  const { patientId, serviceType, createdBy } = params;
  const parsed = parseRequestedItem(params.requestedItem, serviceType);
  if (!parsed.ok) throw new DeviceEpisodeError(parsed.error!, 400);
  const requestedItem: RequestedItem = parsed.value ?? FULL_DEVICE;
  //  **والجزءُ مشتقٌّ لا مُدخَل**: القيدُ في القاعدة يلازم بينهما، واشتقاقُه
  //  هنا يمنع أن يُكتب العمودان بيدين فينحرفا.
  const component = componentOfRequest(requestedItem);

  return await db.transaction(async (tx) => {
    const pat = await tx.execute<{ id: number; branch_id: number | null }>(sql`
      SELECT id, branch_id FROM patients WHERE id = ${patientId}
    `);
    const patient = (pat.rows ?? [])[0];
    if (!patient) throw new DeviceEpisodeError("المريض غير موجود", 404);

    //  القفل. الخيط شرط وجود: لا يُفتح جهاز على اختصاص لم يُصنَّف بعد.
    const cs = await tx.execute<{ id: number; branch_id: number | null }>(sql`
      SELECT id, branch_id FROM patient_cases
       WHERE patient_id = ${patientId} AND case_type = ${serviceType}
       FOR UPDATE
    `);
    const caseRow = (cs.rows ?? [])[0];
    if (!caseRow) {
      throw new DeviceEpisodeError(
        "لا توجد حالة من هذا النوع على ملف المريض — أضف نوع الحالة أولاً", 400,
      );
    }

    const open = await tx.execute<{ id: number; status: string }>(sql`
      SELECT id, status FROM patient_device_episodes
       WHERE case_id = ${caseRow.id} AND status NOT IN ('delivered', 'cancelled')
       LIMIT 1
    `);
    if ((open.rows ?? []).length > 0) {
      throw new DeviceEpisodeError("لدى المريض جهاز من هذا النوع قيد الإجراء بالفعل", 409);
    }

    //  **والطرف الآخر من السباق نفسه.** أمرُ بناءٍ قديمٍ نشط — بلا حلقة —
    //  يعني جهازاً يُصنَع الآن بالمسار القديم. ففتحُ حلقةٍ فوقه يُنتج
    //  الحالة النصفية عينها التي يمنعها الحارس المقابل: جهازان قيد
    //  الإجراء، أحدهما بهوية وأحدهما بلا. والقفل على الخيط أعلاه يجعل
    //  الحسم للأسبق: مَن ظفر بالقفل أوّلاً مضى، والآخر يُردّ صراحةً.
    const legacyBuild = await tx.execute<{ id: number }>(sql`
      SELECT id FROM prosthetic_work_orders
       WHERE patient_id = ${patientId}
         AND service_type = ${serviceType}
         AND purpose = 'initial_build'
         AND status NOT IN ('completed', 'cancelled')
         AND device_episode_id IS NULL
       LIMIT 1
    `);
    if ((legacyBuild.rows ?? []).length > 0) {
      throw new DeviceEpisodeError(
        "لدى المريض أمر تصنيع نشط لهذه الخدمة — أكمِله أو ألغِه قبل بدء جهاز جديد", 409,
      );
    }

    const mx = await tx.execute<{ next: number }>(sql`
      SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
        FROM patient_device_episodes WHERE case_id = ${caseRow.id}
    `);
    const nextSeq = Number((mx.rows ?? [])[0]?.next ?? 1);

    const ins = await tx.execute<Record<string, any>>(sql`
      INSERT INTO patient_device_episodes
        (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
         requested_item, component, created_by, created_at, updated_at)
      VALUES (${patientId}, ${caseRow.id}, ${caseRow.branch_id ?? patient.branch_id ?? null},
              ${nextSeq}, 'awaiting_exam', 0, ${requestedItem}, ${component},
              ${createdBy}, NOW(), NOW())
      RETURNING id, case_id, sequence_number, status, agreed_cost, requested_item, component, branch_id,
                created_at, delivered_at, cancelled_at, cancel_reason
    `);
    const row = (ins.rows ?? [])[0];
    return toView({ ...row, service_type: serviceType });
  });
}

/**
 * إلغاء حلقة **قبل التصنيع**.
 *
 * بدونه تبقى الحلقة المفتوحة حاجزاً دائماً: مريضٌ غيّر رأيه بعد طلب الجهاز
 * يُقفل خيطه للأبد، ولا سبيل لبدء جهازٍ آخر عليه أبداً.
 *
 * والإلغاء بعد بدء التصنيع **ليس هنا**: هناك أمرُ عملٍ حقيقي بمراحله
 * وخبيره، وإلغاؤه قرارُ تصنيعٍ يُتَّخذ من الأمر نفسه ثم يُغلق الحلقة —
 * لا العكس. فهذه النقطة ترفض `in_manufacturing` صراحةً.
 */
export async function cancelPreManufacturingDeviceEpisode(params: {
  patientId: number;
  episodeId: number;
  reason: string;
}): Promise<DeviceEpisodeView> {
  const { patientId, episodeId } = params;
  const reason = (params.reason ?? "").trim();
  if (!reason) throw new DeviceEpisodeError("سبب الإلغاء إلزامي", 400);

  return await db.transaction(async (tx) => {
    const cur = await tx.execute<{ id: number; status: string; patient_id: number }>(sql`
      SELECT id, status, patient_id FROM patient_device_episodes
       WHERE id = ${episodeId} FOR UPDATE
    `);
    const ep = (cur.rows ?? [])[0];
    if (!ep) throw new DeviceEpisodeError("الحلقة غير موجودة", 404);
    //  الانتماء يُتحقَّق في الشيفرة لا في المسار وحده: معرّفٌ من ملف مريض
    //  آخر لا يجوز أن يُلغى لمجرّد أنه ورد في عنوان صحيح.
    if (Number(ep.patient_id) !== patientId) {
      throw new DeviceEpisodeError("الحلقة لا تخصّ هذا المريض", 404);
    }

    const status = String(ep.status);
    if (status === "in_manufacturing") {
      throw new DeviceEpisodeError(
        "الجهاز دخل التصنيع — يُلغى من أمر التصنيع نفسه لا من هنا", 409,
      );
    }
    if (!CANCELLABLE_STATUSES.includes(status as PatientDeviceEpisodeStatus)) {
      throw new DeviceEpisodeError("الحلقة في حالة نهائية ولا تُلغى", 409);
    }

    const upd = await tx.execute<Record<string, any>>(sql`
      UPDATE patient_device_episodes
         SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = ${reason},
             updated_at = NOW()
       WHERE id = ${episodeId}
      RETURNING id, case_id, sequence_number, status, agreed_cost, requested_item, component, branch_id,
                created_at, delivered_at, cancelled_at, cancel_reason
    `);
    const row = (upd.rows ?? [])[0];
    const ct = await tx.execute<{ case_type: string }>(sql`
      SELECT case_type FROM patient_cases WHERE id = ${row.case_id}
    `);
    return toView({ ...row, service_type: (ct.rows ?? [])[0]?.case_type ?? "" });
  });
}

// ── الربط بالمعاينة ─────────────────────────────────────────────────────
// الدالّتان التاليتان تأخذان معاملةً جاهزة (`tx`) بدل أن تفتحا واحدة: توقيع
// المعاينة وتحريك الحلقة **حدثٌ واحد** لا حدثان متجاوران. فتبقى كتابة
// الحلقات كلّها في هذا الملف، ويبقى التزامن بيد المُستدعي.

/**
 * احجز الحلقة المنتظرة لهذا (المريض، الخيط) إن وُجدت.
 *
 * المطابقة على **الزوج** لا على أحد طرفيه: `caseId` صحيحٌ وحده لا يثبت أن
 * الخيط يخصّ هذا المريض، والكذبة تكون في الجمع بينهما. و
 * `medical_exams.device_episode_id` بلا مفتاح أجنبي عمداً — ترِكر الختم
 * (028) يرفض الـ SET NULL الذي يحتاجه المفتاح — فغياب حارس القاعدة هو
 * بالضبط ما يجعل هذا الفحص غير قابل للتخطّي.
 *
 * والقفل (`FOR UPDATE`) يمنع طبيبين يوقّعان معاً من حجز الحلقة نفسها.
 */
export async function claimAwaitingEpisodeForExam(
  tx: { execute: (q: any) => Promise<any> },
  params: { patientId: number; caseId: number },
): Promise<number | null> {
  const found = await tx.execute(sql`
    SELECT id FROM patient_device_episodes
     WHERE case_id = ${params.caseId}
       AND patient_id = ${params.patientId}
       AND status = 'awaiting_exam'
     LIMIT 1
     FOR UPDATE
  `);
  const row = (found.rows ?? [])[0];
  return row ? Number(row.id) : null;
}

/**
 * **أعِد الحلقة إلى «بانتظار المعاينة»** — عند إلغاء المعاينة التي عاينتها
 * (ترحيل ٠٦١).
 *
 * الطلبُ باقٍ والمعاينةُ سقطت: المريضُ ما زال يريد الجهاز، فتُوقَّع له
 * معاينةٌ مصحَّحة تطالب **هذه الحلقةَ نفسَها** ولا تفتح ثانية. والشرطُ
 * `status = 'examined'` يجعلها بلا أثرٍ على أيّ حالةٍ أخرى — فحلقةٌ دخلت
 * التصنيعَ بين الفحص والكتابة لا تُسحَب منه بأثرٍ رجعي.
 */
export async function revertEpisodeToAwaitingExam(
  tx: { execute: (q: any) => Promise<any> },
  episodeId: number,
): Promise<void> {
  await tx.execute(sql`
    UPDATE patient_device_episodes
       SET status = 'awaiting_exam', updated_at = NOW()
     WHERE id = ${episodeId} AND status = 'examined'
  `);
}

/** حرّك الحلقة إلى «مُعايَنة» داخل معاملة المُستدعي. */
export async function markEpisodeExamined(
  tx: { execute: (q: any) => Promise<any> },
  episodeId: number,
): Promise<void> {
  await tx.execute(sql`
    UPDATE patient_device_episodes
       SET status = 'examined', updated_at = NOW()
     WHERE id = ${episodeId} AND status = 'awaiting_exam'
  `);
}

// ── دورة التصنيع ────────────────────────────────────────────────────────
// الدوالّ التالية تأخذ معاملةً جاهزة: البيع وإنشاء أمر التصنيع وتحريك
// الحلقة حدثٌ واحد، إمّا يتمّ كلّه أو لا شيء منه.

export interface LockedEpisode {
  id: number;
  caseId: number;
  patientId: number;
  serviceType: string;
  status: string;
  agreedCost: number;
}

/**
 * اقفل الحلقة المفتوحة لهذا (المريض، نوع الخدمة) وتحقّق من انتمائها.
 *
 * تُرجع `null` حين لا توجد حلقة مفتوحة — وهذا هو **المسار القديم**، لا
 * خطأ. أمّا الحلقة الموجودة فتُقفل قفلاً حقيقياً قبل أي قراءة يُبنى عليها
 * قرار، فضغطتان متزامنتان على «تخصيص» تتسلسلان ولا تتسابقان.
 *
 * والانتماء يُتحقَّق بالضمّ لا بالثقة: الحلقة تُقرأ **عبر** خيطها، فيُثبَت
 * في استعلام واحد أن الخيط لهذا المريض وأن نوعه هو نوع الخدمة المطلوبة.
 */
export async function lockOpenEpisodeForAssignment(
  tx: { execute: (q: any) => Promise<any> },
  params: { patientId: number; serviceType: DeviceServiceType },
): Promise<LockedEpisode | null> {
  const r = await tx.execute(sql`
    SELECT e.id, e.case_id, e.patient_id, e.status, e.agreed_cost, pc.case_type
      FROM patient_device_episodes e
      JOIN patient_cases pc
        ON pc.id = e.case_id
       AND pc.patient_id = e.patient_id
       AND pc.case_type = ${params.serviceType}
     WHERE e.patient_id = ${params.patientId}
       AND e.status NOT IN ('delivered', 'cancelled')
     LIMIT 1
     FOR UPDATE OF e
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    caseId: Number(row.case_id),
    patientId: Number(row.patient_id),
    serviceType: String(row.case_type),
    status: String(row.status),
    agreedCost: Number(row.agreed_cost ?? 0),
  };
}

/**
 * **نقطة القفل الموحّدة**: اقفل الخيط ثم اقرأ حلقته المفتوحة.
 *
 * ══ لماذا الخيط لا الحلقة ═══════════════════════════════════════════════
 * قفل الحلقة يحرس حلقةً **موجودة**، وغيابُ صفٍّ لا يُقفَل. والسباق الذي
 * يهمّنا هو بالضبط غيابها: قارئٌ رأى «لا حلقة» فمضى إلى المسار القديم،
 * وبين قراءته وكتابته وُلدت حلقة. النتيجة أمرُ بناءٍ يتيم بلا هوية، وحلقةٌ
 * مفتوحة لا أمر لها — نصفُ حالةٍ لا يُصلحها شيء بعد وقوعها.
 *
 * وصفّ الخيط **ثابت الوجود**: كل من يفتح حلقةً يمرّ به (`startDeviceEpisode`
 * يقفله)، فقفله هنا يجعل الطريقين متسلسلين حقاً لا متجاورين.
 *
 * لا خيط ⟶ لا حلقة ممكنة: الحلقة تشترط خيطاً قائماً، فمن يفتحها يجد
 * القفل بانتظاره.
 */
export async function lockCaseAndReadOpenEpisode(
  tx: { execute: (q: any) => Promise<any> },
  params: { patientId: number; serviceType: DeviceServiceType },
): Promise<{ caseId: number | null; episode: LockedEpisode | null }> {
  const cs = await tx.execute(sql`
    SELECT id FROM patient_cases
     WHERE patient_id = ${params.patientId} AND case_type = ${params.serviceType}
     FOR UPDATE
  `);
  const caseRow = (cs.rows ?? [])[0];
  if (!caseRow) return { caseId: null, episode: null };

  const r = await tx.execute(sql`
    SELECT id, case_id, patient_id, status, agreed_cost
      FROM patient_device_episodes
     WHERE case_id = ${caseRow.id}
       AND status NOT IN ('delivered', 'cancelled')
     LIMIT 1
     FOR UPDATE
  `);
  const row = (r.rows ?? [])[0];
  return {
    caseId: Number(caseRow.id),
    episode: row ? {
      id: Number(row.id),
      caseId: Number(row.case_id),
      patientId: Number(row.patient_id),
      serviceType: params.serviceType,
      status: String(row.status),
      agreedCost: Number(row.agreed_cost ?? 0),
    } : null,
  };
}

/**
 * البيع: ثبّت سعر **هذا الجهاز** وادفعه إلى التصنيع.
 *
 * `agreedCost` سعرُ جهازٍ واحد لا مجموعُ الخيط — والفرق هو كل الفرق:
 * `patient_cases.cost` تراكمٌ لعمر الاختصاص كلّه، فلو كُتب عليه سعرُ
 * الجهاز الجديد لابتلع الجديدُ تاريخَ ما قبله.
 */
export async function markEpisodeInManufacturing(
  tx: { execute: (q: any) => Promise<any> },
  params: { episodeId: number; agreedCost: number },
): Promise<void> {
  await tx.execute(sql`
    UPDATE patient_device_episodes
       SET agreed_cost = ${params.agreedCost}, status = 'in_manufacturing', updated_at = NOW()
     WHERE id = ${params.episodeId}
  `);
}

/**
 * **حلقةُ الجهاز الأول تُماديَ عند البيع — لا تُترك للتاريخ.**
 *
 * ══ الثغرةُ التي تُغلقها (المريض WB-02243، بعد ٢٣٩) ═══════════════════
 * ترحيلُ ٠٥٠ ملأ أوامرَ البناء التاريخية بحلقاتها — **لكنه جرى مرّةً
 * واحدة**. والمسارُ الحيّ ظلّ يقبل بيعَ **الجهاز الأول** بلا حلقة: مريضٌ
 * جديد يُعايَن ثمّ يشتري، والاستعلاماتُ لم تفتح له «طلبَ جهاز» صراحةً —
 * فلا حلقةَ ولا هويّة. **فصفٌّ يولد اليوم يصير «تاريخياً» لحظةَ ولادته**،
 * ويُردّ عليه تصحيحُ السعر بعد البيع بحجّة «مسارٌ قديم بلا هويّة جهاز».
 *
 * والعلاجُ ليس ترحيلاً ثانياً بل **إغلاقُ البابِ نفسه**: تُماديَ الحلقةُ
 * في **أضيق نقطةٍ يَعلم فيها النظامُ يقيناً** أن هذه المتابعةَ بعينها
 * تتحوّل إلى هذا البيع بعينه — لحظةَ تأكيد الشراء، داخل معاملته.
 *
 * ══ ولا تُنشأ لمجرّد أن المريضَ مبتور ════════════════════════════════
 * الرايةُ على الملفّ نيّةٌ لا طلب. والمتابعةُ الموقَّعة هي الدليلُ القاطع:
 * لها مريضٌ وخيطٌ ومعاينةٌ ونوعُ خدمة، وقد بلغت لحظةَ البيع.
 *
 * ══ وحالتُها `examined` لا `awaiting_exam` ═══════════════════════════
 * المتابعةُ لا توجد إلّا عن معاينةٍ موقّعة — فالجهازُ **فُحص فعلاً**،
 * وكتابةُ «ينتظر الفحص» تكذب على السجلّ ثمّ تحتاج خطوةً تصحّحها. و
 * `assignManufacturing` تشترط `examined` بالضبط، فتستقبلها كأيّ حلقةٍ
 * فتحها الاستعلاماتُ صراحةً — **بلا مسارِ تصنيعٍ ثانٍ.**
 *
 * ══ وidempotent بالقفل ═══════════════════════════════════════════════
 * القفلُ على صفّ الخيط هو نقطةُ التسلسل نفسُها التي يستعملها
 * `startDeviceEpisode` و`lockCaseAndReadOpenEpisode` — **لا عرفَ قفلٍ
 * ثانٍ**. فضغطتان متزامنتان على «تأكيد الشراء» تتسلسلان: الأولى تُنشئ
 * والثانية تجد وتُعيد الموجودة. ويحرسه `uq_pde_case_open` في القاعدة.
 *
 * وحلقةٌ مفتوحةٌ وُجدت أصلاً **تُعاد كما هي ولا تُنشأ ثانية** — وهو حالُ
 * المريض العائد الذي فتح له الاستعلاماتُ طلباً صريحاً قبل المعاينة.
 *
 * @returns الحلقةُ الجاهزة للإسناد، أو `null` حين لا خيطَ لهذا الاختصاص
 *          (فيمضي المُستدعي على مساره القديم بلا كسر).
 */
export async function ensureFirstDeviceEpisodeForSale(
  tx: { execute: (q: any) => Promise<any> },
  params: {
    patientId: number;
    serviceType: DeviceServiceType;
    createdBy: number | null;
    /** ما طُلب إن كان معروفاً — والغيابُ «جهازٌ كامل»، وهو حالُ الأول. */
    requestedItem?: RequestedItem | null;
  },
): Promise<LockedEpisode | null> {
  //  القفلُ أوّلاً: الخيطُ ثابتُ الوجود، وكلُّ مَن يفتح حلقةً يمرّ به.
  const cs = await tx.execute(sql`
    SELECT id, branch_id FROM patient_cases
     WHERE patient_id = ${params.patientId} AND case_type = ${params.serviceType}
     FOR UPDATE
  `);
  const caseRow = (cs.rows ?? [])[0];
  //  لا خيط ⟶ لا حلقةَ ممكنة. والمُستدعي يمضي كما كان يمضي دائماً:
  //  رفضُ البيع هنا كان سيكسر مساراً قائماً لأجل هويّةٍ إدارية.
  if (!caseRow) return null;

  //  حلقةٌ مفتوحةٌ قائمة ⟶ هي المقصودة. **ولا ثانيةَ تُفتح فوقها.**
  const open = await tx.execute(sql`
    SELECT id, case_id, patient_id, status, agreed_cost
      FROM patient_device_episodes
     WHERE case_id = ${caseRow.id}
       AND status NOT IN ('delivered', 'cancelled')
     LIMIT 1
     FOR UPDATE
  `);
  const existing = (open.rows ?? [])[0];
  if (existing) {
    return {
      id: Number(existing.id),
      caseId: Number(existing.case_id),
      patientId: Number(existing.patient_id),
      serviceType: params.serviceType,
      status: String(existing.status),
      agreedCost: Number(existing.agreed_cost ?? 0),
    };
  }

  const parsed = parseRequestedItem(params.requestedItem, params.serviceType);
  if (!parsed.ok) throw new DeviceEpisodeError(parsed.error!, 400);
  const requestedItem: RequestedItem = parsed.value ?? FULL_DEVICE;
  const component = componentOfRequest(requestedItem);

  const mx = await tx.execute(sql`
    SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next
      FROM patient_device_episodes WHERE case_id = ${caseRow.id}
  `);
  const nextSeq = Number((mx.rows ?? [])[0]?.next ?? 1);

  const ins = await tx.execute(sql`
    INSERT INTO patient_device_episodes
      (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
       requested_item, component, created_by, created_at, updated_at)
    VALUES (${params.patientId}, ${caseRow.id}, ${caseRow.branch_id ?? null},
            ${nextSeq}, 'examined', 0, ${requestedItem}, ${component},
            ${params.createdBy}, NOW(), NOW())
    RETURNING id, case_id, patient_id, status, agreed_cost
  `);
  const row = (ins.rows ?? [])[0];
  return {
    id: Number(row.id),
    caseId: Number(row.case_id),
    patientId: Number(row.patient_id),
    serviceType: params.serviceType,
    status: String(row.status),
    agreedCost: Number(row.agreed_cost ?? 0),
  };
}

/** الحلقةُ المقفولة لتصحيح سعرها — هويّتُها وحالتُها وسعرُها القائم. */
export interface EpisodeForPriceCorrection {
  id: number;
  caseId: number;
  patientId: number;
  status: string;
  agreedCost: number;
}

/** الحالاتُ التي يجوز تصحيحُ سعرها بعد البيع — وما عداها يُردّ لا يُخمَّن. */
export const PRICE_CORRECTABLE_STATUSES = ["in_manufacturing", "delivered"] as const;

/**
 * اقفل حلقةً بعينها لتصحيح سعرها — **بهويّتها لا بـ(مريض + قسم)**.
 *
 * المريضُ العائد يملك أكثر من جهاز، والتصحيحُ يخصّ الجهازَ الذي وصفته
 * المعاينةُ وحده. فالمعرّف يأتي من سلسلةِ الهويّة (معاينة ⟶ متابعة ⟶ حلقة)
 * ويُتحقَّق هنا أن الحلقة **لهذا المريض وهذا الخيط** قبل أن يُكتب دينار.
 *
 * `FOR UPDATE` يجعل التصحيحَ والبيعَ والتسليمَ يتسلسلون على الصفّ نفسه.
 */
export async function lockEpisodeForPriceCorrection(
  tx: { execute: (q: any) => Promise<any> },
  episodeId: number,
): Promise<EpisodeForPriceCorrection | null> {
  const r = await tx.execute(sql`
    SELECT id, case_id, patient_id, status, agreed_cost
      FROM patient_device_episodes
     WHERE id = ${episodeId}
     LIMIT 1
     FOR UPDATE
  `);
  const row = (r.rows ?? [])[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    caseId: Number(row.case_id),
    patientId: Number(row.patient_id),
    status: String(row.status),
    agreedCost: Number(row.agreed_cost ?? 0),
  };
}

/**
 * صحّح سعرَ حلقةٍ **بلا أن تلمس حالتها**.
 *
 * ══ ولماذا ليست `markEpisodeInManufacturing` ═══════════════════════════
 * تلك تكتب السعرَ **وتدفع الحلقةَ إلى التصنيع** — وهي البيعُ نفسُه. وجهازٌ
 * سُلِّم فعلاً يُصحَّح سعرُه لا يُعاد إلى التصنيع: نداؤها هنا كان سيقلب
 * `delivered` إلى `in_manufacturing` ويعيد جهازاً في يد صاحبه إلى المصنع.
 *
 * فالتصحيحُ يكتب رقماً واحداً، والشرطُ في `WHERE` يمنع أن يقع على حلقةٍ
 * تغيّرت حالتُها بين القراءة والكتابة. ويُرجع عددَ الصفوف كي يقرّر المُستدعي.
 */
export async function correctEpisodeAgreedCost(
  tx: { execute: (q: any) => Promise<any> },
  params: { episodeId: number; agreedCost: number; expectStatus: string },
): Promise<boolean> {
  const r = await tx.execute(sql`
    UPDATE patient_device_episodes
       SET agreed_cost = ${params.agreedCost}, updated_at = NOW()
     WHERE id = ${params.episodeId} AND status = ${params.expectStatus}
    RETURNING id
  `);
  return (r.rows ?? []).length > 0;
}

/**
 * زامن الحلقة مع أمرها حين ينتهي.
 *
 * الشرطان في مكانٍ واحد لا موزَّعين على المستدعين: **رابطٌ موجود** و
 * **غرضٌ بناءٌ أولي**. فالصيانة لا تُنهي حلقةً أبداً — جهازٌ يُصان جهازٌ
 * قائم، وانتهاء صيانته ليس انتهاءه.
 *
 * والختم الزمني يأتي من المُستدعي لا من `NOW()`: تسليم الحلقة هو تسليم
 * أمرها بعينه، فلو ولّدت الدالّة وقتها لاختلف الرقمان بأجزاء الثانية
 * وصار لكل جدولٍ روايةٌ للحظة واحدة.
 */
export async function syncEpisodeToOrderTerminalState(
  tx: { execute: (q: any) => Promise<any> },
  order: { deviceEpisodeId: number | null; purpose: string | null },
  terminal: { status: "delivered" | "cancelled"; at: Date; reason?: string | null },
): Promise<void> {
  if (order.deviceEpisodeId === null || order.deviceEpisodeId === undefined) return;
  if (order.purpose !== "initial_build") return;

  if (terminal.status === "delivered") {
    await tx.execute(sql`
      UPDATE patient_device_episodes
         SET status = 'delivered', delivered_at = ${terminal.at}, updated_at = NOW()
       WHERE id = ${order.deviceEpisodeId}
         AND status NOT IN ('delivered', 'cancelled')
    `);
    return;
  }
  await tx.execute(sql`
    UPDATE patient_device_episodes
       SET status = 'cancelled', cancelled_at = ${terminal.at},
           cancel_reason = ${terminal.reason ?? null}, updated_at = NOW()
     WHERE id = ${order.deviceEpisodeId}
       AND status NOT IN ('delivered', 'cancelled')
  `);
}

/**
 * هل يملك هذا الخيط حلقةً واحدة على الأقلّ؟
 *
 * يقرأه حذفُ نوع الحالة: الحلقة **تاريخُ جهازٍ دائم**، ولا يجوز أن يمحوه
 * حذفٌ إداري للخيط — لا بالكاسكيد ولا بإعادة الإسناد.
 */
export async function caseHasEpisodes(
  tx: { execute: (q: any) => Promise<any> },
  caseId: number,
): Promise<boolean> {
  const r = await tx.execute(sql`
    SELECT 1 FROM patient_device_episodes WHERE case_id = ${caseId} LIMIT 1
  `);
  return (r.rows ?? []).length > 0;
}

/** حلقة بمعرّفها مع نوع خدمتها — للتحقّق والعرض. */
export async function getDeviceEpisode(episodeId: number): Promise<
  (DeviceEpisodeView & { patientId: number }) | null
> {
  const r = await db.execute<Record<string, any>>(sql`
    SELECT e.id, e.patient_id, e.case_id, pc.case_type AS service_type, e.sequence_number,
           e.status, e.agreed_cost, e.requested_item, e.component, e.branch_id, e.created_at, e.delivered_at,
           e.cancelled_at, e.cancel_reason
      FROM patient_device_episodes e
      JOIN patient_cases pc ON pc.id = e.case_id
     WHERE e.id = ${episodeId}
  `);
  const row = (r.rows ?? [])[0];
  return row ? { ...toView(row), patientId: Number(row.patient_id) } : null;
}
