// Migration 034: redistribute PRE-ledger physiotherapy session costs onto
// their real days.
//
// Migration 033's opening entry put each patient's whole historical cost on
// their registration day — the only date the old data had. The owner
// immediately caught the distortion: five physio patients each paid 25,000
// for a session on Monday, but only the one REGISTERED Monday showed in
// Monday's costs; the other four's session costs sat inside their opening
// entries days earlier.
//
// Physio sessions have a property that lets us do better: the flows that book
// them (خدمة جديدة، الزيارة بكلفة، الجلسات المدفوعة) create the payment and
// the equal cost in the same request — so the PAYMENT's date IS the cost's
// date. For every pre-ledger payment tagged with a physiotherapy treatment
// type we insert a cost entry at the payment's date and subtract the same
// amount from the patient's opening entry. Per-patient total is unchanged to
// the dinar; only the distribution over days becomes real.
//
// Deliberately untouched:
//   - Device (أطراف/مساند) payments — installments over time, NOT equal to a
//     same-day cost; their costs correctly sit at sale/تخصيص time.
//   - Payments made AFTER migration 033 was applied — the live code already
//     wrote their dated entries; touching them would double-count.
//   - Any patient whose qualifying payments exceed their opening entry (data
//     drift) — skipped whole rather than inventing cost.
//
// Idempotent: the DO block exits immediately once any 'session_backfill'
// entry exists.

export const name = "034_backfill_session_cost_dates";

export const sql = `
DO $mig$
DECLARE
  ledger_activated TIMESTAMP;
BEGIN
  IF EXISTS (SELECT 1 FROM cost_entries WHERE source = 'session_backfill') THEN
    RETURN;
  END IF;

  SELECT applied_at INTO ledger_activated
  FROM _migrations WHERE name = '033_cost_entries_ledger';
  IF ledger_activated IS NULL THEN
    ledger_activated := NOW();
  END IF;

  CREATE TEMP TABLE _qualifying ON COMMIT DROP AS
  SELECT pay.id, pay.patient_id, pay.branch_id, pay.amount, pay.date,
         pay.payment_treatment_type
  FROM payments pay
  WHERE pay.amount > 0
    AND pay.date < ledger_activated
    AND pay.payment_treatment_type IS NOT NULL
    AND (pay.payment_treatment_type LIKE '%روبوت%'
      OR pay.payment_treatment_type LIKE '%تمارين تأهيلية%'
      OR pay.payment_treatment_type LIKE '%أجهزة علاج طبيعي%'
      OR pay.payment_treatment_type LIKE '%أبر صينية%'
      OR pay.payment_treatment_type LIKE '%استشارة طبية%')
    AND pay.payment_treatment_type NOT LIKE '%أطراف%'
    AND pay.payment_treatment_type NOT LIKE '%مساند%';

  CREATE TEMP TABLE _eligible ON COMMIT DROP AS
  SELECT q.patient_id, SUM(q.amount) AS moved
  FROM _qualifying q
  JOIN cost_entries op
    ON op.patient_id = q.patient_id AND op.source = 'opening'
  GROUP BY q.patient_id, op.amount
  HAVING SUM(q.amount) <= op.amount;

  INSERT INTO cost_entries (patient_id, branch_id, amount, source, notes, created_at)
  SELECT q.patient_id, q.branch_id, q.amount, 'session_backfill',
         q.payment_treatment_type, q.date
  FROM _qualifying q
  JOIN _eligible e ON e.patient_id = q.patient_id;

  UPDATE cost_entries op
  SET amount = op.amount - e.moved
  FROM _eligible e
  WHERE op.source = 'opening' AND op.patient_id = e.patient_id;

  DELETE FROM cost_entries WHERE source = 'opening' AND amount = 0;
END
$mig$;
`;
