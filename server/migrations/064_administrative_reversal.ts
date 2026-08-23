/**
 * Migration 064 — التصحيحُ الإداريّ لعمليةِ جهازٍ خاطئة
 *
 * ترحيلٌ **إضافيّ** — جدولٌ واحد، وعمودا وسمٍ، وتوسيعُ قيدٍ قائم. ولا حذفَ
 * عمودٍ ولا جدول ولا بيان، **ولا دينارَ يتحرّك**.
 *
 * ══ لماذا ══════════════════════════════════════════════════════════════
 * الخطأُ التشغيليّ يقع: يضغط الموظّفُ «تم الشراء» قبل أوانه، أو يفتح جهازاً
 * كاملاً لمريضٍ يريد قالباً. وقبل اليوم لم يكن للمالك بابٌ يصحّح به: إلغاءُ
 * المعاينة يُردّ لأن بيعاً وقع، وإلغاءُ الأمر لا يعكس مالاً — **فيبقى
 * الملفُّ محبوساً في خطأ**.
 *
 * والحلُّ ليس تخفيفَ الحُرّاس بل **تراجعاً مؤسّسياً مدقَّقاً**: تُعكَس آثارُ
 * العملية بقيودٍ معاكسة، وتعود الحالةُ الصحيحة، ويبقى كلُّ ما وقع مقروءاً.
 *
 * ══ ① جدولُ الترابط ═════════════════════════════════════════════════════
 * التصحيحُ الواحد يلمس المتابعةَ والحلقةَ والأمرَ والدفترَ والمعاينة. وبلا
 * هويّةٍ جامعة تصير خمسةَ أحداثٍ متفرّقة لا يعرف قارئُها أنها فعلٌ واحد.
 * **وهذا الجدولُ لا يحلّ محلّ تدقيق النطاقات**: كلُّ جدولٍ يستقبل حدثَه
 * كالمعتاد، وهذا يقول «كلُّها تنتمي إلى تصحيحٍ واحد».
 *
 * ══ ② والوسمُ على الصفوف — لا حذفَ ولا كتابةَ تاريخٍ فوق تاريخ ═════════
 * `admin_void_reversal_id` على الأمر وعلى الحلقة. **ولماذا وسمٌ لا حالة**:
 * أمرٌ اكتمل وجهازٌ سُلِّم واقعةٌ فيزيائية وقعت. وتحويلُ حالته إلى «ملغى»
 * وتصفيرُ ختم تسليمه يكتب ماضياً لم يقع — والمريضُ يحمل الجهازَ في يده.
 * فالوسمُ يرفع **السلطة** ولا يمحو **الشهادة**: يخرج من الطوابير الفعّالة
 * ومن السلطة التجارية، ويبقى تاريخُه كما هو بختمه.
 *
 * وأمرٌ لم ينتهِ بعد يأخذ الوسمَ **وحالةَ `cancelled`** معاً: تلك حالتُه
 * الصحيحة فعلاً، ولا شهادةَ تُمحى.
 *
 * ══ ③ وحالةٌ طرفيّةٌ رابعة للمتابعة ═════════════════════════════════════
 * `closed_admin_void`. ولا تُوسَم `closed_without_purchase` (المريضُ لم
 * يرفض) ولا `closed_exam_cancelled` (لم تسقط معاينةٌ سريرياً). **يُوسَّع
 * القيدُ ولا يُستبدَل معناه**، ويعرف فهرسا «المتابعة الحيّة الواحدة»
 * الطرفيّةَ الرابعة — وإلّا بقيت المتقاعدةُ محسوبةً حيّة فتُمنَع العمليةُ
 * الصحيحة التالية بـ٢٣٥٠٥ ويبقى الملفُّ مقفلاً (وهو درسُ ٠٦١ بالحرف).
 *
 * ══ ④ ولا تصحيحان لعمليةٍ واحدة ═════════════════════════════════════════
 * فهرسُ تفرّدٍ على `followup_id` — فالضغطةُ المزدوجة تُنتج تصحيحاً واحداً،
 * ومحاولةُ تصحيحِ ما صُحّح تُردّ من القاعدة لا من ترتيب الشيفرة.
 *
 * idempotent: كلُّ شيءٍ بـIF NOT EXISTS، وإعادةُ التشغيل لا تغيّر صفّاً.
 */

export const name = "064_administrative_reversal";

