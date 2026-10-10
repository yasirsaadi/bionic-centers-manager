// «إتمام البيع» / «لم يشترِ» — الكتلةُ التفاعلية الواحدة لمسار المعاينة
// المبسّط، مُستخلَصةً من `PostExamDecisionCard.tsx` (المرحلة الخامسة).
//
// ══ لماذا مكوّنٌ مستقلّ — لا نسخةٌ ثانية ═══════════════════════════════════
// كانت هذه الكتلةُ حيّةً في مكانٍ واحد فقط (بطاقة «قرار المريض بعد
// المعاينة» في صفحة المريض). وطابورُ «بانتظار الحسم» الجديد يحتاج الفعل
// التفاعليّ نفسَه بالضبط: **نفس البابين** (`/complete-sale`, `/not-bought`)
// بنفس التحقّق ونفس معاينة السعر الحيّة ونفس دلالة المجّانيّة ونفس قاعدة
// سبب «لم يشترِ» ونفس عرض ملاحظة الطبيب. فنسخُها كان يعني قاعدتين تنحرفان
// يوماً — فصارت مكوّناً واحداً يستهلكه الطرفان.
//
// **ولا حقيقةً ماليةً جديدة هنا**: هذا المكوّنُ لا يكتب شيئاً بنفسه — ينادي
// البابين القانونيَّين القائمين حرفياً كما كانت البطاقةُ تنادِيهما.

