// منطقُ نافذة «اشترى» — بلا React وبلا قاعدة بيانات.
// `npm run test:purchase-ui`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// **مصفوفةُ النافذة كاملة**: أربعُ حالاتٍ (سعرٌ محفوظ؟ خبيرٌ محفوظ؟) في
// ثلاثةِ مساراتٍ ماليّة (عاديّ · خصم · تبرّع) = اثنتا عشرة تركيبة. ولكلٍّ
// سؤالان: **هل يُفتح الزرّ؟** و**ماذا يُرسَل؟**
//
// وأهمُّ ما يُثبَت هنا: **لا شيءَ يُعطَّل لغياب خبيرٍ تسأل عنه النافذة**.
// كان الزرُّ ميّتاً حتى يخرج الموظّفُ إلى شاشةٍ أخرى ويعود — وهذا العطبُ
// بالذات هو ما لا يجوز أن يعود بلا أن يُكسَر اختبار.

import { readFileSync } from "fs";
import { join } from "path";
import {
  purchaseGaps, purchaseOriginalPrice, purchaseBlocked, purchaseBody,
  purchaseSubmitLabel, savedExpertOutOfList,
} from "./purchase_dialog_ui";
import { EMPTY_DISCOUNT, hasDiscount, type DiscountDraft } from "./service_discount_ui";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

const draft = (p: Partial<DiscountDraft> = {}): DiscountDraft => ({ ...EMPTY_DISCOUNT, ...p });

//  ══ الحالاتُ الأربع، بأسمائها كما وردت في الطلب ══════════════════════
const CASE_A = { approvedPrice: 1_000_000, selectedExpertUserId: 7 }; // سعرٌ وخبير
const CASE_B = { approvedPrice: 1_000_000, selectedExpertUserId: null }; // سعرٌ بلا خبير
const CASE_C = { approvedPrice: 0, selectedExpertUserId: 7 }; // خبيرٌ بلا سعر
const CASE_D = { approvedPrice: 0, selectedExpertUserId: null }; // لا هذا ولا ذاك

console.log("\n═══ نافذة «اشترى» — المصفوفة كاملة ═══\n");

// ── ١. ما ينقص: أربعُ قراءاتٍ لا خامسةَ لها ──────────────────────────────
console.log("── ما ينقص ──");
same("١. (أ) سعرٌ وخبير ⟶ لا ينقص شيء", purchaseGaps(CASE_A),
  { needsFirstPrice: false, needsExpert: false });
same("٢. (ب) سعرٌ بلا خبير ⟶ الخبيرُ وحده", purchaseGaps(CASE_B),
  { needsFirstPrice: false, needsExpert: true });
same("٣. (ج) خبيرٌ بلا سعر ⟶ السعرُ وحده", purchaseGaps(CASE_C),
  { needsFirstPrice: true, needsExpert: false });
same("٤. (د) لا سعرَ ولا خبير ⟶ الاثنان", purchaseGaps(CASE_D),
  { needsFirstPrice: true, needsExpert: true });
//  **والقيمُ الغامضة تُقرأ «ناقص»** لا «موجود»: صفٌّ قديمٌ بحقلٍ غائب يجب
//  أن يُسأل عنه، لا أن يمضي بسعرٍ لا وجود له.
same("٥. **والحقلُ الغائب يُقرأ ناقصاً** لا موجوداً", purchaseGaps({}),
  { needsFirstPrice: true, needsExpert: true });
same("   وسعرٌ سالبٌ كذلك",
  purchaseGaps({ approvedPrice: -5, selectedExpertUserId: 7 }).needsFirstPrice, true);
same("   وبلا صفٍّ إطلاقاً", purchaseGaps(null),
  { needsFirstPrice: true, needsExpert: true });

