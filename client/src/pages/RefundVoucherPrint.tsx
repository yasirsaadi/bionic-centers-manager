// **سندُ الاسترجاع** (§4.fz) — `/refund-voucher/print?id=`.
//
// ورقةُ A4 بترويسة الفرع وشعاره (`intakeHeader`): رقمُ السند (رقمُ الطلب) وتاريخُ الاعتماد، والمستلمُ ورمزُه، والمبلغُ رقماً وكلمات،
// والقسمُ والسبب، ومَن طلبه ومَن اعتمده، وخانتا توقيع المستلم والموظّف — كما وافق عليه المالك في التصميم. ولا سندَ لطلبٍ لم يُعتمد.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { usePrintAction } from "@/hooks/use-print-action";
import { apiRequest } from "@/lib/queryClient";
import { intakeHeader } from "@shared/intake_sheet";
import type { RefundRow } from "@/components/PatientRefund";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
const dmy = (iso: string | null | undefined) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric" });
};

export default function RefundVoucherPrint() {
  const id = Number(new URLSearchParams(window.location.search).get("id"));
  const q = useQuery<RefundRow>({
    queryKey: ["/api/patient-refunds", "voucher", id],
    enabled: Number.isInteger(id) && id > 0,
    queryFn: async () => (await apiRequest("GET", `/api/patient-refunds/${id}`)).json(),
  });
  const r = q.data;
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 16) / ((210 * 96) / 25.4)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const printer = usePrintAction({
    ready: Boolean(r && r.status === "approved"),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".rv-page")),
    fileName: `refund-voucher-${id}.pdf`,
    fitOnePage: true,
  });
  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate(r ? `/patients/${r.patientId}` : "/"));
  const h = intakeHeader(r?.branchName ?? null);
  return (
    <div dir="rtl" className="rv-root min-h-screen bg-slate-100">
      <style>{RV_CSS}</style>
      <div className="no-print sticky top-0 z-10 bg-white border-b px-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-rv-back"><ArrowRight className="w-4 h-4" /> رجوع</Button>
          <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-rv-print">
            {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
          </Button>
        </div>
      </div>
      {q.isLoading ? <p className="p-8 text-center text-muted-foreground">جارٍ التحميل…</p>
        : q.isError || !r ? <p className="p-8 text-center text-destructive">تعذّر فتح السند.</p>
        : r.status !== "approved" ? <p className="p-8 text-center text-muted-foreground" data-testid="rv-not-approved">لا سندَ قبل اعتماد المسؤول — حالةُ الطلب: {r.statusLabel}</p>
        : (
          <div className="rv-pages" data-print-zoom style={{ zoom }}>
            <section className="rv-page" data-testid="rv-page">
              <div className="rv-head">
                <div className="rv-center"><div className="n">{h.centerName}</div>{h.city && <div className="c">{h.city}</div>}</div>
                <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt="" className="rv-logo" />
              </div>
              <h1 className="rv-title">سند استرجاع</h1>
              <div className="rv-meta">
                <span>رقم السند: <b data-testid="rv-no">{r.voucherNo}</b></span>
                <span>التاريخ: <bdi dir="ltr">{dmy(r.decidedAt)}</bdi></span>
              </div>
              <p className="rv-line">
                استلمتُ أنا <b data-testid="rv-name">{r.patientName}</b>{r.patientCode && <> (<bdi dir="ltr">{r.patientCode}</bdi>)</>} من {h.centerName}
                {r.branchName ? ` — فرع ${r.branchName}` : ""} مبلغ:
              </p>
              <div className="rv-amount">
                <b className="num" dir="ltr" data-testid="rv-amount">{money(r.amount)}</b> دينار
                <div className="words" data-testid="rv-words">{r.amountWords} عراقي لا غير</div>
              </div>
              <p className="rv-line">عن: {r.caseLabel} — {r.reasonLabel} ({r.detail}).</p>
              <p className="rv-small">طلبه: {r.requestedByName ?? "—"} · اعتمده: {r.decidedByName ?? "—"} — {dmy(r.decidedAt)}</p>
              <div className="rv-sign">
                <div><span>توقيع المستلم</span></div>
                <div><span>توقيع الموظّف</span></div>
              </div>
            </section>
          </div>
        )}
    </div>
  );
}

const RV_CSS = `
@page { size: A4 portrait; margin: 9mm; }
.rv-pages { padding:12px 0 40px; }
.rv-page { width:210mm; min-height:148mm; box-sizing:border-box; padding:12mm; margin:0 auto 12px; background:#fff; box-shadow:0 1px 6px rgba(31,42,46,.18);
  display:flex; flex-direction:column; gap:5mm; font-size:15px; line-height:1.7; color:#1f2937; }
.rv-head { display:grid; grid-template-columns:1fr auto; align-items:start; gap:4mm; border-bottom:1px solid #cbd5e1; padding-bottom:3mm; }
.rv-center { border:2px solid #1e293b; border-radius:14px; padding:2.5mm 5mm; text-align:center; font-weight:700; color:#1e3a8a; justify-self:start; }
.rv-center .n { font-size:16px; } .rv-center .c { font-size:13px; }
.rv-logo { height:20mm; width:20mm; object-fit:contain; }
.rv-title { text-align:center; font-size:24px; font-weight:800; margin:2mm 0; }
.rv-meta { display:flex; justify-content:space-between; font-size:14px; }
.rv-amount { text-align:center; font-size:18px; }
.rv-amount .num { font-size:28px; font-variant-numeric:tabular-nums; }
.rv-amount .words { font-size:16px; }
.rv-small { font-size:13px; color:#475569; }
.rv-sign { display:grid; grid-template-columns:1fr 1fr; gap:14mm; margin-top:14mm; text-align:center; font-size:13px; }
.rv-sign div { border-top:1px solid #334155; padding-top:2mm; }
@media print {
  .no-print { display:none !important; }
  .rv-root { background:#fff !important; }
  .rv-pages { padding:0; zoom:1 !important; }
  .rv-page { box-shadow:none; margin:0; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
