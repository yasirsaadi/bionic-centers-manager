// المراجعةُ الشاملة — الدفعةُ أ: الصلاحيات (§4.bo). حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:review-batch-a`.
//
// (أ) تقاريرُ المحاسبة العامّة لصاحب «إدارة المحاسبة» وحده، وغيرُ المسؤول يقرأ فرعَه النشط وحده.
// (ب) «تعديل المريض» لا يغيّر فرعَ التسجيل لغير المسؤول، ولا يكتب أعمدةَ السلّة.
// (ج) خططُ التقسيط بقراءتَيها للمسؤول وحده.
// (د) الإحصاءُ المخصَّص: المجموعُ لمن يرى الدفعات، وعلى فرعه وحده.
// (هـ) بنودُ الفواتير بالجملة: فواتيرُ فرعٍ آخر تُسقَط.
// (و) رفعُ مستندٍ إلى مريض فرعٍ لا يصله المستخدم يُردّ.

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

const PORT = 6951;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مراجعة-أ";
const ADMIN = 9981, RECV = 9982, ACCT = 9983, DOC = 9984;
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
  await q(`DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM invoices WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM installment_plans WHERE patient_id IN (${ids})`);
  for (const d of await q<{ file_url: string }>(`SELECT file_url FROM documents WHERE patient_id IN (${ids})`)) {
    await import("fs").then((fs) => fs.promises.unlink("." + d.file_url).catch(() => {}));
  }
  await q(`DELETE FROM documents WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM custom_stats WHERE name = '${MARK}'`);
  await q(`DELETE FROM journal_entries WHERE description = '${MARK}'`);
}

