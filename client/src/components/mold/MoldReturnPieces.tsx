// **«عاد لأخذ القالب» في «سبب الحضور»** (قرارُ المالك ٢٠٢٦-١٠-٠٧، §4.cl) — مريضٌ اشترى ولم يُؤخذ قالبُه يومها يعود لأمره القائم.
// ملفٌّ مستقلٌّ كي يبقى `PatientServiceLauncher` بلا شبكةٍ ولا `useMutation` (اختبارُه المعماريّ) — كـ`TrialSocketPieces`.
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { MOLD_RETURN_HINT, MOLD_RETURN_LABEL, STAGE_LABELS, moldReturnOrders } from "@shared/manufacturing";
import { baghdadTodayYmd } from "@shared/visit_date";

export interface MoldOrder {
  id: number; serviceType: string; purpose: string; status: string; currentStage: string;
  expertName: string | null; holdReasonCode?: string | null; adminVoidReversalId?: number | null;
}

const ordersKey = (patientId: number) => [`/api/manufacturing/patient/${patientId}/orders`];

/** أوامرُ المريض التي لم تبلغ القالب — المفتاحُ نفسُه الذي تقرؤه بطاقةُ التصنيع، فلا طلبَ ثانٍ. */
export function useMoldReturnOrders(patientId: number, enabled = true): MoldOrder[] {
  const q = useQuery<MoldOrder[]>({ queryKey: ordersKey(patientId), enabled });
  return moldReturnOrders(q.data);
}

/** **الخيارُ في «سبب الحضور»** لقسمٍ فيه أمرٌ ينتظر القالب. */
export function MoldReturnRoutingChoice({ order, onChoose }: { order: MoldOrder; onChoose: () => void }) {
  return (
    <button type="button" onClick={onChoose}
      data-testid={`reception-routing-${order.serviceType}-mold_return-${order.id}`}
      className="w-full text-right rounded-lg border-2 border-emerald-400 bg-emerald-50 px-3 py-2.5 transition-colors hover:bg-emerald-100">
      <div className="text-sm font-semibold text-emerald-900">{MOLD_RETURN_LABEL} — أمر رقم {order.id}</div>
      <div className="text-[11px] text-emerald-800/80 mt-0.5">
        الخبير {order.expertName ?? "—"} · {STAGE_LABELS[order.currentStage] ?? order.currentStage} — {MOLD_RETURN_HINT}
      </div>
    </button>
  );
}

/** **تسجيلُ الحضور** — زيارةٌ «عاد لأخذ القالب» بتاريخها، وسطرٌ في أمره، وتنبيهُ خبيره. */
export function MoldReturnDialog({ order, patientId, onClose }: {
  order: MoldOrder | null; patientId: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = baghdadTodayYmd();
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  useEffect(() => { if (order) { setDate(baghdadTodayYmd()); setNote(""); } }, [order]);
  const m = useMutation({
    mutationFn: async (p: { id: number; date: string; note: string }) =>
      (await apiRequest("POST", `/api/manufacturing/orders/${p.id}/mold-return`, { date: p.date, note: p.note || undefined })).json(),
    onSuccess: () => {
      toast({ title: "تم", description: "سُجِّل الحضور ووصل التنبيه إلى الخبير" });
      qc.invalidateQueries({ queryKey: ordersKey(patientId) });
      qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      invalidatePatientData(qc, patientId);
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message ?? "تعذّر الحفظ", variant: "destructive" }),
  });
  return (
    <Dialog open={order !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{MOLD_RETURN_LABEL}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm" data-testid="hint-mold-return">
            يُسجَّل حضورُه في سجلّ الزيارات على أمر التصنيع رقم {order?.id}، ويصل التنبيهُ إلى الخبير <b>{order?.expertName ?? "—"}</b>.
            لا مال ولا أمرَ جديد — والخبيرُ ينقل الأمرَ إلى مرحلة القالب ويحدّد موعد التسليم.
          </p>
          <div>
            <label className="text-sm font-medium">تاريخ الحضور</label>
            <Input type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)}
              className="mt-1 bg-white" data-testid="input-mold-return-date" />
            <p className="text-[11px] text-muted-foreground mt-1">اليوم افتراضاً — والرجوعُ حتى ثلاثة أيام، وما قبلها للمسؤول.</p>
          </div>
          <div>
            <label className="text-sm font-medium">ملاحظة (اختياري)</label>
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1 bg-white"
              placeholder="مثال: أنهى فترة المشدّ والتأهيل" data-testid="input-mold-return-note" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button data-testid="button-confirm-mold-return" disabled={m.isPending || !order || !date || date > today}
            onClick={() => { if (order) m.mutate({ id: order.id, date, note: note.trim() }); }}>
            {m.isPending ? "جارٍ الحفظ…" : "تسجيل الحضور"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
