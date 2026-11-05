// **«طلب استرجاع مبلغ لمريض»** (ترحيل ١٩١، §4.fz — طلبُ المالك ٢٠٢٦-١١-٠٥ بالتصميم الذي وافق عليه):
//   • `RequestRefundDialog` — من ملفّ المريض: القسمُ (بما دفعه فيه وما استُرجع والحدّ الأعلى)، والمبلغُ رقماً وكلمات، والسببُ وتفصيلُه.
//     لحامل المفتاح طلبٌ ينتظر المسؤول؛ وللمسؤول استرجاعٌ مباشرٌ بقراريه في النافذة نفسِها.
//   • `RefundCard` — البطاقةُ المقروءة؛ وللمسؤول «اعتماد» بقراريه (نسبةُ مستشفى العين في ذي قار · تخفيضُ كلفة الحالة) و«رفض بسبب».
//   • `PatientRefundsList` (ملفُّ المريض) و`RefundsSection` (صفحة «طلبات التصحيح») — **الطلبُ واحدٌ في المكانين**.
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, Printer, Undo2 } from "lucide-react";
import { amountInArabicWords } from "@shared/reserve_withdrawals";
import { REFUND_DETAIL_MAX, REFUND_DETAIL_MIN, REFUND_REASONS, defaultReduceCost } from "@shared/patient_refunds";
import { baghdadDateTime } from "@/components/ReserveWithdrawal";

export interface RefundRow {
  id: number; voucherNo: string; patientId: number; patientName: string; patientCode: string;
  caseId: number; caseType: string; caseLabel: string; branchId: number; branchName: string;
  amount: number; amountWords: string; reason: string; reasonLabel: string; detail: string;
  status: "pending" | "approved" | "rejected"; statusLabel: string;
  netPaid: number | null; refundedBefore: number | null; netAfter: number | null; exceeds: boolean;
  otherPendingCount: number; otherPendingAmount: number; caseCost: number | null;
  askHospital: boolean; suggestDeductHospital: boolean | null; suggestReduceCost: boolean;
  deductHospital: boolean | null; reduceCost: boolean | null; costBefore: number | null; costAfter: number | null;
  requestedBy: number | null; requestedByName: string | null; requestedAt: string;
  decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; paymentId: number | null;
}
interface CaseOption {
  caseId: number; caseType: string; label: string; cost: number; netPaid: number; refundedBefore: number; pending: number; available: number;
  suggestDeductHospital: boolean | null;
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
const digits = (v: string) => v.replace(/[^\d]/g, "");
const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};
const Num = ({ n, className = "" }: { n: number | null | undefined; className?: string }) => (
  <span className={`tabular-nums ${className}`} dir="ltr">{money(n)}</span>
);

function invalidate(qc: ReturnType<typeof useQueryClient>, patientId?: number) {
  qc.invalidateQueries({ queryKey: ["/api/patient-refunds"] });
  qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
  if (patientId) {
    qc.invalidateQueries({ queryKey: ["/api/patients", patientId] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/patients", String(patientId)] });
  }
  qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] ?? "").startsWith("/api/patients") });
}

/** يفتح سندَ الاسترجاع للطباعة — في الهاتف والتطبيق في الصفحة نفسِها، وعلى الحاسوب في لسانٍ جديد. */
export function openRefundVoucher(id: number) {
  const url = `/refund-voucher/print?id=${id}`;
  const standalone = (window.navigator as any).standalone === true || window.matchMedia?.("(display-mode: standalone)").matches;
  if (standalone || window.innerWidth < 768) window.location.assign(url);
  else window.open(url, "_blank");
}

