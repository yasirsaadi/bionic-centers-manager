// **نظامُ الأقساط** (قرارُ المالك ٢٠٢٦-١٠-١٤، §4.ea) — أجزاءُ الواجهة:
//   • `InstallmentFields` — علامةُ «هذا المريض أقساط» في نافذة الدفعة، تفتح خاناتِ القسط الشهريّ وتاريخ أوّل قسط وساعة التذكير والكفيل.
//   • `InstallmentsBox` — صندوقُ الأقساط في ملفّ المريض: الخططُ وأرقامُها، والتعديلُ والإلغاءُ للمسؤول ومدير الفرع وحدهما.
//   • `PlanSummary` — سطرُ الخطّة الواحد، للصندوق ولصفحة «الأقساط».
// والقواعدُ (العددُ والمواعيدُ والمتأخّر) من `shared/installments.ts` نفسِه الذي يحسب به الخادم — فما تريه الشاشةُ هو ما يحسبه.
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CalendarClock } from "lucide-react";
import { addMonthsYmd, dmy, installmentCount, dueDates, money } from "@shared/installments";
import { DEPARTMENT_LABELS, isDepartment } from "@shared/service_taxonomy";

export interface InstallmentDraft {
  enabled: boolean;
  monthlyAmount: number;
  firstDueDate: string;
  reminderTime: string;
  guarantorName: string;
  guarantorPhone: string;
  notes: string;
}

export interface PlanFiguresView {
  count: number; paidCount: number; paidToward: number; remaining: number; nextIndex: number | null; nextDueDate: string | null;
  nextAmount: number; overdueCount: number; overdueAmount: number; completed: boolean; dates: string[];
}
export interface PlanViewRow {
  id: number; patientId: number; branchId: number; caseId: number; caseType: string; totalAmount: number; installmentAmount: number;
  firstDueDate: string; reminderTime: string; status: string; notes: string | null; guarantorName: string | null; guarantorPhone: string | null;
  createdBy: string | null; createdAt: string; updatedByName: string | null; cancelledByName: string | null; cancelReason: string | null;
  patientName: string; patientCode: string | null; patientPhone: string | null; branchName: string | null;
  figures: PlanFiguresView; effectiveStatus: "active" | "completed" | "cancelled";
}
interface PatientInstallments {
  plans: PlanViewRow[];
  cases: { caseId: number; caseType: string; remaining: number; activePlanId: number | null }[];
  canManage: boolean;
}

const baghdadToday = () => new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
export const emptyInstallmentDraft = (): InstallmentDraft => ({
  enabled: false, monthlyAmount: 0, firstDueDate: addMonthsYmd(baghdadToday(), 1), reminderTime: "10:00",
  guarantorName: "", guarantorPhone: "", notes: "",
});
export const draftToPayload = (d: InstallmentDraft) => ({
  monthlyAmount: d.monthlyAmount, firstDueDate: d.firstDueDate, reminderTime: d.reminderTime,
  guarantorName: d.guarantorName, guarantorPhone: d.guarantorPhone, notes: d.notes,
});
const deptLabel = (caseType: string) => (isDepartment(caseType) ? DEPARTMENT_LABELS[caseType] : caseType);
const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { const j = JSON.parse(raw); return j?.message ?? j?.error ?? raw; } catch { return raw; }
};

export const usePatientInstallments = (patientId: number, enabled = true) => useQuery<PatientInstallments>({
  queryKey: ["/api/patients", patientId, "installments"],
  enabled,
  queryFn: async () => (await apiRequest("GET", `/api/patients/${patientId}/installments`)).json(),
});

/**
 * علامةُ «هذا المريض أقساط» في نافذة الدفعة. لا تظهر إلّا حين يُعرف قسمُ الدفعة ويبقى عليه دينٌ بعدها، ولا خطّةَ نشطةً عليه
 * (فإن كانت تُذكر بسطرٍ: الدفعةُ تُحسب عليها تلقائياً).
 */
