// ترتيبُ «معايناتي»: الصلةُ أوّلاً والانتظارُ كاسرَ تعادل — بلا قاعدة بيانات.
// `npm run test:worklist-order`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// أوّلُ ربطٍ للبحث في هذه الصفحة رشّح ورتّب بالصلة، **ثمّ** أعاد الترتيب
// بالانتظار فوقه — فمحا الصلةَ كلّها. النتيجة: الطبيب يكتب اسم مريضٍ كاملاً
// صحيحاً فيجده تحت اسمٍ يشبهه لأن ذاك سُجّل اليوم.
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
  }).map((r) => r.id);

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

// ══ هـ. البحث الفارغ لم يتغيّر بشيء ════════════════════════════════════
console.log("\n── البحث الفارغ ──");
same("هـ. بلا بحث: الأحدث أوّلاً حرفاً بحرف",
  run(LADDER, "", "newest"), ["fuzzy", "sub", "token", "prefix", "exact"]);
same("   والأقدم أوّلاً كذلك",
  run(LADDER, "", "oldest"), ["exact", "prefix", "token", "sub", "fuzzy"]);
same("   والمسافات وحدها = بلا بحث",
  run(LADDER, "   ", "newest"), ["fuzzy", "sub", "token", "prefix", "exact"]);

// ══ و. ولا تُعدَّل القائمة الأصلية ═════════════════════════════════════
console.log("\n── مصفوفة react-query ──");
const original = LADDER.map((r) => r.id);
run(LADDER, "كريم", "newest");
run(LADDER, "", "oldest");
same("و. المصدر كما هو بعد كل النداءات", LADDER.map((r) => r.id), original);

// ══ ز. تاريخٌ غائب أو تالف لا يُسقط الترتيب ════════════════════════════
console.log("\n── تاريخٌ ناقص ──");
// أطوالٌ متساوية عمداً: كسرُ التعادل داخل رتبة البادئة يفضّل الاسم الأقصر
// بقيّةً، فلو اختلفت الأطوال لحكم هو قبل أن يصل الدور إلى الانتظار.
const MISSING: Row[] = [
  { id: "none", patientName: "منتظر ألف", waitingSince: null },
  { id: "bad",  patientName: "منتظر باء", waitingSince: "not-a-date" },
  { id: "ok",   patientName: "منتظر جيم", waitingSince: "2026-08-01T00:00:00Z" },
];
same("ز. الناقص يقع في طرفٍ محدّد لا عشوائياً (الأحدث أوّلاً)",
  run(MISSING, "منتظر", "newest"), ["ok", "none", "bad"]);
same("   والعكس بالعكس", run(MISSING, "منتظر", "oldest"), ["none", "bad", "ok"]);
same("   ولا صفَّ يضيع", run(MISSING, "", "newest").length, 3);

console.log(`\n${failures === 0 ? "✅ ترتيبُ «معايناتي» يحفظ الصلة" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
