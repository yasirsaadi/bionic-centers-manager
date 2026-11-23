// **فرعُ القسم الجديد وإتاحةُ الملفّ له** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢).
//
// القسمُ الذي يُفتَح من جلسة فرعٍ لا يقدّمه — علاجٌ طبيعيّ من «بغداد أطراف»، أو أطرافٌ ومساند من «مركز بغداد للعلاج الطبيعي» — يولد في
// **فرع القسم في المدينة نفسِها** (`departmentHomeBranch` في `shared/cross_department_exam.ts`)، ويُتاح له ملفُّ المريض إن لم يصله:
// بلا ذلك لا يراه أخصائيٌّ ولا طبيب (واقعةُ ما بعد الفصل — §4.gq). **والإتاحةُ هنا استثناءٌ مقصود** من «المنحُ للمسؤول وحده» (§4.t) بقرار
// المالك، **محصورٌ بفتح قسمٍ في فرعه** — بسطر تدقيقٍ يقول مَن ولماذا. **ولا يتحرّك شيءٌ آخر**: فرعُ تسجيل المريض والمالُ والزياراتُ
// والأقسامُ القائمة كما هي.
import { sql } from "drizzle-orm";
import { db } from "../db";
import { grantBranchAccessTx } from "./branch_access";
import {
  departmentHomeBranch, branchOffersDepartment, crossExamDepartments, resolveCrossExamTarget, invalidCrossExamTargetMessage,
  CROSS_EXAM_DEPARTMENT_NAMES, type BranchFact, type CrossExamDepartment,
} from "@shared/cross_department_exam";

type Executor = { execute: (q: any) => Promise<any> };

export const isCrossExamDepartment = (v: unknown): v is CrossExamDepartment =>
  v === "physiotherapy" || v === "prosthetic" || v === "medical_support";

/** الفروعُ وتوفّرُ العلاج الطبيعيّ — من القاعدة، في معاملة المنادي إن مُرّرت. */
export async function loadBranchFacts(tx?: Executor): Promise<{ branches: BranchFact[]; physioBranchIds: Set<number> }> {
  const ex = tx ?? (db as unknown as Executor);
  const r = await ex.execute(sql`SELECT id, name, temporarily_closed FROM branches`);
  const branches = ((r.rows ?? []) as any[]).map((b) => ({
    id: Number(b.id), name: String(b.name ?? ""), temporarilyClosed: Boolean(b.temporarily_closed),
  }));
  //  القاعدةُ نفسُها التي يقرؤها `physioOfferingBranchIds` (جهازٌ متوفّر في الفرع) — بلا استيراده، فلا حلقةَ استيرادٍ مع `storage`.
  const physioBranchIds = new Set<number>(((await ex.execute(sql`
    SELECT DISTINCT branch_id FROM physio_device_branches WHERE available = true
  `)).rows ?? []).map((x: any) => Number(x.branch_id)));
  return { branches, physioBranchIds };
}

/** فرعُ القسم لفرع الحركة — أو `null` (لا فرعَ في المدينة). */
export async function departmentHomeFor(tx: Executor | undefined, dept: CrossExamDepartment, actingBranchId: number | null | undefined) {
  const facts = await loadBranchFacts(tx);
  const target = departmentHomeBranch({ dept, actingBranchId, ...facts });
  return { target, name: target === null ? null : facts.branches.find((b) => b.id === target)?.name ?? null };
}

/**
 * **إتاحةُ الملفّ لفرع القسم** — داخل معاملة المنادي. لا شيءَ إن كان فرعَ التسجيل أو مُتاحاً أصلاً؛ وإلّا صفُّ `patient_branch_access`
 * باسم الفاعل وملاحظةٍ تقول السبب، وسطرُ تدقيق (`patient_branch_access` · `create`).
 */
