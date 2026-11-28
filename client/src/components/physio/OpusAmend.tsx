// **التعديلُ مع Opus** (ترحيل ٢٠٠، §4.hb ١٠.١ و١٠.٤ — قرارا المالك ٥ و٦) — للمعتمِد وحده (المسؤول والمشرف العام بصلاحياتٍ واحدة).
//
//  • `ReturnToOpusDialog` — «أعِده إلى Opus» على خطّةٍ تنتظر الاعتماد: ملاحظةٌ إلزامية يقرؤها Opus أمراً ملزماً، فيعيد الكتابة ويراجعها المراجع
//    وتمرّ بالبوّابات ثمّ تعود للاعتماد. والفاحصُ يرى الحالَ وحدها.
//  • `RequestOpusAmendDialog` — «اطلب من Opus تعديلاً» على خطّةٍ معتمَدة: يُعرض الفرقُ قبل الحفظ، وحتى الحفظ تبقى النسخةُ النافذة كما هي.
//  • `OpusRevisionStrip` — حالُ الطلب الجاري بمراحله و«إلغاء»، والاقتراحُ المنتظر (`OpusAmendReview`: الفرقُ بالأقسام وسجلُّ البوّابات
//    والمراجعُ والإقرارُ بكلّ ملاحظةٍ كبيرة، و«احفظ النسخة ن+١» أو «تجاهل»)، وآخرُ الطلبات ومآلُها.
// **بلا `refetchInterval`**: التحديثُ بإشارة الخادم بعد كلّ مرحلة (§4.cy).
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Loader2, CheckCircle2, Circle, Undo2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { JOB_ERROR_TEXTS, JOB_STATUS_LABELS, PROPOSAL_STATUS_LABELS, isActiveJobStatus, type Issue, type JobStatus, type ProposalStatus } from "@shared/physio_agent";
import { ar, opusGet, opusPost, opusProposalKey, opusRevisionKey, OPUS_PLANS_KEY, stageStates, versionsKey, type AmendProposal, type OpusRevisionResponse,
  type RevisionJobView } from "@/lib/opus_agent";
import { GateLogList, IssueList } from "@/components/physio/OpusProposalView";
import { PlanDiffView, when } from "@/components/physio/OpusVersions";

const NOTE_MIN = 3;

/** كلُّ ما يتغيّر بتعديل خطّةٍ واحدة — الخطّةُ ونسخُها وحالُ التعديل وطابورُ المعتمِد. */
export function invalidateOpusPlan(qc: ReturnType<typeof useQueryClient>, planId: number, patientId?: number | null) {
  qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}`] });
  qc.invalidateQueries({ queryKey: opusProposalKey(planId) });
  qc.invalidateQueries({ queryKey: opusRevisionKey(planId) });
  qc.invalidateQueries({ queryKey: versionsKey(planId) });
  qc.invalidateQueries({ queryKey: [`/api/physio/plans/${planId}/sessions`] });
  qc.invalidateQueries({ queryKey: [OPUS_PLANS_KEY] });
  qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews"] });
  if (patientId) {
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/physio-plans`] });
    qc.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
  }
}

