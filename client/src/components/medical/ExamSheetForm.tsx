// **معاينةُ الطبيب على «استمارة المراجع» نفسِها** (§4.cq — المرحلةُ الثانية ب، ٢٠٢٦-١٠-٠٨).
//
// قرارُ المالك: «أن تكون معاينةُ الطبيب نفسَ الورقة تماماً التي ملأها الاستعلامات، وإزالةُ الحقول الزائدة، ووضعُ حقلٍ واحد اسمُه
// المعاينة الطبية ويظهر عند ملف المريض». فهذه الورقةُ بأسطرها كما في شاشة الاستعلامات (`IntakeSheetCreate.tsx`) وبإطارها نفسِه
// (`IntakeSheetFrame.tsx`) — **مفتوحةً للطبيب كلُّها**: حقولُ الاستعلامات يعدّلها (وتُدقَّق في الخادم باسمه)، و«المعاينة الطبية»
// خانةٌ واحدة بدل الخمس، وخاناتُ الجهاز الخمس بترتيب الورقة ومعها «لا ينطبق». والمبلغُ وجدولُ المراجعات مقفولان كما عند الاستعلامات.
// والحالةُ كلُّها يملكها `NewExamDialog` (التوقيعُ، والجهاز، والمفتاحُ، والإرسال) — هذه شاشةٌ لا منطقَ حفظٍ فيها.
import { useEffect } from "react";
import { RequestedPartsPicker } from "@/components/intake/RequestedPartsPicker";
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
import {
  LIMB_SPEC_KEYS, limbSlots, limbSpecValue, normalizeLimbSpecs, sideSpecKey, slotTitle, slotsCanShare, type LimbSide,
} from "@shared/limb_specs";
import { PRIOR_CENTER_HISTORY_LABEL } from "@shared/service_path";
import { cn } from "@/lib/utils";
import type { PrescriptionValue } from "./PrescriptionFields";

/** حقولُ الاستعلامات كما تصل من باب المعاينة (`sheet`) وتُرسَل إليه — بأسماء أعمدة `patients`. */
export interface ExamSheetValues {
  name: string; phone: string; governorate: string; address: string;
  referralSource: string; referralSubSource: string; hadPriorCenterHistory: boolean | null;
  age: string; weight: string; height: string; injuryCause: string;
  injuryDate: string; injuryDateStatus: InjuryDateStatus | null; generalNotes: string;
  /** «سبب المراجعة» — في استمارة العلاج الطبيعي وحدها (§4.da)؛ ورقةُ الأجهزة تحمله كما وصل ولا تعرضه. */
  presentingComplaint: string;
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
    generalNotes: s(r.generalNotes), presentingComplaint: s(r.presentingComplaint),
  };
}

