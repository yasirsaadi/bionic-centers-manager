// **ورقةُ «الحالات غير المكتملة لدى الخبير»** (§4.gc) — `/manufacturing/expert-open/print?expertUserId=&branchId=`.
//
// طلبُ المالك ٢٠٢٦-١١-٠٨: ملفٌّ مفصَّلٌ للإدارة بحالات الخبير التي لم تُسلَّم بعد، و«مستقبلاً لا حاجةَ لنيون». فالورقةُ تقرأ قائمةَ
// التصنيع نفسَها (`/api/manufacturing/orders` — للمسؤول ومدير الفرع بفروعه) وتصنّف كلَّ أمرٍ بالقاعدة التي يعدّ بها جدولُ «مقارنة
// الخبراء» (`shared/expert_open_orders.ts`)، فلا تقول الورقةُ رقماً ويقول الجدولُ غيرَه. والصفوفُ تُقسَّم على صفحاتٍ بعددٍ ثابت ورأسٍ
// مكرَّر، فلا يقطع صانعُ الملفّ صفّاً في منتصفه.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { usePrintAction } from "@/hooks/use-print-action";
import { apiRequest } from "@/lib/queryClient";
import { intakeHeader } from "@shared/intake_sheet";
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

const FIRST_PAGE_ROWS = 14;
const PAGE_ROWS = 20;

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
  const pages = useMemo(() => {
    const out: (typeof rows)[] = [rows.slice(0, FIRST_PAGE_ROWS)];
    for (let i = FIRST_PAGE_ROWS; i < rows.length; i += PAGE_ROWS) out.push(rows.slice(i, i + PAGE_ROWS));
    return out;
  }, [rows]);

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
    ready: Boolean(q.data),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".eo-page")),
    fileName: `expert-open-orders-${expertUserId}-${today}.pdf`,
    fitOnePage: true,
  });
  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate("/manufacturing"));

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
          <div className="eo-pages" data-print-zoom style={{ zoom }}>
            {pages.map((chunk, pi) => (
              <section className="eo-page" key={pi} data-testid="eo-page">
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
                    <thead><tr><th>#</th><th>المريض</th><th>النوع والمرحلة</th><th>الحالة والعذر</th><th>الإسناد</th><th>موعد التسليم</th></tr></thead>
                    <tbody>
                      {chunk.map(({ r, c }, i) => {
                        const n = (pi === 0 ? 0 : FIRST_PAGE_ROWS + (pi - 1) * PAGE_ROWS) + i + 1;
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
                {pages.length > 1 && <div className="eo-foot">صفحة {pi + 1} من {pages.length}</div>}
              </section>
            ))}
          </div>
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
.eo-table { width:100%; border-collapse:collapse; }
.eo-table th { background:#1e3a8a; color:#fff; font-weight:700; padding:1.6mm 1.5mm; text-align:right; font-size:11px; }
.eo-table td { border-bottom:1px solid #e3e8f1; padding:1.4mm 1.5mm; vertical-align:top; }
.eo-table td.num { text-align:center; color:#64748b; width:6mm; }
.eo-table .name { font-weight:700; font-size:12px; } .eo-table .sub { color:#64748b; font-size:10.5px; }
.eo-table .sub.late { color:#b42318; font-weight:700; } .eo-table .sub.nodate { color:#8a5a00; }
.eo-table tr.excused td { background:#f4faf6; } .eo-table tr.stale td { background:#fffaf0; }
.tag { display:inline-block; border-radius:9px; padding:0 2mm; font-size:10px; font-weight:700; } .tag.ex { background:#e6f4ea; color:#1e6b34; } .tag.nx { background:#eef1f6; color:#3b4a66; }
.why { font-size:10.5px; color:#334155; }
.eo-notes { border:1px solid #d5dcea; border-radius:7px; padding:2mm 3mm; background:#fbfcfe; font-size:10.5px; color:#334155; }
.eo-empty { text-align:center; color:#475569; padding:10mm 0; }
.eo-foot { margin-top:auto; text-align:center; font-size:10px; color:#94a3b8; }
@media print {
  html, body { background:#fff !important; }
  .no-print { display:none !important; }
  .eo-root { background:#fff !important; }
  .eo-pages { padding:0; zoom:1 !important; }
  .eo-page { box-shadow:none; margin:0; min-height:auto; page-break-after:always; }
  .eo-page:last-child { page-break-after:auto; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
