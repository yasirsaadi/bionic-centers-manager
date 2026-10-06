// **دفترُ القاصة اليوميّ** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.ca) — ورقةُ الدفتر نفسُها على الشاشة: الرأسُ والأعمدةُ والمربّعان.
// الفرقُ وحده أن الموظّف يكتب بلوحة المفاتيح ويختار من القوائم، والمجاميعُ تُحسب وحدها في الخادم.
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { EXPENSE_CATEGORIES } from "@/lib/expense_categories";
import { cashRowNote, cashCategoryLabel, drBoxLineText } from "@/lib/cash_book_text";
import { ChevronRight, ChevronLeft, Pencil, Trash2, RefreshCw, Printer } from "lucide-react";
import {
  type CashBook as Book, CASH_BOOK_LABELS, OUTFLOW_LABELS, INCOME_OTHER_LABEL, dayNameOf, branchCashConfig,
} from "@shared/cash_book";
import { baghdadTodayYmd } from "@shared/visit_date";

interface Row {
  source: "payment" | "entry" | "expense"; id: number; column: "income" | "expense" | "transfer";
  kind: string; amount: number; note: string; category: string | null; unsectioned: boolean; createdBy: number | null;
}
interface Sheet {
  branch: { id: number; name: string; config: { books: Book[]; drRatioPct: number | null; hospitalRatioPct: number | null; hasAtabahRatio: boolean } };
  book: Book; day: string; today: string;
  opening: { date: string; cash: number; ratio: number } | null;
  rows: Row[];
  totals: { income: number; outflow: number; dayNet: number; prevRemaining: number; remaining: number };
  ratio: { today: number; prev: number; received: number; remaining: number; receipts: { id: number; amount: number; note: string }[] };
  expected: {
    drRatio: { pct: number; amount: number; recorded: number | null } | null;
    hospitalRatio: { pct: number; amount: number; recorded: number | null } | null;
  };
  canWrite: boolean; isAdmin: boolean; userId: number | null; canManageExpenses: boolean;
  /** ما صُرف من قاصة الدكتور لهذا الفرع في هذا اليوم — البابُ وحده بلا مبلغ (§4.cb). */
  drBoxLines?: { id: number; category: string }[];
  /** آخرُ طباعةٍ لهذه الورقة، وهل تغيّر ما فيها بعدها (§4.ca تكملة). */
  lastPrint?: { at: string; by: string | null } | null;
  changedAfterPrint?: boolean;
}

