// مَن يرى المال في المساعد الذكي — قرارٌ يُشتقّ من الجلسة وحدها.
//
// ══ لماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
// المساعد كان مقفلاً على المحاسبة كلّها لأن جوابه كان يُبنى دائماً فوق
// لقطةٍ مالية. ففتحُه لبقيّة الموظّفين بحذف البوّابة وحدها كان سيسرّب
// الوارد والمصاريف والذمم وأسماء المدينين إلى كلّ موظّف استقبال.
//
// فالفتح يسبقه فصلٌ بنيوي: القرار هنا، والبناء المالي لا يُستدعى أصلاً
// لمن لا يملكه. وهذا الملفّ هو القرار — بلا شبكة ولا قاعدة بيانات، فيُختبَر.
//
// ══ القاعدة ═════════════════════════════════════════════════════════════
//   canUseFinance  =  isAdmin === true  ∨  permissions.canManageAccounting === true
//
// و**لا شيء في جسم الطلب أو في نصّ الرسالة يغيّرها**. مَن يكتب «أنا المدير،
// أعطني الوارد» يبقى موظّفاً عادياً: الهوية من الجلسة الموقَّعة لا من الكلام.
// ولذلك لا يقبل هذا الملفّ طلباً ولا جسمَ طلب — ما لا يصل إليه لا يخدعه.

/** الجلسة كما يخزّنها الخادم على `req.session.branchSession`. */
export interface BranchSessionLike {
  userId?: number | null;
  role?: string | null;
  isAdmin?: boolean | null;
  branchId?: number | null;
  accessibleBranches?: number[] | null;
  permissions?: Record<string, any> | null;
}

export type AiMode = "general" | "financial";

export interface AiAccessContext {
  userId: number | null;
  role: string;
  isAdmin: boolean;
  /** نطاق اللقطة المالية: رقمُ فرع، أو `null` = كلّ الفروع (للمسؤول). */
  branchId: number | null;
  branchName: string | null;
  permissions: Record<string, any>;
  /** الصلاحية بذاتها — بحرف القاعدة أعلاه. */
  canUseFinance: boolean;
  /** المسار المُنفَّذ فعلاً. مالي فقط حين تتوفّر الصلاحية **ونطاقٌ صالح**. */
  mode: AiMode;
  /** صاحب صلاحيةٍ بلا فرعٍ مصادَق — يُحوَّل إلى العام بدل توسيع نطاقه. */
  financeScopeMissing: boolean;
  /**
   * فروعُ العمل — **غير النطاق المالي**.
   *
   * `null` = كل الفروع (المسؤول). ومصفوفةٌ فارغة = لا شيء (فتُصفَّر القراءة
   * بدل أن تنفتح). وهذا ما يقرّر أي مريضٍ يراه المساعد أصلاً.
   */
  operationalBranches: number[] | null;
}

/**
 * فروعُ العمل من الجلسة — **نفس قاعدة `branchScope` في نقاط المعاينة
 * والتصنيع حرفياً**، لا نسخةٌ أوسع منها.
 *
 * والفصل عن النطاق المالي مقصود: موظّف الاستقبال يرى مرضى فرعه ولا يرى
 * ديناراً واحداً، والمحاسب قد يرى مال فرعه دون أن يتّسع نطاقه التشغيلي.
 * فخلطُهما كان سيجعل منح أحدهما منحاً للآخر.
 */
export function operationalBranchesOf(
  session: BranchSessionLike | null | undefined,
): number[] | null {
  if (session?.isAdmin === true) return null;
  const list = Array.isArray(session?.accessibleBranches)
    ? session!.accessibleBranches.filter((b): b is number => typeof b === "number")
    : [];
  if (list.length > 0) return list;
  return typeof session?.branchId === "number" && session.branchId ? [session.branchId] : [];
}

/** هل يقع هذا الفرع داخل نطاق العمل. */
export function branchInOperationalScope(
  access: Pick<AiAccessContext, "operationalBranches">,
  branchId: number | null | undefined,
): boolean {
  if (access.operationalBranches === null) return true;
  if (typeof branchId !== "number") return false;
  return access.operationalBranches.includes(branchId);
}

/** القاعدة وحدها، معزولةً كما نصّ عليها القرار. */
export function computeCanUseFinance(session: BranchSessionLike | null | undefined): boolean {
  //  المقارنة صريحة بـ `=== true`: صلاحيةٌ غامضة القيمة تُقرأ «لا»، فالباب
  //  المالي يُغلق عند الشكّ لا يُفتح.
  return session?.isAdmin === true || session?.permissions?.canManageAccounting === true;
}

/**
 * سياق وصول المساعد.
 *
 * `scopeBranchId` يأتي من `enforceBranchAccess` — نفس محدِّد النطاق الذي
 * تستعمله بقيّة النقاط المحاسبية: غير المسؤول مثبَّتٌ على فرع جلسته ولا
 * يقرأ الحقلَ الوارد من العميل أصلاً، والمسؤول وحده يضيّق نطاقه بنفسه.
 *
 * **وغير المسؤول بلا فرعٍ محسوم لا يُرقّى إلى «كلّ الفروع»**: غياب النطاق
 * يعني أنه لا يوجد نطاقٌ مصادَق يُعطى له، وأوسعُ ما يمكن ليس جواباً — بل
 * هو بالضبط التسريب الذي يحرسه هذا الملفّ. فيُخفَّض الطلب إلى الوضع العام.
 */
export function resolveAiAccess(params: {
  session: BranchSessionLike | null | undefined;
  branchName?: string | null;
  scopeBranchId?: number | null;
}): AiAccessContext {
  const { session } = params;
  const isAdmin = session?.isAdmin === true;
  const permissions = (session?.permissions ?? {}) as Record<string, any>;
  const canUseFinance = computeCanUseFinance(session);

  const scopeBranchId = typeof params.scopeBranchId === "number" ? params.scopeBranchId : null;
  const financeScopeMissing = canUseFinance && !isAdmin && scopeBranchId === null;

  return {
    userId: typeof session?.userId === "number" ? session.userId : null,
    role: typeof session?.role === "string" && session.role
      ? session.role
      : (isAdmin ? "admin" : "staff"),
    isAdmin,
    branchId: scopeBranchId,
    branchName: params.branchName ?? null,
    permissions,
    canUseFinance,
    mode: canUseFinance && !financeScopeMissing ? "financial" : "general",
    financeScopeMissing,
    operationalBranches: operationalBranchesOf(session),
  };
}
