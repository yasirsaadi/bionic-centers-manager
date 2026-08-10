// نموذج المراحل المبسَّط — الاختبار الدائم. بلا قاعدة بيانات:
// `npm run test:stages`.
//
// يحرس ثلاث قواعد لا يجوز أن تنكسر بصمت:
//   ١. كل كود مرحلة قديم له وجهة واحدة معروفة في الست الجديدة.
//   ٢. لا تنقّل عشوائي: التقدّم إلى التالية فقط، والرجوع بإعادة عمل فقط.
//   ٣. ما يراه المريض لا يحمل حالةً ولا سبباً ولا اسم خبير — أبداً.

import {
  BUILD_STAGES, DELIVERED_STAGE, FIRST_STAGE, HOLD_REASONS, HOLD_STATUSES,
  LEGACY_STAGE_MAP, LEGACY_STATUS_MAP, MOLD_STAGE, PATIENT_FORBIDDEN_FIELDS,
  PROSTHETIC_MAINTENANCE_STAGES, STAGE_LABELS, STATUSES, STATUS_LABELS,
  SUPPORT_MAINTENANCE_STAGES, defaultNextStage, isAtOrBeyondMoldStage,
  isHoldStatus, isValidHoldReason, mapLegacyStage, nextStages,
  reworkReturnStages, stagesForOrder, toPatientStageView,
  currentStageEnteredAt, normalizeHistoryStage, parseDeliveryDateNote,
  deliveryDateSetNote, deliveryDateChangeNote,
} from "@shared/manufacturing";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function eq(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

console.log("── الست المعتمدة ──");
eq("الترتيب", [...BUILD_STAGES],
  ["order_received", "measurements", "mold", "manufacturing", "ready_for_fitting", "delivered"]);
eq("الأولى", FIRST_STAGE, "order_received");
eq("الأخيرة", DELIVERED_STAGE, "delivered");
eq("مرحلة القالب", MOLD_STAGE, "mold");
for (const st of BUILD_STAGES) {
  check(!!STAGE_LABELS[st] && !STAGE_LABELS[st].includes("سابقاً"), `تسمية عربية حيّة لـ${st}`, STAGE_LABELS[st]);
}
eq("التسميات المعتمدة", BUILD_STAGES.map((s) => STAGE_LABELS[s]), [
  "استلام أمر التصنيع", "القياسات والتقييم", "أخذ وتجهيز القالب",
  "التصنيع والتجهيز", "جاهز للتجربة والتسليم", "تم التسليم",
]);

console.log("\n── تحويل كل كود قديم: الأطراف ──");
const PROSTHETIC_EXPECTED: Record<string, string> = {
  new_assignment: "order_received",
  assessment_measurements: "measurements",
  cast_taken: "mold",
  cast_preparation: "mold",
  test_socket: "manufacturing",
  first_fitting: "manufacturing",
  socket_adjustment: "manufacturing",
  alignment: "manufacturing",
  final_socket: "manufacturing",
  final_assembly: "manufacturing",
  quality_check: "manufacturing",
  ready_for_delivery: "ready_for_fitting",
  delivered: "delivered",
  post_delivery_followup: "delivered",
};
for (const [old, want] of Object.entries(PROSTHETIC_EXPECTED)) {
  eq(`${old} ← ${want}`, mapLegacyStage("prosthetic", old), want);
}
eq("لا كود قديم بلا وجهة (أطراف)",
  Object.keys(PROSTHETIC_EXPECTED).filter((k) => !LEGACY_STAGE_MAP.prosthetic[k]), []);

console.log("\n── تحويل كل كود قديم: المساند ──");
const SUPPORT_EXPECTED: Record<string, string> = {
  new_assignment: "order_received",
  assessment_measurements: "measurements",
  cast_if_needed: "mold",
  manufacturing: "manufacturing",
  fitting: "manufacturing",
  adjustment: "manufacturing",
  quality_check: "manufacturing",
  ready_for_delivery: "ready_for_fitting",
  delivered: "delivered",
};
for (const [old, want] of Object.entries(SUPPORT_EXPECTED)) {
  eq(`${old} ← ${want}`, mapLegacyStage("medical_support", old), want);
}
check(mapLegacyStage("prosthetic", "لا_يوجد") === null, "كود مجهول ⇒ null لا تخمين");
for (const st of BUILD_STAGES) {
  eq(`الجديد يعيد نفسه: ${st}`, mapLegacyStage("prosthetic", st), st);
}

console.log("\n── تحويل الحالات ──");
eq("waiting_components", LEGACY_STATUS_MAP.waiting_components, "waiting_materials");
eq("needs_recast", LEGACY_STATUS_MAP.needs_recast, "technical_rework");
eq("needs_resocket", LEGACY_STATUS_MAP.needs_resocket, "technical_rework");
eq("الحالات المعتمدة", [...STATUSES],
  ["active", "waiting_patient", "waiting_materials", "medical_hold", "technical_rework", "completed", "cancelled"]);
for (const s of STATUSES) check(!!STATUS_LABELS[s], `تسمية للحالة ${s}`);
eq("حالات التوقّف الأربع", [...HOLD_STATUSES],
  ["waiting_patient", "waiting_materials", "medical_hold", "technical_rework"]);
check(!isHoldStatus("active") && !isHoldStatus("completed"), "active/completed ليستا توقّفاً");

console.log("\n── أسباب التوقّف ──");
for (const st of HOLD_STATUSES) {
  check(HOLD_REASONS[st].length > 0, `${st}: قائمة أسباب غير فارغة`);
  for (const r of HOLD_REASONS[st]) check(!!r.label, `${st}/${r.code}: تسمية عربية`);
  check(isValidHoldReason(st, HOLD_REASONS[st][0].code), `${st}: سببه الأول مقبول`);
  check(!isValidHoldReason(st, "سبب_مخترع"), `${st}: سبب مخترَع مرفوض`);
}
check(!isValidHoldReason("waiting_patient", "swelling"), "سبب طبي لا يصلح لانتظار المريض");
check(!isValidHoldReason("active", "swelling"), "لا أسباب لحالة غير متوقّفة");

console.log("\n── التقدّم: التالية فقط ──");
for (let i = 0; i < BUILD_STAGES.length - 1; i++) {
  eq(`${BUILD_STAGES[i]} ⇐ التالية`, defaultNextStage("prosthetic", BUILD_STAGES[i]), BUILD_STAGES[i + 1]);
  eq(`${BUILD_STAGES[i]}: وجهة واحدة (أطراف)`, nextStages("prosthetic", BUILD_STAGES[i]).length, 1);
}
eq("لا تالية بعد التسليم", nextStages("prosthetic", "delivered"), []);
eq("مسند: القياسات ⇐ القالب أو تخطّيه إلى التصنيع",
  nextStages("medical_support", "measurements"), ["mold", "manufacturing"]);
eq("والافتراضي هو القالب", defaultNextStage("medical_support", "measurements"), "mold");
eq("الأطراف لا تتخطّى القالب", nextStages("prosthetic", "measurements"), ["mold"]);
check(!nextStages("prosthetic", "order_received").includes("manufacturing"), "لا قفز من الاستلام إلى التصنيع");
check(!nextStages("prosthetic", "mold").includes("delivered"), "لا قفز من القالب إلى التسليم");

console.log("\n── الرجوع: بإعادة العمل فقط ──");
eq("من ready_for_fitting", reworkReturnStages("prosthetic", "ready_for_fitting"),
  ["measurements", "mold", "manufacturing"]);
eq("من manufacturing", reworkReturnStages("prosthetic", "manufacturing"), ["measurements", "mold"]);
eq("لا رجوع من أول مرحلة", reworkReturnStages("prosthetic", "order_received"), []);
check(!reworkReturnStages("prosthetic", "delivered").includes("order_received"),
  "ولا يُرجَع إلى «استلام الأمر» — ذلك إلغاء لا إعادة عمل");
for (const st of BUILD_STAGES) {
  const back = reworkReturnStages("prosthetic", st);
  const i = BUILD_STAGES.indexOf(st);
  check(back.every((b) => BUILD_STAGES.indexOf(b) < i), `${st}: كل خيارات الرجوع سابقة له`);
}

console.log("\n── موعد التسليم عند القالب فما بعد ──");
check(!isAtOrBeyondMoldStage("prosthetic", "order_received"), "قبل القالب: لا موعد");
check(!isAtOrBeyondMoldStage("prosthetic", "measurements"), "القياسات: لا موعد");
for (const st of ["mold", "manufacturing", "ready_for_fitting", "delivered"]) {
  check(isAtOrBeyondMoldStage("prosthetic", st), `${st}: الموعد إلزامي`);
}
check(isAtOrBeyondMoldStage("medical_support", "manufacturing"),
  "مسند تخطّى القالب يبقى ملزَماً بالموعد");
check(!isAtOrBeyondMoldStage("prosthetic", "maintenance_device_done", "maintenance"),
  "الصيانة لا موعد إلزامياً لها");

console.log("\n── الصيانة لم تُمسّ ──");
eq("مسار صيانة الأطراف", stagesForOrder("prosthetic", "maintenance"), PROSTHETIC_MAINTENANCE_STAGES);
eq("مسار صيانة المساند", stagesForOrder("medical_support", "maintenance"), SUPPORT_MAINTENANCE_STAGES);
eq("وتبدأ من new_assignment", stagesForOrder("prosthetic", "maintenance")[0], "new_assignment");
eq("والبناء الأولي من الست", stagesForOrder("prosthetic", "initial_build"), [...BUILD_STAGES]);

// الصيانة اختيارُ ما أُنجِز لا تسلسل. إلزامها بالتالية-فقط كان سيجبر مَن
// صلّح الطرف على تسجيل صيانة قالب لم تحدث ليصل إليها.
eq("صيانة الأطراف تعرض خطوتَي الإنجاز معاً",
  nextStages("prosthetic", "new_assignment", "maintenance"),
  ["maintenance_cast_done", "maintenance_device_done"]);
eq("وصيانة المساند خطوتها الوحيدة",
  nextStages("medical_support", "new_assignment", "maintenance"),
  ["maintenance_support_done"]);
eq("ولا تقدّم بعد الإنجاز",
  nextStages("prosthetic", "maintenance_cast_done", "maintenance"), []);

console.log("\n── ما يراه المريض ──");
{
  const view = toPatientStageView({ currentStage: "manufacturing", serviceType: "prosthetic", purpose: "initial_build" });
  eq("المرحلة", view.stage, "manufacturing");
  eq("التسمية", view.stageLabel, "التصنيع والتجهيز");
  eq("الخطوة", [view.stepNumber, view.totalSteps], [4, 6]);
  eq("النسبة", view.percent, 67);
  check(view.isDelivered === false, "ليس مسلَّماً");

  // القاعدة الصلبة: لا حقل ممنوع في المُخرَج.
  const keys = Object.keys(view);
  const leaked = keys.filter((k) => PATIENT_FORBIDDEN_FIELDS.includes(k));
  eq("لا حقل ممنوع في مُخرَج المريض", leaked, []);
  eq("والحقول المسموحة فقط", keys.sort(),
    ["isDelivered", "percent", "stage", "stageLabel", "stepNumber", "totalSteps"]);

  // ولو مُرِّر الأمر كاملاً بحالته وسببه، لا يتسرّب منها شيء.
  const full = toPatientStageView({
    currentStage: "mold", serviceType: "prosthetic", purpose: "initial_build",
    status: "medical_hold", holdReasonCode: "swelling", holdNote: "تورّم شديد",
    expertName: "عناد", finalResult: "first_fit_success",
  } as any);
  eq("تمرير حقول داخلية لا يُخرجها", Object.keys(full).filter((k) => PATIENT_FORBIDDEN_FIELDS.includes(k)), []);
  eq("والمرحلة وحدها هي المُخرَج", full.stage, "mold");
}

console.log("\n── التقدّم يرجع مع رجوع العمل ──");
{
  const ready = toPatientStageView({ currentStage: "ready_for_fitting", serviceType: "prosthetic", purpose: "initial_build" });
  const back = toPatientStageView({ currentStage: "manufacturing", serviceType: "prosthetic", purpose: "initial_build" });
  eq("جاهز للتجربة = ٥/٦", [ready.stepNumber, ready.percent], [5, 83]);
  eq("وبعد الرجوع للتصنيع = ٤/٦", [back.stepNumber, back.percent], [4, 67]);
  check(back.percent < ready.percent, "الشريط رجع للخلف فعلاً — لا يُحسب من أعلى مرحلة بُلغت");
  // ورجوع أعمق يُرجع أكثر.
  const deeper = toPatientStageView({ currentStage: "mold", serviceType: "prosthetic", purpose: "initial_build" });
  check(deeper.percent < back.percent, "ورجوع أعمق يُنقص أكثر");
}

console.log("\n── الحالة لا تدخل حساب التقدّم إطلاقاً ──");
{
  const a = toPatientStageView({ currentStage: "mold", serviceType: "prosthetic", purpose: "initial_build" });
  const b = toPatientStageView({ currentStage: "mold", serviceType: "prosthetic", purpose: "initial_build", status: "medical_hold" } as any);
  eq("متوقّف أو لا، النتيجة واحدة", a, b);
}

// ══ قراءة السجلّ القديم: متى دخل الأمر مرحلته الحالية؟ ═══════════════════
console.log("\n── تطبيع مراحل السجلّ ──");
eq("كود قديم يُترجَم", normalizeHistoryStage("prosthetic", "initial_build", "test_socket"), "manufacturing");
eq("وكود جديد يبقى", normalizeHistoryStage("prosthetic", "initial_build", "manufacturing"), "manufacturing");
eq("والفراغ فراغ", normalizeHistoryStage("prosthetic", "initial_build", null), null);
eq("والمساند بخريطتها", normalizeHistoryStage("medical_support", "initial_build", "cast_if_needed"), "mold");
// الصيانة لم يمسّها الترحيل، فـ new_assignment عندها مرحلة حيّة لا كود قديم.
eq("والصيانة لا تُترجَم", normalizeHistoryStage("prosthetic", "maintenance", "new_assignment"), "new_assignment");

console.log("\n── دخول المرحلة يُحسب بعد التطبيع ──");
{
  const order = { currentStage: "manufacturing", serviceType: "prosthetic", purpose: "initial_build" };
  // سجلّ أمرٍ قديم: أربع مراحل قديمة ثلاثٌ منها «تصنيع» بعد التطبيع.
  const hist = [
    { fromStage: null, toStage: "new_assignment", at: "2026-01-01T08:00:00Z" },
    { fromStage: "new_assignment", toStage: "assessment_measurements", at: "2026-01-02T08:00:00Z" },
    { fromStage: "assessment_measurements", toStage: "cast_taken", at: "2026-01-03T08:00:00Z" },
    { fromStage: "cast_taken", toStage: "test_socket", at: "2026-01-04T08:00:00Z" },
    { fromStage: "test_socket", toStage: "first_fitting", at: "2026-01-05T08:00:00Z" },
    { fromStage: "first_fitting", toStage: "socket_adjustment", at: "2026-01-06T08:00:00Z" },
  ];
  eq("الدخول هو أوّل انتقال من القالب إلى التصنيع",
    currentStageEnteredAt(order, hist)?.toISOString(), "2026-01-04T08:00:00.000Z");

  // ولو قورنت الأسماء حرفياً لَما طابق شيء ولسقط الحساب — هذه هي العلّة.
  const literal = hist.filter((h) => h.toStage === order.currentStage);
  eq("ولا سطر يطابق حرفياً (العلّة قبل الإصلاح)", literal.length, 0);
}

console.log("\n── الرجوع الفنّي يعيد العدّ من لحظته ──");
{
  const order = { currentStage: "manufacturing", serviceType: "prosthetic", purpose: "initial_build" };
  const hist = [
    { fromStage: "cast_taken", toStage: "test_socket", at: "2026-01-04T08:00:00Z" },
    { fromStage: "test_socket", toStage: "ready_for_delivery", at: "2026-01-10T08:00:00Z" },
    // إعادة عمل فنّي: رجوع حقيقي إلى التصنيع.
    { fromStage: "ready_for_fitting", toStage: "manufacturing", at: "2026-01-20T08:00:00Z" },
  ];
  eq("العدّ من الرجوع الأخير لا من الدخول الأول",
    currentStageEnteredAt(order, hist)?.toISOString(), "2026-01-20T08:00:00.000Z");
}

console.log("\n── التوقّف لا يصفّر عدّاد المرحلة ──");
{
  const order = { currentStage: "mold", serviceType: "prosthetic", purpose: "initial_build" };
  const hist = [
    { fromStage: "measurements", toStage: "mold", at: "2026-02-01T08:00:00Z" },
    // سطر توقّف: الطرفان متساويان، فليس دخولاً.
    { fromStage: "mold", toStage: "mold", at: "2026-02-09T08:00:00Z" },
  ];
  eq("يبقى الدخول هو الدخول", currentStageEnteredAt(order, hist)?.toISOString(), "2026-02-01T08:00:00.000Z");
}

console.log("\n── الصيانة تُحسب بمراحلها هي ──");
{
  const order = { currentStage: "new_assignment", serviceType: "prosthetic", purpose: "maintenance" };
  const hist = [{ fromStage: null, toStage: "new_assignment", at: "2026-03-01T08:00:00Z" }];
  eq("ولا تُترجَم إلى order_received", currentStageEnteredAt(order, hist)?.toISOString(), "2026-03-01T08:00:00.000Z");
}

console.log("\n── سجلّ فارغ أو بلا دخول ──");
{
  const order = { currentStage: "manufacturing", serviceType: "prosthetic", purpose: "initial_build" };
  eq("سجلّ فارغ ⇒ null", currentStageEnteredAt(order, []), null);
  eq("سجلّ بلا دخول للمرحلة ⇒ null",
    currentStageEnteredAt(order, [{ fromStage: null, toStage: "new_assignment", at: "2026-01-01T08:00:00Z" }]), null);
}

// ══ نصّ موعد التسليم: يُكتب ويُقرأ بعقد واحد ═════════════════════════════
console.log("\n── سجلّ موعد التسليم ──");
{
  const first = deliveryDateSetNote("2026-08-20");
  eq("أول تحديد بلا موعد سابق", parseDeliveryDateNote(first),
    { previousDate: null, newDate: "2026-08-20", reason: null });

  const changed = deliveryDateChangeNote("2026-08-20", "2026-08-25", "تأخر وصول المكونات من الشركة المصنعة");
  eq("والتغيير يحمل الموعدين والسبب", parseDeliveryDateNote(changed),
    { previousDate: "2026-08-20", newDate: "2026-08-25", reason: "تأخر وصول المكونات من الشركة المصنعة" });

  // سجلّات الإنتاج مكتوبة بالصيغة القديمة ولا يُعاد كتابتها أبداً.
  eq("والصيغة القديمة تُقرأ أيضاً",
    parseDeliveryDateNote("تغيير موعد التسليم المتوقع من 2026-08-20 إلى 2026-08-25 — السبب: تأخير"),
    { previousDate: "2026-08-20", newDate: "2026-08-25", reason: "تأخير" });
  eq("والقديمة بلا موعد سابق",
    parseDeliveryDateNote("تغيير موعد التسليم المتوقع من — إلى 2026-08-20"),
    { previousDate: null, newDate: "2026-08-20", reason: null });
}

console.log(failures === 0 ? "\n✅ all stage-model cases pass" : `\n❌ ${failures} case(s) failed`);
process.exit(failures === 0 ? 0 : 1);
