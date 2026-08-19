/**
 * Migration 058 — الخصمُ والتبرّع: طلبٌ واحدٌ للأقسام الثلاثة
 *
 * ══ لماذا جدولٌ واحد لا ثلاثة ═══════════════════════════════════════════
 * الطرفُ والمسندُ والعلاجُ الطبيعي تُسعَّر في ثلاث شاشات، لكنّ سؤالَ «بكم
 * نبيع ومَن يأذن بالتخفيض» واحدٌ فيها جميعاً. وثلاثةُ جداولِ خصمٍ كانت
 * ستعني ثلاثَ قواعدِ اعتماد تنحرف إحداها يوماً، وثلاثةَ طوابيرَ يقرؤها
 * المدير، وثلاثةَ تعاريفَ لـ«مجّاني».
 *
 * ══ وليس دفتراً مالياً ثانياً ═══════════════════════════════════════════
 * **هذا جدولُ إذنٍ وتدقيق لا جدولُ مال.** لا يحمل رصيداً ولا يُجمَع منه
 * إيراد. وحين يُعتمد الطلبُ **يُنادى المسارُ القائم نفسه** — `confirmPurchase`
 * للأجهزة و`pricePhysiotherapy` للعلاج الطبيعي — فيكتب المالَ حيث كان
 * يكتبه دائماً: `patients.total_cost` و`patient_cases.cost` و`cost_entries`.
 * والسعرُ المعتمد هنا هو **الرقمُ الذي يُمرَّر** إلى ذلك المسار، لا أكثر.
 *
 * ══ والمجّانيُّ صريحٌ لا مستنتَج — وهذا لبُّ الترحيل ═════════════════════
 * الصفرُ في هذا النظام **يعني اليوم «غير مسعَّر»**: مريضٌ وقّع الطبيبُ
 * معاينته بلا كلفة يحمل صفراً وهو ليس متبرَّعاً له. فلو قُرئ الصفرُ
 * مجّانياً لصار كلُّ ملفٍّ لم يُسعَّر «تبرّعاً» في التقرير.
 *
 * فالقيدُ أدناه يجعل المعادلة بنيويةً لا نيّة:
 *   `is_free` صحيحٌ  ⟺  السعرُ النهائي صفر
 * وصفٌّ يزعم مجّانيةً بسعرٍ موجب — أو صفراً بلا علمِ مجّانية — **لا يمكن أن
 * يوجد**، ولو أدرجه نداءٌ مباشر من محرّر SQL.
 *
 * ══ وطلبٌ معلَّقٌ واحدٌ لكل خدمة ═════════════════════════════════════════
 * فهرسٌ فريدٌ جزئي على (مريض، قسم، مرجع) للمعلَّق وحده: فلا يعتمد مديران
 * طلبين متناقضين على الخدمة نفسها، ولا يُنشئ الموظّف طابوراً من محاولاته.
 *
 * ══ وعَلَمُ الاعتماد على الحساب ═════════════════════════════════════════
 * `can_approve_discount` — لأن الخصمَ قرارٌ **مالي** لا سريري، فلا يُمنَح
 * لكلّ من دورُه «طبيب». مَن أراد تخويلَ طبيبٍ بعينه يرفع له العَلَم:
 * قراراً مكتوباً على حسابه لا استنتاجاً من دوره.
 *
 * idempotent: `IF NOT EXISTS` في الجدول والعمود والفهارس، وفحصُ
 * `pg_constraint` في القيود.
 */

export const name = "058_service_discounts";

