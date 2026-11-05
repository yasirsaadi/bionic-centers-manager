// Migration 191: «طلب استرجاع مبلغ لمريض» (§4.fz — ٢٠٢٦-١١-٠٥).
//
// طلبُ المالك: «اجعل في لوحة التحكم خياراً أضيفه لمن أريد فيصير قادراً على الاسترجاع — باعتمادي طبعاً»، و«آليةُ استرجاعٍ كاملة … عالمية».
//  • `system_users.can_request_refund` — مُطفأٌ لكلّ حسابٍ قائم، يشعله المسؤولُ من نافذة المستخدم (بسطر تدقيق، §4.ap).
//  • `patient_refund_requests` — الطلبُ وقرارُه، ودفعةُ الاسترجاع السالبة التي يكتبها الاعتماد (`payment_id`)، ورقمُه رقمُ السند.
//    و`deduct_hospital` قرارُ المسؤول في ذي قار: أيُخصم عُشرُ المسترجَع من نسبة مستشفى العين (§4.fz).
//    و`reduce_cost` قرارُه الثاني: أتنقص كلفةُ الحالة بالمبلغ نفسِه (فلا يُعدّ المريضُ مديناً بما استُرجع)، وقبلها وبعدها للعلم.
//  • تنبيهُ «طلب استرجاع ينتظر القرار» يُفعَّل للمسؤولين النشطين.
export const name = "191_patient_refund_requests";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_request_refund BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS patient_refund_requests (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  case_id INTEGER NOT NULL,
  case_type TEXT NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL,
  detail TEXT NOT NULL,
  net_paid_at_request INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  deduct_hospital BOOLEAN,
  reduce_cost BOOLEAN,
  cost_before INTEGER,
  cost_after INTEGER,
  payment_id INTEGER
);
CREATE INDEX IF NOT EXISTS ix_prr_status ON patient_refund_requests (status, branch_id);
CREATE INDEX IF NOT EXISTS ix_prr_patient ON patient_refund_requests (patient_id);
CREATE INDEX IF NOT EXISTS ix_prr_payment ON patient_refund_requests (payment_id) WHERE payment_id IS NOT NULL;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'refund_request_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND u.role = 'admin'
ON CONFLICT DO NOTHING;
`;
