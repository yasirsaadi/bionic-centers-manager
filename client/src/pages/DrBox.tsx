// **قاصةُ الدكتور لكلّ فرع** (ترحيل ٠٩٩، §4.cb) — للمسؤول وحده.
// الواردُ = «تحويل إلى قاصة الدكتور» من دفتر القاصة · المصروفُ يكتبه المالكُ هنا · والرصيدُ الفرقُ بينهما من البداية.
// والفرعُ يرى في دفتره يومَ الصرف وبابَه فقط — بلا مبلغ.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { EXPENSE_CATEGORIES } from "@/lib/expense_categories";
import { Pencil, Trash2 } from "lucide-react";
import { CASH_BOOK_LABELS, dayNameOf, drBoxAccountLabel } from "@shared/cash_book";
import { baghdadTodayYmd } from "@shared/visit_date";

interface Report {
  branch: { id: number; name: string; account: string | null };
  today: string; from: string; to: string;
  opening: { date: string; amount: number } | null;
  totals: { received: number; spent: number; balance: number };
  period: { received: number; spent: number };
  transfers: { id: number; date: string; book: "devices" | "physio"; amount: number; note: string }[];
  expenses: { id: number; date: string; category: string; amount: number; note: string }[];
}
type Expense = Report["expenses"][number];

const fmt = (n: number) => n.toLocaleString("en-US");
const digits = (v: string) => v.replace(/[^\d]/g, "");
const dmy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
const categoryLabel = (c: string) => EXPENSE_CATEGORIES.find((x) => x.value === c)?.label ?? c;

function AmountInput({ value, onChange, id }: { value: string; onChange: (v: string) => void; id: string }) {
  return (
    <Input id={id} inputMode="numeric" dir="ltr" className="text-left tabular-nums w-40"
      value={value ? Number(value).toLocaleString("en-US") : ""} placeholder="0"
      onChange={(e) => onChange(digits(e.target.value))} />
  );
}

function useCategories(branchId: number | null) {
  const { data: custom = [] } = useQuery<{ label: string; branchId: number | null }[]>({ queryKey: ["/api/expense-categories"] });
  return useMemo(() => [
    ...EXPENSE_CATEGORIES.filter((c) => !(c as any).sheetOnly && !(c as any).karbalaOnly),
    ...custom.filter((c) => c.branchId == null || c.branchId === branchId).map((c) => ({ value: c.label, label: c.label })),
  ], [custom, branchId]);
}

