// مُوجِّهُ «ما سبب حضور المريض اليوم؟» — منطقٌ خالص وعقدُ الواجهة.
// `npm run test:reception-routing` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **قرارُ التوجيه** خالصاً: ثلاثةُ خياراتٍ لكلّ قسم، وإلى أيّ مسارٍ
//     قائم يذهب كلّ خيار.
// (ب) **وصاحبُ القسمين يراهما معاً** — ولا يُخمَّن له قسمٌ بصمت.
// (ج) **بلا «شراء طرف صناعي كامل»** بين الخيارات — والدليلُ نصّيٌّ ومنطقيّ.
// (د) **بلا قائمة أجزاء مسانِد مخترَعة** — لا هنا ولا فيما يفتحه.
// (هـ) **العلمُ الأحاديّ الاستعمال**: يُفتَح مرّةً ولا يعاود التحديثُ فتحَه.
// (و) **عقدُ الأسلاك**: التسجيلُ يُخزِّن، وزرُّ رأس الصفحة يفتح **الحوارَ
//     نفسَه**، والنوافذ القائمة تُفتَح دون تكرار منطقها.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **تصيير React نفسه**: المشروع بلا مشغّل DOM (انظر تعليق
// `patient_service_launcher.test.ts`) — فالضغطُ الفعليّ وفتحُ النوافذ
// مفحوصان ساكناً من مصدر الشيفرة لا مُشغَّلين.

import { readFileSync } from "fs";
import { join } from "path";
import {
  RECEPTION_ROUTING_QUESTION, receptionRoutingChoices, receptionRoutingDepartments,
  receptionRoutingGroups, markReceptionRoutingPending, takeReceptionRoutingPending,
} from "./reception_routing";
import { launcherOptions } from "./patient_service_launcher_logic";
import { PROSTHETIC_COMPONENTS } from "@shared/prosthetic_parts";
import type { ResumeStore } from "./device_flow_resume";

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
 * المصدر بلا تعليقات — نفسُ حارس `patient_service_launcher.test.ts` حرفاً،
 * كي لا يُمسك تعليقٌ شارحٌ (مثل هذا الملفّ نفسِه) بذكره لغياب.
 */
