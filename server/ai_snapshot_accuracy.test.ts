// لقطةُ الوضع الماليّ للمساعد = أرقامُ المحاسبة بالدينار (§4.ba، واقعةُ مدير فرع الناصرية ٢٠٢٦-٠٩-٢٣).
// قاعدة محلّية: `npm run test:ai-snapshot-accuracy`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// سُئل المساعدُ «كم بلغت الإيرادات هذا الشهر؟» فأجاب من لقطةٍ قديمة: مقبوضُ «آخر ٧ أيام» بحدود UTC
// (يسقط قبضُ اليوم بعد ٠٣:٠٠ بغداد) وسمّاه «آخر ٣٠ يوماً». فهنا:
// (١) كلُّ فترةٍ في اللقطة (اليوم · هذا الشهر · ٧ · ٣٠) = جمعٌ مستقلٌّ لدفعاتٍ معروفة بأيام بغداد.
// (٢) وتساوي `getAccountingSummary` (مصدر التقرير اليومي وصفحة المحاسبة) بالحرف.
// (٣) ودفعةُ ٠٠:٣٠ بغداد اليوم من اليوم، ودفعةُ ٢٣:٣٠ بغداد أمس من أمس.
// (٤) ونصُّ النظام يوجّه «هذا الشهر» إلى الشهر التقويميّ لا إلى آخر ثلاثين يوماً.

import { pool } from "./db";
import { storage } from "./storage";
import { aiChat } from "./ai/chat";
import { resolveAiAccess } from "./ai/access";
import { todayInBaghdad } from "./ai/tools/reports";
import type { AiResult } from "./ai/provider";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const MARK = "اختبار-لقطة-المساعد";
const BR = 9;
const ACC = 9995;

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM expenses WHERE notes = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = $1`, [ACC]);
}

const dayMinus = (day: string, n: number) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().split("T")[0];
};
//  ساعةُ بغداد ⟵ `timestamp` بلا منطقة (UTC كما تخزّنه الشيفرة).
const bg = (day: string, hhmm: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 3, mi)).toISOString().replace("T", " ").replace("Z", "");
};

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (${BR},'فرع اختبار اللقطة') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_manage_accounting)
           VALUES ($1,'snap_acc','x','محاسب','branch_manager',$2,$3::jsonb,true,true)
           ON CONFLICT (id) DO UPDATE SET branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true`,
    [ACC, BR, JSON.stringify([BR])]);
  await cleanup();

  const today = todayInBaghdad();
  const monthStart = `${today.slice(0, 8)}01`;
  const [pt] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,true,false,false,0,'new') RETURNING id`,
    [`${MARK} مريض`, MARK, BR]);

  //  دفعاتٌ معروفة: [يومُ بغداد، الساعة، المبلغ]
  const fixture: [string, string, number][] = [
    [today, "00:30", 20_000],               // بعد منتصف ليل بغداد — من اليوم
    [today, "10:00", 100_000],              // اليوم — كانت تسقط من «آخر ٧ أيام»
    [dayMinus(today, 1), "23:30", 7_000],   // أمس قبل منتصف الليل — من أمس
    [dayMinus(today, 6), "12:00", 3_000],   // آخر يومٍ داخل «٧ أيام»
    [dayMinus(today, 7), "12:00", 50_000],  // خارج «٧ أيام» داخل «٣٠»
    [dayMinus(today, 29), "12:00", 400],    // آخر يومٍ داخل «٣٠»
    [dayMinus(today, 30), "12:00", 9_999],  // خارج «٣٠»
    [monthStart, "00:10", 1_100],           // أوّلُ الشهر — داخل «هذا الشهر»
    [dayMinus(monthStart, 1), "23:50", 2_200], // آخرُ الشهر السابق — خارجه
  ];
  for (const [d, t, amt] of fixture) {
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,$2,$3,$4::timestamp)`, [pt.id, BR, amt, bg(d, t)]);
  }
  await q(`INSERT INTO expenses (branch_id, category, amount, expense_date, notes) VALUES ($1,'أخرى',500,$2,$3)`, [BR, today, MARK]);
  //  سجلُّ المريض مدفوعٌ بلا كلفة — لا يهمّ هنا؛ نقيس الوارد.
  const expect = (start: string) => fixture.filter(([d]) => d >= start && d <= today).reduce((s, [, , a]) => s + a, 0);

  try {
    const sent: string[] = [];
    const completer = (async (p: any): Promise<AiResult<string>> => { sent.push(p.system); return { ok: true, value: "ok" }; }) as any;
    const session = { userId: ACC, role: "branch_manager", isAdmin: false, branchId: BR, accessibleBranches: [BR],
      displayName: "محاسب", permissions: { canManageAccounting: true } };
    const out = await aiChat(resolveAiAccess({ session, branchName: "فرع اختبار اللقطة", scopeBranchId: BR }),
      [{ role: "user", content: "كم بلغت الإيرادات هذا الشهر؟" }], completer);
    same("أ. الوضعُ الماليّ", (out as any).value?.mode, "financial");
    const sys = sent[0] ?? "";
    const snap = JSON.parse(sys.slice(sys.indexOf("{", sys.indexOf("(snapshot)")), sys.lastIndexOf("}") + 1));
    const p = snap.periods;

    console.log("\n── ب. الفترات = جمعٌ مستقلٌّ بأيام بغداد ──");
    same("ب١. **اليوم** — ومنه دفعةُ ٠٠:٣٠ بغداد، لا دفعةُ ٢٣:٣٠ أمس",
      [p.today.start, p.today.end, p.today.revenue], [today, today, expect(today)]);
    same("ب٢. **هذا الشهر = من أوّل الشهر التقويميّ** — لا آخر ثلاثين يوماً",
      [p.monthToDate.start, p.monthToDate.end, p.monthToDate.revenue], [monthStart, today, expect(monthStart)]);
    same("ب٣. **آخر ٧ أيام — ومعها قبضُ اليوم كلُّه**",
      [p.last7Days.start, p.last7Days.revenue], [dayMinus(today, 6), expect(dayMinus(today, 6))]);
    same("ب٤. آخر ٣٠ يوماً", [p.last30Days.start, p.last30Days.revenue], [dayMinus(today, 29), expect(dayMinus(today, 29))]);
    same("ب٥. والمصاريفُ والصافي لليوم", [p.today.expenses, p.today.net], [500, expect(today) - 500]);

    console.log("\n── ج. = مصدرُ التقرير اليومي وصفحة المحاسبة ──");
    for (const [k, start] of [["today", today], ["monthToDate", monthStart], ["last7Days", dayMinus(today, 6)], ["last30Days", dayMinus(today, 29)]] as const) {
      const a = await storage.getAccountingSummary(BR, start, today, { baghdadDays: true });
      same(`ج. ${k} يطابق getAccountingSummary`, [p[k].revenue, p[k].salesValue, p[k].expenses, p[k].net],
        [a.totalPaid, a.totalRevenue, a.totalExpenses, a.netProfit]);
    }

    console.log("\n── د. التعليمات ──");
    check(sys.includes("periods.monthToDate") && sys.includes("لا آخرَ ثلاثين يوماً"),
      "د١. «هذا الشهر» يُوجَّه إلى الشهر التقويميّ");
    check(!sys.includes("todayCash") && !sys.includes("payments7d") && !sys.includes("invoices30d"),
      "د٢. ولا أثرَ لحقول اللقطة القديمة");
  } finally {
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = $1`, [ACC]);
  }
  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
