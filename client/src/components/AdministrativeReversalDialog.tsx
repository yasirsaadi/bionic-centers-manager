import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  CORRECTION_INTENT_LABELS, CORRECTION_INTENT_EFFECTS, CORRECTION_INTENT_MODE,
  replacementSummaryLine,
  REFUND_ANSWERS, REFUND_ANSWER_LABELS, REFUND_QUESTION_LABEL, refundQuestionRequired,
  UNREFUNDED_CHOICES, UNREFUNDED_CHOICE_LABELS, UNREFUNDED_CHOICE_LABEL,
  unrefundedChoiceRequired,
  type CorrectionIntent, type RefundAnswer, type ReversalMode, type ReversalPreview,
  type UnrefundedChoice,
} from "@shared/administrative_reversal";

// **تصحيح / إلغاء العملية** — نافذةٌ واحدة تفتحها الشاشاتُ الثلاث.
//
// ══ لماذا نافذةٌ واحدة ═════════════════════════════════════════════════
// الخطأُ يُرى من ثلاثة أماكن: بطاقةُ المعاينة، وبطاقةُ قرار ما بعد المعاينة،
// وبطاقةُ التصنيع النشط. **ولا ثلاثةَ تنفيذات**: ثلاثةٌ تنحرف، فتُلغي إحداها
// ما لا تُلغيه الأخرى. فالنافذةُ واحدةٌ تُفتَح بالهويّة نفسِها.
//
// ══ وليست «حذفاً» ══════════════════════════════════════════════════════
// العنوانُ يقول «تصحيح / إلغاء العملية» لا «حذف»: **لا يُمحى شيء**. تُعكَس
// الآثارُ بقيودٍ معاكسة، وتبقى المعاينةُ والدفعةُ وسجلُّ التصنيع والتسليم
// مقروءةً في التاريخ.
//
// ══ والأثرُ يُقرأ من الخادم لا يُستنتَج هنا ════════════════════════════
// قاعدتان للأثر — واحدةٌ تُعرَض وأخرى تُنفَّذ — تنحرفان يوماً، فتَعِد الشاشةُ
// بما لا يفعله الخادم. فالخادمُ يقول ماذا سيتغيّر، وهذه تعرضه حرفياً.

export interface ReversalTarget {
  followupId?: number | null;
  workOrderId?: number | null;
  episodeId?: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: ReversalTarget;
  patientId: number;
}

