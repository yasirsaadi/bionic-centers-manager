// **«إلغاء الحسم»** — طرفيّةٌ سادسة `closed_decision_cancelled`.
//
// ══ الواقعة (قرارُ المالك ٢٠٢٦-٠٩-١٥) ═══════════════════════════════════
// تشخيصُ «بانتظار الحسم» على الإنتاج أظهر صفوفاً دخلت الطابورَ **بالخطأ**:
// لا بيعَ ينتظرها ولا قرارَ مريضٍ يُنتظَر — وجودُها هناك هو العطب. ولم يكن
// للموظّف مخرجٌ إلّا أن يكذب: «لم يشترِ» تكتب رفضاً لم يقع، و«إتمام البيع»
// تكتب بيعاً لم يقع.
//
// ══ ولماذا حالةٌ سادسة لا إحدى الخمس ════════════════════════════════════
// كلُّ واحدةٍ منها **تدّعي واقعةً بعينها**:
//   `closed_without_purchase`   ⟶ المريضُ رفض الشراء.
//   `converted`                 ⟶ المريضُ اشترى وبدأ التصنيع.
//   `closed_exam_cancelled`     ⟶ سقطت المعاينةُ سريرياً.
//   `closed_admin_void`         ⟶ بطلت صفقةٌ بقرارٍ إداريٍّ **بعد بيع**.
//   `closed_request_cancelled`  ⟶ سُحب طلبُ الجهاز نفسُه.
// وهنا **لم يتغيّر شيءٌ في العالَم**: لا مالٌ ولا جهازٌ ولا معاينةٌ ولا
// تصنيع. تغيّر أن مهمّةَ الحسم لم تكن مستحقّةً أصلاً. وسجلٌّ يقول سبباً لم
// يقع أسوأُ من سجلٍّ صامت (درسُ ٠٦١ ثمّ ٠٦٤ ثمّ ٠٧٩ بالحرف).
//
// ══ إضافيّ، idempotent، غيرُ مدمّر ═════════════════════════════════════════
// توسيعُ قيدٍ إلى **مجموعةٍ أوسع** — فكلُّ صفٍّ قائم يجتازه كما هو. لا عمودَ
// جديد، ولا `DROP TABLE`، ولا `DELETE`، **ولا `UPDATE` على أيّ صفّ**:
// الصفوفُ العشرةُ التي كشفها التشخيص تُحسَم بالمسار القانونيّ الجديد بيد
// إنسان، لا بترحيلٍ يكتب عنه.
//
// **والفهرسان الجزئيّان يعرفانها** — وإلّا بقيت المتقاعدةُ محسوبةً حيّةً
// فتُقفل الخيطَ إلى الأبد وتردّ القاعدةُ متابعةَ الطلب الصحيح التالي
// بـ٢٣٥٠٥. هذا بعينه ما نسيه ٠٦١ فصحّحه ٠٦٤، ثمّ ٠٧٩.

export const name = "081_followup_decision_cancelled";

export const sql = `
DO $pef81$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_status_check'
       AND pg_get_constraintdef(oid) NOT LIKE '%closed_decision_cancelled%'
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
        'closed_admin_void', 'closed_request_cancelled',
        'closed_decision_cancelled'));
  END IF;
END
$pef81$;

-- ══ وفهرسا «المتابعة الحيّة الواحدة» يعرفان الطرفيّةَ السادسة ═════════════
DROP INDEX IF EXISTS uq_pef_active_episode;
CREATE UNIQUE INDEX uq_pef_active_episode
  ON post_exam_followups (device_episode_id)
  WHERE device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void',
                       'closed_request_cancelled', 'closed_decision_cancelled');

DROP INDEX IF EXISTS uq_pef_active_legacy;
CREATE UNIQUE INDEX uq_pef_active_legacy
  ON post_exam_followups (patient_id, service_type)
  WHERE device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted',
                       'closed_exam_cancelled', 'closed_admin_void',
                       'closed_request_cancelled', 'closed_decision_cancelled');
`;
