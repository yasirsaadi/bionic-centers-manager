// **صيانةُ الضمان بلا خانات مال** (طلبُ المالك ٢٠٢٦-٠٩-٣٠، §4.aa).
//
// «حين نؤشّر ضمن الصيانة فالأصحّ أن تنطفئ خانات المبالغ كلّها وليس فقط المدفوعة». كان
// `maintenance_warranty_shape_check` يشترط سعراً أصلياً موجباً على كلّ أمرِ ضمان، فتبقى خانةُ «السعر الأصلي»
// إلزاميةً في النافذة. يُرخى الآن ليقبل **شكلين**: ضمانٌ بلا أرقامٍ أصلاً (الأصليُّ والنهائيُّ `NULL` —
// و`maintenance_commercial_shape_check` القائم يُلزم النوعَ `NULL` معهما)، أو ضمانٌ بقيمةٍ اسميةٍ موجبة كما كان.
// **وضمانٌ بأجرٍ يبقى ممنوعاً**. بلا لمسِ صفٍّ واحد، idempotent (حذفٌ وإعادةُ إنشاءٍ للقيد وحده).

export const name = "091_warranty_without_price";

export const sql = `
ALTER TABLE prosthetic_work_orders DROP CONSTRAINT IF EXISTS maintenance_warranty_shape_check;
ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_warranty_shape_check
  CHECK (
    maintenance_under_warranty IS NOT TRUE
    OR (maintenance_original_price IS NULL AND maintenance_final_price IS NULL)
    OR (maintenance_original_price IS NOT NULL
        AND maintenance_original_price > 0
        AND maintenance_final_price = 0)
  );
`;
