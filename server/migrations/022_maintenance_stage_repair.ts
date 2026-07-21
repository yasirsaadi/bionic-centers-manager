// Migration 022 — repair completed MAINTENANCE orders stuck on build stages.
//
// Maintenance orders used to share the full build pipeline, and completing one
// via the status dialog never moved the stage — so a finished صيانة displayed
// "مكتمل" over "مريض جديد بانتظار بدء العمل" (the reported حبيب case). The
// maintenance lifecycle now has its own terminal stages; this aligns every
// already-completed maintenance order to the matching "تم إنجاز الصيانة" stage,
// with an audit trail row per repaired order.
//
// Idempotent: the WHERE matches nothing once repaired.

export const name = "022_maintenance_stage_repair";

export const sql = `
INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, notes)
SELECT id, 'stage_change', current_stage,
       CASE WHEN service_type = 'medical_support' THEN 'maintenance_support_done' ELSE 'maintenance_device_done' END,
       'مواءمة تلقائية: أمر صيانة مكتمل كانت مرحلته عالقة على خط البناء'
FROM prosthetic_work_orders
WHERE purpose = 'maintenance'
  AND status = 'completed'
  AND current_stage NOT IN ('maintenance_cast_done', 'maintenance_device_done', 'maintenance_support_done', 'delivered');

UPDATE prosthetic_work_orders
SET current_stage = CASE WHEN service_type = 'medical_support' THEN 'maintenance_support_done' ELSE 'maintenance_device_done' END,
    completed_at = COALESCE(completed_at, updated_at),
    updated_at = NOW()
WHERE purpose = 'maintenance'
  AND status = 'completed'
  AND current_stage NOT IN ('maintenance_cast_done', 'maintenance_device_done', 'maintenance_support_done', 'delivered');
`;
