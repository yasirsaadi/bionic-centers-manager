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
