// حلُّ رمز المريض ⟶ الملفّ الباقي. **المرجع الوحيد** لهذه القراءة.
//
// ══ لماذا موضعٌ واحد ════════════════════════════════════════════════════
// السجلّ يحلّ الرمز، وتلغرام يقرؤه، والمساعد الذكي سيقرؤه لاحقاً. ومنطق
// «الرمز الحالي ثمّ الاسم البديل» لو كُتب في ثلاثة مواضع لانحرف أحدها —
// فيجد موظّفٌ ملفّاً دُمج ولا يجده غيره.
//
// ══ وهو معرّفٌ لا مفتاح ═════════════════════════════════════════════════
// **هذه الوحدة لا تصرّح لأحد بشيء.** تُرجع هويّةً، ثمّ يطبّق المنادي
// حراسته كاملةً: المصادقة، وصلاحية عرض المرضى، وحدود الفرع. ولذلك لا
// نقطةَ REST هنا ولا تصدير عام — من أرادها ناداها من داخل حراسته.
//
// ══ والاسم البديل ═══════════════════════════════════════════════════════
// رمزُ ملفٍّ دُمج يبقى حيّاً يشير إلى الباقي: الورقةُ التي بيد المريض لا
// تموت لأن الإدارة نظّفت تكراراً. والأولوية للرمز الحالي دائماً — فلو
// تعارضا (لا يقع: الرمز مفتاحٌ أوّلي في الجدولين) فالحاضر يسبق الماضي.

import { sql } from "drizzle-orm";
import { db } from "../db";
import { normalizePatientCode } from "@shared/patient_code";
import type { DbTransaction } from "../events/store";

export interface ResolvedPatientCode {
  patientId: number;
  /** الرمز الحالي للملفّ الباقي — لا الذي بحث به المستخدم. */
  patientCode: string;
  branchId: number;
  /** هل وصل إليه عبر رمزٍ قديم (ملفٌّ دُمج). */
  viaAlias: boolean;
}

/**
 * الرمز ⟶ الملفّ. `null` لمدخلٍ ليس رمزاً، أو لرمزٍ لا يشير إلى ملفٍّ قائم.
 *
 * ملفٌّ **حُذف** حذفاً حقيقياً: رمزُه وأسماؤه البديلة تُحذف معه في كاسكيد
 * `deletePatient`، فلا يحلّ شيئاً بعدها. والتسلسل لا يرجع، فلا يُعاد
 * الرمز لمريضٍ آخر أبداً.
 */
export async function resolvePatientByPublicCode(
  input: unknown,
  runner: DbTransaction | typeof db = db,
): Promise<ResolvedPatientCode | null> {
  const code = normalizePatientCode(input);
  if (!code) return null;

  const res = await (runner as any).execute(sql`
    SELECT p.id, p.patient_code, p.branch_id, FALSE AS via_alias
      FROM patients p WHERE p.patient_code = ${code}
    UNION ALL
    SELECT p.id, p.patient_code, p.branch_id, TRUE AS via_alias
      FROM patient_code_aliases a
      JOIN patients p ON p.id = a.patient_id
     WHERE a.code = ${code}
     ORDER BY via_alias
     LIMIT 1
  `);
  const row = (res.rows ?? [])[0] as any;
  if (!row) return null;
  return {
    patientId: Number(row.id),
    patientCode: String(row.patient_code),
    branchId: Number(row.branch_id),
    viaAlias: row.via_alias === true,
  };
}

/**
 * عند الدمج: رمزُ المصدر يصير اسماً بديلاً للهدف، وأسماؤه البديلة تنتقل.
 *
 * **داخل معاملة الدمج نفسها** — فإمّا يبقى الرمزان يحلّان معاً وإمّا لا
 * يتغيّر شيء. والهدف يحتفظ برمزه الأصلي: هو الملفّ الباقي، وتبديل هويّته
 * كان سيقتل ورقةً بيد مريضٍ آخر لإنقاذ ورقة.
 *
 * و ON CONFLICT DO NOTHING احتياطٌ لدمجٍ يُعاد: الرمز موجودٌ سلفاً يشير
 * إلى الهدف نفسه، فلا شيء يُفعَل ولا شيء ينكسر.
 */
export async function aliasCodesOnMerge(
  tx: DbTransaction,
  sourceId: number,
  targetId: number,
): Promise<void> {
  //  ١. أسماء المصدر البديلة تتبع الملفّ الباقي — وإلّا ماتت بحذف صفّه.
  await tx.execute(sql`
    UPDATE patient_code_aliases SET patient_id = ${targetId}
     WHERE patient_id = ${sourceId}
  `);
  //  ٢. ورمزُ المصدر نفسه يصير اسماً بديلاً. يُقرأ من الصفّ لا من المنادي.
  await tx.execute(sql`
    INSERT INTO patient_code_aliases (code, patient_id, reason)
    SELECT p.patient_code, ${targetId}, 'merge'
      FROM patients p
     WHERE p.id = ${sourceId}
       AND p.patient_code IS NOT NULL
    ON CONFLICT (code) DO NOTHING
  `);
}

/** رمزُ مريضٍ بعينه — يُقرأ داخل المعاملة حين تحتاجه رسالةٌ تُستحقّ فيها. */
export async function patientCodeOf(
  patientId: number,
  runner: DbTransaction | typeof db = db,
): Promise<string | null> {
  const res = await (runner as any).execute(sql`
    SELECT patient_code FROM patients WHERE id = ${patientId}
  `);
  const row = (res.rows ?? [])[0] as any;
  return row?.patient_code ? String(row.patient_code) : null;
}

/** رموزُ عدّة مرضى — للردّ على `/id` حين يكون الحساب مربوطاً بأكثر من ملفّ. */
export async function patientCodesFor(
  patientIds: number[],
  runner: DbTransaction | typeof db = db,
): Promise<string[]> {
  if (patientIds.length === 0) return [];
  const res = await (runner as any).execute(sql`
    SELECT patient_code FROM patients
     WHERE id IN (${sql.join(patientIds.map((id) => sql`${id}`), sql`, `)})
     ORDER BY id
  `);
  const seen: string[] = [];
  for (const r of (res.rows ?? []) as any[]) {
    const c = r.patient_code ? String(r.patient_code) : null;
    if (c && !seen.includes(c)) seen.push(c);
  }
  return seen;
}
