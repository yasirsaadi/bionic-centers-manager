// Migration 186: المراجعُ التي قصّها حفظُ نافذة تعديل البروتوكول عند ثلاثين تعود (§4.fp — ٢٠٢٦-١٠-٢٥).
//
// **الواقعة**: أرسل المالكُ صورةَ «تعذّر الحفظ: request entity too large» حين عدّل سليم بروتوكولاً — حدُّ الجسم ١٠٠ كيلوبايت رفض أحدَ عشرَ
// بروتوكولاً مفصَّلاً. **وتحتها ما هو أسوأ**: `normalizeReferences` كان يقصّ المراجعَ إلى ثلاثين بصمت، وسبعةٌ وثلاثون بروتوكولاً فيها أكثرُ
// (حتى ٢٠٢) — فكلُّ حفظٍ نجح على بروتوكولٍ أصغر من الحدّ أضاع مراجعَه بعد الثلاثين، ولا تُعيدها ترحيلاتُ المحتوى (تكتب حيث `updated_by IS NULL`).
//
// **والمحفوظُ في سجلّ التدقيق**: كلُّ تعديلٍ يكتب الصفَّ كلَّه قبله (`old_values`) وبعده (`new_values`). فالحفظُ القاصّ أوّلُ تعديلٍ لبروتوكولٍ
// قبله أكثرُ من ثلاثين مرجعاً وبعده ثلاثون بالضبط — ومراجعُه بعد الثلاثين في `old_values` بترتيبها. **فيعود ذيلُها خلفَ ما في الصفّ الآن**:
// الثلاثون الأولى تبقى كما حفظها المشرفُ (بتعديله إن عدّل)، ولا يُضاف مرجعٌ عنوانُه موجود، **ولا يُمسّ صفٌّ فيه أكثرُ من ثلاثين** — فالتكرارُ
// لا يفعل شيئاً، وما لم يُقصّ (لا تعديلَ، أو تعديلٌ بعد الإصلاح) لا يُمسّ. وسطرُ تدقيقٍ لكلّ بروتوكولٍ عادت مراجعُه.
export const name = "186_physio_protocol_references_restore";
export const sql = `WITH a AS MATERIALIZED (
  SELECT id, entity_id, created_at, old_values, new_values
    FROM audit_log
   WHERE entity_type = 'physio_protocol' AND action = 'update'
     AND old_values LIKE '%"references"%' AND new_values LIKE '%"references"%'
), cut AS (
  SELECT DISTINCT ON (entity_id) entity_id, old_values::jsonb -> 'references' AS full_refs
    FROM a
   WHERE jsonb_typeof(old_values::jsonb -> 'references') = 'array'
     AND jsonb_typeof(new_values::jsonb -> 'references') = 'array'
     AND jsonb_array_length(old_values::jsonb -> 'references') > 30
     AND jsonb_array_length(new_values::jsonb -> 'references') = 30
   ORDER BY entity_id, created_at, id
), restored AS (
  UPDATE physio_protocols p
     SET "references" = p."references" || COALESCE((
           SELECT jsonb_agg(e ORDER BY o)
             FROM jsonb_array_elements(cut.full_refs) WITH ORDINALITY AS t(e, o)
            WHERE o > 30
              AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p."references") x WHERE lower(x->>'title') = lower(e->>'title'))
         ), '[]'::jsonb)
    FROM cut
   WHERE p.id = cut.entity_id
     AND jsonb_array_length(p."references") <= 30
     AND jsonb_array_length(cut.full_refs) > 30
  RETURNING p.id, p.title_ar, jsonb_array_length(p."references") AS n
)
INSERT INTO audit_log (entity_type, entity_id, action, user_name, new_values, notes)
SELECT 'physio_protocol', id, 'update', 'ترحيل ١٨٦', json_build_object('referencesCount', n)::text,
       'عادت المراجعُ التي قصّها حفظٌ سابق عند ثلاثين (§4.fp) — ' || title_ar
  FROM restored;`;
