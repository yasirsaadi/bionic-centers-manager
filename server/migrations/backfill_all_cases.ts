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

const GUARD = "backfill_all_cases_v1";

export async function backfillAllPatientCases(): Promise<void> {
  try {
    const done = await pool.query("SELECT 1 FROM _migrations WHERE name = $1 LIMIT 1", [GUARD]);
    if (done.rowCount && done.rowCount > 0) {
      console.log(`[backfill] ${GUARD} already applied — skip`);
      return;
    }
    const { rows } = await pool.query("SELECT id FROM patients ORDER BY id");
    console.log(`[backfill] rebuilding cases for ${rows.length} patient(s) ...`);
    let ok = 0, failed = 0;
    for (const r of rows) {
      try { await storage.syncPatientCases(r.id); ok++; }
      catch (e) { failed++; console.error(`[backfill] patient ${r.id} failed:`, e); }
    }
    await pool.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING", [GUARD]);
    console.log(`[backfill] done — ${ok} ok, ${failed} failed`);
  } catch (err) {
    // Never crash startup; legacy display keeps working.
    console.error("[backfill] FAILED:", err);
  }
}
