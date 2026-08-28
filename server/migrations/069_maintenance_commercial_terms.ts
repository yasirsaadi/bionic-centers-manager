/**
 * ٠٦٩ — **الشروطُ التجاريةُ المُهيكَلة للصيانة المبسّطة** (المرحلة الثالثة).
 *
 * ══ ما يفعله ═════════════════════════════════════════════════════════════
 * يضيف إلى `prosthetic_work_orders` ثلاثةَ أعمدة: `maintenance_original_price`
 * و`maintenance_final_price` و`maintenance_price_kind` — الحقيقةُ المُهيكَلة
 * لسعر الصيانة المبسّطة (`server/pending_charges` بعد هذا الترحيل)، بدل
 * الاكتفاء بمبلغٍ خامٍ لا يقول أكان عادياً أم بخصمٍ أم مجّانياً صراحة.
 *
 * ══ فُحص أوّلاً: لا يوجد سجلٌّ مُهيكَل مكافئ على `prosthetic_work_orders`
 *    ═══════════════════════════════════════════════════════════════════════
 * العمودُ الوحيد ذو الصلة على هذا الجدول هو `no_exam_no_charge` — بوليانٌ
 * ثلاثيّ («لم يُسأل / بلا أجرٍ صراحة / بأجرٍ») لا يحمل رقماً أصلاً ولا
 * أصلاً ولا نوعاً. **فلا تكرارَ حقيقةٍ هنا** — عمودٌ جديدٌ بمعنىً جديد.
 *
 * ══ ولا عمودَ خصمٍ زائداً ════════════════════════════════════════════════
 * `discount_amount = maintenance_original_price - maintenance_final_price`
 * دائماً — قيمةٌ مُشتقّة لا تُخزَّن، فلا تنحرف عن مصدرها.
 *
 * ══ والقديمُ يبقى `NULL` — صدقٌ لا نقص ══════════════════════════════════
 * أوامرُ الصيانة قبل هذا الترحيل (وأوامرُ اعتماد الخصم الموروثة التي تنادي
 * `createMaintenanceOrderWithVisit` مباشرةً من `server/discounts/store.ts`
 * بلا هذه الحقول) **لا تُملأ رجعياً** — لم تُسجَّل بهذا الشكل يوم وقعت.
 * `NULL` تعني «لم يُسجَّل مُهيكَلاً»، لا صفراً ولا افتراضاً.
 *
 * ══ والقيودُ تمنع الحالةَ المستحيلة من الوجود ═══════════════════════════
 * الثلاثةُ معاً أو لا شيء (`maintenance_commercial_shape_check`) · الغرضُ
 * `maintenance` حين تكون موجودة (`maintenance_commercial_purpose_check`) ·
 * أصلٌ موجب ونهائيٌّ غيرُ سالب ولا يتجاوز الأصل
 * (`maintenance_commercial_bounds_check`) · وعلاقةُ النوع بالنهائي مطابقةً
 * لثوابت `shared/commercial.ts: computeCommercialOffer` بحرفها
 * (`maintenance_commercial_kind_check`): عاديّ ⟺ نهائيّ = أصليّ · بخصمٍ ⟺
 * ٠ < نهائيّ < أصليّ · مجّانيّ ⟺ نهائيّ = ٠.
 *
 * إضافيٌّ بالكامل، قابلٌ للتشغيل مرّتين. بلا `DROP` ولا `DELETE` ولا
 * `TRUNCATE`، ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٦٨، ولا `DEFAULT` يكتب معنىً
 * على صفٍّ قائم.
 */
export const name = "069_maintenance_commercial_terms";

export const sql = `
ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS maintenance_original_price INTEGER,
  ADD COLUMN IF NOT EXISTS maintenance_final_price    INTEGER,
  ADD COLUMN IF NOT EXISTS maintenance_price_kind      TEXT;

COMMENT ON COLUMN prosthetic_work_orders.maintenance_original_price IS
  'السعر الاصلي المعلن قبل اي خصم — الصيانة المبسطة (المرحلة الثالثة). NULL = لم يسجل مهيكلا (قديم او عبر اعتماد خصم موروث).';
COMMENT ON COLUMN prosthetic_work_orders.maintenance_final_price IS
  'المبلغ النهائي المقيد فعلا = maintenance_original_price - الخصم. مطابق دائما لما قيدته postMaintenanceFee.';
COMMENT ON COLUMN prosthetic_work_orders.maintenance_price_kind IS
  'normal | discount | free — الدليل لا الرقم، بنفس دلالة price_kind في post_exam_followups (migration 066).';

DO $$
BEGIN
  --  ══ **الثلاثةُ معاً أو لا شيء** ═══════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_commercial_shape_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_commercial_shape_check
      CHECK (
        (maintenance_original_price IS NULL
         AND maintenance_final_price IS NULL
         AND maintenance_price_kind IS NULL)
        OR
        (maintenance_original_price IS NOT NULL
         AND maintenance_final_price IS NOT NULL
         AND maintenance_price_kind IS NOT NULL)
      );
  END IF;

  --  ══ **الغرضُ صيانةٌ حين تكون الحقول موجودة** — لا سعرَ مهيكلا على بناءٍ أول ══
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_commercial_purpose_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_commercial_purpose_check
      CHECK (maintenance_original_price IS NULL OR purpose = 'maintenance');
  END IF;

  --  ══ **الحدودُ الآمنة** — نفسُ ثوابت computeCommercialOffer بحرفها ══════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_commercial_bounds_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_commercial_bounds_check
      CHECK (
        maintenance_original_price IS NULL
        OR (maintenance_original_price > 0
            AND maintenance_final_price >= 0
            AND maintenance_final_price <= maintenance_original_price)
      );
  END IF;

  --  ══ **النوعُ لا يكذب على العلاقة بين الأصلي والنهائي** ════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_commercial_kind_check'
  ) THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_commercial_kind_check
      CHECK (
        maintenance_price_kind IS NULL
        OR (maintenance_price_kind = 'normal'   AND maintenance_final_price = maintenance_original_price)
        OR (maintenance_price_kind = 'discount' AND maintenance_final_price > 0
            AND maintenance_final_price < maintenance_original_price)
        OR (maintenance_price_kind = 'free'     AND maintenance_final_price = 0)
      );
  END IF;
END $$;
`;
