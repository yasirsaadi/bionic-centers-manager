// ترتيبُ «معايناتي» — قاعدتان بحسب الحال، بلا قاعدة بيانات.
// `npm run test:worklist-order`.
//
//   **بلا بحث**: الاختصاص ⟶ الانتظار ⟶ الترقيم.
//   **مع البحث**: الصلة ⟶ الانتظار ⟶ الترقيم. والاختصاص لا يدخل.
//
// ══ العطبان اللذان يحرسهما ═════════════════════════════════════════════
// (١) أوّلُ ربطٍ للبحث رشّح ورتّب بالصلة **ثمّ** أعاد الترتيب بالانتظار
//     فوقه فمحاها — فيكتب الطبيب اسماً كاملاً صحيحاً فيجده تحت اسمٍ يشبهه.
// (٢) وترتيبُ الاختصاصات كان يقع **بعد** التقطيع، فيرتّب عناوين الصفحة ولا
//     يقرّر مَن يقع فيها: خمسةَ عشرَ مريضَ أطرافٍ وخمسةَ علاجٍ يختلطون على
//     الصفحتين بدل أن يفرغ القسمُ الأوّل قبل أن يبدأ الثاني.
//
// وهذا اختبارُ سلوكٍ للدالّة التي تناديها الصفحة نفسها — لا لنسخةٍ منها.

import { rankWorklist } from "./my_exams_order";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

interface Row {
  id: string;
  patientName: string;
  phone?: string | null;
  patientCode?: string | null;
  aliasCodes?: string[];
  waitingSince: string | null;
  /** الاختصاص — يبقى غير محدَّدٍ حيث لا يعني الاختبارُ شيئاً به. */
  caseType?: string;
}

const run = (rows: Row[], search: string, order: "newest" | "oldest") =>
  rankWorklist(rows, {
    order,
    waitingOf: (r) => r.waitingSince,
    search,
    toPatient: (r) => ({
      name: r.patientName, phone: r.phone,
      patientCode: r.patientCode, aliasCodes: r.aliasCodes,
    }),
    specialtyOf: (r) => r.caseType,
  }).map((r) => r.id);

/** الصفحة كما يراها الطبيب فعلاً — الترتيب ثمّ التقطيع، كما في المكوّن. */
const page = (rows: Row[], search: string, order: "newest" | "oldest",
              pageSize: number, n: number) =>
  run(rows, search, order).slice((n - 1) * pageSize, n * pageSize);

// ══ أ. المطابقة التامّة الأقدم تسبق التقريبية الأحدث ═══════════════════
// «A» مطابقةٌ تامّة وانتظاره أقدم بشهر · «B» خطأُ حرفٍ واحد وسُجّل اليوم.
console.log("\n── الصلة أوّلاً ──");
const AB: Row[] = [
  { id: "A", patientName: "حيدر جاسم",  waitingSince: "2026-01-01T00:00:00Z" },
  { id: "B", patientName: "حيدر جاسمم", waitingSince: "2026-08-01T00:00:00Z" },
];
same("أ. الأحدث أوّلاً: التامّ الأقدم يسبق التقريبيّ الأحدث",
  run(AB, "حيدر جاسم", "newest"), ["A", "B"]);
same("   والأقدم أوّلاً: التامّ يبقى أوّلاً كذلك",
  run(AB, "حيدر جاسم", "oldest"), ["A", "B"]);
//  والدليلُ المضادّ: لو رُتّب بالانتظار بعد الصلة لانقلب الأوّل.
same("   ولو رُتّب بالانتظار فوق الصلة لتصدّر التقريبيّ (وهذا ما لم نفعله)",
  [...AB].sort((a, b) =>
    new Date(b.waitingSince!).getTime() - new Date(a.waitingSince!).getTime())
    .map((r) => r.id),
  ["B", "A"]);

// ══ ب. والسلّم كلّه محفوظ لا التامّ وحده ═══════════════════════════════
console.log("\n── السلّم كاملاً ──");
const LADDER: Row[] = [
  //  عمداً بترتيب انتظارٍ يعاكس الصلة تماماً: الأضعفُ صلةً هو الأحدث.
  { id: "fuzzy",  patientName: "كريب عباس",  waitingSince: "2026-08-05T00:00:00Z" },
  { id: "sub",    patientName: "عبد الكريم", waitingSince: "2026-08-04T00:00:00Z" },
  { id: "token",  patientName: "علي كريم",   waitingSince: "2026-08-03T00:00:00Z" },
  { id: "prefix", patientName: "كريم عادل",  waitingSince: "2026-08-02T00:00:00Z" },
  { id: "exact",  patientName: "كريم",       waitingSince: "2026-08-01T00:00:00Z" },
];
same("ب. الترتيب بالصلة رغم أن الانتظار يعاكسه تماماً (الأحدث أوّلاً)",
  run(LADDER, "كريم", "newest"), ["exact", "prefix", "token", "sub", "fuzzy"]);
