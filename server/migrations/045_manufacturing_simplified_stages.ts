// Migration 045: تبسيط مراحل التصنيع إلى ستّ، وفصل التوقّف عن المرحلة.
//
// ══ لماذا ═════════════════════════════════════════════════════════════════
// أربع عشرة مرحلة للأطراف وتسع للمساند، تخلط «أين وصل العمل» بـ«ماذا حدث
// له»: test_socket و socket_adjustment و alignment و final_socket كلها
// **تصنيع**، لكنها كانت مراحل مستقلّة. فالخبير يتنقّل بينها بلا ترتيب،
// وشريط التقدّم بلا معنى، ولا تصلح واحدة منها لغةً تُقال للمريض.
//
// من الآن: ستّ مراحل، نفس التسميات للخبير وللمريض. والتوقّف والمشكلات
// وأسبابها تصير **حالة** منفصلة، داخلية بحتة، لا تغيّر المرحلة أبداً.
//
// ══ قرار التعامل مع الأوامر المكتملة والملغاة ════════════════════════════
// **تُحوَّل هي أيضاً، ولا يُفسِد ذلك تاريخها.** والسبب دقيق:
//
//   `current_stage` ليس سجلّاً تاريخياً — هو مؤشّر إلى «أين هو الآن»، ولأمر
//   مكتمل يعني «أين انتهى». والسجلّ التاريخي كلّه في
//   `prosthetic_work_history`، **وهذا الترحيل لا يمسّه بحرف**: كل صفّ فيه
//   يحتفظ بأسماء المراحل القديمة (test_socket, alignment, quality_check…)،
//   وتبقى مقروءة لأن `STAGE_LABELS` احتفظت بها موسومةً «(سابقاً)».
//
//   ولو تُركت الأوامر المغلقة على الأكواد القديمة لانقسم النظام نصفين:
//   لوحة تعرض ستّ مراحل لأوامر مفتوحة وأربع عشرة لأوامر مغلقة، وإحصاءات
//   تعدّ المرحلة نفسها تحت اسمين. وهذا أسوأ من التحويل بكثير.
//
//   وما يُصان فعلاً محفوظ كما هو: `completed_at`, `final_result`,
//   `final_notes`, `started_at`, `expected_delivery_date` — لا يمسّها هذا
//   الترحيل. أمر انتهى عند `post_delivery_followup` يصير `delivered`، وسجلّه
//   يُظهر أنه بلغ متابعة ما بعد التسليم. لا شيء ضاع.
//
// ══ ما لا يُمسّ ═══════════════════════════════════════════════════════════
//   • `prosthetic_work_history` — كامل، بلا سطر واحد معدَّل.
//   • `prosthetic_rework_events` — صفوف recast/resocket القديمة تبقى بقيمها.
//   • أوامر الصيانة (`purpose = 'maintenance'`) — دورتها القصيرة فُحصت ولم
//     تحتج تبسيطاً، فتبقى على `new_assignment` و`maintenance_*_done`.
//     ولهذا كل تحويل هنا مشروط بـ `purpose = 'initial_build'`.
//
// إضافي وغير مدمِّر: عمودان جديدان، وتحويل قيم نصّية داخل عمودين قائمين.

export const name = "045_manufacturing_simplified_stages";

export const sql = `
-- ── سبب التوقّف الحالي ─────────────────────────────────────────────────────
-- داخلي بحت ولا يصل المريض. عمودان لا سطر في السجلّ، لأن السؤال «لماذا هو
-- متوقّف الآن؟» يجب أن يُجاب بقراءة صفّ واحد لا بمسح تاريخ كامل.
-- يُملآن عند التوقّف ويُفرَغان عند الاستئناف.
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS hold_reason_code TEXT;
ALTER TABLE prosthetic_work_orders ADD COLUMN IF NOT EXISTS hold_note TEXT;

-- ── تحويل المراحل: الأطراف ────────────────────────────────────────────────
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
   AND COALESCE(purpose, 'initial_build') = 'initial_build';

-- ── تحويل المراحل: المساند ────────────────────────────────────────────────
-- 'manufacturing' موجود في القائمتين القديمة والجديدة بالمعنى نفسه، فيبقى.
UPDATE prosthetic_work_orders SET current_stage = CASE current_stage
    WHEN 'new_assignment'          THEN 'order_received'
    WHEN 'assessment_measurements' THEN 'measurements'
    WHEN 'cast_if_needed'          THEN 'mold'
    WHEN 'manufacturing'           THEN 'manufacturing'
    WHEN 'fitting'                 THEN 'manufacturing'
    WHEN 'adjustment'              THEN 'manufacturing'
    WHEN 'quality_check'           THEN 'manufacturing'
    WHEN 'ready_for_delivery'      THEN 'ready_for_fitting'
    WHEN 'delivered'               THEN 'delivered'
    ELSE current_stage
  END
 WHERE service_type = 'medical_support'
   AND COALESCE(purpose, 'initial_build') = 'initial_build';

-- ── الافتراضي الجديد للعمود ───────────────────────────────────────────────
-- إلزامي لا تجميلي: shared/schema.ts يعلن الافتراضي 'order_received'، والإنتاج
-- لا يُبنى إلا بالترحيلات. فلو تُرك الافتراضي 'new_assignment' لَوَلَد كل إدراج
-- لا يذكر العمود صراحةً أمراً على كود ميّت خارج المراحل الست — وزرّ «الانتقال
-- للمرحلة التالية» يجده بلا تالية فيتعطّل صامتاً.
ALTER TABLE prosthetic_work_orders ALTER COLUMN current_stage SET DEFAULT 'order_received';

-- ── تحويل الحالات ─────────────────────────────────────────────────────────
-- الثلاث القديمة لا توجد إلا على أوامر مفتوحة بحكم التعريف (المغلق حالته
-- completed أو cancelled)، فلا حاجة لشرط إضافي.
--   waiting_components → waiting_materials
--   needs_recast / needs_resocket → technical_rework
-- وصفوف prosthetic_rework_events التي تحمل recast/resocket **لا تُمسّ**:
-- هي تاريخ إعادة العمل، وحذفه أو إعادة تسميته يمحو أثر ما جرى فعلاً.
UPDATE prosthetic_work_orders SET status = 'waiting_materials' WHERE status = 'waiting_components';
UPDATE prosthetic_work_orders SET status = 'technical_rework'  WHERE status IN ('needs_recast', 'needs_resocket');

-- ── نتائج تسليم قديمة ────────────────────────────────────────────────────
-- 'recast_required' و 'resocket_required' لم يعودا في قائمة النتائج، لكنهما
-- على أوامر مكتملة ويصفان ما جرى. تبقى كما هي، وتُقرأ من STAGE/RESULT
-- labels الموسومة «(سابقاً)». لا UPDATE هنا عمداً.

CREATE INDEX IF NOT EXISTS idx_work_orders_stage_status
  ON prosthetic_work_orders (current_stage, status);
`;