/** ملاحظةٌ إلزامية في نافذة — «أعِده إلى Opus» و«اطلب من Opus تعديلاً» بالقالب نفسِه. */
function NoteDialog({ open, title, label, helper, placeholder, submit, pending, onClose, onSubmit, testId, warning }: {
  open: boolean; title: string; label: string; helper: string; placeholder: string; submit: string; pending: boolean;
  onClose: () => void; onSubmit: (note: string) => void; testId: string; warning?: string | null;
}) {
  const [note, setNote] = useState("");
  const ok = note.trim().length >= NOTE_MIN;
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setNote(""); onClose(); } }}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-violet-700" /> {title}</DialogTitle></DialogHeader>
        <label className="grid gap-1 text-sm font-medium">{label}
          <Textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder={placeholder} className="bg-white font-normal" data-testid={`input-${testId}`} />
        </label>
        <p className="m-0 text-xs text-muted-foreground">{helper}</p>
        {warning && <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950" data-testid={`${testId}-warning`}>{warning}</div>}
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => { setNote(""); onClose(); }}>رجوع</Button>
          <Button className="bg-violet-700 hover:bg-violet-800 gap-1" disabled={!ok || pending} onClick={() => onSubmit(note.trim())} data-testid={`button-${testId}`}>
            <Sparkles className="w-4 h-4" /> {submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ReturnToOpusDialog({ planId, patientId, open, onClose }: { planId: number; patientId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (note: string) => opusPost(`/api/physio/plans/${planId}/opus-return`, { note }),
    onSuccess: () => { invalidateOpusPlan(qc, planId, patientId); onClose(); toast({ title: "أُعيدت إلى Bionic AI", description: "يعيد كتابتها بملاحظتك في الخادم، وتصلك رسالةٌ حين تعود للاعتماد." }); },
    onError: (e: any) => { invalidateOpusPlan(qc, planId, patientId); toast({ title: "لم تُرسَل", description: e.message, variant: "destructive" }); },
  });
  return (
    <NoteDialog open={open} onClose={onClose} pending={m.isPending} onSubmit={(n) => m.mutate(n)} testId="opus-return"
      title="أعِده إلى Bionic AI" label="ملاحظتك لـ Bionic AI (إلزامية — يقرؤها أمراً ملزماً)" submit="أرسل إلى Bionic AI"
      placeholder="مثال: اجعل المشي ٣٠ دقيقة من الجلسة ١٠، وخفّف التحفيز الكهربائي"
      helper="يعيد Bionic AI الكتابة، ويراجعها المراجع، وتمرّ ببوّابات الموانع، ثمّ تعود إليك للاعتماد. يرى الفاحص الحالَ وحدها." />
  );
}

export function RequestOpusAmendDialog({ planId, patientId, baseVersion, open, onClose, hasPendingProposal }: {
  planId: number; patientId: number; baseVersion: number; open: boolean; onClose: () => void; hasPendingProposal?: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (request: string) => opusPost(`/api/physio/plans/${planId}/opus-amend`, { request, baseVersion }),
    onSuccess: () => { invalidateOpusPlan(qc, planId, patientId); onClose(); toast({ title: "أُرسل الطلب إلى Bionic AI", description: `يعمل في الخادم — وحتى تحفظ ما يقترحه تبقى النسخة ${ar(baseVersion)} سارية.` }); },
    onError: (e: any) => { invalidateOpusPlan(qc, planId, patientId); toast({ title: "لم يُرسَل", description: e.message, variant: "destructive" }); },
  });
  return (
    <NoteDialog open={open} onClose={onClose} pending={m.isPending} onSubmit={(n) => m.mutate(n)} testId="opus-amend"
      title="اطلب من Bionic AI تعديلاً" label="ما التعديل الذي تريده من Bionic AI؟ (إلزامي)" submit="أرسل الطلب إلى Bionic AI"
      placeholder="مثال: المريض بدأ يشكو من الركبة اليسرى، أضف ما يناسب دون أن يتعارض مع الظهر"
      warning={hasPendingProposal ? "لـ Bionic AI اقتراحٌ ينتظر قرارك على هذه الخطّة — إن أتمّ طلبَك الجديد حلّ اقتراحُه محلَّ المنتظر ولم يعد يُحفظ. احفظ المنتظرَ أو تجاهله أوّلاً إن أردته." : null}
      helper={`يعيد Bionic AI الكتابة، ويراجعها المراجع، وتمرّ ببوّابات الموانع، ثمّ يُعرض عليك الفرق قبل أن تحفظ. وحتى تحفظ تبقى النسخة ${ar(baseVersion)} سارية.`} />
  );
}

