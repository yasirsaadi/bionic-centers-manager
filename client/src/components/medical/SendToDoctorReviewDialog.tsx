import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Zap, Stethoscope } from "lucide-react";
import { specialtyLabel } from "@shared/medical";
import {
  REVIEW_KINDS, REVIEW_KIND_LABELS, REVIEW_PATH_HINTS, REVIEW_PATH_LABELS,
  REVIEW_STATUS_LABELS, type ReviewKind, type ReviewPath,
} from "@shared/medical_review";
import { formatDateTimeIraq } from "@/lib/utils";

interface Props {
  patientId: number;
  /** ما يملكه المريض فعلاً — الزرّ لا يظهر أصلاً لمن لا يملك أيّهما. */
  services: ("prosthetic" | "medical_support")[];
}

interface ReviewRow {
  id: number; serviceType: string; requestedPath: ReviewPath; reviewKind: ReviewKind;
  status: string; createdAt: string; decidedAt: string | null;
  doctorNote: string | null; decidedByName: string | null; createdByName: string | null;
}

/**
 * إرسالُ حالةِ أطرافٍ أو مساندَ إلى مراجعة الطبيب — **من الاستقبال**.
 *
 * ══ ولماذا الاستقبال هو المصنِّف ═══════════════════════════════════════
 * لأنه الحاضر لحظة وصول المريض، ولأن انتظارَ الخبير ليصنّف كان يعني ألّا
 * يُصنَّف أحد. وإن شكّ الموظّف سأل الخبير **خارج المسار** ثم اختار — فالسؤال
 * محادثةٌ لا خطوةٌ في النظام.
 *
 * والاختيار بين بابين لا أكثر: خفيفٌ لما لا قرار سريريّ فيه، وكاملٌ لما فيه.
 * والطبيب يبقى صاحب الكلمة الأخيرة: يوافق، أو يطلب معاينةً كاملة، أو يعيد.
 */
export function SendToDoctorReviewDialog({ patientId, services }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [serviceType, setServiceType] = useState<string>(services[0] ?? "prosthetic");
  const [path, setPath] = useState<ReviewPath>("quick");
  const [kind, setKind] = useState<ReviewKind>("maintenance");
  const [note, setNote] = useState("");

  const { data: history = [] } = useQuery<ReviewRow[]>({
    queryKey: ["/api/medical-review/patients", patientId, "requests"],
    queryFn: async () => {
      const res = await fetch(`/api/medical-review/patients/${patientId}/requests`, {
        credentials: "include",
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open,
  });

  const send = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/medical-review/requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId, serviceType, requestedPath: path, reviewKind: kind,
          receptionNote: note.trim() || null,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إرسال الطلب");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/medical-review/patients", patientId, "requests"] });
      qc.invalidateQueries({ queryKey: ["/api/medical-review/queue"] });
      setNote("");
      setOpen(false);
      toast({ title: "أُرسل إلى مراجعة الطبيب" });
    },
    onError: (e: any) =>
      toast({ title: "خطأ", description: e?.message, variant: "destructive" }),
  });

  if (services.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" data-testid="button-send-doctor-review">
          <ClipboardCheck className="w-4 h-4" /> إرسال لمراجعة الطبيب
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>إرسال لمراجعة الطبيب</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {services.length > 1 && (
            <div>
              <Label className="text-xs">الخدمة</Label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger data-testid="select-review-service"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {services.map((sp) => (
                    <SelectItem key={sp} value={sp}>{specialtyLabel(sp)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* المساران — بطاقتان لا قائمة، فالفرق بينهما قرارٌ يُقرأ لا خيارٌ يُنقر */}
          <div className="grid grid-cols-2 gap-2">
            {(["quick", "full"] as ReviewPath[]).map((p) => (
              <button
                key={p} type="button" onClick={() => setPath(p)}
                data-testid={`review-path-${p}`}
                className={`text-right rounded-lg border p-3 transition ${
                  path === p ? "border-primary bg-primary/5" : "border-muted hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-sm">
                  {p === "quick" ? <Zap className="w-4 h-4" /> : <Stethoscope className="w-4 h-4" />}
                  {REVIEW_PATH_LABELS[p]}
                </div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                  {REVIEW_PATH_HINTS[p]}
                </div>
              </button>
            ))}
          </div>

          <div>
            <Label className="text-xs">سبب الزيارة</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReviewKind)}>
              <SelectTrigger data-testid="select-review-kind"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REVIEW_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{REVIEW_KIND_LABELS[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">ملاحظة للطبيب (اختيارية)</Label>
            <Textarea
              value={note} onChange={(e) => setNote(e.target.value)} rows={3}
              placeholder="ما يفيد الطبيب في قراره — شكوى المريض، ما لاحظه الموظّف…"
              data-testid="input-review-note"
            />
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            إن لم تكن متأكّداً من التصنيف، اسأل خبير الأطراف قبل الإرسال — ثم اختر.
            والطبيب يبقى صاحب القرار: يوافق، أو يطلب معاينة كاملة، أو يعيد الطلب إليك.
          </p>

          <Button
            className="w-full" disabled={send.isPending}
            onClick={() => send.mutate()} data-testid="button-submit-review"
          >
            إرسال
          </Button>

          {history.length > 0 && (
            <div className="border-t pt-3 space-y-1.5">
              <div className="text-xs font-medium">الطلبات السابقة</div>
              {history.slice(0, 5).map((h) => (
                <div key={h.id} className="text-[11px] text-muted-foreground flex flex-wrap gap-x-2">
                  <span>{formatDateTimeIraq(h.createdAt)}</span>
                  <span>· {specialtyLabel(h.serviceType)}</span>
                  <span>· {REVIEW_KIND_LABELS[h.reviewKind]}</span>
                  <span className="font-medium text-foreground">
                    · {REVIEW_STATUS_LABELS[h.status as keyof typeof REVIEW_STATUS_LABELS] ?? h.status}
                  </span>
                  {h.doctorNote && <span>— {h.doctorNote}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
