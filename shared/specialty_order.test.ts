// ترتيبُ الاختصاصات الثابت — منطقٌ خالص، بلا قاعدة بيانات.
// `npm run test:specialty-order`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الترتيب هو المطلوب حرفياً**: أطراف صناعية ثمّ مساند طبية ثمّ علاج
//     طبيعي — في أزرار الترشيح وفي عناوين الأقسام معاً.
// (٢) **ولا يمسّ ما بداخله**: المرضى داخل الاختصاص الواحد يبقون على ترتيب
//     الانتظار الذي اختاره الطبيب (الأحدث/الأقدم). وهذا يعتمد على استقرار
//     `sort` — فيُختبر لا يُفترض.
// (٣) **ولا يمسّ الترقيم**: الترتيب يقع على مفاتيح الأقسام بعد التقطيع، لا
//     على القائمة قبله. فلو رُتّبت القائمة كلّها لتبدّل مَن يقع في الصفحة
//     الأولى — وهو ما مُنع صراحةً.
// (٤) **والغريب لا يتصدّر**: قيمةٌ ليست اختصاصاً تذهب إلى الآخر.

import { readFileSync } from "fs";
import { join } from "path";
import { MEDICAL_SPECIALTIES, specialtyOrder, sortBySpecialty } from "./medical";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

// ══ أ. الترتيب المطلوب ════════════════════════════════════════════════
console.log("\n── الترتيب ──");
same("أ. القائمة المرجعية بالترتيب المطلوب",
  [...MEDICAL_SPECIALTIES], ["prosthetic", "medical_support", "physiotherapy"]);
same("   الرتب 0/1/2",
  MEDICAL_SPECIALTIES.map(specialtyOrder), [0, 1, 2]);
same("   المقلوب يعود إلى نصابه",
  sortBySpecialty(["physiotherapy", "medical_support", "prosthetic"], (s) => s),
  ["prosthetic", "medical_support", "physiotherapy"]);
same("   والمبعثر كذلك",
  sortBySpecialty(["physiotherapy", "prosthetic", "medical_support"], (s) => s),
  ["prosthetic", "medical_support", "physiotherapy"]);
same("   والغائب لا يُخترع — اثنان يبقيان اثنين",
  sortBySpecialty(["physiotherapy", "prosthetic"], (s) => s),
  ["prosthetic", "physiotherapy"]);
same("   والواحد يبقى واحداً",
  sortBySpecialty(["physiotherapy"], (s) => s), ["physiotherapy"]);
same("   والفارغ فارغ", sortBySpecialty([] as string[], (s) => s), []);

// ══ ب. الغريب إلى الآخر ═══════════════════════════════════════════════
console.log("\n── قيمةٌ ليست اختصاصاً ──");
check(specialtyOrder("مجهول") === MEDICAL_SPECIALTIES.length, "ب. الغريب آخر الرتب");
check(specialtyOrder(null) === MEDICAL_SPECIALTIES.length, "   وnull كذلك");
check(specialtyOrder(undefined) === MEDICAL_SPECIALTIES.length, "   وundefined كذلك");
same("   فلا يتصدّر شاشةَ عمل",
  sortBySpecialty(["مجهول", "physiotherapy", "prosthetic"], (s) => s),
  ["prosthetic", "physiotherapy", "مجهول"]);

// ══ ج. الاستقرار — ترتيبُ المرضى داخل الاختصاص لا يُمَسّ ═══════════════
console.log("\n── داخل الاختصاص ──");
type Row = { id: number; caseType: string };
//  قائمةٌ مرتَّبةٌ بالانتظار (الأحدث أوّلاً) ومختلطةُ الاختصاصات.
const waiting: Row[] = [
  { id: 1, caseType: "physiotherapy" },
  { id: 2, caseType: "prosthetic" },
  { id: 3, caseType: "physiotherapy" },
  { id: 4, caseType: "medical_support" },
  { id: 5, caseType: "prosthetic" },
  { id: 6, caseType: "physiotherapy" },
];
const grouped = sortBySpecialty(waiting, (r) => r.caseType);
same("ج. الأقسام بالترتيب، والأرقام داخل كلٍّ على حالها",
  grouped.map((r) => r.id), [2, 5, 4, 1, 3, 6]);
same("   ولا صفَّ يضيع ولا يتكرّر",
  [...grouped.map((r) => r.id)].sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);

//  والعكس: قائمةٌ بالأقدم أوّلاً تحافظ على عكسها أيضاً.
const oldestFirst = [...waiting].reverse();
same("   وبالأقدم أوّلاً يُحفظ الاتجاه المعاكس",
  sortBySpecialty(oldestFirst, (r) => r.caseType).map((r) => r.id), [5, 2, 4, 6, 3, 1]);

//  ولا يعدّل المصدر.
const original = [...waiting];
sortBySpecialty(waiting, (r) => r.caseType);
same("   ولا تُعدَّل القائمة الأصلية (مصفوفة react-query مشتركة)",
  waiting.map((r) => r.id), original.map((r) => r.id));

