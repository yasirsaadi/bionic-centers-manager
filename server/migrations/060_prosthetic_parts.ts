/**
 * Migration 060 — **ما المطلوب**: طرفٌ كامل أم جزءٌ منه
 *
 * ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
 * المريضُ العائد نادراً ما يطلب طرفاً كاملاً: تنكسر ركبةٌ، أو يتمزّق
 * سليكون، أو يبلى غلافُ قدم. والنظامُ لم يكن يعرف إلّا «طرف صناعي جديد»،
 * فيُكتب الجزءُ المطلوب في **ملاحظةٍ حرّة** إن كُتب — فلا يُبحَث عنه ولا
 * يُحصى، ولا يقرؤه الطبيبُ في طلبه ولا الخبيرُ في أمره.
 *
 * والصيانةُ أسوأ: تُفتَح «صيانة طرف صناعي» بلا أن يُقال أيُّ جزءٍ يُصان —
 * فيصل الخبيرَ أمرٌ عليه أن يسأل عنه.
 *
 * ══ ثلاثةُ أعمدة، إضافيّةٌ كلُّها ═══════════════════════════════════════
 *   • `patient_device_episodes.requested_item` — ما طُلب شراؤه.
 *   • `patient_device_episodes.component`      — الجزءُ وحده، مشتقٌّ منه.
 *   • `prosthetic_work_orders.maintenance_component` — الجزءُ المُصان.
 *
 * ولماذا عمودان على الحلقة لا واحد؟ لأن السؤالين مختلفان: «ماذا طلب» يشمل
 * الطرفَ الكامل، و«أيُّ جزء» لا يشمله. وفصلُهما يجعل استعلامَ «كم ركبةً
 * بعنا هذا الشهر» فهرساً على عمودٍ ضيّق لا مسحاً بـ`CASE`. والقيدُ يربطهما
 * فلا ينحرفان: `full_prosthesis` ⟺ `component IS NULL`.
 *
 * ══ ولا صفَّ تاريخيٌّ يُعاد تفسيره ═════════════════════════════════════
 * كلُّ حلقةٍ قائمة اليوم **هي طرفٌ كامل فعلاً** — لم يكن للنظام باب غيره.
 * فالتعبئةُ ليست ترميماً لنقصٍ بل تسجيلُ ما هو واقع. و`component` تبقى
 * `NULL` لها جميعاً: **لا صفَّ قديم يصير جزءاً**.
 *
 * وأوامرُ الصيانة القديمة تبقى `maintenance_component IS NULL` — «لم يُسجَّل
 * الجزء» حقيقةٌ عنها، وادّعاءُ جزءٍ بعينه كذبٌ على السجلّ. والإلزامُ في
 * التطبيق للجديد وحده.
 *
 * idempotent: `ADD COLUMN IF NOT EXISTS`، وقيودٌ تُفحَص بأسمائها قبل
 * إضافتها، وتعبئةٌ مشروطة بـ`IS NULL` فلا تكتب فوق شيء.
 */

export const name = "060_prosthetic_parts";

