// **رصيدُ قاصة الدكتور الافتتاحيّ لكلّ فرع** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.cb تكملة) — يضعه المالكُ بنفسه، ومن يومه يبدأ الحساب:
// الرصيد = الافتتاحيّ + التحويلاتُ من يومه − المصروفُ من يومه. صفٌّ واحد لكلّ فرع، يُعدَّل ولا يتكرّر.
// إضافيّ، idempotent، بلا مفتاحٍ إلى `patients`، وبلا لمسِ صفٍّ قائم.

export const name = "100_dr_box_opening";

export const sql = `
CREATE TABLE IF NOT EXISTS dr_box_openings (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  opening_date DATE NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id)
);
`;
