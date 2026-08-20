// حقلُ المال — تنسيقُ الرقم وهو يُكتَب. منطقٌ خالص، بلا React.
// `npm run test:money-input`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// كلفةُ الجهاز في نموذج المعاينة كانت نصّاً خاماً: `2500000`. والطبيبُ لا
// يستطيع أن يتحقّق منه بنظرةٍ واحدة، فصفرٌ زائدٌ أو ناقصٌ يمرّ — وهذه كلفةٌ
// تدخل حسابات المريض حين يعتمدها الاستعلامات.
//
// **و`allowEmpty` هو الفرقُ الذي أُضيف**: «لم أحدّد الكلفة» ليست «كلفتُه
// صفر». فالحقلُ المفرَّغ يبقى فارغاً في المعاينة، ويبقى صفراً حيث المبلغُ
// لا بدّ منه (نافذةُ قبضٍ مثلاً) — فيعطّل الصفرُ زرَّ الحفظ ويرى الموظّف لماذا.
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

// ── ٦. **ونموذجُ المعاينة يستعمله — بلا حقلٍ خام** ──────────────────────
console.log("\n── عقد نموذج المعاينة ──");
{
  const src = readFileSync(join(import.meta.dirname, "./medical/NewExamDialog.tsx"), "utf8");
  check("٢٤. **كلفةُ الجهاز حقلُ مالٍ لا نصٌّ خام**",
    src.includes("<MoneyInput") && src.includes("input-exam-device-cost"));
  check("٢٥. **وبـ`allowEmpty`** — الطبيبُ يترك الحقل فارغاً فيبقى فارغاً",
    /<MoneyInput[\s\S]{0,200}allowEmpty/.test(src));
  //  **ولم يبقَ الحقلُ الخام**: `Input` بلا تنسيقٍ كان يقبل فواصل المستخدم
  //  ويرسلها نصّاً — والخادمُ ينظّفها، لكنّ الطبيب لا يرى رقمه منسَّقاً.
  check("٢٦. **ولم يبقَ `<Input` خامٌّ على كلفة الجهاز**",
    !/<Input[\s\S]{0,120}input-exam-device-cost/.test(src),
    (src.match(/.*input-exam-device-cost.*/g) ?? []).join("\n"));
  //  **والعلاجُ الطبيعي لم يُمَسّ**: الحقلُ داخل `isDeviceSpecialty` وحده.
  //  الحقلُ داخل `{isDeviceSpecialty && (…)}` ولا شرطَ آخر بينهما — فما
  //  بينهما تعليقاتٌ عربية طويلة، والمدى يتّسع لها ولا يتّسع لكتلةٍ ثانية.
  check("٢٧. **والحقلُ للأطراف والمساند وحدهما** — العلاجُ الطبيعي بلا كلفة",
    /isDeviceSpecialty\s*&&\s*\([\s\S]{0,2400}input-exam-device-cost/.test(src));
  same("   **ولا يُرسَل على معاينة علاجٍ طبيعي إطلاقاً**",
    /deviceCost:\s*isDeviceSpecialty\s*\?\s*deviceCost\s*:\s*undefined/.test(src), true);
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
