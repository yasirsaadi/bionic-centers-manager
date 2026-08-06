// Migration 040: one-shot submission tokens — the cure for "انضافت مرتين".
//
// Evidence (patient امل عويز, 2026-06-20): two identical 12,500 cost entries
// 17 seconds apart. Seventeen seconds is far too fast for a human to re-enter
// a whole service form, and reception (العين) reports the same shape: an error
// appears, and a refresh reveals the service added twice from ONE click. So a
// single user action can reach the server twice.
//
// A time-window guard ("reject an identical request within a minute") was
// rejected deliberately: it would block a patient who genuinely buys two
// identical sessions minutes apart, trading one bug for another. A token
// generated when the form OPENS carries the right meaning instead — the same
// click always carries the same token, a new form always carries a new one.
//
// No foreign key: this table is a claim log, not patient data. Rows are
// disposable and a patient delete must never depend on it.

export const name = "040_submission_tokens";

export const sql = `
CREATE TABLE IF NOT EXISTS submission_tokens (
  token       TEXT PRIMARY KEY,
  scope       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_submission_tokens_created ON submission_tokens(created_at);
`;
