// Migration 192: «نسبة مستشفى العين» — العزلُ التلقائيّ وطلبُ التسليم (§4.fz — ٢٠٢٦-١١-٠٥).
//
// طلبُ المالك: «نستخرج نسبة ١٠٪ من كلّ إيراد ولا نحتاج زرّ النسبة، ونضيف مربّعاً اسمه نسبة المستشفى فيه زرّ تسليمٍ للمستشفى … والتسليمُ
// يُسجَّل في خلفية المربّع»، و«التسليمُ غالباً أسبوعيّ وأحياناً يوميّ … والأفضل يمرّ باعتمادي مع تلغرام».
//  • العزلُ نفسُه صفوفُ مصروفٍ قائمةٌ (`expenses.category = 'hospital_percentage'`) يكتبها الخادمُ — فلا جدولَ له.
//  • `hospital_ratio_deliveries` — طلبُ التسليم وقرارُه، ويومُ التسليم (`delivered_on`) يومُ الاعتماد. لا يمسّ القاصةَ ولا المصاريف:
//    المالُ خرج منها يومَ العزل.
//  • تنبيهُ «طلب تسليم للمستشفى ينتظر القرار» يُفعَّل للمسؤولين النشطين.
export const name = "192_hospital_ratio_deliveries";

export const sql = `
CREATE TABLE IF NOT EXISTS hospital_ratio_deliveries (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  note TEXT,
  remaining_at_request INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  delivered_on DATE
);
CREATE INDEX IF NOT EXISTS ix_hrd_status ON hospital_ratio_deliveries (status, branch_id);
CREATE INDEX IF NOT EXISTS ix_hrd_delivered ON hospital_ratio_deliveries (branch_id, delivered_on) WHERE status = 'approved';

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'hospital_delivery_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND u.role = 'admin'
ON CONFLICT DO NOTHING;
`;
