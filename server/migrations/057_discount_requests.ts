/**
 * Migration 057 — الخصمُ يُسجَّل كما طُلب، ويُقرأ بعد اعتماده كما كان
 *
 * **ثلاثةُ أعمدةٍ تُضاف وقيمةٌ تُتاح.** لا جدولَ يُنشأ ولا صفَّ يُعدَّل ولا
 * قيمةَ تُخمَّن بأثرٍ رجعي.
 *
 * ══ لماذا لزمت أعمدةٌ أصلاً ════════════════════════════════════════════
 * `current_price` و`proposed_price` يقولان «كان مليوناً فصار ثمانمئة ألف»
 * — ولا يقولان **ما الذي طُلب**: أهو «اخصم ٢٠٠٬٠٠٠» أم «اخصم ٢٠٪»؟
 * الرقمان يتطابقان هنا مصادفةً، ويفترقان في كلّ سعرٍ آخر. والمراجعةُ
 * بعد سنة تحتاج ما قاله الموظّف لا ما استنتجناه منه.
 *
 * ══ ولماذا في الجدول القائم لا في جدولٍ ثانٍ ════════════════════════════
 * لأن الخصمَ **هو** طلبُ تغيير السعر، لا كيانٌ يوازيه. وجدولُ اعتمادٍ ثانٍ
 * كان سيُنتج طابورين وقاعدتَي «طلبٍ معلَّق واحد» وحقيقتين ماليّتين تنحرف
 * إحداهما يوماً. فالفهرسُ الفريد الجزئي القائم (uq_pcr_one_pending)
 * يبقى حارساً واحداً لكليهما.
 *
 * ══ والقديمُ يبقى مقروءاً ═══════════════════════════════════════════════
 * صفوفٌ سابقة قد تكون تغييرَ سعرٍ عامّاً لا خصماً — فتبقى بأعمدةٍ فارغة
 * وتُقرأ «تعديل سعر (سجلّ قديم)». والقيدُ أدناه **يُعفيها صراحةً**: فرعُه
 * الأول يشترط الأعمدةَ الثلاثة فارغةً معاً، وهي كذلك فيها بالضرورة لأنها
 * لم تكن موجودةً يومَ كُتبت. فلا يُطالَب تاريخٌ بشروطٍ وُضعت بعده.
 *
 * ══ والقيدُ يمنع الكذب لا يوثّقه ════════════════════════════════════════
 * `discount_amount` مشتقٌّ رياضياً من العمودين القائمين، وتخزينُه يجعله
 * قابلاً للانحراف عنهما. فالقيدُ يربطه بمصدرَيه معاً:
 *   • بفرق السعرين:  discount_amount = current_price - proposed_price
 *   • **وبما طُلب**:  مبلغاً ⟶ discount_value = discount_amount
 *                    نسبةً ⟶ discount_amount = round(current_price * discount_value / 100)
 * فصفٌّ يزعم «اخصم ١٠٬٠٠٠» ويحمل خصماً بخمسين ألفاً **لا يمكن أن يوجد**،
 * ولو أدرجه نداءٌ مباشر من محرّر SQL. والخصمُ موجبٌ والسعرُ النهائي موجب —
 * فما يمرّ من هنا خصمٌ حقيقي لا رفعَ سعرٍ متنكّر.
 *
 * ══ ومصدرُ السعر صار ثلاثةً ═════════════════════════════════════════════
 * كان الاعتمادان — تعديلُ سعرٍ عامّ قديم وخصمٌ جديد — ينتهيان إلى
 * `approved_change` نفسِها، فيضيع الفرقُ **بعد** الحسم: صفٌّ اعتُمد رفعُ
 * سعره يُقرأ «بعد الخصم» في البطاقة. فأُضيفت `approved_discount` للجديد
 * وحده، و`approved_change` **تبقى كما هي** لا تُعاد كتابتُها ولا يُرحَّل
 * صفٌّ واحد: تعني ما كانت تعنيه يومَ كُتبت.
 *
 * ══ idempotent — ومتقارِبٌ لا مجرّد آمنِ الإعادة ════════════════════════
 * الأعمدةُ بـIF NOT EXISTS. والقيودُ لا تعرفها، فتُفحص **بنصّها** لا
 * بوجودها: قاعدةٌ عليها نسخةٌ أقدم من هذا الترحيل يُعاد بناءُ قيدها،
 * وقاعدةٌ عليها النسخةُ الحالية لا تُمَسّ. فالنتيجةُ واحدة مهما كان
 * المُنطلَق — وهذا ما تحتاجه قاعدةُ تطويرٍ سبقها ترحيلٌ نصفَ منشور.
 */

