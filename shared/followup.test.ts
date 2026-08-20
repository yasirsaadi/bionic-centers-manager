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
  allowedActions, canActCommercially, canApprove, canConfirmPurchase,
  canDecideLegacyPriceRequest,
  canRecordFollowup, canSelectExpert, canSetCommercialPrice,
  canSetInitialCommercialPrice, canSignalPurchaseInterest, canViewFollowup,
  computeCommercialPrice, isFollowupReason, isTerminal,
  FOLLOWUP_REASONS, FOLLOWUP_REASON_LABELS, FOLLOWUP_STATUSES, FOLLOWUP_STATUS_LABELS,
  LEGACY_ONLY_STATUSES, PRICE_SOURCES, priceSourceLabel, priceSourceShort,
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
//  **دورُه استقبال** يحمل قدرةً سريرية: يبقى تجارياً لأن الدورَ هو الحَكَم.
const docCap = { role: "reception", isAdmin: false, permissions: { canWriteMedicalExam: true } };
//  **ودورُه سريريٌّ بحت** يحمل القدرة: يوقّع ويشير ولا يعمل تجارياً.
const clinicalOnly = { role: "therapist", isAdmin: false,
  permissions: { canWriteMedicalExam: true } };
const admin = { role: "admin", isAdmin: true, permissions: {} };
//  **دورُه «طبيب» و`isAdmin` صحيح**: سلطةُ المسؤول تُفحَص أوّلاً في كلّ
//  بوّابة، فلا يقيّده دورُه العاديّ — ولا بوّابةَ تخصّه باسم دوره.
const adminDoc = { role: "doctor", isAdmin: true,
  permissions: { canWriteMedicalExam: true } };
const expert = { role: "prosthetics_expert", isAdmin: false, permissions: {} };
//  **يحملان `canAddPatients`/`canEditPatients`** عمداً: البوّابة بالدور لا
//  بالقدرة، وهذان هما مَن كانت القدرةُ وحدها تفتح لهما ملفّ المتابعة.
const accountant2 = { role: "accountant", isAdmin: false,
  permissions: { canAddPatients: true, canManageAccounting: true } };
const physioStaff = { role: "therapist", isAdmin: false,
  permissions: { canEditPatients: true, canEnterSessions: true } };
const expertWithAdd = { role: "prosthetics_expert", isAdmin: false,
  permissions: { canAddPatients: true } };

/** الحالاتُ الخمسُ الحيّة — كلُّ ما ليس نهائياً. تُستعمل في أكثر من قسم. */
const LIVE = ["awaiting_patient_decision", "follow_up", "price_approval_pending",
  "price_approved_waiting_patient", "purchase_approval_pending"] as const;

// ══ أ. مَن يعمل تجارياً — **يستطيع ولا يُطلَب منه** ══════════════════════
//  الطبيبُ المخوَّل داخلها: يسدّ فراغاً حين يقف المريضُ أمامه والاستعلامات
//  مشغول. **ولا حالةَ تنتظره**: الاستقبالُ ومديرُ الفرع يُتمّان كلَّ شيء.
console.log("\n── مَن يعمل تجارياً ──");
same("أ. الاستقبال يتابع تجارياً", canActCommercially(recv), true);
same("   ومديرُ الفرع", canActCommercially(mgr), true);
same("   والمسؤول", canActCommercially(admin), true);
same("أ٠. **والطبيبُ المخوَّل كذلك** — مرونةٌ تشغيلية لا تبعيّة",
  canActCommercially(doc), true);
same("   ومَن يحمل القدرة السريرية وإن كان دورُه غيرَ الطبّ",
  [canActCommercially(clinicalOnly), canActCommercially(docCap)], [true, true]);
same("   **والخبير الصِرف لا** — منفّذٌ لا متابِع", canActCommercially(expert), false);
same("   وبلا جلسة ⟶ لا", canActCommercially(null), false);
same("   والاسمُ القديم مطابقٌ للجديد — لا بوّابتان",
  [recv, mgr, doc, docCap, admin, expert]
    .filter((w) => canRecordFollowup(w) !== canActCommercially(w)), []);

// ══ أ٢. القراءة بالدور لا بالقدرة ═════════════════════════════════════
//  ملفُّ المتابعة يحمل السعر المعتمد وهاتفَ المريض وسببَ تردّده. وكانت
//  `canAddPatients` وحدها تفتحه — وهي تُمنح لحساباتٍ لا شأن لها بالمتابعة.
console.log("\n── مَن يقرأ ──");
same("أ٢. الأربعة يقرأون",
  [recv, mgr, doc, admin].map(canViewFollowup), [true, true, true, true]);
