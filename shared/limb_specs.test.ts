// **مواصفاتُ الطرف بحسب البتر** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de). `npm run test:limb-specs` — قواعدُ خالصة بلا قاعدة.
//
// يحرس: (١) تحت الركبة بلا ركبة، والسليكونيُّ بلا قدمٍ ولا ركبةٍ ولا سوكيت، والعلويُّ بلا ركبةٍ ولا قدم وله الكفُّ (والمرفقُ فوق المرفق)؛
// (٢) مبتورُ الطرفين خاناتٌ لكلّ جهة، و«متماثلان» تُكتب مرّةً للطرفين؛ (٣) ولا يُخفى مكتوب؛ (٤) و«اشترى» يشترط ما يخصّ البترَ وحده — بجهاته؛
// (٥) وأمرُ التصنيع لا يفقد خانة؛ (٦) و«متعدد» طرفاً طرفاً، و«يُصنع في هذا الطلب» يحصر الشرطَ في المصنوع.
import {
  ELBOW_LEVELS, KNEE_LEVELS, LEGACY_LIMB_SPEC_KEYS, LIMB_SPEC_KEYS, isSlotKey, limbSlots, limbSlotsOfSite, limbSpecFlat, limbSpecKeys, limbSpecValue, limbSpecInputValue,
  limbSpecView, normalizeLimbSpecs, slotKeyLabel, slotTitle, slotsCanShare, splitSpecKey,
} from "./limb_specs";
import {
  cleanSaleSpecsInput, mergeDeviceSpecs, missingSaleSpecs, saleLimbsFor, saleSpecFieldsFor, saleSpecsMessage, specResolved, NOT_APPLICABLE,
} from "./device_specs";
import { parseSaleLines, saleLinesMatchTotal, saleLinesText, storedSaleLines } from "./part_sale";
import { sheetSpecRows, sheetSpecView } from "./intake_sheet_view";
import {
  buildAmputationSite, LOWER_AMPUTATION_DETAILS, PROSTHETIC_DEVICE_SPECS, SILICONE_PARTS, UPPER_AMPUTATION_DETAILS, type AmputationLimb, type AmputationParts,
} from "./case_fields";
import { checkAmputationParts } from "./patient_required";
import { dropStaleChoices, prostheticTypeText, specChoiceMessage, specChoiceProblems, specChoicesForKey } from "./limb_specs";
import { saleSpecChoiceProblems, saleSpecFieldExtras } from "./device_specs";
import {
  FOOT_TYPES, KNEE_TYPES, LINER_TYPES, LOWER_PROSTHESIS_TYPES, PROSTHESIS_NAME_BY_LEVEL, SOCKET_TYPES, UPPER_PROSTHESIS_TYPES, composeProstheticName, isListedChoice, isolateLtr, specChoices,
} from "./device_spec_options";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

//  **الخمسُ القديمة** — لطرفٍ مجهول المستوى أو بلا بتر. و`SEVEN` خاناتُ الورقة كلُّها بعد خانتَي العلويّ (§4.de).
const ALL = ["prostheticType", "kneeJointType", "footType", "socketType", "siliconType"];
const SEVEN = ["prostheticType", "kneeJointType", "footType", "elbowType", "handType", "socketType", "siliconType"];
const UPPER_BE = ["prostheticType", "handType", "socketType", "siliconType"];
const UPPER_AE = ["prostheticType", "elbowType", "handType", "socketType", "siliconType"];
const SIL = ["prostheticType", "siliconType"];
const NO_KNEE = ["prostheticType", "footType", "socketType", "siliconType"];
const BK: AmputationParts = { amputationType: "single", singleLimb: "lower", singleSide: "right", singleDetail: "تحت الركبة" };
const AK: AmputationParts = { amputationType: "single", singleLimb: "lower", singleSide: "left", singleDetail: "فوق الركبة" };
const DBL = (r: string, l: string): AmputationParts => ({ amputationType: "double", doubleLimbType: "lower", doubleRightDetail: r, doubleLeftDetail: l });
const site = (p: AmputationParts) => buildAmputationSite(p);

console.log("\n── أ. ما يخصّ الطرفَ بمستواه ──");
//  كانت «الخمسُ بترتيب الورقة»؛ وقرارُ المالك ٢٠٢٦-١٠-١٠ («نعم» لخانتَي «نوع الكف / اليد» و«نوع المرفق») جعلها سبعاً — والخمسُ القديمة باقيةٌ للمجهول.
same("أ.١ السبعُ بترتيب الورقة، والخمسُ القديمة بترتيبها", [LIMB_SPEC_KEYS, LEGACY_LIMB_SPEC_KEYS], [SEVEN, ALL]);
same("أ.٢ **تحت الركبة بلا ركبة** — وسايمز وجوبارت مثلُه",
  [limbSpecKeys("lower", "تحت الركبة"), limbSpecKeys("lower", "سايمز"), limbSpecKeys("lower", "جوبارت")], [NO_KNEE, NO_KNEE, NO_KNEE]);
same("أ.٣ وخلالَ الركبة وفوقها وخلالَ الحوض بالركبة", KNEE_LEVELS.map((l) => limbSpecKeys("lower", l)), [ALL, ALL, ALL]);
check(LOWER_AMPUTATION_DETAILS.every((l) => KNEE_LEVELS.includes(l) || !limbSpecKeys("lower", l).includes("kneeJointType")),
  "أ.٤ كلُّ مستوى سفليٍّ في القائمة محسوم: ركبةٌ لما فوق الساق وحده");
//  كانت «نوع/سوكيت/سيليكون» وحدها؛ وبقرار المالك (§4.de) صار للعلويّ «نوع الكف / اليد» دائماً و«نوع المرفق» لما فوق المرفق.
same("أ.٥ **العلويُّ بلا ركبةٍ ولا قدم، وله الكفّ** — تحت المرفق بلا مرفق",
  [limbSpecKeys("upper", "تحت المرفق"), limbSpecKeys("upper", "اصبع"), limbSpecKeys("upper", "خلال الرسغ")], [UPPER_BE, UPPER_BE, UPPER_BE]);
same("أ.٥ب **وخلالَ المرفق وفوقه وخلالَ الكتف بالمرفق**، والمستوى المجهول بالمرفق (لا يُخفى تخميناً)",
  [...ELBOW_LEVELS.map((l) => limbSpecKeys("upper", l)), limbSpecKeys("upper", "")], [UPPER_AE, UPPER_AE, UPPER_AE, UPPER_AE]);
check(UPPER_AMPUTATION_DETAILS.every((l) => limbSpecKeys("upper", l).includes("elbowType") === ELBOW_LEVELS.includes(l)),
  "أ.٥ج كلُّ مستوى علويٍّ في القائمة محسوم: مرفقٌ لما فوق الساعد وحده");
same("أ.٦ **والسليكونيُّ التعويضيّ نوعُه وسيليكونُه** — لا قدمَ ولا ركبةَ ولا سوكيت", limbSpecKeys("silicone", "اصبع"), ["prostheticType", "siliconType"]);
same("أ.٧ **والمجهولُ لا يُخفي شيئاً** (مستوى لم يُختر، أو نصٌّ قديم، أو بلا بتر)",
  [limbSpecKeys("lower", ""), limbSpecKeys("lower", "نصٌّ حرّ"), limbSpecKeys(null, null)], [ALL, ALL, ALL]);