/** مراحلُ الوظيفة الجارية — بقاعدة لوح المعاينة نفسِها. */
export function RevisionStages({ job }: { job: { status: JobStatus; stage: string | null; stages: { stage: string; at: string; noteAr?: string | null }[] } }) {
  return (
    <ul className="m-0 p-0 list-none flex flex-col gap-1" data-testid="opus-revision-stages">
      {stageStates(job).map((s) => (
        <li key={s.stage} className={cn("flex items-center gap-1.5 text-xs", s.state === "todo" ? "text-slate-500" : "text-slate-800")} data-state={s.state}>
          {s.state === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            : s.state === "run" ? <Loader2 className="w-3.5 h-3.5 text-violet-700 animate-spin motion-reduce:animate-none shrink-0" />
              : <Circle className="w-3.5 h-3.5 shrink-0" />}
          <span className="min-w-0">{s.label}{s.note && s.state !== "todo" ? <span className="block text-[11px] text-slate-600">{s.note}</span> : null}</span>
        </li>
      ))}
    </ul>
  );
}

/** «إلغاء» الوظيفة الجارية — بعد سؤال. */
export function CancelRevisionButton({ jobId, onDone, label = "إلغاء الطلب" }: { jobId: number; onDone: () => void; label?: string }) {
  const { toast } = useToast();
  const [ask, setAsk] = useState(false);
  const m = useMutation({ mutationFn: () => opusPost(`/api/physio/opus-jobs/${jobId}/cancel`, {}),
    onSuccess: () => { setAsk(false); onDone(); toast({ title: "أُلغي" }); },
    onError: (e: any) => { onDone(); toast({ title: "خطأ", description: e.message, variant: "destructive" }); } });
  if (!ask) return <Button size="sm" variant="outline" onClick={() => setAsk(true)} data-testid="button-opus-revision-cancel">{label}</Button>;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-red-800">يتوقّف Bionic AI ويبقى ما قبل الطلب كما هو — متأكّد؟</span>
      <Button size="sm" variant="destructive" disabled={m.isPending} onClick={() => m.mutate()} data-testid="button-opus-revision-cancel-confirm">نعم، أوقفه</Button>
      <Button size="sm" variant="ghost" onClick={() => setAsk(false)}>لا</Button>
    </div>
  );
}

/** مآلُ طلبٍ انتهى — بالعربية. */
export function revisionOutcome(j: Pick<RevisionJobView, "status" | "errorCode" | "error" | "proposalStatus" | "savedVersion" | "lostByExamChange">): { t: string; tone: "ok" | "bad" | "muted" | "run" } {
  if (isActiveJobStatus(j.status)) return { t: "يعمل Bionic AI عليها الآن", tone: "run" };
  if (j.status === "succeeded") {
    if (j.proposalStatus === "accepted") return { t: `حُفظت النسخة ${ar(j.savedVersion)}`, tone: "ok" };
    if (j.proposalStatus) return { t: PROPOSAL_STATUS_LABELS[j.proposalStatus as ProposalStatus] ?? j.proposalStatus, tone: j.proposalStatus === "pending" ? "ok" : "muted" };
    return { t: "أعاد Bionic AI الكتابة", tone: "ok" };
  }
  if (j.lostByExamChange) return { t: "أُلغي لتغيّر المعاينة — أعد طلبك", tone: "bad" };
  const why = j.error || (j.errorCode ? JOB_ERROR_TEXTS[j.errorCode] : "") || JOB_STATUS_LABELS[j.status];
  return { t: j.status === "cancelled" ? `أُلغي: ${why}` : `لم يكتمل: ${why}`, tone: j.status === "cancelled" ? "muted" : "bad" };
}

export const TONE: Record<"ok" | "bad" | "muted" | "run", string> = { ok: "bg-emerald-100 text-emerald-800", bad: "bg-red-100 text-red-800", muted: "bg-slate-100 text-slate-700", run: "bg-violet-100 text-violet-800" };

/**
 * **حالُ التعديل مع Opus على خطّةٍ معتمَدة** — للمعتمِد: الطلبُ الجاري، والاقتراحُ المنتظر، وآخرُ الطلبات.
 * ولغيره: سطرٌ واحد «يعدّل المعتمِدُ الخطّةَ مع Opus — النسخةُ الحالية نافذة» (بلا نصّ الطلب).
 */
