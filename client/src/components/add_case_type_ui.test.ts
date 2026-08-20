// **عقدُ الشاشة مع الخادم** — «إضافة نوع حالة» وتسجيلُ مريض جديد.
// `npm run test:add-case-ui`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// الخادمُ صار يشترط تعريفَ البتر والمقاساتِ **في طلب إضافة الحالة نفسه**،
// والنافذةُ كانت ترسل النوعَ وحده ثم **تحوّل** إلى صفحة الحقول الكاملة.
// فالنتيجةُ ٤٠٠ قبل أن يرى الموظّفُ حقلاً واحداً — **ميزةٌ صحيحةٌ في الخادم
// معطَّلةٌ تماماً في العمل**.
//
// ══ ولماذا يُقرأ المصدر ═════════════════════════════════════════════════
// لا مُشغِّل DOM في هذا الريبو، واختبارُ الخادم وحده **لا يرى هذا العطب
// إطلاقاً**: النقطةُ تعمل، والنافذةُ لا تناديها بما تحتاج. فيُقرأ الملفّ
// ويُسأل عن العقد نفسه: هل تُرسَل الحقول؟ هل تُجمَع قبل الإرسال؟

import { readFileSync } from "fs";
import { join } from "path";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}

const read = (rel: string) => readFileSync(join(import.meta.dirname, rel), "utf8");
const modal = read("./AddCaseTypeModal.tsx");
const builder = read("./AmputationBuilder.tsx");
const create = read("../pages/CreatePatient.tsx");
const launcher = read("./PatientServiceLauncher.tsx");

console.log("\n═══ عقدُ «إضافة نوع حالة» ═══\n");

// ── ١. **الحمولةُ تحمل ما يشترطه الخادم** ───────────────────────────────
console.log("── الحمولة ──");
check("١. **تعريفُ البتر يُرسَل في الطلب نفسه**",
  modal.includes("body.amputationSite = amputationSiteOf(amp)"),
  (modal.match(/.*amputationSite.*/g) ?? []).join("\n"));
check("٢. **والمقاساتُ الناقصةُ معه** — في الطلب لا بعده",
  modal.includes("for (const f of missingMeasures) body[f]"),
  (modal.match(/.*missingMeasures.*/g) ?? []).join("\n"));
