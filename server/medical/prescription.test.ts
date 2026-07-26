// Pure-function tests for the prescription vocabulary. No database, so this
// runs anywhere: `npm run test:prescription`.
//
// Why: the doctor's exam now writes the same patient columns reception has
// always written. If a spec key, an option value or the injury serialization
// drifts from what the patient form produces, records written by a doctor stop
// matching records written by a clerk — silently, and only visible months later
// in a report. These assertions pin that contract down.

import { serializeInjuries, parseInjuries, INJURY_TYPE_OPTIONS, INJURY_AREA_OPTIONS, PROSTHETIC_SPECS } from "@shared/case_fields";
import { PHYSIO_TREATMENT_TYPES } from "@shared/pricing";

let fail = 0;
const ok = (label: string, cond: boolean) => { if (!cond) fail++; console.log(`${cond ? "✅" : "❌"} ${label}`); };

// Serialization must be byte-identical to what CreatePatient writes.
const rows = [
  { type: "كسر", area: "الركبة", side: "يمين" },
  { type: "سوفان", area: "الورك", side: "" },
  { type: "", area: "", side: "يسار" },          // empty row -> dropped
];
const s = serializeInjuries(rows);
ok("الصفّ الفارغ يُسقَط من JSON", JSON.parse(s.injuries).length === 2);
ok("نوع الإصابة يُجمع بالفاصلة العربية", s.injuryType === "كسر، سوفان");
ok("منطقة الإصابة تُجمع بالفاصلة العربية", s.injuryArea === "الركبة، الورك");
ok("الجهة محفوظة داخل JSON", JSON.parse(s.injuries)[0].side === "يمين");

// Round-trip through the parser used by the display layer.
const back = parseInjuries(s.injuries);
ok("الدورة الكاملة تُرجع الصفّين", back.length === 2 && back[0].type === "كسر" && back[1].area === "الورك");
ok("المدخل التالف لا يرمي استثناءً", parseInjuries("{ليس JSON").length === 0);
ok("قائمة فارغة لا تنتج JSON", serializeInjuries([{ type: "", area: "", side: "" }]).injuries === "");

// The option lists must be supersets of what the app already stores.
ok("قائمة الإصابات تحوي الـ34 قيمة", INJURY_TYPE_OPTIONS.length === 34);
ok("«نتوء عظمي» موجودة", INJURY_TYPE_OPTIONS.includes("نتوء عظمي"));
ok("«ورم خبيث» موجودة", INJURY_TYPE_OPTIONS.includes("ورم خبيث"));
ok("مناطق الإصابة 23 قيمة", INJURY_AREA_OPTIONS.length === 23);
ok("حقول الطرف السبعة كاملة", PROSTHETIC_SPECS.length === 7);

// The doctor's treatment picker must offer exactly what pricing knows.
ok("أنواع العلاج تطابق جدول التسعير", PHYSIO_TREATMENT_TYPES.length === 5 && PHYSIO_TREATMENT_TYPES.includes("روبوت"));

// Spec keys must match the patient columns the writer targets.
const cols = ["prostheticType","siliconType","siliconSize","suspensionSystem","footType","footSize","kneeJointType"];
ok("مفاتيح الحقول تطابق أعمدة المريض", PROSTHETIC_SPECS.every((f, i) => f.key === cols[i]));

console.log(fail === 0 ? "\n✅ الكل ناجح" : `\n❌ ${fail} فشل`);
process.exit(fail === 0 ? 0 : 1);