export function AdministrativeReversalDialog({
  open, onOpenChange, target, patientId,
}: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<ReversalMode | "">("");
  const [intent, setIntent] = useState<CorrectionIntent | "">("");
  const [replacementRequestedItem, setReplacementRequestedItem] = useState("");
  const [reasonNote, setReasonNote] = useState("");
  //  جوابُ «هل تم إرجاع المبلغ للمريض؟» — يمنع التأكيدَ حتى يُختار، **ولا
  //  يُرسَل ولا يغيّر ديناراً** (المرحلةُ الأولى، قرارُ المالك).
  const [refundAnswer, setRefundAnswer] = useState<RefundAnswer | "">("");
  //  وفرعُ «لا»: أيمضي ويُسوّي لاحقاً، أم يتراجع؟ **لا يُرسَل هو الآخر.**
  const [unrefundedChoice, setUnrefundedChoice] = useState<UnrefundedChoice | "">("");

  //  ولا مسوّدةٌ تتسرّب إلى عمليةٍ أخرى: سببُ أمسٍ ليس سببَ اليوم.
  useEffect(() => {
    if (!open) return;
    setMode(""); setIntent(""); setReplacementRequestedItem(""); setReasonNote("");
    setRefundAnswer(""); setUnrefundedChoice("");
  }, [open, target.followupId, target.workOrderId, target.episodeId]);

  const key = JSON.stringify(target);
  const { data: preview, isLoading, error } = useQuery<ReversalPreview>({
    queryKey: ["/api/admin/operation-reversal/preview", key],
    enabled: open,
    //  **بلا تخزينٍ مؤقّت**: الأثرُ لقطةٌ تشيخ، وعرضُ لقطةٍ قديمة يجعل
    //  الموظّفَ يؤكّد ما لم يعد قائماً — ويردّه الخادمُ بختمٍ بائت.
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      const res = await fetch("/api/admin/operation-reversal/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(target),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر قراءة أثر التصحيح");
      return res.json();
    },
  });

  //  وضعٌ واحدٌ متاح ⟶ يُختار تلقائياً، فلا يُسأل الموظّف سؤالاً بلا خيار.
  useEffect(() => {
    const modes = preview?.availableModes ?? [];
    if (modes.length === 1 && !mode) setMode(modes[0]);
  }, [preview, mode]);

  //  **النيّة ⟶ الوضع بالخريطة المشتركة** — نفسِها التي يقرؤها الخادم،
  //  فلا تُرسل الشاشةُ وضعاً يخالف ما سيشتقّه هو.
  useEffect(() => {
    if (!intent) return;
    setMode(CORRECTION_INTENT_MODE[intent]);
    //  تبديلُ النيّة يُسقط بديلاً اختير لنيّةٍ أخرى.
    if (intent !== "replace_requested_item") setReplacementRequestedItem("");
    //  **وجوابُ الإرجاع كذلك**: أُجيب عن «إلغاءٍ كامل» ثمّ بُدِّلت النيّةُ
    //  ثمّ عاد إليها — فيُسأل من جديد، ولا يُحمَل جوابٌ قديم على قرارٍ جديد.
    setRefundAnswer(""); setUnrefundedChoice("");
  }, [intent]);

  const run = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/operation-reversal/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...target, intent, replacementRequestedItem, reasonNote: reasonNote.trim(),
          stateStamp: preview?.stateStamp,
          //  **جوابُ الإرجاع يُرسَل حين يلزم وحدَه** — أي مع «إلغاء العملية
          //  بالكامل» على عمليةٍ لها مبلغٌ مقبوض. و«التراجعُ عن الشراء» لا
          //  سؤالَ فيه أصلاً، فحملُ جوابٍ إليه يُوهم قارئَ الطلب أن قراراً
          //  مالياً اتُّخذ هناك.
          //
          //  **وبالقاعدة المشتركة نفسِها التي قرّرت أن يُعرَض السؤال** — لا
          //  بشرطٍ ثانٍ يُكتب هنا وينحرف عنها يوماً. والخادمُ هو الحاكمُ على
          //  كلّ حال: يقرأ المبلغَ تحت القفل ويردّ التنفيذَ إن لزم الجوابُ
          //  ولم يصل — فلقطةٌ بائتة هنا تُردّ هناك، لا تمضي صامتة.
          ...(refundQuestionRequired({ mode, paidAmount: preview?.paidAmount }) && refundAnswer
            ? { refundAnswer } : {}),
        }),
      });
      if (!res.ok) throw new Error((await res.json())?.error || "تعذّر تنفيذ التصحيح");
      return res.json();
    },
    onSuccess: (out: any) => {
      toast({
        title: intent === "replace_requested_item"
          ? `تم تصحيح العملية وفتح طلب جديد: ${replacementLabel || "الطلب الصحيح"}`
          : mode === "purchase_only" ? "تم التراجع عن الشراء" : "تم إلغاء العملية إدارياً",
        //  **ويُقال ما وقع للمال بالضبط** — ثلاثُ حالاتٍ لا حالتان: رُدّ ·
        //  بقي ويحتاج تسوية · لا مالَ أصلاً. وسطرٌ واحدٌ لحالتين يُخفي ردّاً
        //  وقع فعلاً، أو يَعِد بتسويةٍ لا موضوعَ لها.
        description: Number(out?.refundedAmount ?? 0) > 0
          ? `تم رد ${Number(out.refundedAmount).toLocaleString("en-US")} د.ع للمريض`
            + " — ولا تسوية مالية معلقة."
            + (out?.refundJournalPosted === false
              ? " (تعذّر قيد اليومية — راجع دليل حسابات الفرع.)" : "")
          : out?.requiresFinancialSettlement
            ? "الدفعة المسجلة لم تُحذف — للمريض رصيد يحتاج تسوية مالية."
            : "عادت الحالة الصحيحة، وبقيت جميع السجلات في التاريخ.",
      });
      //  كلُّ قارئٍ يجب أن يتّفق فوراً: الملفُّ والحلقاتُ والمتابعةُ
      //  والتصنيعُ وطوابيرُ الطبيب والمال.
      for (const k of [
        [`/api/patients/${patientId}`], ["/api/patients"], ["/api/patients/registry"],
        [`/api/patients/${patientId}/device-episodes`],
        [`/api/followups/patient/${patientId}`],
        [`/api/medical/patients/${patientId}/exams`],
        ["/api/medical/pending"], ["/api/medical/worklist"],
        ["/api/manufacturing/orders"], ["/api/manufacturing/overview"],
        ["/api/patients/:id", patientId, "cases"],
      ]) queryClient.invalidateQueries({ queryKey: k as any });
      onOpenChange(false);
    },
    onError: (e: any) => toast({
      title: "تعذّر التصحيح", description: e?.message, variant: "destructive",
    }),
  });

  //  **البدائلُ من الخادم** — هو مَن يعرف ما طُلب وما يقبله، ولا تشتقّها
  //  الشاشةُ من خريطةٍ ثانية.
  const replacementLabel = (preview?.replacementOptions ?? [])
    .find((x) => x.value === replacementRequestedItem)?.label ?? "";
  const replacing = intent === "replace_requested_item";

  //  ══ **الملخّصُ يُقرأ، والتفصيلُ يُطوى** ═══════════════════════════════
  //   العقدُ المؤسّسيّ باقٍ كما هو: معاينةٌ ⟶ ختمٌ ⟶ تنفيذُ ذلك الأثر بعينه.
  //   الذي تغيّر أن **ما يُقرأ فعلاً** صار ثلاثةَ أسطر بدل خمسةَ عشر — ولا
  //   شيءَ أُخفي: التفصيلُ كلُّه تحت «تفاصيل ما سيحدث».
  const summaryLines = mode && preview ? [
    ...(preview.summary[mode] ?? []),
    ...(replacing && replacementLabel ? [replacementSummaryLine(replacementLabel)] : []),
  ] : [];
  const lines = mode && preview ? [
    ...(preview.impact[mode] ?? []),
    ...(replacing ? preview.replacementImpact : []),
    ...(replacing && replacementLabel ? [replacementSummaryLine(replacementLabel)] : []),
  ] : [];
  //  **السؤالُ يُطرح بالقاعدة المشتركة** — لا بشرطٍ مكتوبٍ هنا ينحرف عنها.
  const refundRequired = refundQuestionRequired({ mode, paidAmount: preview?.paidAmount });
  const unrefundedRequired = unrefundedChoiceRequired({
    mode, paidAmount: preview?.paidAmount, refundAnswer,
  });
  const canRun = Boolean(intent) && reasonNote.trim().length > 0
    && (!replacing || Boolean(replacementRequestedItem))
    && (!refundRequired || Boolean(refundAnswer))
    //  **وفرعُ «لا» لا يُتجاوَز بالسكوت**: «تراجع» يُغلق النافذة، فلا يبقى
    //  ما يفتح التأكيدَ إلّا «أمضِ وسوِّ لاحقاً» صراحةً.
    && (!unrefundedRequired || unrefundedChoice === "proceed")
    && !run.isPending && !preview?.alreadyReversed;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="h-5 w-5" />
            تصحيح / إلغاء العملية
          </DialogTitle>
          <DialogDescription className="text-right">
            لا يُحذف شيء من السجل. تُعكَس آثار العملية الخاطئة وتبقى جميع
            السجلات مقروءة في التاريخ، مع تسجيل من صحّح ومتى ولماذا.
          </DialogDescription>
        </DialogHeader>

        {isLoading && <p className="text-sm text-muted-foreground">جارٍ قراءة أثر التصحيح…</p>}
        {error && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {(error as any)?.message}
          </p>
        )}

        {preview?.alreadyReversed && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
            data-testid="text-already-reversed">
            هذه العملية ملغاة إدارياً بالفعل.
          </p>
        )}

        {preview && !preview.alreadyReversed && (
          <div className="space-y-4">
            {/* ما هي العمليةُ المقصودة — فلا يُصحَّح غيرُ المقصود. */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1"
              data-testid="box-operation-summary">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الحالة الآن:</span>
                <b>{preview.currentStatusText}</b>
              </div>
              {preview.requestedItemLabel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المطلوب:</span>
                  <b>{preview.requestedItemLabel}</b>
                </div>
              )}
              {preview.workOrderId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">أمر التصنيع:</span>
                  <b>#{preview.workOrderId}</b>
                </div>
              )}
              {preview.saleAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الكلفة المسجلة:</span>
                  <b>{preview.saleAmount.toLocaleString("en-US")} د.ع</b>
                </div>
              )}
            </div>

            {/* الموظف يصف المقصود، والخادم يختار آلية العكس الآمنة. */}
            <div className="space-y-2">
              <Label className="font-semibold">ما الذي تريد تصحيحه؟ *</Label>
              <div className="space-y-2">
                {preview.availableIntents.map((choice) => (
                  <button
                    key={choice}
                    type="button"
                    onClick={() => setIntent(choice)}
                    data-testid={`option-intent-${choice}`}
                    className={`w-full rounded-lg border p-3 text-right transition ${
                      intent === choice ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
                  >
                    <div className="font-semibold">{CORRECTION_INTENT_LABELS[choice]}</div>
                    {/*  **وما يقع يُقال تحت الخيار لا بعد التأكيد.** */}
                    <div className="text-xs text-muted-foreground">
                      {CORRECTION_INTENT_EFFECTS[choice]}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {replacing && (
              <div className="space-y-2">
                <Label className="font-semibold">الطلب الصحيح *</Label>
                <Select value={replacementRequestedItem} onValueChange={setReplacementRequestedItem}>
                  <SelectTrigger data-testid="select-replacement-item">
                    <SelectValue placeholder="اختر الجهاز أو الجزء" />
                  </SelectTrigger>
                  <SelectContent>
                    {/*  **القائمةُ من الخادم** — هو مَن يعرف ما طُلب وما يقبله. */}
                    {preview.replacementOptions.map((x) => (
                      <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  يُفتح طلبٌ جديد بكلفة صفر بانتظار المعاينة. ولا يُنسخ إليه سعرٌ
                  ولا خبيرٌ ولا معاينةٌ ولا دفعةٌ من العملية الملغاة.
                </p>
              </div>
            )}

            {/*  ══ ③ **الملخّصُ يُقرأ قبل التأكيد** — والتفصيلُ تحته يُطوى ══
                لا شيءَ أُخفي: كلُّ سطرٍ في التفصيل موجود، والمعروضُ فوقه هو
                ما يقرؤه المسؤولُ فعلاً في ثانيتين. والاثنان من الخادم. */}
            {mode && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="text-sm font-semibold text-amber-900">سيتم:</div>
                <ul className="space-y-1 text-sm" data-testid="box-reversal-summary">
                  {summaryLines.map((l, i) => (
                    <li key={i} className={`flex items-start gap-2 ${
                      l.kind === "warn" ? "text-amber-900 font-medium" : "text-foreground"}`}>
                      {l.kind === "warn"
                        ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        : <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />}
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
                <details data-testid="box-reversal-impact">
                  <summary className="cursor-pointer text-xs font-semibold text-amber-900">
                    تفاصيل ما سيحدث
                  </summary>
                  <ul className="mt-2 space-y-1 text-sm">
                    {lines.map((l, i) => (
                      <li key={i} className={`flex items-start gap-2 ${
                        l.kind === "warn" ? "text-amber-900 font-medium" : "text-foreground"}`}>
                        {l.kind === "warn"
                          ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                          : <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />}
                        <span>{l.text}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}

            {/*  ══ **سؤالُ إرجاع المبلغ — إلزاميّ، وبعد الملخّص عمداً** ══════
                الملخّصُ قال للتوّ إن الدفعةَ تبقى وللمريض رصيد؛ فيُسأل هنا
                عمّا جرى فعلاً بذلك المبلغ. **ولا يُرسَل بعد ولا يغيّر ديناراً
                ولا تنفيذَ الإلغاء** — هذه المرحلةُ تسأل وتُلزِم فقط. */}
            {refundRequired && (
              <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3"
                data-testid="box-refund-question">
                <Label className="font-semibold text-sky-900">
                  {REFUND_QUESTION_LABEL} *
                </Label>
                <div className="flex gap-2">
                  {REFUND_ANSWERS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      //  **وتبديلُ الجواب يُسقط فرعَه**: قرارٌ اتُّخذ عن
                      //  «لا» لا يُحمَل على «لا» ثانيةٍ بعد مرورٍ بـ«نعم».
                      onClick={() => { setRefundAnswer(a); setUnrefundedChoice(""); }}
                      data-testid={`option-refund-${a}`}
                      className={`flex-1 rounded-lg border p-2 text-center font-semibold transition ${
                        refundAnswer === a ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                    >
                      {REFUND_ANSWER_LABELS[a]}
                    </button>
                  ))}
                </div>

                {/*  ══ **فرعُ «لا» — خياران، والثاني امتناعٌ لا تنفيذ** ═════
                    «أمضِ وسوِّ لاحقاً» يفتح التأكيدَ ولا يفعل شيئاً بنفسه؛
                    و«التراجع عن الإلغاء» **يُغلق النافذة** — وهو معنى الخيار
                    حرفياً: لا يُنفَّذ شيء. **ولا نداءَ ولا دينارَ في أيٍّ
                    منهما**، ولا يُرسَل الجوابُ إلى الخادم. */}
                {unrefundedRequired && (
                  <div className="space-y-2 border-t border-sky-200 pt-2"
                    data-testid="box-unrefunded-choice">
                    <Label className="font-semibold text-sky-900">
                      {UNREFUNDED_CHOICE_LABEL} *
                    </Label>
                    <div className="space-y-2">
                      {UNREFUNDED_CHOICES.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setUnrefundedChoice(c);
                            if (c === "abort") onOpenChange(false);
                          }}
                          data-testid={`option-unrefunded-${c}`}
                          className={`w-full rounded-lg border p-2 text-right font-semibold transition ${
                            unrefundedChoice === c ? "border-primary bg-primary/10" : "hover:bg-muted/50"}`}
                        >
                          {UNREFUNDED_CHOICE_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ④ السبب — إلزاميّ */}
            <div className="space-y-2">
              <Label htmlFor="reversal-note" className="font-semibold">سبب التصحيح *</Label>
              <Textarea
                id="reversal-note"
                rows={2}
                placeholder="مثال: تم تسجيل الشراء قبل إكمال المسار الصحيح"
                value={reasonNote}
                onChange={(e) => setReasonNote(e.target.value)}
                data-testid="input-reversal-note"
              />
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={run.isPending}>
            إلغاء
          </Button>
          <Button
            onClick={() => run.mutate()}
            disabled={!canRun}
            data-testid="button-confirm-reversal"
          >
            {run.isPending ? "جارٍ التصحيح…" : "تأكيد التصحيح"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
