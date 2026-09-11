// واجهتا القسمين ٣ و٨ (مراجعةُ إكمالٍ ٢٠٢٦-٠٩-١١) — فحصُ مصدرٍ ثابت، بلا
// DOM ولا قاعدة بيانات. `npm run test:training-ui`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) لوحةُ إدارة التدريب (`AdminSettings.tsx: TrainingAdminTab`) تملك
//     إنشاءً وتعديلاً حقيقيَّين للمسارات والوحدات — لا تفعيلاً/تعطيلاً
//     فقط كما كانت. (٢) **لا حذفَ فعليّاً** في أيّ منهما — نفسُ عقد
//     `server/training/routes.ts` («لا DELETE، تفعيلٌ/تعطيلٌ فقط»).
// (٣) «تقدّمُ فريقي» في `AiChatDrawer.tsx` مقصورةٌ على مديرِ الفرع (نفسُ
//     الباب الذي يسمح به الخادم `role === "branch_manager"`)، تستهلك
//     نقطةَ الإدارة القائمة نفسَها `/api/training/management/progress`
//     **بلا نقطةٍ جديدة**، وبلا أيّ إجابة اختبارٍ حرّة أو منتقي فرعٍ آخر.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const adminSettingsSrc = readFileSync(join(process.cwd(), "client/src/pages/AdminSettings.tsx"), "utf8");
const chatDrawerSrc = readFileSync(join(process.cwd(), "client/src/components/AiChatDrawer.tsx"), "utf8");

