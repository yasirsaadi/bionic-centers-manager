// **طباعةُ «استمارة المراجع» مكتملةً** (§4.cq، ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨) — `/intake-sheet/print?patient=&episode=`.
//
// «حين أضغط طباعة بعد الحسم يجب أن تظهر الورقةُ تماماً بعد أن اكتملت معلوماتُها، وحين أطبعها تكون نفسَ ورقة المريض … ليحفظها موظّفُ
// الاستعلامات في سجلّ المريض — لأننا سنترك الورق». فالصفحةُ ورقةُ A4 وحدها بلا إطار التطبيق (كورقة الدفتر، §4.ca)، بالمكوّن نفسِه
// الذي يعرضها في صفحة المريض (`IntakeSheetView`)، وفي أسفلها متى طُبعت ومَن طبعها. وتفتح نافذةَ الطباعة وحدَها حين تكتمل.
import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBranchSession } from "@/components/BranchGate";
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
  const printed = useRef(false);
  const printedAt = useMemo(() => stamp(new Date()), [data]);

  useEffect(() => {
    if (!sheet || printed.current) return;
    printed.current = true;
    //  تُنتظَر الصورُ (الشعار) قبل نافذة الطباعة — وإلّا خرجت الورقةُ بلا شعار.
    const imgs = Array.from(document.images);
    Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); }))))
      .then(() => setTimeout(() => window.print(), 300));
  }, [sheet]);

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
      <div className="no-print sticky top-0 z-10 flex items-center justify-center gap-2 bg-white/90 border-b p-2">
        <Button size="sm" className="gap-1" onClick={() => window.print()} disabled={!sheet} data-testid="button-print-now">
          <Printer className="w-4 h-4" /> طباعة
        </Button>
        <Button size="sm" variant="outline" onClick={() => window.close()}>إغلاق</Button>
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
