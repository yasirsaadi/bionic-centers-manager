-- ═══════════════════════════════════════════════════════════════════════
--  نقلُ دفعةٍ من جهازٍ إلى جهازٍ آخر **لنفس المريض ونفس الخيط**.
--
--  لا يتحرّك دينار: المريضُ نفسُه والفرعُ نفسُه والمبلغُ نفسُه والحالةُ
--  نفسُها. المتغيّرُ الوحيد: **أيُّ جهازٍ تُنسَب إليه الدفعة**.
--
--  ولماذا: نقطةُ تعديل الدفعة في التطبيق لا تغيّر الجهاز — تغيّر المبلغَ
--  والتاريخَ والوسمَ والملاحظة فقط. فلا بابَ لهذا إلّا هنا.
--
--  ولا يُخمِّن: يتحقّق أن الجهازين لنفس المريض ونفس الخيط، وأن الهدفَ حيٌّ
--  غيرُ ملغىً ولا مُبطَلٍ إدارياً. وأيُّ اختلاف ⟶ خطأٌ يرتدّ به كلُّ شيء.
-- ═══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_patient_code  text    := 'WB-01982';
  v_from_episode  integer := 257;   -- الجهاز الذي تُسحب منه الدفعات
  v_to_episode    integer := 258;   -- الجهاز الذي تُنسَب إليه
  v_patient_id    integer;
  v_from          patient_device_episodes%ROWTYPE;
  v_to            patient_device_episodes%ROWTYPE;
  v_moved         integer;
  v_sum           integer;
  p               record;
BEGIN
  SELECT id INTO v_patient_id FROM patients WHERE patient_code = btrim(v_patient_code);
  IF v_patient_id IS NULL THEN
    RAISE EXCEPTION 'لا مريضَ بالرمز %', v_patient_code;
  END IF;

  SELECT * INTO v_from FROM patient_device_episodes WHERE id = v_from_episode FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'لا جهازَ بالرقم %', v_from_episode; END IF;
  SELECT * INTO v_to   FROM patient_device_episodes WHERE id = v_to_episode   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'لا جهازَ بالرقم %', v_to_episode; END IF;

  IF v_from.patient_id <> v_patient_id OR v_to.patient_id <> v_patient_id THEN
    RAISE EXCEPTION 'أحدُ الجهازين ليس لهذا المريض — توقّف';
  END IF;
  IF v_from.case_id <> v_to.case_id THEN
    RAISE EXCEPTION 'الجهازان على خيطين مختلفين (% و%) — توقّف', v_from.case_id, v_to.case_id;
  END IF;
  IF v_to.status NOT IN ('in_manufacturing','delivered') THEN
    RAISE EXCEPTION 'الجهازُ الهدف حالتُه % — لا تُنسَب إليه دفعة', v_to.status;
  END IF;
  IF v_to.admin_void_reversal_id IS NOT NULL THEN
    RAISE EXCEPTION 'الجهازُ الهدف مُبطَلٌ إدارياً — توقّف';
  END IF;

  SELECT COUNT(*)::int, COALESCE(SUM(amount),0)::int INTO v_moved, v_sum
    FROM payments WHERE patient_id = v_patient_id AND device_episode_id = v_from_episode;
  IF v_moved = 0 THEN
    RAISE EXCEPTION 'لا دفعةَ على الجهاز % — لا شيءَ يُنقَل', v_from_episode;
  END IF;

  --  سطرُ تدقيقٍ لكلّ دفعة **قبل** النقل، فيبقى الأصلُ مقروءاً.
  FOR p IN SELECT id, amount, notes, case_id, branch_id
             FROM payments
            WHERE patient_id = v_patient_id AND device_episode_id = v_from_episode
            ORDER BY id
  LOOP
    INSERT INTO audit_log
      (entity_type, entity_id, action, user_id, user_name, branch_id,
       old_values, new_values, notes)
    VALUES ('payment', p.id, 'update', NULL, 'تصحيح إداري', p.branch_id,
            jsonb_build_object('deviceEpisodeId', v_from_episode, 'amount', p.amount)::text,
            jsonb_build_object('deviceEpisodeId', v_to_episode,   'amount', p.amount)::text,
            'نقلُ الدفعة من الجهاز #' || v_from_episode || ' إلى الجهاز #' || v_to_episode
            || ' — الجهازُ الأول أمرُ تصنيعٍ مكرَّر سيُلغى، والمالُ يخصّ الجهاز القائم.'
            || ' لا مبلغَ تغيّر ولا قيدَ يومية.');
  END LOOP;

  UPDATE payments
     SET device_episode_id = v_to_episode
   WHERE patient_id = v_patient_id AND device_episode_id = v_from_episode;

  RAISE NOTICE '✔ نُقلت % دفعة بمجموع % د.ع من الجهاز #% إلى الجهاز #%',
    v_moved, v_sum, v_from_episode, v_to_episode;
  RAISE NOTICE 'المدفوع الآن على الجهاز #%: % — وعلى الجهاز #%: %',
    v_from_episode,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE device_episode_id = v_from_episode),
    v_to_episode,
    (SELECT COALESCE(SUM(amount),0) FROM payments WHERE device_episode_id = v_to_episode);
END $$;
