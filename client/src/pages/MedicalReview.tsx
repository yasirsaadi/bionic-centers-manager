import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ClipboardCheck, Eye, CheckCircle2, Stethoscope, Undo2, Clock, Building2,
} from "lucide-react";
import { formatDateTimeIraq } from "@/lib/utils";
import { SPECIALTY_COLORS, isMedicalSpecialty, specialtyLabel, sortBySpecialty } from "@shared/medical";
import {
  REVIEW_KIND_LABELS, REVIEW_PATH_LABELS,
  type ReviewDecision, type ReviewKind, type ReviewPath,
} from "@shared/medical_review";

interface ReviewCard {
  id: number;
  patientId: number;
  serviceType: string;
  patientName: string;
  patientCode: string | null;
  patientPhone: string | null;
  branchId: number | null;
  branchName: string | null;
  patientClassification: string | null;
  requestedPath: ReviewPath;
  reviewKind: ReviewKind;
  receptionNote: string | null;
  createdByName: string | null;
  createdAt: string;
  caseDetails: Record<string, any> | null;
  episode: { id: number; sequenceNumber: number; status: string } | null;
  workOrder: {
    id: number; purpose: string; status: string; currentStage: string;
    expertUserId: number | null; expertName: string | null;
  } | null;
  visit: { id: number; visitDate: string | null; notes: string | null } | null;
  lastExam: {
    id: number; doctorName: string; createdAt: string;
    diagnosis: string | null; plan: string | null;
  } | null;
}

function accent(caseType: string) {
  return isMedicalSpecialty(caseType)
    ? SPECIALTY_COLORS[caseType]
    : { badge: "bg-slate-100 text-slate-700 border-slate-200", dot: "bg-slate-400", ring: "border-slate-200" };
}

/** سطرُ حقيقةٍ واحد — يُحذف كلّه حين لا قيمة، فلا يقرأ الطبيب فراغات. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-1.5 text-xs">
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

/**
 * طابورُ مراجعة الطبيب — الأطراف والمساند وحدهما.
 *
 * ══ لماذا شاشةٌ ثانية بجانب «معايناتي» ═══════════════════════════════════
 * «معايناتي» طابورُ **السجلّ السريري الموقّع**: فعلٌ ثقيل يُكتب مرّةً ولا
 * يُمحى. وهذا طابورُ **قرارٍ خفيف**: صيانةٌ روتينية، تعديلٌ صغير، مريضٌ عائد
 * مستقرّ. وخلطُهما كان سيدفع الطبيب إمّا إلى توقيع سجلّاتٍ فارغة، وإمّا —
 * وهو ما كان يحدث فعلاً — إلى ألّا يرى هؤلاء المرضى إطلاقاً.
 *
 * والبطاقة تحمل ما يكفي للقرار في مكانه: مَن المريض، ورمزُه، وفرعُه، وسببُ
 * زيارته، وجهازُه، وآخرُ ما وقّعه طبيبٌ له. فلا يفتح الطبيب أربع صفحاتٍ
 * ليوافق على تبديل حزام.
 */
