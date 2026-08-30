import { useQuery } from "@tanstack/react-query";

interface EligibleRow {
  serviceType: "prosthetic" | "medical_support";
}

interface Props {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  onChoose: () => void;
}

/**
 * **زرُّ «عاد للشراء»** — يظهر أوّلاً في قسمه، وفقط حين توجد حلقةٌ مؤهَّلة
 * فعلاً من الخادم (لا تخمينَ من أعلام المريض ولا نصٍّ حرّ). نفسُ نقطة
 * الأهليّة ونفسُ مفتاح الاستعلام اللذين تستعملهما `ReturnToPurchaseDialog` —
 * فلا نداءَ شبكةٍ ثانٍ حين يُفتَح الحوارُ بعد الضغط، الاستعلامُ مشتركٌ
 * بمفتاحه.
 *
 * ══ ملفٌّ مستقلٌّ عمداً ═════════════════════════════════════════════════
 * `reception_routing.ts` **موزِّعٌ خالصٌ بلا شبكة** (مُختبَرٌ معمارياً —
 * `client/src/components/reception_routing.test.ts`)، و`PatientServiceLauncher`
 * نفسُه **بلا `fetch` ولا `apiRequest` ولا `useMutation`** بنفس الاختبار.
 * فهذا الزرُّ وحده يحتاج الشبكةَ ليقرّر ظهوره، وبقاؤه في ملفٍّ منفصل يبقي
 * الاثنين خالصَين كما كانا — لا استثناءً يُدَسّ داخل أيٍّ منهما.
 */
export function ReturnToPurchaseRoutingChoice({ patientId, serviceType, onChoose }: Props) {
  const { data } = useQuery<{ rows: EligibleRow[] }>({
    queryKey: [`/api/followups/patient/${patientId}/return-to-purchase-eligible`],
  });

  const eligible = (data?.rows ?? []).some((r) => r.serviceType === serviceType);
  if (!eligible) return null;

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
