// كلُّ مربّع بحثٍ عن مريض موصولٌ بالعقد الواحد — يُقرأ من الملفّات نفسها.
// `npm run test:search-wiring`.
//
// ══ لماذا اختبارٌ يقرأ الشيفرة ═══════════════════════════════════════════
// المطلوب لم يكن «حسّن البحث في شاشة» بل «**لا تجعل كلّ مكوّنٍ يبحث بطريقته**».
// وهذا شرطٌ على الشكل لا على السلوك: شاشةٌ تكتب `includes` خاصّاً بها تعمل
// اليوم وتنحرف غداً بلا أن يسقط اختبارُ سلوك. فيُحرَس بالقراءة.
//
// ولا يمنع هذا وجودَ اختباراتِ سلوكٍ حيّة — `npm run test:patient-search`
// يشغّل النقطة الحقيقية على Postgres. هذا يحرس أن الشاشات تنادي ذلك العقد.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
/** الشيفرة بلا تعليقات — فالتعليق الذي يشرح ما حُذف ليس بقيّةً منه. */
const code = (rel: string) =>
  read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^[ \t]*\/\/.*$/gm, "");

// ══ أ. القوائم المحمَّلة في المتصفّح ⟶ filterAndRank ═══════════════════
console.log("\n── القوائم في الذاكرة ──");
const IN_MEMORY: [string, string][] = [
  //  «معايناتي» تنادي `rankWorklist` الذي ينادي `filterAndRank` — طبقةٌ
  //  واحدة لا قاعدةٌ ثانية، ومنطقُها مُختبَرٌ في `my_exams_order.test.ts`.
  ["client/src/pages/my_exams_order.ts", "قائمة عمل الطبيب"],
  ["client/src/pages/FollowUps.tsx", "المتابعات"],
  ["client/src/pages/BranchDetails.tsx", "تفاصيل الفرع"],
  ["client/src/components/MergePatientDialog.tsx", "دمج ملفّين"],
  ["client/src/components/manufacturing/CreateOrderDialog.tsx", "إنشاء أمر تصنيع"],
];
for (const [file, label] of IN_MEMORY) {
  const src = read(file);
  check(/from "@shared\/patient_search"/.test(src) && /filterAndRank\(/.test(src),
    `أ. ${label} ترشّح بـfilterAndRank`);
}
check(/import \{ rankWorklist \} from ".\/my_exams_order"/.test(read("client/src/pages/MyExams.tsx")),
  "أ. و«معايناتي» موصولةٌ بترتيبها المُختبَر");

// ══ أ٢. والرمزُ والاسمُ البديل يصلان الشاشةَ فعلاً ══════════════════════
// العقد يعرف `patientCode`/`aliasCodes`، لكن معرفتَه لا تنفع إن لم تمرّرهما
// الشاشة. والحمولةُ نفسها مُختبَرةٌ حيّاً في `npm run test:search-surfaces`.
console.log("\n── الرمز والاسم البديل في كل شاشة ──");
const PASSES_CODES: [string, string][] = [
  ["client/src/pages/MyExams.tsx", "قائمة عمل الطبيب"],
  ["client/src/pages/FollowUps.tsx", "المتابعات"],
  ["client/src/pages/BranchDetails.tsx", "تفاصيل الفرع"],
  ["client/src/components/MergePatientDialog.tsx", "دمج ملفّين"],
  ["client/src/components/manufacturing/CreateOrderDialog.tsx", "إنشاء أمر تصنيع"],
];
for (const [file, label] of PASSES_CODES) {
  const src = code(file);
  check(/patientCode:/.test(src) && /aliasCodes:/.test(src),
    `أ٢. ${label} تمرّر الرمز والأسماء البديلة`);
}
//  والمتابعات تمرّرهما في القائمتين معاً — النشطة وسجلّ المكالمات.
check((code("client/src/pages/FollowUps.tsx").match(/aliasCodes:/g) || []).length >= 2,
  "   والمتابعات في قائمتيها معاً");

// ══ أ٣. والخادمُ يرسلهما دفعةً واحدة ═══════════════════════════════════
console.log("\n── لا N+1 ──");
const BATCHED: [string, string][] = [
  ["server/routes.ts", "سجلّ المرضى الكامل والمتابعات"],
  ["server/medical/routes.ts", "قائمة عمل الطبيب"],
];
for (const [file, label] of BATCHED) {
  check(/aliasCodesByPatient\(/.test(code(file)),
    `أ٣. ${label} تجلبها بالمساعد الدفعيّ`);
}
check(/ANY\(\$\{idArray\}::int\[\]\)/.test(read("server/patient_code/store.ts")),
  "   والمساعد يمرّر المفاتيح مصفوفةً واحدة لا قائمةَ متغيّرات");

// ══ ب. الشاشات المدعومة بالخادم ⟶ تهدئةٌ واحدة ═════════════════════════
console.log("\n── التهدئة ──");
const SERVER_BACKED: [string, string][] = [
  ["client/src/pages/PatientsList.tsx", "سجلّ المرضى"],
  ["client/src/pages/Surveys.tsx", "منتقي مريض الاستبيان"],
  ["client/src/pages/Manufacturing.tsx", "قائمة أوامر التصنيع"],
];
for (const [file, label] of SERVER_BACKED) {
  const src = read(file);
  check(/useDebouncedSearch\(/.test(src), `ب. ${label} تُهدَّأ بالمساعد المشترك`);
  check(!/setTimeout\([^)]*setDebounced/.test(src),
    `   ولا مهلةً يدوية باقية في ${label}`);
}

const hook = read("client/src/hooks/use-debounced-search.ts");
const ms = Number((hook.match(/SEARCH_DEBOUNCE_MS\s*=\s*(\d+)/) || [])[1]);
check(ms >= 100 && ms <= 120, "ب. المهلة ضمن ١٠٠–١٢٠ مللي ثانية", String(ms));
check(/if \(!trimmed\) \{ setDebounced\(""\); return; \}/.test(hook),
  "   ومسحُ المربّع يعيد القائمة فوراً بلا انتظار");

// ══ ج. لا قاعدةَ تطبيعٍ ثانية باقية في الواجهة ═════════════════════════
console.log("\n── مصدرٌ واحد ──");
const utils = read("client/src/lib/utils.ts");
check(/export \{ normalizeSearchText as normalizeArabic \} from "@shared\/patient_search"/.test(utils),
  "ج. `normalizeArabic` صارت اسماً ثانياً للقاعدة الواحدة لا قاعدةً ثانية");
check(!/replace\(\/\[أإآ\]\/g/.test(utils),
  "   ولا قواعدَ استبدالٍ عربية باقيةً فيها");

// ══ د. ولا تطبيعَ يدويّ في SQL خارج العقد ══════════════════════════════
// كان في الخادم `translate(name,'أإآةى','اااهي')` مستقلّاً — قاعدةٌ ثالثة
// تختلف عن الاثنتين وتُخفق حيث تنجحان.
const SERVER_FILES = ["server/routes.ts", "server/manufacturing/store.ts", "server/storage.ts"];
for (const f of SERVER_FILES) {
  const src = code(f);
  check(!/translate\(\s*\$?\{?[\w.]*[Nn]ame\}?\s*,\s*'أ/.test(src),
    `د. لا تطبيعَ عربيّاً يدويّاً في ${f}`);
}
check(/buildPatientSearch\(/.test(read("server/routes.ts")),
  "   وسجلّ المرضى يبني شرطه من العقد");
check(/buildPatientSearch\(/.test(read("server/manufacturing/store.ts")),
  "   وقائمة أوامر التصنيع كذلك");

// ══ هـ. والعتبتان مكتوبتان لا متروكتان ═════════════════════════════════
console.log("\n── العتبات ──");
const dbSrc = read("server/db.ts");
check(/pg_trgm\.similarity_threshold\s*=\s*0\.3/.test(dbSrc),
  "هـ. عتبة التشابه مضبوطةٌ لكلّ اتّصال");
check(/pg_trgm\.word_similarity_threshold\s*=\s*0\.5/.test(dbSrc),
  "   وعتبة تشابه الكلمة كذلك");

console.log(`\n${failures === 0 ? "✅ كل مربّعات البحث موصولة بالعقد الواحد" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
