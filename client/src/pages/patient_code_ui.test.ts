// رمزُ المريض في الواجهة — **عقدُ مصدر**، لا اختبار رسم.
// `npm run test:patient-code-ui`.
//
// ══ ما هذا وما ليس ═══════════════════════════════════════════════════════
// لا مشغّل DOM في المشروع، فلا يمكن رسمُ المكوّن والتأكّد من ظهور الرمز على
// الشاشة. وما يمكن ويستحقّ: تثبيت **النقاط التي يعتمد عليها غيرُنا** — معرّفات
// الاختبار التي ستُبنى عليها آليّةٌ لاحقاً، وأعمدة التصدير التي تُقرأ في ملفٍّ
// يُسلَّم للإدارة، ونصّ البحث الذي يقول للموظّف إن الرمز مقبول.
//
// فهذه حراسةُ انحدار: مَن يعيد ترتيب الصفّ غداً فيسقط منه الرمز يعرف فوراً.
// وما يُثبته فعلاً أن **المصدر يحوي هذه العقود**، لا أن المتصفّح يعرضها.
// (وأنّ الرمز يصل الواجهة أصلاً مُثبَتٌ حيّاً في `test:patient-code-api`.)

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");
const registry = read("client/src/pages/PatientsList.tsx");
const details = read("client/src/pages/PatientDetails.tsx");
const badge = read("client/src/components/PatientCodeBadge.tsx");
const translations = read("client/src/i18n/translations.ts");

/** كم مرّةً يظهر النصّ. */
const times = (hay: string, needle: string) => hay.split(needle).length - 1;

// ══ أ. سجلّ المرضى: الجدول والبطاقات معاً ══════════════════════════════
console.log("\n── سجلّ المرضى ──");
same("أ. **معرّف الاختبار مستقرّ وموجود مرّتين — للجدول وللبطاقة**",
  times(registry, "data-testid={`patient-code-${patient.id}`}"), 2);
check(registry.includes("{patient.patientCode}"),
  "   والقيمة المعروضة هي الرمز نفسه");
check(/patientCode: string/.test(registry),
  "   ونوعُ الصفّ يعلن الحقل فلا يسقط بصمت");

// ══ ب. التصدير ═════════════════════════════════════════════════════════
console.log("\n── التصدير ──");
check(registry.includes('"كود المريض": patient.patientCode'),
  "ب. **Excel فيه عمود «كود المريض»**");
check(registry.includes("<th>كود المريض</th>"),
  "   وPDF كذلك في الترويسة");
check(registry.includes("${patient.patientCode ?? \"-\"}"),
  "   وفي كلّ صفّ من صفوفه");
//  الترتيب يهمّ: الهوية أوّلاً ثمّ الاسم، كما تُقرأ الورقة.
const pdfHead = registry.slice(registry.indexOf("<th>#</th>"), registry.indexOf("<th>العمر</th>"));
check(pdfHead.indexOf("كود المريض") < pdfHead.indexOf("الاسم"),
  "   والهوية تسبق الاسم في الورقة", pdfHead.replace(/\s+/g, " "));

// ══ ج. صفحة المريض ═════════════════════════════════════════════════════
console.log("\n── صفحة المريض ──");
check(details.includes("<PatientCodeBadge"),
  "ج. الرمز في رأس صفحة المريض");
//  العنوان نفسه — لا أول ظهورٍ لاسم المريض في الملفّ (فذاك في نافذة الدمج).
const h1 = details.indexOf("<h1 ");
const header = details.slice(h1, h1 + 500);
check(h1 > 0 && header.includes("PatientCodeBadge"),
  "   وبجانب الاسم في العنوان لا في زاويةٍ بعيدة", header.slice(0, 200));
check(badge.includes('data-testid="text-patient-code"')
  && badge.includes('data-testid="button-copy-patient-code"'),
  "   ومعرّفا الاختبار للنصّ ولزرّ النسخ موجودان");

// ══ د. النسخ ينسخ الرمز وحده ═══════════════════════════════════════════
check(badge.includes("navigator.clipboard.writeText(code)"),
  "د. **المنسوخ هو الرمز وحده** — بلا اسمٍ ولا زينة");
check(/catch\s*\{/.test(badge),
  "   وفشلُ الحافظة لا يُسقط شيئاً (http أو متصفّح قديم)");

// ══ هـ. نصّ البحث يخبر الموظّف ═════════════════════════════════════════
console.log("\n── نصّ البحث ──");
check(/searchByNameOrCondition: "[^"]*WB/.test(translations),
  "هـ. نصّ مربّع البحث يذكر كود المريض صراحةً");
same("   بالعربية والإنجليزية معاً",
  (translations.match(/searchByNameOrCondition: "[^"]*WB[^"]*"/g) ?? []).length, 2);

// ══ و. ولا هوية داخلية تُعرض مكانها ════════════════════════════════════
check(!registry.includes("رقم الملف الداخلي"),
  "و. ولا يُعرَض رقم الصفّ الداخلي هويةً للمريض");

console.log(`\n${failures === 0 ? "✅ all patient-code-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
