// **عقدُ الشاشة مع الخادم** — إضافةُ الحالة، والتسجيل، وتعديلُ المريض.
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
import { deriveMaintenanceTerms } from "../../../shared/maintenance";

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
const edit = read("../pages/EditPatient.tsx");
const examDlg = read("./medical/NewExamDialog.tsx");
const visit = read("./VisitModal.tsx");

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

// ── ٧. **«تعديل مريض»: إداريٌّ يمرّ، وسريريٌّ يكتمل** ────────────────────
//  A) ملفٌّ قديمٌ بلا عمرٍ ولا طولٍ ولا وزن، والهاتفُ وحده يتغيّر ⟶ يُرسَل.
//  B) العمرُ يتغيّر والباقي فارغ ⟶ يُمنَع قبل الإرسال.
console.log("\n── تعديل مريض ──");
check("٢١. **العمرُ لم يعد إلزامياً في مخطّط النموذج**",
  !edit.includes('age: z.string().min(1'),
  (edit.match(/.*age: z\.string.*/g) ?? []).join("\n"));
check("٢٢. **بل صار الإلزامُ مشروطاً بما تغيّر** — بقاعدة الخادم نفسها",
  edit.includes("isAdministrativeOnlyPatch(values as any, patient as any)")
    && edit.includes("@shared/patient_required"),
  (edit.match(/.*isAdministrativeOnlyPatch.*/g) ?? []).join("\n"));
check("٢٣. **ومَن يلمسها يُطالَب باكتمالها قبل الإرسال**",
  edit.includes("checkRequiredPatientData({") && edit.includes('title: "بيانات ناقصة"'));
//  C) **ولا تُخترَع «احادي/سفلي/يمين»** لمريضٍ بلا موقعِ بتر.
check("٢٤. **ولا حالةَ بترٍ بافتراضاتها في الصفحة**",
  !edit.includes('useState<"single" | "double" | "silicone">("single")')
    && !edit.includes('setSingleLimb') && !edit.includes('setDoubleLimbType'),
  (edit.match(/.*setSingle.*/g) ?? []).join("\n"));
check("٢٥. **وتبدأ فارغةً تماماً**",
  edit.includes("useState<AmputationParts>({})"),
  (edit.match(/.*AmputationParts.*/g) ?? []).join("\n"));
//  D/F) **والمحفوظُ يُقرأ بالمحلّل الرسمي** ثم يُعاد كما هو ما لم يُلمَس.
check("٢٦. **والمحفوظُ يُحمَّل بالمحلّل الرسمي** — لا بمحلّلٍ ثانٍ ناقص",
  edit.includes("setAmp(parseAmputationSite(patient.amputationSite))")
    && !edit.includes('if (site.startsWith("احادي"))'),
  (edit.match(/.*parseAmputationSite.*/g) ?? []).join("\n"));
check("٢٧. **ولا يُكتب شيءٌ ما لم يلمسه أحد** — نصٌّ قديم لا يُمحى بصمت",
  edit.includes("if (conditionType !== \"amputee\" || !ampTouched) return;"),
  (edit.match(/.*ampTouched.*/g) ?? []).join("\n"));
check("٢٨. **وحين يُلمَس تُكتب بالباني المشترك**",
  edit.includes('form.setValue("amputationSite", amputationSiteOf(amp))'));
check("٢٩. **ولا حارسَ `isInitialized` يمنع القديمَ من الإكمال**",
  !edit.includes("isInitialized"),
  (edit.match(/.*isInitialized.*/g) ?? []).join("\n"));
check("٣٠. **والباني المشترك هو المعروض**",
  edit.includes("<AmputationBuilder") && edit.includes('testIdPrefix="edit-amp"'));
check("٣١. **والنصُّ القديم غيرُ المفهوم يبقى معروضاً** — يعرف الموظّف ما يستبدله",
  edit.includes('data-testid="text-legacy-amputation"'));

// ── ٨. **قفلُ سعر المعاينة على جهازه — تقاعد مع إزالة كلّ تسعيرٍ من النافذة** ──
//  كان هذا القسمُ يثبت أن قفلَ تصحيح السعر بعد البيع يُطابِق متابعةَ
//  المعاينة **بعينها** لا أوّلَ متابعةٍ للمريض — كي لا يُقفَل سعرُ جهازٍ
//  ثانٍ بسبب بيع الأوّل. وبعد أن فقد نموذجُ المعاينة كلَّ حقلٍ تجاريّ — لا
//  سعرَ ولا خصمَ ولا خبيرَ ولا تصحيحاً بعد البيع (القسمُ 4.b/4.f في
//  CLAUDE.md، وترحيلُ الاختبار الكامل في `test:exam-commercial`) — سقطت
//  المشكلةُ بسقوط سببها: لا شيءَ يُقفَل على جهازٍ لأن لا شيءَ يُكتَب أصلاً.
console.log("\n── ولا تسعيرَ يُقفَل على جهاز ──");
check("٣٢. **ولا أثرَ لآلة قفل السعر في النافذة**",
  !examDlg.includes("followupRows") && !examDlg.includes("activeFollowup")
    && !examDlg.includes("priceLock") && !examDlg.includes("deviceDiscountRefs"),
  [...examDlg.matchAll(/.*(followupRows|activeFollowup|priceLock|deviceDiscountRefs).*/g)]
    .map((m) => m[0]).join("\n"));
