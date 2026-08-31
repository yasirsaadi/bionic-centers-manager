// توستُ النجاح/المعلومات — بطاقةٌ زرقاء هادئة بدل الضياع على الخلفية
// البيضاء. عقدُ مصدرٍ خالص (لا مشغّل DOM، على نمط money_input.test.ts):
// `npm run test:toast-tone`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) التوستُ الافتراضيّ (`variant: "default"` أو بلا `variant` إطلاقاً —
//     وهذا معظمُ نداءات `toast({...})` في المستودع) لم يعد يستعمل
//     `bg-background` — الخلفيّةَ نفسَها خلف الصفحة كلِّها.
// (٢) `--toast-default-*` معرَّفةٌ في `:root` (لا خلف `@media`/`[data-theme]`
//     — تنطبق دائماً، والتطبيقُ بأكمله بلا وضعٍ داكن أصلاً اليوم).
// (٣) التبايُن مقصود: خلفيّةٌ فاتحة (Lightness عالٍ) ونصٌّ داكن (منخفض)
//     بفارقٍ واضح — لا لونان متقاربان يوهمان بحلٍّ لم يقع فعلاً.
// (٤) توستُ الخطأ (`destructive`) لم يتغيّر — يبقى أحمر ومتمايزاً بوضوح.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

console.log("\n═══ توستُ النجاح/المعلومات ═══\n");

const cssSrc = readFileSync(join(import.meta.dirname, "../../index.css"), "utf8");
const toastSrc = readFileSync(join(import.meta.dirname, "./toast.tsx"), "utf8");

console.log("── index.css ──");
//  الرايةُ الثلاثة يجب أن تقع داخل الكتلة الأولى `:root { ... }` — لا خلف
//  `@media` ولا `[data-theme]` — فتنطبق في كلّ الأحوال (لا وضعَ داكناً هنا).
const rootBlock = cssSrc.slice(cssSrc.indexOf(":root"), cssSrc.indexOf(":root") + cssSrc.slice(cssSrc.indexOf(":root")).indexOf("}"));
const hslTriple = /^(\d{1,3}) (\d{1,3})% (\d{1,3})%$/;

function readToken(name: string): { h: number; s: number; l: number } | null {
  const m = new RegExp(`--${name}:\\s*([^;]+);`).exec(rootBlock);
  if (!m) return null;
  const parts = hslTriple.exec(m[1].trim());
  if (!parts) return null;
  return { h: Number(parts[1]), s: Number(parts[2]), l: Number(parts[3]) };
}

const bg = readToken("toast-default-background");
const fg = readToken("toast-default-foreground");
const border = readToken("toast-default-border");

check("١. **الخلفيّة معرَّفةٌ داخل `:root` بصيغة HSL صحيحة**", bg !== null, rootBlock);
check("٢. **النصّ كذلك**", fg !== null);
check("٣. **والحدّ كذلك**", border !== null);

if (bg && fg) {
  check("٤. **خلفيّةٌ فاتحة**: Lightness ≥ ٩٠٪ (بطاقةٌ هادئة لا صارخة)", bg.l >= 90,
    `bg.l=${bg.l}`);
  check("٥. **نصٌّ داكنٌ بوضوح**: Lightness ≤ ٣٥٪", fg.l <= 35, `fg.l=${fg.l}`);
  check("٦. **وفارقٌ حقيقيّ بينهما** (≥ ٤٠ نقطة) — تبايُنٌ لا لونان متقاربان",
    bg.l - fg.l >= 40, `bg.l=${bg.l} fg.l=${fg.l}`);
  check("٧. **وكلاهما من نفس العائلة الزرقاء** (Hue بين ١٩٠-٢٢٠) — هادئةٌ لا صارخة",
    bg.h >= 190 && bg.h <= 220 && fg.h >= 190 && fg.h <= 220);
}
if (border && bg) {
  check("٨. **الحدّ أغمقُ من الخلفية** — يُرى كحدٍّ لا يذوب فيها", border.l < bg.l);
}

console.log("\n── toast.tsx ──");
check("٩. **`default` لم يعد يستعمل `bg-background`**",
  !/default:\s*\n?\s*"[^"]*bg-background/.test(toastSrc));
check("١٠. **ويستعمل المتغيّرات الثلاثة الجديدة صراحةً**",
  toastSrc.includes("--toast-default-background")
  && toastSrc.includes("--toast-default-foreground")
  && toastSrc.includes("--toast-default-border"));
check("١١. **`destructive` لم يتغيّر** — يبقى أحمر متمايزاً بوضوح",
  /destructive:\s*\n?\s*"destructive group border-destructive bg-destructive text-destructive-foreground"/.test(toastSrc));
check("١٢. **لا موضعَ استدعاءٍ يحتاج تعديلاً**: `variant` اختياريّ في تعريف المتغيّرات",
  toastSrc.includes('variant: "default"'));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
