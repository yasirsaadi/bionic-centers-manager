// Migration 036: remember HOW MANY sessions were sold, not just their price.
//
// The page's session counter reads purchased sessions from
// `payments.session_count`. That worked while every physiotherapy sale WAS a
// payment. It stopped working the moment registration became priceless: today
// reception prices the course in «الكلفة والجلسات», which books the money and
// the treatment-type name — and drops the counts on the floor. So a patient
// priced for 10 robot sessions showed "0 purchased", and the remaining counter
// went negative with every visit (the owner caught it on منتهى خميس وادي and
// مصطفى حيدر حسين).
//
// `patients.physio_plan` is the structured memory that was missing: an array of
// { treatmentType, sessionCount } describing what the patient BOUGHT. Pricing
// writes it, «جلسات علاج إضافية» adds to it, and the counter prefers it over
// the payment-derived fallback — old patients, whose sessions really do live on
// their payments, keep counting exactly as before (plan stays NULL).
//
// Backfill, deliberately conservative: a patient already priced under the new
// flow lost their counts, but where the plan has a SINGLE treatment type the
// count is recoverable with certainty — cost ÷ that type's per-session price,
// and only when it divides exactly. Patients with several types (ambiguous) or
// an inexact division are left NULL for the «تعديل خطة الجلسات» dialog, rather
// than guessed at.

export const name = "036_physio_session_plan";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS physio_plan JSONB;

-- Recover the counts for single-type physiotherapy patients whose plan the old
-- pricing path forgot. Guards, all required:
--   · physiotherapy patient with a cost > 0 and no plan yet,
--   · treatment_type names exactly ONE known type (no Arabic comma),
--   · that type has a per-session price > 0,
--   · the physiotherapy case cost divides by it exactly,
--   · and the patient has no session counts on payments (else they are an old
--     patient whose counter already works, and a plan would double-count).
-- (A CTE, not a LATERAL: Postgres refuses to let a LATERAL in the FROM clause
-- reference the UPDATE's own target table.)
WITH candidates AS (
  SELECT p.id,
         TRIM(p.treatment_type) AS ttype,
         COALESCE(pc.cost, 0) AS cost,
         CASE TRIM(p.treatment_type)
           WHEN 'روبوت' THEN 50000
           WHEN 'تمارين تأهيلية' THEN 25000
           WHEN 'أجهزة علاج طبيعي' THEN 25000
           WHEN 'أبر صينية' THEN 25000
           ELSE 0
         END AS per_session
  FROM patients p
  JOIN patient_cases pc
    ON pc.patient_id = p.id AND pc.case_type = 'physiotherapy'
  WHERE p.is_physiotherapy = true
    AND p.physio_plan IS NULL
    AND p.treatment_type IS NOT NULL
    AND p.treatment_type NOT LIKE '%،%'
    AND p.treatment_type NOT LIKE '%(%'
    AND COALESCE(pc.cost, 0) > 0
    AND NOT EXISTS (
      SELECT 1 FROM payments pay
      WHERE pay.patient_id = p.id AND COALESCE(pay.session_count, 0) > 0
    )
)
UPDATE patients p
SET physio_plan = jsonb_build_array(
      jsonb_build_object('treatmentType', c.ttype,
                         'sessionCount', (c.cost / c.per_session))
    )
FROM candidates c
WHERE c.id = p.id
  AND c.per_session > 0
  AND MOD(c.cost, c.per_session) = 0;
`;
