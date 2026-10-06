// **طباعةُ ورقة الدفتر** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.ca تكملة) — الورقةُ التي صُمّمت معه (A4، الشعار والعنوان، الجدول، المربّعان)
// مملوءةً من التطبيق، فيطبعها المخوَّل أو يحفظها ملفّاً من نافذة الطباعة نفسِها. «انتهى عصرُ الكتابة».
//
//   /cash-book/print?branchId&book&from&to   — يومٌ واحد (from = to) أو شهرٌ كامل (للمسؤول): ورقةٌ لكلّ يوم.
//   /cash-book/print?blank=1&branchId&book   — الورقةُ فارغةً، لانقطاع الإنترنت وحده.
//
// • كلُّ ورقةٍ تُطبع تُسجَّل مع بصمة ما فيها (`POST /api/cash-book/printed`)، فإن تغيّر شيءٌ بعدها قالت الصفحةُ «عُدّل بعد الطباعة».
// • السطورُ الكثيرة تُكمل في صفحةٍ ثانية برأسها، والمجموعُ والمربّعان في آخر صفحة.
// • وفي أسفل كلّ صفحة: متى طُبعت ومَن طبعها، ورقمُ الصفحة.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { cashRowNote, drBoxLineText } from "@/lib/cash_book_text";
import { type CashBook as Book, CASH_BOOK_LABELS, dayNameOf, isYmd, isCashBook, packSheetPages } from "@shared/cash_book";

interface Row { source: string; id: number; column: "income" | "expense" | "transfer"; kind: string; amount: number; note: string; category: string | null }
interface Sheet {
  branch: { id: number; name: string; config: { drRatioPct: number | null } };
  book: Book; day: string;
  opening: { date: string } | null;
  rows: Row[];
  totals: { income: number; outflow: number; dayNet: number; prevRemaining: number; remaining: number };
  ratio: { today: number; prev: number; received: number; remaining: number };
  drBoxLines?: { id: number; category: string }[];
}
type Line = { income?: number; expense?: number; transfer?: number; note: string; muted?: boolean };

/** سطورُ الورقة الفارغة (للطوارئ) — تتّسع لها صفحةٌ واحدة مع المربّعين. */
const BLANK_ROWS = 19;
/** هامشُ أمانٍ تحت الحساب (مم) — فرقُ تقريب المتصفّح والطابعة لا يدفع سطراً إلى ورقةٍ جديدة. */
const SAFETY_MM = 4;
const MAX_DAYS = 31;

const fmt = (n: number | undefined) => (n === undefined ? "" : n.toLocaleString("en-US"));
const dmy = (ymd: string) => `${ymd.slice(8, 10)}/${ymd.slice(5, 7)}/${ymd.slice(0, 4)}`;
function addDays(ymd: string, n: number) {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}
const baghdadStamp = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

function linesOf(s: Sheet): Line[] {
  const out: Line[] = s.rows.map((r) => ({
    income: r.column === "income" ? r.amount : undefined,
    expense: r.column === "expense" ? r.amount : undefined,
    transfer: r.column === "transfer" ? r.amount : undefined,
    note: cashRowNote(r),
  }));
  for (const l of s.drBoxLines ?? []) out.push({ note: drBoxLineText(l.category), muted: true });
  return out;
}

