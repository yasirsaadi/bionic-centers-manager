// ربط مراحل التصنيع بأحداث المريض — اختبار حيّ عبر النقاط الحقيقية.
// قاعدة محلّية: `npm run test:manufacturing-events`.
//
// يحرس عقداً واحداً لا يجوز أن ينكسر بصمت: **ما يخرج إلى المريض هو المرحلة
// وحدها.** ولذلك لا يكتفي بفحص الحقول التي نعرفها، بل يفحص **مفاتيح الحمولة
// كلّها** — فحقلٌ يُضاف يوماً بسهو يُسقط الاختبار بدل أن يتسرّب.

import express from "express";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import * as store from "./store";
import { patientEvents, prostheticWorkOrders as WO } from "@shared/schema";
import { and, asc, eq } from "drizzle-orm";

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

const PORT = 6791;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-أحداث-التصنيع";
const EXPERT = 9501, MANAGER = 9502;

const S = {
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: {} },
  manager: { userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true } },
};

/** كل ما لا يجوز أن يظهر في حمولة حدثٍ موجَّه للمريض. */
const FORBIDDEN = [
  "status", "holdReasonCode", "holdNote", "reason", "reasonCode", "reasonDetails",
  "reworkType", "fromStage", "expertName", "expertUserId",
  "finalResult", "finalNotes", "notes",
];

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

async function events(patientId: number) {
  return db.select().from(patientEvents)
    .where(eq(patientEvents.patientId, patientId))
    .orderBy(asc(patientEvents.id));
}
async function mfgEvents(patientId: number) {
  return (await events(patientId)).filter((e) => e.eventType.startsWith("manufacturing."));
}
/**
 * أحداث **المراحل** وحدها. حدث موعد التسليم صار يُصدَر كذلك (المرحلة 210)،
 * وهو حدثٌ مشروع لكنه ليس انتقال مرحلة — فيُفصَل كي تبقى تأكيدات التسلسل
 * تقيس ما وُضعت له.
 */
async function stageEvents(patientId: number) {
  return (await mfgEvents(patientId))
    .filter((e) => e.eventType !== "manufacturing.delivery_date_changed");
}
async function order(id: number) {
  const [o] = await db.select().from(WO).where(eq(WO.id, id));
  return o;
}

/**
 * الفحص الذي يمنع التسرّب: النوع والوجهة والحمولة **كاملةً** — و**الصفّ
 * نفسه**. الحمولة وحدها لا تكفي: عمودا الفاعل خارجها، وقناةُ عرضٍ تُبنى
 * لاحقاً تقرأ الصفّ لا الحمولة، فتسرّبُ اسم الخبير منهما كتسرّبه من داخلها.
 */
