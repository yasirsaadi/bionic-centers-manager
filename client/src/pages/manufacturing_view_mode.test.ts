//  عينُ لوحة التصنيع — منطقٌ خالص، بلا قاعدة بيانات ولا DOM.
//  `npm run test:manufacturing-view`.
//
//  ══ ما يحرسه ═══════════════════════════════════════════════════════════
//  (١) **الخبيرُ بدوره** ⟶ `my-orders`.
//  (٢) **وصاحبُ القدرة بلا الدور** ⟶ `my-orders` كذلك — وهو العطبُ بعينه:
//      الشريطُ الجانبيُّ يفتح له الصفحة، والخادمُ يقبله على `my-orders`،
//      وكانت الصفحةُ وحدها ترسله إلى `/orders` فيرى لوحةً فارغة.
//  (٣) **ومديرُ فرعٍ يحمل القدرة يبقى مديراً** ⟶ `orders` لا `my-orders`.
//      تضييقُ نظرته إلى أوامره هو يُخفي عنه عملَ فريقه — وهو أسوأ من
//      العطب الذي نصلحه.
//  (٤) **والمسؤولُ العام** ⟶ `orders`.
//  (٥) وعقدُ الشاشة: الصفحةُ تستعمل الحاسمَ ولا تعيد كتابة قاعدته.

import {
  resolveManufacturingView,
  EXPERT_ORDERS_ENDPOINT,
  BOARD_ORDERS_ENDPOINT,
} from "./manufacturing_view_mode";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

// ═══ أ: الخبيرُ بدوره ════════════════════════════════════════════════════
console.log("\n── أ: الخبيرُ بدوره ──");
const pureExpert = resolveManufacturingView({
  isAdmin: false, role: "prosthetics_expert", canWorkAsExpert: false,
});
check(pureExpert.expertOnly, "أ.١ **شاشةُ الخبير وحدَه**");
same("أ.٢ **والنقطةُ `my-orders`**", pureExpert.endpoint, EXPERT_ORDERS_ENDPOINT);
check(!pureExpert.showExpertFilter, "أ.٣ ولا مرشِّحَ خبير");
check(pureExpert.isExpertRole && pureExpert.worksAsExpert, "أ.٤ ودورُه خبيرٌ فعلاً");
//  والعَلَمُ المرفوع معه لا يغيّر شيئاً — الدورُ كافٍ وحدَه.
same("أ.٥ ودورٌ خبيرٌ **مع** القدرة ⟶ النقطةُ نفسُها",
  resolveManufacturingView({ isAdmin: false, role: "prosthetics_expert", canWorkAsExpert: true }).endpoint,
  EXPERT_ORDERS_ENDPOINT);

// ═══ ب: القدرةُ بلا الدور — العطبُ بعينه ═════════════════════════════════
console.log("\n── ب: القدرةُ بلا الدور ──");
for (const role of ["reception", "accountant", "doctor", "therapist"]) {
  const capOnly = resolveManufacturingView({ isAdmin: false, role, canWorkAsExpert: true });
  check(capOnly.expertOnly, `ب.١ **${role} + canWorkAsExpert ⟶ شاشةُ الخبير**`);
  same(`ب.٢ **و${role} يُسأل \`my-orders\`**`, capOnly.endpoint, EXPERT_ORDERS_ENDPOINT);
  check(!capOnly.isExpertRole && capOnly.worksAsExpert,
    `ب.٣ و${role} يعمل خبيراً بقدرته لا بدوره`);
}
//  **ومَن لا دورَ له ولا قدرة يبقى كما كان** — لا يُرقّى بهذا الإصلاح.
const plain = resolveManufacturingView({ isAdmin: false, role: "reception", canWorkAsExpert: false });
check(!plain.expertOnly && !plain.worksAsExpert, "ب.٤ **ولا يُرقّى مَن لا قدرةَ له ولا دور**");
same("ب.٥ ونقطتُه كما كانت", plain.endpoint, BOARD_ORDERS_ENDPOINT);

// ═══ ج: مديرُ الفرع يبقى مديراً ولو حمل القدرة ═══════════════════════════
console.log("\n── ج: مديرُ الفرع ──");
const mgrExpert = resolveManufacturingView({
  isAdmin: false, role: "branch_manager", canWorkAsExpert: true,
});
check(!mgrExpert.expertOnly, "ج.١ **مديرُ فرعٍ يحمل القدرة ليس شاشةَ خبير**");
same("ج.٢ **ونقطتُه `orders` لا `my-orders`**", mgrExpert.endpoint, BOARD_ORDERS_ENDPOINT);
check(mgrExpert.endpoint !== EXPERT_ORDERS_ENDPOINT, "ج.٢ب — صراحةً: ليست `my-orders`");
check(mgrExpert.isManager && mgrExpert.showExpertFilter,
  "ج.٣ ونظرتُه الإدارية كاملةً — بمرشِّح الخبير");
