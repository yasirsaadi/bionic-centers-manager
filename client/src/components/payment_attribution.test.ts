// إسنادُ الدفعة إلى حالتها — منطقٌ خالص، بلا React.
// `npm run test:pay-attribution`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **لا يُسأل عمّا هو معروف**: مريضُ أطرافٍ لا تُعرَض عليه قائمةُ أنواع
//     العلاج ليختار ما يعرفه النظام أصلاً.
// (٢) **والغموضُ الحقيقيّ يُسأل بصيغته الصحيحة** — «هذه الدفعة تخص أي
//     حالة؟» لا «نوع العلاج»، وبحالات المريض وحدها.
// (٣) **والعلاجُ الطبيعي لا يُمَسّ**: جلساتُه وأسعارُها منطقٌ حقيقيّ.
// (٤) **والملفُّ القديم بلا تصنيف يبقى على القائمة الكاملة** — مخرجُه.

import { readFileSync } from "fs";
import { join } from "path";
import {
  paymentAttribution, showsTreatmentTypes, PAYMENT_CASE_QUESTION,
  CASE_PAYMENT_TAG, CASE_LABEL, isAutoPricedPhysiotherapyAmount,
} from "./payment_attribution";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ إسناد الدفعة ═══\n");

// ── ١. **الحالةُ الواحدة تُحسَم تلقائياً** ──────────────────────────────
console.log("── حالةٌ واحدة ──");
same("١. **أطرافٌ فقط ⟶ تُوسَم تلقائياً**",
  paymentAttribution({ isAmputee: true }),
  { mode: "auto", caseType: "prosthetic", tag: "أطراف صناعية" });
same("٢. **مساندُ فقط ⟶ تُوسَم تلقائياً**",
  paymentAttribution({ isMedicalSupport: true }),
  { mode: "auto", caseType: "medical_support", tag: "مساند طبية" });
same("٣. **وعلاجٌ طبيعي فقط ⟶ شاشتُه كما هي**",
  paymentAttribution({ isPhysiotherapy: true }), { mode: "physio" });
//  **ولا قائمةَ أنواعٍ تُعرَض** حين تُحسَم الحالةُ تلقائياً — وهذا هو
//  العطبُ الذي وُجد على الإنتاج.
check("٤. **ولا تُعرَض قائمةُ أنواع العلاج للحالة المحسومة**",
  !showsTreatmentTypes(paymentAttribution({ isAmputee: true }))
    && !showsTreatmentTypes(paymentAttribution({ isMedicalSupport: true })));
check("٥. **والعلاجُ الطبيعي تُعرَض له** — جلساتُه منطقٌ حقيقيّ",
  showsTreatmentTypes(paymentAttribution({ isPhysiotherapy: true })));

// ── ٢. **السياقُ الصريح يسبق كلَّ استنتاج** ────────────────────────────
console.log("\n── السياق الصريح ──");
same("٦. **تبويبُ حالةٍ بعينها يحسم** ولو حمل المريضُ غيرها",
  paymentAttribution({
    isAmputee: true, isPhysiotherapy: true, selectedCaseType: "medical_support",
  }),
  { mode: "auto", caseType: "medical_support", tag: "مساند طبية" });
same("٧. وتبويبُ العلاج الطبيعي كذلك",
  paymentAttribution({ isAmputee: true, selectedCaseType: "physiotherapy" }),
  { mode: "physio" });
same("٨. **وسياقٌ مجهولٌ لا يُصدَّق** — يُستنتَج من الملفّ",
  paymentAttribution({ isAmputee: true, selectedCaseType: "junk" }),
  { mode: "auto", caseType: "prosthetic", tag: "أطراف صناعية" });

// ── ٣. **الغموضُ الحقيقيّ يُسأل — بحالات المريض وحدها** ────────────────
console.log("\n── الغموض الحقيقي ──");
{
  const a = paymentAttribution({ isAmputee: true, isMedicalSupport: true });
  same("٩. **حالتان ⟶ يُسأل**", a.mode, "ask");
  same("١٠. **وبحالاته هو لا بقائمة النظام**",
    a.mode === "ask" ? a.choices.map((c) => c.caseType) : [],
    ["prosthetic", "medical_support"]);
}
{
  const a = paymentAttribution({ isAmputee: true, isPhysiotherapy: true });
  same("١١. وأطرافٌ وعلاجٌ طبيعي كذلك",
    a.mode === "ask" ? a.choices.map((c) => c.caseType) : [],
    ["prosthetic", "physiotherapy"]);
  //  **ولا يُعرَض ما لا يملكه**: المساندُ ليست في قائمته.
  check("١٢. **ولا يُعرَض عليه ما لا يملكه**",
    a.mode === "ask" && !a.choices.some((c) => c.caseType === "medical_support"));
}
{
  const a = paymentAttribution({ isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true });
  same("١٣. والثلاثةُ معاً", a.mode === "ask" ? a.choices.length : 0, 3);
}
same("١٤. **والسؤالُ ليس «نوع العلاج»**", PAYMENT_CASE_QUESTION, "هذه الدفعة تخص أي حالة؟");
check("١٥. ولا ترد فيه كلمةُ «علاج» بمعنى النوع",
  !PAYMENT_CASE_QUESTION.includes("نوع العلاج"), PAYMENT_CASE_QUESTION);

