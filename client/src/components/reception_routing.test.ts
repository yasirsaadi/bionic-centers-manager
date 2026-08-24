// مُوجِّهُ «ما سبب حضور المريض اليوم؟» — منطقٌ خالص وعقدُ الواجهة.
// `npm run test:reception-routing` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **قرارُ التوجيه** خالصاً: ثلاثةُ خياراتٍ لكلّ قسم، وإلى أيّ مسارٍ
//     قائم يذهب كلّ خيار.
// (ب) **بلا «شراء طرف صناعي كامل»** بين الخيارات — والدليلُ نصّيٌّ
//     ومنطقيّ معاً.
// (ج) **بلا قائمة أجزاء مسانِد مخترَعة** — لا في هذا الملفّ ولا فيما
//     يفتحه.
// (د) **العلمُ الأحاديّ الاستعمال**: يُفتَح مرّةً ولا يعاود التحديثُ فتحَه.
// (هـ) **عقدُ الأسلاك**: التسجيلُ يُخزِّن، والموزِّعُ يقرأ ويفتح، والنوافذ
//     القائمة (`NewDeviceEpisodeModal` / `NoExamOperationDialog`) تُفتَح
//     دون تكرار منطقها.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **تصيير React نفسه**: المشروع بلا مشغّل DOM (انظر تعليق
// `patient_service_launcher.test.ts`) — فالضغطُ الفعليّ وفتحُ النوافذ
// مفحوصان ساكناً من مصدر الشيفرة لا مُشغَّلين.

import { readFileSync } from "fs";
import { join } from "path";
import {
  RECEPTION_ROUTING_QUESTION, receptionRoutingChoices, receptionRoutingServiceType,
  markReceptionRoutingPending, takeReceptionRoutingPending,
} from "./reception_routing";
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

