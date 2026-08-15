// Migration 049: حلقات أجهزة المريض — الأساس، بلا سلوك.
//
// ══ الكيان المفقود ══════════════════════════════════════════════════════
// المريض يشتري طرفاً صناعياً، يُصنَّع ويُسلَّم، ثم يعود بعد سنتين ليشتري
// طرفاً آخر من النوع نفسه. اليوم لا يوجد في النظام ما يمثّل **عملية شراء
// واحدة**: `patient_cases` خيطُ اختصاصٍ دائم (صفٌّ واحد لكل نوع)،
// و`prosthetic_work_orders` مهمّةُ تصنيع. فالجهاز الثاني يكتب فوق الأول —
// سعره فوق سعره، ومواصفاته فوق مواصفاته، ومعاينتُه لا تُطلَب أصلاً.
//
// ══ ولماذا كيانٌ مستقلّ لا أمر التصنيع نفسه ═════════════════════════════
// **عمرُ الحلقة يحتوي عمرَ الأمر.** تبدأ لحظة قرار الشراء — قبل المعاينة
// وقبل الخبير وقبل السعر — وتستمرّ عبر صيانات بعد سنوات. وأمرُ التصنيع
// يُنشأ في آخر تلك السلسلة، ويحمل خبيراً إلزامياً وحالةً تعني «العمل جارٍ»
// ويُصدر للمريض «بدأت إجراءات العمل». فإنشاؤه مبكّراً ليحمل «بانتظار
// معاينة» يقلب معناه في اثني عشر موضعاً ويُرسل للمريض خبراً كاذباً.
//
// وكيانٌ عمره يحتوي عمرَ آخر لا يُمثَّل به. ولذلك: الحلقة تملك **الشراء**
// (الهوية، التسلسل، الحالة، السعر المتفق عليه)، والأمر يملك **التنفيذ**
// (الخبير، المراحل، الموعد، التسليم) — ولا تُكرَّر حقيقةٌ في الاثنين.
//
// ══ وهذه الهجرة لا تغيّر شيئاً ══════════════════════════════════════════
// جدولٌ فارغ، وخمسة أعمدة كلّها `NULL` لكل صفٍّ قائم. **لا ترحيل بيانات،
// ولا صفّ يُنشأ، ولا مبلغ يتحرّك، ولا رقم يتغيّر.** بعد النشر يعمل النظام
// كما كان بايتاً ببايت، لأن كل مسار قائم يرى `NULL` فيتجاهله.

export const name = "049_patient_device_episodes";

