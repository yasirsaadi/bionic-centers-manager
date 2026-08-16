/**
 * Migration 053 — متابعةُ ما بعد المعاينة واعتمادُ البيع
 *
 * ترحيل **إضافيٌّ بحت**: ثلاثة جداول جديدة وفهارسها. لا عمودَ يُحذف، ولا
 * جدولَ يُعاد تسميته، ولا صفَّ قائمٌ يُمَسّ، ولا مبلغَ يتحرّك. الجداول
 * القائمة كلّها تخرج من هذا الترحيل كما دخلت حرفياً.
 *
 * ══ الطبقة التي كانت ناقصة ══════════════════════════════════════════════
 *
 * بين «وقّع الطبيب المعاينة» و«بدأ التصنيع» فراغٌ يعيشه المريض فعلاً:
 * يفكّر، يستشير أهله، ينتظر راتباً، يساوم على السعر، يقارن مركزاً بآخر.
 * والنظام لم يكن يرى هذا الفراغ إطلاقاً — فمريضٌ عاين ولم يشترِ يختفي من
 * كل شاشة، ولا أحد يعرف أنه ينتظر ولا لماذا ولا متى يُتابَع.
 *
 * وهذه الطبقة **فوق** الدورة القائمة لا داخلها: لا تلمس `medical_exams`
 * ولا `patient_cases` ولا `patient_device_episodes` ولا أوامر التصنيع.
 * فالبيع حين يُعتمد يمرّ من بابه الوحيد القائم («تخصيص») لا من هنا.
 *
 * ══ لماذا لا مفتاحَ أجنبي إلى `medical_exams` ═══════════════════════════
 *
 * الجدول مختومٌ بترِكر `BEFORE UPDATE` (ترحيل ٠٢٨) يرفض أي تعديل لم يفتح
 * الباب المراقَب. والمفتاح الأجنبي بـ `ON DELETE SET NULL` **تعديل**، فكان
 * سيجعل حذف معاينةٍ يفشل — نفس درس `medical_exams.proposed_expert_user_id`
 * (ترحيل ٠٣٥) و`patient_events.case_id` (ترحيل ٠٤٤) حرفياً. فالعمود لقطةُ
 * رقم: معاينةٌ تُحذف تترك رقماً لا يُفسَّر، والمتابعة تبقى مقروءة.
 *
 * ══ التفرّد الذي يجعل الإنشاء idempotent بنيوياً ════════════════════════
 *
 * «متابعةٌ حيّةٌ واحدة لكل جهاز» **حقيقةٌ في القاعدة لا قاعدةٌ في الشيفرة**
 * — نفس نمط `uq_pde_case_open`. وفهرسان لا واحد لأن أغلب المرضى بلا حلقة:
 * `startDeviceEpisode` تُنادى من نقطة «طلب جهاز جديد» وحدها، لا عند
 * التسجيل. فالمريض ذو الحلقة يُفرَّد بحلقته، ومَن لا حلقة له يُفرَّد بـ
 * (المريض، نوع الخدمة) — وهو بالضبط ما يعنيه `hasSignedExam` القائم.
 *
 * والمنتهيتان (`closed_without_purchase`, `converted`) خارج الفهرسين عمداً:
 * جهازٌ بيع أو مريضٌ أُغلق ملفّه لا يمنع فتح متابعةٍ لجهازٍ لاحق.
 *
 * ودورةُ إعادة الفتح **لا تُنشئ صفّاً جديداً**: الصفّ نفسه يعود إلى حالةٍ
 * حيّة ويُلحق به حدثُ `reopened`. فالتاريخ يُضاف إليه ولا يُعاد كتابته.
 *
 * ══ وطلبُ سعرٍ معلَّقٌ واحد ═════════════════════════════════════════════
 *
 * `uq_pcr_one_pending` يمنع طلبين معلّقين على متابعةٍ واحدة — فلا يعتمد
 * طبيبان طلبين متناقضين في اللحظة نفسها. وهو الحارس البنيوي الذي يسند
 * القفل التصريحي في طبقة التطبيق.
 *
 * idempotent: كلّها `IF NOT EXISTS`.
 */

