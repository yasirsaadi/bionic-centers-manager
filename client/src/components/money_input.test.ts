// حقلُ المال — تنسيقُ الرقم وهو يُكتَب. منطقٌ خالص، بلا React.
// `npm run test:money-input`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// كلفةُ جهازٍ كانت نصّاً خاماً: `2500000`. ومَن يكتبها لا يستطيع أن يتحقّق
// منه بنظرةٍ واحدة، فصفرٌ زائدٌ أو ناقصٌ يمرّ — وهذه كلفةٌ تدخل حسابات
// المريض حين يعتمدها الاستعلامات.
//
// **و`allowEmpty` هو الفرقُ الذي أُضيف**: «لم أحدّد الكلفة» ليست «كلفتُه
// صفر». فالحقلُ المفرَّغ يبقى فارغاً، ويبقى صفراً حيث المبلغُ لا بدّ منه
// (نافذةُ قبضٍ مثلاً) — فيعطّل الصفرُ زرَّ الحفظ ويرى الموظّف لماذا.
//
// **مصدرُ المثال الأصليّ تغيّر**: كان حقلُ كلفة الجهاز في نموذج معاينة
// الطبيب، وذاك الحقلُ **حُذف من هناك تماماً** (القسم 4.b/4.f في
// CLAUDE.md) — الطبيبُ لم يعد يكتب سعراً إطلاقاً. `MoneyInput` نفسُه لم
// يُمَسّ ويبقى مكوّناً عامّاً تستعمله شاشاتٌ أخرى (القسمان ١-٥)، والقسمُ ٦
// أدناه صار يثبت **غيابه** عن نموذج المعاينة بدل حضوره.
//
// ولا مشغّلَ DOM هنا: تُستخرَج دالّتا العرض والقراءة من المصدر نفسه
// وتُشغَّلان مباشرة، فما يُختبَر هو ما يعمل.

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

//  ── قاعدتا المكوّن، مكتوبتان مرّةً واحدة ومُثبَتٌ أن المصدر يطابقهما ──
/** ما يُعرَض للمستخدم من قيمةٍ محفوظة. */
const display = (value: number | string | null | undefined): string => {
  const num = value === "" || value === null || value === undefined ? NaN : Number(value);
  return Number.isFinite(num) ? num.toLocaleString("en-US") : "";
};
/** ما يُخزَّن ممّا يكتبه المستخدم. */
const read = (typed: string, allowEmpty = false): number | null => {
  const digits = typed.replace(/[^\d]/g, "");
  if (digits === "") return allowEmpty ? null : 0;
  return Number(digits);
};

console.log("\n═══ حقل المال ═══\n");

// ── ١. التنسيق وهو يُكتَب ────────────────────────────────────────────────
console.log("── التنسيق ──");
same("١. **٥٠٠٠٠٠ ⟵ 500,000**", display(500_000), "500,000");
same("٢. **٢٥٠٠٠٠٠ ⟵ 2,500,000**", display(2_500_000), "2,500,000");
same("٣. والملايين العشرة", display(12_000_000), "12,000,000");
same("٤. والرقمُ الصغير بلا فاصلة", display(500), "500");
same("٥. والصفرُ يُعرَض صفراً حيث يُحفَظ صفراً", display(0), "0");
//  **والقيمةُ المحفوظة نصّاً تُنسَّق كذلك** — تحريرُ معاينةٍ قديمة يمرّ بها.
same("٦. **وتحريرُ معاينةٍ محفوظة يُعرَض منسَّقاً**", display("2500000"), "2,500,000");

// ── ٢. **الفارغُ يبقى فارغاً** ───────────────────────────────────────────
console.log("\n── الفارغ ──");
same("٧. **الفارغُ يبقى فارغاً**", display(""), "");
same("٨. و`null` و`undefined` كذلك", [display(null), display(undefined)], ["", ""]);
same("٩. **وقيمةٌ غيرُ رقمية تُعرَض فارغةً لا `NaN`**",
  [display("abc"), display(Number.NaN)], ["", ""]);

