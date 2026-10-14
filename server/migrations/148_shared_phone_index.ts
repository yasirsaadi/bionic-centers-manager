// Migration 148: فهرسُ «يستعمله أيضاً» للرقم المشترك (§4.ef — ٢٠٢٦-١٠-١٤).
//
// ملفُّ كلّ مريضٍ له هاتف يسأل «مَن يشير إليّ برقمه؟» (`loadPhoneSharing` ⟵ `phone_shared_with_patient_id = id`) — في كلّ فتحٍ للملفّ،
// وأغلبُه لا يشاركه أحد. وPostgres لا يفهرس عمودَ المفتاح الأجنبيّ من نفسه (١٤٧ أضاف العمودَ وحده)، فكان السؤالُ يمسح جدولَ المرضى كلَّه؛
// ومثلُه الحذفُ النهائيّ لأيّ مريض (`ON DELETE SET NULL` يبحث عمّن يشير إليه) ونقلُ الدمج. والفهرسُ جزئيّ: الصفوفُ المشتركة وحدها،
// وهي قليلة. (ملاحظةُ مراجعة Codex على #649.)
export const name = "148_shared_phone_index";

export const sql = `
CREATE INDEX IF NOT EXISTS ix_patients_phone_shared_with ON patients (phone_shared_with_patient_id)
  WHERE phone_shared_with_patient_id IS NOT NULL;
`;
