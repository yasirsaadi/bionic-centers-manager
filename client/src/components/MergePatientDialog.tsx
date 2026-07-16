import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@shared/routes";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { GitMerge, Loader2, AlertTriangle } from "lucide-react";

interface PatientLite { id: number; name: string; branchId: number; }

// Admin-only tool for cleaning up duplicate patient records: merges THIS
// (duplicate) record into an original one. All visits, payments, documents,
// invoices, work orders … are re-pointed to the original; type flags and
// costs are combined; then this duplicate record is deleted.
export function MergePatientDialog({ patientId, patientName }: { patientId: number; patientName: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [targetId, setTargetId] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: patients = [] } = useQuery<PatientLite[]>({
    queryKey: ["/api/patients"],
    enabled: open,
    queryFn: async () => {
      const res = await fetch("/api/patients", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const candidates = useMemo(
    () => patients
      .filter((p) => p.id !== patientId)
      .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase()))
      .slice(0, 50),
    [patients, patientId, search],
  );
  const target = patients.find((p) => String(p.id) === targetId);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/patients/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceId: patientId, targetId: Number(targetId) }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "فشل الدمج");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      const moved = data.moved || {};
      const summary = [
        moved.visits ? `${moved.visits} زيارة` : null,
        moved.payments ? `${moved.payments} دفعة` : null,
        moved.workOrders ? `${moved.workOrders} أمر تصنيع` : null,
      ].filter(Boolean).join("، ");
      toast({ title: "تم الدمج بنجاح", description: summary ? `انتقل للملف الأصلي: ${summary}.` : "اكتمل الدمج." });
      setOpen(false);
      setLocation(`/patients/${targetId}`);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const confirmed = confirmText.trim() === "دمج";

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setTargetId(""); setSearch(""); setConfirmText(""); } }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 text-purple-700 border-purple-200 hover:bg-purple-50" data-testid="button-merge-patient">
          <GitMerge className="w-4 h-4" />
          دمج مع ملف آخر
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">دمج ملف مكرّر</DialogTitle>
        </DialogHeader>

        <div className="text-sm bg-amber-50 border border-amber-200 rounded-md px-3 py-2 flex gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-none mt-0.5" />
          <span>
            سيُنقل كل ما في ملف <b>{patientName}</b> (الزيارات، الدفعات، أوامر التصنيع…) إلى الملف الأصلي الذي تختاره،
            ثم <b>يُحذف هذا الملف المكرّر نهائياً</b>. لا يمكن التراجع.
          </span>
        </div>

        <div className="space-y-3 mt-2">
          <div>
            <label className="text-sm font-medium">الملف الأصلي (الذي سيبقى)</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم…" className="mt-1 mb-2" />
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger data-testid="select-merge-target">
                <SelectValue placeholder="اختر الملف الأصلي" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} — رقم الملف {p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {target && (
            <div>
              <label className="text-sm font-medium">للتأكيد اكتب: دمج</label>
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="mt-1" placeholder="دمج" data-testid="input-merge-confirm" />
            </div>
          )}

          <Button
            className="w-full h-11 font-semibold bg-purple-700 hover:bg-purple-800"
            disabled={!targetId || !confirmed || isPending}
            onClick={() => mutate()}
            data-testid="button-confirm-merge"
          >
            {isPending ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الدمج…</>) : `دمج في ملف ${target?.name ?? ""}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