//  **والمحاسبُ معهم — بدوره لا بقدرته.** المريضُ يقف عنده بالمال، فبطاقةٌ
//  محجوبةٌ عنه كانت تعني أن يقبض ثمن بيعٍ لا يراه. والبوّابةُ بقيت بالدور:
//  `canAddPatients` وحدها لا تزال لا تفتح شيئاً.
same("أ٣. **والمحاسبُ يقرأ — بدوره** لأنه يقبض", canViewFollowup(accountant2), true);
same("   **ولا مُدخِلُ الجلسات ولو حمل `canEditPatients`**",
  canViewFollowup(physioStaff), false);
same("   **ولا خبيرُ الأطراف ولو حملها**", canViewFollowup(expertWithAdd), false);
same("   وبلا جلسة ⟶ لا", canViewFollowup(null), false);
same("   **ومَن لا يقرأ لا يكتب** — الحجبُ لا ثغرةَ فيه",
  [physioStaff, expertWithAdd]
    .filter((w) => canViewFollowup(w) || canActCommercially(w)), []);
//  **وقراءتُه لا تفتح له إدارةَ الملفّ**: القراءةُ والقبضُ بابان، والتأجيلُ
//  والإغلاقُ وإعادةُ الفتح خلف `canActCommercially` وحدها — وهو خارجها.
same("   **والمحاسبُ يقرأ ولا يدير** — `canActCommercially` تبقى دونه",
  canActCommercially(accountant2), false);

// ══ ب. مَن يعتمد — القاعدة الحاسمة ═════════════════════════════════════
console.log("\n── مَن يعتمد ──");
same("ب. **الطبيب يعتمد**", canApprove(doc), true);
same("   ومَن يحمل `canWriteMedicalExam` وإن كان دورُه غيرَ الطبّ", canApprove(docCap), true);
same("   والمسؤول العام", canApprove(admin), true);
same("ج. **ومديرُ الفرع لا يعتمد** — هذه هي القاعدة كلّها", canApprove(mgr), false);
same("   ولا الاستقبال", canApprove(recv), false);
same("   ولا الخبير", canApprove(expert), false);
same("   وبلا جلسة ⟶ لا", canApprove(null), false);
same("   والغموض يُقرأ «لا»",
  canApprove({ permissions: { canWriteMedicalExam: 1 } } as any), false);

// ══ ب٢. مَن يؤكّد الشراء — بوّابةٌ مستقلّةٌ أوسع ═══════════════════════
//  «اشترى» تسجيلُ واقعةٍ لا اعتماد، فبوّابتُها الفرعُ لا الطبيب. وفصلُها
//  عن `canApprove` مقصود: تعديلُ السعر يبقى للطبيب والمسؤول وحدهما.
console.log("\n── مَن يؤكّد الشراء ──");
same("ب٢. **الاستقبال يؤكّد الشراء**", canConfirmPurchase(recv), true);
same("   ومديرُ الفرع", canConfirmPurchase(mgr), true);
same("   والمسؤول العام", canConfirmPurchase(admin), true);
//  **والطبيبُ المخوَّل كذلك** — إن حضر. ولا يقف عليه بيعٌ أبداً.
same("ب٢ب. **والطبيبُ المخوَّل يؤكّد إن حضر** — ولا يُنتظَر",
  [canConfirmPurchase(doc), canConfirmPurchase(clinicalOnly),
    canConfirmPurchase(docCap)], [true, true, true]);
same("ب٣. **والخبيرُ لا** — محجوبٌ مالياً في كل النظام", canConfirmPurchase(expert), false);
same("   وبلا جلسة ⟶ لا", canConfirmPurchase(null), false);
//  والفرقُ بين البوّابتين مُثبَتٌ لا موصوف: مديرُ الفرع يبيع ولا يعتمد سعراً.
//  **والقاعدةُ كلُّها في سطرٍ واحد**: مديرُ الفرع يبيع **ويسعّر**، ولا
//  يحسم طلباً قديماً — فذاك اعتمادٌ وقّع الطبيبُ على أصله.
same("ب٤. **مديرُ الفرع: يبيع ويسعّر ولا يحسم القديم**",
  [canConfirmPurchase(mgr), canSetCommercialPrice(mgr), canDecideLegacyPriceRequest(mgr)],
  [true, true, false]);

