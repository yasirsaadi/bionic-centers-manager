import * as React from "react"

import { cn } from "@/lib/utils"
import { sanitizeNumericInput } from "@/lib/numeric_input"

// `allowNegative` — إذنٌ صريح بالإشارة السالبة لخانة أرقامٍ بعينها (مقاييسُ التقفّع §4.cp)؛ والافتراضُ كما كان: لا سالب.
type InputProps = React.ComponentProps<"input"> & { allowNegative?: boolean }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, inputMode, onChange, allowNegative = false, ...props }, ref) => {
    // Browsers reject Arabic-Indic digits in <input type="number"> *before* any
    // JS runs, so an Arabic keyboard can't enter numbers at all. We therefore
    // render numeric fields as text (keeping a numeric keypad via inputMode) and
    // sanitise on change: Arabic/Persian digits become ASCII and any non-numeric
    // character is stripped. Downstream handlers always receive a clean ASCII
    // numeric string, so react-hook-form / Number() coercion keeps working.
    const isNumeric = type === "number";

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isNumeric) {
          const raw = e.target.value;
          const cleaned = sanitizeNumericInput(raw, allowNegative);
          if (cleaned !== raw) {
            const setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype,
              "value"
            )?.set;
            setter?.call(e.target, cleaned);
          }
        }
        onChange?.(e);
      },
      [isNumeric, onChange, allowNegative]
    );

    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? inputMode ?? (allowNegative ? "text" : "decimal") : inputMode}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
