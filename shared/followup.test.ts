// صلاحياتُ المتابعة وأزرارُها — منطقٌ خالص، بلا قاعدةٍ ولا شبكة.
// `npm run test:followup-rules`.
//
// ══ لماذا هنا ═══════════════════════════════════════════════════════════
// الخادم والواجهة يقرآن **هذا الملفّ نفسه**. فلو كُتبت قاعدةُ «مَن يعتمد»
// مرّتين لانحرفت مرّة: تُخفي الواجهةُ زرّاً يقبله الخادم، أو تعرض زرّاً
// يردّه فيضغطه الموظّف عشر مرّات ويظنّ النظام معطّلاً.
//
// والاختبار الحيّ على النقاط (`test:followup`) يحرس الخادم. وهذا يحرس أن
// **القاعدة نفسها** صحيحة قبل أن يستعملها أيٌّ منهما.

import { readFileSync } from "fs";
import { join } from "path";
import {
  allowedActions, canApprove, canApproveDiscount, canConfirmPurchase, canRecordFollowup,
  canSelectExpert, canViewFollowup, computeDiscount, isSelfDecision,
  DISCOUNT_MODES, DISCOUNT_MODE_LABELS, DISCOUNT_REASONS, DISCOUNT_REASON_LABELS,
  isDiscountMode, isDiscountReason,
  isFollowupReason, isTerminal,
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUSES, FOLLOWUP_STATUS_LABELS,
} from "./followup";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const recv = { role: "reception", isAdmin: false, permissions: { canAddPatients: true } };
const mgr = { role: "branch_manager", isAdmin: false, permissions: {} };
const doc = { role: "doctor", isAdmin: false, permissions: { canWriteMedicalExam: true } };
const docCap = { role: "reception", isAdmin: false, permissions: { canWriteMedicalExam: true } };
const admin = { role: "admin", isAdmin: true, permissions: {} };
const expert = { role: "prosthetics_expert", isAdmin: false, permissions: {} };
//  **يحملان `canAddPatients`/`canEditPatients`** عمداً: البوّابة بالدور لا
//  بالقدرة، وهذان هما مَن كانت القدرةُ وحدها تفتح لهما ملفّ المتابعة.
const accountant2 = { role: "accountant", isAdmin: false,
  permissions: { canAddPatients: true, canManageAccounting: true } };
const physioStaff = { role: "therapist", isAdmin: false,
  permissions: { canEditPatients: true, canEnterSessions: true } };
const expertWithAdd = { role: "prosthetics_expert", isAdmin: false,
  permissions: { canAddPatients: true } };

// ══ أ. مَن يتابع ═══════════════════════════════════════════════════════
console.log("\n── مَن يسجّل المتابعة ──");
same("أ. الاستقبال يتابع", canRecordFollowup(recv), true);
same("   ومديرُ الفرع", canRecordFollowup(mgr), true);
same("   والطبيب", canRecordFollowup(doc), true);
same("   والمسؤول", canRecordFollowup(admin), true);
same("   **والخبير الصِرف لا** — منفّذٌ لا متابِع", canRecordFollowup(expert), false);
same("   وبلا جلسة ⟶ لا", canRecordFollowup(null), false);

// ══ أ٢. القراءة بالدور لا بالقدرة ═════════════════════════════════════
//  ملفُّ المتابعة يحمل السعر المعتمد وهاتفَ المريض وسببَ تردّده. وكانت
//  `canAddPatients` وحدها تفتحه — وهي تُمنح لحساباتٍ لا شأن لها بالمتابعة.
console.log("\n── مَن يقرأ ──");
same("أ٢. الأربعة يقرأون",
  [recv, mgr, doc, admin].map(canViewFollowup), [true, true, true, true]);
same("   **والمحاسبُ لا يقرأ ولو حمل `canAddPatients`**",
  canViewFollowup(accountant2), false);
same("   **ولا مُدخِلُ الجلسات ولو حمل `canEditPatients`**",
  canViewFollowup(physioStaff), false);
same("   **ولا خبيرُ الأطراف ولو حملها**", canViewFollowup(expertWithAdd), false);
same("   وبلا جلسة ⟶ لا", canViewFollowup(null), false);
same("   **والقراءة والكتابة بوّابةٌ واحدة**",
  [accountant2, physioStaff, expertWithAdd, recv, mgr, doc, admin]
    .filter((w) => canViewFollowup(w) !== canRecordFollowup(w)), []);

