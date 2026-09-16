//  فروعُ رأس ملفّ المريض — منطقٌ خالص، بلا قاعدة بيانات.
//  `npm run test:patient-header-branches`.
//
//  ══ ما يحرسه ═══════════════════════════════════════════════════════════
//  (١) **فرعُ التسجيل يبقى كما هو** — لا تبدّله إتاحةٌ ولا سحبُها ولا
//      ترتيبُها. وهذا هو الخطأ الوحيد الذي لا يُغتفَر: رأسٌ يقول «فرع
//      التسجيل: كربلاء» لملفٍّ سُجّل في ذي قار يكذب في أوّل سطر يُقرأ.
//  (٢) **الفرعُ المضاف يظهر** — وكلُّ فرعٍ أُتيح له، لا الأوّلُ وحده.
//  (٣) **وعند السحب يختفي من «متاح أيضاً»** — والرأسُ يتبع البيانات، ولا
//      يحتفظ بفرعٍ لم يعد مُتاحاً له.
//  (٤) وفرعُ التسجيل **لا يظهر في «متاح أيضاً» أبداً** ولو وصل في صفوف
//      الإتاحة — حزامٌ ثانٍ خلف حارس الخادم، لأن هذه كذبةٌ تُقرأ ولا تُكتشَف.
//  (٥) **ولا شارةَ فارغة**: اسمٌ مجهولٌ يُقال `فرع #٣` لا شرطةً عارية.

import {
  patientHeaderBranches, formatSharedBranches, type BranchLike,
} from "./patient_header_branches";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
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

const DHIQAR = 4, KARBALA = 3, BAGHDAD = 7;
const BRANCHES: BranchLike[] = [
  { id: KARBALA, name: "كربلاء" }, { id: DHIQAR, name: "ذي قار" },
  { id: BAGHDAD, name: "بغداد" },
];
const grant = (branchId: number, branchName: string | null = null) => ({ branchId, branchName });

//  سيناريو المالك: ملفٌّ سُجّل في **ذي قار** وأُتيح لـ**كربلاء**.
const head = (access: { branchId: number; branchName?: string | null }[],
              homeBranchId: number | null = DHIQAR) =>
  patientHeaderBranches({ homeBranchId, access, branches: BRANCHES });

// ══ أ. سيناريو المالك بالحرف ═════════════════════════════════════════════
console.log("\n── أ. فرع التسجيل: ذي قار · متاح أيضاً: كربلاء ──");
{
  const before = head([]);
  same("١. (قبل الإتاحة) فرعُ التسجيل ذي قار", before.home, { id: DHIQAR, label: "ذي قار" });
  same("٢. (قبل الإتاحة) ولا «متاح أيضاً» إطلاقاً", before.shared, []);

  const after = head([grant(KARBALA)]);
  same("٣. **وفرعُ التسجيل يبقى كما هو بعد الإتاحة** — ذي قار",
    after.home, { id: DHIQAR, label: "ذي قار" });
  same("٤. **والفرعُ المضاف يظهر في الرأس** — كربلاء",
    after.shared, [{ id: KARBALA, label: "كربلاء" }]);
  same("   ونصُّ السطر «متاح أيضاً: كربلاء»",
    `متاح أيضاً: ${formatSharedBranches(after.shared)}`, "متاح أيضاً: كربلاء");

  const revoked = head([]);
  same("٥. **وعند سحب الإتاحة يختفي من «متاح أيضاً»**", revoked.shared, []);
  same("   **وفرعُ التسجيل لم يتغيّر بالسحب** — ذي قار",
    revoked.home, { id: DHIQAR, label: "ذي قار" });
}

// ══ ب. أكثرُ من فرعٍ إضافيّ — **كلُّها** لا الأوّلُ وحده ══════════════════
console.log("\n── ب. فروعٌ متعدّدة ──");
{
  const many = head([grant(KARBALA), grant(BAGHDAD)]);
  same("٦. **كلُّ الفروع الإضافية تظهر**",
    many.shared, [{ id: KARBALA, label: "كربلاء" }, { id: BAGHDAD, label: "بغداد" }]);
  same("   ونصُّها بالفاصلة العربية", formatSharedBranches(many.shared), "كربلاء، بغداد");
  same("   وفرعُ التسجيل واحدٌ لا يتكاثر", many.home, { id: DHIQAR, label: "ذي قار" });

  //  ترتيبُ المنح كما أرسله الخادم (`ORDER BY granted_at ASC`) — لا يُعاد فرزُه.
  same("٧. وترتيبُ المنح محفوظ — الأقدمُ أوّلاً",
    formatSharedBranches(head([grant(BAGHDAD), grant(KARBALA)]).shared), "بغداد، كربلاء");

  same("٨. وسحبُ أحدِهما يُبقي الآخر وحده",
    formatSharedBranches(head([grant(BAGHDAD)]).shared), "بغداد");
}

// ══ ج. فرعُ التسجيل لا يصير «متاح أيضاً» ═════════════════════════════════
console.log("\n── ج. لا خلطَ بين التسجيل والإتاحة ──");
{
  //  الخادمُ يمنع منحَ فرع التسجيل (`HOME_BRANCH_GRANT_ERROR`)، وهذا حزامٌ ثانٍ.
  const dirty = head([grant(DHIQAR), grant(KARBALA)]);
  same("٩. **فرعُ التسجيل لا يظهر في «متاح أيضاً» ولو وصل في الصفوف**",
    dirty.shared, [{ id: KARBALA, label: "كربلاء" }]);
  same("   ويبقى فرعَ تسجيلٍ كما هو", dirty.home, { id: DHIQAR, label: "ذي قار" });

  same("١٠. والتكرارُ يُطوى — شارةٌ واحدة لا اثنتان",
    head([grant(KARBALA), grant(KARBALA)]).shared, [{ id: KARBALA, label: "كربلاء" }]);
}

