// Migration 105: أكثرُ من دورٍ للحساب (§4.ch — ٢٠٢٦-١٠-٠٧).
//
// `role` يبقى الدورَ الأعلى بلا تغيير، والأدوارُ الإضافية في `extra_roles` (مصفوفةُ نصوص). كلُّ حسابٍ قائمٍ يبدأ
// بمصفوفةٍ فارغة — فلا يتغيّر شيءٌ لأحدٍ حتى يختار المسؤولُ له دوراً ثانياً.

export const name = "105_extra_roles";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS extra_roles JSONB NOT NULL DEFAULT '[]'::jsonb;
`;