export default function CashBookPrint() {
  const session = useBranchSession() as any;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const blank = params.get("blank") === "1";
  const branchId = Number(params.get("branchId") ?? 0);
  const book = isCashBook(params.get("book")) ? (params.get("book") as Book) : "devices";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? from;
  const [sheets, setSheets] = useState<Sheet[] | null>(blank ? [] : null);
  const [error, setError] = useState<string | null>(null);
  const [printedAt] = useState(() => new Date());
  const [branchName, setBranchName] = useState("");

  useEffect(() => {
    if (blank) {
      if (branchId > 0) {
        fetch("/api/branches", { credentials: "include" }).then((r) => (r.ok ? r.json() : []))
          .then((all: any[]) => setBranchName(all.find((b) => b.id === branchId)?.name ?? ""))
          .catch(() => undefined);
      }
      return;
    }
    if (!branchId || !isYmd(from) || !isYmd(to) || from > to) { setError("رابط الطباعة ناقص"); return; }
    (async () => {
      const days: string[] = [];
      for (let d = from; d <= to && days.length < MAX_DAYS; d = addDays(d, 1)) days.push(d);
      const got: Sheet[] = [];
      for (const day of days) {
        const res = await fetch(`/api/cash-book?branchId=${branchId}&book=${book}&date=${day}`, { credentials: "include" });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) { setError(j.error || "تعذّر تحميل الدفتر"); return; }
        //  يومٌ قبل بداية الدفتر لا ورقةَ له.
        if (j.opening && day >= j.opening.date) got.push(j);
      }
      //  كلُّ ورقةٍ تُسجَّل طباعتُها مع بصمة ما فيها — ففي التطبيق يُعرف «عُدّل بعد الطباعة».
      for (const s of got) {
        await apiRequest("POST", "/api/cash-book/printed", { branchId, book, date: s.day }).catch(() => undefined);
      }
      setSheets(got);
    })().catch((e) => setError(e?.message ?? "تعذّر التحميل"));
  }, []);

  //  نافذةُ الطباعة بعد أن يكتمل الرسمُ والشعار — ومنها «حفظ كملف PDF».
  useEffect(() => {
    if (!sheets) return;
    //  وبعد أن تُقطَّع كلُّ ورقةٍ بقياسها — لا تُفتح النافذةُ وورقةٌ ما زالت تُقاس.
    let tries = 0;
    let t: ReturnType<typeof setTimeout>;
    const go = () => {
      if (document.querySelector(".cb-measure") && tries++ < 50) { t = setTimeout(go, 100); return; }
      window.print();
    };
    t = setTimeout(go, 600);
    return () => clearTimeout(t);
  }, [sheets]);

  const by = session?.displayName ?? "";
  const stamp = `طُبعت يوم ${baghdadStamp(printedAt).replace(",", " — الساعة")} بواسطة ${by}`;

  if (error) return <p className="p-10 text-center text-red-600" dir="rtl">{error}</p>;
  if (!sheets) return <p className="p-10 text-center text-muted-foreground" dir="rtl">جارٍ تجهيز الورقة للطباعة…</p>;
  if (!blank && sheets.length === 0) return <p className="p-10 text-center text-muted-foreground" dir="rtl">لا ورقةَ في هذه الفترة — الأيامُ كلُّها قبل بداية الدفتر.</p>;

  return (
    <div className="cb-print" dir="rtl" lang="ar">
      <style>{PRINT_CSS}</style>
      <div className="cb-toolbar">
        <button type="button" onClick={() => window.print()}>طباعة / حفظ كملف PDF</button>
        <span>{blank ? "ورقة فارغة — لانقطاع الإنترنت فقط" : `${sheets.length} ${sheets.length === 1 ? "ورقة" : "أوراق"}`}</span>
      </div>
      {blank
        ? <SheetPages branchName={branchName} book={book} day={null} lines={Array(BLANK_ROWS).fill({ note: "" })} sheet={null} stamp="" blank />
        : sheets.map((s) => (
          <SheetPages key={s.day} branchName={s.branch.name} book={s.book} day={s.day} lines={linesOf(s)} sheet={s} stamp={stamp} />
        ))}
    </div>
  );
}

