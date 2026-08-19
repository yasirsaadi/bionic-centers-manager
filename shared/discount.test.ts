// اختبارُ عقد الخصم والتبرّع — **منطقٌ خالص، بلا قاعدة بيانات ولا شبكة**.
//
// القاعدةُ المحوريّة تحت الاختبار: **الصفرُ ليس مجّانياً حتى يُعلَن**.
// وهي التي تفصل «خدمةٌ تبرّعنا بها» عن «ملفٌّ لم يُسعَّر بعد» — وخلطُهما
// كان سيجعل كلَّ مريضٍ ينتظر التسعير يُقرأ تبرّعاً في التقرير.

import {
  computeServiceDiscount, canApproveServiceDiscount, canRequestServiceDiscount,
  discountReasonLabel, isDiscountReason, DISCOUNT_REASONS, DISCOUNT_STATUSES,
  FREE_DONATION_REASON, FREE_DONATION_LABEL,
} from "./discount";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

console.log("\n═══ عقد الخصم والتبرّع ═══\n");

// ── ١. لا خصم ⟶ لا اعتماد ────────────────────────────────────────────────
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 500_000 });
  check("١. السعر كما هو: صالح، وبلا حاجة اعتماد",
    r.ok && !r.needsApproval && r.discountAmount === 0 && r.finalPrice === 500_000,
    JSON.stringify(r));
}
{
  //  الحقلُ الفارغ = «لم يلمسه أحد» لا «صفر».
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: null });
  check("٢. الحقل الفارغ يعني السعر الأصلي لا الصفر",
    r.ok && !r.needsApproval && r.finalPrice === 500_000, JSON.stringify(r));
  const u = computeServiceDiscount({ originalPrice: 500_000 });
  check("٣. وغيابُ الحقل كذلك", u.ok && !u.needsApproval && u.finalPrice === 500_000);
}

// ── ٢. خصمٌ جزئي ─────────────────────────────────────────────────────────
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 400_000 });
  check("٤. خصم جزئي: المبلغ والنسبة محسوبان مرّةً واحدة",
    r.ok && r.needsApproval && r.discountAmount === 100_000
      && r.discountPercentage === 20 && !r.isFree, JSON.stringify(r));
}
{
  //  النسبةُ بمنزلتين ولا تُقرَّب إلى عددٍ صحيح فتضيع.
  const r = computeServiceDiscount({ originalPrice: 300_000, finalPrice: 200_000 });
  check("٥. نسبة غير صحيحة تُحفَظ بمنزلتين",
    r.ok && r.discountPercentage === 33.33, String(r.discountPercentage));
}

// ── ٣. **الصفرُ ليس مجّانياً حتى يُعلَن** ─────────────────────────────────
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 0 });
  check("٦. صفرٌ بلا علم مجّانية يُردّ", !r.ok && /مجاني/.test(r.error ?? ""),
    JSON.stringify(r));
  check("٧. ورسالتُه تدلّ على الخيار الصريح لا «قيمة غير صالحة»",
    (r.error ?? "").includes("تبرع من دكتور ياسر"), r.error);
}
{
  const r = computeServiceDiscount({ originalPrice: 500_000, isFree: true });
  check("٨. علمُ المجّانية يُنتج صفراً وخصماً كاملاً",
    r.ok && r.isFree && r.finalPrice === 0 && r.discountAmount === 500_000
      && r.discountPercentage === 100 && r.needsApproval, JSON.stringify(r));
}
{
  //  **ولا يمرّ «مجّانيٌّ بسعر»**: العلمُ يفرض الصفر ولا يُقرأ الرقم معه.
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 450_000, isFree: true });
  check("٩. «مجّاني بسعر موجب» مستحيل — العلم يفرض الصفر",
    r.ok && r.isFree && r.finalPrice === 0 && r.discountAmount === 500_000,
    JSON.stringify(r));
}

