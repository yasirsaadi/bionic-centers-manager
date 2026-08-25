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
import { launcherOptions, type LauncherOption } from "./patient_service_launcher_logic";
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

const opt = (list: LauncherOption[], id: string) => list.find((o) => o.id === id)!;

const ROUTING = read("reception_routing.ts");
const LAUNCHER = read("PatientServiceLauncher.tsx");
const NO_EXAM_DIALOG = read("NoExamOperationDialog.tsx");
const CREATE_PATIENT = read("..", "pages", "CreatePatient.tsx");
const LAUNCHER_LOGIC = read("patient_service_launcher_logic.ts");
const DEVICE_EPISODE_MODAL = read("NewDeviceEpisodeModal.tsx");

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

  same("٦. **«يحتاج معاينة طبية» ⇒ نافذةُ «جهاز جديد» القائمة، بمسارٍ ثابت «معاينة طبية»**",
    pro.find((c) => c.id === "exam_required")?.flow,
    {
      kind: "device_episode", serviceType: "prosthetic",
      initialServicePath: "exam", fromReceptionRouting: true,
    });
  same("والمساندُ كذلك",
    sup.find((c) => c.id === "exam_required")?.flow,
    {
      kind: "device_episode", serviceType: "medical_support",
      initialServicePath: "exam", fromReceptionRouting: true,
    });
  //  **والمطلوبُ وحده يبقى مفتوحاً**: لا `requestedItem` مضبوطٌ مسبقاً —
  //  النافذةُ القائمةُ تسأل عن «ما المطلوب؟» كما كانت تفعل دائماً. والثباتُ
  //  على مسار المعاينة وحده، لا على المطلوب.
  {
    const flow = pro.find((c) => c.id === "exam_required")?.flow as any;
    check(!("requestedItem" in flow),
      "٧. **ولا يُفرَض مطلوبٌ سلفاً** — النافذةُ تسأل «ما المطلوب؟» كما كانت",
      JSON.stringify(flow));
    same("والمسارُ «exam» بالضبط، وعلمُ الثبات مرفوع", flow.initialServicePath, "exam");
    same("و`fromReceptionRouting` صريحةٌ `true`", flow.fromReceptionRouting, true);
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

  // ══ مسارُ المعاينة ثابتٌ من مُوجِّه الحضور — بلا محدِّدٍ داخليّ ═══════════
  //  **تصحيحٌ لاحق**: تبديلُ المسار داخل النافذة من «exam» إلى «no_exam»
  //  لا يقول أهو بيعُ جزءٍ أم صيانة، وقد يترك حلقةً مفتوحةً بمسارٍ ناقص
  //  المعنى قبل تسجيل العملية الصحيحة. فصار مسارُ «يحتاج معاينة طبية»
  //  **ثابتاً** بلا محدِّدٍ إطلاقاً، وزرُّ «تغيير سبب الحضور» يعيد الموظّفَ
  //  إلى المُوجِّه نفسِه ليختار بدقّة — لا تبديلاً داخلياً.
  console.log("\n── مسارُ المعاينة ثابتٌ من مُوجِّه الحضور — بلا محدِّدٍ داخليّ ──");

  const deviceModalCode = code(DEVICE_EPISODE_MODAL);
  const launcherCodeForRouting = code(LAUNCHER);

  //  (١) النافذةُ القائمة اكتسبت خاصّيتين اختياريتين فقط.
  check(/fromReceptionRouting\?: boolean;/.test(deviceModalCode),
    "١٢.ب **والنافذةُ القائمة اكتسبت خاصّيتين اختياريتين فقط** — `fromReceptionRouting` و`onChangeReason`");
  check(/onChangeReason\?: \(\) => void;/.test(deviceModalCode),
    "وكلتاهما بلا مسّ أيّ خاصّيةٍ قائمة");

  //  (٢) ومحدِّدُ «هل تحتاج معاينة؟» **يختفي بالكامل** حين `fromReceptionRouting`
  //  — لا `disabled` على محدِّدٍ ظاهر، بل غيابٌ تامّ واستبدالٌ بنصٍّ ثابت.
  check(/\{fromReceptionRouting \? \(/.test(deviceModalCode),
    "١٢.ج **ومحدِّدُ «هل تحتاج معاينة؟» يختفي بالكامل حين `fromReceptionRouting`** — لا `disabled`، بل غيابٌ تامّ");
  check(/data-testid="text-service-path-fixed"[\s\S]{0,20}>\s*معاينة طبية/.test(deviceModalCode),
    "١٢.د **ويظهر بدلاً منه نصّ «معاينة طبية» ثابتاً بمعرِّفه الخاصّ**");

  //  (٣) وزرُّ «تغيير سبب الحضور» موجودٌ بنصّه ومعرِّفه، وينادي `onChangeReason`
  //  فحسب — لا `mutation.mutate()` ولا أيّ نداءٍ آخر.
  check(/data-testid="button-change-reason"/.test(deviceModalCode)
    && /تغيير سبب الحضور/.test(deviceModalCode),
    "١٢.هـ **وزرُّ «تغيير سبب الحضور» موجودٌ بنصّه ومعرِّفه**");
  check(/onClick=\{\(\) => onChangeReason\?\.\(\)\}/.test(deviceModalCode),
    "١٢.و وينادي `onChangeReason` فحسب");
  //  **ولا نداءَ تحويلٍ (`mutation.mutate`) إلّا من زرّ «فتح الطلب» نفسِه** —
  //  فتغييرُ السبب لا يُنشئ حلقةً بأيّ حال، ولا يُلغي أخرى.
  const mutateCalls = (deviceModalCode.match(/mutation\.mutate\(\)/g) ?? []).length;
  same("١٢.ز **و`mutation.mutate()` تُستدعى مرّةً واحدة بالضبط — من «فتح الطلب»** — لا من «تغيير سبب الحضور»",
    mutateCalls, 1);

  //  (٤) والموزِّعُ ينفّذ «تغيير سبب الحضور» **بلا شبكة**: إغلاقٌ عاديّ
  //  (بمنطق `closeFlow` القائم — لا فتحَ ولا إلغاءَ لأيّ حلقة) ثمّ إعادةُ
  //  فتح **حوار `routingOpen` نفسِه** — لا حواراً ثانياً.
  check(/function changeReceptionRoutingReason\(\) \{\s*closeFlow\(false\);\s*setRoutingOpen\(true\);\s*\}/.test(launcherCodeForRouting),
    "١٢.ح **`changeReceptionRoutingReason` تُغلق بمنطق `closeFlow` القائم ثمّ تفتح المُوجِّهَ** — لا حلقةَ تُفتَح ولا تُلغى");
  check(/onChangeReason=\{changeReceptionRoutingReason\}/.test(launcherCodeForRouting),
    "١٢.ط **والنافذةُ تستدعيها عبر الخاصّية نفسِها** — لا سلكاً موازياً");
  check(/fromReceptionRouting=\{flow\.fromReceptionRouting\}/.test(launcherCodeForRouting),
    "١٢.ي والموزِّعُ يمرّر ما قرّره المُوجِّه بلا تعديل");
  check(/Dialog open=\{routingOpen\} onOpenChange=\{setRoutingOpen\}/.test(launcherCodeForRouting),
    "١٢.ك **والمُوجِّهُ المُعاد فتحُه هو نفسُ حوار `routingOpen` القائم** — لا نسخةٌ ثانية");

  //  (٥) والمسارُ العاديّ («إضافة خدمة جديدة» أو الاستئناف بعد «تعديل
  //  مريض») يبقى **بلا** `fromReceptionRouting` — فيرى محدِّدَ «هل تحتاج
  //  معاينة؟» حرّاً بلا `disabled` كما كان دائماً.
  check(/<Select value=\{path\} onValueChange=\{\(v\) => setPath\(v as ServicePath\)\}>/.test(deviceModalCode),
    "١٢.ل **والمسارُ العاديّ ما زال يعرض محدِّداً حرّاً بلا `disabled`** — exam ⟷ no_exam كما كان");
  {
    const normalFlow = opt(launcherOptions({ isAmputee: true }), "new_prosthetic_device").flow as any;
    check(!("fromReceptionRouting" in normalFlow) && !("initialServicePath" in normalFlow),
      "١٢.م **والمسارُ العاديّ («طرف صناعي جديد أو جزء جديد») يبقى بلا أيّ حقلٍ إضافي**",
      JSON.stringify(normalFlow));
    same("وهو نفسُه — بلا حرفٍ يتغيّر", normalFlow,
      { kind: "device_episode", serviceType: "prosthetic" });
  }
  check(/setFlow\(\{ kind: "device_episode", serviceType: resume\.serviceType \}\);/.test(launcherCodeForRouting),
    "١٢.ن **والاستئنافُ بعد «تعديل مريض» أيضاً بلا حقلٍ إضافي على `flow`** — يسأل بمحدِّدٍ حرّ");

  //  ولا أثرَ لـ`lockedServicePath` — الاسمُ الذي رُفض في تصحيحٍ أسبق —
  //  في أيٍّ من الملفّات الأربعة.
  for (const [label, src] of [
    ["reception_routing.ts", ROUTING], ["patient_service_launcher_logic.ts", LAUNCHER_LOGIC],
    ["NewDeviceEpisodeModal.tsx", DEVICE_EPISODE_MODAL], ["PatientServiceLauncher.tsx", LAUNCHER],
  ] as const) {
    check(!code(src).includes("lockedServicePath"),
      `١٢.س **ولا أثرَ لـ"lockedServicePath" في ${label}**`);
  }

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
