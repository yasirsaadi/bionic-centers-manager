-- فحصُ ما قبل فصل العلاج الطبيعي (§4.gq) — قراءةٌ فقط، لا يغيّر شيئاً. يُشغَّل قبل سكربت الفصل وتُرسَل نتيجتُه للمساعد.
WITH s AS (
  SELECT p.id AS patient_id, p.branch_id AS home, pc.id AS case_id,
         CASE WHEN p.branch_id = 1 AND NOT EXISTS (
                SELECT 1 FROM patient_cases d WHERE d.patient_id = p.id AND d.case_type IN ('prosthetic','medical_support'))
              THEN 'only' WHEN p.branch_id = 1 THEN 'mixed' ELSE 'other' END AS grp
    FROM patients p
    JOIN patient_cases pc ON pc.patient_id = p.id AND pc.case_type = 'physiotherapy'
   WHERE COALESCE(pc.branch_id, p.branch_id) = 1
), d AS (
  SELECT s.*,
         COALESCE((SELECT SUM(ce.amount) FROM cost_entries ce
                    WHERE ce.patient_id = s.patient_id AND ce.branch_id = 1
                      AND (s.grp = 'only' OR ce.case_id = s.case_id
                           OR (ce.case_id IS NULL AND ce.device_episode_id IS NULL
                               AND ce.source IN ('physio_pricing','session_backfill','new_service')))), 0)
       - COALESCE((SELECT SUM(py.amount) FROM payments py
                    WHERE py.patient_id = s.patient_id AND py.branch_id = 1
                      AND (s.grp = 'only' OR py.case_id = s.case_id)), 0) AS debt
    FROM s
)
SELECT 'اسم فرع 1' AS البند, (SELECT name FROM branches WHERE id = 1) AS القيمة
UNION ALL SELECT 'المركز موجود قبلُ؟', (SELECT count(*)::text FROM branches WHERE name = 'مركز بغداد للعلاج الطبيعي')
UNION ALL SELECT 'مرضى علاج طبيعي وحده (ينتقل تسجيلهم)', (SELECT count(*)::text FROM d WHERE grp = 'only')
UNION ALL SELECT 'منهم في السلّة', (SELECT count(*)::text FROM d JOIN patients p ON p.id = d.patient_id WHERE grp = 'only' AND p.deleted_at IS NOT NULL)
UNION ALL SELECT 'مرضى القسمين (يُتاح الملف للمركز)', (SELECT count(*)::text FROM d WHERE grp = 'mixed')
UNION ALL SELECT 'مسجّلون في فرع آخر وعلاجهم الطبيعي في بغداد', (SELECT count(*)::text FROM d WHERE grp = 'other')
UNION ALL SELECT 'دين علاج طبيعي ينتقل (مجموع)', (SELECT COALESCE(SUM(debt),0)::text FROM d)
UNION ALL SELECT 'منه مدينون (عدد / مبلغ)', (SELECT count(*) || ' / ' || COALESCE(SUM(debt),0) FROM d WHERE debt > 0)
UNION ALL SELECT 'منه دائنون (عدد / مبلغ)', (SELECT count(*) || ' / ' || COALESCE(SUM(debt),0) FROM d WHERE debt < 0)
UNION ALL SELECT 'خطط علاج طبيعي قائمة تنتقل', (SELECT count(*)::text FROM physio_plans pl JOIN s ON s.patient_id = pl.patient_id
                                                  WHERE pl.branch_id = 1 AND pl.status NOT IN ('stopped','graduated'))
UNION ALL SELECT '⚠ دفعات بغداد بلا قسم لمرضى القسمين (تبقى في بغداد)', (SELECT count(*) || ' / ' || COALESCE(SUM(py.amount),0) FROM payments py JOIN s ON s.patient_id = py.patient_id
                                                  WHERE s.grp = 'mixed' AND py.branch_id = 1 AND py.case_id IS NULL)
UNION ALL SELECT '⚠ مرضى بغداد بعلاج طبيعي وقسمُه في فرع آخر (لا ينتقلون)', (SELECT count(*)::text FROM patients p JOIN patient_cases pc ON pc.patient_id = p.id
                                                  AND pc.case_type = 'physiotherapy' WHERE p.branch_id = 1 AND pc.branch_id IS NOT NULL AND pc.branch_id <> 1)
UNION ALL SELECT '⚠ مرضى بغداد بعلامة علاج طبيعي بلا حالة (لا ينتقلون)', (SELECT count(*)::text FROM patients p WHERE p.branch_id = 1 AND p.is_physiotherapy
                                                  AND NOT EXISTS (SELECT 1 FROM patient_cases pc WHERE pc.patient_id = p.id AND pc.case_type = 'physiotherapy'))
UNION ALL SELECT '⚠ طلبات تصحيح دفعات معلّقة في بغداد', (SELECT count(*)::text FROM financial_correction_requests WHERE branch_id = 1 AND status = 'pending')
UNION ALL SELECT '⚠ طلبات تصحيح مال معلّقة في بغداد', (SELECT count(*)::text FROM money_correction_requests WHERE branch_id = 1 AND status = 'pending')
UNION ALL SELECT '⚠ طلبات سحب من قاصات العلاج الطبيعي معلّقة في بغداد', (SELECT count(*)::text FROM reserve_withdrawal_requests WHERE branch_id = 1 AND book = 'physio' AND status = 'pending')
UNION ALL SELECT 'سجلّات العدّادات اليومية لبغداد بتاريخ السبت', (SELECT count(*)::text FROM daily_sessions WHERE branch_id = 1 AND session_date >= '2026-11-21');
