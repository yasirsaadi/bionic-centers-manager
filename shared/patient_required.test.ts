// بياناتُ المريض الإلزامية — منطقٌ خالص، بلا قاعدة ولا شبكة.
// `npm run test:patient-required`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الثلاثةُ إلزامية دائماً**: العمر والطول والوزن — الطرفُ يُصنَع عليها.
// (٢) **ومريضُ البتر يزيد تعريفَ بترِه منظَّماً** — بالمحلّل الرسمي لا
//     بتخمينٍ على النصّ، فالفاصلُ في الصيغة شرطةٌ والفحصُ الساذج يردّ كلَّ
//     سلسلةٍ صحيحة.
// (٣) **وغيرُ المبتور لا يُسأل عن بتر**.
// (٤) **والملفُّ القديم يُقرأ ولا يُخمَّن** — القاعدةُ للحفظ لا للعرض.

import {
  checkRequiredPatientData, checkAmputationSite, checkAmputationParts,
  meaningfulMeasure, legacyIncomplete, isAdministrativeOnlyPatch,
} from "./patient_required";
import { buildAmputationSite, parseAmputationSite } from "./case_fields";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

const FULL = { age: "40", height: "175", weight: "80", isAmputee: false };

console.log("\n═══ بيانات المريض الإلزامية ═══\n");

// ── ١. الثلاثةُ الأساسية ─────────────────────────────────────────────────
console.log("── العمر والطول والوزن ──");
check("١. **مريضٌ مكتملٌ يُقبل**", checkRequiredPatientData(FULL).ok);
same("٢. **بلا عمر ⟶ يُردّ**",
  checkRequiredPatientData({ ...FULL, age: "" }).missing, ["age"]);
same("٣. **بلا طول ⟶ يُردّ**",
  checkRequiredPatientData({ ...FULL, height: "" }).missing, ["height"]);
same("٤. **بلا وزن ⟶ يُردّ**",
  checkRequiredPatientData({ ...FULL, weight: "" }).missing, ["weight"]);
same("٥. والثلاثةُ معاً تُسمّى كلُّها في رسالةٍ واحدة",
  checkRequiredPatientData({ isAmputee: false }).missing, ["age", "height", "weight"]);
check("٦. **والرسالةُ عربيةٌ تسمّي الناقص**",
  (checkRequiredPatientData({ isAmputee: false }).message ?? "").includes("العمر"),
  String(checkRequiredPatientData({ isAmputee: false }).message));

// ── ٢. **قيمةٌ ذاتُ معنى** لا مجرّدِ وجود ───────────────────────────────
console.log("\n── القيمة ذات المعنى ──");
same("٧. **الصفرُ ليس وزناً**", meaningfulMeasure("0"), false);
same("٨. ولا السالب", meaningfulMeasure("-5"), false);
same("٩. ولا الفراغُ ولا المسافات", [meaningfulMeasure(""), meaningfulMeasure("   ")], [false, false]);
same("١٠. ولا النصُّ بلا رقم", meaningfulMeasure("غير معروف"), false);
same("١١. و`null` و`undefined`", [meaningfulMeasure(null), meaningfulMeasure(undefined)], [false, false]);
check("١٢. **والرقمُ الموجب يُقبل** — رقماً كان أو نصّاً",
  meaningfulMeasure("75") && meaningfulMeasure(75) && meaningfulMeasure("75.5"));
//  الأعمدةُ نصّيةٌ تاريخياً، فقيمٌ مثل «40 سنة» موجودةٌ فعلاً في القاعدة.
check("١٣. **و«40 سنة» تُقرأ أربعين** — القاعدةُ نصّيةٌ تاريخياً",
  meaningfulMeasure("40 سنة"));

