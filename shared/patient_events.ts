// سجل أنواع أحداث المريض — المفردات الرسمية الوحيدة.
//
// `patient_events.event_type` عمود نصّي في القاعدة، لكن **لا يُكتب فيه نصّ
// حرّ من أي مكان في المشروع**. كل نوع يُعلَن هنا مرّة واحدة، ومعه وجهته
// (داخلي أم يجوز إبلاغ المريض به) وتسميته العربية. فالإضافة تمرّ من هذا
// الملف حتماً، ولا تنبت أنواع متشابهة متفرّقة («stage_change» و
// «stage-changed» و«تغيير مرحلة») يستحيل بعدها بناء تقرير واحد.
//
// ── ما هو سجل الأحداث، وما ليس هو ────────────────────────────────────────
// **سرد مشتقّ**. يُكتب بعد نجاح العمل التجاري وداخل معاملته نفسها، ولا
// يملك شيئاً: لا مالاً، ولا رصيداً، ولا حالة تصنيع، ولا موعداً، ولا حالة
// مريض. ولا يقرأ منه أحد ليقرّر شيئاً. الجداول التجارية تبقى صاحبة الحقيقة،
// والحدث يشير إليها بـ`source_type`/`source_id` بلا مفتاح أجنبي.
//
// ── الوجهة: سياسة لا مجرّد افتراض ────────────────────────────────────────
// الوجهة المخزَّنة قيمتان: `internal` و`patient`. لكن ما يحكم أي قيمة يجوز
// أن يحملها نوعٌ ما ليس «افتراضاً» قابلاً للتجاوز — بل **سياسة** بثلاث
// درجات:
//
//   internal_only
//       داخلي دائماً. **لا يمكن لأي مستدعٍ جعله `patient` أبداً.**
//       هنا يعيش كل ما هو سريري (تشخيص، معاينة، وصفة، زيارة) وكل ما هو
//       دفتري بحت. الرفض وقت التشغيل لا في تعليق.
//
//   internal_default_patient_allowed
//       داخلي افتراضاً، ويجوز للمنتج أن يختار `patient` لحالة بعينها.
//       هذه هي درجة `manufacturing.stage_changed`: أغلب المراحل لا تعني
//       المريض، لكن مرحلةً مختارة قد تستحق إبلاغه.
//
//   patient_default
//       موجَّه للمريض افتراضاً. والتضييق إلى `internal` مسموح دائماً —
//       زيادة الخصوصية لا تحتاج إذناً.
//
// **القاعدة الصلبة**: لا محتوى سريري (تشخيص، نوع جهاز، موقع بتر) في أي حدث
// يمكن أن يصل المريض. تُنفَّذ بجعل كل نوع سريري `internal_only`، ويحرسها
// اختبار دائم.
//
// و`patient` هنا تعني «يجوز إبلاغ المريض به» لا «سيُرسَل حتماً»: هذا
// العمود سياسةُ رؤية لا قناةُ إرسال. **وخطُّ الإرسال الفعليّ قائمٌ** —
// واتساب عبر `server/patient_notifications/` منذ PR #238 — **ويعمل متى
// ضُبطت متغيرات بيئة Meta وقوالبها**؛ لكنه لا يقرأ من هنا مباشرة: أغلبُ
// الأنواع المُعلَنة أدناه لا يُصدرها أحد بعد (الملاحظة التالية)، وحتى
// الموصولُ منها يمرّ أوّلاً على موافقة المريض وصحّة رقمه. الحدث يُكتب
// ويُخزَّن بحمولةٍ آمنة أصلاً لا تُنقَّى وقت الإرسال.

/** القيمة المخزَّنة في العمود. */
export const PATIENT_EVENT_VISIBILITIES = ["internal", "patient"] as const;
export type PatientEventVisibility = (typeof PATIENT_EVENT_VISIBILITIES)[number];

/** ما يجوز لنوع الحدث أن يحمله من وجهات. */
export const VISIBILITY_POLICIES = [
  "internal_only",
  "internal_default_patient_allowed",
  "patient_default",
] as const;
export type VisibilityPolicy = (typeof VISIBILITY_POLICIES)[number];

