-- ═════════════════════════════════════════════════════════════════════════
-- إصلاحُ إنتاجٍ يدويّ — عباس حسون فهد (WB-01452، بغداد)
-- ═════════════════════════════════════════════════════════════════════════
--
-- الواقعة: استلم المريضُ اليوم سيليكوناً بقيمة 500,000 د.ع بلا دفع. الكلفةُ
-- (والدَّين) يجب أن ترتفع 500,000، **وبلا دفعةٍ جديدة إطلاقاً**.
--
-- الحقيقةُ المؤكَّدة (يتحقّق منها السكربتُ نفسُه قبل أن يكتب حرفاً):
--   - مجموعُ الدفعات الفعلية الحالي  = 3,000,000
--   - total_cost يجب أن يصبح          7,900,000  (من 7,400,000 المفترضة)
--   - total_paid يبقى                 3,000,000  (بلا تغيير — لا دفعة تُضاف)
--   - المتبقّي يصبح                   4,900,000
--
-- **لا يجرّب هذا السكربتُ نفسَه على قاعدة الإنتاج أحد غير المالك** — الصقه
-- كاملاً في Neon Console › SQL Editor وشغّله كما هو. لا حاجة لتحرير شيء.
--
-- الأمان:
--   • يقفل صفّ المريض (FOR UPDATE) طوال الفحص والكتابة معاً.
--   • يتحقّق من الهويّة الثلاثية (الرمز + الاسم + الفرع) قبل لمس أي رقم،
--     ويتتبّع جدول الأسماء البديلة (patient_code_aliases) إن كان الرمزُ
--     انتقل بدمجٍ سابق.
--   • يرفض إن كان الملفّ في سلّة المحذوفات — ذاك بابٌ آخر (الاستعادة أولاً).
--   • يتحقّق من مجموع الدفعات الفعلي = 3,000,000 بالضبط قبل أي كتابة.
--   • **لا يمسّ جدول `payments` إطلاقاً** — لا إدراج ولا تعديل ولا حذف.
--   • idempotent بثلاثة فروع صريحة على total_cost الحالي:
--       = 7,900,000  ⟶ لا شيء يُفعل (مُطبَّقٌ سلفاً) — تقرير فقط.
--       = 7,400,000  ⟶ التطبيقُ مرّةً واحدة بالضبط.
--       أيّ رقمٍ آخر ⟶ رفضٌ صريح يُظهر الرقمَ الفعليّ — لا تخمين ولا كتابة.
--   • حارسٌ إضافي: يرفض إن وجد سلفاً قيداً يحمل علامةَ هذا الإصلاح بعينه
--     (ضدّ تكرار التشغيل لو انحرف الشرطُ أعلاه بسببٍ لم يُتوقَّع).
--   • الكتابةُ عبر نفس شكل القيد الذي يكتبه `storage.updatePatient` عند
--     تصحيحٍ إداريّ من شاشة «تعديل مريض» (`source = 'manual_edit'`، وهو
--     مصدرٌ قائم فعلاً في `shared/schema.ts`) — إذ لا مسار تشغيليّ آخر
--     (بيع جزء / معاينة) يمكن إثباتُ مطابقته لحالة هذا المريض الحيّة من
--     خارج التطبيق. **يُسنَد القيد لحالة الأطراف النشطة الوحيدة إن وُجدت**
--     (تصحيحٌ صحيح لتبويب الأقسام المحاسبية)، وإلّا يبقى «غير مبوَّب»
--     بصدقٍ بدل التخمين.
--   • معاملةٌ واحدة: كلُّ شيءٍ يُكتب معاً أو لا شيء يُكتب.
--
-- ═════════════════════════════════════════════════════════════════════════

BEGIN;

DO $$
DECLARE
  v_patient_id       INTEGER;
  v_branch_id        INTEGER;
  v_branch_name      TEXT;
  v_name             TEXT;
  v_patient_code     TEXT;
  v_deleted_at       TIMESTAMPTZ;
  v_total_cost       INTEGER;
  v_paid             INTEGER;
  v_case_id          INTEGER;
  v_duplicate_guard  INTEGER;

  c_code             CONSTANT TEXT    := 'WB-01452';
  c_name             CONSTANT TEXT    := 'عباس حسون فهد';
  c_branch           CONSTANT TEXT    := 'بغداد';
  c_delta            CONSTANT INTEGER := 500000;
  c_expected_paid    CONSTANT INTEGER := 3000000;
  c_expected_before  CONSTANT INTEGER := 7400000;
  c_expected_after   CONSTANT INTEGER := 7900000;
  c_marker           CONSTANT TEXT    := 'ABBAS_WB01452_SILICONE_2026';
