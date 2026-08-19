/**
 * Migration 057 — القرارُ التجاري للفرع، وإشارةُ التسليم من الطبيب
 *
 * **ثلاثةُ أعمدةٍ تُضاف وقيمةٌ تُتاح.** لا جدولَ يُنشأ ولا صفَّ يُعدَّل ولا
 * قيمةَ تُخمَّن بأثرٍ رجعي.
 *
 * ══ القاعدةُ التي يخدمها ════════════════════════════════════════════════
 * **الطبيبُ يملك القرار السريري، والفرعُ يملك القرار التجاري.**
 *
 * كان تغييرُ السعر طلباً يُقدَّم ويُعتمَد: صفٌّ في `price_change_requests`،
 * وحالةٌ `price_approval_pending`، وطابورٌ ينتظر طبيباً. وثمنُه كان أن يقف
 * البيعُ على ضغطةٍ لا قرارَ سريرياً فيها. فصار قراراً مباشراً لمدير الفرع
 * يُكتب على الصفّ في اللحظة — ولا طلبَ جديد يُنشأ بعد اليوم.
 *
 * وهذا هو سببُ العمود الجديد في `price_source`: `manager_set` تعني «حدّده
 * مديرُ الفرع مباشرة». و`approved_change` **تبقى كما هي** لا تُعاد كتابتُها
 * ولا يُرحَّل صفٌّ واحد: تعني ما كانت تعنيه — اعتمادٌ حُسم بالمسار القديم.
 *
 * ══ ولماذا لا جدولَ لتاريخ الأسعار ══════════════════════════════════════
 * لأنه موجود. `post_exam_followup_events` يحمل كلَّ انتقالٍ منذ ٠٥٣، وحدثُ
 * `commercial_price_set` يحمل السعرين والفرقَ والنسبةَ والسببَ والفاعل
 * وزمنَه. وجدولٌ ثانٍ كان سيصير حقيقةً ماليةً موازية تنحرف عن الأولى يوماً.
 *
 * ══ وإشارةُ الطبيب عمودان لا حالة ══════════════════════════════════════
 * `purchase_interest_at` رايةٌ تُرفع على ملفٍّ **يبقى في حالته**. ولو كانت
 * حالةً لصار تركُها قراراً: ملفٌّ لا يحمل «يرغب بالشراء» يُقرأ «لا يرغب» —
 * وهو ما لا يقوله أحد. فالصمتُ يبقى صمتاً، والرايةُ وحدها تتكلّم.
 *
 * و`purchase_interest_by` **لقطةُ رقمٍ بلا مفتاح أجنبي**، ومعها الاسم:
 * حسابٌ يُحذف يترك رقماً لا يُفسَّر، والاسمُ يبقى مقروءاً. نفس درس
 * `medical_exams.doctor_name` و`proposed_expert_user_id` حرفياً.
 *
 * ══ idempotent — ومتقارِبٌ لا مجرّد آمنِ الإعادة ════════════════════════
 * الأعمدةُ بـIF NOT EXISTS. والقيدُ لا يعرفها، فيُفحص **بنصّه** لا بوجود
 * اسمه: قاعدةٌ تحمل صيغةً أقدم يُعاد بناؤه فيها، وقاعدةٌ تحمل الحالية لا
 * تُمَسّ. فالنتيجةُ واحدة مهما كان المُنطلَق.
 */

export const name = "057_commercial_price";

export const sql = `
ALTER TABLE post_exam_followups
  ADD COLUMN IF NOT EXISTS purchase_interest_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS purchase_interest_by INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_interest_by_name TEXT;

-- طابورُ الاستعلامات يُرتَّب بالرايات أوّلاً — فهرسٌ جزئيّ على المرفوعة وحدها.
CREATE INDEX IF NOT EXISTS ix_pef_purchase_interest
  ON post_exam_followups (purchase_interest_at)
  WHERE purchase_interest_at IS NOT NULL;

-- **مصدرُ السعر ثلاثةٌ لا اثنان.** قيدُ ترحيل ٠٥٣ يعرف قيمتين، فيُوسَّع هنا
-- بقيمةٍ ثالثة. والفحصُ بنصّه لا بوجوده — فالاسمُ واحدٌ والمضمونُ تغيّر.
-- ولا صفَّ يُعدَّل: القيمةُ الجديدة تُكتب من اليوم فصاعداً وحدها.
DO $c1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_price_source_check'
       AND conrelid = 'post_exam_followups'::regclass
       AND pg_get_constraintdef(oid) LIKE '%manager_set%'
  ) THEN
    ALTER TABLE post_exam_followups
      DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check;
    ALTER TABLE post_exam_followups
      ADD CONSTRAINT post_exam_followups_price_source_check
      CHECK (price_source IN ('exam', 'manager_set', 'approved_change'));
  END IF;
END
$c1$;

-- **والرايةُ لا تُرفع بلا صاحب.** عمودُ الزمن وعمودُ الفاعل يمتلئان معاً أو
-- يبقيان فارغين معاً: رايةٌ بلا مَن رفعها سطرٌ لا يُسأل عنه أحد، وفاعلٌ بلا
-- زمنٍ لا يدخل الطابور أصلاً.
DO $c2$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_purchase_interest_check'
       AND conrelid = 'post_exam_followups'::regclass
  ) THEN
    ALTER TABLE post_exam_followups
      ADD CONSTRAINT post_exam_followups_purchase_interest_check
      CHECK (
        (purchase_interest_at IS NULL AND purchase_interest_by IS NULL)
        OR (purchase_interest_at IS NOT NULL AND purchase_interest_by IS NOT NULL)
      );
  END IF;
END
$c2$;
`;
