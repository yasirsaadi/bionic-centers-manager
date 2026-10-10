// **استمارةُ التقييم الأوّليّ للعلاج الطبيعي** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩) — بهيئة الورقة الأصلية وترتيبها ولغتها.
//
// مكوّنٌ واحد للحالتين: **تحريرٌ** في نافذة المعاينة (`onChange`) و**قراءةٌ** في ملفّ المريض وطباعته (بلا `onChange`) — فلا تختلف
// الورقةُ المكتوبة عن المقروءة. والخاناتُ والألفاظُ والقاعدةُ كلُّها من `shared/physio_initial_assessment.ts`؛ هنا العرضُ وحده.
// والإنجليزيةُ أوّلاً كالأصل، وزرُّ «عربي» يعرض الترجمة (`lang`).
import type { ReactNode } from "react";
import {
  PT_AGGRAVATING, PT_ALLERGIES, PT_ASSIST_LEGEND, PT_ASHWORTH_GRADES, PT_ASHWORTH_LEGEND, PT_ASHWORTH_REGIONS, PT_FORM_CODE, PT_FUNCTIONAL,
  PT_INVESTIGATIONS, PT_LABELS, PT_LOCATIONS, PT_MMT_GRADES, PT_MMT_GROUPS, PT_MMT_LEGEND, PT_PLAN_ITEMS, PT_RELIEVING,
  PT_SENSATION, PT_SYMPTOMS, PT_TRENDS, PT_YES_NO,
  type Lang, type Opt, type PhysioInitialAssessment,
} from "@shared/physio_initial_assessment";
import { cn } from "@/lib/utils";

type Patch = (p: Partial<PhysioInitialAssessment>) => void;

/** خانةُ اختيار — مربّعٌ حقيقيّ في التحرير، و☑/☐ في القراءة. */
function Box({ label, on, onToggle, testId }: { label: string; on: boolean; onToggle?: () => void; testId?: string }) {
  if (!onToggle) {
    return <span className={cn("whitespace-nowrap", on ? "font-bold text-emerald-800" : "text-slate-500")} data-on={on ? "1" : undefined}>{on ? "☑" : "☐"} {label}</span>;
  }
  return (
    <label className={cn("inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer rounded px-1 py-0.5", on && "font-semibold text-emerald-900")}>
      <input type="checkbox" className="h-4 w-4 accent-emerald-700" checked={on} onChange={onToggle} data-testid={testId} />
      {label}
    </label>
  );
}

