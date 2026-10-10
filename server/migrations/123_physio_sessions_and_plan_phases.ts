// Migration 123: **عددُ الجلسات أساسُ الجرعة، والمراحلُ بنطاقات الجلسات، ونسخةُ مراحل البروتوكول وتمارينه لكلّ مريض** (§4.dd — ٢٠٢٦-١٠-١٠).
//
// ملاحظةُ سليم على ألم الظهر المزمن: «جلستان في الأسبوع اثنا عشر أسبوعاً — ما في مريض بينتظر؛ التواترُ أعلى والمدّةُ أقصر… والأجهزةُ على مريض مريض».
// وقرارُ المالك: «٢٤ جلسة يومياً عدا الجمعة… وفي بعض الحالات ٥ في الأسبوع»، **وكلُّ شيءٍ في البروتوكول قابلٌ للتعديل: دائماً بيد سليم وحده،
// أو لمريضٍ واحد في خطّته دون أن يتأثّر البروتوكول** — الأجهزةُ والتمارينُ وعددُ الجلسات ووقتُها ومدّتُها والتكراراتُ وإعداداتُ الجهاز.
//
//   • physio_protocols.total_sessions · physio_plans.total_sessions — عددُ الجلسات؛ والأسابيعُ تُشتقّ منه (`normalizeDose`). والقديمُ يُملأ
//     بجلسات الأسبوع × الأسابيع فلا يتغيّر معناه.
//   • physio_protocol_phases.session_from / session_to — المرحلةُ بنطاق جلساتها (١–٦ …)، والانتقالُ بمعياره لا بالعدد وحده.
//   • physio_plan_phases · physio_plan_phase_exercises — **نسخةُ المريض** من مراحل البروتوكول وتمارينها بجرعتها: يعدّلها الأخصائيُّ لهذا المريض
//     ولا يمسّ البروتوكول. تتبع الخطّةَ في الحذف (`ON DELETE CASCADE`)، والخطّةُ تتبع المريضَ في كاسكيد `deletePatient` (§8).
//   • ألمُ الظهر المزمن — **ما لم يعدّله إنسان** (`updated_by IS NULL`، قاعدةُ `physio_content.ts`): ٢٤ جلسة × ستّ في الأسبوع × ٥٠ دقيقة،
//     والمراحلُ ١–٦ · ٧–١٦ · ١٧–٢٤، والبرنامجُ المنزليّ حتى الأسبوع ١٢ وزيارةُ متابعة بعد التخرّج بأربعة أسابيع، وتمارينُ الثقل يوماً بعد يوم.
//     والنصوصُ تُعدَّل بـ`replace` — فالتكرارُ بلا أثر، والجملةُ التي غيّرها أحدٌ لا تُمَسّ. **ويعود مسوّدةً إن كان معتمَداً** — محتوىً تغيّر يعتمده سليم.
//   • والخططُ المفتوحة على بروتوكولٍ ذي مراحل تأخذ نسختَها منه الآن (المنتهيةُ تبقى تاريخاً كما كانت).
import { lit } from "./physio_content";

export const name = "123_physio_sessions_and_plan_phases";

const LBP = lit("lbp-chronic-adult");
/** `replace` على عمودٍ بنسختيه — النصُّ القديم كما زرعه ترحيلُ ١١٩. */
const rep = (col: string, from: string, to: string, alias = "") => `${col} = replace(${alias ? `${alias}.` : ""}${col}, ${lit(from)}, ${lit(to)})`;

const HOME_AR =
  "البرنامجُ: ٢٤ جلسةً في المركز، ستّاً في الأسبوع (الجمعةُ عطلة) — وخمساً لمن يحتاج، والأخصائيُّ يعدّل العددَ والتواترَ لمريضه. " +
  "والبرنامجُ المنزليّ يوميّ في كلّ المراحل، ويستمرّ بعد الجلسة الأخيرة حتى نهاية الأسبوع الثاني عشر، مع زيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع. " +
  "وتمارينُ الثقل (رفعُ الثقل من الأرض، والحملُ بيدٍ واحدة والمشي، والطعنة) يوماً بعد يوم — لا يومين متتاليين؛ والتحكّمُ والحركةُ والمشيُ يومياً. " +
  "والجلسةُ في المركز للتعليم والتصحيح والتدرّج.";
const HOME_EN =
  "Programme: 24 clinic sessions, six a week (Friday off) — or five where needed; the specialist adjusts the number and frequency for each patient. " +
  "The home programme is daily in every phase and continues after the last session until the end of week 12, with a follow-up visit and reassessment four weeks after discharge. " +
  "Loaded exercises (kettlebell deadlift, suitcase carry, split squat) on alternate days — never on consecutive days; motor control, mobility and walking daily. " +
  "Clinic sessions are for teaching, correction and progression.";

