// تأكيدُ قلم كلفة القسم تحت سعر المُباع (§4.br) — `npm run test:case-cost-guard`.
import { readFileSync } from "fs";
import { soldDevicesTotal, needsBelowSoldConfirm } from "./case_cost_guard";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}

//  ملفُّ حيدر التجريبيّ (WB-02221) بشكله على الإنتاج: جهازٌ مُسلَّم بمليونين، وجهازٌ عوين ولم يُشترَ.
const eps = [
  { caseId: 7, status: "delivered", agreedCost: 2_000_000 },
  { caseId: 7, status: "examined", agreedCost: 0 },
  { caseId: 7, status: "cancelled", agreedCost: 900_000 },
  { caseId: 7, status: "awaiting_exam", agreedCost: 500_000 },
  { caseId: 9, status: "in_manufacturing", agreedCost: 3_000_000 },
];
same("١. المُباعُ = المسلَّمُ وقيدُ التصنيع وحدهما، وعلى قسمه وحده", soldDevicesTotal(eps, 7), 2_000_000);
same("   وقسمٌ آخر بجهازٍ قيد التصنيع", soldDevicesTotal(eps, 9), 3_000_000);
same("   وبلا أجهزة ⟵ صفر", soldDevicesTotal(undefined, 7), 0);
same("٢. ١,٠٠٠ تحت مليونين ⟵ يُسأل", needsBelowSoldConfirm(1_000, 2_000_000), true);
same("٣. ٢,٥٠٠,٠٠٠ فوقه ⟵ يُحفظ مباشرة", needsBelowSoldConfirm(2_500_000, 2_000_000), false);
same("   والمساوي ⟵ يُحفظ مباشرة", needsBelowSoldConfirm(2_000_000, 2_000_000), false);
same("٤. وقسمٌ بلا مُباع ⟵ لا سؤال أبداً", needsBelowSoldConfirm(0, 0), false);

//  ٥. والزرُّ موصول: ✓ يمرّ بالتأكيد، و«نعم» وحدها تحفظ بعده.
const src = readFileSync("client/src/components/patient/PatientCasesTabs.tsx", "utf8");
same("٥أ. زرُّ الحفظ يمرّ بـ trySave", /onClick=\{trySave\}[^>]*data-testid=\{`save-case-cost-/.test(src), true);
same("٥ب. وtrySave يسأل قبل الحفظ", /needsBelowSoldConfirm\(draft, soldTotal\)\) setConfirmBelowSold\(true\)/.test(src), true);
same("٥ج. و«نعم، احفظ» تحفظ", /onClick=\{\(\) => save\.mutate\(\)\}\s*data-testid=\{`confirm-below-sold-/.test(src), true);

if (failures > 0) { console.log(`\n❌ ${failures} فشل`); process.exit(1); }
console.log("\n✅ كل فحوص تأكيد كلفة القسم نجحت");
