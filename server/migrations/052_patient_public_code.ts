/**
 * Migration 052 — رمزُ المريض العلني الدائم (WB-xxxxx)
 *
 * ══ لماذا ═══════════════════════════════════════════════════════════════
 *
 * لا هوية للمريض اليوم إلا رقمُ الصفّ الداخلي — وهو لا يُقال ولا يُكتب على
 * ورقة ولا يُرسَل في رسالة. فالموظّف يبحث بالاسم، والاسم يتكرّر ويُكتب
 * بصيغتين، والهاتف يتغيّر. والمريض نفسه لا يملك ما يعرّف به ملفّه.
 *
 * `WB-01629` رمزٌ **دائم**: يُطبع، ويُقال، ويُرسَل عبر تلغرام، ويُبحَث به.
 *
 * ══ وهو معرّفٌ لا كلمة سرّ ═══════════════════════════════════════════════
 *
 * معرفتُه لا تمنح شيئاً. كلّ استعلامٍ به يمرّ بالمصادقة وصلاحية عرض المرضى
 * وحدود الفرع كما هي — تماماً كالبحث بالاسم. وهذا الترحيل يضيف الهوية
 * وحدها؛ الحراسة في مكانها ولم تُمَسّ.
 *
 * ══ الصيغة ══════════════════════════════════════════════════════════════
 *
 *   WB- + رقمٌ بخمس خانات على الأقلّ، ولا **يُقصّ** بعدها:
 *   1 ⟶ WB-00001 · 1629 ⟶ WB-01629 · 100000 ⟶ WB-100000
 *
 * و`LPAD(n, 5, '0')` وحدها **تقصّ** ما زاد على خمس خانات في Postgres
 * ('100000' ⟶ '10000') — فتُنشئ رمزاً مكرَّراً يصطدم بالتفرّد بعد
 * مئة ألف مريض. ولذلك الحشو مشروطٌ في `format_patient_code`.
 *
 * ══ ولا يُشتقّ من بيانات المريض ══════════════════════════════════════════
 *
 * لا من الاسم ولا الأب ولا الهاتف ولا الفرع ولا الحالة. فبياناتُه تتغيّر
 * وهويّته لا. والقدامى يأخذون رمزاً **حتمياً من رقم صفّهم** — فالترحيل
 * يُعطي النتيجة نفسها على أي نسخة من القاعدة.
 *
 * ══ والتسلسل لا يرجع إلى الوراء أبداً ════════════════════════════════════
 *
 * `patient_code_seq` مخصَّصٌ للجدد، ويُضبَط فوق **كلّ رقمٍ خُصِّص فعلاً**:
 * أرقام المرضى الحاليين، وأرقام الأسماء البديلة (رموز ملفّاتٍ دُمجت)،
 * و`last_value` الحالي نفسه. فإعادة تشغيل الترحيل لا تُرجعه، وحذفُ مريضٍ
 * بأعلى رمز لا يُتيح إعادة استعماله. **رمزٌ خُصِّص مرّة لا يُخصَّص لغيره.**
 * والفجوات بعد معاملةٍ تراجعت مقبولة — الفجوة أرخص من التباس هويّة.
 *
 * ══ والاسم البديل: لماذا جدولٌ كامل ══════════════════════════════════════
 *
 * النظام يدمج الملفّات المكرّرة. والرمز قد يكون **طُبع أو أُرسل أو قيل
 * للمريض** قبل الدمج. فلو مات رمزُ المصدر لصار بيد المريض ورقةٌ لا تدلّ
 * على شيء. `patient_code_aliases` يُبقيه حيّاً يشير إلى الملفّ الباقي.
 *
 * idempotent بالكامل: كل عبارةٍ فيه IF NOT EXISTS أو مشروطة.
 */

export const name = "052_patient_public_code";

