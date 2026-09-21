// مربّعُ كتابة المساعد الذكي — منطقٌ خالص، بلا React وبلا DOM.
// `npm run test:ai-chat-input`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **المربّعُ يتوسّع رأسياً بسطوره** حتى حدٍّ ثمّ يمرّر — لا جملةٌ طويلة
//     تمتدّ أفقياً فيُقطَع أوّلُها عن النظر.
// (٢) **وينكمش حين يُحذَف نصّ** — الارتفاعُ يُصفَّر قبل القياس، وإلّا لم يعد
//     `scrollHeight` ينقص تحت ارتفاعٍ مفروضٍ سلفاً.
// (٣) **وEnter يُرسل وShift+Enter سطرٌ جديد** — فالمربّعُ صار متعدّدَ الأسطر
//     ولا بدّ من بابٍ يكتب به الموظّفُ سطراً ثانياً بلا إرسال.
// (٤) **وتركيبُ الإدخال (IME) لا يُرسل** — ضغطتُه تُثبِّت الحرفَ لا السؤال.
// (٥) **والمؤشّرُ يبقى في المربّع بعد الإرسال**، والمربّعُ **لا يُعطَّل**
//     أثناء الانتظار (العنصرُ المعطَّل يفقد التركيزَ ولا يستعيده — وهو سببُ
//     العطب بعينه)، **ولا نسخةَ ثانية من قاعدة المفاتيح داخل المكوّن**.

import { readFileSync } from "fs";
import { join } from "path";
import {
  AI_CHAT_INPUT_MAX_HEIGHT_PX, grownInputHeight, shouldSendOnKey,
} from "./ai_chat_input";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MAX = AI_CHAT_INPUT_MAX_HEIGHT_PX;

console.log("── أ. الارتفاعُ يتبع السطورَ حتى الحدّ ──");
same("أ.١ سطرٌ واحد", grownInputHeight(36), 36);
same("أ.٢ سطران يكبران فعلاً", grownInputHeight(60), 60);
check(grownInputHeight(60) > grownInputHeight(36),
  "أ.٣ **وثلاثةُ أسطرٍ أطولُ من سطرين** — هذا هو التوسّع المطلوب");
same("أ.٤ وعند الحدّ بالضبط", grownInputHeight(MAX), MAX);
same("أ.٥ **وما فوق الحدّ يُقصَّر إليه**", grownInputHeight(MAX + 500), MAX);
check(grownInputHeight(9999) === MAX,
  "أ.٦ فالمربّعُ لا يبتلع النافذةَ مهما طال السؤال");

console.log("\n── ب. وينكمش، ولا يخترع ارتفاعاً من قياسٍ فاسد ──");
same("ب.١ قياسُ صفر (العنصرُ غيرُ مرسوم بعد) ⟶ لا يُفرَض ارتفاع", grownInputHeight(0), 0);
same("ب.٢ وقياسٌ سالب", grownInputHeight(-40), 0);
same("ب.٣ وNaN", grownInputHeight(Number.NaN), 0);
same("ب.٤ ولا نهائي", grownInputHeight(Number.POSITIVE_INFINITY), 0);
same("ب.٥ والكسرُ يُقرَّب", grownInputHeight(36.6), 37);
same("ب.٦ **وحدٌّ مخصَّص يُحترَم**", grownInputHeight(300, 80), 80);

console.log("\n── ج. Enter يُرسل، وShift+Enter سطرٌ جديد ──");
check(shouldSendOnKey({ key: "Enter", shiftKey: false }),
  "ج.١ **Enter وحدها تُرسل**");
check(!shouldSendOnKey({ key: "Enter", shiftKey: true }),
  "ج.٢ **وShift+Enter سطرٌ جديد لا إرسال**");
check(!shouldSendOnKey({ key: "a", shiftKey: false }),
  "ج.٣ وحرفٌ عاديّ لا يُرسل");
check(!shouldSendOnKey({ key: "Tab", shiftKey: false }),
  "ج.٤ ولا Tab");
check(!shouldSendOnKey({ key: "Escape", shiftKey: false }),
  "ج.٥ ولا Escape");
check(!shouldSendOnKey({ key: "enter", shiftKey: false }),
  "ج.٦ والمطابقةُ حسّاسةٌ للحالة — `enter` ليست مفتاحَ المتصفّح");

