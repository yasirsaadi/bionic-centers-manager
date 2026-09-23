-- ═══════════════════════════════════════════════════════════════════════
--  التراجع عن «إلغاء العملية بالكامل» الذي وقع بالخطأ.
--
--  يُعيد الملفَّ إلى حالته قبل الضغطة بالضبط: المالُ المسترجَع يعود،
--  وأمرُ التصنيع يعود عاملاً، والحلقةُ والمتابعةُ والمعاينةُ والكلفة.
--
--  ولا يُخمِّن شيئاً: يقرأ الحالاتِ السابقة من سطر التدقيق، ويتحقّق من كلّ
--  فرضيةٍ قبل أن يكتب. وأيُّ اختلافٍ عمّا يتوقّعه ⟶ يرفع خطأً فيرتدّ كلُّ
--  شيء ولا يبقى نصفُ تراجع.
--
--  **وما لا يحمله التدقيقُ يقف عنده ولا يلفّقه**: سطرُ التدقيق يحمل
--  الحالاتِ وحدها، لا وقتَ إغلاق المتابعة ولا سببَه، ولا ختمَ إلغاء الحلقة
--  ولا سببَه. فإن كانت المتابعةُ مغلقةً أو الحلقةُ ملغاةً **قبل** الإلغاء
--  الإداريّ — وقد كتب الإلغاءُ فوق الزوجين — يرفع خطأً بدل أن يُرجع الحالةَ
--  بفراغٍ مكان سببها ووقتها.
--
--  الاستعمال: ضع رمزَ المريض في السطر المعلَّم أدناه (ورقمَك إن كان لك حسابٌ
--  في النظام)، ثمّ نفّذه في Neon.
-- ═══════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  --  ضع رمزَ المريض وحده — والسكربتُ يجد التصحيحَ بنفسه ويرفض إن تعدّد.
  v_patient_code  text    := 'WB-01982';
  --  أو ضع رقمَ التصحيح صراحةً هنا فيُقدَّم على الرمز (اتركه صفراً للبحث).
  v_reversal_id   integer := 0;
  --  **ومَن ينفّذ التراجع** — لا مَن أوقع الإلغاءَ الذي نتراجع عنه.
  --  اتركه صفراً إن نُفِّذ من Console بلا حسابٍ في النظام، فيُكتب التدقيقُ
  --  بلا رقمِ مستخدم وباسمٍ صادقٍ يقول إنّه تدخّلٌ يدويّ. وإن وضعتَ رقماً
  --  فلا بدّ أن يكون حساباً قائماً — وإلّا رُفض قبل أوّل كتابة.
  v_operator_id   integer := 0;
  v_operator_name text    := 'تدخّلٌ يدويّ على قاعدة البيانات';
  r               administrative_operation_reversals%ROWTYPE;
  v_old           jsonb;
  v_new           jsonb;
  v_ord_status    text;
  v_epi_status    text;
  v_fu_status     text;
  v_cost          integer;
  v_pay_id        integer;
  v_pay_amount    integer;
  v_entry_id      integer;
  v_ce_id         integer;
  v_case_id       integer;
  v_sum_entries   integer;
  v_total_now     integer;
  v_case_now      integer;
  n               integer;