export const sql = `
-- ── ١. ما طُلب شراؤه، والجزءُ منه ──────────────────────────────────────
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS requested_item TEXT;
ALTER TABLE patient_device_episodes
  ADD COLUMN IF NOT EXISTS component TEXT;

-- تعبئةُ ما هو واقعٌ فعلاً: كلُّ حلقةٍ قائمة طرفٌ كامل.
UPDATE patient_device_episodes
   SET requested_item = 'full_prosthesis'
 WHERE requested_item IS NULL;

-- ثم يصير الحقلُ إلزامياً بقيمةٍ افتراضية للصفوف الجديدة الصامتة.
ALTER TABLE patient_device_episodes
  ALTER COLUMN requested_item SET DEFAULT 'full_prosthesis';
ALTER TABLE patient_device_episodes
  ALTER COLUMN requested_item SET NOT NULL;

DO $r1$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'patient_device_episodes_requested_item_check'
       AND conrelid = 'patient_device_episodes'::regclass
  ) THEN
    ALTER TABLE patient_device_episodes
      ADD CONSTRAINT patient_device_episodes_requested_item_check
      CHECK (requested_item IN (
        'full_prosthesis', 'socket', 'silicone', 'knee', 'tube',
        'adapter', 'foot', 'foam_cover', 'foot_shell'));
  END IF;

  -- **العمودان متلازمان**: طرفٌ كامل ⟺ لا جزء. وجزءٌ ⟺ الاسمُ نفسه في
  -- العمودين. فلا صفَّ يقول «طرف كامل» ويحمل ركبةً، ولا عكسُه.
  --
  -- و IS NOT NULL **صريحةٌ عمداً**: المساواةُ وحدها (component = requested_item)
  -- تُقيَّم NULL حين يكون العمود فارغاً، و CHECK تقبل NULL (لا تردّ إلّا
  -- FALSE) — فصفٌّ يقول «ركبة» بلا جزءٍ كان يمرّ.
  --
  -- وصيغةٌ أقدم تُنزَع أوّلاً لا تُترك لأن الاسم موجود: idempotent تعني
  -- **واحديّةَ النتيجة** لا مجرّد أمانِ الإعادة.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'patient_device_episodes_component_check'
       AND conrelid = 'patient_device_episodes'::regclass
       AND pg_get_constraintdef(oid) NOT LIKE '%component IS NOT NULL%'
  ) THEN
    ALTER TABLE patient_device_episodes
      DROP CONSTRAINT patient_device_episodes_component_check;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'patient_device_episodes_component_check'
       AND conrelid = 'patient_device_episodes'::regclass
  ) THEN
    ALTER TABLE patient_device_episodes
      ADD CONSTRAINT patient_device_episodes_component_check
      CHECK (
        (requested_item = 'full_prosthesis' AND component IS NULL)
        OR (requested_item <> 'full_prosthesis'
            AND component IS NOT NULL AND component = requested_item));
  END IF;
END
$r1$;

-- ── ٢. الجزءُ المُصان على أمر الصيانة ──────────────────────────────────
ALTER TABLE prosthetic_work_orders
  ADD COLUMN IF NOT EXISTS maintenance_component TEXT;

DO $r2$
BEGIN
  -- **يُقبل NULL دائماً**: أوامرُ الصيانة القديمة لم تسجّل الجزء، و«لم
  -- يُسجَّل» حقيقةٌ عنها. والإلزامُ في التطبيق للجديد وحده — لا في القاعدة،
  -- كي لا يصير كلُّ صفٍّ قديمٍ مخالفاً.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'prosthetic_work_orders_maint_component_check'
       AND conrelid = 'prosthetic_work_orders'::regclass
  ) THEN
    ALTER TABLE prosthetic_work_orders
      ADD CONSTRAINT prosthetic_work_orders_maint_component_check
      CHECK (
        maintenance_component IS NULL
        OR maintenance_component IN (
          'socket', 'silicone', 'knee', 'tube',
          'adapter', 'foot', 'foam_cover', 'foot_shell'));
  END IF;

  -- **ولا جزءَ صيانةٍ على أمرِ بناء**: البناءُ يصنع طرفاً كاملاً أو جزءاً
  -- طُلب شراؤه — وذاك مسجَّلٌ على الحلقة لا هنا. فعمودٌ مملوءٌ على أمر
  -- بناء يعني خلطاً بين البابين.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'prosthetic_work_orders_maint_component_purpose_check'
       AND conrelid = 'prosthetic_work_orders'::regclass
  ) THEN
    ALTER TABLE prosthetic_work_orders
      ADD CONSTRAINT prosthetic_work_orders_maint_component_purpose_check
      CHECK (maintenance_component IS NULL OR purpose = 'maintenance');
  END IF;
END
$r2$;

-- ── ٣. فهرسٌ ضيّق للسؤال التجاري ───────────────────────────────────────
-- «كم ركبةً بعنا هذا الشهر» يصير قراءةَ فهرسٍ لا مسحَ جدول.
CREATE INDEX IF NOT EXISTS ix_pde_component
  ON patient_device_episodes (component)
  WHERE component IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_wo_maint_component
  ON prosthetic_work_orders (maintenance_component)
  WHERE maintenance_component IS NOT NULL;
`;
