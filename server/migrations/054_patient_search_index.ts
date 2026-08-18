/**
 * Migration 054 — بحثُ المرضى: أعمدةٌ مطبَّعة وفهارسها
 *
 * ثلاثةُ أعمدةٍ مشتقّة وثلاثةُ فهارس ودالّتان وامتداد. **لا صفَّ يُكتب ولا
 * عمودَ يُحذف ولا جدولَ يُعاد بناؤه غير `patients`** — وإعادةُ بنائه هنا هي
 * ما يفعله `ADD COLUMN … STORED` بطبيعته: يمرّ على الصفوف مرّةً واحدة عند
 * الترحيل ليملأ القيمة. (٦٠٬٠٠٠ صفّ = ٣٫٥ ثانية على جهازٍ عادي، والجدول
 * الحقيقي أصغر من ذلك بكثير.)
 *
 * ══ لماذا عمودٌ مخزَّن لا فهرسُ تعبير ══════════════════════════════════
 * التنفيذ الأول كان فهارسَ تعبير — `CREATE INDEX … ON patients
 * (patient_search_norm(name))` — وهو **يبدو** الخيار الخفيف: بلا عمودٍ ولا
 * إعادة بناء. لكنّ القياس كذّبه.
 *
 * الفهرسُ يخدم الترشيح، ثمّ **يبقى المطبِّع يُستدعى لكلّ صفّ** في إعادة فحص
 * الكومة وفي `CASE` الرتبة وفي كاسر التعادل — والمطبِّع ليس رخيصاً:
 * `translate` مرّتان و`regexp_replace` مرّتان و`lower` و`btrim`. وحين رأى
 * المخطِّط أن الفروع المتعدّدة بـ`OR` ستُقيَّم على كل حال اختار
 * `Parallel Seq Scan` فسقط كلّ الفهرسة.
 *
 * قياسٌ على ٦٠٬٠٠٠ صفّ (أي عشراتُ أضعاف الجدول الحقيقي)، بالاستعلام الكامل
 * كما يبنيه `server/patient_search/sql.ts` — قبل ⟶ بعد، بالمللي ثانية:
 *
 *   حرفٌ واحد «ا»       ١٥٤٥ ⟶ ٥
 *   حرفان «اح»            ٦٠٨ ⟶ ٤٫٥
 *   ثلاثة «احم»          ١١٩٥ ⟶ ٢٨
 *   اسمان «احمد عبد»     ١٢٤٧ ⟶ ٧٠
 *   خطأ مطبعي «احمذ»     ١٣٠٠ ⟶ ٥٦
 *   هاتف «0771000»       ١٢٨١ ⟶ ٤٤
 *   رمز «WB-01629»       ٣٦٣٧ ⟶ ٠٫١
 *
 * ولا واحدٌ منها `Seq Scan` بعد اليوم.
 *
 * فالعمود المخزَّن ليس تحسيناً تجميلياً — هو ما يجعل الفهرس فهرساً.
 *
 * ══ والاتّساق مضمونٌ بالقاعدة لا بترِكرٍ نكتبه ══════════════════════════
 * `GENERATED ALWAYS AS … STORED` تحسبه القاعدة في كل `INSERT`/`UPDATE`، ولا
 * يقبل كتابةً من التطبيق أصلاً. فلا backfill يُنسى ولا ترِكر ينحرف ولا مصدرَ
 * حقيقةٍ ثانٍ: العمود **هو** الدالّة مطبَّقةً على الاسم، دائماً.
 *
 * ولذلك يجب أن تكون الدالّة `IMMUTABLE` — وهي كذلك حقاً: `translate`
 * و`regexp_replace` و`lower` و`btrim` كلّها حتمية بلا حالة.
 *
 * ══ الامتداد قد لا يوجد — والترحيل لا يجوز أن يُسقط الإقلاع ═══════════
 * `pg_trgm` متاحٌ على Neon وعلى Postgres القياسي، لكن إنشاءه يحتاج صلاحية.
 * فلو رُفض في بيئةٍ ما لوجب أن **يمضي الترحيل** ويعمل البحث بلا تسامحٍ مع
 * الخطأ المطبعي بدل أن يتوقّف الخادم عن الإقلاع كلّه. ولذلك يُحاط بمعالج
 * استثناء، وفهرسُ الترايغرام لا يُنشأ إلّا إن نجح.
 *
 * والتطبيق يسأل القاعدة عن وجوده مرّةً ويبني الاستعلام على الجواب.
 *
 * ══ الدالّة مطابقةٌ لـ`shared/patient_search.ts` خطوةً بخطوة ═══════════
 * وإلّا لاختلف ما يطابق في الذاكرة عمّا يطابق في SQL — وهو بالضبط العطب
 * الذي وُجد قبل هذه المرحلة (ثلاث قواعد تطبيع في المشروع). واختبارٌ يقارن
 * الاثنتين على عيّناتٍ حقيقية يحرس التطابق.
 *
 * idempotent: كلّها `IF NOT EXISTS` / `CREATE OR REPLACE`.
 */