// ══ ب٥. **المحاسبُ: يُتمّ البيع ولا شيءَ بعده** ═══════════════════════════
//  هذا هو ثمرُ فصلِ البوّابتين، ويُثبَت واحدةً واحدة لا بالوصف. فإضافتُه
//  إلى `canActCommercially` — وهي الطريقةُ «الأسهل» — كانت ستمنحه معه
//  التأجيلَ والإغلاقَ وإعادةَ الفتح والإشارةَ وتحديدَ السعر دفعةً واحدة.
console.log("\n── المحاسبُ يُتمّ البيع ولا يديره ──");
same("ب٥. **المحاسبُ يؤكّد الشراء**", canConfirmPurchase(accountant2), true);
same("   **ويُدخل أولَ سعرٍ حين سكتت المعاينة**",
  canSetInitialCommercialPrice(accountant2), true);
same("   **ويختار الخبير في الحالات الحيّة الخمس**",
  LIVE.filter((st) => !canSelectExpert(accountant2, st)), []);
//  **وما لا يُمنَح**: خمسُ بوّاباتٍ تبقى مغلقةً دونه — لا واحدةَ تسرّبت.
same("ب٦. **ولا يُمنَح شيئاً آخر** — خمسُ بوّاباتٍ مغلقةٌ دونه",
  ([["إدارةُ الملفّ (تأجيل/إغلاق/إعادةُ فتح)", canActCommercially],
    ["تحديدُ السعر", canSetCommercialPrice],
    ["إشارةُ الرغبة", canSignalPurchaseInterest],
    ["حسمُ الطلب القديم", canDecideLegacyPriceRequest],
    ["اعتمادُ السعر", canApprove],
  ] as Array<[string, (x: any) => boolean]>)
    .filter(([, gate]) => gate(accountant2)).map(([n]) => n), []);
//  **والأزرارُ تُترجم ذلك حرفياً**: زرٌّ واحدٌ في كلّ حالةٍ حيّة لا غير.
same("ب٧. **وزرُّه واحدٌ في كلّ حالةٍ حيّة: «اشترى» لا غير**",
  LIVE.map((st) => allowedActions(accountant2, st).join("+")),
  ["confirm_purchase", "confirm_purchase", "", "confirm_purchase", "confirm_purchase"]);
same("   **ولا زرَّ له في النهائيّتين** — لا إعادةَ فتحٍ ولا شيء",
  ["closed_without_purchase", "converted"].flatMap((st) =>
    allowedActions(accountant2, st)), []);
//  ودورُ «محاسب» وحده هو البوّابة: القدرةُ المالية لا تصنع محاسباً.
same("ب٨. **والقدرةُ المالية وحدها لا تفتح شيئاً** — الدورُ هو الحَكَم",
  [canViewFollowup({ role: "therapist", permissions: { canManageAccounting: true } }),
    canConfirmPurchase({ role: "therapist", permissions: { canManageAccounting: true } })],
  [false, false]);

// ══ ج. الأزرار بحسب الحالة ═════════════════════════════════════════════
console.log("\n── الأزرار ──");
//  **الاستقبال ينفّذ ولا يسعّر**: ثلاثةُ أفعالٍ لا رابعَ لها.
//  **وقرارُ المريض يسجّله مَن سمعه** — استقبالاً كان أو طبيباً.
same("د. بانتظار قرار المريض: الاستقبال يرى الأربعة",
  allowedActions(recv, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "signal_purchase_interest"]);
//  ومديرُ الفرع يرى معها **قرارَه التجاري** — لا طلباً يرسله.
same("   **ومديرُ الفرع يرى معها تحديدَ السعر**",
  allowedActions(mgr, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "set_commercial_price",
    "signal_purchase_interest"]);
//  والطبيبُ يرى **إشارةَ التسليم** — ولا يسعّر ولا يبيع بقرارٍ تجاري.
//  **والطبيبُ المخوَّل يرى التشغيليَّ ومعه إشارتُه — ولا يرى التسعير.**
same("   **والطبيب يرى الأفعالَ التشغيلية ومعها إشارتُه**",
  allowedActions(doc, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "signal_purchase_interest"]);
