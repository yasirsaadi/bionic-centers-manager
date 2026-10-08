// Migration 117: **بيعُ الأجزاء الجاهزة بلا أمر تصنيع، وسعرٌ لكلّ جزء** (قرارُ المالك ٢٠٢٦-١٠-٠٨، §4.cu).
//
// «لا يوجد أمرُ تصنيعٍ للسليكون أو القدم أو البقيّة — أمرُ التصنيع للقالب فقط وللطرف الكامل أو المسند» — والغلافُ الإسفنجيّ للخبير كذلك.
// و«إن كان جزءان فالأرتب أن يوضع لكلّ واحدٍ سعرٌ وخصمٌ وسعرٌ نهائيّ ثمّ يظهر مجموعُهم، ولمجموعهم كم مدفوع وكم متبقٍّ».
//
//   • patient_device_episodes.sold_ready_at — **لحظةُ بيع أجزاءٍ جاهزة بلا أمر تصنيع**: الجهازُ يصير `delivered` يومَها. وبه يُعدّ
//     البيعُ في تقرير المبيعات ويُلغى من «تصحيح / إلغاء العملية» — فلا أمرَ يحمل ذلك عنه. والقيدُ: مُسلَّمٌ، وأجزاءٌ لا جهازٌ كامل.
//   • patient_device_episodes.sale_lines — **أسطرُ السعر** (`[{item, originalPrice, discountAmount, finalPrice}]`) — والمجموعُ هو
//     `agreed_cost` كما كان، فكلُّ قارئٍ للمال يعمل بلا تغيير.
//   • ولا إلغاءَ مرّتين لبيعٍ جاهزٍ بلا متابعة: فهرسٌ فريد على الجهاز حين لا أمرَ ولا متابعة (يُنشأ إن لم يكن في التاريخ ما يخالفه).
// أعمدةٌ على جدولٍ قائم بلا قيمةٍ افتراضيّة — لا صفَّ قديمٌ يتغيّر، ولا مسَّ بكاسكيد الحذف ولا بالدمج.
export const name = "117_ready_part_sale";

export const sql = `
ALTER TABLE patient_device_episodes ADD COLUMN IF NOT EXISTS sold_ready_at TIMESTAMPTZ;
ALTER TABLE patient_device_episodes ADD COLUMN IF NOT EXISTS sale_lines JSONB;

DO $m117$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pde_sold_ready') THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT chk_pde_sold_ready CHECK (
      sold_ready_at IS NULL OR (status = 'delivered' AND requested_item <> 'full_device')
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pde_sale_lines') THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT chk_pde_sale_lines CHECK (
      sale_lines IS NULL OR jsonb_typeof(sale_lines) = 'array'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'uq_aor_ready_sale_once')
     AND NOT EXISTS (
       SELECT 1 FROM administrative_operation_reversals
        WHERE work_order_id IS NULL AND followup_id IS NULL AND device_episode_id IS NOT NULL
          AND mode = 'full_operation'
        GROUP BY device_episode_id HAVING COUNT(*) > 1
     ) THEN
    CREATE UNIQUE INDEX uq_aor_ready_sale_once ON administrative_operation_reversals (device_episode_id)
      WHERE work_order_id IS NULL AND followup_id IS NULL AND mode = 'full_operation';
  END IF;
END
$m117$;
`;
