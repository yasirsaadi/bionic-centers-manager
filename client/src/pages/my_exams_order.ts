// ترتيبُ قائمة عمل الطبيب — **منطقٌ خالص**، بلا React وبلا شبكة.
//
// ══ لماذا خارج المكوّن ═══════════════════════════════════════════════════
// القاعدة هنا دقيقة وسهلةُ الكسر بإعادة ترتيب سطرين، وقد كُسرت فعلاً: كانت
// الصلة تُحسب أوّلاً ثمّ يُعاد الترتيب بالانتظار **فوقها**، فتمحوها. ونسخُ
// التركيب في اختبارٍ يختبر النسخة لا الصفحة — فالمنطق يخرج ليُنادى مرّةً
// ويُختبَر مرّةً.

import { filterAndRank, type SearchablePatient } from "@shared/patient_search";

export type WaitOrder = "newest" | "oldest";

/**
 * يرتّب صفوف قائمة العمل: **الصلةُ أوّلاً، والانتظارُ كاسرَ تعادل**.
 *
 * ══ الترتيب الداخلي للخطوتين هو كلُّ شيء ═══════════════════════════════
 * ١. يُرتَّب المصدر بالانتظار (الأحدث/الأقدم كما اختار الطبيب).
 * ٢. ثمّ يُرشَّح ويُرتَّب بالصلة فوق ذلك المصدر.
 *
 * و`filterAndRank` **مستقرّ**: يقدّم الأدقّ صلةً، ويترك المتساوين في الصلة
 * على ترتيب مصدرهم — أي على ترتيب الانتظار. فالنتيجة: مطابقةٌ تامّة أقدمُ
 * تسبق تقريبيّةً أحدث، وبين متساويي الصلة يحكم الانتظار.
 *
 * ولو عُكست الخطوتان لأُلغيت الصلة كلّها: الطبيب يكتب الاسم كاملاً صحيحاً
 * فيجده تحت اسمٍ يشبهه لأنه سُجّل اليوم.
 *
 * **وبلا بحث** يُرجع `filterAndRank` نسخةً كما هي، فيبقى ترتيب الانتظار
 * وحده حرفاً بحرف كما كان قبل أن يوجد بحثٌ في هذه الصفحة.
 */
export function rankWorklist<T>(
  rows: readonly T[],
  opts: {
    order: WaitOrder;
    waitingOf: (row: T) => string | null;
    search: string;
    toPatient: (row: T) => SearchablePatient;
  },
): T[] {
  //  نسخةٌ دائماً: مصفوفة react-query مشتركة ولا يجوز ترتيبها في مكانها.
  const byWaiting = [...rows].sort((a, b) => {
    const ta = toMillis(opts.waitingOf(a));
    const tb = toMillis(opts.waitingOf(b));
    return opts.order === "newest" ? tb - ta : ta - tb;
  });
  return filterAndRank(byWaiting, opts.search, opts.toPatient);
}

/** تاريخٌ غير صالحٍ أو غائب = صفر، فيقع في طرفٍ واحدٍ محدّد لا عشوائياً. */
function toMillis(iso: string | null): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}
