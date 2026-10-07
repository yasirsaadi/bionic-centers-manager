// **إلغاءُ أمر صيانةٍ أو بيعِ جزءٍ «بلا معاينة»** — طلبُ المالك ٢٠٢٦-٠٩-٣٠ (واقعةُ دموع جاسم عطية).
//
// زرُّ «تصحيح / إلغاء العملية» يظهر على كلّ أمر عمل، والتصحيحُ الإداريّ (`store.ts`) مبنيٌّ على متابعة ما بعد
// المعاينة (`post_exam_followups`) — وأمرُ الصيانة وأمرُ بيع الجزء لا متابعةَ لهما، فكان يُجاب «العملية غير
// موجودة». وهذا بابُهما: **إلغاءٌ كامل يعكس ما أنشأه الأمرُ من مال** — بنفس الكُتّاب القانونيين وفي معاملةٍ واحدة:
// صفُّ التصحيح (`administrative_operation_reversals`، وفهرسُ `uq_aor_work_order_once` يمنع الإلغاءَ مرّتين) ⟵
// إبطالُ الأمر (`voidOrderAdministratively`) ⟵ قيدُ كلفةٍ معاكس ⟵ ردُّ المقبوض (`recordRefundPaymentTx`) ⟵
// ولبيع الجزء إبطالُ حلقته (`markEpisodeAdministrativelyVoid`) ⟵ سطرُ تدقيق.
//
// **ومن أين يُعرَف المال** — لكلٍّ مصدرُه الموثوق:
// - **بيعُ الجزء** يفتح حلقةً خاصّةً به (`service_path = 'no_exam'`)، فكلفتُه ومقبوضُه مجموعُ ما على حلقته.
// - **الصيانة** تعمل على حلقة الجهاز المُصان (وقد تتعدّد صياناتُه)، فلا يُجمَع على الحلقة: الكلفةُ هي
//   `maintenance_final_price` على الأمر نفسِه، والمقبوضُ هو الدفعةُ التي سجّلها سطرُ تدقيق العملية
//   (`no_exam_operation` ⟵ `paymentId`) — الرابطُ الوحيد بين الأمر ودفعته. **والحلقةُ المُصانة لا تُمَسّ.**
//   وأمرٌ قديمٌ بلا سعرٍ مسجَّل يُلغى ولا يُعكَس له مال، ويُقال ذلك صراحةً.
//
// **وأمرُ تصنيعِ جهازٍ بلا متابعة** (البند ٣٢، §4.ar — ٢٠٢٦-١٠-٠١): مريضٌ قديمٌ فُتح له «تخصيص الطرف» بلا مسار
// المعاينة، فلا متابعةَ ولا صيانةَ ولا جزء — وكان يجاب «العملية غير موجودة» فيبقى الأمرُ مفتوحاً والسعرُ ديناً.
// - **بحلقة**: مالُه ما على حلقته — بلا أجور الصيانة (`source = 'maintenance'`) ولا دفعاتها (من سطر تدقيقها) —
//   والحلقةُ تُبطَل كحلقة الجزء.
// - **بلا حلقة** (المسار الموروث): الكلفةُ قيودُ `assign_manufacturing` **التي كُتبت في معاملة الأمر نفسِها** —
//   `now()` واحدةٌ للمعاملة، فختمُ القيد يساوي ختمَ الأمر حرفاً، ولا قيدَ لأمرٍ آخر يطابقه. **والمقبوضُ لا رابطَ له**
//   بالأمر في هذا المسار، فلا يُردّ آلياً ويُقال ذلك صراحةً: يبقى في حساب المريض، ويُردّ يدوياً إن لزم.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { logAudit } from "../accounting/ledger";
import { PATIENT_IN_TRASH_ERROR } from "@shared/patient_trash";
import { markEpisodeAdministrativelyVoid } from "../device_episodes/store";
import { voidOrderAdministratively } from "../manufacturing/store";
import { recordRefundPaymentTx } from "../accounting/refund_payment";
import { CLOSURE_PAYMENT_TAG } from "@shared/case_closure";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import {
  REVERSAL_EVENT_TITLES, reversalCostNote, reversalReasonLabel,
  REFUND_ANSWER_REQUIRED_ERROR, REFUND_NOT_DONE_ERROR,
  isRefundAnswer, refundQuestionRequired, reversalRefundPaymentNote,
  type ReversalPreview, type ReversalImpactLine,
} from "@shared/administrative_reversal";
import { ReversalError, type ReversalAuthz, type ReversalOutcome } from "./store";
import { hasRole } from "@shared/user_roles";

