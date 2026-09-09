// تدريبُ الموظّفين — منطقُ التصحيح الحتميّ، **بلا قاعدة بيانات ولا نموذج**.
//
// ══ لماذا حتميّ لا برأي النموذج ═══════════════════════════════════════════
// المهمّة صريحة: «Do not let the model invent correctness rules» — النجاحُ
// والرسوبُ يُقرَّران من **مفاهيمَ مطلوبة** مخزَّنة على الوحدة نفسها (كتبها
// المسؤول العام)، لا من تقدير النموذج اللغويّ. النموذج يشرح الصياغة، لكنّ
// «هل أجاب أم لا» سؤالٌ حتميّ هنا.
//
// ══ تجميعاتُ مرادفات لا كلمةً واحدة جامدة ═════════════════════════════════
// «الهاتف» و«رقم الهاتف» و«هاتف» كلُّها إجابةٌ صحيحة لمفهوم واحد. فكلُّ
// مفهومٍ مطلوب مصفوفةُ مرادفاتٍ (`keywords`) — يكفي أن يرد **واحدٌ** منها في
// إجابة الموظّف (بعد التطبيع العربيّ نفسِه المستعمَل في بحث المرضى، فلا
// يفرّق التشكيل ولا صورةُ الألف بين إجابتين متطابقتين معنى).

import { normalizeSearchText } from "./patient_search";

/** مفهومٌ مطلوبٌ واحد — أيُّ مرادفٍ من `keywords` يكفي لتحقيقه. */
export interface RequiredConcept {
  /** مرادفاتٌ مقبولة — نصٌّ عربيّ حرّ، يُطبَّع قبل المقارنة. */
  keywords: string[];
  /** عبارةٌ قصيرة تُعرَض **بعد** التصحيح فقط، لشرح ما فات الموظّف. */
  hint: string;
}

export interface QuizSpec {
  question: string;
  requiredConcepts: RequiredConcept[];
}

export function isQuizSpec(v: unknown): v is QuizSpec {
  if (!v || typeof v !== "object") return false;
  const q = v as any;
  return typeof q.question === "string" && q.question.trim().length > 0
    && Array.isArray(q.requiredConcepts) && q.requiredConcepts.length > 0
    && q.requiredConcepts.every((c: any) =>
      c && Array.isArray(c.keywords) && c.keywords.length > 0
      && c.keywords.every((k: any) => typeof k === "string" && k.trim())
      && typeof c.hint === "string" && c.hint.trim());
}

export interface GradeResult {
  passed: boolean;
  /** فهارسُ `requiredConcepts` التي حقّقتها الإجابة. */
  matchedIndexes: number[];
  /** فهارسُ ما لم تحقّقه — تُقرأ بعدها تلميحاتُها فقط، لا الإجابة كاملةً. */
  missingIndexes: number[];
  totalConcepts: number;
}

/**
 * تصحيحٌ حتميّ: هل ذكرت الإجابةُ (بعد التطبيع) مرادفاً واحداً على الأقلّ
 * من كلّ مفهومٍ مطلوب؟ **كلُّ** المفاهيم يجب أن تتحقّق للنجاح — لا نسبةً
 * جزئية تمرّ صامتة.
 */
export function gradeAnswer(quiz: QuizSpec, answerText: string): GradeResult {
  const normalizedAnswer = normalizeSearchText(answerText);
  const matchedIndexes: number[] = [];
  const missingIndexes: number[] = [];
  quiz.requiredConcepts.forEach((concept, i) => {
    const hit = concept.keywords.some((kw) => {
      const nk = normalizeSearchText(kw);
      return nk.length > 0 && normalizedAnswer.includes(nk);
    });
    (hit ? matchedIndexes : missingIndexes).push(i);
  });
  return {
    passed: missingIndexes.length === 0 && normalizedAnswer.length > 0,
    matchedIndexes, missingIndexes,
    totalConcepts: quiz.requiredConcepts.length,
  };
}

/** نتيجةُ وحدةٍ — ثلاثُ قيمٍ لا أكثر (القسم E من المهمّة، بلا تمييزٍ إضافي). */
export type ModuleResult = "completed" | "needs_review" | "practice_only";

/**
 * حالةُ التقدّم — `started` قبل أيّ محاولةٍ منتهية، والبقيّةُ نتائجُ محاولةٍ
 * أُنجزت (ولو احتاجت مراجعة).
 */
export type ProgressStatus = "started" | ModuleResult;

export const PROGRESS_STATUSES: readonly ProgressStatus[] =
  ["started", "completed", "needs_review", "practice_only"];

/**
 * حسمُ نتيجة محاولةٍ لوحدةٍ عملية (بلا اختبار) — تُكتَب `completed` فوراً،
 * وإن كانت `practiceOnly` صراحةً فـ`practice_only` — **لا تصحيحَ آليّ
 * لسيناريوهاتٍ لا يُؤمَن تصحيحُها آلياً** (القسم E: mark as "practice"
 * rather than producing a fake pass/fail).
 */
export function resolveNonQuizResult(practiceOnly: boolean): ModuleResult {
  return practiceOnly ? "practice_only" : "completed";
}
