/**
 * Migration 072 — عاد للشراء: قيمةٌ جديدة لِ review_kind، لا جدولٌ جديد.
 *
 * ══ الواقعة ═══════════════════════════════════════════════════════════
 * مريضٌ عايَنه طبيبٌ لجهازٍ ما، ثمّ سجّل الاستقبالُ «لم يشترِ». بعد أسابيع
 * يعود يريد **الجهازَ نفسَه**. الحلقةُ ما زالت `examined` — لم تُصنَّع ولم
 * تُلغَ — والمتابعةُ القديمة `closed_without_purchase` بتاريخها وسببها.
 *
 * لا مريضَ جديداً، ولا حالةً جديدة، ولا حلقةَ جديدة. **حلقةٌ واحدة تعود
 * `awaiting_exam` فتُوقَّع لها معاينةٌ ثانية**، والمتابعةُ القديمة تبقى
 * كما هي — تاريخٌ لا يُمحى.
 *
 * ══ ولماذا قيمةٌ في عمودٍ قائم لا جدولٌ جديد ═════════════════════════════
 * `medical_review_requests` (ترحيل ٠٥٥) هو **بابُ الطبيب الثاني** أصلاً:
 * صفٌّ بـ`requested_path='full'` و`review_kind` يقول لماذا. و«عاد للشراء»
 * زيارةٌ من هذا النوع بالضبط — ليست معاينةً مُختَرعة، بل طلبَ معاينةٍ
 * كاملة **بسببٍ محدَّد**. فتنضمّ إلى العمود القائم بقيمةٍ سابعة، وتصل قائمةَ
 * عمل الطبيب من نفس الاستعلام الذي توصل منه بقيّةُ الأسباب — بلا لمسِ
 * `getWorklist` ولا `medical_review_requests` نفسِها.
 *
 * ══ ولماذا مقصورةٌ على المسار البنيويّ لا مُدرَجةٌ في القائمة العامّة ══════
 * «عاد للشراء» **تنشأ آلياً** من عملية return-to-purchase (المرساةُ حلقةُ
 * جهازٍ حقيقية، والحارسُ في الشيفرة يمنع أيّ إنشاءٍ آخر بهذه القيمة) — لا
 * تُختار يدوياً من نافذة «إرسال لمراجعة الطبيب» العامّة. فـ`REVIEW_KINDS`
 * المُصدَّرة للنافذة اليدوية **لا تحمل هذه القيمة** (`shared/medical_review.ts`)،
 * والقيدُ هنا صريحٌ في القاعدة تحسّباً لا اعتماداً عليها وحدها.
 *
 * ══ والجهازُ الجديد لا يكون سريعاً، وكذلك العودةُ للشراء ═══════════════
 * قيدٌ قائم يرفض `new_device` بمسارٍ سريع. يتّسع هنا ليرفض `return_to_purchase`
 * كذلك — لا مسارَ سريعاً لعودةٍ للشراء أبداً، **في القاعدة** لا في الشيفرة
 * وحدها.
 *
 * idempotent: كلُّ لمسةٍ محروسةٌ بفحص تعريف القيد الحاليّ أوّلاً — فإعادةُ
 * التشغيل لا تُعيد كتابة قيدٍ يحمل القيمةَ الجديدة بالفعل.
 * بلا DROP TABLE ولا DROP COLUMN ولا DELETE، ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٧١.
 */

export const name = "072_return_to_purchase";

export const sql = `
DO $rtp$
BEGIN
  -- ══ review_kind: القيمةُ السابعة ═════════════════════════════════════
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'medical_review_requests_kind_check'
       AND conrelid = 'medical_review_requests'::regclass
       AND pg_get_constraintdef(oid) NOT LIKE '%return_to_purchase%'
  ) THEN
    ALTER TABLE medical_review_requests
      DROP CONSTRAINT medical_review_requests_kind_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'medical_review_requests_kind_check'
       AND conrelid = 'medical_review_requests'::regclass
  ) THEN
    ALTER TABLE medical_review_requests
      ADD CONSTRAINT medical_review_requests_kind_check
      CHECK (review_kind IN
        ('new_device', 'maintenance', 'adjustment', 'follow_up', 'other', 'return_to_purchase'));
  END IF;

  -- ══ العودةُ للشراء لا تكون سريعةً أبداً — كالجهاز الجديد بالضبط ════════
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'medical_review_requests_new_device_full_check'
       AND conrelid = 'medical_review_requests'::regclass
       AND pg_get_constraintdef(oid) NOT LIKE '%return_to_purchase%'
  ) THEN
    ALTER TABLE medical_review_requests
      DROP CONSTRAINT medical_review_requests_new_device_full_check;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'medical_review_requests_new_device_full_check'
       AND conrelid = 'medical_review_requests'::regclass
  ) THEN
    ALTER TABLE medical_review_requests
      ADD CONSTRAINT medical_review_requests_new_device_full_check
      CHECK (NOT (review_kind IN ('new_device', 'return_to_purchase') AND requested_path = 'quick'));
  END IF;
END
$rtp$;
`;
