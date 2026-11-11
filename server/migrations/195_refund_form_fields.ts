// Migration 195: «استمارة استرداد مبلغ» (§4.gi — طلبُ المالك ٢٠٢٦-١١-١١).
//
// الاستمارةُ الورقية صارت نافذةَ الطلب وورقتَه المطبوعة: اسمُ المرافق ورقمُ الجنسية **يُحفظان وغيرُ إلزاميَّين** (قرارُ المالك)،
// فيظهران في سجلّ الطلب وفي الاستمارة المطبوعة بعد الاعتماد. والقديمُ بلاهما يبقى كما هو.
export const name = "195_refund_form_fields";

export const sql = `
ALTER TABLE patient_refund_requests ADD COLUMN IF NOT EXISTS companion_name TEXT;
ALTER TABLE patient_refund_requests ADD COLUMN IF NOT EXISTS national_id TEXT;
`;
