// **معاينةُ الطبيب على «استمارة المراجع» نفسِها** (§4.cq — المرحلةُ الثانية ب، ٢٠٢٦-١٠-٠٨).
//
// قرارُ المالك: «أن تكون معاينةُ الطبيب نفسَ الورقة تماماً التي ملأها الاستعلامات، وإزالةُ الحقول الزائدة، ووضعُ حقلٍ واحد اسمُه
// المعاينة الطبية ويظهر عند ملف المريض». فهذه الورقةُ بأسطرها كما في شاشة الاستعلامات (`IntakeSheetCreate.tsx`) وبإطارها نفسِه
// (`IntakeSheetFrame.tsx`) — **مفتوحةً للطبيب كلُّها**: حقولُ الاستعلامات يعدّلها (وتُدقَّق في الخادم باسمه)، و«المعاينة الطبية»
// خانةٌ واحدة بدل الخمس، وخاناتُ الجهاز الخمس بترتيب الورقة ومعها «لا ينطبق». والمبلغُ وجدولُ المراجعات مقفولان كما عند الاستعلامات.
// والحالةُ كلُّها يملكها `NewExamDialog` (التوقيعُ، والجهاز، والمفتاحُ، والإرسال) — هذه شاشةٌ لا منطقَ حفظٍ فيها.
import { AmputationBuilder, type AmputationParts } from "@/components/AmputationBuilder";
import { GovernorateSelect, InjuryDateField } from "@/components/intake/IntakeFields";
import {
  IntakeSheetHeader, LockedCell, SheetBand, SheetPair, SheetRow, SheetTable, cellInput,
} from "@/components/intake/IntakeSheetFrame";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  INTAKE_DEPARTMENT_LABELS, REFERRAL_OTHER_PERSON, REFERRAL_SOURCES, REFERRAL_SUB_SOURCES,
  type IntakeDepartment, type InjuryDateStatus,
} from "@shared/intake_sheet";
import { EXAM_SHEET_TEXT_LABEL, SHEET_DEVICE_ROWS } from "@shared/exam_sheet";
import { COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS, PROSTHETIC_COMPONENTS } from "@shared/prosthetic_parts";
import { INJURY_SIDE_OPTIONS, PROSTHETIC_DEVICE_SPECS } from "@shared/case_fields";
import { NOT_APPLICABLE, SALE_REQUIRED_SPECS } from "@shared/device_specs";
import { PRIOR_CENTER_HISTORY_LABEL } from "@shared/service_path";
import { cn } from "@/lib/utils";
import type { PrescriptionValue } from "./PrescriptionFields";

/** حقولُ الاستعلامات كما تصل من باب المعاينة (`sheet`) وتُرسَل إليه — بأسماء أعمدة `patients`. */
export interface ExamSheetValues {
  name: string; phone: string; governorate: string; address: string;
  referralSource: string; referralSubSource: string; hadPriorCenterHistory: boolean | null;
  age: string; weight: string; height: string; injuryCause: string;
  injuryDate: string; injuryDateStatus: InjuryDateStatus | null; generalNotes: string;
}

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
export function sheetValuesFrom(row: Record<string, unknown> | null | undefined): ExamSheetValues {
  const r = row ?? {};
  return {
    name: s(r.name), phone: s(r.phone), governorate: s(r.governorate), address: s(r.address),
    referralSource: s(r.referralSource), referralSubSource: s(r.referralSubSource),
    hadPriorCenterHistory: typeof r.hadPriorCenterHistory === "boolean" ? r.hadPriorCenterHistory : null,
    age: s(r.age), weight: s(r.weight), height: s(r.height), injuryCause: s(r.injuryCause),
    injuryDate: s(r.injuryDate), injuryDateStatus: (r.injuryDateStatus as InjuryDateStatus | null) ?? null,
    generalNotes: s(r.generalNotes),
  };
}

const AMP_KEYS = [
  "amputationType", "singleLimb", "singleSide", "singleDetail", "doubleLimbType", "doubleRightDetail", "doubleLeftDetail",
  "bothRightLimb", "bothLeftLimb", "bothRightDetail", "bothLeftDetail", "siliconePart", "siliconeSide", "siliconeNotes",
] as const;