console.log("\n── ب. الطرفان ──");
same("ب.١ أحاديٌّ وسليكونيٌّ ومجهول ⟵ طرفٌ واحد بلا جهة",
  [limbSlots(BK).map((s) => s.key), limbSlots({ amputationType: "silicone", siliconePart: "اذن" }).map((s) => [s.key, s.kind]), limbSlots({}).length],
  [[null], [[null, "silicone"]], 1]);
same("ب.٢ **ثنائيٌّ سفليّ ⟵ يمين ثمّ يسار، لكلٍّ مستواه وخاناتُه**",
  limbSlots(DBL("تحت الركبة", "فوق الركبة")).map((s) => [s.key, s.level, s.keys.length]), [["right", "تحت الركبة", 4], ["left", "فوق الركبة", 5]]);
same("ب.٣ و«علوي وسفلي» لكلّ جهةٍ طرفُها",
  limbSlots({ amputationType: "double", doubleLimbType: "both", bothRightLimb: "upper", bothRightDetail: "تحت المرفق", bothLeftLimb: "lower", bothLeftDetail: "تحت الركبة" })
    .map((s) => [s.key, s.kind, s.keys]), [["right", "upper", UPPER_BE], ["left", "lower", NO_KNEE]]);
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

//  **ثنائيٌّ يحتاج أطرافاً سليكونية** (سؤالُ المالك ٢٠٢٦-١٠-١٠): السليكونيُّ «كلا الجانبين» طرفان، و«قدم» في القائمة.
const SIL2 = (part: string): AmputationParts => ({ amputationType: "silicone", siliconePart: part, siliconeSide: "both" });
same("ب.٨ **سليكونيٌّ «كلا الجانبين» ⟵ طرفان سليكونيّان بجهتيهما** — وخاناتُهما متطابقة فـ«متماثلان» متاح",
  [limbSlots(SIL2("اصبع")).map((s) => [s.key, s.kind, s.level, s.keys]), slotsCanShare(limbSlots(SIL2("اصبع")))],
  [[["right", "silicone", "اصبع", ["prostheticType", "siliconType"]], ["left", "silicone", "اصبع", ["prostheticType", "siliconType"]]], true]);
same("ب.٩ وبجهةٍ واحدة طرفٌ واحد، **والأنفُ بلا جهة طرفٌ واحد** ولو وصل «كلاهما»",
  [limbSlots({ amputationType: "silicone", siliconePart: "اصبع", siliconeSide: "left" }).length, limbSlots(SIL2("انف")).length], [1, 1]);
same("ب.١٠ **و«قدم» في قائمة السليكوني** — وتُقرأ من سلسلتها", [SILICONE_PARTS.includes("قدم"),
  limbSlotsOfSite(site(SIL2("قدم"))).map((s) => [s.key, s.kind, s.level])], [true, [["right", "silicone", "قدم"], ["left", "silicone", "قدم"]]]);

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
const silSame = sheetSpecView({ serviceType: "prosthetic", specs: { amputationSite: site(SIL2("اصبع")), prostheticType: "إصبع سليكوني", siliconType: "سليكون طبي" } });
same("ج.١٠ **أصابعُ سليكونيةٌ للجهتين متماثلةٌ ⟵ «للطرفين»** بخانتين", [silSame.mode, silSame.rows.map((r) => [r.key, r.value])],
  ["identical", [["prostheticType", "إصبع سليكوني"], ["siliconType", "سليكون طبي"]]]);
const silSplit = sheetSpecView({ serviceType: "prosthetic", specs: { amputationSite: site(SIL2("قدم")), "prostheticType:right": "قدم جزئية", "prostheticType:left": "قدم كاملة" } });
same("ج.١١ وقدمان سليكونيّتان مختلفتان ⟵ لكلّ جهةٍ قيمتُها، بلا سوكيتٍ ولا ركبة",
  [silSplit.mode, silSplit.rows.map((r) => [r.key, r.value])], ["split", [["prostheticType", "يمين: قدم جزئية · يسار: قدم كاملة"], ["siliconType", null]]]);

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
same("هـ.١ **تحت الركبة ⟵ لا ركبةَ مطلوبة** (ونوعُ الطرف مبنيٌّ لا يُطلب — §4.dw التكملة ٢)، وبلا بترٍ مسجَّل ⟵ الخمسُ كما كانت",
  [keysFor({ amputationSite: site(BK) }), keysFor({})], [["socketType", "footType", "siliconType"], ["prostheticType", "socketType", "kneeJointType", "footType", "siliconType"]]);
same("هـ.٢ سليكونيٌّ ⟵ النوعُ والسيليكونُ وحدهما",
  keysFor({ amputationSite: site({ amputationType: "silicone", siliconePart: "كف", siliconeSide: "left" }) }), ["prostheticType", "siliconType"]);
const bil = { amputationSite: site(DBL("تحت الركبة", "فوق الركبة")) };
same("هـ.٣ **طرفان مختلفان ⟵ خاناتُ اليمين ثمّ اليسار، بعناوينها**",
  saleSpecFieldsFor("prosthetic", bil).map((f) => [f.key, f.label]),
  [["socketType:right", "نوع السوكيت — يمين"], ["footType:right", "نوع القدم — يمين"],
    ["siliconType:right", "نوع السليكون — يمين"], ["socketType:left", "نوع السوكيت — يسار"],
    ["kneeJointType:left", "نوع مفصل الركبة — يسار"], ["footType:left", "نوع القدم — يسار"], ["siliconType:left", "نوع السليكون — يسار"]]);
same("هـ.٤ وما ينقص بجهته — والعامُّ يسدّ الجهتين",
  missingSaleSpecs("prosthetic", { ...bil, footType: "كاربون", "prostheticType:right": "a", "prostheticType:left": "b", "socketType:right": "c", "siliconType:right": NOT_APPLICABLE }),
  ["socketType:left", "kneeJointType:left", "siliconType:left"]);
const twoSame = { amputationSite: site(DBL("تحت الركبة", "تحت الركبة")), prostheticType: "طرف", footType: "كاربون" };
same("هـ.٥ **ومتماثلان ⟵ خاناتُهما مرّةً «للطرفين»**",
  [saleSpecFieldsFor("prosthetic", twoSame).map((f) => f.label), missingSaleSpecs("prosthetic", twoSame)],
  [["نوع السوكيت — للطرفين", "نوع القدم — للطرفين", "نوع السليكون — للطرفين"], ["socketType", "siliconType"]]);
same("هـ.٦ نافذةُ البيع تقبل خاناتِ الجهات — وتردّ ما ليس خانة",
  cleanSaleSpecsInput({ "footType:left": " مرنة ", "footSize:left": "42", "kneeJointType:middle": "x", socketType: "س" }, "prosthetic"),
  //  بترتيب الدخل (صار المنظِّفُ يمرّ على الدخل نفسِه ليقبل مفاتيحَ «متعدد» — §4.de)؛ والمقبولُ والمردودُ كما كانا.
  { "footType:left": "مرنة", socketType: "س" });
same("هـ.٧ **وكلمةُ الطبيب «للطرفين» لا تكتب فوقها جهةٌ حُفظت عند البيع**",
  [mergeDeviceSpecs({ footType: "كاربون" }, { "footType:left": "خشب", "socketType:left": "س" }), specResolved({ footType: "كاربون" }, "footType:left")],
  [{ footType: "كاربون", "socketType:left": "س" }, "كاربون"]);
