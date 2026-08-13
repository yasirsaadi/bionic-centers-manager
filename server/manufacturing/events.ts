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
// و**الصفّ كلّه** لا الحمولة وحدها: هذه الأحداث تُكتب بلا `actor_user_id`
// ولا `actor_name`. مَن حرّك المرحلة شأنٌ داخلي — والمريض لا يُعرَّف بخبيره
// ولا بالموظّف الذي ضغط الزرّ. وحقلٌ في الصفّ يتسرّب بقناةٍ تُبنى لاحقاً
// كما تتسرّب الحمولة تماماً، فيُمنع من المصدر لا عند العرض.
//
// ولا يضيع التدقيق: `prosthetic_work_history.performed_by` يحمل الفاعل
// لكل انتقال، و`audit_log` كذلك. الحجب في السرد الموجَّه للمريض وحده.
//
// وأهمّ ما يُحجَب هو **الرجوع**: حين يعود جهازٌ من «جاهز للتجربة» إلى
// «التصنيع» لإعادة عمل فنّي، يرى المريض أنه في «التصنيع» — ولا يُقال له
// «رجع» ولا «إعادة عمل» ولا سببها. السجلّ الداخلي يحتفظ بكل ذلك كاملاً،
// لكن الذي يخرج إليه هو موضعُه الحالي لا قصّةُ كيف وصله.
//
// ولذلك تُبنى الحمولة هنا حرفياً `{ stage }` ولا تُمرَّر من المستدعي: ما
// لا يُمرَّر لا يتسرّب. ويحرسه `npm run test:manufacturing-events`.
//
// ── وحمولة **الإشعار** ليست حمولة الحدث ──────────────────────────────────
// صفّ الصادر يحمل `serviceType` زيادةً، كي يعرف المريض أعن طرفه الصناعي
// تتحدّث الرسالة أم عن مسنده الطبي — وهو تمييزٌ لا يُستغنى عنه لمن يحمل
// أمرَين متوازيين. و`patient_events` **لا يتغيّر عقده**: مفتاحٌ واحد كما
// كان. الفرق كلّه في `fanOut` أسفل الملفّ، وهناك شرحُه.

import {
  PATIENT_EVENT_TYPES, eventDedupeKey, type PatientEventType,
} from "@shared/patient_events";
import { DELIVERED_STAGE } from "@shared/manufacturing";
import { recordPatientEvent, type DbTransaction } from "../events/store";
import { enqueueForActiveContacts } from "../patient_notifications/outbox";

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
  /**
   * `prosthetic | medical_support` — **للإشعار وحده، لا لحمولة الحدث**.
   *
   * إلزاميّ لا اختياري: كل أمر تصنيع يحمله (`NOT NULL` في القاعدة)، ومسارُ
   * إنشاءٍ ينساه كان سيُنتج رسائل «جهازك» صامتةً لا يكشفها شيء. فالنوع
   * يمنع النسيان عند الترجمة، والاحتياط في العارض يبقى للصفوف القديمة
   * وحدها — لا لمسارٍ حيّ يخطئ.
   */
  serviceType: string;
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

/**
 * لا حقل للفاعل هنا **عمداً**: ما لا تقبله الواجهة لا يستطيع مستدعٍ
 * تمريره سهواً. والتدقيق الداخلي محفوظ في سجلّ الأمر لا في هذا الحدث.
 */
export interface StageEventParams {
  order: EventOrderRef;
  /** المرحلة التي صار إليها الأمر. */
  stage: string;
  /** معرّف سطر `prosthetic_work_history` الذي وثّق هذا الانتقال. */
  historyId: number;
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

  const recorded = await recordPatientEvent(tx, {
    patientId: order.patientId,
    eventType,
    branchId: order.branchId,
    sourceType: "work_order",
    sourceId: order.id,
    // الحمولة تُبنى هنا حرفياً — لا تُمرَّر ولا تُدمج.
    payload: { stage },
    visibility: "patient",
    // بلا فاعل: `actor_user_id` و`actor_name` يبقيان فارغين في الصفّ.
    dedupeKey: transitionKey(order.id, historyId, eventType),
  });
  await fanOut(tx, recorded, order, eventType, { stage });
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

