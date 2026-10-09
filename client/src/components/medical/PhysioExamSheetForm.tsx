// **معاينةُ العلاج الطبيعي على «استمارة المراجع — علاج طبيعي»** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩).
//
// «تبقى الخطواتُ مثل الأطراف: كلُّ دورٍ له دورُه يملؤه، وهذه الاستمارةُ العلاجية لدور الأخصائيّ أو الطبيب أو المسؤول». فالورقةُ
// بإطار الاستعلامات نفسِه (`IntakeSheetFrame.tsx`) وترويسة الفرع:
//   ١. **حقولُ الاستعلامات** مفتوحةً للفاحص — تعديلُها يُدقَّق في الخادم باسمه (`prepareSheetEdit`)، ومعها «سبب المراجعة» والإصابات.
//   ٢. **التقييمُ الأوّليّ كاملاً** بهيئة الورقتين الأصليتين ولغتهما (`InitialAssessmentSheet`) — ومعه زرُّ «English | عربي».
//   ٣. **قرارُ الفاحص**: التشخيص · العلاجُ الموصوف وعددُ الجلسات (منه تُملأ «الكلفة والجلسات») · ملاحظاتُ الفاحص.
//   ٤. ما بعدها مقفول: الخطّةُ والتقدّم يُقرآن من خطّة العلاج، والمالُ والجلساتُ والمراجعاتُ من سجلّاتها.
// والحالةُ كلُّها يملكها `NewExamDialog` (التوقيعُ والمفتاحُ والإرسال) — هذه شاشةٌ لا منطقَ حفظٍ فيها.
import { GovernorateSelect, InjuryDateField } from "@/components/intake/IntakeFields";
import { IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable, cellInput } from "@/components/intake/IntakeSheetFrame";
import { InitialAssessmentSheet } from "@/components/physio/InitialAssessmentSheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PRIOR_CENTER_HISTORY_LABEL } from "@shared/service_path";
import { PHYSIO_SHEET_NOTES_LABEL } from "@shared/exam_sheet";
import { PT_FORM_CODE, PT_FORM_VERSION, PT_LABELS, type Lang, type PhysioInitialAssessment } from "@shared/physio_initial_assessment";
import type { InjuryEntry } from "@shared/case_fields";
import { cn } from "@/lib/utils";
import { ReferralCell, type ExamSheetValues } from "./ExamSheetForm";
import { PhysioInjuriesEditor, PhysioTreatmentsEditor, type PrescriptionValue, type TreatmentRow } from "./PrescriptionFields";

