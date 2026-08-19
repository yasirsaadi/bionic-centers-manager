// بطاقةُ «قرار المريض بعد المعاينة» في صفحة المريض.
//
// ══ الأزرار تتبع الصلاحية والحالة معاً ══════════════════════════════════
// الاستعلامات يرى «اشترى» و«لم يشترِ» و«متابعة»، ومديرُ الفرع يرى معها
// «تحديد السعر النهائي». والطبيبُ المخوَّل يرى الأفعالَ التشغيلية نفسَها
// ومعها «المريض يرغب بالشراء الآن» — **ما عدا تحديدَ السعر**.
//
// **ومشاركةُ الطبيب اختيارية**: يستطيع أن يسجّل إن حضر، ولا يُطلَب منه شيء
// ولا ينتظره ملفّ. والشاشةُ لا تقول له «يجب» في موضعٍ واحد.
//
// **ولا زرَّ اعتمادٍ لأحد** في المسار الحيّ: القرارُ التجاري لمديرِ الفرع
// يُحفظ في اللحظة، والشراءُ تسجيلُ واقعةٍ لا استئذان. وما بقي من أزرار
// الاعتماد فلصفوفٍ معلَّقةٍ من المسار القديم حتى تنفد.
//
// وهذا **عرضٌ لا حراسة**: الخادم يفحص كلّ كتابة مهما أظهرت الواجهة —
// و`allowedActions` مشتركةٌ بينهما فلا تنحرف قاعدةٌ عن قاعدة.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Loader2, CircleDollarSign, CalendarClock, XCircle, RotateCcw, UserCog,
  HandCoins,
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
  allowedActions, canSelectExpert, computeCommercialPrice, priceSourceShort,
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUS_LABELS,
  type FollowupReason, type FollowupStatus,
} from "@shared/followup";

