// Migration 007: multi-branch managers
//
// A system user historically had ONE branch. The clinic owner now
// wants a single branch_manager account to span 2+ branches at
// once — so a manager who looks after both Baghdad and Karbala can
// log in once and switch between them in the UI without juggling
// two separate accounts.
//
// We add a JSONB column `branch_ids` holding an array of branch
// integers. The existing `branch_id` column stays untouched as the
// "default" branch — at login we compute the effective access list
// as `branch_ids OR [branch_id]` so old single-branch users keep
// working with no data migration.

export const name = "007_multi_branch_managers";

export const sql = `
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS branch_ids JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_system_users_branch_ids
  ON system_users USING GIN (branch_ids);
`;
