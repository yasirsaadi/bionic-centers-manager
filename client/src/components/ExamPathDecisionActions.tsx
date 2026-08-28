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
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/ui/money-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { deriveOfferFromDiscount, examPathBlockedMessage } from "@shared/commercial";

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
  followupId, patientId, branchId, actions, examNotes, statusLine, prefill, onResolved,
}: ExamPathDecisionActionsProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<"complete_sale" | "not_bought" | null>(null);
  const [cOriginal, setCOriginal] = useState("");
  const [cDiscount, setCDiscount] = useState("");
  const [cExpert, setCExpert] = useState("");
  const [cReason, setCReason] = useState("");
  const [note, setNote] = useState("");

  const reset = () => {
    setDialog(null); setCOriginal(""); setCDiscount(""); setCExpert("");
    setCReason(""); setNote("");
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
  const submit = (path: string, body: any) => act.mutate({ path, body });

  const csOffer = deriveOfferFromDiscount({
    originalPrice: cOriginal === "" ? null : Number(cOriginal),
    discountAmount: cDiscount === "" ? 0 : Number(cDiscount),
  });

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
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>إتمام البيع</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
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
            </div>
            <div className="space-y-1">
              <Label htmlFor="cs-original" className="text-xs">السعر الأصلي (د.ع)</Label>
              <MoneyInput id="cs-original" allowEmpty value={cOriginal}
                onValueChange={(v) => setCOriginal(v === null ? "" : String(v))}
                className="bg-white" data-testid="input-complete-sale-original" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="cs-discount" className="text-xs">مقدار الخصم (د.ع)</Label>
              <MoneyInput id="cs-discount" allowEmpty value={cDiscount}
                onValueChange={(v) => setCDiscount(v === null ? "" : String(v))}
                className="bg-white" data-testid="input-complete-sale-discount" />
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
            <div className="space-y-1">
              <Label htmlFor="cs-note" className="text-xs">ملاحظة (اختياري)</Label>
              <Input id="cs-note" value={note} onChange={(e) => setNote(e.target.value)}
                data-testid="input-complete-sale-note" />
            </div>
          </div>
          <DialogFooter>
            <Button disabled={busy || !cExpert || !csOffer.ok}
              data-testid="button-save-complete-sale"
              onClick={() => submit(`/api/followups/${followupId}/complete-sale`, {
                originalPrice: Number(cOriginal),
                discountAmount: cDiscount === "" ? 0 : Number(cDiscount),
                expertUserId: Number(cExpert),
                note: note || undefined,
              })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ البيع وبدء التصنيع"}
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
                { reason: cReason.trim(), note: note || undefined })}>
              تسجيل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