/** قرارا المسؤول — في نافذة الاعتماد وفي استرجاعه المباشر. */
function DecisionChoices({ askHospital, amount, deduct, setDeduct, reduce, setReduce, caseCost, caseType }: {
  askHospital: boolean; amount: number; deduct: boolean | null; setDeduct: (v: boolean) => void;
  reduce: boolean; setReduce: (v: boolean) => void; caseCost: number | null; caseType: string;
}) {
  return (
    <div className="space-y-2">
      {askHospital && (
        <div className="rounded-lg border-2 border-teal-500 bg-teal-50 p-2 space-y-1.5" data-testid="refund-hospital-choice">
          <p className="font-bold">هل يُخصم من نسبة مستشفى العين؟</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="refund-hospital" checked={deduct === true} onChange={() => setDeduct(true)} data-testid="refund-hospital-yes" />
            نعم — تنقص النسبة <b><Num n={Math.round(amount / 10)} /></b>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="refund-hospital" checked={deduct === false} onChange={() => setDeduct(false)} data-testid="refund-hospital-no" />
            لا — يتحمّله المركز وحده
          </label>
        </div>
      )}
      <label className="flex items-start gap-2 rounded-md border p-2 cursor-pointer" data-testid="refund-reduce-cost">
        <Checkbox checked={reduce} onCheckedChange={(v) => setReduce(v === true)} className="mt-0.5" />
        <span>
          خفّض كلفة الحالة بالمبلغ نفسِه
          {caseCost != null && <> (<Num n={caseCost} /> ← <Num n={Math.max(0, caseCost - amount)} />)</>}
          <span className="block text-xs text-muted-foreground">فلا يظهر المريضُ مديناً بما استُرجع. اتركه لدفعٍ زائدٍ عن الكلفة.</span>
          {reduce && caseType === "physio" && (
            <span className="block text-xs text-amber-800 mt-1" data-testid="refund-physio-sessions-note">
              الجلساتُ المشتراة لا تنقص وحدها — بعد الاعتماد عدّلها من «الكلفة والجلسات» في ملفّ المريض.
            </span>
          )}
        </span>
      </label>
    </div>
  );
}

