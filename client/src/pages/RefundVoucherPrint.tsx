// **«استمارة استرداد مبلغ»** (§4.gi — طلبُ المالك ٢٠٢٦-١١-١١ بتصميمه) — `/refund-voucher/print?id=`.
//
// كانت «سند استرجاع» بسيطاً (§4.fz)؛ صارت ورقةَ المالك نفسَها على A4: رأسُ المركز بشعاره وهاتفَي فرعه، وشريطُ العنوان، وصفوفُ اسم المريض
// والمرافق ورقم الجنسية ورقم الملف (من الملفّ والطلب — لا تُكتب باليد)، ونوعُ الاسترداد مُعلَّماً من قسم الحالة، والمبلغُ والسبب، و«قد استلمت
// مبلغ وقدره» بالكلمات، والتاريخُ وتوقيعُ المريض أو وليّ أمره. **ولا استمارةَ قبل اعتماد المسؤول** — والرسالةُ تقول لمن يتواصل.
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, BadgeDollarSign, ClipboardList, FileText, HandHeart, IdCard, Loader2, Phone, Printer, ShieldCheck, User, Users, Accessibility,
} from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { usePrintAction } from "@/hooks/use-print-action";
import { apiRequest } from "@/lib/queryClient";
import { intakeHeader } from "@shared/intake_sheet";
import { CENTER_CONTACTS } from "@shared/patient_card";
import { REFUND_PRINT_PENDING_MESSAGE, refundFormKind } from "@shared/patient_refunds";
import type { RefundRow } from "@/components/PatientRefund";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

const money = (n: number | null | undefined) => (n == null ? "—" : n.toLocaleString("en-US"));
const dmyParts = (iso: string | null | undefined) => {
  if (!iso) return null;
  const s = new Date(iso).toLocaleDateString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric" });
  const [d, m, y] = s.split("/");
  return { d, m, y };
};

/** هاتفا الفرع كما في بطاقة المريض (`CENTER_CONTACTS`) — «ذي قار» ⟵ «ذي قار بايونك». */
function branchPhones(branchName: string | null | undefined): string[] {
  const n = String(branchName ?? "").trim();
  if (!n) return [];
  return CENTER_CONTACTS.find((c) => c.branch.includes(n) || n.includes(c.branch))?.phones ?? [];
}

