// Migration 015: prosthetics-expert CAPABILITY flag on system users.
//
// A user's primary `role` (accountant / branch_manager / reception …) governs
// their main permissions and UI. This flag lets such a user ALSO act as a
// prosthetics expert — appear in the experts roster, be assigned work orders,
// and operate the manufacturing board — WITHOUT losing any permission of their
// primary role. Pure experts stay `role = 'prosthetics_expert'`; the financial
// lock-out is tied to that role, so this flag never exposes financial data.
//
// Idempotent, non-destructive.

export const name = "015_expert_capability";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_work_as_expert BOOLEAN DEFAULT false;
`;
