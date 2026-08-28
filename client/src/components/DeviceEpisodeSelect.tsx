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
 * ══ حالةُ الاستعلام كاملةً — لا `options`/`hasOptions` وحدهما ═══════════
 * كانت هذه الدالّة تُرجع القائمةَ المصفّاة فقط، فلا يفرّق المستدعي بين
 * «لا أجهزةَ فعلاً» و«ما زال يُحمَّل» و«فشل الطلب» — الثلاثةُ `hasOptions:
 * false` بصوتٍ واحد. ومَن يبني عليها زرَّ حفظٍ (الصيانةُ المبسّطة، المرحلة
 * الثالثة) يحتاج الفرقَ: تحميلٌ يُعطِّل الحفظَ لا يُسقِط الخيارَ، وفشلٌ
 * يُظهر رسالةً لا صفراً صامتاً، و**استقرارٌ ناجحٌ بصفر** هو وحده «غير
 * مسجَّل» الحقيقيّ.
 *
 * **`options`/`hasOptions` بقيتا كما هما بحرفهما** — `PaymentModal.tsx` و
 * `VisitModal.tsx` يستهلكانهما فقط، والحقولُ الجديدة إضافيةٌ لا تُغيّر
 * شكلهما.
 */
export function useDeviceEpisodes(
  patientId: number | undefined,
  serviceType: "prosthetic" | "medical_support" | null,
  allowedStatuses: readonly string[],
) {
  const { data, isLoading, isFetching, isError, isSuccess, refetch } =
    useQuery<{ episodes: DeviceEpisodeOption[] }>({
      queryKey: [`/api/patients/${patientId}/device-episodes`],
      enabled: Boolean(patientId && serviceType),
    });
  const all = data?.episodes ?? [];
  const options = serviceType
    ? all.filter((e) => e.serviceType === serviceType && allowedStatuses.includes(e.status))
    : [];
  return {
    options, hasOptions: options.length > 0,
    //  `enabled: false` تُبقي `isLoading` صحيحةً بلا جلبٍ فعليّ — فلا
    //  تُقرأ «تحميلاً» ما لم يكن مريضٌ وخدمةٌ معلومَين فعلاً.
    isLoading: Boolean(patientId && serviceType) && isLoading,
    isFetching: Boolean(patientId && serviceType) && isFetching,
    isError, isSuccess, refetch,
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
