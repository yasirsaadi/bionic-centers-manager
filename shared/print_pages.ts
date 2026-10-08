// **تقطيعُ سطور ورقةٍ طويلة على صفحات A4 مرقّمة** (ملاحظةُ المالك ٢٠٢٦-١٠-٠٨: «في القوائم الطويلة جدّاً كيف ستُطبع الصفحة؟ يجب أن
// تكون بأرقام ليعرف المريض») — منطقٌ خالص، بلا شاشةٍ ولا قاعدة. الشاشةُ تقيس ارتفاعَ كلّ سطرٍ وما حوله، وهذه تقرّر كم سطراً في كلّ صفحة.
//
// الصفحةُ الأولى تحمل الترويسةَ والبيانات فمساحتُها أقلّ (`first`)، والتاليةُ رأسٌ مختصر (`rest`)، والأخيرةُ يجب أن يتّسع فيها مع سطورها
// ذيلُها (`tail` — المجموع). وسطرٌ أطولُ من صفحةٍ كاملة يأخذ صفحتَه وحدَه ولا يُفقَد. ولا صفحةَ أخيرةٌ بلا سطرٍ مع المجموع ما أمكن.

export interface PageRoom {
  /** ما يتّسع للسطور في الصفحة الأولى. */
  first: number;
  /** وما يتّسع لها في كلّ صفحةٍ بعدها. */
  rest: number;
  /** ذيلُ الصفحة الأخيرة (المجموع) — يتّسع مع سطورها. */
  tail: number;
}

/** عددُ السطور في كلّ صفحة، بالترتيب — ومجموعُها عددُ السطور كلّها. وقائمةٌ فارغة ⟵ صفحةٌ واحدة بلا سطور. */
export function packRowsIntoPages(heights: readonly number[], room: PageRoom): number[] {
  const pages: number[] = [];
  let i = 0;
  for (;;) {
    const cap = pages.length === 0 ? room.first : room.rest;
    let used = 0;
    let n = 0;
    while (i + n < heights.length && used + heights[i + n] <= cap) { used += heights[i + n]; n++; }
    if (n === 0 && i < heights.length) { n = 1; used = heights[i]; }
    if (i + n >= heights.length) {
      //  آخرُ السطور هنا — والذيلُ يجب أن يتّسع معها؛ وإلّا ينتقل آخرُ سطرٍ إلى صفحةٍ تالية فلا يقف المجموعُ وحدَه.
      if (used + room.tail <= cap) { pages.push(n); return pages; }
      if (n > 1) { pages.push(n - 1); i += n - 1; continue; }
      pages.push(n);
      if (n === 0) return pages;
      pages.push(0);
      return pages;
    }
    pages.push(n);
    i += n;
  }
}
