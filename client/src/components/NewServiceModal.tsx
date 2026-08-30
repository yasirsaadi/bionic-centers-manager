import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { api } from "@shared/routes";
import { useTranslation } from "@/i18n/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Loader2, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useBranchSession } from "@/components/BranchGate";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { nextSubmissionToken, mintSubmissionToken } from "./patient_service_launcher_logic";
import { PHYSIO_TREATMENT_PRICES } from "@shared/pricing";
import {
  ServiceDiscountFields, EMPTY_DISCOUNT, discountBlocked, discountPayload,
  hasDiscount, paymentEntryRequired, type DiscountDraft,
} from "@/components/ServiceDiscountFields";

interface NewServiceModalProps {
  patientId: number;
  branchId: number;
  currentTotalCost: number;
  /**
   * فتحٌ **موجَّه** من موزِّع الخدمات، مع نوع الخدمة مختاراً سلفاً — فلا
   * يُطلَب من الموظّف أن يعيد اختيار ما اختاره قبل سطر واحد.
   *
   * والقائمة تبقى ظاهرةً قابلةً للتغيير: التوجيه اختصارٌ لا حجْب.
   * والمحاسبة والدفع والجلسات لم يُمَسّ منها شيء.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialServiceType?: string;
  hideTrigger?: boolean;
}

interface TreatmentEntry {
  treatmentType: string;
  sessionCount: number;
  cost: number;
}

const formSchema = z.object({
  serviceType: z.string().min(1, "اختر نوع الخدمة"),
  serviceCost: z.string().min(1, "أدخل تكلفة الخدمة"),
  paidNow: z.string().optional(),
  sessionCount: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const TREATMENT_TYPE_OPTIONS = [
  { value: "استشارة طبية", labelKey: "medicalConsultation" as const },
  { value: "روبوت", labelKey: "robot" as const },
  { value: "تمارين تأهيلية", labelKey: "rehabExercises" as const },
  { value: "أجهزة علاج طبيعي", labelKey: "physioDevices" as const },
  { value: "أبر صينية", labelKey: "acupuncture" as const },
];

//  **جدولُ الأسعار مصدرٌ واحد** (`@shared/pricing`): نسخةٌ محلّية هنا كانت
//  تعني أن تعديلَ سعرٍ في الخادم لا يصل الشاشة، فيَعرض الموظّفُ رقماً
//  ويُنفَّذ غيرُه. والخادمُ يعيد الحسابَ بالجدول نفسه على كلّ طلب.
const TREATMENT_PRICES = PHYSIO_TREATMENT_PRICES;

export function NewServiceModal({
  patientId, branchId, currentTotalCost,
  open: openProp, onOpenChange, initialServiceType, hideTrigger,
}: NewServiceModalProps) {
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openSelf;
  const setOpen = (v: boolean) => { if (!controlled) setOpenSelf(v); onOpenChange?.(v); };
  // One token per opened form. The same click always carries the same token,
  // so a re-sent request is recognised and ignored by the server; a genuinely
  // new service means opening the form again, which mints a new token — so a
  // patient really buying two identical sessions is never blocked.
  const [submissionToken, setSubmissionToken] = useState<string>("");
  const [treatmentEntries, setTreatmentEntries] = useState<TreatmentEntry[]>([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
  const [manualCostOverride, setManualCostOverride] = useState(false);
  //  ══ **الاتفاقُ الذي أبرمه الاستقبال** ═════════════════════════════════
  //  الموظّفُ هو مَن يكلّم المريض ويعرف على كم اتّفقا. وقبل هذا لم يكن له
  //  حقلٌ يقوله فيه، فتُنفَّذ الخدمةُ بسعرها الكامل ثم **يخمّن المديرُ
  //  الاتفاقَ لاحقاً**. والسعرُ الكامل يمضي فوراً كما كان — الطابورُ
  //  للاستثناء وحده.
  const [discount, setDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const dir = t.dir;
  const branchSession = useBranchSession();
  const isAdmin = branchSession?.isAdmin || false;

  // Only services WITHOUT a dedicated flow. Maintenance lives in the visit
  // modal (order + expert + fee booked there), and a new prosthetic goes
  // through doctor exam → «تخصيص» — the server refuses those types here.
  const serviceTypes = [
    { value: "additional_therapy", labelKey: "additionalTherapyLabel" as const },
    { value: "consultation", labelKey: "consultationLabel" as const },
    { value: "other", labelKey: "otherServiceLabel" as const },
  ];
  
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", `/api/patients/${patientId}/new-service`, {
        ...data,
        branchId,
        submissionToken,
      });
    },
    onSuccess: () => {
      invalidatePatientData(queryClient, patientId);
      //  **والخصمُ يُطبَّق فوراً كالسعر الكامل تماماً** — لا رسالةَ انتظارٍ
      //  ثانية: الخدمةُ وقعت فعلاً بحلول هذا الردّ.
      toast({
        title: t.modals.serviceAddedSuccess,
        description: t.modals.serviceAddedDesc,
      });
      setOpen(false);
      form.reset();
      setTreatmentEntries([{ treatmentType: "", sessionCount: 0, cost: 0 }]);
      setManualCostOverride(false);
      setDiscount(EMPTY_DISCOUNT);
    },
    onError: () => {
      toast({
        title: t.modals.serviceAddError,
        description: t.modals.serviceAddErrorDesc,
        variant: "destructive",
      });
    },
  });
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceType: "",
      serviceCost: "",
      paidNow: "",
      sessionCount: "",
      notes: "",
    },
  });

  /**
   * **نوع الخدمة المختار هو ما يقرّر وضع الجلسات — لا ملفّ المريض.**
   *
   * كان القرار على `patient.isPhysiotherapy`، وهذا كان يصحّ حين كانت النافذة
   * تُفتح من زرٍّ واحد لا يعرف ما سيُختار. أما الآن فمريضُ العلاج الطبيعي
   * يختار «استشارة طبية» أو «خدمة أخرى» — فتُجبَر خدمتُه على أن تصير جلسات:
   * يُطلَب منه نوع علاج، ويُحسَب سعرٌ بالجلسة، ويُرسَل `sessionCount`
   * و`paymentTreatmentType`، ويُدفَع المبلغ كاملاً بلا خيار جزئي. استشارةٌ
   * تُقيَّد جلساتٍ في خطّة العلاج — والعدّاد يقرأ شراءً لم يقع.
   *
   * والقاعدة الآن من الخدمة نفسها: «جلسات علاج إضافية» وحدها وضعُ جلسات،
   * وما عداها خدمةٌ عادية مهما كان على ملفّ المريض.
   */
  const selectedServiceType = initialServiceType ?? form.watch("serviceType");
  const isPhysioService = selectedServiceType === "additional_therapy";

