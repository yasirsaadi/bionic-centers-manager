// بطاقةُ المريض في تلغرام (§4.bv) — **الحقولُ التي يراها المريض**، قائمةٌ واحدة.
//
// كلُّ حقلٍ هنا يحمل في شاشات الموظّفين علامةَ «يظهر للمريض» (`PatientVisibleBadge`)، ولا يصل البطاقةَ حقلٌ غيرُها.
// وما لا يظهر أبداً: ملاحظاتُ الطبيب، والخصوماتُ وأسبابُها، وأسماءُ الموظّفين، وكلُّ ملاحظةٍ نصّيةٍ حرّة،
// وأسبابُ التوقّف (قراراتُ المالك ٢٠٢٦-١٠-٠٣).
export const PATIENT_VISIBLE_FIELDS = {
  //  الاستعلامات
  name: "الاسم",
  phone: "الهاتف",
  address: "العنوان",
  requestedItem: "المطلوب (طرفٌ كامل أو جزء)",
  visitTreatmentType: "نوع الزيارة / العلاج",
  paymentAmount: "مبلغ الدفعة",
  //  الطبيب (ومَن يعدّل الملفّ)
  amputation: "نوع البتر وجهته",
  supportType: "نوع المسند",
  diseaseType: "التشخيص (العلاج الطبيعي)",
  //  الخبير
  manufacturingStage: "مرحلة التصنيع",
  expectedDeliveryDate: "موعد التسليم",
} as const;
export type PatientVisibleField = keyof typeof PATIENT_VISIBLE_FIELDS;
