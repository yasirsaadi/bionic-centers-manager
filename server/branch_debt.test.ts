// البند ١٢ — الدَّينُ على الفرع الذي عليه الدين (§4.bc). قاعدة محلّية: `npm run test:branch-debt`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// قاعدةُ المالك: «الدينُ يُسدَّد في الفرع الذي عليه الدين». فكلفةُ المريض على فرعٍ = ما قُيِّد له في الدفتر في ذلك الفرع،
// ومدفوعُه = ما دُفع فيه. وكان الدَّينُ كلُّه يُنسَب لفرع التسجيل والدفعُ لفرع القبض (حالةُ زين العابدين وليد):
// (١) «الديون» و«نسبة التحصيل» لكلّ فرع، (٢) وقائمةُ مدينِي الفرع — بالقاعدة نفسها ومن مصدرٍ واحد،
// (٣) وما لا يغطّيه الدفتر يبقى على فرع التسجيل، (٤) ومجموعُ الفروع = الملفّاتُ كلُّها كما كان.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { executeTool } from "./ai/tools/registry";
import { resolveAiAccess } from "./ai/access";

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

const PORT = 6889;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-دين-الفرع";
const A = 10, B = 11;            // A مثلُ كربلاء (فرعُ التسجيل) · B مثلُ ذي قار (فرعُ الخدمة والدفع)
const ADMIN = 9996, ACC_A = 9997, ACC_B = 9998;
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
const cost = (pid: number, br: number, amt: number) =>
  q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,$2,$3,'assign_manufacturing')`, [pid, br, amt]);
const pay = (pid: number, br: number, amt: number) =>
  q(`INSERT INTO payments (patient_id, branch_id, amount, date) VALUES ($1,$2,$3, now())`, [pid, br, amt]);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (${A},'فرع التسجيل'),(${B},'فرع الخدمة') ON CONFLICT DO NOTHING`);
  for (const [id, role, br] of [[ADMIN, "admin", A], [ACC_A, "branch_manager", A], [ACC_B, "branch_manager", B]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients,can_manage_accounting)
             VALUES ($1,$2,'x','مستخدم',$3,$4,$5::jsonb,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               is_active=true, can_view_patients=true, can_manage_accounting=true`, [id, `bd_u${id}`, role, br, JSON.stringify([br])]);
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
    //  زين: مسجَّلٌ في A، خدمتُه ودَينُه في B، ودفع ٢٥٠ ألفاً في B.
    const Z = await mk("زين", A, 1_000_000); await cost(Z, B, 1_000_000); await pay(Z, B, 250_000);
    //  هدى: كلُّها في A.
    const H = await mk("هدى", A, 500_000); await cost(H, A, 500_000); await pay(H, A, 100_000);
    //  ملفٌّ قديم كلفتُه بلا قيدٍ في الدفتر — يبقى على فرع التسجيل.
    const L = await mk("قديم", A, 300_000);
    //  مريم: قسمٌ في كلّ فرع، وسدّدت كلاً في فرعه.
    const M = await mk("مريم", A, 300_000); await cost(M, A, 200_000); await cost(M, B, 100_000);
    await pay(M, A, 200_000); await pay(M, B, 100_000);

    const mine = (rows: any[]) => rows
      .filter((d: any) => String(d.patient?.name ?? "").startsWith(MARK))
      .map((d: any) => [d.patient.name.replace(`${MARK} `, ""), d.totalCost, d.totalPaid, d.remaining]);

    console.log("── أ. قائمة المدينين ──");
    const dA = await http(`/api/accounting/debtors`, S.accA);
    same("أ١. **فرعُ التسجيل: هدى والملفُّ القديم — لا زين** (دَينُه ليس عليه)",
      [dA.status, mine(dA.body)], [200, [["هدى", 500000, 100000, 400000], ["قديم", 300000, 0, 300000]]]);
    same("أ٢. **فرعُ الخدمة: زين بما بقي عليه هناك**",
      mine((await http(`/api/accounting/debtors`, S.accB)).body), [["زين", 1000000, 250000, 750000]]);
    same("أ٣. ومريم المسدِّدةُ في الفرعين في أيٍّ منهما",
      [mine(dA.body).some((r: any) => r[0] === "مريم"), mine((await http(`/api/accounting/debtors`, S.accB)).body).some((r: any) => r[0] === "مريم")],
      [false, false]);
    same("أ٤. والمسؤولُ على كلّ الفروع: الملفُّ كلُّه مرّةً واحدة",
      mine((await http(`/api/accounting/debtors`, S.admin)).body),
      [["زين", 1000000, 250000, 750000], ["هدى", 500000, 100000, 400000], ["قديم", 300000, 0, 300000]]);
    same("أ٥. والمسؤولُ باختيار فرع الخدمة = محاسبُه",
      mine((await http(`/api/accounting/debtors?branchId=${B}`, S.admin)).body), [["زين", 1000000, 250000, 750000]]);

    console.log("\n── ب. «الديون» و«نسبة التحصيل» ──");
    const sA = await storage.getAccountingSummary(A), sB = await storage.getAccountingSummary(B);
    same("ب١. **فرعُ التسجيل: ٧٠٠ ألف (هدى ٤٠٠ + القديم ٣٠٠) — لا مليونُ زين**", sA.totalRemaining, 700000);
    same("ب٢. **فرعُ الخدمة: ٧٥٠ ألف — لا سالب**", sB.totalRemaining, 750000);
    same("ب٣. ونسبةُ التحصيل لكلٍّ بماله: ٣٠٠/١٠٠٠ · ٣٥٠/١١٠٠",
      [sA.collectionRate, sB.collectionRate], [30, Math.round((350000 / 1100000) * 100)]);
    const balA = await storage.getPatientBranchBalances(A), balB = await storage.getPatientBranchBalances(B);
    const fixtureIds = [Z, H, L, M];
    const sumOf = (rows: any[], k: "cost" | "paid") => rows.filter((r) => fixtureIds.includes(r.patientId)).reduce((s, r) => s + r[k], 0);
    same("ب٤. **ومجموعُ الفرعين = الملفّاتُ كلُّها** (كلفةً ٢,١٠٠,٠٠٠ ومدفوعاً ٦٥٠,٠٠٠)",
      [sumOf(balA, "cost") + sumOf(balB, "cost"), sumOf(balA, "paid") + sumOf(balB, "paid")], [2100000, 650000]);
    same("ب٥. **والقائمةُ والملخّصُ من مصدرٍ واحد**: مجموعُ المدينين = الديون حين لا رصيدَ دائن",
      [mine(dA.body).reduce((s: number, r: any) => s + r[3], 0), mine((await http(`/api/accounting/debtors`, S.accB)).body).reduce((s: number, r: any) => s + r[3], 0)],
      [sA.totalRemaining, sB.totalRemaining]);

    console.log("\n── ج. الرصيدُ الدائن (البند ١٦) ──");
    //  رنا: كلفتُها ١٠٠ ألف ودفعت ٣٠٠ ألف — لها ٢٠٠ ألف تحتاج تسوية.
    const Cr = await mk("رنا", A, 100_000); await cost(Cr, A, 100_000); await pay(Cr, A, 300_000);
    const sA2 = await storage.getAccountingSummary(A);
    same("ج١. **«الديون» لا تنقص برصيد رنا** — ما على المدينين وحدهم (٧٠٠ ألف كما كان)", sA2.totalRemaining, 700000);
    same("ج٢. **ورصيدُها رقمٌ ظاهر مستقلّ**", sA2.totalCredits, 200000);
    const dA2 = await http(`/api/accounting/debtors`, S.accA);
    same("ج٣. **و«الديون» = مجموعُ قائمة المدينين** ولو وُجد رصيدٌ دائن",
      mine(dA2.body).reduce((s: number, r: any) => s + r[3], 0), sA2.totalRemaining);
    const [{ patient_code: crCode }] = await q(`SELECT patient_code FROM patients WHERE id = $1`, [Cr]);
    const fin = await executeTool(resolveAiAccess({ session: S.accA, scopeBranchId: A }), "patient_finance", { patientCode: crCode });
    same("ج٤. **والمساعدُ يقول رصيدَها** — لا «صفر» وحده",
      [fin.ok, (fin as any).data?.remaining, (fin as any).data?.creditBalance], [true, 0, 200000]);
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
