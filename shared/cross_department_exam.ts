// **فتحُ القسم الآخر من «ما سبب حضور المريض اليوم؟»** (§4.gv — قرارُ المالك ٢٠٢٦-١١-٢٢). منطقٌ خالص يقرؤه الخادمُ والشاشة.
//
// المالك: «الأفضل أن تضع في ما سبب حضور المريض اليوم: إذا كان أطراف فأضف معاينة علاج طبيعي، وإن كان علاج طبيعي فأضف معاينة أطراف
// ومساند، وإن كان لديه الاثنان فلا يظهر شيء. عمّم ذلك لكلّ الفروع».
//
// والواقعةُ التي دفعت إليه (بعد فصل بغداد — §4.gq): مريضُ أطراف «بغداد أطراف» يأتي للعلاج الطبيعيّ، فيفتح له الاستقبالُ قسمَه من جلسة
// الفرع ١ — فيولد القسمُ في الفرع ١ الذي لا أخصائيَّ فيه، ولا يراه أحد. فالقسمُ الجديد يذهب إلى **فرعِ القسم في المدينة نفسِها**
// (`departmentHomeBranch`) — المركزُ للعلاج الطبيعيّ، و«بغداد أطراف» للأجهزة — والفرعُ النشط إن كان يقدّمه.
import { cityForBranchName } from "./weather";
import { isPhysioCenterName } from "./cash_book";
import { sortBranchesForDisplay } from "./branch_order";

export type CrossExamDepartment = "physiotherapy" | "prosthetic" | "medical_support";

/** نصُّ الخيار في «سبب الحضور» — بحرف قرار المالك. */
export const CROSS_EXAM_LABELS: Record<CrossExamDepartment, string> = {
  physiotherapy: "معاينة علاج طبيعي",
  prosthetic: "معاينة أطراف صناعية",
  medical_support: "معاينة مساند طبية",
};

/** اسمُ القسم في رسائل الخادم. */
export const CROSS_EXAM_DEPARTMENT_NAMES: Record<CrossExamDepartment, string> = {
  physiotherapy: "العلاج الطبيعي",
  prosthetic: "الأطراف الصناعية",
  medical_support: "المساند الطبية",
};

/**
 * **القاعدةُ بحرف المالك**: قسمُ جهازٍ (أطراف أو مساند) بلا علاجٍ طبيعيّ ⟵ «معاينة علاج طبيعي»؛ علاجٌ طبيعيّ وحده ⟵ «معاينة أطراف
 * صناعية» و«معاينة مساند طبية»؛ والاثنان معاً ⟵ لا شيء. **ولا تحويلَ بين الأطراف والمساند من هنا** — ليس ممّا قرّره (وكتحويل §4.gu).
 */
export function crossExamDepartments(p: {
  isAmputee?: boolean | null; isMedicalSupport?: boolean | null; isPhysiotherapy?: boolean | null;
}): CrossExamDepartment[] {
  const device = Boolean(p.isAmputee) || Boolean(p.isMedicalSupport);
  const physio = Boolean(p.isPhysiotherapy);
  if (device && !physio) return ["physiotherapy"];
  if (physio && !device) return ["prosthetic", "medical_support"];
  return [];
}

export interface BranchFact { id: number; name: string; temporarilyClosed?: boolean | null }

/**
 * **أيقدّم الفرعُ هذا القسم؟** العلاجُ الطبيعيّ: في فروعه (`physioOfferingBranchIds` — توفّرُ أجهزته) وغيرُ مغلقٍ مؤقتاً. الأطرافُ والمساند:
 * كلُّ فرعٍ مفتوح إلّا مركزَ العلاج الطبيعيّ المستقلّ (`isPhysioCenterName` — قاعدةُ الدفتر نفسُها).
 */
export function branchOffersDepartment(b: BranchFact, dept: CrossExamDepartment, physioBranchIds: ReadonlySet<number>): boolean {
  if (b.temporarilyClosed) return false;
  if (dept === "physiotherapy") return physioBranchIds.has(Number(b.id));
  return !isPhysioCenterName(b.name);
}

/**
 * **الفرعُ الذي يُفتَح فيه القسم** — الفرعُ النشط إن كان يقدّمه؛ وإلّا **الفرعُ المفتوح الوحيد في مدينته** (`cityForBranchName`) الذي
 * يقدّمه؛ وإلّا `null`: لا فرعَ في المدينة (كربلاء والموصل بلا علاجٍ طبيعيّ)، أو أكثرُ من فرعٍ فلا يُخمَّن واحد، أو مدينةٌ لا تُعرف.
 */
export function departmentHomeBranch(p: {
  dept: CrossExamDepartment;
  actingBranchId: number | null | undefined;
  branches: readonly BranchFact[];
  physioBranchIds: ReadonlySet<number>;
}): number | null {
  const acting = p.actingBranchId == null ? null : p.branches.find((b) => Number(b.id) === Number(p.actingBranchId)) ?? null;
  if (!acting) return null;
  if (branchOffersDepartment(acting, p.dept, p.physioBranchIds)) return Number(acting.id);
  const city = cityForBranchName(acting.name);
  if (!city) return null;
  const same = p.branches.filter((b) => Number(b.id) !== Number(acting.id)
    && cityForBranchName(b.name)?.key === city.key && branchOffersDepartment(b, p.dept, p.physioBranchIds));
  return same.length === 1 ? Number(same[0].id) : null;
}

