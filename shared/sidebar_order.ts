// **ترتيبُ الشريط الجانبيّ لكلّ حساب** (ترحيل ١٤٦، §4.ed — ٢٠٢٦-١٠-١٤).
//
// طلبُ المالك: «ممكن تخليني ارتب فقرات القائمة الجانبية مثل ما اريد اني واي موظف يدخل بحسابه بحيث اصعد الي اريده من فقرة وانزل الي
// استخدمه قليل». فكلُّ حسابٍ يرتّب فقراتِه بنفسه، ويُحفظ الترتيبُ على الحساب (`system_users.sidebar_order`) فيتبعه على كلّ جهاز.
//
// **الترتيبُ عرضٌ لا صلاحية**: قائمةُ مساراتٍ وحدها، والشريطُ يصفّي بعدها بقواعده كما كان — فمسارٌ في الترتيب لا يُظهر فقرةً
// لا يملكها صاحبُه، ومسارٌ لم يعد في الشريط يُهمَل. وفقرةٌ جديدة تُضاف بعد اليوم تظهر بجانب جارتها في الترتيب الأصليّ — لا آخرَ القائمة.
//
// دوالُّ خالصة يستوردها الخادمُ (التحقّقُ قبل الحفظ) والواجهةُ (التطبيقُ والتحريك) — فلا قاعدتان.

/** أقصى عددٍ للمسارات المحفوظة — الشريطُ اليوم نحو أربعين فقرة، والحدُّ يمنع جسماً ضخماً لا يحتاجه أحد. */
export const SIDEBAR_ORDER_MAX = 120;
/** أقصى طولٍ للمسار الواحد. */
export const SIDEBAR_HREF_MAX = 120;

/** **أهذا مسارُ فقرة؟** — نصٌّ يبدأ بـ`/` بلا مسافاتٍ ولا `//` (لا عنوانَ خارجيّ) وفي حدّ الطول. */
export function isSidebarHref(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= SIDEBAR_HREF_MAX && v.startsWith("/") && !v.startsWith("//")
    && !/\s/.test(v);
}

/**
 * **قراءةُ الترتيب المرسَل أو المحفوظ** — قائمةُ مساراتٍ بلا تكرار (الأوّلُ يبقى)، أو `null` = الترتيبُ الأصليّ.
 * يُرجع `undefined` لما لا يُقبل (ليس قائمة، أو فيه غيرُ مسار، أو فوق الحدّ) — فيردّه الخادمُ ٤٠٠ ولا يحفظ نصفَه.
 */
export function normalizeSidebarOrder(raw: unknown): string[] | null | undefined {
  if (raw === null) return null;
  if (!Array.isArray(raw) || raw.length > SIDEBAR_ORDER_MAX) return undefined;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of raw) {
    if (!isSidebarHref(v)) return undefined;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  //  قائمةٌ فارغة لا ترتيبَ فيها — كالأصليّ.
  return out.length ? out : null;
}

/** المحفوظُ كما خرج من القاعدة — وما لا يُقرأ ⟵ الأصليّ، لا خطأ يُسقط الشريط. */
export function readSidebarOrder(raw: unknown): string[] | null {
  return normalizeSidebarOrder(raw) ?? null;
}

/**
 * **ترتيبُ الفقرات بترتيب الحساب** — دالّةٌ خالصة لا تُسقط فقرةً ولا تضيف.
 *  • ما في الترتيب يأتي بترتيبه.
 *  • وما ليس فيه (فقرةٌ أُضيفت بعد حفظه) يُدرَج **بعد أقرب جارةٍ تسبقه في الترتيب الأصليّ** — وبلا جارةٍ سابقة ففي الأوّل.
 *  • ومسارٌ في الترتيب لا فقرةَ له يُهمَل.
 */
export function applySidebarOrder<T extends { href: string }>(items: readonly T[], order: readonly string[] | null | undefined): T[] {
  if (!order || !order.length) return items.slice();
  const byHref = new Map<string, T>();
  for (const it of items) if (!byHref.has(it.href)) byHref.set(it.href, it);
  const placed: T[] = [];
  const done = new Set<string>();
  for (const h of order) {
    const it = byHref.get(h);
    if (it && !done.has(h)) { placed.push(it); done.add(h); }
  }
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (done.has(it.href)) continue;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const k = placed.indexOf(items[j]);
      if (k >= 0) { at = k + 1; break; }
    }
    placed.splice(at, 0, it);
    done.add(it.href);
  }
  return placed;
}

export type SidebarMove = "up" | "down" | "top";

/**
 * **تحريكُ فقرةٍ بين الظاهر** — `full` الترتيبُ الكامل لكلّ الفقرات (ومنها المخفيّةُ الآن: شارةٌ صفرٌ أو صلاحيةٌ غائبة)، و`visible` ما يراه
 * صاحبُه بترتيبه. «لأعلى» تضعها قبل الظاهرة التي فوقها، و«لأسفل» بعد التي تحتها، و«للأعلى تماماً» قبل أوّل ظاهرة — والمخفيّاتُ تبقى
 * في أماكنها فلا تقفز حين تعود. يُرجع الترتيبَ الكاملَ الجديد، أو `null` إن لم يتحرّك شيء (الأولى لأعلى، أو الأخيرة لأسفل).
 */
export function moveSidebarItem(full: readonly string[], visible: readonly string[], href: string, dir: SidebarMove): string[] | null {
  const vi = visible.indexOf(href);
  if (vi < 0 || !full.includes(href)) return null;
  const anchor = dir === "up" ? visible[vi - 1] : dir === "down" ? visible[vi + 1] : visible[0];
  if (anchor === undefined || anchor === href || !full.includes(anchor)) return null;
  const rest = full.filter((h) => h !== href);
  const ai = rest.indexOf(anchor);
  rest.splice(dir === "down" ? ai + 1 : ai, 0, href);
  return rest;
}