/** طلبُ الاسترجاع — من ملفّ المريض، لحامل المفتاح والمسؤول. */
export function RequestRefundDialog({ patientId, patientName, open, onClose }: {
  patientId: number; patientName: string; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const opts = useQuery<{ cases: CaseOption[]; isAdmin: boolean; branchName: string; askHospital: boolean; mustChooseBranch: boolean }>({
    queryKey: ["/api/patient-refunds", "options", patientId],
    enabled: open,
    queryFn: async () => (await apiRequest("GET", `/api/patients/${patientId}/refund-options`)).json(),
  });
  const cases = (opts.data?.cases ?? []).filter((c) => c.netPaid > 0);
  const [caseId, setCaseId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState<string>("");
  const [detail, setDetail] = useState("");
  const [deduct, setDeduct] = useState<boolean | null>(null);
  const [reduce, setReduce] = useState(false);
  useEffect(() => { if (open) { setCaseId(cases.length === 1 ? cases[0].caseId : null); setAmount(""); setReason(""); setDetail(""); setDeduct(null); setReduce(false); } }, [open]);
  useEffect(() => { if (open && caseId === null && cases.length === 1) setCaseId(cases[0].caseId); }, [open, cases.length]);
  const c = cases.find((x) => x.caseId === caseId) ?? null;
  useEffect(() => { if (c && deduct === null && c.suggestDeductHospital !== null) setDeduct(c.suggestDeductHospital); }, [c?.caseId]);
  useEffect(() => { setReduce(defaultReduceCost(reason)); }, [reason]);
  const n = Number(amount || 0);
  const isAdmin = Boolean(opts.data?.isAdmin);
  const tooMuch = c != null && n > c.available;
  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/patient-refunds", {
      patientId, caseId, amount: n, reason, detail: detail.trim(),
      ...(isAdmin ? { reduceCost: reduce, ...(opts.data?.askHospital ? { deductHospital: deduct } : {}) } : {}),
    })).json() as Promise<RefundRow>,
    onSuccess: (r) => {
      invalidate(qc, patientId);
      toast({ title: isAdmin ? `استُرجع ${money(r.amount)} — سند رقم ${r.voucherNo}` : "أُرسل الطلب إلى المسؤول — لا يُسلَّم المبلغ قبل اعتماده" });
      onClose();
      if (isAdmin && r.status === "approved") openRefundVoucher(r.id);
    },
    onError: (e: any) => { invalidate(qc, patientId); toast({ title: "تعذّر الإرسال", description: errText(e), variant: "destructive" }); },
  });
  const ready = c && n > 0 && !tooMuch && reason && detail.trim().length >= REFUND_DETAIL_MIN
    && !(isAdmin && opts.data?.askHospital && deduct === null);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isAdmin ? "استرجاع مبلغ" : "طلب استرجاع"} — {patientName}</DialogTitle>
          <DialogDescription>
            {isAdmin ? "يُكتب الاسترجاعُ حركةً مستقلّةً بيوم اليوم، وتُطبع له سندٌ يوقّعه المريض." : "يُرسل الطلبُ إلى المسؤول للاعتماد."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" data-testid="refund-request-dialog">
          {opts.isLoading ? <p className="text-muted-foreground">جارٍ التحميل…</p>
            : opts.isError ? <p className="text-destructive">{errText(opts.error)}</p>
            : opts.data?.mustChooseBranch ? <p className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2">لهذا المريض أكثر من فرع — اختر الفرع من أعلى الشاشة أوّلاً.</p>
            : !cases.length ? <p className="rounded-md bg-muted px-3 py-2" data-testid="refund-no-money">لا مبلغَ مدفوعاً في ملفّ هذا المريض يُسترجع منه.</p>
            : (
              <>
                <div className="grid gap-1">القسم
                  <div className="grid grid-cols-2 gap-2">
                    {cases.map((x) => (
                      <button key={x.caseId} type="button" onClick={() => { setCaseId(x.caseId); setDeduct(x.suggestDeductHospital); }}
                        className={`rounded-md border-2 py-1.5 px-2 text-center ${caseId === x.caseId ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200"}`}
                        data-testid={`refund-case-${x.caseType}`}>{x.label}</button>
                    ))}
                  </div>
                </div>
                {c && (
                  <div className="rounded-md bg-muted px-3 py-2 space-y-0.5" data-testid="refund-case-money">
                    <p>دفع في هذا القسم: <b><Num n={c.netPaid + c.refundedBefore} /></b></p>
                    <p>استُرجع منه سابقاً: <b><Num n={c.refundedBefore} /></b>{c.pending > 0 && <> — ومعلَّقٌ بانتظار المسؤول: <b><Num n={c.pending} /></b></>}</p>
                    <p>الحدّ الأعلى للاسترجاع: <b><Num n={c.available} /></b></p>
                  </div>
                )}
                <label className="grid gap-1">المبلغ المسترجَع
                  <Input inputMode="numeric" dir="ltr" className="text-left tabular-nums" value={amount ? Number(amount).toLocaleString("en-US") : ""}
                    onChange={(e) => setAmount(digits(e.target.value))} data-testid="refund-amount" />
                  {n > 0 && <span className="text-muted-foreground text-xs" data-testid="refund-amount-words">{amountInArabicWords(n)}</span>}
                  {tooMuch && <span className="rounded bg-red-50 border border-red-300 text-red-800 px-2 py-1 text-xs" data-testid="refund-too-much">المبلغ أكبر من الحدّ الأعلى للاسترجاع</span>}
                </label>
                <label className="grid gap-1">السبب
                  <select className="border rounded-md px-3 py-2 bg-background" value={reason} onChange={(e) => setReason(e.target.value)} data-testid="refund-reason">
                    <option value="">— اختر —</option>
                    {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">التفصيل (إلزامي)
                  <Textarea value={detail} maxLength={REFUND_DETAIL_MAX} onChange={(e) => setDetail(e.target.value)} rows={2}
                    placeholder="مثلاً: حضر ٤ جلسات من ١٠ وسافر — يُردّ ثمن ٦ جلسات" data-testid="refund-detail" />
                </label>
                {isAdmin && c && n > 0 && (
                  <DecisionChoices askHospital={Boolean(opts.data?.askHospital)} amount={n} deduct={deduct} setDeduct={setDeduct}
                    reduce={reduce} setReduce={setReduce} caseCost={c.cost} caseType={c.caseType} />
                )}
                {!isAdmin && (
                  <p className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-amber-900 text-xs">
                    يُرسل الطلب إلى المسؤول للاعتماد. لا يُسلَّم المبلغ للمريض قبل الاعتماد.
                  </p>
                )}
              </>
            )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button className="bg-rose-700 hover:bg-rose-800" disabled={!ready || send.isPending} onClick={() => send.mutate()} data-testid="refund-submit">
            {isAdmin ? "استرجع واطبع السند" : "إرسال الطلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Line({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 py-1 border-b last:border-b-0" data-testid={testid}>
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/** بطاقةُ الطلب المقروءة — للمسؤول بقراره، ولغيره بحاله. */
export function RefundCard({ r, isAdmin }: { r: RefundRow; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const [deduct, setDeduct] = useState<boolean | null>(r.suggestDeductHospital);
  const [reduce, setReduce] = useState<boolean>(r.suggestReduceCost);
  const decide = useMutation({
    mutationFn: async (p: { decision: "approve" | "reject" }) => (await apiRequest("POST", `/api/patient-refunds/${r.id}/${p.decision}`,
      p.decision === "approve"
        ? { ...(note.trim() ? { note: note.trim() } : {}), reduceCost: reduce, ...(r.askHospital ? { deductHospital: deduct } : {}) }
        : { note: note.trim() })).json(),
    onSuccess: (_d, p) => {
      invalidate(qc, r.patientId);
      setDialog(null);
      toast({ title: p.decision === "approve" ? `اعتُمد الاسترجاع — سند رقم ${r.voucherNo}` : "رُفض الطلب — لم يتغيّر شيء" });
    },
    onError: (e: any) => { invalidate(qc, r.patientId); toast({ title: "تعذّر", description: errText(e), variant: "destructive" }); },
  });
  const pending = r.status === "pending";
  return (
    <div className={`rounded-md border bg-background p-3 space-y-2 text-sm ${r.exceeds && pending ? "border-red-400" : ""}`} data-testid={`refund-${r.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-base">طلب استرجاع لمريض</span>
        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="ms-auto"
          data-testid={`refund-status-${r.id}`}>{r.statusLabel}</Badge>
      </div>
      {r.exceeds && pending && (
        <div className="flex items-center gap-2 rounded bg-red-600 text-white px-3 py-1.5 text-sm font-semibold" data-testid={`refund-exceeds-${r.id}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" /> المبلغ أكبر من صافي ما دفعه المريض الآن — لا يُعتمد
        </div>
      )}
      <div>
        <Line label="المريض" testid={`refund-patient-${r.id}`}>
          <a href={`/patients/${r.patientId}`} className="underline-offset-2 hover:underline">{r.patientName}</a>
          {r.patientCode && <> · <span dir="ltr">{r.patientCode}</span></>}
        </Line>
        <Line label="الفرع والقسم">{r.branchName} — {r.caseLabel}</Line>
        <Line label="المبلغ" testid={`refund-amount-${r.id}`}>
          <b className="text-lg"><Num n={r.amount} /></b> دينار
          <span className="block text-muted-foreground">{r.amountWords}</span>
        </Line>
        {pending && r.netPaid != null && (
          <Line label="دفع / استُرجع" testid={`refund-money-${r.id}`}>
            صافي ما دفعه <Num n={r.netPaid} /> · استُرجع قبله <Num n={r.refundedBefore} /> — يبقى له <b><Num n={r.netAfter} className={r.exceeds ? "text-red-700" : ""} /></b>
          </Line>
        )}
        {pending && r.otherPendingCount > 0 && (
          <Line label="معلَّقٌ آخر">
            {r.otherPendingCount === 1 ? "طلبٌ آخر" : `${r.otherPendingCount} طلباتٍ أخرى`} على القسم نفسِه بمجموع <Num n={r.otherPendingAmount} />
          </Line>
        )}
        <Line label="السبب" testid={`refund-reason-${r.id}`}>{r.reasonLabel} — {r.detail}</Line>
        <Line label="طلبه">{r.requestedByName ?? "موظّف"} <span className="text-muted-foreground tabular-nums">· {baghdadDateTime(r.requestedAt)}</span></Line>
        {!pending && (
          <Line label={r.status === "approved" ? "اعتمده" : "رفضه"} testid={`refund-decision-${r.id}`}>
            {r.decidedByName ?? "المسؤول"} <span className="text-muted-foreground tabular-nums">· {baghdadDateTime(r.decidedAt)}</span>
            {r.status === "approved" && r.deductHospital !== null && <span className="block">نسبة مستشفى العين: {r.deductHospital ? "خُصم منها" : "لم يُخصم منها"}</span>}
            {r.status === "approved" && r.reduceCost && r.costBefore != null && <span className="block">كلفة الحالة: <Num n={r.costBefore} /> ← <Num n={r.costAfter} /></span>}
            {r.decisionNote && <span className="block">{r.status === "rejected" ? "السبب: " : "ملاحظة: "}{r.decisionNote}</span>}
          </Line>
        )}
      </div>
      <div className="flex gap-2 justify-end flex-wrap">
        {r.status === "approved" && (
          <Button size="sm" variant="outline" className="gap-1" onClick={() => openRefundVoucher(r.id)} data-testid={`refund-voucher-${r.id}`}>
            <Printer className="w-3.5 h-3.5" /> طباعة السند رقم {r.voucherNo}
          </Button>
        )}
        {isAdmin && pending && (
          <>
            <Button size="sm" variant="outline" className="border-red-400 text-red-700" disabled={decide.isPending}
              onClick={() => { setNote(""); setDialog("reject"); }} data-testid={`refund-reject-${r.id}`}>رفض بسبب</Button>
            <Button size="sm" disabled={decide.isPending || r.exceeds} onClick={() => { setNote(""); setDialog("approve"); }}
              data-testid={`refund-approve-${r.id}`}>اعتماد</Button>
          </>
        )}
      </div>
      <Dialog open={dialog !== null} onOpenChange={(v) => { if (!v) setDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog === "approve" ? "اعتماد الاسترجاع" : "رفض الطلب"}</DialogTitle>
            <DialogDescription>
              {dialog === "approve"
                ? `يُكتب استرجاعُ ${money(r.amount)} دينار لـ${r.patientName} بيوم اليوم في دفتر ${r.branchName}، وسندٌ رقم ${r.voucherNo}.`
                : "لا يتغيّر شيء، ويصل السببُ الطالب."}
            </DialogDescription>
          </DialogHeader>
          {dialog === "approve" && (
            <DecisionChoices askHospital={r.askHospital} amount={r.amount} deduct={deduct} setDeduct={setDeduct}
              reduce={reduce} setReduce={setReduce} caseCost={r.caseCost} caseType={r.caseType} />
          )}
          <label className="grid gap-1 text-sm">{dialog === "approve" ? "ملاحظة (اختيارية)" : "سبب الرفض"}
            <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="refund-decision-note" />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>إلغاء</Button>
            <Button variant={dialog === "reject" ? "destructive" : "default"}
              disabled={decide.isPending || (dialog === "reject" && note.trim().length < 3) || (dialog === "approve" && r.askHospital && deduct === null)}
              data-testid="refund-decision-confirm" onClick={() => decide.mutate({ decision: dialog! })}>
              {dialog === "approve" ? "اعتمد" : "ارفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** في ملفّ المريض: زرُّ الطلب لحامل المفتاح، وطلباتُ استرجاعه كلُّها بحالها وسندها. */
export function PatientRefundsBar({ patientId, patientName, canRequest, isAdmin }: {
  patientId: number; patientName: string; canRequest: boolean; isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const q = useQuery<RefundRow[]>({
    queryKey: ["/api/patient-refunds", "patient", patientId],
    queryFn: async () => (await apiRequest("GET", `/api/patients/${patientId}/refunds`)).json(),
  });
  const rows = q.data ?? [];
  if (!canRequest && !rows.length) return null;
  return (
    <div className="space-y-2" data-testid="patient-refunds">
      <div className="flex items-center gap-2">
        {rows.length > 0 && <p className="font-semibold text-sm">الاسترجاع</p>}
        {canRequest && (
          <Button size="sm" variant="outline" className="ms-auto gap-1 border-rose-400 text-rose-700 hover:bg-rose-50" onClick={() => setOpen(true)}
            data-testid="refund-open">
            <Undo2 className="w-3.5 h-3.5" /> {isAdmin ? "استرجاع مبلغ" : "طلب استرجاع"}
          </Button>
        )}
      </div>
      {rows.length > 0 && <div className="grid gap-2 md:grid-cols-2">{rows.map((r) => <RefundCard key={r.id} r={r} isAdmin={isAdmin} />)}</div>}
      {canRequest && <RequestRefundDialog patientId={patientId} patientName={patientName} open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** قسمُ «طلبات الاسترجاع» في صفحة «طلبات التصحيح» — بفلترها، ورابطُ تنبيه تلغرام ينتهي بـ`#refunds`. */
export function RefundsSection({ status }: { status: "pending" | "approved" | "rejected" }) {
  const ref = useRef<HTMLElement | null>(null);
  const q = useQuery<RefundRow[]>({
    queryKey: ["/api/patient-refunds", status],
    queryFn: async () => (await apiRequest("GET", `/api/patient-refunds?status=${status}`)).json(),
  });
  const rows = useMemo(() => q.data ?? [], [q.data]);
  useHashScroll(ref, "#refunds", q.isSuccess);
  return (
    <section id="refunds" ref={ref} className="space-y-2 scroll-mt-20" data-testid="refunds-section">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">طلبات الاسترجاع للمرضى</h2>
        {status === "pending" && rows.length > 0 && <Badge className="bg-primary/10 text-primary hover:bg-primary/10" data-testid="refunds-count">{rows.length}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        مبلغٌ يُرَدّ لمريض طلبه موظّفٌ أعطيتَه هذه الصلاحية. اعتمادُه يكتب الاسترجاعَ حركةً مستقلّةً بيوم اليوم وسنداً يوقّعه المريض، ورفضُه لا يغيّر شيئاً.
      </p>
      {q.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        : q.isError ? <p className="text-sm text-destructive">{errText(q.error)}</p>
        : rows.length === 0 ? (
          <p className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground" data-testid="refunds-empty">
            {status === "pending" ? "لا توجد طلباتُ استرجاعٍ معلَّقة." : "لا توجد طلباتٌ بهذه الحالة."}
          </p>
        ) : <div className="grid gap-2 md:grid-cols-2">{rows.map((r) => <RefundCard key={r.id} r={r} isAdmin />)}</div>}
    </section>
  );
}

/** النزولُ إلى قسمٍ برابطه (`#refunds` · `#hospital`) — يُعاد حتى يستقرّ ما فوقه، ويتوقّف إن حرّك المستخدمُ الصفحة. */
export function useHashScroll(ref: React.RefObject<HTMLElement | null>, hash: string, ready: boolean) {
  useEffect(() => {
    if (!ready || window.location.hash !== hash) return;
    let stopped = false;
    const stop = () => { stopped = true; };
    const go = () => { if (!stopped) ref.current?.scrollIntoView({ block: "start" }); };
    go();
    const timers = [300, 800, 1500, 2200].map((ms) => window.setTimeout(go, ms));
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    return () => { timers.forEach(clearTimeout); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); };
  }, [ready, hash]);
}
