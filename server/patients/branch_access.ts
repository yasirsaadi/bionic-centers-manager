// **مَن يصل هذا الملفّ، وإلى أيّ فرعٍ تُنسَب حركتُه الجديدة.**
//
// ══ بديلُ «نقل المريض» (ترحيل ٠٨٠) ═══════════════════════════════════════
// `transferPatientToBranch` كان يعيد كتابة فرع المريض وزياراته ودفعاته
// وحالاته **كلِّها**. فمالُ كربلاء يصير مالَ ذي قار بأثرٍ رجعيّ، وتقريرُ
// كربلاء عن أمسٍ مضى يتغيّر اليوم. **والقرار: لا نقلَ — إتاحةٌ فقط.**
//
//   • `patients.branch_id` **فرعُ التسجيل**، لا يتغيّر أبداً.
//   • كلُّ صفٍّ تاريخيّ (دفعة · زيارة · قيدُ كلفة · حلقة · أمرُ عمل) يبقى
//     بفرعه الذي وقع فيه.
//   • `patient_branch_access` يقول **مَن يرى الملفَّ أيضاً** — كاملاً، في
//     الأطراف والمساند والعلاج الطبيعي بلا تفرقة.
//   • وكلُّ حركةٍ جديدة تُنسَب **للفرع الذي حدثت فيه** (`resolveActingBranchId`).
//
// ══ تعريفٌ واحد لا يتكرّر ════════════════════════════════════════════════
// كلُّ قارئٍ وكلُّ حارسٍ يستورد من هنا. ولا يُكتب `allowed.includes(patient
// .branchId)` في أيّ مكانٍ بعد اليوم: تلك تقرأ فرعَ التسجيل وحده، فتحجب
// الفرعَ المُتاحَ له عن ملفٍّ مُنح حقَّ رؤيته صراحةً.

import { sql } from "drizzle-orm";
import { db } from "../db";

export interface BranchAccessRow {
  id: number;
  branchId: number;
  branchName: string | null;
  grantedByUserId: number | null;
  grantedByName: string | null;
  note: string | null;
  grantedAt: string | null;
}

type Executor = { execute: (q: any) => Promise<any> };

const exec = (tx?: Executor): Executor => tx ?? (db as unknown as Executor);

/** الفروعُ الإضافية المُتاحُ لها هذا الملفّ — **بلا** فرع التسجيل. */
export async function sharedBranchIdsOf(
  patientId: number, tx?: Executor,
): Promise<number[]> {
  const r = await exec(tx).execute(sql`
    SELECT branch_id FROM patient_branch_access
     WHERE patient_id = ${patientId}
     ORDER BY branch_id
  `);
  return (r.rows ?? []).map((x: any) => Number(x.branch_id));
}

/** الصفوفُ كاملةً للعرض — مَن منح ومتى ولماذا. */
export async function listPatientBranchAccess(
  patientId: number, tx?: Executor,
): Promise<BranchAccessRow[]> {
  const r = await exec(tx).execute(sql`
    SELECT a.id, a.branch_id, b.name AS branch_name, a.granted_by_user_id,
           a.granted_by_name, a.note, a.granted_at
      FROM patient_branch_access a
      LEFT JOIN branches b ON b.id = a.branch_id
     WHERE a.patient_id = ${patientId}
     ORDER BY a.granted_at ASC, a.id ASC
  `);
  return (r.rows ?? []).map((x: any) => ({
    id: Number(x.id),
    branchId: Number(x.branch_id),
    branchName: x.branch_name ?? null,
    grantedByUserId: x.granted_by_user_id === null || x.granted_by_user_id === undefined
      ? null : Number(x.granted_by_user_id),
    grantedByName: x.granted_by_name ?? null,
    note: x.note ?? null,
    grantedAt: x.granted_at ?? null,
  }));
}

/**
 * **كلُّ فرعٍ يصل هذا الملفّ** — فرعُ التسجيل أوّلاً ثمّ المُتاحُ لها.
 * فرعُ تسجيلٍ `null` (صفٌّ قديمٌ نادر) لا يُخترَع له رقم.
 */
export async function patientBranchIdsOf(
  patient: { id: number; branchId: number | null }, tx?: Executor,
): Promise<number[]> {
  const shared = await sharedBranchIdsOf(patient.id, tx);
  const home = patient.branchId;
  return home === null || home === undefined
    ? shared : [Number(home), ...shared.filter((b) => b !== Number(home))];
}

/**
 * **هل يصل صاحبُ هذا النطاق الملفَّ؟** `scope === null` مسؤولٌ عامّ ⟶ نعم.
 *
 * ولا يُقاس بفرع التسجيل وحده: مريضُ كربلاء المُتاحُ لذي قار يصله موظّفُ
 * ذي قار بحكم الإتاحة، وحسابُ كربلاء لا يتغيّر بذلك بحرف.
 */
