import { Eye } from "lucide-react";

/**
 * **«يظهر للمريض»** — علامةٌ بجانب كلّ حقلٍ يصل إلى بطاقة المريض في تلغرام (§4.bv).
 * قرارُ المالك ٢٠٢٦-١٠-٠٣: مَن يملأ الحقلَ يعرف أنّ المريض سيقرؤه، فيتوخّى الدقّة.
 * والقائمةُ الواحدة لهذه الحقول في `shared/patient_card.ts` (`PATIENT_VISIBLE_FIELDS`).
 */
export function PatientVisibleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full bg-sky-50 border border-sky-200 px-1.5 py-0 text-[10px] font-medium text-sky-800 align-middle ${className}`}
      title="يراه المريض في بطاقته على تلغرام — تأكّد من دقّته"
      data-testid="patient-visible-badge"
    >
      <Eye className="w-3 h-3" aria-hidden /> يظهر للمريض
    </span>
  );
}
