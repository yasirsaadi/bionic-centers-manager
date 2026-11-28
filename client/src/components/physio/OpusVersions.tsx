// **نسخُ خطّة Opus المرقّمة في الواجهة** (ترحيل ٢٠٠، §4.hb ١٠.٢ — قرارُ المالك ٦: «كلُّ حفظٍ نسخةٌ بمَن ومتى ولماذا»).
//
//  • `PlanDiffView` — الفرقُ بين نسختين بالأقسام (الجرعة · الأجهزة · المراحل · التمارين · النصوص · المقاييس · المصادر · الممنوع)، وكلُّ تغييرٍ
//    بمن أحدثه: «تصحيحُ البوّابات» (لمسه سطرٌ في سجلّ البوّابات) أو Opus أو المعتمِد.
//  • `OpusVersionHistory` — «سجلّ النسخ» لكلّ قارئ الخطّة: النسخةُ وكيف ومَن ومتى ولماذا، وملخّصُ ما تغيّر، وكم جلسةً نُفّذت عليها، و«الفرق» و«اعرض النسخة».
//  • `VersionSnapshotView` — النسخةُ كاملةً كما حُفظت (لا تتغيّر — المرحلةُ ٨ تطبعها).
// والخادمُ يحكم كلَّ شيء: مَن يقرأ ومَن يحفظ — هنا العرضُ وحده.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Eye, GitCompare, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn, formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { btlModelById, btlModelsFor, unitAr } from "@shared/btl_devices";
import { arCount, COUNT_FORMS } from "@shared/physio_agent";
import { FIELD_LABELS, forbiddenLine, type Change, type PlanDiff, type PlanSnapshot } from "@shared/physio_plan_versions";
import { ar, arText, opusGet, versionKey, versionsKey, type VersionDetail, type VersionsResponse } from "@/lib/opus_agent";
import { doseText, Fact } from "@/components/physio/OpusProposalView";

const Ltr = ({ children }: { children: React.ReactNode }) => <span dir="ltr" style={{ unicodeBidi: "isolate" }} className="break-words">{children}</span>;

/** «النسخة ٣» — شارةٌ بجانب عنوان الخطّة. */
export function OpusVersionBadge({ version, virtual }: { version: number | null; virtual?: boolean }) {
  if (!version) return null;
  return (
    <span className="rounded-full bg-violet-100 text-violet-800 border border-violet-300 px-2 py-0.5 text-xs font-semibold print:border-0" data-testid="plan-opus-version"
      title={virtual ? "محسوبةٌ من حال الخطّة — قبل نظام النسخ" : undefined}>
      النسخة {ar(version)}
    </span>
  );
}

export const when = (iso: string | null | undefined) => (iso ? `${arText(formatDateIraq(iso))} ${arText(formatTimeIraq(iso))}` : "—");

// ══ الفرق ══════════════════════════════════════════════════════════════════════════════════════════════
const VERB: Record<Change["kind"], { t: string; c: string }> = {
  added: { t: "أُضيف", c: "bg-emerald-100 text-emerald-800" },
  removed: { t: "حُذف", c: "bg-red-100 text-red-800" },
  changed: { t: "تغيّر", c: "bg-amber-100 text-amber-900" },
};
const BY: Record<Change["by"], { t: string; c: string }> = {
  gate: { t: "تصحيحُ البوّابات", c: "bg-red-50 text-red-800 border-red-200" },
  writer: { t: "Bionic AI", c: "bg-violet-50 text-violet-800 border-violet-200" },
  approver: { t: "المعتمِد", c: "bg-sky-50 text-sky-800 border-sky-200" },
};
const USE_AR: Record<string, string> = { core: "أساسيّ", adjunct: "مساعد" };

