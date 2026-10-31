// Migration 188: تجميدُ عدّاد جلسات مرضى ما قبل الخطّة المحفوظة — قبل تغيير الأسعار (§4.fu — ٢٠٢٦-١٠-٣١).
//
// أسعارُ المالك الجديدة (الروبوتُ ٧٥٬٠٠٠، والتمارينُ والأجهزةُ ٣٥٬٠٠٠) للبيع الجديد وحده. لكنّ مريضاً سُعّر قبل أن تُحفَظ الخطّةُ
// (`patients.physio_plan` فارغة) **عددُ ما اشتراه يُشتقّ كلَّ مرّةٍ من كلفته ÷ سعرِ نوعه بالجدول الحاليّ** (`resolvePurchasedSessions`،
// الخطوةُ الثالثة): ٢٧٥٬٠٠٠ «أجهزة علاج طبيعي» ⟵ ١١ جلسة. فلو تغيّر السعرُ وحده لصار ٢٧٥٬٠٠٠ ÷ ٣٥٬٠٠٠ كسراً فيهبط عدّادُه إلى دفعاته (٤)،
// أو يقبل القسمةَ فيعطي عدداً آخر (٧٠٠٬٠٠٠ = ٢٨ ⟵ ٢٠) — بصمتٍ وبلا خطأ.
//
// فهذا الترحيلُ يحسب **بأسعار ما قبل اليوم** (`PHYSIO_PRICES_BEFORE_2026_11` في `shared/pricing.ts`) ما يراه عدّادُه الآن،
// ويكتبه خطّةً محفوظة — فيُقرأ بعد اليوم من الخطّة (المصدرُ الأوّل) ولا يمسّه السعرُ الجديد. **القاعدةُ بحرفها**:
//   - لا خطّةَ صالحة (فارغةٌ أو بلا سطرٍ له نوعٌ وعدد)، ونصُّ النوع نوعٌ واحدٌ مسعَّر؛
//   - الكلفةُ كلفةُ قسم العلاج الطبيعي (وإلّا مجموعُ المريض) وتقبل القسمةَ على سعره القديم؛
//   - والمشتقُّ أكبرُ من الجلسات **المدفوعة** في دفعات القسم أو بلا قسم (وإلّا فدفعاتُه تحكم ولا يُمسّ)؛
//   - والخطّةُ = المشتقُّ على نوعه + الجلساتُ المُهداة بأنواعها (إلّا الاستشارة — لا تدخل خطّةً أبداً)، وتلك الهدايا تُوسَم
//     `plan_credited` كي يطرحها تعديلُها أو حذفُها من الخطّة كما يفعل لكلّ هديّةٍ مقيَّدة.
// **ولا دينارَ يُمسّ**: لا كلفةَ ولا دفعةَ ولا قيد. وسطرُ تدقيقٍ لكلّ مريضٍ بخطّته. ومَن له خطّةٌ لا يُقرأ أصلاً، فالإعادةُ لا تفعل شيئاً.
export const name = "188_freeze_legacy_physio_counts";

