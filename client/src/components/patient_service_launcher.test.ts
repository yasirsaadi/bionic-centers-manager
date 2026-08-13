// موزِّع خدمات المريض — منطق التوزيع وعقد الواجهة.
// `npm run test:service-launcher` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **قرار التوزيع** خالصاً: أي خيار ⇒ أي مسار، ومتى يُعطَّل ولماذا،
//     وقاعدةُ الصيانة لمن يحمل جهازين.
// (ب) **عقد الواجهة** قراءةً للمصدر: زرّان لا ثلاثة، ولا زرّ «إضافة نوع
//     حالة» بعد اليوم، والموزِّع **لا ينادي نقطة نهاية واحدة**، ولا نقطة
//     «خدمة عامّة» أُنشئت، والبوّابة لم تتوسّع.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **تصيير React نفسه**: المشروع بلا مشغّل DOM، وإضافته لأجل نافذة واحدة
// تغييرٌ بنيوي أكبر من الميزة. فالضغط الفعلي على البطاقة وفتح النافذة
// **مفحوصان ساكناً لا مُشغَّلين**. وما يقبل الفحص الحيّ (الصيانة ونوع
// الجهاز، و«إضافة نوع حالة» بلا مال) مفحوصٌ على Postgres في
// `npm run test:maintenance-service`.

import { readFileSync } from "fs";
import { join } from "path";
import {
  launcherOptions, ownedDeviceTypes, needsMaintenanceChoice,
  resolveMaintenanceServiceType, FLOW_ENDPOINTS, GROUP_LABELS,
  type LauncherOption,
} from "./patient_service_launcher_logic";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const HERE = import.meta.dirname;
const read = (...p: string[]) => readFileSync(join(HERE, ...p), "utf8");
/**
 * المصدر بلا تعليقات — فحارسٌ يشرح غيابَ شيءٍ لا يُمسك بذكره لغياب.
 *
 * والحذف **مقصورٌ على التعليقات التي تشغل سطورها كاملةً** — وهو أسلوب هذا
 * المشروع كلّه. أما `\/\*[\s\S]*?\*\/` المطلقة فكانت تبتلع ثلثي `routes.ts`:
 * نجمةٌ في نصّ أو تعبير نمطي تفتح «تعليقاً» يمتدّ إلى أوّل `*\/` بعيد،
 * فتختفي شيفرةٌ حقيقية ويمرّ الحارس على فراغ.
 */
