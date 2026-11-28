// Migration 199: وكيلُ Opus يكتب خطّةَ العلاج الطبيعي من المعاينة (§4.ha — المرحلةُ الثانية من «المعاينة ⟵ خطّة Opus»، ٢٠٢٦-١١-٢٨).
//
// قرارُ المالك: «الوكيلُ Claude Opus نفسُه — الدقّةُ كلُّ شيء والوقتُ والكلفةُ لا يهمّان»، و«يعمل وظيفةً في الخلفية لا على الطلب»
// (Cloudflare يقطع الطلبَ نحو ١٠٠ ثانية). فـ:
//  • `physio_agent_jobs` — صفٌّ لكلّ تشغيل: حالتُه ومرحلتُه وأسئلتُه وأجوبتُها وإخفاقاتُه وقفلُه ونبضُه ونتيجتُه (للمعتمِد وحده).
//    **وظيفةٌ نشطةٌ واحدة لكلّ مريض** (`uq_paj_one_active_patient`) — فلا يكتب Opus خطّتين لمريضٍ واحد معاً.
//  • `physio_plans` — منشأُ الخطّة (`origin`: يدويّة · «اقترح خطّة» · Opus) ومعاينتُها ووظيفتُها و«خارج المكتبة» ومصادرُها،
//    وسببُ «قدُمت» (`opus_stale_reason`) حين تتغيّر المعاينة بعد الكتابة. **خطّةٌ واحدة لكلّ وظيفة** (`uq_pp_agent_job`).
//  • `physio_plan_devices.btl` — موديلُ BTL وبرنامجُه (فارغٌ حتى المرحلة ٦) وقيمُه الاحتياطية بمصدرها.
//  • `physio_protocols.max_total_sessions` — **سقفُ الجلسات مع التمديد المكتوب** لكلّ بروتوكول (لا تمديدَ يُخترع)،
//    و`origin`/`source_plan_id` لمسوّدةٍ تولد من خطّةٍ «خارج المكتبة» عند اعتمادها.
//  • `physio_exam_red_flag_reviews.forbidden_devices` — أجهزةٌ يمنعها المعتمِدُ باعتماده (اختيارية) فتطبّقها البوّابةُ الحتمية.
//  • تنبيها «خطّةُ Opus تنتظر الاعتماد» (للمعتمِدين) و«Opus يسأل» (لكاتبي المعاينة) — إضافةٌ لا حذف، والإعادةُ لا تكرّر.
// والقيودُ CHECK مكتوبةٌ هنا (قالبُ `db:push` بلاها — §4.fl)، وكلُّ قيدٍ بحارس `pg_constraint` فالإعادةُ لا تفعل شيئاً.
export const name = "199_physio_agent_jobs";

const ck = (table: string, cname: string, expr: string) => `
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${cname}') THEN
    ALTER TABLE ${table} ADD CONSTRAINT ${cname} CHECK (${expr});
  END IF;`;

