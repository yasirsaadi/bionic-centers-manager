// قاعدة وصول المساعد الذكي — منطقٌ خالص، بلا قاعدة بيانات ولا شبكة.
// `npm run test:ai-access`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **القاعدة بحرفها**: مسؤولٌ أو صاحب `canManageAccounting`، لا غير.
// (٢) **لا شيء من العميل يرفع صلاحية**: الدالّة لا تقبل طلباً أصلاً، وما
//     يُرسَل في الجسم أو في نصّ الرسالة لا سبيل له إليها.
// (٣) **الغموض يُقرأ «لا»**: قيمةٌ ليست `true` تماماً لا تفتح باب المال.
// (٤) **غير المسؤول بلا فرعٍ محسوم لا يُرقّى إلى كلّ الفروع** — بل يُخفَّض
//     إلى الوضع العام. غيابُ النطاق ليس إذناً بأوسعه.

import { computeCanUseFinance, resolveAiAccess } from "./access";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const staff = { userId: 5, role: "reception", isAdmin: false, branchId: 1, permissions: { canViewPatients: true, canAddPatients: true } };
const accountant = { userId: 6, role: "reception", isAdmin: false, branchId: 1, permissions: { canManageAccounting: true } };
const manager = { userId: 7, role: "branch_manager", isAdmin: false, branchId: 2, permissions: { canManageAccounting: true } };
const admin = { userId: 1, role: "admin", isAdmin: true, branchId: 0, permissions: { canManageAccounting: true } };

// ══ أ. القاعدة ════════════════════════════════════════════════════════
console.log("\n── القاعدة ──");
same("أ. المسؤول ⟶ نعم", computeCanUseFinance(admin), true);
same("   وصاحب canManageAccounting ⟶ نعم", computeCanUseFinance(accountant), true);
same("   **والموظّف العادي ⟶ لا**", computeCanUseFinance(staff), false);
same("   ومدير الفرع بلا محاسبة ⟶ لا",
  computeCanUseFinance({ ...manager, permissions: {} }), false);
same("   وجلسةٌ غائبة ⟶ لا", computeCanUseFinance(undefined), false);
same("   وجلسةٌ بلا صلاحيات ⟶ لا", computeCanUseFinance({ userId: 9 }), false);

console.log("\n── الغموض يُقرأ «لا» ──");
for (const [label, value] of [["نصّ \"true\"", "true"], ["الرقم ١", 1], ["كائن", {}], ["null", null]] as any[]) {
  same(`   canManageAccounting = ${label} ⟶ لا`,
    computeCanUseFinance({ permissions: { canManageAccounting: value } }), false);
}
same("   isAdmin = \"yes\" ⟶ لا", computeCanUseFinance({ isAdmin: "yes" } as any), false);

// ══ ب. لا ترقية من العميل ═════════════════════════════════════════════
//  التوقيع نفسه هو الحراسة: لا مكان لحقلٍ وارد من الطلب. وهذه الحالات
//  تحاكي ما قد يرسله عميلٌ مُلفَّق — فتُهمَل كلّها لأنها ليست جلسة.
console.log("\n── لا ترقية من العميل ──");
const forged = resolveAiAccess({
  session: staff,
  scopeBranchId: 1,
});
same("ب. موظّفٌ عادي ⟶ الوضع عام", [forged.canUseFinance, forged.mode], [false, "general"]);
same("   ودورُه من الجلسة لا من ادّعائه", forged.role, "reception");
const forgedPermsInSession = resolveAiAccess({
  //  حتى لو حُقنت الصلاحية في **الجلسة نفسها** فهي المصدر الشرعي الوحيد،
  //  وتلك مسؤولية تسجيل الدخول لا مسؤولية هذا الملفّ.
  session: { ...staff, permissions: { ...staff.permissions, canManageAccounting: true } },
  scopeBranchId: 1,
});
same("   والجلسة وحدها هي التي تُرقّي",
  [forgedPermsInSession.canUseFinance, forgedPermsInSession.mode], [true, "financial"]);

// ══ ج. النطاق ═════════════════════════════════════════════════════════
console.log("\n── النطاق ──");
const acc1 = resolveAiAccess({ session: accountant, branchName: "بغداد", scopeBranchId: 1 });
same("ج. محاسب الفرع ١ ⟶ نطاقه ١", [acc1.mode, acc1.branchId, acc1.branchName],
  ["financial", 1, "بغداد"]);
const acc2 = resolveAiAccess({ session: manager, branchName: "ذي قار", scopeBranchId: 2 });
same("   ومحاسب الفرع ٢ ⟶ نطاقه ٢", [acc2.mode, acc2.branchId], ["financial", 2]);
const adm = resolveAiAccess({ session: admin, scopeBranchId: undefined });
same("   والمسؤول بلا اختيار ⟶ كل الفروع", [adm.mode, adm.branchId], ["financial", null]);
const admPicked = resolveAiAccess({ session: admin, branchName: "ذي قار", scopeBranchId: 2 });
same("   والمسؤول باختياره ⟶ الفرع المختار", [admPicked.mode, admPicked.branchId], ["financial", 2]);

console.log("\n── غياب النطاق ليس إذناً بأوسعه ──");
const orphan = resolveAiAccess({ session: { ...accountant, branchId: null }, scopeBranchId: undefined });
same("   **محاسبٌ بلا فرعٍ محسوم ⟶ يُخفَّض إلى العام لا يُرقّى إلى كل الفروع**",
  [orphan.canUseFinance, orphan.mode, orphan.financeScopeMissing, orphan.branchId],
  [true, "general", true, null]);
same("   والمسؤول ليس كذلك — «كل الفروع» نطاقُه الشرعي",
  [adm.financeScopeMissing, adm.mode], [false, "financial"]);

// ══ د. حقول السياق ════════════════════════════════════════════════════
console.log("\n── السياق ──");
same("د. المعرّفات تُنقل كما هي", [acc1.userId, acc1.isAdmin, acc1.role], [6, false, "reception"]);
same("   والدور يُشتقّ حين يغيب",
  resolveAiAccess({ session: { isAdmin: true } }).role, "admin");
same("   وغير المسؤول بلا دور ⟶ staff",
  resolveAiAccess({ session: { isAdmin: false } }).role, "staff");
same("   وجلسةٌ معدومة تماماً لا تُسقط شيئاً",
  (() => { const a = resolveAiAccess({ session: null }); return [a.mode, a.userId, a.canUseFinance]; })(),
  ["general", null, false]);

console.log(`\n${failures === 0 ? "✅ all ai-access cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
