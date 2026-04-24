import { pool } from "../db";
import { seedChartOfAccounts, ensureCurrentPeriod } from "./seed_chart_of_accounts";
import * as migration001 from "./001_accounting_foundation";
import * as migration002 from "./002_invoices";

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
const migrations: Migration[] = [migration001, migration002];

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
