// Migration 189: «طلب سحب من القاصات» (§4.fy — ٢٠٢٦-١١-٠٣).
//
// طلبُ المالك: «السحبُ من قاصة المواد ومن قاصة الرواتب محصورٌ بي كمسؤول عام. أريد ميزةً أفعّلها من لوحة التحكم لمن أريد،
// بشرط أنّ مَن يملكها يسحب نعم، ولكن يأتيني اعتمادٌ مشابهٌ لاعتماد التصحيح أوافق عليه أوّلاً ثمّ ينفَّذ».
//  • `system_users.can_request_reserve_withdrawal` — مُطفأٌ لكلّ حسابٍ قائم، يشعله المسؤولُ من نافذة المستخدم (بسطر تدقيق، §4.ap).
//  • `reserve_withdrawal_requests` — الطلبُ وقرارُه، وطلبٌ معلَّقٌ واحد لكلّ (فرع، دفتر، قاصة).
//  • تنبيهُ «طلب سحب ينتظر القرار» يُفعَّل للمسؤولين النشطين — ما كان المالكُ سيضغطه في «تنبيهات الموظفين».
export const name = "189_reserve_withdrawal_requests";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_request_reserve_withdrawal BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS reserve_withdrawal_requests (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  book TEXT NOT NULL,
  reserve TEXT NOT NULL CHECK (reserve IN ('materials', 'payroll')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,
  balance_at_request INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  entry_id INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rwr_one_pending ON reserve_withdrawal_requests (branch_id, book, reserve) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_rwr_status ON reserve_withdrawal_requests (status, branch_id);

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'reserve_withdrawal_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND u.role = 'admin'
ON CONFLICT DO NOTHING;
`;
