// **التصحيحُ الإداريّ لعمليةِ جهازٍ خاطئة** — منسّقٌ واحد لا ثلاثة.
//
// ══ المبدأ ══════════════════════════════════════════════════════════════
// **الخطأُ التشغيليّ يُصحَّح بتراجعٍ مدقَّق، لا بحذفٍ مدمّر.**
//
// المالكُ لا يجوز أن تحبسه ضغطةٌ خاطئة: موظّفٌ ضغط «تم الشراء» قبل أوانه،
// أو فُتح جهازٌ كامل لمريضٍ يريد قالباً. وقبل هذا الملفّ لم يكن ثمّة مخرج —
// إلغاءُ المعاينة يُردّ لأن بيعاً وقع، وإلغاءُ الأمر لا يعكس مالاً.
//
// وليس الحلُّ تخفيفَ الحُرّاس: **تُعكَس الآثارُ بقيودٍ معاكسة، وتعود الحالةُ
// الصحيحة، ويبقى كلُّ ما وقع مقروءاً بمن فعله ومتى ولماذا.**
//
// ══ وما لا يُمَسّ أبداً ═════════════════════════════════════════════════
// **الدفعات** — نقدٌ حقيقيٌّ قُبض؛ عكسُ بيعٍ لا يمحو أن المريضَ دفع.
// **التسليم** — واقعةٌ فيزيائية؛ المريضُ يحمل الجهاز.
// **سجلُّ التصنيع** — مراحلُه وموادُّه وخبيرُه وإعادةُ عمله.
// **المعاينةُ ونسخُها وملاحقُها** — تُلغى سلطتُها بالشاهدة، ولا يُمحى نصُّها.
// **والقيدُ الأصليّ** — يبقى، ويُضاف معاكسُه. الدفترُ يقصّ ولا يُزوَّر.
//
// ══ والهويّةُ من السلسلة لا من (مريض + قسم) ════════════════════════════
// متابعة ⟶ معاينة · حلقة · أمر. فالمريضُ العائد يملك أكثر من جهاز، وتصحيحُ
// أحدها لا يجوز أن يصيب الآخر.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { isExamCancelled } from "../medical/active_exam";
import { writeExamCancellation } from "../medical/cancel_exam";
import {
  markEpisodeAdministrativelyVoid, revertEpisodeToExamined, createReplacementEpisodeTx,
  type DeviceServiceType,
} from "../device_episodes/store";
import { voidOrderAdministratively } from "../manufacturing/store";
import {
  FULL_DEVICE, requestedItemLabel, requestedItemOptions,
} from "@shared/prosthetic_parts";
import {
  FOLLOWUP_ADMIN_VOID_STATUS, REVERSAL_EVENT_TITLES, reversalCostNote,
  reversalReasonLabel, replacementSummaryLine,
  type CorrectionIntent, type ReversalMode, type ReversalPreview,
  type ReversalImpactLine,
} from "@shared/administrative_reversal";

export class ReversalError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "ReversalError";
    this.status = status;
  }
}

/** الرسالةُ الواحدة حين تتغيّر العمليةُ بين المعاينة المسبقة والتنفيذ. */
const DRIFT =
  "تغيّرت العملية منذ فتح نافذة التصحيح. حدّث الصفحة وراجع الأثر من جديد.";

const money = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US");

// ── الحلُّ: من أين تُعرَف العملية ─────────────────────────────────────────

export interface ResolvedOperation {
  patientId: number;
  patientName: string | null;
  branchId: number | null;
  followupId: number;
  followupStatus: string;
  serviceType: string;
  caseId: number | null;
  approvedPrice: number;
  medicalExamId: number | null;
  deviceEpisodeId: number | null;
  workOrderId: number | null;
  episodeStatus: string | null;
  episodeAgreedCost: number;
  episodeRequestedItem: string | null;
  /**  مسارُ العملية (ترحيل ٠٦٥) — يورّثه البديلُ كما هو، ولا يُخترَع له
   *   مسارٌ آخر: استبدالُ **ما طُلب** لا يغيّر أيحتاج الطلبُ معاينةً أم لا. */
  episodeServicePath: string | null;
  episodeVoided: boolean;
  orderStatus: string | null;
  orderStage: string | null;
  orderStartedAt: string | null;
  orderCompletedAt: string | null;
  orderVoided: boolean;
  paidAmount: number;
  existingReversalId: number | null;
  examCancelled: boolean;
}

/**
 * يقرأ السلسلةَ كاملةً من **هويّةٍ واحدة دقيقة**.
 *
 * المدخلُ متابعةٌ بعينها — وهي العقدةُ التي تربط المعاينةَ بالحلقة بالأمر.
 * ويُقبل معرّفُ أمرٍ أو حلقةٍ بدلاً منها فيُحَلّ إليها، فتفتح الشاشاتُ
 * الثلاثُ **النافذةَ نفسَها بالهويّة نفسِها**.
 */
