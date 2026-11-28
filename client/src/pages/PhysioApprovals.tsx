// **«اعتمادات العلاج الطبيعي»** (ترحيل ١٩٨، §4.gz — قرارُ المالك ٢٠٢٦-١١-٢٧): العلاماتُ الحمراء في معاينات العلاج الطبيعي التي أرسلها
// فاحصوها للاعتماد — للمسؤول والمشرف العام (سليم) بصلاحياتٍ واحدة. كلُّ طلبٍ بمريضه وفرعه وفاحصه وعلاماته وإجرائها وملاحظة الفاحص؛
// والقرارُ «اعتماد» أو «رفض» **بملاحظةٍ إلزامية** يقرؤها Opus قيداً على الخطّة — بألفاظ بطاقة المعاينة نفسِها. والمحسومُ للعلم في التبويب الثاني.
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { RED_FLAG_URGENCY_AR, type RedFlagReviewSummary } from "@shared/physio_exam_v2";
import { cn } from "@/lib/utils";
import { APPROVE_LABEL, DECISION_NOTE_PLACEHOLDER, REJECT_LABEL, requestNoteLabel } from "@/components/physio/RedFlagReviewBox";

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
  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") => postJson(`/api/physio/red-flag-reviews/${r.id}/decide`, { decision, note }),
    onSuccess: (_x, decision) => {
      qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews"] });
      qc.invalidateQueries({ queryKey: [`/api/medical/patients/${r.patientId}/exams`] });
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

export default function PhysioApprovals() {
  const [view, setView] = useState<"pending" | "decided">("pending");
  const q = useQuery<{ rows: ReviewRow[] }>({
    queryKey: ["/api/physio/red-flag-reviews", view],
    queryFn: async () => (await apiRequest("GET", `/api/physio/red-flag-reviews?view=${view}`)).json(),
  });
  const rows = q.data?.rows ?? [];
  return (
    <div className="max-w-4xl mx-auto space-y-3" dir="rtl">
      <h1 className="text-xl font-bold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-red-700" /> اعتمادات العلاج الطبيعي</h1>
      <p className="text-xs text-muted-foreground">
        علاماتٌ حمراء في معاينات العلاج الطبيعي أرسلها الفاحصون. الإجراءُ العاجل ظهر للفاحص لحظةَ المعاينة؛ وهنا القرار: الاعتمادُ يسمح لـ Opus
        بكتابة الخطّة وملاحظتُك قيدٌ عليها، والرفضُ يوقفها وتبقى الإحالة.
      </p>
      <div className="inline-flex rounded-md border overflow-hidden text-sm" role="group">
        {(["pending", "decided"] as const).map((v) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}
            className={cn("px-3 py-1.5", view === v ? "bg-primary text-primary-foreground" : "bg-white")} data-testid={`approvals-view-${v}`}>
            {v === "pending" ? "بانتظار القرار" : "المحسومة"}
          </button>
        ))}
      </div>
      {q.isLoading ? <Card className="p-4 text-sm text-muted-foreground">جارٍ التحميل…</Card>
        : q.isError ? <Card className="p-4 text-sm text-red-700">تعذّر التحميل.</Card>
          : rows.length === 0 ? <Card className="p-4 text-sm text-muted-foreground" data-testid="approvals-empty">{view === "pending" ? "لا علامةَ حمراء تنتظر القرار." : "لا قرارات بعد."}</Card>
            : <div className="space-y-2">{rows.map((r) => <ReviewCard key={r.id} r={r} decided={view === "decided"} />)}</div>}
    </div>
  );
}
