// **ورقةُ «الحالات غير المكتملة لدى الخبير»** (§4.gc) — `/manufacturing/expert-open/print?expertUserId=&branchId=`.
//
// طلبُ المالك ٢٠٢٦-١١-٠٨: ملفٌّ مفصَّلٌ للإدارة بحالات الخبير التي لم تُسلَّم بعد، و«مستقبلاً لا حاجةَ لنيون». فالورقةُ تقرأ قائمةَ
// التصنيع نفسَها (`/api/manufacturing/orders` — للمسؤول ومدير الفرع بفروعه) وتصنّف كلَّ أمرٍ بالقاعدة التي يعدّ بها جدولُ «مقارنة
// الخبراء» (`shared/expert_open_orders.ts`)، فلا تقول الورقةُ رقماً ويقول الجدولُ غيرَه. والصفوفُ تُقسَّم على صفحاتٍ **بالقياس**
// (`packRowsIntoPages` — كالسجلّ الكامل) ورأسٍ مكرَّر، فلا يقطع صانعُ الملفّ صفّاً في منتصفه: الاسمُ والعذرُ المكتوب نصٌّ بلا حدّ،
// وعددٌ ثابت من الصفوف (كان ١٤ ثمّ ٢٠) يتجاوز A4 بعذرٍ طويل فيُقصّ الصفُّ بين صفحتين بلا رأس جدول (مراجعة Codex على #711).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { usePrintAction } from "@/hooks/use-print-action";
import { apiRequest } from "@/lib/queryClient";
import { intakeHeader } from "@shared/intake_sheet";
import { packRowsIntoPages } from "@shared/print_pages";
import { REASON_CODE_LABELS, STAGE_LABELS, STATUS_LABELS } from "@shared/manufacturing";
import { classifyOpenOrder, STALE_NO_DATE_DAYS, summarizeOpenOrders, type OpenOrderClass } from "@shared/expert_open_orders";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

interface Row {
  id: number; patientName: string; patientCode: string | null; branchName: string | null;
  purpose?: string; isFollowup?: boolean; currentStage: string; status: string;
  expertName: string | null; assignedAt: string | null; expectedDeliveryDate: string | null;
  holdReasonCode: string | null; holdNote: string | null;
}

//  الورقةُ في الطباعة: ٢٩٧ ملم ناقصاً هامشَي `@page` (٨ + ٨)، وهامشُ أمانٍ لما يختلف بين الشاشة والطابعة (ونسخةُ الآيفون المصوَّرة
//  تلتقط الورقةَ بطولها على الشاشة ٢٩٧ ملم، فما دون هذا الحدّ لا يُقطَّع).
const PAGE_MAX_MM = 297 - 16 - 3;

const dmy = (day: string | null | undefined) => {
  if (!day) return "—";
  const [y, m, d] = String(day).slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};
const baghdadToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
const kindOf = (r: Row) => (r.purpose === "maintenance" ? (r.isFollowup ? "متابعة" : "صيانة") : "تصنيع أوّل");

function excuseText(r: Row): string {
  const code = (r.holdReasonCode ?? "").trim();
  const note = (r.holdNote ?? "").trim();
  //  «سبب آخر» وحده لا يقول شيئاً — الملاحظةُ هي السبب.
  const label = code && code !== "other" ? (REASON_CODE_LABELS[code] ?? code) : "";
  return [label, note].filter(Boolean).join(" — ") || (code ? REASON_CODE_LABELS[code] ?? code : "");
}

function dueNote(c: OpenOrderClass): { text: string; tone: string } {
  if (c.daysToDue === null) return { text: "لم يُحدَّد موعد بعد", tone: "nodate" };
  if (c.daysToDue < 0) return { text: `فات موعدها منذ ${-c.daysToDue} يوماً`, tone: "late" };
  if (c.daysToDue === 0) return { text: "موعدها اليوم", tone: "ok" };
  return { text: `موعدها بعد ${c.daysToDue} يوماً`, tone: "ok" };
}

