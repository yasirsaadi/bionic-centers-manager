import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Money input for IQD amounts. Shows the value with thousands separators
// (e.g. 1,500,000) as the user types so millions can't be mis-typed with an
// extra zero. Stores/returns a plain integer via onValueChange. IQD has no
// fractional unit in practice, so only whole digits are accepted.
//
// ══ `allowEmpty` — «فارغ» ليست «صفراً» ═══════════════════════════════════
// الوضعُ الافتراضي يقرأ الحقلَ المفرَّغ صفراً، وهو الصواب في نافذةٍ يُدخَل
// فيها مبلغٌ لا بدّ منه: الصفرُ يعطّل زرَّ الحفظ فيرى الموظّف لماذا وقف.
//
// لكنّ **كلفةَ الجهاز في المعاينة اختيارية**: طبيبٌ يترك الحقلَ فارغاً يعني
// «لم أحدّد الكلفة» — والاستعلامات يُدخلها لاحقاً. ولو قُرئ ذلك صفراً لصار
// «معاينةٌ بلا كلفة» و«معاينةٌ كلفتُها صفر» شيئاً واحداً في الطلب، والفرقُ
// بينهما هو الفرقُ بين «لم يُسعَّر بعد» و«مجّاني».
//
// فمع `allowEmpty` يُنادى `onValueChange(null)` عند التفريغ، ويُرسَم الحقلُ
// فارغاً — لا «0» يمحوه الموظّف في كلّ مرّة.
type BaseProps = Omit<
  React.ComponentProps<typeof Input>, "value" | "onChange" | "type"
>;

export type MoneyInputProps = BaseProps & (
  | {
    allowEmpty?: false;
    value: number | string | null | undefined;
    onValueChange: (value: number) => void;
  }
  | {
    allowEmpty: true;
    value: number | string | null | undefined;
    onValueChange: (value: number | null) => void;
  }
);

export function MoneyInput(props: MoneyInputProps) {
  const { value, onValueChange, allowEmpty, className, ...rest } =
    props as BaseProps & {
      allowEmpty?: boolean;
      value: number | string | null | undefined;
      onValueChange: (value: number | null) => void;
    };
  const num = value === "" || value === null || value === undefined ? NaN : Number(value);
  const display = Number.isFinite(num) ? num.toLocaleString("en-US") : "";
  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={display}
      onChange={(e) => {
        //  الأرقامُ وحدها تُقرأ: الفواصلُ زينةُ عرضٍ، والإشارةُ والكسرُ
        //  لا مكان لهما في الدينار — فيسقطان قبل أن يصلا إلى الحالة.
        const digits = e.target.value.replace(/[^\d]/g, "");
        if (digits === "") return onValueChange(allowEmpty ? null : 0);
        onValueChange(Number(digits));
      }}
      className={cn("font-mono text-left", className)}
      {...rest}
    />
  );
}
