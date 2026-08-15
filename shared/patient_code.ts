// رمزُ المريض العلني — صيغتُه وتطبيعُه. مصدرُ حقيقةٍ واحد للطرفين.
//
// ══ لماذا مشترك ═════════════════════════════════════════════════════════
// الرمز يُكتب في مربّع البحث، ويُقرأ في السجلّ، ويُرسَل في تلغرام، وسيقرؤه
// المساعد الذكي لاحقاً. فصيغةٌ تُكتب في أربعة مواضع تنحرف في أحدها يوماً،
// والانحراف هنا يعني «لم أجد المريض» لمريضٍ موجود.
//
// ══ الصيغة القانونية ════════════════════════════════════════════════════
//   WB- + رقمٌ بخمس خانات على الأقلّ. ولا قصَّ بعدها:
//   1 ⟶ WB-00001 · 1629 ⟶ WB-01629 · 100000 ⟶ WB-100000
//
// ══ والتطبيع متساهلٌ في المدخل صارمٌ في المخرج ═══════════════════════════
// الموظّف يكتب ما يقرؤه على الورقة أو ما يمليه المريض هاتفياً: بحروفٍ
// صغيرة، بلا شَرطة، بفراغ. كلّها تصل الوجهة نفسها.
//
// **لكنّ رقماً مجرّداً ليس رمزاً.** «00042» في مربّع بحثٍ يبحث في الهواتف
// أيضاً قد يكون بداية رقم هاتف — فتفسيرُه رمزاً يسرق البحث من صاحبه.
// فالبادئة WB شرطٌ لا زينة.

/** أقلّ عرضٍ للجزء الرقمي. ولا حدّ أعلى. */
export const PATIENT_CODE_MIN_DIGITS = 5;

export const PATIENT_CODE_PREFIX = "WB-";

/** ما تقبله القاعدة حرفياً — نفس تعبير قيد CHECK في الترحيل ٠٥٢. */
export const PATIENT_CODE_PATTERN = /^WB-[0-9]{5,}$/;

/** رقمٌ ⟶ رمزٌ قانوني. **بلا قصّ** فوق خمس خانات. */
export function formatPatientCode(n: number): string {
  const digits = String(Math.trunc(n));
  return PATIENT_CODE_PREFIX + (digits.length >= PATIENT_CODE_MIN_DIGITS
    ? digits
    : digits.padStart(PATIENT_CODE_MIN_DIGITS, "0"));
}

/** هل هذا نصٌّ قانوني تماماً كما تخزّنه القاعدة. */
export function isCanonicalPatientCode(v: unknown): v is string {
  return typeof v === "string" && PATIENT_CODE_PATTERN.test(v);
}

/**
 * مدخلُ المستخدم ⟶ الرمز القانوني، أو `null` إن لم يكن رمزاً.
 *
 * يقبل: `WB-00042` · `wb-00042` · `WB00042` · `wb00042` · `WB 00042` ·
 * وفراغاتٍ حول الكلّ. والأرقام العربية-الهندية تُترجَم أيضاً، فمن يكتب
 * بلوحةٍ عربية لا يُحرَم من البحث.
 *
 * ويردّ `null` على: الرقم المجرّد · الاسم · الهاتف · بادئةً بلا رقم ·
 * رقماً أقلّ من خمس خانات (`WB-42` ليس رمزاً — الرموز تُكتب كاملة، وقبول
 * الناقص يعني تخمين أصفارٍ لم يكتبها أحد).
 */
export function normalizePatientCode(input: unknown): string | null {
  if (typeof input !== "string") return null;
  //  الأرقام العربية-الهندية ٠١٢٣٤٥٦٧٨٩ ⟶ 0123456789
  const latinized = input.replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660));
  const compact = latinized.trim().replace(/[\s\-_]+/g, "");
  const m = compact.match(/^[Ww][Bb]([0-9]+)$/);
  if (!m) return null;
  const digits = m[1];
  if (digits.length < PATIENT_CODE_MIN_DIGITS) return null;
  //  الأصفار البادئة الزائدة لا تصنع رمزاً آخر: WB-000042 هو WB-00042.
  //  (لا يقع عملياً، لكنّ تركَه يجعل بحثاً صحيحاً يخفق بلا سبب مفهوم.)
  const n = Number(digits);
  if (!Number.isSafeInteger(n)) return PATIENT_CODE_PREFIX + digits;
  return formatPatientCode(n);
}

/** هل يبدو ما كتبه المستخدم محاولةَ بحثٍ برمز — ولو كانت مشوّهة. */
export function looksLikePatientCode(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return /^\s*[Ww][Bb][\s\-_]*[0-9٠-٩]/.test(input);
}
