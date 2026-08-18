// صيغةُ رمز المريض وتطبيعُه — منطقٌ خالص، بلا قاعدة بيانات.
// `npm run test:patient-code`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **لا قصَّ فوق ٩٩٩٩٩**: `LPAD(n,5,'0')` تقصّ في Postgres، و`padStart`
//     في جافاسكربت لا تقصّ. فالخطر في الطرف الآخر، وهذا الاختبار يثبّت
//     العقد الذي يجب أن يطابقه الترحيل.
// (٢) **الرقم المجرّد ليس رمزاً**: «00042» في مربّع بحثٍ يبحث في الهواتف
//     أيضاً قد يكون بداية رقم — فتفسيرُه رمزاً يسرق البحث من صاحبه.
// (٣) **والمدخل متساهل**: ما يكتبه الموظّف نقلاً عن ورقةٍ أو إملاءً هاتفياً.

import {
  formatPatientCode, isCanonicalPatientCode, looksLikePatientCode,
  normalizePatientCode, PATIENT_CODE_PATTERN,
  parsePatientCodeQuery, patientCodePrefixRange,
} from "./patient_code";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

// ══ أ. الصياغة ════════════════════════════════════════════════════════
console.log("\n── الصياغة ──");
same("أ. 1 ⟶ WB-00001", formatPatientCode(1), "WB-00001");
same("   42 ⟶ WB-00042", formatPatientCode(42), "WB-00042");
same("   1629 ⟶ WB-01629", formatPatientCode(1629), "WB-01629");
same("   99999 ⟶ WB-99999", formatPatientCode(99999), "WB-99999");
same("   **100000 ⟶ WB-100000 (بلا قصّ)**", formatPatientCode(100000), "WB-100000");
same("   و 1234567 كذلك", formatPatientCode(1234567), "WB-1234567");
check(PATIENT_CODE_PATTERN.test(formatPatientCode(100000)),
  "   والناتج فوق مئة ألف يبقى قانونياً");

console.log("\n── القانونية ──");
same("   القانوني يُقبل", ["WB-00001", "WB-99999", "WB-100000"].map(isCanonicalPatientCode),
  [true, true, true]);
same("   وغيره يُردّ",
  ["wb-00001", "WB-0001", "WB00001", "WB-", "00001", "", null, 42].map(isCanonicalPatientCode),
  [false, false, false, false, false, false, false, false]);

// ══ ب. التطبيع ════════════════════════════════════════════════════════
console.log("\n── التطبيع ──");
for (const raw of ["WB-00042", "wb-00042", "WB00042", "wb00042", "WB 00042",
  "  WB-00042  ", "Wb_00042", "wB - 00042"]) {
  same(`ب. «${raw}» ⟶ WB-00042`, normalizePatientCode(raw), "WB-00042");
}
same("   والأرقام العربية تُقرأ", normalizePatientCode("WB-٠٠٠٤٢"), "WB-00042");
same("   والأصفار الزائدة لا تصنع رمزاً آخر",
  normalizePatientCode("WB-000042"), "WB-00042");
same("   وفوق مئة ألف يمرّ كما هو", normalizePatientCode("wb100000"), "WB-100000");

console.log("\n── وما ليس رمزاً ──");
same("   **الرقم المجرّد ليس رمزاً**",
  ["00042", "42", "07701234567", "١٦٢٩"].map(normalizePatientCode),
  [null, null, null, null]);
same("   والاسم ليس رمزاً",
  ["حميد ذياب", "wb", "WB-", "WBxyz", "AB-00042"].map(normalizePatientCode),
  [null, null, null, null, null]);
same("   والناقص عن خمس خانات يُردّ",
  ["WB-42", "wb0042", "WB-9999"].map(normalizePatientCode), [null, null, null]);
same("   وغير النصّ يُردّ", [null, undefined, 42, {}].map(normalizePatientCode),
  [null, null, null, null]);

// ══ ج. «يبدو رمزاً» — لرسائل الواجهة لا للحلّ ═════════════════════════
console.log("\n── يبدو رمزاً ──");
same("ج. المكتوب ناقصاً يبدو رمزاً (فيُقال له إن الرمز خمس خانات)",
  ["WB-42", "wb1", "WB 9"].map(looksLikePatientCode), [true, true, true]);
same("   والاسم لا يبدو رمزاً",
  ["حميد", "0770", "", "WB"].map(looksLikePatientCode), [false, false, false, false]);

