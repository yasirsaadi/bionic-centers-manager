// Migration 198: اعتمادُ العلامة الحمراء في معاينة العلاج الطبيعي الإلزامية (§4.gz — ٢٠٢٦-١١-٢٧).
//
// قرارُ المالك: «أيُّ "نعم" ⟵ يظهر الإجراءُ العاجل للفاحص فوراً، وتُحفظ المعاينة، ويقف الوكيل؛ يكتب الفاحصُ ملاحظةً ويضغط «أرسل للاعتماد»،
// فيصل تلغرامُ المالك وسليم وتنبيهٌ في التطبيق؛ والمعتمِدُ يعتمد بملاحظةٍ إلزامية أو يرفض فيتوقّف، ولا يعود إلّا بمعتمِد. ومَن يفحص وهو
// معتمِدٌ يكفي اعتمادُه في الخطوة نفسِها».
//  • `physio_exam_red_flag_reviews` — صفٌّ لكلّ طلب (المعاينةُ مختومةٌ فلا تُكتب الحالةُ عليها)، والقرارُ وملاحظتاه، ولقطةُ العلامات.
//    **طلبٌ مفتوحٌ واحد لكلّ معاينة** (`uq_pefr_one_open`)، والقرارُ لا يكون بلا ملاحظةٍ ووقت (CHECK). وملاحظةُ المرسِل لا تكون فارغةً نصّاً،
//    ولا يكون معلَّقٌ بلاها؛ و`NULL` لقرار معتمِدٍ مباشرٍ على معاينة غيره وحده (لا يكتب «ملاحظةَ الفاحص» عن غيره).
//  • تنبيهُ «علامةٌ حمراء تنتظر الاعتماد» يُفعَّل للمسؤولين وحاملي الإشراف العام، و«قرارُ العلامة الحمراء» لمن يكتب معاينةَ العلاج الطبيعي
//    (الأخصائيّ والمشرف والمسؤول والطبيبُ باختصاص العلاج الطبيعي) — إضافةٌ لا حذف، والإعادةُ لا تكرّر.
export const name = "198_physio_exam_red_flag_reviews";

export const sql = `
CREATE TABLE IF NOT EXISTS physio_exam_red_flag_reviews (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL REFERENCES medical_exams(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER REFERENCES branches(id),
  flags JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  examiner_note TEXT,
  decision_note TEXT,
  requested_by INTEGER,
  requested_by_name TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by INTEGER,
  decided_by_name TEXT,
  decided_at TIMESTAMPTZ
);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pefr_status') THEN
    ALTER TABLE physio_exam_red_flag_reviews ADD CONSTRAINT ck_pefr_status CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pefr_decided') THEN
    ALTER TABLE physio_exam_red_flag_reviews ADD CONSTRAINT ck_pefr_decided
      CHECK (status = 'pending' OR (decision_note IS NOT NULL AND btrim(decision_note) <> '' AND decided_at IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pefr_examiner_note') THEN
    ALTER TABLE physio_exam_red_flag_reviews ADD CONSTRAINT ck_pefr_examiner_note CHECK (examiner_note IS NULL OR btrim(examiner_note) <> '');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_pefr_pending_note') THEN
    ALTER TABLE physio_exam_red_flag_reviews ADD CONSTRAINT ck_pefr_pending_note CHECK (status <> 'pending' OR examiner_note IS NOT NULL);
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pefr_one_open ON physio_exam_red_flag_reviews (exam_id) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS ix_pefr_status ON physio_exam_red_flag_reviews (status, requested_at);
CREATE INDEX IF NOT EXISTS ix_pefr_patient ON physio_exam_red_flag_reviews (patient_id);
CREATE INDEX IF NOT EXISTS ix_pefr_exam ON physio_exam_red_flag_reviews (exam_id);

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_exam_red_flag_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false))
ON CONFLICT DO NOTHING;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_exam_red_flag_decided' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false)
        OR u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist'
        OR ((u.role = 'doctor' OR COALESCE(u.can_write_medical_exam, false))
            AND COALESCE(u.medical_specialties, '[]'::jsonb) ? 'physiotherapy'))
ON CONFLICT DO NOTHING;
`;
