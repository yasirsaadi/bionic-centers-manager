// **فصلُ الزرّين وتسجيلُ ما فات** (قرارُ المالك ٢٠٢٦-٠٩-٣٠) — `npm run test:visit-split`، حيٌّ على النقاط الحقيقية.
//
// (أ) صيانةٌ بتاريخٍ سابق: الزيارةُ وقيدُ الكلفة بيومها، والمقبوضُ بيومها أو باليوم **بسؤالٍ صريح**، والمجّانيُّ والضمانُ
//     والدَّينُ بلا سؤال، وقاعدةُ «ثلاثة أيام للموظّف» نفسُها.
// (ب) «متابعة أو تعديل على جهاز قائم» = زيارةٌ بتاريخها + طلبُ مراجعة، والشارةُ الحمراء تنطفئ بها ولا تعود بعد قرار الطبيب.

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

const PORT = 6965;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-فصل-الزرّين";
const TOK = "vs-tok-";
const ADMIN = 99650, RECV = 99651, MGR = 99652, EXPERT = 99653, MGR_B2 = 99654;
const USERS = [ADMIN, RECV, MGR, EXPERT, MGR_B2];
const PAY = { canViewPatients: true, canAddPatients: true, canAddPayments: true, canViewPayments: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: PAY },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبال", permissions: PAY },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير", permissions: PAY },
  mgrB2: { userId: MGR_B2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "مدير ٢", permissions: PAY },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

let tok = 0;
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, {
    serviceType: "prosthetic", expertUserId: EXPERT, maintenanceComponent: "knee",
    paidNow: 0, submissionToken: `${TOK}${Date.now()}-${++tok}`, ...body,
  });
const preview = (workOrderId: number, session: any = S.mgr) =>
  http("POST", "/api/admin/operation-reversal/preview", session, { workOrderId });
const execute = (workOrderId: number, stamp: string, extra: any = {}, session: any = S.mgr) =>
  http("POST", "/api/admin/operation-reversal/execute", session, {
    workOrderId, intent: "cancel_operation", reasonNote: "سُجّلت مرّتين", stateStamp: stamp, ...extra,
  });

