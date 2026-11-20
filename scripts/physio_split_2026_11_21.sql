-- ════════════════════════════════════════════════════════════════════════════════════════════
-- فصلُ العلاج الطبيعي في بغداد إلى «مركز بغداد للعلاج الطبيعي» — سكربتُ يوم الفصل (قدّمه المالكُ إلى ٢٠٢٦-١١-٢٠، §4.gq)
-- يُلصَق في Neon › SQL Editor مرّةً واحدة. معاملةٌ واحدة: إمّا كلُّه أو لا شيء، وحارسٌ يمنع تشغيلَه مرّتين.
--
-- ما يفعله:
--   ١. ينشئ الفرعَ بعنوانه، وصندوقَه في دليل الحسابات، ودفترَ «علاج طبيعي» برصيدٍ افتتاحيّ صفر من يوم التشغيل (قاصةُ بغداد صُفّرت).
--   ٢. يتيح أجهزةَ العلاج الطبيعي في المركز ويطفئها في بغداد.
--   ٣. الحسابات: رقيّة مديرةُ المركز وحده (بصلاحيات عمر وتنبيهاته)، سارة للمركز وحده، سليم لذي قار والمركز،
--      آية وياسر استقبال للفرعين — وسطرُ تدقيقٍ لكلّ تعديل.
--   ٤. مرضى العلاج الطبيعي وحده (فرعُ تسجيلهم بغداد): فرعُ تسجيلهم المركز.
--      ومرضى القسمين، ومَن قسمُه الطبيعيّ في بغداد وتسجيلُه في غيرها: الملفُّ يُتاح للمركز والأطرافُ تبقى.
--      وللجميع: حالةُ العلاج الطبيعي، وخططُه غيرُ المنتهية، وطلباتُ معاينته المفتوحة، واقتراحاتُ المساعد غيرُ المقبولة،
--      وخططُ الأقساط النشطة، وطلباتُ الاسترجاع والخصم المعلَّقة — إلى المركز.
--   ٥. الدَّين: قيدان متعاكسان على حالة العلاج الطبيعي (‎−‎ في بغداد و‎+‎ في المركز) بمصدر `branch_split`،
--      بلحظة التشغيل (رصيدٌ لا بيع — `BALANCE_ONLY_COST_SOURCE`). لا دفعةَ تُمسّ ولا قيدَ قديم.
-- ما لا يمسّه: الزياراتُ والدفعاتُ وأوراقُ الدفتر والمعاينات وكلُّ ما قبل لحظة التشغيل — يبقى في بغداد.
-- ════════════════════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_name   CONSTANT text := 'مركز بغداد للعلاج الطبيعي';
  v_addr   CONSTANT text := 'السيدية قرب المستشفى الملكي مقابل مجمع مارينا السكني مجاور المجسر';
  v_bg     CONSTANT int  := 1;
  v_t      CONSTANT timestamp := (now() AT TIME ZONE 'UTC');               -- لحظةُ الفصل (UTC كسائر القيود)
  v_day    CONSTANT date := (now() AT TIME ZONE 'Asia/Baghdad')::date;      -- يومُ الفصل بتوقيت بغداد
  v_note   CONSTANT text := 'فصل العلاج الطبيعي — نقلٌ إلى مركز بغداد للعلاج الطبيعي (٢٠٢٦-١١-٢٠)';
  v_new    int;
  v_code   text;
  v_parent int;
  n_only int; n_mixed int; n_other int; n_debt int; n_plans int; n_req int; n_sug int; n_inst int; n_ref int; n_disc int;
  rec record;
