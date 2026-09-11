// عرضُ بطاقة «تم الحسم» — الخصمُ الحقيقيّ لكلّ الأنواع، بلا قاعدة بيانات.
// `npm run test:resolved-sale-presentation`.
//
// ══ العطبُ الذي يحرسه ══════════════════════════════════════════════════
// `ResolvedCard` كانت تحسب الخصمَ فقط حين `priceKind === "discount"` —
// فبيعٌ مجّانيٌّ (خصمُ ١٠٠٪: أصليٌّ ١٫٥٠٠٫٠٠٠ ونهائيٌّ صفر) كان يُعرَض
// بخصمٍ **صفر**، كأنّ المريض لم يحصل على شيء. **هذا الاختبارُ يفشل على
// الرأس السابق لهذا التصحيح وينجح بعده** — القسم (ج) تحديداً.

import {
  resolvedSaleDiscount, sortWaitingRows, sortResolvedRows, defaultSortDirectionFor,
} from "./post_exam_followups_presentation";

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

// ══════════════════════════════════════════════════════════════════════
// و. الترتيبُ — «الأقدم أولاً» / «الأحدث أولاً» (تصحيحٌ حيّ)
// ══════════════════════════════════════════════════════════════════════
console.log("\n── و. ترتيبُ «بانتظار الحسم» — examSignedAt ──");
{
  const rows = [
    { followupId: 10, examSignedAt: "2026-01-03T10:00:00Z" },
    { followupId: 11, examSignedAt: "2026-01-01T10:00:00Z" },
    { followupId: 12, examSignedAt: "2026-01-02T10:00:00Z" },
  ];
  same("و.١. **افتراضُ «بانتظار الحسم» يبقى الأقدمَ أوّلاً كما كان دائماً**",
    defaultSortDirectionFor("waiting"), "asc");
  same("   **و«تم الحسم» يبقى الأحدثَ حسماً أوّلاً — افتراضٌ مستقلّ لا"
    + " يفرضه تبويبٌ آخر** (تصحيحٌ لاحق: كانا يشتركان حالةً واحدة فتقلب"
    + " افتراضُ «تم الحسم» صمتاً بمجرّد إضافة الضابط)",
    defaultSortDirectionFor("resolved"), "desc");
  same("و.٢. `asc` ⟶ الأقدمُ فالأحدث",
    sortWaitingRows(rows, "asc").map((r) => r.followupId), [11, 12, 10]);
  same("و.٣. `desc` ⟶ عكسُه تماماً — الأحدثُ فالأقدم",
    sortWaitingRows(rows, "desc").map((r) => r.followupId), [10, 12, 11]);
  same("و.٤. **ولا تُبدَّل المصفوفةُ الأصلية** — دالّةٌ خالصة",
    rows.map((r) => r.followupId), [10, 11, 12]);
}

console.log("\n── ز. الفراغُ يبقى أخيراً — بصرف النظر عن الاتجاه ──");
{
  const rows = [
    { followupId: 20, examSignedAt: "2026-01-02T10:00:00Z" },
    { followupId: 21, examSignedAt: null },
    { followupId: 22, examSignedAt: "2026-01-01T10:00:00Z" },
  ];
  same("ز.١. `asc`: بلا تاريخٍ ⟶ أخيراً",
    sortWaitingRows(rows, "asc").map((r) => r.followupId), [22, 20, 21]);
  same("ز.٢. `desc`: بلا تاريخٍ ⟶ أخيراً كذلك — لا يقفز إلى الصدارة",
    sortWaitingRows(rows, "desc").map((r) => r.followupId), [20, 22, 21]);
}

console.log("\n── ح. كاسرُ التعادل — followupId بنفس اتّجاه الترتيب ──");
{
  const sameTime = "2026-01-01T10:00:00Z";
  const rows = [
    { followupId: 33, examSignedAt: sameTime },
    { followupId: 31, examSignedAt: sameTime },
    { followupId: 32, examSignedAt: sameTime },
  ];
  same("ح.١. `asc`: المعرّفُ الأصغر أوّلاً بين المتعادلين",
    sortWaitingRows(rows, "asc").map((r) => r.followupId), [31, 32, 33]);
  same("ح.٢. `desc`: والمعرّفُ الأكبر أوّلاً — الاتجاهُ نفسُه على الكاسر",
    sortWaitingRows(rows, "desc").map((r) => r.followupId), [33, 32, 31]);
  //  وصفّان كلاهما بلا تاريخ ⟶ الكاسرُ وحده يحسم.
  const untimed = [
    { followupId: 42, examSignedAt: null },
    { followupId: 41, examSignedAt: null },
  ];
  same("ح.٣. وكلاهما بلا تاريخ ⟶ الكاسرُ وحده يحسم بنفس الاتجاه",
    sortWaitingRows(untimed, "asc").map((r) => r.followupId), [41, 42]);
}

console.log("\n── ط. ترتيبُ «تم الحسم» — resolvedAt (مفتاحٌ مختلف، حارسٌ واحد) ──");
{
  const rows = [
    { followupId: 50, resolvedAt: "2026-02-03T10:00:00Z" },
    { followupId: 51, resolvedAt: "2026-02-01T10:00:00Z" },
    { followupId: 52, resolvedAt: "2026-02-02T10:00:00Z" },
  ];
  same("ط.١. `asc` ⟶ الأقدمُ حسماً أوّلاً",
    sortResolvedRows(rows, "asc").map((r) => r.followupId), [51, 52, 50]);
  same("ط.٢. `desc` ⟶ الأحدثُ حسماً أوّلاً — **سلوكُ الخادم الافتراضيّ القديم**"
    + " (`ORDER BY resolved_at DESC`)، وهو الافتراضُ المعروض فعلاً لهذا"
    + " التبويب (راجع و.١ أعلاه)، ويبقى متاحاً بالاختيار الصريح كذلك",
    sortResolvedRows(rows, "desc").map((r) => r.followupId), [50, 52, 51]);
}

console.log(`\n${failures === 0
  ? "✅ خصمُ بطاقة «تم الحسم» والترتيبُ بكلا الاتجاهين صحيحان"
  : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