same("هـ.٩ **سليكونيٌّ للجهتين ⟵ النوعُ والسيليكونُ لكلّ جهة**، أو مرّةً «للطرفين» إن تماثلا",
  [keysFor({ amputationSite: site(SIL2("كف")) }), saleSpecFieldsFor("prosthetic", { amputationSite: site(SIL2("كف")), prostheticType: "كف", siliconType: "طبي" }).map((f) => f.label)],
  [["prostheticType:right", "siliconType:right", "prostheticType:left", "siliconType:left"], ["نوع الطرف الصناعي — للطرفين", "نوع السليكون — للطرفين"]]);
same("هـ.١٠ وتغييرُ «اصبع» يمين إلى «كلا الجانبين» يوزّع ما كُتب على الجهتين ويحذف ما لا يخصّ السليكوني",
  N({ ...SIL2("اصبع"), prostheticType: "إصبع", socketType: "x" }),
  { ...SIL2("اصبع"), "prostheticType:right": "إصبع", "prostheticType:left": "إصبع", limbsIdentical: false });
check(saleSpecsMessage("prosthetic", ["kneeJointType:left", "socketType"]).includes("نوع مفصل الركبة — يسار، نوع السوكيت"),
  "هـ.٨ والرسالةُ تسمّي الخانةَ بجهتها");

console.log("\n── و. «متعدد» — طرفاً طرفاً، و«يُصنع في هذا الطلب» ──");
//  حالتا المالك (٢٠٢٦-١٠-١٠، §4.de): «يسار تحت الركبة ويحتاج طرفاً تحت الركبة، ويسار خلال الكف ويحتاج كفاً سليكونية» و«اليمين إصبع واليسار كفّ كاملة».
const MULTI = (...limbs: AmputationLimb[]): AmputationParts => ({ amputationType: "multi", limbs });
const L_BK: AmputationLimb = { region: "lower", side: "left", kind: "prosthetic", detail: "تحت الركبة" };
const L_HAND_SIL: AmputationLimb = { region: "upper", side: "left", kind: "silicone", detail: "كف" };
const R_FINGER_SIL: AmputationLimb = { region: "upper", side: "right", kind: "silicone", detail: "اصبع" };
const CASE1 = MULTI(L_BK, L_HAND_SIL);
const CASE2 = MULTI(R_FINGER_SIL, L_HAND_SIL);
same("و.١ **يسارٌ تحت الركبة + كفٌّ سليكونية يسار ⟵ طرفان من الجهة نفسِها**، لكلٍّ خاناتُه (لا ركبةَ للأوّل، ولا قدمَ ولا سوكيتَ للثاني)",
  [limbSlots(CASE1).map((x) => [x.key, x.kind, x.level, x.keys]), slotsCanShare(limbSlots(CASE1))],
  [[["left-lower", "lower", "تحت الركبة", NO_KNEE], ["left-upper", "silicone", "كف", SIL]], false]);
same("و.٢ **إصبعٌ سليكونيّ يمين + كفٌّ سليكونية يسار ⟵ طرفان سليكونيّان**، وخاناتُهما متطابقة فـ«متماثلة» متاحةٌ لمن أرادها",
  [limbSlots(CASE2).map((x) => [x.key, x.kind, x.level, x.keys]), slotsCanShare(limbSlots(CASE2))],
  [[["right-upper", "silicone", "اصبع", SIL], ["left-upper", "silicone", "كف", SIL]], true]);
same("و.٣ والبترُ يُقرأ من سلسلته المركّبة نفسِها، وعنوانُ كلّ طرفٍ يقول موضعَه",
  [limbSlotsOfSite(site(CASE1)).map(slotTitle), limbSlotsOfSite(site(CASE2)).map(slotTitle)],
  [["يسار سفلي — تحت الركبة", "يسار علوي — كف"], ["يمين علوي — اصبع", "يسار علوي — كف"]]);
const FACE3 = MULTI({ region: "upper", side: "right", kind: "prosthetic", detail: "فوق المرفق" }, { region: "face", kind: "silicone", detail: "انف" },
  { region: "face", side: "left", kind: "silicone", detail: "اذن" });
same("و.٤ **ثلاثةُ أطرافٍ بقطع الوجه** — العلويُّ فوق المرفق بالمرفق والكفّ، والأنفُ بلا جهة، والأذنُ بجهتها",
  limbSlots(FACE3).map((x) => [x.key, x.label, x.keys]),
  [["right-upper", "يمين علوي", UPPER_AE], ["mid-nose", "أنف", SIL], ["left-ear", "أذن يسار", SIL]]);
same("و.٥ **ولا طرفان في موضعٍ واحد** (المكرَّرُ يُطوى)، وطرفٌ لم يكتمل لا يُعدّ، وطرفٌ واحدٌ مكتمل ⟵ خاناتٌ بلا مفتاح طرف",
  [limbSlots(MULTI(L_BK, { ...L_BK, detail: "فوق الركبة" }, L_HAND_SIL)).map((x) => x.key), limbSlots(MULTI(L_BK, { region: "upper" })).map((x) => [x.key, x.keys])],
  [["left-lower", "left-upper"], [[null, NO_KNEE]]]);
same("و.٦ **مفاتيحُ الأطراف**: صالحةٌ تُقبل وعنوانُها عربيّ، والمخترعةُ تُردّ",
  [["left-lower", "right-upper", "left-ear", "right-orbit", "mid-nose", "right", "left"].map((k) => [isSlotKey(k), slotKeyLabel(k)]),
    ["left-hand", "mid-ear", "middle", "right-nose", "x"].map(isSlotKey), splitSpecKey("handType:left-upper"), splitSpecKey("x:y")],
  [[[true, "يسار سفلي"], [true, "يمين علوي"], [true, "أذن يسار"], [true, "محجر عين يمين"], [true, "أنف"], [true, "يمين"], [true, "يسار"]],
    [false, false, false, false, false], { base: "handType", side: "left-upper" }, { base: "x:y", side: null }]);

const c1 = { amputationSite: site(CASE1) };
same("و.٧ **«اشترى» للحالة الأولى ⟵ خاناتُ كلّ طرفٍ بعنوانه**، بلا ركبةٍ ولا قدمٍ للكفّ السليكونية",
  saleSpecFieldsFor("prosthetic", c1).map((f) => [f.key, f.label]),
  [["socketType:left-lower", "نوع السوكيت — يسار سفلي"],
    ["footType:left-lower", "نوع القدم — يسار سفلي"], ["siliconType:left-lower", "نوع السليكون — يسار سفلي"],
    ["prostheticType:left-upper", "نوع الطرف الصناعي — يسار علوي"], ["siliconType:left-upper", "نوع السليكون — يسار علوي"]]);
same("و.٨ **وعلويٌّ فوق المرفق ⟵ المرفقُ والكفُّ مطلوبان بعنوانهما**",
  saleSpecFieldsFor("prosthetic", { amputationSite: site(FACE3) }).filter((f) => f.key.endsWith(":right-upper")).map((f) => f.label),
  ["نوع السوكيت — يمين علوي", "نوع المرفق — يمين علوي", "نوع الكف / اليد — يمين علوي", "نوع السليكون — يمين علوي"]);