export const sql = `
-- ══ ١. صائغُ الرمز — مصدرُ الصيغة الوحيد في القاعدة ══════════════════════
--  الحشو مشروط: تحت مئة ألف يُحشى لخمس خانات، وفوقها يُكتب كما هو.
--  LPAD وحدها كانت ستقصّ، فتُنتج رمزاً مكرَّراً بلا إنذار.
CREATE OR REPLACE FUNCTION format_patient_code(n BIGINT) RETURNS TEXT AS $fn$
  SELECT 'WB-' || CASE WHEN n < 100000 THEN LPAD(n::text, 5, '0') ELSE n::text END;
$fn$ LANGUAGE SQL IMMUTABLE;

-- ══ ٢. العمود ═════════════════════════════════════════════════════════════
ALTER TABLE patients ADD COLUMN IF NOT EXISTS patient_code TEXT;

-- ══ ٣. جدول الأسماء البديلة ═══════════════════════════════════════════════
--  الرمزُ مفتاحٌ أوّلي بذاته: فتفرّده مضمونٌ بالبنية لا بفحصٍ في التطبيق.
--  و ON DELETE بلا كاسكيد عمداً — الحذف يمرّ بـ deletePatient الصريح كما
--  تفرض قاعدة هذا المشروع، فنسيانُه يُكشَف باختبار حذفٍ حقيقي.
CREATE TABLE IF NOT EXISTS patient_code_aliases (
  code TEXT PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL DEFAULT 'merge'
);
CREATE INDEX IF NOT EXISTS ix_patient_code_aliases_patient
  ON patient_code_aliases (patient_id);

-- ══ ٤. رموز القدامى — حتميّة من رقم الصفّ ═════════════════════════════════
--  الشرط IS NULL يجعلها تُكتب مرّةً واحدة إلى الأبد: إعادة التشغيل لا
--  تلمس صفّاً له رمز، ولا رمزَ يتبدّل بعد أن قيل لصاحبه.
UPDATE patients SET patient_code = format_patient_code(id::bigint)
 WHERE patient_code IS NULL;

-- ══ ٥. القيود بعد الملء ═══════════════════════════════════════════════════
ALTER TABLE patients ALTER COLUMN patient_code SET NOT NULL;

DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_patients_patient_code') THEN
    ALTER TABLE patients ADD CONSTRAINT uq_patients_patient_code UNIQUE (patient_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_patients_patient_code_format') THEN
    ALTER TABLE patients ADD CONSTRAINT ck_patients_patient_code_format
      CHECK (patient_code ~ '^WB-[0-9]{5,}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_patient_code_aliases_format') THEN
    ALTER TABLE patient_code_aliases ADD CONSTRAINT ck_patient_code_aliases_format
      CHECK (code ~ '^WB-[0-9]{5,}$');
  END IF;
END
$do$;

-- ══ ٦. تسلسل الجدد ════════════════════════════════════════════════════════
CREATE SEQUENCE IF NOT EXISTS patient_code_seq AS BIGINT;

-- **الضبط لا يرجع أبداً**: أعلى ما خُصِّص في الملفّات، وفي الأسماء البديلة
-- (رموزُ ملفّاتٍ دُمجت فحُذفت صفوفُها — ولولاها لأُعيد استعمال رمزٍ بيد
-- مريض)، و last_value الحالي نفسه. وأيُّها أكبر هو المستقرّ.
SELECT setval('patient_code_seq', GREATEST(
  (SELECT COALESCE(MAX(substring(patient_code from 4)::bigint), 0)
     FROM patients WHERE patient_code ~ '^WB-[0-9]+$'),
  (SELECT COALESCE(MAX(substring(code from 4)::bigint), 0)
     FROM patient_code_aliases WHERE code ~ '^WB-[0-9]+$'),
  (SELECT last_value FROM patient_code_seq),
  1
), true);

-- ══ ٧. الافتراضي: الرمز يولد في القاعدة ═══════════════════════════════════
--  فصفٌّ يُدرَج بلا رمز يأخذ التالي من التسلسل ذرّياً — وإدراجان متزامنان
--  لا يمكن أن يلتقيا على رقم. والتطبيق يُسقط أي رمزٍ يصل من العميل، فلا
--  يبقى للافتراضي منافس.
ALTER TABLE patients ALTER COLUMN patient_code
  SET DEFAULT format_patient_code(nextval('patient_code_seq'));
`;
