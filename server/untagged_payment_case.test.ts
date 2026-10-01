// البند ٣٥ — الدفعةُ بلا وسمٍ لا تُنسَب للأطراف تخميناً لمريضٍ له قسمان (§4.bg).
// قاعدة محلّية: `npm run test:untagged-payment-case`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) قبضُ الفاتورة يكتب دفعةً بلا وسم، فكان `resolveCaseId` يضعها في «القسم الأوّل» (الأطراف). الآن قسمُها من بنود
//     الفاتورة حين تكون كلُّها من قسمٍ واحد — بالرمز أو بالاسم العربيّ؛ والفاتورةُ المختلطة على حالها.
// (ب) مسحُ وسم دفعةٍ عند تعديلها كان يعيد نسبتَها تخميناً. الآن تبقى في حالتها.

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

const PORT = 6894;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-دفعة-بلا-وسم";
const BR = 1;
const ADMIN = 9977;
const S = { userId: ADMIN, role: "admin", isAdmin: true, branchId: BR, accessibleBranches: [BR],
  displayName: "المسؤول", permissions: { canManageAccounting: true, canAddPayments: true } };

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(S), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids}) OR entry_id IN (SELECT id FROM journal_entries WHERE created_by = ${ADMIN})`);
  await q(`DELETE FROM journal_entries WHERE created_by = ${ADMIN}`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM invoices WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function twoCasePatient(name: string) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,true,false,true,3000000,'new') RETURNING id`,
    [`${MARK} ${name}`, MARK, BR]);
  const [pros] = await q<{ id: number }>(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source)
    VALUES ($1,$2,'prosthetic',2000000,'manual') RETURNING id`, [p.id, BR]);
  const [phys] = await q<{ id: number }>(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost)
    VALUES ($1,$2,'physiotherapy',1000000) RETURNING id`, [p.id, BR]);
  return { id: p.id, pros: pros.id, phys: phys.id };
}
const caseOf = async (paymentId: number) =>
  (await q<{ case_id: number | null }>(`SELECT case_id FROM payments WHERE id = $1`, [paymentId]))[0]?.case_id ?? null;
const today = () => new Date().toISOString().split("T")[0];

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (${BR},'فرع اختبار الوسم') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_manage_accounting,can_add_payments)
           VALUES ($1,'untagged_admin','x','المسؤول','admin',$2,$3::jsonb,true,true,true)
           ON CONFLICT (id) DO UPDATE SET is_active=true`, [ADMIN, BR, JSON.stringify([BR])]);
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
    console.log("\n── أ. قبضُ الفاتورة ──");
    const invoice = async (pid: number, types: string[], paidNow: number) => {
      const items = types.map((t, i) => ({ description: `${MARK}-${i}`, serviceType: t, quantity: 1, unitPrice: 100_000, total: 100_000 }));
      const total = items.length * 100_000;
      return http("POST", "/api/invoices", { patientId: pid, branchId: BR, invoiceDate: today(),
        subtotal: total, discount: 0, total, items, applyPriorCredit: false, paidNow });
    };
    const payOf = async (invoiceId: number) =>
      (await q<{ id: number }>(`SELECT id FROM payments WHERE invoice_id = $1 ORDER BY id`, [invoiceId])).map((r) => r.id);

    const a = await twoCasePatient("أ");
    const r1 = await invoice(a.id, ["physiotherapy"], 100_000);
    same("أ١. الفاتورةُ تُنشأ مع قبضٍ فوريّ", r1.status, 200);
    const [p1] = await payOf(r1.body?.id);
    same("أ١. **فاتورةُ علاجٍ طبيعيّ ⟵ القبضُ في حالة العلاج الطبيعي لا الأطراف**", await caseOf(p1), a.phys);

    const r2 = await invoice(a.id, ["علاج طبيعي", "علاج طبيعي"], 0);
    const c2 = await http("POST", `/api/invoices/${r2.body?.id}/collect`, { amount: 150_000 });
    same("أ٢. القبضُ اللاحق (`/collect`) ينجح", c2.status, 200);
    const [p2] = await payOf(r2.body?.id);
    same("أ٢. **والاسمُ العربيّ للقسم كالرمز** ⟵ العلاج الطبيعي", await caseOf(p2), a.phys);

    const r3 = await invoice(a.id, ["prosthetic"], 100_000);
    const [p3] = await payOf(r3.body?.id);
    same("أ٣. فاتورةُ طرفٍ ⟵ حالة الأطراف", await caseOf(p3), a.pros);

    const r4 = await invoice(a.id, ["physiotherapy", "prosthetic"], 100_000);
    const [p4] = await payOf(r4.body?.id);
    same("أ٤. فاتورةٌ مختلطة ⟵ السلوكُ القائم بحرفه (لا جديدَ يُخترَع)", await caseOf(p4), a.pros);

    const r5 = await invoice(a.id, ["medical_support"], 100_000);
    const [p5] = await payOf(r5.body?.id);
    same("أ٥. قسمٌ ليس للمريض حالتُه ⟵ السلوكُ القائم", await caseOf(p5), a.pros);

    console.log("\n── ب. مسحُ الوسم عند التعديل ──");
    const b = await twoCasePatient("ب");
    const pay = await storage.createPayment({ patientId: b.id, branchId: BR, amount: 50_000, paymentTreatmentType: "علاج طبيعي" } as any);
    same("ب١. دفعةٌ موسومةٌ علاجاً طبيعيّاً ⟵ حالتُه", await caseOf(pay.id), b.phys);
    await storage.updatePayment(pay.id, { paymentTreatmentType: null });
    same("ب٢. **مسحُ الوسم لا ينقلها** — تبقى في العلاج الطبيعي", await caseOf(pay.id), b.phys);
    const pay2 = await storage.createPayment({ patientId: b.id, branchId: BR, amount: 70_000, paymentTreatmentType: "أطراف صناعية" } as any);
    await storage.updatePayment(pay2.id, { paymentTreatmentType: "" });
    same("ب٣. **ودفعةُ أطرافٍ يُمسَح وسمُها تبقى في الأطراف** (كانت تُنقَل إلى العلاج الطبيعي)", await caseOf(pay2.id), b.pros);
    await storage.updatePayment(pay2.id, { paymentTreatmentType: "علاج طبيعي" });
    same("ب٤. وتغييرُ الوسم إلى قسمٍ آخر ما زال ينقلها كما كان", await caseOf(pay2.id), b.phys);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = $1`, [ADMIN]);
    await q(`DELETE FROM system_users WHERE id = $1`, [ADMIN]).catch(() => {});
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