export async function resolveOperation(
  h: any,
  target: { followupId?: number | null; workOrderId?: number | null; episodeId?: number | null },
): Promise<ResolvedOperation | null> {
  const byFollowup = target.followupId ?? null;
  const r = await h.execute(sql`
    SELECT f.id AS followup_id, f.patient_id, f.branch_id, f.status AS followup_status,
           f.service_type, f.case_id, f.approved_price, f.medical_exam_id,
           f.device_episode_id, f.converted_work_order_id,
           p.name AS patient_name,
           e.status AS episode_status, e.agreed_cost, e.requested_item, e.service_path,
           e.admin_void_reversal_id AS episode_void,
           wo.status AS order_status, wo.current_stage, wo.started_at, wo.completed_at,
           wo.admin_void_reversal_id AS order_void
      FROM post_exam_followups f
      -- **والمحذوفُ لا تُفتَح عليه نافذةُ تصحيح** (ترحيل ٠٦٨): بابُه
      -- الاستعادةُ أوّلاً، ثمّ تصحيحُ عمليته كأيّ ملفٍّ حيّ.
      JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
      LEFT JOIN patient_device_episodes e ON e.id = f.device_episode_id
      LEFT JOIN prosthetic_work_orders wo ON wo.id = f.converted_work_order_id
     WHERE ${byFollowup !== null ? sql`f.id = ${byFollowup}`
       : target.workOrderId !== null && target.workOrderId !== undefined
         ? sql`f.converted_work_order_id = ${target.workOrderId}`
         : sql`f.device_episode_id = ${target.episodeId ?? -1}`}
     ORDER BY f.id DESC
     LIMIT 1
  `);
  const row = (r.rows ?? [])[0] as any;
  if (!row) return null;

  const patientId = Number(row.patient_id);
  const episodeId = row.device_episode_id === null || row.device_episode_id === undefined
    ? null : Number(row.device_episode_id);

  //  ما قبضه المركزُ على **هذا الجهاز بعينه** — وإلّا لعُدّت دفعاتُ جهازٍ
  //  آخر للمريض نفسِه رصيداً لهذه العملية.
  const pay = episodeId === null
    ? { rows: [{ paid: 0 }] }
    : await h.execute(sql`
        SELECT COALESCE(SUM(amount), 0)::int AS paid FROM payments
         WHERE patient_id = ${patientId} AND device_episode_id = ${episodeId}
      `);
  const paidAmount = Number((pay.rows ?? [])[0]?.paid ?? 0);

  // ══ **«صُحّحت» تعني العمليةَ القائمة، لا تاريخَ المتابعة** ═════════════
  //  التفرّدُ على المتابعة مدى الحياة كان يقفل البابَ إلى الأبد: «تراجع عن
  //  الشراء» يُعيد المتابعةَ نفسَها إلى ما قبل البيع، فتُشترى بعدها بشكلٍ
  //  صحيح ويولد **أمرٌ ثانٍ**. ولو احتاج ذاك تصحيحاً لرُدّ بحجّة تصحيحٍ
  //  قديمٍ لا علاقةَ له به — **وهو نقضُ الغرض**.
  //
  //  فالسؤالُ الصحيح: هل صُحّحت **هذه الصفقةُ بعينها**؟
  //    · لها أمرُ تصنيعٍ قائم ⟶ تصحيحُ ذلك الأمر بعينه.
  //    · بلا أمر (لم تُبَع، أو عاد الشراءُ فأُبطل) ⟶ إبطالٌ كاملٌ سابق
  //      لهذه المتابعة بلا أمر — وهو الحدثُ الطرفيّ الذي يقع مرّةً.
  const currentWo = row.converted_work_order_id === null
    || row.converted_work_order_id === undefined
    ? null : Number(row.converted_work_order_id);
  const rev = currentWo !== null
    ? await h.execute(sql`
        SELECT id FROM administrative_operation_reversals
         WHERE work_order_id = ${currentWo} LIMIT 1
      `)
    : await h.execute(sql`
        SELECT id FROM administrative_operation_reversals
         WHERE followup_id = ${Number(row.followup_id)}
           AND work_order_id IS NULL
           AND mode = 'full_operation'
         LIMIT 1
      `);
  const existingReversalId = (rev.rows ?? [])[0]?.id ?? null;

  const examId = row.medical_exam_id === null || row.medical_exam_id === undefined
    ? null : Number(row.medical_exam_id);

  return {
    patientId,
    patientName: row.patient_name === null || row.patient_name === undefined
      ? null : String(row.patient_name),
    branchId: row.branch_id === null || row.branch_id === undefined
      ? null : Number(row.branch_id),
    followupId: Number(row.followup_id),
    followupStatus: String(row.followup_status),
    serviceType: String(row.service_type),
    caseId: row.case_id === null || row.case_id === undefined ? null : Number(row.case_id),
    approvedPrice: Number(row.approved_price ?? 0),
    medicalExamId: examId,
    deviceEpisodeId: episodeId,
    workOrderId: row.converted_work_order_id === null || row.converted_work_order_id === undefined
      ? null : Number(row.converted_work_order_id),
    episodeStatus: row.episode_status === null || row.episode_status === undefined
      ? null : String(row.episode_status),
    episodeAgreedCost: Number(row.agreed_cost ?? 0),
    episodeRequestedItem: row.requested_item === null || row.requested_item === undefined
      ? null : String(row.requested_item),
    episodeServicePath: row.service_path === null || row.service_path === undefined
      ? null : String(row.service_path),
    episodeVoided: row.episode_void !== null && row.episode_void !== undefined,
    orderStatus: row.order_status === null || row.order_status === undefined
      ? null : String(row.order_status),
    orderStage: row.current_stage === null || row.current_stage === undefined
      ? null : String(row.current_stage),
    orderStartedAt: row.started_at ? String(row.started_at) : null,
    orderCompletedAt: row.completed_at ? String(row.completed_at) : null,
    orderVoided: row.order_void !== null && row.order_void !== undefined,
    paidAmount,
    existingReversalId: existingReversalId === null ? null : Number(existingReversalId),
    examCancelled: examId === null ? false : await isExamCancelled(examId, h),
  };
}

