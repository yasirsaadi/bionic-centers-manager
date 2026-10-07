// Migration 109: خطّةُ العلاج الطبيعي للمريض واعتمادُها (§4.cm — المرحلةُ الثالثة من خطّة العلاج الطبيعي، ٢٠٢٦-١٠-٠٧).
//
//   • physio_plans           — خطّةُ المريض: من بروتوكولٍ (أو بلا بروتوكول)، نصوصُها بالعربية والإنكليزية، الجرعة، والحالة:
//                              مسوّدة ⟵ بانتظار الاعتماد ⟵ معتمَدة · أو أُعيدت بملاحظة · أو أُوقفت. لا محوَ — الإيقافُ تاريخ.
//   • physio_plan_devices    — أجهزةُ الخطّة بدقائقها ومعاملاتها.
//   • physio_plan_assignees  — المنفّذون: معالجٌ أو تقنيّ أو مدرّب (أو الأخصائيّ نفسُه).
// **ومفتاحٌ إلى `patients`** ⟵ في كاسكيد `storage.deletePatient` (§8)، والجدولان الآخران يتبعان الخطّةَ بـ`ON DELETE CASCADE`.

export const name = "109_physio_plans";

export const sql = `
CREATE TABLE IF NOT EXISTS physio_plans (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  protocol_id INTEGER REFERENCES physio_protocols(id),
  title_ar TEXT NOT NULL,
  title_en TEXT,
  goals TEXT, goals_en TEXT,
  exercises TEXT, exercises_en TEXT,
  precautions TEXT, precautions_en TEXT,
  notes TEXT, notes_en TEXT,
  sessions_per_week INTEGER CHECK (sessions_per_week IS NULL OR sessions_per_week BETWEEN 1 AND 14),
  duration_weeks INTEGER CHECK (duration_weeks IS NULL OR duration_weeks BETWEEN 1 AND 104),
  session_minutes INTEGER CHECK (session_minutes IS NULL OR session_minutes BETWEEN 5 AND 240),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending','approved','returned','stopped')),
  submitted_at TIMESTAMPTZ,
  decided_by INTEGER REFERENCES system_users(id),
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  return_note TEXT,
  stop_reason TEXT,
  stopped_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT,
  updated_by INTEGER REFERENCES system_users(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_physio_plans_patient ON physio_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_plans_status ON physio_plans(status);

CREATE TABLE IF NOT EXISTS physio_plan_devices (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  minutes INTEGER CHECK (minutes IS NULL OR minutes BETWEEN 1 AND 120),
  parameters TEXT, parameters_en TEXT,
  note TEXT, note_en TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (plan_id, device_id)
);

CREATE TABLE IF NOT EXISTS physio_plan_assignees (
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES system_users(id),
  assigned_by INTEGER REFERENCES system_users(id),
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_physio_plan_assignees_user ON physio_plan_assignees(user_id);
`;
