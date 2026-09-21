// **تحريرُ كلفة الحالة على الهاتف** — عقدُ الشاشة. بلا قاعدة بيانات:
// `npm run test:case-cost-edit-phone`.
//
// ══ العطبُ الذي يغلقه (مقيسٌ بمتصفّحٍ حقيقيّ عند ٣٩٠px) ═══════════════════
//   المحرِّرُ كان محبوساً في خليةِ ثلثِ الشبكة (١٠٦px)، فالقياسُ الفعليّ:
//     مربّعُ الإدخال ٤٧×٣٢ · زرُّ ✓ ١٦×١٦ · زرُّ ✗ ١٦×١٦ · القلم ١٢×١٢
//   وأدنى هدفِ لمسٍ معتمَد: ٤٤ (Apple HIG) / ٤٨ (Material).
//   وبعد الإصلاح: الإدخالُ ٢٣٠×٤٤ · الزرّان ٤٤×٤٤ · وهدفُ لمس القلم ٥٠×٥٠.
//
// **وسطحُ المكتب لم يتغيّر بحرف** — مُقارَنٌ آلياً عند ١٢٨٠px قبل وبعد:
//   الخليةُ ٤٠٨×٧٦ · الإدخالُ ٣٤٤×٣٢ · القلمُ ١٢×١٢ · الزرّان ١٦×١٦ · بلا فيض.
//   ولذلك كلُّ مقاسٍ جديد مشروطٌ بـ`md:` يعيده إلى قيمته السابقة.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const SRC = join(process.cwd(), "client/src/components/patient/PatientCasesTabs.tsx");
//  التعليقاتُ تُزال قبل الفحص — فلا يمرّ شرحٌ مكانَ كود.
const raw = readFileSync(SRC, "utf8");
const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

//  كتلةُ التحرير وحدها — لا الملفُّ كلُّه، فلا يمرّ صنفٌ من مكانٍ آخر.
const editBlock = (() => {
  const i = src.indexOf("{editing ? (");
  const j = src.indexOf("fmtIQD(caseRow.cost)", i);
  return i >= 0 && j > i ? src.slice(i, j) : "";
})();
const pencilBtn = (() => {
  const i = src.indexOf("edit-case-cost-");
  const j = src.indexOf("</button>", i);
  return i >= 0 && j > i ? src.slice(Math.max(0, i - 400), j) : "";
})();

console.log("\n── أ. مربّعُ الإدخال يتّسع على الهاتف ──");
check(editBlock.length > 0, "أ٠. كتلةُ التحرير مقروءة", String(editBlock.length));
check(/h-11\s+md:h-8/.test(editBlock),
  "أ١. ارتفاعُ الإدخال ٤٤px على الهاتف و٣٢px على المكتب", editBlock.slice(0, 200));
check(/text-base\s+md:text-sm/.test(editBlock),
  "أ٢. وخطُّه أكبر على الهاتف، وكما كان على المكتب");

console.log("\n── ب. زرّا الحسم هدفا لمسٍ حقيقيّان ──");
const okBtn = editBlock.slice(editBlock.indexOf("save-case-cost-") - 400, editBlock.indexOf("save-case-cost-") + 400);
check((editBlock.match(/h-11 w-11 md:h-auto md:w-auto/g) || []).length === 2,
  "ب١. **الزرّان ٤٤×٤٤ على الهاتف** — وبلا مقاسٍ مفروضٍ على المكتب",
  String((editBlock.match(/h-11 w-11/g) || []).length));
check((editBlock.match(/inline-flex items-center justify-center/g) || []).length === 2,
  "ب٢. والأيقونةُ في وسط الهدف");
check(/bg-green-50 md:bg-transparent/.test(editBlock) && /bg-red-50 md:bg-transparent/.test(editBlock),
  "ب٣. وخلفيّةٌ خفيفة تجعلهما يُقرآن زرّين — على الهاتف وحده");
check((editBlock.match(/shrink-0/g) || []).length === 2,
  "ب٤. ولا ينكمشان أمام الإدخال");
check(/w-5 h-5 md:w-4 md:h-4/.test(okBtn), "ب٥. والأيقونةُ أكبر على الهاتف وكما كانت على المكتب");

console.log("\n── ج. والمحرِّرُ يخرج من خليةِ الثلث على الهاتف ──");
check(/col-span-3 md:col-span-1/.test(src),
  "ج١. **عرضُ الصفّ كلِّه أثناء التحرير** على الهاتف، وخليةٌ واحدة على المكتب");
check(/editing && canViewCasePayments/.test(src),
  "ج٢. ومشروطٌ بالتحرير وبوجود الأعمدة الثلاثة — فلا يتغيّر شيءٌ في غير ذلك");
check(/gap-2 md:gap-1/.test(editBlock), "ج٣. وتباعدٌ أوسع على الهاتف، وكما كان على المكتب");

console.log("\n── د. وزرُّ القلم يُضغَط ──");
check(/p-2 -m-2 md:p-0 md:m-0/.test(pencilBtn),
  "د١. حشوةٌ تكبّر الهدف وهامشٌ سالب يمنعها من دفع السطر — وصفرٌ على المكتب", pencilBtn.slice(-260));
check(/before:-inset-2\.5/.test(pencilBtn) && /md:before:hidden/.test(pencilBtn),
  "د٢. **وهدفُ لمسٍ ٥٠×٥٠ بعنصرٍ زائف** — بلا أثرٍ في التخطيط، وبلا وجودٍ على المكتب");
check(/w-3\.5 h-3\.5 md:w-3 md:h-3/.test(pencilBtn),
  "د٣. والأيقونةُ أكبر قليلاً على الهاتف، وكما كانت على المكتب");
check(/aria-label="تعديل التكلفة"/.test(pencilBtn), "د٤. وله اسمٌ يُقرأ");

console.log("\n── هـ. ولا شيءَ خارج هذا مُسّ ──");
check(/font-bold text-sm md:text-base/.test(src), "هـ١. عرضُ الكلفة غيرَ محرَّرة كما كان");
check(/grid gap-3 \$\{canViewCasePayments \? "grid-cols-3" : "grid-cols-1"\}/.test(src),
  "هـ٢. وشبكةُ الصناديق الثلاثة كما كانت");
check(/<StatBox label="المدفوع"/.test(src) && /<StatBox label="المتبقّي"/.test(src),
  "هـ٣. وصندوقا المدفوع والمتبقّي كما هما");

console.log(`\n${failures === 0 ? "✅ كل البنود ناجحة" : `❌ ${failures} بنداً فاشلاً`}`);
process.exit(failures === 0 ? 0 : 1);
