// Migration 023 — re-home stranded MAINTENANCE visits.
//
// Maintenance visits created before the case-attribution fix carried no
// case_id, so the fallback attached them to the PHYSIOTHERAPY case — a طرف
// maintenance visit displayed under العلاج الطبيعي. They are safely
// identifiable: no treatment type (maintenance never has one) + the word
// "صيانة" in the notes. Move each to the patient's matching device case
// (طرف keyword → prosthetic, مسند → support, generic صيانة → prosthetic
// first then support).
//
// Idempotent: once moved, the WHERE (physio case) no longer matches.

export const name = "023_maintenance_visit_case_repair";

export const sql = `
UPDATE visits v
SET case_id = dev.id
FROM patient_cases ph, patient_cases dev
WHERE v.case_id = ph.id
  AND ph.case_type = 'physiotherapy'
  AND dev.patient_id = v.patient_id
  AND v.treatment_type IS NULL
  AND v.notes LIKE '%صيانة%'
  AND dev.case_type = CASE
        WHEN v.notes LIKE '%مسند%' AND v.notes NOT LIKE '%طرف%' THEN 'medical_support'
        ELSE 'prosthetic'
      END
  AND EXISTS (SELECT 1 FROM patient_cases d2 WHERE d2.id = dev.id);

-- Generic "صيانة" note but the patient only has a SUPPORT device case:
UPDATE visits v
SET case_id = dev.id
FROM patient_cases ph, patient_cases dev
WHERE v.case_id = ph.id
  AND ph.case_type = 'physiotherapy'
  AND dev.patient_id = v.patient_id
  AND dev.case_type = 'medical_support'
  AND v.treatment_type IS NULL
  AND v.notes LIKE '%صيانة%'
  AND NOT EXISTS (SELECT 1 FROM patient_cases p2 WHERE p2.patient_id = v.patient_id AND p2.case_type = 'prosthetic');
`;
