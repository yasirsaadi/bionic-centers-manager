import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";
import { PROSTHETIC_SPECS, SUPPORT_SPECS } from "@shared/case_fields";
import { Stethoscope } from "lucide-react";

// Post-exam "تخصيص الطرف/المسند": the doctor decided the device specs and the
// patient agreed to buy, so reception records the specs + the agreed price and
// assigns the expert — all in ONE step. No delivery date here (the expert
// commits to it at the mold stage); the assignment date is automatic.
interface Expert { id: number; displayName: string }
type PatientLite = { id: number; branchId: number; name: string; isAmputee?: boolean | null; isMedicalSupport?: boolean | null };


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

  // The doctor's signed decision for THIS service, if one exists. Reception no
  // longer re-types the specs from a paper note: they arrive pre-filled and
  // attributed, and reception is left with the two things that are actually
  // theirs — the agreed price and the expert.
  const { data: examData } = useQuery<{ exams: any[] }>({
    queryKey: [`/api/medical/patients/${patient?.id}/exams`],
    enabled: open && !!patient,
    queryFn: async () => {
      const res = await fetch(`/api/medical/patients/${patient!.id}/exams`, { credentials: "include" });
      if (!res.ok) return { exams: [] };
      return res.json();
    },
  });
  // Exams come back newest-first, so the first match is the current decision.
  const rxExam = (examData?.exams ?? []).find((e: any) => e.caseType === serviceType);
  const prescribedBy: string | null = rxExam?.doctorName ?? null;
  // The doctor's PROPOSED price. It lives only on the exam until this dialog's
  // save — the one write that books a device sale (case cost + total_cost) —
  // so a patient who never comes back to pay leaves the accounts untouched.
  const proposedCost: number | null =
    typeof rxExam?.deviceCost === "number" && rxExam.deviceCost > 0 ? rxExam.deviceCost : null;

  useEffect(() => {
    if (!open || !rxExam?.prescription) return;
    const seeded: Record<string, string> = {};
    for (const f of specFields) {
      const v = rxExam.prescription[f.key];
      if (typeof v === "string" && v.trim()) seeded[f.key] = v;
    }
    // Only seed fields reception hasn't already typed into.
    if (Object.keys(seeded).length > 0) setSpecs((prev) => ({ ...seeded, ...prev }));
  }, [open, rxExam?.id, serviceType]);

  // Seed the price the same way: the doctor's proposal fills the empty field,
  // and anything reception already typed wins.
  useEffect(() => {
    if (!open || proposedCost == null) return;
    setCost((prev) => (prev > 0 ? prev : proposedCost));
  }, [open, rxExam?.id, serviceType, proposedCost]);

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
                <Button type="button" size="sm" variant={serviceChoice === "prosthetic" ? "default" : "outline"} onClick={() => { setServiceChoice("prosthetic"); setSpecs({}); setCost(0); }} data-testid="choose-prosthetic">أطراف صناعية</Button>
                <Button type="button" size="sm" variant={serviceChoice === "medical_support" ? "default" : "outline"} onClick={() => { setServiceChoice("medical_support"); setSpecs({}); setCost(0); }} data-testid="choose-support">مساند طبية</Button>
              </div>
            </div>
          )}

          {prescribedBy && (
            <div className="rounded-lg border border-teal-300 bg-teal-50/60 p-2.5 text-xs text-teal-900 flex gap-2">
              <Stethoscope className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                المواصفات أدناه من معاينة <b>{prescribedBy}</b>. عدِّلها فقط عند الضرورة —
                يبقى عليك الاتفاق على الكلفة وإسناد الخبير.
              </span>
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
            {proposedCost != null && (
              <p className="text-xs text-teal-800" data-testid="text-proposed-cost">
                كلفة مقترحة من معاينة {prescribedBy ?? "الطبيب"}:{" "}
                <b>{proposedCost.toLocaleString("en-US")} د.ع</b> — لا تدخل الحسابات
                إلا بحفظ هذه النافذة.
              </p>
            )}
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