const ALTERNATE_AR = "يوماً بعد يوم في المركز — لا يومين متتاليين؛ وفي البيت مرّتين أو ثلاثاً في الأسبوع.";
const ALTERNATE_EN = "Alternate days in the clinic — never on consecutive days; two to three times a week at home.";

const lbpPhase = (pos: number) => `FROM physio_protocols p WHERE ph.protocol_id = p.id AND p.code = ${LBP} AND p.updated_by IS NULL AND ph.position = ${pos}`;

export const sql = `
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS total_sessions INTEGER;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS total_sessions INTEGER;
DO $$ BEGIN
  ALTER TABLE physio_protocols ADD CONSTRAINT physio_protocols_total_sessions_check CHECK (total_sessions IS NULL OR total_sessions BETWEEN 1 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE physio_plans ADD CONSTRAINT physio_plans_total_sessions_check CHECK (total_sessions IS NULL OR total_sessions BETWEEN 1 AND 300);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

UPDATE physio_protocols SET total_sessions = LEAST(sessions_per_week * duration_weeks, 300)
 WHERE total_sessions IS NULL AND sessions_per_week IS NOT NULL AND duration_weeks IS NOT NULL;
UPDATE physio_plans SET total_sessions = LEAST(sessions_per_week * duration_weeks, 300)
 WHERE total_sessions IS NULL AND sessions_per_week IS NOT NULL AND duration_weeks IS NOT NULL;

ALTER TABLE physio_protocol_phases ADD COLUMN IF NOT EXISTS session_from INTEGER;
ALTER TABLE physio_protocol_phases ADD COLUMN IF NOT EXISTS session_to INTEGER;

CREATE TABLE IF NOT EXISTS physio_plan_phases (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  session_from INTEGER,
  session_to INTEGER,
  timeframe TEXT, timeframe_en TEXT,
  goals TEXT, goals_en TEXT,
  education TEXT, education_en TEXT,
  progress_criteria TEXT, progress_criteria_en TEXT,
  notes TEXT, notes_en TEXT,
  UNIQUE (plan_id, position)
);

CREATE TABLE IF NOT EXISTS physio_plan_phase_exercises (
  id SERIAL PRIMARY KEY,
  phase_id INTEGER NOT NULL REFERENCES physio_plan_phases(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_physio_plan_phase_exercises_exercise ON physio_plan_phase_exercises(exercise_id);

-- ── ألمُ الظهر المزمن: ٢٤ جلسة × ستّ في الأسبوع ───────────────────────────────────────────────────────────────
UPDATE physio_protocols SET status = 'draft', approved_by = NULL, approved_by_name = NULL, approved_at = NULL
 WHERE code = ${LBP} AND updated_by IS NULL AND status = 'approved'
   AND (total_sessions IS DISTINCT FROM 24 OR sessions_per_week IS DISTINCT FROM 6);

UPDATE physio_protocols SET
  total_sessions = 24, sessions_per_week = 6, duration_weeks = 4, session_minutes = 50,
  ${rep("exercises", "(الأسبوع ١–٢)", "(الجلسات ١–٦)")},
  ${rep("exercises_en", "(weeks 1–2)", "(sessions 1–6)")}
 WHERE code = ${LBP} AND updated_by IS NULL;
UPDATE physio_protocols SET
  ${rep("exercises", "(الأسبوع ٣–٦)", "(الجلسات ٧–١٦)")},
  ${rep("exercises_en", "(weeks 3–6)", "(sessions 7–16)")}
 WHERE code = ${LBP} AND updated_by IS NULL;
UPDATE physio_protocols SET
  ${rep("exercises", "(الأسبوع ٧–١٢)", "(الجلسات ١٧–٢٤)")},
  ${rep("exercises_en", "(weeks 7–12)", "(sessions 17–24)")}
 WHERE code = ${LBP} AND updated_by IS NULL;
UPDATE physio_protocols SET
  ${rep("exercises", "البرنامجُ المنزليّ يوميّ في كلّ المراحل، والجلسةُ في المركز للتعليم والتصحيح والتدرّج.", HOME_AR)},
  ${rep("exercises_en", "The home programme is daily in every phase; clinic sessions are for teaching, correction and progression.", HOME_EN)},
  ${rep("assessment", "إعادةُ التقييم كلّ ٢٨ يوماً بالمقاييس نفسِها، وقرارُ الانتقال بين المراحل بمعاييرها لا بالتاريخ وحده.",
    "يُعاد التقييمُ بالمقاييس نفسِها عند الجلسة الأخيرة، وفي زيارة المتابعة بعد التخرّج بأربعة أسابيع (وكلَّ ٢٨ يوماً إن طالت الخطّة)؛ وقرارُ الانتقال بين المراحل بمعاييرها لا بعدد الجلسات وحده.")},
  ${rep("assessment_en", "Reassess every 28 days with the same measures; phase progression follows the criteria, not the calendar alone.",
    "Reassess with the same measures at the last session and at the follow-up visit four weeks after discharge (and every 28 days if the plan runs longer); phase progression follows the criteria, not the session count alone.")}
 WHERE code = ${LBP} AND updated_by IS NULL;

UPDATE physio_protocol_phases ph SET session_from = 1, session_to = 6,
  timeframe = ${lit("نحو الأسبوع الأوّل")}, timeframe_en = ${lit("About the first week")},
  ${rep("progress_criteria", "وإن لم يتحقّق ذلك بعد ٣ أسابيع:", "وإن لم يتحقّق ذلك بعد الجلسة الثامنة:", "ph")},
  ${rep("progress_criteria_en", "If not achieved by week 3:", "If not achieved by session 8:", "ph")}
 ${lbpPhase(1)};
UPDATE physio_protocol_phases ph SET session_from = 7, session_to = 16,
  timeframe = ${lit("نحو الأسبوعين الثاني والثالث")}, timeframe_en = ${lit("About weeks 2–3")}
 ${lbpPhase(2)};
UPDATE physio_protocol_phases ph SET session_from = 17, session_to = 24,
  timeframe = ${lit("نحو الأسبوع الرابع — ثمّ البرنامجُ المنزليّ حتى الأسبوع ١٢")}, timeframe_en = ${lit("About week 4 — then the home programme until week 12")},
  ${rep("notes", "• قلّل الجلساتِ تدريجياً (مرّةً أسبوعياً ثمّ كلّ أسبوعين) مع زيادة استقلاله.",
    "• بعد الجلسة الأخيرة: يكمل البرنامجَ المنزليّ وحده حتى نهاية الأسبوع الثاني عشر، ويعود لزيارة متابعةٍ وإعادة تقييمٍ بعد التخرّج بأربعة أسابيع.", "ph")},
  ${rep("notes_en", "• Taper sessions (weekly, then fortnightly) as independence grows.",
    "• After the last session: the home programme continues independently until the end of week 12, with a follow-up visit and reassessment four weeks after discharge.", "ph")}
 ${lbpPhase(3)};

UPDATE physio_protocol_phase_exercises pe SET dose_note = ${lit(ALTERNATE_AR)}, dose_note_en = ${lit(ALTERNATE_EN)}
  FROM physio_protocol_phases ph, physio_protocols p, physio_exercises e
 WHERE pe.phase_id = ph.id AND ph.protocol_id = p.id AND e.id = pe.exercise_id
   AND p.code = ${LBP} AND p.updated_by IS NULL AND ph.position = 3 AND pe.dose_note IS NULL
   AND e.code IN ('kettlebell-deadlift', 'suitcase-carry', 'split-squat');
UPDATE physio_protocol_phase_exercises pe SET
  ${rep("dose_note", "كلّ أسبوع", "كلّ جلستين أو ثلاث", "pe")},
  ${rep("dose_note_en", "per week", "every two or three sessions", "pe")}
  FROM physio_protocol_phases ph, physio_protocols p, physio_exercises e
 WHERE pe.phase_id = ph.id AND ph.protocol_id = p.id AND e.id = pe.exercise_id
   AND p.code = ${LBP} AND p.updated_by IS NULL AND ph.position = 3
   AND e.code IN ('front-plank', 'side-plank');

-- ── الخططُ المفتوحة تأخذ نسختَها من مراحل بروتوكولها (بعد تحديث المحتوى أعلاه) ───────────────────────────────────
WITH src AS (
  SELECT pl.id AS plan_id, ph.*
    FROM physio_plans pl
    JOIN physio_protocol_phases ph ON ph.protocol_id = pl.protocol_id
   WHERE pl.status IN ('draft', 'pending', 'returned', 'approved')
     AND NOT EXISTS (SELECT 1 FROM physio_plan_phases x WHERE x.plan_id = pl.id)
), ins AS (
  INSERT INTO physio_plan_phases (plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
    goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en)
  SELECT plan_id, position, name_ar, name_en, session_from, session_to, timeframe, timeframe_en,
    goals, goals_en, education, education_en, progress_criteria, progress_criteria_en, notes, notes_en
    FROM src
  RETURNING id, plan_id, position
)
INSERT INTO physio_plan_phase_exercises (phase_id, exercise_id, position, sets, reps, hold_seconds, rest_seconds,
  dose_note, dose_note_en, note, note_en)
SELECT ins.id, pe.exercise_id, pe.position, pe.sets, pe.reps, pe.hold_seconds, pe.rest_seconds,
  pe.dose_note, pe.dose_note_en, pe.note, pe.note_en
  FROM ins
  JOIN physio_plans pl ON pl.id = ins.plan_id
  JOIN physio_protocol_phases ph ON ph.protocol_id = pl.protocol_id AND ph.position = ins.position
  JOIN physio_protocol_phase_exercises pe ON pe.phase_id = ph.id;
`;
