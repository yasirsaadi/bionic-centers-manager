/**
 * Migration 057 — الخصمُ يُسجَّل كما طُلب
 *
 * **ثلاثةُ أعمدةٍ تُضاف، فارغةٌ لكل صفٍّ قائم.** لا جدولَ يُنشأ ولا صفَّ
 * يُعدَّل ولا قيمةَ تُخمَّن بأثرٍ رجعي.
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
 * إحداهما يوماً. فالفهرسُ الفريد الجزئي القائم (`uq_pcr_one_pending`)
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
 * قابلاً للانحراف عنهما. فالقيدُ يربطهما:
 *   discount_amount = current_price - proposed_price
 * فيبقى صريحاً للقراءة **ولا يستطيع أن يخالف** مصدره. والخصمُ موجبٌ
 * والسعرُ النهائي موجب — فما يمرّ من هنا خصمٌ حقيقي لا رفعَ سعرٍ متنكّر.
 *
 * idempotent: `IF NOT EXISTS` في العمود، وفحصُ `pg_constraint` في القيد.
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
DO $d2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'price_change_requests_discount_shape_check'
       AND conrelid = 'price_change_requests'::regclass
  ) THEN
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
        )
      );
  END IF;
END
$d2$;
`;