const DRIFT =
  "تغيّرت حالة هذه العملية منذ فتح نافذة التصحيح — أعد فتحها لمراجعة الأثر الجديد";
const money = (n: number) => Math.round(Number(n) || 0).toLocaleString("en-US");

type Kind = "maintenance" | "component_sale" | "device_build";

interface NoExamOrder {
  kind: Kind;
  orderId: number;
  patientId: number;
  patientName: string | null;
  branchId: number | null;
  serviceType: string;
  orderStatus: string;
  orderStage: string | null;
  orderStartedAt: string | null;
  existingReversalId: number | null;
  /** بيعُ الجزء: حلقتُه الخاصّة (تُبطَل). الصيانة: `null` — حلقةُ الجهاز المُصان لا تُمَسّ. */
  ownEpisodeId: number | null;
  itemLabel: string | null;
  caseId: number | null;
  /** ما يُعكَس من الكلفة — وقد يكون صفراً (ضمان · مجّاني · أمرٌ قديمٌ بلا سعر). */
  cost: number;
  /** أمرُ صيانةٍ قديم بلا سعرٍ مسجَّل وليس ضماناً — الكلفةُ غير معروفة. */
  costUnknown: boolean;
  paid: number;
  /** الدفعةُ المقبوضةُ للصيانة (للفرع والقسم والحلقة التي يُسجَّل عليها الردّ). */
  payment: { id: number; branchId: number | null; caseId: number | null; episodeId: number | null } | null;
  /** أمرُ تصنيعٍ موروثٌ بلا حلقة: ما دفعه المريضُ لا يرتبط بالأمر، فلا يُعرَف ولا يُردّ آلياً. */
  paidUntracked?: boolean;
  /** للجهاز أمرُ بناءٍ آخرُ قائم — مالُ الحلقة لا ينفصل، فيُلغى هذا الأمرُ وحده بلا مالٍ ولا مساسٍ بالحلقة. */
  sharedEpisode?: boolean;
}

/** معرّفُ الدفعة التي سجّلها سطرُ تدقيق عملية «بلا معاينة» — الرابطُ الوحيد بين الأمر ودفعته. */
function paymentIdOfAudit(newValues: unknown): number | null {
  try {
    return num(JSON.parse(String(newValues ?? "{}"))?.paymentId);
  } catch { return null; }
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v);

/**
 * **أمرُ عملٍ «بلا معاينة» بعينه** — أو `null` إن كان أمراً يحكمه التصحيحُ القائم (له متابعة) أو ليس صيانةً
 * ولا بيعَ جزء. `h` معاملةٌ أو القاعدة، و`lock` يقفل صفَّ الأمر.
 */
