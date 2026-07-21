// Migration 024 — owner-approved notes-based visit re-homing (all patients).
//
// The owner confirmed the visit's PURPOSE is readable from its notes, so
// visits whose case attribution contradicts their notes are moved to the
// right case. Scope guards on EVERY rule:
//   - deleted_at IS NULL
//   - treatment_type IS NULL   (a typed visit is a physio session by
//     definition and already lives on the physio case — rule R1 aside)
//   - notes NOT LIKE 'إضافة نوع حالة%'   (case-creation markers carry the
//     case-type words but belong where they are)
//   - the TARGET case must exist for that patient
//
// Vocabulary (from the owner's real data):
//   R1 → physiotherapy : تدريب / جلسات علاج / جلسة علاج   (wins over device
//        words: "تدريب مع تغيير مكان الادبتر" is a training session)
//   R2 → prosthetic    : طرف / سوكت / تعيار / ادبتر / أدبتر  (not تدريب/مسند)
//   R3 → medical_support: مسند / مساند                        (not تدريب)
//   R4 → قالب alone     : the patient's ONLY device case (skip dual-device
//        patients — ambiguous)
//
// Idempotent: a moved row no longer matches (its case already == target).

export const name = "024_visit_notes_classification";

const COMMON = `v.deleted_at IS NULL
  AND v.treatment_type IS NULL
  AND v.notes IS NOT NULL AND v.notes <> ''
  AND v.notes NOT LIKE 'إضافة نوع حالة%'`;

export const sql = `
-- R1: training / extra-session visits belong to physiotherapy
UPDATE visits v
SET case_id = ph.id
FROM patient_cases ph
WHERE ph.patient_id = v.patient_id AND ph.case_type = 'physiotherapy'
  AND v.case_id IS DISTINCT FROM ph.id
  AND ${COMMON}
  AND (v.notes LIKE '%تدريب%' OR v.notes LIKE '%جلسات علاج%' OR v.notes LIKE '%جلسة علاج%');

-- R2: prosthetic-vocabulary visits belong to the prosthetic case
UPDATE visits v
SET case_id = pr.id
FROM patient_cases pr
WHERE pr.patient_id = v.patient_id AND pr.case_type = 'prosthetic'
  AND v.case_id IS DISTINCT FROM pr.id
  AND ${COMMON}
  AND (v.notes LIKE '%طرف%' OR v.notes LIKE '%سوكت%' OR v.notes LIKE '%تعيار%' OR v.notes LIKE '%ادبتر%' OR v.notes LIKE '%أدبتر%')
  AND v.notes NOT LIKE '%تدريب%'
  AND v.notes NOT LIKE '%مسند%' AND v.notes NOT LIKE '%مساند%'
  AND v.notes NOT LIKE '%تمارين%' AND v.notes NOT LIKE '%عضلات%';

-- R3: support-vocabulary visits belong to the medical-support case
UPDATE visits v
SET case_id = ms.id
FROM patient_cases ms
WHERE ms.patient_id = v.patient_id AND ms.case_type = 'medical_support'
  AND v.case_id IS DISTINCT FROM ms.id
  AND ${COMMON}
  AND (v.notes LIKE '%مسند%' OR v.notes LIKE '%مساند%')
  AND v.notes NOT LIKE '%تدريب%'
  AND v.notes NOT LIKE '%طرف%';

-- R4: bare "قالب" visits go to the patient's ONLY device case
UPDATE visits v
SET case_id = dev.id
FROM patient_cases dev
WHERE dev.patient_id = v.patient_id
  AND dev.case_type IN ('prosthetic', 'medical_support')
  AND v.case_id IS DISTINCT FROM dev.id
  AND ${COMMON}
  AND v.notes LIKE '%قالب%'
  AND v.notes NOT LIKE '%تدريب%'
  AND v.notes NOT LIKE '%طرف%' AND v.notes NOT LIKE '%مسند%' AND v.notes NOT LIKE '%مساند%'
  AND NOT EXISTS (
    SELECT 1 FROM patient_cases d2
    WHERE d2.patient_id = v.patient_id
      AND d2.case_type IN ('prosthetic', 'medical_support')
      AND d2.id <> dev.id
  );
`;