console.log("\n── د. وتركيبُ الإدخال (IME) لا يُرسل السؤال ──");
check(!shouldSendOnKey({ key: "Enter", shiftKey: false, isComposing: true }),
  "د.١ **Enter أثناء التركيب تُثبِّت الحرفَ لا ترسل**");
check(shouldSendOnKey({ key: "Enter", shiftKey: false, isComposing: false }),
  "د.٢ وبعد انتهاء التركيب تُرسل");
check(shouldSendOnKey({ key: "Enter", shiftKey: false }),
  "د.٣ وغيابُ الراية يُقرأ «لا تركيب» — لا يُعطِّل الإرسال");

console.log("\n── هـ. عقدُ الشاشة: `AiChatDrawer.tsx` ──");
const drawer = readFileSync(
  join(process.cwd(), "client/src/components/AiChatDrawer.tsx"), "utf8");

//  موضعُ المربّع نفسِه — لا الملفّ كلّه: الملفُّ فيه مربّعاتٌ أخرى
//  (نموذجُ الاقتراح، وجوابُ الاختبار) لا شأنَ لها بهذا العقد.
const i = drawer.indexOf('data-testid="input-ai-chat"');
check(i > 0, "هـ.٠ مربّعُ السؤال موجودٌ بوسمه");
const start = drawer.lastIndexOf("<", i - 1);
const box = drawer.slice(drawer.lastIndexOf("<Textarea", i), drawer.indexOf("/>", i) + 2);
check(start > 0 && box.includes('data-testid="input-ai-chat"'),
  "هـ.٠أ وقُرئ وسمُه كاملاً");

check(box.startsWith("<Textarea"),
  "هـ.١ **مربّعٌ متعدّدُ الأسطر لا `<Input>`** — وهو ما كان يقطع الجملةَ أفقياً");
check(/rows=\{1\}/.test(box),
  "هـ.٢ ويبدأ بسطرٍ واحد فلا يحتلّ النافذةَ وهو فارغ");
check(/resize-none/.test(box),
  "هـ.٣ ولا مقبضَ تحجيمٍ يدويّ — الارتفاعُ يتبع المحتوى");
check(/overflow-y-auto/.test(box),
  "هـ.٤ ويمرّر رأسياً بعد الحدّ");
check(box.includes("AI_CHAT_INPUT_MAX_HEIGHT_PX"),
  "هـ.٥ **والحدُّ من الثابت القانونيّ** لا رقمٌ منسوخٌ في الشاشة");

check(!/\bdisabled=/.test(box),
  "هـ.٦ **ولا `disabled` على المربّع إطلاقاً** — المعطَّلُ يفقد التركيزَ ولا " +
  "يستعيده، وهو سببُ خروج المؤشّر");
check(/disabled=\{!draft\.trim\(\) \|\| askMutation\.isPending\}/.test(drawer),
  "هـ.٦أ **والزرُّ وحده يُعطَّل** — فمنعُ الإرسال المزدوج باقٍ");

check(/inputRef\.current\?\.focus\(\)/.test(drawer),
  "هـ.٧ **والمؤشّرُ يُعاد إلى المربّع بعد الإرسال**");
const sendBody = drawer.slice(drawer.indexOf("const send = (text: string)"),
  drawer.indexOf("if (!canUse) return null;"));
check(sendBody.includes("inputRef.current?.focus()"),
  "هـ.٧أ **وداخل `send` نفسِها** — فيغطّي الزرَّ وEnter معاً لا أحدَهما");
const clearAt = sendBody.indexOf('setDraft("")');
const focusAt = sendBody.indexOf("inputRef.current?.focus()");
check(clearAt >= 0 && focusAt > clearAt,
  "هـ.٧ب وبعد تفريغ المسوّدة لا قبله — **والحضورُ شرطٌ قبل الترتيب**");

check(box.includes("shouldSendOnKey("),
  "هـ.٨ **وقاعدةُ المفاتيح من الدالّة الخالصة**");
check(!/e\.key === "Enter"/.test(drawer) && !/shiftKey\s*\)/.test(drawer.replace(/shiftKey: e\.shiftKey/g, "")),
  "هـ.٨أ **ولا نسخةَ ثانية منها في المكوّن** — فلا تنحرف إحداهما عن الأخرى");
