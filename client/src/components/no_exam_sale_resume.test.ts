// **استئنافُ بيعٍ بلا معاينة حين تتعدّد العملياتُ المعلَّقة** — منطقٌ خالص
// وعقدُ شاشة. `npm run test:no-exam-sale-resume` — بلا قاعدة بيانات وبلا شبكة.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// ترحيلُ ٠٧٣ أسقط `uq_pde_case_open`، فصار للخيط الواحد أن يحمل **أكثر من
// حلقةٍ مفتوحة** معاً — عملياتٌ مستقلّة عمداً. وبقيت `resumableNoExamSale`
// على `.find()` (أوّلَ مطابقة) كما كُتبت يوم كان الفهرسُ يضمن واحدةً لا
// غير. فمريضٌ له عمليتان معلَّقتان لنفس القسم — قالبٌ وركبةٌ مثلاً — كانت
// الشاشةُ **تستأنف الأولى صامتاً**: يُفتَح النموذجُ على «قالب» والموظّفُ
// جاء ليُكمِل الركبة، فيُسجَّل السعرُ والخبيرُ على العملية الخطأ.
//
// ══ القاعدةُ الآن — نفسُ قاعدة سؤال الإلحاق حرفاً بحرف ═══════════════════
// لا عمليةٌ معلَّقة   ⟶ بيعٌ جديد كما كان.
// واحدةٌ فقط        ⟶ تُستأنَف تلقائياً كما كان.
// أكثرُ من واحدة    ⟶ **اختيارٌ صريح إلزاميّ** بعرض الجزء ورقم العملية.
//
// ══ وما لا يمسّه هذا كلُّه ═══════════════════════════════════════════════
// الخادمُ والبيعُ والمحاسبة: `POST /api/no-exam/device-sale` بعقده وحُرّاسه
// وقفله ومعاملته كما هي بحرفها — هذا **عرضٌ يسأل**، لا منطقُ عملٍ يتغيّر.

import { readFileSync } from "fs";
import { join } from "path";
import {
  resumableNoExamSales, resolveResumeTarget, inManufacturingFullDeviceEpisodes,
  type PatientEpisodeSummary,
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
/** المصدر بلا تعليقاتٍ تشغل سطورها — فذكرُ شيءٍ في شرحٍ لا يُقرأ حضوراً له. */
function code(src: string): string {
  return src
    .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, "")
    .replace(/^[ \t]*\/\/.*$/gm, "");
}

const LAUNCHER = code(read("PatientServiceLauncher.tsx"));
const DIALOG = code(read("NoExamOperationDialog.tsx"));

const pending = (
  id: number, requestedItem: string, sequenceNumber: number,
): PatientEpisodeSummary => ({
  id, serviceType: "prosthetic", status: "awaiting_exam",
  servicePath: "no_exam", requestedItem, sequenceNumber,
});

console.log("\n══ أ. إعادةُ إنتاج العطب: عمليتان معلَّقتان لنفس القسم ══\n");

//  الشكلُ بعينه الذي وصفه المالك: عمليتان معلَّقتان للبيع بلا معاينة على
//  **نفس القسم**، ولكلِّ واحدةٍ **جزءٌ مختلف**.
const TWO = [pending(41, "socket", 1), pending(52, "knee", 2)];

const got = resumableNoExamSales(TWO, "prosthetic");
same("١. **كلتا العمليتين تُعرَضان — لا واحدةٌ تُنتقى عن الموظّف**", got, [
  { episodeId: 41, requestedItem: "socket", sequenceNumber: 1 },
  { episodeId: 52, requestedItem: "knee", sequenceNumber: 2 },
]);
check(got.length === 2,
  "٢. **ولا استئنافَ صامتاً للأولى** — العطبُ القديم كان يُرجع «قالب» وحده",
  `got: ${JSON.stringify(got)}`);

//  والترتيبُ ثابتٌ يُقرَأ لا يتبع ترتيبَ وصول الخادم — نفسُ قاعدة مُرشَّحي
//  الإلحاق: الأقدمُ رقماً أوّلاً، والمجهولُ يُذيَّل ولا يُخمَّن.
same("٣. **وترتيبٌ ثابتٌ بالتسلسل** مهما وصل الخادمُ بأيّ ترتيب",
  resumableNoExamSales([pending(52, "knee", 2), pending(41, "socket", 1)], "prosthetic")
    .map((c) => c.episodeId), [41, 52]);
same("٣-ب. **والمجهولُ رقمُه يُذيَّل** — لا يُخمَّن له تسلسل",
  resumableNoExamSales(
    [{ ...pending(9, "foot", 0), sequenceNumber: null }, pending(41, "socket", 1)],
    "prosthetic").map((c) => c.episodeId), [41, 9]);

console.log("\n══ ب. الحالتان الأخريان — كما كانتا بحرفهما ══\n");

same("٤. **بلا عمليةٍ معلَّقة ⟶ قائمةٌ فارغة** فيُفتَح بيعٌ جديد كما الآن",
  [resumableNoExamSales([], "prosthetic"),
    resumableNoExamSales(null, "prosthetic"),
    resumableNoExamSales(undefined, "prosthetic")], [[], [], []]);
