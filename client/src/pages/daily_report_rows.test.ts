//  `npm run test:daily-report-rows` — صفوفُ الملخّص المالي بالأقسام المختارة (§4.az)، بلا قاعدة.
import { financialRows, expenseLines, type DailyFinancial } from "./daily_report_rows";
let failures = 0;
const same = (m: string, got: unknown, exp: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${m}${ok ? "" : `\n      expected ${JSON.stringify(exp)} got ${JSON.stringify(got)}`}`);
};
const f: DailyFinancial = {
  byDepartment: {
    prosthetic: { revenue: 500000, paid: 100000 }, medical_support: { revenue: 200000, paid: 50000 },
    physiotherapy: { revenue: 60000, paid: 30000 }, legacyDevicesUnsplit: { revenue: 90000 },
    unclassified: { revenue: 0, paid: 7000 },
  },
  rollups: {
    devicesCombined: { revenue: 790000, paid: 150000 }, classifiedTotal: { revenue: 850000, paid: 180000 },
    grandTotal: { revenue: 850000, paid: 187000 },
  },
  expenses: 26000, netCash: 161000, scoped: null,
};
const keys = (fx: DailyFinancial, s: any) => financialRows(fx, s).map((r) => r.key);
same("الكلّ: الصفوفُ كما كانت",
  keys(f, null), ["prosthetic", "medical_support", "legacyDevicesUnsplit", "devices", "physiotherapy", "classifiedTotal", "unclassified", "grand"]);
same("علاجٌ وحده: صفُّه وحده — لا مجموعَ مكرَّر ولا غيرُ مصنَّف", keys(f, ["physiotherapy"]), ["physiotherapy"]);
const fs = { ...f, scoped: { selected: { revenue: 790000, paid: 150000 }, expenses: 20000, sharedExpenses: 1000, netCash: 130000 } };
same("القسمان من الأجهزة: ومعهما القديمة، ومجموعُ الأجهزة هو مجموعُ الاختيار — بلا صفٍّ مكرَّر",
  keys(fs, ["prosthetic", "medical_support"]), ["prosthetic", "medical_support", "legacyDevicesUnsplit", "devices"]);
same("الثلاثةُ إلّا واحداً — مساند + علاج: ومجموعُ الاختيار", keys(fs, ["medical_support", "physiotherapy"]), ["medical_support", "physiotherapy", "selected"]);
same("أطراف + علاج: بلا صفّ الأجهزة", keys(fs, ["prosthetic", "physiotherapy"]), ["prosthetic", "physiotherapy", "selected"]);
same("المصاريفُ للكلّ كما كانت", expenseLines(f, null), { expenses: 26000, netCash: 161000, sharedExpenses: null });
same("وللاختيار من الخادم", expenseLines(fs, ["prosthetic", "medical_support"]), { expenses: 20000, netCash: 130000, sharedExpenses: 1000 });
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
