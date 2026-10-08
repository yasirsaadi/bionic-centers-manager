// **«المطلوب» مربّعاتُ اختيار** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.ct): «مراجعٌ يحتاج قالباً وسليكوناً، أو قدماً وقالباً وسليكوناً».
// الطرفُ الكامل وحده، أو جزءٌ فأكثر — والقاعدةُ واحدةٌ للشاشات الثلاث (`toggleRequestedItem`): الاستمارة، ومعاينة الطبيب، والطلب الجديد.
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS, PROSTHETIC_COMPONENTS, toggleRequestedItem, type RequestedItem,
} from "@shared/prosthetic_parts";

export function RequestedPartsPicker({ value, onChange, testId = "requested-parts", className }: {
  value: readonly string[];
  onChange: (next: RequestedItem[]) => void;
  testId?: string;
  className?: string;
}) {
  const chip = (item: RequestedItem, label: string) => {
    const on = value.includes(item);
    return (
      <button key={item} type="button" role="checkbox" aria-checked={on}
        onClick={() => onChange(toggleRequestedItem(value, item))}
        className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs sm:text-sm transition-colors",
          on ? "border-primary bg-primary text-primary-foreground" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")}
        data-testid={`${testId}-${item}`}>
        {on && <Check className="h-3.5 w-3.5" />}{label}
      </button>
    );
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 py-1", className)} data-testid={testId}>
      {chip(FULL_DEVICE, FULL_DEVICE_LABELS.prosthetic)}
      <span className="mx-1 text-xs text-slate-400">أو الأجزاء:</span>
      {PROSTHETIC_COMPONENTS.map((c) => chip(c, COMPONENT_LABELS[c]))}
    </div>
  );
}