export const sql = `
WITH legacy(label, price) AS (
  VALUES ('روبوت', 50000), ('تمارين تأهيلية', 25000), ('أجهزة علاج طبيعي', 25000), ('تمارين مع أجهزة', 25000), ('أبر صينية', 25000)
),
cand AS MATERIALIZED (
  SELECT p.id, p.branch_id, l.label, l.price, pc.id AS case_id,
         GREATEST(0, COALESCE(CASE WHEN pc.id IS NOT NULL THEN pc.cost ELSE p.total_cost END, 0))::bigint AS cost
    FROM patients p
    JOIN legacy l ON l.label = btrim(p.treatment_type, E' \\t\\r\\n')
    LEFT JOIN LATERAL (
      SELECT c.id, c.cost FROM patient_cases c
       WHERE c.patient_id = p.id AND c.case_type = 'physiotherapy' ORDER BY c.id LIMIT 1
    ) pc ON true
   --  «لا خطّةَ صالحة» كما يقرؤها resolvePurchasedSessions: ليست مصفوفةً، أو لا سطرَ فيها بنوعٍ وعددٍ موجب.
   --  و**CASE لا AND**: Postgres لا يَعِد بترتيب تقييم الشروط، فقيمةٌ ليست مصفوفةً أو عددٌ ليس رقماً كانا سيُسقطان الترحيلَ كلَّه.
   WHERE NOT EXISTS (
     SELECT 1
       FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p.physio_plan) = 'array' THEN p.physio_plan ELSE '[]'::jsonb END) e
      WHERE COALESCE(e->>'treatmentType', '') <> ''
        AND CASE WHEN COALESCE(e->>'sessionCount', '') ~ '^[0-9]+(\\.[0-9]+)?$' THEN (e->>'sessionCount')::numeric ELSE 0 END > 0
   )
),
paid AS MATERIALIZED (
  SELECT c.id,
         COALESCE(SUM(pay.session_count) FILTER (WHERE pay.session_count > 0 AND NOT COALESCE(pay.is_free_sessions, false)), 0) AS n
    FROM cand c
    LEFT JOIN payments pay ON pay.patient_id = c.id AND (pay.case_id = c.case_id OR pay.case_id IS NULL)
   GROUP BY c.id
),
frozen AS MATERIALIZED (
  SELECT c.id, c.branch_id, c.label, c.case_id, (c.cost / c.price) AS derived
    FROM cand c JOIN paid ON paid.id = c.id
   WHERE c.price > 0 AND c.cost > 0 AND c.cost % c.price = 0 AND (c.cost / c.price) > paid.n
),
gift_rows AS MATERIALIZED (
  SELECT f.id AS patient_id, pay.id AS payment_id,
         COALESCE(NULLIF(btrim(pay.payment_treatment_type, E' \\t\\r\\n'), ''), 'غير محدد') AS k, pay.session_count AS n
    FROM frozen f
    JOIN payments pay ON pay.patient_id = f.id AND (pay.case_id = f.case_id OR pay.case_id IS NULL)
   WHERE COALESCE(pay.is_free_sessions, false) AND pay.session_count > 0
),
entries AS (
  SELECT id, k, SUM(n)::bigint AS n, MIN(ord) AS ord FROM (
    SELECT id, label AS k, derived AS n, 0 AS ord FROM frozen
    UNION ALL
    SELECT patient_id, k, n, 1 FROM gift_rows WHERE k <> 'استشارة طبية'
  ) u
  GROUP BY id, k
),
plans AS MATERIALIZED (
  SELECT id, jsonb_agg(jsonb_build_object('treatmentType', k, 'sessionCount', n) ORDER BY ord, k) AS plan
    FROM entries GROUP BY id
),
upd AS (
  UPDATE patients p SET physio_plan = plans.plan
    FROM plans
   WHERE p.id = plans.id
  RETURNING p.id
),
cred AS (
  UPDATE payments pay SET plan_credited = true
    FROM gift_rows g
   WHERE pay.id = g.payment_id AND g.k <> 'استشارة طبية'
  RETURNING pay.id
)
INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, old_values, new_values, notes)
SELECT 'patient', f.id, 'update', NULL, 'ترحيل ١٨٨', f.branch_id,
       json_build_object('physioPlan', NULL, 'derivedFrom', 'cost')::text,
       json_build_object('physioPlan', plans.plan)::text,
       'تجميدُ عدّاد الجلسات قبل الأسعار الجديدة (§4.fu): ' || f.label || ' ' || f.derived || ' جلسة من الكلفة بسعرها القديم — بلا أثرٍ ماليّ'
  FROM frozen f JOIN plans ON plans.id = f.id
 WHERE f.id IN (SELECT id FROM upd);
`;
