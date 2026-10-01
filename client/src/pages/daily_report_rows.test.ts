//  `npm run test:daily-report-rows` — صفوفُ الملخّص المالي بالأقسام المختارة (§4.az)، بلا قاعدة.
import { financialRows, expenseLines, dailyBreakdownTable, type DailyFinancial } from "./daily_report_rows";
import { enumerateReportDays, sumDailyRows } from "@shared/daily_report_scope";
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
const dd = { withMoney: true, days: [{ day: "2026-10-01", visits: 2, patients: 1, paid: 10, revenue: 20, expenses: 1, net: 9 }],
  total: { visits: 2, patients: 1, paid: 10, revenue: 20, expenses: 1, net: 9 } };
same("حسب اليوم: الرؤوس ثمّ الأيام ثمّ «المجموع»", dailyBreakdownTable(dd, (d) => d).rows,
  [["2026-10-01", 10, 20, 1, 9, 2, 1], ["المجموع", 10, 20, 1, 9, 2, 1]]);
same("وبلا مال: اليوم والعدد", dailyBreakdownTable({ withMoney: false, days: [{ day: "d", visits: 3, patients: 2 }], total: { visits: 3, patients: 2 } }, (d) => d).head,
  ["اليوم", "عدد الزيارات", "المرضى الذين حضروا"]);
same("أيامُ الفترة عبر نهاية الشهر", enumerateReportDays("2026-09-29", "2026-10-02"), ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
same("والمجموع: يومٌ بلا مصاريف منفصلة ⟵ المجموعُ null",
  sumDailyRows([{ day: "a", visits: 1, patients: 1, paid: 5, revenue: 6, expenses: null, net: null }, { day: "b", visits: 2, patients: 1, paid: 1, revenue: 1, expenses: null, net: null }], true, 1),
  { visits: 3, patients: 1, paid: 6, revenue: 7, expenses: null, net: null });
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