// ── ٢. السعرُ المرجعيّ: المحفوظ يسبق المكتوب ─────────────────────────────
console.log("\n── السعر المرجعيّ ──");
same("٦. المحفوظُ هو المرجع ولو كُتب غيرُه",
  purchaseOriginalPrice(CASE_A, 5), 1_000_000);
same("٧. **وحين لا سعرَ محفوظاً فالمكتوبُ الآن** — والخصمُ يُحسب عليه",
  purchaseOriginalPrice(CASE_C, 750_000), 750_000);
same("٨. ولا سعرَ ولا مكتوب ⟶ صفر", purchaseOriginalPrice(CASE_D, 0), 0);

// ── ٣. **الزرُّ لا يُعطَّل لغياب خبيرٍ تسأل عنه النافذة** ─────────────────
console.log("\n── متى يُفتح الزرّ ──");
const open = (f: any, p: Partial<{
  firstPrice: number; expertId: string; discount: DiscountDraft; busy: boolean;
}> = {}) => !purchaseBlocked({
  followup: f, firstPrice: p.firstPrice ?? 0, expertId: p.expertId ?? "",
  discount: p.discount ?? EMPTY_DISCOUNT, busy: p.busy,
});

//  ── (أ) سعرٌ وخبير: مفتوحٌ فوراً بلا إدخالٍ إطلاقاً ──
check("٩. (أ) مفتوحٌ فوراً — لا يُسأل عن شيء", open(CASE_A));
//  ── (ب) سعرٌ بلا خبير: مغلقٌ حتى يُختار **في النافذة**، لا في مكانٍ آخر ──
check("١٠. (ب) مغلقٌ قبل اختيار الخبير", !open(CASE_B));
check("١١. **(ب) ويُفتح باختياره في النافذة نفسها**", open(CASE_B, { expertId: "9" }));
//  ── (ج) خبيرٌ بلا سعر: مغلقٌ حتى يُكتب سعرٌ موجب ──
check("١٢. (ج) مغلقٌ قبل كتابة السعر", !open(CASE_C));
check("١٣. **(ج) ويُفتح بكتابته في النافذة نفسها**",
  open(CASE_C, { firstPrice: 750_000 }));
check("١٤. وصفرٌ مكتوبٌ لا يفتحه — بيعٌ بلا مال", !open(CASE_C, { firstPrice: 0 }));
//  ── (د) الاثنان: يلزمان معاً، ونصفُ الإجابة لا يكفي ──
check("١٥. (د) مغلقٌ بلا شيء", !open(CASE_D));
check("١٦. (د) ولا يكفي السعرُ وحده", !open(CASE_D, { firstPrice: 600_000 }));
check("١٧. (د) ولا الخبيرُ وحده", !open(CASE_D, { expertId: "9" }));
check("١٨. **(د) ويُفتح بهما معاً في نداءٍ واحد**",
  open(CASE_D, { firstPrice: 600_000, expertId: "9" }));
//  والانشغالُ يغلقه في كلّ حالة — حارسُ الضغطة المزدوجة في الشاشة.
same("١٩. **والانشغالُ يغلقه في الحالات الأربع**",
  [CASE_A, CASE_B, CASE_C, CASE_D]
    .filter((f) => open(f, { firstPrice: 600_000, expertId: "9", busy: true })), []);

// ── ٤. المساراتُ الماليّة الثلاثة فوق الحالات الأربع ─────────────────────
console.log("\n── المسارات المالية ──");
//  **خصمٌ بلا سبب يغلق الزرّ** في كلّ حالةٍ من الأربع — حارسُ الخصم نفسه
//  لا نسخةٌ منه.
same("٢٠. **خصمٌ بلا سببٍ يغلق الزرّ في الحالات الأربع**",
  [[CASE_A, {}], [CASE_B, { expertId: "9" }],
    [CASE_C, { firstPrice: 800_000 }],
    [CASE_D, { firstPrice: 800_000, expertId: "9" }]]
    .filter(([f, p]: any) => open(f, { ...p, discount: draft({ finalPrice: 600_000 }) })),
  []);
