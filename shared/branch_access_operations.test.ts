//  قرارُ كلّ عمليةٍ مفتوحة على حدة — منطقٌ خالص، بلا قاعدة بيانات.
//  `npm run test:branch-access-operations`.
//
//  ══ ما يحرسه ═══════════════════════════════════════════════════════════
//  (١) **قرارُ عمليةٍ لا يُطبَّق على أختها**: مريضٌ بطرفٍ ومسند، ينتقل
//      أحدُهما ويبقى الآخر، ولكلٍّ خبيرُه. هذا هو الخطأ الذي لا يُغتفَر هنا.
//  (٢) **النقلُ والخبيرُ متعامدان**: تبقى العمليةُ ويتغيّر خبيرُها.
//  (٣) **وفرعُ التحقّق يتبع القرار**: المنتقلةُ ⟶ الفرعُ المضاف، والباقيةُ
//      ⟶ فرعُها هي. ولو تحقّقنا دائماً تجاه المضاف لأُسنِد جهازُ كربلاء
//      الباقي فيها إلى خبيرٍ لا يعمل فيها.
//  (٤) **ولا قرارَ يُقرأ من سكوت**: عمليةٌ بلا جواب تُردّ، لا تُقرأ «تبقى».
//  (٥) والصيغةُ المختصرة القديمة تُترجَم فتُنتج السلوكَ القديم بحرفه.

import {
  openOperationKey, currentOperationBranchId, expertTargetBranchId,
  operationHasExpertChoice, resolveOperationDecisions, legacyDecisionsFor,
  decisionsReady, type OpenOperationLike,
} from "./branch_access_operations";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const KARBALA = 3, DHIQAR = 4, BAGHDAD = 7;
const EXPERT_K = 51, EXPERT_D = 52;

/** عمليةٌ لها أمرُ عملٍ حيّ في فرعها، بخبيرها. */
const withOrder = (o: Partial<OpenOperationLike> & { workOrderId: number }): OpenOperationLike => ({
  episodeId: null, episodeLive: true, episodeBranchId: null,
  workOrderBranchId: KARBALA, expertUserId: EXPERT_K, followupId: null, ...o,
});
/** طلبٌ حيٌّ بلا أمرِ عملٍ بعد — لا خبيرَ له. */
const episodeOnly = (o: Partial<OpenOperationLike> & { episodeId: number }): OpenOperationLike => ({
  episodeLive: true, episodeBranchId: KARBALA, workOrderId: null,
  workOrderBranchId: null, expertUserId: null, followupId: null, ...o,
});

// ══ أ. الهويّة ═══════════════════════════════════════════════════════════
console.log("\n── أ. هويّةُ الصفّ ──");
{
  same("١. أمرُ العمل أوّلاً", openOperationKey(withOrder({ workOrderId: 9, episodeId: 2 })), "wo:9");
  same("٢. ثمّ الحلقة", openOperationKey(episodeOnly({ episodeId: 2 })), "ep:2");
  same("٣. ثمّ المتابعة",
    openOperationKey({ ...episodeOnly({ episodeId: 0 }), episodeId: null, followupId: 5 }), "fu:5");
  same("٤. ولا خبيرَ لعمليةٍ بلا أمرِ عمل",
    [operationHasExpertChoice(withOrder({ workOrderId: 9 })),
     operationHasExpertChoice(episodeOnly({ episodeId: 2 }))], [true, false]);
  same("٥. وفرعُ العملية من أمرها، وإلّا من حلقتها",
    [currentOperationBranchId(withOrder({ workOrderId: 9, workOrderBranchId: BAGHDAD })),
     currentOperationBranchId(episodeOnly({ episodeId: 2, episodeBranchId: BAGHDAD }))],
    [BAGHDAD, BAGHDAD]);
}

// ══ ب. فرعُ التحقّق يتبع القرار ══════════════════════════════════════════
console.log("\n── ب. فرعُ الخبير ──");
{
  const op = withOrder({ workOrderId: 9, workOrderBranchId: KARBALA });
  same("٦. **المنتقلةُ ⟶ الفرعُ المضاف**", expertTargetBranchId(op, true, DHIQAR), DHIQAR);
  same("٧. **والباقيةُ ⟶ فرعُها هي** — لا الفرعُ المضاف",
    expertTargetBranchId(op, false, DHIQAR), KARBALA);
}