function fallbackText(target: string, v: [string, number, string][]): string {
  const code = target.split(":")[1] ?? "";
  const params = btlModelsFor(code).flatMap((m) => m.params);
  return v.map(([k, val, src]) => {
    const p = params.find((x) => x.key === k);
    return `${p?.labelAr ?? k}: ${ar(val)}${p ? ` ${unitAr(p.unit)}` : ""} (${src === "protocol" ? "البروتوكول" : src === "approver" ? "المعتمِد" : "مصدر"})`;
  }).join("، ");
}
/** **قيمةٌ مركّبة لا شكلَ معروفاً لها** (بقيّةُ إعدادات الجهاز، والبطاقة، وملاحظاتُ المراحل…) — «حقل: قيمة» بأسماء الفرق،
 *  فلا يُعرض سطرٌ بلا «كان/صار» (مراجعةُ Codex على #777). */
function genericText(v: unknown, depth = 0): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return ar(v);
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "string") return USE_AR[v] ?? v;
  if (Array.isArray(v)) return v.length ? v.map((x) => genericText(x, depth + 1)).join(depth ? "؛ " : "\n") : "—";
  if (typeof v === "object") {
    const parts = Object.entries(v as Record<string, unknown>)
      .filter(([, x]) => x !== null && x !== undefined && x !== "" && !(Array.isArray(x) && x.length === 0))
      .map(([k, x]) => `${FIELD_LABELS[k] ?? k}: ${genericText(x, depth + 1)}`);
    return parts.length ? parts.join(depth ? "، " : "\n") : "—";
  }
  return String(v);
}
/** قيمةُ «قبل» أو «بعد» بالعربية — الأرقامُ هنديّة، والقوائمُ مقروءة، والنصُّ الطويل يُطوى. */
function valueText(v: unknown, c: Change): string | null {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") return ar(v);
  if (typeof v === "boolean") return v ? "نعم" : "لا";
  if (typeof v === "string") return USE_AR[v] ?? v;
  if (Array.isArray(v)) {
    if (c.labelAr.endsWith("— الجرعة") && v.length === 5) {
      const [sets, reps, holdSeconds, , doseNote] = v as (number | string | null)[];
      return doseText({ sets: sets as number | null, reps: reps as number | null, holdSeconds: holdSeconds as number | null, doseNote: doseNote as string | null });
    }
    if (c.labelAr.endsWith("— الموعدُ الدوريّ")) {
      const [every, times] = v as (number | null)[];
      if (!every) return "كلَّ جلسة";
      return `${every === 1 ? "كلّ يوم" : `كلّ ${arCount(every, COUNT_FORMS.day)}`}${times ? ` × ${arCount(times, COUNT_FORMS.time)}` : ""}`;
    }
    if (c.labelAr.endsWith("— النطاق")) {
      const [a, b] = v as (number | null)[];
      return a && b ? `الجلسات ${ar(a)}–${ar(b)}` : "—";
    }
    if (c.labelAr.endsWith("— القيمُ الاحتياطية")) return fallbackText(c.target, v as [string, number, string][]) || "—";
    return v.map((x) => (x === null ? "—" : typeof x === "number" ? ar(x) : typeof x === "object" ? genericText(x, 1) : String(x))).join("، ");
  }
  if (typeof v === "object") {
    const o = v as Record<string, any>;
    if ("dose" in o && Array.isArray(o.dose)) {
      const [sets, reps, holdSeconds, , doseNote] = o.dose as (number | string | null)[];
      return doseText({ sets: sets as number | null, reps: reps as number | null, holdSeconds: holdSeconds as number | null, doseNote: doseNote as string | null }) || "—";
    }
    if ("use" in o) {
      const model = o.modelId ? btlModelById(String(o.modelId)) : null;
      return [USE_AR[o.use] ?? o.use, o.minutes ? arCount(o.minutes, COUNT_FORMS.minute) : null,
        o.everyDays ? `${o.everyDays === 1 ? "كلّ يوم" : `كلّ ${arCount(o.everyDays, COUNT_FORMS.day)}`}${o.times ? ` × ${arCount(o.times, COUNT_FORMS.time)}` : ""}` : null,
        model ? `الجهاز: ${model.nameAr}` : null, o.program ? `البرنامج: ${o.program}` : null,
        Array.isArray(o.fallback) && o.fallback.length ? `القيم: ${fallbackText(c.target, o.fallback)}` : null].filter(Boolean).join("، ");
    }
    if ("min" in o && "max" in o) return `${o.nameAr ?? ""} ${ar(o.min)}–${ar(o.max)}${o.unitAr ? ` ${o.unitAr}` : ""}`.trim();
    return genericText(o);
  }
  return null;
}

