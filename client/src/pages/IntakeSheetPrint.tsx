// **طباعةُ «استمارة المراجع» مكتملةً** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨) — `/intake-sheet/print?patient=&episode=`.
//
// «حين أضغط طباعة بعد الحسم يجب أن تظهر الورقةُ تماماً بعد أن اكتملت معلوماتُها، وحين أطبعها تكون نفسَ ورقة المريض … ليحفظها موظّفُ
// الاستعلامات في سجلّ المريض — لأننا سنترك الورق». فالصفحةُ ورقةُ A4 وحدها بلا إطار التطبيق (كورقة الدفتر، §4.ca)، بالمكوّن نفسِه
// الذي يعرضها في صفحة المريض (`IntakeSheetView`)، وفي أسفلها متى طُبعت ومَن طبعها. وتفتح نافذةَ الطباعة وحدَها حين تكتمل.
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Printer } from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
import { usePrintAction } from "@/hooks/use-print-action";
import { IntakeSheetView } from "@/components/intake/IntakeSheetView";
import type { IntakeSheetsResponse } from "@shared/intake_sheet_view";

const stamp = (d: Date) => d.toLocaleString("en-GB", { timeZone: "Asia/Baghdad", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

export default function IntakeSheetPrint() {
  const session = useBranchSession() as any;
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const patientId = Number(params.get("patient") ?? 0);
  const episodeId = Number(params.get("episode") ?? 0);
  const { data, isLoading, error } = useQuery<IntakeSheetsResponse>({
    queryKey: [`/api/patients/${patientId}/intake-sheets`], enabled: patientId > 0,
  });
  const sheet = data?.sheets.find((s) => s.episodeId === episodeId) ?? null;
  const printedAt = useMemo(() => stamp(new Date()), [data]);
  //  **وفي تطبيق الشاشة الرئيسية بآيفون وآيباد ملفُّ PDF ولوحُ المشاركة** — الطباعةُ هناك لا تعمل (§4.cw).
  const printer = usePrintAction({
    ready: Boolean(sheet),
    collect: () => Array.from(document.querySelectorAll<HTMLElement>('[data-testid="sheet-print-page"]')),
    fileName: `${data?.patient.patientCode ?? patientId}-sheet-${sheet?.sequenceNumber ?? episodeId}.pdf`,
    autoPrint: true,
    fitOnePage: true,
  });

  /** فُتحت بتبويبٍ من الملفّ ⟵ يُغلق؛ وفي مكانها (الهاتف) ⟵ رجوعٌ في السجلّ؛ ولا سجلّ (رابطٌ مباشر) ⟵ ملفُّ المريض. */
  const goBack = () => {
    if (window.opener && !window.opener.closed) { window.close(); return; }
    if (window.history.length > 1) { window.history.back(); return; }
    navigate(patientId > 0 ? `/patients/${patientId}` : "/");
  };


  return (
    <div dir="rtl" className="min-h-screen bg-slate-100 print:bg-white">
      <style>{`
@page { size: A4 portrait; margin: 9mm; }
@media print {
  html, body { background: #fff !important; }
  .no-print { display: none !important; }
  .sheet-page { box-shadow: none !important; margin: 0 !important; padding: 0 !important; width: auto !important; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`}</style>
      {/*  **الشريطُ تحت جزيرة الهاتف لا عليها، و«رجوع» يعيد إلى ملفّ المريض** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨: «زرّ الطباعة يصير أعلى
          منتصف الشاشة تحت الجزيرة» و«لا زرّ عودة») — التطبيقُ المثبَّت يمدّ الصفحةَ تحت الجزيرة، و«إغلاق» النافذة لا يعمل فيه. */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between gap-2 bg-white border-b px-3 pb-2"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }} data-testid="sheet-print-toolbar">
        <Button size="sm" variant="outline" className="h-9 gap-1" onClick={goBack} data-testid="button-print-back">
          <ArrowRight className="w-4 h-4" /> رجوع
        </Button>
        <Button size="sm" className="h-9 gap-1" onClick={printer.run} disabled={printer.disabled} data-testid="button-print-now">
          {printer.preparing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />} {printer.label}
        </Button>
      </div>
      {isLoading && <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}
      {!isLoading && (error || !sheet) && (
        <p className="text-center text-sm text-red-700 py-20" data-testid="sheet-print-missing">
          {(error as any)?.message ? "تعذّر تحميل الاستمارة" : "لا توجد استمارةٌ لهذا الجهاز"}
        </p>
      )}
      {data && sheet && (
        <div className="sheet-page mx-auto my-4 w-[210mm] max-w-full bg-white shadow p-[9mm]" data-testid="sheet-print-page">
          <IntakeSheetView patient={data.patient} sheet={sheet} />
          <div className="mt-3 flex justify-between text-[11px] text-slate-500" data-testid="sheet-print-footer">
            <span>طُبعت في <bdi dir="ltr">{printedAt}</bdi>{session?.displayName ? ` — بواسطة ${session.displayName}` : ""}</span>
          </div>
        </div>
      )}
    </div>
  );
}
