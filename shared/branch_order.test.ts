//  ترتيبُ الفروع الواحد في كلّ قائمة (§4.gt) — دالّةٌ خالصة، وحارسٌ ساكن على مواقعها.
import { readFileSync } from "node:fs";
import { branchDisplayRank, sortBranchesForDisplay, sortByBranchDisplay } from "./branch_order";

let failures = 0;
const check = (cond: boolean, msg: string, detail = "") => {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
};
const same = (msg: string, got: unknown, expected: unknown) =>
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}  got: ${JSON.stringify(got)}`);

//  الفروعُ كما هي على الإنتاج اليوم، بترتيب الرقم.
const PROD = [
  { id: 1, name: "بغداد أطراف", temporarilyClosed: false },
  { id: 2, name: "كربلاء", temporarilyClosed: false },
  { id: 3, name: "ذي قار", temporarilyClosed: false },
  { id: 4, name: "الموصل", temporarilyClosed: false },
  { id: 5, name: "كركوك", temporarilyClosed: true },
  { id: 6, name: "مركز بغداد للعلاج الطبيعي", temporarilyClosed: false },
];
const ORDER = ["بغداد أطراف", "مركز بغداد للعلاج الطبيعي", "كربلاء", "ذي قار", "الموصل", "كركوك"];

same("١. ترتيبُ المالك: بغداد أطراف ثمّ المركز ثمّ كربلاء ثمّ ذي قار ثمّ الموصل وآخرُها كركوك",
  sortBranchesForDisplay(PROD).map((b) => b.name), ORDER);
same("٢. أيّاً كان ترتيبُ الدخول", sortBranchesForDisplay([...PROD].reverse()).map((b) => b.name), ORDER);
same("٣. والأصلُ لا يُمَسّ", PROD.map((b) => b.id), [1, 2, 3, 4, 5, 6]);
same("٤. «بغداد» القديمة اسماً تبقى الأولى", branchDisplayRank("بغداد"), 0);
same("٥. والمركزُ ثانٍ وفيه «بغداد»", branchDisplayRank("مركز بغداد للعلاج الطبيعي"), 1);

//  المغلقُ مؤقتاً آخراً ولو كان غيرَ كركوك.
same("٦. المغلقُ مؤقتاً آخراً أيّاً كان",
  sortBranchesForDisplay(PROD.map((b) => ({ ...b, temporarilyClosed: b.id === 2 }))).map((b) => b.name),
  ["بغداد أطراف", "مركز بغداد للعلاج الطبيعي", "ذي قار", "الموصل", "كركوك", "كربلاء"]);
//  وكركوك إن فُتح يبقى آخرَ المعروفة.
same("٧. وكركوك مفتوحاً آخرُ المعروفة",
  sortBranchesForDisplay(PROD.map((b) => ({ ...b, temporarilyClosed: false }))).map((b) => b.name), ORDER);

//  الفرعُ الجديد غيرُ المعروف بعد المعروفة، وبينها بالرقم.
same("٨. غيرُ المعروف بعد المعروفة وبالرقم",
  sortBranchesForDisplay([{ id: 9, name: "النجف" }, { id: 7, name: "البصرة" }, ...PROD]).map((b) => b.id),
  [1, 6, 2, 3, 4, 7, 9, 5]);

same("٩. والصفوفُ والأسماءُ وحدها بالقاعدة نفسِها",
  sortByBranchDisplay(["كركوك", "الموصل", "كربلاء", "مركز بغداد للعلاج الطبيعي", "ذي قار", "بغداد أطراف"], (n) => n), ORDER);
same("١٠. والاسمُ الفارغ بعد المعروفة", sortByBranchDisplay([null, "كربلاء"], (n) => n), ["كربلاء", null]);

//  حارسٌ ساكن: المواقعُ التي تعرض قوائمَ الفروع تقرأ القاعدةَ الواحدة.
const SITES: Array<[string, string]> = [
  ["server/storage.ts", "sortBranchesForDisplay(await db.select().from(branches))"],
  ["client/src/components/BranchGate.tsx", "branchDisplayRank"],
  ["server/backup.ts", "sortBranchesForDisplay(allBranches)"],
  ["server/sessions_module/routes.ts", "sortByBranchDisplay(byBranch"],
  ["server/manufacturing/store.ts", "sortByBranchDisplay(Array.from(branchAgg.values())"],
  ["client/src/pages/patient_header_branches.ts", "sortByBranchDisplay(shared"],
  ["client/src/pages/MyExams.tsx", "sortByBranchDisplay("],
  ["client/src/pages/ExpertOpenOrdersPrint.tsx", "sortByBranchDisplay("],
  ["client/src/pages/AdminSettings.tsx", "sortByBranchDisplay(userBranchIds"],
];
for (const [file, needle] of SITES) {
  check(readFileSync(file, "utf8").includes(needle), `١١. ${file} بالترتيب الواحد`, `لا يحوي ${needle}`);
}
check(!readFileSync("server/backup.ts", "utf8").includes("BRANCH_ORDER"), "١٢. ولا قائمةَ ترتيبٍ ثانية في النسخة الاحتياطية");

console.log(failures === 0 ? "\n🎉 كل فحوص ترتيب الفروع نجحت" : `\n❌ ${failures} فحصاً فشل`);
process.exit(failures === 0 ? 0 : 1);
