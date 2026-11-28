// Migration 200: نسخُ خطّة Opus المرقّمة و«أعِده إلى Opus» وتعديلُ المعتمِد بعد الاعتماد (§4.hb — المرحلةُ الثالثة من «المعاينة ⟵ خطّة Opus»، ٢٠٢٦-١١-٢٨).
//
// قرارا المالك ٥ و٦: المعتمِدُ يعيد الخطّةَ المنتظرة إلى Opus بملاحظةٍ إلزامية؛ وبعد الاعتماد **المعتمِدُ وحده** يعدّلها (مباشرةً بسببٍ إلزاميّ أو بطلبٍ إلى Opus)،
// **وكلُّ حفظٍ نسخةٌ مرقّمة** لا تتغيّر (من ومتى ولماذا وكيف). فـ:
//  • `physio_plan_versions` — لقطةٌ كاملة للخطّة لكلّ نسخة (المراحلُ والأجهزةُ والتمارينُ بنصّ بطاقاتها والمقاييسُ والاحتياطاتُ والمصادرُ وسجلُّ البوّابات)،
//    **لا تُعدَّل** (`trg_ppv_immutable` — إلّا `patient_id` للدمج و`job_id` ⟵ NULL) **ولا تُحذف** إلّا مع خطّتها أو ملفّ المريض (`trg_ppv_nodelete`).
//  • `physio_plans.opus_version` — رقمُ النسخة النافذة؛ و`physio_plan_sessions.plan_version` — النسخةُ التي نُفّذت عليها الجلسة.
//  • `physio_agent_jobs` — وظيفةُ «تعديل» (`kind = 'revise'`، محجوزةٌ منذ ١٩٩): الإعادةُ قبل الاعتماد (`return`) أو الطلبُ بعده (`amend`)،
//    والملاحظةُ والنسخةُ الأساس، واقتراحُ Opus بعد الاعتماد بحاله (منتظرٌ · حُفظ · تُجوهل · قدُم · حلّ محلَّه غيرُه) — **اقتراحٌ منتظرٌ واحد لكلّ خطّة**.
//  • تنبيهُ «خطّةُ Opus عُدّلت — نسخةٌ جديدة وما تغيّر» (`physio_opus_plan_versioned`) لكاتبي الخطط ومنفّذيها والمعتمِدين.
// والقيودُ CHECK مكتوبةٌ هنا (قالبُ `db:push` بلاها — §4.fl)، وكلُّ قيدٍ بحارس `pg_constraint` فالإعادةُ لا تفعل شيئاً.
export const name = "200_physio_plan_versions";

const ck = (table: string, cname: string, expr: string) => `
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${cname}') THEN
    ALTER TABLE ${table} ADD CONSTRAINT ${cname} CHECK (${expr});
  END IF;`;