function Row({ label, children, missing, testId }: { label: ReactNode; children: ReactNode; missing?: boolean; testId?: string }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-[11rem_1fr] print:grid-cols-[11rem_1fr] border-b border-slate-400 last:border-b-0 print:break-inside-avoid", missing && "bg-red-50")}
      data-testid={testId} data-missing={missing ? "1" : undefined}>
      <div className={cn("px-2 py-1.5 print:py-0.5 font-semibold text-sm sm:border-e print:border-e border-slate-400 bg-slate-50/70 sm:bg-transparent print:bg-transparent", missing && "text-red-700")}>{label}</div>
      <div className="px-2 py-1.5 print:py-0.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm min-w-0 [overflow-wrap:anywhere]">{children}</div>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[7.5rem_1fr] print:grid-cols-[7.5rem_1fr] border-b border-slate-700 print:break-inside-avoid">
      <div className="px-2 py-1.5 font-bold text-sm flex items-center sm:justify-center sm:text-center bg-slate-100 sm:bg-transparent print:bg-transparent sm:border-e print:border-e border-slate-700">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Band({ children }: { children: ReactNode }) {
  return <div className="bg-slate-300/80 text-center font-bold text-sm text-slate-900 py-1.5 px-2 border-b border-slate-700 print:break-after-avoid">{children}</div>;
}

const FillIn = ({ v }: { v: string | number | null | undefined }) =>
  v === null || v === undefined || v === "" ? <span className="text-slate-400">—</span> : <span className="font-bold">{v}</span>;

const inputCls = "h-8 rounded border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600";

export function InitialAssessmentSheet({
  value, onChange, lang, onset, missing = [], testIdPrefix = "pt",
}: {
  value: PhysioInitialAssessment;
  /** غيابُه = قراءةٌ فقط. */
  onChange?: (next: PhysioInitialAssessment) => void;
  lang: Lang;
  /** «تاريخ بداية الإصابة» — هو «تاريخ الإصابة» في الاستمارة، يُعرَض هنا ولا يُكتب. */
  onset: string | null;
  missing?: string[];
  testIdPrefix?: string;
}) {
  const edit = Boolean(onChange);
  const L = (k: keyof typeof PT_LABELS) => PT_LABELS[k][lang];
  const t = (o: Opt) => o[lang];
  const miss = (k: string) => missing.includes(k);
  const patch: Patch = (p) => onChange?.({ ...value, ...p });
  const tid = (s: string) => `${testIdPrefix}-${s}`;

  const multi = (key: "investigations" | "allergy" | "location" | "aggravating" | "relieving" | "plan", list: readonly Opt[]) =>
    list.map((o) => {
      const on = value[key].includes(o.code);
      const toggle = () => {
        let next = on ? value[key].filter((c) => c !== o.code) : [...value[key], o.code];
        //  «لا حساسية معروفة» وحدها — كالقاعدة في الخادم.
        if (key === "allergy") next = o.code === "nka" && !on ? ["nka"] : next.filter((c) => o.code === "nka" || c !== "nka");
        patch({ [key]: list.map((x) => x.code).filter((c) => next.includes(c)) } as Partial<PhysioInitialAssessment>);
      };
      return <Box key={o.code} label={t(o)} on={on} onToggle={edit ? toggle : undefined} testId={tid(`${key}-${o.code}`)} />;
    });
  const single = (key: "trend" | "previousTherapy" | "symptoms" | "sensation", list: readonly Opt[]) =>
    list.map((o) => {
      const on = value[key] === o.code;
      return <Box key={o.code} label={t(o)} on={on} testId={tid(`${key}-${o.code}`)}
        onToggle={edit ? () => patch({ [key]: on ? null : o.code } as Partial<PhysioInitialAssessment>) : undefined} />;
    });
  const text = (key: "pastHistory" | "allergySpecify" | "locationOther" | "relievingOther" | "sensationRegions", wide = true) =>
    edit
      ? <input className={cn(inputCls, wide ? "flex-1 min-w-[10rem]" : "w-40")} value={value[key] ?? ""} dir="auto"
          onChange={(e) => patch({ [key]: e.target.value || null } as Partial<PhysioInitialAssessment>)} data-testid={tid(key)} />
      : <FillIn v={value[key]} />;
  const pain = (key: "painBest" | "painWorst") =>
    edit
      ? (
        <select className={cn(inputCls, "w-16")} value={value[key] ?? ""} data-testid={tid(key)}
          onChange={(e) => patch({ [key]: e.target.value === "" ? null : Number(e.target.value) } as Partial<PhysioInitialAssessment>)}>
          <option value="">—</option>
          {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
        </select>
      )
      : <FillIn v={value[key]} />;
  const grade = (kind: "mmt" | "ashworth", row: string, side: "r" | "l") => {
    const cell = value[kind][row] ?? { r: null, l: null };
    const grades = (kind === "mmt" ? PT_MMT_GRADES : PT_ASHWORTH_GRADES) as readonly string[];
    if (!edit) return <FillIn v={cell[side]} />;
    return (
      <select className={cn(inputCls, "w-16")} value={cell[side] ?? ""} data-testid={tid(`${kind}-${row}-${side}`)}
        onChange={(e) => patch({ [kind]: { ...value[kind], [row]: { ...cell, [side]: e.target.value || null } } } as Partial<PhysioInitialAssessment>)}>
        <option value="">—</option>
        {grades.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
    );
  };
  const fn = (row: string, field: "assist" | "notes") => {
    const cell = value.functional[row] ?? { assist: null, notes: null };
    if (!edit) return <FillIn v={cell[field]} />;
    return <input className={cn(inputCls, "w-full")} value={cell[field] ?? ""} dir="auto" data-testid={tid(`fn-${row}-${field}`)}
      onChange={(e) => patch({ functional: { ...value.functional, [row]: { ...cell, [field]: e.target.value || null } } })} />;
  };
  const onsetText = onset === "congenital" ? (lang === "ar" ? "منذ الولادة" : "Since birth")
    : onset === "unknown" ? (lang === "ar" ? "غير معروف" : "Unknown")
      : onset;

  const th = "border-b border-e last:border-e-0 border-slate-400 px-2 py-1 bg-slate-50 font-semibold text-sm";
  const td = "border-b border-e last:border-e-0 border-slate-400 px-2 py-1 text-sm";

  return (
    <div dir={lang === "en" ? "ltr" : "rtl"} lang={lang} className="bg-white" data-testid={tid("sheet")} data-form={PT_FORM_CODE}>
      <div className="bg-slate-300/80 font-bold text-sm text-slate-900 py-1.5 px-2 border-b border-slate-700 flex flex-wrap items-center justify-center gap-3">
        <span>{L("sectionA")}</span>
        <span className="ms-auto font-semibold">
          <Box label={L("na")} on={value.sectionANa} testId={tid("na")} onToggle={edit ? () => patch({ sectionANa: !value.sectionANa }) : undefined} />
        </span>
      </div>

      {value.sectionANa && edit ? (
        <div className="px-3 py-3 text-sm text-slate-600 border-b border-slate-700" data-testid={tid("na-note")}>
          {lang === "ar" ? "القسم الأوّل لا ينطبق على هذا المريض — يُطبع مؤشَّراً «لا ينطبق»." : "Section A marked N/A for this patient."}
        </div>
      ) : (
        <>
          <Row label={L("investigations")}>{multi("investigations", PT_INVESTIGATIONS)}</Row>
          <Row label={L("trend")}>{single("trend", PT_TRENDS)}</Row>
          <Group label={L("history")}>
            <Row label={L("onset")}>
              <FillIn v={onsetText} />
              {edit && <span className="text-xs text-slate-500">{lang === "ar" ? "يُعدَّل من «تاريخ الإصابة» أعلى الاستمارة" : "Edit it in «تاريخ الإصابة» above"}</span>}
            </Row>
            <Row label={L("surgery")} missing={miss("surgeryDate")}>
              {edit
                ? <input type="date" className={cn(inputCls, "w-44")} value={value.surgeryDate ?? ""} dir="ltr"
                    onChange={(e) => patch({ surgeryDate: e.target.value || null })} data-testid={tid("surgeryDate")} />
                : <FillIn v={value.surgeryDate} />}
            </Row>
            <Row label={L("pastHistory")}>{text("pastHistory")}</Row>
            <Row label={L("allergy")}>
              {multi("allergy", PT_ALLERGIES)}
              {value.allergy.some((c) => c !== "nka") && <span className="inline-flex items-center gap-1.5">{L("specify")} {text("allergySpecify", false)}</span>}
            </Row>
          </Group>
          <Row label={L("previousTherapy")} missing={miss("previousVisits")}>
            {single("previousTherapy", PT_YES_NO)}
            {value.previousTherapy === "yes" && (
              <span className="inline-flex items-center gap-1.5">{L("previousVisits")}{" "}
                {edit
                  ? <input className={cn(inputCls, "w-20")} inputMode="numeric" value={value.previousVisits ?? ""} dir="ltr" data-testid={tid("previousVisits")}
                      onChange={(e) => { const n = e.target.value.replace(/[^\d]/g, ""); patch({ previousVisits: n === "" ? null : Math.min(999, Number(n)) }); }} />
                  : <FillIn v={value.previousVisits} />}
              </span>
            )}
          </Row>
          <Group label={L("pain")}>
            <Row label={L("symptoms")} missing={miss("symptoms")}>{single("symptoms", PT_SYMPTOMS)}</Row>
            <Row label={L("painScale")} missing={miss("painBest") || miss("painWorst")}>
              <span className="inline-flex items-center gap-1.5">{L("atBest")} {pain("painBest")}</span>
              <span className="inline-flex items-center gap-1.5">{L("atWorst")} {pain("painWorst")}</span>
            </Row>
            <Row label={L("location")} missing={miss("location")}>
              {multi("location", PT_LOCATIONS)}
              <span className="inline-flex items-center gap-1.5 flex-1">{L("other")} {text("locationOther")}</span>
            </Row>
            <Row label={L("aggravating")}>{multi("aggravating", PT_AGGRAVATING)}</Row>
            <Row label={L("relieving")}>
              {multi("relieving", PT_RELIEVING)}
              <span className="inline-flex items-center gap-1.5 flex-1">{L("other")} {text("relievingOther")}</span>
            </Row>
          </Group>
          <Group label={L("sensation")}>
            <Row label={L("overallStatus")} missing={miss("sensation")}>{single("sensation", PT_SENSATION)}</Row>
            <Row label={L("affectedRegions")} missing={miss("sensationRegions")}>{text("sensationRegions")}</Row>
          </Group>
          <Band>{L("mmt")} — <span className="font-normal text-xs">{PT_MMT_LEGEND[lang]}</span></Band>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse print:break-inside-avoid" data-testid={tid("mmt")}>
              <thead><tr><th className={cn(th, "text-start")}>{L("muscleGroup")}</th><th className={th}>{L("right")}</th><th className={th}>{L("left")}</th></tr></thead>
              <tbody>
                {PT_MMT_GROUPS.map((g) => (
                  <tr key={g.code}><td className={td}>{t(g)}</td><td className={cn(td, "text-center")}>{grade("mmt", g.code, "r")}</td><td className={cn(td, "text-center")}>{grade("mmt", g.code, "l")}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Band>{L("spasticity")} — <span className="font-normal text-xs">{PT_ASHWORTH_LEGEND[lang]}</span></Band>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse print:break-inside-avoid" data-testid={tid("ashworth")}>
          <thead><tr><th className={cn(th, "text-start")}>{L("region")}</th><th className={th}>{L("right")}</th><th className={th}>{L("left")}</th></tr></thead>
          <tbody>
            {PT_ASHWORTH_REGIONS.map((g) => (
              <tr key={g.code}><td className={td}>{t(g)}</td><td className={cn(td, "text-center")}>{grade("ashworth", g.code, "r")}</td><td className={cn(td, "text-center")}>{grade("ashworth", g.code, "l")}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <Band>{L("functional")}</Band>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse print:break-inside-avoid" data-testid={tid("functional")}>
          <thead><tr><th className={cn(th, "text-start")}>{L("activity")}</th><th className={th}>{L("assistance")}</th><th className={th}>{L("equipment")}</th></tr></thead>
          <tbody>
            {PT_FUNCTIONAL.map((g) => (
              <tr key={g.code}><td className={td}>{t(g)}</td><td className={cn(td, "text-center min-w-[8rem]")}>{fn(g.code, "assist")}</td><td className={cn(td, "text-center min-w-[8rem]")}>{fn(g.code, "notes")}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      {/*  **رموزُ المساعدة والأدوات** — تحت «الحالة الوظيفية» وفوق «خطة العلاج» كما في الورقة (طلبُ المالك ٢٠٢٦-١٠-١٠). */}
      <p className="px-2 py-1 text-[11px] leading-relaxed text-slate-700 border-b border-slate-400 print:break-inside-avoid"
        dir={lang === "en" ? "ltr" : "rtl"} data-testid={tid("assist-legend")}>{PT_ASSIST_LEGEND[lang]}</p>
      <Band>{L("plan")}</Band>
      <div className={cn("grid grid-cols-2 sm:grid-cols-5 print:grid-cols-5 text-sm print:break-inside-avoid", miss("plan") && "bg-red-50")} data-testid={tid("plan")} data-missing={miss("plan") ? "1" : undefined}>
        {PT_PLAN_ITEMS.map((o) => {
          const on = value.plan.includes(o.code);
          const toggle = () => patch({ plan: PT_PLAN_ITEMS.map((x) => x.code).filter((c) => (c === o.code ? !on : value.plan.includes(c))) });
          return (
            <div key={o.code} className="px-2 py-1.5 border-b border-e border-slate-400">
              <Box label={t(o)} on={on} onToggle={edit ? toggle : undefined} testId={tid(`plan-${o.code}`)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
