-- ════════════════════════════════════════════════════════════════════════
--  تشخيصُ «بانتظار الحسم» — الصقه كما هو في Neon > SQL Editor.
--  **قراءةٌ محضة**: لا INSERT ولا UPDATE ولا DELETE ولا DDL. آمنٌ على الإنتاج.
--
--  الشرطُ في CTE الأولى منقولٌ **حرفياً** من الشاشة الحيّة
--  (server/followup/decision_queue_store.ts: NOT_TERMINAL +
--   EXAM_PATH_OR_ORPHAN + NO_STANDING_SALE)، فما يُرجعه هو **بالضبط**
--  مَن تراه في الصفحة الآن — بلا فلترة فرع (أنت مسؤولٌ عام فترى الكلّ).
--
--  ① الاستعلامُ الأوّل: صفٌّ لكلّ مريضٍ ظاهرٍ الآن، بحقائقه وسببِ ظهوره.
--  ② الاستعلامُ الثاني (في الأسفل): التصنيفُ النهائيّ بالأعداد.
--  الرموز: X… = ظاهرٌ بالخطأ أو يحتاج نظرة · OK… = ظاهرٌ بحقّ.
-- ════════════════════════════════════════════════════════════════════════

WITH waiting AS (
  SELECT f.id AS followup_id, f.patient_id, f.service_type, f.status,
         f.device_episode_id, f.created_at,
         de.status        AS ep_status,
         de.service_path  AS ep_path,
         de.sequence_number AS ep_seq,
         p.patient_code, p.name AS patient_name, p.branch_id
    FROM post_exam_followups f
    LEFT JOIN patient_device_episodes de ON de.id = f.device_episode_id
    JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
   WHERE f.status NOT IN ('closed_without_purchase','converted',
                          'closed_exam_cancelled','closed_admin_void',
                          'closed_request_cancelled',
                          --  الطرفيّةُ السادسة (ترحيل ٠٨١) — وبلا هذا السطر
                          --  يُرجع الملفُّ صفوفاً أُلغي حسمُها ولم تعد في الطابور.
                          'closed_decision_cancelled')
     AND (f.device_episode_id IS NULL OR de.service_path = 'exam')
     AND (
       CASE WHEN f.device_episode_id IS NULL THEN
         NOT EXISTS (SELECT 1 FROM prosthetic_work_orders wo
                      WHERE wo.patient_id = f.patient_id
                        AND wo.service_type = f.service_type
                        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
                        AND wo.admin_void_reversal_id IS NULL)
       ELSE
         de.status NOT IN ('in_manufacturing','delivered')
         AND NOT EXISTS (SELECT 1 FROM prosthetic_work_orders wo
                          WHERE wo.device_episode_id = f.device_episode_id
                            AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
                            AND wo.admin_void_reversal_id IS NULL)
       END
     )
),
facts AS (
  SELECT w.*,
    --  أوامرُ بناءٍ لهذا المريض وهذه الخدمة، بأيّ حلقة (أو بلا حلقة)
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build') AS build_orders_any,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.status NOT IN ('completed','cancelled')
        AND wo.admin_void_reversal_id IS NULL) AS build_orders_live,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.status = 'completed') AS build_orders_done,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.admin_void_reversal_id IS NOT NULL) AS build_orders_voided,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND wo.purpose = 'maintenance') AS maint_orders,
    --  **أوامرُ بناءٍ بلا هويّةِ جهاز** — الحارسُ في الشاشة يطابق بـ
    --  `wo.device_episode_id = f.device_episode_id`، فأمرٌ بـ`NULL` لا يراه
    --  أبداً. هذه هي الفئةُ التي تُنتج «بيعٌ موجود والصفُّ ما زال ظاهراً».
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.device_episode_id IS NULL
        AND wo.admin_void_reversal_id IS NULL) AS unlinked_build_orders,
    --  أوامرُ بناءٍ على حلقةٍ **أخرى** حقيقية — بيعُ جهازٍ ثانٍ، لا هذا
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.device_episode_id IS NOT NULL
        AND wo.device_episode_id IS DISTINCT FROM w.device_episode_id
        AND wo.admin_void_reversal_id IS NULL) AS other_episode_build_orders,
    --  أرقامُ الأوامر للمراجعة اليدوية
    (SELECT string_agg(wo.id::text, ',' ORDER BY wo.id) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build') AS build_order_ids,
    --  حلقاتُ هذا الخيط: كم منها بِيع فعلاً، وكم على مسار «بلا معاينة»
    (SELECT count(*) FROM patient_device_episodes e
       JOIN patient_cases pc ON pc.id = e.case_id
      WHERE e.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END
        AND e.status IN ('in_manufacturing','delivered')) AS sold_episodes,
    (SELECT count(*) FROM patient_device_episodes e
       JOIN patient_cases pc ON pc.id = e.case_id
      WHERE e.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END
        AND e.service_path = 'no_exam') AS no_exam_episodes,
    --  متابعةٌ أخرى لنفس المريض/الخدمة محسومةٌ بالشراء
    (SELECT count(*) FROM post_exam_followups f2
      WHERE f2.patient_id = w.patient_id AND f2.service_type = w.service_type
        AND f2.status = 'converted') AS converted_siblings,
    --  مالٌ قُبض موسومٌ بهذا القسم
    (SELECT COALESCE(sum(pay.amount),0) FROM payments pay
       JOIN patient_cases pc ON pc.id = pay.case_id
      WHERE pay.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END) AS paid_for_service
  FROM waiting w
)
, classified AS (
SELECT patient_code, patient_name, branch_id, service_type, status AS followup_status,
       followup_id, device_episode_id, ep_status, ep_path, ep_seq,
       build_orders_any, build_orders_live, build_orders_done, build_orders_voided,
       unlinked_build_orders, other_episode_build_orders, build_order_ids,
       maint_orders, sold_episodes, no_exam_episodes, converted_siblings,
       paid_for_service, created_at::date AS followup_opened,
       CASE
         --  ✘ المشتبه الأول: أمرُ بناءٍ **بلا هويّة جهاز** والمتابعةُ لها حلقة.
         --     حارسُ الشاشة يطابق بالحلقة، فلا يراه — والصفُّ يبقى ظاهراً
         --     ولو كان ذلك الأمرُ هو بيعَ هذا الطلب بعينه.
         WHEN device_episode_id IS NOT NULL AND unlinked_build_orders > 0
           THEN 'X1 ✘ أمرُ بناءٍ بلا هويّة جهاز — يحتاج مطابقةً يدوية: أهو بيعُ هذا الطلب؟'
         --  ✘ المشتبه الثاني: يتيمةٌ ظهرت رغم وجود أمر — الحارسُ كان يجب أن يحجبها
         WHEN device_episode_id IS NULL AND build_orders_any > 0
           THEN 'X2 ✘ يتيمةٌ + أمرُ بناء — الحارسُ لم يطابق (تحقّق من service_type/void)'
         --  ✓ بيعُ جهازٍ آخر حقيقيّ — هذا الطلبُ غيرُه، فظهورُه صحيح
         WHEN other_episode_build_orders > 0 OR sold_episodes > 0
           THEN 'OK1 ✓ جهازٌ آخر لهذا المريض بِيع — وهذا طلبٌ مستقلّ ما زال ينتظر'
         WHEN converted_siblings > 0
           THEN 'OK2 ✓ متابعةٌ سابقة محسومةٌ بالشراء — وهذه طلبٌ لاحقٌ حيّ'
         WHEN maint_orders > 0
           THEN 'OK3 ✓ صيانةٌ فقط — ليست بيعَ جهاز، فالانتظارُ صحيح'
         --  ══ **المالُ وحدَه ليس دليلَ خطأ** (قرارُ المالك ٢٠٢٦-٠٩-١٥) ══
         --  مريضٌ له دفعاتٌ قديمة ثمّ جاء بمعاينةٍ جديدة صحيحة **يجب** أن
         --  يظهر في الطابور. فالعشرُ التي حُسمت خطأً حُسمت **بأعيانها بعد
         --  رؤيتها**، لا باستنتاجٍ من وجود مال — وهويّاتُها مثبَّتةٌ صراحةً
         --  في `cancel_decision_ten.sql` ولا تُشتقّ من هنا أبداً.
         --  فهذه فئةُ **مراجعة** لا فئةُ خطأ، وهي خارج مجموع «ظاهرون بالخطأ».
         WHEN paid_for_service > 0
           THEN 'R1 ⟲ يحتاج مراجعة — مالٌ مقبوضٌ للقسم بلا أمرِ بناء (قد يكون مالاً قديماً وطلباً جديداً صحيحاً)'
         ELSE 'OK4 ✓ لا بيعَ ولا أمرَ ولا مال — ظهورٌ صحيح'
       END AS reason
  FROM facts)