export default function MedicalReview() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [only, setOnly] = useState<string | null>(null);
  const [openNote, setOpenNote] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const { data, isLoading } = useQuery<{
    rows: ReviewCard[]; specialties: string[]; canDecide: boolean;
  }>({
    queryKey: ["/api/medical-review/queue"],
    queryFn: async () => {
      const res = await fetch("/api/medical-review/queue", { credentials: "include" });
      if (!res.ok) return { rows: [], specialties: [], canDecide: false };
      return res.json();
    },
  });

  const rows = data?.rows ?? [];
  const canDecide = data?.canDecide === true;
  const specialties = useMemo(
    () => sortBySpecialty(data?.specialties ?? [], (s) => s),
    [data?.specialties],
  );

  const filtered = useMemo(
    () => sortBySpecialty(
      rows.filter((r) => (only ? r.serviceType === only : true)),
      (r) => r.serviceType,
    ),
    [rows, only],
  );

  const decide = useMutation({
    mutationFn: async (v: { id: number; decision: ReviewDecision; doctorNote?: string }) => {
      const res = await fetch(`/api/medical-review/requests/${v.id}/decide`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ decision: v.decision, doctorNote: v.doctorNote ?? null }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر حفظ القرار");
      return body;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      //  الإحالة تُدخل الملفّ طابورَ المعاينة القائم، فتُحدَّث شاشاته أيضاً.
      qc.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      setOpenNote(null);
      setNote("");
      toast({
        title: v.decision === "approve" ? "تمت الموافقة"
          : v.decision === "require_full_exam" ? "أُحيل إلى معاينة كاملة"
            : "أُعيد إلى الاستقبال",
      });
    },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message, variant: "destructive" }),
  });

  const act = (id: number, decision: ReviewDecision) =>
    decide.mutate({ id, decision, doctorNote: openNote === id ? note.trim() || undefined : undefined });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto" dir="rtl">
      <div className="mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-primary" /> مراجعة الطبيب
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          طلبات الأطراف الصناعية والمساند الطبية التي أرسلها الاستقبال — الأقدم أولاً.
        </p>
      </div>

      {specialties.length > 1 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Button
            size="sm" variant={only === null ? "default" : "outline"} className="h-8 text-xs"
            onClick={() => setOnly(null)} data-testid="filter-review-all"
          >
            الكل ({rows.length})
          </Button>
          {specialties.map((sp) => (
            <Button
              key={sp} size="sm" variant={only === sp ? "default" : "outline"}
              className="h-8 text-xs gap-1.5"
              onClick={() => setOnly(only === sp ? null : sp)}
              data-testid={`filter-review-${sp}`}
            >
              <span className={`w-2 h-2 rounded-full ${accent(sp).dot}`} />
              {specialtyLabel(sp)} ({rows.filter((r) => r.serviceType === sp).length})
            </Button>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
          لا توجد طلبات مراجعة بانتظارك.
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const a = accent(r.serviceType);
            const d = r.caseDetails ?? {};
            return (
              <Card key={r.id} className={`border ${a.ring}`} data-testid={`review-card-${r.id}`}>
                <CardContent className="p-4 space-y-3">
                  {/* الهوية */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <Link href={`/patients/${r.patientId}`}>
                        <span className="font-bold text-sm hover:underline cursor-pointer">
                          {r.patientName}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-[11px] text-muted-foreground">
                        {r.patientCode && <span className="font-mono">{r.patientCode}</span>}
                        {r.branchName && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />{r.branchName}
                          </span>
                        )}
                        {r.patientClassification === "past" && <span>مريض قديم</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />{formatDateTimeIraq(r.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[11px] px-2 py-0.5 rounded border ${a.badge}`}>
                        {specialtyLabel(r.serviceType)}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded border bg-amber-50 text-amber-800 border-amber-200">
                        {REVIEW_PATH_LABELS[r.requestedPath]}
                      </span>
                    </div>
                  </div>

                  {/* السياق — كلُّ سطرٍ يختفي حين لا قيمة له */}
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 border-t pt-2">
                    <Fact label="سبب الزيارة" value={REVIEW_KIND_LABELS[r.reviewKind]} />
                    <Fact label="أرسله" value={r.createdByName} />
                    <Fact label="ملاحظة الاستقبال" value={r.receptionNote} />
                    <Fact label="الهاتف" value={r.patientPhone} />
                    <Fact
                      label="الجهاز"
                      value={d.prostheticType ?? d.supportType ?? d.amputationSite ?? null}
                    />
                    {r.episode && (
                      <Fact label="الجهاز الحالي" value={`#${r.episode.sequenceNumber} — ${r.episode.status}`} />
                    )}
                    {r.workOrder && (
                      <Fact
                        label={r.workOrder.purpose === "maintenance" ? "أمر صيانة" : "أمر تصنيع"}
                        value={`#${r.workOrder.id} · ${r.workOrder.currentStage}`
                          + (r.workOrder.expertName ? ` · ${r.workOrder.expertName}` : "")}
                      />
                    )}
                    {r.visit && (
                      <Fact
                        label="الزيارة"
                        value={`${r.visit.visitDate ? formatDateTimeIraq(r.visit.visitDate) : ""}`
                          + (r.visit.notes ? ` — ${r.visit.notes}` : "")}
                      />
                    )}
                  </div>

                  {/* آخر معاينة موقّعة — سياقٌ لا قيد */}
                  {r.lastExam && (
                    <div className="border-t pt-2 text-xs bg-muted/40 rounded p-2">
                      <div className="flex items-center gap-1.5 font-medium mb-1">
                        <Stethoscope className="w-3.5 h-3.5" />
                        آخر معاينة — د. {r.lastExam.doctorName} · {formatDateTimeIraq(r.lastExam.createdAt)}
                      </div>
                      {r.lastExam.diagnosis && <div>التشخيص: {r.lastExam.diagnosis}</div>}
                      {r.lastExam.plan && <div>الخطة: {r.lastExam.plan}</div>}
                    </div>
                  )}

                  {/* القرار */}
                  {canDecide ? (
                    <div className="border-t pt-3 space-y-2">
                      {openNote === r.id && (
                        <Textarea
                          value={note} onChange={(e) => setNote(e.target.value)}
                          placeholder="ملاحظة الطبيب (اختيارية)" rows={2} className="text-xs"
                          data-testid={`review-note-${r.id}`}
                        />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm" className="h-8 text-xs gap-1.5" disabled={decide.isPending}
                          onClick={() => act(r.id, "approve")}
                          data-testid={`review-approve-${r.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> موافقة
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                          disabled={decide.isPending}
                          onClick={() => act(r.id, "require_full_exam")}
                          data-testid={`review-escalate-${r.id}`}
                        >
                          <Stethoscope className="w-3.5 h-3.5" /> يتطلّب معاينة كاملة
                        </Button>
                        <Button
                          size="sm" variant="outline" className="h-8 text-xs gap-1.5"
                          disabled={decide.isPending}
                          onClick={() => act(r.id, "return_to_reception")}
                          data-testid={`review-return-${r.id}`}
                        >
                          <Undo2 className="w-3.5 h-3.5" /> إعادة إلى الاستقبال
                        </Button>
                        <Button
                          size="sm" variant="ghost" className="h-8 text-xs"
                          onClick={() => { setOpenNote(openNote === r.id ? null : r.id); setNote(""); }}
                        >
                          {openNote === r.id ? "إخفاء الملاحظة" : "إضافة ملاحظة"}
                        </Button>
                        <Link href={`/patients/${r.patientId}`}>
                          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5">
                            <Eye className="w-3.5 h-3.5" /> الملفّ
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t pt-2 text-[11px] text-muted-foreground">
                      القرار الطبي لطبيب مخوَّل — يمكنك قراءة الطلب فقط.
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
