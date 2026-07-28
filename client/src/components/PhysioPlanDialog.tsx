import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, ListChecks } from "lucide-react";
import { PHYSIO_TREATMENT_TYPES } from "@shared/pricing";
import { api } from "@shared/routes";

type Row = { treatmentType: string; sessionCount: number };

/**
 * «تعديل خطة الجلسات» — corrects the COUNTS, never the money.
 *
 * Two jobs: repair patients priced before the plan was stored (their counts
 * were charged for and then discarded), and handle any later correction — "we
 * agreed on 12, not 10". The cost is deliberately absent from this dialog and
 * from its endpoint: changing what the counter measures must never be able to
 * move a dinar.
 */
export function PhysioPlanDialog({ patient, open, onOpenChange }: {
  patient: { id: number; name: string; physioPlan?: Row[] | null } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([{ treatmentType: "", sessionCount: 0 }]);

  useEffect(() => {
    if (!open || !patient) return;
    const current = (patient.physioPlan ?? []).filter((r) => r?.treatmentType);
    setRows(current.length > 0
      ? current.map((r) => ({ treatmentType: r.treatmentType, sessionCount: Number(r.sessionCount) || 0 }))
      : [{ treatmentType: "", sessionCount: 0 }]);
  }, [open, patient?.id]);

  const valid = rows.filter((r) => r.treatmentType && r.sessionCount > 0);
  const total = valid.reduce((s, r) => s + r.sessionCount, 0);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patient!.id}/physio-plan`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ entries: valid }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر الحفظ"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patient!.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients", patient!.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      toast({ title: "حُفظت خطة الجلسات", description: "العدّاد سيحتسب منها — ولم تتغيّر الكلفة." });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const setRow = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            خطة الجلسات{patient ? ` — ${patient.name}` : ""}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
            عدد الجلسات المشتراة لكل نوع علاج. يُستعمل في عدّاد الجلسات فقط —
            <b> لا يغيّر الكلفة ولا المدفوعات إطلاقاً</b>.
          </p>

          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-2 flex-wrap border rounded-lg p-3 bg-slate-50/50">
              <div className="flex-1 min-w-[150px]">
                <Select value={r.treatmentType} onValueChange={(v) => setRow(i, { treatmentType: v })}>
                  <SelectTrigger className="bg-white" data-testid={`plan-type-${i}`}>
                    <SelectValue placeholder="اختر نوع العلاج" />
                  </SelectTrigger>
                  <SelectContent>
                    {PHYSIO_TREATMENT_TYPES.filter((tp) => tp !== "استشارة طبية").map((tp) => (
                      <SelectItem key={tp} value={tp}>{tp}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                type="number" min={0} value={r.sessionCount || ""} placeholder="الجلسات"
                onChange={(e) => setRow(i, { sessionCount: Math.max(0, Number(e.target.value) || 0) })}
                className="w-[100px] bg-white text-left font-mono"
                data-testid={`plan-sessions-${i}`}
              />
              {rows.length > 1 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                  <X className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}

          <Button type="button" variant="outline" className="gap-2"
            onClick={() => setRows((rs) => [...rs, { treatmentType: "", sessionCount: 0 }])}
            data-testid="plan-add-row">
            <Plus className="w-4 h-4" /> إضافة نوع علاج
          </Button>

          <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center font-semibold text-primary">
            <span>مجموع الجلسات</span>
            <span className="font-mono">{total}</span>
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending} data-testid="plan-save">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الخطة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
