// إلغاءُ معاينةٍ موقّعة — **شاهدةُ قبرٍ تُضاف، لا سجلٌّ يُمحى**.
//
// ══ لماذا لا حذف ═══════════════════════════════════════════════════════
// `medical_exams` سجلٌّ سريريٌّ مختوم منذ ٠٢٨: ترِكرُ `BEFORE UPDATE` يرفض
// أيّ تعديلٍ لم يفتح البابَ المراقَب، وترِكرُ `BEFORE DELETE` يصوّر أيَّ صفٍّ
// يُمحى في جدولٍ جنائي، **ولا نقطةَ REST للحذف إطلاقاً**. وهذا كلُّه مقصود:
// المعاينةُ توقيعُ طبيبٍ باسمه، ومحوُها محوٌ لشهادةٍ لا لبيان.
//
// لكنّ الموظّفَ يحتاج فعلاً عملياً حقيقياً: معاينةٌ كُتبت **للمريض الخطأ**،
// أو على **اختصاصٍ غير صحيح**. وقبل اليوم لم يكن له إلّا أن يترك الخطأ
// قائماً — فيقرأ الخبيرُ مواصفاتٍ لمريضٍ آخر، ويقف الجهازُ على سعرٍ خاطئ.
//
// فالحلُّ **إضافيٌّ لا هدميّ**: صفٌّ في هذا الجدول يقول «هذه المعاينة
// أُلغيت، ومَن ألغاها، ومتى، ولماذا». والمعاينةُ الأصلية ونسخُها وملاحقُها
// وتوقيعُ الطبيب وأختامُه الزمنية **تبقى كلُّها كما هي بايتاً بايت**.
// والقارئُ التشغيليّ يتجاهلها، والمدقّقُ يراها كاملةً.
//
// ══ ولماذا حالةُ متابعةٍ جديدة ══════════════════════════════════════════
// توقيعُ معاينةِ جهازٍ يُنشئ **متابعةً** تلقائياً. وإلغاءُ المعاينة يجب أن
// يُنهيها — لكنّ الحالةَ المتاحة الوحيدة كانت `closed_without_purchase`،
// ومعناها المعروض «**مغلق بدون شراء**». وهذا **كذبٌ في السجلّ**: المريضُ
// لم يرفض الشراء، بل أُلغيت المعاينةُ التي وُلدت عنها المتابعة.
//
// فحالةٌ طرفيّةٌ ثالثة: `closed_exam_cancelled`. والقيدُ يُوسَّع لا يُستبدَل،
// **وفهرسا التفرّد يُوسَّعان معها** — وإلّا بقيت المتابعةُ المتقاعدة تُحسَب
// «حيّة» فتمنع المعاينةَ المصحَّحة من إنشاء متابعتها. وهذا بالضبط ما يجعل
// التصحيحَ ممكناً بدل أن يقفل الملفَّ إلى الأبد.

export const name = "061_exam_cancellation";

export const sql = `
-- ══ شاهدةُ الإلغاء ══════════════════════════════════════════════════════
--  exam_id فريدٌ: معاينةٌ لا تُلغى مرّتين، والسباقُ يحسمه صفُّ القاعدة.
--  وON DELETE CASCADE **الوحيدُ المسموح**: حذفُ المريض الكامل يمرّ عبر
--  storage.deletePatient، وهو يحذف medical_exams — فلولا الكاسكيد
--  لانكسر حذفُ المريض على كلّ مَن له معاينةٌ ملغاة.
CREATE TABLE IF NOT EXISTS medical_exam_cancellations (
  id                SERIAL PRIMARY KEY,
  exam_id           INTEGER NOT NULL UNIQUE
                      REFERENCES medical_exams(id) ON DELETE CASCADE,
  patient_id        INTEGER NOT NULL REFERENCES patients(id),
  branch_id         INTEGER REFERENCES branches(id),
  cancelled_by      INTEGER REFERENCES system_users(id),
  --  لقطةُ الاسم: حسابٌ يُحذف يترك رقماً لا يُفسَّر، والاسمُ يبقى مقروءاً.
  cancelled_by_name TEXT,
  reason            TEXT NOT NULL,
  cancelled_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

--  السببُ ليس زينةً: بطاقةٌ تقول «أُلغيت» بلا سبب لا تُخبر مَن يقرأ
--  السجلَّ بعد شهرٍ لماذا اختفت معاينةُ مريضه.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'medical_exam_cancellations_reason_check'
  ) THEN
    ALTER TABLE medical_exam_cancellations
      ADD CONSTRAINT medical_exam_cancellations_reason_check
      CHECK (length(btrim(reason)) > 0);
  END IF;
END $$;

--  القراءةُ الأكثر تكراراً: «هل هذه المعاينة ملغاة؟» ثم «ملغيّاتُ مريض».
CREATE INDEX IF NOT EXISTS ix_mec_patient ON medical_exam_cancellations (patient_id);

-- ══ حالةٌ طرفيّةٌ ثالثة للمتابعة ═════════════════════════════════════════
--  **يُوسَّع القيدُ ولا يُستبدَل معناه**: الحالتان القديمتان تعنيان ما
--  كانتا تعنيانه، والثالثة تقول سببَها الحقيقي.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_status_check'
       AND pg_get_constraintdef(oid) NOT LIKE '%closed_exam_cancelled%'
  ) THEN
    ALTER TABLE post_exam_followups DROP CONSTRAINT post_exam_followups_status_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_exam_followups_status_check'
  ) THEN
    ALTER TABLE post_exam_followups
      ADD CONSTRAINT post_exam_followups_status_check
      CHECK (status IN (
        'awaiting_patient_decision', 'follow_up', 'price_approval_pending',
        'price_approved_waiting_patient', 'purchase_approval_pending',
        'closed_without_purchase', 'converted', 'closed_exam_cancelled'));
  END IF;
END $$;

-- ══ وفهرسا «المتابعة الحيّة الواحدة» يعرفان الطرفيّةَ الثالثة ═══════════
--  **بدون هذا التوسيع يفشل التصحيحُ كلُّه**: المتابعةُ المتقاعدة تبقى
--  محسوبةً حيّة، فتردّ القاعدةُ متابعةَ المعاينة المصحَّحة بـ٢٣٥٠٥ ويبقى
--  الملفُّ مقفلاً إلى الأبد. والفهرسُ يُسقَط ويُعاد — لا IF NOT EXISTS
--  وحدها، لأن الموجودَ بصيغته القديمة لا يُرقّى بها.
DROP INDEX IF EXISTS uq_pef_active_episode;
CREATE UNIQUE INDEX uq_pef_active_episode
  ON post_exam_followups (device_episode_id)
  WHERE device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted', 'closed_exam_cancelled');

DROP INDEX IF EXISTS uq_pef_active_legacy;
CREATE UNIQUE INDEX uq_pef_active_legacy
  ON post_exam_followups (patient_id, service_type)
  WHERE device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted', 'closed_exam_cancelled');
`;
