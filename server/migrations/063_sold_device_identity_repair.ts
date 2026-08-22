/**
 * Migration 063 — إصلاحُ هويّة الأجهزة المباعة بعد ٠٥٠
 *
 * ترحيل **بيانات فقط**. لا عمود ولا جدول ولا فهرس ولا قيد — ولا دينار.
 *
 * ══ الثغرة (المريض WB-02243) ════════════════════════════════════════════
 * ترحيلُ ٠٥٠ أعطى أوامرَ البناء التاريخية حلقاتِها — **لكنه جرى مرّةً
 * واحدة**. والمسارُ الحيّ ظلّ يبيع **الجهازَ الأول** بلا حلقة حين لا يفتح
 * له الاستعلاماتُ «طلبَ جهاز» صراحةً. فمريضٌ سُجّل بعد ٠٥٠، عُويِن واشترى
 * وبدأ تصنيعُه — وُلد صفُّه «تاريخياً» لحظةَ ولادته: بلا هويّةِ جهاز،
 * فيُردّ عليه تصحيحُ السعر بعد البيع (٢٣٩) بحجّة «مسارٌ قديم».
 *
 * البابُ نفسُه أُغلق في الشيفرة (`ensureFirstDeviceEpisodeForSale` عند
 * تأكيد الشراء). وهذا الترحيلُ يعالج **ما وقع قبل ذلك الإغلاق**.
 *
 * ══ الهويّةُ المستعملة — واحدةٌ حتميّة لا قرينة ══════════════════════════
 * `post_exam_followups.converted_work_order_id` ⟶ `prosthetic_work_orders.id`
 *
 * هذا **رابطٌ كتبه البيعُ نفسُه في معاملته**، لا استنتاجٌ من زمنٍ أو مبلغ
 * أو «جهازٌ واحدٌ أراه». فالمتابعةُ المحوَّلة تقول بالحرف: «أنا أنشأتُ هذا
 * الأمرَ بعينه» — وذلك الأمرُ هو الجهازُ الذي بِيع.
 *
 * ══ ولا تخمينَ لتاريخٍ ملتبس (مبدأ ٠٥٠ محفوظ) ══════════════════════════
 * صفٌّ بلا `converted_work_order_id` **يبقى كما هو**. ولا يُشتقّ جهازٌ من
 * (مريض + خدمة) ولا من ختمٍ زمنيّ ولا من مبلغ. و٢٣٩ يبقى يردّ ٤٠٩ على
 * البيع الملتبس حقاً — وهو الصدقُ عينُه.
 *
 * ══ والمال لا يُمَسّ ════════════════════════════════════════════════════
 * `agreed_cost = followup.approved_price` — وهذا **ليس استنتاجاً من مجموع
 * المريض** كما تحفّظ ٠٥٠ (فذاك رقمٌ متراكم قد يحمل صياناتٍ وتعديلات). هو
 * **السعرُ التجاريُّ الدقيق على المتابعة بعينها التي أنشأت الأمرَ بعينه**،
 * وقد كُتب في المعاملة نفسها. فنسخُه هنا نقلُ رقمٍ معروف لا تخمينُ مجهول.
 *
 * وما عدا ذلك **لا يتغيّر بحرف**: لا `patients.total_cost` · ولا
 * `patient_cases.cost` · ولا `payments` · ولا مبالغُ `cost_entries` · ولا
 * مراحلُ التصنيع ولا سجلُّه · **ولا `medical_exams.device_episode_id`**
 * (الختمُ ٠٢٨ لا يُفتح لهويّةٍ إدارية — و٢٣٩ صار يجد متابعتَه بـ
 * `medical_exam_id` فلا يحتاج ذلك أصلاً).
 *
 * **هذا الترحيلُ يصلح الهويّة وحدها.** السعرُ موجودٌ سلفاً في المتابعة وفي
 * المجاميع المالية.
 *
 * ══ الحالاتُ الجزئية — كلُّها idempotent ════════════════════════════════
 *   (أ) المتابعةُ بلا حلقة والأمرُ له حلقة (خلّفها ٠٥٠) ⟶ تُربَط المتابعة.
 *   (ب) المتابعةُ لها حلقة والأمرُ بلا ⟶ يُربَط الأمر.
 *   (ج) كلاهما على الحلقة نفسها ⟶ لا شيء.
 *   (د) **كلٌّ على حلقةٍ مختلفة ⟶ لا يُمَسّ أحدُهما** ولا يُخمَّن أيُّهما
 *       الصحيح. يبقى للمراجعة اليدوية (استعلامُ التشخيص في ذيل الملفّ).
 *
 * وإعادةُ التشغيل لا تُنشئ حلقةً مكرّرة ولا تغيّر رابطاً ولا حالة ولا رقماً:
 * كلُّ إدراجٍ مشروطٌ بـ`NOT EXISTS`، وكلُّ ربطٍ مشروطٌ بـ`IS NULL`.
 */

export const name = "063_sold_device_identity_repair";

