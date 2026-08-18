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

// ══ البحث التدريجي بالرمز ═══════════════════════════════════════════════
// `normalizePatientCode` تجيب سؤالاً واحداً: «هل هذا رمزٌ **كامل**؟». وهو
// السؤال الصحيح لمن يفتح ملفّاً برمزٍ قرأه على ورقة. لكنّ مربّع البحث يسأل
// سؤالاً آخر مع كلّ ضغطة زرّ: «ما الذي يقصده مَن كتب `WB-02` حتى الآن؟».
//
// وحين كان الجواب الوحيد هو الأوّل، صار كلُّ ما دون خمس خاناتٍ **بحثَ اسم**:
// يكتب الموظّف W ثمّ B ثمّ - ثمّ 0 فلا يرى شيئاً، حتى تكتمل الخانة الخامسة
// فتقفز النتيجة دفعةً واحدة. وهذا ليس بحثاً تدريجياً بل انتظارٌ في العتمة.

/** ما يعنيه ما كُتب حين يبدأ بـWB. */
export interface PatientCodeQuery {
  /**
   * بدأ المستخدم صراحةً بـW أو WB — فما يكتبه رمزٌ لا اسم.
   *
   * وهذا **يقصر البحث** لا يوسّعه: مَن كتب WB لا يريد اسماً يحوي هذين
   * الحرفين، ولا يريد تقريباً. فالاسم والهاتف والتسامح كلُّها تُطفأ.
   */
  explicit: boolean;
  /** الرمز القانوني الكامل حين تكتمل الخانات — وإلّا `null`. */
  full: string | null;
  /** بادئةُ المقارنة على الرمز كما هو مخزَّن: «WB-02» · «WB-» حين لا رقم. */
  prefix: string;
  /** خاناتُ الرقم كما كُتبت (بعد ترجمة الأرقام العربية). */
  digits: string;
}

const NOT_A_CODE: PatientCodeQuery = {
  explicit: false, full: null, prefix: "", digits: "",
};

/**
 * يقرأ مدخلَ البحث بوصفه رمزاً — كاملاً كان أو نصفَ مكتوب.
 *
 * يقبل بالتدريج: `W` · `WB` · `WB-` · `WB 0` · `wb02` · `WB-٠٢١` · `WB-02119`
 * وكلُّها بادئةٌ واحدة بعد التطبيع. ويردّ `explicit:false` على كلّ ما عداها —
 * الاسمِ والهاتفِ والرقمِ المجرّد — فيمضي بحثُها في مسارها المعتاد.
 *
 * **و`WBX` ليست رمزاً**: بعد الحرفين لا يأتي إلّا رقمٌ أو لا شيء. فاسمٌ
 * لاتينيٌّ يبدأ بـ`Wb…` لا يُختطف إلى مسار الرموز.
 */
export function parsePatientCodeQuery(input: unknown): PatientCodeQuery {
  if (typeof input !== "string") return NOT_A_CODE;
  const latinized = input.replace(/[٠-٩]/g, (d) =>
    String(d.charCodeAt(0) - 0x0660));
  const compact = latinized.trim().replace(/[\s\-_]+/g, "");
  //  W وحدها كافية: هي أوّل ما يُكتب، والنتائج تبدأ من الحرف الأوّل.
  const m = compact.match(/^[Ww](?:[Bb]([0-9]*))?$/);
  if (!m) return NOT_A_CODE;
  const digits = m[1] ?? "";
  //  الرمز الكامل يُطبَّع بقاعدته (تُقصّ الأصفار الزائدة ثمّ يُعاد الحشو)،
  //  فتصير بادئتُه هي نفسه — ومطابقةُ التمام تسبق مطابقة البادئة في الترتيب.
  const full = digits.length >= PATIENT_CODE_MIN_DIGITS
    ? normalizePatientCode(compact) : null;
  return {
    explicit: true,
    full,
    prefix: full ?? (PATIENT_CODE_PREFIX + digits),
    digits,
  };
}

/**
 * حدّا مدىً يغطّيان البادئة — أو `null` حين لا يمكن حسابُهما بأمان.
 *
 * ══ لماذا مدىً لا `LIKE` ═══════════════════════════════════════════════
 * `LIKE 'WB-02%'` **لا يستعمل الفهرس** إلّا إن كان العمود مفهرساً بـ
 * `text_pattern_ops` أو كانت لغةُ القاعدة `C` بالضبط — و`C.UTF-8` ليست
 * `C` في نظر المخطِّط. أمّا `code >= 'WB-02' AND code < 'WB-03'` فمدىً
 * عاديّ يخدمه الفهرسُ الفريد الموجود أصلاً (`uq_patients_patient_code`)،
 * بلا ترحيلٍ ولا فهرسٍ جديد.
 *
 * **وصحّتُه لا تعتمد على ترتيب البايتات**: أبجديّةُ الرمز ثلاثةُ محارف
 * ثابتة ثمّ أرقام، والحدّان يختلفان عن البادئة في **خانةٍ رقمية واحدة**
 * (`2` مقابل `3`). والأرقام مرتّبةٌ ٠<١<…<٩ في كلّ لغةٍ معروفة، والنصّ
 * أكبرُ من بادئته في كلّ لغةٍ كذلك.
 *
 * ويُردّ `null` حين لا خانة (`WB-`) أو حين تكون الخانات تسعاتٍ كلَّها
 * (`WB-99`)، فالحدّ الأعلى حينها يحتاج زيادةَ محرفٍ غير رقميّ — وذاك ما
 * لا نضمن ترتيبَه. وحينئذٍ يبقى `LIKE` وحده: صحيحٌ دائماً، وأبطأ في حالةٍ
 * نادرة.
 */
export function patientCodePrefixRange(
  prefix: string, digits: string,
): { lo: string; hi: string } | null {
  if (!digits || /^9+$/.test(digits)) return null;
  const arr = digits.split("");
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== "9") {
      const bumped = arr.slice(0, i).join("") + String(Number(arr[i]) + 1);
      return { lo: prefix, hi: PATIENT_CODE_PREFIX + bumped };
    }
  }
  return null;
}