same("٢١. **ومع السبب يُفتح في الأربع**",
  [[CASE_A, {}], [CASE_B, { expertId: "9" }],
    [CASE_C, { firstPrice: 800_000 }],
    [CASE_D, { firstPrice: 800_000, expertId: "9" }]]
    .filter(([f, p]: any) => !open(f, {
      ...p, discount: draft({ finalPrice: 600_000, reason: "negotiation" }),
    })).length,
  0);
same("٢٢. **والتبرّعُ لا يُسأل عن سبب — ويُفتح في الأربع**",
  [[CASE_A, {}], [CASE_B, { expertId: "9" }],
    [CASE_C, { firstPrice: 800_000 }],
    [CASE_D, { firstPrice: 800_000, expertId: "9" }]]
    .filter(([f, p]: any) => !open(f, { ...p, discount: draft({ isFree: true }) })).length,
  0);
//  **والخصمُ يُقاس على السعر المرجعيّ لا على المحفوظ وحده**: في (ج) و(د)
//  المرجعُ هو ما كُتب الآن — فـ٨٠٠ ألفٍ على مكتوبٍ ٨٠٠ ألف ليست خصماً.
check("٢٣. **وفي (ج) يُقاس الخصمُ على المكتوب الآن**",
  open(CASE_C, { firstPrice: 800_000, discount: draft({ finalPrice: 800_000 }) }),
  "مساواةُ المكتوب ليست خصماً فلا سببَ يُطلَب");
check("٢٤. **وأقلُّ منه خصمٌ يُطلَب سببُه**",
  !open(CASE_C, { firstPrice: 800_000, discount: draft({ finalPrice: 700_000 }) }));

// ── ٥. الجسمُ المُرسَل: ما نقص فقط ───────────────────────────────────────
console.log("\n── الجسم المُرسَل ──");
const body = (f: any, p: Partial<{
  firstPrice: number; expertId: string; discount: DiscountDraft;
}> = {}) => purchaseBody({
  followup: f, firstPrice: p.firstPrice ?? 0, expertId: p.expertId ?? "",
  discount: p.discount ?? EMPTY_DISCOUNT,
});
same("٢٥. (أ) جسمٌ فارغٌ تماماً — لا سعرَ ولا خبيرَ يُرسَل", body(CASE_A), {});
same("٢٦. (ب) الخبيرُ وحده — **رقماً لا نصّاً**",
  body(CASE_B, { expertId: "9" }), { expertUserId: 9 });
same("٢٧. (ج) السعرُ وحده", body(CASE_C, { firstPrice: 750_000 }),
  { originalPrice: 750_000 });
same("٢٨. (د) الاثنان معاً",
  body(CASE_D, { firstPrice: 600_000, expertId: "9" }),
  { originalPrice: 600_000, expertUserId: 9 });
//  **ولا يُرسَل سعرٌ على ملفٍّ مسعَّر إطلاقاً**: الخادمُ يتجاهله، لكنّ إرساله
//  كان يجعل الطلبَ يبدو كأنه يعيد التسعير.
check("٢٩. **ولا يُرسَل سعرٌ على ملفٍّ مسعَّر** ولو كُتب رقمٌ في الحالة",
  body(CASE_A, { firstPrice: 5 }).originalPrice === undefined,
  JSON.stringify(body(CASE_A, { firstPrice: 5 })));
check("٣٠. **ولا خبيرٌ على ملفٍّ له خبير**",
  body(CASE_A, { expertId: "9" }).expertUserId === undefined,
  JSON.stringify(body(CASE_A, { expertId: "9" })));