import { PatientVisibleBadge } from "@/components/patient/PatientVisibleBadge";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { XCircle, Loader2, HandCoins, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { deriveOfferFromDiscount, examPathBlockedMessage } from "@shared/commercial";
import { NOT_APPLICABLE } from "@shared/device_specs";
import { requestedItemsOf, type RequestedItem } from "@shared/prosthetic_parts";
import { READY_PARTS_HINT } from "@shared/part_sale";
import { SaleLinesEditor, saleLinesPayload, saleLinesPreview, saleUnitsOf, type SaleLineInputs } from "@/components/sale/SaleLinesEditor";

export interface ExamPathDecisionActionsPrefill {
  originalPrice?: number | null;
  approvedPrice?: number;
  priceKind?: string | null;
  selectedExpertUserId?: number | null;
}

export interface ExamPathDecisionActionsProps {
  followupId: number;
  patientId: number;
  /** فرعُ **العملية** — لقائمة الخبراء، لا فرعُ جلسة الفاعل. */
  branchId: number | null;
  /** الأفعالُ المتاحة من الخادم (`active.actions`) — `complete_sale`/`not_bought`. */
  actions: string[];
  /** ملاحظاتُ الطبيب من معاينة **هذه المتابعة بعينها** — فارغةٌ تُخفي الكتلة. */
  examNotes?: string | null;
  /** سطرُ الحالة المشتقّ من الخادم (اختياريّ — بطاقةُ المريض تمرّره). */
  statusLine?: string | null;
  /** تعبئةٌ مسبقة نادرة من قيمٍ سابقة على الصفّ — لا تُطمَس. */
  prefill?: ExamPathDecisionActionsPrefill;
  /**
   * **«إلغاء الحسم» — سلطةٌ إدارية يقولها الخادم** (ترحيل ٠٨١).
   *
   * مسؤولٌ عامّ أو مديرُ فرع، وللصفّ الحيّ وحده. **لا تُشتقّ في الشاشة**:
   * الخادمُ يفحص `canCancelDecision` ونطاقَ الفرع والحالةَ معاً ويرسل
   * الجواب — فلا يظهر زرٌّ سيردّه ٤٠٣ أو ٤٠٩. غيابُها يُقرأ «لا».
   */
  mayCancelDecision?: boolean;
  /** يُنادى بعد نجاح أيّ فعل — إضافةً على إبطال المفاتيح المشتركة أدناه. */
  onResolved?: () => void;
}

/**
 * **الكتلةُ الكاملة**: ملاحظةُ الطبيب (إن وُجدت) + زرّا «إتمام البيع»
 * و«لم يشترِ» (المتاحُ منهما فقط) + نافذتاهما + رسالةُ حجبٍ إن مُنع فعلٌ
 * بملكيةٍ موروثة. **المنادي مسؤولٌ ألّا يستدعيها لصفٍّ منتهٍ** (محوَّلٍ أو
 * مغلق) — لصفٍّ حيّ، هذا المكوّنُ يعرض دائماً شيئاً: ملاحظةً، أو زرّاً، أو
 * جملةَ حجب، أو أكثر من واحدةٍ معاً.
 */
export function ExamPathDecisionActions({
  followupId, patientId, branchId, actions, examNotes, statusLine, prefill, mayCancelDecision = false, onResolved,
}: ExamPathDecisionActionsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] =
    useState<"complete_sale" | "not_bought" | "cancel_decision" | null>(null);
  //  سببُ إلغاء الحسم — **نصٌّ حرٌّ إلزاميّ**، منفصلٌ عن سبب «لم يشترِ»:
  //  ذاك يقوله المريضُ وهذا يقوله المدير، وخلطُهما في حقلٍ واحد يخلط
  //  واقعتين في السجلّ.
  const [cCancelReason, setCCancelReason] = useState("");
  const [cOriginal, setCOriginal] = useState("");
  const [cDiscount, setCDiscount] = useState("");
  //  ══ **«مجاني» مربّعٌ صريح — لا رقمٌ يُحسَب في الرأس** ═════════════════
  //  المجّانيّةُ في هذا النظام **خصمٌ يساوي السعر الأصليّ** (دلالةُ ٠٦٦:
  //  `original_price > 0` و`approved_price = 0`)، وكان على الموظّف أن
  //  يعرف ذلك ويكتب الرقمَ مرّتين ليبلغه. فصار مربّعاً يقولها.
  const [cFree, setCFree] = useState(false);
  const [cExpert, setCExpert] = useState("");
  //  ══ **المبلغُ المدفوعُ الآن — اختياريٌّ محضٌ** (قرار المالك) ═══════════
  //  البيعُ/الكلفةُ ≠ القبض. فارغٌ **دائماً** افتراضاً، ولا شيء يملؤه غير
  //  الموظّف نفسِه من هذا الحقل بعينه — لا السعرُ الأصليّ ولا النهائيّ ولا
  //  الخصمُ يكتبون فيه أبداً. تركُه فارغاً لا يمنع البيعَ، والدفعةُ تُسجَّل
  //  لاحقاً من فعلها المعتاد إن لم تُدخَل هنا.
  const [cPaidNow, setCPaidNow] = useState("");
  const [cReason, setCReason] = useState("");
  const [note, setNote] = useState("");

  //  ══ **خاناتُ الجهاز قبل «اشترى»** (قرارُ المالك ٢٠٢٦-١٠-٠٨، §4.cq) ══
  //  ما كتبه الطبيبُ في وصفته يُعرَض ولا يُمَسّ، وما تركه فارغاً يُملأ هنا أو يُكتب فيه «لا ينطبق» — والخادمُ يردّ البيعَ ما دام فيها فراغ.
  //  تُقرأ من ملفّ متابعات المريض نفسِه (المفتاحُ الذي تقرؤه بطاقةُ المريض) حين تُفتح النافذة.
  const [cSpecs, setCSpecs] = useState<Record<string, string>>({});
  const { data: patientFollowups } = useQuery<any[]>({
    queryKey: [`/api/followups/patient/${patientId}`],
    enabled: dialog === "complete_sale",
  });
  const saleRow: any = (patientFollowups ?? []).find((f: any) => f.id === followupId) ?? null;
  const saleSpecs: {
    fields: { key: string; label: string; value: string | null; fromDoctor: boolean }[]; missing: string[];
    limbs?: { key: string; title: string }[]; identical?: boolean;
  } | null = saleRow?.deviceSpecs ?? null;
  //  ══ **ما طُلب ومَن يصنعه** (§4.cu) — من صفّ المتابعة نفسِه: أجزاءٌ عدّة ⟵ سعرٌ لكلّ جزء، وجاهزٌ ⟵ بلا خبير. ══
  const saleItems: RequestedItem[] = saleRow?.deviceEpisodeId
    ? requestedItemsOf(saleRow.requestedItem, saleRow.extraComponents) : [];
  //  ══ **سعرٌ لكلّ طرف أو سعرٌ واحد** (قرارُ المالك ٢٠٢٦-١٠-١٠، §4.de (ب) — «أعطِ حرّية ولا تقيّد») — للجهاز الكامل بأكثر من طرفٍ مصنوع.
  //  يبدأ «لكلّ طرف» حين تختلف مواصفاتُ الأطراف، و«واحداً» حين تتماثل؛ والموظّفُ يبدّله. والمجموعُ هو السعرُ النهائيّ. ══
  const saleLimbs = saleSpecs?.limbs ?? [];
  const canSplitLimbs = saleLimbs.length >= 2 && saleItems.includes("full_device");
  const [perLimbChoice, setPerLimbChoice] = useState<boolean | null>(null);
  const perLimb = canSplitLimbs && (perLimbChoice ?? saleSpecs?.identical !== true);
  const saleUnits = saleUnitsOf(saleItems, saleRow?.serviceType ?? "prosthetic", perLimb ? saleLimbs : null);
  const byLines = saleUnits.length > 1;
  const expertNeeded = saleRow ? saleRow.needsExpert !== false : true;
  const [cLines, setCLines] = useState<SaleLineInputs>({});
  useEffect(() => {
    if (dialog !== "complete_sale" || !saleSpecs) return;
    setCSpecs((prev) => {
      const next = { ...prev };
      for (const f of saleSpecs.fields) if (!f.fromDoctor && next[f.key] === undefined) next[f.key] = f.value ?? "";
      return next;
    });
  }, [dialog, saleSpecs]);
  const specsToFill = (saleSpecs?.fields ?? []).filter((f) => !f.fromDoctor);
  const specsIncomplete = specsToFill.some((f) => !(cSpecs[f.key] ?? "").trim());

  const reset = () => {
    setDialog(null); setCOriginal(""); setCDiscount(""); setCFree(false);
    setCExpert(""); setCPaidNow(""); setCReason(""); setCCancelReason("");
    setNote(""); setCSpecs({}); setCLines({}); setPerLimbChoice(null);
  };

  //  نفسُ استعلام الخبراء بنفس المفتاح والفرع الذي تستعمله بطاقة المريض —
  //  فرعُ العملية لا فرعُ جلسة الفاعل (تصحيحٌ 2026-08-28، القسم 4.i).
  const { data: experts } = useQuery<any[]>({
    queryKey: ["/api/manufacturing/experts", branchId],
    queryFn: async () => {
      const res = await fetch(`/api/manufacturing/experts?branchId=${branchId}`,
        { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: branchId !== null,
  });

  //  ══ **إبطالٌ مشترك للنجاح وللفشل معاً** (تصحيحٌ لاحق) ══════════════════
  //  النجاحُ يُحدِّث لأن شيئاً تغيّر؛ والفشلُ يُحدِّث لأن ما ظنّه المستخدم
  //  صحيحاً (الصفُّ أمامه قابلٌ للحسم) قد لا يكون كذلك — زميلٌ آخر حسمه
  //  للتوّ فيردّ الخادم ٤٠٩. فلا حالةٌ محليّةٌ باتت تُصدَّق في الحالتين.
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/followups"] });
    qc.invalidateQueries({ queryKey: ["/api/followups/approvals"] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/discounts"] });
    qc.invalidateQueries({ queryKey: [`/api/discounts/patient/${patientId}`] });
    //  ══ **طابورُ «بانتظار الحسم» وشارتُه** (المرحلة الخامسة) ═══════════
    //  مفتاحٌ واحد يطابق الطرفين جزئياً: قوائمَ الحالتين (`[...,"waiting"]`/
    //  `[...,"resolved"]`) **وشارةَ الشريط الجانبيّ** معاً — الصفحةُ
    //  الجديدة والبطاقةُ القديمة تشتركان في هذا الإبطال حرفياً.
    qc.invalidateQueries({ queryKey: ["/api/followups/decision-queue"] });
  };

  const act = useMutation({
    mutationFn: async (
      { path, body }: { path: string; body: any; kind: "complete_sale" | "not_bought" | "cancel_decision" },
    ) => {
      const res = await apiRequest("POST", path, body);
      return res.json();
    },
    onSuccess: (_data, variables) => {
      invalidateAll();
      //  ══ **إتمامُ البيع يحرّك مالَ المريض فعلاً — «لم يشترِ» لا يحرّك
      //  ديناراً** (تحكّمُ الذاكرة، 2026-08-30) ═══════════════════════════
      //  البيعُ يفتح أمرَ تصنيعٍ ويقيّد كلفةً وربما دفعةً الآن (`paidNow`)،
      //  فيستحقّ الإبطالَ الشامل نفسَه الذي يستعمله كلُّ بابٍ ماليّ آخر.
      //  و«لم يشترِ» يبقى على `invalidateAll` وحدها كما كان — إغلاقُ ملفٍّ
      //  بلا تصنيعٍ ولا كلفةٍ ولا دينار، فلا يستحقّ إبطالاً يوهم بتغيّر مال.
      if (variables.kind === "complete_sale") {
        invalidatePatientData(qc, patientId);
      }
      toast({ title: "تمّ الحفظ" });
      reset();
      onResolved?.();
    },
    //  ══ **تعارضٌ (٤٠٩) أو أيّ خطأٍ آخر ⟶ الحالةُ المرجعيّة تُحدَّث دائماً**
    //  (تصحيحٌ لاحق) ═══════════════════════════════════════════════════════
    //  موظّفٌ فتح صفّاً حسمه زميلٌ آخر أوّلاً: الخادمُ يردّ ٤٠٩ صحيحاً، لكن
    //  ترك الطابور بلا تحديثٍ كان يُبقي الصفَّ الآن الباطل ظاهراً حتى
    //  التحديث التالي التلقائيّ أو تنقّلٍ يدويّ. فبدل تحليل رمز الحالة (هشٌّ
    //  حين يمرّ عبر `apiRequest`)، كلُّ خطأٍ يُبطل نفسَ ما يُبطله النجاحُ —
    //  **رسالةُ الخادم الحقيقية تُعرَض، والحالةُ تُقرأ من جديد دائماً**. لا
    //  نجاحَ يُعرَض، ولا بياناتٍ محليّةً باتت تُصدَّق.
    onError: (err: any) => {
      toast({
        title: "تعذّر الحفظ",
        description: err?.message ?? "حاول مرة أخرى",
        variant: "destructive",
      });
      invalidateAll();
    },
  });
  const busy = act.isPending;
  const submit = (path: string, body: any, kind: "complete_sale" | "not_bought" | "cancel_decision") =>
    act.mutate({ path, body, kind });

  //  ══ **الخصمُ الفعليّ — مُشتقٌّ لا مخزَّنٌ مرّتين** ═══════════════════
  //  «مجاني» مؤشَّرٌ ⟶ الخصمُ **هو** السعرُ الأصليّ، فيخرج النهائيُّ صفراً
  //  من `deriveOfferFromDiscount` نفسِها بلا قاعدةٍ ثانية هنا. ولأنه مُشتقّ
  //  لا منسوخ، تغييرُ السعر الأصليّ وهو مؤشَّرٌ **يتبعه الخصمُ فوراً** —
  //  فلا يبقى رقمٌ بائتٌ يجعل «المجّانيّ» بسعرٍ موجب.
  //
  //  **والمُرسَلُ هو هذا بعينه** لا حالةُ المربّع: العميلُ لا يرسل نوعَ سعرٍ
  //  ولا سعراً نهائياً أبداً (القسم 4.i) — الخادمُ يشتقّهما من
  //  `originalPrice`/`discountAmount` وحدهما ويعتمدهما وحده.
  const csEffectiveDiscount = cFree ? cOriginal : cDiscount;
  //  **وأجزاءٌ عدّة: المجموعُ من أسطرها** (§4.cu) — نفسُ ما يشتقّه الخادمُ ويعتمده.
  const linesTotals = byLines ? saleLinesPreview(saleUnits, cLines) : null;
  const csOffer = byLines
    ? (linesTotals
      ? { ok: true, kind: linesTotals.kind, finalPrice: linesTotals.finalPrice, error: undefined as string | undefined }
      : { ok: false, kind: null, finalPrice: null, error: perLimb ? "أدخل سعر كلّ طرف" : "أدخل سعر كلّ جزء" })
    : deriveOfferFromDiscount({
      originalPrice: cOriginal === "" ? null : Number(cOriginal),
      discountAmount: csEffectiveDiscount === "" ? 0 : Number(csEffectiveDiscount),
    });
  //  **قراءةٌ فقط من حقل القبض نفسِه** — ليست جزءاً من اشتقاق العرض
  //  التجاريّ، فالحارسُ الحقيقيّ في الخادم لا هنا (راجع `parsePaidNow`).
  const paidNowValue = cPaidNow === "" ? 0 : Number(cPaidNow);
  const paidNowExceeds = csOffer.ok && csOffer.finalPrice !== null
    && paidNowValue > csOffer.finalPrice;

  //  ══ **رسالةُ الحجب — من `actions` وحدها، بلا كودِ مالكيةٍ يصل الشاشة**
  //  (تصحيحٌ لاحق) ═══════════════════════════════════════════════════════
  const blockedMessage = examPathBlockedMessage(actions);
  const hasNote = Boolean(examNotes && examNotes.trim());

  //  ══ **لا `return null` على غياب الأفعال بعد اليوم** (تصحيحٌ لاحق) ═════
  //  كانت `actions.length === 0` تُخفي الكتلةَ كلَّها — ومعها ملاحظةَ
  //  الطبيب. صحيحٌ لصفٍّ **منتهٍ** (المنادي هنا يتكفّل بعدم استدعاء هذا
  //  المكوّن أصلاً لصفٍّ كهذا)، لكنّه كان يُخفي أيضاً صفّاً **حيّاً** حُجب
  //  فعلُه الوحيد بملكيةٍ موروثة — فيختفي من الطابور عملياً رغم بقائه فيه.
  //  والآن: الملاحظةُ تُعرَض دائماً إن وُجدت، والحجبُ يُقال بجملةٍ بدل الصمت.
  return (
    <>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 space-y-2"
        data-testid="block-exam-path-sale">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-emerald-900">إتمام البيع</p>
          {statusLine && (
            <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-emerald-900"
              data-testid="text-commercial-status-line">
              {statusLine}
            </span>
          )}
        </div>
        {/*  ══ **ملاحظاتُ الطبيب من المعاينة — سياقٌ للقراءة فقط** ══════════
            نصُّ `medical_exams.notes` **لهذه المتابعة بعينها**
            (`post_exam_followups.medical_exam_id`) — لا «آخرُ معاينةٍ
            للمريض». **لا يُقرأ برمجياً ولا يُشتقّ منه سعرٌ أو خصمٌ أو
            خبير** — البيعُ الفعليُّ من الحقول الصريحة أدناه وحدها.
            فارغةٌ ⟶ لا تُعرَض. **وتبقى ظاهرةً ولو حُجبت الأفعالُ كلُّها**
            — سياقٌ للقارئ بصرف النظر عمّن يملك الحسم الآن. */}
        {hasNote && (
          <div className="rounded-md border border-emerald-300 bg-white/70 p-2.5 text-sm"
            data-testid="block-exam-note">
            <p className="text-xs font-semibold text-emerald-900">
              ملاحظاتُ الطبيب من المعاينة
            </p>
            <p className="mt-1 whitespace-pre-wrap text-foreground" data-testid="text-exam-note">
              {examNotes}
            </p>
            <p className="mt-1 text-xs text-muted-foreground" data-testid="text-exam-note-hint">
              للاطلاع فقط — السعر المعتمد هو المسجل في إتمام البيع.
            </p>
          </div>
        )}
        {actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {actions.includes("complete_sale") && (
              <Button size="sm" disabled={busy}
                onClick={() => {
                  //  تعبئةٌ مسبقة من أيّ بياناتٍ محفوظةٍ سابقاً — نادرٌ لكن لا تُطمَس.
                  setCOriginal(prefill?.originalPrice != null
                    ? String(prefill.originalPrice)
                    : (prefill?.approvedPrice && prefill.approvedPrice > 0
                      ? String(prefill.approvedPrice) : ""));
                  setCDiscount(prefill?.priceKind && prefill?.originalPrice
                    ? String(Math.max(0, prefill.originalPrice - (prefill.approvedPrice ?? 0))) : "");
                  //  مجّانيّةٌ محفوظةٌ سابقاً تُقرأ من نوعها لا من رقمها.
                  setCFree(prefill?.priceKind === "free");
                  setCExpert(prefill?.selectedExpertUserId ? String(prefill.selectedExpertUserId) : "");
                  setDialog("complete_sale");
                }}
                data-testid="button-open-complete-sale">
                <HandCoins className="h-4 w-4" /> إتمام البيع
              </Button>
            )}
            {actions.includes("not_bought") && (
              <Button size="sm" variant="outline" disabled={busy}
                onClick={() => { setCReason(""); setDialog("not_bought"); }}
                data-testid="button-decide-not-bought">
                <XCircle className="h-4 w-4" /> لم يشترِ
              </Button>
            )}
          </div>
        )}
        {/*  ══ **«إلغاء الحسم» — خارجَ `actions` عمداً** (ترحيل ٠٨١) ═══════
            سلطتُه أضيقُ (مسؤولٌ أو مديرُ فرع) ولا تحرسها مالكيةُ حقلٍ
            تجاريّ — فلا يُطوى في مصفوفة أفعال البيع. ويظهر **ولو حُجبت
            أفعالُ البيع كلُّها**: صفٌّ موروثٌ محجوبٌ عن الحسم هو بعينه ما
            قد يحتاج الخروجَ من الطابور. */}
        {mayCancelDecision && (
          <div className="flex flex-wrap gap-2 border-t border-emerald-200 pt-2">
            <Button size="sm" variant="ghost" disabled={busy}
              className="text-muted-foreground hover:text-destructive"
              onClick={() => { setCCancelReason(""); setDialog("cancel_decision"); }}
              data-testid="button-cancel-decision">
              <Ban className="h-4 w-4" /> إلغاء الحسم
            </Button>
          </div>
        )}
        {/*  ══ **حاجزُ ملكيةٍ موروثة — جملةٌ إنسانية بلا كودٍ داخليّ**
            (تصحيحٌ لاحق) ═══════════════════════════════════════════════
            `null` حين لا حجب (الفعلان معاً)، وإلّا جملةٌ من
            `examPathBlockedMessage` وحدها — لا `owner`/`doctor`/`staff`
            ولا اسمَ حالةٍ يصل هذه الشاشة. */}
        {blockedMessage && (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900"
            data-testid="text-exam-path-blocked">
            {blockedMessage}
          </p>
        )}
      </div>

      {/*  ══ **نافذةُ «إتمام البيع» — بابٌ واحد** (المرحلة الثانية) ═══════
          الخبيرُ والسعرُ الأصليّ ومقدارُ الخصم فقط. **لا نوعَ سعرٍ يُختار
          ولا سعرَ نهائيّاً يُكتب** — النهائيُّ معاينةٌ حيّة تحت الحقول
          (`csOffer`)، ولا يُرسَل في الطلب: الخادمُ يشتقّه ويعتمده وحده. */}
      <Dialog open={dialog === "complete_sale"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl" className="max-w-md max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>إتمام البيع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {!expertNeeded && (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-900"
                data-testid="text-complete-sale-ready">
                <b>جاهز — يُسلَّم اليوم بلا خبيرٍ ولا أمر تصنيع.</b> {READY_PARTS_HINT}
              </p>
            )}
            {expertNeeded && <div className="space-y-1">
              <Label htmlFor="cs-expert" className="text-xs">الخبير</Label>
              <Select value={cExpert} onValueChange={setCExpert}>
                <SelectTrigger id="cs-expert" className="bg-white"
                  data-testid="select-complete-sale-expert">
                  <SelectValue placeholder={(experts ?? []).length
                    ? "اختر الخبير" : "لا يوجد خبير في هذا الفرع"} />
                </SelectTrigger>
                <SelectContent>
                  {(experts ?? []).map((e: any) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>}
            {/*  **أجزاءٌ عدّة: سطرٌ لكلّ جزء ثمّ المجموع** (§4.cu) — بدل السعر الواحد والخصم و«مجاني». */}
            {/*  **أطرافٌ عدّة: سعرٌ لكلّ طرف أو سعرٌ واحد** (§4.de (ب)) — اختيارٌ لا قيد، والمجموعُ هو النهائيّ. */}
            {canSplitLimbs && (
              <div className="space-y-1" data-testid="complete-sale-limb-pricing">
                <Label className="text-xs">سعر الأطراف</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([[false, "سعرٌ واحد للجهاز"], [true, "سعرٌ لكلّ طرف"]] as const).map(([v, label]) => (
                    <button key={String(v)} type="button" onClick={() => setPerLimbChoice(v)} aria-pressed={perLimb === v}
                      className={"rounded-md border px-2 py-1.5 text-sm " + (perLimb === v ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-slate-50")}
                      data-testid={`button-complete-sale-${v ? "per-limb" : "one-price"}`}>{label}</button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {saleLimbs.map((l) => l.title).join(" · ")} — {perLimb ? "والمجموعُ هو السعرُ النهائيّ، ويُفصَّل في الاستمارة." : "سعرٌ واحد للأطراف كلّها."}
                </p>
              </div>
            )}
            {byLines && (
              <SaleLinesEditor units={saleUnits} value={cLines} onChange={setCLines} testId="complete-sale-lines" />
            )}
            {!byLines && <>
            <div className="space-y-1">
              <Label htmlFor="cs-original" className="text-xs">السعر الأصلي (د.ع)</Label>
              <MoneyInput id="cs-original" allowEmpty value={cOriginal}
                onValueChange={(v) => setCOriginal(v === null ? "" : String(v))}
                className="bg-white" data-testid="input-complete-sale-original" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cs-discount" className="text-xs">مقدار الخصم (د.ع)</Label>
              {/*  مؤشَّرٌ «مجاني» ⟶ الحقلُ **معطَّلٌ ويعرض السعر الأصليّ**:
                  لا يُترَك مفتوحاً برقمٍ يناقض المربّع، ولا يُخفى فيختفي
                  معه سببُ كون النهائيّ صفراً. */}
              <MoneyInput id="cs-discount" allowEmpty value={csEffectiveDiscount}
                disabled={cFree}
                onValueChange={(v) => setCDiscount(v === null ? "" : String(v))}
                className="bg-white" data-testid="input-complete-sale-discount" />
            </div>
            {/*  ══ **«مجاني» — قرارٌ يُؤشَّر لا رقمٌ يُحسَب** ═══════════════
                والسعرُ الأصليُّ يبقى مطلوباً وهو مؤشَّر: التبرّعُ يُقاس
                بقيمته (دلالةُ ٠٦٦)، فمجّانيٌّ بلا أصلٍ موجب يردّه الخادم. */}
            <div className="flex items-center gap-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 p-2.5">
              <Checkbox id="cs-free" checked={cFree}
                onCheckedChange={(v) => setCFree(!!v)}
                data-testid="checkbox-complete-sale-free" />
              <Label htmlFor="cs-free" className="cursor-pointer text-sm font-medium">
                مجاني — السعر النهائي صفر
              </Label>
            </div>
            {/*  السعرُ النهائيّ — للقراءة فقط، معاينةٌ حيّة لا حقلٌ يُكتب فيه. */}
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
              data-testid="text-complete-sale-final">
              <span className="text-muted-foreground">السعر النهائي: </span>
              {csOffer.ok ? (
                csOffer.kind === "free" ? (
                  <b className="text-emerald-800" data-testid="text-complete-sale-free">
                    مجاني — ٠ د.ع
                  </b>
                ) : (
                  <b>{csOffer.finalPrice?.toLocaleString()} د.ع</b>
                )
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
            {cOriginal !== "" && !csOffer.ok && (
              <p className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                data-testid="text-complete-sale-error">
                {csOffer.error}
              </p>
            )}
            </>}
            {/*  ══ **المبلغُ المدفوعُ الآن — حقلٌ اختياريّ محض** ══════════════
                فارغٌ افتراضاً **دائماً**، ولا تعبئةَ تلقائية من أيّ قيمةٍ
                أخرى في هذه النافذة — لا السعر الأصلي ولا النهائي ولا
                الخصم. البيعُ يمضي بصرف النظر عمّا فيه؛ وترْكُه فارغاً لا
                يمنع شيئاً — الدفعةُ تُسجَّل لاحقاً من «تسجيل دفعة». */}
            <div className="space-y-1">
              <Label htmlFor="cs-paid-now" className="text-xs">
                المبلغ المدفوع الآن (اختياري) <PatientVisibleBadge className="ms-2" />
              </Label>
              <MoneyInput id="cs-paid-now" allowEmpty value={cPaidNow}
                onValueChange={(v) => setCPaidNow(v === null ? "" : String(v))}
                className="bg-white" data-testid="input-complete-sale-paid-now" />
              <p className="text-xs text-muted-foreground">
                اتركه فارغاً إذا لم يُستلم مبلغ الآن — ويمكن تسجيل الدفعة لاحقاً من «تسجيل دفعة».
              </p>
              {/*  الباقي — يُعرَض فقط حين يوجد سعرٌ نهائيّ صالح، وقيمتُه
                  مشتقّةٌ محلياً للعرض وحده؛ الحارسُ الحقيقيّ في الخادم. */}
              {csOffer.ok && csOffer.finalPrice !== null && (
                paidNowExceeds ? (
                  <p className="rounded border border-destructive/40 bg-destructive/10 px-2 py-1 text-xs font-medium text-destructive"
                    data-testid="text-complete-sale-paid-now-error">
                    لا يمكن أن يتجاوز المبلغ المدفوع الآن السعر النهائي
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground" data-testid="text-complete-sale-remaining">
                    الباقي بعد هذا القبض: <b>{(csOffer.finalPrice - paidNowValue).toLocaleString()} د.ع</b>
                  </p>
                )
              )}
            </div>
            {saleSpecs && saleSpecs.fields.length > 0 && (
              <div className="space-y-2 rounded-md border bg-slate-50/60 p-2" data-testid="complete-sale-specs">
                <div className="text-xs font-semibold">مواصفات الجهاز — لا يُقبَل «اشترى» قبل أن تمتلئ</div>
                {saleSpecs.fields.map((f) => f.fromDoctor ? (
                  <div key={f.key} className="flex flex-wrap items-baseline gap-1 text-xs" data-testid={`spec-doctor-${f.key}`}>
                    <span className="text-muted-foreground">{f.label}:</span> <b>{f.value}</b>
                    <span className="text-[10px] text-muted-foreground">(من الطبيب)</span>
                  </div>
                ) : (
                  <div key={f.key} className="space-y-1">
                    <Label className={"text-xs" + ((cSpecs[f.key] ?? "").trim() ? "" : " text-red-700")}>{f.label}</Label>
                    <div className="flex gap-1.5">
                      <Input value={cSpecs[f.key] ?? ""} onChange={(e) => setCSpecs((p) => ({ ...p, [f.key]: e.target.value }))}
                        className="bg-white h-9" data-testid={`input-sale-spec-${f.key}`} />
                      <Button type="button" size="sm" variant={cSpecs[f.key] === NOT_APPLICABLE ? "default" : "outline"} className="h-9 shrink-0 text-xs"
                        onClick={() => setCSpecs((p) => ({ ...p, [f.key]: NOT_APPLICABLE }))} data-testid={`button-sale-spec-na-${f.key}`}>
                        {NOT_APPLICABLE}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="cs-note" className="text-xs">ملاحظة (اختياري)</Label>
              <Input id="cs-note" value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-complete-sale-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || (expertNeeded && !cExpert) || !csOffer.ok || paidNowExceeds || specsIncomplete}
              data-testid="button-save-complete-sale"
              onClick={() => submit(`/api/followups/${followupId}/complete-sale`, {
                ...(byLines ? { lines: saleLinesPayload(saleUnits, cLines) } : {
                  originalPrice: Number(cOriginal),
                  discountAmount: csEffectiveDiscount === "" ? 0 : Number(csEffectiveDiscount),
                }),
                ...(expertNeeded ? { expertUserId: Number(cExpert) } : {}),
                paidNow: cPaidNow === "" ? undefined : Number(cPaidNow),
                note: note || undefined,
                deviceSpecs: Object.fromEntries(specsToFill.map((f) => [f.key, (cSpecs[f.key] ?? "").trim()])),
              }, "complete_sale")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : expertNeeded ? "حفظ البيع وبدء التصنيع" : "حفظ البيع وتسليم الأجزاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*  ══ **«لم يشترِ» بسببٍ حرٍّ إلزاميّ** ═══════════════════════════════
          ولا قائمةَ أحدَ عشر رمزاً يختار منها الموظّفُ «سبب آخر». وبابُها
          المستقلّ `/not-bought` — لا `/commercial` القديمة. */}
      <Dialog open={dialog === "not_bought"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>لم يشترِ</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="c-reason" className="text-xs">
              سبب عدم الشراء <span className="text-destructive">*</span>
            </Label>
            <Textarea id="c-reason" value={cReason} onChange={(e: any) => setCReason(e.target.value)}
              placeholder="اكتب ما قاله المريض" className="bg-white min-h-[70px]"
              data-testid="input-c-reason" />
            <p className="text-xs text-muted-foreground">
              يُغلَق الملفّ بلا تصنيعٍ ولا كلفةٍ ولا دينار — ويمكن إعادة فتحه إن عاد المريض.
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={busy || !cReason.trim()}
              data-testid="button-save-not-bought"
              onClick={() => submit(`/api/followups/${followupId}/not-bought`,
                { reason: cReason.trim(), note: note || undefined }, "not_bought")}>
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*  ══ **نافذةُ إلغاء الحسم — تأكيدٌ وسببٌ إلزاميّ** ═══════════════
          والنصُّ يقول ما **لا** يحدث بقدر ما يقول ما يحدث: الموظّفُ يحتاج
          أن يطمئنّ أن الملفَّ والمالَ والجهازَ والمعاينةَ لا تُمَسّ. */}
      <Dialog open={dialog === "cancel_decision"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>إلغاء الحسم</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
              data-testid="text-cancel-decision-scope">
              تخرج هذه المتابعة من «بانتظار الحسم» نهائياً. <b>ولا يُسجَّل شراءٌ
              ولا «لم يشترِ»</b>، ولا تتغيّر الدفعاتُ ولا الكلفةُ ولا الجهازُ ولا
              أمرُ التصنيع ولا المعاينة — بياناتُ المريض كلُّها تبقى كما هي.
            </p>
            <Label htmlFor="c-cancel-reason" className="text-xs">
              سبب الإلغاء <span className="text-destructive">*</span>
            </Label>
            <Textarea id="c-cancel-reason" value={cCancelReason}
              onChange={(e: any) => setCCancelReason(e.target.value)}
              placeholder="لماذا لا ينبغي أن تكون هذه المتابعة في الطابور؟"
              className="bg-white min-h-[70px]" data-testid="input-cancel-decision-reason" />
            <p className="text-xs text-muted-foreground">
              يُسجَّل السببُ ومَن نفّذ ووقتُ التنفيذ في سجلّ التدقيق.
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={busy || !cCancelReason.trim()}
              data-testid="button-save-cancel-decision"
              onClick={() => submit(`/api/followups/${followupId}/cancel-decision`,
                { reason: cCancelReason.trim() }, "cancel_decision")}>
              تأكيد إلغاء الحسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
