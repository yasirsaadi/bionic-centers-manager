// موزِّع خدمات المريض — منطق التوزيع وعقد الواجهة.
// `npm run test:service-launcher` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **قرار التوزيع** خالصاً: أي خيار ⇒ أي مسار، ومتى يُعرَض ومتى يختفي.
// (ب) **ولا بابَ ثانياً لعمليات الأجهزة**: «إضافة خدمة جديدة» لم تعد تعرض
//     جهازاً جديداً ولا صيانةً ولا بيعاً بلا معاينة، ونافذةُ الزيارة لم
//     تعد تفتح صيانة. البابُ الوحيد «ما سبب حضور المريض اليوم؟».
// (ج) **واستئنافُ بيعٍ ناقص** يقع على الحلقة نفسِها لا على ثانيةٍ فوقها.
// (د) **عقد الواجهة** قراءةً للمصدر: الموزِّع **لا ينادي نقطة نهاية واحدة**،
//     ولا نقطة «خدمة عامّة» أُنشئت، والبوّابة لم تتوسّع.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **تصيير React نفسه**: المشروع بلا مشغّل DOM، وإضافته لأجل نافذة واحدة
// تغييرٌ بنيوي أكبر من الميزة. فالضغط الفعلي على البطاقة وفتح النافذة
// **مفحوصان ساكناً لا مُشغَّلين**. وحقيقةُ «بانتظار معاينة» مفحوصةٌ حيّاً
// على Postgres في `npm run test:service-path`.

import { readFileSync } from "fs";
import { join } from "path";
import {
  launcherOptions, resumableNoExamSale, FLOW_ENDPOINTS, GROUP_LABELS,
  nextSubmissionToken, mintSubmissionToken,
  type LauncherOption,
} from "./patient_service_launcher_logic";
import { PROSTHETIC_COMPONENTS } from "@shared/prosthetic_parts";

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
const PENDING_CHARGE_ROUTES = read("..", "..", "..", "server", "pending_charges", "routes.ts");

