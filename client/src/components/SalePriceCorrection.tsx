// **«تصحيح سعر البيع» بعد إتمامه** (§4.ge — واقعةُ بيداء كريم محمد، ٢٠٢٦-١١-٠٨).
//
// زرٌّ في شريط «تم الشراء» على بطاقة «قرار المريض بعد المعاينة»، للمسؤول ومدير الفرع (الخادمُ يقول `mayCorrectSalePrice`).
// السعرُ الأصليّ ومقدارُ الخصم كـ«إتمام البيع» نفسِه والنهائيُّ معاينةٌ حيّة بالدالّة التي يعتمدها الخادم (`deriveOfferFromDiscount`)،
// وسببٌ مكتوب إلزاميّ. وأمرُ التصنيع وخبيرُه ومراحلُه باقية — السعرُ وحده يتحرّك، ومعه كلفةُ الجهاز وحسابُ المريض بالفرق.
// والدفعُ الزائد لا يمنع (قرارُ المالك): بعد الحفظ يُقال «رصيدٌ للمريض» ويُدلّ على «طلب استرجاع».

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { invalidatePatientData } from "@/lib/queryClient";
import { deriveOfferFromDiscount } from "@shared/commercial";
import { formatDateIraq } from "@/lib/utils";

export interface SaleCostDriftEntry { id: number; amount: number; source: string; createdAt: string; notes: string | null }
export interface SaleCostDrift { net: number; entries: SaleCostDriftEntry[] }
const DRIFT_SOURCE_LABEL: Record<string, string> = {
  case_cost_edit: "قلم الكلفة",
  refund_cost_reduction: "تخفيضٌ مع استرجاع",
};
const signed = (n: number) => `${n > 0 ? "+" : "−"}${Math.abs(n).toLocaleString()} د.ع`;

