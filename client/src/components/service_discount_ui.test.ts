// منطقُ حقول الخصم في الشاشة — بلا React وبلا قاعدة بيانات.
// `npm run test:discount-ui`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// **متى يصير الحفظُ «إرسالاً للاعتماد»** ومتى يبقى حفظاً عادياً. وهذا هو
// الفرقُ الذي يشعر به الموظّف: مسوّدةٌ لم يلمسها يجب أن تمرّ فوراً، ولمسةٌ
// واحدة تُحوّلها إلى طلبٍ ينتظر.

import {
  EMPTY_DISCOUNT, hasDiscount, discountBlocked, discountPayload,
  type DiscountDraft,
} from "./service_discount_ui";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

const draft = (p: Partial<DiscountDraft> = {}): DiscountDraft => ({ ...EMPTY_DISCOUNT, ...p });

console.log("\n═══ منطق حقول الخصم في الشاشة ═══\n");

// ── ١. المسارُ الأغلب: بلا خصم ────────────────────────────────────────────
check("١. مسوّدةٌ فارغة ليست خصماً — يمضي الحفظ كما كان",
  !hasDiscount(EMPTY_DISCOUNT, 500_000) && !discountBlocked(EMPTY_DISCOUNT, 500_000));
check("٢. **وسعرٌ يساوي الأصلي ليس خصماً** — ولو كتبه الموظّف بيده",
  !hasDiscount(draft({ finalPrice: 500_000 }), 500_000));
check("٣. ولا يمنع الإرسال",
  !discountBlocked(draft({ finalPrice: 500_000 }), 500_000));

// ── ٢. متى يصير خصماً ────────────────────────────────────────────────────
check("٤. أقلُّ من الأصلي خصمٌ",
  hasDiscount(draft({ finalPrice: 400_000 }), 500_000));
check("٥. وعَلَمُ المجّانية خصمٌ ولو بقي الحقل فارغاً",
  hasDiscount(draft({ isFree: true }), 500_000));
check("٦. **وتغيُّرُ السعر الأصلي يُعيد تقييم المسوّدة**: ٤٠٠ ألف على أصلٍ ٤٠٠ ألف ليس خصماً",
  !hasDiscount(draft({ finalPrice: 400_000 }), 400_000));

// ── ٣. ما يمنع الإرسال ───────────────────────────────────────────────────
check("٧. **خصمٌ بلا سببٍ مختار يمنع الإرسال**",
  discountBlocked(draft({ finalPrice: 400_000 }), 500_000));
check("٨. ومع السبب يُفتح",
  !discountBlocked(draft({ finalPrice: 400_000, reason: "negotiation" }), 500_000));
check("٩. **والتبرّعُ لا يُسأل عن سبب** — يكتبه النظام",
  !discountBlocked(draft({ isFree: true }), 500_000));
check("١٠. وسعرٌ أعلى من الأصلي يمنع الإرسال",
  discountBlocked(draft({ finalPrice: 600_000, reason: "negotiation" }), 500_000));
check("١١. **وصفرٌ بلا علمِ مجّانية يمنع الإرسال** — لا يُقرأ تبرّعاً بالصمت",
  discountBlocked(draft({ finalPrice: 0, reason: "humanitarian" }), 500_000));
check("١٢. وسعرٌ أصليٌّ صفر: لا خصمَ يُبنى عليه",
  discountBlocked(draft({ finalPrice: 0, isFree: true }), 0));

// ── ٤. الحمولة ───────────────────────────────────────────────────────────
{
  const p = discountPayload(draft({ isFree: true, finalPrice: 450_000, reason: "negotiation" }));
  check("١٣. **حمولةُ التبرّع صفرٌ دائماً** — ولو بقي رقمٌ في الحقل",
    p.finalPrice === 0 && p.isFree === true, JSON.stringify(p));
}
{
  const p = discountPayload(draft({ finalPrice: 400_000, reason: "humanitarian", note: "  " }));
  check("١٤. وملاحظةٌ من فراغاتٍ تُحذف لا تُحفَظ سلسلةً فارغة",
    p.note === undefined && p.finalPrice === 400_000, JSON.stringify(p));
}
{
  const p = discountPayload(draft({ finalPrice: 400_000, reason: "humanitarian", note: " مساومة " }));
  check("١٥. والملاحظةُ الحقيقية تُقلَّم وتُرسَل", p.note === "مساومة", JSON.stringify(p));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