// ══ **الاستعلاماتُ يختار الفرعَ المحوَّل إليه** (طلبُ المالك ٢٠٢٦-١١-٢٣) ══════════════════════════════════════════════════
//  «الميزة … لم تظهر عند كربلاء والموصل … هل ممكن إظهارها لهم مع البقية وجعل إمكانية التحويل باختيار الفرع الذي سيحول له من موظف
//  الاستعلامات». فالخيارُ يظهر ما دام فرعٌ مفتوح يقدّم القسم (`crossExamTargetOptions`)، والموظّفُ يختار منها في الورقة، والمختارُ
//  مسبقاً فرعُ المدينة (`departmentHomeBranch`) — فلا يتغيّر شيءٌ على من لم يغيّره؛ وبلا فرعٍ في المدينة (كربلاء والموصل) يُختار قبل الإرسال.

/** الفروعُ التي يُرسَل إليها القسم — المفتوحةُ التي تقدّمه، بترتيب العرض الواحد. */
export function crossExamTargetOptions<T extends BranchFact>(p: {
  dept: CrossExamDepartment; branches: readonly T[]; physioBranchIds: ReadonlySet<number>;
}): T[] {
  return sortBranchesForDisplay(p.branches.filter((b) => branchOffersDepartment(b, p.dept, p.physioBranchIds)));
}

/**
 * **فرعُ الإرسال** — المختارُ إن قدّم القسمَ وكان مفتوحاً (وإلّا `invalid`)، وبلا اختيارٍ فرعُ المدينة (`departmentHomeBranch`) أو `null`.
 * قاعدةٌ واحدة تقرؤها الورقةُ والخادم.
 */
export function resolveCrossExamTarget(p: {
  dept: CrossExamDepartment;
  actingBranchId: number | null | undefined;
  chosenBranchId: number | null | undefined;
  branches: readonly BranchFact[];
  physioBranchIds: ReadonlySet<number>;
}): { target: number | null; invalid: boolean } {
  if (p.chosenBranchId != null) {
    const b = p.branches.find((x) => Number(x.id) === Number(p.chosenBranchId));
    return b && branchOffersDepartment(b, p.dept, p.physioBranchIds)
      ? { target: Number(b.id), invalid: false } : { target: null, invalid: true };
  }
  return { target: departmentHomeBranch(p), invalid: false };
}

/** سطرُ الخيار حين لا فرعَ في المدينة يقدّمه — يُختار في الورقة. */
export const CROSS_EXAM_CHOOSE_TARGET_HINT = "تختار الفرع الذي يُرسَل إليه في الورقة";

/** رسالةُ الخادم حين يُختار فرعٌ لا يقدّم القسم أو مغلقٌ مؤقتاً. */
export function invalidCrossExamTargetMessage(dept: CrossExamDepartment): string {
  return `الفرع المختار لا يقدّم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} أو مغلق مؤقتاً — اختر فرعاً من القائمة`;
}

/** رابطُ ورقة «طلب معاينة جديدة» لفتح القسم — الورقةُ نفسُها (§4.el)، و`open=1` يقول للخادم «افتح قسماً ليس للمريض». */
export function crossExamHref(patientId: number, dept: CrossExamDepartment): string {
  return `/patients/${patientId}/new-exam?dept=${dept}&open=1`;
}

/** سطرُ «يُرسَل إلى» — حين يختلف فرعُ القسم عن الفرع النشط وحده. */
export function crossExamTargetLine(targetBranchName: string | null | undefined): string {
  return `يُرسَل إلى: ${targetBranchName ?? "فرع القسم"}`;
}

/** سطرُ الخيار للمسؤول حين لا يصل فرعُه المختار ملفَّ مريضٍ متعدّد الفروع — الخادمُ يردّه (`adminMustChooseBranch`). */
export const CROSS_EXAM_ADMIN_CHOOSE_HINT = "لهذا المريض أكثر من فرع — اختر الفرع من أعلى الشاشة أوّلاً";

/** سطرُ نوافذ «إضافة خدمة جديدة» حين يولد القسمُ في فرعٍ غير النشط (§4.gv د). */
export function crossExamMoveNoteText(targetBranchName: string): string {
  return `يُفتح القسمُ في: ${targetBranchName}، ويُتاح له ملفُّ المريض — والمبلغُ والزيارةُ في فرعك كما هما.`;
}

/** لافتةُ الورقة في وضع الفتح. */
export function crossExamBannerText(dept: CrossExamDepartment, targetBranchName: string | null, differs: boolean): string {
  return `فتح قسم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} لهذا المريض من «سبب الحضور»`
    + (differs && targetBranchName ? ` — يُرسَل إلى: ${targetBranchName}، ويُتاح له ملفُّ المريض` : "");
}

/** رسالةُ الخادم والورقة حين لا فرعَ مختار ولا فرعَ في المدينة يقدّم القسم — يُختار الفرع (طلبُ المالك ٢٠٢٦-١١-٢٣). */
export function noDepartmentHomeMessage(dept: CrossExamDepartment): string {
  return `لا يوجد في هذه المدينة فرعٌ يقدّم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} — اختر الفرع الذي يُرسَل إليه المريض`;
}

/** رسالةُ الورقة والخادم حين لا فرعَ مفتوح في أيّ مدينة يقدّم القسم. */
export function noCrossExamTargetsMessage(dept: CrossExamDepartment): string {
  return `لا يوجد فرعٌ مفتوح يقدّم ${CROSS_EXAM_DEPARTMENT_NAMES[dept]} — لا يمكن فتح القسم من هنا`;
}

/** ما تقرؤه الورقةُ من رابطها: `open=1` وحده يعني «افتح القسم» — عكسُ `crossExamHref`. (و`parseNewExamQuery` للتحويل كما هو.) */
export function parseOpenDepartmentQuery(search: string): boolean {
  const qs = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return qs.get("open") === "1" && !qs.get("replaces");
}
