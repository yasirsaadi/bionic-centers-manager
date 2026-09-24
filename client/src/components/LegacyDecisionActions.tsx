// «اشترى» / «لم يشترِ» — الكتلةُ التفاعلية للمسار **الموروث** (متابعةٌ بلا
// حلقة `service_path='exam'`: يتيمةٌ بلا حلقةٍ إطلاقاً، أو حلقةٌ من ما قبل
// ترحيل ٠٦٥)، مُستخلَصةً حرفياً من `PostExamDecisionCard.tsx`.
//
// ══ لماذا مكوّنٌ مستقلّ — لا نسخةٌ ثانية (نفسُ سبب `ExamPathDecisionActions`)
// ═══════════════════════════════════════════════════════════════════════
// كانت هذه الكتلةُ حيّةً في مكانٍ واحد فقط (بطاقة «قرار المريض بعد
// المعاينة» في صفحة المريض). وطابورُ «بانتظار الحسم» كان يُظهر صفّاً يتيماً
// بـ«فتح الملف» وحدها — بلا قرارِ شراءٍ مباشر، رغم أن ملفّ المريض يعرض
// «اشترى»/«لم يشترِ» له تماماً. فصار الفعلُ التفاعليّ نفسَه بالضبط
// **مكوّناً واحداً يستهلكه الطرفان**: نفسُ البابين `/confirm-purchase`
// و`/close`، نفسُ `allowedActions` الحارسة، نفسُ حساب الفجوات
// (`purchaseGaps`)، نفسُ حارس الإرسال (`purchaseBlocked`)، نفسُ جسم الطلب
// (`purchaseBody`) — بلا نسختين تنحرفان يوماً.
//
// ══ ومعهما «إلغاء الحسم» — وحدَه من خارج `actions` ══════════════════════
// نفسُ الزرّ ونفسُ النافذة ونفسُ النقطة `/api/followups/:id/cancel-decision`
// التي في `ExamPathDecisionActions` بحرفها. سلطتُه أضيقُ (مسؤولٌ أو مديرُ
// فرع) والخادمُ يقولها في `mayCancelDecision` — فليست فعلاً في `actions`.
//
// ══ عمداً بلا الأفعال الأخرى ═══════════════════════════════════════════
// تأجيل · تحديد السعر النهائي · اختيار الخبير المستقلّ · إعادة الفتح ·
// اعتمادُ/رفضُ طلب سعرٍ قديم — هذه تبقى حصراً في `PostExamDecisionCard.tsx`.
// طابورُ «بانتظار الحسم» يحتاج قرارَ الشراء نفسَه لا غير، وعرضُ أدواتِ
// إدارة ملفٍّ كاملة فيه كان يُغرق شاشةً صُمِّمت للحسم السريع.
//
// **ولا حقيقةً ماليةً جديدة هنا**: هذا المكوّنُ لا يكتب شيئاً بنفسه — ينادي
// البابين القانونيَّين القائمين حرفياً كما كانت البطاقةُ تنادِيهما.
//
// **ولا وعاءَ تخطيطٍ خاصّاً بها**: الأزرارُ عناصرُ مستقلّة (لا `<div>` ملفوف
// حولها) فيضعها المُستدعي داخل صفّ أزراره الخاصّ — بطاقةُ المريض تضعها بين
// أزرارها القائمة، وطابورُ الحسم يضعها في صفٍّ مستقلّ.

import { useState } from "react";
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
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  ServiceDiscountFields, EMPTY_DISCOUNT, type DiscountDraft,
} from "@/components/ServiceDiscountFields";
import {
  purchaseGaps, purchaseOriginalPrice, purchaseBlocked, purchaseBody,
  purchaseSubmitLabel, type PurchaseFollowupLike,
} from "@/components/purchase_dialog_ui";
import {
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, type FollowupReason,
} from "@shared/followup";
import {
  fetchSaleExperts, saleExpertsQueryKey, spansSeveralBranches, saleExpertLabel,
  NO_SALE_EXPERTS, type SaleExpert,
} from "@/components/sale_experts";

export interface LegacyDecisionActionsFollowup extends PurchaseFollowupLike {
  /** اسمُ الخبير المحفوظ للعرض — لا يُشترَط، `#الرقم` يكفي حين يغيب. */
  selectedExpertName?: string | null;
}