/**
 * **المبلغُ الذي يُعكَس** — سعرُ هذا الجهاز بعينه لا مجموعُ المريض.
 *
 * ويُفضَّل `agreed_cost` على `approved_price`: الأول ما ثُبِّت على الحلقة
 * لحظةَ البيع فعلاً، والثاني قد يكون تحرّك بعده. والمسارُ القديم بلا حلقة
 * يقرأ الثاني.
 */
function saleAmountOf(op: ResolvedOperation): number {
  const sold = op.followupStatus === "converted" || op.workOrderId !== null;
  if (!sold) return 0;
  return op.deviceEpisodeId !== null && op.episodeAgreedCost > 0
    ? op.episodeAgreedCost : op.approvedPrice;
}

/**
 * **هل يمكن إرجاعُ هذه الصفقة إلى ما قبل الشراء حقاً؟**
 *
 * ══ ولماذا ليس كلُّ مباعٍ قابلاً للتراجع ═══════════════════════════════
 * «تراجع عن الشراء فقط» يعني حرفياً: تعود الحلقةُ `examined` وتعود المتابعةُ
 * `awaiting_patient_decision`، فيُشترى الطلبُ بعدها بشكلٍ صحيح. وجهازٌ
 * **سُلِّم فعلاً** لا يقبل ذلك: يستحيل أن يكون `examined` و`delivered` معاً،
 * ولا يجوز أن نُنكر تسليماً وقع لنُبسّط حالة. فالنتيجةُ حالٌ متناقضة.
 *
 * **ولا يُمنَع التصحيح** — يبقى «إلغاء العملية بالكامل» متاحاً بكلّ سلطته.
 * الذي يُمنَع وضعٌ يستحيل معناه، لا حقُّ المسؤول في التصحيح.
 */
function purchaseOnlyPossible(op: ResolvedOperation): boolean {
  return op.deviceEpisodeId !== null
    && op.episodeStatus === "in_manufacturing"
    && op.workOrderId !== null
    && op.orderStatus !== "completed"
    && op.orderStatus !== "cancelled"
    && !op.episodeVoided
    && !op.orderVoided;
}

/**
 * **بدائلُ الاستبدال لهذه العملية** — من التصنيف القائم، ناقصاً ما طُلب.
 *
 * والمساندُ الطبية بلا أجزاء، فقائمتُها بندٌ واحد هو المطلوبُ نفسُه ⟶
 * **بلا بديل** ⟶ لا يُعرَض «استبدال» أصلاً.
 */
function replacementOptionsOf(op: ResolvedOperation): { value: string; label: string }[] {
  const current = op.episodeRequestedItem ?? FULL_DEVICE;
  return requestedItemOptions(op.serviceType)
    .filter((x) => x.value !== current)
    .map((x) => ({ value: String(x.value), label: x.label }));
}

/**
 * **هل يقبل هذا الملفُّ طلباً بديلاً؟**
 *
 * ══ والشرطُ واحدٌ يقرؤه العرضُ والتنفيذ معاً ═══════════════════════════
 * خيارٌ تعرضه الشاشةُ ثمّ يردّه الخادمُ ليس خياراً بل فخّ: الموظّفُ يكتب
 * سبباً ويؤكّد، فيُردّ برسالةٍ لا تدلّه على شيء. فالدالّةُ واحدة، وتُنادى
 * في المعاينة المسبقة **وفي التنفيذ تحت القفل**.
 *
 * والحلقةُ شرطٌ لأن البديل يُفتَح على **خيطها** بعينه؛ والبديلُ شرطٌ لأن
 * استبدالَ شيءٍ بنفسه ليس استبدالاً؛ والملغاةُ سلفاً لا تُصحَّح مرّتين.
 */
function replacementPossible(op: ResolvedOperation): boolean {
  return op.deviceEpisodeId !== null
    && op.caseId !== null
    && !op.episodeVoided
    && op.existingReversalId === null
    && replacementOptionsOf(op).length > 0;
}

/**
 * **النوايا المتاحة — من العملية بعينها لا من قائمةٍ ثابتة.**
 *
 * `purchase_mistake` حين يمكن التراجعُ عن الشراء فعلاً · `replace_requested_item`
 * حين يوجد خيطٌ وحلقةٌ وبديل · `work_order_mistake` حين يوجد أمرُ تصنيعٍ
 * أصلاً (فلا يُقال «أُنشئ أمرٌ بالخطأ» حيث لا أمر) · و`cancel_operation`
 * البابُ الأخير الذي يبقى دائماً ما دامت العمليةُ لم تُصحَّح.
 */
function availableIntentsOf(op: ResolvedOperation): CorrectionIntent[] {
  if (op.existingReversalId !== null) return [];
  const out: CorrectionIntent[] = [];
  if (purchaseOnlyPossible(op)) out.push("purchase_mistake");
  if (replacementPossible(op)) out.push("replace_requested_item");
  if (op.workOrderId !== null && !op.orderVoided) out.push("work_order_mistake");
  out.push("cancel_operation");
  return out;
}

// ── المعاينةُ المسبقة ────────────────────────────────────────────────────

/**
 * **ما سيقع، قبل أن يقع.** ولا تُترك الشاشةُ تستنتجه.
 *
 * الاستنتاجُ في الواجهة يعني قاعدتين للأثر: واحدةٌ تُعرَض وأخرى تُنفَّذ،
 * وانحرافُهما مسألةُ وقت. فالخادمُ يقول ماذا سيتغيّر، والشاشةُ تعرضه حرفياً.
 *
 * **وهي استشاريةٌ لا سلطة**: التنفيذُ يعيد القراءةَ تحت القفل ويقارن الختم.
 */
