// اختبارُ محلِّل Markdown الآمن لردود المساعد — منطقٌ خالص، بلا React وبلا
// DOM. `npm run test:assistant-markdown`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **علاماتُ الصياغة الخام (** ## |) لا تظهر حرفياً في أيّ عقدة نصّية**
//     لردٍّ واقعيّ الشكل — هذا هو الأثرُ المُصلَح، ويُختبَر مباشرةً بدل
//     افتراضه من تحقّق أجزاءٍ متفرّقة.
// (٢) وكلُّ كتلةٍ (عنوان/قائمة/جدول/فقرة) تُبنى بشكلها الصحيح.
// (٣) وما لا تعرفه هذه المجموعة الصغيرة (روابط، HTML خام) يبقى نصّاً عادياً
//     حرفياً — لا يُفسَّر، ولا يُفشِل التحليل.

import { readFileSync } from "fs";
import { join } from "path";
import { parseAssistantMarkdown, parseInline, type Block, type InlineNode } from "./assistant_markdown";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

/** كلُّ قيم العقد النصّية (نصٌّ أو عريض) في شجرةٍ كاملة — لفحص علامات خام. */
function allInlineValues(blocks: Block[]): string[] {
  const out: string[] = [];
  const collect = (nodes: InlineNode[]) => { for (const n of nodes) out.push(n.value); };
  for (const b of blocks) {
    if (b.type === "heading") collect(b.inline);
    else if (b.type === "paragraph") b.lines.forEach(collect);
    else if (b.type === "list") b.items.forEach(collect);
    else if (b.type === "table") { b.header.forEach(collect); b.rows.forEach((r) => r.forEach(collect)); }
  }
  return out;
}

console.log("── أ. parseInline — العريض ──");
same("أ.١ عريضٌ في وسط جملة",
  parseInline("هذا **مهم** جداً"),
  [{ type: "text", value: "هذا " }, { type: "bold", value: "مهم" }, { type: "text", value: " جداً" }]);
same("أ.٢ عريضٌ في البداية",
  parseInline("**تنبيه**: راجع الملف"),
  [{ type: "bold", value: "تنبيه" }, { type: "text", value: ": راجع الملف" }]);
same("أ.٣ عريضان في نفس السطر",
  parseInline("**أ** و**ب**"),
  [{ type: "bold", value: "أ" }, { type: "text", value: " و" }, { type: "bold", value: "ب" }]);
same("أ.٤ بلا أيّ عريض ⟶ نصٌّ واحد",
  parseInline("نصٌّ عاديّ تماماً"), [{ type: "text", value: "نصٌّ عاديّ تماماً" }]);
check(!allInlineValues([{ type: "paragraph", lines: [parseInline("**مهم**")] }]).some((v) => v.includes("**")),
  "أ.٥ **ولا توجد `**` حرفياً في قيمة أيّ عقدة بعد التحليل**");
//  ══ إغلاقٌ ناقص — يبقى نصّاً حرفياً بدل تحطّم التحليل ══
same("أ.٦ `**` بلا إغلاقٍ يبقى نصّاً عادياً حرفياً — لا يتحطّم التحليل",
  parseInline("قيمةٌ **بلا إغلاق"), [{ type: "text", value: "قيمةٌ **بلا إغلاق" }]);

console.log("\n── ب. الكتل — عناوين وقوائم وفقرات ──");
same("ب.١ عنوانٌ من مستوى ٢ — بلا `##` في النصّ",
  parseAssistantMarkdown("## عنوان القسم"),
  [{ type: "heading", level: 2, inline: [{ type: "text", value: "عنوان القسم" }] }]);
same("ب.٢ عنوانٌ من مستوى ١ وآخر من ٣",
  parseAssistantMarkdown("# رئيسي\n### فرعي").map((b: any) => b.level), [1, 3]);