export interface LegacyDecisionActionsProps {
  followupId: number;
  patientId: number;
  /**
   * فرعُ **العملية** — للسياق. **وقائمةُ الخبراء لم تعد تُبنى منه**
   * (٢٠٢٦-٠٩-٢٤): تُطلب بالمريض (`sale_experts.ts`)، نفسُ مبدأ
   * `ExamPathDecisionActions`، ويحسم الخادمُ فرعَ البيع من الخبير المختار.
   */
  branchId: number | null;
  /** الأفعالُ المتاحة من الخادم (`allowedActions`) — يُقرَأ منها `confirm_purchase`/`close` فقط؛ أيُّ فعلٍ آخر فيها يُتجاهَل عمداً. */
  actions: string[];
  followup: LegacyDecisionActionsFollowup;
  /**
   * **«إلغاء الحسم» — سلطةٌ إدارية يقولها الخادم** (ترحيل ٠٨١).
   *
   * نفسُ الخاصّية ونفسُ دلالتها في `ExamPathDecisionActions` بحرفها: مسؤولٌ
   * عامّ أو مديرُ فرع، وللصفّ الحيّ وحده. **لا تُشتقّ في الشاشة** — الخادمُ
   * يفحص `canCancelDecision` ونطاقَ الفرع والحالةَ معاً ويرسل الجواب،
   * فلا يظهر زرٌّ سيردّه ٤٠٣ أو ٤٠٩. غيابُها يُقرأ «لا».
   *
   * ══ ولماذا هنا أيضاً — الفجوةُ التي أُغلقت ═══════════════════════════
   * الخادمُ يرسلها **لكلّ صفٍّ حيّ** من نقطتَي البطاقة والطابور معاً
   * (`server/followup/routes.ts`) بصرف النظر عن المسار، لكنّ الشاشتين
   * كانتا ترسمانها في `ExamPathDecisionActions` وحدها — وتلك لا تُركَّب
   * إلّا حين `examPath === true`. فصفٌّ موروثٌ (يتيمٌ أو حلقةٌ من ما قبل
   * ٠٦٥) كان يحمل الصلاحيةَ ولا يجد زرّاً — **وهو بعينه شكلُ الصفوف التي
   * وُضع البابُ لأجلها**. فصار للمكوّن الموروث الزرُّ نفسُه بالسلوك نفسِه.
   */
  mayCancelDecision?: boolean;
  /** يُنادى بعد نجاح أيّ فعل — إضافةً على إبطال المفاتيح المشتركة أدناه. */
  onResolved?: () => void;
}