export async function previewReversal(target: {
  followupId?: number | null; workOrderId?: number | null; episodeId?: number | null;
}): Promise<ReversalPreview | null> {
  const op = await resolveOperation(db, target);
  if (!op) return null;

  const sale = saleAmountOf(op);
  const sold = sale > 0 || op.followupStatus === "converted" || op.workOrderId !== null;
  const delivered = op.episodeStatus === "delivered" || op.orderStatus === "completed";
  const started = op.orderStartedAt !== null
    || (op.orderStage !== null && op.orderStatus !== null && op.orderStatus !== "cancelled");
  const alreadyReversed = op.existingReversalId !== null;

  const itemLabel = op.episodeRequestedItem
    ? requestedItemLabel(op.episodeRequestedItem, op.serviceType) : null;

  //  **الوضعان لا يُعرَضان دائماً**: «تراجع عن الشراء» بلا بيعٍ لا معنى له،
  //  ولا يُعرَض لجهازٍ سُلِّم — فذاك وضعٌ يستحيل معناه لا خيارٌ يُخفى.
  const availableModes: ReversalMode[] = alreadyReversed ? []
    : sold && purchaseOnlyPossible(op) ? ["purchase_only", "full_operation"]
      : ["full_operation"];

  const financeLines = (): ReversalImpactLine[] => {
    const out: ReversalImpactLine[] = [];
    if (sale > 0) {
      out.push({ kind: "check", text: `عكس كلفة ${money(sale)} د.ع بقيد معاكس` });
      out.push({ kind: "check", text: "تُخصم من إجمالي حساب المريض وكلفة القسم" });
    }
    if (op.paidAmount > 0) {
      out.push({
        kind: "warn",
        text: `توجد دفعة مسجلة بقيمة ${money(op.paidAmount)} د.ع. لم تُحذف.`
          + " أصبح للمريض رصيد يحتاج تسوية مالية.",
      });
    }
    return out;
  };

  const orderLine = (): ReversalImpactLine[] => {
    if (op.workOrderId === null) return [];
    const out: ReversalImpactLine[] = [
      { kind: "check", text: `إلغاء أمر التصنيع #${op.workOrderId} إدارياً` },
    ];
    if (delivered) {
      out.push({
        kind: "warn",
        text: "هذا الجهاز مسجَّل كمسلَّم؛ يبقى سجل التسليم كما هو ولا يُعاد كتابته.",
      });
    } else if (started) {
      out.push({
        kind: "warn",
        text: "بدأ العمل على هذا الأمر؛ سيُلغى إدارياً مع بقاء سجل التنفيذ.",
      });
    }
    return out;
  };

  const impact: Record<ReversalMode, ReversalImpactLine[]> = {
    purchase_only: [
      ...orderLine(),
      ...financeLines(),
      { kind: "check", text: "إعادة الطلب إلى «بانتظار قرار المريض»" },
      ...(op.deviceEpisodeId !== null && !delivered
        ? [{ kind: "check" as const, text: "إعادة طلب الجهاز إلى «مُعايَنة» ليُشترى لاحقاً بشكل صحيح" }]
        : []),
      { kind: "check", text: "إبقاء المعاينة فعّالة كما هي" },
    ],
    full_operation: [
      ...orderLine(),
      ...financeLines(),
      { kind: "check", text: "إلغاء طلب الجهاز الخاطئ" },
      ...(op.medicalExamId !== null
        ? [{ kind: "check" as const, text: "إلغاء المعاينة من السجل الفعّال" }]
        : []),
      { kind: "check", text: "الاحتفاظ بجميع السجلات في التاريخ" },
      { kind: "check", text: "إتاحة بدء الطلب الصحيح فوراً" },
    ],
  };

  //  ══ **الملخّصُ القصير — ما يُقرأ فعلاً قبل التأكيد** ══════════════════
  //   التفصيلُ الكامل يُطوى تحت «تفاصيل ما سيحدث»، لكن المسارَ المؤسّسيّ
  //   يبقى: يُعرَض الأثر ⟶ يُقرأ ⟶ يُنفَّذ **ذلك الأثرُ بعينه** بختمه.
  //   وثلاثةُ أسطرٍ تُقرأ خيرٌ من خمسةَ عشرَ لا تُقرأ.
  const summary: Record<ReversalMode, ReversalImpactLine[]> = {
    purchase_only: [
      { kind: "check", text: "إلغاء الشراء وأمر التصنيع الخاطئ" },
      ...(sale > 0 ? [{ kind: "check" as const, text: `عكس كلفة ${money(sale)} د.ع` }] : []),
      { kind: "check", text: "إعادة الطلب والمعاينة إلى ما قبل الشراء" },
      { kind: "check", text: "الاحتفاظ بكامل السجل السابق" },
      ...(op.paidAmount > 0 && sale > 0
        ? [{ kind: "warn" as const, text: "تبقى الدفعة كما هي — للمريض رصيد يحتاج تسوية" }]
        : []),
    ],
    full_operation: [
      { kind: "check", text: "إلغاء العملية الخاطئة بالكامل" },
      ...(sale > 0 ? [{ kind: "check" as const, text: `عكس كلفة ${money(sale)} د.ع` }] : []),
      { kind: "check", text: "الاحتفاظ بكامل السجل السابق" },
      ...(op.paidAmount > 0 && sale > 0
        ? [{ kind: "warn" as const, text: "تبقى الدفعة كما هي — للمريض رصيد يحتاج تسوية" }]
        : []),
    ],
  };

  return {
    patientId: op.patientId,
    patientName: op.patientName,
    followupId: op.followupId,
    medicalExamId: op.medicalExamId,
    deviceEpisodeId: op.deviceEpisodeId,
    workOrderId: op.workOrderId,
    serviceType: op.serviceType,
    requestedItemLabel: itemLabel,
    saleAmount: sale,
    paidAmount: op.paidAmount,
    financialDelta: -sale,
    requiresFinancialSettlement: op.paidAmount > 0 && sale > 0,
    availableModes,
    //  **الخادمُ يقرّر ما يُعرَض** — بالدالّة نفسِها التي تحرس التنفيذ.
    availableIntents: availableIntentsOf(op),
    requestedItem: op.episodeRequestedItem,
    replacementOptions: replacementPossible(op) ? replacementOptionsOf(op) : [],
    impact,
    summary,
    replacementImpact: [
      { kind: "check", text: "فتح طلب جهاز أو جزء جديد بكلفة صفر، بانتظار المعاينة" },
      { kind: "check", text: "بدء الطلب الجديد بلا شراء ولا أمر تصنيع" },
      { kind: "check", text: "عدم نسخ الدفعة أو الخصم أو الخبير أو المعاينة القديمة" },
    ],
    currentStatusText: alreadyReversed ? "ملغاة إدارياً"
      : sold ? "تم الشراء — بدأ التصنيع" : "طلب قائم لم يُشترَ بعد",
    manufacturingStarted: started,
    delivered,
    alreadyReversed,
    stateStamp: stampOf(op),
  };
}

