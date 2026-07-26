// Migration 032: return exam-written device costs to "proposed" until
// reception confirms them.
//
// Between migrations 030 and this one, the doctor's device price was written
// straight onto `patient_cases.cost` at exam time. That had two problems:
//   1. Business: a patient who walked out without paying — or changed their
//      mind — already stood in the books as a costed case, forever.
//   2. Accounting: the amount entered the per-section split (which sums case
//      costs) but never entered totalRevenue (which sums patients.total_cost).
//      Worse, reception's later confirmation in تخصيص bumps total_cost only by
//      (confirmed price − case cost), so confirming the same price added ZERO —
//      the sale stayed permanently invisible to the top-line numbers.
//
// The flow is now: the price lives on the exam as a PROPOSAL; the one write
// that puts it into the books is reception's تخصيص save, which sets the case
// cost AND bumps total_cost by the full amount.
//
// This migration resets the cases the old flow already touched, so their
// eventual confirmation books the full price. Guards — a case is reset ONLY
// when ALL hold:
//   · it is a device case (prosthetic / medical_support) with a cost > 0 that
//     EXACTLY matches a signed exam's device_cost for the same specialty (that
//     match is our fingerprint that the exam path priced it), and
//   · no work order exists for that (patient, service) — تخصيص creates one, so
//     an existing order means reception already confirmed, and
//   · no payment is attached to the case — money against it means the price is
//     live in practice, whoever wrote it.
// Reset = cost 0, costSource 'auto' (the natural state of an unpriced case;
// the sync cost-floor may later lift it to the paid total, exactly as for any
// unpriced case).
//
// Idempotent: after the reset the fingerprint no longer matches (cost is 0).

export const name = "032_unconfirm_exam_costs";

export const sql = `
UPDATE patient_cases pc
SET cost = 0, cost_source = 'auto', updated_at = NOW()
WHERE pc.case_type IN ('prosthetic', 'medical_support')
  AND COALESCE(pc.cost, 0) > 0
  AND pc.cost_source = 'manual'
  AND (
    EXISTS (
      SELECT 1 FROM medical_exams me
      WHERE me.patient_id = pc.patient_id
        AND me.case_type = pc.case_type
        AND me.device_cost = pc.cost
    )
    -- The exam may have been REVISED since it priced the case (the old flow
    -- applied the price on every save), so the fingerprint must also match
    -- superseded versions — otherwise a doctor who later changed or removed
    -- the price leaves the case stuck at the old, unconfirmed amount.
    OR EXISTS (
      SELECT 1
      FROM medical_exam_revisions rev
      JOIN medical_exams me2 ON me2.id = rev.exam_id
      WHERE me2.patient_id = pc.patient_id
        AND rev.case_type = pc.case_type
        AND rev.device_cost = pc.cost
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM prosthetic_work_orders wo
    WHERE wo.patient_id = pc.patient_id
      AND wo.service_type = pc.case_type
  )
  AND NOT EXISTS (
    SELECT 1 FROM payments pay WHERE pay.case_id = pc.id
  );
`;
