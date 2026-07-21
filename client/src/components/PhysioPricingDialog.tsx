import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import { PHYSIO_TREATMENT_TYPES, physioEntryCost, type PhysioEntry } from "@shared/pricing";
import { api } from "@shared/routes";

// Post-exam physiotherapy pricing («الكلفة والجلسات») — the physio mirror of
// the أطراف/مساند تخصيص step: the patient was registered without a cost; after
// the doctor's exam reception picks the treatment types + session counts here,
// the cost auto-computes per session (روبوت 50k، أجهزة/تمارين/أبر 25k) and the
// SERVER recomputes it authoritatively on save.
type Row = PhysioEntry;

export function PhysioPricingDialog({ patient, open, onOpenChange }: {
  patient: { id: number; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>([{ treatmentType: "", sessionCount: 0 }]);

  const total = rows.reduce((s, r) => s + physioEntryCost(r), 0);
  const validRows = rows.filter((r) => r.treatmentType && (r.sessionCount > 0 || r.treatmentType === "استشارة طبية"));

  function reset() { setRows([{ treatmentType: "", sessionCount: 0 }]); }

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patient!.id}/price-physio`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ entries: validRows.map((r) => ({ ...r, sessionCount: r.treatmentType === "استشارة طبية" ? 1 : r.sessionCount })) }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر الحفظ"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patient!.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", patient!.id] });
      toast({ title: "تم تسعير العلاج", description: `الكلفة المضافة: ${(data.totalCost || 0).toLocaleString()} د.ع` });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  function setRow(i: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary">الكلفة والجلسات{patient ? ` — ${patient.name}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
            بعد فحص الطبيب: اختر أنواع العلاج وعدد الجلسات — الكلفة تُحسب تلقائياً (روبوت 50,000 / جلسة، الأجهزة والتمارين والأبر 25,000 / جلسة).
          </p>

          {rows.map((r, i) => (
            <div key={i} className="border rounded-lg p-3 bg-slate-50/50 space-y-2" data-testid={`physio-row-${i}`}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex-1 min-w-[160px]">
                  <Select value={r.treatmentType} onValueChange={(v) => setRow(i, { treatmentType: v, sessionCount: v === "استشارة طبية" ? 0 : r.sessionCount })}>
                    <SelectTrigger className="bg-white" data-testid={`physio-type-${i}`}><SelectValue placeholder="اختر نوع العلاج" /></SelectTrigger>
                    <SelectContent>
                      {PHYSIO_TREATMENT_TYPES.map((tOpt) => (<SelectItem key={tOpt} value={tOpt}>{tOpt}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {r.treatmentType && r.treatmentType !== "استشارة طبية" && (
                  <Input type="number" min={0} value={r.sessionCount || ""} placeholder="الجلسات"
                    onChange={(e) => setRow(i, { sessionCount: Math.max(0, Number(e.target.value) || 0) })}
                    className="w-[90px] bg-white text-left font-mono" data-testid={`physio-sessions-${i}`} />
                )}
                {r.isFree && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">مجاني</span>}
                {!r.isFree && (
                  <span className="text-sm font-mono text-muted-foreground">التكلفة: {physioEntryCost(r).toLocaleString()}</span>
                )}
                {rows.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="gap-2" onClick={() => setRows((rs) => [...rs, { treatmentType: "", sessionCount: 0 }])} data-testid="physio-add-row">
              <Plus className="w-4 h-4" /> إضافة نوع علاج
            </Button>
            <Button type="button" variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50" onClick={() => setRows((rs) => [...rs, { treatmentType: "", sessionCount: 0, isFree: true }])} data-testid="physio-add-free">
              <Plus className="w-4 h-4" /> إضافة جلسات مجانية
            </Button>
          </div>

          <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center font-semibold text-primary">
            <span>إجمالي الكلفة المضافة</span>
            <span className="font-mono">{total.toLocaleString()} د.ع</span>
          </div>
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => save.mutate()} disabled={validRows.length === 0 || save.isPending} data-testid="physio-save">
            {save.isPending ? "جارٍ الحفظ…" : "حفظ الكلفة والجلسات"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