  const recorded = await recordPatientEvent(tx, {
    patientId: order.patientId,
    eventType,
    branchId: order.branchId,
    sourceType: "work_order",
    sourceId: order.id,
    payload: { stage },
    visibility: "patient",
    // بلا فاعل — كسابقتها.
    dedupeKey: transitionKey(order.id, historyId, eventType),
  });
  await fanOut(tx, recorded, order, eventType, { stage });
}

/**
 * حدث موعد التسليم المتوقَّع — **أول تحديد وكل تغيير**.
 *
 * وحمولته الموعد الجديد وحده: لا الموعد السابق، ولا السبب، ولا مَن غيّره.
 * السبب إلزامي داخلياً ويُحفظ في سجلّ الأمر و`audit_log` — لكنه تبريرٌ
 * إداري يُقاس عليه أداء المركز، لا خبرٌ للمريض. والذي يعنيه رقمٌ واحد:
 * متى يستلم جهازه.
 *
 * والمفتاح على سطر السجلّ كغيره: تغييران في يومٍ واحد حدثان، وإعادةُ
 * كتابةِ السطر نفسه لا شيء.
 */
export async function recordDeliveryDateEvent(
  tx: DbTransaction,
  params: { order: EventOrderRef; expectedDeliveryDate: string; historyId: number },
): Promise<void> {
  const { order, expectedDeliveryDate, historyId } = params;
  if (!isInitialBuild(order)) return;
  if (!expectedDeliveryDate) return;
  const eventType = PATIENT_EVENT_TYPES.MANUFACTURING_DELIVERY_DATE_CHANGED;

  const recorded = await recordPatientEvent(tx, {
    patientId: order.patientId,
    eventType,
    branchId: order.branchId,
    sourceType: "work_order",
    sourceId: order.id,
    // الموعد وحده. لا سابق ولا سبب ولا فاعل.
    payload: { expectedDeliveryDate },
    visibility: "patient",
    dedupeKey: transitionKey(order.id, historyId, eventType),
  });
  await fanOut(tx, recorded, order, eventType, { expectedDeliveryDate });
}

/**
 * يستحقّ الرسائل **داخل معاملة الحدث نفسها** — فإمّا وقع الحدث وللمريض
 * رسالة مستحقّة، وإمّا لم يقع شيء.
 *
 * و`inserted: false` تعني أن المفتاح مُطالَب به سلفاً: الحدث موجود ورسائله
 * أُنشئت معه، فلا استحقاق ثانٍ. (والفهرس الفريد حزامٌ ثانٍ لو أخطأنا.)
 *
 * ══ وهنا **وحده** يفترق العقدان ═════════════════════════════════════════
 * حمولة الحدث تُحفظ كما بُنيت أعلاه — مفتاحٌ واحد لا غير. وحمولة الإشعار
 * هي نفسها **زائداً `serviceType`**، تُضاف في هذا الموضع الوحيد ومن صفّ
 * الأمر مباشرةً لا من المستدعي.
 *
 * والسبب أن العقدين مختلفان في طبيعتهما: `patient_events` سجلٌّ يبقى ويُقرأ
 * بقنواتٍ لم تُبنَ بعد، فكل حقل فيه التزامٌ دائم وتوسيعه بلا حاجة تمديدٌ
 * لسطح التسريب. أما صفّ الصادر فورقةُ إرسالٍ عمرها دقائق: يُصاغ منها نصّ
 * ثم لا تُقرأ ثانيةً. فالتمييز الذي يحتاجه العارض يعيش حيث يُستهلك، لا في
 * السجلّ الدائم.
 *
 * **ولا يُضاف غيره**: لا نوع الطرف، ولا نوع المسند، ولا موضع البتر، ولا
 * تشخيص. والإضافة هنا لا عند المستدعي هي ما يجعل ذلك قابلاً للحراسة —
 * لا يد لمستدعٍ في هذه الحمولة أصلاً.
 */
async function fanOut(
  tx: DbTransaction,
  recorded: { id: number | null; inserted: boolean },
  order: EventOrderRef,
  notificationType: string,
  eventPayload: Record<string, unknown>,
): Promise<void> {
  if (!recorded.inserted || recorded.id === null) return;
  await enqueueForActiveContacts(tx, {
    patientId: order.patientId,
    patientEventId: recorded.id,
    notificationType,
    payload: { ...eventPayload, serviceType: order.serviceType },
  });
}
