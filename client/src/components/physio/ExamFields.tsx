// **خاناتُ معاينة العلاج الطبيعي** — مشتركةٌ بين الاستمارة الثانية (`ExamV2Form`) والثالثة (`ExamV3Form`) ولوح أسئلة Bionic AI (§4.hd):
// الخانةُ نفسُها والقيمُ نفسُها من `shared/physio_exam_v2.ts`، فما يُكتب جواباً في اللوح يُكتب كما لو كُتب في المعاينة.
import type { ReactNode } from "react";
import { examV2ValueText, type V2Field, type V2Value } from "@shared/physio_exam_v2";
import { cn } from "@/lib/utils";

export const segBtn = (on: boolean, tone: "accent" | "bad" | "ok" = "accent") => cn(
  "rounded-md border px-2.5 py-1 text-sm leading-6 transition-colors",
  on
    ? tone === "bad" ? "bg-red-600 border-red-600 text-white" : tone === "ok" ? "bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold"
      : "bg-teal-50 border-teal-700 text-teal-800 font-semibold"
    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50",
);
export const inputCls = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 min-w-0";

/** قائمةٌ منسدلة حين تكثر الخيارات أو تطول — فلا تفيض الشاشةُ بعرض ٣٩٠ نقطة. */
export const asSelect = (f: V2Field) => (f.options?.length ?? 0) > 5 || (f.options ?? []).some((o) => o.ar.length > 16);

export function Card({ title, sub, children, testId, tone }: { title: ReactNode; sub?: ReactNode; children: ReactNode; testId: string; tone?: "module" | "flags" }) {
  return (
    <section className={cn("rounded-xl border bg-white p-3 md:p-4 flex flex-col gap-3 min-w-0", tone === "flags" ? "border-red-200" : "border-slate-200")} data-testid={testId}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-base text-slate-900">{title}</h3>
        {sub && <span className="text-xs text-slate-500">{sub}</span>}
      </div>
      <div className={cn("min-w-0", tone === "module" && "rounded-lg border border-dashed border-teal-600 p-3")}>{children}</div>
    </section>
  );
}

export function FieldBox({ label, required, missing, hint, children, testId, inline }: {
  label: string; required: boolean; missing: boolean; hint?: ReactNode; children: ReactNode; testId: string;
  /** السؤالُ وأزرارُه في سطرٍ واحد حين يتّسع (ورقةُ السلامة — §4.hd)، ويلتفّ تحته حين لا يتّسع. */
  inline?: boolean;
}) {
  return (
    <div className={cn("min-w-0 rounded-md p-1.5", inline ? "flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-slate-100 last:border-b-0" : "flex flex-col gap-1",
      missing && "bg-red-50 ring-1 ring-red-300")} data-testid={testId} data-missing={missing ? "1" : undefined}>
      <label className={cn("text-sm font-semibold", missing ? "text-red-700" : "text-slate-800")}>
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <span className={cn("text-xs text-teal-700", inline && "basis-full")}>{hint}</span>}
    </div>
  );
}

export function FieldInput({ f, value, onChange, testId }: { f: V2Field; value: V2Value; onChange?: (v: V2Value) => void; testId: string }) {
  if (!onChange) {
    const t = examV2ValueText(f, value, "ar");
    return <span className={cn("text-sm", t ? "font-bold text-slate-900" : "text-slate-400")} data-testid={`${testId}-value`}>{t || "—"}</span>;
  }
  const opts = f.options ?? [];
  if (f.kind === "choice" || f.kind === "yesno") {
    if (asSelect(f)) {
      return (
        <select className={inputCls} value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || null)} data-testid={testId}>
          <option value="">— اختر —</option>
          {opts.map((o) => <option key={o.code} value={o.code}>{o.ar}</option>)}
        </select>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={f.ar}>
        {opts.map((o) => (
          <button key={o.code} type="button" aria-pressed={value === o.code} className={segBtn(value === o.code)}
            onClick={() => onChange(value === o.code ? null : o.code)} data-testid={`${testId}-${o.code}`}>{o.ar}</button>
        ))}
      </div>
    );
  }
  if (f.kind === "multi") {
    const list = Array.isArray(value) ? value : [];
    return (
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={f.ar}>
        {opts.map((o) => {
          const on = list.includes(o.code);
          const toggle = () => {
            let next = on ? list.filter((c) => c !== o.code) : [...list, o.code];
            if (f.exclusive) next = o.code === f.exclusive && !on ? [f.exclusive] : next.filter((c) => o.code === f.exclusive || c !== f.exclusive);
            onChange(opts.map((x) => x.code).filter((c) => next.includes(c)));
          };
          return <button key={o.code} type="button" aria-pressed={on} className={segBtn(on)} onClick={toggle} data-testid={`${testId}-${o.code}`}>{o.ar}</button>;
        })}
      </div>
    );
  }
  if (f.kind === "date") {
    return <input type="date" className={cn(inputCls, "max-w-[12rem]")} dir="ltr" value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value || null)} data-testid={testId} />;
  }
  if (f.kind === "int" || f.kind === "num") {
    return (
      <div className="flex items-center gap-1.5">
        <input className={cn(inputCls, "max-w-[8rem]")} dir="ltr" inputMode={f.kind === "int" ? "numeric" : "decimal"}
          value={value === null || value === undefined ? "" : String(value)} data-testid={testId}
          onChange={(e) => {
            //  رقمٌ مكتمل ⟵ رقم؛ وما يُكتب بعدُ («4.» أو «٤٫») يبقى نصّاً كما كُتب — والخادمُ يطبّع ويفحص.
            const raw = e.target.value.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace("٫", ".").trim();
            if (raw === "") return onChange(null);
            onChange(/^\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw);
          }} />
        {f.unit && <span className="text-xs text-slate-500">{f.unit}</span>}
      </div>
    );
  }
  return <input className={inputCls} dir="auto" value={typeof value === "string" ? value : ""} onChange={(e) => onChange(e.target.value || null)} data-testid={testId} />;
}

