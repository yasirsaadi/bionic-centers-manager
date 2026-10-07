// تعديلُ تاريخ إسناد أمر التصنيع — للمسؤول وحده، ما دام الأمرُ قيد العمل (§4.ck — ٢٠٢٦-١٠-٠٧).
// قاعدة محلّية: `npm run test:assignment-date`.
//
// واقعتُه: الأمر ٤٥٩ أُسند يومَ دفع العربون (٢٠-٩) والقالبُ أُخذ يوم ٥-١٠. يحرس:
// (أ) المسؤولُ وحده، والسببُ إلزاميّ؛ (ب) الحدود: لا مستقبل، ولا قبل تسجيل المريض، ولا بعد أوّل حدثٍ للأمر، ولا لأمرٍ منتهٍ؛
// (ج) ينتقل `created_at` وسطرُ «created» معاً وبساعته، ويُكتب سطرُ تعديلٍ وسطرُ تدقيق؛ (د) الدفعةُ لا تُمسّ.

import express from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import * as store from "./store";
import { assignmentDateError } from "@shared/manufacturing";

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

const PORT = 6813;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تاريخ-الإسناد";
const EXPERT = 9531, MANAGER = 9532, ADMIN = 9533;

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1], permissions: {} },
  manager: { userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true } },
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