function ChangeRow({ c }: { c: Change }) {
  const b = c.before === undefined ? null : valueText(c.before, c);
  const a = c.after === undefined ? null : valueText(c.after, c);
  const long = (b?.length ?? 0) + (a?.length ?? 0) > 120;
  return (
    <li className="text-sm rounded border px-2 py-1 min-w-0 space-y-0.5" data-testid="plan-diff-change" data-by={c.by}>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={cn("rounded-full px-2 text-[11px] font-semibold", VERB[c.kind].c)}>{VERB[c.kind].t}</span>
        <span className="min-w-0 break-words">{c.labelAr}</span>
        <span className={cn("rounded-full border px-1.5 text-[10px] font-semibold", BY[c.by].c)}>{BY[c.by].t}</span>
      </div>
      {(b || a) && c.kind === "changed" && !long && (
        <div className="text-xs text-slate-700 break-words">
          <span className="text-muted-foreground">كان: </span><span className="line-through decoration-red-400" dir="auto">{b}</span>
          <span className="mx-1">⟵</span><span className="text-muted-foreground">صار: </span><b dir="auto">{a}</b>
        </div>
      )}
      {(b || a) && c.kind === "changed" && long && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-700">اعرض النصّين</summary>
          <div className="grid gap-1 sm:grid-cols-2 mt-1">
            <div className="rounded bg-red-50 p-1.5 whitespace-pre-line break-words" dir="auto"><div className="text-[10px] text-muted-foreground">كان</div>{b}</div>
            <div className="rounded bg-emerald-50 p-1.5 whitespace-pre-line break-words" dir="auto"><div className="text-[10px] text-muted-foreground">صار</div>{a}</div>
          </div>
        </details>
      )}
      {c.kind === "added" && a && a !== "—" && <div className="text-xs text-slate-700 break-words" dir="auto" data-testid="plan-diff-added-detail">{a}</div>}
    </li>
  );
}

/** **الفرقُ بالأقسام** — وكلُّ ما صحّحته البوّاباتُ موسومٌ «تصحيحُ البوّابات». */
export function PlanDiffView({ diff, testId = "plan-diff" }: { diff: PlanDiff | null | undefined; testId?: string }) {
  if (!diff || diff.empty) return <p className="m-0 text-sm text-muted-foreground" data-testid={`${testId}-empty`}>لا تغيير.</p>;
  return (
    <div className="space-y-2 min-w-0" data-testid={testId}>
      {diff.sections.map((s) => (
        <div key={s.key} className="min-w-0">
          <div className="text-xs font-bold text-slate-800 mb-1">{s.labelAr} ({ar(s.changes.length)})</div>
          <ul className="m-0 p-0 list-none space-y-1">{s.changes.map((c, i) => <ChangeRow key={i} c={c} />)}</ul>
        </div>
      ))}
    </div>
  );
}

