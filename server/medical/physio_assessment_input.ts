// **التقييمُ الأوّليّ للعلاج الطبيعي في بابَي المعاينة** (§4.da، ثمّ §4.gz) — يُفحَص قبل أيّ كتابة كالاستمارة.
//
//   • التوقيعُ (POST): **كلُّ معاينة علاجٍ طبيعيّ جديدة على الاستمارة الثانية `BC-PT-02`، وإلزامية** (قرارُ المالك ٢٠٢٦-١١-٢٧، §4.gz —
//     ينقض «لا خانةَ إلزامية» ٢٠٢٦-١٠-١٠ للجديد وحده). قيمةٌ غيرُ صالحة ⟵ ٤٠٠ `assessment_invalid` يسمّي الخانة؛ وإلزاميٌّ ناقص
//     (أو استمارةٌ أولى، أو بلا استمارة — عميلٌ قديم) ⟵ ٤٠٠ `assessment_incomplete` بقائمة الناقص ومعها أسماؤه بالعربية.
//     وغيرُ العلاج الطبيعي لا يُقرأ فيه تقييم.
//   • التنقيح (PATCH): الغيابُ = «لم يُلمَس» فيبقى المخزَّن. **ومعاينةٌ قديمة (`BC-PT-01` أو بلا تقييم) تُنقَّح كما كانت** — بالأولى
//     بلا إلزام، ومعاينةٌ بلا تقييم تبقى بلا تقييم ما دام فارغاً؛ ومَن أرسل الثانيةَ عليها رقّاها فتُفحَص بإلزامها. والمعاينةُ على الثانية
//     تُنقَّح بالثانية كاملةً وحدها — لا تعود إلى الأولى. وتبديلُ اختصاصها عن العلاج الطبيعي يمحو التقييمَ من الصفّ الحيّ (يبقى في النسخة المؤرشفة).
//     **وتنقيحٌ يبدّل معاينةَ اختصاصٍ آخر إلى العلاج الطبيعي** معاينةُ علاجٍ طبيعيّ جديدة ⟵ بقاعدة التوقيع (الثانيةُ كاملةً) لا بقاعدة القديم.
//     **والثانيةُ المخزَّنة حين لا يُرسَل تقييمٌ تُفحَص مع التشخيص الجديد** — التنقيحُ يكتب التشخيصَ كما وصل، فلا يُمحى إلزاميٌّ من بابٍ جانبيّ.
import { assessmentHasContent, parseInitialAssessment } from "@shared/physio_initial_assessment";
import { emptyExamV2, examV2Missing, examV2MissingLabel, examV2MissingText, isExamV2, parseExamV2, PT_FORM_CODE_V2 } from "@shared/physio_exam_v2";
import { baghdadTodayYmd } from "@shared/visit_date";

export type AssessmentPrep =
  | { ok: true; value: Record<string, any> | null | undefined }
  | { ok: false; error: string; missing: string[]; code: "assessment_invalid" | "assessment_incomplete"; missingLabels?: string[] };

function parseV1(raw: unknown): AssessmentPrep {
  const r = parseInitialAssessment(raw, { today: baghdadTodayYmd() });
  if (!r.ok) return { ok: false, error: r.error, missing: r.missing, code: "assessment_invalid" };
  return { ok: true, value: r.value as unknown as Record<string, any> };
}

/** **الثانيةُ كاملةً أو لا شيء** — `diagnosis` نصُّ «التشخيص» في المعاينة نفسِها (خانةٌ إلزامية فيها). */
function parseV2(raw: unknown, diagnosis: unknown): AssessmentPrep {
  const r = parseExamV2(raw, { today: baghdadTodayYmd(), diagnosis: typeof diagnosis === "string" ? diagnosis : "" });
  if (!r.ok) return { ok: false, error: r.error, missing: r.missing, code: "assessment_invalid" };
  if (r.missing.length) {
    const group = r.value.core?.group;
    return {
      ok: false, code: "assessment_incomplete", missing: r.missing,
      missingLabels: r.missing.map((k) => examV2MissingLabel(k, group)),
      error: `معاينةُ العلاج الطبيعي إلزامية — ${examV2MissingText(r.missing, group)}`,
    };
  }
  return { ok: true, value: r.value as unknown as Record<string, any> };
}

