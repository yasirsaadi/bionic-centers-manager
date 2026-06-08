// Migration 012: Follow-up call reminders for stopped physiotherapy patients
//
// Physiotherapy patients who did sessions and then stopped coming need a
// follow-up call. The active reminder list is computed on the fly (a physio
// patient whose last non-deleted visit is >= 7 days ago). This table stores
// the *handled* episodes: once a staff member records the call outcome, the
// reminder is suppressed.
//
// Suppression is anchored to last_visit_anchor — the patient's last-visit
// timestamp that was current when the call was logged. A later visit raises
// MAX(visit_date), so the anchor no longer matches and the reminder re-arms
// automatically for the new stop-episode. No cron or expiry needed.

export const name = "012_follow_up_calls";

export const sql = `
CREATE TABLE IF NOT EXISTS follow_up_calls (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  last_visit_anchor TIMESTAMP NOT NULL,
  outcome_note TEXT NOT NULL,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_calls_patient
  ON follow_up_calls(patient_id, last_visit_anchor);
CREATE INDEX IF NOT EXISTS idx_follow_up_calls_branch
  ON follow_up_calls(branch_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_calls_created
  ON follow_up_calls(created_at);
`;