check(mgrExpert.worksAsExpert, "ج.٤ **وهو يعمل خبيراً فعلاً** — لكنّ الإدارةَ تسبق");
//  ومديرُ فرعٍ بلا قدرة — كما كان بحرفه.
const mgrPlain = resolveManufacturingView({ isAdmin: false, role: "branch_manager", canWorkAsExpert: false });
same("ج.٥ ومديرٌ بلا قدرة كما كان", mgrPlain.endpoint, BOARD_ORDERS_ENDPOINT);
check(!mgrPlain.expertOnly && mgrPlain.showExpertFilter, "ج.٥ب ونظرتُه كما هي");

// ═══ د: المسؤولُ العام ═══════════════════════════════════════════════════
console.log("\n── د: المسؤولُ العام ──");
for (const canWork of [false, true]) {
  const adm = resolveManufacturingView({ isAdmin: true, role: "admin", canWorkAsExpert: canWork });
  check(!adm.expertOnly, `د.١ **المسؤولُ ليس شاشةَ خبير** (canWorkAsExpert=${canWork})`);
  same(`د.٢ **ونقطتُه \`orders\`** (canWorkAsExpert=${canWork})`, adm.endpoint, BOARD_ORDERS_ENDPOINT);
  check(adm.showExpertFilter, `د.٣ وبمرشِّح الخبير (canWorkAsExpert=${canWork})`);
}
//  **ومسؤولٌ دورُه خبير** — الصفةُ الإدارية تسبق الدورَ أيضاً.
const admExpertRole = resolveManufacturingView({
  isAdmin: true, role: "prosthetics_expert", canWorkAsExpert: true,
});
check(!admExpertRole.expertOnly, "د.٤ **ومسؤولٌ دورُه خبيرٌ يبقى إدارياً**");
same("د.٥ ونقطتُه `orders`", admExpertRole.endpoint, BOARD_ORDERS_ENDPOINT);

// ═══ هـ: الحدود ══════════════════════════════════════════════════════════
console.log("\n── هـ: الحدود ──");
for (const v of [null, undefined, {}]) {
  const r = resolveManufacturingView(v as any);
  check(!r.expertOnly && !r.isAdmin && !r.isManager,
    `هـ.١ جلسةٌ غائبة (${JSON.stringify(v)}) ⟶ لا صفةَ ولا شاشةَ خبير`);
  same(`هـ.٢ ونقطتُها الافتراضية`, r.endpoint, BOARD_ORDERS_ENDPOINT);
}
//  **`=== true` لا «قيمةٌ صادقة»** — نصٌّ أو رقمٌ ليس منحاً.
check(!resolveManufacturingView({ role: "reception", canWorkAsExpert: "yes" as any }).expertOnly,
  "هـ.٣ **ونصٌّ «صادق» ليس قدرة**");
check(!resolveManufacturingView({ role: "reception", isAdmin: 1 as any }).isAdmin,
  "هـ.٤ **ورقمٌ «صادق» ليس صفةَ مسؤول**");

// ═══ و: عقدُ الشاشة ══════════════════════════════════════════════════════
console.log("\n── و: عقدُ الشاشة ──");
const here = dirname(fileURLToPath(import.meta.url));
const page = readFileSync(join(here, "Manufacturing.tsx"), "utf8");
check(/resolveManufacturingView/.test(page) && /from "\.\/manufacturing_view_mode"/.test(page),
  "و.١ **الصفحةُ تستورد الحاسمَ الخالص**");
check(/usePermissions\(\)/.test(page) && /canWorkAsExpert: permissions\.canWorkAsExpert/.test(page),
  "و.٢ **وتقرأ القدرةَ من `usePermissions`**");
//  **ولا قاعدةَ ثانية في المكوّن**: لا مقارنةَ دورِ خبيرٍ مكتوبةً فيه،
//  ولا نقطةَ أوامرَ مكتوبةً بيدٍ — وإلّا انحرفت عن الحاسم يوماً.
check(!/prosthetics_expert/.test(page),
  "و.٣ **ولا مقارنةَ دورِ خبيرٍ منسوخةً في الصفحة**",
  (page.match(/.*prosthetics_expert.*/g) ?? []).join(" | "));
check(!/["'`]\/api\/manufacturing\/(my-)?orders["'`]/.test(page),
  "و.٤ **ولا نقطةَ أوامرَ مكتوبةً بيدٍ فيها**",
  (page.match(/.*\/api\/manufacturing\/(my-)?orders.*/g) ?? []).join(" | "));
check(/expertOnly/.test(page) && !/\bisExpert\b/.test(page),
  "و.٥ **والصفةُ المستعمَلة `expertOnly` لا `isExpert`**");

console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} حالة فاشلة`}`);
process.exit(failures === 0 ? 0 : 1);
