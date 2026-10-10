// الطباعةُ والصفحاتُ المرقّمة وحافّةُ الشاشة العليا ونصُّ المصروف (ملاحظاتُ المالك ٢٠٢٦-١٠-٠٨، §4.cw) — `npm run test:print-layout`.
//
// يحرس أربعاً: (١) «زرّ الطباعة لا يعمل» — في تطبيق الشاشة الرئيسية بآيفون وآيباد وحده يُصنع ملفٌّ ويُفتح لوحُ المشاركة، وفي كلّ متصفّحٍ
// آخر نافذةُ الطباعة كما كانت، والصفحاتُ الثلاث بالزرّ نفسِه؛ (٢) «القوائمُ الطويلة بأرقام» — تقطيعُ السطور على صفحاتٍ و«صفحة ٢ من ٥»
// وسطورٌ مرقّمة؛ (٣) «الحدودُ العليا مختفٍ نصفُها على الآيباد» — الشاشةُ العريضة تبدأ تحت شريط الحالة؛ (٤) «المصاريفُ تُكتب مرّتين»
// و«ورقةٌ ثانيةٌ فارغة».
import { readFileSync } from "fs";
import { join } from "path";
import { packRowsIntoPages } from "@shared/print_pages";
import { printNeedsPdf } from "./print_pdf";
import { cashRowNote } from "./cash_book_text";
import { capturableText, firstStrongDir, mergeLineRects } from "./print_text";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const src = (f: string) => readFileSync(join(import.meta.dirname, "../../..", f), "utf8");

console.log("\n── أ. التقطيعُ على صفحات ──");
const rows = (n: number, h = 10) => Array(n).fill(h);
same("أ.١ **ما يتّسع يبقى في صفحةٍ واحدة**، والقائمةُ الفارغة صفحةٌ بلا سطور",
  [packRowsIntoPages(rows(5), { first: 60, rest: 100, tail: 5 }), packRowsIntoPages([], { first: 60, rest: 100, tail: 5 })], [[5], [0]]);
same("أ.٢ **الأولى أضيق** (الترويسةُ والبيانات) والتاليةُ أوسع — ومجموعُ الصفحات عددُ السطور",
  packRowsIntoPages(rows(25), { first: 60, rest: 100, tail: 5 }), [6, 10, 9]);
same("أ.٣ **والمجموعُ لا يقف وحدَه في صفحة** — إن لم يتّسع مع آخر السطور انتقل آخرُ سطرٍ معه",
  packRowsIntoPages(rows(16), { first: 60, rest: 100, tail: 5 }), [6, 9, 1]);
same("أ.٤ **وسطرٌ أطولُ من صفحة يأخذ صفحتَه ولا يُفقَد**", packRowsIntoPages([10, 250, 10], { first: 60, rest: 100, tail: 0 }), [1, 1, 1]);

console.log("\n── ب. مَن يُصنع له الملفّ ──");
const env = (ua: string, platform: string, touch: number, standalone: boolean, displayStandalone = standalone) => {
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { userAgent: ua, platform, maxTouchPoints: touch, standalone } });
  (globalThis as any).window = { matchMedia: (q: string) => ({ matches: q.includes("standalone") && displayStandalone }) };
  const v = printNeedsPdf();
  delete (globalThis as any).window;
  return v;
};
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15";
const IPAD = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15";
const ANDROID = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/128.0 Mobile Safari/537.36";
same("ب.١ **آيفون وآيباد من الشاشة الرئيسية ⟵ ملفٌّ ولوحُ مشاركة** — والآيبادُ يتنكّر حاسوباً ماك بلمس",
  [env(IPHONE, "iPhone", 5, true), env(IPAD, "MacIntel", 5, false, true)], [true, true]);
same("ب.٢ **وفي سفاري العاديّ وأندرويد والحاسوب ⟵ نافذةُ الطباعة كما كانت**",
  [env(IPHONE, "iPhone", 5, false), env(ANDROID, "Linux armv8l", 5, false, true), env(IPAD, "MacIntel", 0, false, true)], [false, false, false]);