BEGIN
  -- ── ١. تحديدُ الهويّة — بالرمز مباشرةً، أو عبر الاسم البديل إن دُمج الملفّ ──
  SELECT id INTO v_patient_id FROM patients WHERE patient_code = c_code;
  IF v_patient_id IS NULL THEN
    SELECT patient_id INTO v_patient_id
      FROM patient_code_aliases WHERE code = c_code;
  END IF;

  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'لم يُعثر على أيّ مريضٍ أو اسمٍ بديلٍ بالرمز % — توقّف بلا أي تعديل، راجع الرمز يدوياً', c_code;
  END IF;

  -- قفلُ الصفّ طوال الفحص والكتابة معاً.
  SELECT p.branch_id, b.name, p.name, p.patient_code, p.deleted_at, p.total_cost
    INTO v_branch_id, v_branch_name, v_name, v_patient_code, v_deleted_at, v_total_cost
  FROM patients p JOIN branches b ON b.id = p.branch_id
  WHERE p.id = v_patient_id
  FOR UPDATE OF p;

  -- ── ٢. تحقّقُ الهويّة الثلاثية — لا نمضي على تخمين ──
  IF v_name IS DISTINCT FROM c_name OR v_branch_name IS DISTINCT FROM c_branch THEN
    RAISE EXCEPTION 'الرمز % وُجد لكن الاسم/الفرع لا يطابقان المتوقَّع — وُجد: (id=%, name=%, branch=%) — توقّف بلا أي تعديل، راجع يدوياً',
      c_code, v_patient_id, v_name, v_branch_name;
  END IF;

  IF v_deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'الملفّ % (id=%) في سلّة المحذوفات (deleted_at=%) — استعده أوّلاً من صفحة «المحذوفات» ثم أعد تشغيل هذا السكربت',
      c_code, v_patient_id, v_deleted_at;
  END IF;

  -- ── ٣. تحقّقُ الحقيقة المؤكَّدة — مجموع الدفعات الفعلي ──
  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM payments WHERE patient_id = v_patient_id;
  IF v_paid <> c_expected_paid THEN
    RAISE EXCEPTION 'مجموعُ الدفعات الحاليّ % لا يطابق الحقيقة المؤكَّدة % — توقّف بلا أي تعديل، الفرضُ لم يعد صحيحاً فراجع الملفّ يدوياً',
      v_paid, c_expected_paid;
  END IF;

  -- ── ٤. حارسُ التكرار الإضافي — بصرف النظر عن حالة total_cost ──
  SELECT id INTO v_duplicate_guard FROM cost_entries
    WHERE patient_id = v_patient_id AND notes LIKE '%' || c_marker || '%'
    LIMIT 1;
  IF v_duplicate_guard IS NOT NULL THEN
    RAISE EXCEPTION 'قيدُ هذا الإصلاح بعينه موجودٌ سلفاً (cost_entries.id=%) — لا تكرار، توقّف بلا أي تعديل', v_duplicate_guard;
  END IF;

  -- ── ٥. الفرعُ الثلاثيّ على total_cost الحاليّ ──
  IF v_total_cost = c_expected_after THEN
    RAISE NOTICE 'لا شيء يُفعل: total_cost للمريض % (id=%) هو % بالفعل — الإصلاحُ مُطبَّقٌ سلفاً أو غيرُ لازم',
      c_code, v_patient_id, v_total_cost;

  ELSIF v_total_cost = c_expected_before THEN
    -- حالةُ الأطراف النشطة الوحيدة إن وُجدت — لتبويبٍ محاسبيّ صحيح، لا تخمين.
    -- الفهرسُ الفريد (patient_id, case_type) يضمن صفّاً واحداً على الأكثر.
    SELECT id INTO v_case_id FROM patient_cases
      WHERE patient_id = v_patient_id AND case_type = 'prosthetic' AND status = 'active';

    INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes)
    VALUES (
      v_patient_id, v_branch_id, c_delta, 'manual_edit', v_case_id,
      'إصلاحُ إنتاجٍ يدويّ: سيليكون بقيمة 500,000 استُلم بلا تسجيل كلفة (بلا دفعة) — ' || c_marker
    );

    UPDATE patients SET total_cost = total_cost + c_delta WHERE id = v_patient_id;

    IF v_case_id IS NOT NULL THEN
      UPDATE patient_cases SET cost = cost + c_delta, updated_at = NOW() WHERE id = v_case_id;
    END IF;

    RAISE NOTICE 'تمّ التطبيق: المريض % (id=%) — total_cost % ⟶ % (حالة أطراف مُسنَدة: %)',
      c_code, v_patient_id, v_total_cost, v_total_cost + c_delta, COALESCE(v_case_id::text, 'لا — غير مبوَّب بصدق');

  ELSE
    RAISE EXCEPTION 'total_cost الحاليّ % لا يطابق أياً من الحالتين المتوقَّعتين (% أو %) — توقّف بلا أي تعديل، الحالةُ غيرُ ما افترضه هذا السكربت فراجع الملفّ يدوياً',
      v_total_cost, c_expected_before, c_expected_after;
  END IF;
END $$;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════
-- تقريرُ التحقّق — الحالةُ الفعلية بعد أيّ التزام (شغّله دائماً؛ إن رُفض
-- الإصلاحُ أعلاه بخطأ فهذا يُظهر أن شيئاً لم يتغيّر)
-- ═════════════════════════════════════════════════════════════════════════
SELECT
  p.id, p.patient_code, p.name, b.name AS branch,
  p.total_cost,
  COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) AS total_paid,
  p.total_cost - COALESCE((SELECT SUM(amount) FROM payments WHERE patient_id = p.id), 0) AS remaining
FROM patients p JOIN branches b ON b.id = p.branch_id
WHERE p.patient_code = 'WB-01452'
   OR p.id = (SELECT patient_id FROM patient_code_aliases WHERE code = 'WB-01452');

-- آخرُ خمسة قيود كلفة لهذا المريض — للمراجعة البصرية.
SELECT ce.id, ce.amount, ce.source, ce.case_id, ce.notes, ce.created_at
FROM cost_entries ce
WHERE ce.patient_id = (
  SELECT COALESCE(
    (SELECT id FROM patients WHERE patient_code = 'WB-01452'),
    (SELECT patient_id FROM patient_code_aliases WHERE code = 'WB-01452')
  )
)
ORDER BY ce.id DESC
LIMIT 5;