interface Followup {
  id: number;
  serviceType: string;
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
  purchaseInterestAt: string | null;
  purchaseInterestByName: string | null;
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
  const [finalPrice, setFinalPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
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
    setDialog(null); setNote(""); setFinalPrice(""); setPriceReason(""); setExpertId("");
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
  //  معاينةُ الفرق حيّةً من **الدالّة المشتركة نفسها** التي يحسب بها الخادم —
  //  فلا تعرض الشاشةُ رقماً يخالف ما سيُحفَظ.
  const preview = computeCommercialPrice({
    previousPrice: active.approvedPrice, finalPrice: Number(finalPrice),
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
          {/*  والنصُّ من `shared/followup` وحدها — لا استنتاجَ في الشاشة. */}
          <Field label="السعر المعتمد"
            value={`${active.approvedPrice.toLocaleString()} د.ع`}
            hint={priceSourceShort(active.priceSource)} />
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

        {/*  **رايةُ الطبيب** — تُقرأ في رأس البطاقة كما تُقرأ في رأس الطابور. */}
        {active.purchaseInterestAt && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800"
            data-testid="text-purchase-interest">
            🟢 المريض أبدى رغبته بالشراء الآن
            {active.purchaseInterestByName && ` — سجّلها ${active.purchaseInterestByName}`}
            {` (${fmt(active.purchaseInterestAt)})`}
          </p>
        )}

        {/*  صفٌّ معلَّقٌ من المسار القديم — يُقال بلا زرّ لمن لا يحسمه. */}
        {active.status === "price_approval_pending" && actions.length === 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
            data-testid="text-awaiting-price-approval">
            طلبٌ قديمٌ معلَّق — يحسمه الطبيب المخوَّل أو المسؤول العام
            {pendingRequest && ` — المقترح ${pendingRequest.proposedPrice?.toLocaleString()} د.ع`}
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
          {/*  **قرارُ مديرِ الفرع لا طلبٌ يُرسَل**: يفتح النافذة ويكتب الرقم
              فيصير هو السعر — بلا اعتمادٍ ولا انتظار. */}
          {actions.includes("set_commercial_price") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => { setFinalPrice(String(active.approvedPrice)); setDialog("price"); }}
              data-testid="button-set-commercial-price">
              <CircleDollarSign className="h-4 w-4" /> تحديد السعر النهائي
            </Button>
          )}
          {/*  **إشارةُ تسليمٍ لا بيع**: زرٌّ واحد للطبيب، ولا يظهر بعد رفعها. */}
          {actions.includes("signal_purchase_interest") && !active.purchaseInterestAt && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => submit(`/api/followups/${active.id}/purchase-interest`, {})}
              data-testid="button-signal-purchase-interest">
              <HandCoins className="h-4 w-4" /> المريض يرغب بالشراء الآن
            </Button>
          )}
          {/*  توافقٌ رجعي: حسمُ طلبٍ قديمٍ معلَّق. لا يُنشأ مثلُه بعد اليوم. */}
          {actions.includes("approve_price") && pendingRequest && (
            <>
              <Button size="sm" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "approve" })}
                data-testid="button-approve-price">
                اعتماد الطلب القديم
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "reject" })}
                data-testid="button-reject-price">
                رفض الطلب القديم
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

      {/* ── تحديد السعر النهائي — قرارٌ يُحفظ في الحال ── */}
      <Dialog open={dialog === "price"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تحديد السعر التجاري النهائي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              السعر الحالي: <b>{active.approvedPrice.toLocaleString()} د.ع</b>{" "}
              ({priceSourceShort(active.priceSource)}).
              قرارُك يُحفظ فوراً بلا اعتمادٍ من أحد — <b>ولا يقيّد كلفةً ولا
              يبدأ تصنيعاً</b>. المال يتحرّك حين يؤكّد الموظّف الشراء.
            </p>
            <div>
              <Label>السعر النهائي (د.ع)</Label>
              <Input type="number" value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                data-testid="input-final-price" />
            </div>
            {/*  والفرقُ يُعرَض حيّاً — ولا تحسبه الشاشةُ بنفسها. */}
            {finalPrice !== "" && (
              preview.ok ? (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="text-price-preview">
                  {preview.changed ? (
                    <>
                      <div>الفرق: <b data-testid="text-price-difference">
                        {preview.difference > 0 ? "+" : ""}{preview.difference.toLocaleString()} د.ع</b>
                        {" "}({preview.percentageDifference > 0 ? "+" : ""}{preview.percentageDifference}٪)</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {preview.difference < 0 ? "تخفيض عن السعر الحالي" : "زيادة عن السعر الحالي"}
                      </div>
                    </>
                  ) : (
                    <div data-testid="text-price-unchanged">السعر كما هو — تثبيتٌ بلا تغيير</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive" data-testid="text-price-error">{preview.error}</p>
              )
            )}
            <div>
              <Label>
                السبب {preview.ok && preview.changed
                  ? <span className="text-destructive">(مطلوب)</span>
                  : <span className="text-muted-foreground">(غير مطلوب — السعر لم يتغيّر)</span>}
              </Label>
              <Input value={priceReason} onChange={(e) => setPriceReason(e.target.value)}
                placeholder="مثال: مفاوضة المريض · حالة مادّية · سعر منافس"
                data-testid="input-price-reason" />
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-price-note" />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="button-submit-commercial-price"
              disabled={busy || !preview.ok || (preview.changed && !priceReason.trim())}
              onClick={() => submit(`/api/followups/${active.id}/commercial-price`, {
                finalPrice: Number(finalPrice),
                reason: priceReason.trim() || undefined,
                note: note || undefined,
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ السعر النهائي"}
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
              <b> لا يبدأ تصنيعاً</b> — التصنيع يبدأ بتأكيد الشراء.
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
              السعر المعتمد: <b>{active.approvedPrice.toLocaleString()} د.ع</b>.
              يُفتح أمر التصنيع وتُقيَّد الكلفة على حساب المريض في الحال.
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
  //  **القرارُ التجاري الحيّ** — مديرُ الفرع يحدّد السعر مباشرةً.
  commercial_price_set: "حُدِّد السعر التجاري",
  //  إشارةُ تسليمٍ من الطبيب — بلا أثرٍ مالي.
  purchase_interest_signaled: "أبدى المريض رغبته بالشراء",
  //  أسماءٌ تاريخية: طلبُ تعديلِ سعرٍ من المسار القديم. تبقى كي تُقرأ كما
  //  كُتبت لا كما صارت — ولا يُنشأ مثلُها بعد اليوم.
  price_change_requested: "طُلب تعديل السعر (قبل التبسيط)",
  price_approved: "اعتُمد تعديل السعر (قبل التبسيط)",
  price_rejected: "رُفض تعديل السعر (قبل التبسيط)",
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
