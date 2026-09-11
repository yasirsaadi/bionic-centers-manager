// تدريبُ الموظّفين — طبقةٌ فوق المعرفة الموثوقة القائمة، لا نسخةٌ ثانية منها.
//
// ══ الواقعة ═════════════════════════════════════════════════════════════
// المساعد يشرح مسارات العمل فعلاً (`ai_knowledge_articles`، ترحيل ٠٧٥)، لكن
// بلا هيكلٍ تدريبيّ: لا مسارَ منظَّماً لموظّفٍ جديد، ولا تتبّعَ لما أنجزه، ولا
// اختباراً يقيس الفهم. والقرارُ الحاكم صريح: **الموظّف لا يدرّب المساعد** —
// المعرفةُ الموثوقة تبقى مصدرَ الحقيقة الوحيد، والمسؤولُ العام وحده يعتمدها؛
// التدريبُ يُبنى **فوقها** لا يكرّرها.
//
// ══ لا نسخَ نصٍّ — إشارةٌ لا تكرار ═══════════════════════════════════════
// `training_modules.knowledge_article_ids` أرقامُ مقالاتٍ (كـ`payments.visit_id`
// و`proposed_expert_user_id` — لقطةُ رقمٍ لا مفتاحاً أجنبياً صارماً، فحذفُ
// جدول التدريب مستقبلاً لا يعطّل كاسكيد المعرفة ولا العكس). ولا نصَّ المقالة
// يُنسَخ إلى الوحدة أبداً — الدرسُ يُبنى حيّاً من متن المقالة **الفعّالة
// حالياً** في هذه السلسلة (راجع `resolveActiveArticleChain` في
// `server/training/store.ts`)، فتعديلُ المسؤول لاحقاً يصل الدرسَ فوراً بلا
// أثرٍ باقٍ من النسخة القديمة.
//
// ══ الجمهورُ — قدرةٌ لا دورٌ حصريّ ═══════════════════════════════════════
// `ai_knowledge_articles.audience` عمودٌ **إضافيّ اختياريّ** (`NULL` افتراضاً
// على كلّ صفٍّ قائم — لا تغييرَ في سلوك أيّ مقالةٍ من ٠٧٥): غيابُه يبقي
// قاعدة `scope` القديمة كما هي بالحرف (المال والإدارة محجوبان بشرطٍ، والبقيّة
// مفتوحة). ووجودُه (مصفوفةُ قدراتٍ من `shared/ai_capabilities.ts`) يضيف
// **فلترةً إضافية**: تقاطعٌ لا حصر — مقالةُ تصنيعٍ قد تخصّ الخبير والمديرَ
// والمسؤولَ معاً. `training_tracks.audience` بنفس المفردة تماماً، **إلزاميّ**
// هنا (بلا `NULL`) لأن كلّ مسار تدريبٍ يُبنى لجمهورٍ محدَّد أصلاً.
//
// ══ الكتابةُ الوحيدة الجديدة: تقدّمُ التدريب ═══════════════════════════════
// `employee_training_progress` — الجدولُ الوحيد الذي يكتبه المساعدُ نفسُه
// (عبر أداتين ضيّقتين، لا مساراً عامّاً). `status` عمودٌ واحد يحمل دورةَ
// الحياة **والنتيجة** معاً (`started`⟶`completed`/`needs_review`/`practice_only`)
// — **لا عمود `result` ثانٍ يكرّر القيمة نفسَها** لوحدات الاختبار: أيّ محاولةٍ
// منتهية تحمل نتيجتها في `status` مباشرة، وعمودان يجب أن يتّفقا دائماً أسوأ
// من عمودٍ واحد. `answer_summary` يحمل «بياناتِ التقييم المدمَجة للتدقيق»
// (مفاهيمُ تحقّقت/فاتت وعدد الإجابة المقتطَع) — لا نصَّ محادثةٍ كاملاً، نفسُ
// مبدأ تقليل البيانات في سطر `ai_chat`.
//
// ══ إضافيّ، idempotent، بلا DROP ولا DELETE ═════════════════════════════
// عمودان جديدان على جدولٍ قائم (كلاهما NULLable/بقيمةٍ افتراضية آمنة — لا
// معنى يُكتَب على صفٍّ لم يُصنَّف)، وثلاثةُ جداولَ جديدة بالكامل، ولا مسّ
// لأيّ ترحيلٍ من ٠٠١ إلى ٠٧٥. الزرعُ بمفاتيح `seed_key` مع
// `ON CONFLICT DO NOTHING` — إعادةُ تشغيل الترحيل لا تكرّر صفاً.

