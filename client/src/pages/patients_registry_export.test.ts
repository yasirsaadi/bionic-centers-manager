// حسابُ مالِ صفّ تصدير السجل — منطقٌ خالص، بلا قاعدة بيانات.
// `npm run test:registry-export`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **`totalPaid` يُقرَأ لا يُشتَقّ**: الدالّةُ لا تحسب مقبوضاً من أي
//     مصدرٍ آخر — فقط `patient.totalPaid` كما وصل من الخادم.
// (٢) **`remaining` لا يكون سالباً أبداً** — نفسُ قاعدة العرض القديمة
//     (Excel وPDF كانا يطبّقانها بصيغتين مختلفتين قبل هذا التوحيد).
// (٣) **`null`/`undefined` تُقرَأ صفراً** — ملفٌّ بلا كلفةٍ مسجَّلة أو بلا
//     دفعات لا يكسر الحساب.

import { registryExportMoney } from "./patients_registry_export";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

console.log("\n── حسابُ مال صفّ التصدير ──");

same("أ. حالةٌ عادية: كلفةٌ ودفعاتٌ جزئية",
  registryExportMoney({ totalCost: 1_000_000, totalPaid: 400_000 }),
  { totalCost: 1_000_000, totalPaid: 400_000, remaining: 600_000 });

same("ب. مدفوعٌ بالكامل ⟶ متبقٍّ صفر",
  registryExportMoney({ totalCost: 500_000, totalPaid: 500_000 }),
  { totalCost: 500_000, totalPaid: 500_000, remaining: 0 });

same("ج. مدفوعٌ أكثر من الكلفة (تسويةٌ سابقة أو دفعةٌ زائدة) ⟶ متبقٍّ صفرٌ لا سالب",
  registryExportMoney({ totalCost: 300_000, totalPaid: 350_000 }),
  { totalCost: 300_000, totalPaid: 350_000, remaining: 0 });

same("د. بلا كلفةٍ مسجَّلة (null) ⟶ صفر",
  registryExportMoney({ totalCost: null, totalPaid: 100_000 }),
  { totalCost: 0, totalPaid: 100_000, remaining: 0 });

same("هـ. بلا دفعات (null) ⟶ صفر، والمتبقّي كامل الكلفة",
  registryExportMoney({ totalCost: 200_000, totalPaid: null }),
  { totalCost: 200_000, totalPaid: 0, remaining: 200_000 });

same("و. الاثنان غائبان ⟶ أصفارٌ كلّها",
  registryExportMoney({ totalCost: null, totalPaid: null }),
  { totalCost: 0, totalPaid: 0, remaining: 0 });

console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} اختباراً فشل`);
process.exit(failures === 0 ? 0 : 1);