/**
 * **ختمُ الحالة** — كلُّ ما لو تغيّر لبطل الأثرُ المعروض.
 *
 * ولا يشمل أختاماً زمنية تتحرّك بلا معنى (`updated_at`): ختمٌ يتغيّر بلا
 * سببٍ يُنتج ٤٠٩ لا يفهمها أحد، فيتعلّم الموظّفُ تجاهلَ الرسالة.
 */
function stampOf(op: ResolvedOperation): string {
  return [
    op.followupId, op.followupStatus, op.approvedPrice,
    op.deviceEpisodeId ?? "-", op.episodeStatus ?? "-", op.episodeAgreedCost,
    op.workOrderId ?? "-", op.orderStatus ?? "-",
    op.paidAmount, op.existingReversalId ?? "-",
  ].join("|");
}

// ── التنفيذ ──────────────────────────────────────────────────────────────

export interface ReversalOutcome {
  reversalId: number;
  mode: ReversalMode;
  patientId: number;
  financialDelta: number;
  requiresFinancialSettlement: boolean;
  preservedPaidAmount: number;
  workOrderVoided: number | null;
  episodeId: number | null;
  examCancelled: number | null;
  replacementEpisodeId: number | null;
}

/**
 * **التصحيحُ كلُّه معاملةٌ واحدة** — أو لا يقع منه شيء.
 *
 * والترتيبُ مقصود: **تُعكَس العواقبُ التجارية أوّلاً ثمّ تُسحَب السلطةُ
 * السريرية**. فلو سقطت أيُّ كتابةٍ بقي الملفُّ على حاله الأول المتّسق، ولم
 * تبقَ لحظةٌ تكون فيها المعاينةُ ملغاةً والمالُ قائماً.
 */
/**
 * سياقُ الإذن كما يصل من الجلسة الموقَّعة — **يُفحَص داخل المعاملة**.
 *
 * ولا يُقبل `branchId` من الطلب ولا من المعاينة المسبقة: الفحصُ قبل فتح
 * المعاملة نافذةٌ مفتوحة (TOCTOU) — قد يُنقَل المريضُ إلى فرعٍ آخر بينهما،
 * فيصحّح مديرُ فرعٍ عمليةً لم تعد في نطاقه. فالنطاقُ يُقرأ من صفّ المريض
 * **تحت القفل** ويُقارَن بنطاق الجلسة الحيّ.
 */
export interface ReversalAuthz {
  isAdmin: boolean;
  role: string;
  /** الفروعُ التي تخوّلها الجلسةُ فعلاً. */
  scope: number[];
}

