/**
 * فحصُ أنواعٍ لملفّات الاختبار — `npm run check:tests`.
 *
 * **لماذا مُشغِّلٌ بدل `tsc -p` مباشرةً**: `tsconfig.json` يستثني
 * `**\/*.test.ts`، فبقيت حزمُ الاختبار خارج `npm run check` تماماً. وكسرٌ
 * حقيقيّ في `server/ai_page_guide.test.ts` (إعادةُ تعريف `dg`/`ng`/`eg`
 * في النطاق نفسِه) عاش من PR #358 إلى #364: الملفُّ لا يُترجَم فالحزمةُ
 * **لا تعمل أصلاً**، و`npm run check` أخضر لأنه لا يراه.
 *
 * ورفعُ الاستثناء دفعةً واحدة يُظهر ٣٣ خطأً قديماً في ١٣ ملفّاً من دفعاتٍ
 * سابقة — ديونٌ حقيقية لكنها ليست هذا الكسر. فالمُشغِّل يفصل:
 *
 *  ① **أيُّ خطأٍ في ملفٍّ ليس على قائمة الديون ⟶ فشل.** فالنظيفُ يبقى نظيفاً،
 *    ولا يعود ملفٌّ إلى الظلام بالسهو.
 *  ② **وأيُّ خطأٍ من صنفٍ قاتل — في أيّ ملفّ ولو كان مَديناً ⟶ فشل.** القاتلُ
 *    ما يمنع الملفَّ من العمل أصلاً (نحوٌ فاسد، تعريفٌ مكرَّر) — وهو صنفُ
 *    الكسر الذي وقع. فلا ملفَّ اختبارٍ واحد يبقى بلا حارسٍ ضدّه.
 *  ③ **وديونُ الملفّ المَدين مربوطةٌ بعددها لا باسمه ⟶ زيادةٌ فشل.** إعفاءُ
 *    الملفّ كلِّه كان يجعل خطأً جديداً فيه يمرّ صامتاً، فتنمو الديونُ بلا
 *    أن يعلم أحد. والنقصانُ فشلٌ أيضاً — لكنّه فشلٌ يطلب تحديثَ الرقم.
 *
 * وأخطاءُ شيفرة التطبيق (غير `*.test.ts`) ليست من شأن هذا الفحص — لها
 * `npm run check` بخطّ أساسه المعروف.
 *
 * **والقائمةُ تَنقص ولا تزيد**: كلّما نُظّف ملفّ، يُحذَف من هنا فيصير محروساً
 * بالكامل. وإضافةُ ملفٍّ إليها — أو رفعُ رقمٍ فيها — قرارٌ صريح، لا شيءٌ يقع
 * بالسهو.
 */
import { spawnSync } from "child_process";

/**
 * ديونٌ قديمة سابقة لهذا الفحص — **بعددها لكلّ ملفّ لا بإعفاء الملفّ**.
 *
 * وقائمةُ أسماءٍ مجرّدة كانت تُعفي الملفَّ من **كلّ** خطأٍ غيرِ قاتل، فخطأُ
 * نوعٍ جديد في ملفٍّ مَدين يرفع المجموعَ ٣٣ ⟶ ٣٤ **والفحصُ أخضر** — فتنمو
 * الديونُ صامتةً (أمسكته مراجعةُ Codex على #365). فالرقمُ هو العقد:
 * أكثرُ منه ⟶ فشل، وأقلُّ منه ⟶ فشلٌ يطلب تحديثَه.
 */
const PENDING_DEBT = new Map<string, number>([
  ["client/src/components/purchase_dialog_ui.test.ts", 1],
  ["server/component_sale.test.ts", 6],
  ["server/cost_ledger_parity.test.ts", 1],
  ["server/device_episode_integration.test.ts", 1],
  ["server/maintenance_concurrent.test.ts", 10],
  ["server/manufacturing/stages.test.ts", 1],
  ["server/patient_branch_access.test.ts", 2],
  ["server/patient_duplicate_guard.test.ts", 3],
  ["server/patient_search.test.ts", 1],
  ["server/patient_trash_badge.test.ts", 1],
  ["server/pending_charge.test.ts", 1],
  ["server/simplified_maintenance.test.ts", 3],
  ["shared/ai_capabilities.test.ts", 2],
]);

