// **«استمارة المراجع» مكتملةً لجهازٍ واحد — للقراءة والطباعة** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨).
//
// «حين أطبعها تكون نفسَ ورقة المريض التي ملأناها أنا والاستعلامات، ليحفظها موظّفُ الاستعلامات في سجلّ المريض — لأننا سنترك الورق».
// فالأسطرُ أسطرُ شاشة الاستعلامات (`IntakeSheetCreate.tsx`) بإطارها نفسِه (`IntakeSheetFrame.tsx`) وترويستها، مملوءةً:
// حقولُ الاستعلامات من الملفّ، و«المعاينة الطبية» من معاينة **هذا الجهاز**، وخاناتُ الجهاز مدموجة، والمبلغُ من قرار الحسم،
// والمراجعاتُ من سجلّ الزيارات. والبياناتُ كلُّها من باب الخادم الواحد (`intake-sheets`) — هذه شاشةٌ لا تحسب شيئاً.
import type { ReactNode } from "react";
import { IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable } from "@/components/intake/IntakeSheetFrame";
import { EXAM_SHEET_TEXT_LABEL } from "@shared/exam_sheet";
import { INTAKE_DEPARTMENT_LABELS, injuryDateDisplay } from "@shared/intake_sheet";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { sheetMoneyLine, sheetSpecRows, type IntakeSheet, type IntakeSheetPatient } from "@shared/intake_sheet_view";
import { formatDateIraq } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** قيمةُ خانةٍ مقروءة — والفارغةُ «—» لا فراغٌ يُظنّ نسياناً. */
function V({ children, testId, multiline }: { children: ReactNode; testId?: string; multiline?: boolean }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-h-[2.25rem] print:min-h-[1.65rem] flex items-center px-1.5 text-sm break-words", multiline && "items-start py-1.5 print:py-1 whitespace-pre-wrap leading-relaxed", empty && "text-slate-400")}
      dir="auto" style={{ unicodeBidi: "plaintext" }} data-testid={testId}>
      {empty ? "—" : children}
    </div>
  );
}

const yesNo = (v: boolean | null) => (v === true ? "نعم" : v === false ? "لا" : null);

