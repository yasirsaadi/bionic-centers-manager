// بطاقةُ «قرار المريض بعد المعاينة» في صفحة المريض.
//
// ══ الأزرار تتبع الصلاحية والحالة معاً ══════════════════════════════════
// الاستعلامات يرى «اشترى» و«لم يشترِ» و«متابعة»، ومديرُ الفرع يرى معها
// «تحديد السعر النهائي». والطبيبُ المخوَّل يرى الأفعالَ التشغيلية نفسَها
// ومعها «المريض يرغب بالشراء الآن» — **ما عدا تحديدَ السعر**.
//
// **ومشاركةُ الطبيب اختيارية**: يستطيع أن يسجّل إن حضر، ولا يُطلَب منه شيء
// ولا ينتظره ملفّ. والشاشةُ لا تقول له «يجب» في موضعٍ واحد.
//
// **ولا زرَّ اعتمادٍ لأحد** في المسار الحيّ: القرارُ التجاري لمديرِ الفرع
// يُحفظ في اللحظة، والشراءُ تسجيلُ واقعةٍ لا استئذان. وما بقي من أزرار
// الاعتماد فلصفوفٍ معلَّقةٍ من المسار القديم حتى تنفد.
//
// وهذا **عرضٌ لا حراسة**: الخادم يفحص كلّ كتابة مهما أظهرت الواجهة —
// و`allowedActions` مشتركةٌ بينهما فلا تنحرف قاعدةٌ عن قاعدة.
//
// ══ ⚠ مسارُ المعاينة الجديد — بابٌ واحد لا ثلاثة (المرحلة الثانية) ═══════
// كانت «تفاصيل البيع» و«اشترى» زرَّين منفصلَين لخطوتين حول واقعةٍ واحدة.
// **صارا فعلاً واحداً «إتمام البيع»**: خبيرٌ + سعرٌ أصليّ + مقدارُ خصم،
// وحفظٌ واحد = قرارُ «اشترى» + بدءُ التصنيع معاً. **ولا نوعَ سعرٍ يُختار
// ولا سعرَ نهائيّاً يُكتب** — النهائيُّ معاينةٌ حيّة فقط
// (`deriveOfferFromDiscount`، الدالّةُ التي يعتمدها الخادم بنفسها)، ولا
// يُرسَل في الطلب أبداً. و«لم يشترِ» بقي الفعلَ الوحيد المنفصل، بسببٍ حرٍّ
// إلزاميّ. **وهذا البابُ للاستقبال والمحاسب ومديرِ الفرع والمسؤول العام —
// الطبيبُ لا يراه أبداً** (تصحيحٌ 2026-08-28 أضاف المحاسبَ؛ القسم 4.h/4.f/4.i
// في CLAUDE.md). **وكلُّ الأزرار القديمة على هذا المسار تقاعدت للجميع بلا
// استثناء** — لا فرقَ هنا بين مَن يملك `complete_sale`/`not_bought` ومَن لا
// يملكهما: كلاهما يرى البابين الجديدين وحدهما إن كانا مصرَّحَين، أو لا شيء.

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Loader2, CircleDollarSign, CalendarClock, XCircle, RotateCcw, UserCog,
  HandCoins,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useBranchSession } from "@/components/BranchGate";
import { AdministrativeReversalDialog } from "@/components/AdministrativeReversalDialog";
import { POST_EXAM_CARD_ANCHOR } from "@/components/device_flow_resume";
import {
  ServiceDiscountFields, EMPTY_DISCOUNT, type DiscountDraft,
} from "@/components/ServiceDiscountFields";
import {
  purchaseGaps, purchaseOriginalPrice, purchaseBlocked, purchaseBody,
  purchaseSubmitLabel,
} from "@/components/purchase_dialog_ui";
import { reopenPayload, deferPayload } from "@/components/followup_dialog_ui";
import { ExamPathDecisionActions } from "@/components/ExamPathDecisionActions";
import { MoneyInput } from "@/components/ui/money-input";
import { PriceTransition } from "@/components/PriceTransition";
import {
  followupEventView, purchasePresentation, replacementEpisodeIdOf, PURCHASE_STATE_TEXT,
} from "@shared/followup_events";
import { requestedItemLabel } from "@shared/prosthetic_parts";
import { ADMIN_VOID_BADGE } from "@shared/administrative_reversal";
import { canCompleteReceptionSale } from "@shared/commercial";
import {
  allowedActions, canSelectExpert, computeCommercialPrice, priceSourceShort, isTerminal,
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUS_LABELS,
  type FollowupReason, type FollowupStatus,
} from "@shared/followup";

interface Followup {
  id: number;
  serviceType: string;
  status: FollowupStatus;
  approvedPrice: number;
  priceSource: string;
  purchaseInterestAt: string | null;
  purchaseInterestByName: string | null;
  closedByName: string | null;
  closedEventAt: string | null;
  closedNote: string | null;
  selectedExpertUserId: number | null;
  selectedExpertName: string | null;
  examDoctorName: string | null;
  examSignedAt: string | null;
  nextFollowUpAt: string | null;
  noScheduledFollowUp: boolean;
  lastReason: string | null;
  lastNote: string | null;
  lastContactAt: string | null;
  closedReason: string | null;
  convertedWorkOrderId: number | null;
  requestedItem: string | null;
  // ══ المسارُ المبسّط ومالكيةُ الحقول (المرحلة ٢) — **كلُّها من الخادم** ══
  //  الشاشةُ لا تحسب قفلاً ولا فعلاً: تعرض ما قاله الخادمُ بالدوالّ التي
  //  يحرس بها نقاطَه. فلا يظهر زرٌّ يُردّ ولا يُخفى زرٌّ يُقبَل.
  examPath?: boolean;
  actions?: string[] | null;
  missing?: string[];
  missingLabel?: string;
  statusLine?: string | null;
  locks?: { price?: boolean; expert?: boolean; decision?: boolean };
  ownerLabels?: { price?: string | null; expert?: string | null; decision?: string | null };
  originalPrice?: number | null;
  priceKind?: "normal" | "discount" | "free" | null;
  purchaseDecision?: "bought" | "not_bought" | null;
  notBoughtReasonText?: string | null;
  // ══ ملاحظاتُ الطبيب من هذه المعاينة بعينها (تصحيحٌ 2026-08-28) ══════════
  //  سياقٌ للبائع لا حقيقةٌ مالية — تُعرَض كما كُتبت، وللقراءة فقط.
  examNotes?: string | null;
  //  فرعُ **هذه المتابعة بعينها** — موجودٌ في القاعدة والاستجابة من قبل
  //  (`toRow`)، لم يكن مكتوباً في هذا العقد فقط. يُستعمَل لقائمة الخبراء
  //  (تصحيحٌ 2026-08-28) — لا فرعَ الجلسة، فمسؤولٌ متعدّدَ الفروع يجب أن
  //  يرى خبراءَ العملية التي يبيعها لا افتراضَ جلسته.
  branchId: number | null;
  events: any[];
  priceRequests: any[];
}