async function mkPatient(label: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,true,0,'new') RETURNING id`, [`${MARK} ${label}`, MARK]);
  const pid = r[0].id;
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
           VALUES ($1,1,'prosthetic',0,'manual','active')`, [pid]);
  return pid;
}
async function snap(pid: number) {
  const [r] = await q(`SELECT
      (SELECT total_cost::int FROM patients WHERE id=$1) AS total,
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE patient_id=$1) AS paid,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payment_rows,
      (SELECT count(*)::int FROM administrative_operation_reversals WHERE patient_id=$1) AS reversals`, [pid]);
  return r;
}
const orderOf = async (id: number) =>
  (await q(`SELECT status, admin_void_reversal_id IS NOT NULL AS voided FROM prosthetic_work_orders WHERE id=$1`, [id]))[0];

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM submission_tokens WHERE token LIKE '${TOK}%'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, branch] of [
    [ADMIN, "admin", 1], [RECV, "reception", 1], [MGR, "branch_manager", 1],
    [EXPERT, "prosthetics_expert", 1], [MGR_B2, "branch_manager", 2],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, is_active=true`,
      [id, `vs_u${id}`, role, branch, JSON.stringify([branch])]);
  }
  await q(`UPDATE system_users SET can_add_patients=true, can_add_payments=true, can_view_payments=true
            WHERE id = ANY($1::int[])`, [[ADMIN, RECV, MGR, MGR_B2]]);
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
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));

  const ymd = (daysAgo: number) => {
    const b = new Date(Date.now() + 3 * 3600 * 1000 - daysAgo * 86400 * 1000);
    return b.toISOString().slice(0, 10);
  };
  const baghdadDay = (col: string) => `to_char((${col}) AT TIME ZONE 'UTC' + interval '3 hours', 'YYYY-MM-DD')`;
  const legacyMaint = (pid: number, extra: any, session: any = S.recv) => maint({
    patientId: pid, legacyUnrecordedDevice: true, maintenanceComponent: "knee", ...extra,
  }, session);
  const rowsOf = async (pid: number) => (await q(`SELECT
      (SELECT ${baghdadDay("visit_date")} FROM visits WHERE patient_id=$1 ORDER BY id DESC LIMIT 1) AS visit_day,
      (SELECT ${baghdadDay("created_at")} FROM cost_entries WHERE patient_id=$1 ORDER BY id DESC LIMIT 1) AS cost_day,
      (SELECT ${baghdadDay("date")} FROM payments WHERE patient_id=$1 ORDER BY id DESC LIMIT 1) AS pay_day,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payments`, [pid]))[0];

  try {
    console.log("\n── أ. صيانةٌ بتاريخٍ سابق ──");
    const d2 = ymd(2), today = ymd(0);
    const pA = await mkPatient("أ-يوم الصيانة");
    const noAns = await legacyMaint(pA, { visitDate: d2, originalPrice: 50000, discountAmount: 0, paidNow: 20000 });
    same("أ١. **مبلغٌ مقبوضٌ بلا جوابٍ عن «متى دُفع؟» ⟵ ٤٠٠ بصفر كتابة**",
      [noAns.status, (await rowsOf(pA)).payments], [400, 0]);
    const a = await legacyMaint(pA, { visitDate: d2, originalPrice: 50000, discountAmount: 0, paidNow: 20000, paidOn: "visit_day" });
    same("أ٢. **«يوم الصيانة»: الزيارةُ والكلفةُ والمقبوضُ كلُّها بيوم الصيانة**",
      [a.status, await rowsOf(pA)], [201, { visit_day: d2, cost_day: d2, pay_day: d2, payments: 1 }]);

    const pB = await mkPatient("ب-اليوم");
    const b = await legacyMaint(pB, { visitDate: d2, originalPrice: 50000, discountAmount: 0, paidNow: 20000, paidOn: "today" });
    same("أ٣. **«اليوم»: الصيانةُ وكلفتُها بيومها، والمقبوضُ يدخل صندوقَ اليوم**",
      [b.status, await rowsOf(pB)], [201, { visit_day: d2, cost_day: d2, pay_day: today, payments: 1 }]);

    const pC = await mkPatient("ج-دين");
    const c = await legacyMaint(pC, { visitDate: d2, originalPrice: 50000, discountAmount: 0, paidNow: 0 });
    same("أ٤. **دَينٌ بلا مقبوض ⟵ بلا سؤال**، والصيانةُ وكلفتُها بيومها",
      [c.status, await rowsOf(pC)], [201, { visit_day: d2, cost_day: d2, pay_day: null, payments: 0 }]);

    const pD = await mkPatient("د-مجاني");
    const dd = await legacyMaint(pD, { visitDate: d2, originalPrice: 50000, discountAmount: 50000 });
    same("أ٥. **مجّانيّ (خصمٌ كامل) ⟵ بلا سؤال ولا مال**، والزيارةُ بيومها",
      [dd.status, await rowsOf(pD)], [201, { visit_day: d2, cost_day: null, pay_day: null, payments: 0 }]);

    const pE = await mkPatient("هـ-ضمان");
    const e = await legacyMaint(pE, { visitDate: d2, underWarranty: true });
    same("أ٦. **ضمن الضمان ⟵ بلا سؤال ولا مال**، والزيارةُ بيومها",
      [e.status, await rowsOf(pE)], [201, { visit_day: d2, cost_day: null, pay_day: null, payments: 0 }]);

    const pF = await mkPatient("و-قواعد");
    same("أ٧. وأقدمُ من ٣ أيام للموظّف ⟵ ٤٠٣ · وللمسؤول ⟵ ٢٠١",
      [(await legacyMaint(pF, { visitDate: ymd(5), underWarranty: true })).status,
        (await legacyMaint(pF, { visitDate: ymd(5), underWarranty: true }, S.admin)).status], [403, 201]);
    same("أ٨. ولا تاريخَ مستقبليّ", (await legacyMaint(pF, { visitDate: ymd(-1), underWarranty: true })).status, 400);
    const pG = await mkPatient("ز-بلا تاريخ");
    const g = await legacyMaint(pG, { originalPrice: 30000, discountAmount: 0, paidNow: 30000 });
    same("أ٩. **وبلا تاريخٍ (أو بتاريخ اليوم) كما كانت تماماً** — بلا سؤال، وكلُّه اليوم",
      [g.status, await rowsOf(pG)], [201, { visit_day: today, cost_day: today, pay_day: today, payments: 1 }]);

    console.log("\n── ب. «متابعة أو تعديل على جهاز قائم» والشارةُ الحمراء ──");
    const unrouted = async (pid: number) =>
      ((await http("GET", "/api/medical/pending", S.recv)).body?.unrouted ?? {})[pid] ?? [];
    const pH = await mkPatient("ح-متابعة");
    same("ب١. (الإعداد) قسمُ أطرافٍ بلا طلب يُعلَّم", await unrouted(pH), ["prosthetic"]);
    const [cH] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pH]);
    const v = await http("POST", "/api/visits", S.recv, {
      patientId: pH, branchId: 1, notes: "تعديل القالب", treatmentType: null, caseId: cH.id,
      customDate: d2, reviewPath: "quick", reviewKind: "adjustment",
    });
    same("ب٢. **زيارةُ المتابعة بيومها السابق** وتُطفئ الشارة",
      [v.status, (await q(`SELECT ${baghdadDay("visit_date")} d FROM visits WHERE patient_id=$1`, [pH]))[0]?.d,
        await unrouted(pH)], [201, d2, []]);
    await q(`UPDATE medical_review_requests SET status='approved', decision='approve', decided_at=now() WHERE patient_id=$1`, [pH]);
    same("ب٣. **ولا تعود الشارةُ بعد قرار الطبيب** — الزيارةُ نفسُها جوابٌ باقٍ", await unrouted(pH), []);
    const pI = await mkPatient("ط-علامة");
    const [cI] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pI]);
    await q(`INSERT INTO visits (patient_id, branch_id, case_id, details, notes) VALUES ($1,1,$2,'إضافة نوع حالة','علامة')`, [pI, cI.id]);
    same("ب٤. **وزيارةٌ بلا طلب مراجعة ليست حضوراً** (علامةُ «إضافة نوع حالة»، أو زيارةُ أمر صيانةٍ أُلغي) — الشارةُ باقية", await unrouted(pI), ["prosthetic"]);
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active = false WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
