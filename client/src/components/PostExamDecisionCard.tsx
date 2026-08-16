// بطاقةُ «قرار المريض بعد المعاينة» في صفحة المريض.
//
// ══ الأزرار تتبع الصلاحية والحالة معاً ══════════════════════════════════
// الاستعلامات يرى «بانتظار اعتماد السعر» بلا زرّ، والطبيبُ يرى «اعتماد /
// رفض». وهذا **عرضٌ لا حراسة**: الخادم يفحص كلّ كتابة مهما أظهرت الواجهة —
// و`allowedActions` مشتركةٌ بينهما فلا تنحرف قاعدةٌ عن قاعدة.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Loader2, CircleDollarSign, CalendarClock, XCircle, RotateCcw,
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
  allowedActions, FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUS_LABELS,
  type FollowupReason, type FollowupStatus,
} from "@shared/followup";

interface Followup {
  id: number;
  serviceType: string;
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
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
  const [proposedPrice, setProposedPrice] = useState("");
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
    enabled: dialog === "approve_purchase",
  });

  const active = (followups ?? [])[0] ?? null;

  const reset = () => {
    setDialog(null); setNote(""); setProposedPrice(""); setExpertId("");
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

  const actions = allowedActions(session as any, active.status);
  const pendingRequest = (active.priceRequests ?? []).find((r: any) => r.status === "pending");
  const busy = act.isPending;

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
          <Field label="السعر المعتمد"
            value={`${active.approvedPrice.toLocaleString()} د.ع`}
            hint={active.priceSource === "approved_change" ? "بعد تعديلٍ معتمد" : "من المعاينة"} />
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
            بانتظار اعتماد السعر من الطبيب أو المسؤول العام
            {pendingRequest && ` — المقترح ${pendingRequest.proposedPrice?.toLocaleString()} د.ع`}
          </p>
        )}
        {active.status === "purchase_approval_pending" && actions.length === 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
            data-testid="text-awaiting-purchase-approval">
            بانتظار اعتماد الشراء من الطبيب أو المسؤول العام
          </p>
        )}

        {pendingRequest && actions.includes("approve_price") && (
          <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm">
            <div className="font-medium">طلب تعديل سعر</div>
            <div className="text-muted-foreground text-xs mt-1">
              {pendingRequest.currentPrice?.toLocaleString()} ⟶ {pendingRequest.proposedPrice?.toLocaleString()} د.ع
              {" — "}{FOLLOWUP_REASON_LABELS[pendingRequest.reason as FollowupReason] ?? pendingRequest.reason}
              {pendingRequest.requestedByName && ` · طلبه ${pendingRequest.requestedByName}`}
            </div>
            {pendingRequest.note && (
              <div className="text-muted-foreground text-xs mt-1">{pendingRequest.note}</div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {actions.includes("accept_price") && (
            <Button size="sm" disabled={busy}
              onClick={() => submit(`/api/followups/${active.id}/accept-price`, {})}
              data-testid="button-accept-price">
              وافق على الشراء
            </Button>
          )}
          {actions.includes("patient_accepted_new_price") && (
            <Button size="sm" disabled={busy}
              onClick={() => submit(`/api/followups/${active.id}/accept-price`, {})}
              data-testid="button-patient-accepted-new-price">
              المريض وافق على السعر الجديد
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
              <XCircle className="h-4 w-4" /> لا يريد الشراء حالياً
            </Button>
          )}
          {actions.includes("request_price_change") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("price")} data-testid="button-request-price-change">
              <CircleDollarSign className="h-4 w-4" /> طلب تعديل السعر
            </Button>
          )}
          {actions.includes("approve_price") && pendingRequest && (
            <>
              <Button size="sm" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "approve" })}
                data-testid="button-approve-price">
                اعتماد السعر الجديد
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "reject" })}
                data-testid="button-reject-price">
                رفض التعديل
              </Button>
            </>
          )}
          {actions.includes("approve_purchase") && (
            <Button size="sm" disabled={busy}
              onClick={() => setDialog("approve_purchase")} data-testid="button-approve-purchase">
              اعتماد الشراء وبدء التصنيع
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

      {/* ── طلب تعديل السعر ── */}
      <Dialog open={dialog === "price"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>طلب تعديل السعر</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              السعر المعتمد الآن: <b>{active.approvedPrice.toLocaleString()} د.ع</b>.
              الطلب لا يغيّر السعر — يعتمده طبيبٌ أو المسؤول العام.
            </p>
            <div>
              <Label>السعر المقترح (د.ع)</Label>
              <Input type="number" value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                data-testid="input-proposed-price" />
            </div>
            <div>
              <Label>السبب</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as FollowupReason)}>
                <SelectTrigger data-testid="select-price-reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{FOLLOWUP_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-price-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || !proposedPrice} data-testid="button-submit-price-request"
              onClick={() => submit(`/api/followups/${active.id}/price-request`, {
                proposedPrice: Number(proposedPrice), reason, note: note || undefined,
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال الطلب"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── اعتماد الشراء ── */}
      <Dialog open={dialog === "approve_purchase"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>اعتماد الشراء وبدء التصنيع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              السعر المعتمد: <b>{active.approvedPrice.toLocaleString()} د.ع</b>.
              الاعتماد يفتح أمر التصنيع بالمسار الرسمي نفسه.
            </p>
            <div>
              <Label>الخبير المسؤول</Label>
              <Select value={expertId} onValueChange={setExpertId}>
                <SelectTrigger data-testid="select-purchase-expert">
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
            <Button disabled={busy || !expertId} data-testid="button-confirm-approve-purchase"
              onClick={() => submit(`/api/followups/${active.id}/approve-purchase`, {
                expertUserId: Number(expertId),
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "اعتماد وبدء التصنيع"}
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
  price_change_requested: "طُلب تعديل السعر",
  price_approved: "اعتُمد تعديل السعر",
  price_rejected: "رُفض تعديل السعر",
  patient_accepted_price: "وافق المريض على السعر",
  purchase_approved: "اعتُمد الشراء",
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
