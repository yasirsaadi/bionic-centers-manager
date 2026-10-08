// حقلان جديدان يشتركان بين «استمارة المراجع» و«تعديل مريض» (ترحيل ١١٤، §4.cq): المحافظةُ من قائمة، وتاريخُ الإصابة
// تاريخاً **أو** «منذ الولادة» **أو** «غير معروف».
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerIraq } from "@/components/DatePickerIraq";
import { GOVERNORATE_OPTIONS, INJURY_DATE_STATUSES, INJURY_DATE_STATUS_LABELS, type InjuryDateStatus } from "@shared/intake_sheet";
import { cn } from "@/lib/utils";

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
