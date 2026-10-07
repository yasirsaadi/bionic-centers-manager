// **طلبُ تصحيح المال يعتمده المسؤول** (قرارُ المالك ٢٠٢٦-١٠-٠٧، §4.ce): «الأفضل يكون لي وحدي، أو بطلب تعديلٍ أوافق عليه».
// تعديلُ المصروف وحذفُه — من صفحة المحاسبة أو من دفتر القاصة — وتعديلُ سطر الدفتر وحذفُه (وارد آخر، تحويل إلى قاصة الدكتور)
// للمسؤول وحده؛ وغيرُه يقدّم هنا طلباً بالقيمة الجديدة وسببها، فيعتمده المسؤول (فيُطبَّق) أو يرفضه.
// إضافيّ، idempotent، بلا مفتاحٍ إلى `patients`، و`target_id` لقطةُ رقمٍ بلا مفتاح أجنبي — الاعتمادُ قد يحذف الهدف
// (درسُ `financial_correction_requests` ٠٧١ نفسُه)، فيبقى الطلبُ مقروءاً بعده.

export const name = "102_money_correction_requests";

export const sql = `
CREATE TABLE IF NOT EXISTS money_correction_requests (
  id SERIAL PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('expense', 'cash_book_entry')),
  target_id INTEGER NOT NULL,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  action TEXT NOT NULL CHECK (action IN ('update', 'delete')),
  before_snapshot JSONB NOT NULL,
  requested_patch JSONB,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_mcr_one_pending_per_target ON money_correction_requests (target_type, target_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_mcr_status ON money_correction_requests (status, branch_id);
`;
