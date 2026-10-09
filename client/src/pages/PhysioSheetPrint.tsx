// **طباعةُ «استمارة مراجع — علاج طبيعي» مكتملةً** (§4.da — المرحلةُ الثالثة) — `/physio-sheet/print?patient=`.
//
// «استمارةٌ قابلةٌ للطباعة لا تضيع فيها أيُّ معلومة» — **وورقاتٌ مرقّمة** (التصميمُ المعتمَد): الأولى الاستمارةُ وأوّلُ المراجعات، والتاليةُ
// «تتمّة» بالاسم ورقم الملف، **والأخيرةُ التقييمُ الأوّليّ** بهيئة الورقتين ولغتهما. وفي أسفل كلّ صفحة «صفحة ٢ من ٤» ومتى طُبعت ومَن طبعها.
// والتقطيعُ نفسُه في «السجلّ الكامل» (§4.cw): الورقةُ تُقاس بعرض A4 ثابتاً مهما كانت الشاشة، ثمّ تُقطَّع سطورُ المراجعات (`packRowsIntoPages`).
// والبياناتُ من باب الخادم الواحد (`physio-sheet`) الذي تقرؤه «عرض الاستمارة» — فما يُطبع هو ما يُرى.
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { usePrintAction } from "@/hooks/use-print-action";
import { injuryDateDisplay, intakeHeader } from "@shared/intake_sheet";
import { PHYSIO_SHEET_NOTES_LABEL } from "@shared/exam_sheet";
import { sheetVisitPaidLine } from "@shared/intake_sheet_view";
import { packRowsIntoPages } from "@shared/print_pages";
import {
  PT_AGGRAVATING, PT_ALLERGIES, PT_ASHWORTH_LEGEND, PT_ASHWORTH_REGIONS, PT_FORM_CODE, PT_FORM_VERSION, PT_FUNCTIONAL, PT_INVESTIGATIONS,
  PT_LABELS, PT_LOCATIONS, PT_MMT_GROUPS, PT_MMT_LEGEND, PT_PLAN_ITEMS, PT_RELIEVING, PT_SENSATION, PT_SYMPTOMS, PT_TRENDS, PT_YES_NO,
  type Opt, type PhysioInitialAssessment,
} from "@shared/physio_initial_assessment";
import {
  physioMoneyLine, physioPlanLine, physioProgressLine, physioTreatmentsLine, type PhysioSheetExam, type PhysioSheetResponse,
  type PhysioSheetVisit,
} from "@shared/physio_sheet_view";
import { formatDateIraq, formatTimeIraq } from "@/lib/utils";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

const stamp = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
const SAFETY_MM = 10;
const GAP_MM = 3;
const TITLE = "استمارة مراجع — علاج طبيعي";

const blank = (v: unknown) => v === null || v === undefined || v === "";
const V = ({ children, span }: { children: ReactNode; span?: number }) => (
  <td className={blank(children) ? "v muted" : "v"} colSpan={span} dir="auto" style={{ unicodeBidi: "plaintext" }}>{blank(children) ? "—" : children}</td>
);

interface Plan { counts: number[] }