same("   وبالأقدم أوّلاً كذلك — الاتجاه لا يمسّ السلّم",
  run(LADDER, "كريم", "oldest"), ["exact", "prefix", "token", "sub", "fuzzy"]);

// ══ ج. الانتظار كاسرَ تعادلٍ داخل الرتبة الواحدة ═══════════════════════
console.log("\n── داخل الرتبة الواحدة ──");
const TIED: Row[] = [
  { id: "old", patientName: "سالم كاظم", waitingSince: "2026-01-01T00:00:00Z" },
  { id: "mid", patientName: "سالم ناصر", waitingSince: "2026-04-01T00:00:00Z" },
  { id: "new", patientName: "سالم فاضل", waitingSince: "2026-08-01T00:00:00Z" },
];
same("ج. ثلاثتُهم ببادئةٍ واحدة ⟶ يحكم الانتظار (الأحدث أوّلاً)",
  run(TIED, "سالم", "newest"), ["new", "mid", "old"]);
same("   والاتجاه ينقلبهم",
  run(TIED, "سالم", "oldest"), ["old", "mid", "new"]);

// ══ د. الرمز والاسم البديل يعملان هنا كما في السجلّ ═════════════════════
console.log("\n── الرمز والاسم البديل ──");
const CODED: Row[] = [
  { id: "p1", patientName: "زيدان فالح", patientCode: "WB-01629",
    aliasCodes: ["WB-00777"], waitingSince: "2026-01-01T00:00:00Z" },
  { id: "p2", patientName: "سجاد نوري", patientCode: "WB-01630",
    waitingSince: "2026-08-01T00:00:00Z" },
];
same("د. البحث بالرمز الحالي", run(CODED, "WB-01629", "newest"), ["p1"]);
same("   وبالرمز القديم بعد الدمج", run(CODED, "WB-00777", "newest"), ["p1"]);
same("   وبصيغةٍ مشوّهة", run(CODED, "wb 00777", "newest"), ["p1"]);
same("   ورمزُ الآخر يجد الآخر", run(CODED, "WB-01630", "newest"), ["p2"]);
same("   ورمزٌ لا وجود له لا يجد شيئاً", run(CODED, "WB-99999", "newest"), []);

// ══ هـ. بلا بحث: الاختصاصُ يحكم الصفحات ═══════════════════════════════
// سيناريو المالك حرفياً: ١٥ أطراف + ٥ علاج طبيعي، الصفحة عشرة.
console.log("\n── بلا بحث: الاختصاص أوّلاً ──");
const mkRow = (id: string, caseType: string, day: number): Row => ({
  id, caseType, patientName: `مريض ${id}`,
  //  اليوم أكبر = انتظارٌ أحدث.
  waitingSince: `2026-08-${String(day).padStart(2, "0")}T00:00:00Z`,
});
//  مُدخلٌ مبعثرٌ عمداً: العلاجُ الطبيعي أحدثُ الجميع، فلو حكم الانتظارُ
//  وحده لتصدّر الصفحةَ الأولى كلَّها.
const MIXED: Row[] = [];
for (let i = 1; i <= 5; i++) MIXED.push(mkRow(`طبيعي${i}`, "physiotherapy", 20 + i));
for (let i = 1; i <= 15; i++) MIXED.push(mkRow(`أطراف${i}`, "prosthetic", i));

const P1 = page(MIXED, "", "newest", 10, 1);
const P2 = page(MIXED, "", "newest", 10, 2);
same("هـ. الصفحة الأولى أطرافٌ كلّها (١٠ من ١٥)",
  P1.filter((id) => id.startsWith("أطراف")).length, 10);
same("   ولا صفَّ علاجٍ طبيعيّ فيها رغم أنه الأحدث",
  P1.filter((id) => id.startsWith("طبيعي")), []);
same("   والصفحة الثانية: بقيّةُ الأطراف الخمسة ثمّ العلاج الخمسة",
  P2, ["أطراف5", "أطراف4", "أطراف3", "أطراف2", "أطراف1",
       "طبيعي5", "طبيعي4", "طبيعي3", "طبيعي2", "طبيعي1"]);
same("   ولا صفَّ يضيع ولا يتكرّر", new Set([...P1, ...P2]).size, 20);

//  والمساند بينهما — الترتيب الثلاثي كاملاً.
console.log("\n── والمساند بين الاثنين ──");
const THREE: Row[] = [
  mkRow("طبيعي", "physiotherapy", 9),
  mkRow("مساند", "medical_support", 8),
  mkRow("أطراف", "prosthetic", 7),
];
same("   أطراف ⟶ مساند ⟶ علاج طبيعي، رغم أن الانتظار يعاكسه",
  run(THREE, "", "newest"), ["أطراف", "مساند", "طبيعي"]);
