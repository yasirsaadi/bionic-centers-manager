// **ما هي المعاينةُ «الفعّالة»؟** — تعريفٌ واحد لا يتكرّر.
//
// ══ لماذا ملفٌّ لتعريفٍ واحد ═══════════════════════════════════════════
// إلغاءُ المعاينة (ترحيل ٠٦١) يضيف سؤالاً يجب أن يُطرَح في **عشرين موضعاً**
// عبر خمسة ملفّات: هل هذه المعاينة ما زالت سلطةً سريرية؟ ولو كُتب الشرطُ
// في كلّ موضعٍ بيده لانحرف أحدُها يوماً — يُنسى في بوّابةِ التصنيع، أو
// يُكتب `IS NULL` في موضعٍ و`NOT EXISTS` في آخر بدلالةٍ مختلفة.
//
// وانحرافُ **هذا** الشرط بعينه خطير: معاينةٌ ملغاة تمرّ من بوّابةٍ منسيّة
// تعني جهازاً يُصنَّع على مواصفاتِ مريضٍ آخر.
//
// فالتعريفُ هنا، ويُستورَد. **والقاعدةُ نصّاً واحداً**: معاينةٌ فعّالة =
// صفٌّ في `medical_exams` **لا شاهدةَ إلغاءٍ له**.
//
// ══ وما لا يشمله ═══════════════════════════════════════════════════════
// **القراءةُ التدقيقية تبقى كاملة**: مَن يسأل «ماذا وقّع هذا الطبيب» أو
// «ما تاريخُ هذا الملفّ» يرى الملغاةَ أيضاً — الإلغاءُ يرفع السلطةَ
// التشغيلية ولا يمحو الشهادة. فهذه الشروطُ تُضاف إلى القرّاء
// **التشغيليّين** وحدهم، لا إلى كلّ استعلامٍ يلمس الجدول.

import { sql, notExists, eq, type SQL } from "drizzle-orm";
import { db } from "../db";
import { medicalExamCancellations as CANCEL, medicalExams as EX } from "@shared/schema";

/**
 * شرطُ SQL الخام: «هذه المعاينةُ فعّالة».
 *
 * `alias` اسمُ جدول المعاينات في الاستعلام (`me`، `m2`، `medical_exams`…).
 * يُكتب مرّةً ويُقرأ في كلّ مكان بالمعنى نفسه.
 */
export const activeExamSql = (alias: string): SQL =>
  sql`NOT EXISTS (
    SELECT 1 FROM medical_exam_cancellations mec
     WHERE mec.exam_id = ${sql.raw(alias)}.id
  )`;

/** ونظيرُه لاستعلامات Drizzle المبنيّة بالكائنات. */
export const activeExamDrizzle = () =>
  notExists(
    db.select({ one: sql`1` }).from(CANCEL).where(eq(CANCEL.examId, EX.id)),
  );

/** هل هذه المعاينةُ بعينها ملغاة؟ — للحُرّاس التي تفحص صفّاً واحداً. */
export async function isExamCancelled(examId: number, tx?: any): Promise<boolean> {
  const r = await (tx ?? db).execute(sql`
    SELECT 1 FROM medical_exam_cancellations WHERE exam_id = ${examId} LIMIT 1
  `);
  return (r.rows ?? []).length > 0;
}

/** أرقامُ الملغاة من مجموعةٍ — لتوسيم القائمة بلا استعلامٍ لكلّ صفّ. */
export async function cancelledExamIds(examIds: number[]): Promise<Set<number>> {
  if (examIds.length === 0) return new Set();
  const r = await db.execute<{ exam_id: number }>(sql`
    SELECT exam_id FROM medical_exam_cancellations
     WHERE exam_id IN (${sql.join(examIds.map((i) => sql`${i}`), sql`, `)})
  `);
  return new Set((r.rows ?? []).map((x) => Number(x.exam_id)));
}
