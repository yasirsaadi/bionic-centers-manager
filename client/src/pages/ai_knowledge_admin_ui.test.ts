// شاشةُ إدارة معرفة المساعد في لوحة التحكّم — فحصُ مصدرٍ ثابت، بلا DOM ولا
// قاعدة بيانات. `npm run test:ai-knowledge-ui`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) التبويبُ الجديد **داخل** بوّابة `isAdmin` القائمة في الصفحة — لا
//     مسارَ عرضٍ ثانٍ يتفاداها.
// (٢) كلُّ نداءِ كتابةٍ يذهب إلى النقطة الصحيحة في `server/ai/knowledge/routes.ts`.
// (٣) **لا حذفَ فعليّاً من الواجهة** — تعطيلٌ فقط، مطابقةً لعقد الخادم
//     («لا شيء يُمحى»، `server/ai/knowledge/store.ts`).

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const src = readFileSync(join(process.cwd(), "client/src/pages/AdminSettings.tsx"), "utf8");

console.log("\n── موضعُ التبويب داخل بوّابة المسؤول ──");
{
  const gateIdx = src.indexOf("if (!isAdmin)");
  const tabIdx = src.indexOf('TabsTrigger value="ai-knowledge"');
  const contentIdx = src.indexOf('TabsContent value="ai-knowledge"');
  const componentDefIdx = src.indexOf("function AiKnowledgeTab()");
  check(gateIdx > -1 && tabIdx > -1 && contentIdx > -1 && componentDefIdx > -1,
    "أ. كلُّ العناصر الأربعة موجودةٌ فعلياً في الملفّ (لا اسمَ غائب)",
    `gate=${gateIdx} tab=${tabIdx} content=${contentIdx} def=${componentDefIdx}`);
  //  الصفحةُ **كلُّها** بلا isAdmin تُرجع مبكراً (`return`) قبل الـTabs —
  //  فوجودُ التبويب بعد هذا الشرط نصّياً يعني وقوعه داخل الفرع المصادَق.
  check(gateIdx < tabIdx && gateIdx < contentIdx,
    "ب. **التبويبُ يقع بعد فحص `isAdmin` في الملفّ** — لا قبل بوّابة الدخول");
  //  والمكوّنُ نفسُه (تعريف الدالّة) مستقلٌّ خارج الصفحة كبقيّة التبويبات
  //  الأخرى (`AiMemoryTab`، `EmployeeAccuracyTab`) — لا تكراراً للحارس بداخله؛
  //  الحراسةُ الحقيقية في الخادم (isGlobalAdmin) لا في هذا المكوّن.
  check(componentDefIdx < gateIdx,
    "ج. تعريفُ `AiKnowledgeTab` قبل دالّة الصفحة — نفسُ نمط بقيّة التبويبات");
}

console.log("\n── الأبوابُ الصحيحة ──");
const tabBody = src.slice(src.indexOf("function AiKnowledgeTab()"), src.indexOf("export default function AdminSettings()"));
check(tabBody.includes('"/api/ai/knowledge/articles"'), "د.١ يقرأ/يكتب مقالاتٍ عبر الباب الصحيح");
check(tabBody.includes('"/api/ai/knowledge/suggestions"'), "د.٢ ويقرأ الاقتراحات عبر الباب الصحيح");
check(/\/api\/ai\/knowledge\/suggestions\/\$\{params\.id\}\/\$\{params\.mode.*"approve".*"reject"/.test(tabBody),
  "د.٣ الاعتمادُ والرفضُ يبنيان مسارَهما من `params.mode` بمعرّف الاقتراح نفسِه — لا نقطتان منفصلتان تنحرفان");
check(/\/api\/ai\/knowledge\/articles\/\$\{[^}]+\}\/active/.test(tabBody), "د.٥ والتفعيل/التعطيل عبر /active");

console.log("\n── لا حذفَ فعليّاً ──");
check(!/method:\s*["']DELETE["']/.test(tabBody),
  "هـ. **لا نداءَ DELETE واحداً في تبويب المعرفة** — التعطيلُ فقط، مطابقةً لعقد الخادم");
check(tabBody.includes("تفعيل") && tabBody.includes("تعطيل"),
  "   وزرّا التفعيل/التعطيل ظاهران بنصّهما");

console.log("\n── فصلُ الاعتماد عن الرفض ──");
check(tabBody.includes("سبب الرفض"), "و.١ نافذةُ الرفض تطلب سبباً");
check(/required/.test(tabBody.slice(tabBody.indexOf("رفضُ الاقتراح"), tabBody.indexOf("رفضُ الاقتراح") + 800)),
  "و.٢ وحقلُ السبب إلزاميّ (`required`) لا اختياريّ");
check(tabBody.includes("مقالةٌ جديدة") && tabBody.includes("تعديلُ مقالةٍ قائمة"),
  "و.٣ نافذةُ الاعتماد تعرض الخيارين: مقالةٌ جديدة أو تعديلُ مقالةٍ قائمة");

console.log("\n── الاعتمادُ ذاتُ اعتماد ذاتيّ ──");
//  لا يُطلَب من المسؤول اسمه — يُشتقّ من الجلسة في الخادم (`actorFrom`)،
//  فلا حقل "اعتمدها" أو "قرّرها" حرّاً في أيّ نموذج بهذا التبويب.
check(!/name="approvedByName"|name="decidedByName"/.test(tabBody),
  "ز. لا حقلَ نصٍّ حرٍّ لاسم المعتمِد — الهويّةُ من الجلسة دائماً");

console.log(`\n${failures === 0 ? "✅ all ai-knowledge-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