export const PHYSIO_SHEET_TITLE = "استمارة مراجع — علاج طبيعي";
const dmy = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function PhysioExamSheetForm({
  branchName, registeredAt, sheet, onSheet, rx, onRx, diagnosis, onDiagnosis, notes, onNotes,
  assessment, onAssessment, lang, onLang, missing, assessMissing,
}: {
  branchName: string | null;
  registeredAt: string | null;
  sheet: ExamSheetValues;
  onSheet: (next: ExamSheetValues) => void;
  rx: PrescriptionValue;
  onRx: (next: PrescriptionValue) => void;
  diagnosis: string;
  onDiagnosis: (v: string) => void;
  notes: string;
  onNotes: (v: string) => void;
  assessment: PhysioInitialAssessment;
  onAssessment: (v: PhysioInitialAssessment) => void;
  lang: Lang;
  onLang: (l: Lang) => void;
  /** مفاتيحُ ناقصةٌ من حقول الاستعلامات و«التشخيص». */
  missing: string[];
  /** مفاتيحُ ناقصةٌ من التقييم. */
  assessMissing: string[];
}) {
  const miss = (k: string) => missing.includes(k);
  const set = <K extends keyof ExamSheetValues>(k: K, v: ExamSheetValues[K]) => onSheet({ ...sheet, [k]: v });
  const onset = sheet.injuryDate ? sheet.injuryDate.slice(0, 10) : sheet.injuryDateStatus;

  return (
    <div className="bg-white rounded-xl border shadow-sm p-2 md:p-5 min-w-0" data-testid="physio-exam-sheet">
      <IntakeSheetHeader branchName={branchName} title={PHYSIO_SHEET_TITLE} />
      <SheetTable>
        <SheetPair>
          <SheetRow label="اسم المراجع" missing={miss("name")} testId="pt-row-name">
            <Input className={cellInput} value={sheet.name} onChange={(e) => set("name", e.target.value)} data-testid="pt-sheet-name" />
          </SheetRow>
          <SheetRow label="تاريخ المراجعة">
            <div className="h-9 flex items-center px-1.5 text-sm" dir="ltr">{dmy(registeredAt ?? "")}</div>
          </SheetRow>
        </SheetPair>
        <SheetPair>
          <SheetRow label="رقم الهاتف" missing={miss("phone")} testId="pt-row-phone">
            <Input className={cellInput} value={sheet.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel" data-testid="pt-sheet-phone" />
          </SheetRow>
          <SheetRow label="المحافظة" missing={miss("governorate")} testId="pt-row-governorate">
            <GovernorateSelect value={sheet.governorate} onChange={(v) => set("governorate", v)} className={cellInput} testId="pt-sheet-governorate" />
          </SheetRow>
        </SheetPair>
        <SheetRow label="العنوان التفصيلي" missing={miss("address")} testId="pt-row-address">
          <Input className={cellInput} value={sheet.address} onChange={(e) => set("address", e.target.value)} data-testid="pt-sheet-address" />
        </SheetRow>
        <SheetRow label="الجهة المحوِّل منها" missing={miss("referralSource") || miss("referralSubSource")} testId="pt-row-referral">
          <ReferralCell sheet={sheet} onSheet={onSheet} testIdPrefix="pt-sheet" />
        </SheetRow>
        <SheetRow label="سبق التعامل مع المركز">
          <label className="flex items-center gap-2 text-xs py-1.5 px-1 cursor-pointer">
            <input type="checkbox" className="h-4 w-4" checked={sheet.hadPriorCenterHistory === true}
              onChange={(e) => set("hadPriorCenterHistory", e.target.checked)} data-testid="pt-sheet-prior" />
            {PRIOR_CENTER_HISTORY_LABEL}
          </label>
        </SheetRow>
        <SheetRow label="سبب المراجعة" missing={miss("presentingComplaint")} testId="pt-row-complaint">
          <Input className={cellInput} value={sheet.presentingComplaint} onChange={(e) => set("presentingComplaint", e.target.value)}
            placeholder="الشكوى بكلمات المراجع" data-testid="pt-sheet-complaint" />
        </SheetRow>
        <SheetRow label="الإصابات" testId="pt-row-injuries">
          <div className="py-1.5">
            <PhysioInjuriesEditor rows={(rx.injuries as InjuryEntry[] | undefined) ?? []} onChange={(rows) => onRx({ ...rx, injuries: rows })} />
          </div>
        </SheetRow>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem] border-b border-slate-700">
          <div className="md:border-l border-slate-700">
            <SheetRow label="العمر" missing={miss("age")} testId="pt-row-age">
              <Input className={cellInput} value={sheet.age} onChange={(e) => set("age", e.target.value)} inputMode="numeric" data-testid="pt-sheet-age" />
            </SheetRow>
            <SheetRow label="الوزن (كغم)" missing={miss("weight")} testId="pt-row-weight">
              <Input className={cellInput} value={sheet.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" data-testid="pt-sheet-weight" />
            </SheetRow>
            <SheetRow label="الطول (سم)" missing={miss("height")} testId="pt-row-height">
              <Input className={cellInput} value={sheet.height} onChange={(e) => set("height", e.target.value)} inputMode="decimal" data-testid="pt-sheet-height" />
            </SheetRow>
          </div>
          <div className="border-t md:border-t-0 border-slate-700 p-1.5 flex flex-col">
            <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
            <Textarea className="flex-1 min-h-[5rem] border-0 shadow-none resize-none focus-visible:ring-1" value={sheet.generalNotes}
              onChange={(e) => set("generalNotes", e.target.value)} placeholder="اختيارية" data-testid="pt-sheet-notes" />
          </div>
        </div>
        <SheetPair>
          <SheetRow label="سبب الإصابة" missing={miss("injuryCause")} testId="pt-row-cause">
            <Input className={cellInput} value={sheet.injuryCause} onChange={(e) => set("injuryCause", e.target.value)} data-testid="pt-sheet-cause" />
          </SheetRow>
          <SheetRow label="تاريخ الإصابة" missing={miss("injuryDate")} testId="pt-row-injury-date">
            <InjuryDateField date={sheet.injuryDate} status={sheet.injuryDateStatus} testIdPrefix="pt-sheet-injury-date"
              onChange={(n) => onSheet({ ...sheet, injuryDate: n.injuryDate, injuryDateStatus: n.injuryDateStatus })} />
          </SheetRow>
        </SheetPair>

        {/*  ══ التقييمُ الأوّليّ — بهيئة الورقتين الأصليتين ولغتهما ══ */}
        <div className="bg-[#9dc3e6] border-b border-slate-700 px-2 py-1.5 flex flex-wrap items-center justify-center gap-2">
          <span className="font-bold text-slate-900">التقييم الأوّلي — {PT_LABELS.formTitle.en}</span>
          <div className="ms-auto inline-flex rounded-md border border-slate-600 overflow-hidden text-xs" role="group" aria-label="لغة الاستمارة">
            {(["en", "ar"] as const).map((l) => (
              <button key={l} type="button" onClick={() => onLang(l)} aria-pressed={lang === l}
                className={cn("px-2.5 py-1", lang === l ? "bg-slate-800 text-white" : "bg-white text-slate-800")} data-testid={`pt-lang-${l}`}>
                {l === "en" ? "English" : "عربي"}
              </button>
            ))}
          </div>
        </div>
        <InitialAssessmentSheet value={assessment} onChange={onAssessment} lang={lang} onset={onset || null} missing={assessMissing} />

        <SheetBand>قرار الفاحص</SheetBand>
        <SheetRow label="التشخيص" missing={miss("diagnosis")} testId="pt-row-diagnosis">
          <Input className={cn(cellInput, "bg-emerald-50/50")} value={diagnosis} onChange={(e) => onDiagnosis(e.target.value)}
            placeholder="التشخيص السريري" data-testid="pt-sheet-diagnosis" />
        </SheetRow>
        <SheetRow label="العلاج الموصوف وعدد الجلسات" testId="pt-row-treatments">
          <div className="py-1.5 space-y-1">
            <PhysioTreatmentsEditor rows={(rx.treatments as TreatmentRow[] | undefined) ?? []} onChange={(rows) => onRx({ ...rx, treatments: rows })} />
            <p className="text-[11px] text-slate-500">منه تفتح الاستعلاماتُ «الكلفة والجلسات» مملوءةً لتسعيرها.</p>
          </div>
        </SheetRow>
        <SheetRow label={PHYSIO_SHEET_NOTES_LABEL} testId="pt-row-notes">
          <Textarea className="min-h-[5rem] border-0 shadow-none focus-visible:ring-1 bg-emerald-50/50" value={notes}
            onChange={(e) => onNotes(e.target.value)} placeholder="ما لم تذكره الاستمارة: علاماتُ خطر، اختباراتٌ خاصّة، توصيات…" data-testid="pt-sheet-examiner-notes" />
        </SheetRow>
        <SheetRow label="الخطة العلاجية"><LockedCell text="تُقرأ من خطة العلاج بعد كتابتها" /></SheetRow>
        <SheetRow label="المبلغ الكلي للعلاج الطبيعي"><LockedCell text="يطّلع عليه الاستعلاماتُ ومَن يرى الدفعات" /></SheetRow>
        <SheetBand>المراجعات والجلسات</SheetBand>
        <div className="px-2 py-2 text-xs text-slate-500 text-center">تظهر هنا زياراتُ المريض وجلساتُه من سجلّ الزيارات</div>
      </SheetTable>
      <p className="mt-2 text-[11px] text-slate-500 text-left" dir="ltr">{PT_FORM_CODE} · v{PT_FORM_VERSION}</p>
    </div>
  );
}
