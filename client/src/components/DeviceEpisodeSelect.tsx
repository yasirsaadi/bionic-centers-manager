import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

// مُنتقي الجهاز — «أيّ جهازٍ تخصّ هذه العملية؟»
//
// ══ لماذا صار السؤال لازماً ═════════════════════════════════════════════
// المريض صار يملك أكثر من جهازٍ من النوع نفسه. فدفعةٌ أو زيارةٌ بلا هوية
// تصير بعد شهرٍ ديناً معلّقاً بين جهازين لا يُعرف صاحبه — وهو بالضبط
// الالتباس الذي بُني هذا المشروع كلّه لإنهائه.
//
// ولا اختيارَ تلقائيّ لجهازٍ تاريخي: التخمين هنا يكتب في سجلٍّ دائم. وحين
// لا يكون للمريض أجهزة مسجَّلة لا يُعرَض المُنتقي أصلاً — فمرضى الإرث
// يمضون بمسارهم القديم بلا سؤالٍ لا معنى له.

export const UNALLOCATED = "__unallocated__";

export interface DeviceEpisodeOption {
  id: number;
  serviceType: string;
  sequenceNumber: number;
  status: string;
  deliveredAt?: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  awaiting_exam: "بانتظار المعاينة",
  examined: "بانتظار التخصيص",
  in_manufacturing: "قيد التصنيع",
  delivered: "مُسلَّم",
  cancelled: "ملغى",
};

/** وصفٌ يميّز جهازاً عن آخر بلا معرّفات تقنية. */
export function describeEpisode(e: DeviceEpisodeOption): string {
  const parts = [`#${e.sequenceNumber}`, STATUS_LABEL[e.status] ?? e.status];
  if (e.deliveredAt) {
    parts.push(`سُلّم ${new Date(e.deliveredAt).toLocaleDateString("en-GB")}`);
  }
  return parts.join(" · ");
}

/**
 * يقرأ حلقات المريض ويصفّيها بالخدمة والحالات المقبولة لهذا الغرض.
 *
 * ══ **وحالةُ الاستعلام تخرج معه — لا `[]` تُخفي فشلاً أو تحميلاً** ═══════
 * `data?.episodes ?? []` وحدها كانت تجعل «لم يصل ردٌّ بعد» و«لم يصل ردٌّ
 * أبداً» و«وصل ردٌّ حقيقيٌّ بصفر عناصر» **الشيءَ نفسَه** لمن يقرأ
 * `options.length`. فمُستدعياً يبني قراراً على «صفر» (كإخفاء مُنتقي جهاز
 * وافتراض «غير مسجَّل») كان يبنيه أحياناً على استعلامٍ لم يُعرَف مصيرُه
 * بعد. `isSuccess`/`isError`/`isLoading`/`isFetching` تُصدَّر كما هي من
 * `react-query` — فلا يُعاد اختراعُ آلة حالةٍ ثانية تنحرف عن الأولى.
 */
export function useDeviceEpisodes(
  patientId: number | undefined,
  serviceType: "prosthetic" | "medical_support" | null,
  allowedStatuses: readonly string[],
) {
  const query = useQuery<{ episodes: DeviceEpisodeOption[] }>({
    queryKey: [`/api/patients/${patientId}/device-episodes`],
    enabled: Boolean(patientId && serviceType),
  });
  const all = query.data?.episodes ?? [];
  const options = serviceType
    ? all.filter((e) => e.serviceType === serviceType && allowedStatuses.includes(e.status))
    : [];
  return {
    options, hasOptions: options.length > 0,
    isLoading: query.isLoading, isFetching: query.isFetching,
    isSuccess: query.isSuccess, isError: query.isError,
  };
}

interface DeviceEpisodeSelectProps {
  label: string;
  options: DeviceEpisodeOption[];
  value: string;
  onChange: (value: string) => void;
  /** نصّ خيار «القديم/غير المخصَّص» — يختلف بين الدفعة والزيارة والصيانة. */
  unallocatedLabel: string;
  testId?: string;
}

export function DeviceEpisodeSelect({
  label, options, value, onChange, unallocatedLabel, testId,
}: DeviceEpisodeSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid={testId}>
          {/* بلا قيمة افتراضية عمداً: الموظّف يختار، ولا يُختار عنه. */}
          <SelectValue placeholder="اختر الجهاز…" />
        </SelectTrigger>
        <SelectContent>
          {options.map((e) => (
            <SelectItem key={e.id} value={String(e.id)}>
              {describeEpisode(e)}
            </SelectItem>
          ))}
          <SelectItem value={UNALLOCATED}>{unallocatedLabel}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