export function scopeReachesPatientBranches(
  scope: number[] | null, patientBranchIds: number[],
): boolean {
  if (scope === null) return true;
  if (scope.length === 0 || patientBranchIds.length === 0) return false;
  return patientBranchIds.some((b) => scope.includes(b));
}

/** الشكلُ المختصر: يقرأ الإتاحةَ بنفسه. */
export async function scopeReachesPatient(
  scope: number[] | null,
  patient: { id: number; branchId: number | null },
  tx?: Executor,
): Promise<boolean> {
  if (scope === null) return true;
  if (scope.length === 0) return false;
  //  فرعُ التسجيل يُفحَص أوّلاً بلا استعلام — وهو الحالةُ الغالبة العظمى.
  if (patient.branchId !== null && patient.branchId !== undefined
      && scope.includes(Number(patient.branchId))) return true;
  const shared = await sharedBranchIdsOf(patient.id, tx);
  return shared.some((b) => scope.includes(b));
}

/**
 * **شرطُ SQL للقوائم** — يُستعمَل على جدول `patients` باسمه الحقيقيّ.
 * `scope === null` ⟶ `TRUE` (مسؤولٌ عامّ).
 */
export function patientVisibleToScopeSql(scope: number[] | null, table = "patients") {
  if (scope === null) return sql`TRUE`;
  if (scope.length === 0) return sql`FALSE`;
  const list = sql.join(scope.map((b) => sql`${b}`), sql`, `);
  const t = sql.raw(table);
  return sql`(
    ${t}.branch_id IN (${list})
    OR EXISTS (
      SELECT 1 FROM patient_branch_access pba
       WHERE pba.patient_id = ${t}.id AND pba.branch_id IN (${list})
    )
  )`;
}

/**
 * **يرى الفرعُ هذا الصفَّ؟** — فرعُ الصفّ في نطاقه، **أو** الفرعُ يصل ملفَّ
 * المريض (فرعُ تسجيله أو إتاحةٌ صريحة، ترحيل ٠٨٠).
 *
 * ══ لماذا اتّحادٌ لا استبدال ═══════════════════════════════════════════════
 * الإتاحةُ **وصولٌ كامل**: مَن أُتيح له الملفُّ يرى عملَ صاحبه كما يراه فرعُ
 * تسجيله تماماً — وإلّا ظهر المريضُ في سجلّه ولم تظهر عمليتُه في لوحة عمله.
 * وشرطُ فرع الصفّ يبقى **إلى جانبه لا مكانَه**: صفٌّ في فرعي يبقى لي ولو
 * سُحبت الإتاحةُ عن ملفّه، أو كان فرعُ تسجيل صاحبه `NULL` (صفٌّ قديم نادر).
 * فالشرطُ **أوسعُ دائماً**، ولا يُخفي ما كان ظاهراً.
 *
 * **ولا تُنسَب به حركةٌ لفرعٍ لم تقع فيه**: هذا شرطُ **قراءة** وحده —
 * والنسبةُ تبقى لـ`resolveActingBranchId` بحرفها، فالمالُ والتقاريرُ لكلّ
 * فرعٍ كما هي.
 *
 * @param rowBranchCol عمودُ فرع الصفّ كما يُكتب في SQL (`"w.branch_id"`)، أو
 *   `null` حين لا فرعَ للصفّ فيُقاس بالمريض وحده.
 * @param patientIdCol عمودُ رقم المريض في الصفّ (`"w.patient_id"`).
 */
export function branchOrPatientAccessSql(
  scope: number[] | null,
  rowBranchCol: string | null,
  patientIdCol: string,
) {
  if (scope === null) return sql`TRUE`;
  if (scope.length === 0) return sql`FALSE`;
  const list = sql.join(scope.map((b) => sql`${b}`), sql`, `);
  //  `EXISTS` على المفتاح الأساسيّ — فلا يلزم ضمُّ جدول المرضى في كلّ قارئ.
  const reaches = sql`EXISTS (
    SELECT 1 FROM patients pv
     WHERE pv.id = ${sql.raw(patientIdCol)}
       AND (pv.branch_id IN (${list})
            OR EXISTS (SELECT 1 FROM patient_branch_access pba2
                        WHERE pba2.patient_id = pv.id AND pba2.branch_id IN (${list})))
  )`;
  if (rowBranchCol === null) return reaches;
  return sql`(${sql.raw(rowBranchCol)} IN (${list}) OR ${reaches})`;
}

