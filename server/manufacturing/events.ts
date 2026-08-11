// جسر التصنيع إلى سجل أحداث المريض.
//
// ── لماذا هنا لا في وحدة الأحداث ─────────────────────────────────────────
// `server/events/store.ts` طبقة سفلية لا تعرف الأعمال — لا تستورد التصنيع
// ولا المحاسبة ولا المعاينات، ويحرس ذلك `npm run test:events-purity`.
// فخريطةُ «أي مرحلة تُنتج أي حدث» معرفةٌ تصنيعية بحتة، ومكانها هنا. والاتجاه
// يبقى واحداً: التصنيع يكتب حدثاً، والحدث لا يعرف التصنيع.
//
// ── العقد مع المريض ──────────────────────────────────────────────────────
// **الحمولة حقلٌ واحد: `stage`.** لا حالة، ولا سبب توقّف، ولا ملاحظة، ولا
// نوع إعادة عمل، ولا مرحلة سابقة، ولا اسم خبير، ولا نتيجة نهائية.
//
// وأهمّ ما يُحجَب هو **الرجوع**: حين يعود جهازٌ من «جاهز للتجربة» إلى
// «التصنيع» لإعادة عمل فنّي، يرى المريض أنه في «التصنيع» — ولا يُقال له
// «رجع» ولا «إعادة عمل» ولا سببها. السجلّ الداخلي يحتفظ بكل ذلك كاملاً،
// لكن الذي يخرج إليه هو موضعُه الحالي لا قصّةُ كيف وصله.
//
// ولذلك تُبنى الحمولة هنا حرفياً `{ stage }` ولا تُمرَّر من المستدعي: ما
// لا يُمرَّر لا يتسرّب. ويحرسه `npm run test:manufacturing-events`.

import {
  PATIENT_EVENT_TYPES, eventDedupeKey, type PatientEventType,
} from "@shared/patient_events";
import { DELIVERED_STAGE } from "@shared/manufacturing";
import { recordPatientEvent, type DbTransaction } from "../events/store";

/**
 * المرحلة التي بلغها الأمر ⇒ نوع الحدث الذي يراه المريض.
 *
 * ثلاثة أنواع لا نوع واحد: «جاهز للتجربة» و«تم التسليم» لهما نوعان قائمان
 * في السجل بوجهة `patient_default`، وإرسالُهما تحت `stage_changed` كان
 * سيُضيّع تمييزاً موجوداً. وما عداهما مرحلةٌ وسطية واحدة.
 *
 * و`order_received` هنا **انتقالاً** لا إنشاءً: مسار الإنشاء يُصدر
 * `order_created` مباشرةً ولا يمرّ من هنا، فلا ازدواج. والوحيد الذي يبلغ
 * هذه المرحلة انتقالاً هو التصحيح الإداري راجعاً إليها — وهو تغيّرٌ حقيقي
 * في موضع الجهاز، فيستحقّ حدثه.
 */
export function stageEventType(stage: string): PatientEventType | null {
  switch (stage) {
    case "order_received":
    case "measurements":
    case "mold":
    case "manufacturing":
      return PATIENT_EVENT_TYPES.MANUFACTURING_STAGE_CHANGED;
    case "ready_for_fitting":
      // الاسم القديم في السجل يبقى — المريض يقرأ المرحلة من `stage` لا من
      // اسم النوع، فتغييرُ الاسم ترحيلٌ بلا فائدة.
      return PATIENT_EVENT_TYPES.MANUFACTURING_READY_FOR_DELIVERY;
    case DELIVERED_STAGE:
      return PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERED;
    default:
      return null;
  }
}

/** ما يحتاجه الجسر من الأمر — لا أكثر، فلا يُغري بتمرير ما لا يجوز. */
export interface EventOrderRef {
  id: number;
  patientId: number;
  branchId: number | null;
  purpose?: string | null;
}

