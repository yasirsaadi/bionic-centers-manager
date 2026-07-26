// Migration 030: editable exams WITH a full version history, and the device
// cost the doctor sets.
//
// ── Why the seal is being opened, and how it stays trustworthy ──────────────
// 028 made an exam permanently immutable: corrections could only be appended as
// addenda. In practice the doctor needs to fix their own record — a mistyped
// prosthetic type shouldn't live forever with a correction note bolted under it.
//
// So editing is allowed now, but nothing is ever destroyed: every version is
// snapshotted into `medical_exam_revisions` BEFORE it is replaced, with who
// replaced it and when. The record still answers "what did the doctor say, and
// when did they say it" — it just answers it across versions.
//
// The BEFORE UPDATE trigger from 028 is deliberately LEFT IN PLACE. It already
// permits an update only when `app.allow_exam_edit = 'on'` is set for the
// transaction, so the application's audited edit path opts in explicitly while
// a stray UPDATE — from a console, a script, a bug — is still rejected. The
// seal did not weaken; it acquired one supervised door.
//
// ── Device cost ────────────────────────────────────────────────────────────
// For أطراف and مساند the doctor is the one who knows what the device costs, so
// they set it with the exam and it lands on the case as a MANUAL cost (which
// automation must never overwrite). Physiotherapy is untouched: its cost stays
// with reception in «الكلفة والجلسات», because its pricing is per-session and
// derived, not a single device price.
//
// Idempotent, additive, non-destructive.

export const name = "030_exam_revisions_and_cost";

export const sql = `
-- ── Version history ────────────────────────────────────────────────────────
-- One row per SUPERSEDED version. The live text always lives in medical_exams;
-- this table is everything it used to say.
CREATE TABLE IF NOT EXISTS medical_exam_revisions (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES medical_exams(id),
  version INTEGER NOT NULL,
  -- Full snapshot of the replaced version.
  case_type TEXT,
  doctor_id INTEGER,
  doctor_name TEXT,
  chief_complaint TEXT,
  clinical_findings TEXT,
  diagnosis TEXT,
  plan TEXT,
  notes TEXT,
  prescription JSONB,
  device_cost INTEGER,
  signed_at TIMESTAMPTZ,
  -- Who replaced it, and when.
  edited_by INTEGER REFERENCES system_users(id),
  edited_by_name TEXT,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_exam_revisions_exam
  ON medical_exam_revisions (exam_id, version);

-- ── Live row gains its version stamp + the device cost ─────────────────────
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS device_cost INTEGER;
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS edited_by INTEGER REFERENCES system_users(id);
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS edited_by_name TEXT;

-- Revisions are history: they are never edited either.
CREATE OR REPLACE FUNCTION reject_medical_exam_revision_update() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'medical_exam_revisions is append-only history and cannot be modified';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_exam_revisions_sealed ON medical_exam_revisions;
CREATE TRIGGER trg_medical_exam_revisions_sealed
  BEFORE UPDATE ON medical_exam_revisions
  FOR EACH ROW EXECUTE FUNCTION reject_medical_exam_revision_update();

-- ── Repair: re-link exams that were orphaned from their case ───────────────
-- The first exam that DECIDED a new specialty was written before the case row
-- for it existed, so it was saved with case_id NULL and — the row being sealed —
-- could never be repaired from the app. Matching on (patient, case_type) is
-- exact: migration 020 guarantees one case row per pair.
--
-- Needs the supervised door, since this is an UPDATE on a sealed table. The
-- migration runner wraps each migration in a transaction, so SET LOCAL is
-- scoped to this migration and reverts on commit.
SET LOCAL app.allow_exam_edit = 'on';

UPDATE medical_exams me
SET case_id = pc.id
FROM patient_cases pc
WHERE me.case_id IS NULL
  AND pc.patient_id = me.patient_id
  AND pc.case_type = me.case_type;
`;
