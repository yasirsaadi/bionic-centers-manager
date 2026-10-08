// خانةُ الأرقام (`client/src/components/ui/input.tsx`) — `npm run test:numeric-input`.
// الأرقامُ العربية تصير لاتينية، ويُنزع ما سواها، **والسالبُ بإذنٍ صريح وحده** (مقاييسُ التقفّع، §4.cp) — وخاناتُ المال بلا سالبٍ كما كانت.
import { sanitizeNumericInput } from "./numeric_input";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}

same("١. الأرقامُ العربية والفارسية ⟵ لاتينية، **والفاصلةُ العربية «٫» عشرية** (كانت تُنزع فيصير ١٢٫٥ مئةً وخمسةً وعشرين)، وفاصلُ الآلاف «٬» يُنزع",
  [sanitizeNumericInput("١٢٫٥"), sanitizeNumericInput("۲۵.5"), sanitizeNumericInput("٢٥٬٠٠٠")], ["12.5", "25.5", "25000"]);
same("٢. **وبلا إذن: الإشارةُ السالبة تُنزع كما كانت** (خاناتُ المال)", [sanitizeNumericInput("-5"), sanitizeNumericInput("−5")], ["5", "5"]);
same("٣. وبالإذن: السالبُ يبقى أوّلَ الخانة — والشرطةُ الطويلة وعلامةُ الطرح سالبٌ أيضاً", [sanitizeNumericInput("-5", true), sanitizeNumericInput("−12", true), sanitizeNumericInput("–٣", true)], ["-5", "-12", "-3"]);
same("٤. وشرطةٌ في الوسط لا تصنع سالباً", [sanitizeNumericInput("5-3", true), sanitizeNumericInput("-", true)], ["53", "-"]);

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
