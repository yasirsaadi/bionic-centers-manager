import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranchSession } from "@/components/BranchGate";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Wrench, History, RotateCcw, UserCog } from "lucide-react";
import {
  STAGE_LABELS, STATUS_LABELS, STATUSES, SERVICE_TYPE_LABELS,
  REWORK_TYPES, REWORK_TYPE_LABELS, REASON_CODES, REASON_CODE_LABELS,
  FINAL_RESULTS, FINAL_RESULT_LABELS, stagesForOrder, DELIVERED_STAGE, isAtOrBeyondMoldStage,
} from "@shared/manufacturing";

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "medium", timeStyle: "short" });
}
function fmtD(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-IQ", { year: "numeric", month: "short", day: "numeric" });
}

export default function ManufacturingOrder() {
  const { id } = useParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useBranchSession();
  const isAdmin = !!session?.isAdmin;
  const isManager = session?.role === "branch_manager";
  const canReassign = isAdmin || isManager;

  const orderKey = [`/api/manufacturing/orders/${id}`];
  const { data, isLoading, error } = useQuery<any>({
    queryKey: orderKey,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/orders/${id}`, { credentials: "include" });
      if (res.status === 403) throw new Error("forbidden");
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
  });

  const [stageOpen, setStageOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [reworkOpen, setReworkOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orderKey });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/my-orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">جارٍ التحميل…</div>;
  if (error) return (
    <div className="p-8 text-center text-sm">
      <p className="text-red-600 font-medium">غير مصرح لك بعرض هذا الأمر.</p>
      <Link href="/manufacturing"><Button variant="ghost" className="mt-3">رجوع</Button></Link>
    </div>
  );
  if (!data) return <div className="p-8 text-center text-muted-foreground text-sm">الأمر غير موجود.</div>;

  const { order, patient, timeline, rework } = data;
  const stages = stagesForOrder(order.serviceType, order.purpose);
  const isCompleted = order.status === "completed" || order.status === "cancelled";

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto" dir="rtl">
      <Link href="/manufacturing">
        <Button variant="ghost" size="sm" className="mb-3 gap-1"><ArrowRight className="w-4 h-4" /> رجوع لوحدة التصنيع</Button>
      </Link>

      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5 text-primary" />
            {patient?.name ?? "—"}
          </h1>
          <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <span>{SERVICE_TYPE_LABELS[order.serviceType as "prosthetic"] ?? order.serviceType}</span>
            <span>الفرع: {patient?.branchName ?? "—"}</span>
            <span>الخبير: {order.expertName ?? "—"}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="outline" className="text-sm">{STAGE_LABELS[order.currentStage] ?? order.currentStage}</Badge>
          <Badge variant="outline" className="text-xs">{STATUS_LABELS[order.status] ?? order.status}</Badge>
        </div>
      </div>

      {/* Patient (allowed fields only — NO financial data) */}
      <Card className="mb-4">
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Info label="العمر" value={patient?.age} />
          <Info label="الوزن" value={patient?.weight} />
          <Info label="الطول" value={patient?.height} />
          <Info label="تاريخ الإصابة" value={patient?.injuryDate} />
          <Info label="سبب الإصابة" value={patient?.injuryCause} />
          <Info label="موقع البتر" value={patient?.amputationSite} />
          <Info label="نوع الطرف" value={patient?.prostheticType} />
          <Info label="نوع المسند" value={patient?.supportType} />
          <Info label="جهة الإصابة" value={patient?.injurySide} />
          <Info label="تصنيف المريض" value={patient?.patientClassification} />
        </CardContent>
      </Card>

      {/* Key facts */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4 text-sm">
        <Fact label="الخبير المسؤول" value={order.expertName ?? "—"} />
        <Fact label="تاريخ الإسناد" value={fmtD(order.createdAt)} />
        <Fact label="بدء العمل" value={fmtD(order.startedAt)} />
        <Fact label="التسليم المتوقّع" value={fmtD(order.expectedDeliveryDate)} />
        <Fact label="إعادة قالب / سوكت" value={`${order.recastCount} / ${order.resocketCount}`} />
      </div>

      {order.status === "completed" && order.finalResult && (
        <Card className="mb-4 border-green-300 bg-green-50/40">
          <CardContent className="p-4 text-sm">
            <span className="font-semibold">نتيجة التصنيع والملاءمة: </span>
            {FINAL_RESULT_LABELS[order.finalResult] ?? order.finalResult}
            {order.finalNotes && <p className="text-xs text-muted-foreground mt-1">{order.finalNotes}</p>}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isCompleted && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Button size="sm" onClick={() => setStageOpen(true)} className="gap-1"><ArrowRight className="w-4 h-4" /> الانتقال لمرحلة</Button>
          <Button size="sm" variant="outline" onClick={() => setStatusOpen(true)}>تغيير الحالة</Button>
          <Button size="sm" variant="outline" onClick={() => setReworkOpen(true)} className="gap-1"><RotateCcw className="w-4 h-4" /> تسجيل إعادة عمل</Button>
          {canReassign && <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)} className="gap-1"><UserCog className="w-4 h-4" /> تحويل لخبير</Button>}
        </div>
      )}

      {/* Timeline */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2"><History className="w-4 h-4 text-primary" /> الخطّ الزمني</h3>
          <ol className="space-y-3 border-r-2 border-slate-100 pr-4">
            {timeline.map((h: any) => (
              <li key={h.id} className="relative">
                <span className="absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary" />
                <div className="text-sm">
                  {h.actionType === "reassigned" ? "تحويل خبير"
                    : h.actionType === "rework" ? "إعادة عمل"
                    : h.actionType === "date_change" ? "تغيير موعد التسليم"
                    : h.actionType === "status_change" ? "تغيير حالة"
                    : h.actionType === "delivered" ? "تسليم"
                    : h.actionType === "created" ? "إنشاء الأمر"
                    : `${STAGE_LABELS[h.fromStage] ?? h.fromStage ?? ""} ← ${STAGE_LABELS[h.toStage] ?? h.toStage ?? ""}`}
                </div>
                {h.notes && <div className="text-xs text-muted-foreground">{h.notes}</div>}
                <div className="text-[11px] text-muted-foreground">{h.performedByName ?? "—"} • {fmt(h.createdAt)}</div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Rework log */}
      {rework.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3">سجل إعادة العمل</h3>
            <ul className="space-y-2 text-sm">
              {rework.map((r: any) => (
                <li key={r.id} className="border-b last:border-0 pb-2">
                  <span className="font-medium">{REWORK_TYPE_LABELS[r.reworkType] ?? r.reworkType}</span>
                  {r.reasonCode && <span className="text-muted-foreground"> — {REASON_CODE_LABELS[r.reasonCode] ?? r.reasonCode}</span>}
                  {r.stageWhenDetected && <span className="text-xs text-muted-foreground"> (اكتُشف في: {STAGE_LABELS[r.stageWhenDetected] ?? r.stageWhenDetected})</span>}
                  {r.reasonDetails && <p className="text-xs text-muted-foreground mt-0.5">{r.reasonDetails}</p>}
                  <div className="text-[11px] text-muted-foreground">{r.createdByName ?? "—"} • {fmt(r.createdAt)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <StageDialog open={stageOpen} onOpenChange={setStageOpen} orderId={order.id} stages={stages} currentStage={order.currentStage} serviceType={order.serviceType} deliveryDateSet={!!order.expectedDeliveryDate} onDone={invalidate} />
      <StatusDialog open={statusOpen} onOpenChange={setStatusOpen} orderId={order.id} onDone={invalidate} />
      <ReworkDialog open={reworkOpen} onOpenChange={setReworkOpen} orderId={order.id} stages={stages} currentStage={order.currentStage} onDone={invalidate} />
      {canReassign && <ReassignDialog open={reassignOpen} onOpenChange={setReassignOpen} orderId={order.id} branchId={order.branchId} currentExpert={order.expertUserId} onDone={invalidate} />}
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div>{value || "—"}</div></div>;
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Card><CardContent className="p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium text-sm mt-0.5">{value}</div>
    </CardContent></Card>
  );
}

// ---- dialogs ----------------------------------------------------------------

function useAction(url: string, method: string, onDone: () => void) {
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || "فشلت العملية"); }
      return res.json();
    },
    onSuccess: () => { toast({ title: "تم" }); onDone(); },
    onError: (err: any) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });
}

function StageDialog({ open, onOpenChange, orderId, stages, currentStage, serviceType, deliveryDateSet, onDone }: any) {
  const [toStage, setToStage] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [finalResult, setFinalResult] = useState("");
  const m = useAction(`/api/manufacturing/orders/${orderId}/stage`, "PATCH", () => { onOpenChange(false); reset(); onDone(); });
  function reset() { setToStage(""); setNotes(""); setDeliveryDate(""); setFinalResult(""); }
  const needsResult = toStage === DELIVERED_STAGE;
  // Reaching the mold stage requires committing to a delivery date — but only
  // if one hasn't already been set (it locks after that).
  const needsDelivery = !!toStage && !deliveryDateSet && isAtOrBeyondMoldStage(serviceType, toStage);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>الانتقال إلى مرحلة جديدة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">المرحلة الجديدة</label>
            <Select value={toStage} onValueChange={setToStage}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
              <SelectContent>
                {stages.filter((s: string) => s !== currentStage).map((s: string) => (
                  <SelectItem key={s} value={s}>{STAGE_LABELS[s] ?? s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {needsResult && (
            <div>
              <label className="text-sm font-medium">نتيجة التصنيع والملاءمة <span className="text-red-500">*</span></label>
              <Select value={finalResult} onValueChange={setFinalResult}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر النتيجة" /></SelectTrigger>
                <SelectContent>
                  {FINAL_RESULTS.map((r) => <SelectItem key={r} value={r}>{FINAL_RESULT_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {needsDelivery && (
            <div className="border border-amber-300 bg-amber-50 rounded-md p-3">
              <label className="text-sm font-semibold flex items-center gap-1">تاريخ التسليم للمريض <span className="text-red-500">*</span></label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1 bg-white" data-testid="input-mold-delivery-date" />
              <p className="text-xs text-muted-foreground mt-1">إلزامي عند أخذ القالب. بعد تحديده لا يتغيّر إلا من إدارة الفرع/العامة — وعليه تُقاس دقّة التسليم.</p>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">ملاحظات فنّية (اختياري)</label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!toStage || (needsResult && !finalResult) || (needsDelivery && !deliveryDate) || m.isPending}
            onClick={() => m.mutate({ toStage, notes: notes || undefined, expectedDeliveryDate: needsDelivery ? deliveryDate : undefined, finalResult: finalResult || undefined })}>
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatusDialog({ open, onOpenChange, orderId, onDone }: any) {
  const [status, setStatus] = useState("");
  const [notes, setNotes] = useState("");
  const m = useAction(`/api/manufacturing/orders/${orderId}/status`, "PATCH", () => { onOpenChange(false); setStatus(""); setNotes(""); onDone(); });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تغيير حالة الأمر</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
          </Select>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="ملاحظة (اختياري)" />
          <p className="text-xs text-muted-foreground">تغيير الحالة لا يغيّر المرحلة الحالية.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!status || m.isPending} onClick={() => m.mutate({ status, notes: notes || undefined })}>تأكيد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReworkDialog({ open, onOpenChange, orderId, stages, currentStage, onDone }: any) {
  const [reworkType, setReworkType] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetails, setReasonDetails] = useState("");
  const [stageWhenDetected, setStageWhenDetected] = useState(currentStage);
  const m = useAction(`/api/manufacturing/orders/${orderId}/rework`, "POST", () => { onOpenChange(false); onDone(); });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تسجيل إعادة عمل</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">نوع إعادة العمل</label>
            <Select value={reworkType} onValueChange={setReworkType}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>{REWORK_TYPES.map((r) => <SelectItem key={r} value={r}>{REWORK_TYPE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">سبب الإعادة</label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
              <SelectContent>{REASON_CODES.map((r) => <SelectItem key={r} value={r}>{REASON_CODE_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">المرحلة التي ظهرت فيها المشكلة</label>
            <Select value={stageWhenDetected} onValueChange={setStageWhenDetected}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{stages.map((s: string) => <SelectItem key={s} value={s}>{STAGE_LABELS[s] ?? s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea value={reasonDetails} onChange={(e) => setReasonDetails(e.target.value)} rows={2} placeholder="شرح تفصيلي" />
          <p className="text-xs text-muted-foreground">إعادة القالب/السوكت تُغيّر الحالة تلقائياً وتبقي كل السجلات السابقة.</p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!reworkType || m.isPending}
            onClick={() => m.mutate({ reworkType, reasonCode: reasonCode || undefined, reasonDetails: reasonDetails || undefined, stageWhenDetected })}>
            تسجيل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReassignDialog({ open, onOpenChange, orderId, branchId, currentExpert, onDone }: any) {
  const [newExpertUserId, setNewExpertUserId] = useState("");
  const [reason, setReason] = useState("");
  const { data: experts = [] } = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", branchId, open],
    enabled: open,
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
  const m = useAction(`/api/manufacturing/orders/${orderId}/reassign`, "PATCH", () => { onOpenChange(false); setNewExpertUserId(""); setReason(""); onDone(); });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تحويل الأمر إلى خبير آخر</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Select value={newExpertUserId} onValueChange={setNewExpertUserId}>
            <SelectTrigger><SelectValue placeholder="اختر الخبير الجديد" /></SelectTrigger>
            <SelectContent>
              {experts.filter((e) => e.id !== currentExpert).map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="سبب التحويل (إلزامي)" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!newExpertUserId || !reason.trim() || m.isPending}
            onClick={() => m.mutate({ newExpertUserId: Number(newExpertUserId), reason })}>
            تحويل
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