same("٥. **وواحدةٌ فقط ⟶ تُستأنَف تلقائياً** بمعرّفها وبما طُلب فيها حرفاً",
  resumableNoExamSales([pending(77, "socket", 1)], "prosthetic"),
  [{ episodeId: 77, requestedItem: "socket", sequenceNumber: 1 }]);
same("٦. ولا تُستأنَف لقسمٍ آخر", resumableNoExamSales(TWO, "medical_support"), []);

console.log("\n══ ج. والتصفيةُ القديمة كلُّها كما هي — لا يُستأنَف ما لا يُباع ══\n");

same("٧. **صفٌّ بلا مطلوبٍ لا يُستأنَف** — ولا يُخمَّن له شيء",
  resumableNoExamSales([{ ...pending(41, "socket", 1), requestedItem: null }], "prosthetic"), []);
same("٨. ولا صفٌّ بلا معرّفٍ رقميّ",
  resumableNoExamSales([{ ...pending(41, "socket", 1), id: undefined }], "prosthetic"), []);
same("٩. **وحلقةُ مسار المعاينة لا تُستأنَف بيعاً**",
  resumableNoExamSales([{ ...pending(41, "socket", 1), servicePath: "exam" }], "prosthetic"), []);
same("١٠. ولا حلقةُ ما قبل ٠٦٥ (بلا مسار)",
  resumableNoExamSales([{ ...pending(41, "socket", 1), servicePath: null }], "prosthetic"), []);
for (const status of ["in_manufacturing", "delivered", "cancelled", "examined"]) {
  same(`١١. وحلقةٌ «${status}» ليست عمليةً معلَّقة`,
    resumableNoExamSales([{ ...pending(41, "socket", 1), status }], "prosthetic"), []);
}
same("١٢. **وطلبُ «طرفٍ كامل» لا يُستأنَف بيعاً** — يردّه الخادمُ حتماً",
  resumableNoExamSales([{ ...pending(41, "full_device", 1) }], "prosthetic"), []);
same("١٣. **ولا طلبُ «مسندٍ كامل»** — ولا بيعَ للمساند بلا معاينة أصلاً",
  resumableNoExamSales(
    [{ ...pending(41, "full_device", 1), serviceType: "medical_support" }],
    "medical_support"), []);
same("١٤. **وكلُّ جزءِ طرفٍ يبقى قابلاً للاستئناف**",
  PROSTHETIC_COMPONENTS.filter((c) =>
    resumableNoExamSales([pending(41, c, 1)], "prosthetic")[0]?.requestedItem !== c), []);
//  **والمرفوضُ لا يُسقط الصالحَ معه** — التصفيةُ صفٌّ صفّاً لا دفعةً واحدة.
same("١٥. **والمرفوضُ يسقط وحده** — لا يُخفي عمليةً صالحةً بجواره",
  resumableNoExamSales(
    [{ ...pending(41, "full_device", 1) }, pending(52, "knee", 2)], "prosthetic")
    .map((c) => c.episodeId), [52]);

console.log("\n══ د. قرارُ النافذة — خالصاً، لا نصّاً يُقرأ ══\n");

//  الحارسُ الحقيقيّ. عقدُ الشاشة أدناه يُمسك الغيابَ، وهذا يُمسك **الانتقاءَ
//  الصامت** مهما أُعيدت صياغتُه — وهو بعينه العطبُ الذي تُصلحه هذه التمريرة.
const C = resumableNoExamSales(TWO, "prosthetic");

same("١٦. **بلا عمليةٍ معلَّقة ⟶ بيعٌ جديد** — لا استئنافَ ولا منع",
  resolveResumeTarget({ candidates: [], pickedId: "" }),
  { resuming: false, episodeId: null, requestedItem: null, unpicked: false });

same("١٧. **وواحدةٌ ⟶ تُحسَم ضمناً بلا سؤال** — نفسُ الشاشة القديمة",
  resolveResumeTarget({ candidates: [C[0]], pickedId: "" }),
  { resuming: true, episodeId: 41, requestedItem: "socket", unpicked: false });

const many = resolveResumeTarget({ candidates: C, pickedId: "" });
same("١٨. **وأكثرُ من واحدة ⟶ لا عمليةَ تُنتقى** — والحفظُ ممنوع",
  many, { resuming: true, episodeId: null, requestedItem: null, unpicked: true });
check(many.episodeId !== C[0].episodeId,
  "١٩. **ولا تُنتقى الأولى بحالٍ** — العطبُ الذي كان",
  `got: ${JSON.stringify(many)}`);

same("٢٠. **وبعد الاختيار تُحسَم تلك بعينها** — لا الأولى",
  resolveResumeTarget({ candidates: C, pickedId: "52" }),
  { resuming: true, episodeId: 52, requestedItem: "knee", unpicked: false });
