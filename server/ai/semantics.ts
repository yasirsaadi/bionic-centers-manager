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
