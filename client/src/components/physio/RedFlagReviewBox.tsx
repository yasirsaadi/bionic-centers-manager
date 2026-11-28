// **اعتمادُ العلامة الحمراء على بطاقة المعاينة** (ترحيل ١٩٨، §4.gz — قرارُ المالك ٢٠٢٦-١١-٢٧).
//
// الإجراءُ العاجل ظهر للفاحص فوراً في الاستمارة؛ هنا ما بعده: يكتب الفاحصُ ملاحظتَه ويضغط «أرسل للاعتماد» فيصل المالكَ وسليم تلغرامٌ
// وشارةٌ في «اعتمادات العلاج الطبيعي»؛ والمعتمِدُ يعتمد بملاحظةٍ إلزامية أو يرفض. **ومعتمِدٌ يفحص يقرّر في الخطوة نفسِها**، أو يرسلها
// للمعتمِد الآخر. **ومعتمِدٌ على معاينة غيره يقرّر مباشرةً بملاحظة قراره وحدها** — لا يكتب «ملاحظةَ الفاحص» عن غيره، والفاحصُ يعلم.
// والخادمُ يحكم في كلّ خطوة (مَن يطلب ومَن يقرّر والملاحظتان والمرفوض) — الشاشةُ تعرض ما يقبله وحده.
// وتُستعمل في بطاقة المعاينة وفي خطوة «أرسل للاعتماد» بعد الحفظ داخل نافذة المعاينة (`onDone`).
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { redFlagsOf, RED_FLAG_URGENCY_AR, type AgentGate, type RedFlagReviewSummary } from "@shared/physio_exam_v2";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import { cn } from "@/lib/utils";

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || "تعذّر تنفيذ الطلب");
  return json;
}

/** اسمُ ملاحظة الطلب: الفاحصُ نفسُه، أو مَن أرسلها عنه. */
export function requestNoteLabel(review: Pick<RedFlagReviewSummary, "requestedById">, examinerId: number | null): string {
  return review.requestedById !== null && review.requestedById === examinerId ? "ملاحظةُ الفاحص" : "ملاحظةُ المرسِل";
}

export const APPROVE_LABEL = "اعتماد — يكمل Opus";
export const REJECT_LABEL = "رفض — تتوقّف";
export const DECISION_NOTE_PLACEHOLDER = "ملاحظةُ الاعتماد (إلزامية — يقرؤها Opus قيداً على الخطّة)";

