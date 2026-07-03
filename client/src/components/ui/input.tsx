import * as React from "react"

import { cn } from "@/lib/utils"

// Convert Arabic-Indic (٠-٩) and Extended/Persian (۰-۹) digits to ASCII (0-9).
function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x06f0 + 0x30));
}

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, inputMode, onChange, ...props }, ref) => {
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
          const cleaned = toAsciiDigits(raw).replace(/[^\d.]/g, "");
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
      [isNumeric, onChange]
    );

    // h-9 to match icon buttons and default buttons.
    return (
      <input
        type={isNumeric ? "text" : type}
        inputMode={isNumeric ? inputMode ?? "decimal" : inputMode}
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
