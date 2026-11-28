// **معاينةٌ إلزاميةٌ كاملة للاختبارات** (`BC-PT-02`، §4.gz) — ألمُ أسفل الظهر غيرُ النوعيّ لرجلٍ في السادسة والأربعين، بلا علامةٍ حمراء.
// كلُّ اختبارٍ يوقّع معاينةَ علاجٍ طبيعيّ لغرضٍ آخر يرسلها (`withCompleteExamV2`) — فالإلزامُ يبقى على الخادم كما هو، ولا يُخفَّف لاختبار.
import { emptyExamV2, emptyExamV3, redFlagQuestionsFor, V2_RED_FLAGS, type PhysioExamV2, type V2Values } from "@shared/physio_exam_v2";

export function completeExamV2(over: { core?: V2Values; module?: V2Values; redFlags?: Record<string, "yes" | "no">; top?: Partial<PhysioExamV2> } = {}): PhysioExamV2 {
  const core: V2Values = {
    group: "lumbar", sex: "male", ageYears: 46, side: "axial", dominantHand: "right", onsetKind: "date", onsetDate: "2026-05-01",
    surgery: "no", painNow: 5, painWorstWeek: 8, irritability: "moderate", canReportHeat: "yes", fac: "5", walkingAid: "none",
    implants: ["none"], anticoagulant: ["none"], diabetes: "no", cancer: "no", skin: ["none"], boneHealth: ["none"], fallsLastYear: 0,
    fasting: "no", epilepsy: "none", immunosuppressed: "no", weightKg: 88, betaBlocker: "no", botox: "no",
    ...(over.core ?? {}),
  };
  const module: V2Values = core.group === "lumbar"
    ? { condition: "nonspecific", belowKnee: "no", startBack: "medium", directionPref: "extension", backPain: 5, legPain: 0, ...(over.module ?? {}) }
    : { ...(over.module ?? {}) };
  const redFlags: Record<string, "yes" | "no"> = Object.fromEntries(
    redFlagQuestionsFor(core.group, module.condition ?? null).map((q) => [q.key, "no" as const]));
  return { ...emptyExamV2(), sensation: "intact", ...(over.top ?? {}), core, module, redFlags: { ...redFlags, ...(over.redFlags ?? {}) } };
}

/** جسمُ توقيعٍ لمعاينة علاجٍ طبيعيّ يحمل الإلزاميّةَ كاملةً — ويُبقي ما أرسله الاختبارُ نفسُه. */
export function withCompleteExamV2<T extends Record<string, any>>(body: T): T & { assessment: PhysioExamV2; diagnosis: string } {
  return { ...body, diagnosis: (typeof body.diagnosis === "string" && body.diagnosis.trim()) ? body.diagnosis : "ألم أسفل الظهر", assessment: body.assessment ?? completeExamV2() };
}

/** **أقسامُ الأولى في الثانية** — تقييمٌ أوّل بخاناته (القوة · أشورث · الوظيفة · الخطّة …) يصير معاينةً إلزامية كاملة تحملها. */
export function v2FromV1(v1: Record<string, any>, core: V2Values = {}): PhysioExamV2 {
  const { painBest: _b, painWorst: _w, surgeryDate: _s, sectionANa: _n, form: _f, version: _v, ...sections } = v1;
  return completeExamV2({ core, top: sections as Partial<PhysioExamV2> });
}

/** **معاينةٌ بالإصدار الثالث بأقلّ ما يُقبل** (§4.hd): ورقةُ السلامة والعلاماتُ الأربعون «لا» — ولا مجموعةَ ولا خانةً اختيارية. */
export function minimalExamV3(over: { core?: V2Values; module?: V2Values; redFlags?: Record<string, "yes" | "no">; top?: Partial<PhysioExamV2> } = {}): PhysioExamV2 {
  const core: V2Values = {
    sex: "male", ageYears: 46, onsetKind: "date", onsetDate: "2025-01-01", surgery: "no", irritability: "moderate", canReportHeat: "yes", implants: ["none"],
    metalInField: "no", anticoagulant: ["none"], cancer: "no", skin: ["none"], steroidInjection: "no", boneHealth: ["none"], epilepsy: "none",
    ...(over.core ?? {}),
  };
  return { ...emptyExamV3(), sensation: "intact", ...(over.top ?? {}), core, module: { ...(over.module ?? {}) },
    redFlags: { ...Object.fromEntries(V2_RED_FLAGS.map((f) => [f.key, "no" as const])), ...(over.redFlags ?? {}) } };
}
