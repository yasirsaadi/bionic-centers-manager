import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Assigns a manufacturing expert to a prosthetic/medical-support patient — the
// separate step that replaced "expert at patient creation". No delivery date is
// asked here: the assigned expert commits to the delivery date only when they
// reach the mold stage. The assignment date is taken automatically (the work
// order's createdAt on the server).
interface Expert { id: number; displayName: string }

export function AssignExpertDialog({ patient, open, onOpenChange }: {
  patient: { id: number; branchId: number; name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expertUserId, setExpertUserId] = useState<number | null>(null);

  const { data: experts = [], isLoading } = useQuery<Expert[]>({
    queryKey: ["/api/manufacturing/experts", patient?.branchId],
    enabled: open && !!patient,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient!.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/manufacturing/orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ patientId: patient!.id, expertUserId }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || "تعذّر الإسناد"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient!.id}/summary`] });
      toast({ title: "تم تحديد الخبير", description: "تاريخ الإسناد سُجّل تلقائياً. يحدّد الخبير تاريخ التسليم عند أخذ القالب." });
      setExpertUserId(null);
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "تعذّر تحديد الخبير", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setExpertUserId(null); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[440px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary">تحديد خبير{patient ? ` — ${patient.name}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <label className="text-sm font-semibold">الخبير المسؤول عن التصنيع</label>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">جارٍ تحميل الخبراء…</div>
          ) : experts.length === 0 ? (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              لا يوجد خبير متاح لهذا الفرع — أسنِد خبيراً لهذا الفرع من إدارة المستخدمين أولاً.
            </div>
          ) : (
            <Select value={expertUserId ? String(expertUserId) : ""} onValueChange={(v) => setExpertUserId(Number(v))}>
              <SelectTrigger data-testid="select-assign-expert"><SelectValue placeholder="اختر الخبير" /></SelectTrigger>
              <SelectContent>
                {experts.map((e) => (<SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>))}
              </SelectContent>
            </Select>
          )}
          <p className="text-xs text-muted-foreground">تاريخ الإسناد يُسجَّل تلقائياً. لا يُطلب تاريخ التسليم هنا — يحدّده الخبير عند أخذ القالب.</p>
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => assign.mutate()} disabled={!expertUserId || assign.isPending} data-testid="button-confirm-assign-expert">
            {assign.isPending ? "جارٍ الحفظ…" : "تحديد الخبير"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
