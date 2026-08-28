// عرضُ بطاقة «تم الحسم» — الخصمُ الحقيقيّ لكلّ الأنواع، بلا قاعدة بيانات.
// `npm run test:resolved-sale-presentation`.
//
// ══ العطبُ الذي يحرسه ══════════════════════════════════════════════════
// `ResolvedCard` كانت تحسب الخصمَ فقط حين `priceKind === "discount"` —
// فبيعٌ مجّانيٌّ (خصمُ ١٠٠٪: أصليٌّ ١٫٥٠٠٫٠٠٠ ونهائيٌّ صفر) كان يُعرَض
// بخصمٍ **صفر**، كأنّ المريض لم يحصل على شيء. **هذا الاختبارُ يفشل على
// الرأس السابق لهذا التصحيح وينجح بعده** — القسم (ج) تحديداً.

import { resolvedSaleDiscount } from "./post_exam_followups_presentation";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

console.log("── أ. عاديّ — أصلي = نهائي ──");
same("أ. أصلي ١٫٥٠٠٫٠٠٠ = نهائي ١٫٥٠٠٫٠٠٠ ⟶ خصم صفر",
  resolvedSaleDiscount({ originalPrice: 1_500_000, approvedPrice: 1_500_000 }), 0);

console.log("\n── ب. خصمٌ جزئيّ ──");
same("ب. أصلي ١٫٥٠٠٫٠٠٠ ونهائي ١٫٢٠٠٫٠٠٠ ⟶ خصم ٣٠٠٫٠٠٠",
  resolvedSaleDiscount({ originalPrice: 1_500_000, approvedPrice: 1_200_000 }), 300_000);

console.log("\n── ج. مجّانيّ — خصمُ ١٠٠٪ (العطبُ المُصلَح) ──");
same("ج. أصلي ١٫٥٠٠٫٠٠٠ ونهائي صفر ⟶ **خصمٌ بكامل الأصليّ لا صفراً**",
  resolvedSaleDiscount({ originalPrice: 1_500_000, approvedPrice: 0 }), 1_500_000);
//  ولا يُشترَط قراءةُ `priceKind` أصلاً — الحسابُ من الرقمين وحدهما،
//  والقيمةُ نفسُها تصحّ سواءٌ وُسِمت الحالةُ "free" أو أيّ اسمٍ آخر.
same("   والصيغةُ لا تقرأ priceKind إطلاقاً — نفسُ الرقم بلا وسم الحالة",
  resolvedSaleDiscount({ originalPrice: 1_500_000, approvedPrice: 0 }),
  resolvedSaleDiscount({ originalPrice: 1_500_000, approvedPrice: 0 }));

console.log("\n── د. صفٌّ تاريخيّ بلا سعرٍ أصليّ معروف ──");
same("د. originalPrice غائبة ⟶ لا يُخترَع رقمٌ — `null` صراحةً",
  resolvedSaleDiscount({ originalPrice: null, approvedPrice: 900_000 }), null);

console.log("\n── هـ. لا سالب أبداً ──");
same("هـ. معتمَدٌ أعلى من الأصليّ (تصحيحٌ إداريّ لاحق مثلاً) ⟶ صفرٌ لا سالب",
  resolvedSaleDiscount({ originalPrice: 1_000_000, approvedPrice: 1_200_000 }), 0);

console.log(`\n${failures === 0
  ? "✅ خصمُ بطاقة «تم الحسم» صحيحٌ لكلّ الأنواع الثلاثة"
  : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