export async function executeReversal(params: {
  target: { followupId?: number | null; workOrderId?: number | null; episodeId?: number | null };
  mode: ReversalMode;
  reasonCode: string;
  reasonNote: string;
  /** ختمُ المعاينة المسبقة — **إلزاميّ**، ويُقارَن تحت القفل. */
  expectedStamp: string;
  authz: ReversalAuthz;
  actor: { userId: number | null; userName: string | null };
  audit?: { ipAddress?: string | null; userAgent?: string | null };
  replacementRequestedItem?: string | null;
}): Promise<ReversalOutcome> {
  const reasonNote = String(params.reasonNote ?? "").trim();
  if (!reasonNote) throw new ReversalError("اكتب سبب التصحيح", 400);
  // ══ **الأثرُ يُراجَع قبل التنفيذ — عقدٌ لا تحسين** ═══════════════════
  //  المسارُ المؤسّسيّ: يُعرَض الأثر ⟶ يقرؤه المسؤول ⟶ ينفّذ **ذلك الأثر
  //  بعينه**. وطلبٌ مصنوعٌ بلا ختمٍ يتخطّى المراجعةَ كلَّها ويُبطل عمليةً
  //  بمالها بضغطةٍ واحدة عمياء.
  if (typeof params.expectedStamp !== "string" || params.expectedStamp.trim() === "") {
    throw new ReversalError("أعد فتح نافذة التصحيح لمراجعة الأثر قبل التنفيذ", 400);
  }

  return await db.transaction(async (tx) => {
    // ── ① القفلُ على المتابعة — نقطةُ التسلسل الوحيدة ──────────────────
    const lock = await tx.execute(sql`
      SELECT id FROM post_exam_followups
       WHERE id = ${params.target.followupId ?? -1}
          OR converted_work_order_id = ${params.target.workOrderId ?? -1}
          OR device_episode_id = ${params.target.episodeId ?? -1}
       ORDER BY id DESC LIMIT 1
       FOR UPDATE
    `);
    if ((lock.rows ?? []).length === 0) {
      throw new ReversalError("العملية غير موجودة", 404);
    }
    const followupId = Number((lock.rows ?? [])[0].id);

    // ── ② القراءةُ تحت القفل — والختمُ يُقارَن ─────────────────────────
    const op = await resolveOperation(tx, { followupId });
    if (!op) throw new ReversalError("العملية غير موجودة", 404);

    // ── ②-ب **الإذنُ يُعاد فحصُه تحت القفل** ───────────────────────────
    //  الفحصُ في النقطة قبل المعاملة نافذةٌ مفتوحة: قد يُنقَل المريضُ إلى
    //  فرعٍ آخر بين المعاينة والتنفيذ، فيُبطل مديرُ فرعٍ عمليةً لم تعد في
    //  نطاقه. والفرعُ يُقرأ من **صفّ المريض المقفول** لا من الطلب ولا من
    //  لقطةٍ بائتة.
    const br = await tx.execute(sql`
      SELECT branch_id, deleted_at FROM patients WHERE id = ${op.patientId} FOR UPDATE
    `);
    const liveBranch = (br.rows ?? [])[0]?.branch_id ?? null;
    //  **وحُذف الملفُّ بين المعاينة والتنفيذ** ⟶ لا كتابةَ ولا نصفُ تصحيح.
    if ((br.rows ?? [])[0]?.deleted_at) throw new ReversalError(PATIENT_IN_TRASH_ERROR, 409);
    if (!params.authz.isAdmin) {
      if (params.authz.role !== "branch_manager") {
        throw new ReversalError(
          "تصحيح العمليات صلاحية إدارية — للمسؤول العام أو مدير الفرع فقط", 403);
      }
      if (liveBranch !== null && !params.authz.scope.includes(Number(liveBranch))) {
        throw new ReversalError("لا يمكنك تصحيح عملية في فرع آخر", 403);
      }
    }
    if (op.existingReversalId !== null) {
      throw new ReversalError("هذه العملية ملغاة إدارياً بالفعل", 409);
    }
    if (params.expectedStamp !== stampOf(op)) throw new ReversalError(DRIFT, 409);

    // ══ **الاستبدالُ يُفحَص قبل أن تُكتب كلمة** ══════════════════════════
    //  والشرطُ هو `replacementPossible` نفسُه الذي قرّر ما تعرضه الشاشة —
    //  فلا يُعرَض خيارٌ يُردّ، ولا يُقبَل طلبٌ ملفَّق لم يُعرَض.
    const replacementItem = params.replacementRequestedItem ?? null;
    if (replacementItem !== null) {
      if (params.mode !== "full_operation") {
        throw new ReversalError(
          "الاستبدال يقتضي إلغاء العملية الحالية بالكامل", 409,
        );
      }
      if (!replacementPossible(op)) {
        throw new ReversalError("لا يمكن فتح طلب بديل لهذه العملية", 409);
      }
      if (!replacementOptionsOf(op).some((x) => x.value === replacementItem)) {
        throw new ReversalError(
          "الطلب الصحيح غير صالح لهذه الخدمة أو مطابقٌ للطلب الحالي", 400,
        );
      }
    }

    const sale = saleAmountOf(op);
    const sold = sale > 0 || op.followupStatus === "converted" || op.workOrderId !== null;
    if (params.mode === "purchase_only") {
      if (!sold) {
        throw new ReversalError(
          "لا يوجد شراء مسجَّل على هذه العملية — استخدم «إلغاء العملية بالكامل»", 409,
        );
      }
      //  **والخادمُ يفرضها ولو لم تعرضها الشاشة**: طلبٌ مصنوعٌ بيدٍ يطلب
      //  «تراجعاً عن الشراء» لجهازٍ سُلِّم يُردّ — لا يُنفَّذ نصفُه.
      if (!purchaseOnlyPossible(op)) {
        throw new ReversalError(
          "لا يمكن التراجع عن الشراء لهذه العملية — الجهاز سُلّم أو انتهى أمره."
          + " استخدم «إلغاء العملية بالكامل».", 409,
        );
      }
    }

    // ── ③ صفُّ التصحيح أوّلاً: كلُّ ما يلي يحمل هويّتَه ──────────────────
    //  والفهرسُ الفريد على `followup_id` هو حارسُ الضغطة المزدوجة: الثانية
    //  تصطدم به فتُردّ — يحسمه صفُّ القاعدة لا ترتيبُ الشيفرة.
    let reversalId: number;
    try {
      const ins = await tx.execute(sql`
        INSERT INTO administrative_operation_reversals
          (patient_id, branch_id, medical_exam_id, followup_id, device_episode_id,
           work_order_id, mode, reason_code, reason_note, financial_delta,
           requires_financial_settlement, preserved_paid_amount,
           created_by, created_by_name)
        VALUES (${op.patientId}, ${op.branchId}, ${op.medicalExamId}, ${op.followupId},
                ${op.deviceEpisodeId}, ${op.workOrderId}, ${params.mode},
                ${params.reasonCode}, ${reasonNote}, ${-sale},
                ${op.paidAmount > 0 && sale > 0}, ${op.paidAmount},
                ${params.actor.userId}, ${params.actor.userName})
        RETURNING id
      `);
      reversalId = Number((ins.rows ?? [])[0].id);
    } catch (e: any) {
      if (String(e?.code) === "23505") {
        throw new ReversalError("هذه العملية ملغاة إدارياً بالفعل", 409);
      }
      throw e;
    }

    // ── ④ إبطالُ أمر التصنيع — بلا مسّ تاريخه ──────────────────────────
    let workOrderVoided: number | null = null;
    if (op.workOrderId !== null) {
      const voided = await voidOrderAdministratively(tx, {
        orderId: op.workOrderId, reversalId, reason: reasonNote,
        performedBy: params.actor.userId,
      });
      //  **والنتيجةُ تُقرأ لا تُهمَل**: القفلُ يقرأ الصفَّ الحيّ، فإن كان
      //  الأمرُ قد انتهى بين المعاينة والقفل فـ«التراجع عن الشراء» صار
      //  مستحيلاً — ولا يُنفَّذ نصفُه بل تُرجَع المعاملةُ كلُّها.
      if (params.mode === "purchase_only" && voided.wasTerminal) {
        throw new ReversalError(DRIFT, 409);
      }
      workOrderVoided = op.workOrderId;
    }

    // ── ⑤ عكسُ الكلفة — قيدٌ معاكسٌ يُضاف، والأصلُ لا يُمَسّ ────────────
    if (sale > 0) {
      if (op.caseId !== null) {
        await tx.execute(sql`
          UPDATE patient_cases
             SET cost = GREATEST(0, COALESCE(cost, 0) - ${sale}), updated_at = NOW()
           WHERE id = ${op.caseId}
        `);
      }
      await tx.execute(sql`
        UPDATE patients
           SET total_cost = GREATEST(0, COALESCE(total_cost, 0) - ${sale})
         WHERE id = ${op.patientId}
      `);
      await tx.execute(sql`
        INSERT INTO cost_entries
          (patient_id, branch_id, amount, source, case_id, device_episode_id, notes)
        VALUES (${op.patientId}, ${op.branchId}, ${-sale}, 'administrative_reversal',
                ${op.caseId}, ${op.deviceEpisodeId},
                ${reversalCostNote(reversalId, params.mode)})
      `);
    }

    // ── ⑥ الحلقةُ والمتابعة — بحسب الوضع ───────────────────────────────
    if (params.mode === "purchase_only") {
      //  الطلبُ باقٍ والمعاينةُ فعّالة؛ الذي بطل هو الشراء وحده.
      //
      //  **والنتيجةُ تُقرأ**: الدالّة تشترط `in_manufacturing` في `WHERE`،
      //  فـ`false` تعني أن الحلقةَ تغيّرت بين المعاينة والقفل. وتجاهلُها كان
      //  سيُنتج نصفَ تصحيح: مالٌ عاد ومتابعةٌ رجعت، وحلقةٌ ما زالت مباعة.
      if (op.deviceEpisodeId === null) throw new ReversalError(DRIFT, 409);
      const reverted = await revertEpisodeToExamined(tx, op.deviceEpisodeId);
      if (!reverted) throw new ReversalError(DRIFT, 409);
      const back = await tx.execute(sql`
        UPDATE post_exam_followups
           SET status = 'awaiting_patient_decision',
               converted_at = NULL, converted_work_order_id = NULL,
               updated_at = NOW()
         WHERE id = ${op.followupId} AND status = ${op.followupStatus}
        RETURNING id
      `);
      if ((back.rows ?? []).length === 0) throw new ReversalError(DRIFT, 409);
    } else {
      if (op.deviceEpisodeId !== null) {
        await markEpisodeAdministrativelyVoid(tx, {
          episodeId: op.deviceEpisodeId, reversalId,
          reason: `إلغاء إداري للعملية — ${reasonNote}`,
        });
      }
      const closed = await tx.execute(sql`
        UPDATE post_exam_followups
           SET status = ${FOLLOWUP_ADMIN_VOID_STATUS}, closed_at = NOW(),
               closed_reason = 'admin_void', updated_at = NOW()
         WHERE id = ${op.followupId} AND status = ${op.followupStatus}
        RETURNING id
      `);
      if ((closed.rows ?? []).length === 0) throw new ReversalError(DRIFT, 409);
    }

    // ── ⑥-ب **الطلبُ البديل — بالطبقة القانونية للحلقات لا بـSQL هنا** ──
    //
    //  للحلقة ثوابتُ دقيقة (شراءٌ مفتوحٌ واحد لكلّ خيط، وتسلسلٌ لا يتكرّر،
    //  وجزءٌ يلازم نوعَ الخدمة، وأمرُ بناءٍ قديمٍ يمنع فتحَ ثانٍ). وكتابتُها
    //  من هنا كانت تتخطّاها كلَّها — **وتُسقط الحارسَ المعماريّ** الذي يحصر
    //  SQL الحلقات في ملفّها.
    //
    //  **وبعد الإبطال لا قبله**: الحارسُ يرفض فتحَ بديلٍ فوق حلقةٍ مفتوحة،
    //  وهو الترتيبُ الصحيح لا مجرّد ترتيب.
    //
    //  **والفشلُ هنا يُرجع كلَّ شيء**: `DeviceEpisodeError` ترتفع من داخل
    //  المعاملة، فيسقط صفُّ التصحيح والقيدُ المعاكس وإبطالُ الأمر وإغلاقُ
    //  المتابعة معاً — ولا نصفُ تصحيح.
    let replacementEpisodeId: number | null = null;
    if (replacementItem !== null && op.caseId !== null) {
      const created = await createReplacementEpisodeTx(tx, {
        patientId: op.patientId,
        caseId: op.caseId,
        serviceType: op.serviceType as DeviceServiceType,
        requestedItem: replacementItem,
        //  **البديلُ يرث مسارَ الأصل**: التصحيحُ يبدّل ما طُلب، ولا يقول
        //  شيئاً عن حاجة الطلب إلى معاينة. والأصلُ بلا مسار (حلقةُ ما قبل
        //  ٠٦٥) يورّث `null` فيُقرأ بالقاعدة القديمة كما كان.
        servicePath: op.episodeServicePath,
        createdBy: params.actor.userId,
      });
      replacementEpisodeId = created.id;
    }

    // ── ⑦ حدثُ المتابعة — يقرؤه الجميع بلا مفتاحٍ خام ──────────────────
    await tx.execute(sql`
      INSERT INTO post_exam_followup_events
        (followup_id, patient_id, branch_id, event_type, from_status, to_status,
         reason, note, payload, actor_user_id, actor_name)
      VALUES (${op.followupId}, ${op.patientId}, ${op.branchId},
              'administrative_reversal', ${op.followupStatus},
              ${params.mode === "purchase_only" ? "awaiting_patient_decision"
                : FOLLOWUP_ADMIN_VOID_STATUS},
              ${params.reasonCode}, ${reasonNote},
              ${JSON.stringify({
                reversalId, mode: params.mode,
                reversedAmount: sale, workOrderId: op.workOrderId,
                deviceEpisodeId: op.deviceEpisodeId,
                preservedPaidAmount: op.paidAmount,
                requiresFinancialSettlement: op.paidAmount > 0 && sale > 0,
                replacementEpisodeId, replacementRequestedItem: replacementItem,
                //  **ما يقرؤه الموظّف يُشتقّ من هذين لا من رقمٍ داخليّ**:
                //  «رقم الحلقة ٨٨» لا يعني شيئاً لأحد، و«الطلب الجديد: قالب»
                //  يعني كلَّ شيء. والمفاتيحُ الداخلية تبقى للتدقيق.
                previousRequestedItem: op.episodeRequestedItem ?? FULL_DEVICE,
                serviceType: op.serviceType,
                setByName: params.actor.userName,
              })}::jsonb,
              ${params.actor.userId}, ${params.actor.userName})
    `);

    // ── ⑧ سحبُ السلطة السريرية — **بعد** عكس آثارها التجارية ───────────
    let examCancelled: number | null = null;
    if (params.mode === "full_operation" && op.medicalExamId !== null && !op.examCancelled) {
      await writeExamCancellation(tx, {
        examId: op.medicalExamId, patientId: op.patientId, branchId: op.branchId,
        reason: `إلغاء إداري للعملية — ${reasonNote}`,
        actor: params.actor,
      });
      examCancelled = op.medicalExamId;
    }

    // ── ⑨ التدقيق، بالمعاملة نفسها ─────────────────────────────────────
    await logAudit({
      entityType: "administrative_operation_reversal", entityId: reversalId,
      action: "create",
      userId: params.actor.userId, userName: params.actor.userName,
      branchId: op.branchId,
      oldValues: {
        followupStatus: op.followupStatus, episodeStatus: op.episodeStatus,
        orderStatus: op.orderStatus, saleAmount: sale,
      },
      newValues: {
        mode: params.mode, reasonCode: params.reasonCode, reasonNote,
        financialDelta: -sale, workOrderVoided,
        deviceEpisodeId: op.deviceEpisodeId, examCancelled,
        preservedPaidAmount: op.paidAmount,
        replacementEpisodeId, replacementRequestedItem: replacementItem,
      },
      ipAddress: params.audit?.ipAddress ?? null,
      userAgent: params.audit?.userAgent ?? null,
      notes: `${REVERSAL_EVENT_TITLES[params.mode]} #${reversalId}`
        + ` لمريض #${op.patientId} — ${reversalReasonLabel(params.reasonCode)}: ${reasonNote}`
        + (sale > 0 ? ` · عُكست كلفة ${money(sale)} د.ع` : "")
        + (op.paidAmount > 0 ? ` · دفعة ${money(op.paidAmount)} د.ع محفوظة وتحتاج تسوية` : "")
        //  **والسطرُ يقول ماذا فُتح، لا رقمَ حلقةٍ داخليّاً وحده.**
        + (replacementItem !== null
          ? ` · ${replacementSummaryLine(
            requestedItemLabel(replacementItem, op.serviceType)).text} (#${replacementEpisodeId})`
          : ""),
      tx,
    });

    return {
      reversalId, mode: params.mode, patientId: op.patientId,
      financialDelta: -sale,
      requiresFinancialSettlement: op.paidAmount > 0 && sale > 0,
      preservedPaidAmount: op.paidAmount,
      workOrderVoided, episodeId: op.deviceEpisodeId, examCancelled, replacementEpisodeId,
    };
  });
}
