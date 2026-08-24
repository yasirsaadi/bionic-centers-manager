// **ما هو المريضُ «الفعّال»؟** — تعريفٌ واحد لا يتكرّر.
//
// ══ لماذا ملفٌّ لتعريفٍ واحد ═══════════════════════════════════════════
// سلّةُ المحذوفات (ترحيل ٠٦٨) تضيف سؤالاً يجب أن يُطرَح في **عشراتِ
// المواضع** عبر عشرين ملفّاً: أهذا الملفُّ ما زال في النظام الفعّال؟ ولو
// كُتب الشرطُ في كلّ موضعٍ بيده لانحرف أحدُها يوماً — يُنسى في طابور
// الطبيب، أو يُكتب `IS NULL` هنا و`deleted_at IS NOT NULL` هناك بدلالةٍ
// مقلوبة، فيظهر المحذوفُ في شاشةٍ واحدة ويختفي من البقيّة.
//
// وانحرافُ **هذا** الشرط بعينه له وجهان خطران: مريضٌ محذوفٌ يظهر في
// طابورٍ فيُعمَل عليه، أو مالُه يبقى في المجاميع فيقرأ المالكُ ديناً على
// ملفٍّ أخرجه بنفسه.
//
// فالتعريفُ هنا، ويُستورَد. **والقاعدةُ نصّاً واحداً**: مريضٌ فعّال =
// صفٌّ في `patients` بـ`deleted_at IS NULL`.
//
// ══ وما لا يشمله ═══════════════════════════════════════════════════════
// **السلّةُ نفسُها** تقرأ العكسَ عمداً (`deleted_at IS NOT NULL`)، وكذلك
// الاستعادةُ والحذفُ النهائيّ ونسخةُ التدقيق. فهذه الشروطُ تُضاف إلى
// القرّاء **التشغيليّين** وحدهم، لا إلى كلّ استعلامٍ يلمس الجدول.
//
// ولا صفَّ تابعاً يُصفّى بحالة أبيه: الدفعاتُ والزياراتُ وقيودُ الكلف
// تُصفّى **بانضمامها إلى `patients`** أو بمجموعةِ معرّفاتٍ مشتقّةٍ منها.
// فلا نسخةَ ثانية من حالة الحذف تنتشر في الجداول ثمّ تنحرف.

import { sql, isNull, type SQL } from "drizzle-orm";
import { db } from "../db";
import { patients } from "@shared/schema";

/**
 * شرطُ SQL الخام: «هذا المريضُ فعّال».
 *
 * `alias` اسمُ جدول المرضى في الاستعلام (`p`، `pat`، `patients`…).
 * يُكتب مرّةً ويُقرأ في كلّ مكان بالمعنى نفسه.
 */
export const activePatientSql = (alias: string): SQL =>
  sql`${sql.raw(alias)}.deleted_at IS NULL`;

/** ونظيرُه لاستعلامات Drizzle المبنيّة بالكائنات. */
export const activePatientDrizzle = () => isNull(patients.deletedAt);

/**
 * **شرطٌ على جدولٍ تابع**: صفُّه يخصّ مريضاً فعّالاً.
 *
 * `alias` اسمُ الجدول التابع، و`column` عمودُ المريض فيه (`patient_id`
 * غالباً). يُستعمَل حين لا ينضمّ الاستعلامُ إلى `patients` أصلاً — فيُضاف
 * الشرطُ بلا إعادةِ كتابةِ الاستعلام.
 */
export const belongsToActivePatientSql = (alias: string, column = "patient_id"): SQL =>
  sql`EXISTS (
    SELECT 1 FROM patients ap
     WHERE ap.id = ${sql.raw(alias)}.${sql.raw(column)}
       AND ap.deleted_at IS NULL
  )`;

/** هل هذا الملفُّ بعينه في السلّة؟ — للحُرّاس التي تفحص صفّاً واحداً. */
export async function isPatientInTrash(patientId: number, tx?: any): Promise<boolean> {
  const r = await (tx ?? db).execute(sql`
    SELECT 1 FROM patients WHERE id = ${patientId} AND deleted_at IS NOT NULL LIMIT 1
  `);
  return (r.rows ?? []).length > 0;
}

/** أرقامُ المحذوفين من مجموعة — لتصفيةِ قائمةٍ بلا استعلامٍ لكلّ صفّ. */
export async function trashedPatientIds(ids: number[], tx?: any): Promise<Set<number>> {
  if (ids.length === 0) return new Set();
  const r = await (tx ?? db).execute(sql`
    SELECT id FROM patients
     WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})
       AND deleted_at IS NOT NULL
  `);
  return new Set((r.rows ?? []).map((x: any) => Number(x.id)));
}
