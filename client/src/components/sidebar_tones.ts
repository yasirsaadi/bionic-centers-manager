// **ألوانُ أيقونات الشريط الجانبي** (طلبُ المالك ٢٠٢٦-١٠-٠٨: «تلوينُ أيقونات الشريط الجانبي لكلّ فقرة ليعطي جماليةً للتطبيق»).
//
// كلُّ فقرةٍ أيقونتُها في مربّعٍ ملوّنٍ خفيف، **واللونُ عائلةٌ لكلّ مجال** لا لونٌ عشوائيّ لكلّ سطر — فتُقرأ القائمةُ مجموعاتٍ بالعين:
// المرضى أزرق · الطبيب والمعاينات وردي · الحسمُ والبيعُ وتصحيحاته برتقالي · المالُ والتقاريرُ أخضر · العلاجُ الطبيعيّ بنفسجي ·
// تتبّعُ الجلسات نيلي · التصنيعُ كهرماني · الإدارةُ رمادي. والفقرةُ المفتوحة مربّعُها ممتلئٌ بلونها وأيقونتُها بيضاء، وسطرُها بلونها.
// **مربوطٌ بالمسار** (`href`) لا بتعريف العنصر — فتعريفاتُ القائمة وأهليّتُها في `Sidebar.tsx` لا تُمسّ، وفقرةٌ بلا لونٍ هنا تأخذ
// الرماديّ فلا تنكسر. والأصنافُ مكتوبةٌ بحرفها لأنّ Tailwind لا يرى صنفاً يُركَّب من أجزاء.

export interface SidebarTone {
  /** المربّعُ في الحال العاديّة: خلفيّةٌ خفيفة وحلقةٌ أخفّ. */
  tile: string;
  /** لونُ الأيقونة في الحال العاديّة. */
  icon: string;
  /** المربّعُ للفقرة المفتوحة — ممتلئ، والأيقونةُ بيضاء. */
  active: string;
  /** سطرُ الفقرة المفتوحة — بلون مجالها، لا بلونٍ واحدٍ لكلّ الفقرات. */
  row: string;
}

const T = {
  blue: { tile: "bg-blue-100 ring-blue-200", icon: "text-blue-600", active: "bg-blue-600 ring-blue-600", row: "bg-blue-50 text-blue-700" },
  sky: { tile: "bg-sky-100 ring-sky-200", icon: "text-sky-600", active: "bg-sky-600 ring-sky-600", row: "bg-sky-50 text-sky-700" },
  cyan: { tile: "bg-cyan-100 ring-cyan-200", icon: "text-cyan-700", active: "bg-cyan-600 ring-cyan-600", row: "bg-cyan-50 text-cyan-700" },
  rose: { tile: "bg-rose-100 ring-rose-200", icon: "text-rose-600", active: "bg-rose-600 ring-rose-600", row: "bg-rose-50 text-rose-700" },
  pink: { tile: "bg-pink-100 ring-pink-200", icon: "text-pink-600", active: "bg-pink-600 ring-pink-600", row: "bg-pink-50 text-pink-700" },
  orange: { tile: "bg-orange-100 ring-orange-200", icon: "text-orange-600", active: "bg-orange-600 ring-orange-600", row: "bg-orange-50 text-orange-700" },
  amber: { tile: "bg-amber-100 ring-amber-200", icon: "text-amber-700", active: "bg-amber-600 ring-amber-600", row: "bg-amber-50 text-amber-700" },
  emerald: { tile: "bg-emerald-100 ring-emerald-200", icon: "text-emerald-600", active: "bg-emerald-600 ring-emerald-600", row: "bg-emerald-50 text-emerald-700" },
  green: { tile: "bg-green-100 ring-green-200", icon: "text-green-700", active: "bg-green-600 ring-green-600", row: "bg-green-50 text-green-700" },
  teal: { tile: "bg-teal-100 ring-teal-200", icon: "text-teal-700", active: "bg-teal-600 ring-teal-600", row: "bg-teal-50 text-teal-700" },
  violet: { tile: "bg-violet-100 ring-violet-200", icon: "text-violet-600", active: "bg-violet-600 ring-violet-600", row: "bg-violet-50 text-violet-700" },
  purple: { tile: "bg-purple-100 ring-purple-200", icon: "text-purple-600", active: "bg-purple-600 ring-purple-600", row: "bg-purple-50 text-purple-700" },
  fuchsia: { tile: "bg-fuchsia-100 ring-fuchsia-200", icon: "text-fuchsia-600", active: "bg-fuchsia-600 ring-fuchsia-600", row: "bg-fuchsia-50 text-fuchsia-700" },
  indigo: { tile: "bg-indigo-100 ring-indigo-200", icon: "text-indigo-600", active: "bg-indigo-600 ring-indigo-600", row: "bg-indigo-50 text-indigo-700" },
  red: { tile: "bg-red-100 ring-red-200", icon: "text-red-600", active: "bg-red-600 ring-red-600", row: "bg-red-50 text-red-700" },
  slate: { tile: "bg-slate-100 ring-slate-200", icon: "text-slate-600", active: "bg-slate-700 ring-slate-700", row: "bg-slate-100 text-slate-800" },
} satisfies Record<string, SidebarTone>;

/** لونُ كلّ فقرةٍ بمسارها — مجموعةً مجموعة. */
const TONE_BY_HREF: Record<string, SidebarTone> = {
  //  الرئيسية
  "/": T.indigo,
  //  المرضى
  "/patients": T.blue,
  "/patients/new": T.sky,
  "/follow-ups": T.cyan,
  //  الطبيب والمعاينات
  "/my-exams": T.rose,
  "/medical-review": T.pink,
  "/returned-from-doctor": T.rose,
  //  الحسمُ والبيعُ وتصحيحاته
  "/post-exam-followups": T.orange,
  "/discount-approvals": T.orange,
  "/no-exam-review": T.amber,
  "/returned-charges": T.orange,
  //  المالُ والتقارير
  "/reports": T.emerald,
  "/reports/daily-patients": T.teal,
  "/accounting": T.green,
  "/cash-book": T.emerald,
  "/dr-box": T.green,
  "/payment-corrections": T.teal,
  "/daily-review": T.teal,
  "/statistics": T.emerald,
  //  العلاجُ الطبيعيّ
  "/physio/protocols": T.violet,
  "/physio/plans": T.purple,
  "/physio/today": T.fuchsia,
  "/physio/outcomes": T.violet,
  //  تتبّعُ الجلسات
  "/session-tracking/entry": T.indigo,
  "/session-tracking/targets": T.indigo,
  "/session-tracking/list": T.indigo,
  "/session-tracking/analytics": T.indigo,
  //  التصنيع
  "/manufacturing": T.amber,
  //  التنبيهاتُ والاستبيانات
  "/notifications": T.red,
  "/surveys": T.pink,
  //  الإدارة
  "/branches": T.slate,
  "/patient-trash": T.slate,
  "/admin": T.slate,
};

export function sidebarToneOf(href: string): SidebarTone {
  return TONE_BY_HREF[href] ?? T.slate;
}

/** للاختبار: كلُّ المسارات الملوّنة. */
export const SIDEBAR_TONED_HREFS = Object.keys(TONE_BY_HREF);
