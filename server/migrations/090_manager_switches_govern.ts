// **المفاتيحُ تحكم لا الدور — ولا يتغيّر مديرٌ يومَ الدمج** (تدقيقُ لوحة الصلاحيات، المجموعاتُ ٢–٤ — ٢٠٢٦-٠٩-٣٠).
//
// قرارُ المالك: «إن كان الزرّ مطفأً على أيٍّ كان — مدير أو موظّف — فلا يتمكّن؛ وإن كان مفعّلاً فيتمكّن».
// فسقط دورُ «مدير فرع» من بوّاباتٍ كان يفتحها وحدَه ولو كان المفتاحُ مطفأً:
//   «إضافة مرضى»     ⟵ خدمةٌ جديدة، بلا معاينة، طلبُ المراجعة، طلبُ الخصم، أمرُ التصنيع.
//   «إضافة مدفوعات»  ⟵ «تم الشراء» والصيانةُ وبيعُ الجزء (اختيارُ المالك).
//   «تعديل مرضى»     ⟵ كلفةُ الحالة، والإجماليّ في «تعديل مريض»، وتاريخُ الإضافة.
//   «اعتماد الخصم»   ⟵ اعتمادُ الخصم، والجلساتُ المجّانية.
//   «تعديل المدفوعات» ⟵ تصحيحُ بيانات جلسات الدفعة.
// **وقرارُه الثاني: «أُبقي ما كان يعمل»** — فتُشغَّل هذه الخمسةُ هنا مرّةً واحدة لكلّ مديرِ فرعٍ مُطفَأٍ أحدُها،
// فمَن كان يعمل أمس يعمل اليوم، ثمّ يطفئ المالكُ ما يشاء لمن يشاء من شاشة المستخدمين.
//
// **ويُكتب في `audit_log` قبله** — سطرٌ لكلّ حساب بما تغيّر وحدَه (القديم والجديد). idempotent: التشغيلُ الثاني لا يجد
// مديراً مُطفَأً منها (ولا يُعاد تشغيلُه أصلاً بعد تسجيله في `_migrations` — فإطفاءُ المالك لا يُعاد تشغيلُه). بلا `DROP` ولا `DELETE`.

export const name = "090_manager_switches_govern";

export const sql = `
CREATE TEMP TABLE _ms_grant ON COMMIT DROP AS
SELECT id, branch_id,
       can_add_patients IS NOT TRUE     AS f_add_patients,
       can_add_payments IS NOT TRUE     AS f_add_payments,
       can_edit_patients IS NOT TRUE    AS f_edit_patients,
       can_approve_discount IS NOT TRUE AS f_approve_discount,
       can_edit_payments IS NOT TRUE    AS f_edit_payments
FROM system_users
WHERE role = 'branch_manager'
  AND (can_add_patients IS NOT TRUE OR can_add_payments IS NOT TRUE OR can_edit_patients IS NOT TRUE
       OR can_approve_discount IS NOT TRUE OR can_edit_payments IS NOT TRUE);

INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, old_values, new_values, notes)
SELECT 'system_user', id, 'update', NULL, 'ترحيل ٠٩٠', branch_id,
       json_strip_nulls(json_build_object(
         'canAddPatients',     CASE WHEN f_add_patients     THEN false END,
         'canAddPayments',     CASE WHEN f_add_payments     THEN false END,
         'canEditPatients',    CASE WHEN f_edit_patients    THEN false END,
         'canApproveDiscount', CASE WHEN f_approve_discount THEN false END,
         'canEditPayments',    CASE WHEN f_edit_payments    THEN false END))::text,
       json_strip_nulls(json_build_object(
         'canAddPatients',     CASE WHEN f_add_patients     THEN true END,
         'canAddPayments',     CASE WHEN f_add_payments     THEN true END,
         'canEditPatients',    CASE WHEN f_edit_patients    THEN true END,
         'canApproveDiscount', CASE WHEN f_approve_discount THEN true END,
         'canEditPayments',    CASE WHEN f_edit_payments    THEN true END))::text,
       'المفاتيحُ صارت الحاكمة لا دورُ «مدير فرع» — شُغِّل ما كان الدورُ يفتحه كي لا يتغيّر أحدٌ يومَ الدمج (ترحيل ٠٩٠)'
FROM _ms_grant;

UPDATE system_users u SET
  can_add_patients = TRUE, can_add_payments = TRUE, can_edit_patients = TRUE,
  can_approve_discount = TRUE, can_edit_payments = TRUE
FROM _ms_grant g WHERE u.id = g.id;
`;