export const name = "057_discount_requests";

export const sql = `
ALTER TABLE price_change_requests
  ADD COLUMN IF NOT EXISTS discount_mode TEXT,
  ADD COLUMN IF NOT EXISTS discount_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER;

-- القيدان يُضافان مرّةً واحدة: الترحيل يُشغَّل عند كلّ إقلاع، و
-- ADD CONSTRAINT لا يعرف IF NOT EXISTS.
DO $d1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'price_change_requests_discount_mode_check'
       AND conrelid = 'price_change_requests'::regclass
  ) THEN
    ALTER TABLE price_change_requests
      ADD CONSTRAINT price_change_requests_discount_mode_check
      CHECK (discount_mode IS NULL OR discount_mode IN ('amount', 'percentage'));
  END IF;
END
$d1$;

-- **صفٌّ إمّا قديمٌ تماماً وإمّا خصمٌ تامّ — ولا ثالثَ بينهما.**
--
-- والفرعُ الأول يشترط **الأعمدةَ الثلاثة فارغةً معاً** لا عمودَ النوع وحده:
-- لولا ذلك لكفى تفريغُ عمود النوع كي يتنكّر صفٌّ نصفُ ممتلئ في هيئة
-- سجلٍّ قديم، فيحمل مبلغَ خصمٍ لا يطابق فرقَ السعرين ولا يفحصه أحد. والصفوفُ
-- التاريخية تمرّ لأن أعمدتها الثلاثة لم تكن موجودةً أصلاً فهي فارغةٌ كلُّها.
--
-- والفرعُ الثاني يربط المبلغَ **بما طُلب** لا بفرق السعرين وحده: مبلغاً
-- فالقيمةُ هي المبلغُ عينه، ونسبةً فالمبلغُ ناتجُها مقرَّباً بنفس دلالة
-- الشاشة (النصفُ يصعد). فلا صفَّ يزعم نسبةً ويحمل مبلغاً لا يخرج منها.
--
-- والفحصُ **بنصّ القيد**: قاعدةٌ تحمل نسخةً أقدم (بلا round) يُعاد بناءُ
-- قيدها، والتي تحمل الحالية تُترك. فالإعادةُ لا تُضاعف ولا تُبقي قديماً.
DO $d2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'price_change_requests_discount_shape_check'
       AND conrelid = 'price_change_requests'::regclass
       AND pg_get_constraintdef(oid) LIKE '%round%'
  ) THEN
    ALTER TABLE price_change_requests
      DROP CONSTRAINT IF EXISTS price_change_requests_discount_shape_check;
    ALTER TABLE price_change_requests
      ADD CONSTRAINT price_change_requests_discount_shape_check
      CHECK (
        (
          discount_mode IS NULL
          AND discount_value IS NULL
          AND discount_amount IS NULL
        )
        OR (
          discount_mode IN ('amount', 'percentage')
          AND discount_value IS NOT NULL AND discount_value > 0
          AND discount_amount IS NOT NULL AND discount_amount > 0
          AND proposed_price > 0
          AND proposed_price < current_price
          AND discount_amount = current_price - proposed_price
          AND (discount_mode <> 'percentage' OR discount_value < 100)
          AND (discount_mode <> 'amount' OR discount_value = discount_amount)
          AND (discount_mode <> 'percentage'
               OR discount_amount = round(current_price * discount_value / 100))
        )
      );
  END IF;
END
$d2$;

-- **مصدرُ السعر ثلاثةٌ لا اثنان.** القيدُ من ترحيل ٠٥٣ يعرف قيمتين، فيُوسَّع
-- هنا بقيمةٍ ثالثة. والفحصُ بنصّه لا بوجوده — فالاسمُ واحدٌ والمضمونُ تغيّر.
-- ولا صفَّ يُعدَّل: القيمةُ الجديدة تُكتب من اليوم فصاعداً وحدها.
DO $d3$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_price_source_check'
       AND conrelid = 'post_exam_followups'::regclass
       AND pg_get_constraintdef(oid) LIKE '%approved_discount%'
  ) THEN
    ALTER TABLE post_exam_followups
      DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check;
    ALTER TABLE post_exam_followups
      ADD CONSTRAINT post_exam_followups_price_source_check
      CHECK (price_source IN ('exam', 'approved_change', 'approved_discount'));
  END IF;
END
$d3$;
`;
