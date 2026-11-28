// **معاينةُ العلاج الطبيعي بالإصدار الثالث — «تشخيصٌ حرّ + ورقةُ سلامةٍ قصيرة»** (§4.hd، طلبُ المالك ٢٠٢٦-١١-٢٨: «يتعبني — التشخيصُ حقلٌ
// مفتوح، ومنه يسأل الوكيلُ ما يحتاج»). خمسُ بطاقاتٍ بالترتيب:
//   ١. **التشخيصُ والشكوى** — نصٌّ حرٌّ إلزاميّ بكلمات الفاحص، وتحته مجموعةُ التشخيص اختياريةً (توفّر سؤالاً من Bionic AI) وحالتُها
//      وما تحتاجه موانعُها؛
//   ٢. **ورقةُ السلامة** — ما تقرؤه الموانعُ الحتمية لكلّ مريض (`V3_REQUIRED_CORE`)، ضغطةٌ لكلٍّ، وتحتها «أجهزةٌ ممنوعة» حيّةً؛
//   ٣. **العلاماتُ الحمراء** — قائمةٌ واحدة: يُعلَّم ما وُجد وحده، و«لا شيء ممّا يلي» تجعل الباقي «لا» بضغطة، و«نعم» تُظهر إجراءَها فوراً؛
//   ٤. **تفاصيلُ اختيارية** مطويّة — ما يحتاجه Bionic AI قبل الخطّة أوّلاً، ثمّ خاناتُ الوحدة وبقيّةُ النواة.
// والقراءةُ (بلا `onChange`): التشخيصُ، وورقةُ السلامة، وما مُلئ وحده، و«نعم» بالأحمر، و«باقي العلامات: لا»، ومَن أضاف الخانةَ بجوابٍ لـ Bionic AI.
// والقواعدُ كلُّها من `shared/physio_exam_v2.ts` — والخادمُ يحكم.
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, Siren, ChevronDown, Sparkles, Check } from "lucide-react";
import {
  GATE_INPUTS, V2_MODULES, V2_DEVICE_NAMES, V2_RED_FLAGS, RED_FLAG_URGENCY_AR, V3_GROUPS, V3_OTHER_GROUP, V3_REQUIRED_CORE, NOT_RECORDED_PREFIX,
  coreFieldsFor, examCautionInputsMissing, examGroupConfirmed, examV2Acuity, examV2Ctx, examV2ValueText, fieldApplies, fieldRequired,
  forbiddenDevices, isNotRecordedReason, moduleFieldsOf, moduleOf, redFlagQuestionsOfExam, redFlagsOf,
  type PhysioExamV2, type RedFlagDef, type V2Ctx, type V2Field, type V2Value,
} from "@shared/physio_exam_v2";
import { PT_SENSATION, sensationNeedsRegions } from "@shared/physio_initial_assessment";
import { otherGroupTextConflicts, textSafetyHitsOf } from "@shared/physio_exam_text_safety";
import { arDigits } from "@shared/physio_exercises";
import { cn } from "@/lib/utils";
import { Card, FieldBox, FieldInput, segBtn } from "@/components/physio/ExamFields";
import type { ExamFormProps } from "@/components/physio/ExamV2Form";

const CORE = coreFieldsFor("v3");
const coreField = (k: string) => CORE.find((f) => f.key === k)!;

/** **ورقةُ السلامة** بمعناها — ثلاثُ مجموعاتٍ صغيرة، وكلُّ مفتاحٍ فيها من `V3_REQUIRED_CORE` (والإحساسُ من الأولى). */
const SAFETY_CARDS: { id: string; title: string; keys: string[] }[] = [
  { id: "patient", title: "المريض والحالة", keys: ["sex", "ageYears", "onsetKind", "onsetDate", "surgery", "surgeryDate", "irritability", "sensation", "canReportHeat"] },
  { id: "devices", title: "الأجهزة المزروعة والمعدن والأدوية", keys: ["implants", "implantsOther", "metalInField", "metalTypes", "pregnant", "anticoagulant", "steroidInjection", "steroidInjectionDate"] },
  { id: "body", title: "الجلد والعظم والأمراض", keys: ["skin", "cancer", "cancerInField", "boneHealth", "epilepsy"] },
];
/** **ما يحتاجه Bionic AI قبل الخطّة** (مدخلاتُ الحذر — `examCautionInputsMissing`) — أوّلُ «التفاصيل الاختيارية»؛ وما تركه الفاحصُ يسأل عنه. */
const CAUTION_KEYS = ["diabetes", "neuropathy", "glucoseMgdl", "fasting", "surgeonInstructions", "correctedAgeMonths", "botox", "botoxDate", "fallsLastYear",
  "immunosuppressed", "betaBlocker", "atrialFibrillation", "weightKg"];

