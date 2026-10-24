// Migration 181: منطقةُ «الوجه» في قيد القاعدة — لماذا لم تظهر البروتوكولاتُ المفصَّلة من ١٦٣ إلى ١٨٠ على الإنتاج (§4.fl — ٢٠٢٦-١٠-٢٤).
//
// **الواقعة**: أرسل المالكُ صورةَ المكتبة على الإنتاج — بروتوكولاتٌ مفصَّلة (شللُ بِل والشللُ الدماغيّ والحبلُ الشوكيّ وباركنسون والكفّةُ ووترُ العرقوب …)
// بلا إطارها الأزرق وبعدد أجهزة المسوّدة القديمة. **والسبب**: ترحيلُ ١١٨ أنشأ `physio_exercises` بقيدٍ على المنطقة
// (`CHECK (region IN (... 'whole_body'))`) بلا «الوجه»، وترحيلُ ١٦٣ (شللُ العصب الوجهيّ، §4.ev) أضاف بطاقاتٍ منطقتُها `face` —
// فرُفض على الإنتاج وتراجعت معاملتُه كلُّها، **والمشغّلُ يقف عند أوّل فشل ولا يُسقط التطبيق** (`[migrations] FAILED` في السجلّ وحده)،
// فلم يُطبَّق ١٦٣ ولا شيءٌ بعده — سبعةَ عشرَ ترحيلاً. **ولم يُرَ في الاختبار** لأنّ قاعدةَ الاختبار تُبنى بـ`db:push` من `shared/schema.ts`
// فتُنشأ الجداولُ بلا قيود `CHECK` المكتوبة في نصّ الترحيلات (وطُبّق القيدُ الواحدُ والأربعون كلُّها على نسخةٍ منها فلم يُخالَف إلّا هذا).
//
// **فهذا يحلّ القيدَ القديم أيّاً كان اسمُه ويكتبه بالمناطق كلِّها** (`BODY_REGIONS` في `shared/physio_exercises.ts`)، **ويُشغَّل قبل ١٦٣**
// في مصفوفة المشغّل (لا آخرَها): على الإنتاج يمرّ هو ثمّ ١٦٣ … ١٨٠ بترتيبها؛ وحيث طُبّقت قبلُ (قواعدُ الاختبار) يُضيف القيدَ نفسَه
// فتصير مثلَ الإنتاج في هذا العمود. ومتكرّرٌ بلا ضرر: يحلّ ما وُجد ثمّ يكتبه.
export const REGIONS = ["lumbar", "thoracic", "cervical", "shoulder", "elbow", "wrist_hand", "hip", "knee", "ankle_foot", "whole_body", "face"] as const;

export const name = "181_physio_exercise_region_face";
export const sql = `DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
            WHERE conrelid = 'physio_exercises'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%region%'
  LOOP
    EXECUTE format('ALTER TABLE physio_exercises DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE physio_exercises ADD CONSTRAINT physio_exercises_region_check
  CHECK (region IN (${REGIONS.map((r) => `'${r}'`).join(", ")}));`;