export async function resolveNoExamOrder(h: any, orderId: number, lock = false): Promise<NoExamOrder | null> {
  const r = await h.execute(sql`
    SELECT wo.id, wo.patient_id, wo.branch_id, wo.service_type, wo.purpose, wo.status,
           wo.current_stage, wo.started_at, wo.admin_void_reversal_id, wo.device_episode_id,
           wo.maintenance_final_price, wo.maintenance_under_warranty, wo.maintenance_component,
           p.name AS patient_name,
           e.service_path, e.requested_item
      FROM prosthetic_work_orders wo
      JOIN patients p ON p.id = wo.patient_id AND p.deleted_at IS NULL
      LEFT JOIN patient_device_episodes e ON e.id = wo.device_episode_id
     WHERE wo.id = ${orderId}
       AND NOT EXISTS (SELECT 1 FROM post_exam_followups f WHERE f.converted_work_order_id = wo.id)
     ${lock ? sql`FOR UPDATE OF wo` : sql``}
  `);
  const row = (r.rows ?? [])[0] as any;
  if (!row) return null;

  const patientId = Number(row.patient_id);
  const serviceType = String(row.service_type);
  const kase = await h.execute(sql`
    SELECT id FROM patient_cases WHERE patient_id = ${patientId} AND case_type = ${serviceType}
     ORDER BY id LIMIT 1
  `);
  const caseId = num((kase.rows ?? [])[0]?.id);

  const base = {
    orderId: Number(row.id), patientId, patientName: row.patient_name ?? null,
    branchId: num(row.branch_id), serviceType, orderStatus: String(row.status),
    orderStage: row.current_stage ?? null,
    orderStartedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    existingReversalId: num(row.admin_void_reversal_id), caseId,
  };

  if (row.purpose === "maintenance") {
    const finalPrice = num(row.maintenance_final_price);
    //  الدفعةُ من سطر تدقيق العملية — الرابطُ الوحيد بين أمر الصيانة ودفعته.
    const link = await h.execute(sql`
      SELECT new_values FROM audit_log
       WHERE entity_type = 'no_exam_operation' AND entity_id = ${base.orderId} AND action = 'create'
       ORDER BY id LIMIT 1
    `);
    const paymentId = paymentIdOfAudit((link.rows ?? [])[0]?.new_values);
    let payment: NoExamOrder["payment"] = null;
    let paid = 0;
    if (paymentId !== null) {
      const pr = await h.execute(sql`
        SELECT id, amount, branch_id, case_id, device_episode_id FROM payments
         WHERE id = ${paymentId} AND patient_id = ${patientId}
      `);
      const p = (pr.rows ?? [])[0] as any;
      if (p && Number(p.amount) > 0) {
        paid = Number(p.amount);
        payment = {
          id: Number(p.id), branchId: num(p.branch_id), caseId: num(p.case_id), episodeId: num(p.device_episode_id),
        };
      }
    }
    return {
      ...base, kind: "maintenance", ownEpisodeId: null,
      itemLabel: row.maintenance_component
        ? `صيانة ${requestedItemLabel(row.maintenance_component, serviceType)}` : "صيانة",
      cost: finalPrice !== null && finalPrice > 0 ? finalPrice : 0,
      costUnknown: finalPrice === null && row.maintenance_under_warranty !== true,
      paid, payment,
    };
  }

  //  بيعُ جزءٍ مستقلّ: حلقتُه الخاصّة بمسار «بلا معاينة» وجزءٍ لا جهازٍ كامل.
  const episodeId = num(row.device_episode_id);
  if (episodeId === null || row.service_path !== "no_exam"
    || !row.requested_item || row.requested_item === "full_device") {
    if ((row.purpose ?? "initial_build") !== "initial_build") return null;
    return await resolveDeviceBuild(h, base, episodeId, row.requested_item ?? null);
  }
  const money2 = await h.execute(sql`
    SELECT
      (SELECT COALESCE(SUM(amount), 0)::int FROM cost_entries
        WHERE patient_id = ${patientId} AND device_episode_id = ${episodeId}) AS cost,
      (SELECT COALESCE(SUM(amount), 0)::int FROM payments
        WHERE patient_id = ${patientId} AND device_episode_id = ${episodeId}) AS paid
  `);
  const m = (money2.rows ?? [])[0] as any;
  return {
    ...base, kind: "component_sale", ownEpisodeId: episodeId,
    itemLabel: requestedItemLabel(row.requested_item, serviceType),
    cost: Math.max(0, Number(m?.cost ?? 0)), costUnknown: false,
    paid: Math.max(0, Number(m?.paid ?? 0)), payment: null,
  };
}