export const sql = `
-- ══ ① سجلُّ التصحيح الإداريّ — هويّةٌ واحدة لكلّ ما تحرّك معاً ═══════════
CREATE TABLE IF NOT EXISTS administrative_operation_reversals (
  id                 SERIAL PRIMARY KEY,
  patient_id         INTEGER NOT NULL REFERENCES patients(id),
  branch_id          INTEGER,

  --  هويّةُ العملية المصحَّحة — بالسلسلة الدقيقة لا بـ(مريض + قسم).
  medical_exam_id    INTEGER,
  followup_id        INTEGER,
  device_episode_id  INTEGER,
  work_order_id      INTEGER,

  mode               TEXT NOT NULL,
  reason_code        TEXT NOT NULL,
  reason_note        TEXT NOT NULL,

  --  الفرقُ الذي قُيِّد في الدفتر (سالبٌ حين يُعكَس بيع). ولا يُعاد حسابُه
  --  لاحقاً من الحالة: الرقمُ المقيَّد هو ما وقع فعلاً.
  financial_delta    INTEGER NOT NULL DEFAULT 0,

  --  دفعةٌ باقيةٌ صارت رصيداً للمريض ⟶ تسويةٌ محاسبية منفصلة وصريحة.
  --  **ولا ردَّ تلقائيّ**: إعادةُ المال قرارٌ يتّخذه إنسان لا أثرٌ جانبيّ.
  requires_financial_settlement BOOLEAN NOT NULL DEFAULT FALSE,
  preserved_paid_amount INTEGER NOT NULL DEFAULT 0,

  created_by         INTEGER,
  created_by_name    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT administrative_operation_reversals_mode_check
    CHECK (mode IN ('purchase_only', 'full_operation'))
);

CREATE INDEX IF NOT EXISTS ix_aor_patient
  ON administrative_operation_reversals (patient_id);
CREATE INDEX IF NOT EXISTS ix_aor_episode
  ON administrative_operation_reversals (device_episode_id)
  WHERE device_episode_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_aor_work_order
  ON administrative_operation_reversals (work_order_id)
  WHERE work_order_id IS NOT NULL;

--  **ولا تصحيحان لمتابعةٍ واحدة** — الضغطةُ المزدوجة يحسمها صفُّ القاعدة.
CREATE UNIQUE INDEX IF NOT EXISTS uq_aor_followup
  ON administrative_operation_reversals (followup_id)
  WHERE followup_id IS NOT NULL;


-- ══ ② وسمُ البطلان الإداريّ على الأمر وعلى الحلقة ════════════════════════
--  يرفع السلطةَ ولا يمحو الشهادة: أمرٌ اكتمل يبقى مكتملاً بختمه، وحلقةٌ
--  سُلِّمت تبقى مسلَّمةً بتاريخها — وكلاهما يخرج من الطوابير الفعّالة.
ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS admin_void_reversal_id INTEGER;
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS admin_void_reversal_id INTEGER;

CREATE INDEX IF NOT EXISTS ix_pwo_admin_void
  ON prosthetic_work_orders (admin_void_reversal_id)
  WHERE admin_void_reversal_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_pde_admin_void
  ON patient_device_episodes (admin_void_reversal_id)
  WHERE admin_void_reversal_id IS NOT NULL;


-- ══ ③ الحالةُ الطرفيّة الرابعة للمتابعة ═════════════════════════════════
--  يُوسَّع القيدُ ولا يُستبدَل معناه — الثلاثُ القديمة تعني ما كانت تعنيه.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_status_check'
       AND pg_get_constraintdef(oid) NOT LIKE '%closed_admin_void%'
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
        'closed_without_purchase', 'converted', 'closed_exam_cancelled',
        'closed_admin_void'));
  END IF;
END $$;

-- ══ وفهرسا «المتابعة الحيّة الواحدة» يعرفان الطرفيّةَ الرابعة ═══════════
--  **بدون هذا التوسيع يُقفل الملفُّ إلى الأبد**: المتقاعدةُ إدارياً تبقى
--  محسوبةً حيّة، فتردّ القاعدةُ متابعةَ العملية الصحيحة التالية بـ٢٣٥٠٥ —
--  وهو بالضبط ما يهدف هذا الترحيلُ إلى فتحه. (درسُ ٠٦١ بالحرف.)
DROP INDEX IF EXISTS uq_pef_active_episode;
CREATE UNIQUE INDEX uq_pef_active_episode
  ON post_exam_followups (device_episode_id)
  WHERE device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void');

DROP INDEX IF EXISTS uq_pef_active_legacy;
CREATE UNIQUE INDEX uq_pef_active_legacy
  ON post_exam_followups (patient_id, service_type)
  WHERE device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void');
`;