// ══ د. القراءة التدريجية — بادئةُ WB وهي تُكتب ═════════════════════════
// العطبُ: `normalizePatientCode` تجيب «هل هذا رمزٌ كامل؟» وحدها، فكلُّ ما
// دون خمس خاناتٍ صار بحثَ اسم — يكتب الموظّف W ثمّ B ثمّ - ثمّ 0 فلا يرى
// شيئاً حتى تكتمل الخانة الخامسة.
console.log("\n── البادئة التدريجية ──");
const pq = (v: unknown) => {
  const r = parsePatientCodeQuery(v);
  return [r.explicit, r.prefix, r.full];
};
same("د. W وحدها بادئةٌ صريحة", pq("W"), [true, "WB-", null]);
same("   وWB", pq("WB"), [true, "WB-", null]);
same("   وWB-", pq("WB-"), [true, "WB-", null]);
same("   وwb صغيرة", pq("wb"), [true, "WB-", null]);
same("   وWB-0", pq("WB-0"), [true, "WB-0", null]);
same("   وWB-02", pq("WB-02"), [true, "WB-02", null]);
same("   وWB-021", pq("WB-021"), [true, "WB-021", null]);
same("   وWB-0211", pq("WB-0211"), [true, "WB-0211", null]);
same("   **وWB-02119 تكتمل فتصير رمزاً**", pq("WB-02119"), [true, "WB-02119", "WB-02119"]);
same("   وبلا شَرطة: wb02", pq("wb02"), [true, "WB-02", null]);
same("   وبفراغ: WB 02", pq("WB 02"), [true, "WB-02", null]);
same("   وبالأرقام العربية: WB-٠٢", pq("WB-٠٢"), [true, "WB-02", null]);
same("   وWB-٠٢١١٩ كاملةً", pq("WB-٠٢١١٩"), [true, "WB-02119", "WB-02119"]);
same("   والأصفار الزائدة تُطبَّع: WB-000042", pq("WB-000042"), [true, "WB-00042", "WB-00042"]);
same("   والفراغ حول الكلّ", pq("  wb-02  "), [true, "WB-02", null]);

console.log("\n── وما ليس بادئةَ رمز ──");
same("   الاسم العربي", pq("أحمد"), [false, "", null]);
same("   والرقم المجرّد", pq("02119"), [false, "", null]);
same("   والهاتف", pq("07701234567"), [false, "", null]);
same("   **وWBX ليست رمزاً** — فاسمٌ لاتينيٌّ لا يُختطف", pq("WBX"), [false, "", null]);
same("   وWB-02X كذلك", pq("WB-02X"), [false, "", null]);
same("   واسمٌ يحوي WB في وسطه", pq("مركز WB الطبي"), [false, "", null]);
same("   والفارغ", pq(""), [false, "", null]);
same("   وغير النصّ", [null, undefined, 42].map((v) => parsePatientCodeQuery(v).explicit),
  [false, false, false]);

// ══ هـ. مدى البادئة — تسريعٌ لا يغيّر الدلالة ══════════════════════════
console.log("\n── مدى البادئة ──");
const rng = (p: string, d: string) => {
  const r = patientCodePrefixRange(p, d);
  return r ? [r.lo, r.hi] : null;
};
same("هـ. WB-02 ⟶ [WB-02, WB-03)", rng("WB-02", "02"), ["WB-02", "WB-03"]);
same("   وWB-0 ⟶ [WB-0, WB-1)", rng("WB-0", "0"), ["WB-0", "WB-1"]);
same("   وWB-0211 ⟶ [WB-0211, WB-0212)", rng("WB-0211", "0211"), ["WB-0211", "WB-0212"]);
same("   والتسعةُ تحمل: WB-09 ⟶ [WB-09, WB-1)", rng("WB-09", "09"), ["WB-09", "WB-1"]);
same("   وWB-0299 ⟶ [WB-0299, WB-03)", rng("WB-0299", "0299"), ["WB-0299", "WB-03"]);
same("   **وبلا خانةٍ لا مدى** (WB-)", rng("WB-", ""), null);
same("   **والتسعاتُ كلُّها لا مدى** — فيبقى LIKE وحده",
  [rng("WB-9", "9"), rng("WB-99", "99")], [null, null]);

//  والمدى يجب أن يغطّي البادئة فعلاً — يُتحقَّق بالمقارنة النصّية نفسها.
const covers = (digits: string, code: string) => {
  const prefix = "WB-" + digits;
  const r = patientCodePrefixRange(prefix, digits)!;
  return code >= r.lo && code < r.hi;
};
check(covers("02", "WB-02119") && covers("02", "WB-02000") && covers("02", "WB-029999"),
  "   وكلُّ رمزٍ ببادئة 02 داخل المدى");
check(!covers("02", "WB-03000") && !covers("02", "WB-01999"),
  "   وما خرج عنها خارج المدى");
check(covers("09", "WB-09999") && !covers("09", "WB-10000"),
  "   والحملُ فوق التسعة صحيح");

console.log(`\n${failures === 0 ? "✅ all patient-code cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
