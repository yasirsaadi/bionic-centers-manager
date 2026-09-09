// اختبارُ تصحيح اختبارات التدريب — **منطقٌ خالص، بلا قاعدة بيانات ولا نموذج**.
// `npm run test:ai-training-rules`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// القسمُ E من المهمّة: التصحيحُ **حتميّ** من مفاهيمَ مطلوبةٍ مخزَّنة، لا من
// رأي نموذج. إجابةٌ صحيحة ⟶ completed، ناقصة ⟶ needs_review، ووحدةٌ عملية
// (`practiceOnly`) لا تُنتج نجاحاً أو رسوباً مزيَّفاً أبداً.

import { gradeAnswer, isQuizSpec, resolveNonQuizResult, type QuizSpec } from "./ai_training";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ تصحيحُ اختبارات التدريب ═══\n");

const THREE_FIELDS: QuizSpec = {
  question: "ما الحقول الإلزامية الثلاثة عند تسجيل مريض جديد؟",
  requiredConcepts: [
    { keywords: ["الاسم", "اسم المريض"], hint: "اسم المريض" },
    { keywords: ["الهاتف", "رقم الهاتف", "هاتف"], hint: "رقم الهاتف" },
    { keywords: ["الفرع", "فرع"], hint: "الفرع" },
  ],
};

// ── ١. إجابةٌ كاملة — كلُّ المفاهيم عبر مرادفاتٍ مختلفة ═════════════════════
{
  const g = gradeAnswer(THREE_FIELDS, "الاسم ورقم الهاتف والفرع");
  check("١.١ إجابةٌ تذكر مرادفاً من كلّ مفهوم ⟶ passed=true", g.passed);
  same("١.٢ الثلاثةُ كلُّها matched", g.matchedIndexes.sort(), [0, 1, 2]);
  same("١.٣ لا شيء missing", g.missingIndexes, []);
  same("١.٤ totalConcepts=3", g.totalConcepts, 3);
}

// ── ٢. إجابةٌ ناقصة — مفهومٌ واحد فائت يكفي للرسوب الكامل ═══════════════════
{
  const g = gradeAnswer(THREE_FIELDS, "الاسم والهاتف فقط");
  check("٢.١ نسيان الفرع ⟶ passed=false رغم إجابة مفهومين من ثلاثة", !g.passed);
  same("٢.٢ الفرع (فهرس ٢) وحده missing", g.missingIndexes, [2]);
  same("٢.٣ والاثنان الآخران matched", g.matchedIndexes.sort(), [0, 1]);
}

// ── ٣. إجابةٌ فارغة أو بلا صلة — رسوبٌ كامل ═════════════════════════════════
{
  const empty = gradeAnswer(THREE_FIELDS, "   ");
  check("٣.١ إجابةٌ بياضٌ فقط (بعد التطبيع فارغة) ⟶ passed=false", !empty.passed);
  same("٣.٢ وكلُّ المفاهيم الثلاثة missing", empty.missingIndexes.sort(), [0, 1, 2]);

  const unrelated = gradeAnswer(THREE_FIELDS, "لا أعرف الإجابة عن هذا السؤال إطلاقاً");
  check("٣.٣ إجابةٌ غيرُ فارغة لكن بلا صلة ⟶ passed=false", !unrelated.passed);
}

// ── ٤. مرادفاتٌ متعدّدة لمفهومٍ واحد — أيٌّ منها يكفي ═══════════════════════
{
  const g1 = gradeAnswer(THREE_FIELDS, "الاسم، هاتف، فرع");
  check("٤.١ «هاتف» المفردة تكفي كمرادفٍ لمفهوم الهاتف", g1.passed);
  const g2 = gradeAnswer(THREE_FIELDS, "اسم المريض، رقم الهاتف، الفرع");
  check("٤.٢ والصياغةُ الكاملة «اسم المريض»/«رقم الهاتف» تعمل أيضاً", g2.passed);
}

// ── ٥. مفهومٌ واحدٌ فقط — الحدُّ الأدنى ═════════════════════════════════════
{
  const single: QuizSpec = {
    question: "متى يُحتسب مبلغٌ إيراداً؟",
    requiredConcepts: [{ keywords: ["دفعة فعلية", "دفعة", "قُبض", "مقبوض", "قبض"], hint: "دفعة فعلية مقبوضة" }],
  };
  check("٥.١ إجابةٌ تذكر «دفعة» ⟶ نجاح", gradeAnswer(single, "فقط عندما تُقبض دفعة").passed);
  check("٥.٢ إجابةٌ تذكر «الكلفة» وحدها بلا دفعة ⟶ رسوب", !gradeAnswer(single, "عند تسجيل الكلفة").passed);
}

// ── ٦. `resolveNonQuizResult` — لا تصحيحَ آليّاً حيث لا يُؤمَن ═════════════
{
  same("٦.١ practiceOnly=true ⟶ practice_only، لا completed مزيَّفة", resolveNonQuizResult(true), "practice_only");
  same("٦.٢ practiceOnly=false ⟶ completed", resolveNonQuizResult(false), "completed");
}

// ── ٧. `isQuizSpec` — حارسُ شكلٍ صارم ═══════════════════════════════════════
{
  check("٧.١ الشكلُ الكامل الصحيح صالح", isQuizSpec(THREE_FIELDS));
  check("٧.٢ `null` ليس اختباراً صالحاً", !isQuizSpec(null));
  check("٧.٣ `undefined` ليس اختباراً صالحاً", !isQuizSpec(undefined));
  check("٧.٤ سؤالٌ فارغ غير صالح", !isQuizSpec({ question: "  ", requiredConcepts: [{ keywords: ["x"], hint: "y" }] }));
  check("٧.٥ requiredConcepts فارغةٌ غير صالحة — وحدةٌ بلا اختبارٍ حقيقيّ", !isQuizSpec({ question: "س", requiredConcepts: [] }));
  check("٧.٦ مفهومٌ بلا keywords غير صالح", !isQuizSpec({ question: "س", requiredConcepts: [{ keywords: [], hint: "y" }] }));
  check("٧.٧ مفهومٌ بلا hint غير صالح", !isQuizSpec({ question: "س", requiredConcepts: [{ keywords: ["x"], hint: "" }] }));
  check("٧.٨ كائنٌ عشوائيٌّ بلا الحقول المطلوبة غير صالح", !isQuizSpec({ foo: "bar" }));
  check("٧.٩ نصٌّ خامٌ (وليس كائناً) غير صالح", !isQuizSpec("سؤال"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