function Row({ icon: Icon, label, children, testid, tall }: { icon: any; label: string; children: React.ReactNode; testid?: string; tall?: boolean }) {
  return (
    <div className={`rf-row${tall ? " tall" : ""}`} data-testid={testid}>
      <div className="rf-label"><span className="rf-ico"><Icon className="w-[15px] h-[15px]" /></span>{label}</div>
      <div className="rf-val">{children}</div>
    </div>
  );
}

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
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".rf-page")),
    fileName: `refund-form-${id}.pdf`,
    fitOnePage: true,
  });
  const goBack = () => (window.history.length > 1 ? window.history.back() : navigate(r ? `/patients/${r.patientId}` : "/"));
  const h = intakeHeader(r?.branchName ?? null);
  const phones = branchPhones(r?.branchName);
  const kind = refundFormKind(r?.caseType);
  const date = dmyParts(r?.decidedAt);
  return (
    <div dir="rtl" className="rv-root min-h-screen bg-slate-100">
      <style>{RF_CSS}</style>
      <div className="no-print sticky top-0 z-10 bg-white border-b px-3 pb-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}>
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-rv-back"><ArrowRight className="w-4 h-4" /> رجوع</Button>
          <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-rv-print">
            {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
          </Button>
        </div>
      </div>
      {q.isLoading ? <p className="p-8 text-center text-muted-foreground">جارٍ التحميل…</p>
        : q.isError || !r ? <p className="p-8 text-center text-destructive">تعذّر فتح الاستمارة.</p>
        : r.status !== "approved" ? (
          <div className="p-8 text-center space-y-2" data-testid="rv-not-approved">
            <p className="font-bold text-amber-800">{r.status === "pending" ? REFUND_PRINT_PENDING_MESSAGE : "رُفض طلب الاسترجاع — لا استمارةَ تُطبع له."}</p>
            <p className="text-sm text-muted-foreground">حالةُ الطلب: {r.statusLabel}</p>
          </div>
        ) : (
          <div className="rv-pages" data-print-zoom style={{ zoom }}>
            <section className="rf-page" data-testid="rv-page">
              <header className="rf-head">
                <div className="rf-center">
                  <div className="n">{h.centerName}</div>
                  {r.branchName && <div className="c">فرع {r.branchName}</div>}
                  {phones.length > 0 && (
                    <div className="rf-phones" data-testid="rf-phones">
                      {phones.map((p) => <span key={p}><Phone className="w-[13px] h-[13px]" /><bdi dir="ltr">{p}</bdi></span>)}
                    </div>
                  )}
                </div>
                <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt="" className="rf-logo" />
              </header>
              <div className="rf-wave" />
              <h1 className="rf-title">استمارة استرداد مبلغ</h1>

              <div className="rf-rows">
                <Row icon={User} label="اسم المريض" testid="rf-patient"><b data-testid="rv-name">{r.patientName}</b></Row>
                <Row icon={Users} label="اسم المرافق" testid="rf-companion">{r.companionName ?? ""}</Row>
                <Row icon={IdCard} label="رقم الجنسية" testid="rf-national-id"><bdi dir="ltr">{r.nationalId ?? ""}</bdi></Row>
                <Row icon={ClipboardList} label="رقم الملف" testid="rf-code"><bdi dir="ltr">{r.patientCode}</bdi></Row>
              </div>

              <fieldset className="rf-kind" data-testid="rf-kind">
                <legend>نوع الاسترداد</legend>
                <span className="opt"><i className={`box${kind === "physio" ? " on" : ""}`} data-testid="rf-kind-physio">{kind === "physio" ? "✓" : ""}</i>العلاج الطبيعي</span>
                <span className="sep" />
                <span className="opt"><i className={`box${kind === "devices" ? " on" : ""}`} data-testid="rf-kind-devices">{kind === "devices" ? "✓" : ""}</i>مساند وأطراف</span>
              </fieldset>

              <div className="rf-rows">
                <Row icon={BadgeDollarSign} label="المبلغ المُسترد" testid="rf-amount">
                  <span className="rf-amt"><b className="num" dir="ltr" data-testid="rv-amount">{money(r.amount)}</b> دينار</span>
                </Row>
                <Row icon={FileText} label="سبب الاسترجاع" testid="rf-reason" tall>
                  <span>{r.reasonLabel}{r.detail ? ` — ${r.detail}` : ""}</span>
                  {r.sessionsLine && r.caseType === "physiotherapy" && (
                    <span className="block text-[13px]" data-testid="rv-sessions">الجلسات المُرجَعة: {r.sessionsLine}</span>
                  )}
                </Row>
              </div>

              <div className="rf-received" data-testid="rf-received">
                قد استلمت مبلغ وقدره: <b data-testid="rv-words">{r.amountWords} عراقي لا غير</b>
              </div>

              <div className="rf-sign">
                <div className="rf-date" data-testid="rf-date">
                  التاريخ:
                  {date ? <bdi dir="ltr" className="d">{date.d} / {date.m} / {date.y}</bdi> : <span className="d">/ /</span>}
                </div>
                <div className="rf-sig"><div>توقيع المريض او ولي امر المريض</div><span className="line" /></div>
              </div>

              <p className="rf-small" data-testid="rf-small">
                رقم الاستمارة <bdi dir="ltr" data-testid="rv-no">{r.voucherNo}</bdi> · طلبه: {r.requestedByName ?? "—"} · اعتمده: {r.decidedByName ?? "—"}
              </p>

              <footer className="rf-foot">
                <div className="t">معاً نحو حياة أفضل</div>
                <div className="i">
                  <span><Accessibility className="w-5 h-5" />علاج وتأهيل متكامل</span>
                  <span><HandHeart className="w-5 h-5" />رعاية مهنية</span>
                  <span><ShieldCheck className="w-5 h-5" />أمان واهتمام</span>
                </div>
              </footer>
            </section>
          </div>
        )}
    </div>
  );
}