function SheetPages({ branchName, book, day, lines, sheet, stamp, blank }: {
  branchName: string; book: Book; day: string | null; lines: Line[]; sheet: Sheet | null; stamp: string; blank?: boolean;
}) {
  //  **القياسُ أوّلاً ثمّ التقطيع** — ورقةٌ مخفيّة بكلّ السطور تُرسم مرّةً فيُقاس ارتفاعُ كلّ سطرٍ وما حوله، ثمّ تُقطَّع بـ`packSheetPages`.
  //  والورقةُ الفارغة صفحةٌ واحدة كما صُمّمت.
  const [plan, setPlan] = useState<{ counts: number[]; pad: number } | null>(blank ? { counts: [lines.length], pad: 0 } : null);
  const measureRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (plan || !measureRef.current) return;
    let cancelled = false;
    const run = () => {
      const sec = measureRef.current;
      if (cancelled || !sec) return;
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:1px";
      document.body.appendChild(probe);
      const mm = probe.getBoundingClientRect().height / 100;
      probe.remove();
      const h = (el: Element | null) => (el ? el.getBoundingClientRect().height : 0);
      const rows = Array.from(sec.querySelectorAll("tbody tr.line")).map(h);
      const blankH = h(sec.querySelector("tr.probe-blank"));
      const contH = h(sec.querySelector("tr.cont"));
      const totalH = h(sec.querySelector("tr.total"));
      const boxes = sec.querySelector(".boxes");
      const boxesBlock = boxes ? h(boxes) + 4 * mm : 0;
      const sumRows = rows.reduce((t, x) => t + x, 0);
      //  ما في الورقة المقيسة سوى السطور = الحشوةُ والرأسُ والعناوينُ والمجموعُ و«يتبع» والسطرُ الفارغ والمربّعان والختم والفجوات.
      const others = h(sec) - sumRows - blankH;
      const page = 297 * mm - SAFETY_MM * mm;
      //  فجوةُ الفاصل المرن (`grow`) بين الجدول والختم في الورقة الحقيقية.
      const lastRoom = page - (others - contH) - 4 * mm;
      const fullRoom = page - (others - totalH - boxesBlock) - 4 * mm;
      const counts = packSheetPages(rows, fullRoom, lastRoom);
      const lastRows = rows.slice(rows.length - counts[counts.length - 1]).reduce((t, x) => t + x, 0);
      const pad = blankH > 0 ? Math.max(0, Math.floor((lastRoom - lastRows) / blankH)) : 0;
      setPlan({ counts, pad });
    };
    //  الخطوطُ أوّلاً — قياسٌ بخطٍّ احتياطيٍّ يخطئ في ارتفاع السطر.
    (document as any).fonts?.ready ? (document as any).fonts.ready.then(run) : run();
    return () => { cancelled = true; };
  }, [plan]);

  if (!plan) {
    return (
      <div className="cb-measure" aria-hidden="true">
        <Page {...{ branchName, book, day, sheet, stamp, blank }} lines={lines} last pad={0} pageNo={1} pageCount={1} measuring sectionRef={measureRef} />
      </div>
    );
  }
  let start = 0;
  return (
    <>
      {plan.counts.map((n, i) => {
        const pageLines = lines.slice(start, start + n);
        start += n;
        const last = i === plan.counts.length - 1;
        return <Page key={i} {...{ branchName, book, day, sheet, stamp, blank }} lines={pageLines} last={last}
          pad={last ? plan.pad : 0} pageNo={i + 1} pageCount={plan.counts.length} />;
      })}
    </>
  );
}

