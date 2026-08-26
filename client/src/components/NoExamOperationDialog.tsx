// **عمليةٌ بلا معاينة** — نافذةُ الاستقبال الواحدة.
//
// ══ القاعدةُ الحاكمة (قرارُ المالك — تُلغي ما قبلها) ════════════════════
// **العمليةُ والمالُ يمضيان من الاستعلامات، والطبيبُ يراجع الحركةَ إشرافياً
// فقط.**
//
// وكانت: «العمليةُ تمضي والمالُ ينتظر». وأثرُها أن مالاً مشروعاً وقع فعلاً
// يبقى خارج الدفتر حتى يفرغ طبيبٌ لشاشةٍ ماليّةٍ ليست من عمله. فمَن اتّفق
// على السعر هو مَن يقيّده — والمبلغُ نهائيٌّ لحظةَ إدخاله.
//
// ══ وخطواتٌ قليلة عن قصد ═══════════════════════════════════════════════
// ماذا جرى؟ (بيعُ جزءٍ أم صيانة) · على أيّ جهاز · بكم · ثمّ حفظ. خمسون
// مريضاً في اليوم لا يمرّون بنموذجٍ طويل، ونموذجٌ طويل يُملأ بلا قراءة.
//
// ══ ولا قائمةَ أجزاءٍ ثانية ════════════════════════════════════════════
// الأجزاءُ من `shared/prosthetic_parts` وحدها — القائمةُ التي يبيع بها
// النظامُ ويُصان بها منذ ترحيل ٠٦٠. وقائمتان كانتا ستنحرفان: يُضاف
// «الأدابتر» إلى إحداهما فتُصان قطعةٌ لا تُباع. **والمساندُ الطبية بلا
// أجزاء** — لا تُخترَع لها قائمةٌ لم يقلها أحد.
//
// ══ والجهازُ الكاملُ ليس من هذا الباب — طرفاً كان أو مسنداً ═════════════
// الجزءُ بديلٌ لقطعةٍ وُصفت يوماً — قالبٌ يبلى أو ركبةٌ تنكسر. أمّا **الجهازُ
// الكاملُ فقرارٌ سريريٌّ من أوّله**: مستوى البتر والمفصلُ والقدمُ والمقاس.
// فلا يُعرَض هنا إطلاقاً، **والخادمُ يردّه** ولو لُفِّق طلبٌ يتجاوز الشاشة.
//
// **والمساندُ الطبية لا تُباع من هنا إطلاقاً** (قرارُ المالك بعد ٢٤٩): كانت
// النافذةُ تعرض لها «مسنداً كاملاً» لأنه الشيءُ الوحيد الذي لا أجزاءَ دونه —
// فتبيع بلا معاينةٍ **أشدَّ** ما يحتاج الطبيب. فصار استعمالُها للمساند
// **الصيانةَ وحدها**: جهازٌ قائمٌ يُصلَح، لا جهازٌ يُوصَف.
//
// ══ ومنشأُ الجهاز لم يعد يُسأل عنه (قرارُ المالك 2026-08-26) ═══════════════
// كان هنا سؤالُ «منشأ الجهاز» بثلاثة خيارات — بلا قيمةٍ تشغيلية للاستقبال
// وسببُ التباسٍ فقط. فبقي ما يفيد وحده: هويّةُ **الجهاز المسجَّل** حين
// وُجد، و«جهاز غير مسجَّل في النظام» حين لا هويّةَ له — بلا سؤال من أين.
// والتفصيلُ التاريخيّ في `shared/device_origin.ts`، الباقي للقراءة القديمة.
//
// ══ والصفرُ ليس «مجّاناً» ═══════════════════════════════════════════════
// مربّعُ «بلا أجور» صريحٌ. فالعمليةُ بلا أجرٍ تُحفَظ وتنتهي **بلا صفٍّ
// معلَّق ولا اعتمادٍ مسرحيّ**، والمبلغُ الحاضر موجبٌ دائماً.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Wallet } from "lucide-react";
import {
  PROSTHETIC_COMPONENTS, COMPONENT_LABELS, FULL_DEVICE, FULL_DEVICE_LABELS,
} from "@shared/prosthetic_parts";
import {
  PENDING_CHARGE_KIND_LABELS, SAVED_CHARGED_MESSAGE, SAVED_NO_CHARGE_MESSAGE,
  reviewFailedCopy,
  type PendingChargeKind,
} from "@shared/pending_charge";
import { useDeviceEpisodes, describeEpisode } from "./DeviceEpisodeSelect";
import {
  UNREGISTERED_DEVICE, devicePhaseOf, maintenanceDeviceSelectorVisible,
  maintenanceDeviceMissing, maintenanceDeviceRequestFields,
} from "./maintenance_device_target";