async function mkPatient(label: string, branchId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,0) RETURNING id`, [`${MARK} ${label}`, MARK, branchId]);
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
      [id, `rva_u${id}`, String(id), role, branches[0], JSON.stringify(branches), vp === "true", ep === "true", vpay === "true", acct === "true"]);
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
    console.log("\n── أ. تقاريرُ المحاسبة العامّة ──");
    {
      const p1 = "/api/accounting/v2/reports/income-statement?startDate=2026-01-01&endDate=2026-12-31";
      same("أ١. الطبيبُ يُردّ", (await http("GET", p1, S.doc)).status, 403);
      same("أ٢. والاستقبالُ بلا «إدارة المحاسبة» يُردّ", (await http("GET", p1, S.recv)).status, 403);
      same("أ٣. والمحاسبُ يقرأ", (await http("GET", p1, S.acct)).status, 200);
      same("أ٤. والمسؤولُ يقرأ", (await http("GET", p1, S.admin)).status, 200);
      for (const path of ["/api/accounting/v2/accounts", "/api/accounting/v2/journal", "/api/accounting/v2/periods",
        "/api/accounting/v2/reports/trial-balance", "/api/accounting/v2/reports/balance-sheet"]) {
        same(`أ٥. الطبيبُ يُردّ عن ${path}`, (await http("GET", path, S.doc)).status, 403);
      }
      const je = await q<{ id: number }>(
        `INSERT INTO journal_entries (entry_number, entry_date, branch_id, description, total_amount, status)
         VALUES ('JE-TEST-RVA-1', '2026-10-02', 2, $1, 1000, 'posted') RETURNING id`, [MARK]);
      same("أ٦. **قيدُ فرعٍ آخر لا يُقرأ برقمه للمحاسب**", (await http("GET", `/api/accounting/v2/journal/${je[0].id}`, S.acct)).status, 404);
      same("أ٧. والمسؤولُ يقرؤه", (await http("GET", `/api/accounting/v2/journal/${je[0].id}`, S.admin)).status, 200);
      const list = await http("GET", "/api/accounting/v2/journal?branchId=2", S.acct);
      check(Array.isArray(list.body) && !list.body.some((e: any) => e.id === je[0].id),
        "أ٨. **وطلبُ فرعٍ آخر بالاستعلام يعود بفرعه هو**", JSON.stringify(list.body).slice(0, 200));
    }

    console.log("\n── ب. «تعديل المريض» ──");
    const pB1 = await mkPatient("ب", 1);
    {
      const r = await http("PUT", `/api/patients/${pB1}`, S.recv, { branchId: 2, deletedReason: "حقن", name: `${MARK} ب-معدَّل` });
      check(r.status < 300, "ب١. الحفظُ ينجح", `${r.status} ${JSON.stringify(r.body).slice(0, 200)}`);
      const row = (await q(`SELECT branch_id, deleted_reason, name FROM patients WHERE id=$1`, [pB1]))[0];
      same("ب٢. **فرعُ التسجيل لم يتغيّر**", row.branch_id, 1);
      same("ب٣. **وعمودُ السلّة لم يُكتب**", row.deleted_reason, null);
      same("ب٤. والاسمُ تغيّر — التعديلُ العاديّ سليم", row.name, `${MARK} ب-معدَّل`);
      const a = await http("PUT", `/api/patients/${pB1}`, S.admin, { branchId: 2 });
      check(a.status < 300, "ب٥. المسؤولُ يصحّح الفرع", `${a.status}`);
      same("ب٦. فيتغيّر", (await q(`SELECT branch_id FROM patients WHERE id=$1`, [pB1]))[0].branch_id, 2);
    }

    console.log("\n── ج. خططُ التقسيط ──");
    {
      const pC = await mkPatient("ج", 1);
      const ip = await q<{ id: number }>(
        `INSERT INTO installment_plans (patient_id, branch_id, total_amount, installment_amount, number_of_installments, start_date)
         VALUES ($1,1,1000000,100000,10,'2026-10-01') RETURNING id`, [pC]);
      same("ج١. الطبيبُ يُردّ عن خطط المريض", (await http("GET", `/api/installment-plans/patient/${pC}`, S.doc)).status, 403);
      same("ج٢. وعن الخطّة برقمها", (await http("GET", `/api/installment-plans/${ip[0].id}`, S.recv)).status, 403);
      same("ج٣. والمسؤولُ يقرأ", (await http("GET", `/api/installment-plans/${ip[0].id}`, S.admin)).status, 200);
    }

    console.log("\n── د. الإحصاءُ المخصَّص ──");
    {
      const p1 = await mkPatient("د١", 1), p2 = await mkPatient("د٢", 2);
      await q(`INSERT INTO payments (patient_id, branch_id, amount) VALUES ($1,1,100000),($2,2,700000)`, [p1, p2]);
      const st = await q<{ id: number }>(
        `INSERT INTO custom_stats (name, stat_type, category, filter_field, filter_value, is_global)
         VALUES ($1,'sum','payments','referralSource',$1,true) RETURNING id`, [MARK]);
      same("د١. **الطبيبُ لا يحسب مجموعَ مال**", (await http("GET", `/api/custom-stats/${st[0].id}/calculate`, S.doc)).status, 403);
      const r = await http("GET", `/api/custom-stats/${st[0].id}/calculate`, S.recv);
      same("د٢. **والاستقبالُ يحسب فرعَه وحده** ولو كان الحقلُ عامّاً", r.body?.value, 100000);
      const a = await http("GET", `/api/custom-stats/${st[0].id}/calculate`, S.admin);
      same("د٣. والمسؤولُ يحسب الكلّ", a.body?.value, 800000);
    }

    console.log("\n── هـ. بنودُ الفواتير بالجملة ──");
    {
      const p1 = await mkPatient("هـ١", 1), p2 = await mkPatient("هـ٢", 2);
      const inv = await q<{ id: number }>(
        `INSERT INTO invoices (invoice_number, patient_id, branch_id, invoice_date, subtotal, total)
         VALUES ('INV-RVA-1',$1,1,'2026-10-02',100,100),('INV-RVA-2',$2,2,'2026-10-02',200,200) RETURNING id`, [p1, p2]);
      await q(`INSERT INTO invoice_items (invoice_id, description, unit_price, total) VALUES ($1,'a',100,100),($2,'b',200,200)`,
        [inv[0].id, inv[1].id]);
      const r = await http("GET", `/api/invoice-items/bulk?invoiceIds=${inv[0].id},${inv[1].id}`, S.acct);
      same("هـ١. **المحاسبُ يرى بنودَ فرعه وحده**", (r.body ?? []).map((x: any) => x.invoiceId ?? x.invoice_id), [inv[0].id]);
      const a = await http("GET", `/api/invoice-items/bulk?invoiceIds=${inv[0].id},${inv[1].id}`, S.admin);
      same("هـ٢. والمسؤولُ يرى الاثنين", (a.body ?? []).length, 2);
    }

    console.log("\n── و. رفعُ المستندات ──");
    {
      const p1 = await mkPatient("و١", 1), p2 = await mkPatient("و٢", 2);
      const up = async (pid: number, session: any) => {
        const fd = new FormData();
        fd.append("patientId", String(pid));
        fd.append("documentType", "report");
        fd.append("file", new Blob([Buffer.from("%PDF-1.4 test")], { type: "application/pdf" }), "t.pdf");
        const res = await fetch(BASE + "/api/documents", {
          method: "POST", body: fd,
          headers: { "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
        });
        return res.status;
      };
      same("و١. **مريضُ فرعٍ آخر يُردّ**", await up(p2, S.recv), 404);
      same("و٢. ومريضُ فرعه يُقبل", await up(p1, S.recv), 201);
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص الدفعة أ نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => { console.error(err); process.exit(1); });
