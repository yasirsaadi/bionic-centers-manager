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
import * as store from "./store";
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

const EXPERT2 = 9303, MANAGER2 = 9304, ADMIN = 9305, RECEPTION = 9306;

const S = {
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: {} },
  manager: { userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true } },
  // خبير آخر في الفرع نفسه — لا يمسّ وعد زميله.
  expert2: { userId: EXPERT2, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: {} },
  // مدير فرعٍ آخر — العزل الفرعي القائم يمنعه.
  manager2: { userId: MANAGER2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2], permissions: { canViewPatients: true } },
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [], permissions: {} },
  reception: { userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true } },
};

/** تاريخ بصيغة YYYY-MM-DD مزاحٌ بأيام عن «اليوم» ببغداد — أساس التنبيهات. */
function baghdadDate(offsetDays: number): string {
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
  const d = new Date(today + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

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
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
    [[EXPERT, MANAGER, EXPERT2, MANAGER2, ADMIN, RECEPTION]]);
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  const users: [number, string, string, number][] = [
    [EXPERT, "عناد", "prosthetics_expert", 1],
    [MANAGER, "مدير", "branch_manager", 1],
    [EXPERT2, "خبير آخر", "prosthetics_expert", 1],
    [MANAGER2, "مدير كربلاء", "branch_manager", 2],
    [ADMIN, "المسؤول", "admin", 1],
    [RECEPTION, "استقبال", "reception", 1],
  ];
  for (const [id, name, role, branch] of users) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `wf_u${id}`, name, role, branch, JSON.stringify([branch])]);
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

    // ══ موعد التسليم: مَن يملكه، وكيف يُسجَّل ═══════════════════════════════
    console.log("\n── صلاحيات موعد التسليم ──");
    const pd = await mkPatient("مريض الموعد");
    const oidD = await mkOrder(pd, "measurements");
    const D1 = baghdadDate(20), D2 = baghdadDate(25);

    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert2, { expectedDeliveryDate: D1 });
    same("خبير غير مسنَد ممنوع", r.status, 403);
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.reception, { expectedDeliveryDate: D1 });
    same("والاستقبال ممنوع", r.status, 403);
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.manager2, { expectedDeliveryDate: D1 });
    same("ومدير فرعٍ آخر ممنوع", r.status, 403);

    // أول تحديد: بلا سبب، ومع ذلك يُسجَّل.
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert, { expectedDeliveryDate: D1 });
    same("الخبير المسنَد يحدّد الموعد أولاً بلا سبب", r.status, 200);
    same("والموعد ثُبِّت", String((await order(oidD)).expectedDeliveryDate).slice(0, 10), D1);
    {
      const rows = (await history(oidD)).filter((h) => h.actionType === "date_change");
      same("وسُجِّل سطر واحد", rows.length, 1);
      check(!!rows[0].notes?.includes("تم تحديد موعد التسليم المتوقع"), "بصيغة «تحديد» لا «تغيير»", rows[0].notes ?? "");
      check(!!rows[0].notes?.includes(D1), "ويحمل الموعد");
      same("وبمَن فعله", rows[0].performedBy, EXPERT);
      check(!!rows[0].createdAt, "وبوقته");
    }

    // تغيير موعدٍ قائم: السبب إلزامي، والمطابق مرفوض.
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert, { expectedDeliveryDate: D2 });
    same("التغيير بلا سبب مرفوض", r.status, 400);
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert, { expectedDeliveryDate: D1, reason: "بلا تغيير" });
    same("والمطابق للحالي مرفوض", r.status, 400);
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert2, { expectedDeliveryDate: D2, reason: "محاولة" });
    same("وخبير غير مسنَد ممنوع ولو بسبب", r.status, 403);

    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.expert,
      { expectedDeliveryDate: D2, reason: "تأخر وصول المكونات من الشركة المصنعة" });
    same("وبالسبب ينجح", r.status, 200);
    {
      const rows = (await history(oidD)).filter((h) => h.actionType === "date_change");
      same("والسطر الأول لم يُمسّ", rows.length, 2);
      const last = rows[1].notes ?? "";
      check(last.includes(D1) && last.includes(D2), "والسطر الجديد يحمل الموعدين", last);
      check(last.includes("تأخر وصول المكونات من الشركة المصنعة"), "ومعه السبب", last);
      same("والمرحلة لم تتحرّك بتغيير الموعد", [rows[1].fromStage, rows[1].toStage], ["measurements", "measurements"]);
    }
    // ونقطة التفاصيل تُخرجه مفكَّكاً — لا يقرأ الموظف نصّاً ليعرف الموعدين.
    {
      const detail = (await req("GET", `/api/manufacturing/orders/${oidD}`, S.expert)).json;
      same("سجلّ الموعد في نقطة التفاصيل", detail.dateChanges.length, 2);
      same("أول تحديد بلا موعد سابق",
        [detail.dateChanges[0].previousDate, detail.dateChanges[0].newDate], [null, D1]);
      same("والتغيير مفكَّك",
        [detail.dateChanges[1].previousDate, detail.dateChanges[1].newDate, detail.dateChanges[1].reason],
        [D1, D2, "تأخر وصول المكونات من الشركة المصنعة"]);
      check(!!detail.dateChanges[1].byName && !!detail.dateChanges[1].at, "ومعه مَن ومتى");
    }
    // المدير في فرعه، والمسؤول في كل فرع.
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.manager,
      { expectedDeliveryDate: baghdadDate(26), reason: "قرار إداري" });
    same("مدير الفرع يغيّره داخل فرعه", r.status, 200);
    r = await req("PATCH", `/api/manufacturing/orders/${oidD}/delivery-date`, S.admin,
      { expectedDeliveryDate: baghdadDate(27), reason: "تصحيح" });
    same("والمسؤول كذلك", r.status, 200);

    // الالتزام الأشيع بالموعد يقع في نافذة القالب لا في نافذة الموعد.
    {
      const pm2 = await mkPatient("مريض موعد القالب");
      const oidM = await mkOrder(pm2, "measurements");
      const DM = baghdadDate(30);
      r = await req("PATCH", `/api/manufacturing/orders/${oidM}/advance`, S.expert, { expectedDeliveryDate: DM });
      same("بلوغ القالب يثبّت الموعد", r.status, 200);
      const rows = (await history(oidM)).filter((h) => h.actionType === "date_change");
      same("ويُسجَّل في سجلّ المواعيد أيضاً", rows.length, 1);
      check(!!rows[0].notes?.includes(DM), "بالموعد نفسه", rows[0].notes ?? "");
      same("وبمَن فعله", rows[0].performedBy, EXPERT);
      // ولا يتكرّر: التقدّم التالي لا يعيد تسجيل موعدٍ مثبَّت أصلاً.
      await req("PATCH", `/api/manufacturing/orders/${oidM}/advance`, S.expert, { expectedDeliveryDate: baghdadDate(40) });
      same("ولا يُسجَّل مرّتين", (await history(oidM)).filter((h) => h.actionType === "date_change").length, 1);
      same("والموعد الأول هو الملزِم", String((await order(oidM)).expectedDeliveryDate).slice(0, 10), DM);
    }

    // ══ التزامن: السجلّ يطابق ما جرى في القاعدة، لا ما ظنّه الكاتب ═════════
    console.log("\n── تعارض تغيير موعد قائم ──");
    {
      const pc = await mkPatient("مريض التزامن");
      const oidC = await mkOrder(pc, "measurements");
      const B0 = "2026-08-20", A1 = "2026-08-25", B1 = "2026-08-28";
      await req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.expert,
        { expectedDeliveryDate: B0, ifCurrentDate: null });

      // كاتبان **متزامنان فعلاً**، كلاهما بُني على الموعد نفسه.
      const [ra, rb] = await Promise.all([
        req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.expert,
          { expectedDeliveryDate: A1, reason: "سبب أ", ifCurrentDate: B0 }),
        req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.manager,
          { expectedDeliveryDate: B1, reason: "سبب ب", ifCurrentDate: B0 }),
      ]);
      const codes = [ra.status, rb.status].sort();
      same("واحد ينجح والآخر يتعارض", codes, [200, 409]);
      const winner = ra.status === 200 ? A1 : B1;
      const loser = ra.status === 200 ? B1 : A1;
      same("والموعد في القاعدة هو موعد الفائز",
        String((await order(oidC)).expectedDeliveryDate).slice(0, 10), winner);

      const rows = (await history(oidC)).filter((h) => h.actionType === "date_change");
      same("سطران فقط: التحديد الأول وتغييرٌ واحد", rows.length, 2);
      check(!!rows[1].notes?.includes(B0) && !!rows[1].notes?.includes(winner),
        "والسطر يوثّق الانتقال الحقيقي", rows[1].notes ?? "");
      // الادّعاء الكاذب الذي كان ممكناً: «من 20 إلى موعد الخاسر».
      check(!rows.some((h) => h.notes?.includes(loser)),
        "ولا أثر لموعد الخاسر إطلاقاً — لا سطر كاذب");

      // وبعد التحديث يمرّ التغيير الثاني موثّقاً من الموعد الحقيقي.
      const r2 = await req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.manager,
        { expectedDeliveryDate: loser, reason: "بعد التحديث", ifCurrentDate: winner });
      same("والمحاولة بعد التحديث تنجح", r2.status, 200);
      const rows2 = (await history(oidC)).filter((h) => h.actionType === "date_change");
      check(!!rows2[2].notes?.includes(winner) && !!rows2[2].notes?.includes(loser),
        "وتوثّق الانتقال من موعد الفائز", rows2[2].notes ?? "");

      // وطلبٌ قديم لا يعرف ما جرى يُردّ ولا يمسّ شيئاً.
      const stale = await req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.expert,
        { expectedDeliveryDate: "2026-09-09", reason: "قديم", ifCurrentDate: B0 });
      same("والطلب القديم يُردّ ٤٠٩", stale.status, 409);
      same("ويُعلِم المستخدم بالموعد الحقيقي", stale.json?.currentDate, loser);
      same("ولم يُكتب سطر للتعارض",
        (await history(oidC)).filter((h) => h.actionType === "date_change").length, 3);
      same("والموعد لم يتحرّك", String((await order(oidC)).expectedDeliveryDate).slice(0, 10), loser);

      // «تغيير» إلى الموعد نفسه ليس تغييراً — ولا يُترك ليكتب سطراً فارغاً.
      const noop = await req("PATCH", `/api/manufacturing/orders/${oidC}/delivery-date`, S.expert,
        { expectedDeliveryDate: loser, reason: "بلا فائدة", ifCurrentDate: loser });
      same("والتغيير إلى الموعد نفسه مرفوض", noop.status, 400);
      same("وبلا سطر جديد",
        (await history(oidC)).filter((h) => h.actionType === "date_change").length, 3);
    }

    console.log("\n── تعارض أول التزام بالموعد ──");
    {
      // كاتبان يلتزمان **بالتاريخ نفسه** في اللحظة نفسها: المقارنة بالقيمة
      // كانت ستجعل كليهما يظنّ أنه الفائز ويكتب سطراً.
      const pf = await mkPatient("مريض أول التزام");
      const oidF = await mkOrder(pf, "measurements");
      const SAME = "2026-08-30";
      const [fa, fb] = await Promise.all([
        req("PATCH", `/api/manufacturing/orders/${oidF}/delivery-date`, S.expert,
          { expectedDeliveryDate: SAME, ifCurrentDate: null }),
        req("PATCH", `/api/manufacturing/orders/${oidF}/delivery-date`, S.manager,
          { expectedDeliveryDate: SAME, ifCurrentDate: null }),
      ]);
      same("واحد يلتزم والآخر يتعارض", [fa.status, fb.status].sort(), [200, 409]);
      same("وموعد واحد نهائي", String((await order(oidF)).expectedDeliveryDate).slice(0, 10), SAME);
      const rows = (await history(oidF)).filter((h) => h.actionType === "date_change");
      same("وسطر التزام واحد لا سطران", rows.length, 1);
      same("وباسم الفائز وحده", rows[0].performedBy, fa.status === 200 ? EXPERT : MANAGER);

      // ونفس السباق عبر «بلوغ القالب»: الخاسر يمضي في نقل المرحلة، ولا
      // يدّعي التزاماً ليس له.
      const pg = await mkPatient("مريض قالب متزامن");
      const oidG = await mkOrder(pg, "measurements");
      await Promise.all([
        req("PATCH", `/api/manufacturing/orders/${oidG}/advance`, S.expert, { expectedDeliveryDate: SAME }),
        req("PATCH", `/api/manufacturing/orders/${oidG}/advance`, S.manager, { expectedDeliveryDate: SAME }),
      ]);
      same("المرحلة تقدّمت", (await order(oidG)).currentStage, "mold");
      same("وسطر التزام واحد رغم تزامن الكاتبين",
        (await history(oidG)).filter((h) => h.actionType === "date_change").length, 1);
    }

    // ══ تزامن حالة الأمر نفسه ══════════════════════════════════════════════
    // القفل يسلسل الطلبات زمنياً لكنه لا يُبطل طلباً بُني على حالٍ زالت:
    // الثاني ينتظر ثم ينفّذ بمعطياته هو. هنا نتأكّد أنه يُردّ بدلاً منها.
    const stageRows = async (id: number) =>
      (await history(id)).filter((h) => h.actionType === "stage_change");
    const dateRows = async (id: number) =>
      (await history(id)).filter((h) => h.actionType === "date_change");

    console.log("\n── تقدّم متزامن على المرحلة نفسها ──");
    {
      const pa = await mkPatient("مريض تقدّم متزامن");
      const oidA = await mkOrder(pa, "measurements");
      const D = "2026-09-15";
      const [x, y] = await Promise.all([
        req("PATCH", `/api/manufacturing/orders/${oidA}/advance`, S.expert, { expectedDeliveryDate: D }),
        req("PATCH", `/api/manufacturing/orders/${oidA}/advance`, S.manager, { expectedDeliveryDate: D }),
      ]);
      same("واحد يتقدّم والآخر يتعارض", [x.status, y.status].sort(), [200, 409]);
      const conflict = x.status === 409 ? x : y;
      same("والتعارض يحمل الحال الحقيقي", [conflict.json?.currentStage, conflict.json?.status], ["mold", "active"]);
      same("والمرحلة القالب", (await order(oidA)).currentStage, "mold");
      const sr = await stageRows(oidA);
      same("سطر تقدّم واحد لا سطران", sr.length, 1);
      same("ومن القياسات إلى القالب", [sr[0].fromStage, sr[0].toStage], ["measurements", "mold"]);
      same("والتزام موعد واحد", (await dateRows(oidA)).length, 1);
    }

    console.log("\n── تقدّم مقابل إلغاء ──");
    {
      // الإلغاء أولاً: التقدّم المبنيّ على `active` لا يعيد الأمر للعمل.
      const pb = await mkPatient("مريض إلغاء ثم تقدّم");
      const oidB = await mkOrder(pb, "measurements");
      await req("POST", `/api/manufacturing/orders/${oidB}/cancel`, S.manager, { note: "قرار" });
      const late = await req("PATCH", `/api/manufacturing/orders/${oidB}/advance`, S.expert,
        { expectedDeliveryDate: "2026-09-16" });
      same("التقدّم بعد الإلغاء مرفوض", late.status, 409);
      const b = await order(oidB);
      same("والأمر باقٍ ملغى في مرحلته", [b.status, b.currentStage], ["cancelled", "measurements"]);
      same("وبلا سطر تقدّم", (await stageRows(oidB)).length, 0);

      // والعكس: تقدّمٌ ثم إلغاء — النتيجة ملغى، والسجلّ يصف الترتيب فعلاً.
      const pc2 = await mkPatient("مريض تقدّم ثم إلغاء");
      const oidB2 = await mkOrder(pc2, "measurements");
      await req("PATCH", `/api/manufacturing/orders/${oidB2}/advance`, S.expert, { expectedDeliveryDate: "2026-09-17" });
      const cancelled = await req("POST", `/api/manufacturing/orders/${oidB2}/cancel`, S.manager, { note: "بعد التقدّم" });
      same("الإلغاء بعد التقدّم ينجح", cancelled.status, 200);
      const b2 = await order(oidB2);
      same("والنتيجة ملغى عند القالب", [b2.status, b2.currentStage], ["cancelled", "mold"]);
      const cancelRow = (await history(oidB2)).filter((h) => h.notes?.includes("إلغاء الأمر"))[0];
      same("وسطر الإلغاء يسمّي المرحلة الجديدة لا القديمة",
        [cancelRow.fromStage, cancelRow.toStage], ["mold", "mold"]);
    }

    console.log("\n── تقدّم مقابل توقّف ──");
    {
      // ملاحظة منهجية: عبر HTTP لا يمكن **صنع** لقطة قديمة — المسار يعيد
      // القراءة مع كل طلب. فاللقطة القديمة تُحقن هنا في طبقة المخزن مباشرة،
      // وهي بالضبط ما ينتجه التزامن الحقيقي: طلبٌ قرأ ثم انتظر القفل.
      const pd2 = await mkPatient("مريض توقّف ثم تقدّم");
      const oidH = await mkOrder(pd2, "measurements");
      const staleSnap = await order(oidH);   // active @ measurements
      await req("POST", `/api/manufacturing/orders/${oidH}/hold`, S.expert,
        { status: "waiting_patient", reasonCode: "patient_no_show" });

      let rejected: any = null;
      try {
        await store.updateStage({
          order: staleSnap, toStage: "mold", deliveryDate: "2026-09-18",
          newStatus: "active", clearHold: true, performedBy: EXPERT,
        });
      } catch (e) { rejected = e; }
      check(rejected instanceof store.WorkOrderConflictError,
        "التقدّم المبنيّ على active مرفوض", String(rejected));
      same("ويُعلِم بالحال الحقيقي",
        [rejected?.currentStage, rejected?.status], ["measurements", "waiting_patient"]);
      const h = await order(oidH);
      same("والتوقّف باقٍ بسببه", [h.status, h.holdReasonCode], ["waiting_patient", "patient_no_show"]);
      same("وبلا سطر تقدّم", (await stageRows(oidH)).length, 0);
      same("ولم يُفرَغ سبب التوقّف", h.holdNote, null);

      // ونفس الحماية للإلغاء: لقطةٌ قديمة لا تُحيي أمراً أُلغي.
      const pd3 = await mkPatient("مريض إلغاء ولقطة قديمة");
      const oidX = await mkOrder(pd3, "measurements");
      const snapX = await order(oidX);
      await req("POST", `/api/manufacturing/orders/${oidX}/cancel`, S.manager, {});
      let rejX: any = null;
      try {
        await store.updateStage({
          order: snapX, toStage: "mold", deliveryDate: "2026-09-20",
          newStatus: "active", clearHold: true, performedBy: EXPERT,
        });
      } catch (e) { rejX = e; }
      check(rejX instanceof store.WorkOrderConflictError, "ولا تُحيي أمراً ملغى");
      same("والأمر باقٍ ملغى", (await order(oidX)).status, "cancelled");
      same("وبلا سطر تقدّم", (await stageRows(oidX)).length, 0);

      // والعكس: تقدّمٌ ثم توقّف — السجلّ يصف المرحلة الجديدة لا القديمة.
      const pe = await mkPatient("مريض تقدّم ثم توقّف");
      const oidH2 = await mkOrder(pe, "measurements");
      await req("PATCH", `/api/manufacturing/orders/${oidH2}/advance`, S.expert, { expectedDeliveryDate: "2026-09-19" });
      const held = await req("POST", `/api/manufacturing/orders/${oidH2}/hold`, S.expert,
        { status: "medical_hold", reasonCode: "swelling", note: "تورّم" });
      same("التوقّف بعد التقدّم ينجح", held.status, 200);
      const h2 = await order(oidH2);
      same("والأمر متوقّف عند القالب", [h2.status, h2.currentStage], ["medical_hold", "mold"]);
      const holdRow = (await history(oidH2)).filter((h) => h.notes?.startsWith("توقّف:"))[0];
      same("وسطر التوقّف يسمّي المرحلة الجديدة",
        [holdRow.fromStage, holdRow.toStage], ["mold", "mold"]);
    }

    console.log("\n── سباق حقيقي: تقدّم وتوقّف معاً ──");
    {
      // كلا الترتيبين مشروع؛ ما ليس مشروعاً هو أن يمرّا معاً فيلغي التقدّمُ
      // توقّفاً لم يره. لذلك نتحقّق من ثبات النتيجة أياً كان الفائز.
      const pf2 = await mkPatient("مريض سباق التوقّف");
      const oidR = await mkOrder(pf2, "measurements");
      const [adv, hld] = await Promise.all([
        req("PATCH", `/api/manufacturing/orders/${oidR}/advance`, S.expert, { expectedDeliveryDate: "2026-09-21" }),
        req("POST", `/api/manufacturing/orders/${oidR}/hold`, S.manager,
          { status: "waiting_patient", reasonCode: "patient_no_show" }),
      ]);
      const fin = await order(oidR);
      const rows = await stageRows(oidR);
      if (adv.status === 200) {
        // التقدّم سبق: التوقّف يقع على المرحلة الجديدة ويصفها.
        same("التقدّم سبق ⇒ التوقّف عليه", [hld.status, fin.currentStage], [200, "mold"]);
        same("والحالة متوقّفة", fin.status, "waiting_patient");
        same("وسطر تقدّم واحد", rows.length, 1);
        const hr = (await history(oidR)).filter((x) => x.notes?.startsWith("توقّف:"))[0];
        same("وسطر التوقّف على المرحلة الفعلية", [hr.fromStage, hr.toStage], ["mold", "mold"]);
      } else {
        // التوقّف سبق: التقدّم يُردّ ولا يمحو التوقّف.
        same("التوقّف سبق ⇒ التقدّم يُردّ", [adv.status, hld.status], [409, 200]);
        same("والأمر متوقّف في مرحلته", [fin.status, fin.currentStage], ["waiting_patient", "measurements"]);
        same("وبلا سطر تقدّم", rows.length, 0);
      }
    }

    // ══ التنبيهات تتبع الموعد الحالي لحظةً بلحظة ═══════════════════════════
    console.log("\n── تنبيهات التسليم تتبع الموعد ──");
    const kindFor = async (session: any, orderId: number): Promise<string | null> => {
      const res = await req("GET", "/api/manufacturing/notifications", session);
      const hit = (res.json?.items ?? []).find((i: any) => i.orderId === orderId);
      return hit ? hit.kind : null;
    };
    const setDate = (session: any, orderId: number, date: string, reason = "اختبار") =>
      req("PATCH", `/api/manufacturing/orders/${orderId}/delivery-date`, session, { expectedDeliveryDate: date, reason });

    const pn = await mkPatient("مريض التنبيه");
    const oidN = await mkOrder(pn, "manufacturing");
    await req("PATCH", `/api/manufacturing/orders/${oidN}/delivery-date`, S.expert, { expectedDeliveryDate: baghdadDate(1) });
    same("موعد الغد ⇒ تنبيه غداً", await kindFor(S.expert, oidN), "due_tomorrow");
    // التأجيل أسبوعاً يجب أن يُسقط تنبيه الغد فوراً — لا يبقى معلّقاً.
    await setDate(S.expert, oidN, baghdadDate(7));
    same("والتأجيل أسبوعاً يُسقطه", await kindFor(S.expert, oidN), null);
    await setDate(S.expert, oidN, baghdadDate(1));
    same("وإعادته للغد تُعيده", await kindFor(S.expert, oidN), "due_tomorrow");
    await setDate(S.expert, oidN, baghdadDate(0));
    same("واليوم ⇒ تنبيه اليوم", await kindFor(S.expert, oidN), "due_today");
    await setDate(S.expert, oidN, baghdadDate(2));
    same("وبعد يومين ⇒ تنبيه بعد يومين", await kindFor(S.expert, oidN), "due_in_2_days");
    await setDate(S.expert, oidN, baghdadDate(-1));
    same("والأمس ⇒ متأخّر", await kindFor(S.expert, oidN), "overdue");
    // العزل الفرعي القائم لم يتغيّر: المدير يرى فرعه، والمسؤول الكلّ.
    same("والمدير يراه في فرعه", await kindFor(S.manager, oidN), "overdue");
    same("والمسؤول يراه", await kindFor(S.admin, oidN), "overdue");
    same("ومدير فرعٍ آخر لا يراه", await kindFor(S.manager2, oidN), null);

    // ══ daysInStage بعد الترحيل: يقرأ السجلّ القديم بلغته ══════════════════
    console.log("\n── daysInStage على سجلّ قديم ──");
    {
      const pl = await mkPatient("مريض السجل القديم");
      const oidL = await mkOrder(pl, "manufacturing");
      // سجلّ بالأكواد القديمة كما يخلّفه الترحيل: دخولٌ واحد ثم حركة داخلية.
      await pool.query(
        `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, notes, created_at) VALUES
           ($1,'stage_change','assessment_measurements','cast_taken','قديم', NOW() - INTERVAL '30 days'),
           ($1,'stage_change','cast_taken','test_socket','قديم',        NOW() - INTERVAL '20 days'),
           ($1,'stage_change','test_socket','first_fitting','قديم',     NOW() - INTERVAL '15 days'),
           ($1,'stage_change','first_fitting','socket_adjustment','قديم', NOW() - INTERVAL '10 days')`,
        [oidL]);
      const cards = (await req("GET", "/api/manufacturing/my-orders", S.expert)).json;
      const card = cards.find((c: any) => c.id === oidL);
      // الدخول هو cast_taken → test_socket قبل ٢٠ يوماً، لا آخر سطر (١٠).
      same("العدّ من أول دخول للتصنيع لا من الحركة داخله", card.daysInStage, 20);

      // ثم رجوع فنّي حقيقي: العدّ يبدأ من لحظته.
      await pool.query(
        `INSERT INTO prosthetic_work_history (work_order_id, action_type, from_stage, to_stage, notes, created_at)
         VALUES ($1,'rework','ready_for_fitting','manufacturing','رجوع', NOW() - INTERVAL '3 days')`,
        [oidL]);
      const after = (await req("GET", "/api/manufacturing/my-orders", S.expert)).json
        .find((c: any) => c.id === oidL);
      same("والرجوع الفنّي يعيد العدّ من لحظته", after.daysInStage, 3);
    }
  } finally {
    server.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
    [[EXPERT, MANAGER, EXPERT2, MANAGER2, ADMIN, RECEPTION]]);
  console.log(failures === 0 ? "\n✅ all workflow cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