// ══ ج. الطلبُ الأصليّ: تبقى العمليةُ ويتغيّر خبيرُها وحده ════════════════
console.log("\n── ج. تبقى العملية ويتغيّر خبيرها ──");
{
  const op = withOrder({ workOrderId: 9, workOrderBranchId: KARBALA, expertUserId: EXPERT_K });
  const r = resolveOperationDecisions({
    open: [op], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: 99 }],
  });
  check(r.ok, "٨. **قرارٌ مقبول: تبقى + خبيرٌ جديد**", JSON.stringify(r));
  if (r.ok) {
    same("   والخبيرُ يُتحقَّق تجاه **فرع العملية** لا المضاف",
      [r.plans[0].move, r.plans[0].newExpertUserId, r.plans[0].targetBranchId],
      [false, 99, KARBALA]);
  }

  //  واختيارُ الخبير الحاليّ نفسِه ليس تغييراً.
  const same2 = resolveOperationDecisions({
    open: [op], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: EXPERT_K }],
  });
  same("٩. واختيارُ الخبير الحاليّ لا يُعَدّ تحويلاً",
    same2.ok ? same2.plans[0].newExpertUserId : "خطأ", null);
  //  **لكنّه يُتحقَّق منه مع ذلك**: تسميةُ خبيرٍ لعمليةٍ في فرعٍ لا يصلح له
  //  ادّعاءُ إسنادٍ لا يصحّ — و«إبقاء» وحدها تتخطّى التحقّق.
  same("٩.أ. **والمُسمَّى يُتحقَّق منه ولو كان الحاليَّ نفسَه**",
    same2.ok ? same2.plans[0].validateExpertUserId : "خطأ", EXPERT_K);
  same("١٠. و«إبقاء» كذلك — ولا تُتحقَّق أصلاً",
    (() => { const x = resolveOperationDecisions({ open: [op], grantedBranchId: DHIQAR,
      decisions: [{ key: "wo:9", move: false, expert: "keep" }] });
      return x.ok ? [x.plans[0].newExpertUserId, x.plans[0].validateExpertUserId] : "خطأ"; })(),
    [null, null]);
}

// ══ د. قرارٌ لكلّ عملية — ولا يُطبَّق على أختها ═══════════════════════════
console.log("\n── د. عمليتان، قراران مختلفان ──");
{
  const prosthetic = withOrder({ workOrderId: 9, workOrderBranchId: KARBALA, expertUserId: EXPERT_K });
  const support = withOrder({ workOrderId: 11, workOrderBranchId: KARBALA, expertUserId: EXPERT_K });
  const r = resolveOperationDecisions({
    open: [prosthetic, support], grantedBranchId: DHIQAR,
    decisions: [
      { key: "wo:9", move: true, expert: EXPERT_D },   // تنتقل ويتغيّر خبيرُها
      { key: "wo:11", move: false, expert: "keep" },   // تبقى بخبيرها
    ],
  });
  check(r.ok, "١١. **قراران مختلفان لعمليتين — مقبولان**", JSON.stringify(r));
  if (r.ok) {
    same("   الأولى تنتقل بخبير الفرع الجديد",
      [r.plans[0].move, r.plans[0].newExpertUserId, r.plans[0].targetBranchId],
      [true, EXPERT_D, DHIQAR]);
    same("   **والثانية لم تُمَسّ بقرار الأولى**",
      [r.plans[1].move, r.plans[1].newExpertUserId, r.plans[1].targetBranchId],
      [false, null, KARBALA]);
  }

  //  والعكسُ أيضاً — لا ترتيبَ يفرض قراراً.
  const rev = resolveOperationDecisions({
    open: [prosthetic, support], grantedBranchId: DHIQAR,
    decisions: [
      { key: "wo:11", move: true, expert: "keep" },
      { key: "wo:9", move: false, expert: "keep" },
    ],
  });
  same("١٢. والترتيبُ لا يغيّر شيئاً — القرارُ يتبع مفتاحَه",
    rev.ok ? rev.plans.map((p) => [p.key, p.move]) : "خطأ",
    [["wo:11", true], ["wo:9", false]]);
}