// ── ٤. **والملفُّ القديم بلا تصنيف: القائمةُ الكاملة** ─────────────────
console.log("\n── الملف القديم ──");
same("١٦. **بلا أيّ حالة ⟶ لا يُخمَّن شيء**", paymentAttribution({}), { mode: "unknown" });
check("١٧. **وتُعرَض له القائمةُ الكاملة** — مخرجُه كما كان",
  showsTreatmentTypes(paymentAttribution({})));
same("١٨. وبلا سياقٍ إطلاقاً", paymentAttribution(null), { mode: "unknown" });
//  **والعلمُ الغامض ليس حالة**: "true" نصّاً أو 1 رقماً لا يُقرأ نعم.
same("١٩. **والقيمةُ الغامضة تُقرأ «لا»**",
  paymentAttribution({ isAmputee: "true" as any, isPhysiotherapy: 1 as any }),
  { mode: "unknown" });

// ── ٥. الوسمُ المخزَّن ─────────────────────────────────────────────────
console.log("\n── الوسم ──");
same("٢٠. **والوسمُ نصُّ القسم كما يُخزَّن**",
  [CASE_PAYMENT_TAG.prosthetic, CASE_PAYMENT_TAG.medical_support],
  ["أطراف صناعية", "مساند طبية"]);
same("٢١. وعناوينُ العرض ثلاثة",
  [CASE_LABEL.prosthetic, CASE_LABEL.medical_support, CASE_LABEL.physiotherapy],
  ["أطراف صناعية", "مساند طبية", "علاج طبيعي"]);

// ── ٦. **والنافذةُ تستعمل هذه القاعدة فعلاً** ──────────────────────────
console.log("\n── عقد النافذة ──");
{
  const src = readFileSync(join(import.meta.dirname, "./PaymentModal.tsx"), "utf8");
  check("٢٢. **النافذةُ تستورد القاعدة ولا تكرّرها**",
    src.includes("payment_attribution") && src.includes("paymentAttribution({"));
  check("٢٣. **وقائمةُ الأنواع مربوطةٌ بها**",
    src.includes("showsTreatmentTypes(attribution)"),
    (src.match(/.*showTreatmentSection =.*/g) ?? []).join("\n"));
  check("٢٤. **والسؤالُ الصحيح معروضٌ حين يلزم**",
    src.includes("PAYMENT_CASE_QUESTION") && src.includes("select-payment-case"));
  check("٢٥. **والحالةُ المحسومة تُقال ولا تُسأل**",
    src.includes("text-payment-case-auto"));
  //  **ولا يُرسَل وسمٌ فارغٌ حين تُحسَم الحالة** — كلُّ دفعةٍ تبقى موسومة.
  check("٢٦. **والوسمُ يُشتقّ من الحالة حين تُخفى القائمة**",
    src.includes("CASE_PAYMENT_TAG[resolvedCase]"),
    (src.match(/.*autoTag.*/g) ?? []).join("\n"));
}

// ── ٧. **قفلُ المبلغ يتبع الدفعةَ لا تاريخَ المريض** (حادثة إنتاج) ──────
// مريضٌ يحمل علاجاً طبيعياً وأطرافاً معاً: كان حقلُ المبلغ يُقفَل في دفعة
// أطرافه لمجرّد أنّ isPhysiotherapy=true على ملفّه، رغم اختيار الاستقبال
// الصريح لحالة «أطراف صناعية» لهذه الدفعة بعينها.
console.log("\n── قفلُ مبلغ الدفعة (isAutoPricedPhysiotherapyAmount) ──");

//  حالةٌ محسومة (auto) أو مُجابةٌ (ask+askedCase) — كما يشتقّها المكوّن.
function resolvedCaseOf(
  a: ReturnType<typeof paymentAttribution>, askedCase: string,
): "prosthetic" | "medical_support" | "physiotherapy" | null {
  return a.mode === "auto" ? a.caseType
    : a.mode === "physio" ? "physiotherapy"
      : a.mode === "ask" && askedCase ? (askedCase as any) : null;
}

//  ── المريضُ المختلط: علاجٌ طبيعي + أطراف — هو المريضُ الحقيقيّ على
//     الإنتاج الذي فتح هذا العطب.
{
  const mixed = paymentAttribution({ isPhysiotherapy: true, isAmputee: true });
  same("٢٧. **مختلطٌ (علاج طبيعي+أطراف) ⟶ يُسأل**", mixed.mode, "ask");
  const resolved = resolvedCaseOf(mixed, "prosthetic");
  same("٢٨. **واختيارُ «أطراف صناعية» يحسم الحالة**", resolved, "prosthetic");
  check("٢٩. **فحقلُ المبلغ ليس محميّاً — الاستقبالُ يكتب يدوياً**",
    !isAutoPricedPhysiotherapyAmount(resolved, false),
    `isAutoPricedPhysiotherapyAmount("${resolved}", false)`);
}

