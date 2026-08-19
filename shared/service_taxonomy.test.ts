// الأقسامُ السريرية الثلاثة — **منطقٌ خالص**، بلا قاعدةٍ ولا شبكة.
// `npm run test:taxonomy`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **ثلاثةٌ لا رابع** — لا في القائمة ولا في التسميات ولا في التجميعات.
// (٢) وكلُّ ما ليس طرفاً ولا مسنداً فهو علاجٌ طبيعي بنوعٍ فرعيّ تحته.
// (٣) و«الأجهزة» **تجميعُ تقريرٍ لا قسم**: تُشتقّ جمعاً ولا تُخزَّن.
// (٤) ولا استنتاجَ من نصٍّ حرّ ولا من أعلام المريض — علاقةٌ مهيكلة أو `null`.
// (٥) و«غير محدَّد» ليست تصنيفاً ثالثاً للمريض.

import {
  DEPARTMENTS, DEPARTMENT_LABELS, DEVICE_DEPARTMENTS, isDepartment,
  isDeviceDepartment, departmentOf, departmentsOfPatient, hasNoDepartment,
  rollups, physioSubtypes, NEW_SERVICE_DEPARTMENT, PHYSIO_SUBTYPE_EXTRAS,
  PATIENT_CLASSIFICATIONS, isPatientClassification, REPORT_ROW_ORDER,
  type DepartmentBreakdown,
} from "./service_taxonomy";
import { PHYSIO_TREATMENT_TYPES } from "./pricing";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

// ══ أ. ثلاثةٌ لا رابع ═══════════════════════════════════════════════════
console.log("\n── الأقسام الثلاثة ──");
same("أ. **ثلاثةُ أقسامٍ لا غير**", DEPARTMENTS,
  ["prosthetic", "medical_support", "physiotherapy"]);
same("   وثلاثُ تسمياتٍ عربية", Object.keys(DEPARTMENT_LABELS), [...DEPARTMENTS]);
same("   بأسمائها المطلوبة",
  [DEPARTMENT_LABELS.prosthetic, DEPARTMENT_LABELS.medical_support,
    DEPARTMENT_LABELS.physiotherapy],
  ["الأطراف الصناعية", "المساند الطبية", "العلاج الطبيعي"]);
same("ب. الطرفُ يبقى طرفاً", isDepartment("prosthetic"), true);
same("   والمسندُ يبقى مسنداً", isDepartment("medical_support"), true);
same("   والعلاجُ الطبيعي كذلك", isDepartment("physiotherapy"), true);
//  **الحارسُ الحاسم**: لا اسمَ رابعاً يُقبل قسماً — ولا «الأجهزة» نفسُها.
for (const fourth of ["devices", "other", "خدمات أخرى", "consultation", "devicesCombined"]) {
  same(`   **و«${fourth}» ليست قسماً**`, isDepartment(fourth), false);
}

// ══ ب. «الأجهزة» تجميعٌ لا قسم ══════════════════════════════════════════
console.log("\n── الأجهزة: تجميعٌ لا قسم ──");
same("ج. قسما الأجهزة اثنان", DEVICE_DEPARTMENTS, ["prosthetic", "medical_support"]);
same("   وكلاهما قسمٌ رسمي قائمٌ بذاته",
  DEVICE_DEPARTMENTS.every(isDepartment), true);
same("   والعلاجُ الطبيعي ليس منهما", isDeviceDepartment("physiotherapy"), false);
//  ولا يظهر «devices» بين الأقسام في أي ترتيبِ عرض — إنما بين التجميعات.
same("   وترتيبُ العرض يفصل القسمَ عن التجميع", [...REPORT_ROW_ORDER],
  ["prosthetic", "medical_support", "legacyDevicesUnsplit", "devicesCombined",
    "physiotherapy", "classifiedTotal", "unclassified", "grandTotal"]);
