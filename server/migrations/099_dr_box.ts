// **قاصةُ الدكتور لكلّ فرع** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.cb) — سجلٌّ مستقلٌّ خارجَ قاصة الفرع وتقاريره.
//
// • الواردُ إليها لا يُكتب هنا: هو «تحويل إلى قاصة الدكتور» في دفتر القاصة (`cash_book_entries`).
// • وهذا الجدولُ لما يصرفه المالكُ منها وحده — بالفرع واليوم وباب الصرف والمبلغ.
// • **ولا يدخل `expenses`**: المالُ خرج من قاصة الفرع يومَ حُوِّل، فلو دخل لحُسب مرّتين في تقارير الفرع.
// إضافيّ، idempotent، بلا مفتاحٍ إلى `patients` (فلا يمسّ كاسكيدَ حذف المريض)، وبلا لمسِ صفٍّ قائم.

export const name = "099_dr_box";

export const sql = `
CREATE TABLE IF NOT EXISTS dr_box_expenses (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  expense_date DATE NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES system_users(id)
);
CREATE INDEX IF NOT EXISTS ix_dr_box_expenses_day ON dr_box_expenses (branch_id, expense_date) WHERE deleted_at IS NULL;
`;
