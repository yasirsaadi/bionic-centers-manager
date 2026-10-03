// **بطاقةُ المريض في تلغرام — مفتاحُ التفعيل** (قرارُ المالك ٢٠٢٦-١٠-٠٣، §4.bv).
//
// البطاقةُ لا تُفتح إلّا لمريضٍ فُعّلت له صراحةً — تجريبيّاً أوّلاً بمرضى يختارهم المالك، ثمّ للمسجَّلين بعد الإطلاق.
// أعمدةٌ على المريض نفسِه لا جدولٌ جديد (فلا مفتاحَ أجنبيّاً يُضاف إلى كاسكيد الحذف). والافتراضُ مطفأ: لا مريضَ قائمٌ
// تنفتح بطاقتُه بالنشر. idempotent.
export const name = "093_patient_card";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_card_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_card_enabled_at timestamptz;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_card_enabled_by integer;
`;