//  **والسعرُ وحده خارجَه** — في كلّ حالةٍ بلا استثناء.
same("   **ولا يرى تحديدَ السعر في أيّ حالة**",
  FOLLOWUP_STATUSES.filter((st) =>
    allowedActions(doc, st).includes("set_commercial_price")), []);
same("   ولا مَن دورُه سريريٌّ بحت",
  FOLLOWUP_STATUSES.filter((st) =>
    allowedActions(clinicalOnly, st).includes("set_commercial_price")), []);
same("   **ولا زرَّ «طلب تعديل سعر» لأحدٍ إطلاقاً** — لم يعد الطريقُ طلباً",
  [recv, mgr, doc, admin]
    .filter((x) => allowedActions(x, "awaiting_patient_decision").includes("request_price_change")),
  []);
same("هـ. **الطلبُ القديم المعلَّق: الاستقبال بلا زرّ**",
  allowedActions(recv, "price_approval_pending"), []);
same("   **ومديرُ الفرع كذلك بلا زرّ عليه** — يُحكَم بقانون يومه",
  allowedActions(mgr, "price_approval_pending"), []);
same("   والطبيب يحسمه اعتماداً أو رفضاً",
  allowedActions(doc, "price_approval_pending").sort(), ["approve_price", "reject_price"]);
same("و. بعد اعتماد السعر: الاستعلامات يشتري مباشرةً",
  allowedActions(recv, "price_approved_waiting_patient").includes("confirm_purchase"), true);
same("   **ولا زرَّ اعتمادٍ لأحدٍ هنا** — الدور دورُ المتابِع",
  allowedActions(doc, "price_approved_waiting_patient").includes("approve_purchase"), false);

// ══ ز. الحالةُ الملغاة — توافقٌ رجعي لا مسارٌ حيّ ══════════════════════
//  كانت «بانتظار اعتماد الشراء» تُفرِغ يدَ الاستقبال تماماً: قائمةٌ خالية،
//  والملفُّ واقفٌ حتى يفرغ طبيبٌ لضغطةٍ لا قرارَ سريرياً فيها. والصفوف
//  المحتجزة فيها من قبلُ صارت **قابلةً للعمل فوراً**.
same("ز. **الصفُّ المحتجز: الاستقبال يؤكّده ويغلقه**",
  allowedActions(recv, "purchase_approval_pending").sort(), ["close", "confirm_purchase"]);
same("   ومديرُ الفرع كذلك، ومعه تسعيرُه",
  allowedActions(mgr, "purchase_approval_pending").sort(),
  ["close", "confirm_purchase", "set_commercial_price"]);
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
same("   **ولا لخبير الأطراف ولا لمُدخِل الجلسات** — ليسا ممّن يُتمّ البيع",
  [expert, physioStaff].flatMap((w) =>
    LIVE.filter((st) => canSelectExpert(w, st))), []);
//  **والمحاسبُ داخلها اليوم** — لأن الخبيرَ الناقصَ يُختار داخل «اشترى»
//  نفسها. وحجبُه كان سيوقف بيعاً قائماً عند شاشةٍ أخرى لا يملكها.
same("   **والمحاسبُ يختاره** — إتمامُ البيع يشمل خبيرَه",
  LIVE.filter((st) => !canSelectExpert(accountant2, st)), []);
//  **والبوّابةُ هي «مَن يُتمّ البيع» حرفياً** — لا نسخةٌ ثانيةٌ منها. فلو
//  ضُيّق التأكيدُ يوماً ضاق معه اختيارُ الخبير بلا أن يُنسى ملفٌّ.
same("   **ومصدرُها `canConfirmPurchase` نفسه لا نسخةٌ منه**",
  [recv, mgr, doc, admin, expert, accountant2, physioStaff, expertWithAdd]
    .flatMap((w) => LIVE.filter((st) => canSelectExpert(w, st) !== canConfirmPurchase(w))),
  []);
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

// ══ ش. **سلطةُ المسؤول تسبق الدور — في كلّ بوّابة** ═════════════════════
console.log("\n── سلطةُ المسؤول ──");
const EVERY_GATE: Array<[string, (x: any) => boolean]> = [
  ["قراءة", canViewFollowup],
  ["عملٌ تجاري", canActCommercially],
  ["تأكيد الشراء", canConfirmPurchase],
  ["تحديد السعر", canSetCommercialPrice],
  ["إشارة الرغبة", canSignalPurchaseInterest],
  ["حسم القديم", canDecideLegacyPriceRequest],
];
same("ش. **حسابٌ دورُه «طبيب» و`isAdmin` صحيح يمرّ من كلّ بوّابة**",
  EVERY_GATE.filter(([, gate]) => !gate(adminDoc)).map(([n]) => n), []);