export const sql = `
CREATE TABLE IF NOT EXISTS service_discount_requests (
  id                   SERIAL PRIMARY KEY,

  patient_id           INTEGER NOT NULL REFERENCES patients(id),
  -- لقطةُ رقمٍ بلا مفتاح أجنبي: الحالة قد تُسحَب أو تُدمَج، والطلبُ يبقى
  -- مقروءاً. نفس درس doctor_id في المعاينة.
  case_id              INTEGER,
  branch_id            INTEGER,

  -- القسم: أطراف · مساند · علاج طبيعي. واحدٌ من الثلاثة لا رابعَ لها.
  department           TEXT NOT NULL,
  -- مرجعُ السياق: متابعةٌ بعينها، أو تسعيرُ علاجٍ طبيعي. يُقرأ عند الاستئناف.
  context_ref          TEXT,

  original_price       INTEGER NOT NULL,
  proposed_final_price INTEGER NOT NULL,
  discount_amount      INTEGER NOT NULL,
  discount_percentage  NUMERIC(5,2) NOT NULL,
  is_free              BOOLEAN NOT NULL DEFAULT FALSE,

  reason               TEXT NOT NULL,
  note                 TEXT,

  status               TEXT NOT NULL DEFAULT 'pending',

  -- **أقلُّ ما يلزم لاستئناف العملية القائمة** — لا نسخةٌ من الخدمة.
  -- الخبيرُ وأعدادُ الجلسات ونوعُ العلاج: ما يضيع لو طُلب من الموظّف أن
  -- يعيد إدخاله بعد الاعتماد.
  payload              JSONB NOT NULL DEFAULT '{}'::jsonb,

  requested_by         INTEGER,
  requested_by_name    TEXT,
  requested_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  decided_by           INTEGER,
  decided_by_name      TEXT,
  decided_at           TIMESTAMPTZ,
  decision_note        TEXT,
  -- السعرُ الذي اعتُمد فعلاً — قد يخالف المقترح في «تعديل واعتماد».
  approved_final_price INTEGER,
  -- لحظةُ تنفيذ العملية القائمة. **حارسُ الاعتماد المزدوج**: صفٌّ نُفِّذ
  -- لا يُنفَّذ ثانية، فلا يُنشأ أمرا تصنيعٍ لبيعٍ واحد.
  applied_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_sdr_branch_status
  ON service_discount_requests (branch_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS ix_sdr_patient
  ON service_discount_requests (patient_id);

-- **طلبٌ معلَّقٌ واحدٌ لكل (مريض، قسم، مرجع)** — حارسٌ بنيويّ لا قاعدةٌ في
-- الشيفرة: ضغطتان متزامنتان تُنتجان صفّاً واحداً لأن الثانية تصطدم به.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sdr_one_pending
  ON service_discount_requests (patient_id, department, COALESCE(context_ref, ''))
  WHERE status = 'pending';

DO $s1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_discount_requests_department_check'
       AND conrelid = 'service_discount_requests'::regclass
  ) THEN
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_department_check
      CHECK (department IN ('prosthetic', 'medical_support', 'physiotherapy'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_discount_requests_status_check'
       AND conrelid = 'service_discount_requests'::regclass
  ) THEN
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled'));
  END IF;
END
$s1$;

-- **صفٌّ لا يستطيع أن يكذب.**
--
-- • السعرُ الأصلي موجب — صفرٌ يعني «غير مسعَّر» فلا يُخصَم منه.
-- • والنهائيُّ بين الصفر والأصلي — هذا بابُ خصمٍ لا بابُ رفعِ سعر.
-- • والخصمُ موجبٌ ومطابقٌ للفرق — فلا ينحرف رقمٌ مخزَّن عن مصدره.
-- • **والمجّانيُّ صفرٌ والصفرُ مجّانيّ** — تكافؤٌ تامّ. فلا صفٌّ يزعم
--   مجّانيةً بسعرٍ موجب، ولا صفرٌ يتسلّل بلا علمِ مجّانيةٍ صريح.
DO $s2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_discount_requests_shape_check'
       AND conrelid = 'service_discount_requests'::regclass
  ) THEN
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_shape_check
      CHECK (
        original_price > 0
        AND proposed_final_price >= 0
        AND proposed_final_price <= original_price
        AND discount_amount > 0
        AND discount_amount = original_price - proposed_final_price
        AND (is_free = (proposed_final_price = 0))
      );
  END IF;

  -- والسعرُ المعتمد يخضع للحدود نفسها حين يوجد.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_discount_requests_approved_check'
       AND conrelid = 'service_discount_requests'::regclass
  ) THEN
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_approved_check
      CHECK (
        approved_final_price IS NULL
        OR (approved_final_price >= 0 AND approved_final_price <= original_price)
      );
  END IF;

  -- **و«معتمَد» يعني «نُفِّذ» — بنيوياً لا اصطلاحاً.**
  --
  -- صفٌّ معتمَدٌ بلا لحظةِ تنفيذ كان يعني: قرارٌ اتُّخذ وخدمةٌ لم تقع،
  -- وقد **خرج من الطابور** فلا يراه أحدٌ ولا يُستأنف. فالقيدُ يجعله
  -- مستحيلاً: الحسمُ والتنفيذُ والختم في معاملةٍ واحدة، ومن كتب غيرَ ذلك
  -- — ولو من محرّر SQL — رُدّ.
  --
  -- والفحصُ بالنصّ لا بالاسم: قاعدةٌ تحمل الصيغةَ الأقدم (بلا شرط لحظةِ
  -- التنفيذ) **تتقارب** إلى هذه، فلا تُترك أضيقَ لأن الاسم موجود.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'service_discount_requests_decision_check'
       AND conrelid = 'service_discount_requests'::regclass
       AND pg_get_constraintdef(oid) LIKE '%applied_at IS NOT NULL%'
  ) THEN
    ALTER TABLE service_discount_requests
      DROP CONSTRAINT IF EXISTS service_discount_requests_decision_check;
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_decision_check
      CHECK (
        status <> 'approved'
        OR (approved_final_price IS NOT NULL AND decided_at IS NOT NULL
            AND applied_at IS NOT NULL)
      );
  END IF;
END
$s2$;

-- عَلَمُ اعتماد الخصم على الحساب — قرارٌ مكتوب لا استنتاجٌ من الدور.
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_approve_discount BOOLEAN DEFAULT FALSE;
`;
