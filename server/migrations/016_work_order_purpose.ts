// Migration 016: purpose column on prosthetic work orders.
//
// Distinguishes a first build ('initial_build') from a later maintenance
// episode ('maintenance') on an already-delivered device. Lets reception open
// a maintenance order from the patient's "new visit" flow, and drives a
// visible "صيانة" badge. Existing orders default to 'initial_build'.
//
// Idempotent, non-destructive.

export const name = "016_work_order_purpose";

export const sql = `
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'initial_build';
`;
