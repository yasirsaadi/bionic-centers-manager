interface Props {
  serviceType: "prosthetic" | "medical_support";
  onChoose: () => void;
}

/**
 * **زرُّ «عاد للشراء»** — يظهر دائماً في قسمه (أطرافٍ أو مساند)، **بلا
 * استعلام أهليّةٍ يقرّر وجودَه** (تصحيحٌ لاحق، ٢٠٢٦-٠٩-٠٨).
 *
 * ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
 * كان الزرُّ يستطلع نقطة الأهليّة نفسَها التي تستطلعها `ReturnToPurchaseDialog`
 * ليقرّر ظهورَه، فيغيب كلّياً حين لا تُرجع صفاً — فيرى الموظّفُ قسماً بلا
 * بابٍ كان يعرفه، ولا يُقال له لماذا. فصار زرّاً بسيطاً دائماً، والأهليّةُ
 * الفعلية (قراءةً وحسماً) تبقى من الخادم وحده — لكن **داخل الحوار** الذي
 * يفتحه هذا الزرّ، لا هنا. حوارٌ يفتح ويقول صراحةً «لا يوجد ما يؤهَّل»
 * أصدقُ من بابٍ يختفي بصمت.
 *
 * ══ ملفٌّ مستقلٌّ عمداً ═════════════════════════════════════════════════
 * `reception_routing.ts` **موزِّعٌ خالصٌ بلا شبكة** (مُختبَرٌ معمارياً —
 * `client/src/components/reception_routing.test.ts`)، و`PatientServiceLauncher`
 * نفسُه **بلا `fetch` ولا `apiRequest` ولا `useMutation`** بنفس الاختبار.
 * فبقاءُ هذا الزرّ في ملفٍّ منفصل يبقي الاثنين خالصَين كما كانا — ولو صار
 * هذا الزرُّ نفسُه بلا شبكةٍ الآن أيضاً.
 */
export function ReturnToPurchaseRoutingChoice({ serviceType, onChoose }: Props) {
  return (
    <button
      type="button"
      onClick={onChoose}
      data-testid={`reception-routing-${serviceType}-return_to_purchase`}
      className="w-full text-right rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2.5
        transition-colors hover:bg-amber-50 hover:border-amber-400"
    >
      <div className="text-sm font-medium text-amber-800">عاد للشراء</div>
    </button>
  );
}
