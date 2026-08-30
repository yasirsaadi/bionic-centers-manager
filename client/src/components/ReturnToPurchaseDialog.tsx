import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { RotateCcw, Stethoscope } from "lucide-react";
import { specialtyLabel } from "@shared/medical";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { formatDateTimeIraq } from "@/lib/utils";

interface EligibleDevice {
  episodeId: number;
  serviceType: "prosthetic" | "medical_support";
  requestedItem: string | null;
  followupId: number;
  closedAt: string | null;
  closedReason: string | null;
  notBoughtReasonText: string | null;
  examDoctorName: string | null;
  examAt: string | null;
}

interface Props {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * **«عاد للشراء»** — مريضٌ عايَنه طبيبٌ لجهازٍ ما، سجّل الاستقبالُ «لم
 * يشترِ»، ثمّ عاد يريد **الجهازَ نفسَه**. لا مريضَ جديداً، ولا حالةً
 * جديدة، ولا حلقةَ جديدة: الحلقةُ نفسُها تعود «بانتظار المعاينة» فتُوقَّع
 * لها معاينةٌ ثانية، والمتابعةُ القديمة تبقى كما هي بتاريخها وسببها.
 *
 * ══ والأهليّةُ من الخادم وحده ═════════════════════════════════════════
 * لا تخمينَ من أعلام المريض ولا من نصٍّ حرّ: `GET
 * .../return-to-purchase-eligible` يُرجع الحلقات المؤهَّلة فعلاً (حلقةٌ
 * `examined` على مسار المعاينة، بآخِرِ متابعةٍ `closed_without_purchase`
 * بعينها، بلا طلبِ مراجعةٍ معلَّقٍ عليها). **وإن وُجدت أكثرُ من حلقة، لا
 * اختيارَ صامتاً للأحدث** — الموظّفُ يختار صراحةً.
 */
export function ReturnToPurchaseDialog({ patientId, serviceType, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<number | null>(null);

  const { data, isLoading } = useQuery<{ rows: EligibleDevice[] }>({
    queryKey: [`/api/followups/patient/${patientId}/return-to-purchase-eligible`],
    queryFn: async () => {
      const res = await fetch(
        `/api/followups/patient/${patientId}/return-to-purchase-eligible`,
        { credentials: "include" },
      );
      if (!res.ok) return { rows: [] };
      return res.json();
    },
    enabled: open,
  });

  const candidates = useMemo(
    () => (data?.rows ?? []).filter((r) => r.serviceType === serviceType),
    [data?.rows, serviceType],
  );

  //  حلقةٌ واحدة ⟶ تُختار تلقائياً للعرض (لا اختيار، عرضٌ وحيد). أكثرُ من
  //  واحدة ⟶ `null` حتى يختار الموظّفُ صراحةً — **لا يُفضَّل الأحدثُ صامتاً**.
  const effectiveSelected = candidates.length === 1 ? candidates[0].episodeId : selected;
  const chosen = candidates.find((c) => c.episodeId === effectiveSelected) ?? null;

  const submit = useMutation({
    mutationFn: async () => {
      if (!chosen) throw new Error("اختر الجهاز أوّلاً");
      const res = await fetch("/api/followups/return-to-purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ patientId, deviceEpisodeId: chosen.episodeId }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "تعذّر إرسال المريض لمعاينةٍ جديدة");
      return body;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
      qc.invalidateQueries({
        queryKey: [`/api/followups/patient/${patientId}/return-to-purchase-eligible`],
      });
      qc.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
      qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      qc.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      setSelected(null);
      onOpenChange(false);
      toast({ title: "تم إرسال المريض لمعاينة طبية جديدة — عاد للشراء" });
    },
    onError: (e: any) =>
      toast({ title: "خطأ", description: e?.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setSelected(null); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-primary" /> عاد للشراء
          </DialogTitle>
          <DialogDescription className="text-xs">
            المريضُ عايَنه طبيبٌ لهذا الجهاز سابقاً ولم يشترِ. اختيارُ الجهاز يعيده
            إلى انتظار معاينةٍ طبية جديدة — <b>بلا أيّ أثرٍ ماليّ</b>.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            لا يوجد جهازٌ مؤهَّلٌ الآن — رُبّما تغيّرت حالتُه للتوّ. أغلق النافذة وحدّث الصفحة.
          </p>
        ) : candidates.length === 1 ? (
          <DeviceCard device={candidates[0]} />
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              أكثرُ من جهازٍ سابق — اختر المقصود بدقّة:
            </p>
            <RadioGroup
              value={effectiveSelected != null ? String(effectiveSelected) : undefined}
              onValueChange={(v) => setSelected(Number(v))}
            >
              {candidates.map((c) => (
                <label
                  key={c.episodeId}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                    effectiveSelected === c.episodeId ? "border-primary bg-primary/5" : "border-muted"
                  }`}
                  data-testid={`return-to-purchase-option-${c.episodeId}`}
                >
                  <RadioGroupItem value={String(c.episodeId)} className="mt-1" />
                  <DeviceCard device={c} compact />
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            size="sm"
            disabled={!chosen || submit.isPending}
            onClick={() => submit.mutate()}
            data-testid="button-confirm-return-to-purchase"
          >
            <Stethoscope className="w-3.5 h-3.5 ml-1" /> إرسال لمعاينة طبية جديدة
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeviceCard({ device, compact = false }: { device: EligibleDevice; compact?: boolean }) {
  return (
    <div className={compact ? "flex-1 text-sm" : "rounded-lg border p-3 text-sm space-y-1"}>
      <div className="font-medium">
        {specialtyLabel(device.serviceType)} — {requestedItemLabel(device.requestedItem, device.serviceType)}
      </div>
      <div className="text-xs text-muted-foreground space-y-0.5">
        {device.examAt && (
          <div>
            آخِرُ معاينةٍ: {formatDateTimeIraq(device.examAt)}
            {device.examDoctorName && ` — ${device.examDoctorName}`}
          </div>
        )}
        {device.closedAt && <div>سُجّل «لم يشترِ»: {formatDateTimeIraq(device.closedAt)}</div>}
        {device.notBoughtReasonText && <div>السبب: {device.notBoughtReasonText}</div>}
      </div>
    </div>
  );
}
