// **ما يتغيّر في حساب الموظّف يسري على جلسته في الطلب التالي — لا بعد خروجٍ ودخول**
// (§4.ar البند ٧ — ٢٠٢٦-٠٩-٢٩).
//
// ══ الواقعة ═════════════════════════════════════════════════════════════
// المِعترِضةُ الحيّة في `server/routes.ts` (منذ ٢٠٢٦-٠٩-٠١) كانت تعيد قراءة **الصلاحيات الدقيقة**
// وحدها مع كلّ طلب. وثلاثةٌ بقيت لقطةً من لحظة الدخول: **الفروعُ** (`accessibleBranches`/`branchId`)،
// و**الدور** (`role` — الطبيبُ والخبيرُ والاستقبال تُفرَز به)، و**المسؤوليّة** (`isAdmin`). بل كانت
// جلسةُ المسؤول مستثناةً من القراءة كلّياً — فتخفيضُ مسؤولٍ أو تعطيلُ حسابه لا يسري حتى يخرج.
//
// ══ القاعدة ═════════════════════════════════════════════════════════════
// الجلسةُ تُعاد بناءً من صفّ الحساب **بالقواعد نفسِها التي يطبّقها الدخول** — فما تراه الجلسةُ بعد
// التحديث هو بالضبط ما كان سيراه الموظّفُ لو خرج ودخل:
//   · `isAdmin` = الدورُ `admin` · والفروعُ = `branch_ids`، وإلّا `[branch_id]`؛
//   · فرعٌ نشطٌ سُحب ⟵ أوّلُ فرعٍ باقٍ (كالدخول)؛
//   · **وسحبُ آخر فرعٍ يُنهي الجلسة** (`revoked`) — لا `0` كالدخول: `branchId = 0` لغير المسؤول يقرؤه
//     `enforceBranchAccess` وأمثالُه «لا تصفية»، فيصير السحبُ **توسيعاً** إلى كلّ الفروع. وجلسةٌ بدأت على `0`
//     أصلاً (حسابٌ بلا فرعٍ من الدخول) تبقى كما هي — سلوكٌ سابقٌ لا يُمَسّ هنا؛
//   · ترقيةٌ إلى مسؤول ⟵ `0` (نطاقُ المسؤول، كالدخول)، وتخفيضٌ منه ⟵ أوّلُ فرعٍ له.
// ودخولُ الطوارئ القديم (بلا `userId`) لا يُمَسّ — ينتظر قرارَ المالك (§4.ap).

export type FreshUser = {
  role: string; branchId: number | null; branchIds: unknown;
  displayName: string | null; language?: string | null;
};

/** الفروعُ التي يعمل فيها الحساب — القاعدةُ نفسُها في الدخول وفي التحديث. */
export function accessibleBranchesOf(u: Pick<FreshUser, "branchId" | "branchIds">): number[] {
  const raw = Array.isArray(u.branchIds) ? (u.branchIds as unknown[]).map(Number).filter((n) => Number.isFinite(n) && n > 0) : [];
  return raw.length > 0 ? raw : (u.branchId ? [Number(u.branchId)] : []);
}

/**
 * يكتب على `bs` (الجلسة) ما يقوله الحسابُ الآن، ويُرجع هل تغيّر الفرعُ النشط (فيُقرأ اسمُه).
 * `permissions` تُبنى بدالّة المُنادي (`buildStoredPermissions`) — مصدرٌ واحد لا نسختان.
 */
export function applyFreshUser(
  bs: any, fresh: FreshUser, permissions: unknown,
): { branchChanged: boolean; revoked: boolean } {
  const wasAdmin = Boolean(bs.isAdmin);
  const isAdmin = fresh.role === "admin";
  const accessible = accessibleBranchesOf(fresh);
  const before = Number(bs.branchId ?? 0);
  let branchId = before;
  if (isAdmin) {
    //  المسؤولُ يبقى على فرعه المختار (التبديلُ مسموحٌ له لأيّ فرع)، والمُرقّى للتوّ يبدأ بنطاق المسؤول.
    if (!wasAdmin) branchId = 0;
  } else if (wasAdmin || !accessible.includes(before)) {
    //  كان على فرعٍ (أو كان مسؤولاً) ولم يبقَ له فرع ⟵ سحبٌ كامل، لا نطاقٌ مفتوح.
    if (accessible.length === 0 && (before > 0 || wasAdmin)) return { branchChanged: false, revoked: true };
    branchId = accessible[0] ?? 0;
  }
  bs.isAdmin = isAdmin;
  bs.role = fresh.role;
  bs.displayName = fresh.displayName ?? bs.displayName;
  bs.accessibleBranches = accessible;
  bs.branchId = branchId;
  bs.permissions = permissions;
  return { branchChanged: branchId !== before, revoked: false };
}
