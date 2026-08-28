// عقدُ الشاشات — **بلا قاعدة بيانات وبلا DOM**.
//
// ══ لماذا فحصُ نصٍّ لا تركيبُ شجرة ══════════════════════════════════════
// لا مشغّلَ DOM في هذا الريبو، وإضافتُه لأجل ثلاث شاشاتٍ كلفةٌ لا تُسترَدّ.
// لكنّ صنفاً كاملاً من العطب **لا يراه اختبارُ الخادم إطلاقاً**: نافذةٌ لا
// ترسل حقلاً تقبله النقطة، أو بطاقةٌ تقول للمعتمِد رقماً بلا ما اشتراه
// المريض، أو صفحةٌ تعرض `awaiting_exam` كما هي في القاعدة. فالفحصُ يقرأ
// المصدر ويؤكّد العقد الذي يربط الطرفين.
//
// وهو **صارمٌ عمداً**: أيُّ إعادة تسميةٍ تُسقطه، فيُقرأ ويُحدَّث بوعي.

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (...p: string[]) => readFileSync(join(HERE, ...p), "utf8");

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}

const NEW_SERVICE = read("..", "components", "NewServiceModal.tsx");
const APPROVALS = read("..", "pages", "DiscountApprovals.tsx");
const REVIEW = read("..", "pages", "MedicalReview.tsx");
const MY_EXAMS = read("..", "pages", "MyExams.tsx");
const SHARED_REVIEW = read("..", "..", "..", "shared", "medical_review.ts");

console.log("\n── ١. نافذة «خدمة جديدة»: الاستقبال يُدخل الاتفاق ──");

check(/ServiceDiscountFields/.test(NEW_SERVICE),
  "١. النافذةُ تعرض حقولَ الخصم المشتركة — لا نسخةً رابعة منها");
//  ══ **ولا التفافَ من حقل الكلفة** ═══════════════════════════════════
//  الحقلُ كان قابلاً للتحرير للجلسات، فيكتب الموظّفُ ١٢,٥٠٠ بدل ٢٥,٠٠٠
//  ويترك حقولَ الخصم فارغة — فتُنفَّذ الخدمةُ مخفَّضةً بلا اعتماد.
check(/service-cost-readonly/.test(NEW_SERVICE),
  "١.أ **وسعرُ الجلسات يُقرأ ولا يُكتب**");