/** مدخلاتُ البوّابات لنطاق المعاينة الآن (المجموعةُ أو حالتُها) — تُعرض تحت الاختيار مباشرةً. */
export function gateInputKeysFor(c: Pick<V2Ctx, "group" | "condition">): string[] {
  const out: string[] = [];
  for (const gi of GATE_INPUTS) {
    if ((gi.scope.group !== undefined && gi.scope.group !== c.group) || (gi.scope.condition !== undefined && gi.scope.condition !== c.condition)) continue;
    if (!out.includes(gi.key)) out.push(gi.key);
  }
  return out;
}
/** الخانةُ بمفتاحها الكامل (`core.x` · `module.x`) — للوح الأسئلة أيضاً. */
export function examFieldOf(key: string, group: unknown): V2Field | null {
  const [part, k] = key.split(".");
  if (part === "core") return CORE.find((f) => f.key === k) ?? null;
  if (part === "module") return moduleFieldsOf(group).find((f) => f.key === k) ?? null;
  return null;
}
/** سطرُ الملخّص بلا التشخيص في أوّله — حيث يُعرض التشخيصُ نفسُه بجانبه (ورقةُ العلاج الطبيعي وصندوقُها وطباعتُها). */
export function summaryWithoutDiagnosis(summary: string | null | undefined, diagnosis: string | null | undefined): string | null {
  if (!summary) return null;
  const d = (diagnosis ?? "").trim();
  if (!d) return summary;
  const head = d.length > 80 ? `${d.slice(0, 80)}…` : d;
  if (!summary.startsWith(head)) return summary;
  return summary.slice(head.length).replace(/^\s*·\s*/, "") || null;
}
const isEmpty = (v: V2Value | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** نصُّ مَن أضاف الخانة بجوابٍ عن سؤال Bionic AI (المراجعة: «سؤالٍ لـ» كانت تُقرأ سؤالاً موجَّهاً إليه). */
export const sourceLineAr = (s: { byName: string | null; version: number }) => `أُضيف بجوابٍ عن سؤال Bionic AI — بواسطة ${s.byName ?? "—"}، النسخة ${arDigits(s.version)}`;
/** علامةٌ صغيرة ✦ بجانب الخانة التي كتبها جوابٌ — والسطرُ كاملاً مرّةً لكلّ جولة في رأس الاستمارة (`SourceSummary`). */
function SourceMark({ a, k, tid }: { a: PhysioExamV2; k: string; tid: string }) {
  const s = a.fieldSources?.[k];
  if (!s) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] text-violet-800" title={sourceLineAr(s)} aria-label={sourceLineAr(s)} data-testid={tid}>
      <Sparkles className="w-3 h-3 shrink-0" /> بجوابٍ (ن{arDigits(s.version)})
    </span>
  );
}
/** **مرّةً لكلّ جولة**: «أُضيف بجوابٍ عن سؤال Bionic AI — بواسطة X، النسخة N: الخاناتُ …». */
function SourceSummary({ a, tid }: { a: PhysioExamV2; tid: string }) {
  const entries = Object.entries(a.fieldSources ?? {});
  if (!entries.length) return null;
  const byRound = new Map<string, { s: (typeof entries)[number][1]; n: number }>();
  for (const [, s] of entries) {
    const key = `${s.version}|${s.byName ?? ""}`;
    byRound.set(key, { s, n: (byRound.get(key)?.n ?? 0) + 1 });
  }
  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-1.5 text-xs text-violet-900 flex flex-col gap-0.5" data-testid={tid}>
      {Array.from(byRound.values()).map(({ s, n }) => (
        <span key={`${s.version}-${s.byName}`} className="inline-flex items-start gap-1"><Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          {sourceLineAr(s)} — {arDigits(n)} {n === 1 ? "خانة" : "خانات"} معلَّمة ✦</span>
      ))}
    </div>
  );
}

