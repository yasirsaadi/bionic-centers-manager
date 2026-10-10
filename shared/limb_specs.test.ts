// **مواصفاتُ الطرف بحسب البتر** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de). `npm run test:limb-specs` — قواعدُ خالصة بلا قاعدة.
//
// يحرس: (١) تحت الركبة بلا ركبة، والسليكونيُّ بلا قدمٍ ولا ركبةٍ ولا سوكيت، والعلويُّ بلا ركبةٍ ولا قدم؛ (٢) مبتورُ الطرفين خاناتٌ لكلّ جهة،
// و«متماثلان» تُكتب مرّةً للطرفين؛ (٣) ولا يُخفى مكتوب؛ (٤) و«اشترى» يشترط ما يخصّ البترَ وحده — بجهاته؛ (٥) وأمرُ التصنيع لا يفقد خانة.
import {
  KNEE_LEVELS, LIMB_SPEC_KEYS, limbSlots, limbSlotsOfSite, limbSpecFlat, limbSpecKeys, limbSpecValue, limbSpecView, normalizeLimbSpecs,
  slotsCanShare, splitSpecKey,
} from "./limb_specs";
import { cleanSaleSpecsInput, mergeDeviceSpecs, missingSaleSpecs, saleSpecFieldsFor, saleSpecsMessage, specResolved, NOT_APPLICABLE } from "./device_specs";
import { sheetSpecRows, sheetSpecView } from "./intake_sheet_view";
import { buildAmputationSite, LOWER_AMPUTATION_DETAILS, PROSTHETIC_DEVICE_SPECS, type AmputationParts } from "./case_fields";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const ALL = ["prostheticType", "kneeJointType", "footType", "socketType", "siliconType"];
const NO_KNEE = ["prostheticType", "footType", "socketType", "siliconType"];
const BK: AmputationParts = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };
const AK: AmputationParts = { amputationType: "single", singleLimb: "lower", singleSide: "left", singleDetail: "فوق الركبة" };
const DBL = (r: string, l: string): AmputationParts => ({ amputationType: "double", doubleLimbType: "lower", doubleRightDetail: r, doubleLeftDetail: l });
const site = (p: AmputationParts) => buildAmputationSite(p);

console.log("\n── أ. ما يخصّ الطرفَ بمستواه ──");
same("أ.١ الخمسُ بترتيب الورقة", LIMB_SPEC_KEYS, ALL);
same("أ.٢ **تحت الركبة بلا ركبة** — وسايمز وجوبارت مثلُه",
  [limbSpecKeys("lower", "تحت الركبة"), limbSpecKeys("lower", "سايمز"), limbSpecKeys("lower", "جوبارت")], [NO_KNEE, NO_KNEE, NO_KNEE]);
same("أ.٣ وخلالَ الركبة وفوقها وخلالَ الحوض بالركبة", KNEE_LEVELS.map((l) => limbSpecKeys("lower", l)), [ALL, ALL, ALL]);
check(LOWER_AMPUTATION_DETAILS.every((l) => KNEE_LEVELS.includes(l) || !limbSpecKeys("lower", l).includes("kneeJointType")),
  "أ.٤ كلُّ مستوى سفليٍّ في القائمة محسوم: ركبةٌ لما فوق الساق وحده");
same("أ.٥ **العلويُّ بلا ركبةٍ ولا قدم**", limbSpecKeys("upper", "تحت المرفق"), ["prostheticType", "socketType", "siliconType"]);
same("أ.٦ **والسليكونيُّ التعويضيّ نوعُه وسيليكونُه** — لا قدمَ ولا ركبةَ ولا سوكيت", limbSpecKeys("silicone", "اصبع"), ["prostheticType", "siliconType"]);
same("أ.٧ **والمجهولُ لا يُخفي شيئاً** (مستوى لم يُختر، أو نصٌّ قديم، أو بلا بتر)",
  [limbSpecKeys("lower", ""), limbSpecKeys("lower", "نصٌّ حرّ"), limbSpecKeys(null, null)], [ALL, ALL, ALL]);