console.log("\n── القسمُ ٣ — لوحةُ إدارة المسارات والوحدات ──");
{
  const startIdx = adminSettingsSrc.indexOf("function TrainingAdminTab()");
  const endIdx = adminSettingsSrc.indexOf("export default function AdminSettings()");
  check(startIdx > -1 && endIdx > -1 && startIdx < endIdx,
    "أ. المكوّنُ `TrainingAdminTab` موجودٌ فعلياً وقبل دالّة الصفحة");
  const tabBody = adminSettingsSrc.slice(startIdx, endIdx);

  check(tabBody.includes('"/api/training/admin/tracks"') && /editingTrack\s*\?\s*["']PATCH["']\s*:\s*["']POST["']/.test(tabBody),
    "ب.١ إنشاءُ مسارٍ جديد يذهب إلى POST /api/training/admin/tracks (وتعديلُه إلى PATCH — نفسُ نداءٍ بفعلٍ مشروط)");
  check(/\/api\/training\/admin\/tracks\/\$\{editingTrack\.id\}/.test(tabBody),
    "ب.٢ وتعديلُ مسارٍ قائم يبني مساره من معرّف المسار المُعدَّل نفسِه");
  check(/\/api\/training\/admin\/tracks\/\$\{[^}]*\}\/modules/.test(tabBody),
    "ب.٣ وإنشاءُ وحدةٍ يذهب إلى .../tracks/:id/modules");
  check(/\/api\/training\/admin\/modules\/\$\{editingModule\.id\}/.test(tabBody),
    "ب.٤ وتعديلُ وحدةٍ قائمة يبني مساره من معرّف الوحدة المُعدَّلة نفسِه");
  check(/\/api\/training\/admin\/tracks\/\$\{[^}]*\}\/active/.test(tabBody)
    && /\/api\/training\/admin\/modules\/\$\{[^}]*\}\/active/.test(tabBody),
    "ب.٥ والتفعيل/التعطيل عبر /active كما كانا (لم يُمَسّا)");

  console.log("\n── لا حذفَ فعليّاً ──");
  check(!/method:\s*["']DELETE["']/.test(tabBody),
    "ج. **لا نداءَ DELETE واحداً في لوحة إدارة التدريب** — إنشاءٌ وتعديلٌ وتفعيلٌ/تعطيلٌ فقط");

  console.log("\n── حقولُ إنشاء المسار ──");
  check(tabBody.includes("مسارٌ جديد") && tabBody.includes("تعديلُ مسار"),
    "د.١ زرّا «مسارٌ جديد» و«تعديلُ مسار» ظاهران بنصّهما");
  check(tabBody.includes("trackAudience") && tabBody.includes("SELECTABLE_AUDIENCE_CAPABILITIES"),
    "د.٢ ونموذجُ المسار يعرض اختيار الجمهور من قائمة القدرات الحقيقية");
  check(tabBody.includes("trackSortOrder"),
    "د.٣ وترتيبُ الظهور حقلٌ في النموذج");

  console.log("\n── حقولُ إنشاء الوحدة ──");
  check(tabBody.includes("وحدةٌ جديدة") && tabBody.includes("تعديلُ وحدة"),
    "هـ.١ زرّا «وحدةٌ جديدة» و«تعديلُ وحدة» ظاهران بنصّهما");
  check(tabBody.includes("moduleArticleIds") && tabBody.includes("activeArticlesForTraining"),
    "هـ.٢ واختيارُ المقالات المرجعية من قائمة المقالات **الفعّالة فقط**");
  check(tabBody.includes("moduleObjectivesText") && tabBody.includes("moduleQuizJson") && tabBody.includes("modulePracticeOnly"),
    "هـ.٣ وأهدافُ التعلّم والاختبار الاختياريّ وعلمُ «تدريبٍ عمليّ» كلُّها حقولٌ في النموذج");
  check(tabBody.includes("isQuizSpec"),
    "هـ.٤ والاختبارُ يُتحقَّق منه في العميل بنفس حارس الخادم (`isQuizSpec`) قبل الإرسال — لا انتظارَ ٤٠٠ فقط");

  console.log("\n── مصدرُ المقالات — الفعّالةُ فقط، بلا اقتراحٍ معلَّق ──");
  //  نفسُ استعلام `AiKnowledgeTab` (`/api/ai/knowledge/articles` ⟶ `rows`)
  //  — لا نسخةَ ثانية من منطق «ما هي المعرفةُ المعتمَدة الآن».
  check(/queryKey:\s*\[\s*["']\/api\/ai\/knowledge\/articles["']\s*\]/.test(tabBody),
    "و.١ يقرأ مقالات المعرفة من الباب الإداريّ الحقيقيّ نفسِه");
  check(tabBody.includes(".filter((a) => a.isActive)"),
    "و.٢ ويقصرها على الفعّالة فقط — لا مسوَّدةَ اقتراحٍ ولا نسخةً مسحوبة");
}

console.log("\n── القسمُ ٨ — «تقدّمُ فريقي» لمديرِ الفرع داخل درج المساعد ──");
{
  check(chatDrawerSrc.includes("function TeamProgressPanel"),
    "ز.١ المكوّنُ `TeamProgressPanel` موجودٌ فعلياً في نفس الملفّ");
  check(chatDrawerSrc.includes("تقدّمُ فريقي"),
    "ز.٢ ونصُّ «تقدّمُ فريقي» ظاهرٌ حرفياً");

  //  البوّابةُ نفسُها التي يفرضها الخادم — عرضٌ لا حراسة، لكن يجب أن تطابق.
  check(/isBranchManager\s*=\s*session\?\.role\s*===\s*["']branch_manager["']/.test(chatDrawerSrc),
    "ح.١ الشرطُ مقصورٌ حرفياً على `role === \"branch_manager\"` — نفسُ حارس الخادم في `server/training/routes.ts`");
  check(/enabled:\s*open\s*&&\s*trainingOpen\s*&&\s*teamProgressOpen\s*&&\s*isBranchManager/.test(chatDrawerSrc),
    "ح.٢ والاستعلامُ الفعليّ محروسٌ بنفس الشرط — لا زرَّ عرضٍ بلا نداءٍ محروس");

  //  بلا نقطةٍ جديدة — نفسُ `/api/training/management/progress` التي
  //  يستهلكها المسؤولُ العام في `AdminSettings.tsx` تماماً.
  const teamProgressRegionStart = chatDrawerSrc.indexOf("const isBranchManager");
  const teamProgressRegionEnd = chatDrawerSrc.indexOf("const openModule");
  const teamProgressRegion = chatDrawerSrc.slice(teamProgressRegionStart, teamProgressRegionEnd);
  check(teamProgressRegion.includes('"/api/training/management/progress"'),
    "ط.١ ويستهلك نقطةَ إدارة التدريب القائمة نفسَها — بلا نقطةٍ جديدة",
    teamProgressRegion);
  check(!/\/api\/training\/admin\//.test(teamProgressRegion),
    "ط.٢ وبلا أيّ نداءٍ لنقاط الإدارة الكاملة (إنشاء/تعديل) — قراءةٌ فقط لمديرِ الفرع");

  console.log("\n── بلا إجاباتِ اختبارٍ حرّة ولا منتقي فرعٍ آخر ──");
  const panelStart = chatDrawerSrc.indexOf("function TeamProgressPanel");
  const panelEnd = chatDrawerSrc.indexOf("const TRAINING_STATUS_LABEL");
  const panelBody = chatDrawerSrc.slice(panelStart, panelEnd);
  check(!panelBody.includes("answerText") && !panelBody.includes("quizQuestion") && !panelBody.includes("requiredConcepts"),
    "ي.١ **بلا أيّ إشارةٍ لإجابات اختبارٍ حرّة** — لا `answerText` ولا سؤالَ اختبارٍ في هذه اللوحة إطلاقاً");
  check(!/branchId|branchSelect|<select/i.test(panelBody),
    "ي.٢ **وبلا منتقي فرعٍ** — النطاقُ يفرضه الخادمُ وحده (فرعُ مديرِ الفرع نفسِه)، لا فلترةً من العميل");
  check(panelBody.includes("e.tracks") && panelBody.includes("completedModules") && panelBody.includes("totalModules"),
    "ي.٣ وتعرض تفصيلَ المسارات (منجَزٌ/إجماليّ) — نفسُ شكل لوحة المسؤول، لا تجميعاً مختلفاً");
}

console.log(`\n${failures === 0 ? "✅ all training-admin-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