const notMadeHand = { ...c1, limbsNotMade: "left-upper" };
const nmView = limbSpecView(notMadeHand);
same("و.٩ **«يُصنع في هذا الطلب»: الكفُّ تُصنع لاحقاً ⟵ لا يُطلب لها شيءٌ الآن**، وتُذكر «لا يُصنع» في العرض",
  [saleSpecFieldsFor("prosthetic", notMadeHand).map((f) => f.key), nmView.slots.map((x) => x.key), nmView.notMadeSlots.map(slotTitle), nmView.allSlots.length],
  [["socketType:left-lower", "footType:left-lower", "siliconType:left-lower"], ["left-lower"], ["يسار علوي — كف"], 2]);
same("و.١٠ وما ينقص بطرفه — والعامُّ يسدّ المصنوع",
  missingSaleSpecs("prosthetic", { ...notMadeHand, prostheticType: "طرف تحت الركبة", "footType:left-lower": "كاربون" }),
  ["socketType:left-lower", "siliconType:left-lower"]);
const nm = N({ ...CASE1, prostheticType: "طرف", siliconType: "س", "prostheticType:left-upper": "كف سليكون", limbsNotMade: ["left-upper", "right-lower"] });
same("و.١١ **وصفةُ الطبيب**: العامُّ للمصنوع وحده، وما كُتب للمؤجَّل يبقى، ومفتاحٌ لا طرفَ له يسقط من «لا يُصنع»",
  [nm["prostheticType:left-lower"], nm["siliconType:left-lower"], nm["prostheticType:left-upper"], "siliconType:left-upper" in nm, "prostheticType" in nm, nm.limbsNotMade],
  ["طرف", "س", "كف سليكون", false, false, ["left-upper"]]);
same("و.١٢ **ولا يُؤجَّل الكلّ** — «لا يُصنع» للطرفين معاً يسقط فيُصنعان",
  "limbsNotMade" in N({ ...CASE1, limbsNotMade: ["left-lower", "left-upper"] }), false);
//  ثلاثةُ أطراف: ساقان تحت الركبة ويدٌ تُصنع لاحقاً — والمتماثلُ بين المصنوعَين وحدهما.
const THREE = MULTI({ region: "lower", side: "right", kind: "prosthetic", detail: "تحت الركبة" }, L_BK, R_FINGER_SIL);
const twoMade = N({ ...THREE, limbsIdentical: true, limbsNotMade: ["right-upper"], "footType:left-lower": "كاربون", prostheticType: "طرف" });
same("و.١٣ **«متماثلة» بين المصنوعة وحدها** — ساقان تحت الركبة متماثلتان والإصبعُ مؤجَّل ⟵ مرّةً للساقين",
  [twoMade.footType, twoMade.prostheticType, Object.keys(twoMade).some((k) => k.includes(":")), twoMade.limbsIdentical],
  ["كاربون", "طرف", false, true]);
const twoMadeSpecs = { amputationSite: site(THREE), limbsNotMade: "right-upper", prostheticType: "طرف", footType: "كاربون" };
same("و.١٤ وعرضُها «متماثلة» بطرفين، و«اشترى» يقول «— للطرفين»",
  [limbSpecView(twoMadeSpecs).mode, limbSpecView(twoMadeSpecs).slots.length, saleSpecFieldsFor("prosthetic", twoMadeSpecs).map((f) => f.label)],
  ["identical", 2, ["نوع السوكيت — للطرفين", "نوع القدم — للطرفين", "نوع السليكون — للطرفين"]]);
same("و.١٥ **قدمٌ سليكونية مع ساقين تحت الركبة لا تتماثل معهما ⟵ لكلّ طرفٍ خاناتُه**",
  saleSpecFieldsFor("prosthetic", { amputationSite: site(MULTI(L_BK, { ...L_BK, side: "right" }, { region: "lower", side: "right", kind: "silicone", detail: "قدم" })) })
    .map((f) => f.key).slice(0, 2), ["socketType:left-lower", "footType:left-lower"]);
same("و.١٥ب **وثلاثُ قطعٍ سليكونية (إصبعٌ وكفٌّ وقدم) خاناتُها متطابقة ⟵ «— للأطراف كلّها»**",
  saleSpecFieldsFor("prosthetic", { amputationSite: site(MULTI(R_FINGER_SIL, L_HAND_SIL, { region: "lower", side: "left", kind: "silicone", detail: "قدم" })),
    prostheticType: "سليكون", siliconType: "طبي" }).map((f) => f.label),
  ["نوع الطرف الصناعي — للأطراف كلّها", "نوع السليكون — للأطراف كلّها"]);
const mSplit = sheetSpecView({ serviceType: "prosthetic", specs: { ...c1, "prostheticType:left-lower": "تحت ركبة", "prostheticType:left-upper": "كف سليكون",
  "footType:left-lower": "كاربون", "siliconType:left-upper": "طبي" } });
same("و.١٦ **العرضُ لكلّ طرفٍ قيمتُه**، والقدمُ للسفليّ وحده (العلويُّ «لا ينطبق»)",
  [mSplit.mode, mSplit.rows.map((r) => [r.key, r.value, r.sides?.map((x) => [x.side, x.applicable])])],
  ["split", [
    ["prostheticType", "يسار سفلي: تحت ركبة · يسار علوي: كف سليكون", [["left-lower", true], ["left-upper", true]]],
    ["footType", "يسار سفلي: كاربون", [["left-lower", true], ["left-upper", false]]],
    ["socketType", null, [["left-lower", true], ["left-upper", false]]],
    ["siliconType", "يسار سفلي: — · يسار علوي: طبي", [["left-lower", true], ["left-upper", true]]],
  ]]);
same("و.١٧ وعمودُ ملفّ المريض وبطاقةُ الأمر يقرآن الأطرافَ كلَّها، ونافذةُ البيع تقبل مفاتيحَها وتردّ المخترَع",
  [limbSpecFlat({ "footType:left-lower": "كاربون", "handType:left-upper": "x" }, "footType"),
    cleanSaleSpecsInput({ "handType:left-upper": " يد ", "elbowType:right-upper": "مرفق", "footType:left-hand": "x", "handType": "كف" }, "prosthetic")],
  ["يسار سفلي: كاربون", { "handType:left-upper": "يد", "elbowType:right-upper": "مرفق", handType: "كف" }]);

console.log("\n── ز. فحصُ «متعدد» عند الحفظ ──");
const ok = (p: AmputationParts) => checkAmputationParts(p).ok;
same("ز.١ **الحالتان مكتملتان ⟵ تُقبلان**، وقطعُ الوجه، والأنفُ بلا جهة", [ok(CASE1), ok(CASE2), ok(FACE3)], [true, true, true]);
same("ز.٢ **ويُردّ**: طرفٌ واحد (له «احادي»)، ومكرَّرُ الموضع، وبلا جهة، وبلا مستوى، ومستوى لا يخصّ نوعَه (سليكونيٌّ «تحت الركبة»)، وبلا نوع",
  [ok(MULTI(L_BK)), ok(MULTI(L_BK, { ...L_BK, detail: "فوق الركبة" })), ok(MULTI(L_BK, { ...L_HAND_SIL, side: "" })), ok(MULTI(L_BK, { ...L_HAND_SIL, detail: "" })),
    ok(MULTI(L_BK, { region: "lower", side: "right", kind: "silicone", detail: "تحت الركبة" })), ok(MULTI(L_BK, { region: "upper", side: "right", detail: "تحت المرفق" }))],
  [false, false, false, false, false, false]);

