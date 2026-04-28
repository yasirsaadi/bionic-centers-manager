// Migration 004: AI Memory — anomaly decisions + business knowledge notes
//
// Two new tables that together let the system "learn" from the manager's
// context without any actual ML:
//
// 1. anomaly_decisions — when an accountant marks an anomaly as "reviewed"
//    or "not an error", we persist that decision. The detector consults
//    this table on every run and skips anomalies that already have a
//    standing decision, so the same record doesn't keep nagging.
//
// 2. ai_memory_notes — free-form Arabic notes the manager writes about
//    business context: vendor patterns, seasonal expectations, VIP
//    patients, etc. The AI explainer pulls relevant notes (filtered by
//    scope/category/branch) and includes them in the prompt so its
//    explanations reflect the manager's accumulated knowledge of the
//    business — not just statistical anomaly thresholds.

export const name = "004_ai_memory";

export const sql = `
CREATE TABLE IF NOT EXISTS anomaly_decisions (
  id SERIAL PRIMARY KEY,
  anomaly_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER NOT NULL,
  decision TEXT NOT NULL,
  reason TEXT,
  branch_id INTEGER REFERENCES branches(id),
  user_id INTEGER REFERENCES system_users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_decisions_source
  ON anomaly_decisions(source_type, source_id, anomaly_type);
CREATE INDEX IF NOT EXISTS idx_anomaly_decisions_branch
  ON anomaly_decisions(branch_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_decisions_expires
  ON anomaly_decisions(expires_at);

CREATE TABLE IF NOT EXISTS ai_memory_notes (
  id SERIAL PRIMARY KEY,
  branch_id INTEGER REFERENCES branches(id),
  scope TEXT NOT NULL,
  category TEXT,
  title TEXT NOT NULL,
  note TEXT NOT NULL,
  created_by INTEGER REFERENCES system_users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_notes_branch ON ai_memory_notes(branch_id);
CREATE INDEX IF NOT EXISTS idx_ai_notes_scope ON ai_memory_notes(scope);
CREATE INDEX IF NOT EXISTS idx_ai_notes_active ON ai_memory_notes(is_active);
`;
