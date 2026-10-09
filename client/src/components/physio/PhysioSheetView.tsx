// **«استمارة مراجع — علاج طبيعي» مكتملةً — للقراءة** (§4.da — المرحلةُ الثالثة).
//
// الأسطرُ أسطرُ ورقة الاستعلامات (`PhysioSheetCreate`) وورقة المعاينة (`PhysioExamSheetForm`) بإطارهما (`IntakeSheetFrame`) وترويستهما،
// مملوءةً من باب الخادم الواحد (`physio-sheet`): حقولُ الاستعلامات · المعايناتُ (الأحدثُ أوّلاً) بتشخيصها ووصفتها وملاحظاتها وسطرِ تقييمها ·
// الخطّةُ والتقدّم · المبلغ · الجلساتُ لكلّ نوع · المراجعاتُ وما دُفع يومها · ثمّ **التقييمُ الأوّليّ كاملاً** بهيئة الورقتين وزرّ اللغة.
// شاشةٌ لا تحسب شيئاً.
import { useState, type ReactNode } from "react";
import { IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable } from "@/components/intake/IntakeSheetFrame";
import { InitialAssessmentSheet } from "@/components/physio/InitialAssessmentSheet";
import { PHYSIO_SHEET_TITLE } from "@/components/medical/PhysioExamSheetForm";
import { injuryDateDisplay } from "@shared/intake_sheet";
import { PHYSIO_SHEET_NOTES_LABEL } from "@shared/exam_sheet";
import { sheetVisitPaidLine } from "@shared/intake_sheet_view";
import { PT_FORM_CODE, PT_FORM_VERSION, type Lang } from "@shared/physio_initial_assessment";
import {
  physioMoneyLine, physioPlanLine, physioProgressLine, physioTreatmentsLine, type PhysioSheetResponse,
} from "@shared/physio_sheet_view";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** قيمةُ خانةٍ مقروءة — والفارغةُ «—» لا فراغٌ يُظنّ نسياناً. */
function V({ children, testId, multiline }: { children: ReactNode; testId?: string; multiline?: boolean }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-h-[2.25rem] flex items-center px-1.5 text-sm min-w-0 [overflow-wrap:anywhere]", multiline && "items-start py-1.5 whitespace-pre-wrap leading-relaxed", empty && "text-slate-400")}
      dir="auto" style={{ unicodeBidi: "plaintext" }} data-testid={testId}>
      {empty ? "—" : children}
    </div>
  );
}

const yesNo = (v: boolean | null) => (v === true ? "نعم" : v === false ? "لا" : null);

