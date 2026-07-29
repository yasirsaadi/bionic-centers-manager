// Migration 038: link a payment to the record that created it.
//
// The audit answered "who moved this money" but not "what FOR". Two flows
// create a payment as a side-effect of another record, with no link back:
//
//   · a paid VISIT (كلفة الزيارة) creates an equal payment — so editing the
//     visit's cost or deleting the visit could never find "its" payment to
//     correct, and the two records drifted apart (audit finding, 2026-07-29);
//   · collecting cash against an INVOICE had no recording path at all — the
//     invoice stayed «قيد الانتظار» after the patient actually paid.
//
// Plain integer columns, deliberately NO foreign keys: deletePatient removes
// invoices BEFORE payments, and an FK here would break that cascade order.
// The links are navigation aids, not integrity constraints — a dangling id
// simply means the counterpart record is gone.

export const name = "038_payment_links";

export const sql = `
ALTER TABLE payments ADD COLUMN IF NOT EXISTS visit_id INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS invoice_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_payments_visit ON payments(visit_id) WHERE visit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id) WHERE invoice_id IS NOT NULL;
`;
