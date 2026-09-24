//  اختبارُ لونِ صفّ لوحة التصنيع وسببِه — بلا قاعدة بيانات ولا شبكة.
//  تشغيل:  npm run test:manufacturing-row-tone
//
//  قرارُ المالك ٢٠٢٦-٠٩-٢٤: «المتأخرون هم الذين ليس لديهم أي عذر للتأخير
//  … لذلك يكونوا أحمر. أما من لديه عذر … أو أي عذر فيجب أن يكون أصفر.
//  وطبعاً المكتمل أخضر.» ثمّ: «انظر كيف الأصفر يعرض السبب كاملاً.»

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  rowToneOf, orderLatenessNotice, EXCUSE_PLACE_HINT_RED, EXCUSE_PLACE_HINT_AMBER,
  EXCUSE_PLACE_HINT_RED_HELD, heldExcuseOf, holdButtonShown,
  type RowToneOrderLike,
} from "./manufacturing_row_tone";
import { REASON_CODE_LABELS, HOLD_STATUSES, HOLD_REASONS } from "../../../shared/manufacturing";
import { cn } from "../lib/utils";

const here = path.dirname(fileURLToPath(import.meta.url));
const pageSrc = fs.readFileSync(path.join(here, "Manufacturing.tsx"), "utf8");
const toneSrc = fs.readFileSync(path.join(here, "manufacturing_row_tone.ts"), "utf8");
const notifSrc = fs.readFileSync(path.join(here, "Notifications.tsx"), "utf8");
const cardSrc = fs.readFileSync(path.join(here, "../components/ui/card.tsx"), "utf8");

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, extra = "") {
  if (cond) { pass++; console.log(`✓ ${name}`); }
  else { fail++; console.error(`✗ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function eq(name: string, got: unknown, want: unknown) {
  ok(name, got === want, `got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
}

function order(p: Partial<RowToneOrderLike> = {}): RowToneOrderLike {
  return { status: "active", isOverdue: false, holdReasonCode: null, holdNote: null, ...p };
}

// ══ أ. قرارُ المالك الثلاثيّ ═══════════════════════════════════════════════
console.log("\n── أ. الأحمر والأصفر والأخضر ──");

const lateNoExcuse = rowToneOf(order({ isOverdue: true }));
eq("أ١. متأخّرٌ ولم يكتب الخبيرُ عذراً ⟶ أحمر", lateNoExcuse.tone, "red");
eq("أ٢. وبطاقتُه حمراءُ كاملة", lateNoExcuse.cardClass, "border-red-300 bg-red-50");
eq("أ٣. ولا سببَ يُعرَض — لا عذرَ أصلاً", lateNoExcuse.reason, null);

const lateExcused = rowToneOf(order({
  isOverdue: true, status: "waiting_patient", holdReasonCode: "patient_no_show",
}));
eq("أ٤. متأخّرٌ ولديه عذرٌ مكتوب ⟶ أصفر", lateExcused.tone, "amber");
eq("أ٥. وبطاقتُه كهرمانيّةٌ كاملة", lateExcused.cardClass, "border-amber-300 bg-amber-50");

const done = rowToneOf(order({ status: "completed" }));
eq("أ٦. المكتملُ ⟶ أخضر", done.tone, "green");
eq("أ٧. وبطاقتُه خضراءُ كاملة", done.cardClass, "border-green-300 bg-green-50");

// ══ ب. «أو أيّ عذر» — الأربعةُ كلُّها ══════════════════════════════════════
console.log("\n── ب. كلُّ عذرٍ مكتوبٍ أصفر، متأخّراً كان أو في موعده ──");

const HOLDS: [string, string][] = [
  ["waiting_patient", "patient_no_show"],
  ["waiting_materials", "materials_unavailable"],
  ["medical_hold", "swelling"],
  ["technical_rework", "socket_fit"],
];
for (const [status, code] of HOLDS) {
  eq(`ب. ${status} متأخّراً ⟶ أصفر`,
    rowToneOf(order({ status, holdReasonCode: code, isOverdue: true })).tone, "amber");
  eq(`ب. ${status} في موعده ⟶ أصفر`,
    rowToneOf(order({ status, holdReasonCode: code, isOverdue: false })).tone, "amber");
}

// ══ ج. ما يعمل بلا توقّفٍ ولا تأخّر يبقى محايداً ═══════════════════════════
console.log("\n── ج. المحايد ──");

const plain = rowToneOf(order({ status: "active" }));
eq("ج١. أمرٌ يعمل في موعده ⟶ بلا لون", plain.tone, "plain");
eq("ج٢. وصنفُ بطاقته فارغ", plain.cardClass, "");
eq("ج٣. ولا سببَ عليه", plain.reason, null);
eq("ج٤. أمرٌ جديد كذلك", rowToneOf(order({ status: "new" })).tone, "plain");

// ══ د. المنتهي يسبق كلَّ شيء ═══════════════════════════════════════════════
console.log("\n── د. المنتهي أوّلاً ──");

eq("د١. مكتملٌ يحمل رمزَ توقّفٍ قديم ⟶ يبقى أخضر",
  rowToneOf(order({ status: "completed", holdReasonCode: "swelling" })).tone, "green");
eq("د٢. ولا يُعرَض عليه سببُ توقّف",
  rowToneOf(order({ status: "completed", holdReasonCode: "swelling" })).reason, null);
eq("د٣. مكتملٌ ومتأخّرُ التسليم ⟶ يبقى أخضر",
  rowToneOf(order({ status: "completed", isOverdue: true })).tone, "green");
eq("د٤. الملغى ⟶ رماديّ",
  rowToneOf(order({ status: "cancelled", isOverdue: true })).tone, "slate");
eq("د٥. وبطاقتُه رماديّةٌ كاملة",
  rowToneOf(order({ status: "cancelled" })).cardClass, "border-slate-300 bg-slate-50");
eq("د٦. ولا سببَ على ملغى",
  rowToneOf(order({ status: "cancelled", holdReasonCode: "swelling" })).reason, null);

// ══ هـ. السببُ يُعرَض كاملاً ═══════════════════════════════════════════════
console.log("\n── هـ. «انظر كيف الأصفر يعرض السبب كاملاً» ──");

const withNote = rowToneOf(order({
  status: "waiting_materials", isOverdue: true,
  holdReasonCode: "component_delay", holdNote: "المفصل من تركيا",
}));
ok("هـ١. السببُ حاضر", withNote.reason !== null);
eq("هـ٢. وعنوانُه من المعجم القانونيّ",
  withNote.reason?.label, REASON_CODE_LABELS["component_delay"]);
eq("هـ٣. وهو «تأخّر وصول مكوّن» بحرفه", withNote.reason?.label, "تأخّر وصول مكوّن");
eq("هـ٤. وما كتبه الخبيرُ بيده يُعرَض معه", withNote.reason?.note, "المفصل من تركيا");
eq("هـ٥. والمتأخّرُ يُقال «سببُ التأخير»", withNote.reason?.prefix, "سببُ التأخير");

const onTimeHold = rowToneOf(order({
  status: "waiting_patient", isOverdue: false, holdReasonCode: "patient_no_show",
}));
eq("هـ٦. ومَن توقّف في موعده يُقال «سببُ التوقّف» — لا يُدَّعى تأخّر",
  onTimeHold.reason?.prefix, "سببُ التوقّف");
eq("هـ٧. وبلا ملاحظةٍ يبقى السببُ وحدَه", onTimeHold.reason?.note, null);
eq("هـ٨. وملاحظةٌ بياضٌ وحدَها تُقرأ غياباً",
  rowToneOf(order({ status: "medical_hold", holdReasonCode: "swelling", holdNote: "   " })).reason?.note, null);

// ══ و. الفراغُ ليس عذراً ═══════════════════════════════════════════════════
console.log("\n── و. لا عذرَ يُلفَّق ──");

for (const bad of ["", "   ", null]) {
  const d = rowToneOf(order({ isOverdue: true, holdReasonCode: bad as string | null }));
  eq(`و. ${JSON.stringify(bad)} ⟶ يبقى أحمر`, d.tone, "red");
  eq(`و. ${JSON.stringify(bad)} ⟶ بلا سبب`, d.reason, null);
}

// ══ ز. رمزٌ لا نعرفه يُقال كما هو ══════════════════════════════════════════
console.log("\n── ز. المجهولُ يُقال ولا يُفرَّغ ──");

const unknown = rowToneOf(order({ status: "waiting_materials", holdReasonCode: "some_new_code_2030" }));
eq("ز١. رمزٌ خارج المعجم ⟶ يُعرَض كما هو", unknown.reason?.label, "some_new_code_2030");
eq("ز٢. وهو أصفرُ كغيره", unknown.tone, "amber");
ok("ز٣. والخادمُ يفعل الشيءَ نفسَه في نقطة التنبيهات",
  /REASON_CODE_LABELS\[o\.holdReasonCode\] \?\? o\.holdReasonCode/.test(
    fs.readFileSync(path.join(here, "../../../server/manufacturing/routes.ts"), "utf8")));

// ══ س. العذرُ يبقى بعد الاستئناف (قرارُ المالك ٢٠٢٦-٠٩-٢٤ — ثانياً) ══════
//  «لا يضيع عذرٌ مهما كان»: الاستئنافُ لم يعد يُصفّر العذر، فأمرٌ يعمل
//  (`active`) قد يحمل عذراً مكتوباً. يُلوِّنه متى تأخّر، ويسكت متى كان في موعده.
console.log("\n── س. الاستئنافُ لا يُسقط العذر ──");

const resumedLate = rowToneOf(order({
  status: "active", isOverdue: true, holdReasonCode: "component_delay", holdNote: "البرلون",
}));
eq("س١. استُؤنف وبقي عذرُه وهو متأخّر ⟶ أصفر لا أحمر (شكلُ وهج)", resumedLate.tone, "amber");
eq("س٢. وشارتُه «متأخر بعذر»", resumedLate.overdueBadgeLabel, "متأخر بعذر");
eq("س٣. وسببُه يُقال «سببُ التأخير»", resumedLate.reason?.prefix, "سببُ التأخير");
eq("س٤. بعنوانه وما كتبه الخبيرُ بيده",
  [resumedLate.reason?.label, resumedLate.reason?.note].join(" — "), "تأخّر وصول مكوّن — البرلون");

const resumedOnTime = rowToneOf(order({
  status: "active", isOverdue: false, holdReasonCode: "component_delay", holdNote: "البرلون",
}));
eq("س٥. استُؤنف ولم يحِن موعدُه ⟶ بلا لون — عذرٌ لا يعذر شيئاً الآن", resumedOnTime.tone, "plain");
eq("س٦. ولا يُعرَض عليه سببُ توقّفٍ وهو لا يتوقّف", resumedOnTime.reason, null);
eq("س٧. ومتوقّفٌ في موعده يبقى أصفر كما كان",
  rowToneOf(order({ status: "waiting_materials", isOverdue: false, holdReasonCode: "component_delay" })).tone, "amber");
eq("س٨. وعاملٌ متأخّرٌ لم يُكتب له عذرٌ قطّ يبقى أحمر",
  rowToneOf(order({ status: "active", isOverdue: true })).tone, "red");

// ══ ح. شارةُ «متأخر» تتبع العذرَ كذلك ══════════════════════════════════════
console.log("\n── ح. الشارة ──");

eq("ح١. متأخّرٌ بلا عذرٍ ⟶ شارةٌ حمراء",
  lateNoExcuse.overdueBadgeClass, "bg-red-100 text-red-800 border-red-200");
eq("ح٢. متأخّرٌ بعذرٍ ⟶ شارةٌ كهرمانيّة",
  lateExcused.overdueBadgeClass, "bg-amber-100 text-amber-800 border-amber-200");
//  «لا تحسبهم متأخرون، وإنما نقول عنهم متأخرون بعذر» (٢٠٢٦-٠٩-٢٤) — الشارةُ
//  تقول الكلمتين كما يقولهما المالك، لا «متأخر» واحدةً للاثنين.
eq("ح٣. **ونصُّ الشارة الكهرمانيّة «متأخر بعذر»**", lateExcused.overdueBadgeLabel, "متأخر بعذر");
eq("ح٤. والحمراءُ «متأخر بدون عذر» — كالشريط الذي يُرشِّحها", lateNoExcuse.overdueBadgeLabel, "متأخر بدون عذر");
eq("ح٥. وبياضٌ وحده ليس عذراً فشارتُه حمراء",
  rowToneOf(order({ isOverdue: true, holdReasonCode: "  " })).overdueBadgeLabel, "متأخر بدون عذر");

// ══ ط. عقدُ الشاشة ═════════════════════════════════════════════════════════
console.log("\n── ط. عقدُ الشاشة ──");

const noComments = pageSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

ok("ط١. الصفحةُ تستورد القرارَ الخالص",
  /import \{ rowToneOf \} from "\.\/manufacturing_row_tone"/.test(noComments));
ok("ط٢. والصفُّ يناديه", /const t = rowToneOf\(o\);/.test(noComments));
ok("ط٣. والبطاقةُ تلبس صنفَه لا صنفاً مكتوباً هنا",
  /<Card className=\{`hover:shadow-sm transition-shadow cursor-pointer \$\{t\.cardClass\}`\}>/.test(noComments));
ok("ط٤. ولا قاعدةَ لونٍ ثانية في الصفحة: لا حاشيةَ المتأخّر القديمة",
  !/o\.isOverdue \? "border-red-300"/.test(noComments));
ok("ط٥. ولا سلسلةَ بطاقةٍ ملوّنة مكتوبةٌ في الصفحة",
  !/border-(red|amber|green|slate)-300 bg-\1-50/.test(noComments));
ok("ط٦. واسمُ المريض سطرٌ قائمٌ بذاته بخطٍّ أعرض",
  /<div className="text-base font-bold leading-tight break-words">\{o\.patientName\}<\/div>/.test(noComments));
ok("ط٧. والسببُ يُرسَم كاملاً — العنوانُ والملاحظة",
  /\{t\.reason\.prefix\}: \{t\.reason\.label\}/.test(noComments)
  && /\{t\.reason\.note && <span className="text-amber-700"> — \{t\.reason\.note\}<\/span>\}/.test(noComments));
ok("ط٨. ولا يُرسَم إلّا حين يوجد", /\{t\.reason && \(/.test(noComments));
ok("ط٩. وشارةُ «متأخر» تلبس صنفَ القرار",
  /<Badge className=\{`text-xs gap-1 \$\{t\.overdueBadgeClass\}`\}>/.test(noComments));
ok("ط٩ب. **ونصُّها من القرار لا «متأخر» مكتوبةً** للاثنين",
  /<AlertTriangle className="w-3 h-3" \/> \{t\.overdueBadgeLabel\}/.test(noComments)
  && !/<AlertTriangle className="w-3 h-3" \/> متأخر\s*</.test(noComments));
ok("ط٩ج. **وقاعدةُ العذر واحدة**: اللونُ يستورد التعريفَ المشترك ولا يكتب نسخةً منه",
  /import \{[^}]*\bwrittenHoldExcuse\b[^}]*\} from "@shared\/manufacturing"/.test(toneSrc)
  && !/function writtenExcuse/.test(toneSrc));
ok("ط١٠. والحقلان يصلان العقدَ من الخادم",
  /holdReasonCode: string \| null; holdNote: string \| null;/.test(noComments));

// ══ ي. الشاشتان لا تفترقان في المعنى ولا في درجة اللون ═════════════════════
console.log("\n── ي. لا لونَ ثالثٌ يُخترَع ──");

//  السلسلةُ عينُها التي تلبسها شاشةُ التنبيهات للمعنى نفسِه — **حرفاً
//  بحرف**: الشاشتان تلبسان اللونَ على `Card` نفسِها بالطريقة نفسِها.
for (const [border, bg] of [
  ["border-red-300", "bg-red-50"],
  ["border-amber-300", "bg-amber-50"],
  ["border-green-300", "bg-green-50"],
] as [string, string][]) {
  ok(`ي. «${border} ${bg}» سلسلتُها عينُها في شاشة التنبيهات`,
    notifSrc.includes(`"${border} ${bg}"`) && toneSrc.includes(`"${border} ${bg}"`));
}
ok("ي٤. والشاشتان تقيسان العذرَ بالشيء نفسِه — سببُ التوقّف القادمُ من الخادم",
  /i\.holdReasonLabel/.test(notifSrc) && /holdReasonCode/.test(toneSrc));
ok("ي٥. وشاشةُ التنبيهات تعرض سببَها كاملاً كما تفعل اللوحةُ الآن",
  /سببُ التأخير: \{i\.holdReasonLabel\}/.test(notifSrc));
ok("ي٦. ولا علامةَ أولويةٍ في اللوحة — لا عطبَ تُعالجه (القسم ل)",
  !/!bg-/.test(toneSrc.replace(/^\s*\/\/.*$/gm, "")));

// ══ ك. لا ساعةَ ولا شبكةَ في القرار ════════════════════════════════════════
console.log("\n── ك. نقاءُ القرار ──");

ok("ك١. بلا قراءةِ ساعةِ الجهاز", !/new Date\(/.test(toneSrc) && !/Date\.now\(/.test(toneSrc));
ok("ك٢. وبلا React", !/from "react"/.test(toneSrc));
ok("ك٣. ومعجمُه واحدٌ مستورَد لا مكتوبٌ فيه",
  //  يُطابَق الاستيرادُ بما فيه لا بنصّه كاملاً — فاستيرادُ التعريف المشترك
  //  بجواره (`writtenHoldExcuse`) لا يُقرأ «معجماً مكتوباً هنا».
  /import \{[^}]*\bREASON_CODE_LABELS\b[^}]*\} from "@shared\/manufacturing"/.test(toneSrc)
  && !/waiting_patient:\s*"/.test(toneSrc));

// ══ ل. اللونُ يصل البطاقةَ لأن `cn` تُسقط `bg-card` ════════════════════════
console.log("\n── ل. البطاقةُ الحقيقيّة تلبس اللون ──");

//  **الحارسُ على الآليّة الحقيقيّة لا على صفحةٍ تُكتب باليد**: `Card` تمرّر
//  صنفَها عبر `cn` (`twMerge`)، فتُسقط `bg-card` حين يصلها لونٌ آخر — فلا
//  يجتمع الصنفان على العنصر ولا ترتيبَ في الحزمة يُحسَم به شيء. وقياسٌ
//  سابقٌ جمعهما باليد متخطّياً `cn` فادّعى أن الكهرمانيَّ يخسر — وهو لا يخسر.
//  فيُشغَّل هنا `cn` الحقيقيّ على قاعدة `Card` الحقيقيّة المقروءة من ملفّها.
const cardBase = cardSrc.match(/const Card = React\.forwardRef[\s\S]*?cn\(\s*"([^"]+)"/)?.[1] ?? "";
ok("ل١. قاعدةُ البطاقة مقروءةٌ من ملفّها وتحمل `bg-card`",
  cardBase.split(/\s+/).includes("bg-card"), JSON.stringify(cardBase));

const tokens = (s: string) => s.split(/\s+/).filter(Boolean);
const boardTones = (["red", "amber", "green", "slate"] as const).map((tone) => {
  const d = rowToneOf(order(
    tone === "red" ? { isOverdue: true }
      : tone === "amber" ? { status: "waiting_materials", holdReasonCode: "component_delay", isOverdue: true }
      : tone === "green" ? { status: "completed" }
      : { status: "cancelled" }));
  return [`اللوحة/${tone}`, `hover:shadow-sm transition-shadow cursor-pointer ${d.cardClass}`] as const;
});
const notifTones = [
  ...[...notifSrc.matchAll(/tone: "([^"]+)"/g)].map((m) => m[1]),
  ...[...notifSrc.matchAll(/function toneFor[\s\S]*?return "([^"]+)"/g)].map((m) => m[1]),
].map((cls) => [`التنبيهات/${cls}`, `${cls} hover:shadow-sm transition-shadow cursor-pointer`] as const);
ok("ل٢. وألوانُ التنبيهات مقروءةٌ كلُّها (خمسةُ أقسامٍ ولونُ العذر)", notifTones.length === 6,
  String(notifTones.length));

for (const [label, cls] of [...boardTones, ...notifTones]) {
  const bg = tokens(cls).find((t) => /^bg-[a-z]+-50$/.test(t));
  const merged = tokens(cn(cardBase, cls));
  ok(`ل. ${label}: لا \`bg-card\` على العنصر، ولونُه حاضر`,
    !!bg && !merged.includes("bg-card") && merged.includes(bg), merged.join(" "));
}
//  **وشاهدُ عدم الفراغ**: الجمعُ باليد — ما فعلته صفحةُ القياس السابقة —
//  يُبقي الصنفين معاً. فالحارسُ أعلاه يقيس دالّةَ الدمج لا فراغاً.
ok("ل٣. والجمعُ باليد بلا `cn` يُبقي الصنفين معاً (شاهدُ القياس الخاطئ)",
  tokens(`${cardBase} border-amber-300 bg-amber-50`).includes("bg-card"));
ok("ل٤. والشاشتان تلبسان اللونَ على `Card` لا على عنصرٍ سواها",
  /<Card className=\{`hover:shadow-sm transition-shadow cursor-pointer \$\{t\.cardClass\}`\}>/.test(pageSrc)
  && /<Card className=\{`\$\{toneFor\(i, tone\)\}/.test(notifSrc));

// ══ ع. صفحةُ الأمر: تنبيهُ التأخّر والمكانُ الواحد للعذر ═══════════════════
//  قرارُ المالك (٢٠٢٦-٠٩-٢٤ — ثانياً): «تُلزم الخبير بمكان كتابة عذرٍ واحد،
//  وتجعل التطبيق يقرأ فقط من هذا المكان». فالصفحةُ تدلّ عليه حين يلزم.
console.log("\n── ع. صفحةُ الأمر تدلّ على المكان الواحد ──");

const orderSrc = fs.readFileSync(path.join(here, "ManufacturingOrder.tsx"), "utf8");
const orderCode = orderSrc.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const nRed = orderLatenessNotice(order({ status: "active", isOverdue: true }));
eq("ع١. عاملٌ متأخّرٌ بلا عذر ⟶ تنبيهٌ أحمر", nRed?.tone, "red");
eq("ع٢. عنوانُه «متأخر بدون عذر» كشارة الصفّ", nRed?.title, "متأخر بدون عذر");
eq("ع٣. وجملتُه تدلّ على المكان الواحد", nRed?.hint, EXCUSE_PLACE_HINT_RED);
ok("ع٤. والجملةُ تسمّي «توقّف / مشكلة» وتقول «الوحيد»",
  /«توقّف \/ مشكلة»/.test(EXCUSE_PLACE_HINT_RED) && /الوحيد/.test(EXCUSE_PLACE_HINT_RED));

const nAmber = orderLatenessNotice(order({
  status: "active", isOverdue: true, holdReasonCode: "component_delay", holdNote: "البرلون",
}));
eq("ع٥. عاملٌ متأخّرٌ بعذرٍ باقٍ ⟶ تنبيهٌ كهرمانيّ", nAmber?.tone, "amber");
eq("ع٦. عنوانُه «متأخر بعذر»", nAmber?.title, "متأخر بعذر");
eq("ع٧. وعذرُه ظاهر بما كتبه الخبير", nAmber?.reason?.note, "البرلون");
eq("ع٨. وجملتُه تقول إن العذر باقٍ", nAmber?.hint, EXCUSE_PLACE_HINT_AMBER);

eq("ع٩. متوقّفٌ متأخّر ⟶ لا تنبيهَ ثانٍ (بطاقةُ «متوقّف» تعرض سببَه)",
  orderLatenessNotice(order({ status: "waiting_materials", isOverdue: true, holdReasonCode: "component_delay" })), null);
eq("ع١٠. في موعده ⟶ لا تنبيه",
  orderLatenessNotice(order({ status: "active", isOverdue: false, holdReasonCode: "component_delay" })), null);
eq("ع١١. مكتمل ⟶ لا تنبيه",
  orderLatenessNotice(order({ status: "completed", isOverdue: true })), null);
eq("ع١٢. ملغى ⟶ لا تنبيه",
  orderLatenessNotice(order({ status: "cancelled", isOverdue: true })), null);
eq("ع١٣. صنفُ الأحمر سلسلةٌ حرفية كاملة", nRed?.cardClass, "border-red-300 bg-red-50/50");
eq("ع١٤. وصنفُ الكهرمانيّ كذلك", nAmber?.cardClass, "border-amber-300 bg-amber-50/50");

ok("ع١٥. الصفحةُ تستورد القرارَ الخالص ولا تعيد كتابتَه",
  /import \{[^}]*\borderLatenessNotice\b[^}]*\} from "\.\/manufacturing_row_tone"/.test(orderCode)
  && /orderLatenessNotice\(\{/.test(orderCode));
ok("ع١٦. وتعرض التنبيهَ بلونه",
  /data-testid=\{`notice-lateness-\$\{lateness\.tone\}`\}/.test(orderCode)
  && /\{lateness\.hint\}/.test(orderCode));
ok("ع١٧. «ملاحظات فنّية» تقول إنها ليست عذراً وتدلّ على المكان الواحد",
  /data-testid="hint-notes-not-excuse"[\s\S]{0,200}لا عذرُ تأخير[\s\S]{0,80}«توقّف \/ مشكلة»/.test(orderCode));
ok("ع١٨. و«سبب التغيير» في نافذة الموعد كذلك",
  /data-testid="hint-date-reason-not-excuse"[\s\S]{0,200}لا يُحسب عذراً للتأخير[\s\S]{0,80}«توقّف \/ مشكلة»/.test(orderCode));
ok("ع١٩. ونافذةُ «توقّف / مشكلة» تقول إنها وحدَها مكانُ العذر وإنه يبقى",
  /data-testid="hint-single-excuse-place"[\s\S]{0,200}هنا وحدَه يُكتب سببُ التأخير[\s\S]{0,120}حتى التسليم/.test(orderCode));
ok("ع٢٠. وحقلُ «متأخر» يأتي من الخادم لا من حسابٍ في المتصفّح",
  /isOverdue: order\.isOverdue === true/.test(orderCode) && !/toLocaleDateString\("en-CA"/.test(orderCode));

// ══ ف. المتوقّفُ بلا سببٍ مكتوب — مراجعة Codex على ٤٠٣ ══════════════════
//  ترحيلا ٠٤٥ و٠٤٦ حوّلا الحالاتِ القديمة إلى حالات توقّفٍ **بلا تعبئة
//  السبب**. واللوحةُ تعدّ الأمرَ «متأخر بدون عذر»، فصفحتُه يجب أن تقول ذلك
//  وتفتح له المكانَ الواحد — لا أن تصمت لأنه «متوقّف».
console.log("\n── ف. المتوقّفُ بلا سببٍ مكتوب ──");

for (const st of HOLD_STATUSES) {
  const n = orderLatenessNotice(order({ status: st, isOverdue: true }));
  ok(`ف١. «${st}» بلا سبب ومتأخّر ⟶ تنبيهٌ أحمر «متأخر بدون عذر» بجملة المتوقّف`,
    n?.tone === "red" && n?.title === "متأخر بدون عذر" && n?.reason === null
      && n?.hint === EXCUSE_PLACE_HINT_RED_HELD,
    JSON.stringify(n));
}
eq("ف٢. والبياضُ ليس سبباً — تنبيهٌ أحمر كذلك",
  orderLatenessNotice(order({ status: "waiting_materials", isOverdue: true, holdReasonCode: "  " }))?.tone,
  "red");
eq("ف٣. متوقّفٌ بلا سبب **في موعده** ⟶ لا تنبيه (لا تأخّرَ يُقال عنه شيء)",
  orderLatenessNotice(order({ status: "waiting_materials", isOverdue: false })), null);
ok("ف٤. وجملتُه تقول لماذا يُعدّ بلا عذر، وتسمّي «توقّف / مشكلة» وتقول «الوحيد»",
  /متوقّفٌ بلا سببٍ مكتوب/.test(EXCUSE_PLACE_HINT_RED_HELD)
  && /«توقّف \/ مشكلة»/.test(EXCUSE_PLACE_HINT_RED_HELD) && /الوحيد/.test(EXCUSE_PLACE_HINT_RED_HELD));
eq("ف٥. والعاملُ بلا عذر يبقى على جملته القديمة بحرفها",
  orderLatenessNotice(order({ status: "active", isOverdue: true }))?.hint, EXCUSE_PLACE_HINT_RED);

//  البطاقةُ والتنبيهُ **شرطٌ واحد**: لكلّ متوقّفٍ متأخّر يظهر أحدُهما بالضبط.
const causes: Array<string | null> = [null, "", "  ", "component_delay", "legacy_code_x"];
let exactlyOne = true; const broken: string[] = [];
for (const st of HOLD_STATUSES) for (const c of causes) {
  const o = order({ status: st, isOverdue: true, holdReasonCode: c });
  const card = heldExcuseOf(o) !== null;
  const notice = orderLatenessNotice(o) !== null;
  if (card === notice) { exactlyOne = false; broken.push(`${st}/${JSON.stringify(c)}`); }
}
ok("ف٦. **لكلّ متوقّفٍ متأخّر: بطاقةُ السبب أو التنبيه — أحدُهما بالضبط**", exactlyOne, broken.join(" · "));
eq("ف٧. والبطاقةُ تعرض السببَ مقصوصاً كما يقرؤه التعريفُ المشترك",
  heldExcuseOf(order({ status: "medical_hold", holdReasonCode: " doctor_review " })), "doctor_review");
eq("ف٨. ولا بطاقةَ توقّفٍ لأمرٍ عاملٍ بعذرٍ باقٍ (استُؤنف)",
  heldExcuseOf(order({ status: "active", holdReasonCode: "component_delay" })), null);

//  والمكانُ الواحد يُبلَغ من كلّ حالٍ حيٍّ لا عذرَ مكتوباً لتوقّفه.
eq("ف٩. عاملٌ ⟶ «توقّف / مشكلة» ظاهر", holdButtonShown(order({ status: "active" })), true);
eq("ف١٠. عاملٌ بعذرٍ باقٍ ⟶ ظاهر (يُكتب الأحدث)",
  holdButtonShown(order({ status: "active", holdReasonCode: "component_delay" })), true);
let heldNoCause = true, heldWithCause = true;
for (const st of HOLD_STATUSES) {
  if (!holdButtonShown(order({ status: st }))) heldNoCause = false;
  if (!holdButtonShown(order({ status: st, holdReasonCode: "   " }))) heldNoCause = false;
  const code = HOLD_REASONS[st][0].code;
  if (holdButtonShown(order({ status: st, holdReasonCode: code }))) heldWithCause = false;
}
ok("ف١١. **متوقّفٌ بلا سببٍ مكتوب ⟶ الزرّ ظاهر** (الحالاتُ الأربع، والبياضُ كالغياب)", heldNoCause);
ok("ف١٢. متوقّفٌ بسببٍ مكتوب ⟶ الزرّ مخفيّ كما كان (يُستأنَف ثمّ يُكتب الأحدث)", heldWithCause);
eq("ف١٣. مكتمل ⟶ لا زرّ", holdButtonShown(order({ status: "completed" })), false);
eq("ف١٤. ملغى ⟶ لا زرّ", holdButtonShown(order({ status: "cancelled" })), false);

//  عقدُ الصفحة: القراران من هنا لا من شرطٍ ثانٍ ينحرف.
ok("ف١٥. بطاقةُ «متوقّف» تُعرَض بالشرط المشترك لا بـ`order.holdReasonCode` خاماً",
  /const heldExcuse = heldExcuseOf\(holdShape\)/.test(orderCode)
  && /\{heldExcuse && \(/.test(orderCode)
  && !/onHold && order\.holdReasonCode/.test(orderCode));
ok("ف١٦. وزرُّ «توقّف / مشكلة» بالقرار الخالص لا بـ`!onHold`",
  //  (والسهمُ `=>` داخل `onClick` يحمل «>»، فلا يُقرأ الوسمُ بـ`[^>]*`.)
  /\{holdButtonShown\(holdShape\) && \(\s*<Button[\s\S]{0,200}?data-testid="button-hold"/.test(orderCode)
  && !/\{!onHold && \(\s*<Button[\s\S]{0,200}?data-testid="button-hold"/.test(orderCode));
ok("ف١٧. والصفحةُ تستورد القرارين من الملفّ الخالص",
  /import \{[^}]*\bheldExcuseOf\b[^}]*\bholdButtonShown\b[^}]*\} from "\.\/manufacturing_row_tone"/.test(orderCode));

console.log(`\n${pass} نجحت، ${fail} أخفقت`);
process.exit(fail === 0 ? 0 : 1);
