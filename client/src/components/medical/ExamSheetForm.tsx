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
import { GovernorateSelect, InjuryDateField, SpecCompanionField, specChoiceTrigger } from "@/components/intake/IntakeFields";
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
import { NOT_APPLICABLE } from "@shared/device_specs";
import { companionOf, isListedChoice } from "@shared/device_spec_options";
import {
  LIMB_SPEC_KEYS, LIMB_SPEC_STORE_KEYS, dropStaleChoices, hasSideSpecs, isDerivedProstheticType, limbSlots, specChoicesForKey, limbSpecValue, limbSpecInputValue,
  normalizeLimbSpecs, notMadeOf, prostheticNameFor, sideSpecKey, slotTitle, slotsCanShare,
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
  "bothRightLimb", "bothLeftLimb", "bothRightDetail", "bothLeftDetail", "siliconePart", "siliconeSide", "siliconeNotes", "limbs",
] as const;

/** خاناتُ الجهاز بترتيب الورقة وألفاظها (`SHEET_DEVICE_ROWS`) — ومثالُ كلٍّ من تعريفها القائم. */
const DEVICE_ROWS = SHEET_DEVICE_ROWS.map((r) => ({
  ...r, placeholder: PROSTHETIC_DEVICE_SPECS.find((f) => f.key === r.key)?.placeholder ?? "",
}));

const dmy = (iso: string) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");

/** «بلا اختيار» في القائمة — قيمةٌ لا تُحفظ، تمسح الخانة. */
const CLEAR_CHOICE = "__clear";

/**
 * **خانةُ مواصفةٍ واحدة** — **مكوّنٌ خارج الورقة** فلا يُعاد تركيبُه مع كلّ حرف (فيبقى المؤشّرُ في الحقل).
 * **قائمةٌ حين لها قائمة** (قرارُ المالك ٢٠٢٦-١٠-١٢، §4.dw) بطرفها ومستواه (`options` من `specChoicesForKey` — فوق الركبة لا يرى غيرَ
 * «طرف فوق الركبة»)، و«لا ينطبق» آخرَها، **وبجانبها حقلُها الحرّ** في مربّعٍ مستقلّ («موديل الركبة» …). والقيمةُ التي ليست في القائمة
 * تُعرض بنفسها فيها لا تُمحى: «(لا يطابق مستوى البتر)» لما هو من القوائم، و«(مكتوبٌ قديماً)» لنصٍّ حرٍّ قبل اليوم.
 * **ونصٌّ حرّ** لما لا قائمةَ له (المرفقُ والكفّ، والسليكونيُّ التعويضيّ) بزرّ «لا ينطبق» كما كان.
 */
function SpecCell({ specKey, rxKey, value, options, companionValue, onPatch, testSuffix }: {
  specKey: string; rxKey: string; value: string; options: readonly string[] | null; companionValue: string;
  onPatch: (patch: Record<string, string>) => void; testSuffix: string;
}) {
  const placeholder = DEVICE_ROWS.find((r) => r.key === specKey)?.placeholder ?? "";
  if (!options) {
    return (
      <div className="flex items-center gap-1.5 min-w-0">
        <Input className={cn(cellInput, "flex-1 min-w-0")} value={value} onChange={(e) => onPatch({ [rxKey]: e.target.value })}
          placeholder={placeholder} data-testid={`exam-sheet-spec-${testSuffix}`} />
        {LIMB_SPEC_KEYS.includes(specKey) && (
          <Button type="button" size="sm" variant={value === NOT_APPLICABLE ? "default" : "outline"}
            className="shrink-0 text-xs px-2 h-8" onClick={() => onPatch({ [rxKey]: NOT_APPLICABLE })} data-testid={`exam-sheet-na-${testSuffix}`}>
            {NOT_APPLICABLE}
          </Button>
        )}
      </div>
    );
  }
  const comp = companionOf(specKey);
  //  مفتاحُ الحقل الحرّ بجهة الخانة نفسِها: `kneeJointType:left` ⟵ `kneeModel:left`.
  const compKey = comp ? rxKey.replace(specKey, comp.key) : null;
  const outside = Boolean(value) && value !== NOT_APPLICABLE && !options.includes(value);
  return (
    <div className="flex flex-wrap items-center gap-2 min-w-0 py-1">
      <Select value={value || ""} onValueChange={(v) => {
        if (v === CLEAR_CHOICE) return onPatch({ [rxKey]: "" });
        //  «لا ينطبق» لا يُبقي موديلاً لشيءٍ لا يخصّ الجهاز.
        onPatch(v === NOT_APPLICABLE && compKey ? { [rxKey]: v, [compKey]: "" } : { [rxKey]: v });
      }}>
        <SelectTrigger className={cn(specChoiceTrigger, "flex-1 min-w-[9rem] justify-between", outside && "border-amber-400 bg-amber-50")}
          data-testid={`exam-sheet-spec-${testSuffix}`}>
          <SelectValue placeholder="اختر…" />
        </SelectTrigger>
        <SelectContent>
          {outside && (
            <SelectItem value={value}>{value} {isListedChoice(specKey, value) ? "(لا يطابق مستوى البتر)" : "(مكتوبٌ قديماً)"}</SelectItem>
          )}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value={NOT_APPLICABLE}>{NOT_APPLICABLE}</SelectItem>
          {value && <SelectItem value={CLEAR_CHOICE}>— بلا اختيار —</SelectItem>}
        </SelectContent>
      </Select>
      {comp && compKey && value !== NOT_APPLICABLE && (
        <SpecCompanionField label={comp.label} value={companionValue} onChange={(v) => onPatch({ [compKey]: v })}
          testId={`exam-sheet-companion-${testSuffix}`} />
      )}
    </div>
  );
}

