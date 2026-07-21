// Migration 020 — patient_cases integrity hardening.
//
// 1. cost_source column: distinguishes human-priced case costs ('manual' — the
//    per-case ✏️ editor / تخصيص / add-case-type) from derived ones ('auto' —
//    migration split, cost floor). The cost floor must never override 'manual'.
//    Cases priced by assignManufacturing/updateCaseCost BEFORE this migration
//    can't be told apart retroactively, so everything starts 'auto'; from now
//    on every human pricing marks the row 'manual'.
// 2. De-duplicate (patient_id, case_type) rows that a concurrent
//    syncPatientCases race could have produced: keep the highest-cost row
//    (lowest id on ties), re-point visits/payments to the keeper, drop the rest
//    WITHOUT summing costs (each duplicate held its own copy of the same
//    money — summing would double-count).
// 3. UNIQUE index on (patient_id, case_type) so the race is impossible at the
//    database level from now on.
//
// Idempotent: IF NOT EXISTS everywhere; the dedup CTE is a no-op when there
// are no duplicates.

export const name = "020_case_integrity";

export const sql = `
ALTER TABLE patient_cases ADD COLUMN IF NOT EXISTS cost_source TEXT NOT NULL DEFAULT 'auto';

WITH ranked AS (
  SELECT id, patient_id, case_type,
         FIRST_VALUE(id) OVER (PARTITION BY patient_id, case_type ORDER BY cost DESC, id ASC) AS keeper_id
  FROM patient_cases
),
dupes AS (
  SELECT id, keeper_id FROM ranked WHERE id <> keeper_id
),
repoint_visits AS (
  UPDATE visits v SET case_id = d.keeper_id FROM dupes d WHERE v.case_id = d.id
  RETURNING v.id
),
repoint_payments AS (
  UPDATE payments p SET case_id = d.keeper_id FROM dupes d WHERE p.case_id = d.id
  RETURNING p.id
)
DELETE FROM patient_cases pc USING dupes d WHERE pc.id = d.id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_cases_patient_type
  ON patient_cases (patient_id, case_type);
`;
