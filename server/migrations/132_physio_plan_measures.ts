// Migration 132: مقاييسُ التقييم لكلّ خطّة، ومتى نُسخت الخطّةُ من بروتوكولها (§4.do — ٢٠٢٦-١٠-١١).
//
// طلبُ المالك: سليم يعدّل البروتوكولَ الأصليّ كلَّه، والأخصائيُّ يعدّل خطّةَ مريضه وحدها — **«ومنها تغييرُ المقاييس … مرونةٌ عالية جداً»** —
// وتُعلَّم الفروقُ عن البروتوكول كما هو الآن (`shared/physio_plan_diff.ts`).
//   • `physio_plan_measures` — مقاييسُ خطّةٍ عُدّلت لمريضها؛ و`physio_plans.measures_own` يقول إنّها لها. **وما لم تُعدَّل تتبع بروتوكولَها كما
//     كانت** — فلا نسخَ للخطط القائمة: تقييماتُها ومقاييسُها اليوم هي هي.
//   • `physio_plans.protocol_copied_at` — متى امتلأت الخطّةُ من بروتوكولها (إنشاءً أو تغييرَ نوع): تعديلُ سليم البروتوكولَ بعده يُذكر بجانب
//     الفروق، فيُعرف أنّ بعضَها منه لا من الأخصائيّ. والقائمةُ يُملأ لها من آخر «تغيير نوع» في سجلّ التدقيق، وإلّا من يوم إنشائها.
//   • الحذفُ يتبع الخطّة (`ON DELETE CASCADE`)، والخطّةُ تُحذف في كاسكيد حذف المريض (`storage.deletePatient`).
export const name = "132_physio_plan_measures";

export const sql = `
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS measures_own boolean NOT NULL DEFAULT false;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS protocol_copied_at timestamptz;

UPDATE physio_plans p
   SET protocol_copied_at = COALESCE(
         (SELECT max(a.created_at) FROM audit_log a
           WHERE a.entity_type = 'physio_plan' AND a.entity_id = p.id AND a.action = 'change_protocol'),
         p.created_at)
 WHERE p.protocol_id IS NOT NULL AND p.protocol_copied_at IS NULL;

CREATE TABLE IF NOT EXISTS physio_plan_measures (
  id serial PRIMARY KEY,
  plan_id integer NOT NULL REFERENCES physio_plans(id) ON DELETE CASCADE,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  unit_ar text,
  unit_en text,
  min_value numeric NOT NULL,
  max_value numeric NOT NULL,
  higher_is_better boolean NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  CONSTRAINT physio_plan_measures_plan_id_code_key UNIQUE (plan_id, code)
);
`;