//  والقديمُ غيرُ المقسَّم **قبل** المجموع مباشرة: فيرى القارئ لماذا يزيد
//  المجموعُ على الصفّين فوقه ولا يظنّ الحسابَ مكسوراً.
check(REPORT_ROW_ORDER.indexOf("legacyDevicesUnsplit") < REPORT_ROW_ORDER.indexOf("devicesCombined"),
  "   والقديمُ غيرُ المقسَّم يسبق مجموعَ الأجهزة", REPORT_ROW_ORDER.join(" · "));
same("   **وهو ليس قسماً رابعاً**", isDepartment("legacyDevicesUnsplit"), false);

// ══ ج. الأنواعُ الفرعية للعلاج الطبيعي ══════════════════════════════════
console.log("\n── أنواعُ العلاج الطبيعي الفرعية ──");
const subs = physioSubtypes(PHYSIO_TREATMENT_TYPES);
for (const [label, name] of [
  ["الروبوت", "روبوت"],
  ["التمارين التأهيلية", "تمارين تأهيلية"],
  ["أجهزة العلاج الطبيعي", "أجهزة علاج طبيعي"],
  ["الأبر الصينية", "أبر صينية"],
  ["الاستشارة الطبية", "استشارة طبية"],
] as [string, string][]) {
  check(subs.includes(name), `د. ${label} نوعٌ فرعيٌّ للعلاج الطبيعي`, subs.join(" · "));
  //  وليست قسماً — وهذا هو الفرق كلُّه.
  same(`   و«${name}» ليست قسماً`, isDepartment(name), false);
}
same("هـ. والقيمُ العربية المخزَّنة كما هي — بلا ترحيلِ مفردات",
  PHYSIO_TREATMENT_TYPES.filter((t) => !subs.includes(t)), []);
check(PHYSIO_SUBTYPE_EXTRAS.every((e) => subs.includes(e)),
  "   وما نُقل من «خدمات أخرى» صار نوعاً فرعياً", PHYSIO_SUBTYPE_EXTRAS.join(" · "));
//  إضافةُ نوعٍ جديدٍ لا تُنشئ قسماً رابعاً — الشاهدُ أن العدد ثابت.
same("و. **ونوعٌ فرعيٌّ جديد لا يُنشئ قسماً رابعاً**",
  physioSubtypes([...PHYSIO_TREATMENT_TYPES, "علاجٌ مائي"]).includes("علاجٌ مائي")
    && DEPARTMENTS.length === 3, true);

// ══ د. «خدمة جديدة» كلُّها علاجٌ طبيعي ══════════════════════════════════
console.log("\n── خدمةٌ جديدة ⟶ علاجٌ طبيعي ──");
same("ز. جلساتٌ إضافية ⟶ علاجٌ طبيعي",
  NEW_SERVICE_DEPARTMENT.additional_therapy, "physiotherapy");
same("   **والاستشارةُ ⟶ علاجٌ طبيعي** — كانت بلا قسم",
  NEW_SERVICE_DEPARTMENT.consultation, "physiotherapy");
same("   **و«خدمة أخرى» ⟶ علاجٌ طبيعي** مالياً وتنظيمياً",
  NEW_SERVICE_DEPARTMENT.other, "physiotherapy");
same("   ولا نوعَ خدمةٍ يقع خارج الأقسام الثلاثة",
  Object.values(NEW_SERVICE_DEPARTMENT).filter((d) => !isDepartment(d)), []);

// ══ هـ. الاشتقاقُ من علاقةٍ مهيكلة وحدها ═══════════════════════════════
console.log("\n── الاشتقاق ──");
same("ح. نوعُ الحالة يحسم", departmentOf({ caseType: "medical_support" }), "medical_support");
same("   ونوعُ خدمةِ الحلقة يحسم", departmentOf({ serviceType: "prosthetic" }), "prosthetic");
same("   ونوعُ الخدمة الجديدة يحسم",
  departmentOf({ newServiceType: "consultation" }), "physiotherapy");
same("   والحالةُ أوثقُ من غيرها عند التعارض",
  departmentOf({ caseType: "physiotherapy", serviceType: "prosthetic" }), "physiotherapy");
//  **ولا تخمينَ من نصٍّ حرّ**: وصفٌ يذكر «أطراف صناعية» لا يصنّف شيئاً.
same("ط. **ولا تصنيفَ من نصٍّ حرّ**",
  departmentOf({ caseType: "دفعة أطراف صناعية" as any }), null);