function main() {
  // ══ (أ) القرار: ثلاثةُ خيارات لكلّ قسم ═════════════════════════════════
  console.log("\n── قرارُ التوجيه ──");

  same("١. والسؤالُ نصّاً واحداً ثابتاً",
    RECEPTION_ROUTING_QUESTION, "ما سبب حضور المريض اليوم؟");

  const pro = receptionRoutingChoices("prosthetic");
  same("٢. **ثلاثةُ خياراتٍ للأطراف لا رابع**", pro.map((c) => c.id),
    ["exam_required", "device_sale", "maintenance"]);
  same("٣. وعناوينُها بالضبط", pro.map((c) => c.label), [
    "يحتاج معاينة طبية", "شراء جزء من طرف صناعي", "صيانة طرف صناعي",
  ]);

  const sup = receptionRoutingChoices("medical_support");
  same("٤. **وثلاثةُ خياراتٍ للمساند لا رابع**", sup.map((c) => c.id),
    ["exam_required", "device_sale", "maintenance"]);
  same("٥. وعناوينُها بالضبط", sup.map((c) => c.label), [
    "يحتاج معاينة طبية", "شراء مسند طبي", "صيانة مسند طبي",
  ]);

  // ══ إلى أيّ مسارٍ قائم يذهب كلّ خيار ═══════════════════════════════════
  console.log("\n── وجهةُ كلّ خيار ──");

  same("٦. **«يحتاج معاينة طبية» ⇒ نافذةُ «جهاز جديد» القائمة**",
    pro.find((c) => c.id === "exam_required")?.flow,
    { kind: "device_episode", serviceType: "prosthetic" });
  same("والمساندُ كذلك",
    sup.find((c) => c.id === "exam_required")?.flow,
    { kind: "device_episode", serviceType: "medical_support" });
  //  **بلا فرضِ شيء**: لا `requestedItem` ولا `servicePath` مضبوطان
  //  مسبقاً — النافذةُ القائمةُ تسأل الموظّفَ كما كانت تفعل دائماً.
  {
    const flow = pro.find((c) => c.id === "exam_required")?.flow as any;
    check(!("requestedItem" in flow) && !("servicePath" in flow),
      "٧. **ولا يُفرَض مطلوبٌ ولا مسارُ معاينة سلفاً** — النافذةُ تسأل كما كانت",
      JSON.stringify(flow));
  }

  same("٨. **«شراء جزء من طرف صناعي» ⇒ نافذةُ «بلا معاينة» بنوع بيع محسوم**",
    pro.find((c) => c.id === "device_sale")?.flow,
    { kind: "no_exam_operation", serviceType: "prosthetic", initialKind: "device_sale" });
  same("٩. **«صيانة طرف صناعي» ⇒ النافذةُ نفسُها بنوع صيانة محسوم**",
    pro.find((c) => c.id === "maintenance")?.flow,
    { kind: "no_exam_operation", serviceType: "prosthetic", initialKind: "maintenance" });
  same("١٠. **«شراء مسند طبي» ⇒ النافذةُ نفسُها لخدمة المساند**",
    sup.find((c) => c.id === "device_sale")?.flow,
    { kind: "no_exam_operation", serviceType: "medical_support", initialKind: "device_sale" });
  same("١١. **«صيانة مسند طبي» ⇒ النافذةُ نفسُها لخدمة المساند**",
    sup.find((c) => c.id === "maintenance")?.flow,
    { kind: "no_exam_operation", serviceType: "medical_support", initialKind: "maintenance" });

  //  **ونافذةُ «بلا معاينة» واحدة للبيع والصيانة معاً** — لا نافذتان.
  same("١٢. ونافذةُ البيع والصيانة هي نفسُها (`no_exam_operation`)",
    [...new Set(pro.filter((c) => c.id !== "exam_required").map((c) => c.flow.kind))],
    ["no_exam_operation"]);

  // ══ (ب) بلا «شراء طرف صناعي كامل» بين الخيارات ═════════════════════════
  console.log("\n── بلا «شراء طرف صناعي كامل» ──");
  const allLabels = [...pro, ...sup].map((c) => c.label);
  check(!allLabels.some((l) => l.includes("طرف صناعي كامل")),
    "١٣. **ولا خيارٌ واحد يذكر «طرف صناعي كامل»**", allLabels.join(" | "));
  check(!code(ROUTING).includes("شراء طرف صناعي كامل"),
    "١٤. ولا هذا النصّ بعينه **كشيفرةٍ فعلية** في مصدر الموزِّع — لا كتعليقٍ شارح");
  //  **والمنطقُ لا النصُّ وحده**: مسار البيع (`device_sale`) لا يفتح إلّا
  //  نافذةَ «بلا معاينة»، وتلك — بلا أيّ تغيير هنا — لا تعرض `FULL_DEVICE`
  //  للأطراف مطلقاً (السطرُ الوحيد الذي يعرضه مقصورٌ على `medical_support`).
  check(/serviceType === "medical_support" && \(\s*<SelectItem value=\{FULL_DEVICE\}>/.test(NO_EXAM_DIALOG)
    || /medical_support" &&[\s\S]{0,80}<SelectItem value=\{FULL_DEVICE\}>/.test(NO_EXAM_DIALOG),
    "١٥. **والطرفُ الكاملُ مقصورٌ على المساند وحدها في نافذة البيع**",
    (NO_EXAM_DIALOG.match(/.*FULL_DEVICE.*/g) ?? []).join("\n"));
  check(/serviceType === "prosthetic" && PROSTHETIC_COMPONENTS\.map/.test(NO_EXAM_DIALOG),
    "١٦. وقائمةُ بيع الأطراف من `PROSTHETIC_COMPONENTS` وحدها — لا الجهاز الكامل بينها");

  // ══ (ج) بلا قائمة أجزاء مسانِد مخترَعة ══════════════════════════════════
  console.log("\n── بلا قائمة أجزاء مسانِد مخترَعة ──");
  //  لا واحدةٌ من الأجزاء الثمانية القانونية (الخاصّة بالأطراف حصراً) تظهر
  //  في هذا الملفّ منسوبةً إلى المساند — ولا أيُّ اسمِ جزءٍ عربيّ آخر
  //  («جزء من مسند» ونحوه) اختُرع فيه.
  const supportPartWords = ["جزء من مسند", "أجزاء المسند", "أجزاء مسانِد", "قطعة مسند"];
  const routingCode = code(ROUTING);
  for (const w of supportPartWords) {
    check(!routingCode.includes(w), `١٧. **ولا «${w}» كشيفرةٍ فعلية في مصدر الموزِّع**`);
  }
  check(!PROSTHETIC_COMPONENTS.some((c) => routingCode.includes(c)),
    "١٨. **ولا اسمَ جزءٍ واحداً من القائمة القانونية مكتوباً هنا** — الاختيارُ يذهب إلى النافذة القائمة فتقرأها هي");
  //  والنافذةُ القائمة (بلا أيّ تغيير في هذا الجانب) لا تعرض محدِّد «الجزء
  //  المراد صيانته» إلّا للأطراف — والمساندُ بلا محدِّدٍ إطلاقاً.
  check(/\{serviceType === "prosthetic" && \(\s*<div className="space-y-1\.5">\s*<Label className="text-sm font-medium">الجزء المراد صيانته<\/Label>/.test(NO_EXAM_DIALOG),
    "١٩. **ومحدِّدُ جزء الصيانة مقصورٌ على الأطراف وحدها في النافذة القائمة**",
    (NO_EXAM_DIALOG.match(/.*الجزء المراد صيانته.*/g) ?? []).join("\n"));

  // ══ (د) العلمُ الأحاديّ الاستعمال ═══════════════════════════════════════
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
    // ٢٢. علمٌ لمريضٍ آخر لا يُستأنف لهذا — نفسُ درسِ `device_flow_resume`.
    const store = fakeStore();
    markReceptionRoutingPending(store, 501);
    same("٢٢. **وعلمُ مريضٍ آخر لا يُفتَح لمريضٍ غيره**",
      takeReceptionRoutingPending(store, 999), false);
    //  والمسحُ يقع حتى عند عدم التطابق — فلا يبقى معلَّقاً لصاحبه لاحقاً.
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
  same("٢٧. مريضُ علاجٍ طبيعيّ فقط ⟶ لا قسمَ توجيه",
    receptionRoutingServiceType({ isPhysiotherapy: true } as any), null);
  same("وبلا أيّ علمٍ إطلاقاً ⟶ لا قسم", receptionRoutingServiceType({}), null);
  same("٢٨. أطرافٌ ⟶ prosthetic", receptionRoutingServiceType({ isAmputee: true }), "prosthetic");
  same("مساندٌ ⟶ medical_support",
    receptionRoutingServiceType({ isMedicalSupport: true }), "medical_support");
  //  ولا حقيقةً إدارية («سبق أن تعامل مع المركز») تقرّر المسار — الدالّةُ
  //  لا تعرفها إطلاقاً.
  check(!/hadPriorCenterHistory|had_prior_center_history/.test(ROUTING),
    "٢٩. **ولا أثر لِـ`hadPriorCenterHistory` في قرار التوجيه** — لا يقرّر المسار");

  // ══ (هـ) عقدُ الأسلاك ═══════════════════════════════════════════════════
  console.log("\n── عقدُ الأسلاك ──");

  // التسجيلُ يُخزِّن العلمَ عند النجاح، قبل أو مع الانتقال.
  check(/onSuccess: \(data\) => \{/.test(CREATE_PATIENT)
    && /markReceptionRoutingPending\(sessionResumeStore\(\), data\.id\)/.test(CREATE_PATIENT),
    "٣٠. **CreatePatient تُخزِّن العلمَ في نجاح التسجيل**");
  check(/setLocation\(`\/patients\/\$\{data\.id\}`\)/.test(CREATE_PATIENT),
    "وتنتقل إلى صفحة المريض كما كانت — بلا تغييرٍ في الوجهة");

  // الموزِّعُ يقرأ العلمَ ويفتح المُوجِّه — ولا ينادي نقطة نهاية بنفسه.
  check(/import \{[\s\S]{0,200}takeReceptionRoutingPending[\s\S]{0,10}\} from "\.\/reception_routing";/.test(LAUNCHER),
    "٣١. **والموزِّعُ يستورد العلمَ من مصدره الوحيد**");
  check(/takeReceptionRoutingPending\(sessionResumeStore\(\), patient\.id\)/.test(LAUNCHER),
    "٣٢. ويقرؤه بمعرّف المريض الحاليّ بعينه");
  check(/if \(pending\) setRoutingOpen\(true\)/.test(LAUNCHER),
    "٣٣. **ويفتح المُوجِّهَ حين يُستحقّ — لا افتراضياً**");
  //  والفتحُ داخل `useEffect` معتمدٌ على `patient.id` — لا عند كل تصيير.
  check(/useEffect\(\(\) => \{\s*if \(!routingServiceType\) return;\s*const pending = takeReceptionRoutingPending/.test(LAUNCHER),
    "٣٤. وداخل أثرٍ يتبع تركيب الصفحة لا كلَّ تصيير");

  //  والاختيارُ يفتح المسارَ القائم عبر نفس `flow` الذي يفتحه «إضافة خدمة
  //  جديدة» — لا حالةَ ثانية ولا شرطَ تصيير مواز.
  check(/onClick=\{\(\) => chooseFlow\(choice\.flow\)\}/.test(LAUNCHER),
    "٣٥. **والاختيارُ يمرّ بنفس دالّة فتح المسار التي تستعملها القائمة الكاملة**");
  check(/function chooseFlow\(newFlow: ServiceFlow\)/.test(LAUNCHER)
    && /function choose\(option: LauncherOption\) \{\s*if \(option\.disabled\) return;\s*chooseFlow\(option\.flow\);/.test(LAUNCHER),
    "٣٦. **ولا نسخةَ ثانية من منطق فتح المسار** — `choose` القديمة تستدعي نفس الدالّة");

  // ولا نظام توجيهٍ ثانٍ: الموزِّعُ ما زال بلا شبكة، ولا نقطة نهاية جديدة.
  const launcherCode = code(LAUNCHER);
  for (const forbidden of ["fetch(", "apiRequest(", "useMutation"]) {
    check(!launcherCode.includes(forbidden), `٣٧. ولا «${forbidden}» في الموزِّع بعد إضافة المُوجِّه`);
  }
  const launcherEndpoints = [...launcherCode.matchAll(/["'`](\/api\/[^"'`]*)/g)].map((m) => m[1]);
  same("٣٨. **ولا نقطةَ جديدة أُضيفت** — القراءةُ نفسُها وحدها",
    launcherEndpoints, ["/api/patients/${patient.id}/device-episodes"]);
  check(!routingCode.includes("/api/"),
    "٣٩. **وملفُّ منطق التوجيه بلا أيّ نقطة نهاية** — موزِّعٌ فوق موزِّع لا نظامٌ ثانٍ");

  // والنافذةُ القائمة (`NoExamOperationDialog`) تقبل النوعَ المحسوم وتُعطِّل
  // محدِّده — ولا نافذةَ جديدة أُنشئت لهذا الغرض.
  check(/initialKind\?: Kind;/.test(NO_EXAM_DIALOG),
    "٤٠. **والنافذةُ القائمة اكتسبت خاصّيةً اختيارية واحدة فقط**");
  check(/disabled=\{Boolean\(existingEpisodeId\) \|\| initialKind !== undefined\}/.test(NO_EXAM_DIALOG),
    "٤١. ومحدِّدُ «نوع العملية» يُعطَّل حين يُحسَم مسبقاً — فلا يُعاد سؤالٌ أُجيب عنه");
  check(/type Kind = PendingChargeKind;/.test(NO_EXAM_DIALOG),
    "٤٢. **ونوعُ العملية من `shared/pending_charge` القانونيّ — لا نسخةٌ محلّية**");
  check(/initialKind\?: PendingChargeKind;/.test(LAUNCHER_LOGIC),
    "٤٣. والحقلُ في `ServiceFlow` من المصدر القانونيّ نفسه");

  // وملفُّ الموزِّع الرئيسيّ يمرّر الحقل ولا يخترع قيمةً.
  check(/initialKind=\{flow\.initialKind\}/.test(LAUNCHER),
    "٤٤. **والموزِّعُ يمرّر ما اختاره المُوجِّه بلا تعديل**");

  // ══ لا اعتمادٌ ضمنيّ ═══════════════════════════════════════════════════
  console.log("\n── لا اعتمادٌ ضمنيّ ──");
  //  إغلاقُ المُوجِّه بلا اختيارٍ (خارج النافذة أو Escape) لا يستدعي
  //  `chooseFlow` — فلا مسارَ يُفتَح نيابةً عن الموظّف.
  check(/Dialog open=\{routingOpen\} onOpenChange=\{setRoutingOpen\}/.test(LAUNCHER),
    "٤٥. **والإغلاقُ يبدّل رؤيةً فحسب — بلا نداءٍ لفتح مسار**");
  check(!/setRoutingOpen\(true\)[\s\S]{0,40}chooseFlow/.test(LAUNCHER),
    "٤٦. ولا شيءَ يُفتح تلقائياً عند إظهار المُوجِّه");

  console.log(failures === 0 ? "\n✅ all reception-routing cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