console.log("\n── ب. الطرفان ──");
same("ب.١ أحاديٌّ وسليكونيٌّ ومجهول ⟵ طرفٌ واحد بلا جهة",
  [limbSlots(BK).map((s) => s.side), limbSlots({ amputationType: "silicone", siliconePart: "اذن" }).map((s) => [s.side, s.kind]), limbSlots({}).length],
  [[null], [[null, "silicone"]], 1]);
same("ب.٢ **ثنائيٌّ سفليّ ⟵ يمين ثمّ يسار، لكلٍّ مستواه وخاناتُه**",
  limbSlots(DBL("تحت الركبة", "فوق الركبة")).map((s) => [s.side, s.level, s.keys.length]), [["right", "تحت الركبة", 4], ["left", "فوق الركبة", 5]]);
same("ب.٣ و«علوي وسفلي» لكلّ جهةٍ طرفُها",
  limbSlots({ amputationType: "double", doubleLimbType: "both", bothRightLimb: "upper", bothRightDetail: "تحت المرفق", bothLeftLimb: "lower", bothLeftDetail: "تحت الركبة" })
    .map((s) => [s.side, s.kind, s.keys]), [["right", "upper", ["prostheticType", "socketType", "siliconType"]], ["left", "lower", NO_KNEE]]);
same("ب.٤ **«متماثلان» حين تتطابق الخانات** — تحت الركبة مع سايمز نعم، ومع فوقها لا، وعلويٌّ مع سفليّ لا",
  [slotsCanShare(limbSlots(DBL("تحت الركبة", "تحت الركبة"))), slotsCanShare(limbSlots(DBL("تحت الركبة", "سايمز"))),
    slotsCanShare(limbSlots(DBL("تحت الركبة", "فوق الركبة"))), slotsCanShare(limbSlots(BK))], [true, true, false, false]);
same("ب.٥ والبترُ يُقرأ من سلسلته المركّبة نفسِها", limbSlotsOfSite(site(DBL("تحت الركبة", "فوق الركبة"))).map((s) => s.level), ["تحت الركبة", "فوق الركبة"]);
same("ب.٦ **قيمةُ الجهة: مفتاحُها ثمّ العامّ**",
  [limbSpecValue({ footType: "كاربون", "footType:left": "مرنة" }, "footType", "left"), limbSpecValue({ footType: "كاربون" }, "footType", "right"),
    limbSpecValue({ "footType:left": "مرنة" }, "footType", null), splitSpecKey("kneeJointType:left"), splitSpecKey("socketType")],
  ["مرنة", "كاربون", "", { base: "kneeJointType", side: "left" }, { base: "socketType", side: null }]);
same("ب.٧ وعمودُ ملفّ المريض يقرأ الطرفين كاملين", [limbSpecFlat({ "footType:right": "كاربون", "footType:left": "مرنة" }, "footType"),
  limbSpecFlat({ footType: "كاربون", "footType:left": "x" }, "footType"), limbSpecFlat({}, "footType")], ["يمين: كاربون | يسار: مرنة", "كاربون", ""]);

console.log("\n── ج. ما يُعرض ──");
const rowsOf = (specs: Record<string, unknown>) => sheetSpecRows({ serviceType: "prosthetic", specs: specs as Record<string, string> }).map((r) => [r.key, r.value]);
same("ج.١ **تحت الركبة ⟵ لا سطرَ للركبة** — و«لا ينطبق» القديمةُ فيها لا تُظهره",
  rowsOf({ amputationSite: site(BK), prostheticType: "طرف", kneeJointType: NOT_APPLICABLE, footType: "كاربون" }),
  [["prostheticType", "طرف"], ["footType", "كاربون"], ["socketType", null], ["siliconType", null]]);