//  **والدورُ العاديُّ وحده لا يفتح التسعير** — فالفرقُ بينهما مُثبَتٌ لا موصوف.
same("   **والفرقُ هو `isAdmin` وحده**: نفسُ الدور بلا سلطةٍ لا يسعّر",
  [canSetCommercialPrice(doc), canSetCommercialPrice(adminDoc)], [false, true]);
same("   ويرى تحديدَ السعر في الأزرار كذلك",
  allowedActions(adminDoc, "awaiting_patient_decision").sort(),
  ["close", "confirm_purchase", "defer", "set_commercial_price",
    "signal_purchase_interest"]);
same("   **والفرقُ عن الاستقبال هو التسعيرُ وحده**",
  allowedActions(recv, "awaiting_patient_decision").sort()
    .concat("set_commercial_price").sort(),
  allowedActions(adminDoc, "awaiting_patient_decision").sort());
same("   ويسنِد الخبير في كلّ حالةٍ حيّة",
  LIVE.filter((st) => !canSelectExpert(adminDoc, st)), []);

// ══ ت. **ولا حالةَ تنتظر طبيباً** — أهمُّ ما يُثبَت هنا ═════════════════
//  الطبيبُ يستطيع، ولا يُطلَب. فالبرهانُ أن الاستقبالَ ومديرَ الفرع يريان
//  فعلاً واحداً على الأقلّ في كلّ حالةٍ حيّة — فلا يقف ملفٌّ بلا يدٍ تحرّكه.
console.log("\n── لا حالةَ تنتظر طبيباً ──");
const NON_TERMINAL = FOLLOWUP_STATUSES.filter((st) => st !== "converted");
same("ت. **الاستقبالُ يملك فعلاً في كلّ حالةٍ حيّة إلّا الطلبَ القديم**",
  NON_TERMINAL.filter((st) => allowedActions(recv, st).length === 0),
  ["price_approval_pending"]);
same("   ومديرُ الفرع كذلك",
  NON_TERMINAL.filter((st) => allowedActions(mgr, st).length === 0),
  ["price_approval_pending"]);
//  و`price_approval_pending` **لا يدخلها ملفٌّ جديد** (بقايا المسار القديم)،
//  فالمسارُ الحيُّ كلُّه بيد الفرع من أوّله إلى آخره.
same("   **والحالةُ الوحيدة التي تنتظر مخوَّلاً منقرضةٌ لا تُنشَأ**",
  LEGACY_ONLY_STATUSES.includes("price_approval_pending"), true);
//  **وكلُّ فعلٍ في المسار الحيّ يملكه الفرعُ بلا طبيب** — واحداً واحداً.
const LIVE_ACTIONS = ["confirm_purchase", "defer", "close", "reopen",
  "set_commercial_price"];
same("   **وكلُّ فعلٍ حيٍّ يملكه الاستقبالُ أو مديرُ الفرع بلا طبيب**",
  LIVE_ACTIONS.filter((a) => !FOLLOWUP_STATUSES.some((st) =>
    allowedActions(recv, st).includes(a) || allowedActions(mgr, st).includes(a))),
  []);
//  **والطبيبُ لا يملك فعلاً حصرياً واحداً** غير إشارته الاختيارية وحسمِ
//  القديم — فلا شيءَ في المسار الحيّ يمرّ به وحده.
const docExclusive = FOLLOWUP_STATUSES.flatMap((st) =>
  allowedActions(doc, st).filter((a) =>
    !allowedActions(recv, st).includes(a) && !allowedActions(mgr, st).includes(a))
    .map((a) => `${st}:${a}`));
same("   **ولا فعلَ حصريٌّ للطبيب إلّا إشارتُه وحسمُ القديم**",
  docExclusive.filter((x) => !x.endsWith(":signal_purchase_interest")
    && !x.endsWith(":approve_price") && !x.endsWith(":reject_price")),
  []);

// ══ ل. **القرارُ التجاري: مَن يملكه ومَن لا** ═══════════════════════════
console.log("\n── القرار التجاري ──");
same("ل. **مديرُ الفرع والمسؤول يحدّدان السعر**",
  [canSetCommercialPrice(mgr), canSetCommercialPrice(admin)], [true, true]);
