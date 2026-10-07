// Migration 104: أدوارُ العلاج الطبيعي وعلَما «المشرف العام» و«الإبر الجافة» (§4.cg — ٢٠٢٦-١٠-٠٧).
//
// الأدوارُ الثلاثة الجديدة (`physio_specialist` · `physio_technician` · `physio_trainer`) نصٌّ في عمود `role`
// بلا قيدٍ في القاعدة — فلا يلزمها ترحيل؛ القائمةُ المسموحة في `shared/user_roles.ts`.
//
//   • `can_supervise_physio` — «مشرف عام العلاج الطبيعي» على كلّ الفروع (لسليم، ويبقى مدير فرع).
//     يعتمد الخططَ ويعدّلها ويصله إشعارُها في المرحلة الثالثة.
//   • `can_dry_needle` — «الإبر الجافة» لا يطبّقها إلّا مَن يحمله (سليم ومصطفى وسارة بقرار المالك).
//
// كلاهما مُطفأٌ لكلّ حسابٍ قائم — المسؤولُ يشعله من نافذة المستخدم فيُكتب سطرُ تدقيق. ولا يُغيَّر دورُ أحدٍ هنا.

export const name = "104_physio_roles";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_supervise_physio BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_dry_needle BOOLEAN NOT NULL DEFAULT false;
`;
