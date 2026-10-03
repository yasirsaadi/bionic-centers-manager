// علامةُ «يظهر للمريض» على كلّ حقلٍ يصل بطاقةَ المريض (§4.bv) — `npm run test:patient-visible-fields`.
import { readFileSync } from "fs";
import { PATIENT_VISIBLE_FIELDS } from "@shared/patient_card";

let failures = 0;
function check(ok: boolean, msg: string) {
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}`);
}
const src = (p: string) => readFileSync(p, "utf8");
const B = "<PatientVisibleBadge";
/** العلامةُ داخل وسم العنوان نفسِه الذي يبدأ بالنصّ المعطى — لا في مكانٍ آخر من الملفّ. */
const inLabel = (file: string, labelStart: string) => {
  const s = src(file);
  const i = s.indexOf(labelStart);
  if (i < 0) return false;
  const end = s.slice(i).search(/<\/(FormLabel|Label|label|DialogTitle)>/);
  return end > 0 && s.slice(i, i + end).includes(B);
};

const CASES: [PatientVisibleKey, string, string][] = [
  ["name", "client/src/pages/CreatePatient.tsx", "<FormLabel>{t.patientForm.fullName}"],
  ["name", "client/src/pages/EditPatient.tsx", "<FormLabel>{t.patientForm.fullName}"],
  ["phone", "client/src/pages/CreatePatient.tsx", "<FormLabel>{t.patientForm.phone} *"],
  ["phone", "client/src/pages/EditPatient.tsx", "<FormLabel>{t.patientForm.phone}"],
  ["address", "client/src/pages/CreatePatient.tsx", "<FormLabel>{t.patientForm.address}"],
  ["address", "client/src/pages/EditPatient.tsx", "<FormLabel>{t.patientForm.address}"],
  ["requestedItem", "client/src/components/NewDeviceEpisodeModal.tsx", "ما المطلوب؟"],
  ["visitTreatmentType", "client/src/components/VisitModal.tsx", "<FormLabel>{t.modals.treatmentType}"],
  ["visitTreatmentType", "client/src/components/EditVisitModal.tsx", "<FormLabel>{t.modals.treatmentType}"],
  ["paymentAmount", "client/src/components/PaymentModal.tsx", "<FormLabel>{t.modals.paidAmount}"],
  ["paymentAmount", "client/src/components/ExamPathDecisionActions.tsx", "المبلغ المدفوع الآن (اختياري)"],
  ["paymentAmount", "client/src/components/NoExamOperationDialog.tsx", "المبلغ المدفوع الآن (د.ع)"],
  ["amputation", "client/src/components/medical/PrescriptionFields.tsx", "<Label className=\"text-xs font-semibold\">نوع البتر"],
  ["amputation", "client/src/pages/CreatePatient.tsx", "<FormLabel className=\"text-base\">{t.patientForm.amputationType}"],
  ["amputation", "client/src/pages/EditPatient.tsx", "<FormLabel className=\"text-base\">{t.patientForm.amputationType}"],
  ["supportType", "client/src/components/medical/PrescriptionFields.tsx", "<Label htmlFor={`rx-${f.key}`}"],
  ["supportType", "client/src/pages/EditPatient.tsx", "<FormLabel>{t.patientForm.supportType}"],
  ["diseaseType", "client/src/components/medical/PrescriptionFields.tsx", "<Label htmlFor=\"rx-diseaseType\""],
  ["diseaseType", "client/src/pages/CreatePatient.tsx", "<FormLabel>{t.patientForm.diagnosisType}"],
  ["diseaseType", "client/src/pages/EditPatient.tsx", "<FormLabel>{t.patientForm.diagnosisType}"],
  ["manufacturingStage", "client/src/pages/ManufacturingOrder.tsx", "<DialogTitle>الانتقال للمرحلة التالية"],
  ["expectedDeliveryDate", "client/src/pages/ManufacturingOrder.tsx", "<label className=\"text-sm font-medium\">تاريخ التسليم للمريض"],
  ["expectedDeliveryDate", "client/src/pages/ManufacturingOrder.tsx", "<label className=\"text-sm font-semibold\">تاريخ التسليم للمريض"],
];
type PatientVisibleKey = keyof typeof PATIENT_VISIBLE_FIELDS;
for (const [k, file, label] of CASES) {
  check(inLabel(file, label), `${PATIENT_VISIBLE_FIELDS[k]} — ${file.split("/").pop()}`);
}
//  وكلُّ حقلٍ في القائمة له موضعٌ واحدٌ على الأقلّ — فلا يُضاف إلى القائمة حقلٌ بلا علامة.
const covered = new Set(CASES.map((c) => c[0]));
check(Object.keys(PATIENT_VISIBLE_FIELDS).every((k) => covered.has(k as PatientVisibleKey)), "كلُّ حقول القائمة معلَّمة في شاشةٍ واحدةٍ على الأقلّ");
//  والعلامةُ لا تُوضع على ما لا يراه المريض: ملاحظةُ الزيارة (سبب الزيارة) نصٌّ حرٌّ داخليّ.
check(!/\{t\.modals\.visitReason\}[^<]*<PatientVisibleBadge/.test(src("client/src/components/VisitModal.tsx")), "ولا علامةَ على «سبب الزيارة» — نصٌّ حرٌّ لا يظهر");
check(/يظهر للمريض/.test(src("client/src/components/patient/PatientVisibleBadge.tsx")), "والعلامةُ تقول «يظهر للمريض»");

if (failures > 0) { console.log(`\n❌ ${failures} فشل`); process.exit(1); }
console.log("\n✅ كل حقول البطاقة معلَّمة");
