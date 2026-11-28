// **قيودُ CHECK كما على الإنتاج** (§4.fl) — قالبُ الاختبار يُبنى بـ`db:push` بلا القيود المكتوبة في نصّ الترحيلات، فقيمةٌ تمرّ هنا وتُرفض هناك.
// فهذه نسخةٌ منها تطبّقها حزمةٌ تحتاجها (وكيلُ Opus يكتب بطاقاتٍ ومراحل وبروتوكولات): كلُّ تعبيرٍ **بحرفه** من ترحيله، وحارسُ الانحراف
// (`productionChecksDrift`) يتأكّد أنّ كلَّ تعبيرٍ ما زال في ملفّ ترحيله — فإن وُسّع قيدٌ بترحيلٍ جديد سقط الحارسُ حتى تُحدَّث النسخة.
import { readFileSync } from "fs";
import path from "path";

export interface ProductionCheck { name: string; table: string; expr: string; migration: string }

export const PRODUCTION_CHECKS: readonly ProductionCheck[] = [
  { name: "tpc_ex_kind", table: "physio_exercises", migration: "118_physio_exercise_library.ts",
    expr: "kind IN ('mobility','stretch','strength','motor_control','endurance','aerobic','balance','functional','breathing','neural')" },
  { name: "tpc_ex_sets", table: "physio_exercises", migration: "118_physio_exercise_library.ts", expr: "sets IS NULL OR sets BETWEEN 1 AND 10" },
  { name: "tpc_ex_reps", table: "physio_exercises", migration: "118_physio_exercise_library.ts", expr: "reps IS NULL OR reps BETWEEN 1 AND 100" },
  { name: "tpc_ex_hold", table: "physio_exercises", migration: "118_physio_exercise_library.ts", expr: "hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600" },
  { name: "tpc_ex_status", table: "physio_exercises", migration: "118_physio_exercise_library.ts", expr: "status IN ('draft','approved')" },
  { name: "tpc_ppe_hold", table: "physio_protocol_phase_exercises", migration: "118_physio_exercise_library.ts", expr: "hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600" },
  { name: "tpc_ppe_rest", table: "physio_protocol_phase_exercises", migration: "118_physio_exercise_library.ts", expr: "rest_seconds IS NULL OR rest_seconds BETWEEN 0 AND 600" },
  { name: "tpc_plpe_hold", table: "physio_plan_phase_exercises", migration: "123_physio_sessions_and_plan_phases.ts", expr: "hold_seconds IS NULL OR hold_seconds BETWEEN 1 AND 600" },
  { name: "tpc_plpe_sets", table: "physio_plan_phase_exercises", migration: "123_physio_sessions_and_plan_phases.ts", expr: "sets IS NULL OR sets BETWEEN 1 AND 10" },
  { name: "tpc_pr_category", table: "physio_protocols", migration: "106_physio_protocols.ts",
    expr: "category IN ('spine','upper_limb','lower_limb','neurological','post_surgical','amputation','rheumatologic','other')" },
  { name: "tpc_pr_age", table: "physio_protocols", migration: "106_physio_protocols.ts", expr: "age_group IN ('pediatric','adult','geriatric','all')" },
  { name: "tpc_pr_status", table: "physio_protocols", migration: "106_physio_protocols.ts", expr: "status IN ('draft','approved')" },
  { name: "tpc_prd_evidence", table: "physio_protocol_devices", migration: "106_physio_protocols.ts", expr: "evidence IN ('recommended','optional','not_recommended')" },
  { name: "tpc_prd_minutes", table: "physio_protocol_devices", migration: "106_physio_protocols.ts", expr: "minutes IS NULL OR minutes BETWEEN 1 AND 120" },
  { name: "tpc_pld_minutes", table: "physio_plan_devices", migration: "109_physio_plans.ts", expr: "minutes IS NULL OR minutes BETWEEN 1 AND 120" },
  { name: "tpc_pl_spw", table: "physio_plans", migration: "109_physio_plans.ts", expr: "sessions_per_week IS NULL OR sessions_per_week BETWEEN 1 AND 14" },
  { name: "tpc_pl_minutes", table: "physio_plans", migration: "109_physio_plans.ts", expr: "session_minutes IS NULL OR session_minutes BETWEEN 5 AND 240" },
  { name: "tpc_pld_use", table: "physio_plan_devices", migration: "122_physio_centre_use.ts", expr: "centre_use IS NULL OR centre_use IN ('core', 'adjunct')" },
  { name: "tpc_pr_total", table: "physio_protocols", migration: "123_physio_sessions_and_plan_phases.ts", expr: "total_sessions IS NULL OR total_sessions BETWEEN 1 AND 300" },
  { name: "tpc_pl_total", table: "physio_plans", migration: "123_physio_sessions_and_plan_phases.ts", expr: "total_sessions IS NULL OR total_sessions BETWEEN 1 AND 300" },
];

/** المنطقةُ بقائمة ترحيل ١٨١ (مع «الوجه») — يكتبها الترحيلُ من مصفوفةٍ فلا نصَّ حرفيّاً يُقارَن. */
export const REGION_CHECK = "region IN ('lumbar','thoracic','cervical','shoulder','elbow','wrist_hand','hip','knee','ankle_foot','whole_body','face')";

export async function applyProductionChecks(pool: { query: (t: string, p?: any[]) => Promise<any> }): Promise<void> {
  for (const c of [...PRODUCTION_CHECKS, { name: "tpc_ex_region", table: "physio_exercises", expr: REGION_CHECK, migration: "181" }]) {
    await pool.query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${c.name}') THEN
      ALTER TABLE ${c.table} ADD CONSTRAINT ${c.name} CHECK (${c.expr}); END IF; END $$;`);
  }
}

/** **حارسُ الانحراف**: كلُّ تعبيرٍ ما زال بحرفه في ملفّ ترحيله — يعيد ما لم يُوجد. */
export function productionChecksDrift(root = path.resolve(process.cwd(), "server", "migrations")): string[] {
  const norm = (s: string) => s.replace(/\s+/g, " ");
  return PRODUCTION_CHECKS.filter((c) => !norm(readFileSync(path.join(root, c.migration), "utf8")).includes(norm(c.expr))).map((c) => c.name);
}
