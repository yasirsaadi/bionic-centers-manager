// اختبار الترحيلة 046 — يحاكي حادثة 2026-08-10 حرفياً.
//
// السيناريو الحقيقي: قاعدة **مرّت عليها 045 بالفعل** (فلن تعمل ثانيةً)، ثم
// ظلّ الكود القديم يخدم فوقها فكتب قيماً قديمة من جديد. الاختبار يزرع تلك
// القيم بعد الترحيل — كما فعل الإنتاج تماماً — ثم يشغّل 046 وحدها.
//
// قاعدة محلّية فقط: `npm run test:legacy-catchup`.

import { pool } from "../db";
import { runMigrations } from "./runner";
import { sql as sql046, name as name046 } from "./046_manufacturing_legacy_catchup";

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

const MARK = "اختبار-التقاط-القديم-046";
const EXPERT = 9401;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mkPatient(name: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition, branch_id, is_amputee)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true) RETURNING id`, [name, MARK]);
  return rows[0].id;
}

/** أمرٌ يُكتب **بعد** الترحيل بقيمٍ قديمة — كما فعل الكود القديم على الإنتاج. */
async function mkLegacyOrder(
  stage: string, status: string, serviceType = "prosthetic", purpose = "initial_build",
): Promise<number> {
  const patientId = await mkPatient(`${purpose}/${serviceType}/${stage}`);
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders
       (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage, assigned_by)
     VALUES ($1,1,$2,$3,$4,$5,$6,$2) RETURNING id`,
    [patientId, EXPERT, serviceType, purpose, status, stage]);
  return rows[0].id;
}

