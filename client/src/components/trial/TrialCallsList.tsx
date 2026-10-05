// **اتصالاتُ القالب الاختباري** (قرارُ المالك ٢٠٢٦-١٠-٠٥، §4.bz) — تبويبٌ في «المتابعات»: مرضى سُلِّموا قالباً اختبارياً
// وينتظرون القالبَ النهائي. **الاستعلاماتُ وحدها تتّصل**؛ ومَن حلّ موعدُه أو فاته أوّلاً، وتسجيلُ الاتصال يطلب موعداً جديداً.
import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TRIAL_CALL_STATE_LABELS, type TrialCallState } from "@shared/trial_socket";
import { baghdadTodayYmd } from "@shared/visit_date";

export interface TrialAwaitingRow {
  orderId: number; patientId: number; patientName: string; patientCode: string | null; phone: string | null;
  branchName: string | null; expertName: string | null; trialSocketCount: number; trialFinalDate: string;
  lastCallAt: string | null; lastCallNote: string | null; callState: TrialCallState;
}

export const TRIAL_AWAITING_KEY = ["/api/manufacturing/trial-awaiting"];

function fmtDate(ymd: string | null): string {
  if (!ymd) return "—";
  return new Date(`${ymd.slice(0, 10)}T00:00:00`).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

export function useTrialAwaitingRows() {
  return useQuery<TrialAwaitingRow[]>({ queryKey: TRIAL_AWAITING_KEY });
}

export function TrialCallsList() {
  const { data: rows = [], isLoading } = useTrialAwaitingRows();
  const [callFor, setCallFor] = useState<TrialAwaitingRow | null>(null);
  if (isLoading) return <div className="text-center py-12 text-muted-foreground text-sm">جارٍ التحميل…</div>;
  if (rows.length === 0) {
    return <div className="text-center py-12 text-muted-foreground text-sm">لا مرضى بانتظار القالب النهائي.</div>;
  }
  return (
    <div className="space-y-2" data-testid="trial-calls-list">
      {rows.map((r) => (
        <Card key={r.orderId} className={r.callState === "missed" ? "border-red-300" : r.callState === "before" ? "border-amber-300" : ""}
          data-testid={`trial-call-row-${r.orderId}`}>
          <CardContent className="p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href={`/patients/${r.patientId}`} className="font-semibold text-primary hover:underline">
              {r.patientName}{r.patientCode ? ` (${r.patientCode})` : ""}
            </Link>
            {r.phone && <a href={`tel:${r.phone}`} className="font-mono" dir="ltr">{r.phone}</a>}
            <span className="text-muted-foreground">{r.branchName ?? ""} · الخبير {r.expertName ?? "—"}</span>
            <span>موعد القالب النهائي: <b>{fmtDate(r.trialFinalDate)}</b>{r.trialSocketCount > 1 ? ` · قالب اختباري (${r.trialSocketCount})` : ""}</span>
            {r.callState && (
              <Badge className={r.callState === "missed" ? "bg-red-600" : "bg-amber-500"}>{TRIAL_CALL_STATE_LABELS[r.callState]}</Badge>
            )}
            {r.lastCallNote && <span className="text-xs text-muted-foreground w-full">آخر اتصال: {r.lastCallNote}</span>}
            <Button size="sm" variant="outline" className="ms-auto" onClick={() => setCallFor(r)} data-testid={`button-trial-call-${r.orderId}`}>
              سجّل الاتصال
            </Button>
          </CardContent>
        </Card>
      ))}
      <TrialCallDialog row={callFor} onClose={() => setCallFor(null)} />
    </div>
  );
}

function TrialCallDialog({ row, onClose }: { row: TrialAwaitingRow | null; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = baghdadTodayYmd();
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState("");
  const [forId, setForId] = useState<number | null>(null);
  if (row && forId !== row.orderId) {
    setForId(row.orderId);
    setNote("");
    setNextDate(row.trialFinalDate >= today ? row.trialFinalDate : "");
  }
  const m = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/manufacturing/orders/${row!.orderId}/trial-call`, { note: note.trim(), nextDate })).json(),
    onSuccess: () => {
      toast({ title: "تم", description: "سُجّل الاتصال والموعد" });
      qc.invalidateQueries({ queryKey: TRIAL_AWAITING_KEY });
      if (row) qc.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${row.patientId}/orders`] });
      setForId(null);
      onClose();
    },
    onError: (e: any) => toast({ title: "خطأ", description: e?.message ?? "تعذّر الحفظ", variant: "destructive" }),
  });
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) { setForId(null); onClose(); } }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>اتصال بشأن القالب النهائي — {row?.patientName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">نتيجة الاتصال <span className="text-red-500">*</span></label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1"
              placeholder="مثلاً: أكّد حضوره في الموعد / لم يرد / طلب التأجيل" data-testid="input-trial-call-note" />
          </div>
          <div>
            <label className="text-sm font-medium">موعد القالب النهائي <span className="text-red-500">*</span></label>
            <Input type="date" min={today} value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="mt-1"
              data-testid="input-trial-call-date" />
            <p className="text-[11px] text-muted-foreground mt-1">أبقِه كما هو إن أكّد المريض، أو غيّره إن تأجّل.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setForId(null); onClose(); }}>إلغاء</Button>
          <Button data-testid="button-confirm-trial-call" disabled={!note.trim() || !nextDate || nextDate < today || m.isPending}
            onClick={() => m.mutate()}>
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
