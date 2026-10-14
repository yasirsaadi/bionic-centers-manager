// Migration 147: رقمُ هاتفٍ مشترك بين أفراد عائلة (§4.ef — ٢٠٢٦-١٠-١٤).
//
// المالك: «أتى أحمد وسجّلوه برقمه، ثمّ بعد أسبوع جلب زوجته ولا هاتف لها — يجب أن يضعوا رقم أحمد». وكان الرقمُ الواحد لمريضٍ فعّالٍ واحد
// بلا استثناء (`duplicate_guard.ts`، القسم ٢)، فيُردّ التسجيل. وقرارُ المالك: سؤالٌ واحد بدل الرفض — «الشخص نفسه» يفتح ملفّه، و«قريب يستعمل
// الرقم نفسه» يسجّل بصلة القرابة.
//   • `patients.phone_shared_with_patient_id` — الملفُّ الذي أُكّد الرقمُ عليه (صاحبُه المعروض)، **`ON DELETE SET NULL`**: الحذفُ النهائيّ لذاك
//     الملفّ لا يُعطّل حذفاً ولا يمسّ هذا الملفّ — يسقط الربطُ وحده والرقمُ باقٍ.
//   • `patients.phone_shared_relation` — مَن يكون صاحبُ الرقم لهذا المريض (زوج، أب، ابن… — `shared/shared_phone.ts`).
// لا يكتبهما طلبٌ مباشرة: الخادمُ وحده يضعهما بعد فحص الرقم تحت قفله.
export const name = "147_shared_phone";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_shared_with_patient_id integer REFERENCES patients(id) ON DELETE SET NULL;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_shared_relation text;
`;