/** مريضٌ سُجِّل قبل `daysAgo` يوماً، ودفع عربوناً يومَها. */
async function mkPatient(name: string, daysAgo: number): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id, is_amputee, created_at)
     VALUES ($1,'07701234567',$2,'40','amputee',1,true, now() - make_interval(days => $3)) RETURNING id`, [name, MARK, daysAgo]);
  await pool.query(
    `INSERT INTO payments (patient_id, branch_id, amount, date)
     VALUES ($1, 1, 2000000, now() - make_interval(days => $2))`,
    [rows[0].id, daysAgo]);
  return rows[0].id;
}

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
const daysAgoYmd = (n: number) => ymd(new Date(Date.now() - n * 86400000));
const hhmmss = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Baghdad", hour12: false });

async function orderRow(id: number) {
  return (await pool.query(`SELECT created_at, status FROM prosthetic_work_orders WHERE id = $1`, [id])).rows[0];
}
async function createdRow(id: number) {
  return (await pool.query(`SELECT created_at FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = 'created'`, [id])).rows[0];
}
async function historyOf(id: number, type: string) {
  return (await pool.query(`SELECT notes, performed_by FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = $2`, [id, type])).rows;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[EXPERT, MANAGER, ADMIN]]);
}

async function main() {
  console.log("\n── قواعدُ الحدود (بلا قاعدة) ──");
  const base = { newDay: "2026-10-05", currentDay: "2026-09-20", today: "2026-10-07", patientRegisteredDay: "2026-09-20", status: "active", firstLaterEvent: null };
  same("ق.١ واقعةُ ٤٥٩ مقبولة", assignmentDateError(base), null);
  check(!!assignmentDateError({ ...base, newDay: "2026-10-08" }), "ق.٢ لا مستقبل");
  check(!!assignmentDateError({ ...base, newDay: "2026-09-19" }), "ق.٣ لا قبل تسجيل المريض");
  check(!!assignmentDateError({ ...base, status: "completed" }), "ق.٤ لا لأمرٍ منتهٍ");
  check(!!assignmentDateError({ ...base, firstLaterEvent: { day: "2026-10-01", label: "انتقال مرحلة" } }), "ق.٥ لا بعد أوّل حدثٍ للأمر");
  same("ق.٦ ويومُ الحدث نفسُه مقبول", assignmentDateError({ ...base, firstLaterEvent: { day: "2026-10-05", label: "انتقال مرحلة" } }), null);
  check(!!assignmentDateError({ ...base, newDay: "5-10" }), "ق.٧ صيغةٌ خاطئة تُرفض");

  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, name, role] of [[EXPERT, "خبير", "prosthetics_expert"], [MANAGER, "مدير", "branch_manager"], [ADMIN, "المسؤول", "admin"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `ad_u${id}`, name, role]);
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
    // أمرٌ أُسند يومَ الدفع (قبل ١٧ يوماً) — كما وقع للأمر ٤٥٩.
    const mk = async (p: number, daysAgo: number) => {
      const wo = await store.createWorkOrderForExisting({ patientId: p, branchId: 1, serviceType: "prosthetic", expertUserId: EXPERT, assignedBy: MANAGER });
      await pool.query(`UPDATE prosthetic_work_orders SET created_at = now() - make_interval(days => $2) WHERE id = $1`, [wo.id, daysAgo]);
      await pool.query(`UPDATE prosthetic_work_history SET created_at = now() - make_interval(days => $2) WHERE work_order_id = $1`, [wo.id, daysAgo]);
      return wo.id;
    };
    const patch = (id: number, s: any, body: any) => req("PATCH", `/api/manufacturing/orders/${id}/assignment-date`, s, body);

    const p1 = await mkPatient("مريض العربون", 17);
    const wo1 = await mk(p1, 17);
    const before = await orderRow(wo1);
    const payBefore = (await pool.query(`SELECT amount, date FROM payments WHERE patient_id = $1`, [p1])).rows;
    const target = daysAgoYmd(2);

    console.log("\n── أ. المسؤولُ وحده، والسببُ إلزاميّ ──");
    same("أ.١ مديرُ الفرع يُردّ", (await patch(wo1, S.manager, { date: target, reason: "خطأ" })).status, 403);
    same("أ.٢ وبلا سبب يُردّ", (await patch(wo1, S.admin, { date: target, reason: "  " })).status, 400);
    same("أ.٣ ولم يتغيّر شيء", (await orderRow(wo1)).created_at.getTime(), before.created_at.getTime());

    console.log("\n── ب. الحدود في الخادم ──");
    same("ب.١ المستقبلُ يُردّ", (await patch(wo1, S.admin, { date: daysAgoYmd(-1), reason: "x" })).status, 400);
    same("ب.٢ وما قبل تسجيل المريض يُردّ", (await patch(wo1, S.admin, { date: daysAgoYmd(20), reason: "x" })).status, 400);
    same("ب.٣ والتاريخُ نفسُه ٤٠٩", (await patch(wo1, S.admin, { date: daysAgoYmd(17), reason: "x" })).status, 409);

    console.log("\n── ج. التعديل ──");
    const r = await patch(wo1, S.admin, { date: target, reason: "أُسند يومَ الدفع خطأً" });
    same("ج.١ ينجح", r.status, 200);
    const after = await orderRow(wo1);
    same("ج.٢ `created_at` صار اليومَ الصحيح", ymd(after.created_at), target);
    same("ج.٣ …وبساعته نفسِها", hhmmss(after.created_at), hhmmss(before.created_at));
    same("ج.٤ وسطرُ «created» معه", (await createdRow(wo1)).created_at.getTime(), after.created_at.getTime());
    const h = await historyOf(wo1, "assignment_date_change");
    same("ج.٥ وسطرُ تعديلٍ واحد بالسبب ومَن فعل", h.map((x) => [x.performed_by, x.notes.includes("أُسند يومَ الدفع خطأً"), x.notes.includes(target)]), [[ADMIN, true, true]]);
    const au = (await pool.query(`SELECT notes FROM audit_log WHERE entity_type = 'prosthetic_work_order' AND entity_id = $1 AND action = 'assignment_date_change' AND user_id = $2`, [wo1, ADMIN])).rows;
    same("ج.٦ وسطرُ تدقيق", au.length, 1);
    same("د.١ والدفعةُ لم تُمسّ", (await pool.query(`SELECT amount, date FROM payments WHERE patient_id = $1`, [p1])).rows, payBefore);

    console.log("\n── ب. (تكملة) أوّلُ حدثٍ للأمر سقف، والمنتهي ممنوع ──");
    const p2 = await mkPatient("مريض تقدّم أمره", 17);
    const wo2 = await mk(p2, 17);
    await pool.query(`INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, created_at)
                      VALUES ($1, 'stage_change', 'x', 'y', now() - make_interval(days => 10))`, [wo2]);
    const late = await patch(wo2, S.admin, { date: daysAgoYmd(5), reason: "x" });
    same("ب.٤ بعد أوّل انتقال مرحلة يُردّ", late.status, 400);
    check(String(late.json?.error ?? "").includes("انتقال مرحلة"), "ب.٥ والرسالةُ تسمّي الحدث", JSON.stringify(late.json));
    same("ب.٦ وقبله مقبول", (await patch(wo2, S.admin, { date: daysAgoYmd(12), reason: "x" })).status, 200);
    // أمرٌ أُسند قبل ساعته في يوم الحدث: اليومُ نفسُه مقبول والوقتُ لا يتجاوز الحدث.
    const p3 = await mkPatient("مريض في يوم الحدث", 17);
    const wo3 = await mk(p3, 17);
    const ev = new Date(`${daysAgoYmd(4)}T00:00:30+03:00`);
    await pool.query(`INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, created_at)
                      VALUES ($1, 'stage_change', 'x', 'y', $2)`, [wo3, ev]);
    same("ب.٧ يومُ الحدث نفسُه مقبول", (await patch(wo3, S.admin, { date: daysAgoYmd(4), reason: "x" })).status, 200);
    check((await orderRow(wo3)).created_at.getTime() < ev.getTime(), "ب.٨ …والإسنادُ يبقى قبل الحدث بالساعة");
    await pool.query(`UPDATE prosthetic_work_orders SET status = 'completed' WHERE id = $1`, [wo2]);
    same("ب.٩ والأمرُ المنتهي يُردّ", (await patch(wo2, S.admin, { date: daysAgoYmd(13), reason: "x" })).status, 400);
  } finally {
    server.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّها نجحت");
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
