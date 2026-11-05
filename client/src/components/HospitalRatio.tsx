// **«نسبة مستشفى العين»** (ترحيل ١٩٢، §4.fz — طلبُ المالك ٢٠٢٦-١١-٠٥): مربّعٌ في دفتر «علاج طبيعي» لذي قار يُعزل فيه عُشرُ وارد الدفترين
// وحده، و«طلب تسليم للمستشفى» يعتمده المسؤول فينقص المربّع — والتسليمُ يُسجَّل في خلفية المربّع: بالضغط عليه يظهر كم سُلّم ومتى ومَن.
//   • `HospitalBox` — المربّعُ في الدفتر بسجلّه وزرّ الطلب.
//   • `DeliveryCard` و`HospitalDeliveriesSection` — في صفحة «طلبات التصحيح» (`#hospital`) بقرار المسؤول.
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AlertTriangle, History } from "lucide-react";
import { amountInArabicWords } from "@shared/reserve_withdrawals";
import { DELIVERY_NOTE_MAX, HOSPITAL_BOX_LABEL } from "@shared/hospital_ratio";
import { baghdadDateTime } from "@/components/ReserveWithdrawal";
import { useHashScroll } from "@/components/PatientRefund";

export interface HospitalBoxState {
  start: string; pct: number;
  books: { book: "devices" | "physio"; amount: number; gross: number; deduction: number; carriedIn: number; carriedOut: number }[];
  prev: number; today: number; delivered: number; remaining: number;
  deliveries: { id: number; amount: number; note: string | null; requestedByName: string | null; decidedByName: string | null; decidedAt: string | null }[];
  deductionToday: number; carriedToday: number; deferred: number;
}
export interface DeliveryRow {
  id: number; branchId: number; branchName?: string | null; amount: number; amountWords: string; note: string | null; status: "pending" | "approved" | "rejected";
  statusLabel: string; remainingAtRequest: number | null; remainingNow: number | null; remainingAfter: number | null; exceeds: boolean;
  requestedBy: number | null; requestedByName: string | null; requestedAt: string; decidedByName: string | null; decidedAt: string | null;
  decisionNote: string | null; deliveredOn: string | null;
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
function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["/api/hospital-ratio"] });
  qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
}

