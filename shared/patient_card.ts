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
  //  `time` ساعةُ بغداد «HH:MM» — المريضُ يعرف متى حضر (قرارُ المالك).
  entries: { kind: "visit" | "payment"; label: string; time: string | null; branch: string | null; amount: number | null }[];
}
export interface PatientCard {
  name: string;
  code: string;
  registeredAt: string | null;   // YYYY-MM-DD بتوقيت بغداد — «تاريخ تسجيلك»
  phone: string | null;
  address: string | null;
  branches: string[];
  //  `status` حالةُ الجهاز كما في التطبيق (فحصٌ فقط، بانتظار…، قيد التصنيع، سُلِّم) — للأطراف والمساند وحدهما.
  departments: { key: "prosthetic" | "medical_support" | "physiotherapy"; label: string; detail: string | null; status: string | null }[];
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
 * **حالةُ قسم الجهاز كما يراها المريض** — من آخر جهازٍ غير ملغى وقرار «لم يشترِ» (§4.bm)، لا تخمين.
 * مثالُ المالك: مسندٌ عوين ثمّ «لم يشترِ» ⟵ «تمّ الفحص فقط — لم يتمّ الشراء»، لا «مسند» كأنه اشتُري.
 */
export function cardDeviceStatus(episodeStatus: string | null | undefined, notBought: boolean): string | null {
  switch (episodeStatus) {
    case "awaiting_exam": return "بانتظار المعاينة الطبية";
    case "examined": return notBought ? "تمّ الفحص فقط — لم يتمّ الشراء" : "تمّت المعاينة — بانتظار قرار الشراء";
    case "in_manufacturing": return "قيد التصنيع";
    case "delivered": return "تمّ التسليم";
    default: return null;
  }
}

/**
 * خاتمةُ البطاقة: الدعاءُ ثمّ فروعُ المراكز وأرقامُها — **بنصّ المالك حرفاً** (٢٠٢٦-١٠-٠٣). وكركوكُ ليست في نصّه فليست هنا.
 */
export const CENTER_CLOSING = "نتمنى لكم الصحة والسلامة الدائمة";
export const CENTER_CONTACT_NOTE =
  "يرجى التواصل مع الفرع الأقرب إليك وحسب حالتك إن كانت أطراف ومساند أو علاج طبيعي لمعرفة العنوان والأسعار ومواعيد الحجز";
export const CENTER_CONTACTS: { branch: string; services: string; phones: string[] }[] = [
  { branch: "بغداد بايونك", services: "أطراف ومساند وعلاج طبيعي", phones: ["07702663334", "07802663334"] },
  { branch: "ذي قار بايونك", services: "أطراف ومساند وعلاج طبيعي", phones: ["07850010605", "07750010605"] },
  { branch: "كربلاء الوارث", services: "أطراف ومساند فقط", phones: ["07704666299", "07800765397"] },
  { branch: "الموصل بايونك", services: "أطراف ومساند فقط", phones: ["07721166632", "07821166632"] },
];
