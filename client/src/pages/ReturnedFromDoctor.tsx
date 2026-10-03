// **«المُرجَعون من الطبيب»** (§4.ar — تكملةُ البند ١٨، طلبُ المالك ٢٠٢٦-٠٩-٣٠).
//
// الطبيبُ يُرجِع طلباً للاستعلامات بسببٍ مكتوب، فيخرج من «معايناتي». وكان لا
// يدخل قائمةً عند الاستعلامات — فلا يعرف الموظّفُ به إلّا إن فتح ملفَّ المريض
// صدفةً. هنا يُقرأ في أيّ وقت بعددٍ أحمر على القائمة، حتى يُعاد إرسالُه أو
// يُعايَن أو يُلغى طلبُه.
//
// **قراءةٌ محضة، والأفعالُ أبوابُها القائمة**: «فتح الملف» صفحةُ المريض،
// و«إعادة إرسال» نافذةُ الإرسال نفسُها مملوءةً بالطلب، و«كتابة معاينة» نافذةُ
// المعاينة نفسُها، و«إلغاء المعاينة» بالكتابة القانونية نفسِها — لا بابَ كتابةٍ
// جديد. (والأخيرُ هنا لأن المُرجَعَ خرج من «معايناتي» بالبند ١٨، فلولاه لفقد
// الطبيبُ زرَّ سحبِ طلبٍ لا لزوم له. ونقطتُه `close-returned` لأن نقطةَ
// «معايناتي» لا تجد ما تسحبه حين لا حلقةَ تنتظر.)

import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Undo2, ExternalLink, Stethoscope, XCircle } from "lucide-react";
import { useBranchSession } from "@/components/BranchGate";
import { SendToDoctorReviewDialog } from "@/components/medical/SendToDoctorReviewDialog";
import { NewExamDialog } from "@/components/medical/NewExamDialog";
import { formatDateTimeIraq } from "@/lib/utils";
import { specialtyLabel } from "@shared/medical";
import {
  canCreateReview, canDecideReview, REVIEW_KIND_LABELS, RETURNED_FROM_DOCTOR_TITLE,
  type ReviewKind, type ReviewPath,
} from "@shared/medical_review";

interface Row {
  requestId: number;
  patientId: number;
  patientName: string;
  patientCode: string | null;
  serviceType: "prosthetic" | "medical_support";
  requestedPath: ReviewPath;
  reviewKind: ReviewKind;
  deviceEpisodeId: number | null;
  episodeSequence: number | null;
  episodeAwaiting: boolean;
  doctorNote: string | null;
  decidedAt: string | null;
  decidedByName: string | null;
  branchName: string | null;
}

