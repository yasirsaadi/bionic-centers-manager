-- ============================================================
-- Migration 001: Accounting Foundation
-- Adds: chart_of_accounts, journal_entries, journal_lines,
--       accounting_periods, audit_log
--
-- SAFETY NOTES:
-- - All DDL uses "IF NOT EXISTS" to be fully idempotent
-- - No existing tables or columns are modified or dropped
-- - No data is deleted
-- - Safe to run multiple times
-- ============================================================

-- شجرة الحسابات
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id SERIAL PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name_ar TEXT NOT NULL,
  account_name_en TEXT,
  account_type TEXT NOT NULL,
  account_subtype TEXT,
  parent_id INTEGER REFERENCES chart_of_accounts(id),
  branch_id INTEGER REFERENCES branches(id),
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,
  normal_balance TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_coa_branch ON chart_of_accounts(branch_id);

-- الفترات المحاسبية
CREATE TABLE IF NOT EXISTS accounting_periods (
  id SERIAL PRIMARY KEY,
  period_name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'open',
  closed_at TIMESTAMP,
  closed_by INTEGER REFERENCES system_users(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_periods_status ON accounting_periods(status);
CREATE INDEX IF NOT EXISTS idx_periods_dates ON accounting_periods(start_date, end_date);

-- القيود اليومية
CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  entry_number TEXT NOT NULL UNIQUE,
  entry_date DATE NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  period_id INTEGER REFERENCES accounting_periods(id),
  description TEXT NOT NULL,
  reference TEXT,
  source_type TEXT,
  source_id INTEGER,
  total_amount INTEGER NOT NULL,
  status TEXT DEFAULT 'posted',
  reversed_by INTEGER,
  reversal_of INTEGER,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  posted_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_je_date ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_branch ON journal_entries(branch_id);
CREATE INDEX IF NOT EXISTS idx_je_source ON journal_entries(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_je_status ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_period ON journal_entries(period_id);

-- سطور القيود
CREATE TABLE IF NOT EXISTS journal_lines (
  id SERIAL PRIMARY KEY,
  entry_id INTEGER NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id INTEGER NOT NULL REFERENCES chart_of_accounts(id),
  branch_id INTEGER REFERENCES branches(id),
  debit INTEGER DEFAULT 0,
  credit INTEGER DEFAULT 0,
  description TEXT,
  line_order INTEGER DEFAULT 0,
  patient_id INTEGER REFERENCES patients(id),
  vendor_id INTEGER
);

CREATE INDEX IF NOT EXISTS idx_jl_entry ON journal_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jl_account ON journal_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jl_branch ON journal_lines(branch_id);
CREATE INDEX IF NOT EXISTS idx_jl_patient ON journal_lines(patient_id);

-- سجل التدقيق
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  user_id INTEGER REFERENCES system_users(id),
  user_name TEXT,
  branch_id INTEGER REFERENCES branches(id),
  old_values TEXT,
  new_values TEXT,
  ip_address TEXT,
  user_agent TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_branch ON audit_log(branch_id);

-- جدول لتتبع الـ migrations المطبقة
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMP DEFAULT NOW()
);