same("ب.٣ قائمةُ نقاطٍ بعلامة -",
  parseAssistantMarkdown("- أولاً\n- ثانياً"),
  [{ type: "list", ordered: false, items: [[{ type: "text", value: "أولاً" }], [{ type: "text", value: "ثانياً" }]] }]);
same("ب.٤ قائمةُ نقاطٍ بعلامة *",
  parseAssistantMarkdown("* أولاً\n* ثانياً").map((b: any) => b.ordered), [false]);
same("ب.٥ قائمةٌ مرقّمة",
  parseAssistantMarkdown("1. أولاً\n2. ثانياً"),
  [{ type: "list", ordered: true, items: [[{ type: "text", value: "أولاً" }], [{ type: "text", value: "ثانياً" }]] }]);
{
  const paras = parseAssistantMarkdown("سطرٌ أول\nسطرٌ ثانٍ\n\nفقرةٌ ثانية");
  same("ب.٦ سطرٌ فارغ يفصل بين فقرتين — سطران بلا فاصلٍ يبقيان فقرةً واحدة",
    paras.map((b: any) => b.type), ["paragraph", "paragraph"]);
  same("   والفقرةُ الأولى تحمل سطرين",
    (paras[0] as any).lines.length, 2);
}

console.log("\n── ج. الجداول ──");
{
  const md = "| الاسم | الفرع |\n| --- | --- |\n| أحمد | بغداد |\n| سارة | البصرة |";
  const table = parseAssistantMarkdown(md)[0] as any;
  same("ج.١ نوعُ الكتلة جدول", table.type, "table");
  same("ج.٢ رأسٌ بخليتين — بلا `|` حرفياً في القيم",
    table.header.map((c: InlineNode[]) => c[0].value), ["الاسم", "الفرع"]);
  same("ج.٣ صفّان بالبيانات الصحيحة",
    table.rows.map((r: InlineNode[][]) => r.map((c) => c[0].value)),
    [["أحمد", "بغداد"], ["سارة", "البصرة"]]);
}
{
  //  فاصلٌ بمحاذاةٍ (:---:) يبقى فاصلاً صحيحاً — لا يُقرأ صفَّ بيانات.
  const md = "| س | ج |\n|:---:|:---:|\n| ١ | ٢ |";
  const table = parseAssistantMarkdown(md)[0] as any;
  same("ج.٤ فاصلٌ بمحاذاةٍ لا يُحسَب صفَّ بيانات", table.rows.length, 1);
}
{
  //  سطرٌ يشبه صفّ جدول لكن بلا صفّ فاصلٍ بعده ⟶ ليس جدولاً — فقرةٌ عادية.
  const notATable = parseAssistantMarkdown("| ليس جدولاً |\nسطرٌ عاديّ تالٍ");
  check(notATable.every((b) => b.type !== "table"),
    "ج.٥ صفٌّ بصيغة جدول بلا صفّ فاصلٍ تالٍ ⟶ لا يُقرأ جدولاً", JSON.stringify(notATable));
}

console.log("\n── د. **الأثرُ المُصلَح**: لا علامات صياغةٍ خام في رسائل واقعية ──");
{
  //  شكلُ ردٍّ واقعيّ يجمع عناصر متعدّدة معاً — تماماً كما ورد في وصف الخلل.
  const realistic = [
    "## ملخّص الحالة",
    "",
    "**الحالة الحالية**: قيد التصنيع",
    "",
    "- الخبير: أحمد",
    "- الموعد المتوقّع: ٢٠٢٦-١٠-٠١",
    "",
    "| البند | القيمة |",
    "| --- | --- |",
    "| المرحلة | القياسات |",
  ].join("\n");
  const blocks = parseAssistantMarkdown(realistic);
  const values = allInlineValues(blocks);
  check(!values.some((v) => v.includes("**")), "د.١ **بلا `**` حرفياً في أيّ عقدة**", JSON.stringify(values));
  check(!values.some((v) => v.includes("##")), "د.٢ **وبلا `##` حرفياً**", JSON.stringify(values));
  check(!values.some((v) => v.trim().startsWith("|") || v.trim().endsWith("|")),
    "د.٣ **وبلا `|` متبقّية من حدود الخلايا**", JSON.stringify(values));
  //  والمحتوى الفعليّ وصل رغم ذلك — لم يُحذَف شيء، أُعيد تنسيقُه فقط.
  check(values.some((v) => v.includes("قيد التصنيع")), "د.٤ والمحتوى نفسُه لم يضِع");
  check(values.some((v) => v.includes("أحمد")), "   ولا عنصرُ القائمة");
  check(values.some((v) => v.includes("القياسات")), "   ولا خليّةُ الجدول");
}

