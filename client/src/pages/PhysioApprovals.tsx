// **«اعتمادات العلاج الطبيعي»** (ترحيل ١٩٨، §4.gz — قرارُ المالك ٢٠٢٦-١١-٢٧): العلاماتُ الحمراء في معاينات العلاج الطبيعي التي أرسلها
// فاحصوها للاعتماد — للمسؤول والمشرف العام (سليم) بصلاحياتٍ واحدة. كلُّ طلبٍ بمريضه وفرعه وفاحصه وعلاماته وإجرائها وملاحظة الفاحص؛
// والقرارُ «اعتماد» أو «رفض» **بملاحظةٍ إلزامية** يقرؤها Opus قيداً على الخطّة — بألفاظ بطاقة المعاينة نفسِها. والمحسومُ للعلم في التبويب الثاني.
// **و«خطط Opus»** (§4.ha ١١.٣): ما كتبه Opus بانتظار الاعتماد، والقديمُ (تغيّرت معاينتُه)، والمحسوم — والشارةُ عددُ المنتظر.
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Sparkles } from "lucide-react";
import { JOB_ERROR_TEXTS, OPUS_OUT_OF_LIBRARY_LABEL } from "@shared/physio_agent";
import { arText, OPUS_PLANS_KEY, type OpusPlanRow } from "@/lib/opus_agent";
import { canApproveProtocols } from "@shared/physio_protocols";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { RED_FLAG_URGENCY_AR, type RedFlagReviewSummary } from "@shared/physio_exam_v2";
import { cn } from "@/lib/utils";
import { APPROVE_LABEL, DECISION_NOTE_PLACEHOLDER, ForbiddenDevicePicker, REJECT_LABEL, requestNoteLabel } from "@/components/physio/RedFlagReviewBox";

interface ReviewRow extends RedFlagReviewSummary {
  examId: number; patientId: number; patientName: string | null; patientCode: string | null; branchName: string | null;
  examinerId: number | null; examinerName: string | null; signedAt: string | null; diagnosis: string | null;
}

/** نصُّ الخطأ من الخادم كما هو (الملاحظةُ الإلزامية، أو حُسم من قبل) — لا رمزُ الحالة. */
async function postJson(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "تعذّر تنفيذ الطلب");
  return json;
}

