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

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { Loader2, Wallet, AlertTriangle } from "lucide-react";
import { PROSTHETIC_COMPONENTS, COMPONENT_LABELS } from "@shared/prosthetic_parts";
import { PENDING_CHARGE_KIND_LABELS, type PendingChargeKind } from "@shared/pending_charge";
import { deriveOfferFromDiscount, parsePaidNowAmount } from "@shared/commercial";
import {
  MAINTENANCE_SUCCESS_MESSAGE, MAINTENANCE_WARRANTY_LABEL,
  MAINTENANCE_SIMILAR_TITLE, MAINTENANCE_SIMILAR_HINT,
  MAINTENANCE_SIMILAR_BACK, MAINTENANCE_SIMILAR_CONTINUE,
  deriveMaintenanceTerms, describeSimilarMaintenance,
  shouldPromptSimilarMaintenance, type SimilarMaintenanceOrder,
} from "@shared/maintenance";
import {
  COMPONENT_SALE_SUCCESS_MESSAGE, COMPONENT_ATTACH_SUCCESS_MESSAGE,
  ATTACH_TO_IN_MANUFACTURING_QUESTION,
} from "@shared/component_sale";
import { useDeviceEpisodes, describeEpisode } from "./DeviceEpisodeSelect";
import {
  resolveResumeTarget, nextSubmissionToken, mintSubmissionToken,
} from "./patient_service_launcher_logic";
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
  /**
   * **عملياتُ بيعٍ بلا معاينة فُتحت ولم تكتمل** على خيط هذا المريض — كلُّها،
   * لا واحدةٌ منتقاة سلفاً.
   *
   * وجودُ **أيّ** منها يعني أن هذه العمليةَ استئنافٌ لا بيعٌ جديد: تُسجَّل
   * على الحلقة القائمة ولا تُفتَح ثانيةٌ فوقها. والعددُ هو ما يحسم الشاشة:
   *
   * · **صفر** ⟶ بيعٌ جديد كما كان تماماً — يُختار الجزءُ من القائمة.
   * · **واحدة** ⟶ تُستأنَف ضمناً كما كانت تماماً — يُعرَض ما طُلب فيها.
   * · **أكثر** ⟶ **اختيارٌ صريح إلزاميّ** (ترحيل ٠٧٣ رفع `uq_pde_case_open`
   *   فصارت العملياتُ المتوازية المستقلّة ممكنة). واستئنافُ الأولى صامتاً
   *   كان يفتح النموذجَ على عمليةٍ لم يقصدها أحد — بل على ترتيب وصول
   *   الصفوف من الخادم. فيُعرَض **الجزءُ ورقمُ العملية** ويُختار.
   */
  resumeCandidates?: { episodeId: number; requestedItem: string; sequenceNumber: number | null }[];
  /**
   * **مُرشَّحون لسؤال الإلحاق** — كلُّ طرفٍ كاملٍ قيد التصنيع بالفعل على خيط
   * المريض (قد يزيد عن واحد، ترحيل ٠٧٣: عملياتٌ متوازية مستقلّة). وجودُهم
   * **لا يُلحق شيئاً ضمناً**: يُعرَض على الموظّف سؤالٌ صريح («هل هذا الجزء
   * إضافة إلى الطرف الجاري تصنيعه؟»)، وجوابُه وحده يقرّر. قائمةٌ فارغة تعني
   * عدمَ عرض السؤال أصلاً — لا جهازَ قيد التصنيع، فلا التباسَ ممكناً.
   * **وأكثرُ من مُرشَّح ⟶ اختيارٌ صريح إلزاميّ** — لا يُلحَق الجزءُ بأوّل
   * جهازٍ صامتاً.
   */
  attachCandidates?: { episodeId: number; sequenceNumber: number | null }[];
  /**
   * **«نوع العملية» محسومٌ قبل فتح النافذة** — من مُوجِّه «ما سبب حضور
   * المريض اليوم؟» بعد التسجيل مثلاً. فلا يُعاد سؤالٌ أجاب عنه اختيارُ
   * الزرّ بعينه — نفسُ منطق `existingEpisodeId` أدناه بالضبط، لسببٍ مختلف.
   */
  initialKind?: Kind;
}