same("   **والاستقبال لا** — ينفّذ البيع ولا يضع سعره",
  canSetCommercialPrice(recv), false);
same("   **ولا الطبيب** — قرارُه سريريّ لا تجاري",
  canSetCommercialPrice(doc), false);
same("   ولا جلسةَ فارغة", [canSetCommercialPrice(null), canSetCommercialPrice(undefined)],
  [false, false]);

//  **قرارُ المريض يسجّله مَن سمعه**: الطبيبُ وهو يخرج من غرفته، أو
//  الاستعلامات وقد وقف المريضُ أمامه بعدها. ولا يُشترط أحدٌ بعينه.
same("م. **«اشترى» يسجّله الأربعة**",
  [canSignalPurchaseInterest(doc), canSignalPurchaseInterest(recv),
    canSignalPurchaseInterest(mgr), canSignalPurchaseInterest(admin)],
  [true, true, true, true]);
same("   **ولا الخبير ولا المحاسب** — ليسا من مسؤولي المتابعة",
  [canSignalPurchaseInterest(expert), canSignalPurchaseInterest(accountant2)],
  [false, false]);

// ══ ن. **ولا اعتمادَ شراءٍ ولا اعتمادَ خصمٍ في أي حالة لأي دور** ═════════
const EVERY_ROLE = [recv, mgr, doc, admin];
const FORBIDDEN = [
  "approve_purchase", "request_purchase_approval",
  "request_discount", "approve_discount", "reject_discount",
  "request_price_change",
];
same("ن. **لا فعلَ اعتمادٍ منقرضاً يظهر لأي دورٍ في أي حالة**",
  FOLLOWUP_STATUSES.flatMap((st) => EVERY_ROLE.flatMap((who) =>
    allowedActions(who, st).filter((a) => FORBIDDEN.includes(a)).map((a) => `${st}:${a}`))),
  []);

// ══ س. مصدرُ السعر — أربعةٌ ونصٌّ واحدٌ لكلٍّ ═══════════════════════════
console.log("\n── مصدر السعر ──");
same("س. القيمُ الأربع بأسمائها", [...PRICE_SOURCES],
  ["exam", "manager_set", "approved_change", "reception_set"]);
same("   والمعاينةُ «من المعاينة»", priceSourceLabel("exam"), "السعر المعتمد من المعاينة");
same("   **ومَن حدّده مديرُ الفرع يُقال باسمه**",
  priceSourceLabel("manager_set"), "السعر المعتمد حدّده مدير الفرع");
//  والقديمُ **لا يُنسَب إلى مدير الفرع**: مَن اعتمده يومَها كان طبيباً.
same("   **والقديمُ لا يُنسَب إلى مدير الفرع**",
  priceSourceLabel("approved_change"), "السعر المعتمد بعد تعديل سعر سابق");
check(!priceSourceShort("approved_change").includes("مدير"),
  "   ولا ترد «مدير» في نصّ القديم إطلاقاً", priceSourceShort("approved_change"));
//  **وأولُ سعرٍ لا يُنسَب إلى دورٍ بعينه**: الطبيبُ ترك الحقل فارغاً، ومَن
//  أتمّ البيع أدخله — استقبالاً كان أو محاسباً أو طبيباً أو مديراً. ونسبتُه
//  إلى أيٍّ منهم بالاسم في نصٍّ ثابت كانت ستكذب على قارئ السجلّ.
same("   **وأولُ سعرٍ يُنسَب إلى فعله لا إلى دورٍ بعينه**",
  priceSourceLabel("reception_set"), "السعر المعتمد أُدخل عند إتمام البيع");
same("   **ولا يسمّي دوراً واحداً** — لا مديراً ولا استعلامات",
  ["مدير", "الاستعلامات", "محاسب", "طبيب"]
    .filter((w) => priceSourceShort("reception_set").includes(w)), []);
//  **والقيمةُ المخزَّنة لم تتغيّر**: صفوفٌ مكتوبةٌ تحملها، وتغييرُها ترحيلٌ
//  لا يشتري شيئاً. النصُّ وحده هو ما تحرّر.
same("   **والقيمةُ المخزَّنة `reception_set` كما هي — النصُّ وحده تغيّر**",
  PRICE_SOURCES.includes("reception_set" as any), true);
