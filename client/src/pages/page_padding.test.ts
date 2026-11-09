//  **حشوةٌ واحدة حول كلّ الصفحات** (طلبُ المالك ٢٠٢٦-١١-٠٩ — §4.gg): `app-main` في `App.tsx` يحشو الصفحةَ ٢٠ نقطة على الحاسوب،
//  والصفحةُ لا تضيف فوقها حشوتَها — كانت تُجمَعان فيبدأ أوّلُ سطرٍ بعد ٥٦ نقطة. فلا تعود صفحةٌ جديدة تضيفها بصمت.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${!cond && detail ? `\n     ${detail}` : ""}`);
  if (!cond) fails++;
};

const app = readFileSync(join(here, "..", "App.tsx"), "utf8");
check(/className="app-main [^"]*\bmd:p-5 md:pt-5\b[^"]*"/.test(app) && !/className="app-main [^"]*md:p-8/.test(app),
  "١. حشوةُ الحاسوب في `app-main` وحدها: ٢٠ نقطة");

//  جذرُ كلّ صفحة — أوّلُ `<div className="…">` بعد `return (` — بلا حشوةٍ عامّة (p-3 · p-4 · p-6 · p-8 ونظائرها على الحاسوب).
const PAD = /(?<![\w:-])(?:p-3|p-4|p-6|p-8|md:p-4|md:p-6|md:p-8)(?![\w-])/;
const offenders: string[] = [];
for (const f of readdirSync(here).filter((n) => n.endsWith(".tsx"))) {
  const src = readFileSync(join(here, f), "utf8");
  for (const m of src.matchAll(/return \(\s*\n\s*<div className="([^"]*)"([^>]*)>/g)) {
    const cls = m[1];
    //  شاشاتُ الانتظار والفراغ (`text-center`) ليست جذرَ صفحةٍ بمحتواها.
    if (/text-center/.test(cls)) continue;
    if (PAD.test(cls) && (/dir=/.test(m[2]) || /max-w|container/.test(cls))) offenders.push(`${f}: ${cls}`);
  }
}
check(offenders.length === 0, "٢. **ولا جذرَ صفحةٍ يضيف حشوةً فوقها**", offenders.join(" | "));

//  وغلافُ الصفحة داخل جذرها (`container` أو `mx-auto`) بلا حشوةٍ كذلك — «المحاسبة» كان جذرُها بلا حشوة
//  وغلافُها الداخليّ `container mx-auto p-4 md:p-6` فبقي ٤٤ نقطة (ملاحظةُ Codex على #728).
const wrappers: string[] = [];
for (const f of readdirSync(here).filter((n) => n.endsWith(".tsx"))) {
  const src = readFileSync(join(here, f), "utf8");
  for (const m of src.matchAll(/className="([^"]*)"/g)) {
    const cls = m[1];
    if (/(?<![\w-])(?:container|mx-auto)(?![\w-])/.test(cls) && PAD.test(cls)) wrappers.push(`${f}: ${cls}`);
  }
}
check(wrappers.length === 0, "٣. **ولا غلافَ صفحةٍ (`container` · `mx-auto`) يضيف حشوةً فوقها**", wrappers.join(" | "));

console.log(`\n${fails === 0 ? "✅ كلُّها نجحت" : `❌ ${fails} فشل`}`);
process.exit(fails === 0 ? 0 : 1);
