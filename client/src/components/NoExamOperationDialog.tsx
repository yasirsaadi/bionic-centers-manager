// **عمليةٌ بلا معاينة** — نافذةُ الاستقبال الواحدة.
//
// ══ بيعُ الجزء — حفظٌ واحد (المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨) ═══════════════════
// جزءٌ ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ سعرٌ نهائيّ يشتقّه الخادم ⟵ حفظٌ واحد.
// **بلا طبيبٍ، بلا مراجعةٍ استرجاعية، وبلا نداءين منفصلين** (فتحُ الحلقة ثمّ
// بيعُها) — النقطةُ `/api/no-exam/device-sale` تفتح الحلقةَ وأمرَ العمل
// وتقيّد المبلغ معاً في نداءٍ واحد. حلقةٌ موروثة فتحها الشكلُ القديم ولم
// تكتمل ⟶ تُستأنَف بمعرّفها (`existingEpisodeId`) بلا فتح ثانية.
//
// ══ الصيانةُ — قاعدةٌ مطابقة (المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨) ═══════════════════
// جهازٌ ⟵ جزءٌ إن لزم ⟵ خبيرٌ ⟵ سعرٌ أصليّ وخصمٌ ⟵ حفظٌ واحد. **بلا سؤال
// منشأ الجهاز، بلا مربّع «بلا أجور»، بلا حقل سعرٍ نهائيٍّ قابلٍ للتحرير،
// وبلا مراجعةٍ لاحقة** — النقطةُ `/api/no-exam/maintenance` تفتح أمرَ
// العمل وتقيّد المبلغَ النهائيّ في نداءٍ واحد.
//
// ══ والسعرُ نمطٌ واحد يشترك فيه البابان (منذ المرحلة الرابعة) ═══════════
// أصليّ + خصمٌ ⟶ نهائيّ يُشتقّ في الخادم (`deriveOfferFromDiscount`،
// `shared/commercial.ts`) — لا حقلَ سعرٍ نهائيٍّ يُكتب يدوياً في أيّ باب،
// ولا حسابَ ثانياً في الواجهة. المعاينةُ الحيّة هنا لعرضٍ فوريّ فقط؛ الخادمُ
// يشتقّ ويعتمد وحده.
//
// ══ وخطواتٌ قليلة عن قصد ═══════════════════════════════════════════════
// ماذا جرى؟ (بيعُ جزءٍ أم صيانة) · على أيّ جهاز/جزء · بكم · ثمّ حفظ. خمسون
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
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { Loader2, Wallet } from "lucide-react";
import { PROSTHETIC_COMPONENTS, COMPONENT_LABELS } from "@shared/prosthetic_parts";
import { PENDING_CHARGE_KIND_LABELS, type PendingChargeKind } from "@shared/pending_charge";
import { deriveOfferFromDiscount } from "@shared/commercial";
import { MAINTENANCE_SUCCESS_MESSAGE } from "@shared/maintenance";
import {
  COMPONENT_SALE_SUCCESS_MESSAGE, ATTACH_TO_IN_MANUFACTURING_QUESTION,
} from "@shared/component_sale";
import { useDeviceEpisodes, describeEpisode } from "./DeviceEpisodeSelect";
import {
  devicePhaseOf, maintenanceDeviceBlocksSave, resolveMaintenanceDeviceTarget,
  UNREGISTERED_DEVICE,
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
   * **مُرشَّحٌ لسؤال الإلحاق** — طرفٌ كاملٌ قيد التصنيع بالفعل على خيط
   * المريض. وجودُه **لا يُلحق شيئاً ضمناً**: يُعرَض عليه سؤالٌ صريح
   * («هل هذا الجزء إضافة إلى الطرف الجاري تصنيعه؟»)، وجوابُ الموظّف وحده
   * يقرّر. غيابُه (`null`) يعني عدمَ عرض السؤال أصلاً — لا جهازَ قيد
   * التصنيع، فلا التباسَ ممكناً.
   */
  inManufacturingFullDeviceEpisodeId?: number | null;
  /**
   * **«نوع العملية» محسومٌ قبل فتح النافذة** — من مُوجِّه «ما سبب حضور
   * المريض اليوم؟» بعد التسجيل مثلاً. فلا يُعاد سؤالٌ أجاب عنه اختيارُ
   * الزرّ بعينه — نفسُ منطق `existingEpisodeId` أدناه بالضبط، لسببٍ مختلف.
   */
  initialKind?: Kind;
}

