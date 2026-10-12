// حقلان جديدان يشتركان بين «استمارة المراجع» و«تعديل مريض» (ترحيل ١١٤، §4.cq): المحافظةُ من قائمة، وتاريخُ الإصابة
// تاريخاً **أو** «منذ الولادة» **أو** «غير معروف».
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { GOVERNORATE_OPTIONS, INJURY_DATE_STATUSES, INJURY_DATE_STATUS_LABELS, type InjuryDateStatus } from "@shared/intake_sheet";
import { cn } from "@/lib/utils";
import { PenLine } from "lucide-react";

export function GovernorateSelect({ value, onChange, className, testId = "select-governorate" }: {
  value: string | null | undefined; onChange: (v: string) => void; className?: string; testId?: string;
}) {
  return (
    <Select value={value || ""} onValueChange={onChange}>
      <SelectTrigger className={className} data-testid={testId}><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
      <SelectContent>
        {GOVERNORATE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

/** تاريخٌ يُختار يُسقط الحالة، وحالةٌ تُختار تُسقط التاريخ — والخادمُ يطبّق الشيءَ نفسَه (`normalizeInjuryDate`). */
export function InjuryDateField({ date, status, onChange, testIdPrefix = "injury-date" }: {
  date: string | null | undefined; status: string | null | undefined;
  onChange: (next: { injuryDate: string; injuryDateStatus: InjuryDateStatus | null }) => void; testIdPrefix?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <DatePickerIraq
        value={status ? "" : (date || "")}
        onChange={(v) => onChange({ injuryDate: v, injuryDateStatus: null })}
        className="min-w-[10rem] flex-1"
        data-testid={`${testIdPrefix}-picker`}
      />
      {INJURY_DATE_STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(status === s ? { injuryDate: "", injuryDateStatus: null } : { injuryDate: "", injuryDateStatus: s })}
          className={cn("rounded-full border px-3 py-1.5 text-xs transition-colors",
            status === s ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50")}
          aria-pressed={status === s}
          data-testid={`${testIdPrefix}-${s}`}
        >
          {INJURY_DATE_STATUS_LABELS[s]}
        </button>
      ))}
    </div>
  );
}

/**
 * **الحقلُ الحرّ بجانب خانة الجهاز** (§4.dw — «موديل الركبة»، «ملاحظات السوكيت» …) — مربّعٌ مستقلّ بإطارٍ متقطّع ولونٍ خفيف وعنوانٍ ظاهر
 * في أوّله، فلا يُقرأ امتداداً للقائمة بجانبه (ملاحظةُ المالك في أوّل فحص: «لا فاصل ولا حدود بين المنسدلة والحقل الحرّ»). يشترك فيه
 * معاينةُ الطبيب ونافذةُ «اشترى».
 */
export function SpecCompanionField({ label, value, onChange, testId }: {
  label: string; value: string; onChange: (v: string) => void; testId: string;
}) {
  return (
    <label className={cn("flex flex-1 min-w-[11rem] h-9 items-stretch overflow-hidden rounded-md cursor-text",
      "border border-dashed border-sky-300 bg-sky-50/70 transition-colors",
      "focus-within:border-solid focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-300")}
      data-testid={`${testId}-box`}>
      <span className="flex items-center gap-1 whitespace-nowrap border-l border-dashed border-sky-300 bg-sky-100/80 px-2 text-[11px] font-semibold text-sky-800">
        <PenLine className="h-3 w-3 shrink-0" aria-hidden="true" />{label}
      </span>
      <input className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-slate-400"
        value={value} placeholder="اختياري — اكتب هنا" aria-label={label}
        onChange={(e) => onChange(e.target.value)} data-testid={testId} />
    </label>
  );
}

/** **قائمةُ خانة الجهاز** بإطارٍ ظاهر — تتميّز عن الحقل الحرّ بجانبها وعن خلايا الورقة بلا إطار. */
export const specChoiceTrigger = "h-9 rounded-md border border-slate-300 bg-white px-2.5 shadow-sm hover:border-slate-400 focus:ring-1 focus:ring-primary/40";