/** **أمرُ تصنيعِ جهازٍ بلا متابعة** (البند ٣٢) — مالُه من حلقته، أو من قيود معاملته إن لم تكن له حلقة. */
async function resolveDeviceBuild(
  h: any, base: Omit<NoExamOrder, "kind" | "ownEpisodeId" | "itemLabel" | "cost" | "costUnknown" | "paid" | "payment">,
  episodeId: number | null, requestedItem: string | null,
): Promise<NoExamOrder> {
  const deviceLabel = base.serviceType === "prosthetic" ? "طرف صناعي" : "مسند طبي";
  if (episodeId !== null) {
    //  **أمرُ بناءٍ آخرُ قائمٌ على الحلقة نفسِها** (أمرٌ قديمٌ أُلغي وفُتح بدلَه): مالُها لذلك الأمر — فلا يُعكَس
    //  هنا ولا تُبطَل حلقتُه.
    const other = await h.execute(sql`
      SELECT 1 FROM prosthetic_work_orders
       WHERE device_episode_id = ${episodeId} AND id <> ${base.orderId}
         AND COALESCE(purpose, 'initial_build') = 'initial_build'
         AND status <> 'cancelled' AND admin_void_reversal_id IS NULL
       LIMIT 1
    `);
    if ((other.rows ?? []).length > 0) {
      return {
        ...base, kind: "device_build", ownEpisodeId: null, itemLabel: deviceLabel,
        cost: 0, costUnknown: false, paid: 0, payment: null, sharedEpisode: true,
      };
    }
    //  دفعاتُ صيانات هذا الجهاز ليست من ثمنه — تُعرَف من سطر تدقيق كلّ صيانة.
    const mnt = await h.execute(sql`
      SELECT a.new_values FROM audit_log a
        JOIN prosthetic_work_orders m ON m.id = a.entity_id
       WHERE a.entity_type = 'no_exam_operation' AND a.action = 'create'
         AND m.device_episode_id = ${episodeId} AND m.purpose = 'maintenance'
    `);
    const exclude = (mnt.rows ?? []).map((r: any) => paymentIdOfAudit(r.new_values))
      .filter((v: number | null): v is number => v !== null);
    const m = await h.execute(sql`
      SELECT
        (SELECT COALESCE(SUM(amount), 0)::int FROM cost_entries
          WHERE patient_id = ${base.patientId} AND device_episode_id = ${episodeId}
            AND source <> 'maintenance') AS cost,
        (SELECT COALESCE(SUM(amount), 0)::int FROM payments
          WHERE patient_id = ${base.patientId} AND device_episode_id = ${episodeId}
            AND NOT (id = ANY(${`{${exclude.join(",")}}`}::int[]))) AS paid
    `);
    const row = (m.rows ?? [])[0] as any;
    return {
      ...base, kind: "device_build", ownEpisodeId: episodeId,
      itemLabel: requestedItem ? requestedItemLabel(requestedItem, base.serviceType) : deviceLabel,
      cost: Math.max(0, Number(row?.cost ?? 0)), costUnknown: false,
      paid: Math.max(0, Number(row?.paid ?? 0)), payment: null,
    };
  }
  //  الموروثُ بلا حلقة: قيودُ معاملة الأمر نفسِها — ختمُها ختمُه.
  const legacy = await h.execute(sql`
    SELECT COALESCE(SUM(ce.amount), 0)::int AS cost, MIN(ce.case_id) AS case_id
      FROM cost_entries ce
      JOIN prosthetic_work_orders wo ON wo.id = ${base.orderId}
     WHERE ce.patient_id = ${base.patientId} AND ce.source = 'assign_manufacturing'
       AND ce.device_episode_id IS NULL AND ce.created_at = wo.created_at
  `);
  const l = (legacy.rows ?? [])[0] as any;
  return {
    ...base, kind: "device_build", ownEpisodeId: null, itemLabel: deviceLabel,
    caseId: num(l?.case_id) ?? base.caseId,
    cost: Math.max(0, Number(l?.cost ?? 0)), costUnknown: false,
    paid: 0, payment: null, paidUntracked: true,
  };
}

const KIND_LABEL: Record<Kind, string> = {
  maintenance: "أمر الصيانة", component_sale: "بيع الجزء", device_build: "أمر التصنيع",
};

function stampOf(op: NoExamOrder): string {
  return ["no_exam", op.orderId, op.orderStatus, op.existingReversalId ?? "-", op.cost, op.paid].join("|");
}