export default function DrBox() {
  const session = useBranchSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = baghdadTodayYmd();
  const { data: branchList = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/branches"], enabled: Boolean(session?.isAdmin) });
  const [branchId, setBranchId] = useState<number | null>(null);
  useEffect(() => {
    if (branchId) return;
    setBranchId(session?.branchId && session.branchId > 0 ? session.branchId : (branchList[0]?.id ?? null));
  }, [session?.branchId, branchList, branchId]);
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [editing, setEditing] = useState<Expense | null>(null);

  const q = useQuery<Report>({
    queryKey: ["/api/dr-box", branchId, from, to],
    enabled: Boolean(branchId) && Boolean(session?.isAdmin),
    queryFn: async () => {
      const res = await fetch(`/api/dr-box?branchId=${branchId}&from=${from}&to=${to}`, { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "تعذّر تحميل قاصة الدكتور");
      return j;
    },
  });
  const write = useMutation({
    mutationFn: async (p: { method: string; url: string; body?: any }) => (await apiRequest(p.method, p.url, p.body)).json(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/dr-box"] });
      qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
    },
    onError: (e: any) => toast({ title: "لم يُحفَظ", description: e?.message ?? "تعذّر الحفظ", variant: "destructive" }),
  });

  if (!session?.isAdmin) {
    return <p className="p-10 text-center text-muted-foreground" dir="rtl">قاصة الدكتور للمسؤول وحده.</p>;
  }
  const r = q.data;
  //  الحركةُ مرتّبةً بالتاريخ: ما وصل من الدفتر وما صُرف منها.
  const moves = r ? [
    ...r.transfers.map((t) => ({ key: `t-${t.id}`, date: t.date, in: t.amount, out: 0, label: `تحويل من دفتر «${CASH_BOOK_LABELS[t.book]}»`, note: t.note, exp: null as Expense | null })),
    ...r.expenses.map((e) => ({ key: `e-${e.id}`, date: e.date, in: 0, out: e.amount, label: categoryLabel(e.category), note: e.note, exp: e })),
  ].sort((a, b) => a.date.localeCompare(b.date)) : [];

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="bg-white border rounded-md shadow-sm p-4 md:p-6 space-y-4">
        <div className="border-b-2 border-[#1d2b55] pb-3">
          <h1 className="text-xl md:text-2xl font-bold text-[#1d2b55]">قاصة الدكتور</h1>
          <p className="text-sm text-muted-foreground">الوارد إليها من «تحويل إلى قاصة الدكتور» في دفتر القاصة، والمصروف منها تكتبه هنا. والفرع يرى في دفتره يوم الصرف وبابه فقط، بلا مبلغ.</p>
        </div>

        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
          <label className="grid gap-1"><span className="text-muted-foreground">الفرع</span>
            <Select value={branchId ? String(branchId) : ""} onValueChange={(v) => setBranchId(Number(v))}>
              <SelectTrigger className="w-64" data-testid="drbox-branch"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
              <SelectContent>{branchList.map((b) => {
                const acc = drBoxAccountLabel(b.name);
                return <SelectItem key={b.id} value={String(b.id)}>{b.name}{acc ? ` — ${acc}` : ""}</SelectItem>;
              })}</SelectContent>
            </Select>
          </label>
          {r?.branch.account && (
            <div className="grid gap-1"><span className="text-muted-foreground">الحساب</span>
              <span className="h-9 flex items-center px-3 rounded-md border-2 border-[#1d2b55] font-bold text-[#1d2b55] text-base" dir="auto" data-testid="drbox-account">
                {r.branch.account}
              </span>
            </div>
          )}
          <label className="grid gap-1"><span className="text-muted-foreground">من</span>
            <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} className="w-40" />
          </label>
          <label className="grid gap-1"><span className="text-muted-foreground">إلى</span>
            <Input type="date" value={to} min={from} max={today} onChange={(e) => e.target.value && setTo(e.target.value)} className="w-40" />
          </label>
        </div>

        {q.isLoading && <p className="text-center text-muted-foreground py-10">جارٍ التحميل…</p>}
        {q.isError && <p className="text-center text-red-600 py-10">{(q.error as Error).message}</p>}
        {r && (
          <>
            <OpeningLine report={r} write={write} />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" data-testid="drbox-totals">
              <Box title={r.opening ? "ما وصل منذ البداية" : "مجموع ما وصل"} value={r.totals.received} sub={`في الفترة: ${fmt(r.period.received)}`} tone="blue" />
              <Box title={r.opening ? "ما صُرف منذ البداية" : "مجموع ما صُرف"} value={r.totals.spent} sub={`في الفترة: ${fmt(r.period.spent)}`} tone="rose" />
              <Box title="الرصيد الآن" value={r.totals.balance}
                sub={r.opening ? "الافتتاحي + ما وصل − ما صُرف" : "ما وصل − ما صُرف، من البداية"}
                tone={r.totals.balance < 0 ? "rose" : "emerald"} testId="drbox-balance" />
            </div>

            <AddExpense branchId={r.branch.id} today={r.today} write={write} />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums" data-testid="drbox-table">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border p-2 w-32">التاريخ</th>
                    <th className="border p-2 w-32 text-blue-900">وصل</th>
                    <th className="border p-2 w-32 text-rose-800">صُرف</th>
                    <th className="border p-2">الباب / الملاحظات</th>
                    <th className="border p-1 w-16" aria-label="إجراءات" />
                  </tr>
                </thead>
                <tbody>
                  {moves.map((m) => (
                    <tr key={m.key} data-testid={`drbox-row-${m.key}`}>
                      <td className="border px-2 py-1.5 whitespace-nowrap">{dayNameOf(m.date)} <span dir="ltr" className="text-muted-foreground">{dmy(m.date)}</span></td>
                      <td className="border px-2 py-1.5 text-left" dir="ltr">{m.in ? fmt(m.in) : ""}</td>
                      <td className="border px-2 py-1.5 text-left" dir="ltr">{m.out ? fmt(m.out) : ""}</td>
                      <td className="border px-2 py-1.5">{m.label}{m.note ? ` — ${m.note}` : ""}</td>
                      <td className="border px-1 py-1 text-center whitespace-nowrap">
                        {m.exp && (
                          <>
                            <button className="p-1 text-slate-500 hover:text-slate-900" onClick={() => setEditing(m.exp)} aria-label="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                            <button className="p-1 text-slate-500 hover:text-red-700" aria-label="حذف"
                              onClick={() => { if (confirm("حذف هذا المصروف من قاصة الدكتور؟")) write.mutate({ method: "DELETE", url: `/api/dr-box/expenses/${m.exp!.id}` }); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {moves.length === 0 && <tr><td colSpan={5} className="border p-6 text-center text-muted-foreground">لا حركة في هذه الفترة.</td></tr>}
                  <tr className="bg-slate-100 font-bold">
                    <td className="border px-2 py-2">مجموع الفترة</td>
                    <td className="border px-2 py-2 text-left" dir="ltr">{fmt(r.period.received)}</td>
                    <td className="border px-2 py-2 text-left" dir="ltr">{fmt(r.period.spent)}</td>
                    <td className="border" colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
            <EditExpense row={editing} branchId={r.branch.id} today={r.today} onClose={() => setEditing(null)} write={write} />
          </>
        )}
      </div>
    </div>
  );
}

/** الرصيدُ الافتتاحيّ — يضعه المالكُ بنفسه ويعدّله، ومن يومه يبدأ الحساب. */
function OpeningLine({ report, write }: { report: Report; write: any }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(report.today);
  const [amount, setAmount] = useState("");
  const start = () => {
    setDate(report.opening?.date ?? report.today);
    setAmount(report.opening ? String(report.opening.amount) : "");
    setOpen(true);
  };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm border rounded-md px-3 py-2 bg-slate-50" data-testid="drbox-opening">
      {report.opening
        ? <span>الرصيد الافتتاحي: <b className="tabular-nums" dir="ltr">{fmt(report.opening.amount)}</b> من يوم <span dir="ltr">{dmy(report.opening.date)}</span> — ومنه يبدأ الحساب.</span>
        : <span className="text-amber-800">لم تضع رصيداً افتتاحياً لهذا الفرع — الحساب الآن من أوّل تحويل.</span>}
      <Button size="sm" variant="outline" className="h-7" onClick={start} data-testid="drbox-opening-edit">
        {report.opening ? "تعديل الرصيد الافتتاحي" : "ضع الرصيد الافتتاحي"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>الرصيد الافتتاحي — {report.branch.name}{report.branch.account ? ` (${report.branch.account})` : ""}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">المبلغ الموجود في القاصة في بداية يوم البدء. ما قبل هذا اليوم من تحويلات ومصاريف لا يدخل الرصيد.</p>
          <div className="space-y-3">
            <label className="grid gap-1 text-sm">يوم البدء<Input type="date" value={date} max={report.today} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
            <label className="grid gap-1 text-sm">الرصيد<AmountInput id="drbox-opening-amount" value={amount} onChange={setAmount} /></label>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button disabled={!date} data-testid="drbox-opening-save" onClick={() => write.mutate({
              method: "POST", url: "/api/dr-box/opening", body: { branchId: report.branch.id, openingDate: date, amount: Number(amount || 0) },
            }, { onSuccess: () => setOpen(false) })}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Box({ title, value, sub, tone, testId }: { title: string; value: number; sub: string; tone: "blue" | "rose" | "emerald"; testId?: string }) {
  const c = tone === "blue" ? "border-blue-300 text-blue-900" : tone === "rose" ? "border-rose-300 text-rose-800" : "border-emerald-300 text-emerald-800";
  return (
    <div className={`border-2 rounded-md p-3 ${c}`}>
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-2xl font-bold tabular-nums" dir="ltr" data-testid={testId}>{fmt(value)}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function AddExpense({ branchId, today, write }: { branchId: number; today: string; write: any }) {
  const categories = useCategories(branchId);
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const submit = () => {
    if (!amount || !category) return;
    write.mutate({ method: "POST", url: "/api/dr-box/expenses", body: { branchId, date, category, amount: Number(amount), note: note || undefined } },
      { onSuccess: () => { setAmount(""); setNote(""); } });
  };
  return (
    <form className="flex flex-wrap gap-2 items-end bg-slate-50 border rounded p-3" onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="drbox-add">
      <label className="grid gap-1 text-xs">التاريخ<Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-40" /></label>
      <label className="grid gap-1 text-xs">باب الصرف
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-40" data-testid="drbox-add-category"><SelectValue placeholder="اختر" /></SelectTrigger>
          <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs">المبلغ<AmountInput id="drbox-add-amount" value={amount} onChange={setAmount} /></label>
      <label className="grid gap-1 text-xs flex-1 min-w-[12rem]">الملاحظات (لك وحدك)
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="تفصيل" />
      </label>
      <Button type="submit" disabled={!amount || !category || write.isPending} data-testid="drbox-add-save">صرف من قاصتي</Button>
    </form>
  );
}

function EditExpense({ row, branchId, today, onClose, write }: { row: Expense | null; branchId: number; today: string; onClose: () => void; write: any }) {
  const categories = useCategories(branchId);
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { if (row) { setDate(row.date); setCategory(row.category); setAmount(String(row.amount)); setNote(row.note); } }, [row]);
  const options = categories.some((c) => c.value === category) || !category ? categories : [...categories, { value: category, label: categoryLabel(category) }];
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تعديل مصروف من قاصة الدكتور</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="grid gap-1 text-sm">التاريخ<Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} /></label>
          <label className="grid gap-1 text-sm">باب الصرف
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{options.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="grid gap-1 text-sm">المبلغ<AmountInput id="drbox-edit-amount" value={amount} onChange={setAmount} /></label>
          <label className="grid gap-1 text-sm">الملاحظات<Input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={!amount || !category || !date} onClick={() => row && write.mutate({
            method: "PATCH", url: `/api/dr-box/expenses/${row.id}`, body: { date, category, amount: Number(amount), note },
          }, { onSuccess: onClose })}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
