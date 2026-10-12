// Migration 134: تعليمُ كلّ تمرينٍ في الجلسة — «الطلب الثاني» (§4.dr — ٢٠٢٦-١٠-١٢).
//
// قرارُ المالك (§4.cx): «ضع شيئاً عالمياً وستاندرد» — في «إنهاء الجلسة» تمارينُ مرحلة الخطّة الحالية، **كلُّها «نُفّذ» افتراضاً، ويُلغى ما لم يُنفَّذ بسبب**.
//   • `physio_plan_sessions.phase_position` — المرحلةُ التي نُفّذت تمارينُها (بنطاق الجلسات أو باختيار المعالج).
//   • `physio_plan_session_exercises` — تمرينٌ لكلّ سطر: نُفّذ أم لا وسببُه، وجرعتُه في الخطّة يومَها (لقطة). **يُحذف بحذف جلسته** (`ON DELETE CASCADE`)،
//     فكاسكيدُ حذف المريض يمرّ به (§8) — والجلسةُ نفسُها تُحذف هناك.
export const name = "134_physio_session_exercises";

export const sql = `
ALTER TABLE physio_plan_sessions ADD COLUMN IF NOT EXISTS phase_position integer;

CREATE TABLE IF NOT EXISTS physio_plan_session_exercises (
  id serial PRIMARY KEY,
  session_id integer NOT NULL REFERENCES physio_plan_sessions(id) ON DELETE CASCADE,
  exercise_id integer NOT NULL REFERENCES physio_exercises(id),
  done boolean NOT NULL,
  note text,
  planned_sets integer,
  planned_reps integer,
  planned_hold_seconds integer,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT physio_plan_session_exercises_session_id_exercise_id_key UNIQUE (session_id, exercise_id)
);
CREATE INDEX IF NOT EXISTS idx_physio_plan_session_exercises_session ON physio_plan_session_exercises(session_id);
`;