// ══ ب. مَن يعتمد الخصم — القاعدة الحاسمة ═══════════════════════════════
//  **الخصمُ قرارٌ تجاري لا سريري**: الطبيبُ حدّد الجهازَ وسعرَه في سجلٍّ
//  مختوم، و«نبيعه بأقلّ» مسؤوليةُ مَن يدير الفرعَ ويحاسَب على إيراده.
//  فدخل مديرُ الفرع، وبقي الطبيبُ لأن كثيراً من الخصومات يقترحها هو.
console.log("\n── مَن يعتمد الخصم ──");
same("ب. **الطبيب يعتمد الخصم**", canApproveDiscount(doc), true);
same("   ومَن يحمل `canWriteMedicalExam` وإن كان دورُه غيرَ الطبّ",
  canApproveDiscount(docCap), true);
same("   والمسؤول العام", canApproveDiscount(admin), true);
same("   **ومديرُ الفرع** — وهذا ما تغيّر", canApproveDiscount(mgr), true);
same("ج. **والاستقبال لا يعتمد** — يطلب ولا يقرّر", canApproveDiscount(recv), false);
same("   **ولا المحاسب**", canApproveDiscount(accountant2), false);
same("   **ولا المعالج/مُدخِل الجلسات**", canApproveDiscount(physioStaff), false);
same("   **ولا خبيرُ الأطراف** — محجوبٌ مالياً في كل النظام",
  canApproveDiscount(expert), false);
same("   وبلا جلسة ⟶ لا", canApproveDiscount(null), false);
same("   والغموض يُقرأ «لا»",
  canApproveDiscount({ permissions: { canWriteMedicalExam: 1 } } as any), false);
//  والاستقبالُ يطلب — فالطلبُ والاعتمادُ بوّابتان لا واحدة.
same("ج٢. **والاستقبال يطلب الخصم** — الطلبُ لا يحتاج سلطةَ الاعتماد",
  [canRecordFollowup(recv), canApproveDiscount(recv)], [true, false]);

// ══ ب٠. لا يعتمد أحدٌ طلبَ نفسه ════════════════════════════════════════
console.log("\n── منعُ اعتماد النفس ──");
same("ب٠. **صاحبُ الطلب هو المعتمِد ⟶ ممنوع**", isSelfDecision(7, 7), true);
same("   ومخوَّلٌ آخر ⟶ مسموح", isSelfDecision(7, 9), false);
same("   وطلبٌ قديمٌ بلا صاحب ⟶ لا مانع", isSelfDecision(null, 9), false);
same("   وفاعلٌ بلا معرّف ⟶ لا مانع", isSelfDecision(7, null), false);
same("   ولا يُخلَط الصفرُ بالفراغ", isSelfDecision(0, 0), true);
//  **والمنعُ يشمل الرفضَ كالاعتماد**: المطلوب رأيٌ ثانٍ لا نتيجةٌ بعينها.
same("ب٠ب. **ومَن طلب لا يرى زرَّ اعتمادٍ ولا زرَّ رفض**",
  allowedActions({ ...mgr, userId: 7 } as any, "price_approval_pending", 7), []);
same("   ومخوَّلٌ آخر يراهما",
  allowedActions({ ...mgr, userId: 9 } as any, "price_approval_pending", 7).sort(),
  ["approve_discount", "reject_discount"]);

// ══ ب٠ج. الاسمُ القديم باقٍ ولا يُنادى ═════════════════════════════════
//  `canApprove` تبقى للتوافق ولا تُستعمل في مسارٍ حيّ. والفرقُ بينها وبين
//  الجديدة مُثبَتٌ لا موصوف: مديرُ الفرع.
same("ب٠ج. **والاسمُ القديم لم يتغيّر سلوكُه** — لا يُصلَح ولا يُنادى",
  [canApprove(mgr), canApproveDiscount(mgr)], [false, true]);

