//  **مَن يرى لوحةَ التصنيع، وبأيّ عين** — منطقٌ خالص، بلا React ولا شبكة.
//
//  ══ لماذا ملفٌّ مستقلّ ══════════════════════════════════════════════════
//  المشروع بلا مشغّل DOM، فقرارٌ يعيش داخل مكوّن React لا يُختبَر إلّا
//  بقراءة نصِّه — وقراءةُ النصّ لا تُمسك انقلاباً في المعنى يعود يوماً
//  بصياغةٍ أخرى (درسُ `patient_header_branches` و`exam_episode_choice`).
//  وهذا القرار يستحقّ الاختبار: **اختيارُ النقطة الخاطئة يُفرغ الشاشة**.
//
//  ══ الواقعة ═════════════════════════════════════════════════════════════
//  ثلاثةُ مواضعَ كانت تقرأ «الخبير» بثلاث قراءات:
//    • الشريطُ الجانبيّ يفتح `/manufacturing` لمن يحمل `canWorkAsExpert`.
//    • و`GET /api/manufacturing/my-orders` في الخادم يقبله كذلك.
//    • **وهذه الصفحةُ وحدها** كانت تقرأ `role === "prosthetics_expert"`.
//  فمَن يحمل **القدرةَ بلا الدور** يدخل الصفحةَ فتسأل `/orders` — وهي
//  ليست له — فيرى لوحةً فارغة بلا سببٍ مفهوم، ولا سطرَ «الحالات المسندة
//  إليك» ولا مرشِّحَ فروعه.
//
//  ══ القاعدة ═════════════════════════════════════════════════════════════
//  **ثلاثُ صفاتٍ لا واحدة**، ولا تُخلَط:
//    • `isExpertRole` — دورُه خبيرٌ صِرف.
//    • `worksAsExpert` — يعمل خبيراً: **بدوره أو بقدرته**.
//    • `expertOnly` — **شاشةُ الخبير وحدَه**: لا مسؤولٌ ولا مديرُ فرع،
//      ويعمل خبيراً.
//
//  **والمسؤولُ ومديرُ الفرع يسبقان القدرة دائماً**: مديرُ فرعٍ يحمل
//  `canWorkAsExpert` يبقى على نظرته الإدارية لفرعه كلِّه — تضييقُها إلى
//  أوامره هو يُخفي عنه عملَ فريقه، وهو أسوأ من العطب الذي نصلحه.
//
//  **ولا سلطةَ هنا**: الخادمُ يحرس كلَّ نقطةٍ من مصدره، وهذا اختيارُ
//  **نقطةٍ وعرضٍ** لا منحُ وصول.

/** ما تقرؤه الصفحةُ من الجلسة و`usePermissions` — لا أكثر. */
export interface ManufacturingViewerLike {
  isAdmin?: boolean | null;
  role?: string | null;
  canWorkAsExpert?: boolean | null;
}

/** أوامرُ هذا الخبير وحدَه (يقبلها الخادمُ بالدور **أو** بالقدرة). */
export const EXPERT_ORDERS_ENDPOINT = "/api/manufacturing/my-orders";
/** لوحةُ الفرع/الفروع الكاملة — للمسؤول ومدير الفرع. */
export const BOARD_ORDERS_ENDPOINT = "/api/manufacturing/orders";

export interface ManufacturingView {
  isAdmin: boolean;
  isManager: boolean;
  /** دورُه `prosthetics_expert` حرفياً. */
  isExpertRole: boolean;
  /** يعمل خبيراً — بدوره أو بقدرته. */
  worksAsExpert: boolean;
  /** شاشةُ الخبير وحدَه: غيرُ مسؤولٍ وغيرُ مديرِ فرعٍ ويعمل خبيراً. */
  expertOnly: boolean;
  /** النقطةُ التي تُسأل عن الأوامر. */
  endpoint: string;
  /** مرشِّحُ الخبير — للنظرة الإدارية وحدها (ويبقى مشروطاً بوجود خبراء). */
  showExpertFilter: boolean;
}

export function resolveManufacturingView(
  viewer: ManufacturingViewerLike | null | undefined,
): ManufacturingView {
  const isAdmin = viewer?.isAdmin === true;
  const isManager = viewer?.role === "branch_manager";
  const isExpertRole = viewer?.role === "prosthetics_expert";
  //  الدورُ **أو** القدرة — نفسُ ما يقبله `my-orders` في الخادم.
  const worksAsExpert = isExpertRole || viewer?.canWorkAsExpert === true;
  //  والصفةُ الإدارية تسبق القدرة: مديرُ فرعٍ خبيرٌ يبقى مديراً.
  const expertOnly = !isAdmin && !isManager && worksAsExpert;

  return {
    isAdmin,
    isManager,
    isExpertRole,
    worksAsExpert,
    expertOnly,
    endpoint: expertOnly ? EXPERT_ORDERS_ENDPOINT : BOARD_ORDERS_ENDPOINT,
    showExpertFilter: isAdmin || isManager,
  };
}
