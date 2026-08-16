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

import {
  allowedActions, canApprove, canRecordFollowup, isFollowupReason, isTerminal,
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

// ══ أ. مَن يتابع ═══════════════════════════════════════════════════════
console.log("\n── مَن يسجّل المتابعة ──");
same("أ. الاستقبال يتابع", canRecordFollowup(recv), true);
same("   ومديرُ الفرع", canRecordFollowup(mgr), true);
same("   والطبيب", canRecordFollowup(doc), true);
same("   والمسؤول", canRecordFollowup(admin), true);
same("   **والخبير الصِرف لا** — منفّذٌ لا متابِع", canRecordFollowup(expert), false);
same("   وبلا جلسة ⟶ لا", canRecordFollowup(null), false);

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

// ══ ج. الأزرار بحسب الحالة ═════════════════════════════════════════════
console.log("\n── الأزرار ──");
same("د. بانتظار قرار المريض: الاستقبال يرى الأربعة",
  allowedActions(recv, "awaiting_patient_decision").sort(),
  ["accept_price", "close", "defer", "request_price_change"]);
same("هـ. **بانتظار اعتماد السعر: الاستقبال بلا زرّ**",
  allowedActions(recv, "price_approval_pending"), []);
same("   **ومديرُ الفرع كذلك بلا زرّ**",
  allowedActions(mgr, "price_approval_pending"), []);
same("   والطبيب يرى الاعتماد والرفض",
  allowedActions(doc, "price_approval_pending").sort(), ["approve_price", "reject_price"]);
same("و. بعد اعتماد السعر: الاستعلامات يسجّل موافقة المريض",
  allowedActions(recv, "price_approved_waiting_patient").includes("patient_accepted_new_price"), true);
same("   **ولا زرَّ اعتمادٍ للطبيب هنا** — الدور دورُ المتابِع",
  allowedActions(doc, "price_approved_waiting_patient").includes("approve_purchase"), false);
same("ز. **بانتظار اعتماد الشراء: الاستقبال والمدير بلا زرّ**",
  [allowedActions(recv, "purchase_approval_pending"),
    allowedActions(mgr, "purchase_approval_pending")], [[], []]);
same("   والطبيب وحده يرى «اعتماد الشراء»",
  allowedActions(doc, "purchase_approval_pending"), ["approve_purchase"]);
same("   والمسؤول كذلك",
  allowedActions(admin, "purchase_approval_pending"), ["approve_purchase"]);
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

console.log(`\n${failures === 0 ? "✅ all followup-rule cases pass" : `❌ ${failures} case(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
