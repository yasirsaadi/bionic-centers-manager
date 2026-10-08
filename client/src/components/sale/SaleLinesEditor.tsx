// **سعرٌ لكلّ جزء ثمّ المجموع** (قرارُ المالك ٢٠٢٦-١٠-٠٨، §4.cu): «إن كان جزءان — قالبٌ وسليكون — فالأرتب أن يوضع لكلّ واحدٍ سعرٌ
// وقيمةُ خصمٍ وسعرٌ نهائيّ، ثمّ يظهر مجموعُهم». والمدفوعُ والمتبقّي على المجموع تحت هذا في النافذة نفسِها.
// شاشةٌ لا تحسب شيئاً يُعتمد: النهائيُّ هنا معاينةٌ، والخادمُ يشتقّه من الأصليّ والخصم (`parseSaleLines`) ويعتمده وحده.
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { COMPONENT_LABELS, isProstheticComponent, requestedItemLabel, type RequestedItem } from "@shared/prosthetic_parts";
import { lineFinalPrice, saleTotalsOf } from "@shared/part_sale";

export type SaleLineInputs = Record<string, { originalPrice: number; discountAmount: number }>;

const money = (n: number) => n.toLocaleString("en-US");

/** ما يُرسَل للخادم — سطرٌ لكلّ بند، بترتيب الطلب. */
export function saleLinesPayload(items: readonly string[], value: SaleLineInputs) {
  return items.map((item) => ({
    item, originalPrice: value[item]?.originalPrice ?? 0, discountAmount: value[item]?.discountAmount ?? 0,
  }));
}

/** المجموعُ للمعاينة — و`null` ما دام سطرٌ لا يصحّ (سعرٌ ناقص أو خصمٌ فوق السعر). */
export function saleLinesPreview(items: readonly string[], value: SaleLineInputs) {
  const rows = saleLinesPayload(items, value);
  if (rows.length === 0 || rows.some((r) => lineFinalPrice(r.originalPrice, r.discountAmount) === null)) return null;
  return saleTotalsOf(rows);
}

export function SaleLinesEditor({ items, serviceType, value, onChange, testId = "sale-lines" }: {
  items: readonly RequestedItem[];
  serviceType: string;
  value: SaleLineInputs;
  onChange: (next: SaleLineInputs) => void;
  testId?: string;
}) {
  const set = (item: string, patch: Partial<{ originalPrice: number; discountAmount: number }>) =>
    onChange({ ...value, [item]: { originalPrice: value[item]?.originalPrice ?? 0, discountAmount: value[item]?.discountAmount ?? 0, ...patch } });
  const totals = saleLinesPreview(items, value);
  return (
    <div className="space-y-2" data-testid={testId}>
      {items.map((item) => {
        const v = value[item] ?? { originalPrice: 0, discountAmount: 0 };
        const final = lineFinalPrice(v.originalPrice, v.discountAmount);
        const label = isProstheticComponent(item) ? COMPONENT_LABELS[item] : requestedItemLabel(item, serviceType);
        return (
          <div key={item} className="rounded-md border px-2.5 py-2 space-y-1.5" data-testid={`${testId}-${item}`}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <b>{label}</b>
              <span className="text-xs text-muted-foreground" data-testid={`${testId}-${item}-final`}>
                {final === null ? (v.originalPrice > 0 ? "الخصم أكبر من السعر" : "أدخل السعر")
                  : final === 0 ? "مجاني" : `النهائي: ${money(final)} د.ع`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">السعر الأصلي (د.ع)</Label>
                <MoneyInput value={v.originalPrice} onValueChange={(n) => set(item, { originalPrice: n })}
                  data-testid={`${testId}-${item}-original`} />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">الخصم (د.ع)</Label>
                <MoneyInput value={v.discountAmount} onValueChange={(n) => set(item, { discountAmount: n })}
                  data-testid={`${testId}-${item}-discount`} />
              </div>
            </div>
          </div>
        );
      })}
      {items.length > 1 && (
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm" data-testid={`${testId}-total`}>
          {totals === null ? (
            <span className="text-muted-foreground">أدخل سعر كلّ جزء ليظهر المجموع</span>
          ) : totals.finalPrice === 0 ? (
            <span><b>المجموع: مجاني</b> — قيمتُه {money(totals.originalPrice)} د.ع</span>
          ) : (
            <span>
              المجموع: <b>{money(totals.finalPrice)} د.ع</b>
              {totals.discountAmount > 0 && (
                <span className="text-muted-foreground"> (بعد خصم {money(totals.discountAmount)} من {money(totals.originalPrice)})</span>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