SELECT * FROM classified ORDER BY reason, patient_code;


-- ════════════════════════════════════════════════════════════════════════
--  ② التصنيفُ النهائيّ بالأعداد — الصقه كاملاً (يكرّر نفس الـCTE عمداً
--     ليعمل وحده بلا اعتمادٍ على تشغيل الأوّل).
-- ════════════════════════════════════════════════════════════════════════

WITH waiting AS (
  SELECT f.id AS followup_id, f.patient_id, f.service_type, f.status,
         f.device_episode_id, f.created_at,
         de.status        AS ep_status,
         de.service_path  AS ep_path,
         de.sequence_number AS ep_seq,
         p.patient_code, p.name AS patient_name, p.branch_id
    FROM post_exam_followups f
    LEFT JOIN patient_device_episodes de ON de.id = f.device_episode_id
    JOIN patients p ON p.id = f.patient_id AND p.deleted_at IS NULL
   WHERE f.status NOT IN ('closed_without_purchase','converted',
                          'closed_exam_cancelled','closed_admin_void',
                          'closed_request_cancelled',
                          --  الطرفيّةُ السادسة (ترحيل ٠٨١) — وبلا هذا السطر
                          --  يُرجع الملفُّ صفوفاً أُلغي حسمُها ولم تعد في الطابور.
                          'closed_decision_cancelled')
     AND (f.device_episode_id IS NULL OR de.service_path = 'exam')
     AND (
       CASE WHEN f.device_episode_id IS NULL THEN
         NOT EXISTS (SELECT 1 FROM prosthetic_work_orders wo
                      WHERE wo.patient_id = f.patient_id
                        AND wo.service_type = f.service_type
                        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
                        AND wo.admin_void_reversal_id IS NULL)
       ELSE
         de.status NOT IN ('in_manufacturing','delivered')
         AND NOT EXISTS (SELECT 1 FROM prosthetic_work_orders wo
                          WHERE wo.device_episode_id = f.device_episode_id
                            AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
                            AND wo.admin_void_reversal_id IS NULL)
       END
     )
),
facts AS (
  SELECT w.*,
    --  أوامرُ بناءٍ لهذا المريض وهذه الخدمة، بأيّ حلقة (أو بلا حلقة)
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build') AS build_orders_any,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.status NOT IN ('completed','cancelled')
        AND wo.admin_void_reversal_id IS NULL) AS build_orders_live,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.status = 'completed') AS build_orders_done,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.admin_void_reversal_id IS NOT NULL) AS build_orders_voided,
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND wo.purpose = 'maintenance') AS maint_orders,
    --  **أوامرُ بناءٍ بلا هويّةِ جهاز** — الحارسُ في الشاشة يطابق بـ
    --  `wo.device_episode_id = f.device_episode_id`، فأمرٌ بـ`NULL` لا يراه
    --  أبداً. هذه هي الفئةُ التي تُنتج «بيعٌ موجود والصفُّ ما زال ظاهراً».
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.device_episode_id IS NULL
        AND wo.admin_void_reversal_id IS NULL) AS unlinked_build_orders,
    --  أوامرُ بناءٍ على حلقةٍ **أخرى** حقيقية — بيعُ جهازٍ ثانٍ، لا هذا
    (SELECT count(*) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build'
        AND wo.device_episode_id IS NOT NULL
        AND wo.device_episode_id IS DISTINCT FROM w.device_episode_id
        AND wo.admin_void_reversal_id IS NULL) AS other_episode_build_orders,
    --  أرقامُ الأوامر للمراجعة اليدوية
    (SELECT string_agg(wo.id::text, ',' ORDER BY wo.id) FROM prosthetic_work_orders wo
      WHERE wo.patient_id = w.patient_id AND wo.service_type = w.service_type
        AND COALESCE(wo.purpose,'initial_build') = 'initial_build') AS build_order_ids,
    --  حلقاتُ هذا الخيط: كم منها بِيع فعلاً، وكم على مسار «بلا معاينة»
    (SELECT count(*) FROM patient_device_episodes e
       JOIN patient_cases pc ON pc.id = e.case_id
      WHERE e.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END
        AND e.status IN ('in_manufacturing','delivered')) AS sold_episodes,
    (SELECT count(*) FROM patient_device_episodes e
       JOIN patient_cases pc ON pc.id = e.case_id
      WHERE e.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END
        AND e.service_path = 'no_exam') AS no_exam_episodes,
    --  متابعةٌ أخرى لنفس المريض/الخدمة محسومةٌ بالشراء
    (SELECT count(*) FROM post_exam_followups f2
      WHERE f2.patient_id = w.patient_id AND f2.service_type = w.service_type
        AND f2.status = 'converted') AS converted_siblings,
    --  مالٌ قُبض موسومٌ بهذا القسم
    (SELECT COALESCE(sum(pay.amount),0) FROM payments pay
       JOIN patient_cases pc ON pc.id = pay.case_id
      WHERE pay.patient_id = w.patient_id
        AND pc.case_type = CASE WHEN w.service_type='prosthetic' THEN 'prosthetic'
                                ELSE 'medical_support' END) AS paid_for_service
  FROM waiting w
)
, classified AS (
SELECT patient_code, patient_name, branch_id, service_type, status AS followup_status,
       followup_id, device_episode_id, ep_status, ep_path, ep_seq,
       build_orders_any, build_orders_live, build_orders_done, build_orders_voided,
       unlinked_build_orders, other_episode_build_orders, build_order_ids,
       maint_orders, sold_episodes, no_exam_episodes, converted_siblings,
       paid_for_service, created_at::date AS followup_opened,
       CASE
         --  ✘ المشتبه الأول: أمرُ بناءٍ **بلا هويّة جهاز** والمتابعةُ لها حلقة.
         --     حارسُ الشاشة يطابق بالحلقة، فلا يراه — والصفُّ يبقى ظاهراً
         --     ولو كان ذلك الأمرُ هو بيعَ هذا الطلب بعينه.
         WHEN device_episode_id IS NOT NULL AND unlinked_build_orders > 0
           THEN 'X1 ✘ أمرُ بناءٍ بلا هويّة جهاز — يحتاج مطابقةً يدوية: أهو بيعُ هذا الطلب؟'
         --  ✘ المشتبه الثاني: يتيمةٌ ظهرت رغم وجود أمر — الحارسُ كان يجب أن يحجبها
         WHEN device_episode_id IS NULL AND build_orders_any > 0
           THEN 'X2 ✘ يتيمةٌ + أمرُ بناء — الحارسُ لم يطابق (تحقّق من service_type/void)'
         --  ✓ بيعُ جهازٍ آخر حقيقيّ — هذا الطلبُ غيرُه، فظهورُه صحيح
         WHEN other_episode_build_orders > 0 OR sold_episodes > 0
           THEN 'OK1 ✓ جهازٌ آخر لهذا المريض بِيع — وهذا طلبٌ مستقلّ ما زال ينتظر'
         WHEN converted_siblings > 0
           THEN 'OK2 ✓ متابعةٌ سابقة محسومةٌ بالشراء — وهذه طلبٌ لاحقٌ حيّ'
         WHEN maint_orders > 0
           THEN 'OK3 ✓ صيانةٌ فقط — ليست بيعَ جهاز، فالانتظارُ صحيح'
         --  ══ **المالُ وحدَه ليس دليلَ خطأ** (قرارُ المالك ٢٠٢٦-٠٩-١٥) ══
         --  مريضٌ له دفعاتٌ قديمة ثمّ جاء بمعاينةٍ جديدة صحيحة **يجب** أن
         --  يظهر في الطابور. فالعشرُ التي حُسمت خطأً حُسمت **بأعيانها بعد
         --  رؤيتها**، لا باستنتاجٍ من وجود مال — وهويّاتُها مثبَّتةٌ صراحةً
         --  في `cancel_decision_ten.sql` ولا تُشتقّ من هنا أبداً.
         --  فهذه فئةُ **مراجعة** لا فئةُ خطأ، وهي خارج مجموع «ظاهرون بالخطأ».
         WHEN paid_for_service > 0
           THEN 'R1 ⟲ يحتاج مراجعة — مالٌ مقبوضٌ للقسم بلا أمرِ بناء (قد يكون مالاً قديماً وطلباً جديداً صحيحاً)'
         ELSE 'OK4 ✓ لا بيعَ ولا أمرَ ولا مال — ظهورٌ صحيح'
       END AS reason
  FROM facts)

SELECT CASE WHEN reason LIKE 'X%' THEN '✘ ظاهرون بالخطأ — بيعٌ قائمٌ لا يراه الحارس'
            WHEN reason LIKE 'R%' THEN '⟲ يحتاج مراجعةً بشرية — لا يُحسَب خطأً ولا صحيحاً'
            ELSE '✓ ظاهرون بشكل صحيح' END AS "الفئة",
       count(*) AS "العدد"
  FROM classified GROUP BY 1
UNION ALL
SELECT '        · ' || reason, count(*) FROM classified GROUP BY reason
 ORDER BY 1;