export function ExamV3Form({
  value, onChange, diagnosis, onDiagnosis, missing = [], today, prefilled = [], testIdPrefix = "v3", onRedFlagsBulkNo, diagnosisStarter,
}: ExamFormProps) {
  const edit = Boolean(onChange);
  const miss = (k: string) => missing.includes(k);
  const tid = (s: string) => `${testIdPrefix}-${s}`;
  const ctx = examV2Ctx(value);
  const mod = moduleOf(ctx.group);
  const [lastYes, setLastYes] = useState<string | null>(null);
  useEffect(() => {
    if (!lastYes) return;
    document.querySelector(`[data-testid="${tid(`rf-action-${lastYes}`)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    setLastYes(null);
  }, [lastYes]);
  //  الناقصُ في التفاصيل يفتحها (خطأُ قيمةٍ فيها لا يختبئ تحت طيّ).
  const [detailsOpen, setDetailsOpen] = useState(!edit);
  const missingInDetails = missing.some((k) => (k.startsWith("core.") && !V3_REQUIRED_CORE.has(k.slice(5)) && k !== "core.group") || (k.startsWith("module.") && k !== "module.condition"));
  useEffect(() => { if (missingInDetails) setDetailsOpen(true); }, [missingInDetails]);

  const setCore = (k: string, v: V2Value) => {
    const core = { ...value.core, [k]: v };
    //  تبديلُ المجموعة يبدأ وحدتَها فارغة — والعلاماتُ المجابة تبقى (علاماتُ المجموعة الجديدة تصير إلزاميةً بلا جواب).
    if (k === "group" && v !== value.core?.group) { onChange?.({ ...value, core, module: {} }); return; }
    onChange?.({ ...value, core });
  };
  const setModule = (k: string, v: V2Value) => onChange?.({ ...value, module: { ...value.module, [k]: v } });
  const setKey = (key: string, v: V2Value) => (key.startsWith("core.") ? setCore(key.slice(5), v) : setModule(key.slice(7), v));
  const valueOf = (key: string): V2Value => (key.startsWith("core.") ? value.core?.[key.slice(5)] : value.module?.[key.slice(7)]) ?? null;

  const acuity = examV2Acuity(value.core ?? {}, today);
  const forbidden = useMemo(() => forbiddenDevices(value, { today }), [value, today]);
  const worstCase = forbidden.some((d) => isNotRecordedReason(d.reasonAr));
  const notRecordedGroups = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const d of forbidden) if (isNotRecordedReason(d.reasonAr)) {
      const r = d.reasonAr.slice(NOT_RECORDED_PREFIX.length);
      m.set(r, [...(m.get(r) ?? []), d.deviceCode]);
    }
    return Array.from(m.entries()).map(([reason, devices]) => ({ reason, devices }));
  }, [forbidden]);
  //  §4.hd (المراجعة) — النصُّ الحرّ ضدّ ورقة السلامة (بقاعدة الخادم نفسِها)، و«غير ذلك» والتشخيصُ يذكر حالةً من المكتبة.
  const textHits = textSafetyHitsOf(value, [diagnosis]);
  const otherConflict = ctx.group === V3_OTHER_GROUP ? otherGroupTextConflicts([diagnosis]) : [];
  //  §4.hd (المراجعة) — **الإلزاميةُ**: العامّةُ وعلاماتُ مجموعة المعاينة وحالتِها؛ وغيرُها اختياريّ (يُعلَّم ما وُجد فيه وحده).
  const flags = redFlagQuestionsOfExam(value);
  const requiredKeys = new Set(flags.map((q) => q.key));
  const optionalFlags = V2_RED_FLAGS.filter((q) => !requiredKeys.has(q.key));
  const hits = redFlagsOf(value);
  //  «لا شيء ممّا يلي» ضُغطت في هذه النافذة — بعدها إزالةُ «نعم» تعيدها «لا» (أقرّ بها)، وقبلها تعيدها بلا جواب.
  const [bulkUsed, setBulkUsed] = useState(false);
  const unanswered = flags.filter((q) => value.redFlags?.[q.key] !== "yes" && value.redFlags?.[q.key] !== "no").length;
  const noCount = flags.filter((q) => value.redFlags?.[q.key] === "no").length;
  const groupConfirmed = examGroupConfirmed(value);
  const cautionMissing = new Set(examCautionInputsMissing(value));

  /** خانةٌ واحدة بمفتاحها الكامل — قراءةً أو تحريراً، بنجمتها وعلامة الناقص وأثرِ جوابِ Bionic AI. */
  const fieldRow = (key: string, f: V2Field, opts: { hint?: ReactNode; required?: boolean; inline?: boolean } = {}) => {
    if (!fieldApplies(f, ctx)) return null;
    const v = valueOf(key);
    if (!edit && isEmpty(v) && !fieldRequired(f, ctx)) return null;
    const id = key.replace(".", "-");
    const src = <SourceMark a={value} k={key} tid={tid(`src-${id}`)} />;
    return (
      <FieldBox key={key} label={f.ar} required={edit && (opts.required ?? fieldRequired(f, ctx))} missing={miss(key)} testId={tid(id)} inline={opts.inline ?? true}
        hint={opts.hint || value.fieldSources?.[key] ? <>{opts.hint}{opts.hint && value.fieldSources?.[key] ? " · " : ""}{src}</> : undefined}>
        <FieldInput f={f} value={v} onChange={edit ? (x) => setKey(key, x) : undefined} testId={tid(`${id}-in`)} />
      </FieldBox>
    );
  };
  const coreRow = (k: string) => {
    if (k === "sensation") return sensationRow();
    const f = coreField(k);
    const hint = k === "onsetDate" && acuity ? `المرحلةُ المشتقّة: ${acuity.ar}` : prefilled.includes(k) ? "من الملفّ — تأكيدٌ فقط" : undefined;
    return fieldRow(`core.${k}`, f, { hint, inline: true });
  };
  const sensationRow = () => (
    <div key="sensation" className="contents">
      <FieldBox label="الإحساس في منطقة العلاج" required={edit} missing={miss("sensation")} testId={tid("sensation")} inline>
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
            ? <input className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm min-w-0" dir="auto" value={value.sensationRegions ?? ""}
                onChange={(e) => onChange?.({ ...value, sensationRegions: e.target.value || null })} data-testid={tid("sensation-regions-in")} />
            : <span className="text-sm font-bold">{value.sensationRegions ?? "—"}</span>}
        </FieldBox>
      )}
    </div>
  );

  //  ══ ما يُعرض في كلّ بطاقة ══
  const gateKeys = gateInputKeysFor(ctx);
  const shownKeys = new Set<string>([...SAFETY_CARDS.flatMap((c) => c.keys.map((k) => `core.${k}`)), "core.group", "module.condition", ...gateKeys]);
  const cautionRows = CAUTION_KEYS.map((k) => `core.${k}`).filter((k) => !shownKeys.has(k));
  cautionRows.forEach((k) => shownKeys.add(k));
  const moduleRows = moduleFieldsOf(ctx.group).filter((f) => f.key !== "condition" && !shownKeys.has(`module.${f.key}`));
  const otherCore = CORE.filter((f) => !shownKeys.has(`core.${f.key}`));
  const detailsFilled = [...cautionRows, ...moduleRows.map((f) => `module.${f.key}`), ...otherCore.map((f) => `core.${f.key}`)].filter((k) => !isEmpty(valueOf(k))).length;

  const groupField = coreField("group");
  const condField = mod ? moduleFieldsOf(mod.group).find((f) => f.key === "condition") ?? null : null;

  //  ══ العلاماتُ الحمراء: الإلزاميةُ (العامّةُ ثمّ مجموعةُ المعاينة) مفتوحة، وعلاماتُ المجموعات الأخرى مطويّةً اختيارية ══
  const sections = useMemo(() => {
    const general = flags.filter((q) => q.groups === null);
    const own = flags.filter((q) => q.groups !== null);
    const byGroup = new Map<string, RedFlagDef[]>();
    for (const q of optionalFlags) {
      const g = q.groups![0];
      byGroup.set(g, [...(byGroup.get(g) ?? []), q]);
    }
    const others = V2_MODULES.map((m) => m.group).filter((g) => byGroup.has(g)).map((g) => ({ group: g, ar: moduleOf(g)?.ar ?? g, list: byGroup.get(g)! }));
    return { general, own, others };
  }, [flags.length, ctx.group, ctx.condition]);
  const setFlag = (k: string, a: "yes" | "no" | null) => {
    const next = { ...value.redFlags } as Record<string, "yes" | "no">;
    if (a === null) delete next[k]; else next[k] = a;
    onChange?.({ ...value, redFlags: next });
    if (a === "yes") { setLastYes(k); if (bulkUsed) onRedFlagsBulkNo?.(false); }
  };
  //  **«لا شيء ممّا يلي» للإلزامية وحدها** (المراجعة: كانت تكتب «لا» لاثنتين وثلاثين علامةً مطويّةً لم يرها الفاحص) — وما عُلّم «نعم» يبقى.
  const bulkNo = () => {
    const next = { ...value.redFlags } as Record<string, "yes" | "no">;
    for (const q of flags) if (next[q.key] !== "yes") next[q.key] = "no";
    onChange?.({ ...value, redFlags: next });
    setBulkUsed(true);
    onRedFlagsBulkNo?.(hits.length === 0);
  };
  const flagRow = (q: RedFlagDef) => {
    const a = value.redFlags?.[q.key];
    const h = a === "yes" ? hits.find((x) => x.key === q.key) : null;
    if (!edit) {
      if (a !== "yes") return null;
    }
    return (
      <div key={q.key}>
        {edit ? (
          <label className={cn("flex items-start gap-2.5 border-b border-slate-100 py-2 cursor-pointer min-w-0", miss(`redFlags.${q.key}`) && "bg-red-50",
            a === "yes" && "bg-red-50/60")} data-testid={tid(`rf-${q.key}`)} data-missing={miss(`redFlags.${q.key}`) ? "1" : undefined} data-answer={a ?? ""}>
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" checked={a === "yes"}
              onChange={(e) => setFlag(q.key, e.target.checked ? "yes" : bulkUsed && requiredKeys.has(q.key) ? "no" : null)} data-testid={tid(`rf-${q.key}-yes`)} />
            <span className="text-sm text-slate-800 min-w-0 flex-1">{q.questionAr}</span>
            {a === "no" && <span className="shrink-0 text-xs font-semibold text-emerald-700 inline-flex items-center gap-0.5" data-testid={tid(`rf-${q.key}-isno`)}><Check className="w-3.5 h-3.5" />لا</span>}
          </label>
        ) : (
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 py-1.5" data-testid={tid(`rf-${q.key}`)}>
            <span className="text-sm text-slate-800 min-w-0">{q.questionAr}</span><span className="text-sm font-bold text-red-700 shrink-0">نعم</span>
          </div>
        )}
        {h && (
          <div role="alert" className={cn("my-1.5 rounded-lg border px-3 py-2 text-sm",
            h.urgency === "emergency" ? "border-red-700 bg-red-600 text-white" : "border-red-300 bg-red-50 text-red-800")} data-testid={tid(`rf-action-${h.key}`)}>
            <div className="flex items-start gap-2">
              {h.urgency === "emergency" ? <Siren className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />}
              <div className="min-w-0"><b>{RED_FLAG_URGENCY_AR[h.urgency]}: </b>{h.actionAr}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 min-w-0" dir="rtl" data-testid={tid("form")} data-ruleset="v3">
      <SourceSummary a={value} tid={tid("sources")} />
      {/* ══ ١. التشخيصُ والشكوى ══ */}
      <Card title={<>التشخيص والشكوى {edit && <span className="text-red-600">*</span>}</>} sub={edit ? "بكلماتك — Bionic AI يسأل عمّا يحتاجه" : undefined} testId={tid("dx-card")}>
        <div className={cn("flex flex-col gap-1 rounded-md", miss("diagnosis") && "ring-2 ring-red-400 bg-red-50 p-1.5")} data-testid={tid("diagnosis")} data-missing={miss("diagnosis") ? "1" : undefined}>
          {onDiagnosis ? (
            <textarea className="min-h-[6.5rem] w-full rounded-md border border-slate-300 bg-white px-2.5 py-2 text-[15px] leading-7 focus:outline-none focus:ring-2 focus:ring-teal-600 min-w-0"
              dir="auto" value={diagnosis} onChange={(e) => onDiagnosis(e.target.value)} maxLength={2000}
              placeholder="اكتب التشخيص والشكوى بكلماتك — بالعربية أو الإنكليزية" data-testid={tid("diagnosis-in")} />
          ) : <p className={cn("m-0 whitespace-pre-wrap text-sm", diagnosis ? "font-bold text-slate-900" : "text-slate-400")} dir="auto" data-testid={tid("diagnosis-value")}>{diagnosis || "—"}</p>}
          {onDiagnosis && !diagnosis.trim() && diagnosisStarter?.trim() && (
            <button type="button" className={cn(segBtn(false), "self-start text-xs")} onClick={() => onDiagnosis(diagnosisStarter.trim())} data-testid={tid("diagnosis-starter")}>
              ابدأ بما كتبه الاستقبال: «{diagnosisStarter.trim().slice(0, 60)}»
            </button>
          )}
        </div>
        {textHits.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5" data-testid={tid("text-safety")}>
            {textHits.map((h) => (
              <div key={h.key} role="alert" className={cn("rounded-md border px-2.5 py-1.5 text-xs min-w-0", h.acknowledged ? "border-slate-300 bg-slate-50 text-slate-700" : "border-red-300 bg-red-50 text-red-900")}
                data-testid={tid(`text-safety-${h.key.replace(".", "-")}`)} data-ack={h.acknowledged ? "1" : undefined}>
                <div className="flex items-start gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="min-w-0">النصُّ يذكر «{h.term}» وورقةُ السلامة تقول «لا» في: <b>{h.labelAr}</b> — صحّح الورقة، أو أكّد أنّها صحيحة. ولا يكتب Bionic AI خطّةً قبل ذلك.</span>
                </div>
                {edit && (
                  <label className="mt-1 flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" className="h-4 w-4 accent-slate-700" checked={h.acknowledged} onChange={(e) => {
                      const cur = new Set(value.textSafetyAck ?? []);
                      if (e.target.checked) cur.add(h.key); else cur.delete(h.key);
                      onChange?.({ ...value, textSafetyAck: Array.from(cur) });
                    }} data-testid={tid(`text-safety-ack-${h.key.replace(".", "-")}`)} />
                    راجعتُها — ورقةُ السلامة صحيحة رغم ما في النصّ
                  </label>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-3 flex flex-col gap-2 min-w-0" data-testid={tid("group-pick")}>
          <div className="text-sm font-semibold text-slate-800">
            مجموعةُ التشخيص {edit && <span className="text-xs font-normal text-slate-500">— اختياري، يوفّر عليك سؤالاً من Bionic AI</span>}
          </div>
          {edit ? (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={groupField.ar}>
              {V3_GROUPS.map((o) => (
                <button key={o.code} type="button" aria-pressed={ctx.group === o.code} className={cn(segBtn(ctx.group === o.code), "text-xs leading-5 px-2 py-0.5", o.code === V3_OTHER_GROUP && "border-dashed")}
                  onClick={() => setCore("group", ctx.group === o.code ? null : o.code)} data-testid={tid(`core-group-in-${o.code}`)}>{o.ar}</button>
              ))}
            </div>
          ) : (
            <span className={cn("text-sm", ctx.group ? "font-bold" : "text-slate-500")} data-testid={tid("core-group-value")}>
              {ctx.group ? examV2ValueText(groupField, ctx.group, "ar") : "لم تُؤكَّد بعد"}
            </span>
          )}
          {value.fieldSources?.["core.group"] && <SourceMark a={value} k="core.group" tid={tid("src-core-group")} />}
          {otherConflict.length > 0 && (
            <p role="alert" className="m-0 rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-900" data-testid={tid("other-conflict")}>
              التشخيصُ يذكر «{otherConflict.join("»، «")}» — اختر مجموعتَها بدل «غير ذلك» (موانعُ الحالة لا تسقط بها).
            </p>
          )}
          {condField && (edit || !isEmpty(value.module?.condition)) && (
            <FieldBox label={condField.ar} required={false} missing={miss("module.condition")} testId={tid("module-condition")}
              hint={value.fieldSources?.["module.condition"] ? <SourceMark a={value} k="module.condition" tid={tid("src-module-condition")} />
                : edit && isEmpty(value.module?.condition) ? "تحتاجها الموانع — إن تركتَها سألك Bionic AI عنها" : undefined}>
              <FieldInput f={condField} value={value.module?.condition ?? null} onChange={edit ? (x) => setModule("condition", x) : undefined} testId={tid("module-condition-in")} />
            </FieldBox>
          )}
          {gateKeys.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-dashed border-teal-600 p-2" data-testid={tid("gate-inputs")}>
              {edit && <p className="sm:col-span-2 m-0 text-xs text-teal-800">تحتاجها موانعُ هذه الحالة — ما تتركه يُمنع بسببه جهازُه حتى يُسجَّل.</p>}
              {gateKeys.map((k) => { const f = examFieldOf(k, ctx.group); return f ? fieldRow(k, f) : null; })}
            </div>
          )}
          {edit && !groupConfirmed && (
            <p className="m-0 text-xs text-slate-600" data-testid={tid("group-unconfirmed")}>
              {mod ? `اختر حالةَ «${mod.ar}» أعلاه — وإن تركتَها سألك Bionic AI عنها قبل الخطّة، وتطول قائمةُ الممنوع حتى تُختار.`
                : "بلا مجموعة يسألك Bionic AI عنها قبل الخطّة، وتطول قائمةُ الممنوع حتى تُؤكَّد."}
            </p>
          )}
        </div>
      </Card>

      {/* ══ ٢. ورقةُ السلامة ══ */}
      <Card title={<>ورقة السلامة {edit && <span className="text-red-600">*</span>}</>} sub={edit ? "كلُّ سؤالٍ بضغطة — تمنع بها الأجهزةُ الخطرة" : undefined} testId={tid("safety")}>
        <div className="flex flex-col gap-3">
          {SAFETY_CARDS.map((c) => (
            <div key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-2 min-w-0" data-testid={tid(`safety-${c.id}`)}>
              <h4 className="m-0 mb-1 text-sm font-bold text-slate-700">{c.title}</h4>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4">{c.keys.map(coreRow)}</div>
            </div>
          ))}
        </div>
      </Card>

      {forbidden.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" data-testid={tid("forbidden")}>
          <b>أجهزةٌ ممنوعة لهذا المريض:</b>
          {worstCase && (
            <p className="m-0 mt-1 rounded bg-white/70 px-2 py-1 text-xs text-amber-950" data-testid={tid("forbidden-worstcase")}>
              القائمة تشمل ما قد يُمنع قبل تأكيد مجموعة التشخيص وخاناتها — أكملها لتقصر.
            </p>
          )}
          {/* المراجعة: الممنوعُ بسببٍ مسجَّل بالأحمر جهازاً جهازاً، وما يُمنع حتى يُسجَّل شيءٌ سطرٌ واحد لكلّ سبب بالكهرمانيّ. */}
          <ul className="m-0 mt-1 ps-5 list-disc">
            {forbidden.filter((d) => !isNotRecordedReason(d.reasonAr)).map((d) => (
              <li key={d.deviceCode} className="text-red-800" data-testid={tid(`forbidden-${d.deviceCode}`)} data-kind="recorded">
                <b>{V2_DEVICE_NAMES[d.deviceCode] ?? d.deviceCode}</b> — {d.reasonAr}
              </li>
            ))}
            {notRecordedGroups.map((g) => (
              <li key={g.reason} className="text-amber-800" data-testid={tid(`forbidden-pending-${g.devices[0]}`)} data-kind="pending">
                <span>حتى يُسجَّل {g.reason}: </span>
                <b>{g.devices.map((d) => V2_DEVICE_NAMES[d] ?? d).join("، ")}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ══ ٣. العلاماتُ الحمراء ══ */}
      <Card title={<>العلاماتُ الحمراء {edit && <span className="text-red-600">*</span>}</>}
        sub={edit ? (unanswered ? `بقي ${arDigits(unanswered)} بلا جواب` : "أُجيبت كلُّها") : undefined} testId={tid("redflags")} tone="flags">
        {edit ? (
          <div className="flex flex-col min-w-0">
            <p className="m-0 mb-1 text-xs text-slate-600">علّم ما وجدتَه في القائمة أدناه، ثمّ اضغط الزرّ تحتها فيصير الباقي «لا».</p>
            <h4 className="m-0 mt-1 mb-0.5 text-sm font-bold text-slate-700">لكلّ مريض</h4>
            {sections.general.map(flagRow)}
            {sections.own.length > 0 && (
              <div data-testid={tid("rf-own")}>
                <h4 className="m-0 mt-2 mb-0.5 text-sm font-bold text-slate-700">لـ«{mod?.ar ?? ""}»</h4>
                {sections.own.map(flagRow)}
              </div>
            )}
            <button type="button" onClick={bulkNo} disabled={unanswered === 0}
              className={cn("mt-2 mb-1 w-full rounded-lg border-2 px-3 py-2.5 text-[15px] font-bold transition-colors",
                unanswered === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700")}
              data-testid={tid("rf-none")}>
              {unanswered === 0 ? "أُجيبت العلاماتُ كلُّها" : hits.length ? "الباقي ممّا فوق: لا" : "لا شيء ممّا فوق — راجعتُها كلَّها"}
            </button>
            {!mod && edit && <p className="m-0 text-xs text-slate-500" data-testid={tid("rf-group-later")}>علاماتُ مجموعة التشخيص تُسأل حين تُختار — هنا، أو في سؤال Bionic AI عنها.</p>}
            {sections.others.length > 0 && (
              <details className="mt-1 border-t border-slate-200" open={sections.others.some((x) => x.list.some((q) => value.redFlags?.[q.key] === "yes"))} data-testid={tid("rf-others")}>
                <summary className="flex cursor-pointer items-center justify-between gap-2 py-2 text-sm font-semibold text-slate-600 list-none">
                  <span className="min-w-0">علاماتُ مجموعاتٍ أخرى — اختيارية <span className="text-xs font-normal">(علّم ما وجدتَه فيها)</span></span>
                  <ChevronDown className="w-4 h-4 shrink-0" />
                </summary>
                {sections.others.map((x) => (
                  <div key={x.group} data-testid={tid(`rf-sec-${x.group}`)}>
                    <h5 className="m-0 mt-1.5 text-xs font-bold text-slate-600">{x.ar}</h5>
                    {x.list.map(flagRow)}
                  </div>
                ))}
              </details>
            )}
          </div>
        ) : (
          <div className="flex flex-col" data-testid={tid("rf-read")}>
            {hits.length > 0 && V2_RED_FLAGS.filter((q) => value.redFlags?.[q.key] === "yes").map(flagRow)}
            <p className="m-0 pt-1.5 text-sm text-emerald-800" data-testid={tid("rf-rest")}>
              {hits.length ? `باقي العلامات (${arDigits(noCount)}): لا` : `العلاماتُ الحمراء كلُّها (${arDigits(noCount)}): لا`}
              {unanswered > 0 && <span className="text-slate-500"> — بلا جواب: {arDigits(unanswered)}</span>}
            </p>
          </div>
        )}
      </Card>

      {hits.length > 0 && edit && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900" data-testid={tid("rf-next")}>
          علاماتٌ حمراء: {arDigits(hits.length)} — الإجراءُ العاجل تحت كلّ علامة. بعد الحفظ تكتب ملاحظتك وتضغط «أرسل للاعتماد» في الخطوة التالية،
          ولا يُرسَل شيءٌ إلى Bionic AI قبل اعتماد المسؤول أو المشرف العام.
        </p>
      )}

      {/* ══ ٤. تفاصيلُ اختيارية ══ */}
      {(edit || detailsFilled > 0) && (
        <details open={detailsOpen} onToggle={(e) => setDetailsOpen((e.target as HTMLDetailsElement).open)}
          className="rounded-xl border border-slate-200 bg-white min-w-0" data-testid={tid("details")}>
          <summary className="flex cursor-pointer items-center justify-between gap-2 p-3 list-none" data-testid={tid("details-toggle")}>
            <span className="min-w-0">
              <span className="font-bold text-base text-slate-900">{edit ? "تفاصيل اختيارية" : "تفاصيل مسجَّلة"}</span>
              {edit && <span className="block text-xs text-slate-500">اكتب ما تشاء منها — وما تتركه يسألك عنه Bionic AI إن احتاجه{detailsFilled ? ` · مملوءة: ${arDigits(detailsFilled)}` : ""}</span>}
            </span>
            <ChevronDown className={cn("w-5 h-5 shrink-0 transition-transform", detailsOpen && "rotate-180")} />
          </summary>
          <div className="flex flex-col gap-3 px-3 pb-3 min-w-0">
            <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-2" data-testid={tid("caution")}>
              <h4 className="m-0 mb-1 text-sm font-bold text-violet-900">يحتاجها Bionic AI قبل الخطّة — إن تركتَها سألك</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                {cautionRows.map((k) => fieldRow(k, examFieldOf(k, ctx.group)!, { hint: edit && cautionMissing.has(k) ? "سيسألك عنها" : undefined }))}
              </div>
            </div>
            {mod ? (
              moduleRows.length > 0 && (
                <div className="rounded-lg border border-dashed border-teal-600 p-2" data-testid={tid("module")}>
                  <h4 className="m-0 mb-1 text-sm font-bold text-slate-700">وحدة «{mod.ar}»</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">{moduleRows.map((f) => fieldRow(`module.${f.key}`, f))}</div>
                </div>
              )
            ) : edit && <p className="m-0 text-xs text-slate-500">اختر مجموعةَ التشخيص لتظهر خاناتُ وحدتها.</p>}
            <div className="rounded-lg border border-slate-200 p-2" data-testid={tid("other-core")}>
              <h4 className="m-0 mb-1 text-sm font-bold text-slate-700">الألم والمشي والقياسات وغيرها</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">{otherCore.map((f) => fieldRow(`core.${f.key}`, f))}</div>
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
