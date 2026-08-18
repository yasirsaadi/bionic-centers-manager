import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// «جهاز جديد» — تأكيدٌ واحد، بلا مال ولا خبير ولا موعد.
//
// ══ لماذا نافذة تأكيد لا نموذج ══════════════════════════════════════════
// فتحُ طلب جهازٍ جديد قرارٌ **إداريّ خالص**: يقول إن المريض عاد يريد جهازاً
// آخر، ولا شيء غير ذلك. والسعر يقرّره الطبيب في معاينته ثم يعتمده
// الاستعلامات في «تخصيص»، والخبير والموعد يأتيان مع التخصيص أيضاً. فسؤالُ
// أيٍّ منها هنا يطلب من الموظّف رقماً لا يملكه بعد — وأسوأ منه أن يخترعه.
//
// والنتيجة حلقةٌ بحالة «بانتظار معاينة»: تظهر للطبيب في قائمة عمله، ويمضي
// المسار من هناك كما بُني في مراحله السابقة.

interface NewDeviceEpisodeModalProps {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const LABEL = {
  prosthetic: "طرف صناعي جديد",
  medical_support: "مسند طبي جديد",
} as const;

export function NewDeviceEpisodeModal({
  patientId, serviceType, open, onOpenChange,
}: NewDeviceEpisodeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/patients/${patientId}/device-episodes`, {
        serviceType,
      });
      return await res.json();
    },
    onSuccess: (episode: any) => {
      toast({
        title: "تم فتح طلب الجهاز",
        description: `${LABEL[serviceType]} — بانتظار معاينة الطبيب`,
      });
      // الحلقات نفسها، وقوائم انتظار الطبيب، وصفحة المريض: الطلب الجديد
      // يظهر في الثلاثة فوراً، فلا يبقى الموظّف يعيد التحميل ليصدّق.
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/medical/worklist"] });
      queryClient.invalidateQueries({ queryKey: [`/api/medical/patients/${patientId}/exams`] });
      queryClient.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/patients"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      // الخادم يبقى صاحب القرار: قد تكون حلقةٌ فُتحت من جهازٍ آخر بين
      // تحميل الصفحة والضغط، فتصل 409 برسالتها — تُعرَض كما هي.
      toast({
        title: "تعذّر فتح طلب الجهاز",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent dir="rtl">
        <AlertDialogHeader>
          <AlertDialogTitle>{LABEL[serviceType]}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-right">
            <span className="block">
              سيُفتَح طلب جهاز جديد على نفس حالة المريض، ولن يُمَسّ جهازه السابق ولا سجلّه.
            </span>
            <span className="block text-xs">
              الخطوة التالية معاينة الطبيب، ثم تُحدَّد الكلفة والخبير في «تخصيص وإسناد خبير».
            </span>
            {/* التوجيه يقع مع الحفظ لا بزرٍّ لاحق — والسطر يقول ذلك صراحةً
                كي لا يبحث الموظّف عن خطوةٍ ليست عليه. */}
            <span className="block text-xs text-primary">
              ويُرسَل طلبُ معاينةٍ كاملة إلى الطبيب تلقائياً مع الحفظ — لا حاجة لخطوة أخرى.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={mutation.isPending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); mutation.mutate(); }}
            disabled={mutation.isPending}
            data-testid="confirm-new-device"
          >
            {mutation.isPending ? "جارٍ الفتح…" : "فتح الطلب"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