/**
 * **«نوع الطرف الصناعي» مبنيّاً لا يُختار** (قرارُ المالك ٢٠٢٦-١٠-١٣، §4.dw التكملة ٢) — اسمُ المستوى ثمّ الركبةُ والقدمُ والسوكيت، ويتحدّث مع كلّ
 * خانةٍ تحته. **والمكتوبُ قبل اليوم نصّاً** يبقى كما هو ويُعرض بزرّ «استعمل الاسم المبنيّ» — لا يُمحى بصمت.
 */
function DerivedTypeCell({ name, legacy, onUseBuilt, testSuffix }: {
  name: string | null; legacy: boolean; onUseBuilt: () => void; testSuffix: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 py-1.5 px-1.5 min-w-0" data-testid={`exam-sheet-type-${testSuffix}`}>
      <div dir="rtl" className="flex-1 min-w-0 text-sm font-medium leading-6 text-slate-800" data-testid={`exam-sheet-type-text-${testSuffix}`}>
        {name ?? <span className="font-normal text-slate-400">يُبنى من مستوى البتر والركبة والقدم والسوكيت</span>}
      </div>
      {legacy ? (
        <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={onUseBuilt}
          data-testid={`exam-sheet-type-use-built-${testSuffix}`}>
          مكتوبٌ قديماً — استعمل الاسم المبنيّ
        </Button>
      ) : (
        <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">تلقائي</span>
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
    //  وما اختير من القائمة ولم يعد يطابق الطرفَ الجديد يُمسح فيُختار من جديد (§4.dw) — والمكتوبُ قديماً لا يُمسّ.
    onRx(dropStaleChoices(normalizeLimbSpecs({ ...cleared, ...next })));
  };
  const slots = limbSlots(amp);
  const multi = slots.length >= 2;
  //  **«يُصنع في هذا الطلب»** (§4.de): مبتورُ طرفين يأخذ واحداً الآن — مؤشَّرٌ كلُّه مسبقاً، ولا يُزال آخرُ طرف.
  const notMade = multi ? notMadeOf(rx).filter((k) => slots.some((sl) => sl.key === k)) : [];
  const made = slots.filter((sl) => !sl.key || !notMade.includes(sl.key));
  const canShare = slotsCanShare(made);
  const identical = multi && canShare && rx.limbsIdentical === true;
  const setIdentical = (on: boolean) => onRx(normalizeLimbSpecs({ ...rx, limbsIdentical: on }));
  const setMade = (key: string, on: boolean) => {
    const next = on ? notMade.filter((k) => k !== key) : [...notMade, key];
    if (next.length >= slots.length) return;
    onRx(normalizeLimbSpecs({ ...rx, limbsNotMade: next }));
  };
  const setSpecs = (patch: Record<string, string>) => onRx({ ...rx, ...patch });
  //  **وقائمةُ كلّ خانة بطرفها ومستواه** (§4.dw) — السفليُّ لا يرى خيارات المرفق، وفوق الركبة لا يرى «تحت الركبة».
  const optionsOf = (k: string) => specChoicesForKey(made, k);
  //  **ونوعُ الطرف مبنيّاً** (§4.dw التكملة ٢) — اسمٌ لكلّ طرفٍ مصنوع (يُكتب مرّةً لطرفٍ واحد أو متماثلة)، والنصُّ القديمُ يبقى حتى يُستبدل.
  const isLegacyType = (v: string) => Boolean(v) && v !== NOT_APPLICABLE && !isListedChoice("prostheticType", v);
  const sharedTypeName = Array.from(new Set(made.map((sl) => prostheticNameFor(rx, sl, null)).filter(Boolean))).join(" · ") || null;
  //  **والخانةُ وهي تُكتب تقرأ ما كُتب بحرفه** (`limbSpecInputValue` — §4.dw التكملة ٣): القراءةُ المقصوصة كانت تُسقط المسافةَ مع كلّ حرف.
  const compOf = (k: string, side: string | null) => {
    const c = companionOf(k);
    return c ? limbSpecInputValue(rx, c.key, side) : "";
  };
  //  خاناتُ طرفٍ واحد (أو الأطراف المتماثلة): ما يخصّه بمستواه، وما كُتب في غيره بقيمةٍ حقيقية (لا يُخفى مكتوب).
  const sharedKeys = LIMB_SPEC_KEYS.filter((k) => made[0].keys.includes(k) || realSpec(rx[k]));
  //  وللأطراف المختلفة: خانةٌ تخصّ أحدَ المصنوعة على الأقلّ.
  const splitKeys = LIMB_SPEC_KEYS.filter((k) => made.some((sl) => sl.keys.includes(k) || (sl.key && realSpec(rx[sideSpecKey(k, sl.key)]))));
  const labelOf = (k: string) => DEVICE_ROWS.find((r) => r.key === k)?.label ?? k;
  //  **وصفةٌ قديمة بترتيبٍ آخر تُرتَّب مرّةً عند فتحها** — مبتورُ طرفين كُتبت خاناتُه عامّةً قبل §4.de (أو طرفٌ واحد بمفاتيح أطراف): تصير
  //  أطرافاً ظاهرةً يعدّلها الطبيبُ ويمسحها، لا قيمةً عامّةً تعود كلّما مُسح طرفُها.
  const mixed = isProsthetic && (multi && !identical
    ? LIMB_SPEC_STORE_KEYS.some((k) => s(rx[k]))
    : hasSideSpecs(rx));
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
            {multi && (
              <SheetRow label={slots.length > 2 ? "الأطراف" : "الطرفان"} testId="exam-row-limbs">
                <div className="py-1 space-y-1.5">
                  {/*  **يُصنع في هذا الطلب** — لكلّ طرف؛ والمواصفاتُ (والسعرُ عند «اشترى») للمؤشَّر وحده. */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {slots.map((sl) => (
                      <label key={sl.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <input type="checkbox" className="h-4 w-4" checked={!notMade.includes(sl.key!)}
                          disabled={!notMade.includes(sl.key!) && made.length === 1}
                          onChange={(e) => setMade(sl.key!, e.target.checked)} data-testid={`exam-sheet-limb-made-${sl.key}`} />
                        {slotTitle(sl)}
                      </label>
                    ))}
                  </div>
                  <div className="text-[11px] text-slate-500">المؤشَّرُ يُصنع في هذا الطلب — أزِل التأشير عن طرفٍ يُصنع لاحقاً.</div>
                  {made.length >= 2 && (canShare ? (
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" className="h-4 w-4" checked={identical} onChange={(e) => setIdentical(e.target.checked)}
                        data-testid="exam-sheet-limbs-identical" />
                      {made.length > 2 ? "الأطراف متماثلة — أكتب المواصفات مرّةً للأطراف كلّها" : "الطرفان متماثلان — أكتب المواصفات مرّةً للطرفين"}
                    </label>
                  ) : (
                    <div className="text-xs text-slate-600" data-testid="exam-sheet-limbs-differ">الأطرافُ مختلفة — لكلّ طرفٍ مواصفاتُه</div>
                  ))}
                </div>
              </SheetRow>
            )}
            {(!multi || identical) ? sharedKeys.map((k) => (
              <SheetRow key={k} label={labelOf(k)} testId={`exam-row-spec-${k}`}>
                {k === "prostheticType" && made.every(isDerivedProstheticType)
                  ? <DerivedTypeCell name={sharedTypeName} legacy={isLegacyType(s(rx.prostheticType))}
                      onUseBuilt={() => setSpecs({ prostheticType: "" })} testSuffix="shared" />
                  : <SpecCell specKey={k} rxKey={k} value={s(rx[k])} options={optionsOf(k)} companionValue={compOf(k, null)} onPatch={setSpecs} testSuffix={k} />}
              </SheetRow>
            )) : splitKeys.map((k) => (
              <SheetRow key={k} label={labelOf(k)} testId={`exam-row-spec-${k}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-1 py-0.5">
                  {made.map((sl) => {
                    const side = sl.key as string;
                    const applies = sl.keys.includes(k) || realSpec(rx[sideSpecKey(k, side)]);
                    return (
                      <div key={side} className="min-w-0" data-testid={`exam-cell-spec-${k}-${side}`}>
                        <div className="text-[11px] text-slate-500 px-1.5">{slotTitle(sl)}</div>
                        {!applies
                          ? <div className="h-9 flex items-center px-1.5 text-xs text-slate-400">{NOT_APPLICABLE}</div>
                          : k === "prostheticType" && isDerivedProstheticType(sl)
                            ? <DerivedTypeCell name={prostheticNameFor(rx, sl, side)} legacy={isLegacyType(limbSpecValue(rx, k, side))}
                                onUseBuilt={() => setSpecs({ [sideSpecKey(k, side)]: "" })} testSuffix={side} />
                            : <SpecCell specKey={k} rxKey={sideSpecKey(k, side)} value={limbSpecInputValue(rx, k, side)} options={optionsOf(sideSpecKey(k, side))}
                                companionValue={compOf(k, side)} onPatch={setSpecs} testSuffix={`${k}-${side}`} />}
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
