/**
 * ٠٦٨ — **سلّةُ المرضى واستعادتُهم خلال ثلاثين يوماً**.
 *
 * **الحذفُ العاديّ لم يعد يهدم شيئاً.**
 *
 * ══ ما يفعله ═════════════════════════════════════════════════════════════
 * يضيف إلى `patients` حالةَ حذفٍ على مستوى **الملفّ** — ولا يمسّ صفّاً
 * تابعاً واحداً. فالمعايناتُ بأختامها وأوامرُ التصنيع بسجلّها والدفعاتُ
 * وقيودُ الكلف والفواتيرُ والمبالغُ المعلَّقة **تبقى كما هي بايتاً**، وتخرج
 * من النظام الفعّال لأن **صاحبَها** خرج لا لأنها تغيّرت.
 *
 * والاستعادةُ تُزيل هذه الحالةَ فحسب — فتعود الصفوفُ نفسُها بمعرّفاتها.
 * **لا نسخَ ولا استنساخَ ولا رمزَ مريضٍ جديد.**
 *
 * ══ ولا جدولَ أرشيفٍ ثانٍ ═══════════════════════════════════════════════
 * الصفوفُ الأصلية هي الحقيقة. وجدولٌ يُعيد بناءَ الملفّ يصير مصدرَ حقيقةٍ
 * ثانياً ينحرف عن الأوّل، ثمّ لا يُعرَف أيُّهما الصحيح.
 *
 * ══ واللقطةُ الماليةُ للتدقيق لا للحساب ═══════════════════════════════════
 * `deleted_*_snapshot` تجيب سؤالاً واحداً بعد شهور: **بماذا كان الملفُّ يوم
 * حُذف؟** والمالُ نفسُه يبقى في `payments` و`cost_entries` كما هو —
 * **فليست مصدرَ حقيقةٍ ماليّاً**، ولا يُحسَب منها تقرير.
 *
 * ══ ولا تاريخَ يُعاد تفسيرُه ════════════════════════════════════════════
 * كلُّ الأعمدة `NULL` على كلّ صفٍّ قائم — **ولا مريضَ واحدٌ يُوسَم محذوفاً**.
 * ولا `DEFAULT` يكتب معنىً على ملفٍّ لم يُحذف.
 *
 * ══ وسجلُّ الحذف والاستعادة في `audit_log` ═══════════════════════════════
 * جدولُ التدقيق القائم يحمل `entity_type` و`old_values` و`new_values`
 * والفاعلَ والوقت — وهو بالضبط ما يلزم لتكرار الحذف والاستعادة. **فلا
 * جدولَ تدقيقٍ ثانٍ يُخترَع** لما يسعه الأوّل.
 *
 * إضافيٌّ بالكامل، وقابلٌ للتشغيل مرّتين. بلا DROP TABLE ولا DROP COLUMN
 * ولا DROP INDEX ولا DELETE ولا TRUNCATE — **ولا مسٍّ لترحيلٍ من ٠٠١ إلى
 * ٠٦٧**. (تشديدُ الشكل أدناه يستعمل DROP CONSTRAINT مقروناً بـADD فوراً
 * بالاسم نفسِه — إعادةُ تعريف قيدٍ لا إزالةَ بيانات، فلا يُعَدّ استثناءً
 * عن «إضافيٌّ بالكامل».)
 *
 * ══ ومعها: إقصاءُ مالِ المحذوف نهائياً عن القوائم الفعّالة (مراجعة
 *    ٢٠٢٦-٠٨-٢٤) ═══════════════════════════════════════════════════════
 * `journal_entries.purged_patient_money` — **حقيقةٌ دائمة لا تُمحى**. حذفٌ
 * ناعمٌ يُقصى من `getTrialBalance` **حيّاً**: لا حاجةَ لصفٍّ جديد، فحصُ
 * `patients.deleted_at` كافٍ ويتراجع تلقائياً عند الاستعادة. لكنّ الحذفَ
 * **النهائيّ** ينزع `journal_lines.patient_id` (كاسكيدُ `storage.
 * deletePatient` القائم منذ قبل هذا الترحيل) **قبل** أن يُمحى صفُّ
 * المريض — فيفقد الفحصُ الحيُّ سبيلَه، ويعود مالُ كلّ مريضٍ يُحذف نهائياً
 * صامتاً إلى القوائم الفعّالة. فتُكتب الحقيقةُ في اللحظة نفسِها التي
 * يُنزَع فيها الرابط (قبلها مباشرةً)، على **القيد** لا السطر — كلُّ
 * كاتبٍ آليّ يكتب `patient_id` نفسَه على أسطر القيد كلِّها، فإقصاءٌ على
 * مستوى القيد الكامل لا يكسر توازن المدين والدائن أبداً. التفصيلُ الكامل
 * في `server/accounting/ledger.ts: PATIENT_DELETION_EXCLUSION`.
 *
 * ══ ومعنى `FALSE` على قيدٍ قديم — **تصحيحٌ تاريخيّ (مراجعة ٢٠٢٦-٠٨-٢٤)**
 *    ═══════════════════════════════════════════════════════════════════
 * **`DEFAULT FALSE` هنا ليس ادّعاءَ علمٍ بالماضي** — خلافَ ما وُصف في
 * صياغةٍ سابقة لهذه الفقرة. فالنظامُ كان يملك مساراً واحداً للحذف النهائيّ
 * (`storage.deletePatient` نفسُها، مُناداةً مباشرةً من
 * `DELETE /api/patients/:id`) **قبل** أن تفصل هذه المراجعةُ بين «حذفٍ
 * ناعم» و«حذفٍ نهائيّ» — فحذوفٌ نهائيةٌ حقيقية وقعت قبل هذا العمود يقيناً،
 * ولا سبيلَ لإنكار ذلك.
 *
 * والصحيحُ: **لا يمكن الآن معرفة أيَّ قيدٍ قديم كان مالَ مريضٍ حُذف نهائياً
 * قبل هذا العمود** — لأن نفسَ الكاسكيد الذي هدم صفَّ المريض حينها نزع
 * `journal_lines.patient_id` أيضاً (وهو سلوكٌ قائمٌ منذ قبل هذا الترحيل)،
 * فانقطع الرابطُ الوحيدُ الذي كان سيُحدِّد صاحبَ القيد. **ولا استدلالَ
 * رجعيّاً يُخترَع** من مبلغٍ أو تاريخٍ أو أيّ قرينةٍ أخرى — تخمينٌ كهذا
 * قد يُقصي مالَ مريضٍ فعّالٍ بالخطأ.
 *
 * فمعنى `FALSE` على أيّ قيدٍ **دقيقٌ لا فضفاض**: «لم يُوسَم هذا القيدُ
 * بآلية الحذف النهائيّ الجديدة (ما بعد ٠٦٨)» — **وليس** «هذا القيدُ
 * يقيناً لم يكن مالَ مريضٍ محذوفٍ نهائياً يوماً». والقيودُ من قبل هذا
 * العمود تبقى — بصدقٍ — **مجهولةَ الحال**، لا مُبرَّأةً.
 *
 * ولذلك: **٠٦٨ لا يحاول إصلاح التاريخ**. القيدُ الجديد يحمي كلَّ حذفٍ
 * نهائيّ من الآن فصاعداً فحسب — والحذوفُ النهائية القديمة، إن وُجد مالُها
 * صامتاً في القوائم الفعّالة، مشكلةٌ منفصلة تحتاج تحقيقاً يدوياً لا تخميناً
 * آلياً في ترحيل.
 *
 * ══ ومعها: تشديدُ شكل بياناتِ الحذف — لا نصفَ كتابة (مراجعة ٢٠٢٦-٠٨-٢٤)
 *    ═══════════════════════════════════════════════════════════════════
 * الصياغةُ الأولى لـ`patients_active_clean_check` اكتفت بأربعةِ أعمدةٍ من
 * أحدَ عشر — فصارت الآن **العشرةَ كلَّها**: ملفٌّ فعّال لا يحمل ذرّةَ حذفٍ
 * واحدة. وقيدٌ جديد `patients_deleted_financial_snapshot_check` يُلزم
 * الحقولَ الماليةَ الخمسةَ أن تُكتب معاً دائماً حين `deleted_at` مكتوب
 * (`computeSnapshot` تضمنها جميعاً بلا مسارٍ جزئيّ)، مع مساواةِ الحساب
 * (`remaining = cost − paid`) وامتلاءِ مفاتيح `deleted_pending_json`
 * الخمسة — فلا «NULL-كصفر» ولا لقطةٌ ناقصة. **وأعمدةُ الفاعل بلا هذا
 * الشرط عمداً**: نوعُ الجلسة يُعلنها اختياريةً، فإلزامُها `NOT NULL` كان
 * يدّعي ضماناً لا يملكه الكود. كلاهما `DROP CONSTRAINT IF EXISTS` **ثمّ**
 * `ADD` — لا `IF NOT EXISTS` — كي يُشفى أيُّ تعريفٍ أضيقَ من تشغيلٍ سابق
 * لهذا الترحيل نفسِه، ما دام لا يزال مسوّدةً لم تُدمَج.
 */
