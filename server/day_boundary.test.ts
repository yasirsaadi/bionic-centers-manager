// البند ١٣ — تعريفٌ واحد لليوم في التقارير المالية: يومُ بغداد، والطرفان شاملان (§4.bd).
// قاعدة محلّية: `npm run test:day-boundary`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// كانت ثلاثةُ تعريفات: يومُ بغداد (التقرير اليومي والمساعد)، ويومُ UTC أي ٠٣:٠٠–٠٣:٠٠ بغداد (ملخّص المحاسبة ومقارنة الفروع
// والاتجاه الشهري)، و«حتى منتصف ليل UTC ليوم النهاية» فيسقط يومُ النهاية كلُّه (قائمتا الدفعات والزيارات، وتقريرُ المساعد
// الشهري وتدقيقُه). فهنا دفعاتٌ وزياراتٌ على حدود اليوم، وكلُّ الأبواب تعطي الرقمَ نفسَه.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage, baghdadDayBounds } from "./storage";

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

const PORT = 6893;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-حدود-اليوم";
const BR = 12;
const ACC = 9999;
const S = { userId: ACC, role: "branch_manager", isAdmin: false, branchId: BR, accessibleBranches: [BR],
  displayName: "محاسب", permissions: { canViewPatients: true, canManageAccounting: true, canViewReports: true } };

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(path: string) {
  const res = await fetch(BASE + path, {
    headers: { "x-test-session": Buffer.from(JSON.stringify(S), "utf8").toString("base64") },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
//  ساعةُ بغداد ⟵ `timestamp` بلا منطقة (UTC كما تخزّنه الشيفرة).
const bg = (day: string, hhmm: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 3, mi)).toISOString().replace("T", " ").replace("Z", "");
};
const D0 = "2001-05-09", D1 = "2001-05-10", D2 = "2001-05-11", D3 = "2001-05-12";

async function main() {
  same("أ١. الحدود: منتصفُ ليل بغداد، والنهايةُ حصريّةٌ عند منتصف ليل اليوم التالي",
    [baghdadDayBounds(D1, D2).start?.toISOString(), baghdadDayBounds(D1, D2).endExclusive?.toISOString()],
    ["2001-05-09T21:00:00.000Z", "2001-05-11T21:00:00.000Z"]);

  await q(`INSERT INTO branches (id,name) VALUES (${BR},'فرع اختبار اليوم') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_manage_accounting,can_view_reports)
           VALUES ($1,'dayb_acc','x','محاسب','branch_manager',$2,$3::jsonb,true,true,true,true)
           ON CONFLICT (id) DO UPDATE SET branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
             can_view_patients=true, can_manage_accounting=true, can_view_reports=true`, [ACC, BR, JSON.stringify([BR])]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    const [p] = await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
         is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
       VALUES ($1,'07701234567',$2,'40','170','70','x',$3,true,false,false,0,'new') RETURNING id`, [`${MARK} مريض`, MARK, BR]);
    //  [يومُ بغداد، الساعة، المبلغ]
    const fixture: [string, string, number][] = [
      [D0, "23:30", 1_000],     // قبل الفترة بنصف ساعة
      [D1, "00:30", 20_000],    // بعد منتصف الليل — كان يقع في D0 بتعريف UTC
      [D1, "11:00", 300_000],
      [D2, "02:30", 4_000],     // قبل ٠٣:٠٠ — كان يقع في D1 بتعريف UTC
      [D2, "11:00", 50_000],    // يومُ النهاية — كان يسقط من القائمتين
      [D3, "00:30", 600_000],   // بعد الفترة
    ];
    for (const [d, t, amt] of fixture) {
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,$2,$3,$4::timestamp)`, [p.id, BR, amt, bg(d, t)]);
      await q(`INSERT INTO visits (patient_id, branch_id, visit_date, details) VALUES ($1,$2,$3::timestamp,'جلسة')`, [p.id, BR, bg(d, t)]);
    }
    const expect = (from: string, to: string) => fixture.filter(([d]) => d >= from && d <= to);
    const sum = (rows: [string, string, number][]) => rows.reduce((s, r) => s + r[2], 0);

    console.log("\n── ب. الفترة D1–D2 ──");
    const truth = sum(expect(D1, D2));   // 374,000
    same("ب١. **ملخّص المحاسبة بلا خيار = يومُ بغداد**", (await storage.getAccountingSummary(BR, D1, D2)).totalPaid, truth);
    same("ب٢. **قائمةُ الدفعات تشمل يومَ النهاية**",
      (await storage.getAllPayments(BR, D1, D2)).reduce((s, r) => s + r.amount, 0), truth);
    same("ب٣. وقائمةُ الزيارات بالحدود نفسِها", (await storage.getAllVisits(BR, D1, D2)).length, expect(D1, D2).length);
    const sumApi = await http(`/api/accounting/summary?startDate=${D1}&endDate=${D2}`);
    const payApi = await http(`/api/accounting/payments?startDate=${D1}&endDate=${D2}`);
    same("ب٤. **ونقطتا صفحة المحاسبة (الملخّص والقائمة) = التقرير اليومي**",
      [sumApi.body?.totalPaid, (payApi.body ?? []).reduce((s: number, r: any) => s + r.amount, 0),
       (await http(`/api/reports/daily-patient-report?from=${D1}&to=${D2}`)).body?.financial?.rollups?.grandTotal?.paid],
      [truth, truth, truth]);

    console.log("\n── ج. يومٌ واحد ──");
    for (const d of [D1, D2]) {
      same(`ج. ${d}: الملخّصُ والقائمةُ والتقريرُ يومَ بغداد`,
        [(await storage.getAccountingSummary(BR, d, d)).totalPaid,
         (await storage.getAllPayments(BR, d, d)).reduce((s, r) => s + r.amount, 0),
         (await http(`/api/reports/daily-patient-report?date=${d}`)).body?.financial?.rollups?.grandTotal?.paid],
        [sum(expect(d, d)), sum(expect(d, d)), sum(expect(d, d))]);
    }
    same("ج٣. **والقديمُ صراحةً (`baghdadDays: false`) يبقى يومَ UTC** — الفرقُ هو ما أُصلح",
      (await storage.getAccountingSummary(BR, D1, D1, { baghdadDays: false })).totalPaid, 300_000 + 4_000);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = $1`, [ACC]);
    await q(`DELETE FROM system_users WHERE id = $1`, [ACC]);
    httpServer.close();
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
