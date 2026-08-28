// «سجلّ الإجراءات» ونصُّ حالة الشراء — منطقٌ خالص، بلا React ولا قاعدة.
// `npm run test:followup-events`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **لا رمزَ إنجليزيٌّ يصل إلى موظّفة الاستقبال** — لا لنوعٍ معروف ولا
//     لنوعٍ لم يُترجَم بعد. وهذا هو العطبُ الذي وُجد على الإنتاج.
// (٢) **وكلُّ نوعٍ يكتبه الخادمُ فعلاً مترجَم** — تُقرأ الأنواعُ من مصدر
//     الخادم نفسه، فنوعٌ جديد بلا ترجمة يُسقط الاختبار.
// (٣) **والتفصيلُ من الحمولة المخزَّنة لا من الخيال** — وحدثٌ قديمٌ بلا
//     حمولة يبقى مقروءاً بعنوانه.
// (٤) **ونصُّ الشراء يقول أين وقف الملفّ**: تحوّل ⟶ «تم الشراء»، ولا يقول
//     «ينتظر إتمام البيع» بعد التحويل أبداً.

import { readFileSync } from "fs";
import { join } from "path";
import {
  followupEventView, followupEventTitle, purchasePresentation,
  FOLLOWUP_EVENT_TITLES, PURCHASE_STATE_TEXT, UNKNOWN_EVENT_TITLE,
} from "./followup_events";
import { FOLLOWUP_STATUS_LABELS } from "./followup";

