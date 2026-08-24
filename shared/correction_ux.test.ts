// **عقدُ تجربة التصحيح الإداريّ** — بلا قاعدة بيانات وبلا شبكة.
// `npm run test:correction-ux`
//
// ══ ما يغطّيه ═══════════════════════════════════════════════════════════
// (أ) **حالةُ العرض تسبق التاريخ**: متابعةٌ ملغاةٌ إدارياً لا تُقرأ «تم
//     الشراء» لمجرّد أنها تحمل رقمَ أمرٍ قديم.
// (ب) **حقائقُ الحدث تُقرأ بلا معجم**: ماذا كان وماذا صار، بعناوين
//     `requestedItemLabel` القائمة لا بمعجمٍ ثانٍ ولا برقمِ حلقةٍ داخليّ.
// (ج) **خريطةُ النيّة واحدة** يقرؤها الطرفان، والعنوانُ يقول الأثر.
// (د) **الحارسُ المعماريّ**: لا `INSERT INTO patient_device_episodes` في
//     منسّق التصحيح — كتابةُ الحلقات في طبقتها وحدها.
//
// ══ وما لا يغطّيه — معلَنٌ لا مسكوتٌ عنه ════════════════════════════════
// **السلوكُ الحقيقيّ على القاعدة**: البرهانُ الأساسيّ حيٌّ على Postgres في
// `npm run test:administrative-reversal` (الاستبدالُ والتزامنُ والتراجعُ
// الكامل والمسلَّم). وفحوصُ النصّ هنا **عقدٌ خفيف** لا بديلٌ عنه.

import assert from "node:assert/strict";
import fs from "node:fs";
import {
  purchasePresentation, followupEventView, replacementEpisodeIdOf, PURCHASE_STATE_TEXT,
} from "./followup_events";
import {
  CORRECTION_INTENTS, CORRECTION_INTENT_LABELS, CORRECTION_INTENT_EFFECTS,
  CORRECTION_INTENT_MODE, CORRECTION_INTENT_REASON, isCorrectionIntent,
  replacementSummaryLine, REVERSAL_REASON_CODES,
} from "./administrative_reversal";

// ══ (أ) حالةُ العرض — أربعُ حالاتٍ لا واحدة ═══════════════════════════════
//  الملغاةُ إدارياً تحمل `converted_work_order_id` تاريخياً، وقراءتُه وحدَه
//  كانت تقول «تم الشراء — بدأ التصنيع» عن عمليةٍ أُبطلت وعُكس مالُها.
assert.equal(purchasePresentation({
  status: "closed_admin_void", convertedWorkOrderId: 243,
}), "admin_void", "الإلغاءُ الإداريّ يسبق رقمَ الأمر التاريخيّ");
assert.equal(purchasePresentation({
  status: "closed_exam_cancelled", convertedWorkOrderId: 243,
}), "exam_cancelled");
assert.equal(purchasePresentation({
  status: "closed_without_purchase", convertedWorkOrderId: 243,
}), "closed");
//  **والعمليةُ الحيّة لم تتغيّر بحرف** — وهذا نصفُ الحارس.
assert.equal(purchasePresentation({ status: "converted", convertedWorkOrderId: 243 }), "converted");
assert.equal(purchasePresentation({ status: "awaiting_patient_decision", convertedWorkOrderId: 9 }),
  "converted", "وجودُ أمرٍ على متابعةٍ حيّة يعني بيعاً وقع");
assert.equal(purchasePresentation({ status: "awaiting_patient_decision" }), "awaiting");
assert.equal(purchasePresentation({ status: "awaiting_patient_decision", hasPendingDiscount: true }),
  "discount_pending");
assert.equal(PURCHASE_STATE_TEXT.converted, "تم الشراء — بدأ التصنيع");
assert.equal(PURCHASE_STATE_TEXT.admin_void, "عملية ملغاة إدارياً");
//  **ولا حالةَ بلا نصّ** — مفتاحٌ بلا ترجمة يصل الشاشةَ خاماً.
for (const k of Object.keys(PURCHASE_STATE_TEXT)) {
  assert.ok((PURCHASE_STATE_TEXT as any)[k]?.length > 0, `نصُّ ${k}`);
}

