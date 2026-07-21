import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";

// Post-exam "تخصيص الطرف/المسند": the doctor decided the device specs and the
// patient agreed to buy, so reception records the specs + the agreed price and
// assigns the expert — all in ONE step. No delivery date here (the expert
// commits to it at the mold stage); the assignment date is automatic.
interface Expert { id: number; displayName: string }
type PatientLite = { id: number; branchId: number; name: string; isAmputee?: boolean | null; isMedicalSupport?: boolean | null };

const PROSTHETIC_SPECS: { key: string; label: string; placeholder: string; numeric?: boolean }[] = [
  { key: "prostheticType", label: "نوع الطرف الصناعي", placeholder: "مثال: طرف سفلي ذكي، ركبة ميكانيكية…" },
  { key: "siliconType", label: "نوع السليكون", placeholder: "مثال: سليكون طبي…" },
  { key: "siliconSize", label: "حجم السليكون", placeholder: "مثال: 3، 4، 5…", numeric: true },
  { key: "suspensionSystem", label: "نظام التعليق", placeholder: "مثال: حزام، فاكيوم، سليكون…" },
  { key: "footType", label: "نوع القدم", placeholder: "مثال: قدم كربون، قدم مرنة…" },
  { key: "footSize", label: "قياس الحذاء الذي يلبسه المريض", placeholder: "مثال: 42، 43…" },
  { key: "kneeJointType", label: "نوع مفصل الركبة", placeholder: "مثال: مفصل هيدروليكي، مفصل ميكانيكي…" },
];
const SUPPORT_SPECS: { key: string; label: string; placeholder: string; numeric?: boolean }[] = [
  { key: "supportType", label: "نوع المسند", placeholder: "مثال: مسند ظهر، مسند رقبة…" },
];

export function AssignExpertDialog({ patient, open, onOpenChange }: {
  patient: PatientLite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expertUserId, setExpertUserId] = useState<number | null>(null);
  const [cost, setCost] = useState<number>(0);
  const [specs, setSpecs] = useState<Record<string, string>>({});
  // A patient can carry BOTH flags (طرف + مسند): the user must pick which
  // service this تخصيص is for; single-flag patients skip the choice.
  const dualFlag = !!patient?.isAmputee && !!patient?.isMedicalSupport;
  const [serviceChoice, setServiceChoice] = useState<"prosthetic" | "medical_support" | null>(null);
  const serviceType: "prosthetic" | "medical_support" = dualFlag
    ? (serviceChoice ?? "prosthetic")
    : (patient?.isMedicalSupport && !patient?.isAmputee ? "medical_support" : "prosthetic");
  const isSupport = serviceType === "medical_support";
  const specFields = isSupport ? SUPPORT_SPECS : PROSTHETIC_SPECS;

  const { data: experts = [], isLoading } = useQuery<Expert[]>({
    queryKey: ["/api/manufacturing/experts", patient?.branchId],
    enabled: open && !!patient,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient!.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  function resetState() { setExpertUserId(null); setCost(0); setSpecs({}); setServiceChoice(null); }

  const assign = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patient!.id}/assign-manufacturing`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ expertUserId, cost, serviceType, ...specs }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || e.message || "تعذّر التخصيص"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient!.id}/summary`] });
      toast({ title: "تم التخصيص وإسناد الخبير", description: "سُجّلت المواصفات والكلفة وأمر التصنيع. يحدّد الخبير تاريخ التسليم عند أخذ القالب." });
      resetState();
      onOpenChange(false);
    },
    onError: (err: any) => toast({ title: "تعذّر التخصيص", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-primary">تخصيص {isSupport ? "المسند" : "الطرف"} وإسناد الخبير{patient ? ` — ${patient.name}` : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <p className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
            بعد الفحص وموافقة المريض على الشراء: أدخِل ما حدّده الطبيب، الكلفة، والخبير. تاريخ التسليم يحدّده الخبير لاحقاً عند أخذ القالب.
          </p>

          {dualFlag && (
            <div className="space-y-1">
              <label className="text-sm font-semibold">نوع الخدمة <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={serviceChoice === "prosthetic" ? "default" : "outline"} onClick={() => { setServiceChoice("prosthetic"); setSpecs({}); }} data-testid="choose-prosthetic">أطراف صناعية</Button>
                <Button type="button" size="sm" variant={serviceChoice === "medical_support" ? "default" : "outline"} onClick={() => { setServiceChoice("medical_support"); setSpecs({}); }} data-testid="choose-support">مساند طبية</Button>
              </div>
            </div>
          )}

          {specFields.map((f) => (
            <div key={f.key} className="space-y-1">
              <label className="text-sm font-medium">{f.label}</label>
              <Input
                value={specs[f.key] ?? ""}
                type={f.numeric ? "number" : "text"}
                inputMode={f.numeric ? "numeric" : undefined}
                placeholder={f.placeholder}
                onChange={(e) => setSpecs((s) => ({ ...s, [f.key]: e.target.value }))}
                data-testid={`spec-${f.key}`}
              />
            </div>
          ))}

          <div className="space-y-1">
            <label className="text-sm font-semibold">الكلفة (السعر) <span className="text-red-500">*</span></label>
            <MoneyInput value={cost} onValueChange={setCost} placeholder="0" data-testid="input-assign-cost" />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold">الخبير المسؤول عن التصنيع <span className="text-red-500">*</span></label>
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
          </div>
        </div>
        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={() => assign.mutate()} disabled={!expertUserId || !cost || (dualFlag && !serviceChoice) || assign.isPending} data-testid="button-confirm-assign-expert">
            {assign.isPending ? "جارٍ الحفظ…" : "حفظ وإسناد"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
