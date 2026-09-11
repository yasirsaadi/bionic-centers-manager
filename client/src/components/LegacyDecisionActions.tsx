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
import { XCircle, Loader2, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

export interface LegacyDecisionActionsFollowup extends PurchaseFollowupLike {
  /** اسمُ الخبير المحفوظ للعرض — لا يُشترَط، `#الرقم` يكفي حين يغيب. */
  selectedExpertName?: string | null;
}

export interface LegacyDecisionActionsProps {
  followupId: number;
  patientId: number;
  /** فرعُ **العملية** — لقائمة الخبراء، لا فرعُ جلسة الفاعل (نفسُ مبدأ `ExamPathDecisionActions`). */
  branchId: number | null;
  /** الأفعالُ المتاحة من الخادم (`allowedActions`) — يُقرَأ منها `confirm_purchase`/`close` فقط؛ أيُّ فعلٍ آخر فيها يُتجاهَل عمداً. */
  actions: string[];
  followup: LegacyDecisionActionsFollowup;
  /** يُنادى بعد نجاح أيّ فعل — إضافةً على إبطال المفاتيح المشتركة أدناه. */
  onResolved?: () => void;
}

export function LegacyDecisionActions({
  followupId, patientId, branchId, actions, followup, onResolved,
}: LegacyDecisionActionsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"confirm_purchase" | "close" | null>(null);
  const [firstPrice, setFirstPrice] = useState(0);
  const [expertId, setExpertId] = useState("");
  const [discount, setDiscount] = useState<DiscountDraft>(EMPTY_DISCOUNT);
  const [reason, setReason] = useState<FollowupReason>("needs_time");
  const [note, setNote] = useState("");

  const reset = () => {
    setDialog(null); setFirstPrice(0); setExpertId(""); setDiscount(EMPTY_DISCOUNT);
    setReason("needs_time"); setNote("");
  };

  //  نفسُ استعلام الخبراء بنفس المفتاح والفرع الذي تستعمله بطاقةُ المريض —
  //  فرعُ العملية لا فرعُ جلسة الفاعل.
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
                data-testid="text-legacy-purchase-expert">
                <span className="text-muted-foreground">الخبير المسؤول: </span>
                <b>{followup.selectedExpertName ?? `#${followup.selectedExpertUserId}`}</b>
              </div>
            )}

            {/*  والخصمُ يُطبَّق فوراً كالسعر الكامل تماماً — مَن يصل هذه
                النافذةَ اجتاز `canConfirmPurchase` بالفعل. */}
            {originalPrice > 0 && (
              <ServiceDiscountFields originalPrice={originalPrice}
                value={discount} onChange={setDiscount} testIdPrefix="legacy-purchase-discount" />
            )}
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
    </>
  );
}
