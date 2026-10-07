// «عاد لأخذ القالب» — من «سبب الحضور» على أمر التصنيع القائم (§4.cl — ٢٠٢٦-١٠-٠٧).
// قاعدة محلّية: `npm run test:mold-return`.
//
// واقعتُه: حميد لفته خشان دفع يوم ٢٠-٩ ولم يُؤخذ قالبُه (احتاج تأهيلاً) فعاد يوم ٥-١٠ — ولا بابَ يسجّل ذلك. يحرس:
// (أ) الأهليّة: تصنيعُ جهازٍ أوّل، قيد العمل، قبل القالب، غيرُ مُبطَل ولا بانتظار قالبٍ نهائيّ؛
// (ب) الحفظ: زيارةُ «عاد لأخذ القالب» بتاريخها على قسم الجهاز، وسطرٌ في الخطّ الزمنيّ، وتنبيهُ الخبير، ولا مال، والمرحلةُ لا تتحرّك؛
// (ج) «بانتظار المريض» يعود نشطاً؛ (د) الصلاحية والتاريخ: لا الخبير، ولا مستقبل، وأقدمُ من ٣ أيام للمسؤول.

import express from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import * as store from "./store";
import { isMoldReturnEligible } from "@shared/manufacturing";

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

const PORT = 6814;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عاد-لأخذ-القالب";
const EXPERT = 9541, RECEPTION = 9542, ADMIN = 9543, MANAGER = 9544;

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1], permissions: {} },
  reception: { userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true } },
  //  خبيرٌ يملك علمَ الإضافة — فالردُّ من حارس الدور لا من غياب العلم.
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canAddPatients: true } },
};

async function req(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_amputee, created_at)
     VALUES ($1,'07701234567',$2,'40','amputee',1,true, now() - interval '20 days') RETURNING id`, [name, MARK]);
  await pool.query(`INSERT INTO patient_cases (patient_id, case_type) VALUES ($1, 'prosthetic')`, [rows[0].id]);
  return rows[0].id;
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
const daysAgoYmd = (n: number) => ymd(new Date(Date.now() - n * 86400000));

async function visitsOf(p: number) {
  return (await pool.query(
    `SELECT v.details, v.notes, v.visit_date, v.cost, pc.case_type FROM visits v LEFT JOIN patient_cases pc ON pc.id = v.case_id
      WHERE v.patient_id = $1 AND v.deleted_at IS NULL ORDER BY v.id`, [p])).rows;
}
async function orderRow(id: number) {
  return (await pool.query(`SELECT status, current_stage FROM prosthetic_work_orders WHERE id = $1`, [id])).rows[0];
}
async function history(id: number) {
  return (await pool.query(`SELECT action_type, notes FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = 'mold_return'`, [id])).rows;
}
async function outbox(text: string) {
  return (await pool.query(`SELECT target_user_ids FROM staff_notification_outbox WHERE text LIKE $1`, [`%${text}%`])).rows;
}
async function moneyCount(p: number) {
  const a = await pool.query(`SELECT count(*)::int AS n FROM payments WHERE patient_id = $1`, [p]);
  const b = await pool.query(`SELECT count(*)::int AS n FROM cost_entries WHERE patient_id = $1`, [p]);
  return a.rows[0].n + b.rows[0].n;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM staff_notification_outbox WHERE text LIKE '%مريض القالب%'`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[EXPERT, RECEPTION, ADMIN, MANAGER]]);
}

