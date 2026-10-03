// لوحة التصنيع: «تصنيع كامل» أم «صيانة» (طلبُ المالك ٢٠٢٦-١٠-٠٣) — `npm run test:manufacturing-purpose`.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6962, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-غرض-التصنيع";
const ADMIN = 9961, EXP = 9962;
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM system_users WHERE id IN (${ADMIN}, ${EXP})`);
}
const S = { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1], displayName: "المسؤول", permissions: {} };
async function get(qs: string) {
  const res = await fetch(`${BASE}/api/manufacturing/orders?${qs}`, {
    headers: { "x-test-session-b64": Buffer.from(JSON.stringify(S), "utf8").toString("base64") } });
  const body = await res.json().catch(() => null);
  return ((body ?? []) as any[]).filter((o) => o.patientName?.startsWith(MARK)).map((o) => o.patientName.slice(MARK.length + 1)).sort();
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await cleanup();
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active) VALUES
           (${ADMIN},'mp_admin','x','المسؤول','admin',1,true), (${EXP},'mp_exp','x','خبير','prosthetics_expert',1,true)`);
  const pid = async (n: string) => (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'0770111${Math.floor(Math.random() * 9000 + 1000)}',$2,'40','170','70','x',1,0,'new') RETURNING id`, [`${MARK} ${n}`, MARK]))[0].id;
  const wo = async (n: string, service: string, purpose: string | null, status: string, stage: string) =>
    q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, completed_at)
       VALUES ($1,1,${EXP},$2,$3,$4,$5, CASE WHEN $3 = 'completed' THEN NOW() ELSE NULL END)`, [await pid(n), service, status, stage, purpose]);
  await wo("طرف-كامل", "prosthetic", "initial_build", "completed", "delivered");
  await wo("طرف-صيانة", "prosthetic", "maintenance", "completed", "delivered");
  await wo("مسند-كامل", "medical_support", "initial_build", "active", "manufacturing");
  await wo("مسند-صيانة", "medical_support", "maintenance", "completed", "delivered");
  await wo("طرف-جارٍ", "prosthetic", "initial_build", "active", "casting");

  const app = express(); app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));
  try {
    same("أ١. بلا اختيار: الكلّ", await get(""), ["طرف-جارٍ", "طرف-صيانة", "طرف-كامل", "مسند-صيانة", "مسند-كامل"]);
    same("أ٢. تصنيعٌ كامل", await get("purpose=initial_build"), ["طرف-جارٍ", "طرف-كامل", "مسند-كامل"]);
    same("أ٣. صيانةٌ وحدها", await get("purpose=maintenance"), ["طرف-صيانة", "مسند-صيانة"]);
    same("أ٤. ويتركّب مع النوع: أطرافٌ + صيانة", await get("purpose=maintenance&serviceType=prosthetic"), ["طرف-صيانة"]);
    same("أ٥. ومع الحالة: مساندُ كاملةٌ مكتملة ⟵ لا شيء", await get("purpose=initial_build&serviceType=medical_support&status=completed"), []);
    same("أ٦. وقيمةٌ غريبة لا تُفرغ القائمة", (await get("purpose=xyz")).length, 5);
  } finally {
    await cleanup(); srv.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص غرض التصنيع نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
