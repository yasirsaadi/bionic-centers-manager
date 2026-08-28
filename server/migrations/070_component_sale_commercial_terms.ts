/**
 * ٠٧٠ — **الشروطُ التجاريةُ المُهيكَلة لبيع الجزء المبسّط** (المرحلة الرابعة).
 *
 * ══ ما يفعله ═════════════════════════════════════════════════════════════
 * يضيف إلى `patient_device_episodes` عمودين: `component_sale_original_price`
 * و`component_sale_price_kind` — الحقيقةُ المُهيكَلة لأصل سعر بيع الجزء
 * بلا معاينة (`server/pending_charges` بعد هذا الترحيل)، بدل الاكتفاء
 * بـ`agreed_cost` وحده الذي يقول **النهائيّ** فقط لا أصلَه ولا نوعَه.
 *
 * ══ فُحص أوّلاً: لا يوجد سجلٌّ مُهيكَل مكافئ على `patient_device_episodes`
 *    ═══════════════════════════════════════════════════════════════════════
 * `agreed_cost` هو **النهائيُّ الفعليُّ المقيَّد** بالفعل — الكاتبُ القانونيّ
 * `setEpisodeAgreedCostTx` يكتبه، ولا عمودَ ثانياً يكرّره هنا. لكن لا عمودَ
 * قائماً يحمل الأصلَ قبل الخصم ولا نوعَ السعر (عاديّ/خصم/مجّانيّ) — **فلا
 * تكرارَ حقيقةٍ هنا**، عمودان جديدان بمعنىً جديد فقط.
 *
 * ══ ولا عمودَ خصمٍ زائداً ════════════════════════════════════════════════
 * `discountAmount = component_sale_original_price - agreed_cost` دائماً —
 * قيمةٌ مُشتقّة لا تُخزَّن، فلا تنحرف عن مصدرها.
 *
 * ══ والقديمُ يبقى `NULL` — صدقٌ لا نقص ══════════════════════════════════
 * حلقاتُ بيع الجزء قبل هذا الترحيل (وأيّ حلقةٍ لا تخصّ بيعَ جزءٍ بلا معاينة
 * أصلاً — طرفٌ كاملٌ أو مسندٌ أو حلقةٌ على مسار المعاينة) **لا تُملأ رجعياً**
 * — لم تُسجَّل بهذا الشكل يوم وقعت. `NULL` تعني «لم يُسجَّل مُهيكَلاً»، لا
 * صفراً ولا افتراضاً.
 *
 * ══ والقيودُ تمنع الحالةَ المستحيلة من الوجود ═══════════════════════════
 * الاثنان معاً أو لا شيء (`pde_component_sale_shape_check`) · الأهليّةُ —
 * جزءٌ حقيقيّ لا `full_device`، ومسارُ العملية `no_exam` بعينه
 * (`pde_component_sale_eligibility_check`) · الأصلُ موجبٌ والنهائيُّ بين
 * الصفر والأصل (`pde_component_sale_bounds_check`) · وعلاقةُ النوع بالنهائي
 * مطابقةً لثوابت `shared/commercial.ts: computeCommercialOffer` بحرفها
 * (`pde_component_sale_kind_check`): عاديّ ⟺ نهائيّ = أصليّ · بخصمٍ ⟺
 * ٠ < نهائيّ < أصليّ · مجّانيّ ⟺ نهائيّ = ٠.
 *
 * إضافيٌّ بالكامل، قابلٌ للتشغيل مرّتين. بلا `DROP` ولا `DELETE` ولا
 * `TRUNCATE`، ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٦٩، ولا `DEFAULT` يكتب معنىً
 * على صفٍّ قائم.
 */
export const name = "070_component_sale_commercial_terms";

export const sql = `
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS component_sale_original_price INTEGER,
  ADD COLUMN IF NOT EXISTS component_sale_price_kind      TEXT;

COMMENT ON COLUMN patient_device_episodes.component_sale_original_price IS
  'السعر الاصلي المعلن قبل اي خصم — بيع الجزء المبسط (المرحلة الرابعة). NULL = لم يسجل مهيكلا (قديم او حلقة لا تخص بيع جزء بلا معاينة).';
COMMENT ON COLUMN patient_device_episodes.component_sale_price_kind IS
  'normal | discount | free — الدليل لا الرقم، بنفس دلالة price_kind في post_exam_followups (٠٦٦) وmaintenance_price_kind في prosthetic_work_orders (٠٦٩). النهائي الفعلي يبقى agreed_cost — لا عمود ثانٍ له.';

DO $$
BEGIN
  --  ══ **الاثنان معاً أو لا شيء** ═══════════════════════════════════════
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pde_component_sale_shape_check'
  ) THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT pde_component_sale_shape_check
      CHECK (
        (component_sale_original_price IS NULL AND component_sale_price_kind IS NULL)
        OR
        (component_sale_original_price IS NOT NULL AND component_sale_price_kind IS NOT NULL)
      );
  END IF;

  --  ══ **الأهليّة** — جزءٌ حقيقيّ لا جهازاً كاملاً، ومسارُ العملية بعينه ═══
  --  requested_item غيرُ full_device تكفي وحدها لإثبات «جزءٌ حقيقيّ»: قيدُ
  --  patient_device_episodes_requested_item_check القائم يحصر القيمة أصلاً
  --  في تسعة: full_device أو أحد الأجزاء الثمانية — فلا قيمةَ ثالثة ممكنة.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pde_component_sale_eligibility_check'
  ) THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT pde_component_sale_eligibility_check
      CHECK (
        component_sale_original_price IS NULL
        OR (requested_item <> 'full_device' AND service_path = 'no_exam')
      );
  END IF;

  --  ══ **الحدودُ الآمنة** — نفسُ ثوابت computeCommercialOffer بحرفها ══════
  --  النهائيُّ الفعليّ = agreed_cost القائم، لا عمودٌ ثانٍ يُخترَع له.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pde_component_sale_bounds_check'
  ) THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT pde_component_sale_bounds_check
      CHECK (
        component_sale_original_price IS NULL
        OR (component_sale_original_price > 0
            AND agreed_cost >= 0
            AND agreed_cost <= component_sale_original_price)
      );
  END IF;

  --  ══ **النوعُ لا يكذب على العلاقة بين الأصلي والنهائي (agreed_cost)** ═══
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pde_component_sale_kind_check'
  ) THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT pde_component_sale_kind_check
      CHECK (
        component_sale_price_kind IS NULL
        OR (component_sale_price_kind = 'normal'   AND agreed_cost = component_sale_original_price)
        OR (component_sale_price_kind = 'discount' AND agreed_cost > 0
            AND agreed_cost < component_sale_original_price)
        OR (component_sale_price_kind = 'free'     AND agreed_cost = 0)
      );
  END IF;
END $$;
`;
