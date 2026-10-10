// **الطباعةُ من تطبيق الشاشة الرئيسية في آيفون وآيباد** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨: «زرّ الطباعة لا يعمل، حين أضغطه لا يحدث شيء»).
//
// التطبيقُ مثبَّتٌ على الشاشة الرئيسية (`apple-mobile-web-app-capable`)، وفيه `window.print()` **لا يفعل شيئاً** — لا نافذةَ طباعة
// ولا خطأ — بينما الصفحةُ نفسُها تُطبع من سفاري. فهناك وحده تُصنع الأوراقُ ملفَّ PDF بصفحات A4 (صورةً لكلّ صفحة كما تُرى) ويُفتح
// **لوحُ المشاركة** وفيه «طباعة» و«حفظ في الملفات» وإرسالُه. وفي كلّ متصفّحٍ آخر تبقى نافذةُ الطباعة كما هي.

import { prepareTextForCapture } from "./print_text";

/** هل هذا تطبيقُ الشاشة الرئيسية في آيفون أو آيباد؟ — هناك وحده يُصنع الملفّ بدل نافذة الطباعة. */
export function printNeedsPdf(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  //  بابُ الفحص في المتصفّح الآليّ — لا يضبطه شيءٌ في التطبيق.
  if ((window as any).__forcePdfPrint === true) return true;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints ?? 0) > 1);
  const standalone = (navigator as any).standalone === true
    || (typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
  return ios && standalone;
}

/** الصورُ (الشعار) تكتمل قبل التصوير أو الطباعة — وإلّا خرجت الورقةُ بلا شعار. */
export async function waitForImagesAndFonts(): Promise<void> {
  const imgs = Array.from(document.images);
  await Promise.all(imgs.map((im) => (im.complete ? Promise.resolve() : new Promise((r) => { im.onload = im.onerror = () => r(null); }))));
  await (document as any).fonts?.ready?.catch?.(() => undefined);
}

const A4_W = 210;
const A4_H = 297;

/**
 * **أوراقُ الشاشة ⟵ ملفُّ PDF بصفحات A4.** كلُّ عنصرٍ يُصوَّر بعرض A4 (٢١٠ مم) مهما كان عرضُ الشاشة، والأطولُ من صفحةٍ يُقسَم صفحات.
 * وفي النسخة المصوَّرة وحدها: لا تباعدَ بين الحروف (يفكّك الحرفَ العربيّ في المصوِّر)، ولا تصغيرَ للمعاينة.
 */
export async function elementsToPdf(elements: HTMLElement[], opts: { fitOnePage?: boolean } = {}): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  //  **خطُّ الأساس**: المصوِّرُ يقيسه بعيّنةٍ (نصٌّ وصورةٌ بنقطة) يضعها في الصفحة الأصلية، وإعدادُ الصفحة الافتراضيّ يجعل كلَّ صورةٍ كتلةً
  //  فتنزل العيّنةُ سطراً ويُرسَم النصُّ كلُّه أدنى من مكانه حتى يلامس الخطوط. فطولَ التصوير وحده، العيّنةُ وحدها صورتُها في السطر.
  const metricsFix = document.createElement("style");
  metricsFix.textContent = 'body > div[style*="visibility: hidden"] > img { display: inline !important; }';
  document.head.appendChild(metricsFix);
  try {
    let first = true;
    for (const el of elements) {
      const canvas = await html2canvas(el, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false, windowWidth: 1100,
        onclone: (doc: Document, clone: HTMLElement) => {
          const st = doc.createElement("style");
          st.textContent = "* { letter-spacing: normal !important; } [data-print-zoom] { zoom: 1 !important; }";
          doc.head.appendChild(st);
          clone.style.width = `${A4_W}mm`;
          clone.style.maxWidth = "none";
          clone.style.margin = "0";
          clone.style.boxShadow = "none";
          //  النصُّ العربيّ موصولاً في المصوِّر: بلا محارف اتجاهٍ خفيّة، وكلُّ نصٍّ متعدّد الأسطر سطرٌ في كتلة (`print_text.ts`).
          prepareTextForCapture(clone);
        },
      });
      //  **ورقةٌ واحدة تبقى واحدة** (الاستمارة): على الشاشة أطولُ قليلاً من ورقتها المطبوعة، فتُصغَّر لتتّسع — ما لم تتجاوز صفحةً ونصفاً.
      const imgH = (canvas.height * A4_W) / canvas.width;
      if (opts.fitOnePage && imgH > A4_H && imgH <= A4_H * 1.6) {
        if (!first) pdf.addPage();
        first = false;
        const w = (A4_H * canvas.width) / canvas.height;
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", (A4_W - w) / 2, 0, w, A4_H);
        continue;
      }
      for (const page of a4Slices(canvas)) {
        if (!first) pdf.addPage();
        first = false;
        pdf.addImage(page.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, A4_W, Math.min(A4_H, (page.height * A4_W) / page.width));
      }
    }
  } finally {
    metricsFix.remove();
  }
  return pdf.output("blob");
}

/** صورةٌ بعرض A4 ⟵ صفحاتٌ بطول A4 — وما لا يتجاوز صفحةً (بفرق تقريب) صفحةٌ واحدة كما هي. */
function a4Slices(canvas: HTMLCanvasElement): HTMLCanvasElement[] {
  const sliceH = Math.floor((canvas.width * A4_H) / A4_W);
  if (canvas.height <= sliceH * 1.005) return [canvas];
  const out: HTMLCanvasElement[] = [];
  for (let y = 0; y < canvas.height; y += sliceH) {
    const part = document.createElement("canvas");
    part.width = canvas.width;
    part.height = Math.min(sliceH, canvas.height - y);
    const ctx = part.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, part.width, part.height);
    ctx.drawImage(canvas, 0, -y);
    out.push(part);
  }
  return out;
}

/**
 * **لوحُ المشاركة** — وفيه «طباعة». يُنادى **في لحظة الضغط نفسِها** (لا بعد انتظار): آيفون لا يفتح اللوحَ إلّا بلمسةٍ حاضرة، فالملفُّ يُصنع
 * قبلها. وجهازٌ بلا مشاركة ملفّات ⟵ يُنزَّل الملفّ.
 */
export async function deliverPdf(file: File): Promise<void> {
  const nav = navigator as any;
  if (typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: file.name });
      return;
    } catch (e: any) {
      if (e?.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
