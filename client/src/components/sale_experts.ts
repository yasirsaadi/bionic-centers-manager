// **قائمةُ خبراء البيع — بملفّ المريض، لا بفرعٍ واحد** (٢٠٢٦-٠٩-٢٤).
//
// ══ الواقعة (المريضة «زهراء») ═══════════════════════════════════════════
// مسجَّلةٌ في ذي قار ومُتاحٌ ملفُّها لبغداد. نافذةُ «اشترى» كانت تطلب خبراءَ
// **فرع المتابعة** (ذي قار): استقبالُ بغداد يُردّ ٤٠٣ فتصير القائمةُ فارغةً
// بصمت (`if (!res.ok) return []`)، والمسؤولُ يرى خبراءَ ذي قار **بلا أيوب**
// خبيرِ بغداد.
//
// ══ القاعدة ══════════════════════════════════════════════════════════════
// تُطلب القائمةُ **بالمريض**: فروعُ ملفّه (تسجيلٌ وإتاحة) ∩ نطاقُ الفاعل —
// القاعدةُ نفسُها التي يحسم بها الخادمُ فرعَ البيع عند الحفظ
// (`server/followup/sale_branch.ts`)، فلا تُعرَض قائمةٌ يردّها الحفظ. ولكلّ
// خبيرٍ فروعُه، تُكتب بجانب اسمه **حين تمتدّ القائمةُ على أكثر من فرع** —
// وإلّا فالاسمُ وحده كما كان.
//
// **والفشلُ يُقال لا يُبتلَع**: قائمةٌ فارغةٌ بلا سبب هي بالضبط ما حيّر
// الموظّفة. فالمجلبُ يرمي برسالة الخادم، والنافذةُ تعرضها.
//
// ══ لماذا دوالُّ خالصة ═══════════════════════════════════════════════════
// المشروعُ بلا مشغّل DOM، فالقرارُ خارج المكوّن يُختبَر دخلاً وخرجاً (درسُ
// ٤.u) — والمكوّناتُ الثلاثة (بطاقةُ المريض · «إتمام البيع» · «اشترى»)
// تستوردها فلا تنحرف واحدةٌ عن أختيها.

export interface SaleExpert {
  id: number;
  displayName: string;
  /** الفروعُ المرشَّحة التي يعمل فيها — من الخادم. */
  branchIds?: number[];
  branchNames?: string[];
}

/** مفتاحُ الاستعلام — يحمل المريضَ فلا تُعرَض قائمةُ مريضٍ على آخر. */
export function saleExpertsQueryKey(patientId: number): readonly unknown[] {
  return ["/api/manufacturing/experts", "patient", patientId] as const;
}

export function saleExpertsUrl(patientId: number): string {
  return `/api/manufacturing/experts?patientId=${encodeURIComponent(String(patientId))}`;
}

/** هل تمتدّ القائمةُ على أكثر من فرع؟ — حينها يُكتب الفرعُ بجانب الاسم. */
export function spansSeveralBranches(experts: readonly SaleExpert[]): boolean {
  const all = new Set<number>();
  for (const e of experts) for (const b of e.branchIds ?? []) all.add(Number(b));
  return all.size > 1;
}

/** عنوانُ الخبير في القائمة — «أيوب — بغداد» حين تمتدّ على فرعين فأكثر. */
export function saleExpertLabel(expert: SaleExpert, showBranches: boolean): string {
  const names = (expert.branchNames ?? []).filter((n) => typeof n === "string" && n.trim());
  if (!showBranches || names.length === 0) return expert.displayName;
  return `${expert.displayName} — ${names.join("، ")}`;
}

/** نصُّ القائمة الفارغة — يقول أين بحث، لا «لا يوجد» عارية. */
export const NO_SALE_EXPERTS = "لا يوجد خبير في فروع هذا المريض المتاحة لك";

export const SALE_EXPERTS_LOADING = "جارٍ تحميل الخبراء…";

/**
 * **نصُّ خانة الاختيار — والتحميلُ ليس فراغاً** (٢٠٢٦-٠٩-٢٤).
 *
 * صارت القائمةُ تُجلَب حين تُفتَح النافذة لا مع كلّ صفٍّ في طابور «بانتظار
 * الحسم» (مراجعةٌ على ٤٠٩: واحدٌ وخمسون طلباً لطابورٍ واحد). فبين الفتح
 * والوصول تكون القائمةُ غائبة — وقراءتُها «لا يوجد خبير في فروع هذا المريض»
 * هي بعينها القائمةُ الفارغةُ بلا سبب التي حيّرت الموظّفة («زهراء»).
 */
export function saleExpertsPlaceholder(p: { loading: boolean; count: number }): string {
  if (p.loading) return SALE_EXPERTS_LOADING;
  return p.count > 0 ? "اختر الخبير" : NO_SALE_EXPERTS;
}

/**
 * **المجلبُ** — يرمي برسالة الخادم حين يُردّ، فتعرضها النافذةُ بدل قائمةٍ
 * فارغة بلا سبب.
 */
export async function fetchSaleExperts(patientId: number): Promise<SaleExpert[]> {
  const res = await fetch(saleExpertsUrl(patientId), { credentials: "include" });
  if (!res.ok) {
    let message = "تعذّر تحميل قائمة الخبراء";
    try {
      const body = await res.json();
      if (body && typeof body.error === "string" && body.error.trim()) message = body.error;
    } catch { /* الردُّ بلا جسم — تبقى الرسالةُ العامّة */ }
    throw new Error(message);
  }
  const body = await res.json();
  return Array.isArray(body) ? body as SaleExpert[] : [];
}
