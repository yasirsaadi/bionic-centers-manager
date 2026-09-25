-- ═══════════════════════════════════════════════════════════════════════
--  معاينةٌ فقط — لا تكتب حرفاً واحداً في القاعدة.
--
--  الغرض: الأعذارُ التي كتبها الخبراءُ من «توقّف / مشكلة» ثمّ مُحيت قبل
--  إصلاح ٢٠٢٦-٠٩-٢٤ (طلب الدمج ٤٠٣) — كان «إلغاء التوقّف ومتابعة العمل»
--  والانتقالُ للمرحلة التالية يمحوانها — فبقيت أوامرُها حمراء «متأخر بدون عذر».
--
--  كلُّ صفٍّ هنا أمرٌ لم يُسلَّم ولم يُلغَ، ولا عذرَ عليه الآن، وفي سجلّه الزمني
--  عذرٌ كتبه خبيرٌ بيده. و«العذر الذي سيعود» هو **آخرُ** عذرٍ كُتب على الأمر
--  — نفسُ ما كان سيبقى عليه لو طُبّق الإصلاحُ من البداية. لا يُخترَع عذر.
--
--  ولا يُقرأ عذراً إلّا ما كُتب في مكان العذر («توقّف / مشكلة» و«كتابة سبب
--  التوقّف»): ملاحظاتُ الانتقال الفنّية وسببُ تغيير الموعد **ليست أعذاراً**
--  بقرار المالك (٢٠٢٦-٠٩-٢٤)، فلا تُقرأ هنا.
--
--  الاستعمال: الصقه كما هو في محرّر SQL في Neon ونفّذه. لا يغيّر شيئاً.
--  ثمّ راجع القائمة، ودوّن «رقم الأمر» لكلّ صفٍّ لا تريد إعادةَ عذره.
-- ═══════════════════════════════════════════════════════════════════════
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
, status_labels(code, label) AS (VALUES
  ('active', 'قيد العمل'),
  ('waiting_patient', 'بانتظار المريض'),
  ('waiting_materials', 'بانتظار المواد'),
  ('medical_hold', 'متوقف لسبب طبي'),
  ('technical_rework', 'إعادة عمل فني'),
  ('completed', 'مكتمل'),
  ('cancelled', 'ملغى'),
  ('waiting_components', 'بانتظار المكونات (سابقاً)'),
  ('needs_recast', 'يحتاج إعادة قالب (سابقاً)'),
  ('needs_resocket', 'يحتاج إعادة سوكت (سابقاً)')
)
SELECT
  c.id                                                   AS "رقم الأمر",
  p.patient_code || ' — ' || p.name                      AS "المريض",
  COALESCE(b.name, '—')                                  AS "الفرع",
  COALESCE(x.display_name, '—')                          AS "الخبير",
  COALESCE(sl.label, c.status)                           AS "الحالة الآن",
  c.expected_delivery_date                               AS "موعد التسليم",
  CASE WHEN c.expected_delivery_date < (NOW() AT TIME ZONE 'Asia/Baghdad')::date
       THEN 'نعم' ELSE 'لا' END                           AS "متأخر الآن",
  c.label                                                AS "العذر الذي سيعود",
  COALESCE(c.note, '')                                   AS "ملاحظة الخبير",
  COALESCE(w.display_name, '—')                          AS "كتبه",
  to_char(c.written_at AT TIME ZONE 'Asia/Baghdad', 'YYYY-MM-DD HH24:MI')
                                                         AS "تاريخ كتابته",
  CASE WHEN p.deleted_at IS NOT NULL THEN 'نعم' ELSE '' END AS "في المحذوفات",
  COUNT(*) OVER ()                                       AS "العدد الكلي"
FROM candidates c
JOIN patients p          ON p.id = c.patient_id
LEFT JOIN branches b     ON b.id = c.branch_id
LEFT JOIN system_users x ON x.id = c.expert_user_id
LEFT JOIN system_users w ON w.id = c.written_by
LEFT JOIN status_labels sl ON sl.code = c.status
ORDER BY (c.expected_delivery_date < (NOW() AT TIME ZONE 'Asia/Baghdad')::date) DESC NULLS LAST,
         b.name, c.id;