export function SalePriceCorrection(props: {
  followupId: number;
  patientId: number;
  originalPrice: number | null;
  approvedPrice: number;
  /** **قلمُ كلفة الحالة يفتح النافذةَ نفسَها** (§4.gh): بلا زرّ، ويُفتح من الخارج. */
  hideTrigger?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** اسمُ الجهاز في العنوان حين يُفتح من قلم الحالة (لحالةٍ فيها أكثرُ من جهاز). */
  deviceLabel?: string | null;
  /** **ما انحرفت به كلفةُ القسم بعد البيع** (§4.gh) — يقوله الخادم، فتعرضه النافذةُ من أوّل فتحها وتطويه بموافقة. */
  drift?: SaleCostDrift | null;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [openSelf, setOpenSelf] = useState(false);
  const controlled = props.open !== undefined;
  const open = controlled ? props.open === true : openSelf;
  const [original, setOriginal] = useState("");
  const [discount, setDiscount] = useState("");
  const [reason, setReason] = useState("");
  //  **ما عُدّل في كلفة القسم بعد البيع يُطوى بموافقةٍ صريحة** (§4.gh): الخادمُ يقول صافيه وقيودَه، والحفظُ يرسل الصافي بعينه.
  const [absorb, setAbsorb] = useState<number | null>(null);
  const [absorbEntries, setAbsorbEntries] = useState<SaleCostDriftEntry[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);

  const reset = () => {
    const orig = props.originalPrice ?? props.approvedPrice;
    setOriginal(String(orig));
    setDiscount(String(Math.max(0, orig - props.approvedPrice)));
    setReason("");
    const net = Number(props.drift?.net ?? 0);
    setAbsorb(net !== 0 ? net : null);
    setAbsorbEntries(net !== 0 ? props.drift?.entries ?? [] : []);
    setServerError(null);
  };
  const setOpen = (v: boolean) => {
    if (v) reset();
    if (controlled) props.onOpenChange?.(v); else setOpenSelf(v);
  };
  const openDialog = () => setOpen(true);
  //  المفتوحُ من الخارج يبدأ بقيمه الحالية كلَّ مرّة.
  const [lastOpen, setLastOpen] = useState(false);
  if (controlled && open !== lastOpen) {
    setLastOpen(open);
    if (open) reset();
  }

  const offer = deriveOfferFromDiscount({
    originalPrice: original === "" ? NaN : Number(original),
    discountAmount: discount === "" ? 0 : Number(discount),
  });
  const finalPrice = offer.ok ? offer.finalPrice : null;
  const delta = finalPrice === null ? null : finalPrice - props.approvedPrice;
  const unchanged = offer.ok && finalPrice === props.approvedPrice
    && offer.originalPrice === (props.originalPrice ?? props.approvedPrice);

  const save = useMutation({
    mutationFn: async () => {
      //  **الرسالةُ مقروءةً لا «409: {…}»** — والرمزُ يفتح سؤالَ الطيّ داخل النافذة.
      const res = await fetch(`/api/followups/${props.followupId}/correct-sale-price`, {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({
          originalPrice: Number(original),
          discountAmount: discount === "" ? 0 : Number(discount),
          reason: reason.trim(),
          ...(absorb !== null ? { absorbCaseCostEdit: absorb } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(body?.error ?? body?.message ?? "تعذّر الحفظ");
        err.body = body;
        throw err;
      }
      return body;
    },
    onSuccess: async (out: any) => {
      //  **تُغلق النافذةُ بعد أن تصل الأرقامُ الجديدة** (المراجعةُ الثانية): فتحُها ثانيةً قبل ذلك كان يعرض الانحرافَ المطويَّ والسعرَ القديم.
      await Promise.all([
        qc.invalidateQueries({ queryKey: [`/api/followups/patient/${props.patientId}`] }),
        qc.invalidateQueries({ queryKey: [`/api/patients/${props.patientId}/device-episodes`] }),
        qc.invalidateQueries({ queryKey: ["/api/patients/:id", props.patientId, "cases"] }),
      ]).catch(() => {});
      invalidatePatientData(qc, props.patientId);
      setOpen(false);
      const credit = Number(out?.creditBalance ?? 0);
      toast({
        title: "صُحّح سعر البيع",
        description: credit > 0
          ? `دفع المريض على هذا الجهاز أكثر من سعره الجديد بـ ${credit.toLocaleString()} د.ع — صار رصيداً له. لإرجاعه استعمل «طلب استرجاع» من حالة المريض.`
          : Number(out?.delta ?? 0) === 0
            ? "طابقت كلفةُ القسم سعرَ البيع، وبقي أمر التصنيع كما هو."
            : "حُدّثت كلفة الجهاز وحساب المريض، وبقي أمر التصنيع كما هو.",
      });
    },
    onError: (e: any) => {
      if (e?.body?.code === "case_cost_edit_absorb" && Number.isFinite(Number(e.body.caseCostEditAmount))) {
        setAbsorb(Number(e.body.caseCostEditAmount));
        setAbsorbEntries(Array.isArray(e.body.entries) ? e.body.entries : []);
        setServerError(null);
        return;
      }
      setServerError(String(e?.message ?? e));
      toast({ title: "لم يُصحَّح السعر", description: String(e?.message ?? e), variant: "destructive" });
    },
  });

  //  **وسعرٌ لم يتغيّر يُحفظ حين على القسم ما يُطوى** — «مطابقةُ الكلفة لسعر البيع» (مراجعةٌ مستقلّة: كان لا بابَ لها).
  const canSave = offer.ok && (!unchanged || absorb !== null) && reason.trim().length > 0 && !save.isPending;
  const clearError = () => setServerError(null);

  return (
    <>
      {!props.hideTrigger && (
        <Button type="button" size="sm" variant="outline" className="h-7 gap-1 bg-white text-xs"
          onClick={openDialog} data-testid="button-correct-sale-price">
          <PencilLine className="h-3.5 w-3.5" /> تصحيح سعر البيع
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-correct-sale-price">
          <DialogHeader>
            <DialogTitle>تصحيح سعر البيع{props.deviceLabel ? ` — ${props.deviceLabel}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              السعر المسجَّل الآن: <b className="text-foreground">{props.approvedPrice.toLocaleString()} د.ع</b>.
              أمرُ التصنيع وخبيرُه يبقيان كما هما — السعر وحده يتغيّر، ومعه كلفة الجهاز وحساب المريض.
            </p>
            <div className="space-y-1">
              <Label htmlFor="sp-original" className="text-xs">السعر الأصلي (د.ع)</Label>
              <MoneyInput id="sp-original" allowEmpty value={original}
                onValueChange={(v) => { clearError(); setOriginal(v === null ? "" : String(v)); }}
                data-testid="input-correct-sale-original" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-discount" className="text-xs">مقدار الخصم (د.ع)</Label>
              <MoneyInput id="sp-discount" allowEmpty value={discount}
                onValueChange={(v) => { clearError(); setDiscount(v === null ? "" : String(v)); }}
                data-testid="input-correct-sale-discount" />
            </div>
            <div className="rounded-md bg-muted px-3 py-2 text-xs" data-testid="text-correct-sale-preview">
              {offer.ok && finalPrice !== null ? (
                <>
                  السعر النهائي: <b>{offer.kind === "free" ? "مجاني (٠ د.ع)" : `${finalPrice.toLocaleString()} د.ع`}</b>
                  {delta !== null && delta !== 0 && (
                    <> — الفرق: <b className={delta < 0 ? "text-green-700" : "text-red-700"}>
                      {delta > 0 ? "+" : "−"}{Math.abs(delta).toLocaleString()} د.ع</b></>
                  )}
                  {unchanged && <> — هو السعر المسجَّل نفسُه</>}
                </>
              ) : (
                <span className="text-red-700">{offer.error ?? "أدخل السعر الأصلي"}</span>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-reason" className="text-xs">سبب التصحيح (إلزامي)</Label>
              <Textarea id="sp-reason" rows={2} value={reason} onChange={(e) => { clearError(); setReason(e.target.value); }}
                placeholder="مثال: سُجّل السعر خطأً عند إتمام البيع"
                data-testid="input-correct-sale-reason" />
            </div>
            {absorb !== null && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900"
                data-testid="text-correct-sale-absorb">
                <div>
                  عُدّلت كلفةُ هذا القسم بعد البيع بصافي <b>{signed(absorb)}</b> دون أن يتغيّر سعرُ البيع.
                  عند الحفظ يُلغى ذلك ويحلّ محلَّه هذا التصحيح، فتصير الكلفةُ مطابقةً لسعر البيع. والدفعاتُ لا تُمسّ.
                </div>
                {absorbEntries.length > 0 && (
                  <ul className="mt-1 list-disc pr-4" data-testid="list-correct-sale-absorb">
                    {absorbEntries.slice(0, 8).map((x) => (
                      <li key={x.id}>
                        {formatDateIraq(x.createdAt)} — {DRIFT_SOURCE_LABEL[x.source] ?? x.source}: <b>{signed(x.amount)}</b>
                      </li>
                    ))}
                    {absorbEntries.length > 8 && <li>و{absorbEntries.length - 8} غيرُها</li>}
                  </ul>
                )}
              </div>
            )}
            {serverError && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                data-testid="text-correct-sale-error">{serverError}</div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="button" disabled={!canSave} onClick={() => save.mutate()}
              data-testid="button-correct-sale-save">
              {save.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
              {absorb !== null ? (unchanged ? "مطابقة الكلفة لسعر البيع" : "تأكيد وحفظ") : "حفظ التصحيح"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
