// **سجلُّ الزيارات سجلُّ الحضور كلِّه** (قرارُ المالك ٢٠٢٦-١٠-٠١، §4.aw) — `npm run test:attendance-visits`، حيٌّ على النقاط الحقيقية.
//
// «تدريب على الجهاز» زيارةٌ بلا مالٍ ولا طبيب، وكلُّ إجراءٍ بحضور المريض يكتب زيارتَه بسببه: طلبُ المعاينة · «تم الشراء» ·
// استلامُ الجهاز · «عاد للشراء» · شراءُ الجزء · الصيانة · «تخصيص الطرف» · والمتابعة.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { randomUUID } from "crypto";

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

const PORT = 6971;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سجل-الحضور";
const TOK = "att-tok-";
const ADMIN = 99710, RECV = 99711, MGR = 99712, EXPERT = 99713, MGR_B2 = 99714, DOC = 99715;
const USERS = [ADMIN, RECV, MGR, EXPERT, MGR_B2, DOC];
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
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "الطبيب", permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "الخبير", permissions: { canViewPatients: true } },
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
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
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
    [EXPERT, "prosthetics_expert", 1], [MGR_B2, "branch_manager", 2], [DOC, "doctor", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, is_active=true`,
      [id, `att_u${id}`, role, branch, JSON.stringify([branch])]);
  }
  await q(`UPDATE system_users SET medical_specialties='["prosthetic","medical_support"]'::jsonb WHERE id=$1`, [DOC]);
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
  /** سجلُّ الزيارات كما يقرؤه الملفّ: السببُ (العنوان) والجهازُ والقسم. */
  const visitsOf = async (pid: number) => q(`SELECT v.details, v.notes, v.device_episode_id, pc.case_type, v.created_by
      FROM visits v LEFT JOIN patient_cases pc ON pc.id = v.case_id
     WHERE v.patient_id = $1 AND v.deleted_at IS NULL ORDER BY v.id`, [pid]);
  const reasons = async (pid: number) => (await visitsOf(pid)).map((v: any) => v.details);
  const caseOf = async (pid: number) => (await q(`SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [pid]))[0].id;
  let tok = 0;

  try {
    console.log("\n── أ. تدريب على الجهاز ──");
    const pA = await mkPatient("تدريب");
    const cA = await caseOf(pA);
    const train = (d: string) => http("POST", "/api/visits", S.recv, {
      patientId: pA, branchId: 1, caseId: cA, notes: "تدريب على المشي", treatmentType: null,
      customDate: d, visitReason: "training",
    });
    const t1 = await train(ymd(1));
    const t2 = await train(ymd(0));
    same("أ١. **التدريبُ يُحفَظ زيارةً سببُها «تدريب على الجهاز»** — ويتكرّر يوماً بعد يوم",
      [t1.status, t2.status, await reasons(pA)], [201, 201, ["تدريب على الجهاز", "تدريب على الجهاز"]]);
    same("أ٢. **ولا طبيبَ ولا مال**: لا طلبَ مراجعة ولا قيدَ ولا دفعة",
      (await q(`SELECT
         (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews,
         (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS costs,
         (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS pays`, [pA]))[0],
      { reviews: 0, costs: 0, pays: 0 });
    same("أ٣. وعلى قسم الأطراف، بمَن سجّله", (await visitsOf(pA)).map((v: any) => [v.case_type, v.created_by]),
      [["prosthetic", RECV], ["prosthetic", RECV]]);
    const tOld = await train(ymd(5));
    same("أ٤. وقاعدةُ الأيام الثلاثة نفسُها (أقدمُ منها للمسؤول العام)", [tOld.status, (await reasons(pA)).length], [403, 2]);

    console.log("\n── ب. طلبُ معاينة ⟵ تم الشراء ⟵ استلامُ الجهاز ──");
    const pB = await mkPatient("شراء");
    const ep = await http("POST", `/api/patients/${pB}/device-episodes`, S.recv,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    check(ep.status === 201, "ب١. (الإعداد) طلبُ معاينة", JSON.stringify(ep.body));
    const vB1 = await visitsOf(pB);
    same("ب٢. **«يحتاج معاينة طبية» تكتب زيارةَ «طلب معاينة طبية»** — بلا ربطٍ بالحلقة (يبقى الطلبُ قابلاً للسحب)",
      vB1.map((v: any) => [v.details, v.device_episode_id, v.case_type]), [["طلب معاينة طبية", null, "prosthetic"]]);
    const ex = await http("POST", `/api/medical/patients/${pB}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", diagnosis: "تشخيص", plan: "خطّة",
    });
    check(ex.status < 300, "ب٣. (الإعداد) معاينةٌ موقّعة", JSON.stringify(ex.body));
    const [f] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pB]);
    const sale = await http("POST", `/api/followups/${f.id}/complete-sale`, S.recv,
      { originalPrice: 1_000_000, discountAmount: 0, expertUserId: EXPERT });
    check(sale.status === 200, "ب٤. (الإعداد) «تم الشراء»", JSON.stringify(sale.body));
    const epB = Number(ep.body?.id ?? ep.body?.episode?.id);
    same("ب٥. **«تم الشراء» تكتب «شراء طرف صناعي» على الجهاز**",
      (await visitsOf(pB)).slice(1).map((v: any) => [v.details, v.device_episode_id]), [["شراء طرف صناعي", epB]]);
    const wo = Number(sale.body?.workOrderId);
    //  إلحاقُ جزءٍ بالطرف قيد التصنيع — المسارُ الثاني لشراء الجزء.
    const att = await http("POST", "/api/no-exam/device-sale", S.recv, {
      patientId: pB, component: "foot", expertUserId: EXPERT, originalPrice: 100000, discountAmount: 0, paidNow: 0,
      attachToDeviceEpisodeId: epB,
    });
    same("ب٥أ. **وإلحاقُ جزءٍ بالطرف قيد التصنيع يكتب «شراء جزء: …» على الجهاز نفسِه**",
      [att.status, (await visitsOf(pB)).slice(2).map((v: any) => [v.details.startsWith("شراء جزء: "), v.device_episode_id])],
      [201, [[true, epB]]]);
    for (const body of [{}, { expectedDeliveryDate: "2026-12-01" }, {}, {}]) {
      await http("PATCH", `/api/manufacturing/orders/${wo}/advance`, S.expert, body);
    }
    same("ب٦. (الإعداد) بلغ «جاهز للتجربة» بلا زيارةٍ لكلّ مرحلة", (await reasons(pB)).length, 3);
    const del = await http("PATCH", `/api/manufacturing/orders/${wo}/advance`, S.expert, { finalResult: "first_fit_success" });
    same("ب٧. **التسليمُ يكتب «استلام الجهاز»** — مرّةً واحدة",
      [del.status, (await reasons(pB)).slice(3)], [200, ["استلام الجهاز"]]);

    console.log("\n── ج. لم يشترِ ⟵ عاد للشراء ──");
    const pC = await mkPatient("عاد للشراء");
    const epC = await http("POST", `/api/patients/${pC}/device-episodes`, S.recv,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    await http("POST", `/api/medical/patients/${pC}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", diagnosis: "تشخيص", plan: "خطّة",
    });
    const [fc] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pC]);
    const nb = await http("POST", `/api/followups/${fc.id}/not-bought`, S.recv, { reason: "غالٍ" });
    check(nb.status < 300, "ج١. (الإعداد) «لم يشترِ»", JSON.stringify(nb.body));
    const rtp = await http("POST", "/api/followups/return-to-purchase", S.recv,
      { patientId: pC, deviceEpisodeId: Number(epC.body?.id ?? epC.body?.episode?.id), receptionNote: "قرّر الشراء" });
    same("ج٢. **«عاد للشراء» تكتب زيارتَها** بملاحظة الاستقبال",
      [rtp.status, (await visitsOf(pC)).map((v: any) => [v.details, v.notes])],
      [201, [["طلب معاينة طبية", "طرف صناعي كامل"], ["عاد للشراء", "قرّر الشراء"]]]);

    //  والقرارُ السابقُ بلا حلقة (معاينةٌ بلا طلب جهاز) — المسارُ الثاني لـ«عاد للشراء».
    const pC2 = await mkPatient("عاد للشراء بلا حلقة");
    await http("POST", `/api/medical/patients/${pC2}/exams`, S.doc, {
      idempotencyKey: randomUUID(), caseType: "prosthetic", diagnosis: "تشخيص", plan: "خطّة",
    });
    const [fc2] = await q(`SELECT id, device_episode_id FROM post_exam_followups WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pC2]);
    //  (الإعداد) قرارٌ سابقٌ «لم يشترِ» بلا حلقة — شكلُ الصفوف الموروثة، يُكتب مباشرةً.
    await q(`UPDATE post_exam_followups SET status='closed_without_purchase' WHERE id=$1`, [fc2.id]);
    const rtp2 = await http("POST", "/api/followups/return-to-purchase", S.recv, { patientId: pC2, followupId: fc2.id });
    same("ج٣. **وبلا حلقة كذلك**", [fc2.device_episode_id, rtp2.status, await reasons(pC2)], [null, 201, ["عاد للشراء"]]);

    console.log("\n── د. شراءُ جزء · صيانة · تخصيصُ الطرف لمريضٍ قديم ──");
    const pD = await mkPatient("جزء وصيانة");
    const part = await http("POST", "/api/no-exam/device-sale", S.recv, {
      patientId: pD, component: "knee", expertUserId: EXPERT, originalPrice: 300000, discountAmount: 0, paidNow: 0,
    });
    check(part.status === 201, "د١. (الإعداد) بيعُ جزء", JSON.stringify(part.body));
    same("د٢. **شراءُ الجزء يكتب «شراء جزء: …» على حلقته**",
      (await visitsOf(pD)).map((v: any) => [v.details.startsWith("شراء جزء: "), v.device_episode_id]),
      [[true, Number(part.body?.deviceEpisodeId)]]);
    const mt = await http("POST", "/api/no-exam/maintenance", S.recv, {
      patientId: pD, serviceType: "prosthetic", legacyUnrecordedDevice: true, maintenanceComponent: "knee",
      expertUserId: EXPERT, originalPrice: 20000, discountAmount: 0, paidNow: 0, submissionToken: `${TOK}${++tok}`,
    });
    check(mt.status === 201, "د٣. (الإعداد) صيانة", JSON.stringify(mt.body));
    same("د٤. **والصيانةُ زيارةٌ واحدة عنوانُها «صيانة»**", (await reasons(pD)).slice(1), ["صيانة"]);
    const pE = await mkPatient("قديم");
    await q(`UPDATE patients SET patient_classification='past' WHERE id=$1`, [pE]);
    const asg = await http("POST", `/api/patients/${pE}/assign-manufacturing`, S.admin,
      { serviceType: "prosthetic", expertUserId: EXPERT, cost: 500000 });
    same("د٥. **«تخصيص الطرف» لمريضٍ قديم يكتب «شراء طرف صناعي»**",
      [asg.status, await reasons(pE)], [201, ["شراء طرف صناعي"]]);

    console.log("\n── هـ. متابعة أو تعديل — السببُ عنوانُ السطر ──");
    const pF = await mkPatient("متابعة");
    const fu = await http("POST", "/api/visits", S.recv, {
      patientId: pF, branchId: 1, caseId: await caseOf(pF), notes: null, treatmentType: null,
      details: "متابعة أو تعديل على جهاز قائم", reviewPath: "quick", reviewKind: "adjustment",
    });
    same("هـ١. المتابعةُ تُحفَظ بعنوانها وتصل الطبيب كما كانت",
      [fu.status, await reasons(pF),
        (await q(`SELECT count(*)::int n FROM medical_review_requests WHERE patient_id=$1`, [pF]))[0].n],
      [201, ["متابعة أو تعديل على جهاز قائم"], 1]);
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
