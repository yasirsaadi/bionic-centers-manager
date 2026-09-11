// عرضُ بطاقة «تم الحسم» — منطقٌ خالص، بلا React وبلا شبكة.
// (تصحيحٌ لاحقٌ ثانٍ على المرحلة الخامسة)
//
// ══ ما يثبته ═══════════════════════════════════════════════════════════
// كانت `ResolvedCard` تحسب «الخصم» فقط حين `priceKind === "discount"`،
// فبيعٌ مجّانيٌّ (خصمُ ١٠٠٪) كان يُعرَض بخصمٍ **صفر** — كأنّ المريض لم
// يحصل على شيء، بينما الحقيقة أنه حصل على كامل السعر الأصليّ مجّاناً.
//
// **والصيغةُ واحدةٌ للأنواع الثلاثة معاً، بلا تخصيصٍ لأيٍّ منها**:
//   discountAmount = max(٠, الأصليّ − المعتمَد)
// عاديّ: أصلي=نهائي ⟶ صفر · خصمٌ: أصلي>نهائي>٠ ⟶ الفرق · مجّانيّ:
// أصلي>٠ ونهائي=٠ ⟶ الأصليُّ كاملاً. **ولا حاجةَ لقراءة `priceKind`
// إطلاقاً** لحساب الرقم — هو أثرٌ حسابيّ من القيمتين وحدهما.
//
// **وصفٌّ تاريخيّ بلا سعرٍ أصليّ معروف** (`originalPrice == null`) لا
// يُخترَع له رقمٌ ليُحسَب منه خصم — يبقى `null`، والعرضُ الآمن القائم في
// المكوّن (`?? 0`) هو مَن يقرّر كيف يظهر ذلك، لا هذه الدالّة.
export function resolvedSaleDiscount(row: {
  originalPrice: number | null;
  approvedPrice: number;
}): number | null {
  return row.originalPrice != null
    ? Math.max(0, row.originalPrice - row.approvedPrice)
    : null;
}

// ── الترتيبُ — «الأقدم أولاً» / «الأحدث أولاً»، خالصٌ بلا React ───────────
//
// ══ عمداً في الجانب لا في الخادم ══════════════════════════════════════════
// الصفحةُ تحمّل النتيجةَ الكاملة أصلاً (لا `LIMIT` صامت في هذا الطابور —
// راجع `decision_queue_store.ts`)، فترتيبُها في الذاكرة بعد الوصول أرخصُ من
// استعلامٍ ثانٍ، ويجعل تبديلَ الاتجاه فورياً بلا شبكة. **ولا تغييرَ في
// ترتيب الخادم أو التصفّح (`LIMIT`/`cursor`) بهذا التصحيح** — الترتيبُ في
// الجانب وحده، فوق الصفحةِ الكاملة التي تصل كما كانت.
//
// ══ مفتاحان مختلفان، حارسٌ واحد ═══════════════════════════════════════════
// «بانتظار الحسم» يُرتَّب بتاريخ المعاينة (`examSignedAt`)، و«تم الحسم»
// بتاريخ الحسم (`resolvedAt`) — **نفسُ الحقلين اللذين كان الخادمُ يرتّب
// بهما افتراضاً** (`ORDER BY e.signed_at`/`ORDER BY resolved_at`)، فلا
// يتغيّر مصدرُ الحقيقة، فقط مَن يطبّق `DESC`.
export type SortDirection = "asc" | "desc";

// ══ افتراضٌ مستقلٌّ لكلّ تبويب — لا افتراضٌ مشترك (تصحيحٌ لاحق) ══════════
// كان ضابطُ الترتيب الواحد يحمل حالةً مشتركة بقيمةٍ ابتدائية واحدة، فقَلَب
// ذلك افتراضَ «تم الحسم» من «الأحدث حسماً أوّلاً» القديم (`resolvedAt
// DESC`) إلى «الأقدم أوّلاً» بمجرّد إضافة الضابط — **بلا أن يطلب أحدٌ هذا
// التغيير**. فصار لكلّ تبويبٍ افتراضُه الأصليّ بحرفه، بدالّةٍ واحدة تقرأ
// التبويبَ لا حالةً محزومة: «بانتظار الحسم» يبقى الأقدمَ أوّلاً كما كان
// دائماً، و«تم الحسم» يبقى الأحدثَ حسماً أوّلاً كما كان دائماً. **والضابطُ
// يبقى واحداً مرئياً**: القيمةُ المعروضة والقابلةُ للتغيير تخصّ التبويبَ
// الحاليّ وحده — تبديلُها لا يمسّ افتراضَ التبويب الآخر، وكلا الاتجاهين
// يبقيان متاحين في كلا التبويبين.
export type DecisionQueueTab = "waiting" | "resolved";

/** الافتراضُ القديم بعينه لكلّ تبويب — لا قيمةٌ واحدة تُفرَض على الاثنين. */
export function defaultSortDirectionFor(tab: DecisionQueueTab): SortDirection {
  return tab === "waiting" ? "asc" : "desc";
}

/**
 * **والفراغُ يبقى أخيراً دائماً** — بصرف النظر عن الاتجاه: صفٌّ بلا تاريخٍ
 * معروف (نادرٌ، لكنّه ممكن) لا يقفز إلى الصدارة لمجرّد عكس الترتيب؛ هذا هو
 * معنى «متأخّرٌ في كلّ الأحوال» لا «آخر الأقدم» أو «آخر الأحدث».
 *
 * و`followupId` هو **كاسرُ التعادل الثابت**: صفّان بنفس اللحظة (أو كلاهما
 * بلا تاريخ) يُرتَّبان بمعرّفهما بنفس اتجاه الترتيب — فـ«الأقدم أولاً»
 * تعني أقدمَ معرّفٍ أوّلاً بين المتعادلين أيضاً، بلا حسابٍ ثانٍ.
 */
function sortByTimeKey<T extends { followupId: number }>(
  rows: T[], keyOf: (row: T) => string | null | undefined, direction: SortDirection,
): T[] {
  const dir = direction === "asc" ? 1 : -1;
  const timeOf = (row: T): number | null => {
    const v = keyOf(row);
    if (!v) return null;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? t : null;
  };
  return [...rows].sort((a, b) => {
    const ta = timeOf(a);
    const tb = timeOf(b);
    if (ta === null && tb === null) return (a.followupId - b.followupId) * dir;
    if (ta === null) return 1;
    if (tb === null) return -1;
    if (ta !== tb) return (ta - tb) * dir;
    return (a.followupId - b.followupId) * dir;
  });
}

/** ترتيبُ صفوف «بانتظار الحسم» — `examSignedAt`، و`followupId` كاسرَ تعادل. */
export function sortWaitingRows<T extends { followupId: number; examSignedAt: string | null }>(
  rows: T[], direction: SortDirection,
): T[] {
  return sortByTimeKey(rows, (r) => r.examSignedAt, direction);
}

/** ترتيبُ صفوف «تم الحسم» — `resolvedAt`، و`followupId` كاسرَ تعادل. */
export function sortResolvedRows<T extends { followupId: number; resolvedAt: string | null }>(
  rows: T[], direction: SortDirection,
): T[] {
  return sortByTimeKey(rows, (r) => r.resolvedAt, direction);
}