export default function ExpertOpenOrdersPrint() {
  const params = new URLSearchParams(window.location.search);
  const expertUserId = Number(params.get("expertUserId"));
  const branchId = params.get("branchId");
  const nameHint = params.get("name") ?? "";
  const valid = Number.isInteger(expertUserId) && expertUserId > 0;
  const q = useQuery<Row[]>({
    queryKey: ["/api/manufacturing/orders", "expert-open-print", expertUserId, branchId],
    enabled: valid,
    queryFn: async () => {
      const p = new URLSearchParams({ expertUserId: String(expertUserId) });
      if (branchId) p.set("branchId", branchId);
      return (await apiRequest("GET", `/api/manufacturing/orders?${p}`)).json();
    },
  });
  const today = baghdadToday();
  const rows = useMemo(() => {
    const open = (q.data ?? [])
      .map((r) => ({ r, c: classifyOpenOrder({ status: r.status, expectedDeliveryDate: r.expectedDeliveryDate, holdReasonCode: r.holdReasonCode, assignedAt: r.assignedAt }, today) }))
      .filter((x): x is { r: Row; c: OpenOrderClass } => x.c !== null);
    //  الأقدمُ إسناداً أوّلاً — أطولُها انتظاراً أحقُّها بالنظر.
    return open.sort((a, b) => (b.c.daysSinceAssigned ?? 0) - (a.c.daysSinceAssigned ?? 0) || a.r.id - b.r.id);
  }, [q.data, today]);
  const summary = useMemo(() => summarizeOpenOrders(rows.map(({ r }) => ({
    status: r.status, expectedDeliveryDate: r.expectedDeliveryDate, holdReasonCode: r.holdReasonCode, assignedAt: r.assignedAt,
  })), today), [rows, today]);

  //  ══ **القياسُ ثمّ التقطيع** — نسخٌ مخفيّة بعرض A4: الصفحةُ الأولى بكلّ الصفوف، وصفحةٌ تالية بلا صفّ بذيلها وبلاه. فارتفاعُ كلّ صفٍّ
  //  يُقاس، وما سوى الصفوف (الترويسةُ والبطاقاتُ والملاحظة ورأسُ الجدول) هو ما يُطرح من الورقة، وذيلُ «صفحة ١ من ٢» لا يُحسب حين
  //  تتّسع الصفوفُ كلُّها في صفحةٍ واحدة. والأعمدةُ بعرضٍ ثابت (`table-layout:fixed`) — وإلّا وزّع الجدولُ العرضَ بمحتوى صفوفه، فيضيّق
  //  عذرٌ طويل في نسخة القياس بقيّةَ الأعمدة فتطول صفوفُها، وتختلف عن صفوف الصفحة الحقيقية. ══
  //  والخطّةُ مربوطةٌ بالصفوف التي قيست: بياناتٌ تحدّثت ⟵ تُقاس من جديد، فلا تُقطَّع صفوفٌ جديدة بخطّةٍ قديمة.
  const [plan, setPlan] = useState<{ rows: typeof rows; counts: number[] } | null>(null);
  const counts = plan && plan.rows === rows ? plan.counts : null;
  const setCounts = (c: number[]) => setPlan({ rows, counts: c });
  const measureRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (counts || !q.data) return;
    if (rows.length === 0) { setCounts([0]); return; }
    let cancelled = false;
    const run = () => {
      const root = measureRef.current;
      if (cancelled || !root) return;
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:1px";
      document.body.appendChild(probe);
      const mm = probe.getBoundingClientRect().height / 100;
      probe.remove();
      const first = root.querySelector<HTMLElement>(".eo-m-first");
      const rest = root.querySelector<HTMLElement>(".eo-m-rest");
      const restBare = root.querySelector<HTMLElement>(".eo-m-rest0");
      if (!first || !rest || !restBare) return;
      const heights = Array.from(first.querySelectorAll("tbody tr")).map((el) => el.getBoundingClientRect().height);
      const sum = heights.reduce((a, b) => a + b, 0);
      const max = PAGE_MAX_MM * mm;
      const firstFixed = first.getBoundingClientRect().height - sum;
      const foot = rest.getBoundingClientRect().height - restBare.getBoundingClientRect().height;
      const firstRoom = max - firstFixed - foot;
      const restRoom = max - rest.getBoundingClientRect().height;
      //  صفٌّ أوّلُ أطولُ ممّا يتّسع تحت البطاقات (عذرٌ طويلٌ جدّاً) ⟵ الصفحةُ الأولى بلا صفّ والصفوفُ من الثانية — وإلّا أجبره
      //  `packRowsIntoPages` على الأولى فتجاوزت A4 بالبطاقات والملاحظة (مراجعة Codex على #712).
      setCounts(firstFixed + sum <= max ? [heights.length]
        : heights[0] > firstRoom ? [0, ...packRowsIntoPages(heights, { first: restRoom, rest: restRoom, tail: 0 })]
        : packRowsIntoPages(heights, { first: firstRoom, rest: restRoom, tail: 0 }));
    };
    (document as any).fonts?.ready ? (document as any).fonts.ready.then(run) : run();
    return () => { cancelled = true; };
  }, [counts, q.data, rows]);
  const pages = useMemo(() => {
    const out: { chunk: typeof rows; offset: number }[] = [];
    let at = 0;
    for (const n of counts ?? []) { out.push({ chunk: rows.slice(at, at + n), offset: at }); at += n; }
    return out;
  }, [counts, rows]);

  const expertName = (q.data?.[0]?.expertName ?? nameHint) || `#${expertUserId}`;
  const branchNames = Array.from(new Set(rows.map(({ r }) => r.branchName).filter(Boolean))) as string[];
  const h = intakeHeader(branchNames.length === 1 ? branchNames[0] : null);
  const maint = rows.filter(({ r }) => r.purpose === "maintenance").length;

  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 16) / ((210 * 96) / 25.4)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const printer = usePrintAction({
    ready: Boolean(q.data && counts),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".eo-pages .eo-page")),
    fileName: `expert-open-orders-${expertUserId}-${today}.pdf`,
    fitOnePage: true,
  });
  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate("/manufacturing"));

  const renderPage = (chunk: typeof rows, pi: number, offset: number, total: number, key: string, extraClass?: string) => (
              <section className={`eo-page${extraClass ? ` ${extraClass}` : ""}`} key={key} data-testid={extraClass ? undefined : "eo-page"}>
                <div className="eo-head">
                  <div className="eo-center"><div className="n">{h.centerName}</div>{h.city && <div className="c">{h.city}</div>}</div>
                  <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt="" className="eo-logo" />
                </div>
                {pi === 0 && (
                  <>
                    <h1 className="eo-title" data-testid="eo-title">الحالات غير المكتملة لدى الخبير {expertName}</h1>
                    <p className="eo-sub">
                      أوامرُ التصنيع والصيانة المسندة إليه ولم تُسلَّم بعد (لا مكتملة ولا ملغاة)
                      {branchNames.length > 0 ? ` — ${branchNames.map((b) => `فرع ${b}`).join(" · ")}` : ""} · حتى <bdi dir="ltr">{dmy(today)}</bdi>
                    </p>
                    <div className="eo-cards">
                      <div className="eo-card"><b data-testid="eo-open">{summary.open}</b><span>غير مكتملة</span></div>
                      <div className="eo-card"><b>{summary.open - maint} / {maint}</b><span>تصنيع أوّل / صيانة</span></div>
                      <div className="eo-card ok"><b data-testid="eo-excused">{summary.excused}</b><span>بعذرٍ مكتوب</span></div>
                      <div className="eo-card"><b data-testid="eo-unexcused">{summary.unexcused}</b><span>بلا عذرٍ مكتوب</span></div>
                      <div className="eo-card warn"><b data-testid="eo-nodate">{summary.noDate}</b><span>بلا موعد تسليم</span></div>
                      <div className="eo-card red"><b data-testid="eo-late">{summary.late}</b><span>فات موعدها</span></div>
                    </div>
                  </>
                )}
                {rows.length === 0 ? (
                  <p className="eo-empty" data-testid="eo-empty">لا حالات غير مكتملة لدى هذا الخبير.</p>
                ) : (
                  <table className="eo-table">
                    <colgroup><col style={{ width: "4%" }} /><col style={{ width: "22%" }} /><col style={{ width: "19%" }} /><col style={{ width: "25%" }} /><col style={{ width: "14%" }} /><col style={{ width: "16%" }} /></colgroup>
                    <thead><tr><th>#</th><th>المريض</th><th>النوع والمرحلة</th><th>الحالة والعذر</th><th>الإسناد</th><th>موعد التسليم</th></tr></thead>
                    <tbody>
                      {chunk.map(({ r, c }, i) => {
                        const n = offset + i + 1;
                        const due = dueNote(c);
                        return (
                          <tr key={r.id} className={c.excused ? "excused" : c.stale ? "stale" : ""} data-testid={`eo-row-${r.id}`}>
                            <td className="num">{n}</td>
                            <td><div className="name">{r.patientName}</div><div className="sub"><bdi dir="ltr">{r.patientCode ?? ""}</bdi> · أمر {r.id}{branchNames.length > 1 && r.branchName ? ` · ${r.branchName}` : ""}</div></td>
                            <td>{kindOf(r)}<div className="sub">{STAGE_LABELS[r.currentStage] ?? r.currentStage}</div></td>
                            <td>{STATUS_LABELS[r.status] ?? r.status}
                              <div>{c.excused ? <><span className="tag ex">بعذر</span> <span className="why">{excuseText(r)}</span></> : <span className="tag nx">بلا عذر</span>}</div>
                            </td>
                            <td><bdi dir="ltr">{dmy(r.assignedAt ? new Date(r.assignedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" }) : null)}</bdi>
                              {c.daysSinceAssigned !== null && <div className="sub">منذ {c.daysSinceAssigned} يوماً</div>}</td>
                            <td><bdi dir="ltr">{dmy(r.expectedDeliveryDate)}</bdi><div className={`sub ${due.tone}`}>{due.text}</div></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
                {pi === 0 && rows.length > 0 && (
                  <div className="eo-notes">
                    <b>قراءة الجدول:</b> «بلا عذر» لا تعني «متأخّرة» — تعني أنّ الأمر ليس عليه سببُ توقّفٍ مكتوب؛ والتأخّرُ يُقاس من موعد التسليم الذي يُحدَّد
                    عند مرحلة القالب. والمظلَّلةُ بالأصفر بلا موعدٍ ولا عذرٍ منذ {STALE_NO_DATE_DAYS} يوماً فأكثر (<b data-testid="eo-stale">{summary.stale}</b>) —
                    أحقُّها بالمتابعة: إمّا تتقدّم أو يُكتب سببُ توقّفها في «توقّف / مشكلة». والإسنادُ تاريخُ إنشاء الأمر، والترتيبُ من الأقدم.
                  </div>
                )}
                {total > 1 && <div className="eo-foot">صفحة {pi + 1} من {total}</div>}
              </section>
  );

  return (
    <div dir="rtl" className="eo-root min-h-screen bg-slate-100">
      <style>{EO_CSS}</style>
      <div className="no-print sticky top-0 z-10 bg-white border-b px-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-eo-back"><ArrowRight className="w-4 h-4" /> رجوع</Button>
          <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-eo-print">
            {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
          </Button>
        </div>
      </div>
      {!valid ? <p className="p-8 text-center text-destructive">لم يُحدَّد الخبير.</p>
        : q.isLoading ? <p className="p-8 text-center text-muted-foreground">جارٍ التحميل…</p>
        : q.isError ? <p className="p-8 text-center text-destructive">تعذّر فتح القائمة.</p>
        : (
          <>
          {/*  نسختا القياس — خارجَ التصغير فيُقاس بعرض A4 الحقيقيّ، ولا تُطبعان. */}
          {!counts && rows.length > 0 && (
            <div className="eo-measure" aria-hidden="true" ref={measureRef}>
              {renderPage(rows, 0, 0, 1, "m-first", "eo-m-first")}
              {renderPage([], 1, 0, 2, "m-rest", "eo-m-rest")}
              {renderPage([], 1, 0, 1, "m-rest0", "eo-m-rest0")}
            </div>
          )}
          <div className="eo-pages" data-print-zoom style={{ zoom }}>
            {pages.map(({ chunk, offset }, pi) => renderPage(chunk, pi, offset, pages.length, String(pi)))}
          </div>
          </>
        )}
    </div>
  );
}

const EO_CSS = `
@page { size: A4 portrait; margin: 8mm; }
.eo-pages { padding:12px 0 40px; }
.eo-page { width:210mm; min-height:297mm; box-sizing:border-box; padding:9mm 9mm 8mm; margin:0 auto 12px; background:#fff; box-shadow:0 1px 6px rgba(31,42,46,.18);
  display:flex; flex-direction:column; gap:3mm; font-size:11.5px; line-height:1.5; color:#1f2937; position:relative; }
.eo-head { display:grid; grid-template-columns:1fr auto; align-items:center; gap:4mm; border-bottom:2px solid #1e3a8a; padding-bottom:2mm; }
.eo-center { border:2px solid #1e293b; border-radius:12px; padding:1.5mm 4mm; text-align:center; font-weight:700; color:#1e3a8a; justify-self:start; }
.eo-center .n { font-size:13px; } .eo-center .c { font-size:11.5px; }
.eo-logo { height:15mm; width:15mm; object-fit:contain; }
.eo-title { font-size:19px; font-weight:800; margin:1mm 0 0; }
.eo-sub { font-size:11.5px; color:#475569; margin:0; }
.eo-cards { display:grid; grid-template-columns:repeat(6,1fr); gap:2mm; }
.eo-card { border:1px solid #d5dcea; border-radius:7px; padding:1.5mm 2.5mm; background:#f6f8fc; }
.eo-card b { display:block; font-size:18px; font-weight:800; } .eo-card span { color:#475569; font-size:10.5px; }
.eo-card.ok { background:#f0f8f2; border-color:#b9dfc4; } .eo-card.warn { background:#fff4e5; border-color:#f3c98b; } .eo-card.red { background:#fdecec; border-color:#f1b0b0; }
.eo-table { width:100%; border-collapse:collapse; table-layout:fixed; }
.eo-table td { overflow-wrap:anywhere; }
.eo-table th { background:#1e3a8a; color:#fff; font-weight:700; padding:1.6mm 1.5mm; text-align:right; font-size:11px; }
.eo-table td { border-bottom:1px solid #e3e8f1; padding:1.4mm 1.5mm; vertical-align:top; }
.eo-table td.num { text-align:center; color:#64748b; }
.eo-table .name { font-weight:700; font-size:12px; } .eo-table .sub { color:#64748b; font-size:10.5px; }
.eo-table .sub.late { color:#b42318; font-weight:700; } .eo-table .sub.nodate { color:#8a5a00; }
.eo-table tr.excused td { background:#f4faf6; } .eo-table tr.stale td { background:#fffaf0; }
.tag { display:inline-block; border-radius:9px; padding:0 2mm; font-size:10px; font-weight:700; } .tag.ex { background:#e6f4ea; color:#1e6b34; } .tag.nx { background:#eef1f6; color:#3b4a66; }
.why { font-size:10.5px; color:#334155; }
.eo-notes { border:1px solid #d5dcea; border-radius:7px; padding:2mm 3mm; background:#fbfcfe; font-size:10.5px; color:#334155; }
.eo-empty { text-align:center; color:#475569; padding:10mm 0; }
.eo-foot { margin-top:auto; text-align:center; font-size:10px; color:#94a3b8; }
.eo-measure { position:absolute; left:-10000px; top:0; visibility:hidden; pointer-events:none; }
.eo-measure .eo-page { min-height:auto; box-shadow:none; margin:0; }
@media print {
  html, body { background:#fff !important; }
  .no-print, .eo-measure { display:none !important; }
  .eo-root { background:#fff !important; }
  .eo-pages { padding:0; zoom:1 !important; }
  .eo-page { box-shadow:none; margin:0; min-height:auto; page-break-after:always; }
  .eo-page:last-child { page-break-after:auto; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
