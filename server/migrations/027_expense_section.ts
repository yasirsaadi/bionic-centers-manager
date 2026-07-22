// Migration 027 — add the "section" (revenue-stream) dimension to expenses so
// each expense can be attributed to الأطراف والمساند (prosthetic) / العلاج
// الطبيعي (physio) / مشترك (shared).
//
// Additive and non-destructive on purpose: the column is nullable and NOT
// back-filled, so legacy rows stay byte-identical and the grand SUM(amount)
// is unchanged. Reports treat NULL as "shared/غير محدّد". Going forward the
// API requires a section on every new/edited expense.
//
// Idempotent: ADD COLUMN IF NOT EXISTS.

export const name = "027_expense_section";

export const sql = `
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS section TEXT;

-- Speeds up the per-section GROUP BY in the accounting summary.
CREATE INDEX IF NOT EXISTS idx_expenses_branch_section
  ON expenses (branch_id, section);
`;
