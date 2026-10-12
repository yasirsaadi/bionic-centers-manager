// **ورقةُ تمارين البيت** (§4.ds — «الطلب الثاني»، الشقُّ الثاني) — `/physio-home-sheet/print?plan=`.
//
// قرارُ المالك (§4.cx): «طباعةٌ وإرسالٌ عبر تلغرام مع اسم الفرع والشعار». الورقةُ تمارينُ مرحلةٍ من خطّة المريض — **مرحلةُ آخر جلسةٍ افتراضاً**
// وما يصلح للبيت منها (`homeSheetDefaultPhase` · `homeSheetDefaultExercises`) — بصورها وجرعتها وخطواتها وما يُنتبه له ومتى يتوقّف، تحت
// ترويسة الفرع وشعاره (`intakeHeader`). والمعالجُ يغيّر المرحلةَ ويضيف أو يحذف تمريناً قبل الطباعة. **و«إرسال عبر تلغرام» يرسل الصفحاتِ
// المعروضة نفسَها ملفَّ PDF** (`elementsToPdf`) — فما يصل المريضَ هو ما يُطبع حرفاً. والتقطيعُ على صفحات A4 مرقّمة كبقيّة الأوراق (`packRowsIntoPages`).
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ListChecks, Loader2, Printer, Send } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { useToast } from "@/hooks/use-toast";
import { usePrintAction } from "@/hooks/use-print-action";
import { elementsToPdf, waitForImagesAndFonts } from "@/lib/print_pdf";
import { apiRequest } from "@/lib/queryClient";
import { intakeHeader } from "@shared/intake_sheet";
import { arDigits, doseLine, mergeDose, sessionRangeLabel } from "@shared/physio_exercises";
import { HOME_SHEET_NOT_STARTED, homeSheetDefaultExercises, homeSheetDefaultPhase, stepLines } from "@shared/physio_home_sheet";
import { CENTER_CONTACTS } from "@shared/patient_card";
import { packRowsIntoPages } from "@shared/print_pages";
import type { Phase, PhaseExercise } from "@/components/physio/ProtocolPhases";
import bionicLogo from "@/assets/intake/bionic.jpg";
import warithLogo from "@/assets/intake/warith.jpg";

const TITLE = "برنامج التمارين المنزلية";
const SAFETY_MM = 10;
const GAP_MM = 3;
const stamp = (d: Date) => d.toLocaleDateString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric" });

interface HomePlan {
  id: number; patientId: number; status: string; branchName: string | null; titleAr: string;
  patient: { id: number; name: string; code: string | null } | null;
  phases?: Phase[];
  rotation?: { sessionsSoFar: number };
  homeSheet?: { allowed: boolean; botEnabled: boolean; telegramRecipients: number; canSend: boolean };
}

const errText = (raw: string): string => {
  const s = raw.replace(/^\d+:\s*/, "");
  try { return JSON.parse(s)?.error ?? s; } catch { return s; }
};

/** أرقامُ الفرع للتواصل — من نصّ المالك في بطاقة المريض (§4.bv)؛ والفرعُ الذي ليس فيه لا سطرَ له. */
function branchPhones(branchName: string | null): string[] {
  const n = String(branchName ?? "").trim();
  if (!n) return [];
  //  «بغداد» ⟵ «بغداد بايونك»، و«ذي قار» ⟵ «ذي قار بايونك»، و«كربلاء الوارث» كما هو.
  const hit = CENTER_CONTACTS.find((c) => c.branch.includes(n) || n.includes(c.branch));
  return hit?.phones ?? [];
}

