// عقدُ بطاقة «معايناتي» على الهاتف — `npm run test:my-exams-phone`.
//
// ══ الواقعة (مقيسةٌ بمتصفّحٍ حقيقيّ على CSS المبنيّ، لا موصوفة) ═════════
// المالكُ يتصفّح من شاشة هاتف، وصفُّ قائمة عمل الطبيب كان:
//
//   <CardContent className="p-3 flex items-center … flex-wrap">
//     <div className="min-w-0"> … </div>
//     <div className="flex items-center gap-1 shrink-0">  ← أربعةُ أزرار
//
// أربعةُ أزرارٍ في كتلةٍ **لا تلتفّ ولا تنكمش** ≈ ٤٢٠ بكسل. القياسُ الفعليّ:
//
//   عرض ٣٦٠ ⟶ فيضُ البطاقة **٣٩px** ⟶ صار **٠**
//   عرض ٣٩٠ ⟶ فيضُ البطاقة **٩px**  ⟶ صار **٠**
//   عرض ٧٦٨ و١٢٨٠ ⟶ **٠ قبل وبعد** (والحاسوبُ بارتفاعه نفسِه ٧٠px)
//
// ومعه عطبٌ ثانٍ أخطرُ من التخطيط: `truncate` كانت على **حاوية `flex`**.
// و`text-overflow` لا يسري على عنصرٍ `display:flex`، فالقياسُ يقول:
//
//   قبل: «…» لا تسري (display=flex) · **وشارةُ «عاد للشراء» غيرُ ظاهرة**
//         إطلاقاً (تُدفَع خارج الصندوق المقصوص) · فيضُ السطر ١١٢px
//   بعد: «…» تسري (display=block) · **والشارةُ ظاهرة** · فيضُ السطر ٠
//
// فطبيبٌ يقرأ اسماً طويلاً كان يفقد الشارةَ التي تقول إن المريض «عاد
// للشراء» — خسارةُ معلومةٍ لا مجرّدُ شكل.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) الصفُّ **يتكوّم تحت `sm`** ويبقى صفّاً من `sm` فصاعداً.
// (ب) وكتلةُ الأزرار **تلتفّ على الهاتف** ولا تنكمش على الحاسوب.
// (ج) وكتلةُ البيانات لها **أساسُ نموّ** لا `min-w-0` وحدها.
// (د) و**القصُّ على النصّ نفسِه** لا على حاوية `flex`.
// (هـ) **والحاسوبُ كما كان بالحرف** — محاذاتُه وتوزيعُه وتباعدُه.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const src = readFileSync(join(process.cwd(), "client/src/pages/MyExams.tsx"), "utf8");

//  ══ صفُّ قائمة العمل وحده — لا الملفُّ كلُّه: فيه بطاقاتٌ أخرى (المشتريات
//  الأخيرة، والنوافذ) لا شأنَ لها بهذا العقد. ══
const rowAt = src.indexOf("data-testid={`worklist-row-${key}`}");
check(rowAt > 0, "٠. صفُّ قائمة العمل موجودٌ بوسمه");
const rowEnd = src.indexOf("</CardContent>", rowAt);
const row = src.slice(rowAt, rowEnd);
check(row.length > 500 && row.includes("write-exam-"),
  "٠أ. وقُرئ الصفُّ كاملاً حتى زرّ «كتابة معاينة»", `${row.length} حرفاً`);

//  الوسمُ الافتتاحيّ للبطاقة — من `<CardContent` السابق للوسم إلى أوّل `>`.
const ccAt = src.lastIndexOf("<CardContent", rowAt);
const shell = src.slice(ccAt, src.indexOf(">", src.indexOf('className="p-3', ccAt)));
//  والتعليقاتُ تُزال قبل الفحص: شرحٌ يذكر صنفاً ليس تطبيقاً له.
const code = (t: string) => t.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
const shellCode = code(shell);
const rowCode = code(row);

console.log("── أ. الصفُّ يتكوّم على الهاتف ──");
check(/\bflex-col\b/.test(shellCode),
  "أ.١ **عمودٌ تحت `sm`** — فالكتلتان لا تتزاحمان على ٣٦٠ بكسل", shellCode);
check(/\bsm:flex-row\b/.test(shellCode),
  "أ.٢ وصفٌّ من `sm` فصاعداً");