// ══ هـ. لا قرارَ من سكوت ═════════════════════════════════════════════════
console.log("\n── هـ. الغيابُ يُردّ ──");
{
  const a = withOrder({ workOrderId: 9 });
  const b = withOrder({ workOrderId: 11 });
  const miss = resolveOperationDecisions({
    open: [a, b], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: "keep" }],
  });
  check(!miss.ok && miss.error.includes("بلا قرار"),
    "١٣. **عمليةٌ بلا جواب تُردّ** — لا تُقرأ «تبقى» بصمت",
    JSON.stringify(miss));

  const noMove = resolveOperationDecisions({
    open: [a], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: undefined as any, expert: "keep" }],
  });
  check(!noMove.ok, "١٤. و`move` غيرُ البوليان تُردّ", JSON.stringify(noMove));

  const noExpert = resolveOperationDecisions({
    open: [a], grantedBranchId: DHIQAR, decisions: [{ key: "wo:9", move: true }],
  });
  check(!noExpert.ok, "١٥. وعمليةٌ لها أمرٌ بلا قرارِ خبير تُردّ", JSON.stringify(noExpert));

  const ghost = resolveOperationDecisions({
    open: [a], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: "keep" },
                { key: "wo:404", move: true, expert: "keep" }],
  });
  check(!ghost.ok, "١٦. وقرارٌ لعمليةٍ غير موجودة يُردّ", JSON.stringify(ghost));

  const dup = resolveOperationDecisions({
    open: [a], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: "keep" },
                { key: "wo:9", move: true, expert: "keep" }],
  });
  check(!dup.ok, "١٧. والتكرارُ يُردّ", JSON.stringify(dup));

  const bad = resolveOperationDecisions({
    open: [a], grantedBranchId: DHIQAR,
    decisions: [{ key: "wo:9", move: false, expert: -3 as any }],
  });
  check(!bad.ok, "١٨. وخبيرٌ مشوَّه يُردّ", JSON.stringify(bad));

  //  **ولا يُتجاهَل بصمت** خبيرٌ أُرسل لعمليةٍ لا خبيرَ لها.
  const ep = episodeOnly({ episodeId: 2 });
  const noOrder = resolveOperationDecisions({
    open: [ep], grantedBranchId: DHIQAR,
    decisions: [{ key: "ep:2", move: true, expert: 99 }],
  });
  check(!noOrder.ok && noOrder.error.includes("بلا أمر عمل"),
    "١٩. **وخبيرٌ لعمليةٍ بلا أمرِ عمل يُردّ** — لا يُسقَط بصمت",
    JSON.stringify(noOrder));
  const okEp = resolveOperationDecisions({
    open: [ep], grantedBranchId: DHIQAR, decisions: [{ key: "ep:2", move: true }],
  });
  same("٢٠. وهي بلا خبيرٍ تمضي", okEp.ok ? okEp.plans[0].newExpertUserId : "خطأ", null);
}

// ══ و. الصيغةُ المختصرة القديمة ══════════════════════════════════════════
console.log("\n── و. المختصرةُ القديمة ──");
{
  const a = withOrder({ workOrderId: 9, expertUserId: EXPERT_K });
  const b = episodeOnly({ episodeId: 2 });

  same("٢١. «لا» ⟶ الكلُّ يبقى بخبيره",
    legacyDecisionsFor([a, b], { move: false }),
    [{ key: "wo:9", move: false, expert: "keep" }, { key: "ep:2", move: false, expert: "keep" }]);
  same("٢٢. و«نعم» + إبقاءُ الخبير",
    legacyDecisionsFor([a, b], { move: true, keepExpert: true }),
    [{ key: "wo:9", move: true, expert: "keep" }, { key: "ep:2", move: true }]);

  //  **و«نعم» بلا قرارِ خبيرٍ تبقى تُردّ** — العقدُ القائم قبل قرارات
  //  العمليات: لا يُخترَع «إبقاء» من السكوت.
  const bare = legacyDecisionsFor([a], { move: true });
  same("٢٢.أ. و«نعم» بلا قرارِ خبيرٍ تُمرَّر بلا جواب",
    bare, [{ key: "wo:9", move: true }]);
  check(!resolveOperationDecisions({ open: [a], decisions: bare, grantedBranchId: DHIQAR }).ok,
    "٢٢.ب. **فيردّها الحاكم** — لا تمضي بـ«إبقاء» مخترَع");
  same("٢٣. و«نعم» + خبيرٌ جديد يُطبَّق على ذوات الأوامر وحدها",
    legacyDecisionsFor([a, b], { move: true, newExpertUserId: EXPERT_D }),
    [{ key: "wo:9", move: true, expert: EXPERT_D }, { key: "ep:2", move: true }]);

  const r = resolveOperationDecisions({
    open: [a, b], grantedBranchId: DHIQAR,
    decisions: legacyDecisionsFor([a, b], { move: true, newExpertUserId: EXPERT_D }),
  });
  same("٢٤. **والمترجَمةُ تمرّ بالحاكم نفسِه فتُنتج السلوكَ القديم**",
    r.ok ? r.plans.map((p) => [p.move, p.newExpertUserId, p.targetBranchId]) : "خطأ",
    [[true, EXPERT_D, DHIQAR], [true, null, DHIQAR]]);
}

// ══ ز. بوّابةُ الشاشة هي حاكمُ الخادم ════════════════════════════════════
console.log("\n── ز. البوّابة ──");
{
  const a = withOrder({ workOrderId: 9 });
  same("٢٥. بلا عملياتٍ ⟶ جاهز", decisionsReady([], [], DHIQAR), true);
  same("٢٦. وبقرارٍ ناقص ⟶ غيرُ جاهز", decisionsReady([a], [], DHIQAR), false);
  same("٢٧. وبقرارٍ كامل ⟶ جاهز",
    decisionsReady([a], [{ key: "wo:9", move: false, expert: "keep" }], DHIQAR), true);
}

console.log(`\n${failures === 0 ? "✅ كل فحوص قرارات العمليات نجحت" : `❌ ${failures} فشل`}`);
process.exit(failures === 0 ? 0 : 1);
