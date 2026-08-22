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
import { Stethoscope, Lock, Plus, Printer, FilePlus2, Clock, Pencil, History, CheckCircle2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
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
import { buildAmputationSite, specsForSpecialty, type InjuryEntry } from "@shared/case_fields";

// Render the signed decision as label/value lines, using the very same field
// definitions the form wrote it with, so nothing can drift out of sync.
function prescriptionLines(exam: Exam): { label: string; value: string }[] {
  const rx = exam.prescription;
  if (!rx || typeof rx !== "object") return [];
  const out: { label: string; value: string }[] = [];

  // The amputation decision leads: it is what defines the limb. Rendered from
  // the same composer that writes the patient column, so the exam shows
  // exactly the string the rest of the app carries.
  if (exam.caseType === "prosthetic" && typeof rx.amputationType === "string" && rx.amputationType) {
    const site = buildAmputationSite(rx);
    if (site) out.push({ label: "موقع البتر", value: site });
  }
  for (const f of specsForSpecialty(exam.caseType)) {
    if (typeof rx[f.key] === "string" && rx[f.key].trim()) out.push({ label: f.label, value: rx[f.key] });
  }
  if (typeof rx.injurySide === "string" && rx.injurySide.trim()) {
    out.push({ label: "جهة الإصابة", value: rx.injurySide });
  }
  if (typeof rx.diseaseType === "string" && rx.diseaseType.trim()) {
    out.push({ label: "التشخيص / نوع المرض", value: rx.diseaseType });
  }
  if (Array.isArray(rx.injuries)) {
    const list = (rx.injuries as InjuryEntry[])
      .filter((i) => i && (i.type || i.area))
      .map((i) => [i.type, i.area, i.side].filter(Boolean).join(" — "));
    if (list.length) out.push({ label: "الإصابات", value: list.join("، ") });
  }
  if (typeof exam.deviceCost === "number") {
    // Proposed, not booked: the amount enters the accounts only when reception
    // confirms it in تخصيص.
    out.push({ label: "الكلفة المقترحة", value: `${exam.deviceCost.toLocaleString("en-US")} د.ع` });
  }
  if (exam.proposedExpertName) {
    out.push({ label: "الخبير المقترح", value: exam.proposedExpertName });
  }
  if (Array.isArray(rx.treatments)) {
    const list = (rx.treatments as any[])
      .filter((t) => t?.treatmentType)
      .map((t) => (t.sessionCount ? `${t.treatmentType} (${t.sessionCount} جلسة)` : t.treatmentType));
    if (list.length) out.push({ label: "العلاج الموصوف", value: list.join("، ") });
  }
  return out;
}

interface Addendum {
  id: number;
  doctorName: string;
  body: string;
  signedAt: string;
}

interface Revision {
  id: number;
  version: number;
  doctorName: string | null;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
  prescription?: Record<string, any> | null;
  deviceCost?: number | null;
  editedByName: string | null;
  editedAt: string;
}

interface Exam {
  id: number;
  caseType: string;
  prescription?: Record<string, any> | null;
  deviceCost?: number | null;
  proposedExpertUserId?: number | null;
  proposedExpertName?: string | null;
  version?: number;
  doctorId?: number | null;
  editedByName?: string | null;
  editedAt?: string | null;
  revisions?: Revision[];
  doctorName: string;
  chiefComplaint: string | null;
  clinicalFindings: string | null;
  diagnosis: string | null;
  plan: string | null;
  notes: string | null;
  signedAt: string;
  addenda: Addendum[];
  /** **يقوله الخادم** — الشاشةُ لا تخمّن مَن يُلغي. */
  canCancel?: boolean;
}

interface ExamsResponse {
  exams: Exam[];
  pending: string[];
  canWriteMedicalExam: boolean;
  specialties: MedicalSpecialty[];
  /** Branch manager / admin — may revise anyone's exam. */
  canManageExams: boolean;
  userId: number | null;
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
  const [editing, setEditing] = useState<Exam | null>(null);
  const [historyOf, setHistoryOf] = useState<Exam | null>(null);
  const [cancelling, setCancelling] = useState<Exam | null>(null);
  const [cancelReason, setCancelReason] = useState("");

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
  // Mirrors the server rule exactly: the doctor who signed it, or the
  // responsible manager. A different doctor files an addendum instead.
  // A specialty is "decided" once a signed exam exists for it. Derived rather
  // than stored: the exam IS the decision, so a second source of truth could
  // only ever drift from it.
  const decided = Array.from(new Set(exams.map((e) => e.caseType)));
  const canEdit = (exam: Exam) =>
    Boolean(data?.canManageExams) ||
    (exam.doctorId != null && data?.userId != null && exam.doctorId === data.userId);

  //  ══ إلغاءُ معاينة — **لا `confirm()` من المتصفّح** ═══════════════════
  //  نافذةٌ حقيقية تشرح ما يقع فعلاً وتطلب سبباً: الموظّفُ يضغط «حذف» وهو
  //  يظنّ أن السجلَّ يُمحى، فالنافذةُ هي المكانُ الوحيد الذي يصحّح فهمَه
  //  قبل الفعل — وسببُه يبقى في السجلّ لمن يقرأ بعد شهر.
  const cancelExam = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/medical/exams/${cancelling?.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر إلغاء المعاينة");
      return res.json();
    },
    onSuccess: () => {
      //  الإلغاءُ يحرّك أكثر من شاشة: السجلّ، وطابورَ الانتظار، وقائمةَ عمل
      //  الطبيب، وحلقةَ الجهاز ومتابعتَها — فتُبطَل كلُّها لا واحدة.
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      setCancelling(null);
      setCancelReason("");
      toast({ title: "أُلغيت المعاينة", description: "بقيت محفوظة في سجل التدقيق." });
    },
    onError: (e: any) =>
      toast({ title: "تعذّر الإلغاء", description: e?.message, variant: "destructive" }),
  });

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

    const rxRows = prescriptionLines(exam)
      .map((l) => `<tr><th>${l.label}</th><td>${l.value}</td></tr>`)
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
${rxRows ? `<h2 style="font-size:15px;margin:22px 0 8px">الوصفة</h2><table>${rxRows}</table>` : ""}
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

        {/* Which specialties the doctor has DECIDED — the positive counterpart to
            the pending badge, so the state reads as "settled" rather than merely
            "no longer nagging", and reception knows it may assign and collect. */}
        {decided.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {decided.map((c) => (
              <Badge
                key={`decided-${c}`}
                variant="outline"
                className="bg-green-100 text-green-800 border-green-200 font-normal text-xs"
                data-testid={`badge-decided-${c}`}
              >
                <CheckCircle2 className="w-3 h-3 ml-1" />
                تم تحديد {specialtyLabel(c)}
              </Badge>
            ))}
          </div>
        )}

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
                        title="سجلّ موقّع — كل نسخة سابقة محفوظة"
                      >
                        <Lock className="w-3 h-3" /> موقّعة
                      </span>
                      {(exam.version ?? 1) > 1 && (
                        <button
                          type="button"
                          onClick={() => setHistoryOf(exam)}
                          className="text-[10px] text-amber-800 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 flex items-center gap-1 hover:bg-amber-200"
                          title="عرض النسخ السابقة"
                          data-testid={`button-exam-history-${exam.id}`}
                        >
                          <History className="w-3 h-3" />
                          النسخة {exam.version}
                          {exam.editedByName ? ` — عدّلها ${exam.editedByName}` : ""}
                        </button>
                      )}
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
                      {canEdit(exam) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => setEditing(exam)}
                          data-testid={`button-edit-exam-${exam.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5 ml-1" /> تعديل
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
                      {/*  **«حذف» في الشاشة = إلغاءٌ مؤرشف في القاعدة.**
                          الموظّفُ يفهم «حذف»، والنظامُ لا يمحو شيئاً: صفُّ
                          إلغاءٍ يُضاف فتخرج المعاينةُ من السجلّ الفعّال
                          ويبقى الأصلُ وتوقيعُه وملاحقُه كما هي. ولا يظهر
                          الزرُّ إلّا حين يقول الخادمُ إن هذا المستخدم يملكه. */}
                      {exam.canCancel && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => { setCancelling(exam); setCancelReason(""); }}
                          data-testid={`button-cancel-exam-${exam.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 ml-1" /> حذف
                        </Button>
                      )}
                    </div>
                  </div>

                  {prescriptionLines(exam).length > 0 && (
                    <div className="mb-2 rounded-lg border border-teal-200 bg-teal-50/60 p-2 space-y-1">
                      <div className="text-[11px] font-bold text-teal-900">الوصفة</div>
                      {prescriptionLines(exam).map((l) => (
                        <div key={l.label} className="text-xs flex gap-2">
                          <span className="text-muted-foreground shrink-0 min-w-[92px]">{l.label}:</span>
                          <span dir="auto" style={{ unicodeBidi: "plaintext" }}>{l.value}</span>
                        </div>
                      ))}
                    </div>
                  )}

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

      {/* Same dialog, revising instead of signing. Keyed by exam id so switching
          between two exams re-hydrates the form instead of reusing stale state. */}
      {editing && (
        <NewExamDialog
          key={`edit-${editing.id}`}
          patientId={patientId}
          patientName={patientName}
          open={!!editing}
          onOpenChange={(o) => !o && setEditing(null)}
          exam={editing}
          onDone={() => setEditing(null)}
        />
      )}

      {/* ── Version history ────────────────────────────────────────────── */}
      <Dialog open={!!historyOf} onOpenChange={(o) => !o && setHistoryOf(null)}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-primary flex items-center gap-2">
              <History className="w-5 h-5" /> النسخ السابقة للمعاينة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 mt-2">
            <p className="text-xs text-muted-foreground">
              كل تعديل يحفظ النصّ الذي كان قبله. لا شيء يُمحى.
            </p>

            {(historyOf?.revisions ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد نسخ سابقة.</p>
            ) : (
              (historyOf?.revisions ?? [])
                .slice()
                .sort((a, b) => b.version - a.version)
                .map((rev) => (
                  <div key={rev.id} className="rounded-xl border bg-slate-50 p-3 text-sm">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span className="font-bold text-slate-700">النسخة {rev.version}</span>
                      <span>كتبها {rev.doctorName ?? "—"}</span>
                      <span>
                        استُبدلت في {formatDateIraq(rev.editedAt)} — {formatTimeIraq(rev.editedAt)}
                      </span>
                      {rev.editedByName && <span>بواسطة {rev.editedByName}</span>}
                    </div>
                    <div className="space-y-1">
                      {EXAM_FIELDS.map((f) => {
                        const value = (rev as any)[f.key] as string | null;
                        if (!value) return null;
                        return (
                          <div key={f.key} className="flex gap-2">
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
                      {rev.deviceCost != null && (
                        <div className="flex gap-2">
                          <span className="text-muted-foreground shrink-0 min-w-[92px]">الكلفة:</span>
                          <span>{rev.deviceCost.toLocaleString("en-US")} د.ع</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setHistoryOf(null)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* ══ إلغاءُ معاينة — العنوانُ يقول ما يقع، لا ما يظنّه الضاغط ══════ */}
      <Dialog
        open={!!cancelling}
        onOpenChange={(o) => { if (!o) { setCancelling(null); setCancelReason(""); } }}
      >
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-destructive">إلغاء المعاينة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <p className="text-sm">
              ستختفي المعاينة من السجل الفعّال، لكنها ستبقى محفوظة في سجل التدقيق.
            </p>
            {cancelling && (
              <p className="text-xs text-muted-foreground">
                {specialtyLabel(cancelling.caseType)} — د. {cancelling.doctorName} ·{" "}
                {formatDateIraq(cancelling.signedAt)}
              </p>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm">
                سبب الإلغاء <span className="text-destructive">*</span>
              </Label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="مثال: أُدخلت للمريض الخطأ"
                data-testid="input-cancel-reason"
              />
              <p className="text-[11px] text-muted-foreground">
                أمثلة: أُدخلت للمريض الخطأ · الاختصاص غير صحيح · بيانات المعاينة
                غير صحيحة ويجب إعادة كتابتها.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => { setCancelling(null); setCancelReason(""); }}
            >
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelExam.mutate()}
              disabled={!cancelReason.trim() || cancelExam.isPending}
              data-testid="button-confirm-cancel-exam"
            >
              {cancelExam.isPending ? "جارٍ الإلغاء…" : "إلغاء المعاينة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
