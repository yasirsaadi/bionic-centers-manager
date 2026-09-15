-- ═══════════════════════════════════════════════════════════════════════════
-- إخراجُ عشرِ متابعاتٍ بعينها من «بانتظار الحسم» — قرارُ المالك ٢٠٢٦-٠٩-١٥
-- ═══════════════════════════════════════════════════════════════════════════
--
-- ⚠ الأفضلُ ألّا يُشغَّل هذا الملفُّ أصلاً.
--   بعد نشر «إلغاء الحسم» يكفي أن تضغط الزرَّ على كلٍّ من العشر من الشاشة —
--   المسارُ القانونيُّ نفسُه بحرفه، بلا SQL على الإنتاج. وهذا بديلٌ لمن
--   أراد العشرَ دفعةً واحدة، ويكتب **ما يكتبه الزرُّ بالضبط** لا أقلَّ ولا أكثر.
--
-- ⚠ شرطُ التشغيل: يجب أن يكون **ترحيل ٠٨١ قد طُبِّق على الإنتاج** (أي أن
--   يكون التطبيقُ قد أُعيد نشرُه بعد دمج هذا العمل). قبله يرفض قيدُ
--   `post_exam_followups_status_check` القيمةَ `closed_decision_cancelled`
--   وتسقط المعاملةُ كلُّها — رفضٌ نظيف، لا نصفَ كتابة. وفي الخطوة ٠ فحصٌ
--   صريحٌ يقول أَطُبِّق أم لا.
--
-- ══ ما يفعله — **ثلاثةُ أعمدةٍ لا أكثر** ═══════════════════════════════════
--   حالةُ الصفّ ⟶ `closed_decision_cancelled` (طرفيّة) · `closed_at` ·
--   `updated_at`
--   + صفٌّ في `post_exam_followup_events` + صفٌّ في `audit_log`.
--
--   **ولا `last_note` ولا `last_contact_at`**: السببُ يعيش في الحدث وفي
--   التدقيق، ولا يُكتب فوق آخر ملاحظةٍ قالها زميلٌ عن المريض؛ وإلغاءُ الحسم
--   ليس اتصالاً بالمريض فلا يحرّك ختمَ آخرِ تواصل. **وهذا مطابقٌ حرفياً
--   للكاتب القانونيّ** `server/followup/store.ts: cancelDecision`.
--
-- ══ ما لا يفعله — **وهذا مُثبَتٌ داخل المعاملة نفسِها لا موعود** ═══════════
--   لا يحذف صفَّ متابعةٍ ولا مريضاً ولا معاينة · ولا يكتب قرارَ شراءٍ ولا
--   «لم يشترِ» · ولا يلمس ديناراً. والحارسان في آخر المعاملة يقارنان
--   **لقطةً حقيقية** أُخذت في أوّلها: أيُّ فرقٍ خارج ما هو مسموح ⟶ استثناءٌ
--   يُسقط كلَّ شيء.
--
-- ══ المتابعاتُ العشر — بالمعرّف لا بالاسم ══════════════════════════════════
--   ٧١ WB-00782 · ٦٩ WB-00816 · ٦٨ WB-00920 · ٦٧ WB-00993 · ٦٦ WB-01049
--   ٦٥ WB-01081 · ٦٤ WB-01156 · ٦٣ WB-01171 · ٦٢ WB-01391 · ٦٠ WB-01443
--
--   ⛔ والمتابعةُ **٧٠** (WB-00798 — «طاهر سوادي محمد حمود»، اسمٌ يتكرّر على
--      ملفَّين) **ليست منها**. ولا تُذكَر في أيّ جملة كتابةٍ أدناه، وحارسُ
--      اللقطة يُسقط المعاملةَ لو تغيّر صفُّها بأيّ عمود.
--
-- ══ والتشغيلُ الثاني لا يفعل شيئاً ═════════════════════════════════════════
--   شرطُ الحالة الحيّة في `WHERE` نفسِه: صفٌّ صار طرفيّاً لا يُطابَق ثانيةً،
--   فلا حدثَ مكرَّرٌ ولا سطرَ تدقيقٍ مكرَّر. والحُرّاسُ تمرّ بصفر تغيير.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- الخطوة ٠ — قراءةٌ فقط. شغّلها أوّلاً وراجع الناتج قبل أيّ كتابة.
-- ───────────────────────────────────────────────────────────────────────────
SELECT
  f.id                AS "المتابعة",
  p.patient_code      AS "رمز المريض",
  p.name              AS "الاسم",
  f.status            AS "الحالة الآن",
  f.service_type      AS "القسم",
  f.device_episode_id AS "الحلقة",
  f.branch_id         AS "الفرع",
  COALESCE((SELECT SUM(pay.amount) FROM payments pay
             WHERE pay.patient_id = f.patient_id), 0) AS "مجموع دفعاته",
  CASE WHEN f.status IN ('awaiting_patient_decision','follow_up',
                         'price_approved_waiting_patient',
                         'price_approval_pending','purchase_approval_pending')
       THEN 'سيُلغى حسمُها' ELSE 'لن تُمَسّ — ليست حيّةً الآن' END AS "الأثر"