const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "" : n.toLocaleString("en-US"));
const digits = (v: string) => v.replace(/[^\d]/g, "");
function shiftDay(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const categoryLabel = cashCategoryLabel;

/** حقلُ مبلغٍ بالدينار — يكتب أرقاماً ويرى الفواصل. */
function AmountInput({ value, onChange, id, autoFocus }: { value: string; onChange: (v: string) => void; id: string; autoFocus?: boolean }) {
  return (
    <Input id={id} inputMode="numeric" dir="ltr" autoFocus={autoFocus} className="text-left tabular-nums"
      value={value ? Number(value).toLocaleString("en-US") : ""} placeholder="0"
      onChange={(e) => onChange(digits(e.target.value))} />
  );
}

export default function CashBook() {
  const session = useBranchSession();
  const qc = useQueryClient();
  const { toast } = useToast();
  const isAdmin = Boolean(session?.isAdmin);
  const today = baghdadTodayYmd();

  const { data: branchList = [] } = useQuery<{ id: number; name: string }[]>({ queryKey: ["/api/branches"], enabled: isAdmin });
  const [branchId, setBranchId] = useState<number | null>(null);
  useEffect(() => {
    if (branchId) return;
    if (!isAdmin && session?.branchId) setBranchId(session.branchId);
    else if (isAdmin) setBranchId(session?.branchId && session.branchId > 0 ? session.branchId : (branchList[0]?.id ?? null));
  }, [isAdmin, session?.branchId, branchList, branchId]);
  const [book, setBook] = useState<Book>("devices");
  const [day, setDay] = useState(today);

  const key = ["/api/cash-book", branchId, book, day];
  const q = useQuery<Sheet>({
    queryKey: key,
    enabled: Boolean(branchId),
    queryFn: async () => {
      const res = await fetch(`/api/cash-book?branchId=${branchId}&book=${book}&date=${day}`, { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "تعذّر تحميل الدفتر");
      return j;
    },
  });
  const sheet = q.data;
  //  فرعٌ بدفترٍ واحد: لا يبقى الاختيارُ على «علاج طبيعي».
  const books: Book[] = sheet?.branch.config.books
    ?? branchCashConfig(branchList.find((b) => b.id === branchId)?.name).books;
  useEffect(() => { if (!books.includes(book)) setBook("devices"); }, [books.join(","), book]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["/api/cash-book"] });
    qc.invalidateQueries({ queryKey: ["/api/expenses"] });
  };
  const write = useMutation({
    mutationFn: async (p: { method: string; url: string; body?: any }) => (await apiRequest(p.method, p.url, p.body)).json(),
    onSuccess: () => { refresh(); },
    onError: (e: any) => toast({ title: "لم يُحفَظ", description: e?.message ?? "تعذّر الحفظ", variant: "destructive" }),
  });

  const branchName = sheet?.branch.name ?? branchList.find((b) => b.id === branchId)?.name ?? "";

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="bg-white border rounded-md shadow-sm p-4 md:p-6 space-y-4">
        {/* الرأس — كما في الدفتر */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#1d2b55] pb-3">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-bold text-[#1d2b55]">مجموعة مراكز الدكتور ياسر الساعدي</h1>
            <div className="h-0.5 w-40 bg-gradient-to-l from-[#b07040] to-transparent" />
          </div>
          <img src="/cash-book-logo.png" alt="Dr. Y" className="h-12 md:h-16 w-auto" />
        </div>

        {/* الفرع · الدفتر · اليوم · التاريخ */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 text-sm">
          <label className="grid gap-1">
            <span className="text-muted-foreground">الفرع</span>
            {isAdmin ? (
              <Select value={branchId ? String(branchId) : ""} onValueChange={(v) => setBranchId(Number(v))}>
                <SelectTrigger className="w-44" data-testid="cash-branch"><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                <SelectContent>{branchList.map((b) => <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>)}</SelectContent>
              </Select>
            ) : <span className="font-semibold h-9 flex items-center">{branchName}</span>}
          </label>
          <label className="grid gap-1">
            <span className="text-muted-foreground">القسم</span>
            {books.length > 1 ? (
              <Select value={book} onValueChange={(v) => setBook(v as Book)}>
                <SelectTrigger className="w-40" data-testid="cash-book-select"><SelectValue /></SelectTrigger>
                <SelectContent>{books.map((b) => <SelectItem key={b} value={b}>{CASH_BOOK_LABELS[b]}</SelectItem>)}</SelectContent>
              </Select>
            ) : <span className="font-semibold h-9 flex items-center">{CASH_BOOK_LABELS.devices}</span>}
          </label>
          <div className="grid gap-1">
            <span className="text-muted-foreground">اليوم</span>
            {/*  التاريخُ بترتيب يوم/شهر/سنة بجانب اسم اليوم — حقلُ التاريخ يعرضه بترتيب المتصفّح، وقد يكون شهراً أوّلاً. */}
            <span className="font-semibold h-9 flex items-center gap-2" data-testid="cash-day-name">
              {dayNameOf(day)}<span className="font-normal text-muted-foreground tabular-nums" dir="ltr">{day.slice(8, 10)}/{day.slice(5, 7)}/{day.slice(0, 4)}</span>
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-muted-foreground">التاريخ</span>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => setDay(shiftDay(day, -1))} aria-label="اليوم السابق">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Input type="date" value={day} max={today} onChange={(e) => e.target.value && setDay(e.target.value)} className="w-40" data-testid="cash-date" />
              <Button size="icon" variant="outline" className="h-9 w-9" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))} aria-label="اليوم التالي">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {day !== today && <Button size="sm" variant="ghost" onClick={() => setDay(today)}>اليوم</Button>}
            </div>
          </div>
        </div>

        {q.isLoading && <p className="text-center text-muted-foreground py-10">جارٍ التحميل…</p>}
        {q.isError && <p className="text-center text-red-600 py-10">{(q.error as Error).message}</p>}
        {sheet && !sheet.opening && (sheet.isAdmin
          ? <OpeningCard sheet={sheet} branchId={branchId!} book={book} onSave={(b) => write.mutate({ method: "POST", url: "/api/cash-book/opening", body: b })} />
          : <p className="border-2 border-dashed rounded-md p-4 text-center text-muted-foreground" data-testid="cash-opening-waiting">
              بانتظار أن يسجّل المسؤول بداية دفتر «{CASH_BOOK_LABELS[book]}» لهذا الفرع.
            </p>)}
        {sheet && sheet.opening && <SheetBody sheet={sheet} branchId={branchId!} book={book} day={day} write={write} />}
      </div>
    </div>
  );
}

