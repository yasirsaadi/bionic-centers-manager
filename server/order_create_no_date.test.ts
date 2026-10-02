// البند ٢٣ — موعدُ التسليم لا يُكتب عند إنشاء أمر التصنيع؛ الخبيرُ يلتزم به عند القالب (§4.bj).
// قاعدة محلّية: `npm run test:order-create-no-date`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// نافذةُ «إنشاء أمر» كانت تقبل تاريخاً يُحفظ كأنه وعدُ الخبير، فلا يُسأل عند القالب (`!raw.expectedDeliveryDate`) ويُحاسَب على
// ما لم يقطعه. أ. الإنشاءُ بتاريخٍ مُرسَل ⟵ الأمرُ بلا موعد.  ب. بلوغُ القالب بلا موعد ⟵ ٤٠٠.  ج. وبموعد الخبير ⟵ يُثبَّت ويُسجَّل.

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

const PORT = 6896;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-موعد-عند-الإنشاء";
const ADMIN = 9981, EXP = 9982;
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1], displayName: "المسؤول",
    permissions: { canAddPatients: true } },
  exp: { userId: EXP, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "خبير" },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  const wos = `SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids})`;
  for (const t of ["patient_notification_outbox", "manufacturing_events"]) {
    await q(`DELETE FROM ${t} WHERE work_order_id IN (${wos})`).catch(() => {});
  }
  for (const t of ["patient_notification_outbox", "patient_events"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (${wos})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'فرع ١') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'ocnd_admin','x','المسؤول','admin',1,'[1]'::jsonb,true) ON CONFLICT (id) DO UPDATE SET is_active=true`, [ADMIN]);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'ocnd_exp','x','خبير','prosthetics_expert',1,'[1]'::jsonb,true)
           ON CONFLICT (id) DO UPDATE SET role='prosthetics_expert', is_active=true`, [EXP]);
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
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, amputation_site,
         branch_id, is_amputee, total_cost, patient_classification)
       VALUES ($1,'07701234567',$2,'40','170','70','بتر','احادي - طرف سفلي - يمين - تحت الركبة',1,true,0,'past') RETURNING id`,
      [`${MARK} مريض`, MARK]);

    console.log("\n── أ. الإنشاء ──");
    const wo = await http("POST", "/api/manufacturing/orders", S.admin,
      { patientId: p.id, expertUserId: EXP, serviceType: "prosthetic", expectedDeliveryDate: "2026-10-10" });
    same("أ١. الأمرُ يُنشأ", wo.status, 201);
    const [row] = await q(`SELECT id, expected_delivery_date FROM prosthetic_work_orders WHERE patient_id=$1`, [p.id]);
    same("أ٢. **والتاريخُ المُرسَل عند الإنشاء لا يُحفظ** — الموعدُ للخبير عند القالب", row?.expected_delivery_date ?? null, null);

    console.log("\n── ب. القالب ──");
    const id = row.id;
    same("ب١. إلى «القياسات» بلا موعد", (await http("PATCH", `/api/manufacturing/orders/${id}/advance`, S.exp, {})).status, 200);
    same("ب٢. **وإلى «القالب» بلا موعد ⟵ ٤٠٠** (يُسأل الخبير)",
      (await http("PATCH", `/api/manufacturing/orders/${id}/advance`, S.exp, {})).status, 400);

    console.log("\n── ج. التزامُ الخبير ──");
    same("ج١. وبموعده ⟵ ينتقل",
      (await http("PATCH", `/api/manufacturing/orders/${id}/advance`, S.exp, { expectedDeliveryDate: "2026-11-01" })).status, 200);
    const [after] = await q(`SELECT current_stage, expected_delivery_date::text d FROM prosthetic_work_orders WHERE id=$1`, [id]);
    same("ج٢. **والموعدُ موعدُه، ومسجَّلٌ في سجلّ الأمر**",
      [after.current_stage, after.d,
        (await q(`SELECT count(*)::int n FROM prosthetic_work_history WHERE work_order_id=$1 AND notes LIKE 'تم تحديد موعد التسليم المتوقع:%'`, [id]))[0].n],
      ["mold", "2026-11-01", 1]);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1)`, [[ADMIN, EXP]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1)`, [[ADMIN, EXP]]).catch(() => {});
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