type Service = "prosthetic" | "medical_support";
/** نفسُ نوعِ العملية القانونيّ — بلا نسخةٍ محلّية منه. */
type Kind = PendingChargeKind;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: number;
  branchId: number;
  serviceType: Service;
  /** حلقةٌ قائمة على مسار «بلا معاينة» — فتُسجَّل عليها هي ولا تُفتَح ثانية. */
  existingEpisodeId?: number | null;
  /** الطلبُ المسجَّل على تلك الحلقة — يُعرَض ولا يُسأل عنه ثانيةً. */
  existingRequestedItem?: string | null;
  /**
   * **«نوع العملية» محسومٌ قبل فتح النافذة** — من مُوجِّه «ما سبب حضور
   * المريض اليوم؟» بعد التسجيل مثلاً. فلا يُعاد سؤالٌ أجاب عنه اختيارُ
   * الزرّ بعينه — نفسُ منطق `existingEpisodeId` أدناه بالضبط، لسببٍ مختلف.
   */
  initialKind?: Kind;
}

export function NoExamOperationDialog({
  open, onOpenChange, patientId, branchId, serviceType,
  existingEpisodeId = null, existingRequestedItem = null, initialKind,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  //  ══ **نوعُ العملية محسومٌ متى كان معلوماً** ═══════════════════════════
  //  ثلاثةُ أسبابٍ تحسمه، وكلُّها تسبق فتحَ النافذة:
  //    · **المساندُ الطبية** — لا بيعَ لها بلا معاينة إطلاقاً، فصيانةٌ حتماً.
  //      وهذا حارسٌ **بنيويّ** لا مجرّد إخفاءِ خيار: ولو وصلها `initialKind`
  //      ملفَّقٌ بـ`device_sale` لبقيت صيانة، فلا تُنتج الشاشةُ ما يردّه الخادم.
  //    · **حلقةٌ قائمة تُستأنَف** — بيعٌ بحكم وجودها.
  //    · **اختيارُ المُوجِّه** — أجاب الموظّفُ بضغطته.
  const fixedKind: Kind | null = serviceType === "medical_support"
    ? "maintenance"
    : (initialKind ?? (existingEpisodeId ? "device_sale" : null));

  const [kind, setKind] = useState<Kind>(fixedKind ?? "maintenance");
  //  البيعُ للأطراف وحدها الآن، فلا قيمةَ ابتدائية «كاملة» تُحشى للمساند.
  const [requestedItem, setRequestedItem] = useState<string>(existingRequestedItem ?? "");
  const [component, setComponent] = useState<string>("");
  const [expertId, setExpertId] = useState<string>("");
  //  **هويّةُ الجهاز** — معرّفُ حلقةٍ مسلَّمة، أو `UNREGISTERED_DEVICE` حين
  //  يختار الموظّفُ صراحةً «جهاز غير مسجَّل في النظام». بلا افتراض: تبقى
  //  فارغةً حتى يختار أحدُهما.
  const [target, setTarget] = useState<string>("");
  const [charged, setCharged] = useState(true);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");

  //  ══ **حالاتُ الخبير أربعٌ تُقال، لا واحدةٌ تُخفي ثلاثاً** ══════════════
  //  كانت `data: experts = []` تسوّي بين «يُحمَّل الآن» و«فشل الطلب» و«لا
  //  خبيرَ في هذا الفرع»: قائمةٌ فارغة في الحالات الثلاث. فيقف الموظّفُ أمام
  //  حقلٍ لا يفتح ولا يقول لماذا — فيظنّ النظامَ معطَّلاً، أو ينتظر شيئاً لن
  //  يأتي، أو يعيد المحاولة على خطأ شبكةٍ لا يعرف أنه وقع.
  //
  //  **ولا يُخمَّن خبير** في أيٍّ منها: الغيابُ يُقال غياباً.
  const expertQuery = useQuery<{ id: number; displayName: string }[]>({
    queryKey: ["/api/manufacturing/experts", branchId],
    enabled: open && Boolean(branchId),
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`,
        { credentials: "include" });
      if (!res.ok) throw new Error("تعذّر تحميل الخبراء");
      return res.json();
    },
  });
  const experts = expertQuery.data ?? [];
  //  `enabled: false` تُبقي الحالةَ `pending` بلا جلب — فلا تُقرأ «تحميلاً».
  const expertsLoading = expertQuery.isLoading || expertQuery.isFetching;
  const expertsFailed = expertQuery.isError;
  const expertsEmpty = expertQuery.isSuccess && experts.length === 0;

  //  ══ **أجهزةُ الصيانة: المسلَّمُ وحدَه** — وما لم يُسلَّم بعد ليس محلَّ
  //  صيانة. **وحالةُ الاستعلام تخرج معه**: `devicePhase` لا يقرأ «صفرَ
  //  أجهزة» إلّا بعد نجاحٍ حقيقيّ — تحميلٌ أو فشلٌ يبقيان «غير معلوم»
  //  فيُغلقان بابَ حفظِ الصيانة حتى يُعرَف الجوابُ يقيناً.
  const deviceQuery = useDeviceEpisodes(
    open ? patientId : undefined, serviceType, ["delivered"]);
  const devices = deviceQuery.options;
  const devicePhase = devicePhaseOf(deviceQuery);
  const deviceState = { phase: devicePhase, deviceCount: devices.length, selectedTarget: target };

  //  ══ **كلُّ ما تغيّر يُحدَّث — لا بعضُه** ═══════════════════════════════
  //  العمليةُ تفتح أمرَ تصنيعٍ فوراً، وبطاقةُ التصنيع في صفحة المريض تقرأ
  //  مفتاحاً **خاصّاً بالمريض** (`/api/manufacturing/patient/:id/orders`).
  //  وكان التحديثُ يمسّ القائمةَ العامّة وحدها، فيحفظ الموظّفُ العمليةَ
  //  ولا يرى أمرَها حتى يحدّث المتصفّح بيده — فيظنّها لم تقع فيعيدها.
  //
  //  والحلقةُ تنتقل من «بانتظار معاينة» إلى التصنيع، فتتغيّر معها شارةُ
  //  الانتظار — ومفتاحُها يُحدَّث كذلك.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/device-episodes`] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}/pending-charges`] });
    qc.invalidateQueries({ queryKey: ["/api/no-exam/review"] });
    qc.invalidateQueries({ queryKey: ["/api/manufacturing/orders"] });
    qc.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/orders`] });
    qc.invalidateQueries({ queryKey: [`/api/manufacturing/patient/${patientId}/summary`] });
    qc.invalidateQueries({ queryKey: ["/api/medical/pending"] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/patients"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const money = charged ? { charged: true, amount } : { charged: false };
      if (kind === "maintenance") {
        //  **هويّةُ الجهاز من الدالّة القانونية نفسِها التي تحرس `ready`** —
        //  لا حسابٌ ثانٍ هنا قد ينحرف عنها. وهي لا تُرجع `null` إن وصلنا
        //  هذا السطر أصلاً (الزرُّ كان سيبقى معطَّلاً)، لكنّ الحارسَ يبقى
        //  صريحاً بدل افتراضِ توافقٍ صامت.
        const deviceFields = maintenanceDeviceRequestFields(deviceState);
        if (!deviceFields) throw new Error("بيانات الجهاز غير مكتملة — أعد المحاولة");
        const res = await apiRequest("POST", "/api/no-exam/maintenance", {
          patientId, serviceType, expertUserId: Number(expertId),
          maintenanceComponent: serviceType === "prosthetic" ? component : null,
          ...deviceFields,
          note: note.trim() || null, ...money,
        });
        return res.json();
      }
      //  **بيعٌ بلا معاينة**: يُفتَح الطلبُ بالباب القائم (`device-episodes`)
      //  بمساره الصريح، ثمّ يُسجَّل مبلغُه المعلَّق. **ولا بابَ ثالث** يفتح
      //  حلقةً بنفسه فينحرف عن حُرّاس الأوّل.
      let episodeId = existingEpisodeId;
      if (!episodeId) {
        //  **ولا احتياطَ بـ`full_device`**: كان الاحتياطُ يرسل «جهازاً كاملاً»
        //  حين يفرغ الحقل — أي **يطلب بالضبط ما يردّه الخادم**. والحقلُ لا
        //  يفرغ أصلاً (`missingItem` تمنع الإرسال)، فالاحتياطُ كذبةٌ لا حارس.
        const ep = await apiRequest("POST", `/api/patients/${patientId}/device-episodes`, {
          serviceType, requestedItem, servicePath: "no_exam",
        });
        episodeId = (await ep.json())?.id ?? null;
      }
      if (!episodeId) throw new Error("تعذّر فتح طلب الجهاز");
      const res = await apiRequest("POST", "/api/no-exam/device-sale", {
        patientId, serviceType, deviceEpisodeId: episodeId,
        expertUserId: Number(expertId), note: note.trim() || null, ...money,
      });
      return res.json();
    },
    onSuccess: (d: any) => {
      invalidate();
      onOpenChange(false);
      //  ══ **والسجلُّ الإشرافيُّ الناقص يُقال — ولا يُطلَب تكرارُ العملية** ══
      //  العمليةُ والمبلغُ محفوظان يقيناً (وقعا قبل هذا الردّ في معاملةٍ
      //  مغلقة). والذي تعذّر سطرٌ إخباريٌّ للطبيب. ونجاحٌ لا يُميَّز عن نجاح
      //  كان سيُخفي عن الموظّف أن حركةً لن تصل شاشتَه — فلا يبلّغ أحداً.
      if (d?.reviewRouted === false) {
        //  **والصياغةُ تتبع ما وقع**: «بلا أجور» لا يُقال لها «حُفظ المبلغ».
        const copy = reviewFailedCopy(d?.amount ?? null);
        toast({
          title: copy.title,
          description: copy.hint,
          variant: "destructive",
          duration: 12_000,
        });
        return;
      }
      //  **ولا شرحَ محاسبيّ في الإشعار** — الرسالةُ تقول ما وقع وتنتهي.
      toast({
        title: d?.amount != null ? SAVED_CHARGED_MESSAGE : SAVED_NO_CHARGE_MESSAGE,
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الحفظ", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const missingItem = kind === "device_sale" && !existingEpisodeId && !requestedItem;
  const missingComponent = kind === "maintenance" && serviceType === "prosthetic" && !component;
  //  **والحقلُ ناقصٌ حتى يُعرَف جوابُه يقيناً** — لا قبل أن ينجح استعلامُ
  //  الأجهزة فعلاً. `maintenanceDeviceMissing` هي الحارسُ الوحيد؛ لا حسابٌ
  //  محلّيٌّ ثانٍ قد ينحرف عنها.
  const missingTarget = kind === "maintenance" && maintenanceDeviceMissing(deviceState);
  const ready = Boolean(expertId) && !missingItem && !missingComponent && !missingTarget
    && (!charged || amount > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> عملية بلا معاينة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2"
            data-testid="no-exam-op-rule">
            <b>يبدأ العمل الآن</b> — يُفتَح أمر التصنيع ويُسنَد للخبير فوراً.
            {" "}<b>والمبلغ يُسجَّل مباشرةً</b> على حساب المريض.
            {" "}والطبيب يراه لاحقاً ضمن المراجعة الإشرافية فقط.
          </p>

          {/* ── ماذا جرى؟ ── */}
          {/*  **والمحسومُ يُقال نصّاً لا محدِّداً معطَّلاً.** المحدِّدُ المعطَّل
              يبدو عطباً في الشاشة — يضغطه الموظّفُ فلا يفتح، فيظنّ النظامَ
              مكسوراً أو صلاحيتَه ناقصة. والنصُّ يقول القرارَ ومَن اتّخذه. */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">نوع العملية</Label>
            {fixedKind ? (
              <p className="text-sm rounded-md border bg-slate-50 px-3 py-2"
                data-testid="no-exam-op-kind-fixed">
                <b>{PENDING_CHARGE_KIND_LABELS[fixedKind]}</b>
                <span className="text-muted-foreground">
                  {" — "}
                  {serviceType === "medical_support"
                    ? "المساند الطبية لا تُباع بلا معاينة، فالصيانة وحدها من هنا"
                    : existingEpisodeId
                      ? "استكمالٌ لطلبٍ مفتوح على هذا المريض"
                      : "محسومٌ من سبب الحضور الذي اخترته"}
                </span>
              </p>
            ) : (
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger data-testid="no-exam-op-kind">
                  <SelectValue placeholder="اختر" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="device_sale">
                    {PENDING_CHARGE_KIND_LABELS.device_sale} — جزء من طرف صناعي
                  </SelectItem>
                  <SelectItem value="maintenance">
                    {PENDING_CHARGE_KIND_LABELS.maintenance} — إصلاح جهاز قائم
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ── البيع: ما المطلوب؟ ── */}
          {kind === "device_sale" && (
            existingEpisodeId ? (
              <p className="text-sm text-muted-foreground" data-testid="no-exam-op-existing">
                الطلب القائم: <b>{existingRequestedItem
                  && existingRequestedItem !== FULL_DEVICE
                  ? COMPONENT_LABELS[existingRequestedItem as keyof typeof COMPONENT_LABELS]
                  : FULL_DEVICE_LABELS[serviceType]}</b>
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">ما الذي بيع؟</Label>
                <p className="text-xs text-muted-foreground"
                  data-testid="no-exam-op-item-hint">
                  الأجزاء وحدها من هنا — <b>الطرف الصناعي الكامل يحتاج معاينة
                  الطبيب</b> ويُفتَح من «يحتاج معاينة طبية».
                </p>
                {/*  **والقائمةُ أجزاءُ الأطراف وحدها.** لا «جهاز كامل» فيها
                    لأيّ قسم: هو قرارٌ سريريٌّ من أوّله. ولا أجزاءَ للمساند
                    تُخترَع — ولذلك لا يبلغ المسندُ هذا الحقلَ إطلاقاً. */}
                <Select value={requestedItem} onValueChange={setRequestedItem}>
                  <SelectTrigger data-testid="no-exam-op-item">
                    <SelectValue placeholder="اختر الجزء" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROSTHETIC_COMPONENTS.map((c) => (
                      <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )
          )}

          {/* ── الصيانة: أيّ جزء وأيّ جهاز؟ ── */}
          {kind === "maintenance" && (
            <>
              {serviceType === "prosthetic" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الجزء المراد صيانته</Label>
                  <Select value={component} onValueChange={setComponent}>
                    <SelectTrigger data-testid="no-exam-op-component">
                      <SelectValue placeholder="اختر الجزء" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROSTHETIC_COMPONENTS.map((c) => (
                        <SelectItem key={c} value={c}>{COMPONENT_LABELS[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/*  **الجهازُ المسجَّلُ وحده يحتاج هويّةً دقيقة** — ومنشأ غيرِ
                  المسجَّل لا يُسأل عنه بعد اليوم: تمييزٌ بلا قيمةٍ تشغيلية
                  وسببُ التباسٍ فقط (قرارُ المالك 2026-08-26). وحين لا حلقةَ
                  مسلَّمة أصلاً **لا يظهر حقلٌ إطلاقاً** — لا خيارَ حقيقياً
                  ليُعرَض، ولا يُساق الموظّفُ لتأكيد البديهة.
                  **ولا شيءَ من هذا يُقال قبل أن ينجح استعلامُ الأجهزة
                  فعلاً**: تحميلٌ أو فشلٌ لا يُقرَآن «صفرَ أجهزة» أبداً. */}
              {devicePhase === "loading" ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"
                  data-testid="no-exam-op-device-loading">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ تحميل أجهزة المريض…
                </p>
              ) : devicePhase === "error" ? (
                <p className="text-sm text-destructive" data-testid="no-exam-op-device-error">
                  تعذّر تحميل أجهزة المريض — تحقّق من الاتصال وأعد فتح النافذة.
                </p>
              ) : maintenanceDeviceSelectorVisible(deviceState) && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">الجهاز المراد صيانته</Label>
                  <Select value={target} onValueChange={setTarget}>
                    <SelectTrigger data-testid="no-exam-op-target">
                      <SelectValue placeholder="اختر الجهاز" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{describeEpisode(e)}</SelectItem>
                      ))}
                      <SelectItem value={UNREGISTERED_DEVICE}>جهاز غير مسجل في النظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}

          {/* ── مَن ينفّذ ── */}
          {/*  **أربعُ حالاتٍ تُقال بأسمائها.** والقائمةُ الفارغة كانت تقولها
              كلَّها بصوتٍ واحد: حقلٌ لا يفتح ولا يشرح. */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">الخبير المسؤول</Label>
            {expertsLoading ? (
              <p className="text-sm text-muted-foreground flex items-center gap-2"
                data-testid="no-exam-op-expert-loading">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> جارٍ تحميل الخبراء…
              </p>
            ) : expertsFailed ? (
              <p className="text-sm text-destructive" data-testid="no-exam-op-expert-error">
                تعذّر تحميل قائمة الخبراء — تحقّق من الاتصال وأعد فتح النافذة.
              </p>
            ) : expertsEmpty ? (
              <p className="text-sm text-destructive" data-testid="no-exam-op-expert-empty">
                لا يوجد خبير متاح لهذا الفرع
              </p>
            ) : (
              <Select value={expertId} onValueChange={setExpertId}>
                <SelectTrigger data-testid="no-exam-op-expert">
                  <SelectValue placeholder="اختر الخبير" />
                </SelectTrigger>
                <SelectContent>
                  {experts.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ── المبلغ ── */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!charged}
              onChange={(e) => { setCharged(!e.target.checked); if (e.target.checked) setAmount(0); }}
              data-testid="no-exam-op-no-charge" />
            <b>بلا أجور</b>
            <span className="text-muted-foreground">
              — يبدأ العمل ويكتمل تسجيله، بلا مبلغ على حساب المريض
            </span>
          </label>

          {charged && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المبلغ (د.ع)</Label>
              <MoneyInput value={amount} onValueChange={setAmount} data-testid="no-exam-op-amount" />
              {!(amount > 0) && (
                <p className="text-xs text-destructive" data-testid="no-exam-op-amount-error">
                  المبلغ يجب أن يكون أكبر من صفر — والعملية بلا أجر تُحفَظ بمربّع «بلا أجور».
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ملاحظة (اختياري)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="ما يحتاج الطبيب أن يعرفه عن المبلغ"
              data-testid="no-exam-op-note" />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!ready || save.isPending} data-testid="no-exam-op-submit"
            onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ العملية"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