export const name = "053_post_exam_followup";

export const sql = `
-- ══ ١. المتابعة — صفٌّ حيٌّ واحد لكل جهاز ════════════════════════════════
CREATE TABLE IF NOT EXISTS post_exam_followups (
  id                     SERIAL PRIMARY KEY,
  patient_id             INTEGER NOT NULL REFERENCES patients(id),
  case_id                INTEGER REFERENCES patient_cases(id),
  -- الحلقة إن وُجدت. أغلب المرضى بلا حلقة (تُنشأ عند «طلب جهاز جديد» فقط).
  device_episode_id      INTEGER REFERENCES patient_device_episodes(id),
  -- لقطةُ رقم بلا مفتاح — الجدول مختوم، انظر الرأس أعلاه.
  medical_exam_id        INTEGER,
  branch_id              INTEGER REFERENCES branches(id),
  service_type           TEXT NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'awaiting_patient_decision',
  -- السعرُ المعتمد تجارياً الآن. يُبذَر من كلفة المعاينة، ولا يتغيّر إلا
  -- باعتماد طبيب/مسؤول لطلبِ تعديل. والمعاينة تبقى مختومةً بسعرها الأصلي.
  approved_price         INTEGER NOT NULL DEFAULT 0,
  -- 'exam' = سعر الطبيب كما وقّعه · 'approved_change' = تعديلٌ اعتُمد.
  price_source           TEXT NOT NULL DEFAULT 'exam',
  -- ══ الخبير المختار — يُبذَر من اقتراح الطبيب ويبقى مرناً ══════════════
  -- الطبيب **يقترح** الخبير في معاينته (ترحيل ٠٣٥)، والاستعلامات تُبقيه أو
  -- تغيّره قبل بدء العمل. فحفظُه هنا يُبقي تلك المرونة كما هي بدل أن يُسأل
  -- الطبيبُ عنه مرّةً ثانية لحظة الاعتماد — وهو ليس قراره أصلاً.
  --
  -- لقطةُ رقم بلا مفتاح أجنبي عمداً: حسابٌ يُحذف يترك رقماً يُقرأ بلا اسم
  -- ويختار الموظّف من القائمة الحيّة — نفس درس proposed_expert_user_id.
  selected_expert_user_id INTEGER,
  next_follow_up_at      TIMESTAMPTZ,
  -- استثناءٌ صريح: «لا موعد متابعة» قرارٌ مُتَّخذ لا حقلٌ مُهمَل.
  no_scheduled_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
  last_reason            TEXT,
  last_note              TEXT,
  last_contact_at        TIMESTAMPTZ,
  closed_reason          TEXT,
  closed_at              TIMESTAMPTZ,
  converted_at           TIMESTAMPTZ,
  -- أمرُ التصنيع الذي وُلد عن اعتماد الشراء — إثباتُ أن التحويل تمّ فعلاً.
  converted_work_order_id INTEGER,
  created_by             INTEGER REFERENCES system_users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- الحالات محروسةً في القاعدة لا في التطبيق وحده: قيمةٌ مخترَعة من سكربت
-- أو من Console تُردّ عند الكتابة لا تُكتشَف بعد شهر.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_exam_followups_status_check'
  ) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT post_exam_followups_status_check
      CHECK (status IN (
        'awaiting_patient_decision', 'follow_up', 'price_approval_pending',
        'price_approved_waiting_patient', 'purchase_approval_pending',
        'closed_without_purchase', 'converted'
      ));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_exam_followups_service_check'
  ) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT post_exam_followups_service_check
      CHECK (service_type IN ('prosthetic', 'medical_support'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_exam_followups_price_source_check'
  ) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT post_exam_followups_price_source_check
      CHECK (price_source IN ('exam', 'approved_change'));
  END IF;
  -- «مؤجَّل» بلا موعدٍ ولا استثناءٍ صريح حالةٌ ميتة: لا تُقال للموظّف ولا
  -- تظهر في طابور. فالقاعدة ترفضها بدل أن تُخزَّن ثم تُنسى.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'post_exam_followups_followup_date_check'
  ) THEN
    ALTER TABLE post_exam_followups ADD CONSTRAINT post_exam_followups_followup_date_check
      CHECK (
        status <> 'follow_up'
        OR next_follow_up_at IS NOT NULL
        OR no_scheduled_follow_up = TRUE
      );
  END IF;
END $$;

-- ══ متابعةٌ حيّةٌ واحدة — بالحلقة لمن له حلقة ═══════════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_pef_active_episode
  ON post_exam_followups (device_episode_id)
  WHERE device_episode_id IS NOT NULL
    AND status NOT IN ('closed_without_purchase', 'converted');

-- ══ وبـ(المريض، الخدمة) لمن لا حلقة له — وهم الأغلب ═════════════════════
CREATE UNIQUE INDEX IF NOT EXISTS uq_pef_active_legacy
  ON post_exam_followups (patient_id, service_type)
  WHERE device_episode_id IS NULL
    AND status NOT IN ('closed_without_purchase', 'converted');

CREATE INDEX IF NOT EXISTS ix_pef_patient ON post_exam_followups (patient_id);
-- طوابيرُ الشاشة: «متابعة اليوم» و«متأخّر» تُقرأان بالفرع والموعد.
CREATE INDEX IF NOT EXISTS ix_pef_branch_status ON post_exam_followups (branch_id, status);
CREATE INDEX IF NOT EXISTS ix_pef_due ON post_exam_followups (next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

-- ══ ٢. الأحداث — يُلحَق بها ولا يُعاد كتابتها ═══════════════════════════
CREATE TABLE IF NOT EXISTS post_exam_followup_events (
  id            BIGSERIAL PRIMARY KEY,
  followup_id   INTEGER NOT NULL REFERENCES post_exam_followups(id),
  patient_id    INTEGER NOT NULL REFERENCES patients(id),
  branch_id     INTEGER,
  event_type    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  reason        TEXT,
  note          TEXT,
  -- لقطةٌ كاملة لما يلزم لعرض السطر بلا join — نفس مبدأ doctor_name.
  payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_user_id INTEGER,
  actor_name    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pefe_followup
  ON post_exam_followup_events (followup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_pefe_patient
  ON post_exam_followup_events (patient_id, created_at DESC);

-- ══ ٣. طلبات تعديل السعر ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS price_change_requests (
  id                SERIAL PRIMARY KEY,
  followup_id       INTEGER NOT NULL REFERENCES post_exam_followups(id),
  patient_id        INTEGER NOT NULL REFERENCES patients(id),
  branch_id         INTEGER,
  -- لقطةُ السعر المعتمد لحظةَ الطلب — فلا يُقرأ التاريخ من حاضرٍ تغيّر.
  current_price     INTEGER NOT NULL,
  proposed_price    INTEGER NOT NULL,
  reason            TEXT NOT NULL,
  note              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending',
  requested_by      INTEGER,
  requested_by_name TEXT,
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_by        INTEGER,
  decided_by_name   TEXT,
  decided_at        TIMESTAMPTZ,
  decision_note     TEXT
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_change_requests_status_check'
  ) THEN
    ALTER TABLE price_change_requests ADD CONSTRAINT price_change_requests_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'price_change_requests_price_check'
  ) THEN
    ALTER TABLE price_change_requests ADD CONSTRAINT price_change_requests_price_check
      CHECK (proposed_price >= 0 AND current_price >= 0);
  END IF;
END $$;

-- **طلبٌ معلَّقٌ واحد لكل متابعة** — فلا يعتمد طبيبان طلبين متناقضين معاً.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pcr_one_pending
  ON price_change_requests (followup_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS ix_pcr_branch_status
  ON price_change_requests (branch_id, status);
CREATE INDEX IF NOT EXISTS ix_pcr_patient ON price_change_requests (patient_id);
`;
