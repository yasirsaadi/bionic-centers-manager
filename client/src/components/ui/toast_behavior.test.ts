// سلوكُ الإشعارات على الهاتف — `npm run test:toast-behavior`.
//
// ══ الواقعة (مقيسةٌ بمتصفّحٍ حقيقيّ على CSS المبنيّ، لا موصوفة) ═════════
// المالكُ من شاشة هاتف: «الإشعارات تبقى فترة طويلة… وغير واضحة… ولا أتمكّن
// من فتح القائمة الجانبية حينما أضغط لأن الإشعار موجود ويتأخر ليذهب».
//
// القياسُ على ٣٩٠×٨٤٤ (هاتف، بـ`meta viewport` الحقيقيّ للتطبيق):
//
//              | قبل                        | بعد
//   زرّ القائمة | `12..48px` **محجوب**        | **حرٌّ دائماً**
//   الإشعار    | `16..110px` فوقه بـ`z-100`  | `646..740px` أسفلَ الشاشة
//   زرّ المساعد | حرّ                         | **حرّ** (لم تنتقل المشكلة إليه)
//   يتحرّر بعد  | **٥١٨٥ms**                  | **٠ms** (لا حجبَ أصلاً)
//   وبلمسةٍ    | **❌ ≥٣٠s** — لا يتحرّر      | **٠ms**
//   زرّ الإغلاق | **شفافية ٠** · ٢٤px         | **شفافية ١** · ٤٠px
//
// وثلاثةُ أسباب مستقلّة:
// (١) `ToastViewport` كان `fixed top-0` على الهاتف، ورأسُ الهاتف ثابتٌ في
//     `top-0` بـ`z-30` — والإشعارُ `z-[100]` فوقه، فيغطّي زرَّ القائمة.
// (٢) `ToastClose` كان `opacity-0` يكشفه `group-hover` وحدَه — **ولا hover
//     على شاشة لمس**. ولمسةٌ على جسم الإشعار تُوقف مؤقّتَ Radix ولا
//     تستأنفه على اللمس (مُقيسٌ: باقٍ بعد ١٥ ثانية)، فلا مخرجَ منه.
// (٣) `TOAST_REMOVE_DELAY = 1000000` — ستَّ عشرةَ دقيقةً وأربعين ثانية،
//     افتراضُ `shadcn/ui` المنقول كما هو.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) قرارُ المهلة **دالّةٌ خالصة** تُختبَر دخلاً وخرجاً (درسُ ٤.u).
// (ب) والثوابتُ عاقلة — ولا `1000000` عادت إلى `use-toast.ts`.
// (ج) والإشعارُ **أسفلَ الشاشة** لا فوق رأسها، **ويعلو زرَّ المساعد العائم
//     فعلاً** — محسوباً من أصناف `AiChatDrawer.tsx` نفسِها لا من رقمٍ
//     مكتوبٍ هنا: فلو تحرّك ذلك الزرُّ أو كبر، سقط هذا البند.
// (د) وزرُّ الإغلاق **يُرى ويُضغَط على الهاتف**.
// (هـ) **وسطحُ المكتب كما كان بالحرف** — أسفلَ اليمين، وإغلاقٌ بالـhover.
// (و) و`Toaster` يمرّر المهلةَ من الدالّة القانونية لا رقماً منسوخاً.

