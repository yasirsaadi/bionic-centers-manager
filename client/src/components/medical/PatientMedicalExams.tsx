import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Stethoscope, Lock, Plus, Printer, FilePlus2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import {
  EXAM_FIELDS,
  SPECIALTY_COLORS,
  isMedicalSpecialty,
  specialtyLabel,
  type MedicalSpecialty,
} from "@shared/medical";
import { NewExamDialog } from "./NewExamDialog";

interface Addendum {
  id: number;
  doctorName: string;
  body: string;
  signedAt: string;
}

interface Exam {
  id: number;
  caseType: string;
  doctorName: string;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
  signedAt: string;
  addenda: Addendum[];
}

interface ExamsResponse {
  exams: Exam[];
  pending: string[];
  canWriteMedicalExam: boolean;
  specialties: MedicalSpecialty[];
}


function accent(caseType: string) {
  return isMedicalSpecialty(caseType)
    ? SPECIALTY_COLORS[caseType]
    : { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", ring: "border-slate-200" };
}

/**
 * The patient's clinical thread: every signed exam, newest first, one colour
 * per specialty so a patient treated by two departments reads as two stories
 * under one identity.
 *
 * Everyone sees this card. Only a doctor granted the matching specialty sees
 * the write controls, and nothing here can edit or delete an existing record —
 * corrections are appended as dated addenda.
 */
export function PatientMedicalExams({
  patientId,
  patientName,
  branchName,
}: {
  patientId: number;
  patientName?: string | null;
  branchName?: string | null;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [examOpen, setExamOpen] = useState(false);
  const [preferredSpecialty, setPreferredSpecialty] = useState<string | null>(null);
  const [addendumFor, setAddendumFor] = useState<Exam | null>(null);
  const [addendumBody, setAddendumBody] = useState("");

  const queryKey = [`/api/medical/patients/${patientId}/exams`];

  const { data } = useQuery<ExamsResponse>({
    queryKey,
    enabled: !!patientId,
    queryFn: async () => {
      const res = await fetch(`/api/medical/patients/${patientId}/exams`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("تعذّر تحميل المعاينات");
      return res.json();
    },
  });

  const exams = data?.exams ?? [];
  const pending = data?.pending ?? [];
  const mySpecialties = data?.specialties ?? [];
  const isDoctor = Boolean(data?.canWriteMedicalExam) && mySpecialties.length > 0;

  const saveAddendum = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/medical/exams/${addendumFor?.id}/addenda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: addendumBody }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر حفظ الملحق");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setAddendumFor(null);
      setAddendumBody("");
      toast({ title: "أُضيف الملحق إلى المعاينة" });
    },
    onError: (err: any) =>
      toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Official print sheet. Opened in its own window so the app's layout, sidebar
  // and colours never leak into a document that goes into a patient file.
  const printExam = (exam: Exam) => {
    const rows = EXAM_FIELDS.filter((f) => (exam as any)[f.key])
      .map(
        (f) =>
          `<tr><th>${f.label}</th><td>${String((exam as any)[f.key]).replace(/\n/g, "<br/>")}</td></tr>`,
      )
      .join("");
    const addenda = exam.addenda
      .map(
        (a) =>
          `<div class="add"><b>ملحق — ${a.doctorName}</b> <span>${formatDateIraq(a.signedAt)} ${formatTimeIraq(a.signedAt)}</span><p>${a.body.replace(/\n/g, "<br/>")}</p></div>`,
      )
      .join("");

    const win = window.open("", "_blank", "width=900,height=1000");
    if (!win) return;
    win.document.write(`<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<title>معاينة طبية — ${patientName ?? ""}</title>
<style>
  body{font-family:'Segoe UI',Tahoma,sans-serif;padding:32px;color:#111;line-height:1.8}
  h1{font-size:20px;margin:0 0 4px}
  .sub{color:#555;font-size:13px;margin-bottom:18px}
  .meta{display:flex;gap:24px;flex-wrap:wrap;font-size:13px;background:#f6f8fa;padding:12px 16px;border-radius:10px;margin-bottom:18px}
  table{width:100%;border-collapse:collapse;font-size:14px}
  th{text-align:right;width:150px;vertical-align:top;padding:10px;background:#fafafa;border:1px solid #e5e7eb;font-weight:600}
  td{padding:10px;border:1px solid #e5e7eb}
  .add{margin-top:14px;padding:10px 14px;border-right:3px solid #999;background:#fbfbfb;font-size:13px}
  .add span{color:#666}
  .sign{margin-top:36px;display:flex;justify-content:space-between;font-size:13px}
  .sign div{border-top:1px solid #333;padding-top:6px;min-width:220px;text-align:center}
</style></head><body>
<h1>${branchName ? branchName + " — " : ""}معاينة طبية</h1>
<div class="sub">اختصاص: ${specialtyLabel(exam.caseType)}</div>
<div class="meta">
  <span><b>المريض:</b> ${patientName ?? "—"}</span>
  <span><b>الطبيب:</b> ${exam.doctorName}</span>
  <span><b>التاريخ:</b> ${formatDateIraq(exam.signedAt)} — ${formatTimeIraq(exam.signedAt)}</span>
</div>
<table>${rows}</table>
${addenda}
<div class="sign"><div>توقيع الطبيب: ${exam.doctorName}</div><div>ختم المركز</div></div>
</body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  // Hide the card entirely only when there is nothing to show AND nothing the
  // viewer could do about it — otherwise the pending badges are the point.
  if (exams.length === 0 && pending.length === 0 && !isDoctor) return null;

  return (
    <>
      <Card className="p-4 rounded-2xl border-teal-300/60 bg-teal-50/40">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <h3 className="font-bold text-sm flex items-center gap-2 text-teal-800">
            <Stethoscope className="w-4 h-4" /> معاينة الطبيب
            {exams.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                ({exams.length} معاينة)
              </span>
            )}
          </h3>

          {isDoctor && (
            <Button
              size="sm"
              className="h-8"
              onClick={() => {
                // Seed the specialty the doctor is most likely here for: one
                // that is waiting on them. The dialog falls back to their only
                // specialty when there is nothing pending.
                setPreferredSpecialty(
                  pending.find((p) => mySpecialties.includes(p as MedicalSpecialty)) ?? null,
                );
                setExamOpen(true);
              }}
              data-testid="button-new-medical-exam"
            >
              <Plus className="w-4 h-4 ml-1" /> معاينة جديدة
            </Button>
          )}
        </div>

        {/* Who is still waiting, per specialty. */}
        {pending.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {pending.map((p) => (
              <Badge
                key={p}
                variant="outline"
                className="bg-amber-100 text-amber-800 border-amber-200 font-normal text-xs"
                data-testid={`badge-pending-exam-${p}`}
              >
                <Clock className="w-3 h-3 ml-1" />
                بانتظار معاينة {specialtyLabel(p)}
              </Badge>
            ))}
          </div>
        )}

        {exams.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد معاينات بعد.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => {
              const a = accent(exam.caseType);
              const canAppend =
                isDoctor && mySpecialties.includes(exam.caseType as MedicalSpecialty);
              return (
                <div
                  key={exam.id}
                  className={`rounded-xl border bg-white p-3 ${a.ring}`}
                  data-testid={`medical-exam-${exam.id}`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                      <Badge variant="outline" className={`${a.badge} font-normal text-xs`}>
                        {specialtyLabel(exam.caseType)}
                      </Badge>
                      <span className="text-xs font-semibold">{exam.doctorName}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateIraq(exam.signedAt)} — {formatTimeIraq(exam.signedAt)}
                      </span>
                      <span
                        className="text-[10px] text-muted-foreground flex items-center gap-1"
                        title="سجلّ موقّع — لا يُعدّل ولا يُحذف"
                      >
                        <Lock className="w-3 h-3" /> موقّعة
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {canAppend && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => {
                            setAddendumFor(exam);
                            setAddendumBody("");
                          }}
                          data-testid={`button-add-addendum-${exam.id}`}
                        >
                          <FilePlus2 className="w-3.5 h-3.5 ml-1" /> ملحق
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => printExam(exam)}
                        data-testid={`button-print-exam-${exam.id}`}
                      >
                        <Printer className="w-3.5 h-3.5 ml-1" /> طباعة
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {EXAM_FIELDS.map((f) => {
                      const value = (exam as any)[f.key] as string | null;
                      if (!value) return null;
                      return (
                        <div key={f.key} className="text-sm flex gap-2">
                          <span className="text-muted-foreground shrink-0 min-w-[92px]">
                            {f.label}:
                          </span>
                          <span
                            className="whitespace-pre-wrap"
                            dir="auto"
                            style={{ unicodeBidi: "plaintext" }}
                          >
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {exam.addenda.length > 0 && (
                    <div className="mt-3 space-y-2 border-t pt-2">
                      {exam.addenda.map((ad) => (
                        <div
                          key={ad.id}
                          className="text-xs bg-slate-50 border-r-2 border-slate-300 pr-2 py-1.5 rounded"
                        >
                          <div className="flex items-center gap-2 text-muted-foreground mb-0.5">
                            <span className="font-semibold text-slate-700">ملحق</span>
                            <span>{ad.doctorName}</span>
                            <span>
                              {formatDateIraq(ad.signedAt)} — {formatTimeIraq(ad.signedAt)}
                            </span>
                          </div>
                          <p
                            className="whitespace-pre-wrap"
                            dir="auto"
                            style={{ unicodeBidi: "plaintext" }}
                          >
                            {ad.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <NewExamDialog
        patientId={patientId}
        patientName={patientName}
        open={examOpen}
        onOpenChange={setExamOpen}
        preferSpecialty={preferredSpecialty}
        onDone={() => setPreferredSpecialty(null)}
      />

      {/* ── Addendum ───────────────────────────────────────────────────── */}
      <Dialog open={!!addendumFor} onOpenChange={(o) => !o && setAddendumFor(null)}>
        <DialogContent className="sm:max-w-[520px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-primary">إضافة ملحق للمعاينة</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">
              المعاينة الأصلية تبقى كما هي. يُسجَّل الملحق باسمك وتاريخه أسفلها.
            </p>
            <Textarea
              rows={5}
              placeholder="نص التصحيح أو الإضافة"
              value={addendumBody}
              onChange={(e) => setAddendumBody(e.target.value)}
              data-testid="input-addendum-body"
            />
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setAddendumFor(null)}>
              إلغاء
            </Button>
            <Button
              onClick={() => saveAddendum.mutate()}
              disabled={!addendumBody.trim() || saveAddendum.isPending}
              data-testid="button-save-addendum"
            >
              {saveAddendum.isPending ? "جارٍ الحفظ…" : "حفظ الملحق"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
