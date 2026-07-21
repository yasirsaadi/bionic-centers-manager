// Migration 024 — WITHDRAWN (kept as a named no-op).
//
// This migration re-homed visits by note keywords (تدريب → علاج etc.). The
// owner then clarified the real complaint was the sessions counter appearing
// on device cases, NOT the visits' placement — staff intentionally record
// تدريب visits under the prosthetic case. Migration 025 reverses the data
// moves; this file stays as a no-op so fresh databases never apply the
// withdrawn logic while the _migrations bookkeeping remains consistent.

export const name = "024_visit_notes_classification";

export const sql = `SELECT 1;`;