// ══ (ب) حقائقُ الحدث — إنسانيةٌ لا داخلية ════════════════════════════════
const event = followupEventView({
  eventType: "administrative_reversal", note: "اختير الجهاز الخطأ",
  payload: {
    workOrderId: 243, replacementEpisodeId: 88,
    previousRequestedItem: "full_device", replacementRequestedItem: "socket",
    serviceType: "prosthetic",
  },
});
assert.equal(event.title, "أُلغيت العملية إدارياً");
assert.ok(event.facts.includes("الطلب السابق: طرف صناعي كامل"), event.facts.join(" | "));
assert.ok(event.facts.includes("الطلب الجديد: القالب"), event.facts.join(" | "));
assert.ok(event.facts.includes("أمر التصنيع السابق: #243"));
assert.ok(event.facts.includes("سبب التصحيح: اختير الجهاز الخطأ"));
//  **ولا رقمَ حلقةٍ داخليّ على الشاشة** — يبقى في الحمولة للتدقيق وحده.
assert.ok(!event.facts.some((f) => f.includes("88")), event.facts.join(" | "));
//  والملاحظةُ لا تتكرّر: خرجت معنونةً «سبب التصحيح» فلا تُضاف خامّاً.
assert.equal(event.facts.filter((f) => f.includes("اختير الجهاز الخطأ")).length, 1);
//  وإلغاءٌ بلا استبدال يقول ما وقع ولا يخترع طلباً جديداً.
const plain = followupEventView({
  eventType: "administrative_reversal", note: "ضُغط الشراء بالخطأ",
  payload: { workOrderId: 7, previousRequestedItem: "socket", serviceType: "prosthetic" },
});
assert.ok(plain.facts.includes("الطلب السابق: القالب"));
assert.ok(!plain.facts.some((f) => f.startsWith("الطلب الجديد")), plain.facts.join(" | "));
//  والمساندُ لا يُوصَف بأنه طرف — العنوانُ يُشتقّ من نوع الخدمة.
const support = followupEventView({
  eventType: "administrative_reversal", note: "خطأ",
  payload: { previousRequestedItem: "full_device", serviceType: "medical_support" },
});
assert.ok(support.facts.includes("الطلب السابق: مسند طبي كامل"), support.facts.join(" | "));

// ══ (ب-٢) **هويّةُ الطلب البديل — بالمعرّف لا بالترشيح** ═════════════════
//  المريضُ يملك خيوطاً متوازية، فـ«أوّلُ حلقةٍ مفتوحة» كانت تعرض مسندَه
//  بوصفه الطلبَ الذي وُلد عن تصحيح طرفه.
//  **والحدثُ بمعرّفه كما يصل من الخادم** — `getEvents` تُرجع `ORDER BY id
//  DESC`، أي **الأحدثُ أوّلاً**. والاختبارُ يصف ذلك الترتيبَ حرفياً.
const REV_EV = (id: number | null | undefined, eventId?: number) => ({
  ...(eventId === undefined ? {} : { id: eventId }),
  eventType: "administrative_reversal",
  payload: { workOrderId: 5, ...(id === undefined ? {} : { replacementEpisodeId: id }) },
});
assert.equal(replacementEpisodeIdOf([REV_EV(88, 10)]), 88);
assert.equal(replacementEpisodeIdOf(
  [{ id: 11, eventType: "closed_without_purchase" }, REV_EV(88, 10)]), 88);
//  **ولا تخمينَ حين لا استبدال**: إلغاءٌ كاملٌ بلا بديل ⟶ `null`.
assert.equal(replacementEpisodeIdOf([REV_EV(undefined, 10)]), null);
assert.equal(replacementEpisodeIdOf([REV_EV(null, 10)]), null);
assert.equal(replacementEpisodeIdOf([{ id: 10, eventType: "administrative_reversal" }]), null);
assert.equal(replacementEpisodeIdOf(
  [{ id: 10, eventType: "converted", payload: { replacementEpisodeId: 9 } }]),
null, "حدثٌ آخر لا يمنح هويّةَ بديل");
assert.equal(replacementEpisodeIdOf([]), null);
assert.equal(replacementEpisodeIdOf(null), null);
assert.equal(replacementEpisodeIdOf(undefined), null);
assert.equal(replacementEpisodeIdOf([REV_EV(0, 10)]), null, "صفرٌ ليس معرّفاً");
assert.equal(replacementEpisodeIdOf([REV_EV(-3, 10)]), null, "ولا سالب");
assert.equal(replacementEpisodeIdOf([REV_EV("abc" as any, 10)]), null, "ولا نصٌّ");

// ══ **التصحيحُ الأخيرُ هو القائم** — والترتيبُ لا يخدع ═══════════════════
//  ١) الأحدثُ أوّلاً كما يصل فعلاً: بديلُ ٢٠٠ أحدثُ من بديل ١٠٠.
assert.equal(replacementEpisodeIdOf([REV_EV(200, 20), REV_EV(100, 10)]), 200,
  "الأحدثُ يسود ولو جاء أوّلاً في المصفوفة");