check(!/^[^]*?\bflex\s+items-center\s+justify-between\b/.test(shellCode),
  "أ.٣ **ولم يعد صفّاً بلا شرطِ عرض** — وهو شكلُ العطب بعينه", shellCode);

console.log("\n── ب. وكتلةُ الأزرار تلتفّ على الهاتف ──");
const actAt = rowCode.indexOf("<div className=");
const actions = rowCode.slice(rowCode.lastIndexOf("<div className=", rowCode.indexOf("/patients/")),
  rowCode.indexOf("/patients/"));
check(/\bflex-wrap\b/.test(actions),
  "ب.١ **تلتفّ إلى سطرين بدل أن تفيض** — أربعةُ أزرارٍ ≈٤٢٠px على شاشةِ ٣٦٠", actions);
check(/\bsm:flex-nowrap\b/.test(actions),
  "ب.٢ وتبقى صفّاً واحداً من `sm`");
check(/\bsm:shrink-0\b/.test(actions),
  "ب.٣ **وغيرُ منكمشةٍ على الحاسوب كما كانت**");
check(!/\bshrink-0\b/.test(actions.replace(/sm:shrink-0/g, "")),
  "ب.٤ **ولا `shrink-0` بلا شرطِ عرض** — تلك هي التي منعت الالتفاف", actions);

console.log("\n── ج. ولكتلة البيانات أساسُ نموّ ──");
check(/className="min-w-0 flex-1"/.test(rowCode),
  "ج.١ **`flex-1` لا `min-w-0` وحدها** — بلا أساسٍ تنكمش إلى عرضها الأدنى فيُسحَق الاسم",
  rowCode.slice(0, 400));

console.log("\n── د. **والقصُّ على النصّ لا على حاوية flex** ──");
const nameRow = rowCode.slice(rowCode.indexOf("font-semibold"), rowCode.indexOf("patientName") + 60);
check(!/font-semibold[^"]*\btruncate\b/.test(nameRow),
  "د.١ **لا `truncate` على الحاوية** — `text-overflow` لا يسري على `display:flex`، "
  + "فكانت الشارةُ تختفي كلّياً", nameRow);
check(/<span className="truncate">\{r\.patientName\}<\/span>/.test(rowCode),
  "د.٢ **والاسمُ في عنصرٍ يُقصّ فعلاً** فتظهر «…» وتبقى الشارةُ", nameRow);
check(/font-semibold[^"]*\bmin-w-0\b/.test(nameRow),
  "د.٣ والحاويةُ تسمح بالانكماش فيعمل القصُّ داخلها", nameRow);

console.log("\n── هـ. **والحاسوبُ كما كان بالحرف** ──");
for (const [cls, why] of [
  ["sm:items-center", "محاذاةٌ رأسيةٌ وسطى كما كانت"],
  ["sm:justify-between", "البياناتُ يميناً والأزرارُ يساراً كما كانت"],
  ["sm:gap-3", "وتباعدُها ٣ كما كان"],
  ["sm:flex-wrap", "والتفافُها عند الضيق كما كان"],
] as const) {
  check(shellCode.includes(cls), `هـ.${cls} — ${why}`, shellCode);
}
check(/\bp-3\b/.test(shellCode), "هـ.٥ والحشوةُ ٣ كما كانت");

console.log("\n── و. ولم يُمَسّ ما ليس من العطب ──");
check(/data-testid={`write-exam-\${key}`}/.test(row), "و.١ زرُّ «كتابة معاينة» بوسمه");
check(/data-testid={`cancel-exam-\${key}`}/.test(row), "و.٢ وزرُّ «إلغاء المعاينة»");
check(/data-testid={`return-request-\${key}`}/.test(row), "و.٣ وزرُّ «إرجاع للاستعلامات»");
check(/data-testid={`device-label-\${key}`}/.test(row), "و.٤ وسطرُ هويّة الجهاز (٤.p)");
check(/data-testid={`badge-return-to-purchase-\${key}`}/.test(row),
  "و.٥ **وشارةُ «عاد للشراء»** — وهي بعينها ما كان يختفي");
check(/isDeviceServiceKind\(r\.caseType\)/.test(row),
  "و.٦ وحارسُ «الأجهزةُ وحدها» لإلغاء المعاينة");

console.log(failures ? `\n❌ ${failures} حالة فاشلة` : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
