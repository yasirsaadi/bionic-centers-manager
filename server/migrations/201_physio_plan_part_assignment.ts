// Migration 201: إسنادُ خطّة Bionic AI بأجزائها، والبديلُ لغياب المُسنَد بموافقة المعتمِد، والجلسةُ بأجزائها (§4.hc — المرحلةُ الرابعة من «المعاينة ⟵ خطّة Bionic AI»، ٢٠٢٦-١١-٢٨).
//
// قرارُ المالك ٧: بعد الاعتماد **يُسند المعتمِدُ** (المسؤولُ أو المشرفُ العام) الخطّةَ؛ وقد تُقسم: جزءُ الأجهزة لمعالج وجزءُ التمارين لآخر (أو لشخصٍ واحد).
// **والتنفيذُ للمُسنَد إليه وحده** (والمعتمِدُ مستثنى)، وللبديل الذي يطلبه المُسنَدُ الغائب **بعد أن يعتمده المعتمِد**. فـ:
//  • `physio_plans.opus_parts` — الأجزاءُ المطلوبة للنسخة النافذة (`devices` · `exercises`)، تُكتب مع كلّ نسخة؛ ومرّةً هنا للخطط القائمة.
//  • `physio_plan_part_assignments` — صفٌّ لكلّ جزءٍ مُسنَد (المُسنَدُ الحاليّ وحده؛ التاريخُ في `audit_log`).
//  • `physio_plan_substitutions` — البديلُ لغيابٍ: كلُّ خطط المُسنَد (`plan_id` فارغ) أو خطّةٌ وحدها، والجزآن أو أحدُهما، بتاريخين وسبب؛
//    وآلةُ الحالة: pending ⟶ approved | rejected | withdrawn | lapsed ، approved ⟶ lapsed.
//  • `physio_plan_sessions.parts_required` و`physio_plan_session_parts` — الجلسةُ الواحدة بجزأيها: يفتحها مَن سجّل أوّلاً ويُكملها الآخر على الزيارة نفسِها.
//  • تفضيلا التنبيه «طلبُ بديل» (للمعتمِد) و«قرارُه» (لأدوار القسم) — كترحيل ١١٠.
// **ولا ملءَ للإسناد من `physio_plan_assignees`**: كلُّ خطّة Bionic AI معتمَدة تبدأ «بانتظار الإسناد».
// والقيودُ CHECK مكتوبةٌ هنا (قالبُ `db:push` بلاها — §4.fl)، وكلُّ قيدٍ بحارس `pg_constraint` فالإعادةُ لا تفعل شيئاً.
export const name = "201_physio_plan_part_assignment";

const ck = (table: string, cname: string, expr: string) => `
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${cname}') THEN
    ALTER TABLE ${table} ADD CONSTRAINT ${cname} CHECK (${expr});
  END IF;`;