/** أوّلُ يوم: النقدُ الموجود في القاصة الآن — ومنه يبدأ الحساب. يسجّله المسؤولُ وحده. */
function OpeningCard({ sheet, branchId, book, onSave }: { sheet: Sheet; branchId: number; book: Book; onSave: (b: any) => void }) {
  return (
    <div className="border-2 border-dashed border-[#1d2b55]/40 rounded-md p-4 space-y-3" data-testid="cash-opening">
      <p className="font-semibold">ابدأ دفتر «{CASH_BOOK_LABELS[book]}» لهذا الفرع</p>
      <p className="text-sm text-muted-foreground">اكتب النقد الموجود فعلاً في القاصة في بداية يوم البدء، والمتبقي في النسبة إن وُجد. من هذا اليوم يبدأ حساب «الباقي من أمس». وتستطيع تعديله لاحقاً.</p>
      <OpeningFields today={sheet.today} initial={null} label="ابدأ الدفتر"
        onSave={(v) => onSave({ branchId, book, ...v })} />
    </div>
  );
}

/** حقولُ البداية — للبدء أوّلَ مرّة وللتعديل معاً. */
function OpeningFields({ today, initial, label, onSave }: {
  today: string; initial: { date: string; cash: number; ratio: number } | null; label: string;
  onSave: (v: { openingDate: string; cash: number; ratio: number }) => void;
}) {
  const [cash, setCash] = useState(initial ? String(initial.cash) : "");
  const [ratio, setRatio] = useState(initial ? String(initial.ratio) : "");
  const [date, setDate] = useState(initial?.date ?? today);
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <label className="grid gap-1 text-sm">يوم البدء<Input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} className="w-40" /></label>
      <label className="grid gap-1 text-sm">النقد في القاصة<AmountInput id="open-cash" value={cash} onChange={setCash} /></label>
      <label className="grid gap-1 text-sm">المتبقي في النسبة<AmountInput id="open-ratio" value={ratio} onChange={setRatio} /></label>
      <Button disabled={!date} onClick={() => onSave({ openingDate: date, cash: Number(cash || 0), ratio: Number(ratio || 0) })} data-testid="cash-opening-save">
        {label}
      </Button>
    </div>
  );
}