console.log("\n── ج. الصفحاتُ الثلاث بالزرّ نفسِه ──");
const record = src("client/src/pages/PatientRecordPrint.tsx");
const sheet = src("client/src/pages/IntakeSheetPrint.tsx");
const book = src("client/src/pages/CashBookPrint.tsx");
same("ج.١ **السجلُّ والاستمارةُ والدفتر بـ`usePrintAction`** — ولا `window.print()` في زرٍّ مباشرة",
  [record, sheet, book].map((s) => [/usePrintAction\(\{/.test(s), /onClick=\{printer\.run\}/.test(s), /onClick=\{\(\) => window\.print\(\)\}/.test(s)]),
  [[true, true, false], [true, true, false], [true, true, false]]);
same("ج.٢ **«صفحة ٢ من ٥» في أسفل كلّ صفحة، والسطورُ مرقّمة، والتقطيعُ بالقياس**",
  [/صفحة \{i \+ 1\} من \{plan\.counts\.length\}/.test(record), /<td className="no">\{no\}<\/td>/.test(record), /packRowsIntoPages\(rows, \{/.test(record)],
  [true, true, true]);
const pdfLib = src("client/src/lib/print_pdf.ts");
same("ج.٣ **والنسخةُ المصوَّرة بلا تباعد حروف** (يفكّك العربية) **وعيّنةُ خطّ الأساس في السطر** (وإلّا نزل النصُّ عن مكانه)",
  [/letter-spacing: normal !important/.test(pdfLib), /body > div\[style\*="visibility: hidden"\] > img \{ display: inline !important; \}/.test(pdfLib)], [true, true]);

console.log("\n── د. لا ورقةَ ثانيةً فارغة ──");
same("د.١ **الورقةُ في الطباعة بارتفاع محتواها لا بطول A4** — والهوامشُ في `@page`، والفاصلُ المرن مخفيّ (السجلُّ والدفتر)",
  [/\.rp-page \{ width:auto; height:auto; padding:0;/.test(record), /\.cb-print \.a4 \{ box-shadow:none; margin:0; padding:0; height:auto;/.test(book),
    /@page \{ size: A4 portrait; margin: 7mm 10mm 6mm; \}/.test(book), /\.cb-print \.grow \{ display:none; \}/.test(book)],
  [true, true, true, true]);

console.log("\n── هـ. الآيباد تحت شريط الحالة ──");
const css = src("client/src/index.css");
same("هـ.١ **منطقةُ التمرير والشريطُ الجانبيّ على الشاشة العريضة تبدأ تحت شريط الحالة** — قاعدةٌ واحدة لكلّ الصفحات",
  [/\.app-main \{\s*margin-top: env\(safe-area-inset-top\);\s*height: calc\(100vh - env\(safe-area-inset-top\)\);/.test(css),
    /\.app-sidebar-desktop \{\s*padding-top: env\(safe-area-inset-top\);/.test(css),
    /className="app-main /.test(src("client/src/App.tsx")), /className="app-sidebar-desktop /.test(src("client/src/components/Sidebar.tsx"))],
  [true, true, true, true]);
same("هـ.٢ **والنوافذُ في التطبيق المثبَّت على الشاشة العريضة بين المنطقتين الآمنتين**",
  /@media \(min-width: 640px\) and \(display-mode: standalone\) \{\s*\[data-app-dialog\] \{/.test(css), true);

console.log("\n── و. المصروفُ لا يُكتب مرّتين ──");
same("و.١ **اسمُ الباب لا يُعاد في وصفه**، والوصفُ المختلف يبقى",
  [cashRowNote({ kind: "expense", source: "expense", note: "رواتب — شهر أيلول", category: "salaries" }),
    cashRowNote({ kind: "expense", source: "expense", note: "رواتب", category: "salaries" }),
    cashRowNote({ kind: "expense", source: "expense", note: "", category: "salaries" })],
  ["رواتب — شهر أيلول", "رواتب", "رواتب"]);

console.log("\n── ز. العربيةُ موصولةً في الملفّ المصوَّر (ملاحظةُ المالك ٢٠٢٦-١٠-١٠: «المعاينة والملاحظات عربيتُها غير صحيحة») ──");
same("ز.١ **محارفُ الاتجاه الخفيّة تُحذف في نسخة المصوِّر** (LRM · RLM · ALM · التضمين · العزل · BOM) — والحروفُ والأرقامُ والشرطاتُ كما هي",
  capturableText("\u200Fعدنان مرهون\u200E كاظم\u061C 2024\\12\\1\u202B نص\u202C \u2067عزل\u2069\uFEFF — Dokum"),
  "عدنان مرهون كاظم 2024\\12\\1 نص عزل — Dokum");
same("ز.٢ **وسطرُ ويندوز والسطرُ القديم سطرٌ واحد**", capturableText("أ\r\nب\rج\nد"), "أ\nب\nج\nد");
same("ز.٣ **والنسخةُ المصوَّرة وحدها تُهيَّأ** — في `onclone` بعد تحييد تباعد الحروف، والشاشةُ لا تُمَسّ",
  [/onclone:[\s\S]*prepareTextForCapture\(clone\)/.test(pdfLib), /prepareTextForCapture/.test(record + sheet + book)], [true, false]);

//  **تكملة** (ملاحظةُ المالك ٢٠٢٦-١٠-١٠ مساءً): سليمةٌ من آيفون ١٧، ومفكّكةٌ من آيفون ١٣ في «المعاينة الطبية» وحدها. والمصوِّرُ يرسم الكلمةَ حرفاً
//  حرفاً حين يعيد المتصفّحُ لها أكثرَ من مستطيل — فتُجمع مستطيلاتُ السطر الواحد مستطيلاً واحداً.
const rect = (left: number, top: number, width: number, height = 20) => ({ left, top, width, height });
same("ز.٤ **مستطيلاتُ كلمةٍ في سطرٍ واحد ⟵ مستطيلٌ واحد** (نصفان، أو فارغٌ مع الحقيقيّ)، وكلمةٌ على سطرين تبقى كما هي، ولا شيءَ ⟵ كما هو",
  [mergeLineRects([rect(150, 100, 50), rect(100, 100, 50)]), mergeLineRects([rect(200, 100, 0), rect(100, 100, 100)]),
    mergeLineRects([rect(100, 100, 40), rect(300, 130, 40)]), mergeLineRects([rect(10, 10, 0)]), mergeLineRects([rect(100, 102, 50, 18), rect(150, 100, 50, 22)])],
  [[rect(100, 100, 100)], [rect(100, 100, 100)], null, null, [rect(100, 100, 100, 22)]]);
same("ز.٥ **اتّجاهُ السطر من أوّل حرفٍ قويّ** — كـ`dir=\"auto\"` بلا `unicode-bidi: plaintext`",
  ["لم يشتري يفكر", "MRI قبل شهر", "2024 — كاظم", "120 / 80", "Dokum بعد"].map(firstStrongDir), ["rtl", "ltr", "rtl", null, "ltr"]);
const printText = src("client/src/lib/print_text.ts");
same("ز.٦ **والكلمةُ تُرسَم كاملة في نسخة المصوِّر**: التهيئةُ تجمع المستطيلات، والسطورُ بلا `plaintext`",
  [/keepWordsWhole\(win\);/.test(printText), /unicodeBidi\s*=\s*"plaintext"/.test(printText), /row\.dir = "auto"/.test(printText)], [true, false, false]);

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
