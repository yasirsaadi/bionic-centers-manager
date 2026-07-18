import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useBranchSession } from "@/components/BranchGate";
import { Wrench, Loader2 } from "lucide-react";
import { STAGE_LABELS, STATUS_LABELS } from "@shared/manufacturing";

interface Summary {
  id: number;
  expertUserId: number;
  expertName: string | null;
  serviceType: string;
  status: string;
  currentStage: string;
  expectedDeliveryDate: string | null;
}

// Manufacturing data inside the patient EDIT page: the expert and expected
// delivery date live on the WORK ORDER (not the patient row), so the edit
// form never showed them. This card exposes both — expert reassignment (with
// a mandatory reason, same server rules: reception only before work starts)
// and delivery-date update (appends a history row).
export function ManufacturingEditCard({ patient }: {
  patient: { id: number; branchId: number; isAmputee?: boolean | null; isMedicalSupport?: boolean | null };
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useBranchSession();
  const isExpertRole = session?.role === "prosthetics_expert";

  const [newExpertId, setNewExpertId] = useState("");
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState("");

  const summaryKey = [`/api/manufacturing/patient/${patient.id}/summary`];
  const { data: summary } = useQuery<Summary | null>({
    queryKey: summaryKey,
    // Enabled for every non-expert viewer regardless of the patient's
    // case-type flag: the work order is the source of truth. A patient with an
    // active order but a missing isAmputee flag (e.g. after a merge/import)
    // must still get the card. The endpoint returns null when no order exists,
    // so a stray request for a non-manufacturing patient is cheap and harmless.
    enabled: !isExpertRole && !!patient.id,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/patient/${patient.id}/summary`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const active = summary && summary.status !== "cancelled" && summary.status !== "completed";

  // Pre-fill the date field with the current delivery date. An EMPTY controlled
  // <input type="date"> misbehaves on iOS Safari (the pick often doesn't stick),
  // and starting from the real value makes the change obvious and the save
  // button meaningful. Re-syncs whenever the server value changes.
  useEffect(() => {
    if (summary?.expectedDeliveryDate) setNewDate(summary.expectedDeliveryDate);
  }, [summary?.expectedDeliveryDate]);

  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", patient.branchId],
    enabled: Boolean(active),
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: summaryKey });
    queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient.id}/orders`] });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/notifications"] });
  };

  const reassign = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/manufacturing/orders/${summary!.id}/reassign`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newExpertUserId: Number(newExpertId), reason }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "تعذّر التحويل"); }
      return res.json();
    },
    onSuccess: () => { invalidate(); setNewExpertId(""); setReason(""); toast({ title: "تم تغيير الخبير" }); },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateDate = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/manufacturing/orders/${summary!.id}/delivery-date`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ expectedDeliveryDate: newDate }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "تعذّر تعديل الموعد"); }
      return res.json();
    },
    // Do NOT clear the field on success — keep the saved date visible so the
    // change is obvious (clearing it read as "nothing happened").
    onSuccess: () => { invalidate(); toast({ title: "تم تعديل موعد التسليم" }); },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  if (isExpertRole || !active) return null;

  // Only meaningful to save when the picked date differs from the stored one.
  const dateChanged = !!newDate && newDate !== (summary!.expectedDeliveryDate ?? "");

  return (
    <Card className="p-6 rounded-2xl border-primary/30 bg-primary/5 space-y-4">
      <h3 className="text-lg font-bold text-primary flex items-center gap-2">
        <Wrench className="w-5 h-5" />
        بيانات التصنيع
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">الخبير الحالي</div><div className="font-semibold">{summary!.expertName ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">المرحلة</div><div>{STAGE_LABELS[summary!.currentStage] ?? summary!.currentStage}</div></div>
        <div><div className="text-xs text-muted-foreground">الحالة</div><div>{STATUS_LABELS[summary!.status] ?? summary!.status}</div></div>
        <div><div className="text-xs text-muted-foreground">موعد التسليم الحالي</div><div className="font-semibold">{summary!.expectedDeliveryDate ?? "—"}</div></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Change expert */}
        <div className="bg-white border rounded-lg p-3 space-y-2">
          <label className="text-sm font-semibold">تغيير الخبير المسؤول</label>
          <Select value={newExpertId} onValueChange={setNewExpertId}>
            <SelectTrigger data-testid="select-edit-expert"><SelectValue placeholder="اختر الخبير الجديد" /></SelectTrigger>
            <SelectContent>
              {experts.filter((e) => e.id !== summary!.expertUserId).map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="سبب التحويل (إلزامي)" />
          <Button type="button" size="sm" className="w-full" disabled={!newExpertId || !reason.trim() || reassign.isPending}
            onClick={() => reassign.mutate()} data-testid="button-edit-reassign">
            {reassign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحويل"}
          </Button>
          <p className="text-[11px] text-muted-foreground">للاستقبال: التحويل متاح قبل بدء الخبير العمل فقط؛ بعده يحوّل المدير أو المسؤول.</p>
        </div>

        {/* Change expected delivery date */}
        <div className="bg-white border rounded-lg p-3 space-y-2">
          <label className="text-sm font-semibold">تعديل موعد التسليم المتوقع</label>
          <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} data-testid="input-edit-delivery" />
          <Button type="button" size="sm" className="w-full" disabled={!dateChanged || updateDate.isPending}
            onClick={() => updateDate.mutate()} data-testid="button-edit-delivery">
            {updateDate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : dateChanged ? "حفظ الموعد الجديد" : "اختر تاريخاً مختلفاً"}
          </Button>
          <p className="text-[11px] text-muted-foreground">يُسجَّل التغيير في الخط الزمني وتُحدَّث التنبيهات عليه.</p>
        </div>
      </div>
    </Card>
  );
}
