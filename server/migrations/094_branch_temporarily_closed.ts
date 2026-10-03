// **فرعٌ مغلقٌ مؤقتاً** (قرارُ المالك ٢٠٢٦-١٠-٠٣ — كركوك، §4.bw).
//
// الفرعُ المغلق يختفي من قوائم العمل الجديد (الدخول، المبدِّل، تسجيل مريض، إتاحة ملفّ)، **ولا يدخله موظّفوه**، وتاريخُه كلُّه
// باقٍ في الملفّات والتقارير. والمسؤولُ يفتحه ويغلقه بمفتاحٍ واحد. أعمدةٌ على `branches` لا جدول. idempotent.
export const name = "094_branch_temporarily_closed";

export const sql = `
ALTER TABLE branches ADD COLUMN IF NOT EXISTS temporarily_closed boolean NOT NULL DEFAULT false;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS closed_by integer;
`;
