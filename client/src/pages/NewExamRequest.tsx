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
import { transferBannerText } from "@shared/returned_transfer";

export default function NewExamRequest() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);
  const qs = new URLSearchParams(useSearch());
  const dept = qs.get("dept");
  //  **تحويلٌ من «المُرجَعون من الطبيب»** (§4.gu): `replaces` الطلبُ المُرجَع الذي يُلغيه هذا الإرسال، و`from` قسمُه للّافتة.
  const replacesRequestId = Number(qs.get("replaces")) > 0 ? Number(qs.get("replaces")) : null;
  const from = qs.get("from");
  const [, setLocation] = useLocation();
  const { data: patient, isLoading } = usePatient(patientId);
  const back = () => setLocation(replacesRequestId ? "/returned-from-doctor" : `/patients/${patientId}`);

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
  //  `key`: ورقةٌ لكلّ (مريض، قسم، طلبٍ يُستبدَل) — فلا تبقى حالُ ورقةٍ مفتوحة إن تبدّل الرابط.
  const banner = replacesRequestId ? (
    <div className="max-w-4xl mx-auto mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm font-medium text-amber-900"
      dir="rtl" data-testid="new-exam-transfer-banner">
      {transferBannerText(from)}
    </div>
  ) : null;
  if (dept === "physiotherapy") {
    return <>{banner}<PhysioSheetCreate key={`${patientId}:pt:${replacesRequestId ?? ""}`} onBack={back}
      existing={{ patient: patient as any, replacesRequestId }} /></>;
  }
  return <>{banner}<IntakeSheetCreate key={`${patientId}:${dept}:${replacesRequestId ?? ""}`} onBack={back}
    existing={{ patient: patient as any, department: dept, replacesRequestId }} /></>;
}