export function LegacyDecisionActions({
  followupId, patientId, actions, followup,
  mayCancelDecision = false, onResolved,
}: LegacyDecisionActionsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] =
    useState<"confirm_purchase" | "close" | "cancel_decision" | null>(null);
  const [firstPrice, setFirstPrice] = useState(0);
  const [expertId, setExpertId] = useState("");
  const [discount, setDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const [reason, setReason] = useState<FollowupReason>("needs_time");
  const [note, setNote] = useState("");
  //  سببُ إلغاء الحسم — **نصٌّ حرٌّ إلزاميّ**، منفصلٌ عن سبب «لم يشترِ»:
  //  ذاك يقوله المريضُ وهذا يقوله المدير، وخلطُهما في حقلٍ واحد يخلط
  //  واقعتين في السجلّ. (نفسُ تعليل `ExamPathDecisionActions` حرفياً.)
  const [cancelReason, setCancelReason] = useState("");

  const reset = () => {
    setDialog(null); setFirstPrice(0); setExpertId(""); setDiscount(EMPTY_DISCOUNT);
    setReason("needs_time"); setNote(""); setCancelReason("");
  };

  //  **خبراءُ هذا المريض — لا خبراءُ فرعٍ واحد** (٢٠٢٦-٠٩-٢٤): نفسُ
  //  الاستعلام بنفس المفتاح الذي تستعمله بطاقةُ المريض و«إتمام البيع»، والفشلُ
  //  يُقال في النافذة لا يصير قائمةً فارغةً بصمت (شكوى «زهراء»).
  const { data: experts, error: expertsError } = useQuery<SaleExpert[]>({
    queryKey: saleExpertsQueryKey(patientId),
    queryFn: () => fetchSaleExperts(patientId),
  });
  const showExpertBranches = spansSeveralBranches(experts ?? []);

  //  ══ إبطالٌ مشترك للنجاح وللفشل معاً (نفسُ نمط `ExamPathDecisionActions`) ══
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: [`/api/followups/patient/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/followups"] });
    qc.invalidateQueries({ queryKey: ["/api/followups/approvals"] });
    qc.invalidateQueries({ queryKey: [`/api/patients/${patientId}`] });
    qc.invalidateQueries({ queryKey: ["/api/discounts"] });
    qc.invalidateQueries({ queryKey: [`/api/discounts/patient/${patientId}`] });
    //  طابورُ «بانتظار الحسم» وشارتُه — البطاقةُ القديمة والطابورُ الجديد
    //  يشتركان في هذا الإبطال حرفياً.
    qc.invalidateQueries({ queryKey: ["/api/followups/decision-queue"] });
  };

  const act = useMutation({
    mutationFn: async ({ path, body }: { path: string; body: any }) => {
      const res = await apiRequest("POST", path, body);
      return res.json();
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "تمّ الحفظ" });
      reset();
      onResolved?.();
    },
    onError: (err: any) => {
      toast({
        title: "تعذّر الحفظ",
        description: err?.message ?? "حاول مرة أخرى",
        variant: "destructive",
      });
      //  تعارضٌ (٤٠٩) أو أيّ خطأٍ آخر ⟶ الحالةُ المرجعيّة تُحدَّث دائماً —
      //  نفسُ تصحيح `ExamPathDecisionActions` اللاحق.
      invalidateAll();
    },
  });
  const busy = act.isPending;
  const submit = (path: string, body: any) => act.mutate({ path, body });

  const { needsFirstPrice, needsExpert } = purchaseGaps(followup);
  const originalPrice = purchaseOriginalPrice(followup, firstPrice);

  return (
    <>
      {actions.includes("confirm_purchase") && (
        <Button size="sm" disabled={busy}
          onClick={() => setDialog("confirm_purchase")}
          data-testid="button-legacy-confirm-purchase">
          <HandCoins className="h-4 w-4" /> اشترى
        </Button>
      )}
      {actions.includes("close") && (
        <Button size="sm" variant="outline" disabled={busy}
          onClick={() => { setReason("needs_time"); setNote(""); setDialog("close"); }}
          data-testid="button-legacy-close-followup">
          <XCircle className="h-4 w-4" /> لم يشترِ
        </Button>
      )}
      {/*  ══ **«إلغاء الحسم» — خارجَ `actions` عمداً** (ترحيل ٠٨١) ═══════════
          نفسُ قاعدة `ExamPathDecisionActions` بحرفها: سلطتُه أضيقُ (مسؤولٌ
          أو مديرُ فرع) ولا تحرسها مالكيةُ حقلٍ تجاريّ، فلا يُطوى في مصفوفة
          أفعال البيع. ويظهر **ولو كانت `actions` فارغةً تماماً** — ومديرُ
          فرعٍ أمام صفٍّ موروثٍ في `price_approval_pending` هو بالضبط هذه
          الحالة: `allowedActions` تُرجع له `[]` (اعتمادُ السعر القديم ليس
          له)، وهو مع ذلك يملك إخراجَ الصفّ من الطابور.
          **ولا وعاءَ تخطيطٍ هنا** — عنصرٌ مستقلّ كبقيّة أزرار هذا المكوّن
          (رأسُ الملفّ)، فيضعه المُستدعي في صفّ أزراره كما يضع أخويه. */}
      {mayCancelDecision && (
        <Button size="sm" variant="ghost" disabled={busy}
          className="text-muted-foreground hover:text-destructive"
          onClick={() => { setCancelReason(""); setDialog("cancel_decision"); }}
          data-testid="button-cancel-decision">
          <Ban className="h-4 w-4" /> إلغاء الحسم
        </Button>
      )}

      {/* ── تأكيد الشراء — نافذةٌ واحدة تسأل عمّا ينقص فقط ── */}
      <Dialog open={dialog === "confirm_purchase"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>اشترى</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {needsFirstPrice || needsExpert
                ? <>ينقص لإتمام البيع: {[
                  needsFirstPrice ? "السعر الأصلي" : null,
                  needsExpert ? "الخبير المسؤول" : null,
                ].filter(Boolean).join(" و")}.</>
                : <>السعر المعتمد: <b>{(followup.approvedPrice ?? 0).toLocaleString()} د.ع</b>.</>}
              {" "}يُفتح أمر التصنيع وتُقيَّد الكلفة على حساب المريض في الحال.
            </p>

            {needsFirstPrice && (
              <div className="space-y-1" data-testid="legacy-first-price-block">
                <Label className="text-sm font-semibold">
                  السعر الأصلي <span className="text-destructive">*</span>
                </Label>
                <MoneyInput value={firstPrice} onValueChange={setFirstPrice}
                  placeholder="0" data-testid="input-legacy-first-price" />
                <p className="text-xs text-muted-foreground">
                  لم يحدّد الطبيب كلفة الجهاز في المعاينة — أدخل السعر الطبيعي.
                  <b> لا يحتاج اعتماداً</b>؛ الاعتماد للخصم وحده.
                </p>
              </div>
            )}

            {needsExpert ? (
              <div className="space-y-1" data-testid="legacy-purchase-expert-block">
                <Label className="text-sm font-semibold">
                  الخبير المسؤول <span className="text-destructive">*</span>
                </Label>
                <Select value={expertId} onValueChange={setExpertId}>
                  <SelectTrigger data-testid="select-legacy-purchase-expert">
                    <SelectValue placeholder={(experts ?? []).length
                      ? "اختر الخبير" : NO_SALE_EXPERTS} />
                  </SelectTrigger>
                  <SelectContent>
                    {(experts ?? []).map((e) => (
                      <SelectItem key={e.id} value={String(e.id)}>
                        {saleExpertLabel(e, showExpertBranches)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {expertsError && (
                  <p className="text-xs text-destructive" data-testid="text-legacy-purchase-experts-error">
                    {(expertsError as Error).message}
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm"
                data-testid="text-legacy-purchase-expert">
                <span className="text-muted-foreground">الخبير المسؤول: </span>
                <b>{followup.selectedExpertName ?? `#${followup.selectedExpertUserId}`}</b>
              </div>
            )}

            {/*  والخصمُ يُطبَّق فوراً كالسعر الكامل تماماً — مَن يصل هذه
                النافذةَ اجتاز `canConfirmPurchase` بالفعل.

                ══ **وحقولُ البيع كلُّها حاضرةٌ من فتحِ النافذة** (٢٠٢٦-٠٩-١٥)
                كان الشرطُ `originalPrice > 0` يُخفي هذه الكتلةَ حتى يكتب
                الموظّفُ السعرَ، فيرى نافذةً ناقصةً ولا يعرف أن فيها خصماً
                ومجّانيّةً أصلاً — **ونافذةُ المسار الحديث ترسم حقولَها
                كلَّها دفعةً واحدة** ولا تُخفي شيئاً خلف إدخالٍ سابق.
                فصارت تُرسَم دائماً، **والسعرُ المرجعيُّ يتبع ما يُكتب
                أعلاه حيّاً** (`purchaseOriginalPrice` تُحسَب في كلّ رسم).

                **ولا حرفَ تغيّر في المال**: `hasDiscount(EMPTY_DISCOUNT, 0)`
                تساوي `false` فالكتلةُ خاملةٌ تماماً قبل السعر — لا ملخّصَ
                ولا سببَ ولا حمولة؛ و`purchaseBlocked` تعطّل الإرسالَ عند
                `!(original > 0)` **كما كانت بحرفها**، فلا زرٌّ يُفتَح قبل
                أوانه ولا حمولةٌ تتغيّر. */}
            <ServiceDiscountFields originalPrice={originalPrice}
              value={discount} onChange={setDiscount} testIdPrefix="legacy-purchase-discount" />
          </div>
          <DialogFooter>
            <Button
              disabled={purchaseBlocked({ followup, firstPrice, expertId, discount, busy })}
              data-testid="button-legacy-confirm-purchase-submit"
              onClick={() => submit(`/api/followups/${followupId}/confirm-purchase`,
                purchaseBody({ followup, firstPrice, expertId, discount }))}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" />
                : purchaseSubmitLabel({ followup, firstPrice, discount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── إغلاق بدون شراء — سببٌ منظَّم لا نصٌّ حرّ (نفسُ قائمة الأسباب القائمة) ── */}
      <Dialog open={dialog === "close"} onOpenChange={(o) => !o && reset()}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>إغلاق بدون شراء</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>السبب</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as FollowupReason)}>
                <SelectTrigger data-testid="select-legacy-close-reason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FOLLOWUP_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>{FOLLOWUP_REASON_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ملاحظة (اختياري)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-legacy-close-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy} data-testid="button-legacy-close-submit"
              onClick={() => submit(`/api/followups/${followupId}/close`,
                { reason, note: note || undefined })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*  ══ **نافذةُ إلغاء الحسم — تأكيدٌ وسببٌ إلزاميّ** ═══════════════
          مطابقةٌ حرفياً لنافذة `ExamPathDecisionActions`: **نفسُ النقطة
          القائمة** `/api/followups/:id/cancel-decision`، ونفسُ جسم الطلب
          (`{ reason }` مقلَّمٌ)، ونفسُ حارس الإرسال (`!cancelReason.trim()`)،
          ونفسُ معالجة النجاح والخطأ والإبطال (`act` أعلاه بحرفها).
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
            <Label htmlFor="l-cancel-reason" className="text-xs">
              سبب الإلغاء <span className="text-destructive">*</span>
            </Label>
            <Textarea id="l-cancel-reason" value={cancelReason}
              onChange={(e: any) => setCancelReason(e.target.value)}
              placeholder="لماذا لا ينبغي أن تكون هذه المتابعة في الطابور؟"
              className="bg-white min-h-[70px]" data-testid="input-cancel-decision-reason" />
            <p className="text-xs text-muted-foreground">
              يُسجَّل السببُ ومَن نفّذ ووقتُ التنفيذ في سجلّ التدقيق.
            </p>
          </div>
          <DialogFooter>
            <Button variant="destructive" disabled={busy || !cancelReason.trim()}
              data-testid="button-save-cancel-decision"
              onClick={() => submit(`/api/followups/${followupId}/cancel-decision`,
                { reason: cancelReason.trim() })}>
              تأكيد إلغاء الحسم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
