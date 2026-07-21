// Migration 025 — reverse migration 024's visit moves (owner's correction).
//
// 024's main effect (R1) moved تدريب/جلسات-علاج visits from device cases to
// the physiotherapy case. The owner clarified staff record prosthetic-training
// visits UNDER the prosthetic case on purpose — the visits' placement was
// never the problem (the sessions counter was, fixed client-side). This puts
// every such visit back on the patient's device case: prosthetic when the
// patient has one, otherwise medical support. Same safety guards as before
// (deleted rows, typed rows, case-creation markers and empty notes untouched;
// physio-only patients untouched). Idempotent.

export const name = "025_revert_visit_notes_classification";

const COMMON = `v.deleted_at IS NULL
  AND v.treatment_type IS NULL
  AND v.notes IS NOT NULL AND v.notes <> ''
  AND v.notes NOT LIKE 'إضافة نوع حالة%'
  AND (v.notes LIKE '%تدريب%' OR v.notes LIKE '%جلسات علاج%' OR v.notes LIKE '%جلسة علاج%')`;

export const sql = `
-- back to the prosthetic case when the patient has one
UPDATE visits v
SET case_id = pr.id
FROM patient_cases ph, patient_cases pr
WHERE v.case_id = ph.id AND ph.case_type = 'physiotherapy'
  AND pr.patient_id = v.patient_id AND pr.case_type = 'prosthetic'
  AND ${COMMON};

-- otherwise back to the medical-support case
UPDATE visits v
SET case_id = ms.id
FROM patient_cases ph, patient_cases ms
WHERE v.case_id = ph.id AND ph.case_type = 'physiotherapy'
  AND ms.patient_id = v.patient_id AND ms.case_type = 'medical_support'
  AND NOT EXISTS (SELECT 1 FROM patient_cases p2 WHERE p2.patient_id = v.patient_id AND p2.case_type = 'prosthetic')
  AND ${COMMON};
`;
