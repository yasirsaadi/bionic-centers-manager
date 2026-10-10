// **عينُ الخصوصية في لوحة التحكم** (طلبُ المالك ٢٠٢٦-١٠-١٠: «عينٌ جنبَ الوارد المباشر تُخفي اللوحةَ كلَّها برموزٍ كما في البنوك») —
// `npm run test:dashboard-privacy`، بلا قاعدة.
//
// يحرس: (١) الرموزُ بدل الرقم والعملةُ بعدها؛ (٢) العينُ بجانب «الوارد المباشر» وتُخفي مبالغَه؛ (٣) **كلُّ رقمٍ في اللوحة** يمرّ بالقناع —
// لا رقمَ يُكتب خاماً — وأسماءُ آخر المرضى؛ (٤) للمسؤول وحده، والاختيارُ لكلّ مستخدمٍ على جهازه.
import { readFileSync } from "fs";
import { join } from "path";
import { PRIVACY_MASK, masked } from "../lib/privacy_mask";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const src = (f: string) => readFileSync(join(import.meta.dirname, "../../..", f), "utf8");
const board = src("client/src/components/LiveRevenueBoard.tsx");
const dash = src("client/src/pages/Dashboard.tsx");
const lib = src("client/src/lib/privacy_mask.ts");

console.log("\n── أ. القناع ──");
same("أ.١ **مخفيّاً ⟵ رموزٌ كما في البنوك**، والعملةُ بعدها؛ وظاهراً ⟵ القيمةُ كما هي",
  [masked(true, 1450000), masked(true, "1,450,000", "د.ع"), masked(false, 12), masked(false, "1,450,000", "د.ع")],
  [PRIVACY_MASK, `${PRIVACY_MASK} د.ع`, "12", "1,450,000 د.ع"]);

console.log("\n── ب. العينُ بجانب «الوارد المباشر» ──");
same("ب.١ **زرُّ العين بجانب العنوان**، يقول حالَه، ومبالغُ الفروع ومجموعُها تمرّ بالقناع",
  [/الوارد المباشر اليوم\s*<\/h3>\s*\{privacy && \(\s*<button[^>]*onClick=\{privacy\.toggle\}[^>]*aria-pressed=\{hidden\}/.test(board),
    /data-testid="button-privacy-mask"/.test(board), (board.match(/<Amount value=\{[^}]+\} hidden=\{hidden\} \/>/g) ?? []).length,
    /hidden \? PRIVACY_MASK : shown\.toLocaleString/.test(board)],
  [true, true, 2, true]);

console.log("\n── ج. اللوحةُ كلُّها ──");
const statValues = dash.match(/<StatsCard[\s\S]*?value=\{([^}]*\}?[^}]*)\}/g) ?? [];
same("ج.١ **كلُّ بطاقةٍ في اللوحة قيمتُها عبر القناع** (`num` للعدد و`money` للمبلغ) — لا رقمَ خام",
  [statValues.length >= 16, statValues.every((v) => /value=\{(num|money)\(/.test(v))], [true, true]);
same("ج.٢ **ولا مبلغَ يُكتب خاماً في الصفحة** — `toLocaleString` في `money` وحدها",
  (dash.match(/toLocaleString/g) ?? []).length, 1);
same("ج.٣ **وأسماءُ آخر المرضى** وحرفُها الأوّل مخفيّة",
  [/\{hide \? PRIVACY_MASK : patient\.name\}/.test(dash), /\{hide \? "•" : patient\.name\.charAt\(0\)\}/.test(dash)], [true, true]);

console.log("\n── د. للمسؤول وحده، ولكلّ مستخدمٍ على جهازه ──");
same("د.١ **العينُ للمسؤول** (لوحةُ الوارد المباشر له وحده)، وغيرُه لا قناعَ عليه أبداً",
  [/useDashboardPrivacy\(isAdmin \? branchSession\?\.userId : null\)/.test(dash), /\{isAdmin && <LiveRevenueBoard privacy=\{privacy\} \/>\}/.test(dash),
    /hidden: Boolean\(userId\) && hidden/.test(lib)], [true, true, true]);
same("د.٢ **والاختيارُ محفوظٌ لكلّ مستخدم** — فلا يرث حسابٌ آخر على الجهاز قناعَ غيره، والتخزينُ المحجوبُ لا يكسر الصفحة",
  [/`dashboard-privacy:\$\{userId\}`/.test(lib), (lib.match(/try \{/g) ?? []).length >= 2], [true, true]);

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