/**
 * **الفرعُ الذي تُنسَب إليه حركةٌ جديدة** — «الفرع الذي حدثت فيه».
 *
 * ══ القاعدة ══════════════════════════════════════════════════════════════
 *  • موظّفُ فرعٍ (جلستُه على فرعٍ بعينه يصل هذا الملفّ) ⟶ **فرعُه هو**.
 *    فدفعةُ ذي قار تُقيَّد في ذي قار ولو كان الملفُّ مسجَّلاً في كربلاء.
 *  • فرعُ الجلسة لا يصل الملفَّ (أو لا فرعَ للجلسة — مسؤولٌ عامّ) ⟶ **فرعُ
 *    التسجيل**، وهو السلوكُ القائم قبل هذه المرحلة بحرفه.
 *  • وفرعٌ مطلوبٌ صراحةً (`requestedBranchId`) يُقبل **فقط** إن كان يصل
 *    الملفَّ **وفي نطاق الفاعل** — وإلّا يُتجاهَل. رقمٌ من جسم الطلب ليس
 *    سلطةً بحال.
 *
 * **ولا تُرجع `null` أبداً حين يوجد فرعُ تسجيل** — الحركةُ بلا فرعٍ لا مكانَ
 * لها في أيّ تقرير.
 */
export function resolveActingBranchId(params: {
  /** نطاقُ الفاعل: `null` مسؤولٌ عامّ. */
  scope: number[] | null;
  /** فرعُ جلسة الفاعل — `null`/`0` لمن لا فرعَ له. */
  sessionBranchId: number | null | undefined;
  /** فرعُ تسجيل المريض. */
  homeBranchId: number | null;
  /** كلُّ فرعٍ يصل الملفّ (من `patientBranchIdsOf`). */
  patientBranchIds: number[];
  /** فرعٌ اختاره الفاعلُ صراحةً — يُفحَص ولا يُصدَّق. */
  requestedBranchId?: number | null;
}): number | null {
  const { scope, patientBranchIds } = params;
  const home = params.homeBranchId === null || params.homeBranchId === undefined
    ? null : Number(params.homeBranchId);
  const inScope = (b: number) => scope === null || scope.includes(b);
  const reaches = (b: number) => patientBranchIds.includes(b);

  const asked = params.requestedBranchId === null || params.requestedBranchId === undefined
    ? null : Number(params.requestedBranchId);
  if (asked !== null && Number.isFinite(asked) && reaches(asked) && inScope(asked)) {
    return asked;
  }

  const session = params.sessionBranchId === null || params.sessionBranchId === undefined
    ? null : Number(params.sessionBranchId);
  if (session !== null && Number.isFinite(session) && session > 0
      && reaches(session) && inScope(session)) {
    return session;
  }

  return home;
}

// ── الكتابة ───────────────────────────────────────────────────────────────

export class BranchAccessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "BranchAccessError";
    this.status = status;
  }
}

export const HOME_BRANCH_GRANT_ERROR =
  "هذا هو فرع تسجيل المريض أصلاً — لا حاجة لإتاحته له";

/**
 * **منحُ فرعٍ إضافيّ حقَّ الوصول.** يُنادى داخل معاملة المُستدعي.
 *
 * ولا يُنشئ صفّاً ثانياً للفرع نفسِه (`ON CONFLICT DO NOTHING` فوق الفهرس
 * الفريد) — فضغطتان متزامنتان تُنتجان إتاحةً واحدة.
 */
export async function grantBranchAccessTx(
  tx: Executor,
  params: {
    patientId: number;
    branchId: number;
    homeBranchId: number | null;
    grantedByUserId: number | null;
    grantedByName: string | null;
    note?: string | null;
  },
): Promise<{ created: boolean; id: number | null }> {
  if (params.homeBranchId !== null && Number(params.homeBranchId) === Number(params.branchId)) {
    throw new BranchAccessError(HOME_BRANCH_GRANT_ERROR, 400);
  }
  const r = await tx.execute(sql`
    INSERT INTO patient_branch_access
      (patient_id, branch_id, granted_by_user_id, granted_by_name, note)
    VALUES (${params.patientId}, ${params.branchId}, ${params.grantedByUserId},
            ${params.grantedByName}, ${params.note ?? null})
    ON CONFLICT (patient_id, branch_id) DO NOTHING
    RETURNING id
  `);
  const row = (r.rows ?? [])[0];
  return { created: Boolean(row), id: row ? Number(row.id) : null };
}

/** **سحبُ الإتاحة.** لا يمسّ صفّاً تاريخياً واحداً — الرؤيةُ وحدها تتغيّر. */
export async function revokeBranchAccessTx(
  tx: Executor, params: { patientId: number; branchId: number },
): Promise<boolean> {
  const r = await tx.execute(sql`
    DELETE FROM patient_branch_access
     WHERE patient_id = ${params.patientId} AND branch_id = ${params.branchId}
    RETURNING id
  `);
  return (r.rows ?? []).length > 0;
}