console.log("\n── ح. السعرُ لكلّ طرف أو سعرٌ واحد (المرحلةُ (ب)) ──");
//  قرارُ المالك: «سعرٌ واحد إن كانا متماثلين — أعطِ حرّية ولا تقيّد»، و«السعرُ النهائيّ مجموعُهم، وتوضيحٌ صغير من أين أتى».
same("ح.١ **أطرافُ البيع**: المصنوعةُ وحدها بعناوينها، والمتماثلةُ تقول ذلك، وطرفٌ واحد ⟵ لا تقسيم",
  [saleLimbsFor("prosthetic", c1), saleLimbsFor("prosthetic", twoMadeSpecs).identical, saleLimbsFor("prosthetic", notMadeHand).limbs, saleLimbsFor("medical_support", c1).limbs],
  [{ limbs: [{ key: "left-lower", title: "يسار سفلي — تحت الركبة" }, { key: "left-upper", title: "يسار علوي — كف" }], identical: false }, true, [], []]);
const LIMBS = ["left-lower", "left-upper"];
const pl = parseSaleLines([{ item: "full_device", limb: "left-upper", originalPrice: 500_000, discountAmount: 50_000 },
  { item: "full_device", limb: "left-lower", originalPrice: 1_000_000, discountAmount: 0 }], ["full_device"], "prosthetic", LIMBS);
same("ح.٢ **سطرٌ لكلّ طرف ⟵ المجموعُ سعرُ الجهاز**، والأسطرُ بترتيب الأطراف",
  pl.ok ? [pl.lines.map((l) => [l.limb, l.finalPrice]), pl.totals.finalPrice, pl.totals.discountAmount] : pl.error,
  [[["left-lower", 1_000_000], ["left-upper", 450_000]], 1_450_000, 50_000]);
const one = parseSaleLines([{ item: "full_device", originalPrice: 1_400_000, discountAmount: 0 }], ["full_device"], "prosthetic", LIMBS);
same("ح.٣ **وسعرٌ واحدٌ للجهاز يبقى مقبولاً** — حرّيةٌ لا قيد", one.ok ? [one.lines.length, one.lines[0].limb, one.totals.finalPrice] : one.error,
  [1, undefined, 1_400_000]);
const perr = (raw: unknown[], items: string[] = ["full_device"], limbs: string[] = LIMBS) => {
  const r = parseSaleLines(raw, items as any, "prosthetic", limbs); return r.ok ? "ok" : r.error;
};
same("ح.٤ **ويُردّ**: طرفٌ بلا سعر (يسمّيه)، وطرفٌ لا يُصنع في هذا الطلب، والسطرُ الواحد مع أسطر الأطراف، وطرفٌ مكرَّر، وطرفٌ لجهازٍ بطرفٍ واحد، وطرفٌ على جزء",
  [perr([{ item: "full_device", limb: "left-lower", originalPrice: 1, discountAmount: 0 }]),
    perr([{ item: "full_device", limb: "right-lower", originalPrice: 1, discountAmount: 0 }]),
    perr([{ item: "full_device", originalPrice: 1, discountAmount: 0 }, { item: "full_device", limb: "left-lower", originalPrice: 1, discountAmount: 0 },
      { item: "full_device", limb: "left-upper", originalPrice: 1, discountAmount: 0 }]),
    perr([{ item: "full_device", limb: "left-lower", originalPrice: 1, discountAmount: 0 }, { item: "full_device", limb: "left-lower", originalPrice: 2, discountAmount: 0 }]),
    perr([{ item: "full_device", limb: "left-lower", originalPrice: 1, discountAmount: 0 }], ["full_device"], []),
    perr([{ item: "socket", limb: "left-lower", originalPrice: 1, discountAmount: 0 }, { item: "full_device", originalPrice: 1, discountAmount: 0 }], ["full_device", "socket"])],
  ["أدخل سعر: يسار علوي", "سطرُ سعرٍ لطرفٍ لا يُصنع في هذا الطلب — حدّث الصفحة", "سعرُ الجهاز: سطرٌ واحدٌ له أو سطرٌ لكلّ طرف — لا الاثنان",
    "يسار سفلي: سعرُه مكرّر", "سطرُ سعرٍ لطرفٍ لا يُصنع في هذا الطلب — حدّث الصفحة", "سطرُ سعرٍ لطرفٍ لا يُصنع في هذا الطلب — حدّث الصفحة"]);
const withSocket = parseSaleLines([{ item: "full_device", limb: "left-lower", originalPrice: 900_000, discountAmount: 0 },
  { item: "full_device", limb: "left-upper", originalPrice: 300_000, discountAmount: 0 }, { item: "socket", originalPrice: 200_000, discountAmount: 0 }],
  ["full_device", "socket"], "prosthetic", LIMBS);
same("ح.٥ **ومعها جزءٌ إضافيّ** (طرفٌ كاملٌ وقالب) ⟵ الأطرافُ ثمّ الجزء، والمجموعُ كلُّها",
  withSocket.ok ? [withSocket.lines.map((l) => l.limb ?? l.item), withSocket.totals.finalPrice] : withSocket.error, [["left-lower", "left-upper", "socket"], 1_400_000]);
const stored = storedSaleLines([...(pl.ok ? pl.lines : []), { item: "socket", limb: "left-lower", originalPrice: 1, discountAmount: 0, finalPrice: 1 },
  { item: "full_device", limb: "x", originalPrice: 1, discountAmount: 0, finalPrice: 1 }]);
same("ح.٦ **المخزَّنُ يحفظ الطرف** للجهاز الكامل وحده وبمفتاحٍ صالح، والاستمارةُ تقول «يسار سفلي … · يسار علوي … (خصم …)»",
  [stored.map((l) => l.limb ?? null), saleLinesText(stored.slice(0, 2), "prosthetic")],
  [["left-lower", "left-upper", null, null], "يسار سفلي 1,000,000 · يسار علوي 450,000 (خصم 50,000 من 500,000)"]);
same("ح.٧ **والتفصيلُ لا يُعرض إلّا ومجموعُه المبلغُ الكلّيّ** — سعرٌ صُحِّح بعد البيع لا يُفصَّل بأسطرٍ لم يأتِ منها",
  [saleLinesMatchTotal(stored.slice(0, 2), 1_450_000), saleLinesMatchTotal(stored.slice(0, 2), 1_300_000), saleLinesMatchTotal(stored.slice(0, 1), 1_000_000),
    saleLinesMatchTotal(stored.slice(0, 2), null)], [true, false, false, false]);

console.log("\n── ط. الخاناتُ قوائمُ المالك، وبجانب أربعٍ منها حقلٌ حرّ (§4.dw) ──");
same("ط.١ **نوعُ الطرف بحسب الطرف**: السفليُّ قائمتُه (٧) والعلويُّ قائمتُه (٧ — ومنها «خلال الرسغ»، التكملة ٢) — لا يرى السفليُّ «تحت المرفق» — والمجهولُ الاثنتان، والسليكونيُّ التعويضيُّ حرّ",
  [specChoices("prostheticType", "lower")?.length, specChoices("prostheticType", "lower")?.includes("طرف تحت المرفق"),
    specChoices("prostheticType", "upper")?.length, specChoices("prostheticType", "upper")?.includes("طرف تحت الركبة"),
    specChoices("prostheticType", null)?.length, specChoices("prostheticType", "silicone")],
  [7, false, 7, false, 14, null]);
