// Migration 046: التقاط ما كتبه الكود القديم بعد تطبيق 045 مبكّراً.
//
// ══ لماذا وُجدت هذه الترحيلة أصلاً ═══════════════════════════════════════
// **حادثة 2026-08-10.** معاينةُ Render لطلب الدمج (Pull Request Preview)
// أُنشئت تلقائياً عند فتح PR #205، وورثت `DATABASE_URL` الحقيقي من الخدمة
// الأمّ، فأقلعت على كود الفرع وطبّقت 043 و044 و045 على **قاعدة الإنتاج**
// الساعة 02:54 — والدمج لم يقع بعد.
//
// فنشأت حالة لا يعالجها التصميم: **البيانات تحوّلت والكود لم يتحوّل**.
// ظلّ الإنتاج يخدم من `main` القديمة ساعاتٍ فوق مفردات جديدة، وواجهتُه
// القديمة تعرض قوائم المراحل القديمة — فكلّ خبير حرّك أمراً في تلك الفترة
// كتب كوداً قديماً من جديد. وقد أثبت الفحص ذلك: أمر `initial_build`
// أطراف عاد إلى `socket_adjustment` + `needs_resocket` **بعد** 045.
//
// و045 لا تُنقِذ نفسها: اسمها مسجَّل في `_migrations` فلن تعمل ثانيةً بعد
// الدمج. ولا يجوز تعديلها — المسجَّل لا يُعاد تشغيله، وتحريرُ نصّه يكسر
// تطابق ما في القاعدة مع ما في الشيفرة.
//
// فهذه الترحيلة هي **الكنس الأخير**: تعيد التحويل نفسه حرفياً على ما
// تراكم، وتُنفَّذ في `server/index.ts` **قبل `registerRoutes`** — أي قبل
// أن يُخدَم طلبٌ واحد بالكود الجديد. فلا فجوة يظهر فيها كود جديد فوق
// قيمة قديمة.
//
// ══ ما لا تفعله ══════════════════════════════════════════════════════════
//   • لا تلمس `prosthetic_work_history` ولا `prosthetic_rework_events`.
//   • لا تلمس `final_result` ولا `final_notes` ولا `completed_at` ولا
//     `started_at` ولا `expected_delivery_date`.
//   • لا تضيف عموداً ولا تغيّر افتراضاً — 045 فعلت ذلك على الإنتاج فعلاً.
//   • **لا تمسّ الصيانة إطلاقاً.** وأخصّ ما تحميه: أوامر
//     `maintenance / prosthetic / delivered / completed` — حالة تاريخية
//     مشروعة استثنتها `022_maintenance_stage_repair` عمداً من إصلاحها،
//     فليست فساداً ولا تُصلَح.
//
// ══ التكرار آمن ══════════════════════════════════════════════════════════
// الـ CASE لا تطابق إلا الأكواد القديمة، وكلّ ما عداها يمرّ عبر
// `ELSE current_stage`. فتشغيلها مرّتين لا يغيّر صفّاً واحداً — وقاعدةٌ
// جديدة تُبنى بالترتيب تجدها بلا عمل، وهذا هو المطلوب.

export const name = "046_manufacturing_legacy_catchup";

export const sql = `
-- ── المراحل: الأطراف (بناء أوّلي فقط) ─────────────────────────────────────
-- نسخة طبق الأصل من خريطة 045 — لا اجتهاد جديد هنا، فاختلاف حرفٍ واحد
-- بين الترحيلتين يعني مفردتين في قاعدة واحدة.
UPDATE prosthetic_work_orders SET current_stage = CASE current_stage
    WHEN 'new_assignment'          THEN 'order_received'
    WHEN 'assessment_measurements' THEN 'measurements'
    WHEN 'cast_taken'              THEN 'mold'
    WHEN 'cast_preparation'        THEN 'mold'
    WHEN 'test_socket'             THEN 'manufacturing'
    WHEN 'first_fitting'           THEN 'manufacturing'
    WHEN 'socket_adjustment'       THEN 'manufacturing'
    WHEN 'alignment'               THEN 'manufacturing'
    WHEN 'final_socket'            THEN 'manufacturing'
    WHEN 'final_assembly'          THEN 'manufacturing'
    WHEN 'quality_check'           THEN 'manufacturing'
    WHEN 'ready_for_delivery'      THEN 'ready_for_fitting'
    WHEN 'delivered'               THEN 'delivered'
    WHEN 'post_delivery_followup'  THEN 'delivered'
    ELSE current_stage
  END
 WHERE service_type = 'prosthetic'
   AND COALESCE(purpose, 'initial_build') = 'initial_build'
   AND current_stage IN (
     'new_assignment', 'assessment_measurements', 'cast_taken', 'cast_preparation',
     'test_socket', 'first_fitting', 'socket_adjustment', 'alignment',
     'final_socket', 'final_assembly', 'quality_check', 'ready_for_delivery',
     'post_delivery_followup');

-- ── المراحل: المساند (بناء أوّلي فقط) ─────────────────────────────────────
-- 'manufacturing' و 'delivered' في القائمتين القديمة والجديدة بالمعنى نفسه،
-- فيبقيان — ولذلك لا يردان في شرط الالتقاط أدناه: لا عمل لهما.
UPDATE prosthetic_work_orders SET current_stage = CASE current_stage
    WHEN 'new_assignment'          THEN 'order_received'
    WHEN 'assessment_measurements' THEN 'measurements'
    WHEN 'cast_if_needed'          THEN 'mold'
    WHEN 'fitting'                 THEN 'manufacturing'
    WHEN 'adjustment'              THEN 'manufacturing'
    WHEN 'quality_check'           THEN 'manufacturing'
    WHEN 'ready_for_delivery'      THEN 'ready_for_fitting'
    ELSE current_stage
  END
 WHERE service_type = 'medical_support'
   AND COALESCE(purpose, 'initial_build') = 'initial_build'
   AND current_stage IN (
     'new_assignment', 'assessment_measurements', 'cast_if_needed',
     'fitting', 'adjustment', 'quality_check', 'ready_for_delivery');

-- ── الحالات (بناء أوّلي فقط) ──────────────────────────────────────────────
-- 045 حوّلت الحالات بلا شرط على الغرض. وهنا الشرط مضاف التزاماً بقاعدة
-- «لا تمسّ الصيانة»: هذه الترحيلة تكنس ما كتبه الكود القديم على خطّ البناء،
-- ولا تتدخّل في أوامر الصيانة بحال.
UPDATE prosthetic_work_orders SET status = 'waiting_materials'
 WHERE status = 'waiting_components'
   AND COALESCE(purpose, 'initial_build') = 'initial_build';

UPDATE prosthetic_work_orders SET status = 'technical_rework'
 WHERE status IN ('needs_recast', 'needs_resocket')
   AND COALESCE(purpose, 'initial_build') = 'initial_build';
`;
