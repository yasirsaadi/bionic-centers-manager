import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Branch { id: number; name: string; }
interface PatientLite {
  id: number; name: string; branchId: number; isAmputee?: boolean; isMedicalSupport?: boolean;
}

// Dialog for admin / branch manager to open a work order for an EXISTING
// prosthetic or medical-support patient (only those types are listed).
export function CreateOrderDialog({
  open, onOpenChange, branches, isAdmin,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; branches: Branch[]; isAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState<string>("");
  const [expertUserId, setExpertUserId] = useState<string>("");
  const [expected, setExpected] = useState<string>("");
  const [search, setSearch] = useState("");

  const { data: patients = [] } = useQuery<PatientLite[]>({
    queryKey: ["/api/patients"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Only prosthetic / medical-support patients are eligible.
  const eligible = useMemo(
    () => patients.filter((p) => (p.isAmputee || p.isMedicalSupport)
      && (!search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))),
    [patients, search],
  );
  const selectedPatient = patients.find((p) => String(p.id) === patientId);

  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", selectedPatient?.branchId],
    enabled: open && !!selectedPatient,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${selectedPatient!.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/manufacturing/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          patientId: Number(patientId),
          expertUserId: Number(expertUserId),
          expectedDeliveryDate: expected || null,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.error || "تعذّر إنشاء الأمر");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/overview"] });
      toast({ title: "تم إنشاء أمر التصنيع" });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  function reset() {
    setPatientId(""); setExpertUserId(""); setExpected(""); setSearch("");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>أمر تصنيع لمريض موجود</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">المريض (أطراف صناعية / مساند طبية)</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم…" className="mt-1 mb-2" />
            <Select value={patientId} onValueChange={(v) => { setPatientId(v); setExpertUserId(""); }}>
              <SelectTrigger><SelectValue placeholder="اختر المريض" /></SelectTrigger>
              <SelectContent>
                {eligible.slice(0, 50).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} — {branches.find((b) => b.id === p.branchId)?.name ?? `#${p.branchId}`}
                    {p.isAmputee ? " (أطراف)" : " (مساند)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedPatient && (
            <div>
              <label className="text-sm font-medium">الخبير المسؤول</label>
              {experts.length === 0 ? (
                <div className="text-sm text-red-600 mt-1">لا يوجد خبير متاح لفرع هذا المريض.</div>
              ) : (
                <Select value={expertUserId} onValueChange={setExpertUserId}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الخبير" /></SelectTrigger>
                  <SelectContent>
                    {experts.map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">موعد التسليم المتوقّع (اختياري)</label>
            <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>إلغاء</Button>
          <Button
            disabled={!patientId || !expertUserId || create.isPending}
            onClick={() => create.mutate()}
          >
            إنشاء الأمر
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
