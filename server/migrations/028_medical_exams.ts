// Migration 028: doctor medical examinations (معاينة الطبيب).
//
// A medical exam is a SIGNED CLINICAL RECORD. It is written only by a user the
// admin granted the doctor capability, it is stamped with the doctor's name and
// specialty at the moment of signing, and it is IMMUTABLE afterwards. Everyone
// else — reception, branch managers, accountants — sees it read-only.
//
// Three specialties exist in this business, and they are already modelled by
// `patient_cases.case_type`:
//   prosthetic       أطراف صناعية
//   medical_support  مساند طبية
//   physiotherapy    علاج طبيعي
// An exam is filed against ONE of them, so a patient who is treated by two
// departments accumulates two independent clinical threads under one identity.
//
// Corrections never overwrite history: `medical_exam_addenda` appends a dated,
// signed note to an existing exam. The original text is never touched.
//
// Three independent guarantees, mirroring the visits protection built in 011:
//   1. UPDATE on either table RAISES — the seal. Escape hatch for the owner:
//      `SET LOCAL app.allow_exam_edit = 'on'` inside a transaction.
//   2. DELETE leaves forensic evidence. The app exposes no delete endpoint at
//      all; the only real path is the `deletePatient` cascade, and the trigger
//      captures a full snapshot (plus Postgres session identity) before the row
//      disappears — exactly like `visits_forensic_log`.
//   3. Every write also goes through `logAudit` at the application layer.
//
// Idempotent, additive, non-destructive.

export const name = "028_medical_exams";

export const sql = `
-- ── Doctor capability on system users ──────────────────────────────────────
-- Deliberately a CAPABILITY, not a role (same reasoning as 015_expert_capability):
-- a branch manager may also be the doctor. The primary role keeps all of its
-- permissions; this flag only adds the right to sign clinical records.
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_write_medical_exam BOOLEAN DEFAULT false;

-- Which specialties this doctor may sign for. JSONB array of case_type values,
-- e.g. '["prosthetic","physiotherapy"]'. Empty array = no specialty assigned yet,
-- which the server treats as "may not sign anything".
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS medical_specialties JSONB DEFAULT '[]'::jsonb;

-- ── The signed record ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medical_exams (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  -- The specific case this exam belongs to. Nullable because a case row may not
  -- exist yet for a brand-new patient; case_type is the authoritative field.
  case_id INTEGER REFERENCES patient_cases(id),
  case_type TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  -- Signature. doctor_name is SNAPSHOTTED, not joined: the record must still
  -- read correctly years later even if the account is renamed or removed.
  doctor_id INTEGER REFERENCES system_users(id),
  doctor_name TEXT NOT NULL,
  -- Structured clinical body. All optional individually; the API requires that
  -- at least one of them carries text.
  chief_complaint TEXT,      -- الشكوى
  clinical_findings TEXT,    -- الفحص السريري
  diagnosis TEXT,            -- التشخيص
  plan TEXT,                 -- الخطة والتوصيات
  notes TEXT,                -- متن حر
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_exams_patient
  ON medical_exams (patient_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_exams_patient_case_type
  ON medical_exams (patient_id, case_type);
CREATE INDEX IF NOT EXISTS idx_medical_exams_branch
  ON medical_exams (branch_id, signed_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_exams_doctor
  ON medical_exams (doctor_id);

-- ── Dated corrections, appended never overwritten ──────────────────────────
CREATE TABLE IF NOT EXISTS medical_exam_addenda (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES medical_exams(id),
  doctor_id INTEGER REFERENCES system_users(id),
  doctor_name TEXT NOT NULL,
  body TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_medical_exam_addenda_exam
  ON medical_exam_addenda (exam_id, signed_at);

-- ── Guarantee 1: the seal (no UPDATE) ──────────────────────────────────────
CREATE OR REPLACE FUNCTION reject_medical_exam_update() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.allow_exam_edit', true) = 'on' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION
    'medical records are sealed: % id=% cannot be modified after signing',
    TG_TABLE_NAME, OLD.id
    USING HINT = 'File an addendum instead. Owner override: SET LOCAL app.allow_exam_edit = ''on'';';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_medical_exams_sealed ON medical_exams;
CREATE TRIGGER trg_medical_exams_sealed
  BEFORE UPDATE ON medical_exams
  FOR EACH ROW EXECUTE FUNCTION reject_medical_exam_update();

DROP TRIGGER IF EXISTS trg_medical_exam_addenda_sealed ON medical_exam_addenda;
CREATE TRIGGER trg_medical_exam_addenda_sealed
  BEFORE UPDATE ON medical_exam_addenda
  FOR EACH ROW EXECUTE FUNCTION reject_medical_exam_update();

-- ── Guarantee 2: deletes always leave evidence ─────────────────────────────
CREATE TABLE IF NOT EXISTS medical_exams_forensic_log (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER,
  patient_id INTEGER,
  case_type TEXT,
  branch_id INTEGER,
  doctor_id INTEGER,
  doctor_name TEXT,
  signed_at TIMESTAMPTZ,
  payload JSONB,
  -- Postgres session identity of whoever issued the DELETE, so a direct SQL
  -- deletion from a console is as traceable as an application one.
  db_user TEXT,
  application_name TEXT,
  client_addr TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION log_medical_exam_delete() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO medical_exams_forensic_log (
    exam_id, patient_id, case_type, branch_id, doctor_id, doctor_name,
    signed_at, payload, db_user, application_name, client_addr
  ) VALUES (
    OLD.id, OLD.patient_id, OLD.case_type, OLD.branch_id, OLD.doctor_id,
    OLD.doctor_name, OLD.signed_at, to_jsonb(OLD),
    current_user,
    current_setting('application_name', true),
    COALESCE(host(inet_client_addr()), 'local')
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_medical_exam_delete ON medical_exams;
CREATE TRIGGER trg_log_medical_exam_delete
  BEFORE DELETE ON medical_exams
  FOR EACH ROW EXECUTE FUNCTION log_medical_exam_delete();
`;
