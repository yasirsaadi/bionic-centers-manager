// الجهاز الثاني، من أوّله إلى آخره — حيّاً على Postgres.
// قاعدة محلّية: `npm run test:episode-integration`.
//
// ══ السيناريو الذي بُنيت له الميزة كلّها ═════════════════════════════════
// مريضٌ يملك طرفاً **مسلَّماً**. يعود بعد سنتين لطرفٍ جديد. فيُفتح طلبٌ على
// خيطه القائم، ويعاينه الطبيب، ويُخصَّص ويُصنَّع، وتُقبَض دفعاته وتُسجَّل
// زياراته — **وكلّ ذلك بينما طرفُه القديم يُصان في الوقت نفسه**.
//
// وهذا الأخير هو الاختبار الحاسم: قبل ترحيل ٠٥١ كان أحدهما يمنع الآخر،
// فإمّا تنتظر الصيانة جهازاً لم يُسلَّم بعد وإمّا يتعطّل الجديد حتى تنتهي
// صيانة القديم. وكلاهما منعٌ بلا سبب: عملان على جهازين مختلفين.
//
// ══ وما يحرسه أيضاً ═════════════════════════════════════════════════════
// (١) **كلّ كتابةٍ تذهب إلى جهازها**: أمرُ الصيانة وزيارتها وقيدُ أجرتها
//     إلى القديم، وأمرُ البناء ودفعتُه وزيارتُه إلى الجديد.
// (٢) **لا تخمين في الهوية**: دفعةٌ أو صيانةٌ بلا اختيارٍ صريح تُردّ.
// (٣) **ولا فساد لاحق**: دفعةٌ أو زيارةٌ مرتبطة لا يتغيّر نوعها.
// (٤) **ولا صفَّ تاريخيّاً يُمَسّ**.

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import * as mfg from "./manufacturing/store";
import { resolveDeviceTargetTx } from "./device_episodes/store";

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

const PORT = 6831;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-التكامل-النهائي";
const MANAGER = 9841, DOCTOR = 9842, EXPERT = 9843, RECEPTION = 9844;

