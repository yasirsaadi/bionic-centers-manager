// **التقييمُ والتقدّم** (§4.cp — المرحلةُ السادسة): موعدُ التقييم التالي، و«تقييم جديد» لكاتبي الخطط، وجدولُ القياسات، ومنحنى التقدّم
// (كلُّ مقياسٍ على ٠–١٠٠ حيث ١٠٠ الأفضل — محورٌ واحد لمقاييسَ مختلفة الوحدات)، وحكمُ الأوّل والأخير. والمنفّذُ يرى ولا يكتب.
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ClipboardCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { apiRequest } from "@/lib/queryClient";
import { checkVisitDate, baghdadTodayYmd } from "@shared/visit_date";
import {
  ASSESSMENT_DECISIONS, DECISION_LABELS, DECISION_LABELS_EN, GOAL_STATUS_LABELS, GOALS_MEASURE, KIND_LABELS, KIND_LABELS_EN, PAIN_MEASURE,
  VERDICT_LABELS, VERDICT_LABELS_EN, compareAssessments, goalsPct, normalized,
  type AssessmentDecision, type AssessmentKind, type DueState, type GoalMark, type MeasureDef, type ScoreSnap,
} from "@shared/physio_assessments";
import { MeasureRange, directionLabel } from "@/components/physio/ProtocolMeasures";

interface Assessment {
  id: number; kind: AssessmentKind; assessedOn: string; pain: number | null; scores: ScoreSnap[]; goals: GoalMark[];
  notes: string | null; decision: AssessmentDecision; assessedByName: string | null;
}
interface View {
  assessments: Assessment[]; measures: MeasureDef[]; measuresStatus: "draft" | "approved" | null; goals: string[]; due: DueState; canAssess: boolean;
}

const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
//  لوحةُ الألوان المصنّفة المعتمَدة (dataviz — الترتيبُ ثابت، لا يُدار): الألمُ أوّلاً، فالأهداف، فمقاييسُ البروتوكول بترتيبها.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"];

/** نصُّ موعد التقييم التالي. */
export function dueText(due: DueState, en = false): string | null {
  if (due.state === "none") return null;
  const kind = due.kind ? (en ? KIND_LABELS_EN : KIND_LABELS)[due.kind] : "";
  if (due.state === "baseline") return en ? `Baseline assessment due${due.overdueDays ? ` — ${due.overdueDays} days late` : ""}`
    : `التقييمُ الأوّليّ مستحقّ${due.overdueDays ? ` — متأخّرٌ ${due.overdueDays} يوماً` : ""}`;
  if (due.state === "due") return en ? `${kind} assessment due since ${due.dueOn}` : `التقييمُ ${kind} مستحقٌّ منذ ${due.dueOn}${due.overdueDays ? ` (${due.overdueDays} يوماً)` : ""}`;
  return en ? `Next assessment (${kind}): ${due.dueOn}` : `التقييمُ التالي (${kind}): ${due.dueOn}`;
}

