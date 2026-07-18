import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2 } from "lucide-react";

interface AddCaseTypeModalProps {
  patient: {
    id: number;
    branchId: number;
    isAmputee?: boolean | null;
    isPhysiotherapy?: boolean | null;
    isMedicalSupport?: boolean | null;
  };
}

const TYPE_LABELS: Record<string, string> = {
  amputee: "أطراف صناعية",
  medical_support: "مساند طبية",
  physiotherapy: "علاج طبيعي",
};

// One person = one record: instead of opening a duplicate patient file when
// an existing patient needs a NEW kind of service (e.g. a physio patient who
// now needs a medical support), this dialog activates the new case type on
// the SAME record — with expert assignment for manufacturing types, and an
// optional cost + partial payment.
export function AddCaseTypeModal({ patient }: AddCaseTypeModalProps) {
  const [open, setOpen] = useState(false);
  const [caseType, setCaseType] = useState<string>("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [expertUserId, setExpertUserId] = useState<string>("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [serviceCost, setServiceCost] = useState(0);
  const [paidNow, setPaidNow] = useState(0);
  const [paidTouched, setPaidTouched] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const missingTypes = [
    !patient.isAmputee && "amputee",
    !patient.isMedicalSupport && "medical_support",
    !patient.isPhysiotherapy && "physiotherapy",
  ].filter(Boolean) as string[];

  const isManufacturing = caseType === "amputee" || caseType === "medical_support";

  const { data: experts = [], isLoading: expertsLoading } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", patient.branchId],
    enabled: open && isManufacturing,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${patient.branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const effectivePaidNow = paidTouched ? Math.min(paidNow, serviceCost) : serviceCost;
  const remaining = Math.max(0, serviceCost - effectivePaidNow);
  // Cost entered → expert + date required; no cost → examination-only add.
  const committing = isManufacturing && serviceCost > 0;

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patient.id}/add-case-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          caseType,
          ...fields,
          expertUserId: committing ? Number(expertUserId) : undefined,
          expectedDeliveryDate: committing ? (expectedDeliveryDate || undefined) : undefined,
          serviceCost,
          paidNow: effectivePaidNow,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "تعذّرت إضافة نوع الحالة");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.patients.get.path, patient.id] });
      queryClient.invalidateQueries({ queryKey: [api.patients.list.path] });
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient.id}/summary`] });
      queryClient.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patient.id}/orders`] });
      toast({ title: "تمت إضافة نوع الحالة", description: "أُضيف النوع الجديد على نفس ملف المريض." });
      reset();
      setOpen(false);
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  function reset() {
    setCaseType(""); setFields({}); setExpertUserId("");
    setExpectedDeliveryDate(""); setServiceCost(0); setPaidNow(0); setPaidTouched(false);
  }

  function setField(k: string, v: string) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  const canSubmit = !!caseType && (!committing || (!!expertUserId && !!expectedDeliveryDate)) && !isPending;

  if (missingTypes.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); setOpen(v); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-teal-300 text-teal-700 hover:bg-teal-50" data-testid="button-add-case-type">
          <Layers className="w-4 h-4" />
          إضافة نوع حالة
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">إضافة نوع حالة لنفس المريض</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          بدل فتح ملف جديد لنفس الشخص، يُفعَّل النوع الجديد على ملفه الحالي — فتبقى كل بياناته وأمواله في مكان واحد.
        </p>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium">نوع الحالة الجديد</label>
            <Select value={caseType} onValueChange={(v) => { setCaseType(v); setExpertUserId(""); }}>
              <SelectTrigger className="mt-1" data-testid="select-case-type">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent>
                {missingTypes.map((t) => (
                  <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {caseType === "medical_support" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">نوع المسند</label>
                <Input value={fields.supportType || ""} onChange={(e) => setField("supportType", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">جهة الإصابة</label>
                <Input value={fields.injurySide || ""} onChange={(e) => setField("injurySide", e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {caseType === "amputee" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">موقع البتر</label>
                <Input value={fields.amputationSite || ""} onChange={(e) => setField("amputationSite", e.target.value)} className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium">نوع الطرف</label>
                <Input value={fields.prostheticType || ""} onChange={(e) => setField("prostheticType", e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {caseType === "physiotherapy" && (
            <div>
              <label className="text-sm font-medium">نوع المرض (اختياري)</label>
              <Input value={fields.diseaseType || ""} onChange={(e) => setField("diseaseType", e.target.value)} className="mt-1" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">تكلفة الخدمة</label>
              <MoneyInput value={serviceCost || ""} onValueChange={setServiceCost} className="mt-1 bg-white" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium">المبلغ المدفوع الآن</label>
              <MoneyInput
                value={paidTouched ? (paidNow || "") : (serviceCost || "")}
                onValueChange={(n) => { setPaidNow(n); setPaidTouched(true); }}
                className="mt-1 bg-white"
                placeholder="0"
              />
            </div>
          </div>

          {/* Cost = commitment: entering a cost reveals (and requires) the
              expert + expected delivery. No cost = examination only. */}
          {isManufacturing && serviceCost <= 0 && (
            <div className="text-xs text-muted-foreground bg-slate-50 border rounded-md px-3 py-2">
              بدون كلفة: يُفعَّل النوع <b>كفحص فقط</b> دون إسناد خبير أو أمر تصنيع. عند كتابة الكلفة يظهر اختيار الخبير وتاريخ التسليم.
            </div>
          )}
          {isManufacturing && serviceCost > 0 && (
            <div className="border border-primary/40 bg-primary/5 rounded-lg p-3 space-y-2">
              <label className="text-sm font-semibold">الخبير المسؤول عن التصنيع <span className="text-red-500">*</span></label>
              {expertsLoading ? (
                <div className="text-sm text-muted-foreground">جارٍ تحميل الخبراء…</div>
              ) : experts.length === 0 ? (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                  لا يوجد خبير متاح لهذا الفرع — لا يمكن إضافة هذا النوع بكلفة.
                </div>
              ) : (
                <Select value={expertUserId} onValueChange={setExpertUserId}>
                  <SelectTrigger data-testid="select-case-expert">
                    <SelectValue placeholder="اختر الخبير" />
                  </SelectTrigger>
                  <SelectContent>
                    {experts.map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div>
                <label className="text-sm font-medium">تاريخ التسليم المتوقع <span className="text-red-500">*</span></label>
                <Input type="date" value={expectedDeliveryDate} onChange={(e) => setExpectedDeliveryDate(e.target.value)} className="mt-1" />
                <p className="text-xs text-muted-foreground mt-1">اسأل الخبير عن الموعد — يُبنى عليه نظام التنبيهات.</p>
              </div>
            </div>
          )}
          {serviceCost > 0 && remaining > 0 && (
            <div className="text-sm text-amber-700 font-semibold flex justify-between bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              <span>المتبقّي على المريض</span>
              <span className="font-mono">{remaining.toLocaleString()} د.ع</span>
            </div>
          )}

          <Button className="w-full h-11 font-semibold" disabled={!canSubmit} onClick={() => mutate()} data-testid="button-submit-case-type">
            {isPending ? (<><Loader2 className="ml-2 h-4 w-4 animate-spin" /> جارٍ الإضافة…</>) : "إضافة النوع"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
