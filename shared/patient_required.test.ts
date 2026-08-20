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
  checkRequiredPatientData, checkAmputationSite, meaningfulMeasure, legacyIncomplete,
} from "./patient_required";
import { buildAmputationSite } from "./case_fields";

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
{
  const both = buildAmputationSite({
    amputationType: "double", doubleLimbType: "both",
    bothRightLimb: "lower", bothLeftLimb: "lower",
    bothRightDetail: "تحت الركبة", bothLeftDetail: "فوق الركبة",
  });
  check(`١٦. **وثنائيٌّ «علوي وسفلي» بتفصيل الجهتين يُقبل**`,
    checkAmputationSite(both).ok, `«${both}» ⟵ ${JSON.stringify(checkAmputationSite(both))}`);
  const half = buildAmputationSite({
    amputationType: "double", doubleLimbType: "both",
    bothRightLimb: "lower", bothLeftLimb: "lower",
    bothRightDetail: "تحت الركبة",
  });
  same("١٧. **ونصفُ التعريف يُردّ** — جهةٌ بلا تفصيل",
    checkAmputationSite(half).missing, ["amputationLevel"]);
}
{
  const upper = buildAmputationSite({
    amputationType: "double", doubleLimbType: "upper",
    doubleRightDetail: "تحت المرفق", doubleLeftDetail: "تحت المرفق",
  });
  check(`١٨. وثنائيٌّ علويٌّ بتفاصيله يُقبل`, checkAmputationSite(upper).ok,
    `«${upper}» ⟵ ${JSON.stringify(checkAmputationSite(upper))}`);
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

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