// ══ ب٢. مَن يؤكّد الشراء — بوّابةٌ مستقلّةٌ أوسع ═══════════════════════
//  «اشترى» تسجيلُ واقعةٍ لا اعتماد، فبوّابتُها الفرعُ لا الطبيب. وفصلُها
//  عن `canApprove` مقصود: تعديلُ السعر يبقى للطبيب والمسؤول وحدهما.
console.log("\n── مَن يؤكّد الشراء ──");
same("ب٢. **الاستقبال يؤكّد الشراء**", canConfirmPurchase(recv), true);
same("   ومديرُ الفرع", canConfirmPurchase(mgr), true);
same("   والطبيب", canConfirmPurchase(doc), true);
same("   ومَن يحمل `canWriteMedicalExam`", canConfirmPurchase(docCap), true);
same("   والمسؤول العام", canConfirmPurchase(admin), true);
same("ب٣. **والخبيرُ لا** — محجوبٌ مالياً في كل النظام", canConfirmPurchase(expert), false);
same("   وبلا جلسة ⟶ لا", canConfirmPurchase(null), false);
//  والفرقُ بين البوّابتين مُثبَتٌ لا موصوف: مديرُ الفرع يبيع ولا يعتمد سعراً.
same("ب٤. **مديرُ الفرع: يبيع ويعتمد الخصم في فرعه**",
  [canConfirmPurchase(mgr), canApproveDiscount(mgr)], [true, true]);
//  والخبيرُ خارج الاثنتين معاً.
same("ب٥. **والخبير: لا يبيع ولا يعتمد**",
  [canConfirmPurchase(expert), canApproveDiscount(expert)], [false, false]);

// ══ ج. الأزرار بحسب الحالة ═════════════════════════════════════════════
console.log("\n── الأزرار ──");
same("د. بانتظار قرار المريض: الاستقبال يرى الأربعة",
  allowedActions(recv, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "request_discount"]);
same("   **ومديرُ الفرع يرى الأربعة نفسها** — يبيع في فرعه",
  allowedActions(mgr, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "request_discount"]);
same("هـ. **بانتظار اعتماد الخصم: الاستقبال بلا زرّ**",
  allowedActions(recv, "price_approval_pending"), []);
same("   **ومديرُ الفرع يرى الاعتماد والرفض** — وهذا ما تغيّر",
  allowedActions(mgr, "price_approval_pending").sort(),
  ["approve_discount", "reject_discount"]);
same("   والطبيب كذلك",
  allowedActions(doc, "price_approval_pending").sort(),
  ["approve_discount", "reject_discount"]);
same("   **ولا الخبير**", allowedActions(expert, "price_approval_pending"), []);
same("و. بعد اعتماد الخصم: الاستعلامات يشتري مباشرةً",
  allowedActions(recv, "price_approved_waiting_patient").includes("confirm_purchase"), true);
same("   **ولا زرَّ اعتمادٍ لأحدٍ هنا** — الدور دورُ المتابِع",
  allowedActions(doc, "price_approved_waiting_patient").includes("approve_purchase"), false);

// ══ ز. الحالةُ الملغاة — توافقٌ رجعي لا مسارٌ حيّ ══════════════════════
//  كانت «بانتظار اعتماد الشراء» تُفرِغ يدَ الاستقبال تماماً: قائمةٌ خالية،
//  والملفُّ واقفٌ حتى يفرغ طبيبٌ لضغطةٍ لا قرارَ سريرياً فيها. والصفوف
//  المحتجزة فيها من قبلُ صارت **قابلةً للعمل فوراً**.
same("ز. **الصفُّ المحتجز: الاستقبال يؤكّده ويغلقه**",
  allowedActions(recv, "purchase_approval_pending").sort(), ["close", "confirm_purchase"]);
same("   ومديرُ الفرع كذلك",
  allowedActions(mgr, "purchase_approval_pending").sort(), ["close", "confirm_purchase"]);
same("   **ولا زرَّ «اعتماد شراء» لأحد — لا طبيبٍ ولا مسؤول**",
  [allowedActions(doc, "purchase_approval_pending").includes("approve_purchase"),
    allowedActions(admin, "purchase_approval_pending").includes("approve_purchase")],
  [false, false]);
same("ح. المغلق يُعاد فتحه",
  allowedActions(recv, "closed_without_purchase"), ["reopen"]);
