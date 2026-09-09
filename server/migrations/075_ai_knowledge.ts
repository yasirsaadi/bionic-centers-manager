// طبقةُ المعرفة الموثوقة للمساعد الذكي — «AI Assistant v2».
//
// ══ الواقعة ═════════════════════════════════════════════════════════════
// `GENERAL_SYSTEM_PROMPT` في `server/ai/chat.ts` كان يحمل شرح مسارات العمل
// (التسجيل، المعاينة، التصنيع، الصيانة، العلاج الطبيعي…) **مكتوباً حرفياً
// في الشيفرة**. نافعٌ، لكنه يشيخ مع كل تطويرٍ لاحق للنظام — وتصحيحه يحتاج
// نشر كودٍ جديد بدل تحريرٍ يقوم به المسؤول العام مباشرة.
//
// ══ الحلّ — جدولان، لا واحد ═════════════════════════════════════════════
// `ai_knowledge_articles` — المعرفةُ **المعتمَدة الفعّالة** التي يقرأها
// المساعد فعلاً. لا تُمحى صفوفها ولا يُكتَب فوقها: تعديلٌ يُنشئ صفّاً
// جديداً (`supersedes_id` يشير للقديم، والقديم يُطفَأ `is_active=false`)
// فيبقى التاريخ الكامل مقروءاً — نفسُ مبدأ ٠٦١/٠٦٨ («لا شيء يُحذف، الحالة
// تتغيّر»).
//
// `ai_knowledge_suggestions` — اقتراحُ تصحيحٍ من موظّف. **لا يغيّر المعرفة
// الفعّالة بذاته أبداً** — يبقى `pending` حتى يقرّر المسؤول العام صراحةً
// (موافقةً أو رفضاً)، ولا يُحذف الصفّ في الحالتين — القرارُ يُسجَّل لا
// يُمحى، فيبقى سجلّاً كاملاً لمن اقترح ومتى وبماذا وماذا قرَّر المسؤول.
//
// ══ مستقلٌّ عن `ai_memory_notes` عمداً ═══════════════════════════════════
// ذاك الجدول سياقٌ يقرؤه مفسِّر الشذوذ الإحصائي (`server/ai/explain_anomaly.ts`)
// وحده — **لا علاقة له بالمساعد المحادثي إطلاقاً** (تأكَّد من هذا بقراءة
// كامل الكود قبل هذا الترحيل). خلطُ الدلالتين كان سيجعل ملاحظة «رمضان يزيد
// الضيافة» تظهر كخطوة عمل للموظّف، أو مقالة عمل تُقرأ كسياقٍ محاسبي.
//
// ══ إضافيّ، idempotent، بلا DROP ولا DELETE ═════════════════════════════
// جدولان جديدان بالكامل — لا مسّ لأيّ ترحيلٍ من ٠٠١ إلى ٠٧٤. الزرعُ
// (seed) في ذيل هذا الملف مفتاحُه `seed_key` مع `ON CONFLICT DO NOTHING`،
// فإعادةُ تشغيل الترحيل (نشرٌ فاشل يُعاد) لا يُكرّر صفاً واحداً.

export const name = "075_ai_knowledge";

