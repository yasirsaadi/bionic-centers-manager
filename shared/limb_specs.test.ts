// **مواصفاتُ الطرف بحسب البتر** (ملاحظاتُ المالك ٢٠٢٦-١٠-١٠، §4.de). `npm run test:limb-specs` — قواعدُ خالصة بلا قاعدة.
//
// يحرس: (١) تحت الركبة بلا ركبة، والسليكونيُّ بلا قدمٍ ولا ركبةٍ ولا سوكيت، والعلويُّ بلا ركبةٍ ولا قدم وله الكفُّ (والمرفقُ فوق المرفق)؛
// (٢) مبتورُ الطرفين خاناتٌ لكلّ جهة، و«متماثلان» تُكتب مرّةً للطرفين؛ (٣) ولا يُخفى مكتوب؛ (٤) و«اشترى» يشترط ما يخصّ البترَ وحده — بجهاته؛
// (٥) وأمرُ التصنيع لا يفقد خانة؛ (٦) و«متعدد» طرفاً طرفاً، و«يُصنع في هذا الطلب» يحصر الشرطَ في المصنوع.
import {
  ELBOW_LEVELS, KNEE_LEVELS, LEGACY_LIMB_SPEC_KEYS, LIMB_SPEC_KEYS, isSlotKey, limbSlots, limbSlotsOfSite, limbSpecFlat, limbSpecKeys, limbSpecValue,
  limbSpecView, normalizeLimbSpecs, slotKeyLabel, slotTitle, slotsCanShare, splitSpecKey,
} from "./limb_specs";
import { cleanSaleSpecsInput, mergeDeviceSpecs, missingSaleSpecs, saleSpecFieldsFor, saleSpecsMessage, specResolved, NOT_APPLICABLE } from "./device_specs";
import { sheetSpecRows, sheetSpecView } from "./intake_sheet_view";
import {
  buildAmputationSite, LOWER_AMPUTATION_DETAILS, PROSTHETIC_DEVICE_SPECS, SILICONE_PARTS, UPPER_AMPUTATION_DETAILS, type AmputationLimb, type AmputationParts,
} from "./case_fields";
import { checkAmputationParts } from "./patient_required";

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
  [["prostheticType:left-lower", "نوع الطرف الصناعي — يسار سفلي"], ["socketType:left-lower", "نوع السوكيت — يسار سفلي"],
    ["footType:left-lower", "نوع القدم — يسار سفلي"], ["siliconType:left-lower", "نوع السليكون — يسار سفلي"],
    ["prostheticType:left-upper", "نوع الطرف الصناعي — يسار علوي"], ["siliconType:left-upper", "نوع السليكون — يسار علوي"]]);
same("و.٨ **وعلويٌّ فوق المرفق ⟵ المرفقُ والكفُّ مطلوبان بعنوانهما**",
  saleSpecFieldsFor("prosthetic", { amputationSite: site(FACE3) }).filter((f) => f.key.endsWith(":right-upper")).map((f) => f.label),
  ["نوع الطرف الصناعي — يمين علوي", "نوع السوكيت — يمين علوي", "نوع المرفق — يمين علوي", "نوع الكف / اليد — يمين علوي", "نوع السليكون — يمين علوي"]);
const notMadeHand = { ...c1, limbsNotMade: "left-upper" };
const nmView = limbSpecView(notMadeHand);
same("و.٩ **«يُصنع في هذا الطلب»: الكفُّ تُصنع لاحقاً ⟵ لا يُطلب لها شيءٌ الآن**، وتُذكر «لا يُصنع» في العرض",
  [saleSpecFieldsFor("prosthetic", notMadeHand).map((f) => f.key), nmView.slots.map((x) => x.key), nmView.notMadeSlots.map(slotTitle), nmView.allSlots.length],
  [["prostheticType:left-lower", "socketType:left-lower", "footType:left-lower", "siliconType:left-lower"], ["left-lower"], ["يسار علوي — كف"], 2]);
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
  ["identical", 2, ["نوع الطرف الصناعي — للطرفين", "نوع السوكيت — للطرفين", "نوع القدم — للطرفين", "نوع السليكون — للطرفين"]]);
same("و.١٥ **قدمٌ سليكونية مع ساقين تحت الركبة لا تتماثل معهما ⟵ لكلّ طرفٍ خاناتُه**",
  saleSpecFieldsFor("prosthetic", { amputationSite: site(MULTI(L_BK, { ...L_BK, side: "right" }, { region: "lower", side: "right", kind: "silicone", detail: "قدم" })) })
    .map((f) => f.key).slice(0, 2), ["prostheticType:left-lower", "socketType:left-lower"]);
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

console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
process.exit(failures ? 1 : 0);
