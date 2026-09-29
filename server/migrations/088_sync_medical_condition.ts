// **«الحالة المرضية» تتبع أقسامَ المريض — لا تبقى على قسم التسجيل** (البند ٣١ من §4.ar — ٢٠٢٦-٠٩-٢٩)
//
// ══ الواقعة ═════════════════════════════════════════════════════════════
// `patients.medical_condition` تُكتب مرّةً عند التسجيل (`amputee` / `physiotherapy` /
// `medical_support`) ولا يحدّثها شيءٌ بعدها: مريضُ أطرافٍ تحوّل إلى العلاج الطبيعي وحده
// يبقى «بتر» في التصدير والبحث ولوحة التحكّم والتقرير اليومي. وأعلامُ الأقسام
// (`is_amputee` · `is_medical_support` · `is_physiotherapy`) هي التي تتحدّث.
//
// ══ القاعدة ═════════════════════════════════════════════════════════════
// مُطلِقٌ واحد على الجدول، لا في كلّ بابٍ يكتب الأعلام — فبابٌ جديدٌ لا ينساه:
//   • نصٌّ حرٌّ قديم (ليس أحدَ الرموز الثلاثة) ⟵ **لا يُمَسّ**: وصفٌ كتبه إنسان.
//   • الرمزُ الحاليّ قسمُه قائمٌ في الأعلام ⟵ يبقى (مريضُ قسمين لا يتقلّب رمزُه).
//   • وإلّا ⟵ أوّلُ قسمٍ قائم: أطراف ⟵ مساند ⟵ علاج طبيعي.
//   • ولا علَمَ قائمٌ أصلاً ⟵ يبقى كما هو (لا اختلاقَ قسم).
//
// **والتصحيحُ الرجعيّ يُكتب في `audit_log` قبله** — صفٌّ لكلّ مريض بالقيمة القديمة
// والجديدة، فيُعرف ما تغيّر ويُعكَس إن لزم. idempotent: التشغيلُ الثاني لا يجد صفّاً
// متخلّفاً فلا يكتب شيئاً. بلا `DROP` ولا `DELETE`، ولا مسٍّ لترحيلٍ من ٠٠١ إلى ٠٨٧.

export const name = "088_sync_medical_condition";

export const sql = `
CREATE OR REPLACE FUNCTION sync_patient_medical_condition() RETURNS trigger AS $fn$
BEGIN
  IF NEW.medical_condition IS NULL
     OR NEW.medical_condition NOT IN ('amputee', 'physiotherapy', 'medical_support') THEN
    RETURN NEW;
  END IF;
  IF (NEW.medical_condition = 'amputee'         AND NEW.is_amputee IS TRUE)
  OR (NEW.medical_condition = 'medical_support' AND NEW.is_medical_support IS TRUE)
  OR (NEW.medical_condition = 'physiotherapy'   AND NEW.is_physiotherapy IS TRUE) THEN
    RETURN NEW;
  END IF;
  NEW.medical_condition := CASE
    WHEN NEW.is_amputee IS TRUE         THEN 'amputee'
    WHEN NEW.is_medical_support IS TRUE THEN 'medical_support'
    WHEN NEW.is_physiotherapy IS TRUE   THEN 'physiotherapy'
    ELSE NEW.medical_condition
  END;
  RETURN NEW;
END
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_medical_condition ON patients;
CREATE TRIGGER trg_sync_medical_condition
  BEFORE INSERT OR UPDATE OF is_amputee, is_medical_support, is_physiotherapy, medical_condition
  ON patients
  FOR EACH ROW EXECUTE FUNCTION sync_patient_medical_condition();

-- الصفوفُ المتخلّفة: رمزٌ قسمُه غيرُ قائم، ولها قسمٌ آخرُ قائم.
CREATE TEMP TABLE _mc_stale ON COMMIT DROP AS
SELECT id, branch_id, medical_condition AS old_mc,
       CASE WHEN is_amputee IS TRUE THEN 'amputee'
            WHEN is_medical_support IS TRUE THEN 'medical_support'
            ELSE 'physiotherapy' END AS new_mc
FROM patients
WHERE medical_condition IN ('amputee', 'physiotherapy', 'medical_support')
  AND (is_amputee IS TRUE OR is_medical_support IS TRUE OR is_physiotherapy IS TRUE)
  AND NOT ((medical_condition = 'amputee'         AND is_amputee IS TRUE)
        OR (medical_condition = 'medical_support' AND is_medical_support IS TRUE)
        OR (medical_condition = 'physiotherapy'   AND is_physiotherapy IS TRUE));

INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, old_values, new_values, notes)
SELECT 'patient', id, 'update', NULL, 'ترحيل ٠٨٨', branch_id,
       json_build_object('medicalCondition', old_mc)::text,
       json_build_object('medicalCondition', new_mc)::text,
       'مزامنة «الحالة المرضية» مع أقسام المريض الحالية (ترحيل ٠٨٨)'
FROM _mc_stale;

UPDATE patients p SET medical_condition = s.new_mc
FROM _mc_stale s WHERE p.id = s.id;
`;
