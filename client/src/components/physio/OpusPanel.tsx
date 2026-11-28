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
import type { AgentGate } from "@shared/physio_exam_v2";
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

export function OpusPanel({ examId, patientId, gate, summary }: {
  examId: number;
  patientId: number;
  gate: AgentGate | null;
  /** ما في صفّ المعاينة (الحالةُ والمرحلةُ وحدهما) — يُعرض لمن لا يقرأ تفصيلَ الوظيفة. */
  summary: OpusJobSummary | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const q = useQuery<OpusJobResponse>({ queryKey: opusJobKey(examId), queryFn: () => opusGet(`/api/physio/exams/${examId}/opus-job`), retry: false });
  const [answers, setAnswers] = useState<Record<string, string>>({});
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
  const answer = useMutation({ mutationFn: (job: OpusJobView) => opusPost(`/api/physio/opus-jobs/${job.id}/answers`,
    { answers: job.questions.map((x) => ({ id: x.id, answer: (answers[x.id] ?? "").trim() })) }),
    onSuccess: () => { setAnswers({}); refresh(); toast({ title: "أُرسلت الأجوبة — يكمل Bionic AI" }); }, onError: onErr });

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
            <p className="m-0 text-[11px] text-amber-800" data-testid={`opus-retry-${examId}`}>تعذّر الاتّصال بخدمة Claude — إعادةُ المحاولة {ar(job.failures)} من {ar(job.maxFailures)}.</p>
          )}
          {job.status !== "needs_answers" && <p className="m-0 text-[11px] text-slate-600">قد يستغرق وقتاً طويلاً — تستطيع إغلاق الصفحة ويكمل في الخادم.</p>}
        </>
      )}

      {job?.status === "needs_answers" && (
        <div className="rounded-md bg-violet-100/70 p-2 flex flex-col gap-2 min-w-0" data-testid={`opus-questions-${examId}`}>
          {job.questions.map((x, i) => (
            <div key={x.id} className="flex flex-col gap-1 min-w-0">
              <p className="m-0 text-sm"><b>سؤال {ar(i + 1)}:</b> {x.textAr}</p>
              {x.affects === "exam_field" ? (
                <p className="m-0 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2 py-1" data-testid={`opus-question-examfield-${x.id}`}>
                  هذا عن خانةٍ في المعاينة — عدّل المعاينة من زرّ «تعديل» أعلاه، فيُعاد تشغيلُ Bionic AI عليها.
                </p>
              ) : d.canAnswer ? (
                <Textarea rows={2} value={answers[x.id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [x.id]: e.target.value }))}
                  placeholder="الجواب" data-testid={`input-opus-answer-${x.id}`} />
              ) : null}
            </div>
          ))}
          {d.canAnswer && !job.questions.some((x) => x.affects === "exam_field") && (
            <div><Button size="sm" className="bg-violet-700 hover:bg-violet-800" disabled={busy || job.questions.some((x) => !(answers[x.id] ?? "").trim())}
              onClick={() => answer.mutate(job)} data-testid={`button-opus-answer-${examId}`}>أرسل الجواب</Button></div>
          )}
          <p className="m-0 text-[11px] text-slate-600">يستطيع الطبيب أو الأخصائيّ أو المعتمِد الإجابة — الجولة {ar(job.questionRounds + 1)} من {ar(MAX_QUESTION_ROUNDS)}.</p>
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
                {r.answers.map((a) => <div key={a.id}><b>{a.questionAr}</b> — {a.answer}</div>)}
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