same("   وبالأقدم أوّلاً كذلك — الاتجاه لا يمسّ ترتيب الأقسام",
  run(THREE, "", "oldest"), ["أطراف", "مساند", "طبيعي"]);

//  والانتظار يحكم **داخل** الاختصاص وحده.
console.log("\n── الانتظار داخل الاختصاص ──");
const WITHIN: Row[] = [
  mkRow("ط-قديم", "physiotherapy", 1), mkRow("ط-حديث", "physiotherapy", 9),
  mkRow("أ-قديم", "prosthetic", 2),    mkRow("أ-حديث", "prosthetic", 8),
];
same("   الأحدث أوّلاً داخل كل قسم",
  run(WITHIN, "", "newest"), ["أ-حديث", "أ-قديم", "ط-حديث", "ط-قديم"]);
same("   والأقدم أوّلاً ينقلبهم داخل كل قسم ولا يخلط القسمين",
  run(WITHIN, "", "oldest"), ["أ-قديم", "أ-حديث", "ط-قديم", "ط-حديث"]);

// ══ و. ومع البحث: الاختصاص لا يدفع شيئاً فوق الصلة ═════════════════════
console.log("\n── مع البحث: الصلة فوق الاختصاص ──");
const CROSS: Row[] = [
  //  أطرافٌ أحدثُ وتشبه ما كُتب بخطأ حرف · وعلاجٌ طبيعيٌّ أقدمُ ويطابقه تماماً.
  { id: "أطراف-تقريبي", caseType: "prosthetic", patientName: "سعد كاظمم",
    waitingSince: "2026-08-20T00:00:00Z" },
  { id: "طبيعي-تامّ", caseType: "physiotherapy", patientName: "سعد كاظم",
    waitingSince: "2026-01-01T00:00:00Z" },
];
same("و. المطابقُ تماماً يتصدّر ولو كان علاجاً طبيعياً وأقدم",
  run(CROSS, "سعد كاظم", "newest"), ["طبيعي-تامّ", "أطراف-تقريبي"]);
same("   وبالأقدم أوّلاً كذلك", run(CROSS, "سعد كاظم", "oldest"),
  ["طبيعي-تامّ", "أطراف-تقريبي"]);
same("   **وبلا بحثٍ ينقلب الترتيب** — فالقاعدتان مختلفتان فعلاً لا اسماً",
  run(CROSS, "", "newest"), ["أطراف-تقريبي", "طبيعي-تامّ"]);

// ══ ز. البحث الفارغ داخل الاختصاص الواحد لم يتغيّر ═════════════════════
console.log("\n── البحث الفارغ ──");
same("ز. بلا بحث واختصاصٌ واحد: الأحدث أوّلاً حرفاً بحرف",
  run(LADDER, "", "newest"), ["fuzzy", "sub", "token", "prefix", "exact"]);
same("   والأقدم أوّلاً كذلك",
  run(LADDER, "", "oldest"), ["exact", "prefix", "token", "sub", "fuzzy"]);
same("   والمسافات وحدها = بلا بحث",
  run(LADDER, "   ", "newest"), ["fuzzy", "sub", "token", "prefix", "exact"]);

// ══ ح. ولا تُعدَّل القائمة الأصلية ═════════════════════════════════════
console.log("\n── مصفوفة react-query ──");
const original = LADDER.map((r) => r.id);
run(LADDER, "كريم", "newest");
run(LADDER, "", "oldest");
same("ح. المصدر كما هو بعد كل النداءات", LADDER.map((r) => r.id), original);
same("   والمختلطة كذلك", MIXED.map((r) => r.id).length, 20);

// ══ ط. تاريخٌ غائب أو تالف لا يُسقط الترتيب ════════════════════════════
console.log("\n── تاريخٌ ناقص ──");
// أطوالٌ متساوية عمداً: كسرُ التعادل داخل رتبة البادئة يفضّل الاسم الأقصر
// بقيّةً، فلو اختلفت الأطوال لحكم هو قبل أن يصل الدور إلى الانتظار.
const MISSING: Row[] = [
  { id: "none", patientName: "منتظر ألف", waitingSince: null },
  { id: "bad",  patientName: "منتظر باء", waitingSince: "not-a-date" },
  { id: "ok",   patientName: "منتظر جيم", waitingSince: "2026-08-01T00:00:00Z" },
];
same("ط. الناقص يقع في طرفٍ محدّد لا عشوائياً (الأحدث أوّلاً)",
  run(MISSING, "منتظر", "newest"), ["ok", "none", "bad"]);
same("   والعكس بالعكس", run(MISSING, "منتظر", "oldest"), ["none", "bad", "ok"]);
same("   ولا صفَّ يضيع", run(MISSING, "", "newest").length, 3);

console.log(`\n${failures === 0 ? "✅ ترتيبُ «معايناتي» يحفظ الصلة" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
