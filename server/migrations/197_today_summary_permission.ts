// Migration 197: مفتاحُ «ملخص مرضى اليوم» لكلّ موظّف (§4.gy — ٢٠٢٦-١١-٢٧).
//
// قرارُ المالك على النموذج: «ضع زرّاً لها بالضبط وأنا أحدّد أيَّ موظّفٍ يراها». فالصفحةُ للمسؤول بسلطته ولمن يشعل له المالكُ
// هذا المفتاحَ من نافذة المستخدم — لا يمنحه دور. مُطفأٌ لكلّ حسابٍ قائم، فلا يرى أحدٌ الصفحةَ حتى يشعله المسؤول (ويُكتب سطرُ تدقيق، §4.ap).
export const name = "197_today_summary_permission";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_view_today_summary BOOLEAN NOT NULL DEFAULT false;
`;
