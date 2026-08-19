// شاراتُ أقسام المريض — **بالدليل لا بالاستنتاج**.
//
// كان كلُّ سطحٍ يكتب الشرطَ الثلاثيَّ بنفسه:
//   isAmputee ? بتر : isMedicalSupport ? مساند : علاج طبيعي
// فالفرعُ الأخير يمنح «العلاج الطبيعي» لكلِّ مَن لم يُصنَّف بعد — ملفٌّ فُتح
// ولم تُحدَّد خدمتُه يُقرأ في خمس شاشاتٍ مريضَ علاجٍ طبيعي، ثم يُبنى عليه
// عملٌ لا أصلَ له. والشرطُ نفسُه مكرَّرٌ ستَّ مرّات، فتصحيحُه في واحدةٍ يترك
// الخمسَ تكذب.
//
// وهنا **مكانٌ واحد** يقرأ `departmentsOfPatient`: مَن حمل قسمين ظهرا معاً
// (وهذا شائع: مساندُ وعلاجٌ طبيعي)، ومَن لا دليلَ له تقول شارتُه «بلا قسم»
// صراحةً — نقصُ بياناتٍ مرئيٌّ خيرٌ من قسمٍ مخترَع يبدو نظيفاً.

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n/LanguageContext";
import { departmentsOfPatient, type Department } from "@shared/service_taxonomy";

type BadgeVariant = "default" | "outline" | "secondary";

export interface PatientDepartmentBadgesProps {
  /** `caseTypes` يرسلها `/api/patients` — وهي دليلٌ أقوى من الأعلام. */
  patient: {
    isAmputee?: boolean | null;
    isMedicalSupport?: boolean | null;
    isPhysiotherapy?: boolean | null;
    caseTypes?: readonly string[] | null;
  };
  className?: string;
}

/**
 * أقسامُ المريض نصّاً مفصولاً — لمواضعَ لا تتّسع لشارة (التصدير، سطرُ
 * العمر، الطباعة). ونفسُ المصدر، فلا ينحرف النصُّ عن الشارة.
 */
export function usePatientDepartmentText() {
  const { t } = useTranslation();
  const labels = departmentLabels(t);
  return (patient: PatientDepartmentBadgesProps["patient"]) => {
    const depts = departmentsOfPatient(patient);
    return depts.length === 0
      ? t.patients.noDepartmentLabel
      : depts.map((d) => labels[d].label).join(" + ");
  };
}

function departmentLabels(t: ReturnType<typeof useTranslation>["t"]):
  Record<Department, { label: string; variant: BadgeVariant }> {
  return {
    prosthetic: { label: t.patients.amputee, variant: "default" },
    medical_support: { label: t.patients.medicalSupportLabel, variant: "outline" },
    physiotherapy: { label: t.patients.physiotherapy, variant: "secondary" },
  };
}

export function PatientDepartmentBadges({ patient, className }: PatientDepartmentBadgesProps) {
  const { t } = useTranslation();
  const labels = departmentLabels(t);
  const depts = departmentsOfPatient(patient);

  if (depts.length === 0) {
    return (
      <Badge variant="secondary" className={className} data-testid="badge-dept-none">
        {t.patients.noDepartmentLabel}
      </Badge>
    );
  }

  return (
    <>
      {depts.map((d) => (
        <Badge key={d} variant={labels[d].variant} className={className} data-testid={`badge-dept-${d}`}>
          {labels[d].label}
        </Badge>
      ))}
    </>
  );
}