same("   **والمُحوَّل لا زرَّ له إطلاقاً** — انتهى إلى التصنيع",
  allowedActions(admin, "converted"), []);

//  ولا زرَّ اعتمادٍ يظهر لغير المعتمِدين في أي حالةٍ كانت — مسحٌ شامل.
const approvalButtons = ["approve_price", "reject_price", "approve_purchase"];
same("ط. **مسحُ الحالات كلّها: لا زرَّ اعتمادٍ لمديرِ فرعٍ أو استقبالٍ أبداً**",
  FOLLOWUP_STATUSES.flatMap((st) =>
    [recv, mgr, expert].flatMap((who) =>
      allowedActions(who, st).filter((a) => approvalButtons.includes(a)))),
  []);
//  و`approve_purchase` **لم يبقَ في المفردات إطلاقاً** — لا لطبيبٍ ولا
//  لمسؤول. فالمسحُ أعلاه يحرس مَن لا يعتمد، وهذا يحرس أن الفعل نفسه زال.
same("ط٠. **ولا وجودَ لـ`approve_purchase` في أي حالةٍ لأي أحد**",
  FOLLOWUP_STATUSES.flatMap((st) =>
    [recv, mgr, expert, doc, docCap, admin].flatMap((who) =>
      allowedActions(who, st).filter((a) => a === "approve_purchase"))),
  []);
//  وخبيرُ الأطراف لا يبيع: محجوبٌ مالياً في كل النظام.
same("ط١. **والخبيرُ لا يؤكّد شراءً في أي حالة**",
  FOLLOWUP_STATUSES.flatMap((st) =>
    allowedActions(expert, st).filter((a) => a === "confirm_purchase")),
  []);

// ══ ط٢. زرُّ الخبير لا يتبع طولَ قائمة الأزرار ═════════════════════════
//  كان مربوطاً بـ`actions.length > 0`، فاختفى عن الاستعلامات في حالتَي
//  الاعتماد لأن قائمتَهما فارغة هناك — وهما الحالتان اللتان يلزم فيهما
//  اختيارُ الخبير أكثر ما يلزم: البيع على وشك أن يُعتمد.
console.log("\n── زرّ الخبير ──");
const LIVE = ["awaiting_patient_decision", "follow_up", "price_approval_pending",
  "price_approved_waiting_patient", "purchase_approval_pending"] as const;

same("ط٢. **الاستقبال يختار الخبير في الحالات الحيّة الخمس**",
  LIVE.filter((st) => !canSelectExpert(recv, st)), []);
same("   **وفي `price_approval_pending` تحديداً — وقائمةُ أزراره فارغة**",
  [canSelectExpert(recv, "price_approval_pending"),
    allowedActions(recv, "price_approval_pending").length], [true, 0]);
//  و`purchase_approval_pending` لم تبقَ خاليةَ الأزرار بعد التبسيط، فمثالُ
//  «قائمةٌ فارغة وزرُّ خبيرٍ حاضر» صار `price_approval_pending` وحدها. لكنّ
//  اختيارَ الخبير يبقى متاحاً فيها **وهو ألزمُ ما يكون**: البيع على وشك أن
//  يُؤكَّد، والخبيرُ شرطُه.
same("   **وفي `purchase_approval_pending` الخبيرُ متاحٌ وشرطٌ للتأكيد**",
  [canSelectExpert(recv, "purchase_approval_pending"),
    allowedActions(recv, "purchase_approval_pending").includes("confirm_purchase")],
  [true, true]);
same("   ومديرُ الفرع والطبيبُ والمسؤول كذلك",
  [mgr, doc, admin].flatMap((w) => LIVE.filter((st) => !canSelectExpert(w, st))), []);
same("   **ولا يظهر في النهائيّتين**",
  [recv, mgr, doc, admin].flatMap((w) =>
    ["closed_without_purchase", "converted"].filter((st) => canSelectExpert(w, st))), []);
same("   **ولا لخبير الأطراف ولا للمحاسب** — ليسا من مسؤولي المتابعة",
  [expert, accountant2, physioStaff].flatMap((w) =>
    LIVE.filter((st) => canSelectExpert(w, st))), []);
same("   وبلا جلسة ⟶ لا",
  LIVE.filter((st) => canSelectExpert(null, st)), []);

