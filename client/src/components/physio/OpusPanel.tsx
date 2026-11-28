// **لوحُ Opus على بطاقة معاينة العلاج الطبيعي الإلزامية** (§4.ha الفقرة ١١.١ — خطوةُ «Opus يفحص» في النموذج الذي وافق عليه المالك).
//
// حالُ الوظيفة بمراحلها (يقرأ المعاينة · يبحث · يكتب · المراجع يدقّق · المدقّق · البوّابات)، وأسئلةُ Opus يجيب عنها الفاحصُ أو المعتمِد،
// وسببُ الإخفاق و«أعد»، وحين تُكتب: المعتمِدُ يفتح «الخطّة المقترحة» وغيرُه يرى «خطّة Opus بانتظار الاعتماد» وحدها.
// **بلا `refetchInterval`** (قرارُ المالك ٢٠٢٦-٠٩-٢٣): التحديثُ بإشارة الخادم بعد كلّ مرحلة (`opus` و«تغيّر شيء» — §4.cy).
// والخادمُ يحكم كلَّ شيء: مَن يشغّل ومَن يجيب ومَن يلغي — هنا ما يقوله وحده.
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { JOB_ERROR_TEXTS, JOB_STATUS_LABELS, MAX_QUESTION_ROUNDS, OPUS_AWAITING_LABEL, isActiveJobStatus } from "@shared/physio_agent";
import {
  V3_GROUPS, answerFollowUps, conditionOf, examV2MissingLabel, isExamV2, moduleOf, parseExamV2, V2_MODULES, V2_RED_FLAGS, RED_FLAG_URGENCY_AR,
  type AgentGate, type PhysioExamV2, type V2Field, type V2Value,
} from "@shared/physio_exam_v2";
import { FieldBox, FieldInput, segBtn } from "@/components/physio/ExamFields";
import { examFieldOf } from "@/components/physio/ExamV3Form";
import { ar, opusGet, opusJobKey, opusPost, stageStates, type OpusJobResponse, type OpusJobSummary, type OpusJobView } from "@/lib/opus_agent";

export const RUN_LABEL = "اكتب الخطّة بـ Bionic AI";
export const RERUN_LABEL = "أعد";

function errorText(job: Pick<OpusJobView, "error" | "errorCode" | "errorDetailAr">): string {
  //  C3 — للمعتمِد سببُ الإخفاق مفصَّلاً (الخادمُ لا يرسله لغيره).
  return job.errorDetailAr || job.error || (job.errorCode ? JOB_ERROR_TEXTS[job.errorCode] : "") || "لم يكتب Bionic AI الخطّة";
}
/** §4.hb — وظيفةُ «تعديل» بطلب معتمِد: «أعِده إلى Opus» قبل الاعتماد، أو «اطلب من Opus تعديلاً» بعده. */
function reviseLine(job: OpusJobView): string | null {
  if (job.kind !== "revise") return null;
  return job.reviseScope === "amend" ? "يعدّل Bionic AI الخطّةَ المعتمَدة بطلب المعتمِد — النسخةُ الحالية سارية حتى يحفظ المعتمِد ما يقترحه."
    : "يعيد Bionic AI كتابةَ الخطّة بملاحظة المعتمِد، ثمّ تعود للاعتماد.";
}