// ── ٣. **تعريفُ البتر — بالباني الرسمي نفسه** ───────────────────────────
//  تُبنى السلاسلُ بـ`buildAmputationSite` لا تُكتَب بيدٍ: فحصُنا يجب أن يقبل
//  ما يُنتجه النظامُ فعلاً، لا ما نتخيّله.
console.log("\n── تعريف البتر ──");
{
  const single = buildAmputationSite({
    amputationType: "single", singleLimb: "lower", singleSide: "right",
    singleDetail: "تحت الركبة",
  });
  check(`١٤. **احاديٌّ مكتمل يُقبل** («${single}»)`, checkAmputationSite(single).ok,
    JSON.stringify(checkAmputationSite(single)));
  same("    ويُقبل داخل فحص المريض كاملاً",
    checkRequiredPatientData({ ...FULL, isAmputee: true, amputationSite: single }).ok, true);
}
{
  //  بلا مستوى: الباني يُنتج «احادي - طرف سفلي - يمين» بلا الجزء الرابع.
  const noLevel = buildAmputationSite({
    amputationType: "single", singleLimb: "lower", singleSide: "right",
  });
  same(`١٥. **واحاديٌّ بلا مستوى يُردّ** («${noLevel}»)`,
    checkAmputationSite(noLevel).missing, ["amputationLevel"]);
}
// ── **الثنائيُّ يلزمه الجهتان معاً — أيّاً كان نمطُه** ────────────────────
//  «ثنائي» تعني الطرفين بالتعريف. وكان النمطُ «علويّ» و«سفليّ» يُقبل بجهةٍ
//  واحدة، فيُحفَظ مبتورُ الطرفين بتعريفِ نصفِه — والخبيرُ يقيس على ما هو
//  مكتوب: طرفٌ يُصنَع، والثاني لا أحدَ يعرف مستواه.
{
  const dbl = (extra: Record<string, string>) => buildAmputationSite({
    amputationType: "double", ...extra,
  } as any);
  const lowerBoth = dbl({ doubleLimbType: "lower",
    doubleRightDetail: "تحت الركبة", doubleLeftDetail: "فوق الركبة" });
  const lowerRight = dbl({ doubleLimbType: "lower", doubleRightDetail: "تحت الركبة" });
  const lowerLeft = dbl({ doubleLimbType: "lower", doubleLeftDetail: "فوق الركبة" });
  check(`١٦. **ثنائيٌّ سفليٌّ بالجهتين يُقبل**`, checkAmputationSite(lowerBoth).ok,
    `«${lowerBoth}» ⟵ ${JSON.stringify(checkAmputationSite(lowerBoth))}`);
  same("١٦ب. **وباليمين وحده يُردّ**",
    checkAmputationSite(lowerRight).missing, ["amputationLevel"]);
  same("١٦ج. **وباليسار وحده يُردّ**",
    checkAmputationSite(lowerLeft).missing, ["amputationLevel"]);

  const upperBoth = dbl({ doubleLimbType: "upper",
    doubleRightDetail: "تحت المرفق", doubleLeftDetail: "فوق المرفق" });
  const upperRight = dbl({ doubleLimbType: "upper", doubleRightDetail: "تحت المرفق" });
  check(`١٧. **وثنائيٌّ علويٌّ بالجهتين يُقبل**`, checkAmputationSite(upperBoth).ok,
    `«${upperBoth}» ⟵ ${JSON.stringify(checkAmputationSite(upperBoth))}`);
  same("١٧ب. **وباليمين وحده يُردّ**",
    checkAmputationSite(upperRight).missing, ["amputationLevel"]);
}
{
  //  والمختلطُ «علوي وسفلي» كذلك — كلتا الجهتين بطرفها وتفصيلها.
  const mixed = (extra: Record<string, string>) => buildAmputationSite({
    amputationType: "double", doubleLimbType: "both",
    bothRightLimb: "lower", bothLeftLimb: "upper", ...extra,
  } as any);
  const both = mixed({ bothRightDetail: "تحت الركبة", bothLeftDetail: "فوق المرفق" });
  check(`١٨. **والمختلطُ بالجهتين يُقبل**`, checkAmputationSite(both).ok,
    `«${both}» ⟵ ${JSON.stringify(checkAmputationSite(both))}`);
  same("١٨ب. **وبلا اليسار يُردّ**",
    checkAmputationSite(mixed({ bothRightDetail: "تحت الركبة" })).missing, ["amputationLevel"]);
  same("١٨ج. **وبلا اليمين يُردّ**",
    checkAmputationSite(mixed({ bothLeftDetail: "فوق المرفق" })).missing, ["amputationLevel"]);
}
{
  const sil = buildAmputationSite({
    amputationType: "silicone", siliconePart: "اصبع", siliconeSide: "right",
  });
  check(`١٩. **وسليكونيٌّ بقطعةٍ وجهة يُقبل**`, checkAmputationSite(sil).ok,
    `«${sil}» ⟵ ${JSON.stringify(checkAmputationSite(sil))}`);
  //  **والأنفُ وحده بلا جهة** — قاعدةُ الباني نفسه لا استثناءٌ يُخترَع.
  const nose = buildAmputationSite({ amputationType: "silicone", siliconePart: "انف" });
  check(`٢٠. **والأنفُ لا يُسأل عن جهة**`, checkAmputationSite(nose).ok,
    `«${nose}» ⟵ ${JSON.stringify(checkAmputationSite(nose))}`);
  //  وقطعةٌ غيرُ الأنف بلا جهة تُردّ.
  const noSide = buildAmputationSite({ amputationType: "silicone", siliconePart: "" });
  check(`٢١. **وسليكونيٌّ بلا قطعة يُردّ**`, !checkAmputationSite(noSide).ok,
    `«${noSide}»`);
}
same("٢٢. **والفراغُ يُردّ بالثلاثة**",
  checkAmputationSite("").missing, ["amputationType", "amputationSide", "amputationLevel"]);