function Row({ label, value, strong, danger, testid }: { label: string; value: number; strong?: boolean; danger?: boolean; testid?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${strong ? "font-bold text-base border-t pt-1" : ""} ${danger ? "text-rose-700" : ""}`} data-testid={testid}>
      <span>{label}</span><span className="mr-auto"><Num n={value} /></span>
    </div>
  );
}

/** المربّعُ في الدفتر — يُضغط فيظهر سجلُّ التسليمات. */
export function HospitalBox({ box, branchId, isAdmin, canWrite, canRequest, pending }: {
  box: HospitalBoxState; branchId: number; isAdmin: boolean; canWrite: boolean; canRequest: boolean;
  pending: { id: number; amount: number; note: string | null; requestedByName: string | null; mine: boolean }[];
}) {
  const [history, setHistory] = useState(false);
  const [ask, setAsk] = useState(false);
  const physio = box.books.find((b) => b.book === "physio");
  const devices = box.books.find((b) => b.book === "devices");
  const pendingTotal = pending.reduce((t, p) => t + p.amount, 0);
  return (
    <div className="border-4 border-double border-teal-700 rounded-sm p-3 space-y-1.5 text-sm" data-testid="hospital-box">
      <button type="button" className="w-full text-start space-y-1.5" onClick={() => setHistory(true)} aria-label="سجلّ التسليمات" data-testid="hospital-box-open">
        <div className="flex items-start gap-2">
          <h3 className="font-bold text-base text-teal-800">{HOSPITAL_BOX_LABEL}</h3>
          <History className="w-4 h-4 mr-auto text-teal-700 shrink-0" />
        </div>
        {physio && <Row label={`عزل العلاج الطبيعي (${box.pct}٪)`} value={physio.amount} testid="hospital-physio" />}
        {devices && <Row label={`عزل الأطراف والمساند (${box.pct}٪)`} value={devices.amount} testid="hospital-devices" />}
        {box.deductionToday > 0 && <Row label="منه خصمُ استرجاع (بقرارك)" value={-box.deductionToday} danger testid="hospital-deduction" />}
        {box.carriedToday > 0 && <Row label="منه خصمٌ مؤجَّل من أيّامٍ قبله" value={-box.carriedToday} danger testid="hospital-carried" />}
        <Row label="مجموع اليوم" value={box.today} testid="hospital-today" />
        <Row label="المتبقي من أمس" value={box.prev} testid="hospital-prev" />
        {box.delivered > 0 && <Row label="سُلّم للمستشفى اليوم" value={-box.delivered} testid="hospital-delivered" />}
        <Row label="المتبقي للمستشفى" value={box.remaining} strong testid="hospital-remaining" />
        {box.deferred > 0 && (
          <p className="text-xs text-rose-700" data-testid="hospital-deferred">مؤجَّلٌ من استرجاع: <Num n={box.deferred} /> — يُخصم من الأيّام التالية.</p>
        )}
        <p className="text-[11px] text-muted-foreground text-center">اضغط المربّع لترى سجلّ التسليمات</p>
      </button>
      {pending.length > 0 && (
        <ul className="text-xs space-y-1" data-testid="hospital-pending">
          {pending.map((p) => (
            <li key={p.id} className="rounded border border-amber-300 bg-amber-50 px-2 py-1" data-testid={`hospital-pending-${p.id}`}>
              طلب تسليم <Num n={p.amount} />{p.note ? ` — ${p.note}` : ""}
              <span className="block text-amber-800">{p.mine ? "طلبُك" : `من ${p.requestedByName ?? "موظّف"}`} · بانتظار اعتماد المسؤول</span>
            </li>
          ))}
        </ul>
      )}
      {(canRequest || isAdmin) && canWrite && (
        <Button size="sm" variant="outline" className="w-full border-teal-700 text-teal-800" onClick={() => setAsk(true)} data-testid="hospital-request">
          {isAdmin ? "تسليم للمستشفى" : "طلب «تسليم للمستشفى»"}
        </Button>
      )}
      <RequestDeliveryDialog branchId={branchId} isAdmin={isAdmin} remaining={box.remaining} pendingTotal={pendingTotal}
        open={ask} onClose={() => setAsk(false)} />
      <DeliveryHistoryDialog branchId={branchId} isAdmin={isAdmin} open={history} onClose={() => setHistory(false)} />
    </div>
  );
}

function RequestDeliveryDialog({ branchId, isAdmin, remaining, pendingTotal, open, onClose }: {
  branchId: number; isAdmin: boolean; remaining: number; pendingTotal: number; open: boolean; onClose: () => void;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const n = Number(amount || 0);
  const available = remaining - pendingTotal;
  const send = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/hospital-ratio/deliveries", { branchId, amount: n, note: note.trim() || undefined })).json(),
    onSuccess: () => {
      invalidate(qc);
      toast({ title: isAdmin ? "سُجّل التسليم ونقص المربّع" : "أُرسل الطلب إلى المسؤول" });
      setAmount(""); setNote(""); onClose();
    },
    onError: (e: any) => toast({ title: "تعذّر", description: errText(e), variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isAdmin ? "تسليم لمستشفى العين" : "طلب تسليم لمستشفى العين"}</DialogTitle>
          <DialogDescription>{isAdmin ? "ينقص المربّعُ بالمبلغ اليوم." : "لا ينقص المربّعُ حتى يعتمده المسؤول."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" data-testid="hospital-request-dialog">
          <p className="rounded-md bg-muted px-3 py-2">المتبقي للمستشفى الآن: <b><Num n={remaining} /></b> دينار
            {pendingTotal > 0 && <span className="block">ومعلَّقٌ بانتظار المسؤول: <Num n={pendingTotal} /> — المتاح <b><Num n={available} /></b></span>}
          </p>
          <label className="grid gap-1">المبلغ المسلَّم
            <Input inputMode="numeric" dir="ltr" className="text-left tabular-nums" value={amount ? Number(amount).toLocaleString("en-US") : ""}
              onChange={(e) => setAmount(digits(e.target.value))} data-testid="hospital-amount" />
            {n > 0 && <span className="text-xs text-muted-foreground">{amountInArabicWords(n)} — ويبقى بعده <Num n={remaining - n} /></span>}
            {n > available && <span className="rounded bg-red-50 border border-red-300 text-red-800 px-2 py-1 text-xs" data-testid="hospital-too-much">المبلغ أكبر من المتاح</span>}
          </label>
          <label className="grid gap-1">ملاحظة (اختيارية)
            <Input value={note} maxLength={DELIVERY_NOTE_MAX} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: تسليم الأسبوع — استلمه المحاسب أبو علي" data-testid="hospital-note" />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={!n || n > available || send.isPending} onClick={() => send.mutate()} data-testid="hospital-submit">
            {isAdmin ? "سلّم" : "إرسال الطلب"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** سجلُّ التسليمات — كم ومتى ومَن، والمعلَّقُ والمرفوضُ بحالهما. */
function DeliveryHistoryDialog({ branchId, isAdmin, open, onClose }: { branchId: number; isAdmin: boolean; open: boolean; onClose: () => void }) {
  const q = useQuery<DeliveryRow[]>({
    queryKey: ["/api/hospital-ratio", "history", branchId],
    enabled: open,
    queryFn: async () => (await apiRequest("GET", `/api/hospital-ratio/deliveries${isAdmin ? `?branchId=${branchId}` : ""}`)).json(),
  });
  const rows = q.data ?? [];
  const total = rows.filter((r) => r.status === "approved").reduce((t, r) => t + r.amount, 0);
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-lg max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>سجلّ التسليم لمستشفى العين</DialogTitle>
          <DialogDescription>كلُّ مبلغٍ سُلّم، ومتى، ومَن طلبه ومَن اعتمده — مجموع المسلَّم <b><Num n={total} /></b> دينار.</DialogDescription>
        </DialogHeader>
        {q.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
          : !rows.length ? <p className="text-sm text-muted-foreground py-4 text-center" data-testid="hospital-history-empty">لم يُسلَّم شيءٌ بعد.</p>
          : (
            <table className="w-full text-sm" data-testid="hospital-history">
              <thead className="text-muted-foreground text-xs"><tr><th className="text-start py-1">اليوم</th><th className="text-start">المبلغ</th><th className="text-start">التفصيل</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-t align-top ${r.status === "pending" ? "bg-amber-50" : r.status === "rejected" ? "text-muted-foreground line-through decoration-1" : ""}`}
                    data-testid={`hospital-history-${r.id}`}>
                    <td className="py-1.5 tabular-nums" dir="ltr">{r.deliveredOn ? r.deliveredOn.split("-").reverse().join("/") : "—"}</td>
                    <td className="font-semibold"><Num n={r.amount} /></td>
                    <td className="text-xs">
                      {r.statusLabel}{r.note ? ` — ${r.note}` : ""}
                      <span className="block text-muted-foreground">طلبه {r.requestedByName ?? "موظّف"} · {baghdadDateTime(r.requestedAt)}</span>
                      {r.decidedAt && <span className="block text-muted-foreground">{r.status === "rejected" ? "رفضه" : "اعتمده"} {r.decidedByName ?? "المسؤول"} · {baghdadDateTime(r.decidedAt)}{r.decisionNote ? ` — ${r.decisionNote}` : ""}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </DialogContent>
    </Dialog>
  );
}

