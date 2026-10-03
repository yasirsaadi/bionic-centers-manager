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

// ══ شكلُ البطاقة كما تصل المريضَ — لا حقلَ خارجَ هذا الشكل (§4.bv) ══════════════════
export interface PatientCardStage { key: string; label: string; state: "done" | "current" | "todo" }
export interface PatientCardOrder {
  id: number;
  serviceLabel: string;          // «طرف صناعي» · «مسند طبي»
  kindLabel: string;             // «تصنيع» · «صيانة»
  stages: PatientCardStage[];
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

/** عنوانُ الزيارة كما يراه المريض — **النصوصُ التي يكتبها النظامُ وحده**، لا نصٌّ حرٌّ أبداً. */
export const CARD_VISIT_LABEL_PREFIXES = [
  "تدريب على الجهاز", "طلب معاينة طبية", "عاد للشراء", "استلام الجهاز", "صيانة",
  "متابعة أو تعديل على جهاز قائم", "شراء جزء:", "شراء طرف صناعي", "شراء مسند طبي",
] as const;

export function cardVisitLabel(details: string | null | undefined, treatmentType: string | null | undefined): string {
  const d = String(details ?? "").trim();
  for (const p of CARD_VISIT_LABEL_PREFIXES) {
    if (d.startsWith(p)) {
      if (p.endsWith(":")) {
        //  «شراء جزء: الركبة» — الجزءُ بعد النقطتين حتى أوّل فاصل، بلا مبلغٍ ولا ملاحظة.
        const rest = d.slice(p.length).split(/\s[—-]\s|،|\(|\d/)[0].trim();
        return rest ? `${p} ${rest}` : p.slice(0, -1);
      }
      return p;
    }
  }
  const t = String(treatmentType ?? "").trim();
  return t ? `جلسة ${t}` : "زيارة";
}