export function InstallmentFields({ patientId, caseType, amount, draft, onChange }: {
  patientId: number; caseType: string | null; amount: number; draft: InstallmentDraft; onChange: (d: InstallmentDraft) => void;
}) {
  const q = usePatientInstallments(patientId);
  const c = caseType ? q.data?.cases.find((x) => x.caseType === caseType) : undefined;
  const active = c?.activePlanId ? q.data?.plans.find((p) => p.id === c.activePlanId) : undefined;
  const after = c ? c.remaining - Math.max(0, amount || 0) : 0;
  useEffect(() => { if (draft.enabled && (!c || after <= 0 || active)) onChange({ ...draft, enabled: false }); }, [c?.caseId, after, active?.id]);
  if (!q.data || !c) return null;
  if (active) {
    return (
      <p className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="installment-active-note">
        على قسم {deptLabel(c.caseType)} خطّةُ أقساط — هذه الدفعةُ تُحسب عليها تلقائياً
        {active.figures.nextDueDate ? ` (القسطُ التالي ${dmy(active.figures.nextDueDate)} بمبلغ ${money(active.figures.nextAmount)})` : ""}.
      </p>
    );
  }
  if (after <= 0) return null;
  const count = installmentCount(after, draft.monthlyAmount);
  const dates = count > 0 ? dueDates(draft.firstDueDate, count) : [];
  const set = (patch: Partial<InstallmentDraft>) => onChange({ ...draft, ...patch });
  return (
    <div className="rounded-md border px-3 py-2 space-y-2" data-testid="installment-fields">
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox checked={draft.enabled} onCheckedChange={(v) => set({ enabled: v === true })} data-testid="checkbox-installments" />
        هذا المريض أقساط
      </label>
      <p className="text-xs text-muted-foreground">المتبقّي على {deptLabel(c.caseType)} بعد هذه الدفعة {money(after)}</p>
      {draft.enabled && (
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="grid gap-1 col-span-2">القسط الشهري
            <MoneyInput value={draft.monthlyAmount || ""} onValueChange={(n) => set({ monthlyAmount: n })} placeholder="مثلاً ٢٥٠٬٠٠٠" data-testid="input-installment-monthly" />
          </label>
          <label className="grid gap-1">تاريخ القسط الأوّل
            <Input type="date" dir="ltr" value={draft.firstDueDate} min={baghdadToday()} onChange={(e) => set({ firstDueDate: e.target.value })} data-testid="input-installment-first" />
          </label>
          <label className="grid gap-1">ساعة التذكير
            <Input type="time" dir="ltr" value={draft.reminderTime} onChange={(e) => set({ reminderTime: e.target.value })} data-testid="input-installment-time" />
          </label>
          <label className="grid gap-1">اسم الكفيل (اختياري)
            <Input value={draft.guarantorName} onChange={(e) => set({ guarantorName: e.target.value })} data-testid="input-installment-guarantor" />
          </label>
          <label className="grid gap-1">هاتف الكفيل (اختياري)
            <Input inputMode="tel" dir="ltr" value={draft.guarantorPhone} onChange={(e) => set({ guarantorPhone: e.target.value })} data-testid="input-installment-guarantor-phone" />
          </label>
          <label className="grid gap-1 col-span-2">ملاحظات الأقساط (اختياري)
            <Input value={draft.notes} onChange={(e) => set({ notes: e.target.value })} />
          </label>
          {count > 0 && (
            <p className="col-span-2 rounded bg-muted px-2 py-1.5 text-xs" data-testid="installment-preview">
              {count} {count === 1 ? "قسط" : "أقساط"} — الأوّل {dmy(dates[0])} والأخير {dmy(dates[dates.length - 1])}
              {after % draft.monthlyAmount !== 0 && count > 1 ? ` (الأخيرُ ${money(after - (count - 1) * draft.monthlyAmount)})` : ""}.
              يصل التذكيرُ للاستقبال ومدير الفرع وللمريض في تلغرام قبل كلّ قسطٍ بيوم وفي يومه الساعة {draft.reminderTime}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** سطرُ الخطّة: القسمُ والقسطُ والتقدّمُ والقسطُ التالي والمتأخّرُ والكفيل. */
export function PlanSummary({ p, showPatient = false }: { p: PlanViewRow; showPatient?: boolean }) {
  const f = p.figures;
  return (
    <div className="space-y-1 text-sm" data-testid={`installment-plan-${p.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        {showPatient && (
          <Link href={`/patients/${p.patientId}`} className="font-semibold text-primary hover:underline">
            {p.patientName}{p.patientCode ? ` (${p.patientCode})` : ""}
          </Link>
        )}
        <span className="font-medium">{deptLabel(p.caseType)}</span>
        <span className="text-muted-foreground">القسط {money(p.installmentAmount)} شهرياً</span>
        {p.effectiveStatus === "completed" && <Badge className="bg-emerald-600">اكتملت</Badge>}
        {p.effectiveStatus === "cancelled" && <Badge variant="secondary">أُلغيت</Badge>}
        {p.effectiveStatus === "active" && f.overdueCount > 0 && (
          <Badge variant="destructive" data-testid={`installment-overdue-${p.id}`}>متأخّر: {f.overdueCount} — {money(f.overdueAmount)}</Badge>
        )}
      </div>
      <p className="text-muted-foreground">
        المدفوع {f.paidCount} من {f.count} ({money(f.paidToward)} من {money(p.totalAmount)})
        {p.effectiveStatus === "active" && f.nextDueDate ? ` — القسطُ التالي ${dmy(f.nextDueDate)} بمبلغ ${money(f.nextAmount)}` : ""}
        {showPatient && p.branchName ? ` — ${p.branchName}` : ""}
      </p>
      {(p.guarantorName || p.guarantorPhone || (showPatient && p.patientPhone)) && (
        <p className="text-xs text-muted-foreground">
          {showPatient && p.patientPhone ? <>هاتف المريض: <span dir="ltr">{p.patientPhone}</span>{p.guarantorName || p.guarantorPhone ? " — " : ""}</> : null}
          {p.guarantorName || p.guarantorPhone ? <>الكفيل: {p.guarantorName ?? ""} {p.guarantorPhone ? <span dir="ltr">{p.guarantorPhone}</span> : null}</> : null}
        </p>
      )}
      {p.effectiveStatus === "cancelled" && p.cancelReason && <p className="text-xs text-muted-foreground">سبب الإلغاء: {p.cancelReason} — {p.cancelledByName}</p>}
    </div>
  );
}

/** صندوقُ الأقساط في ملفّ المريض — لا يظهر إن لم تكن له خطّة. */
export function InstallmentsBox({ patientId }: { patientId: number }) {
  const q = usePatientInstallments(patientId);
  const [edit, setEdit] = useState<PlanViewRow | null>(null);
  const [cancel, setCancel] = useState<PlanViewRow | null>(null);
  const plans = q.data?.plans ?? [];
  if (!plans.length) return null;
  const active = plans.filter((p) => p.effectiveStatus === "active");
  const past = plans.filter((p) => p.effectiveStatus !== "active");
  return (
    <Card className="p-4 space-y-3 border-sky-200" data-testid="installments-box">
      <div className="flex items-center gap-2 font-semibold"><CalendarClock className="w-4 h-4 text-sky-600" /> الأقساط</div>
      {active.map((p) => (
        <div key={p.id} className="rounded-md border bg-sky-50/40 p-2 space-y-2">
          <PlanSummary p={p} />
          <p className="text-xs text-muted-foreground">التذكير الساعة <span dir="ltr">{p.reminderTime}</span> قبل كلّ قسطٍ بيوم وفي يومه{p.notes ? ` — ${p.notes}` : ""}</p>
          {q.data?.canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(p)} data-testid={`installment-edit-${p.id}`}>تعديل</Button>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => setCancel(p)} data-testid={`installment-cancel-${p.id}`}>إلغاء الخطّة</Button>
            </div>
          )}
        </div>
      ))}
      {past.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">خططٌ سابقة ({past.length})</summary>
          <div className="space-y-2 pt-2">{past.map((p) => <PlanSummary key={p.id} p={p} />)}</div>
        </details>
      )}
      <EditPlanDialog plan={edit} onClose={() => setEdit(null)} />
      <CancelPlanDialog plan={cancel} onClose={() => setCancel(null)} />
    </Card>
  );
}

function useInvalidateInstallments() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: ["/api/patients"] });
    qc.invalidateQueries({ queryKey: ["/api/installments"] });
  };
}

function EditPlanDialog({ plan, onClose }: { plan: PlanViewRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const invalidate = useInvalidateInstallments();
  const [d, setD] = useState({ monthlyAmount: 0, firstDueDate: "", reminderTime: "10:00", guarantorName: "", guarantorPhone: "", notes: "" });
  useEffect(() => {
    if (plan) setD({ monthlyAmount: plan.installmentAmount, firstDueDate: plan.firstDueDate, reminderTime: plan.reminderTime,
      guarantorName: plan.guarantorName ?? "", guarantorPhone: plan.guarantorPhone ?? "", notes: plan.notes ?? "" });
  }, [plan]);
  const save = useMutation({
    mutationFn: async () => (await apiRequest("PATCH", `/api/installments/${plan!.id}`, d)).json(),
    onSuccess: () => { invalidate(); toast({ title: "عُدّلت خطّةُ الأقساط" }); onClose(); },
    onError: (e: any) => toast({ title: "تعذّر التعديل", description: errText(e), variant: "destructive" }),
  });
  const count = plan ? installmentCount(plan.totalAmount, d.monthlyAmount) : 0;
  return (
    <Dialog open={plan !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تعديل خطّة الأقساط</DialogTitle></DialogHeader>
        {plan && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p className="col-span-2 text-muted-foreground">المبلغ الكلّيّ للخطّة {money(plan.totalAmount)} — {deptLabel(plan.caseType)}</p>
            <label className="grid gap-1 col-span-2">القسط الشهري
              <MoneyInput value={d.monthlyAmount || ""} onValueChange={(n) => setD({ ...d, monthlyAmount: n })} data-testid="edit-installment-monthly" />
            </label>
            <label className="grid gap-1">تاريخ القسط الأوّل
              <Input type="date" dir="ltr" value={d.firstDueDate} onChange={(e) => setD({ ...d, firstDueDate: e.target.value })} />
            </label>
            <label className="grid gap-1">ساعة التذكير
              <Input type="time" dir="ltr" value={d.reminderTime} onChange={(e) => setD({ ...d, reminderTime: e.target.value })} />
            </label>
            <label className="grid gap-1">اسم الكفيل<Input value={d.guarantorName} onChange={(e) => setD({ ...d, guarantorName: e.target.value })} /></label>
            <label className="grid gap-1">هاتف الكفيل<Input dir="ltr" value={d.guarantorPhone} onChange={(e) => setD({ ...d, guarantorPhone: e.target.value })} /></label>
            <label className="grid gap-1 col-span-2">ملاحظات<Input value={d.notes} onChange={(e) => setD({ ...d, notes: e.target.value })} /></label>
            {count > 0 && <p className="col-span-2 text-xs text-muted-foreground">{count} {count === 1 ? "قسط" : "أقساط"} من {dmy(d.firstDueDate)}.</p>}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={save.isPending || !(d.monthlyAmount > 0)} onClick={() => save.mutate()} data-testid="edit-installment-save">حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelPlanDialog({ plan, onClose }: { plan: PlanViewRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const invalidate = useInvalidateInstallments();
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [plan]);
  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/installments/${plan!.id}/cancel`, { reason })).json(),
    onSuccess: () => { invalidate(); toast({ title: "أُلغيت خطّةُ الأقساط", description: "توقّفت تذكيراتُها، والدينُ باقٍ على القسم كما هو." }); onClose(); },
    onError: (e: any) => toast({ title: "تعذّر الإلغاء", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={plan !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>إلغاء خطّة الأقساط</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">تتوقّف التذكيرات ولا يظهر المريضُ في قائمة الأقساط. الدينُ نفسُه لا يتغيّر.</p>
        <label className="grid gap-1 text-sm">السبب<Input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="cancel-installment-reason" /></label>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>رجوع</Button>
          <Button variant="destructive" disabled={send.isPending || reason.trim().length < 3} onClick={() => send.mutate()} data-testid="cancel-installment-confirm">ألغِ الخطّة</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
