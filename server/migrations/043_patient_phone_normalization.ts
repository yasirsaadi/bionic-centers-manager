// Migration 043: أعمدة رقم الاتصال المطبَّع.
//
// `patients.phone` نصّ حرّ منذ اليوم الأول: يحمل «07701234567» و«٠٧٧٠…»
// و«0770 123 4567» و«هاتف الجار» — كلها في عمود واحد. فلا مطابقة آلية
// ممكنة، ولا كشف تكرار بالرقم، ولا مقارنة مع أي قناة تواصل لاحقاً.
//
// ثلاثة أعمدة مشتقّة تُضاف بجانبه، **ولا يُمسّ هو**:
//   phone_e164     المفتاح الآلي، صيغة E.164 (+9647701234567)
//   phone_country  IQ | TR | ISO أخرى | INTL
//   phone_status   ok | needs_review
//
// لماذا لا NOT NULL: آلاف الصفوف القديمة بلا رقم، وتشديد القيد على
// القاعدة كان سيرفضها جميعاً ويعطّل كل تعديل عليها. الإلزام يُفرض في
// طبقة الـAPI للمرضى الجدد وحدهم، فالقديم يبقى يعمل كما هو.
//
// ولماذا لا تعبئة رجعية هنا: قواعد التطبيع (الأرقام العربية-الهندية،
// بادئة 00، رمز الدولة الملصوق، أطوال العراق وتركيا) مكتوبة في
// `shared/phone.ts` ومُختبَرة بستّين حالة. إعادة كتابتها بـ regex داخل
// SQL كانت ستُنشئ نسخة ثانية تنحرف عن الأولى بصمت. فالتعبئة تجري في
// `backfill_phone_normalization.ts` بنفس الدالّة التي يستعملها التطبيق
// الحيّ — مصدر حقيقة واحد للقاعدة وللخادم معاً.
//
// إضافي بالكامل: لا عمود يُحذف، ولا نوع يتغيّر، ولا قيد يُشدَّد.

export const name = "043_patient_phone_normalization";

export const sql = `
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_e164 TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_country TEXT;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_status TEXT;

-- كشف التكرار بالرقم: جزئي لأن أغلب الصفوف القديمة ستبقى بلا رقم مطبَّع،
-- ولا فائدة من فهرسة صفوف NULL.
CREATE INDEX IF NOT EXISTS idx_patients_phone_e164
  ON patients (phone_e164) WHERE phone_e164 IS NOT NULL;

-- قائمة «يحتاج مراجعة» للمدير: تُقرأ كثيراً بعد الإطلاق.
--
-- الشرط IS DISTINCT FROM لا <> : في SQL نتيجة NULL <> 'ok' هي NULL لا true،
-- فالصفوف التي لم تصلها التعبئة الرجعية بعد (phone_status = NULL) كانت
-- ستسقط من الفهرس — بينما التطبيق يعتبرها «تحتاج مراجعة» تماماً
-- (needsPhoneReview في shared/phone.ts ترجع true لـNULL). فالفهرس كان
-- سيخالف تعريف التطبيق ويُخفي أكثر الصفوف احتياجاً للمراجعة.
--
-- والـDROP قبله ضروري: CREATE INDEX IF NOT EXISTS لا يعدّل شرط فهرس موجود،
-- فقاعدة تطوير طبّقت النسخة الأولى كانت ستحتفظ بالشرط الخاطئ صامتةً.
-- الترحيل لم يبلغ الإنتاج بعد، وهذا السطر يجعله يصحّح نفسه أينما طُبّق.
DROP INDEX IF EXISTS idx_patients_phone_status;
CREATE INDEX IF NOT EXISTS idx_patients_phone_status
  ON patients (phone_status) WHERE phone_status IS DISTINCT FROM 'ok';
`;