// ══ ي. الأسباب ═════════════════════════════════════════════════════════
console.log("\n── الأسباب ──");
same("ي. الأسباب الإحدى عشر المطلوبة موجودة", FOLLOWUP_REASONS.length, 11);
same("   وكلٌّ منها بعنوانٍ عربي",
  FOLLOWUP_REASONS.filter((r) => !FOLLOWUP_REASON_LABELS[r]), []);
same("   وكلُّ حالةٍ بعنوانٍ عربي",
  FOLLOWUP_STATUSES.filter((s) => !FOLLOWUP_STATUS_LABELS[s]), []);
same("   وسببٌ مخترَع يُردّ", isFollowupReason("whatever"), false);
same("   والسببُ المعروف يُقبل", isFollowupReason("waiting_salary_or_finance"), true);
same("ك. النهائيّتان اثنتان لا غير",
  FOLLOWUP_STATUSES.filter(isTerminal), ["closed_without_purchase", "converted"]);

// ══ ل. حسابُ الخصم وحدودُه — **قاعدةٌ واحدة للشاشة وللخادم** ═══════════
console.log("\n── حساب الخصم ──");
const D = (currentPrice: number, mode: string, value: number) =>
  computeDiscount({ currentPrice, mode, value });

same("ل. مبلغٌ صحيح: مليونٌ ناقص ٢٠٠ ألف",
  (({ ok, discountAmount, finalPrice, percentage }) =>
    ({ ok, discountAmount, finalPrice, percentage }))(D(1_000_000, "amount", 200_000)),
  { ok: true, discountAmount: 200_000, finalPrice: 800_000, percentage: 20 });
same("   ونسبةٌ صحيحة: ٢٠٪ من مليون",
  (({ ok, discountAmount, finalPrice }) => ({ ok, discountAmount, finalPrice }))(
    D(1_000_000, "percentage", 20)),
  { ok: true, discountAmount: 200_000, finalPrice: 800_000 });
same("   **والنهائيُّ = الأصلي − الخصم بالضبط** ولو كسَرت النسبةُ الدينار",
  (() => { const r = D(999_999, "percentage", 33.33);
    return r.ok && r.finalPrice === 999_999 - r.discountAmount; })(), true);

//  ══ الحدود — كلُّها تُردّ ══
same("م. **رفعُ السعر ليس خصماً**", D(1_000_000, "amount", -50_000).ok, false);
same("   والصفرُ يُردّ", D(1_000_000, "amount", 0).ok, false);
same("   والسالبُ يُردّ", D(1_000_000, "percentage", -5).ok, false);
same("   ومبلغٌ يساوي السعر يُردّ", D(1_000_000, "amount", 1_000_000).ok, false);
same("   ومبلغٌ يفوق السعر يُردّ", D(1_000_000, "amount", 1_200_000).ok, false);
same("   **ونسبةُ ١٠٠٪ تُردّ** — جهازٌ مجّاني قرارٌ آخر",
  D(1_000_000, "percentage", 100).ok, false);
same("   ونسبةٌ فوق المئة تُردّ", D(1_000_000, "percentage", 150).ok, false);
same("   و٩٩٫٩٩٪ تُقبل — الحدُّ عند المئة لا قبلها", D(1_000_000, "percentage", 99.99).ok, true);
same("   و`NaN` يُردّ", D(1_000_000, "amount", Number.NaN).ok, false);
same("   و`Infinity` يُردّ", D(1_000_000, "amount", Number.POSITIVE_INFINITY).ok, false);
same("   ومبلغٌ كسريٌّ يُردّ — الدينارُ صحيح", D(1_000_000, "amount", 1500.5).ok, false);
same("   ونوعٌ مخترَع يُردّ", D(1_000_000, "flat", 100).ok, false);
same("ن. **وسعرٌ معتمدٌ صفرٌ لا يُخصَم منه**", D(0, "amount", 100).ok, false);
same("   ولا سعرٌ سالب", D(-5, "amount", 1).ok, false);
//  نسبةٌ تُقرَّب إلى صفرٍ تُردّ صراحةً ولا تمرّ خصماً بلا أثر.
same("س. **ونسبةٌ تتلاشى بالتقريب تُردّ**", D(10, "percentage", 0.001).ok, false);
//  وكلُّ ردٍّ يحمل رسالةً عربية — الشاشةُ تعرضها والخادمُ يُرجعها.
same("ع. وكلُّ رفضٍ برسالةٍ عربية",
  [D(1_000_000, "amount", 0), D(1_000_000, "percentage", 100), D(0, "amount", 1)]
    .filter((r) => !r.error), []);