same("ط.٢ **وقوائمُ المالك بحرفها**: الركبةُ ستّ، والقدمُ خمس، والسوكيتُ اثنتان، والسليكونُ «قفل محوري / فاكيوم» للعلويّ والسفليّ وحرٌّ للتعويضيّ؛ والمرفقُ والكفُّ حرّان",
  [[...KNEE_TYPES], [...FOOT_TYPES], [...SOCKET_TYPES], specChoices("siliconType", "upper"), specChoices("siliconType", "silicone"),
    specChoices("elbowType", "upper"), specChoices("handType", "upper"), LOWER_PROSTHESIS_TYPES[1], UPPER_PROSTHESIS_TYPES[0]],
  [["مقفول", "ميكانيك حر", "ميكانيك حديث", "هوائي هيدروليك", "هيدروليك", "ذكي أو بايونك"],
    ["ثابتة", "أحادية المحور", "سايمز اعتيادية", "سايمز كاربون", "كاربون رباعية المحاور"], ["كاربون درجة أولى", "كاربون درجة ثانية"],
    [...LINER_TYPES], null, null, null, "طرف لبتر خلال الكاحل", "طرف كف جزئي"]);
const UP_BE: AmputationParts = { amputationType: "single", singleLimb: "upper", singleSide: "right", singleDetail: "تحت المرفق" };
same("ط.٣ **فحصُ الحفظ**: نوعُ طرفٍ علويّ لساقٍ مرفوض، ونصٌّ حرّ مرفوض، و«لا ينطبق» مقبول، والعلويُّ بقائمته، والكفُّ حرّ — والرسالةُ تسمّي الخانة",
  [specChoiceProblems({ ...BK, prostheticType: "طرف تحت المرفق", footType: "قدم كربون", socketType: "لا ينطبق" }, limbSlots(BK)),
    specChoiceProblems({ ...UP_BE, prostheticType: "طرف تحت المرفق", handType: "يد كهربائية", siliconType: "فاكيوم" }, limbSlots(UP_BE)),
    specChoiceMessage(["prostheticType", "footType:left-lower"])],
  [["prostheticType", "footType"], [], "اختر من القائمة: نوع الطرف الصناعي، نوع القدم — يسار سفلي"]);
const DBL_BK_AK = DBL("تحت الركبة", "فوق الركبة");
same("ط.٤ **ولكلّ طرفٍ نوعُه**: مبتورٌ يمينُه سفليّ ويسارُه علويّ ⟵ خانةُ كلّ جهةٍ بقائمة طرفها",
  specChoiceProblems({ amputationType: "double", doubleLimbType: "both", bothRightLimb: "lower", bothLeftLimb: "upper",
    bothRightDetail: "تحت الركبة", bothLeftDetail: "تحت المرفق",
    "prostheticType:right": "طرف تحت المرفق", "prostheticType:left": "طرف تحت المرفق", "kneeJointType:left": "هيدروليك" } as any,
  limbSlots({ amputationType: "double", doubleLimbType: "both", bothRightLimb: "lower", bothLeftLimb: "upper", bothRightDetail: "تحت الركبة", bothLeftDetail: "تحت المرفق" })),
  ["prostheticType:right"]);
same("ط.٥ **والمكتوبُ قبل اليوم لا يمنع تعديلاً لا يمسّه** — بأيّ جهةٍ كان — وتغييرُه إلى نصٍّ حرٍّ آخر مرفوض",
  [specChoiceProblems({ ...BK, footType: "قدم كربون" }, limbSlots(BK), { footType: "قدم كربون" }),
    specChoiceProblems({ ...DBL_BK_AK, "footType:right": "قدم كربون" }, limbSlots(DBL_BK_AK), { footType: "قدم كربون" }),
    specChoiceProblems({ ...BK, footType: "قدم مرنة" }, limbSlots(BK), { footType: "قدم كربون" })],
  [[], [], ["footType"]]);
const withModels = normalizeLimbSpecs({ ...DBL_BK_AK, kneeJointType: "هيدروليك", kneeModel: "3R80", footType: "ثابتة", footModel: "SACH" } as any) as Record<string, unknown>;
same("ط.٦ **والحقلُ الحرّ يتبع خانتَه** في ترتيب الوصفة: لكلّ جهةٍ ما تخصّه — موديلُ الركبة لفوق الركبة وحده كركبته، وموديلُ القدم للجهتين",
  [withModels["kneeModel:right"], withModels["kneeModel:left"], withModels["footModel:right"], withModels["footModel:left"], withModels.kneeModel],
  [undefined, "3R80", "SACH", "SACH", undefined]);
const toBk = normalizeLimbSpecs({ ...AK, kneeJointType: "هيدروليك", kneeModel: "3R80", ...BK } as any) as Record<string, unknown>;
same("ط.٧ **ومَن غيّر فوق الركبة إلى تحتها لا يبقى له موديلُ ركبةٍ مخفيّ**", [toBk.kneeJointType, toBk.kneeModel], [undefined, undefined]);
const shownSingle = limbSpecView({ kneeJointType: "هيدروليك", kneeModel: "3R80", footType: "ثابتة", socketType: "كاربون درجة أولى", socketNotes: "بطانة جل",
  amputationSite: site(AK) });
const shownSplit = limbSpecView({ "footType:right": "ثابتة", "footModel:right": "SACH", "footType:left": "أحادية المحور", amputationSite: site(DBL_BK_AK) });
same("ط.٨ **ويُعرض مع خانته في سطرها** — «هيدروليك — موديل الركبة: 3R80»، وللجهتين كلٌّ بموديله، ولا سطرَ للحقل وحده",
  [shownSingle.rows.find((r) => r.key === "kneeJointType")?.value, shownSingle.rows.find((r) => r.key === "socketType")?.value,
    shownSingle.rows.some((r) => r.key === "kneeModel"), shownSplit.rows.find((r) => r.key === "footType")?.value],
  //  والموديلُ اللاتينيّ معزولٌ (U+2068 … U+2069 — التكملة ٢) فلا تنقلب الجملةُ حوله.
  [`هيدروليك — موديل الركبة: ${isolateLtr("3R80")}`, "كاربون درجة أولى — ملاحظات السوكيت: بطانة جل", false,
    `يمين: ثابتة — موديل القدم: ${isolateLtr("SACH")} · يسار: أحادية المحور`]);
same("ط.٩ **و«اشترى» يقبل الحقلَ الحرّ بجهته**، ويرفض ما ليس من القائمة بنوع طرفه، ويقبل ما حُفظ على الجهاز من قبل",
  [cleanSaleSpecsInput({ kneeModel: "3R80", "footModel:left": "SACH", "footModel:bogus": "x" }, "prosthetic"),
    saleSpecChoiceProblems("prosthetic", { prostheticType: "طرف تحت المرفق", footType: "ثابتة" }, { amputationSite: site(BK) }),
    saleSpecChoiceProblems("prosthetic", { footType: "قدم كربون" }, { amputationSite: site(BK) }, { footType: "قدم كربون" }),
    saleSpecChoiceProblems("medical_support", { supportType: "أيّ شيء" }, {})],
  [{ kneeModel: "3R80", "footModel:left": "SACH" }, ["prostheticType"], [], []]);
same("ط.١٠ **ونافذةُ «اشترى» تعرف قائمةَ كلّ خانةٍ وحقلَها**: نوعُ الطرف بمستوى البتر (تحت الركبة ⟵ واحد — ط.١١)، والقدمُ بموديلها بجهتها، والكفُّ حرّة",
  [saleSpecFieldExtras("prosthetic", { amputationSite: site(BK) }, "prostheticType").options?.length,
    saleSpecFieldExtras("prosthetic", { amputationSite: site(DBL_BK_AK), "footModel:left": "SACH" }, "footType:left").companion,
    saleSpecFieldExtras("prosthetic", { amputationSite: site(UP_BE) }, "handType")],
  [1, { key: "footModel:left", label: "موديل القدم", value: "SACH" }, { options: null, companion: null }]);

