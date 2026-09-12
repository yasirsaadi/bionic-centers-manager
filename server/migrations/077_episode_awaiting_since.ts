// «منذ متى ينتظر الطبيبَ» — الدخولُ الحاليّ إلى الطابور، لا تاريخُ فتح الطلب.
//
// ══ الواقعة (تدقيق ٢٠٢٦-٠٩-١٢، RTP-1) ═══════════════════════════════════
// قائمةُ «معايناتي» كانت تقرأ الانتظارَ من `patient_device_episodes.created_at`،
// و«عاد للشراء» (ترحيل ٠٧٢) يعيد الحلقةَ **نفسَها** إلى `awaiting_exam` بلا
// أن يمسّ ذلك التاريخ. فمريضٌ عاد اليوم لجهازٍ طُلب قبل شهرين ظهر للطبيب
// «منذ ٦٠ يوماً» وسقط آخرَ الصفحات بترتيب «الأحدث أولاً» — وهذا هو الشكلُ
// الإنتاجيُّ لشكوى «عاد للشراء لا يصل الطبيب» بأبسط أسبابه.
//
// ══ القرار ═══════════════════════════════════════════════════════════════
// عمودٌ جديد `awaiting_since`: يُكتب عند **كلّ** عودةٍ إلى `awaiting_exam`
// (`revertEpisodeToAwaitingExam` — البابُ الواحد الذي يستعمله «عاد للشراء»
// وإلغاءُ المعاينة معاً) وعند الإنشاء بافتراض القاعدة. و`created_at`
// **لا يُعاد كتابتُه** — هو تاريخُ الطلب الحقيقيّ ويبقى كما هو.
//
// ══ إضافيّ، idempotent، بلا إعادة كتابة تاريخ ═══════════════════════════
// • العمودُ يُضاف **بلا افتراضٍ** أوّلاً: `ADD COLUMN … DEFAULT NOW()` كان
//   سيملأ كلَّ الصفوف القائمة بلحظة الترحيل فيبدو كلُّ جهازٍ قديم كأنه دخل
//   الطابورَ اليوم — كذبٌ بالجملة. فالقائمُ يبقى `NULL` ويُقرأ
//   `COALESCE(awaiting_since, created_at)` بالقاعدة القديمة حرفاً.
// • ثمّ يُضبط الافتراضُ للصفوف **الجديدة** وحدها.
// • تعبئةٌ واحدة **حتميّة** لا تخمينية: حلقةٌ منتظرةٌ الآن ولها طلبُ
//   «عاد للشراء» معلَّق — لحظةُ عودتها مكتوبةٌ في `medical_review_requests.
//   created_at` بالضبط، فتُنقَل كما هي. لا صفَّ آخر يُمَسّ.
// • بلا DROP ولا DELETE ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٧٦.

export const name = "077_episode_awaiting_since";

export const sql = `
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS awaiting_since TIMESTAMPTZ;

ALTER TABLE patient_device_episodes
  ALTER COLUMN awaiting_since SET DEFAULT NOW();

UPDATE patient_device_episodes ep
   SET awaiting_since = r.created_at
  FROM medical_review_requests r
 WHERE r.device_episode_id = ep.id
   AND r.status = 'pending'
   AND r.review_kind = 'return_to_purchase'
   AND ep.status = 'awaiting_exam'
   AND ep.awaiting_since IS NULL;

COMMENT ON COLUMN patient_device_episodes.awaiting_since IS
  'آخر دخول إلى طابور المعاينة (awaiting_exam) — يُقرأ COALESCE(awaiting_since, created_at). ترحيل 077.';
`;
