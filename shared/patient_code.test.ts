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

console.log(`\n${failures === 0 ? "✅ all patient-code cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
