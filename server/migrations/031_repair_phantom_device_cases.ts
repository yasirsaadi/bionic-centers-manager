// Migration 031: remove PHANTOM device cases, and the stale columns that keep
// re-creating them.
//
// ── What went wrong ────────────────────────────────────────────────────────
// `syncPatientCases` treated a service's detail column (amputation_site /
// prosthetic_type / support_type) as proof the service exists. That rule was
// written to rescue legacy rows whose مسند/طرف lived only in its type field
// while every boolean flag stayed false, and for those it is right.
//
// The registration form, however, leaves the previous service's values behind
// when the receptionist switches the type mid-entry (the amputation-site
// builder bails out early once the type is no longer أطراف, so it never erases
// what it wrote), and the form defaults to أطراف on most branches. So a
// مساند-only patient could arrive carrying a stale `amputation_site`, and the
// server read that leftover as evidence of an amputation: it manufactured an
// أطراف case, and the patient sat forever "بانتظار معاينة أطراف صناعية" for a
// limb they never needed.
//
// The rule is fixed in code (an explicit classification now beats a stale
// field). This migration repairs the rows already created.
//
// ── Why this is safe ───────────────────────────────────────────────────────
// A case is deleted ONLY when every one of these holds — i.e. it is provably
// empty and provably contradicted:
//   · the patient's own flag for that service is FALSE, and
//   · the patient IS explicitly classified as something else, and
//   · the case carries no cost, and
//   · no visit, no payment, no work order and no medical exam references it.
// Anything with a shred of real history is left exactly where it is.
//
// Idempotent: re-running finds nothing left to repair.

export const name = "031_repair_phantom_device_cases";

export const sql = `
-- ── 1. Phantom أطراف cases on patients classified as something else ────────
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

-- ── 2. The mirror case: a phantom مساند on an amputee ──────────────────────
DELETE FROM patient_cases pc
USING patients p
WHERE pc.patient_id = p.id
  AND pc.case_type = 'medical_support'
  AND COALESCE(p.is_medical_support, false) = false
  AND (COALESCE(p.is_amputee, false) OR COALESCE(p.is_physiotherapy, false))
  AND COALESCE(pc.cost, 0) = 0
  AND NOT EXISTS (SELECT 1 FROM visits v WHERE v.case_id = pc.id)
  AND NOT EXISTS (SELECT 1 FROM payments pay WHERE pay.case_id = pc.id)
  AND NOT EXISTS (
    SELECT 1 FROM prosthetic_work_orders wo
    WHERE wo.patient_id = pc.patient_id AND wo.service_type = 'medical_support'
  )
  AND NOT EXISTS (
    SELECT 1 FROM medical_exams me
    WHERE me.patient_id = pc.patient_id AND me.case_type = 'medical_support'
  );

-- ── 3. Clear the leftovers, so nothing re-manufactures the case ────────────
-- Only for patients who are classified as something else AND now hold no case
-- of that service at all. A patient who legitimately has the case keeps every
-- detail it recorded.
UPDATE patients p
SET amputation_site = NULL, prosthetic_type = NULL, silicon_type = NULL,
    silicon_size = NULL, suspension_system = NULL, foot_type = NULL,
    foot_size = NULL, knee_joint_type = NULL
WHERE COALESCE(p.is_amputee, false) = false
  AND (COALESCE(p.is_medical_support, false) OR COALESCE(p.is_physiotherapy, false))
  AND (p.amputation_site IS NOT NULL OR p.prosthetic_type IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM patient_cases pc
    WHERE pc.patient_id = p.id AND pc.case_type = 'prosthetic'
  );

UPDATE patients p
SET support_type = NULL
WHERE COALESCE(p.is_medical_support, false) = false
  AND (COALESCE(p.is_amputee, false) OR COALESCE(p.is_physiotherapy, false))
  AND p.support_type IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM patient_cases pc
    WHERE pc.patient_id = p.id AND pc.case_type = 'medical_support'
  );
`;
