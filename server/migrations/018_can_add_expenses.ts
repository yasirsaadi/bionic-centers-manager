// Migration 018: narrow "add expenses" permission on system users.
//
// Lets an admin grant a user the ability to add & view expenses (the المصروفات
// tab) WITHOUT full accounting management (canManageAccounting). Independent
// flag; existing users default to false. Idempotent, non-destructive.

export const name = "018_can_add_expenses";

export const sql = `
ALTER TABLE system_users ADD COLUMN IF NOT EXISTS can_add_expenses BOOLEAN DEFAULT false;
`;
