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
  CASE_PAYMENT_TAG, CASE_LABEL,
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

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
