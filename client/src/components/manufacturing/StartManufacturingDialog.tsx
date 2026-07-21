import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { usePermissions } from "@/hooks/usePermissions";
import { Hammer, Loader2 } from "lucide-react";

// "Start manufacturing" for a prosthetic/medical-support patient who was
// registered as examination-only (no cost → no expert → no work order) and
// has now decided to buy. Visible to reception (own branch), managers and
// admin — only when the patient has NO active work order.
export function StartManufacturingDialog({ patient }: {
  patient: { id: number; branchId: number; isAmputee?: boolean | null; isMedicalSupport?: boolean | null };
}) {
  const [open, setOpen] = useState(false);
  const [expertUserId, setExpertUserId] = useState("");
  const [expected, setExpected] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useBranchSession();
  const permissions = usePermissions();

  const isExpertRole = session?.role === "prosthetics_expert";
  const mayStart = !isExpertRole && (session?.isAdmin || session?.role === "branch_manager" || permissions.canAddPatients);

  // Same key as PatientWorkOrderCard — deduped by react-query.
  const { data: summary } = useQuery<any>({
    queryKey: [`/api/manufacturing/patient/${patient.id}/summary`],
    enabled: mayStart && !!patient.id,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/patient/${patient.id}/summary`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", patient.branchId],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const start = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/manufacturing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: patient.id,
          expertUserId: Number(expertUserId),
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "تعذّر بدء التصنيع");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient.id}/summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient.id}/orders`] });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/notifications"] });
      toast({ title: "تم بدء التصنيع وإسناد الخبير" });
      setOpen(false);
      setExpertUserId("");
      setExpected("");
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  // Show only when there is no ACTIVE order (never / cancelled / completed).
  const hasActive = summary && summary.status !== "cancelled" && summary.status !== "completed";
  if (!mayStart || hasActive) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/5" data-testid="button-start-manufacturing">
          <Hammer className="w-4 h-4" />
          بدء التصنيع وإسناد خبير
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">بدء التصنيع</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          المريض قرر الشراء — اختر الخبير المسؤول. تاريخ التسليم يحدّده الخبير بنفسه عند أخذ القالب.
        </p>
        <div className="space-y-3 mt-1">
          <div>
            <label className="text-sm font-semibold">الخبير المسؤول <span className="text-red-500">*</span></label>
            {experts.length === 0 ? (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mt-1">
                لا يوجد خبير متاح لهذا الفرع.
              </div>
            ) : (
              <Select value={expertUserId} onValueChange={setExpertUserId}>
                <SelectTrigger className="mt-1" data-testid="select-start-expert">
                  <SelectValue placeholder="اختر الخبير" />
                </SelectTrigger>
                <SelectContent>
                  {experts.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button disabled={!expertUserId || start.isPending} onClick={() => start.mutate()}>
            {start.isPending ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ البدء…</>) : "بدء التصنيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