FROM post_exam_followups f
JOIN patients p ON p.id = f.patient_id
WHERE f.id IN (60, 62, 63, 64, 65, 66, 67, 68, 69, 71)
ORDER BY f.id;

-- أَطُبِّق ترحيلُ ٠٨١؟ لا تُكمل قبل أن تُرجع هذه `t`.
SELECT EXISTS (
  SELECT 1 FROM pg_constraint
   WHERE conname = 'post_exam_followups_status_check'
     AND pg_get_constraintdef(oid) LIKE '%closed_decision_cancelled%'
) AS "ترحيل ٠٨١ مطبَّق؟";


-- ───────────────────────────────────────────────────────────────────────────
-- الخطوة ١ — الكتابة. معاملةٌ واحدة: تقع كاملةً أو لا تقع.
--
--   ✎ قبل التشغيل غيّر رقمَ المستخدم واسمَه في `actor` أدناه إلى حسابك أنت:
--     SELECT id, username, full_name FROM system_users WHERE role = 'admin';
--     رقمٌ لا وجودَ له في `system_users` يُسقط المعاملةَ بالمفتاح الأجنبيّ.
-- ───────────────────────────────────────────────────────────────────────────
BEGIN;

-- لقطةٌ حقيقية قبل أيّ كتابة — هي حَكَمُ الحُرّاس في آخر المعاملة.
CREATE TEMP TABLE _f_before ON COMMIT DROP AS
  SELECT id, patient_id, case_id, device_episode_id, medical_exam_id, branch_id,
         service_type, status, approved_price, original_price, price_kind,
         price_source, selected_expert_user_id, purchase_decision,
         purchase_decision_at, purchase_decision_owner, not_bought_reason_text,
         closed_reason, converted_at, converted_work_order_id,
         --  **العمودان اللذان لا يُمَسّان** — في اللقطة كي يُثبت الحارسُ (أ)
         --  بقاءهما، لا كي يُسمَح بتغيّرهما.
         last_note, last_contact_at
    FROM post_exam_followups;

CREATE TEMP TABLE _money_before ON COMMIT DROP AS
  SELECT (SELECT COUNT(*)                       FROM payments)                 AS pay_n,
         (SELECT COALESCE(SUM(amount),0)        FROM payments)                 AS pay_sum,
         (SELECT COUNT(*)                       FROM cost_entries)             AS cost_n,
         (SELECT COALESCE(SUM(amount),0)        FROM cost_entries)             AS cost_sum,
         (SELECT COALESCE(SUM(total_cost),0)    FROM patients)                 AS total_cost,
         (SELECT COUNT(*)                       FROM patient_cases)            AS case_n,
         (SELECT COALESCE(SUM(cost),0)          FROM patient_cases)            AS case_cost,
         (SELECT COUNT(*)                       FROM patient_device_episodes)  AS ep_n,
         (SELECT COALESCE(SUM(agreed_cost),0)   FROM patient_device_episodes)  AS ep_cost,
         (SELECT COUNT(*)                       FROM prosthetic_work_orders)   AS wo_n,
         (SELECT COUNT(*)                       FROM medical_exams)            AS exam_n,
         (SELECT COUNT(*)                       FROM post_exam_followups)      AS f_n;

WITH actor AS (
  SELECT
    1::int                                          AS user_id,   -- ✎ غيّره
    'المسؤول العام'::text                            AS user_name, -- ✎ غيّره
    'دخلت «بانتظار الحسم» بالخطأ — لا قرارَ شراءٍ على هذه المتابعة'::text
                                                    AS reason
),

