// **«طلب سحب من القاصات»** (ترحيل ١٨٩، §4.fy — طلبُ المالك ٢٠٢٦-١١-٠٣): حاملُ المفتاح يطلب السحبَ من «قاصة المواد» أو
// «قاصة الرواتب والإيجار»، والمسؤولُ يعتمده فيُكتب سطرُ السحب بيوم الاعتماد، أو يرفضه بسببٍ فلا يتغيّر شيء.
//   • `RequestWithdrawalDialog` — الطالبُ يكتب المبلغَ والغرض، ويرى الرصيدَ وما بعده والمبلغَ بالكلمات قبل الإرسال.
//   • `WithdrawalCard` — البطاقةُ المقروءة («واضحةٌ ومقروءة» — قولُ المالك): الفرعُ والدفترُ والقاصة، والمبلغُ رقماً وكلمات،
//     والرصيدُ الآن وبعد السحب وشريطٌ أحمر إن تجاوزه، والغرض، والطالبُ ووقتُه — وللمسؤول «اعتمد وأسحب» و«ارفض».
//   • `ReserveWithdrawalsPanel` (الدفتر) و`ReserveWithdrawalsSection` (صفحة «طلبات التصحيح») — **الطلبُ واحدٌ في المكانين**.
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle } from "lucide-react";
import { RESERVE_LABELS, type CashBook, type ReserveKey } from "@shared/cash_book";
import { PURPOSE_MAX, PURPOSE_MIN, amountInArabicWords, balanceAfter } from "@shared/reserve_withdrawals";

export interface WithdrawalRow {
  id: number; branchId: number; branchName: string; book: CashBook; bookLabel: string;
  reserve: ReserveKey; boxLabel: string; amount: number; amountWords: string; purpose: string;
  status: "pending" | "approved" | "rejected"; statusLabel: string;
  balance: number | null; balanceAfter: number | null; exceeds: boolean; balanceAtRequest: number | null;
  /** طلباتٌ أخرى معلَّقة على القاصة نفسِها (ترحيل ١٩٠) — وما يبقى إن اعتُمدت كلُّها. */
  otherPendingCount?: number; otherPendingAmount?: number; balanceAfterAllPending?: number | null; allPendingExceed?: boolean;
  requestedBy: number | null; requestedByName: string | null; requestedAt: string;
  decidedByName: string | null; decidedAt: string | null; decisionNote: string | null; entryId: number | null;
}

