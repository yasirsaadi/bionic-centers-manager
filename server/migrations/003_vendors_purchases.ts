// Migration 003: Vendors + Purchases (Credit Purchases System)
// Adds supplier management and credit-purchase tracking with proper
// integration into the double-entry journal system (Accounts Payable 2110).
// Shipped as a TypeScript module for esbuild bundling, same pattern as
// migrations 001 and 002. All DDL uses IF NOT EXISTS and is fully idempotent.

export const name = "003_vendors_purchases";

export const sql = `
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  currency TEXT DEFAULT 'IQD',
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_active ON vendors(is_active);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  purchase_number TEXT NOT NULL UNIQUE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  purchase_date DATE NOT NULL,
  due_date DATE,
  category TEXT NOT NULL,
  description TEXT,
  vendor_invoice_number TEXT,
  total_amount INTEGER NOT NULL,
  paid_amount INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  payment_method TEXT DEFAULT 'credit',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchases_vendor ON purchases(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchases_branch ON purchases(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_due_date ON purchases(due_date);
`;