// ── ٤. الحدود ────────────────────────────────────────────────────────────
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 600_000 });
  check("١٠. سعرٌ أعلى من الأصلي يُردّ — هذا باب خصم لا رفع سعر",
    !r.ok && /لا يفوق/.test(r.error ?? ""), JSON.stringify(r));
}
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: -1 });
  check("١١. سالبٌ يُردّ", !r.ok, JSON.stringify(r));
}
{
  const r = computeServiceDiscount({ originalPrice: 0, finalPrice: 0, isFree: true });
  check("١٢. **سعرٌ أصليٌّ صفر يُردّ** — «غير مسعَّر» لا يُخصَم منه ولا يُتبرَّع به",
    !r.ok, JSON.stringify(r));
}
{
  const r = computeServiceDiscount({ originalPrice: -5, finalPrice: 0, isFree: true });
  check("١٣. وأصليٌّ سالب كذلك", !r.ok);
}
{
  const r = computeServiceDiscount({ originalPrice: 500_000.5, finalPrice: 400_000 });
  check("١٤. كسرُ دينارٍ في الأصلي يُردّ", !r.ok);
  const q = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 400_000.25 });
  check("١٥. وكسرُ دينارٍ في النهائي كذلك", !q.ok);
}
{
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: NaN });
  check("١٦. قيمةٌ غير رقمية تُردّ", !r.ok);
  const q = computeServiceDiscount({ originalPrice: 500_000, finalPrice: "abc" as any });
  check("١٧. ونصٌّ غيرُ رقميّ كذلك", !q.ok);
}
{
  //  السلسلةُ الفارغة من النموذج = لم يُكتب شيء.
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: "" as any });
  check("١٨. السلسلة الفارغة تُقرأ «بلا خصم» لا «صفر»",
    r.ok && !r.needsApproval && r.finalPrice === 500_000, JSON.stringify(r));
}
{
  //  دينارٌ واحد: أصغرُ خصمٍ ممكن، ويحتاج اعتماداً كغيره.
  const r = computeServiceDiscount({ originalPrice: 500_000, finalPrice: 499_999 });
  check("١٩. خصمُ دينارٍ واحد خصمٌ يحتاج اعتماداً",
    r.ok && r.needsApproval && r.discountAmount === 1);
}

// ── ٥. الأسباب ───────────────────────────────────────────────────────────
{
  check("٢٠. الأسبابُ منظَّمةٌ لا نصٌّ حرّ",
    DISCOUNT_REASONS.length === 6 && isDiscountReason("humanitarian")
      && !isDiscountReason("لأنه صديقي"));
  check("٢١. وسببُ التبرّع ليس واحداً منها — يكتبه النظام",
    !isDiscountReason(FREE_DONATION_REASON));
  check("٢٢. وعنوانُه ثابتٌ في كل شاشة",
    discountReasonLabel(FREE_DONATION_REASON) === FREE_DONATION_LABEL);
  check("٢٣. وعناوينُ الباقي بالعربية",
    discountReasonLabel("humanitarian") === "حالة إنسانية");
  check("٢٤. الحالاتُ الأربع معرَّفة",
    DISCOUNT_STATUSES.join(",") === "pending,approved,rejected,cancelled");
}

// ── ٦. الصلاحيات ─────────────────────────────────────────────────────────
{
  check("٢٥. المسؤولُ يعتمد", canApproveServiceDiscount({ isAdmin: true, role: "reception" }));
  check("٢٦. **وسلطتُه تسبق دورَه**: مسؤولٌ دورُه استقبال يعتمد",
    canApproveServiceDiscount({ isAdmin: true, role: "reception", permissions: {} }));
  check("٢٧. ومديرُ الفرع يعتمد", canApproveServiceDiscount({ role: "branch_manager" }));
  check("٢٨. **ولا كلُّ طبيبٍ يعتمد** — الخصم قرارٌ ماليّ لا سريريّ",
    !canApproveServiceDiscount({ role: "doctor" }));
  check("٢٩. ولا طبيبٌ يكتب المعاينة",
    !canApproveServiceDiscount({ role: "doctor", permissions: { canWriteMedicalExam: true } }));
  check("٣٠. والمخوَّلُ صراحةً يعتمد ولو كان طبيباً",
    canApproveServiceDiscount({ role: "doctor", permissions: { canApproveDiscount: true } }));
  check("٣١. والاستقبالُ لا يعتمد", !canApproveServiceDiscount({ role: "reception" }));
  check("٣٢. والمحاسبُ ولا خبيرُ الأطراف",
    !canApproveServiceDiscount({ role: "accountant" })
      && !canApproveServiceDiscount({ role: "prosthetics_expert" }));
  check("٣٣. وجلسةٌ فارغة لا تعتمد",
    !canApproveServiceDiscount(null) && !canApproveServiceDiscount(undefined));
  //  **القيمةُ الغامضة تُقرأ «لا»**: "true" نصّاً أو 1 رقماً ليست إذناً.
  check("٣٤. وقيمةٌ غامضة في العَلَم تُقرأ «لا»",
    !canApproveServiceDiscount({ role: "doctor", permissions: { canApproveDiscount: "true" } })
      && !canApproveServiceDiscount({ role: "doctor", permissions: { canApproveDiscount: 1 } }));
}
{
  check("٣٥. الطلبُ لمن يسعّر: استقبالٌ ومديرٌ ومسؤول",
    canRequestServiceDiscount({ role: "reception" })
      && canRequestServiceDiscount({ role: "branch_manager" })
      && canRequestServiceDiscount({ isAdmin: true, role: "accountant" }));
  check("٣٦. ومَن يحمل صلاحية إضافة المرضى",
    canRequestServiceDiscount({ role: "therapist", permissions: { canAddPatients: true } }));
  check("٣٧. ولا يطلبه خبيرُ الأطراف ولا المحاسب",
    !canRequestServiceDiscount({ role: "prosthetics_expert" })
      && !canRequestServiceDiscount({ role: "accountant" }));
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
