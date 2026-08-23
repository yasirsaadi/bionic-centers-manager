// **استئنافُ طلبِ الجهاز · فتحُ العملية الحالية · أبوابُ التصحيح الثلاثة.**
// `npm run test:device-flow-resume` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **منطقُ الاستئناف** خالصاً على مخزَّنٍ زائف: يُحفَظ ويُقرأ مرّةً
//     واحدة، ولا يُعطى لمريضٍ آخر، ولا يُسقط التطبيقَ حين يرمي التخزين.
// (ب) **قرارُ «فتح العملية الحالية»**: أمرٌ ⟶ مسارُ الأمر، وحلقةٌ بلا أمر
//     ⟶ مرساةُ بطاقةِ القرار.
// (ج) **عقدُ الشاشات** قراءةً للمصدر: أن الحالةَ تعيش **فوق** المكوّن الذي
//     يُفكَّك، وأن الزرّ يفتح فعلاً، وأن الأبوابَ الثلاثة تفتح **النافذةَ
//     نفسَها** بلا نقطةِ تصحيحٍ ثانية.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **تصيير React**: المشروع بلا مشغّل DOM (كما في `test:service-launcher`).
// فدورةُ الحياة الحقيقية — التركيبُ والتفكيك عند تغيّر المسار — **تُثبَت
// بالبنية لا بالتشغيل**: أن اللقطةَ في `sessionStorage` لا في `useState`،
// وأن مالكَها هو الموزِّع لا النافذة. وهذا بالضبط ما انكسر: حالةٌ محلّية
// وُعد بها الموظّفُ فماتت مع أوّل تغيّرِ مسار.

import { readFileSync } from "fs";
import { join } from "path";
import {
  DEVICE_FLOW_RESUME_KEY, POST_EXAM_CARD_ANCHOR,
  saveDeviceFlowResume, takeDeviceFlowResume, clearDeviceFlowResume,
  activeOperationFocus, workOrderHref,
  type ResumeStore,
} from "./device_flow_resume";

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
/** المصدر بلا تعليقات — فحارسٌ يشرح غيابَ شيءٍ لا يُمسك بذكره لغياب. */
function code(src: string): string {
  return src
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

/** مخزَّنٌ زائف — نفسُ عقد `Storage` بلا متصفّح. */
function fakeStore(): ResumeStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: (k) => { map.delete(k); },
  };
}

/** مخزَّنٌ يرمي عند كلّ لمسة — التصفّحُ الخاصّ. */
const throwingStore: ResumeStore = {
  getItem() { throw new Error("SecurityError"); },
  setItem() { throw new Error("SecurityError"); },
  removeItem() { throw new Error("SecurityError"); },
};

const LAUNCHER = read("PatientServiceLauncher.tsx");
const MODAL = read("NewDeviceEpisodeModal.tsx");
const POST_EXAM = read("PostExamDecisionCard.tsx");
const EXAMS = read("medical", "PatientMedicalExams.tsx");
const WORK_ORDER_CARD = read("manufacturing", "PatientWorkOrderCard.tsx");
const REQUIRED = read("RequiredPatientDataDialog.tsx");
const MEDICAL_ROUTES = read("..", "..", "..", "server", "medical", "routes.ts");
const MEDICAL_STORE = read("..", "..", "..", "server", "medical", "store.ts");
const APP = read("..", "App.tsx");

