// **طباعةُ ورقة الدفتر** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.ca تكملة) — سجلُّ كلّ طباعة: مَن ومتى، وبصمةُ ما طُبع.
// فإن تغيّر شيءٌ في الورقة بعد طباعتها (سطرٌ أُضيف أو عُدّل أو حُذف، أو تغيّر ما قبلها فتغيّر «الباقي من أمس») اختلفت البصمةُ
// فتقول الصفحةُ «عُدّل بعد الطباعة». إضافيّ، idempotent، بلا مفتاحٍ إلى `patients`، وبلا لمسِ صفٍّ قائم.

export const name = "101_cash_book_prints";

export const sql = `
CREATE TABLE IF NOT EXISTS cash_book_prints (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  book TEXT NOT NULL CHECK (book IN ('devices', 'physio')),
  day DATE NOT NULL,
  fingerprint TEXT NOT NULL,
  printed_by INTEGER REFERENCES system_users(id),
  printed_by_name TEXT,
  printed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_cash_book_prints_day ON cash_book_prints (branch_id, book, day, printed_at DESC);
`;
