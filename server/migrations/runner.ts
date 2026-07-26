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
const migrations: Migration[] = [migration001, migration002, migration003, migration004, migration005, migration007, migration008, migration009, migration010, migration011, migration012, migration013, migration014, migration015, migration016, migration017, migration018, migration019, migration020, migration021, migration022, migration023, migration024, migration025, migration026, migration027, migration028, migration029];

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