//  والحكمُ بالمعرّف لا بالموضع: مصفوفةٌ مقلوبةٌ تعطي النتيجةَ نفسَها.
assert.equal(replacementEpisodeIdOf([REV_EV(100, 10), REV_EV(200, 20)]), 200,
  "ولا يتغيّر الحكمُ بترتيب المصفوفة ما دامت المعرّفات موجودة");

//  ٢) **إلغاءٌ كاملٌ لاحقٌ بلا استبدال ⟶ لا بديلَ قائماً.**
//     القاعدةُ الدلالية: التصحيحُ الأخير يصف الملفَّ الآن. فحلقةُ استبدالٍ
//     أبطلها تصحيحٌ تالٍ لا يجوز أن تُعرَض «طلباً جديداً» — والصمتُ أصدق.
assert.equal(replacementEpisodeIdOf([REV_EV(undefined, 20), REV_EV(100, 10)]), null,
  "إلغاءٌ لاحقٌ بلا بديل ⟶ لا استبدالَ منسوبٌ إلى التصحيح القائم");

//  ٣) أحداثٌ أحدثُ من أنواعٍ أخرى لا تمسّ هويّةَ آخر تصحيح.
assert.equal(replacementEpisodeIdOf([
  { id: 40, eventType: "reopened" },
  { id: 30, eventType: "exam_price_corrected", payload: { replacementEpisodeId: 999 } },
  REV_EV(200, 20),
  REV_EV(100, 10),
]), 200, "نوعٌ آخر أحدثُ لا يغيّر هويّةَ آخر تصحيحٍ إداريّ");

//  وبلا معرّفاتٍ إطلاقاً (كائناتٌ مجرّدة) يُؤخَذ الأوّلُ وفق عقد «الأحدثُ
//  أوّلاً» — لا الأخيرُ، وهو بالضبط ما كان مقلوباً.
assert.equal(replacementEpisodeIdOf([REV_EV(200), REV_EV(100)]), 200);

// ══ (ج) النيّة — خريطةٌ واحدة، وعنوانٌ يقول الأثر ═════════════════════════
assert.equal(CORRECTION_INTENTS.length, 4);
for (const i of CORRECTION_INTENTS) {
  assert.ok(isCorrectionIntent(i));
  assert.ok(CORRECTION_INTENT_LABELS[i]?.length > 0, `عنوانُ ${i}`);
  assert.ok(CORRECTION_INTENT_EFFECTS[i]?.length > 0, `أثرُ ${i}`);
  assert.ok(CORRECTION_INTENT_MODE[i] === "purchase_only"
    || CORRECTION_INTENT_MODE[i] === "full_operation", `وضعُ ${i}`);
  assert.ok((REVERSAL_REASON_CODES as readonly string[]).includes(CORRECTION_INTENT_REASON[i]),
    `سببُ ${i}`);
}
assert.ok(!isCorrectionIntent("delete_everything"));
assert.equal(CORRECTION_INTENT_MODE.purchase_mistake, "purchase_only");
assert.equal(CORRECTION_INTENT_MODE.replace_requested_item, "full_operation");

// **والعنوانُ لا يخدع**: كلُّ نيّةٍ تُلغي العمليةَ بالكامل تقول ذلك في
// عنوانها أو في أثرها — فلا يظنّ المسؤولُ أن أمر التصنيع وحده يُلغى.
for (const i of CORRECTION_INTENTS) {
  if (CORRECTION_INTENT_MODE[i] !== "full_operation") continue;
  const said = `${CORRECTION_INTENT_LABELS[i]} ${CORRECTION_INTENT_EFFECTS[i]}`;
  assert.ok(/بالكامل|الشراء وأمر التصنيع والمعاينة/.test(said),
    `«${i}» يجب أن تقول إن العملية تُلغى بالكامل: ${said}`);
}
assert.ok(/لا أمر التصنيع وحده/.test(CORRECTION_INTENT_EFFECTS.work_order_mistake),
  "«أمر تصنيع بالخطأ» يجب أن تنفي صراحةً أن الأمر وحده يُلغى");
//  وسطرُ الطلب الجديد **دالّةٌ واحدة** يقرؤها الملخّصُ والسجلّ.
assert.equal(replacementSummaryLine("القالب").text, "فتح طلب جديد: القالب — بانتظار المعاينة");
assert.equal(replacementSummaryLine("القالب").kind, "check");

// ══ (د) الحارسُ المعماريّ — كتابةُ الحلقات في طبقتها ═════════════════════
const reversalStore = fs.readFileSync("server/admin_reversal/store.ts", "utf8");
assert.ok(!/INSERT\s+INTO\s+patient_device_episodes/i.test(reversalStore),
  "منسّقُ التصحيح لا يُدرج حلقةً بنفسه — الطبقةُ القانونية تملكها");