export async function grantDepartmentHomeAccessTx(tx: Executor, p: {
  patientId: number; targetBranchId: number; dept: CrossExamDepartment;
  actor: { userId?: number | null; userName?: string | null }; via: string;
  ipAddress?: string | null; userAgent?: string | null;
}): Promise<boolean> {
  const pr = await tx.execute(sql`SELECT branch_id FROM patients WHERE id = ${p.patientId}`);
  const home = (pr.rows ?? [])[0]?.branch_id;
  if (home == null || Number(home) === Number(p.targetBranchId)) return false;
  const note = `فتح قسم ${CROSS_EXAM_DEPARTMENT_NAMES[p.dept]} من ${p.via} — قرار المالك ٢٠٢٦-١١-٢٢ (§4.gv)`;
  const g = await grantBranchAccessTx(tx, {
    patientId: p.patientId, branchId: p.targetBranchId, homeBranchId: Number(home),
    grantedByUserId: p.actor.userId ?? null, grantedByName: p.actor.userName ?? null, note,
  });
  if (!g.created) return false;
  await tx.execute(sql`
    INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id, new_values, ip_address, user_agent, notes)
    VALUES ('patient_branch_access', ${p.patientId}, 'create', ${p.actor.userId ?? null}, ${p.actor.userName ?? null}, ${p.targetBranchId},
            ${JSON.stringify({ accessId: g.id, branchId: p.targetBranchId, department: p.dept })}, ${p.ipAddress ?? null}, ${p.userAgent ?? null},
            ${`إتاحة ملف المريض #${p.patientId} للفرع #${p.targetBranchId} تلقائياً — ${note}`})
  `);
  return true;
}

/**
 * **القسمُ الجديد يذهب إلى فرعه** (§4.gv د): يُنادى قبل إنشاء قسمٍ **غائب** من فرع حركةٍ لا يقدّمه — فيُعيد فرعَ القسم ويُتيح له الملفّ؛
 * والقسمُ القائم (ولو مغلقاً) لا يتحرّك، والفرعُ الذي يقدّمه يبقى، ولا فرعَ في المدينة ⟵ فرعُ الحركة كما كان (لا يُمنع شيء).
 */
export async function routeNewCaseBranchTx(tx: Executor, p: {
  patientId: number; caseType: string; actingBranchId: number | null;
  actor: { userId?: number | null; userName?: string | null }; via: string;
}): Promise<{ branchId: number | null; moved: boolean; granted: boolean }> {
  const keep = { branchId: p.actingBranchId, moved: false, granted: false };
  if (p.actingBranchId == null || !isCrossExamDepartment(p.caseType)) return keep;
  const ex = await tx.execute(sql`
    SELECT 1 FROM patient_cases WHERE patient_id = ${p.patientId} AND case_type = ${p.caseType} LIMIT 1
  `);
  if ((ex.rows ?? []).length > 0) return keep;
  const { target } = await departmentHomeFor(tx, p.caseType, p.actingBranchId);
  if (target === null || target === Number(p.actingBranchId)) return keep;
  const granted = await grantDepartmentHomeAccessTx(tx, {
    patientId: p.patientId, targetBranchId: target, dept: p.caseType, actor: p.actor, via: p.via,
  });
  return { branchId: target, moved: true, granted };
}

/** نطاقُ المنادي مع فرع القسم — ليُحسَم فرعُ الطلب إليه (`resolveActingBranchId` يشترط النطاق). والمسؤولُ بلا قيد. */
export function scopeWith(scope: number[] | null, branchId: number | null): number[] | null {
  if (scope === null || branchId === null) return scope;
  return scope.includes(branchId) ? scope : [...scope, branchId];
}

// ══ **أيُفتَح القسمُ من «سبب الحضور»؟** (§4.gv) — قاعدةٌ واحدة يقرؤها البابُ قبل المعاملة **وبعد قفل ٩١٩ داخلها** ═══════════════════
//  فنقرتان معاً (أو موظّفان) لا تفتحان القسمَ مرّتين ولا القسمين الجهازيّين معاً: الثانيةُ تنتظر القفل ثمّ تقرأ ما كتبته الأولى فتُردّ.

/** رفضُ فتح القسم — يُرمى داخل المعاملة فتتراجع كلُّها، ويُردّ بحالته ورمزه. */
export class OpenDepartmentError extends Error {
  constructor(message: string, readonly status: number, readonly code: string) {
    super(message);
    this.name = "OpenDepartmentError";
  }
}

export type OpenDepartmentState =
  | { ok: false; error: OpenDepartmentError }
  /** `closedCase`: قسمٌ مغلق من هذا النوع وعلمُه منزَّل (تغييرُ نوعٍ أو صفٌّ قديم) — يُعاد فتحه **في فرعه** لا في فرعٍ آخر. */
  | { ok: true; closedCase: { id: number; branchId: number | null } | null };

export async function openDepartmentState(ex: Executor, patientId: number, dept: CrossExamDepartment): Promise<OpenDepartmentState> {
  const [p] = ((await ex.execute(sql`
    SELECT is_amputee, is_medical_support, is_physiotherapy FROM patients WHERE id = ${patientId}
  `)).rows ?? []) as any[];
  if (!p) return { ok: false, error: new OpenDepartmentError("المريض غير موجود", 404, "patient_not_found") };
  const flags = { isAmputee: Boolean(p.is_amputee), isMedicalSupport: Boolean(p.is_medical_support), isPhysiotherapy: Boolean(p.is_physiotherapy) };
  const cases = ((await ex.execute(sql`
    SELECT id, branch_id, status FROM patient_cases WHERE patient_id = ${patientId} AND case_type = ${dept} ORDER BY id DESC
  `)).rows ?? []) as any[];
  const flag = dept === "prosthetic" ? flags.isAmputee : dept === "medical_support" ? flags.isMedicalSupport : flags.isPhysiotherapy;
  if (flag || cases.some((c) => String(c.status) === "active")) {
    return { ok: false, error: new OpenDepartmentError(
      `للمريض قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} أصلاً — أرسله من «طلب معاينة جديدة» في ملفّه`, 409, "department_already_open",
    ) };
  }
  if (!crossExamDepartments(flags).includes(dept)) {
    const both = flags.isPhysiotherapy && (flags.isAmputee || flags.isMedicalSupport);
    return { ok: false, error: both
      ? new OpenDepartmentError("للمريض علاجٌ طبيعيّ وقسمُ جهاز — لا يُفتح له قسمٌ آخر من «سبب الحضور»", 409, "cross_department_has_both")
      : new OpenDepartmentError(
        "يُفتح من «سبب الحضور» العلاجُ الطبيعيّ لمريض الأطراف أو المساند، والأطرافُ والمساند لمريض العلاج الطبيعيّ وحده", 400, "cross_department_not_allowed",
      ) };
  }
  const closed = cases[0];
  return { ok: true, closedCase: closed ? { id: Number(closed.id), branchId: closed.branch_id == null ? null : Number(closed.branch_id) } : null };
}

/**
 * **فرعُ فتح القسم** — القسمُ المغلقُ يُعاد في فرعه إن كان يقدّمه (فالطلبُ والجهازُ معه، لا قسمٌ في فرعٍ وطلبُه في آخر)، وإلّا رُدّ: لا يُنقل
 * قسمٌ قائم؛ **والفرعُ المختارُ غيرُه يُردّ باسم فرعه** فيختاره الموظّف. ولا قسمَ ⟵ **الفرعُ الذي اختاره الاستعلامات** إن قدّم القسمَ وكان
 * مفتوحاً (طلبُ المالك ٢٠٢٦-١١-٢٣ — وإلّا ٤٠٠)، وبلا اختيارٍ فرعُ القسم في مدينة فرع الحركة (`departmentHomeBranch`)، و`null` ⟵ لا فرعَ.
 */
export async function openDepartmentTarget(
  ex: Executor | undefined, dept: CrossExamDepartment, actingBranchId: number | null, closedCase: { branchId: number | null } | null,
  chosenBranchId: number | null = null,
): Promise<{ target: number | null; name: string | null; error?: OpenDepartmentError }> {
  const facts = await loadBranchFacts(ex);
  const nameOf = (id: number | null) => (id === null ? null : facts.branches.find((x) => x.id === id)?.name ?? null);
  if (!closedCase) {
    const r = resolveCrossExamTarget({ dept, actingBranchId, chosenBranchId, ...facts });
    if (r.invalid) {
      return { target: null, name: null, error: new OpenDepartmentError(invalidCrossExamTargetMessage(dept), 400, "cross_exam_target_invalid") };
    }
    return { target: r.target, name: nameOf(r.target) };
  }
  const b = closedCase.branchId == null ? null : facts.branches.find((x) => x.id === closedCase.branchId) ?? null;
  if (!b || !branchOffersDepartment(b, dept, facts.physioBranchIds)) {
    return { target: null, name: null, error: new OpenDepartmentError(
      `للمريض قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} مغلق في ${b?.name ?? "فرعٍ آخر"} لا يقدّمه — لا يُفتح من «سبب الحضور»؛ راجع المسؤول`,
      409, "department_closed_elsewhere",
    ) };
  }
  if (chosenBranchId != null && Number(chosenBranchId) !== b.id) {
    return { target: null, name: null, error: new OpenDepartmentError(
      `للمريض قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} مغلق في ${b.name} — يُعاد فتحه فيه؛ اختر «${b.name}»`,
      409, "department_closed_in_branch",
    ) };
  }
  return { target: b.id, name: b.name };
}
