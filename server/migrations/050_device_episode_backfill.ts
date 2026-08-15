/**
 * Migration 050 — ترحيل بيانات: هوية الأجهزة التاريخية
 *
 * ترحيل **بيانات فقط**. لا عمود جديد ولا جدول ولا فهرس — البنية كلّها
 * وُضعت في 049، وهذه الخطوة تملؤها من التاريخ الموجود.
 *
 * الغرض: إعطاء كل جهاز صُنع تاريخياً هويةً مستقلّة (حلقة) بدل أن يبتلعه
 * صفّ الحالة المفرد. فمريض عاد بعد سنتين لطرفٍ ثانٍ يصير له خيطان
 * مميّزان، لا خيط واحد كُتب فوقه.
 *
 * ══ ما يفعله الترحيل — عمليّتان لا ثالثة لهما ═══════════════════════════
 *
 *   ١. INSERT حلقة لكل أمر بناء أولي له حالة مطابقة.
 *   ٢. UPDATE ربط أوامر البناء الأولي بحلقاتها (١:١).
 *
 * ولا شيء غير ذلك. لا صيانة، ولا معاينة، ولا دفعة، ولا زيارة، ولا قيد
 * كلفة — كلّها تبقى device_episode_id فارغةً.
 *
 * ══ لماذا لا إسناد تاريخي آخر إطلاقاً ═══════════════════════════════════
 *
 * قياس الإنتاج أظهر **٤٢ أمر صيانة بلا أيّ أمر بناء سابق**. وهذا ليس
 * شذوذاً في البيانات بل دليلٌ موجب: أجهزة إرث حقيقية كانت تُركَّب قبل
 * النظام ولم تُسجَّل فيه قطّ.
 *
 * وما دام ذلك ثابتاً، فوجود بناءٍ مكتملٍ وحيدٍ قبل صيانةٍ ما — ولو بختم
 * تسليم موثّق — **لا يثبت** أن الصيانة تخصّ ذلك الجهاز؛ فقد تخصّ جهاز
 * إرثٍ أقدم لا أثر له في القاعدة. والقرينة الزمنية هنا ترجيحٌ لا برهان،
 * وترجيحٌ يُثبَّت في سجلّ دائم أسوأ من فراغٍ صادق.
 *
 * والحجّة نفسها تسري على المعاينة التاريخية: حلقةٌ واحدة مسجَّلة لا تعني
 * أن الطبيب عاين ذلك الجهاز بعينه إن كان للمريض جهاز إرث غير مسجَّل.
 * ولذلك **لا يُفتح الباب المراقَب app.allow_exam_edit في هذا الترحيل
 * إطلاقاً** — المعاينة المختومة لا تُمَسّ ولو بعمود ربط إداري.
 *
 * الربط الصريح يبدأ مع الصفوف الجديدة حين تُفعَّل دورة الحياة في مرحلتها،
 * حيث يكون الجهاز معروفاً لحظة الكتابة لا مُستنتَجاً بعد سنوات.
 *
 * ══ ولا يتحرّك دينار ════════════════════════════════════════════════════
 *
 * agreed_cost = 0 لكل حلقة مرحَّلة — ولا يُنسخ patient_cases.cost ولا أيّ
 * مصدر آخر. السبب انعدام المصدر الحتمي لا التحفّظ: أجور الصيانة المدفوعة
 * تزيد patient_cases.cost نفسه (وكذلك patients.total_cost و
 * cost_entries)، فالرقم الموجود اليوم قد يكون:
 *
 *     سعر الجهاز + صيانات لاحقة + تعديلات إدارية
 *
 * ومريضٌ له جهازان يحمل صفّ حالة واحداً بمجموعهما معاً. فالصفر هنا يعني
 * «غير معروف» لا «مجاني»، والأموال الحقيقية تبقى حيث هي: patients
 * .total_cost و patient_cases.cost و cost_entries لا تتغيّر بحرف واحد.
 *
 * ══ الاعتماد على البنية القائمة ═════════════════════════════════════════
 *
 * uq_pwo_one_active_per_service يضمن أمراً واحداً غير منتهٍ لكل
 * (مريض، نوع خدمة) — فلا تنشأ حلقتان مفتوحتان لحالة واحدة، وشرط
 * uq_pde_case_open محفوظ. و uq_patient_cases_patient_type يضمن حالة
 * واحدة لكل (مريض، نوع) فالربط بالحالة أحاديّ لا ملتبس.
 *
 * idempotent: إعادة التشغيل لا تُنشئ حلقة مكرّرة ولا تغيّر ترتيباً ولا
 * رابطاً ولا حالة ولا ديناراً.
 */

