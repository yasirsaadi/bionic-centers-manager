// **عينُ الخصوصية في لوحة التحكم** (طلبُ المالك ٢٠٢٦-١٠-١٠): «عينٌ جنبَ الوارد المباشر تُخفي اللوحةَ كلَّها برموزٍ كما في البنوك، كي لا يراها
// شخصٌ يجلس جنبي وأنا أشرح له موضوعاً في البرنامج». للمسؤول العام وحده (هو مَن يرى الوارد المباشر)، وتُخفي **كلَّ رقمٍ في اللوحة**: الوارد
// المباشر لكلّ فرعٍ ومجموعُه، والإحصاءاتُ العامّة واليومية، والإيرادات — **وأسماءَ آخر المرضى المسجَّلين**. ويُحفَظ الاختيارُ على الجهاز لكلّ
// مستخدم (تبقى مخفيّةً حين يعود)، فلا يرث حسابٌ آخر على الجهاز نفسِه قناعَ غيره.
import { useCallback, useEffect, useState } from "react";

/** رمزُ الإخفاء — كما في تطبيقات البنوك. */
export const PRIVACY_MASK = "••••••";

/** القيمةُ كما تُعرض: مخفيّةً ⟵ الرموز (والعملةُ بعدها إن وُجدت)، وإلّا كما هي. */
export function masked(hidden: boolean, value: string | number, unit?: string): string {
  if (!hidden) return unit ? `${value} ${unit}` : String(value);
  return unit ? `${PRIVACY_MASK} ${unit}` : PRIVACY_MASK;
}

const keyOf = (userId: number) => `dashboard-privacy:${userId}`;

function readHidden(userId: number | null | undefined): boolean {
  if (!userId) return false;
  try { return localStorage.getItem(keyOf(userId)) === "1"; } catch { return false; }
}

/** حالُ العين لهذا المستخدم على هذا الجهاز — و`null` (غيرُ المسؤول) ⟵ لا إخفاءَ أبداً. */
export function useDashboardPrivacy(userId: number | null | undefined): { hidden: boolean; toggle: () => void } {
  const [hidden, setHidden] = useState(() => readHidden(userId));
  useEffect(() => { setHidden(readHidden(userId)); }, [userId]);
  const toggle = useCallback(() => {
    if (!userId) return;
    setHidden((h) => {
      const next = !h;
      try { localStorage.setItem(keyOf(userId), next ? "1" : "0"); } catch { /* وضعٌ خاصّ أو تخزينٌ محجوب — يبقى للجلسة وحدها */ }
      return next;
    });
  }, [userId]);
  return { hidden: Boolean(userId) && hidden, toggle };
}
