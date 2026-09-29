// **مفتاحُ «حذف المرضى» يصير الحاكم — ولا يتغيّر أحدٌ يومَ الدمج** (§4.ar البند ٢٤ — ٢٠٢٦-٠٩-٢٩).
//
// الحذفُ (السلّة) كان روليّاً: مديرُ الفرع والطبيب، ومفتاحُ `can_delete_patients` لا يقرؤه شيء. فصار المفتاحُ هو الحاكم
// (`canTrashPatients` في `shared/patient_trash.ts`). **وقرارُ المالك: «أُبقي الحاليّين»** — فيُشغَّل المفتاحُ هنا مرّةً واحدة
// لكلّ طبيبٍ ومديرِ فرعٍ مُطفَأٍ مفتاحُه، فمَن كان يحذف أمس يحذف اليوم، ثمّ يطفئه المالكُ لمن يشاء من شاشة المستخدمين.
//
// **ويُكتب في `audit_log` قبله** — سطرٌ لكلّ حساب بالقديم والجديد. idempotent: التشغيلُ الثاني لا يجد حساباً مُطفَأً
// من الدورين (ولا يُعاد تشغيلُه أصلاً بعد تسجيله في `_migrations` — فإطفاءُ المالك لا يُعاد تشغيلُه). بلا `DROP` ولا `DELETE`.

export const name = "089_delete_patients_switch";

export const sql = `
CREATE TEMP TABLE _dp_grant ON COMMIT DROP AS
SELECT id, branch_id, role FROM system_users
WHERE role IN ('doctor', 'branch_manager') AND can_delete_patients IS NOT TRUE;

INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, old_values, new_values, notes)
SELECT 'system_user', id, 'update', NULL, 'ترحيل ٠٨٩', branch_id,
       json_build_object('canDeletePatients', false)::text,
       json_build_object('canDeletePatients', true)::text,
       'مفتاحُ «حذف المرضى» صار الحاكم — شُغِّل لمن كان يحذف بدوره (' || role || ') كي لا يتغيّر أحدٌ يومَ الدمج (ترحيل ٠٨٩)'
FROM _dp_grant;

UPDATE system_users u SET can_delete_patients = TRUE
FROM _dp_grant g WHERE u.id = g.id;
`;
