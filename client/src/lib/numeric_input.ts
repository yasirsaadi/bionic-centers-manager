// تنظيفُ خانة الأرقام — الأرقامُ العربية والفارسية تصير لاتينية، ويُنزع ما ليس رقماً أو فاصلةً عشرية.
// **والسالبُ بإذنٍ صريح وحده** (`allowNegative`): مقاييسُ العلاج الطبيعي التي يكون التقفّعُ فيها سالباً (§4.cp) — وخاناتُ المال تبقى كما كانت.

/**
 * الأرقامُ العربية الهندية (٠-٩) والفارسية (۰-۹) ⟵ ٠-٩ اللاتينية، **والفاصلةُ العشرية العربية «٫» ⟵ «.»** — كانت تُنزع فيصير «١٢٫٥» ١٢٥.
 * وفاصلُ الآلاف العربيّ «٬» يُنزع مع غيره.
 */
export function toAsciiDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30))
    .replace(/[۰-۹]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x06f0 + 0x30))
    .replace(/٫/g, ".");
}

/** ما يصل خانةَ الأرقام ⟵ نصٌّ رقميّ نظيف. والإشارةُ السالبة تبقى أوّلَ الخانة وحدها إن أُذن بها. */
export function sanitizeNumericInput(raw: string, allowNegative = false): string {
  const ascii = toAsciiDigits(raw).replace(/[−–]/g, "-");
  if (!allowNegative) return ascii.replace(/[^\d.]/g, "");
  const negative = ascii.trimStart().startsWith("-");
  return (negative ? "-" : "") + ascii.replace(/[^\d.]/g, "");
}
