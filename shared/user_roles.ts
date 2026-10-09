// **أدوارُ الحسابات — مصدرٌ واحد** (§4.cg، المرحلةُ الأولى من خطّة العلاج الطبيعي — ٢٠٢٦-١٠-٠٧).
//
// كانت قائمةُ الأدوار المسموحة مكتوبةً حرفياً في موضعين من الخادم (إنشاءُ المستخدم وتعديلُه)، فدورٌ يُضاف في
// أحدهما ويُنسى في الآخر يُنشئ حساباً لا يُعدَّل. فصارت هنا.
//
// **وأدوارُ العلاج الطبيعي أربعة** بقرار المالك:
//   • `physio_specialist` — أخصائيّ العلاج الطبيعي: يكتب الخطّةَ ويعدّلها ويعتمدها (المرحلةُ الثالثة).
//   • `therapist`         — المعالج: يُنفّذ الخطّةَ وحدَه بلا تعديل. (الدورُ القائم منذ البداية — لا يُعاد تسميتُه في القاعدة.)
//   • `physio_technician` — التقنيّ: يُنفّذ.
//   • `physio_trainer`    — المدرّب: يُنفّذ.

export const USER_ROLES = [
  "admin",
  "branch_manager",
  "accountant",
  "reception",
  "therapist",
  "physio_specialist",
  "physio_technician",
  "physio_trainer",
  "surveyor",
  "prosthetics_expert",
  "doctor",
] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const isUserRole = (r: unknown): r is UserRoleValue =>
  typeof r === "string" && (USER_ROLES as readonly string[]).includes(r);

/** أدوارُ قسم العلاج الطبيعي الأربعة. */
export const PHYSIO_ROLES = ["physio_specialist", "therapist", "physio_technician", "physio_trainer"] as const;
/** مَن يُنفّذ الخطّةَ ولا يعدّلها. */
export const PHYSIO_EXECUTOR_ROLES = ["therapist", "physio_technician", "physio_trainer"] as const;

export const isPhysioRole = (r: unknown): boolean =>
  typeof r === "string" && (PHYSIO_ROLES as readonly string[]).includes(r);

// ════════════════════════════════════════════════════════════════════════════
// **أكثرُ من دورٍ للحساب** (ترحيل ١٠٥، §4.ch — قرارُ المالك ٢٠٢٦-١٠-٠٧)
// «فاضل محاسب، وأحياناً يعمل محاسباً وموظّفَ استعلامات — اجعلني أختار أكثر من دور».
//
//   • العمودُ `role` يبقى **الدورَ الأعلى** — فكلُّ قارئٍ قديمٍ له يرى ما كان يراه. والبقيّةُ في `extra_roles`.
//   • **المسؤولُ حصريّ**: يشمل كلَّ شيء، فلا يُجمع مع غيره.
//   • **والأعلى يشمل بعضَ الأدنى** (`ROLE_COVERS`): لا يُخزَّن المشمولُ — النافذةُ تُظهره مشمولاً لا يُختار.
//   • والقرارُ من الدور نوعان، ولكلٍّ دالّته:
//       - **منحٌ** («يرى التصنيعَ مَن دورُه خبير») ⟵ `hasRole`/`hasAnyRole`: يكفي دورٌ واحد.
//       - **حصرٌ** («لوحةُ التحكّم تُخفى عن الاستقبال») ⟵ `onlyRoles`: لا يُحصَر إلّا مَن أدوارُه **كلُّها** في القائمة —
//         فمحاسبٌ هو استقبالٌ أيضاً لا يفقد ما يراه المحاسب.
// ════════════════════════════════════════════════════════════════════════════

/** ترتيبُ الأدوار من الأعلى — الأوّلُ من المختار يصير `role`. */
export const ROLE_RANK: readonly UserRoleValue[] = [
  "admin",
  "branch_manager",
  "doctor",
  "physio_specialist",
  "prosthetics_expert",
  "accountant",
  "reception",
  "therapist",
  "physio_technician",
  "physio_trainer",
  "surveyor",
];

/** ما يشمله الدورُ الأعلى فلا يُختار معه. */
export const ROLE_COVERS: Partial<Record<UserRoleValue, readonly UserRoleValue[]>> = {
  branch_manager: ["accountant", "reception", "surveyor"],
  physio_specialist: ["therapist", "physio_technician", "physio_trainer"],
};

/** هل يشمل أحدُ الأدوار المختارة هذا الدور؟ (المسؤولُ يشمل كلَّ شيء.) */
export function coveredBy(selected: readonly string[], role: string): UserRoleValue | null {
  if (role !== "admin" && selected.includes("admin")) return "admin";
  for (const s of selected) {
    if (s !== role && (ROLE_COVERS[s as UserRoleValue] ?? []).includes(role as UserRoleValue)) return s as UserRoleValue;
  }
  return null;
}

