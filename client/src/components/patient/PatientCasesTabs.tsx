import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Activity, Wrench, HeartPulse, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDateIraq } from "@/lib/utils";
import { useBranchSession } from "@/components/BranchGate";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";

// Phase 2 (relocated): the case selector lives as clickable CHIPS in the
// patient header (next to the branch), and clicking a chip shows that case's
// fully independent view — its own details, cost, paid/remaining, visits and
// payments (case_id-attributed). One patient, a separate page per specialty.

export interface CaseRow {
  id: number;
  caseType: "physiotherapy" | "prosthetic" | "medical_support" | string;
  status: string;
  cost: number;
  paid: number;
  remaining: number;
  visitCount: number;
  details: Record<string, any> | null;
}

const CASE_META: Record<string, { label: string; icon: any }> = {
  physiotherapy: { label: "علاج طبيعي", icon: Activity },
  prosthetic: { label: "أطراف صناعية", icon: Wrench },
  medical_support: { label: "مساند طبية", icon: HeartPulse },
};
const meta = (t: string) => CASE_META[t] ?? { label: t, icon: Activity };

const DETAIL_LABELS: Record<string, string> = {
  amputationSite: "موقع البتر", prostheticType: "نوع الطرف",
  siliconType: "نوع السيليكون", siliconSize: "قياس السيليكون",
  suspensionSystem: "نظام التعليق", footType: "نوع القدم",
  footSize: "قياس الحذاء", kneeJointType: "نوع مفصل الركبة",
  injurySide: "الجهة", injuryCause: "سبب الإصابة", injuryDate: "تاريخ الإصابة",
  injuryType: "نوع الإصابة", diseaseType: "التشخيص", injuryArea: "منطقة الإصابة",
  treatmentType: "نوع العلاج", supportType: "نوع المسند",
};

const fmtIQD = (n: number) => `${(n || 0).toLocaleString("en-US")} د.ع`;

// Clickable chips for the header — one per case, plus «الكل» (id -1) which
// clears the case filter so every visit/payment shows regardless of case.
export function PatientCaseChips({ cases, selectedId, onSelect }: {
  cases: CaseRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <>
      {cases.length > 1 && (
        <button
          key="all"
          type="button"
          onClick={() => onSelect(-1)}
          data-testid="case-chip-all"
          className={`inline-flex items-center gap-1 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-base font-medium transition-colors border ${
            selectedId === -1
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-white text-primary border-primary/30 hover:bg-primary/5"
          }`}
        >
          الكل
        </button>
      )}
      {cases.map((c) => {
        const m = meta(c.caseType);
        const Icon = m.icon;
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            data-testid={`case-chip-${c.id}`}
            className={`inline-flex items-center gap-1 rounded-full px-3 md:px-4 py-1 md:py-1.5 text-xs md:text-base font-medium transition-colors border ${
              active
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-white text-primary border-primary/30 hover:bg-primary/5"
            }`}
          >
            <Icon className="w-3.5 h-3.5" /> {m.label}
          </button>
        );
      })}
    </>
  );
}

