// Migration 037: un-poison the session plans of per-session (مفرد) patients.
//
// For one day, «خدمة جديدة — جلسات علاج إضافية» merged its entries into
// `physio_plan` even when the patient had NO plan. For a per-session patient
// that CREATED a plan of just the newly-bought sessions — and since the
// counter prefers the plan over the payments, a patient with 15 paid sessions
// read "1 purchased" the moment he bought one more, and his counter went
// deeply negative (reported from ذي قار: يوسف نعيمة، حميد عاشور، صفاء حميد،
// أحمد فرج).
//
// Repair: NULL the plan wherever it is provably poisoned, restoring the
// payments-based counting that was always these patients' truth. "Provably"
// means ALL of:
//   · a physiotherapy patient with a non-empty plan,
//   · who was NEVER priced through «الكلفة والجلسات» (no physio_pricing cost
//     entry — a priced patient's plan is legitimate),
//   · and whose payment rows carry MORE sessions than the plan does — the
//     signature of a history-holding patient whose plan only knows the last
//     top-up. (Backfilled plans from 036 required zero session payments, so
//     they cannot match; a priced patient's later top-ups ride payments too
//     but never exceed his full plan.)
//
// Idempotent by construction: once the plan is NULL the row no longer matches.

export const name = "037_repair_poisoned_physio_plans";

export const sql = `
UPDATE patients p
SET physio_plan = NULL
WHERE p.is_physiotherapy = true
  AND p.physio_plan IS NOT NULL
  AND jsonb_array_length(p.physio_plan) > 0
  AND NOT EXISTS (
    SELECT 1 FROM cost_entries ce
    WHERE ce.patient_id = p.id AND ce.source = 'physio_pricing'
  )
  AND (
    SELECT COALESCE(SUM(pay.session_count), 0)
    FROM payments pay WHERE pay.patient_id = p.id
  ) > (
    SELECT COALESCE(SUM((e->>'sessionCount')::int), 0)
    FROM jsonb_array_elements(p.physio_plan) e
  );
`;
