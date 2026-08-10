import { useState, useEffect } from "react";
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
import { ArrowRight, Wrench, History, PauseCircle, PlayCircle, UserCog, CalendarDays, Settings2 } from "lucide-react";
import {
  STAGE_LABELS, STATUS_LABELS, SERVICE_TYPE_LABELS,
  REWORK_TYPE_LABELS, REASON_CODE_LABELS,
  FINAL_RESULTS, FINAL_RESULT_LABELS, stagesForOrder, DELIVERED_STAGE,
  isAtOrBeyondMoldStage, defaultNextStage, nextStages, reworkReturnStages,
  HOLD_STATUSES, HOLD_REASONS, isHoldStatus, toPatientStageView,
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

  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [adminStageOpen, setAdminStageOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: orderKey });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/my-orders"] });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
    // تنبيهات التسليم تُحسب من الموعد الحالي، فتغييره يجعل ما في الذاكرة
    // كذباً: «تسليم غداً» يبقى معلّقاً بعد تأجيل الموعد أسبوعاً — والشارة
    // في القائمة الجانبية تقرأ المفتاح نفسه. والملخّص كذلك يعدّ المتأخّرين.
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/manufacturing/overview"] });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground text-sm">جارٍ التحميل…</div>;
  if (error) return (
    <div className="p-8 text-center text-sm">
      <p className="text-red-600 font-medium">غير مصرح لك بعرض هذا الأمر.</p>
      <Link href="/manufacturing"><Button variant="ghost" className="mt-3">رجوع</Button></Link>
    </div>
  );
  if (!data) return <div className="p-8 text-center text-muted-foreground text-sm">الأمر غير موجود.</div>;

  const { order, patient, timeline, rework, dateChanges = [] } = data;
  const stages = stagesForOrder(order.serviceType, order.purpose);
  const isCompleted = order.status === "completed" || order.status === "cancelled";
  const onHold = isHoldStatus(order.status);
  // شريط التقدّم من المرحلة الحالية وحدها — يرجع للخلف حين يرجع العمل.
  const progress = toPatientStageView(order);
  const forward = nextStages(order.serviceType, order.currentStage, order.purpose);
  const nextLabel = STAGE_LABELS[defaultNextStage(order.serviceType, order.currentStage, order.purpose) ?? ""] ?? "";
  // مَن يفتح هذه الصفحة أصلاً هم الثلاثة أنفسهم الذين تقبلهم نقطة الموعد
  // (`loadWritable`): الخبير المسنَد، ومدير الفرع ضمن فروعه، والإدارة —
  // فنقطة القراءة ونقطة الكتابة تتشاركان الشرط نفسه حرفياً. ولذلك الزرّ
  // ظاهر لكل مَن وصل إلى هنا، والخادم يبقى هو الحارس لا الواجهة.
  const canSetDeliveryDate = true;

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
          <Badge variant="outline" className={`text-xs ${onHold ? "border-amber-400 bg-amber-50 text-amber-800" : ""}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </Badge>
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
        <Fact label="مرات إعادة العمل" value={String(order.reworkCount ?? 0)} />
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

      {/* مسار المراحل + التقدّم */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">مسار العمل</h3>
            <span className="text-xs text-muted-foreground">{progress.stepNumber} / {progress.totalSteps}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-3">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} data-testid="bar-progress" />
          </div>
          <ol className="flex flex-wrap gap-x-2 gap-y-1 text-xs">
            {stages.map((st: string, i: number) => {
              const idx = stages.indexOf(order.currentStage);
              const done = i < idx, here = i === idx;
              return (
                <li key={st} className={here ? "font-bold text-primary" : done ? "text-slate-500" : "text-slate-300"}>
                  {STAGE_LABELS[st] ?? st}{i < stages.length - 1 && <span className="mx-1 text-slate-300">‹</span>}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* سبب التوقّف — داخلي، لا يصل المريض */}
      {onHold && order.holdReasonCode && (
        <Card className="mb-4 border-amber-300 bg-amber-50/50">
          <CardContent className="p-4 text-sm">
            <span className="font-semibold">{STATUS_LABELS[order.status]} — </span>
            {REASON_CODE_LABELS[order.holdReasonCode] ?? order.holdReasonCode}
            {order.holdNote && <p className="text-xs text-muted-foreground mt-1">{order.holdNote}</p>}
            <p className="text-[11px] text-muted-foreground mt-2">داخلي — لا يظهر للمريض. والمرحلة لم تتغيّر.</p>
          </CardContent>
        </Card>
      )}

      {/* Actions — زرّان لا أكثر */}
      {!isCompleted && (
        <div className="flex flex-wrap gap-2 mb-6">
          {onHold ? (
            <ResumeButton orderId={order.id} onDone={invalidate} />
          ) : forward.length > 0 ? (
            <Button size="lg" onClick={() => setAdvanceOpen(true)} className="gap-2" data-testid="button-advance">
              <ArrowRight className="w-5 h-5" /> الانتقال للمرحلة التالية{nextLabel ? `: ${nextLabel}` : ""}
            </Button>
          ) : null}
          {!onHold && (
            <Button size="lg" variant="outline" onClick={() => setHoldOpen(true)} className="gap-2" data-testid="button-hold">
              <PauseCircle className="w-5 h-5" /> توقّف / مشكلة
            </Button>
          )}
          {canSetDeliveryDate && (
            <Button size="sm" variant="outline" onClick={() => setDateOpen(true)} className="gap-1" data-testid="button-set-delivery-date">
              <CalendarDays className="w-4 h-4" />
              {order.expectedDeliveryDate ? "تعديل تاريخ التسليم" : "تحديد تاريخ التسليم"}
            </Button>
          )}
          {canReassign && <Button size="sm" variant="outline" onClick={() => setReassignOpen(true)} className="gap-1"><UserCog className="w-4 h-4" /> تحويل لخبير</Button>}
          {/* مخرج إداري — ليس واجهة الخبير، وسببه إلزامي ومُدقَّق. */}
          {canReassign && (
            <Button size="sm" variant="ghost" onClick={() => setAdminStageOpen(true)} className="gap-1 text-muted-foreground" data-testid="button-admin-stage">
              <Settings2 className="w-4 h-4" /> تعديل إداري للمرحلة
            </Button>
          )}
        </div>
      )}

      {/* سجلّ مواعيد التسليم — الوعد وتاريخ تحرّكه، لا الوعد الحالي وحده */}
      {dateChanges.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> سجلّ موعد التسليم
            </h3>
            <ul className="space-y-2 text-sm">
              {dateChanges.map((d: any) => (
                <li key={d.id} className="border-b last:border-0 pb-2" data-testid="row-date-change">
                  {d.previousDate ? (
                    <div>
                      <span className="text-muted-foreground">من: </span>
                      <span className="font-medium line-through decoration-slate-400">{fmtD(d.previousDate)}</span>
                      <span className="mx-2 text-slate-400">←</span>
                      <span className="text-muted-foreground">إلى: </span>
                      <span className="font-semibold">{fmtD(d.newDate)}</span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-muted-foreground">تم تحديد الموعد: </span>
                      <span className="font-semibold">{fmtD(d.newDate)}</span>
                    </div>
                  )}
                  {d.reason && (
                    <p className="text-xs text-muted-foreground mt-0.5">السبب: {d.reason}</p>
                  )}
                  <div className="text-[11px] text-muted-foreground">{d.byName ?? "—"} • {fmt(d.at)}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
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

      <AdvanceDialog open={advanceOpen} onOpenChange={setAdvanceOpen} order={order} onDone={invalidate} />
      <HoldDialog open={holdOpen} onOpenChange={setHoldOpen} order={order} onDone={invalidate} />
      {canReassign && <AdminStageDialog open={adminStageOpen} onOpenChange={setAdminStageOpen} order={order} stages={stages} onDone={invalidate} />}
      <DeliveryDateDialog open={dateOpen} onOpenChange={setDateOpen} orderId={order.id} current={order.expectedDeliveryDate} onDone={invalidate} />
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

// Standalone delivery-date entry, reachable from the order page the expert
// actually works in. Kept separate from the stage dialog so committing a date
// never requires also moving the order to a new stage.
function DeliveryDateDialog({ open, onOpenChange, orderId, current, onDone }: any) {
  // Pre-filled with the current value: an empty controlled <input type="date">
  // misbehaves on iOS Safari (the pick often doesn't stick), which is exactly
  // the device the experts use on the floor.
  const [date, setDate] = useState(current ?? "");
  const [reason, setReason] = useState("");
  useEffect(() => { setDate(current ?? ""); setReason(""); }, [current, open]);
  const m = useAction(`/api/manufacturing/orders/${orderId}/delivery-date`, "PATCH", () => { onOpenChange(false); onDone(); });
  const isFirstCommit = !current;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isFirstCommit ? "تحديد تاريخ التسليم" : "تعديل تاريخ التسليم"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!isFirstCommit && (
            <div className="text-sm">
              <span className="text-muted-foreground">الموعد الحالي: </span>
              <span className="font-semibold">{fmtD(current)}</span>
            </div>
          )}
          <div>
            <label className="text-sm font-medium">تاريخ التسليم للمريض <span className="text-red-500">*</span></label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 bg-white" data-testid="input-delivery-date" />
            <p className="text-xs text-muted-foreground mt-1">
              {isFirstCommit
                ? "عليه تُقاس دقّة التسليم. وبعد تحديده يمكنك أنت أو مدير الفرع أو الإدارة تغييره، وكلّ تغيير يتطلّب سبباً ويُسجَّل في السجلّ."
                : "يُسجَّل التغيير وسببه في سجلّ موعد التسليم وملف المريض، ولا يُمحى الموعد السابق."}
            </p>
          </div>
          {!isFirstCommit && (
            <div>
              <label className="text-sm font-semibold">سبب التغيير <span className="text-red-500">*</span></label>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: تأخّر وصول مفصل الركبة من المورّد"
                className="mt-1 bg-white"
                data-testid="input-delivery-date-reason"
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            disabled={!date || date === (current ?? "") || (!isFirstCommit && !reason.trim()) || m.isPending}
            onClick={() => m.mutate({ expectedDeliveryDate: date, reason: reason.trim() || undefined })}
            data-testid="button-save-delivery-date"
          >
            {m.isPending ? "جارٍ الحفظ…" : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResumeButton({ orderId, onDone }: any) {
  const m = useAction(`/api/manufacturing/orders/${orderId}/resume`, "POST", onDone);
  return (
    <Button size="lg" onClick={() => m.mutate({})} disabled={m.isPending} className="gap-2" data-testid="button-resume">
      <PlayCircle className="w-5 h-5" /> إلغاء التوقّف ومتابعة العمل
    </Button>
  );
}

// الانتقال للمرحلة التالية — وجهة واحدة محدَّدة سلفاً، بلا قائمة مراحل.
// (والاستثناء الوحيد: مسند لا يحتاج قالباً يجوز له تخطّيه.)
function AdvanceDialog({ open, onOpenChange, order, onDone }: any) {
  const options = nextStages(order.serviceType, order.currentStage, order.purpose);
  const [toStage, setToStage] = useState(options[0] ?? "");
  const [notes, setNotes] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [finalResult, setFinalResult] = useState("");
  useEffect(() => { setToStage(options[0] ?? ""); setNotes(""); setDeliveryDate(""); setFinalResult(""); }, [open, order.currentStage]);
  const m = useAction(`/api/manufacturing/orders/${order.id}/advance`, "PATCH", () => { onOpenChange(false); onDone(); });
  const isMaintenance = order.purpose === "maintenance";
  const needsResult = toStage === DELIVERED_STAGE;
  const needsDelivery = !!toStage && !order.expectedDeliveryDate
    && isAtOrBeyondMoldStage(order.serviceType, toStage, order.purpose);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>الانتقال للمرحلة التالية</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <span className="text-muted-foreground">من: </span>{STAGE_LABELS[order.currentStage] ?? order.currentStage}
            <span className="mx-2 text-slate-400">←</span>
            <span className="font-semibold">{STAGE_LABELS[toStage] ?? toStage}</span>
          </div>
          {options.length > 1 && (
            <div>
              <label className="text-sm font-medium">
                {isMaintenance ? "ما الذي أُنجِز؟" : "هذا المسند لا يحتاج قالباً؟"}
              </label>
              <Select value={toStage} onValueChange={setToStage}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {options.map((st: string) => <SelectItem key={st} value={st}>{STAGE_LABELS[st] ?? st}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {isMaintenance
                  ? "اختر ما جرت صيانته فعلاً — الاختيار يُنهي أمر الصيانة."
                  : "اختر «التصنيع والتجهيز» لتخطّي مرحلة القالب."}
              </p>
            </div>
          )}
          {needsResult && (
            <div>
              <label className="text-sm font-medium">نتيجة التصنيع والملاءمة <span className="text-red-500">*</span></label>
              <Select value={finalResult} onValueChange={setFinalResult}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر النتيجة" /></SelectTrigger>
                <SelectContent>
                  {FINAL_RESULTS.map((r) => <SelectItem key={r} value={r}>{FINAL_RESULT_LABELS[r]}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">داخلية — لا تُعرض للمريض.</p>
            </div>
          )}
          {needsDelivery && (
            <div className="border border-amber-300 bg-amber-50 rounded-md p-3">
              <label className="text-sm font-semibold">تاريخ التسليم للمريض <span className="text-red-500">*</span></label>
              <Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="mt-1 bg-white" data-testid="input-mold-delivery-date" />
              <p className="text-xs text-muted-foreground mt-1">إلزامي عند بلوغ القالب — وعليه تُقاس دقّة التسليم. وبعد تحديده يمكنك أنت أو مدير الفرع أو الإدارة تغييره، وكلّ تغيير يتطلّب سبباً ويُسجَّل في السجلّ.</p>
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
            data-testid="button-confirm-advance"
            onClick={() => m.mutate({ toStage, notes: notes || undefined, expectedDeliveryDate: needsDelivery ? deliveryDate : undefined, finalResult: finalResult || undefined })}>
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// توقّف / مشكلة — أربعة أنواع، وأسبابها داخلية بحتة.
// وإعادة العمل الفني وحدها تسأل عن المرحلة التي يُرجَع إليها.
function HoldDialog({ open, onOpenChange, order, onDone }: any) {
  const [status, setStatus] = useState<string>("");
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [returnToStage, setReturnToStage] = useState("");
  useEffect(() => { setStatus(""); setReasonCode(""); setNote(""); setReturnToStage(""); }, [open]);
  const m = useAction(`/api/manufacturing/orders/${order.id}/hold`, "POST", () => { onOpenChange(false); onDone(); });
  const reasons = status && isHoldStatus(status) ? HOLD_REASONS[status] : [];
  const isRework = status === "technical_rework";
  const returnOptions = reworkReturnStages(order.serviceType, order.currentStage, order.purpose);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>توقّف / مشكلة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">نوع التوقّف</label>
            <Select value={status} onValueChange={(v) => { setStatus(v); setReasonCode(""); setReturnToStage(""); }}>
              <SelectTrigger className="mt-1" data-testid="select-hold-type"><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>
                {HOLD_STATUSES.map((st) => <SelectItem key={st} value={st}>{STATUS_LABELS[st]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {reasons.length > 0 && (
            <div>
              <label className="text-sm font-medium">السبب <span className="text-red-500">*</span></label>
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger className="mt-1" data-testid="select-hold-reason"><SelectValue placeholder="اختر السبب" /></SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {isRework && (
            <div className="border border-amber-300 bg-amber-50 rounded-md p-3">
              <label className="text-sm font-semibold">الرجوع إلى مرحلة <span className="text-red-500">*</span></label>
              {returnOptions.length === 0 ? (
                <p className="text-xs text-red-600 mt-1">لا توجد مرحلة سابقة يمكن الرجوع إليها.</p>
              ) : (
                <>
                  <Select value={returnToStage} onValueChange={setReturnToStage}>
                    <SelectTrigger className="mt-1 bg-white" data-testid="select-return-stage"><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
                    <SelectContent>
                      {returnOptions.map((st: string) => <SelectItem key={st} value={st}>{STAGE_LABELS[st] ?? st}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">يُسجَّل الرجوع وسببه في الخطّ الزمني. والمريض يرى المرحلة الجديدة فقط.</p>
                </>
              )}
            </div>
          )}
          <div>
            <label className="text-sm font-medium">ملاحظة داخلية (اختياري)</label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            {isRework ? "إعادة العمل الفني هي المسار الوحيد للرجوع بمرحلة." : "التوقّف لا يغيّر المرحلة الحالية."}
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            data-testid="button-confirm-hold"
            disabled={!status || !reasonCode || (isRework && !returnToStage) || m.isPending}
            onClick={() => m.mutate({ status, reasonCode, note: note || undefined, returnToStage: isRework ? returnToStage : undefined })}>
            تأكيد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// مخرج إداري — للمدير والمسؤول وحدهما، بسبب إلزامي ومُدقَّق.
function AdminStageDialog({ open, onOpenChange, order, stages, onDone }: any) {
  const [toStage, setToStage] = useState("");
  const [reason, setReason] = useState("");
  const [finalResult, setFinalResult] = useState("");
  useEffect(() => { setToStage(""); setReason(""); setFinalResult(""); }, [open]);
  const m = useAction(`/api/manufacturing/orders/${order.id}/stage`, "PATCH", () => { onOpenChange(false); onDone(); });
  const needsResult = toStage === DELIVERED_STAGE;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تعديل إداري للمرحلة</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            ليس مسار العمل العادي. يُستعمل لتصحيح بيانات فقط، ويُسجَّل في سجلّ التدقيق.
          </p>
          <Select value={toStage} onValueChange={setToStage}>
            <SelectTrigger><SelectValue placeholder="اختر المرحلة" /></SelectTrigger>
            <SelectContent>
              {stages.filter((st: string) => st !== order.currentStage).map((st: string) => (
                <SelectItem key={st} value={st}>{STAGE_LABELS[st] ?? st}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {needsResult && (
            <Select value={finalResult} onValueChange={setFinalResult}>
              <SelectTrigger><SelectValue placeholder="نتيجة التصنيع والملاءمة" /></SelectTrigger>
              <SelectContent>{FINAL_RESULTS.map((r) => <SelectItem key={r} value={r}>{FINAL_RESULT_LABELS[r]}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="سبب التعديل الإداري (إلزامي)" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button disabled={!toStage || !reason.trim() || (needsResult && !finalResult) || m.isPending}
            onClick={() => m.mutate({ toStage, reason: reason.trim(), finalResult: finalResult || undefined })}>
            تأكيد
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