const S = {
  manager: { userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPayments: true, canEditVisits: true } },
  doctor: { userId: DOCTOR, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc", permissions: { canViewPatients: true } },
  reception: { userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "recv",
    permissions: { canViewPatients: true, canAddPatients: true } },
  admin: { userId: MANAGER, role: "admin", isAdmin: true, branchId: 1,
    accessibleBranches: [1], displayName: "adm",
    permissions: { canViewPatients: true, canAddPatients: true, canEditPayments: true, canEditVisits: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(name: string, totalCost = 0) {
  const r = await q<{ id: number }>(
    //  **المقاساتُ وتعريفُ البتر كاملان**: بدءُ جهازٍ جديد يشترطهما — الطرفُ
    //  يُصنَع عليها، وملفٌّ ناقصٌ لا يدخل دورةَ تصنيعٍ جديدة.
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       height, weight, amputation_site,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','172','78',
             'احادي - طرف سفلي - يمين - تحت الركبة',
             'amputee',1,true,$3,'new') RETURNING id`,
    [name, MARK, totalCost]);
  return r[0].id;
}
async function mkCase(patientId: number, cost = 0, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,$3,'manual','active') RETURNING id`, [patientId, caseType, cost]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number, status: string, agreedCost = 0) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by, delivered_at)
     VALUES ($1,$2,1,$3,$4,$5,$6,CASE WHEN $4='delivered' THEN NOW() ELSE NULL END) RETURNING id`,
    [patientId, caseId, seq, status, agreedCost, MANAGER]);
  return r[0].id;
}
async function mkExam(patientId: number, caseId: number, deviceCost: number | null, episodeId: number | null) {
  const r = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name,
       diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. فلان','تشخيص','{}'::jsonb,$4,1,NOW(),$5) RETURNING id`,
    [patientId, caseId, DOCTOR, deviceCost, episodeId]);
  return r[0].id;
}
async function epRow(id: number) {
  const [r] = await q(`SELECT id, status, agreed_cost, delivered_at FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
}
async function ordersOf(patientId: number) {
  return q(`SELECT id, purpose, status, device_episode_id FROM prosthetic_work_orders
             WHERE patient_id=$1 ORDER BY id`, [patientId]);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  //  متابعةُ ما بعد المعاينة (ترحيل ٠٥٣) تشير إلى الحلقة — فتسبقها هنا
  //  كما تسبقها في كاسكيد `storage.deletePatient`.
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function deliverOrder(orderId: number) {
  for (const st of ["measurements", "mold", "manufacturing", "ready_for_fitting", "delivered"]) {
    const order = await mfg.getRawOrder(orderId);
    await mfg.updateStage({
      order: order as any, toStage: st,
      deliveryDate: st === "mold" ? "2026-12-01" : null,
      finalResult: st === "delivered" ? "success" : null,
      performedBy: MANAGER,
    });
  }
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec] of [
    [MANAGER, "branch_manager", "null"], [DOCTOR, "doctor", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "null"], [RECEPTION, "reception", "null"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, medical_specialties=EXCLUDED.medical_specialties`,
      [id, `di_u${id}`, role, spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    const historyBefore = await q(
      `SELECT id, status, agreed_cost, delivered_at FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}') ORDER BY id`);
    const linkedBefore = await q(`SELECT
        (SELECT count(*)::int FROM payments     WHERE device_episode_id IS NOT NULL) AS pay,
        (SELECT count(*)::int FROM visits       WHERE device_episode_id IS NOT NULL) AS vis,
        (SELECT count(*)::int FROM cost_entries WHERE device_episode_id IS NOT NULL) AS ce`);

    // ══════════ السيناريو الكامل ══════════════════════════════════════
    console.log("\n── المريض العائد: من الطلب إلى التسليم ──");
    const P = await mkPatient("العائد", 1_000_000);
    const C = await mkCase(P, 1_000_000);
    const dev1 = await mkEpisode(P, C, 1, "delivered", 1_000_000);   // طرفه القديم

    // ١. الموظّف يفتح طلب جهاز جديد من الواجهة.
    const started = await http("POST", `/api/patients/${P}/device-episodes`, S.reception,
      { serviceType: "prosthetic" });
    same("١. «جهاز جديد» فتح الطلب", started.status, 201);
    const dev2 = started.body.id;
    same("   بحالة «بانتظار معاينة» وتسلسل ٢",
      [started.body.status, started.body.sequenceNumber], ["awaiting_exam", 2]);

    // ٢. الطبيب يوقّع معاينة الجهاز الجديد.
    const exam = await http("POST", `/api/medical/patients/${P}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "بتر تحت الركبة", deviceCost: 1_500_000,
      prescription: { prostheticType: "تحت الركبة" },
    });
    same("٢. المعاينة وُقّعت", exam.status, 200);
    same("   ومرتبطة بالجهاز الجديد", exam.body?.deviceEpisodeId, dev2);
    same("   والحلقة صارت «مُعايَنة»", (await epRow(dev2))?.status, "examined");

    // ٣. البيع يمرّ بمتابعة ما بعد المعاينة (ترحيل ٠٥٣).
    //
    //    توقيعُ المعاينة صار يفتح متابعةً لهذا الجهاز، وبابُ «تخصيص» المباشر
    //    يُغلق ما دامت حيّة: البيع يمرّ بموافقة المريض ثم باعتماد طبيبٍ أو
    //    مسؤول. والخطواتُ الثلاث أدناه هي المسار الرسمي الجديد — وما بعدها
    //    من تأكيداتٍ لم يتغيّر حرفاً، لأن الاعتماد ينادي
    //    `assignManufacturing` نفسها.
    const fu = (await http("GET", `/api/followups/patient/${P}`, S.reception)).body?.[0];
    same("٣. المتابعة فُتحت بسعر المعاينة",
      [fu?.status, fu?.approvedPrice], ["awaiting_patient_decision", 1_500_000]);
    same("   وبابُ «تخصيص» المباشر مغلق ما دامت حيّة",
      (await http("POST", `/api/patients/${P}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 409);
    await http("POST", `/api/followups/${fu.id}/expert`, S.reception, { expertUserId: EXPERT });
    await http("POST", `/api/followups/${fu.id}/accept-price`, S.reception, {});
    //  والطبيبُ المخوَّل **يستطيع** أن يؤكّد إن حضر — ولا يُطلَب منه ذلك:
    //  الاستقبالُ ومديرُ الفرع يُتمّان المسارَ وحدهما (مُثبَتٌ في
    //  `test:followup`).
    const assign = await http("POST", `/api/followups/${fu.id}/approve-purchase`, S.doctor, {});
    same("   وتأكيدُ الشراء بدأ التصنيع", assign.status, 200);
    same("   والحلقة «قيد التصنيع» بسعرها",
      [(await epRow(dev2))?.status, (await epRow(dev2))?.agreed_cost],
      ["in_manufacturing", 1_500_000]);
    const buildOrder = (await ordersOf(P)).find((o: any) => o.purpose === "initial_build");
    same("   وأمرُ البناء مرتبطٌ بالجديد", Number(buildOrder?.device_episode_id), dev2);
    const saleEntry = await q(`SELECT amount, device_episode_id FROM cost_entries
                                WHERE patient_id=$1 AND source='assign_manufacturing'`, [P]);
    same("   وقيدُ البيع موسومٌ به",
      saleEntry.map((e: any) => [Number(e.amount), Number(e.device_episode_id)]), [[1_500_000, dev2]]);

    // ٤. دفعةٌ على الجهاز الجديد.
    const pay = await http("POST", `/api/payments`, S.reception, {
      patientId: P, branchId: 1, amount: 500_000, paymentTreatmentType: "أطراف صناعية",
      deviceEpisodeId: dev2,
    });
    same("٤. الدفعة سُجّلت", pay.status, 201);
    same("   ومرتبطة بالجهاز الجديد", pay.body?.deviceEpisodeId, dev2);

    // ٥. زيارةٌ على الجهاز الجديد.
    const vis = await http("POST", `/api/visits`, S.reception, {
      patientId: P, branchId: 1, caseId: C, deviceEpisodeId: dev2, notes: "متابعة تصنيع",
    });
    same("٥. الزيارة سُجّلت", vis.status, 201);
    same("   ومرتبطة بالجهاز الجديد", vis.body?.deviceEpisodeId, dev2);

    // ٦. **وبينما الجديد يُصنَّع**: صيانةٌ على القديم المسلَّم.
    console.log("\n── التعايش: صيانة القديم أثناء تصنيع الجديد ──");
    const maint = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: P, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 75_000, notes: "صيانة الطرف القديم", deviceEpisodeId: dev1,
    });
    same("٦. الصيانة فُتحت رغم أن الجديد قيد التصنيع", maint.status, 201);

    const allOrders = await ordersOf(P);
    same("   وأمران مفتوحان معاً — بناءٌ وصيانة",
      allOrders.map((o: any) => [o.purpose, Number(o.device_episode_id), o.status]),
      [["initial_build", dev2, "active"], ["maintenance", dev1, "active"]]);

    const maintVisit = await q(`SELECT device_episode_id FROM visits
        WHERE patient_id=$1 AND notes LIKE '%صيانة الطرف القديم%'`, [P]);
    same("   وزيارةُ الصيانة على القديم", Number(maintVisit[0]?.device_episode_id), dev1);
    const maintEntry = await q(`SELECT amount, device_episode_id FROM cost_entries
        WHERE patient_id=$1 AND source='maintenance'`, [P]);
    same("   وقيدُ أجرتها على القديم",
      maintEntry.map((e: any) => [Number(e.amount), Number(e.device_episode_id)]), [[75_000, dev1]]);

    // ٧. إنجاز الصيانة لا يمسّ أيّاً من الحلقتين.
    const maintOrder = allOrders.find((o: any) => o.purpose === "maintenance");
    await mfg.updateStage({
      order: (await mfg.getRawOrder(Number(maintOrder!.id))) as any,
      toStage: "maintenance_cast_done", performedBy: MANAGER,
    });
    same("٧. الصيانة اكتملت", (await ordersOf(P)).find((o: any) => o.purpose === "maintenance")?.status, "completed");
    same("   والقديم ما زال «مُسلَّماً»", (await epRow(dev1))?.status, "delivered");
    same("   والجديد ما زال «قيد التصنيع»", (await epRow(dev2))?.status, "in_manufacturing");

    // ٨. وأخيراً يُسلَّم الجديد.
    await deliverOrder(Number(buildOrder!.id));
    same("٨. الجهاز الجديد صار «مُسلَّماً»", (await epRow(dev2))?.status, "delivered");
    same("   والقديم كما هو", (await epRow(dev1))?.status, "delivered");

    // ══════════ سلامة إسناد الدفعات ══════════════════════════════════
    console.log("\n── سلامة إسناد الدفعات ──");
    const pay2 = async (body: any) => http("POST", `/api/payments`, S.reception, {
      patientId: P, branchId: 1, amount: 100_000, paymentTreatmentType: "أطراف صناعية", ...body,
    });
    const noTarget = await pay2({});
    same("أ. جهازان مؤهَّلان ودفعةٌ بلا اختيار ⟶ مرفوضة", noTarget.status, 400);
    check(/حدّد الجهاز/.test(noTarget.body?.message ?? ""), "   برسالة تدلّ على الاختيار", noTarget.body?.message);
    same("   ولا دفعةَ كُتبت",
      (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND amount=100000`, [P]))[0].n, 0);

    const okTarget = await pay2({ deviceEpisodeId: dev2 });
    same("ب. واختيارُ جهازٍ بعينه ⟶ مرتبطة به", [okTarget.status, okTarget.body?.deviceEpisodeId], [201, dev2]);

    const other = await mkPatient("مريض آخر");
    const otherCase = await mkCase(other, 0);
    const otherEp = await mkEpisode(other, otherCase, 1, "delivered", 0);
    same("ج. وجهازُ مريضٍ آخر ⟶ مرفوض", (await pay2({ deviceEpisodeId: otherEp })).status, 400);

    await q(`UPDATE patients SET is_medical_support=true WHERE id=$1`, [P]);
    const supCase = await mkCase(P, 0, "medical_support");
    const supEp = await mkEpisode(P, supCase, 1, "delivered", 0);
    same("د. وجهازُ مساندٍ لدفعة أطراف ⟶ مرفوض", (await pay2({ deviceEpisodeId: supEp })).status, 400);

    const cancelledEp = await mkEpisode(P, C, 3, "cancelled", 0);
    same("هـ. وجهازٌ ملغى ⟶ مرفوض", (await pay2({ deviceEpisodeId: cancelledEp })).status, 400);

    const unalloc = await pay2({ unallocatedDeviceBalance: true });
    same("و. و«رصيد قديم» صريح ⟶ تُسجَّل بلا هوية",
      [unalloc.status, unalloc.body?.deviceEpisodeId], [201, null]);

    const legacy = await mkPatient("مريض إرث", 500_000);
    await mkCase(legacy, 500_000);
    const legacyPay = await http("POST", `/api/payments`, S.reception, {
      patientId: legacy, branchId: 1, amount: 100_000, paymentTreatmentType: "أطراف صناعية",
    });
    same("ز. ومريضٌ بلا أجهزة مسجَّلة ⟶ السلوك القديم بلا سؤال",
      [legacyPay.status, legacyPay.body?.deviceEpisodeId], [201, null]);

    const retag = await http("PATCH", `/api/payments/${okTarget.body.id}`, S.admin,
      { paymentTreatmentType: "مساند طبية" });
    same("ح. ودفعةٌ مرتبطة لا يتغيّر نوعها إلى خدمة أخرى", retag.status, 409);
    same("   ورابطها كما هو",
      Number((await q(`SELECT device_episode_id FROM payments WHERE id=$1`, [okTarget.body.id]))[0].device_episode_id), dev2);

    // ══════════ سلامة إسناد الزيارات ═════════════════════════════════
    console.log("\n── سلامة إسناد الزيارات ──");
    const mkVisit = (body: any) => http("POST", `/api/visits`, S.reception, {
      patientId: P, branchId: 1, caseId: C, notes: "زيارة", ...body,
    });
    same("زيارةٌ بجهاز مريضٍ آخر ⟶ مرفوضة", (await mkVisit({ deviceEpisodeId: otherEp })).status, 400);
    same("وبجهاز مساندٍ على خيط أطراف ⟶ مرفوضة", (await mkVisit({ deviceEpisodeId: supEp })).status, 400);
    const generalVisit = await mkVisit({});
    same("وزيارةٌ عامّة بلا اختيار ⟶ تُسجَّل بلا هوية",
      [generalVisit.status, generalVisit.body?.deviceEpisodeId], [201, null]);

    const linkedVisit = await mkVisit({ deviceEpisodeId: dev1, treatmentType: "أطراف صناعية" });
    same("وزيارةٌ مرتبطة تُسجَّل", [linkedVisit.status, Number(linkedVisit.body?.deviceEpisodeId)], [201, dev1]);
    const visRetag = await http("PATCH", `/api/visits/${linkedVisit.body.id}`, S.admin,
      { treatmentType: "مساند طبية" });
    same("ولا يتغيّر نوعها إلى خدمة أخرى", visRetag.status, 409);

    // ══════════ تزامن الصيانة ════════════════════════════════════════
    console.log("\n── تزامن الصيانة ──");
    const pm = await mkPatient("صيانة متزامنة");
    const cm = await mkCase(pm, 0);
    const d1 = await mkEpisode(pm, cm, 1, "delivered", 0);
    const d2 = await mkEpisode(pm, cm, 2, "delivered", 0);
    const races = await Promise.all(Array.from({ length: 4 }, () =>
      http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
        patientId: pm, expertUserId: EXPERT, serviceType: "prosthetic",
        cost: 0, notes: "صيانة متزامنة", deviceEpisodeId: d1,
      })));
    same("أربع محاولات على الجهاز نفسه ⟶ نجاح واحد", races.filter((r) => r.status === 201).length, 1);
    check(!races.some((r) => JSON.stringify(r.body ?? "").includes("duplicate key")),
      "   بلا تسريب خطأ قاعدة بيانات", JSON.stringify(races.map((r) => r.body?.error)));
    same("   وأمرُ صيانةٍ واحد",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1 AND purpose='maintenance'`, [pm]))[0].n, 1);

    const second = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: pm, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 0, notes: "صيانة الجهاز الثاني", deviceEpisodeId: d2,
    });
    same("وجهازٌ مسلَّمٌ آخر ⟶ صيانته الخاصّة تُفتح معه", second.status, 201);
    same("   فصار أمرا صيانة متوازيان",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1 AND purpose='maintenance'`, [pm]))[0].n, 2);

    const noChoice = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: pm, expertUserId: EXPERT, serviceType: "prosthetic", cost: 0, notes: "بلا اختيار",
    });
    same("وصيانةٌ بلا اختيارٍ ومعه أجهزة مسجَّلة ⟶ مرفوضة", noChoice.status, 400);
    same("وجهازٌ غير مسلَّم لا يُصان",
      (await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
        patientId: P, expertUserId: EXPERT, serviceType: "prosthetic", cost: 0,
        notes: "صيانة ملغى", deviceEpisodeId: cancelledEp,
      })).status, 400);

    // ══════════ المعرّف الصريح لا يُتجاهَل أبداً ═══════════════════════
    // قائمةُ المرشّحين الفارغة ليست إذناً بابتلاع اختيارِ الموظّف: معرّفٌ
    // أُرسل صراحةً يُتحقَّق منه دائماً، ويُردّ إن لم يصلح.
    console.log("\n── المعرّف الصريح لا يُتجاهَل ──");
    //  برصيدٍ حقيقي عمداً: بلا كلفةٍ يردّ الحارسُ القديم الدفعةَ لانعدام
    //  المتبقّي، فيمرّ الاختبار لسببٍ غير الذي وُضع له.
    const pOnlyCancelled = await mkPatient("ملغىً وحده", 500_000);
    const cOC = await mkCase(pOnlyCancelled, 500_000);
    const epOC = await mkEpisode(pOnlyCancelled, cOC, 1, "cancelled", 0);
    const payBefore = (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pOnlyCancelled]))[0].n;
    const explicitCancelled = await http("POST", `/api/payments`, S.reception, {
      patientId: pOnlyCancelled, branchId: 1, amount: 100_000,
      paymentTreatmentType: "أطراف صناعية", deviceEpisodeId: epOC,
    });
    same("١. جهازٌ ملغى وهو الوحيد ⟶ الدفعة تُردّ ٤٠٠", explicitCancelled.status, 400);
    same("   ولا دفعةَ كُتبت",
      (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pOnlyCancelled]))[0].n, payBefore);

    const pOnlyMfg = await mkPatient("قيد التصنيع وحده");
    const cOM = await mkCase(pOnlyMfg, 0);
    const epOM = await mkEpisode(pOnlyMfg, cOM, 1, "in_manufacturing", 0);
    const beforeM = await q(`SELECT
        (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS wo,
        (SELECT count(*)::int FROM visits WHERE patient_id=$1) AS vis,
        (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ce,
        (SELECT COALESCE(total_cost,0) FROM patients WHERE id=$1) AS total`, [pOnlyMfg]);
    const explicitMfg = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: pOnlyMfg, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 50_000, notes: "صيانة جهاز غير مسلَّم", deviceEpisodeId: epOM,
    });
    same("٢. وجهازٌ قيد التصنيع كهدف صيانة ⟶ يُردّ ٤٠٠", explicitMfg.status, 400);
    const afterM = await q(`SELECT
        (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS wo,
        (SELECT count(*)::int FROM visits WHERE patient_id=$1) AS vis,
        (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ce,
        (SELECT COALESCE(total_cost,0) FROM patients WHERE id=$1) AS total`, [pOnlyMfg]);
    same("   ولا أمر ولا زيارة ولا قيد ولا حركة مالية", afterM, beforeM);

    same("٣. وطلبٌ يجمع جهازاً محدَّداً و«قديم» معاً ⟶ متناقض يُردّ",
      (await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
        patientId: pOnlyMfg, expertUserId: EXPERT, serviceType: "prosthetic", cost: 0,
        notes: "متناقض", deviceEpisodeId: epOM, legacyUnrecordedDevice: true,
      })).status, 400);

    // ══════════ الصيانة لها بابٌ واحد ═════════════════════════════════
    console.log("\n── باب الصيانة الوحيد ──");
    const pGen = await mkPatient("باب الصيانة");
    await mkCase(pGen, 0);
    const genericMaint = await http("POST", `/api/manufacturing/orders`, S.manager, {
      patientId: pGen, serviceType: "prosthetic", expertUserId: EXPERT, purpose: "maintenance",
    });
    check(genericMaint.status === 400 || genericMaint.status === 409,
      "٤. النقطة العامّة لم تعد تنشئ صيانة", String(genericMaint.status));
    check(/صيانة طرف\/مسند/.test(genericMaint.body?.error ?? ""),
      "   وتدلّ على المسار الوحيد", genericMaint.body?.error);
    same("   ولا أمر أُنشئ", (await ordersOf(pGen)).length, 0);

    // ══════════ السباق: القرار داخل المعاملة ══════════════════════════
    console.log("\n── السباق ──");
    // الدفعة: التخصيص يسبق فيجعل الحلقة مؤهَّلة، فدفعةٌ بلا هدف تُردّ —
    // ولا تمرّ بلا هوية اعتماداً على قراءةٍ سابقة للتخصيص.
    const pRace = await mkPatient("سباق الدفعة", 1_000_000);
    const cRace = await mkCase(pRace, 1_000_000);
    const eRace = await mkEpisode(pRace, cRace, 1, "examined", 0);
    await mkExam(pRace, cRace, 800_000, eRace);
    same("٥. قبل التخصيص: لا مرشّح ⟶ دفعةٌ بلا هوية مسموحة (المسار القديم)",
      (await http("POST", `/api/payments`, S.reception, {
        patientId: pRace, branchId: 1, amount: 10_000, paymentTreatmentType: "أطراف صناعية",
      })).body?.deviceEpisodeId, null);
    await http("POST", `/api/patients/${pRace}/assign-manufacturing`, S.reception,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    const afterAssign = await http("POST", `/api/payments`, S.reception, {
      patientId: pRace, branchId: 1, amount: 10_000, paymentTreatmentType: "أطراف صناعية",
    });
    same("   وبعده: صار مرشّحاً ⟶ الدفعة بلا هدف تُردّ", afterAssign.status, 400);
    same("   ولا دفعةَ بلا هوية بعد التخصيص",
      (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND device_episode_id IS NULL`, [pRace]))[0].n, 1);

    // الصيانة: التسليم يسبق فتصير أجهزةٌ مسلَّمة موجودة، فصيانةٌ بلا هدف تُردّ.
    const pRaceM = await mkPatient("سباق الصيانة");
    const cRaceM = await mkCase(pRaceM, 0);
    same("٦. قبل التسليم: لا جهاز مسجَّل ⟶ صيانةٌ بلا هدف مسموحة",
      (await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
        patientId: pRaceM, expertUserId: EXPERT, serviceType: "prosthetic",
        cost: 0, notes: "صيانة إرث",
      })).status, 201);
    await q(`UPDATE prosthetic_work_orders SET status='completed' WHERE patient_id=$1`, [pRaceM]);
    await mkEpisode(pRaceM, cRaceM, 1, "delivered", 0);
    const maintAfterDeliver = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: pRaceM, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 0, notes: "صيانة بعد التسليم",
    });
    same("   وبعده: صار جهازٌ مسلَّم ⟶ صيانةٌ بلا هدف تُردّ", maintAfterDeliver.status, 400);
    same("   ولا أمر صيانةٍ ثانٍ",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1 AND purpose='maintenance'`, [pRaceM]))[0].n, 1);

    // ══════════ سباقٌ حقيقي: التسليم مقابل صيانةٍ بلا هدف ═════════════
    // ليس «قبل ثم بعد» — بل معاملتان مفتوحتان معاً وحاجزٌ صريح بينهما.
    // المطلوب إثباتُ استحالةِ: تسليمٌ يُثبَّت، ثم تُكتب بعده صيانةٌ بلا
    // هوية لأن قارئها رأى لقطةً أقدم.
    console.log("\n── سباق حقيقي: التسليم مقابل الصيانة ──");
    const pTrue = await mkPatient("سباق حقيقي", 0);
    const cTrue = await mkCase(pTrue, 0);
    const eTrue = await mkEpisode(pTrue, cTrue, 1, "in_manufacturing", 0);
    const oTrue = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
         purpose, status, current_stage, device_episode_id)
       VALUES ($1,1,$2,'prosthetic','initial_build','active','ready_for_fitting',$3) RETURNING id`,
      [pTrue, EXPERT, eTrue]);

    let decided!: () => void, allowCommit!: () => void;
    const reachedDecision = new Promise<void>((r) => { decided = r; });
    const mayCommit = new Promise<void>((r) => { allowCommit = r; });
    let deliveryFinished = false;

    //  (أ) القارئ: يحسم بلا هدف ثم **يبقي معاملته مفتوحة** ممسكاً بالقفل.
    const resolverTx = db.transaction(async (tx) => {
      const target = await resolveDeviceTargetTx(tx as any, {
        patientId: pTrue, serviceType: "prosthetic",
        requestedEpisodeId: null, explicitLegacy: false,
        eligibleStatuses: ["delivered"],
        chooseMessage: "choose",
      });
      decided();
      await mayCommit;
      return target;
    });
    await reachedDecision;

    //  (ب) التسليم الحقيقي — كاتب الإنتاج نفسه — يبدأ الآن.
    const deliveryTx = (async () => {
      await mfg.updateStage({
        order: (await mfg.getRawOrder(Number(oTrue[0].id))) as any,
        toStage: "delivered", finalResult: "success", performedBy: MANAGER,
      });
      deliveryFinished = true;
    })();

    //  مهلةٌ كافية ليكمل التسليم لو لم يكن محجوزاً بقفلٍ حقيقي.
    await new Promise((r) => setTimeout(r, 400));
    check(!deliveryFinished,
      "٧. التسليم محجوزٌ بقفل الحلقة الذي يمسكه القارئ", `finished=${deliveryFinished}`);
    same("   والحلقة ما زالت «قيد التصنيع» قبل إفراج القارئ",
      (await epRow(eTrue))?.status, "in_manufacturing");

    allowCommit();
    const resolvedTarget = await resolverTx;
    same("   وقرارُ القارئ «بلا هوية» — وكان صادقاً وقت اتّخاذه", resolvedTarget, null);
    await deliveryTx;
    same("   ثم أُثبِت التسليم بعده", (await epRow(eTrue))?.status, "delivered");

    //  والاتجاه المعاكس: بعد أن استقرّ التسليم، صيانةٌ بلا هدف تُردّ.
    const afterTrue = await http("POST", `/api/manufacturing/maintenance-visit`, S.reception, {
      maintenanceComponent: "knee",
      patientId: pTrue, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 0, notes: "بعد التسليم",
    });
    same("   وبعد استقراره: صيانةٌ بلا هدف تُردّ ٤٠٠", afterTrue.status, 400);

    // ══════════ التاريخ ══════════════════════════════════════════════
    console.log("\n── التاريخ ──");
    const historyAfter = await q(
      `SELECT id, status, agreed_cost, delivered_at FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}') ORDER BY id`);
    same("الحلقات التاريخية كما هي بايتاً ببايت", historyAfter, historyBefore);
    const linkedAfter = await q(`SELECT
        (SELECT count(*)::int FROM payments     WHERE device_episode_id IS NOT NULL
           AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')) AS pay,
        (SELECT count(*)::int FROM visits       WHERE device_episode_id IS NOT NULL
           AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')) AS vis,
        (SELECT count(*)::int FROM cost_entries WHERE device_episode_id IS NOT NULL
           AND patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')) AS ce`);
    same("ولا صفَّ تاريخيّاً رُبِط بجهاز", linkedAfter, linkedBefore);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[MANAGER, DOCTOR, EXPERT, RECEPTION]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[MANAGER, DOCTOR, EXPERT, RECEPTION]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
