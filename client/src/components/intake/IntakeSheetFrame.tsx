// **إطارُ «استمارة المراجع»** (§4.cq) — الترويسةُ والجدولُ بهيئة الورقة. تقرؤه شاشةُ الاستعلامات اليوم، ومعاينةُ الطبيب
// وعرضُ الملفّ والطباعةُ في المرحلتين التاليتين، فيبقى الشكلُ واحداً.
// والترويسةُ باسم الفرع: **كلُّ الفروع «بايونك» إلّا كربلاء «الوارث»** — ولكلٍّ شعارُه (`intakeHeader`).
import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { intakeHeader } from "@shared/intake_sheet";
import { cn } from "@/lib/utils";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

export function IntakeSheetHeader({ branchName }: { branchName: string | null | undefined }) {
  const h = intakeHeader(branchName);
  return (
    <div data-testid="intake-header" data-brand={h.brand}>
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border-2 border-slate-800 px-3 py-2 md:px-5 md:py-3 text-center font-bold text-[#1e3a8a] leading-relaxed max-w-[60%]">
          <div className="text-sm md:text-lg">{h.centerName}</div>
          {h.city && <div className="text-sm md:text-base mt-1" data-testid="intake-city">{h.city}</div>}
        </div>
        <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt={h.brand === "warith" ? "شعار الوارث" : "شعار بايونك"}
          className="h-20 w-20 md:h-28 md:w-28 object-contain shrink-0" data-testid="intake-logo" />
      </div>
      <h1 className="text-center text-xl md:text-2xl font-bold text-red-600 my-3 md:my-5">استمارة مراجع</h1>
    </div>
  );
}

/** صفٌّ بعنوانٍ وقيمة — وعلى الهاتف يصير العنوانُ فوق القيمة. `missing` يحيطه بالأحمر. */
export function SheetRow({ label, children, missing, className, testId }: {
  label: ReactNode; children: ReactNode; missing?: boolean; className?: string; testId?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-[9.5rem_1fr] border-b border-slate-700 last:border-b-0", missing && "bg-red-50", className)}
      data-testid={testId} data-missing={missing ? "1" : undefined}>
      <div className={cn("px-2 py-1.5 sm:py-2 text-sm font-semibold text-slate-800 sm:border-l border-slate-700 bg-slate-50/60 sm:bg-transparent flex items-center",
        missing && "text-red-700")}>{label}</div>
      <div className="px-1.5 py-1 min-w-0">{children}</div>
    </div>
  );
}

/** صفّان في سطرٍ واحد على الشاشة العريضة (الاسم والتاريخ، الهاتف والمحافظة…). */
export function SheetPair({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 border-b border-slate-700 [&>*]:border-b-0 md:[&>*:first-child]:border-l md:[&>*:first-child]:border-slate-700">{children}</div>;
}

/** خانةٌ مقفولةٌ على الاستعلامات — تقول لمَن هي. */
export function LockedCell({ text, tall, testId }: { text: string; tall?: boolean; testId?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-2 rounded bg-slate-100 text-slate-500 text-xs md:text-sm italic px-2 text-center",
      tall ? "min-h-[5.5rem]" : "min-h-[2.25rem]")} data-testid={testId}>
      <Lock className="w-3.5 h-3.5 shrink-0" /> {text}
    </div>
  );
}

/** الجدولُ الخارجيّ بحدّه الأسود كما في الورقة. */
export function SheetTable({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-2 border-slate-700 bg-white", className)}>{children}</div>;
}

export function SheetBand({ children }: { children: ReactNode }) {
  return <div className="bg-[#9dc3e6] text-center font-bold text-slate-900 py-1.5 border-b border-slate-700">{children}</div>;
}

/** أصنافُ حقلٍ داخل خانة الجدول — بلا حدٍّ يكرّر حدَّ الخانة. */
export const cellInput = "h-9 border-0 shadow-none bg-transparent focus-visible:ring-1 focus-visible:ring-primary/40 rounded-sm px-1.5";