check(box.includes("e.nativeEvent.isComposing"),
  "هـ.٨ب ورايةُ التركيب تصلها من الحدث الحقيقيّ");

check(/grownInputHeight\(el\.scrollHeight\)/.test(drawer),
  "هـ.٩ **والارتفاعُ من الدالّة الخالصة كذلك**");

//  قاعدةُ القياس في موضعٍ واحد — `measureAiChatInput` — يناديه البابان.
const measure = drawer.slice(drawer.indexOf("function measureAiChatInput("),
  drawer.indexOf("export function AiChatDrawer()"));
check(measure.startsWith("function measureAiChatInput("),
  "هـ.٩أ٠ وقُرئت دالّةُ القياس");
const autoAt = measure.indexOf('el.style.height = "auto"');
const growAt = measure.indexOf("grownInputHeight");
check(autoAt >= 0 && growAt > autoAt,
  "هـ.٩أ **ويُصفَّر قبل القياس** — وإلّا لم ينكمش المربّعُ بعد الحذف أبداً");
check((drawer.match(/el\.style\.height = "auto"/g) ?? []).length === 1
  && (drawer.match(/grownInputHeight\(/g) ?? []).length === 1,
  "هـ.٩أ٢ **ولا نسخةَ ثانية من القاعدة في الشاشة** — بابان ينادِيان دالّةً واحدة");

const effect = drawer.slice(drawer.indexOf("useLayoutEffect(("),
  drawer.indexOf("const send = (text: string)"));
check(/\[draft, open\]/.test(effect),
  "هـ.٩ب ويُعاد الحسابُ مع كلّ حرفٍ ومع فتح النافذة");
check(/measureAiChatInput\(el\)/.test(effect),
  "هـ.٩ج والأثرُ ينادي الدالّةَ نفسَها");

//  ══ هـ.١٠ **وإعادةُ التركيب تُقاس — لا تغيُّرُ المحتوى وحده** ═════════════
//  المربّعُ يُفكَّك حين تُفتَح لوحةُ التدريب ويُعاد تركيبُه حين تُغلَق،
//  و`draft`/`open` لا يتغيّران عبر ذلك التبديل — فمسوّدةُ سطرين كانت تبقى في
//  مربّعٍ ارتفاعُه سطرٌ واحد حتى يكتب الموظّفُ حرفاً آخر.
const condAt = drawer.lastIndexOf("{!trainingOpen && (", i);
check(condAt > 0 && condAt < i,
  "هـ.١٠ **والمربّعُ مشروطٌ فعلاً بإغلاق لوحة التدريب** — فالتفكيكُ واقعٌ لا " +
  "مفترَض، وبدونه كان هذا القسمُ يحرس لا شيء");

check(/ref=\{attachInput\}/.test(box) && !/ref=\{inputRef\}/.test(box),
  "هـ.١٠أ **والربطُ دالّةٌ تقيس لحظةَ التركيب** لا كائنُ مرجعٍ صامت");
const attach = drawer.slice(drawer.indexOf("const attachInput = useCallback("),
  drawer.indexOf("const scrollRef"));
check(attach.startsWith("const attachInput = useCallback("),
  "هـ.١٠ب وقُرئ جسمُ الربط");
check(/measureAiChatInput\(el\)/.test(attach),
  "هـ.١٠ج **ويقيس العنصرَ الجديد فور ربطه** — فأيُّ إعادة تركيبٍ تُقاس مهما " +
  "كان الشرطُ الذي فكّكه، لا هذا الشرطُ وحده");
check(/\}, \[\]\);/.test(attach),
  "هـ.١٠د **وثابتٌ بـ`useCallback([])`** — وإلّا فُكّ الربطُ وأُعيد في كلّ رسم");
check(/inputRef\.current = el/.test(attach),
  "هـ.١٠هـ **ويكتب المرجعَ كما كان** — فإعادةُ المؤشّر في `send` تبقى تعمل");

console.log(failures
  ? `\n❌ ${failures} حالة فاشلة`
  : "\n✅ كل الفحوص نجحت");
process.exit(failures ? 1 : 0);