// ══ د. والترتيب قبل التقطيع هو ما يملأ الصفحات ═════════════════════════
// قرارُ المالك (٢٠٢٦-٠٨-١٨): الطبيب يشتغل على قسمٍ حتى يفرغ منه، فترتيبُ
// الاختصاص يجب أن يقرّر **مَن يقع في أي صفحة** لا أن يرتّب عناوين ما وقع
// فيها. فيُرتَّب قبل `slice` حين لا بحث.
//
// وأمّا **مع البحث** فالصلة تحكم وحدها والاختصاص لا يدخل — وذاك مُختبَرٌ
// سلوكياً في `npm run test:worklist-order` على الدالّة نفسها.
console.log("\n── الترقيم ──");
const PAGE = 3;
const ordered = sortBySpecialty(waiting, (r) => r.caseType).map((r) => r.id);
same("د. الترتيب الكامل: الأطراف ثمّ المساند ثمّ العلاج", ordered, [2, 5, 4, 1, 3, 6]);
same("   فالصفحة الأولى أطرافٌ ومساند لا خليطٌ عشوائي",
  ordered.slice(0, PAGE), [2, 5, 4]);
same("   والثانية بقيّةُ العلاج الطبيعي", ordered.slice(PAGE), [1, 3, 6]);
//  والدليل المضادّ: بلا ترتيبٍ قبل التقطيع تختلط الأقسام في الصفحة الواحدة.
const rawPage = waiting.slice(0, PAGE).map((r) => r.caseType);
check(new Set(rawPage).size > 1,
  "   ولولا الترتيب قبل التقطيع لاختلطت الأقسام في الصفحة (وهذا ما أُصلح)",
  JSON.stringify(rawPage));
//  وعناوينُ الأقسام تبقى مرتَّبةً بعد التقطيع أيضاً — للحالتين معاً.
same("   وعناوين الصفحة بالترتيب الثابت",
  sortBySpecialty(Array.from(new Set(rawPage)), (t) => t),
  ["prosthetic", "physiotherapy"]);

// ══ هـ. الصفحة موصولةٌ فعلاً بالمساعد الواحد ═══════════════════════════
// قاعدةٌ مكتوبةٌ ولا أحد يناديها = لا شيء. والمطلوب كان «دالّة/ثابت مشترك
// واحد» لا ترتيبين متشابهين — فيُقرأ الملفّ ويُتحقّق من الموضعين.
console.log("\n── الوصل بالصفحة ──");
const src = readFileSync(join(process.cwd(), "client/src/pages/MyExams.tsx"), "utf8");
check(/import \{[^}]*sortBySpecialty[^}]*\} from "@shared\/medical"/.test(src),
  "هـ. «معايناتي» تستورد المساعد المشترك");
check(/const specialties = useMemo\(\s*\(\) => sortBySpecialty\(/.test(src),
  "   وأزرارُ الترشيح مرتَّبةٌ به");
check(/return sortBySpecialty\(Object\.keys\(byType\)/.test(src),
  "   وعناوينُ الأقسام كذلك");
check((src.match(/sortBySpecialty\(/g) || []).length === 2,
  "   وهما الموضعان وحدهما — لا ترتيبَ ثالث مكتوبٌ باليد",
  `عدد النداءات: ${(src.match(/sortBySpecialty\(/g) || []).length} (المتوقّع ٢)`);
//  ولا مقارنةَ اختصاصٍ يدوية بقيت في الصفحة.
check(!/caseType[^\n]*(localeCompare|indexOf\(\s*\[)/.test(src),
  "   ولا مقارنةَ اختصاصٍ يدوية");

//  والترتيبُ الثالث — الذي يملأ الصفحات — في `rankWorklist`، وهو ينادي
//  المساعدَ نفسه لا ترتيباً مكتوباً باليد.
const orderSrc = readFileSync(
  join(process.cwd(), "client/src/pages/my_exams_order.ts"), "utf8");
check(/import \{ sortBySpecialty \} from "@shared\/medical"/.test(orderSrc),
  "   وترتيبُ الصفوف نفسه يستورد المساعد ذاته");
check(/if \(!opts\.search\.trim\(\)\) return sortBySpecialty\(/.test(orderSrc),
  "   ويطبّقه **حين لا بحث فقط** — فلا يدفع الاختصاصُ شيئاً فوق الصلة");
check(/return filterAndRank\(byWaiting, opts\.search/.test(orderSrc),
  "   ومع البحث تحكم الصلةُ وحدها");
check(/const filtered = useMemo\(\(\) => rankWorklist\(/.test(src),
  "   و«معايناتي» تنادي ذلك الترتيب قبل التقطيع");

//  والشريحة تبقى قبل تجميع العناوين لا بعده.
const sliceAt = src.indexOf("const pageRows = filtered.slice(");
const groupAt = src.indexOf("return sortBySpecialty(Object.keys(byType)");
check(sliceAt !== -1 && groupAt !== -1 && sliceAt < groupAt,
  "   والتقطيع يسبق ترتيبَ الأقسام");
//  و`filtered` تُملأ من `rankWorklist` وحدها — لا ترتيبَ يُضاف فوقها هنا.
check(/const filtered = useMemo\(\(\) => rankWorklist\([\s\S]{0,600}?\), \[rows, search/.test(src),
  "   و`filtered` ناتجُ ذلك الترتيب لا شيءَ فوقه");

console.log(`\n${failures === 0 ? "✅ all specialty-order cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
