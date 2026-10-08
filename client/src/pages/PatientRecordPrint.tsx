// **«طباعة السجلّ الكامل»** (طلبُ المالك ٢٠٢٦-١٠-٠٨، §4.cv) — `/patient-record/print?patient=`.
//
// «نعمل قابليةَ طباعة سجلّ الزيارات إن لزمنا، مع اسم المريض وعمره وبتره أو علّته ومعلوماته الشخصية، لأننا ربما يُطلب منّا مستقبلاً
// سجلٌّ كامل بما فعل وأتى وعالج» — و«المدفوعاتُ واجبٌ أن تظهر، فهذه الورقةُ حين يطلبها المريض أو تُعطى له ستكون مرجعَه لكلّ ما حدث
// معه في مجموعة مراكز الدكتور ياسر الساعدي بالتفصيل». فالورقةُ ثلاثةُ أقسام: بياناتُه، ثمّ أجهزتُه، ثمّ زياراتُه كلُّها من أوّل يوم
// وتحت كلٍّ منها ما دُفع يومها — والدفعةُ بلا زيارةٍ سطرُ «دفعة» (`patientRecordRows`). والمالُ بقاعدة الاستمارة (`recordPayments`).
//
// **وصفحاتٌ مرقّمة** (ملاحظةُ المالك: «في القوائم الطويلة جدّاً يجب أن تكون بأرقام ليعرف المريض»، §4.cw): الورقةُ تُقاس بعرض A4 ثابتاً
// مهما كانت الشاشة، ثمّ تُقطَّع زياراتُها على صفحات (`packRowsIntoPages`) — في أوّلها الترويسةُ والبيانات، وفي كلّ صفحةٍ تاليةٍ رأسٌ
// مختصر (الاسم ورقمُ الملف) ورأسُ الجدول، وفي أسفل كلّ صفحة «صفحة ٢ من ٥»، والزياراتُ مرقّمة. وما يُرى هو ما يُطبع وما يُصنع ملفّاً.
// والبياناتُ من البابين اللذين تقرؤهما صفحةُ المريض نفسُها (`/api/patients/:id` و`intake-sheets`) — شاشةٌ لا تحسب شيئاً يُعتمد.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { usePatient } from "@/hooks/use-patients";
import { usePrintAction } from "@/hooks/use-print-action";
import { useIntakeSheets } from "@/components/intake/DeviceSheetsBox";
import { injuryDateDisplay, intakeHeader } from "@shared/intake_sheet";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { SHEET_STATUS_LABELS, sheetMoneyLine, sheetVisitPaidLine } from "@shared/intake_sheet_view";
import { patientRecordRows, recordPayments, visitDevicesFromSheets, type RecordRow } from "@shared/visit_payments";
import { packRowsIntoPages } from "@shared/print_pages";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

const stamp = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const money = (n: number) => `${n.toLocaleString("en-US")} د.ع`;
/** هامشُ أمانٍ تحت الحساب (مم) — طابعةٌ أو سفاري بهامشٍ أكبر لا تدفع سطراً إلى ورقةٍ إضافية. */
const SAFETY_MM = 10;
/** المسافةُ بين كتل الصفحة (مم) — نفسُها في `.rp-page { gap }`. */
const GAP_MM = 3;

const blank = (v: unknown) => v === null || v === undefined || v === "";
const V = ({ children }: { children: ReactNode }) => (
  <td className={blank(children) ? "v muted" : "v"} dir="auto" style={{ unicodeBidi: "plaintext" }}>{blank(children) ? "—" : children}</td>
);

interface Plan { counts: number[] }

