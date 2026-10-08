// Migration 112: «اقترح خطّة» بالمساعد (§4.co — المرحلةُ الخامسة، ٢٠٢٦-١٠-٠٨).
//
//   • physio_plan_suggestions — اقتراحٌ واحد ضغطه كاتبُ خطط: ما رآه المساعدُ (العمرُ ونصُّ المعاينة وسطرُ الأخصائيّ — **بلا اسمٍ ولا هاتفٍ ولا رمز**)،
//                               والبروتوكولاتُ الثلاثةُ التي اختارها بأسبابها، وما اقترحه للبروتوكول المختار **بعد تحقّق الخادم** (أجهزةٌ تُحذف بسبب،
//                               ودقائقُ وجرعةٌ لا تزيد على البروتوكول، وملاحظاتٌ لهذا المريض)، والخطّةُ التي فُتحت منه إن قُبل.
// **ومفتاحٌ إلى `patients`** ⟵ في كاسكيد `deletePatientTx` وفي دمج الملفّات (§8). و`plan_id` يُفرَّغ إن حُذفت الخطّة.

export const name = "112_physio_plan_suggestions";

export const sql = `
CREATE TABLE IF NOT EXISTS physio_plan_suggestions (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  protocol_id INTEGER NOT NULL REFERENCES physio_protocols(id),
  plan_id INTEGER REFERENCES physio_plans(id) ON DELETE SET NULL,
  input JSONB NOT NULL,
  choices JSONB NOT NULL,
  result JSONB NOT NULL,
  created_by INTEGER REFERENCES system_users(id),
  created_by_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_physio_plan_suggestions_patient ON physio_plan_suggestions(patient_id);
CREATE INDEX IF NOT EXISTS idx_physio_plan_suggestions_plan ON physio_plan_suggestions(plan_id);
`;