function assertSafe(label: string, ev: any, expectedType: string, expectedStage: string) {
  same(`${label}: النوع`, ev?.eventType, expectedType);
  same(`${label}: الوجهة`, ev?.visibility, "patient");
  same(`${label}: الحمولة = المرحلة وحدها`, ev?.payload, { stage: expectedStage });
  const keys = Object.keys(ev?.payload ?? {});
  same(`${label}: لا مفتاح غير stage`, keys, ["stage"]);
  const leaked = keys.filter((k) => FORBIDDEN.includes(k));
  same(`${label}: لا حقل ممنوع`, leaked, []);
  same(`${label}: المصدر أمر تصنيع`, ev?.sourceType, "work_order");
  // مَن حرّك المرحلة شأنٌ داخلي — والتدقيق محفوظ في سجلّ الأمر لا هنا.
  same(`${label}: بلا فاعل في الصفّ`, [ev?.actorUserId, ev?.actorName], [null, null]);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  // الصادر يشير إلى الأحداث وجهات الاتصال معاً — يُحذف قبلهما.
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
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
      [id, `me_u${id}`, name, role]);
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
    // ══ ١. المسار الكامل: إنشاء ⟶ تسليم ═════════════════════════════════
    console.log("\n── المسار الكامل للمراحل الست ──");
    const p1 = await mkPatient("مريض المسار");
    const wo1 = await store.createWorkOrderForExisting({
      patientId: p1, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER,
    });

    let ev = await mfgEvents(p1);
    same("حدث واحد عند الإنشاء", ev.length, 1);
    assertSafe("الإنشاء", ev[0], "manufacturing.order_created", "order_received");

    const steps: [string, string, any][] = [
      ["measurements", "manufacturing.stage_changed", {}],
      ["mold", "manufacturing.stage_changed", { expectedDeliveryDate: "2026-12-01" }],
      ["manufacturing", "manufacturing.stage_changed", {}],
      ["ready_for_fitting", "manufacturing.ready_for_delivery", {}],
      ["delivered", "manufacturing.delivered", { finalResult: "first_fit_success" }],
    ];
    for (const [stage, type, body] of steps) {
      const r = await req("PATCH", `/api/manufacturing/orders/${wo1.id}/advance`, S.expert, body);
      same(`التقدّم إلى ${stage} نجح`, r.status, 200);
      ev = await stageEvents(p1);
      assertSafe(stage, ev[ev.length - 1], type, stage);
    }
    same("ستّة أحداث مراحل لا أكثر — بلا ازدواج", (await stageEvents(p1)).length, 6);
    // والالتزام بالموعد عند القالب أصدر حدثه هو أيضاً — مرّةً واحدة.
    const dateEvents = (await mfgEvents(p1)).filter((e) => e.eventType === "manufacturing.delivery_date_changed");
    same("وحدث موعد تسليم واحد", dateEvents.length, 1);
    same("بحمولة الموعد وحده", dateEvents[0].payload, { expectedDeliveryDate: "2026-12-01" });
    // «جاهز للتجربة» و«التسليم» لهما نوعاهما، فلا stage_changed مكرَّر معهما.
    const types = (await stageEvents(p1)).map((e) => e.eventType);
    same("التسلسل بأنواعه", types, [
      "manufacturing.order_created",
      "manufacturing.stage_changed",
      "manufacturing.stage_changed",
      "manufacturing.stage_changed",
      "manufacturing.ready_for_delivery",
      "manufacturing.delivered",
    ]);

    // ══ ٢. إعادة العمل: المريض يرى المرحلة، لا القصّة ════════════════════
    console.log("\n── الرجوع بإعادة عمل فنّي ──");
    const p2 = await mkPatient("مريض إعادة العمل");
    const wo2 = await store.createWorkOrderForExisting({
      patientId: p2, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER,
    });
    for (const body of [{}, { expectedDeliveryDate: "2026-12-02" }, {}, {}]) {
      await req("PATCH", `/api/manufacturing/orders/${wo2.id}/advance`, S.expert, body);
    }
    same("وصل جاهز للتجربة", (await order(wo2.id)).currentStage, "ready_for_fitting");
    const beforeRework = (await mfgEvents(p2)).length;

    const rw = await req("POST", `/api/manufacturing/orders/${wo2.id}/hold`, S.expert, {
      status: "technical_rework", reasonCode: "socket_fit",
      returnToStage: "manufacturing", note: "ملاحظة فنّية داخلية",
    });
    same("إعادة العمل نجحت", rw.status, 200);
    ev = await mfgEvents(p2);
    same("حدث واحد للرجوع", ev.length, beforeRework + 1);
    assertSafe("الرجوع", ev[ev.length - 1], "manufacturing.stage_changed", "manufacturing");
    // الأدقّ: لا أثر لأي كلمة من القصّة داخل الحدث كلّه، لا في الحمولة وحدها.
    const raw = JSON.stringify(ev[ev.length - 1]);
    for (const word of ["socket_fit", "technical_rework", "ملاحظة فنّية", "ready_for_fitting", "rework"]) {
      check(!raw.includes(word), `لا تسرّب لـ«${word}» في صفّ الحدث كلّه`);
    }
    // والسجلّ الداخلي يحتفظ بها كاملة — الحجب في الحدث لا في السجلّ.
    const { rows: hist } = await pool.query(
      `SELECT notes FROM prosthetic_work_history WHERE work_order_id = $1 AND action_type = 'rework'`, [wo2.id]);
    check(!!hist[0]?.notes?.includes("socket_fit"), "والسجلّ الداخلي يحتفظ بالسبب كاملاً");

    // ══ ٣. العودة ثانيةً إلى نفس المرحلة تُنتج حدثاً جديداً ══════════════
    console.log("\n── الوصول الثاني لنفس المرحلة ──");
    const readyBefore = (await mfgEvents(p2)).filter((e) => e.eventType === "manufacturing.ready_for_delivery").length;
    await req("PATCH", `/api/manufacturing/orders/${wo2.id}/advance`, S.expert, {});
    const readyAfter = (await mfgEvents(p2)).filter((e) => e.eventType === "manufacturing.ready_for_delivery").length;
    same("حدث «جاهز» ثانٍ — لا يمنعه منع التكرار", [readyBefore, readyAfter], [1, 2]);

    // ══ ٤. التوقّفات لا تُنتج شيئاً ══════════════════════════════════════
    console.log("\n── التوقّف والاستئناف: لا حدث للمريض ──");
    const p3 = await mkPatient("مريض التوقّف");
    const wo3 = await store.createWorkOrderForExisting({
      patientId: p3, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER,
    });
    await req("PATCH", `/api/manufacturing/orders/${wo3.id}/advance`, S.expert, {}); // measurements
    const beforeHolds = (await events(p3)).length;
    for (const [status, reasonCode] of [
      ["waiting_patient", "patient_no_show"],
      ["waiting_materials", "materials_unavailable"],
      ["medical_hold", "swelling"],
    ] as const) {
      const h = await req("POST", `/api/manufacturing/orders/${wo3.id}/hold`, S.expert, { status, reasonCode });
      same(`${status}: العملية نجحت`, h.status, 200);
      same(`${status}: بلا حدث جديد`, (await events(p3)).length, beforeHolds);
      const r = await req("POST", `/api/manufacturing/orders/${wo3.id}/resume`, S.expert, {});
      same(`${status}: الاستئناف نجح`, r.status, 200);
      same(`${status}: والاستئناف بلا حدث`, (await events(p3)).length, beforeHolds);
    }
    same("والمرحلة لم تتحرّك طوال ذلك", (await order(wo3.id)).currentStage, "measurements");

    // ══ ٥. المخرج الإداري ════════════════════════════════════════════════
    console.log("\n── التصحيح الإداري ──");
    const beforeAdmin = (await mfgEvents(p3)).length;
    const a1 = await req("PATCH", `/api/manufacturing/orders/${wo3.id}/stage`, S.manager,
      { toStage: "order_received", reason: "تصحيح إدخال" });
    same("الرجوع الإداري نجح", a1.status, 200);
    let mev = await mfgEvents(p3);
    same("حدث واحد للمرحلة الفعلية", mev.length, beforeAdmin + 1);
    assertSafe("إداري للخلف", mev[mev.length - 1], "manufacturing.stage_changed", "order_received");
    check(!JSON.stringify(mev[mev.length - 1]).includes("تصحيح إدخال"), "ولا يظهر سبب التصحيح");

    // تصحيحٌ إلى المرحلة نفسها ليس انتقالاً ⇒ لا حدث.
    const n = (await mfgEvents(p3)).length;
    const a2 = await req("PATCH", `/api/manufacturing/orders/${wo3.id}/stage`, S.manager,
      { toStage: "order_received", reason: "بلا تغيير" });
    same("التصحيح إلى المرحلة نفسها نجح", a2.status, 200);
    same("وبلا حدث", (await mfgEvents(p3)).length, n);

    // ══ ٦. الصيانة خارج النطاق ═══════════════════════════════════════════
    console.log("\n── الصيانة: لا أحداث في هذه المرحلة ──");
    const p4 = await mkPatient("مريض الصيانة");
    const wo4 = await store.createWorkOrderForExisting({
      patientId: p4, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER, purpose: "maintenance",
    });
    same("أمر الصيانة أُنشئ بلا حدث", (await events(p4)).length, 0);
    await req("PATCH", `/api/manufacturing/orders/${wo4.id}/advance`, S.expert, { toStage: "maintenance_device_done" });
    same("وإنجازها كذلك", (await events(p4)).length, 0);
    same("والمرحلة تقدّمت فعلاً", (await order(wo4.id)).currentStage, "maintenance_device_done");

    // ══ ٧. الطلب المكرَّر لا يُنتج حدثاً ثانياً ═══════════════════════════
    console.log("\n── إعادة إرسال نفس الطلب ──");
    const p5 = await mkPatient("مريض التكرار");
    const wo5 = await store.createWorkOrderForExisting({
      patientId: p5, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER,
    });
    const r1 = await req("PATCH", `/api/manufacturing/orders/${wo5.id}/advance`, S.expert, { toStage: "measurements" });
    const after1 = (await mfgEvents(p5)).length;
    const r2 = await req("PATCH", `/api/manufacturing/orders/${wo5.id}/advance`, S.expert, { toStage: "measurements" });
    same("الأول نجح والثاني رُدّ", [r1.status, r2.status], [200, 400]);
    same("وبلا حدث ثانٍ", (await mfgEvents(p5)).length, after1);

    // ══ ٨. مسارا الإنشاء في storage.ts ═══════════════════════════════════
    console.log("\n── كل مسارات الإنشاء مغطّاة ──");
    {
      // (أ) createPatientWithWorkOrder — التسجيل مع أمر تصنيع.
      const res = await store.createPatientWithWorkOrder(
        { name: "مريض تسجيل مباشر", age: "30", referralSource: MARK,
          medicalCondition: "amputee", branchId: 1, isAmputee: true } as any,
        { serviceType: "prosthetic", expertUserId: EXPERT, assignedBy: MANAGER },
      );
      const e = await mfgEvents(res.patient.id);
      same("createPatientWithWorkOrder: حدث واحد", e.length, 1);
      assertSafe("تسجيل مباشر", e[0], "manufacturing.order_created", "order_received");

      // (ب) storage.assignManufacturing — «تخصيص وإسناد خبير».
      const { storage } = await import("../storage");
      const pa = await mkPatient("مريض التخصيص");
      await storage.assignManufacturing({
        patientId: pa, serviceType: "prosthetic", expertUserId: EXPERT,
        assignedBy: MANAGER, cost: 0, details: {},
      } as any);
      const ea = await mfgEvents(pa);
      same("assignManufacturing: حدث واحد", ea.length, 1);
      assertSafe("تخصيص", ea[0], "manufacturing.order_created", "order_received");

      // (ج) storage.addPatientCaseType — «إضافة نوع حالة».
      const pc = await mkPatient("مريض نوع حالة");
      await storage.addPatientCaseType({
        patientId: pc, caseType: "amputee", expertUserId: EXPERT,
        performedBy: MANAGER, cost: 0,
      } as any);
      const ec = await mfgEvents(pc);
      same("addPatientCaseType: حدث واحد", ec.length, 1);
      assertSafe("نوع حالة", ec[0], "manufacturing.order_created", "order_received");
    }

    // ══ ٨.ب المساند: المسار الذي يتخطّى القالب ══════════════════════════
    // نوع الخدمة الثاني للبناء الأوّلي، وله فرقٌ حقيقي لا شكليّ: مسندٌ لا
    // يحتاج قالباً يقفز من القياسات إلى التصنيع مباشرة. فالمقصود هنا ليس
    // تكرار المسار بنوعٍ آخر، بل التأكّد أن **المرحلة المتخطّاة لا تُنتج
    // حدثاً** — فالمريض لا يُخبَر بقالبٍ لم يُؤخَذ.
    console.log("\n── مساند: تخطّي القالب ──");
    {
      const ps = await mkPatient("مريض مساند");
      const wos = await store.createWorkOrderForExisting({
        patientId: ps, branchId: 1, serviceType: "medical_support",
        expertUserId: EXPERT, assignedBy: MANAGER,
      });

      let sev = await mfgEvents(ps);
      same("مساند: حدث واحد عند الإنشاء", sev.length, 1);
      assertSafe("مساند/الإنشاء", sev[0], "manufacturing.order_created", "order_received");

      let r = await req("PATCH", `/api/manufacturing/orders/${wos.id}/advance`, S.expert, {});
      same("مساند: التقدّم إلى القياسات نجح", r.status, 200);
      sev = await stageEvents(ps);
      same("مساند: حدثان", sev.length, 2);
      assertSafe("مساند/القياسات", sev[1], "manufacturing.stage_changed", "measurements");

      // القفزة المشروعة: القياسات ⟶ التصنيع، بلا مرور على القالب. والموعد
      // إلزامي لأن الوجهة عند القالب أو بعده.
      r = await req("PATCH", `/api/manufacturing/orders/${wos.id}/advance`, S.expert,
        { toStage: "manufacturing", expectedDeliveryDate: "2026-12-20" });
      same("مساند: القفز إلى التصنيع نجح", r.status, 200);
      same("مساند: والمرحلة صارت التصنيع", (await order(wos.id)).currentStage, "manufacturing");
      sev = await stageEvents(ps);
      same("مساند: حدث واحد للقفزة لا اثنان", sev.length, 3);
      assertSafe("مساند/التصنيع", sev[2], "manufacturing.stage_changed", "manufacturing");

      // **بيت القصيد**: لا حدث بمرحلة القالب إطلاقاً — لا لهذا المريض ولا
      // في أي حدثٍ كُتب باسمه، لأن القالب لم يقع أصلاً.
      const molds = (await events(ps)).filter((e) => (e.payload as any)?.stage === "mold");
      same("مساند: لا حدث بمرحلة القالب", molds.map((m) => m.id), []);

      // إكمال المسار حتى التسليم — بنفس قاعدة الحمولة.
      r = await req("PATCH", `/api/manufacturing/orders/${wos.id}/advance`, S.expert, {});
      same("مساند: جاهز للتجربة نجح", r.status, 200);
      sev = await stageEvents(ps);
      assertSafe("مساند/جاهز للتجربة", sev[3], "manufacturing.ready_for_delivery", "ready_for_fitting");

      r = await req("PATCH", `/api/manufacturing/orders/${wos.id}/advance`, S.expert,
        { finalResult: "first_fit_success" });
      same("مساند: التسليم نجح", r.status, 200);
      sev = await stageEvents(ps);
      assertSafe("مساند/التسليم", sev[4], "manufacturing.delivered", "delivered");

      same("مساند: خمسة أحداث مراحل — واحد أقلّ من الأطراف لتخطّي القالب", sev.length, 5);
      same("مساند: التسلسل بأنواعه", sev.map((e) => e.eventType), [
        "manufacturing.order_created",
        "manufacturing.stage_changed",
        "manufacturing.stage_changed",
        "manufacturing.ready_for_delivery",
        "manufacturing.delivered",
      ]);
      same("مساند: وبمراحله", sev.map((e) => (e.payload as any).stage), [
        "order_received", "measurements", "manufacturing", "ready_for_fitting", "delivered",
      ]);
    }

    // ══ ٩. كل أحداث التصنيع في هذا الاختبار آمنة بلا استثناء ═════════════
    console.log("\n── مسح شامل على كل ما كُتب ──");
    // مقصورٌ على ما كتبه هذا الاختبار: القاعدة مشتركة بين الحزم، وصفوفٌ
    // قديمة من تشغيلات سابقة ليست موضوع الحكم هنا.
    const { rows: mine } = await pool.query<{ id: number }>(
      `SELECT id FROM patients WHERE referral_source = $1`, [MARK]);
    const all = (await db.select().from(patientEvents)
      .where(and(eq(patientEvents.sourceType, "work_order"), eq(patientEvents.visibility, "patient"))))
      .filter((e) => mine.some((m) => m.id === e.patientId));
    // **مفتاح واحد لا غير، ومن قائمة مغلقة مربوطة بالنوع**: أحداث المراحل
    // تحمل `stage`، وحدث الموعد يحمل `expectedDeliveryDate`. وأي مفتاح
    // ثانٍ — أو مفتاح لا يطابق نوعه — تسريبٌ يُمسك هنا.
    const ALLOWED_KEY: Record<string, string> = {
      "manufacturing.delivery_date_changed": "expectedDeliveryDate",
    };
    const bad = all.filter((e) => {
      const keys = Object.keys((e.payload ?? {}) as object);
      const expected = ALLOWED_KEY[e.eventType] ?? "stage";
      return keys.length !== 1 || keys[0] !== expected;
    });
    same("كل حدث موجَّه للمريض حمولته مفتاحٌ واحد يطابق نوعه", bad.map((b) => b.id), []);
    // والصفّ نفسه: ولا واحدٌ منها يحمل فاعلاً.
    const withActor = all.filter((e) => e.actorUserId !== null || e.actorName !== null);
    same("ولا واحد منها يحمل فاعلاً", withActor.map((e) => e.id), []);
    check(all.length > 0, "والمسح ليس فارغاً (فحصٌ حقيقي)");
  } finally {
    server.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
  console.log(failures === 0 ? "\n✅ all manufacturing-events cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