async function main() {
  console.log("\n── أ. الأهليّة (بلا قاعدة) ──");
  const base = { purpose: "initial_build", status: "active", currentStage: "order_received", holdReasonCode: null, adminVoidReversalId: null };
  check(isMoldReturnEligible(base), "أ.١ أمرٌ على «استلام أمر التصنيع» مؤهَّل");
  check(isMoldReturnEligible({ ...base, currentStage: "measurements" }), "أ.٢ و«القياسات» مؤهَّلة");
  check(!isMoldReturnEligible({ ...base, currentStage: "mold" }), "أ.٣ وبعد القالب لا");
  check(!isMoldReturnEligible({ ...base, purpose: "maintenance" }), "أ.٤ ولا الصيانة");
  check(!isMoldReturnEligible({ ...base, status: "completed" }), "أ.٥ ولا المنتهي");
  check(!isMoldReturnEligible({ ...base, adminVoidReversalId: 5 }), "أ.٦ ولا المُبطَل");
  check(isMoldReturnEligible({ ...base, status: "waiting_patient", holdReasonCode: "patient_absent" }), "أ.٧ و«بانتظار المريض» مؤهَّل");

  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, name, role] of [[EXPERT, "خبير", "prosthetics_expert"], [RECEPTION, "استقبال", "reception"], [ADMIN, "المسؤول", "admin"], [MANAGER, "مدير", "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `mr_u${id}`, name, role]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.headers["x-test-session"];
    req.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  registerManufacturingRoutes(app, isAuthenticated);
  const server = app.listen(PORT);
  await new Promise((r) => server.once("listening", r));

  try {
    const mk = async (p: number) => (await store.createWorkOrderForExisting({
      patientId: p, branchId: 1, serviceType: "prosthetic", expertUserId: EXPERT, assignedBy: MANAGER,
    })).id;
    const post = (id: number, s: any, body: any) => req("POST", `/api/manufacturing/orders/${id}/mold-return`, s, body);

    const p1 = await mkPatient("مريض القالب الأوّل");
    const wo1 = await mk(p1);
    const visitsBefore = (await visitsOf(p1)).length;
    const moneyBefore = await moneyCount(p1);

    console.log("\n── د. الصلاحية والتاريخ ──");
    same("د.١ الخبيرُ يُردّ", (await post(wo1, S.expert, {})).status, 403);
    same("د.٢ والمستقبلُ يُردّ", (await post(wo1, S.reception, { date: daysAgoYmd(-1) })).status, 400);
    same("د.٣ وأقدمُ من ٣ أيام للموظّف يُردّ", (await post(wo1, S.reception, { date: daysAgoYmd(5) })).status, 403);
    same("د.٤ ولم يُكتب شيء", (await visitsOf(p1)).length, visitsBefore);

    console.log("\n── ب. الحفظ ──");
    const day = daysAgoYmd(2);
    const r = await post(wo1, S.reception, { date: day, note: "أنهى التأهيل" });
    same("ب.١ ينجح", r.status, 200);
    const vs = (await visitsOf(p1)).slice(visitsBefore);
    same("ب.٢ زيارةٌ واحدة «عاد لأخذ القالب» على قسم الأطراف بالملاحظة",
      vs.map((v) => [v.details, v.case_type, v.notes]), [["عاد لأخذ القالب", "prosthetic", "أنهى التأهيل"]]);
    same("ب.٣ …بتاريخ الحضور", vs[0] ? ymd(new Date(`${new Date(vs[0].visit_date).toISOString().slice(0, 19)}Z`)) : null, day);
    same("ب.٤ وسطرٌ في الخطّ الزمنيّ", (await history(wo1)).map((h) => h.notes.includes(day)), [true]);
    same("ب.٥ وتنبيهُ الخبير", (await outbox("حضر المريض لأخذ القالب (أمر رقم " + wo1 + ")")).map((o) => o.target_user_ids), [[EXPERT]]);
    same("ب.٦ ولا مال", await moneyCount(p1), moneyBefore);
    same("ب.٧ والمرحلةُ لم تتحرّك", await orderRow(wo1), { status: "active", current_stage: "order_received" });

    console.log("\n── ج. «بانتظار المريض» يعود نشطاً ──");
    const p2 = await mkPatient("مريض القالب المنتظر");
    const wo2 = await mk(p2);
    await pool.query(`UPDATE prosthetic_work_orders SET status = 'waiting_patient', hold_reason_code = 'patient_absent' WHERE id = $1`, [wo2]);
    same("ج.١ ينجح", (await post(wo2, S.reception, {})).status, 200);
    same("ج.٢ والأمرُ نشط", (await orderRow(wo2)).status, "active");
    same("ج.٣ وزيارةُ اليوم", (await visitsOf(p2)).map((v) => [v.details, ymd(new Date(`${new Date(v.visit_date).toISOString().slice(0, 19)}Z`))]),
      [["عاد لأخذ القالب", ymd(new Date())]]);

    console.log("\n── أ. (حيّاً) غيرُ المؤهَّل يُردّ بلا كتابة ──");
    await pool.query(`UPDATE prosthetic_work_orders SET current_stage = 'mold' WHERE id = $1`, [wo1]);
    const n1 = (await visitsOf(p1)).length;
    same("أ.٨ بعد القالب ٤٠٩", (await post(wo1, S.reception, {})).status, 409);
    same("أ.٩ ولا زيارة", (await visitsOf(p1)).length, n1);
    same("أ.١٠ والمسؤولُ أبعد من ٣ أيام", (await post(wo2, S.admin, { date: daysAgoYmd(10) })).status, 200);
  } finally {
    server.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