export const name = "068_patient_trash";

export const sql = `
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS deleted_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id    INTEGER,
  -- لقطةُ اسمِ مَن حذف — **لا join**: الحسابُ قد يُعاد تسميتُه أو يُحذف،
  -- ويبقى السجلُّ مقروءاً. نفسُ درس «doctor_name» على المعاينة (٠٢٨).
  ADD COLUMN IF NOT EXISTS deleted_by_name       TEXT,
  ADD COLUMN IF NOT EXISTS deleted_by_role       TEXT,
  ADD COLUMN IF NOT EXISTS deleted_reason        TEXT,
  -- **يُولّده الخادمُ من ختم الحذف** — لا يُقبل من العميل ولا من ساعته.
  ADD COLUMN IF NOT EXISTS restore_until         TIMESTAMPTZ,
  -- **لقطةٌ للتدقيق والعرض وحدها** — انظر الرأس.
  ADD COLUMN IF NOT EXISTS deleted_total_cost    INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_total_paid    INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_remaining     INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_pending_json  JSONB,
  -- هل لزم المسؤولُ العام لهذا الحذف؟ يُقرأ في السلّة بلا إعادة حساب.
  ADD COLUMN IF NOT EXISTS deleted_needed_admin  BOOLEAN;

COMMENT ON COLUMN patients.deleted_at IS
  'حالة حذف على مستوى الملف. NULL = مريض فعال. ولا صف تابع يمس — الصفوف تخرج من النظام الفعال لان صاحبها خرج.';
COMMENT ON COLUMN patients.restore_until IS
  'نهاية مدة الاستعادة (30 يوما). يولده الخادم من ختم الحذف، ويقارن بـNOW() في القاعدة لا بساعة المتصفح.';
COMMENT ON COLUMN patients.deleted_remaining IS
  'لقطة الرصيد المعتمد يوم الحذف (الكلفة ناقص المدفوع). للتدقيق والعرض — وليست مصدر حقيقة مالي.';

DO $$
BEGIN
  --  ══ **ولا بياناتِ حذفٍ نصفَ مكتوبة** ═══════════════════════════════
  --  صفٌّ محذوفٌ بلا سببٍ أو بلا مهلةِ استعادة يجعل السلّة تعرض فراغاً
  --  ويجعل الاستعادةَ بلا حدّ. والقاعدةُ تمنع الحالةَ المستحيلة من الوجود.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'patients_deleted_shape_check') THEN
    ALTER TABLE patients ADD CONSTRAINT patients_deleted_shape_check
      CHECK (deleted_at IS NULL
             OR (COALESCE(BTRIM(deleted_reason), '') <> ''
                 AND restore_until IS NOT NULL
                 AND restore_until > deleted_at));
  END IF;

END $$;

--  ══ **وعكسُها: لا ذرّةَ حذفٍ — أحدَ عشرَ عموداً لا أربعة — على ملفٍّ
--     فعّال** (تشديدٌ في نفس ٠٦٨، مراجعة ٢٠٢٦-٠٨-٢٤) ═══════════════════
--  الصياغةُ الأولى اكتفت بأربعةِ أعمدةٍ («restore_until» و«deleted_reason»
--  و«deleted_by_user_id» و«deleted_by_name») فتركت ستّةً بلا حارس: سهوٌ في
--  مسارٍ مستقبليّ يكتب «deleted_total_cost» على ملفٍّ لم يُحذف كان يمرّ
--  بصمت. **الأعمدةُ العشرةُ كلُّها الآن** — وهي بالضبط ما يمسحه
--  «restorePatient» معاً في تعليمةٍ واحدة، فلا خوفَ من كسر الاستعادة.
--
--  «DROP CONSTRAINT IF EXISTS» **ثمّ** «ADD» — لا «IF NOT EXISTS» — كي
--  يُشفى أيُّ تعريفٍ أضيقَ بقي من تشغيلٍ سابق لهذا الترحيل نفسِه: ما زال
--  مسوّدةً غيرَ مدموجة، ولا قاعدةَ إنتاجٍ رأت الصياغةَ الأولى بعد، فإعادةُ
--  التعريف هنا آمنةٌ ولا تحتاج ترحيلاً جديداً (٠٦٩).
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_active_clean_check;
ALTER TABLE patients ADD CONSTRAINT patients_active_clean_check
  CHECK (deleted_at IS NOT NULL
         OR (restore_until          IS NULL
             AND deleted_by_user_id IS NULL
             AND deleted_by_name    IS NULL
             AND deleted_by_role    IS NULL
             AND deleted_reason     IS NULL
             AND deleted_total_cost    IS NULL
             AND deleted_total_paid    IS NULL
             AND deleted_remaining     IS NULL
             AND deleted_pending_json  IS NULL
             AND deleted_needed_admin  IS NULL));

--  ══ **واللقطةُ الماليةُ تُكتب كاملةً أو لا تُكتب — لا نصفَ لقطة** ═════════
--  «computeSnapshot» (في server/patients/trash_store.ts) دالّةٌ خالصة تُرجع
--  الحقولَ الخمسةَ معاً دائماً — بلا مسارٍ جزئيّ واحد في كلّ الكود. فهذه
--  **حقيقةٌ تضمنها المعاملة** حين «deleted_at» مكتوب، لا تخميناً. ومساواةُ
--  الحساب نفسِها (remaining = cost − paid) ووجودُ المفاتيح الخمسة داخل
--  «deleted_pending_json» **حارسان إضافيّان** ضدّ «NULL-كصفر»: كتابةُ صفٍّ
--  فارغٍ أو رقمَين لا يتّفقان تمرّ من فحص «IS NOT NULL» وحده، ولا تمرّ من
--  هذين.
--
--  **وأعمدةُ الفاعل (مَن حذف) عمداً بلا هذا الشرط**: نوعُ الجلسة
--  «TrashSessionLike» يُعلن userId و role و displayName اختياريةً
--  صراحةً (shared/patient_trash.ts)، فإلزامُها هنا NOT NULL كان يدّعي
--  ضماناً لا يملكه الكود — وهذا بالضبط ما يجب تجنّبه: لا NOT NULL على
--  حقيقةٍ لا تضمنها المعاملة.
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_deleted_financial_snapshot_check;
ALTER TABLE patients ADD CONSTRAINT patients_deleted_financial_snapshot_check
  CHECK (deleted_at IS NULL
         OR (deleted_total_cost    IS NOT NULL
             AND deleted_total_paid    IS NOT NULL
             AND deleted_remaining     IS NOT NULL
             AND deleted_pending_json  IS NOT NULL
             AND deleted_needed_admin  IS NOT NULL
             AND deleted_remaining = deleted_total_cost - deleted_total_paid
             AND deleted_pending_json ? 'pendingCharges'
             AND deleted_pending_json ? 'pendingDiscounts'
             AND deleted_pending_json ? 'pendingPriceRequests'
             AND deleted_pending_json ? 'openFollowups'
             AND deleted_pending_json ? 'openSettlements'));

--  ══ **فهرسُ الفعّالين — الجزئيّ هو المهمّ** ═══════════════════════════════
--  كلُّ قارئٍ تشغيليّ يصفّي «غير محذوف»، وهم السوادُ الأعظم. والفهرسُ
--  الجزئيّ يخدم ذلك بلا أن يثقله المحذوفون.
CREATE INDEX IF NOT EXISTS ix_patients_active_branch
  ON patients (branch_id, created_at DESC NULLS LAST)
  WHERE deleted_at IS NULL;

--  وفهرسُ السلّة: الأحدثُ حذفاً أوّلاً، ضمن الفرع.
CREATE INDEX IF NOT EXISTS ix_patients_trash
  ON patients (deleted_at DESC NULLS LAST)
  WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_patients_trash_branch
  ON patients (branch_id, deleted_at DESC NULLS LAST)
  WHERE deleted_at IS NOT NULL;

--  ومهلةُ الاستعادة: لقراءة «ما زال قابلاً للاستعادة» و«انقضت مدّته».
CREATE INDEX IF NOT EXISTS ix_patients_restore_until
  ON patients (restore_until)
  WHERE deleted_at IS NOT NULL;

--  ══ **إقصاءُ مالِ المحذوف نهائياً — حقيقةٌ دائمة على القيد** ══════════════
--  انظر الشرح في رأس الملفّ وفي server/accounting/ledger.ts. **والافتراضُ
--  FALSE هنا ليس ادّعاءَ علمٍ بالماضي** — حذوفٌ نهائيةٌ حقيقية وقعت عبر
--  storage.deletePatient قبل هذا العمود يقيناً، ولا سبيلَ لتحديدها بعد أن
--  انقطع الرابطُ بنزع journal_lines.patient_id حينها. فمعنى FALSE هنا
--  دقيقٌ لا فضفاض: «لم يُوسَم بعد» لا «مؤكَّدٌ نظيف». التفصيلُ الكامل في
--  رأس الملفّ.
ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS purged_patient_money BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN journal_entries.purged_patient_money IS
  'حقيقة دائمة لا تمحى: هذا القيد كان كل اسطره لمريض واحد حذف حذفا نهائيا. تكتب قبل نزع journal_lines.patient_id مباشرة كي لا يعود ماله صامتا الى القوائم الفعالة.';
`;
