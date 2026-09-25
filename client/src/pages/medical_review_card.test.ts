// بطاقةُ «مراجعة الحركة»: **الزرُّ لمن يقبل الخادمُ ضغطَه وحده** — بلا قاعدة
// بيانات وبلا DOM.
//
// قرارُ المالك ٢٠٢٦-٠٩-٢٥: «فيجب ان ترى الفروع المشتركة لمريض واحد ترى كل
// شيء يحدث لهذا المريض سواء بفرعهم ام بغيره ليعلموا مافعل اما القرارات
// فبالتاكيد تحصر لصاحب الفرع هو من يقرر».
//
// أ. `requestBranchInScope` — الحارسُ نفسُه: مطابقٌ بحرفه لما كان يكتبه
//    الخادمُ قبلها، على شبكةٍ من النطاقات والفروع.
// ب. `reviewCardMode` — قرارُ منطقة الفعل خالصاً.
// ج. **الثابت**: زرٌّ يُعرَض ⟺ الخادمُ يقبل ضغطَه (القدرةُ والفرعُ معاً).
// د. `otherBranchNotice` — السطرُ يسمّي الفرع.
// هـ. عقدُ الشاشة والخادم: القرارُ من الدالّتين لا من شرطٍ ثانٍ.
//
// التشغيل: `npm run test:review-card-ui`

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  requestBranchInScope, reviewCardMode, otherBranchNotice,
} from "../../../shared/medical_review";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..");
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), "utf8");
//  التعليقاتُ تُزال قبل فحص الشيفرة — فلا يمرّ فحصٌ على شرحٍ بدل كود.
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
const same = (msg: string, got: unknown, want: unknown) =>
  check(JSON.stringify(got) === JSON.stringify(want), msg,
    `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);

//  الحارسُ كما كان مكتوباً في `decideReviewRequest` و`returnFullRequestToReception`
//  قبل هذه الدالّة — يردّ حين يصدق.
const oldRefuses = (scope: number[] | null, branchId: number | null) =>
  scope !== null && !scope.includes(Number(branchId));

const SCOPES: (number[] | null)[] = [null, [], [1], [2], [1, 2], [0]];
const BRANCHES: (number | null)[] = [null, 0, 1, 2, 3];

console.log("\n── أ. الحارسُ نفسُه — مطابقٌ لما كان بحرفه ──");
same("أ١. المسؤولُ (`null`) يصل كلَّ فرع", requestBranchInScope(null, 7), true);
same("أ٢. فرعُ الطلب في النطاق", requestBranchInScope([1, 2], 2), true);
same("أ٣. وخارجه لا", requestBranchInScope([1], 2), false);
same("أ٤. والنطاقُ الفارغ لا يصل شيئاً", requestBranchInScope([], 1), false);
same("أ٥. وطلبٌ بلا فرعٍ لا يؤشّر عليه إلّا المسؤول",
  [requestBranchInScope([1], null), requestBranchInScope(null, null)], [false, true]);
let parity = true;
for (const s of SCOPES) for (const b of BRANCHES) {
  if (requestBranchInScope(s, b) !== !oldRefuses(s, b)) parity = false;
}
check(parity, `أ٦. **ومطابقٌ للحارس القديم في ${SCOPES.length * BRANCHES.length} حالة** — لا صلاحيةَ تتّسع ولا تضيق`);

console.log("\n── ب. قرارُ منطقة الفعل ──");
same("ب١. بلا قدرةٍ إشرافية ⟵ قراءةٌ فقط، أيّاً كان الفرع",
  [reviewCardMode({ canSupervise: false, branchInScope: true }),
    reviewCardMode({ canSupervise: false, branchInScope: false })],
  ["read_only", "read_only"]);
same("ب٢. بقدرةٍ وفرعُ الطلب في النطاق ⟵ الأزرار",
  reviewCardMode({ canSupervise: true, branchInScope: true }), "act");
same("ب٣. **بقدرةٍ وفرعُ الطلب خارجه ⟵ للعلم بلا زرّ**",
  reviewCardMode({ canSupervise: true, branchInScope: false }), "other_branch");
same("ب٤. **وغيابُ العلَم «لا»** — زرٌّ مخفيٌّ أهونُ من زرٍّ يُردّ",
  [reviewCardMode({ canSupervise: true, branchInScope: undefined }),
    reviewCardMode({ canSupervise: true, branchInScope: null })],
  ["other_branch", "other_branch"]);

console.log("\n── ج. الثابت: زرٌّ يُعرَض ⟺ الخادمُ يقبل ضغطَه ──");
//  الخادمُ يقبل التأشيرَ إن ملك المنادي القدرةَ **و**اجتاز حارسَ الفرع.
let invariant = true;
const broken: string[] = [];
for (const canSupervise of [true, false]) for (const s of SCOPES) for (const b of BRANCHES) {
  const shown = reviewCardMode({ canSupervise, branchInScope: requestBranchInScope(s, b) }) === "act";
  const accepted = canSupervise && !oldRefuses(s, b);
  if (shown !== accepted) { invariant = false; broken.push(`${canSupervise}/${JSON.stringify(s)}/${b}`); }
}
check(invariant, `ج١. **في ${2 * SCOPES.length * BRANCHES.length} حالة: لا زرَّ يُرَدّ، ولا زرَّ مقبولٌ يُخفى**`,
  broken.join(" · "));

console.log("\n── د. سطرُ بطاقة الفرع الآخر ──");
same("د١. يسمّي الفرعَ ويقول مَن يراجعها", otherBranchNotice("ذي قار"),
  "هذه الحركة لفرع ذي قار — يراجعها ذلك الفرع");
same("د٢. والاسمُ يُقَصّ", otherBranchNotice("  بغداد "),
  "هذه الحركة لفرع بغداد — يراجعها ذلك الفرع");
same("د٣. **والاسمُ الغائب لا يُترَك فراغاً**",
  [otherBranchNotice(null), otherBranchNotice(""), otherBranchNotice("   ")],
  Array(3).fill("هذه الحركة لفرعٍ آخر — يراجعها ذلك الفرع"));

console.log("\n── هـ. عقدُ الشاشة والخادم ──");
const PAGE = read("client", "src", "pages", "MedicalReview.tsx");
const page = code(PAGE);
check(/import \{[^}]*reviewCardMode[^}]*otherBranchNotice[^}]*\} from "@shared\/medical_review"/.test(page),
  "هـ١. الشاشةُ تستورد القرارَ والسطرَ من الملفّ المشترك — لا نسخةَ محلّية");
check(/const mode = reviewCardMode\(\{ canSupervise, branchInScope: r\.branchInScope \}\)/.test(page),
  "هـ٢. **ومنطقةُ الفعل تُحسَب لكلّ بطاقة بالقدرة وفرعِ الطلب معاً**");
check(!/\{canSupervise \? \(/.test(page),
  "هـ٣. **ولا يبقى الشرطُ القديم** (الأزرارُ بالقدرة وحدها)");
const actAt = page.indexOf('{mode === "act" ? (');
const otherAt = page.indexOf(') : mode === "other_branch" ? (');
const readAt = page.indexOf(") : (", otherAt + 1);
check(actAt > 0 && otherAt > actAt && readAt > otherAt,
  "هـ٤. والحالاتُ الثلاث بترتيبها: الفعل · الفرعُ الآخر · القراءة",
  `act=${actAt} other=${otherAt} read=${readAt}`);
const actBlock = page.slice(actAt, otherAt);
const otherBlock = page.slice(otherAt, readAt);
for (const id of ["review-approve-", "review-return-", "review-note-toggle-", "review-escalate-"]) {
  check(actBlock.includes(id), `هـ٥. «${id}» في منطقة الفعل`);
  check(!otherBlock.includes(id), `هـ٦. **و«${id}» غائبٌ عن بطاقة الفرع الآخر**`);
}
for (const call of ["act(", "askReturn("]) {
  check(!otherBlock.includes(call), `هـ٧. ولا نداءَ «${call}» في بطاقة الفرع الآخر`);
}
check(otherBlock.includes("otherBranchNotice(r.branchName)"),
  "هـ٨. **وبطاقةُ الفرع الآخر تقول لمن هي**");
check(otherBlock.includes("review-open-") && otherBlock.includes("فتح ملف المريض"),
  "هـ٩. **ويبقى فيها «فتح ملف المريض»** — العلمُ لا يُغلق الملفّ");
check(/\{canDecide && \(/.test(actBlock),
  "هـ١٠. و«يتطلّب معاينة كاملة» داخل منطقة الفعل — فلا يظهر على بطاقة فرعٍ آخر");

const STORE = code(read("server", "medical_review", "store.ts"));
const fnBody = (src: string, name: string) => {
  const at = src.indexOf(`export async function ${name}(`);
  const next = src.indexOf("\nexport ", at + 1);
  return at < 0 ? "" : src.slice(at, next < 0 ? undefined : next);
};
for (const fn of ["decideReviewRequest", "returnFullRequestToReception"]) {
  const body = fnBody(STORE, fn);
  check(body.length > 200 && /if \(!requestBranchInScope\(/.test(body),
    `هـ١١. **\`${fn}\` تردّ بالدالّة نفسِها** — فالعلَمُ والحارسُ لا ينحرف أحدُهما`);
  check(!/\.includes\(Number\(row\.branch_id\)\)/.test(body),
    `هـ١٢. ولا نسخةَ ثانية من الحارس في \`${fn}\``);
}
const ROUTES = code(read("server", "medical_review", "routes.ts"));
check(/branchInScope: requestBranchInScope\(scope, r\.branchId\)/.test(ROUTES),
  "هـ١٣. **والطابورُ يرسل العلَمَ من الدالّة نفسِها بنطاق المنادي نفسِه**");

console.log(`\n${failures === 0 ? "✅ all review-card cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
