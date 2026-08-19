/**
 * Migration 059 — أولُ سعرٍ للجهاز يُدخله الاستعلامات
 *
 * ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
 * الطبيبُ **قد** يكتب كلفةَ الجهاز في معاينته، وقد يتركها فارغة. وحين
 * يتركها كان الملفُّ يقف: `confirmPurchase` يردّ «لا يوجد سعر معتمد»،
 * والبابُ الوحيد لكتابته `setCommercialPrice` — ومديرُ الفرع وحده يفتحه.
 * فمريضٌ قرّر الشراء يبقى واقفاً لأن حقلاً في المعاينة تُرك فارغاً.
 *
 * ══ والحلُّ ليس توسيعَ صلاحية ═══════════════════════════════════════════
 * **أولُ سعرٍ ليس تخفيضاً ولا قراراً استثنائياً**: لم يكن للجهاز سعرٌ قطّ،
 * فالرقمُ الأول هو السعرُ الطبيعي نفسه. يُدخله مَن يُتمّ البيع، **بشرطٍ لا
 * بدور**: أن يكون السعرُ المعتمد صفراً — أي «غير مسعَّر». ومتى صار موجباً
 * فتخفيضُه خصمٌ يمرّ بالاعتماد، ورفعُه قرارُ مديرٍ يمرّ ببابه.
 *
 * ══ ولماذا مصدرٌ باسمه ═════════════════════════════════════════════════
 * `reception_set` — وليس `manager_set`. فالسجلُّ يجيب «مَن قال هذا الرقم»
 * بعد سنة، وخلطُ الاثنين كان سينسب إلى مدير الفرع رقماً لم يره.
 *
 * والقيدُ يُعاد بناؤه بفحص **نصّه** لا اسمه: قاعدةٌ تحمل الصيغةَ الأضيق
 * تتقارب إلى هذه بدل أن تُترك كما هي لأن الاسم موجود (نفسُ درس ٠٥٧).
 *
 * ══ ويحمل معه شدَّ قيدِ ٠٥٨ ═════════════════════════════════════════════
 * ترحيلُ ٠٥٨ شُدَّ ليقول «معتمَدٌ يعني نُفِّذ» (`applied_at IS NOT NULL`)،
 * لكنّ المُشغِّل يتخطّى ترحيلاً طُبِّق باسمه — فقاعدةٌ ركّبت ٠٥٨ بصيغته
 * الأولى تبقى على القيد الأوسع للأبد. فالشدُّ يُكرَّر هنا: **التقارُبُ
 * يحتاج ترحيلاً يعمل**، لا ملفّاً عُدِّل بعد تطبيقه. والفحصُ بالنصّ فلا
 * يُعاد بناؤه على قاعدةٍ صحيحة أصلاً.
 *
 * idempotent: لا يُنشئ عموداً ولا جدولاً — يوسّع قيداً ويشدّ آخر، وكلاهما
 * بشرطٍ يقرأ صيغتَه الحالية.
 */

export const name = "059_reception_initial_price";

export const sql = `
DO $r1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'post_exam_followups_price_source_check'
       AND conrelid = 'post_exam_followups'::regclass
       AND pg_get_constraintdef(oid) LIKE '%reception_set%'
  ) THEN
    ALTER TABLE post_exam_followups
      DROP CONSTRAINT IF EXISTS post_exam_followups_price_source_check;
    ALTER TABLE post_exam_followups
      ADD CONSTRAINT post_exam_followups_price_source_check
      CHECK (price_source IN ('exam', 'manager_set', 'approved_change', 'reception_set'));
  END IF;
END
$r1$;

DO $r2$
BEGIN
  IF to_regclass('service_discount_requests') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
        WHERE conname = 'service_discount_requests_decision_check'
          AND conrelid = 'service_discount_requests'::regclass
          AND pg_get_constraintdef(oid) LIKE '%applied_at IS NOT NULL%'
     ) THEN
    ALTER TABLE service_discount_requests
      DROP CONSTRAINT IF EXISTS service_discount_requests_decision_check;
    ALTER TABLE service_discount_requests
      ADD CONSTRAINT service_discount_requests_decision_check
      CHECK (
        status <> 'approved'
        OR (approved_final_price IS NOT NULL AND decided_at IS NOT NULL
            AND applied_at IS NOT NULL)
      );
  END IF;
END
$r2$;
`;
