// Migration 187: مفتاحُ «تسجيل وتعديل زيارات أقدم من ٣ أيام» لكلّ موظّف (§4.fr — ٢٠٢٦-١٠-٢٦).
//
// طلبُ المالك: «اجعل لي خياراً أضيفه أو أغلقه لأيّ موظّفٍ أرغب بأن يعدّل أكثر من ٣ أيام». فقاعدةُ §4.ar البند ٢٦
// (`checkVisitDate`: أقدمُ من ٣ أيام للمسؤول العام وحده) صارت تقبل أيضاً مَن يحمل `can_backdate_visits`.
// مُطفأٌ لكلّ حسابٍ قائم — فلا يتغيّر شيءٌ لأحدٍ حتى يشعله المسؤولُ من نافذة المستخدم (ويُكتب سطرُ تدقيق، §4.ap).
export const name = "187_backdate_visits_permission";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_backdate_visits BOOLEAN NOT NULL DEFAULT false;
`;