export default function ReturnedFromDoctor() {
  const branchSession = useBranchSession();
  const mayResend = canCreateReview(branchSession as any);
  const mayExam = canDecideReview(branchSession as any);
  const [examFor, setExamFor] = useState<Row | null>(null);
  const { toast } = useToast();
  const [cancelling, setCancelling] = useState<Row | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);

  const submitCancel = async () => {
    const row = cancelling;
    const reason = cancelReason.trim();
    if (!row || !reason) return;
    setCancelBusy(true);
    try {
      const res = await fetch(`/api/medical-review/requests/${row.requestId}/close-returned`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إلغاء طلب المعاينة");
      setCancelling(null);
      setCancelReason("");
      toast({ title: "أُلغي طلب المعاينة", description: "خرج من القائمة — ويبقى في سجل المرضى كما هو." });
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message, variant: "destructive" });
    } finally {
      setCancelBusy(false);
    }
  };

  const { data, isLoading, isError } = useQuery<{ rows: Row[]; examSpecialties?: string[] }>({
    queryKey: ["/api/medical-review/returned"],
    queryFn: async () => {
      const res = await fetch("/api/medical-review/returned", { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل المُرجَعين");
      return res.json();
    },
  });
  const rows = data?.rows ?? [];

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <div className="flex items-center gap-2">
        <Undo2 className="w-5 h-5 text-red-600" />
        <h1 className="text-xl font-bold">{RETURNED_FROM_DOCTOR_TITLE}</h1>
        {rows.length > 0 && (
          <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            {rows.length}
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        مرضى أرجعهم الطبيب للاستعلامات مع سبب الإرجاع. صحّح ما طلبه ثم أعد الإرسال — ويخرج المريض من هذه القائمة
        حين يُعاد إرساله أو يُعايَن أو يُلغى طلبه.
      </p>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" />
        </div>
      ) : isError ? (
        <p className="text-sm text-red-600">تعذّر تحميل القائمة — حدّث الصفحة.</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          لا يوجد مرضى مُرجَعون من الطبيب.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.requestId} data-testid={`returned-row-${r.requestId}`}>
              <CardContent className="p-4 space-y-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.patientName}</span>
                  {r.patientCode && <span className="text-xs text-muted-foreground">{r.patientCode}</span>}
                  <span className="text-xs rounded bg-muted px-1.5 py-0.5">{specialtyLabel(r.serviceType)}</span>
                  {r.episodeSequence != null && (
                    <span className="text-xs text-muted-foreground">جهاز #{r.episodeSequence}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {REVIEW_KIND_LABELS[r.reviewKind] ?? r.reviewKind}
                  </span>
                  {r.branchName && <span className="text-xs text-muted-foreground">· {r.branchName}</span>}
                </div>
                <div className="text-sm rounded border border-red-200 bg-red-50 text-red-800 px-3 py-2 leading-relaxed"
                  style={{ unicodeBidi: "plaintext" }}>
                  <span className="font-medium">سبب الإرجاع: </span>{r.doctorNote ?? "—"}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  أرجعه {r.decidedByName ?? "—"}{r.decidedAt ? ` · ${formatDateTimeIraq(r.decidedAt)}` : ""}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link href={`/patients/${r.patientId}`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="w-4 h-4" /> فتح الملف
                    </Button>
                  </Link>
                  {mayResend && (
                    <SendToDoctorReviewDialog
                      patientId={r.patientId}
                      services={[r.serviceType]}
                      triggerLabel="إعادة إرسال للطبيب"
                      resend={{
                        serviceType: r.serviceType, requestedPath: r.requestedPath,
                        reviewKind: r.reviewKind, deviceEpisodeId: r.deviceEpisodeId,
                      }}
                    />
                  )}
                  {mayExam && (data?.examSpecialties ?? []).includes(r.serviceType) && (
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setExamFor(r)}>
                      <Stethoscope className="w-4 h-4" /> كتابة معاينة
                    </Button>
                  )}
                  {mayExam && (data?.examSpecialties ?? []).includes(r.serviceType) && (
                    <Button variant="outline" size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      onClick={() => { setCancelling(r); setCancelReason(""); }}>
                      <XCircle className="w-4 h-4" /> إلغاء المعاينة
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!cancelling} onOpenChange={(o) => { if (!o) { setCancelling(null); setCancelReason(""); } }}>
        <DialogContent dir="rtl" className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>إلغاء طلب المعاينة</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {cancelling?.patientName} — {cancelling ? specialtyLabel(cancelling.serviceType) : ""}.
            يُسحب الطلب ويخرج من القائمة، ويبقى الملف في سجل المرضى كما هو.
          </p>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={3}
            placeholder="سبب الإلغاء (إلزامي)" />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCancelling(null); setCancelReason(""); }}>تراجع</Button>
            <Button variant="destructive" disabled={cancelBusy || !cancelReason.trim()} onClick={submitCancel}>
              إلغاء الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {examFor && (
        <NewExamDialog
          key={examFor.requestId}
          patientId={examFor.patientId}
          patientName={examFor.patientName}
          preferSpecialty={examFor.serviceType}
          //  الجهازُ بعينه حين ينتظر معاينته — وإلّا تختار النافذةُ كعادتها.
          deviceEpisodeId={examFor.episodeAwaiting ? examFor.deviceEpisodeId : null}
          open={!!examFor}
          onOpenChange={(o) => !o && setExamFor(null)}
          onDone={() => setExamFor(null)}
        />
      )}
    </div>
  );
}