function code(src: string): string {
  return src
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const LAUNCHER = read("PatientServiceLauncher.tsx");
const DETAILS = read("..", "pages", "PatientDetails.tsx");
const VISIT = read("VisitModal.tsx");
const NEW_SERVICE = read("NewServiceModal.tsx");
const ADD_CASE = read("AddCaseTypeModal.tsx");
const MFG_ROUTES = read("..", "..", "..", "server", "manufacturing", "routes.ts");
const SERVER_ROUTES = read("..", "..", "..", "server", "routes.ts");

const opt = (list: LauncherOption[], id: string) => list.find((o) => o.id === id)!;

function main() {
  // ══ (أ) صفحة المريض: زرّان لا ثلاثة ═══════════════════════════════════
  console.log("\n── نقطة الدخول في صفحة المريض ──");
  const detailsCode = code(DETAILS);

  same("١. و«إضافة خدمة جديدة» بابٌ واحد لا أكثر",
    (detailsCode.match(/<PatientServiceLauncher/g) ?? []).length, 1);
  check(/import \{ PatientServiceLauncher \}/.test(detailsCode), "ومستورَدٌ في الصفحة");

  // ٢. «إضافة نوع حالة» لم يعد زرّاً — لا مكوّناً ولا استيراداً.
  check(!/AddCaseTypeModal/.test(detailsCode),
    "٢. **ولا أثر لـ«إضافة نوع حالة» في صفحة المريض**");
  check(!/<NewServiceModal/.test(detailsCode),
    "ولا نافذة الخدمة مباشرةً — تُفتح من الموزِّع");

  // ٣. زرّ الزيارة كما كان: بلا `open` فهو غير مُدار، وبزرّه الخاصّ.
  const visitInDetails = detailsCode.match(/<VisitModal[\s\S]*?\/>/);
  check(!!visitInDetails, "٣. و«تسجيل زيارة جديدة» ما زال في مكانه");
  check(!!visitInDetails && !/hideTrigger|initialPurpose/.test(visitInDetails[0]),
    "وبزرّه الخاصّ كما كان — بلا توجيه", visitInDetails?.[0] ?? "");

  // ٢٣. البوّابة نفسها، بلا توسيع.
  check(/permissions\.canAddPatients &&/.test(detailsCode),
    "٢٣. والبوّابة `canAddPatients` كما كانت");
  const perms = [...detailsCode.matchAll(/permissions\.can[A-Za-z]+/g)].map((m) => m[0]);
  check(!perms.includes("permissions.canManageServices"),
    "ولا صلاحية جديدة اخترِعت للموزِّع", perms.join(", "));

  // ══ (ب) الموزِّع موزِّعٌ لا منفِّذ ══════════════════════════════════════
  console.log("\n── الموزِّع لا يحمل منطق عمل ──");
  const launcherCode = code(LAUNCHER);
  for (const forbidden of ["fetch(", "apiRequest(", "useMutation", "/api/"]) {
    check(!launcherCode.includes(forbidden),
      `ولا «${forbidden}» في الموزِّع`, launcherCode.slice(0, 120));
  }
  for (const flow of ["AddCaseTypeModal", "NewServiceModal", "VisitModal"]) {
    check(launcherCode.includes(`<${flow}`), `ويفتح «${flow}» القائمة`);
  }
  check(/initialPurpose="maintenance"/.test(launcherCode),
    "١٢. والصيانة تفتح نافذة الزيارة على غرض الصيانة");

  // ══ خريطة الخيارات ⇒ المسارات ════════════════════════════════════════
  console.log("\n── خريطة الخيار إلى مساره ──");
  const fresh = launcherOptions({});
  same("سبعة خيارات لا غير", fresh.map((o) => o.id), [
    "prosthetic_case", "support_case", "maintenance",
    "physio_case", "additional_therapy", "consultation", "other",
  ]);
  same("وثلاث مجموعات بأسمائها", Object.keys(GROUP_LABELS), ["device", "physio", "other"]);
  same("والمجموعات كما طُلبت", fresh.map((o) => o.group),
    ["device", "device", "device", "physio", "physio", "other", "other"]);
  // **قائمة مغلقة**: ثلاث نقاط قائمة لا رابع، ولا «خدمة عامّة».
  same("٢٠. ولا نقطة رابعة يذهب إليها الموزِّع",
    [...new Set(fresh.map((o) => o.flow.kind))].sort(),
    ["case_type", "maintenance_visit", "new_service"]);
  same("وعناوينها هي القائمة نفسها", Object.values(FLOW_ENDPOINTS), [
    "/api/patients/:id/add-case-type",
    "/api/patients/:id/new-service",
    "/api/manufacturing/maintenance-visit",
  ]);

  // ٤-٦. مريضٌ بلا أي نوع: الثلاثة تذهب إلى `add-case-type` بأنواعها.
  same("٤. أطراف ⇒ add-case-type/amputee", opt(fresh, "prosthetic_case").flow,
    { kind: "case_type", caseType: "amputee" });
  same("٥. مساند ⇒ add-case-type/medical_support", opt(fresh, "support_case").flow,
    { kind: "case_type", caseType: "medical_support" });
  same("٦. علاج طبيعي ⇒ add-case-type/physiotherapy", opt(fresh, "physio_case").flow,
    { kind: "case_type", caseType: "physiotherapy" });
  same("وثلاثتها مُتاحة لمن لا يحملها",
    ["prosthetic_case", "support_case", "physio_case"].map((id) => opt(fresh, id).disabled),
    [false, false, false]);

  // ٨-١٠. الخدمات المالية ⇒ `new-service` بأنواعها الثلاثة القائمة.
  same("٨. جلسات إضافية ⇒ new-service/additional_therapy",
    opt(fresh, "additional_therapy").flow, { kind: "new_service", serviceType: "additional_therapy" });
  same("٩. استشارة ⇒ new-service/consultation",
    opt(fresh, "consultation").flow, { kind: "new_service", serviceType: "consultation" });
  same("١٠. خدمة أخرى ⇒ new-service/other",
    opt(fresh, "other").flow, { kind: "new_service", serviceType: "other" });
  same("والاستشارة والخدمة الأخرى متاحتان دائماً",
    [opt(fresh, "consultation").disabled, opt(fresh, "other").disabled], [false, false]);

  // ١١. الصيانة **لا تمرّ بـ`new-service` إطلاقاً**.
  same("١١. الصيانة ⇒ maintenance-visit لا new-service",
    opt(fresh, "maintenance").flow, { kind: "maintenance_visit" });
  const serviceTypes = fresh.filter((o) => o.flow.kind === "new_service")
    .map((o) => (o.flow as any).serviceType).sort();
  same("وأنواع new-service ثلاثة لا رابع لها",
    serviceTypes, ["additional_therapy", "consultation", "other"]);
  check(!serviceTypes.includes("maintenance") && !serviceTypes.includes("new_prosthetic"),
    "**ولا `maintenance` ولا `new_prosthetic` بينها**", serviceTypes.join(", "));

  // ══ ٧. الحالة القائمة لا تُنشأ ثانيةً ═════════════════════════════════
  console.log("\n── الحالة القائمة ──");
  const hasAll = launcherOptions({ isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true });
  same("٧. ثلاثتها معطَّلة لمن يحملها",
    ["prosthetic_case", "support_case", "physio_case"].map((id) => opt(hasAll, id).disabled),
    [true, true, true]);
  for (const id of ["prosthetic_case", "support_case", "physio_case"]) {
    check(!!opt(hasAll, id).disabledReason?.includes("الخدمة موجودة على ملف المريض"),
      `و«${opt(hasAll, id).label}» تقول سببها`, String(opt(hasAll, id).disabledReason));
  }
  for (const id of ["prosthetic_case", "support_case"]) {
    check(!!opt(hasAll, id).disabledReason?.includes("مسار جهاز جديد"),
      "والجهاز الجديد يُحال إلى مساره القادم لا إلى هذا الباب");
  }
  // ولا واحدٌ من المعطَّلات يحمل مساراً يُنفَّذ سهواً.
  same("والمعطَّل لا يُفتَح", hasAll.filter((o) => o.disabled && !o.disabledReason).length, 0);

  // ٨.ب الجلسات الإضافية تحتاج علاجاً قائماً — والعكس بالعكس.
  same("٨.ب الجلسات الإضافية متاحة لصاحب العلاج", opt(hasAll, "additional_therapy").disabled, false);
  same("ومعطَّلة لمن لا علاج له", opt(fresh, "additional_therapy").disabled, true);
  check(!!opt(fresh, "additional_therapy").disabledReason?.includes("تُفتَح حالة علاج طبيعي"),
    "برسالةٍ تدلّ على الخطوة الأولى");
  check(!!opt(hasAll, "physio_case").disabledReason?.includes("جلسات إضافية"),
    "وصاحبُ العلاج يُحال إلى الجلسات لا إلى حالةٍ ثانية");

  // ══ ١٣-١٧. الصيانة: أيّ جهاز؟ ════════════════════════════════════════
  console.log("\n── الصيانة ونوع الجهاز ──");
  const PRO = { isAmputee: true }, SUP = { isMedicalSupport: true };
  const DUAL = { isAmputee: true, isMedicalSupport: true }, NONE = { isPhysiotherapy: true };

  same("١٣. طرفٌ فقط ⇒ prosthetic بلا سؤال", resolveMaintenanceServiceType(PRO), "prosthetic");
  same("ولا يُسأل", needsMaintenanceChoice(PRO), false);
  same("١٤. مسندٌ فقط ⇒ medical_support بلا سؤال", resolveMaintenanceServiceType(SUP), "medical_support");
  same("ولا يُسأل", needsMaintenanceChoice(SUP), false);
  same("١٥. والاثنان ⇒ يُطلَب التحديد", needsMaintenanceChoice(DUAL), true);
  same("ولا يُخمَّن بلا تحديد", resolveMaintenanceServiceType(DUAL), null);
  same("١٦. واختيار الطرف ⇒ prosthetic", resolveMaintenanceServiceType(DUAL, "prosthetic"), "prosthetic");
  same("١٧. واختيار المسند ⇒ medical_support", resolveMaintenanceServiceType(DUAL, "medical_support"), "medical_support");
  same("١٨. ونوعٌ لا يملكه ⇒ لا يُرسَل", resolveMaintenanceServiceType(PRO, "medical_support"), null);
  same("وقيمةٌ مخترَعة ⇒ لا تُرسَل", resolveMaintenanceServiceType(DUAL, "orthosis"), null);
  same("وبلا جهاز ⇒ لا صيانة", resolveMaintenanceServiceType(NONE), null);
  same("والصيانة معطَّلة لمن لا جهاز له", opt(launcherOptions(NONE), "maintenance").disabled, true);
  same("ومتاحة لصاحب الجهاز", opt(launcherOptions(PRO), "maintenance").disabled, false);
  same("وما يملكه يُقرأ بترتيبٍ ثابت", ownedDeviceTypes(DUAL), ["prosthetic", "medical_support"]);

  // والنافذة تسأل فعلاً وترسل النوع — لا تكتفي بالمنطق.
  const visitCode = code(VISIT);
  check(/needsMaintenanceChoice\(/.test(visitCode), "ونافذة الزيارة تسأل حين يلزم");
  check(/serviceType: svc/.test(visitCode), "وترسل النوع إلى نقطة الصيانة");
  check(/resolveMaintenanceServiceType\(/.test(visitCode), "بالقاعدة نفسها لا بقاعدةٍ ثانية");

  // ══ الخادم: المرآة والحدود ═══════════════════════════════════════════
  console.log("\n── الخادم ──");
  const mfg = MFG_ROUTES;
  // الاشتقاق الصامت يُبحَث عنه **داخل معالج الصيانة وحده**: نقطتا الإنشاء
  // والتخصيص تستعملان التعبير نفسه مشروعاً (بعد قبول نوعٍ صريح أوّلاً)،
  // ولم يُطلَب مسّهما — فمسحٌ على الملفّ كلّه كان سيقيس غير ما وُضع له.
  // والتجريد لأن تعليق الإصلاح نفسه يقتبس السطر القديم ليشرحه.
  const maintHandler = code(MFG_ROUTES).slice(
    MFG_ROUTES.indexOf('app.post("/api/manufacturing/maintenance-visit"') > -1
      ? code(MFG_ROUTES).indexOf('app.post("/api/manufacturing/maintenance-visit"') : 0,
  ).split(/\n  app\.(?:post|patch|get|put|delete)\(/)[0];
  check(maintHandler.length > 500, "ومعالج الصيانة اقتُطع فعلاً", String(maintHandler.length));
  check(!/isAmputee \? "prosthetic" : patient\.isMedicalSupport \? "medical_support"/.test(maintHandler),
    "**والاشتقاق الصامت اختفى من معالج الصيانة**");
  check(/isAmputee \? "prosthetic" : patient\.isMedicalSupport \? "medical_support"/.test(code(MFG_ROUTES)),
    "وبقي حيث كان مشروعاً — نقطتا الإنشاء والتخصيص لم تُمَسّا");
  check(/owned\.includes\(requestedService as any\)/.test(mfg),
    "١٨.ب والخادم يتحقّق أن المريض يملك النوع فعلاً");
  check(/حدّد نوع الجهاز/.test(MFG_ROUTES), "ويردّ طالباً التحديد لصاحب الاثنين");

  // ٢٠. ولا نقطة خدمات عامّة أُنشئت، والثلاث القائمة كما هي.
  const srv = SERVER_ROUTES;
  for (const ep of ["/api/patients/:id/add-case-type", "/api/patients/:id/new-service"]) {
    check(srv.includes(`"${ep}"`), `٢٠. و«${ep}» باقية كما هي`);
  }
  check(mfg.includes('"/api/manufacturing/maintenance-visit"'), "و«maintenance-visit» باقية كما هي");
  const generic = [...srv.matchAll(/app\.(post|put|patch)\("([^"]*service[^"]*)"/g)].map((m) => m[2]);
  same("٢٠.ب ولا نقطة خدمات عامّة جديدة", generic, ["/api/patients/:id/new-service"]);

  // ٢١. محاسبة الخدمة لم تُمَسّ: الأنواع الثلاثة والرفض القائم كما هما.
  check(/additional_therapy: "جلسات علاج إضافية"/.test(srv), "٢١. وأنواع الخدمة الثلاثة كما هي");
  check(/new_prosthetic: "الطرف الجديد يمرّ عبر معاينة الطبيب/.test(SERVER_ROUTES),
    "**والخادم ما زال يرفض `new_prosthetic` في new-service**");
  check(/maintenance: "الصيانة تُسجَّل من/.test(SERVER_ROUTES),
    "ويرفض `maintenance` فيها كذلك — والموزِّع لا يحاول");

  // ٢٢. وworkflow التصنيع لم يُمَسّ: الإصلاح في اختيار النوع لا في الأمر.
  for (const untouched of ["createMaintenanceOrderWithVisit", "purpose: \"maintenance\"", "ActiveOrderError"]) {
    check(read("..", "..", "..", "server", "manufacturing", "store.ts").includes(untouched),
      `٢٢. و«${untouched}» في مسار التصنيع كما هو`);
  }

  // ══ النوافذ الثلاث: الوضعان معاً، والمنطق واحد ═══════════════════════
  console.log("\n── النوافذ تُدار من الخارج بلا ازدواج منطق ──");
  for (const [name, src] of [
    ["VisitModal", visitCode], ["NewServiceModal", code(NEW_SERVICE)], ["AddCaseTypeModal", code(ADD_CASE)],
  ] as [string, string][]) {
    check(/const controlled = openProp !== undefined;/.test(src),
      `و«${name}» تقبل الإدارة من الخارج`);
    check(/\{!hideTrigger && \(/.test(src), `وتُخفي زرّها عند التوجيه — «${name}»`);
    check(/if \(!controlled\) setOpenSelf\(v\); onOpenChange\?\.\(v\);/.test(src),
      `وتبقى عاملةً بزرّها بلا إدارة — «${name}»`);
  }
  // نداءٌ واحد لكل نافذة: التوجيه غيّر **مَن يفتح** لا **ماذا يجري**.
  // العدّ على **عنوان النداء** لا على ذكر الاسم: `data-testid` ونصوصٌ أخرى
  // تحمل الاسم نفسه، وعدّها كان سيقيس شيئاً غير الذي وُضع له.
  same("ونافذة نوع الحالة تنادي مسارها مرّةً واحدة",
    (ADD_CASE.match(/\/api\/patients\/\$\{[^}]+\}\/add-case-type/g) ?? []).length, 1);
  same("ونافذة الخدمة كذلك",
    (NEW_SERVICE.match(/\/api\/patients\/\$\{[^}]+\}\/new-service/g) ?? []).length, 1);
  same("ونافذة الزيارة تنادي الصيانة مرّةً واحدة",
    (VISIT.match(/"\/api\/manufacturing\/maintenance-visit"/g) ?? []).length, 1);
  check(/serviceCost: 0, paidNow: 0/.test(code(ADD_CASE)),
    "١٩. و«إضافة نوع حالة» ما زالت ترسل صفراً — قرارٌ بلا مال");

  console.log(failures === 0 ? "\n✅ all service-launcher cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
