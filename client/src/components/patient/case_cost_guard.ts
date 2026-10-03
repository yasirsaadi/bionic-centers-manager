// تأكيدُ قلم كلفة القسم حين يكون الرقمُ الجديد أقلَّ من أسعار الأجهزة المُباعة فيه (§4.br).
// تنبيهٌ لا منع: «نعم» يحفظ كما يحفظ القلمُ اليوم بحرفه — لا شيء في الخادم تغيّر.

/** المُباعُ الحيّ وحده: قيد التصنيع أو مسلَّم — كأرضيّة التصحيح الإداريّ (`standingCostOf`). */
export const SOLD_EPISODE_STATUSES = ["in_manufacturing", "delivered"] as const;

export interface EpisodeLike { caseId: number; status: string; agreedCost: number }

/** مجموعُ أسعار الأجهزة المُباعة على هذا القسم بعينه. */
export function soldDevicesTotal(episodes: readonly EpisodeLike[] | undefined, caseId: number): number {
  return (episodes ?? [])
    .filter((e) => e.caseId === caseId
      && (SOLD_EPISODE_STATUSES as readonly string[]).includes(e.status)
      && e.agreedCost > 0)
    .reduce((s, e) => s + e.agreedCost, 0);
}

/** يُسأل المستخدمُ قبل الحفظ؟ — فقط حين يوجد مُباعٌ والرقمُ الجديد تحته. */
export function needsBelowSoldConfirm(newCost: number, soldTotal: number): boolean {
  return soldTotal > 0 && newCost < soldTotal;
}
