// قائمةُ «ما المطلوب» — منطقٌ خالص، بلا قاعدة ولا شبكة.
// `npm run test:parts`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **السنتينلُ محايد**: الجدولُ مشترَك بين الأطراف والمساند، وقيمةٌ اسمُها
//     «طرفٌ كامل» على حلقةِ مسندٍ كذبٌ في العمود نفسه. والعنوانُ يُشتقّ من
//     نوع الخدمة عند العرض.
// (٢) **والأجزاءُ للأطراف وحدها** — تُردّ على المساند لا تُصحَّح.
// (٣) **وقائمةٌ واحدة لمسارين**: شراءُ جزءٍ جديد وصيانةُ جزءٍ قائم. وقائمتان
//     كانتا ستنحرفان — يُضاف «الأدابتر» لإحداهما فتُصان قطعةٌ لا تُباع.
// (٤) **والعمودان متلازمان**: كاملٌ ⟺ لا جزء، وجزءٌ ⟺ الاسمُ نفسه.
// (٥) **والمجهولُ يُردّ لا يُصحَّح بصمت** — تصحيحُه «كاملاً» كان سيفتح طلبَ
//     جهازٍ لمريضٍ يريد ركبة، والفرقُ في الثمن هائل.
// (٦) **والصفوفُ القديمة تُقرأ «جهازاً كاملاً»** — وهو معناها الحقيقيّ.

import { readFileSync } from "fs";
import { join } from "path";
import {
  PROSTHETIC_COMPONENTS, REQUESTED_ITEMS, COMPONENT_LABELS, FULL_DEVICE,
  FULL_DEVICE_LABELS, FULL_DEVICE_NEUTRAL_LABEL, DEVICE_SERVICE_TYPES,
  isProstheticComponent, isRequestedItem, requestedItemLabel, componentLabel,
  componentOfRequest, parseRequestedItem, parseComponent, requestedItemLine,
  requestedItemOptions, noExamSaleRefusal, noExamSaleAllowed, noExamSaleServiceTypes,
} from "./prosthetic_parts";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

console.log("\n═══ ما المطلوب: جهازٌ كامل أم جزء ═══\n");

// ── ١. القائمةُ كما طلبها المالك، بترتيبها ─────────────────────────────
console.log("── القائمة ──");
same("١. **الأجزاءُ الثمانية**", [...PROSTHETIC_COMPONENTS],
  ["socket", "silicone", "knee", "tube", "adapter", "foot", "foam_cover", "foot_shell"]);
same("٢. **والطلبُ تسعةٌ — الكاملُ أوّلها**", REQUESTED_ITEMS.length, 9);
same("٣. **والسنتينلُ محايدٌ لا «طرف»**", REQUESTED_ITEMS[0], "full_device");
same("   (والثابتُ نفسُه)", FULL_DEVICE, "full_device");
same("٤. **وعناوينُها بألفاظ الفرع نفسها**",
  PROSTHETIC_COMPONENTS.map((c) => COMPONENT_LABELS[c]),
  ["القالب", "السليكون", "الركبة", "التيوب", "الأدابتر", "القدم",
    "الغلاف الإسفنجي", "غلاف القدم"]);
//  **ولكلّ عنوانٍ عربيٌّ خالص** — مسحٌ شامل.
same("٥. **ولا عنوانَ ناقصٌ ولا إنجليزيّ**",
  PROSTHETIC_COMPONENTS.filter((v) => !COMPONENT_LABELS[v] || /[A-Za-z_]/.test(COMPONENT_LABELS[v])),
  []);

// ── ٢. **السنتينلُ محايد، والعنوانُ يُشتقّ** ────────────────────────────
//  هذا هو تصحيحُ المالك: `full_prosthesis` على حلقةِ مسندٍ طبيّ كانت تصف
//  المسندَ بأنه طرف — في العمود نفسه، لا في الشاشة وحدها.
console.log("\n── محايدٌ في القاعدة، مسمّىً في الشاشة ──");
same("٦. **أطراف + كامل ⟶ «طرف صناعي كامل»**",
  requestedItemLabel(FULL_DEVICE, "prosthetic"), "طرف صناعي كامل");
