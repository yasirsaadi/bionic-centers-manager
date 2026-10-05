// **«متابعة» داخل باب الصيانة** (قرارُ المالك ٢٠٢٦-١٠-٠٥، §4.av تكملة).
//
// «نبقي فقط خانة الصيانة هي الباب الوحيد وبداخلها نصنّف صيانة أو متابعة». المتابعةُ عملُ الخبير على جهازٍ قائم بلا أجور —
// إتمامُ قالبٍ مؤقّت، فطرٌ في قالبٍ جديد، تيست — فتصل الخبيرَ أمرَ صيانةٍ (`purpose = 'maintenance'`) **بلا أرقامٍ أصلاً**
// (الأعمدةُ التجاريّة الثلاثة `NULL`، كضمانٍ بلا سعر — ٠٩١)، وهذا العلمُ يقول إنها متابعة فتُعدّ وحدها.
// إضافيّ، idempotent، بلا لمسِ صفٍّ قائم: القديمُ `false` بالافتراض.

export const name = "096_maintenance_followup";

export const sql = `
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS maintenance_is_followup BOOLEAN NOT NULL DEFAULT false;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'maintenance_followup_shape_check') THEN
    ALTER TABLE prosthetic_work_orders ADD CONSTRAINT maintenance_followup_shape_check
      CHECK (
        maintenance_is_followup = false
        OR (purpose = 'maintenance'
            AND maintenance_original_price IS NULL AND maintenance_final_price IS NULL
            AND maintenance_price_kind IS NULL AND maintenance_under_warranty IS NOT TRUE)
      );
  END IF;
END $$;
`;
