// **طلبُ المراجعة يُسحَب، ولا يُمحى** — حالةٌ طرفيّةٌ خامسة `cancelled`.
//
// ══ الواقعة (تدقيق ٢٠٢٦-٠٩-١٢: CASEDEL-02 · INT-06 = RTP-5) ═══════════════
// فتحُ «طلب جهاز» أو «إضافة نوع حالة» يُنشئ `medical_review_requests` معلَّقاً
// مرساتُه الحلقةُ أو الحالة. ثمّ:
// • إلغاءُ الحلقة (`cancelPreManufacturingDeviceEpisode`) كان يترك الطلبَ
//   `pending` إلى الأبد — **طلبٌ شبح** يظهر للطبيب عن جهازٍ سُحب.
// • وحذفُ الحالة كان ينفجر بـ23503 خام على مفتاح `case_id` (`NO ACTION`)،
//   فيقرأ المسؤولُ نصَّ Postgres حرفياً في التوست ولا مخرجَ له إطلاقاً.
//
// ══ ولماذا حالةٌ لا حذفُ صفّ ════════════════════════════════════════════
// الطلبُ **واقعةٌ وقعت**: الاستقبالُ طلب معاينةً يوماً. فسحبُه يُقال سحباً
// ويُقرأ في التدقيق، ولا يُمحى كأنه لم يكن. وهذا نفسُ مبدأ ٠٦١ (إلغاءُ
// المعاينة شاهدةٌ لا محو) و٠٦٤ (الإبطالُ الإداريّ يبقي السجلّ).
//
// **ولا قرارَ طبيبٍ يُدَّعى**: `decision` يبقى `NULL` — لم يقرّر طبيبٌ شيئاً.
// و`decided_at`/`decided_by` يحملان **مَن سحب ومتى**، و`doctor_note` السبب.
//
// ══ إضافيّ، idempotent، غيرُ مدمّر ═════════════════════════════════════════
// توسيعُ قيدَي CHECK إلى **مجموعةٍ أوسع** — فكلُّ صفٍّ قائم يجتازها كما هو.
// لا عمودَ جديد، ولا `DROP TABLE`، ولا `DELETE`، ولا `UPDATE` على أيّ صفّ.
// وفهارسُ التفرّد الجزئية (`uq_mrr_pending_*`) مشروطةٌ بـ`status = 'pending'`
// أصلاً، فالمسحوبُ يحرّر مرساتَه تلقائياً ويُعاد الطلبُ الصحيح بلا ٤٠٩.

// ══ وكذلك المتابعة: الطرفيّةُ الخامسة `closed_request_cancelled` ══════════
// إلغاءُ الحلقة كان يترك `post_exam_followups` حيّةً أيضاً — تُعرَض في
// «بانتظار الحسم» على جهازٍ سُحب، و«لم يشترِ» عليها تكتب قراراً لم يتّخذه
// المريض. **ولا واحدةٌ من الأربع تصفها بصدق** (القسم المفصَّل في
// `shared/followup.ts`). ويُوسَّع القيدُ ولا يُستبدَل معناه.
//
// **والفهرسان الجزئيّان يعرفانها** — وإلّا بقيت المتقاعدةُ محسوبةً حيّةً
// فتُقفل الخيطَ إلى الأبد وتردّ القاعدةُ متابعةَ الطلب الصحيح التالي
// بـ٢٣٥٠٥. درسُ ٠٦١ ثمّ ٠٦٤ بالحرف.

export const name = "079_review_request_cancelled";

export const sql = `
DO $mrr79$
BEGIN
  -- ① الحالةُ الطرفيّة الخامسة
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conname = 'medical_review_requests_status_check') THEN
    ALTER TABLE medical_review_requests
      DROP CONSTRAINT medical_review_requests_status_check;
  END IF;
  ALTER TABLE medical_review_requests
    ADD CONSTRAINT medical_review_requests_status_check
    CHECK (status IN ('pending', 'approved', 'escalated', 'returned', 'examined', 'cancelled'));

  -- ② وشكلُها: مَن سحب ومتى، بلا قرارِ طبيبٍ مُدَّعى
  IF EXISTS (SELECT 1 FROM pg_constraint
              WHERE conname = 'medical_review_requests_decided_shape_check') THEN
    ALTER TABLE medical_review_requests
      DROP CONSTRAINT medical_review_requests_decided_shape_check;
  END IF;
  ALTER TABLE medical_review_requests
    ADD CONSTRAINT medical_review_requests_decided_shape_check
    CHECK ((status = 'pending' AND decision IS NULL AND decided_at IS NULL)
        OR (status IN ('approved', 'escalated', 'returned')
            AND decision IS NOT NULL AND decided_at IS NOT NULL)
        OR (status = 'examined' AND exam_id IS NOT NULL)
        OR (status = 'cancelled' AND decision IS NULL AND decided_at IS NOT NULL));
END
$mrr79$;

-- ══ ③ الحالةُ الطرفيّة الخامسة للمتابعة ═══════════════════════════════════
DO $pef79$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_status_check'
       AND pg_get_constraintdef(oid) NOT LIKE '%closed_request_cancelled%'
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
        'closed_admin_void', 'closed_request_cancelled'));
  END IF;
END
$pef79$;

-- ══ ④ وفهرسا «المتابعة الحيّة الواحدة» يعرفان الطرفيّةَ الخامسة ═══════════
DROP INDEX IF EXISTS uq_pef_active_episode;
CREATE UNIQUE INDEX uq_pef_active_episode
  ON post_exam_followups (device_episode_id)
  WHERE device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void',
                       'closed_request_cancelled');

DROP INDEX IF EXISTS uq_pef_active_legacy;
CREATE UNIQUE INDEX uq_pef_active_legacy
  ON post_exam_followups (patient_id, service_type)
  WHERE device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void',
                       'closed_request_cancelled');
`;