/**
 * الأنواع المعلَنة. القيمة النصّية هي ما يُخزَّن في العمود، وشكلها
 * `المجال.الفعل` كي تُجمَّع التقارير بالمجال.
 *
 * ملاحظة: إعلان النوع هنا لا يعني أن أحداً يُصدره اليوم. الموصول فعلاً هو
 * **مراحل التصنيع للبناء الأوّلي** (الأربعة الموسومة أدناه) **وموعدُ
 * التسليم** (`manufacturing.delivery_date_changed`، يُصدره
 * `recordDeliveryDateEvent` في الملفّ نفسه). أمّا الدفعاتُ والمواعيدُ
 * والصيانةُ وتغييرُ الخبير فتبقى مُعلَنةً ولم تُوصَل بعد.
 */
export const PATIENT_EVENT_TYPES = {
  // هوية المريض وملفّه
  PATIENT_REGISTERED: "patient.registered",
  PATIENT_UPDATED: "patient.updated",
  PATIENT_PHONE_CHANGED: "patient.phone_changed",
  PATIENT_MERGED: "patient.merged",
  PATIENT_TRANSFERRED: "patient.transferred",
  PATIENT_CASE_ADDED: "patient.case_added",

  // التصنيع — الأربعة الأولى **موصولة** بمراحل البناء الأوّلي الست،
  // يُصدرها `server/manufacturing/events.ts` بحمولة `{ stage }` وحدها.
  MANUFACTURING_ORDER_CREATED: "manufacturing.order_created",
  MANUFACTURING_STAGE_CHANGED: "manufacturing.stage_changed",
  // اسمها القديم باقٍ عمداً: المرحلة صارت `ready_for_fitting`، لكن المريض
  // يقرأ اسمها من حمولة `stage` لا من اسم النوع — فتغييره ترحيلٌ بلا فائدة.
  MANUFACTURING_READY_FOR_DELIVERY: "manufacturing.ready_for_delivery",
  MANUFACTURING_DELIVERED: "manufacturing.delivered",
  // معلَنان ولم يُوصَلا بعد.
  MANUFACTURING_DELIVERY_DATE_CHANGED: "manufacturing.delivery_date_changed",
  MANUFACTURING_EXPERT_REASSIGNED: "manufacturing.expert_reassigned",

  // الصيانة
  MAINTENANCE_OPENED: "maintenance.opened",
  MAINTENANCE_COMPLETED: "maintenance.completed",

  // المال — كلّه داخلي عدا إيصال القبض
  PAYMENT_RECEIVED: "payment.received",
  PAYMENT_UPDATED: "payment.updated",
  PAYMENT_DELETED: "payment.deleted",
  COST_RECORDED: "cost.recorded",

  // العيادة — داخلي دائماً وبلا استثناء
  VISIT_RECORDED: "visit.recorded",
  EXAM_SIGNED: "exam.signed",
  EXAM_AMENDED: "exam.amended",
  PRESCRIPTION_APPLIED: "prescription.applied",

  // المواعيد (لا وجود لها في النظام بعد)
  APPOINTMENT_SCHEDULED: "appointment.scheduled",
  APPOINTMENT_CANCELLED: "appointment.cancelled",
} as const;

export type PatientEventType = (typeof PATIENT_EVENT_TYPES)[keyof typeof PATIENT_EVENT_TYPES];

