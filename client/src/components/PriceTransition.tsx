// انتقالُ السعر «الأصلي ← النهائي» — **معزولٌ عن اتجاه الصفحة**.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// الصفحةُ عربيةٌ من اليمين لليسار، والسهمُ بين رقمين نصٌّ محايدُ الاتجاه.
// فيقلبه محرّكُ الاتجاه بصرياً: يُكتب «٢٥٬٠٠٠ ⟶ ١٥٬٠٠٠» فيُقرأ على الشاشة
// «١٥٬٠٠٠ ← ٢٥٬٠٠٠» — أي أن السعر **ارتفع**. وهذا عكسُ الحقيقة تماماً في
// شاشةِ خصم، ورآه المالك حيّاً أثناء التجربة.
//
// ══ والحلُّ عزلٌ لا تغييرُ اتجاه الصفحة ════════════════════════════════
// الثلاثةُ (الأصلي · السهم · النهائي) وحدةٌ واحدة تُرسَم من اليسار لليمين
// دائماً، معزولةً بـ`isolate` فلا تتسرّب إلى ما حولها ولا يتسرّب إليها.
// وبقيّةُ السطر عربيةٌ كما هي.

export function PriceTransition({
  from, to, testId, className = "",
}: {
  from: number;
  to: number;
  testId?: string;
  className?: string;
}) {
  const money = (n: number) => Number(n || 0).toLocaleString("en-US");
  return (
    <span
      dir="ltr"
      style={{ unicodeBidi: "isolate", display: "inline-block" }}
      className={`font-mono whitespace-nowrap ${className}`}
      data-testid={testId}
    >
      <b>{money(from)}</b>
      <span aria-hidden="true" className="mx-1">→</span>
      <b>{money(to)}</b>
    </span>
  );
}