// ══ د. الحالاتُ الحدّية — لا يُخترَع فرعٌ ولا تُعرَض شارةٌ فارغة ══════════
console.log("\n── د. الحدود ──");
{
  same("١١. صفٌّ قديمٌ بلا فرع تسجيل ⟶ `null`، ولا يُخترَع رقم",
    head([], null).home, null);
  same("   والإتاحةُ تبقى مقروءةً مع ذلك",
    head([grant(KARBALA)], null).shared, [{ id: KARBALA, label: "كربلاء" }]);

  same("١٢. وفرعٌ غيرُ موجودٍ في القائمة يأخذ اسمَ الخادم",
    head([grant(99, "النجف")]).shared, [{ id: 99, label: "النجف" }]);
  same("١٣. **وبلا اسمٍ إطلاقاً يُقال «فرع #٩٩»** — لا شرطةٌ عارية",
    head([grant(99)]).shared, [{ id: 99, label: "فرع #99" }]);

  same("١٤. وقيمةٌ مشوَّهة تُسقَط ولا تُقرأ فرعاً",
    head([grant(0), grant(-2), grant(NaN as any), grant(KARBALA)]).shared,
    [{ id: KARBALA, label: "كربلاء" }]);
  same("١٥. و`access` غائبة تُقرأ «لا إتاحة» لا تعطُّلاً",
    patientHeaderBranches({ homeBranchId: DHIQAR, access: null, branches: BRANCHES }).shared, []);
  same("١٦. وقائمةُ الفروع الغائبة لا تُفرِغ الرأس",
    patientHeaderBranches({ homeBranchId: DHIQAR, access: [grant(KARBALA, "كربلاء")], branches: null }),
    { home: { id: DHIQAR, label: "فرع #4" }, shared: [{ id: KARBALA, label: "كربلاء" }] });
  same("١٧. ونصُّ فراغٍ صريح حين لا إتاحة", formatSharedBranches([]), "");
}

// ══ هـ. الترجمة — الاسمُ يمرّ بمترجم الصفحة نفسِه ════════════════════════
console.log("\n── هـ. الترجمة ──");
{
  const en = patientHeaderBranches({
    homeBranchId: DHIQAR, access: [grant(KARBALA)], branches: BRANCHES,
    translate: (n) => ({ "ذي قار": "Dhi Qar", "كربلاء": "Karbala" } as Record<string, string>)[n] || n,
  });
  same("١٨. الاسمان يمرّان بالمترجم — الرأسُ يتبع لغة الواجهة",
    [en.home?.label, formatSharedBranches(en.shared)], ["Dhi Qar", "Karbala"]);
}

// ══ و. عقدُ الشاشة — الرأسُ يعرض ما تشتقّه هذه الدالّة فعلاً ══════════════
console.log("\n── و. عقدُ الشاشة ──");
{
  const here = dirname(fileURLToPath(import.meta.url));
  const page = readFileSync(join(here, "PatientDetails.tsx"), "utf8");
  const dialog = readFileSync(
    join(here, "..", "components", "PatientBranchAccessDialog.tsx"), "utf8");

  check(page.includes('from "./patient_header_branches"')
        && page.includes("patientHeaderBranches({"),
    "١٩. الصفحةُ تستورد الدالّةَ القانونية وتناديها — لا اشتقاقٌ ثانٍ فيها");
  check(page.includes("فرع التسجيل: {headerBranches.home.label}"),
    "٢٠. **والرأسُ يقول «فرع التسجيل: …» صراحةً**");
  check(page.includes("متاح أيضاً: {formatSharedBranches(headerBranches.shared)}"),
    "٢١. **ويقول «متاح أيضاً: …»** بكلّ الفروع لا بأوّلها");
  check(page.includes("headerBranches.shared.length > 0 && ("),
    "٢٢. ولا شارةَ «متاح أيضاً» حين لا إتاحة");
  check(page.includes('data-testid="badge-home-branch"')
        && page.includes('data-testid="badge-shared-branches"'),
    "٢٣. وللشارتين وسمان يُلتقَطان");

  //  **المفتاحُ الواحد** هو ما يجعل السحبَ يختفي من الرأس فوراً: نافذةُ
  //  الإتاحة تُبطله عند المنح والسحب، والرأسُ يقرؤه. نسخةٌ ثانية منه تعني
  //  رأساً يبقى يقول «متاح أيضاً» بعد سحبٍ وقع.
  check(page.includes("usePatientBranchAccess(Number(id)"),
    "٢٤. والرأسُ يقرأ عبر الخُطّاف المشترك لا بجلبٍ خاصٍّ به");
  check(dialog.includes("export const branchAccessQueryKey")
        && dialog.includes("queryKey: branchAccessQueryKey(patientId)")
        && dialog.includes("invalidateQueries({ queryKey: branchAccessQueryKey(patientId) })"),
    "٢٥. **والنافذةُ تُبطل المفتاحَ نفسَه** عند المنح والسحب — فيتحدّث الرأسُ معها");

  //  ولا مسارَ خادمٍ جديد: النقطةُ القائمة وحدها.
  check(dialog.includes("`/api/patients/${patientId}/branch-access`")
        && !page.includes("/branch-access"),
    "٢٦. **ولا مسارَ خادمٍ جديد** — النقطةُ القائمة وحدها، والصفحةُ لا تنادي شبكةً بنفسها");
}

console.log(`\n${failures === 0 ? "✅ كل فحوص فروع الرأس نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