export const sql = `
CREATE TABLE IF NOT EXISTS physio_plan_versions (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  version INTEGER NOT NULL,
  how TEXT NOT NULL,
  reason TEXT,
  approval_note TEXT,
  snapshot JSONB NOT NULL,
  snapshot_hash TEXT NOT NULL,
  gate_log JSONB NOT NULL DEFAULT '[]'::jsonb,
  diff_summary_ar TEXT,
  job_id INTEGER REFERENCES physio_agent_jobs(id) ON DELETE SET NULL,
  acknowledged_issue_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  backfilled BOOLEAN NOT NULL DEFAULT false,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
DO $$ BEGIN
${ck("physio_plan_versions", "ck_ppv_version", "version >= 1")}
${ck("physio_plan_versions", "ck_ppv_how", "how IN ('approval','direct_edit','opus_revision')")}
${ck("physio_plan_versions", "ck_ppv_reason", "how = 'approval' OR btrim(coalesce(reason,'')) <> ''")}
${ck("physio_plan_versions", "ck_ppv_v1", "(version = 1) = (how = 'approval')")}
${ck("physio_plan_versions", "ck_ppv_snapshot", "jsonb_typeof(snapshot) = 'object'")}
${ck("physio_plan_versions", "ck_ppv_gatelog", "jsonb_typeof(gate_log) = 'array' AND jsonb_typeof(acknowledged_issue_ids) = 'array'")}
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppv_plan_version ON physio_plan_versions (plan_id, version);
CREATE INDEX IF NOT EXISTS ix_ppv_patient ON physio_plan_versions (patient_id);
CREATE INDEX IF NOT EXISTS ix_ppv_job ON physio_plan_versions (job_id) WHERE job_id IS NOT NULL;

CREATE OR REPLACE FUNCTION physio_plan_versions_immutable() RETURNS trigger AS $f$
BEGIN
  IF (to_jsonb(NEW) - 'patient_id' - 'job_id') IS DISTINCT FROM (to_jsonb(OLD) - 'patient_id' - 'job_id')
     OR (NEW.job_id IS DISTINCT FROM OLD.job_id AND NEW.job_id IS NOT NULL) THEN
    RAISE EXCEPTION 'physio_plan_versions rows are immutable';
  END IF;
  RETURN NEW;
END $f$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ppv_immutable ON physio_plan_versions;
CREATE TRIGGER trg_ppv_immutable BEFORE UPDATE ON physio_plan_versions FOR EACH ROW EXECUTE FUNCTION physio_plan_versions_immutable();

CREATE OR REPLACE FUNCTION physio_plan_versions_nodelete() RETURNS trigger AS $f$
BEGIN
  IF current_setting('bcm.allow_plan_version_delete', true) = 'on'
     OR NOT EXISTS (SELECT 1 FROM physio_plans WHERE id = OLD.plan_id) THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'physio_plan_versions rows cannot be deleted';
END $f$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_ppv_nodelete ON physio_plan_versions;
CREATE TRIGGER trg_ppv_nodelete BEFORE DELETE ON physio_plan_versions FOR EACH ROW EXECUTE FUNCTION physio_plan_versions_nodelete();

ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS opus_version INTEGER;
DO $$ BEGIN
${ck("physio_plans", "ck_pp_opus_version", "opus_version IS NULL OR (origin = 'opus' AND opus_version >= 1)")}
END $$;

ALTER TABLE physio_plan_sessions ADD COLUMN IF NOT EXISTS plan_version INTEGER;
DO $$ BEGIN
${ck("physio_plan_sessions", "ck_pps_plan_version", "plan_version IS NULL OR plan_version >= 1")}
END $$;
UPDATE physio_plan_sessions s SET plan_version = 1
  FROM physio_plans p WHERE p.id = s.plan_id AND p.origin = 'opus' AND s.plan_version IS NULL;

ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES physio_plans(id) ON DELETE SET NULL;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS revise_scope TEXT;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS revise_note TEXT;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS base_version INTEGER;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS base_job_id INTEGER;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS proposal_status TEXT;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS proposal_reason TEXT;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS proposal_decided_by INTEGER REFERENCES system_users(id);
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS proposal_decided_by_name TEXT;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS proposal_decided_at TIMESTAMPTZ;
ALTER TABLE physio_agent_jobs ADD COLUMN IF NOT EXISTS saved_version INTEGER;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_paj_trigger') THEN ALTER TABLE physio_agent_jobs DROP CONSTRAINT ck_paj_trigger; END IF;
${ck("physio_agent_jobs", "ck_paj_trigger_v2", "trigger IN ('exam_signed','red_flag_approved','exam_revised','manual','reconcile','approver_return','approver_request')")}
${ck("physio_agent_jobs", "ck_paj_revise", "(kind = 'revise') = (revise_scope IS NOT NULL)")}
${ck("physio_agent_jobs", "ck_paj_scope", "revise_scope IS NULL OR (revise_scope IN ('return','amend') AND btrim(coalesce(revise_note,'')) <> '')")}
${ck("physio_agent_jobs", "ck_paj_trig_kind", "(trigger IN ('approver_return','approver_request')) = (kind = 'revise')")}
${ck("physio_agent_jobs", "ck_paj_amend_base", "revise_scope IS DISTINCT FROM 'amend' OR base_version >= 1")}
${ck("physio_agent_jobs", "ck_paj_proposal", "proposal_status IS NULL OR (revise_scope = 'amend' AND status = 'succeeded' AND proposal_status IN ('pending','accepted','discarded','stale','superseded'))")}
${ck("physio_agent_jobs", "ck_paj_saved", "(proposal_status IS NOT DISTINCT FROM 'accepted') = (saved_version IS NOT NULL)")}
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_paj_pending_proposal ON physio_agent_jobs (plan_id) WHERE proposal_status = 'pending';
CREATE INDEX IF NOT EXISTS ix_paj_plan ON physio_agent_jobs (plan_id, id DESC) WHERE plan_id IS NOT NULL;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_opus_plan_versioned' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false)
        OR u.role IN ('physio_specialist','therapist','physio_technician','physio_trainer')
        OR COALESCE(u.extra_roles, '[]'::jsonb) ?| ARRAY['physio_specialist','therapist','physio_technician','physio_trainer']
        OR ((u.role = 'doctor' OR COALESCE(u.can_write_medical_exam, false))
            AND COALESCE(u.medical_specialties, '[]'::jsonb) ? 'physiotherapy'))
ON CONFLICT DO NOTHING;
`;
