// **زرُّ «طباعة» واحدٌ لصفحات الطباعة الثلاث** (السجلُّ الكامل · استمارةُ الجهاز · ورقةُ الدفتر) — يختار الطريقةَ التي تعمل على الجهاز.
//
// في المتصفّح: نافذةُ الطباعة كما كانت، وتُفتح وحدَها حين تكتمل الورقة (`autoPrint`). وفي تطبيق الشاشة الرئيسية بآيفون وآيباد — حيث
// `window.print()` لا يفعل شيئاً — يُصنع ملفُّ PDF **حين تكتمل الورقة**، فإذا ضُغط الزرّ فُتح لوحُ المشاركة في اللحظة نفسِها (§4.cw).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { deliverPdf, elementsToPdf, printNeedsPdf, waitForImagesAndFonts } from "@/lib/print_pdf";

export function usePrintAction(opts: {
  /** اكتملت الورقة (البياناتُ والقياسُ والتقطيع)؟ */
  ready: boolean;
  /** أوراقُ الصفحة كما تُطبع — صفحةٌ لكلّ عنصر. */
  collect: () => HTMLElement[];
  fileName: string;
  /** تُفتح نافذةُ الطباعة وحدَها حين تكتمل — في المتصفّح وحده. */
  autoPrint?: boolean;
  /** ورقةٌ واحدة (الاستمارة) تُصغَّر في الملفّ لتتّسع في صفحة. */
  fitOnePage?: boolean;
}) {
  const pdfMode = useMemo(() => printNeedsPdf(), []);
  const [file, setFile] = useState<File | null>(null);
  const [failed, setFailed] = useState(false);
  const collectRef = useRef(opts.collect);
  collectRef.current = opts.collect;

  //  ورقةٌ تُقاس من جديد (بياناتٌ تحدّثت) ⟵ يُصنع الملفُّ من جديد، فلا يُشارَك ملفٌّ قديم.
  useEffect(() => { if (!opts.ready) { setFile(null); setFailed(false); } }, [opts.ready]);

  useEffect(() => {
    if (!pdfMode || !opts.ready || file) return;
    let cancelled = false;
    (async () => {
      await waitForImagesAndFonts();
      const blob = await elementsToPdf(collectRef.current(), { fitOnePage: opts.fitOnePage });
      if (!cancelled) setFile(new File([blob], opts.fileName, { type: "application/pdf" }));
    })().catch((e) => {
      console.error("[print] PDF failed:", e);
      if (!cancelled) setFailed(true);
    });
    return () => { cancelled = true; };
  }, [pdfMode, opts.ready, file, opts.fileName]);

  const autoPrinted = useRef(false);
  useEffect(() => {
    if (pdfMode || !opts.autoPrint || !opts.ready || autoPrinted.current) return;
    autoPrinted.current = true;
    waitForImagesAndFonts().then(() => setTimeout(() => window.print(), 300));
  }, [pdfMode, opts.autoPrint, opts.ready]);

  const run = useCallback(() => {
    if (!pdfMode) { window.print(); return; }
    if (file) void deliverPdf(file);
  }, [pdfMode, file]);

  return {
    pdfMode,
    /** الملفُّ يُصنع — الزرُّ ينتظر. */
    preparing: pdfMode && opts.ready && !file && !failed,
    failed,
    disabled: !opts.ready || (pdfMode && !file),
    label: pdfMode ? (file ? "طباعة / مشاركة" : failed ? "تعذّر تجهيز الملف" : "جارٍ تجهيز الملف…") : "طباعة",
    run,
  };
}