export default function PhysioSheetPrint() {
  const session = useBranchSession() as any;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const patientId = Number(params.get("patient") ?? 0);
  const { data, isLoading, error } = useQuery<PhysioSheetResponse>({ queryKey: [`/api/patients/${patientId}/physio-sheet`], enabled: patientId > 0 });
  const printedAt = useMemo(() => stamp(new Date()), [data]);
  const by = session?.displayName ? ` — بواسطة ${session.displayName}` : "";

  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(patientId > 0 ? `/patients/${patientId}` : "/");
  };

  const assessed: PhysioSheetExam | null = data?.exams.find((e) => e.assessment) ?? null;
  const rows = useMemo(() => (data?.visits ?? []).map((v, i) => ({ v, no: i + 1 })), [data]);

  //  ══ **القياسُ ثمّ التقطيع** — كـ«السجلّ الكامل» حرفاً. ══
  const [plan, setPlan] = useState<Plan | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setPlan(null); }, [data]);
  useLayoutEffect(() => {
    if (plan || !data || !measureRef.current) return;
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
      const heights = Array.from(root.querySelectorAll("tbody tr.rp-row")).map((el) => el.getBoundingClientRect().height);
      const inner = (297 - 18 - SAFETY_MM) * mm;
      const fixed = h(".rp-visits thead") + h(".rp-foot") + 3 * GAP_MM * mm + 4;
      const first = inner - h(".rp-first") - fixed;
      const rest = inner - h(".rp-cont") - fixed;
      //  **استمارةٌ تملأ صفحتَها** (معايناتٌ عدّة بملاحظاتٍ طويلة) — المراجعاتُ تبدأ في الصفحة الثانية بدل أن يُقصّ سطرٌ منها.
      const counts = heights.length > 0 && first < Math.min(...heights)
        ? [0, ...packRowsIntoPages(heights, { first: rest, rest, tail: 0 })]
        : packRowsIntoPages(heights, { first, rest, tail: 0 });
      setPlan({ counts });
    };
    (document as any).fonts?.ready ? (document as any).fonts.ready.then(run) : run();
    return () => { cancelled = true; };
  }, [plan, data]);

  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 16) / ((210 * 96) / 25.4)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const printer = usePrintAction({
    ready: Boolean(plan),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>(".rp-pages .rp-page")),
    fileName: `${data?.patient.patientCode ?? patientId}-physio-sheet.pdf`,
    autoPrint: true,
  });

  const p = data?.patient;
  const referral = p ? [p.referralSource, p.referralSubSource, p.referralNotes].filter(Boolean).join(" — ") : "";
  const injuries = p ? p.injuries.map((i) => [i.type, i.area, i.side].filter(Boolean).join(" — ")).filter(Boolean).join(" · ") : "";

  const firstBlock = data && p && (
    <div className="rp-first">
      <Letterhead branchName={p.branchName ?? null} title={TITLE} />
      <div className="rp-fileline">
        <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
        <span>تاريخ المراجعة: <bdi dir="ltr">{p.registeredAt ? formatDateIraq(p.registeredAt) : "—"}</bdi></span>
      </div>
      <table className="rp-t" data-testid="psp-reception">
        <colgroup><col style={{ width: "17%" }} /><col style={{ width: "33%" }} /><col style={{ width: "17%" }} /><col style={{ width: "33%" }} /></colgroup>
        <tbody>
          <tr><td className="k">اسم المراجع</td><V>{p.name}</V><td className="k">العمر</td><V>{p.age}</V></tr>
          <tr><td className="k">رقم الهاتف</td><V><span dir="ltr">{p.phone}</span></V><td className="k">المحافظة</td><V>{p.governorate}</V></tr>
          <tr><td className="k">العنوان التفصيلي</td><V span={3}>{p.address}</V></tr>
          <tr><td className="k">الجهة المحوِّل منها</td><V span={3}>{referral}</V></tr>
          <tr><td className="k">الوزن (كغم)</td><V>{p.weight}</V><td className="k">الطول (سم)</td><V>{p.height}</V></tr>
          <tr><td className="k">سبب الإصابة</td><V>{p.injuryCause}</V><td className="k">تاريخ الإصابة</td>
            <V>{p.injuryDate ? formatDateIraq(p.injuryDate) : injuryDateDisplay(null, p.injuryDateStatus)}</V></tr>
          <tr><td className="k">سبق التعامل</td><V>{p.hadPriorCenterHistory === true ? "نعم" : p.hadPriorCenterHistory === false ? "لا" : null}</V>
            <td className="k">الإصابات</td><V>{injuries}</V></tr>
          <tr><td className="k">سبب المراجعة</td><V span={3}><span data-testid="psp-complaint">{p.presentingComplaint}</span></V></tr>
          {p.generalNotes && <tr><td className="k">ملاحظات</td><V span={3}>{p.generalNotes}</V></tr>}
        </tbody>
      </table>
      <table className="rp-t" data-testid="psp-exams">
        <colgroup><col style={{ width: "17%" }} /><col style={{ width: "83%" }} /></colgroup>
        <tbody>
          <tr><th className="band" colSpan={2}>المعاينة — الأخصائيّ أو الطبيب</th></tr>
          {data.exams.length === 0 && <tr><td className="v muted center" colSpan={2}>لم تُوقَّع معاينةُ العلاج الطبيعي بعد</td></tr>}
          {data.exams.map((e) => (
            <Fragment key={e.id}>
              <tr className="rp-exam-head"><td className="k">المعاينة</td>
                <td className="v"><b>{e.doctorName}</b>{e.signedAt && <> — <bdi dir="ltr">{formatDateIraq(e.signedAt)} {formatTimeIraq(e.signedAt)}</bdi></>}
                  {e.assessmentSummary && <div className="rp-sub">التقييم الأوّلي: {e.assessmentSummary}</div>}</td></tr>
              <tr><td className="k">التشخيص</td><V>{e.diagnosis}</V></tr>
              <tr><td className="k">العلاج الموصوف</td><V>{physioTreatmentsLine(e.treatments)}</V></tr>
              {e.notes && <tr><td className="k">{PHYSIO_SHEET_NOTES_LABEL}</td><td className="v pre" dir="auto">{e.notes}</td></tr>}
            </Fragment>
          ))}
        </tbody>
      </table>
      <table className="rp-t" data-testid="psp-records">
        <colgroup><col style={{ width: "17%" }} /><col style={{ width: "83%" }} /></colgroup>
        <tbody>
          <tr><th className="band" colSpan={2}>الخطة والتقدّم والمبلغ والجلسات</th></tr>
          <tr><td className="k">الخطة العلاجية</td>
            {!data.canViewPlan ? <td className="v muted">يطّلع عليها فريقُ العلاج الطبيعي</td>
              : data.plan ? <td className="v">{physioPlanLine(data.plan).main}<div className="rp-sub">{physioPlanLine(data.plan).sub}</div></td>
                : <V>{null}</V>}</tr>
          {data.canViewPlan && data.progress && <tr><td className="k">التقدّم</td><V>{physioProgressLine(data.progress)}</V></tr>}
          <tr><td className="k">المبلغ الكلي</td>
            {!data.money ? <td className="v muted">يطّلع عليه الاستعلاماتُ ومَن يرى الدفعات</td>
              : <td className="v" data-testid="psp-money">{physioMoneyLine(data.money).main}
                  {physioMoneyLine(data.money).extra.map((x) => <div key={x} className="rp-sub">{x}</div>)}</td>}</tr>
          <tr><td className="k">الجلسات</td>
            <td className="v">{data.sessions.length === 0 ? "—" : data.sessions.map((s) => (
              <div key={s.type}>{s.type}: المشتراة {s.bought} · المنفّذة {s.done} · <b>المتبقّية {s.remaining}</b></div>
            ))}</td></tr>
        </tbody>
      </table>
    </div>
  );

  const contBlock = p && (
    <div className="rp-cont">
      <span>{TITLE} (تتمّة) — <b>{p.name}</b></span>
      <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
    </div>
  );

  const visitRow = ({ v, no }: { v: PhysioSheetVisit; no: number }) => (
    <tr key={v.id} className={v.kind === "payment" ? "rp-row pay" : "rp-row"} data-testid={`psp-row-${v.id}`}>
      <td className="no">{no}</td>
      <td className="date"><div dir="ltr">{v.date ? formatDateIraq(v.date) : "—"}</div>{v.date && <div className="rp-sub">{formatTimeIraq(v.date)}</div>}</td>
      <td className="v" dir="auto" style={{ unicodeBidi: "plaintext" }}>
        <div className="rp-what">{[v.type, v.details].filter(Boolean).join(" — ") || v.notes || "—"}</div>
        {(v.type || v.details) && v.notes && <div className="rp-sub">{v.notes}</div>}
        {sheetVisitPaidLine(v) && <div className={(v.paid ?? 0) < 0 ? "rp-paid refund" : "rp-paid"}>{sheetVisitPaidLine(v)}</div>}
      </td>
      <td className="v by">{v.recordedBy ?? ""}</td>
    </tr>
  );
  const visitsTable = (slice: typeof rows) => (
    <table className="rp-t rp-visits" data-testid="psp-visits">
      <colgroup><col style={{ width: "6%" }} /><col style={{ width: "15%" }} /><col style={{ width: "61%" }} /><col style={{ width: "18%" }} /></colgroup>
      <thead>
        <tr><th className="band" colSpan={4}>المراجعات والجلسات{data?.money ? " والمدفوعات" : ""}</th></tr>
        <tr><th>#</th><th>التاريخ</th><th>الجلسة والتفاصيل</th><th>سجّلها</th></tr>
      </thead>
      <tbody>
        {rows.length === 0 && <tr><td colSpan={4} className="v muted center">لا مراجعات مسجّلة</td></tr>}
        {slice.map(visitRow)}
      </tbody>
    </table>
  );

  const assessmentPage = assessed?.assessment && p && (
    <>
      <div className="rp-cont">
        <span>{TITLE} — <b>{p.name}</b></span>
        <span>رقم الملف: <b dir="ltr">{p.patientCode ?? "—"}</b></span>
      </div>
      <AssessmentPrint a={assessed.assessment} examiner={assessed.doctorName} signedAt={assessed.signedAt} />
    </>
  );

  const visitPages = plan?.counts ?? [];
  const total = visitPages.length + (assessmentPage ? 1 : 0);
  let start = 0;

  return (
    <div dir="rtl" className="rp-root min-h-screen bg-slate-100">
      <style>{RP_CSS}</style>
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 bg-white border-b px-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }} data-testid="psp-toolbar">
        <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-psp-back">
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        {plan && total > 1 && <span className="text-xs text-slate-500" data-testid="psp-page-count">{total} صفحات</span>}
        <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-psp-print-now">
          {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
        </Button>
      </div>
      {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {!isLoading && (error || !data) && (
        <p className="text-center text-sm text-red-700 py-20" data-testid="psp-missing">تعذّر تحميل الاستمارة</p>
      )}
      {data && !plan && (
        <div className="rp-measure" aria-hidden="true" ref={measureRef}>
          <section className="rp-page">
            {firstBlock}
            {contBlock}
            {visitsTable(rows)}
            <footer className="rp-foot"><span>طُبع في {printedAt}{by}</span><span>صفحة ١ من ١</span></footer>
          </section>
        </div>
      )}
      {data && plan && (
        <div className="rp-pages" data-print-zoom style={{ zoom }} data-testid="psp-pages">
          {visitPages.map((n, i) => {
            const slice = rows.slice(start, start + n);
            start += n;
            return (
              <section key={i} className="rp-page" data-testid={`psp-page-${i + 1}`}>
                {i === 0 ? firstBlock : contBlock}
                {(n > 0 || i > 0 || rows.length === 0) && visitsTable(slice)}
                <div className="rp-grow" />
                <footer className="rp-foot">
                  <span>طُبع في <bdi dir="ltr">{printedAt}</bdi>{by}</span>
                  <span data-testid={`psp-page-no-${i + 1}`}>صفحة {i + 1} من {total}</span>
                </footer>
              </section>
            );
          })}
          {assessmentPage && (
            <section className="rp-page" data-testid={`psp-page-${total}`}>
              {assessmentPage}
              <div className="rp-grow" />
              <footer className="rp-foot">
                <span>طُبع في <bdi dir="ltr">{printedAt}</bdi>{by}</span>
                <span data-testid={`psp-page-no-${total}`}>صفحة {total} من {total}</span>
              </footer>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function Letterhead({ branchName, title }: { branchName: string | null; title: string }) {
  const h = intakeHeader(branchName);
  return (
    <div className="rp-head" data-brand={h.brand}>
      <div className="rp-center">
        <div className="n">{h.centerName}</div>
        {h.city && <div className="c">{h.city}</div>}
      </div>
      <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt={h.brand === "warith" ? "شعار الوارث" : "شعار بايونك"} className="rp-logo" />
      <div className="rp-title">{title}</div>
    </div>
  );
}

/** **التقييمُ الأوّليّ مطبوعاً بهيئة الورقتين ولغتهما** — مربّعاتٌ مؤشَّرة ودرجات، بمقاساتٍ ثابتة تتّسع في صفحة A4. */
function AssessmentPrint({ a, examiner, signedAt }: { a: PhysioInitialAssessment; examiner: string; signedAt: string | null }) {
  const L = (k: keyof typeof PT_LABELS) => PT_LABELS[k].en;
  const ticks = (list: readonly Opt[], on: (c: string) => boolean) => (
    <span className="pa-ticks">{list.map((o) => <span key={o.code} className={on(o.code) ? "pa-tick on" : "pa-tick"}>{on(o.code) ? "☑" : "☐"} {o.en}</span>)}</span>
  );
  const many = (list: readonly Opt[], vals: string[]) => ticks(list, (c) => vals.includes(c));
  const one = (list: readonly Opt[], val: string | null) => ticks(list, (c) => val === c);
  const f = (v: unknown) => (blank(v) ? <span className="pa-blank">—</span> : <b>{String(v)}</b>);
  const onset = a.onsetAtSigning === "congenital" ? "Since birth" : a.onsetAtSigning === "unknown" ? "Unknown" : a.onsetAtSigning;
  return (
    <div className="pa" dir="ltr" data-testid="psp-assessment">
      <div className="pa-title">{L("formTitle")} <span className="pa-sub">{PT_FORM_CODE} · v{PT_FORM_VERSION} — {examiner}{signedAt ? ` — ${formatDateIraq(signedAt)} ${formatTimeIraq(signedAt)}` : ""}</span></div>
      <table className="pa-t"><tbody>
        <tr><th colSpan={2}>{L("sectionA")} <span className="pa-tick">{a.sectionANa ? "☑" : "☐"} {L("na")}</span></th></tr>
        <tr><td className="k">{L("investigations")}</td><td>{many(PT_INVESTIGATIONS, a.investigations)}</td></tr>
        <tr><td className="k">{L("trend")}</td><td>{one(PT_TRENDS, a.trend)}</td></tr>
        <tr><th colSpan={2}>{L("history")}</th></tr>
        <tr><td className="k">{L("onset")}</td><td>{f(onset)} &nbsp; {L("surgery")} {f(a.surgeryDate)}</td></tr>
        <tr><td className="k">{L("pastHistory")}</td><td>{f(a.pastHistory)}</td></tr>
        <tr><td className="k">{L("allergy")}</td><td>{many(PT_ALLERGIES, a.allergy)} {a.allergySpecify && <>{L("specify")} {f(a.allergySpecify)}</>}</td></tr>
        <tr><td className="k">{L("previousTherapy")}</td><td>{one(PT_YES_NO, a.previousTherapy)} &nbsp; {L("previousVisits")} {f(a.previousVisits)}</td></tr>
        <tr><th colSpan={2}>{L("pain")}</th></tr>
        <tr><td className="k">{L("symptoms")}</td><td>{one(PT_SYMPTOMS, a.symptoms)} &nbsp; {L("painScale")}: {L("atBest")} {f(a.painBest)} &nbsp; {L("atWorst")} {f(a.painWorst)}</td></tr>
        <tr><td className="k">{L("location")}</td><td>{many(PT_LOCATIONS, a.location)} {a.locationOther && <>{L("other")} {f(a.locationOther)}</>}</td></tr>
        <tr><td className="k">{L("aggravating")}</td><td>{many(PT_AGGRAVATING, a.aggravating)}</td></tr>
        <tr><td className="k">{L("relieving")}</td><td>{many(PT_RELIEVING, a.relieving)} {a.relievingOther && <>{L("other")} {f(a.relievingOther)}</>}</td></tr>
        <tr><th colSpan={2}>{L("sensation")}</th></tr>
        <tr><td className="k">{L("overallStatus")}</td><td>{one(PT_SENSATION, a.sensation)} {a.sensationRegions && <>— {f(a.sensationRegions)}</>}</td></tr>
      </tbody></table>
      <div className="pa-two">
        <table className="pa-t"><tbody>
          <tr><th>{L("mmt")}</th><th className="c">R</th><th className="c">L</th></tr>
          {PT_MMT_GROUPS.map((g) => <tr key={g.code}><td>{g.en}</td><td className="c">{f(a.mmt[g.code]?.r)}</td><td className="c">{f(a.mmt[g.code]?.l)}</td></tr>)}
          <tr><td colSpan={3} className="pa-legend">{PT_MMT_LEGEND.en}</td></tr>
        </tbody></table>
        <table className="pa-t"><tbody>
          <tr><th>{L("spasticity")}</th><th className="c">R</th><th className="c">L</th></tr>
          {PT_ASHWORTH_REGIONS.map((g) => <tr key={g.code}><td>{g.en}</td><td className="c">{f(a.ashworth[g.code]?.r)}</td><td className="c">{f(a.ashworth[g.code]?.l)}</td></tr>)}
          <tr><td colSpan={3} className="pa-legend">{PT_ASHWORTH_LEGEND.en}</td></tr>
        </tbody></table>
      </div>
      <table className="pa-t"><tbody>
        <tr><th>{L("functional")} — {L("activity")}</th><th>{L("assistance")}</th><th>{L("equipment")}</th></tr>
        {PT_FUNCTIONAL.map((r) => <tr key={r.code}><td>{r.en}</td><td>{f(a.functional[r.code]?.assist)}</td><td>{f(a.functional[r.code]?.notes)}</td></tr>)}
      </tbody></table>
      <table className="pa-t"><tbody>
        <tr><th>{L("plan")}</th></tr>
        <tr><td>{many(PT_PLAN_ITEMS, a.plan)}</td></tr>
      </tbody></table>
    </div>
  );
}

const RP_CSS = `
@page { size: A4 portrait; margin: 9mm; }
.rp-root { color:#1f2937; }
.rp-pages { padding:12px 0 40px; }
.rp-page { width:210mm; height:297mm; box-sizing:border-box; padding:9mm; margin:0 auto 12px; background:#fff;
  box-shadow:0 1px 6px rgba(31,42,46,.18); display:flex; flex-direction:column; gap:${GAP_MM}mm; overflow:hidden; font-size:12px; line-height:1.4; }
.rp-measure { position:absolute; left:-10000px; top:0; visibility:hidden; pointer-events:none; }
.rp-measure .rp-page { height:auto; overflow:visible; }
.rp-first { display:flex; flex-direction:column; gap:2mm; }
.rp-head { display:grid; grid-template-columns:1fr auto; align-items:start; gap:4mm; }
.rp-center { border:2px solid #1e293b; border-radius:14px; padding:2.5mm 5mm; text-align:center; font-weight:700; color:#1e3a8a; justify-self:start; max-width:120mm; }
.rp-center .n { font-size:15px; } .rp-center .c { font-size:13px; margin-top:1mm; }
.rp-logo { height:18mm; width:18mm; object-fit:contain; }
.rp-title { grid-column:1 / -1; text-align:center; color:#dc2626; font-weight:700; font-size:18px; }
.rp-fileline, .rp-cont { display:flex; justify-content:space-between; gap:4mm; font-size:11px; color:#475569; }
.rp-cont { font-size:12px; color:#334155; border-bottom:2px solid #1e3a8a; padding-bottom:1.5mm; }
table.rp-t { width:100%; border-collapse:collapse; border:2px solid #334155; table-layout:fixed; }
.rp-t th, .rp-t td { border:1px solid #334155; padding:0.8mm 1.8mm; vertical-align:top; text-align:right; overflow-wrap:anywhere; }
.rp-t th.band { background:#9dc3e6; text-align:center; font-weight:700; font-size:12.5px; padding:1mm; }
.rp-t td.k { font-weight:600; background:#f8fafc; }
.rp-t td.v.muted { color:#94a3b8; }
.rp-t td.center { text-align:center; }
.rp-t td.pre { white-space:pre-wrap; }
.rp-t tr.rp-exam-head td { border-top:2px solid #334155; }
.rp-visits thead tr:last-child th { background:#f1f5f9; font-weight:600; text-align:center; }
.rp-visits td.no { text-align:center; color:#64748b; }
.rp-visits td.date { text-align:center; }
.rp-visits td.by { font-size:11px; color:#475569; }
.rp-visits tr.pay td { background:#f8fafc; }
.rp-what { font-weight:600; }
.rp-sub { font-size:10.5px; color:#475569; }
.rp-paid { font-size:11px; font-weight:700; color:#047857; }
.rp-paid.refund { color:#b91c1c; }
.rp-grow { flex:1; }
.rp-foot { display:flex; justify-content:space-between; font-size:10.5px; color:#64748b; border-top:1px solid #cbd5e1; padding-top:1.5mm; }
.pa { display:flex; flex-direction:column; gap:2mm; font-size:11px; }
.pa-title { font-weight:700; font-size:14px; color:#1e3a8a; }
.pa-sub { font-weight:400; font-size:10.5px; color:#475569; }
table.pa-t { width:100%; border-collapse:collapse; border:1.5px solid #334155; }
.pa-t th, .pa-t td { border:1px solid #64748b; padding:0.7mm 1.5mm; text-align:left; vertical-align:top; }
.pa-t th { background:#e2e8f0; font-weight:700; }
.pa-t td.k { width:34%; font-weight:600; background:#f8fafc; }
.pa-t .c { text-align:center; width:10mm; }
.pa-two { display:grid; grid-template-columns:1fr 1fr; gap:2mm; }
.pa-ticks { display:inline-flex; flex-wrap:wrap; gap:0.5mm 3mm; }
.pa-tick { color:#64748b; white-space:nowrap; }
.pa-tick.on { color:#111827; font-weight:700; }
.pa-blank { color:#94a3b8; }
.pa-legend { font-size:9.5px; color:#475569; }
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
