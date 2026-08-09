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
// ── الوجهة ────────────────────────────────────────────────────────────────
// الافتراض `internal`. و`patient` تعني «يجوز إبلاغ المريض به مستقبلاً» —
// لا «سيُرسَل»: لا إرسال في هذه المرحلة إطلاقاً. والقاعدة الصلبة التي لا
// تُخرَق: **لا محتوى سريري** (تشخيص، نوع جهاز، موقع بتر) في أي حدث موجَّه
// للمريض.

/** الوجهة المسموح بها لكل نوع حدث. */
export const PATIENT_EVENT_VISIBILITIES = ["internal", "patient"] as const;
export type PatientEventVisibility = (typeof PATIENT_EVENT_VISIBILITIES)[number];

/**
 * الأنواع المعلَنة. القيمة النصّية هي ما يُخزَّن في العمود، وشكلها
 * `المجال.الفعل` كي تُجمَّع التقارير بالمجال.
 *
 * ملاحظة: إعلان النوع هنا لا يعني أن أحداً يُصدره اليوم. هذه المرحلة
 * تؤسّس البنية فقط — لا التصنيع ولا الدفعات ولا المواعيد موصولة بعد.
 */
export const PATIENT_EVENT_TYPES = {
  // هوية المريض وملفّه
  PATIENT_REGISTERED: "patient.registered",
  PATIENT_UPDATED: "patient.updated",
  PATIENT_PHONE_CHANGED: "patient.phone_changed",
  PATIENT_MERGED: "patient.merged",
  PATIENT_TRANSFERRED: "patient.transferred",
  PATIENT_CASE_ADDED: "patient.case_added",

  // التصنيع (تُوصَل في مرحلة لاحقة)
  MANUFACTURING_ORDER_CREATED: "manufacturing.order_created",
  MANUFACTURING_STAGE_CHANGED: "manufacturing.stage_changed",
  MANUFACTURING_READY_FOR_DELIVERY: "manufacturing.ready_for_delivery",
  MANUFACTURING_DELIVERED: "manufacturing.delivered",
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

/** كل نوع ووجهته. غياب نوع من هذه الخريطة خطأ يكشفه الاختبار. */
export const PATIENT_EVENT_VISIBILITY: Record<PatientEventType, PatientEventVisibility> = {
  "patient.registered": "internal",
  "patient.updated": "internal",
  "patient.phone_changed": "internal",
  "patient.merged": "internal",
  "patient.transferred": "internal",
  "patient.case_added": "internal",

  "manufacturing.order_created": "internal",
  "manufacturing.stage_changed": "internal",
  // الثلاثة الوحيدة التي يعنيه أمرها: جهازه جاهز، سُلِّم، أو تغيّر موعده.
  "manufacturing.ready_for_delivery": "patient",
  "manufacturing.delivered": "patient",
  "manufacturing.delivery_date_changed": "patient",
  "manufacturing.expert_reassigned": "internal",

  "maintenance.opened": "internal",
  "maintenance.completed": "patient",

  "payment.received": "patient",
  "payment.updated": "internal",
  "payment.deleted": "internal",
  "cost.recorded": "internal",

  // سريري ⇒ داخلي دائماً. تلغرام ليس قناة سرّية طبية.
  "visit.recorded": "internal",
  "exam.signed": "internal",
  "exam.amended": "internal",
  "prescription.applied": "internal",

  "appointment.scheduled": "patient",
  "appointment.cancelled": "patient",
};

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

/** وجهة النوع، وهي ما يُكتب في العمود حين لا يُمرَّر شيء صراحةً. */
export function defaultVisibilityFor(eventType: PatientEventType): PatientEventVisibility {
  return PATIENT_EVENT_VISIBILITY[eventType] ?? "internal";
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