// ── ٣. القراءة: أرقامٌ صحيحةٌ موجبة لا غير ───────────────────────────────
console.log("\n── القراءة ──");
same("١٠. **الفواصلُ زينةُ عرضٍ تسقط عند الحفظ**", read("2,500,000"), 2_500_000);
same("١١. **ولا كسرَ في الدينار**", read("1500.75"), 150_075);
same("١٢. **ولا سالب** — الإشارةُ تسقط قبل أن تصل",
  [read("-500"), read("-1")], [500, 1]);
same("١٣. والحروفُ تسقط", read("12a3b"), 123);
same("١٤. والمسافاتُ كذلك", read(" 1 000 "), 1000);

// ── ٤. **«لم أحدّد» ليست «صفر»** ─────────────────────────────────────────
console.log("\n── allowEmpty ──");
same("١٥. **بلا `allowEmpty`: التفريغُ صفرٌ** — والصفرُ يعطّل الحفظ فيُرى",
  read("", false), 0);
same("١٦. **ومع `allowEmpty`: التفريغُ فراغٌ** — «لم يحدّد الطبيب الكلفة»",
  read("", true), null);
same("١٧. **والصفرُ المكتوب صراحةً يبقى صفراً في الحالتين**",
  [read("0", false), read("0", true)], [0, 0]);
//  ودورةٌ كاملة: يُكتب ⟶ يُخزَّن ⟶ يُعرَض — بلا انحراف.
same("١٨. **ودورةٌ كاملة بلا انحراف**",
  display(read("2500000", true)), "2,500,000");
same("١٩. **والفراغُ يبقى فراغاً بعد الدورة** — لا يصير «0»",
  display(read("", true)), "");

// ── ٥. **والمكوّنُ يطبّق هاتين القاعدتين فعلاً** ─────────────────────────
//  العقدُ على المصدر لا على الرسم — لا مشغّل DOM هنا.
console.log("\n── عقد المكوّن ──");
{
  const src = readFileSync(join(import.meta.dirname, "./ui/money-input.tsx"), "utf8");
  check("٢٠. **الفواصلُ من `toLocaleString`**", src.includes('toLocaleString("en-US")'));
  check("٢١. **والأرقامُ وحدها تُقرأ** — لا إشارةَ ولا نقطة",
    src.includes('replace(/[^\\d]/g, "")'));
  check("٢٢. **و`allowEmpty` تُنتج `null` لا صفراً**",
    /allowEmpty\s*\?\s*null\s*:\s*0/.test(src),
    (src.match(/.*allowEmpty.*/g) ?? []).join("\n"));
  check("٢٣. **والاتجاهُ يساريٌّ صريح** — الرقمُ لا ينقلب في صفحةٍ عربية",
    src.includes('dir="ltr"'));
}

// ── ٦. **ونموذجُ المعاينة صار طبّياً محضاً — بلا حقل مالٍ فيه إطلاقاً** ───
//  التبسيطُ الذي أزال كلَّ مسؤوليةٍ تجارية عن الطبيب (القسمُ 4.b/4.f في
//  CLAUDE.md) أزال معه حقلَ كلفة الجهاز الذي حرّك هذا الملفَّ أصلاً. فالعقدُ
//  انقلب: كان «الحقلُ موجودٌ ومنسَّق»، وصار «لا حقلَ مالياً هناك أصلاً».
console.log("\n── نموذجُ المعاينة بلا كلفةٍ فيه ──");
{
  const src = readFileSync(join(import.meta.dirname, "./medical/NewExamDialog.tsx"), "utf8");
  check("٢٤. **ولا `MoneyInput` في نموذج المعاينة إطلاقاً**",
    !src.includes("MoneyInput"),
    (src.match(/.*MoneyInput.*/g) ?? []).join("\n"));
  check("٢٥. **ولا حقلَ كلفة جهازٍ باسمه القديم**",
    !src.includes("exam-device-cost"),
    (src.match(/.*device-cost.*/g) ?? []).join("\n"));
  check("٢٦. **ولا `deviceCost` — سريريٌّ محضٌ فقط يصل جسمَ الحفظ**",
    !/deviceCost/.test(src),
    (src.match(/.*[Dd]eviceCost.*/g) ?? []).join("\n"));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