check("٣. **ونداءٌ واحد** — لا حفظٌ ثم إكمال",
  (modal.match(/fetch\(`\/api\/patients\/\$\{patient\.id\}\/add-case-type`/g) ?? []).length === 1,
  String((modal.match(/fetch\(`\/api\/patients/g) ?? []).length));

// ── ٢. **ولا يُرسَل بترٌ لغير الأطراف** ─────────────────────────────────
check("٤. **والحقولُ السريرية للأطراف وحدها**",
  modal.includes("if (isAmputeeCase) {"),
  (modal.match(/.*isAmputeeCase.*/g) ?? []).join("\n"));

// ── ٣. **والزرُّ لا يُفعَّل قبل الإجابة** ────────────────────────────────
console.log("\n── الحارس في الشاشة ──");
check("٥. **الزرُّ مقفلٌ حتى يكتمل التعريف**",
  modal.includes("ampReady") && modal.includes("canSubmit = !!caseType && !isPending && ampReady"),
  (modal.match(/.*canSubmit.*/g) ?? []).join("\n"));
check("٦. **والاكتمالُ يُقاس بالقاعدة المشتركة** — لا بفحصٍ محلّي",
  modal.includes("amputationComplete(amp)") && modal.includes("meaningfulMeasure"),
  (modal.match(/.*ampReady =.*/g) ?? []).join("\n"));
check("٧. **وما هو مكتوبٌ على الملفّ لا يُسأل عنه ثانيةً**",
  modal.includes("CORE_MEASUREMENT_FIELDS.filter"),
  (modal.match(/.*missingMeasures =.*/g) ?? []).join("\n"));
check("٨. **والباني المشترك هو المعروض** — لا نسخةٌ ثالثة من القوائم",
  modal.includes("<AmputationBuilder") && modal.includes("@/components/AmputationBuilder"));

// ── ٤. **والعبارةُ لم تعد تَعِد بإكمالٍ بعد الحفظ** ─────────────────────
console.log("\n── العبارة ──");
check("٩. **لا وعدَ بأن الإلزاميّ يُكمَل بعد الحفظ**",
  !modal.includes("لتكمل كل التفاصيل"),
  (modal.match(/.*لتكمل.*/g) ?? []).join("\n"));
check("١٠. **بل تُقال صراحةً إنها تُحفَظ الآن**",
  modal.includes("تُحفَظ الآن مع فتح الحالة"));
check("١١. **والمقاساتُ تصل النافذةَ من الموزِّع**",
  launcher.includes("age?: string | null"),
  (launcher.match(/.*age\?.*/g) ?? []).join("\n"));

// ── ٥. **الباني: ضوابطُ بلا افتراض** ────────────────────────────────────
console.log("\n── الباني ──");
check("١٢. **ولا سلسلةَ تُبنى قبل أن تكتمل**",
  builder.includes("checkAmputationParts(parts).ok ? buildAmputationSite(parts) : \"\""),
  (builder.match(/.*amputationSiteOf.*/g) ?? []).join("\n"));
for (const [n, id] of [
  ["نوع البتر", "id(\"type\")"], ["الطرف", "id(\"single-limb\")"],
  ["الجهة", "id(\"single-side\")"], ["المستوى", "id(\"single-level\")"],
] as [string, string][]) {
  check(`١٣. ضابطُ ${n} موجود`, builder.includes(id), id);
}
check("١٤. **وكلُّ قائمةٍ لها نائبٌ يقول «اختر»** — لا قيمةَ تُعرَض نيابةً",
  (builder.match(/placeholder="اختر/g) ?? []).length >= 6,
  String((builder.match(/placeholder="اختر/g) ?? []).length));
check("١٥. **والقوائمُ من المصدر المشترك**",
  builder.includes("@shared/case_fields")
    && builder.includes("LOWER_AMPUTATION_DETAILS")
    && builder.includes("UPPER_AMPUTATION_DETAILS"));
//  **وتبديلُ الطرف يُفرِغ المستوى**: «تحت الركبة» على طرفٍ علويّ قيمةٌ
//  لا معنى لها، وإبقاؤها بعد التبديل يكتبها على الملفّ.
check("١٦. **وتبديلُ الطرف يُفرِغ المستوى**",
  builder.includes("singleLimb: v, singleDetail: \"\""));

// ── ٦. **تسجيلُ مريضٍ جديد: بلا افتراضات، وبفحصٍ قبل الإرسال** ───────────
console.log("\n── تسجيل مريض جديد ──");
for (const [n, decl] of [
  ["نوع البتر", 'useState<string>("")'],
] as [string, string][]) {
  check(`١٧. **${n} يبدأ فارغاً**`,
    create.includes(`const [amputationType, setAmputationType] = ${decl}`),
    (create.match(/.*setAmputationType\] =.*/g) ?? []).join("\n"));
}
for (const st of ["singleLimb", "singleSide", "doubleLimbType", "bothRightLimb",
  "bothLeftLimb", "siliconeSide"]) {
  const line = (create.match(new RegExp(`.*set${st[0].toUpperCase()}${st.slice(1)}\\] = useState.*`)) ?? [""])[0];
  check(`   و\`${st}\` كذلك`, line.includes('useState<string>("")'), line.trim());
}
check("١٨. **ولا نسخةَ ثانية من الباني في الصفحة**",
  create.includes("amputationSiteOf(amputationParts)")
    && !create.includes("site = `احادي - ${limbText}"),
  (create.match(/.*amputationSiteOf.*/g) ?? []).join("\n"));
check("١٩. **والفحصُ قبل الإرسال بالقاعدة المشتركة نفسها**",
  create.includes("checkRequiredPatientData({")
    && create.includes("@shared/patient_required"),
  (create.match(/.*checkRequiredPatientData.*/g) ?? []).join("\n"));
check("٢٠. **ولا يُنتظَر ٤٠٠ ليعرف الموظّف ما ينقص**",
  create.includes('title: "بيانات ناقصة"'));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