export function NoExamOperationDialog({
  open, onOpenChange, patientId, branchId, serviceType,
  existingEpisodeId = null, existingRequestedItem = null,
  inManufacturingFullDeviceEpisodeId = null, initialKind,
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
  //  **والاسمُ محليٌّ يخصّ الجزءَ المراد بيعه** — لا يصطدم بحالة الصيانة
  //  `component` أدناه (حقلٌ مختلفٌ تماماً: الجزء المراد صيانته).
  const [requestedItem, setRequestedItem] = useState<string>(existingRequestedItem ?? "");
  const [component, setComponent] = useState<string>("");
  const [expertId, setExpertId] = useState<string>("");
  const [note, setNote] = useState("");

  //  ══ **سؤالُ الإلحاق — جوابٌ صريحٌ، لا افتراضاً صامتاً** ═══════════════
  //  `null` = لم يُجَب بعد. لا تفترض «لا» ولا «نعم»: طلبٌ بلا جوابٍ يبقى
  //  غيرَ جاهزٍ للحفظ (انظر `ready` أدناه) ما دام السؤالُ مطروحاً أصلاً.
  const [attachChoice, setAttachChoice] = useState<"yes" | "no" | null>(null);
  //  يُعرَض فقط عند بيع جزءٍ جديد (لا استئنافَ حلقةٍ موروثة — لتلك مسارُها
  //  الخاصّ ولا معنى لسؤال الإلحاق عليها) وحين يوجد مُرشَّحٌ فعلاً.
  const showAttachPrompt = kind === "device_sale" && !existingEpisodeId
    && Boolean(inManufacturingFullDeviceEpisodeId);
  const attaching = showAttachPrompt && attachChoice === "yes";
  const attachUnanswered = showAttachPrompt && attachChoice === null;

  //  ══ **السعرُ — أصليّ وخصمٌ، مشتركان بين بيع الجزء والصيانة** ══════════
  //  (المرحلة الرابعة) نفسُ الاشتقاق حرفياً في البابين — فلا حسابَ مكرَّر
  //  ولا حقلَ سعرٍ نهائيٍّ يُكتب يدوياً في أيٍّ منهما.
  const [originalPrice, setOriginalPrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  //  ══ **الصيانةُ المبسّطة — حقلها الخاصّ** (المرحلة الثالثة) ═══════════
  //  جهازٌ يُختار من قائمة؛ بيعُ الجزء لا جهازَ قائماً له فلا يحتاج نظيرَه.
  const [deviceSelection, setDeviceSelection] = useState<string>("");

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

  //  أجهزةُ الصيانة: المسلَّمُ وحدَه — وما لم يُسلَّم بعد ليس محلَّ صيانة.
  //  **وحالةُ الاستعلام كاملةً** (لا القائمةُ وحدها) — كي لا يُقرأ تحميلٌ
  //  أو فشلٌ «لا أجهزة». ولا تُطلَب أصلاً إلّا حين الفرعُ صيانةٌ فعلاً.
  const deviceQuery = useDeviceEpisodes(
    open && kind === "maintenance" ? patientId : undefined, serviceType, ["delivered"]);
  const devices = deviceQuery.options;
  const devicePhase = devicePhaseOf(deviceQuery);

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
    //  ══ **الصفحةُ الحقيقية والسجلّ والمال — بالمفتاح الذي تقرؤه فعلاً**
    //  (تحكّمُ الذاكرة، 2026-08-30) ═══════════════════════════════════════
    //  السطرُ أعلاه (`/api/patients/${patientId}`) مفتاحٌ لا تقرؤه أيّ
    //  شاشة — صفحةُ المريض تقرأ `["/api/patients/:id", patientId]`. وكلا
    //  البابين هنا يقيّدان مالاً فعلياً (صيانةٌ بأجرٍ أو بيعُ جزء)، فيستحقّان
    //  الإبطالَ الشامل نفسَه الذي يستعمله كلُّ بابٍ ماليّ آخر — لا نسخةً ثالثة.
    invalidatePatientData(qc, patientId);
  };

  //  **السعرُ يُشتقّ حيّاً هنا للمعاينة فقط** — نفسُ الاشتقاق الذي يعيده
  //  الخادمُ ويعتمده وحده؛ لا يُرسَل في الطلب. **مشتركٌ بين البابين** منذ
  //  المرحلة الرابعة — الحسابُ والحدودُ الآمنة واحدةٌ بحرفها.
  const offer = deriveOfferFromDiscount({ originalPrice, discountAmount });

  const save = useMutation({
    mutationFn: async () => {
      if (kind === "maintenance") {
        const target = resolveMaintenanceDeviceTarget({
          phase: devicePhase, selection: deviceSelection,
        });
        if (!target) throw new Error("حدّد الجهاز المراد صيانته");
        const res = await apiRequest("POST", "/api/no-exam/maintenance", {
          patientId, serviceType, expertUserId: Number(expertId),
          maintenanceComponent: serviceType === "prosthetic" ? component : null,
          deviceEpisodeId: target.deviceEpisodeId,
          legacyUnrecordedDevice: target.legacyUnrecordedDevice,
          originalPrice, discountAmount,
          note: note.trim() || null,
        });
        return res.json();
      }
      //  ══ **بيعُ جزءٍ من طرفٍ صناعي — حفظٌ واحد** (المرحلة الرابعة) ══════
      //  لا نداءَ فتحِ حلقةٍ منفصلاً قبله: `existingEpisodeId` وحده يُرسَل
      //  حين تُستأنَف حلقةٌ موروثة (فتحها الشكلُ القديم ذو النداءين ولم
      //  يكتمل بيعُها)؛ وإلّا فالجزءُ المطلوب يُرسَل، فتُفتَح الحلقةُ وتُباع
      //  معاً في معاملة الخادم نفسِها. **ولا سعرَ نهائيّاً ولا نوعَ سعرٍ
      //  يُرسَلان أبداً** — الخادمُ يشتقّهما من `originalPrice`/`discountAmount`
      //  وحدهما ويعتمدهما وحده.
      //
      //  ══ **والإلحاقُ صريحٌ بمعرّف الحلقة، لا بعلمٍ منطقيّ** ══════════════
      //  «نعم» على سؤال الإلحاق يرسل `attachToDeviceEpisodeId` بعينه —
      //  والخادمُ يعيد التحقّق الكامل منه تحت القفل، فلا ثقةَ بما وصل هنا
      //  وحده. **ولا `expertUserId` عندها**: الإلحاقُ يشتقّ خبيرَه من أمر
      //  العمل القائم، فلا يُسأل الموظّفُ عن خبيرٍ ليُتجاهَل اختيارُه.
      const res = await apiRequest("POST", "/api/no-exam/device-sale", {
        patientId,
        ...(existingEpisodeId
          ? { existingEpisodeId, expertUserId: Number(expertId) }
          : attaching
            ? { component: requestedItem, attachToDeviceEpisodeId: inManufacturingFullDeviceEpisodeId }
            : { component: requestedItem, expertUserId: Number(expertId) }),
        originalPrice, discountAmount,
        note: note.trim() || null,
      });
      return res.json();
    },
    onSuccess: () => {
      invalidate();
      onOpenChange(false);
      //  **بلا مراجعةٍ لاحقة في أيّ من البابين** — لا `reviewRouted` تُقرأ:
      //  الطبيبُ بلا سلطةٍ على أيّ منهما من أوّلهما (المرحلتان الثالثة
      //  والرابعة)، فلا حاجةَ لإخباره حيّاً ولا استرجاعياً. ونجاحٌ واحد
      //  يُقال بصياغةٍ واحدة.
      toast({
        title: kind === "maintenance" ? MAINTENANCE_SUCCESS_MESSAGE : COMPONENT_SALE_SUCCESS_MESSAGE,
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الحفظ", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  const missingItem = kind === "device_sale" && !existingEpisodeId && !requestedItem;
  const missingComponent = kind === "maintenance" && serviceType === "prosthetic" && !component;
  const maintenanceDeviceUnready = kind === "maintenance"
    && maintenanceDeviceBlocksSave({ phase: devicePhase, selection: deviceSelection });
  //  **والسعرُ جاهزٌ حين يشتقّه الخادمُ بنجاح** — شرطٌ مشتركٌ بين البابين.
  //  **والخبيرُ لازمٌ إلّا عند الإلحاق** — يُشتقّ خادميّاً حينها فلا يُشترَط
  //  اختيارُه؛ **وسؤالُ الإلحاق نفسُه لازمُ جوابٍ** ما دام مطروحاً (لا
  //  افتراضَ صامتاً لـ«نعم» ولا لـ«لا»).
  const ready = (attaching || Boolean(expertId)) && !missingItem && !missingComponent
    && !maintenanceDeviceUnready && !attachUnanswered && Boolean(offer.ok);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" /> عملية بلا معاينة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {kind === "maintenance" ? (
            <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2"
              data-testid="no-exam-op-rule">
              <b>حفظةٌ واحدة</b> — يُفتَح أمرُ العمل ويُقيَّد المبلغُ النهائيّ معاً،
              {" "}<b>بلا مراجعةٍ لاحقة</b>.
            </p>
          ) : (
            <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2"
              data-testid="no-exam-op-rule">
              <b>حفظةٌ واحدة</b> — يُفتَح أمرُ العمل ويُسنَد للخبير فوراً، ويُقيَّد
              {" "}المبلغُ النهائيّ على حساب المريض معه، <b>بلا مراجعةٍ لاحقة</b>.
            </p>
          )}

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

          {/* ── البيع: ما الجزء المراد بيعه؟ ── */}
          {kind === "device_sale" && (
            existingEpisodeId ? (
              <p className="text-sm text-muted-foreground" data-testid="no-exam-op-existing">
                الطلب القائم: <b>{existingRequestedItem
                  ? (COMPONENT_LABELS[existingRequestedItem as keyof typeof COMPONENT_LABELS]
                    ?? existingRequestedItem)
                  : "—"}</b>
              </p>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الجزء المراد بيعه</Label>
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

          {/* ── سؤالُ الإلحاق — صريحٌ، بلا تخمينٍ خادميّ ── */}
          {showAttachPrompt && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{ATTACH_TO_IN_MANUFACTURING_QUESTION}</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm"
                  variant={attachChoice === "yes" ? "default" : "outline"}
                  onClick={() => setAttachChoice("yes")}
                  data-testid="no-exam-op-attach-yes">
                  نعم
                </Button>
                <Button type="button" size="sm"
                  variant={attachChoice === "no" ? "default" : "outline"}
                  onClick={() => setAttachChoice("no")}
                  data-testid="no-exam-op-attach-no">
                  لا
                </Button>
              </div>
              {attaching && (
                <p className="text-xs text-muted-foreground" data-testid="no-exam-op-attach-note">
                  سيُلحَق هذا الجزءُ بأمر التصنيع القائم — بخبيره الحاليّ نفسِه، بلا حلقةٍ
                  أو أمرٍ جديدَين.
                </p>
              )}
            </div>
          )}

          {/* ── الصيانة المبسّطة: جهازٌ ⟵ جزءٌ إن لزم (المرحلة الثالثة) ── */}
          {kind === "maintenance" && (
            <>
              {/*  **الجهازُ أوّلاً** — بلا سؤال منشأ. مسجَّلٌ بعينه، أو إقرارٌ
                  صريح أنه غير مسجَّل؛ لا صمتَ يُفسَّر في أيّ طرف. */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">الجهاز المراد صيانته</Label>
                {devicePhase === "loading" && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2"
                    data-testid="no-exam-op-device-loading">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    جارٍ التحقّق من أجهزة المريض المسجَّلة…
                  </p>
                )}
                {devicePhase === "error" && (
                  <div className="space-y-1">
                    <p className="text-sm text-destructive" data-testid="no-exam-op-device-error">
                      تعذّر تحميل أجهزة المريض — تحقّق من الاتصال.
                    </p>
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => deviceQuery.refetch()} data-testid="no-exam-op-device-retry">
                      إعادة المحاولة
                    </Button>
                  </div>
                )}
                {devicePhase === "none" && (
                  <p className="text-sm rounded-md border bg-slate-50 px-3 py-2"
                    data-testid="no-exam-op-device-none">
                    لا أجهزةٌ مسجَّلة لهذا المريض — سيُسجَّل <b>كجهاز غير مسجَّل في النظام</b>.
                  </p>
                )}
                {devicePhase === "choose" && (
                  <Select value={deviceSelection} onValueChange={setDeviceSelection}>
                    <SelectTrigger data-testid="no-exam-op-device">
                      <SelectValue placeholder="اختر الجهاز…" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((e) => (
                        <SelectItem key={e.id} value={String(e.id)}>{describeEpisode(e)}</SelectItem>
                      ))}
                      <SelectItem value={UNREGISTERED_DEVICE}>
                        جهاز غير مسجَّل في النظام
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>

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
            </>
          )}

          {/* ── مَن ينفّذ — إلّا عند الإلحاق، فالخبيرُ خبيرُ الأمر القائم ── */}
          {/*  **أربعُ حالاتٍ تُقال بأسمائها.** والقائمةُ الفارغة كانت تقولها
              كلَّها بصوتٍ واحد: حقلٌ لا يفتح ولا يشرح.
              **ولا يُعرَض هذا الحقلُ إطلاقاً عند الإلحاق** — سؤالُ الموظّف عن
              خبيرٍ ثمّ تجاهلُ اختياره كان الخطأ؛ فلا يُسأل أصلاً. */}
          {!attaching && (
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
          )}

          {/* ── السعر: أصليّ وخصمٌ، والنهائيّ يُشتقّ — مشتركٌ بين البابين ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">السعر الأصلي (د.ع)</Label>
            <MoneyInput value={originalPrice} onValueChange={setOriginalPrice}
              data-testid="no-exam-op-original-price" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">مقدار الخصم (د.ع)</Label>
            <MoneyInput value={discountAmount} onValueChange={setDiscountAmount}
              data-testid="no-exam-op-discount-amount" />
            <p className="text-xs text-muted-foreground">
              صفرٌ = بلا خصم. ومساواةُ الخصم للسعر الأصلي = مجّانيّ صراحةً.
            </p>
          </div>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm"
            data-testid="no-exam-op-final-price">
            {offer.ok ? (
              offer.kind === "free" ? (
                <span><b>مجاني</b> — السعر النهائي: 0 د.ع</span>
              ) : (
                <span>
                  السعر النهائي: <b>{offer.finalPrice!.toLocaleString("en-US")} د.ع</b>
                  {offer.kind === "discount" && (
                    <span className="text-muted-foreground">
                      {" "}(بعد خصم {discountAmount.toLocaleString("en-US")} من{" "}
                      {originalPrice.toLocaleString("en-US")})
                    </span>
                  )}
                </span>
              )
            ) : (
              <span className="text-muted-foreground">
                {offer.error ?? "أدخل السعر الأصلي ومقدار الخصم"}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ملاحظة (اختياري)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={kind === "maintenance" ? "ملاحظةٌ على الزيارة" : "ملاحظةٌ على العملية"}
              data-testid="no-exam-op-note" />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={!ready || save.isPending} data-testid="no-exam-op-submit"
            onClick={() => save.mutate()}>
            {save.isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : kind === "maintenance" ? "حفظ الصيانة وبدء التصنيع" : "حفظ البيع وبدء التصنيع"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
