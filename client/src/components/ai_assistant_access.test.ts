// ظهور المساعد الذكي وأمثلته — منطقٌ خالص، بلا قاعدة بيانات ولا DOM.
// `npm run test:ai-ui`.
//
// ══ حدُّ ما يحرسه ═══════════════════════════════════════════════════════
// هذا **عرضٌ لا حراسة**. الحراسة في الخادم ومُختبَرةٌ هناك
// (`npm run test:ai-confidentiality`): موظّفٌ عادي لا تُقرأ له القاعدة
// المالية أصلاً مهما فعل العميل. وما هنا يمنع عرضَ اقتراحٍ لا ينفع صاحبه.
//
// (١) **الزرّ لكلّ موظّف مصادَق** — بعد أن صار للمساعد وضعٌ عام نافع.
// (٢) **ولا مثالَ مالياً لمن لا يملك المحاسبة**: سؤالٌ يُردّ باعتذارٍ ليس
//     اقتراحاً بل إحباط.
// (٣) **ونصّ التعريف يصف ما يستطيعه هذا المستخدم بالذات** لا ما يستطيعه غيره.

import {
  canOpenAssistant, FINANCE_SUGGESTIONS, GENERAL_SUGGESTIONS,
  introTextFor, scopeLabelFor, sessionHasFinance, suggestionsFor,
} from "./ai_assistant_access";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const staff = { isAdmin: false, branchName: "بغداد", permissions: { canViewPatients: true } };
const doctor = { isAdmin: false, branchName: "بغداد", permissions: { canWriteMedicalExam: true } };
const expert = { isAdmin: false, branchName: "ذي قار", permissions: { canWorkAsExpert: true } };
const accountant = { isAdmin: false, branchName: "بغداد", permissions: { canManageAccounting: true } };
const admin = { isAdmin: true, branchName: null, permissions: { canManageAccounting: true } };

// ══ أ. مَن يرى الزرّ ═══════════════════════════════════════════════════
console.log("\n── الظهور ──");
for (const [label, s] of [["موظّف الاستقبال", staff], ["الطبيب", doctor],
  ["خبير الأطراف", expert], ["المحاسب", accountant], ["المسؤول", admin]] as any[]) {
  same(`أ. ${label} ⟶ يرى المساعد`, canOpenAssistant(s, true), true);
}
same("   وحين تكون الخدمة غير مفعّلة ⟶ لا يظهر لأحد", canOpenAssistant(admin, false), false);
same("   وقبل وصول حالة الخدمة ⟶ لا يظهر", canOpenAssistant(admin, undefined), false);
same("   وبلا جلسة ⟶ لا يظهر", canOpenAssistant(null, true), false);

// ══ ب. قاعدة المال — نفس قاعدة الخادم حرفياً ══════════════════════════
console.log("\n── قاعدة المال ──");
same("ب. المسؤول ⟶ مالي", sessionHasFinance(admin), true);
same("   والمحاسب ⟶ مالي", sessionHasFinance(accountant), true);
same("   **والموظّف والطبيب والخبير ⟶ لا**",
  [staff, doctor, expert].map(sessionHasFinance), [false, false, false]);
same("   والغموض يُقرأ «لا»",
  sessionHasFinance({ permissions: { canManageAccounting: 1 } } as any), false);

// ══ ج. الأمثلة ════════════════════════════════════════════════════════
console.log("\n── الأمثلة ──");
same("ج. **الموظّف يرى الأمثلة العامّة وحدها**", suggestionsFor(staff), GENERAL_SUGGESTIONS);
same("   ولا مثالَ مالياً واحداً فيها",
  suggestionsFor(staff).filter((s) => FINANCE_SUGGESTIONS.includes(s)), []);
same("   ولا كلمةَ مالٍ في نصّها",
  suggestionsFor(staff).filter((s) => /إيراد|مصاريف|ذمم|القاصة|مبلغ|دينار/.test(s)), []);
same("   والمحاسب يرى الاثنين",
  suggestionsFor(accountant), [...FINANCE_SUGGESTIONS, ...GENERAL_SUGGESTIONS]);
same("   والمسؤول كذلك",
  suggestionsFor(admin).filter((s) => FINANCE_SUGGESTIONS.includes(s)), FINANCE_SUGGESTIONS);
same("   والأمثلة العامّة أربعةٌ عن النظام نفسه",
  [GENERAL_SUGGESTIONS.length, GENERAL_SUGGESTIONS[0]], [4, "كيف أسجل مريضاً جديداً؟"]);

// ══ د. النصوص ═════════════════════════════════════════════════════════
console.log("\n── النصوص ──");
same("د. تعريف الموظّف يقول صراحةً إنه لا يطّلع على المال",
  introTextFor(staff).includes("لا أطّلع على البيانات المالية"), true);
same("   ولا يَعِد بما لا يستطيع",
  /إيرادات|المصاريف|القاصة/.test(introTextFor(staff)), false);
same("   وتعريف المحاسب يبقى كما كان", introTextFor(accountant).includes("إيرادات الفرع"), true);
same("   ووصف نطاق الموظّف بلا فرعٍ مالي", scopeLabelFor(staff), "مساعد النظام");
same("   والمحاسب بفرعه", scopeLabelFor(accountant), "نطاق: بغداد");
same("   والمسؤول بكل الفروع", scopeLabelFor(admin), "نطاق: كل الفروع");
same("   ومحاسبٌ بلا اسم فرع", scopeLabelFor({ ...accountant, branchName: null }), "نطاق: فرعك");

console.log(`\n${failures === 0 ? "✅ all ai-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