export function OpusRevisionStrip({ planId, patientId, approver, revising, onEdit }: {
  planId: number; patientId: number; approver: boolean; revising: boolean; onEdit?: () => void;
}) {
  const qc = useQueryClient();
  const q = useQuery<OpusRevisionResponse>({ queryKey: opusRevisionKey(planId), queryFn: () => opusGet(`/api/physio/plans/${planId}/opus-revision`),
    enabled: approver, retry: false });
  if (!approver) {
    if (!revising) return null;
    return (
      <div className="rounded-md border border-violet-300 bg-violet-50 p-2 text-sm text-violet-950 print:hidden" data-testid="opus-revision-readonly">
        يعدّل المعتمِدُ الخطّةَ مع Bionic AI — النسخةُ الحالية سارية وتُنفَّذ كما هي.
      </div>
    );
  }
  const d = q.data;
  if (!d) return null;
  const active = d.activeJob;
  const ended = d.latest.filter((j) => !isActiveJobStatus(j.status) && j.scope === "amend" && j.proposalStatus !== "pending").slice(0, 4);
  if (!active && !d.proposal && !ended.length) return null;
  const refresh = () => invalidateOpusPlan(qc, planId, patientId);
  return (
    <div className="space-y-2 print:hidden" dir="rtl">
      {active && (
        <div className="rounded-lg border border-violet-300 bg-violet-50/70 p-2 space-y-2" style={{ boxShadow: "inset 0 3px 0 rgb(109 40 217)" }} data-testid="opus-revision-active">
          <div className="text-sm font-semibold text-violet-950 flex items-center gap-1.5"><Sparkles className="w-4 h-4" />
            يعدّل Bionic AI الخطّةَ بطلب {active.requestedByName ?? "المعتمِد"} — النسخة {ar(active.baseVersion)} سارية حتى تحفظ ما يقترحه
          </div>
          {active.note && <div className="text-xs text-violet-950 bg-white/70 rounded px-2 py-1" dir="auto">الطلب: «{active.note}»</div>}
          <RevisionStages job={active} />
          <p className="m-0 text-[11px] text-slate-600">قد يستغرق وقتاً طويلاً — تستطيع إغلاق الصفحة ويكمل في الخادم، وتصلك رسالةٌ حين ينتهي.</p>
          <CancelRevisionButton jobId={active.id} onDone={refresh} />
        </div>
      )}
      {/* المفتاحُ هويّةُ الاقتراح: اقتراحٌ جديد يبدأ بلا إقرارٍ ولا ملاحظة («r1» قد يتكرّر بنصٍّ آخر). */}
      {d.proposal && <OpusAmendReview key={`${d.proposal.jobId}:${d.proposal.proposalHash ?? ""}`} planId={planId} patientId={patientId} p={d.proposal} onEdit={onEdit} />}
      {ended.length > 0 && (
        <details className="text-xs rounded-md border bg-white p-2" data-testid="opus-revision-latest">
          <summary className="cursor-pointer text-slate-700">طلباتُك السابقة إلى Bionic AI ({ar(ended.length)})</summary>
          <ul className="m-0 mt-1 p-0 list-none space-y-1">
            {ended.map((j) => { const o = revisionOutcome(j); return (
              <li key={j.id} className="flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2 font-semibold", TONE[o.tone])}>{o.t}</span>
                <span className="text-muted-foreground">{when(j.createdAt)} · {j.requestedByName ?? "—"}</span>
                {j.note && <span className="min-w-0 break-words" dir="auto">«{j.note}»</span>}
              </li>
            ); })}
          </ul>
        </details>
      )}
    </div>
  );
}