export default function PhysioHomeSheetPrint() {
  const session = useBranchSession() as any;
  const { toast } = useToast();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const planId = Number(params.get("plan") ?? 0);
  const { data, isLoading, error } = useQuery<HomePlan>({
    queryKey: [`/api/physio/plans/${planId}`],
    queryFn: async () => (await apiRequest("GET", `/api/physio/plans/${planId}`)).json(),
    enabled: planId > 0, retry: false,
  });
  const phases = useMemo(() => [...(data?.phases ?? [])].sort((a, b) => a.position - b.position), [data]);

  //  ══ المرحلةُ وتمارينُها في الورقة — الافتراضُ مرحلةُ آخر جلسة وما يصلح للبيت، والمعالجُ يغيّرهما. ══
  const [phasePos, setPhasePos] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[] | null>(null);
  const [withEducation, setWithEducation] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  useEffect(() => {
    if (!data || phasePos !== null || phases.length === 0) return;
    setPhasePos(homeSheetDefaultPhase(phases, data.rotation?.sessionsSoFar ?? 0));
  }, [data, phases, phasePos]);
  //  **الورقةُ من خطّةٍ بدأ علاجُها** (ملاحظةُ المراجعة على #623): الرابطُ المفتوح مباشرةً على مسوّدةٍ لا يُظهر ورقةً تُطبع — كالخادم في الإرسال.
  const allowed = data?.homeSheet?.allowed === true;
  const phase: Phase | null = allowed ? phases.find((p) => p.position === phasePos) ?? null : null;
  useEffect(() => { if (phase) setPicked(homeSheetDefaultExercises(phase.exercises)); }, [phase?.id]);
  const lines: PhaseExercise[] = useMemo(
    () => (phase && picked ? phase.exercises.filter((e) => picked.includes(e.exerciseId)) : []),
    [phase, picked],
  );
  const toggle = (id: number) => setPicked((cur) => {
    const set = new Set(cur ?? []);
    if (set.has(id)) set.delete(id); else set.add(id);
    //  بترتيب المرحلة لا بترتيب الضغط.
    return (phase?.exercises ?? []).map((e) => e.exerciseId).filter((x) => set.has(x));
  });

  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(planId > 0 ? `/physio/plans/${planId}` : "/");
  };

  //  ══ **القياسُ ثمّ التقطيع** — كـ«السجلّ الكامل» و«استمارة العلاج الطبيعي». ══
  const [counts, setCounts] = useState<number[] | null>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const layoutKey = `${phasePos}|${(picked ?? []).join(",")}|${withEducation}`;
  useEffect(() => { setCounts(null); }, [data, layoutKey]);
  useLayoutEffect(() => {
    if (counts || !data || !phase || !picked || !measureRef.current) return;
    let cancelled = false;
    const run = async () => {
      await waitForImagesAndFonts();
      const root = measureRef.current;
      if (cancelled || !root) return;
      const probe = document.createElement("div");
      probe.style.cssText = "position:absolute;visibility:hidden;height:100mm;width:1px";
      document.body.appendChild(probe);
      const mm = probe.getBoundingClientRect().height / 100;
      probe.remove();
      const h = (sel: string) => root.querySelector(sel)?.getBoundingClientRect().height ?? 0;
      const heights = Array.from(root.querySelectorAll(".hs-ex")).map((el) => el.getBoundingClientRect().height + GAP_MM * mm);
      const inner = (297 - 18 - SAFETY_MM) * mm;
      const fixed = h(".hs-foot") + 2 * GAP_MM * mm + 4;
      const first = inner - h(".hs-first") - fixed;
      const rest = inner - h(".hs-cont") - fixed;
      if (!cancelled) setCounts(packRowsIntoPages(heights, { first: Math.max(first, 0), rest, tail: 0 }));
    };
    void run();
    return () => { cancelled = true; };
  }, [counts, data, phase, picked, layoutKey]);

  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => setZoom(Math.min(1, (window.innerWidth - 16) / ((210 * 96) / 25.4)));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  const collect = () => Array.from(document.querySelectorAll<HTMLElement>(".hs-pages .hs-page"));
  const printer = usePrintAction({
    ready: Boolean(counts) && lines.length > 0,
    collect,
    fileName: `${data?.patient?.code ?? planId}-home-exercises.pdf`,
  });

  //  ══ **إرسالٌ عبر تلغرام** — الصفحاتُ المعروضة نفسُها ملفَّ PDF، والخادمُ يفحص المرحلةَ وتمارينَها ويكتب نصَّ الرسالة. ══
  const [sending, setSending] = useState(false);
  const hs = data?.homeSheet;
  const sendBlocker = !hs?.canSend ? null
    : !hs.botEnabled ? "بوتُ تلغرام المرضى غيرُ مُعدّ"
      : hs.telegramRecipients === 0 ? "المريضُ غيرُ مربوطٍ بتلغرام — اربطه من ملفّه"
        : null;
  const sendTelegram = async () => {
    if (!phase || !counts || lines.length === 0) return;
    setSending(true);
    try {
      const blob = await elementsToPdf(collect());
      const form = new FormData();
      form.append("phasePosition", String(phase.position));
      form.append("exerciseIds", lines.map((l) => l.exerciseId).join(","));
      form.append("file", new File([blob], `home-exercises-${planId}.pdf`, { type: "application/pdf" }));
      const res = await fetch(`/api/physio/plans/${planId}/home-sheet/telegram`, { method: "POST", body: form, credentials: "include" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? errText(`${res.status}`));
      toast({ title: "أُرسلت الورقة إلى تلغرام المريض", description: body.recipients > 1 ? `وصلت ${arDigits(body.sent)} من ${arDigits(body.recipients)} حسابات` : undefined });
    } catch (e: any) {
      toast({ title: "تعذّر الإرسال", description: String(e?.message ?? e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const h = intakeHeader(data?.branchName ?? null);
  const phones = branchPhones(data?.branchName ?? null);
  const today = useMemo(() => stamp(new Date()), []);
  const by = session?.displayName ? String(session.displayName) : null;
  const range = phase ? sessionRangeLabel(phase, "ar") ?? "" : "";
  const education = phase?.education ? String(phase.education).trim() : "";

  const firstBlock = data && phase && (
    <div className="hs-first">
      <div className="hs-head" data-brand={h.brand}>
        <div className="hs-center"><div className="n">{h.centerName}</div>{h.city && <div className="c">{h.city}</div>}</div>
        <img src={h.brand === "warith" ? warithLogo : bionicLogo} alt={h.brand === "warith" ? "شعار الوارث" : "شعار بايونك"} className="hs-logo" />
        <div className="hs-title">{TITLE}</div>
      </div>
      <div className="hs-info" data-testid="hs-info">
        <span>الاسم: <b>{data.patient?.name ?? "—"}</b></span>
        <span>رقم الملف: <b dir="ltr">{data.patient?.code ?? "—"}</b></span>
        <span>التاريخ: <bdi dir="ltr">{today}</bdi></span>
      </div>
      <div className="hs-phase" data-testid="hs-phase">
        المرحلة {arDigits(phase.position)}: <b>{phase.nameAr}</b>{range && <span className="hs-muted"> — {range}</span>}
      </div>
      {withEducation && education && (
        <div className="hs-edu" data-testid="hs-education"><div className="hs-edu-t">إرشادات هذه المرحلة</div><div className="hs-pre">{education}</div></div>
      )}
    </div>
  );
  const contBlock = data && (
    <div className="hs-cont"><span>{TITLE} (تتمّة) — <b>{data.patient?.name ?? ""}</b></span><span>رقم الملف: <b dir="ltr">{data.patient?.code ?? "—"}</b></span></div>
  );
  const card = (l: PhaseExercise, no: number) => {
    const e = l.exercise as any;
    const dose = doseLine(mergeDose(e, l), Boolean(e.perSide), "ar");
    const imgs = (e.images ?? []).filter((i: any) => i.url).slice(0, 2);
    const steps = stepLines(e.steps);
    const cues = stepLines(e.cues);
    return (
      <article key={l.exerciseId} className="hs-ex" data-testid={`hs-ex-${l.exerciseId}`}>
        <div className="hs-ex-text">
          <div className="hs-ex-name"><span className="hs-no">{arDigits(no)}</span> {e.nameAr}</div>
          {dose && <div className="hs-dose" data-testid={`hs-dose-${l.exerciseId}`}>{dose}</div>}
          {l.note && <div className="hs-note">{l.note}</div>}
          {e.startPosition && <div><span className="hs-k">وضعية البداية: </span>{e.startPosition}</div>}
          {steps.length > 0 && (
            //  ترقيمٌ مكتوبٌ لا علاماتُ قائمة: المصوِّرُ (ملفُّ تلغرام) يضع علامةَ القائمة في الطرف الأيسر مع الاتجاه من اليمين.
            <div className="hs-steps">{steps.map((s, i) => <div key={i} className="hs-step"><span className="hs-step-no">{arDigits(i + 1)}.</span><span>{s}</span></div>)}</div>
          )}
          {cues.length > 0 && <div className="hs-cues"><span className="hs-k">انتبه: </span>{cues.join(" · ")}</div>}
          {e.equipment && <div><span className="hs-k">الأدوات: </span>{e.equipment}</div>}
          {e.stopIf && <div className="hs-stop" data-testid={`hs-stop-${l.exerciseId}`}><span className="hs-k">توقّف إذا: </span>{e.stopIf}</div>}
        </div>
        {imgs.length > 0 && (
          <div className={imgs.length > 1 ? "hs-ex-imgs two" : "hs-ex-imgs"}>
            {imgs.map((i: any) => <img key={i.key} src={i.url} alt={i.captionAr || e.nameAr} className="hs-img" />)}
          </div>
        )}
      </article>
    );
  };
  const foot = (i: number, total: number) => (
    <footer className="hs-foot">
      <span>نتمنى لكم الصحة والسلامة الدائمة{phones.length > 0 && <> — للتواصل: <bdi dir="ltr">{phones.join(" · ")}</bdi></>}{by && <> — أعدّها: {by}</>}</span>
      <span data-testid={`hs-page-no-${i + 1}`}>صفحة {arDigits(i + 1)} من {arDigits(total)}</span>
    </footer>
  );

  const total = counts?.length ?? 0;
  let start = 0;

  return (
    <div dir="rtl" className="hs-root min-h-screen bg-slate-100">
      <style>{HS_CSS}</style>
      <div className="no-print sticky top-0 z-10 bg-white border-b px-3 pb-2 space-y-2" style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }} data-testid="hs-toolbar">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-hs-back"><ArrowRight className="w-4 h-4" /> رجوع</Button>
          <div className="flex flex-wrap items-center gap-2">
            {phases.length > 1 && (
              <select className="h-9 rounded-md border px-2 text-sm bg-white" value={phasePos ?? ""} onChange={(ev) => setPhasePos(Number(ev.target.value))} data-testid="hs-phase-select">
                {phases.map((p) => (
                  <option key={p.position} value={p.position}>المرحلة {arDigits(p.position)} — {p.nameAr}</option>
                ))}
              </select>
            )}
            {phase && (
              <Button size="sm" variant="outline" className="h-9 gap-1" onClick={() => setPickerOpen((v) => !v)} data-testid="button-hs-picker">
                <ListChecks className="w-4 h-4" /> التمارين ({arDigits(lines.length)} من {arDigits(phase.exercises.length)})
              </Button>
            )}
            <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-hs-print">
              {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
            </Button>
            {allowed && hs?.canSend && (
              <Button size="sm" className="h-9 gap-1 bg-sky-600 hover:bg-sky-700" onClick={sendTelegram}
                disabled={sending || Boolean(sendBlocker) || !counts || lines.length === 0} data-testid="button-hs-telegram">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} إرسال عبر تلغرام
              </Button>
            )}
          </div>
        </div>
        {sendBlocker && <p className="text-xs text-amber-800" data-testid="hs-send-blocker">{sendBlocker}</p>}
        {pickerOpen && phase && (
          <div className="rounded-md border bg-slate-50 p-2 space-y-1 max-h-[45vh] overflow-y-auto" data-testid="hs-picker">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={withEducation} onChange={(ev) => setWithEducation(ev.target.checked)} disabled={!education} data-testid="hs-edu-toggle" />
              إرشادات هذه المرحلة {!education && <span className="text-xs text-muted-foreground">(لا نصَّ لها)</span>}
            </label>
            {phase.exercises.map((l) => (
              <label key={l.exerciseId} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(picked ?? []).includes(l.exerciseId)} onChange={() => toggle(l.exerciseId)} data-testid={`hs-pick-${l.exerciseId}`} />
                <span className="min-w-0 break-words">{l.exercise.nameAr}</span>
                {!l.exercise.homeSuitable && <span className="text-[11px] rounded bg-amber-100 text-amber-900 px-1">في المركز</span>}
              </label>
            ))}
          </div>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {!isLoading && (error || !data) && <p className="text-center text-sm text-red-700 py-20" data-testid="hs-missing">تعذّر تحميل الخطّة</p>}
      {data && !allowed && <p className="text-center text-sm text-amber-800 py-20" data-testid="hs-not-started">{HOME_SHEET_NOT_STARTED}</p>}
      {data && allowed && phases.length === 0 && <p className="text-center text-sm text-muted-foreground py-20" data-testid="hs-no-phases">لا مراحلَ ولا تمارينَ في هذه الخطّة بعد</p>}
      {data && phase && picked && lines.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-20" data-testid="hs-none-picked">اختر تمريناً واحداً على الأقلّ من «التمارين»</p>
      )}

      {data && phase && lines.length > 0 && !counts && (
        <div className="hs-measure" aria-hidden="true" ref={measureRef}>
          <section className="hs-page">{firstBlock}{contBlock}<div className="hs-list">{lines.map((l, i) => card(l, i + 1))}</div>{foot(0, 1)}</section>
        </div>
      )}
      {data && phase && lines.length > 0 && counts && (
        <div className="hs-pages" data-print-zoom style={{ zoom }} data-testid="hs-pages">
          {counts.map((n, i) => {
            const slice = lines.slice(start, start + n);
            const offset = start;
            start += n;
            return (
              <section key={i} className="hs-page" data-testid={`hs-page-${i + 1}`}>
                {i === 0 ? firstBlock : contBlock}
                <div className="hs-list">{slice.map((l, j) => card(l, offset + j + 1))}</div>
                <div className="hs-grow" />
                {foot(i, total)}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const HS_CSS = `
@page { size: A4 portrait; margin: 9mm; }
.hs-root { color:#1f2937; }
.hs-pages { padding:12px 0 40px; }
.hs-page { width:210mm; height:297mm; box-sizing:border-box; padding:9mm; margin:0 auto 12px; background:#fff;
  box-shadow:0 1px 6px rgba(31,42,46,.18); display:flex; flex-direction:column; gap:${GAP_MM}mm; overflow:hidden; font-size:12px; line-height:1.45; }
.hs-measure { position:absolute; left:-10000px; top:0; visibility:hidden; pointer-events:none; }
.hs-measure .hs-page { height:auto; overflow:visible; }
.hs-first { display:flex; flex-direction:column; gap:2mm; }
.hs-head { display:grid; grid-template-columns:1fr auto; align-items:start; gap:4mm; }
.hs-center { border:2px solid #1e293b; border-radius:14px; padding:2.5mm 5mm; text-align:center; font-weight:700; color:#1e3a8a; justify-self:start; max-width:120mm; }
.hs-center .n { font-size:15px; } .hs-center .c { font-size:13px; margin-top:1mm; }
.hs-logo { height:18mm; width:18mm; object-fit:contain; }
.hs-title { grid-column:1 / -1; text-align:center; color:#047857; font-weight:700; font-size:19px; }
.hs-info { display:flex; justify-content:space-between; gap:4mm; flex-wrap:wrap; font-size:12.5px; border-bottom:2px solid #1e3a8a; padding-bottom:1.5mm; }
.hs-phase { font-size:13px; color:#1e3a8a; }
.hs-muted { color:#64748b; font-size:11.5px; }
.hs-edu { border:1px solid #93c5fd; background:#eff6ff; border-radius:8px; padding:2mm 3mm; font-size:11.5px; }
.hs-edu-t { font-weight:700; color:#1d4ed8; margin-bottom:0.5mm; }
.hs-pre { white-space:pre-wrap; }
.hs-cont { display:flex; justify-content:space-between; gap:4mm; font-size:12px; color:#334155; border-bottom:2px solid #1e3a8a; padding-bottom:1.5mm; }
.hs-list { display:flex; flex-direction:column; gap:${GAP_MM}mm; }
.hs-ex { display:grid; grid-template-columns:1fr 52mm; gap:3mm; border:1.5px solid #334155; border-radius:8px; padding:2.5mm 3mm; break-inside:avoid; }
.hs-ex-text { display:flex; flex-direction:column; gap:1mm; min-width:0; overflow-wrap:anywhere; }
.hs-ex-name { font-weight:700; font-size:14px; color:#0f172a; }
.hs-no { display:inline-block; min-width:6mm; text-align:center; border-radius:999px; background:#047857; color:#fff; font-size:12px; padding:0 1.5mm; margin-left:1mm; }
.hs-dose { font-weight:700; color:#047857; font-size:12.5px; }
.hs-note { color:#334155; font-style:italic; }
.hs-k { font-weight:700; color:#334155; }
.hs-steps { display:flex; flex-direction:column; gap:0.3mm; }
.hs-step { display:flex; gap:1.5mm; align-items:baseline; }
.hs-step-no { flex:none; min-width:4mm; font-weight:700; color:#047857; }
.hs-cues { color:#475569; font-size:11px; }
.hs-stop { color:#b91c1c; font-size:11.5px; }
.hs-ex-imgs { display:flex; flex-direction:column; gap:1.5mm; align-self:start; }
.hs-img { width:52mm; max-height:42mm; object-fit:contain; border:1px solid #cbd5e1; border-radius:4px; background:#fff; }
.hs-ex-imgs.two .hs-img { max-height:34mm; }
.hs-grow { flex:1; }
.hs-foot { display:flex; justify-content:space-between; gap:3mm; font-size:10.5px; color:#64748b; border-top:1px solid #cbd5e1; padding-top:1.5mm; }
@media print {
  html, body, .hs-root { background:#fff !important; }
  .no-print, .hs-measure { display:none !important; }
  .hs-pages { zoom:1 !important; padding:0; }
  .hs-page { width:auto; height:auto; padding:0; margin:0; box-shadow:none; overflow:visible; break-after:page; }
  .hs-page:last-child { break-after:auto; }
  .hs-grow { display:none; }
  * { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
}
`;