import { readFileSync } from "fs";
import { join } from "path";
import {
  TOAST_DURATION_MS,
  TOAST_ERROR_DURATION_MS,
  TOAST_REMOVE_DELAY_MS,
  toastDuration,
} from "./toast_timing";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown, detail = "") {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`
    + (detail ? `\n      ${detail}` : ""));
}

//  التعليقاتُ تُزال قبل كلّ فحصِ مصدر — وإلّا مرّ **شرحٌ** يذكر `top-0`
//  بدل كودٍ يستعمله (وتعليقاتُ هذا الإصلاح تذكره حرفياً).
const code = (t: string) => t.replace(/\/\/[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
const read = (rel: string) => readFileSync(join(import.meta.dirname, rel), "utf8");

//  وحدةُ تباعد Tailwind: ٠٫٢٥rem = ٤px.
const SPACING_PX = 4;

console.log("\n── أ. قرارُ المهلة — دالّةٌ خالصة ──");
same("أ.١ العاديُّ أربعُ ثوانٍ", toastDuration(undefined, undefined), TOAST_DURATION_MS);
same("أ.٢ و`default` الصريحة مثلُه", toastDuration("default", undefined), TOAST_DURATION_MS);
same("أ.٣ **والخطأُ أطول** — يُقرأ ويُتصرَّف به", toastDuration("destructive", undefined), TOAST_ERROR_DURATION_MS);
check(TOAST_ERROR_DURATION_MS > TOAST_DURATION_MS,
  "أ.٤ ومهلةُ الخطأ أطولُ من العاديّ فعلاً");
same("أ.٥ **ومهلةٌ صريحة من موضع النداء تعلو**", toastDuration("default", 12000), 12000);
same("أ.٦ وتعلو على الخطأ كذلك", toastDuration("destructive", 1500), 1500);

console.log("\n── ب. والفاسدُ يُقرأ غياباً لا أمراً ──");
for (const [label, bad] of [["صفر", 0], ["سالب", -5], ["NaN", Number.NaN],
                            ["لا نهائي", Number.POSITIVE_INFINITY]] as const) {
  same(`ب.${label} ⟶ الافتراضيّ`, toastDuration("default", bad as number), TOAST_DURATION_MS);
}
same("ب.null ⟶ الافتراضيّ", toastDuration("default", null), TOAST_DURATION_MS);
same("ب.نوعٌ مجهول ⟶ الافتراضيّ", toastDuration("something-else", undefined), TOAST_DURATION_MS);
check(toastDuration("destructive", Number.NaN) === TOAST_ERROR_DURATION_MS,
  "ب.والفاسدُ على الخطأ يسقط إلى مهلة الخطأ لا العاديّ");

console.log("\n── ج. الثوابتُ عاقلة، ولا `1000000` تعود ──");
check(TOAST_DURATION_MS >= 3000 && TOAST_DURATION_MS <= 6000,
  "ج.١ العاديُّ بين ٣ و٦ ثوانٍ", `${TOAST_DURATION_MS}`);
check(TOAST_ERROR_DURATION_MS >= 5000 && TOAST_ERROR_DURATION_MS <= 12000,
  "ج.٢ والخطأُ بين ٥ و١٢", `${TOAST_ERROR_DURATION_MS}`);
check(TOAST_REMOVE_DELAY_MS >= 200,
  "ج.٣ **ومهلةُ الإزالة أطولُ من حركة الخروج** (١٥٠ms) فلا تُقتطَع",
  `${TOAST_REMOVE_DELAY_MS}`);
check(TOAST_REMOVE_DELAY_MS <= 5000,
  "ج.٤ **وليست ستَّ عشرةَ دقيقة** — كانت `1000000`", `${TOAST_REMOVE_DELAY_MS}`);

const hookCode = code(read("../../hooks/use-toast.ts"));
check(!/1000000/.test(hookCode),
  "ج.٥ **ولا رقمَ `1000000` في `use-toast.ts` إطلاقاً**");
check(hookCode.includes("TOAST_REMOVE_DELAY_MS"),
  "ج.٦ والقيمةُ من الثابت المشترك لا رقمٌ منسوخ");

console.log("\n── د. الموضع: أسفلَ الشاشة، فوق زرّ المساعد ──");
const toastSrc = read("./toast.tsx");
const vpStart = toastSrc.indexOf("ToastPrimitives.Viewport");
const viewport = code(toastSrc.slice(vpStart, toastSrc.indexOf("ToastViewport.displayName")));
check(vpStart > 0 && viewport.includes("fixed"), "د.٠ وقُرئ صنفُ العارض");

check(!/\btop-0\b/.test(viewport),
  "د.١ **لا `top-0` على الهاتف** — كان يضع الإشعار فوق رأس الهاتف بالضبط");
const mobileBottom = /bottom-\[([\d.]+)rem\]/.exec(viewport);
check(mobileBottom !== null,
  "د.٢ **ومربوطٌ بأسفل الشاشة بإزاحةٍ صريحة**", viewport.slice(0, 200));

//  **الاقترانُ يُقرأ من مصدره لا يُفترَض**: زرُّ المساعد العائم يعيش في
//  `AiChatDrawer.tsx`، فلو نُقل أو كبر سقط هذا البند بدل أن يبقى الإشعارُ
//  فوقه صامتاً.
const fab = /fixed bottom-(\d+) left-\d+ z-40 h-(\d+) w-\d+ rounded-full/
  .exec(code(read("../AiChatDrawer.tsx")));
check(fab !== null, "د.٣ وقُرئ زرُّ المساعد العائم من مصدره");
if (fab && mobileBottom) {
  const fabTopPx = (Number(fab[1]) + Number(fab[2])) * SPACING_PX;   // إزاحة + ارتفاع
  const vpPad = Number(/(?:^|\s)p-(\d+)(?:\s|"|$)/.exec(viewport)?.[1] ?? 0) * SPACING_PX;
  const toastBottomPx = Number(mobileBottom[1]) * 16 + vpPad;        // rem = 16px
  check(toastBottomPx > fabTopPx,
    "د.٤ **وحافّةُ الإشعار تعلو زرَّ المساعد فعلاً** — فلم تنتقل المشكلة إليه",
    `الإشعار ${toastBottomPx}px · الزرّ يبدأ ${fabTopPx}px`);
  check(toastBottomPx - fabTopPx >= 8,
    "د.٥ وبفارقٍ يُرى لا بتماسٍّ حسابيّ",
    `الفارق ${toastBottomPx - fabTopPx}px`);
}

console.log("\n── هـ. وسطحُ المكتب كما كان بالحرف ──");
check(/sm:bottom-0/.test(viewport), "هـ.١ أسفلَ الشاشة من `sm`");
check(/sm:right-0/.test(viewport), "هـ.٢ وفي جهة اليمين — والزرُّ العائم في اليسار");
check(/sm:flex-col\b/.test(viewport), "هـ.٣ وترتيبُ الكومة كما كان");
check(/max-w-\[420px\]/.test(viewport), "هـ.٤ وعرضُه محدود لا ممتدّ");

console.log("\n── و. زرُّ الإغلاق يُرى ويُضغَط على الهاتف ──");
const closeStart = toastSrc.indexOf("ToastPrimitives.Close");
const close = code(toastSrc.slice(closeStart, toastSrc.indexOf("ToastClose.displayName")));
check(closeStart > 0 && close.includes("absolute"), "و.٠ وقُرئ صنفُ زرّ الإغلاق");
check(/\bopacity-100\b/.test(close),
  "و.١ **ظاهرٌ على الهاتف** — كان `opacity-0` بلا hover يكشفه");
check(!/(^|\s)opacity-0(\s|"|$)/.test(close),
  "و.٢ ولا `opacity-0` غيرَ مشروطة", close.slice(0, 300));
check(/sm:opacity-0/.test(close) && /sm:group-hover:opacity-100/.test(close),
  "و.٣ **وسطحُ المكتب كما كان** — يظهر بالـhover وحده");
const padMobile = Number(/(?:^|\s)p-(\d+)/.exec(close)?.[1] ?? 0);
check(padMobile >= 3,
  "و.٤ **وهدفُ لمسٍ حقيقيّ** — ١٦px أيقونة + حشوة ⟶ ≥٤٠px (كان ٢٤px)",
  `p-${padMobile}`);
check(/sm:p-1/.test(close), "و.٥ وحشوةُ سطح المكتب الصغيرة كما كانت");
check(/pr-12/.test(code(toastSrc)) && /sm:pr-8/.test(code(toastSrc)),
  "و.٦ وجسمُ الإشعار يترك مكاناً للزرّ الأكبر على الهاتف");

console.log("\n── ز. و`Toaster` يمرّر المهلةَ من الدالّة القانونية ──");
const toasterCode = code(read("./toaster.tsx"));
check(toasterCode.includes("toastDuration("),
  "ز.١ **من `toastDuration` لا رقمٌ منسوخٌ في الشاشة**");
check(/duration=\{toastDuration\(props\.variant, props\.duration\)\}/.test(toasterCode),
  "ز.٢ وبالنوع والمهلة الصريحة معاً — فالنداءُ الصريح يبقى مسموعاً");
check(toasterCode.indexOf("{...props}") < toasterCode.indexOf("duration={toastDuration"),
  "ز.٣ **وبعد النشر لا قبله** — وإلّا طمسها `duration` قديمٌ في الحمولة");

console.log(failures
  ? `\n❌ ${failures} حالة فاشلة`
  : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