console.log("\n── هـ. ما لا تعرفه هذه المجموعة يبقى نصّاً حرفياً — لا HTML خام ──");
{
  //  لا صياغةَ روابط أو صور أو HTML مفهومة هنا إطلاقاً — فأيُّ محاولة حقنٍ
  //  تبقى نصّاً عادياً في عقدةٍ نصّية، ولا تُفسَّر بنيوياً بحال. والرسمُ
  //  (`AssistantMarkdown.tsx`) لا يستعمل `dangerouslySetInnerHTML` أبداً،
  //  فحتى لو وصل هذا النصّ حرفياً لن يُنفَّذ كسكربت — لكن هذا الاختبار يقتصر
  //  على طبقة التحليل الخالصة.
  const hostile = "<script>alert(1)</script> و[اضغط هنا](javascript:alert(1)) و<img src=x onerror=alert(1)>";
  const blocks = parseAssistantMarkdown(hostile);
  same("هـ.١ نوعُ الكتلة فقرةٌ عادية — لا شيء خاصّ", blocks[0]?.type, "paragraph");
  const values = allInlineValues(blocks);
  check(values.join("").includes("<script>alert(1)</script>"),
    "هـ.٢ محتوى HTML يبقى نصّاً حرفياً في عقدةٍ نصّية — لم يُحذَف ولم يُنفَّذ بنيوياً",
    JSON.stringify(values));
}

console.log("\n── و. الوصل الفعليّ في AiChatDrawer.tsx — لا مجرّد محلِّلٍ معزول ──");
{
  //  ══ فحصٌ معماريّ على المصدر — بلا DOM لرسم المكوّن وفحصه فعلياً ══
  //  التحليلُ وحده لا يثبت أن الشاشة تستعمله؛ هذا يثبت الوصل نفسَه.
  const drawer = readFileSync(join(process.cwd(), "client/src/components/AiChatDrawer.tsx"), "utf8");
  check(/import\s*\{\s*AssistantMarkdown\s*\}\s*from\s*"@\/components\/AssistantMarkdown"/.test(drawer),
    "و.١ الدرجُ يستورد AssistantMarkdown");
  check(/m\.role === "assistant" \? <AssistantMarkdown text={m\.content} \/> : m\.content/.test(drawer),
    "و.٢ **ردُّ المساعد يُرسَم عبر AssistantMarkdown — لا `{m.content}` خامٍ له وحده**");
  //  ══ استعمالٌ فعليّ (`dangerouslySetInnerHTML=`) لا مجرّد ذِكرٍ في تعليق ══
  const renderer = readFileSync(join(process.cwd(), "client/src/components/AssistantMarkdown.tsx"), "utf8");
  check(!/dangerouslySetInnerHTML\s*=/.test(drawer) && !/dangerouslySetInnerHTML\s*=/.test(renderer),
    "و.٣ **ولا استعمالَ فعليّاً لـ`dangerouslySetInnerHTML` في أيٍّ من الملفّين** — لا مسارَ لتنفيذ HTML خام إطلاقاً");
}

console.log(`\n${failures === 0 ? "✅ all assistant-markdown cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