/** تعديلُ بداية الدفتر — للمسؤول وحده. يتغيّر منه «الباقي من أمس» لكلّ يومٍ بعده. */
function EditOpeningDialog({ sheet, branchId, book, write, open, onClose }: {
  sheet: Sheet; branchId: number; book: Book; write: any; open: boolean; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-xl">
        <DialogHeader><DialogTitle>تعديل بداية دفتر «{CASH_BOOK_LABELS[book]}»</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">منه يُحسب «الباقي من أمس» و«المتبقي في النسبة» من يوم البدء فما بعده. والأيامُ قبل يوم البدء لا تدخل الحساب.</p>
        {open && sheet.opening && (
          <OpeningFields today={sheet.today} initial={sheet.opening} label="حفظ"
            onSave={(v) => write.mutate({ method: "POST", url: "/api/cash-book/opening", body: { branchId, book, ...v } }, { onSuccess: onClose })} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SheetBody({ sheet, branchId, book, day, write }: { sheet: Sheet; branchId: number; book: Book; day: string; write: any }) {
  const cfg = sheet.branch.config;
  const [editing, setEditing] = useState<Row | null>(null);
  const [editOpening, setEditOpening] = useState(false);
  const income = sheet.rows.filter((r) => r.column === "income");
  const outflow = sheet.rows.filter((r) => r.column !== "income");
  const editable = (r: Row) => sheet.canWrite && r.source !== "payment"
    && (r.source === "entry" || sheet.isAdmin || sheet.canManageExpenses || r.createdBy === sheet.userId);
  const noteOf = (r: Row) => cashRowNote(r);
  const stale = (x: { amount: number; recorded: number | null } | null) => x && x.recorded !== null && x.recorded !== x.amount;

  return (
    <div className="space-y-4">
      <PrintBar sheet={sheet} branchId={branchId} book={book} day={day} />
      {sheet.isAdmin && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" data-testid="cash-opening-line">
          <span>بداية الدفتر: {sheet.opening!.date.split("-").reverse().join("/")} · النقد {fmt(sheet.opening!.cash)} · النسبة {fmt(sheet.opening!.ratio)}</span>
          <Button size="sm" variant="outline" className="h-7" onClick={() => setEditOpening(true)} data-testid="cash-opening-edit">تعديل بداية الدفتر</Button>
          <EditOpeningDialog sheet={sheet} branchId={branchId} book={book} write={write} open={editOpening} onClose={() => setEditOpening(false)} />
        </div>
      )}
      {!sheet.canWrite && (
        <p className="text-xs text-muted-foreground bg-slate-50 border rounded px-3 py-1.5">
          {day < sheet.opening!.date ? "هذا اليوم قبل بداية الدفتر." : "يومٌ ماضٍ — للقراءة. تعديله للمسؤول وحده."}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm tabular-nums" data-testid="cash-table">
          <colgroup><col className="w-[17%]" /><col className="w-[17%]" /><col className="w-[17%]" /><col /><col className="w-16" /></colgroup>
          <thead>
            <tr>
              <th rowSpan={2} className="border bg-emerald-50 text-emerald-800 p-2 text-base">الوارد</th>
              <th colSpan={2} className="border bg-rose-50 text-rose-800 p-1.5">الصادر</th>
              <th rowSpan={2} className="border p-2 text-lg font-bold">الملاحظات</th>
              <th rowSpan={2} className="border p-1" aria-label="إجراءات" />
            </tr>
            <tr>
              <th className="border bg-rose-50 text-rose-800 p-1.5 font-semibold">مصاريف</th>
              <th className="border bg-blue-50 text-blue-900 p-1.5 font-semibold">تحويل إلى قاصة الدكتور</th>
            </tr>
          </thead>
          <tbody>
            {[...income, ...outflow].map((r) => (
              <tr key={`${r.source}-${r.id}`} data-testid={`cash-row-${r.source}-${r.id}`}>
                <td className="border px-2 py-1.5 text-left" dir="ltr">{r.column === "income" ? fmt(r.amount) : ""}</td>
                <td className="border px-2 py-1.5 text-left" dir="ltr">{r.column === "expense" ? fmt(r.amount) : ""}</td>
                <td className="border px-2 py-1.5 text-left bg-blue-50/60" dir="ltr">{r.column === "transfer" ? fmt(r.amount) : ""}</td>
                <td className="border px-2 py-1.5">
                  {noteOf(r)}
                  {r.unsectioned && <Badge variant="outline" className="ms-2 text-[10px] text-amber-700 border-amber-400">بلا قسم</Badge>}
                </td>
                <td className="border px-1 py-1 text-center whitespace-nowrap">
                  {editable(r) && (
                    <>
                      <button className="p-1 text-slate-500 hover:text-slate-900" onClick={() => setEditing(r)} aria-label="تعديل"><Pencil className="w-3.5 h-3.5" /></button>
                      <button className="p-1 text-slate-500 hover:text-red-700" aria-label="حذف"
                        onClick={() => write.mutate({ method: "DELETE", url: `/api/cash-book/rows/${r.source}/${r.id}` })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {(sheet.drBoxLines ?? []).map((l) => (
              <tr key={`drbox-${l.id}`} className="bg-slate-50 text-slate-500" data-testid={`cash-drbox-${l.id}`}>
                <td className="border" /><td className="border" /><td className="border" />
                <td className="border px-2 py-1.5 italic">{drBoxLineText(l.category)}</td>
                <td className="border" />
              </tr>
            ))}
            {sheet.rows.length === 0 && !(sheet.drBoxLines ?? []).length && (
              <tr><td colSpan={5} className="border p-6 text-center text-muted-foreground">لا وارد ولا صادر في هذا اليوم بعد.</td></tr>
            )}
            <tr className="bg-slate-100 font-bold">
              <td className="border px-2 py-2 text-left" dir="ltr" data-testid="cash-total-in">{fmt(sheet.totals.income)}</td>
              <td colSpan={2} className="border px-2 py-2 text-center" dir="ltr" data-testid="cash-total-out">{fmt(sheet.totals.outflow)}</td>
              <td className="border px-2 py-2">المجموع</td>
              <td className="border" />
            </tr>
          </tbody>
        </table>
      </div>

      {sheet.canWrite && <AddRow sheet={sheet} branchId={branchId} book={book} day={day} write={write} />}

      {sheet.canWrite && (cfg.drRatioPct || cfg.hospitalRatioPct) && (
        <div className="flex flex-wrap gap-2 items-center">
          {sheet.expected.drRatio && (
            <Button variant="outline" size="sm" className="gap-1" data-testid="cash-dr-ratio"
              onClick={() => write.mutate({ method: "POST", url: "/api/cash-book/ratio", body: { branchId, book, date: day, kind: "dr_ratio" } })}>
              <RefreshCw className="w-3.5 h-3.5" />
              {sheet.expected.drRatio.recorded === null ? "أضف" : "حدّث"} نسبة الدكتور ({sheet.expected.drRatio.pct}٪ = {fmt(sheet.expected.drRatio.amount)})
            </Button>
          )}
          {sheet.expected.hospitalRatio && (
            <Button variant="outline" size="sm" className="gap-1" data-testid="cash-hospital-ratio"
              onClick={() => write.mutate({ method: "POST", url: "/api/cash-book/ratio", body: { branchId, book, date: day, kind: "hospital_ratio" } })}>
              <RefreshCw className="w-3.5 h-3.5" />
              {sheet.expected.hospitalRatio.recorded === null ? "أضف" : "حدّث"} نسبة المستشفى ({sheet.expected.hospitalRatio.pct}٪ = {fmt(sheet.expected.hospitalRatio.amount)})
            </Button>
          )}
          {(stale(sheet.expected.drRatio) || stale(sheet.expected.hospitalRatio)) && (
            <span className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1" data-testid="cash-ratio-stale">
              دخل وارد بعد حساب النسبة — اضغط «حدّث» لتصير من وارد اليوم كلّه.
            </span>
          )}
        </div>
      )}

      {/* المربّعان — كأسفل الورقة */}
      <div className="grid md:grid-cols-2 gap-4 pt-2">
        <div className="border-2 border-slate-600 rounded-sm p-3 space-y-2 text-sm" data-testid="cash-box">
          <h3 className="font-bold text-base">القاصة</h3>
          <BoxLine label="مجموع اليوم" hint="(الوارد − الصادر)" value={sheet.totals.dayNet} />
          <BoxLine label="الباقي من أمس" value={sheet.totals.prevRemaining} />
          <BoxLine label="المتبقي في القاصة" hint="(مجموع اليوم + الباقي من أمس)" value={sheet.totals.remaining} strong testid="cash-remaining" />
        </div>
        <div className="border-4 border-double border-emerald-700 rounded-sm p-3 space-y-2 text-sm" data-testid="ratio-box">
          <h3 className="font-bold text-base text-emerald-800">نسبة العزل</h3>
          <BoxLine label="نسبة اليوم" value={sheet.ratio.today} />
          <BoxLine label="المتبقي من نسبة أمس" value={sheet.ratio.prev} />
          {sheet.ratio.received > 0 && <BoxLine label="استُلم اليوم" value={-sheet.ratio.received} />}
          <BoxLine label="المتبقي في النسبة" hint="(نسبة اليوم + المتبقي من نسبة أمس)" value={sheet.ratio.remaining} strong testid="ratio-remaining" />
          {sheet.isAdmin && sheet.canWrite && <ReceiveRatio branchId={branchId} book={book} day={day} write={write} />}
        </div>
      </div>

      <EditRowDialog row={editing} onClose={() => setEditing(null)} write={write} />
    </div>
  );
}

function BoxLine({ label, hint, value, strong, testid }: { label: string; hint?: string; value: number; strong?: boolean; testid?: string }) {
  return (
    <div className={`grid grid-cols-[1fr_auto] gap-3 items-start ${strong ? "pt-2" : ""}`}>
      <div className={strong ? "font-bold" : ""}>{label}{hint && <span className="block text-[11px] font-normal text-muted-foreground">{hint}</span>}</div>
      <div className={`min-w-32 text-left border-b ${strong ? "border-slate-700 border-b-2 font-bold" : "border-dotted border-slate-500"}`} dir="ltr" data-testid={testid}>
        {fmt(value)}
      </div>
    </div>
  );
}

type AddKind = "income_other" | "expense" | "dr_transfer" | "atabah_ratio";

/** سطرٌ جديد: يختار العمودَ أوّلاً، ثمّ المبلغ، ثمّ باب الصرف والملاحظة — و«Enter» يحفظ. */
function AddRow({ sheet, branchId, book, day, write }: { sheet: Sheet; branchId: number; book: Book; day: string; write: any }) {
  const [kind, setKind] = useState<AddKind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [note, setNote] = useState("");
  const { data: custom = [] } = useQuery<{ label: string; branchId: number | null }[]>({ queryKey: ["/api/expense-categories"] });
  const categories = useMemo(() => [
    ...EXPENSE_CATEGORIES.filter((c) => !(c as any).sheetOnly && !(c as any).karbalaOnly),
    ...custom.filter((c) => c.branchId == null || c.branchId === branchId).map((c) => ({ value: c.label, label: c.label })),
  ], [custom, branchId]);
  const kinds: { v: AddKind; label: string }[] = [
    { v: "expense", label: "مصاريف" },
    { v: "dr_transfer", label: "تحويل إلى قاصة الدكتور" },
    ...(sheet.branch.config.hasAtabahRatio ? [{ v: "atabah_ratio" as AddKind, label: "نسبة العتبة" }] : []),
    { v: "income_other", label: INCOME_OTHER_LABEL },
  ];
  const submit = () => {
    if (!amount) return;
    write.mutate({
      method: "POST", url: "/api/cash-book/rows",
      body: { branchId, book, date: day, kind, amount: Number(amount), note: note || undefined, ...(kind === "expense" ? { category } : {}) },
    }, { onSuccess: () => { setAmount(""); setNote(""); } });
  };
  return (
    <form className="flex flex-wrap gap-2 items-end bg-slate-50 border rounded p-3"
      onSubmit={(e) => { e.preventDefault(); submit(); }} data-testid="cash-add-row">
      <label className="grid gap-1 text-xs">نوع السطر
        <Select value={kind} onValueChange={(v) => setKind(v as AddKind)}>
          <SelectTrigger className="w-48" data-testid="cash-add-kind"><SelectValue /></SelectTrigger>
          <SelectContent>{kinds.map((k) => <SelectItem key={k.v} value={k.v}>{k.label}</SelectItem>)}</SelectContent>
        </Select>
      </label>
      <label className="grid gap-1 text-xs">المبلغ<AmountInput id="cash-add-amount" value={amount} onChange={setAmount} /></label>
      {kind === "expense" && (
        <label className="grid gap-1 text-xs">باب الصرف
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-40" data-testid="cash-add-category"><SelectValue placeholder="اختر" /></SelectTrigger>
            <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </label>
      )}
      <label className="grid gap-1 text-xs flex-1 min-w-[12rem]">الملاحظات
        <Input id="cash-add-note" value={note} onChange={(e) => setNote(e.target.value)}
          placeholder={kind === "dr_transfer" ? "مثلاً: يوم أمس / اليوم" : kind === "income_other" ? "مصدر الوارد" : "تفصيل"} />
      </label>
      <Button type="submit" disabled={!amount || (kind === "expense" && !category) || write.isPending} data-testid="cash-add-save">أضف</Button>
    </form>
  );
}

function ReceiveRatio({ branchId, book, day, write }: { branchId: number; book: Book; day: string; write: any }) {
  const [amount, setAmount] = useState("");
  return (
    <div className="flex gap-2 items-end pt-2 border-t">
      <label className="grid gap-1 text-xs flex-1">استلمتُ من النسبة<AmountInput id="ratio-receive" value={amount} onChange={setAmount} /></label>
      <Button size="sm" variant="outline" disabled={!amount} data-testid="ratio-receive-save"
        onClick={() => write.mutate({ method: "POST", url: "/api/cash-book/rows", body: { branchId, book, date: day, kind: "ratio_received", amount: Number(amount) } },
          { onSuccess: () => setAmount("") })}>
        سجّل الاستلام
      </Button>
    </div>
  );
}

function EditRowDialog({ row, onClose, write }: { row: Row | null; onClose: () => void; write: any }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => { if (row) { setAmount(String(row.amount)); setNote(row.note ?? ""); } }, [row]);
  const auto = row?.kind === "dr_ratio" || row?.kind === "hospital_ratio";
  return (
    <Dialog open={row !== null} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader><DialogTitle>تعديل السطر</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {auto
            ? <p className="text-sm text-muted-foreground">النسبة تُحسب من وارد اليوم — عدّلها بزرّ «حدّث»، أو احذف السطر.</p>
            : <label className="grid gap-1 text-sm">المبلغ<AmountInput id="cash-edit-amount" value={amount} onChange={setAmount} autoFocus /></label>}
          <label className="grid gap-1 text-sm">الملاحظات<Input value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button disabled={!auto && !amount} onClick={() => row && write.mutate({
            method: "PATCH", url: `/api/cash-book/rows/${row.source}/${row.id}`,
            body: { ...(auto ? {} : { amount: Number(amount) }), note },
          }, { onSuccess: onClose })}>حفظ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** يفتح ورقةَ الطباعة في نافذةٍ جديدة — ومنها الطابعةُ أو «حفظ كملف PDF». */
function openPrint(q: Record<string, string | number>) {
  const qs = new URLSearchParams(Object.entries(q).map(([k, v]) => [k, String(v)])).toString();
  window.open(`/cash-book/print?${qs}`, "_blank");
}

/** شريطُ الطباعة (§4.ca تكملة): ورقةُ اليوم مملوءةً، وشهرٌ كامل للمسؤول، وورقةٌ فارغة لانقطاع الإنترنت — ومتى طُبعت آخرَ مرّة. */
function PrintBar({ sheet, branchId, book, day }: { sheet: Sheet; branchId: number; book: Book; day: string }) {
  const [month, setMonth] = useState(day.slice(0, 7));
  const monthRange = () => {
    const from = `${month}-01`;
    const d = new Date(`${from}T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + 1); d.setUTCDate(0);
    const end = d.toISOString().slice(0, 10);
    return { from, to: end > sheet.today ? sheet.today : end };
  };
  const at = sheet.lastPrint ? new Date(sheet.lastPrint.at).toLocaleString("en-GB", {
    timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }) : null;
  return (
    <div className="flex flex-wrap items-center gap-2 border rounded-md px-3 py-2 bg-slate-50 text-sm" data-testid="cash-print-bar">
      <Button size="sm" className="h-8" onClick={() => openPrint({ branchId, book, from: day, to: day })} data-testid="cash-print-day">
        <Printer className="w-4 h-4 me-1" />طباعة ورقة اليوم
      </Button>
      {sheet.isAdmin && (
        <span className="flex items-center gap-1">
          <Input type="month" value={month} max={sheet.today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="h-8 w-36" />
          <Button size="sm" variant="outline" className="h-8" onClick={() => openPrint({ branchId, book, ...monthRange() })} data-testid="cash-print-month">
            طباعة الشهر كاملاً
          </Button>
        </span>
      )}
      <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => openPrint({ blank: 1, branchId, book })} data-testid="cash-print-blank"
        title="لانقطاع الإنترنت فقط — وما يُكتب عليها يُدخَل في التطبيق حين يعود">
        ورقة فارغة
      </Button>
      <span className="ms-auto text-xs text-muted-foreground" data-testid="cash-print-stamp">
        {at ? `آخر طباعة: ${at}${sheet.lastPrint?.by ? ` — ${sheet.lastPrint.by}` : ""}` : "لم تُطبع هذه الورقة بعد"}
      </span>
      {sheet.changedAfterPrint && (
        <Badge className="bg-amber-100 text-amber-900 border border-amber-400 hover:bg-amber-100" data-testid="cash-changed-after-print">
          عُدّلت بعد الطباعة — اطبعها من جديد
        </Badge>
      )}
    </div>
  );
}
