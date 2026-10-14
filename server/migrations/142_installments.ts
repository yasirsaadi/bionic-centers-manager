// Migration 142: نظامُ الأقساط (قرارُ المالك ٢٠٢٦-١٠-١٤، §4.ea).
//
// «بعض المرضى يدفعون أقساطاً — مؤشّرٌ عند الدفع: هل هذا المريض أقساط؟ إن أُشّر تُفتح خاناتُ قيمة الدفع الشهري وتاريخِ ووقتِ التذكير».
// وقراراتُه: التذكيرُ للاستقبال ومدير الفرع والمريض، قبل الموعد بيوم وفي يومه بالساعة المختارة؛ يفتح الخطّةَ مَن يسجّل الدفعة، ويعدّلها
// ويلغيها المسؤولُ ومديرُ الفرع وحدهما بسطر تدقيق؛ والكفيلُ اختياريّ.
//
//   • `installment_plans` موجودٌ منذ البداية بنقاطٍ للمسؤول ولا شاشةَ تستعمله — **يُوسَّع لا يُستبدَل**: القسمُ (`case_id`)، والدفعةُ التي فتحت
//     الخطّة (`opening_payment_id` — ما بعدها يُحسب على الأقساط)، وساعةُ التذكير، والكفيل، ومَن فتح ومتى عُدّل أو أُلغي أو اكتمل.
//     وخطّةٌ نشطةٌ واحدة لكلّ قسم (فهرسٌ جزئيّ). والصفوفُ القديمة بلا قسم (إن وُجدت) لا يمسّها شيءٌ جديد.
//   • `installment_reminders` — سجلُّ ما أُرسل: (خطّة، قسط، قبل/في يومه) مرّةً واحدة، فدورتان متزامنتان لا ترسلان مرّتين.
//     ويُحذف بحذف خطّته (`ON DELETE CASCADE`)، والخطّةُ في كاسكيد حذف المريض أصلاً.
//   • **فهرسُ رسائل الربط** في طابور رسائل المريض (ترحيل ٠٤٨) كان يقبل رسالةً واحدة من كلّ نوعٍ لكلّ جهة حين لا حدثَ لها — فيصل أوّلُ تذكيرٍ
//     ويُردّ ما بعده صامتاً. فيُستثنى نوعُ التذكير منه؛ وتكرارُه محروسٌ بسجلّ التذكيرات أعلاه.
//   • **ونوعُ «قسطٌ مستحقّ» يُفعَّل للاستقبال ومدراء الفروع النشطين** (قرارُ المالك: التذكيرُ لهم) — والمسؤولُ يطفئه لمن شاء من «تنبيهات الموظفين».
export const name = "142_installments";
export const sql = `
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS case_id integer REFERENCES patient_cases(id);
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS opening_payment_id integer;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '10:00';
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS guarantor_name text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS guarantor_phone text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS created_by_user_id integer;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS updated_at timestamptz;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS updated_by_name text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS cancelled_by_name text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS cancel_reason text;
ALTER TABLE installment_plans ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS uq_installment_active_case
  ON installment_plans (case_id) WHERE status = 'active' AND case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_installment_plans_patient ON installment_plans (patient_id);

CREATE TABLE IF NOT EXISTS installment_reminders (
  plan_id integer NOT NULL REFERENCES installment_plans(id) ON DELETE CASCADE,
  due_index integer NOT NULL,
  kind text NOT NULL CHECK (kind IN ('before', 'due')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, due_index, kind)
);

DROP INDEX IF EXISTS uq_pnd_contact_link_type;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pnd_contact_link_type
  ON patient_notification_deliveries (patient_contact_id, notification_type)
  WHERE patient_event_id IS NULL AND notification_type <> 'installment_due';

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT id, 'installment_due' FROM system_users
 WHERE is_active = true AND (role IN ('reception', 'branch_manager') OR extra_roles ?| array['reception', 'branch_manager'])
ON CONFLICT DO NOTHING;
`;