same("   ولا من قيمةٍ مخترَعة", departmentOf({ serviceType: "orthosis" }), null);
same("   وبلا علاقةٍ ⟶ `null` صراحةً لا افتراضاً", departmentOf({}), null);

// ══ و. التجميعان يُحسبان ولا يُخزَّنان ══════════════════════════════════
console.log("\n── التجميعات ──");
const b: DepartmentBreakdown = {
  prosthetic: { revenue: 1_000_000, paid: 400_000 },
  medical_support: { revenue: 250_000, paid: 100_000 },
  physiotherapy: { revenue: 300_000, paid: 275_000 },
  unclassified: { revenue: 50_000, paid: 25_000 },
};
const r = rollups(b);
same("ي. **الأطراف+المساند = مجموعُ القسمين بالضبط**",
  r.devicesCombined, { revenue: 1_250_000, paid: 500_000 });
same("   والأطرافُ منفصلةٌ عن المساند في المصدر",
  [b.prosthetic.revenue, b.medical_support.revenue], [1_000_000, 250_000]);
same("ك. **والإجماليُّ العام = الثلاثة + غير المبوَّب**",
  r.grandTotal, { revenue: 1_600_000, paid: 800_000 });
//  المصالحةُ إلى الدينار — وهي شرطُ صحّةِ التقسيم كلِّه.
same("   ويصالِح المجموعَ إلى الدينار",
  [r.grandTotal.revenue
     - (b.prosthetic.revenue + b.medical_support.revenue + b.physiotherapy.revenue
        + b.unclassified.revenue),
    r.grandTotal.paid
     - (b.prosthetic.paid + b.medical_support.paid + b.physiotherapy.paid
        + b.unclassified.paid)],
  [0, 0]);
same("ل. **وغيرُ المبوَّب خارج تجميع الأجهزة** — تجميعُ ما نعرفه أجهزةً",
  r.devicesCombined.revenue, b.prosthetic.revenue + b.medical_support.revenue);
//  و«المقبوض» و«المبيعات» رقمان مستقلّان لا يُشتقّ أحدهما من الآخر.
check(r.grandTotal.paid !== r.grandTotal.revenue,
  "م. **والمقبوضُ يُصالِح مستقلاً عن المبيعات**",
  `${r.grandTotal.paid} vs ${r.grandTotal.revenue}`);
//  وغيرُ المبوَّب يبقى ظاهراً — لا يُدسّ في العلاج الطبيعي.
same("ن. **وغيرُ المبوَّب يبقى ظاهراً بذاته**",
  [b.unclassified.revenue, b.unclassified.paid], [50_000, 25_000]);
same("س. و«مجموعُ المعروف» = الأقسامُ الثلاثة وحدها",
  r.classifiedTotal, { revenue: 1_550_000, paid: 775_000 });
check(r.classifiedTotal.paid < r.grandTotal.paid,
  "   **وهو أصغرُ من الإجمالي بمقدار ما لم يُحسَم** — والفرقُ قياسُ المشكلة",
  `${r.classifiedTotal.paid} < ${r.grandTotal.paid}`);

// ══ و.٢ الأجهزةُ القديمة غيرُ المقسَّمة ═════════════════════════════════
//  مالُ أجهزةٍ **مؤكَّد** لم يُثبَت أطرافاً هو أم مساند. الحارسُ الحاسم أنه
//  يدخل مجموعَ الأجهزة والإجماليَّ العام، **ولا يدخل قسماً بعينه ولا
//  «مجموعَ المعروف»** — فلا يُقسَّم بالتخمين ولا يُنقِص المالَ الحقيقي.
console.log("\n── الأجهزة القديمة غير المقسَّمة ──");
const bLegacy: DepartmentBreakdown = { ...b, legacyDevicesUnsplit: { revenue: 700_000 } };
const rl = rollups(bLegacy);
same("ع. **يدخل مجموعَ الأجهزة** — فقيمةُ «الأجهزة» لا تتراجع",
  rl.devicesCombined.revenue, r.devicesCombined.revenue + 700_000);
