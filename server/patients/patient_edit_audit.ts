// سطرُ تدقيقٍ لكلّ «تعديل مريض» (`PUT /api/patients/:id`) — بالقديم والجديد للحقول التي تغيّرت فعلاً (§4.bs).
// قرارُ المالك ٢٠٢٦-١٠-٠٣: «لا يمرّ شيءٌ بلا تدقيق». كان التعديلُ — ومنه الكلفةُ الكليّة — لا يخلّف أثراً يقول مَن ومتى.

/** أسماءٌ عربية لِما يُقرأ في السجلّ — والغائبُ يُكتب باسم حقله. */
export const PATIENT_FIELD_LABELS: Record<string, string> = {
  name: "الاسم", phone: "الهاتف", phoneCountry: "رمز الدولة", age: "العمر", height: "الطول", weight: "الوزن",
  address: "العنوان", totalCost: "الكلفة الكلية", branchId: "فرع التسجيل",
  patientClassification: "التصنيف", referralSource: "الجهة المحوِّلة", medicalCondition: "الحالة الطبية",
  isAmputee: "أطراف", isMedicalSupport: "مساند", isPhysiotherapy: "علاج طبيعي",
  amputationSite: "موقع البتر", injuryDate: "تاريخ الإصابة", injuryCause: "سبب الإصابة",
  whatsappNotificationsEnabled: "إشعارات واتساب", notes: "الملاحظات",
};

/** لا تُعدّ تغييراً: أختامٌ يكتبها الخادم. */
const IGNORED = new Set(["updatedAt", "whatsappConsentAt", "whatsappConsentByUserId"]);

const norm = (v: unknown): unknown => {
  if (v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  return v;
};

export interface PatientEditDiff {
  fields: string[];
  oldValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
}

/** ما تغيّر فعلاً من الحقول المُرسَلة — بالقيمة المخزَّنة قبلُ وبعدُ، لا بالمُرسَل. */
export function diffPatientEdit(
  before: Record<string, any>, after: Record<string, any>, sentKeys: readonly string[],
): PatientEditDiff {
  const out: PatientEditDiff = { fields: [], oldValues: {}, newValues: {} };
  for (const k of sentKeys) {
    if (IGNORED.has(k) || !(k in after)) continue;
    const a = norm(before[k]); const b = norm(after[k]);
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    out.fields.push(k); out.oldValues[k] = a; out.newValues[k] = b;
  }
  return out;
}

export function patientEditNote(diff: PatientEditDiff): string {
  return `تعديل بيانات المريض: ${diff.fields.map((f) => PATIENT_FIELD_LABELS[f] ?? f).join("، ")}`;
}