same("٢٠-ب. وتُحسَم الأولى إن كانت هي المختارة",
  resolveResumeTarget({ candidates: C, pickedId: "41" }),
  { resuming: true, episodeId: 41, requestedItem: "socket", unpicked: false });

//  **والمُختارُ يُطابَق بالمعرّف من القائمة الحيّة**: قيمةٌ بائتة (حُسمت
//  العمليةُ في تبويبٍ آخر فاختفت) تُقرأ «لم يُختَر» فتمنع الحفظ — لا
//  «اختير شيءٌ ما» فتُسجَّل على عمليةٍ لم تعد قائمة.
same("٢١. **ومُختارٌ بائتٌ يمنع الحفظ** — لا يُسجَّل على عمليةٍ اختفت",
  resolveResumeTarget({ candidates: C, pickedId: "999" }),
  { resuming: true, episodeId: null, requestedItem: null, unpicked: true });

console.log("\n══ د. عقدُ الشاشة — الموزِّعُ يمرّر القائمةَ كاملةً ══\n");

check(/resumableNoExamSales\(episodeData\?\.episodes, flow\.serviceType\)/.test(LAUNCHER),
  "٢٢. **الموزِّعُ يقرأ المُرشَّحين من حلقات المريض نفسِها** — قائمةً لا واحداً");
check(/resumeCandidates=\{[A-Za-z]+\}/.test(LAUNCHER),
  "٢٣. **ويمرّرها إلى النافذة القائمة** — ولا يختار عنها");
check(!/existingEpisodeId=\{/.test(LAUNCHER) && !/existingRequestedItem=\{/.test(LAUNCHER),
  "٢٤. **ولا يمرّر عمليةً بعينها** — الاختيارُ داخل النافذة حيث يراه الموظّف");
check(!/resumableNoExamSale\b(?!s)/.test(LAUNCHER),
  "٢٥. **ولا أثرَ للدالّة القديمة ذاتِ المطابقة الأولى**");

console.log("\n══ هـ. عقدُ النافذة — اختيارٌ إلزاميّ حين تتعدّد ══\n");

check(/resumeCandidates/.test(DIALOG),
  "٢٦. **النافذةُ تستقبل المُرشَّحين** لا عمليةً محسومةً عنها");
check(/resumeCandidates\.length === 1/.test(DIALOG),
  "٢٧. **وواحدةٌ تُحسَم ضمناً** — نفسُ الشاشة القديمة تماماً");
check(/resumeUnpicked/.test(DIALOG) && /!resumeUnpicked/.test(DIALOG),
  "٢٨. **وأكثرُ من واحدة تمنع الحفظ حتى يُختار** — لا افتراضَ صامتاً");
check(/data-testid="no-exam-op-resume-target"/.test(DIALOG),
  "٢٩. **ومحدِّدٌ ظاهرٌ للعملية المقصودة** حين تتعدّد");
check(/COMPONENT_LABELS\[/.test(DIALOG) && /sequenceNumber/.test(DIALOG),
  "٣٠. **يعرض الجزءَ ورقمَ العملية معاً** — لا معرّفاً داخلياً عارياً");
//  سؤالُ الإلحاق لبيعٍ **جديد** وحده. ومع عملياتٍ معلَّقة لم يُختَر منها
//  بعدُ واحدة، كان شرطُ `!existingEpisodeId` يصير صادقاً فيظهر السؤالُ
//  على استئنافٍ لا معنى له فيه.
check(/showAttachPrompt = kind === "device_sale" && !resuming/.test(DIALOG),
  "٣١. **وسؤالُ الإلحاق لبيعٍ جديدٍ وحده** — لا يظهر على استئنافٍ لم يُحسَم");
check(/existingEpisodeId\s*\?\s*\{ existingEpisodeId, expertUserId: Number\(expertId\) \}/
  .test(DIALOG),
  "٣٢. **وجسمُ الطلب كما هو بحرفه** — الاستئنافُ يرسل المعرّفَ والخبيرَ لا غير");

console.log("\n══ و. والخادمُ والبيعُ والمحاسبةُ لم تُمَسّ ══\n");

const serverTouched = code(readFileSync(
  join(HERE, "..", "..", "..", "server", "pending_charges", "store.ts"), "utf8"));
check(!/resumeCandidates|resumableNoExamSales/.test(serverTouched),
  "٣٣. **لا أثرَ لهذا العرض في منسّق العمليات** — قرارُ شاشةٍ لا منطقُ عمل");
//  ومُرشَّحو الإلحاق دالّةٌ أخرى تماماً — لم تُمَسّ بهذه التمريرة.
same("٣٤. **ومُرشَّحو الإلحاق كما هم** — دالّةٌ مستقلّة لم تتغيّر",
  inManufacturingFullDeviceEpisodes(
    [{ id: 8, serviceType: "prosthetic", status: "in_manufacturing",
      requestedItem: "full_device", sequenceNumber: 3 }], "prosthetic"),
  [{ episodeId: 8, sequenceNumber: 3 }]);

console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصاً فشل`}\n`);
process.exit(failures === 0 ? 0 : 1);