same("٢٣. **ونصٌّ حرٌّ لا يفهمه الباني يُردّ**",
  checkAmputationSite("مبتور من الرجل").ok, false);

// ── ٤. **وغيرُ المبتور لا يُسأل عن بتر** ────────────────────────────────
console.log("\n── غير المبتور ──");
check("٢٤. **مريضُ علاجٍ طبيعي مكتملُ المقاسات يُقبل بلا بتر**",
  checkRequiredPatientData({ ...FULL, isAmputee: false }).ok);
check("٢٥. والعَلَمُ الغائب كذلك",
  checkRequiredPatientData({ age: "30", height: "160", weight: "60" }).ok);
same("٢٦. **والعلمُ الغامض يُقرأ «ليس مبتوراً»** — لا يُشدَّد بالصدفة",
  checkRequiredPatientData({ ...FULL, isAmputee: "true" as any }).ok, true);

// ── ٥. **والملفُّ القديم: يُقرأ ولا يُخمَّن** ───────────────────────────
console.log("\n── الملف القديم ──");
check("٢٧. **ملفٌّ قديمٌ ناقص يُعرَف نقصُه**",
  legacyIncomplete({ age: "40", isAmputee: false }));
check("٢٨. **والمكتملُ لا يُعَدّ ناقصاً**", !legacyIncomplete(FULL));
//  **ولا شيءَ هنا يكتب قيمة**: الدوالُّ كلُّها قراءةٌ خالصة تُرجع حكماً.
check("٢٩. **ولا تُعدَّل الحمولةُ الواردة إطلاقاً** — حكمٌ لا ترميم",
  (() => {
    const input: any = { age: "", height: "", weight: "", isAmputee: true };
    const snapshot = JSON.stringify(input);
    checkRequiredPatientData(input);
    return JSON.stringify(input) === snapshot;
  })());
same("٣٠. **ومريضٌ فارغٌ تماماً لا يُسقط شيئاً**",
  [checkRequiredPatientData(null).ok, checkRequiredPatientData(undefined).ok], [false, false]);

// ── ٦. **الفحصُ على الأجزاء — والافتراضُ ليس إجابة** ────────────────────
//  `buildAmputationSite` تكتب «طرف سفلي» و«يمين» حين لا يُختار شيء (تعبيرٌ
//  ثلاثيّ افتراضُه أحدهما)، فسلسلةٌ نصفُ مختارة **تبدو مكتملةً للمحلّل**.
//  فالشاشةُ تفحص الأجزاء التي تملكها، لا السلسلةَ التي بنتها.
console.log("\n── الأجزاء لا السلسلة ──");
same("٣١. **نوعٌ بلا اختيار يُردّ بالثلاثة**",
  checkAmputationParts({}).missing,
  ["amputationType", "amputationSide", "amputationLevel"]);
same("٣٢. **و«احادي» بلا طرفٍ ولا جهةٍ ولا مستوى يُردّ بالثلاثة**",
  checkAmputationParts({ amputationType: "single" }).missing,
  ["amputationType", "amputationSide", "amputationLevel"]);
//  **وهذه هي الحالةُ التي كانت تمرّ**: السلسلةُ المبنيّة منها تبدو تامّة.
check("٣٣. **والسلسلةُ المبنيّة من نصفِ اختيارٍ تبدو تامّة** — ولذلك تُفحَص الأجزاء",
  checkAmputationSite(buildAmputationSite({
    amputationType: "single", singleDetail: "تحت الركبة",
  } as any)).ok,
  buildAmputationSite({ amputationType: "single", singleDetail: "تحت الركبة" } as any));
same("٣٤. والمكتملُ يمرّ على الأجزاء",
  checkAmputationParts({
    amputationType: "single", singleLimb: "lower", singleSide: "right",
    singleDetail: "تحت الركبة",
  }).ok, true);
same("٣٥. **وسليكونيٌّ بلا جهةٍ لغير الأنف يُردّ**",
  checkAmputationParts({ amputationType: "silicone", siliconePart: "اصبع" }).missing,
  ["amputationSide"]);