export const name = "054_patient_search_index";

export const sql = `
-- ══ الامتداد — وفشلُه لا يُسقط الإقلاع ══════════════════════════════════
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_trgm unavailable (%) — fuzzy patient search will be disabled', SQLERRM;
END $$;

-- ══ تصحيحُ كلفة عوامل الترايغرام للمخطِّط ═══════════════════════════════
--  similarity وword_similarity تبنيان مجموعتَي ترايغرام وتقارنانهما،
--  فهما أغلى بمئات المرّات من مقارنةٍ عادية. لكنّ pg_trgm يتركهما على
--  الكلفة الافتراضية 1 — فيحسب المخطِّط أن المسح الكامل أرخص من الفهرس،
--  ويختار Seq Scan ويقيّمهما على كلّ صفّ في الجدول.
--
--  قياسٌ على ٦٠٬٠٠٠ صفّ، استعلام «احم»:
--    · بالكلفة الافتراضية ⟶ Parallel Seq Scan — ٤٤٥ مللي ثانية
--    · بعد التصحيح ⟶ BitmapOr على الفهرسين — ٢٥
--  ولم يتغيّر حرفٌ في الاستعلام: تغيّر ما **يعرفه** المخطِّط عن الثمن.
--
--  و٥٠٠ ليست رقماً سحرياً — هي رتبةُ الغلاء الحقيقية، وأي قيمةٍ من هذا
--  الحجم تكفي لقلب المقارنة. والتغيير تخطيطيٌّ بحت: لا نتيجةَ تتبدّل.
--
--  وقد لا نملك دوالَّ الامتداد في بيئةٍ مُدارة، فيُحاط بمعالج استثناء:
--  الترحيل يمضي، والبحث يبقى صحيحاً وإن كان أبطأ على الجداول الضخمة.
DO $$
BEGIN
  ALTER FUNCTION similarity_op(text, text) COST 500;
  ALTER FUNCTION word_similarity_op(text, text) COST 500;
  ALTER FUNCTION similarity(text, text) COST 500;
  ALTER FUNCTION word_similarity(text, text) COST 500;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'could not adjust pg_trgm operator costs (%) — fuzzy search may plan as a seq scan', SQLERRM;
END $$;

-- ══ التطبيع — مطابقٌ لـshared/patient_search.ts خطوةً بخطوة ═════════════
--  ١. الأرقام الهندية/الفارسية ⟶ ASCII
--  ٢. التشكيل يُحذف · ٣. التطويل يُحذف
--  ٤. صور الألف ⟶ ا · ٥. ى⟶ي · ة⟶ه · ؤ⟶و · ئ⟶ي
--  ٦. لاتيني صغير · ٧. مسافات موحَّدة ومقصوصة
--
--  تنبيه لمن يعدّلها: طرفا translate يجب أن يتساويا طولاً. نقصُ محرفٍ
--  واحد في الهدف يُزحزح كلّ ما بعده بصمت (وقع فعلاً: ة⟶و و ى⟶ه).
CREATE OR REPLACE FUNCTION patient_search_norm(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT btrim(regexp_replace(
    lower(translate(
      regexp_replace(
        translate(txt, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
        '[\\u064B-\\u0652\\u0670\\u0640]', '', 'g'
      ),
      'أإآٱٲٳىةؤئ', 'اااااايهوي'
    )),
    '\\s+', ' ', 'g'
  ));
$$;

-- الهاتف أرقاماً فقط — فالمسافات والشرطات والأقواس زينةُ عرض.
CREATE OR REPLACE FUNCTION patient_digits_only(txt text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT regexp_replace(
    translate(txt, '٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789'),
    '[^0-9]', '', 'g'
  );
$$;

-- ══ الأعمدة المشتقّة ════════════════════════════════════════════════════
--  مصرَّحٌ بها في shared/schema.ts كي لا يراها drizzle-kit زائدةً فيحذفها.
ALTER TABLE patients ADD COLUMN IF NOT EXISTS name_norm text
  GENERATED ALWAYS AS (patient_search_norm(name)) STORED;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_digits text
  GENERATED ALWAYS AS (patient_digits_only(phone)) STORED;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS code_digits text
  GENERATED ALWAYS AS (patient_digits_only(patient_code)) STORED;

-- ══ فهرسُ البادئة ═══════════════════════════════════════════════════════
--  text_pattern_ops هو ما يجعل البادئة مدىً في الشجرة بدل المسح الكامل —
--  وهو المسار الساخن: أوّل حرفٍ يُكتب.
CREATE INDEX IF NOT EXISTS ix_patients_name_norm_prefix
  ON patients (name_norm text_pattern_ops);

CREATE INDEX IF NOT EXISTS ix_patients_phone_digits
  ON patients (phone_digits text_pattern_ops);

-- رقمُ الرمز وحده: مَن يكتب 01629 بلا WB يريد الملفّ ١٦٢٩ لا اسماً يحويه.
CREATE INDEX IF NOT EXISTS ix_patients_code_digits
  ON patients (code_digits);

-- ══ فهرسُ الترايغرام — للاحتواء وللتسامح مع الخطأ المطبعي ═══════════════
--  يخدم LIKE '%…%' و '% …%' و العاملَين % و %> جميعاً، فيجمعها المخطِّط في
--  BitmapOr واحد. ولا يُنشأ إلّا إن وُجد الامتداد؛ وبدونه يبقى البحث يعمل
--  بالبادئة، وهو ما كان يفعله النظام قبل هذه المرحلة أصلاً.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm') THEN
    CREATE INDEX IF NOT EXISTS ix_patients_name_norm_trgm
      ON patients USING gin (name_norm gin_trgm_ops);
    -- والحالة المرضية: بحثٌ كان يعمل في السجلّ قبل هذه المرحلة فيبقى، لكن
    -- مفهرساً ومطبَّعاً بدل مقارنةٍ خام على كلّ صفّ. وفهرسُ تعبيرٍ يكفي لها:
    -- نصٌّ حرّ يُقرأ نادراً، وإعادةُ الفحص تقع على المرشَّح لا على الجدول.
    CREATE INDEX IF NOT EXISTS ix_patients_condition_norm_trgm
      ON patients USING gin (patient_search_norm(medical_condition) gin_trgm_ops);
  END IF;
END $$;

-- والأسماء البديلة تُقارن تامّةً لا تقريباً — مفتاحُها الأوّلي يكفي، ويبقى
-- فهرسُ المريض للربط العكسي.
CREATE INDEX IF NOT EXISTS ix_patient_code_aliases_patient
  ON patient_code_aliases (patient_id);
`;
