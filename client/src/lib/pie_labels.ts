// **تسمياتُ المخطّطات الدائرية لا تتراكب** (قرارُ المالك ٢٠٢٦-١٠-٠٦، لقطةُ «توزيع المصروفات»): شرائحُ صغيرةٌ كثيرة كانت تكتب
// أسماءها فوق بعضها حتى لا يُقرأ شيء. فثلاثُ قواعد في موضعٍ واحد لكلّ مخطّطٍ دائريّ:
//   ١) لا تسميةَ على شريحةٍ أصغرَ من ٥٪ — اسمُها ومبلغُها في التلميح وفي القائمة بجانب المخطّط.
//   ٢) والأبوابُ الكثيرة تُبقي أكبرَها وتجمع الباقي شريحةً واحدة «أبوابٌ صغيرة» — والقائمةُ تبقى كاملة.
//   ٣) والبابُ بلا لونٍ مخصّص يأخذ لوناً مميَّزاً من لوحةٍ ثابتة بدل رماديٍّ واحد للجميع.

export const MIN_LABEL_PERCENT = 0.05;

/** دالّةُ `label` لمخطّط Recharts: تسميةٌ للشريحة الكبيرة وحدها. */
export function bigSliceLabel(format: (p: { name: string; value: number; percent: number }) => string, min = MIN_LABEL_PERCENT) {
  return (p: { name?: string; value?: number; percent?: number }) =>
    (p.percent ?? 0) >= min ? format({ name: String(p.name ?? ""), value: Number(p.value ?? 0), percent: p.percent ?? 0 }) : "";
}

export const SMALL_SLICES_LABEL = "أبوابٌ صغيرة";

/** أكبرُ `keep` شرائح كما هي، والباقي شريحةٌ واحدة — للمخطّط وحده؛ والقائمةُ تُعرض من البيانات الكاملة. */
export function groupSmallSlices<T extends { name: string; value: number; color: string }>(data: T[], keep = 7): { name: string; value: number; color: string }[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= keep + 1) return sorted;
  const rest = sorted.slice(keep).reduce((s, d) => s + d.value, 0);
  return [...sorted.slice(0, keep), { name: SMALL_SLICES_LABEL, value: rest, color: "#cbd5e1" }];
}

const PALETTE = ["#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4", "#ef4444", "#14b8a6", "#f97316", "#a855f7", "#84cc16", "#eab308", "#0ea5e9", "#d946ef", "#22c55e", "#f43f5e"];
/** لونٌ ثابتٌ لاسمٍ بلا لونٍ مخصّص — من الاسم نفسِه، فلا يتغيّر بين تحميلٍ وآخر. */
export function colorForName(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
