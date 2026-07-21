// Migration 021 — work-order uniqueness + stolen-visit repair.
//
// 1. REPAIR: syncPatientCases used to re-home ANY visit whose notes contain
//    "أطراف"/"مساند" onto the device case — stealing normal physiotherapy
//    visits (e.g. notes "تمارين تقوية عضلات الأطراف السفلية") from the physio
//    case on every sync. The sync now only touches unattributed visits; this
//    puts the already-stolen ones back: a visit WITH a treatment_type is a
//    physiotherapy session by definition, so if it sits on a device case and
//    is not an add-case-type marker, move it to the physio case.
// 2. Cancel duplicate ACTIVE work orders (concurrent-click artifacts), keeping
//    the newest per (patient, service).
// 3. Partial UNIQUE index: at most ONE open order per (patient, service) —
//    the database-level backstop for the in-transaction guards.
//
// Idempotent: the repair/dedup are no-ops when clean; IF NOT EXISTS on DDL.

export const name = "021_order_uniqueness_and_visit_repair";

export const sql = `
UPDATE visits v
SET case_id = ph.id
FROM patient_cases dev, patient_cases ph
WHERE v.case_id = dev.id
  AND dev.case_type IN ('prosthetic', 'medical_support')
  AND ph.patient_id = v.patient_id
  AND ph.case_type = 'physiotherapy'
  AND v.treatment_type IS NOT NULL
  AND (v.notes IS NULL OR v.notes NOT LIKE 'إضافة نوع حالة%');

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY patient_id, service_type ORDER BY id DESC) AS rn
  FROM prosthetic_work_orders
  WHERE status NOT IN ('completed', 'cancelled')
)
UPDATE prosthetic_work_orders w
SET status = 'cancelled',
    final_notes = COALESCE(w.final_notes, '') || ' [أُلغي تلقائياً: أمر مكرر ناتج عن نقر متزامن]',
    updated_at = NOW()
FROM ranked r
WHERE w.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS uq_pwo_one_active_per_service
  ON prosthetic_work_orders (patient_id, service_type)
  WHERE status NOT IN ('completed', 'cancelled');
`;
