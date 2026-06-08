// Migration 011: soft-delete + forensic trigger for visits
//
// Why this migration exists
// -------------------------
// On 2026-06-08, four physiotherapy visits for patient 1473 (حميد ذياب سبع)
// vanished from the visits table in a single event. The application's
// audit_log captured zero delete entries for those rows. After exhaustive
// code review we could not identify a path in the app that could produce
// the observed pattern (specific visits gone, payments and patient row
// intact, no audit trace).
//
// Rather than leave the system one accident away from a repeat, this
// migration installs two independent layers of protection so that:
//   (1) the normal delete path can never lose data permanently, and
//   (2) any DELETE on visits — from anywhere, even direct SQL — leaves
//       a forensic trail with the row contents and Postgres-level
//       session metadata.
//
// What this migration does
// ------------------------
//   1. Adds `deleted_at TIMESTAMPTZ` to visits for soft delete.
//   2. Adds partial indexes so reads filtered on deleted_at IS NULL stay
//      fast.
//   3. Creates `visits_forensic_log` to receive a row-copy of any visit
//      that gets physically deleted from the visits table, regardless
//      of who issued the DELETE.
//   4. Installs a BEFORE DELETE trigger on visits that copies OLD.* into
//      the forensic log along with the Postgres-level session
//      identifiers we can capture from a trigger context.
//
// The application-level deleteVisit() in storage.ts will be switched to
// soft delete in the same PR. Hard deletes still happen during the
// deletePatient() cascade (the FK constraint forces it), and the trigger
// catches those too — giving us a full record even when cascades fire.
//
// Idempotent: re-running the migration is a no-op.

export const name = "011_visit_soft_delete_and_forensic";

export const sql = `
-- 1. Soft-delete column
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Partial indexes so the active-visits filter stays cheap
CREATE INDEX IF NOT EXISTS visits_patient_active_idx
  ON visits (patient_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS visits_branch_active_idx
  ON visits (branch_id)
  WHERE deleted_at IS NULL;

-- 3. Forensic log table — captures every row physically deleted from
--    visits, regardless of source (app cascade, manual SQL, anything).
CREATE TABLE IF NOT EXISTS visits_forensic_log (
  id              SERIAL PRIMARY KEY,
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pg_user         TEXT NOT NULL DEFAULT current_user,
  pg_app_name     TEXT,
  pg_client_addr  TEXT,
  visit_id        INTEGER NOT NULL,
  patient_id      INTEGER,
  branch_id       INTEGER,
  visit_date      TIMESTAMP,
  details         TEXT,
  notes           TEXT,
  treatment_type  TEXT,
  session_count   INTEGER,
  cost            INTEGER,
  shift           TEXT,
  created_by      INTEGER
);

CREATE INDEX IF NOT EXISTS visits_forensic_log_visit_id_idx
  ON visits_forensic_log (visit_id);

CREATE INDEX IF NOT EXISTS visits_forensic_log_logged_at_idx
  ON visits_forensic_log (logged_at DESC);

-- 4. Trigger function: copies the OLD row into the forensic log on any
--    DELETE from visits. Wrapped in plpgsql so we can pull
--    session-level identifiers (current_user, application_name, client
--    address) that the application audit_log can't see when the delete
--    bypasses the app layer.
CREATE OR REPLACE FUNCTION fn_log_visit_delete() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO visits_forensic_log (
    pg_app_name, pg_client_addr,
    visit_id, patient_id, branch_id, visit_date, details, notes,
    treatment_type, session_count, cost, shift, created_by
  )
  VALUES (
    current_setting('application_name', true),
    host(inet_client_addr()),
    OLD.id, OLD.patient_id, OLD.branch_id, OLD.visit_date, OLD.details, OLD.notes,
    OLD.treatment_type, OLD.session_count, OLD.cost, OLD.shift, OLD.created_by
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_visit_delete ON visits;
CREATE TRIGGER trg_log_visit_delete
  BEFORE DELETE ON visits
  FOR EACH ROW
  EXECUTE FUNCTION fn_log_visit_delete();
`;
