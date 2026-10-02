// **عودةُ تلغرام المرضى — بلا ماضٍ يُرسَل** (قرارُ المالك ٢٠٢٦-١٠-٠٢، §4.bl).
//
// تلغرامُ المرضى تقاعد في ٢٠٢٦-٠٨-٢٢ (#238) فبقيت صفوفُه خاملة: جهاتٌ نشِطة (١٧ جهةً لـ١٥ مريضاً، ١٢–٢٢ آب) وصفوفُ صادرٍ
// قد تكون `pending`/`failed`/`processing`. ومع عودة القناة كانت الدورةُ الأولى ستلتقطها فترسل لمرضى آب رسائلَ قديمة
// بلا موافقةٍ جديدة — وبوتُ اليوم قد لا يكون بوتَ آب أصلاً. فقبل أن يعود الإرسال:
//   ① صفوفُ تلغرام غيرُ المنتهية ⟵ `skipped` (طرفيّةٌ لا تُحجَز ثانيةً) — **ولا يُمَسّ صفُّ واتساب واحد، ولا يصير شيءٌ `pending`**.
//   ② جهاتُ تلغرام النشِطة القديمة ⟵ مسحوبة (`revoked_at`) — تبقى تاريخاً، ومَن أراد يعيد الربطَ برمز QR في ثوانٍ.
//   ③ تذاكرُ الربط المعلَّقة القديمة ⟵ مسحوبة.
// بلا تغيير مخطّط، ويُشغَّل مرّةً واحدة (يسجّله المشغِّل باسمه).

export const name = "092_patient_telegram_relaunch";

export const sql = `
UPDATE patient_notification_deliveries
   SET status = 'skipped', last_error_code = 'telegram_disabled', locked_at = NULL, updated_at = NOW()
 WHERE channel = 'telegram' AND status IN ('pending', 'failed', 'processing');

UPDATE patient_contacts
   SET revoked_at = NOW()
 WHERE channel = 'telegram' AND revoked_at IS NULL AND linked_at < '2026-10-02';

UPDATE patient_link_tokens
   SET revoked_at = NOW()
 WHERE consumed_at IS NULL AND revoked_at IS NULL AND created_at < '2026-10-02';
`;
