// المراجعةُ الشاملة — الدفعةُ ج: اتّساقُ التقارير (§4.bo). حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:review-batch-c`.
//
// (أ) بريدُ الدخل اليومي ونقطةُ الكرون: دفعةٌ وتسجيلٌ الساعة الخامسة فجراً بتوقيت بغداد يُحسبان على يومهما.
// (ب) «اليوم» في صفحة الإيرادات يبدأ منتصفَ ليل بغداد.
// (ج) إيرادُ اليوم وزياراتُه في الرئيسية — وزياراتُ المساعد — بلا مرضى السلّة.
// (د) «المتبقّي» في الرئيسية وصفحة الإيرادات والبريد الليلي = «الديون»: المدينون وحدهم، بفرع القيد.

import { getDailyIncomeData } from "./daily_income";
import { getNightlyReportData } from "./backup";
import { getOperationalSummary } from "./ai/tools/reports";
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

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

const PORT = 6953;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مراجعة-ج";
const ADMIN = 9961, RECV = 9962, ACCT = 9963, DOC = 9964;
const ALL_USERS = [ADMIN, RECV, ACCT, DOC];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول",
    permissions: { canViewPatients: true, canEditPatients: true } },
  //  استقبالٌ بكامل صلاحيات المريض والمال — لكن بلا «إدارة المحاسبة».
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استعلامات",
    permissions: { canViewPatients: true, canEditPatients: true, canViewPayments: true } },
  //  محاسبُ فرع ١: «إدارة المحاسبة» على فرعه وحده.
  acct: { userId: ACCT, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "محاسب",
    permissions: { canViewPatients: true, canManageAccounting: true, canViewPayments: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "طبيب",
    permissions: { canViewPatients: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}



async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function mkPatient(label: string, branchId: number, total: number, createdAt?: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, created_at)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,$4, COALESCE($5::timestamp, NOW())) RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, total, createdAt ?? null]);
  return r[0].id;
}
/** «الآن» بالتوقيت الذي تحفظه القاعدة (UTC ساذج)، و«منتصفُ ليل بغداد اليوم» به. */
function baghdadMidnightTodayNaiveUtc(): Date {
  const now = new Date();
  const b = new Date(now.getTime() + 3 * 3600 * 1000);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()) - 3 * 3600 * 1000);
}
const naive = (d: Date) => d.toISOString().replace("T", " ").replace("Z", "");

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  process.env.CRON_API_KEY = "rvc-test-key";
  //  الصلاحياتُ تُقرأ حيّاً من صفّ الحساب (§4.ar البند ٧) — فالأعلامُ هنا هي ما يُختبَر.
  for (const [id, role, branches, flags] of [
    [ADMIN, "admin", [1, 2], "true,true,true,false"],
    [RECV, "reception", [1], "true,true,true,false"],
    [ACCT, "branch_manager", [1], "true,false,true,true"],
    [DOC, "doctor", [1], "true,false,false,false"],
  ] as any[]) {
    const [vp, ep, vpay, acct] = String(flags).split(",");
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
               can_view_patients, can_edit_patients, can_view_payments, can_manage_accounting)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7,$8,$9,$10)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_view_patients=EXCLUDED.can_view_patients, can_edit_patients=EXCLUDED.can_edit_patients,
               can_view_payments=EXCLUDED.can_view_payments, can_manage_accounting=EXCLUDED.can_manage_accounting`,
      [id, `rvc_u${id}`, String(id), role, branches[0], JSON.stringify(branches), vp === "true", ep === "true", vpay === "true", acct === "true"]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));

  try {
    console.log("\n── أ. بريدُ الدخل اليومي ──");
    {
      //  ٢٠٣١-٠٣-١٠ الساعة ٠٢:٠٠ UTC = الخامسة فجراً بتوقيت بغداد من اليوم نفسِه.
      const pid = await mkPatient("أ", 1, 0, "2031-03-10 02:00:00");
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,1,77000,'2031-03-10 02:00:00')`, [pid]);
      const d10 = await getDailyIncomeData("2031-03-10"), d09 = await getDailyIncomeData("2031-03-09");
      same("أ١. **الدفعةُ على يومها**", d10.totals.totalIncome, 77000);
      same("أ٢. **لا على اليوم السابق**", d09.totals.totalIncome, 0);
      same("أ٣. والتسجيلُ على يومه", d10.totals.newPatients, 1);
      const cron = await http("GET", "/api/cron/daily-income?key=rvc-test-key&date=2031-03-10", {});
      same("أ٤. ونقطةُ الكرون مثلُه", cron.body?.totals?.totalIncome ?? cron.body?.grandIncome, 77000);
    }

    console.log("\n── ب. «اليوم» في صفحة الإيرادات ──");
    {
      const pid = await mkPatient("ب", 1, 0);
      const at = new Date(Math.min(baghdadMidnightTodayNaiveUtc().getTime() + 60_000, Date.now() - 1000));
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,1,33000,$2::timestamp)`, [pid, naive(at)]);
      const r = await http("GET", "/api/reports/all-branches?daily=true", S.admin);
      same("ب١. **دفعةُ ما بعد منتصف ليل بغداد على «اليوم»**", r.body?.[1]?.paid ?? r.body?.["1"]?.paid, 33000);
      //  والتكملة: دفعةٌ قبل منتصف ليل بغداد بدقيقة ليست من «اليوم». الفحصان معاً يُمسكان الخطأ في كلّ ساعة —
      //  الأوّلُ بعد الثالثة فجراً بتوقيت بغداد، والثاني قبلها (حين يتطابق اليومان صدفةً بعد منتصف الليل).
      const before = new Date(baghdadMidnightTodayNaiveUtc().getTime() - 60_000);
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,1,44000,$2::timestamp)`, [pid, naive(before)]);
      const r2 = await http("GET", "/api/reports/all-branches?daily=true", S.admin);
      same("ب٢. **ودفعةُ ما قبله بدقيقة ليست من «اليوم»**", r2.body?.[1]?.paid ?? r2.body?.["1"]?.paid, 33000);
      await q(`DELETE FROM payments WHERE patient_id=$1`, [pid]);
    }

    console.log("\n── ج. مرضى السلّة خارج إيراد اليوم وزياراته ──");
    {
      const pid = await mkPatient("ج", 1, 0);
      await q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,1,250000,NOW())`, [pid]);
      await q(`INSERT INTO visits (patient_id, branch_id, visit_date) VALUES ($1,1,NOW())`, [pid]);
      const before = await http("GET", "/api/reports/daily", S.admin);
      same("ج١. قبل السلّة: الدفعةُ في إيراد اليوم", before.body?.paid, 250000);
      const del = await http("DELETE", `/api/patients/${pid}`, S.admin, { reason: "ملف مكرر" });
      check(del.status < 300, "ج١ب. نُقل المريضُ إلى السلّة بالباب الحقيقيّ", `${del.status} ${JSON.stringify(del.body).slice(0, 200)}`);
      const after = await http("GET", "/api/reports/daily", S.admin);
      same("ج٢. **بعد السلّة: لا إيراد**", after.body?.paid, 0);
      same("ج٣. **ولا زيارة**", after.body?.totalVisits, 0);
      const today = new Date(Date.now() + 3 * 3600 * 1000).toISOString().slice(0, 10);
      const ops = await getOperationalSummary({ operationalBranches: null, isAdmin: true, requestedBranchId: null,
        start: today, end: today, compare: false });
      same("ج٤. **وزياراتُ المساعد مثلُها**", ops.visits, 0);
      await q(`DELETE FROM visits WHERE patient_id=$1`, [pid]);
      await q(`DELETE FROM payments WHERE patient_id=$1`, [pid]);
      await q(`DELETE FROM patients WHERE id=$1`, [pid]);
    }

    console.log("\n── د. «المتبقّي» = «الديون» ──");
    {
      //  أ مدينٌ بـ٥٠٠ ألف في بغداد؛ ب دفع زيادةً ٢٠٠ ألف في بغداد؛ ج مسجّلٌ في بغداد وخدمتُه ودفعُه في ذي قار.
      const a = await mkPatient("د-أ", 1, 500000);
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,1,500000,'opening')`, [a]);
      const b = await mkPatient("د-ب", 1, 100000);
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,1,100000,'opening')`, [b]);
      await q(`INSERT INTO payments (patient_id, branch_id, amount) VALUES ($1,1,300000)`, [b]);
      const c = await mkPatient("د-ج", 1, 1000000);
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,2,1000000,'opening')`, [c]);
      await q(`INSERT INTO payments (patient_id, branch_id, amount) VALUES ($1,2,1000000)`, [c]);

      const o = await http("GET", "/api/reports/overall", S.admin);
      same("د١. **الرئيسية: المتبقّي ٥٠٠ ألف لا ٣٠٠** (الدائنُ لا يُطرح)", o.body?.remaining, 500000);
      const all = await http("GET", "/api/reports/all-branches", S.admin);
      same("د٢. **صفحةُ الإيرادات: بغداد ٥٠٠ ألف**", all.body?.[1]?.remaining ?? all.body?.["1"]?.remaining, 500000);
      same("د٣. **وذي قار صفر** (لا سالبَ مليون)", all.body?.[2]?.remaining ?? all.body?.["2"]?.remaining, 0);
      const n = await getNightlyReportData();
      same("د٤. **والبريدُ الليلي مثلُها**", n.totals.remaining, 500000);
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص الدفعة ج نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