function main() {
  // ══ (أ) منطقُ الاستئناف ═══════════════════════════════════════════════
  console.log("\n── لقطةُ الاستئناف ──");

  const s = fakeStore();
  saveDeviceFlowResume(s, { patientId: 41, serviceType: "prosthetic", requestedItem: "socket" });
  check(s.map.has(DEVICE_FLOW_RESUME_KEY), "١. تُحفَظ تحت مفتاحٍ واحد معروف");

  same("٢. وتُقرأ لصاحبها كما حُفظت",
    takeDeviceFlowResume(s, 41),
    { patientId: 41, serviceType: "prosthetic", requestedItem: "socket" });

  // **تُستهلَك مرّةً واحدة**: وإلّا لاحقت النافذةُ الموظّفَ في كلّ تحميل.
  same("٣. **ولا تُقرأ مرّتين**", takeDeviceFlowResume(s, 41), null);
  check(!s.map.has(DEVICE_FLOW_RESUME_KEY), "والمفتاح مُسح فعلاً");

  // مريضٌ آخر لا يرث نافذةَ غيره — **وتُمسَح كذلك** فلا تنفجر لاحقاً.
  saveDeviceFlowResume(s, { patientId: 41, serviceType: "prosthetic", requestedItem: "knee" });
  same("٤. ولا تُعطى لمريضٍ آخر", takeDeviceFlowResume(s, 99), null);
  check(!s.map.has(DEVICE_FLOW_RESUME_KEY), "وتُمسَح عند عدم التطابق أيضاً");

  // مسحٌ صريح — إغلاقُ الموظّف قرارٌ يُحترَم.
  saveDeviceFlowResume(s, { patientId: 7, serviceType: "medical_support", requestedItem: "" });
  clearDeviceFlowResume(s);
  same("٥. والإغلاقُ الصريح يمسحها", takeDeviceFlowResume(s, 7), null);

  // «بلا اختيار» حالةٌ مشروعة تُحفَظ كما هي — والمساندُ لا أجزاءَ لها.
  saveDeviceFlowResume(s, { patientId: 7, serviceType: "medical_support", requestedItem: "" });
  same("٦. و«بلا اختيار» تُحفَظ ولا تُخترَع قيمة",
    takeDeviceFlowResume(s, 7),
    { patientId: 7, serviceType: "medical_support", requestedItem: "" });

  // قيمةٌ ليست من القائمة لا تعود — وإلّا ضُبط `Select` على ما لا يعرفه.
  saveDeviceFlowResume(s, { patientId: 7, serviceType: "prosthetic", requestedItem: "banana" } as any);
  same("٧. وقيمةٌ خارج القائمة تُنظَّف إلى فراغ",
    takeDeviceFlowResume(s, 7)?.requestedItem, "");

  // نوعُ خدمةٍ مخترَع لا يُحفَظ أصلاً.
  const s2 = fakeStore();
  saveDeviceFlowResume(s2, { patientId: 7, serviceType: "physiotherapy", requestedItem: "socket" } as any);
  same("٨. ونوعُ خدمةٍ ليس جهازاً لا يُحفَظ", s2.map.size, 0);

  // مخزَّنٌ تالف — لا يُسقط شيئاً ولا يُرجع هراءً.
  const s3 = fakeStore();
  s3.map.set(DEVICE_FLOW_RESUME_KEY, "{{{ليس JSON");
  same("٩. ونصٌّ تالف ⟶ لا استئناف", takeDeviceFlowResume(s3, 41), null);
  check(!s3.map.has(DEVICE_FLOW_RESUME_KEY), "ويُمسَح فلا يتكرّر الخطأ");

  // **والتخزينُ الذي يرمي لا يُسقط طلبَ جهاز.**
  let threw = false;
  try {
    saveDeviceFlowResume(throwingStore, { patientId: 1, serviceType: "prosthetic", requestedItem: "socket" });
    takeDeviceFlowResume(throwingStore, 1);
    clearDeviceFlowResume(throwingStore);
  } catch { threw = true; }
  check(!threw, "١٠. **والتخزينُ الممنوع لا يرمي إلى الأعلى** — بلا استئناف لا تعطُّل");
  same("ويعطي «لا استئناف»", takeDeviceFlowResume(throwingStore, 1), null);
  //  وغيابُ التخزين أصلاً (تصيير على الخادم) كذلك.
  same("وبلا مخزَّنٍ إطلاقاً كذلك", takeDeviceFlowResume(null, 1), null);

  // ══ (ب) «فتح العملية الحالية» — إلى أين ══════════════════════════════
  console.log("\n── وجهةُ «فتح العملية الحالية» ──");
  same("١١. أمرُ تصنيعٍ قائم ⟶ صفحةُ الأمر نفسِها",
    activeOperationFocus({ workOrderId: 812, episodeId: 55 }),
    { kind: "route", href: "/manufacturing/orders/812" });
  same("١٢. وحلقةٌ بلا أمر ⟶ بطاقةُ قرار ما بعد المعاينة",
    activeOperationFocus({ workOrderId: null, episodeId: 55 }),
    { kind: "anchor", elementId: POST_EXAM_CARD_ANCHOR });
  same("ولا رقمَ صفرٍ يُبنى عليه مسار",
    activeOperationFocus({ workOrderId: 0, episodeId: 55 }).kind, "anchor");
  same("ولا قيمةَ غير رقمية", activeOperationFocus({ workOrderId: NaN } as any).kind, "anchor");

  //  **والمسارُ قائمٌ فعلاً في المُوجِّه** — وإلّا فتح الزرُّ صفحةً بيضاء.
  check(/<Route path="\/manufacturing\/orders\/:id"/.test(APP),
    "١٣. ومسارُ صفحةِ الأمر مسجَّلٌ في المُوجِّه");
  same("وبناؤه من الدالّة نفسِها", workOrderHref(3), "/manufacturing/orders/3");

  // ══ (ج) الحالةُ تعيش فوق مَن يُفكَّك ══════════════════════════════════
  console.log("\n── الاستئناف موصولٌ بالشاشة الحقيقية ──");
  const launcher = code(LAUNCHER);
  const modal = code(MODAL);

  //  **جوهرُ العطب**: كانت اللقطةُ `useState` داخل النافذة، والنافذةُ
  //  تُفكَّك مع تغيّر المسار — فيموت الاختيارُ الموعود.
  check(!/pendingSelection/.test(modal),
    "١٤. **ولا `pendingSelection` محلّية في النافذة بعد اليوم**",
    (modal.match(/.*pendingSelection.*/g) ?? []).join(" | "));
  check(!/sessionStorage|localStorage/.test(modal),
    "والنافذةُ لا تلمس التخزينَ بنفسها — تُملأ وتُسلّم");

  check(/initialRequestedItem/.test(modal) && /initialRequestedItem/.test(launcher),
    "١٥. والاختيارُ يصل النافذةَ من مالكِ الحالة");
  check(/takeDeviceFlowResume\(sessionResumeStore\(\), patient\.id\)/.test(launcher),
    "١٦. **والموزِّعُ يقرأ اللقطةَ عند التركيب** — فتعود النافذةُ مفتوحةً");
  check(/setFlow\(\{ kind: "device_episode", serviceType: resume\.serviceType \}\)/.test(launcher),
    "ويعيد فتحَ مسار الجهاز نفسِه لا مسارٍ آخر");
  check(/saveDeviceFlowResume\(sessionResumeStore\(\)/.test(launcher),
    "١٧. وهو مَن يحفظها قبل مغادرة الصفحة");

  //  **وشاشةُ التعديل قائمةٌ لا مخترَعة**، والعودةُ منها تلقائية.
  check(/setLocation\(`\/patients\/\$\{patient\.id\}\/edit/.test(launcher),
    "١٨. و«إكمال البيانات الآن» يفتح **شاشةَ تعديل المريض القائمة**");
  const edit = read("..", "pages", "EditPatient.tsx");
  check(/setLocation\(`\/patients\/\$\{patientId\}\$\{branchParam\}`\)/.test(code(edit)),
    "وحفظُ التعديل يعيد إلى صفحة المريض تلقائياً — بلا خطوةٍ على الموظّف");
  check(/onEditPatient\(item\)/.test(modal),
    "١٩. والنافذةُ تسلّم **ما اختاره الموظّف بعينه**");
  check(/onComplete=\{\(\) => \{[\s\S]{0,400}?onEditPatient/.test(MODAL),
    "وتسليمُه من زرّ «إكمال البيانات الآن» نفسِه");
  check(/إكمال البيانات الآن/.test(REQUIRED),
    "والزرُّ بنصّه الذي يقرؤه الموظّف");
  //  ولا يبقى الوعدُ بلا موصِل: الموزِّعُ يمرّرها فعلاً.
  const modalUsage = launcher.match(/<NewDeviceEpisodeModal[\s\S]*?\/>/)?.[0] ?? "";
  check(/onEditPatient=\{/.test(modalUsage),
    "٢٠. **والموزِّعُ يمرّر `onEditPatient` فعلاً**", modalUsage);
  check(/initialRequestedItem=\{resumeItem\}/.test(modalUsage),
    "ويمرّر الجزءَ المستأنَف معه", modalUsage);

  //  واختيارٌ جديد أو إغلاقٌ صريح ⟶ لا لقطةَ قديمة تفتح نافذةً بعد ساعة.
  check(/clearDeviceFlowResume\(sessionResumeStore\(\)\)/.test(launcher),
    "٢١. والإغلاقُ الصريح يمسح اللقطة");
  check(/setResumeItem\(""\)/.test(launcher),
    "واختيارٌ جديد يبدأ نظيفاً");

  // ══ الزرُّ يفتح فعلاً ═════════════════════════════════════════════════
  console.log("\n── «فتح العملية الحالية» يفتح ──");
  const openBtn = MODAL.match(/onClick=\{\(\) => \{[\s\S]*?\}\}\s*\n\s*data-testid="button-open-active-operation"/)?.[0] ?? "";
  check(openBtn.length > 60, "٢٢. ومعالجُ الزرّ مقروء", String(openBtn.length));
  check(/activeOperationFocus\(conflict\)/.test(openBtn),
    "ويقرّر وجهتَه بالقاعدة المُختبَرة نفسِها", openBtn);
  check(/setLocation\(focus\.href\)/.test(openBtn),
    "٢٣. **فيُبحِر إلى أمر التصنيع فعلاً**", openBtn);
  check(/scrollIntoView/.test(openBtn),
    "٢٤. أو يُبرز البطاقةَ في الصفحة نفسِها", openBtn);
  check(!/^\s*onClick=\{\(\) => \{ onOpenChange\(false\); \}\}/m.test(MODAL),
    "**ولم يبقَ إغلاقاً وحده**");
  //  والمرساةُ موجودةٌ في البطاقة التي يُشار إليها.
  check(new RegExp(`id=\\{POST_EXAM_CARD_ANCHOR\\}`).test(POST_EXAM),
    "٢٥. ومرساةُ بطاقةِ القرار مزروعةٌ فيها");
  check(/POST_EXAM_CARD_ANCHOR/.test(code(POST_EXAM)) && /device_flow_resume/.test(POST_EXAM),
    "من المصدر نفسِه لا بنصٍّ منسوخ");

  // ══ الأبوابُ الثلاثة ══════════════════════════════════════════════════
  console.log("\n── ثلاثةُ أبوابٍ، ونافذةٌ واحدة ──");
  for (const [name, src] of [
    ["بطاقة المعاينة", EXAMS],
    ["بطاقة قرار ما بعد المعاينة", POST_EXAM],
    ["بطاقة التصنيع", WORK_ORDER_CARD],
  ] as [string, string][]) {
    check(/<AdministrativeReversalDialog/.test(src), `٢٦. و«${name}» تفتح النافذةَ نفسَها`);
    check(/تصحيح \/ إلغاء العملية/.test(src), `   وبالنصّ نفسِه — «${name}»`);
    check(/session\?\.isAdmin\) \|\| session\?\.role === "branch_manager"/.test(code(src)),
      `   وللمسؤول ومديرِ الفرع وحدهما — «${name}»`);
  }
  //  **ولا نقطةَ تصحيحٍ ثانية**: الثلاثةُ تنادي نقطتين اثنتين لا غير،
  //  وكلتاهما داخل النافذة الواحدة.
  const endpointsInCards = [EXAMS, POST_EXAM, WORK_ORDER_CARD, MODAL]
    .flatMap((src) => [...code(src).matchAll(/["'`](\/api\/admin\/[^"'`]*)/g)].map((m) => m[1]));
  same("٢٧. **ولا نقطةَ تصحيحٍ تُنادى من البطاقات إطلاقاً**", endpointsInCards, []);
  //  والتفرّدُ لأن مفتاحَ الاستعلام يذكر نقطةَ الأثر مرّةً ثانية — والمقصودُ
  //  «أيُّ نقاطٍ تُنادى» لا «كم مرّةً ذُكرت».
  const dialogEndpoints = [...new Set([...code(read("AdministrativeReversalDialog.tsx"))
    .matchAll(/["'`](\/api\/admin\/[^"'`]*)/g)].map((m) => m[1]))].sort();
  same("والنافذةُ وحدها تنادي نقطتَي الأثر والتنفيذ", dialogEndpoints,
    ["/api/admin/operation-reversal/execute", "/api/admin/operation-reversal/preview"]);

  //  الهويّةُ الدقيقة في كلّ باب — لا «آخرُ عمليةٍ للمريض».
  check(/target=\{\{ followupId: active\.id \}\}/.test(POST_EXAM),
    "٢٨. وبطاقةُ القرار تستهدف **متابعتَها بعينها**");
  check(/target=\{\{ workOrderId: reverseOrderId \}\}/.test(WORK_ORDER_CARD),
    "٢٩. وبطاقةُ التصنيع تستهدف **أمرَ الصفّ المضغوط بعينه**");
  check(/setReverseOrderId\(o\.id\)/.test(WORK_ORDER_CARD),
    "من `o.id` لا من أوّلِ أمرٍ في القائمة");
  check(/target=\{\{ followupId: reversalFor \}\}/.test(EXAMS),
    "٣٠. وبطاقةُ المعاينة تستهدف متابعةَ تلك المعاينة");
  check(/setReversalFor\(exam\.reversalFollowupId/.test(EXAMS),
    "بالرابط الذي كتبه التوقيع لا بتخمين");

  //  **ولا يظهر البابُ على معاينةٍ سريريةٍ بلا عمليةِ جهاز.**
  check(/mayReverse && exam\.reversalFollowupId &&/.test(EXAMS),
    "٣١. **ولا زرَّ على معاينةٍ بلا عملية** — الشرطُ وجودُ المتابعة");
  check(/reversalFollowupId: followupOfExam\[e\.id\] \?\? null/.test(MEDICAL_ROUTES),
    "٣٢. والخادمُ هو مَن يقول أيُّ معاينةٍ لها عملية");
  check(/followupIdsForExams/.test(MEDICAL_STORE)
    && /FROM post_exam_followups/.test(MEDICAL_STORE),
  "من `post_exam_followups.medical_exam_id` — الرابطُ المخزَّن نفسُه");

  //  والمُبطَلُ إدارياً لا يُفتَح عليه بابٌ ثانٍ، ويُقال مُبطَلاً.
  check(/mayReverse && !o\.adminVoidReversalId/.test(WORK_ORDER_CARD),
    "٣٣. وأمرٌ أُبطل إدارياً لا يُصحَّح مرّتين");
  check(/ADMIN_VOID_BADGE/.test(WORK_ORDER_CARD),
    "ويُعرَض بوسمه المشترك لا بنصٍّ منسوخ");
  check(/adminVoidReversalId: WO\.adminVoidReversalId/.test(
    read("..", "..", "..", "server", "manufacturing", "store.ts")),
  "والخادمُ يرسل العلمَ من عموده");

  console.log(failures === 0 ? "\n✅ كل فحوص الاستئناف والأبواب نجحت" : `\n❌ ${failures} فحصاً فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
