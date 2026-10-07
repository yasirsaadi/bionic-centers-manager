// Migration 110: تفعيلُ تنبيهات خطط العلاج الطبيعي (§4.cm) — بطلب المالك ٢٠٢٦-١٠-٠٧: «أضف … لسليم كمشرف وللمعالجين كتلقّي إشعارات».
//
// يُكتب ما كان المسؤولُ سيضغطه في «تنبيهات الموظفين»، بالأهليّة نفسِها (`eligibleStaffEvents`):
//   • «خطة تنتظر الاعتماد» (physio_plan_pending)   ⟵ المسؤولون وحاملو «مشرف عام العلاج الطبيعي».
//   • «خطته اعتُمدت أو أُعيدت» (physio_plan_decided) ⟵ حاملو الإشراف وأخصائيّو العلاج الطبيعي.
//   • «خطة معتمدة أُسندت إليه» (physio_plan_assigned) ⟵ أدوارُ القسم الأربعة (الأخصائيّ والمعالج والتقنيّ والمدرّب).
// نشطون وحدهم، والدورُ من `role` أو `extra_roles`. **إضافةٌ لا حذف**: ما اختاره المسؤولُ قبلُ باقٍ، والإعادةُ لا تكرّر (`ON CONFLICT`).
// ومَن يُعطى الإشرافَ أو الدورَ بعد اليوم يُضاف له من «تنبيهات الموظفين» كالعادة.

export const name = "110_physio_plan_notify_prefs";

export const sql = `
INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_plan_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false))
ON CONFLICT DO NOTHING;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_plan_decided' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (COALESCE(u.can_supervise_physio, false) OR u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist')
ON CONFLICT DO NOTHING;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_plan_assigned' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (u.role IN ('physio_specialist','therapist','physio_technician','physio_trainer')
        OR COALESCE(u.extra_roles, '[]'::jsonb) ?| ARRAY['physio_specialist','therapist','physio_technician','physio_trainer'])
ON CONFLICT DO NOTHING;
`;