function Page({ branchName, book, day, lines, sheet, stamp, blank, last, pad, pageNo, pageCount, measuring, sectionRef }: {
  branchName: string; book: Book; day: string | null; lines: Line[]; sheet: Sheet | null; stamp: string; blank?: boolean;
  last: boolean; pad: number; pageNo: number; pageCount: number; measuring?: boolean; sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
      <section className={measuring ? "a4 measuring" : "a4"} ref={sectionRef} data-testid={measuring ? undefined : "cb-print-page"}>
        <div className="brand">
          <div className="brand-name">
            <span className="brand-ar">مجموعة مراكز الدكتور ياسر الساعدي</span>
            <span className="brand-rule" aria-hidden="true" />
          </div>
          <img className="brand-logo" src="/cash-book-logo.png" alt="Dr. Y" />
        </div>
        <div className="head">
          <span className="field">الفرع: <b>{branchName || " "}</b></span>
          <span className="field">القسم: <b>{branchName ? CASH_BOOK_LABELS[book] : " "}</b></span>
          <span className="field">اليوم: <b className="day">{day ? dayNameOf(day) : " "}</b></span>
          <span className="field">التاريخ: <b className="date" dir="ltr">{day ? dmy(day) : "  /  /    "}</b></span>
        </div>
        <table>
          <colgroup><col style={{ width: "17%" }} /><col style={{ width: "17%" }} /><col style={{ width: "17%" }} /><col style={{ width: "49%" }} /></colgroup>
          <thead>
            <tr>
              <th className="in" rowSpan={2}>الوارد</th>
              <th className="out" colSpan={2}>الصادر</th>
              <th rowSpan={2} className="notes-h">الملاحظات</th>
            </tr>
            <tr><th className="out">مصاريف</th><th className="dr">تحويل إلى قاصة الدكتور</th></tr>
          </thead>
          <tbody>
            {lines.map((l, j) => (
              <tr key={j} className={blank ? "line blank" : l.muted ? "line muted" : "line"}>
                <td className="num">{fmt(l.income)}</td>
                <td className="num">{fmt(l.expense)}</td>
                <td className="num dr">{fmt(l.transfer)}</td>
                <td className="note"><span>{l.note}</span></td>
              </tr>
            ))}
            {Array.from({ length: pad }).map((_, j) => (
              <tr key={`p${j}`} className="blank"><td /><td /><td className="dr" /><td /></tr>
            ))}
            {measuring && <tr className="blank probe-blank"><td /><td /><td className="dr" /><td /></tr>}
            {measuring && <tr className="cont"><td colSpan={4}>يتبع في الصفحة التالية ←</td></tr>}
            {last ? (
              <tr className="total">
                <td className="num">{sheet ? fmt(sheet.totals.income) : ""}</td>
                <td className="num" colSpan={2}>{sheet ? fmt(sheet.totals.outflow) : ""}</td>
                <td>المجموع</td>
              </tr>
            ) : (
              <tr className="cont"><td colSpan={4}>يتبع في الصفحة التالية ←</td></tr>
            )}
          </tbody>
        </table>
        {last && (
          <div className="boxes">
            <div className="box">
              <h3>القاصة</h3>
              <div className="sum">
                <div>مجموع اليوم<span className="colhint">(الوارد − الصادر)</span></div><div>{sheet ? fmt(sheet.totals.dayNet) : " "}</div>
                <div>الباقي من أمس</div><div>{sheet ? fmt(sheet.totals.prevRemaining) : " "}</div>
                <div className="eq">المتبقي في القاصة<span className="colhint">(مجموع اليوم + الباقي من أمس)</span></div><div>{sheet ? fmt(sheet.totals.remaining) : " "}</div>
              </div>
            </div>
            {(blank || sheet?.branch.config.drRatioPct) && (
              <div className="box ratio">
                <h3>نسبة العزل</h3>
                <div className="sum">
                  <div>نسبة اليوم</div><div>{sheet ? fmt(sheet.ratio.today) : " "}</div>
                  <div>المتبقي من نسبة أمس</div><div>{sheet ? fmt(sheet.ratio.prev) : " "}</div>
                  {sheet && sheet.ratio.received > 0 && (<><div>استلمه المالك اليوم</div><div>{fmt(sheet.ratio.received)}</div></>)}
                  <div className="eq">المتبقي في النسبة<span className="colhint">(نسبة اليوم + المتبقي من نسبة أمس)</span></div><div>{sheet ? fmt(sheet.ratio.remaining) : " "}</div>
                </div>
              </div>
            )}
          </div>
        )}
        {!measuring && <div className="grow" />}
        <footer className="stamp">
          <span>{stamp}</span>
          {pageCount > 1 && <span>صفحة {pageNo} من {pageCount}</span>}
        </footer>
      </section>
  );
}