/** سياسة كل نوع. غياب نوع من هذه الخريطة خطأ يكشفه الاختبار. */
export const PATIENT_EVENT_POLICY: Record<PatientEventType, VisibilityPolicy> = {
  // ── هوية المريض وملفّه ────────────────────────────────────────────────
  // تأكيد التسجيل ونقل الفرع وتغيّر رقمه: أخبار تخصّه ولا تحمل شيئاً
  // سريرياً، فيُسمح بها دون أن تُفتح افتراضاً.
  "patient.registered": "internal_default_patient_allowed",
  "patient.phone_changed": "internal_default_patient_allowed",
  "patient.transferred": "internal_default_patient_allowed",
  // نظافة سجلات داخلية بحتة — إبلاغ المريض بها يُربك ولا يُفيد.
  "patient.updated": "internal_only",
  "patient.merged": "internal_only",
  "patient.case_added": "internal_only",

  // ── التصنيع ───────────────────────────────────────────────────────────
  // موصولٌ ويُكتب بوجهة `patient` صراحةً عند فتح أمر البناء الأوّلي.
  "manufacturing.order_created": "internal_default_patient_allowed",
  // الدرجة التي طلبها المنتج صراحةً: القرار لكل حالة لا للنوع كلّه. وقد
  // اختير `patient` للمراحل الست كلّها — لأن التسميات الست نفسها صيغت
  // لتُقال للمريض لا للورشة.
  "manufacturing.stage_changed": "internal_default_patient_allowed",
  // الثلاثة التي يعنيه أمرها فعلاً.
  "manufacturing.ready_for_delivery": "patient_default",
  "manufacturing.delivered": "patient_default",
  "manufacturing.delivery_date_changed": "patient_default",
  // إسناد داخلي — مَن يصنع جهازه ليس خبراً يُرسَل إليه.
  "manufacturing.expert_reassigned": "internal_only",

  // ── الصيانة ───────────────────────────────────────────────────────────
  "maintenance.opened": "internal_default_patient_allowed",
  "maintenance.completed": "patient_default",

  // ── المال ─────────────────────────────────────────────────────────────
  // إيصال القبض يبني ثقة ويقلّل النزاع، والمريض يعرف المبلغ أصلاً.
  "payment.received": "patient_default",
  // تصحيح سجلاتنا نحن. رسالة آلية عنه تُقلِق بلا فائدة، وإن استحقّ فمكالمة.
  "payment.updated": "internal_only",
  "payment.deleted": "internal_only",
  // التسعير داخلي: المريض يعرف السعر من الاستعلامات لا من بوت.
  "cost.recorded": "internal_only",

  // ── العيادة: سريري ⇒ internal_only بلا استثناء ────────────────────────
  // تلغرام ليس قناة سرّية طبية، والهوية موثَّقة برقم في أحسن الأحوال.
  "visit.recorded": "internal_only",
  "exam.signed": "internal_only",
  "exam.amended": "internal_only",
  "prescription.applied": "internal_only",

  // ── المواعيد ──────────────────────────────────────────────────────────
  "appointment.scheduled": "patient_default",
  "appointment.cancelled": "patient_default",
};

/**
 * الأنواع السريرية التي **لا يجوز** أن تصل المريض بأي حال. مُعلَنة صراحةً
 * كي يحرسها اختبار دائم بدل أن تعتمد على انتباه من يعدّل الخريطة أعلاه.
 */
export const CLINICAL_EVENT_TYPES: PatientEventType[] = [
  "visit.recorded",
  "exam.signed",
  "exam.amended",
  "prescription.applied",
];

/** التسمية العربية المعروضة في الجدول الزمني. */
export const PATIENT_EVENT_LABELS_AR: Record<PatientEventType, string> = {
  "patient.registered": "تسجيل المريض",
  "patient.updated": "تعديل بيانات المريض",
  "patient.phone_changed": "تغيير رقم الاتصال",
  "patient.merged": "دمج ملف",
  "patient.transferred": "نقل بين الفروع",
  "patient.case_added": "إضافة نوع حالة",

  "manufacturing.order_created": "فتح أمر تصنيع",
  "manufacturing.stage_changed": "تغيّر مرحلة التصنيع",
  "manufacturing.ready_for_delivery": "الجهاز جاهز للتسليم",
  "manufacturing.delivered": "تسليم الجهاز",
  "manufacturing.delivery_date_changed": "تغيير موعد التسليم",
  "manufacturing.expert_reassigned": "تغيير الخبير",

  "maintenance.opened": "فتح صيانة",
  "maintenance.completed": "إنجاز الصيانة",

  "payment.received": "استلام دفعة",
  "payment.updated": "تعديل دفعة",
  "payment.deleted": "حذف دفعة",
  "cost.recorded": "قيد كلفة",

  "visit.recorded": "تسجيل زيارة",
  "exam.signed": "توقيع معاينة",
  "exam.amended": "ملحق معاينة",
  "prescription.applied": "تطبيق وصفة",

  "appointment.scheduled": "حجز موعد",
  "appointment.cancelled": "إلغاء موعد",
};

