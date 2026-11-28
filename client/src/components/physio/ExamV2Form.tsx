// **معاينةُ العلاج الطبيعي الإلزامية `BC-PT-02`** (§4.gz، قرارُ المالك ٢٠٢٦-١١-٢٧) — ثلاثُ بطاقات بهيئة النموذج الذي وافق عليه المالك:
//   ١. **النواة** — لكلّ مريض، والعمرُ والجهةُ وبدايةُ الأعراض مملوءةٌ من الملفّ للتأكيد، وكلُّ سؤالٍ بشرطه؛
//   ٢. **وحدةُ المجموعة** — تظهر للمجموعة المختارة وحدها؛
//   ٣. **العلاماتُ الحمراء** — نعم/لا لكلّ سؤال و«لا شيء ممّا سبق» بضغطة (تملأ ما لم يُجَب وحده)، و«نعم» تُظهر الإجراءَ العاجل **فوراً
//      تحت سؤالها نفسِه** — حيث ضغط الفاحص، لا في آخر البطاقة (مراجعةُ المرحلة الأولى: على الهاتف كان يقع تحت الشاشة).
// مكوّنٌ واحد للحالتين: تحريرٌ (`onChange`) وقراءةٌ (بلا `onChange`) — والخاناتُ والشروطُ والإلزامُ كلُّها من `shared/physio_exam_v2.ts`.
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, Siren } from "lucide-react";
import {
  V2_CORE_FIELDS, examV2Acuity, examV2Ctx, examV2ValueText, fieldApplies, fieldRequired, forbiddenDevices, moduleFieldsOf, moduleOf,
  redFlagQuestionsFor, redFlagsOf, RED_FLAG_URGENCY_AR, V2_DEVICE_NAMES,
  type PhysioExamV2, type V2Field, type V2Value,
} from "@shared/physio_exam_v2";
import { PT_SENSATION, sensationNeedsRegions } from "@shared/physio_initial_assessment";
import { arDigits } from "@shared/physio_exercises";
import { cn } from "@/lib/utils";

const segBtn = (on: boolean, tone: "accent" | "bad" | "ok" = "accent") => cn(
  "rounded-md border px-2.5 py-1 text-sm leading-6 transition-colors",
  on
    ? tone === "bad" ? "bg-red-600 border-red-600 text-white" : tone === "ok" ? "bg-emerald-50 border-emerald-600 text-emerald-800 font-semibold"
      : "bg-teal-50 border-teal-700 text-teal-800 font-semibold"
    : "bg-white border-slate-300 text-slate-800 hover:bg-slate-50",
);
const inputCls = "h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600 min-w-0";

/** قائمةٌ منسدلة حين تكثر الخيارات أو تطول — فلا تفيض الشاشةُ بعرض ٣٩٠ نقطة. */
const asSelect = (f: V2Field) => (f.options?.length ?? 0) > 5 || (f.options ?? []).some((o) => o.ar.length > 16);