const opt = (list: LauncherOption[], id: string) => list.find((o) => o.id === id);
const ids = (list: LauncherOption[]) => list.map((o) => o.id);

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
  // **لا يكتب** — وهذا هو الثابت. صار يقرأ حلقات المريض ليستأنف بيعاً
  // ناقصاً؛ وقراءةٌ للعرض شيءٌ وتنفيذُ الخدمة شيءٌ آخر. فالممنوع هو
  // الكتابة: لا طفرة، ولا `apiRequest`، ولا `fetch` يدوي.
  for (const forbidden of ["fetch(", "apiRequest(", "useMutation"]) {
    check(!launcherCode.includes(forbidden),
      `ولا «${forbidden}» في الموزِّع`, launcherCode.slice(0, 120));
  }
  const launcherEndpoints = [...launcherCode.matchAll(/["'`](\/api\/[^"'`]*)/g)].map((m) => m[1]);
  same("ولا نقطةَ إلا قراءةَ حلقاتِ المريض",
    launcherEndpoints, ["/api/patients/${patient.id}/device-episodes"]);
  for (const flow of ["AddCaseTypeModal", "NewServiceModal", "NewDeviceEpisodeModal",
    "NoExamOperationDialog"]) {
    check(launcherCode.includes(`<${flow}`), `ويفتح «${flow}» القائمة`);
  }

  // ══ ١. لا بابَ ثانياً لعمليات الأجهزة في «إضافة خدمة جديدة» ═══════════
  console.log("\n── «إضافة خدمة جديدة»: خدماتُ الملفّ وحدها ──");
  const fresh = launcherOptions({});
  same("١.أ **خمسةُ خيارات لمن لا حالةَ له — ولا واحدٌ منها عمليةُ جهاز**",
    ids(fresh),
    ["prosthetic_case", "support_case", "physio_case", "consultation", "other"]);

  //  **الأبوابُ الستّة الموازية اختفت** — بمعرّفاتها بعينها، فلا يعود
  //  واحدٌ منها بالسهو تحت اسمٍ آخر.
  const RETIRED = [
    "new_prosthetic_device", "new_support_device",
    "maintenance_prosthetic", "maintenance_support",
    "no_exam_prosthetic", "no_exam_support",
  ];
  for (const flags of [
    {}, { isAmputee: true }, { isMedicalSupport: true },
    { isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true },
    { isAmputee: true, episodes: [{ serviceType: "prosthetic", status: "delivered" }] },
  ] as any[]) {
    const got = ids(launcherOptions(flags));
    const leaked = RETIRED.filter((id) => got.includes(id));
    same(`١.ب ولا بابَ جهازٍ يظهر مهما كان الملفّ — ${JSON.stringify(flags).slice(0, 46)}`,
      leaked, []);
  }

  //  **والمنطقُ لا المعرّفاتُ وحدها**: لا مسارَ جهازٍ ولا «بلا معاينة» ولا
  //  صيانةٍ يخرج من هذه القائمة إطلاقاً — أياً كان اسمُه.
  const ALLOWED_KINDS = ["case_type", "new_service"];
  for (const flags of [
    {}, { isAmputee: true }, { isPhysiotherapy: true },
    { isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true },
  ] as any[]) {
    const kinds = [...new Set(launcherOptions(flags).map((o) => o.flow.kind))].sort();
    same(`١.ج **ولا مسارَ إلّا نوعَ حالةٍ أو خدمةً على الملفّ** — ${JSON.stringify(flags).slice(0, 40)}`,
      kinds.filter((k) => !ALLOWED_KINDS.includes(k)), []);
  }
  //  ومَن لا حالةَ له يرى البابين معاً — فالقائمةُ لم تُفرَّغ، بل نُقّيت.
  same("١.د ومَن لا حالةَ له يرى البابين: نوعَ حالةٍ وخدمةً",
    [...new Set(fresh.map((o) => o.flow.kind))].sort(), ALLOWED_KINDS);

  // ══ ٢. الحالةُ القائمة **تختفي** — لا تُعرَض رماديةً ═══════════════════
  console.log("\n── الحالة القائمة تختفي ──");
  const hasAll = launcherOptions({
    isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true,
  });
  same("٢.أ **صاحبُ الحالات الثلاث لا يرى واحدةً منها** — ويرى ما يستطيع فعلاً",
    ids(hasAll), ["additional_therapy", "consultation", "other"]);
  //  **ولا خيارَ معطَّل في القائمة إطلاقاً** — البنيةُ نفسُها لم تعد تحمل
  //  `disabled`، فلا سبيلَ لعرض ما لا يُنفَّذ.
  for (const flags of [
    {}, { isAmputee: true }, { isPhysiotherapy: true },
    { isAmputee: true, isMedicalSupport: true, isPhysiotherapy: true },
  ] as any[]) {
    const withFlag = launcherOptions(flags).filter((o) => "disabled" in (o as any));
    same("٢.ب ولا بندَ يحمل `disabled` إطلاقاً", withFlag.map((o) => o.id), []);
  }
  same("٢.ج وصاحبُ الأطراف وحدها لا يرى «إضافة حالة أطراف»",
    ids(launcherOptions({ isAmputee: true })),
    ["support_case", "physio_case", "consultation", "other"]);

  //  والجلساتُ الإضافية **تظهر لصاحب العلاج وحده** — لا معطَّلةً لغيره.
  check(!!opt(hasAll, "additional_therapy"), "٢.د والجلساتُ الإضافية لصاحب العلاج");
  check(!opt(fresh, "additional_therapy"),
    "**ولا تُعرَض لمن لا علاجَ له** — لا معطَّلةً ولا مذكورة");

  // ══ ثلاثةُ أقسامٍ لا رابع ═════════════════════════════════════════════
  same("وثلاثةُ أقسامٍ بأسمائها الرسمية", Object.keys(GROUP_LABELS),
    ["prosthetic", "medical_support", "physiotherapy"]);
  same("**ولا مجموعةَ رابعة إطلاقاً**",
    [...new Set(fresh.map((o) => o.group))].sort(),
    ["medical_support", "physiotherapy", "prosthetic"]);
  //  وكلُّ خدمةٍ غيرِ حالةٍ تقع تحت العلاج الطبيعي — لا واحدةَ خارجه.
  same("**وكلُّ ما ليس حالةً فهو علاجٌ طبيعي تنظيمياً**",
    hasAll.filter((o) => o.flow.kind === "new_service").map((o) => o.group),
    ["physiotherapy", "physiotherapy", "physiotherapy"]);

  // **قائمة مغلقة**: أربع نقاط قائمة لا خامس، ولا «خدمة عامّة».
  same("٢٠. ولا نقطة خامسة يعرفها الموزِّع",
    Object.keys(FLOW_ENDPOINTS).sort(),
    ["case_type", "device_episode", "new_service", "no_exam_operation"]);
  same("وعناوينها هي القائمة نفسها", Object.values(FLOW_ENDPOINTS), [
    "/api/patients/:id/add-case-type",
    "/api/patients/:id/new-service",
    "/api/patients/:patientId/device-episodes",
    "/api/no-exam/device-sale",
  ]);
  //  **و«maintenance-visit» خرجت من خريطة الموزِّع** — ولم تُحذَف من الخادم.
  check(!Object.values(FLOW_ENDPOINTS).includes("/api/manufacturing/maintenance-visit"),
    "٢٠.أ **ولا صيانةَ في خريطة الموزِّع بعد اليوم**");

  // ٤-٦. مريضٌ بلا أي نوع: الثلاثة تذهب إلى `add-case-type` بأنواعها.
  same("٤. أطراف ⇒ add-case-type/amputee", opt(fresh, "prosthetic_case")!.flow,
    { kind: "case_type", caseType: "amputee" });
  same("٥. مساند ⇒ add-case-type/medical_support", opt(fresh, "support_case")!.flow,
    { kind: "case_type", caseType: "medical_support" });
  same("٦. علاج طبيعي ⇒ add-case-type/physiotherapy", opt(fresh, "physio_case")!.flow,
    { kind: "case_type", caseType: "physiotherapy" });

  // ٨-١٠. الخدمات المالية ⇒ `new-service` بأنواعها الثلاثة القائمة.
  same("٨. جلسات إضافية ⇒ new-service/additional_therapy",
    opt(hasAll, "additional_therapy")!.flow,
    { kind: "new_service", serviceType: "additional_therapy" });
  same("٩. استشارة ⇒ new-service/consultation",
    opt(fresh, "consultation")!.flow, { kind: "new_service", serviceType: "consultation" });
  same("١٠. خدمة أخرى ⇒ new-service/other",
    opt(fresh, "other")!.flow, { kind: "new_service", serviceType: "other" });
  const serviceTypes = hasAll.filter((o) => o.flow.kind === "new_service")
    .map((o) => (o.flow as any).serviceType).sort();
  same("وأنواع new-service ثلاثة لا رابع لها",
    serviceTypes, ["additional_therapy", "consultation", "other"]);
  check(!serviceTypes.includes("maintenance") && !serviceTypes.includes("new_prosthetic"),
    "**ولا `maintenance` ولا `new_prosthetic` بينها**", serviceTypes.join(", "));

  // ══ ٨-٩. استئنافُ بيعٍ بلا معاينة بقي ناقصاً ══════════════════════════
  //  حلقةٌ `awaiting_exam` بمسار `no_exam` = عمليةٌ فُتحت ولم تُكمَل: بلا
  //  سعرٍ ولا خبيرٍ ولا أمر تصنيع. تُستأنَف **هي بعينها**.
  console.log("\n── استئنافُ البيع الناقص ──");
  const HALF = [{
    id: 77, serviceType: "prosthetic", status: "awaiting_exam",
    servicePath: "no_exam", requestedItem: "socket",
  }];
  same("٩. **الحلقةُ الناقصة تُستأنَف بمعرّفها وبما طُلب فيها حرفاً**",
    resumableNoExamSale(HALF, "prosthetic"), { episodeId: 77, requestedItem: "socket" });
  same("ولا تُستأنَف لقسمٍ آخر", resumableNoExamSale(HALF, "medical_support"), null);

  //  **ولا يُخمَّن المطلوب أبداً**: صفٌّ بلا `requestedItem` لا يُستأنَف —
  //  فتحُ نافذةٍ على مجهولٍ كان سيسجّل بيعَ قطعةٍ لم يطلبها أحد.
  same("١٠.أ وصفٌّ بلا مطلوبٍ لا يُستأنَف — ولا يُخمَّن له شيء",
    resumableNoExamSale([{ ...HALF[0], requestedItem: null }], "prosthetic"), null);
  same("ولا صفٌّ بلا معرّفٍ رقميّ",
    resumableNoExamSale([{ ...HALF[0], id: undefined }] as any, "prosthetic"), null);

  //  **ومسارُ المعاينة ليس ناقصاً** — طلبٌ ينتظر الطبيب يمضي بمساره.
  same("١٠.ب وحلقةُ مسار المعاينة لا تُستأنَف بيعاً",
    resumableNoExamSale([{ ...HALF[0], servicePath: "exam" }], "prosthetic"), null);
  //  وحلقةُ ما قبل ٠٦٥ (`null`) ليست بيعاً بلا معاينة — لم تُسأل أصلاً.
  same("ولا حلقةُ ما قبل ٠٦٥ (بلا مسار)",
    resumableNoExamSale([{ ...HALF[0], servicePath: null }], "prosthetic"), null);
  for (const status of ["in_manufacturing", "delivered", "cancelled", "examined"]) {
    same(`وحلقةٌ «${status}» ليست عمليةً ناقصة`,
      resumableNoExamSale([{ ...HALF[0], status }], "prosthetic"), null);
  }
  same("وبلا حلقاتٍ إطلاقاً ⟶ لا استئناف",
    [resumableNoExamSale([], "prosthetic"), resumableNoExamSale(null, "prosthetic"),
      resumableNoExamSale(undefined, "prosthetic")], [null, null, null]);
  //  ══ **ولا يُستأنَف ما لا يُباع** (قرارُ المالك بعد ٢٤٩) ═════════════════
  //  حلقةٌ موروثة بمسار `no_exam` وطلبِ «جهازٍ كامل» يردّها الخادمُ عند
  //  البيع. فاستئنافُها كان يعبّئ نموذجاً مآلُه ٤٠٩ محتوم — وبابُها
  //  المعاينةُ أو التصحيحُ الإداريّ كما تقول رسالةُ الردّ.
  same("١٠.ج **وطلبُ «طرفٍ كامل» لا يُستأنَف بيعاً** — يردّه الخادمُ حتماً",
    resumableNoExamSale([{ ...HALF[0], requestedItem: "full_device" }], "prosthetic"), null);
  same("١٠.د **ولا طلبُ «مسندٍ كامل»** — ولا بيعَ للمساند بلا معاينة أصلاً",
    resumableNoExamSale(
      [{ ...HALF[0], serviceType: "medical_support", requestedItem: "full_device" }],
      "medical_support"), null);
  //  **والأجزاءُ تبقى تُستأنَف** — الضيقُ على ما يجب وحده، بلا كنسِ ما حوله.
  same("١٠.هـ وكلُّ جزءِ طرفٍ يبقى قابلاً للاستئناف",
    PROSTHETIC_COMPONENTS.filter((c) => resumableNoExamSale(
      [{ ...HALF[0], requestedItem: c }], "prosthetic")?.requestedItem !== c), []);

  //  **والموزِّعُ يمرّرها إلى النافذة القائمة** — ولا يُنشئ حلقةً ثانية.
  check(/resumableNoExamSale\(episodeData\?\.episodes, flow\.serviceType\)/.test(launcherCode),
    "١٠.ج **والموزِّعُ يقرأ الاستئنافَ من حلقات المريض نفسِها**");
  check(/existingEpisodeId=\{saleResume\?\.episodeId \?\? null\}/.test(launcherCode)
    && /existingRequestedItem=\{saleResume\?\.requestedItem \?\? null\}/.test(launcherCode),
    "ويمرّرهما إلى نافذة «بلا معاينة» القائمة");
  //  ولا يُستأنَف على مسار الصيانة — تلك لا تفتح حلقةً أصلاً.
  check(/flow\.initialKind === "device_sale"/.test(launcherCode),
    "١٠.د **والاستئنافُ لمسار البيع وحده** — الصيانةُ لا حلقةَ لها");

  // ══ ٨. نافذةُ الزيارة: مراجعةٌ ومتابعةٌ فقط ═══════════════════════════
  console.log("\n── لا صيانةَ في نافذة الزيارة ──");
  const visitCode = code(VISIT);
  for (const gone of [
    "select-visit-purpose", "select-maintenance-device", "select-maintenance-expert",
    "select-maintenance-component", "input-maintenance-cost", "maintenance-discount",
    "submitMaintenance", "maintenance-visit",
  ]) {
    check(!visitCode.includes(gone), `٨.أ **ولا «${gone}» في نافذة الزيارة**`);
  }
  //  والعدُّ على **الشيفرة الفعلية**: التعليقُ الذي يشرح أن النقطة لم
  //  تُحذَف من الخادم يذكرها بالاسم، وعدُّه كان سيقيس غير ما وُضع له.
  same("٨.ب **ولا نداءَ لنقطة الصيانة منها إطلاقاً**",
    (visitCode.match(/\/api\/manufacturing\/maintenance-visit/g) ?? []).length, 0);
  check(!/initialPurpose|initialMaintServiceType/.test(visitCode),
    "٨.ج ولا خاصّيةَ توجيهٍ إلى الصيانة بقيت في عقدها");
  //  **ولا يفتحها الموزِّعُ أصلاً** — الصيانةُ بابُها المُوجِّه.
  check(!launcherCode.includes("<VisitModal"),
    "٨.د **والموزِّعُ لم يعد يفتح نافذةَ الزيارة** — لا صيانةً ولا غيرَها");
  check(!/maintenance_visit/.test(launcherCode)
    && !/maintenance_visit/.test(code(read("patient_service_launcher_logic.ts"))),
    "٨.هـ **ومسارُ `maintenance_visit` أُزيل من الموزِّع ومنطقه** — بلا شيفرةٍ ميتة");
  //  وتبقى نافذةُ الزيارة تدلّ على البابِ الصحيح بدل أن تصمت.
  check(visitCode.includes("visit-maintenance-hint"),
    "٨.و وتدلّ الموظّفَ على «ما سبب حضور المريض اليوم؟» بدل بابٍ اختفى");

  // ══ الخادم: النقاط باقيةٌ كما هي — الشاشةُ وحدها كفّت ═════════════════
  console.log("\n── الخادم لم يُمَسّ ──");
  const mfg = MFG_ROUTES;
  const srv = SERVER_ROUTES;
  for (const ep of ["/api/patients/:id/add-case-type", "/api/patients/:id/new-service"]) {
    check(srv.includes(`"${ep}"`), `٢٠. و«${ep}» باقية كما هي`);
  }
  check(mfg.includes('"/api/manufacturing/maintenance-visit"'),
    "٢٠.ب **و«maintenance-visit» باقيةٌ في الخادم** — لم تُحذَف، الشاشةُ كفّت عن فتح بابٍ ثانٍ إليها");
  //  ⚠ **(المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨)** — النقطةُ القديمةُ نفسُها تقاعدت
  //  لعموم المستخدمين (٤٠٩) بدل تنفيذ الصيانة، فحرسُ «يملك النوع فعلاً»
  //  انتقل مع المنطق كلِّه إلى `/api/no-exam/maintenance` — البابُ الحيّ
  //  الوحيد اليوم. هذا امتدادٌ لهذه المرحلة على نقطةٍ تقاعدت، لا نقضٌ لِما
  //  أثبتته «٢٠.ب» أعلاه (النقطةُ القديمة **لم تُحذَف**، بابُها فقط أُغلق).
  check(/owned\.includes\(requested as any\)/.test(PENDING_CHARGE_ROUTES),
    "وحارسُها يتحقّق أن المريض يملك النوع فعلاً — انتقل إلى الباب الحيّ الجديد");
  const generic = [...srv.matchAll(/app\.(post|put|patch)\("([^"]*service[^"]*)"/g)].map((m) => m[2]);
  same("٢٠.ج ولا نقطة خدمات عامّة جديدة", generic, ["/api/patients/:id/new-service"]);

  // ٢١. محاسبة الخدمة لم تُمَسّ: الأنواع الثلاثة والرفض القائم كما هما.
  const taxonomy = read("..", "..", "..", "shared", "service_taxonomy.ts");
  const newSrvStore = read("..", "..", "..", "server", "new_service", "store.ts");
  check(/additional_therapy: "جلسات علاج إضافية"/.test(taxonomy), "٢١. وأنواع الخدمة الثلاثة كما هي");
  check(/new_prosthetic: "الطرف الجديد يمرّ عبر معاينة الطبيب/.test(newSrvStore),
    "**والخادم ما زال يرفض `new_prosthetic` في new-service**");
  check(/maintenance: "الصيانة تُسجَّل من/.test(newSrvStore),
    "ويرفض `maintenance` فيها كذلك — والموزِّع لا يحاول");
  check(/NEW_SERVICE_REDIRECTS\[serviceType\]/.test(srv)
    && /NEW_SERVICE_LABELS\[serviceType\]/.test(srv),
  "٢١.ب والنقطة تقرأ الخريطتين من مصدرهما لا من نسخةٍ محلّية");

  // ٢٢. وworkflow التصنيع لم يُمَسّ: الإصلاح في الواجهة لا في الأمر.
  for (const untouched of ["createMaintenanceOrderWithVisit", "purpose: \"maintenance\"", "ActiveOrderError"]) {
    check(read("..", "..", "..", "server", "manufacturing", "store.ts").includes(untouched),
      `٢٢. و«${untouched}» في مسار التصنيع كما هو`);
  }

  // ══ النوافذ: الوضعان معاً، والمنطق واحد ══════════════════════════════
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
  same("ونافذة نوع الحالة تنادي مسارها مرّةً واحدة",
    (ADD_CASE.match(/\/api\/patients\/\$\{[^}]+\}\/add-case-type/g) ?? []).length, 1);
  same("ونافذة الخدمة كذلك",
    (NEW_SERVICE.match(/\/api\/patients\/\$\{[^}]+\}\/new-service/g) ?? []).length, 1);
  check(/serviceCost: 0, paidNow: 0/.test(code(ADD_CASE)),
    "١٩. و«إضافة نوع حالة» ما زالت ترسل صفراً — قرارٌ بلا مال");

  // ══ ١٨. تحديثُ ما تغيّر بعد عمليةٍ بلا معاينة ═════════════════════════
  console.log("\n── تحديثُ الشاشة بعد العملية ──");
  const noExam = code(read("NoExamOperationDialog.tsx"));
  //  العمليةُ تفتح أمرَ تصنيعٍ فوراً، وبطاقةُ التصنيع في صفحة المريض تقرأ
  //  مفتاحاً **خاصّاً بالمريض** — وكان التحديثُ يمسّ القائمةَ العامّة وحدها،
  //  فيحفظ الموظّفُ العمليةَ ولا يرى أمرَها حتى يحدّث المتصفّح بيده.
  check(noExam.includes("`/api/manufacturing/patient/${patientId}/orders`"),
    "١٨. **ويُحدَّث سجلُّ تصنيع هذا المريض بعينه** — لا القائمةُ العامّة وحدها");
  check(noExam.includes("`/api/manufacturing/patient/${patientId}/summary`"),
    "وملخّصُه كذلك");
  for (const kept of [
    "`/api/patients/${patientId}/device-episodes`",
    "`/api/patients/${patientId}/pending-charges`",
    '"/api/no-exam/review"',
  ]) {
    check(noExam.includes(kept), `وما كان يُحدَّث بقي — ${kept}`);
  }
  //  والبطاقةُ تقرأ المفتاحَ نفسَه فعلاً — وإلّا كان التحديثُ لمفتاحٍ لا أحد يقرؤه.
  check(read("manufacturing", "PatientWorkOrderCard.tsx")
    .includes("`/api/manufacturing/patient/${patientId}/orders`"),
  "١٨.ب **والبطاقةُ تقرأ هذا المفتاحَ بعينه** — فالتحديثُ يصل إلى ما يُعرَض");

  // ══ تذكرة الإرسال: واحدة لكل فتح ═════════════════════════════════════
  // العطب: التذكرة كانت تُسكّ في `onOpenChange(true)` وحده، والموزِّع يركّب
  // النافذة **وهي مفتوحة أصلاً** فلا يقع الحدث — فتُرسَل فارغة، والخادم لا
  // يطالب بشيء حين تكون فارغة، فيسقط منع التكرار بصمت في المسار الجديد.
  console.log("\n── تذكرة الإرسال ──");
  let minted = 0;
  const mint = () => `tok-${++minted}`;

  let tok = nextSubmissionToken("", true, mint);
  check(tok !== "", "١. نافذةٌ رُكِّبت مفتوحةً ⇒ تذكرة غير فارغة", tok);
  same("وسُكَّت مرّةً واحدة", minted, 1);

  const stable = [tok, nextSubmissionToken(tok, true, mint), nextSubmissionToken(tok, true, mint)];
  same("٢. والفتح نفسه لا يولّد ثانيةً", [...new Set(stable)].length, 1);
  same("ولا سكّ إضافي", minted, 1);

  const closed = nextSubmissionToken(tok, false, mint);
  same("٣. والإغلاق يُفرغها", closed, "");
  const reopened = nextSubmissionToken(closed, true, mint);
  check(reopened !== "" && reopened !== tok, "وفتحٌ جديد ⇒ تذكرة جديدة", `${tok} → ${reopened}`);
  same("سُكَّت مرّتين لا أكثر", minted, 2);
  same("والمغلقة تبقى فارغة مهما تكرّر التقييم",
    [nextSubmissionToken("", false, mint), nextSubmissionToken("x", false, mint)], ["", ""]);
  same("ولا سكّ في المغلقة", minted, 2);

  const real = [mintSubmissionToken(), mintSubmissionToken()];
  check(real.every((x) => typeof x === "string" && x.length >= 8), "والسكّ الحقيقي يعطي معرّفاً", real.join(" "));
  check(real[0] !== real[1], "ومفرداً في كل مرّة");

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
  const newServiceUsage = launcherCode.match(/<NewServiceModal[\s\S]*?\/>/)?.[0] ?? "";
  check(newServiceUsage.length > 40, "واستعمال نافذة الخدمة مقروء", newServiceUsage);
  check(!/isPhysiotherapy/.test(newServiceUsage),
    "ولا يمرّرها الموزِّع إليها — فلا علمَ يقرّر وضعاً", newServiceUsage);

  const physioDecisions = (newServiceCode.match(/isPhysioService/g) ?? []).length;
  check(physioDecisions >= 10, "٦-٨. وكل قرارات الجلسات تمرّ به", String(physioDecisions));
  for (const gated of [
    "treatmentEntries: isPhysioService ? validEntries : undefined",
    "paymentTreatmentType: isPhysioService ?",
    "sessionCount: isPhysioService ?",
    "{isPhysioService && (",
  ]) {
    check(newServiceCode.includes(gated), `و«${gated.slice(0, 42)}…» مشروطٌ بالخدمة`);
  }

  // ══ ٩. **والمقبوضُ الفعليّ وحده لم يعد يُقرَّر من نوع الخدمة** — إصلاحٌ
  //  لاحق (الجهوزيةُ المالية) ══════════════════════════════════════════════
  //  كان `paidNow` مقفولاً على `isPhysioService ? serviceCost : …` — أي أن
  //  الجلساتِ الإضافية كانت تُسجَّل مدفوعةً كاملةً حتماً بلا حقلٍ يظهر لها
  //  أصلاً. **ثمّ بقي أثرٌ ثانٍ من العطب نفسه**: تعبئةٌ تلقائية بكامل السعر
  //  لغير الجلسات (`form.setValue("paidNow", serviceCost…)`) — فاستشارةٌ أو
  //  «خدمة أخرى» كانتا تُسجَّلان مدفوعتين كاملةً بلا أن يكتب الموظّفُ رقماً.
  //  حارسٌ يمنع عودة أيٍّ من الشكلين لأيّ نوعِ خدمة.
  console.log("\n── ٩. المقبوضُ الفعليّ حقلٌ حقيقيّ — بلا استثناءٍ ولا تعبئة ──");
  check(!/paidNow\s*=\s*isPhysioService\s*\?\s*serviceCost/.test(newServiceCode),
    "٩. **لا `paidNow = isPhysioService ? serviceCost` بعد اليوم**"
    + " — كان هذا يُخرج الجلسات من صدق الإيصال كلياً");
  check(!/setValue\(\s*"paidNow"\s*,\s*serviceCost/.test(newServiceCode),
    "**ولا تعبئةٌ تلقائية بكامل السعر لأيّ نوع خدمة** — لا استدعاء"
    + ' `setValue("paidNow", serviceCost…)` متبقٍّ',
    (newServiceCode.match(/.*setValue\(\s*"paidNow".*/g) ?? []).join(" | "));
  check(!/paidNowOverride/.test(newServiceCode),
    "**ولا حالةَ تجاوزٍ ميتة بقيت** — `paidNowOverride` أُزيلت كاملةً مع"
    + " التعبئة التلقائية التي كانت تحرسها");

  // ══ ١٠-١٢. النوع الموجَّه مقفل ═══════════════════════════════════════
  console.log("\n── النوع الموجَّه لا يُبدَّل ──");
  check(/\{initialServiceType \? \(/.test(newServiceCode),
    "١٠. والموجَّه يُعرَض نصّاً لا قائمةً تُختار");
  check(/data-testid="text-service-type-locked"/.test(newServiceCode),
    "بعنصرٍ مقروء لا مُدخَل");
  check(/data-testid="select-service-type"/.test(newServiceCode),
    "والقائمة باقية للمسار المستقلّ");
  check(/serviceType: initialServiceType \?\? values\.serviceType/.test(newServiceCode),
    "١١-١٢. **والمُرسَل هو الموجَّه لا حالة النموذج**");
  check(/const selectedServiceType = initialServiceType \?\? form\.watch\("serviceType"\)/.test(newServiceCode),
    "ووضع الجلسات يتبع الموجَّه كذلك");

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
