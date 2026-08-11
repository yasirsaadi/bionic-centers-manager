// Migration 044: سجل أحداث المريض.
//
// سرد واحد لما حدث للمريض عبر كل الأقسام — التصنيع والمال والعيادة
// والمواعيد لاحقاً — في مكان واحد مرتّب زمنياً. لا يوجد اليوم في النظام
// شيء كهذا: «تنبيهات» التسليم وكشف الشذوذ ومكالمات المتابعة كلها محسوبة
// لحظياً ولا تُخزَّن، و`prosthetic_work_history` مقصور على داخل أمر تصنيع
// واحد.
//
// ── ما هو، وما ليس هو ─────────────────────────────────────────────────────
// **سرد مشتقّ لا مصدر حقيقة**. يُكتب بعد نجاح العمل التجاري وداخل معاملته
// نفسها، ولا يملك شيئاً: لا مالاً، ولا رصيداً، ولا حالة تصنيع، ولا موعداً،
// ولا حالة مريض. ولا يقرأ منه أحد ليقرّر شيئاً. مخالفة هذا تُنشئ مصدر
// حقيقة ثانياً — وهو ما دُفع ثمنه سابقاً في كلف الحالات وخطط الجلسات.
//
// ── مفتاح أجنبي واحد فقط ─────────────────────────────────────────────────
// إلى `patients` وحده. و`case_id` و`source_id` و`branch_id` و
// `actor_user_id` لقطات بلا مفاتيح، بنفس درس `payments.visit_id` و
// `medical_exams.proposed_expert_user_id`: المفتاح الأجنبي هنا كان سيقيّد
// ترتيب كاسكيد الحذف ويكسر الدمج حين تتحرّك صفوف الحالات.
//
// ── غير قابل للتعديل، لكن الحذف يعمل ────────────────────────────────────
// ترِكر `BEFORE UPDATE` يرفض كل تعديل إلا عبر الباب المراقَب
// `app.allow_event_edit` (نفس نمط ختم المعاينات في 028). ومستعمِله الوحيد
// المشروع هو إعادة توجيه الأحداث في `mergePatients`.
// و**`DELETE` غير محروس عمداً**: كاسكيد `deletePatient` يحتاجه، ومنعه كان
// سيعطّل حذف المريض لكل المستخدمين — وهي علّة وقعت في هذا المشروع من قبل.
//
// ── نطاق منع التكرار: لكل مريض لا عالمي ─────────────────────────────────
// `UNIQUE (patient_id, dedupe_key) WHERE dedupe_key IS NOT NULL`.
// المعنى المطلوب هو «هذا المريض لا يأخذ هذا الحدث مرّتين»، وهذا يترك تصميم
// المفاتيح حرّاً بلا اشتراط رقم عالمي في كلٍّ منها. وثمنه أن الدمج قد
// يواجه تصادماً حقيقياً حين يحمل الملفان المفتاح نفسه — يعالجه
// `storage.mergePatients` صراحةً قبل إعادة التوجيه.
//
// إضافي بالكامل: لا عمود يُحذف، ولا نوع يتغيّر، ولا جدول قائم يُمسّ.

export const name = "044_patient_events";

export const sql = `
CREATE TABLE IF NOT EXISTS patient_events (
  id              BIGSERIAL PRIMARY KEY,
  -- المفتاح مُسمّى صراحةً بالاسم الذي يولّده Drizzle، لا بالاسم الافتراضي
  -- من Postgres (patient_events_patient_id_fkey). فالاسمان يصفان القيد
  -- نفسه، لكن drizzle-kit يقارن بالاسم — فاختلافه يجعل db:push يرى فرقاً
  -- دائماً ويحاول إعادة بناء المفتاح. نفس عائلة فرق DESC NULLS LAST أدناه.
  patient_id      INTEGER NOT NULL
                  CONSTRAINT patient_events_patient_id_patients_id_fk
                  REFERENCES patients(id),
  branch_id       INTEGER,
  case_id         INTEGER,
  case_type       TEXT,
  event_type      TEXT NOT NULL,
  source_type     TEXT,
  source_id       BIGINT,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  visibility      TEXT NOT NULL DEFAULT 'internal',
  actor_user_id   INTEGER,
  actor_name      TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  dedupe_key      TEXT,
  -- آخر خطّ دفاع عن الوجهة. السياسة تُفرَض في resolveVisibility قبل كل
  -- كتابة، لكن القاعدة لا تعرف السياسة — وقيمة ثالثة تتسلّل من كتابة
  -- مباشرة أو ترحيل لاحق كانت ستُقرأ «ليست internal» في كل استعلام يبحث
  -- عن الداخلي. القيد يجعل ذلك مستحيلاً لا مستبعَداً.
  CONSTRAINT patient_events_visibility_check
    CHECK (visibility IN ('internal', 'patient'))
);

-- الجدول الزمني لمريض واحد — أكثر قراءة متوقَّعة.
--
-- "DESC NULLS LAST" صراحةً لا "DESC" وحدها: افتراض Postgres مع DESC هو
-- NULLS FIRST، بينما .desc() في Drizzle تُصدر NULLS LAST. فترك الافتراض
-- هنا يجعل ملف المخطّط يخالف القاعدة، و db:push يرى فرقاً دائماً فيُعيد
-- بناء الفهارس في كل مرّة — وهي نفس عائلة الفخّ الذي عالجه PR #194.
-- الأثر العملي معدوم (occurred_at غير قابل لأن يكون NULL أصلاً)، لكن
-- التطابق الحرفي بين الملف والقاعدة قاعدة في هذا المشروع لا تُخرَق.
CREATE INDEX IF NOT EXISTS idx_patient_events_patient
  ON patient_events (patient_id, occurred_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_patient_events_branch
  ON patient_events (branch_id, occurred_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_patient_events_type
  ON patient_events (event_type, occurred_at DESC NULLS LAST);

-- منع التكرار. جزئي لأن أغلب الأحداث بلا مفتاح، ولا فائدة من فهرستها.
CREATE UNIQUE INDEX IF NOT EXISTS uq_patient_events_dedupe
  ON patient_events (patient_id, dedupe_key) WHERE dedupe_key IS NOT NULL;

-- ── الختم: إلحاق فقط ──────────────────────────────────────────────────────
-- الباب الوحيد للتعديل هو المتغيّر المراقَب، ويُفتح داخل معاملة فقط:
--   BEGIN; SET LOCAL app.allow_event_edit = 'on'; UPDATE ... ; COMMIT;
-- فمسار الدمج المدقَّق يفتحه صراحةً ويغلقه بعده، وأي تعديل شارد من Console
-- أو سكربت أو خطأ برمجي يبقى مرفوضاً.
CREATE OR REPLACE FUNCTION reject_patient_event_update() RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.allow_event_edit', true) = 'on' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION
    'patient_events is append-only: UPDATE rejected. The only sanctioned edit is the merge repoint, which opens app.allow_event_edit inside its transaction.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_patient_events_sealed ON patient_events;
CREATE TRIGGER trg_patient_events_sealed
  BEFORE UPDATE ON patient_events
  FOR EACH ROW EXECUTE FUNCTION reject_patient_event_update();
`;