same("   **ولا يُنسَب لأحد القسمين**",
  [bLegacy.prosthetic.revenue, bLegacy.medical_support.revenue],
  [b.prosthetic.revenue, b.medical_support.revenue]);
same("   **ولا يُدسّ في العلاج الطبيعي**",
  bLegacy.physiotherapy.revenue, b.physiotherapy.revenue);
same("   **ولا يدخل «مجموعَ المعروف»** — لأن قسمَه غيرُ معروف",
  rl.classifiedTotal, r.classifiedTotal);
same("ف. **ويدخل الإجماليَّ العام** — المالُ الحقيقي لا يُنقَص بمشكلة تبويب",
  rl.grandTotal.revenue, r.grandTotal.revenue + 700_000);
same("   ولا مقبوضَ له: لا نظيرَ له في الدفعات فلا يُدَّعى قياسٌ لم يقع",
  rl.grandTotal.paid, r.grandTotal.paid);
//  والمصالحةُ الكاملة إلى الدينار مع وجوده.
same("ص. **والمصالحةُ تامّةٌ إلى الدينار مع وجوده**",
  rl.grandTotal.revenue
    - (bLegacy.prosthetic.revenue + bLegacy.medical_support.revenue
       + bLegacy.physiotherapy.revenue + 700_000 + bLegacy.unclassified.revenue), 0);

// ══ ز. أقسامُ المريض بالدليل ═══════════════════════════════════════════
console.log("\n── انتماءُ المريض ──");
same("س. مريضُ أطرافٍ يُحتسب في قسمه",
  departmentsOfPatient({ isAmputee: true }), ["prosthetic"]);
same("   **ومريضٌ بقسمين يُحتسب في كليهما**",
  departmentsOfPatient({ isMedicalSupport: true, isPhysiotherapy: true }),
  ["medical_support", "physiotherapy"]);
same("   وبثلاثة يُحتسب في الثلاثة",
  departmentsOfPatient({ isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true }),
  ["prosthetic", "medical_support", "physiotherapy"]);
same("   والحالاتُ الفعلية دليلٌ كالعلَم",
  departmentsOfPatient({ caseTypes: ["physiotherapy", "prosthetic"] }),
  ["prosthetic", "physiotherapy"]);
//  ══ الحارسُ الأهمّ: لا سقوطَ ضمنيّ إلى العلاج الطبيعي ══════════════════
same("ع. **ومريضٌ بلا أعلامٍ ولا حالات لا يُحتسب علاجاً طبيعياً**",
  departmentsOfPatient({}), []);
same("   ولا حين تكون أعلامُه كلُّها false",
  departmentsOfPatient({ isAmputee: false, isMedicalSupport: false, isPhysiotherapy: false }),
  []);
same("   ويظهر عدَدُه مشكلةَ جودةِ بيانات", hasNoDepartment({}), true);
same("   ومَن له قسمٌ ليس منهم", hasNoDepartment({ isAmputee: true }), false);

// ══ ح. تصنيفُ المريض: اثنان لا ثلاثة ═══════════════════════════════════
console.log("\n── تصنيف المريض ──");
same("ف. **جديدٌ وقديم لا ثالثَ لهما**", PATIENT_CLASSIFICATIONS, ["new", "past"]);
same("   والجديدُ يُقبل", isPatientClassification("new"), true);
same("   والقديمُ يُقبل", isPatientClassification("past"), true);
same("   **و«غير محدَّد» ليست قيمةً تُكتب**", isPatientClassification("unspecified"), false);
same("   ولا الفراغُ ولا `null`",
  [isPatientClassification(""), isPatientClassification(null)], [false, false]);
//  وهو بُعدٌ مستقلٌّ عن القسم تماماً — لا يشتقّ أحدهما من الآخر.
same("ص. **والتصنيفُ بُعدٌ آخر لا قسمٌ رابع**",
  PATIENT_CLASSIFICATIONS.some((c) => isDepartment(c)), false);

console.log(failures === 0 ? "\n✅ all taxonomy cases pass" : `\n❌ ${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