/** **خليةُ «الجهة المحوِّل منها»** — مشتركةٌ بين ورقة الأجهزة واستمارة العلاج الطبيعي، فلا تنحرف القائمتان. */
export function ReferralCell({ sheet, onSheet, testIdPrefix }: { sheet: ExamSheetValues; onSheet: (v: ExamSheetValues) => void; testIdPrefix: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Select value={sheet.referralSource} onValueChange={(v) => onSheet({ ...sheet, referralSource: v, referralSubSource: v === REFERRAL_OTHER_PERSON ? sheet.referralSubSource : "" })}>
        <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid={`${testIdPrefix}-referral`}><SelectValue placeholder="اختر الجهة" /></SelectTrigger>
        <SelectContent>
          {[...REFERRAL_SOURCES, ...(sheet.referralSource && !(REFERRAL_SOURCES as readonly string[]).includes(sheet.referralSource) ? [sheet.referralSource] : [])]
            .map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      {sheet.referralSource === REFERRAL_OTHER_PERSON && (
        <Select value={sheet.referralSubSource} onValueChange={(v) => onSheet({ ...sheet, referralSubSource: v })}>
          <SelectTrigger className={cn(cellInput, "min-w-[11rem] flex-1")} data-testid={`${testIdPrefix}-referral-sub`}><SelectValue placeholder="كيف عرف الشخص الآخر بالمركز؟" /></SelectTrigger>
          <SelectContent>
            {[...REFERRAL_SUB_SOURCES, ...(sheet.referralSubSource && !(REFERRAL_SUB_SOURCES as readonly string[]).includes(sheet.referralSubSource) ? [sheet.referralSubSource] : [])]
              .map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
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

/** خانةُ مواصفةٍ واحدة بزرّ «لا ينطبق» — **مكوّنٌ خارج الورقة** فلا يُعاد تركيبُه مع كلّ حرف (فيبقى المؤشّرُ في الحقل). */
function SpecCell({ specKey, rxKey, value, onSet, testSuffix }: {
  specKey: string; rxKey: string; value: string; onSet: (k: string, v: string) => void; testSuffix: string;
}) {
  const placeholder = DEVICE_ROWS.find((r) => r.key === specKey)?.placeholder ?? "";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Input className={cn(cellInput, "flex-1 min-w-0")} value={value} onChange={(e) => onSet(rxKey, e.target.value)}
        placeholder={placeholder} data-testid={`exam-sheet-spec-${testSuffix}`} />
      {(SALE_REQUIRED_SPECS.prosthetic as readonly string[]).includes(specKey) && (
        <Button type="button" size="sm" variant={value === NOT_APPLICABLE ? "default" : "outline"}
          className="shrink-0 text-xs px-2 h-8" onClick={() => onSet(rxKey, NOT_APPLICABLE)} data-testid={`exam-sheet-na-${testSuffix}`}>
          {NOT_APPLICABLE}
        </Button>
      )}
    </div>
  );
}

const realSpec = (v: unknown) => typeof v === "string" && v.trim() !== "" && v.trim() !== NOT_APPLICABLE;

export function ExamSheetForm({
  specialty, onSpecialty, deviceSpecialties, branchName, registeredAt,
  sheet, onSheet, rx, onRx, text, onText, requestedItems, onRequestedItems, missing,
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
  /** «المطلوب» مربّعاتُ اختيار (§4.ct) — `null` حين لا جهازَ بعينه (فلا يُعرَض للتعديل). */
  requestedItems: string[] | null;
  onRequestedItems: (v: string[]) => void;
  missing: string[];
}) {
  const miss = (k: string) => missing.includes(k);
  const set = <K extends keyof ExamSheetValues>(k: K, v: ExamSheetValues[K]) => onSheet({ ...sheet, [k]: v });
  const setRx = (k: string, v: unknown) => onRx({ ...rx, [k]: v });
  const isProsthetic = specialty === "prosthetic";
  const amp: AmputationParts = Object.fromEntries(AMP_KEYS.filter((k) => rx[k] !== undefined).map((k) => [k, rx[k]]));
  //  **وتغييرُ البتر يرتّب خاناتِ الطرف معه** (§4.de — `normalizeLimbSpecs`): ما لا يخصّ المستوى الجديد يُحذف، وطرفان بخاناتٍ لكلّ جهة.
  const setAmp = (next: AmputationParts) => {
    const cleared: PrescriptionValue = { ...rx };
    for (const k of AMP_KEYS) delete cleared[k];
    onRx(normalizeLimbSpecs({ ...cleared, ...next }));
  };
  const slots = limbSlots(amp);
  const bilateral = slots.length === 2;
  const canShare = slotsCanShare(slots);
  const identical = bilateral && canShare && rx.limbsIdentical === true;
  const setIdentical = (on: boolean) => onRx(normalizeLimbSpecs({ ...rx, limbsIdentical: on }));
  const setSpec = (k: string, v: string) => setRx(k, v);
  //  خاناتُ طرفٍ واحد (أو الطرفين المتماثلين): ما يخصّه بمستواه، وما كُتب في غيره بقيمةٍ حقيقية (لا يُخفى مكتوب).
  const sharedKeys = LIMB_SPEC_KEYS.filter((k) => slots[0].keys.includes(k) || realSpec(rx[k]));
  //  وللطرفين المختلفين: خانةٌ تخصّ أحدَهما على الأقلّ.
  const splitKeys = LIMB_SPEC_KEYS.filter((k) => slots.some((sl) => sl.keys.includes(k) || (sl.side && realSpec(rx[sideSpecKey(k, sl.side)]))));
  const labelOf = (k: string) => DEVICE_ROWS.find((r) => r.key === k)?.label ?? k;
  //  **وصفةٌ قديمة بترتيبٍ آخر تُرتَّب مرّةً عند فتحها** — مبتورُ طرفين كُتبت خاناتُه عامّةً قبل §4.de (أو طرفٌ واحد بمفاتيح جهات): تصير
  //  جهاتٍ ظاهرةً يعدّلها الطبيبُ ويمسحها، لا قيمةً عامّةً تعود كلّما مُسحت جهتُها.
  const mixed = isProsthetic && (bilateral && !identical
    ? LIMB_SPEC_KEYS.some((k) => s(rx[k]))
    : LIMB_SPEC_KEYS.some((k) => (["right", "left"] as const).some((sd) => rx[sideSpecKey(k, sd)] !== undefined)));
  useEffect(() => {
    if (mixed) onRx(normalizeLimbSpecs(rx));
  }, [mixed]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <ReferralCell sheet={sheet} onSheet={onSheet} testIdPrefix="exam-sheet" />
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
        {isProsthetic && requestedItems !== null && (
          <SheetRow label="المطلوب" testId="exam-row-requested">
            <RequestedPartsPicker className="px-1.5" value={requestedItems} onChange={onRequestedItems} testId="exam-sheet-requested" />
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
        {/*  **خاناتُ الطرف بحسب البتر** (§4.de، ملاحظاتُ المالك ٢٠٢٦-١٠-١٠): تحت الركبة بلا ركبة، والسليكونيُّ نوعُه وسيليكونُه،
            والعلويُّ بلا ركبةٍ ولا قدم. ولمبتور الطرفين خاناتُ كلّ جهة، ومربّعُ «متماثلان» يكتبها مرّةً للطرفين. */}
        {isProsthetic ? (
          <>
            {bilateral && (
              <SheetRow label="الطرفان" testId="exam-row-limbs">
                <div className="py-1 space-y-1">
                  {canShare ? (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="h-4 w-4" checked={identical} onChange={(e) => setIdentical(e.target.checked)}
                        data-testid="exam-sheet-limbs-identical" />
                      الطرفان متماثلان — أكتب المواصفات مرّةً للطرفين
                    </label>
                  ) : (
                    <div className="text-xs text-slate-600" data-testid="exam-sheet-limbs-differ">مستويا البتر مختلفان — لكلّ طرفٍ مواصفاتُه</div>
                  )}
                  <div className="text-xs text-slate-500">{slots.map(slotTitle).join(" · ")}</div>
                </div>
              </SheetRow>
            )}
            {(!bilateral || identical) ? sharedKeys.map((k) => (
              <SheetRow key={k} label={labelOf(k)} testId={`exam-row-spec-${k}`}>
                <SpecCell specKey={k} rxKey={k} value={s(rx[k])} onSet={setSpec} testSuffix={k} />
              </SheetRow>
            )) : splitKeys.map((k) => (
              <SheetRow key={k} label={labelOf(k)} testId={`exam-row-spec-${k}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 py-0.5">
                  {slots.map((sl) => {
                    const side = sl.side as LimbSide;
                    const applies = sl.keys.includes(k) || realSpec(rx[sideSpecKey(k, side)]);
                    return (
                      <div key={side} className="min-w-0" data-testid={`exam-cell-spec-${k}-${side}`}>
                        <div className="text-[11px] text-slate-500 px-1.5">{slotTitle(sl)}</div>
                        {applies
                          ? <SpecCell specKey={k} rxKey={sideSpecKey(k, side)} value={limbSpecValue(rx, k, side)} onSet={setSpec} testSuffix={`${k}-${side}`} />
                          : <div className="h-9 flex items-center px-1.5 text-xs text-slate-400">{NOT_APPLICABLE}</div>}
                      </div>
                    );
                  })}
                </div>
              </SheetRow>
            ))}
          </>
        ) : (
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
