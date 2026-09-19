/**
 * سياقُ الصفحة الحالية — **ملاحةٌ لا سلطة** (المرحلة ٢).
 *
 * يرسل العميلُ `window.location.pathname` وحده، فيُنظَّف هنا ويُترجَم إلى
 * مسارٍ قانونيّ وتسميةٍ عربية يقرؤها النموذج ليفهم «هنا» و«هذه الصفحة».
 *
 * **ولا سلطةَ فيه بحال**: لا يُقرأ في `resolveAiAccess`، ولا يمسّ
 * `operationalBranches` ولا `mode` ولا `permissions`، ولا يفتح أداةً
 * (`toolsFor`/`executeTool` لا تعرفه أصلاً)، ولا يُحَلّ رقمٌ فيه إلى مريضٍ
 * أو أمرِ تصنيع. مسارٌ ملفَّقٌ أثرُه **صفر** في كلّ قرار إذن.
 *
 * **والأرقامُ تُستبدَل بـ`:id` قبل أن تبلغ النموذج**: رقمُ المريض معرّفٌ
 * يخصّه، وتسريبُه في نصّ النظام تسريبُ هويّةٍ بلا داعٍ — والنموذجُ لا
 * يحتاجه ليعرف أنك في «تفاصيل المريض».
 */

/** حدٌّ صغير: أطولُ مسارٍ حقيقيّ أقصرُ من هذا بكثير. */
export const MAX_PAGE_PATH_LENGTH = 120;

/** المسارُ حين يتعذّر تنظيفُه أو لا يُعرَف. */
export const UNKNOWN_PAGE_LABEL = "صفحة غير معروفة";

export interface PageContext {
  /** المسارُ القانونيّ بعد التنظيف واستبدال الأرقام — مثل `/patients/:id`. */
  path: string;
  /** التسميةُ العربية المقروءة — مثل «تفاصيل المريض». */
  label: string;
}

/**
 * التسمياتُ مشتقّةٌ من `client/src/App.tsx` **وحده** — ٣١ مساراً حقيقياً،
 * لا مسارَ مخترَع. والترتيبُ هنا لا يهمّ لأن المطابقةَ بالمفتاح التامّ بعد
 * التقنين، لكنّ التقنينَ نفسَه يحترم ترتيبَ `Switch`: `/patients/:id/edit`
 * قبل `/patients/:id` كما في الملفّ.
 */
const PAGE_LABELS: Readonly<Record<string, string>> = Object.freeze({
  "/": "لوحة التحكم",
  "/patients": "سجل المرضى",
  "/patients/new": "تسجيل مريض جديد",
  "/patients/:id": "تفاصيل المريض",
  "/patients/:id/edit": "تعديل بيانات المريض",
  "/follow-ups": "المتابعات",
  "/post-exam-followups": "بانتظار الحسم",
  "/discount-approvals": "اعتماد الخصومات",
  "/no-exam-review": "مبالغ سابقة بانتظار الإكمال",
  "/returned-charges": "مبالغ مُعادة للتصحيح",
  "/payment-corrections": "تصحيح الدفعات",
  "/daily-review": "المراجعة اليومية",
  "/patient-trash": "المحذوفات",
  "/my-exams": "معايناتي",
  "/medical-review": "مراجعة حركة مرضى الأطراف والمساند",
  "/manufacturing": "تصنيع الأطراف والمساند",
  "/manufacturing/orders/:id": "أمر تصنيع",
  "/notifications": "التنبيهات",
  "/reports": "التقارير",
  "/reports/daily-patients": "تقرير مرضى اليوم",
  "/revenues": "إيرادات الفروع",
  "/branches": "الفروع",
  "/branches/:id": "تفاصيل الفرع",
  "/statistics": "الإحصاءات",
  "/accounting": "النظام المحاسبي",
  "/surveys": "الاستطلاعات",
  "/session-tracking/entry": "إدخال الجلسات",
  "/session-tracking/targets": "أهداف الجلسات",
  "/session-tracking/list": "قائمة الجلسات",
  "/session-tracking/analytics": "تحليلات الجلسات",
  "/admin": "لوحة المسؤول",
});

/** مقطعٌ آمن: حروفٌ وأرقامٌ وشرطةٌ وشرطةٌ سفلية فقط. */
const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
/** مقطعٌ رقميٌّ صرف — معرّفُ مسارٍ ديناميكيّ. */
const NUMERIC_SEGMENT = /^[0-9]+$/;

/**
 * تنظيفُ ما أرسله العميل، بالترتيب:
 * ① نصٌّ فقط · ② حدُّ الطول · ③ قصُّ الاستعلام والمرساة (`?`/`#`) ·
 * ④ بادئةُ `/` إلزامية · ⑤ كلُّ مقطعٍ بحروفٍ آمنة وإلّا رُفض المسارُ كلُّه ·
 * ⑥ المقطعُ الرقميُّ يصير `:id`.
 *
 * والرفضُ يُرجع `null` — **ولا يُخمَّن مسارٌ بديل**.
 */
export function canonicalizePagePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  if (raw.length === 0 || raw.length > MAX_PAGE_PATH_LENGTH) return null;

  //  الاستعلامُ والمرساةُ يُقصّان لا يُرفَضان: محتوى صفحةٍ لا يعبر،
  //  لكنّ وجودَهما لا يُبطل معرفةَ أيّ شاشةٍ يقف عليها المستخدم.
  let path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) return null;

  //  شرطةٌ مائلة أخيرة لا تعني صفحةً أخرى.
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  if (path === "") path = "/";
  if (path === "/") return "/";

  const segments = path.split("/").slice(1);
  const canonical: string[] = [];
  for (const segment of segments) {
    //  `//` مزدوجة أو مقطعٌ فارغ ⟶ مسارٌ غيرُ متوقَّع، يُرفَض.
    if (segment === "") return null;
    if (NUMERIC_SEGMENT.test(segment)) { canonical.push(":id"); continue; }
    if (!SAFE_SEGMENT.test(segment)) return null;
    canonical.push(segment);
  }
  return `/${canonical.join("/")}`;
}

/**
 * سياقُ الصفحة الجاهز للنموذج. مسارٌ مرفوضٌ أو غيرُ معروف ⟶ `null` أو
 * تسميةٌ صريحةٌ «صفحة غير معروفة» — **ولا تُخترَع صفحةٌ لم يقلها `App.tsx`**.
 */
export function resolvePageContext(raw: unknown): PageContext | null {
  const path = canonicalizePagePath(raw);
  if (path === null) return null;
  return { path, label: PAGE_LABELS[path] ?? UNKNOWN_PAGE_LABEL };
}

/** أسماءُ المسارات المعروفة — للاختبار وللمراجعة. */
export const KNOWN_PAGE_PATHS: readonly string[] = Object.freeze(Object.keys(PAGE_LABELS));
