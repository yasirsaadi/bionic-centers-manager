// البند ٢٢ (§4.ar) — التصحيحُ الإداريّ للمرحلة لا يتجاوز قواعد التقدّم ولا يراسل المريض.
// قاعدة محلّية: `npm run test:admin-stage-correction`.
//
// ثلاثة: (١) لا واتساب عن مرحلةٍ صحّحها المكتب — والحدثُ يُكتب؛ (٢) بلوغُ القالب أو ما بعده بلا موعدٍ يطلب الموعد؛
// (٣) أمرٌ موقوف يعود إلى العمل — والعذرُ المكتوب يبقى.

import express from "express";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import * as store from "./store";
import { patientEvents, prostheticWorkOrders as WO } from "@shared/schema";
import { asc, eq } from "drizzle-orm";

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

const PORT = 6797;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-التصحيح-الإداري";
const EXPERT = 9511, MANAGER = 9512;

const S = {
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: {} },
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

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true) RETURNING id`, [name, MARK]);
  //  جهةُ واتساب نشطة — فكلُّ رسالةٍ مستحَقّة تظهر صفّاً في الصادر.
  await pool.query(`INSERT INTO patient_contacts (patient_id, channel, external_id, relation) VALUES ($1,'whatsapp','9647701234567','self')`, [rows[0].id]);
  return rows[0].id;
}

async function events(patientId: number) {
  return db.select().from(patientEvents)
    .where(eq(patientEvents.patientId, patientId))
    .orderBy(asc(patientEvents.id));
}
async function stageEvents(patientId: number) {
  return (await events(patientId)).filter((e) => e.eventType.startsWith("manufacturing.")
    && e.eventType !== "manufacturing.delivery_date_changed");
}
async function order(id: number) {
  const [o] = await db.select().from(WO).where(eq(WO.id, id));
  return o;
}
/** صفوفُ الصادر — كلُّ صفٍّ رسالةُ واتساب مستحَقّة. */
async function outbox(patientId: number) {
  const { rows } = await pool.query<{ notification_type: string }>(
    `SELECT notification_type FROM patient_notification_deliveries WHERE patient_id = $1 ORDER BY id`, [patientId]);
  return rows;
}
async function historyCount(woId: number) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM prosthetic_work_history WHERE work_order_id = $1`, [woId]);
  return rows[0].n as number;
}
async function historyTypes(woId: number, type: string) {
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = $2`, [woId, type]);
  return rows[0].n as number;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  // الزيارات قبل الحالات: `visits.case_id` مفتاح أجنبي على `patient_cases`.
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, name, role] of [[EXPERT, "عناد", "prosthetics_expert"], [MANAGER, "مدير", "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `asc_u${id}`, name, role]);
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
    const mkOrder = async (p: number) => store.createWorkOrderForExisting({
      patientId: p, branchId: 1, serviceType: "prosthetic", expertUserId: EXPERT, assignedBy: MANAGER,
    });
    const fix = (id: number, body: any) => req("PATCH", `/api/manufacturing/orders/${id}/stage`, S.manager, body);

    // ══ (١) لا واتساب عن مرحلةٍ صحّحها المكتب ════════════════════════════
    console.log("\n── (١) التصحيحُ بلا رسالة للمريض ──");
    const p1 = await mkPatient("مريض التصحيح");
    const wo1 = await mkOrder(p1);
    const base = await outbox(p1);
    const adv = await req("PATCH", `/api/manufacturing/orders/${wo1.id}/advance`, S.expert, {});
    same("١. (ضابط) التقدّمُ العاديّ يستحقّ رسالة", [adv.status, (await outbox(p1)).length - base.length], [200, 1]);
    const ev0 = await stageEvents(p1);
    const ob0 = (await outbox(p1)).length;
    const back = await fix(wo1.id, { toStage: "order_received", reason: "تصحيح إدخال" });
    same("٢. **التصحيحُ للخلف ينجح بلا رسالة**", [back.status, (await outbox(p1)).length - ob0], [200, 0]);
    same("٣. **والحدثُ يُكتب** — خطُّ المريض الزمنيّ صادق", (await stageEvents(p1)).length - ev0.length, 1);
    const fwd = await fix(wo1.id, { toStage: "measurements", reason: "رجوعٌ عن الخطأ" });
    same("٤. وللأمام كذلك — لا رسالتان متناقضتان", [fwd.status, (await outbox(p1)).length - ob0], [200, 0]);
    const adv2 = await req("PATCH", `/api/manufacturing/orders/${wo1.id}/advance`, S.expert, { expectedDeliveryDate: "2026-12-10" });
    const after2 = await outbox(p1);
    same("٥. **والتقدّمُ بعده يستحقّ رسالتَه** — الصمتُ للتصحيح وحده (مرحلة + موعد)",
      [adv2.status, after2.slice(ob0).map((r) => r.notification_type).sort()],
      [200, ["manufacturing.delivery_date_changed", "manufacturing.stage_changed"]]);

    // ══ (٢) الموعدُ لا يُقفَز فوقه ════════════════════════════════════════
    console.log("\n── (٢) بلوغُ القالب بلا موعد ──");
    const p2 = await mkPatient("مريض بلا موعد");
    const wo2 = await mkOrder(p2);
    const h0 = await historyCount(wo2.id);
    const noDate = await fix(wo2.id, { toStage: "mold", reason: "تصحيح" });
    same("٦. **القالبُ بلا موعد مرفوض** — ولا شيء تغيّر",
      [noDate.status, (await order(wo2.id)).currentStage, await historyCount(wo2.id)], [400, "order_received", h0]);
    const beyond = await fix(wo2.id, { toStage: "manufacturing", reason: "تصحيح" });
    same("٧. **وما بعد القالب كذلك**", [beyond.status, (await order(wo2.id)).currentStage], [400, "order_received"]);
    const bad = await fix(wo2.id, { toStage: "mold", reason: "تصحيح", expectedDeliveryDate: "غداً" });
    same("٨. وتاريخٌ بغير صيغته مرفوض", bad.status, 400);
    const before = await fix(wo2.id, { toStage: "measurements", reason: "تصحيح" });
    same("٩. وما قبل القالب لا يطلبه", before.status, 200);
    const ob2 = (await outbox(p2)).length;
    const withDate = await fix(wo2.id, { toStage: "mold", reason: "تصحيح", expectedDeliveryDate: "2026-12-11" });
    const o2 = await order(wo2.id);
    same("١٠. **وبالموعد ينجح ويُلتزَم به**",
      [withDate.status, o2.currentStage, String(o2.expectedDeliveryDate).slice(0, 10)], [200, "mold", "2026-12-11"]);
    same("١١. وسطرُ «تحديد الموعد» في سجلّ الأمر", await historyTypes(wo2.id, "date_change"), 1);
    same("١٢. **والموعدُ الأوّل يصل المريضَ كعادته** — والمرحلةُ لا",
      (await outbox(p2)).slice(ob2).map((r) => r.notification_type), ["manufacturing.delivery_date_changed"]);
    const later = await fix(wo2.id, { toStage: "ready_for_fitting", reason: "تصحيح" });
    same("١٣. وأمرٌ له موعدٌ لا يُسأل ثانيةً — والموعدُ لا يُمَسّ",
      [later.status, String((await order(wo2.id)).expectedDeliveryDate).slice(0, 10)], [200, "2026-12-11"]);

    // ══ (٣) التوقّفُ ينتهي بالتصحيح كما ينتهي بالتقدّم ════════════════════
    console.log("\n── (٣) أمرٌ موقوف يُصحَّح ──");
    const p3 = await mkPatient("مريض موقوف");
    const wo3 = await mkOrder(p3);
    const held = await req("POST", `/api/manufacturing/orders/${wo3.id}/hold`, S.expert,
      { status: "waiting_materials", reasonCode: "materials_unavailable" });
    same("(الإعداد) الأمرُ موقوف", [held.status, (await order(wo3.id)).status], [200, "waiting_materials"]);
    const fx3 = await fix(wo3.id, { toStage: "measurements", reason: "تصحيح" });
    const o3 = await order(wo3.id);
    same("١٤. **التصحيحُ يعيده إلى العمل**", [fx3.status, o3.currentStage, o3.status], [200, "measurements", "active"]);
    same("١٥. **والعذرُ المكتوب يبقى** (قرارُ المالك ٢٠٢٦-٠٩-٢٤)", o3.holdReasonCode, "materials_unavailable");

    // ══ والتسليمُ الإداريّ: مكتملٌ وبلا رسالة ═════════════════════════════
    console.log("\n── التسليمُ بالتصحيح ──");
    const ob3 = (await outbox(p2)).length;
    const del = await fix(wo2.id, { toStage: "delivered", reason: "سُلِّم ولم يُسجَّل", finalResult: "first_fit_success" });
    const o4 = await order(wo2.id);
    same("١٦. التسليمُ الإداريّ يُكمل الأمر بلا رسالة",
      [del.status, o4.currentStage, o4.status, (await outbox(p2)).length - ob3], [200, "delivered", "completed", 0]);
  } finally {
    server.close();
    await cleanup();
    await pool.query(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ all admin-stage-correction cases pass" : `\n❌ ${failures} case(s) failed`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
