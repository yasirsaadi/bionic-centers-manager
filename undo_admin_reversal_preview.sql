-- ═══════════════════════════════════════════════════════════════════════
--  معاينةٌ فقط — لا تكتب حرفاً واحداً في القاعدة.
--  الغرض: قراءةُ كلّ ما فعله «إلغاء العملية بالكامل» الخاطئ، قبل التراجع.
--  الاستعمال: الصقه كما هو في محرّر SQL في Neon ونفّذه، ثم أرسل الناتج.
--  وإن كان المريضُ غيرَ WB-01982 فبدّل الرمزَ في السطر التالي وحده.
-- ═══════════════════════════════════════════════════════════════════════
WITH pat AS (
  SELECT id, patient_code, name, branch_id, total_cost
    FROM patients
   WHERE patient_code = 'WB-01982'
),
rev AS (
  SELECT r.* FROM administrative_operation_reversals r JOIN pat ON pat.id = r.patient_id
)
SELECT * FROM (
  SELECT 1 AS ord, 'المريض' AS القسم,
         'رقم=' || p.id || ' · رمز=' || p.patient_code || ' · اسم=' || p.name
         || ' · فرع=' || COALESCE(p.branch_id::text,'—')
         || ' · الكلفة الآن=' || COALESCE(p.total_cost,0) AS التفاصيل
    FROM pat p

  UNION ALL
  SELECT 2, 'مجموع المدفوع الآن',
         COALESCE(SUM(pm.amount),0)::text || ' د.ع (عدد الصفوف ' || COUNT(*) || ')'
    FROM payments pm JOIN pat ON pat.id = pm.patient_id

  UNION ALL
  SELECT 3, 'التصحيح الإداري #' || r.id,
         'الوضع=' || r.mode || ' · بتاريخ=' || r.created_at
         || ' · بواسطة=' || COALESCE(r.created_by_name,'—')
         || ' · أمر=' || COALESCE(r.work_order_id::text,'—')
         || ' · حلقة=' || COALESCE(r.device_episode_id::text,'—')
         || ' · متابعة=' || COALESCE(r.followup_id::text,'—')
         || ' · معاينة=' || COALESCE(r.medical_exam_id::text,'—')
         || ' · فرق الكلفة=' || COALESCE(r.financial_delta::text,'—')
         || ' · المتبقي عند المركز=' || COALESCE(r.preserved_paid_amount::text,'—')
         || ' · السبب=' || COALESCE(r.reason_note,'—')
    FROM rev r

  UNION ALL
  SELECT 4, 'الحالات السابقة (من سطر التدقيق) لـ#' || r.id,
         COALESCE(al.old_values,'لا سطرَ تدقيق')
    FROM rev r
    LEFT JOIN LATERAL (
      SELECT a.old_values FROM audit_log a
       WHERE a.entity_type = 'administrative_operation_reversal' AND a.entity_id = r.id
       ORDER BY a.id DESC LIMIT 1
    ) al ON TRUE

  UNION ALL
  SELECT 5, 'دفعة الاسترجاع',
         'رقم=' || pm.id || ' · مبلغ=' || pm.amount || ' · تاريخ=' || pm.date
         || ' · وسم=' || COALESCE(pm.payment_treatment_type,'—')
         || ' · ملاحظة=' || COALESCE(pm.notes,'—')
    FROM payments pm JOIN rev r ON r.patient_id = pm.patient_id
   WHERE pm.notes LIKE 'استرجاع كامل المبلغ عند إلغاء العملية إدارياً #' || r.id || ' %'

  UNION ALL
  SELECT 6, 'قيد اليومية للاسترجاع',
         'قيد=' || je.id || ' · رقم=' || je.entry_number || ' · مبلغ=' || je.total_amount
         || ' · حالة=' || je.status || ' · سطور=' || (SELECT COUNT(*) FROM journal_lines jl WHERE jl.entry_id = je.id)
    FROM journal_entries je
   WHERE je.source_type = 'payment'
     AND je.source_id IN (
       SELECT pm.id FROM payments pm JOIN rev r ON r.patient_id = pm.patient_id
        WHERE pm.notes LIKE 'استرجاع كامل المبلغ عند إلغاء العملية إدارياً #' || r.id || ' %')

  UNION ALL
  SELECT 7, 'قيد الكلفة المعاكس',
         'رقم=' || ce.id || ' · مبلغ=' || ce.amount || ' · مصدر=' || ce.source
         || ' · ملاحظة=' || COALESCE(ce.notes,'—')
    FROM cost_entries ce JOIN rev r ON r.patient_id = ce.patient_id
   WHERE ce.source = 'administrative_reversal'
     AND ce.notes LIKE '%#' || r.id

  UNION ALL
  SELECT 8, 'أمر التصنيع',
         'رقم=' || wo.id || ' · حالة=' || wo.status || ' · مرحلة=' || COALESCE(wo.current_stage,'—')
         || ' · غرض=' || COALESCE(wo.purpose,'—') || ' · فرع=' || COALESCE(wo.branch_id::text,'—')
         || ' · وسم الإبطال=' || COALESCE(wo.admin_void_reversal_id::text,'—')
         || ' · سبب التوقف=' || COALESCE(wo.hold_reason_code,'—')
    FROM prosthetic_work_orders wo JOIN rev r ON r.work_order_id = wo.id

  UNION ALL
  SELECT 9, 'حلقة الجهاز',
         'رقم=' || ep.id || ' · حالة=' || ep.status || ' · تسلسل=' || ep.sequence_number
         || ' · المطلوب=' || ep.requested_item || ' · كلفة=' || ep.agreed_cost
         || ' · وسم الإبطال=' || COALESCE(ep.admin_void_reversal_id::text,'—')
         || ' · ألغيت في=' || COALESCE(ep.cancelled_at::text,'—')
    FROM patient_device_episodes ep JOIN rev r ON r.device_episode_id = ep.id

  UNION ALL
  SELECT 10, 'المتابعة',
         'رقم=' || f.id || ' · حالة=' || f.status
         || ' · أُغلقت في=' || COALESCE(f.closed_at::text,'—')
         || ' · سبب الإغلاق=' || COALESCE(f.closed_reason,'—')
         || ' · أمر التحويل=' || COALESCE(f.converted_work_order_id::text,'—')
    FROM post_exam_followups f JOIN rev r ON r.followup_id = f.id

  UNION ALL
  SELECT 11, 'إلغاء المعاينة',
         'معاينة=' || mc.exam_id || ' · في=' || mc.cancelled_at
         || ' · بواسطة=' || COALESCE(mc.cancelled_by_name,'—')
         || ' · سبب=' || COALESCE(mc.reason,'—')
    FROM medical_exam_cancellations mc JOIN rev r ON r.medical_exam_id = mc.exam_id

  UNION ALL
  SELECT 12, 'كل أوامر تصنيع هذا المريض',
         'رقم=' || wo.id || ' · حالة=' || wo.status || ' · غرض=' || COALESCE(wo.purpose,'—')
         || ' · مرحلة=' || COALESCE(wo.current_stage,'—')
         || ' · حلقة=' || COALESCE(wo.device_episode_id::text,'—')
         || ' · مُبطَل=' || COALESCE(wo.admin_void_reversal_id::text,'—')
    FROM prosthetic_work_orders wo JOIN pat ON pat.id = wo.patient_id
) x
ORDER BY ord, التفاصيل;
