// Migration 118: مكتبةُ التمارين ومراحلُ البروتوكول وخاناتُ معاملات الأجهزة (§4.cx — ٢٠٢٦-١٠-٠٩).
//
// ملاحظةُ المشرف العام: «البروتوكولاتُ ضعيفةٌ وسطحية… لكلّ تمرينٍ صورٌ وطريقةُ أدائه». فالبنية:
//   • physio_exercises                — بطاقةُ التمرين: الهدف، وضعيةُ البداية، الخطوات، الجرعة، الأخطاءُ الشائعة، الأسهلُ والأصعب، متى يتوقّف،
//                                       الأدوات، وصورٌ مخطَّطة (رمزٌ وما تُظهره وكلماتُ بحث). مسوّدةٌ حتى يعتمدها المشرفُ العام أو المسؤول.
//   • physio_protocol_phases          — مراحلُ البروتوكول: الأهداف، ما يُقال للمريض، معاييرُ الانتقال، ملاحظاتٌ للمعالج.
//   • physio_protocol_phase_exercises — تمارينُ المرحلة بجرعتها فيها (الفارغُ يأخذ جرعةَ البطاقة).
//   • physio_protocol_devices.params  — خاناتُ معاملات الجهاز بقيمٍ بلا لغة.
// ولا مفتاحَ إلى `patients` — فلا يمسّ كاسكيدَ حذف المريض (§8).

export const name = "118_physio_exercise_library";

export const sql = `
CREATE TABLE IF NOT EXISTS physio_exercises (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('mobility','stretch','strength','motor_control','endurance','aerobic','balance','functional','breathing','neural')),
  region TEXT NOT NULL CHECK (region IN ('lumbar','thoracic','cervical','shoulder','elbow','wrist_hand','hip','knee','ankle_foot','whole_body')),
  purpose TEXT, purpose_en TEXT,
  start_position TEXT, start_position_en TEXT,
  steps TEXT, steps_en TEXT,
  cues TEXT, cues_en TEXT,
  easier TEXT, easier_en TEXT,
  harder TEXT, harder_en TEXT,
  stop_if TEXT, stop_if_en TEXT,
  equipment TEXT, equipment_en TEXT,
  dose_note TEXT, dose_note_en TEXT,
  sets INTEGER CHECK (sets IS NULL OR sets BETWEEN 1 AND 10),
  reps INTEGER CHECK (reps IS NULL OR reps BETWEEN 1 AND 100),
  hold_seconds INTEGER CHECK (hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600),
  rest_seconds INTEGER CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600),
  per_side BOOLEAN NOT NULL DEFAULT false,
  home_suitable BOOLEAN NOT NULL DEFAULT true,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved')),
  approved_by INTEGER REFERENCES system_users(id),
  approved_by_name TEXT,
  approved_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT,
  updated_by INTEGER REFERENCES system_users(id),
  updated_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS physio_protocol_phases (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES physio_protocols(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  timeframe TEXT, timeframe_en TEXT,
  goals TEXT, goals_en TEXT,
  education TEXT, education_en TEXT,
  progress_criteria TEXT, progress_criteria_en TEXT,
  notes TEXT, notes_en TEXT,
  UNIQUE (protocol_id, position)
);

CREATE TABLE IF NOT EXISTS physio_protocol_phase_exercises (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER NOT NULL REFERENCES physio_protocol_phases(id) ON DELETE CASCADE,
  exercise_id INTEGER NOT NULL REFERENCES physio_exercises(id),
  position INTEGER NOT NULL DEFAULT 0,
  sets INTEGER CHECK (sets IS NULL OR sets BETWEEN 1 AND 10),
  reps INTEGER CHECK (reps IS NULL OR reps BETWEEN 1 AND 100),
  hold_seconds INTEGER CHECK (hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600),
  rest_seconds INTEGER CHECK (rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600),
  dose_note TEXT, dose_note_en TEXT,
  note TEXT, note_en TEXT,
  UNIQUE (phase_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS idx_physio_phase_exercises_exercise ON physio_protocol_phase_exercises(exercise_id);

ALTER TABLE physio_protocol_devices ADD COLUMN IF NOT EXISTS params JSONB NOT NULL DEFAULT '{}'::jsonb;
`;