same("ج.٢ **ولا يُخفى مكتوب**: ركبةٌ مكتوبةٌ بقيمةٍ حقيقية لتحت الركبة تُعرض",
  rowsOf({ amputationSite: site(BK), kneeJointType: "هيدروليك" }).map((r) => r[0]), ["prostheticType", "kneeJointType", "footType", "socketType", "siliconType"]);
same("ج.٣ سليكونيٌّ ⟵ النوعُ والسيليكونُ وحدهما",
  rowsOf({ amputationSite: site({ amputationType: "silicone", siliconePart: "اصبع", siliconeSide: "right" }), prostheticType: "إصبع سليكون" }),
  [["prostheticType", "إصبع سليكون"], ["siliconType", null]]);
same("ج.٤ وبلا بترٍ مسجَّل (معاينةٌ قديمة) ⟵ الخمسُ كما كانت", rowsOf({ prostheticType: "طرف" }).map((r) => r[0]), ALL);
const identical = sheetSpecView({ serviceType: "prosthetic", specs: { amputationSite: site(DBL("تحت الركبة", "تحت الركبة")), prostheticType: "طرف", footType: "كاربون" } });
same("ج.٥ **طرفان متماثلان ⟵ صفٌّ لكلّ خانة بقيمته للطرفين**", [identical.mode, identical.rows.map((r) => [r.key, r.value, r.sides === undefined])],
  ["identical", [["prostheticType", "طرف", true], ["footType", "كاربون", true], ["socketType", null, true], ["siliconType", null, true]]]);
const split = sheetSpecView({ serviceType: "prosthetic", specs: {
  amputationSite: site(DBL("تحت الركبة", "فوق الركبة")), "prostheticType:right": "تحت ركبة", "prostheticType:left": "فوق ركبة",
  "kneeJointType:left": "هيدروليك", footType: "كاربون",
} });
same("ج.٦ **مختلفان ⟵ لكلّ جهةٍ قيمتُها، والركبةُ لليسار وحده** (اليمين «لا ينطبق»)، والعامُّ يملأ الجهتين",
  [split.mode, split.rows.map((r) => [r.key, r.value, r.sides?.map((x) => [x.side, x.applicable, x.value])])],
  ["split", [
    ["prostheticType", "يمين: تحت ركبة · يسار: فوق ركبة", [["right", true, "تحت ركبة"], ["left", true, "فوق ركبة"]]],
    ["kneeJointType", "يسار: هيدروليك", [["right", false, null], ["left", true, "هيدروليك"]]],
    ["footType", "يمين: كاربون · يسار: كاربون", [["right", true, "كاربون"], ["left", true, "كاربون"]]],
    ["socketType", null, [["right", true, null], ["left", true, null]]],
    ["siliconType", null, [["right", true, null], ["left", true, null]]],
  ]]);
same("ج.٧ وطرفان متماثلا الخانات بلا قيمةٍ بعد ⟵ نصفان فارغان (لا «للطرفين» تخميناً)",
  sheetSpecView({ serviceType: "prosthetic", specs: { amputationSite: site(DBL("تحت الركبة", "تحت الركبة")) } }).mode, "split");
//  **أمرُ التصنيع لا يفقد خانة**: صفحةُ الأمر صارت تقرأ هذه الأسطر — فكلُّ خانةٍ من قائمة الجهاز القانونية تظهر حين تُكتب.
const everything = Object.fromEntries(PROSTHETIC_DEVICE_SPECS.map((f) => [f.key, `قيمة ${f.key}`]));
same("ج.٨ **كلُّ خانةٍ من قائمة الجهاز القانونية تظهر حين تُكتب** (بلا بترٍ مسجَّل)",
  sheetSpecRows({ serviceType: "prosthetic", specs: everything }).map((r) => r.key).sort(), PROSTHETIC_DEVICE_SPECS.map((f) => f.key).sort());
