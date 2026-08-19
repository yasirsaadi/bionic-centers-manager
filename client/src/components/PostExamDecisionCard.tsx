// بطاقةُ «قرار المريض بعد المعاينة» في صفحة المريض.
//
// ══ الأزرار تتبع الصلاحية والحالة والطالبَ معاً ═════════════════════════
// الاستعلامات يرى «بانتظار اعتماد الخصم» بلا زرّ، والمخوَّلُ يرى «اعتماد /
// رفض» — **إلّا إن كان هو مَن طلب**، فالطلبُ يحتاج رأياً ثانياً.
//
// وهذا كلُّه **عرضٌ لا حراسة**: الخادم يفحص كلّ كتابة مهما أظهرت الواجهة،
// و`allowedActions` و`computeDiscount` مشتركتان بينهما فلا تنحرف قاعدةٌ
// عن قاعدة ولا يعرض النموذجُ رقماً يخالف ما سيُحسب هناك.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Loader2, CircleDollarSign, CalendarClock, XCircle, RotateCcw, UserCog,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import {
  allowedActions, canSelectExpert, computeDiscount,
  DISCOUNT_MODES, DISCOUNT_MODE_LABELS, DISCOUNT_REASONS, DISCOUNT_REASON_LABELS,
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUS_LABELS,
  type DiscountMode, type DiscountReason, type FollowupReason, type FollowupStatus,
} from "@shared/followup";

interface Followup {
  id: number;
  serviceType: string;
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  examDoctorName: string | null;
  examSignedAt: string | null;
  nextFollowUpAt: string | null;
  noScheduledFollowUp: boolean;
  lastReason: string | null;
  lastNote: string | null;
  lastContactAt: string | null;
  closedReason: string | null;
  convertedWorkOrderId: number | null;
  events: any[];
  priceRequests: any[];
}

const SERVICE_LABELS: Record<string, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};