export function PhysioSheetView({ data, showAssessment = true }: { data: PhysioSheetResponse; showAssessment?: boolean }) {
  const p = data.patient;
  const referral = [p.referralSource, p.referralSubSource].filter(Boolean).join(" — ");
  const injuries = p.injuries.map((i) => [i.type, i.area, i.side].filter(Boolean).join(" — ")).filter(Boolean).join("\n");
  const latestAssessed = data.exams.find((e) => e.assessment) ?? null;
  const [lang, setLang] = useState<Lang>("en");
  const onset = p.injuryDate ? p.injuryDate.slice(0, 10) : p.injuryDateStatus;

  return (
    <div className="bg-white" data-testid="physio-sheet-view">
      <IntakeSheetHeader branchName={p.branchName} title={PHYSIO_SHEET_TITLE} />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 mb-2 px-0.5" data-testid="psv-file-line">
        <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
        <span dir="ltr">{PT_FORM_CODE} · v{PT_FORM_VERSION}</span>
      </div>
      <SheetTable>
        <SheetPair>
          <SheetRow label="اسم المراجع"><V testId="psv-name">{p.name}</V></SheetRow>
          <SheetRow label="تاريخ المراجعة"><V testId="psv-date">{p.registeredAt ? formatDateIraq(p.registeredAt) : null}</V></SheetRow>
        </SheetPair>
        <SheetPair>
          <SheetRow label="رقم الهاتف"><V><span dir="ltr">{p.phone}</span></V></SheetRow>
          <SheetRow label="المحافظة"><V testId="psv-governorate">{p.governorate}</V></SheetRow>
        </SheetPair>
        <SheetRow label="العنوان التفصيلي"><V>{p.address}</V></SheetRow>
        <SheetRow label="الجهة المحوِّل منها">
          <V testId="psv-referral">{referral ? <span>{referral}{p.referralNotes && <span className="text-slate-500"> — {p.referralNotes}</span>}</span> : p.referralNotes}</V>
        </SheetRow>
        <SheetRow label="سبق التعامل مع المركز"><V>{yesNo(p.hadPriorCenterHistory)}</V></SheetRow>
        <SheetRow label="سبب المراجعة"><V multiline testId="psv-complaint">{p.presentingComplaint}</V></SheetRow>
        <SheetRow label="الإصابات"><V multiline testId="psv-injuries">{injuries}</V></SheetRow>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_15rem] border-b border-slate-700">
          <div className="sm:border-l border-slate-700">
            <SheetRow label="العمر"><V>{p.age}</V></SheetRow>
            <SheetRow label="الوزن (كغم)"><V>{p.weight}</V></SheetRow>
            <SheetRow label="الطول (سم)"><V>{p.height}</V></SheetRow>
          </div>
          <div className="border-t sm:border-t-0 border-slate-700 p-1.5">
            <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
            <V multiline>{p.generalNotes}</V>
          </div>
        </div>
        <SheetPair>
          <SheetRow label="سبب الإصابة"><V>{p.injuryCause}</V></SheetRow>
          <SheetRow label="تاريخ الإصابة"><V>{p.injuryDate ? formatDateIraq(p.injuryDate) : injuryDateDisplay(null, p.injuryDateStatus)}</V></SheetRow>
        </SheetPair>

        <SheetBand>المعاينة — الأخصائيّ أو الطبيب</SheetBand>
        {data.exams.length === 0 && (
          <SheetRow label="المعاينة"><LockedCell tall text="لم تُوقَّع معاينةُ العلاج الطبيعي بعد" testId="psv-no-exam" /></SheetRow>
        )}
        {data.exams.map((e, i) => (
          <div key={e.id} className={cn(i > 0 && "border-t-2 border-slate-700")} data-testid={`psv-exam-${e.id}`}>
            <SheetRow label={data.exams.length > 1 ? `المعاينة ${i === 0 ? "(الأحدث)" : data.exams.length - i}` : "المعاينة"}>
              <div className="px-1.5 py-1 text-[11px] text-slate-500" data-testid={`psv-exam-sign-${e.id}`}>
                {e.doctorName}{e.signedAt ? ` — ${formatDateIraq(e.signedAt)} ${formatTimeIraq(e.signedAt)}` : ""}{e.version > 1 ? ` — النسخة ${e.version}` : ""}
              </div>
              {e.assessmentSummary && <V testId={`psv-exam-summary-${e.id}`}>التقييم الأوّلي: {e.assessmentSummary}</V>}
            </SheetRow>
            <SheetRow label="التشخيص"><V testId={`psv-exam-dx-${e.id}`}>{e.diagnosis}</V></SheetRow>
            <SheetRow label="العلاج الموصوف وعدد الجلسات"><V testId={`psv-exam-rx-${e.id}`}>{physioTreatmentsLine(e.treatments)}</V></SheetRow>
            <SheetRow label={PHYSIO_SHEET_NOTES_LABEL}><V multiline testId={`psv-exam-notes-${e.id}`}>{e.notes}</V></SheetRow>
          </div>
        ))}

        <SheetBand>الخطة والتقدّم والمبلغ — من السجلّات</SheetBand>
        <SheetRow label="الخطة العلاجية" testId="psv-row-plan">
          {!data.canViewPlan
            ? <LockedCell text="يطّلع عليها فريقُ العلاج الطبيعي" testId="psv-plan-locked" />
            : data.plan
              ? <div className="px-1.5 py-1.5 text-sm" data-testid="psv-plan">
                  <div>{physioPlanLine(data.plan).main}</div>
                  <div className="text-xs text-slate-500">{physioPlanLine(data.plan).sub}</div>
                </div>
              : <V testId="psv-plan">{null}</V>}
        </SheetRow>
        {data.canViewPlan && data.progress && (
          <SheetRow label="التقدّم"><V testId="psv-progress">{physioProgressLine(data.progress)}</V></SheetRow>
        )}
        <SheetRow label="المبلغ الكلي للعلاج الطبيعي" testId="psv-row-money">
          {!data.money
            ? <LockedCell text="يطّلع عليه الاستعلاماتُ ومَن يرى الدفعات" testId="psv-money-locked" />
            : <div className="px-1.5 py-1.5 text-sm" data-testid="psv-money">
                <div>{physioMoneyLine(data.money).main}</div>
                {physioMoneyLine(data.money).extra.map((x) => <div key={x} className="text-xs text-slate-600">{x}</div>)}
              </div>}
        </SheetRow>
        <SheetRow label="الجلسات">
          {data.sessions.length === 0 ? <V testId="psv-sessions">{null}</V> : (
            <div className="py-1 overflow-x-auto" data-testid="psv-sessions">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-slate-500"><th className="text-right font-medium px-1.5">النوع</th><th className="font-medium px-1.5">المشتراة</th><th className="font-medium px-1.5">المنفّذة</th><th className="font-medium px-1.5">المتبقّية</th></tr></thead>
                <tbody>
                  {data.sessions.map((s) => (
                    <tr key={s.type} data-testid={`psv-session-${s.type}`}>
                      <td className="px-1.5">{s.type}</td><td className="text-center">{s.bought}</td><td className="text-center">{s.done}</td>
                      <td className={cn("text-center font-semibold", s.remaining <= 0 ? "text-red-700" : "text-emerald-700")}>{s.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SheetRow>

        <SheetBand>المراجعات والجلسات</SheetBand>
        <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8rem_1fr_7rem] text-sm" data-testid="psv-visits">
          <div className="border-b border-l border-slate-700 px-2 py-1.5 font-semibold text-center">التاريخ</div>
          <div className="border-b sm:border-l border-slate-700 px-2 py-1.5 font-semibold text-center">الجلسة والتفاصيل</div>
          <div className="hidden sm:block border-b border-slate-700 px-2 py-1.5 font-semibold text-center">سجّلها</div>
          {data.visits.length === 0 ? (
            <div className="col-span-2 sm:col-span-3 px-2 py-2 text-center text-slate-400">لا مراجعات مسجّلة</div>
          ) : data.visits.map((v, i) => {
            const last = i === data.visits.length - 1;
            return (
              <div key={v.id} className="contents" data-testid={`psv-visit-${v.id}`}>
                <div className={cn("border-l border-slate-700 px-2 py-1.5 text-center", !last && "border-b")} dir="ltr">
                  {v.date ? formatDateIraq(v.date) : "—"}
                </div>
                <div className={cn("px-2 py-1.5 min-w-0 [overflow-wrap:anywhere] sm:border-l border-slate-700", !last && "border-b")} dir="auto" style={{ unicodeBidi: "plaintext" }}>
                  <div className={v.kind === "payment" ? "text-slate-600" : "font-medium"}>{[v.type, v.details].filter(Boolean).join(" — ") || v.notes || "—"}</div>
                  {(v.type || v.details) && v.notes && <div className="text-xs text-slate-500">{v.notes}</div>}
                  {v.recordedBy && <div className="text-xs text-slate-500 sm:hidden">سجّلها: {v.recordedBy}</div>}
                  {sheetVisitPaidLine(v) && (
                    <div className={cn("text-xs font-semibold", (v.paid ?? 0) < 0 ? "text-red-700" : "text-emerald-700")} data-testid={`psv-visit-paid-${v.id}`}>{sheetVisitPaidLine(v)}</div>
                  )}
                </div>
                <div className={cn("hidden sm:block px-2 py-1.5 text-xs text-slate-600", !last && "border-b border-slate-700")}>{v.recordedBy ?? ""}</div>
              </div>
            );
          })}
        </div>
      </SheetTable>

      {showAssessment && latestAssessed?.assessment && (
        <div className="mt-4" data-testid="psv-assessment">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="text-sm font-semibold">
              التقييم الأوّلي — {latestAssessed.doctorName}{latestAssessed.signedAt ? ` — ${formatDateIraq(latestAssessed.signedAt)}` : ""}
            </div>
            <div className="inline-flex rounded-md border overflow-hidden text-xs" role="group">
              <button type="button" className={cn("px-2.5 py-1", lang === "en" ? "bg-primary text-primary-foreground" : "bg-white")} onClick={() => setLang("en")} data-testid="psv-lang-en">English</button>
              <button type="button" className={cn("px-2.5 py-1", lang === "ar" ? "bg-primary text-primary-foreground" : "bg-white")} onClick={() => setLang("ar")} data-testid="psv-lang-ar">عربي</button>
            </div>
          </div>
          <InitialAssessmentSheet value={latestAssessed.assessment} lang={lang} onset={latestAssessed.assessment.onsetAtSigning ?? onset} testIdPrefix="psv-pt" />
        </div>
      )}
    </div>
  );
}