export const name = "076_employee_training";

export const sql = `
-- ══ ١. توسيمُ المعرفة — جمهورٌ وقتيّ، بلا مسّ لأيّ صفٍّ قائم ══════════════
ALTER TABLE ai_knowledge_articles ADD COLUMN IF NOT EXISTS audience JSONB;
ALTER TABLE ai_knowledge_articles ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'workflow';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_articles_content_type_check'
  ) THEN
    ALTER TABLE ai_knowledge_articles
      ADD CONSTRAINT ai_knowledge_articles_content_type_check
      CHECK (content_type IN ('workflow', 'troubleshooting'));
  END IF;
END $$;

-- ══ ٢. مساراتُ التدريب ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_tracks (
  id SERIAL PRIMARY KEY,
  seed_key TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  -- إلزاميّ (بخلاف عمود المقالة الاختياري): كلّ مسارٍ يُبنى لجمهورٍ محدَّد.
  audience JSONB NOT NULL DEFAULT '["general"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT NOT NULL,
  approved_by INTEGER REFERENCES system_users(id),
  approved_by_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_tracks_title_check'
  ) THEN
    ALTER TABLE training_tracks ADD CONSTRAINT training_tracks_title_check CHECK (length(trim(title)) > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tt_active_sort ON training_tracks (is_active, sort_order);

-- ══ ٣. وحداتُ التدريب — تشير إلى مقالاتٍ، لا تنسخ نصّها ═══════════════════
CREATE TABLE IF NOT EXISTS training_modules (
  id SERIAL PRIMARY KEY,
  track_id INTEGER NOT NULL REFERENCES training_tracks(id),
  seed_key TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  -- لقطةُ أرقامٍ لا FK صارم — نفسُ درس proposed_expert_user_id (٠٣٥):
  -- حذفُ مقالةٍ (لا يقع فعلياً — لا حذفَ في هذا الجدول) لن يكسر هذا العمود،
  -- والقراءةُ تحلّ السلسلة الفعّالة حيّاً لا هذا الرقم حرفياً.
  knowledge_article_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- ما يجب أن يفهمه الموظّف بعد إنجاز الوحدة — نصوصٌ عربية قصيرة، اختياريّة.
  learning_objectives JSONB,
  -- {question, requiredConcepts:[{keywords:[...], hint}]} أو NULL لوحدةٍ بلا اختبار.
  quiz JSONB,
  -- true = لا يُصحَّح آليّاً أبداً حتى لو حمل عمودُ quiz سؤالاً — يُعرَض
  -- تدريباً بلا نجاحٍ أو رسوب مزيَّف (القسم E: mark as "practice" instead).
  practice_only BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'training_modules_title_check'
  ) THEN
    ALTER TABLE training_modules ADD CONSTRAINT training_modules_title_check CHECK (length(trim(title)) > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_tm_track_position ON training_modules (track_id, position);
CREATE INDEX IF NOT EXISTS ix_tm_active ON training_modules (is_active);

-- ══ ٤. تقدّمُ الموظّف — الكتابةُ الوحيدة الجديدة المسموحة للمساعد ═════════
CREATE TABLE IF NOT EXISTS employee_training_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES system_users(id),
  track_id INTEGER NOT NULL REFERENCES training_tracks(id),
  module_id INTEGER NOT NULL REFERENCES training_modules(id),
  status TEXT NOT NULL DEFAULT 'started',
  -- بيانات تقييمٍ مدمَجة للتدقيق فقط — مفاهيمُ تحقّقت/فاتت وعدد الإجابة
  -- المقتطَع، **لا** نصّ المحادثة الكامل (القسم F: لا تُخزَّن محادثاتٌ كاملة).
  answer_summary JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ══ صفرٌ لا واحد (مراجعةُ إكمال) — يعدّ إجاباتٍ مُرسَلة لا مرّاتِ فتحٍ.
  -- فتحُ درسٍ ليس محاولة؛ دالّةُ تصحيح الإجابة وحدها ترفعه من صفر.
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- صفٌّ واحد لكلّ (موظّف، وحدة) — محاولةٌ ثانية تُحدِّث الصفّ نفسَه، فلا
  -- يتضاعف تاريخُ التدريب بإعادة محاولة.
  UNIQUE (user_id, module_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'etp_status_check'
  ) THEN
    ALTER TABLE employee_training_progress
      ADD CONSTRAINT etp_status_check
      CHECK (status IN ('started', 'completed', 'needs_review', 'practice_only'));
  END IF;
END $$;

-- ══ اتساقٌ: مكتمِلةٌ (نجاحاً) لها ختمُ اكتمال، وما عداها بلا ختم
-- (مراجعةُ إكمال — القسم ٤) ══════════════════════════════════════════════
-- حالةُ needs_review لا تحمل ختمَ اكتمال (completed_at) — الوحدةُ لم تكتمل،
-- وتبقى «غيرَ منجَزة» في طابور الاستئناف حتى نجاحٍ لاحق. فقط حالةُ completed
-- (اختبارٌ نُجح) وpractice_only (وحدةٌ عمليّة اكتملت بفتحها) تحملانه.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'etp_completed_shape_check'
  ) THEN
    ALTER TABLE employee_training_progress
      ADD CONSTRAINT etp_completed_shape_check
      CHECK (
        (status IN ('started', 'needs_review') AND completed_at IS NULL)
        OR (status IN ('completed', 'practice_only') AND completed_at IS NOT NULL)
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_etp_user ON employee_training_progress (user_id);
CREATE INDEX IF NOT EXISTS ix_etp_track ON employee_training_progress (track_id);
CREATE INDEX IF NOT EXISTS ix_etp_module ON employee_training_progress (module_id);

-- ══ ٥. زرعُ مقالتَي معرفةٍ جديدتَين — مصدرُهما قراءةُ الكود الفعليّ في نفس
-- الجلسة (نفسُ قاعدة ٠٧٥): server/ai/tools/reports.ts لأولاهما،
-- server/ai/knowledge/store.ts لثانيتهما. **موسومتان بجمهورٍ من اليوم
-- الأوّل** — لا تصلان إلا مَن يملك القدرة المذكورة، خلافاً لبقيّة مقالات
-- ٠٧٥ (بلا audience، فتبقى على قاعدة scope القديمة فقط) ═══════════════════
INSERT INTO ai_knowledge_articles
  (seed_key, title, body, scope, audience, content_type, created_by_name, approved_by_name)
VALUES
  ('operational_reports_overview', 'التقارير التشغيلية والإدارية — الفترة مقابل الحالة الآن',
   'التقريرُ التشغيليّ يفرّق بين نوعين من الأرقام لا يجوز خلطهما: مقاييسُ **فترة** محدَّدة (مرضى جدد، زيارات، جلسات علاج طبيعي) تخصّ ما وقع بين تاريخين بعينهما، ومقاييسُ **الحالة الآن** (طابور المعاينة الحاليّ، أوامر التصنيع النشطة الآن، مرضى العلاج الطبيعي ذوو الحالة النشطة الآن) لا تتبع أي فترة ولا تدخل مقارنةً تاريخية أبداً — فهي لا تُقاس إلا لحظة الطلب. عند طلب مقارنة فترةٍ بأخرى، الخادم وحده يحسب الفرق والنسبة المئوية جاهزين؛ المساعد لا يحسبهما بنفسه أبداً. نطاق الفروع: المسؤول العام وحده يستطيع اختيار فرعٍ بعينه أو ترك الطلب مفتوحاً فيرى تفصيلاً لكل فرع، وغيره من الموظفين محصورٌ بفرعه دائماً بصرف النظر عمّا يطلبه.',
   'general', '["reports"]'::jsonb, 'workflow', 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('ai_knowledge_admin_workflow', 'إدارة معرفة المساعد واعتماد اقتراحات الموظّفين',
   'أيّ موظّفٍ مصادَق يستطيع تقديم اقتراح تصحيحٍ من داخل محادثة المساعد — الاقتراح يبقى صفّاً معلَّقاً (pending) ولا يغيّر معرفة المساعد بحرف مهما تكرّر تقديمه. المسؤول العام وحده يقرّر: اعتمادٌ يُنشئ مقالةً جديدة أو نسخةً جديدة من مقالةٍ قائمة (والنسخة القديمة تُطفَأ لا تُحذَف، فتاريخها يبقى مقروءاً)، أو رفضٌ بسببٍ إلزاميّ يُكتب. لا تصويتَ شعبياً ولا تعلّماً تلقائياً من تكرار الأسئلة — القرار وحده يفعّل معرفةً جديدة. ومسارات التدريب المبنية فوق مقالةٍ تُعدَّل لاحقاً تنتقل تلقائياً إلى النسخة المعتمَدة الجديدة دون أي تدخّل إضافي.',
   'administration', '["admin"]'::jsonb, 'workflow', 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة')

ON CONFLICT (seed_key) DO NOTHING;

-- ══ ٦. زرعُ سبعةِ مساراتٍ ═══════════════════════════════════════════════
INSERT INTO training_tracks (seed_key, title, description, audience, sort_order, created_by_name, approved_by_name)
VALUES
  ('track_reception', 'دليل الاستقبال والتسجيل',
   'تسجيل المرضى ومسارهم في النظام، والمحذوفات، وعودة مريضٍ بعد أن رفض الشراء سابقاً.',
   '["reception"]'::jsonb, 1, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_medical', 'دليل الطبيب والمعاينة',
   'مسار المريض حتى المعاينة، وتوقيعُ المعاينة وقفلُها، وما يعنيه التوقيع وعدمه.',
   '["medical"]'::jsonb, 2, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_expert', 'دليل خبير التصنيع',
   'مراحل تصنيع الطرف الصناعي، والصيانة، وبيع جزء أو قطعة بديلة على جهازٍ قائم.',
   '["expert"]'::jsonb, 3, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_physio', 'دليل العلاج الطبيعي',
   'خطة الجلسات وعدّاد العلاج الطبيعي، ومصدر عدد الجلسات المشتراة والمتبقّية.',
   '["physio"]'::jsonb, 4, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_finance', 'دليل المحاسبة',
   'الفرق بين الكلفة والدفعة، ومتى يُحتسب المبلغ إيراداً، وطلب تصحيحٍ ماليّ على دفعة.',
   '["finance"]'::jsonb, 5, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_management', 'دليل التقارير والإدارة التشغيلية',
   'قراءة التقارير التشغيلية: الفرق بين مقاييس الفترة وحالة الآن، ونطاق الفروع.',
   '["reports"]'::jsonb, 6, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),
  ('track_admin', 'دليل الإدارة العامة',
   'التصحيح الإداري لعمليةٍ خاطئة، وإدارة معرفة المساعد واعتماد اقتراحات الموظّفين.',
   '["admin"]'::jsonb, 7, 'النظام (ترحيل ٠٧٦)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة')
ON CONFLICT (seed_key) DO NOTHING;

-- ══ ٧. زرعُ خمس عشرة وحدة — بلا اختبارٍ إلا حيث معنى المفهوم لا يلتبس ═════
INSERT INTO training_modules
  (track_id, seed_key, title, description, position, knowledge_article_ids, learning_objectives, quiz, practice_only)
VALUES
  ((SELECT id FROM training_tracks WHERE seed_key = 'track_reception'), 'mod_reception_journey',
   'مسار المريض في النظام', 'الخطوات من التسجيل إلى التصنيع أو «لم يشترِ».', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'patient_journey_overview')),
   '["يعرف الفرق بين مسار الجهاز الجديد ومسار الصيانة/بيع الجزء", "يعرف أن العلاج الطبيعي لا يحتاج معاينة إلزامية"]'::jsonb,
   NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_reception'), 'mod_reception_registration',
   'تسجيل مريض جديد', 'الحقول الإلزامية وما يُدخله الاستقبال عند التسجيل.', 2,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'reception_new_patient_registration')),
   '["يعرف الحقول الإلزامية الثلاثة", "يعرف أن رمز المريض WB-xxxxx لا يتغيّر أبداً"]'::jsonb,
   jsonb_build_object(
     'question', 'ما الحقول الإلزامية الثلاثة عند تسجيل مريض جديد؟',
     'requiredConcepts', jsonb_build_array(
       jsonb_build_object('keywords', jsonb_build_array('الاسم', 'اسم المريض'), 'hint', 'اسم المريض'),
       jsonb_build_object('keywords', jsonb_build_array('الهاتف', 'رقم الهاتف', 'هاتف'), 'hint', 'رقم الهاتف'),
       jsonb_build_object('keywords', jsonb_build_array('الفرع', 'فرع'), 'hint', 'الفرع')
     )
   ), FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_reception'), 'mod_reception_trash',
   'حذف مريض واستعادته', 'السلّة ومهلة الاستعادة، ومن يملك حذف أو استعادة ملفٍّ.', 3,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'patient_trash_restore')),
   '["يعرف أن الحذف العادي لا يمحو شيئاً", "يعرف من يستطيع الاستعادة خلال المهلة"]'::jsonb,
   NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_reception'), 'mod_reception_return_to_purchase',
   'عاد للشراء بعد رفضٍ سابق', 'زرّ «عاد للشراء» ومتى يُستعمَل.', 4,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'return_to_purchase')),
   '["يعرف أن الزرّ لا ينشئ مريضاً أو معاينة جديدة من الصفر"]'::jsonb,
   NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_medical'), 'mod_medical_journey',
   'مسار المريض حتى المعاينة', 'من التسجيل إلى دور الطبيب في السلسلة.', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'patient_journey_overview')),
   '["يعرف متى تكون المعاينة إلزامية ومتى لا تكون"]'::jsonb, NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_medical'), 'mod_medical_exam',
   'معاينة الطبيب وتوقيعها', 'التوقيع والقفل، ومن يملك التعديل لاحقاً.', 2,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'medical_exam_workflow')),
   '["يعرف أن المعاينة تُقفَل بعد التوقيع ولا تُمحى", "يعرف أن المعاينة لا تحدّد سعراً أو خبيراً"]'::jsonb,
   jsonb_build_object(
     'question', 'من يملك تعديل معاينةٍ موقّعة موجودة؟',
     'requiredConcepts', jsonb_build_array(
       jsonb_build_object('keywords', jsonb_build_array('صاحب المعاينة', 'الطبيب نفسه', 'نفس الطبيب'), 'hint', 'صاحب المعاينة نفسه'),
       jsonb_build_object('keywords', jsonb_build_array('المدير المسؤول', 'مدير الفرع', 'المسؤول'), 'hint', 'المدير المسؤول')
     )
   ), FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_expert'), 'mod_expert_stages',
   'مراحل تصنيع الطرف الصناعي', 'دورة الأمر من الاستلام إلى التسليم.', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'manufacturing_stages')),
   '["يعرف مراحل الأمر بالترتيب", "يعرف أن الجهاز الجديد يحتاج معاينة موقّعة قبل بدء التصنيع"]'::jsonb,
   jsonb_build_object(
     'question', 'ما الذي يجب أن يتوفّر قبل أن يبدأ تصنيع طرفٍ صناعي جديد؟',
     'requiredConcepts', jsonb_build_array(
       jsonb_build_object('keywords', jsonb_build_array('معاينة'), 'hint', 'معاينة'),
       jsonb_build_object('keywords', jsonb_build_array('طبيب', 'دكتور', 'الطبيب'), 'hint', 'من طبيب'),
       jsonb_build_object('keywords', jsonb_build_array('موقّعة', 'موقعة', 'توقيع'), 'hint', 'موقّعة')
     )
   ), FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_expert'), 'mod_expert_maintenance',
   'فتح صيانة لجهاز', 'نافذة الصيانة المستقلّة وحساب السعر النهائي.', 2,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'maintenance_flow')),
   '["يعرف أن الصيانة لا تمرّ بمراجعة طبية", "يعرف أن «مجّاني» اختيارٌ صريح لا صفرٌ عابر"]'::jsonb,
   NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_expert'), 'mod_expert_component_sale',
   'بيع جزء أو قطعة بديلة', 'الفرق بين بيع جزءٍ على جهازٍ قائم وطلب جهازٍ كامل جديد.', 3,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'component_sale_flow')),
   '["يعرف أن الطرف الكامل الجديد لا يُباع بهذا المسار أبداً"]'::jsonb, NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_physio'), 'mod_physio_sessions',
   'خطة الجلسات وعدّاد العلاج الطبيعي', 'من أين يأتي عدد الجلسات المشتراة والمتبقّية.', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'physio_session_plan')),
   '["يعرف أن كل زيارة علاج تُنقِص العدّاد", "يعرف أن تعديل عدد الجلسات لا يحرّك مالاً"]'::jsonb,
   NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_finance'), 'mod_finance_cost_vs_payment',
   'الفرق بين الكلفة والدفعة', 'متى يُحتسب المبلغ إيراداً في التقارير.', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'cost_vs_payment')),
   '["يعرف أن الكلفة وحدها بلا دفعة ليست إيراداً"]'::jsonb,
   jsonb_build_object(
     'question', 'متى يُحتسب مبلغٌ إيراداً في تقارير النظام؟',
     'requiredConcepts', jsonb_build_array(
       jsonb_build_object('keywords', jsonb_build_array('دفعة فعلية', 'دفعة', 'قُبض', 'مقبوض', 'قبض'), 'hint', 'دفعة فعلية مقبوضة')
     )
   ), FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_finance'), 'mod_finance_correction',
   'طلب تصحيح مالي على دفعة', 'ما الذي يفتح طلب تصحيح، ومن يعتمده.', 2,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'financial_correction_request')),
   '["يعرف الفرق بين تعديلٍ فوريّ وتصحيحٍ يحتاج اعتماداً"]'::jsonb, NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_management'), 'mod_management_reports',
   'التقارير التشغيلية — الفترة مقابل الآن', 'الفرق بين مقاييس فترةٍ محدَّدة وحالةٍ حيّة الآن.', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'operational_reports_overview')),
   '["يفرّق بين مقياس فترة وحالة الآن", "يعرف أن المقارنات تُحسب في الخادم لا يدوياً"]'::jsonb, NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_admin'), 'mod_admin_reversal',
   'التصحيح الإداري لعملية خاطئة', 'خياراً «تراجع عن الشراء فقط» و«إلغاء العملية بالكامل».', 1,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'administrative_reversal')),
   '["يعرف الفرق بين الخيارين ومتى يُستعمَل كلٌّ منهما"]'::jsonb, NULL, FALSE),

  ((SELECT id FROM training_tracks WHERE seed_key = 'track_admin'), 'mod_admin_knowledge',
   'إدارة معرفة المساعد', 'دورة حياة اقتراح الموظّف حتى اعتماده أو رفضه.', 2,
   jsonb_build_array((SELECT id FROM ai_knowledge_articles WHERE seed_key = 'ai_knowledge_admin_workflow')),
   '["يعرف أن الاقتراح لا يغيّر المعرفة إلا بعد اعتمادٍ صريح"]'::jsonb,
   -- ══ سؤالٌ إيجابيّ الصياغة عمداً — لا مطابقةَ على كلمة نفيٍ قصيرة («لا»)
   -- كانت ستطابق أيَّ كلمةٍ تحويها كسلسلةٍ فرعية («لاحقاً»، «لازم») بلا معنى.
   jsonb_build_object(
     'question', 'مَن وحده يستطيع أن يعتمد اقتراح موظّفٍ ليصبح معرفةً فعّالة يقرأها المساعد؟',
     'requiredConcepts', jsonb_build_array(
       jsonb_build_object('keywords', jsonb_build_array('المسؤول العام', 'المسؤول'), 'hint', 'المسؤول العام وحده')
     )
   ), FALSE)

ON CONFLICT (seed_key) DO NOTHING;

-- ══ ٨. جمهورٌ لمقالات ٠٧٥ الأشمل تأثيراً — تصحيحُ مراجعة الإكمال (القسم ٦)
-- ═════════════════════════════════════════════════════════════════════════
-- معظمُ معرفة ٠٧٥ زُرعت بـaudience=NULL (لم يكن العمودُ موجوداً وقتها)، فسؤالٌ
-- حرّ («كيف أسوي كذا؟») لم يكن يفرّق الموظّفين بحسب اختصاصهم بعد. تحديثٌ
-- على seed_key معروفةٍ فقط، **بلا مسّ حرفٍ من أيّ متن** — UPDATE بشرطٍ
-- idempotent بطبيعته (نتيجةٌ واحدة مهما تكرّر التشغيل). شرطُ AND is_active
-- = TRUE احتياطٌ: لو عُدِّلت إحداها عبر لوحة الإدارة قبل نشر هذا الترحيل
-- (نادرٌ إذ ٠٧٦ لم يُدمَج بعد)، فلا يُكتَب على نسخةٍ سابقةٍ مسحوبة أصلاً —
-- النسخةُ الفعّالة الجديدة تحمل audience الذي اختاره مَن عدّلها حينها.
--
-- ══ جمهورٌ يتقاطع مع وحدات التدريب المزروعة أعلاه عمداً ═════════════════
-- مقالاتُ maintenance_flow وcomponent_sale_flow وmanufacturing_stages يشير
-- إليها track_expert (قدرة expert) — فجمهورُها **يجب** أن يشمل expert،
-- وإلّا رفضها الدفاعُ في العمق (دالّةُ حلّ المقالة الفعّالة) عن درس الخبير
-- نفسِه الذي زرعته هذه المقالةُ بعينها. نفسُ الشرط بين medical_exam_workflow وtrack_medical،
-- physio_session_plan وtrack_physio، cost_vs_payment/financial_correction_request
-- وtrack_finance، administrative_reversal وtrack_admin.
--
-- ══ الثلاثةُ المتروكة عمداً بلا تحديث (audience تبقى NULL) ══════════════
-- patient_journey_overview (يقرؤه track_reception وtrack_medical معاً —
-- عامٌّ فعلاً)، patient_trash_restore وreturn_to_purchase (بلا شيءٍ حسّاس
-- في متنهما، ويُشير إليهما track_reception كوعيٍ تشغيليّ لا كإجراءٍ يملكه
-- الاستقبال بالضرورة) — «إبقاءُ العامّ عامّاً» بالحرف.
UPDATE ai_knowledge_articles SET audience = '["reception","manager"]'::jsonb
  WHERE seed_key = 'reception_new_patient_registration' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["medical","manager"]'::jsonb
  WHERE seed_key = 'medical_exam_workflow' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["expert","manager"]'::jsonb
  WHERE seed_key = 'manufacturing_stages' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["expert","reception","finance","manager"]'::jsonb
  WHERE seed_key = 'maintenance_flow' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["expert","reception","finance","manager"]'::jsonb
  WHERE seed_key = 'component_sale_flow' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["physio"]'::jsonb
  WHERE seed_key = 'physio_session_plan' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["finance","reports"]'::jsonb
  WHERE seed_key = 'cost_vs_payment' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["finance","manager"]'::jsonb
  WHERE seed_key = 'financial_correction_request' AND is_active = TRUE;
UPDATE ai_knowledge_articles SET audience = '["admin","manager"]'::jsonb
  WHERE seed_key = 'administrative_reversal' AND is_active = TRUE;

-- ══ ٩. أربعُ مقالاتِ استكشاف أخطاء — content_type='troubleshooting' حقيقيّ
-- لا عموداً بلا مثال (القسم ٥، مراجعةُ الإكمال) ═══════════════════════════
-- مُشتقّةٌ من الكود الفعليّ وحده (صلاحياتُ canViewPatients/canViewPayments/
-- canViewReports في server/routes.ts، وأهليّةُ «عاد للشراء» الحتميّة في
-- server/followup/return_to_purchase_store.ts) — لا تخمين. **بلا أيّ
-- تعليمة تحايلٍ أو تجاوز صلاحية** (القسم L): كلُّها تحيل إلى طلب الصلاحية
-- من صاحب السلطة، لا إلى مسارٍ بديل. audience=NULL عمداً — بلا رقمٍ ولا
-- اسمِ مريضٍ ولا مبلغٍ في أيّ متن، فلا حاجةَ لتضييق جمهورها.
INSERT INTO ai_knowledge_articles
  (seed_key, title, body, scope, content_type, created_by_name, approved_by_name)
VALUES
  ('troubleshoot_patient_not_visible', 'لماذا لا أرى مريضاً في القوائم أو البحث؟',
   'عدمُ ظهور مريضٍ متوقَّع سببُه غالباً أحدُ اثنين. الأوّل: حسابك لا يملك صلاحية «عرض سجلّ المرضى» (canViewPatients) أصلاً — الحلُّ الوحيد طلبُها من مدير الفرع أو المسؤول العام إن كانت وظيفتك تستلزمها فعلاً، ولا مسارَ بديلاً لإظهاره بدونها. الثاني: المريضُ مسجَّلٌ في فرعٍ خارج نطاق عملك — كلُّ حسابٍ مقفولٌ على فرعه (أو فروعه المصرَّح بها)، والمسؤولُ العام وحده يرى كلّ الفروع معاً. احتمالٌ ثالث أضيق: المريضُ في «المحذوفات» (حُذف خلال آخر ثلاثين يوماً) فلا يظهر في البحث العاديّ إطلاقاً، ولا يستعيده إلا مَن يملك صلاحية الاستعادة (المسؤول العام، مديرُ الفرع، أو الطبيب).',
   'general', 'troubleshooting', 'النظام (ترحيل ٠٧٦ — مراجعةُ إكمال)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('troubleshoot_payments_not_visible', 'لماذا لا أرى مدفوعات مريض؟',
   'رؤيةُ مدفوعات مريضٍ تحكمها صلاحيةٌ منفصلة بذاتها اسمُها «عرض المدفوعات» (canViewPayments) — وهي **مختلفة** عن صلاحية إدارة المحاسبة (canManageAccounting): موظّفٌ قد يملك إحداهما بلا الأخرى تماماً. مَن يفتقد canViewPayments لا يرى قائمة الدفعات ولا المبلغ المدفوع في ملفّ المريض إطلاقاً، بصرف النظر عن أيّ صلاحيةٍ أخرى يملكها فعلاً. الحلُّ الوحيد طلبُ الصلاحية المناسبة من مدير الفرع أو المسؤول العام إن كانت وظيفتك تستلزمها.',
   'general', 'troubleshooting', 'النظام (ترحيل ٠٧٦ — مراجعةُ إكمال)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('troubleshoot_reports_not_visible', 'لماذا لا أرى التقارير؟',
   'صلاحيةُ التقارير (canViewReports) منفصلةٌ تماماً عن كلّ صلاحيةٍ أخرى — موظّفٌ يملك عرض المرضى أو حتى إدارة المحاسبة قد لا يملكها. بدونها لا يظهر التقرير المطلوب ولا أيُّ تقريرٍ آخر، وتبقى صفحاتُ التقارير التشغيلية والإدارية مغلقة. المسؤولُ العام يملكها دائماً بسلطته، وأيّ موظّفٍ آخر يحتاج مديرَ الفرع أو المسؤول العام لمنحها صراحةً — لا مسارَ آخر لفتحها.',
   'general', 'troubleshooting', 'النظام (ترحيل ٠٧٦ — مراجعةُ إكمال)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('troubleshoot_return_to_purchase_ineligible', '«عاد للشراء» لا يعطيني عمليةً مؤهَّلة',
   'زرّ «عاد للشراء» قد يظهر في ملفّ المريض بينما لا يعرض أيّ عمليةٍ مؤهَّلة عند فتحه — وهذه نتيجةٌ حقيقية ممكنة، لا عطلاً برمجياً. الأهليّةُ شرطٌ دقيق يُفحَص من القاعدة حيّاً في كلّ مرّة: طلبُ جهازٍ على مسار المعاينة تحديداً، بحالة «تمّت معاينته»، وآخِرُ قرارٍ عليه بالضبط «لم يشترِ» بلا طلبِ مراجعةٍ معلَّقٍ على الجهاز نفسِه أصلاً. فمريضٌ اشترى بالفعل، أو لم يُعايَن قطّ، أو كان آخِرُ قراره على ذلك الجهاز غير «لم يشترِ»، لا يملك عمليةً مؤهَّلة، والقائمةُ الفارغة تقول ذلك بصدقٍ لا بعطل. لا يُصطنَع مسارٌ بديل ولا عمليةٌ وهميّة لإجبار الأهليّة — الشاشةُ والخادمُ يتّفقان دائماً على النتيجة نفسِها، فإن بدا اختلافٌ بينهما فحدِّث الصفحة أوّلاً قبل افتراض عطلٍ حقيقيّ.',
   'general', 'troubleshooting', 'النظام (ترحيل ٠٧٦ — مراجعةُ إكمال)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة')

ON CONFLICT (seed_key) DO NOTHING;
`;
