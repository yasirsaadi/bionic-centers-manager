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
// ══ ما يفعله هذا الترحيل بالضبط — **ثلاثةُ كائناتٍ تُعاد بناؤها** ═════════
// ولا يُقال «بلا إسقاط» بإطلاق، فذاك غيرُ صحيح: القيدُ والفهرسان **يُسقَطون
// ويُعاد إنشاؤهم** — إذ لا يقبل Postgres تعديلَ شرطِ `CHECK` ولا شرطِ فهرسٍ
// جزئيّ في مكانه.
//
//   ① `post_exam_followups_status_check` — يُسقَط ويُعاد بمجموعةٍ **أوسع**
//      (العشرُ القديمة + `closed_decision_cancelled`). وتوسيعٌ إلى مجموعةٍ
//      أوسع يعني أن **كلَّ صفٍّ قائم يجتازه كما هو**، فلا صفَّ يُردّ ولا
//      يُعاد كتابتُه. والإسقاطُ مشروطٌ بأن يكون القيدُ لا يعرفها بعد، فالتشغيلُ
//      الثاني لا يُسقط شيئاً.
//   ② `uq_pef_active_episode`  — `DROP INDEX IF EXISTS` ثمّ `CREATE`.
//   ③ `uq_pef_active_legacy`   — كذلك.
//      وشرطُهما `WHERE status NOT IN (…)` يكتسب الطرفيّةَ السادسة. وبلا ذلك
//      تبقى المتقاعدةُ محسوبةً **حيّةً** فتُقفل الخيطَ إلى الأبد وتردّ
//      القاعدةُ متابعةَ الطلب الصحيح التالي بـ٢٣٥٠٥ — وهذا بعينه ما نسيه
//      ٠٦١ فصحّحه ٠٦٤، ثمّ ٠٧٩.
//
//      **وإعادةُ بناء فهرسٍ ليست حذفَ بيانات**: الفهرسُ مشتقٌّ من الجدول
//      يُبنى منه من جديد. وهي `UNIQUE` على مجموعةٍ **أضيق** بعد التوسعة (صفوفٌ
//      صارت طرفيّةً تخرج من الشرط)، فلا يمكن أن يفشل بناؤها لتصادمٍ جديد.
//
// ══ وما لا يفعله ═════════════════════════════════════════════════════════
// **بلا `DROP TABLE` ولا `DROP COLUMN`** · **ولا عمودَ جديد** · **ولا
// `DELETE`** · **ولا `UPDATE` على أيّ صفّ قائم** · ولا مسٍّ لترحيلٍ من ٠٠١
// إلى ٠٨٠. الصفوفُ العشرةُ التي كشفها التشخيص تُحسَم بالمسار القانونيّ
// الجديد بيد إنسان، لا بترحيلٍ يكتب عنه.

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
