// Migration 042: lower the phantom «بتر» flag that «تعديل مريض» raised.
//
// The bug (fixed in the same batch): the edit form's radio effect is additive
// by design — picking a type turns THAT flag on and never turns the others off,
// so a dual علاج+أطراف patient isn't silently stripped of a case. But it ran
// BEFORE the patient's values reached the form, while medicalCondition still
// held the component's placeholder default of "amputee". So merely OPENING any
// patient's file for editing raised is_amputee, and being additive nothing ever
// lowered it. Saving made a physiotherapy or support patient an amputee for
// good, and «بتر» appeared on their file with nothing behind it (patient
// امل عويز, reported 2026-08-06).
//
// The guards are migration 031's, applied to the FLAG instead of the case row:
// the flag only drops for a patient who is classified as something else AND
// carries no trace of an amputation anywhere — no site, no device spec, no
// priced prosthetic case, no work order, no exam. Anyone with a single real
// trace keeps the flag untouched.
//
// Nothing is lost by dropping it: تخصيص, the doctor's exam and «إضافة نوع
// حالة» all raise it again the moment a real amputation is recorded.

export const name = "042_repair_phantom_amputee_flag";

export const sql = `
UPDATE patients p
SET is_amputee = false
WHERE COALESCE(p.is_amputee, false) = true
  -- Must stay classified as something after the flag drops.
  AND (COALESCE(p.is_medical_support, false) OR COALESCE(p.is_physiotherapy, false))
  -- No amputation detail of any kind.
  AND COALESCE(NULLIF(TRIM(p.amputation_site), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.prosthetic_type), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.silicon_type), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.silicon_size), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.suspension_system), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.foot_type), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.foot_size), ''), NULL) IS NULL
  AND COALESCE(NULLIF(TRIM(p.knee_joint_type), ''), NULL) IS NULL
  -- No money, no order, no clinical record on the prosthetic side.
  AND NOT EXISTS (
    SELECT 1 FROM patient_cases pc
    WHERE pc.patient_id = p.id AND pc.case_type = 'prosthetic'
      AND COALESCE(pc.cost, 0) > 0
  )
  AND NOT EXISTS (
    SELECT 1 FROM prosthetic_work_orders wo
    WHERE wo.patient_id = p.id AND wo.service_type = 'prosthetic'
  )
  AND NOT EXISTS (
    SELECT 1 FROM medical_exams me
    WHERE me.patient_id = p.id AND me.case_type = 'prosthetic'
  );

-- The empty prosthetic case the flag caused to be derived, under exactly the
-- guards migration 031 used: no cost, no visit, no payment, no order, no exam.
DELETE FROM patient_cases pc
USING patients p
WHERE pc.patient_id = p.id
  AND pc.case_type = 'prosthetic'
  AND COALESCE(p.is_amputee, false) = false
  AND (COALESCE(p.is_medical_support, false) OR COALESCE(p.is_physiotherapy, false))
  AND COALESCE(pc.cost, 0) = 0
  AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.case_id = pc.id)
  AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.case_id = pc.id)
  AND NOT EXISTS (
    SELECT 1 FROM prosthetic_work_orders wo
    WHERE wo.patient_id = pc.patient_id AND wo.service_type = 'prosthetic'
  )
  AND NOT EXISTS (
    SELECT 1 FROM medical_exams me
    WHERE me.patient_id = pc.patient_id AND me.case_type = 'prosthetic'
  );
`;
