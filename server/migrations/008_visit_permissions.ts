// Migration 008: per-user visit permissions
//
// Visit edit/delete used to be hard-coded to admin or branch_manager.
// The owner now wants the option to grant either capability to any
// employee on demand — e.g. a trusted reception staffer fixing a typo
// on a visit without bothering the manager. Two new boolean columns
// on system_users let the admin toggle each independently.
//
// Defaults: false for everyone. The admin and branch_manager auth
// paths in routes.ts grant-all anyway, so role behaviour is unchanged.

export const name = "008_visit_permissions";

export const sql = `
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_edit_visits BOOLEAN DEFAULT false;

ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_delete_visits BOOLEAN DEFAULT false;
`;
