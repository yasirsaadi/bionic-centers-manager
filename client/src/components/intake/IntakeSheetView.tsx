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
import { sheetLinesText, sheetMoneyLine, sheetSpecView, sheetVisitPaidLine, type IntakeSheet, type IntakeSheetPatient } from "@shared/intake_sheet_view";
import { NOT_APPLICABLE_SPEC, slotTitle } from "@shared/limb_specs";
import { formatDateIraq } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** قيمةُ خانةٍ مقروءة — والفارغةُ «—» لا فراغٌ يُظنّ نسياناً. */
function V({ children, testId, multiline }: { children: ReactNode; testId?: string; multiline?: boolean }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cn("min-h-[2.25rem] print:min-h-[1.65rem] flex items-center px-1.5 text-sm min-w-0 [overflow-wrap:anywhere]", multiline && "items-start py-1.5 print:py-1 whitespace-pre-wrap leading-relaxed", empty && "text-slate-400")}
      dir="auto" style={{ unicodeBidi: "plaintext" }} data-testid={testId}>
      {empty ? "—" : children}
    </div>
  );
}

const yesNo = (v: boolean | null) => (v === true ? "نعم" : v === false ? "لا" : null);

/** **أعمدةُ الأطراف** — عمودٌ لكلّ طرفٍ مصنوع؛ والثلاثةُ والأربعة عمودان على الهاتف وبعددها على الشاشة العريضة والورق. */
export function limbColumnsClass(n: number): string {
  return n <= 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-2 sm:grid-cols-3 print:grid-cols-3" : "grid-cols-2 sm:grid-cols-4 print:grid-cols-4";
}

/**
 * **خاناتُ الطرف بحسب البتر** (§4.de): طرفٌ واحد ⟵ خاناتُه وحدها (تحت الركبة بلا ركبة)؛ وأكثرُ من طرف ⟵ سطرٌ يسمّي الأطراف، ثمّ كلُّ خانةٍ
 * بقيمتها «للأطراف كلّها» إن تماثلت، أو بعمودٍ لكلّ طرف — والطرفُ الذي لا تخصّه الخانة «لا ينطبق». **وما لا يُصنع في هذا الطلب يُذكر**
 * ولا تُطلب له مواصفات.
 */
function SheetSpecRows({ sheet }: { sheet: IntakeSheet }) {
  const view = sheetSpecView(sheet);
  const cols = (cells: ReactNode[]) => (
    <div className={cn("grid min-w-0 divide-x divide-x-reverse divide-slate-300", limbColumnsClass(cells.length))}>{cells}</div>
  );
  const many = view.allSlots.length > 2 ? "الأطراف" : "الطرفان";
  return (
    <>
      {view.mode !== "single" && (
        <SheetRow label={many} testId="sheet-row-limbs">
          {view.mode === "identical" ? (
            <V testId="sheet-v-limbs">{`متماثلة — مواصفاتٌ واحدة ${view.slots.length > 2 ? "للأطراف كلّها" : "للطرفين"} (${view.slots.map(slotTitle).join(" · ")})`}</V>
          ) : cols(view.slots.map((sl) => (
            <div key={sl.key} className="px-1.5 py-1.5 text-sm font-semibold text-center" data-testid={`sheet-v-limb-${sl.key}`}>{slotTitle(sl)}</div>
          )))}
          {view.notMadeSlots.length > 0 && (
            <div className="px-1.5 pb-1 text-xs text-slate-500" data-testid="sheet-v-limbs-not-made">
              لا يُصنع في هذا الطلب: {view.notMadeSlots.map(slotTitle).join(" · ")}
            </div>
          )}
        </SheetRow>
      )}
      {view.rows.map((r) => (
        <SheetRow key={r.key} label={r.label}>
          {r.sides ? cols(r.sides.map((x) => (
            <div key={x.side} className="min-w-0" data-testid={`sheet-v-spec-${r.key}-${x.side}`}>
              {x.applicable
                ? <V>{x.value}</V>
                : <div className="min-h-[2.25rem] print:min-h-[1.65rem] flex items-center justify-center px-1.5 text-xs text-slate-400" aria-label={`${x.label}: ${NOT_APPLICABLE_SPEC}`}>{NOT_APPLICABLE_SPEC}</div>}
            </div>
          ))) : <V testId={`sheet-v-spec-${r.key}`}>{r.value}</V>}
        </SheetRow>
      ))}
    </>
  );
}

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
        <span>الجهاز #{sheet.sequenceNumber} — {requestedItemLabel(sheet.requestedItem, sheet.serviceType, sheet.extraComponents)}</span>
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
          <SheetRow label="المطلوب"><V testId="sheet-v-requested">{requestedItemLabel(sheet.requestedItem, sheet.serviceType, sheet.extraComponents)}</V></SheetRow>
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
        {isProsthetic ? <SheetSpecRows sheet={sheet} /> : (
          <SheetRow label="مواصفات المسند"><V testId="sheet-v-spec-supportType">{sheet.specs.supportType}</V></SheetRow>
        )}
        <SheetRow label={isProsthetic ? "المبلغ الكلي للطرف" : "المبلغ الكلي للمسند"} testId="sheet-row-money">
          {moneyLocked
            ? <LockedCell text="يطّلع عليه الاستعلاماتُ ومَن يرى الدفعات" />
            : <V testId="sheet-v-money">
                <div className="flex flex-col py-0.5">
                  <span>{sheetMoneyLine(sheet)}</span>
                  {/*  **سعرُ كلّ جزء** (§4.cu) — حين يتعدّد ما بِيع. */}
                  {sheetLinesText(sheet) && <span className="text-xs text-slate-600" data-testid="sheet-v-money-lines">{sheetLinesText(sheet)}</span>}
                  {sheet.soldReady && <span className="text-xs text-slate-600" data-testid="sheet-v-sold-ready">جاهز — سُلِّم يومَ البيع بلا أمر تصنيع</span>}
                </div>
              </V>}
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
              <div className={cn("px-2 py-1.5 min-w-0 [overflow-wrap:anywhere]", i < sheet.visits.length - 1 && "border-b border-slate-700")} dir="auto" style={{ unicodeBidi: "plaintext" }}>
                {v.details || v.notes || "—"}
                {v.details && v.notes && <div className="text-xs text-slate-500">{v.notes}</div>}
                {/*  **ما دُفع في يوم المراجعة** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨) — «حين اشترى دفع هذا المبلغ». */}
                {sheetVisitPaidLine(v) && (
                  <div className={cn("text-xs font-semibold", (v.paid ?? 0) < 0 ? "text-red-700" : "text-emerald-700")} data-testid={`sheet-visit-paid-${v.id}`}>
                    {sheetVisitPaidLine(v)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </SheetTable>
    </div>
  );
}