-- ① الصفوفُ المقصودة وحدها، مقفولةً بترتيب المعرّف (فلا جمودَ مع التطبيق).
--    والحالةُ الحيّةُ شرطٌ هنا — فصفٌّ حُسم بين الخطوة ٠ وهذه اللحظة يسقط
--    وحده ولا يُكتَب عليه، والتشغيلُ الثاني لا يطابق شيئاً.
locked AS (
  SELECT id, patient_id, branch_id, status
    FROM post_exam_followups
   WHERE id IN (60, 62, 63, 64, 65, 66, 67, 68, 69, 71)
     AND status IN ('awaiting_patient_decision', 'follow_up',
                    'price_approved_waiting_patient',
                    'price_approval_pending', 'purchase_approval_pending')
   ORDER BY id
     FOR UPDATE
),

-- ② الحالةُ وحدها. `purchase_decision` و`closed_reason` و
--    `not_bought_reason_text` و`approved_price` و`selected_expert_user_id`
--    تبقى كما هي حرفاً بحرف — ويُثبته الحارسُ (أ) أدناه.
upd AS (
  UPDATE post_exam_followups f
     SET status          = 'closed_decision_cancelled',
         closed_at       = NOW(),
         updated_at      = NOW()
    FROM locked l
   WHERE f.id = l.id AND f.status = l.status
  RETURNING f.id, f.patient_id, f.branch_id, l.status AS from_status
),

-- ③ سجلُّ المتابعة — نفسُ شكل `appendEvent` في `server/followup/store.ts`.
ev AS (
  INSERT INTO post_exam_followup_events
    (followup_id, patient_id, branch_id, event_type, from_status, to_status,
     reason, note, payload, actor_user_id, actor_name)
  SELECT u.id, u.patient_id, u.branch_id, 'closed_decision_cancelled',
         u.from_status, 'closed_decision_cancelled',
         NULL, a.reason,
         jsonb_build_object('cancelReason', a.reason, 'actorRole', 'global_admin'),
         a.user_id, a.user_name
    FROM upd u CROSS JOIN actor a
  RETURNING followup_id
),

-- ④ التدقيق — نفسُ شكل `logAudit` من النقطة.
aud AS (
  INSERT INTO audit_log
    (entity_type, entity_id, action, user_id, user_name, branch_id,
     old_values, new_values, ip_address, user_agent, notes)
  SELECT 'post_exam_followup', u.id, 'update', a.user_id, a.user_name, u.branch_id,
         json_build_object('status', u.from_status)::text,
         json_build_object('status', 'closed_decision_cancelled',
                           'cancelReason', a.reason)::text,
         NULL, 'neon-sql-editor',
         'إلغاء الحسم — متابعة #' || u.id || ': ' || a.reason
    FROM upd u CROSS JOIN actor a
  RETURNING entity_id
)
SELECT
  (SELECT COUNT(*) FROM upd) AS "أُلغي حسمُها",
  (SELECT COUNT(*) FROM ev)  AS "أحداثٌ كُتبت",
  (SELECT COUNT(*) FROM aud) AS "أسطرُ تدقيق";


-- ══ الحُرّاس — يقارنون اللقطةَ الحقيقية. أيُّ واحدٍ يُسقط المعاملةَ كلَّها ══

