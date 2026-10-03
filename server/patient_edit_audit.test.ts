// «تعديل مريض» يكتب سطرَ تدقيق بالقديم والجديد (§4.bs). حيّاً على Postgres وعلى `PUT /api/patients/:id` الحقيقية.
// قاعدة محلّية: `npm run test:patient-edit-audit`.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { diffPatientEdit } from "./patients/patient_edit_audit";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}

const PORT = 6957;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تدقيق-تعديل";
const ADMIN = 9971, RECV = 9972;
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1], displayName: "المسؤول",
    permissions: { canViewPatients: true, canEditPatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استعلامات",
    permissions: { canViewPatients: true, canEditPatients: true } },
};
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const auditRows = (id: number) => q<{ user_id: number; old_values: string; new_values: string; notes: string }>(
  `SELECT user_id, old_values, new_values, notes FROM audit_log
    WHERE entity_type = 'patient' AND entity_id = $1 AND action = 'update' ORDER BY id`, [id]);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  //  الدالّةُ وحدها أوّلاً.
  const d = diffPatientEdit({ name: "أ", phone: "1", age: "40" }, { name: "ب", phone: "1", age: "40", updatedAt: new Date() },
    ["name", "phone", "updatedAt"]);
  same("٠. الفرقُ = ما تغيّر فعلاً، بلا أختام الخادم", d, { fields: ["name"], oldValues: { name: "أ" }, newValues: { name: "ب" } });

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[ADMIN, "admin"], [RECV, "reception"]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
               can_view_patients, can_edit_patients)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true, can_view_patients=true, can_edit_patients=true`,
      [id, `pea_u${id}`, String(id), role]);
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
  await new Promise<void>((r) => httpServer.once("listening", r));

  try {
    const id = (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07701234567',$2,'40','170','70','x',1,500000,'new') RETURNING id`, [`${MARK} ١`, MARK]))[0].id;

    //  ١. الاستقبالُ يصحّح الهاتف والاسم ⟵ سطرٌ واحد باسمه وبالقديم والجديد.
    const r1 = await http("PUT", `/api/patients/${id}`, S.recv, { name: `${MARK} معدَّل`, phone: "07709998877" });
    same("١أ. الحفظُ ينجح", r1.status, 200);
    let rows = await auditRows(id);
    same("١ب. سطرُ تدقيقٍ واحد", rows.length, 1);
    same("١ج. باسم مَن عدّل", rows[0]?.user_id, RECV);
    same("١د. والقديمُ", JSON.parse(rows[0]?.old_values ?? "{}"), { name: `${MARK} ١`, phone: "07701234567" });
    same("١هـ. والجديدُ", JSON.parse(rows[0]?.new_values ?? "{}"), { name: `${MARK} معدَّل`, phone: "07709998877" });
    same("١و. والملاحظةُ تسمّي الحقول", rows[0]?.notes, "تعديل بيانات المريض: الاسم، الهاتف");

    //  ٢. والكلفةُ الكليّة — ما كان بلا أثر.
    await http("PUT", `/api/patients/${id}`, S.admin, { totalCost: 750000 });
    rows = await auditRows(id);
    same("٢أ. تعديلُ الكلفة يكتب سطراً", rows.length, 2);
    same("٢ب. من ٥٠٠,٠٠٠ إلى ٧٥٠,٠٠٠ وباسم المسؤول",
      [rows[1]?.user_id, JSON.parse(rows[1]?.old_values ?? "{}"), JSON.parse(rows[1]?.new_values ?? "{}")],
      [ADMIN, { totalCost: 500000 }, { totalCost: 750000 }]);

    //  ٣. وحفظٌ بلا تغيير (النموذجُ يعيد إرسال القيم نفسِها) ⟵ لا سطرَ زائف.
    await http("PUT", `/api/patients/${id}`, S.recv, { name: `${MARK} معدَّل`, phone: "07709998877", age: "40" });
    same("٣. حفظٌ بلا تغيير لا يكتب سطراً", (await auditRows(id)).length, 2);

    //  ٤. والرفضُ لا يكتب: الاستقبالُ يحاول تغيير الفرع (يُسقَط للحقل) ⟵ لا سطرَ عن الفرع.
    await http("PUT", `/api/patients/${id}`, S.recv, { branchId: 2 });
    same("٤. حقلٌ أُسقط (فرعُ التسجيل لغير المسؤول) لا يظهر تغييراً", (await auditRows(id)).length, 2);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, RECV]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, RECV]]);
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص تدقيق تعديل المريض نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((err) => { console.error(err); process.exit(1); });