/** بطاقةُ طلب التسليم — للمسؤول بقراره. */
export function DeliveryCard({ r, isAdmin }: { r: DeliveryRow; isAdmin: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: async (d: "approve" | "reject") =>
      (await apiRequest("POST", `/api/hospital-ratio/deliveries/${r.id}/${d}`, note.trim() ? { note: note.trim() } : {})).json(),
    onSuccess: (_x, d) => { invalidate(qc); setDialog(null); toast({ title: d === "approve" ? "اعتُمد التسليم ونقص المربّع" : "رُفض الطلب — لم يتغيّر شيء" }); },
    onError: (e: any) => { invalidate(qc); toast({ title: "تعذّر", description: errText(e), variant: "destructive" }); },
  });
  const pending = r.status === "pending";
  return (
    <div className={`rounded-md border bg-background p-3 space-y-2 text-sm ${r.exceeds && pending ? "border-red-400" : ""}`} data-testid={`delivery-${r.id}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-bold text-base">طلب تسليم لمستشفى العين</span>
        <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"} className="ms-auto">{r.statusLabel}</Badge>
      </div>
      {r.exceeds && pending && (
        <div className="flex items-center gap-2 rounded bg-red-600 text-white px-3 py-1.5 text-sm font-semibold">
          <AlertTriangle className="w-4 h-4 shrink-0" /> المبلغ أكبر من المتبقّي للمستشفى — لا يُعتمد
        </div>
      )}
      <div className="grid grid-cols-[7rem_1fr] gap-y-1.5">
        <span className="text-muted-foreground">الفرع</span><span>{r.branchName ?? ""}</span>
        <span className="text-muted-foreground">المبلغ</span>
        <span><b className="text-lg"><Num n={r.amount} /></b> دينار<span className="block text-muted-foreground">{r.amountWords}</span></span>
        {pending && r.remainingNow != null && (<>
          <span className="text-muted-foreground">المتبقّي الآن</span>
          <span><Num n={r.remainingNow} /> ← بعد التسليم <b><Num n={r.remainingAfter} className={r.exceeds ? "text-red-700" : ""} /></b></span>
        </>)}
        {r.note && (<><span className="text-muted-foreground">ملاحظة</span><span>{r.note}</span></>)}
        <span className="text-muted-foreground">طلبه</span><span>{r.requestedByName ?? "موظّف"} <span className="text-muted-foreground">· {baghdadDateTime(r.requestedAt)}</span></span>
        {!pending && (<>
          <span className="text-muted-foreground">{r.status === "approved" ? "اعتمده" : "رفضه"}</span>
          <span>{r.decidedByName ?? "المسؤول"} <span className="text-muted-foreground">· {baghdadDateTime(r.decidedAt)}</span>{r.decisionNote ? <span className="block">{r.decisionNote}</span> : null}</span>
        </>)}
      </div>
      {isAdmin && pending && (
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" className="border-red-400 text-red-700" onClick={() => { setNote(""); setDialog("reject"); }} data-testid={`delivery-reject-${r.id}`}>رفض بسبب</Button>
          <Button size="sm" disabled={r.exceeds} onClick={() => { setNote(""); setDialog("approve"); }} data-testid={`delivery-approve-${r.id}`}>اعتماد</Button>
        </div>
      )}
      <Dialog open={dialog !== null} onOpenChange={(v) => { if (!v) setDialog(null); }}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "approve" ? "اعتماد التسليم" : "رفض الطلب"}</DialogTitle>
            <DialogDescription>{dialog === "approve" ? `ينقص مربّعُ نسبة مستشفى العين ${money(r.amount)} دينار اليوم.` : "لا يتغيّر شيء، ويصل السببُ الطالب."}</DialogDescription>
          </DialogHeader>
          <label className="grid gap-1 text-sm">{dialog === "approve" ? "ملاحظة (اختيارية)" : "سبب الرفض"}
            <Input value={note} onChange={(e) => setNote(e.target.value)} data-testid="delivery-decision-note" />
          </label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialog(null)}>إلغاء</Button>
            <Button variant={dialog === "reject" ? "destructive" : "default"} disabled={decide.isPending || (dialog === "reject" && note.trim().length < 3)}
              onClick={() => decide.mutate(dialog!)} data-testid="delivery-decision-confirm">{dialog === "approve" ? "اعتمد" : "ارفض"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** قسمُ «طلبات التسليم لمستشفى العين» في صفحة «طلبات التصحيح» — رابطُ تلغرام ينتهي بـ`#hospital`. */
export function HospitalDeliveriesSection({ status }: { status: "pending" | "approved" | "rejected" }) {
  const ref = useRef<HTMLElement | null>(null);
  const q = useQuery<DeliveryRow[]>({
    queryKey: ["/api/hospital-ratio", "deliveries", status],
    queryFn: async () => (await apiRequest("GET", `/api/hospital-ratio/deliveries?status=${status}`)).json(),
  });
  const rows = q.data ?? [];
  useHashScroll(ref, "#hospital", q.isSuccess);
  return (
    <section id="hospital" ref={ref} className="space-y-2 scroll-mt-20" data-testid="hospital-section">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">طلبات التسليم لمستشفى العين</h2>
        {status === "pending" && rows.length > 0 && <Badge className="bg-primary/10 text-primary hover:bg-primary/10" data-testid="hospital-count">{rows.length}</Badge>}
      </div>
      <p className="text-sm text-muted-foreground">
        مبلغٌ سلّمه الفرعُ لمستشفى العين من مربّع النسبة. اعتمادُه ينقص المربّعَ اليوم ولا يمسّ القاصة — فالنسبةُ خرجت منها يومَ عُزلت.
      </p>
      {q.isLoading ? <p className="text-sm text-muted-foreground">جارٍ التحميل…</p>
        : q.isError ? <p className="text-sm text-destructive">{errText(q.error)}</p>
        : rows.length === 0 ? (
          <p className="rounded-md border px-3 py-6 text-center text-sm text-muted-foreground">
            {status === "pending" ? "لا توجد طلباتُ تسليمٍ معلَّقة." : "لا توجد طلباتٌ بهذه الحالة."}
          </p>
        ) : <div className="grid gap-2 md:grid-cols-2">{rows.map((r) => <DeliveryCard key={r.id} r={r} isAdmin />)}</div>}
    </section>
  );
}
