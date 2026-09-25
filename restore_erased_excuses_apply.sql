-- ═══════════════════════════════════════════════════════════════════════
--  استرجاعُ الأعذار التي مُحيت قبل إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣).
--
--  لا تشغّله قبل أن تراجع نتيجةَ «restore_erased_excuses_preview.sql».
--
--  يُعيد إلى كلّ أمرٍ في قائمة المعاينة **آخرَ عذرٍ كتبه الخبيرُ بيده** —
--  لا غيرَه، ولا يُخترَع عذر. فيصير الأمرُ «متأخر بعذر» بالأصفر، كما كان
--  سيبقى لو طُبّق الإصلاحُ من البداية.
--
--  ولا يمسّ غيرَ عمودَي العذر: لا حالةَ ولا مرحلةَ ولا موعداً ولا خبيراً ولا
--  ديناراً. ويُضيف لكلّ أمرٍ سطراً في خطّه الزمني وسطراً في سجلّ التدقيق
--  يقولان ما جرى ومِن أيّ سطرٍ أُعيد.
--
--  الاستعمال: ضع في السطر المعلَّم أدناه أرقامَ الأوامر التي لا تريد إعادةَ
--  عذرها (من عمود «رقم الأمر» في المعاينة)، ثمّ نفّذه في Neon.
--  وأيُّ رقمٍ ليس في قائمة المعاينة ⟶ يتوقّف قبل أيّ كتابة.
--  وأيُّ اختلافٍ عمّا يتوقّعه ⟶ يرفع خطأً فيرتدّ كلُّ شيء.
--  وتشغيلُه مرّةً ثانية لا يفعل شيئاً: ما عاد عذرُه خرج من القائمة.
-- ═══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  --  ← أرقامُ الأوامر المستبعَدة. مثال: ARRAY[362, 372]
  --    اتركها فارغةً هكذا لإعادة الأعذار كلِّها.
  v_excluded      integer[] := ARRAY[]::integer[];
  --  ومَن ينفّذ. اتركه صفراً إن نُفِّذ من Neon بلا حسابٍ في النظام، فيُكتب
  --  التدقيقُ بلا رقمِ مستخدم وباسمٍ صادقٍ يقول إنّه تدخّلٌ يدويّ. وإن وضعتَ
  --  رقماً فلا بدّ أن يكون حساباً قائماً — وإلّا توقّف قبل أوّل كتابة.
  v_operator_id   integer := 0;
  v_operator_name text    := 'تدخّلٌ يدويّ على قاعدة البيانات';
  v_actor         integer := NULL;
  rec             record;
  v_bad           integer[];
  v_stage         text;
  v_done          integer[] := ARRAY[]::integer[];
  v_changed       integer[] := ARRAY[]::integer[];
  v_total         integer;
  n               integer;
BEGIN
  --  أمرٌ مقفولٌ في طلبٍ طويل لا يُنتظَر بلا نهاية: يتوقّف كلُّ شيء فيُعاد التشغيل.
  PERFORM set_config('lock_timeout', '5s', true);

  -- ① المنفِّذ
  IF COALESCE(v_operator_id, 0) > 0 THEN
    SELECT display_name INTO v_operator_name FROM system_users WHERE id = v_operator_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'لا حسابَ في النظام بالرقم % — ضع رقماً صحيحاً أو اتركه صفراً. لم يتغيّر شيء',
        v_operator_id;
    END IF;
    v_actor := v_operator_id;
  END IF;

  -- ② القائمةُ نفسُها التي تعرضها المعاينة — بالتعريف نفسِه حرفاً بحرف
  CREATE TEMP TABLE _excuse_restore ON COMMIT DROP AS
  WITH
