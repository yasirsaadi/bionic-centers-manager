import { readFile, readdir } from "fs/promises";
import { fileURLToPath } from "url";
import path from "path";
import { db, pool } from "../db";
import { sql } from "drizzle-orm";
import { seedChartOfAccounts, ensureCurrentPeriod } from "./seed_chart_of_accounts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Migration Runner
 *
 * Runs SQL migrations on app startup. Each migration is tracked in the
 * _migrations table to ensure it runs only once. All migrations must be
 * idempotent (use IF NOT EXISTS) as a safety net.
 *
 * Safety:
 * - Does not drop or alter existing data
 * - Tracks applied migrations in _migrations table
 * - Fails safely with a logged error; does not crash the app
 */

async function ensureMigrationsTable(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function isMigrationApplied(name: string): Promise<boolean> {
  const result = await db.execute(
    sql`SELECT 1 FROM _migrations WHERE name = ${name} LIMIT 1`
  );
  return (result.rows?.length ?? 0) > 0;
}

async function markMigrationApplied(name: string): Promise<void> {
  await db.execute(
    sql`INSERT INTO _migrations (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`
  );
}

async function runSqlMigration(filePath: string, name: string): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  // نستخدم pool.query مباشرة للسماح بتنفيذ عدة statements في ملف واحد
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(content);
    await client.query(
      "INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [name]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await ensureMigrationsTable();

    const migrationsDir = __dirname;
    const files = await readdir(migrationsDir);
    const sqlFiles = files.filter((f) => f.endsWith(".sql")).sort();

    console.log(`[migrations] found ${sqlFiles.length} sql migration file(s)`);

    for (const file of sqlFiles) {
      const name = file.replace(/\.sql$/, "");
      const already = await isMigrationApplied(name);

      if (already) {
        console.log(`[migrations] skip ${name} (already applied)`);
        continue;
      }

      console.log(`[migrations] applying ${name} ...`);
      const fullPath = path.join(migrationsDir, file);
      await runSqlMigration(fullPath, name);
      console.log(`[migrations] applied ${name} ✓`);
    }

    // البذرة - تُشغّل دائماً لأنها idempotent (تتحقق من الوجود قبل الإدراج)
    console.log("[migrations] seeding chart of accounts...");
    const seedResult = await seedChartOfAccounts();
    console.log(
      `[migrations] chart of accounts: ${seedResult.created} created, ${seedResult.skipped} skipped`
    );

    console.log("[migrations] ensuring current accounting period...");
    await ensureCurrentPeriod();

    console.log("[migrations] all migrations applied successfully ✓");
  } catch (err) {
    console.error("[migrations] FAILED:", err);
    // لا نوقف التطبيق - الأنظمة القديمة ستواصل العمل
    // لكن المستخدم يجب أن يرى الخطأ في اللوقز
  }
}
