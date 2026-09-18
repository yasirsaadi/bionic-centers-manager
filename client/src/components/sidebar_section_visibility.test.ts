// إعداداتُ إظهار الأقسام — حارسٌ صغير (٢٠٢٦-٠٩-١٩).
// `npm run test:sidebar-section-visibility` — بلا قاعدة بيانات.
//
// ══ ما يحرسه ═════════════════════════════════════════════════════════════
//   (١) خياراتُ الإظهار الخمسة الحالية موجودةٌ في `Sidebar.tsx`.
//   (٢) و`false` ما زالت **تُخفي** العنصر.
//   (٣) وبوّابةُ صلاحية الموظّف لم تُحذَف ولم تتحوّل إلى منح.
//   (٤) وتحديثُ الثلاثين ثانية موجود.
//   (٥) و`"always"` عند العودة إلى النافذة موجودة.
//
// ══ وحدُّه معلومٌ لا مُدَّعى ══════════════════════════════════════════════
// هذا حارسُ **مصدرٍ** لا مشغّلُ سلوك: المشروعُ بلا مشغّل DOM، والقرارُ يعيش
// داخل `.filter()` في المكوّن. فهو يمسك الحذفَ والانقلابَ الظاهر — لا كلَّ
// انقلابٍ ممكنٍ في المعنى. ولا تُنشَأ وحدةُ إنتاجٍ لأجله.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, "Sidebar.tsx"), "utf8");

//  الخياراتُ الخمسة التي تظهر في لوحة التحكم. وفي `branch_settings` ثلاثةُ
//  أعلامٍ أخرى قديمة (`showVisits` · `showDocuments` · `showExpenses`) تبقى
//  في القاعدة ولا تُعرَض ولا تُمَسّ — فلا تُذكَر هنا.
const SECTION_KEYS = [
  "showDashboard",
  "showPatients",
  "showPayments",
  "showAccounting",
  "showStatistics",
] as const;

console.log("\n── أ. خياراتُ الإظهار الخمسة في Sidebar ──");
for (const key of SECTION_KEYS) {
  check(src.includes(`settingKey: "${key}"`), `أ. **${key}** يحكم عنصراً في القائمة`);
}

console.log("\n── ب. `false` ما زالت تُخفي ──");
check(
  /!branchSession\?\.isAdmin && item\.settingKey && branchSettings/.test(src),
  "ب.١ **بوّابةُ العرض قائمة** — لغير المسؤول، وبمفتاحٍ وإعداداتٍ حاضرة",
);
check(
  /const settingValue = branchSettings\[item\.settingKey\];[\s\S]{0,120}?if \(settingValue === false\) \{[\s\S]{0,40}?return false;/.test(src),
  "ب.٢ **و`=== false` وحدها تُخفي** — لا فحصَ صدقٍ يجعل الغيابَ إخفاءً",
);

console.log("\n── ج. بوّابةُ صلاحية الموظّف لم تُحذَف ولم تصر منحاً ──");
check(
  /if \(item\.permission && !permissions\[item\.permission\]\)/.test(src),
  "ج.١ **بوّابةُ الصلاحية قائمة**",
);
check(
  /if \(item\.permission && !permissions\[item\.permission\]\) \{[\s\S]{0,300}?return false;[\s\S]{0,20}?\}/.test(src),
  "ج.٢ **وتردّ `false`** — مانعةٌ لا مانحة",
);
check(
  !/branchSettings\[item\.settingKey\][\s\S]{0,40}?return true;/.test(src),
  "ج.٣ **ولا إعدادُ فرعٍ يُرجع `true` مبكّراً** — العرضُ لا يمنح صلاحية",
);

console.log("\n── د. تحديثُ إعدادات الفرع ──");
check(src.includes("refetchInterval: 30_000"), "د.١ **دورةُ ثلاثين ثانية**");
check(src.includes('refetchOnWindowFocus: "always"'), "د.٢ **و`\"always\"` عند العودة إلى النافذة**");

console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