//  ── مختلطٌ: علاجٌ طبيعي + مساند — نفسُ القاعدة على الحالة الأخرى.
{
  const mixed = paymentAttribution({ isPhysiotherapy: true, isMedicalSupport: true });
  const resolved = resolvedCaseOf(mixed, "medical_support");
  same("٣٠. **واختيارُ «مساند طبية» يحسمها كذلك**", resolved, "medical_support");
  check("٣١. **فالمبلغُ يدويٌّ هنا أيضاً**",
    !isAutoPricedPhysiotherapyAmount(resolved, false));
}

//  ── ونفسُ المريض المختلط، لو اختار الاستقبالُ «علاج طبيعي» — يبقى محمياً
//     كما كان، بلا تغيير في سلوك التسعير التلقائي.
{
  const mixed = paymentAttribution({ isPhysiotherapy: true, isAmputee: true });
  const resolved = resolvedCaseOf(mixed, "physiotherapy");
  same("٣٢. **واختيارُ «علاج طبيعي» من نفس المريض المختلط**", resolved, "physiotherapy");
  check("٣٣. **يبقى المبلغُ محمياً — سلوكُ العلاج الطبيعي كما هو**",
    isAutoPricedPhysiotherapyAmount(resolved, false));
}

//  ── علاجٌ طبيعي خالص: يبقى محمياً كما كان قبل هذا التصحيح.
{
  const pure = paymentAttribution({ isPhysiotherapy: true });
  const resolved = resolvedCaseOf(pure, "");
  same("٣٤. **علاجٌ طبيعي خالص ⟶ الحالةُ معروفة تلقائياً**", resolved, "physiotherapy");
  check("٣٥. **ومبلغُه محميٌّ لغير المسؤول كما قبل التصحيح**",
    isAutoPricedPhysiotherapyAmount(resolved, false));
  //  إلّا حين يختار الاستقبالُ بنداً يدوياً (أطراف/مساند) ضمن جلساته —
  //  تسديدُ رصيدٍ قديم لمريضٍ علاجه الحاليّ طبيعيّ.
  check("٣٦. **إلّا حين يحمل بنداً يدوياً (رصيدٌ قديم) — فيُفتَح**",
    !isAutoPricedPhysiotherapyAmount(resolved, true));
}

//  ── أطرافٌ خالصةٌ: لم تكن محميّةً قبل التصحيح، وتبقى كذلك.
{
  const pure = paymentAttribution({ isAmputee: true });
  const resolved = resolvedCaseOf(pure, "");
  same("٣٧. **أطرافٌ خالصةٌ ⟶ الحالةُ معروفة تلقائياً**", resolved, "prosthetic");
  check("٣٨. **ومبلغُها لم يكن محمياً ويبقى كذلك**",
    !isAutoPricedPhysiotherapyAmount(resolved, false));
}

//  ── ملفٌّ بلا حالةٍ محسومة بعد (لم يُسأل السؤالُ أو لم يُجَب بعد): لا
//     قفل — الإرسالُ نفسُه يُمنَع بسؤال منفصل (attribution.mode === "ask").
check("٣٩. **وبلا حالةٍ محسومة (null) — لا قفل**",
  !isAutoPricedPhysiotherapyAmount(null, false));

//  ── وقاعدةُ الإداري: هذه الدالّةُ لا تعرف شيئاً عن isAdmin — القفلُ
//     الفعليّ في الشاشة `!isAdmin && amountIsAutoPricedPhysio`، فالمسؤولُ
//     يبقى قادراً على الكتابة دائماً بصرف النظر عن نتيجة هذه الدالّة.
console.log("\n── عقدُ الربط في النافذة (readOnly) ──");
{
  const src = readFileSync(join(import.meta.dirname, "./PaymentModal.tsx"), "utf8");
  check("٤٠. **النافذةُ تستورد `isAutoPricedPhysiotherapyAmount` ولا تكرّر القاعدة**",
    src.includes("isAutoPricedPhysiotherapyAmount"));
  check("٤١. **وحقلُ القفل القديم (العلمُ التاريخيّ) لم يعد يحرس شيئاً**",
    !/readOnly=\{!isAdmin && isPhysiotherapy === true/.test(src),
    (src.match(/readOnly=\{.*\}/g) ?? []).join("\n"));
  check("٤٢. **وحقلُ `readOnly` مربوطٌ بمتغيّرٍ واحدٍ يشتقّ من الدالّة المشتركة**",
    /readOnly=\{!isAdmin && amountIsAutoPricedPhysio\}/.test(src));
  check("٤٣. **والمسؤولُ يتجاوز القفلَ دائماً** (`!isAdmin &&` تسبق الشرط)",
    /readOnly=\{!isAdmin && amountIsAutoPricedPhysio\}/.test(src));
  //  ولا نسخةَ ثانية من هذه القاعدة متفرّقة في المكوّن — استدعاءٌ واحد فقط.
  const calls = (src.match(/isAutoPricedPhysiotherapyAmount\(/g) ?? []).length;
  same("٤٤. **واستدعاءٌ واحدٌ فقط للدالّة — لا نسخةَ موازية**", calls, 1);
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