export function PlanProgress({ planId, planStatus, lang, onModify }: { planId: number; planStatus: string; lang: "ar" | "en"; onModify: () => void }) {
  const en = lang === "en";
  const q = useQuery<View>({ queryKey: [`/api/physio/plans/${planId}/assessments`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${planId}/assessments`)).json() });
  const [open, setOpen] = useState(false);
  const v = q.data;
  const list = v?.assessments ?? [];
  //  أعمدةُ المقاييس: ما قِيس فعلاً (برمزه، باسم آخر لقطة) — فلا يختفي مقياسٌ حُذف من البروتوكول بعد قياسه.
  const columns = useMemo(() => {
    const m = new Map<string, MeasureDef>();
    for (const a of list) for (const s of a.scores ?? []) m.set(s.code, s);
    return Array.from(m.values());
  }, [list]);
  const series = useMemo(() => [
    ...(list.some((a) => a.pain != null) ? [{ key: PAIN_MEASURE.code, def: PAIN_MEASURE }] : []),
    ...(list.some((a) => goalsPct(a.goals) != null) ? [{ key: GOALS_MEASURE.code, def: GOALS_MEASURE }] : []),
    ...columns.map((c) => ({ key: c.code, def: c })),
  ].slice(0, SERIES.length), [list, columns]);
  const chartData = list.map((a) => {
    const row: Record<string, any> = { date: a.assessedOn };
    if (a.pain != null) row[PAIN_MEASURE.code] = normalized(a.pain, PAIN_MEASURE);
    const g = goalsPct(a.goals);
    if (g != null) row[GOALS_MEASURE.code] = g;
    for (const s of a.scores ?? []) row[s.code] = normalized(s.value, s);
    return row;
  });
  const cmp = list.length >= 2 ? compareAssessments(list[0], list[list.length - 1]) : null;
  const due = v ? dueText(v.due, en) : null;
  const name = (d: MeasureDef) => (en ? d.nameEn : d.nameAr);

  return (
    <Card className="p-4 space-y-3" data-testid="plan-progress">
      <div className="flex items-center gap-2 flex-wrap">
        <h3 className="font-bold text-sm flex items-center gap-1"><ClipboardCheck className="w-4 h-4 text-green-700" /> {en ? "Assessment & progress" : "التقييم والتقدّم"}</h3>
        {due && <Badge variant="outline" className={v!.due.state === "upcoming" ? "bg-slate-50" : "bg-amber-50 text-amber-900 border-amber-300"} data-testid="plan-due">{due}</Badge>}
        {cmp && cmp.verdict !== "insufficient" && (
          <Badge variant="outline" className={cmp.verdict === "improved" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : cmp.verdict === "worse" ? "bg-red-50 text-red-800 border-red-300" : ""}
            data-testid="plan-verdict">
            {(en ? VERDICT_LABELS_EN : VERDICT_LABELS)[cmp.verdict]} — {en ? `${cmp.improved} of ${cmp.compared} measures better` : `تحسّن ${cmp.improved} من ${cmp.compared} مقاييس`}
          </Badge>
        )}
        {v?.canAssess && (
          <Button size="sm" className="gap-1 ms-auto print:hidden" onClick={() => setOpen(true)} data-testid="button-new-assessment"><Plus className="w-4 h-4" /> {en ? "New assessment" : "تقييم جديد"}</Button>
        )}
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">…</p> : list.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="plan-no-assessment">{en ? "No assessment yet." : "لا تقييمَ بعد — الأوّليُّ نقطةُ البداية التي يُقاس عليها التحسّن."}</p>
      ) : (
        <>
          {list.length >= 2 && series.length > 0 && (
            <div className="h-56" dir="ltr" data-testid="plan-progress-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
                  <CartesianGrid stroke="#e5e7eb" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#52514e" }} />
                  <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tick={{ fontSize: 11, fill: "#52514e" }} />
                  <Tooltip formatter={(val: any, key: any) => {
                    const s = series.find((x) => x.key === key);
                    return [`${val}/100`, s ? name(s.def) : key];
                  }} />
                  <Legend formatter={(key: any) => { const s = series.find((x) => x.key === key); return <span style={{ color: "#52514e", fontSize: 11 }}>{s ? name(s.def) : key}</span>; }} />
                  {series.map((s, i) => (
                    <Line key={s.key} dataKey={s.key} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 5 }} connectNulls isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          {list.length >= 2 && <p className="text-[11px] text-muted-foreground">{en ? "Each measure on 0–100 where 100 is best — the table below has the raw values." : "كلُّ مقياسٍ على ٠–١٠٠ حيث ١٠٠ الأفضل — والقيمُ الفعلية في الجدول."}</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="plan-assessments">
              <thead><tr className="text-muted-foreground border-b">
                <th className="text-start p-1">{en ? "Date" : "التاريخ"}</th><th className="text-start p-1">{en ? "Type" : "النوع"}</th>
                <th className="text-start p-1">{name(PAIN_MEASURE)}</th>
                {columns.map((c) => <th key={c.code} className="text-start p-1" title={directionLabel(c, en)}>{name(c)}</th>)}
                <th className="text-start p-1">{name(GOALS_MEASURE)}</th><th className="text-start p-1">{en ? "Decision" : "القرار"}</th>
                <th className="text-start p-1">{en ? "By" : "المقيِّم"}</th>
              </tr></thead>
              <tbody>
                {list.map((a) => {
                  const g = goalsPct(a.goals);
                  return (
                    <tr key={a.id} className="border-b last:border-0 align-top" data-testid={`assessment-${a.id}`}>
                      <td className="p-1 whitespace-nowrap">{a.assessedOn}</td>
                      <td className="p-1">{(en ? KIND_LABELS_EN : KIND_LABELS)[a.kind]}</td>
                      <td className="p-1">{a.pain ?? "—"}</td>
                      {columns.map((c) => <td key={c.code} className="p-1">{a.scores.find((s) => s.code === c.code)?.value ?? "—"}</td>)}
                      <td className="p-1">{g == null ? "—" : `${g}%`}</td>
                      <td className="p-1">{(en ? DECISION_LABELS_EN : DECISION_LABELS)[a.decision]}</td>
                      <td className="p-1">{a.assessedByName ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {list.some((a) => a.notes) && (
            <ul className="text-xs space-y-0.5">{list.filter((a) => a.notes).map((a) => <li key={a.id}><b>{a.assessedOn}:</b> {a.notes}</li>)}</ul>
          )}
        </>
      )}
      {open && v && <AssessmentDialog planId={planId} planStatus={planStatus} view={v} onClose={() => setOpen(false)}
        onSaved={(d) => { setOpen(false); if (d === "modify") onModify(); }} />}
    </Card>
  );
}

function AssessmentDialog({ planId, planStatus, view, onClose, onSaved }: {
  planId: number; planStatus: string; view: View; onClose: () => void; onSaved: (d: AssessmentDecision) => void;
}) {
  const { toast } = useToast();
  const isAdmin = Boolean((useBranchSession() as any)?.isAdmin);
  const [date, setDate] = useState(baghdadTodayYmd());
  const [pain, setPain] = useState<string>("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<(0 | 1 | 2 | null)[]>(view.goals.map(() => null));
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<AssessmentDecision>("continue");
  const m = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/physio/plans/${planId}/assessments`, {
      assessedOn: date, pain: pain === "" ? null : Number(pain), notes: notes.trim() || null, decision,
      scores: view.measures.map((x) => ({ code: x.code, value: values[x.code] ?? "" })),
      goals: view.goals.map((text, i) => ({ text, status: goals[i] })),
    })).json(),
    onSuccess: () => {
      toast({ title: "حُفظ التقييم", description: decision === "discharge" ? "وتخرّجت الخطّة" : decision === "stop" ? "وأُوقفت الخطّة" : decision === "modify" ? "عدّل الخطّةَ الآن — وتعود للاعتماد" : undefined });
      onSaved(decision);
    },
    onError: (e) => toast({ title: "خطأ", description: errText(e), variant: "destructive" }),
  });
  const dateOk = checkVisitDate(date, isAdmin);
  const anything = pain !== "" || Object.values(values).some((x) => x !== "") || goals.some((g) => g !== null);
  const approved = planStatus === "approved";
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader><DialogTitle>تقييمٌ جديد</DialogTitle></DialogHeader>
        {view.measuresStatus === "draft" && (
          <p className="text-[11px] rounded border border-yellow-300 bg-yellow-50 text-yellow-800 px-2 py-1">مقاييسُ هذا البروتوكول غير معتمدة بعد — تُسجَّل كما هي.</p>
        )}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm">التاريخ
              <Input type="date" value={date} max={baghdadTodayYmd()} onChange={(e) => setDate(e.target.value)} className="mt-1 bg-white" data-testid="assess-date" />
            </label>
            <label className="text-sm">{PAIN_MEASURE.nameAr}
              <select className="mt-1 h-9 w-full rounded-md border bg-white px-2 text-sm" value={pain} onChange={(e) => setPain(e.target.value)} data-testid="assess-pain">
                <option value="">— لم يُقَس</option>
                {Array.from({ length: 11 }, (_, i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </label>
          </div>
          {!dateOk.ok && <p className="text-[11px] text-red-700">{dateOk.message}</p>}
          {view.measures.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium">مقاييسُ البروتوكول (اتركها فارغةً إن لم تُقَس)</div>
              {view.measures.map((x) => (
                <div key={x.code} className="grid grid-cols-3 gap-2 items-center">
                  <div className="col-span-2 text-sm">{x.nameAr}
                    <div className="text-[11px] text-muted-foreground"><MeasureRange m={x} /> · {directionLabel(x)}</div></div>
                  <Input type="number" step="any" allowNegative={x.min < 0} min={x.min} max={x.max} value={values[x.code] ?? ""} className="bg-white"
                    onChange={(e) => setValues((p) => ({ ...p, [x.code]: e.target.value }))} data-testid={`assess-score-${x.code}`} />
                </div>
              ))}
            </div>
          )}
          {view.goals.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">أهدافُ الخطّة</div>
              {view.goals.map((g, i) => (
                <div key={i} className="rounded border p-1.5 text-sm">
                  <div>{g}</div>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {GOAL_STATUS_LABELS.map((l, st) => (
                      <Button key={st} type="button" size="sm" variant={goals[i] === st ? "default" : "outline"} className="h-7 text-xs"
                        onClick={() => setGoals((p) => p.map((x, j) => (j === i ? (x === st ? null : (st as 0 | 1 | 2)) : x)))}
                        data-testid={`assess-goal-${i}-${st}`}>{l}</Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <label className="text-sm block">ملاحظات{decision === "stop" ? " — سببُ الإيقاف *" : ""}
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 bg-white" data-testid="assess-notes" />
          </label>
          <div>
            <div className="text-xs font-medium mb-1">القرار</div>
            <div className="grid grid-cols-2 gap-1">
              {ASSESSMENT_DECISIONS.map((d) => {
                const disabled = (d === "discharge" || d === "stop") && !approved;
                return (
                  <Button key={d} type="button" size="sm" variant={decision === d ? "default" : "outline"} disabled={disabled}
                    className={d === "discharge" && decision === d ? "bg-sky-700 hover:bg-sky-800" : d === "stop" && decision === d ? "bg-red-700 hover:bg-red-800" : ""}
                    onClick={() => setDecision(d)} data-testid={`assess-decision-${d}`}>{DECISION_LABELS[d]}</Button>
                );
              })}
            </div>
            {!approved && <p className="text-[11px] text-muted-foreground mt-1">التخرّجُ والإيقافُ لخطّةٍ معتمَدة.</p>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={m.isPending || !anything || !dateOk.ok || (decision === "stop" && !notes.trim())} onClick={() => m.mutate()} data-testid="button-save-assessment">حفظ التقييم</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ══ «مستحقّ التقييم» — تبويبٌ في صفحة الخطط لكاتبيها ══════════════════════════════════════════════════════
interface DueRow { planId: number; titleAr: string; branchName: string | null; patientName: string; patientCode: string | null; createdByName: string | null; due: DueState }

export function DueAssessmentsList() {
  const q = useQuery<{ plans: DueRow[] }>({ queryKey: ["/api/physio/assessments/due"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/assessments/due")).json() });
  if (q.isLoading) return <div className="text-sm text-muted-foreground p-3">جارٍ التحميل…</div>;
  const rows = q.data?.plans ?? [];
  if (!rows.length) return <Card className="p-4 text-sm text-muted-foreground mt-2" data-testid="due-empty">لا خطةَ مستحقّةَ التقييم الآن.</Card>;
  return (
    <div className="space-y-2 mt-2" data-testid="due-list">
      <p className="text-[11px] text-muted-foreground">تقييمٌ أوّليٌّ عند الاعتماد، ثمّ كلَّ أربعة أسابيع، وختاميٌّ عند نهاية مدّة الخطّة. تنبيهٌ لا قيد — الجلساتُ تستمرّ.</p>
      {rows.map((r) => (
        <Link key={r.planId} href={`/physio/plans/${r.planId}`} className="block rounded-lg border bg-white px-3 py-2.5 hover:border-primary/40 hover:bg-slate-50" data-testid={`due-row-${r.planId}`}>
          <div className="flex items-center gap-2 flex-wrap text-sm">
            <span className="font-semibold">{r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}</span>
            <span>— {r.titleAr}</span>
            <Badge variant="outline" className={r.due.overdueDays > 7 ? "bg-red-50 text-red-800 border-red-300" : "bg-amber-50 text-amber-900 border-amber-300"}>{dueText(r.due)}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{r.branchName ?? "—"} · كتبها {r.createdByName ?? "—"}</div>
        </Link>
      ))}
    </div>
  );
}
