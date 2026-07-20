// Migration 019 — catch-up sync of patient_cases.
//
// Migration 017 backfilled cases from the patient flags as they were AT THAT
// TIME. Any flag added afterwards (e.g. "add case type" used between deploys)
// left the patient without a case row for that type, so its chip/page was
// missing. This re-runs the case creation + linking, guarded so it only adds
// what's missing.
//
// Cost rule (avoids double-counting): a patient's total_cost is placed on the
// FIRST case created for them (prosthetic > medical_support > physiotherapy).
// A patient who already had a case (from 017) keeps that attribution; the
// newly-added type gets cost 0. Achieved by ordering the INSERTs and gating
// the cost on "the patient has no case row yet".
//
// Idempotent, non-destructive.

export const name = "019_sync_patient_cases";

const noCasesYet = `NOT EXISTS (SELECT 1 FROM patient_cases c2 WHERE c2.patient_id = p.id)`;

export const sql = `
INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, details, created_at)
SELECT p.id, p.branch_id, 'prosthetic',
  CASE WHEN ${noCasesYet} THEN COALESCE(p.total_cost, 0) ELSE 0 END,
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
  CASE WHEN ${noCasesYet} THEN COALESCE(p.total_cost, 0) ELSE 0 END,
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
  CASE WHEN ${noCasesYet} THEN COALESCE(p.total_cost, 0) ELSE 0 END,
  jsonb_strip_nulls(jsonb_build_object(
    'diseaseType', p.disease_type, 'injuryType', p.injury_type,
    'injuryArea', p.injury_area, 'injuries', p.injuries, 'treatmentType', p.treatment_type
  )),
  COALESCE(p.created_at, NOW())
FROM patients p
WHERE p.is_physiotherapy = true
  AND NOT EXISTS (SELECT 1 FROM patient_cases c WHERE c.patient_id = p.id AND c.case_type = 'physiotherapy');

-- Link any still-unlinked payments/visits (created between deploys).
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

UPDATE visits v SET case_id = c.id FROM patient_cases c
WHERE v.case_id IS NULL AND c.patient_id = v.patient_id AND c.case_type = 'physiotherapy'
  AND v.treatment_type IS NOT NULL;
UPDATE visits v SET case_id = c.id FROM patient_cases c
WHERE v.case_id IS NULL AND c.patient_id = v.patient_id
  AND c.id = (SELECT id FROM patient_cases pc WHERE pc.patient_id = v.patient_id
              ORDER BY CASE pc.case_type WHEN 'prosthetic' THEN 1 WHEN 'medical_support' THEN 2 ELSE 3 END, pc.id LIMIT 1);
`;