function Card({ title, sub, children, testId, tone }: { title: ReactNode; sub?: ReactNode; children: ReactNode; testId: string; tone?: "module" | "flags" }) {
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

function FieldBox({ label, required, missing, hint, children, testId }: {
  label: string; required: boolean; missing: boolean; hint?: ReactNode; children: ReactNode; testId: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1 min-w-0 rounded-md p-1.5", missing && "bg-red-50 ring-1 ring-red-300")} data-testid={testId} data-missing={missing ? "1" : undefined}>
      <label className={cn("text-sm font-semibold", missing ? "text-red-700" : "text-slate-800")}>
        {label}{required && <span className="text-red-600"> *</span>}
      </label>
      {children}
      {hint && <span className="text-xs text-teal-700">{hint}</span>}
    </div>
  );
}

function FieldInput({ f, value, onChange, testId }: { f: V2Field; value: V2Value; onChange?: (v: V2Value) => void; testId: string }) {
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

export function ExamV2Form({
  value, onChange, diagnosis, onDiagnosis, missing = [], today, prefilled = [], testIdPrefix = "v2",
}: {
  value: PhysioExamV2;
  /** غيابُه = قراءةٌ فقط. */
  onChange?: (next: PhysioExamV2) => void;
  diagnosis: string;
  onDiagnosis?: (v: string) => void;
  missing?: string[];
  today: string;
  /** خاناتٌ مملوءةٌ من الملفّ — «تأكيدٌ فقط». */
  prefilled?: string[];
  testIdPrefix?: string;
}) {
  const edit = Boolean(onChange);
  const miss = (k: string) => missing.includes(k);
  const tid = (s: string) => `${testIdPrefix}-${s}`;
  //  آخرُ «نعم» ضُغطت — يُمرَّر إجراؤها إلى الشاشة إن وقع تحتها.
  const [lastYes, setLastYes] = useState<string | null>(null);
  useEffect(() => {
    if (!lastYes) return;
    document.querySelector(`[data-testid="${tid(`rf-action-${lastYes}`)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setLastYes(null);
  }, [lastYes]);
  const ctx = examV2Ctx(value);
  const mod = moduleOf(value.core?.group);
  const setCore = (k: string, v: V2Value) => {
    const core = { ...value.core, [k]: v };
    //  تبديلُ المجموعة يبدأ وحدتَها فارغة ويُبقي أجوبةَ العلامات العامّة وحدها.
    if (k === "group" && v !== value.core?.group) {
      const general = new Set(redFlagQuestionsFor(null, null).map((q) => q.key));
      const redFlags = Object.fromEntries(Object.entries(value.redFlags ?? {}).filter(([key]) => general.has(key))) as PhysioExamV2["redFlags"];
      onChange?.({ ...value, core, module: {}, redFlags });
      return;
    }
    onChange?.({ ...value, core });
  };
  const setModule = (k: string, v: V2Value) => onChange?.({ ...value, module: { ...value.module, [k]: v } });
  const flags = redFlagQuestionsFor(ctx.group, ctx.condition);
  const hits = redFlagsOf(value);
  const acuity = examV2Acuity(value.core ?? {}, today);
  const forbidden = forbiddenDevices(value, { today });

  const coreField = (f: V2Field) => (
    <FieldBox key={f.key} label={f.ar} required={edit && fieldRequired(f, ctx)} missing={miss(`core.${f.key}`)} testId={tid(`core-${f.key}`)}
      hint={f.key === "onsetDate" && acuity ? `المرحلةُ المشتقّة: ${acuity.ar}` : prefilled.includes(f.key) ? "من الملفّ — تأكيدٌ فقط" : undefined}>
      <FieldInput f={f} value={value.core?.[f.key] ?? null} onChange={edit ? (v) => setCore(f.key, v) : undefined} testId={tid(`core-${f.key}-in`)} />
    </FieldBox>
  );
  const visibleCore = V2_CORE_FIELDS.filter((f) => fieldApplies(f, ctx));
  //  الإحساسُ (قسمٌ من الأولى) بعد «درجة التهيّج» كما في النموذج.
  const sensationAt = visibleCore.findIndex((f) => f.key === "irritability") + 1;

  return (
    <div className="flex flex-col gap-3 min-w-0" dir="rtl" data-testid={tid("form")}>
      <Card title="النواة — لكلّ مريض" sub={edit ? "الخاناتُ بنجمةٍ إلزامية" : undefined} testId={tid("core")}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
          {visibleCore.slice(0, 1).map(coreField)}
          <FieldBox label={edit ? "التشخيص كما تكتبه" : "التشخيص"} required={edit} missing={miss("diagnosis")} testId={tid("diagnosis")}>
            {onDiagnosis
              ? <input className={inputCls} dir="auto" value={diagnosis} onChange={(e) => onDiagnosis(e.target.value)} placeholder="التشخيص السريري" data-testid={tid("diagnosis-in")} />
              : <span className={cn("text-sm", diagnosis ? "font-bold" : "text-slate-400")}>{diagnosis || "—"}</span>}
          </FieldBox>
          {visibleCore.slice(1, sensationAt).map(coreField)}
          <FieldBox label="الإحساس في منطقة العلاج" required={edit} missing={miss("sensation")} testId={tid("sensation")}>
            {edit ? (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="الإحساس">
                {PT_SENSATION.map((o) => (
                  <button key={o.code} type="button" aria-pressed={value.sensation === o.code} className={segBtn(value.sensation === o.code)}
                    onClick={() => onChange?.({ ...value, sensation: value.sensation === o.code ? null : o.code, sensationRegions: sensationNeedsRegions(o.code) ? value.sensationRegions : null })}
                    data-testid={tid(`sensation-${o.code}`)}>{o.ar}</button>
                ))}
              </div>
            ) : <span className="text-sm font-bold">{PT_SENSATION.find((o) => o.code === value.sensation)?.ar ?? "—"}</span>}
          </FieldBox>
          {sensationNeedsRegions(value.sensation) && (
            <FieldBox label="المناطقُ المصابة بالإحساس" required={edit} missing={miss("sensationRegions")} testId={tid("sensation-regions")}>
              {edit
                ? <input className={inputCls} dir="auto" value={value.sensationRegions ?? ""} onChange={(e) => onChange?.({ ...value, sensationRegions: e.target.value || null })} data-testid={tid("sensation-regions-in")} />
                : <span className="text-sm font-bold">{value.sensationRegions ?? "—"}</span>}
            </FieldBox>
          )}
          {visibleCore.slice(sensationAt).map(coreField)}
        </div>
      </Card>

      {mod && (
        <Card title={`وحدة «${mod.ar}»`} sub="تظهر لهذه المجموعة وحدها" testId={tid("module")} tone="module">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5">
            {moduleFieldsOf(mod.group).filter((f) => fieldApplies(f, ctx)).map((f) => (
              <FieldBox key={f.key} label={f.ar} required={edit && fieldRequired(f, ctx)} missing={miss(`module.${f.key}`)} testId={tid(`module-${f.key}`)}>
                <FieldInput f={f} value={value.module?.[f.key] ?? null} onChange={edit ? (v) => setModule(f.key, v) : undefined} testId={tid(`module-${f.key}-in`)} />
              </FieldBox>
            ))}
          </div>
        </Card>
      )}

      <Card
        title={<>العلاماتُ الحمراء {edit && <span className="text-red-600">*</span>}</>}
        sub={edit ? (
          //  **تملأ ما لم يُجَب وحده** — «نعم» قائمةٌ لا تُمحى بضغطةٍ خاطئة؛ ومع «نعم» يصير اسمُها «الباقي: لا».
          <button type="button" className="rounded-md bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:bg-slate-200"
            onClick={() => onChange?.({ ...value, redFlags: Object.fromEntries(flags.map((q) => [q.key, value.redFlags?.[q.key] ?? "no"])) as PhysioExamV2["redFlags"] })}
            data-testid={tid("rf-none")}>{hits.length ? "الباقي: لا" : "لا شيء ممّا سبق"}</button>
        ) : undefined}
        testId={tid("redflags")} tone="flags">
        <div className="flex flex-col">
          {flags.map((q, i) => {
            const a = value.redFlags?.[q.key];
            const groupStart = q.groups !== null && (i === 0 || flags[i - 1].groups === null);
            return (
              <div key={q.key}>
                {groupStart && <h4 className="mt-2 mb-1 text-sm font-bold text-slate-700">خاصّةٌ بهذه المجموعة</h4>}
                <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 py-2 last:border-b-0",
                  miss(`redFlags.${q.key}`) && "bg-red-50")} data-testid={tid(`rf-${q.key}`)} data-missing={miss(`redFlags.${q.key}`) ? "1" : undefined}>
                  <p className="text-sm text-slate-800 min-w-0 m-0">{q.questionAr}</p>
                  {edit ? (
                    <div className="flex gap-1 shrink-0">
                      <button type="button" aria-pressed={a === "yes"} className={segBtn(a === "yes", "bad")}
                        onClick={() => { onChange?.({ ...value, redFlags: { ...value.redFlags, [q.key]: "yes" } }); setLastYes(q.key); }} data-testid={tid(`rf-${q.key}-yes`)}>نعم</button>
                      <button type="button" aria-pressed={a === "no"} className={segBtn(a === "no", "ok")}
                        onClick={() => onChange?.({ ...value, redFlags: { ...value.redFlags, [q.key]: "no" } })} data-testid={tid(`rf-${q.key}-no`)}>لا</button>
                    </div>
                  ) : (
                    <span className={cn("text-sm font-bold shrink-0", a === "yes" ? "text-red-700" : "text-emerald-700")}>{a === "yes" ? "نعم" : a === "no" ? "لا" : "—"}</span>
                  )}
                </div>
                {/*  **«نعم» تُظهر الإجراءَ العاجل فوراً تحت سؤالها** — الطوارئُ لا تنتظر اعتماداً (قرارُ المالك). */}
                {a === "yes" && (() => {
                  const h = hits.find((x) => x.key === q.key);
                  if (!h) return null;
                  return (
                    <div role="alert" className={cn("mb-2 rounded-lg border px-3 py-2 text-sm",
                      h.urgency === "emergency" ? "border-red-700 bg-red-600 text-white" : "border-red-300 bg-red-50 text-red-800")} data-testid={tid(`rf-action-${h.key}`)}>
                      <div className="flex items-start gap-2">
                        {h.urgency === "emergency" ? <Siren className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
                        <div className="min-w-0"><b>{RED_FLAG_URGENCY_AR[h.urgency]}: </b>{h.actionAr}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      </Card>

      {hits.length > 0 && edit && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" data-testid={tid("rf-next")}>
          علاماتٌ حمراء: {arDigits(hits.length)} — الإجراءُ العاجل تحت كلّ سؤال. بعد الحفظ تكتب ملاحظتك وتضغط «أرسل للاعتماد» في الخطوة التالية،
          ولا يُرسَل شيءٌ إلى Bionic AI قبل اعتماد المسؤول أو المشرف العام.
        </p>
      )}

      {forbidden.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid={tid("forbidden")}>
          <b>أجهزةٌ ممنوعة بالمعاينة:</b>
          <ul className="m-0 mt-1 ps-5 list-disc">
            {forbidden.map((d) => <li key={d.deviceCode} data-testid={tid(`forbidden-${d.deviceCode}`)}><b>{V2_DEVICE_NAMES[d.deviceCode] ?? d.deviceCode}</b> — {d.reasonAr}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