same("   والمختصرُ جزءٌ من الكامل — نصٌّ واحد لا نصّان",
  PRICE_SOURCES.map((v) => priceSourceLabel(v) === `السعر المعتمد ${priceSourceShort(v)}`),
  [true, true, true, true]);
same("   وقيمةٌ لا تُعرَف تُقرأ «من المعاينة» ولا تُخترَع لها عبارة",
  [priceSourceShort("junk"), priceSourceShort(null)], ["من المعاينة", "من المعاينة"]);

// ══ ع. حسابُ السعر التجاري — حدُّه الوحيد أنه موجبٌ صحيح ════════════════
console.log("\n── حساب السعر التجاري ──");
const P = (previousPrice: number, finalPrice: number) =>
  computeCommercialPrice({ previousPrice, finalPrice });
same("ع. التخفيض: مليونٌ ⟶ ٨٠٠ ألف",
  (({ ok, difference, percentageDifference, changed }) =>
    ({ ok, difference, percentageDifference, changed }))(P(1_000_000, 800_000)),
  { ok: true, difference: -200_000, percentageDifference: -20, changed: true });
//  **والزيادةُ مسموحة**: مريضٌ عاد بعد سنةٍ والأسعار تغيّرت — وليس في ذلك خطأ.
same("   **والزيادةُ مسموحة** — مريضٌ عاد بعد سنة",
  (({ ok, difference, percentageDifference }) => ({ ok, difference, percentageDifference }))(
    P(1_000_000, 1_250_000)),
  { ok: true, difference: 250_000, percentageDifference: 25 });
same("   والتثبيتُ بلا تغيير يُقبل ويُعلَم أنه لم يتغيّر",
  (({ ok, changed, difference }) => ({ ok, changed, difference }))(P(500_000, 500_000)),
  { ok: true, changed: false, difference: 0 });
same("ف. **والصفرُ يُردّ** — بيعٌ بلا مال",
  [P(1_000_000, 0).ok, P(1_000_000, -5).ok], [false, false]);
same("   وكسرُ الدينار يُردّ", P(1_000_000, 800_000.5).ok, false);
same("   و`NaN` و`Infinity` يُردّان",
  [P(1_000_000, Number.NaN).ok, P(1_000_000, Number.POSITIVE_INFINITY).ok], [false, false]);
same("   **ولا حدَّ أعلى** — عشرةُ أضعافٍ تُقبل، فالقرار تجاريّ",
  P(100_000, 1_000_000).ok, true);
same("   وسعرٌ سابقٌ صفرٌ لا يُنتج نسبةً بلا معنى",
  (({ ok, percentageDifference, difference }) => ({ ok, percentageDifference, difference }))(
    P(0, 750_000)),
  { ok: true, percentageDifference: 0, difference: 750_000 });
same("ص. وكلُّ رفضٍ برسالةٍ عربية",
  [P(1_000_000, 0), P(1_000_000, -1), P(1_000_000, 1.5)].filter((r) => !r.error), []);

// ══ ق. الحالاتُ المنقرضة تُقرأ ولا تُنشَأ ══════════════════════════════
same("ق. الثلاثُ الموروثةُ معلَّمةٌ صراحةً", [...LEGACY_ONLY_STATUSES],
  ["price_approval_pending", "price_approved_waiting_patient", "purchase_approval_pending"]);
same("   وكلٌّ منها بعنوانٍ عربي يُقرأ",
  LEGACY_ONLY_STATUSES.filter((s) => !FOLLOWUP_STATUS_LABELS[s]), []);

// ══ ر. والبطاقةُ تستعمل العقدَ الجديد فعلاً ═════════════════════════════
console.log("\n── عقد البطاقة التجاري ──");
check(cardSrc.includes("button-set-commercial-price")
  && cardSrc.includes("/commercial-price"),
  "ر. **زرُّ تحديد السعر ونقطتُه في البطاقة**");
// ══ ر٠. **زرُّ الشراء واحد** — والإشارةُ صارت أثراً لا زرّاً ══════════════
//  كان في البطاقة زرّان يعنيان الشيء نفسه للموظّف: «اشترى» و«اشترى — يرغب
//  بإكمال البيع». فالثاني حُذف من الشاشة، **ونقطتُه وتاريخُه باقيان**:
//  الخادم يسجّل الإشارة نفسها تلقائياً حين يُرفَع طلبُ خصم، والصفوف القديمة
//  تُقرأ كما هي. حذفُ الزرّ تبسيطُ واجهةٍ لا حذفُ بيانات.
check(!cardSrc.includes("button-signal-purchase-interest"),
  "ر٠. **ولا زرَّ إشارةٍ ثانياً في البطاقة** — زرُّ شراءٍ واحد",
  (cardSrc.match(/.*signal-purchase-interest.*/g) ?? []).join("\n"));