function isInitialBuild(order: EventOrderRef): boolean {
  return (order.purpose ?? "initial_build") === "initial_build";
}

/**
 * مفتاح منع التكرار — مبنيّ على **سطر السجلّ** لا على المرحلة.
 *
 * `workOrderId + stage` كان سيمنع الحدث الثاني حين يعود العمل ويتقدّم
 * ثانيةً: `manufacturing ← ready_for_fitting ← manufacturing ←
 * ready_for_fitting` انتقالان مشروعان إلى المرحلة نفسها، وحدثٌ واحد لهما
 * كذبٌ على المريض.
 *
 * وسطر `prosthetic_work_history` يُنشأ مرّةً واحدة لكل انتقال حقيقي، فهو
 * هويّة الانتقال نفسه: انتقالٌ جديد ⇒ سطرٌ جديد ⇒ حدثٌ جديد؛ وإعادةُ كتابةِ
 * الحدث لنفس السطر ⇒ المفتاح نفسه ⇒ لا تكرار.
 *
 * (وحارسُ التزامن يمنع الطلب المكرَّر قبل أن يصل إلى هنا أصلاً — فهذا
 * المفتاح شبكةُ أمانٍ ثانية لا الحاجزَ الأول.)
 */
function transitionKey(orderId: number, historyId: number, eventType: string): string {
  return eventDedupeKey("wo", orderId, `hist:${historyId}:${eventType}`);
}

export interface StageEventParams {
  order: EventOrderRef;
  /** المرحلة التي صار إليها الأمر. */
  stage: string;
  /** معرّف سطر `prosthetic_work_history` الذي وثّق هذا الانتقال. */
  historyId: number;
  actorUserId?: number | null;
  actorName?: string | null;
}

/**
 * حدث بلوغ مرحلة. يُستدعى **داخل معاملة** التغيير التجاري نفسها، فالأمر
 * وسجلّه وحدثه ينجحون معاً أو يفشلون معاً.
 *
 * يصمت — بلا خطأ — في حالتين مقصودتين: أمرُ صيانة (خارج نطاق هذه المرحلة
 * كلّها)، ومرحلةٌ بلا حدث معلَن.
 */
export async function recordStageEvent(
  tx: DbTransaction,
  params: StageEventParams,
): Promise<void> {
  const { order, stage, historyId } = params;
  if (!isInitialBuild(order)) return;
  const eventType = stageEventType(stage);
  if (!eventType) return;

  await recordPatientEvent(tx, {
    patientId: order.patientId,
    eventType,
    branchId: order.branchId,
    sourceType: "work_order",
    sourceId: order.id,
    // الحمولة تُبنى هنا حرفياً — لا تُمرَّر ولا تُدمج.
    payload: { stage },
    visibility: "patient",
    actorUserId: params.actorUserId ?? null,
    actorName: params.actorName ?? null,
    dedupeKey: transitionKey(order.id, historyId, eventType),
  });
}

/**
 * حدث فتح أمر التصنيع. نوعه الخاصّ لأن «بدأ العمل على جهازك» خبرٌ مختلف
 * عن «انتقل إلى مرحلة»، وحمولته المرحلة الأولى نفسها لا غير.
 */
export async function recordOrderCreatedEvent(
  tx: DbTransaction,
  params: StageEventParams,
): Promise<void> {
  const { order, stage, historyId } = params;
  if (!isInitialBuild(order)) return;
  const eventType = PATIENT_EVENT_TYPES.MANUFACTURING_ORDER_CREATED;

  await recordPatientEvent(tx, {
    patientId: order.patientId,
    eventType,
    branchId: order.branchId,
    sourceType: "work_order",
    sourceId: order.id,
    payload: { stage },
    visibility: "patient",
    actorUserId: params.actorUserId ?? null,
    actorName: params.actorName ?? null,
    dedupeKey: transitionKey(order.id, historyId, eventType),
  });
}
