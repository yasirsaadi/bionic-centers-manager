// Migration 010: grant session-tracking permissions to admin users
//
// Migration 009 auto-granted the three new session-tracking permission
// columns to existing reception and branch_manager rows but missed the
// admin role. Admin users got the column defaults of FALSE and lost
// sidebar visibility for the new module on first login after deploy.
//
// This migration fixes that one-shot, and a parallel code change in
// routes.ts now grants the same three flags to any future admin at
// login time so the database state can no longer drift.

export const name = "010_grant_admin_session_permissions";

export const sql = `
UPDATE system_users
   SET can_enter_sessions         = TRUE,
       can_manage_session_targets = TRUE,
       can_view_sessions_report   = TRUE
 WHERE role = 'admin';
`;