  // نوع الخدمة الموجَّه يُثبَّت عند كل فتح — لا مرّةً واحدة: نافذةٌ أُغلقت
  // ثم فُتحت على خدمة أخرى كانت ستحمل اختيار المرّة السابقة.
  useEffect(() => {
    if (open && initialServiceType) form.setValue("serviceType", initialServiceType);
  }, [open, initialServiceType, form]);

  // تذكرة الإرسال تتبع **حالة النافذة** لا حدثَ فتحها: الموزِّع يركّب هذه
  // النافذة وهي مفتوحة أصلاً، فلا `onOpenChange` يقع — وكانت التذكرة تبقى
  // فارغةً فيسقط منع التكرار بصمت في المسار الجديد وحده. والأثر يُطلَق عند
  // كل تغيّر في `open` (والتركيب منه)، والدالّة الخالصة تضمن واحدةً لكل فتح.
  useEffect(() => {
    setSubmissionToken((prev) => nextSubmissionToken(prev, open, mintSubmissionToken));
  }, [open]);

  useEffect(() => {
    if (!isPhysioService) return;
    //  **ولا تجاوزَ يدويّ للجلسات**: الحقلُ صار للقراءة، فلا حالةَ تجاوزٍ
    //  تُوقف إعادةَ الحساب. (يبقى `manualCostOverride` لما عدا الجلسات.)

    const updatedEntries = treatmentEntries.map(entry => {
      if (!entry.treatmentType) return { ...entry, cost: 0 };
      const price = TREATMENT_PRICES[entry.treatmentType];
      if (price === undefined) return entry;
      if (entry.treatmentType === "استشارة طبية") {
        return { ...entry, sessionCount: 0, cost: 0 };
      }
      return { ...entry, cost: price * (entry.sessionCount || 0) };
    });

    const hasChanged = updatedEntries.some((e, i) => e.cost !== treatmentEntries[i].cost || e.sessionCount !== treatmentEntries[i].sessionCount);
    if (hasChanged) {
      setTreatmentEntries(updatedEntries);
    }

    const totalCost = updatedEntries.reduce((sum, e) => sum + e.cost, 0);
    form.setValue("serviceCost", String(totalCost));

    const totalSessions = updatedEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0);
    form.setValue("sessionCount", String(totalSessions));
  }, [treatmentEntries, isPhysioService, form]);

  const serviceCostValue = Number(form.watch("serviceCost")) || 0;
  //  **السعرُ الأصليّ من جدول الأسعار لا من الحقل**: الحقلُ قابلٌ للتجاوز
  //  اليدوي، وأصلٌ مُدخَلٌ بيدٍ يجعل الخصمَ يبدو أصغرَ ممّا هو. والخادمُ
  //  يعيد حسابه بالجدول نفسه، فما يراه الموظّف هو ما يُحفَظ.
  const standardPrice = treatmentEntries.reduce((sum, e) => {
    const price = TREATMENT_PRICES[e.treatmentType];
    return sum + (price === undefined ? 0 : price * (e.sessionCount || 0));
  }, 0);
  const newTotal = currentTotalCost + serviceCostValue;
  const paidNowValue = Number(form.watch("paidNow")) || 0;
  const remainingAfter = Math.max(0, serviceCostValue - paidNowValue);
  //  **للعرض الحيّ فقط** (نجمةٌ وتلميحٌ يطابقان ما سيحدث عند الحفظ) —
  //  `onSubmit` يعيد الحسابَ من `values` وقتَ الحفظ نفسِه، لا من هذا.
  //  **ومجّانيٌّ صريحٌ وحده يُعفي — لا أيّ خصم**: خصمٌ مخفَّضٌ (١٠٠,٠٠٠ ⟵
  //  ٨٠,٠٠٠) ليس مجّانياً، فيبقى المبلغُ إلزامياً له كالسعر الكامل.
  //  (تصحيحٌ لاحق — كان الشرطُ هنا يعفي كلَّ خصمٍ، لا التبرّعَ الصريح وحده.)
  const paymentRequiredLive = paymentEntryRequired(discount, serviceCostValue);

  // ══ **لا تعبئةَ تلقائية لـ«المبلغ المدفوع الآن» — لأيّ نوع خدمة**
  //  (تصحيحٌ لاحق — الجهوزيةُ المالية) ═══════════════════════════════════
  //  كان هذا الأثرُ يملأ الحقلَ بكامل السعر تلقائياً لغير الجلسات الإضافية
  //  («الحالة الشائعة») — أي أن استشارةً أو «خدمة أخرى» كانتا تُسجَّلان
  //  مدفوعتين كاملةً **بلا أن يكتب الموظّفُ رقماً واحداً**، وهذا هو العطبُ
  //  نفسُه (إيرادٌ لم يُقبَض فعلياً) الذي أُغلق للجلسات الإضافية للتوّ —
  //  بقيّةٌ منه لم تُغلَق. **فلا تعبئةَ تلقائية بعد اليوم لأيّ نوع**: الحقلُ
  //  يبدأ فارغاً دائماً (`defaultValues.paidNow = ""` وحدها تكفي)، ولا أثرَ
  //  يكتب فوقه — فلا إيصالَ موجباً بلا رقمٍ كتبه الموظّفُ بيده صراحةً.

  function onSubmit(values: FormValues) {
    //  **والجلساتُ تُرسَل بالقياسيّ دائماً** — لا بقيمةِ حقلٍ قد تكون بائتة.
    //  والخادمُ يردّ أيَّ مبلغٍ يخالفه بلا خصم، فالطرفان يقولان الشيءَ نفسه.
    const serviceCost = isPhysioService ? standardPrice : (Number(values.serviceCost) || 0);

    if (isPhysioService) {
      const hasEmptyType = treatmentEntries.some(e => !e.treatmentType);
      if (hasEmptyType) {
        toast({
          title: t.modals.treatmentTypeRequired,
          variant: "destructive",
        });
        return;
      }
    }
    
    const validEntries = treatmentEntries.filter(e => e.treatmentType);

    //  **والصفرُ وحده لا يعني «مجّاناً»**: المجّانيّ يُختار صراحةً من سعرٍ
    //  أصليٍّ موجب فيمرّ بالاعتماد. ونفسُ قواعد الخادم معروضةً قبل الضغط.
    if (isPhysioService && discountBlocked(discount, standardPrice)) {
      toast({
        title: "أكمل بيانات الخصم",
        description: "اختر سبب الخصم، وتأكّد أن السعر بعد الخصم أقلّ من الأصلي ولا يقلّ عن صفر.",
        variant: "destructive",
      });
      return;
    }
    if (isPhysioService && hasDiscount(discount, standardPrice) && !(standardPrice > 0)) {
      toast({
        title: "لا سعر أصلي",
        description: "اختر نوع العلاج وعدد الجلسات أولاً — الخصم يُحسب على سعرٍ أصليٍّ موجب.",
        variant: "destructive",
      });
      return;
    }

    const hasMedicalConsultationOnly = isPhysioService && validEntries.length === 1 && validEntries[0].treatmentType === "استشارة طبية";
    if (!hasMedicalConsultationOnly && !hasDiscount(discount, standardPrice) && serviceCost <= 0) {
      toast({
        title: t.modals.costError,
        description: t.modals.costErrorDesc,
        variant: "destructive",
      });
      return;
    }
    
    // ══ **الكلفةُ والمقبوضُ حقيقتان منفصلتان — لكلّ أنواع الخدمة** ═══════
    //  كانت الجلساتُ الإضافية تُسجَّل مدفوعةً كاملةً تلقائياً
    //  (`paidNow = serviceCost`) بصرف النظر عمّا قَبَضه الموظّفُ فعلاً —
    //  فخصمٌ أو موافقةٌ على السعر كانا يُقرآن قبضاً كاملاً. صار المبلغُ
    //  المدفوع الآن حقلاً حقيقياً لكلّ الأنواع، يُقصَر على الكلفة، جزئيّاً
    //  كان أو كاملاً أو صفراً — والباقي يبقى ديناً كما هو للأنواع الأخرى.
    const paidNow = Math.max(0, Math.min(Number(values.paidNow) || 0, serviceCost));

    //  **والخصمُ لا يُرسَل إلّا حين يوجد**: المساواةُ ليست خصماً، فالمسارُ
    //  الطبيعي يمضي بلا طلبٍ ولا طابور — وهو المسارُ الأغلب. (تُستعمَل في
    //  حمولة الإرسال أدناه فقط — **لا** في حارس الدفع: خصمٌ مخفَّضٌ غيرُ
    //  مجّانيّ يبقى مشمولاً هنا فتُرسَل تفاصيلُه، لكنّه لا يُعفى من إلزام
    //  الدفع، راجع `paymentEntryRequired` تحت.)
    const wantsDiscount = isPhysioService && hasDiscount(discount, standardPrice);

    // ══ **الجهوزيةُ الماليةُ — الفراغُ لم يعد يعني «صفراً» بصمت**
    //  (تصحيحٌ تشغيليّ، وتصحيحٌ لاحقٌ ثانٍ) ═════════════════════════════════
    //  «المبلغ المدفوع الآن» يبدأ فارغاً دائماً (أعلاه) — وهذا صحيح. لكن
    //  الفراغَ كان يُرسَل كصفرٍ بلا اعتراض: خدمةٌ حقيقيةٌ موجبةُ الكلفة
    //  تُسجَّل والمقبوضُ صفرٌ **بلا أن يكتب الموظّفُ رقماً ولا أن يقرّر
    //  ذلك قصداً** — فيظهر دينٌ كاملٌ لم يُقرَّر، لا مقبوضٌ جزئيّ فعلاً.
    //
    //  **والاستثناءُ مجّانيٌّ صريحٌ وحده — لا `wantsDiscount`** (تصحيحٌ
    //  لاحق: كان الشرطُ `!wantsDiscount`، و`hasDiscount` تُرجع `true` لكلّ
    //  خصمٍ ولو لم يكن مجّانياً — فخصمٌ حقيقيّ (١٠٠,٠٠٠ ⟵ ٨٠,٠٠٠) كان يُعفى
    //  بالخطأ رغم أن المريض يدفع مبلغاً موجباً حقيقياً له). `paymentEntryRequired`
    //  (`service_discount_ui.ts`، مُختبَرةٌ بلا شاشة) تفحص `discount.isFree`
    //  وحدها. **وليس مضاعفَ سعر الجلسة**: أيّ مبلغٍ موجبٍ يكفي، جزئياً كان
    //  أو كاملاً.
    if (paymentEntryRequired(discount, serviceCost) && paidNow <= 0) {
      toast({
        title: "«أدخل المبلغ المدفوع الآن»",
        variant: "destructive",
      });
      return;
    }

    mutate({
      ...(wantsDiscount ? { discount: discountPayload(discount) } : {}),
      // الموجَّه يسود على حالة النموذج: القفل في الواجهة يمنع الالتباس،
      // وهذا يمنع أن يُرسَل غيرُه مهما جرى للحالة بينهما.
      serviceType: initialServiceType ?? values.serviceType,
      serviceCost,
      initialPayment: paidNow,
      notes: values.notes,
      // الجلسات ووسمها وعددها **لخدمة الجلسات وحدها**. واستشارةٌ لمريض علاج
      // كانت ترسلها كلّها فتُقيَّد في خطّته شراءٌ لم يقع.
      treatmentEntries: isPhysioService ? validEntries : undefined,
      paymentTreatmentType: isPhysioService ? validEntries.map(e => e.treatmentType).filter(Boolean).join("، ") : null,
      sessionCount: isPhysioService ? validEntries.reduce((sum, e) => sum + (e.sessionCount || 0), 0) : null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50" data-testid="button-new-service">
          <RefreshCcw className="w-4 h-4" />
          {t.modals.addNewService}
        </Button>
      </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px] font-body" dir={dir}>
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-primary">{t.modals.addNewServiceForPatient}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-4">
            {/* ── النوع الموجَّه **مقفل** ────────────────────────────────
                الموزِّع طبّق شروط الأهلية قبل الفتح: «جلسات علاج إضافية»
                معطَّلة لمريضٍ بلا علاج طبيعي مثلاً. وقائمةٌ قابلة للتغيير
                هنا كانت طريقاً حول ذلك كلّه — يدخل الموظّف من «استشارة»
                المتاحة دائماً ثم يبدّلها إلى ما مُنع منه. فالنوع يُعرَض
                نصّاً لا يُختار، ويبقى ثابتاً طوال دورة النافذة.
                (والحارس الحقيقي في الخادم — هذا يمنع الالتباس لا الاختراق.)
                وبلا توجيه تبقى القائمة كما كانت للمسار المستقلّ. */}
            {initialServiceType ? (
              <FormItem>
                <FormLabel>{t.modals.serviceType}</FormLabel>
                <div
                  className="h-10 flex items-center rounded-md border bg-slate-50 px-3 text-sm font-medium"
                  data-testid="text-service-type-locked"
                >
                  {t.modals[(serviceTypes.find((x) => x.value === initialServiceType)?.labelKey) ?? "otherServiceLabel"]}
                </div>
              </FormItem>
            ) : (
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.serviceType}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-service-type">
                        <SelectValue placeholder={t.modals.selectServiceType} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {t.modals[type.labelKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            )}

            {isPhysioService && (
              <div className="space-y-3">
                <FormLabel>{t.modals.treatmentType} <span className="text-red-500">*</span></FormLabel>
                {treatmentEntries.map((entry, index) => (
                  <div key={index} className="border border-border/60 rounded-lg p-3 space-y-3 bg-slate-50/50" data-testid={`service-treatment-entry-${index}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 min-w-[160px]">
                        <Select
                          value={entry.treatmentType}
                          onValueChange={(val) => {
                            const updated = [...treatmentEntries];
                            updated[index] = { ...updated[index], treatmentType: val, sessionCount: val === "استشارة طبية" ? 0 : updated[index].sessionCount, cost: 0 };
                            setTreatmentEntries(updated);
                            setManualCostOverride(false);
                          }}
                        >
                          <SelectTrigger data-testid={`select-service-treatment-type-${index}`}>
                            <SelectValue placeholder={t.modals.selectTreatmentType} />
                          </SelectTrigger>
                          <SelectContent>
                            {TREATMENT_TYPE_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {t.modals[option.labelKey]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {entry.treatmentType && entry.treatmentType !== "استشارة طبية" && (
                        <div className="w-[90px]">
                          <Input
                            type="text"
                            inputMode="numeric"
                            value={entry.sessionCount || ""}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              const updated = [...treatmentEntries];
                              updated[index] = { ...updated[index], sessionCount: val };
                              setTreatmentEntries(updated);
                            }}
                            min={0}
                            className="text-left font-mono"
                            placeholder={t.modals.sessionCount}
                            data-testid={`input-service-session-count-${index}`}
                          />
                        </div>
                      )}

                      <div className="text-sm font-mono text-muted-foreground">
                        {entry.cost.toLocaleString()}
                      </div>

                      {treatmentEntries.length > 1 && isAdmin && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setTreatmentEntries(treatmentEntries.filter((_, i) => i !== index));
                            setManualCostOverride(false);
                          }}
                          data-testid={`button-remove-service-treatment-${index}`}
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTreatmentEntries([...treatmentEntries, { treatmentType: "", sessionCount: 0, cost: 0 }])}
                  className="gap-2"
                  data-testid="button-add-service-treatment-entry"
                >
                  <Plus className="w-4 h-4" />
                  {t.modals.addTreatmentType}
                </Button>
              </div>
            )}

            {/* ══ **الاتفاقُ الذي أبرمه الاستقبال** ═══════════════════════
                الموظّفُ هو مَن كلّم المريض ويعرف على كم اتّفقا. والسعرُ
                الكامل يمضي فوراً بلا طابور — والطابورُ للاستثناء وحده. */}
            {isPhysioService && standardPrice > 0 && (
              <ServiceDiscountFields
                originalPrice={standardPrice}
                value={discount}
                onChange={setDiscount}
                disabled={isPending}
                testIdPrefix="new-service-discount"
              />
            )}

            <FormField
              control={form.control}
              name="serviceCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.serviceCost}</FormLabel>
                  <FormControl>
                    {/* ══ **سعرُ الجلسات يُقرأ ولا يُكتب** ═══════════════
                        كان الحقلُ قابلاً للتحرير هنا أيضاً، فيكتب الموظّفُ
                        ١٢,٥٠٠ بدل ٢٥,٠٠٠ ويترك حقولَ الخصم فارغة —
                        **فتُنفَّذ الخدمةُ مخفَّضةً بلا اعتماد**، ويسقط
                        الطابورُ كلُّه. فصار السعرُ القياسيُّ معروضاً، وكلُّ
                        تخفيضٍ يمرّ من «خصم أو خدمة مجّانية» أعلاه.
                        والخادمُ يردّ أيَّ مبلغٍ يخالف القياسيّ بلا خصم. */}
                    {isPhysioService ? (
                      <div className="flex items-center justify-between rounded-md border
                        border-slate-200 bg-slate-50 px-3 py-2"
                      data-testid="service-cost-readonly">
                        <span className="font-mono font-semibold">
                          {standardPrice.toLocaleString("en-US")} د.ع
                        </span>
                        <span className="text-xs text-muted-foreground">
                          السعر القياسي — التخفيض من «خصم أو خدمة مجّانية»
                        </span>
                      </div>
                    ) : (
                      <MoneyInput
                        value={field.value}
                        className="bg-white"
                        placeholder={t.modals.enterCost}
                        data-testid="input-service-cost"
                        onValueChange={(n) => {
                          field.onChange(String(n));
                          setManualCostOverride(true);
                        }}
                      />
                    )}
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount paid now — **كلُّ** أنواع الخدمة، بما فيها الجلسات
                الإضافية (تصحيحٌ للجهوزية المالية): الكلفةُ والمقبوضُ
                حقيقتان منفصلتان، وخصمٌ أو موافقةٌ على السعر لا يعنيان
                قبضاً كاملاً. أيّ باقٍ غير مدفوعٍ يبقى ديناً يحصّله
                المحاسب لاحقاً. */}
            <FormField
              control={form.control}
              name="paidNow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    المبلغ المدفوع الآن
                    {paymentRequiredLive && <span className="text-red-500"> *</span>}
                  </FormLabel>
                  <FormControl>
                    <MoneyInput
                      value={field.value ?? ""}
                      className="bg-white"
                      placeholder="0"
                      data-testid="input-service-paid-now"
                      onValueChange={(n) => field.onChange(String(n))}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    {paymentRequiredLive
                      ? "أدخل ما دفعه المريضُ فعلاً الآن — جزئياً أو كاملاً. مبلغٌ صفريّ غير مقبول لخدمةٍ غير مجّانية — والباقي غير المدفوع يبقى ديناً يحصّله المحاسب لاحقاً."
                      : "أدخل ما دفعه المريضُ فعلاً الآن — جزئياً أو كاملاً أو صفراً — والباقي يبقى ديناً يحصّله المحاسب لاحقاً."}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-slate-50 p-3 rounded-lg text-sm">
              <div className="flex justify-between gap-2 text-amber-700 font-semibold mb-1">
                <span>المتبقّي على المريض من هذه الخدمة</span>
                <span className="font-mono">{remainingAfter.toLocaleString()} {t.patientDetails.currency}</span>
              </div>
              <div className="flex justify-between gap-2 text-muted-foreground">
                <span>{t.modals.currentTotalCost}</span>
                <span className="font-mono">{currentTotalCost.toLocaleString()} {t.patientDetails.currency}</span>
              </div>
              <div className="flex justify-between gap-2 font-semibold text-primary mt-1">
                <span>{t.modals.newTotalCost}</span>
                <span className="font-mono">{newTotal.toLocaleString()} {t.patientDetails.currency}</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.modals.additionalNotesOptional}</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder={t.modals.additionalNotesServicePlaceholder}
                      className="resize-none"
                      data-testid="input-service-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold" 
              disabled={isPending}
              data-testid="button-submit-new-service"
            >
              {isPending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  {t.modals.adding}
                </>
              ) : (
                t.modals.addService
              )}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