const SERVICE_LABELS: Record<string, string> = {
  prosthetic: "طرف صناعي",
  medical_support: "مسند طبي",
};

const STATUS_TONE: Record<string, string> = {
  awaiting_patient_decision: "bg-amber-100 text-amber-800",
  follow_up: "bg-amber-50 text-amber-700",
  price_approval_pending: "bg-blue-100 text-blue-800",
  price_approved_waiting_patient: "bg-violet-100 text-violet-800",
  purchase_approval_pending: "bg-blue-100 text-blue-800",
  closed_without_purchase: "bg-gray-100 text-gray-600",
  //  رماديٌّ كالمنتهي — ولا إنذارَ أحمر: المعاينةُ سقطت والملفُّ يُستأنف
  //  بمعاينةٍ مصحَّحة، لا خطأَ قائمٌ ينتظر أحداً.
  closed_exam_cancelled: "bg-gray-100 text-gray-600",
  //  والملغاةُ إدارياً كذلك: تصحيحٌ وقع لا خطأٌ ينتظر أحداً.
  closed_admin_void: "bg-gray-100 text-gray-600",
  converted: "bg-green-100 text-green-800",
};

const fmt = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("ar-IQ", { year: "numeric", month: "2-digit", day: "2-digit" }) : "—";
/** «متى» سؤالٌ عن اللحظة لا عن اليوم وحده — فالساعةُ معه. */
const fmtDateTime = (v: string | null) =>
  v ? new Date(v).toLocaleString("ar-IQ", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  }) : "—";

/** موعدٌ افتراضي مقترَح — أسبوعٌ من اليوم. والمستخدم يغيّره كما يشاء. */
function defaultNextDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

