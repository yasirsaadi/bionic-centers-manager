// Migration 120: الأخصائيُّ يبدأ خطّته بنفسه على بروتوكولٍ معتمَد، والمشرفُ يراجعها بعدها (§4.cz — ٢٠٢٦-١٠-٠٩).
//
// اقتراحُ سليم وقرارُ المالك: «الخطّةُ على بروتوكولٍ اعتمده سليم تبدأ في ملفّ المريض فوراً — موافقةُ سليم مرّةً ثانية على بروتوكولٍ معتمَد
// لا فائدة منها سوى التأخير». ويُنبَّه سليم ليراجع (يوافق أو يعدّل أو يوقف أو يستبدل)، ويُنبَّه الأخصائيُّ بما فعل.
//
//   • physio_plans.review_status — **مراجعةُ المشرف بعد البدء**: `awaiting` بدأها كاتبُها وتنتظر نظرةَ المشرف · `reviewed` نظر فيها المشرف
//     (وافق أو عدّل أو استبدل) · فارغٌ = لا مراجعةَ معلَّقة (خطّةٌ قديمة، أو مسوّدة، أو اعتمدها المشرفُ قبل البدء).
//   • reviewed_by / reviewed_by_name / reviewed_at — مَن نظر ومتى.
// إضافةٌ لا تمسّ صفّاً قائماً: الخططُ المعتمَدةُ قبل اليوم اعتمدها المشرفُ أصلاً فلا مراجعةَ لها.

export const name = "120_physio_plan_self_activation";

export const sql = `
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS review_status TEXT CHECK (review_status IN ('awaiting','reviewed'));
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES system_users(id);
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS reviewed_by_name TEXT;
ALTER TABLE physio_plans ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_physio_plans_review_awaiting ON physio_plans (updated_at) WHERE review_status = 'awaiting';
`;
