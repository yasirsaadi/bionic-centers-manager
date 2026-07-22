// Migration 026 — admin-managed custom expense categories + seed the owner's
// requested ones (غداء / مصاريف الدكتور / مصاريف بيت الدكتور / حوالات بلاجفور /
// حوالات ابو مصطفى / حوالات ريكال / حوالات تركيا) for ALL branches.
//
// Idempotent: IF NOT EXISTS on the table/index; seeds use NOT EXISTS.

export const name = "026_expense_categories";

const SEED = [
  "غداء",
  "مصاريف الدكتور",
  "مصاريف بيت الدكتور",
  "حوالات بلاجفور",
  "حوالات ابو مصطفى",
  "حوالات ريكال",
  "حوالات تركيا",
];

export const sql = `
CREATE TABLE IF NOT EXISTS expense_categories (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  branch_id INTEGER REFERENCES branches(id),
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_expense_category_label_branch
  ON expense_categories (label, branch_id) NULLS NOT DISTINCT;

${SEED.map((label) => `
INSERT INTO expense_categories (label, branch_id)
SELECT '${label.replace(/'/g, "''")}', NULL
WHERE NOT EXISTS (
  SELECT 1 FROM expense_categories WHERE label = '${label.replace(/'/g, "''")}' AND branch_id IS NULL
);`).join("\n")}
`;
