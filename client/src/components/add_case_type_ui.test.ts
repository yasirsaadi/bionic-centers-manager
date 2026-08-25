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

// ── ٨. **قفلُ سعر المعاينة على جهازه هو** ───────────────────────────────
//  المريضُ العائد يملك أكثر من طرف. وأخذُ `followupRows[0]` كان يقفل سعرَ
//  الجهاز الثاني لأن الأول بِيع — قفلٌ لا علاقةَ له بما يُحرَّر.
console.log("\n── قفل سعر المعاينة ──");
check("٣٢. **ولا تُؤخَذ أولُ متابعةٍ للمريض**",
  !examDlg.includes("(followupRows ?? [])[0]"),
  (examDlg.match(/.*followupRows.*/g) ?? []).join("\n"));
check("٣٣. **بل متابعةُ المعاينة المحرَّرة نفسِها**",
  examDlg.includes("Number(f?.medicalExamId) === Number(exam.id)")
    && examDlg.includes("Number(f?.deviceEpisodeId) === Number(exam.deviceEpisodeId)"),
  (examDlg.match(/.*medicalExamId.*/g) ?? []).join("\n"));
check("٣٤. **والطلبُ المعلَّق بمرجع هذا الجهاز** — لا بأيّ طلبٍ للمريض",
  examDlg.includes("deviceRefs.includes(String(r?.contextRef))")
    && !examDlg.includes('.some((r: any) => r?.status === "pending")'),
  (examDlg.match(/.*discountPending =.*/g) ?? []).join("\n"));
check("٣٥. **والمراجعُ من المصدر المشترك** — لا هويّةٌ تُخترَع",
  examDlg.includes("deviceDiscountRefs({") && examDlg.includes("@shared/discount"));
check("٣٦. **والحلقةُ تصل النافذةَ مع المعاينة**",
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
check("٣٨. **بل يُقال إنه يجب أن يكون أكبر من صفر**",
  noExamOp.includes("المبلغ يجب أن يكون أكبر من صفر"));
check("٣٩. **والشاشةُ تمنع الإرسال بصفر**",
  noExamOp.includes("(!charged || amount > 0)"),
  (noExamOp.match(/.*amount > 0.*/g) ?? []).join("\n"));
check("٤٠. **والمجّانيُّ يُختار صراحةً — لا يُترَك صفراً**",
  noExamOp.includes('data-testid="no-exam-op-no-charge"')
  && noExamOp.includes("بلا أجور"));
//  **ونافذةُ الزيارة خلت من الصيانة كلِّها** — فلا بابَ ثانٍ بقاعدةٍ ثانية.
check("٤٠.ب **ولا أثرَ لأجور الصيانة في نافذة الزيارة**",
  !visit.includes("maintCost") && !visit.includes("ServiceDiscountFields"),
  (visit.match(/.*maintCost.*/g) ?? []).join("\n"));
//  والخادمُ يبقى الحارسَ الأخير على البابين معاً.
const mfgRoutes = read("../../../server/manufacturing/routes.ts");
check("٤٠.ج **والخادمُ يردّ الصفرَ على نقطة الصيانة القائمة كما كان**",
  /cost <= 0/.test(mfgRoutes));

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