same("ج.٩ والمسندُ نوعُه", sheetSpecRows({ serviceType: "medical_support", specs: { supportType: "مشد" } }), [{ key: "supportType", label: "نوع المسند", value: "مشد" }]);

/** الوصفةُ سجلٌّ مفتوح المفاتيح (مفاتيحُ الجهات) — فتُقرأ نتيجتُها كذلك. */
const N = (x: Record<string, unknown>): Record<string, unknown> => normalizeLimbSpecs(x);
console.log("\n── د. وصفةُ الطبيب تتبع البتر ──");
same("د.١ **من فوق الركبة إلى تحتها ⟵ الركبةُ تُحذف**",
  N({ ...BK, prostheticType: "طرف", kneeJointType: "هيدروليك", footType: "كاربون" }),
  { ...BK, prostheticType: "طرف", footType: "كاربون" });
same("د.٢ سليكونيٌّ ⟵ القدمُ والركبةُ والسوكيتُ تُحذف",
  N({ amputationType: "silicone", siliconePart: "اذن", prostheticType: "أذن", footType: "x", socketType: "y", siliconType: "طبي" }),
  { amputationType: "silicone", siliconePart: "اذن", prostheticType: "أذن", siliconType: "طبي" });
const toDouble = N({ ...DBL("تحت الركبة", "فوق الركبة"), prostheticType: "طرف", kneeJointType: "هيدروليك" });
same("د.٣ **أحاديٌّ صار ثنائياً مختلفاً ⟵ كلُّ جهةٍ تأخذ العامّ، والركبةُ لفوق الركبة وحدها**",
  [toDouble["prostheticType:right"], toDouble["prostheticType:left"], toDouble["kneeJointType:left"], "kneeJointType:right" in toDouble, "prostheticType" in toDouble, toDouble.limbsIdentical],
  ["طرف", "طرف", "هيدروليك", false, false, false]);
const twoBK = { ...DBL("تحت الركبة", "تحت الركبة"), "footType:right": "كاربون", "footType:left": "مرنة", "socketType:left": "سليكون" };
const ticked = N({ ...twoBK, limbsIdentical: true });
same("د.٤ **أشّر «متماثلان» ⟵ مرّةً للطرفين** (اليمينُ أوّلاً، ثمّ اليسار لما خلا منه اليمين)",
  [ticked.footType, ticked.socketType, Object.keys(ticked).some((k) => k.includes(":")), ticked.limbsIdentical], ["كاربون", "سليكون", false, true]);
const unticked = N({ ...ticked, limbsIdentical: false });
same("د.٥ وأزال التأشير ⟵ الجهتان تأخذان القيمةَ نفسَها ليعدّل إحداهما",
  [unticked["footType:right"], unticked["footType:left"], unticked["socketType:right"], "footType" in unticked], ["كاربون", "كاربون", "سليكون", false]);
const oneLevelFirst = N({ amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "تحت الركبة", limbsIdentical: true });
same("د.٦ **والمربّعُ يبقى ما بقي البترُ ثنائياً** — ولو اختلفت خاناتُ الجهتين لحظةً (مستوى اليسار لم يُختر بعد)؛ "
  + "وثنائيٌّ صار أحادياً ⟵ يسقط المربّع، وما كُتب لجهةٍ يصير خانةَ الطرف الواحد (لا يضيع)",
  [oneLevelFirst.limbsIdentical, N({ ...BK, limbsIdentical: true, "footType:left": "x" })], [true, { ...BK, footType: "x" }]);
same("د.٧ ومتماثلان بمستويين مختلفي الخانات ⟵ لكلّ جهةٍ خاناتُها (المربّعُ لا يعمل)",
  Object.keys(N({ ...DBL("تحت الركبة", "فوق الركبة"), limbsIdentical: true, kneeJointType: "هيدروليك" })).filter((k) => k.startsWith("knee")),
  ["kneeJointType:left"]);