/** كل الأنواع المعلَنة، للتكرار عليها في الاختبارات والتقارير. */
export const ALL_PATIENT_EVENT_TYPES = Object.values(PATIENT_EVENT_TYPES) as PatientEventType[];

/** هل هذا النصّ نوع حدث معلَن؟ حارس عند حدود النظام. */
export function isPatientEventType(value: unknown): value is PatientEventType {
  return typeof value === "string" && (ALL_PATIENT_EVENT_TYPES as string[]).includes(value);
}

/** سياسة النوع. الافتراض الآمن لنوع مجهول هو أضيق الدرجات. */
export function policyFor(eventType: PatientEventType): VisibilityPolicy {
  return PATIENT_EVENT_POLICY[eventType] ?? "internal_only";
}

/** ما يُكتب في العمود حين لا يطلب المستدعي وجهةً صراحةً. */
export function defaultVisibilityFor(eventType: PatientEventType): PatientEventVisibility {
  return policyFor(eventType) === "patient_default" ? "patient" : "internal";
}

/**
 * هل يجوز لهذا النوع أن يحمل هذه الوجهة؟
 *
 * `internal` مسموحة دائماً — تضييق الوجهة زيادةُ خصوصية لا تحتاج إذناً،
 * حتى لنوع `patient_default`. و`patient` ممنوعة على `internal_only` قطعاً.
 */
export function isVisibilityAllowed(
  eventType: PatientEventType,
  visibility: PatientEventVisibility,
): boolean {
  if (visibility === "internal") return true;
  return policyFor(eventType) !== "internal_only";
}

/**
 * يحسم الوجهة النهائية، ويرمي عند مخالفة السياسة.
 *
 * هذا هو الموضع الذي يمنع حدثاً سريرياً من أن يصير موجَّهاً للمريض بتمريرة
 * واحدة من مستدعٍ مستعجل. الضمان المعماري لا يكون ضماناً ما لم يُرفَض
 * خرقُه وقت التشغيل.
 */
export function resolveVisibility(
  eventType: PatientEventType,
  requested?: PatientEventVisibility | null,
): PatientEventVisibility {
  if (requested === undefined || requested === null) return defaultVisibilityFor(eventType);
  if (!PATIENT_EVENT_VISIBILITIES.includes(requested)) {
    throw new Error(`patient_events: invalid visibility "${String(requested)}"`);
  }
  if (!isVisibilityAllowed(eventType, requested)) {
    throw new Error(
      `patient_events: "${eventType}" is ${policyFor(eventType)} — it can never be written with visibility "patient".`,
    );
  }
  return requested;
}

/**
 * باني مفتاح منع التكرار.
 *
 * النطاق **لكل مريض** (الفهرس الفريد على `(patient_id, dedupe_key)`)، فلا
 * يلزم أن يكون المفتاح فريداً عالمياً — ويجوز لمريضين أن يحملا المفتاح
 * نفسه. وهذا مقصود: «هذا المريض لا يأخذ هذا الحدث مرّتين» هو المعنى
 * المطلوب، وهو يترك تصميم المفاتيح حرّاً بلا اشتراط رقم عالمي في كلٍّ منها.
 *
 * والثمن أن **الدمج قد يواجه تصادماً حقيقياً** حين يحمل الملفان المفتاح
 * نفسه — يعالجه `mergePatients` صراحةً ولا يفترض أن إعادة توجيه
 * `patient_id` وحدها كافية.
 *
 * مثال: `eventDedupeKey("wo", 8412, "stage:ready_for_delivery")`
 *        ⇒ "wo:8412:stage:ready_for_delivery"
 */
export function eventDedupeKey(scope: string, id: string | number, suffix?: string): string {
  const base = `${scope}:${id}`;
  return suffix ? `${base}:${suffix}` : base;
}
