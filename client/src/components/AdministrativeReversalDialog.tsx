import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  REVERSAL_MODE_LABELS, REVERSAL_MODE_HINTS, REVERSAL_REASON_CODES,
  REVERSAL_REASON_LABELS, type ReversalMode, type ReversalPreview,
} from "@shared/administrative_reversal";

// **تصحيح / إلغاء العملية** — نافذةٌ واحدة تفتحها الشاشاتُ الثلاث.
//
// ══ لماذا نافذةٌ واحدة ═════════════════════════════════════════════════
// الخطأُ يُرى من ثلاثة أماكن: بطاقةُ المعاينة، وبطاقةُ قرار ما بعد المعاينة،
// وبطاقةُ التصنيع النشط. **ولا ثلاثةَ تنفيذات**: ثلاثةٌ تنحرف، فتُلغي إحداها
// ما لا تُلغيه الأخرى. فالنافذةُ واحدةٌ تُفتَح بالهويّة نفسِها.
//
// ══ وليست «حذفاً» ══════════════════════════════════════════════════════
// العنوانُ يقول «تصحيح / إلغاء العملية» لا «حذف»: **لا يُمحى شيء**. تُعكَس
// الآثارُ بقيودٍ معاكسة، وتبقى المعاينةُ والدفعةُ وسجلُّ التصنيع والتسليم
// مقروءةً في التاريخ.
//
// ══ والأثرُ يُقرأ من الخادم لا يُستنتَج هنا ════════════════════════════
// قاعدتان للأثر — واحدةٌ تُعرَض وأخرى تُنفَّذ — تنحرفان يوماً، فتَعِد الشاشةُ
// بما لا يفعله الخادم. فالخادمُ يقول ماذا سيتغيّر، وهذه تعرضه حرفياً.

export interface ReversalTarget {
  followupId?: number | null;
  workOrderId?: number | null;
  episodeId?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReversalTarget;
  patientId: number;
}

