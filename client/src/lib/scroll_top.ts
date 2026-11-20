//  **الصفحةُ التالية تبدأ من أوّلها** (طلبُ المالك ٢٠٢٦-١١-٢٠: «حين أصل نهاية أيّ قائمة وأضغط التالي فالصفحة الجديدة تبقى في النهاية»).
//  الذي يتمرّر في التطبيق ليس النافذةَ بل `main.app-main` (`App.tsx` — `overflow-y-auto h-screen`)، فكان `window.scrollTo` بلا أثر.
//  فهذه تمرّر الحاويةَ والنافذةَ معاً (النافذةُ لصفحةٍ خارج الإطار كالطباعة) — بلا حركةٍ لمن ضبط جهازَه على «تقليل الحركة».
export function scrollPageToTop(): void {
  if (typeof window === "undefined") return;
  let reduce = false;
  try { reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false; } catch { /* متصفّحٌ قديم */ }
  const behavior: ScrollBehavior = reduce ? "auto" : "smooth";
  document.querySelectorAll<HTMLElement>(".app-main").forEach((el) => el.scrollTo({ top: 0, behavior }));
  window.scrollTo({ top: 0, behavior });
}