/** سقفُ الجلسات مع التمديد المكتوب لكلّ بروتوكول — من نصّ كلّ بروتوكول كما في فهرس CLAUDE.md و§4.ha («بلا تمديدٍ مكتوب» = عددُه). */
export const MAX_TOTAL_SESSIONS: readonly (readonly [string, number])[] = [
  ["lbp-acute-adult", 12], ["lbp-chronic-adult", 24], ["lumbar-radiculopathy-adult", 24], ["lumbar-stenosis-geriatric", 24],
  ["neck-pain-mechanical-adult", 18], ["cervical-radiculopathy-adult", 24], ["whiplash-adult", 30], ["scoliosis-ais-pediatric", 36],
  ["subacromial-pain-adult", 18], ["calcific-shoulder-adult", 24], ["frozen-shoulder-adult", 30], ["lateral-elbow-adult", 18],
  ["carpal-tunnel-adult", 18], ["hand-oa-geriatric", 18], ["knee-oa-geriatric", 24], ["hip-oa-geriatric", 30],
  ["patellofemoral-pain-adult", 30], ["achilles-tendinopathy-adult", 18], ["plantar-heel-pain-adult", 24], ["ankle-sprain-adult", 12],
  ["knee-meniscal-adult", 30], ["acl-reconstruction-adult", 108], ["tka-geriatric", 30], ["tha-geriatric", 24],
  ["rotator-cuff-repair-adult", 42], ["distal-radius-fracture-adult", 24], ["stroke-subacute-adult", 48], ["stroke-chronic-adult", 48],
  ["sci-incomplete-adult", 48], ["parkinsons-geriatric", 36], ["multiple-sclerosis-adult", 36], ["bells-palsy-all", 24],
  ["cerebral-palsy-pediatric", 36], ["brachial-plexus-birth-pediatric", 12], ["torticollis-cmt-pediatric", 12],
  ["lower-limb-preprosthetic-adult", 48], ["lower-limb-prosthetic-gait-adult", 36], ["upper-limb-amputation-adult", 42],
  ["rheumatoid-arthritis-adult", 36], ["axial-spa-adult", 36], ["fibromyalgia-adult", 36], ["osteoporosis-falls-geriatric", 36],
  ["jia-pediatric", 24], ["lymphedema-adult", 24],
];