console.log("\n── ط (تكملة). نوعُ الطرف بمستوى البتر — ملاحظةُ المالك في أوّل فحص (§4.dw) ──");
same("ط.١١ **فوق الركبة لا يرى غيرَ «طرف فوق الركبة»** — ولكلّ مستوى في قائمتَي البتر اسمٌ واحد من قائمة طرفه (التكملة ٢: سايمز وخلال الرسغ اسمٌ واحد، و«خلال الكاحل» مستوى)، والمستوى المجهول قائمةُ طرفه",
  [specChoices("prostheticType", "lower", "فوق الركبة"), specChoices("prostheticType", "lower", "سايمز"), specChoices("prostheticType", "upper", "خلال الرسغ"),
    specChoices("prostheticType", "lower", "  تحت الركبة "), specChoices("prostheticType", "lower", "مستوى قديم")?.length,
    specChoices("prostheticType", "silicone", "اصبع"), specChoices("footType", "lower", "فوق الركبة")?.length,
    [...LOWER_AMPUTATION_DETAILS, ...UPPER_AMPUTATION_DETAILS].every((lv) => Boolean(PROSTHESIS_NAME_BY_LEVEL[lv])
      && (LOWER_AMPUTATION_DETAILS.includes(lv) ? LOWER_PROSTHESIS_TYPES : UPPER_PROSTHESIS_TYPES).includes(PROSTHESIS_NAME_BY_LEVEL[lv] as never)),
    LOWER_AMPUTATION_DETAILS.includes("خلال الكاحل"), specChoices("prostheticType", "lower", "خلال الكاحل")],
  [["طرف فوق الركبة"], ["طرف سايمز"], ["طرف خلال الرسغ"], ["طرف تحت الركبة"], 7, null, 5, true, true, ["طرف لبتر خلال الكاحل"]]);
same("ط.١٢ **والحفظُ يرفض نوعاً لا يطابق المستوى** — «طرف تحت الركبة» لفوق الركبة مرفوض، ولكلّ جهةٍ مستواها",
  [specChoiceProblems({ ...AK, prostheticType: "طرف تحت الركبة" }, limbSlots(AK)), specChoiceProblems({ ...AK, prostheticType: "طرف فوق الركبة" }, limbSlots(AK)),
    specChoiceProblems({ ...DBL_BK_AK, "prostheticType:right": "طرف تحت الركبة", "prostheticType:left": "طرف تحت الركبة" } as any, limbSlots(DBL_BK_AK)),
    saleSpecChoiceProblems("prosthetic", { prostheticType: "طرف تحت الركبة" }, { amputationSite: site(AK) })],
  [["prostheticType"], [], ["prostheticType:left"], ["prostheticType"]]);
const DBL_BK_SY = DBL("تحت الركبة", "سايمز");
same("ط.١٣ **والخانةُ العامّة لأطرافٍ متماثلة بما يجمعها** — تحت الركبة وسايمز ⟵ اسماهما معاً، وخانةُ كلّ جهةٍ بمستواها",
  [specChoicesForKey(limbSlots(DBL_BK_SY), "prostheticType"), specChoicesForKey(limbSlots(DBL_BK_SY), "prostheticType:left"),
    specChoicesForKey(limbSlots(AK), "footType")?.length],
  [["طرف تحت الركبة", "طرف سايمز"], ["طرف سايمز"], 5]);
const toAk = dropStaleChoices(normalizeLimbSpecs({ ...BK, prostheticType: "طرف تحت الركبة", footType: "ثابتة", footModel: "SACH", ...AK } as any)) as Record<string, unknown>;
const legacyAk = dropStaleChoices({ ...AK, prostheticType: "طرف سفلي ذكي" } as any) as Record<string, unknown>;
const naAk = dropStaleChoices({ ...AK, prostheticType: "لا ينطبق" } as any) as Record<string, unknown>;
const splitStale = dropStaleChoices({ ...DBL_BK_AK, "prostheticType:right": "طرف تحت الركبة", "prostheticType:left": "طرف تحت الركبة" } as any) as Record<string, unknown>;
same("ط.١٤ **ومَن صحّح المستوى يختار النوعَ من جديد** — «طرف تحت الركبة» يُمسح حين يصير فوق الركبة، والقدمُ وموديلُها باقيان، والمكتوبُ قديماً و«لا ينطبق» لا يُمسّان، ولكلّ جهةٍ مستواها",
  [toAk.prostheticType, toAk.footType, toAk.footModel, legacyAk.prostheticType, naAk.prostheticType, splitStale["prostheticType:right"], "prostheticType:left" in splitStale,
    isListedChoice("prostheticType", "طرف تحت الركبة"), isListedChoice("prostheticType", "طرف سفلي ذكي")],
  [undefined, "ثابتة", "SACH", "طرف سفلي ذكي", "لا ينطبق", "طرف تحت الركبة", false, true, false]);

console.log("\n── ط (تكملة ٢). «نوع الطرف الصناعي» مبنيٌّ من المستوى والركبة والقدم والسوكيت (المالك ٢٠٢٦-١٠-١٣) ──");
const I = isolateLtr;
same("ط.١٥ **الاسمُ المبنيّ**: المستوى ثمّ الركبةُ بموديلها «مع» القدمِ بموديلها «بقالب» السوكيت — وما لم يُكتب أو «لا ينطبق» لا يدخل، والمستوى المجهول لا اسمَ له",
  [composeProstheticName({ level: "فوق الركبة", knee: "هيدروليك", kneeModel: "3R80", foot: "كاربون رباعية المحاور", footModel: "Triton", socket: "كاربون درجة أولى" }),
    composeProstheticName({ level: "تحت الركبة", foot: "أحادية المحور", socket: "كاربون درجة ثانية" }),
    composeProstheticName({ level: "تحت المرفق", socket: "كاربون درجة أولى" }),
    composeProstheticName({ level: "فوق الركبة", knee: "لا ينطبق", kneeModel: "3R80", foot: "ثابتة" }),
    composeProstheticName({ level: "خلال الكاحل" }), composeProstheticName({ level: "مستوى قديم", foot: "ثابتة" }), composeProstheticName({ level: null })],
  [`طرف فوق الركبة — ركبة هيدروليك ${I("3R80")} مع قدم كاربون رباعية المحاور ${I("Triton")} بقالب كاربون درجة أولى`,
    "طرف تحت الركبة — قدم أحادية المحور بقالب كاربون درجة ثانية", "طرف تحت المرفق — بقالب كاربون درجة أولى",
    "طرف فوق الركبة — قدم ثابتة", "طرف لبتر خلال الكاحل", null, null]);
const akFull = { amputationSite: site(AK), kneeJointType: "هيدروليك", kneeModel: "3R80", footType: "ثابتة", socketType: "كاربون درجة أولى",
  socketNotes: "بطانة جل", siliconType: "قفل محوري", siliconModel: "Iceross" };