/** أصنافٌ تمنع الملفَّ من العمل أصلاً — لا تُغتفَر في أيّ ملفّ. */
const FATAL = new Set([
  "TS1002", "TS1003", "TS1005", "TS1109", "TS1128", "TS1131", "TS1434",
  "TS2300", "TS2304", "TS2307", "TS2451", "TS2552",
]);

const LINE = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;

const r = spawnSync("npx", ["tsc", "--noEmit", "-p", "tsconfig.tests.json"], {
  encoding: "utf8", cwd: process.cwd(),
});
const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;

type Err = { file: string; code: string; text: string };
const errs: Err[] = [];
for (const line of out.split("\n")) {
  const m = LINE.exec(line.trim());
  if (!m) continue;
  const file = m[1].replace(/\\/g, "/");
  if (!file.endsWith(".test.ts")) continue; // شيفرةُ التطبيق شأنُ `npm run check`
  errs.push({ file, code: m[4], text: line.trim() });
}

const blocking = errs.filter((e) => !PENDING_DEBT.has(e.file));
const fatal = errs.filter((e) => FATAL.has(e.code));
const debt = errs.filter((e) => PENDING_DEBT.has(e.file) && !FATAL.has(e.code));

//  خطُّ الأساس لكلّ ملفّ: أكثرُ ⟶ انحدارٌ جديد · أقلُّ ⟶ نُظّف فحدِّث الرقم.
const debtByFile = new Map<string, number>();
for (const e of debt) debtByFile.set(e.file, (debtByFile.get(e.file) ?? 0) + 1);
const grown: string[] = [];
const shrunk: string[] = [];
for (const [file, expected] of [...PENDING_DEBT].sort()) {
  const actual = debtByFile.get(file) ?? 0;
  if (actual > expected) grown.push(`${file}: ${expected} ⟶ ${actual}`);
  else if (actual < expected) shrunk.push(`${file}: ${expected} ⟶ ${actual}`);
}

const shown = new Set<string>();
const print = (title: string, list: Err[]) => {
  if (!list.length) return;
  console.log(`\n${title}`);
  for (const e of list) {
    if (shown.has(e.text)) continue;
    shown.add(e.text);
    console.log(`   ${e.text}`);
  }
};
print("❌ أخطاءٌ في ملفّاتٍ يجب أن تكون نظيفة:", blocking);
print("❌ أخطاءٌ من صنفٍ قاتل (تمنع الملفَّ من العمل):", fatal);

if (grown.length) {
  console.log("\n❌ ديونٌ **نمت** في ملفّاتٍ مَدينة — أخطاءٌ جديدة لا تُغتفَر:");
  for (const line of grown) console.log(`   ${line}`);
  print("   وهذه أخطاءُ تلك الملفّات:",
    debt.filter((e) => (debtByFile.get(e.file) ?? 0) > (PENDING_DEBT.get(e.file) ?? 0)));
}
if (shrunk.length) {
  console.log("\n❌ ملفّاتٌ نُظّفت جزئياً أو كلّياً — حدِّث رقمَها في PENDING_DEBT:");
  for (const line of shrunk) console.log(`   ${line}`);
}

if (debt.length) {
  console.log(`\nℹ️  ديونٌ قديمة معروفة (${debt.length} خطأ في ${debtByFile.size} ملفّ):`);
  for (const [f, n] of [...debtByFile].sort()) console.log(`   ${n.toString().padStart(3)}  ${f}`);
}

const failed = blocking.length > 0 || fatal.length > 0
  || grown.length > 0 || shrunk.length > 0;
console.log(failed ? "\n❌ فحصُ أنواع الاختبارات فشل" : "\n✅ فحصُ أنواع الاختبارات نجح");
process.exit(failed ? 1 : 0);
