// Migration 111: شاشةُ تنفيذ خطّة العلاج الطبيعي (§4.cn — المرحلةُ الرابعة، ٢٠٢٦-١٠-٠٧).
//
//   • physio_plan_sessions       — جلسةٌ نُفّذت من خطّةٍ معتمَدة: مَن نفّذها ومتى وبأيّ وردية، وزيارتُها في سجلّ الزيارات،
//                                  و«ملاحظة للأخصائيّ»، وهل كُتبت في عدّادات الأجهزة (`counts_written`)، والإلغاءُ وسببُه.
//   • physio_plan_session_items  — بنودُها: الجهاز، ودقائقُه في الخطّة، ونُفّذ أم لا، ودقائقُه الفعلية، وملاحظةٌ أو سببُ عدم التنفيذ.
//   • branches.physio_counts_from — **من أيّ يومٍ تُحسب عدّاداتُ أجهزة الفرع من التنفيذ ويُقفَل الإدخالُ اليدويّ**. فارغٌ = اليدويُّ كما كان.
// **ومفتاحٌ إلى `patients` و`visits`** ⟵ في كاسكيد `deletePatientTx` قبل الزيارات، وفي دمج الملفّات (§8).

export const name = "111_physio_plan_sessions";

export const sql = `
ALTER TABLE branches ADD COLUMN IF NOT EXISTS physio_counts_from DATE;

CREATE TABLE IF NOT EXISTS physio_plan_sessions (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  session_date DATE NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning','evening')),
  executed_by INTEGER REFERENCES system_users(id),
  executed_by_name TEXT,
  visit_id INTEGER REFERENCES visits(id),
  note_to_specialist TEXT,
  counts_written BOOLEAN NOT NULL DEFAULT false,
  cancelled_at TIMESTAMPTZ,
  cancelled_by INTEGER REFERENCES system_users(id),
  cancelled_by_name TEXT,
  cancel_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_physio_plan_sessions_plan ON physio_plan_sessions(plan_id);
CREATE INDEX IF NOT EXISTS idx_physio_plan_sessions_branch_date ON physio_plan_sessions(branch_id, session_date);

CREATE TABLE IF NOT EXISTS physio_plan_session_items (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES physio_plan_sessions(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  planned_minutes INTEGER,
  done BOOLEAN NOT NULL,
  minutes INTEGER CHECK (minutes IS NULL OR minutes BETWEEN 0 AND 240),
  note TEXT,
  UNIQUE (session_id, device_id)
);

-- تنبيهُ «ملاحظة للأخصائيّ» يُفعَّل كما فُعّلت تنبيهاتُ الخطط (١١٠): للأخصائيّين وحاملي الإشراف.
INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_session_note' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (COALESCE(u.can_supervise_physio, false) OR u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist')
ON CONFLICT DO NOTHING;
`;