console.log("\n── هـ. «اشترى» يشترط ما يخصّ البتر ──");
const keysFor = (m: Record<string, string>) => saleSpecFieldsFor("prosthetic", m).map((f) => f.key);
same("هـ.١ **تحت الركبة ⟵ لا ركبةَ مطلوبة**، وبلا بترٍ مسجَّل ⟵ الخمسُ كما كانت",
  [keysFor({ amputationSite: site(BK) }), keysFor({})], [["prostheticType", "socketType", "footType", "siliconType"], ["prostheticType", "socketType", "kneeJointType", "footType", "siliconType"]]);
same("هـ.٢ سليكونيٌّ ⟵ النوعُ والسيليكونُ وحدهما",
  keysFor({ amputationSite: site({ amputationType: "silicone", siliconePart: "كف", siliconeSide: "left" }) }), ["prostheticType", "siliconType"]);
const bil = { amputationSite: site(DBL("تحت الركبة", "فوق الركبة")) };
same("هـ.٣ **طرفان مختلفان ⟵ خاناتُ اليمين ثمّ اليسار، بعناوينها**",
  saleSpecFieldsFor("prosthetic", bil).map((f) => [f.key, f.label]),
  [["prostheticType:right", "نوع الطرف الصناعي — يمين"], ["socketType:right", "نوع السوكيت — يمين"], ["footType:right", "نوع القدم — يمين"],
    ["siliconType:right", "نوع السليكون — يمين"], ["prostheticType:left", "نوع الطرف الصناعي — يسار"], ["socketType:left", "نوع السوكيت — يسار"],
    ["kneeJointType:left", "نوع مفصل الركبة — يسار"], ["footType:left", "نوع القدم — يسار"], ["siliconType:left", "نوع السليكون — يسار"]]);
same("هـ.٤ وما ينقص بجهته — والعامُّ يسدّ الجهتين",
  missingSaleSpecs("prosthetic", { ...bil, footType: "كاربون", "prostheticType:right": "a", "prostheticType:left": "b", "socketType:right": "c", "siliconType:right": NOT_APPLICABLE }),
  ["socketType:left", "kneeJointType:left", "siliconType:left"]);
const twoSame = { amputationSite: site(DBL("تحت الركبة", "تحت الركبة")), prostheticType: "طرف", footType: "كاربون" };
same("هـ.٥ **ومتماثلان ⟵ خاناتُهما مرّةً «للطرفين»**",
  [saleSpecFieldsFor("prosthetic", twoSame).map((f) => f.label), missingSaleSpecs("prosthetic", twoSame)],
  [["نوع الطرف الصناعي — للطرفين", "نوع السوكيت — للطرفين", "نوع القدم — للطرفين", "نوع السليكون — للطرفين"], ["socketType", "siliconType"]]);
same("هـ.٦ نافذةُ البيع تقبل خاناتِ الجهات — وتردّ ما ليس خانة",
  cleanSaleSpecsInput({ "footType:left": " مرنة ", "footSize:left": "42", "kneeJointType:middle": "x", socketType: "س" }, "prosthetic"),
  { socketType: "س", "footType:left": "مرنة" });
same("هـ.٧ **وكلمةُ الطبيب «للطرفين» لا تكتب فوقها جهةٌ حُفظت عند البيع**",
  [mergeDeviceSpecs({ footType: "كاربون" }, { "footType:left": "خشب", "socketType:left": "س" }), specResolved({ footType: "كاربون" }, "footType:left")],
  [{ footType: "كاربون", "socketType:left": "س" }, "كاربون"]);
check(saleSpecsMessage("prosthetic", ["kneeJointType:left", "socketType"]).includes("نوع مفصل الركبة — يسار، نوع السوكيت"),
  "هـ.٨ والرسالةُ تسمّي الخانةَ بجهتها");

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
