// Migration 196: فهارسُ «إنجاز الأمس» في تحيّة الموظّف (§4.gw — قرارُ المالك ٢٠٢٦-١١-٢٣).
//
// التحيّةُ تعدّ لكلّ موظّفٍ ما عمله أمس حين تُفتح — بأعمدة الفاعل ولحظته. `audit_log` مفهرسٌ باللحظة (`idx_audit_date`)
// و`medical_exams` بالطبيب، والزياراتُ وتاريخُ التصنيع والجلساتُ بلا فهرسٍ للفاعل، و«زيارةُ جلسةٍ؟» (`visit_id`) بلا فهرس.
// فهارسُ فقط — لا عمودَ ولا قيدَ ولا بيانات.
export const name = "196_greeting_attribution_indexes";

export const sql = `
CREATE INDEX IF NOT EXISTS ix_visits_created_by_date ON visits (created_by, visit_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_pwh_performed_by_created ON prosthetic_work_history (performed_by, created_at);
CREATE INDEX IF NOT EXISTS ix_physio_sessions_executed_by_created ON physio_plan_sessions (executed_by, created_at);
CREATE INDEX IF NOT EXISTS ix_physio_sessions_visit ON physio_plan_sessions (visit_id) WHERE visit_id IS NOT NULL;
`;