/** التوقيع: كلُّ معاينة علاجٍ طبيعيّ تحمل الثانيةَ كاملةً؛ و`null` لغير العلاج الطبيعي. */
export function prepareAssessmentForCreate(caseType: unknown, body: any): AssessmentPrep {
  if (caseType !== "physiotherapy") return { ok: true, value: null };
  const raw = body?.assessment;
  //  بلا استمارة أو بالأولى ⟵ يُفحَص كأنه الثانيةُ فارغة: الناقصُ كلُّه يُسمّى، فيعرف العميلُ القديم ما يُطلب.
  if (!isExamV2(raw)) {
    const r = parseV2(emptyExamV2(), body?.diagnosis);
    return r.ok ? r : { ...r, error: `${r.error} — استمارةُ المعاينة الجديدة ${PT_FORM_CODE_V2} (أعد تحميل الصفحة إن كانت الشاشةُ قديمة)` };
  }
  return parseV2(raw, body?.diagnosis);
}

/** ما ينقص الثانيةَ المخزَّنة مع التشخيص الذي سيُكتب — بصيغة ردّ التوقيع. */
function incompleteOf(a: Parameters<typeof examV2Missing>[0], diagnosis: unknown): AssessmentPrep | null {
  const missing = examV2Missing(a, typeof diagnosis === "string" ? diagnosis : "");
  if (!missing.length) return null;
  const group = a.core?.group;
  return {
    ok: false, code: "assessment_incomplete", missing, missingLabels: missing.map((k) => examV2MissingLabel(k, group)),
    error: `معاينةُ العلاج الطبيعي إلزامية — ${examV2MissingText(missing, group)}`,
  };
}

/**
 * التنقيح: `undefined` = يبقى المخزَّنُ كما هو. `previousCaseType` اختصاصُ المعاينة قبل التنقيح — وتبديلُه إلى العلاج الطبيعي
 * معاينةٌ جديدة بإلزامها.
 */
export function prepareAssessmentForRevise(caseType: unknown, body: any, existing: unknown, previousCaseType?: unknown): AssessmentPrep {
  if (caseType !== "physiotherapy") return { ok: true, value: existing ? null : undefined };
  if (previousCaseType !== undefined && previousCaseType !== "physiotherapy") return prepareAssessmentForCreate(caseType, body);
  const raw = body?.assessment;
  //  غيابٌ أو `null` ⟵ يبقى المخزَّن (لا محوَ لتقييمٍ مختوم من هذا الباب) — والثانيةُ تبقى كاملةً مع التشخيص الذي سيُكتب.
  if (raw === undefined || raw === null) {
    const bad = isExamV2(existing) ? incompleteOf(existing, body?.diagnosis) : null;
    return bad ?? { ok: true, value: undefined };
  }
  if (isExamV2(raw)) return parseV2(raw, body?.diagnosis);
  //  **والمعاينةُ على الثانية لا تعود إلى الأولى** — الإلزامُ لا يُفكّ بإرسال الورقة القديمة.
  if (isExamV2(existing)) {
    return { ok: false, code: "assessment_invalid", missing: ["assessment"], error: `هذه المعاينة على الاستمارة ${PT_FORM_CODE_V2} — تُنقَّح بها كاملةً` };
  }
  //  معاينةٌ قديمة بلا تقييم واستمارةٌ فارغة ⟵ تبقى بلا تقييم؛ وإلّا تُفحَص بالأولى بلا إلزام، كما كانت.
  if (!existing && !assessmentHasContent(raw)) return { ok: true, value: undefined };
  return parseV1(raw);
}