export async function previewNoExamReversal(orderId: number): Promise<ReversalPreview | null> {
  const op = await resolveNoExamOrder(db, orderId);
  if (!op) return null;
  const alreadyReversed = op.existingReversalId !== null;
  const delivered = op.orderStatus === "completed";
  const started = op.orderStartedAt !== null && op.orderStatus !== "cancelled";
  const what = KIND_LABEL[op.kind];

  const lines: ReversalImpactLine[] = [
    { kind: "check", text: `إلغاء ${what} #${op.orderId} إدارياً` },
    ...(delivered ? [{ kind: "warn" as const, text: "الأمر مكتمل؛ يبقى سجل التنفيذ والتسليم كما هو." }]
      : started ? [{ kind: "warn" as const, text: "بدأ العمل على هذا الأمر؛ يُلغى مع بقاء سجل التنفيذ." }] : []),
    ...(op.cost > 0 ? [{ kind: "check" as const, text: `عكس كلفة ${money(op.cost)} د.ع بقيد معاكس` }]
      : op.costUnknown
        ? [{ kind: "warn" as const, text: "أمرٌ قديم بلا سعر مسجَّل — لا يُعكَس له مال؛ راجع حساب المريض يدوياً إن كان عليه أجر." }]
        : [{ kind: "check" as const, text: "لا كلفة على هذا الأمر — لا مال يتحرّك" }]),
    ...(op.paid > 0
      ? [{ kind: "check" as const, text: `رد المبلغ المقبوض ${money(op.paid)} د.ع للمريض — يُسجَّل صفاً مالياً معاكساً مع قيده المحاسبي.` }]
      : []),
    ...(op.sharedEpisode
      ? [{ kind: "warn" as const, text: "لهذا الجهاز أمرُ تصنيعٍ آخر قائم — يُلغى هذا الأمر وحده، ومالُ الجهاز يبقى لذلك الأمر." }]
      : []),
    ...(op.paidUntracked
      ? [{ kind: "warn" as const, text: "ما دفعه المريض لهذا الأمر لا يرتبط به في هذا المسار القديم — يبقى في حسابه، ويُردّ يدوياً إن لزم." }]
      : []),
    ...(op.kind === "component_sale" ? [{ kind: "check" as const, text: "إلغاء طلب الجزء" }]
      : op.kind === "device_build" && op.ownEpisodeId !== null
        ? [{ kind: "check" as const, text: "إلغاء طلب الجهاز" }] : []),
    { kind: "check", text: "الاحتفاظ بجميع السجلات في التاريخ" },
  ];
  const summary: ReversalImpactLine[] = [
    { kind: "check", text: `إلغاء ${what} بالكامل` },
    ...(op.cost > 0 ? [{ kind: "check" as const, text: `عكس كلفة ${money(op.cost)} د.ع` }] : []),
    ...(op.paid > 0 ? [{ kind: "check" as const, text: `رد ${money(op.paid)} د.ع للمريض` }] : []),
    //  **والتحذيرُ في الملخّص الظاهر لا في التفاصيل المطويّة وحدها** — هو ما يجب أن يقرأه المسؤولُ قبل التأكيد.
    ...(op.paidUntracked ? [{ kind: "warn" as const, text: "ما دفعه المريض لا يُردّ آلياً — يُردّ يدوياً إن لزم" }] : []),
    ...(op.sharedEpisode ? [{ kind: "warn" as const, text: "يُلغى هذا الأمر وحده — مالُ الجهاز للأمر القائم" }] : []),
    { kind: "check", text: "الاحتفاظ بكامل السجل السابق" },
  ];

  return {
    patientId: op.patientId, patientName: op.patientName,
    followupId: 0, medicalExamId: null,
    deviceEpisodeId: op.ownEpisodeId, workOrderId: op.orderId,
    serviceType: op.serviceType, requestedItemLabel: op.itemLabel,
    saleAmount: op.cost, paidAmount: op.paid, financialDelta: -op.cost,
    availableModes: alreadyReversed ? [] : ["full_operation"],
    availableIntents: alreadyReversed ? [] : ["cancel_operation"],
    requestedItem: null, replacementOptions: [],
    impact: { purchase_only: [], full_operation: lines },
    summary: { purchase_only: [], full_operation: summary },
    replacementImpact: [],
    currentStatusText: alreadyReversed ? "ملغاة إدارياً"
      : op.kind === "maintenance" ? "صيانة مسجَّلة"
        : op.kind === "component_sale" ? "بيع جزء مسجَّل" : "أمر تصنيع مسجَّل",
    manufacturingStarted: started, delivered, alreadyReversed,
    stateStamp: stampOf(op),
  } as ReversalPreview;
}

/** هل هذا الأمرُ بابُه هنا لا في التصحيح القائم؟ قراءةٌ بلا قفل — والتنفيذُ يعيد التحقّق تحت القفل. */
export async function isNoExamOrder(orderId: number): Promise<boolean> {
  return (await resolveNoExamOrder(db, orderId)) !== null;
}

