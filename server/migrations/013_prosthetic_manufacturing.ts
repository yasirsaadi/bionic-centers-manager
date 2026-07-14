// Migration 013: Prosthetic & medical-support manufacturing module.
//
// Three new tables that track the fabrication of prosthetics/medical supports
// and assign each case to exactly ONE expert (a system_users row with role
// 'prosthetics_expert'). The expert is NEVER stored on the patients table —
// the link lives on the work order, so a patient can accumulate more than one
// work order over time (re-fabrication, a second limb, …).
//
// History and rework rows are append-only: the app and server must never
// delete them. Reassignment, stage changes, status changes, recasts and
// resockets all leave a permanent trail.
//
// Idempotent: safe to run repeatedly (IF NOT EXISTS everywhere, no destructive
// statements).

export const name = "013_prosthetic_manufacturing";

export const sql = `
CREATE TABLE IF NOT EXISTS prosthetic_work_orders (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  expert_user_id INTEGER NOT NULL REFERENCES system_users(id),
  service_type TEXT NOT NULL,                 -- 'prosthetic' | 'medical_support'
  status TEXT NOT NULL DEFAULT 'active',       -- active | waiting_patient | waiting_components | medical_hold | needs_recast | needs_resocket | completed | cancelled
  current_stage TEXT NOT NULL DEFAULT 'new_assignment',
  expected_delivery_date DATE,
  started_at TIMESTAMPTZ,                       -- set when the expert leaves new_assignment
  completed_at TIMESTAMPTZ,
  final_result TEXT,                           -- fabrication & fit outcome code (on delivery)
  final_notes TEXT,
  assigned_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwo_expert ON prosthetic_work_orders(expert_user_id);
CREATE INDEX IF NOT EXISTS idx_pwo_branch ON prosthetic_work_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_pwo_patient ON prosthetic_work_orders(patient_id);
CREATE INDEX IF NOT EXISTS idx_pwo_status ON prosthetic_work_orders(status);
CREATE INDEX IF NOT EXISTS idx_pwo_expert_status ON prosthetic_work_orders(expert_user_id, status);

-- Append-only timeline of every stage change / reassignment / lifecycle event.
CREATE TABLE IF NOT EXISTS prosthetic_work_history (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES prosthetic_work_orders(id),
  action_type TEXT NOT NULL,                   -- created | stage_change | status_change | reassigned | rework | delivered
  from_stage TEXT,
  to_stage TEXT,
  notes TEXT,
  performed_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pwh_order ON prosthetic_work_history(work_order_id);

-- Append-only rework log (recast / resocket / major adjustment / full remake).
CREATE TABLE IF NOT EXISTS prosthetic_rework_events (
  id SERIAL PRIMARY KEY,
  work_order_id INTEGER NOT NULL REFERENCES prosthetic_work_orders(id),
  rework_type TEXT NOT NULL,                    -- recast | resocket | major_adjustment | full_remake
  reason_code TEXT,
  reason_details TEXT,
  stage_when_detected TEXT,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pre_order ON prosthetic_rework_events(work_order_id);
CREATE INDEX IF NOT EXISTS idx_pre_type ON prosthetic_rework_events(rework_type);
`;
