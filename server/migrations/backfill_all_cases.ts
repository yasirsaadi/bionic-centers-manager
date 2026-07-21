// One-time backfill: rebuild patient_cases from ALL signals for every existing
// patient (flags + prosthetic work orders + tagged payments), split each
// service's cost out of the aggregate using the "تكلفة: X" markers, and
// re-attribute أطراف/مساند payments to their real case.
//
// This surfaces every hidden طرف/مسند case (e.g. patients whose service was
// recorded only as a work order, so the flag was never set) WITHOUT touching
// the patient flags or total_cost — so the aggregate/financial reports are
// unaffected. Guarded via _migrations so it runs exactly once.

import { pool } from "../db";
import { storage } from "../storage";

// v2: re-run after broadening syncPatientCases detection to include the
// service detail fields (support_type / prosthetic_type / amputation_site),
// which surfaces مسند/طرف cases that were recorded via those columns while the
// boolean flag stayed false. Re-sync only ADDS missing cases (existing cases
// are skipped by `has(t)`), so it never disturbs already-split costs.
//
// v3: re-run after adding the "cost floor" pass — a طرف/مسند case can never
// cost less than what was paid into it, so fully-paid products (e.g. a 7M طرف
// left at cost 0) now show their real price and 0 remaining automatically,
// with the cost moved out of the physio holder. total_cost/flags untouched.
//
// v4: re-run after the floor learned to raise a device case to its paid even
// WITHOUT a funded holder (device-only patients stuck at "التكلفة: 0" while
// paid/remaining moved) — repairs every such patient in production once.
const GUARD = "backfill_all_cases_v4";

export async function backfillAllPatientCases(): Promise<void> {
  try {
    const done = await pool.query("SELECT 1 FROM _migrations WHERE name = $1 LIMIT 1", [GUARD]);
    if (done.rowCount && done.rowCount > 0) {
      console.log(`[backfill] ${GUARD} already applied — skip`);
      return;
    }
    // Resumable: Render redeploys SIGTERM the old process mid-loop; without a
    // cursor every restart would re-run the whole table from patient 1. The
    // cursor persists the last fully-synced id so a restart continues where
    // the previous run stopped. (Each sync is transactional + idempotent, so
    // re-syncing a patient after a crash between cursor writes is harmless.)
    await pool.query(`CREATE TABLE IF NOT EXISTS backfill_progress (
      name TEXT PRIMARY KEY, last_id INTEGER NOT NULL DEFAULT 0, updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const prog = await pool.query("SELECT last_id FROM backfill_progress WHERE name = $1", [GUARD]);
    const startAfter = prog.rows[0]?.last_id ?? 0;
    const { rows } = await pool.query("SELECT id FROM patients WHERE id > $1 ORDER BY id", [startAfter]);
    console.log(`[backfill] rebuilding cases for ${rows.length} patient(s) (resuming after id ${startAfter}) ...`);
    let ok = 0, failed = 0, sinceCheckpoint = 0;
    for (const r of rows) {
      try { await storage.syncPatientCases(r.id); ok++; }
      catch (e) { failed++; console.error(`[backfill] patient ${r.id} failed:`, e); }
      if (++sinceCheckpoint >= 25) {
        sinceCheckpoint = 0;
        await pool.query(
          `INSERT INTO backfill_progress (name, last_id, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (name) DO UPDATE SET last_id = $2, updated_at = NOW()`, [GUARD, r.id]);
      }
    }
    await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [GUARD]);
    await pool.query("DELETE FROM backfill_progress WHERE name = $1", [GUARD]);
    console.log(`[backfill] done — ${ok} ok, ${failed} failed`);
  } catch (err) {
    // Never crash startup; legacy display keeps working.
    console.error("[backfill] FAILED:", err);
  }
}
