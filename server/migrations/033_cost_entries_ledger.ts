// Migration 033: dated cost ledger + opening backfill.
//
// `patients.total_cost` is one running number with no history, so the daily
// financial report could never answer "how much cost was created on day X".
// It faked التكاليف from the day's REGISTREES (their current lifetime cost —
// retroactively growing, and blind to costs added that day to old patients),
// then subtracted the day's payments from ANYONE, producing the meaningless
// red "متبقي 500,000−" the owner caught on 2026-07-28.
//
// From this migration on, every code path that moves total_cost also inserts
// a dated row here with the same delta (registration, تخصيص, الكلفة والجلسات,
// أجور الصيانة, خدمة جديدة, إضافة نوع حالة, زيارة بكلفة, تعديل إداري, سحب
// حالة). Invariant: sum(entries per patient) == patients.total_cost.
//
// Backfill: history cannot be reconstructed (the number was dateless), so
// each existing patient gets ONE opening entry carrying their current
// total_cost, dated at their registration. Old days are therefore an
// approximation — a patient's whole cost attributed to their registration
// day — and full per-day accuracy starts at deployment. The backfill runs
// only when the table is empty, so re-running the migration never doubles it.

export const name = "033_cost_entries_ledger";

export const sql = `
CREATE TABLE IF NOT EXISTS cost_entries (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER,
  amount INTEGER NOT NULL,
  source TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cost_entries_patient ON cost_entries(patient_id);
CREATE INDEX IF NOT EXISTS idx_cost_entries_branch_date ON cost_entries(branch_id, created_at);

INSERT INTO cost_entries (patient_id, branch_id, amount, source, notes, created_at)
SELECT p.id, p.branch_id, p.total_cost, 'opening',
       'قيد افتتاحي — كلفة المريض المتراكمة حتى تفعيل دفتر الكلف',
       COALESCE(p.created_at, NOW())
FROM patients p
WHERE COALESCE(p.total_cost, 0) > 0
  AND NOT EXISTS (SELECT 1 FROM cost_entries LIMIT 1);
`;
