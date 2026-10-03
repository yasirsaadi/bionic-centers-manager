// بطاقةُ المريض في تلغرام (§4.bv) — **الحقولُ التي يراها المريض**، قائمةٌ واحدة.
//
// كلُّ حقلٍ هنا يحمل في شاشات الموظّفين علامةَ «يظهر للمريض» (`PatientVisibleBadge`)، ولا يصل البطاقةَ حقلٌ غيرُها.
// وما لا يظهر أبداً: ملاحظاتُ الطبيب، والخصوماتُ وأسبابُها، وأسماءُ الموظّفين، وأسبابُ التوقّف (قراراتُ المالك ٢٠٢٦-١٠-٠٣).
// **وسببُ الزيارة يظهر** كما هو مكتوبٌ في سجلّ زيارات الملفّ (قرارُ المالك اللاحق، اليومَ نفسَه) — فحقلُه معلَّم.
export const PATIENT_VISIBLE_FIELDS = {
  //  الاستعلامات
  name: "الاسم",
  phone: "الهاتف",
  address: "العنوان",
  requestedItem: "المطلوب (طرفٌ كامل أو جزء)",
  visitTreatmentType: "نوع الزيارة / العلاج",
  visitReason: "سبب الزيارة / تفاصيلها (كما في سجلّ الزيارات)",
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

// ══ شكلُ البطاقة كما تصل المريضَ — لا حقلَ خارجَ هذا الشكل (§4.bv) ══════════════════
export interface PatientCardStage { key: string; label: string; state: "done" | "current" | "todo" }
export interface PatientCardOrder {
  id: number;
  serviceLabel: string;          // «طرف صناعي» · «مسند طبي»
  kindLabel: string;             // «تصنيع» · «صيانة»
  stages: PatientCardStage[];
  openedAt: string;              // YYYY-MM-DD بتوقيت بغداد — تاريخُ فتح الأمر
  delivered: boolean;
  expectedDeliveryDate: string | null; // YYYY-MM-DD
}
export interface PatientCardDay {
  date: string;                  // YYYY-MM-DD بتوقيت بغداد
  entries: { kind: "visit" | "payment"; label: string; branch: string | null; amount: number | null }[];
}
export interface PatientCard {
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  branches: string[];
  departments: { key: "prosthetic" | "medical_support" | "physiotherapy"; label: string; detail: string | null }[];
  orders: PatientCardOrder[];
  days: PatientCardDay[];
  remaining: number;             // ≥ ٠ — المتبقّي عليه
}

/**
 * عنوانُ الزيارة كما يراه المريض — **سببُها كما هو مكتوبٌ في سجلّ زيارات ملفّه** (قرارُ المالك ٢٠٢٦-١٠-٠٣):
 * السطرُ الأوّل نفسُه الذي تعرضه صفحةُ المريض (`details` وإلّا `notes`)، ومعه نوعُ الجلسة إن وُجد.
 */
export function cardVisitLabel(details: string | null | undefined, notes: string | null | undefined, treatmentType: string | null | undefined): string {
  const reason = String(details ?? "").trim() || String(notes ?? "").trim();
  const t = String(treatmentType ?? "").trim();
  if (t) return reason ? `جلسة ${t} — ${reason}` : `جلسة ${t}`;
  return reason || "زيارة";
}

/**
 * خاتمةُ البطاقة: فروعُ المراكز وأرقامُ هواتفها (قرارُ المالك ٢٠٢٦-١٠-٠٣). **الأرقامُ يعطيها المالك** — والفرعُ بلا رقمٍ يظهر اسماً وحده.
 */
export const CENTER_CLOSING = "نتمنى لكم الصحة والسلامة الدائمة";
export const CENTER_CONTACTS: { branch: string; phone: string | null }[] = [
  { branch: "بغداد", phone: null },
  { branch: "كربلاء", phone: null },
  { branch: "ذي قار", phone: null },
  { branch: "الموصل", phone: null },
  { branch: "كركوك", phone: null },
];