function code(src: string): string {
  return src
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** مخزَّنٌ زائف يطابق عقد `ResumeStore` — بلا متصفّح وبلا DOM. */
function fakeStore(): ResumeStore {
  const m = new Map<string, string>();
  return {
    getItem: (k) => (m.has(k) ? m.get(k)! : null),
    setItem: (k, v) => { m.set(k, v); },
    removeItem: (k) => { m.delete(k); },
  };
}

const ROUTING = read("reception_routing.ts");
const LAUNCHER = read("PatientServiceLauncher.tsx");
const NO_EXAM_DIALOG = read("NoExamOperationDialog.tsx");
const CREATE_PATIENT = read("..", "pages", "CreatePatient.tsx");
const LAUNCHER_LOGIC = read("patient_service_launcher_logic.ts");
const DEVICE_EPISODE_MODAL = read("NewDeviceEpisodeModal.tsx");
const DETAILS = read("..", "pages", "PatientDetails.tsx");

const PRO = { isAmputee: true };
const SUP = { isMedicalSupport: true };
const DUAL = { isAmputee: true, isMedicalSupport: true };

//  ⚠ **(المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨)** — خيارُ «صيانة» صار مشروطاً
//  بـ`canCompleteMaintenance` (`shared/maintenance.ts`). ما يلي جلسةٌ
//  مخوَّلة (استقبال) تُمرَّر صراحةً فيما تبقّى من هذا الملفّ — فما كان
//  يثبته قبل هذه المرحلة (شكلُ الخيارات الثلاثة/الاثنين) يبقى مُثبَتاً
//  بحرفه، والتغطيةُ الجديدة (الإخفاءُ عن غير المخوَّل) في القسم أدناه.
const RECEPTION = { role: "reception", isAdmin: false };

function main() {
  // ══ (أ) القرار: ثلاثةُ خيارات لكلّ قسم ═════════════════════════════════
  console.log("\n── قرارُ التوجيه ──");

  same("١. والسؤالُ نصّاً واحداً ثابتاً",
    RECEPTION_ROUTING_QUESTION, "ما سبب حضور المريض اليوم؟");

  const pro = receptionRoutingChoices("prosthetic", RECEPTION);
  same("٢. **ثلاثةُ خياراتٍ للأطراف لا رابع**", pro.map((c) => c.id),
    ["exam_required", "device_sale", "maintenance"]);
  same("٣. وعناوينُها بالضبط", pro.map((c) => c.label), [
    "يحتاج معاينة طبية", "شراء جزء من طرف صناعي", "صيانة طرف صناعي",
  ]);

  //  ══ **والمساندُ اثنان لا ثلاثة** (قرارُ المالك بعد ٢٤٩) ═══════════════
  //  كان لها «شراء مسند طبي»، يفتح نافذةَ «بلا معاينة» فتعرض له **الجهازَ
  //  الكاملَ** لأنه الشيءُ الوحيد الذي لا أجزاءَ دونه — فتبيع بلا معاينةٍ
  //  أشدَّ ما يحتاج الطبيب. والمسندُ الكاملُ كالطرف الكامل: معاينةٌ أوّلاً.
  const sup = receptionRoutingChoices("medical_support", RECEPTION);
  same("٤. **وخياران للمساند لا ثلاثة — ولا بيعَ بلا معاينة فيها**",
    sup.map((c) => c.id), ["exam_required", "maintenance"]);
  same("٥. وعناوينُها بالضبط", sup.map((c) => c.label), [
    "يحتاج معاينة طبية", "صيانة مسند طبي",
  ]);
  check(!sup.some((c) => c.label.includes("شراء")),
    "**ولا عنوانَ شراءٍ يبلغ الشاشة إطلاقاً** — لا معطَّلاً ولا ظاهراً",
    JSON.stringify(sup.map((c) => c.label)));
  check(!sup.some((c) => (c.flow as any).initialKind === "device_sale"),
    "**ولا مسارَ بيعٍ يخرج من توجيه المساند**",
    JSON.stringify(sup.map((c) => c.flow)));

  // ══ إلى أيّ مسارٍ قائم يذهب كلّ خيار ═══════════════════════════════════
  console.log("\n── وجهةُ كلّ خيار ──");

  same("٦. **«يحتاج معاينة طبية» ⇒ نافذةُ «جهاز جديد» القائمة، بلا حقلٍ إضافي**",
    pro.find((c) => c.id === "exam_required")?.flow,
    { kind: "device_episode", serviceType: "prosthetic" });
  same("والمساندُ كذلك",
    sup.find((c) => c.id === "exam_required")?.flow,
    { kind: "device_episode", serviceType: "medical_support" });
  //  **والمطلوبُ يبقى مفتوحاً**: لا `requestedItem` مضبوطٌ مسبقاً —
  //  النافذةُ تسأل «ما المطلوب؟» كما كانت تفعل دائماً.
  {
    const flow = pro.find((c) => c.id === "exam_required")?.flow as any;
    check(!("requestedItem" in flow),
      "٧. **ولا يُفرَض مطلوبٌ سلفاً** — النافذةُ تسأل «ما المطلوب؟» كما كانت",
      JSON.stringify(flow));
    check(!("servicePath" in flow) && !("initialServicePath" in flow)
      && !("fromReceptionRouting" in flow),
    "**ولا حقلَ مسارٍ على الحلقة إطلاقاً** — المسارُ ثابتٌ في النافذة نفسِها",
    JSON.stringify(flow));
  }

  same("٨. **«شراء جزء من طرف صناعي» ⇒ نافذةُ «بلا معاينة» بنوع بيع محسوم**",
    pro.find((c) => c.id === "device_sale")?.flow,
    { kind: "no_exam_operation", serviceType: "prosthetic", initialKind: "device_sale" });
  same("٩. **«صيانة طرف صناعي» ⇒ النافذةُ نفسُها بنوع صيانة محسوم**",
    pro.find((c) => c.id === "maintenance")?.flow,
    { kind: "no_exam_operation", serviceType: "prosthetic", initialKind: "maintenance" });
  same("١٠. **ولا خيارَ بيعٍ للمساند أصلاً** — القاعدةُ من `shared` لا شرطٌ محلّيّ",
    sup.find((c) => c.id === "device_sale"), undefined);
  same("١١. **«صيانة مسند طبي» ⇒ النافذةُ نفسُها لخدمة المساند**",
    sup.find((c) => c.id === "maintenance")?.flow,
    { kind: "no_exam_operation", serviceType: "medical_support", initialKind: "maintenance" });

  //  **ونافذةُ «بلا معاينة» واحدة للبيع والصيانة معاً** — لا نافذتان.
  same("١٢. ونافذةُ البيع والصيانة هي نفسُها (`no_exam_operation`)",
    [...new Set(pro.filter((c) => c.id !== "exam_required").map((c) => c.flow.kind))],
    ["no_exam_operation"]);

  // ══ (ب) مسارُ المعاينة ثابتٌ — ولا محدِّدَ داخل النافذة ════════════════
  //  «يحتاج معاينة طبية» أجاب عن السؤال بضغطته. وإعادةُ طرحه داخل النافذة
  //  كانت تسمح بقلبه إلى «بلا معاينة» — **بلا أن يقول أهو بيعُ جزءٍ أم
  //  صيانة** — فتُفتَح حلقةٌ ناقصةُ المعنى تسبق تسجيل العملية الصحيحة.
  console.log("\n── مسارُ المعاينة ثابتٌ في نافذته ──");
  const deviceModalCode = code(DEVICE_EPISODE_MODAL);

  check(!deviceModalCode.includes("select-service-path")
    && !deviceModalCode.includes("SERVICE_PATH_QUESTION")
    && !deviceModalCode.includes("SERVICE_PATH_LABELS"),
  "١٢.أ **ولا محدِّدَ «هل تحتاج معاينة؟» في النافذة إطلاقاً**");
  check(!/setPath\(/.test(deviceModalCode) && !/\bconst \[path\b/.test(deviceModalCode),
    "١٢.ب ولا حالةَ مسارٍ فيها أصلاً — لا شيءَ يُقلَب");
  check(/servicePath: "exam"/.test(deviceModalCode),
    "١٢.ج **والمُرسَل ثابتٌ `\"exam\"`** — لا حالةُ شاشةٍ ولا استئنافٌ محفوظ");
  same("١٢.د **ولا قيمةَ مسارٍ أخرى تُرسَل من هذه النافذة**",
    [...new Set((deviceModalCode.match(/servicePath: [^,\n]+/g) ?? []))],
    ['servicePath: "exam"']);
  check(deviceModalCode.includes("text-service-path-fixed"),
    "١٢.هـ ويُعرَض المسارُ ثابتاً للقراءة");
  check(deviceModalCode.includes("button-change-reason")
    && /onChangeReason\?\.\(\)/.test(deviceModalCode),
  "١٢.و **ومعه «تغيير سبب الحضور»** — بابُ التصحيح الحقيقيّ");
  //  **ولا يُنشئ الزرُّ حلقةً ولا يُلغيها**: `mutation.mutate()` تُنادى من
  //  «فتح الطلب» وحده، والموزِّعُ يغلق ثمّ يفتح المُوجِّه بلا شبكة.
  same("١٢.ز **و«تغيير سبب الحضور» لا يُنشئ حلقةً ولا يُلغيها**",
    (deviceModalCode.match(/mutation\.mutate\(\)/g) ?? []).length, 1);
  const launcherCode = code(LAUNCHER);
  check(/function changeReceptionRoutingReason\(\) \{\s*closeFlow\(false\);\s*setRoutingOpen\(true\);\s*\}/.test(launcherCode),
    "١٢.ح ويعيد الموزِّعُ فتحَ المُوجِّه بإغلاقٍ عاديّ لا بنداءِ شبكة");

  // ══ (ج) صاحبُ القسمين يراهما معاً — ولا تفضيلَ صامت ════════════════════
  //  كانت القاعدةُ `if (isAmputee) return "prosthetic"` ثمّ المساند، فمريضٌ
  //  يحمل الاثنين يُعرَض له سؤالُ الأطراف وحده **ولا يُقال له ذلك**.
  console.log("\n── القسمان معاً، بلا تخمين ──");
  same("١٧.أ **صاحبُ الاثنين ⟶ القسمان كلاهما**",
    receptionRoutingDepartments(DUAL), ["prosthetic", "medical_support"]);
  same("وصاحبُ الأطراف وحدها ⟶ قسمُه هو", receptionRoutingDepartments(PRO), ["prosthetic"]);
  same("وصاحبُ المساند وحدها ⟶ قسمُه هو",
    receptionRoutingDepartments(SUP), ["medical_support"]);
  same("ومريضُ العلاج الطبيعي ⟶ لا قسمَ جهازٍ إطلاقاً",
    receptionRoutingDepartments({ isPhysiotherapy: true } as any), []);
  same("وبلا أيّ علمٍ ⟶ لا قسم", receptionRoutingDepartments({}), []);

  const dualGroups = receptionRoutingGroups(DUAL, RECEPTION);
  same("١٧.ب **ومجموعتان بعنوانيهما الرسميّين**",
    dualGroups.map((g) => [g.serviceType, g.label]),
    [["prosthetic", "الأطراف الصناعية"], ["medical_support", "المساند الطبية"]]);
  //  **وخمسةُ خيارات**: ثلاثةٌ للأطراف واثنان للمساند — بلا بيعٍ بلا معاينة
  //  في الثانية. والمهمُّ أن **القسمين معاً** حاضران بخياراتِ كلٍّ الصحيحة.
  same("١٧.ج **وخياراتُ القسمين معاً** — لا يضيع قسمٌ منهما ولا تُخلَط قواعدُهما",
    dualGroups.flatMap((g) => g.choices.map((c) => `${g.serviceType}:${c.id}`)),
    ["prosthetic:exam_required", "prosthetic:device_sale", "prosthetic:maintenance",
      "medical_support:exam_required", "medical_support:maintenance"]);
  same("وصاحبُ الأطراف وحدها يرى ثلاثةً",
    receptionRoutingGroups(PRO, RECEPTION).flatMap((g) => g.choices.map((c) => c.id)),
    ["exam_required", "device_sale", "maintenance"]);
  //  **ولا تُضاف صيانةُ الأطراف لصاحب المساند** — القسمُ الغائبُ غائبٌ كلُّه.
  same("وصاحبُ المساند وحدها يرى خيارَيه هو لا خيارَ أطرافٍ واحداً",
    receptionRoutingGroups(SUP, RECEPTION).flatMap((g) => g.choices.map((c) => c.label)),
    ["يحتاج معاينة طبية", "صيانة مسند طبي"]);
  //  **ولا أثرَ للتفضيل الصامت في المصدر** — لا هنا ولا في الموزِّع.
  const routingCode = code(ROUTING);
  check(!/isAmputee\s*\)\s*return "prosthetic"/.test(routingCode)
    && !/isAmputee \? "prosthetic"/.test(routingCode),
  "١٧.د **ولا تفضيلَ صامتاً للأطراف في مصدر التوجيه**");
  check(!/receptionRoutingServiceType/.test(routingCode)
    && !/receptionRoutingServiceType/.test(launcherCode),
  "١٧.هـ **والدالّةُ التي كانت تُفضِّل أُزيلت** — بلا شيفرةٍ ميتة");
  //  والموزِّعُ يعرض المجموعاتِ كلَّها — لا أوّلَها.
  check(/routingSections\.map\(\(section\) =>/.test(launcherCode),
    "١٧.و **والموزِّعُ يعرض المجموعاتِ كلَّها**");
  check(/routingSections\.length > 1 &&/.test(launcherCode),
    "ويُظهر العناوينَ حين تتعدّد وحدها — فلا عنوانٌ زائدٌ لقسمٍ واحد");
  check(/receptionRoutingGroups\(patient, branchSession\)/.test(launcherCode),
    "بالقاعدة نفسِها لا بقاعدةٍ ثانية — والجلسةُ تمرّ لتصفية الصيانة (المرحلة الثالثة)");

  //  ══ **والصيانةُ تُخفى عمّن لا يملك `canCompleteMaintenance`** (المرحلة
  //  الثالثة)، **وبيعُ الجزء يُخفى عمّن لا يملك `canCompleteComponentSale`**
  //  (المرحلة الرابعة) — بوّابتان مستقلّتان بصلاحيّتين مستقلّتين، تتّفقان في
  //  حجب الطبيب والجلسة الغائبة **صدفةً** لا لأنهما بوّابةٌ واحدة. خيارُ
  //  المعاينة وحده بلا قيدٍ فيبقى كما هو دائماً.
  console.log("\n── الصيانة تُخفى عمّن لا يملكها ──");
  const doctorSession = { role: "doctor", isAdmin: false };
  const proForDoctor = receptionRoutingChoices("prosthetic", doctorSession);
  same("١٧.ز **الطبيبُ لا يرى خيارَي الصيانة وبيع الجزء معاً** (المرحلة الرابعة)",
    proForDoctor.map((c) => c.id), ["exam_required"]);
  const proNoSession = receptionRoutingChoices("prosthetic");
  same("١٧.ح **وجلسةٌ غائبة كذلك تُخفيهما احتياطاً**",
    proNoSession.map((c) => c.id), ["exam_required"]);
  const proForAdmin = receptionRoutingChoices("prosthetic", { isAdmin: true });
  same("١٧.ط **والمسؤولُ العامّ يراهما بلا قيد**",
    proForAdmin.map((c) => c.id), ["exam_required", "device_sale", "maintenance"]);

  // ══ (د) بلا «شراء طرف صناعي كامل» بين الخيارات ═════════════════════════
  console.log("\n── بلا «شراء طرف صناعي كامل» ──");
  const allLabels = [...pro, ...sup].map((c) => c.label);
  check(!allLabels.some((l) => l.includes("طرف صناعي كامل")),
    "١٣. **ولا خيارٌ واحد يذكر «طرف صناعي كامل»**", allLabels.join(" | "));
  check(!routingCode.includes("شراء طرف صناعي كامل"),
    "١٤. ولا هذا النصّ بعينه **كشيفرةٍ فعلية** في مصدر الموزِّع — لا كتعليقٍ شارح");
  //  **والمنطقُ لا النصُّ وحده**: مسار البيع (`device_sale`) لا يفتح إلّا
  //  نافذةَ «بلا معاينة»، وتلك لم يعد فيها `FULL_DEVICE` معروضاً **لأيّ
  //  قسم** (قرارُ المالك بعد ٢٤٩) — لا للأطراف ولا للمساند.
  const noExamDialogCode = code(NO_EXAM_DIALOG);
  check(!/<SelectItem value=\{FULL_DEVICE\}>/.test(noExamDialogCode),
    "١٥. **ولا «جهاز كامل» معروضٌ للبيع في النافذة لأيّ قسم**",
    (noExamDialogCode.match(/.*FULL_DEVICE.*/g) ?? []).join("\n"));
  check(!/FULL_DEVICE_LABELS\.medical_support/.test(noExamDialogCode),
    "١٥.ب **ولا «مسند طبي كامل» بينها بعد اليوم** — بابُه المعاينة");
  check(/PROSTHETIC_COMPONENTS\.map/.test(noExamDialogCode),
    "١٦. وقائمةُ البيع من `PROSTHETIC_COMPONENTS` وحدها — لا الجهاز الكامل بينها");
  //  **وبابُ الطرف الكامل هو المعاينة**: خيارُ «يحتاج معاينة طبية» يفتح
  //  نافذةً مسارُها `"exam"` ثابت — فلا سبيلَ لطرفٍ كاملٍ إلى `no_exam`.
  check(/servicePath: "exam"/.test(deviceModalCode)
    && !/servicePath: "no_exam"/.test(deviceModalCode),
  "١٦.ب **ولا مسارَ `no_exam` يخرج من نافذة الجهاز إطلاقاً**");

  // ══ (هـ) بلا قائمة أجزاء مسانِد مخترَعة ═══════════════════════════════
  console.log("\n── بلا قائمة أجزاء مسانِد مخترَعة ──");
  const supportPartWords = ["جزء من مسند", "أجزاء المسند", "أجزاء مسانِد", "قطعة مسند"];
  for (const w of supportPartWords) {
    check(!routingCode.includes(w), `١٧. **ولا «${w}» كشيفرةٍ فعلية في مصدر الموزِّع**`);
  }
  check(!PROSTHETIC_COMPONENTS.some((c) => routingCode.includes(c)),
    "١٨. **ولا اسمَ جزءٍ واحداً من القائمة القانونية مكتوباً هنا** — الاختيارُ يذهب إلى النافذة القائمة فتقرأها هي");
  check(/\{serviceType === "prosthetic" && \(\s*<div className="space-y-1\.5">\s*<Label className="text-sm font-medium">الجزء المراد صيانته<\/Label>/.test(NO_EXAM_DIALOG),
    "١٩. **ومحدِّدُ جزء الصيانة مقصورٌ على الأطراف وحدها في النافذة القائمة**",
    (NO_EXAM_DIALOG.match(/.*الجزء المراد صيانته.*/g) ?? []).join("\n"));

  // ══ (هـ٢) والمساندُ لا تبلغ بيعاً من هذه النافذة إطلاقاً ════════════════
  //  ثلاثُ طبقاتٍ متعاضدة، ولا واحدةٌ تكفي وحدها:
  //    · التوجيهُ لا يعرض الخيار (أُثبت في ٤ و١٠ أعلاه)
  //    · والنافذةُ تحسم النوعَ صيانةً ولو وصلها `initialKind` ملفَّق
  //    · والخادمُ يردّ (`test:parts` و`test:pending-charge`)
  console.log("\n── والمساندُ لا تُباع من نافذة «بلا معاينة» ──");
  check(/serviceType === "medical_support"\s*\?\s*"maintenance"/.test(noExamDialogCode),
    "١٩.ب **والمساندُ صيانةٌ حتماً قبل أن يُقرأ `initialKind` أصلاً**");
  //  **والترتيبُ هو الحارس**: لو قُرئ `initialKind` أوّلاً لسبق البيعُ المنعَ.
  {
    const m = noExamDialogCode.match(
      /const fixedKind: Kind \| null =([\s\S]{0,220}?);\n/);
    const body = m?.[1] ?? "";
    check(body.indexOf("medical_support") >= 0
      && body.indexOf("medical_support") < body.indexOf("initialKind"),
    "١٩.ج **وشرطُ المساند يسبق `initialKind` في التعبير** — فلا يلتفّ عليه",
    body.trim());
  }
  //  والحقلُ الذي يسأل «ما الذي بيع؟» لا يُعرَض إلّا حين يكون النوعُ بيعاً،
  //  والمساندُ لا تبلغه — فلا محدِّدَ معطَّلٌ فيه ولا قيمةٌ «كاملة» تُحشى له.
  check(!/disabled=\{serviceType !== "prosthetic"\}/.test(noExamDialogCode),
    "١٩.د **ولا محدِّدَ بيعٍ معطَّلٍ للمساند** — الحقلُ لا يبلغها لا أنه يُعطَّل لها");
  check(!/serviceType === "prosthetic" \? "" : FULL_DEVICE/.test(noExamDialogCode),
    "١٩.هـ **ولا «جهازٌ كامل» يُحشى قيمةً ابتدائية للمساند**");
  check(!/requestedItem \|\| FULL_DEVICE/.test(noExamDialogCode),
    "١٩.و **ولا احتياطَ بـ`full_device` في الإرسال** — كان يطلب ما يردّه الخادم");

  // ══ (هـ٣) حالاتُ الخبير أربعٌ تُقال، لا واحدةٌ تُخفي ثلاثاً ══════════════
  //  كانت `data: experts = []` تسوّي بين «يُحمَّل» و«فشل» و«لا خبيرَ في
  //  الفرع»: حقلٌ فارغٌ لا يفتح ولا يشرح، فيظنّ الموظّفُ النظامَ معطَّلاً.
  console.log("\n── حالاتُ حقل الخبير ──");
  check(!/const \{ data: experts = \[\] \}/.test(noExamDialogCode),
    "٢٠.أ **ولا قائمةٌ فارغة تبتلع ثلاثَ حالات**");
  for (const [id, label] of [
    ["no-exam-op-expert-loading", "التحميلُ يُقال"],
    ["no-exam-op-expert-error", "وفشلُ الطلب يُقال"],
    ["no-exam-op-expert-empty", "وخلوُّ الفرع يُقال"],
    ["no-exam-op-expert", "ويبقى الحقلُ الطبيعيّ حين يوجد خبير"],
  ] as const) {
    check(noExamDialogCode.includes(`data-testid="${id}"`), `٢٠. ${label} (${id})`);
  }
  check(noExamDialogCode.includes("لا يوجد خبير متاح لهذا الفرع"),
    "٢٠.ب **وبالنصّ الذي طلبه المالك حرفاً**");
  check(/expertsLoading \? \([\s\S]{0,400}?expertsFailed \? \([\s\S]{0,400}?expertsEmpty \? \(/
    .test(noExamDialogCode),
  "٢٠.ج **وبترتيبٍ يفرّق بينها**: تحميلٌ ثمّ فشلٌ ثمّ خلوّ ثمّ الحقل");
  //  **ولا يُخمَّن خبير** في أيٍّ من الحالات الثلاث.
  check(!/expertId, setExpertId\] = useState<string>\((?!""\))/.test(noExamDialogCode)
    && /const \[expertId, setExpertId\] = useState<string>\(""\)/.test(noExamDialogCode),
  "٢٠.د **ولا خبيرَ مُخمَّنٌ افتراضاً** — الغيابُ يُقال غياباً");

  // ══ (و) العلمُ الأحاديّ الاستعمال ═══════════════════════════════════════
  console.log("\n── العلمُ الأحاديّ الاستعمال ──");
  {
    const store = fakeStore();
    markReceptionRoutingPending(store, 501);
    same("٢٠. **مريضٌ سُجِّل ⇒ العلمُ يُقرَأ مرّةً بـ`true`**",
      takeReceptionRoutingPending(store, 501), true);
    same("٢١. **والتحديثُ التالي لا يعيد فتحه** — القراءةُ مسحته",
      takeReceptionRoutingPending(store, 501), false);
  }
  {
    const store = fakeStore();
    markReceptionRoutingPending(store, 501);
    same("٢٢. **وعلمُ مريضٍ آخر لا يُفتَح لمريضٍ غيره**",
      takeReceptionRoutingPending(store, 999), false);
    same("٢٣. **وقد مُسِح رغم عدم التطابق**",
      takeReceptionRoutingPending(store, 501), false);
  }
  same("٢٤. وبلا مخزَّنٍ (بيئةٌ لا `sessionStorage` فيها) ⟶ لا يُفتَح ولا يرمي",
    takeReceptionRoutingPending(null, 501), false);
  check(
    (() => { try { markReceptionRoutingPending(null, 501); return true; } catch { return false; } })(),
    "٢٥. والتخزينُ بلا مخزَّنٍ لا يرمي كذلك",
  );
  same("٢٦. ومعرّفٌ غيرُ صالح ⟶ لا يُخزَّن شيء",
    (() => { const s = fakeStore(); markReceptionRoutingPending(s, -1); return s.getItem("bcm.reception_routing_open_once"); })(),
    null);

  // ══ العلاجُ الطبيعي لا يُمَسّ ═════════════════════════════════════════
  console.log("\n── العلاج الطبيعي لا يُمَسّ ──");
  check(!routingCode.includes("physiotherapy"),
    "٢٧. **ولا ذكرَ للعلاج الطبيعي في مصدر التوجيه إطلاقاً**");
  //  ولا حقيقةً إدارية («سبق أن تعامل مع المركز») تقرّر المسار.
  check(!/hadPriorCenterHistory|had_prior_center_history/.test(ROUTING),
    "٢٩. **ولا أثر لِـ`hadPriorCenterHistory` في قرار التوجيه** — لا يقرّر المسار");

  // ══ (ز) عقدُ الأسلاك ═══════════════════════════════════════════════════
  console.log("\n── عقدُ الأسلاك ──");

  // التسجيلُ يُخزِّن العلمَ عند النجاح، قبل أو مع الانتقال.
  check(/onSuccess: \(data\) => \{/.test(CREATE_PATIENT)
    && /markReceptionRoutingPending\(sessionResumeStore\(\), data\.id\)/.test(CREATE_PATIENT),
    "٣٠. **CreatePatient تُخزِّن العلمَ في نجاح التسجيل**");
  check(/setLocation\(`\/patients\/\$\{data\.id\}`\)/.test(CREATE_PATIENT),
    "وتنتقل إلى صفحة المريض كما كانت — بلا تغييرٍ في الوجهة");

  // الموزِّعُ يقرأ العلمَ ويفتح المُوجِّه — ولا ينادي نقطة نهاية بنفسه.
  check(/takeReceptionRoutingPending\(sessionResumeStore\(\), patient\.id\)/.test(LAUNCHER),
    "٣٢. ويقرؤه بمعرّف المريض الحاليّ بعينه");
  check(/if \(pending\) setRoutingOpen\(true\)/.test(LAUNCHER),
    "٣٣. **ويفتح المُوجِّهَ حين يُستحقّ — لا افتراضياً**");
  check(/onClick=\{\(\) => chooseFlow\(choice\.flow\)\}/.test(LAUNCHER),
    "٣٥. **والاختيارُ يمرّ بنفس دالّة فتح المسار التي تستعملها القائمة الكاملة**");

  // ولا نظام توجيهٍ ثانٍ: الموزِّعُ ما زال بلا شبكة، ولا نقطة نهاية جديدة.
  for (const forbidden of ["fetch(", "apiRequest(", "useMutation"]) {
    check(!launcherCode.includes(forbidden), `٣٧. ولا «${forbidden}» في الموزِّع بعد إضافة المُوجِّه`);
  }
  const launcherEndpoints = [...launcherCode.matchAll(/["'`](\/api\/[^"'`]*)/g)].map((m) => m[1]);
  same("٣٨. **ولا نقطةَ جديدة أُضيفت** — القراءةُ نفسُها وحدها",
    launcherEndpoints, ["/api/patients/${patient.id}/device-episodes"]);
  check(!routingCode.includes("/api/"),
    "٣٩. **وملفُّ منطق التوجيه بلا أيّ نقطة نهاية** — موزِّعٌ فوق موزِّع لا نظامٌ ثانٍ");

  // والنافذةُ القائمة (`NoExamOperationDialog`) تقبل النوعَ المحسوم وتقولُه
  // نصّاً — ولا نافذةَ جديدة أُنشئت لهذا الغرض.
  check(/initialKind\?: Kind;/.test(NO_EXAM_DIALOG),
    "٤٠. **والنافذةُ القائمة اكتسبت خاصّيةً اختيارية واحدة فقط**");
  //  ══ **والمحسومُ نصٌّ يُقرأ لا محدِّدٌ معطَّل** ═══════════════════════════
  //  المحدِّدُ المعطَّل يبدو عطباً: يضغطه الموظّفُ فلا يفتح، فيظنّ الشاشةَ
  //  مكسورةً أو صلاحيتَه ناقصة. والنصُّ يقول القرارَ وسببَه.
  check(/data-testid="no-exam-op-kind-fixed"/.test(noExamDialogCode),
    "٤١. **ونوعُ العملية المحسومُ يُعرَض نصّاً صريحاً**");
  check(!/disabled=\{Boolean\(existingEpisodeId\) \|\| initialKind !== undefined\}/
    .test(noExamDialogCode),
  "٤١.ب **ولا محدِّدَ معطَّلٍ يبدو مكسوراً** — الحقلُ المحسوم لا يُعرَض حقلاً");
  check(/const fixedKind: Kind \| null = serviceType === "medical_support"\s*\?\s*"maintenance"/
    .test(noExamDialogCode),
  "٤١.ج **والمساندُ صيانةٌ حتماً — حارسٌ بنيويّ لا إخفاءُ خيار**");
  check(/\{fixedKind \? \(/.test(noExamDialogCode),
    "٤١.د والنصُّ يحلّ محلّ المحدِّد متى حُسم النوع");
  check(/type Kind = PendingChargeKind;/.test(NO_EXAM_DIALOG),
    "٤٢. **ونوعُ العملية من `shared/pending_charge` القانونيّ — لا نسخةٌ محلّية**");
  check(/initialKind\?: PendingChargeKind;/.test(LAUNCHER_LOGIC),
    "٤٣. والحقلُ في `ServiceFlow` من المصدر القانونيّ نفسه");
  check(/initialKind=\{flow\.initialKind\}/.test(LAUNCHER),
    "٤٤. **والموزِّعُ يمرّر ما اختاره المُوجِّه بلا تعديل**");

  // ══ (ح) زرُّ رأس الصفحة يفتح **الحوارَ نفسَه** ═════════════════════════
  //  السؤالُ الأوّل الذي يُطرَح على كلّ مريض جهاز — فمكانُه حيث تقع العينُ
  //  أوّلاً. **ولا نسخةَ ثانية من الحوار** تُبنى في الصفحة فتنحرف عنه.
  console.log("\n── زرُّ رأس الصفحة ──");
  const detailsCode = code(DETAILS);
  check(detailsCode.includes("button-header-reception-routing"),
    "١٦.أ **وزرٌّ في رأس الصفحة بجوار الاسم والرمز**");
  check(/\{RECEPTION_ROUTING_QUESTION\}/.test(detailsCode)
    && /import \{ RECEPTION_ROUTING_QUESTION \}/.test(detailsCode),
  "١٦.ب بعنوانِ السؤال نفسِه من مصدره — لا نصّاً منسوخاً");
  check(/routingOpen=\{routingOpen\}/.test(detailsCode)
    && /onRoutingOpenChange=\{setRoutingOpen\}/.test(detailsCode),
  "١٦.ج **ويفتح حوارَ الموزِّع نفسَه إدارةً** — لا حواراً ثانياً");
  //  **ولا نسخةَ ثانية**: الصفحةُ لا تعرف الخيارات ولا تبني حواراً.
  for (const forbidden of ["receptionRoutingGroups", "receptionRoutingChoices",
    "receptionRoutingDepartments"]) {
    check(!detailsCode.includes(forbidden),
      `١٦.د **ولا «${forbidden}» في الصفحة** — الخياراتُ يعرفها الموزِّع وحده`);
  }
  same("١٦.هـ **وحوارُ المُوجِّه واحدٌ في الموزِّع لا أكثر**",
    (launcherCode.match(/open=\{routingOpen\} onOpenChange=\{setRoutingOpen\}/g) ?? []).length, 1);
  //  والبوّابةُ نفسُها بلا توسيع.
  check(/permissions\.canAddPatients\s*\n?\s*&& \(!!patient\.isAmputee \|\| !!patient\.isMedicalSupport\)/.test(detailsCode),
    "١٦.و **والبوّابةُ `canAddPatients` نفسُها** — ولمريض الأجهزة وحده");
  //  والموزِّعُ يقبل الإدارة ويبقى عاملاً بلا — نفسُ نمط بقيّة النوافذ.
  check(/const routingControlled = routingOpenProp !== undefined;/.test(launcherCode)
    && /if \(!routingControlled\) setRoutingOpenSelf\(v\);\s*onRoutingOpenChange\?\.\(v\);/.test(launcherCode),
  "١٦.ز ويبقى الفتحُ الداخليّ (بعد التسجيل) عاملاً بلا إدارةٍ من الخارج");
  //  **والتبويبُ يعود إلى مكانه**: الموزِّعُ داخل تبويب «الزيارات»، وتبويبُ
  //  Radix غيرُ النشط يُفكَّك — فزرٌّ لا يعيده كان يفتح حواراً لا يُركَّب.
  check(/setTab\("visits"\); setRoutingOpen\(true\);/.test(detailsCode),
    "١٦.ح **ويعيد التبويبَ إلى مكانه قبل الفتح** — وإلّا ضُغط من تبويبٍ آخر فلا يظهر شيء");
  check(/<Tabs value=\{tab\} onValueChange=\{setTab\}/.test(detailsCode),
    "والتبويبُ مُدارٌ لذلك السبب وحده");

  // ══ لا اعتمادٌ ضمنيّ ═══════════════════════════════════════════════════
  console.log("\n── لا اعتمادٌ ضمنيّ ──");
  check(/Dialog open=\{routingOpen\} onOpenChange=\{setRoutingOpen\}/.test(LAUNCHER),
    "٤٥. **والإغلاقُ يبدّل رؤيةً فحسب — بلا نداءٍ لفتح مسار**");
  check(!/setRoutingOpen\(true\)[\s\S]{0,40}chooseFlow/.test(LAUNCHER),
    "٤٦. ولا شيءَ يُفتح تلقائياً عند إظهار المُوجِّه");
  //  ولا خيارَ جهازٍ بقي في «إضافة خدمة جديدة» ينافس المُوجِّه.
  same("٤٧. **ولا بابَ جهازٍ في قائمة «إضافة خدمة جديدة»**",
    launcherOptions(DUAL as any).map((o) => o.flow.kind)
      .filter((k) => k === "device_episode" || k === "no_exam_operation"), []);

  console.log(failures === 0 ? "\n✅ all reception-routing cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