export const sql = `
CREATE TABLE IF NOT EXISTS physio_agent_jobs (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  exam_id INTEGER NOT NULL REFERENCES medical_exams(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  kind TEXT NOT NULL DEFAULT 'write',
  trigger TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  stage TEXT,
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  exam_fingerprint TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  qa JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_rounds INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  max_failures INTEGER NOT NULL DEFAULT 5,
  runs INTEGER NOT NULL DEFAULT 0,
  run_after TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  heartbeat_at TIMESTAMPTZ,
  cancel_requested BOOLEAN NOT NULL DEFAULT false,
  cancel_reason TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_code TEXT,
  error TEXT,
  error_detail TEXT,
  checkpoint JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by INTEGER REFERENCES system_users(id),
  requested_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$ BEGIN
${ck("physio_agent_jobs", "ck_paj_kind", "kind IN ('write','revise')")}
${ck("physio_agent_jobs", "ck_paj_trigger", "trigger IN ('exam_signed','red_flag_approved','exam_revised','manual','reconcile')")}
${ck("physio_agent_jobs", "ck_paj_status", "status IN ('queued','running','needs_answers','needs_exam_revision','succeeded','failed','cancelled')")}
${ck("physio_agent_jobs", "ck_paj_stage", "stage IS NULL OR stage IN ('reading','research','writing','review','audit','gates','questions','saving')")}
${ck("physio_agent_jobs", "ck_paj_rounds", "question_rounds BETWEEN 0 AND 3")}
${ck("physio_agent_jobs", "ck_paj_failures", "failures >= 0 AND runs >= 0 AND max_failures BETWEEN 1 AND 10 AND failures <= max_failures")}
${ck("physio_agent_jobs", "ck_paj_terminal", "status NOT IN ('succeeded','failed','cancelled','needs_exam_revision') OR finished_at IS NOT NULL")}
${ck("physio_agent_jobs", "ck_paj_reason", "status NOT IN ('failed','cancelled','needs_exam_revision') OR (error_code IS NOT NULL AND btrim(coalesce(error,'')) <> '')")}
${ck("physio_agent_jobs", "ck_paj_questions", "status <> 'needs_answers' OR jsonb_array_length(questions) > 0")}
${ck("physio_agent_jobs", "ck_paj_running_lock", "status <> 'running' OR (locked_by IS NOT NULL AND locked_at IS NOT NULL)")}
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_paj_one_active_patient ON physio_agent_jobs (patient_id)
  WHERE status IN ('queued','running','needs_answers');
CREATE INDEX IF NOT EXISTS ix_paj_claim ON physio_agent_jobs (run_after, id) WHERE status = 'queued' AND NOT cancel_requested;
CREATE INDEX IF NOT EXISTS ix_paj_running ON physio_agent_jobs (heartbeat_at) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS ix_paj_exam ON physio_agent_jobs (exam_id, id DESC);
CREATE INDEX IF NOT EXISTS ix_paj_patient ON physio_agent_jobs (patient_id);

-- ما تخطّاه المصالِحُ الدوريّ ولماذا (بوّابةٌ مغلقة، خطّةٌ قائمة، فرعٌ لا يقدّم…) — فلا يعود إليه كلَّ ١٥ ثانية ولا يحجب غيرَه عن الحدّ.
-- جدولُ ذاكرةٍ بلا مفتاحٍ أجنبيّ (رقمُ المعاينة لا يُعاد استعمالُه، وما بقي لمعاينةٍ محذوفة لا يُقرأ).
CREATE TABLE IF NOT EXISTS physio_agent_reconcile_skips (
  exam_id INTEGER PRIMARY KEY,
  reason TEXT NOT NULL,
  skipped_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS source_exam_id INTEGER REFERENCES medical_exams(id) ON DELETE SET NULL;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS agent_job_id INTEGER REFERENCES physio_agent_jobs(id) ON DELETE SET NULL;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS out_of_library BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS sources JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS opus_stale_reason TEXT;
UPDATE physio_plans p SET origin = 'suggest'
 WHERE p.origin = 'manual' AND EXISTS (SELECT 1 FROM physio_plan_suggestions s WHERE s.plan_id = p.id);
DO $$ BEGIN
${ck("physio_plans", "ck_pp_origin", "origin IN ('manual','suggest','opus')")}
${ck("physio_plans", "ck_pp_opus_only", "origin = 'opus' OR (out_of_library = false AND agent_job_id IS NULL AND opus_stale_reason IS NULL)")}
${ck("physio_plans", "ck_pp_sources_array", "jsonb_typeof(sources) = 'array'")}
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_pp_agent_job ON physio_plans (agent_job_id) WHERE agent_job_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_physio_plans_source_exam ON physio_plans (source_exam_id) WHERE source_exam_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_physio_plans_opus_status ON physio_plans (status, created_at) WHERE origin = 'opus';

ALTER TABLE physio_plan_devices ADD COLUMN IF NOT EXISTS btl JSONB;

ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS max_total_sessions INTEGER;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS source_plan_id INTEGER REFERENCES physio_plans(id) ON DELETE SET NULL;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS origin TEXT NOT NULL DEFAULT 'library';
DO $$ BEGIN
${ck("physio_protocols", "ck_pprot_max_total", "max_total_sessions IS NULL OR max_total_sessions BETWEEN 1 AND 300")}
${ck("physio_protocols", "ck_pprot_origin", "origin IN ('library','opus')")}
END $$;
UPDATE physio_protocols p SET max_total_sessions = GREATEST(v.n, COALESCE(p.total_sessions, 1))
  FROM (VALUES ${MAX_TOTAL_SESSIONS.map(([c, n]) => `('${c}', ${n})`).join(", ")}) AS v(code, n)
 WHERE p.code = v.code AND p.max_total_sessions IS NULL;

ALTER TABLE physio_exam_red_flag_reviews ADD COLUMN IF NOT EXISTS forbidden_devices JSONB NOT NULL DEFAULT '[]'::jsonb;
DO $$ BEGIN
${ck("physio_exam_red_flag_reviews", "ck_pefr_forbidden_array", "jsonb_typeof(forbidden_devices) = 'array'")}
END $$;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_opus_plan_ready' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false))
ON CONFLICT DO NOTHING;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_opus_questions' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false)
        OR u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist'
        OR ((u.role = 'doctor' OR COALESCE(u.can_write_medical_exam, false))
            AND COALESCE(u.medical_specialties, '[]'::jsonb) ? 'physiotherapy'))
ON CONFLICT DO NOTHING;
`;
