// How many physiotherapy sessions did this patient buy?
//
// Pinned by the incident that produced the rule: منتهى خميس وادي was priced
// 275,000 for «أجهزة علاج طبيعي» (11 sessions at 25,000) while his payments
// carried only 4 — so reading the payments made the counter disagree with the
// cost, and go negative on the fifth visit. Same for مصطفى حيدر حسين: 1,000,000
// bought 40 sessions, his payments said 11.
//
// Pure logic, no database: `npm run test:physio-sessions`.

import { resolvePurchasedSessions, parsePlanFromText } from "@shared/pricing";

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "✅" : "❌"} ${name}`);
  if (!ok) {
    failures++;
    console.log(`   المتوقع: ${JSON.stringify(want)}`);
    console.log(`   الناتج : ${JSON.stringify(got)}`);
  }
}

console.log("\n── الحالتان اللتان كشفتا الخلل ──");
check(
  "منتهى: 275,000 لأجهزة علاج طبيعي ⇒ 11 جلسة (لا 4 من الدفعات)",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "أجهزة علاج طبيعي",
    caseCost: 275000,
    paymentSessions: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 4 }],
  }),
  { byType: { "أجهزة علاج طبيعي": 11 }, total: 11, source: "cost" },
);
check(
  "مصطفى: 1,000,000 لأجهزة علاج طبيعي ⇒ 40 جلسة (لا 11)",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "أجهزة علاج طبيعي",
    caseCost: 1000000,
    paymentSessions: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 11 }],
  }),
  { byType: { "أجهزة علاج طبيعي": 40 }, total: 40, source: "cost" },
);

console.log("\n── ترتيب المصادر: الأصرح يسبق ──");
check(
  "الخطة المحفوظة تسبق كل شيء",
  resolvePurchasedSessions({
    plan: [{ treatmentType: "روبوت", sessionCount: 7 }],
    treatmentTypeText: "أجهزة علاج طبيعي",
    caseCost: 275000,
    paymentSessions: [{ treatmentType: "روبوت", sessionCount: 99 }],
  }),
  { byType: { "روبوت": 7 }, total: 7, source: "plan" },
);
check(
  "الجلسات الموصوفة في النص لا تُحتسب مشتراة — الوصف ليس شراءً",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "روبوت (10 جلسات)، أبر صينية (5 جلسات)",
    caseCost: 0, // عاينه الطبيب ولم يُسعَّر بعد
    paymentSessions: [],
  }),
  { byType: {}, total: 0, source: "none" },
);
check(
  "مفرد قديم عاينه الطبيب: النص الموصوف لا يطمس دفعاته",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "روبوت (10 جلسات)",
    caseCost: 375000,
    paymentSessions: [{ treatmentType: "روبوت", sessionCount: 15 }],
  }),
  { byType: { "روبوت": 15 }, total: 15, source: "payments" },
);
check(
  "بلا خطة ولا نص ولا كلفة قابلة للقسمة ⇒ الدفعات (المسار القديم)",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "روبوت، أبر صينية",
    caseCost: 375000,
    paymentSessions: [
      { treatmentType: "روبوت", sessionCount: 5 },
      { treatmentType: "أبر صينية", sessionCount: 5 },
    ],
  }),
  { byType: { "روبوت": 5, "أبر صينية": 5 }, total: 10, source: "payments" },
);

console.log("\n── حُرّاس الاشتقاق: لا تخمين ──");
check(
  "نوعان في النص ⇒ لا يُشتق من الكلفة",
  resolvePurchasedSessions({ treatmentTypeText: "روبوت، أبر صينية", caseCost: 375000 }).source,
  "none",
);
check(
  "كلفة لا تقسم تماماً ⇒ لا يُشتق",
  resolvePurchasedSessions({ treatmentTypeText: "روبوت", caseCost: 275111 }).source,
  "none",
);
check(
  "الاستشارة بلا سعر جلسة ⇒ لا يُشتق",
  resolvePurchasedSessions({ treatmentTypeText: "استشارة طبية", caseCost: 0 }).source,
  "none",
);
check(
  "نوع غير معروف ⇒ لا يُشتق",
  resolvePurchasedSessions({ treatmentTypeText: "علاج بالماء", caseCost: 100000 }).source,
  "none",
);
check(
  "روبوت 500,000 ⇒ 10 جلسات",
  resolvePurchasedSessions({ treatmentTypeText: "روبوت", caseCost: 500000 }).total,
  10,
);

console.log("\n── مريض المفرد (حادثة ذي قار): دفعاته هي الحقيقة ──");
check(
  "جلسات مجانية لا كلفة لها: الدفعات (10) تغلب الاشتقاق من الكلفة (8)",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "أجهزة علاج طبيعي",
    caseCost: 200000, // 8 جلسات مدفوعة فقط — والجلستان المجانيتان بلا كلفة
    paymentSessions: [
      { treatmentType: "أجهزة علاج طبيعي", sessionCount: 8 },
      { treatmentType: "أجهزة علاج طبيعي", sessionCount: 2 }, // مجانية
    ],
  }),
  { byType: { "أجهزة علاج طبيعي": 10 }, total: 10, source: "payments" },
);
check(
  "التساوي لا يستدعي الاشتقاق — الدفعات تكفي",
  resolvePurchasedSessions({
    plan: null,
    treatmentTypeText: "روبوت",
    caseCost: 500000,
    paymentSessions: [{ treatmentType: "روبوت", sessionCount: 10 }],
  }).source,
  "payments",
);

console.log("\n── قراءة الأعداد من النص ──");
check("نوع واحد بعدد", parsePlanFromText("روبوت (10 جلسات)"), [{ treatmentType: "روبوت", sessionCount: 10 }]);
check("نص بلا أعداد", parsePlanFromText("روبوت، أبر صينية"), []);
check("نص فارغ", parsePlanFromText(""), []);
check("قيمة غير نصية", parsePlanFromText(null), []);

if (failures > 0) {
  console.log(`\n❌ فشل ${failures} حالة`);
  process.exit(1);
}
console.log("\n✅ كل حالات احتساب الجلسات ناجحة");
