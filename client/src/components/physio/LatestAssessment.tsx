// **التقييمُ الأوّليّ حيث تُختار الخطّة وتُتابَع** (§4.da — المرحلةُ الرابعة، قرارُ المالك: «على أساس هذه التقييمات تُختار الخطّة»).
//
// آخرُ معاينة علاجٍ طبيعيّ فعّالة **بتقييمها** — من بابِ معاينات المريض نفسِه (`/api/medical/patients/:id/exams`، والملغاةُ لا تصل منه)،
// فلا نسخةَ ثانية: سطرُها المختصر وبنودُ «خطة العلاج» التي أشّرها الفاحص، و«عرض كامل» يفتح الاستمارةَ للقراءة بلغة الصفحة.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { InitialAssessmentSheet } from "@/components/physio/InitialAssessmentSheet";
import { assessmentPlanLabels, assessmentSummaryAr, readStoredAssessment, type Lang, type PhysioInitialAssessment } from "@shared/physio_initial_assessment";
import { formatDateIraq } from "@/lib/utils";

interface ExamRow { id: number; caseType: string; doctorName: string; signedAt: string | null; diagnosis: string | null; assessment?: unknown }

export interface LatestAssessment {
  examId: number; doctorName: string; signedAt: string | null; diagnosis: string | null; assessment: PhysioInitialAssessment;
}

/** آخرُ معاينة علاجٍ طبيعيّ تحمل تقييماً — `null` إن لم توجد. والقائمةُ من الخادم الأحدثُ أوّلاً. */
export function useLatestPhysioAssessment(patientId: number | null | undefined): LatestAssessment | null {
  const { data } = useQuery<{ exams: ExamRow[] }>({ queryKey: [`/api/medical/patients/${patientId}/exams`], enabled: Boolean(patientId) });
  for (const e of data?.exams ?? []) {
    if (e.caseType !== "physiotherapy") continue;
    const a = readStoredAssessment(e.assessment);
    if (a) return { examId: e.id, doctorName: e.doctorName, signedAt: e.signedAt, diagnosis: e.diagnosis, assessment: a };
  }
  return null;
}

export function LatestAssessmentBox({ patientId, lang = "ar", compact = false }: { patientId: number; lang?: Lang; compact?: boolean }) {
  const latest = useLatestPhysioAssessment(patientId);
  const [full, setFull] = useState(false);
  if (!latest) return null;
  const en = lang === "en";
  const items = assessmentPlanLabels(latest.assessment, lang);
  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2.5 space-y-1.5 text-sm" dir={en ? "ltr" : "rtl"} data-testid="latest-assessment-box">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold flex items-center gap-1.5 text-sky-900">
          <ClipboardList className="w-4 h-4" /> {en ? "Initial assessment" : "التقييم الأوّلي"}
          <span className="text-xs font-normal text-slate-500">— {latest.doctorName}{latest.signedAt ? `، ${formatDateIraq(latest.signedAt)}` : ""}</span>
        </div>
        {!compact && (
          <button type="button" className="text-xs text-sky-800 underline" onClick={() => setFull((v) => !v)} data-testid="latest-assessment-toggle">
            {full ? (en ? "Hide" : "إخفاء") : (en ? "Full form" : "عرض كامل")}
          </button>
        )}
      </div>
      {latest.diagnosis && <div className="text-xs"><span className="text-slate-500">{en ? "Diagnosis: " : "التشخيص: "}</span><b dir="auto">{latest.diagnosis}</b></div>}
      {!en && <div className="text-xs text-slate-700" data-testid="latest-assessment-summary">{assessmentSummaryAr(latest.assessment)}</div>}
      {en && latest.assessment.painWorst !== null && (
        <div className="text-xs text-slate-700">Pain {latest.assessment.painBest ?? "—"}–{latest.assessment.painWorst} / 10</div>
      )}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1" data-testid="latest-assessment-plan">
          <span className="text-xs text-slate-500">{en ? "Plan of treatment:" : "بنود خطة العلاج:"}</span>
          {items.map((x) => <span key={x} className="rounded-full border border-sky-300 bg-white px-2 py-0.5 text-[11px]">{x}</span>)}
        </div>
      )}
      {full && (
        <div className="pt-1" data-testid="latest-assessment-full">
          <InitialAssessmentSheet value={latest.assessment} lang={lang} onset={latest.assessment.onsetAtSigning} testIdPrefix="la-pt" />
        </div>
      )}
    </div>
  );
}
