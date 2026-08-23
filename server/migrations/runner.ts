import { pool } from "../db";
import { seedChartOfAccounts, ensureCurrentPeriod } from "./seed_chart_of_accounts";
import * as migration001 from "./001_accounting_foundation";
import * as migration002 from "./002_invoices";
import * as migration003 from "./003_vendors_purchases";
import * as migration004 from "./004_ai_memory";
import * as migration005 from "./005_performance_indexes";
import * as migration007 from "./007_multi_branch_managers";
import * as migration008 from "./008_visit_permissions";
import * as migration009 from "./009_session_tracking";
import * as migration010 from "./010_grant_admin_session_permissions";
import * as migration011 from "./011_visit_soft_delete_and_forensic";
import * as migration012 from "./012_follow_up_calls";
import * as migration013 from "./013_prosthetic_manufacturing";
import * as migration014 from "./014_user_password_plain";
import * as migration015 from "./015_expert_capability";
import * as migration016 from "./016_work_order_purpose";
import * as migration017 from "./017_patient_cases";
import * as migration018 from "./018_can_add_expenses";
import * as migration019 from "./019_sync_patient_cases";
import * as migration020 from "./020_case_integrity";
import * as migration021 from "./021_order_uniqueness_and_visit_repair";
import * as migration022 from "./022_maintenance_stage_repair";
import * as migration023 from "./023_maintenance_visit_case_repair";
import * as migration024 from "./024_visit_notes_classification";
import * as migration025 from "./025_revert_visit_notes_classification";
import * as migration026 from "./026_expense_categories";
import * as migration027 from "./027_expense_section";
import * as migration028 from "./028_medical_exams";
import * as migration029 from "./029_exam_prescription";
import * as migration030 from "./030_exam_revisions_and_cost";
import * as migration031 from "./031_repair_phantom_device_cases";
import * as migration032 from "./032_unconfirm_exam_costs";
import * as migration033 from "./033_cost_entries_ledger";
import * as migration034 from "./034_backfill_session_cost_dates";
import * as migration035 from "./035_exam_proposed_expert";
import * as migration036 from "./036_physio_session_plan";
import * as migration037 from "./037_repair_poisoned_physio_plans";
import * as migration038 from "./038_payment_links";
import * as migration039 from "./039_referral_sub_source";
import * as migration040 from "./040_submission_tokens";
import * as migration041 from "./041_repair_case_cost_gap";
import * as migration042 from "./042_repair_phantom_amputee_flag";
import * as migration043 from "./043_patient_phone_normalization";
import * as migration044 from "./044_patient_events";
import * as migration045 from "./045_manufacturing_simplified_stages";
import * as migration046 from "./046_manufacturing_legacy_catchup";
import * as migration047 from "./047_patient_communication_identity";
import * as migration048 from "./048_patient_notification_outbox";
import * as migration049 from "./049_patient_device_episodes";
import * as migration050 from "./050_device_episode_backfill";
import * as migration051 from "./051_device_order_purpose_uniqueness";
import * as migration052 from "./052_patient_public_code";
import * as migration053 from "./053_post_exam_followup";
import * as migration054 from "./054_patient_search_index";
import * as migration055 from "./055_medical_review_requests";
import * as migration056 from "./056_cost_entry_department";
import * as migration057 from "./057_commercial_price";
import * as migration058 from "./058_service_discounts";
import * as migration059 from "./059_reception_initial_price";
import * as migration060 from "./060_prosthetic_parts";
import * as migration061 from "./061_exam_cancellation";
import * as migration062 from "./062_whatsapp_notification_consent";
import * as migration063 from "./063_sold_device_identity_repair";
import * as migration064 from "./064_administrative_reversal";

/**
 * Migration Runner
 *
 * Runs SQL migrations on app startup. Each migration is tracked in the
 * _migrations table to ensure it runs only once. All migrations must be
 * idempotent (use IF NOT EXISTS) as a safety net.
 *
 * Migrations are statically imported so they get bundled into the production
 * CJS output — no filesystem reads at runtime, no dependence on import.meta.
 *
 * Safety:
 * - Does not drop or alter existing data
 * - Tracks applied migrations in _migrations table
 * - Fails safely with a logged error; does not crash the app
 */

interface Migration {
  name: string;
  sql: string;
}

// Ordered list of migrations. Add new ones at the end.
const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration007, migration008, migration009, migration010, migration011, migration012, migration013, migration014, migration015, migration016, migration017, migration018, migration019, migration020, migration021, migration022, migration023, migration024, migration025, migration026, migration027, migration028, migration029, migration030, migration031, migration032, migration033, migration034, migration035, migration036, migration037, migration038, migration039, migration040, migration041, migration042, migration043, migration044, migration045, migration046, migration047, migration048, migration049, migration050, migration051, migration052, migration053, migration054, migration055, migration056, migration057, migration058, migration059, migration060, migration061, migration062, migration063, migration064];

async function runSqlMigration(migration: Migration): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(migration.sql);
    await client.query(
      "INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [migration.name]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function isMigrationApplied(name: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM _migrations WHERE name = $1 LIMIT 1",
    [name]
  );
  return result.rowCount !== null && result.rowCount > 0;
}

export async function runMigrations(): Promise<void> {
  try {
    await ensureMigrationsTable();

    console.log(`[migrations] found ${migrations.length} migration(s)`);

    for (const migration of migrations) {
      const already = await isMigrationApplied(migration.name);

      if (already) {
        console.log(`[migrations] skip ${migration.name} (already applied)`);
        continue;
      }

      console.log(`[migrations] applying ${migration.name} ...`);
      await runSqlMigration(migration);
      console.log(`[migrations] applied ${migration.name}`);
    }

    console.log("[migrations] seeding chart of accounts...");
    const seedResult = await seedChartOfAccounts();
    console.log(
      `[migrations] chart of accounts: ${seedResult.created} created, ${seedResult.skipped} skipped`
    );

    console.log("[migrations] ensuring current accounting period...");
    await ensureCurrentPeriod();

    console.log("[migrations] all migrations applied successfully");
  } catch (err) {
    console.error("[migrations] FAILED:", err);
    // Don't crash the app — legacy systems continue to work.
  }
}
