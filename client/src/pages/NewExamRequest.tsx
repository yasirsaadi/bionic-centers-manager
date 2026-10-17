// **«طلب معاينة جديدة» — استمارةُ القسم مملوءةً بملفّ المريض** (§4.el — طلبُ المالك ٢٠٢٦-١٠-١٧).
//
// «احرص ان تكون فتح المعاينة للاستعلامات مثل صلاحيات التسجيل لاول مرة بحيث تظهر معلومات المريض وبالامكان تعديلها ان اراد ثم يرسلها
// للمعاينة». فهذه الصفحةُ تفتح **ورقةَ التسجيل نفسَها** (`IntakeSheetCreate` · `PhysioSheetCreate`) على المريض القائم بقسمه
// (`?dept=`)، والصلاحيةُ صلاحيةُ التسجيل — يحكمها الخادمُ في `POST /api/patients/:id/new-exam-request`.
import { useLocation, useParams, useSearch } from "wouter";
import { ArrowRight, Loader2 } from "lucide-react";
import { usePatient } from "@/hooks/use-patients";
import { isNewExamRequestDepartment } from "@shared/new_exam_request";
import { Button } from "@/components/ui/button";
import IntakeSheetCreate from "./IntakeSheetCreate";
import PhysioSheetCreate from "./PhysioSheetCreate";

export default function NewExamRequest() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const dept = new URLSearchParams(useSearch()).get("dept");
  const [, setLocation] = useLocation();
  const { data: patient, isLoading } = usePatient(patientId);
  const back = () => setLocation(`/patients/${patientId}`);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }
  if (!patient || !isNewExamRequestDepartment(dept)) {
    return (
      <div className="max-w-xl mx-auto py-10 space-y-3 text-center" dir="rtl" data-testid="new-exam-request-missing">
        <p className="text-sm text-muted-foreground">{!patient ? "المريض غير موجود" : "اختر القسم من زرّ «طلب معاينة جديدة» في ملفّ المريض"}</p>
        <Button variant="outline" onClick={back} className="gap-1"><ArrowRight className="w-4 h-4" /> رجوع</Button>
      </div>
    );
  }
  //  `key`: ورقةٌ لكلّ (مريض، قسم) — فلا تبقى حالُ ورقةٍ مفتوحة إن تبدّل الرابط.
  if (dept === "physiotherapy") {
    return <PhysioSheetCreate key={`${patientId}:pt`} onBack={back} existing={{ patient: patient as any }} />;
  }
  return <IntakeSheetCreate key={`${patientId}:${dept}`} onBack={back} existing={{ patient: patient as any, department: dept }} />;
}