BEGIN
  -- ══ الحرّاس ══
  IF EXISTS (SELECT 1 FROM branches WHERE name = v_name) THEN
    RAISE EXCEPTION 'الفرع «%» موجودٌ قبلُ — السكربت شُغّل مرّةً. لم يتغيّر شيء.', v_name;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM branches WHERE id = v_bg AND name LIKE '%بغداد%') THEN
    RAISE EXCEPTION 'الفرع 1 ليس بغداد — لم يتغيّر شيء.';
  END IF;
  FOR rec IN SELECT * FROM (VALUES (11,'saleem'),(28,'drsara'),(16,'رقية'),(22,'عمر'),(27,'aya'),(25,'ياسر استقبال')) AS t(id, un) LOOP
    IF NOT EXISTS (SELECT 1 FROM system_users WHERE id = rec.id AND username = rec.un) THEN
      RAISE EXCEPTION 'الحساب % ليس «%» — لم يتغيّر شيء.', rec.id, rec.un;
    END IF;
  END LOOP;

  -- ══ ١. الفرع وصندوقه ودفتره ══
  PERFORM setval('branches_id_seq', GREATEST((SELECT MAX(id) FROM branches), 1));
  INSERT INTO branches (name, location) VALUES (v_name, v_addr) RETURNING id INTO v_new;
  UPDATE branches SET physio_counts_from = (SELECT physio_counts_from FROM branches WHERE id = v_bg) WHERE id = v_new;

  SELECT id INTO v_parent FROM chart_of_accounts WHERE account_code = '1110';
  SELECT '1111' || lpad(n::text, 2, '0') INTO v_code
    FROM generate_series(1, 99) n
   WHERE NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE account_code = '1111' || lpad(n::text, 2, '0'))
   ORDER BY n LIMIT 1;
  INSERT INTO chart_of_accounts (account_code, account_name_ar, account_name_en, account_type, account_subtype,
                                 parent_id, branch_id, normal_balance, is_system, description)
  VALUES (v_code, 'الصندوق النقدي - ' || v_name, 'Cash - ' || v_name, 'asset', 'current_asset',
          v_parent, v_new, 'debit', true, 'صندوق فرع ' || v_name);

  INSERT INTO cash_book_openings (branch_id, book, opening_date, cash_balance, ratio_balance)
  VALUES (v_new, 'physio', v_day, 0, 0);

  -- ══ ٢. الأجهزة ══
  INSERT INTO physio_device_branches (device_id, branch_id, available)
  SELECT device_id, v_new, available FROM physio_device_branches WHERE branch_id = v_bg
  ON CONFLICT DO NOTHING;
  UPDATE physio_device_branches SET available = false, updated_at = now() WHERE branch_id = v_bg;

  -- ══ ٣. الحسابات (سطرُ تدقيقٍ لكلّ تعديل) ══
  INSERT INTO audit_log (entity_type, entity_id, action, branch_id, old_values, new_values, notes)
  SELECT 'system_user', u.id, 'update', v_new,
         json_build_object('role', u.role, 'branch_id', u.branch_id, 'branch_ids', u.branch_ids)::text,
         json_build_object('role', CASE WHEN u.id = 16 THEN 'branch_manager' ELSE u.role END,
                           'branch_id', CASE u.id WHEN 11 THEN 3 WHEN 28 THEN v_new WHEN 16 THEN v_new ELSE u.branch_id END,
                           'branch_ids', CASE u.id WHEN 11 THEN jsonb_build_array(3, v_new) WHEN 28 THEN jsonb_build_array(v_new)
                                                   WHEN 16 THEN jsonb_build_array(v_new) ELSE jsonb_build_array(v_bg, v_new) END)::text,
         'تعديلُ حساب الموظّف «' || u.display_name || '» — ' || v_note
    FROM system_users u WHERE u.id IN (11, 28, 16, 27, 25);

  UPDATE system_users SET branch_id = 3,     branch_ids = jsonb_build_array(3, v_new),   updated_at = now() WHERE id = 11;
  UPDATE system_users SET branch_id = v_new, branch_ids = jsonb_build_array(v_new),      updated_at = now() WHERE id = 28;
  UPDATE system_users SET branch_id = v_bg,  branch_ids = jsonb_build_array(v_bg, v_new), updated_at = now() WHERE id IN (27, 25);
  UPDATE system_users ru SET
    role = 'branch_manager', extra_roles = '[]'::jsonb, branch_id = v_new, branch_ids = jsonb_build_array(v_new),
    can_view_patients = ru.can_view_patients OR o.can_view_patients,
    can_add_patients = ru.can_add_patients OR o.can_add_patients,
    can_edit_patients = ru.can_edit_patients OR o.can_edit_patients,
    can_delete_patients = ru.can_delete_patients OR o.can_delete_patients,
    can_view_payments = ru.can_view_payments OR o.can_view_payments,
    can_add_payments = ru.can_add_payments OR o.can_add_payments,
    can_edit_payments = ru.can_edit_payments OR o.can_edit_payments,
    can_delete_payments = ru.can_delete_payments OR o.can_delete_payments,
    can_view_reports = ru.can_view_reports OR o.can_view_reports,
    can_manage_accounting = ru.can_manage_accounting OR o.can_manage_accounting,
    can_add_expenses = ru.can_add_expenses OR o.can_add_expenses,
    can_manage_treatment_plans = ru.can_manage_treatment_plans OR o.can_manage_treatment_plans,
    can_manage_surveys = ru.can_manage_surveys OR o.can_manage_surveys,
    can_edit_visits = ru.can_edit_visits OR o.can_edit_visits,
    can_delete_visits = ru.can_delete_visits OR o.can_delete_visits,
    can_enter_sessions = ru.can_enter_sessions OR o.can_enter_sessions,
    can_manage_session_targets = ru.can_manage_session_targets OR o.can_manage_session_targets,
    can_view_sessions_report = ru.can_view_sessions_report OR o.can_view_sessions_report,
    can_approve_discount = ru.can_approve_discount OR o.can_approve_discount,
    can_backdate_visits = ru.can_backdate_visits OR o.can_backdate_visits,
    can_request_reserve_withdrawal = ru.can_request_reserve_withdrawal OR o.can_request_reserve_withdrawal,
    can_request_refund = ru.can_request_refund OR o.can_request_refund,
    updated_at = now()
    FROM system_users o WHERE ru.id = 16 AND o.id = 22;
  INSERT INTO staff_notification_prefs (user_id, event_type)
  SELECT 16, event_type FROM staff_notification_prefs WHERE user_id = 22
  ON CONFLICT DO NOTHING;

  -- ══ ٤. المرضى ══
  --  حالةُ العلاج الطبيعي في بغداد (أو بلا فرع) لكلّ مريض — والمجموعات الثلاث.
  CREATE TEMP TABLE split_p ON COMMIT DROP AS
  SELECT p.id AS patient_id, p.branch_id AS home, pc.id AS case_id,
         CASE WHEN p.branch_id = v_bg AND NOT EXISTS (
                SELECT 1 FROM patient_cases d WHERE d.patient_id = p.id AND d.case_type IN ('prosthetic','medical_support'))
              THEN 'only'
              WHEN p.branch_id = v_bg THEN 'mixed'
              ELSE 'other' END AS grp
    FROM patients p
    JOIN patient_cases pc ON pc.patient_id = p.id AND pc.case_type = 'physiotherapy'
   WHERE COALESCE(pc.branch_id, p.branch_id) = v_bg;

  SELECT count(*) FILTER (WHERE grp='only'), count(*) FILTER (WHERE grp='mixed'), count(*) FILTER (WHERE grp='other')
    INTO n_only, n_mixed, n_other FROM split_p;

  --  الدَّينُ الباقي في بغداد للعلاج الطبيعي — يُحسب قبل أيّ نقل.
  CREATE TEMP TABLE split_debt ON COMMIT DROP AS
  SELECT s.patient_id, s.case_id,
         COALESCE((SELECT SUM(ce.amount) FROM cost_entries ce
                    WHERE ce.patient_id = s.patient_id AND ce.branch_id = v_bg
                      AND (s.grp = 'only' OR ce.case_id = s.case_id
                           OR (ce.case_id IS NULL AND ce.device_episode_id IS NULL
                               AND ce.source IN ('physio_pricing','session_backfill','new_service')))), 0)
       - COALESCE((SELECT SUM(py.amount) FROM payments py
                    WHERE py.patient_id = s.patient_id AND py.branch_id = v_bg
                      AND (s.grp = 'only' OR py.case_id = s.case_id)), 0) AS d
    FROM split_p s;

  INSERT INTO audit_log (entity_type, entity_id, action, branch_id, old_values, new_values, notes)
  SELECT 'patient', s.patient_id, 'update', v_new,
         json_build_object('branch_id', s.home, 'physio_case_branch_id', v_bg)::text,
         json_build_object('branch_id', CASE WHEN s.grp = 'only' THEN v_new ELSE s.home END,
                           'physio_case_branch_id', v_new,
                           'physio_debt_moved', COALESCE(dd.d, 0))::text,
         v_note
    FROM split_p s LEFT JOIN split_debt dd ON dd.patient_id = s.patient_id;

  UPDATE patients p SET branch_id = v_new FROM split_p s WHERE s.patient_id = p.id AND s.grp = 'only';
  UPDATE patient_cases pc SET branch_id = v_new, updated_at = now() FROM split_p s WHERE pc.id = s.case_id;

  INSERT INTO patient_branch_access (patient_id, branch_id, granted_by_name, note)
  SELECT s.patient_id, v_new, 'فصل العلاج الطبيعي', v_note FROM split_p s WHERE s.grp IN ('mixed','other')
  ON CONFLICT (patient_id, branch_id) DO NOTHING;

  UPDATE physio_plans pl SET branch_id = v_new, updated_at = now() FROM split_p s
   WHERE pl.patient_id = s.patient_id AND pl.branch_id = v_bg AND pl.status NOT IN ('stopped','graduated');
  GET DIAGNOSTICS n_plans = ROW_COUNT;

  UPDATE medical_review_requests m SET branch_id = v_new, updated_at = now() FROM split_p s
   WHERE m.patient_id = s.patient_id AND m.service_type = 'physiotherapy'
     AND (m.status = 'escalated' OR (m.status = 'pending' AND m.requested_path = 'full'))
     AND COALESCE(m.branch_id, v_bg) = v_bg;
  GET DIAGNOSTICS n_req = ROW_COUNT;

  UPDATE physio_plan_suggestions g SET branch_id = v_new FROM split_p s
   WHERE g.patient_id = s.patient_id AND g.branch_id = v_bg AND g.accepted_at IS NULL AND g.plan_id IS NULL;
  GET DIAGNOSTICS n_sug = ROW_COUNT;

  UPDATE installment_plans ip SET branch_id = v_new FROM split_p s
   WHERE ip.patient_id = s.patient_id AND ip.branch_id = v_bg AND ip.status = 'active'
     AND (ip.case_id = s.case_id OR (ip.case_id IS NULL AND s.grp = 'only'));
  GET DIAGNOSTICS n_inst = ROW_COUNT;

  UPDATE patient_refund_requests rr SET branch_id = v_new FROM split_p s
   WHERE rr.case_id = s.case_id AND rr.status = 'pending' AND rr.branch_id = v_bg;
  GET DIAGNOSTICS n_ref = ROW_COUNT;

  UPDATE service_discount_requests sd SET branch_id = v_new FROM split_p s
   WHERE sd.patient_id = s.patient_id AND sd.status = 'pending' AND sd.department = 'physiotherapy'
     AND COALESCE(sd.branch_id, v_bg) = v_bg;
  GET DIAGNOSTICS n_disc = ROW_COUNT;

  -- ══ ٥. الدَّين: قيدان متعاكسان لكلّ مريضٍ له رصيد ══
  INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, notes, created_at)
  SELECT dd.patient_id, b.branch_id, CASE WHEN b.branch_id = v_bg THEN -dd.d ELSE dd.d END,
         'branch_split', dd.case_id, 'نقل رصيد العلاج الطبيعي — ' || v_note, v_t
    FROM split_debt dd CROSS JOIN (VALUES (v_bg), (v_new)) AS b(branch_id)
   WHERE dd.d <> 0;
  SELECT count(*) INTO n_debt FROM split_debt WHERE d <> 0;

  RAISE NOTICE 'الفرع الجديد: % (رقم %، الصندوق %)', v_name, v_new, v_code;
  RAISE NOTICE 'مرضى العلاج الطبيعي وحده: % · بالقسمين: % · تسجيلُهم في فرعٍ آخر: %', n_only, n_mixed, n_other;
  RAISE NOTICE 'دَينٌ نُقل لـ% مريضاً · خطط: % · طلبات معاينة: % · اقتراحات: % · أقساط: % · استرجاع: % · خصم: %',
    n_debt, n_plans, n_req, n_sug, n_inst, n_ref, n_disc;
END $$;

-- ══ التحقّق بعد التنفيذ ══
SELECT b.id AS رقم_الفرع, b.name AS الفرع,
       (SELECT count(*) FROM patients WHERE branch_id = b.id) AS مرضى_مسجّلون,
       (SELECT count(*) FROM patient_cases WHERE branch_id = b.id AND case_type = 'physiotherapy') AS حالات_علاج_طبيعي,
       (SELECT count(*) FROM physio_plans WHERE branch_id = b.id AND status NOT IN ('stopped','graduated')) AS خطط_قائمة,
       (SELECT COALESCE(SUM(amount),0) FROM cost_entries WHERE source = 'branch_split' AND branch_id = b.id) AS دين_منقول,
       (SELECT count(*) FROM physio_device_branches WHERE branch_id = b.id AND available) AS أجهزة_متاحة
  FROM branches b
 WHERE b.id = 1 OR b.name = 'مركز بغداد للعلاج الطبيعي'
 ORDER BY b.id;
