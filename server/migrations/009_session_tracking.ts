// Migration 009: session tracking module
//
// Adds the "متابعة الجلسات اليومية" feature merged from the standalone
// bionic-analytics app. Tracks per-branch / per-day / per-shift counts
// for each of 15 physiotherapy devices, plus monthly targets per
// branch+device. Reception enters today's counts; managers edit
// historical data and set targets; admin sees everything.
//
// All additive — no DROP, no ALTER on existing columns. Three new
// permission columns on system_users gate access to the new module.
//
// Tables:
//   devices                — 15 physiotherapy devices, seeded below.
//   daily_sessions         — one row per (branch, date, shift).
//   session_counts         — one row per (daily_session, device).
//   monthly_targets        — one row per (branch, device, year, month).
//
// Existing audit_log is reused with entity_type = 'daily_session' or
// 'monthly_target' so we don't fragment audit history.

export const name = "009_session_tracking";

export const sql = `
-- shift enum
DO $$ BEGIN
  CREATE TYPE shift AS ENUM ('morning', 'evening');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 1. devices catalog
CREATE TABLE IF NOT EXISTS devices (
  id            SERIAL PRIMARY KEY,
  code          TEXT NOT NULL UNIQUE,
  name_ar       TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. daily_sessions: one row per (branch, date, shift)
CREATE TABLE IF NOT EXISTS daily_sessions (
  id            SERIAL PRIMARY KEY,
  branch_id     INTEGER NOT NULL REFERENCES branches(id),
  session_date  DATE NOT NULL,
  shift         shift NOT NULL,
  created_by    INTEGER NOT NULL REFERENCES system_users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT daily_sessions_branch_date_shift_uq
    UNIQUE (branch_id, session_date, shift)
);

CREATE INDEX IF NOT EXISTS daily_sessions_branch_date_idx
  ON daily_sessions (branch_id, session_date);

-- 3. session_counts: one row per (daily_session, device)
CREATE TABLE IF NOT EXISTS session_counts (
  id                 SERIAL PRIMARY KEY,
  daily_session_id   INTEGER NOT NULL REFERENCES daily_sessions(id) ON DELETE CASCADE,
  device_id          INTEGER NOT NULL REFERENCES devices(id),
  count              INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT session_counts_session_device_uq
    UNIQUE (daily_session_id, device_id),
  CONSTRAINT session_counts_count_nonneg CHECK (count >= 0)
);

-- 4. monthly_targets: one row per (branch, device, year, month)
CREATE TABLE IF NOT EXISTS monthly_targets (
  id            SERIAL PRIMARY KEY,
  branch_id     INTEGER NOT NULL REFERENCES branches(id),
  device_id     INTEGER NOT NULL REFERENCES devices(id),
  year          INTEGER NOT NULL,
  month         INTEGER NOT NULL,
  target_count  INTEGER NOT NULL DEFAULT 0,
  set_by        INTEGER NOT NULL REFERENCES system_users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT monthly_targets_branch_device_year_month_uq
    UNIQUE (branch_id, device_id, year, month),
  CONSTRAINT monthly_targets_target_nonneg CHECK (target_count >= 0),
  CONSTRAINT monthly_targets_month_range  CHECK (month BETWEEN 1 AND 12)
);

CREATE INDEX IF NOT EXISTS monthly_targets_branch_year_month_idx
  ON monthly_targets (branch_id, year, month);

-- 5. New permission columns on system_users for the sessions module
ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_enter_sessions BOOLEAN DEFAULT FALSE;

ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_manage_session_targets BOOLEAN DEFAULT FALSE;

ALTER TABLE system_users
  ADD COLUMN IF NOT EXISTS can_view_sessions_report BOOLEAN DEFAULT FALSE;

-- Auto-grant existing reception and branch_manager users so they can use
-- the new module immediately. Admin role bypasses these checks at the
-- code layer so no row-level grant needed.
UPDATE system_users
   SET can_enter_sessions = TRUE
 WHERE role IN ('reception', 'branch_manager')
   AND can_enter_sessions = FALSE;

UPDATE system_users
   SET can_manage_session_targets = TRUE,
       can_view_sessions_report   = TRUE
 WHERE role = 'branch_manager'
   AND can_manage_session_targets = FALSE;

-- 6. Seed the 15 physiotherapy devices in the spec'd display order
INSERT INTO devices (code, name_ar, name_en, display_order) VALUES
  ('megnatik',    'مغناطيس',         'Magnetic Therapy',  1),
  ('laser',       'ليزر',            'Laser',             2),
  ('tecar',       'تيكار',           'Tecar',             3),
  ('exercise',    'تمارين',          'Exercise',          4),
  ('ultrasound',  'أمواج فوق صوتية', 'Ultrasound',        5),
  ('traction',    'شد',              'Traction',          6),
  ('shockwaves',  'موجات صادمة',     'Shockwaves',        7),
  ('electro',     'كهربائي',         'Electrotherapy',    8),
  ('compression', 'ضغط',             'Compression',       9),
  ('infrared',    'أشعة تحت حمراء',  'Infrared',         10),
  ('hot_pack',    'كمادات حارة',     'Hot Pack',         11),
  ('wax',         'شمع',             'Wax',              12),
  ('cpm',         'تحريك مستمر',     'CPM',              13),
  ('robotik',     'روبوتيك',         'Robotik',          14),
  ('needle',      'إبر',             'Needle',           15)
ON CONFLICT (code) DO NOTHING;
`;
