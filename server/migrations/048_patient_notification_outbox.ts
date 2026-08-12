// Migration 048: صندوق صادر دائم لإشعارات المريض.
//
// ══ لماذا جدول لا طابور في الذاكرة ══════════════════════════════════════
// الرسالة تُستحقّ داخل معاملة التصنيع، وتُرسَل بعدها بشبكةٍ قد تفشل. وطابورٌ
// في الذاكرة يعني أن نشر Render — وهو يقع يومياً — يمحو كل ما لم يُرسَل
// بعد. فالاستحقاق يُكتب في القاعدة مع الحدث نفسه، والإرسال يقرأ منها:
// إعادة التشغيل تجد عملها بانتظارها.
//
// ══ وصفٌّ لكل جهة اتصال لا صفٌّ لكل حدث ══════════════════════════════════
// أبٌ يتابع ابنه وأمٌّ تتابعه: حدثٌ واحد، ورسالتان تنجح إحداهما وتفشل
// الأخرى. فلو كان الصفّ للحدث لَما أمكن تسجيل ذلك — أو لَأُعيد الإرسال إلى
// مَن وصلته. الوحدة هنا هي **(حدث، جهة)** لأنها وحدة النجاح والفشل.
//
// ══ وما لا يُخزَّن هنا ═══════════════════════════════════════════════════
// لا نصّ تذكرة، ولا توكن بوت، ولا سرّ webhook، ولا `external_id`، ولا نصّ
// خطأ خام. معرّف الحساب يُقرأ من `patient_contacts` **لحظة الإرسال** لا
// نسخةً هنا: نسخةٌ ثانية تنحرف عن أصلها أول مرّة يُسحَب ربطٌ ويُعاد،
// فتُرسَل الرسالة إلى حسابٍ فُكّ. والخطأ يُسجَّل **رمزاً** من قائمة مغلقة
// لأن نصّ خطأ الشبكة قد يحمل عنوان Bot API وفيه التوكن.

export const name = "048_patient_notification_outbox";

export const sql = `
CREATE TABLE IF NOT EXISTS patient_notification_deliveries (
  id                 BIGSERIAL PRIMARY KEY,

  patient_id         INTEGER NOT NULL
                     CONSTRAINT patient_notification_deliveries_patient_id_patients_id_fk
                     REFERENCES patients(id),

  -- الحدث الذي استحقّت عنه. **يقبل الفراغ**: رسالة الترحيب ولقطة الحالة
  -- عند الربط ليستا حدثاً في تاريخ المريض — ولا يجوز اختراع حدثٍ وهمي
  -- لهما ليصير سجلّ الأحداث كاذباً.
  patient_event_id   BIGINT
                     CONSTRAINT patient_notification_deliveries_patient_event_id_patient_events_id_fk
                     REFERENCES patient_events(id),

  patient_contact_id BIGINT NOT NULL
                     CONSTRAINT patient_notification_deliveries_patient_contact_id_patient_contacts_id_fk
                     REFERENCES patient_contacts(id),

  channel            TEXT NOT NULL,
  -- نوع الإشعار. لأحداث المريض هو نوع الحدث نفسه، ولرسائل الربط أنواع
  -- مستقلّة معلَنة صراحةً في وحدة الإشعارات.
  notification_type  TEXT NOT NULL,
  -- ما يحتاجه النصّ ولا شيء غيره: المرحلة، أو الموعد. لا سبب، ولا فاعل،
  -- ولا حالة، ولا بيانات سريرية أو مالية.
  payload            JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- pending · processing · sent · failed · skipped
  status             TEXT NOT NULL DEFAULT 'pending',
  attempt_count      INTEGER NOT NULL DEFAULT 0,
  next_attempt_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ختم الحجز. عاملٌ مات وهو يرسل يترك صفّاً 'processing' مختوماً بوقتٍ
  -- قديم، فيستردّه غيره بعد انقضاء المهلة بدل أن يعلق إلى الأبد.
  locked_at          TIMESTAMPTZ,
  sent_at            TIMESTAMPTZ,
  -- **رمز** من قائمة مغلقة لا نصّ خطأ: نصّ فشل الشبكة قد يحمل عنوان
  -- Bot API وفيه التوكن، فيتسرّب إلى الجدول ثم إلى النسخة الاحتياطية.
  last_error_code    TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- **رسالة واحدة لكل (حدث، جهة).** جزئي لأن رسائل الربط بلا حدث، ولو كان
-- شاملاً لَمنع الترحيب الثاني لجهةٍ ثانية — و NULL لا تتصادم في Postgres
-- أصلاً، فالشرط يوثّق النيّة ويجعل الفهرس أصغر.
CREATE UNIQUE INDEX IF NOT EXISTS uq_pnd_event_contact
  ON patient_notification_deliveries (patient_event_id, patient_contact_id)
  WHERE patient_event_id IS NOT NULL;

-- طابور المستحقّ: ما ينتظر إرساله ووقته حان. جزئي فلا يحمل المرسَل
-- والمتخطَّى — وهما الأغلبية بعد شهر.
CREATE INDEX IF NOT EXISTS idx_pnd_due
  ON patient_notification_deliveries (next_attempt_at)
  WHERE status IN ('pending', 'failed');

-- المحجوز: لاستردادِ ما مات عامله.
CREATE INDEX IF NOT EXISTS idx_pnd_locked
  ON patient_notification_deliveries (locked_at)
  WHERE status = 'processing';

CREATE INDEX IF NOT EXISTS idx_pnd_patient
  ON patient_notification_deliveries (patient_id);
CREATE INDEX IF NOT EXISTS idx_pnd_contact
  ON patient_notification_deliveries (patient_contact_id);
`;