export function PostExamDecisionCard({ patientId }: { patientId: number }) {
  const session = useBranchSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<string | null>(null);
  const [reason, setReason] = useState<FollowupReason>("needs_time");
  const [note, setNote] = useState("");
  const [nextDate, setNextDate] = useState(defaultNextDate());
  const [noSchedule, setNoSchedule] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [priceReason, setPriceReason] = useState("");
  const [expertId, setExpertId] = useState("");
  //  ══ «إتمام البيع» / «لم يشترِ» — نُقلا إلى `ExamPathDecisionActions`
  //  (المرحلة الخامسة) ═══════════════════════════════════════════════════
  //  الحالةُ والنافذتان ومعاينةُ السعر صارت داخل ذلك المكوّن — يستهلكه هذا
  //  الملفّ وطابورُ «بانتظار الحسم» الجديد معاً، بلا نسخةٍ ثانية من المنطق.

  const { data: followups, isLoading } = useQuery<Followup[]>({
    queryKey: [`/api/followups/patient/${patientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/followups/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  //  ══ **المتابعةُ الفعّالة تُحسَب هنا** — قبل قائمة الخبراء التي تحتاج
  //  فرعَها (تصحيحٌ 2026-08-28) ═══════════════════════════════════════════
  //  حسابٌ عاديّ لا خطّاف React، فنقلُه فوق باقي الاستعلامات آمنٌ ولا يخالف
  //  قاعدة الخطّافات. والتكرارُ اللاحق حُذف — هذا هو المصدر الوحيد الآن.
  const terminal = new Set(["closed_admin_void", "closed_exam_cancelled", "closed_without_purchase"]);
  const active = (followups ?? []).find((f) => !terminal.has(f.status))
    ?? (followups ?? [])[0] ?? null;

  //  ══ **قائمةُ الخبراء بفرع العملية المُباعة — لا فرع الجلسة** (تصحيحٌ
  //  2026-08-28) ═══════════════════════════════════════════════════════════
  //  كانت تُقرأ بلا `branchId` — ونقطةُ الخبراء تشترطه صراحةً للمسؤول العام
  //  (لا فرعَ ثابتاً له)، فيُردّ ٤٠٠ ويتحوّل عند العميل إلى قائمةٍ فارغة:
  //  مسؤولٌ يملك صلاحية البيع فعلياً لكن لا يستطيع اختيار خبير من الشاشة.
  //
  //  والإصلاحُ فرعُ **المتابعة الفعّالة بعينها** — لا فرع جلسة الفاعل: حتى
  //  الاستقبال ومديرُ الفرع يستفيدان، فمديرَ فرعٍ متعدّد الفروع يرى خبراء
  //  العملية التي يبيعها لا افتراضَ جلسته. والخادمُ يبقى الحارسَ الحقيقيَّ
  //  دائماً (`validateExpertForBranch` عند `/complete-sale`) — هذا الطلبُ
  //  لجلب القائمة فقط، وليس مصدرَ ثقةٍ لسلطة البيع.
  const activeBranchId = active?.branchId ?? null;
  const { data: experts } = useQuery<any[]>({
    //  **مفتاحٌ يحمل الفرع** — فتنقّل المسؤول بين مريضَي فرعين لا يُبقي
    //  ذاكرةَ التخزين المؤقّت خبراءَ الفرع الأوّل معروضةً على الثاني.
    queryKey: ["/api/manufacturing/experts", activeBranchId],
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${activeBranchId}`,
        { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    //  لا تُقرأ حتى تُعرف المتابعةُ الفعّالة وفرعُها — خبراءُ فرعٍ خاطئ
    //  (أو طلبٌ بلا فرع يُردّه الخادم ٤٠٠) أسوأ من قائمةٍ فارغة مؤقّتة.
    enabled: activeBranchId !== null,
  });

  //  **الخصمُ المعلَّق معلومةُ حالةٍ لا زينة**: بيعٌ رُفع له طلبُ خصمٍ لم
  //  يُعتمد بعد **لم يقع**، فلا يُقال عنه «بانتظار إتمام البيع» كأن الموظّف
  //  هو مَن يتأخّر. والمفتاحُ هو مفتاحُ شريط الخصم نفسه، فلا طلبَ ثانياً.
  const { data: discountRows } = useQuery<{ requests?: any[] }>({
    queryKey: [`/api/discounts/patient/${patientId}`],
    queryFn: async () => {
      const res = await fetch(`/api/discounts/patient/${patientId}`, { credentials: "include" });
      if (!res.ok) return { requests: [] };
      return res.json();
    },
  });
  const hasPendingDiscount = (discountRows?.requests ?? [])
    .some((r: any) => r?.status === "pending");

  //  ══ **الطلبُ الحالي والتاريخُ معاً — لا اختيارَ بينهما** ═══════════════
  //   بعد تصحيحٍ إداريّ باستبدال، للمريض حقيقتان: عمليةٌ ملغاة (تاريخ)
  //   وطلبٌ جديد بانتظار المعاينة (حاضر). وعرضُ إحداهما وحدها يجعل الموظّفَ
  //   يظنّ أن الأخرى لم تقع.
  //
  //   **والحاضرُ يُقرأ من مصدره القانونيّ**: نقطةُ الحلقات نفسُها التي
  //   تقرؤها بقيةُ الشاشات، وبعناوين `requestedItemLabel` نفسِها — لا حقيقةٌ
  //   تشغيليةٌ ثانية تُخترَع في هذه البطاقة.
  const { data: episodeData } = useQuery<{
    episodes: { id: number; serviceType: string; status: string; requestedItem: string }[];
  }>({
    queryKey: [`/api/patients/${patientId}/device-episodes`],
    queryFn: async () => {
      const res = await fetch(`/api/patients/${patientId}/device-episodes`, { credentials: "include" });
      if (!res.ok) return { episodes: [] };
      return res.json();
    },
  });

  //  ══ **مخرجُ الخطأ حيث يُرى الخطأ** (ترحيل ٠٦٤) ═══════════════════════
  //  المسؤولُ لا يجوز أن يبحث في وحدة التصنيع عن بابٍ يصحّح به ضغطةً
  //  خاطئة. فالزرُّ هنا، على البطاقة التي يقرأ فيها الخطأ.
  //  **والحجبُ عرضٌ لا إذن**: الخادمُ يفحص الدورَ والفرعَ في كلّ نداء.
  const mayReverse = Boolean(session?.isAdmin) || session?.role === "branch_manager";
  const [reversalOpen, setReversalOpen] = useState(false);

  const [discount, setDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  //  السعرُ الأصلي حين سكتت المعاينة — يكتبه الاستعلامات مرّةً واحدة.
  const [firstPrice, setFirstPrice] = useState<number>(0);

  const reset = () => {
    setDialog(null); setNote(""); setFinalPrice(""); setPriceReason(""); setExpertId("");
    setNextDate(defaultNextDate()); setNoSchedule(false); setReason("needs_time");
    setDiscount(EMPTY_DISCOUNT); setFirstPrice(0);
  };

  const act = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: any }) => {
      const res = await apiRequest("POST", path, body);
      return res.json();
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
      qc.invalidateQueries({ queryKey: ["/api/followups"] });
      qc.invalidateQueries({ queryKey: ["/api/followups/approvals"] });
      qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
      qc.invalidateQueries({ queryKey: ["/api/discounts"] });
      qc.invalidateQueries({ queryKey: [`/api/discounts/patient/${patientId}`] });
      toast(data?.pendingApproval
        ? {
          title: "أُرسل طلب الخصم للاعتماد",
          description: "لم يبدأ التصنيع ولم تُقيَّد كلفة — يبدأ فور اعتماد المسؤول أو مدير الفرع.",
        }
        : { title: "تمّ الحفظ" });
      reset();
    },
    onError: (err: any) => {
      //  التعارض يُقال صريحاً: مستخدمٌ آخر سبقك، حدّث الصفحة.
      toast({
        title: "تعذّر الحفظ",
        description: err?.message ?? "حاول مرة أخرى",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <Card><CardContent className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </CardContent></Card>
    );
  }
  if (!active) return null;

  // ══ **العمليةُ الملغاة إدارياً — تاريخٌ يُقرأ، لا بابٌ يُفتَح** ═════════
  //
  //  والبطاقةُ رماديةٌ عن قصد: لا «تم الشراء» أخضر، ولا مرحلةُ تصنيعٍ حيّة،
  //  ولا سعرٌ يبدو مستحقّاً. العمليةُ وقعت وأُبطلت، وهذا كلُّ ما تقوله.
  //
  //  **ولا نافذةَ تصحيحٍ من هنا**: التصحيحُ تمّ. وفتحُ نافذةِ إجراءٍ على
  //  عمليةٍ مصحَّحة يَعِد بفعلٍ لا يقع — يقرأ الموظّفُ «تفاصيل» فيجد نموذجَ
  //  تنفيذٍ يردّه الخادمُ بـ«ملغاة إدارياً بالفعل». فالتفصيلُ هنا نصٌّ
  //  مقروء، وسجلُّ الإجراءات الكامل في «سجلّ الإجراءات» أسفله.
  if (active.status === "closed_admin_void") {
    // ══ **الطلبُ البديل بهويّته لا بترشيح** ═════════════════════════════
    //  المريضُ يملك خيوطاً متوازية — أطرافٌ ومساند — وقد يملك على الخيط
    //  الواحد حلقةً مفتوحةً لسببٍ آخر. فـ«أوّلُ حلقةٍ مفتوحة» كان يعرض
    //  **مسندَ المريض** بوصفه الطلبَ الذي وُلد عن تصحيح طرفه.
    //
    //  والهويّةُ الدقيقة كتبها التصحيحُ في حمولة حدثه داخل معاملته:
    //  `replacementEpisodeId`. فتُقرأ منها وتُطابَق بالمعرّف على نقطة
    //  الحلقات القانونية — **ولا يُخمَّن بديلٌ حين لا يوجد**.
    const replacementId = replacementEpisodeIdOf(active.events);
    const replacement = replacementId === null ? null
      : (episodeData?.episodes ?? []).find((e) =>
        Number(e.id) === replacementId
        //  والطلبُ «حاضرٌ» ما دام مفتوحاً. وقد يُعايَن فيصير `examined` —
        //  والهويّةُ لا تتبدّل، فهي بالمعرّف لا بالحالة.
        && (e.status === "awaiting_exam" || e.status === "examined")) ?? null;

    return (
      <div id={POST_EXAM_CARD_ANCHOR} className="space-y-3">
        {/*  ① **الحاضرُ أوّلاً** — الطلبُ القائم الذي وُلد عن التصحيح. */}
        {replacement && (
          <Card data-testid="card-current-device-request"
            className="border-primary/40 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-primary">
                <ClipboardCheck className="h-5 w-5" /> طلب جديد
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Field label="المطلوب"
                value={requestedItemLabel(replacement.requestedItem, replacement.serviceType)} />
              <Field label="الحالة"
                value={replacement.status === "awaiting_exam"
                  ? "بانتظار المعاينة" : "بانتظار التخصيص"} />
              <Field label="الكلفة" value="—" hint="تُحدَّد بعد المعاينة" />
            </CardContent>
          </Card>
        )}

        {/*  ② **والتاريخُ بعده** — بلا لونٍ يوحي بعمليةٍ قائمة. */}
        <Card data-testid="card-admin-void-history"
          className="border-gray-200 bg-gray-50 text-gray-700">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            <span data-testid="text-admin-void-title">عملية ملغاة إدارياً</span>
            <span className="mr-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs">
              {ADMIN_VOID_BADGE}
            </span>
          </CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Field label="الطلب السابق"
              value={requestedItemLabel(active.requestedItem, active.serviceType)} />
            <Field label="السعر السابق" value={`${active.approvedPrice.toLocaleString()} د.ع`}
              hint="عُكس بقيد معاكس" />
            <Field label="أمر التصنيع السابق"
              value={active.convertedWorkOrderId ? `#${active.convertedWorkOrderId}` : "—"} />
            <Field label="سبب التصحيح" value={active.closedNote || active.lastNote || "—"} />
            <Field label="من نفذ التصحيح" value={active.closedByName || "—"} />
            <Field label="تاريخ التصحيح"
              value={fmtDateTime(active.closedEventAt ?? active.lastContactAt)} />
          </CardContent>
          {(active.events ?? []).length > 0 && (
            <CardContent className="pt-0">
              <details className="text-xs" data-testid="details-admin-void-history">
                <summary className="cursor-pointer text-muted-foreground">
                  سجلّ الإجراءات ({active.events.length})
                </summary>
                <ul className="mt-2 space-y-2">
                  {active.events.map((e: any) => {
                    const v = followupEventView(e, () => null);
                    return (
                      <li key={e.id} className="border-r-2 border-muted pr-2 leading-relaxed"
                        data-testid={`void-event-${e.id}`}>
                        <div className="text-muted-foreground">{fmtDateTime(e.createdAt)}</div>
                        <div className="font-medium text-foreground">{v.title}</div>
                        {v.facts.length > 0 && (
                          <div className="text-muted-foreground">{v.facts.join(" · ")}</div>
                        )}
                        {e.actorName && (
                          <div className="text-muted-foreground">بواسطة: {e.actorName}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </details>
            </CardContent>
          )}
        </Card>
      </div>
    );
  }

  //  ══ **مسارُ المعاينة المبسّط** (المرحلة الثانية) ═══════════════════════
  //  العمليةُ الجديدة أفعالُها ثلاثة: تفاصيلُ البيع · اشترى · لم يشترِ.
  //  **والخادمُ هو مَن يقولها** (`active.actions`) — بالدوالّ التي تحرس
  //  النقاطَ نفسَها، فلا يظهر زرٌّ يُردّ ولا يُخفى زرٌّ يُقبَل.
  //
  //  **والصفُّ الموروث يبقى على أفعاله كلِّها**: حلقةٌ بلا مسار أو متابعةٌ
  //  بلا حلقة — وإلّا تجمّد ملفٌّ في حالةٍ لا زرَّ لها.
  const examPath: boolean = active.examPath === true;
  const examActions: string[] = Array.isArray(active.actions) ? active.actions : [];
  //  **الكتلةُ التجاريةُ ليست للطبيب العاديّ** (تصحيحٌ لاحق ثانٍ): `examActions`
  //  فارغةٌ للطبيب أيضاً (يردّها الخادمُ `canCompleteReceptionSale` القانونية)،
  //  فكان الشرطُ أعلاه (`!isTerminal`) يفتح الكتلةَ له على صفٍّ حيّ ليقرأ رسالةَ
  //  حجبٍ لا تخصّه — هو أصلاً بلا دورٍ تجاريّ لا محجوباً ولا مطلَقاً. فالمالكيةُ
  //  التجاريةُ التاريخية (رسالةُ الحجب) للاستقبال/المحاسب/المدير/المسؤول وحدهم؛
  //  والطبيبُ لا يرى الكتلةَ إطلاقاً — لا زرَّها ولا رسالتَها. **نفسُ الدالّة
  //  القانونية التي تحرس النقطة**، لا قائمةَ أدوارٍ ثانية.
  const mayUseExamPathCommercialDecision = canCompleteReceptionSale(session as any);
  const actions = examPath ? [] : allowedActions(session as any, active.status);
  const pendingRequest = (active.priceRequests ?? []).find((r: any) => r.status === "pending");
  const busy = act.isPending;
  //  معاينةُ الفرق حيّةً من **الدالّة المشتركة نفسها** التي يحسب بها الخادم —
  //  فلا تعرض الشاشةُ رقماً يخالف ما سيُحفَظ.
  //  **ما ينقص يُسأل عنه، والموجودُ لا** — أساسُ النافذة الذكيّة. والقاعدةُ
  //  في `purchase_dialog_ui` وحدها كي تُختبَر: اثنتا عشرة تركيبةً لا تُقرأ
  //  بالعين في JSX.
  const { needsFirstPrice, needsExpert } = purchaseGaps(active);
  //  **السعرُ المرجعيّ للنافذة**: المحفوظ على الصفّ إن وُجد، وإلّا ما
  //  يكتبه الموظّف الآن. والخصمُ يُحسب عليه لا على صفرٍ لا معنى له.
  const originalPrice = purchaseOriginalPrice(active, firstPrice);
  //  **اسمُ الخبير للسجلّ**: الحمولةُ تخزّن الرقم وحده، والشاشةُ تعرف أسماء
  //  خبراء الفرع. ومَن غادر الفرع فلم يعد في القائمة يبقى برقمه — أهونُ من
  //  اسمٍ مخترَع. والمحفوظُ على الصفّ يُقدَّم لأنه أوثق من قائمةٍ حيّة.
  const expertNameOf = (id: number): string | null => {
    if (id === active.selectedExpertUserId && active.selectedExpertName) {
      return active.selectedExpertName;
    }
    return (experts ?? []).find((x: any) => Number(x.id) === id)?.displayName ?? null;
  };

  //  **أين وقف الشراء فعلاً** — من الحالة لا من نصٍّ محفوظ.
  const purchaseState = purchasePresentation({
    status: active.status,
    convertedWorkOrderId: active.convertedWorkOrderId,
    hasPendingDiscount,
  });

  const preview = computeCommercialPrice({
    previousPrice: active.approvedPrice, finalPrice: Number(finalPrice),
  });

  const submit = (path: string, body: any) => act.mutate({ path, body });

  return (
    //  **مرساةُ «فتح العملية الحالية»** حين تكون الحلقةُ بلا أمرِ تصنيع بعد:
    //  هذه هي البطاقةُ التي تُقرأ فيها حالةُ الطلب، فإليها يُذهَب.
    <Card id={POST_EXAM_CARD_ANCHOR} data-testid="card-post-exam-decision">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          قرار المريض بعد المعاينة
          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_TONE[active.status] ?? ""}`}
            data-testid="text-followup-status">
            {FOLLOWUP_STATUS_LABELS[active.status] ?? active.status}
          </span>
          {mayReverse && (
            <button
              type="button"
              onClick={() => setReversalOpen(true)}
              className="mr-auto rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
              data-testid="button-open-reversal-followup"
            >
              تصحيح / إلغاء العملية
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <AdministrativeReversalDialog
        open={reversalOpen}
        onOpenChange={setReversalOpen}
        patientId={patientId}
        target={{ followupId: active.id }}
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <Field label="الخدمة" value={SERVICE_LABELS[active.serviceType] ?? active.serviceType} />
          <Field label="طبيب المعاينة" value={active.examDoctorName ?? "—"} />
          <Field label="تاريخ المعاينة" value={fmt(active.examSignedAt)} />
          <Field label="الخبير"
            value={active.selectedExpertName
              ?? (active.selectedExpertUserId ? `#${active.selectedExpertUserId}` : "لم يُختَر بعد")}
            hint={active.selectedExpertName ? undefined : "يختاره الاستعلامات"} />
          {/*  والنصُّ من `shared/followup` وحدها — لا استنتاجَ في الشاشة. */}
          <Field label="السعر المعتمد"
            value={`${active.approvedPrice.toLocaleString()} د.ع`}
            hint={priceSourceShort(active.priceSource)} />
          <Field label="آخر تواصل" value={fmt(active.lastContactAt)} />
          <Field label="المتابعة القادمة"
            value={active.noScheduledFollowUp ? "بلا موعد" : fmt(active.nextFollowUpAt)} />
          <Field label="آخر نتيجة"
            value={active.lastReason
              ? FOLLOWUP_REASON_LABELS[active.lastReason as FollowupReason] ?? active.lastReason
              : "—"} />
          {active.convertedWorkOrderId && (
            <Field label="أمر التصنيع" value={`#${active.convertedWorkOrderId}`} />
          )}
        </div>

        {/*  ══ **إتمامُ البيع — بابٌ واحد** (المرحلة الثانية) ═══════════════
            لا زرَّين منفصلَين («تفاصيل البيع» ثمّ «اشترى») لخطوتين حول
            واقعةٍ واحدة: **زرٌّ واحد**. حفظُه **هو** قرارُ الشراء وبدءُ
            التصنيع معاً — والخادمُ هو مَن يرسل هذه القائمة فلا يظهر زرٌّ
            يُردّ ولا يُخفى زرٌّ يُقبَل.
            ══ **الشرطُ من حالة الصفّ لا من طول `actions`** (تصحيحٌ لاحق)
            ═══════════════════════════════════════════════════════════════
            `examActions` فارغةٌ في حالتين مختلفتين: صفٌّ **منتهٍ** (تحوّل
            أو أُغلق — لا شأنَ لهذه الكتلة به، الملخّصُ أدناه يتكفّل) أو
            صفٌّ **حيٌّ محجوبٌ** بملكيةٍ تجاريةٍ موروثة (يحتاج المسؤولَ
            العام). فالتمييزُ من `isTerminal(active.status)` — لا من طول
            المصفوفة، وإلّا اختفت الملاحظةُ ورسالةُ الحجب معاً عن صفٍّ حيّ.
            ══ **وشرطٌ ثالث: مَن ينظر أصلاً** (تصحيحٌ لاحقٌ ثانٍ) ══════════
            صفٌّ حيٌّ محجوب فارغُ `examActions` للطبيب العاديّ أيضاً — بلا
            هذا الشرط كان يدخل الكتلةَ فيقرأ رسالةَ حجبٍ لا تخصّه: هو أصلاً
            بلا سلطةٍ تجارية، لا محجوباً عنها ولا مطلَقاً فيها. فالكتلةُ
            التجاريةُ كلُّها (الأزرار وملاحظةُ الطبيب ورسالةُ الحجب) تبقى
            حصراً لمن يملك `canCompleteReceptionSale` — نفسُ الدالّة
            القانونية التي تحرس `/complete-sale`/`/not-bought` والطابورَ. */}
        {examPath && !isTerminal(active.status) && mayUseExamPathCommercialDecision && (
          <ExamPathDecisionActions
            followupId={active.id}
            patientId={patientId}
            branchId={activeBranchId}
            actions={examActions}
            examNotes={active.examNotes}
            statusLine={active.statusLine}
            prefill={{
              originalPrice: active.originalPrice ?? null,
              approvedPrice: active.approvedPrice,
              priceKind: active.priceKind ?? null,
              selectedExpertUserId: active.selectedExpertUserId ?? null,
            }}
          />
        )}

        {/*  ══ **رايةُ الموافقة تقول أين وقف الملفّ فعلاً** ══════════════
            كان النصُّ واحداً لا يتغيّر: «المريض قرّر الإكمال، ينتظر إتمام
            البيع» — ويبقى معروضاً **بعد أن تمّ البيع وبدأ التصنيع فعلاً**.
            فيقرأ الموظّفُ أن الملفّ ينتظره وهو منتهٍ، أو يظنّ الخصمَ
            المعلَّق بيعاً لم يُسجَّل.

            والنصُّ الآن **مشتقٌّ من الحالة** لا محفوظ: تحوّل ⟶ تمّ · خصمٌ
            معلَّق ⟶ بانتظار الاعتماد · وإلّا ⟶ بانتظار إتمام البيع. */}
        {active.purchaseInterestAt && (
          <p className={`rounded-md px-3 py-2 text-sm ${purchaseState === "converted"
            ? "bg-green-100 text-green-900" : purchaseState === "discount_pending"
              ? "bg-amber-50 text-amber-800" : "bg-green-50 text-green-800"}`}
            data-testid="text-purchase-interest">
            {purchaseState === "converted" ? "✅ " : purchaseState === "discount_pending"
              ? "🟡 " : "🟢 "}
            {PURCHASE_STATE_TEXT[purchaseState]}
            {active.purchaseInterestByName && ` — سجّلها ${active.purchaseInterestByName}`}
            {` (${fmt(active.purchaseInterestAt)})`}
          </p>
        )}
        {/*  **ملخّصُ البيعِ يُعرَض دائماً بعد التحوّل — لا يُخفيه رايةٌ قديمة**
            (تصحيحٌ 2026-08-28). كان يُقرأ بشرط «ولم تُرفع رايةُ يرغب
            بالشراء» فيختفي كلُّ سطرٍ يذكر السعرَ والخصمَ والخبير عن أيّ ملفٍّ
            رُفعت له تلك الرايةُ يوماً — بيعٌ حقيقيّ يبقى غيرَ مقروء. فصار
            يُعرَض لكلّ متابعةٍ تحوّلت، **بجانب** بطاقة الرايةِ التاريخية
            أعلاه لا بدلاً عنها. */}
        {purchaseState === "converted" && (
          <div className="rounded-md bg-green-100 px-3 py-2 text-sm text-green-900 space-y-2"
            data-testid="text-purchase-done">
            <div>
              ✅ تم الشراء — بدأ التصنيع
              {active.convertedWorkOrderId && ` (أمر التصنيع #${active.convertedWorkOrderId})`}
            </div>
            {/*  ══ **تفاصيلُ البيع بعد الإتمام** (المرحلة الثانية) ══════════
                السعرُ الأصليّ والخصمُ والنهائيّ والخبير — والمجّانيُّ صريحٌ،
                لا صفرٌ يُقرأ «غير مسعَّر». ولمسارِ المعاينة وحده — الصفوفُ
                القديمة لا تكتسب عرضاً لم تحمل بياناته. */}
            {examPath && active.priceKind && (
              <div className="grid gap-1.5 text-xs sm:grid-cols-4" data-testid="grid-sale-summary">
                <SaleField label="السعر الأصلي"
                  value={`${Number(active.originalPrice ?? active.approvedPrice).toLocaleString()} د.ع`}
                  testId="text-sale-original" />
                <SaleField label="الخصم"
                  value={`${Math.max(0, Number(active.originalPrice ?? 0) - active.approvedPrice)
                    .toLocaleString()} د.ع`}
                  testId="text-sale-discount" />
                <SaleField label="السعر النهائي"
                  value={active.priceKind === "free"
                    ? "مجاني (٠ د.ع)" : `${active.approvedPrice.toLocaleString()} د.ع`}
                  testId="text-sale-final" />
                <SaleField label="الخبير"
                  value={active.selectedExpertName
                    ?? (active.selectedExpertUserId ? `#${active.selectedExpertUserId}` : "—")}
                  testId="text-sale-expert" />
              </div>
            )}
          </div>
        )}

        {/*  **النتيجةُ تبقى مقروءةً بعد الإغلاق** — بسببها وملاحظتها ومَن
            سجّلها ومتى. والملاحظةُ لا تختفي: هي في الحدث وفي الصفّ معاً. */}
        {active.status === "closed_without_purchase" && (
          <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            data-testid="card-closed-decision">
            <div className="font-medium text-gray-800">لم يشترِ</div>
            <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
              <div data-testid="text-closed-reason">
                السبب: <b className="text-foreground">{active.closedReason
                  ? FOLLOWUP_REASON_LABELS[active.closedReason as FollowupReason]
                    ?? active.closedReason
                  : "—"}</b>
              </div>
              {(active.closedNote || active.lastNote) && (
                <div data-testid="text-closed-note">
                  الملاحظة: <b className="text-foreground">{active.closedNote || active.lastNote}</b>
                </div>
              )}
              {active.closedByName && (
                <div data-testid="text-closed-by">
                  سجّلها: <b className="text-foreground">{active.closedByName}</b>
                </div>
              )}
              <div data-testid="text-closed-at">
                التاريخ: {fmtDateTime(active.closedEventAt ?? active.lastContactAt)}
              </div>
            </div>
          </div>
        )}

        {/*  صفٌّ معلَّقٌ من المسار القديم — يُقال بلا زرّ لمن لا يحسمه. */}
        {active.status === "price_approval_pending" && actions.length === 0 && (
          <p className="rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800"
            data-testid="text-awaiting-price-approval">
            طلبٌ قديمٌ معلَّق — يحسمه الطبيب المخوَّل أو المسؤول العام
            {pendingRequest && ` — المقترح ${pendingRequest.proposedPrice?.toLocaleString()} د.ع`}
          </p>
        )}
        {/*  صفٌّ محتجزٌ من قبل التبسيط — يُستأنف بضغطةٍ واحدة لا بانتظارِ أحد. */}
        {active.status === "purchase_approval_pending" && actions.includes("confirm_purchase") && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800"
            data-testid="text-legacy-purchase-pending">
            هذا الملفّ سُجِّل قبل التبسيط بحالة «بانتظار اعتماد الشراء» — لم يعد
            يحتاج اعتماداً. أكّد الشراء ليبدأ التصنيع، أو أغلقه إن عدل المريض.
          </p>
        )}

        {pendingRequest && actions.includes("approve_price") && (
          <div className="rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm">
            <div className="font-medium">طلب تعديل سعر</div>
            <div className="text-muted-foreground text-xs mt-1">
              <PriceTransition from={pendingRequest.currentPrice ?? 0}
                to={pendingRequest.proposedPrice ?? 0} /> د.ع
              {" — "}{FOLLOWUP_REASON_LABELS[pendingRequest.reason as FollowupReason] ?? pendingRequest.reason}
              {pendingRequest.requestedByName && ` · طلبه ${pendingRequest.requestedByName}`}
            </div>
            {pendingRequest.note && (
              <div className="text-muted-foreground text-xs mt-1">{pendingRequest.note}</div>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {/*  ══ **زرٌّ واحد اسمُه «اشترى»** ═════════════════════════════
              كان زرّان: «اشترى — يرغب بإكمال البيع» و«اشترى — بدء التصنيع».
              والفرقُ بينهما داخليّ (رايةُ طابور مقابل بيعٍ فعليّ)، فحمّل
              الموظّفَ تمييزاً لا شأنَ له به — واختار الخطأ نصفَ الوقت.

              فبقي واحد. **ولا يُعطَّل لنقصِ معلومة**: النافذةُ تسأل عمّا
              ينقص (سعراً أو خبيراً أو كليهما) في مكانها، بدل أن يُطرَد
              الموظّف إلى شاشةٍ أخرى ثم يُطلَب منه أن يعود. */}
          {actions.includes("confirm_purchase") && (
            <Button size="sm" disabled={busy}
              onClick={() => setDialog("confirm_purchase")}
              data-testid="button-confirm-purchase">
              <HandCoins className="h-4 w-4" /> اشترى
            </Button>
          )}
          {actions.includes("defer") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("defer")} data-testid="button-defer">
              <CalendarClock className="h-4 w-4" /> يحتاج متابعة / مؤجَّل
            </Button>
          )}
          {actions.includes("close") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => setDialog("close")} data-testid="button-close-followup">
              <XCircle className="h-4 w-4" /> لم يشترِ
            </Button>
          )}
          {/*  **قرارُ مديرِ الفرع لا طلبٌ يُرسَل**: يفتح النافذة ويكتب الرقم
              فيصير هو السعر — بلا اعتمادٍ ولا انتظار. */}
          {actions.includes("set_commercial_price") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => { setFinalPrice(String(active.approvedPrice)); setDialog("price"); }}
              data-testid="button-set-commercial-price">
              <CircleDollarSign className="h-4 w-4" /> تحديد السعر النهائي
            </Button>
          )}
          {/*  ══ زرُّ «يرغب بإكمال البيع» أُزيل من الشاشة الحيّة ═════════
              كان يطلب من الموظّف أن يميّز بين «نيّة شراء» و«بيع» — وهو
              تمييزٌ داخليّ. والرايةُ نفسُها **باقيةٌ في القاعدة والنقطة
              والطابور**، وتُرفع تلقائياً حين يُنشَأ طلبُ خصمٍ من نافذة
              «اشترى»: مَن طلب خصماً فقد أعلن أن المريض يريد الشراء. */}
          {/*  توافقٌ رجعي: حسمُ طلبٍ قديمٍ معلَّق. لا يُنشأ مثلُه بعد اليوم. */}
          {actions.includes("approve_price") && pendingRequest && (
            <>
              <Button size="sm" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "approve" })}
                data-testid="button-approve-price">
                اعتماد الطلب القديم
              </Button>
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => submit(`/api/price-requests/${pendingRequest.id}/decide`,
                  { decision: "reject" })}
                data-testid="button-reject-price">
                رفض الطلب القديم
              </Button>
            </>
          )}
          {/*  الخبير اختيارُ الاستعلامات — بصلاحية المتابعة لا بقائمة
              الأزرار: قائمتُها تفرغ في حالتَي الاعتماد، والخبير يبقى
              اختيارَها هناك. */}
          {canSelectExpert(session as any, active.status) && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => { setExpertId(String(active.selectedExpertUserId ?? "")); setDialog("expert"); }}
              data-testid="button-select-expert">
              <UserCog className="h-4 w-4" />
              {active.selectedExpertUserId ? "تغيير الخبير" : "اختيار الخبير"}
            </Button>
          )}
          {/*  ══ **إعادةُ الفتح لا تقترح موعداً** ═══════════════════════════
              كان حقلُ الموعد يُفتح مملوءاً بأسبوعٍ من اليوم، فالموظّفُ الذي
              أراد **إعادة الفتح فقط** يضغط «حفظ» فيصير الملفّ «مؤجَّل —
              متابعة» بموعدٍ لم يقرّره أحد (لاحظه المالك على الإنتاج).

              والموعدُ قرارٌ يُتَّخذ لا افتراضٌ يُملأ: يُفرَّغ الحقلُ عند
              الفتح، فإن كتب الموظّفُ تاريخاً كان تأجيلاً مقصوداً، وإلّا عاد
              الملفُّ «بانتظار قرار المريض» بلا موعد. */}
          {actions.includes("reopen") && (
            <Button size="sm" variant="outline" disabled={busy}
              onClick={() => { setNextDate(""); setDialog("reopen"); }}
              data-testid="button-reopen">
              <RotateCcw className="h-4 w-4" /> إعادة فتح المتابعة
            </Button>
          )}
        </div>

        {/*  ══ **سجلّ الإجراءات** — يُقرأ بلا شرح ═══════════════════════
            كان اسمُه «سجلّ المتابعة» ويعرض أسماء الأحداث البرمجية حين لا
            يجد لها ترجمة (`expert_selected`, `initial_price_set`) — فصار
            زينةً تُطوى لا أداةً تُسأل.

            والآن كلُّ سطرٍ يقف بنفسه: **يومٌ وساعة** (لا التاريخ وحده —
            إجراءاتُ الملفّ الواحد تقع في دقائق)، وفعلٌ عربيّ، وفاعلٌ باسمه،
            وتفصيلٌ من الحمولة المخزَّنة. والترجمةُ في `shared/followup_events`
            وحدها — فلا رمزَ إنجليزيٌّ يتسرّب. */}
        {(active.events ?? []).length > 0 && (
          <details className="text-xs" data-testid="details-followup-history">
            <summary className="cursor-pointer text-muted-foreground">
              سجلّ الإجراءات ({active.events.length})
            </summary>
            <ul className="mt-2 space-y-2">
              {active.events.map((e: any) => {
                const v = followupEventView(e, expertNameOf);
                return (
                  <li key={e.id} className="border-r-2 border-muted pr-2 leading-relaxed"
                    data-testid={`event-${e.id}`}>
                    <div className="text-muted-foreground" data-testid={`event-${e.id}-when`}>
                      {fmtDateTime(e.createdAt)}
                    </div>
                    <div className="font-medium text-foreground">
                      {v.title}
                      {v.transition && (
                        <>
                          {": "}
                          <PriceTransition from={v.transition.from} to={v.transition.to}
                            testId={`event-${e.id}-transition`} />
                          {" د.ع"}
                        </>
                      )}
                    </div>
                    {v.facts.length > 0 && (
                      <div className="text-muted-foreground" data-testid={`event-${e.id}-facts`}>
                        {v.facts.join(" · ")}
                      </div>
                    )}
                    {e.actorName && (
                      <div className="text-muted-foreground">بواسطة: {e.actorName}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </CardContent>

      {/*  «إتمام البيع» و«لم يشترِ» ونافذتاهما انتقلتا إلى
          `ExamPathDecisionActions` أعلاه (المرحلة الخامسة). */}

      {/* ── تأجيل ── */}
      <Dialog open={dialog === "defer" || dialog === "close" || dialog === "reopen"}
        onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {dialog === "defer" ? "تأجيل ومتابعة"
                : dialog === "close" ? "إغلاق بدون شراء" : "إعادة فتح المتابعة"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialog !== "reopen" && (
              <div>
                <Label>السبب</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as FollowupReason)}>
                  <SelectTrigger data-testid="select-followup-reason"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FOLLOWUP_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>{FOLLOWUP_REASON_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {dialog !== "close" && (
              <div className="space-y-2">
                <Label>
                  موعد المتابعة القادمة
                  {dialog === "reopen" && <span className="text-muted-foreground"> (اختياري)</span>}
                </Label>
                <Input type="date" value={nextDate} disabled={noSchedule}
                  onChange={(e) => setNextDate(e.target.value)}
                  data-testid="input-next-followup" />
                {/*  في إعادة الفتح: الفراغُ قرارٌ صريح بنفسه، فلا مربّعَ
                    ثالثاً يقول الشيء نفسه. */}
                {dialog === "reopen" ? (
                  <p className="text-xs text-muted-foreground" data-testid="text-reopen-hint">
                    اتركه فارغاً ليعود الملف <b>بانتظار قرار المريض</b> بلا موعد.
                    وحدّد تاريخاً فقط إن أردت تأجيله للمتابعة.
                  </p>
                ) : (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={noSchedule}
                      onChange={(e) => setNoSchedule(e.target.checked)}
                      data-testid="checkbox-no-schedule" />
                    بلا موعد متابعة (قرارٌ صريح)
                  </label>
                )}
              </div>
            )}
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-followup-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy} data-testid="button-confirm-dialog"
              onClick={() => {
                if (dialog === "close") {
                  submit(`/api/followups/${active.id}/close`, { reason, note: note || undefined });
                } else if (dialog === "reopen") {
                  submit(`/api/followups/${active.id}/reopen`,
                    reopenPayload({ nextDate, note }));
                } else {
                  submit(`/api/followups/${active.id}/defer`,
                    deferPayload({ reason, nextDate, noSchedule, note }));
                }
              }}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── تحديد السعر النهائي — قرارٌ يُحفظ في الحال ── */}
      <Dialog open={dialog === "price"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تحديد السعر التجاري النهائي</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              السعر الحالي: <b>{active.approvedPrice.toLocaleString()} د.ع</b>{" "}
              ({priceSourceShort(active.priceSource)}).
              قرارُك يُحفظ فوراً بلا اعتمادٍ من أحد — <b>ولا يقيّد كلفةً ولا
              يبدأ تصنيعاً</b>. المال يتحرّك حين يؤكّد الموظّف الشراء.
            </p>
            <div>
              <Label>السعر النهائي (د.ع)</Label>
              <Input type="number" value={finalPrice}
                onChange={(e) => setFinalPrice(e.target.value)}
                data-testid="input-final-price" />
            </div>
            {/*  والفرقُ يُعرَض حيّاً — ولا تحسبه الشاشةُ بنفسها. */}
            {finalPrice !== "" && (
              preview.ok ? (
                <div className="rounded-md bg-muted/50 px-3 py-2 text-sm" data-testid="text-price-preview">
                  {preview.changed ? (
                    <>
                      <div>الفرق: <b data-testid="text-price-difference">
                        {preview.difference > 0 ? "+" : ""}{preview.difference.toLocaleString()} د.ع</b>
                        {" "}({preview.percentageDifference > 0 ? "+" : ""}{preview.percentageDifference}٪)</div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {preview.difference < 0 ? "تخفيض عن السعر الحالي" : "زيادة عن السعر الحالي"}
                      </div>
                    </>
                  ) : (
                    <div data-testid="text-price-unchanged">السعر كما هو — تثبيتٌ بلا تغيير</div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-destructive" data-testid="text-price-error">{preview.error}</p>
              )
            )}
            <div>
              <Label>
                السبب {preview.ok && preview.changed
                  ? <span className="text-destructive">(مطلوب)</span>
                  : <span className="text-muted-foreground">(غير مطلوب — السعر لم يتغيّر)</span>}
              </Label>
              <Input value={priceReason} onChange={(e) => setPriceReason(e.target.value)}
                placeholder="مثال: مفاوضة المريض · حالة مادّية · سعر منافس"
                data-testid="input-price-reason" />
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-price-note" />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="button-submit-commercial-price"
              disabled={busy || !preview.ok || (preview.changed && !priceReason.trim())}
              onClick={() => submit(`/api/followups/${active.id}/commercial-price`, {
                finalPrice: Number(finalPrice),
                reason: priceReason.trim() || undefined,
                note: note || undefined,
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ السعر النهائي"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── اختيار الخبير — بلا أي تصنيع ── */}
      <Dialog open={dialog === "expert"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>الخبير المسؤول</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              اقترحه الطبيب في المعاينة، ولك إبقاؤه أو تغييره. الاختيار
              <b> لا يبدأ تصنيعاً</b> — التصنيع يبدأ بتأكيد الشراء.
            </p>
            <div>
              <Label>الخبير</Label>
              <Select value={expertId} onValueChange={setExpertId}>
                <SelectTrigger data-testid="select-followup-expert">
                  <SelectValue placeholder="اختر الخبير" />
                </SelectTrigger>
                <SelectContent>
                  {(experts ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || !expertId} data-testid="button-confirm-expert"
              onClick={() => submit(`/api/followups/${active.id}/expert`, {
                expertUserId: Number(expertId),
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── تأكيد الشراء ── */}
      <Dialog open={dialog === "confirm_purchase"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>اشترى</DialogTitle></DialogHeader>
          {/*  ══ نافذةٌ واحدة **تسأل عمّا ينقص فقط** ═══════════════════════
              أربعُ حالات لا أربعُ شاشات: (سعرٌ وخبير) موجودان ⟶ تأكيد ·
              ناقصُ الخبير ⟶ الخبير وحده · ناقصُ السعر ⟶ السعر وحده ·
              ناقصُهما ⟶ الاثنان معاً. والموجودُ يُعرَض ولا يُسأل عنه. */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {needsFirstPrice || needsExpert
                ? <>ينقص لإتمام البيع: {[
                  needsFirstPrice ? "السعر الأصلي" : null,
                  needsExpert ? "الخبير المسؤول" : null,
                ].filter(Boolean).join(" و")}.</>
                : <>السعر المعتمد: <b>{active.approvedPrice.toLocaleString()} د.ع</b>.</>}
              {" "}يُفتح أمر التصنيع وتُقيَّد الكلفة على حساب المريض في الحال.
            </p>

            {/*  **السعرُ الأصلي حين سكتت المعاينة** — ليس خصماً ولا يحتاج
                اعتماداً: الطبيبُ ترك الحقلَ فارغاً، وأولُ رقمٍ يُكتب هو
                السعرُ الطبيعي نفسه. */}
            {needsFirstPrice && (
              <div className="space-y-1" data-testid="first-price-block">
                <Label className="text-sm font-semibold">
                  السعر الأصلي <span className="text-destructive">*</span>
                </Label>
                <MoneyInput value={firstPrice} onValueChange={setFirstPrice}
                  placeholder="0" data-testid="input-first-price" />
                <p className="text-xs text-muted-foreground">
                  لم يحدّد الطبيب كلفة الجهاز في المعاينة — أدخل السعر الطبيعي.
                  <b> لا يحتاج اعتماداً</b>؛ الاعتماد للخصم وحده.
                </p>
              </div>
            )}

            {/*  والخبيرُ الناقص يُختار **هنا** لا في شاشةٍ أخرى. والموجودُ
                يُعرَض للقراءة: تغييرُه فعلٌ مستقلٌّ له زرُّه، ولا يُبدَّل
                من باب البيع. */}
            {needsExpert ? (
              <div className="space-y-1" data-testid="purchase-expert-block">
                <Label className="text-sm font-semibold">
                  الخبير المسؤول <span className="text-destructive">*</span>
                </Label>
                <Select value={expertId} onValueChange={setExpertId}>
                  <SelectTrigger data-testid="select-purchase-expert">
                    <SelectValue placeholder="اختر الخبير" />
                  </SelectTrigger>
                  <SelectContent>
                    {(experts ?? []).map((e: any) => (
                      <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
                data-testid="text-purchase-expert">
                <span className="text-muted-foreground">الخبير المسؤول: </span>
                <b>{active.selectedExpertName ?? `#${active.selectedExpertUserId}`}</b>
              </div>
            )}

            {/*  والخصمُ هنا **لا يمرّ إلى التصنيع مباشرةً**: يُنشئ طلباً
                يعتمده المسؤولُ أو مديرُ الفرع، ولا يبدأ شيءٌ قبله. */}
            {originalPrice > 0 && (
              <ServiceDiscountFields originalPrice={originalPrice}
                value={discount} onChange={setDiscount} testIdPrefix="purchase-discount" />
            )}
          </div>
          <DialogFooter>
            <Button
              disabled={purchaseBlocked({
                followup: active, firstPrice, expertId, discount, busy,
              })}
              data-testid="button-confirm-purchase-submit"
              onClick={() => submit(`/api/followups/${active.id}/confirm-purchase`,
                purchaseBody({ followup: active, firstPrice, expertId, discount }))}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" />
                : purchaseSubmitLabel({ followup: active, firstPrice, discount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

//  ══ خريطةُ الأحداث انتقلت إلى `shared/followup_events` ═════════════════
//  كانت هنا ناقصةً: أربعةُ أنواعٍ يكتبها الخادم (`expert_selected` ·
//  `initial_price_set` · `discount_price_applied` · `price_request_cancelled`)
//  لم تكن فيها، والشاشةُ كانت تسقط إلى **اسم الحدث الخام** حين لا تجد
//  ترجمة — فتعرض رمزاً برمجياً لموظّفةٍ لا تعرف الإنجليزية.
//
//  والخريطةُ الجديدة تغطّي الثمانيةَ عشرَ نوعاً كلَّها، **ولا تعرض رمزاً
//  إنجليزياً إطلاقاً** ولو ظهر نوعٌ لم يُترجَم بعد. وهي مُختبَرةٌ وحدها بلا
//  شاشة، والاختبارُ يقرأ أنواعَ الخادم من مصدره فلا تُنسى ترجمةُ نوعٍ جديد.

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** مثل `Field` — بمعرّف اختبارٍ صريح، لملخّص البيع بعد الإتمام (المرحلة ٢). */
function SaleField({ label, value, testId }: { label: string; value: string; testId: string }) {
  return (
    <div className="rounded-md bg-white/70 px-2 py-1" data-testid={testId}>
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium text-green-900">{value}</div>
    </div>
  );
}