/**
 * يرتّب الأدوارَ المختارة ويطبّعها: المجهولُ يُرفض (`null`)، والمكرّرُ والمشمولُ يُسقطان، والمسؤولُ وحده إن وُجد.
 * يُرجع `{ role, extraRoles }` — الأعلى في `role` والبقيّةُ بترتيبها.
 */
export function normalizeRoles(input: readonly unknown[]): { role: UserRoleValue; extraRoles: UserRoleValue[] } | null {
  if (!input.length || !input.every(isUserRole)) return null;
  const picked = Array.from(new Set(input as UserRoleValue[]));
  //  والمسؤولُ حصريٌّ بـ`coveredBy` نفسِها: يشمل كلَّ ما معه فيسقط.
  const kept = picked.filter((r) => !coveredBy(picked, r));
  kept.sort((a, b) => ROLE_RANK.indexOf(a) - ROLE_RANK.indexOf(b));
  return { role: kept[0], extraRoles: kept.slice(1) };
}

/** أيُّ شيءٍ يحمل الدور: صفُّ الحساب (`role` + `extraRoles`) أو الجلسة (`role` + `roles`). */
export interface RoleHolder { role?: string | null; roles?: unknown; extraRoles?: unknown }

/** الأدوارُ كلُّها — الأعلى أوّلاً. جلسةٌ قديمة بلا `roles` تُقرأ من `role` وحده. */
export function rolesOf(x: RoleHolder | null | undefined): string[] {
  if (!x) return [];
  const out: string[] = [];
  const push = (r: unknown) => { if (typeof r === "string" && r && !out.includes(r)) out.push(r); };
  push(x.role);
  if (Array.isArray(x.roles)) x.roles.forEach(push);
  if (Array.isArray(x.extraRoles)) x.extraRoles.forEach(push);
  return out;
}

/** **منح**: يحمل هذا الدور (أيّاً كان ترتيبُه). */
export const hasRole = (x: RoleHolder | null | undefined, role: string): boolean => rolesOf(x).includes(role);

/** **منح**: يحمل واحداً على الأقلّ من هذه الأدوار. */
export const hasAnyRole = (x: RoleHolder | null | undefined, list: readonly string[]): boolean =>
  rolesOf(x).some((r) => list.includes(r));

/** **حصر**: كلُّ أدواره في القائمة (وله دورٌ واحدٌ على الأقلّ) — فمَن له دورٌ خارجها لا يُحصَر. */
export const onlyRoles = (x: RoleHolder | null | undefined, list: readonly string[]): boolean => {
  const rs = rolesOf(x);
  return rs.length > 0 && rs.every((r) => list.includes(r));
};

/**
 * **مَن يكتب معاينةَ العلاج الطبيعي بلا علَم «يكتب المعاينة الطبية»** (قرارُ المالك ٢٠٢٦-١٠-٠٩، §4.da): «هذه الاستمارةُ العلاجية
 * لدور الأخصائيّ أو الطبيب أو المسؤول» — فالأخصائيُّ بدوره، والمشرفُ العامّ بعلَمه (سليم مديرُ فرعٍ وهو الأخصائيُّ الأعلى)، والمسؤولُ
 * بدوره. **للعلاج الطبيعي وحده**: معاينةُ الأطراف والمساند تبقى للطبيب كما كانت. والطبيبُ بعلَمه أو دوره يبقى كما هو.
 */
export function writesPhysioExamByRole(x: (RoleHolder & { canSupervisePhysio?: unknown }) | null | undefined): boolean {
  if (!x) return false;
  return hasRole(x, "physio_specialist") || hasRole(x, "admin") || x.canSupervisePhysio === true;
}

/** هل أحدُ أدواره من العلاج الطبيعي؟ */
export const hasPhysioRole = (x: RoleHolder | null | undefined): boolean => hasAnyRole(x, PHYSIO_ROLES);

/**
 * أدوارٌ لكلٍّ منها شاشةُ عملٍ يبدأ منها بدل لوحة التحكّم — فتُخفى عنه «لوحة التحكّم» في الشريط.
 * **حصر**: لا تُخفى إلّا عمّن أدوارُه كلُّها هنا — فمحاسبٌ هو استقبالٌ أيضاً يرى لوحتَه.
 */
export const DASHBOARD_HIDDEN_ROLES: readonly string[] = ["reception", ...PHYSIO_ROLES, "surveyor", "prosthetics_expert", "doctor"];

/** هل تُخفى لوحةُ التحكّم عن هذا الحساب؟ */
export const hidesDashboard = (x: RoleHolder | null | undefined): boolean => onlyRoles(x, DASHBOARD_HIDDEN_ROLES);

/** أين يبدأ مَن لا لوحةَ له — من دوره الأعلى. `null` = لوحةُ التحكّم. */
export function landingPathOf(x: RoleHolder | null | undefined): string | null {
  if (!hidesDashboard(x)) return null;
  const top = rolesOf(x)[0];
  if (top === "doctor") return "/my-exams";
  if (top === "prosthetics_expert") return "/manufacturing";
  if (top === "reception") return "/patients";
  if (top === "surveyor") return "/surveys";
  return null;
}