/** **اقتراحُ Opus على النسخة ن** — الفرقُ والبوّاباتُ والمراجعُ والإقرار، ثمّ «احفظ النسخة ن+١» أو «تجاهل». */
export function OpusAmendReview({ planId, patientId, p, onEdit }: { planId: number; patientId: number; p: AmendProposal; onEdit?: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [askDiscard, setAskDiscard] = useState(false);
  const refresh = () => invalidateOpusPlan(qc, planId, patientId);
  const [, navigate] = useLocation();
  const issues = useMemo(() => {
    const m = new Map<string, Issue & { from: "reviewer" | "auditor" }>();
    for (const i of p.unresolved.reviewer ?? []) m.set(i.id, { ...i, from: "reviewer" });
    for (const i of p.unresolved.auditor ?? []) m.set(i.id, { ...i, from: "auditor" });
    return m;
  }, [p]);
  const save = useMutation({
    mutationFn: () => opusPost<{ version: number; needsAssignment?: string[] }>(`/api/physio/opus-jobs/${p.jobId}/proposal/save`,
      { proposalHash: p.proposalHash, acknowledgedIssueIds: Array.from(acks), ...(note.trim() ? { note: note.trim() } : {}) }),
    onSuccess: (r) => {
      refresh();
      const unassigned = (r.needsAssignment ?? []).length > 0;
      toast({ title: `حُفظت النسخة ${ar(r.version)}`, description: unassigned ? "صارت الساريةَ الآن — وفيها جزءٌ بلا إسناد، فأسنِده." : "صارت الساريةَ الآن، ونُبّه المعالجون بما تغيّر." });
      //  §4.hc — نسخةٌ أضافت جزءاً بلا مُسنَد ⟵ «إسناد» في الحال.
      if (unassigned) navigate(`/physio/plans/${planId}?assign=1`);
    },
    onError: (e: any) => {
      refresh();
      toast({ title: e.code === "proposal_changed" ? "تغيّر الاقتراح منذ فتحتَه" : "لم تُحفظ",
        description: e.code === "proposal_changed" ? "صحّحته البوّاباتُ على حال اليوم — أُعيد تحميله، راجِعه ثمّ احفظ." : e.message, variant: "destructive" });
    },
  });
  const discard = useMutation({
    mutationFn: () => opusPost(`/api/physio/opus-jobs/${p.jobId}/proposal/discard`, {}),
    onSuccess: () => { refresh(); toast({ title: "تُجوهل الاقتراح", description: `تبقى النسخة ${ar(p.currentVersion ?? p.baseVersion)} سارية.` }); },
    onError: (e: any) => { refresh(); toast({ title: "خطأ", description: e.message, variant: "destructive" }); },
  });
  const devName = (code: string) => p.snapshot?.devices.find((d) => d.deviceCode === code)?.nameAr ?? code;
  const exName = (id: number | null) => (id === null ? "—" : p.snapshot?.phases.flatMap((x) => x.exercises).find((x) => x.exerciseId === id)?.nameAr ?? `تمرين رقم ${ar(id)}`);
  const missing = p.majorsToAcknowledge.filter((id) => !acks.has(id));
  const canSave = !p.stale && missing.length === 0 && Boolean(p.proposalHash);
  const nextVersion = (p.currentVersion ?? p.baseVersion) + 1;
  return (
    <Card dir="rtl" className="p-3 space-y-3 min-w-0 border-violet-300" style={{ boxShadow: "inset 0 3px 0 rgb(109 40 217)" }} data-testid="opus-amend-review">
      <div className="space-y-1">
        <h3 className="m-0 text-base font-bold flex items-center gap-1.5"><Sparkles className="w-5 h-5 text-violet-700" /> اقتراح Bionic AI على النسخة {ar(p.baseVersion)}</h3>
        {p.request && <p className="m-0 text-sm"><span className="text-muted-foreground">طلبُك: </span><span dir="auto">«{p.request}»</span></p>}
        {!p.stale && <p className="m-0 text-xs text-muted-foreground">لم يتغيّر شيءٌ في الخطّة بعد — النسخة {ar(p.currentVersion ?? p.baseVersion)} سارية حتى تحفظ.</p>}
      </div>
      {p.stale && (
        <div className="rounded-md border border-red-300 bg-red-50 p-2 text-sm text-red-900" data-testid="opus-amend-stale">
          <b>قدُم هذا الاقتراح:</b> {p.staleText ?? "تغيّرت الخطّةُ بعده"} — لا يُحفظ. تجاهله واطلب من جديد إن أردت.
        </div>
      )}
      {p.diffSummaryAr && <p className="m-0 text-sm text-slate-800" data-testid="opus-amend-summary">ما يتغيّر: {p.diffSummaryAr}</p>}
      <section className="space-y-1.5">
        <h4 className="m-0 text-sm font-bold">الفرق عن النسخة {ar(p.baseVersion)}</h4>
        <PlanDiffView diff={p.diff} testId="opus-amend-diff" />
      </section>
      {p.gateLog.length > 0 && (
        <details className="text-xs" data-testid="opus-amend-gatelog">
          <summary className="cursor-pointer font-semibold text-slate-800">ما فعلته البوّاباتُ في الشيفرة ({ar(p.gateLog.length)})</summary>
          <div className="mt-1"><GateLogList entries={p.gateLog} devName={devName} exName={exName} /></div>
        </details>
      )}
      {(p.reviews.length > 0 || p.audits.length > 0) && (
        <section className="space-y-1">
          <h4 className="m-0 text-sm font-bold">ما وجده المراجع{p.audits.length ? " والمدقّق" : ""}</h4>
          {p.reviews.map((r, i) => (
            <div key={`r${i}`} className="text-xs rounded border p-1.5">
              <b>المراجع — الجولة {ar(r.round)}: {r.verdict === "pass" ? "قبله" : "طلب تعديلاً"}</b>{r.summaryAr ? ` — ${r.summaryAr}` : ""}
              {r.issues.length > 0 && <IssueList issues={r.issues} />}
            </div>
          ))}
          {p.audits.map((a, i) => (
            <div key={`a${i}`} className="text-xs rounded border border-violet-200 p-1.5">
              <b>المدقّق — الجولة {ar(a.round)}: {a.verdict === "pass" ? "لا ملاحظة" : "عنده ملاحظات"}</b>{a.summaryAr ? ` — ${a.summaryAr}` : ""}
              {a.issues.length > 0 && <IssueList issues={a.issues} />}
            </div>
          ))}
        </section>
      )}
      {p.majorsToAcknowledge.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-2 space-y-1.5" data-testid="opus-amend-acks">
          <div className="text-sm font-bold text-amber-950">ملاحظاتٌ كبيرة لم تُحلّ — أقرّ بكلٍّ منها قبل الحفظ</div>
          {p.majorsToAcknowledge.map((id) => { const i = issues.get(id); return (
            <label key={id} className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={acks.has(id)} className="mt-0.5" data-testid={`opus-amend-ack-${id}`}
                onCheckedChange={(v) => setAcks((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; })} />
              <span className="min-w-0">{i ? `${i.from === "auditor" ? "المدقّق" : "المراجع"}: ${i.problemAr}` : id}</span>
            </label>
          ); })}
        </div>
      )}
      {!p.stale && (
        <label className="grid gap-1 text-xs">ملاحظةٌ مع الحفظ (اختيارية — تظهر في سجلّ النسخ)
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="bg-white text-sm" data-testid="input-opus-amend-note" />
        </label>
      )}
      <div className="flex flex-wrap items-center gap-2 pt-1 border-t">
        {!p.stale && (
          <Button className="gap-1 bg-emerald-700 hover:bg-emerald-800" disabled={!canSave || save.isPending} onClick={() => save.mutate()} data-testid="button-opus-amend-save">
            <Save className="w-4 h-4" /> احفظ النسخة {ar(nextVersion)}
          </Button>
        )}
        {!askDiscard ? (
          <Button variant="outline" className="gap-1" onClick={() => setAskDiscard(true)} data-testid="button-opus-amend-discard"><X className="w-4 h-4" /> تجاهل الاقتراح</Button>
        ) : (
          <>
            <span className="text-xs text-slate-700">يُترك الاقتراح ويبقى في السجلّ — متأكّد؟</span>
            <Button size="sm" variant="destructive" disabled={discard.isPending} onClick={() => discard.mutate()} data-testid="button-opus-amend-discard-confirm">نعم، تجاهله</Button>
            <Button size="sm" variant="ghost" onClick={() => setAskDiscard(false)}>لا</Button>
          </>
        )}
        {onEdit && !p.stale && <Button variant="ghost" className="gap-1 text-xs" onClick={onEdit}><Undo2 className="w-3.5 h-3.5" /> أعدّلها بيدي بدلاً منه</Button>}
        {!canSave && !p.stale && missing.length > 0 && <span className="text-xs text-amber-900">أقرّ بالملاحظات الكبيرة أعلاه أوّلاً.</span>}
      </div>
    </Card>
  );
}