//  مقاساتُ الورقة المعتمدة نفسُها (A4، ٢١٠×٢٩٧ مم) — من تصميم الورقة الذي وافق عليه المالك.
const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
.cb-print { --ink:#1f2a2e; --muted:#5b6669; --rule:#b9c4c6; --rule-strong:#4c5b5f; --in:#1e6b52; --out:#8a3b2a; --dr:#2d4f8a;
  --navy:#1d2b55; --copper:#b07040; --tint-dr:#e8eef8; --tint-out:#f7ece8; --tint-in:#e7f2ec;
  background:#e9ecef; min-height:100vh; padding:12px 0 40px; color:var(--ink); font-size:14px; }
.cb-toolbar { display:flex; gap:12px; align-items:center; justify-content:center; margin-bottom:12px; font-size:14px; }
.cb-toolbar button { background:var(--navy); color:#fff; border:0; border-radius:6px; padding:8px 18px; font-weight:700; cursor:pointer; }
.cb-print .a4 { width:210mm; height:297mm; box-sizing:border-box; padding:7mm 10mm 6mm; margin:0 auto 12px; background:#fff;
  box-shadow:0 1px 6px rgba(31,42,46,.18); display:flex; flex-direction:column; gap:4mm; overflow:hidden; }
.cb-print .brand { display:flex; align-items:center; justify-content:space-between; gap:6mm; padding-bottom:3mm; border-bottom:2px solid var(--navy); position:relative; }
.cb-print .brand::after { content:""; position:absolute; inset-inline:0; bottom:-4px; border-bottom:0.6px solid var(--copper); }
.cb-print .brand-name { display:grid; gap:1.5mm; }
.cb-print .brand-ar { font-weight:700; font-size:1.65rem; line-height:1.25; color:var(--navy); }
.cb-print .brand-rule { display:block; width:42mm; height:2px; background:linear-gradient(to left, var(--copper), transparent); }
.cb-print .brand-logo { height:17mm; width:auto; max-width:45%; }
.cb-print .head { display:flex; justify-content:space-between; gap:4mm; flex-wrap:nowrap; }
.cb-print .field { display:flex; gap:6px; align-items:baseline; color:var(--muted); white-space:nowrap; }
.cb-print .field b { color:var(--ink); font-weight:600; min-width:6.5em; border-bottom:1px dotted var(--rule-strong); display:inline-block; text-align:center; }
.cb-print .field b.day { min-width:4.5em; }
.cb-print table { width:100%; table-layout:fixed; border-collapse:collapse; font-variant-numeric:tabular-nums; }
.cb-print th, .cb-print td { border:1px solid var(--rule); padding:1.4mm 2mm; vertical-align:middle; }
.cb-print td { padding:0.9mm 2mm; }
.cb-print th { font-weight:600; font-size:0.85rem; text-align:center; border-bottom:2px solid var(--rule-strong); }
.cb-print th.in { color:var(--in); background:var(--tint-in); font-size:1.05rem; }
.cb-print th.out { color:var(--out); background:var(--tint-out); }
.cb-print th.dr { color:var(--dr); background:var(--tint-dr); }
.cb-print th.notes-h { font-size:1.3rem; font-weight:700; }
.cb-print td.num { text-align:left; direction:ltr; white-space:nowrap; }
.cb-print td.dr { background:var(--tint-dr); }
.cb-print td.note span { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.35; font-size:12.5px; }
.cb-print tr.blank td { height:8mm; padding:0 2mm; }
.cb-print tr.muted td { color:#6b7280; font-style:italic; background:#f8f9fa; }
.cb-print tr.total td { font-weight:700; border-top:2px solid var(--rule-strong); background:#f3f4f1; }
.cb-print tr.cont td { text-align:center; color:var(--muted); font-size:12px; }
.cb-print .boxes { display:grid; grid-template-columns:1fr 1fr; gap:6mm; }
.cb-print .box { border:1.5px solid var(--rule-strong); padding:2.5mm 4mm; display:grid; gap:1mm; line-height:1.45; }
.cb-print .box h3 { margin:0 0 1mm; font-size:1rem; font-weight:700; }
.cb-print .box.ratio { border-color:var(--in); border-style:double; border-width:3px; }
.cb-print .box.ratio h3 { color:var(--in); }
.cb-print .sum { display:grid; grid-template-columns:1fr auto; gap:4px 16px; font-variant-numeric:tabular-nums; }
.cb-print .sum div:nth-child(even) { text-align:left; direction:ltr; min-width:9em; border-bottom:1px dotted var(--rule-strong); align-self:start; }
.cb-print .colhint { display:block; font-weight:400; font-size:0.72rem; color:var(--muted); line-height:1.3; }
.cb-print .sum .eq { font-weight:700; margin-top:2mm; }
.cb-print .sum .eq + div { font-weight:700; border-bottom:2px solid var(--rule-strong); margin-top:2mm; }
.cb-print .grow { flex:1; }
.cb-measure { position:absolute; inset-inline-start:-10000px; top:0; visibility:hidden; pointer-events:none; }
.cb-print .a4.measuring { height:auto; overflow:visible; }
.cb-print .stamp { display:flex; justify-content:space-between; font-size:10.5px; color:var(--muted); border-top:1px solid var(--rule); padding-top:1.5mm; }
@media print {
  html, body { background:#fff !important; }
  .cb-print { background:#fff; padding:0; }
  .cb-toolbar { display:none; }
  html, body, #root { margin:0 !important; padding:0 !important; height:auto !important; min-height:0 !important; }
  .cb-print { min-height:0; }
  .cb-measure { display:none; }
  .cb-print .a4 { box-shadow:none; margin:0; break-after:page; break-inside:avoid; }
  .cb-print .a4:last-of-type { break-after:auto; }
}
`;
