// **قاصةُ المواد وقاصةُ الرواتب والإيجار بدل «نسبة الدكتور»** (قرارُ المالك ٢٠٢٦-١٠-١١، §4.dj).
//
// من يوم ٢٠٢٦-١٠-١١ لا تُعزَل نسبةُ الدكتور من وارد اليوم (القطعُ في `shared/cash_book.ts` — `RESERVES_START`)، وبدلها بابا صرف:
// «أجور مواد» و«رواتب وإيجار» — مصروفٌ عاديّ في `expenses` يكتبه المحاسب، ومجموعُه يتراكم في قاصته لكلّ دفتر، ويسحب منها المالكُ وحده.
//
// • **سحبُ المالك سطرٌ في جدول الدفتر** بنوعين جديدين (`materials_withdrawn` · `payroll_withdrawn`) — ليس مصروفاً ولا يمسّ نقدَ اليوم:
//   المالُ خرج من القاصة يومَ كُتب مصروفاً. فيُوسَّع قيدُ النوع وحده.
// • **ورصيدُ البداية والهدفُ الشهريّ** صفٌّ لكلّ فرعٍ ودفترٍ وقاصة، يضعه المالكُ وحده. والبدايةُ صفرٌ بلا صفّ.
// إضافيّ، idempotent، بلا مفتاحٍ إلى `patients` (فلا يمسّ كاسكيدَ حذف المريض)، وبلا لمسِ صفٍّ قائم.

export const name = "127_cash_book_reserves";

export const sql = `
ALTER TABLE cash_book_entries DROP CONSTRAINT IF EXISTS cash_book_entries_kind_check;
ALTER TABLE cash_book_entries ADD CONSTRAINT cash_book_entries_kind_check
  CHECK (kind IN ('income_other', 'dr_transfer', 'dr_ratio', 'ratio_received', 'materials_withdrawn', 'payroll_withdrawn'));

CREATE TABLE IF NOT EXISTS cash_book_reserves (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  book TEXT NOT NULL CHECK (book IN ('devices', 'physio')),
  reserve TEXT NOT NULL CHECK (reserve IN ('materials', 'payroll')),
  opening_balance INTEGER NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  monthly_target INTEGER CHECK (monthly_target IS NULL OR monthly_target > 0),
  created_by INTEGER REFERENCES system_users(id),
  updated_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, book, reserve)
);
`;