export async function executeNoExamReversal(params: {
  orderId: number;
  reasonCode: string;
  reasonNote: string;
  expectedStamp: string;
  authz: ReversalAuthz;
  actor: { userId: number | null; userName: string | null };
  audit?: { ipAddress: string | null; userAgent: string | null };
  refundAnswer?: unknown;
}): Promise<ReversalOutcome> {
  const reasonNote = params.reasonNote.trim();
  if (!reasonNote) throw new ReversalError("اكتب سبب التصحيح", 400);
  if (typeof params.expectedStamp !== "string" || params.expectedStamp.trim() === "") {
    throw new ReversalError("أعد فتح نافذة التصحيح لمراجعة الأثر قبل التنفيذ", 400);
  }

  return await db.transaction(async (tx) => {
    // ① الأمرُ مقفولاً، ثمّ المريضُ مقفولاً — والإذنُ يُفحَص على صفّه الحيّ.
    const op = await resolveNoExamOrder(tx, params.orderId, true);
    if (!op) throw new ReversalError("العملية غير موجودة", 404);
    const br = await tx.execute(sql`
      SELECT branch_id, deleted_at FROM patients WHERE id = ${op.patientId} FOR UPDATE
    `);
    const pRow = (br.rows ?? [])[0] as any;
    if (pRow?.deleted_at) throw new ReversalError(PATIENT_IN_TRASH_ERROR, 409);
    const liveBranch = num(pRow?.branch_id);
    if (!params.authz.isAdmin) {
      if (!hasRole(params.authz, "branch_manager")) {
        throw new ReversalError("تصحيح العمليات صلاحية إدارية — للمسؤول العام أو مدير الفرع فقط", 403);
      }
      if (liveBranch !== null && !params.authz.scope.includes(liveBranch)) {
        throw new ReversalError("لا يمكنك تصحيح عملية في فرع آخر", 403);
      }
    }
    if (op.existingReversalId !== null) throw new ReversalError("هذه العملية ملغاة إدارياً بالفعل", 409);
    if (params.expectedStamp !== stampOf(op)) throw new ReversalError(DRIFT, 409);

    // ② جوابُ ردّ المال — نفسُ عقد التصحيح القائم: يُردّ المالُ فتمضي، أو لا تمضي.
    const asked = refundQuestionRequired({ mode: "full_operation", paidAmount: op.paid });
    if (asked) {
      if (!isRefundAnswer(params.refundAnswer)) throw new ReversalError(REFUND_ANSWER_REQUIRED_ERROR, 400);
      if (params.refundAnswer !== "yes") throw new ReversalError(REFUND_NOT_DONE_ERROR, 400);
    }
    const refundAmount = asked ? op.paid : 0;
    const refundBranchId = op.payment?.branchId ?? op.branchId ?? liveBranch;
    if (refundAmount > 0 && refundBranchId === null) {
      throw new ReversalError(
        "لا يمكن رد المبلغ: لا فرعَ مسجَّلٌ لهذه العملية ولا لملفّ المريض. راجع الإدارة قبل الإلغاء.", 409);
    }

    // ③ صفُّ التصحيح — و`uq_aor_work_order_once` يحسم الضغطةَ المزدوجة.
    let reversalId: number;
    try {
      const ins = await tx.execute(sql`
        INSERT INTO administrative_operation_reversals
          (patient_id, branch_id, medical_exam_id, followup_id, device_episode_id,
           work_order_id, mode, reason_code, reason_note, financial_delta,
           requires_financial_settlement, preserved_paid_amount,
           created_by, created_by_name)
        VALUES (${op.patientId}, ${op.branchId}, ${null}, ${null}, ${op.ownEpisodeId},
                ${op.orderId}, 'full_operation', ${params.reasonCode}, ${reasonNote}, ${-op.cost},
                ${false}, ${op.paid - refundAmount},
                ${params.actor.userId}, ${params.actor.userName})
        RETURNING id
      `);
      reversalId = Number((ins.rows ?? [])[0].id);
    } catch (e: any) {
      if (String(e?.code) === "23505") throw new ReversalError("هذه العملية ملغاة إدارياً بالفعل", 409);
      throw e;
    }

    // ④ إبطالُ الأمر — بلا مسّ تاريخه.
    await voidOrderAdministratively(tx, {
      orderId: op.orderId, reversalId, reason: reasonNote, performedBy: params.actor.userId,
    });

    // ⑤ عكسُ الكلفة — قيدٌ معاكسٌ يُضاف، والأصلُ لا يُمَسّ.
    if (op.cost > 0) {
      if (op.caseId !== null) {
        await tx.execute(sql`
          UPDATE patient_cases SET cost = GREATEST(0, COALESCE(cost, 0) - ${op.cost}), updated_at = NOW()
           WHERE id = ${op.caseId}
        `);
      }
      await tx.execute(sql`
        UPDATE patients SET total_cost = GREATEST(0, COALESCE(total_cost, 0) - ${op.cost})
         WHERE id = ${op.patientId}
      `);
      await tx.execute(sql`
        INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, device_episode_id, notes)
        VALUES (${op.patientId}, ${op.branchId}, ${-op.cost}, 'administrative_reversal',
                ${op.caseId}, ${op.ownEpisodeId}, ${reversalCostNote(reversalId, "full_operation")})
      `);
    }

    // ⑥ ردُّ المال — بالكاتب القانونيّ الواحد، وقيدُه المرآة في المعاملة نفسِها.
    let refundPaymentId: number | null = null;
    let refundJournalPosted = true;
    if (refundAmount > 0) {
      const written = await recordRefundPaymentTx(tx, {
        patientId: op.patientId,
        branchId: refundBranchId as number,
        caseId: op.payment?.caseId ?? op.caseId,
        deviceEpisodeId: op.payment?.episodeId ?? op.ownEpisodeId,
        amount: refundAmount,
        paymentTreatmentType:
          CLOSURE_PAYMENT_TAG[op.serviceType as keyof typeof CLOSURE_PAYMENT_TAG] ?? null,
        notes: reversalRefundPaymentNote(reversalId, reasonNote),
        actorUserId: params.actor.userId,
      });
      refundPaymentId = written.paymentId;
      refundJournalPosted = written.journalPosted;
    }

    // ⑦ بيعُ الجزء وتصنيعُ الجهاز: حلقتُهما الخاصّة تُبطَل. والصيانةُ لا تمسّ حلقةَ الجهاز المُصان.
    if (op.ownEpisodeId !== null) {
      await markEpisodeAdministrativelyVoid(tx, {
        episodeId: op.ownEpisodeId, reversalId, reason: `إلغاء إداري للعملية — ${reasonNote}`,
          actor: { userId: params.actor.userId ?? null, userName: params.actor.userName ?? null },
      });
    }

    // ⑧ التدقيق، بالمعاملة نفسها.
    await logAudit({
      entityType: "administrative_operation_reversal", entityId: reversalId, action: "create",
      userId: params.actor.userId, userName: params.actor.userName, branchId: op.branchId,
      oldValues: { orderStatus: op.orderStatus, operationKind: op.kind, cost: op.cost, paid: op.paid },
      newValues: {
        mode: "full_operation", operationKind: op.kind, reasonCode: params.reasonCode, reasonNote,
        financialDelta: -op.cost, workOrderVoided: op.orderId, deviceEpisodeId: op.ownEpisodeId,
        refundedAmount: refundAmount, refundPaymentId, refundJournalPosted, costUnknown: op.costUnknown,
        paidUntracked: op.paidUntracked ?? false,
      },
      ipAddress: params.audit?.ipAddress ?? null,
      userAgent: params.audit?.userAgent ?? null,
      notes: `${REVERSAL_EVENT_TITLES.full_operation} #${reversalId}`
        + ` — ${op.kind === "maintenance" ? "صيانة" : op.kind === "component_sale" ? "بيع جزء" : "تصنيع جهاز"} (أمر #${op.orderId}) لمريض #${op.patientId}`
        + ` — ${reversalReasonLabel(params.reasonCode as any)}: ${reasonNote}`
        + (op.cost > 0 ? ` · عُكست كلفة ${money(op.cost)} د.ع` : "")
        + (refundAmount > 0
          ? ` · رُدّ للمريض ${money(refundAmount)} د.ع (دفعة #${refundPaymentId})`
            + (refundJournalPosted ? "" : " — تعذّر قيدُ اليومية: راجع دليل حسابات الفرع")
          : ""),
      tx,
    });

    return {
      reversalId, mode: "full_operation", patientId: op.patientId,
      financialDelta: -op.cost, refundedAmount: refundAmount, refundPaymentId, refundJournalPosted,
      workOrderVoided: op.orderId, episodeId: op.ownEpisodeId, examCancelled: null, replacementEpisodeId: null,
    };
  });
}