export function AdministrativeReversalDialog({
  open, onOpenChange, target, patientId,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ReversalMode | "">("");
  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonNote, setReasonNote] = useState("");

  //  ولا مسوّدةٌ تتسرّب إلى عمليةٍ أخرى: سببُ أمسٍ ليس سببَ اليوم.
  useEffect(() => {
    if (!open) return;
    setMode(""); setReasonCode(""); setReasonNote("");
  }, [open, target.followupId, target.workOrderId, target.episodeId]);

  const key = JSON.stringify(target);
  const { data: preview, isLoading, error } = useQuery<ReversalPreview>({
    queryKey: ["/api/admin/operation-reversal/preview", key],
    enabled: open,
    //  **بلا تخزينٍ مؤقّت**: الأثرُ لقطةٌ تشيخ، وعرضُ لقطةٍ قديمة يجعل
    //  الموظّفَ يؤكّد ما لم يعد قائماً — ويردّه الخادمُ بختمٍ بائت.
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const res = await fetch("/api/admin/operation-reversal/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(target),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر قراءة أثر التصحيح");
      return res.json();
    },
  });

  //  وضعٌ واحدٌ متاح ⟶ يُختار تلقائياً، فلا يُسأل الموظّف سؤالاً بلا خيار.
  useEffect(() => {
    const modes = preview?.availableModes ?? [];
    if (modes.length === 1 && !mode) setMode(modes[0]);
  }, [preview, mode]);

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/operation-reversal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...target, mode, reasonCode, reasonNote: reasonNote.trim(),
          stateStamp: preview?.stateStamp,
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر تنفيذ التصحيح");
      return res.json();
    },
    onSuccess: (out: any) => {
      toast({
        title: mode === "purchase_only"
          ? "تم التراجع عن الشراء" : "تم إلغاء العملية إدارياً",
        description: out?.requiresFinancialSettlement
          ? "الدفعة المسجلة لم تُحذف — للمريض رصيد يحتاج تسوية مالية."
          : "عادت الحالة الصحيحة، وبقيت جميع السجلات في التاريخ.",
      });
      //  كلُّ قارئٍ يجب أن يتّفق فوراً: الملفُّ والحلقاتُ والمتابعةُ
      //  والتصنيعُ وطوابيرُ الطبيب والمال.
      for (const k of [
        [`/api/patients/${patientId}`], ["/api/patients"], ["/api/patients/registry"],
        [`/api/patients/${patientId}/device-episodes`],
        [`/api/followups/patient/${patientId}`],
        [`/api/medical/patients/${patientId}/exams`],
        ["/api/medical/pending"], ["/api/medical/worklist"],
        ["/api/manufacturing/orders"], ["/api/manufacturing/overview"],
        ["/api/patients/:id", patientId, "cases"],
      ]) queryClient.invalidateQueries({ queryKey: k as any });
      onOpenChange(false);
    },
    onError: (e: any) => toast({
      title: "تعذّر التصحيح", description: e?.message, variant: "destructive",
    }),
  });

  const lines = mode && preview ? preview.impact[mode] ?? [] : [];
  const canRun = Boolean(mode) && Boolean(reasonCode) && reasonNote.trim().length > 0
    && !run.isPending && !preview?.alreadyReversed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="h-5 w-5" />
            تصحيح / إلغاء العملية
          </DialogTitle>
          <DialogDescription className="text-right">
            لا يُحذف شيء من السجل. تُعكَس آثار العملية الخاطئة وتبقى جميع
            السجلات مقروءة في التاريخ، مع تسجيل من صحّح ومتى ولماذا.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">جارٍ قراءة أثر التصحيح…</p>}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(error as any)?.message}
          </p>
        )}

        {preview?.alreadyReversed && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            data-testid="text-already-reversed">
            هذه العملية ملغاة إدارياً بالفعل.
          </p>
        )}

        {preview && !preview.alreadyReversed && (
          <div className="space-y-4">
            {/* ما هي العمليةُ المقصودة — فلا يُصحَّح غيرُ المقصود. */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1"
              data-testid="box-operation-summary">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة الآن:</span>
                <b>{preview.currentStatusText}</b>
              </div>
              {preview.requestedItemLabel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المطلوب:</span>
                  <b>{preview.requestedItemLabel}</b>
                </div>
              )}
              {preview.workOrderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">أمر التصنيع:</span>
                  <b>#{preview.workOrderId}</b>
                </div>
              )}
              {preview.saleAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الكلفة المسجلة:</span>
                  <b>{preview.saleAmount.toLocaleString("en-US")} د.ع</b>
                </div>
              )}
            </div>

            {/* ① ما الخطأ؟ */}
            <div className="space-y-2">
              <Label className="font-semibold">ما الخطأ الذي وقع؟ *</Label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger data-testid="select-reversal-reason">
                  <SelectValue placeholder="اختر سبب التصحيح" />
                </SelectTrigger>
                <SelectContent>
                  {REVERSAL_REASON_CODES.map((c) => (
                    <SelectItem key={c} value={c}>{REVERSAL_REASON_LABELS[c]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ② أيُّ تصحيح؟ */}
            <div className="space-y-2">
              <Label className="font-semibold">نوع التصحيح *</Label>
              <div className="space-y-2">
                {preview.availableModes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    data-testid={`option-mode-${m}`}
                    className={`w-full rounded-lg border p-3 text-right transition ${
                      mode === m ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="font-semibold">{REVERSAL_MODE_LABELS[m]}</div>
                    <div className="text-xs text-muted-foreground">{REVERSAL_MODE_HINTS[m]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* ③ الأثرُ الحقيقيّ — من الخادم حرفياً */}
            {mode && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"
                data-testid="box-reversal-impact">
                <div className="text-sm font-semibold text-amber-900">سيتم:</div>
                <ul className="space-y-1 text-sm">
                  {lines.map((l, i) => (
                    <li key={i} className={`flex items-start gap-2 ${
                      l.kind === "warn" ? "text-amber-900 font-medium" : "text-foreground"}`}>
                      {l.kind === "warn"
                        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        : <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />}
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ④ السبب — إلزاميّ */}
            <div className="space-y-2">
              <Label htmlFor="reversal-note" className="font-semibold">سبب التصحيح *</Label>
              <Textarea
                id="reversal-note"
                rows={2}
                placeholder="مثال: تم تسجيل الشراء قبل إكمال المسار الصحيح"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                data-testid="input-reversal-note"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={run.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={() => run.mutate()}
            disabled={!canRun}
            data-testid="button-confirm-reversal"
          >
            {run.isPending ? "جارٍ التصحيح…" : "تأكيد التصحيح"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