export function IntakeSheetView({ patient, sheet }: { patient: IntakeSheetPatient; sheet: IntakeSheet }) {
  const isProsthetic = sheet.serviceType === "prosthetic";
  const referral = [patient.referralSource, patient.referralSubSource].filter(Boolean).join(" — ");
  const injuryType = isProsthetic
    ? [INTAKE_DEPARTMENT_LABELS.prosthetic, sheet.amputationSite].filter(Boolean).join(" — ")
    : [INTAKE_DEPARTMENT_LABELS.medical_support, sheet.supportType, sheet.injurySide && `الجهة: ${sheet.injurySide}`].filter(Boolean).join(" — ");
  const moneyLocked = sheet.money === null && sheet.decision.kind === "bought";

  return (
    <div className="bg-white" data-testid={`intake-sheet-view-${sheet.episodeId}`}>
      <IntakeSheetHeader branchName={sheet.branchName} />
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-600 mb-2 px-0.5" data-testid="sheet-file-line">
        <span>رقم الملف: <b dir="ltr">{patient.patientCode ?? "—"}</b></span>
        <span>الجهاز #{sheet.sequenceNumber} — {requestedItemLabel(sheet.requestedItem, sheet.serviceType)}</span>
      </div>
      <SheetTable>
        <SheetPair>
          <SheetRow label="اسم المراجع"><V testId="sheet-v-name">{patient.name}</V></SheetRow>
          <SheetRow label="تاريخ المراجعة"><V testId="sheet-v-date">{sheet.openedAt ? formatDateIraq(sheet.openedAt) : null}</V></SheetRow>
        </SheetPair>
        <SheetPair>
          <SheetRow label="رقم الهاتف"><V testId="sheet-v-phone"><span dir="ltr">{patient.phone}</span></V></SheetRow>
          <SheetRow label="المحافظة"><V testId="sheet-v-governorate">{patient.governorate}</V></SheetRow>
        </SheetPair>
        <SheetRow label="العنوان التفصيلي"><V testId="sheet-v-address">{patient.address}</V></SheetRow>
        <SheetRow label="الجهة المحوِّل منها"><V testId="sheet-v-referral">{referral}</V></SheetRow>
        <SheetRow label="سبق التعامل مع المركز"><V>{yesNo(patient.hadPriorCenterHistory)}</V></SheetRow>
        <SheetRow label="نوع الإصابة"><V testId="sheet-v-injury-type">{injuryType}</V></SheetRow>
        {isProsthetic && (
          <SheetRow label="المطلوب"><V testId="sheet-v-requested">{requestedItemLabel(sheet.requestedItem, sheet.serviceType)}</V></SheetRow>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_15rem] print:grid-cols-[1fr_15rem] print:break-inside-avoid border-b border-slate-700">
          <div className="sm:border-l print:border-l border-slate-700">
            <SheetRow label="العمر"><V testId="sheet-v-age">{patient.age}</V></SheetRow>
            <SheetRow label="الوزن (كغم)"><V>{patient.weight}</V></SheetRow>
            <SheetRow label="الطول (سم)"><V>{patient.height}</V></SheetRow>
          </div>
          <div className="border-t sm:border-t-0 print:border-t-0 border-slate-700 p-1.5">
            <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
            <V multiline testId="sheet-v-notes">{patient.generalNotes}</V>
          </div>
        </div>
        <SheetPair>
          <SheetRow label="سبب الإصابة"><V>{patient.injuryCause}</V></SheetRow>
          <SheetRow label="تاريخ الإصابة">
            <V>{patient.injuryDate ? formatDateIraq(patient.injuryDate) : injuryDateDisplay(null, patient.injuryDateStatus)}</V>
          </SheetRow>
        </SheetPair>

        <SheetRow label={EXAM_SHEET_TEXT_LABEL} testId="sheet-row-exam">
          {sheet.exam ? (
            <div>
              <V multiline testId="sheet-v-exam">{sheet.exam.text}</V>
              <div className="px-1.5 pb-1 text-[11px] text-slate-500" data-testid="sheet-v-exam-sign">
                {sheet.exam.doctorName}{sheet.exam.signedAt ? ` — ${formatDateIraq(sheet.exam.signedAt)}` : ""}
              </div>
            </div>
          ) : (
            <LockedCell tall text="لم تُوقَّع معاينةُ هذا الجهاز بعد" />
          )}
        </SheetRow>
        {isProsthetic ? sheetSpecRows(sheet).map((r) => (
          <SheetRow key={r.key} label={r.label}><V testId={`sheet-v-spec-${r.key}`}>{r.value}</V></SheetRow>
        )) : (
          <SheetRow label="مواصفات المسند"><V testId="sheet-v-spec-supportType">{sheet.specs.supportType}</V></SheetRow>
        )}
        <SheetRow label={isProsthetic ? "المبلغ الكلي للطرف" : "المبلغ الكلي للمسند"} testId="sheet-row-money">
          {moneyLocked
            ? <LockedCell text="يطّلع عليه الاستعلاماتُ ومَن يرى الدفعات" />
            : <V testId="sheet-v-money">{sheetMoneyLine(sheet)}</V>}
        </SheetRow>
        <SheetBand>المراجعات</SheetBand>
        <div className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[9.5rem_1fr] print:grid-cols-[9.5rem_1fr] text-sm" data-testid="sheet-visits">
          <div className="border-b border-l border-slate-700 px-2 py-1.5 font-semibold text-center">التاريخ</div>
          <div className="border-b border-slate-700 px-2 py-1.5 font-semibold text-center">أسباب المراجعة</div>
          {sheet.visits.length === 0 ? (
            <div className="col-span-2 px-2 py-2 text-center text-slate-400">لا مراجعات مسجّلة لهذا الجهاز</div>
          ) : sheet.visits.map((v, i) => (
            <div key={v.id} className="contents" data-testid={`sheet-visit-${v.id}`}>
              <div className={cn("border-l border-slate-700 px-2 py-1.5 text-center", i < sheet.visits.length - 1 && "border-b")} dir="ltr">
                {v.date ? formatDateIraq(v.date) : "—"}
              </div>
              <div className={cn("px-2 py-1.5", i < sheet.visits.length - 1 && "border-b border-slate-700")} dir="auto" style={{ unicodeBidi: "plaintext" }}>
                {v.details || v.notes || "—"}
                {v.details && v.notes && <div className="text-xs text-slate-500">{v.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      </SheetTable>
    </div>
  );
}