async function row(id: number) {
  const { rows } = await pool.query(
    `SELECT current_stage, status, completed_at, final_result, final_notes,
            started_at, expected_delivery_date
       FROM prosthetic_work_orders WHERE id = $1`, [id]);
  return rows[0];
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await pool.query(
    `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
     VALUES ($1,'lc_expert','x','خبير','prosthetics_expert',1,'[1]'::jsonb,true)
     ON CONFLICT (id) DO NOTHING`, [EXPERT]);

  // ══ ١. قاعدة مرّت عليها كل الترحيلات — ومنها 045 ═══════════════════════
  await runMigrations();
  const applied = await pool.query(`SELECT 1 FROM _migrations WHERE name = '045_manufacturing_simplified_stages'`);
  check(applied.rowCount === 1, "045 مسجَّلة — فلن تعمل ثانيةً (كحال الإنتاج)");
  await cleanup();

  // ══ ٢. الكود القديم يكتب قيماً قديمة **بعد** الترحيل ═══════════════════
  console.log("\n── قيمٌ قديمة كُتبت بعد 045 ──");

  // الصفّ الحقيقي الذي وجده الفحص على الإنتاج.
  const real = await mkLegacyOrder("socket_adjustment", "needs_resocket");

  // مراحل الأطراف القديمة كلّها.
  const prosthetic: [string, string][] = [
    ["new_assignment", "order_received"],
    ["assessment_measurements", "measurements"],
    ["cast_taken", "mold"],
    ["cast_preparation", "mold"],
    ["test_socket", "manufacturing"],
    ["first_fitting", "manufacturing"],
    ["socket_adjustment", "manufacturing"],
    ["alignment", "manufacturing"],
    ["final_socket", "manufacturing"],
    ["final_assembly", "manufacturing"],
    ["quality_check", "manufacturing"],
    ["ready_for_delivery", "ready_for_fitting"],
    ["delivered", "delivered"],
    ["post_delivery_followup", "delivered"],
  ];
  const pIds: [number, string, string][] = [];
  for (const [from, want] of prosthetic) {
    pIds.push([await mkLegacyOrder(from, "active"), from, want]);
  }

  // مراحل المساند القديمة كلّها.
  const support: [string, string][] = [
    ["new_assignment", "order_received"],
    ["assessment_measurements", "measurements"],
    ["cast_if_needed", "mold"],
    ["manufacturing", "manufacturing"],
    ["fitting", "manufacturing"],
    ["adjustment", "manufacturing"],
    ["quality_check", "manufacturing"],
    ["ready_for_delivery", "ready_for_fitting"],
    ["delivered", "delivered"],
  ];
  const sIds: [number, string, string][] = [];
  for (const [from, want] of support) {
    sIds.push([await mkLegacyOrder(from, "active", "medical_support"), from, want]);
  }

  // الحالات القديمة الثلاث.
  const statuses: [string, string][] = [
    ["waiting_components", "waiting_materials"],
    ["needs_recast", "technical_rework"],
    ["needs_resocket", "technical_rework"],
  ];
  const stIds: [number, string, string][] = [];
  for (const [from, want] of statuses) {
    stIds.push([await mkLegacyOrder("mold", from), from, want]);
  }

  // ── الصيانة: لا تُمَسّ. وأخصّها الحالة التاريخية التي استثنتها 022 ──
  const maintDelivered = await mkLegacyOrder("delivered", "completed", "prosthetic", "maintenance");
  await pool.query(
    `UPDATE prosthetic_work_orders
        SET completed_at = NOW(), final_result = 'first_fit_success',
            final_notes = 'ملاحظة', started_at = NOW(), expected_delivery_date = '2026-09-01'
      WHERE id = $1`, [maintDelivered]);
  const maintBefore = await row(maintDelivered);
  // وأمر صيانة بمرحلةٍ من خطّ البناء القديم — يجب ألّا يتحوّل أيضاً.
  const maintLegacy = await mkLegacyOrder("test_socket", "active", "prosthetic", "maintenance");

  // ── سجلٌّ بأكوادٍ قديمة: يجب ألّا يُمسّ بحرف ──
  await pool.query(
    `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, notes)
     VALUES ($1,'stage_change','test_socket','socket_adjustment','سجلّ قديم')`, [real]);
  const histBefore = await pool.query(
    `SELECT from_stage, to_stage, notes FROM prosthetic_work_history WHERE work_order_id = $1`, [real]);

  // ══ ٣. تشغيل 046 وحدها ════════════════════════════════════════════════
  console.log("\n── بعد تشغيل 046 ──");
  await pool.query(sql046);

  same("الصفّ الحقيقي: socket_adjustment + needs_resocket",
    [(await row(real)).current_stage, (await row(real)).status],
    ["manufacturing", "technical_rework"]);

  for (const [id, from, want] of pIds) {
    same(`أطراف: ${from} ⇒ ${want}`, (await row(id)).current_stage, want);
  }
  for (const [id, from, want] of sIds) {
    same(`مساند: ${from} ⇒ ${want}`, (await row(id)).current_stage, want);
  }
  for (const [id, from, want] of stIds) {
    same(`حالة: ${from} ⇒ ${want}`, (await row(id)).status, want);
  }

  console.log("\n── الصيانة لم تُمَسّ ──");
  const maintAfter = await row(maintDelivered);
  same("maintenance/delivered/completed كما هي",
    [maintAfter.current_stage, maintAfter.status], ["delivered", "completed"]);
  same("ولا حقولها النهائية تغيّرت",
    [String(maintAfter.completed_at), maintAfter.final_result, maintAfter.final_notes,
     String(maintAfter.started_at), String(maintAfter.expected_delivery_date)],
    [String(maintBefore.completed_at), maintBefore.final_result, maintBefore.final_notes,
     String(maintBefore.started_at), String(maintBefore.expected_delivery_date)]);
  same("وأمر صيانة بمرحلة بناء قديمة لم يتحوّل",
    (await row(maintLegacy)).current_stage, "test_socket");

  console.log("\n── السجلّ لم يُمَسّ ──");
  const histAfter = await pool.query(
    `SELECT from_stage, to_stage, notes FROM prosthetic_work_history WHERE work_order_id = $1`, [real]);
  same("بأسمائه القديمة حرفياً", histAfter.rows, histBefore.rows);

  // ══ ٤. التكرار لا يغيّر شيئاً ══════════════════════════════════════════
  console.log("\n── تشغيلٌ ثانٍ: idempotent ──");
  const snapshot = await pool.query(
    `SELECT id, current_stage, status FROM prosthetic_work_orders
      WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)
      ORDER BY id`, [MARK]);
  await pool.query(sql046);
  const after2 = await pool.query(
    `SELECT id, current_stage, status FROM prosthetic_work_orders
      WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)
      ORDER BY id`, [MARK]);
  same("لا صفّ تغيّر", after2.rows, snapshot.rows);
  const hist3 = await pool.query(
    `SELECT from_stage, to_stage, notes FROM prosthetic_work_history WHERE work_order_id = $1`, [real]);
  same("ولا السجلّ", hist3.rows, histBefore.rows);

  // ══ ٥. ولا كودَ قديمٍ باقٍ على خطّ البناء ══════════════════════════════
  const leftovers = await pool.query(
    `SELECT current_stage, status FROM prosthetic_work_orders
      WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)
        AND COALESCE(purpose,'initial_build') = 'initial_build'
        AND (current_stage NOT IN ('order_received','measurements','mold',
                                   'manufacturing','ready_for_fitting','delivered')
          OR status IN ('waiting_components','needs_recast','needs_resocket'))`, [MARK]);
  same("لا بقايا في البناء الأوّلي", leftovers.rows, []);

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = $1`, [EXPERT]);
  console.log(failures === 0 ? "\n✅ all legacy-catchup cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