export function NoExamOperationDialog({
  open, onOpenChange, patientId, branchId, serviceType,
  resumeCandidates = [], attachCandidates = [], initialKind,
}: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();

  //  ══ **العمليةُ المستأنَفة — واحدةٌ تُحسَم، وأكثرُ تُختار** (ترحيل ٠٧٣) ══
  //  `resuming` تقول «على الملفّ عمليةٌ معلَّقة»، و`existingEpisodeId` تقول
  //  «وهذه هي بعينها». والاثنتان لا تتطابقان حين يتعدّد المُرشَّحون ولم
  //  يُختَر بعد — وتلك بالضبط الحالةُ التي تمنع الحفظ (`resumeUnpicked`)
  //  بدل أن يُنتقى الأوّلُ صامتاً.
  //  والقرارُ نفسُه في `resolveResumeTarget` — دالّةٌ خالصة تُختبَر دخلاً
  //  وخرجاً، لا نصّاً يُقرأ. فانتقاءٌ صامتٌ يعود يوماً بصياغةٍ أخرى يسقط
  //  في الاختبار لا يمرّ.
  const [resumeTargetId, setResumeTargetId] = useState<string>("");
  const resume = resolveResumeTarget({
    candidates: resumeCandidates, pickedId: resumeTargetId,
  });
  const resuming = resume.resuming;
  const existingEpisodeId = resume.episodeId;
  const existingRequestedItem = resume.requestedItem;

  //  ══ **نوعُ العملية محسومٌ متى كان معلوماً** ═══════════════════════════
  //  ثلاثةُ أسبابٍ تحسمه، وكلُّها تسبق فتحَ النافذة:
  //    · **المساندُ الطبية** — لا بيعَ لها بلا معاينة إطلاقاً، فصيانةٌ حتماً.
  //      وهذا حارسٌ **بنيويّ** لا مجرّد إخفاءِ خيار: ولو وصلها `initialKind`
  //      ملفَّقٌ بـ`device_sale` لبقيت صيانة، فلا تُنتج الشاشةُ ما يردّه الخادم.
  //    · **حلقةٌ قائمة تُستأنَف** — بيعٌ بحكم وجودها.
  //    · **اختيارُ المُوجِّه** — أجاب الموظّفُ بضغطته.
  const fixedKind: Kind | null = serviceType === "medical_support"
    ? "maintenance"
    : (initialKind ?? (resuming ? "device_sale" : null));

  const [kind, setKind] = useState<Kind>(fixedKind ?? "maintenance");
  //  البيعُ للأطراف وحدها الآن، فلا قيمةَ ابتدائية «كاملة» تُحشى للمساند.
  //  **والاسمُ محليٌّ يخصّ الجزءَ المراد بيعه** — لا يصطدم بحالة الصيانة
  //  `component` أدناه (حقلٌ مختلفٌ تماماً: الجزء المراد صيانته).
  const [requestedItem, setRequestedItem] = useState<string>("");
  const [component, setComponent] = useState<string>("");
  const [expertId, setExpertId] = useState<string>("");
  const [note, setNote] = useState("");

  //  ══ **سؤالُ الإلحاق — جوابٌ صريحٌ، لا افتراضاً صامتاً** ═══════════════
  //  `null` = لم يُجَب بعد. لا تفترض «لا» ولا «نعم»: طلبٌ بلا جوابٍ يبقى
  //  غيرَ جاهزٍ للحفظ (انظر `ready` أدناه) ما دام السؤالُ مطروحاً أصلاً.
  const [attachChoice, setAttachChoice] = useState<"yes" | "no" | null>(null);
  //  ══ **هدفُ الإلحاق حين يتعدّد المُرشَّحون** (ترحيل ٠٧٣) ══════════════
  //  مُرشَّحٌ واحد ⟶ لا اختيار، الحلقةُ الوحيدة هي الهدف. أكثرُ من واحد ⟶
  //  اختيارٌ صريح إلزاميّ — **لا يُختار الأوّلُ صامتاً أبداً**.
  const [attachTargetId, setAttachTargetId] = useState<string>("");
  //  يُعرَض فقط عند بيع جزءٍ جديد (لا استئنافَ حلقةٍ موروثة — لتلك مسارُها
  //  الخاصّ ولا معنى لسؤال الإلحاق عليها) وحين يوجد مُرشَّحٌ واحدٌ فأكثر.
  //  **`!resuming` لا `!existingEpisodeId`**: مع عملياتٍ معلَّقة لم يُختَر
  //  منها بعدُ واحدة، كان الشرطُ الثاني يصير صادقاً فيظهر سؤالُ الإلحاق على
  //  استئنافٍ لا معنى له فيه — سؤالُ الإلحاق لبيعٍ **جديد** وحده.
  const showAttachPrompt = kind === "device_sale" && !resuming
    && attachCandidates.length > 0;
  const attaching = showAttachPrompt && attachChoice === "yes";
  const attachUnanswered = showAttachPrompt && attachChoice === null;
  //  مُرشَّحٌ واحدٌ يُحسَم ضمناً (نفسُ الشاشة القديمة تماماً)؛ أكثرُ من واحد
  //  يحتاج اختيار الموظّف من `attachTargetId`.
  const resolvedAttachEpisodeId = !attaching ? null
    : attachCandidates.length === 1 ? attachCandidates[0].episodeId
    : attachTargetId ? Number(attachTargetId) : null;
  const attachUnpicked = attaching && attachCandidates.length > 1 && resolvedAttachEpisodeId === null;

  //  ══ **السعرُ — أصليّ وخصمٌ، مشتركان بين بيع الجزء والصيانة** ══════════
  //  (المرحلة الرابعة) نفسُ الاشتقاق حرفياً في البابين — فلا حسابَ مكرَّر
  //  ولا حقلَ سعرٍ نهائيٍّ يُكتب يدوياً في أيٍّ منهما.
  const [originalPrice, setOriginalPrice] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  //  ══ **«المبلغ المدفوع الآن» — يبدأ فارغاً دائماً، لا صفراً** ══════════
  //  (المرحلة الخامسة) الفراغُ يعني «لم يُسأل الموظّفُ بعد» — يُرفَض. والصفرُ
  //  الصريح يعني «سُئل وأجاب: لا شيء الآن» — دَينٌ حقيقيّ يُقبَل. **ولا
  //  يُستنتَج أحدُهما من الآخر أبداً**، فالحالةُ تبدأ `null` (`MoneyInput`
  //  بـ`allowEmpty` تعرضه فراغاً حقيقياً لا صفراً معروضاً).
  const [paidNow, setPaidNow] = useState<number | null>(null);

  //  ══ **الصيانةُ المبسّطة — حقلها الخاصّ** (المرحلة الثالثة) ═══════════
  //  جهازٌ يُختار من قائمة؛ بيعُ الجزء لا جهازَ قائماً له فلا يحتاج نظيرَه.
  const [deviceSelection, setDeviceSelection] = useState<string>("");

  //  ══ **ضمن الضمان** (ترحيل ٠٨٣) — حالةٌ مستقلّة لا «مجّانيّ» بثوبٍ آخر ══
  //  الأجرُ صفرٌ بقرار التزامٍ سابق. **ولا شرطَ أهليّةٍ محسوب**: لا مدّةَ
  //  ولا تاريخَ شراءٍ ولا عدَّ مرّات — الموظّفُ هو مَن يقرّر.
  const [underWarranty, setUnderWarranty] = useState(false);
  const warrantyOn = kind === "maintenance" && underWarranty;

  //  ══ **تنبيهُ الصيانة المشابهة — معلوماتيٌّ لا يمنع** ═══════════════════
  //  `rows === null` لم يُسأل بعد (أو رجع الموظّفُ فأُغلق)؛ ومصفوفةٌ غيرُ
  //  فارغة تفتح النافذة. **ولا تُكتَب كلمةٌ قبل أن يقرّر**.
  const [similarRows, setSimilarRows] = useState<SimilarMaintenanceOrder[] | null>(null);
  const [similarAck, setSimilarAck] = useState(false);
  const [similarChecking, setSimilarChecking] = useState(false);
  const similarPromptOpen = kind === "maintenance"
    && shouldPromptSimilarMaintenance({ rows: similarRows, acknowledged: similarAck });

  //  **وفتحُ النافذة يبدأ صفحةً بيضاء**: ضمانٌ مطفأ وتنبيهٌ لم يُسأل بعد —
  //  فلا يُورَّث قرارُ عمليةٍ سابقة إلى عمليةٍ جديدة.
  useEffect(() => {
    setUnderWarranty(false);
    setSimilarRows(null);
    setSimilarAck(false);
  }, [open]);

  //  **وتغيُّرُ الهدف يُبطل الموافقةَ السابقة**: التشابهُ عن **هذا** الجهاز
  //  وهذا الجزء بعينهما، فموافقةٌ على غيرهما ليست موافقةً عليهما.
  useEffect(() => {
    setSimilarRows(null);
    setSimilarAck(false);
  }, [deviceSelection, component, serviceType]);

  //  ══ **تذكرةُ الإرسال — ضغطةٌ واحدة = عمليةُ صيانةٍ واحدة** ═════════════
  //  (المرحلةُ الأولى من تبسيط الصيانة، ٢٠٢٦-٠٩-١٨)
  //
  //  **نافذةٌ مفتوحة ⟶ رمزٌ واحدٌ يثبت**: فإعادةُ الإرسال بعد فشلٍ شبكيّ —
  //  أو ضغطةٌ ثانية على «حفظ» — تحمل الرمزَ عينه، فيقرؤها الخادمُ عمليةً
  //  واحدة. **وإغلاقُ النافذة يصفّره**: عمليةُ صيانةٍ جديدة تعني فتحاً
  //  جديداً، فتُسكّ تذكرةٌ جديدة — **ولا يُمنَع عملٌ حقيقيّ متكرّر** (مريضٌ
  //  يكسر قالبَه مرّتين في أسبوع)، وهو بعينه ما رفعه ترحيلُ ٠٨٢.
  //
  //  **والدالّتان هما القائمتان المُختبَرتان** (`patient_service_launcher_logic`)
  //  اللتان تستعملهما «خدمة جديدة» — لا نسخةَ ثانية تنحرف. والأثرُ يتبع
  //  **حالةَ** `open` لا حدثَ فتحها: هذه النافذةُ قد تُركَّب مفتوحةً أصلاً،
  //  فلا `onOpenChange` يقع وكانت التذكرةُ ستبقى فارغة.
  const [submissionToken, setSubmissionToken] = useState<string>("");
  useEffect(() => {
    setSubmissionToken((prev) => nextSubmissionToken(prev, open, mintSubmissionToken));
  }, [open]);

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
  //  **وبالضمان يشتقّ المسارُ الصيانيُّ نفسُه** الذي يعتمده الخادم — أصليٌّ
  //  محفوظ، ونهائيٌّ صفر، وبلا خصم. وبلا ضمانٍ يبقى الاشتقاقُ المشترك كما
  //  كان بحرفه (بيعُ الجزء لا يعرف الضمانَ أصلاً).
  const offer = warrantyOn
    ? deriveMaintenanceTerms({ originalPrice, discountAmount: 0, underWarranty: true })
    : deriveOfferFromDiscount({ originalPrice, discountAmount });

  //  ══ **جهوزيّةُ «المبلغ المدفوع الآن»** — نفسُ الحدّ الذي سيُطبَّق خادميّاً
  //  حرفاً بحرف؛ لا يُحسَب هنا بمعزلٍ عنه. `!offer.ok` تعني «لا سعرَ بعد»
  //  فلا معنى لسؤال القبض قبله — يُقرأ حينها كغيرِ جاهز، لا كخطأ يُعرَض. ═══
  const paidNowCheck = offer.ok
    ? parsePaidNowAmount({ raw: paidNow, finalPrice: offer.finalPrice! })
    : { ok: false, amount: 0, error: undefined as string | undefined };

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
          originalPrice,
          //  **ولا خصمَ يُرسَل مع الضمان** — الأجرُ صفرٌ بقرار التزامٍ سابق
          //  لا بخصمٍ يُمنَح، والخادمُ يردّ الاثنين معاً.
          ...(warrantyOn ? { underWarranty: true } : { discountAmount }),
          //  **المُتحقَّقُ لا الخام** — نفسُ ما اعتمده الخادمُ في `ready` أعلاه.
          paidNow: paidNowCheck.amount,
          note: note.trim() || null,
          //  **وتذكرةُ الإرسال** — الخادمُ يحجزها داخل معاملة العملية قبل أيّ
          //  كتابة، فإعادةُ الإرسال بالرمز عينه تُقرأ «مسجَّلة سابقاً» ولا
          //  تُنتج أمراً ولا زيارةً ولا قيدَ كلفةٍ ولا دفعةً ثانية.
          submissionToken,
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
            ? { component: requestedItem, attachToDeviceEpisodeId: resolvedAttachEpisodeId }
            : { component: requestedItem, expertUserId: Number(expertId) }),
        originalPrice, discountAmount,
        //  **المُتحقَّقُ لا الخام** — يشمل الإلحاقَ أيضاً؛ نفسُ الحدّ الأعلى
        //  الذي سيُطبَّق خادميّاً حرفاً بحرف.
        paidNow: paidNowCheck.amount,
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
      //  يُقال بصياغةٍ واحدة — **إلّا الإلحاقَ**: «فتح أمر العمل» كذبٌ عليه،
      //  فله رسالتُه الخاصّة.
      toast({
        title: attaching
          ? COMPONENT_ATTACH_SUCCESS_MESSAGE
          : kind === "maintenance" ? MAINTENANCE_SUCCESS_MESSAGE : COMPONENT_SALE_SUCCESS_MESSAGE,
      });
    },
    onError: (err: any) => toast({
      title: "تعذّر الحفظ", description: err?.message ?? "حاول مرة أخرى",
      variant: "destructive",
    }),
  });

  /**
   * **الفحصُ المعلوماتيُّ قبل الحفظ** — قراءةٌ فقط: لا تذكرةَ تُحجَز ولا صفَّ
   * يُكتب. صيانةٌ مشابهةٌ مفتوحة ⟶ تُعرَض النافذةُ **ولا يُكتب شيء** حتى
   * يقرّر الموظّف. ولا مشابهَ ⟶ الحفظُ يمضي مباشرةً كما كان بحرفه.
   *
   * **وفشلُ الفحص لا يمنع عملاً مشروعاً**: تنبيهٌ تعذّر ليس سبباً لتعطيل
   * صيانةٍ يريدها الموظّف — فيُتخطّى بصمت ويمضي الحفظ.
   */
  const runSubmit = async () => {
    if (kind === "maintenance" && !similarAck) {
      const target = resolveMaintenanceDeviceTarget({
        phase: devicePhase, selection: deviceSelection,
      });
      setSimilarChecking(true);
      try {
        const res = await apiRequest("POST", "/api/no-exam/maintenance/similar", {
          patientId, serviceType,
          maintenanceComponent: serviceType === "prosthetic" ? component : null,
          deviceEpisodeId: target?.deviceEpisodeId ?? null,
          legacyUnrecordedDevice: target?.legacyUnrecordedDevice ?? false,
        });
        const body = await res.json();
        const rows: SimilarMaintenanceOrder[] = Array.isArray(body?.similar) ? body.similar : [];
        if (rows.length > 0) { setSimilarRows(rows); return; }
      } catch {
        //  معلوماتيٌّ فحسب — لا يحجب الحفظ.
      } finally {
        setSimilarChecking(false);
      }
    }
    save.mutate();
  };

  /**
   * **متابعة** — أمرُ صيانةٍ جديدٌ مستقلٌّ كامل، **وبالتذكرة الحالية نفسِها**:
   * ضغطةٌ واحدة تبقى عمليةً واحدة، والتنبيهُ لم يغيّر من ذلك حرفاً.
   */
  const continueDespiteSimilar = () => {
    setSimilarAck(true);
    setSimilarRows(null);
    save.mutate();
  };

  const missingItem = kind === "device_sale" && !resuming && !requestedItem;
  //  **ولا حفظَ على عمليةٍ لم تُختَر** حين تتعدّد المعلَّقات — لا يُنتقى
  //  الأوّلُ صامتاً، ولا يُفتَح بيعٌ جديد فوق عمليةٍ قائمة.
  const resumeUnpicked = kind === "device_sale" && resume.unpicked;
  const missingComponent = kind === "maintenance" && serviceType === "prosthetic" && !component;
  const maintenanceDeviceUnready = kind === "maintenance"
    && maintenanceDeviceBlocksSave({ phase: devicePhase, selection: deviceSelection });
  //  **ولا حفظَ قبل أن تُسكَّ تذكرةُ الإرسال** (الصيانةُ وحدها — بيعُ الجزء
  //  لا يرسلها أصلاً). `useEffect` يسكّها **بعد** أوّل رسم، فثمّة لحظةٌ
  //  يكون فيها الزرُّ ظاهراً والتذكرةُ فارغة؛ وإرسالٌ فيها يُردّ ٤٠٠ من
  //  الخادم. فيُمنَع الزرُّ حتى توجد — والخادمُ يبقى الحارسَ الحقيقيّ.
  const maintenanceTokenUnready = kind === "maintenance" && !submissionToken;
  //  **والسعرُ جاهزٌ حين يشتقّه الخادمُ بنجاح** — شرطٌ مشتركٌ بين البابين.
  //  **والخبيرُ لازمٌ إلّا عند الإلحاق** — يُشتقّ خادميّاً حينها فلا يُشترَط
  //  اختيارُه؛ **وسؤالُ الإلحاق نفسُه لازمُ جوابٍ** ما دام مطروحاً (لا
  //  افتراضَ صامتاً لـ«نعم» ولا لـ«لا»)، **وهدفُه لازمٌ أيضاً حين يتعدّد
  //  المُرشَّحون** (`attachUnpicked`) — لا يُختار أحدُهم صامتاً. **والمبلغُ
  //  المدفوعُ الآن لازمٌ كذلك** — فراغُه على سعرٍ موجب يمنع الحفظ تماماً
  //  كسعرٍ ناقص.
  const ready = (attaching || Boolean(expertId)) && !missingItem && !missingComponent
    && !maintenanceDeviceUnready && !maintenanceTokenUnready
    && !attachUnanswered && !attachUnpicked && !resumeUnpicked
    && Boolean(offer.ok) && paidNowCheck.ok;

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
          ) : attaching ? (
            //  ══ **الإلحاقُ ليس بيعاً جديداً** — لا أمرَ يُفتَح ولا خبيرَ
            //  يُسنَد، فالصياغةُ تقول الفعلَ الحقيقيّ لا صياغةَ البيع
            //  الجديد المُعادةَ بلا تدقيق. ═══════════════════════════════
            <p className="text-sm bg-sky-50 border border-sky-200 rounded-md px-3 py-2"
              data-testid="no-exam-op-rule">
              <b>حفظةٌ واحدة</b> — يُضاف هذا الجزءُ إلى أمر التصنيع القائم بخبيره
              {" "}الحاليّ نفسِه، ويُقيَّد سعرُه على حساب المريض معه، <b>بلا مراجعةٍ
              {" "}لاحقة</b>.
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
                    : resuming
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
            resuming ? (
              resumeCandidates.length === 1 ? (
                <p className="text-sm text-muted-foreground" data-testid="no-exam-op-existing">
                  الطلب القائم: <b>{existingRequestedItem
                    ? (COMPONENT_LABELS[existingRequestedItem as keyof typeof COMPONENT_LABELS]
                      ?? existingRequestedItem)
                    : "—"}</b>
                </p>
              ) : (
                //  ── أكثرُ من عمليةٍ معلَّقة على القسم نفسِه — اختيارٌ صريح ──
                //  ولا يُستأنَف الأوّلُ عنه (ترحيل ٠٧٣: عملياتٌ متوازية).
                //  ويُعرَض **الجزءُ ورقمُ العملية** معاً: جزءان مختلفان قد
                //  يتشابهان بالاسم، ورقمان مختلفان يفرّقان بينهما قطعاً.
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">أيّ عملية تُكمِل؟</Label>
                  <p className="text-xs text-muted-foreground"
                    data-testid="no-exam-op-resume-hint">
                    على هذا الملفّ <b>أكثرُ من عمليةٍ معلَّقة</b> لم تكتمل. اختر
                    {" "}المقصودة — <b>ولا تُفتَح عمليةٌ جديدة</b> ما دامت واحدةٌ منها
                    {" "}قائمة.
                  </p>
                  <Select value={resumeTargetId} onValueChange={setResumeTargetId}>
                    <SelectTrigger data-testid="no-exam-op-resume-target">
                      <SelectValue placeholder="اختر العملية…" />
                    </SelectTrigger>
                    <SelectContent>
                      {resumeCandidates.map((c) => (
                        <SelectItem key={c.episodeId} value={String(c.episodeId)}>
                          {`${COMPONENT_LABELS[c.requestedItem as keyof typeof COMPONENT_LABELS]
                            ?? c.requestedItem} · طلب #${c.sequenceNumber ?? "؟"}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )
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
              {/*  ── أكثرُ من طرفٍ كاملٍ قيد التصنيع معاً — اختيارٌ صريح ──
                  ولا يُختار أحدُهم عنه (ترحيل ٠٧٣: عملياتٌ متوازية). */}
              {attaching && attachCandidates.length > 1 && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">أيّ طرفٍ بعينه؟</Label>
                  <Select value={attachTargetId} onValueChange={setAttachTargetId}>
                    <SelectTrigger data-testid="no-exam-op-attach-target">
                      <SelectValue placeholder="اختر الجهاز…" />
                    </SelectTrigger>
                    <SelectContent>
                      {attachCandidates.map((c) => (
                        <SelectItem key={c.episodeId} value={String(c.episodeId)}>
                          {`طرف صناعي #${c.sequenceNumber ?? "؟"} · قيد التصنيع`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
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

              {/*  ── ضمن الضمان — قرارُ الموظّف، بلا أهليّةٍ محسوبة ──
                  **والسعرُ الأصليُّ يبقى مطلوباً**: القيمةُ الاسمية للصيانة
                  تُحفَظ ولو لم يُدفَع منها دينار — وإلّا لم يُعرَف يوماً كم
                  كلّف الالتزامُ المركزَ. */}
              <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <Checkbox id="no-exam-op-warranty-box" checked={underWarranty}
                  onCheckedChange={(v) => {
                    const on = !!v;
                    setUnderWarranty(on);
                    //  **ولا بقايا من قرارٍ سابق**: خصمٌ أو مبلغٌ مدفوعٌ
                    //  كُتبا قبل التأشير لا معنى لهما بعده.
                    if (on) { setDiscountAmount(0); setPaidNow(null); }
                  }}
                  data-testid="no-exam-op-warranty" />
                <Label htmlFor="no-exam-op-warranty-box"
                  className="cursor-pointer text-sm font-normal leading-5">
                  <b>{MAINTENANCE_WARRANTY_LABEL}</b> — بلا أجور: لا مبلغ يُقيَّد ولا
                  دَين ولا دفعة. والسعرُ الأصليُّ يبقى مطلوباً ومحفوظاً كقيمةٍ اسمية.
                </Label>
              </div>
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
          {/*  **ولا حقلَ خصمٍ مع الضمان** — الأجرُ صفرٌ بقرار التزامٍ سابق لا
              بخصمٍ يُمنَح، فلا يُسأل الموظّفُ سؤالاً لا معنى له. */}
          {!warrantyOn && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">مقدار الخصم (د.ع)</Label>
              <MoneyInput value={discountAmount} onValueChange={setDiscountAmount}
                data-testid="no-exam-op-discount-amount" />
              <p className="text-xs text-muted-foreground">
                صفرٌ = بلا خصم. ومساواةُ الخصم للسعر الأصلي = مجّانيّ صراحةً.
              </p>
            </div>
          )}
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm"
            data-testid="no-exam-op-final-price">
            {offer.ok ? (
              warrantyOn ? (
                <span data-testid="no-exam-op-final-warranty">
                  <b>{MAINTENANCE_WARRANTY_LABEL}</b> — السعر النهائي: 0 د.ع
                  <span className="text-muted-foreground">
                    {" "}(القيمة الاسمية {offer.originalPrice!.toLocaleString("en-US")} د.ع)
                  </span>
                </span>
              ) : offer.kind === "free" ? (
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

          {/* ── المبلغ المدفوع الآن — إلزاميّ على سعرٍ موجب، معطَّلٌ على
              المجّانيّ. مشتركٌ بين البابين كنظيره السعر أعلاه. ── */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">المبلغ المدفوع الآن (د.ع)</Label>
            {warrantyOn ? (
              <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-muted-foreground"
                data-testid="no-exam-op-paid-now-warranty">
                {MAINTENANCE_WARRANTY_LABEL} — لا مبلغ يُدفَع ولا دَين يُسجَّل.
              </p>
            ) : offer.ok && offer.kind === "free" ? (
              <p className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-muted-foreground"
                data-testid="no-exam-op-paid-now-free">
                مجاني بالكامل — قيمة المجاني: {offer.originalPrice!.toLocaleString("en-US")} د.ع
              </p>
            ) : (
              <>
                <MoneyInput value={paidNow} onValueChange={setPaidNow} allowEmpty
                  disabled={!offer.ok} data-testid="no-exam-op-paid-now" />
                <p className="text-xs text-muted-foreground">
                  اكتب صفراً إن لم يُدفَع شيء الآن — المبلغ لا يُخمَّن من السعر أبداً.
                </p>
                {/*  **والخطأُ الأحمر لتصحيحٍ لا لفراغٍ لم يُلمَس بعد** —
                    `paidNow !== null` يعني كَتَب الموظّفُ شيئاً؛ الفراغُ
                    الأوّليّ يبقى على التلميح الرماديّ وحده، كصندوق السعر
                    النهائيّ أعلاه بالضبط. */}
                {offer.ok && paidNow !== null && !paidNowCheck.ok && paidNowCheck.error && (
                  <p className="text-xs text-destructive" data-testid="no-exam-op-paid-now-error">
                    {paidNowCheck.error}
                  </p>
                )}
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">ملاحظة (اختياري)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={kind === "maintenance" ? "ملاحظةٌ على الزيارة" : "ملاحظةٌ على العملية"}
              data-testid="no-exam-op-note" />
          </div>
        </div>

        {/*  ── تنبيهُ الصيانة المشابهة — معلوماتيٌّ لا يمنع ──
            يظهر **قبل أيّ كتابة**، ويُغلَق بأحد قرارين لا ثالثَ لهما. */}
        {similarPromptOpen && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 space-y-2"
            data-testid="no-exam-op-similar">
            <p className="text-sm font-medium flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" /> {MAINTENANCE_SIMILAR_TITLE}
            </p>
            <ul className="space-y-1">
              {(similarRows ?? []).map((row) => (
                <li key={row.workOrderId} className="text-sm text-amber-900"
                  data-testid={`no-exam-op-similar-row-${row.workOrderId}`}>
                  {describeSimilarMaintenance(row)}
                </li>
              ))}
            </ul>
            <p className="text-xs text-amber-800">{MAINTENANCE_SIMILAR_HINT}</p>
          </div>
        )}

        <DialogFooter>
          {similarPromptOpen ? (
            <div className="flex gap-2">
              {/*  **رجوع — صفرُ كتابة**: لم يُرسَل شيءٌ أصلاً، والفحصُ قراءةٌ فقط. */}
              <Button variant="outline" disabled={save.isPending}
                data-testid="no-exam-op-similar-back"
                onClick={() => setSimilarRows(null)}>
                {MAINTENANCE_SIMILAR_BACK}
              </Button>
              <Button disabled={!ready || save.isPending}
                data-testid="no-exam-op-similar-continue"
                onClick={continueDespiteSimilar}>
                {save.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : MAINTENANCE_SIMILAR_CONTINUE}
              </Button>
            </div>
          ) : (
            <Button disabled={!ready || save.isPending || similarChecking}
              data-testid="no-exam-op-submit"
              onClick={() => { void runSubmit(); }}>
              {save.isPending || similarChecking
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : attaching
                  ? "حفظ البيع وإضافته للطرف الجاري تصنيعه"
                  : kind === "maintenance" ? "حفظ الصيانة وبدء التصنيع" : "حفظ البيع وبدء التصنيع"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