//  والخصمُ يُضاف إلى أيٍّ منها — الاثنتا عشرةَ تركيبةً بابٌ واحد.
{
  const b = body(CASE_D, {
    firstPrice: 1_000_000, expertId: "9",
    discount: draft({ finalPrice: 800_000, reason: "humanitarian", note: "حالة" }),
  });
  same("٣١. **وأشدُّها: سعرٌ وخبيرٌ وخصمٌ في جسمٍ واحد**",
    [b.originalPrice, b.expertUserId, b.discount?.finalPrice, b.discount?.reason],
    [1_000_000, 9, 800_000, "humanitarian"]);
}
{
  const b = body(CASE_A, { discount: draft({ isFree: true, finalPrice: 400_000 }) });
  same("٣٢. **والتبرّعُ صفرٌ دائماً** — ولو بقي رقمٌ في الحقل",
    [b.discount?.finalPrice, b.discount?.isFree], [0, true]);
}

// ── ٦. نصُّ الزرّ واحدٌ دائماً (تصحيحٌ تشغيليّ — تقاعدُ الاعتماد المؤجَّل) ──
console.log("\n── نصّ الزرّ ──");
same("٣٣. بلا خصم: «تأكيد وبدء التصنيع»",
  purchaseSubmitLabel({ followup: CASE_A, firstPrice: 0, discount: EMPTY_DISCOUNT }),
  "تأكيد وبدء التصنيع");
same("٣٤. **ومع خصمٍ: النصُّ نفسُه** — الخصمُ يُطبَّق فوراً كالسعر الكامل تماماً",
  purchaseSubmitLabel({
    followup: CASE_A, firstPrice: 0,
    discount: draft({ finalPrice: 600_000, reason: "negotiation" }),
  }), "تأكيد وبدء التصنيع");
same("٣٥. ومع التبرّع كذلك",
  purchaseSubmitLabel({
    followup: CASE_A, firstPrice: 0, discount: draft({ isFree: true }),
  }), "تأكيد وبدء التصنيع");

// ── ٧. **والبطاقةُ تستعمل هذه القاعدة فعلاً** ────────────────────────────
//  القاعدةُ الصحيحة لا تنفع إن بقيت الشاشةُ على منطقها المكرَّر. والعقدُ على
//  المصدر لا على الرسم — لا مشغّل DOM هنا.
console.log("\n── عقد البطاقة ──");
const cardSrc = readFileSync(
  join(import.meta.dirname, "./PostExamDecisionCard.tsx"), "utf8");
check("٣٦. **البطاقةُ تستورد القاعدة ولا تكرّرها**",
  cardSrc.includes("purchase_dialog_ui"));
check("٣٧. وزرُّ الإرسال مربوطٌ بـ`purchaseBlocked`",
  cardSrc.includes("purchaseBlocked({"));
check("٣٨. وجسمُه من `purchaseBody`", cardSrc.includes("purchaseBody({"));
check("٣٩. وما ينقص من `purchaseGaps`", cardSrc.includes("purchaseGaps(active)"));
//  **ولا شرطَ خبيرٍ مكتوبٌ في الشاشة بيدها** — وهو الشرطُ الذي كان يعطّل
//  الزرَّ الرئيسي. لو عاد يوماً، عاد بلا اختبارٍ يكسره — فيُمنَع نصّاً.
check("٤٠. **ولا `selectedExpertUserId === null` تحرس زرّاً في الشاشة**",
  !/selectedExpertUserId\s*===\s*null/.test(cardSrc),
  (cardSrc.match(/.*selectedExpertUserId\s*===.*/g) ?? []).join("\n"));

