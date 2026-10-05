// **دفترُ القاصة اليوميّ** (قرارُ المالك ٢٠٢٦-١٠-٠٦، §4.ca) — نسخةٌ إلكترونية من ورقة الدفتر نفسِها.
//
// صفحةٌ لكلّ فرعٍ ودفترٍ ويوم: الوارد (دفعاتُ المرضى المسجّلة + «وارد آخر»)، والصادر (مصاريف · تحويل إلى قاصة الدكتور ·
// نسبة الدكتور · نسبة المستشفى · نسبة العتبة)، ومربّعا القاصة ونسبة العزل.
//
// • **المصاريفُ ونسبتا المستشفى والعتبة صفوفٌ في `expenses` نفسِها** — فتدخل تقاريرَ المحاسبة كما هي، ولا تُكتب مرّتين.
// • وهذا الجدولُ لما ليس مصروفاً: «وارد آخر» · التحويلُ إلى قاصة الدكتور · نسبةُ الدكتور · استلامُ النسبة.
// • والرصيدُ الافتتاحيّ لكلّ دفتر: من يومه يبدأ الحساب، فلا يُقرأ تاريخٌ لم تُسجَّل فيه التحويلات.
// إضافيّ، idempotent، بلا مفتاحٍ إلى `patients` (فلا يمسّ كاسكيدَ حذف المريض)، وبلا لمسِ صفٍّ قائم.

export const name = "098_cash_book";

export const sql = `
CREATE TABLE IF NOT EXISTS cash_book_entries (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  book TEXT NOT NULL CHECK (book IN ('devices', 'physio')),
  entry_date DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income_other', 'dr_transfer', 'dr_ratio', 'ratio_received')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  deleted_by INTEGER REFERENCES system_users(id)
);
CREATE INDEX IF NOT EXISTS ix_cash_book_entries_day ON cash_book_entries (branch_id, book, entry_date) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_book_dr_ratio_day ON cash_book_entries (branch_id, book, entry_date)
  WHERE kind = 'dr_ratio' AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS cash_book_openings (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  book TEXT NOT NULL CHECK (book IN ('devices', 'physio')),
  opening_date DATE NOT NULL,
  cash_balance INTEGER NOT NULL DEFAULT 0,
  ratio_balance INTEGER NOT NULL DEFAULT 0 CHECK (ratio_balance >= 0),
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, book)
);
`;