BEGIN
  --  ① أ · تحديدُ التصحيح — بالرقم إن أُعطي، وإلّا بالرمز بشرط أن يكون واحداً
  IF v_reversal_id IS NULL OR v_reversal_id <= 0 THEN
    IF COALESCE(btrim(v_patient_code),'') = '' THEN
      RAISE EXCEPTION 'ضع رمزَ المريض أو رقمَ التصحيح أولاً';
    END IF;
    SELECT COUNT(*) INTO n
      FROM administrative_operation_reversals ar
      JOIN patients p ON p.id = ar.patient_id
     WHERE p.patient_code = btrim(v_patient_code)
       AND ar.created_at >= NOW() - INTERVAL '7 days';
    IF n = 0 THEN
      RAISE EXCEPTION 'لا تصحيحَ إدارياً حديثاً على الملفّ % — لا شيءَ يُتراجَع عنه',
        v_patient_code;
    END IF;
    IF n > 1 THEN
      RAISE EXCEPTION 'على الملفّ % عددُ تصحيحاتٍ حديثة (%) — ضع رقمَ المقصود صراحةً',
        v_patient_code, n;
    END IF;
    SELECT ar.id INTO v_reversal_id
      FROM administrative_operation_reversals ar
      JOIN patients p ON p.id = ar.patient_id
     WHERE p.patient_code = btrim(v_patient_code)
       AND ar.created_at >= NOW() - INTERVAL '7 days';
    RAISE NOTICE 'التصحيحُ المقصود على الملفّ %: #%', v_patient_code, v_reversal_id;
  END IF;

  -- ① صفُّ التصحيح مقفولاً
  SELECT * INTO r FROM administrative_operation_reversals
   WHERE id = v_reversal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'لا يوجد تصحيح إداري بالرقم %', v_reversal_id; END IF;
  IF r.mode <> 'full_operation' THEN
    RAISE EXCEPTION 'هذا السكربت لوضع «إلغاء العملية بالكامل» وحده — الوضع هنا %', r.mode;
  END IF;
  IF r.created_at < NOW() - INTERVAL '7 days' THEN
    RAISE EXCEPTION 'التصحيح أقدم من سبعة أيام (%) — راجِعه يدوياً قبل التراجع', r.created_at;
  END IF;

  --  ①-ب مَن ينفّذ: رقمٌ قائمٌ أو لا رقمَ إطلاقاً — ولا يُنسَب الفعلُ لغيره
  IF v_operator_id IS NOT NULL AND v_operator_id > 0 THEN
    PERFORM 1 FROM system_users WHERE id = v_operator_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'لا حسابَ بالرقم % — صحّح v_operator_id أو اتركه صفراً', v_operator_id;
    END IF;
    SELECT COALESCE(NULLIF(btrim(display_name),''), v_operator_name)
      INTO v_operator_name FROM system_users WHERE id = v_operator_id;
  ELSE
    v_operator_id := NULL;
  END IF;

  -- ② الحالاتُ السابقة من سطر التدقيق — لا تُخمَّن
  SELECT a.old_values::jsonb, a.new_values::jsonb INTO v_old, v_new
    FROM audit_log a
   WHERE a.entity_type = 'administrative_operation_reversal' AND a.entity_id = v_reversal_id
   ORDER BY a.id DESC LIMIT 1;
  IF v_old IS NULL THEN
    RAISE EXCEPTION 'لا سطرَ تدقيق لهذا التصحيح — الحالةُ السابقة غير معروفة';
  END IF;
  v_ord_status := v_old ->> 'orderStatus';
  v_epi_status := v_old ->> 'episodeStatus';
  v_fu_status  := v_old ->> 'followupStatus';

  IF COALESCE(v_new ->> 'replacementEpisodeId', '') <> '' THEN
    RAISE EXCEPTION 'هذا التصحيح فتح طلباً بديلاً (#%) — لا يتراجع عنه هذا السكربت',
      v_new ->> 'replacementEpisodeId';
  END IF;

  -- ③ ردُّ المال: تُحذَف الدفعةُ السالبة وقيدُها — لأن نقداً لم يخرج فعلاً،
  --    وإضافةُ صفٍّ موجبٍ مقابل كانت ستُظهر وارداً اليوم لم يقع.
  SELECT COUNT(*) INTO n FROM payments p
   WHERE p.patient_id = r.patient_id
     AND p.notes LIKE 'استرجاع كامل المبلغ عند إلغاء العملية إدارياً #'
                      || v_reversal_id || ' %';
  IF n > 1 THEN RAISE EXCEPTION 'وُجدت % دفعةَ استرجاع لهذا التصحيح — توقّف', n; END IF;
  IF n = 1 THEN
    SELECT p.id, p.amount INTO v_pay_id, v_pay_amount FROM payments p
     WHERE p.patient_id = r.patient_id
       AND p.notes LIKE 'استرجاع كامل المبلغ عند إلغاء العملية إدارياً #'
                        || v_reversal_id || ' %';
  END IF;

  IF v_pay_id IS NOT NULL THEN
    IF v_pay_amount >= 0 THEN
      RAISE EXCEPTION 'دفعةُ الاسترجاع #% مبلغُها % وليست سالبة — توقّف', v_pay_id, v_pay_amount;
    END IF;
    DELETE FROM journal_lines
     WHERE entry_id IN (SELECT id FROM journal_entries
                         WHERE source_type = 'payment' AND source_id = v_pay_id);
    DELETE FROM journal_entries
     WHERE source_type = 'payment' AND source_id = v_pay_id;
    DELETE FROM payments WHERE id = v_pay_id;
    RAISE NOTICE 'أُلغيت دفعةُ الاسترجاع #% بمبلغ % وقيدُها', v_pay_id, v_pay_amount;
  ELSE
    RAISE NOTICE 'لا دفعةَ استرجاع لهذا التصحيح — لم يُردّ مال';
  END IF;

  -- ④ الكلفة: يُحذَف القيدُ المعاكس ويعود المجموع
  v_cost := COALESCE(-r.financial_delta, 0);
  IF v_cost > 0 THEN
    SELECT COUNT(*) INTO n FROM cost_entries ce
     WHERE ce.patient_id = r.patient_id
       AND ce.source = 'administrative_reversal'
       AND ce.notes = 'عكس كلفة بسبب إلغاء إداري للعملية #' || v_reversal_id;
    IF n <> 1 THEN
      RAISE EXCEPTION 'وُجد % قيدَ كلفةٍ معاكس لهذا التصحيح (المتوقَّع واحد) — توقّف', n;
    END IF;
    SELECT ce.id, ce.case_id INTO v_ce_id, v_case_id FROM cost_entries ce
     WHERE ce.patient_id = r.patient_id
       AND ce.source = 'administrative_reversal'
       AND ce.notes = 'عكس كلفة بسبب إلغاء إداري للعملية #' || v_reversal_id;
    DELETE FROM cost_entries WHERE id = v_ce_id;

    UPDATE patients SET total_cost = COALESCE(total_cost,0) + v_cost
     WHERE id = r.patient_id RETURNING total_cost INTO v_total_now;
    IF v_case_id IS NOT NULL THEN
      UPDATE patient_cases SET cost = COALESCE(cost,0) + v_cost, updated_at = NOW()
       WHERE id = v_case_id RETURNING cost INTO v_case_now;
    END IF;

    --  حارسُ الدفتر: مجموعُ القيود = كلفةُ المريض. لو لم يتطابقا فالجمعُ
    --  البسيط لا يصف ما جرى (قصٌّ عند الصفر مثلاً) ⟶ توقّف ولا تكتب.
    SELECT COALESCE(SUM(amount),0) INTO v_sum_entries
      FROM cost_entries WHERE patient_id = r.patient_id;
    IF v_sum_entries <> v_total_now THEN
      RAISE EXCEPTION 'الدفترُ لا يطابق كلفةَ المريض بعد الاستعادة (قيود=% كلفة=%) — تراجعتُ بلا كتابة',
        v_sum_entries, v_total_now;
    END IF;
    RAISE NOTICE 'أُعيدت الكلفة % — مجموع المريض % وكلفة الحالة %',
      v_cost, v_total_now, COALESCE(v_case_now, -1);
  END IF;

  -- ⑤ أمرُ التصنيع يعود إلى حالته
  IF r.work_order_id IS NOT NULL THEN
    IF v_ord_status IS NULL THEN
      RAISE EXCEPTION 'الحالةُ السابقة لأمر التصنيع غير مسجَّلة في التدقيق — توقّف';
    END IF;
    IF v_ord_status IN ('waiting_patient','waiting_materials','medical_hold','technical_rework') THEN
      RAISE EXCEPTION 'الأمرُ كان متوقّفاً (%) وسببُ التوقّف مُسح عند الإلغاء — يحتاج إعادةً يدوية',
        v_ord_status;
    END IF;
    UPDATE prosthetic_work_orders
       SET status = v_ord_status,
           admin_void_reversal_id = NULL,
           updated_at = NOW()
     WHERE id = r.work_order_id AND admin_void_reversal_id = v_reversal_id;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN
      RAISE EXCEPTION 'أمرُ التصنيع #% لا يحمل وسمَ هذا الإلغاء — توقّف', r.work_order_id;
    END IF;

    --  السجلُّ لا يُمحى: يُضاف سطرٌ يقول إن الإلغاء تُرووجع عنه.
    INSERT INTO prosthetic_work_history
      (work_order_id, action_type, from_stage, to_stage, notes, performed_by)
    SELECT r.work_order_id, 'status_change', wo.current_stage, wo.current_stage,
           'تراجُع إداري عن الإلغاء #' || v_reversal_id
           || ' — أُلغي الأمر بالخطأ وأُعيد إلى حالته السابقة (' || v_ord_status || ')'
           || ' — نفّذه: ' || v_operator_name,
           v_operator_id
      FROM prosthetic_work_orders wo WHERE wo.id = r.work_order_id;
    RAISE NOTICE 'أمرُ التصنيع #% عاد إلى %', r.work_order_id, v_ord_status;
  END IF;

  -- ⑥ حلقةُ الجهاز
  IF r.device_episode_id IS NOT NULL THEN
    IF v_epi_status IS NULL THEN
      RAISE EXCEPTION 'الحالةُ السابقة لحلقة الجهاز غير مسجَّلة في التدقيق — توقّف';
    END IF;
    --  **وحلقةٌ كانت ملغاةً قبل الإلغاء الإداريّ لا تُستعاد بالتخمين**:
    --  `markEpisodeAdministrativelyVoid` تكتب فوق `cancelled_at` و
    --  `cancel_reason` القائمين، وسطرُ التدقيق يحمل **الحالةَ وحدها** لا
    --  ختمَها ولا سببَها. فتصفيرُهما هنا يمحو شهادةَ إلغاءٍ حقيقيٍّ سابق
    --  ويكتب مكانها فراغاً. والصدقُ أن نقف (نفسُ منطق حالات التوقّف أعلاه).
    IF v_epi_status = 'cancelled' THEN
      RAISE EXCEPTION 'الحلقةُ #% كانت ملغاةً أصلاً قبل التصحيح، وسببُ إلغائها وختمُه كُتب فوقهما ولا يحملهما التدقيق — تحتاج إعادةً يدوية',
        r.device_episode_id;
    END IF;
    IF v_epi_status = 'delivered' THEN
      UPDATE patient_device_episodes
         SET admin_void_reversal_id = NULL, updated_at = NOW()
       WHERE id = r.device_episode_id AND admin_void_reversal_id = v_reversal_id;
    ELSE
      UPDATE patient_device_episodes
         SET admin_void_reversal_id = NULL, status = v_epi_status,
             cancelled_at = NULL, cancel_reason = NULL, updated_at = NOW()
       WHERE id = r.device_episode_id AND admin_void_reversal_id = v_reversal_id;
    END IF;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN
      RAISE EXCEPTION 'حلقةُ الجهاز #% لا تحمل وسمَ هذا الإلغاء — توقّف', r.device_episode_id;
    END IF;
    RAISE NOTICE 'حلقةُ الجهاز #% عادت إلى %', r.device_episode_id, v_epi_status;
  END IF;

  -- ⑦ المتابعة
  IF r.followup_id IS NOT NULL THEN
    IF v_fu_status IS NULL THEN
      RAISE EXCEPTION 'الحالةُ السابقة للمتابعة غير مسجَّلة في التدقيق — توقّف';
    END IF;
    --  **ومتابعةٌ كانت مغلقةً قبل الإلغاء الإداريّ لا تُستعاد بالتخمين**:
    --  الإلغاءُ كتب فوق `closed_at` و`closed_reason`، والتدقيقُ يحمل
    --  **الحالةَ وحدها**. فإرجاعُ الحالةِ وتصفيرُ الاثنين يُنتج صفّاً يقول
    --  «أُغلقت بلا شراء» بلا وقتٍ ولا سبب — وذاك أسوأُ من الوقوف.
    IF v_fu_status LIKE 'closed\_%' THEN
      RAISE EXCEPTION 'المتابعة #% كانت مغلقةً أصلاً (%)، ووقتُ إغلاقها وسببُه كُتب فوقهما ولا يحملهما التدقيق — تحتاج إعادةً يدوية',
        r.followup_id, v_fu_status;
    END IF;
    UPDATE post_exam_followups
       SET status = v_fu_status, closed_at = NULL, closed_reason = NULL, updated_at = NOW()
     WHERE id = r.followup_id AND status = 'closed_admin_void';
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n <> 1 THEN
      RAISE EXCEPTION 'المتابعة #% ليست «ملغاة إدارياً» — توقّف', r.followup_id;
    END IF;
    DELETE FROM post_exam_followup_events
     WHERE followup_id = r.followup_id
       AND event_type = 'administrative_reversal'
       AND (payload ->> 'reversalId') = v_reversal_id::text;
    RAISE NOTICE 'المتابعة #% عادت إلى %', r.followup_id, v_fu_status;
  END IF;

  -- ⑧ المعاينة تستعيد سلطتها — **إن كان هذا التصحيحُ هو مَن سحبها**
  --
  --  الإلغاءُ الإداريّ **يتخطّى** كتابةَ الشهادة حين تكون المعاينةُ ملغاةً
  --  سلفاً (`!op.examCancelled` في `server/admin_reversal/store.ts`). فحذفٌ
  --  بمطابقة نصّ السبب كان يمحو شهادةً **سابقةً** لهذا التصحيح فيُعيد
  --  سلطةَ معاينةٍ كانت مسحوبةً قبل الضغطة الخاطئة أصلاً.
  --
  --  والعلامةُ الدقيقة موجودةٌ في التدقيق: `new_values.examCancelled` =
  --  رقمُ المعاينة حين أنشأ هذا التصحيحُ الشهادة، و`null` حين تخطّاها.
  --  و`exam_id` فريدٌ في الجدول، فالمطابقةُ به وحدها تكفي بعد العلامة.
  IF r.medical_exam_id IS NOT NULL THEN
    IF v_new IS NULL OR NOT (v_new ? 'examCancelled') THEN
      RAISE EXCEPTION 'سطرُ التدقيق لا يقول أأنشأ هذا التصحيحُ شهادةَ إلغاءِ معاينةٍ أم لا — راجِعها يدوياً قبل التراجع';
    END IF;
    IF COALESCE(v_new ->> 'examCancelled','') = r.medical_exam_id::text THEN
      DELETE FROM medical_exam_cancellations WHERE exam_id = r.medical_exam_id;
      GET DIAGNOSTICS n = ROW_COUNT;
      RAISE NOTICE 'أُعيدت سلطةُ المعاينة #% (شهادات محذوفة: %)', r.medical_exam_id, n;
    ELSE
      RAISE NOTICE 'المعاينةُ #% كانت ملغاةً قبل هذا التصحيح — شهادتُها تبقى كما هي',
        r.medical_exam_id;
    END IF;
  END IF;

  -- ⑨ صفُّ التصحيح نفسُه — به وحده يُقرأ الملفُّ «ملغىً إدارياً»
  DELETE FROM administrative_operation_reversals WHERE id = v_reversal_id;

  -- ⑩ التدقيق يبقى ويُضاف إليه — لا يُمحى منه شيء
  INSERT INTO audit_log
    (entity_type, entity_id, action, user_id, user_name, branch_id,
     old_values, new_values, notes)
  VALUES ('administrative_operation_reversal', v_reversal_id, 'delete',
          v_operator_id, v_operator_name, r.branch_id,
          v_old::text,
          jsonb_build_object(
            'undone', true,
            'undoneBy', v_operator_name,
            'originalReversalBy', r.created_by_name,
            'restoredOrderStatus', v_ord_status,
            'restoredEpisodeStatus', v_epi_status,
            'restoredFollowupStatus', v_fu_status,
            'restoredCost', v_cost,
            'deletedRefundPaymentId', v_pay_id,
            'deletedRefundAmount', v_pay_amount)::text,
          'تراجُع يدويّ عن إلغاء إداري وقع بالخطأ — أُعيد الملفُّ إلى حالته السابقة'
          || ' (تصحيح #' || v_reversal_id || ')');

  RAISE NOTICE '✔ تمّ التراجع عن التصحيح #% للمريض #%', v_reversal_id, r.patient_id;
END $$;
