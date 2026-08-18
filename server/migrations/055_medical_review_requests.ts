/**
 * Migration 055 — طلباتُ مراجعة الطبيب للأطراف والمساند
 *
 * جدولٌ واحد جديد. **لا عمودَ يُضاف إلى جدولٍ قائم ولا صفَّ يُعدَّل ولا
 * جدولَ يُعاد بناؤه.** الجداول الموجودة تخرج منه كما دخلت حرفياً.
 *
 * ══ لماذا جدولٌ لا حقلٌ على المعاينة ═══════════════════════════════════
 * الموافقةُ السريعة **ليست معاينة**. المعاينة سجلٌّ سريريٌّ مختوم بترِكرٍ
 * يمنع تعديله، يحمل شكوى وفحصاً وتشخيصاً ووصفة. وتسجيلُ «وافقتُ على صيانةٍ
 * روتينية» فيها كان سيصنع **معايناتٍ زائفة**: سجلّاتٍ سريرية بلا محتوى
 * سريري، تُحسب في التسلسل وتُطفئ وسمَ «بانتظار معاينة» وتُقرأ بعد سنواتٍ
 * كأنّ طبيباً فحص المريض يومها. فالقرار الخفيف يسكن جدوله الخاصّ.
 *
 * ولا يُضعِف هذا نظامَ المعاينة: المعاينة تبقى كما هي بحرفها وترِكراتها
 * وجدولها الجنائي، وهذا الجدول لا يمسّها. وحين يقرّر الطبيب «معاينة كاملة»
 * يُحال الملفّ إلى ذلك المسار نفسه لا إلى بديلٍ عنه.
 *
 * ══ والمساران يفترقان عند الإنشاء لا عند القرار ════════════════════════
 * `requested_path` ليس وسماً على بطاقةٍ واحدة — هو **الطابور نفسه**:
 *   `quick` ⟶ طابورُ القرار السريع، يوافق الطبيبُ أو يُحيل أو يُعيد.
 *   `full`  ⟶ **طابورُ المعاينة الكاملة القائم مباشرةً**، بلا بطاقةِ
 *             موافقةٍ إطلاقاً — فلا يُعرَض على طبيبٍ زرُّ «موافقة» لحالةٍ
 *             قيل عنها إنها تحتاج فحصاً.
 *
 * و**الجهازُ الجديد لا يكون سريعاً أبداً**: قيدُ `CHECK` يرفض التركيبة في
 * القاعدة، فلا سطرَ تطبيقٍ منسيٌّ يفتحها ولا سكربتٌ مباشر.
 *
 * والحالة `examined` تُغلق الطلب حين تُوقَّع المعاينة: فالمُحال والمُرسَل
 * كاملاً كلاهما ينتهي بتوقيعٍ لا بقرارٍ سريع — ولولاها لبقي الطلب معلَّقاً
 * إلى الأبد فحجَز فهرسَ التفرّد ومنع مراجعةً لاحقة على المريض نفسه.
 *
 * ══ والربطُ بالحدث لا بالمريض وحده ═════════════════════════════════════
 * `patient + specialty` وحدهما يجعلان طلبَي مراجعةٍ لجهازين مختلفين طلباً
 * واحداً. فيحمل الصفُّ **مرساةَ الحدث** حين توجد: حلقةَ الجهاز، أو أمرَ
 * الصيانة، أو الزيارة. وهي `NULL` مجتمعةً حين يكون الطلب عن الملفّ عامّةً —
 * وذلك مشروع، لكنّه ليس الحالة الافتراضية.
 *
 * وفهارس التفرّد الجزئية تحرس المعنى: **طلبٌ معلَّقٌ واحد لكل حدث**. فضغطتان
 * على الزرّ لا تصنعان بطاقتين للطبيب، وطلبٌ حُسم لا يمنع طلباً لاحقاً على
 * الحدث نفسه (مريضٌ عاد بعد شهر لنفس الجهاز يستحقّ مراجعةً جديدة).
 *
 * ══ والعلاج الطبيعي ممنوعٌ بنيوياً ═════════════════════════════════════
 * `CHECK (service_type IN ('prosthetic','medical_support'))`. لا سطرَ في
 * التطبيق يحرسه بل القاعدة: قيمةٌ ثالثة تُردّ عند الكتابة مهما كان مصدرها.
 *
 * idempotent: `IF NOT EXISTS` في كلّ عبارة.
 */

export const name = "055_medical_review_requests";