same("٧. **ومساند + كامل ⟶ «مسند طبي كامل»**",
  requestedItemLabel(FULL_DEVICE, "medical_support"), "مسند طبي كامل");
same("٨. **وبلا نوعٍ يبقى محايداً صادقاً** — لا يُخمَّن طرفاً",
  requestedItemLabel(FULL_DEVICE), "جهاز كامل");
same("   (والعناوينُ الثلاثة ثابتة)",
  [FULL_DEVICE_LABELS.prosthetic, FULL_DEVICE_LABELS.medical_support,
    FULL_DEVICE_NEUTRAL_LABEL],
  ["طرف صناعي كامل", "مسند طبي كامل", "جهاز كامل"]);
same("٩. **ولا نوعَ خدمةٍ ثالث لجدول الحلقات**",
  [...DEVICE_SERVICE_TYPES], ["prosthetic", "medical_support"]);
//  **ولا يظهر لفظُ «طرف» في قيمةٍ مخزَّنة إطلاقاً** — وهذا لبُّ التصحيح.
check("١٠. **ولا قيمةَ مخزَّنة تقول «طرفاً»**",
  !REQUESTED_ITEMS.some((v) => v.includes("prosthesis")),
  REQUESTED_ITEMS.join(","));
same("١١. وسطرُ الطبيب يتبع النوعَ كذلك",
  [requestedItemLine(FULL_DEVICE, "prosthetic"),
    requestedItemLine(FULL_DEVICE, "medical_support")],
  ["المطلوب: طرف صناعي كامل", "المطلوب: مسند طبي كامل"]);
same("١٢. **وجزءٌ عنوانُه واحدٌ لا يتبع النوع**",
  [requestedItemLine("knee", "prosthetic"), requestedItemLabel("knee")],
  ["المطلوب: الركبة", "الركبة"]);

// ── ٣. **والأجزاءُ للأطراف وحدها — تُردّ لا تُصحَّح** ───────────────────
console.log("\n── المساند بلا أجزاء ──");
same("١٣. **مساند + ركبة ⟶ يُردّ**", parseRequestedItem("knee", "medical_support").ok, false);
check("١٤. ورسالتُه تقول القاعدةَ صراحةً",
  (parseRequestedItem("knee", "medical_support").error ?? "").includes("للأطراف الصناعية فقط"),
  String(parseRequestedItem("knee", "medical_support").error));
same("١٥. **وأطراف + ركبة ⟶ يمرّ**",
  parseRequestedItem("knee", "prosthetic"), { ok: true, value: "knee" });
same("١٦. **ومساند + كامل ⟶ يمرّ**",
  parseRequestedItem(FULL_DEVICE, "medical_support"), { ok: true, value: FULL_DEVICE });
//  **ولا تُعرَض عليه ما يُردّ**: المنعُ يبدأ من ألّا يُعرَض.
same("١٧. **وقائمةُ المساند خيارٌ واحد**",
  requestedItemOptions("medical_support"),
  [{ value: FULL_DEVICE, label: "مسند طبي كامل" }]);
same("١٨. **وقائمةُ الأطراف تسعة**", requestedItemOptions("prosthetic").length, 9);
same("   (وأوّلُها الكاملُ باسمه)",
  requestedItemOptions("prosthetic")[0], { value: FULL_DEVICE, label: "طرف صناعي كامل" });
//  وبلا نوعٍ يُمرَّر يبقى المحلّلُ متساهلاً كما كان (نافذةٌ قديمة).
same("١٩. **وبلا نوعٍ يُمرَّر لا يُردّ شيء** — الحارسُ عند مَن يعرف النوع",
  parseRequestedItem("knee"), { ok: true, value: "knee" });

