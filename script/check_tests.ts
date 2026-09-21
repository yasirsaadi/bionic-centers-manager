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
 *
 * وأخطاءُ شيفرة التطبيق (غير `*.test.ts`) ليست من شأن هذا الفحص — لها
 * `npm run check` بخطّ أساسه المعروف.
 *
 * **والقائمةُ تَنقص ولا تزيد**: كلّما نُظّف ملفّ، يُحذَف من هنا فيصير محروساً
 * بالكامل. وإضافةُ ملفٍّ إليها قرارٌ صريح، لا شيءٌ يقع بالسهو.
 */
import { spawnSync } from "child_process";

/** ديونٌ قديمة سابقة لهذا الفحص — تُحصى وتُعرَض ولا تُفشِل. */
const PENDING_DEBT = new Set([
  "client/src/components/purchase_dialog_ui.test.ts",
  "server/component_sale.test.ts",
  "server/cost_ledger_parity.test.ts",
  "server/device_episode_integration.test.ts",
  "server/maintenance_concurrent.test.ts",
  "server/manufacturing/stages.test.ts",
  "server/patient_branch_access.test.ts",
  "server/patient_duplicate_guard.test.ts",
  "server/patient_search.test.ts",
  "server/patient_trash_badge.test.ts",
  "server/pending_charge.test.ts",
  "server/simplified_maintenance.test.ts",
  "shared/ai_capabilities.test.ts",
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

if (debt.length) {
  const byFile = new Map<string, number>();
  for (const e of debt) byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1);
  console.log(`\nℹ️  ديونٌ قديمة معروفة (${debt.length} خطأ في ${byFile.size} ملفّ):`);
  for (const [f, n] of [...byFile].sort()) console.log(`   ${n.toString().padStart(3)}  ${f}`);
}

const stale = [...PENDING_DEBT].filter((f) => !errs.some((e) => e.file === f)).sort();
if (stale.length) {
  console.log("\n❌ ملفّاتٌ على قائمة الديون ولم تعد تحمل أخطاء — احذفها من القائمة:");
  for (const f of stale) console.log(`   ${f}`);
}

const failed = blocking.length > 0 || fatal.length > 0 || stale.length > 0;
console.log(failed ? "\n❌ فحصُ أنواع الاختبارات فشل" : "\n✅ فحصُ أنواع الاختبارات نجح");
process.exit(failed ? 1 : 0);
