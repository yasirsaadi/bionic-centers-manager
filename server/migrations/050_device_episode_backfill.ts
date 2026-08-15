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
 * ══ قرار مالي حاسم: agreed_cost = 0 دائماً ══════════════════════════════
 *
 * لا يُنسخ patient_cases.cost إلى agreed_cost إطلاقاً — ولا أي مصدر آخر.
 * السبب ليس التحفّظ بل انعدام المصدر الحتمي: أجور الصيانة المدفوعة تزيد
 * patient_cases.cost نفسه (وكذلك patients.total_cost و cost_entries).
 * فالرقم الموجود اليوم قد يكون:
 *
 *     سعر الجهاز + صيانات لاحقة + تعديلات إدارية
 *
 * ولا يوجد في القاعدة ما يفصل هذه المكوّنات بعد وقوعها. ومريضٌ له جهازان
 * يحمل صفّ حالة واحداً بمجموعهما معاً — فأي توزيع سيكون تخميناً يُثبَّت
 * في سجلّ دائم. الصفر هنا يعني «غير معروف» لا «مجاني»، والأموال الحقيقية
 * تبقى حيث هي: patients.total_cost و patient_cases.cost و cost_entries
 * لا تتغيّر بحرف واحد في هذا الترحيل.
 *
 * ══ ما يفعله الترحيل بالضبط ═════════════════════════════════════════════
 *
 *   ١. INSERT حلقة لكل أمر بناء أولي له حالة مطابقة.
 *   ٢. UPDATE ربط أوامر البناء بحلقاتها (١:١).
 *   ٣. UPDATE ربط الصيانة — بشرط دليل تسليم زمني قاطع فقط.
 *   ٤. UPDATE ربط المعاينات — بشرط حلقة واحدة لا غير.
 *
 * ولا شيء غير ذلك. الدفعات والزيارات وقيود الكلف تبقى device_episode_id
 * فارغةً عمداً: الإسناد المالي التاريخي لا يُخمَّن، و cost_entries لا
 * تحمل case_id أصلاً فلا سبيل حتمياً إليها.
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


-- ══ ٢. ربط أوامر البناء بحلقاتها ═════════════════════════════════════════
--  نفس الترتيب المستخدم في الإنشاء، فالربط ١:١ حتميّ.
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
   AND wo.device_episode_id IS DISTINCT FROM e.id;


-- ══ ٣. ربط الصيانة — دليل تسليم قاطع أو لا ربط ═══════════════════════════
--  «يوجد بناء سابق واحد» وحده لا يكفي: كثير من مرضى الإرث يحملون جهازاً
--  قديماً لم يُسجَّل في النظام أصلاً، فالصيانة قد تخصّ ذاك لا المسجَّل.
--
--  الشرط: بناء لنفس (المريض، النوع)، status = completed، وله
--  completed_at غير فارغ سابق أو مساوٍ لفتح الصيانة. وإن تعدّد المرشّحون
--  أو انعدموا يبقى الرابط فارغاً — لا الأحدث ولا الأقرب ولا الملغى.
--
--  n تُحسب على كل المرشّحين المؤهّلين قبل النظر في حلقاتهم، فلا يخفي
--  غيابُ حلقةٍ التباساً حقيقياً ويصير الربط أوسع مما ينبغي.
WITH cand AS (
  SELECT m.id                                  AS order_id,
         b.device_episode_id                   AS episode_id,
         count(*) OVER (PARTITION BY m.id)     AS n
    FROM prosthetic_work_orders m
    JOIN prosthetic_work_orders b
      ON b.patient_id   = m.patient_id
     AND b.service_type = m.service_type
     AND b.purpose      = 'initial_build'
     AND b.status       = 'completed'
     AND b.completed_at IS NOT NULL
     AND b.completed_at <= m.created_at
   WHERE m.purpose = 'maintenance'
)
UPDATE prosthetic_work_orders m
   SET device_episode_id = c.episode_id
  FROM cand c
 WHERE m.id = c.order_id
   AND c.n = 1
   AND c.episode_id IS NOT NULL
   AND m.device_episode_id IS NULL;


-- ══ ٤. ربط المعاينات — حلقة واحدة لا غير ═════════════════════════════════
--  المعاينة مختومة بترِكر يرفض أي UPDATE لم يفتح الباب المراقَب. نفتحه
--  حول هذه الجملة وحدها ثم نغلقه فوراً. والتعديل إداريّ بحت: عمود ربط
--  واحد. لا تشخيص ولا وصفة ولا طبيب ولا توقيع ولا نسخة جديدة.
--
--  الحالة ذات الحلقتين تبقى NULL: لا يُقرَّر عن الطبيب أيّ جهاز عاين.
SET LOCAL app.allow_exam_edit = 'on';

WITH solo AS (
  SELECT case_id, min(id) AS episode_id
    FROM patient_device_episodes
   GROUP BY case_id
  HAVING count(*) = 1
)
UPDATE medical_exams me
   SET device_episode_id = s.episode_id
  FROM solo s
 WHERE me.case_id = s.case_id
   AND me.device_episode_id IS DISTINCT FROM s.episode_id;

SET LOCAL app.allow_exam_edit = 'off';
`;