export const name = "050_device_episode_backfill";

export const sql = `
-- ══ ١. إنشاء حلقة لكل أمر بناء أولي له حالة مطابقة ═══════════════════════
--  الترتيب داخل الحالة: created_at ثم id — والـ id يفضّ التعادل حين
--  يُفتح أمران في اللحظة نفسها، فالترتيب حتميّ لا عشوائي.
--
--  الحالة المطابقة شرط وجود: أمرٌ بلا حالة لا حلقة له (INNER JOIN)،
--  ولا يستهلك رقم تسلسل. وحالة بلا أمر بناء لا حلقة لها — الحلقة تمثّل
--  جهازاً صُنع فعلاً، لا خيط اختصاص مفتوحاً.
WITH ranked AS (
  SELECT wo.id            AS order_id,
         wo.patient_id    AS patient_id,
         pc.id            AS case_id,
         wo.branch_id     AS branch_id,
         wo.assigned_by   AS assigned_by,
         wo.created_at    AS created_at,
         wo.updated_at    AS updated_at,
         wo.completed_at  AS completed_at,
         wo.status        AS wo_status,
         ROW_NUMBER() OVER (PARTITION BY wo.patient_id, wo.service_type
                            ORDER BY wo.created_at, wo.id) AS seq
    FROM prosthetic_work_orders wo
    JOIN patient_cases pc
      ON pc.patient_id = wo.patient_id
     AND pc.case_type  = wo.service_type
   WHERE wo.purpose = 'initial_build'
)
INSERT INTO patient_device_episodes
  (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
   created_by, created_at, updated_at, delivered_at, cancelled_at, cancel_reason)
SELECT r.patient_id,
       r.case_id,
       r.branch_id,
       r.seq,
       CASE WHEN r.wo_status = 'completed' THEN 'delivered'
            WHEN r.wo_status = 'cancelled' THEN 'cancelled'
            ELSE                                'in_manufacturing'
       END,
       0,                                    -- agreed_cost: صفر دائماً. اقرأ رأس الملف.
       r.assigned_by,                        -- قد يكون NULL، ويبقى NULL
       r.created_at,
       COALESCE(r.updated_at, r.created_at),
       --  التسليم يُقرأ من ختم زمني حقيقي أو لا يُقرأ. أمرٌ مكتمل بلا
       --  completed_at يبقى delivered بتاريخ فارغ — ولا يُخترع له تاريخ
       --  من updated_at، لأن ذاك ختم آخر تعديل لا ختم تسليم.
       CASE WHEN r.wo_status = 'completed' THEN r.completed_at ELSE NULL END,
       NULL,                                 -- cancelled_at: لا ختم موثوق للإلغاء
       NULL                                  -- cancel_reason
  FROM ranked r
 WHERE NOT EXISTS (
         SELECT 1 FROM patient_device_episodes e
          WHERE e.case_id = r.case_id
            AND e.sequence_number = r.seq);


-- ══ ٢. ربط أوامر البناء الأولي بحلقاتها ══════════════════════════════════
--  نفس الترتيب المستخدم في الإنشاء، فالربط ١:١ حتميّ.
--
--  purpose = 'initial_build' شرطٌ في الـ CTE **وفي جملة الشرط معاً**:
--  الأمر الوحيد الذي يُعرَف جهازه يقيناً هو الذي أنشأ ذلك الجهاز. ولا
--  تلمس هذه الجملة أمراً بغرضٍ آخر.
WITH ranked AS (
  SELECT wo.id AS order_id, pc.id AS case_id,
         ROW_NUMBER() OVER (PARTITION BY wo.patient_id, wo.service_type
                            ORDER BY wo.created_at, wo.id) AS seq
    FROM prosthetic_work_orders wo
    JOIN patient_cases pc
      ON pc.patient_id = wo.patient_id
     AND pc.case_type  = wo.service_type
   WHERE wo.purpose = 'initial_build'
)
UPDATE prosthetic_work_orders wo
   SET device_episode_id = e.id
  FROM ranked r
  JOIN patient_device_episodes e
    ON e.case_id = r.case_id
   AND e.sequence_number = r.seq
 WHERE wo.id = r.order_id
   AND wo.purpose = 'initial_build'
   AND wo.device_episode_id IS DISTINCT FROM e.id;
`;