// The selected case's fully independent panel.
// The selected case's header: its finances + type-specific details. The
// case's visits and payments render in the tabs below (filtered by case),
// so they are NOT duplicated here.
export function PatientCasePanel({ caseRow, patientId }: { caseRow: CaseRow; patientId: number }) {
  const details = caseRow.details || {};
  const detailKeys = Object.keys(DETAIL_LABELS).filter((k) => details[k]);
  const m = meta(caseRow.caseType);
  const Icon = m.icon;

  const session = useBranchSession();
  const canEditCost = !!session?.isAdmin || session?.role === "branch_manager";
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<number>(caseRow.cost || 0);

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/cases/${caseRow.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ cost: draft }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر الحفظ"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", patientId, "cases"] });
      setEditing(false);
      toast({ title: "تم تحديث كلفة الحالة" });
    },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const remaining = (caseRow.cost || 0) - (caseRow.paid || 0);

  // ADMIN-ONLY «حذف نوع الحالة» — also cleans ghost cases (flag wiped by the
  // old destructive edit while the case row survived showing a stale cost).
  const isAdminOnly = !!session?.isAdmin;
  const removeCase = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/case-type/${caseRow.caseType}`, {
        method: "DELETE", credentials: "include",
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "تعذّر الحذف"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/patients/:id", patientId] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      toast({ title: "حُذف نوع الحالة", description: "نُقلت زياراته ودفعاته إلى الحالة المتبقية." });
    },
    onError: (err: any) => toast({ title: "تعذّر الحذف", description: err.message, variant: "destructive" }),
  });

  return (
    <Card className="p-4 md:p-6 rounded-2xl shadow-sm border-primary/20 mb-6 space-y-4">
      <h3 className="font-bold text-lg text-primary flex items-center gap-2">
        <Icon className="w-5 h-5" /> {m.label}
        {isAdminOnly && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button type="button" className="mr-auto text-red-400 hover:text-red-600" title="حذف نوع الحالة (المدير العام)" data-testid={`delete-case-${caseRow.id}`}>
                <Trash2 className="w-4 h-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl">
              <AlertDialogHeader>
                <AlertDialogTitle>حذف حالة «{m.label}» من ملف المريض؟</AlertDialogTitle>
                <AlertDialogDescription>
                  تُنقل زيارات ودفعات هذه الحالة إلى الحالة المتبقية (لا تُحذف)، وتُصفَّر حقول النوع من الملف. يُمنع الحذف إن وُجد سجل تصنيع أو دفعات موسومة لهذا النوع. هذا الإجراء للمدير العام حصراً ويُسجَّل في سجل التدقيق.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2">
                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => removeCase.mutate()}>حذف الحالة</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </h3>

      {/* Financial summary for THIS case */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center text-slate-700 bg-slate-50 relative">
          <div className="text-xs opacity-80 flex items-center justify-center gap-1">
            التكلفة
            {canEditCost && !editing && (
              <button type="button" onClick={() => { setDraft(caseRow.cost || 0); setEditing(true); }} data-testid={`edit-case-cost-${caseRow.id}`} className="text-primary hover:opacity-70">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-1 mt-1">
              <MoneyInput value={draft} onValueChange={setDraft} className="h-8 text-center" />
              <button type="button" disabled={save.isPending} onClick={() => save.mutate()} className="text-green-600" data-testid={`save-case-cost-${caseRow.id}`}><Check className="w-4 h-4" /></button>
              <button type="button" onClick={() => setEditing(false)} className="text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <div className="font-bold text-sm md:text-base">{fmtIQD(caseRow.cost)}</div>
          )}
        </div>
        <StatBox label="المدفوع" value={fmtIQD(caseRow.paid)} tone="green" />
        <StatBox label="المتبقّي" value={fmtIQD(remaining)} tone={remaining > 0 ? "red" : "green"} />
      </div>

      {detailKeys.length > 0 && (
        <div className="rounded-xl border p-3">
          <p className="text-sm font-semibold text-primary mb-2">التفاصيل</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {detailKeys.map((k) => (
              <div key={k}>
                <div className="text-xs text-muted-foreground">{DETAIL_LABELS[k]}</div>
                <div className="font-medium">{k === "injuryDate" ? formatDateIraq(details[k]) : String(details[k])}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function StatBox({ label, value, tone }: { label: string; value: string; tone: "slate" | "green" | "red" }) {
  const toneCls = tone === "green" ? "text-green-700 bg-green-50" : tone === "red" ? "text-red-700 bg-red-50" : "text-slate-700 bg-slate-50";
  return (
    <div className={`rounded-xl p-3 text-center ${toneCls}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="font-bold text-sm md:text-base">{value}</div>
    </div>
  );
}