type Q = OpusJobView["questions"][number];
const isTyped = (q: Q) => q.affects === "exam_field" && (q.examFields?.length ?? 0) > 0;
const emptyV = (v: V2Value | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
/** اسمُ الاقتراح بالعربية — مجموعةٌ أو حالة. */
function suggestionLabel(field: string, value: string): string {
  if (field === "core.group") return V3_GROUPS.find((o) => o.code === value)?.ar ?? value;
  for (const m of V2_MODULES) { const c = conditionOf(m.group, value); if (c) return c.ar; }
  return value;
}
/** المعاينةُ بعد الأجوبة — لحساب ما يفرضه الجوابُ على نفسه (`answerFollowUps`) بقاعدة الخادم. */
function mergedOf(stored: PhysioExamV2, vals: Record<string, V2Value>): PhysioExamV2 {
  const core = { ...stored.core }; const module = { ...stored.module }; const redFlags = { ...stored.redFlags } as Record<string, any>;
  for (const [k, v] of Object.entries(vals)) {
    if (emptyV(v)) continue;
    if (k.startsWith("core.") && emptyV(core[k.slice(5)])) core[k.slice(5)] = v;
    if (k.startsWith("module.") && emptyV(module[k.slice(7)])) module[k.slice(7)] = v;
    if (k.startsWith("redFlags.") && !redFlags[k.slice(9)]) redFlags[k.slice(9)] = v;
  }
  if (!emptyV(vals["core.group"]) && emptyV(stored.core?.group)) for (const k of Object.keys(module)) if (!(`module.${k}` in vals)) delete module[k];
  const raw = { ...stored, core, module, redFlags };
  const p = parseExamV2(raw);
  return p.ok ? p.value : raw;
}

export function OpusPanel({ examId, patientId, gate, summary, assessment }: {
  examId: number;
  /** §4.hd — المعاينةُ المخزَّنة: لعرض خاناتها في سؤالٍ عنها وحساب ما يلزم معها. */
  assessment?: unknown;
  patientId: number;
  gate: AgentGate | null;
  /** ما في صفّ المعاينة (الحالةُ والمرحلةُ وحدهما) — يُعرض لمن لا يقرأ تفصيلَ الوظيفة. */
  summary: OpusJobSummary | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const q = useQuery<OpusJobResponse>({ queryKey: opusJobKey(examId), queryFn: () => opusGet(`/api/physio/exams/${examId}/opus-job`), retry: false });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  //  §4.hd — قيمُ خانات المعاينة التي يُجاب عنها هنا (`core.x` · `module.x`) — لكلّ الأسئلة معاً (الخانةُ الواحدة قيمةٌ واحدة).
  const [fieldVals, setFieldVals] = useState<Record<string, V2Value>>({});
  const [fieldMissing, setFieldMissing] = useState<string[]>([]);
  const [alreadyAnswered, setAlreadyAnswered] = useState(false);
  const stored = isExamV2(assessment) ? (assessment as PhysioExamV2) : null;
  //  تبديلُ المجموعة في الجواب يمحو ما اختير لوحدتها وعلاماتها — **إلّا حالةً من المجموعة الجديدة** (المراجعة: «الحالة» ثمّ «المجموعة» كانت تمحو الحالة صامتة)؛
  //  و«الحالة» بلا مجموعةٍ تختار مجموعتَها معها.
  const setField = (k: string, v: V2Value) => {
    setFieldVals((p): Record<string, V2Value> => {
      if (k === "core.group" && p[k] !== v) {
        const keepCond: Record<string, V2Value> = typeof p["module.condition"] === "string" && conditionOf(v, p["module.condition"]) ? { "module.condition": p["module.condition"] } : {};
        return { ...Object.fromEntries(Object.entries(p).filter(([x]) => !x.startsWith("module.") && !x.startsWith("redFlags."))), ...keepCond, [k]: v };
      }
      if (k === "module.condition" && typeof v === "string" && emptyV(p["core.group"]) && emptyV(stored?.core?.group)) {
        const g = V2_MODULES.find((m) => conditionOf(m.group, v))?.group;
        if (g) return { ...p, "core.group": g, [k]: v };
      }
      return { ...p, [k]: v };
    });
    setFieldMissing((m) => m.filter((y) => y !== k && !(k === "module.condition" && y === "core.group")));
  };
  const [confirmCancel, setConfirmCancel] = useState(false);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: opusJobKey(examId) });
    qc.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/physio-plans`] });
  };
  const onErr = (e: any) => { toast({ title: "خطأ", description: e.message, variant: "destructive" }); refresh(); };
  const run = useMutation({ mutationFn: () => opusPost(`/api/physio/exams/${examId}/opus-plan`, {}),
    onSuccess: () => { refresh(); toast({ title: "بدأ Bionic AI", description: "يعمل في الخادم — تستطيع إغلاق الصفحة ويكمل، وتصلك رسالةٌ حين ينتهي." }); }, onError: onErr });
  const cancel = useMutation({ mutationFn: (id: number) => opusPost(`/api/physio/opus-jobs/${id}/cancel`, {}),
    onSuccess: () => { refresh(); toast({ title: "أُلغيت" }); }, onError: onErr });
  //  ما يفرضه الجوابُ على نفسه (المجموعةُ ⟵ حالتُها ⟵ مدخلاتُ بوّابتها …) — يُعرض تحت الأسئلة ويُرسَل مع أوّل سؤال خانة.
  /** **ما يفرضه كلُّ سؤالٍ على نفسه** (المراجعة: كان كلُّه تحت السؤال الأخير) — بترتيب الأسئلة، طبقةً بعد طبقة بقاعدة الخادم، والمملوءُ يبقى ظاهراً. */
  const followUpsByQuestion = (job: OpusJobView): Map<string, string[]> => {
    const out = new Map<string, string[]>();
    if (!stored) return out;
    const asked = new Set(job.questions.flatMap((x) => (isTyped(x) ? x.examFields! : [])));
    const seen = new Set<string>(asked);
    const base: string[] = [];
    for (const x of job.questions.filter(isTyped)) {
      base.push(...x.examFields!);
      const mine: string[] = [];
      for (let i = 0; i < 6; i++) {
        const use = Object.fromEntries(Object.entries(fieldVals).filter(([k]) => base.includes(k) || seen.has(k) && !asked.has(k)));
        const keys = Object.keys(use).filter((k) => !emptyV(use[k]));
        const next = answerFollowUps(stored, mergedOf(stored, use), keys).filter((k) => !seen.has(k));
        if (!next.length) break;
        next.forEach((k) => seen.add(k));
        mine.push(...next);
      }
      out.set(x.id, mine);
    }
    return out;
  };
  const followUpsOf = (job: OpusJobView): string[] => Array.from(followUpsByQuestion(job).values()).flat();
  const groupNow = (fieldVals["core.group"] as string | undefined) || (stored?.core?.group as string | undefined) || null;
  const byQuestion = q.data?.job?.status === "needs_answers" ? followUpsByQuestion(q.data.job) : new Map<string, string[]>();
  const answer = useMutation({ mutationFn: (job: OpusJobView) => {
      const byQ = followUpsByQuestion(job);
      return opusPost(`/api/physio/opus-jobs/${job.id}/answers`, { answers: job.questions.map((x) => {
        const text = (answers[x.id] ?? "").trim();
        if (!isTyped(x)) return { id: x.id, answer: text };
        const keys = [...x.examFields!, ...(byQ.get(x.id) ?? [])];
        const fields = Object.fromEntries(keys.filter((k) => !emptyV(fieldVals[k])).map((k) => [k, fieldVals[k]]));
        return { id: x.id, ...(text ? { answer: text } : {}), fields };
      }) });
    },
    onSuccess: (r: any) => {
      const n = r?.job?.qa?.[r.job.qa.length - 1]?.examVersion;
      setAnswers({}); setFieldVals({}); setFieldMissing([]); setAlreadyAnswered(false); refresh();
      toast({ title: "أُرسلت الأجوبة — يكمل Bionic AI", description: n ? `وحُفظت في المعاينة — النسخة ${ar(n)}` : undefined });
    },
    onError: (e: any) => {
      if ((e?.code === "answer_incomplete_fields" || e?.code === "exam_field_not_requested") && Array.isArray(e?.body?.missing)) setFieldMissing(e.body.missing);
      //  المعاينةُ تغيّرت بعد السؤال — أُعيد التشغيل؛ الأجوبةُ المكتوبة هنا لا تنطبق على الأسئلة الجديدة.
      if (e?.code === "exam_changed") { setAnswers({}); setFieldVals({}); setFieldMissing([]); }
      if (e?.code === "exam_field_already_answered") setAlreadyAnswered(true);
      onErr(e);
    } });

  //  مَن لا يقرأ تفصيلَ الوظيفة (٤٠٣) يرى الحالَ من صفّ المعاينة وحده — ولا شيءَ بلا وظيفة.
  if (q.isError) {
    if (!summary) return null;
    return (
      <Shell examId={examId}>
        <p className="m-0 text-xs text-slate-700" data-testid={`opus-status-${examId}`}>{summary.status === "succeeded"
          ? (summary.planStatus === "approved" ? "اعتُمدت خطّةُ Bionic AI." : summary.planStatus === "pending" || summary.planStatus === undefined ? OPUS_AWAITING_LABEL : "حُذفت الخطّةُ التي كتبها Bionic AI.")
          : JOB_STATUS_LABELS[summary.status]}</p>
      </Shell>
    );
  }
  if (q.isLoading || !q.data) return null;
  const d = q.data;
  const job = d.job;
  const gateClosed = gate !== null && !gate.allowed;
  //  حالٌ يُعرض فيه زرُّ «اكتب» أو «أعد» — وفيه وحده يُقال إنّ الوكيل غيرُ مفعّل أو البوّابةُ مغلقة.
  const wantsRun = !job || job.status === "failed" || job.status === "cancelled" || (job.status === "succeeded" && d.planStatus === null);
  const busy = run.isPending || cancel.isPending || answer.isPending;
  //  ما يردّه الخادمُ ٤٠٩ لا يُعرض زرّاً — يُقال سببُه مكانه (معاينةٌ أحدث، خطّةٌ قائمة، خطّةُ Opus تنتظر…).
  const blocked = d.runBlocked ?? null;
  const runButton = (label: string) => d.canRun && d.enabled && !gateClosed && !blocked ? (
    <Button size="sm" className="bg-violet-700 hover:bg-violet-800 gap-1" disabled={busy} onClick={() => run.mutate()} data-testid={`button-opus-run-${examId}`}>
      <Sparkles className="w-4 h-4" /> {label}
    </Button>
  ) : null;
  //  لا وظيفةَ ولا ما يُفعل ⟵ لا لوح (مَن لا يشغّل لا يحتاج أن يعرف) — ومعاينةٌ قديمة بعدها أحدث بلا وظيفة: لا لوحَ عليها أصلاً.
  if (!job && (blocked?.code === "not_newest" || blocked?.code === "exam_cancelled" || blocked?.code === "not_v2")) return null;
  if (!job && !d.canRun && !blocked) return null;

  return (
    <Shell examId={examId}>
      {!d.enabled && d.canRun && wantsRun && <p className="m-0 text-xs text-slate-600" data-testid={`opus-disabled-${examId}`}>وكيلُ Bionic AI غيرُ مفعّل على هذا الخادم بعد — تُكتب الخطّةُ يدوياً.</p>}
      {wantsRun && d.enabled && (gateClosed || blocked) && (
        <p className="m-0 text-xs text-slate-600" data-testid={`opus-gate-${examId}`}>لا يعمل Bionic AI الآن: {blocked?.reason ?? gate!.reason}</p>
      )}
      {d.approvalNote && (
        <p className="m-0 text-xs text-violet-950 bg-white/70 rounded px-2 py-1" data-testid={`opus-approval-note-${examId}`}>
          قرأ العلامةَ الحمراء وملاحظةَ الاعتماد: «{d.approvalNote}» — قيدٌ على الخطّة.
        </p>
      )}

      {!job && <div className="flex flex-wrap gap-2">{runButton(RUN_LABEL)}</div>}

      {job && (job.status === "queued" || job.status === "running" || job.status === "needs_answers") && (
        <>
          <p className="m-0 text-xs font-semibold text-violet-900" data-testid={`opus-status-${examId}`}>{JOB_STATUS_LABELS[job.status]}</p>
          {reviseLine(job) && <p className="m-0 text-xs text-violet-950" data-testid={`opus-revise-${examId}`}>{reviseLine(job)}</p>}
          {job.kind === "revise" && job.reviseNote && <p className="m-0 text-xs text-violet-950 bg-white/70 rounded px-2 py-1" dir="auto">ملاحظةُ المعتمِد: «{job.reviseNote}»</p>}
          <StageList job={job} />
          {job.failures > 0 && job.status !== "needs_answers" && (
            <p className="m-0 text-[11px] text-amber-800" data-testid={`opus-retry-${examId}`}>تعذّر الاتّصال بخدمة Bionic AI — إعادةُ المحاولة {ar(job.failures)} من {ar(job.maxFailures)}.</p>
          )}
          {job.status !== "needs_answers" && <p className="m-0 text-[11px] text-slate-600">قد يستغرق وقتاً طويلاً — تستطيع إغلاق الصفحة ويكمل في الخادم.</p>}
        </>
      )}

      {job?.status === "needs_answers" && (
        <div className="rounded-md bg-violet-100/70 p-2 flex flex-col gap-2 min-w-0" data-testid={`opus-questions-${examId}`}>
          {job.questions.map((x, i) => (
            <div key={x.id} className="flex flex-col gap-1 min-w-0" data-testid={`opus-question-${x.id}`}>
              <p className="m-0 text-sm"><b>سؤال {ar(i + 1)}:</b> {x.textAr}</p>
              {isTyped(x) ? (
                <TypedQuestion q={x} vals={fieldVals} setVal={setField} follow={byQuestion.get(x.id) ?? []}
                  group={groupNow} missing={fieldMissing} canWrite={Boolean(d.canAnswerExamFields)}
                  note={answers[x.id] ?? ""} setNote={(t) => setAnswers((a) => ({ ...a, [x.id]: t }))} />
              ) : x.affects === "exam_field" ? (
                <p className="m-0 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1" data-testid={`opus-question-examfield-${x.id}`}>
                  هذا عن خانةٍ في المعاينة — عدّل المعاينة من زرّ «تعديل» أعلاه، فيُعاد تشغيلُ Bionic AI عليها.
                </p>
              ) : d.canAnswer ? (
                <Textarea rows={2} value={answers[x.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [x.id]: e.target.value }))}
                  placeholder="الجواب" data-testid={`input-opus-answer-${x.id}`} />
              ) : null}
            </div>
          ))}
          {(() => {
            const follow = followUpsOf(job);
            const typed = job.questions.filter(isTyped);
            const legacy = job.questions.some((x) => x.affects === "exam_field" && !isTyped(x));
            if (!d.canAnswer || legacy) return null;
            //  المراجعة: جولةٌ فيها خانةُ معاينة لا يرسلها إلّا كاتبُها أو أخصائيّو فرعها — يُقال ذلك صريحاً بدل زرٍّ يختفي.
            if (typed.length > 0 && !d.canAnswerExamFields) {
              return <p className="m-0 text-xs text-slate-700 bg-white/70 border border-violet-200 rounded px-2 py-1" data-testid={`opus-round-needs-examiner-${examId}`}>
                في هذه الجولة سؤالٌ عن خانةٍ في المعاينة — تُرسَل الجولةُ كلُّها معاً، ويرسلها كاتبُ المعاينة أو أخصائيّو فرعها.</p>;
            }
            const fieldOk = (k: string) => !emptyV(fieldVals[k]) || (k === "module.condition" && groupNow !== null && !(moduleOf(groupNow)?.conditions?.length));
            const needed = [...typed.flatMap((x) => x.examFields!), ...follow].filter((k, i, all) => all.indexOf(k) === i && !fieldOk(k));
            const textLeft = job.questions.filter((x) => !isTyped(x) && !(answers[x.id] ?? "").trim()).length;
            const ready = needed.length === 0 && textLeft === 0;
            const flagsLeft = needed.filter((k) => k.startsWith("redFlags.")).length;
            const namesLeft = needed.filter((k) => !k.startsWith("redFlags.")).map((k) => examV2MissingLabel(k, groupNow));
            return (
              <>
                {alreadyAnswered && (
                  <p className="m-0 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1" data-testid={`opus-already-${examId}`}>
                    في المعاينة قيمةٌ مسجَّلة لهذه الخانة — غيّرها من زرّ «تعديل» أعلاه.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2"><Button size="sm" className="bg-violet-700 hover:bg-violet-800" disabled={busy || !ready}
                  onClick={() => answer.mutate(job)} data-testid={`button-opus-answer-${examId}`}>{typed.length ? "أرسل الجواب واحفظه في المعاينة" : "أرسل الجواب"}</Button>
                  {!ready && (
                    <span className="text-[11px] text-slate-700 min-w-0" data-testid={`opus-answer-left-${examId}`}>
                      بقي: {[...namesLeft.slice(0, 4), ...(namesLeft.length > 4 ? ["…"] : []), ...(flagsLeft ? [`${ar(flagsLeft)} من العلامات الحمراء`] : []),
                        ...(textLeft ? [`${ar(textLeft)} ${textLeft === 1 ? "جوابٌ مكتوب" : "أجوبةٌ مكتوبة"}`] : [])].join("، ")}
                    </span>
                  )}
                </div>
              </>
            );
          })()}
          <p className="m-0 text-[11px] text-slate-600">{job.questions.some(isTyped) ? "يجيب عن خانة المعاينة كاتبُها أو أخصائيّو فرعها" : "يستطيع الطبيب أو الأخصائيّ أو المعتمِد الإجابة"} — الجولة {ar(job.questionRounds + 1)} من {ar(MAX_QUESTION_ROUNDS)}.</p>
        </div>
      )}

      {job && d.canCancel && isActiveJobStatus(job.status) && (
        <div>
          {!confirmCancel ? (
            <Button size="sm" variant="outline" disabled={busy || job.cancelRequested} onClick={() => setConfirmCancel(true)} data-testid={`button-opus-cancel-${examId}`}>
              {job.cancelRequested ? "يُلغى…" : "إلغاء"}
            </Button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-red-800">يتوقّف Bionic AI ويضيع ما كتبه حتى الآن — متأكّد؟</span>
              <Button size="sm" variant="destructive" disabled={busy} onClick={() => { setConfirmCancel(false); cancel.mutate(job.id); }}
                data-testid={`button-opus-cancel-confirm-${examId}`}>نعم، أوقفه</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>لا</Button>
            </div>
          )}
        </div>
      )}

      {job?.status === "needs_exam_revision" && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900" data-testid={`opus-finding-${examId}`}>
          <b>وجد Bionic AI ما لم تسجّله المعاينة{job.newFinding?.textAr ? ":" : ""}</b> {job.newFinding?.textAr ?? (job.kind === "revise" ? "" : errorText(job))}
          {/* وظيفةُ «تعديل» لا تُعاد بعد الحفظ: الطلبُ للمعتمِد، يعيده هو بعد تعديل المعاينة (وغيرُه لا يرى ما وجده — §4.hb ٣.٦). */}
          {job.kind === "revise" ? " — عدّل المعاينة من زرّ «تعديل» أعلاه، ثمّ يعيد المعتمِدُ طلبَه إلى Bionic AI." : " — عدّل المعاينة من زرّ «تعديل» أعلاه، فيُعاد تشغيلُه بعد الحفظ."}
        </div>
      )}

      {job?.status === "failed" && (
        <div className="flex flex-col gap-2">
          <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-900 flex gap-1.5" data-testid={`opus-failed-${examId}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <div className="min-w-0 space-y-1">
              {job.decline ? (
                <>
                  <div><b>يرى Bionic AI ألّا تُكتب خطّةٌ الآن:</b> {job.decline.reasonAr}</div>
                  {job.decline.recommendedActionAr && <div><b>المقترح:</b> {job.decline.recommendedActionAr}</div>}
                </>
              ) : <div><b>{job.kind === "revise" ? "لم يكتمل التعديل — بقيت الخطّة كما هي:" : "لم يكتب Bionic AI الخطّة:"}</b> {errorText(job)}</div>}
              {job.unresolvedCritical.length > 0 && (
                <ul className="m-0 ps-4 list-disc">{job.unresolvedCritical.map((i) => <li key={i.id}>{i.problemAr}</li>)}</ul>
              )}
              {(job.blockingGates ?? []).length > 0 && (
                <div data-testid={`opus-blocking-${examId}`}>
                  <b>ما أوقفها:</b>
                  <ul className="m-0 ps-4 list-disc">{job.blockingGates!.map((g) => <li key={g.code}>{g.reasonAr}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
          {job.kind !== "revise" && <div className="flex flex-wrap gap-2">{runButton(RERUN_LABEL)}</div>}
        </div>
      )}

      {job?.status === "cancelled" && (
        <div className="flex flex-col gap-2">
          <p className="m-0 text-xs text-slate-700" data-testid={`opus-cancelled-${examId}`}>{job.kind === "revise" ? "أُلغي طلبُ التعديل — بقيت الخطّة كما هي" : "أُلغيت"}: {errorText(job)}</p>
          {job.kind !== "revise" && <div className="flex flex-wrap gap-2">{runButton(RERUN_LABEL)}</div>}
        </div>
      )}

      {job?.status === "succeeded" && (
        <div className="flex flex-col gap-2" data-testid={`opus-done-${examId}`}>
          <StageList job={job} />
          {d.planStatus === "approved" ? (
            <p className="m-0 text-xs font-semibold text-emerald-800">اعتُمدت خطّةُ Bionic AI.</p>
          ) : d.planStatus === null ? (
            <p className="m-0 text-xs text-slate-700">حُذفت الخطّةُ التي كتبها Bionic AI.</p>
          ) : !d.canSeeProposal ? (
            <p className="m-0 text-xs font-semibold text-amber-900" data-testid={`opus-awaiting-${examId}`}>{OPUS_AWAITING_LABEL}</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {d.canSeeProposal && job.planId && d.planStatus !== null && (
              <Link href={`/physio/plans/${job.planId}`}>
                <Button size="sm" className="bg-violet-700 hover:bg-violet-800" data-testid={`button-opus-proposal-${examId}`}>
                  {d.planStatus === "approved" ? "افتح الخطّة" : "اعرض الخطّة المقترحة"}
                </Button>
              </Link>
            )}
            {d.planStatus === "approved" && !d.canSeeProposal && job.planId && (
              <Link href={`/physio/plans/${job.planId}`}><Button size="sm" variant="outline">افتح الخطّة</Button></Link>
            )}
            {d.planStatus === null && runButton(RERUN_LABEL)}
          </div>
        </div>
      )}

      {job && job.qa.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-slate-700">الأسئلةُ السابقة وأجوبتها ({ar(job.qa.length)})</summary>
          <div className="mt-1 space-y-1.5">
            {job.qa.map((r) => (
              <div key={r.round} className="rounded bg-white/70 p-1.5">
                <div className="text-[11px] text-slate-600">الجولة {ar(r.round)} · {r.byName ?? "—"}{r.at ? ` · ${formatDateIraq(r.at)} ${formatTimeIraq(r.at)}` : ""}</div>
                {r.answers.map((a) => (
                  <div key={a.id}><b>{a.questionAr}</b>{a.answer ? ` — ${a.answer}` : ""}
                    {a.fields && Object.keys(a.fields).length > 0 && (
                      <span className="block text-[11px] text-violet-900" data-testid={`opus-qa-fields-${a.id}`}>
                        {Object.entries(a.fields).map(([k, v]) => fieldText(k, v, (a.fields!["core.group"] as string) ?? (stored?.core?.group as string) ?? null)).join(" · ")}
                        {a.examVersion ? ` — حُفظ في المعاينة، النسخة ${ar(a.examVersion)}` : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}
    </Shell>
  );
}

function Shell({ examId, children }: { examId: number; children: React.ReactNode }) {
  return (
    <div dir="rtl" className="mb-2 rounded-lg border border-violet-300 bg-violet-50/60 p-2 flex flex-col gap-2 min-w-0" style={{ boxShadow: "inset 0 3px 0 rgb(109 40 217)" }}
      data-testid={`exam-opus-${examId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold text-violet-900 flex items-center gap-1"><Sparkles className="w-4 h-4" /> Bionic AI يفحص الحالة</span>
      </div>
      {children}
    </div>
  );
}

function StageList({ job }: { job: OpusJobView }) {
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-1" data-testid={`opus-stages-${job.examId}`}>
      {stageStates(job).map((s) => (
        <li key={s.stage} className={cn("flex items-center gap-1.5 text-xs", s.state === "todo" ? "text-slate-500" : "text-slate-800")} data-state={s.state}>
          {s.state === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            : s.state === "run" ? <Loader2 className="w-3.5 h-3.5 text-violet-700 animate-spin motion-reduce:animate-none shrink-0" />
              : <Circle className="w-3.5 h-3.5 shrink-0" />}
          <span className="min-w-0">{s.label}{s.optional && s.state === "todo" ? " (لخطّةٍ خارج المكتبة)" : ""}
            {s.note && s.state !== "todo" && <span className="block text-[11px] text-slate-600" data-testid={`opus-stage-note-${s.stage}`}>{s.note}</span>}</span>
        </li>
      ))}
      {job.status === "needs_answers" && (
        <li className="flex items-center gap-1.5 text-xs text-violet-900 font-semibold" data-state="run" data-testid={`opus-stage-waiting-${job.examId}`}>
          <Loader2 className="w-3.5 h-3.5 text-violet-700 animate-spin motion-reduce:animate-none shrink-0" /> ينتظر جوابك قبل أن يكمل…
        </li>
      )}
    </ul>
  );
}

/** «لأنّك اخترت …» — سببُ ما يلزم مع الجواب. */
function whyOf(vals: Record<string, V2Value>, group: string | null): string {
  const cond = typeof vals["module.condition"] === "string" ? conditionOf(group, vals["module.condition"])?.ar : null;
  const g = typeof vals["core.group"] === "string" ? moduleOf(vals["core.group"])?.ar : null;
  const picked = cond ?? g;
  return picked ? ` (لأنّك اخترت «${picked}»)` : "";
}
/** قيمةُ خانةٍ مكتوبةً بالعربية — لسجلّ الأسئلة. */
function fieldText(k: string, v: V2Value, group: string | null): string {
  const f = examFieldOf(k, k === "module.condition" ? group : group);
  const label = examV2MissingLabel(k, group);
  if (!f) return `${label}: ${Array.isArray(v) ? v.join("، ") : String(v)}`;
  const opts = f.options ?? [];
  const t = Array.isArray(v) ? v.map((c) => opts.find((o) => o.code === c)?.ar ?? c).join("، ")
    : typeof v === "string" && opts.length ? (opts.find((o) => o.code === v)?.ar ?? (k === "module.condition" ? suggestionLabel(k, v) : v)) : String(v ?? "—");
  return `${label}: ${t}`;
}

/** خانةُ معاينةٍ في لوح الأسئلة — الخانةُ نفسُها التي في المعاينة (`FieldInput`). */
function AnswerField({ k, group, vals, setVal, missing }: {
  k: string; group: string | null; vals: Record<string, V2Value>; setVal: (k: string, v: V2Value) => void; missing: string[];
}) {
  let f = examFieldOf(k, group);
  //  «الحالة» قبل اختيار المجموعة: كلُّ الحالات — والمجموعةُ تُستنتج في الخادم من الجواب نفسِه إن سُئل عنها.
  if (!f && k === "module.condition") {
    f = { key: "condition", ar: "الحالةُ داخل المجموعة", en: "Condition", kind: "choice",
      options: V2_MODULES.flatMap((m) => m.conditions ?? []).map((c) => ({ code: c.code, en: c.en, ar: c.ar })) };
  }
  if (!f) return <p className="m-0 text-xs text-slate-500">{examV2MissingLabel(k, group)}</p>;
  const id = k.replace(".", "-");
  return (
    <FieldBox label={f.ar} required missing={missing.includes(k)} testId={`opus-field-${id}`}>
      {chipsFor(f) ? <Chips f={f} value={vals[k] ?? null} onChange={(v) => setVal(k, v)} testId={`opus-field-${id}-in`} />
        : <FieldInput f={f} value={vals[k] ?? null} onChange={(v) => setVal(k, v)} testId={`opus-field-${id}-in`} />}
    </FieldBox>
  );
}
/** المراجعة: في اللوح كما في المعاينة — الخيارُ الواحد أزرارٌ بضغطة (لا قائمةٌ منسدلة) ما لم تكثر الخيارات. */
const chipsFor = (f: V2Field) => (f.kind === "choice" || f.kind === "yesno") && (f.options?.length ?? 0) > 0 && (f.options?.length ?? 0) <= 15;
function Chips({ f, value, onChange, testId }: { f: V2Field; value: V2Value; onChange: (v: V2Value) => void; testId: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={f.ar} data-testid={testId}>
      {(f.options ?? []).map((o) => (
        <button key={o.code} type="button" aria-pressed={value === o.code} className={cn(segBtn(value === o.code), "text-xs leading-5 px-2 py-0.5 text-start")}
          onClick={() => onChange(value === o.code ? null : o.code)} data-testid={`${testId}-${o.code}`}>{o.ar}</button>
      ))}
    </div>
  );
}

/** **علاماتُ المجموعة التي أكّدها الجواب** (§4.hd، المراجعة): تُجاب في الجواب نفسِه — يُعلَّم ما وُجد، و«لا شيء ممّا يلي» للباقي، و«نعم» تُظهر إجراءَها
 *  وتوقف Bionic AI حتى يعتمدها المسؤول أو المشرف العام. */
function RedFlagFollowUps({ keys, vals, setVal, missing, qid }: { keys: string[]; vals: Record<string, V2Value>; setVal: (k: string, v: V2Value) => void; missing: string[]; qid: string }) {
  const list = keys.map((k) => V2_RED_FLAGS.find((f) => `redFlags.${f.key}` === k)).filter((x): x is (typeof V2_RED_FLAGS)[number] => Boolean(x));
  const left = list.filter((q) => vals[`redFlags.${q.key}`] !== "yes" && vals[`redFlags.${q.key}`] !== "no").length;
  return (
    <div className="rounded-md border border-red-200 bg-red-50/40 p-2 flex flex-col gap-1 min-w-0" data-testid={`opus-rf-followups-${qid}`}>
      <p className="m-0 text-xs font-semibold text-red-900">العلاماتُ الحمراء لهذه المجموعة — علّم ما وجدتَه، ثمّ «لا شيء ممّا فوق» للباقي:</p>
      {list.map((q) => {
        const k = `redFlags.${q.key}`; const a = vals[k];
        return (
          <div key={q.key}>
            <label className={cn("flex items-start gap-2 py-1 cursor-pointer min-w-0", missing.includes(k) && "bg-red-100 rounded")} data-testid={`opus-rf-${q.key}`} data-answer={typeof a === "string" ? a : ""}>
              <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-red-600" checked={a === "yes"} onChange={(e) => setVal(k, e.target.checked ? "yes" : null)}
                data-testid={`opus-rf-${q.key}-yes`} />
              <span className="text-xs text-slate-800 min-w-0 flex-1">{q.questionAr}</span>
              {a === "no" && <span className="shrink-0 text-[11px] font-semibold text-emerald-700">لا</span>}
            </label>
            {a === "yes" && (
              <div role="alert" className={cn("rounded border px-2 py-1 text-[11px]", q.urgency === "emergency" ? "border-red-700 bg-red-600 text-white" : "border-red-300 bg-red-50 text-red-800")}
                data-testid={`opus-rf-action-${q.key}`}>
                <b>{RED_FLAG_URGENCY_AR[q.urgency]}: </b>{q.actionAr} — ويتوقّف Bionic AI حتى يعتمدها المسؤول أو المشرف العام.
              </div>
            )}
          </div>
        );
      })}
      <button type="button" disabled={left === 0} onClick={() => list.forEach((q) => { const k = `redFlags.${q.key}`; if (vals[k] !== "yes") setVal(k, "no"); })}
        className={cn("self-start rounded-md border px-2.5 py-1 text-xs font-bold", left === 0 ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-emerald-600 bg-emerald-600 text-white")}
        data-testid={`opus-rf-none-${qid}`}>{left === 0 ? "أُجيبت" : "لا شيء ممّا فوق"}</button>
    </div>
  );
}

/** **سؤالٌ عن خانات المعاينة** (§4.hd): يُجاب هنا بقيمها فيُكتب في المعاينة نسخةً جديدة، واقتراحُ Bionic AI زرٌّ لا يُختار مسبقاً. */
function TypedQuestion({ q, vals, setVal, group, missing, canWrite, note, setNote, follow }: {
  q: Q; vals: Record<string, V2Value>; setVal: (k: string, v: V2Value) => void; group: string | null; missing: string[]; canWrite: boolean;
  note: string; setNote: (t: string) => void;
  /** ما يفرضه جوابُ هذا السؤال على نفسه — يُعرض هنا تحته لا في آخر اللوح (المراجعة). */
  follow: string[];
}) {
  if (!canWrite) {
    return (
      <p className="m-0 text-xs text-slate-700 bg-white/70 border border-violet-200 rounded px-2 py-1" data-testid={`opus-question-refused-${q.id}`}>
        يجيب عن خانة المعاينة كاتبُها أو أخصائيّو فرعها — والجوابُ يُحفظ في المعاينة.
      </p>
    );
  }
  //  «الحالة» لمجموعةٍ بلا حالات لا تُطلب (الهشاشة · الوذمة · «غير ذلك»).
  const keys = q.examFields!.filter((k) => !(k === "module.condition" && group !== null && !(moduleOf(group)?.conditions?.length)));
  return (
    <div className="sm:rounded-md sm:border sm:border-violet-200 bg-white p-1 sm:p-2 flex flex-col gap-1.5 min-w-0" data-testid={`opus-question-typed-${q.id}`}>
      <p className="m-0 text-[11px] text-violet-900">أجب هنا — يُحفظ الجواب في المعاينة باسمك.</p>
      {(q.suggestions ?? []).filter((s) => keys.includes(s.field)).map((s) => (
        <button key={`${s.field}-${s.value}`} type="button" aria-pressed={vals[s.field] === s.value}
          className={cn(segBtn(vals[s.field] === s.value), "self-start inline-flex items-center gap-1 border-violet-400 text-start")}
          onClick={() => setVal(s.field, s.value)} data-testid={`opus-suggest-${q.id}-${s.field.replace(".", "-")}`}>
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-violet-700" /> اقتراح Bionic AI: {suggestionLabel(s.field, s.value)}
        </button>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
        {keys.map((k) => <AnswerField key={k} k={k} group={group} vals={vals} setVal={setVal} missing={missing} />)}
      </div>
      {follow.some((k) => !k.startsWith("redFlags.")) && (
        <div className="rounded-md border border-teal-300 bg-teal-50/40 p-1.5 flex flex-col gap-1 min-w-0" data-testid={`opus-followups-${q.id}`}>
          <p className="m-0 text-xs font-semibold text-teal-900">يلزم مع هذا الجواب{whyOf(vals, group)} — تحتاجها موانعُه أو سلامةُ التمرين:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
            {follow.filter((k) => !k.startsWith("redFlags.")).map((k) => <AnswerField key={k} k={k} group={group} vals={vals} missing={missing} setVal={setVal} />)}
          </div>
        </div>
      )}
      {follow.some((k) => k.startsWith("redFlags.")) && (
        <RedFlagFollowUps keys={follow.filter((k) => k.startsWith("redFlags."))} vals={vals} setVal={setVal} missing={missing} qid={q.id} />
      )}
      <Textarea rows={1} className="min-h-[2.25rem] py-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder="ملاحظة (اختيارية)" data-testid={`input-opus-answer-${q.id}`} />
    </div>
  );
}
