// Migration 017 — Phase 1 of the independent-cases architecture.
//
// Creates patient_cases (one row per specialty a patient has), adds case_id to
// visits & payments, then BACKFILLS from the existing flat patient columns:
//   - one case per active flag (prosthetic / medical_support / physiotherapy)
//   - type-specific fields copied into details jsonb
//   - the patient's single total_cost lands on their HIGHEST-priority case
//     (prosthetic > medical_support > physiotherapy) so sum(case.cost) is
//     preserved exactly
//   - existing visits/payments are linked to a case (best-effort by tag/type)
//
// Purely ADDITIVE and idempotent: the legacy patient columns/flags stay intact
// and keep working; every insert/update is guarded so a re-run is a no-op.

export const name = "017_patient_cases";

export const sql = `
CREATE TABLE IF NOT EXISTS patient_cases (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER REFERENCES branches(id),
  case_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  cost INTEGER NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_cases_patient ON patient_cases(patient_id);

ALTER TABLE visits   ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES patient_cases(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS case_id INTEGER REFERENCES patient_cases(id);
CREATE INDEX IF NOT EXISTS idx_visits_case   ON visits(case_id);
CREATE INDEX IF NOT EXISTS idx_payments_case ON payments(case_id);

-- ── Backfill cases (guarded: only if the patient has no such case yet) ──────
INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, details, created_at)
SELECT p.id, p.branch_id, 'prosthetic',
  COALESCE(p.total_cost, 0),
  jsonb_strip_nulls(jsonb_build_object(
    'amputationSite', p.amputation_site, 'prostheticType', p.prosthetic_type,
    'siliconType', p.silicon_type, 'siliconSize', p.silicon_size,
    'suspensionSystem', p.suspension_system, 'footType', p.foot_type,
    'footSize', p.foot_size, 'kneeJointType', p.knee_joint_type,
    'injurySide', p.injury_side, 'injuryCause', p.injury_cause,
    'injuryDate', p.injury_date, 'injuryType', p.injury_type
  )),
  COALESCE(p.created_at, NOW())
FROM patients p
WHERE p.is_amputee = true
  AND NOT EXISTS (SELECT 1 FROM patient_cases c WHERE c.patient_id = p.id AND c.case_type = 'prosthetic');

INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, details, created_at)
SELECT p.id, p.branch_id, 'medical_support',
  CASE WHEN p.is_amputee THEN 0 ELSE COALESCE(p.total_cost, 0) END,
  jsonb_strip_nulls(jsonb_build_object(
    'supportType', p.support_type, 'injurySide', p.injury_side,
    'injuryCause', p.injury_cause, 'injuryDate', p.injury_date
  )),
  COALESCE(p.created_at, NOW())
FROM patients p
WHERE p.is_medical_support = true
  AND NOT EXISTS (SELECT 1 FROM patient_cases c WHERE c.patient_id = p.id AND c.case_type = 'medical_support');

INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, details, created_at)
SELECT p.id, p.branch_id, 'physiotherapy',
  CASE WHEN p.is_amputee OR p.is_medical_support THEN 0 ELSE COALESCE(p.total_cost, 0) END,
  jsonb_strip_nulls(jsonb_build_object(
    'diseaseType', p.disease_type, 'injuryType', p.injury_type,
    'injuryArea', p.injury_area, 'injuries', p.injuries, 'treatmentType', p.treatment_type
  )),
  COALESCE(p.created_at, NOW())
FROM patients p
WHERE p.is_physiotherapy = true
  AND NOT EXISTS (SELECT 1 FROM patient_cases c WHERE c.patient_id = p.id AND c.case_type = 'physiotherapy');

-- ── Link payments to a case (only rows still unlinked) ──────────────────────
UPDATE payments p SET case_id = c.id FROM patient_cases c
WHERE p.case_id IS NULL AND c.patient_id = p.patient_id AND c.case_type = 'prosthetic'
  AND p.payment_treatment_type = 'أطراف صناعية';
UPDATE payments p SET case_id = c.id FROM patient_cases c
WHERE p.case_id IS NULL AND c.patient_id = p.patient_id AND c.case_type = 'medical_support'
  AND p.payment_treatment_type = 'مساند طبية';
UPDATE payments p SET case_id = c.id FROM patient_cases c
WHERE p.case_id IS NULL AND c.patient_id = p.patient_id AND c.case_type = 'physiotherapy';
UPDATE payments p SET case_id = c.id FROM patient_cases c
WHERE p.case_id IS NULL AND c.patient_id = p.patient_id
  AND c.id = (SELECT id FROM patient_cases pc WHERE pc.patient_id = p.patient_id
              ORDER BY CASE pc.case_type WHEN 'prosthetic' THEN 1 WHEN 'medical_support' THEN 2 ELSE 3 END, pc.id LIMIT 1);

-- ── Link visits to a case (physio visits carry a treatment_type) ────────────
UPDATE visits v SET case_id = c.id FROM patient_cases c
WHERE v.case_id IS NULL AND c.patient_id = v.patient_id AND c.case_type = 'physiotherapy'
  AND v.treatment_type IS NOT NULL;
UPDATE visits v SET case_id = c.id FROM patient_cases c
WHERE v.case_id IS NULL AND c.patient_id = v.patient_id
  AND c.id = (SELECT id FROM patient_cases pc WHERE pc.patient_id = v.patient_id
              ORDER BY CASE pc.case_type WHEN 'prosthetic' THEN 1 WHEN 'medical_support' THEN 2 ELSE 3 END, pc.id LIMIT 1);
`;
