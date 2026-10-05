// **القالبُ الاختباري في صفحة المريض** (قرارُ المالك ٢٠٢٦-١٠-٠٥، §4.bz) — شريطٌ دائم في الرأس، وخيارُ «سبب الحضور»
// الأوّل، ونافذةُ تأكيد العودة. ملفٌّ مستقلٌّ كي يبقى `PatientServiceLauncher` بلا شبكةٍ ولا `useMutation` (اختبارُه المعماريّ).
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { TRIAL_RETURN_HINT, TRIAL_RETURN_LABEL, trialAwaitingOrders } from "@shared/trial_socket";

export interface TrialOrder {
  id: number; serviceType: string; expertName: string | null;
  trialAwaiting?: boolean; trialFinalDate: string | null; trialSocketCount?: number;
}

const ordersKey = (patientId: number) => [`/api/manufacturing/patient/${patientId}/orders`];

function fmtDate(ymd: string | null): string {
  if (!ymd) return "—";
  return new Date(`${ymd}T00:00:00`).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

/** أوامرُ المريض بانتظار القالب النهائي — المفتاحُ نفسُه الذي تقرؤه بطاقةُ التصنيع، فلا طلبَ ثانٍ. */
export function useTrialAwaiting(patientId: number, enabled = true): TrialOrder[] {
  const q = useQuery<TrialOrder[]>({ queryKey: ordersKey(patientId), enabled });
  return trialAwaitingOrders(q.data);
}

/** **الشريطُ الدائم** — واضحٌ في رأس الصفحة ما دام المريضُ ينتظر قالبَه النهائي. */
export function TrialSocketBanner({ patientId, onAnswer }: { patientId: number; onAnswer?: () => void }) {
  const rows = useTrialAwaiting(patientId);
  if (rows.length === 0) return null;
  return (
    <div className="mt-2 space-y-1.5 print:hidden" data-testid="banner-trial-socket">
      {rows.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2 rounded-lg border-2 border-sky-400 bg-sky-50 px-3 py-2 text-sm text-sky-900">
          <span className="font-bold">🦿 لديه قالب اختباري — بانتظار قدومه للقالب النهائي</span>
          <span>الخبير: {o.expertName ?? "—"} · الموعد: <b>{fmtDate(o.trialFinalDate)}</b></span>
          {onAnswer && (
            <Button size="sm" className="h-7 bg-sky-600 hover:bg-sky-700" onClick={onAnswer}
              data-testid="button-banner-trial-return">
              هل أتى للقالب النهائي؟
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}

/** **الخيارُ الأوّل في «سبب الحضور»** لقسمٍ فيه قالبٌ اختباريٌّ ينتظر. */
export function TrialReturnRoutingChoice({ order, onChoose }: { order: TrialOrder; onChoose: () => void }) {
  return (
    <button type="button" onClick={onChoose}
      data-testid={`reception-routing-${order.serviceType}-trial_return-${order.id}`}
      className="w-full text-right rounded-lg border-2 border-sky-400 bg-sky-50 px-3 py-2.5 transition-colors hover:bg-sky-100">
      <div className="text-sm font-semibold text-sky-900">لديه قالب اختباري — {TRIAL_RETURN_LABEL}</div>
      <div className="text-[11px] text-sky-800/80 mt-0.5">
        الخبير {order.expertName ?? "—"} · موعده {fmtDate(order.trialFinalDate)} — {TRIAL_RETURN_HINT}
      </div>
    </button>
  );
}

/** **تأكيدُ العودة** — الأمرُ نفسُه يعود إلى خبيره، وتُكتب زيارةُ «عودة للقالب النهائي». */
export function TrialReturnDialog({ order, patientId, onClose }: {
  order: TrialOrder | null; patientId: number; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const m = useMutation({
    mutationFn: async (id: number) => (await apiRequest("POST", `/api/manufacturing/orders/${id}/trial-return`, {})).json(),
    onSuccess: () => {
      toast({ title: "تم", description: "عاد الأمر إلى الخبير للقالب النهائي" });
      qc.invalidateQueries({ queryKey: ordersKey(patientId) });
      qc.invalidateQueries({ queryKey: ["/api/manufacturing/trial-awaiting"] });
      qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      invalidatePatientData(qc, patientId);
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message ?? "تعذّر الحفظ", variant: "destructive" }),
    onSettled: () => setBusy(false),
  });
  return (
    <Dialog open={order !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>{TRIAL_RETURN_LABEL}</DialogTitle></DialogHeader>
        <p className="text-sm">
          يعود أمرُ التصنيع رقم {order?.id} إلى الخبير <b>{order?.expertName ?? "—"}</b> لإكمال القالب النهائي، ويصله تنبيه.
          ولا يُفتح أمرٌ جديد ولا يُقيَّد مال.
        </p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button data-testid="button-confirm-trial-return" disabled={busy || !order}
            onClick={() => { if (order) { setBusy(true); m.mutate(order.id); } }}>
            نعم، أتى للقالب النهائي
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