let failures = 0;
function check(name: string, cond: boolean, extra?: string) {
  if (cond) console.log(`✅ ${name}`);
  else { failures++; console.log(`❌ ${name}${extra ? ` — ${extra}` : ""}`); }
}
function same(msg: string, got: unknown, expected: unknown) {
  check(msg, JSON.stringify(got) === JSON.stringify(expected),
    `expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);
}

const EXPERTS: Record<number, string> = { 7: "أيوب بغداد", 9: "سالم البصرة" };
const nameOf = (id: number) => EXPERTS[id] ?? null;
const view = (e: any) => followupEventView(e, nameOf);

console.log("\n═══ سجلّ الإجراءات ═══\n");

// ══ أ. **لا رمزَ إنجليزيٌّ يظهر — أبداً** ════════════════════════════════
//  وهذا هو جوهرُ المسألة: كانت الشاشةُ تسقط إلى `e.eventType` حين لا تجد
//  ترجمة، فتعرض `expert_selected` لموظّفةٍ لا تعرف الإنجليزية.
console.log("── لا رمز إنجليزي ──");
const LATIN = /[A-Za-z_]/;
same("أ. **كلُّ عنوانٍ في الخريطة عربيٌّ خالص** — بلا حرفٍ لاتيني",
  Object.entries(FOLLOWUP_EVENT_TITLES).filter(([, v]) => LATIN.test(v)).map(([k]) => k), []);
check("١. **ونوعٌ لم يُترجَم يُقال بعبارةٍ عربية لا باسمه**",
  followupEventTitle("some_new_event_type") === UNKNOWN_EVENT_TITLE
    && !LATIN.test(UNKNOWN_EVENT_TITLE),
  followupEventTitle("some_new_event_type"));
same("٢. والقيمةُ الفارغة أو الغائبة كذلك",
  [followupEventTitle(""), followupEventTitle(null), followupEventTitle(undefined)],
  [UNKNOWN_EVENT_TITLE, UNKNOWN_EVENT_TITLE, UNKNOWN_EVENT_TITLE]);
//  **ولا يتسرّب رمزٌ عبر التفاصيل أيضاً** — مسحٌ على المخرَج كلِّه.
{
  const leaked = Object.keys(FOLLOWUP_EVENT_TITLES).filter((t) => {
    const v = view({ eventType: t, payload: {}, note: null });
    return LATIN.test(v.title) || v.facts.some((f) => LATIN.test(f));
  });
  same("٣. **ولا حرفَ لاتينيّ في مخرَج أيّ نوعٍ بحمولةٍ فارغة**", leaked, []);
}

// ══ ب. **وكلُّ نوعٍ يكتبه الخادمُ فعلاً مترجَم** ═════════════════════════
//  تُقرأ الأنواعُ من مصدر الخادم لا من قائمةٍ منسوخة: نوعٌ جديد يُضاف هناك
//  وتُنسى ترجمتُه هنا **يُسقط هذا الاختبار** — وهو ما لم يكن يحدث من قبل.
console.log("\n── تغطيةُ الأنواع الحقيقية ──");
{
  const src = readFileSync(join(import.meta.dirname, "../server/followup/store.ts"), "utf8");
  const emitted = new Set<string>();
  for (const m of src.matchAll(/eventType:\s*(?:[^,\n]*\?\s*)?"([a-z_]+)"(?:\s*:\s*"([a-z_]+)")?/g)) {
    if (m[1]) emitted.add(m[1]);
    if (m[2]) emitted.add(m[2]);
  }
  check("ب. (قُرئت أنواعُ الخادم من مصدره)", emitted.size >= 14, `${emitted.size}`);
  same("٤. **كلُّ نوعٍ يكتبه الخادمُ له عنوانٌ عربي**",
    [...emitted].filter((t) => !FOLLOWUP_EVENT_TITLES[t]).sort(), []);
  //  والنوعان التاريخيّان لا يكتبهما الخادمُ اليوم، وصفوفٌ تحملهما.
  same("٥. **والنوعان التاريخيّان مترجَمان كذلك** — تُقرأ كما كُتبت",
    ["price_change_requested", "purchase_approved"]
      .filter((t) => !FOLLOWUP_EVENT_TITLES[t]), []);
}

// ══ ج. العناوينُ المطلوبة نصّاً ═════════════════════════════════════════
console.log("\n── العناوين ──");
same("٦. فتحُ الملفّ", followupEventTitle("followup_created"),
  "فُتح ملف متابعة ما بعد المعاينة");
same("٧. اختيارُ الخبير", followupEventTitle("expert_selected"), "تم اختيار الخبير");
same("٨. أولُ سعر", followupEventTitle("initial_price_set"), "تم إدخال السعر الأصلي");
same("٩. تعديلُ السعر", followupEventTitle("commercial_price_set"), "تم تعديل السعر");
same("١٠. اعتمادُ الخصم", followupEventTitle("discount_price_applied"), "تم اعتماد الخصم");
same("١١. موافقةُ المريض", followupEventTitle("purchase_interest_signaled"),
  "تم تسجيل موافقة المريض على الشراء");
same("١٢. تأكيدُ الشراء", followupEventTitle("purchase_confirmed"), "تم تأكيد الشراء");
same("١٣. **التحوّل: «تم الشراء — بدأ التصنيع»**",
  followupEventTitle("converted"), "تم الشراء — بدأ التصنيع");
same("١٤. الإغلاق", followupEventTitle("closed_without_purchase"), "أُغلق الملف بدون شراء");
same("١٥. إعادةُ الفتح", followupEventTitle("reopened"), "أُعيد فتح الملف");
same("١٦. التأجيل", followupEventTitle("patient_deferred"), "تم تأجيل القرار للمتابعة");

// ══ د. **التفاصيلُ من الحمولة المخزَّنة** ═══════════════════════════════
console.log("\n── التفاصيل ──");
{
  const v = view({ eventType: "expert_selected", payload: { newExpertUserId: 7 } });
  same("١٧. **الخبيرُ باسمه لا برقمه**", v.facts, ["الخبير: أيوب بغداد"]);
}
{
  const v = view({ eventType: "expert_selected",
    payload: { oldExpertUserId: 9, newExpertUserId: 7 } });
  same("١٨. والتبديلُ يُقرأ من سطرٍ واحد",
    v.facts, ["الخبير: أيوب بغداد", "بدلاً من: سالم البصرة"]);
}
{
  //  **ومَن لا يُعرَف اسمُه يظهر برقمه** — لا يختفي ولا يُخترَع له اسم.
  const v = view({ eventType: "expert_selected", payload: { newExpertUserId: 404 } });
  same("١٩. **وخبيرٌ غادر الفرع يظهر برقمه** — لا يختفي", v.facts, ["الخبير: #404"]);
}
{
  const v = view({ eventType: "initial_price_set", payload: { finalPrice: 500_000 } });
  same("٢٠. **السعرُ بفواصله**", v.facts, ["500,000 د.ع"]);
}
{
  //  **الانتقالُ مفكَّكٌ لا نصّاً** — كي ترسمه الشاشةُ معزولاً عن اتجاهها.
  const v = view({ eventType: "discount_price_applied",
    payload: { previousPrice: 500_000, finalPrice: 400_000 } });
  same("٢١. **الخصمُ انتقالٌ مفكَّك: ٥٠٠,٠٠٠ ⟶ ٤٠٠,٠٠٠**",
    v.transition, { from: 500_000, to: 400_000 });
  check("٢٢. **ولا سهمَ في نصٍّ** — الشاشةُ ترسمه بوحدةٍ معزولة",
    !v.facts.some((f) => /→|←|⟶/.test(f)) && !/→|←|⟶/.test(v.title), JSON.stringify(v));
}
{
  const v = view({ eventType: "discount_price_applied",
    payload: { previousPrice: 500_000, finalPrice: 0 } });
  same("٢٣. **والتبرّعُ يُقال صراحةً** — نهائيُّه صفر",
    [v.transition, v.facts], [{ from: 500_000, to: 0 }, ["خدمة مجانية (تبرّع)"]]);
}
{
  const v = view({ eventType: "commercial_price_set",
    payload: { previousPrice: 1_000_000, finalPrice: 1_250_000 }, reason: null });
  same("٢٤. وتعديلُ السعر انتقالٌ كذلك — والزيادةُ مثل النقص",
    v.transition, { from: 1_000_000, to: 1_250_000 });
}
{
  const v = view({ eventType: "commercial_price_set",
    payload: { previousPrice: 700_000, finalPrice: 700_000, changed: false } });
  same("٢٥. **والتثبيتُ بلا تغيير يُقال ولا يُرسَم سهماً بلا معنى**",
    [v.transition, v.facts], [undefined, ["ثُبِّت السعر: 700,000 د.ع"]]);
}
{
  const v = view({ eventType: "converted", payload: { workOrderId: 215, approvedPrice: 400_000 } });
  same("٢٦. **رقمُ أمر التصنيع في السطر**",
    v.facts, ["أمر التصنيع: #215", "السعر: 400,000 د.ع"]);
}
{
  const v = view({ eventType: "purchase_confirmed",
    payload: { approvedPrice: 400_000, expertUserId: 7 } });
  same("٢٧. وتأكيدُ الشراء بسعره وخبيره",
    v.facts, ["السعر: 400,000 د.ع", "الخبير: أيوب بغداد"]);
}
{
  const v = view({ eventType: "closed_without_purchase", reason: "price", note: "سيستشير عائلته" });
  same("٢٨. **وسببُ الإغلاق بعنوانه العربي**", v.facts, ["السبب: السعر"]);
  check("٢٩. **والملاحظةُ لا تتكرّر هنا** — البطاقةُ تعرضها كاملةً فوق السجلّ",
    !v.facts.includes("سيستشير عائلته"), JSON.stringify(v.facts));
}
{
  const v = view({ eventType: "patient_deferred", reason: "waiting_salary_or_finance",
    payload: { nextFollowUpAt: "2026-09-01T09:00:00Z", noScheduledFollowUp: false } });
  check("٣٠. والتأجيلُ بسببه وموعده",
    v.facts[0] === "السبب: بانتظار الراتب أو التمويل" && v.facts.length === 2,
    JSON.stringify(v.facts));
}
{
  const v = view({ eventType: "patient_deferred", reason: "needs_time",
    payload: { noScheduledFollowUp: true } });
  same("٣١. و«بلا موعد» تُقال صراحةً",
    v.facts, ["السبب: يحتاج وقتاً للتفكير", "بلا موعد متابعة"]);
}
{
  const v = view({ eventType: "reopened", toStatus: "awaiting_patient_decision",
    payload: { previousClosedReason: "price" } });
  same("٣٢. **وإعادةُ الفتح تقول إلى أين عاد الملفّ**",
    v.facts, ["عاد بانتظار قرار المريض", "سبب الإغلاق السابق: السعر"]);
  const w = view({ eventType: "reopened", toStatus: "follow_up", payload: {} });
  same("٣٣. وبموعدٍ إن اختير", w.facts, ["عاد للمتابعة بموعد"]);
}
{
  const v = view({ eventType: "followup_created",
    payload: { approvedPrice: 1_500_000, proposedExpertUserId: 9 } });
  same("٣٤. وفتحُ الملفّ يحمل ما بذره الطبيب",
    v.facts, ["السعر من المعاينة: 1,500,000 د.ع", "الخبير المقترح من الطبيب: سالم البصرة"]);
}
{
  const v = view({ eventType: "contact_recorded", note: "اتصلتُ ولم يردّ" });
  same("٣٥. **والملاحظةُ المكتوبة بيد الموظّف تظهر**", v.facts, ["اتصلتُ ولم يردّ"]);
}

// ══ هـ. **الأحداثُ القديمة بلا حمولة تبقى مقروءة** ══════════════════════
//  صفوفٌ كُتبت قبل أن تُضاف الحمولة. لا يجوز أن تُسقط الشاشةَ ولا أن
//  تُخترَع لها تفاصيل.
console.log("\n── الأحداث القديمة ──");
for (const [label, e] of [
  ["بلا حمولة إطلاقاً", { eventType: "initial_price_set" }],
  ["حمولةٌ فارغة", { eventType: "converted", payload: {} }],
  ["حمولةٌ `null`", { eventType: "expert_selected", payload: null }],
  ["حمولةٌ ليست كائناً", { eventType: "commercial_price_set", payload: "junk" }],
  ["حقولٌ `null` داخلها", { eventType: "converted", payload: { workOrderId: null } }],
  ["حقولٌ نصّية", { eventType: "initial_price_set", payload: { finalPrice: "abc" } }],
] as Array<[string, any]>) {
  const v = view(e);
  check(`٣٦. **${label}: عنوانٌ عربيّ بلا تفاصيل مخترَعة**`,
    v.title.length > 0 && !LATIN.test(v.title) && v.facts.length === 0
      && v.transition === undefined,
    JSON.stringify(v));
}
same("٣٧. **وحدثٌ فارغٌ تماماً لا يُسقط شيئاً**",
  [followupEventView(null).title, followupEventView(undefined).facts],
  [UNKNOWN_EVENT_TITLE, []]);

// ══ و. **نصُّ حالة الشراء** ═════════════════════════════════════════════
console.log("\n── حالة الشراء ──");
same("٣٨. **قبل الإتمام**",
  PURCHASE_STATE_TEXT[purchasePresentation({ status: "awaiting_patient_decision" })],
  "المريض وافق على الشراء — بانتظار إتمام إجراءات البيع");
same("٣٩. **وخصمٌ سابقٌ لم يُكمَل** (تصحيحٌ تشغيليّ ٢٠٢٦-٠٨-٢٨ — لا «اعتماد»)",
  PURCHASE_STATE_TEXT[purchasePresentation({
    status: "awaiting_patient_decision", hasPendingDiscount: true })],
  "المريض وافق على الشراء — خصمٌ سابقٌ بانتظار الإكمال");
same("٤٠. **وبعد التحويل: «تم الشراء — بدأ التصنيع»**",
  PURCHASE_STATE_TEXT[purchasePresentation({ status: "converted" })],
  "تم الشراء — بدأ التصنيع");
//  **والتحوّلُ يسبق كلَّ شيء** — ولو بقيت رايةُ خصمٍ معلَّقةً في الذاكرة.
same("٤١. **والتحوّلُ يسبق الخصمَ المعلَّق**",
  purchasePresentation({ status: "converted", hasPendingDiscount: true }), "converted");
//  **ووجودُ أمر التصنيع واقعةٌ لا تحتمل الشكّ** — ولو تأخّرت الحالة.
same("٤٢. **وأمرُ تصنيعٍ موجودٌ يعني «تمّ» ولو لم تُحدَّث الحالة**",
  purchasePresentation({ status: "awaiting_patient_decision", convertedWorkOrderId: 215 }),
  "converted");
//  ══ **ولا يُقال «ينتظر إتمام البيع» بعد التحويل أبداً** ══
const FORBIDDEN_AFTER = "ينتظر إتمام البيع";
{
  const afterConversion = [
    { status: "converted" },
    { status: "converted", hasPendingDiscount: true },
    { status: "awaiting_patient_decision", convertedWorkOrderId: 1 },
    { status: "follow_up", convertedWorkOrderId: 99, hasPendingDiscount: true },
  ];
  same("٤٣. **ولا حالةَ محوَّلة تقول «ينتظر إتمام البيع»**",
    afterConversion.filter((f) =>
      PURCHASE_STATE_TEXT[purchasePresentation(f)].includes(FORBIDDEN_AFTER)), []);
  //  والعبارةُ الملغاة لم تبقَ في أيّ نصٍّ من نصوص الحالة الثلاثة.
  same("٤٤. **ولا في أيٍّ من النصوص الثلاثة إطلاقاً**",
    Object.entries(PURCHASE_STATE_TEXT)
      .filter(([, v]) => v.includes(FORBIDDEN_AFTER)).map(([k]) => k), []);
}

// ══ ز. **والبطاقةُ تستعمل هذه القاعدة فعلاً** ═══════════════════════════
console.log("\n── عقد البطاقة ──");
{
  const cardSrc = readFileSync(
    join(import.meta.dirname, "../client/src/components/PostExamDecisionCard.tsx"), "utf8");
  check("٤٥. **البطاقةُ تستورد الترجمة ولا تكرّرها**",
    cardSrc.includes("followupEventView") && cardSrc.includes("@shared/followup_events"));
  check("٤٦. **ولم تبقَ خريطةٌ ثانية في الشاشة**",
    !cardSrc.includes("EVENT_LABELS"),
    (cardSrc.match(/.*EVENT_LABELS.*/g) ?? []).join("\n"));
  //  **وهذا هو السطرُ الذي كان يسرّب الرمز**: `?? e.eventType`.
  check("٤٧. **ولا سقوطَ إلى اسم الحدث الخام** — `?? e.eventType` زالت",
    !/\?\?\s*e\.eventType/.test(cardSrc),
    (cardSrc.match(/.*e\.eventType.*/g) ?? []).join("\n"));
  check("٤٨. **والاسمُ المعروض «سجلّ الإجراءات»**",
    cardSrc.includes("سجلّ الإجراءات") && !cardSrc.includes("سجلّ المتابعة ("),
    (cardSrc.match(/.*سجلّ المتابعة.*/g) ?? []).join("\n"));
  //  **ويومٌ وساعة لا التاريخُ وحده**: إجراءاتُ الملفّ الواحد تقع في دقائق،
  //  فتاريخٌ بلا ساعةٍ يجعل أربعةَ أسطرٍ متتاليةٍ تبدو لحظةً واحدة.
  check("٤٩. **وسطرُ الوقت يحمل الساعة لا اليوم وحده**",
    /fmtDateTime\(e\.createdAt\)/.test(cardSrc),
    (cardSrc.match(/.*e\.createdAt.*/g) ?? []).join("\n"));
  check("٥٠. **والانتقالُ يُرسَم بالوحدة المعزولة داخل السجلّ**",
    /v\.transition\s*&&[\s\S]{0,220}<PriceTransition/.test(cardSrc));
  //  والفاعلُ يُسمّى في كلّ سطر.
  check("٥١. **وفاعلُ كلّ إجراءٍ باسمه**", cardSrc.includes("بواسطة: "));
}

// ══ ح. **إلغاءُ المعاينة يُقال بالعربية — لا بالعبارة العامّة** ══════════
//  ══ العطبُ الذي يغلقه ═════════════════════════════════════════════════
//  الخادمُ يكتب حدثاً نوعُه `closed_exam_cancelled` وسببُه `exam_cancelled`.
//  ولم تكن الخريطةُ تعرفه، فيقرأ الموظّفُ «إجراء مسجَّل على الملف» — عبارةٌ
//  صحيحةٌ ولا تقول شيئاً. **والسببُ الذي كتبه مَن ألغى** هو الخبرُ كلُّه.
console.log("\n── إلغاء المعاينة ──");
{
  //  **يُقرأ ما يكتبه الخادمُ من مصدره لا من قائمةٍ منسوخة**: تغييرُ الرمز
  //  هناك بلا ترجمةٍ هنا يُسقط هذا الاختبار.
  const cancelSrc = readFileSync(
    join(import.meta.dirname, "../server/medical/cancel_exam.ts"), "utf8");
  const at = cancelSrc.indexOf("INSERT INTO post_exam_followup_events");
  const written = at < 0 ? [] :
    [...cancelSrc.slice(at, at + 900).matchAll(/\$\{"([a-z_]+)"\}/g)].map((m) => m[1]);
  check("ح. **الخادمُ يكتب `closed_exam_cancelled` فعلاً** (قُرئ من مصدره)",
    written.includes("closed_exam_cancelled"), written.join(", ") || "(لم يُقرأ)");
  //  والسببُ المخزَّن مفتاحٌ داخليّ — نثبته هنا كي يبقى الاختبارُ التالي
  //  يحرس ما يقع فعلاً لا ما نتخيّله.
  check("٥٢. والسببُ المخزَّن `exam_cancelled` (مفتاحٌ داخليّ لا يُعرَض)",
    written.includes("exam_cancelled"), written.join(", "));

  same("٥٣. **عنوانٌ عربيٌّ صريح لا العبارةُ العامّة**",
    followupEventTitle("closed_exam_cancelled"), "أُغلقت المتابعة بسبب إلغاء المعاينة");
  check("٥٤. وليس هو نصَّ المجهول",
    followupEventTitle("closed_exam_cancelled") !== UNKNOWN_EVENT_TITLE);

  //  الصفُّ كما يكتبه الخادمُ حرفياً — نوعٌ وسببٌ وملاحظةٌ وحمولة.
  const REASON = "كُتبت للمريض الخطأ";
  const row = {
    eventType: "closed_exam_cancelled",
    fromStatus: "awaiting_patient_decision",
    toStatus: "closed_exam_cancelled",
    reason: "exam_cancelled",
    note: `أُغلقت بسبب إلغاء المعاينة — ${REASON}`,
    payload: { examId: 41 },
  };
  const v = view(row);
  same("٥٥. **وسببُ الإلغاء يظهر معنوناً** — لا يضيع ولا يتكرّر معه العنوان",
    v.facts, [`سبب الإلغاء: ${REASON}`]);
  check("٥٦. **ولا مفتاحَ داخليٌّ في المخرَج** — لا نوعٌ ولا سبب",
    !LATIN.test(v.title) && !v.facts.some((f) => LATIN.test(f))
      && !v.title.includes("closed_exam_cancelled") && !v.title.includes("exam_cancelled"),
    JSON.stringify(v));
  check("٥٧. ولا انتقالَ سعرٍ مخترَعاً على حدثٍ لا مالَ فيه", v.transition === undefined);

  //  **وملاحظةٌ بصيغةٍ أخرى تُعرَض كاملةً لا تُبتَر** — صفٌّ قديم، أو
  //  صياغةٌ تغيّرت في الخادم: القصُّ الأعمى كان سيمحو نصفَ سببٍ حقيقيّ.
  same("٥٨. وملاحظةٌ بلا الصدر المعروف تُعرَض كما هي",
    view({ ...row, note: "أُلغيت لأن الاختصاص خطأ" }).facts,
    ["سبب الإلغاء: أُلغيت لأن الاختصاص خطأ"]);
  //  وصفٌّ بلا ملاحظةٍ يبقى مقروءاً بعنوانه وحده — بلا سطرٍ فارغ.
  same("٥٩. **وبلا ملاحظةٍ يبقى العنوانُ وحدَه مقروءاً**",
    view({ eventType: "closed_exam_cancelled", reason: "exam_cancelled", note: null }).facts, []);
  same("٦٠. وكذلك ملاحظةٌ هي الصدرُ وحدَه بلا سبب",
    view({ ...row, note: "أُغلقت بسبب إلغاء المعاينة" }).facts, []);

  //  **والحالةُ الطرفيّةُ الثالثة لها تسميةٌ عربية في الشارة أيضاً** —
  //  الشاشتان تقرآن `FOLLOWUP_STATUS_LABELS`، فرمزٌ بلا تسميةٍ يظهر خاماً.
  check("٦١. **وللحالة تسميةٌ عربية في الشارة**",
    Boolean(FOLLOWUP_STATUS_LABELS.closed_exam_cancelled)
      && !LATIN.test(FOLLOWUP_STATUS_LABELS.closed_exam_cancelled),
    FOLLOWUP_STATUS_LABELS.closed_exam_cancelled);
  //  وللونٍ يقرؤه الطابورُ بالنظرة — في بطاقة المريض، حيث لا تزال هذه
  //  الحالةُ تُعرَض ضمن جدول ألوانٍ كامل لكلّ الحالات.
  {
    const f = "../client/src/components/PostExamDecisionCard.tsx";
    const src = readFileSync(join(import.meta.dirname, f), "utf8");
    check(`٦٣. ولها لونٌ في ${f.split("/").pop()}`,
      /closed_exam_cancelled:\s*"bg-/.test(src));
  }
  //  ══ **المرحلة الخامسة** — `PostExamFollowups.tsx` لم يعد يعرض جدولَ
  //  ألوانٍ لكلّ حالة إطلاقاً (صار طابورَ تبويبين لا شاشةَ آلة حالات)، وهذه
  //  الحالةُ تحديداً **لا تصل هذا الطابور أبداً** — واقعةٌ تاريخية/إدارية لا
  //  قرارَ شراء (`shared/decision_queue.ts: RESOLVED_STATUSES`). فسؤالُ
  //  «أَلها لونٌ هناك؟» صار سؤالاً خاطئاً؛ الفحصُ الصحيح أنها غائبةٌ كليةً.
  {
    const f = "../client/src/pages/PostExamFollowups.tsx";
    const src = readFileSync(join(import.meta.dirname, f), "utf8");
    check("٦٢. **وطابورُ «بانتظار الحسم» لا يذكر هذه الحالة إطلاقاً**"
      + " — مُستبعَدةٌ من مصدرها في الخادم لا مموَّهةٌ بلونٍ في الشاشة",
      !src.includes("closed_exam_cancelled"));
  }
}

console.log(`\n${failures === 0 ? "✅ كل الحالات نجحت" : `❌ ${failures} حالة فاشلة`}\n`);
process.exit(failures === 0 ? 0 : 1);