export const sql = `
CREATE TABLE IF NOT EXISTS patient_device_episodes (
  id                SERIAL PRIMARY KEY,

  patient_id        INTEGER NOT NULL
                    CONSTRAINT patient_device_episodes_patient_id_patients_id_fk
                    REFERENCES patients(id),

  -- خيط الاختصاص الذي تنتمي إليه هذه الحلقة. **إلزامي**: شراءٌ بلا خيط
  -- لا معنى له، والحالة موجودة دائماً قبل الحلقة.
  case_id           INTEGER NOT NULL
                    CONSTRAINT patient_device_episodes_case_id_patient_cases_id_fk
                    REFERENCES patient_cases(id),

  branch_id         INTEGER
                    CONSTRAINT patient_device_episodes_branch_id_branches_id_fk
                    REFERENCES branches(id),

  -- ترتيب الجهاز داخل خيطه: ١، ٢، ٣… فيُقال «طرف صناعي #٢» بلا حساب.
  sequence_number   INTEGER NOT NULL,

  status            TEXT NOT NULL DEFAULT 'awaiting_exam',

  -- السعر المتفق عليه لهذا الجهاز وحده. يبقى صفراً في هذه الهجرة ولا
  -- يكتبه أحد بعد — نقطة اعتماده («تخصيص») تأتي في مرحلة لاحقة.
  agreed_cost       INTEGER NOT NULL DEFAULT 0,

  created_by        INTEGER
                    CONSTRAINT patient_device_episodes_created_by_system_users_id_fk
                    REFERENCES system_users(id),

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  cancel_reason     TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- الحالات الخمس، محروسةً في القاعدة لا في التطبيق: قيمةٌ مخترَعة من
  -- سكربت أو من Console تُردّ عند الكتابة لا تُكتشَف بعد شهر.
  CONSTRAINT patient_device_episodes_status_check
    CHECK (status IN ('awaiting_exam', 'examined', 'in_manufacturing', 'delivered', 'cancelled')),

  -- يقبله المفتاح المركّب في الجداول الأربعة التابعة. **قيدُ تفرّدٍ لا
  -- فهرسَ تفرّد**: «drizzle-kit push» يضيف المفاتيح الأجنبية قبل أن ينشئ
  -- الفهارس، فمفتاحٌ يشير إلى فهرسٍ لم يُنشأ بعد يسقط. والقيد داخل
  -- «CREATE TABLE» يسبقها جميعاً. ولا يضيف شرطاً على البيانات: «id»
  -- مفتاحٌ أساسي فالزوج فريدٌ حتماً.
  CONSTRAINT uq_pde_id_patient UNIQUE (patient_id, id)
);

-- لا تسلسلان متطابقان في خيطٍ واحد.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pde_case_seq
  ON patient_device_episodes (case_id, sequence_number);

-- **شراءٌ مفتوحٌ واحد لكل خيط.** المريض لا يشتري طرفين في وقتٍ واحد،
-- والفهرس الجزئي يجعل ذلك حقيقةً في القاعدة لا قاعدةً في الشيفرة.
-- (و«service_type» غير موجود عمداً: مشتقٌّ من «patient_cases.case_type»،
--  و«case_id» وحده يكفي للفهرس لأن الحالة واحدة لكل نوع.)
CREATE UNIQUE INDEX IF NOT EXISTS uq_pde_case_open
  ON patient_device_episodes (case_id)
  WHERE status NOT IN ('delivered', 'cancelled');

CREATE INDEX IF NOT EXISTS ix_pde_patient
  ON patient_device_episodes (patient_id);

-- ══ الأعمدة الخمسة — كلّها اختيارية، وكلّها NULL للصفوف القائمة ═════════

-- المعاينة: **بلا مفتاح أجنبي عمداً.** الجدول مختوم بترِكر BEFORE UPDATE
-- (هجرة 028) يرفض أي تعديل لم يفتح الباب المراقَب — و«ON DELETE SET NULL»
-- تعديلٌ، فكان المفتاح سيجعل حذف حلقةٍ يفشل. نفس درس
-- «proposed_expert_user_id» في هجرة 035 حرفياً: لقطةُ رقم لا علاقة.
ALTER TABLE medical_exams
  ADD COLUMN IF NOT EXISTS device_episode_id INTEGER;

ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS device_episode_id INTEGER;

ALTER TABLE cost_entries
  ADD COLUMN IF NOT EXISTS device_episode_id INTEGER;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS device_episode_id INTEGER;

ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS device_episode_id INTEGER;

-- المفاتيح الأربعة بسلوك NO ACTION: لا كاسكيد ولا تفريغ صامت. حذفُ حلقةٍ
-- لها أوامر أو مال **يجب** أن يفشل حتى يُحذف تابعها أوّلاً — وذلك بالضبط
-- ما يفرضه ترتيب «storage.deletePatient».
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    -- الاسم الكامل ٧٠ محرفاً وPostgres تقتطعه عند ٦٣ — وdrizzle-kit push
    -- يقتطعه بالطريقة نفسها، فالتطابق محفوظ. والفحص يسأل عن المقتطَع.
    WHERE conname = 'prosthetic_work_orders_device_episode_id_patient_device_episode'
  ) THEN
    ALTER TABLE prosthetic_work_orders
      ADD CONSTRAINT prosthetic_work_orders_device_episode_id_patient_device_episodes_id_fk
      FOREIGN KEY (device_episode_id) REFERENCES patient_device_episodes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cost_entries_device_episode_id_patient_device_episodes_id_fk'
  ) THEN
    ALTER TABLE cost_entries
      ADD CONSTRAINT cost_entries_device_episode_id_patient_device_episodes_id_fk
      FOREIGN KEY (device_episode_id) REFERENCES patient_device_episodes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payments_device_episode_id_patient_device_episodes_id_fk'
  ) THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_device_episode_id_patient_device_episodes_id_fk
      FOREIGN KEY (device_episode_id) REFERENCES patient_device_episodes(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'visits_device_episode_id_patient_device_episodes_id_fk'
  ) THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_device_episode_id_patient_device_episodes_id_fk
      FOREIGN KEY (device_episode_id) REFERENCES patient_device_episodes(id);
  END IF;
END $$;

-- **ولا فهرس بحثٍ على الأعمدة الخمسة عمداً.** كانت هنا خمسة فهارس جزئية،
-- فكسرت تطابقَ المخطّط مع الترحيل: «drizzle-kit push» لا يعرفها لأنها غير
-- معلَنة في «shared/schema.ts»، فقاعدةٌ تُبنى بالدفع تختلف عن قاعدةٍ تُبنى
-- بالترحيل — وهو بالضبط الانحراف الذي يكشفه فحص التطابق في هذا المشروع.
--
-- وحذفُها هو الصواب لا إعلانُها: كل الصفوف القائمة «NULL»، ولا استعلام
-- واحد يبحث بالحلقة بعد (هذه المرحلة أساسٌ بلا سلوك). فتأتي مع الاستعلام
-- الذي يحتاجها، **معلَنةً في الموضعين معاً**.

-- ══ سلامة مرجعية **مركّبة**: لا حلقةٌ لمريضٍ على خيط مريضٍ آخر ═══════════
-- المفاتيح المفردة تحرس الوجود لا الانتماء: صفٌّ يحمل «patient_id» للمريض
-- «أ» و«case_id» لخيط المريض «ب» يمرّ من كليهما — كلٌّ منهما صادق وحده،
-- والكذبة في الجمع بينهما. وكذلك أمرُ تصنيعٍ للمريض «أ» يشير إلى حلقة
-- المريض «ب»: ماله وتاريخه يذهبان إلى ملفٍّ ليس ملفَّه.
--
-- والحلّ في القاعدة لا في التطبيق: مفتاحٌ مركّب يطابق **الزوج** بأكمله.
-- وPostgres يشترط فهرساً فريداً على الأعمدة المشار إليها، فيُضاف.
--
-- و«MATCH SIMPLE» (السلوك الافتراضي) هو ما يجعل هذا آمناً للصفوف القائمة:
-- حين يكون «device_episode_id» فارغاً لا يُفحَص القيد إطلاقاً. فكل صفٍّ في
-- الإنتاج اليوم — وكلّها فارغة — يمرّ بلا مساس، والفحص يبدأ مع أول ربط.

DO $$
BEGIN
  -- يقبله المفتاح المركّب في «patient_device_episodes» — قيداً لا فهرساً،
  -- للسبب نفسه المشروح داخل «CREATE TABLE» أعلاه.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_patient_cases_id_patient') THEN
    ALTER TABLE patient_cases ADD CONSTRAINT uq_patient_cases_id_patient UNIQUE (patient_id, id);
  END IF;

  -- وقيدا الجدول نفسه يُضافان هنا أيضاً — لا تكراراً بل **اكتمالاً**:
  -- «CREATE TABLE IF NOT EXISTS» يتخطّى الجدول كلّه إن وُجد، فقيودُه
  -- الداخلية لا تُضاف أبداً على قاعدةٍ رأت نسخةً أسبق من هذه الهجرة —
  -- ثم يسقط المفتاح المركّب على «no unique constraint matching given keys».
  -- (وقع فعلاً على قاعدة الاختبار.) فتُذكَر هنا كي تتقارب الهجرة إلى الشكل
  -- نفسه مهما كانت الحالة التي وجدتها.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_pde_id_patient') THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT uq_pde_id_patient UNIQUE (patient_id, id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_device_episodes_status_check') THEN
    ALTER TABLE patient_device_episodes ADD CONSTRAINT patient_device_episodes_status_check
      CHECK (status IN ('awaiting_exam', 'examined', 'in_manufacturing', 'delivered', 'cancelled'));
  END IF;

  -- الحلقة وخيطها لمريضٍ واحد.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patient_device_episodes_patient_case_fk') THEN
    ALTER TABLE patient_device_episodes
      ADD CONSTRAINT patient_device_episodes_patient_case_fk
      FOREIGN KEY (patient_id, case_id) REFERENCES patient_cases (patient_id, id);
  END IF;

  -- والتوابع الأربعة: الصفّ وحلقتُه لمريضٍ واحد.
  --
  -- **ON UPDATE CASCADE** — لا ترفٌ بل ضرورة: الدمج ينقل الحلقة إلى الملفّ
  -- الهدف بتغيير «patient_id» عليها، فلولا التتالي لبقي التابع مشيراً إلى
  -- «(المصدر، الحلقة)» وهو زوجٌ لم يعد موجوداً — فيسقط الدمج في منتصفه.
  -- والتتالي يجعل التابع **يتبع حلقته** إلى الملفّ الجديد، وهو المعنى نفسه
  -- الذي كنّا سنكتبه بأيدينا. و«ON DELETE» يبقى NO ACTION: حذفُ حلقةٍ لها
  -- تابع يجب أن يفشل، وذاك ما يفرض ترتيب «storage.deletePatient».
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'prosthetic_work_orders_patient_episode_fk') THEN
    ALTER TABLE prosthetic_work_orders
      ADD CONSTRAINT prosthetic_work_orders_patient_episode_fk
      FOREIGN KEY (patient_id, device_episode_id) REFERENCES patient_device_episodes (patient_id, id) ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cost_entries_patient_episode_fk') THEN
    ALTER TABLE cost_entries
      ADD CONSTRAINT cost_entries_patient_episode_fk
      FOREIGN KEY (patient_id, device_episode_id) REFERENCES patient_device_episodes (patient_id, id) ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_patient_episode_fk') THEN
    ALTER TABLE payments
      ADD CONSTRAINT payments_patient_episode_fk
      FOREIGN KEY (patient_id, device_episode_id) REFERENCES patient_device_episodes (patient_id, id) ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'visits_patient_episode_fk') THEN
    ALTER TABLE visits
      ADD CONSTRAINT visits_patient_episode_fk
      FOREIGN KEY (patient_id, device_episode_id) REFERENCES patient_device_episodes (patient_id, id) ON UPDATE CASCADE;
  END IF;
END $$;

-- والمفاتيح المفردة تبقى **إضافةً لا بديلاً**: المركّب يحرس الانتماء،
-- والمفرد يبقى تصريحاً مقروءاً عن العلاقة في المخطّط. ولا يتعارضان.
--
-- و«medical_exams.device_episode_id» يبقى بلا مفتاح — مفرداً ومركّباً معاً —
-- للسبب نفسه: ترِكر الختم يرفض أي تعديل، وأي سلوك حذفٍ يُترجَم تعديلاً.
`;
