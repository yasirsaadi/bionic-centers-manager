// البند ١٥ — ربحيةُ كلّ قسمٍ بماله وحده (§4.be). قاعدة محلّية: `npm run test:service-profitability`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// كانت «ربحية الخدمات» تأخذ مرضى كلّ قسمٍ بعلَم الملفّ ثمّ كلفةَ الملفّ كلَّها وكلَّ دفعاته، فمريضُ القسمين في الاثنين كاملاً
// ومجموعُ البطاقات ضعفُ الحقيقة. فهنا: مالُ كلّ قسمٍ وحده، وصفُّ «غير مصنَّف»، ومجموعُها = الإجماليّ بالدينار.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

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

const PORT = 6897;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-ربحية-الأقسام";
const A = 13, B = 14;
const ADMIN = 9986, ACC_A = 9987, ACC_B = 9988;
const perms = { canViewPatients: true, canManageAccounting: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [A, B], displayName: "adm", permissions: perms },
  accA: { userId: ACC_A, role: "branch_manager", isAdmin: false, branchId: A, accessibleBranches: [A], displayName: "محاسب أ", permissions: perms },
  accB: { userId: ACC_B, role: "branch_manager", isAdmin: false, branchId: B, accessibleBranches: [B], displayName: "محاسب ب", permissions: perms },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(path: string, session: any) {
  const res = await fetch(BASE + path, {
    headers: { "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function mk(label: string, branchId: number, totalCost: number) {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,true,false,false,$4,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, totalCost]);
  return r.id;
}
const mkCase = async (pid: number, br: number, type: string) =>
  (await q<{ id: number }>(`INSERT INTO patient_cases (patient_id, branch_id, case_type, status) VALUES ($1,$2,$3,'active') RETURNING id`, [pid, br, type]))[0].id;
const cost = (pid: number, br: number, caseId: number | null, amt: number, source = "assign_manufacturing") =>
  q(`INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source) VALUES ($1,$2,$3,$4,$5)`, [pid, br, caseId, amt, source]);
const pay = (pid: number, br: number, caseId: number | null, amt: number) =>
  q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, date) VALUES ($1,$2,$3,$4, now())`, [pid, br, caseId, amt]);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (${A},'فرع الربحية'),(${B},'فرع آخر للربحية') ON CONFLICT DO NOTHING`);
  for (const [id, role, br] of [[ADMIN, "admin", A], [ACC_A, "branch_manager", A], [ACC_B, "branch_manager", B]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_manage_accounting)
             VALUES ($1,$2,'x','مستخدم',$3,$4,$5::jsonb,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_view_patients=true, can_manage_accounting=true`, [id, `sp_u${id}`, role, br, JSON.stringify([br])]);
  }
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
    //  سعد: طرفٌ ٢,٠٠٠,٠٠٠ (دفع له ٨٠٠ ألف) وعلاجٌ طبيعي ٣٠٠ ألف (دفع له ٢٠٠ ألف)، ودفعةٌ قديمة ٥٠ ألفاً بلا قسم.
    const X = await mk("سعد", A, 2_300_000);
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id = $1`, [X]);
    const xPro = await mkCase(X, A, "prosthetic"), xPhy = await mkCase(X, A, "physiotherapy");
    await cost(X, A, xPro, 2_000_000); await pay(X, A, xPro, 800_000);
    await cost(X, A, xPhy, 300_000, "physio_pricing"); await pay(X, A, xPhy, 200_000);
    await pay(X, A, null, 50_000);
    //  ليلى: مسندٌ ٥٠٠ ألف بلا دفع.
    const Y = await mk("ليلى", A, 500_000);
    await q(`UPDATE patients SET is_amputee = false, is_medical_support = true WHERE id = $1`, [Y]);
    const ySup = await mkCase(Y, A, "medical_support"); await cost(Y, A, ySup, 500_000);
    //  صيانةٌ قديمة بلا حالة — مالُ أجهزةٍ لا يُعرف قسمُه.
    await cost(X, A, null, 90_000, "maintenance");
    //  وفرعٌ آخر: لا يدخل حسابَ الفرع الأوّل.
    const Z = await mk("فرعٌ آخر", B, 700_000); const zPro = await mkCase(Z, B, "prosthetic");
    await cost(Z, B, zPro, 700_000); await pay(Z, B, zPro, 700_000);

    const r = await http(`/api/accounting/profitability-by-service`, S.accA);
    const rows = (r.body ?? []).map((x: any) => [x.serviceType, x.patientCount, x.totalRevenue, x.totalPaid, x.remaining, x.collectionRate]);
    console.log("── أ. مالُ كلّ قسمٍ وحده ──");
    same("أ١. **الأطراف ماله وحده** — لا كلفةَ ملفّ سعد كلَّها",
      rows.find((x: any) => x[0] === "prosthetic"), ["prosthetic", 1, 2000000, 800000, 1200000, 40]);
    same("أ٢. **والعلاجُ الطبيعي ماله وحده** — ٣٠٠ ألف لا ٢,٣٠٠,٠٠٠",
      rows.find((x: any) => x[0] === "physiotherapy"), ["physiotherapy", 1, 300000, 200000, 100000, 67]);
    same("أ٣. والمساند", rows.find((x: any) => x[0] === "medical_support"), ["medical_support", 1, 500000, 0, 500000, 0]);
    same("أ٤. **والقديمُ غيرُ المصنَّف صفٌّ ظاهر** — الصيانةُ القديمة والدفعةُ بلا قسم",
      rows.find((x: any) => x[0] === "unclassified"), ["unclassified", 0, 90000, 50000, 40000, 56]);
    const acct = await storage.getAccountingSummary(A);
    same("أ٥. **ومجموعُ البطاقات = إجماليُّ الفرع بالدينار** (لا ضعفه)",
      [rows.reduce((s: number, x: any) => s + x[2], 0), rows.reduce((s: number, x: any) => s + x[3], 0)],
      [acct.totalRevenue, acct.totalPaid]);
    same("أ٦. وأرقامُ الفرع الأوّل وحده — الفرعُ الآخر خارجها", [acct.totalRevenue, acct.totalPaid], [2890000, 1050000]);
    const rB = await http(`/api/accounting/profitability-by-service`, S.accB);
    same("أ٧. والفرعُ الآخر بماله", (rB.body ?? []).find((x: any) => x.serviceType === "prosthetic")?.totalRevenue, 700000);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`, [[ADMIN, ACC_A, ACC_B]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, ACC_A, ACC_B]]);
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
