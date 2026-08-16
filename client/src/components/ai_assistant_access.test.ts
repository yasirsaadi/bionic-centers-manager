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

import { readFileSync } from "fs";
import { join } from "path";
import {
  canOpenAssistant, DOCTOR_SUGGESTIONS, EXPERT_SUGGESTIONS, FINANCE_SUGGESTIONS,
  GENERAL_SUGGESTIONS, introTextFor, PHYSIO_SUGGESTIONS, RECEPTION_SUGGESTIONS,
  scopeLabelFor, sessionHasFinance, suggestionsFor,
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

const staff = { isAdmin: false, role: "reception", branchName: "بغداد", permissions: { canViewPatients: true, canAddPatients: true } };
const doctor = { isAdmin: false, role: "doctor", branchName: "بغداد", permissions: { canWriteMedicalExam: true } };
const expert = { isAdmin: false, role: "prosthetics_expert", branchName: "ذي قار", permissions: { canWorkAsExpert: true } };
const accountant = { isAdmin: false, branchName: "بغداد", permissions: { canManageAccounting: true } };
const admin = { isAdmin: true, branchName: null, permissions: { canManageAccounting: true } };
//  مُدخِل الجلسات — **القدرة الحقيقية `canEnterSessions`**، وهي نفس شرط
//  الطابور في الخادم. ومديرُ الفرع يحملها ضمناً كما هناك.
const sessionEntry = { isAdmin: false, role: "reception", branchName: "بغداد", permissions: { canViewPatients: true, canEnterSessions: true } };
const manager = { isAdmin: false, role: "branch_manager", branchName: "بغداد", permissions: {} };

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
same("ج. **الموظّف يرى سؤال طوابيره ثمّ العامّة — ولا شيء غيرها**",
  suggestionsFor(staff), [...RECEPTION_SUGGESTIONS, ...GENERAL_SUGGESTIONS]);
same("   ولا مثالَ مالياً واحداً فيها",
  suggestionsFor(staff).filter((s) => FINANCE_SUGGESTIONS.includes(s)), []);
same("   ولا كلمةَ مالٍ في نصّها",
  suggestionsFor(staff).filter((s) => /إيراد|مصاريف|ذمم|القاصة|مبلغ|دينار/.test(s)), []);
same("   والمحاسب يرى المالية أيضاً",
  suggestionsFor(accountant).filter((s) => FINANCE_SUGGESTIONS.includes(s)), FINANCE_SUGGESTIONS);
same("   والمسؤول كذلك",
  suggestionsFor(admin).filter((s) => FINANCE_SUGGESTIONS.includes(s)), FINANCE_SUGGESTIONS);
same("   والأمثلة العامّة تبدأ بـ«ما مهامي الآن؟» — وهي أداةٌ حيّة لا شرح",
  GENERAL_SUGGESTIONS[0], "ما مهامي الآن؟");

// ══ ج2. الأمثلة بحسب الدور — لا يُعرض ما سيردّه الخادم ═════════════════
console.log("\n── الأمثلة بحسب الدور ──");
same("   الطبيب يرى سؤال قائمة معايناته",
  suggestionsFor(doctor).includes(DOCTOR_SUGGESTIONS[0]), true);
same("   والخبير سؤال أوامره",
  suggestionsFor(expert).includes(EXPERT_SUGGESTIONS[0]), true);
same("   والاستقبال سؤال طوابير فرعه",
  suggestionsFor(staff).includes(RECEPTION_SUGGESTIONS[0]), true);
same("   **ولا يُعرض على الخبير سؤالُ طوابير الفرع** (الخادم يردّه)",
  suggestionsFor(expert).includes(RECEPTION_SUGGESTIONS[0]), false);
same("   ولا سؤالُ المعاينات على غير الطبيب",
  suggestionsFor(staff).includes(DOCTOR_SUGGESTIONS[0]), false);
same("   ولا سؤالُ الأوامر على غير الخبير",
  suggestionsFor(doctor).includes(EXPERT_SUGGESTIONS[0]), false);
same("   ولا تكرارَ في القائمة",
  (() => { const l = suggestionsFor(admin); return l.length - new Set(l).size; })(), 0);

// ══ ج3. مثالُ العلاج الطبيعي — **مُدرَجٌ لا معلَّق** ═══════════════════
//  كان الثابت مصدَّراً ولا يصل إليه أحد، فيبدو المثال موجوداً وهو ميّت.
//  والشرط هنا **نفس شرط الطابور في الخادم حرفياً**
//  (`canEnterSessions ∨ admin ∨ branch_manager`)، فلا يُعرَض سؤالٌ يُردّ
//  ولا يُحرَم منه مَن يستطيع جوابه.
console.log("\n── مثال العلاج الطبيعي ──");
check(suggestionsFor(sessionEntry).includes(PHYSIO_SUGGESTIONS[0]),
  "   **مُدخِل الجلسات يرى مثال العلاج الطبيعي** — فالثابت مُدرَجٌ فعلاً",
  JSON.stringify(suggestionsFor(sessionEntry)));
same("   ومديرُ الفرع كذلك",
  suggestionsFor(manager).includes(PHYSIO_SUGGESTIONS[0]), true);
same("   والمسؤول كذلك",
  suggestionsFor(admin).includes(PHYSIO_SUGGESTIONS[0]), true);
same("   **وموظّفٌ بلا `canEnterSessions` لا يراه** (الخادم يردّه)",
  suggestionsFor(staff).includes(PHYSIO_SUGGESTIONS[0]), false);
same("   ولا الطبيبُ ولا الخبير",
  [doctor, expert].map((s) => suggestionsFor(s).includes(PHYSIO_SUGGESTIONS[0])), [false, false]);
same("   ولا مالَ فيه", /إيراد|مصاريف|ذمم|القاصة|كلفة|دينار/.test(PHYSIO_SUGGESTIONS[0]), false);
//  وكلُّ ثابتٍ مصدَّر يجب أن يصل إلى مستعمِلٍ واحدٍ على الأقلّ — وإلّا كرّرنا
//  العلّة نفسها في المثال التالي.
same("   **ولا ثابتَ أمثلةٍ معلَّق بلا مستعمِل**",
  [DOCTOR_SUGGESTIONS, EXPERT_SUGGESTIONS, RECEPTION_SUGGESTIONS, PHYSIO_SUGGESTIONS,
    FINANCE_SUGGESTIONS, GENERAL_SUGGESTIONS]
    .filter((list) => !list.every((s) =>
      [staff, doctor, expert, accountant, admin, sessionEntry, manager]
        .some((who) => suggestionsFor(who).includes(s)))),
  []);

// ══ د. النصوص ═════════════════════════════════════════════════════════
console.log("\n── النصوص ──");
same("د. **تعريف الموظّف يعلن القراءة الحيّة**",
  /أقرأ النظام مباشرةً ضمن صلاحياتك/.test(introTextFor(staff)), true);
same("   ويضرب مثال الرمز بصيغته",
  /WB-\d{5}/.test(introTextFor(staff)), true);
same("   ويقول صراحةً إنه لا يطّلع على المال",
  introTextFor(staff).includes("لا أطّلع عليها"), true);
same("   ولا يَعِد غير المالي بإيرادٍ ولا قاصّة",
  /إيرادات الفرع|رصيد القاصة/.test(introTextFor(staff)), false);
same("   **ولم يبقَ ادّعاءُ العجز عن القراءة الحيّة**",
  /لا أستطيع قراءة|لا أطّلع على السجل/.test(introTextFor(staff)), false);
same("   وتعريف المحاسب يجمع الحيّ والمالي",
  [/أقرأ النظام مباشرةً/.test(introTextFor(accountant)), introTextFor(accountant).includes("إيرادات الفرع")], [true, true]);
same("   ووصف نطاق الموظّف بلا فرعٍ مالي", scopeLabelFor(staff), "مساعد النظام");
same("   والمحاسب بفرعه", scopeLabelFor(accountant), "نطاق: بغداد");
same("   والمسؤول بكل الفروع", scopeLabelFor(admin), "نطاق: كل الفروع");
same("   ومحاسبٌ بلا اسم فرع", scopeLabelFor({ ...accountant, branchName: null }), "نطاق: فرعك");

// ══ هـ. إغلاق النافذة يمسح المحادثة ═══════════════════════════════════
//  **عقدُ مصدر**: لا مشغّل DOM، فالمُثبَت أن مسار الإغلاق واحدٌ يمسح
//  الرسائل والمسوّدة معاً — لا أن المتصفّح رسم ذلك. والسبب أن المساعد صار
//  يقرأ ملفّات حيّة، فبقاءُ سياق مريضٍ سابق يجعله يجيب عن غير مَن أمامك.
console.log("\n── إغلاق النافذة ──");
{
  const drawer = readFileSync(join(process.cwd(), "client/src/components/AiChatDrawer.tsx"), "utf8");
  const body = drawer.slice(drawer.indexOf("const closeDrawer"), drawer.indexOf("const askMutation"));
  check(/setOpen\(false\)/.test(body) && /setMessages\(\[\]\)/.test(body) && /setDraft\(""\)/.test(body),
    "هـ. **الإغلاق يمسح الرسائل والمسوّدة معاً**", body);
  const closes = (drawer.match(/setOpen\(false\)/g) ?? []).length;
  same("   **ولا مسارَ إغلاقٍ آخر يتخطّى المسح**", closes, 1);
  same("   وكلا زرّي الإغلاق يمرّان به",
    (drawer.match(/onClick=\{closeDrawer\}/g) ?? []).length, 2);
  check(!/localStorage|sessionStorage/.test(drawer),
    "   ولا تُحفَظ محادثةُ مريضٍ في المتصفّح إطلاقاً");
}

console.log(`\n${failures === 0 ? "✅ all ai-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
