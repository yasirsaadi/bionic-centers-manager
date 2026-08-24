/**
 * ٠٦٨ — **سلّةُ المرضى واستعادتُهم خلال ثلاثين يوماً**.
 *
 * **الحذفُ العاديّ لم يعد يهدم شيئاً.**
 *
 * ══ ما يفعله ═════════════════════════════════════════════════════════════
 * يضيف إلى `patients` حالةَ حذفٍ على مستوى **الملفّ** — ولا يمسّ صفّاً
 * تابعاً واحداً. فالمعايناتُ بأختامها وأوامرُ التصنيع بسجلّها والدفعاتُ
 * وقيودُ الكلف والفواتيرُ والمبالغُ المعلَّقة **تبقى كما هي بايتاً**، وتخرج
 * من النظام الفعّال لأن **صاحبَها** خرج لا لأنها تغيّرت.
 *
 * والاستعادةُ تُزيل هذه الحالةَ فحسب — فتعود الصفوفُ نفسُها بمعرّفاتها.
 * **لا نسخَ ولا استنساخَ ولا رمزَ مريضٍ جديد.**
 *
 * ══ ولا جدولَ أرشيفٍ ثانٍ ═══════════════════════════════════════════════
 * الصفوفُ الأصلية هي الحقيقة. وجدولٌ يُعيد بناءَ الملفّ يصير مصدرَ حقيقةٍ
 * ثانياً ينحرف عن الأوّل، ثمّ لا يُعرَف أيُّهما الصحيح.
 *
 * ══ واللقطةُ الماليةُ للتدقيق لا للحساب ═══════════════════════════════════
 * `deleted_*_snapshot` تجيب سؤالاً واحداً بعد شهور: **بماذا كان الملفُّ يوم
 * حُذف؟** والمالُ نفسُه يبقى في `payments` و`cost_entries` كما هو —
 * **فليست مصدرَ حقيقةٍ ماليّاً**، ولا يُحسَب منها تقرير.
 *
 * ══ ولا تاريخَ يُعاد تفسيرُه ════════════════════════════════════════════
 * كلُّ الأعمدة `NULL` على كلّ صفٍّ قائم — **ولا مريضَ واحدٌ يُوسَم محذوفاً**.
 * ولا `DEFAULT` يكتب معنىً على ملفٍّ لم يُحذف.
 *
 * ══ وسجلُّ الحذف والاستعادة في `audit_log` ═══════════════════════════════
 * جدولُ التدقيق القائم يحمل `entity_type` و`old_values` و`new_values`
 * والفاعلَ والوقت — وهو بالضبط ما يلزم لتكرار الحذف والاستعادة. **فلا
 * جدولَ تدقيقٍ ثانٍ يُخترَع** لما يسعه الأوّل.
 *
 * إضافيٌّ بالكامل، وقابلٌ للتشغيل مرّتين. بلا DROP ولا DELETE ولا TRUNCATE،
 * ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٦٧.
 */
export const name = "068_patient_trash";

export const sql = `
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS deleted_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id    INTEGER,
  -- لقطةُ اسمِ مَن حذف — **لا join**: الحسابُ قد يُعاد تسميتُه أو يُحذف،
  -- ويبقى السجلُّ مقروءاً. نفسُ درس «doctor_name» على المعاينة (٠٢٨).
  ADD COLUMN IF NOT EXISTS deleted_by_name       TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by_role       TEXT,
  ADD COLUMN IF NOT EXISTS deleted_reason        TEXT,
  -- **يُولّده الخادمُ من ختم الحذف** — لا يُقبل من العميل ولا من ساعته.
  ADD COLUMN IF NOT EXISTS restore_until         TIMESTAMPTZ,
  -- **لقطةٌ للتدقيق والعرض وحدها** — انظر الرأس.
  ADD COLUMN IF NOT EXISTS deleted_total_cost    INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_total_paid    INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_remaining     INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_pending_json  JSONB,
  -- هل لزم المسؤولُ العام لهذا الحذف؟ يُقرأ في السلّة بلا إعادة حساب.
  ADD COLUMN IF NOT EXISTS deleted_needed_admin  BOOLEAN;

COMMENT ON COLUMN patients.deleted_at IS
  'حالة حذف على مستوى الملف. NULL = مريض فعال. ولا صف تابع يمس — الصفوف تخرج من النظام الفعال لان صاحبها خرج.';
COMMENT ON COLUMN patients.restore_until IS
  'نهاية مدة الاستعادة (30 يوما). يولده الخادم من ختم الحذف، ويقارن بـNOW() في القاعدة لا بساعة المتصفح.';
COMMENT ON COLUMN patients.deleted_remaining IS
  'لقطة الرصيد المعتمد يوم الحذف (الكلفة ناقص المدفوع). للتدقيق والعرض — وليست مصدر حقيقة مالي.';

DO $$
BEGIN
  --  ══ **ولا بياناتِ حذفٍ نصفَ مكتوبة** ═══════════════════════════════
  --  صفٌّ محذوفٌ بلا سببٍ أو بلا مهلةِ استعادة يجعل السلّة تعرض فراغاً
  --  ويجعل الاستعادةَ بلا حدّ. والقاعدةُ تمنع الحالةَ المستحيلة من الوجود.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_deleted_shape_check') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_deleted_shape_check
      CHECK (deleted_at IS NULL
             OR (COALESCE(BTRIM(deleted_reason), '') <> ''
                 AND restore_until IS NOT NULL
                 AND restore_until > deleted_at));
  END IF;

  --  وعكسُها: لا مهلةَ استعادةٍ على ملفٍّ فعّال.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_active_clean_check') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_active_clean_check
      CHECK (deleted_at IS NOT NULL
             OR (restore_until IS NULL AND deleted_reason IS NULL
                 AND deleted_by_user_id IS NULL AND deleted_by_name IS NULL));
  END IF;
END $$;

--  ══ **فهرسُ الفعّالين — الجزئيّ هو المهمّ** ═══════════════════════════════
--  كلُّ قارئٍ تشغيليّ يصفّي «غير محذوف»، وهم السوادُ الأعظم. والفهرسُ
--  الجزئيّ يخدم ذلك بلا أن يثقله المحذوفون.
CREATE INDEX IF NOT EXISTS ix_patients_active_branch
  ON patients (branch_id, created_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

--  وفهرسُ السلّة: الأحدثُ حذفاً أوّلاً، ضمن الفرع.
CREATE INDEX IF NOT EXISTS ix_patients_trash
  ON patients (deleted_at DESC NULLS LAST)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_patients_trash_branch
  ON patients (branch_id, deleted_at DESC NULLS LAST)
  WHERE deleted_at IS NOT NULL;

--  ومهلةُ الاستعادة: لقراءة «ما زال قابلاً للاستعادة» و«انقضت مدّته».
CREATE INDEX IF NOT EXISTS ix_patients_restore_until
  ON patients (restore_until)
  WHERE deleted_at IS NOT NULL;
`;
