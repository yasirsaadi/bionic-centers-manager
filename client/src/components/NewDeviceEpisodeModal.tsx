import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  requestedItemOptions, requestedItemLabel, isRequestedItem, FULL_DEVICE,
  type RequestedItem,
} from "@shared/prosthetic_parts";
import { RequiredPatientDataDialog } from "./RequiredPatientDataDialog";
import { AdministrativeReversalDialog } from "./AdministrativeReversalDialog";
import { activeOperationFocus } from "./device_flow_resume";
import { useBranchSession } from "@/components/BranchGate";

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
//
// ══ **ومسارُها «معاينة» دائماً — بلا سؤال** ═════════════════════════════
// هذه النافذةُ لا تُفتَح إلّا من «يحتاج معاينة طبية» في مُوجِّه سبب الحضور.
// وكانت تسأل بعده «هل تحتاج هذه العملية معاينة طبية؟» — سؤالٌ أجابه
// الموظّفُ بضغطته قبل لحظة، وتبديلُ جوابه هنا إلى «بلا معاينة» **لا يقول
// أهو بيعُ جزءٍ أم صيانة**، فيفتح حلقةً بمسارٍ ناقص المعنى تسبق تسجيل
// العملية الصحيحة (وهو ما وقع في الإنتاج فعلاً).
//
// فالمسارُ ثابتٌ ويُعرَض ثابتاً، وتصحيحُ الوجهة من زرّ **«تغيير سبب
// الحضور»**: يغلق هذه النافذة **بلا فتح ولا إلغاء أيّ حلقة** ويعيد فتح
// المُوجِّه نفسِه ليختار الموظّفُ بيعاً أو صيانةً بدقّة.

interface NewDeviceEpisodeModalProps {
  patientId: number;
  serviceType: "prosthetic" | "medical_support";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * ما اختاره الموظّفُ قبل أن يُردّ لنقصِ الملفّ — يُعاد إليه عند العودة.
   *
   * **ولا تحفظه هذه النافذة**: حفظُ التعديل يغيّر المسار فتُفكَّك النافذةُ
   * والموزِّعُ والصفحةُ معاً. فمن يحفظ هو مَن يبقى، وهذه تُملأ منه.
   */
  initialRequestedItem?: string;
  /**
   * يُغلق هذه النافذة **بلا فتح ولا إلغاء أيّ حلقة** ويعيد فتح مُوجِّه
   * «سبب الحضور» ليختار الموظّفُ سبباً آخر بدقّة.
   */
  onChangeReason?: () => void;
  /**
   * يفتح «تعديل مريض» حين ينقص الملفّ، **حاملاً الاختيارَ إلى مَن يحفظه**.
   *
   * وبلا هذا كان الموظّفُ يُردّ برمزٍ إنجليزيّ، ثمّ يبحث عن الشاشة، ثمّ
   * يعود ليبدأ الطلبَ من أوّله.
   */
  onEditPatient?: (requestedItem: RequestedItem | "") => void;
}

//  ══ «طرف صناعي جديد **أو جزء جديد**» ═══════════════════════════════════
//  المريضُ العائد نادراً ما يطلب طرفاً كاملاً: تنكسر ركبةٌ أو يبلى غلاف.
//  والاسمُ القديم كان يقول له إن هذا ليس بابَه، فيذهب إلى «صيانة» — وشراءُ
//  قطعةٍ جديدة **بيعٌ لا صيانة**: له سعرُه واعتمادُه وأمرُ تصنيعه.
const LABEL = {
  prosthetic: "طرف صناعي جديد أو جزء جديد",
  medical_support: "مسند طبي جديد",
} as const;