export default function PatientRecordPrint() {
  const session = useBranchSession() as any;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const patientId = Number(params.get("patient") ?? 0);
  const { data: patient, isLoading, error } = usePatient(patientId);
  const sheetsQ = useIntakeSheets(patientId, patientId > 0);
  const sheets = sheetsQ.data?.sheets ?? [];
  const loaded = Boolean(patient) && !sheetsQ.isLoading;
  const printedAt = useMemo(() => stamp(new Date()), [patient, sheetsQ.data]);

  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(patientId > 0 ? `/patients/${patientId}` : "/");
  };

  const record = useMemo(() => {
    if (!patient) return null;
    const p = patient as any;
    const deviceLabels = new Map(sheets.map((s) => [s.episodeId,
      `الجهاز #${s.sequenceNumber} — ${requestedItemLabel(s.requestedItem, s.serviceType, s.extraComponents)}`]));
    return patientRecordRows({
      visits: (p.visits ?? []).map((v: any) => ({
        id: v.id, date: v.visitDate ? String(v.visitDate) : null, details: v.details, notes: v.notes,
        treatmentType: v.treatmentType, deviceEpisodeId: v.deviceEpisodeId ?? null, caseId: v.caseId ?? null,
      })),
      payments: recordPayments(p.payments, sheetsQ.data?.canViewMoney)?.map((x: any) => ({
        id: x.id, amount: Number(x.amount ?? 0), date: x.date ? String(x.date) : null, visitId: x.visitId ?? null,
        deviceEpisodeId: x.deviceEpisodeId ?? null, caseId: x.caseId ?? null, notes: x.notes,
        description: x.displayDescription ?? null, treatmentType: x.paymentTreatmentType ?? null,
      })) ?? null,
      deviceLabels, visitDevices: visitDevicesFromSheets(sheets),
    });
  }, [patient, sheets, sheetsQ.data?.canViewMoney]);

  //  ══ **القياسُ ثمّ التقطيع** — ورقةٌ مخفيّة بكلّ السطور وبعرض A4 تُرسم مرّةً، فيُقاس كلُّ سطرٍ وما حوله، ثمّ تُقسَّم الصفحات. ══
  const [plan, setPlan] = useState<Plan | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  //  وبياناتٌ تحدّثت (عودةٌ إلى النافذة) ⟵ تُقاس الورقةُ من جديد، فلا تُقطَّع سطورٌ جديدة بخطّةٍ قديمة.
  useEffect(() => { setPlan(null); }, [record]);
  useLayoutEffect(() => {
    if (plan || !record || !loaded || !measureRef.current) return;
    let cancelled = false;
    const run = () => {
      const root = measureRef.current;
      if (cancelled || !root) return;
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:1px";
      document.body.appendChild(probe);
      const mm = probe.getBoundingClientRect().height / 100;
      probe.remove();
      const h = (sel: string) => root.querySelector(sel)?.getBoundingClientRect().height ?? 0;
      const rows = Array.from(root.querySelectorAll("tbody tr.rp-row")).map((el) => el.getBoundingClientRect().height);
      //  ما في الصفحة سوى السطور: الكتلةُ العليا، ورأسُ الجدول، والذيل، وثلاثُ فجوات (والفاصلُ المرن بينها)، وحدودُ الجدول.
      const inner = (297 - 18 - SAFETY_MM) * mm;
      const fixed = h("thead") + h(".rp-foot") + 3 * GAP_MM * mm + 4;
      const counts = packRowsIntoPages(rows, {
        first: inner - h(".rp-first") - fixed,
        rest: inner - h(".rp-cont") - fixed,
        tail: h("tfoot"),
      });
      setPlan({ counts });
    };
    (document as any).fonts?.ready ? (document as any).fonts.ready.then(run) : run();
    return () => { cancelled = true; };
  }, [plan, record, loaded]);

  //  **المعاينةُ على الهاتف تُصغَّر لتتّسع** — الورقةُ بعرض A4 دائماً (فلا يختلف التقطيعُ عن الطباعة)، ولا تنزلق الشاشةُ يميناً ويساراً.
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => {
      const pageW = (210 * 96) / 25.4;
      setZoom(Math.min(1, (window.innerWidth - 16) / pageW));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const p = patient as any;
  const printer = usePrintAction({
    ready: Boolean(plan),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".rp-pages .rp-page")),
    fileName: `${p?.patientCode ?? patientId}-record.pdf`,
    autoPrint: true,
  });

  const departments = p ? [p.isAmputee && "أطراف صناعية", p.isMedicalSupport && "مساند طبية", p.isPhysiotherapy && "علاج طبيعي"].filter(Boolean).join(" · ") : "";
  //  حالةُ العلاج الطبيعي من حقوله — لا `medicalCondition` (رمزُ القسم الداخليّ «amputee»/«physiotherapy» لا يُطبع للمريض).
  const has = (x: unknown): x is string => typeof x === "string" && x.trim() !== "";
  const condition = p ? [has(p.diseaseType) ? p.diseaseType : null, has(p.injuryType) ? `نوع الإصابة: ${p.injuryType}` : null,
    has(p.injuryArea) ? `منطقة الإصابة: ${p.injuryArea}` : null].filter(Boolean).join(" — ") : "";
  const support = p ? [p.supportType, p.injurySide && `الجهة: ${p.injurySide}`].filter(Boolean).join(" — ") : "";
  const referral = p ? [p.referralSource, p.referralSubSource].filter(Boolean).join(" — ") : "";
  const withMoney = record?.totalPaid !== null && record?.totalPaid !== undefined;
  const branchName = sheetsQ.data?.patient.branchName ?? null;
  const by = session?.displayName ? ` — بواسطة ${session.displayName}` : "";

  const firstBlock = p && (
    <div className="rp-first">
      <Letterhead branchName={branchName} />
      <div className="rp-fileline">
        <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
        <span>تاريخ التسجيل: <bdi dir="ltr">{p.createdAt ? formatDateIraq(p.createdAt) : "—"}</bdi></span>
      </div>
      <table className="rp-t" data-testid="record-personal">
        <colgroup><col style={{ width: "17%" }} /><col style={{ width: "33%" }} /><col style={{ width: "17%" }} /><col style={{ width: "33%" }} /></colgroup>
        <tbody>
          <tr><th className="band" colSpan={4}>البيانات الشخصية</th></tr>
          <tr><td className="k">الاسم</td><V>{p.name}</V><td className="k">العمر</td><V>{p.age}</V></tr>
          <tr><td className="k">رقم الهاتف</td><V><span dir="ltr">{p.phone}</span></V><td className="k">المحافظة</td><V>{p.governorate}</V></tr>
          <tr><td className="k">العنوان</td><td className="v" colSpan={3}>{p.address || "—"}</td></tr>
          <tr><td className="k">الوزن (كغم)</td><V>{p.weight}</V><td className="k">الطول (سم)</td><V>{p.height}</V></tr>
          <tr><td className="k">سبب الإصابة</td><V>{p.injuryCause}</V><td className="k">تاريخ الإصابة</td>
            <V>{p.injuryDate ? formatDateIraq(p.injuryDate) : injuryDateDisplay(null, p.injuryDateStatus)}</V></tr>
          <tr><td className="k">الأقسام</td><td className="v" colSpan={3} data-testid="record-v-departments">{departments || "—"}</td></tr>
          {p.isAmputee && <tr><td className="k">البتر</td><td className="v" colSpan={3}>{p.amputationSite || "—"}</td></tr>}
          {p.isMedicalSupport && <tr><td className="k">المسند</td><td className="v" colSpan={3}>{support || "—"}</td></tr>}
          {p.isPhysiotherapy && <tr><td className="k">الحالة المرضية</td><td className="v" colSpan={3} data-testid="record-v-condition">{condition || "—"}</td></tr>}
          <tr><td className="k">الجهة المحوِّلة</td><td className="v" colSpan={3}>{referral || "—"}</td></tr>
        </tbody>
      </table>
      {sheets.length > 0 && (
        <table className="rp-t" data-testid="record-devices">
          <tbody>
            <tr><th className="band">الأجهزة</th></tr>
            {sheets.map((s) => (
              <tr key={s.episodeId} data-testid={`record-device-${s.episodeId}`}>
                <td className="v">
                  <div className="rp-dev">
                    <b>الجهاز #{s.sequenceNumber} — {requestedItemLabel(s.requestedItem, s.serviceType, s.extraComponents)}</b>
                    <span className="rp-sub">
                      {SHEET_STATUS_LABELS[s.status] ?? s.status}{s.soldReady ? " · جاهز بلا أمر تصنيع" : ""}
                      {s.openedAt ? <> · طُلب في <bdi dir="ltr">{formatDateIraq(s.openedAt)}</bdi></> : null}
                    </span>
                  </div>
                  <div className="rp-sub" data-testid={`record-device-money-${s.episodeId}`}>{sheetMoneyLine(s)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const contBlock = p && (
    <div className="rp-cont">
      <span>السجلّ الكامل — <b>{p.name}</b></span>
      <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
    </div>
  );

  const visitsTable = (rows: { row: RecordRow; no: number }[], last: boolean) => (
    <table className="rp-t rp-visits" data-testid="record-rows">
      <colgroup><col style={{ width: "7%" }} /><col style={{ width: "17%" }} /><col style={{ width: "76%" }} /></colgroup>
      <thead>
        <tr><th className="band" colSpan={3}>سجلّ الزيارات{withMoney ? " والمدفوعات" : ""}</th></tr>
        <tr><th>#</th><th>التاريخ</th><th>ما حدث</th></tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={3} className="v muted center">لا زيارات مسجّلة</td></tr>}
        {rows.map(({ row: r, no }) => (
          <tr key={r.key} className={r.kind === "payment" ? "rp-row pay" : "rp-row"} data-testid={`record-row-${r.key}`}>
            <td className="no">{no}</td>
            <td className="date"><div dir="ltr">{r.date ? formatDateIraq(r.date) : "—"}</div>{r.date && <div className="rp-sub">{formatTimeIraq(r.date)}</div>}</td>
            <td className="v" dir="auto" style={{ unicodeBidi: "plaintext" }}>
              <div className="rp-what">{r.title}</div>
              {r.notes && <div className="rp-sub">{r.notes}</div>}
              {r.device && <div className="rp-sub">{r.device}</div>}
              {sheetVisitPaidLine({ paid: r.paid }) && (
                <div className={(r.paid ?? 0) < 0 ? "rp-paid refund" : "rp-paid"} data-testid={`record-paid-${r.key}`}>{sheetVisitPaidLine({ paid: r.paid })}</div>
              )}
            </td>
          </tr>
        ))}
      </tbody>
      {last && withMoney && (
        <tfoot>
          <tr><td colSpan={3} className="rp-total" data-testid="record-total-paid">مجموع ما دُفع: {money(record?.totalPaid ?? 0)}</td></tr>
        </tfoot>
      )}
    </table>
  );

  const numbered = (record?.rows ?? []).map((row, i) => ({ row, no: i + 1 }));
  let start = 0;

  return (
    <div dir="rtl" className="rp-root min-h-screen bg-slate-100">
      <style>{RP_CSS}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 bg-white border-b px-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }} data-testid="record-print-toolbar">
        <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-record-back">
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        {plan && plan.counts.length > 1 && <span className="text-xs text-slate-500" data-testid="record-page-count">{plan.counts.length} صفحات</span>}
        <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-record-print-now">
          {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
        </Button>
      </div>
      {(isLoading || (patient && sheetsQ.isLoading)) && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {!isLoading && (error || !patient) && (
        <p className="text-center text-sm text-red-700 py-20" data-testid="record-print-missing">تعذّر تحميل ملفّ المريض</p>
      )}
      {loaded && p && record && !plan && (
        <div className="rp-measure" aria-hidden="true" ref={measureRef}>
          <section className="rp-page">
            {firstBlock}
            {contBlock}
            {visitsTable(numbered, true)}
            <footer className="rp-foot"><span>طُبع في {printedAt}{by}</span><span>صفحة ١ من ١</span></footer>
          </section>
        </div>
      )}
      {loaded && p && record && plan && (
        <div className="rp-pages" data-print-zoom style={{ zoom }} data-testid="record-print-page">
          {plan.counts.map((n, i) => {
            const rows = numbered.slice(start, start + n);
            start += n;
            const last = i === plan.counts.length - 1;
            return (
              <Fragment key={i}>
                <section className="rp-page" data-testid={`record-page-${i + 1}`}>
                  {i === 0 ? firstBlock : contBlock}
                  {visitsTable(rows, last)}
                  <div className="rp-grow" />
                  <footer className="rp-foot" data-testid="record-print-footer">
                    <span>طُبع في <bdi dir="ltr">{printedAt}</bdi>{by}</span>
                    <span data-testid={`record-page-no-${i + 1}`}>صفحة {i + 1} من {plan.counts.length}</span>
                  </footer>
                </section>
              </Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** ترويسةُ الفرع — «بايونك» إلّا كربلاء «الوارث» (`intakeHeader`)، بمقاسٍ ثابت: الصفحةُ تُقاس بعرض A4 لا بعرض الشاشة. */
function Letterhead({ branchName }: { branchName: string | null }) {
  const h = intakeHeader(branchName);
  return (
    <div className="rp-head" data-brand={h.brand}>
      <div className="rp-center">
        <div className="n">{h.centerName}</div>
        {h.city && <div className="c">{h.city}</div>}
      </div>
      <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt={h.brand === "warith" ? "شعار الوارث" : "شعار بايونك"} className="rp-logo" />
      <div className="rp-title">السجلّ الكامل للمريض</div>
    </div>
  );
}

//  مقاساتٌ ثابتة بالمليمتر — لا أصنافَ تتبدّل بعرض الشاشة، فما يُقاس هو ما يُطبع.
const RP_CSS = `
@page { size: A4 portrait; margin: 9mm; }
.rp-root { color:#1f2937; }
.rp-pages { padding:12px 0 40px; }
.rp-page { width:210mm; height:297mm; box-sizing:border-box; padding:9mm; margin:0 auto 12px; background:#fff;
  box-shadow:0 1px 6px rgba(31,42,46,.18); display:flex; flex-direction:column; gap:${GAP_MM}mm; overflow:hidden; font-size:12.5px; line-height:1.45; }
.rp-measure { position:absolute; left:-10000px; top:0; visibility:hidden; pointer-events:none; }
.rp-measure .rp-page { height:auto; overflow:visible; }
.rp-first { display:flex; flex-direction:column; gap:2mm; }
.rp-head { display:grid; grid-template-columns:1fr auto; align-items:start; gap:4mm; }
.rp-center { border:2px solid #1e293b; border-radius:14px; padding:2.5mm 5mm; text-align:center; font-weight:700; color:#1e3a8a; justify-self:start; max-width:120mm; }
.rp-center .n { font-size:15px; } .rp-center .c { font-size:13px; margin-top:1mm; }
.rp-logo { height:20mm; width:20mm; object-fit:contain; }
.rp-title { grid-column:1 / -1; text-align:center; color:#dc2626; font-weight:700; font-size:19px; }
.rp-fileline, .rp-cont { display:flex; justify-content:space-between; gap:4mm; font-size:11px; color:#475569; }
.rp-cont { font-size:12px; color:#334155; border-bottom:2px solid #1e3a8a; padding-bottom:1.5mm; }
table.rp-t { width:100%; border-collapse:collapse; border:2px solid #334155; table-layout:fixed; }
.rp-t th, .rp-t td { border:1px solid #334155; padding:1mm 1.8mm; vertical-align:top; text-align:right; overflow-wrap:anywhere; }
.rp-t th.band { background:#9dc3e6; text-align:center; font-weight:700; font-size:13px; padding:1.2mm; }
.rp-t td.k { font-weight:600; background:#f8fafc; }
.rp-t td.v.muted { color:#94a3b8; }
.rp-t td.center { text-align:center; }
.rp-visits thead tr:last-child th { background:#f1f5f9; font-weight:600; text-align:center; }
.rp-visits td.no { text-align:center; color:#64748b; }
.rp-visits td.date { text-align:center; }
.rp-visits tr.pay td { background:#f8fafc; }
.rp-dev { display:flex; flex-wrap:wrap; justify-content:space-between; gap:0 3mm; }
.rp-what { font-weight:600; }
.rp-sub { font-size:11px; color:#475569; }
.rp-paid { font-size:11px; font-weight:700; color:#047857; }
.rp-paid.refund { color:#b91c1c; }
.rp-total { font-weight:700; border-top:2px solid #334155 !important; background:#f3f4f6; }
.rp-grow { flex:1; }
.rp-foot { display:flex; justify-content:space-between; font-size:10.5px; color:#64748b; border-top:1px solid #cbd5e1; padding-top:1.5mm; }
@media print {
  html, body, .rp-root { background:#fff !important; }
  .no-print, .rp-measure { display:none !important; }
  .rp-pages { zoom:1 !important; padding:0; }
  .rp-page { width:auto; height:auto; padding:0; margin:0; box-shadow:none; overflow:visible; break-after:page; }
  .rp-page:last-child { break-after:auto; }
  .rp-grow { display:none; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