check("٣٣. **ولا حقلَ سعرٍ ولا خبيرٍ ولا قرارَ شراء إطلاقاً**",
  !examDlg.includes("commercialPayload") && !examDlg.includes("priceKind")
    && !examDlg.includes("expertUserId") && !examDlg.includes("MoneyInput"));
check("٣٤. **والحلقةُ تبقى تصل النافذةَ مع المعاينة** — هويّةٌ سريرية لا تجارية",
  examDlg.includes("deviceEpisodeId?: number | null;"));

// ── ٩. **والصفرُ ليس سعرَ صيانةٍ عادياً** ────────────────────────────────
//
// **وقد انتقل الحقلُ لا القاعدة**: نافذةُ الزيارة لم تعد تفتح صيانةً — بابُها
// «ما سبب حضور المريض اليوم؟» ⟶ «صيانة …» ⟶ `NoExamOperationDialog`. فيُفحَص
// الثابتُ حيث يعيش الآن، لا حيث كان.
console.log("\n── أجور الصيانة ──");
const noExamOp = read("./NoExamOperationDialog.tsx");
check("٣٧. **ولا وعدَ بأن الصفر مبلغٌ مقبول**",
  !visit.includes("صفر أو أي مبلغ") && !noExamOp.includes("صفر أو أي مبلغ"),
  (noExamOp.match(/.*صفر.*/g) ?? []).join("\n"));
//  ══ **والقاعدةُ انتقلت إلى الاشتقاق المشترك** (المرحلة الثالثة، #257، §4.j) ══
//  أُزيل مربّعُ «بلا أجور» وحقلُ الأجر الواحد عمداً: الصيانةُ صارت «سعرٌ أصليّ
//  وخصمٌ ⟵ نهائيٌّ يشتقّه الخادم» (`deriveMaintenanceTerms` فوق
//  `deriveOfferFromDiscount`). فالصفرُ يُردّ **في الاشتقاق نفسِه** الذي تقرؤه
//  الشاشةُ ويعتمده الخادم، والمجّانيُّ خصمٌ يساوي الأصليَّ صراحةً، والضمانُ
//  (٠٨٣/٠٩١) علمٌ صريحٌ مستقلّ — لا صفرٌ متروك.
const zeroTerms = deriveMaintenanceTerms({ originalPrice: 0, discountAmount: 0 });
check("٣٨. **بل يُقال إنه يجب أن يكون أكبر من صفر**",
  !zeroTerms.ok && zeroTerms.error === "السعر الأصلي يجب أن يكون أكبر من صفر"
    && noExamOp.includes("deriveOfferFromDiscount"),
  JSON.stringify(zeroTerms));
//  والشاشةُ لا ترسل ما لم يقبله الاشتقاق — `ready` مشروطٌ بـ`offer.ok`، وزرُّ الحفظ بـ`ready`.
check("٣٩. **والشاشةُ تمنع الإرسال بصفر**",
  /const ready = [\s\S]*?Boolean\(offer\.ok\)[\s\S]*?;/.test(noExamOp)
    && noExamOp.includes("disabled={!ready || save.isPending"),
  (noExamOp.match(/.*offer\.ok.*/g) ?? []).join("\n"));
const freeTerms = deriveMaintenanceTerms({ originalPrice: 50_000, discountAmount: 50_000 });
const warrantyTerms = deriveMaintenanceTerms({ originalPrice: null, discountAmount: 0, underWarranty: true });
check("٤٠. **والمجّانيُّ يُختار صراحةً — لا يُترَك صفراً**",
  freeTerms.ok && freeTerms.kind === "free" && freeTerms.finalPrice === 0
    && freeTerms.originalPrice === 50_000
    && warrantyTerms.ok && warrantyTerms.underWarranty === true
    && noExamOp.includes('data-testid="no-exam-op-discount-amount"')
    && noExamOp.includes('data-testid="no-exam-op-warranty"')
    && noExamOp.includes("<b>مجاني</b>"),
  JSON.stringify({ freeTerms, warrantyTerms }));
//  **ونافذةُ الزيارة خلت من الصيانة كلِّها** — فلا بابَ ثانٍ بقاعدةٍ ثانية.
check("٤٠.ب **ولا أثرَ لأجور الصيانة في نافذة الزيارة**",
  !visit.includes("maintCost") && !visit.includes("ServiceDiscountFields"),
  (visit.match(/.*maintCost.*/g) ?? []).join("\n"));
//  والخادمُ يبقى الحارسَ الأخير: البابُ الوحيد يشتقّ بالدالّة نفسِها ويردّ خطأها
//  ٤٠٠، والنقطةُ القديمة تقاعدت (#257) فلا تفتح صيانةً بأيّ مبلغ.
const pcRoutes = read("../../../server/pending_charges/routes.ts");
const mfgRoutes = read("../../../server/manufacturing/routes.ts");
const maintHandler = pcRoutes.slice(pcRoutes.indexOf('app.post("/api/no-exam/maintenance", '));
const oldHandler = mfgRoutes.slice(mfgRoutes.indexOf('app.post("/api/manufacturing/maintenance-visit"'));
check("٤٠.ج **والخادمُ يردّ الصفرَ على باب الصيانة الوحيد — والبابُ القديم متقاعد (٤٠٩)**",
  /const offer = deriveMaintenanceTerms\([\s\S]*?if \(!offer\.ok\) return res\.status\(400\)/.test(maintHandler)
    && oldHandler.slice(0, 700).includes("res.status(409)"),
  maintHandler.slice(0, 80));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