export const sql = `
-- ══ (أ) المتابعةُ بلا حلقة، والأمرُ المحوَّل يحمل واحدة ═══════════════════
--  خلّفها ٠٥٠: أنشأ الحلقةَ وربط الأمرَ، ولم يلمس المتابعةَ إطلاقاً.
--  فالحلقةُ موجودةٌ وصحيحة، وينقص الرابطُ الثالثُ وحده.
--
--  والهويّةُ تُتحقَّق ولا يُوثَق بها: الأمرُ لهذا المريض ونوعِ خدمته،
--  وغرضُه بناءٌ أوليّ، والحلقةُ لهذا المريض وخيطِه هو.
UPDATE post_exam_followups f
   SET device_episode_id = wo.device_episode_id, updated_at = NOW()
  FROM prosthetic_work_orders wo
  JOIN patient_device_episodes e ON e.id = wo.device_episode_id
  JOIN patient_cases pc          ON pc.id = e.case_id
 WHERE f.converted_work_order_id = wo.id
   AND f.device_episode_id IS NULL
   AND wo.device_episode_id IS NOT NULL
   AND wo.purpose = 'initial_build'
   AND wo.patient_id = f.patient_id
   AND wo.service_type = f.service_type
   AND e.patient_id = f.patient_id
   AND pc.patient_id = f.patient_id
   AND pc.case_type = f.service_type;


-- ══ (ب) إنشاءُ حلقةٍ للبيع الذي لا حلقةَ له في الطرفين ═══════════════════
--  هذه هي ثغرةُ ما بعد ٠٥٠ بعينها: بيعٌ حقيقيٌّ وأمرُ بناءٍ حقيقيّ، وكلاهما
--  بلا هويّة. الرابطُ الحتميّ «converted_work_order_id» يعيّن الجهازَ يقيناً.
--
--  الترتيبُ داخل الخيط: created_at ثمّ id — نفسُ ترتيب ٠٥٠ حرفياً، فالأرقامُ
--  المتسلسلة تبقى متّسقةً مع ما رحّله.
--
--  ══ ولا يُقلَب تاريخُ الأجهزة (حارسُ التسلسل) ═══════════════════════════
--  «MAX + ROW_NUMBER» وحدَه صحيحٌ فقط إن كان المفقودُ **متأخّراً** عن كلّ
--  حلقةٍ قائمة. والحالةُ المعاكسة واقعةٌ حقيقية: جهازٌ أولُ بِيع في فجوة
--  ما بعد ٠٥٠ بلا حلقة واكتمل، ثمّ فُتح جهازٌ ثانٍ بالمسار الصريح فأخذ
--  التسلسل ١. فلو أُصلح الأولُ بـ٢ لصار **الأقدمُ «الجهاز الثاني»
--  والأحدثُ «الأول»** — تاريخٌ مقلوبٌ يُكتب في سجلٍّ دائم.
--
--  والقاعدةُ المحافِظة: **يُنشَأ فقط ما يمكن إلحاقُه زمنياً بأمان.**
--    · لا حلقةَ على الخيط        ⟶ آمن (تسلسل ١)
--    · كلُّ الحلقات أقدمُ منه     ⟶ آمن (MAX+١)
--    · أيُّ حلقةٍ أحدثُ أو مساويةٌ ⟶ **لا يُنشَأ شيء**، ويبقى الصفُّ للمراجعة
--
--  والمساواةُ تُردّ كالأحدث، وكذلك أيُّ ختمٍ مفقود: **ما لا يُثبَت ترتيبُه
--  لا يُخمَّن.** ولا تُعاد ترقيمُ حلقةٍ قائمة إطلاقاً — إصلاحٌ يعيد كتابة
--  تاريخٍ صحيح ليست إصلاحاً.
WITH candidate AS (
  SELECT f.id            AS followup_id,
         f.patient_id    AS patient_id,
         pc.id           AS case_id,
         wo.id           AS order_id,
         wo.branch_id    AS branch_id,
         wo.assigned_by  AS assigned_by,
         wo.created_at   AS created_at,
         wo.updated_at   AS updated_at,
         wo.completed_at AS completed_at,
         wo.status       AS wo_status,
         GREATEST(f.approved_price, 0) AS agreed_cost
    FROM post_exam_followups f
    JOIN prosthetic_work_orders wo
      ON wo.id = f.converted_work_order_id
     AND wo.purpose = 'initial_build'
     AND wo.patient_id = f.patient_id
     AND wo.service_type = f.service_type
    JOIN patient_cases pc
      ON pc.patient_id = f.patient_id
     AND pc.case_type  = f.service_type
   WHERE f.device_episode_id IS NULL
     AND wo.device_episode_id IS NULL
     AND f.service_type IN ('prosthetic', 'medical_support')
     --  ختمُ الأمر شرطُ إثبات: بلا زمنٍ لا يُثبَت ترتيبٌ ولا يُخمَّن.
     AND wo.created_at IS NOT NULL
     --  **حارسُ التسلسل**: لا حلقةَ على هذا الخيط أحدثُ من المرشَّح ولا
     --  مساويةٌ له ولا مجهولةُ الختم. فإن وُجدت واحدةٌ كذلك تُرك الصفُّ
     --  كما هو للمراجعة اليدوية، ولم يُقلَب ترتيبُ أجهزة المريض.
     AND NOT EXISTS (
           SELECT 1 FROM patient_device_episodes e
            WHERE e.case_id = pc.id
              AND (e.created_at IS NULL OR e.created_at >= wo.created_at))
),
numbered AS (
  SELECT c.*,
         (SELECT COALESCE(MAX(e.sequence_number), 0) FROM patient_device_episodes e
           WHERE e.case_id = c.case_id)
         + ROW_NUMBER() OVER (PARTITION BY c.case_id ORDER BY c.created_at, c.order_id)
           AS seq
    FROM candidate c
),
--  **الإدراجُ والربطُ جملةٌ واحدة** — و«RETURNING» هو ما يعيّن الحلقةَ
--  المُنشأة لصاحبها. ولا مطابقةَ بختمٍ زمنيّ ولا بمبلغ: تلك قرينةٌ
--  ترجيحية، وهي بالضبط ما يمنعه مبدأ ٠٥٠. والمفتاحُ هنا حتميّ:
--  (الخيط، رقمُ التسلسل) وهو مفتاحُ التفرّد نفسُه (uq_pde_case_seq).
ins AS (
  INSERT INTO patient_device_episodes
    (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
     requested_item, component, created_by, created_at, updated_at, delivered_at)
  SELECT n.patient_id,
         n.case_id,
         n.branch_id,
         n.seq,
         --  الحالةُ من دورة حياة الأمر — نفسُ خريطة ٠٥٠ حرفياً.
         CASE WHEN n.wo_status = 'completed' THEN 'delivered'
              WHEN n.wo_status = 'cancelled' THEN 'cancelled'
              ELSE                                'in_manufacturing'
         END,
         n.agreed_cost,
         --  **جهازٌ كامل** — وهذا تعريفُ «initial_build» نفسِه لا تخمين:
         --  الأمرُ لا يحمل «ما طُلب» أصلاً (ترحيل ٠٦٠ وضع «requested_item»
         --  على الحلقة وحدها، وعلى الأمر «maintenance_component» للصيانة).
         --  وشراءُ جزءٍ بعينه يمرّ بغرضٍ آخر لا ببناءٍ أوليّ.
         'full_device',
         NULL,
         n.assigned_by,
         n.created_at,
         COALESCE(n.updated_at, n.created_at),
         --  التسليمُ من ختمٍ حقيقيّ أو لا يُكتب. ولا يُخترَع من updated_at.
         CASE WHEN n.wo_status = 'completed' THEN n.completed_at ELSE NULL END
    FROM numbered n
   WHERE NOT EXISTS (
           SELECT 1 FROM patient_device_episodes e
            WHERE e.case_id = n.case_id AND e.sequence_number = n.seq)
  RETURNING id, case_id, sequence_number
),
link_followup AS (
  UPDATE post_exam_followups f
     SET device_episode_id = i.id, updated_at = NOW()
    FROM numbered n
    JOIN ins i ON i.case_id = n.case_id AND i.sequence_number = n.seq
   WHERE f.id = n.followup_id
     AND f.device_episode_id IS NULL
  RETURNING f.id
)
UPDATE prosthetic_work_orders wo
   SET device_episode_id = i.id
  FROM numbered n
  JOIN ins i ON i.case_id = n.case_id AND i.sequence_number = n.seq
 WHERE wo.id = n.order_id
   AND wo.device_episode_id IS NULL;


-- ══ (ج) الأمرُ بلا رابط والمتابعةُ تحمل حلقتها ═══════════════════════════
--  الحالةُ (ب) من الوصف: المتابعةُ رُبطت (بالمسار الحيّ مثلاً) ولم يُربَط
--  أمرُها. والهويّةُ تُتحقَّق كاملةً قبل الكتابة.
--
--  **والحالةُ (د) — كلٌّ على حلقةٍ مختلفة — لا يمسّها شيء**: الشرطُ
--  «wo.device_episode_id IS NULL» يستثنيها، فلا تُكتب حلقةٌ فوق أخرى ولا
--  يُخمَّن أيُّهما الصحيح. تبقى للمراجعة اليدوية.
UPDATE prosthetic_work_orders wo
   SET device_episode_id = f.device_episode_id
  FROM post_exam_followups f
  JOIN patient_device_episodes e ON e.id = f.device_episode_id
  JOIN patient_cases pc          ON pc.id = e.case_id
 WHERE f.converted_work_order_id = wo.id
   AND wo.device_episode_id IS NULL
   AND f.device_episode_id IS NOT NULL
   AND wo.purpose = 'initial_build'
   AND wo.patient_id = f.patient_id
   AND wo.service_type = f.service_type
   AND e.patient_id = f.patient_id
   AND pc.patient_id = f.patient_id
   AND pc.case_type = f.service_type;
`;