const STATUS_TONE: Record<string, string> = {
  awaiting_patient_decision: "bg-amber-100 text-amber-800",
  follow_up: "bg-amber-50 text-amber-700",
  price_approval_pending: "bg-blue-100 text-blue-800",
  price_approved_waiting_patient: "bg-violet-100 text-violet-800",
  purchase_approval_pending: "bg-blue-100 text-blue-800",
  closed_without_purchase: "bg-gray-100 text-gray-600",
  converted: "bg-green-100 text-green-800",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ar-IQ", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";

/** موعدٌ افتراضي مقترَح — أسبوعٌ من اليوم. والمستخدم يغيّره كما يشاء. */
function defaultNextDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function PostExamDecisionCard({ patientId }: { patientId: number }) {
  const session = useBranchSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<string | null>(null);
  const [reason, setReason] = useState<FollowupReason>("needs_time");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(defaultNextDate());
  const [noSchedule, setNoSchedule] = useState(false);
  const [discountMode, setDiscountMode] = useState<DiscountMode>("amount");
  const [discountValue, setDiscountValue] = useState("");
  const [discountReason, setDiscountReason] = useState<DiscountReason>("patient_negotiation");
  const [expertId, setExpertId] = useState("");

  const { data: followups, isLoading } = useQuery<Followup[]>({
    queryKey: [`/api/followups/patient/${patientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/followups/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: experts } = useQuery<any[]>({
    queryKey: ["/api/manufacturing/experts"],
    queryFn: async () => {
      const res = await fetch("/api/manufacturing/experts", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    //  تُقرأ دائماً: الاستعلامات تغيّر الخبير من البطاقة نفسها.
    enabled: true,
  });

  const active = (followups ?? [])[0] ?? null;

  const reset = () => {
    setDialog(null); setNote(""); setExpertId("");
    setDiscountMode("amount"); setDiscountValue(""); setDiscountReason("patient_negotiation");
    setNextDate(defaultNextDate()); setNoSchedule(false); setReason("needs_time");
  };

  const act = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: any }) => {
      const res = await apiRequest("POST", path, body);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
      qc.invalidateQueries({ queryKey: ["/api/followups"] });
      qc.invalidateQueries({ queryKey: ["/api/followups/approvals"] });
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      toast({ title: "تمّ الحفظ" });
      reset();
    },
    onError: (err: any) => {
      //  التعارض يُقال صريحاً: مستخدمٌ آخر سبقك، حدّث الصفحة.
      toast({
        title: "تعذّر الحفظ",
        description: err?.message ?? "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card><CardContent className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </CardContent></Card>
    );
  }
  if (!active) return null;

  const pendingRequest = (active.priceRequests ?? []).find((r: any) => r.status === "pending");
  //  نوعُ الصفّ وصاحبُه يُمرَّران معاً: الصفُّ القديم بسلطته القديمة (ولا
  //  زرَّ لمدير الفرع عليه)، وصفُّ الخصم بسلطته الجديدة وبمنع اعتماد النفس.
  //  والخادمُ يفرض ذلك كلَّه — وهذا إخفاءُ عرضٍ لا حراسة.
  const actions = allowedActions(session as any, active.status, {
    isLegacy: Boolean(pendingRequest?.isLegacyPriceChange),
    requestedByUserId: pendingRequest?.requestedBy ?? null,
  });
  const isOwnPending = Boolean(pendingRequest
    && typeof pendingRequest.requestedBy === "number"
    && pendingRequest.requestedBy === (session as any)?.userId);
  const busy = act.isPending;

  //  المعاينةُ الحيّة للخصم — **نفسُ دالّة الخادم**، فما تعرضه الشاشة هو
  //  ما سيُحسب هناك بالضبط ولا رقمَ يفاجئ الموظّف بعد الإرسال.
  const preview = computeDiscount({
    currentPrice: active.approvedPrice, mode: discountMode,
    value: Number(discountValue),
  });

  const submit = (path: string, body: any) => act.mutate({ path, body });

  return (
    <Card data-testid="card-post-exam-decision">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          قرار المريض بعد المعاينة
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[active.status] ?? ""}`}
            data-testid="text-followup-status">
            {FOLLOWUP_STATUS_LABELS[active.status] ?? active.status}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="الخدمة" value={SERVICE_LABELS[active.serviceType] ?? active.serviceType} />
          <Field label="طبيب المعاينة" value={active.examDoctorName ?? "—"} />
          <Field label="تاريخ المعاينة" value={fmt(active.examSignedAt)} />
          <Field label="الخبير"
            value={active.selectedExpertName
              ?? (active.selectedExpertUserId ? `#${active.selectedExpertUserId}` : "لم يُختَر بعد")}
            hint={active.selectedExpertName ? undefined : "يختاره الاستعلامات"} />
          <Field label="السعر المعتمد"
            value={`${active.approvedPrice.toLocaleString()} د.ع`}
            hint={active.priceSource === "approved_change" ? "بعد خصمٍ معتمد" : "من المعاينة"} />
          <Field label="آخر تواصل" value={fmt(active.lastContactAt)} />
          <Field label="المتابعة القادمة"
            value={active.noScheduledFollowUp ? "بلا موعد" : fmt(active.nextFollowUpAt)} />
          <Field label="آخر نتيجة"
            value={active.lastReason
              ? FOLLOWUP_REASON_LABELS[active.lastReason as FollowupReason] ?? active.lastReason
              : "—"} />
          {active.convertedWorkOrderId && (
            <Field label="أمر التصنيع" value={`#${active.convertedWorkOrderId}`} />
          )}
        </div>

        {/* ما ينتظره غيرُك — يُقال بلا زرّ */}
        {active.status === "price_approval_pending" && actions.length === 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
            data-testid="text-awaiting-price-approval">
            {pendingRequest?.isLegacyPriceChange
              ? "بانتظار اعتماد تعديل السعر من الطبيب المخوَّل أو المسؤول العام"
              : "بانتظار اعتماد الخصم من المسؤول أو مدير الفرع أو الطبيب المخوَّل"}
            {pendingRequest && ` — السعر بعد الخصم ${pendingRequest.proposedPrice?.toLocaleString()} د.ع`}
          </p>
        )}
        {/*  صفٌّ محتجزٌ من قبل التبسيط — يُستأنف بضغطةٍ واحدة لا بانتظارِ أحد. */}
        {active.status === "purchase_approval_pending" && actions.includes("confirm_purchase") && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-testid="text-legacy-purchase-pending">
            هذا الملفّ سُجِّل قبل التبسيط بحالة «بانتظار اعتماد الشراء» — لم يعد
            يحتاج اعتماداً. أكّد الشراء ليبدأ التصنيع، أو أغلقه إن عدل المريض.
          </p>
        )}

        {/*  الخبير شرطُ البدء لا شرطُ العرض: يُقال صراحةً وزرُّه تحته. */}
        {actions.includes("confirm_purchase") && active.selectedExpertUserId === null && (
          <p className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700"
            data-testid="text-expert-required">
            اختر الخبير المسؤول أولاً — ثم يصير «اشترى — بدء التصنيع» متاحاً.
          </p>
        )}

        {/*  بطاقةُ الطلب المعلَّق — تُعرَض لكلّ من يرى الملفّ، بأزرارٍ لمن
            يقرّر وبلا أزرارٍ لغيره. وصاحبُ الطلب يراها كذلك ويُقال له
            صراحةً لماذا لا زرَّ له. */}
        {pendingRequest && (
          <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm"
            data-testid="card-pending-discount">
            <div className="font-medium">
              {pendingRequest.isLegacyPriceChange ? "طلب تعديل سعر (سجلّ قديم)" : "طلب خصم"}
            </div>
            <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs sm:grid-cols-3">
              <span className="text-muted-foreground">السعر الأصلي:{" "}
                <b className="text-foreground">{pendingRequest.currentPrice?.toLocaleString()} د.ع</b></span>
              {pendingRequest.discountAmount !== null
                && pendingRequest.discountAmount !== undefined && (
                <span className="text-muted-foreground">الخصم:{" "}
                  <b className="text-foreground" data-testid="text-pending-discount-amount">
                    {pendingRequest.discountAmount.toLocaleString()} د.ع</b>
                  {pendingRequest.discountMode === "percentage"
                    && ` (${pendingRequest.discountValue}٪)`}</span>
              )}
              <span className="text-muted-foreground">السعر النهائي:{" "}
                <b className="text-foreground" data-testid="text-pending-final-price">
                  {pendingRequest.proposedPrice?.toLocaleString()} د.ع</b></span>
            </div>
            <div className="text-muted-foreground text-xs mt-1">
              {(pendingRequest.isLegacyPriceChange
                ? (FOLLOWUP_REASON_LABELS[pendingRequest.reason as FollowupReason] ?? pendingRequest.reason)
                : (DISCOUNT_REASON_LABELS[pendingRequest.reason as DiscountReason] ?? pendingRequest.reason))}
              {pendingRequest.requestedByName && ` · طلبه ${pendingRequest.requestedByName}`}
            </div>
            {pendingRequest.note && (
              <div className="text-muted-foreground text-xs mt-1">{pendingRequest.note}</div>
            )}
            {isOwnPending && !pendingRequest.isLegacyPriceChange && (
              <p className="mt-1 text-xs text-amber-700" data-testid="text-self-decision-blocked">
                لا يمكنك اعتماد أو رفض طلبٍ قدّمتَه بنفسك — يقرّره مخوَّلٌ آخر.
              </p>
            )}
            {/*  والصفُّ القديم يُقال فيه صراحةً لماذا سلطتُه أضيق. */}
            {pendingRequest.isLegacyPriceChange && (
              <p className="mt-1 text-xs text-amber-700" data-testid="text-legacy-authority">
                سجلٌّ سابق لنظام الخصومات — يعتمده الطبيب المخوَّل أو المسؤول العام حصراً.
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/*  فعلٌ واحد: يشتري المريض فيبدأ التصنيع في الحال — بلا خطوةِ
              اعتمادٍ بينهما ولا انتظارِ أحد. والخبيرُ شرطُه، فيُعطَّل بلا
              ضغطةٍ تنتهي برسالة خطأ. */}
          {actions.includes("confirm_purchase") && (
            <Button size="sm" disabled={busy || active.selectedExpertUserId === null}
              onClick={() => setDialog("confirm_purchase")}
              data-testid="button-confirm-purchase">
              اشترى — بدء التصنيع
            </Button>
          )}
          {actions.includes("defer") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("defer")} data-testid="button-defer">
              <CalendarClock className="h-4 w-4" /> يحتاج متابعة / مؤجَّل
            </Button>
          )}
          {actions.includes("close") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("close")} data-testid="button-close-followup">
              <XCircle className="h-4 w-4" /> لم يشترِ
            </Button>
          )}
          {actions.includes("request_discount") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("discount")} data-testid="button-request-discount">
              <CircleDollarSign className="h-4 w-4" /> طلب خصم
            </Button>
          )}
          {/*  زرّان بأسماءِ نوعِ الصفّ: «الخصم» للجديد، و«تعديل السعر»
              للقديم — فلا يُسمّى تعديلٌ عامّ خصماً على الشاشة. */}
          {(actions.includes("approve_discount") || actions.includes("approve_price"))
            && pendingRequest && (
            <>
              <Button size="sm" disabled={busy}
                onClick={() => submit(`/api/discount-requests/${pendingRequest.id}/decide`,
                  { decision: "approve" })}
                data-testid={actions.includes("approve_price")
                  ? "button-approve-price" : "button-approve-discount"}>
                {actions.includes("approve_price") ? "اعتماد تعديل السعر" : "اعتماد الخصم"}
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => submit(`/api/discount-requests/${pendingRequest.id}/decide`,
                  { decision: "reject" })}
                data-testid={actions.includes("approve_price")
                  ? "button-reject-price" : "button-reject-discount"}>
                {actions.includes("approve_price") ? "رفض تعديل السعر" : "رفض الخصم"}
              </Button>
            </>
          )}
          {/*  الخبير اختيارُ الاستعلامات — بصلاحية المتابعة لا بقائمة
              الأزرار: قائمتُها تفرغ في حالتَي الاعتماد، والخبير يبقى
              اختيارَها هناك. */}
          {canSelectExpert(session as any, active.status) && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => { setExpertId(String(active.selectedExpertUserId ?? "")); setDialog("expert"); }}
              data-testid="button-select-expert">
              <UserCog className="h-4 w-4" />
              {active.selectedExpertUserId ? "تغيير الخبير" : "اختيار الخبير"}
            </Button>
          )}
          {actions.includes("reopen") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("reopen")} data-testid="button-reopen">
              <RotateCcw className="h-4 w-4" /> إعادة فتح المتابعة
            </Button>
          )}
        </div>

        {(active.events ?? []).length > 0 && (
          <details className="text-xs" data-testid="details-followup-history">
            <summary className="cursor-pointer text-muted-foreground">
              سجلّ المتابعة ({active.events.length})
            </summary>
            <ul className="mt-2 space-y-1">
              {active.events.map((e: any) => (
                <li key={e.id} className="flex gap-2 text-muted-foreground">
                  <span className="shrink-0">{fmt(e.createdAt)}</span>
                  <span className="font-medium text-foreground">{EVENT_LABELS[e.eventType] ?? e.eventType}</span>
                  {e.actorName && <span>· {e.actorName}</span>}
                  {e.reason && <span>· {FOLLOWUP_REASON_LABELS[e.reason as FollowupReason] ?? e.reason}</span>}
                </li>
              ))}
            </ul>
          </details>
        )}
      </CardContent>

      {/* ── تأجيل ── */}
      <Dialog open={dialog === "defer" || dialog === "close" || dialog === "reopen"}
        onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {dialog === "defer" ? "تأجيل ومتابعة"
                : dialog === "close" ? "إغلاق بدون شراء" : "إعادة فتح المتابعة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialog !== "reopen" && (
              <div>
                <Label>السبب</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as FollowupReason)}>
                  <SelectTrigger data-testid="select-followup-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{FOLLOWUP_REASON_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dialog !== "close" && (
              <div className="space-y-2">
                <Label>موعد المتابعة القادمة</Label>
                <Input type="date" value={nextDate} disabled={noSchedule}
                  onChange={(e) => setNextDate(e.target.value)}
                  data-testid="input-next-followup" />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={noSchedule}
                    onChange={(e) => setNoSchedule(e.target.checked)}
                    data-testid="checkbox-no-schedule" />
                  بلا موعد متابعة (قرارٌ صريح)
                </label>
              </div>
            )}
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-followup-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy} data-testid="button-confirm-dialog"
              onClick={() => {
                if (dialog === "close") {
                  submit(`/api/followups/${active.id}/close`, { reason, note: note || undefined });
                } else if (dialog === "reopen") {
                  submit(`/api/followups/${active.id}/reopen`, {
                    toStatus: noSchedule || !nextDate ? "awaiting_patient_decision" : "follow_up",
                    nextFollowUpAt: noSchedule ? undefined : new Date(nextDate).toISOString(),
                    noScheduledFollowUp: noSchedule, note: note || undefined,
                  });
                } else {
                  submit(`/api/followups/${active.id}/defer`, {
                    reason, note: note || undefined,
                    nextFollowUpAt: noSchedule ? undefined : new Date(nextDate).toISOString(),
                    noScheduledFollowUp: noSchedule,
                  });
                }
              }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── طلب خصم ── */}
      <Dialog open={dialog === "discount"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>طلب خصم</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              الطلب <b>لا يغيّر السعر ولا يحرّك ديناراً</b> — يعتمده المسؤول
              أو مدير الفرع أو الطبيب المخوَّل، ولا يعتمده مَن قدّمه.
            </p>
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
              data-testid="text-discount-original-price">
              <span className="text-muted-foreground">السعر الأصلي: </span>
              <b>{active.approvedPrice.toLocaleString()} د.ع</b>
            </div>
            <div>
              <Label>نوع الخصم</Label>
              <Select value={discountMode} onValueChange={(v) => setDiscountMode(v as DiscountMode)}>
                <SelectTrigger data-testid="select-discount-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISCOUNT_MODES.map((m) => (
                    <SelectItem key={m} value={m}>{DISCOUNT_MODE_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{discountMode === "percentage" ? "نسبة الخصم (٪)" : "مبلغ الخصم (د.ع)"}</Label>
              <Input type="number" value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                data-testid="input-discount-value" />
            </div>
            {/*  النتيجةُ حيّةً — ورسالةُ الرفض هي رسالةُ الخادم نفسُها. */}
            {discountValue !== "" && (
              preview.ok ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-sm"
                  data-testid="text-discount-preview">
                  <div>الخصم: <b>{preview.discountAmount.toLocaleString()} د.ع</b>
                    {" "}({preview.percentage}٪)</div>
                  <div>السعر بعد الخصم: <b data-testid="text-discount-final">
                    {preview.finalPrice.toLocaleString()} د.ع</b></div>
                </div>
              ) : (
                <p className="text-sm text-destructive" data-testid="text-discount-error">
                  {preview.error}
                </p>
              )
            )}
            <div>
              <Label>السبب</Label>
              <Select value={discountReason}
                onValueChange={(v) => setDiscountReason(v as DiscountReason)}>
                <SelectTrigger data-testid="select-discount-reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DISCOUNT_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{DISCOUNT_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {discountReason === "doctor_instruction" && (
                <p className="mt-1 text-[11px] text-muted-foreground"
                  data-testid="text-doctor-instruction-note">
                  توجيهُ الطبيب سببٌ موثَّق — ويبقى الطلب بانتظار اعتماد مخوَّل.
                </p>
              )}
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-discount-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || !preview.ok} data-testid="button-submit-discount-request"
              onClick={() => submit(`/api/followups/${active.id}/discount-request`, {
                discountMode, discountValue: Number(discountValue),
                reason: discountReason, note: note || undefined,
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── اختيار الخبير — بلا أي تصنيع ── */}
      <Dialog open={dialog === "expert"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>الخبير المسؤول</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              اقترحه الطبيب في المعاينة، ولك إبقاؤه أو تغييره. الاختيار
              <b> لا يبدأ تصنيعاً</b> — التصنيع يبدأ باعتماد الشراء.
            </p>
            <div>
              <Label>الخبير</Label>
              <Select value={expertId} onValueChange={setExpertId}>
                <SelectTrigger data-testid="select-followup-expert">
                  <SelectValue placeholder="اختر الخبير" />
                </SelectTrigger>
                <SelectContent>
                  {(experts ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || !expertId} data-testid="button-confirm-expert"
              onClick={() => submit(`/api/followups/${active.id}/expert`, {
                expertUserId: Number(expertId),
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── تأكيد الشراء ── */}
      <Dialog open={dialog === "confirm_purchase"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>اشترى — بدء التصنيع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                {active.priceSource === "approved_change" ? "السعر المعتمد بعد الخصم: " : "السعر المعتمد: "}
              <b data-testid="text-purchase-approved-price">
                {active.approvedPrice.toLocaleString()} د.ع</b>.
              يُفتح أمر التصنيع وتُقيَّد الكلفة على حساب المريض بهذا المبلغ بعينه.
            </p>
            {/*  الخبير **يُعرَض ولا يُختار هنا**: له نقطتُه وتدقيقُه. والخادم
                يقرأه من الصفّ لا من الطلب، فلا يُرسَل أصلاً. والسعرُ كذلك. */}
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
              data-testid="text-purchase-expert">
              <span className="text-muted-foreground">الخبير المسؤول: </span>
              <b>{active.selectedExpertName
                ?? (active.selectedExpertUserId ? `#${active.selectedExpertUserId}` : "لم يُختَر بعد")}</b>
            </div>
            {active.selectedExpertUserId === null && (
              <p className="text-sm text-destructive" data-testid="text-expert-required-dialog">
                اختر الخبير المسؤول أولاً.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button disabled={busy || active.selectedExpertUserId === null}
              data-testid="button-confirm-purchase-submit"
              onClick={() => submit(`/api/followups/${active.id}/confirm-purchase`, {})}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "تأكيد وبدء التصنيع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const EVENT_LABELS: Record<string, string> = {
  followup_created: "فُتحت المتابعة",
  patient_deferred: "أجّل المريض",
  contact_recorded: "تواصل",
  //  الأربعةُ الجديدة، ثم القديمةُ بلغتها — فتُقرأ الصفوفُ كما كُتبت.
  discount_requested: "طُلب خصم",
  discount_approved: "اعتُمد الخصم",
  discount_rejected: "رُفض الخصم",
  discount_cancelled: "أُلغي طلب الخصم (إغلاق الملفّ)",
  price_change_requested: "طُلب تعديل السعر (سجلّ قديم)",
  price_approved: "اعتُمد تعديل السعر (سجلّ قديم)",
  price_rejected: "رُفض تعديل السعر (سجلّ قديم)",
  price_request_cancelled: "أُلغي طلب تعديل السعر (سجلّ قديم)",
  patient_accepted_price: "وافق المريض على السعر",
  purchase_confirmed: "أكّد الموظّف الشراء",
  //  اسمٌ تاريخي: صفوفُ ما قبل التبسيط حين كان الطبيب يعتمد. يبقى كي
  //  تُقرأ كما كُتبت لا كما صارت.
  purchase_approved: "اعتُمد الشراء (قبل التبسيط)",
  converted: "تحوّل إلى تصنيع",
  closed_without_purchase: "أُغلق بدون شراء",
  reopened: "أُعيد فتحه",
};

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