export function RedFlagReviewBox({
  examId, patientId, assessment, review, gate, isAuthor, canApprove, examinerId = null, onDone,
}: {
  examId: number;
  patientId: number;
  assessment: unknown;
  review: RedFlagReviewSummary | null;
  gate: AgentGate | null;
  isAuthor: boolean;
  canApprove: boolean;
  /** كاتبُ المعاينة — به تُسمّى ملاحظةُ الطلب. */
  examinerId?: number | null;
  /** بعد نجاح الإرسال أو القرار (خطوةُ ما بعد الحفظ في نافذة المعاينة تُغلَق به). */
  onDone?: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [examinerNote, setExaminerNote] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const hits = redFlagsOf(assessment);
  const done = () => {
    qc.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
    qc.invalidateQueries({ queryKey: ["/api/physio/red-flag-reviews"] });
    setExaminerNote("");
    setDecisionNote("");
    onDone?.();
  };
  const request = useMutation({
    mutationFn: (decision: "approve" | "reject" | null) => post(`/api/physio/exams/${examId}/red-flag-review`,
      { ...(isAuthor || decision === null ? { examinerNote } : {}), ...(decision ? { decision, decisionNote } : {}) }),
    onSuccess: (_r, decision) => { done(); toast({ title: decision === "approve" ? "اعتُمدت العلامةُ الحمراء" : decision === "reject" ? "رُفضت العلامةُ الحمراء" : "أُرسلت للاعتماد — وصلت المسؤولَ والمشرفَ العام" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
  const decide = useMutation({
    mutationFn: (decision: "approve" | "reject") => post(`/api/physio/red-flag-reviews/${review!.id}/decide`, { decision, note: decisionNote }),
    onSuccess: (_r, decision) => { done(); toast({ title: decision === "approve" ? "اعتُمدت العلامةُ الحمراء" : "رُفضت العلامةُ الحمراء" }); },
    onError: (e: any) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });
  const pending = review?.status === "pending";
  const rejected = review?.status === "rejected";
  //  بلا «نعم» لا شيءَ هنا — إلّا طلبٌ معلَّقٌ أو مرفوضٌ ما زال يوقف المعاينة (مُحيت علاماتُه بعده: يرفعه معتمِد).
  if (!hits.length && !pending && !rejected) return null;
  const busy = request.isPending || decide.isPending;
  //  طلبٌ جديد: لا طلبَ بعد، أو تغيّرت العلاماتُ بعد الاعتماد، أو رُفضت ومَن يراها معتمِد.
  const canRequest = !pending && (isAuthor || canApprove)
    && (review === null || gate?.code === "red_flag_changed" || (rejected && canApprove));
  //  معتمِدٌ على معاينة غيره: قرارٌ مباشرٌ بملاحظة قراره وحدها.
  const direct = canRequest && canApprove && !isAuthor;
  const pill = pending ? { t: "بانتظار المسؤول أو المشرف العام", c: "bg-amber-100 text-amber-900" }
    : rejected ? { t: "رُفضت — توقّفت المعاينة", c: "bg-red-100 text-red-800" }
      : gate?.code === "red_flag_other_exam" ? { t: "موقوفة — علامةٌ في معاينةٍ أخرى لم تُعتمد", c: "bg-amber-100 text-amber-900" }
        : gate?.code === "red_flag_approved" ? { t: `اعتمدها ${review?.decidedByName ?? ""}`, c: "bg-emerald-100 text-emerald-800" }
          : gate?.code === "red_flag_changed" ? { t: "تغيّرت العلامات — اعتمادٌ جديد", c: "bg-amber-100 text-amber-900" }
            : { t: "لم تُرسَل للاعتماد", c: "bg-red-100 text-red-800" };
  const decisionButtons = (onPick: (d: "approve" | "reject") => void, disabled: boolean, idPrefix: string) => (
    <>
      <Button size="sm" className="bg-emerald-700 hover:bg-emerald-800" disabled={disabled} onClick={() => onPick("approve")} data-testid={`button-redflag-${idPrefix}approve-${examId}`}>{APPROVE_LABEL}</Button>
      <Button size="sm" variant="outline" className="text-red-700 border-red-300" disabled={disabled} onClick={() => onPick("reject")} data-testid={`button-redflag-${idPrefix}reject-${examId}`}>{REJECT_LABEL}</Button>
    </>
  );

  return (
    <div className="mb-2 rounded-lg border border-red-300 bg-red-50/60 p-2 flex flex-col gap-2 min-w-0" data-testid={`exam-redflag-${examId}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-red-700" />
        <span className="text-xs font-bold text-red-900">اعتمادُ العلامة الحمراء</span>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", pill.c)} data-testid={`exam-redflag-status-${examId}`}>{pill.t}</span>
      </div>
      {hits.length > 0 ? (
        <ul className="m-0 ps-5 list-disc text-xs text-red-900">
          {hits.map((h) => <li key={h.key}><b>{RED_FLAG_URGENCY_AR[h.urgency]}:</b> {h.actionAr}</li>)}
        </ul>
      ) : (
        <p className="m-0 text-xs text-slate-700">أُجيبت العلاماتُ «لا» بعد الطلب — ويبقى القرارُ للمسؤول أو المشرف العام.</p>
      )}
      {review && (
        <div className="text-[11px] text-slate-700 space-y-0.5">
          {review.examinerNote && (
            <div>{requestNoteLabel(review, examinerId)} ({review.requestedByName ?? "—"}{review.requestedAt ? ` · ${formatDateIraq(review.requestedAt)} ${formatTimeIraq(review.requestedAt)}` : ""}): {review.examinerNote}</div>
          )}
          {review.decisionNote && <div>ملاحظةُ {review.status === "approved" ? "الاعتماد" : "الرفض"} ({review.decidedByName ?? "—"}): {review.decisionNote}</div>}
        </div>
      )}
      {pending && canApprove && (
        <div className="flex flex-col gap-1.5">
          <Textarea rows={2} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder={DECISION_NOTE_PLACEHOLDER}
            data-testid={`input-redflag-decision-${examId}`} />
          <div className="flex flex-wrap gap-2">{decisionButtons((d) => decide.mutate(d), busy || !decisionNote.trim(), "")}</div>
        </div>
      )}
      {canRequest && (
        <div className="flex flex-col gap-1.5">
          {direct ? (
            //  **قرارٌ مباشرٌ لمعتمِدٍ على معاينة غيره** — ملاحظةُ قراره وحدها، والفاحصُ يعلم بالقرار.
            <>
              <Textarea rows={2} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)} placeholder={DECISION_NOTE_PLACEHOLDER}
                data-testid={`input-redflag-self-decision-${examId}`} />
              <div className="flex flex-wrap gap-2">{decisionButtons((d) => request.mutate(d), busy || !decisionNote.trim(), "self-")}</div>
              {hits.length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-slate-700">أو أرسلها للمعتمِد الآخر بملاحظتك</summary>
                  <div className="mt-1.5 flex flex-col gap-1.5">
                    <Textarea rows={2} value={examinerNote} onChange={(e) => setExaminerNote(e.target.value)} placeholder="ملاحظةُ المرسِل للمعتمِد (إلزامية)"
                      data-testid={`input-redflag-note-${examId}`} />
                    <div><Button size="sm" variant="outline" disabled={busy || !examinerNote.trim()} onClick={() => request.mutate(null)} data-testid={`button-redflag-request-${examId}`}>أرسل للاعتماد</Button></div>
                  </div>
                </details>
              )}
            </>
          ) : (
            <>
              <Textarea rows={2} value={examinerNote} onChange={(e) => setExaminerNote(e.target.value)} placeholder="ملاحظةُ الفاحص للمعتمِد (إلزامية)"
                data-testid={`input-redflag-note-${examId}`} />
              {canApprove && (
                <Textarea rows={2} value={decisionNote} onChange={(e) => setDecisionNote(e.target.value)}
                  placeholder="أنت معتمِد: ملاحظةُ الاعتماد هنا تكفي في الخطوة نفسِها (إلزامية لقرارك — يقرؤها Opus)" data-testid={`input-redflag-self-decision-${examId}`} />
              )}
              <div className="flex flex-wrap gap-2">
                {hits.length > 0 && (
                  <Button size="sm" variant={canApprove ? "outline" : "default"} disabled={busy || !examinerNote.trim()} onClick={() => request.mutate(null)}
                    data-testid={`button-redflag-request-${examId}`}>{canApprove ? "أرسل للمعتمِد الآخر" : "أرسل للاعتماد"}</Button>
                )}
                {canApprove && decisionButtons((d) => request.mutate(d), busy || !examinerNote.trim() || !decisionNote.trim(), "self-")}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