export function NewDeviceEpisodeModal({
  patientId, serviceType, open, onOpenChange, initialRequestedItem,
  onChangeReason, onEditPatient,
}: NewDeviceEpisodeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  //  **بلا اختيارٍ مسبق**: «طرف كامل» افتراضاً كان سيمرّ بضغطةٍ واحدة على
  //  مريضٍ يريد ركبة — والفرقُ في الثمن هائل. فالسؤال يُطرَح ويُجاب.
  //
  //  والاستئنافُ وحده يملأه: `initialRequestedItem` يأتي من مالكِ الحالة
  //  الذي **لا يُفكَّك** عند تغيّر المسار، فيعود الموظّفُ إلى «قالب» كما
  //  تركه لا إلى قائمةٍ فارغة.
  const resumed = (isRequestedItem(initialRequestedItem)
    ? initialRequestedItem : "") as RequestedItem | "";
  const [item, setItem] = useState<RequestedItem | "">(resumed);
  useEffect(() => {
    if (!open) return;
    setItem(resumed);
  }, [open, resumed]);
  //  **ورسالةُ الخادم تبقى معروضة** حين يكون النقصُ في الملفّ: التوست
  //  يختفي بعد ثوانٍ، وما يجب أن يفعله الموظّف الآن يجب أن يبقى أمامه.
  const [blockNote, setBlockNote] = useState<string>("");
  const [missing, setMissing] = useState<string[]>([]);
  //  نافذةُ الملفّ الناقص — **بدل الـJSON الخام**.
  const [needsData, setNeedsData] = useState(false);
  //  طلبٌ قائمٌ يمنع فتحَ ثانٍ — ومعه ما يفتحه أو يصحّحه.
  const [conflict, setConflict] = useState<
    { episodeId: number | null; workOrderId: number | null } | null>(null);
  const [reversalOpen, setReversalOpen] = useState(false);
  const session = useBranchSession();
  const mayReverse = Boolean(session?.isAdmin) || session?.role === "branch_manager";
  useEffect(() => {
    if (open) { setBlockNote(""); setMissing([]); setNeedsData(false); setConflict(null); }
  }, [open]);
  //  والمساندُ الطبية لا أجزاءَ لها في هذه القائمة — قائمةُ أجزاءِ طرفٍ
  //  صناعي بعينها. فتبقى كما كانت: تأكيدٌ واحد.
  const asksItem = serviceType === "prosthetic";
  const options = requestedItemOptions(serviceType);
  const chosen: RequestedItem = asksItem && item ? item : FULL_DEVICE;

  const mutation = useMutation({
    mutationFn: async () => {
      //  **`"exam"` ثابتةٌ لا حالة**: هذه النافذةُ بابُ مسار المعاينة وحده،
      //  فلا قيمةَ تأتي من الشاشة ولا من استئنافٍ محفوظ.
      const res = await apiRequest("POST", `/api/patients/${patientId}/device-episodes`, {
        serviceType, requestedItem: chosen, servicePath: "exam",
      });
      return await res.json();
    },
    onSuccess: (episode: any) => {
      toast({
        title: "تم فتح طلب الجهاز",
        description: `${requestedItemLabel(episode?.requestedItem ?? chosen, serviceType)}`
          + " — بانتظار معاينة الطبيب",
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
      const miss: string[] = Array.isArray(error?.missing) ? error.missing : [];
      // ══ **نقصُ الملفّ ليس خطأً بل خطوةٌ ناقصة** ══════════════════════
      //  فلا يُسكَب رمزُ الحالة ولا اسمُ الحقل الإنجليزيّ على الموظّفة:
      //  تُفتَح نافذةٌ تسمّي الناقصَ بالعربية وتفتح تعديلَ المريض بضغطة،
      //  **ويُحفَظ اختيارُها** لتعود إليه بلا أن تبدأ من أوّله.
      if (miss.length > 0) {
        setMissing(miss);
        setNeedsData(true);
        return;
      }
      // الخادم يبقى صاحب القرار: قد تكون حلقةٌ فُتحت من جهازٍ آخر بين
      // تحميل الصفحة والضغط، فتصل 409 برسالتها — تُعرَض كما هي.
      //  **وطلبٌ قائمٌ يُعرَض بأزراره لا بجملةٍ وحدها**: الموظّفُ يحتاج أن
      //  يفتح العمليةَ القائمة، والمخوَّلُ أن يصحّحها إن كانت خطأً.
      setConflict(error?.code === "active_device_operation" ? {
        episodeId: Number(error?.activeEpisodeId) || null,
        workOrderId: Number(error?.activeWorkOrderId) || null,
      } : null);
      setBlockNote(error?.message || "حدث خطأ غير متوقع");
      toast({
        title: "تعذّر فتح طلب الجهاز",
        description: error?.message || "حدث خطأ غير متوقع",
        variant: "destructive",
      });
    },
  });

  return (
    <>
    {/*  ══ الملفُّ الناقص — نافذةٌ تُقرأ، لا `missing:["amputationLevel"]` ══ */}
    <RequiredPatientDataDialog
      open={needsData}
      onOpenChange={(v) => {
        setNeedsData(v);
        //  إغلاقُها بلا إكمال يُبقي الاختيارَ محفوظاً كذلك — قد تعود بعد
        //  أن تسأل المريضَ عن مقاسه.
        if (!v) onOpenChange(false);
      }}
      missing={missing}
      onComplete={() => {
        setNeedsData(false);
        //  **الاختيارُ يُسلَّم إلى مَن يبقى** — ثمّ تُفتح شاشةُ التعديل.
        //  ولا `onOpenChange(false)` هنا: مالكُ الحالة هو مَن يغلق المسار،
        //  فلا يقع الإغلاقُ مرّتين ولا يسبق التسليمَ.
        if (onEditPatient) onEditPatient(item);
        else onOpenChange(false);
      }}
    />
    {/*  نافذةُ التصحيح — الهويّةُ هي الحلقةُ القائمة بعينها. */}
    {conflict?.episodeId && (
      <AdministrativeReversalDialog
        open={reversalOpen}
        onOpenChange={(v) => { setReversalOpen(v); if (!v) onOpenChange(false); }}
        patientId={patientId}
        target={{ episodeId: conflict.episodeId, workOrderId: conflict.workOrderId }}
      />
    )}
    <AlertDialog open={open && !needsData && !reversalOpen} onOpenChange={onOpenChange}>
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

        {/*  ══ **ما المطلوب؟** ═══════════════════════════════════════════
            سؤالٌ واحد يفصل شراءَ طرفٍ كامل عن شراءِ قطعةٍ منه. والقيمةُ
            تُخزَّن **منظَّمةً على الحلقة** لا في ملاحظةٍ حرّة: يقرؤها
            الطبيبُ في طلبه، والخبيرُ في أمره، ويُحصيها التقرير. */}
        {asksItem && (
          <div className="space-y-2 text-right" data-testid="block-requested-item">
            <Label className="font-semibold">
              ما المطلوب؟ <span className="text-destructive">*</span>
            </Label>
            <Select value={item} onValueChange={(v) => setItem(v as RequestedItem)}>
              <SelectTrigger data-testid="select-requested-item">
                <SelectValue placeholder="اختر الطرف الكامل أو الجزء المطلوب" />
              </SelectTrigger>
              <SelectContent>
                {options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              شراءُ قطعةٍ جديدة <b>بيعٌ لا صيانة</b>: يمرّ بالمعاينة والسعر
              والاعتماد كأيّ بيع. أمّا إصلاحُ قطعةٍ قائمة فمن «صيانة طرف صناعي».
            </p>
          </div>
        )}

        {/*  ══ **المسار ثابت — ولا محدِّدَ هنا إطلاقاً** ════════════════
            «يحتاج معاينة طبية» أجاب عن السؤال بضغطته. وتصحيحُ الوجهة من
            «تغيير سبب الحضور» الذي يعيد إلى المُوجِّه ليختار بيعاً أو
            صيانةً بدقّة — لا من محدِّدٍ هنا يقلبه إلى «بلا معاينة» بلا أن
            يقول أيَّهما. */}
        <div className="space-y-1.5 text-right" data-testid="block-service-path-fixed">
          <p className="text-sm">
            <span className="font-semibold">المسار:</span>{" "}
            <span className="font-medium text-primary" data-testid="text-service-path-fixed">
              معاينة طبية
            </span>
          </p>
          <button
            type="button"
            onClick={() => onChangeReason?.()}
            data-testid="button-change-reason"
            className="text-xs text-primary underline underline-offset-2"
          >
            تغيير سبب الحضور
          </button>
        </div>

        {/*  ══ **ما ينقص الملفَّ يُقال هنا ويبقى** ═══════════════════════
            ملفٌّ قديمٌ بلا مقاساتٍ أو بلا تعريفِ بترٍ لا يدخل دورةَ تصنيعٍ
            جديدة: الطرفُ يُصنَع على تلك الأرقام. والرسالةُ تسمّي الناقص
            وتدلّ على «تعديل مريض» — فلا يبقى الموظّف يخمّن سببَ الردّ. */}
        {blockNote && (
          <div
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-right text-sm"
            data-testid="block-episode-error"
          >
            <p className="font-semibold text-destructive">{blockNote}</p>
            {missing.length > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                أكمِلها من «تعديل مريض» ثم أعد المحاولة.
              </p>
            )}
            {/*  **وأزرارُ العمل مع الرسالة** — لا جملةٌ تُقرأ ثمّ يُبحَث عن
                الباب. والتصحيحُ للمخوَّل وحده، والخادمُ يفحصه ثانيةً. */}
            {conflict && (
              <div className="mt-2 flex flex-wrap gap-2" data-testid="block-active-operation">
                {/*  ══ **ويفتحها فعلاً** ═══════════════════════════════
                    أمرُ تصنيعٍ قائم ⟶ صفحةُ الأمر بمسارها القائم.
                    حلقةٌ بلا أمر ⟶ بطاقةُ قرار ما بعد المعاينة في هذه
                    الصفحة نفسِها. **ولا عارضَ ثانٍ للعملية** — الوجهتان
                    قائمتان قبل هذه التمريرة، والقرارُ بينهما مُختبَر. */}
                <button
                  type="button"
                  className="rounded-md border bg-background px-2 py-1 text-xs font-medium"
                  onClick={() => {
                    const focus = activeOperationFocus(conflict);
                    onOpenChange(false);
                    if (focus.kind === "route") { setLocation(focus.href); return; }
                    //  والمرساةُ تُبرَز لا تُفتَح: البطاقةُ في الصفحة نفسِها،
                    //  فيكفي أن تصير أمام العين. والتأخيرُ لأن النافذةَ
                    //  تُفكَّك بعد هذه الضغطة، وحبسُ التركيز يعيده إلى زرّها.
                    const el = typeof document === "undefined"
                      ? null : document.getElementById(focus.elementId);
                    if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
                  }}
                  data-testid="button-open-active-operation"
                >
                  فتح العملية الحالية
                </button>
                {mayReverse && (
                  <button
                    type="button"
                    className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900"
                    onClick={() => setReversalOpen(true)}
                    data-testid="button-reverse-active-operation"
                  >
                    تصحيح / إلغاء العملية
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel disabled={mutation.isPending}>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); mutation.mutate(); }}
            disabled={mutation.isPending || (asksItem && !item)}
            data-testid="confirm-new-device"
          >
            {mutation.isPending ? "جارٍ الفتح…" : "فتح الطلب"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
