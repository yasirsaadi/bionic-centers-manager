// **إلغاءُ أمر صيانةٍ أو بيعِ جزءٍ «بلا معاينة»** — واقعةُ دموع جاسم عطية (٢٠٢٦-٠٩-٣٠).
// `npm run test:no-exam-reversal` — حيٌّ على Postgres وعلى النقاط الحقيقية.
//
// كان «تصحيح / إلغاء العملية» على أمر الصيانة يُجيب «العملية غير موجودة». والآن يُلغيه ويعكس ما أنشأه من مال:
// الكلفةُ بقيدٍ معاكس، والمقبوضُ يُردّ، والأمرُ يُبطَل — ولبيع الجزء حلقتُه كذلك — والجهازُ المُصان لا يُمَسّ.
// **وأمرُ تصنيعِ جهازٍ بلا متابعة** (البند ٣٢، §4.ar): هـ · و · ز.

import { randomUUID } from "crypto";
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

const PORT = 6964;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إلغاء-بلا-معاينة";
const TOK = "ner-tok-";
const ADMIN = 99640, RECV = 99641, MGR = 99642, EXPERT = 99643, MGR_B2 = 99644;
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
      [id, `ner_u${id}`, role, branch, JSON.stringify([branch])]);
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

  try {
    console.log("\n── أ. صيانةٌ مدفوعةٌ جزئياً على جهازٍ قديمٍ غير مسجَّل ──");
    const pA = await mkPatient("أ");
    const mA = await maint({ patientId: pA, legacyUnrecordedDevice: true, originalPrice: 50000, discountAmount: 0, paidNow: 20000 });
    check(mA.status === 201, "أ١. (الإعداد) الصيانةُ سُجّلت", JSON.stringify(mA.body));
    const woA = Number(mA.body?.workOrderId);
    const before = await snap(pA);
    same("أ٢. (الإعداد) الكلفةُ ٥٠,٠٠٠ والمقبوضُ ٢٠,٠٠٠", [before.total, before.ledger, before.paid], [50000, 50000, 20000]);

    const pv = await preview(woA);
    same("أ٣. **المعاينةُ لا تقول «العملية غير موجودة»** — وتعرض الإلغاءَ الكامل والكلفةَ والمقبوض",
      [pv.status, pv.body?.availableModes, pv.body?.availableIntents, pv.body?.saleAmount, pv.body?.paidAmount],
      [200, ["full_operation"], ["cancel_operation"], 50000, 20000]);

    const noAns = await execute(woA, pv.body?.stateStamp);
    same("أ٤. **وبلا جوابٍ عن ردّ المقبوض يُردّ ٤٠٠ بصفر كتابة**",
      [noAns.status, await snap(pA)], [400, before]);
    const recvTry = await execute(woA, pv.body?.stateStamp, { refundAnswer: "yes" }, S.recv);
    same("أ٥. والاستقبالُ لا يُلغي — صلاحيةٌ إدارية", [recvTry.status, (await snap(pA)).reversals], [403, 0]);
    const otherBranch = await execute(woA, pv.body?.stateStamp, { refundAnswer: "yes" }, S.mgrB2);
    same("أ٦. ومديرُ فرعٍ آخر لا يُلغي", otherBranch.status, 403);
    const stale = await execute(woA, "مختومٌ قديم", { refundAnswer: "yes" });
    same("أ٧. وختمٌ بائتٌ يُردّ ٤٠٩ بصفر كتابة", [stale.status, (await snap(pA)).reversals], [409, 0]);

    const ok = await execute(woA, pv.body?.stateStamp, { refundAnswer: "yes" });
    check(ok.status === 200, "أ٨. **مديرُ الفرع يُلغي الصيانة**", JSON.stringify(ok.body));
    const after = await snap(pA);
    same("أ٩. **والمالُ يُعكَس**: الكلفةُ صفرٌ بقيدٍ معاكس، والمقبوضُ رُدّ بصفٍّ سالب",
      [after.total, after.case_cost, after.ledger, after.ledger_rows, after.paid, after.payment_rows, after.reversals],
      [0, 0, 0, 2, 0, 2, 1]);
    same("أ١٠. والأمرُ ملغى إدارياً", await orderOf(woA), { status: "cancelled", voided: true });
    const again = await execute(woA, pv.body?.stateStamp, { refundAnswer: "yes" });
    same("أ١١. **ولا يُلغى مرّتين**", [again.status, (await snap(pA)).reversals], [409, 1]);
    same("أ١٢. والمعاينةُ بعده تقول «ملغاة إدارياً» بلا خيار",
      [(await preview(woA)).body?.alreadyReversed, (await preview(woA)).body?.availableModes], [true, []]);

    console.log("\n── ب. صيانةُ ضمانٍ مكرّرة (حالةُ دموع) — بلا مال ──");
    const pB = await mkPatient("ب");
    const mB1 = await maint({ patientId: pB, legacyUnrecordedDevice: true, underWarranty: true });
    const mB2 = await maint({ patientId: pB, legacyUnrecordedDevice: true, underWarranty: true }, S.admin);
    const woB2 = Number(mB2.body?.workOrderId);
    //  **مَن أعطى الأمرَ ومتى** على بطاقة سجلّ التصنيع (طلبُ المالك ٢٠٢٦-٠٩-٣٠) — في المكرَّر يُعرَف مَن كرّره.
    await q(`UPDATE system_users SET display_name = CASE id WHEN $1 THEN 'ريام الاستقبال' WHEN $2 THEN 'المسؤول' END
              WHERE id IN ($1, $2)`, [RECV, ADMIN]);
    const ordB = await http("GET", `/api/manufacturing/patient/${pB}/orders`, S.admin);
    const rowsB = (Array.isArray(ordB.body) ? ordB.body : ordB.body?.orders ?? []) as any[];
    const byId = (id: number) => rowsB.find((o) => o.id === id);
    same("ب٠. **البطاقةُ تقول مَن أعطى كلَّ أمرٍ ومتى** — الأوّلُ من الاستقبال والمكرَّرُ من المسؤول",
      [byId(Number(mB1.body?.workOrderId))?.createdByName, byId(woB2)?.createdByName,
        typeof byId(woB2)?.createdAt === "string"],
      ["ريام الاستقبال", "المسؤول", true]);
    const beforeB = await snap(pB);
    const pvB = await preview(woB2, S.admin);
    same("ب١. المعاينةُ: لا كلفةَ ولا مقبوض", [pvB.status, pvB.body?.saleAmount, pvB.body?.paidAmount], [200, 0, 0]);
    const okB = await execute(woB2, pvB.body?.stateStamp, {}, S.admin);
    check(okB.status === 200, "ب٢. **الأمرُ المكرَّر يُلغى بلا سؤالٍ عن المال**", JSON.stringify(okB.body));
    const afterB = await snap(pB);
    same("ب٣. **ولا مالَ يتحرّك** — لا قيدَ ولا دفعة",
      [afterB.ledger_rows, afterB.payment_rows, afterB.total], [beforeB.ledger_rows, beforeB.payment_rows, beforeB.total]);
    same("ب٤. والأمرُ الأوّل باقٍ كما هو", (await orderOf(Number(mB1.body?.workOrderId))).voided, false);

    console.log("\n── ج. صيانةٌ على جهازٍ مسلَّم — الجهازُ لا يُمَسّ ──");
    const pC = await mkPatient("ج");
    const [cC] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pC]);
    const [epC] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by, delivered_at)
       VALUES ($1,$2,1,1,'delivered',0,$3,NOW()) RETURNING id`, [pC, cC.id, ADMIN]);
    const mC = await maint({ patientId: pC, deviceEpisodeId: epC.id, originalPrice: 30000, discountAmount: 0, paidNow: 0 });
    const woC = Number(mC.body?.workOrderId);
    const pvC = await preview(woC);
    const okC = await execute(woC, pvC.body?.stateStamp);
    check(okC.status === 200, "ج١. صيانةٌ غير مدفوعة تُلغى بلا سؤال ردّ", JSON.stringify(okC.body));
    same("ج٢. **والجهازُ المُصان يبقى مسلَّماً وغيرَ مُبطَل**",
      (await q(`SELECT status, admin_void_reversal_id FROM patient_device_episodes WHERE id=$1`, [epC.id]))[0],
      { status: "delivered", admin_void_reversal_id: null });
    same("ج٣. والكلفةُ عُكست", [(await snap(pC)).total, (await snap(pC)).ledger], [0, 0]);

    console.log("\n── د. بيعُ جزءٍ مستقلّ ──");
    const pD = await mkPatient("د");
    const sD = await http("POST", "/api/no-exam/device-sale", S.recv, { submissionToken: randomUUID(), 
      patientId: pD, component: "knee", expertUserId: EXPERT, originalPrice: 300000, discountAmount: 0, paidNow: 100000,
    });
    check(sD.status === 201, "د١. (الإعداد) بيعُ الجزء سُجّل", JSON.stringify(sD.body));
    const woD = Number(sD.body?.workOrderId);
    const epD = Number(sD.body?.deviceEpisodeId);
    const pvD = await preview(woD);
    same("د٢. المعاينةُ تعرض كلفةَ الجزء ومقبوضَه",
      [pvD.status, pvD.body?.saleAmount, pvD.body?.paidAmount], [200, 300000, 100000]);
    const okD = await execute(woD, pvD.body?.stateStamp, { refundAnswer: "yes" });
    check(okD.status === 200, "د٣. **بيعُ الجزء يُلغى**", JSON.stringify(okD.body));
    const afterD = await snap(pD);
    same("د٤. والمالُ يُعكَس كاملاً", [afterD.total, afterD.ledger, afterD.paid], [0, 0, 0]);
    same("د٥. **وحلقةُ الجزء تُبطَل** والأمرُ كذلك",
      [(await q(`SELECT admin_void_reversal_id IS NOT NULL AS v FROM patient_device_episodes WHERE id=$1`, [epD]))[0].v,
        (await orderOf(woD)).voided], [true, true]);

    //  ══ البند ٣٢ (§4.ar): أمرُ تصنيعِ جهازٍ بلا متابعة — كان «العملية غير موجودة» فيبقى مفتوحاً والسعرُ ديناً ══
    console.log("\n── هـ. مريضٌ قديم: «تخصيص الطرف» بلا مسار المعاينة ولا حلقة ──");
    const pE = await mkPatient("هـ");
    await q(`UPDATE patients SET patient_classification = 'past' WHERE id = $1`, [pE]);
    //  قيدُ بيعٍ قديمٍ آخر على القسم نفسِه (بختمٍ آخر) — لا يُعكَس معه.
    const [cE] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pE]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, created_at)
             VALUES ($1,1,50000,'assign_manufacturing',$2,'2025-01-01')`, [pE, cE.id]);
    await q(`UPDATE patients SET total_cost = 50000 WHERE id = $1`, [pE]);
    await q(`UPDATE patient_cases SET cost = 50000 WHERE id = $1`, [cE.id]);
    const aE = await http("POST", `/api/patients/${pE}/assign-manufacturing`, S.admin,
      { serviceType: "prosthetic", expertUserId: EXPERT, cost: 950000 });
    check(aE.status === 201, "هـ١. (الإعداد) «تخصيص الطرف» لمريضٍ قديمٍ بلا حلقة", JSON.stringify(aE.body));
    const woE = Number(aE.body?.workOrderId);
    same("هـ٢. (الإعداد) الأمرُ بلا حلقة ولا متابعة",
      (await q(`SELECT device_episode_id FROM prosthetic_work_orders WHERE id=$1`, [woE]))[0].device_episode_id, null);
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount) VALUES ($1,1,$2,300000)`, [pE, cE.id]);
    const beforeE = await snap(pE);
    same("هـ٣. (الإعداد) الكلفةُ ٩٥٠,٠٠٠ والمقبوضُ ٣٠٠,٠٠٠", [beforeE.total, beforeE.ledger, beforeE.paid], [950000, 950000, 300000]);
    const pvE = await preview(woE);
    same("هـ٤. **المعاينةُ لا تقول «العملية غير موجودة»** — الكلفةُ قيدُ معاملة الأمر وحدَه (٩٠٠,٠٠٠ لا ٩٥٠,٠٠٠)",
      [pvE.status, pvE.body?.availableIntents, pvE.body?.saleAmount, pvE.body?.paidAmount],
      [200, ["cancel_operation"], 900000, 0]);
    check((pvE.body?.impact?.full_operation ?? []).some((l: any) => l.kind === "warn" && /يُردّ يدوياً/.test(l.text)),
      "هـ٥. **وتقول صراحةً إن المقبوضَ لا يُردّ آلياً** في هذا المسار");
    const okE = await execute(woE, pvE.body?.stateStamp);
    check(okE.status === 200, "هـ٦. **الأمرُ يُلغى** — بلا سؤال ردٍّ لا جوابَ له", JSON.stringify(okE.body));
    const afterE = await snap(pE);
    same("هـ٧. **والكلفةُ تُعكَس وحدَها**: يبقى القيدُ القديم، والمقبوضُ لا يُمَسّ",
      [afterE.total, afterE.case_cost, afterE.ledger, afterE.paid, afterE.payment_rows], [50000, 50000, 50000, 300000, 1]);
    same("هـ٨. والأمرُ ملغى إدارياً — يخرج من لوحة التصنيع", await orderOf(woE), { status: "cancelled", voided: true });

    console.log("\n── و. أمرُ بناءٍ على حلقةٍ بلا متابعة — وصيانتُه لا تُعكَس معه ──");
    const pF = await mkPatient("و");
    const [cF] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pF]);
    const [epF] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by, delivered_at)
       VALUES ($1,$2,1,1,'delivered',600000,$3,NOW()) RETURNING id`, [pF, cF.id, ADMIN]);
    const [woF] = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, device_episode_id, assigned_by, completed_at)
       VALUES ($1,1,$2,'prosthetic','completed','delivered','initial_build',$3,$4,NOW()) RETURNING id`, [pF, EXPERT, epF.id, ADMIN]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, device_episode_id)
             VALUES ($1,1,600000,'assign_manufacturing',$2,$3)`, [pF, cF.id, epF.id]);
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, device_episode_id, amount) VALUES ($1,1,$2,$3,200000)`, [pF, cF.id, epF.id]);
    await q(`UPDATE patients SET total_cost = 600000 WHERE id = $1`, [pF]);
    await q(`UPDATE patient_cases SET cost = 600000 WHERE id = $1`, [cF.id]);
    const mF = await maint({ patientId: pF, deviceEpisodeId: epF.id, originalPrice: 15000, discountAmount: 0, paidNow: 15000 });
    check(mF.status === 201, "و١. (الإعداد) صيانةٌ مدفوعةٌ على الجهاز نفسِه", JSON.stringify(mF.body));
    const pvF = await preview(woF.id);
    same("و٢. **المعاينةُ: ثمنُ الجهاز ومقبوضُه وحدهما** — بلا أجر الصيانة ولا دفعتها",
      [pvF.status, pvF.body?.saleAmount, pvF.body?.paidAmount], [200, 600000, 200000]);
    const okF = await execute(woF.id, pvF.body?.stateStamp, { refundAnswer: "yes" });
    check(okF.status === 200, "و٣. **أمرُ البناء يُلغى ويُردّ مقبوضُه**", JSON.stringify(okF.body));
    const afterF = await snap(pF);
    same("و٤. **ويبقى مالُ الصيانة وحدَه**", [afterF.total, afterF.ledger, afterF.paid], [15000, 15000, 15000]);
    same("و٥. والحلقةُ مُبطَلةٌ وتبقى «مسلَّمة» (التسليمُ واقعة)",
      (await q(`SELECT status, admin_void_reversal_id IS NOT NULL AS v FROM patient_device_episodes WHERE id=$1`, [epF.id]))[0],
      { status: "delivered", v: true });
    same("و٦. وأمرُ الصيانة لا يُمَسّ", (await orderOf(Number(mF.body?.workOrderId))).voided, false);

    console.log("\n── ز. أمرٌ قديمٌ ملغى وأمرٌ قائمٌ على الحلقة نفسِها ──");
    const pG = await mkPatient("ز");
    const [cG] = await q(`SELECT id FROM patient_cases WHERE patient_id=$1`, [pG]);
    const [epG] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by)
       VALUES ($1,$2,1,1,'in_manufacturing',400000,$3) RETURNING id`, [pG, cG.id, ADMIN]);
    const [oldG] = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, device_episode_id, assigned_by)
       VALUES ($1,1,$2,'prosthetic','cancelled','order_received','initial_build',$3,$4) RETURNING id`, [pG, EXPERT, epG.id, ADMIN]);
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type, status, current_stage, purpose, device_episode_id, assigned_by)
             VALUES ($1,1,$2,'prosthetic','active','order_received','initial_build',$3,$4)`, [pG, EXPERT, epG.id, ADMIN]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id, device_episode_id)
             VALUES ($1,1,400000,'assign_manufacturing',$2,$3)`, [pG, cG.id, epG.id]);
    await q(`UPDATE patients SET total_cost = 400000 WHERE id = $1`, [pG]);
    const beforeG = await snap(pG);
    const pvG = await preview(oldG.id);
    same("ز١. **مالُ الحلقة للأمر القائم** — الملغى القديمُ بلا كلفة",
      [pvG.status, pvG.body?.saleAmount, pvG.body?.paidAmount], [200, 0, 0]);
    const okG = await execute(oldG.id, pvG.body?.stateStamp);
    same("ز٢. **ولا مالَ يتحرّك ولا تُبطَل الحلقة**",
      [okG.status, (await snap(pG)).ledger, (await snap(pG)).total, beforeG.ledger,
        (await q(`SELECT admin_void_reversal_id FROM patient_device_episodes WHERE id=$1`, [epG.id]))[0].admin_void_reversal_id],
      [200, 400000, 400000, 400000, null]);
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
