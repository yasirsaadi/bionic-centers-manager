// Migration 014: admin-visible plaintext password for system users.
//
// The owner (admin) needs to read/hand out each employee's password. bcrypt
// hashes are one-way, so we additionally store the plaintext password in a
// separate column that is ONLY ever returned by the admin-only users endpoint.
// Existing users have NULL here until their password is next set/changed.
//
// Idempotent, non-destructive.

export const name = "014_user_password_plain";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS password_plain TEXT;
`;
