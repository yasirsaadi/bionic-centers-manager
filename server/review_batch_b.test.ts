// المراجعةُ الشاملة — الدفعةُ ب: المحاسبة (§4.bo). حيّاً على Postgres.
// قاعدة محلّية: `npm run test:review-batch-b`.
//
// (أ) ترقيمُ القيود: عشرون قيداً متزامناً كلُّها تُكتب بأرقامٍ فريدة، وحذفُ قيدٍ من الوسط لا يُعيد رقماً مستعملاً.
// (ب) «تعديل المريض» لمريضٍ له قسمٌ مغلقٌ يحمل كلفة: الفرقُ وحده ينتقل إلى القسم المفتوح، وقيدُه يُنسب إليه؛
//     ولمريضٍ بقسمٍ واحد تبقى الكتابةُ فوق كما كانت.
// (ج) سحبُ نوع قسمٍ: قيودُ دفتره تنتقل مع كلفته إلى القسم الباقي.

import * as ledger from "./accounting/ledger";
import { storage } from "./storage";
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

const PORT = 6952;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مراجعة-ب";
const ADMIN = 9991, RECV = 9992, ACCT = 9993, DOC = 9994;
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
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE description = '${MARK}')`);
  await q(`DELETE FROM journal_entries WHERE description = '${MARK}'`);
  await q(`DELETE FROM chart_of_accounts WHERE description = '${MARK}'`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(label: string, total: number, flags = "false,false,true") {
  const [amp, sup, phy] = flags.split(",").map((x) => x === "true");
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost,
       is_amputee, is_medical_support, is_physiotherapy)
     VALUES ($1,'07701234567',$2,'40','170','70','x',1,$3,$4,$5,$6) RETURNING id`,
    [`${MARK} ${label}`, MARK, total, amp, sup, phy]);
  return r[0].id;
}
async function mkCase(pid: number, type: string, cost: number, status = "active", source = "auto") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,$3,$4,$5) RETURNING id`, [pid, type, cost, source, status]);
  return r[0].id;
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
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
      [id, `rvb_u${id}`, String(id), role, branches[0], JSON.stringify(branches), vp === "true", ep === "true", vpay === "true", acct === "true"]);
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
    console.log("\n── أ. ترقيمُ القيود ──");
    {
      const acc = await q<{ id: number }>(
        `INSERT INTO chart_of_accounts (account_code, account_name_ar, account_type, normal_balance, description)
         VALUES ('RVB-1','صندوق اختبار','asset','debit',$1),('RVB-2','إيراد اختبار','revenue','credit',$1) RETURNING id`, [MARK]);
      const mk = () => ledger.createJournalEntry({
        entryDate: "2031-07-15", branchId: 1, description: MARK,
        lines: [{ accountId: acc[0].id, debit: 1000 }, { accountId: acc[1].id, credit: 1000 }],
      } as any);
      const res = await Promise.allSettled(Array.from({ length: 20 }, mk));
      const ok = res.filter((r) => r.status === "fulfilled").length;
      same("أ١. **عشرون قيداً متزامناً — كلُّها كُتبت**", ok, 20);
      const nums = (await q<{ entry_number: string }>(
        `SELECT entry_number FROM journal_entries WHERE description = $1 ORDER BY entry_number`, [MARK])).map((r) => r.entry_number);
      same("أ٢. بأرقامٍ فريدة متتالية", nums.length === 20 && new Set(nums).size === 20 && nums[19] === "JE-203107-0020", true);
      await q(`DELETE FROM journal_lines WHERE entry_id = (SELECT id FROM journal_entries WHERE entry_number = 'JE-203107-0005')`);
      await q(`DELETE FROM journal_entries WHERE entry_number = 'JE-203107-0005'`);
      const e = await mk();
      same("أ٣. **وحذفُ قيدٍ من الوسط لا يُعيد رقماً مستعملاً**", (e as any).entry_number ?? (e as any).entryNumber, "JE-203107-0021");
    }

    console.log("\n── ب. «تعديل المريض» مع قسمٍ مغلق ──");
    {
      const pid = await mkPatient("ب١", 3500000, "true,false,true");
      const pros = await mkCase(pid, "prosthetic", 3000000, "closed");
      const phys = await mkCase(pid, "physiotherapy", 500000, "active");
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,1,3500000,'opening')`, [pid]);
      const r = await http("PUT", `/api/patients/${pid}`, S.admin, { totalCost: 3600000 });
      check(r.status < 300, "ب١. الحفظُ ينجح", `${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      const cs = await q<{ id: number; cost: number }>(`SELECT id, cost FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [pid]);
      same("ب٢. **الطرفُ المغلق يبقى بكلفته**", cs.find((c) => c.id === pros)?.cost, 3000000);
      same("ب٣. **والعلاجُ يأخذ الفرقَ وحده**", cs.find((c) => c.id === phys)?.cost, 600000);
      const ce = await q<{ case_id: number }>(`SELECT case_id FROM cost_entries WHERE patient_id=$1 AND amount=100000`, [pid]);
      same("ب٤. وقيدُ الفرق منسوبٌ إلى العلاج", ce[0]?.case_id, phys);

      const p2 = await mkPatient("ب٢", 1000000);
      const c2 = await mkCase(p2, "physiotherapy", 0, "active");
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source) VALUES ($1,1,1000000,'opening')`, [p2]);
      await http("PUT", `/api/patients/${p2}`, S.admin, { totalCost: 1200000 });
      same("ب٥. ومريضٌ بقسمٍ واحد: الكتابةُ فوق كما كانت (تشفي البطاقة القديمة)",
        (await q(`SELECT cost FROM patient_cases WHERE id=$1`, [c2]))[0].cost, 1200000);
    }

    console.log("\n── ج. سحبُ نوع قسم ──");
    {
      const pid = await mkPatient("ج", 1500000, "true,false,true");
      const pros = await mkCase(pid, "prosthetic", 1000000, "active", "manual");
      const phys = await mkCase(pid, "physiotherapy", 500000, "active", "auto");
      await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id) VALUES ($1,1,1000000,'x',$2),($1,1,500000,'new_service',$3)`,
        [pid, pros, phys]);
      await storage.deleteCaseType(pid, "physiotherapy", { userId: ADMIN, userName: "x", reason: "اختبار" });
      const cs = await q<{ id: number; cost: number }>(`SELECT id, cost FROM patient_cases WHERE patient_id=$1`, [pid]);
      same("ج١. الكلفةُ انتقلت إلى الطرف", cs.map((c) => [c.id, c.cost]), [[pros, 1500000]]);
      const orphan = await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1 AND case_id IS NULL`, [pid]);
      same("ج٢. **ولا قيدَ بلا قسم**", orphan.length, 0);
      const sum = await q<{ s: string }>(`SELECT SUM(amount)::text AS s FROM cost_entries WHERE patient_id=$1 AND case_id=$2`, [pid, pros]);
      same("ج٣. **وقيودُ الطرف تساوي كلفتَه**", Number(sum[0].s), 1500000);
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص الدفعة ب نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