const typeRow = (sp: Record<string, unknown>) => limbSpecView(sp).rows.find((r) => r.key === "prostheticType")?.value ?? null;
const akName = `طرف فوق الركبة — ركبة هيدروليك ${I("3R80")} مع قدم ثابتة بقالب كاربون درجة أولى وسليكون قفل محوري ${I("Iceross")}`;
same("ط.١٦ **وفي الاستمارة وأمر التصنيع** — والسليكونُ بموديله فيه (المالك ٢٠٢٦-١٠-١٤) وملاحظاتُ السوكيت لا، والمختارُ أمس من القائمة يُبنى، **والمكتوبُ قبل اليوم نصّاً يبقى**، والسليكونيُّ التعويضيُّ كما كُتب",
  [typeRow(akFull), typeRow({ ...akFull, prostheticType: "طرف تحت الركبة" }), typeRow({ ...akFull, prostheticType: "طرف سفلي ذكي" }),
    typeRow({ ...akFull, prostheticType: "لا ينطبق" }),
    typeRow({ amputationSite: site({ amputationType: "silicone", siliconePart: "اذن", siliconeSide: "left" }), prostheticType: "أذن سليكون طبي" })],
  [akName, akName, "طرف سفلي ذكي", akName, "أذن سليكون طبي"]);
const splitSp = { amputationSite: site(DBL_BK_AK), "footType:right": "ثابتة", "socketType:right": "كاربون درجة أولى",
  "kneeJointType:left": "مقفول", "footType:left": "ثابتة", "footModel:left": "SACH", "socketType:left": "كاربون درجة ثانية" };
const splitRow = limbSpecView(splitSp).rows.find((r) => r.key === "prostheticType");
same("ط.١٧ **ولمبتور الطرفين اسمٌ لكلّ طرف** بمستواه وخاناته — تحت الركبة بلا ركبة، وفوقها بركبته",
  [splitRow?.sides?.map((x) => x.value), splitRow?.value],
  [["طرف تحت الركبة — قدم ثابتة بقالب كاربون درجة أولى", `طرف فوق الركبة — ركبة مقفول مع قدم ثابتة ${I("SACH")} بقالب كاربون درجة ثانية`],
    `يمين: طرف تحت الركبة — قدم ثابتة بقالب كاربون درجة أولى · يسار: طرف فوق الركبة — ركبة مقفول مع قدم ثابتة ${I("SACH")} بقالب كاربون درجة ثانية`]);
same("ط.١٨ **والمتماثلان اسمٌ واحد** — وبمستويين مختلفين كلٌّ باسمه مرّة",
  [typeRow({ amputationSite: site(DBL("تحت الركبة", "تحت الركبة")), footType: "ثابتة" }),
    typeRow({ amputationSite: site(DBL_BK_SY), footType: "ثابتة" })],
  ["طرف تحت الركبة — قدم ثابتة", "طرف تحت الركبة — قدم ثابتة · طرف سايمز — قدم ثابتة"]);
same("ط.١٩ **واسمٌ واحد في كلّ مكان** — عمودُ ملفّ المريض وقائمةُ الخبير بالنصّ نفسِه من الوصفة، و«اشترى» لا يطلبه ويطلبه للسليكونيّ",
  [prostheticTypeText({ ...AK, kneeJointType: "هيدروليك", footType: "ثابتة" }, site(AK)), typeRow({ amputationSite: site(AK), kneeJointType: "هيدروليك", footType: "ثابتة" }),
    keysFor({ amputationSite: site(AK) }).includes("prostheticType"),
    keysFor({ amputationSite: site({ amputationType: "silicone", siliconePart: "كف", siliconeSide: "left" }) }).includes("prostheticType")],
  ["طرف فوق الركبة — ركبة هيدروليك مع قدم ثابتة", "طرف فوق الركبة — ركبة هيدروليك مع قدم ثابتة", false, true]);
same("ط.٢٠ **والنصُّ اللاتينيّ معزول** (U+2068 … U+2069) فلا تنقلب الجملة — والعربيُّ كما هو",
  [I("3R80"), I("C-Leg 4"), I("هيدروليك"), I("3R80").length,
    composeProstheticName({ level: "فوق الركبة", knee: "هيدروليك", kneeModel: "3R80" })?.includes("\u20683R80\u2069")],
  ["\u20683R80\u2069", "\u2068C-Leg 4\u2069", "هيدروليك", 6, true]);

console.log("\n── ط (تكملة ٣). السليكونُ في الاسم، والخانةُ الحرّة تحفظ مسافاتها وهي تُكتب (المالك ٢٠٢٦-١٠-١٤) ──");
const BK1 = { amputationSite: site(BK) };
same("ط.٢١ **«وسليكون» آخرَ الاسم بموديله** — بعد السوكيت، ووحدَه بلا «و»، والموديلُ العربيّ بمسافته، و«لا ينطبق» لا يدخل ولا موديلٌ بلا نوعه، ولمبتور الطرفين سليكونُ كلّ طرف",
  [composeProstheticName({ level: "تحت الركبة", foot: "أحادية المحور", footModel: "سنكل", socket: "كاربون درجة ثانية", liner: "فاكيوم", linerModel: "امريكي وسليف" }),
    composeProstheticName({ level: "تحت الركبة", liner: "قفل محوري" }),
    composeProstheticName({ level: "تحت الركبة", foot: "ثابتة", liner: "لا ينطبق", linerModel: "Iceross" }),
    composeProstheticName({ level: "تحت الركبة", foot: "ثابتة", linerModel: "Iceross" }),
    typeRow({ ...BK1, footType: "ثابتة", siliconType: "فاكيوم", siliconModel: "امريكي وسليف" }),
    typeRow({ ...BK1, footType: "ثابتة", siliconType: "لا ينطبق", siliconModel: "Iceross" }),
    limbSpecView({ amputationSite: site(DBL_BK_AK), "footType:right": "ثابتة", "siliconType:right": "فاكيوم", "footType:left": "ثابتة", "siliconType:left": "قفل محوري" })
      .rows.find((r) => r.key === "prostheticType")?.sides?.map((x) => x.value)],
  ["طرف تحت الركبة — قدم أحادية المحور سنكل بقالب كاربون درجة ثانية وسليكون فاكيوم امريكي وسليف",
    "طرف تحت الركبة — سليكون قفل محوري",
    "طرف تحت الركبة — قدم ثابتة", "طرف تحت الركبة — قدم ثابتة",
    "طرف تحت الركبة — قدم ثابتة وسليكون فاكيوم امريكي وسليف", "طرف تحت الركبة — قدم ثابتة",
    ["طرف تحت الركبة — قدم ثابتة وسليكون فاكيوم", "طرف فوق الركبة — قدم ثابتة وسليكون قفل محوري"]]);
same("ط.٢٢ **والخانةُ وهي تُكتب تقرأ ما كُتب بحرفه** (`limbSpecInputValue`) — المسافةُ الأخيرة باقية فتُكتب الكلمةُ بعدها، ومفتاحُ الطرف ثمّ العامّ؛ **والعرضُ مقصوصٌ كما كان**",
  [limbSpecInputValue({ siliconModel: "امريكي " }, "siliconModel", null),
    limbSpecInputValue({ "siliconModel:left": "امريكي " }, "siliconModel", "left"),
    limbSpecInputValue({ siliconModel: "عام ", "siliconModel:left": "" }, "siliconModel", "left"),
    limbSpecInputValue({ siliconModel: 5 }, "siliconModel", null),
    limbSpecValue({ siliconModel: "امريكي " }, "siliconModel", null)],
  ["امريكي ", "امريكي ", "عام ", "", "امريكي"]);

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