-- (أ) لا صفَّ متابعةٍ تغيّر إلّا حالةُ العشر — ولا عمودَ تجاريّاً واحداً تحرّك،
--     **ولا `last_note` ولا `last_contact_at` على أيّ صفّ** بما فيها العشر.
--     ويشمل هذا المتابعةَ ٧٠ تلقائياً: أيُّ فرقٍ عليها يُلتقَط هنا.
DO $$
DECLARE n int; bad text;
BEGIN
  SELECT COUNT(*), COALESCE(string_agg(DISTINCT t.id::text, ', '), '')
    INTO n, bad
  FROM (
    SELECT b.id FROM _f_before b JOIN post_exam_followups f ON f.id = b.id
     WHERE (b.patient_id, b.case_id, b.device_episode_id, b.medical_exam_id,
            b.branch_id, b.service_type, b.approved_price, b.original_price,
            b.price_kind, b.price_source, b.selected_expert_user_id,
            b.purchase_decision, b.purchase_decision_at, b.purchase_decision_owner,
            b.not_bought_reason_text, b.closed_reason, b.converted_at,
            b.converted_work_order_id, b.last_note, b.last_contact_at)
        IS DISTINCT FROM
           (f.patient_id, f.case_id, f.device_episode_id, f.medical_exam_id,
            f.branch_id, f.service_type, f.approved_price, f.original_price,
            f.price_kind, f.price_source, f.selected_expert_user_id,
            f.purchase_decision, f.purchase_decision_at, f.purchase_decision_owner,
            f.not_bought_reason_text, f.closed_reason, f.converted_at,
            f.converted_work_order_id, f.last_note, f.last_contact_at)
    UNION ALL
    -- حالةٌ تغيّرت على صفٍّ خارج العشر، أو إلى قيمةٍ غير المتوقَّعة
    SELECT b.id FROM _f_before b JOIN post_exam_followups f ON f.id = b.id
     WHERE f.status IS DISTINCT FROM b.status
       AND NOT (b.id IN (60,62,63,64,65,66,67,68,69,71)
                AND f.status = 'closed_decision_cancelled')
    UNION ALL
    SELECT b.id FROM _f_before b LEFT JOIN post_exam_followups f ON f.id = b.id
     WHERE f.id IS NULL                       -- صفٌّ حُذف
  ) t;
  IF n > 0 THEN
    RAISE EXCEPTION 'توقّف — تغيُّرٌ غيرُ مسموح على المتابعات: %', bad;
  END IF;
END $$;

-- (ب) لا دينارَ تحرّك، ولا صفَّ مالٍ أو تصنيعٍ أو معاينةٍ أُنشئ أو حُذف.
DO $$
DECLARE b _money_before%ROWTYPE; a _money_before%ROWTYPE;
BEGIN
  SELECT * INTO b FROM _money_before;
  SELECT (SELECT COUNT(*)                     FROM payments),
         (SELECT COALESCE(SUM(amount),0)      FROM payments),
         (SELECT COUNT(*)                     FROM cost_entries),
         (SELECT COALESCE(SUM(amount),0)      FROM cost_entries),
         (SELECT COALESCE(SUM(total_cost),0)  FROM patients),
         (SELECT COUNT(*)                     FROM patient_cases),
         (SELECT COALESCE(SUM(cost),0)        FROM patient_cases),
         (SELECT COUNT(*)                     FROM patient_device_episodes),
         (SELECT COALESCE(SUM(agreed_cost),0) FROM patient_device_episodes),
         (SELECT COUNT(*)                     FROM prosthetic_work_orders),
         (SELECT COUNT(*)                     FROM medical_exams),
         (SELECT COUNT(*)                     FROM post_exam_followups)
    INTO a;
  IF a IS DISTINCT FROM b THEN
    RAISE EXCEPTION 'توقّف — تحرّك مالٌ أو تصنيعٌ أو معاينة. قبل: % / بعد: %', b, a;
  END IF;
END $$;

COMMIT;


-- ───────────────────────────────────────────────────────────────────────────
-- الخطوة ٢ — تحقّقٌ بعد الإتمام. قراءةٌ فقط. (٧٠ معروضةٌ عمداً للمقارنة.)
-- ───────────────────────────────────────────────────────────────────────────
SELECT f.id AS "المتابعة", p.patient_code AS "رمز المريض",
       f.status AS "الحالة", f.closed_at AS "وقت الإلغاء",
       --  السببُ يُقرأ من **الحدث** لا من `last_note` — هناك يعيش.
       (SELECT ev.note FROM post_exam_followup_events ev
         WHERE ev.followup_id = f.id
           AND ev.event_type = 'closed_decision_cancelled'
         ORDER BY ev.id DESC LIMIT 1)            AS "سببُ الإلغاء (من الحدث)",
       f.last_note         AS "آخرُ ملاحظة (يجب أن تبقى كما كانت)",
       f.last_contact_at   AS "آخرُ تواصل (يجب أن يبقى كما كان)",
       f.purchase_decision AS "قرارُ الشراء (كما كان — لا يُمحى)",
       f.closed_reason     AS "سببُ الإغلاق (يبقى فارغاً)"
  FROM post_exam_followups f JOIN patients p ON p.id = f.patient_id
 WHERE f.id IN (60, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71)
 ORDER BY f.id;