export const sql = `
CREATE TABLE IF NOT EXISTS ai_knowledge_articles (
  id SERIAL PRIMARY KEY,
  seed_key TEXT UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scope TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  supersedes_id INTEGER REFERENCES ai_knowledge_articles(id),
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT NOT NULL,
  approved_by INTEGER REFERENCES system_users(id),
  approved_by_name TEXT NOT NULL,
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_articles_scope_check'
  ) THEN
    ALTER TABLE ai_knowledge_articles
      ADD CONSTRAINT ai_knowledge_articles_scope_check
      CHECK (scope IN ('general','reception','medical','manufacturing','physiotherapy','finance','administration'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_articles_title_check'
  ) THEN
    ALTER TABLE ai_knowledge_articles
      ADD CONSTRAINT ai_knowledge_articles_title_check
      CHECK (length(trim(title)) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_articles_body_check'
  ) THEN
    ALTER TABLE ai_knowledge_articles
      ADD CONSTRAINT ai_knowledge_articles_body_check
      CHECK (length(trim(body)) > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_aika_active_scope ON ai_knowledge_articles (is_active, scope);
CREATE INDEX IF NOT EXISTS ix_aika_branch ON ai_knowledge_articles (branch_id);
CREATE INDEX IF NOT EXISTS ix_aika_supersedes ON ai_knowledge_articles (supersedes_id);

CREATE TABLE IF NOT EXISTS ai_knowledge_suggestions (
  id SERIAL PRIMARY KEY,
  submitted_by INTEGER NOT NULL REFERENCES system_users(id),
  submitted_by_name TEXT NOT NULL,
  submitted_by_role TEXT,
  branch_id INTEGER REFERENCES branches(id),
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_question TEXT,
  source_answer TEXT,
  referenced_article_ids JSONB,
  suggested_text TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  decided_by INTEGER REFERENCES system_users(id),
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  resulting_article_id INTEGER REFERENCES ai_knowledge_articles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_suggestions_status_check'
  ) THEN
    ALTER TABLE ai_knowledge_suggestions
      ADD CONSTRAINT ai_knowledge_suggestions_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_suggestions_reason_check'
  ) THEN
    ALTER TABLE ai_knowledge_suggestions
      ADD CONSTRAINT ai_knowledge_suggestions_reason_check
      CHECK (length(trim(reason)) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_suggestions_suggested_text_check'
  ) THEN
    ALTER TABLE ai_knowledge_suggestions
      ADD CONSTRAINT ai_knowledge_suggestions_suggested_text_check
      CHECK (length(trim(suggested_text)) > 0);
  END IF;
END $$;

-- ══ اتساقُ القرار — لا صفَّ نصفَ محسوم ═══════════════════════════════════
-- 'pending' بلا حاسمٍ ولا وقت قرار، أو محسومٌ ('approved'/'rejected') وله
-- الاثنان معاً. يمنع صفّاً «مقرَّراً» بلا مَن قرَّره ومتى — القاعدةُ نفسُها
-- التي أثبتها psc_returned_shape_check (٠٦٧) على شكلٍ مختلف.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ai_knowledge_suggestions_decision_shape_check'
  ) THEN
    ALTER TABLE ai_knowledge_suggestions
      ADD CONSTRAINT ai_knowledge_suggestions_decision_shape_check
      CHECK (
        (status = 'pending' AND decided_by IS NULL AND decided_at IS NULL)
        OR (status IN ('approved', 'rejected') AND decided_by IS NOT NULL AND decided_at IS NOT NULL)
      );
  END IF;
END $$;

-- بابُ القائمة الوحيد الذي يحتاجه المسؤول: «ما المعلَّق؟» — فهرسٌ جزئيّ لا
-- فهرسَ كاملاً على عمودٍ ثلاثيّ القيم.
CREATE INDEX IF NOT EXISTS ix_aiks_pending ON ai_knowledge_suggestions (status);
CREATE INDEX IF NOT EXISTS ix_aiks_submitter ON ai_knowledge_suggestions (submitted_by);
CREATE INDEX IF NOT EXISTS ix_aiks_branch ON ai_knowledge_suggestions (branch_id);

-- ══ الزرعُ — مجموعةٌ صغيرة مؤكَّدة من الكود الحاليّ، لا افتراضات ═══════════
-- كلُّ مقالةٍ هنا مصدرُها قراءةُ الكود الفعليّ (وثيقةُ CLAUDE.md المطابقة
-- له) في نفس الجلسة التي كتبت هذا الترحيل. ما لم يُتحقَّق منه لم يُزرَع —
-- لا تخمين، ولا نقل حرفيّ من توثيقٍ قديم قد يكون شاخ.
--
-- created_by/approved_by فارغان عمداً (لا مستخدم بشريّ وراء الزرع)،
-- واللقطتان النصّيتان تقولان ذلك صراحةً بدل أن تُنسَبا زوراً لأحد.
INSERT INTO ai_knowledge_articles
  (seed_key, title, body, scope, created_by_name, approved_by_name)
VALUES
  ('patient_journey_overview', 'مسار المريض في النظام',
   'مسار المريض: يبدأ بالتسجيل في الاستقبال (الاسم، الهاتف، الفرع، ونوع الإصابة إن كان طرفاً صناعياً أو مسنداً طبياً أو علاجاً طبيعياً). طلبُ جهازٍ كاملٍ جديد (طرف صناعي أو مسند) يحتاج معاينة طبيب في اختصاصه أولاً. بعد المعاينة يُنجز موظف الاستعلامات خطوة "إتمام البيع" (السعر والخصم والخبير) فيبدأ التصنيع، أو يُسجَّل "لم يشترِ" بسبب. وبعض العمليات المحدودة على جهازٍ قائم أصلاً — الصيانة، وبيع جزء بديل عليه، وجلسات العلاج الإضافية — يفتحها الاستقبال مباشرة بسعرها وخصمها بلا انتظار معاينة طبيب إطلاقاً؛ هذه ليست استثناءً نادراً بل مسارها المعتاد. العلاج الطبيعي منفصل تماماً: لا يحتاج جهازاً ولا معاينة طبيب إلزامية في أي فرع، والاستقبال يُدخل تفاصيله كاملة.',
   'general', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('reception_new_patient_registration', 'تسجيل مريض جديد',
   'يُسجَّل المريض من شاشة "مريض جديد": الاسم والهاتف والفرع إلزاميون، ومربّع موافقة واتساب مرفوعٌ افتراضياً (يُرسل رسالة ترحيب تلقائية على الرقم المسجَّل). الاستقبال يُدخل أيضاً التفاصيل الأولية للحالة السريرية عند التسجيل نفسه: تفاصيل البتر ونوعه لمريض الأطراف الصناعية، ونوع المسند وجهة الإصابة للمساند الطبية، وتشخيص الحالة لمريض العلاج الطبيعي — والمعاينة اللاحقة (إن وُجدت) تفتح على ما سجّله الاستقبال، والطبيب حرٌّ بتعديله أو تثبيته. مواصفاتُ الجهاز الفنية الدقيقة (نوع الطرف، القدم، مفصل الركبة، ونحوها) تبقى حصراً لمدير الفرع والطبيب والمسؤول العام. أما إصابات المريض وتاريخها وسببها وتصنيف المريض والملاحظات فتبقى من عمل الاستقبال كالمعتاد. حفظ الملف يُنشئ رمز مريض علنيّاً ثابتاً بصيغة WB-xxxxx لا يتغيّر أبداً.',
   'reception', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('medical_exam_workflow', 'معاينة الطبيب وتوقيعها',
   'يوقّع الطبيب المعاينة في اختصاصه (أطراف صناعية أو مساند طبية أو علاج طبيعي)، وتحمل التشخيص والوصفة. بعد التوقيع تُقفَل المعاينة تماماً: لا تُمحى ولا تُعدَّل مباشرة. أي تصحيح لاحق يكون إما بتحرير رسمي يحفظ نسخة كاملة من النص القديم، أو بإضافة ملحق منفصل. لصاحب المعاينة نفسه أو للمدير المسؤول وحدهما حق تحرير معاينة موجودة. المعاينة لا تحدّد سعراً أو خبيراً أو قرار شراء — تلك خطوات لاحقة يُنجزها موظف الاستعلامات بعد التوقيع.',
   'medical', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('manufacturing_stages', 'مراحل تصنيع الطرف الصناعي',
   'بعد إتمام بيع الجهاز يبدأ أمر التصنيع بمراحله: استلام الأمر، ثم القياسات، ثم القالب، ثم التصنيع، ثم "جاهز للتجربة"، وأخيراً التسليم. الأمر يُسنَد إلى خبير واحد يتابعه حتى النهاية. تغيير موعد التسليم لأمر قائم يتطلّب كتابة سبب صريح يظهر لاحقاً في بطاقة المريض. الطرف الصناعي أو المسند الكامل الجديد لا يبدأ تصنيعه أبداً إلا بعد معاينة طبيب موقّعة لنفس الاختصاص. أما الصيانة وبيع جزء بديل على جهاز قائم فيفتحهما الاستقبال مباشرة بسعرهما وخصمهما بلا أي دور للطبيب فيهما — لا توقيعاً ولا مراجعة لاحقة.',
   'manufacturing', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('maintenance_flow', 'فتح صيانة لجهاز',
   'تُفتح الصيانة من نافذة مخصّصة لجهاز مُسلَّم سابقاً، مستقلة تماماً عن بناء جهاز جديد ويمكن أن تجري بالتوازي معه. يُدخل الموظف السعر الأصلي للخدمة ومقدار الخصم إن وُجد، والنظام يحسب السعر النهائي تلقائياً؛ "مجّاني" اختيار صريح لا صفر عابر. العملية تُنجَز وتُسجَّل فوراً بحفظة واحدة، ولا تمرّ بطابور مراجعة طبية أبداً. لا دور للطبيب في تحديد سعر الصيانة أو خبيرها إطلاقاً — هذا عمل الاستقبال أو المحاسب أو مدير الفرع أو المسؤول العام حصراً.',
   'manufacturing', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('component_sale_flow', 'بيع جزء أو قطعة بديلة',
   'بيع جزء (كقالبٍ يبلى أو ركبة تنكسر) على جهاز قائم لا يحتاج معاينة طبية جديدة — يُفتح من نافذة "بلا معاينة" في ملف المريض. الموظف يختار القطعة والخبير ويُدخل السعر الأصلي ومقدار الخصم، فيُفتح أمر التصنيع ويُقيَّد المبلغ في حفظة واحدة. الطرف الصناعي الكامل الجديد لا يُباع بهذا المسار أبداً — ذلك قرار سريري يستوجب معاينة طبيب كاملة من البداية. هذا المسار متاح للاستقبال والمحاسب ومدير الفرع والمسؤول العام، ولا يشارك فيه الطبيب.',
   'manufacturing', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('physio_session_plan', 'خطة الجلسات وعدّاد العلاج الطبيعي',
   'عند تسعير خطة علاج طبيعي (من شاشة "الكلفة والجلسات") يُسجَّل نوع كل علاج وعدد جلساته، وهذا هو مصدر عدّاد "الجلسات المشتراة" في ملف المريض. كل زيارة علاج تُنقِص من هذا العدّاد. المرضى القدامى الذين ليس لهم خطة مسجَّلة يُحتسَب لهم من عدد جلسات الدفعات القديمة كما كان النظام دائماً. تعديل عدد الجلسات من نافذة "خطة الجلسات" لا يحرّك أي مبلغ مالي إطلاقاً — إنه تصحيح للعدّاد فقط.',
   'physiotherapy', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('cost_vs_payment', 'الفرق بين الكلفة والدفعة',
   '"كلفة المريض" رقمٌ متراكم يمثّل قيمة ما تقرّر بيعه له عبر الزمن، وتُسجَّل حركته في دفتر قيود مؤرَّخ. "الدفعة" هي مبلغ نقدي قُبض فعلياً من المريض. لا يُحتسب أي مبلغ "إيراداً" في التقارير إلا إذا كان دفعة فعلية مقبوضة — الكلفة وحدها بلا دفعة تظهر كمتبقٍّ عليه لا كوارد. مجموع قيود الدفتر لكل مريض يجب أن يساوي دائماً كلفته الكلية؛ أي انحراف بينهما يُثار كتنبيه محاسبي فوري.',
   'finance', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('financial_correction_request', 'طلب تصحيح مالي على دفعة',
   'تعديل الملاحظات وعدد جلسات الدفعة فوريّان دائماً بلا طلب. أما الحقول المالية الحسّاسة لدفعة (المبلغ، تاريخها، نوع العلاج المدفوع، وعلم "جلسات مجانية") أو حذفها بالكامل، فتغيير فعلي فيها يفتح "تصحيحاً" بسبب إلزامي ولقطة كاملة من الحالة قبل التغيير: المسؤول العام يطبّقه فوراً بلا انتظار، وأي موظف آخر يملك صلاحية التعديل أو الحذف (مدير الفرع بمن فيه) يقدّم طلباً معلَّقاً ينتظر قرار المسؤول العام — ولا يُطبَّق أي تغيير مالي فعلي حتى اعتماده صراحةً.',
   'finance', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('administrative_reversal', 'التصحيح الإداري لعملية خاطئة',
   'عندما تقع عملية بيع أو تصنيع بالخطأ، يستطيع المسؤول العام (بلا قيد فرع) أو مدير الفرع (ضمن فرعه) فتح "التصحيح الإداري" من ملف المريض. هناك خياران: "تراجع عن الشراء فقط" إن كان الطلب والمعاينة صحيحين والخطأ في ضغطة الشراء وحدها، أو "إلغاء العملية بالكامل" إن كانت العملية كلها خاطئة. كلا الخيارين يعكس الكلفة المالية تلقائياً ويحتفظ بالسجل التاريخي كاملاً — لا شيء يُحذف. "إلغاء العملية بالكامل" يبقى متاحاً حتى بعد تسليم الجهاز فعلياً — تُعكَس الكلفة وتُقفَل المتابعة، وتسليم الجهاز نفسه يبقى مسجَّلاً بصدق ولا يُمحى. أما "تراجع عن الشراء فقط" فيتوقّف بعد التسليم، لأنه يعيد الحلقة كأنها لم تُبَع بعد.',
   'administration', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('patient_trash_restore', 'حذف مريض واستعادته',
   'حذف ملف مريض لا يمحو شيئاً — الملف ينتقل إلى "المحذوفات" مع مهلة استعادة ثلاثين يوماً، وتختفي بياناته من القوائم والتقارير والبحث العادي فقط. يستطيع الاستعادة خلال المهلة: المسؤول العام، ومدير الفرع ضمن فرعه، والطبيب. إن كان على المريض أي التزام مالي أو قرار معلَّق (رصيد غير صفري، مبلغ عملية معلَّق، طلب خصم أو سعر لم يُحسَم، أو تسوية بعد تصحيح إداري) يحتاج القرار موافقة المسؤول العام حصراً، حتى لو كان رصيده الظاهر صفراً. "الحذف النهائي" الذي يمحو كل شيء فعلياً متاح فقط من داخل صفحة المحذوفات وللمسؤول العام وحده.',
   'general', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة'),

  ('return_to_purchase', 'عاد للشراء بعد أن رفض سابقاً',
   'مريض عايَنه طبيب لجهاز معيّن، ثم سجّل الاستقبال "لم يشترِ"، ثم عاد لاحقاً يريد الجهاز نفسه — لهذا زر "عاد للشراء" في ملف المريض. اختياره لا ينشئ مريضاً أو حالة أو معاينة جديدة من الصفر: الحلقة نفسها تعود إلى "بانتظار المعاينة" فيوقّع الطبيب معاينة ثانية لها، والمتابعة القديمة تبقى محفوظة بتاريخها وسببها الأصلي. لا أثر مالي لمجرد الضغط على الزر.',
   'general', 'النظام (ترحيل ٠٧٥)', 'اعتمادٌ ذاتيّ عند الترحيل — يراجعه المسؤول العام عند الحاجة')

ON CONFLICT (seed_key) DO NOTHING;
`;
