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
  nextSubmissionToken, mintSubmissionToken,
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
  const newServiceCode = code(NEW_SERVICE);
  // **لا يكتب** — وهذا هو الثابت. صار يقرأ حلقات المريض ليعطّل «جهاز
  // جديد» بسببٍ مفهوم بدل زرٍّ يفتح نافذةً لتنتهي برسالة خطأ؛ وقراءةٌ
  // للعرض شيءٌ وتنفيذُ الخدمة شيءٌ آخر. فالممنوع هو الكتابة: لا طفرة،
  // ولا `apiRequest`، ولا `fetch` يدوي.
  for (const forbidden of ["fetch(", "apiRequest(", "useMutation"]) {
    check(!launcherCode.includes(forbidden),
      `ولا «${forbidden}» في الموزِّع`, launcherCode.slice(0, 120));
  }
  const launcherEndpoints = [...launcherCode.matchAll(/["'`](\/api\/[^"'`]*)/g)].map((m) => m[1]);
  same("ولا نقطةَ إلا قراءةَ حلقاتِ المريض",
    launcherEndpoints, ["/api/patients/${patient.id}/device-episodes"]);
  for (const flow of ["AddCaseTypeModal", "NewServiceModal", "VisitModal", "NewDeviceEpisodeModal"]) {
    check(launcherCode.includes(`<${flow}`), `ويفتح «${flow}» القائمة`);
  }
  check(/initialPurpose="maintenance"/.test(launcherCode),
    "١٢. والصيانة تفتح نافذة الزيارة على غرض الصيانة");

  // ══ خريطة الخيارات ⇒ المسارات ════════════════════════════════════════
  console.log("\n── خريطة الخيار إلى مساره ──");
  const fresh = launcherOptions({});
  //  عشرةٌ ثمّ اثنتا عشرة: الصيانةُ صارت بنداً لكلّ قسمِ جهاز، وترحيلُ ٠٦٧
  //  أضاف بابَ «بلا معاينة» لكلّ قسمٍ كذلك — بيعٌ أو صيانةٌ يُنجزها
  //  الاستقبال ويبقى مبلغُها خارج المحاسبة حتى يعتمده طبيبٌ مخوَّل.
  same("اثنا عشر خياراً لا غير", fresh.map((o) => o.id), [
    "prosthetic_case", "support_case",
    "new_prosthetic_device", "new_support_device",
    "maintenance_prosthetic", "maintenance_support",
    "no_exam_prosthetic", "no_exam_support",
    "physio_case", "additional_therapy", "consultation", "other",
  ]);
  // ══ ثلاثةُ أقسامٍ لا رابع ═════════════════════════════════════════════
  //  «خدمات أخرى» زالت: الاستشارةُ والخدمةُ الأخرى والجلساتُ الإضافية
  //  كلُّها علاجٌ طبيعي تنظيمياً ومالياً، فلا مجموعةَ تعيش خارج التصنيف.
  same("وثلاثةُ أقسامٍ بأسمائها الرسمية", Object.keys(GROUP_LABELS),
    ["prosthetic", "medical_support", "physiotherapy"]);
  same("**ولا مجموعةَ رابعة إطلاقاً**",
    [...new Set(fresh.map((o) => o.group))].sort(),
    ["medical_support", "physiotherapy", "prosthetic"]);
  same("والمجموعات كما طُلبت", fresh.map((o) => o.group), [
    "prosthetic", "medical_support",
    "prosthetic", "medical_support",
    "prosthetic", "medical_support",
    "prosthetic", "medical_support",
    "physiotherapy", "physiotherapy", "physiotherapy", "physiotherapy",
  ]);
  //  وكلُّ خدمةٍ غيرِ جهازٍ تقع تحت العلاج الطبيعي — لا واحدةَ خارجه.
  same("**وكلُّ ما ليس جهازاً فهو علاجٌ طبيعي**",
    fresh.filter((o) => o.flow.kind === "new_service").map((o) => o.group),
    ["physiotherapy", "physiotherapy", "physiotherapy"]);
  // **قائمة مغلقة**: خمس نقاط قائمة لا سادس، ولا «خدمة عامّة».
  //  والخامسةُ بابُ «بلا معاينة» (٠٦٧) — نقطةٌ قائمةٌ بحدودها وحُرّاسها
  //  كبقيّتها، لا نقطةٌ عامّة تجمع أربع قواعد مختلفة.
  same("٢٠. ولا نقطة سادسة يذهب إليها الموزِّع",
    [...new Set(fresh.map((o) => o.flow.kind))].sort(),
    ["case_type", "device_episode", "maintenance_visit", "new_service",
      "no_exam_operation"]);
  same("وعناوينها هي القائمة نفسها", Object.values(FLOW_ENDPOINTS), [
    "/api/patients/:id/add-case-type",
    "/api/patients/:id/new-service",
    "/api/manufacturing/maintenance-visit",
    "/api/patients/:patientId/device-episodes",
    "/api/no-exam/device-sale",
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
  //  وبندُ كلّ قسمٍ يحمل نوعَ جهازه معه، فتُفتح النافذة مضبوطةً لا مخمَّنة.
  same("١١. الصيانة ⇒ maintenance-visit لا new-service",
    [opt(fresh, "maintenance_prosthetic").flow, opt(fresh, "maintenance_support").flow],
    [{ kind: "maintenance_visit", serviceType: "prosthetic" },
      { kind: "maintenance_visit", serviceType: "medical_support" }]);
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
    check(!!opt(hasAll, id).disabledReason?.includes("جهاز جديد"),
      "وصاحبُ الحالة يُحال إلى «جهاز جديد» لا إلى بابٍ مغلق");
  }
  // ولا واحدٌ من المعطَّلات يحمل مساراً يُنفَّذ سهواً.
  same("والمعطَّل لا يُفتَح", hasAll.filter((o) => o.disabled && !o.disabledReason).length, 0);

  // ══ «جهاز جديد» — الحلقة المفتوحة وحدها تمنعه ═════════════════════════
  console.log("\n── جهاز جديد ──");
  const withCase = { isAmputee: true } as any;
  same("صاحبُ الحالة بلا حلقة ⟶ «طرف صناعي جديد» متاح",
    opt(launcherOptions(withCase), "new_prosthetic_device").disabled, false);
  same("ومَن لا حالة له ⟶ معطَّل بسببه",
    opt(launcherOptions({}), "new_prosthetic_device").disabledReason, "تُفتَح الحالة أولاً");

  for (const [status, reason] of [
    ["awaiting_exam", "بانتظار معاينة الطبيب"],
    ["examined", "بانتظار التخصيص"],
    ["in_manufacturing", "قيد التصنيع"],
  ] as const) {
    const withOpen = launcherOptions({
      isAmputee: true, episodes: [{ serviceType: "prosthetic", status }],
    } as any);
    const o = opt(withOpen, "new_prosthetic_device");
    same(`وحلقةٌ «${status}» تمنع فتح جهازٍ ثانٍ`, o.disabled, true);
    check(!!o.disabledReason?.includes(reason), "   وتقول السبب", String(o.disabledReason));
  }

  // **جوهر الميزة**: الجهاز المسلَّم لا يمنع الجديد — هو سببه لا مانعه.
  for (const status of ["delivered", "cancelled"] as const) {
    same(`وحلقةٌ «${status}» لا تمنع الجهاز التالي`,
      opt(launcherOptions({
        isAmputee: true, episodes: [{ serviceType: "prosthetic", status }],
      } as any), "new_prosthetic_device").disabled, false);
  }

  // ولا تخلط الخدمتان: حلقةُ مسندٍ مفتوحة لا تمنع طرفاً جديداً.
  const crossed = launcherOptions({
    isAmputee: true, isMedicalSupport: true,
    episodes: [{ serviceType: "medical_support", status: "in_manufacturing" }],
  } as any);
  same("وحلقةُ المسند لا تمنع الطرف الجديد", opt(crossed, "new_prosthetic_device").disabled, false);
  same("وتمنع المسند الجديد وحده", opt(crossed, "new_support_device").disabled, true);
  same("و«جهاز جديد» يذهب إلى نقطة الحلقات",
    opt(crossed, "new_prosthetic_device").flow,
    { kind: "device_episode", serviceType: "prosthetic" });

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
  same("والصيانة معطَّلة لمن لا جهاز له",
    [opt(launcherOptions(NONE), "maintenance_prosthetic").disabled,
      opt(launcherOptions(NONE), "maintenance_support").disabled], [true, true]);
  //  وصاحبُ الطرف يرى صيانةَ طرفه متاحةً وصيانةَ المسند معطَّلة — فالنسبةُ
  //  إلى القسم صارت مرئيةً قبل الضغط لا بعده.
  same("ومتاحة لصاحب الجهاز في قسمه وحده",
    [opt(launcherOptions(PRO), "maintenance_prosthetic").disabled,
      opt(launcherOptions(PRO), "maintenance_support").disabled], [false, true]);
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
  //  الخريطتان انتقلتا إلى بيتهما القانوني (2026-08-21) — العناوينُ إلى
  //  `shared/service_taxonomy.ts` ليقرأها الخادمُ والشاشتان، والتحويلاتُ إلى
  //  `server/new_service/store.ts` مع الكتابة التي تحرسها. **والفحصُ يتبعهما
  //  ولا يلين**: نفسُ الحرف، في الملفّ الذي صار مصدرَه.
  const taxonomy = read("..", "..", "..", "shared", "service_taxonomy.ts");
  const newSrvStore = read("..", "..", "..", "server", "new_service", "store.ts");
  check(/additional_therapy: "جلسات علاج إضافية"/.test(taxonomy), "٢١. وأنواع الخدمة الثلاثة كما هي");
  check(/new_prosthetic: "الطرف الجديد يمرّ عبر معاينة الطبيب/.test(newSrvStore),
    "**والخادم ما زال يرفض `new_prosthetic` في new-service**");
  check(/maintenance: "الصيانة تُسجَّل من/.test(newSrvStore),
    "ويرفض `maintenance` فيها كذلك — والموزِّع لا يحاول");
  //  **والنقطةُ تناديهما فعلاً** — وإلّا كان الحرفُ حيّاً في ملفٍّ ميت.
  check(/NEW_SERVICE_REDIRECTS\[serviceType\]/.test(srv)
    && /NEW_SERVICE_LABELS\[serviceType\]/.test(srv),
  "٢١.ب والنقطة تقرأ الخريطتين من مصدرهما لا من نسخةٍ محلّية");

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


  // ══ تذكرة الإرسال: واحدة لكل فتح ═════════════════════════════════════
  // العطب: التذكرة كانت تُسكّ في `onOpenChange(true)` وحده، والموزِّع يركّب
  // النافذة **وهي مفتوحة أصلاً** فلا يقع الحدث — فتُرسَل فارغة، والخادم لا
  // يطالب بشيء حين تكون فارغة، فيسقط منع التكرار بصمت في المسار الجديد.
  console.log("\n── تذكرة الإرسال ──");
  let minted = 0;
  const mint = () => `tok-${++minted}`;

  // ١. النافذة المُدارة تُركَّب مفتوحةً ⇒ تذكرةٌ من أول لحظة.
  let tok = nextSubmissionToken("", true, mint);
  check(tok !== "", "١. نافذةٌ رُكِّبت مفتوحةً ⇒ تذكرة غير فارغة", tok);
  same("وسُكَّت مرّةً واحدة", minted, 1);

  // ٢. الفتح نفسه مهما تكرّر التقييم ⇒ التذكرة نفسها، بلا سكٍّ ثانٍ.
  const stable = [tok, nextSubmissionToken(tok, true, mint), nextSubmissionToken(tok, true, mint)];
  same("٢. والفتح نفسه لا يولّد ثانيةً", [...new Set(stable)].length, 1);
  same("ولا سكّ إضافي", minted, 1);

  // ٣. إغلاقٌ ثم فتح ⇒ تذكرة **جديدة**، فلا تُعاد المستهلَكة.
  const closed = nextSubmissionToken(tok, false, mint);
  same("٣. والإغلاق يُفرغها", closed, "");
  const reopened = nextSubmissionToken(closed, true, mint);
  check(reopened !== "" && reopened !== tok, "وفتحٌ جديد ⇒ تذكرة جديدة", `${tok} → ${reopened}`);
  same("سُكَّت مرّتين لا أكثر", minted, 2);
  // ولا تُعاد المستهلَكة: الخادم يردّ «مسجَّلة سابقاً» على خدمةٍ حقيقية لو
  // أُعيدت — فالتصفير عند الإغلاق ليس ترتيباً بل صحّةُ عمل.
  same("والمغلقة تبقى فارغة مهما تكرّر التقييم",
    [nextSubmissionToken("", false, mint), nextSubmissionToken("x", false, mint)], ["", ""]);
  same("ولا سكّ في المغلقة", minted, 2);

  // والسكّ الحقيقي يعطي قيمةً مفردة لا فارغة.
  const real = [mintSubmissionToken(), mintSubmissionToken()];
  check(real.every((x) => typeof x === "string" && x.length >= 8), "والسكّ الحقيقي يعطي معرّفاً", real.join(" "));
  check(real[0] !== real[1], "ومفرداً في كل مرّة");

  // والنافذة تستعملها فعلاً بأثرٍ على **حالة** الفتح لا على حدثه.
  check(/useEffect\(\(\) => \{\s*setSubmissionToken\(\(prev\) => nextSubmissionToken\(prev, open, mintSubmissionToken\)\);/.test(newServiceCode),
    "ونافذة الخدمة تسكّها بأثرٍ يتبع حالة الفتح", "");
  check(!/if \(next\) \{[\s\S]{0,200}setSubmissionToken/.test(newServiceCode),
    "**ولم يبقَ السكّ معلّقاً على حدث الفتح وحده**");

  // ══ ٥-٩. وضع الجلسات يتبع **الخدمة** لا ملفّ المريض ══════════════════
  console.log("\n── نوع الخدمة هو ما يقرّر وضع الجلسات ──");
  check(/const isPhysioService = selectedServiceType === "additional_therapy";/.test(newServiceCode),
    "٥. ووضع الجلسات معرَّف من نوع الخدمة");
  check(!/isPhysiotherapy/.test(newServiceCode),
    "**ولا أثر لـ`isPhysiotherapy` في منطق النافذة**",
    (newServiceCode.match(/.*isPhysiotherapy.*/g) ?? []).join(" | "));
  // والقيد على **نافذة الخدمة** وحدها: نافذة الزيارة تستعمل العلم لمنطقها
  // هي (نوع العلاج في زيارة المراجعة) — وذاك استعمالٌ صحيح لم يُطلَب مسّه.
  const newServiceUsage = launcherCode.match(/<NewServiceModal[\s\S]*?\/>/)?.[0] ?? "";
  check(newServiceUsage.length > 40, "واستعمال نافذة الخدمة مقروء", newServiceUsage);
  check(!/isPhysiotherapy/.test(newServiceUsage),
    "ولا يمرّرها الموزِّع إليها — فلا علمَ يقرّر وضعاً", newServiceUsage);

  // كل قرارٍ خاصّ بالجلسات صار على `isPhysioService` — ولا واحد بقي معلّقاً
  // على علم المريض. والعدّ يمنع أن يُنسى أحدها في تعديلٍ لاحق.
  const physioDecisions = (newServiceCode.match(/isPhysioService/g) ?? []).length;
  check(physioDecisions >= 10, "٦-٨. وكل قرارات الجلسات تمرّ به", String(physioDecisions));
  for (const gated of [
    "treatmentEntries: isPhysioService ? validEntries : undefined",
    "paymentTreatmentType: isPhysioService ?",
    "sessionCount: isPhysioService ?",
    "{isPhysioService && (",
    "const paidNow = isPhysioService",
  ]) {
    check(newServiceCode.includes(gated), `و«${gated.slice(0, 42)}…» مشروطٌ بالخدمة`);
  }

  // ══ ١٠-١٢. النوع الموجَّه مقفل ═══════════════════════════════════════
  console.log("\n── النوع الموجَّه لا يُبدَّل ──");
  check(/\{initialServiceType \? \(/.test(newServiceCode),
    "١٠. والموجَّه يُعرَض نصّاً لا قائمةً تُختار");
  check(/data-testid="text-service-type-locked"/.test(newServiceCode),
    "بعنصرٍ مقروء لا مُدخَل");
  // والقائمة تبقى للمسار المستقلّ وحده.
  check(/data-testid="select-service-type"/.test(newServiceCode),
    "والقائمة باقية للمسار المستقلّ");
  check(/serviceType: initialServiceType \?\? values\.serviceType/.test(newServiceCode),
    "١١-١٢. **والمُرسَل هو الموجَّه لا حالة النموذج**");
  check(/const selectedServiceType = initialServiceType \?\? form\.watch\("serviceType"\)/.test(newServiceCode),
    "ووضع الجلسات يتبع الموجَّه كذلك");
  // ١٥. والموزِّع ما زال يعطّل الجلسات الإضافية لمن لا علاج له — فالقفل
  // يحرس ما تحرسه الأهلية، ولا يُغني أحدهما عن الآخر.
  same("١٥. والموزِّع ما زال يعطّلها بلا علاج طبيعي",
    opt(launcherOptions({}), "additional_therapy").disabled, true);

  // ══ ١٣. والخادم لا يعتمد على الواجهة ═════════════════════════════════
  check(/serviceType === "additional_therapy" && !patient\.isPhysiotherapy/.test(srv),
    "١٣. وحارس الجلسات الإضافية في الخادم نفسه");
  check(/يجب تفعيل حالة العلاج الطبيعي للمريض أولاً/.test(SERVER_ROUTES),
    "برسالته الصريحة");
  check(!/serviceType === "consultation" && !patient/.test(srv),
    "ولم تُمَسّ الاستشارة و«خدمة أخرى» بشرطٍ جديد");

  console.log(failures === 0 ? "\n✅ all service-launcher cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
