// Migration 041: close the gap the «خدمة جديدة» bug left between a patient's
// total cost and the sum of their case costs.
//
// The bug (fixed in the same batch): the endpoint added the TYPED total to
// patients.total_cost but only the sum of the TREATMENT LINES to the cases.
// Whenever a human edited the total by hand the difference landed on the
// patient and on no case at all — so «تفاصيل الحالات» showed 600,000 + 150,000
// while the file said 775,000 (patient امل عويز, reported 2026-08-06).
//
// The code fix stops new gaps; this repairs the ones already recorded. There
// is no UI to edit a case's cost, so the owner cannot fix these by hand.
//
// Direction is deliberately one-way: the cost ledger agrees with
// total_cost (verified on the reported patient — 775,000 both), so total_cost
// is the truth and the CASE is what fell short. Nothing here ever changes
// total_cost, and it never lowers a case.
//
// Scope guard: only patients that HAVE a physiotherapy case are touched,
// because the gap can only arise on the physio branch of «خدمة جديدة» (the
// treatment-lines path runs for physiotherapy patients). A patient with a gap
// and no physio case is left exactly as-is rather than guessed at.

export const name = "041_repair_case_cost_gap";

export const sql = `
WITH gaps AS (
  SELECT p.id AS patient_id,
         p.total_cost - COALESCE(SUM(pc.cost), 0) AS diff
  FROM patients p
  LEFT JOIN patient_cases pc ON pc.patient_id = p.id
  GROUP BY p.id, p.total_cost
  HAVING p.total_cost - COALESCE(SUM(pc.cost), 0) > 0
)
UPDATE patient_cases c
SET cost = COALESCE(c.cost, 0) + g.diff,
    updated_at = NOW()
FROM gaps g
WHERE c.patient_id = g.patient_id
  AND c.case_type = 'physiotherapy';
`;
