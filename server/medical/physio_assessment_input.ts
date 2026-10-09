// **التقييمُ الأوّليّ للعلاج الطبيعي في بابَي المعاينة** (§4.da، قرارُ المالك ٢٠٢٦-١٠-٠٩) — يُفحَص قبل أيّ كتابة كالاستمارة.
//
// القاعدةُ نفسُها التي تفحص بها الشاشةُ (`parseInitialAssessment`)، ومعها **«التشخيص» إلزاميٌّ** في «قرار الفاحص» حين تصل الاستمارة.
//   • التوقيعُ (POST): معاينةُ علاجٍ طبيعيّ تحمل استمارتها ⟵ تُطبَّع وتُفحَص؛ وغيرُ العلاج الطبيعي لا يُقرأ فيها تقييم.
//     **والغيابُ لا يُرفض**: كما «الاستمارة» في الأجهزة (`sheet`)، عميلٌ قديم يوقّع بلا تقييم كما كان — والنافذةُ ترسله دائماً.
//   • التنقيح (PATCH): الغيابُ = «لم يُلمَس» فيبقى المخزَّن؛ ومعاينةٌ قديمة بلا تقييم تُنقَّح بلا تقييم ما دام فارغاً (لا قيدَ جديد على
//     القديم)؛ وإلّا يُفحَص كاملاً. وتبديلُ اختصاصها عن العلاج الطبيعي يمحو التقييمَ من الصفّ الحيّ (يبقى في النسخة المؤرشفة).
import { assessmentHasContent, parseInitialAssessment } from "@shared/physio_initial_assessment";
import { baghdadTodayYmd } from "@shared/visit_date";

export type AssessmentPrep =
  | { ok: true; value: Record<string, any> | null | undefined }
  | { ok: false; error: string; missing: string[] };

const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function parse(raw: unknown, diagnosis: unknown): AssessmentPrep {
  const r = parseInitialAssessment(raw, { today: baghdadTodayYmd() });
  if (!r.ok) return { ok: false, error: r.error, missing: r.missing };
  if (!hasText(diagnosis)) return { ok: false, error: "اكتب التشخيص في «قرار الفاحص»", missing: ["diagnosis"] };
  return { ok: true, value: r.value as unknown as Record<string, any> };
}

/** التوقيع: `null` = لا تقييمَ يُختَم (غيرُ العلاج الطبيعي، أو عميلٌ لم يرسله). */
export function prepareAssessmentForCreate(caseType: unknown, body: any): AssessmentPrep {
  if (caseType !== "physiotherapy") return { ok: true, value: null };
  const raw = body?.assessment;
  if (raw === undefined || raw === null) return { ok: true, value: null };
  return parse(raw, body?.diagnosis);
}

/** التنقيح: `undefined` = يبقى المخزَّنُ كما هو. */
export function prepareAssessmentForRevise(caseType: unknown, body: any, existing: unknown): AssessmentPrep {
  if (caseType !== "physiotherapy") return { ok: true, value: existing ? null : undefined };
  const raw = body?.assessment;
  //  غيابٌ أو `null` ⟵ يبقى المخزَّن (لا محوَ لتقييمٍ مختوم من هذا الباب)؛ ومعاينةٌ قديمة بلا تقييم واستمارةٌ فارغة ⟵ تبقى بلا تقييم.
  if (raw === undefined || raw === null) return { ok: true, value: undefined };
  if (!existing && !assessmentHasContent(raw)) return { ok: true, value: undefined };
  return parse(raw, body?.diagnosis);
}