const RF_CSS = `
@page { size: A4 portrait; margin: 8mm; }
.rv-pages { padding:12px 0 40px; }
.rf-page { width:210mm; min-height:277mm; box-sizing:border-box; padding:10mm 11mm 8mm; margin:0 auto 12px; background:#fff;
  box-shadow:0 1px 6px rgba(31,42,46,.18); display:flex; flex-direction:column; gap:4.2mm; font-size:15px; line-height:1.6; color:#0f2a5c;
  background-image:linear-gradient(180deg,#f4f8fd 0,#fff 28%,#fff 80%,#eef5fc 100%); }
.rf-head { display:grid; grid-template-columns:1fr auto; align-items:center; gap:6mm; }
.rf-center { text-align:right; border-left:2px solid #1e4fa3; padding-left:6mm; }
.rf-center .n { font-size:19px; font-weight:800; color:#123a83; line-height:1.4; }
.rf-center .c { font-size:13px; color:#3b5b8f; }
.rf-phones { display:flex; gap:5mm; margin-top:1.5mm; font-weight:700; font-size:14px; color:#123a83; }
.rf-phones span { display:inline-flex; align-items:center; gap:1.5mm; }
.rf-phones svg { background:#123a83; color:#fff; border-radius:999px; padding:2px; width:18px; height:18px; }
.rf-logo { height:24mm; width:auto; max-width:60mm; object-fit:contain; }
.rf-wave { height:3mm; border-radius:3mm; background:linear-gradient(90deg,#1e5bd8 0%,#22a3e0 55%,#4cb848 100%); opacity:.9; }
.rf-title { align-self:center; margin:1mm 0; padding:2.2mm 16mm; border-radius:999px; color:#fff; font-size:24px; font-weight:800;
  background:linear-gradient(90deg,#1546b8 0%,#1e6fd6 55%,#46b04a 100%); box-shadow:0 2px 5px rgba(21,70,184,.25); }
.rf-rows { display:flex; flex-direction:column; gap:2.6mm; }
.rf-row { display:grid; grid-template-columns:46mm 1fr; min-height:11.5mm; border:1.4px solid #1e4fa3; border-radius:3.5mm; overflow:hidden; background:#fff; }
.rf-row.tall { min-height:19mm; }
.rf-label { display:flex; align-items:center; gap:2.5mm; padding:0 3mm; font-weight:800; font-size:15.5px; color:#0f2a5c; border-left:1.4px solid #1e4fa3; background:#f3f7fd; }
.rf-ico { display:inline-flex; align-items:center; justify-content:center; width:8mm; height:8mm; border-radius:999px; background:#123a83; color:#fff; flex:none; }
.rf-val { display:flex; flex-direction:column; justify-content:center; padding:1.5mm 4mm; font-size:15.5px; color:#111827; }
.rf-val .num { font-size:20px; font-variant-numeric:tabular-nums; }
.rf-amt { display:inline-flex; align-items:baseline; gap:2mm; }
.rf-kind { position:relative; display:flex; align-items:center; justify-content:space-around; border:1.4px solid #6ab04c; border-radius:4mm; padding:5mm 4mm 3.5mm; margin:2mm 0 0; }
.rf-kind legend { position:absolute; top:-4.2mm; left:50%; transform:translateX(-50%); padding:1mm 9mm; border-radius:999px; color:#fff; font-weight:800; font-size:16px;
  background:linear-gradient(90deg,#36a03c,#6cc04a); }
.rf-kind .opt { display:inline-flex; align-items:center; gap:3mm; font-weight:800; font-size:16.5px; }
.rf-kind .sep { width:1px; align-self:stretch; background:#9cc77f; }
.rf-kind .box { display:inline-flex; align-items:center; justify-content:center; width:6.5mm; height:6.5mm; border:1.6px solid #123a83; border-radius:1.4mm;
  font-style:normal; font-size:16px; font-weight:900; color:#fff; }
.rf-kind .box.on { background:#123a83; }
.rf-received { border:1.4px solid #1e4fa3; border-radius:3.5mm; background:#e9f2fc; padding:3mm 4mm; font-weight:800; font-size:16px; }
.rf-received b { font-weight:700; }
.rf-sign { display:grid; grid-template-columns:1fr 1.25fr; gap:5mm; margin-top:1mm; }
.rf-date, .rf-sig { border:1.4px solid #1e4fa3; border-radius:3.5mm; padding:3.5mm 4mm; min-height:22mm; box-sizing:border-box; font-weight:800; font-size:15.5px; }
.rf-date { display:flex; align-items:center; gap:4mm; }
.rf-date .d { font-weight:700; font-variant-numeric:tabular-nums; letter-spacing:.5mm; }
.rf-sig { display:flex; flex-direction:column; justify-content:space-between; text-align:center; }
.rf-sig .line { display:block; border-bottom:1.4px solid #334155; margin:0 6mm 1mm; height:9mm; }
.rf-small { font-size:12px; color:#475569; text-align:center; margin:0; }
.rf-foot { margin-top:auto; text-align:center; }
.rf-foot .t { font-size:17px; font-weight:800; color:#123a83; margin-bottom:2mm; }
.rf-foot .i { display:flex; justify-content:center; gap:10mm; font-size:13px; font-weight:700; color:#123a83; }
.rf-foot .i span { display:inline-flex; flex-direction:column; align-items:center; gap:1mm; }
.rf-foot .i svg { width:22px; height:22px; border:1.6px solid #123a83; border-radius:999px; padding:3px; box-sizing:content-box; }
@media print {
  .no-print { display:none !important; }
  .rv-root { background:#fff !important; }
  .rv-pages { padding:0; zoom:1 !important; }
  .rf-page { box-shadow:none; margin:0; min-height:279mm; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