// ── ٤. الحُرّاس ──────────────────────────────────────────────────────────
console.log("\n── الحرّاس ──");
check("٢٠. الجزءُ المعروف يُعرَف", isProstheticComponent("knee"));
check("٢١. **والجهازُ الكامل ليس جزءاً**", !isProstheticComponent(FULL_DEVICE));
check("٢٢. والمخترَعُ يُردّ", !isProstheticComponent("elbow") && !isRequestedItem("elbow"));
check("٢٣. والقيمُ غيرُ النصّية تُردّ",
  !isRequestedItem(null) && !isRequestedItem(7) && !isRequestedItem(undefined));
//  **والاسمُ القديم لم يعد قيمةً**: قاعدةٌ لم تُرقَّ ترسله فيُردّ لا يُقبل.
check("٢٤. **و`full_prosthesis` لم تعد قيمةً صالحة**",
  !isRequestedItem("full_prosthesis"));

// ── ٥. **العمودان متلازمان** ────────────────────────────────────────────
console.log("\n── التلازم ──");
same("٢٥. **الكاملُ ⟶ لا جزء**", componentOfRequest(FULL_DEVICE), null);
same("٢٦. **والجزءُ ⟶ الاسمُ نفسه**",
  PROSTHETIC_COMPONENTS.map((c) => componentOfRequest(c)), [...PROSTHETIC_COMPONENTS]);
same("٢٧. والمجهولُ ⟶ لا جزء", componentOfRequest("junk"), null);
//  وهذا هو ما يحرسه القيدُ في القاعدة نفسها — والاشتقاقُ يمنع كتابتَهما
//  بيدين فينحرفا.
same("٢٨. **ولا تركيبةَ مستحيلة تخرج من هنا**",
  REQUESTED_ITEMS.filter((v) => {
    const c = componentOfRequest(v);
    return v === FULL_DEVICE ? c !== null : c !== v;
  }), []);

// ── ٦. **المجهولُ يُردّ لا يُصحَّح** ────────────────────────────────────
console.log("\n── القراءة من العميل ──");
same("٢٩. **الغيابُ مقبولٌ** — نافذةٌ قديمة لا ترسله",
  [parseRequestedItem(undefined), parseRequestedItem(null), parseRequestedItem("")],
  [{ ok: true, value: null }, { ok: true, value: null }, { ok: true, value: null }]);
same("٣٠. **والمجهولُ يُردّ برسالةٍ عربية**", parseRequestedItem("elbow").ok, false);
check("٣١. ورسالتُه تدلّ على القائمة",
  (parseRequestedItem("elbow").error ?? "").includes("القائمة"),
  String(parseRequestedItem("elbow").error));

// ── ٧. **ولا يُصان «الجهاز كلُّه»** ─────────────────────────────────────
console.log("\n── جزء الصيانة ──");
same("٣٢. **«جهاز كامل» ليس جزءاً يُصان**", parseComponent(FULL_DEVICE).ok, false);
check("٣٣. ورسالتُه تقول ذلك صراحةً",
  (parseComponent(FULL_DEVICE).error ?? "").includes("الجهاز كاملاً"),
  String(parseComponent(FULL_DEVICE).error));
same("٣٤. والجزءُ المعروف يمرّ", parseComponent("socket"), { ok: true, value: "socket" });
same("٣٥. والغيابُ مقبولٌ هنا أيضاً — الإلزامُ يقرّره المُستدعي",
  parseComponent(null), { ok: true, value: null });

// ── ٨. العناوينُ للعرض ──────────────────────────────────────────────────
console.log("\n── العرض ──");
same("٣٦. **الصفُّ القديم يُقرأ «جهازاً كاملاً»** — وهو معناه الحقيقيّ",
  [requestedItemLabel(null, "prosthetic"), requestedItemLabel(undefined, "medical_support"),
    requestedItemLabel("")],
  ["طرف صناعي كامل", "مسند طبي كامل", "جهاز كامل"]);
same("٣٧. **والمجهولُ لا يظهر باسمه البرمجيّ**",
  requestedItemLabel("elbow", "prosthetic"), "طرف صناعي كامل");