-- ▼▼ تعريفُ المرشَّحين — نصٌّ واحد في ملفَّي المعاينة والكتابة، يحرسه الاختبارُ بمطابقةٍ حرفية ▼▼
reason_labels(code, label) AS (VALUES
  ('patient_no_show', 'المريض لم يحضر'),
  ('patient_return_required', 'يحتاج مراجعة المريض'),
  ('patient_preparation_required', 'يحتاج تحضير المريض'),
  ('manufacturer_components', 'مكوّنات من المصنّع'),
  ('materials_unavailable', 'المواد غير متوفّرة'),
  ('component_delay', 'تأخّر وصول مكوّن'),
  ('other', 'سبب آخر'),
  ('swelling', 'تورّم'),
  ('wound_or_skin_issue', 'جرح أو مشكلة جلدية'),
  ('medical_clearance', 'بانتظار موافقة طبية'),
  ('mold_fit', 'ملاءمة القالب'),
  ('socket_fit', 'ملاءمة السوكت'),
  ('alignment_or_calibration', 'المحاذاة أو المعايرة'),
  ('device_adjustment', 'تعديل الجهاز'),
  ('remake', 'إعادة تصنيع'),
  ('measurement_error', 'خطأ في القياس (سابقاً)'),
  ('cast_error', 'خطأ في القالب (سابقاً)'),
  ('socket_fit_error', 'مشكلة في ملاءمة السوكت (سابقاً)'),
  ('manufacturing_error', 'خطأ في التصنيع (سابقاً)'),
  ('patient_body_change', 'تغيّر في حجم الطرف (سابقاً)'),
  ('medical_reason', 'سبب طبي (سابقاً)'),
  ('patient_noncompliance', 'عدم التزام المريض (سابقاً)'),
  ('component_problem', 'مشكلة في المكونات (سابقاً)')
),
--  سطورُ العذر في السجلّ الزمني — بصيغة كاتبيها الثلاثة حرفاً بحرف:
--  «توقّف / مشكلة» (توقّفٌ جديد) · وإعادةُ العمل الفنّي منه · و«كتابة سبب التوقّف».
--  والصيغةُ ثابتةٌ منذ وُلد العذرُ نفسُه (٢٠٢٦-٠٨-١١، طلب الدمج ٢٠٥)، والرمزُ فيها
--  دائماً من قائمةٍ مُحكَمة — وسطورُ ما قبلها (`الحالة: …` و`إعادة عمل: …`) لا تطابقها.
excuse_lines AS (
  SELECT h.id, h.work_order_id, h.created_at, h.performed_by,
         substring(h.notes FROM 'السبب: ([a-z_]+)') AS code,
         NULLIF(substring(h.notes FROM 'السبب: [a-z_]+ — (.*)$'), '') AS note
    FROM prosthetic_work_history h
   WHERE (h.action_type = 'status_change' AND h.notes LIKE 'توقّف: %')
      OR (h.action_type = 'rework'        AND h.notes LIKE 'إعادة عمل فني — رجوع من %')
      OR (h.action_type = 'hold_reason'   AND h.notes LIKE 'سبب التوقّف: %')
),
--  الأحدثُ وحده — عذرٌ أحدث يحلّ محلَّ الأقدم، كما في القاعدة اليوم.
latest AS (
  SELECT DISTINCT ON (work_order_id) *
    FROM excuse_lines
   ORDER BY work_order_id, created_at DESC, id DESC
),
candidates AS (
  SELECT o.id, o.patient_id, o.branch_id, o.expert_user_id, o.status,
         o.current_stage, o.expected_delivery_date,
         l.id AS line_id, l.code, COALESCE(rl.label, l.code) AS label, l.note,
         l.created_at AS written_at, l.performed_by AS written_by
    FROM prosthetic_work_orders o
    JOIN latest l ON l.work_order_id = o.id
    LEFT JOIN reason_labels rl ON rl.code = l.code
   --  المنتهي خارجٌ: التسليمُ والإلغاءُ يُنهيان العذرَ بحقّ. والمُبطَلُ إدارياً
   --  حالتُه `cancelled` أو `completed` فيخرج بالشرط نفسِه.
   WHERE o.status NOT IN ('completed', 'cancelled')
     AND NULLIF(btrim(o.hold_reason_code), '') IS NULL
)
-- ▲▲ نهايةُ تعريف المرشَّحين ▲▲
  SELECT c.*, COALESCE(w.display_name, '—') AS written_by_name
    FROM candidates c
    LEFT JOIN system_users w ON w.id = c.written_by;

  SELECT COUNT(*) INTO v_total FROM _excuse_restore;

  -- ③ الاستبعادُ من القائمة وحدها — رقمٌ ليس فيها خطأُ كتابةٍ يُصحَّح قبل أيّ كتابة
  SELECT array_agg(e ORDER BY e) INTO v_bad
    FROM unnest(v_excluded) AS e
   WHERE e IS NULL OR NOT EXISTS (SELECT 1 FROM _excuse_restore r WHERE r.id = e);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'هذه الأرقام ليست في قائمة المعاينة: % — راجعها ثمّ أعد التشغيل. لم يتغيّر شيء',
      v_bad;
  END IF;

  -- ④ الإعادةُ أمراً أمراً — والشرطُ يُعاد فحصُه على الصفّ الحيّ لحظةَ الكتابة:
  --    أمرٌ كُتب له عذرٌ أحدث أو انتهى أثناء التشغيل يُترك كما هو، ولا يُكتب فوقه.
  FOR rec IN
    SELECT * FROM _excuse_restore WHERE NOT (id = ANY (v_excluded)) ORDER BY id
  LOOP
    UPDATE prosthetic_work_orders
       SET hold_reason_code = rec.code,
           hold_note        = rec.note,
           updated_at       = NOW()
     WHERE id = rec.id
       AND status NOT IN ('completed', 'cancelled')
       AND NULLIF(btrim(hold_reason_code), '') IS NULL
    RETURNING current_stage INTO v_stage;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n = 0 THEN
      v_changed := v_changed || rec.id;
      RAISE NOTICE 'الأمر #% تغيّر أثناء التشغيل (كُتب له عذرٌ أحدث أو انتهى) — تُرك كما هو',
        rec.id;
      CONTINUE;
    END IF;

    --  السجلُّ لا يُمحى: يُضاف سطرٌ يقول ما أُعيد، ومَن كتبه أصلاً ومتى.
    INSERT INTO prosthetic_work_history
      (work_order_id, action_type, from_stage, to_stage, notes, performed_by)
    VALUES (rec.id, 'hold_reason', v_stage, v_stage,
            'استرجاعُ عذرٍ مُحي قبل إصلاح ٢٠٢٦-٠٩-٢٤: ' || rec.label
            || COALESCE(' — ' || rec.note, '')
            || ' — كتبه ' || rec.written_by_name || ' في '
            || to_char(rec.written_at AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD HH24:MI')
            || ' — نفّذه: ' || v_operator_name,
            v_actor);

    INSERT INTO audit_log
      (entity_type, entity_id, action, user_id, user_name, branch_id,
       old_values, new_values, notes)
    VALUES ('prosthetic_work_order', rec.id, 'update', v_actor, v_operator_name, rec.branch_id,
            jsonb_build_object('holdReasonCode', NULL, 'holdNote', NULL)::text,
            jsonb_build_object('holdReasonCode', rec.code, 'holdNote', rec.note,
                               'restoredFromHistoryId', rec.line_id,
                               'writtenBy', rec.written_by,
                               'writtenAt', rec.written_at)::text,
            'استرجاعُ عذرٍ مكتوبٍ مُحي قبل إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣)');

    v_done := v_done || rec.id;
  END LOOP;

  -- ⑤ التحقّق — أيُّ اختلافٍ يُرجع كلَّ شيء
  --    كلُّ أمرٍ أُعيد عذرُه يحمل الآن ما في سطره بالضبط.
  SELECT COUNT(*) INTO n
    FROM _excuse_restore r
    JOIN prosthetic_work_orders o ON o.id = r.id
   WHERE r.id = ANY (v_done)
     AND o.hold_reason_code = r.code
     AND o.hold_note IS NOT DISTINCT FROM r.note;
  IF n <> COALESCE(array_length(v_done, 1), 0) THEN
    RAISE EXCEPTION 'تحقّقٌ فشل: الأعذارُ المُعادة لا تطابق سطورَها — لم يتغيّر شيء';
  END IF;
  --    وسطرٌ واحد بالضبط في الخطّ الزمني وفي التدقيق لكلّ أمرٍ أُعيد — لا أكثر.
  SELECT COUNT(*) INTO n
    FROM prosthetic_work_history
   WHERE work_order_id = ANY (v_done)
     AND action_type = 'hold_reason'
     AND notes LIKE 'استرجاعُ عذرٍ مُحي قبل إصلاح ٢٠٢٦-٠٩-٢٤: %';
  IF n <> COALESCE(array_length(v_done, 1), 0) THEN
    RAISE EXCEPTION 'تحقّقٌ فشل: سطورُ الخطّ الزمني (%) لا تطابق عددَ الأوامر (%) — لم يتغيّر شيء',
      n, COALESCE(array_length(v_done, 1), 0);
  END IF;
  SELECT COUNT(*) INTO n
    FROM audit_log
   WHERE entity_type = 'prosthetic_work_order'
     AND entity_id = ANY (v_done)
     AND notes = 'استرجاعُ عذرٍ مكتوبٍ مُحي قبل إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣)';
  IF n <> COALESCE(array_length(v_done, 1), 0) THEN
    RAISE EXCEPTION 'تحقّقٌ فشل: سطورُ التدقيق (%) لا تطابق عددَ الأوامر (%) — لم يتغيّر شيء',
      n, COALESCE(array_length(v_done, 1), 0);
  END IF;

  -- ⑥ الخلاصة
  IF v_total = 0 THEN
    RAISE NOTICE 'لا عذرَ ممحوّاً يُعاد — لم يتغيّر شيء';
  ELSE
    RAISE NOTICE '✔ أُعيد العذرُ إلى % أمراً من % في المعاينة — واستُبعد % بطلبك، وتُرك % تغيّر أثناء التشغيل',
      COALESCE(array_length(v_done, 1), 0), v_total,
      COALESCE(array_length(v_excluded, 1), 0), COALESCE(array_length(v_changed, 1), 0);
    RAISE NOTICE 'الأوامرُ التي عاد عذرُها: %', v_done;
  END IF;
END $$;
