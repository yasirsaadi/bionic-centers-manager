// المفرداتُ التجارية للمساعد — ترجمةُ حقيقة التطبيق للنموذج، **لا مصدرَ
// حقيقةٍ ثانياً**.
//
// ══ لماذا هذا الملفّ صغيرٌ عمداً ═══════════════════════════════════════
// كلُّ تسميةٍ هنا **إعادةُ تصدير أو تركيبٌ رقيق** فوق خرائط تسمياتٍ قائمة
// أصلاً في `shared/manufacturing.ts` و`shared/medical.ts` — لا تسميةَ
// جديدة تُخترَع، ولا قاعدةَ عملٍ ثانية تنحرف يوماً عن الشاشة الحقيقية. أي
// حقلٍ لا تسميةَ قانونيةً له يبقى بقيمته الخام (يوصَف صراحةً في وصف
// الأداة أنه رمزٌ داخليّ) بدل تسميةٍ مخترَعة هنا.

import {
  PURPOSE_LABELS, SERVICE_TYPE_LABELS, STAGE_LABELS, STATUS_LABELS,
} from "@shared/manufacturing";
import { specialtyLabel } from "@shared/medical";

/** نوعُ الخدمة (طرفٌ صناعي / مسندٌ طبّي) — بالعربية. */
export function serviceTypeLabel(v: string | null | undefined): string {
  if (!v) return "غير محدَّد";
  return SERVICE_TYPE_LABELS[v as keyof typeof SERVICE_TYPE_LABELS] ?? v;
}

/** غرضُ أمر التصنيع: بناءٌ أوّليّ أم صيانة. */
export function purposeLabel(v: string | null | undefined): string {
  const key = v ?? "initial_build"; // نفسُ افتراض التطبيق: غيابُ القيمة = بناءٌ أوّليّ (COALESCE في السجلّ الحقيقيّ)
  return PURPOSE_LABELS[key] ?? key;
}

/** مرحلةُ التصنيع الحالية. */
export function stageLabel(v: string | null | undefined): string {
  if (!v) return "غير محدَّدة";
  return STAGE_LABELS[v] ?? v;
}

/** حالةُ أمر التصنيع. */
export function orderStatusLabel(v: string | null | undefined): string {
  if (!v) return "غير محدَّدة";
  return STATUS_LABELS[v] ?? v;
}

/** الاختصاصُ الطبّي — أطرافٌ صناعية / مساندُ طبية / علاجٌ طبيعي. */
export { specialtyLabel };

// ══ تزويدُ مصدر البيانات الحيّة — للعرض فقط، لا اسمَ أداةٍ يصل الموظّف ═════
//
// خلافاً لتسميات المصنَع أعلاه (تركيبٌ فوق خرائط قائمة)، هذه خريطةٌ
// **جديدة** خاصّةٌ بهذا الغرض وحده — مصدرها مباشرةً وصفُ كلّ أداةٍ في
// `TOOL_NAMES`/`REGISTRY` (`server/ai/tools/registry.ts`)، لا قاعدةَ عملٍ
// أخرى تُقرَأ منها. **ولا اسمَ أداةٍ تقنيّاً (patient_lookup، …) يصل واجهة
// المستخدم أبداً** — فقط هذه التسميةُ العربية، والاسمُ الخام يبقى في سجلّ
// التدقيق وحده.
const TOOL_PROVENANCE_LABELS: Record<string, string> = {
  patient_lookup: "بيانات المريض الحية",
  patient_clinical_summary: "الخلاصة السريرية",
  patient_search: "بحث المرضى",
  my_worklist: "قائمة العمل الحية",
  operational_summary: "الملخص التشغيلي",
  patient_finance: "بيانات المريض المالية",
  financial_summary: "الملخص المالي",
  training_catalog: "كتالوج التدريب",
  training_lesson: "درس تدريبي",
  training_submit_answer: "تصحيح اختبار تدريبي",
};

/**
 * أسماءُ الأدوات المنفَّذة ⟶ تسمياتٌ عربية للعرض، **بلا تكرار وبلا اسمٍ خام**.
 *
 * أداةٌ لا تسميةَ قانونية لها (إضافةٌ مستقبلية نُسي وسمُها هنا) تُترجَم إلى
 * عبارةٍ عامّة صادقة بدل تسريب اسمها الإنجليزي — الصمتُ عن التفصيل أهونُ من
 * كشف رمزٍ داخليّ.
 */
export function toolProvenanceLabels(names: string[] | null | undefined): string[] {
  if (!names || names.length === 0) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const label = TOOL_PROVENANCE_LABELS[n] ?? "بيانات حيّة أخرى من النظام";
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}