same("٣٨. **و`componentLabel` ترفض الكامل**",
  [componentLabel(FULL_DEVICE), componentLabel("knee")], [null, "الركبة"]);

// ── ٩. **والقاعدةُ تحرس القيمَ نفسها** ─────────────────────────────────
//  القائمةُ هنا والقيدُ هناك يجب أن يتطابقا حرفاً: قيمةٌ تُضاف في المشتركة
//  ولا تُضاف إلى الترحيل تُقبل في الشيفرة وتُردّ في القاعدة.
console.log("\n── مطابقةُ القاعدة ──");
{
  const mig = readFileSync(
    join(import.meta.dirname, "../server/migrations/060_prosthetic_parts.ts"), "utf8");
  same("٣٩. **كلُّ قيمةٍ في القائمة موجودةٌ في قيد الترحيل**",
    REQUESTED_ITEMS.filter((v) => !mig.includes(`'${v}'`)), []);
  //  **والافتراضُ في القاعدة هو السنتينل المحايد** لا الاسمُ القديم.
  check("٤٠. **وافتراضُ العمود محايدٌ في الترحيل**",
    mig.includes("SET DEFAULT 'full_device'"), "");
  //  **والترحيلُ يُرقّي الاسمَ القديم** إن وُجد على قاعدةِ تطوير.
  check("٤١. **ويُرقّي الصيغةَ الأولى إن وُجدت** — تقارُبٌ لا تخطٍّ",
    mig.includes("requested_item = 'full_prosthesis'"), "");
  const schema = readFileSync(join(import.meta.dirname, "./schema.ts"), "utf8");
  same("٤٢. **والمخطّطُ يحمل القيمَ نفسها**",
    REQUESTED_ITEMS.filter((v) => !schema.includes(`'${v}'`)), []);
  check("٤٣. **وافتراضُه محايدٌ أيضاً**", schema.includes('default("full_device")'), "");
  //  **ولا أثرَ للاسم القديم في المخطّط** — وإلّا انحرف عن الترحيل.
  check("٤٤. **ولا `full_prosthesis` في المخطّط**",
    !schema.includes("full_prosthesis"), "");
}

// ── ٧. قاعدةُ البيع بلا معاينة — الجهازُ الكاملُ ممنوعٌ في القسمين ──────
//
// ══ الواقعةُ التي صحّحها المالك (بعد ٢٤٩) ══════════════════════════════
// كان الاستثناءُ يقول: «المساندُ بلا قائمة أجزاء، فالمسندُ الكاملُ يبقى
// مؤهَّلاً للبيع بلا معاينة». وهذا **قلبٌ للحجّة**: غيابُ الأجزاء يعني ألّا
// بيعَ بلا معاينة للمساند أصلاً — لا أن يُباع منها **أشدُّ** ما يحتاج
// الطبيب. فالمسموحُ اليومَ: **جزءُ طرفٍ صناعيّ وحده**.
console.log("\n── البيعُ بلا معاينة: الجزءُ وحده ──");

//  (أ) الطرفُ الكامل يُردّ — كما كان.
check("٤٥. **الطرفُ الكاملُ + بلا معاينة ⟶ يُردّ**",
  noExamSaleRefusal("prosthetic", FULL_DEVICE) !== null, "");
check("٤٥.ب ورسالتُه تسمّيه باسمه وتدلّ على البابين",
  (noExamSaleRefusal("prosthetic", FULL_DEVICE) ?? "").includes("طرف صناعي كامل")
  && (noExamSaleRefusal("prosthetic", FULL_DEVICE) ?? "").includes("معاينة")
  && (noExamSaleRefusal("prosthetic", FULL_DEVICE) ?? "").includes("تصحيح"),
  noExamSaleRefusal("prosthetic", FULL_DEVICE) ?? "");

//  (ب) **والمسندُ الكاملُ يُردّ كذلك** — وهذا هو التصحيح.
check("٤٦. **والمسندُ الكاملُ + بلا معاينة ⟶ يُردّ أيضاً**",
  noExamSaleRefusal("medical_support", FULL_DEVICE) !== null, "");
