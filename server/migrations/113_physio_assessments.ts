// Migration 113: إعادةُ التقييم وتقاريرُ النتائج (§4.cp — المرحلةُ السادسة، ٢٠٢٦-١٠-٠٨).
//
//   • physio_protocol_measures  — **مقاييسُ كلّ بروتوكولٍ الرقمية**: الاسمان والوحدة والحدّان والاتجاه. **وتُعتمد مستقلّةً عن البروتوكول**
//                                 (`physio_protocols.measures_status`) كي لا يعود بروتوكولٌ معتمَدٌ مسوّدةً لأن مقاييسه زُرعت بعده.
//   • physio_assessments        — تقييمٌ لخطّة: أوّليٌّ أو دوريٌّ أو ختاميّ، بتاريخه، والألمُ ٠–١٠، والقياساتُ **لقطةً بتعريفها يومَها**
//                                 (فتغييرُ مقاييس البروتوكول لاحقاً لا يغيّر التاريخ)، وأهدافُ الخطّة وحالُها، والقرار.
//   • physio_plans: حالةُ «graduated» (تخرّج) ومَن ومتى.
//   • زرعُ مقاييس البروتوكولات الأربعة والأربعين **مسوّداتٍ** من حقل «التقييم» فيها (`PROTOCOL_MEASURE_SEED`) — بروتوكولٌ غائبٌ برمزه يُتخطّى،
//     ومقياسٌ قائمٌ برمزه لا يُمَسّ (`ON CONFLICT DO NOTHING`).
//   • تنبيهُ «مستحقّ التقييم» الصباحيّ يُفعَّل للأخصائيّين وحاملي الإشراف كما فُعّلت تنبيهاتُ الخطط (١١٠ · ١١١).
// **ومفتاحٌ إلى `patients`** ⟵ في كاسكيد `deletePatientTx` وفي دمج الملفّات (§8).
import { MEASURE_CATALOG, PROTOCOL_MEASURE_SEED } from "@shared/physio_assessments";

export const name = "113_physio_assessments";

const lit = (v: string | null) => (v === null ? "NULL" : `'${v.replace(/'/g, "''")}'`);
const byCode = new Map(MEASURE_CATALOG.map((m) => [m.code, m]));
const seedRows = Object.entries(PROTOCOL_MEASURE_SEED).flatMap(([protocol, codes]) => codes.map((c, i) => {
  const m = byCode.get(c);
  if (!m) throw new Error(`migration 113: unknown measure ${c}`);
  return `(${lit(protocol)}, ${lit(m.code)}, ${lit(m.nameAr)}, ${lit(m.nameEn)}, ${lit(m.unitAr)}, ${lit(m.unitEn)}, ${m.min}, ${m.max}, ${m.higherIsBetter}, ${i})`;
}));

export const sql = `
ALTER TABLE physio_plans DROP CONSTRAINT IF EXISTS physio_plans_status_check;
ALTER TABLE physio_plans ADD CONSTRAINT physio_plans_status_check
  CHECK (status IN ('draft','pending','approved','returned','stopped','graduated'));
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS graduated_at TIMESTAMPTZ;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS graduated_by INTEGER REFERENCES system_users(id);
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS graduated_by_name TEXT;

ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS measures_status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE physio_protocols DROP CONSTRAINT IF EXISTS physio_protocols_measures_status_check;
ALTER TABLE physio_protocols ADD CONSTRAINT physio_protocols_measures_status_check CHECK (measures_status IN ('draft','approved'));
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS measures_approved_by INTEGER REFERENCES system_users(id);
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS measures_approved_by_name TEXT;
ALTER TABLE physio_protocols ADD COLUMN IF NOT EXISTS measures_approved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS physio_protocol_measures (
  id SERIAL PRIMARY KEY,
  protocol_id INTEGER NOT NULL REFERENCES physio_protocols(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  unit_ar TEXT,
  unit_en TEXT,
  min_value NUMERIC NOT NULL,
  max_value NUMERIC NOT NULL,
  higher_is_better BOOLEAN NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT physio_protocol_measures_range CHECK (max_value > min_value),
  CONSTRAINT physio_protocol_measures_protocol_id_code_key UNIQUE (protocol_id, code)
);

CREATE TABLE IF NOT EXISTS physio_assessments (
  id SERIAL PRIMARY KEY,
  plan_id INTEGER NOT NULL REFERENCES physio_plans(id),
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  kind TEXT NOT NULL CHECK (kind IN ('baseline','periodic','final')),
  assessed_on DATE NOT NULL,
  pain SMALLINT CHECK (pain IS NULL OR pain BETWEEN 0 AND 10),
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  decision TEXT NOT NULL CHECK (decision IN ('continue','modify','discharge','stop')),
  assessed_by INTEGER REFERENCES system_users(id),
  assessed_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_plan ON physio_assessments(plan_id, assessed_on);
CREATE INDEX IF NOT EXISTS idx_physio_assessments_patient ON physio_assessments(patient_id);

INSERT INTO physio_protocol_measures (protocol_id, code, name_ar, name_en, unit_ar, unit_en, min_value, max_value, higher_is_better, display_order)
SELECT p.id, v.code, v.name_ar, v.name_en, v.unit_ar, v.unit_en, v.min_value, v.max_value, v.higher_is_better, v.display_order
  FROM (VALUES
${seedRows.join(",\n")}
  ) AS v(protocol_code, code, name_ar, name_en, unit_ar, unit_en, min_value, max_value, higher_is_better, display_order)
  JOIN physio_protocols p ON p.code = v.protocol_code
ON CONFLICT (protocol_id, code) DO NOTHING;

INSERT INTO staff_notification_prefs (user_id, event_type)
SELECT u.id, 'physio_assessment_due' FROM system_users u
 WHERE COALESCE(u.is_active, true)
   AND (COALESCE(u.can_supervise_physio, false) OR u.role = 'physio_specialist' OR COALESCE(u.extra_roles, '[]'::jsonb) ? 'physio_specialist')
ON CONFLICT DO NOTHING;
`;