// ══ سجلّ النسخ ═════════════════════════════════════════════════════════════════════════════════════════
export function OpusVersionHistory({ planId }: { planId: number }) {
  const q = useQuery<VersionsResponse>({ queryKey: versionsKey(planId), queryFn: () => opusGet(`/api/physio/plans/${planId}/versions`), retry: false });
  const [diffOf, setDiffOf] = useState<number | null>(null);
  const [viewOf, setViewOf] = useState<number | null>(null);
  if (q.isLoading) return <p className="text-sm text-muted-foreground m-0">جارٍ التحميل…</p>;
  if (q.isError || !q.data) return <p className="text-sm text-red-700 m-0">تعذّر تحميل سجلّ النسخ.</p>;
  const list = [...q.data.versions].reverse();
  return (
    <div className="space-y-2" dir="rtl" data-testid="opus-version-history">
      {q.data.virtual && (
        <p className="m-0 text-[11px] text-muted-foreground" data-testid="opus-versions-virtual">
          اعتُمدت هذه الخطّة قبل نظام النسخ، فنسخُها محسوبةٌ من حالها — وتُكتب في أوّل تعديل.
        </p>
      )}
      <ol className="m-0 p-0 list-none space-y-2">
        {list.map((v) => (
          <li key={v.version} className={cn("rounded-md border p-2 text-sm space-y-1 min-w-0", v.version === q.data!.current ? "border-violet-300 bg-violet-50/40" : "bg-white")}
            data-testid={`opus-version-${v.version}`}>
            <div className="flex flex-wrap items-center gap-1.5">
              <b>النسخة {ar(v.version)}</b>
              <span className={cn("rounded-full px-2 text-[11px] font-semibold", v.how === "approval" ? "bg-emerald-100 text-emerald-800"
                : v.how === "opus_revision" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800")}>{v.howAr}</span>
              {v.version === q.data!.current && <span className="rounded-full bg-violet-700 text-white px-2 text-[11px] font-semibold">السارية الآن</span>}
              {v.backfilled && <span className="rounded-full bg-slate-100 text-slate-700 px-2 text-[11px]">قبل نظام النسخ</span>}
            </div>
            <div className="text-xs text-muted-foreground">{v.createdByName ?? "—"} · {when(v.createdAt)}</div>
            {v.reason && <div className="text-xs"><span className="text-muted-foreground">{v.how === "opus_revision" ? "الطلب: " : "السبب: "}</span><span dir="auto">{v.reason}</span></div>}
            {v.approvalNote && <div className="text-xs"><span className="text-muted-foreground">ملاحظةُ الحفظ: </span><span dir="auto">{v.approvalNote}</span></div>}
            {v.diffSummaryAr && v.version > 1 && <div className="text-xs text-slate-700" data-testid={`opus-version-summary-${v.version}`}>ما تغيّر: {v.diffSummaryAr}</div>}
            <div className="text-[11px] text-muted-foreground">{v.sessionsOnVersion ? `نُفّذت عليها ${arCount(v.sessionsOnVersion, COUNT_FORMS.session)}` : "لم تُنفَّذ عليها جلسة"}</div>
            <div className="flex flex-wrap gap-1.5">
              {v.version > 1 && (
                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setDiffOf(v.version)} data-testid={`button-version-diff-${v.version}`}>
                  <GitCompare className="w-3.5 h-3.5" /> الفرق
                </Button>
              )}
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setViewOf(v.version)} data-testid={`button-version-view-${v.version}`}>
                <Eye className="w-3.5 h-3.5" /> اعرض النسخة
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {diffOf !== null && <VersionDiffDialog planId={planId} version={diffOf} versions={q.data.versions.map((v) => v.version)} onClose={() => setDiffOf(null)} />}
      {viewOf !== null && <VersionSnapshotDialog planId={planId} version={viewOf} onClose={() => setViewOf(null)} />}
    </div>
  );
}

function VersionDiffDialog({ planId, version, versions, onClose }: { planId: number; version: number; versions: number[]; onClose: () => void }) {
  const [against, setAgainst] = useState(version - 1);
  const q = useQuery<{ from: number; to: number; diff: PlanDiff; diffSummaryAr: string }>({
    queryKey: [`/api/physio/plans/${planId}/versions/${version}/diff`, against],
    queryFn: () => opusGet(`/api/physio/plans/${planId}/versions/${version}/diff?against=${against}`),
  });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-1.5"><GitCompare className="w-4 h-4" /> النسخة {ar(version)} — ما تغيّر</DialogTitle></DialogHeader>
        <label className="flex flex-wrap items-center gap-2 text-sm">
          قارن بـ
          <select className="rounded-md border px-2 py-1 bg-white text-sm" value={against} onChange={(e) => setAgainst(Number(e.target.value))} data-testid="select-version-against">
            {/* بالأقدم وحده — فيبقى «كان ⟵ صار» من الأقدم إلى هذه النسخة. */}
            {versions.filter((n) => n < version).map((n) => <option key={n} value={n}>النسخة {ar(n)}</option>)}
          </select>
        </label>
        {q.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : q.isError || !q.data ? <p className="text-sm text-red-700">تعذّر تحميل الفرق.</p>
          : <PlanDiffView diff={q.data.diff} testId="version-diff" />}
      </DialogContent>
    </Dialog>
  );
}

function VersionSnapshotDialog({ planId, version, onClose }: { planId: number; version: number; onClose: () => void }) {
  const q = useQuery<VersionDetail>({ queryKey: versionKey(planId, version), queryFn: () => opusGet(`/api/physio/plans/${planId}/versions/${version}`) });
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-1.5"><History className="w-4 h-4" /> النسخة {ar(version)}{q.data ? ` — ${q.data.howAr}` : ""}</DialogTitle></DialogHeader>
        {q.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p> : q.isError || !q.data ? <p className="text-sm text-red-700">تعذّر تحميل النسخة.</p> : (
          <div className="space-y-3">
            <p className="m-0 text-xs text-muted-foreground">{q.data.createdByName ?? "—"} · {when(q.data.createdAt)}{q.data.reason ? ` — ${q.data.reason}` : ""}</p>
            <VersionSnapshotView s={q.data.snapshot} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Block({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return <section className="space-y-1 min-w-0" data-testid={testId}><h4 className="m-0 text-sm font-bold">{title}</h4>{children}</section>;
}
function Txt({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div className="text-sm min-w-0"><span className="text-muted-foreground text-xs">{label}: </span><span dir="auto" className="whitespace-pre-line break-words">{value}</span></div>;
}

/** **النسخةُ كاملة** — ما يُطبع منها (الجرعةُ والأجهزةُ والمراحلُ بتمارينها والنصوصُ والمقاييسُ والمصادرُ والممنوع). */
export function VersionSnapshotView({ s }: { s: PlanSnapshot }) {
  const weeks = s.totalSessions && s.sessionsPerWeek ? Math.ceil(s.totalSessions / s.sessionsPerWeek) : null;
  return (
    <div className="space-y-3 min-w-0" data-testid="version-snapshot">
      <div className="text-sm font-semibold" dir="auto">{s.titleAr}</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Fact label="الجلسات" value={`${s.totalSessions ? arCount(s.totalSessions, COUNT_FORMS.session) : "—"}${s.sessionsPerWeek ? `، ${ar(s.sessionsPerWeek)} في الأسبوع` : ""}${weeks ? `، نحو ${arCount(weeks, COUNT_FORMS.week)}` : ""}`} />
        <Fact label="مدّة الجلسة" value={s.sessionMinutes ? arCount(s.sessionMinutes, COUNT_FORMS.minute) : "—"} />
        <Fact label="المسار" value={s.track?.nameAr ?? "—"} />
        <Fact label="يبدأ من" value={`المرحلة ${ar(s.startingPhase)}`} />
      </div>
      {s.forbidden.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-950">
          {/* كلُّ جهازٍ مرّةً بكلّ أسبابه — بالسطر الذي يركّبه الخادم نفسِه. */}
          {forbiddenLine(s.forbidden)}
        </div>
      )}
      <Block title="الأجهزة">
        {s.devices.length === 0 ? <p className="m-0 text-sm text-muted-foreground">لا جهاز.</p> : (
          <ul className="m-0 p-0 list-none space-y-1">
            {s.devices.map((d) => (
              <li key={d.deviceCode} className="rounded border p-1.5 text-sm space-y-0.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <b>{d.nameAr}</b>
                  <span className={cn("rounded-full px-2 text-[11px]", d.use === "core" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800")}>{USE_AR[d.use]}</span>
                  {d.minutes ? <span className="text-xs">{arCount(d.minutes, COUNT_FORMS.minute)}</span> : null}
                  {d.everyDays ? <span className="text-xs">{d.everyDays === 1 ? "كلّ يوم" : `كلّ ${arCount(d.everyDays, COUNT_FORMS.day)}`}{d.times ? ` × ${arCount(d.times, COUNT_FORMS.time)}` : ""}</span> : null}
                </div>
                {d.btl && (
                  <div className="text-xs text-slate-700">
                    جهاز BTL: {d.btl.modelNameAr ?? btlModelById(d.btl.modelId)?.nameAr ?? <Ltr>{d.btl.modelNameEn}</Ltr>}
                    {" · "}البرنامج: {d.btl.program ? <Ltr>{d.btl.program}</Ltr> : "—"}
                    {d.btl.fallback.length > 0 && <> · {d.btl.fallback.map((f) => `${f.labelAr ?? f.key}: ${ar(f.value)} ${unitAr(f.unit)}`).join("، ")}</>}
                  </div>
                )}
                {d.note && <div className="text-xs text-slate-700 whitespace-pre-line" dir="auto">{d.note}</div>}
              </li>
            ))}
          </ul>
        )}
      </Block>
      <Block title="المراحل والتمارين">
        <div className="grid gap-2 sm:grid-cols-2">
          {s.phases.map((p) => (
            <div key={p.position} className="rounded-md bg-slate-50 border p-2 text-sm min-w-0">
              <b className="block">{p.nameAr}</b>
              {p.sessionFrom && p.sessionTo ? <div className="text-[11px] text-muted-foreground">الجلسات من {ar(p.sessionFrom)} إلى {ar(p.sessionTo)}</div> : null}
              {p.goals && <div className="text-xs whitespace-pre-line" dir="auto">{p.goals}</div>}
              <ul className="m-0 ps-5 list-disc text-xs mt-1">{p.exercises.map((x) => <li key={x.exerciseId}>{x.nameAr} <span className="text-muted-foreground">— {doseText(x)}</span></li>)}</ul>
            </div>
          ))}
        </div>
      </Block>
      <Block title="الأهداف والاحتياطات وبرنامج البيت">
        <Txt label="الأهداف" value={s.texts.goalsAr} />
        <Txt label="الاحتياطات" value={s.texts.precautionsAr} />
        <Txt label="قواعد التوقّف" value={s.texts.stopRulesAr} />
        <Txt label="برنامج البيت" value={s.texts.homeProgramAr} />
      </Block>
      {s.measuresOwn && s.measures.length > 0 && (
        <Block title="المقاييس"><ul className="m-0 ps-5 list-disc text-sm">{s.measures.map((m) => <li key={m.code}>{m.nameAr} ({ar(m.min)}–{ar(m.max)}{m.unitAr ? ` ${m.unitAr}` : ""})</li>)}</ul></Block>
      )}
      {s.sources.length > 0 && (
        <Block title="المصادر">
          <ul className="m-0 ps-5 list-disc text-xs space-y-0.5">
            {s.sources.map((x, i) => (
              <li key={i} className="break-words">
                <a href={x.url} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-flex items-center gap-1"><Ltr>{x.title}</Ltr><ExternalLink className="w-3 h-3 shrink-0" /></a>
                {x.addedBy === "approver" && <span className="text-sky-800"> — أضافه المعتمِد</span>}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}
