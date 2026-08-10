// مسار التصنيع المبسَّط — اختبار حيّ على Postgres عبر النقاط الحقيقية.
// يحتاج قاعدة محلية: `npm run test:workflow`.
//
// يغطّي ما لا يُثبَت إلا على قاعدة ونقاط حقيقية: ترحيل الأوامر المفتوحة،
// وأن التوقّف لا يحرّك المرحلة، وأن الرجوع لا يقع إلا بإعادة عمل مسجَّلة،
// وأن السجلّ القديم لم يُفقَد.

import express from "express";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import { runMigrations } from "../migrations/runner";
import { prostheticWorkOrders as WO, prostheticWorkHistory as WH, prostheticReworkEvents as RW } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

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

const PORT = 6789;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مسار-التصنيع";
const EXPERT = 9301, MANAGER = 9302;

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
  return rows[0].id;
}
/** أمر مباشر في القاعدة — يتيح زرع أكواد قديمة لاختبار الترحيل. */
async function mkOrder(patientId: number, stage: string, status = "active", serviceType = "prosthetic", purpose = "initial_build") {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage, assigned_by)
     VALUES ($1,1,$2,$3,$4,$5,$6,$2) RETURNING id`, [patientId, EXPERT, serviceType, purpose, status, stage]);
  return rows[0].id;
}
async function order(id: number) {
  const [o] = await db.select().from(WO).where(eq(WO.id, id));
  return o;
}
async function history(id: number) {
  return db.select().from(WH).where(eq(WH.workOrderId, id)).orderBy(WH.id);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  // المخرج الإداري يكتب في audit_log باسم المستخدم، فيمنع حذفه بعد الاختبار.
  await pool.query(`DELETE FROM audit_log WHERE user_id IN ($1,$2)`, [EXPERT, MANAGER]);
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, name, role] of [[EXPERT, "عناد", "prosthetics_expert"], [MANAGER, "مدير", "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `wf_u${id}`, name, role]);
  }
  await cleanup();

  // ══ ١. الترحيل ═════════════════════════════════════════════════════════
  console.log("\n── ترحيل الأوامر المفتوحة إلى الأكواد الست ──");
  const p1 = await mkPatient("مريض الترحيل");
  // أوامر بأكواد قديمة، تُزرع ثم يُعاد تشغيل الترحيل عليها.
  const legacy: [string, string, string, string][] = [
    ["new_assignment", "active", "prosthetic", "order_received"],
    ["assessment_measurements", "active", "prosthetic", "measurements"],
    ["cast_preparation", "waiting_components", "prosthetic", "mold"],
    ["test_socket", "needs_recast", "prosthetic", "manufacturing"],
    ["alignment", "needs_resocket", "prosthetic", "manufacturing"],
    ["quality_check", "active", "prosthetic", "manufacturing"],
    ["ready_for_delivery", "active", "prosthetic", "ready_for_fitting"],
    ["post_delivery_followup", "completed", "prosthetic", "delivered"],
    ["cast_if_needed", "active", "medical_support", "mold"],
    ["fitting", "active", "medical_support", "manufacturing"],
    ["adjustment", "waiting_components", "medical_support", "manufacturing"],
  ];
  const seeded: { id: number; want: string; oldStage: string; oldStatus: string }[] = [];
  for (const [stage, status, svc, want] of legacy) {
    // كل أمر لمريض مستقلّ: قيد «أمر نشط واحد لكل خدمة» يمنع تكديسها.
    const p = await mkPatient(`مرحَّل ${stage}`);
    seeded.push({ id: await mkOrder(p, stage, status, svc), want, oldStage: stage, oldStatus: status });
  }
  // أمر صيانة — يجب ألّا يُمسّ.
  const pm = await mkPatient("مريض صيانة");
  const maintId = await mkOrder(pm, "new_assignment", "active", "prosthetic", "maintenance");
  // وسجلّ تاريخي بأكواد قديمة — يجب أن ينجو حرفياً.
  await pool.query(
    `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, notes)
     VALUES ($1,'stage_change','test_socket','alignment','سجلّ قديم')`, [seeded[3].id]);

  await pool.query(`DELETE FROM _migrations WHERE name = '045_manufacturing_simplified_stages'`);
  await runMigrations();

  for (const s of seeded) {
    same(`${s.oldStage} ⇒ ${s.want}`, (await order(s.id)).currentStage, s.want);
  }
  same("waiting_components ⇒ waiting_materials",
    (await order(seeded[2].id)).status, "waiting_materials");
  same("needs_recast ⇒ technical_rework", (await order(seeded[3].id)).status, "technical_rework");
  same("needs_resocket ⇒ technical_rework", (await order(seeded[4].id)).status, "technical_rework");
  same("المكتمل حُوِّل ولم تتغيّر حالته", [(await order(seeded[7].id)).currentStage, (await order(seeded[7].id)).status], ["delivered", "completed"]);
  same("أمر الصيانة لم يُمسّ", (await order(maintId)).currentStage, "new_assignment");

  const oldHistory = await pool.query(
    `SELECT from_stage, to_stage, notes FROM prosthetic_work_history WHERE work_order_id = $1 AND notes = 'سجلّ قديم'`,
    [seeded[3].id]);
  same("السجلّ القديم نجا بأسمائه الأصلية",
    oldHistory.rows[0], { from_stage: "test_socket", to_stage: "alignment", notes: "سجلّ قديم" });

  // ══ ٢. النقاط الحيّة ═══════════════════════════════════════════════════
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.headers["x-test-session"];
    req.session = h ? { branchSession: JSON.parse(h as string) } : {};
    next();
  });
  registerManufacturingRoutes(app, isAuthenticated as any);
  const server = app.listen(PORT);
  await new Promise((r) => setTimeout(r, 300));

  try {
    console.log("\n── التقدّم: التالية فقط ──");
    const p2 = await mkPatient("مريض المسار");
    const oid = await mkOrder(p2, "order_received");

    let r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, { toStage: "manufacturing" });
    same("القفز إلى التصنيع مرفوض", r.status, 400);
    same("والمرحلة لم تتغيّر", (await order(oid)).currentStage, "order_received");

    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});
    same("التقدّم بلا وجهة ⇒ التالية", (await order(oid)).currentStage, "measurements");
    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});
    same("ثم القالب", (await order(oid)).currentStage, "measurements");
    same("والموعد إلزامي عند القالب", r.status, 400);
    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, { expectedDeliveryDate: "2026-12-01" });
    same("ومع الموعد ينجح", [(await order(oid)).currentStage, String((await order(oid)).expectedDeliveryDate)], ["mold", "2026-12-01"]);

    console.log("\n── التوقّف لا يغيّر المرحلة ──");
    for (const [status, reason] of [["waiting_patient", "patient_no_show"], ["waiting_materials", "materials_unavailable"], ["medical_hold", "swelling"]] as const) {
      const before = (await order(oid)).currentStage;
      r = await req("POST", `/api/manufacturing/orders/${oid}/hold`, S.expert, { status, reasonCode: reason, note: "ملاحظة داخلية" });
      const after = await order(oid);
      same(`${status}: الحالة تغيّرت`, after.status, status);
      same(`${status}: والمرحلة كما هي`, after.currentStage, before);
      same(`${status}: والسبب مسجَّل`, after.holdReasonCode, reason);
      // ونقطة التفاصيل تُخرجه فعلاً — بطاقة «متوقّف» في صفحة الأمر تقرأ منها،
      // وحذف العمودين من الـ select كان سيُخفي السبب بلا أن يفشل شيء.
      const detail = (await req("GET", `/api/manufacturing/orders/${oid}`, S.expert)).json;
      same(`${status}: ونقطة التفاصيل تُخرج السبب`,
        [detail.order.holdReasonCode, detail.order.holdNote], [reason, "ملاحظة داخلية"]);
      // إلغاء التوقّف
      r = await req("POST", `/api/manufacturing/orders/${oid}/resume`, S.expert, {});
      const resumed = await order(oid);
      same(`${status}: الاستئناف يعيد active`, resumed.status, "active");
      same(`${status}: والمرحلة ما زالت كما هي`, resumed.currentStage, before);
      same(`${status}: والسبب أُفرغ`, [resumed.holdReasonCode, resumed.holdNote], [null, null]);
    }
    r = await req("POST", `/api/manufacturing/orders/${oid}/hold`, S.expert, { status: "medical_hold", reasonCode: "patient_no_show" });
    same("سبب لا يخصّ النوع مرفوض", r.status, 400);

    console.log("\n── إعادة العمل الفني: الرجوع الوحيد ──");
    await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});   // manufacturing
    await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});   // ready_for_fitting
    same("وصل جاهز للتجربة", (await order(oid)).currentStage, "ready_for_fitting");

    r = await req("POST", `/api/manufacturing/orders/${oid}/hold`, S.expert, { status: "technical_rework", reasonCode: "socket_fit" });
    same("إعادة عمل بلا مرحلة رجوع مرفوضة", r.status, 400);
    r = await req("POST", `/api/manufacturing/orders/${oid}/hold`, S.expert, { status: "technical_rework", reasonCode: "socket_fit", returnToStage: "delivered" });
    same("والرجوع إلى مرحلة لاحقة مرفوض", r.status, 400);

    r = await req("POST", `/api/manufacturing/orders/${oid}/hold`, S.expert, {
      status: "technical_rework", reasonCode: "socket_fit", returnToStage: "manufacturing", note: "السوكت ضيّق",
    });
    const reworked = await order(oid);
    same("الرجوع تمّ", reworked.currentStage, "manufacturing");
    same("والحالة إعادة عمل فني", reworked.status, "technical_rework");
    same("والسبب مسجَّل", reworked.holdReasonCode, "socket_fit");

    const rwRows = await db.select().from(RW).where(eq(RW.workOrderId, oid));
    same("صفّ إعادة عمل واحد", rwRows.length, 1);
    same("نوعه الجديد", rwRows[0].reworkType, "technical_rework");
    same("ويحفظ المرحلة التي اكتُشف فيها", rwRows[0].stageWhenDetected, "ready_for_fitting");
    same("والملاحظة الداخلية", rwRows[0].reasonDetails, "السوكت ضيّق");

    const hist = await history(oid);
    const rwHist = hist.filter((h) => h.actionType === "rework");
    same("والسجلّ يوثّق الرجوع", [rwHist[0].fromStage, rwHist[0].toStage], ["ready_for_fitting", "manufacturing"]);
    check((rwHist[0].notes ?? "").includes("socket_fit"), "ومعه السبب", rwHist[0].notes ?? "");

    console.log("\n── التقدّم بعد الرجوع يعيد active ──");
    await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});
    const advanced = await order(oid);
    same("عاد للعمل", advanced.status, "active");
    same("وتقدّم", advanced.currentStage, "ready_for_fitting");
    same("والسبب أُفرغ", advanced.holdReasonCode, null);

    console.log("\n── التسليم يتطلّب نتيجة ──");
    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});
    same("بلا نتيجة مرفوض", r.status, 400);
    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, { finalResult: "first_fit_success" });
    const delivered = await order(oid);
    same("سُلِّم", [delivered.currentStage, delivered.status], ["delivered", "completed"]);
    r = await req("PATCH", `/api/manufacturing/orders/${oid}/advance`, S.expert, {});
    same("ولا تقدّم بعد الانتهاء", r.status, 409);

    console.log("\n── المخرج الإداري ──");
    const p3 = await mkPatient("مريض المخرج");
    const oid3 = await mkOrder(p3, "manufacturing");
    r = await req("PATCH", `/api/manufacturing/orders/${oid3}/stage`, S.expert, { toStage: "measurements", reason: "خطأ" });
    same("الخبير لا يملك المخرج الإداري", r.status, 403);
    r = await req("PATCH", `/api/manufacturing/orders/${oid3}/stage`, S.manager, { toStage: "measurements" });
    same("والمدير بلا سبب مرفوض", r.status, 400);
    r = await req("PATCH", `/api/manufacturing/orders/${oid3}/stage`, S.manager, { toStage: "measurements", reason: "تصحيح إدخال" });
    same("وبالسبب ينجح", (await order(oid3)).currentStage, "measurements");

    console.log("\n── مسند لا يحتاج قالباً ──");
    const p4 = await mkPatient("مريض مسند");
    const oid4 = await mkOrder(p4, "measurements", "active", "medical_support");
    r = await req("PATCH", `/api/manufacturing/orders/${oid4}/advance`, S.expert, { toStage: "manufacturing", expectedDeliveryDate: "2026-12-05" });
    same("تخطّى القالب إلى التصنيع", (await order(oid4)).currentStage, "manufacturing");
    const p5 = await mkPatient("مريض أطراف");
    const oid5 = await mkOrder(p5, "measurements");
    r = await req("PATCH", `/api/manufacturing/orders/${oid5}/advance`, S.expert, { toStage: "manufacturing", expectedDeliveryDate: "2026-12-05" });
    same("والأطراف لا تتخطّاه", r.status, 400);

    // ── الصيانة: دورتها القصيرة لم تُمسّ، واختيار ما أُنجِز باقٍ ─────────────
    // الصيانة اختيارٌ لا تسلسل: مَن صلّح الطرف يصل إلى خطوته مباشرة، ولا
    // يُجبَر على تسجيل صيانة قالب لم تحدث.
    console.log("\n── الصيانة لم تُمسّ ──");
    const p6 = await mkPatient("مريض صيانة");
    const oid6 = await mkOrder(p6, "new_assignment", "active", "prosthetic", "maintenance");
    same("تبدأ من إسناد جديد", (await order(oid6)).currentStage, "new_assignment");
    r = await req("PATCH", `/api/manufacturing/orders/${oid6}/advance`, S.expert, { toStage: "maintenance_device_done" });
    const maint = await order(oid6);
    same("صيانة الطرف مباشرةً بلا المرور على القالب", maint.currentStage, "maintenance_device_done");
    same("وتُنهي الأمر", maint.status, "completed");
    same("ولم يُطلب منها موعد تسليم", r.status, 200);
  } finally {
    server.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id IN ($1,$2)`, [EXPERT, MANAGER]);
  console.log(failures === 0 ? "\n✅ all workflow cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