export const sql = `
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS opus_parts TEXT[];
DO $$ BEGIN
${ck("physio_plans", "ck_pp_opus_parts", "opus_parts IS NULL OR (opus_parts <@ ARRAY['devices','exercises']::text[])")}
END $$;
UPDATE physio_plans p SET opus_parts = ARRAY(SELECT x FROM unnest(ARRAY[
    CASE WHEN EXISTS (SELECT 1 FROM physio_plan_devices d JOIN devices dv ON dv.id = d.device_id
                       WHERE d.plan_id = p.id AND dv.code <> 'exercise') THEN 'devices' END,
    CASE WHEN EXISTS (SELECT 1 FROM physio_plan_devices d JOIN devices dv ON dv.id = d.device_id
                       WHERE d.plan_id = p.id AND dv.code = 'exercise')
           OR EXISTS (SELECT 1 FROM physio_plan_phase_exercises e JOIN physio_plan_phases ph ON ph.id = e.phase_id
                       WHERE ph.plan_id = p.id) THEN 'exercises' END]) x WHERE x IS NOT NULL)
 WHERE p.origin = 'opus' AND p.opus_parts IS NULL AND p.status IN ('approved','stopped','graduated');

CREATE TABLE IF NOT EXISTS physio_plan_part_assignments (
  plan_id          INTEGER NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  part             TEXT    NOT NULL,
  user_id          INTEGER NOT NULL REFERENCES system_users(id),
  assigned_by      INTEGER REFERENCES system_users(id),
  assigned_by_name TEXT,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_version INTEGER,
  reason           TEXT,
  seen_at          TIMESTAMPTZ,
  PRIMARY KEY (plan_id, part)
);
DO $$ BEGIN
${ck("physio_plan_part_assignments", "ck_pppa_part", "part IN ('devices','exercises')")}
END $$;
CREATE INDEX IF NOT EXISTS idx_pppa_user ON physio_plan_part_assignments(user_id);

CREATE TABLE IF NOT EXISTS physio_plan_substitutions (
  id                SERIAL PRIMARY KEY,
  assignee_id       INTEGER NOT NULL REFERENCES system_users(id),
  assignee_name     TEXT,
  substitute_id     INTEGER NOT NULL REFERENCES system_users(id),
  substitute_name   TEXT,
  requested_by      INTEGER NOT NULL REFERENCES system_users(id),
  requested_by_name TEXT,
  plan_id           INTEGER REFERENCES physio_plans(id) ON DELETE CASCADE,
  part              TEXT,
  date_from         DATE NOT NULL,
  date_to           DATE NOT NULL,
  effective_from    DATE,
  reason            TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending',
  requested_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by        INTEGER REFERENCES system_users(id),
  decided_by_name   TEXT,
  decided_at        TIMESTAMPTZ,
  decision_note     TEXT,
  withdrawn_at      TIMESTAMPTZ,
  lapsed_at         TIMESTAMPTZ,
  lapse_reason      TEXT,
  lapsed_by         INTEGER REFERENCES system_users(id),
  substitute_seen_at TIMESTAMPTZ,
  requester_seen_at  TIMESTAMPTZ
);
DO $$ BEGIN
${ck("physio_plan_substitutions", "ck_psub_part", "part IS NULL OR part IN ('devices','exercises')")}
${ck("physio_plan_substitutions", "ck_psub_status", "status IN ('pending','approved','rejected','withdrawn','lapsed')")}
${ck("physio_plan_substitutions", "ck_psub_dates", "date_to >= date_from AND date_to - date_from <= 60")}
${ck("physio_plan_substitutions", "ck_psub_not_self", "substitute_id <> assignee_id")}
${ck("physio_plan_substitutions", "ck_psub_reason", "length(btrim(reason)) BETWEEN 3 AND 500")}
${ck("physio_plan_substitutions", "ck_psub_decided", "status NOT IN ('approved','rejected') OR decided_at IS NOT NULL")}
${ck("physio_plan_substitutions", "ck_psub_effective", "status <> 'approved' OR effective_from IS NOT NULL")}
${ck("physio_plan_substitutions", "ck_psub_eff_range", "effective_from IS NULL OR (effective_from >= date_from AND effective_from <= date_to)")}
${ck("physio_plan_substitutions", "ck_psub_undecided", "status NOT IN ('pending','withdrawn') OR decided_at IS NULL")}
${ck("physio_plan_substitutions", "ck_psub_reject_note", "status <> 'rejected' OR length(btrim(COALESCE(decision_note,''))) >= 3")}
${ck("physio_plan_substitutions", "ck_psub_withdrawn", "(status = 'withdrawn') = (withdrawn_at IS NOT NULL)")}
${ck("physio_plan_substitutions", "ck_psub_lapsed", "(status = 'lapsed') = (lapsed_at IS NOT NULL AND lapse_reason IS NOT NULL)")}
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_psub_pending
  ON physio_plan_substitutions(assignee_id, COALESCE(plan_id, 0), COALESCE(part, '*')) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_psub_assignee ON physio_plan_substitutions(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_psub_substitute ON physio_plan_substitutions(substitute_id, status);
CREATE INDEX IF NOT EXISTS idx_psub_plan ON physio_plan_substitutions(plan_id) WHERE plan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_psub_pending ON physio_plan_substitutions(requested_at) WHERE status = 'pending';

ALTER TABLE physio_plan_sessions ADD COLUMN IF NOT EXISTS parts_required TEXT[];
DO $$ BEGIN
${ck("physio_plan_sessions", "ck_pps_parts_required", "parts_required IS NULL OR (cardinality(parts_required) BETWEEN 1 AND 2 AND parts_required <@ ARRAY['devices','exercises']::text[])")}
END $$;
CREATE TABLE IF NOT EXISTS physio_plan_session_parts (
  session_id         INTEGER NOT NULL REFERENCES physio_plan_sessions(id) ON DELETE CASCADE,
  part               TEXT    NOT NULL,
  recorded_by        INTEGER REFERENCES system_users(id),
  recorded_by_name   TEXT,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  plan_version       INTEGER,
  via                TEXT NOT NULL,
  substitution_id    INTEGER REFERENCES physio_plan_substitutions(id),
  note_to_specialist TEXT,
  PRIMARY KEY (session_id, part)
);
DO $$ BEGIN
${ck("physio_plan_session_parts", "ck_ppsp_part", "part IN ('devices','exercises')")}
${ck("physio_plan_session_parts", "ck_ppsp_via", "via IN ('approver','assignee','substitute')")}
${ck("physio_plan_session_parts", "ck_ppsp_via_sub", "(via = 'substitute') = (substitution_id IS NOT NULL)")}
END $$;
CREATE INDEX IF NOT EXISTS idx_ppsp_recorder ON physio_plan_session_parts(recorded_by, recorded_at);

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_substitute_pending' FROM system_users u
 WHERE COALESCE(u.is_active, true) AND (u.role = 'admin' OR COALESCE(u.can_supervise_physio, false))
ON CONFLICT DO NOTHING;
INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_substitute_decided' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (u.role IN ('physio_specialist','therapist','physio_technician','physio_trainer')
        OR COALESCE(u.extra_roles, '[]'::jsonb) ?| ARRAY['physio_specialist','therapist','physio_technician','physio_trainer'])
ON CONFLICT DO NOTHING;
`;
