// **سعرٌ لكلّ جزء ثمّ المجموع** (قرارُ المالك ٢٠٢٦-١٠-٠٨، §4.cu): «إن كان جزءان — قالبٌ وسليكون — فالأرتب أن يوضع لكلّ واحدٍ سعرٌ
// وقيمةُ خصمٍ وسعرٌ نهائيّ، ثمّ يظهر مجموعُهم». والمدفوعُ والمتبقّي على المجموع تحت هذا في النافذة نفسِها.
// **و«لكلّ طرفٍ سعرُه»** (§4.de (ب)): الجهازُ الكاملُ بأكثر من طرفٍ مصنوع يُسعَّر طرفاً طرفاً حين يختار الموظّف — فالوحدةُ جزءٌ أو الجهازُ أو طرفٌ.
// شاشةٌ لا تحسب شيئاً يُعتمد: النهائيُّ هنا معاينةٌ، والخادمُ يشتقّه من الأصليّ والخصم (`parseSaleLines`) ويعتمده وحده.
import { Label } from "@/components/ui/label";
import { MoneyInput } from "@/components/ui/money-input";
import { COMPONENT_LABELS, FULL_DEVICE, isProstheticComponent, requestedItemLabel, type RequestedItem } from "@shared/prosthetic_parts";
import { lineFinalPrice, saleTotalsOf } from "@shared/part_sale";

export type SaleLineInputs = Record<string, { originalPrice: number; discountAmount: number }>;

/** **وحدةُ سعر** — جزءٌ، أو الجهازُ كلُّه، أو طرفٌ منه (`limb`). و`key` مفتاحُها في الخانات ومعرّفاتِ الاختبار. */
export interface SaleUnit { key: string; item: RequestedItem; limb?: string; label: string }

/**
 * وحداتُ السعر بترتيب الطلب — وحين تُعطى الأطرافُ (اثنان فأكثر) يصير الجهازُ الكاملُ سطراً لكلّ طرف بعنوانه («يسار سفلي — تحت الركبة»).
 */
export function saleUnitsOf(items: readonly RequestedItem[], serviceType: string, limbs?: readonly { key: string; title: string }[] | null): SaleUnit[] {
  return items.flatMap((item): SaleUnit[] => {
    if (item === FULL_DEVICE && limbs && limbs.length >= 2) {
      return limbs.map((l) => ({ key: `${item}-${l.key}`, item, limb: l.key, label: l.title }));
    }
    return [{ key: item, item, label: isProstheticComponent(item) ? COMPONENT_LABELS[item] : requestedItemLabel(item, serviceType) }];
  });
}

const money = (n: number) => n.toLocaleString("en-US");

/** ما يُرسَل للخادم — سطرٌ لكلّ وحدة، بترتيبها (والطرفُ بمفتاحه). */
export function saleLinesPayload(units: readonly SaleUnit[], value: SaleLineInputs) {
  return units.map((u) => ({
    item: u.item, ...(u.limb ? { limb: u.limb } : {}),
    originalPrice: value[u.key]?.originalPrice ?? 0, discountAmount: value[u.key]?.discountAmount ?? 0,
  }));
}

/** المجموعُ للمعاينة — و`null` ما دام سطرٌ لا يصحّ (سعرٌ ناقص أو خصمٌ فوق السعر). */
export function saleLinesPreview(units: readonly SaleUnit[], value: SaleLineInputs) {
  const rows = saleLinesPayload(units, value);
  if (rows.length === 0 || rows.some((r) => lineFinalPrice(r.originalPrice, r.discountAmount) === null)) return null;
  return saleTotalsOf(rows);
}

export function SaleLinesEditor({ units, value, onChange, testId = "sale-lines" }: {
  units: readonly SaleUnit[];
  value: SaleLineInputs;
  onChange: (next: SaleLineInputs) => void;
  testId?: string;
}) {
  const set = (key: string, patch: Partial<{ originalPrice: number; discountAmount: number }>) =>
    onChange({ ...value, [key]: { originalPrice: value[key]?.originalPrice ?? 0, discountAmount: value[key]?.discountAmount ?? 0, ...patch } });
  const totals = saleLinesPreview(units, value);
  const anyLimb = units.some((u) => u.limb);
  return (
    <div className="space-y-2" data-testid={testId}>
      {units.map((u) => {
        const v = value[u.key] ?? { originalPrice: 0, discountAmount: 0 };
        const final = lineFinalPrice(v.originalPrice, v.discountAmount);
        return (
          <div key={u.key} className="rounded-md border px-2.5 py-2 space-y-1.5" data-testid={`${testId}-${u.key}`}>
            <div className="flex items-center justify-between gap-2 text-sm">
              <b className="min-w-0">{u.label}</b>
              <span className="text-xs text-muted-foreground shrink-0" data-testid={`${testId}-${u.key}-final`}>
                {final === null ? (v.originalPrice > 0 ? "الخصم أكبر من السعر" : "أدخل السعر")
                  : final === 0 ? "مجاني" : `النهائي: ${money(final)} د.ع`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">السعر الأصلي (د.ع)</Label>
                <MoneyInput value={v.originalPrice} onValueChange={(n) => set(u.key, { originalPrice: n })}
                  data-testid={`${testId}-${u.key}-original`} />
              </div>
              <div className="space-y-1 min-w-0">
                <Label className="text-xs text-muted-foreground">الخصم (د.ع)</Label>
                <MoneyInput value={v.discountAmount} onValueChange={(n) => set(u.key, { discountAmount: n })}
                  data-testid={`${testId}-${u.key}-discount`} />
              </div>
            </div>
          </div>
        );
      })}
      {units.length > 1 && (
        <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm" data-testid={`${testId}-total`}>
          {totals === null ? (
            <span className="text-muted-foreground">{anyLimb ? "أدخل سعر كلّ طرف ليظهر المجموع" : "أدخل سعر كلّ جزء ليظهر المجموع"}</span>
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
