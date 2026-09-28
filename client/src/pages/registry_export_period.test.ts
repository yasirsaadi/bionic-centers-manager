// فترةُ تصدير السجلّ — منطقٌ خالص. `npm run test:registry-export-period`
import { exportPeriodRange, exportPeriodLabel, exportPeriodFileTag, baghdadToday } from "./registry_export_period";

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}

const TODAY = "2026-09-28"; // اثنين
same("١. «الكل» بلا فترة", exportPeriodRange({ kind: "all" }, TODAY), null);
same("٢. يومٌ محدّد", exportPeriodRange({ kind: "day", anchor: "2026-09-15" }, TODAY), { from: "2026-09-15", to: "2026-09-15" });
same("   ويومٌ بلا تاريخ = اليوم", exportPeriodRange({ kind: "day" }, TODAY), { from: TODAY, to: TODAY });
same("٣. **الأسبوعُ من السبت إلى الجمعة** (الاثنين ٢٨ ⟵ السبت ٢٦ … الجمعة ٢ أكتوبر)",
  exportPeriodRange({ kind: "week", anchor: "2026-09-28" }, TODAY), { from: "2026-09-26", to: "2026-10-02" });
same("   والسبتُ نفسُه أوّلُ أسبوعه", exportPeriodRange({ kind: "week", anchor: "2026-09-26" }, TODAY), { from: "2026-09-26", to: "2026-10-02" });
same("   والجمعةُ آخرُه", exportPeriodRange({ kind: "week", anchor: "2026-10-02" }, TODAY), { from: "2026-09-26", to: "2026-10-02" });
same("٤. **الشهرُ التقويميّ كاملاً** — فبراير ٢٠٢٨ الكبيس", exportPeriodRange({ kind: "month", anchor: "2028-02" }, TODAY),
  { from: "2028-02-01", to: "2028-02-29" });
same("٥. آخرُ ٣ أشهر تنتهي اليوم", exportPeriodRange({ kind: "3m" }, TODAY), { from: "2026-06-28", to: TODAY });
same("   وآخرُ ٦ أشهر", exportPeriodRange({ kind: "6m" }, TODAY), { from: "2026-03-28", to: TODAY });
same("   وآخرُ سنة", exportPeriodRange({ kind: "12m" }, TODAY), { from: "2025-09-28", to: TODAY });
same("   **و٣١ مايو − ٣ أشهر ⟵ آخرُ فبراير** لا ٣ مارس", exportPeriodRange({ kind: "3m" }, "2026-05-31"), { from: "2026-02-28", to: "2026-05-31" });
same("٦. العنوانُ يقول الفترةَ بطرفيها", exportPeriodLabel({ kind: "week", anchor: "2026-09-28" }, TODAY), "أسبوع 2026-09-26 إلى 2026-10-02");
same("   واسمُ الملفّ كذلك", [exportPeriodFileTag({ kind: "week", anchor: "2026-09-28" }, TODAY), exportPeriodFileTag({ kind: "day", anchor: "2026-09-15" }, TODAY), exportPeriodFileTag({ kind: "all" }, TODAY)],
  ["2026-09-26_to_2026-10-02", "2026-09-15", "all-dates"]);
same("٧. **يومُ بغداد لا يومُ الجهاز** — ٢٢:٠٠ UTC = ٠١:٠٠ من اليوم التالي في بغداد",
  baghdadToday(new Date("2026-09-27T22:00:00Z")), "2026-09-28");

console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
process.exit(failures === 0 ? 0 : 1);
