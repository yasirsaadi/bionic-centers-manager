//  اختبارُ لونِ صفّ لوحة التصنيع وسببِه — بلا قاعدة بيانات ولا شبكة.
//  تشغيل:  npm run test:manufacturing-row-tone
//
//  قرارُ المالك ٢٠٢٦-٠٩-٢٤: «المتأخرون هم الذين ليس لديهم أي عذر للتأخير
//  … لذلك يكونوا أحمر. أما من لديه عذر … أو أي عذر فيجب أن يكون أصفر.
//  وطبعاً المكتمل أخضر.» ثمّ: «انظر كيف الأصفر يعرض السبب كاملاً.»

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { rowToneOf, type RowToneOrderLike } from "./manufacturing_row_tone";
import { REASON_CODE_LABELS } from "../../../shared/manufacturing";
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
  rowToneOf(order({ holdReasonCode: "swelling", holdNote: "   " })).reason?.note, null);

// ══ و. الفراغُ ليس عذراً ═══════════════════════════════════════════════════
console.log("\n── و. لا عذرَ يُلفَّق ──");

for (const bad of ["", "   ", null]) {
  const d = rowToneOf(order({ isOverdue: true, holdReasonCode: bad as string | null }));
  eq(`و. ${JSON.stringify(bad)} ⟶ يبقى أحمر`, d.tone, "red");
  eq(`و. ${JSON.stringify(bad)} ⟶ بلا سبب`, d.reason, null);
}

// ══ ز. رمزٌ لا نعرفه يُقال كما هو ══════════════════════════════════════════
console.log("\n── ز. المجهولُ يُقال ولا يُفرَّغ ──");

const unknown = rowToneOf(order({ holdReasonCode: "some_new_code_2030" }));
eq("ز١. رمزٌ خارج المعجم ⟶ يُعرَض كما هو", unknown.reason?.label, "some_new_code_2030");
eq("ز٢. وهو أصفرُ كغيره", unknown.tone, "amber");
ok("ز٣. والخادمُ يفعل الشيءَ نفسَه في نقطة التنبيهات",
  /REASON_CODE_LABELS\[o\.holdReasonCode\] \?\? o\.holdReasonCode/.test(
    fs.readFileSync(path.join(here, "../../../server/manufacturing/routes.ts"), "utf8")));

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

console.log(`\n${pass} نجحت، ${fail} أخفقت`);
process.exit(fail === 0 ? 0 : 1);
