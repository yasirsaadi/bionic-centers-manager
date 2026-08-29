// طلباتُ التصحيح الماليّ — «تحكّمٌ في تصحيح الدفعات: احمِ المال، لا الجلسات
// التشغيلية» (2026-08-29).
//
// ══ لماذا ═══════════════════════════════════════════════════════════════
// المالكُ أراد سلطةً على **الحقيقة الماليةِ المحفوظة**، بلا أن يتحوّل ذلك
// إلى طابور اعتمادٍ حول جلسات العلاج الطبيعي التشغيلية. فانقسمت حقولُ
// الدفعة إلى **محمية** (المبلغ، التاريخُ الماليّ، نوعُ العلاج المدفوع،
// علمُ «جلسات مجانية»، والحذف) تحتاج تصحيحاً موثَّقاً، و**مباشرة**
// (الملاحظات، عددُ الجلسات) تبقى فوريةً كما كانت — لا تفتح طلباً ولا تُعيد
// بناء القيد.
//
// ══ الشكل — على نمط `price_change_requests` (ترحيل ٠٥٣) حرفياً ═════════
// طابورُ طلبٍ/قرارٍ مألوفٌ في هذا المشروع: `target_type`/`target_id` بدل
// `followup_id` وحدها لأن هذا الطابور **مصمَّمٌ ليتّسع لاحقاً** لأهدافَ
// غير الدفعة (اليوم: `payment` فقط) دون ترحيلٍ ثانٍ يبدّل الشكل.
//
// ══ بلا مفتاحٍ أجنبيّ على `target_id` — والدرسُ نفسُه من `payments.visit_id`
// (٠٣٨) و`proposed_expert_user_id` (٠٣٥) ═══════════════════════════════
// الاعتمادُ **يحذف** الدفعة أحياناً (تصحيحُ حذف)، فسجلُّ الطلب يجب أن يبقى
// مقروءاً بعدها — و`ON DELETE CASCADE` كان سيمحو تاريخ الطلب نفسه لحظةَ
// تنفيذه، و`ON DELETE SET NULL`/`NO ACTION` بلا فائدة إضافية هنا. فالعمودُ
// لقطةُ رقمٍ لا مفتاح.
//
// ══ `patient_id` مفتاحٌ حقيقيّ — والقاعدةُ الملزمة في CLAUDE.md ═════════
// هذا خلاف `target_id`: `patient_id` يُقرأ من صفّ الدفعة وقت الطلب ويبقى
// صحيحاً طوال حياة الطلب، فهو مفتاحٌ حقيقيّ إلى `patients` — **ويجب** إذن
// إضافتُه إلى كاسكيد `storage.deletePatient` (وقد أُضيف).
//
// ══ فهرسُ التفرّد الجزئي — طلبٌ معلَّقٌ واحد لكل هدف ═══════════════════
// نفسُ حارس `uq_pcr_one_pending` في ٠٥٣: لا طلبان معلَّقان على الدفعة
// نفسها معاً، فلا يعتمد مسؤولٌ طلباً بينما آخر لا يزال معلَّقاً على نفس
// الرقم بقيمةٍ متعارضة.
//
// ══ إضافيّ، idempotent، بلا DROP ولا DELETE ═════════════════════════════
// جدولٌ جديدٌ بالكامل — لا مسّ لأيّ ترحيلٍ من ٠٠١ إلى ٠٧٠.

export const name = "071_financial_correction_requests";

export const sql = `
CREATE TABLE IF NOT EXISTS financial_correction_requests (
  id SERIAL PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  action TEXT NOT NULL,
  before_snapshot JSONB NOT NULL,
  requested_patch JSONB,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_role TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  applied_at TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_correction_requests_target_type_check'
  ) THEN
    ALTER TABLE financial_correction_requests
      ADD CONSTRAINT financial_correction_requests_target_type_check
      CHECK (target_type IN ('payment'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_correction_requests_action_check'
  ) THEN
    ALTER TABLE financial_correction_requests
      ADD CONSTRAINT financial_correction_requests_action_check
      CHECK (action IN ('update', 'delete'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_correction_requests_status_check'
  ) THEN
    ALTER TABLE financial_correction_requests
      ADD CONSTRAINT financial_correction_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'financial_correction_requests_reason_check'
  ) THEN
    ALTER TABLE financial_correction_requests
      ADD CONSTRAINT financial_correction_requests_reason_check
      CHECK (length(trim(reason)) > 0);
  END IF;
END $$;

-- طلبٌ معلَّقٌ واحد لكل هدف — نفسُ حارس ٠٥٣ (uq_pcr_one_pending).
CREATE UNIQUE INDEX IF NOT EXISTS uq_fcr_one_pending_per_target
  ON financial_correction_requests (target_type, target_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_fcr_pending ON financial_correction_requests (status);
CREATE INDEX IF NOT EXISTS ix_fcr_patient ON financial_correction_requests (patient_id);
CREATE INDEX IF NOT EXISTS ix_fcr_branch ON financial_correction_requests (branch_id, status);
CREATE INDEX IF NOT EXISTS ix_fcr_requester ON financial_correction_requests (requested_by);
`;