const buyButtons = (cardSrc.match(/data-testid="button-confirm-purchase"/g) ?? []);
check(buyButtons.length === 1,
  "   **وزرُّ «اشترى» واحدٌ لا نسختان**", `عددُها: ${buyButtons.length}`);
//  **ولا يُعطَّل لغياب الخبير**: النافذةُ تختاره، فلا يُطرَد الموظّف منها.
check(!/selectedExpertUserId === null[\s\S]{0,400}button-confirm-purchase"/.test(cardSrc),
  "   **ولا يُعطَّل لغياب الخبير** — النافذةُ تختاره");
check(!cardSrc.includes("اختر الخبير المسؤول أولاً"),
  "   **ولا نصَّ يطرد الموظّفَ ليختار الخبير في مكانٍ آخر**");
//  **والنقطةُ باقيةٌ في الخادم** — توافقاً رجعياً وللتسجيل التلقائي.
const followupRoutesSrc = readFileSync(
  join(import.meta.dirname, "../server/followup/routes.ts"), "utf8");
check(followupRoutesSrc.includes("/:id/purchase-interest"),
  "   **ونقطةُ الإشارة باقيةٌ في الخادم** — لم تُحذف مع الزرّ");
check(followupRoutesSrc.includes("signalPurchaseInterest({"),
  "   **ويسجّلها الخادمُ تلقائياً** عند رفع طلب الخصم من النافذة");
//  **والشاشةُ لا تُلزِم الطبيبَ بشيء**: لا نصَّ يقول «على الطبيب» أو
//  «بانتظار الطبيب» أو «يجب على الطبيب». مشاركتُه اختيارٌ لا واجب.
const obligation = (cardSrc.match(/.*(على الطبيب|بانتظار الطبيب|يجب على|الطبيب يجب).*/g) ?? []);
check(obligation.length === 0,
  "ر٢. **ولا نصَّ يُلزِم الطبيبَ بفعلٍ في الشاشة**", obligation.join("\n"));
//  والأزرارُ كلُّها مشتقّةٌ من `allowedActions` — فلا شرطَ دورٍ مكتوبٌ فيها.
check(!/role\s*===\s*["']doctor["']/.test(cardSrc),
  "   **ولا تفحص الشاشةُ الدورَ بنفسها** — القاعدةُ في المشتركة وحدها",
  (cardSrc.match(/.*role\s*===.*/g) ?? []).join("\n"));
//  **ولا نافذةَ طلبٍ باقية**: نقطةُ **إنشاء** الطلب لم تعد تُنادى من الشاشة.
//  و`/price-requests/:id/decide` تبقى — هي حسمُ ما بقي معلَّقاً لا إنشاءُ جديد.
check(!/\/price-request(?!s)/.test(cardSrc),
  "   **ولا تنشئ البطاقةُ طلبَ سعرٍ جديداً إطلاقاً**",
  (cardSrc.match(/.*price-request(?!s).*/g) ?? []).join("\n"));
check(cardSrc.includes("/price-requests/"),
  "   وتبقى نقطةُ حسمِ الطلب القديم — كي لا يتجمّد ما بقي معلَّقاً");
check(cardSrc.includes("computeCommercialPrice({"),
  "   والفرقُ يُحسب بالدالّة المشتركة لا في الشاشة");
check(cardSrc.includes("priceSourceShort(active.priceSource)")
  && !/approved_change/.test(cardSrc),
  "   ونصُّ مصدرِ السعر من المشتركة — بلا استنتاجٍ في الشاشة",
  (cardSrc.match(/.*approved_change.*/g) ?? []).join("\n"));
//  ولا نصَّ حيّاً يقول إن الشراء يحتاج اعتماداً.
const purchaseApproval = (cardSrc.match(/.*اعتماد الشراء.*/g) ?? []);
check(purchaseApproval.every((l) => l.includes("قبل التبسيط")),
  "   **ولا يقول شيءٌ حيٌّ «اعتماد الشراء»**", purchaseApproval.join("\n"));

console.log(`\n${failures === 0 ? "✅ all followup-rule cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
