// **الصيانةُ ضمن الضمان — حالةٌ مهيكلةٌ مستقلّة، لا «مجّانيّ» بثوبٍ آخر.**
// (قرارُ المالك ٢٠٢٦-٠٩-١٨، المرحلةُ الثانية من تبسيط الصيانة.)
//
// ══ الواقعة ═════════════════════════════════════════════════════════════
// جهازٌ يُصلَّح ضمن ضمانه واقعةٌ مختلفةٌ تماماً عن تبرّعٍ مجّانيّ: الأولى
// التزامٌ سبق أن قطعه المركز، والثانية قرارُ منحٍ جديد. وكلتاهما تنتهي إلى
// **أجرٍ صفر** — فلو دُلَّ عليهما بـ`maintenance_price_kind = 'free'` وحدَه
// لصارتا صفّاً واحداً في القاعدة لا يُفرَّق بينهما بعد اليوم: لا تقريرُ
// ضمانٍ يُبنى، ولا تكلفةُ الالتزام تُعرَف، ولا يُقال كم جهازاً عاد في ضمانه.
//
// ══ ولماذا عمودٌ مستقلّ لا قيمةُ نوعٍ رابعة ══════════════════════════════
// `maintenance_price_kind` عمودٌ يصف **العلاقة بين الأصليّ والنهائيّ**
// (ترحيل ٠٦٩)، ويحرسه `maintenance_commercial_kind_check` بثلاث قيمٍ
// مُحكَمة. وإقحامُ «ضمان» فيه يخلط سؤالين: «كم يُدفَع؟» و«لماذا لا يُدفَع؟».
// **فالعلامةُ عمودٌ صريحٌ بجواره**: النوعُ يبقى `free` (والرقمان متّسقان
// معه كما كانا)، والعمودُ الجديد يقول **لماذا**. فصيانةٌ مجّانيةٌ عادية
// تحمل `FALSE`، وصيانةُ ضمانٍ تحمل `TRUE` — والتفريقُ قائمٌ في القاعدة لا
// في تخمين قارئ.
//
// ══ و`NULL` غيابُ سؤالٍ لا «ليست ضماناً» ════════════════════════════════
// **بلا `DEFAULT`**: أوامرُ الصيانة قبل هذا الترحيل لم تُسأل، وكتابةُ
// `FALSE` عليها تدّعي علماً بالماضي (درسُ ٠٣٨/٠٣٥/٠٦٩/٠٦٥ بحرفه). فتبقى
// `NULL` صادقة، **ولا تعبئةَ رجعية**. والمسارُ المبسّط وحده يكتب بولياناً
// صريحاً على كلّ صفٍّ جديد — لأنه يسأل فعلاً.
//
// ══ والقيدان يمنعان الحالةَ المستحيلة ═══════════════════════════════════
//   ① ضمانٌ على أمرٍ ليس صيانة — البناءُ الأوّليُّ لا ضمانَ عليه، فهو
//      الجهازُ الذي يُصنَع لا إصلاحُ جهازٍ سابق.
//   ② ضمانٌ بأجرٍ — التزامٌ يُقال «ضمن الضمان» ثمّ يُقيَّد عليه دينار
//      يناقض نفسَه. فالنهائيُّ صفرٌ حتماً، والأصليُّ موجودٌ وموجب (القيمةُ
//      الاسمية للصيانة تبقى محفوظةً كما أدخلها الموظّف).
// وكلاهما **توسيعٌ لا تضييق**: كلُّ صفٍّ قائم (`NULL`) يجتازهما كما هو.
//
// ══ وبلا `DROP` ولا `DELETE` ولا `UPDATE` ═══════════════════════════════
// عمودٌ جديد وقيدان لا أكثر، idempotent، ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٨٢.

export const name = "083_maintenance_warranty";

export const sql = `
ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS maintenance_under_warranty BOOLEAN;

COMMENT ON COLUMN prosthetic_work_orders.maintenance_under_warranty IS
  'TRUE = صيانة ضمن الضمان (اجر صفر بقرار التزام سابق) · FALSE = ليست ضمانا (سئل الموظف واجاب) · NULL = لم يسأل (امر سابق للترحيل او خارج المسار المبسط). لا يغني عن maintenance_price_kind بل يفسره.';

DO $$
BEGIN
  --  ══ **الضمانُ على أمرِ صيانةٍ وحدَه** ═════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_warranty_purpose_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_warranty_purpose_check
      CHECK (maintenance_under_warranty IS NULL OR purpose = 'maintenance');
  END IF;

  --  ══ **وضمانٌ بأجرٍ تناقضٌ** — النهائيُّ صفرٌ، والأصليُّ محفوظٌ موجب ═════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_warranty_shape_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_warranty_shape_check
      CHECK (
        maintenance_under_warranty IS NOT TRUE
        OR (maintenance_original_price IS NOT NULL
            AND maintenance_original_price > 0
            AND maintenance_final_price = 0)
      );
  END IF;
END $$;
`;