// ── ٨. **سهمُ السعر يُقرأ من الأعلى إلى الأدنى** ─────────────────────────
//  ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
//  السهمُ بين رقمين نصٌّ محايدُ الاتجاه، فيقلبه محرّكُ RTL بصرياً: يُكتب
//  «٢٥٬٠٠٠ ← ١٥٬٠٠٠» فيُقرأ «١٥٬٠٠٠ ← ٢٥٬٠٠٠» — أي أن السعر **ارتفع**،
//  وهو عكسُ الحقيقة في شاشةِ خصم. **والحلُّ عزلُ الثلاثة لا قلبُ الصفحة.**
console.log("\n── سهم السعر ──");
const transSrc = readFileSync(join(import.meta.dirname, "./PriceTransition.tsx"), "utf8");
check("٤١. **الوحدةُ معزولةٌ باتجاهٍ صريح `ltr`**", /dir="ltr"/.test(transSrc));
check("٤٢. **وبعزلٍ ثنائيّ الاتجاه** — فلا تتسرّب ولا يتسرّب إليها",
  /unicodeBidi:\s*"isolate"/.test(transSrc));
check("٤٣. **ولا تُقلَب الصفحةُ العربية** — لا `dir=\"ltr\"` على جذرٍ أو بطاقة",
  ![cardSrc].some((s) => /<(Card|div className="[^"]*")\s+dir="ltr"/.test(s)));
//  **وكلُّ سطحٍ يعرض انتقالَ سعرٍ **مباشرةً** يمرّ بها** — ثلاثةٌ لا أربعة.
//  (تصحيحٌ: كانت القائمةُ تضمّ «لوحةَ المتابعة» أيضاً، فتفحص وجودَ
//  `<PriceTransition>` في نصّها الخام — وهذا عقدٌ بائت. المرحلةُ الخامسة
//  (٤.ل) نقلت الحسمَ الحيَّ إلى مكوّنٍ مشترك، فلم يعد نصُّ الصفحة نفسه
//  يحمل الوسمَ ولو بقي السلوكُ الحقيقيُّ سليماً تماماً خلفه.)
const SURFACES = [
  ["بطاقةُ قرار المريض", "./PostExamDecisionCard.tsx"],
  ["شريطُ الخصم المعلَّق", "./PendingDiscountBanner.tsx"],
  ["صفحةُ اعتماد الخصم", "../pages/DiscountApprovals.tsx"],
] as const;
for (const [label, rel] of SURFACES) {
  const src = readFileSync(join(import.meta.dirname, rel), "utf8");
  check(`٤٤. **${label} تعرض الانتقال بالوحدة المعزولة**`,
    src.includes("<PriceTransition"));
  //  **ولا سهمَ عارياً بين رقمين** — وهو الشكلُ الذي كان ينقلب.
  const bare = (src.match(/\{[^{}\n]*[Pp]rice[^{}\n]*\}\s*(⟶|→|←|-->)/g) ?? []);
  check(`     ولا سهمَ عارياً بين رقمين فيها`, bare.length === 0, bare.join("\n"));
}

//  ══ لوحةُ المتابعة — عمارةٌ مختلفة، محميّةٌ بعقدٍ مختلف (٢٠٢٦-٠٨-٢٩) ══════
//  «بانتظار الحسم» لا تملك تصميمَ سعرٍ خاصّاً بها إطلاقاً: تُحيل بالكامل
//  إلى `ExamPathDecisionActions` — نفسُ مكوّن بطاقة المريض، وهو مَن يعرض
//  معاينة السعر الحيّة بـ`<PriceTransition>` من داخله هو (مُختبَرٌ ضمن
//  «بطاقةُ قرار المريض» أعلاه، فلا تكرارَ للفحص هنا).
//  «تم الحسم» تصميمٌ منفصلٌ عمداً — بطاقةُ نتيجةٍ لا معاينةَ قرار: ثلاثةُ
//  حقولٍ مسمّاة («السعر الأصلي»/«الخصم»/«السعر النهائي») من
//  `resolvedSaleDiscount` الخالصة، لا سهمَ انتقالٍ بينها فلا خطرَ انقلابٍ
//  يستوجب عزلَ `<PriceTransition>` أصلاً.
const followupsSrc = readFileSync(
  join(import.meta.dirname, "../pages/PostExamFollowups.tsx"), "utf8");
check("٤٤ب. **لوحةُ المتابعة تُحيل الحسمَ الحيَّ لمكوّن بطاقة المريض المشترك**",
  followupsSrc.includes("ExamPathDecisionActions"));
check("     **وعرضُ نتيجة الحسم يمرّ بدالّة السعر الخالصة المُختبَرة وحدها**",
  followupsSrc.includes("resolvedSaleDiscount(row)"));
//  **ولا سهمَ عارياً هنا أيضاً** — الحمايةُ نفسُها تبقى بصرف النظر عن
//  التصميم: لو أُعيد يوماً سهمٌ خامٌ بين رقمين في هذا الملفّ بعينه، تُمسكه
//  هذه العبارةُ فوراً — لا يكفي أن المكوّن المشترك آمنٌ في مكانه.
const followupsBare = (followupsSrc.match(/\{[^{}\n]*[Pp]rice[^{}\n]*\}\s*(⟶|→|←|-->)/g) ?? []);
check("     ولا سهمَ عارياً بين رقمين فيها",
  followupsBare.length === 0, followupsBare.join("\n"));

// ── ٩. **حقولُ البيع تظهر من فتحِ النافذة — لا تنتظر إدخالَ السعر** ──────
//  ══ العطبُ الذي يغلقه ══════════════════════════════════════════════════
//  كتلةُ «خصم أو خدمة مجّانية» في نافذة «اشترى» الموروثة كانت خلف شرطٍ
//  `originalPrice > 0`، فتُفتَح النافذةُ على صفٍّ بلا سعرٍ محفوظ ولا يرى
//  الموظّفُ إلّا حقلَ السعر والخبير — **ولا يعرف أن في النافذة خصماً
//  ومجّانيّةً أصلاً** حتى يكتب رقماً. ونافذةُ المسار الحديث
//  (`ExamPathDecisionActions`) ترسم حقولَها كلَّها دفعةً واحدة.
//
//  **والحمايةُ شقّان**: الشاشةُ ترسم الكتلةَ دائماً (عقدُ المصدر أدناه)،
//  **والمالُ لا يتحرّك بذلك** (القاعدةُ الخالصة أوّلاً) — فظهورٌ مبكّر
//  لا يفتح زرّاً ولا يضيف حقلاً إلى الحمولة.
console.log("\n── حقول البيع تظهر فوراً ──");

//  ① الكتلةُ **خاملةٌ تماماً** قبل السعر: لا خصمَ تدّعيه، فلا ملخّصَ ولا
//     سببَ ولا حمولة. وهذا ما يجعل عرضَها آمناً لا مجرّد «مقبول».
same("٤٥. **بلا سعرٍ بعد ⟵ لا خصمَ تدّعيه الكتلة**",
  hasDiscount(EMPTY_DISCOUNT, purchaseOriginalPrice(CASE_D, 0)), false);
same("     وكذلك على صفٍّ خبيرُه محفوظٌ وسعرُه لا",
  hasDiscount(EMPTY_DISCOUNT, purchaseOriginalPrice(CASE_C, 0)), false);

//  ② **والزرُّ يبقى مغلقاً كما كان بحرفه** — `purchaseBlocked` تعطّله عند
//     `!(original > 0)`، وظهورُ الكتلة لا يمسّ ذلك.
same("٤٦. **والإرسالُ معطَّلٌ بلا سعرٍ كما كان** — العرضُ ليس إذناً",
  [purchaseBlocked({ followup: CASE_C, firstPrice: 0, expertId: "", discount: draft() }),
    purchaseBlocked({ followup: CASE_D, firstPrice: 0, expertId: "9", discount: draft() })],
  [true, true]);

//  ③ **والحمولةُ لا تكتسب حقلَ خصمٍ** لمجرّد أن الكتلةَ صارت مرئية.
same("٤٧. **ولا حقلَ خصمٍ في الحمولة** — الكتلةُ معروضةٌ لم تُلمَس",
  purchaseBody({ followup: CASE_D, firstPrice: 0, expertId: "9", discount: draft() }),
  { originalPrice: 0, expertUserId: 9 });

//  ④ **وما إن يُكتب السعرُ يتبعه المرجعُ حيّاً** فتعمل الكتلةُ كما كانت
//     دائماً — لا سلوكَ جديد بعد الإدخال، فقط حضورٌ قبله.
same("٤٨. **والسعرُ المرجعيُّ يتبع ما يُكتب أعلاه حيّاً**",
  purchaseOriginalPrice(CASE_D, 500_000), 500_000);
same("٤٩. فيُفتَح الزرُّ بعد السعر والخبير كما كان",
  purchaseBlocked({ followup: CASE_D, firstPrice: 500_000, expertId: "9", discount: draft() }),
  false);
same("٥٠. ويعمل الخصمُ عليه كما كان",
  purchaseBody({
    followup: CASE_D, firstPrice: 500_000, expertId: "9",
    discount: draft({ finalPrice: 400_000, reason: "manager_discretion" }),
  }),
  {
    originalPrice: 500_000, expertUserId: 9,
    discount: { finalPrice: 400_000, isFree: false, reason: "manager_discretion", note: undefined },
  });

//  ── عقدُ الشاشة: الكتلةُ تُرسَم بلا شرطٍ على السعر ──────────────────────
//  **والتعليقاتُ تُزال قبل الفحص**: الشرطُ المحذوف مذكورٌ نصّاً في تعليق
//  الملفّ (يشرح ما كان)، فلولا إزالتُها لَمرّ الفحصُ على ذكرٍ لا على كود.
const stripJsxComments = (t: string) => t.replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
const legacySrc = stripJsxComments(readFileSync(
  join(import.meta.dirname, "./LegacyDecisionActions.tsx"), "utf8"));

check("٥١. **الكتلةُ موجودةٌ في النافذة الموروثة**",
  legacySrc.includes("<ServiceDiscountFields"));
check("٥٢. **ولا شرطَ `originalPrice > 0` يحجبها**",
  !/originalPrice\s*>\s*0\s*&&/.test(legacySrc),
  (legacySrc.match(/.*originalPrice\s*>\s*0.*/g) ?? []).join("\n"));
//  **ولا أيُّ شرطٍ آخر يسبقها** — الفحصُ على ما يسبق الوسمَ مباشرةً، فلا
//  يُستبدَل الشرطُ المحذوف بآخر يفعل الشيءَ نفسَه بصياغةٍ أخرى.
const beforeTag = legacySrc.slice(0, legacySrc.indexOf("<ServiceDiscountFields")).trimEnd();
check("٥٣. **ولا شرطَ آخر مكانَه** — لا `&& (` قبل الوسم مباشرةً",
  !/&&\s*\(\s*$/.test(beforeTag), beforeTag.slice(-120));

//  ── والمرجعُ هو المسارُ الحديث نفسُه، لا وصفٌ مكتوبٌ هنا ────────────────
//  فلو عاد يوماً إلى إخفاءِ حقولٍ خلف إدخالٍ سابق، سقط هذا البند معه.
const examPathSrc = stripJsxComments(readFileSync(
  join(import.meta.dirname, "./ExamPathDecisionActions.tsx"), "utf8"));
const csDialog = examPathSrc.slice(
  examPathSrc.indexOf('dialog === "complete_sale"'),
  examPathSrc.indexOf('dialog === "not_bought"'));
for (const [what, id] of [
  ["الخبير", "select-complete-sale-expert"],
  ["السعر الأصلي", "input-complete-sale-original"],
  ["مقدار الخصم", "input-complete-sale-discount"],
] as [string, string][]) {
  const at = csDialog.indexOf(`data-testid="${id}"`);
  const head = csDialog.slice(0, at).trimEnd();
  check(`٥٤. **والمسارُ الحديث يرسم «${what}» بلا شرطٍ سابق**`,
    at > 0 && !/&&\s*\(\s*$/.test(head), head.slice(-120));
}

//  ══ ٥٥–٦٤. **الخبيرُ المحفوظ الذي لا يصلح لهذا البائع** (مراجعةٌ على ٤٠٩) ══
//  بغدادُ اختارت أيوب (#٧) على متابعةٍ في ذي قار، ثمّ فتح استقبالُ ذي قار
//  «اشترى»: كانت النافذةُ تعرض أيوب للقراءة بلا قائمة، والخادمُ يردّه — لا
//  مخرج. فحين تصل القائمةُ **لهذا البائع** ولا يكون المحفوظُ فيها، يُسأل عن غيره.
console.log("\n── الخبيرُ المحفوظ خارج قائمة البائع ──");
const DQ_LIST = [{ id: 3 }, { id: 9 }]; // خبراءُ ذي قار — بلا أيوب
same("٥٥. **المحفوظُ خارج القائمة ⟵ يُسأل عن غيره**",
  [savedExpertOutOfList(CASE_A, DQ_LIST), purchaseGaps(CASE_A, DQ_LIST).needsExpert], [true, true]);
same("٥٦. والمحفوظُ فيها ⟵ يبقى للقراءة كما كان",
  [savedExpertOutOfList(CASE_A, [{ id: 7 }, { id: 3 }]),
    purchaseGaps(CASE_A, [{ id: 7 }]).needsExpert], [false, false]);
same("٥٧. **ولا يُحكَم قبل وصول القائمة** — الغائبةُ لا تقول إن المحفوظ لا يصلح",
  [savedExpertOutOfList(CASE_A, undefined), savedExpertOutOfList(CASE_A, null),
    purchaseGaps(CASE_A).needsExpert], [false, false, false]);
same("٥٨. وبلا خبيرٍ محفوظ ⟵ «ينقص» كما كان، لا «خارج القائمة»",
  [savedExpertOutOfList(CASE_B, DQ_LIST), purchaseGaps(CASE_B, DQ_LIST).needsExpert], [false, true]);
same("٥٩. والقائمةُ الفارغة (لا خبيرَ للبائع) ⟵ المحفوظُ خارجها",
  savedExpertOutOfList(CASE_A, []), true);
check("٦٠. **والزرُّ مغلقٌ حتى يُختار البديل**",
  purchaseBlocked({ followup: CASE_A, firstPrice: 0, expertId: "", discount: draft(),
    candidates: DQ_LIST }) === true);
check("٦١. وبعد الاختيار يُفتَح",
  purchaseBlocked({ followup: CASE_A, firstPrice: 0, expertId: "3", discount: draft(),
    candidates: DQ_LIST }) === false);
same("٦٢. **والبديلُ يُرسَل** — كان المحفوظُ لا يُرسَل فيردّه الخادم",
  purchaseBody({ followup: CASE_A, firstPrice: 0, expertId: "3", discount: draft(),
    candidates: DQ_LIST }), { expertUserId: 3 });
same("٦٣. والمحفوظُ الصالح لا يُرسَل بديلُه — **لا يُبدَّل من باب البيع**",
  purchaseBody({ followup: CASE_A, firstPrice: 0, expertId: "3", discount: draft(),
    candidates: [{ id: 7 }] }), {});
check("٦٤. **والنافذةُ تمرّر القائمةَ إلى الثلاث** (ما ينقص · الزرّ · الجسم)",
  legacySrc.includes("purchaseGaps(followup, experts)")
  && /purchaseBlocked\(\{[^}]*candidates:\s*experts/.test(legacySrc)
  && /purchaseBody\(\{[^}]*candidates:\s*experts/.test(legacySrc)
  && legacySrc.includes("savedExpertOutOfList(followup, experts)"));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