// ══ ف. أسبابُ الخصم وأنواعُه ═══════════════════════════════════════════
console.log("\n── أسباب الخصم ──");
same("ف. الأسبابُ السبعة المطلوبة", DISCOUNT_REASONS.length, 7);
same("   وكلٌّ منها بعنوانٍ عربي",
  DISCOUNT_REASONS.filter((r) => !DISCOUNT_REASON_LABELS[r]), []);
same("   والسبعةُ هي المطلوبة بأسمائها", [...DISCOUNT_REASONS],
  ["doctor_instruction", "patient_negotiation", "financial_hardship",
    "competitor_price", "management_exception", "campaign_or_offer", "other"]);
same("   وسببٌ مخترَع يُردّ", isDiscountReason("because"), false);
same("   **وسببُ التأجيل ليس سببَ خصم**" , isDiscountReason("needs_time"), false);
same("ص. والنوعان اثنان لا غير", [...DISCOUNT_MODES], ["amount", "percentage"]);
same("   وكلٌّ بعنوانٍ عربي",
  DISCOUNT_MODES.filter((m) => !DISCOUNT_MODE_LABELS[m]), []);
same("   ونوعٌ مخترَع يُردّ", isDiscountMode("free"), false);

// ══ ط٣. والبطاقةُ تستعمل البوّابة فعلاً ═══════════════════════════════
//  القاعدة الصحيحة لا تنفع إن بقيت الواجهة على الشرط القديم. والعقد على
//  المصدر لا على الرسم — لا مشغّل DOM هنا.
console.log("\n── عقد البطاقة ──");
const cardSrc = readFileSync(
  join(import.meta.dirname, "../client/src/components/PostExamDecisionCard.tsx"), "utf8");
check(cardSrc.includes("canSelectExpert(session as any, active.status)"),
  "ط٣. **زرُّ الخبير مربوطٌ بـ`canSelectExpert`**");
check(!/actions\.length > 0[\s\S]{0,600}button-select-expert/.test(cardSrc),
  "   **ولم يبقَ شرطُ `actions.length` عليه**");
check(cardSrc.includes("button-select-expert"), "   والزرّ موجود");

//  ══ والبطاقةُ صارت بطاقةَ خصم ══
check(cardSrc.includes("طلب خصم") && !cardSrc.includes("طلب تعديل السعر</"),
  "ط٤. **العنوانُ صار «طلب خصم»**");
check(cardSrc.includes("button-request-discount"), "   وزرُّ الطلب باسمه");
check(cardSrc.includes("button-approve-discount") && cardSrc.includes("button-reject-discount"),
  "   وزرّا «اعتماد الخصم» و«رفض الخصم»");
//  **المعاينةُ الحيّة من دالّة الخادم نفسِها** — لا حسابَ ثانٍ في الشاشة.
check(cardSrc.includes("computeDiscount({"),
  "ط٥. **والمعاينةُ تنادي `computeDiscount` المشتركة**");
check(!/finalPrice\s*=\s*[^;]*-\s*discount/i.test(cardSrc.replace(/computeDiscount[\s\S]{0,200}/g, "")),
  "   ولا تحسب الشاشةُ السعرَ النهائي بنفسها");
//  وأزرارُ القرار تُخفى عن صاحب الطلب — والخادمُ يمنعه على كلّ حال.
check(cardSrc.includes("pendingRequest?.requestedBy"),
  "ط٦. **وأزرارُ القرار تُخفى عن صاحب الطلب**");
check(cardSrc.includes("text-self-decision-blocked"),
  "   ويُقال له لماذا صراحةً");
//  والصفُّ القديم يُسمّى باسمه ولا يُخفى.
check(cardSrc.includes("isLegacyPriceChange"),
  "ط٧. **والسجلُّ القديم يُعرَض ويُسمّى «تعديل سعر»**");

console.log(`\n${failures === 0 ? "✅ all followup-rule cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