same("٣٦. **والأنفُ يمرّ بلا جهة**",
  checkAmputationParts({ amputationType: "silicone", siliconePart: "انف" }).ok, true);

// ── ٧. **التصحيحُ الإداريّ يُقاس بما تغيّر لا بما حضر** ─────────────────
//  نموذجُ «تعديل مريض» يرسل الكائنَ كاملاً في كل حفظ. فقاعدةٌ تقرأ **وجودَ
//  المفاتيح** كانت تردّ كلَّ تصحيحٍ إداريّ على كلّ ملفٍّ قديم — أي القاعدةَ
//  التي وُضعت لإلغائها بعينها.
console.log("\n── ما تغيّر لا ما حضر ──");
{
  const stored = { age: "40", height: null, weight: null, isAmputee: true,
    amputationSite: null };
  //  نموذجٌ كامل، والهاتفُ وحده مختلف — والحقولُ الإلزامية بقيمها المخزَّنة.
  const fullForm = { name: "س", phone: "07709998877", age: "40", height: "",
    weight: "", isAmputee: true, amputationSite: "" };
  check("٣٧. **نموذجٌ كامل لم يتغيّر فيه إلزاميّ ⟶ إداريٌّ محض**",
    isAdministrativeOnlyPatch(fullForm, stored as any),
    JSON.stringify(fullForm));
  check("٣٨. **وتغييرُ الطول يُخرجه من الإداريّ**",
    !isAdministrativeOnlyPatch({ ...fullForm, height: "170" }, stored as any));
  check("٣٩. **وتغييرُ العمر كذلك**",
    !isAdministrativeOnlyPatch({ ...fullForm, age: "41" }, stored as any));
  check("٤٠. **ورفعُ رايةِ البتر كذلك**",
    !isAdministrativeOnlyPatch({ ...fullForm, isAmputee: false }, stored as any));
  check("٤١. **وتعريفُ البتر كذلك**",
    !isAdministrativeOnlyPatch(
      { ...fullForm, amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" },
      stored as any));
  //  **والنصُّ والرقمُ المتساويان قيمةٌ واحدة** — وإلّا أُلزِم مَن لم يغيّر.
  check("٤٢. **و«170» و170 قيمةٌ واحدة** — لا تُقرأ تغييراً",
    isAdministrativeOnlyPatch({ height: 170 }, { height: "170" } as any));
  check("٤٣. **و`null` و«» سواء**",
    isAdministrativeOnlyPatch({ weight: "" }, { weight: null } as any));
  //  وبلا صفٍّ مخزَّن يُتشدَّد: كلُّ مفتاحٍ حاضرٍ يُقرأ تغييراً.
  check("٤٤. **وبلا مرجعٍ محفوظ يُتشدَّد**",
    !isAdministrativeOnlyPatch({ height: "170" }));
  check("٤٥. وحمولةٌ بلا حقلٍ إلزاميّ إداريّةٌ دائماً",
    isAdministrativeOnlyPatch({ phone: "0770", address: "x" }));
}

// ── ٨. **«تعديل مريض» — سلوكُ الصفحة كما تُنفّذه** ───────────────────────
//  النموذجُ يرسل الكائنَ كاملاً في كل حفظ. والصفحةُ الآن تنادي هاتين
//  الدالّتين بالضبط: `isAdministrativeOnlyPatch` ثم `checkRequiredPatientData`
//  حين تُخرِجها الأولى من الإداريّ. وهنا يُحاكى المساران كما هما.
//
//  والسلسلةُ تُبنى كما يبنيها الباني المشترك: المكتملُ يُكتب، والناقصُ يبقى
//  فراغاً — ولا يُخترَع تعريفٌ لم يُختَر.
console.log("\n── سلوكُ «تعديل مريض» ──");
{
  const siteOf = (parts: any) =>
    checkAmputationParts(parts).ok ? buildAmputationSite(parts) : "";
  /** ما تفعله `onSubmit` حرفاً: يمرّ أو يُمنَع، وبأيّ سلسلة. */
  const submit = (stored: any, values: any) => {
    if (!isAdministrativeOnlyPatch(values, stored)) {
      const req = checkRequiredPatientData({
        age: values.age, height: values.height, weight: values.weight,
        isAmputee: values.isAmputee, amputationSite: values.amputationSite,
      });
      if (!req.ok) return { ok: false, missing: req.missing };
    }
    return { ok: true, sent: values };
  };

  //  ملفٌّ قديم: بلا عمرٍ ولا طولٍ ولا وزن، مبتورٌ بلا موقعِ بتر.
  const legacy = { age: "", height: "", weight: "", isAmputee: true, amputationSite: "" };
  const form = (patch: any = {}) => ({
    name: "مريض", phone: "07701111111", address: "عنوان",
    patientClassification: "past",
    age: "", height: "", weight: "", isAmputee: true, amputationSite: "",
    ...patch,
  });

  //  (أ) الهاتفُ وحده يتغيّر ⟶ يمرّ.
  same("٤٦. **(أ) الهاتفُ وحده على ملفٍّ ناقص ⟶ يمرّ**",
    submit(legacy, form({ phone: "07702222222" })).ok, true);
  same("   والعنوانُ وحده كذلك",
    submit(legacy, form({ address: "عنوانٌ آخر" })).ok, true);
  same("   والتصنيفُ وحده كذلك",
    submit(legacy, form({ patientClassification: "new" })).ok, true);

  //  (ب) العمرُ يتغيّر والباقي فارغ ⟶ يُمنَع، ويُسمّى الناقصُ كلُّه.
  const changedAge = submit(legacy, form({ age: "40" }));
  same("٤٧. **(ب) والعمرُ يتغيّر والباقي فارغ ⟶ يُمنَع**", changedAge.ok, false);
  same("   ويُسمّى الناقصُ كلُّه",
    (changedAge as any).missing,
    ["height", "weight", "amputationType", "amputationSide", "amputationLevel"]);

  //  (ج) **ولا يُخترَع تعريفٌ** لمريضٍ بلا موقعِ بتر: المحلّلُ يُرجع فراغاً.
  same("٤٨. **(ج) وملفٌّ بلا موقعِ بترٍ يُقرأ فراغاً — لا «احادي/سفلي/يمين»**",
    parseAmputationSite(legacy.amputationSite), {});
  same("   والباني لا يكتب شيئاً من الفراغ", siteOf({}), "");

  //  (د) الموظّفُ يُكمِل صراحةً ⟶ تُكتب السلسلةُ الصحيحة ويمرّ.
  const chosen = {
    amputationType: "single", singleLimb: "lower", singleSide: "right",
    singleDetail: "تحت الركبة",
  };
  same("٤٩. **(د) والإكمالُ الصريح يكتب السلسلة الصحيحة**",
    siteOf(chosen), "احادي - طرف سفلي - يمين - تحت الركبة");
  same("   ويمرّ حين تكتمل المقاسات معه",
    submit(legacy, form({
      age: "40", height: "170", weight: "70", amputationSite: siteOf(chosen),
    })).ok, true);

  //  (هـ) الثنائيُّ نصفَ مُعرَّفٍ ⟶ يُمنَع.
  const halfDouble = {
    amputationType: "double", doubleLimbType: "lower", doubleRightDetail: "تحت الركبة",
  };
  same("٥٠. **(هـ) والثنائيُّ بجهةٍ واحدة لا يُبنى أصلاً**", siteOf(halfDouble), "");
  const blocked = submit(legacy, form({
    age: "40", height: "170", weight: "70", amputationSite: siteOf(halfDouble),
  }));
  same("   ويُمنَع الإرسالُ به", blocked.ok, false);

  //  (و) **والمحفوظُ الصحيح يُقرأ ويُعاد كما هو** ما لم يُغيَّره أحد.
  const stored = buildAmputationSite({
    amputationType: "double", doubleLimbType: "lower",
    doubleRightDetail: "تحت الركبة", doubleLeftDetail: "فوق الركبة",
  });
  same("٥١. **(و) والمحفوظُ الصحيح يدور كاملاً بلا خسارة**",
    siteOf(parseAmputationSite(stored)), stored);
  //  **وهذا ما كان ينكسر**: المحلّلُ القديم في «تعديل مريض» لا يقرأ تفاصيل
  //  الثنائيّ إطلاقاً، فتضيع المستويات ثم تُكتب فوقها شرطات.
  const parsed = parseAmputationSite(stored);
  same("   **وتفاصيلُ الجهتين محفوظةٌ في القراءة**",
    [parsed.doubleRightDetail, parsed.doubleLeftDetail], ["تحت الركبة", "فوق الركبة"]);
  const completeFile = { age: "40", height: "170", weight: "70",
    isAmputee: true, amputationSite: stored };
  same("   وحفظٌ إداريٌّ عليه يمرّ بلا مساس",
    submit(completeFile, { ...completeFile, phone: "07703333333" }).ok, true);
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