check(/\{isPhysioService \? \(/.test(NEW_SERVICE),
  "   والتحريرُ باقٍ لما عدا الجلسات — الاستشارة و«خدمة أخرى» بلا جدول");
check(/const serviceCost = isPhysioService \? standardPrice/.test(NEW_SERVICE),
  "١.ب **والمُرسَل هو القياسيُّ لا قيمةُ حقلٍ بائتة**");
//  والجدولُ مصدرٌ واحد — لا نسخةَ محلّية تنحرف عن الخادم.
check(/const TREATMENT_PRICES = PHYSIO_TREATMENT_PRICES;/.test(NEW_SERVICE)
  && /from "@shared\/pricing"/.test(NEW_SERVICE),
"١.ج وجدولُ الأسعار من `@shared/pricing` — لا نسخةَ محلّية");
check(!/"روبوت": 50000/.test(NEW_SERVICE),
  "   والنسخةُ المحلّية حُذفت فعلاً");
check(/isPhysioService && standardPrice > 0/.test(NEW_SERVICE),
  "   وتظهر للجلسات الإضافية وحدها، وبسعرٍ أصليٍّ موجب");
check(/originalPrice=\{standardPrice\}/.test(NEW_SERVICE),
  "٢. **والأصلُ من جدول الأسعار لا من حقل الكلفة** — الحقلُ قابلٌ للتجاوز اليدوي");
check(/const standardPrice = treatmentEntries\.reduce/.test(NEW_SERVICE)
  && /TREATMENT_PRICES\[e\.treatmentType\]/.test(NEW_SERVICE),
"   ويُحسب من نوع العلاج × عدد الجلسات");
check(/hasDiscount\(discount, standardPrice\)/.test(NEW_SERVICE),
  "٣. **والمساواةُ ليست خصماً**: بلا خصمٍ لا يُرسَل حقلٌ ولا يُفتح طابور");
check(/\.\.\.\(wantsDiscount \? \{ discount: discountPayload\(discount\) \} : \{\}\)/.test(NEW_SERVICE),
  "   والحمولةُ تُبنى بالدالّة المشتركة لا بيدٍ محلّية");
check(/discountBlocked\(discount, standardPrice\)/.test(NEW_SERVICE),
  "٤. والإرسالُ يُمنع قبل اكتمال بيانات الخصم — نفسُ قواعد الخادم");
//  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — تقاعدُ الاعتماد المؤجَّل ═══════════════
//  كان هذا الفحصُ يثبت أن النافذةَ تقول «أُرسل الطلب للاعتماد» عن خدمةٍ
//  خصمُها معلَّق. اليوم لا طلبَ ولا انتظار: الخصمُ يُطبَّق فوراً كالسعر
//  الكامل، فالفحصُ صار عكسَه — **غيابُ** لغة الانتظار.
check(!/res\?\.pendingApproval/.test(NEW_SERVICE)
  && !/أُرسل الطلب للاعتماد/.test(NEW_SERVICE),
"٥. **ولا لغةَ انتظارٍ بعد اليوم**: لا رايةَ `pendingApproval` تُقرأ ولا عبارةَ «أُرسل الطلب للاعتماد» باقية");
check(/يُطبَّق فوراً كالسعر الكامل تماماً/.test(NEW_SERVICE),
  "   **والنجاحُ واحدٌ لا يتفرّع**: الخدمةُ وقعت فعلاً بحلول الردّ، خصماً كانت أو بسعرها الكامل");
//  والصفرُ وحده ليس تبرّعاً — لا وعدَ في النصّ بأنه مقبول.
check(!/صفر أو أي مبلغ/.test(NEW_SERVICE),
  "٦. ولا عبارةَ تَعِد بأن الصفر وحده مقبول");

console.log("\n── ٢. بطاقة الاعتماد: المعتمِد لا يخمّن ──");

check(/function serviceLine\(r: Row\)/.test(APPROVALS),
  "٧. البطاقةُ تبني سطرَ «ما اشتراه المريض»");
check(/p\.kind !== "new_service"/.test(APPROVALS),
  "   من حمولة «خدمة جديدة» بعينها");
check(/NEW_SERVICE_LABELS\[String\(p\.serviceType \?\? ""\)\]/.test(APPROVALS),
  "٨. **بعنوانِ الخدمة من المصدر المشترك** — لا `additional_therapy` خاماً");
check(/\$\{e\.treatmentType\} — \$\{e\.sessionCount\} جلسة/.test(APPROVALS),
  "   ونوعُ العلاج وعددُ الجلسات معه");
check(/discount-\$\{r\.id\}-service/.test(APPROVALS),
  "   ويُعرَض في البطاقة");
//  الأصليُّ والنهائيُّ والنسبةُ والسببُ وطالبُها — كلُّها كانت وتبقى.
for (const [re, msg] of [
  [/PriceTransition/, "٩. والسعران الأصليُّ والنهائيُّ"],
  [/خصم \{r\.discountPercentage\}%/, "   والنسبة"],
  [/discountReasonLabel\(r\.reason\)/, "   والسبب"],
  [/طلبها: <\/span>/, "   ومَن طلبها"],
  [/\{r\.note\}/, "   وملاحظتُه"],
  [/\{r\.branchName\}/, "   والفرع"],
] as [RegExp, string][]) check(re.test(APPROVALS), msg);
//  ══ تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — «خصومات سابقة» لا «اعتماد الخصومات» ═════
//  هذا الصفُّ **موروثٌ**: طابورُ الاعتماد الحيّ تقاعد، فالبطاقةُ تُكمل
//  بقيّةً من قبل التغيير — والأزرارُ تقوله («إكمال»/«إلغاء» لا «اعتماد»/
//  «رفض»).
check(/<Check className="w-4 h-4" \/> إكمال وتطبيق السعر/.test(APPROVALS),
  "١٠. **والإكمالُ فعلٌ أوّليّ بضغطةٍ واحدة**");
const approveAt = APPROVALS.indexOf("إكمال وتطبيق السعر\n");
const rejectAt = APPROVALS.indexOf("<X className=\"w-4 h-4\" /> إلغاء الطلب");
const modifyAt = APPROVALS.indexOf("تعديل وإكمال", rejectAt);
check(approveAt > 0 && rejectAt > approveAt && modifyAt > rejectAt,
  "   والإلغاءُ بعده، و«تعديل وإكمال» **ثانويٌّ خلفهما**",
  `approve=${approveAt} reject=${rejectAt} modify=${modifyAt}`);
check(/variant="ghost" disabled=\{decide\.isPending\}\s*\n\s*className="gap-1 text-muted-foreground"\s*\n\s*data-testid=\{`modify-/.test(APPROVALS),
  "   وشكلُه ثانويّ فعلاً (ghost) لا أساسيّ");

console.log("\n── ٣. صفحة الإشراف: اعترافٌ لا موافقة ──");

check(/مراجعة حركة مرضى الأطراف والمساند/.test(REVIEW),
  "١١. العنوانُ «مراجعة حركة مرضى الأطراف والمساند»");
check(/ليست موافقةً سابقةً لتنفيذ الخدمة/.test(REVIEW),
  "١٢. **والصفحةُ تقول صراحةً إنها ليست موافقةً سابقةً للتنفيذ**");
check(/تمت المراجعة/.test(REVIEW) && !/> موافقة\b/.test(REVIEW),
  "   وزرُّها «تمت المراجعة» لا «موافقة»");
check(/approve: "تمت المراجعة"/.test(SHARED_REVIEW)
  && /approved: "تمت المراجعة"/.test(SHARED_REVIEW),
"١٣. والمفرداتُ المشتركة تقول المعنى نفسَه — قراراً وحالة");
check(/return_to_reception: "إرجاع للاستعلامات"/.test(SHARED_REVIEW),
  "   و«إرجاع للاستعلامات» بلفظه");
//  البطاقةُ خفيفة: لا سكبَ للملفّ السريري ولا حالاتٍ خام.
for (const gone of [
  "lastExam.diagnosis", "lastExam.plan", "r.workOrder.currentStage",
  "d.prostheticType", "r.episode.status",
]) {
  check(!REVIEW.includes(gone), `١٤. ولا يُسكَب «${gone}» في البطاقة`);
}
check(/function actionLine\(r: ReviewCard\)/.test(REVIEW),
  "١٥. **وماذا جرى يُقال بلغة الأرض** لا بحالةٍ داخلية");
check(/function handledBy\(r: ReviewCard\)/.test(REVIEW),
  "   ومَن تولّاه معه");
for (const [re, msg] of [
  [/review-window-today/, "١٦. و«اليوم» افتراضاً"],
  [/غير مراجعة سابقة/, "   وبابٌ واحدٌ للمتروك قبله"],
  [/useState<Win>\("today"\)/, "   والافتراضُ «اليوم» فعلاً"],
] as [RegExp, string][]) check(re.test(REVIEW), msg);
check(/إرجاع للاستعلامات/.test(REVIEW) && /askReturn/.test(REVIEW),
  "١٧. والإرجاعُ يمرّ بحارسِ السبب قبل الإرسال");
check(/canSupervise \?/.test(REVIEW),
  "١٨. **والأزرارُ تتبع القدرة الإشرافية** لا القدرة على التوقيع");
check(/\{canDecide && \(/.test(REVIEW),
  "   و«يتطلّب معاينة كاملة» خلف القدرة السريرية وحدها");

//  ══ **بابُ المدير إلى الطلبات المنتظرة** ═══════════════════════════
//  «معايناتي» تُبنى من اختصاصات الطبيب، فمديرُ الفرع يقرؤها فارغةً دائماً
//  — فكان يملك قدرةَ الإرجاع بلا بابٍ يصله. وفتحُ «معايناتي» له كان سيضعه
//  أمام زرِّ «كتابة معاينة»، وهو ما لا يجوز.
check(/طلبات معاينة كاملة بانتظار الطبيب/.test(REVIEW),
  "١٩. **وقسمٌ صغيرٌ للطلبات المنتظرة في صفحة الإشراف**");
check(/awaitingFull\.length > 0/.test(REVIEW) && /canSupervise && awaitingFull/.test(REVIEW),
  "   يظهر لمن يملك الإشراف وحده، وحين يوجد ما يُعرَض");
for (const [re, msg] of [
  [/awaiting-open-\$\{r\.id\}/, "٢٠. وفيه «فتح ملف المريض»"],
  [/awaiting-return-\$\{r\.id\}/, "   و«إرجاع للاستعلامات»"],
  [/awaiting-return-reason/, "   وسببٌ إلزاميّ في نافذته"],
  [/disabled=\{!returnReason\.trim\(\) \|\| returnBusy\}/, "   لا إرسالَ بلا سبب"],
] as [RegExp, string][]) check(re.test(REVIEW), msg);
//  **ولا زرَّ معاينةٍ ولا توقيعٍ في هذا القسم إطلاقاً.**
const section = REVIEW.slice(
  REVIEW.indexOf("awaiting-full-section"),
  REVIEW.indexOf("{isLoading ?"),
);
check(section.length > 400, "   والقسمُ اقتُطع فعلاً للفحص", String(section.length));
for (const forbidden of ["كتابة معاينة", "NewExamDialog", "setTarget"]) {
  check(!section.includes(forbidden),
    `٢١. **ولا «${forbidden}» فيه** — المديرُ يراجع ولا يوقّع`);
}

console.log("\n── ٤. «معايناتي»: بابُ خروجٍ نظيف ──");

check(/returnableRequestId/.test(MY_EXAMS),
  "١٩. الصفُّ يحمل رقمَ الطلب القابل للإرجاع — يرسله الخادم");
check(/r\.returnableRequestId != null && \(/.test(MY_EXAMS),
  "٢٠. **ولا زرَّ حين لا يرسله** — القدرةُ تُقرَّر في الخادم لا في الشاشة");
check(/api\/medical-review\/requests\/\$\{id\}\/return/.test(MY_EXAMS),
  "٢١. والزرُّ ينادي نقطةَ الإرجاع");
check(/disabled=\{!returnReason\.trim\(\) \|\| returnBusy\}/.test(MY_EXAMS),
  "٢٢. **والسببُ إلزاميٌّ قبل الإرسال**");
check(/ولا تُكتب معاينةٌ ولا تُحذف|<b>ولا تُكتب معاينةٌ ولا تُحذف<\/b>/.test(MY_EXAMS),
  "٢٣. والنافذةُ تقول ما لا يحدث: لا معاينةَ تُكتب ولا تُحذف");
//  **ولا زرَّ حذفٍ لمعاينةٍ موقّعة في هذه التمريرة إطلاقاً.**
for (const forbidden of ["DELETE", "حذف المعاينة", "deleteExam"]) {
  check(!MY_EXAMS.includes(forbidden),
    `٢٤. ولا أثرَ لـ«${forbidden}» — حذفُ المعاينة الموقّعة خارج هذه التمريرة`);
}

console.log(`\n${failures === 0 ? "✅ all supervisor-ui cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
