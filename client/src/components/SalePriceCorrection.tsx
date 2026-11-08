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
import { apiRequest, invalidatePatientData } from "@/lib/queryClient";
import { deriveOfferFromDiscount } from "@shared/commercial";

export function SalePriceCorrection(props: {
  followupId: number;
  patientId: number;
  originalPrice: number | null;
  approvedPrice: number;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [original, setOriginal] = useState("");
  const [discount, setDiscount] = useState("");
  const [reason, setReason] = useState("");

  const openDialog = () => {
    const orig = props.originalPrice ?? props.approvedPrice;
    setOriginal(String(orig));
    setDiscount(String(Math.max(0, orig - props.approvedPrice)));
    setReason("");
    setOpen(true);
  };

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
      const res = await apiRequest("POST", `/api/followups/${props.followupId}/correct-sale-price`, {
        originalPrice: Number(original),
        discountAmount: discount === "" ? 0 : Number(discount),
        reason: reason.trim(),
      });
      return await res.json();
    },
    onSuccess: (out: any) => {
      setOpen(false);
      qc.invalidateQueries({ queryKey: [`/api/followups/patient/${props.patientId}`] });
      qc.invalidateQueries({ queryKey: [`/api/patients/${props.patientId}/device-episodes`] });
      invalidatePatientData(qc, props.patientId);
      const credit = Number(out?.creditBalance ?? 0);
      toast({
        title: "صُحّح سعر البيع",
        description: credit > 0
          ? `دفع المريض على هذا الجهاز أكثر من سعره الجديد بـ ${credit.toLocaleString()} د.ع — صار رصيداً له. لإرجاعه استعمل «طلب استرجاع» من حالة المريض.`
          : "حُدّثت كلفة الجهاز وحساب المريض، وبقي أمر التصنيع كما هو.",
      });
    },
    onError: (e: any) => {
      toast({ title: "لم يُصحَّح السعر", description: String(e?.message ?? e), variant: "destructive" });
    },
  });

  const canSave = offer.ok && !unchanged && reason.trim().length > 0 && !save.isPending;

  return (
    <>
      <Button type="button" size="sm" variant="outline" className="h-7 gap-1 bg-white text-xs"
        onClick={openDialog} data-testid="button-correct-sale-price">
        <PencilLine className="h-3.5 w-3.5" /> تصحيح سعر البيع
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="dialog-correct-sale-price">
          <DialogHeader>
            <DialogTitle>تصحيح سعر البيع</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">
              السعر المسجَّل الآن: <b className="text-foreground">{props.approvedPrice.toLocaleString()} د.ع</b>.
              أمرُ التصنيع وخبيرُه يبقيان كما هما — السعر وحده يتغيّر، ومعه كلفة الجهاز وحساب المريض.
            </p>
            <div className="space-y-1">
              <Label htmlFor="sp-original" className="text-xs">السعر الأصلي (د.ع)</Label>
              <MoneyInput id="sp-original" allowEmpty value={original}
                onValueChange={(v) => setOriginal(v === null ? "" : String(v))}
                data-testid="input-correct-sale-original" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sp-discount" className="text-xs">مقدار الخصم (د.ع)</Label>
              <MoneyInput id="sp-discount" allowEmpty value={discount}
                onValueChange={(v) => setDiscount(v === null ? "" : String(v))}
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
              <Textarea id="sp-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="مثال: سُجّل السعر خطأً عند إتمام البيع"
                data-testid="input-correct-sale-reason" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button type="button" disabled={!canSave} onClick={() => save.mutate()}
              data-testid="button-correct-sale-save">
              {save.isPending && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
              حفظ التصحيح
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