assert.ok(!/(UPDATE|DELETE\s+FROM)\s+patient_device_episodes/i.test(reversalStore),
  "ولا يحدّثها ولا يحذفها");
assert.ok(reversalStore.includes("createReplacementEpisodeTx(tx, {"),
  "بل ينادي الدالّة القانونية بمعاملته هو");

const episodeStore = fs.readFileSync("server/device_episodes/store.ts", "utf8");
assert.ok(/export async function createReplacementEpisodeTx/.test(episodeStore),
  "والدالّة تعيش في طبقة الحلقات");
//  وتحمل ثوابتَ `startDeviceEpisode` نفسَها — لا نسخةً مخفَّفة.
for (const invariant of [
  "FROM patients WHERE id =",                       // المريض موجود
  "FROM patient_cases",                             // الخيط موجود
  "AND case_type =",                                // ومن هذا النوع
  "FOR UPDATE",                                     // مقفولٌ عند حساب التسلسل
  "status NOT IN ('delivered', 'cancelled')",       // لا حلقةَ مفتوحةٌ ثانية
  "purpose = 'initial_build'",                      // ولا أمرُ بناءٍ قديمٍ نشط
  "COALESCE(MAX(sequence_number), 0) + 1",          // تسلسلٌ تحت القفل
  "'awaiting_exam', 0",                             // بلا شراءٍ وبكلفةٍ صفر
]) {
  const fn = episodeStore.split("createReplacementEpisodeTx")[1] ?? "";
  assert.ok(fn.includes(invariant), `ثابتٌ مفقود من الدالّة: ${invariant}`);
}
//  **ولا تصنيفَ ثانٍ ولا اشتقاقَ جزءٍ ثانٍ** — من الملفّ المشترك وحده.
assert.ok(/parseRequestedItem\(params\.requestedItem, params\.serviceType\)/.test(episodeStore));
assert.ok(/componentOfRequest\(requestedItem\)/.test(episodeStore));

// ══ عقدُ الشاشتين — خفيفٌ ومعلَنٌ كذلك ═══════════════════════════════════
const dialog = fs.readFileSync("client/src/components/AdministrativeReversalDialog.tsx", "utf8");
assert.ok(dialog.includes("ما الذي تريد تصحيحه؟"));
assert.ok(dialog.includes("preview.replacementOptions.map"),
  "قائمةُ البدائل من الخادم لا من اشتقاقٍ في الشاشة");
assert.ok(!dialog.includes("requestedItemOptions("),
  "ولا تبني الشاشةُ القائمةَ بنفسها");
assert.ok(dialog.includes("stateStamp: preview?.stateStamp"), "والختمُ ما زال يُرسَل");

const card = fs.readFileSync("client/src/components/PostExamDecisionCard.tsx", "utf8");
assert.ok(card.includes('data-testid="card-admin-void-history"'));
assert.ok(card.includes("عملية ملغاة إدارياً"));
assert.ok(card.includes('data-testid="card-current-device-request"'),
  "والطلبُ الحالي يُعرَض مع التاريخ لا بدلاً عنه");
//  **وهويّتُه من الحدث لا من ترشيح**: أوّلُ حلقةٍ مفتوحة كانت تعرض مسندَ
//  المريض بوصفه بديلَ طرفه.
assert.ok(card.includes("replacementEpisodeIdOf(active.events)"),
  "الهويّةُ من حدث التصحيح");
assert.ok(card.includes("Number(e.id) === replacementId"),
  "وتُطابَق بالمعرّف على نقطة الحلقات");
assert.ok(!/\.find\(\(e\) =>\s*e\.status === "awaiting_exam"/.test(card),
  "ولا ترشيحَ بالحالة وحدها");
//  **ولا نافذةَ تصحيحٍ من بطاقةِ عمليةٍ صُحّحت سلفاً.**
//  الفرعُ يبدأ عند شرط الحالة وينتهي حيث تبدأ البطاقةُ الحيّة.
const voidBranch = card.split('if (active.status === "closed_admin_void")')[1]
  ?.split("const actions = allowedActions(")[0] ?? "";
assert.ok(voidBranch.length > 200, "فرعُ البطاقة التاريخية مقروء");
assert.ok(!voidBranch.includes("AdministrativeReversalDialog"),
  "التصحيحُ تمّ — ولا يُفتَح عليه بابُ تنفيذٍ ثانٍ");
assert.ok(!voidBranch.includes("setReversalOpen"),
  "ولا زرَّ يفتحه");

console.log("✅ correction UX contracts pass");