check("٤٦.ب **ورسالتُه تسمّي المسندَ لا الطرف** — رسالةٌ واحدةٌ صادقةٌ للقسمين",
  (noExamSaleRefusal("medical_support", FULL_DEVICE) ?? "").includes("مسند طبي كامل"),
  noExamSaleRefusal("medical_support", FULL_DEVICE) ?? "");

//  (ج) وجزءُ الطرف يبقى مسموحاً — القاعدةُ ضيّقت ما يجب ولم تكنس غيره.
same("٤٧. **وكلُّ جزءِ طرفٍ يبقى مسموحاً بلا معاينة**",
  PROSTHETIC_COMPONENTS.filter((c) => noExamSaleRefusal("prosthetic", c) !== null), []);

//  (د) والغيابُ يُقرأ «كاملاً» فيُردّ — صفٌّ قديمٌ بلا `requested_item`.
check("٤٨. **والطلبُ الغائب يُقرأ كاملاً فيُردّ** — لا يُصحَّح بصمت",
  noExamSaleRefusal("prosthetic", null) !== null
  && noExamSaleRefusal("medical_support", undefined) !== null, "");

//  (هـ) **ولا جزءَ يُقبل على مسند** — الحارسُ من وجهٍ ثانٍ.
same("٤٩. **ولا جزءَ طرفٍ يمرّ على مسندٍ بحجّة أنه جزء**",
  PROSTHETIC_COMPONENTS.filter((c) => noExamSaleAllowed("medical_support", c)), []);

//  (و) والقائمةُ المشتقّة تقول أيُّ قسمٍ له بيعٌ بلا معاينة أصلاً — تقرؤها
//  الشاشةُ فلا تعرض باباً يردّه الخادمُ بعد ضغطتين.
same("٥٠. **والأطرافُ وحدها قسمٌ له بيعٌ بلا معاينة**",
  [...noExamSaleServiceTypes], ["prosthetic"]);
check("٥١. و`noExamSaleAllowed` مرآةُ القاعدة لا نسخةٌ ثانية منها",
  DEVICE_SERVICE_TYPES.every((s) => REQUESTED_ITEMS.every((i) =>
    noExamSaleAllowed(s, i) === (noExamSaleRefusal(s, i) === null))), "");

//  (ز) **والخادمُ يقرأ هذه القاعدةَ بعينها** في بابَيه معاً — لا شرطاً
//  مكتوباً بيدٍ ثانية ينحرف عنها يوماً.
{
  const epRoutes = readFileSync(
    join(import.meta.dirname, "../server/device_episodes/routes.ts"), "utf8");
  const storage = readFileSync(join(import.meta.dirname, "../server/storage.ts"), "utf8");
  check("٥٢. **بابُ فتح الطلب ينادي القاعدة المشتركة**",
    epRoutes.includes("noExamSaleRefusal(serviceType, parsedItem.value)"), "");
  check("٥٣. **وبابُ البيع تحت القفل ينادِيها هو أيضاً**",
    storage.includes("noExamSaleRefusal(serviceType, episode.requestedItem)"), "");
  //  **ولا بقيّةَ للشرط القديم** المقصور على الأطراف في أيٍّ منهما.
  check("٥٤. **ولا شرطَ `serviceType === \"prosthetic\"` باقياً في الحارسين**",
    !/serviceType === "prosthetic"\s*\n?\s*&& !isProstheticComponent/.test(epRoutes)
    && !/serviceType === "prosthetic"\s*\n?\s*&& !isProstheticComponent/.test(storage), "");
  check("٥٥. **ولا ثابتَ `NO_EXAM_FULL_PROSTHESIS_REFUSAL` مهجورٌ في المستودع**",
    !epRoutes.includes("NO_EXAM_FULL_PROSTHESIS_REFUSAL")
    && !storage.includes("NO_EXAM_FULL_PROSTHESIS_REFUSAL"), "");
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