const money = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n.toLocaleString("en-US"));
const digits = (v: string) => v.replace(/[^\d]/g, "");
/** وقتُ بغداد مقروءاً: «03/11/2026 — 10:42». */
export function baghdadDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("day")}/${get("month")}/${get("year")} — ${get("hour")}:${get("minute")}`;
}
const errText = (e: any): string => {
  const raw = String(e?.message ?? "").replace(/^\d+:\s*/, "");
  try { return JSON.parse(raw)?.error ?? raw; } catch { return raw; }
};

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["/api/reserve-withdrawals"] });
  qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
}

/** طلبُ السحب — من مربّع القاصة في الدفتر، لحامل المفتاح. */
export function RequestWithdrawalDialog({ reserve, branchId, book, balance, pendingTotal = 0, pendingCount = 0, open, onClose }: {
  reserve: ReserveKey; branchId: number; book: CashBook; balance: number; pendingTotal?: number; pendingCount?: number; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  useEffect(() => { if (open) { setAmount(""); setPurpose(""); } }, [open]);
  const n = Number(amount || 0);
  const after = n > 0 ? balanceAfter(balance, n) : null;
  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/reserve-withdrawals", { branchId, book, reserve, amount: n, purpose: purpose.trim() })).json(),
    onSuccess: () => {
      invalidate(qc);
      toast({ title: "أُرسل طلبُ السحب", description: "لا يخرج شيءٌ من القاصة حتى يعتمده المسؤول." });
      onClose();
    },
    onError: (e: any) => toast({ title: "تعذّر الإرسال", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>طلب سحب من {RESERVE_LABELS[reserve].box}</DialogTitle>
          <DialogDescription>يصل المسؤولَ ليعتمده — ولا يُسحب شيءٌ قبل اعتماده.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" data-testid="withdrawal-request-dialog">
          <p className="rounded-md bg-muted px-3 py-2">الرصيد الآن في القاصة: <b className="tabular-nums" dir="ltr">{money(balance)}</b> دينار</p>
          {pendingCount > 0 && (
            <p className="rounded-md bg-amber-50 border border-amber-300 px-3 py-2 text-amber-900" data-testid="withdrawal-pending-note">
              وعلى القاصة {pendingCount === 1 ? "طلبٌ معلَّق" : `${pendingCount} طلباتٍ معلَّقة`} بمجموع <b className="tabular-nums" dir="ltr">{money(pendingTotal)}</b> بانتظار المسؤول.
            </p>
          )}
          <label className="grid gap-1">المبلغ المطلوب
            <Input inputMode="numeric" dir="ltr" className="text-left tabular-nums" value={amount ? Number(amount).toLocaleString("en-US") : ""}
              placeholder="0" onChange={(e) => setAmount(digits(e.target.value))} data-testid="withdrawal-amount" autoFocus />
          </label>
          {n > 0 && (
            <div className="space-y-1" data-testid="withdrawal-preview">
              <p className="text-muted-foreground">{amountInArabicWords(n)}</p>
              <p>بعد السحب يبقى: <b className={`tabular-nums ${after!.exceeds ? "text-red-700" : ""}`} dir="ltr">{money(after!.after)}</b></p>
              {after!.exceeds && (
                <p className="rounded bg-red-50 border border-red-300 text-red-800 px-2 py-1 text-xs" data-testid="withdrawal-exceeds">
                  المبلغ أكبر من رصيد القاصة — يصل المسؤولَ هكذا والقرارُ له.
                </p>
              )}
            </div>
          )}
          <label className="grid gap-1">الغرض — أين يذهب المبلغ؟
            <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} maxLength={PURPOSE_MAX} rows={3}
              placeholder={reserve === "materials" ? "مثلاً: مواد سيليكون من المورّد" : "مثلاً: رواتب شهر ١١"} data-testid="withdrawal-purpose" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={send.isPending || !(n > 0) || purpose.trim().length < PURPOSE_MIN} onClick={() => send.mutate()} data-testid="withdrawal-send">
            أرسل الطلب للمسؤول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useWithdrawalDecision() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (p: { id: number; decision: "approve" | "reject"; note: string }) =>
      (await apiRequest("POST", `/api/reserve-withdrawals/${p.id}/${p.decision}`, p.note.trim() ? { note: p.note.trim() } : {})).json(),
    onSuccess: (_d, p) => { invalidate(qc); toast({ title: p.decision === "approve" ? "اعتُمد وسُجّل السحب في الدفتر" : "رُفض الطلب — لم يتغيّر شيء" }); },
    onError: (e: any) => { invalidate(qc); toast({ title: "تعذّر", description: errText(e), variant: "destructive" }); },
  });
}

/** سطرٌ في البطاقة: عنوانٌ وقيمة. */
function Line({ label, children, testid }: { label: string; children: React.ReactNode; testid?: string }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1 border-b last:border-b-0" data-testid={testid}>
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

/** بطاقةُ الطلب المقروءة — للمسؤول بقراره، ولغيره بحاله. */
export function WithdrawalCard({ r, isAdmin }: { r: WithdrawalRow; isAdmin: boolean }) {
  const decide = useWithdrawalDecision();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const busy = decide.isPending && decide.variables?.id === r.id;
  const pending = r.status === "pending";
  return (
    <div className={`rounded-md border bg-background p-3 space-y-2 text-sm ${r.exceeds && pending ? "border-red-400" : ""}`} data-testid={`withdrawal-${r.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-base">طلب سحب من {r.boxLabel}</span>
        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="ms-auto"
          data-testid={`withdrawal-status-${r.id}`}>{r.statusLabel}</Badge>
      </div>
      {r.exceeds && pending && (
        <div className="flex items-center gap-2 rounded bg-red-600 text-white px-3 py-1.5 text-sm font-semibold" data-testid={`withdrawal-exceeds-${r.id}`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          المبلغ أكبر من رصيد القاصة بـ <span className="tabular-nums" dir="ltr">{money(-(r.balanceAfter ?? 0))}</span>
        </div>
      )}
      <div>
        <Line label="الفرع والدفتر" testid={`withdrawal-where-${r.id}`}>{r.branchName} — {r.bookLabel}</Line>
        <Line label="المبلغ" testid={`withdrawal-amount-${r.id}`}>
          <b className="text-lg tabular-nums" dir="ltr">{money(r.amount)}</b> دينار
          <span className="block text-muted-foreground">{r.amountWords}</span>
        </Line>
        {r.balance !== null && (
          <Line label={pending ? "الرصيد الآن" : "الرصيد عند الطلب"} testid={`withdrawal-balance-${r.id}`}>
            <span className="tabular-nums" dir="ltr">{money(r.balance)}</span>
            {" ← بعد السحب "}
            <b className={`tabular-nums ${r.exceeds ? "text-red-700" : ""}`} dir="ltr">{money(r.balanceAfter)}</b>
          </Line>
        )}
        {pending && (r.otherPendingCount ?? 0) > 0 && (
          <Line label="طلباتٌ أخرى معلَّقة" testid={`withdrawal-others-${r.id}`}>
            {r.otherPendingCount === 1 ? "طلبٌ آخر" : `${r.otherPendingCount} طلباتٍ أخرى`} على القاصة نفسِها بمجموع <span className="tabular-nums" dir="ltr">{money(r.otherPendingAmount)}</span>
            {r.balanceAfterAllPending != null && (
              <span className="block">
                إن اعتُمدت كلُّها يبقى <b className={`tabular-nums ${r.allPendingExceed ? "text-red-700" : ""}`} dir="ltr">{money(r.balanceAfterAllPending)}</b>
              </span>
            )}
          </Line>
        )}
        <Line label="الغرض" testid={`withdrawal-purpose-${r.id}`}>{r.purpose}</Line>
        <Line label="الطالب" testid={`withdrawal-by-${r.id}`}>
          {r.requestedByName ?? "موظّف"} <span className="text-muted-foreground tabular-nums">· {baghdadDateTime(r.requestedAt)}</span>
        </Line>
        {!pending && (
          <Line label={r.status === "approved" ? "اعتمده" : "رفضه"} testid={`withdrawal-decision-${r.id}`}>
            {r.decidedByName ?? "المسؤول"} <span className="text-muted-foreground tabular-nums">· {baghdadDateTime(r.decidedAt)}</span>
            {r.decisionNote && <span className="block">{r.status === "rejected" ? "السبب: " : "ملاحظة: "}{r.decisionNote}</span>}
          </Line>
        )}
      </div>
      {isAdmin && pending && (
        <div className="flex gap-2 justify-end">
          <Button size="sm" disabled={busy} onClick={() => { setNote(""); setDialog("approve"); }} data-testid={`withdrawal-approve-${r.id}`}>اعتمد وأسحب</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => { setNote(""); setDialog("reject"); }} data-testid={`withdrawal-reject-${r.id}`}>ارفض</Button>
        </div>
      )}
      <Dialog open={dialog !== null} onOpenChange={(v) => { if (!v) setDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "approve" ? "اعتماد السحب" : "رفض الطلب"}</DialogTitle>
            <DialogDescription>
              {dialog === "approve"
                ? `يُكتب سحبُ ${money(r.amount)} دينار من ${r.boxLabel} — ${r.branchName}، ${r.bookLabel} — في دفتر اليوم.`
                : "لا يتغيّر شيءٌ في القاصة، ويصل السببُ الطالب."}
            </DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">{dialog === "approve" ? "ملاحظة (اختيارية)" : "سبب الرفض"}
            <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="withdrawal-decision-note" />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>إلغاء</Button>
            <Button variant={dialog === "reject" ? "destructive" : "default"}
              disabled={busy || (dialog === "reject" && note.trim().length < 3)} data-testid="withdrawal-decision-confirm"
              onClick={() => decide.mutate({ id: r.id, decision: dialog!, note }, { onSuccess: () => setDialog(null) })}>
              {dialog === "approve" ? "اعتمد وأسحب" : "ارفض"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * في الدفتر: للمسؤول المعلَّقُ كلُّه بقراره، ولحامل المفتاح طلباتُه في الأيام السبعة الأخيرة بحالها. لا تظهر إن لم يكن شيء.
 */
export function ReserveWithdrawalsPanel({ isAdmin, enabled }: { isAdmin: boolean; enabled: boolean }) {
  const q = useQuery<WithdrawalRow[]>({
    queryKey: ["/api/reserve-withdrawals", isAdmin ? "pending" : "mine"],
    enabled,
    queryFn: async () => (await apiRequest("GET", `/api/reserve-withdrawals${isAdmin ? "?status=pending" : ""}`)).json(),
  });
  const rows = (q.data ?? []).filter((r) => isAdmin || r.status === "pending" || Date.now() - Date.parse(r.decidedAt ?? r.requestedAt) < 7 * 86_400_000);
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-teal-300 bg-teal-50/60 p-3 space-y-2" data-testid="withdrawal-panel">
      <p className="font-semibold text-sm">{isAdmin ? `طلبات سحب من القاصات بانتظارك (${rows.length})` : "طلبات السحب التي قدّمتَها"}</p>
      {rows.map((r) => <WithdrawalCard key={r.id} r={r} isAdmin={isAdmin} />)}
    </div>
  );
}

/** القسمُ الثالث في صفحة «طلبات التصحيح» — بفلترها، ورابطُ تنبيه تلغرام ينتهي بـ`#withdrawals`. */
export function ReserveWithdrawalsSection({ status }: { status: "pending" | "approved" | "rejected" }) {
  const ref = useRef<HTMLElement | null>(null);
  const q = useQuery<WithdrawalRow[]>({
    queryKey: ["/api/reserve-withdrawals", status],
    queryFn: async () => (await apiRequest("GET", `/api/reserve-withdrawals?status=${status}`)).json(),
  });
  const rows = q.data ?? [];
  //  القسمُ الثالث في الصفحة: ما فوقه يُحمَّل معه فيدفعه — فالنزولُ يُعاد حتى يستقرّ ما فوقه (ثانيتان)، ويتوقّف إن حرّك المستخدمُ الصفحة.
  useEffect(() => {
    if (!q.isSuccess || window.location.hash !== "#withdrawals") return;
    let stopped = false;
    const stop = () => { stopped = true; };
    const go = () => { if (!stopped) ref.current?.scrollIntoView({ block: "start" }); };
    go();
    const timers = [300, 800, 1500, 2200].map((ms) => window.setTimeout(go, ms));
    window.addEventListener("wheel", stop, { once: true, passive: true });
    window.addEventListener("touchstart", stop, { once: true, passive: true });
    return () => { timers.forEach(clearTimeout); window.removeEventListener("wheel", stop); window.removeEventListener("touchstart", stop); };
  }, [q.isSuccess]);
  return (
    <section id="withdrawals" ref={ref} className="space-y-2 scroll-mt-20" data-testid="withdrawals-section">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">طلبات سحب من القاصات</h2>
        {status === "pending" && rows.length > 0 && <Badge className="bg-primary/10 text-primary hover:bg-primary/10" data-testid="withdrawals-count">{rows.length}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        سحبٌ من «قاصة المواد» أو «قاصة الرواتب والإيجار» طلبه موظّفٌ أعطيتَه هذه الصلاحية. اعتمادُه يكتب السحبَ في دفتر اليوم، ورفضُه لا يغيّر شيئاً —
        وهو الطلبُ نفسُه الظاهرُ في دفتر القاصة.
      </p>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">{errText(q.error)}</p>
      ) : rows.length === 0 ? (
        <p className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground" data-testid="withdrawals-empty">
          {status === "pending" ? "لا توجد طلباتُ سحبٍ معلَّقة." : "لا توجد طلباتٌ بهذه الحالة."}
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">{rows.map((r) => <WithdrawalCard key={r.id} r={r} isAdmin />)}</div>
      )}
    </section>
  );
}