/** خاناتُ الجهاز بترتيب الورقة وألفاظها (`SHEET_DEVICE_ROWS`) — ومثالُ كلٍّ من تعريفها القائم. */
const DEVICE_ROWS = SHEET_DEVICE_ROWS.map((r) => ({
  ...r, placeholder: PROSTHETIC_DEVICE_SPECS.find((f) => f.key === r.key)?.placeholder ?? "",
}));

const dmy = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

export function ExamSheetForm({
  specialty, onSpecialty, deviceSpecialties, branchName, registeredAt,
  sheet, onSheet, rx, onRx, text, onText, requestedItem, onRequestedItem, missing,
}: {
  specialty: IntakeDepartment;
  onSpecialty: (s: IntakeDepartment) => void;
  /** أقسامُ الأجهزة التي يحملها الطبيب — أزرارُ «نوع الإصابة». */
  deviceSpecialties: IntakeDepartment[];
  branchName: string | null;
  registeredAt: string | null;
  sheet: ExamSheetValues;
  onSheet: (next: ExamSheetValues) => void;
  rx: PrescriptionValue;
  onRx: (next: PrescriptionValue) => void;
  text: string;
  onText: (v: string) => void;
  /** «المطلوب» — `null` حين لا جهازَ بعينه (فلا يُعرَض للتعديل). */
  requestedItem: string | null;
  onRequestedItem: (v: string) => void;
  missing: string[];
}) {
  const miss = (k: string) => missing.includes(k);
  const set = <K extends keyof ExamSheetValues>(k: K, v: ExamSheetValues[K]) => onSheet({ ...sheet, [k]: v });
  const setRx = (k: string, v: unknown) => onRx({ ...rx, [k]: v });
  const isProsthetic = specialty === "prosthetic";
  const amp: AmputationParts = Object.fromEntries(AMP_KEYS.filter((k) => rx[k] !== undefined).map((k) => [k, rx[k]]));
  const setAmp = (next: AmputationParts) => {
    const cleared: PrescriptionValue = { ...rx };
    for (const k of AMP_KEYS) delete cleared[k];
    onRx({ ...cleared, ...next });
  };

  return (
    <div className="bg-white rounded-xl border shadow-sm p-2 md:p-5" data-testid="exam-sheet">
      <IntakeSheetHeader branchName={branchName} />
      <SheetTable>
        <SheetPair>
          <SheetRow label="اسم المراجع" missing={miss("name")} testId="exam-row-name">
            <Input className={cellInput} value={sheet.name} onChange={(e) => set("name", e.target.value)} data-testid="exam-sheet-name" />
          </SheetRow>
          <SheetRow label="تاريخ المراجعة">
            <div className="h-9 flex items-center px-1.5 text-sm" dir="ltr" data-testid="exam-sheet-date">{dmy(registeredAt ?? "")}</div>
          </SheetRow>
        </SheetPair>
        <SheetPair>
          <SheetRow label="رقم الهاتف" missing={miss("phone")} testId="exam-row-phone">
            <Input className={cellInput} value={sheet.phone} onChange={(e) => set("phone", e.target.value)} dir="ltr" inputMode="tel" data-testid="exam-sheet-phone" />
          </SheetRow>
          <SheetRow label="المحافظة" missing={miss("governorate")} testId="exam-row-governorate">
            <GovernorateSelect value={sheet.governorate} onChange={(v) => set("governorate", v)} className={cellInput} testId="exam-sheet-governorate" />
          </SheetRow>
        </SheetPair>
        <SheetRow label="العنوان التفصيلي" missing={miss("address")} testId="exam-row-address">
          <Input className={cellInput} value={sheet.address} onChange={(e) => set("address", e.target.value)} data-testid="exam-sheet-address" />
        </SheetRow>
        <SheetRow label="الجهة المحوِّل منها" missing={miss("referralSource") || miss("referralSubSource")} testId="exam-row-referral">
          <div className="flex flex-wrap gap-1.5">
            <Select value={sheet.referralSource} onValueChange={(v) => onSheet({ ...sheet, referralSource: v, referralSubSource: v === REFERRAL_OTHER_PERSON ? sheet.referralSubSource : "" })}>
              <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="exam-sheet-referral"><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
              <SelectContent>
                {[...REFERRAL_SOURCES, ...(sheet.referralSource && !(REFERRAL_SOURCES as readonly string[]).includes(sheet.referralSource) ? [sheet.referralSource] : [])]
                  .map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            {sheet.referralSource === REFERRAL_OTHER_PERSON && (
              <Select value={sheet.referralSubSource} onValueChange={(v) => set("referralSubSource", v)}>
                <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid="exam-sheet-referral-sub"><SelectValue placeholder="كيف عرف الشخص الآخر بالمركز؟" /></SelectTrigger>
                <SelectContent>
                  {[...REFERRAL_SUB_SOURCES, ...(sheet.referralSubSource && !(REFERRAL_SUB_SOURCES as readonly string[]).includes(sheet.referralSubSource) ? [sheet.referralSubSource] : [])]
                    .map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </SheetRow>
        <SheetRow label="سبق التعامل مع المركز">
          <label className="flex items-center gap-2 text-xs py-1.5 px-1 cursor-pointer">
            <input type="checkbox" className="h-4 w-4" checked={sheet.hadPriorCenterHistory === true}
              onChange={(e) => set("hadPriorCenterHistory", e.target.checked)} data-testid="exam-sheet-prior" />
            {PRIOR_CENTER_HISTORY_LABEL}
          </label>
        </SheetRow>

        <SheetRow label="نوع الإصابة" testId="exam-row-injury-type">
          <div className="space-y-3 py-1">
            <div className="flex flex-wrap gap-2">
              {deviceSpecialties.map((d) => (
                <button key={d} type="button" onClick={() => onSpecialty(d)} aria-pressed={specialty === d}
                  className={cn("rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                    specialty === d ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50")}
                  data-testid={`exam-sheet-dept-${d}`}>{INTAKE_DEPARTMENT_LABELS[d]}</button>
              ))}
            </div>
            {isProsthetic && <AmputationBuilder value={amp} onChange={setAmp} testIdPrefix="exam-amp" />}
            {specialty === "medical_support" && (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs font-medium">نوع المسند</div>
                  <Input className="h-9" value={s(rx.supportType)} onChange={(e) => setRx("supportType", e.target.value)}
                    placeholder="مثال: مشدّ ظهر، جبيرة قدم" data-testid="exam-sheet-support-type" />
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-medium">جهة الإصابة</div>
                  <Input className="h-9" value={s(rx.injurySide)} onChange={(e) => setRx("injurySide", e.target.value)}
                    placeholder="يمين، يسار، كلاهما…" data-testid="exam-sheet-injury-side" />
                  <div className="flex flex-wrap gap-1">
                    {[...INJURY_SIDE_OPTIONS, NOT_APPLICABLE].map((o) => (
                      <button key={o} type="button" onClick={() => setRx("injurySide", o)}
                        className={cn("rounded-full border px-2 py-0.5 text-[11px]", rx.injurySide === o ? "border-primary bg-primary/10" : "bg-white")}>{o}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </SheetRow>
        {isProsthetic && requestedItem !== null && (
          <SheetRow label="المطلوب" testId="exam-row-requested">
            <Select value={requestedItem} onValueChange={onRequestedItem}>
              <SelectTrigger className={cellInput} data-testid="exam-sheet-requested"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={FULL_DEVICE}>{FULL_DEVICE_LABELS.prosthetic}</SelectItem>
                {PROSTHETIC_COMPONENTS.map((c) => <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>)}
              </SelectContent>
            </Select>
          </SheetRow>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1fr_15rem] border-b border-slate-700">
          <div className="md:border-l border-slate-700">
            <SheetRow label="العمر" missing={miss("age")} testId="exam-row-age">
              <Input className={cellInput} value={sheet.age} onChange={(e) => set("age", e.target.value)} inputMode="numeric" data-testid="exam-sheet-age" />
            </SheetRow>
            <SheetRow label="الوزن (كغم)" missing={miss("weight")} testId="exam-row-weight">
              <Input className={cellInput} value={sheet.weight} onChange={(e) => set("weight", e.target.value)} inputMode="decimal" data-testid="exam-sheet-weight" />
            </SheetRow>
            <SheetRow label="الطول (سم)" missing={miss("height")} testId="exam-row-height">
              <Input className={cellInput} value={sheet.height} onChange={(e) => set("height", e.target.value)} inputMode="decimal" data-testid="exam-sheet-height" />
            </SheetRow>
          </div>
          <div className="border-t md:border-t-0 border-slate-700 p-1.5 flex flex-col">
            <div className="text-center text-sm font-semibold py-1">ملاحظات</div>
            <Textarea className="flex-1 min-h-[5rem] border-0 shadow-none resize-none focus-visible:ring-1" value={sheet.generalNotes}
              onChange={(e) => set("generalNotes", e.target.value)} placeholder="اختيارية" data-testid="exam-sheet-notes" />
          </div>
        </div>

        <SheetPair>
          <SheetRow label="سبب الإصابة" missing={miss("injuryCause")} testId="exam-row-cause">
            <Input className={cellInput} value={sheet.injuryCause} onChange={(e) => set("injuryCause", e.target.value)} data-testid="exam-sheet-cause" />
          </SheetRow>
          <SheetRow label="تاريخ الإصابة" missing={miss("injuryDate")} testId="exam-row-injury-date">
            <InjuryDateField date={sheet.injuryDate} status={sheet.injuryDateStatus} testIdPrefix="exam-sheet-injury-date"
              onChange={(n) => onSheet({ ...sheet, injuryDate: n.injuryDate, injuryDateStatus: n.injuryDateStatus })} />
          </SheetRow>
        </SheetPair>

        {/*  **خانتُه هو** — «المعاينة الطبية» بدل الخانات الخمس، وتظهر في ملفّ المريض بقسم المعاينة. */}
        <SheetRow label={EXAM_SHEET_TEXT_LABEL} testId="exam-row-text">
          <Textarea className="min-h-[7rem] border-0 shadow-none focus-visible:ring-1 bg-teal-50/40" value={text}
            onChange={(e) => onText(e.target.value)} placeholder="ما وجدته في المعاينة وقرارك" data-testid="exam-sheet-text" />
        </SheetRow>
        {isProsthetic ? DEVICE_ROWS.map((f) => (
          <SheetRow key={f.key} label={f.label} testId={`exam-row-spec-${f.key}`}>
            <div className="flex items-center gap-1.5">
              <Input className={cn(cellInput, "flex-1")} value={s(rx[f.key])} onChange={(e) => setRx(f.key, e.target.value)}
                placeholder={f.placeholder} data-testid={`exam-sheet-spec-${f.key}`} />
              {(SALE_REQUIRED_SPECS.prosthetic as readonly string[]).includes(f.key) && (
                <Button type="button" size="sm" variant={rx[f.key] === NOT_APPLICABLE ? "default" : "outline"}
                  className="shrink-0 text-xs px-2 h-8" onClick={() => setRx(f.key, NOT_APPLICABLE)} data-testid={`exam-sheet-na-${f.key}`}>
                  {NOT_APPLICABLE}
                </Button>
              )}
            </div>
          </SheetRow>
        )) : (
          <SheetRow label="مواصفات المسند">
            <div className="min-h-[2.25rem] flex items-center px-1.5 text-sm text-slate-600" data-testid="exam-sheet-support-spec">
              {s(rx.supportType) || "نوعُ المسند في سطر «نوع الإصابة» أعلاه"}
            </div>
          </SheetRow>
        )}
        <SheetRow label={isProsthetic ? "المبلغ الكلي للطرف" : "المبلغ الكلي للمسند"}>
          <LockedCell text="يُؤخذ من قرار الحسم: الكلي والمدفوع والمتبقي" />
        </SheetRow>
        <SheetBand>المراجعات</SheetBand>
        <div className="px-2 py-2 text-xs text-slate-500 text-center">تظهر هنا زياراتُ المريض من سجلّ الزيارات</div>
      </SheetTable>
    </div>
  );
}