function ReviewCard({ r, decided }: { r: ReviewRow; decided: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const [forbidden, setForbidden] = useState<string[]>([]);
  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") => postJson(`/api/physio/red-flag-reviews/${r.id}/decide`,
      { decision, note, ...(decision === "approve" && forbidden.length ? { forbiddenDevices: forbidden } : {}) }),
    onSuccess: (_x, decision) => {
      qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews"] });
      qc.invalidateQueries({ queryKey: [`/api/medical/patients/${r.patientId}/exams`] });
      qc.invalidateQueries({ queryKey: [OPUS_PLANS_KEY] });
      toast({ title: decision === "approve" ? "اعتُمدت العلامةُ الحمراء — يعلم الفاحص" : "رُفضت العلامةُ الحمراء — يعلم الفاحص" });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
  return (
    <Card className="p-3 space-y-2 min-w-0" data-testid={`approval-row-${r.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/patients/${r.patientId}`} className="font-semibold hover:underline">{r.patientName ?? "—"}{r.patientCode ? ` (${r.patientCode})` : ""}</Link>
        <span className="text-xs text-muted-foreground">{r.branchName ?? "—"} · الفاحص: {r.examinerName ?? "—"}{r.signedAt ? ` · ${formatDateIraq(r.signedAt)} ${formatTimeIraq(r.signedAt)}` : ""}</span>
        {decided && (
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.status === "approved" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800")}>
            {r.status === "approved" ? "اعتُمدت" : "رُفضت"} — {r.decidedByName ?? ""}
          </span>
        )}
      </div>
      {r.diagnosis && <div className="text-xs"><span className="text-muted-foreground">التشخيص: </span><b dir="auto">{r.diagnosis}</b></div>}
      <ul className="m-0 ps-5 list-disc text-sm space-y-1">
        {r.flags.map((f) => (
          <li key={f.key}>
            <span className="text-slate-800">{f.questionAr}</span>
            <div className="text-xs text-red-800"><b>{RED_FLAG_URGENCY_AR[f.urgency as keyof typeof RED_FLAG_URGENCY_AR] ?? f.urgency}:</b> {f.actionAr}</div>
          </li>
        ))}
      </ul>
      {r.examinerNote && <div className="text-xs text-slate-700">{requestNoteLabel(r, r.examinerId)} ({r.requestedByName ?? "—"}): {r.examinerNote}</div>}
      {decided ? (
        r.decisionNote && <div className="text-xs text-slate-700">ملاحظةُ القرار: {r.decisionNote}</div>
      ) : (
        <div className="space-y-1.5">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={DECISION_NOTE_PLACEHOLDER}
            data-testid={`input-approval-note-${r.id}`} />
          <ForbiddenDevicePicker value={forbidden} onChange={setForbidden} testId={`approval-forbidden-${r.id}`} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={decide.isPending || !note.trim()} onClick={() => decide.mutate("approve")}
              data-testid={`button-approval-approve-${r.id}`}>{APPROVE_LABEL}</Button>
            <Button size="sm" variant="outline" className="text-red-700 border-red-300" disabled={decide.isPending || !note.trim()} onClick={() => decide.mutate("reject")}
              data-testid={`button-approval-reject-${r.id}`}>{REJECT_LABEL}</Button>
          </div>
        </div>
      )}
    </Card>
  );
}

const OPUS_VIEWS = { pending: "بانتظار الاعتماد", stale: "قدُمت", decided: "المحسومة" } as const;
type OpusView = keyof typeof OPUS_VIEWS;

/** **خطّةُ Opus في الطابور** (§4.ha ١١.٣) — تُفتح «الخطّة المقترحة» في صفحتها، والاعتمادُ هناك بعد قراءتها. */
function OpusPlanCard({ r, view }: { r: OpusPlanRow; view: OpusView }) {
  return (
    <Card className="p-3 space-y-1.5 min-w-0 border-violet-200" data-testid={`opus-plan-row-${r.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/patients/${r.patientId}`} className="font-semibold hover:underline">{r.patientName ?? "—"}{r.patientCode ? ` (${r.patientCode})` : ""}</Link>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", r.outOfLibrary ? "bg-violet-100 text-violet-800" : "bg-teal-100 text-teal-800")}>
          {r.outOfLibrary ? OPUS_OUT_OF_LIBRARY_LABEL : "من المكتبة"}
        </span>
        {view === "decided" && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800">{r.status === "approved" ? "اعتُمدت" : "أُغلقت"}{r.decidedByName ? ` — ${r.decidedByName}` : ""}</span>}
      </div>
      <div className="text-sm" dir="auto">{r.titleAr}</div>
      <div className="text-xs text-muted-foreground">{r.branchName ?? "—"} · الفاحص: {r.examinerName ?? "—"} · كتبها Opus {arText(formatDateIraq(r.createdAt))} {arText(formatTimeIraq(r.createdAt))}</div>
      {r.staleReason && <div className="text-xs text-amber-900">قدُمت: {JOB_ERROR_TEXTS[r.staleReason] ?? "تغيّرت المعاينةُ بعد كتابتها"}</div>}
      <div>
        <Link href={`/physio/plans/${r.id}`}>
          <Button size="sm" className="bg-violet-700 hover:bg-violet-800 gap-1" data-testid={`button-open-opus-plan-${r.id}`}>
            <Sparkles className="w-4 h-4" /> {view === "decided" ? "افتح الخطّة" : "اعرض الخطّة المقترحة"}
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function Seg<T extends string>({ value, options, onChange, prefix, counts, muted }: { value: T; options: Record<T, string>; onChange: (v: T) => void; prefix: string;
  counts?: Partial<Record<T, number>>; /** عددٌ باهت (يُنتبه له، لا ينتظر قراراً) — «قدُمت». */ muted?: Partial<Record<T, number>> }) {
  return (
    <div className="inline-flex flex-wrap rounded-md border overflow-hidden text-sm" role="group">
      {(Object.keys(options) as T[]).map((v) => (
        <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}
          className={cn("px-3 py-1.5 inline-flex items-center gap-1.5", value === v ? "bg-primary text-primary-foreground" : "bg-white")} data-testid={`${prefix}-${v}`}>
          {options[v]}
          {counts?.[v] ? <span className={cn("rounded-full px-1.5 text-[11px] font-bold", value === v ? "bg-white/25" : "bg-red-600 text-white")}>{arText(counts[v]!)}</span> : null}
          {!counts?.[v] && muted?.[v] ? <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", value === v ? "bg-white/25" : "bg-slate-200 text-slate-700")}
            data-testid={`${prefix}-${v}-muted`}>{arText(muted[v]!)}</span> : null}
        </button>
      ))}
    </div>
  );
}

export default function PhysioApprovals() {
  //  الصفحةُ للمعتمِد وحده (الخادمُ يردّ غيرَه ٤٠٣) — فلا تبويبان و«تعذّر التحميل» لمن فتح الرابطَ بيده.
  const branchSession = useBranchSession();
  const permissions = usePermissions();
  const approver = canApproveProtocols(branchSession ? { ...branchSession, permissions } as any : null);
  if (branchSession && !approver) {
    return (
      <div className="max-w-4xl mx-auto space-y-3" dir="rtl">
        <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-700" /> اعتمادات العلاج الطبيعي</h1>
        <Card className="p-4 text-sm text-muted-foreground" data-testid="approvals-not-approver">لصلاحية المعتمِد وحده (المسؤول والمشرف العام).</Card>
      </div>
    );
  }
  return <PhysioApprovalsInner />;
}

function PhysioApprovalsInner() {
  const [kind, setKind] = useState<"redflags" | "opus">(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "opus" ? "opus" : "redflags"));
  const [view, setView] = useState<"pending" | "decided">("pending");
  const [opusView, setOpusView] = useState<OpusView>("pending");
  const counts = useQuery<{ count: number; redFlags?: number; opusPlans?: number; opusStale?: number }>({
    queryKey: ["/api/physio/red-flag-reviews", "pending-count"],
    queryFn: async () => (await apiRequest("GET", "/api/physio/red-flag-reviews/pending-count")).json(),
  });
  const q = useQuery<{ rows: ReviewRow[] }>({
    queryKey: ["/api/physio/red-flag-reviews", view],
    queryFn: async () => (await apiRequest("GET", `/api/physio/red-flag-reviews?view=${view}`)).json(),
    enabled: kind === "redflags",
  });
  const oq = useQuery<{ rows: OpusPlanRow[] }>({
    queryKey: [OPUS_PLANS_KEY, opusView],
    queryFn: async () => (await apiRequest("GET", `${OPUS_PLANS_KEY}?view=${opusView}`)).json(),
    enabled: kind === "opus",
  });
  const rows = q.data?.rows ?? [];
  const orows = oq.data?.rows ?? [];
  return (
    <div className="max-w-4xl mx-auto space-y-3" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-700" /> اعتمادات العلاج الطبيعي</h1>
      <Seg value={kind} onChange={setKind} prefix="approvals-kind" options={{ redflags: "العلامات الحمراء", opus: "خطط Opus" }}
        counts={{ redflags: counts.data?.redFlags ?? 0, opus: counts.data?.opusPlans ?? 0 }} />
      {kind === "redflags" ? (
        <>
          <p className="text-xs text-muted-foreground">
            علاماتٌ حمراء في معاينات العلاج الطبيعي أرسلها الفاحصون. الإجراءُ العاجل ظهر للفاحص لحظةَ المعاينة؛ وهنا القرار: الاعتمادُ يسمح لـ Opus
            بكتابة الخطّة وملاحظتُك قيدٌ عليها، والرفضُ يوقفها وتبقى الإحالة.
          </p>
          <Seg value={view} onChange={setView} prefix="approvals-view" options={{ pending: "بانتظار القرار", decided: "المحسومة" }} />
          {q.isLoading ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
            : q.isError ? <Card className="p-4 text-sm text-red-700">تعذّر التحميل.</Card>
              : rows.length === 0 ? <Card className="p-4 text-sm text-muted-foreground" data-testid="approvals-empty">{view === "pending" ? "لا علامةَ حمراء تنتظر القرار." : "لا قرارات بعد."}</Card>
                : <div className="space-y-2">{rows.map((r) => <ReviewCard key={r.id} r={r} decided={view === "decided"} />)}</div>}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            خططٌ كتبها Opus من معاينات العلاج الطبيعي. لا يراها المعالجون قبل اعتمادك؛ افتح كلّاً منها واقرأها ثمّ اعتمدها أو احذفها.
            و«قدُمت» خططٌ تغيّرت معاينتُها بعد كتابتها — لا تُعتمد، تُحذف ويُعاد الكتابة.
          </p>
          <Seg value={opusView} onChange={setOpusView} prefix="opus-view" options={OPUS_VIEWS} counts={{ pending: counts.data?.opusPlans ?? 0 }}
            muted={{ stale: counts.data?.opusStale ?? 0 }} />
          {oq.isLoading ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
            : oq.isError ? <Card className="p-4 text-sm text-red-700">تعذّر التحميل.</Card>
              : orows.length === 0 ? <Card className="p-4 text-sm text-muted-foreground" data-testid="opus-plans-empty">{opusView === "pending" ? "لا خطّةَ من Opus تنتظر الاعتماد." : opusView === "stale" ? "لا خطّةَ قديمة." : "لا قرارات بعد."}</Card>
                : <div className="space-y-2">{orows.map((r) => <OpusPlanCard key={r.id} r={r} view={opusView} />)}</div>}
        </>
      )}
    </div>
  );
}