export const sql = `
CREATE TABLE IF NOT EXISTS medical_review_requests (
  id            SERIAL PRIMARY KEY,
  patient_id    INTEGER NOT NULL REFERENCES patients(id),
  -- الاختصاص. العلاج الطبيعي مرفوضٌ في القاعدة لا في الشيفرة.
  service_type  TEXT NOT NULL,
  -- خيطُ الاختصاص حين يكون معروفاً — لقطةٌ للربط لا شرطُ وجود.
  case_id       INTEGER REFERENCES patient_cases(id),
  branch_id     INTEGER REFERENCES branches(id),

  -- ══ مرساةُ الحدث — واحدةٌ منها على الأكثر في العادة ══════════════════
  device_episode_id INTEGER REFERENCES patient_device_episodes(id),
  work_order_id     INTEGER REFERENCES prosthetic_work_orders(id),
  visit_id          INTEGER REFERENCES visits(id),

  -- ══ تصنيفُ الاستقبال ════════════════════════════════════════════════
  requested_path TEXT NOT NULL,     -- quick | full
  review_kind    TEXT NOT NULL,     -- new_device | maintenance | adjustment | follow_up | other
  reception_note TEXT,
  created_by     INTEGER REFERENCES system_users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ══ قرارُ الطبيب ════════════════════════════════════════════════════
  status      TEXT NOT NULL DEFAULT 'pending',
  decision    TEXT,
  decided_by  INTEGER REFERENCES system_users(id),
  decided_at  TIMESTAMPTZ,
  doctor_note TEXT,
  -- المعاينة التي أُنجزت بعد الإحالة، إن أُنجزت. لقطةُ ربطٍ للقراءة.
  exam_id     INTEGER REFERENCES medical_exams(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT medical_review_requests_service_check
    CHECK (service_type IN ('prosthetic', 'medical_support')),
  CONSTRAINT medical_review_requests_path_check
    CHECK (requested_path IN ('quick', 'full')),
  CONSTRAINT medical_review_requests_kind_check
    CHECK (review_kind IN ('new_device', 'maintenance', 'adjustment', 'follow_up', 'other')),
  CONSTRAINT medical_review_requests_status_check
    CHECK (status IN ('pending', 'approved', 'escalated', 'returned', 'examined')),
  CONSTRAINT medical_review_requests_decision_check
    CHECK (decision IS NULL
           OR decision IN ('approve', 'require_full_exam', 'return_to_reception')),
  -- الجهازُ الجديد يستوجب معاينةً كاملة — **في القاعدة**، فلا تُخترق
  -- التركيبة من نقطةٍ نُسيت ولا من SQL مباشر.
  CONSTRAINT medical_review_requests_new_device_full_check
    CHECK (NOT (review_kind = 'new_device' AND requested_path = 'quick')),
  -- المحسوم بقرارٍ سريع يحمل قراره وصاحبه ووقته، والمعلَّق لا يحمل شيئاً
  -- منها. وحالة examined نهايةٌ من نوعٍ آخر: أغلقها **توقيعُ معاينة** لا
  -- قرارٌ سريع، فتحمل معاينتَها وقد تحمل قراراً سابقاً (المُحال) أو لا
  -- تحمله إطلاقاً (المُرسَل كاملاً من أوّله).
  CONSTRAINT medical_review_requests_decided_shape_check
    CHECK ((status = 'pending' AND decision IS NULL AND decided_at IS NULL)
        OR (status IN ('approved', 'escalated', 'returned')
            AND decision IS NOT NULL AND decided_at IS NOT NULL)
        OR (status = 'examined' AND exam_id IS NOT NULL))
);

-- ══ والقيود تُثبَّت ولو سبق الجدولُ الترحيلَ ══════════════════════════════
--  عبارةُ CREATE TABLE IF NOT EXISTS صمتٌ تامّ حين يكون الجدول قائماً — ولو
--  كان قائماً **بلا قيوده**. وهذا يقع فعلاً: أداةُ drizzle-kit push تبني
--  الجدول من shared/schema.ts وحدها، ولا تُعبَّر قيود CHECK فيها. فبيئةٌ
--  دُفِع مخطّطُها قبل ترحيلها كانت ستحمل جدولاً بلا حارسٍ واحد: العلاج
--  الطبيعي يُقبَل، والجهازُ الجديد يمرّ سريعاً.
--
--  فالقيود تُضاف صراحةً، وكلٌّ منها محميٌّ بفحصِ اسمِه في pg_constraint —
--  فالترحيل يبقى idempotent، ويصير **هو** مصدرَ الحقيقة للحُرّاس مهما كان
--  أصلُ الجدول.
DO $mrr$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT * FROM (VALUES
      ('medical_review_requests_service_check',
       'CHECK (service_type IN (''prosthetic'', ''medical_support''))'),
      ('medical_review_requests_path_check',
       'CHECK (requested_path IN (''quick'', ''full''))'),
      ('medical_review_requests_kind_check',
       'CHECK (review_kind IN (''new_device'', ''maintenance'', ''adjustment'', ''follow_up'', ''other''))'),
      ('medical_review_requests_status_check',
       'CHECK (status IN (''pending'', ''approved'', ''escalated'', ''returned'', ''examined''))'),
      ('medical_review_requests_decision_check',
       'CHECK (decision IS NULL OR decision IN (''approve'', ''require_full_exam'', ''return_to_reception''))'),
      ('medical_review_requests_new_device_full_check',
       'CHECK (NOT (review_kind = ''new_device'' AND requested_path = ''quick''))'),
      ('medical_review_requests_decided_shape_check',
       'CHECK ((status = ''pending'' AND decision IS NULL AND decided_at IS NULL)
            OR (status IN (''approved'', ''escalated'', ''returned'')
                AND decision IS NOT NULL AND decided_at IS NOT NULL)
            OR (status = ''examined'' AND exam_id IS NOT NULL))')
    ) AS v(name, body)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conname = c.name AND conrelid = 'medical_review_requests'::regclass
    ) THEN
      EXECUTE format('ALTER TABLE medical_review_requests ADD CONSTRAINT %I %s', c.name, c.body);
    END IF;
  END LOOP;
END
$mrr$;

-- ══ طلبٌ معلَّقٌ واحد لكلّ حدث ═══════════════════════════════════════════
--  حقيقةٌ في القاعدة لا قاعدةٌ في الشيفرة: ضغطتان متسابقتان على الزرّ
--  تصنعان صفّاً واحداً، والثانية تُردّ. والمحسومُ لا يحجز شيئاً، فمريضٌ عاد
--  بعد شهرٍ لنفس الجهاز يُرسَل من جديد.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mrr_pending_episode
  ON medical_review_requests (device_episode_id)
  WHERE status = 'pending' AND device_episode_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mrr_pending_order
  ON medical_review_requests (work_order_id)
  WHERE status = 'pending' AND work_order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mrr_pending_visit
  ON medical_review_requests (visit_id)
  WHERE status = 'pending' AND visit_id IS NOT NULL;

--  وطلبٌ معلَّقٌ واحد بلا مرساة لكلّ (مريض، اختصاص): زرُّ «أرسل للمراجعة»
--  من صفحة المريض لا يصنع طابوراً من البطاقات المتطابقة.
CREATE UNIQUE INDEX IF NOT EXISTS uq_mrr_pending_bare
  ON medical_review_requests (patient_id, service_type)
  WHERE status = 'pending'
    AND device_episode_id IS NULL AND work_order_id IS NULL AND visit_id IS NULL;

-- ══ الفهارس ═════════════════════════════════════════════════════════════
--  طابورُ القرار السريع يقرأ المعلَّق **السريعَ وحده** بالفرع، بالأقدم.
CREATE INDEX IF NOT EXISTS ix_mrr_quick_queue
  ON medical_review_requests (branch_id, created_at)
  WHERE status = 'pending' AND requested_path = 'quick';

--  وصفحةُ المريض تقرأ تاريخَه كلَّه.
CREATE INDEX IF NOT EXISTS ix_mrr_patient
  ON medical_review_requests (patient_id, created_at DESC);

--  والمنتظِرُ معاينةً كاملة — المُحالُ والمُرسَلُ كاملاً معاً — يُقرأ من
--  قائمة عمل الطبيب وخريطة الانتظار.
CREATE INDEX IF NOT EXISTS ix_mrr_awaiting_exam
  ON medical_review_requests (patient_id, service_type)
  WHERE status = 'escalated' OR (status = 'pending' AND requested_path = 'full');

--  الفهرس القديم لم يعد يخدم استعلاماً — يُسقَط كي لا تكلّف الكتابةُ ثمناً
--  بلا مقابل. (والاسم القديم لطابور المعلَّق كذلك.)
DROP INDEX IF EXISTS ix_mrr_escalated;
DROP INDEX IF EXISTS ix_mrr_pending_queue;
`;
