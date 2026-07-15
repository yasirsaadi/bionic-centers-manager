import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Money input for IQD amounts. Shows the value with thousands separators
// (e.g. 1,500,000) as the user types so millions can't be mis-typed with an
// extra zero. Stores/returns a plain integer via onValueChange. IQD has no
// fractional unit in practice, so only whole digits are accepted.
export interface MoneyInputProps
  extends Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> {
  value: number | string | null | undefined;
  onValueChange: (value: number) => void;
}

export function MoneyInput({ value, onValueChange, className, ...props }: MoneyInputProps) {
  const num = value === "" || value === null || value === undefined ? NaN : Number(value);
  const display = Number.isFinite(num) ? num.toLocaleString("en-US") : "";
  return (
    <Input
      type="text"
      inputMode="numeric"
      dir="ltr"
      value={display}
      onChange={(e) => {
        const digits = e.target.value.replace(/[^\d]/g, "");
        onValueChange(digits === "" ? 0 : Number(digits));
      }}
      className={cn("font-mono text-left", className)}
      {...props}
    />
  );
}
