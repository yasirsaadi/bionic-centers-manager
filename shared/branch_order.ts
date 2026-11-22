//  **ترتيبُ الفروع في كلّ قائمة** (طلبُ المالك ٢٠٢٦-١١-٢٢): «بغداد أطراف» ثمّ «مركز بغداد للعلاج الطبيعي» ثمّ كربلاء ثمّ ذي قار ثمّ الموصل،
//  وآخرُها المغلقُ مؤقتاً (كركوك). بالاسم لا بالرقم — بنمط `shared/cash_book.ts` — فإعادةُ التسمية لا تكسره، وفرعٌ جديدٌ غيرُ معروف
//  يأتي بعد المعروفة بترتيب رقمه. والقاعدةُ الواحدة يقرؤها الخادمُ (`storage.getBranches`) وشاشةُ الدخول.
const RANKS: Array<(n: string) => boolean> = [
  (n) => n.includes("بغداد") && !n.includes("للعلاج الطبيعي"),
  (n) => n.includes("للعلاج الطبيعي"),
  (n) => n.includes("كربلاء"),
  (n) => n.includes("ذي قار"),
  (n) => n.includes("موصل"),
  (n) => n.includes("كركوك"),
];

export function branchDisplayRank(name: string | null | undefined): number {
  const n = String(name ?? "");
  const i = RANKS.findIndex((f) => f(n));
  return i === -1 ? RANKS.length : i;
}

/** يرتّب نسخةً ولا يمسّ الأصل: المفتوحُ قبل المغلق مؤقتاً، ثمّ ترتيبُ الاسم، ثمّ الرقم. */
export function sortBranchesForDisplay<T extends { id: number; name: string; temporarilyClosed?: boolean | null }>(list: T[]): T[] {
  return [...list].sort((a, b) =>
    (Number(!!a.temporarilyClosed) - Number(!!b.temporarilyClosed))
    || (branchDisplayRank(a.name) - branchDisplayRank(b.name))
    || (a.id - b.id));
}
