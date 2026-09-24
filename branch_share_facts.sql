-- ════════════════════════════════════════════════════════════════════════
-- **قراءةٌ فقط — لا يكتب شيئاً.** يُلصق كما هو في Neon SQL Editor.
--
-- الغرض (٢٠٢٦-٠٩-٢٤): الحقائقُ قبل أيّ قرار — بلا تخمين:
--   ١–١٠  ملفُّ «زهراء واثق» كلُّه بفروعه: التسجيلُ والإتاحةُ والحالاتُ وطلباتُ
--         المراجعة والمعايناتُ وقرارُ ما بعد المعاينة والأجهزةُ والأوامرُ والمال.
--   ١١    حسابا أيوب وعناد: الدور · أخبيرٌ هو · فعّال · الفرعُ الأساسيّ · وفروعُه.
--         (قائمةُ «اشترى» = خبراءُ فرع القرار: فعّالٌ، خبيرٌ دوراً أو صلاحيةً،
--          وفرعُ القرار في فروع حسابه.)
--   ١٢    حساباتُ الأطباء: «عرض المرضى» وفروعُهم — شرطا النافذة التي كانت تفتح فارغة.
--   ١٣–١٥ ما قد يكون بقي من ساعات عمل ٤٠٩/٤١٠ على الإنتاج: عملياتٌ نُقلت لفرع
--         الخبير · طلباتُ خصمٍ معلّقة تحمل فرعَ بيع · معايناتٌ بلا جهاز نُسبت اليوم
--         لغير فرع حالتها. **وصفرُ صفوفٍ في هذه الثلاثة = لا شيءَ يُصلَح.**
--
-- لغير زهراء: غيّر الاسمَ في السطر المعلَّم بـ «← الاسم» وحده.
-- ════════════════════════════════════════════════════════════════════════
WITH z AS (
  SELECT p.id, p.patient_code, p.name, p.branch_id
    FROM patients p
   WHERE p.deleted_at IS NULL
     AND patient_search_norm(p.name) LIKE patient_search_norm('زهراء واثق') || '%'   -- ← الاسم
),
bn AS (SELECT id, name FROM branches),
rows AS (
  SELECT 1 AS s, 'المريضة' AS q,
         z.patient_code || ' — ' || z.name AS item,
         'فرع التسجيل: ' || COALESCE((SELECT name FROM bn WHERE bn.id = z.branch_id), '—') AS val,
         0::bigint AS k
    FROM z
  UNION ALL
  SELECT 2, 'متاحة لـ', (SELECT name FROM bn WHERE bn.id = a.branch_id), to_char(a.granted_at + interval '3 hour', 'YYYY-MM-DD HH24:MI'), a.id
    FROM patient_branch_access a JOIN z ON z.id = a.patient_id
  UNION ALL
  SELECT 3, 'الحالات', c.case_type || ' #' || c.id,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = c.branch_id), '—') || ' · ' || c.status, c.id
    FROM patient_cases c JOIN z ON z.id = c.patient_id
  UNION ALL
  SELECT 4, 'طلبات المراجعة', r.service_type || ' #' || r.id || ' · ' || r.requested_path || ' · ' || r.status,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = r.branch_id), '—')
         || ' · جهاز: ' || COALESCE(r.device_episode_id::text, 'بلا')
         || ' · ' || to_char(r.created_at + interval '3 hour', 'MM-DD HH24:MI'), r.id
    FROM medical_review_requests r JOIN z ON z.id = r.patient_id
  UNION ALL
  SELECT 5, 'المعاينات', e.case_type || ' #' || e.id || ' · ' || e.doctor_name,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = e.branch_id), '—')
         || ' · جهاز: ' || COALESCE(e.device_episode_id::text, 'بلا')
         || ' · ' || to_char(e.signed_at + interval '3 hour', 'MM-DD HH24:MI'), e.id
    FROM medical_exams e JOIN z ON z.id = e.patient_id
  UNION ALL
  SELECT 6, 'قرار ما بعد المعاينة', f.service_type || ' #' || f.id || ' · ' || f.status,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = f.branch_id), '—')
         || ' · جهاز: ' || COALESCE(f.device_episode_id::text, 'بلا')
         || ' · خبير: ' || COALESCE((SELECT display_name FROM system_users u WHERE u.id = f.selected_expert_user_id), '—')
         || ' · أمر: ' || COALESCE(f.converted_work_order_id::text, '—'), f.id
    FROM post_exam_followups f JOIN z ON z.id = f.patient_id
  UNION ALL
  SELECT 7, 'أجهزة', 'جهاز #' || d.id || ' · ' || d.requested_item || ' · ' || d.status,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = d.branch_id), '—')
         || ' · مسار: ' || COALESCE(d.service_path, 'قديم'), d.id
    FROM patient_device_episodes d JOIN z ON z.id = d.patient_id
  UNION ALL
  SELECT 8, 'أوامر التصنيع', 'أمر #' || w.id || ' · ' || COALESCE(w.purpose, 'initial_build') || ' · ' || w.status,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = w.branch_id), '—')
         || ' · خبير: ' || COALESCE((SELECT display_name FROM system_users u WHERE u.id = w.expert_user_id), '—'), w.id
    FROM prosthetic_work_orders w JOIN z ON z.id = w.patient_id
  UNION ALL
  SELECT 9, 'الدفعات', 'دفعة #' || pm.id || ' · ' || pm.amount,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = pm.branch_id), '—') || ' · ' || COALESCE(pm.date::text, ''), pm.id
    FROM payments pm JOIN z ON z.id = pm.patient_id
  UNION ALL
  SELECT 10, 'قيود الكلفة', ce.source || ' · ' || ce.amount,
         'فرع: ' || COALESCE((SELECT name FROM bn WHERE bn.id = ce.branch_id), '—'), ce.id
    FROM cost_entries ce JOIN z ON z.id = ce.patient_id
  UNION ALL
  SELECT 11, 'خبراء أيوب وعناد', u.display_name || ' #' || u.id,
         'دور: ' || u.role || ' · خبير؟ ' || CASE WHEN u.role = 'prosthetics_expert' OR u.can_work_as_expert THEN 'نعم' ELSE 'لا' END
         || ' · فعّال؟ ' || CASE WHEN u.is_active THEN 'نعم' ELSE 'لا' END
         || ' · الفرع الأساسي: ' || COALESCE((SELECT name FROM bn WHERE bn.id = u.branch_id), '—')
         || ' · فروعه: ' || COALESCE((SELECT string_agg(bn.name, '، ') FROM bn
              WHERE u.branch_ids @> to_jsonb(bn.id)), '—'), u.id
    FROM system_users u
   WHERE u.display_name ~ '(أيوب|ايوب|عناد)'
  UNION ALL
  SELECT 12, 'حسابات الأطباء', u.display_name || ' #' || u.id,
         'عرض المرضى؟ ' || CASE WHEN u.can_view_patients THEN 'نعم' ELSE 'لا' END
         || ' · الفرع الأساسي: ' || COALESCE((SELECT name FROM bn WHERE bn.id = u.branch_id), '—')
         || ' · فروعه: ' || COALESCE((SELECT string_agg(bn.name, '، ') FROM bn
              WHERE u.branch_ids @> to_jsonb(bn.id)), '—'), u.id
    FROM system_users u
   WHERE u.is_active AND (u.role IN ('doctor', 'admin') OR u.can_write_medical_exam)
  UNION ALL
  SELECT 13, 'عمليات نُقلت لفرع الخبير (منذ ٤٠٩)', 'قرار #' || ev.followup_id || ' · مريض #' || ev.patient_id,
         COALESCE(ev.payload->>'fromBranchName', ev.payload->>'fromBranchId') || ' ⟵ '
         || COALESCE(ev.payload->>'toBranchName', ev.payload->>'toBranchId')
         || ' · ' || to_char(ev.created_at + interval '3 hour', 'MM-DD HH24:MI'), ev.id
    FROM post_exam_followup_events ev
   WHERE ev.event_type = 'sale_branch_moved'
  UNION ALL
  SELECT 14, 'طلبات خصم معلّقة تحمل فرع بيع (منذ ٤١٠)', 'طلب #' || sd.id || ' · مريض #' || sd.patient_id,
         'فرع البيع المسجَّل: ' || COALESCE((SELECT name FROM bn WHERE bn.id::text = sd.payload->>'saleBranchId'),
                                            sd.payload->>'saleBranchId')
         || ' · فرع الطلب: ' || COALESCE((SELECT name FROM bn WHERE bn.id = sd.branch_id), '—')
         || ' · ' || to_char(sd.requested_at + interval '3 hour', 'MM-DD HH24:MI'), sd.id
    FROM service_discount_requests sd
   WHERE sd.status = 'pending' AND sd.payload ? 'saleBranchId'
         AND sd.payload->>'saleBranchId' IS NOT NULL
  UNION ALL
  SELECT 15, 'معاينات بلا جهاز نُسبت لغير فرع حالتها (اليوم)', 'معاينة #' || e.id || ' · مريض #' || e.patient_id,
         'فرع المعاينة: ' || COALESCE((SELECT name FROM bn WHERE bn.id = e.branch_id), '—')
         || ' · فرع الحالة: ' || COALESCE((SELECT name FROM bn WHERE bn.id = c.branch_id), '—')
         || ' · ' || to_char(e.signed_at + interval '3 hour', 'MM-DD HH24:MI'), e.id
    FROM medical_exams e JOIN patient_cases c ON c.id = e.case_id
   WHERE e.device_episode_id IS NULL
     AND e.branch_id IS DISTINCT FROM c.branch_id
     AND e.signed_at >= TIMESTAMPTZ '2026-09-24 00:00:00+03'
)
SELECT q AS "القسم", item AS "البند", val AS "القيمة" FROM rows ORDER BY s, k;
