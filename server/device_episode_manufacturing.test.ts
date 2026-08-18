// دورة تصنيع الجهاز الحيّ وبيعه — حيّاً على Postgres.
// قاعدة محلّية: `npm run test:episode-manufacturing`.
//
// ══ القاعدة المحاسبية التي يحرسها هذا الملف ═════════════════════════════
//   `patient_cases.cost`   تراكمُ عمر الاختصاص كلّه
//   `episode.agreed_cost`  سعرُ **جهازٍ واحد**
//
// فمريضٌ اشترى طرفاً بمليون ثم عاد لطرفٍ بمليون ونصف مجموعه **مليونان
// ونصف**. الكتابة `case.cost = السعر الجديد` تبتلع تاريخ ما قبله، وحساب
// الفرق على الخيط بدل الحلقة يُنقص البيع الجديد إلى نصف مليون. كلاهما
// مُختبَرٌ هنا بالأرقام لا بالوصف.
//
// ══ وما يحرسه أيضاً ═════════════════════════════════════════════════════
// (١) **المسار القديم لم يتغيّر بحرف** — بما فيه فخّ ترحيل ٠١٧.
// (٢) **الجهاز الجديد لا يرث معاينة القديم** — لا سعراً ولا وصفةً.
// (٣) **حلقةٌ منتظرة لا تُخصَّص**، والمتزامنون واحدٌ ينجح لا أكثر.
// (٤) **الحلقة تتبع أمرها إلى نهايته** تسليماً أو إلغاءً، بالختم نفسه.
// (٥) **لا التفاف** من نقطة إنشاء الأمر العامة.
// (٦) **حذف نوع الحالة يُرفض** متى ملك الخيط حلقة — تاريخُ الجهاز دائم.
// (٧) **الحلقات التاريخية لا تُمَسّ**.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import * as episodes from "./device_episodes/store";
import * as mfg from "./manufacturing/store";

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
async function refused(fn: () => Promise<unknown>) {
  try { await fn(); return null; }
  catch (e: any) { return { msg: String(e?.message ?? e), status: Number(e?.status ?? 0) }; }
}

const PORT = 6821;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-تصنيع-الحلقات";
const MANAGER = 9831, DOCTOR = 9832, EXPERT = 9833, RECEPTION = 9834;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doctor: {
    userId: DOCTOR, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc", permissions: { canViewPatients: true },
  },
  reception: {
    userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "recv", permissions: { canViewPatients: true, canAddPatients: true },
  },
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
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,true,$3,'new') RETURNING id`,
    [name, MARK, totalCost]);
  return r[0].id;
}
async function mkCase(patientId: number, cost = 0, caseType = "prosthetic", costSource = "manual") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,$3,$4,'active') RETURNING id`, [patientId, caseType, cost, costSource]);
  return r[0].id;
}
/** حلقة بحالةٍ محدّدة — للتاريخ أو لتهيئة سيناريو. */
async function mkEpisode(patientId: number, caseId: number, seq: number, status: string, agreedCost = 0) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by)
     VALUES ($1,$2,1,$3,$4,$5,$6) RETURNING id`,
    [patientId, caseId, seq, status, agreedCost, MANAGER]);
  return r[0].id;
}
async function mkExam(patientId: number, caseId: number, deviceCost: number | null, episodeId: number | null, rx: any = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name,
       diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,'prosthetic',1,$3,'د. فلان','تشخيص',$4::jsonb,$5,1,NOW(),$6) RETURNING id`,
    [patientId, caseId, DOCTOR, JSON.stringify(rx), deviceCost, episodeId]);
  return r[0].id;
}

async function money(patientId: number) {
  const [p] = await q(`SELECT total_cost FROM patients WHERE id=$1`, [patientId]);
  const cases = await q(`SELECT case_type, cost FROM patient_cases WHERE patient_id=$1 ORDER BY case_type`, [patientId]);
  const ce = await q(`SELECT amount, source, device_episode_id FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [patientId]);
  return { total: Number(p?.total_cost ?? 0), cases, entries: ce };
}
async function epRow(id: number) {
  const [r] = await q(`SELECT id, status, agreed_cost, delivered_at, cancelled_at, cancel_reason
                         FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
}
async function ordersOf(patientId: number) {
  return q(`SELECT id, purpose, status, device_episode_id, completed_at, service_type
              FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
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
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** يمرّ بالأمر عبر مراحل البناء الحقيقية حتى التسليم — كاتب الإنتاج نفسه. */
async function deliverOrder(orderId: number) {
  const stages = ["measurements", "mold", "manufacturing", "ready_for_fitting", "delivered"];
  for (const st of stages) {
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
      [id, `dm_u${id}`, role, spec]);
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
      `SELECT id, patient_id, case_id, sequence_number, status, agreed_cost, delivered_at,
              cancelled_at, cancel_reason, created_at, updated_at
         FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')
        ORDER BY id`);

    // ══ أ. العائد: مليون + مليون ونصف = مليونان ونصف ═══════════════════
    console.log("\n── البيع التراكمي ──");
    const pA = await mkPatient("أ. العائد", 1_000_000);
    const cA = await mkCase(pA, 1_000_000);
    await mkEpisode(pA, cA, 1, "delivered", 0);          // جهازه القديم
    const eA = await mkEpisode(pA, cA, 2, "examined", 0); // الجديد
    await mkExam(pA, cA, 1_500_000, eA, { prostheticType: "فوق الركبة" });

    const rA = await http("POST", `/api/patients/${pA}/assign-manufacturing`, S.reception,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    same("أ. التخصيص نجح", rA.status, 201);
    const mA = await money(pA);
    same("   سعر الحلقة الجديدة = ١٬٥٠٠٬٠٠٠", (await epRow(eA))?.agreed_cost, 1_500_000);
    same("   وحالتها «قيد التصنيع»", (await epRow(eA))?.status, "in_manufacturing");
    same("   **وتراكم الخيط = ٢٬٥٠٠٬٠٠٠ لا ١٬٥٠٠٬٠٠٠**",
      mA.cases.find((c: any) => c.case_type === "prosthetic")?.cost, 2_500_000);
    same("   **ومجموع المريض = ٢٬٥٠٠٬٠٠٠**", mA.total, 2_500_000);
    same("   وقيدٌ واحد بقيمة البيع الجديد", mA.entries.map((e: any) => Number(e.amount)), [1_500_000]);
    same("   موسومٌ بهوية الجهاز", Number(mA.entries[0]?.device_episode_id), eA);
    const oA = await ordersOf(pA);
    same("   وأمرٌ واحد مرتبطٌ بها، غرضه بناءٌ أولي",
      oA.map((o: any) => [o.purpose, Number(o.device_episode_id)]), [["initial_build", eA]]);
    same("   وحلقته القديمة لم تُمَسّ", (await epRow((await q(
      `SELECT id FROM patient_device_episodes WHERE case_id=$1 AND sequence_number=1`, [cA]))[0].id))?.agreed_cost, 0);

    // ══ ب. أول جهاز ═══════════════════════════════════════════════════
    const pB = await mkPatient("ب. أول جهاز", 0);
    const cB = await mkCase(pB, 0);
    const eB = await mkEpisode(pB, cB, 1, "examined", 0);
    await mkExam(pB, cB, 900_000, eB);
    same("ب. أول جهاز يُخصَّص",
      (await http("POST", `/api/patients/${pB}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 201);
    const mB = await money(pB);
    same("   الحلقة ٩٠٠٬٠٠٠", (await epRow(eB))?.agreed_cost, 900_000);
    same("   والخيط ٩٠٠٬٠٠٠", mB.cases[0]?.cost, 900_000);
    same("   والمجموع ٩٠٠٬٠٠٠", mB.total, 900_000);
    same("   والقيد ٩٠٠٬٠٠٠", mB.entries.map((e: any) => Number(e.amount)), [900_000]);

    // ══ ج. الفرق يُحسب على الحلقة لا على الخيط ═════════════════════════
    const pC = await mkPatient("ج. فرق الحلقة", 1_100_000);
    const cC = await mkCase(pC, 1_100_000);
    const eC = await mkEpisode(pC, cC, 1, "examined", 100_000);
    await mkExam(pC, cC, 1_500_000, eC);
    same("ج. حلقةٌ سعرها ١٠٠٬٠٠٠ تُسعَّر ١٬٥٠٠٬٠٠٠",
      (await http("POST", `/api/patients/${pC}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 201);
    const mC = await money(pC);
    same("   الحركة المالية = الفرق ١٬٤٠٠٬٠٠٠ فقط", mC.entries.map((e: any) => Number(e.amount)), [1_400_000]);
    same("   والخيط ٢٬٥٠٠٬٠٠٠", mC.cases[0]?.cost, 2_500_000);
    same("   والمجموع ٢٬٥٠٠٬٠٠٠", mC.total, 2_500_000);
    same("   والحلقة ١٬٥٠٠٬٠٠٠", (await epRow(eC))?.agreed_cost, 1_500_000);

    // ══ د. المسار القديم لم يتغيّر ═════════════════════════════════════
    console.log("\n── المسار القديم ──");
    const pD = await mkPatient("د. قديم بلا حلقة", 800_000);
    const cD = await mkCase(pD, 800_000);
    await mkExam(pD, cD, null, null);
    same("د. تخصيصٌ بلا حلقة (مدير يُدخل السعر)",
      (await http("POST", `/api/patients/${pD}/assign-manufacturing`, S.manager,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 1_200_000 })).status, 201);
    const mD = await money(pD);
    same("   الخيط يُكتب بالسعر (لا يتراكم) — سلوك قديم", mD.cases[0]?.cost, 1_200_000);
    same("   والمجموع يتحرّك بالفرق ٤٠٠٬٠٠٠", mD.total, 1_200_000);
    same("   والقيد بالفرق", mD.entries.map((e: any) => Number(e.amount)), [400_000]);
    same("   وبلا هوية جهاز", mD.entries[0]?.device_episode_id, null);
    same("   والأمر بلا رابط", (await ordersOf(pD)).map((o: any) => o.device_episode_id), [null]);

    //  فخّ ترحيل ٠١٧: خيط 'auto' ورث المجموع كلّه، والعلاج الطبيعي صفر.
    const pE = await mkPatient("هـ. فخّ ٠١٧", 1_000_000);
    const cE = await mkCase(pE, 1_000_000, "prosthetic", "auto");
    await mkCase(pE, 0, "physiotherapy", "auto");
    await mkExam(pE, cE, null, null);
    same("هـ. تخصيصٌ بسعرٍ أقلّ على خيط 'auto'",
      (await http("POST", `/api/patients/${pE}/assign-manufacturing`, S.manager,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 600_000 })).status, 201);
    const mE = await money(pE);
    same("   المجموع لم ينكمش — الفائض انتقل للعلاج الطبيعي", mE.total, 1_000_000);
    same("   والخيطان ٦٠٠٬٠٠٠ و٤٠٠٬٠٠٠",
      mE.cases.map((c: any) => [c.case_type, c.cost]),
      [["physiotherapy", 400_000], ["prosthetic", 600_000]]);
    same("   ولا قيد كلفة (الحركة صفر)", mE.entries.length, 0);

    // ══ و. الجهاز الجديد لا يرث معاينة القديم ══════════════════════════
    console.log("\n── عزل معاينة الجهاز ──");
    const pF = await mkPatient("و. عزل المعاينة", 700_000);
    const cF = await mkCase(pF, 700_000);
    const hF = await mkEpisode(pF, cF, 1, "delivered", 0);
    await mkExam(pF, cF, 700_000, hF, { prostheticType: "قديم", footType: "قديم" });
    const eF = await mkEpisode(pF, cF, 2, "examined", 0);
    await mkExam(pF, cF, 1_500_000, eF, { prostheticType: "جديد" });
    same("و. التخصيص نجح",
      (await http("POST", `/api/patients/${pF}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 201);
    same("   والسعر المحجوز ١٬٥٠٠٬٠٠٠ لا ٧٠٠٬٠٠٠", (await epRow(eF))?.agreed_cost, 1_500_000);
    const [fPat] = await q(`SELECT prosthetic_type, foot_type FROM patients WHERE id=$1`, [pF]);
    same("   والوصفة من معاينة الجهاز الجديد", fPat.prosthetic_type, "جديد");
    same("   ولم يرث حقلاً من وصفة القديم", fPat.foot_type, null);

    // ══ ز. حلقةٌ منتظرة لا تُخصَّص ══════════════════════════════════════
    console.log("\n── الحراسة ──");
    const pG = await mkPatient("ز. منتظرة", 0);
    const cG = await mkCase(pG, 0);
    const eG = await mkEpisode(pG, cG, 1, "awaiting_exam", 0);
    const beforeG = { money: await money(pG), ep: await epRow(eG), orders: await ordersOf(pG) };
    const rG = await http("POST", `/api/patients/${pG}/assign-manufacturing`, S.reception,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    same("ز. حلقةٌ «بانتظار معاينة» ⟶ 409", rG.status, 409);
    same("   ولا مال تحرّك", await money(pG), beforeG.money);
    same("   ولا الحلقة تغيّرت", await epRow(eG), beforeG.ep);
    same("   ولا أمر أُنشئ", await ordersOf(pG), beforeG.orders);

    //  والحارس داخل المعاملة يقف وحده كذلك — لا خلف فحص النقطة: أي
    //  مستدعٍ يمرّر حلقةً غير مُعايَنة يُردّ، وهذا ما يحمي من تغيّر الحالة
    //  بين قراءة النقطة وبدء المعاملة.
    const directAwaiting = await refused(() => storage.assignManufacturing({
      patientId: pG, serviceType: "prosthetic", fields: {}, cost: 500_000,
      expertUserId: EXPERT, assignedBy: MANAGER, deviceEpisodeId: eG,
    }));
    same("   والنداء المباشر بحلقة غير مُعايَنة مرفوض بـ409", directAwaiting?.status, 409);
    same("   ولا مال تحرّك منه", await money(pG), beforeG.money);
    same("   ولا أمر", await ordersOf(pG), beforeG.orders);

    //  وحلقةٌ من مريضٍ آخر لا تُمرَّر: القفل يقرأ الحلقة عبر خيطها، فلا
    //  يُقبل معرّفٌ لا يخصّ هذا المريض وهذه الخدمة.
    const foreignEp = await refused(() => storage.assignManufacturing({
      patientId: pG, serviceType: "prosthetic", fields: {}, cost: 500_000,
      expertUserId: EXPERT, assignedBy: MANAGER, deviceEpisodeId: eA,
    }));
    same("   وحلقةُ مريضٍ آخر مرفوضة", foreignEp?.status, 409);

    //  **وتغيّر الحلقة بين قراءة النقطة وبدء المعاملة**: النقطة تحقّقت من
    //  معاينة الحلقة «س»، فإن صارت المفتوحة حلقةً أخرى — أُلغيت الأولى
    //  وفُتحت ثانية — فالبيع سيُحجَز على حلقةٍ لم يُفحَص سعرها. التطابق
    //  على المعرّف هو ما يمنع ذلك، لا حالةُ الحلقة.
    const pT = await mkPatient("ق. تغيّرت الحلقة", 0);
    const cT = await mkCase(pT, 0);
    const eT = await mkEpisode(pT, cT, 1, "examined", 0);
    await mkExam(pT, cT, 1_000_000, eT);
    const beforeT = { money: await money(pT), ep: await epRow(eT), orders: await ordersOf(pT) };
    const stale = await refused(() => storage.assignManufacturing({
      patientId: pT, serviceType: "prosthetic", fields: {}, cost: 1_000_000,
      expertUserId: EXPERT, assignedBy: MANAGER, deviceEpisodeId: eT + 100_000,
    }));
    same("   ومعرّفٌ بائت (تغيّرت الحلقة تحته) مرفوض", stale?.status, 409);
    same("   والحلقة الحيّة لم تُبَع", await epRow(eT), beforeT.ep);
    same("   ولا مال تحرّك", await money(pT), beforeT.money);
    same("   ولا أمر أُنشئ", await ordersOf(pT), beforeT.orders);

    //  ومريضٌ «قديم» لا يعفيه تصنيفه من معاينة جهازه الجديد.
    const pH = await mkPatient("ح. قديم بجهاز جديد", 0);
    await q(`UPDATE patients SET patient_classification='past' WHERE id=$1`, [pH]);
    const cH = await mkCase(pH, 0);
    await mkEpisode(pH, cH, 1, "awaiting_exam", 0);
    same("   والإعفاء التاريخي لا يتجاوز حلقةً منتظرة",
      (await http("POST", `/api/patients/${pH}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 409);

    // ══ ط. التزامن ═════════════════════════════════════════════════════
    const pI = await mkPatient("ط. تزامن", 0);
    const cI = await mkCase(pI, 0);
    const eI = await mkEpisode(pI, cI, 1, "examined", 0);
    await mkExam(pI, cI, 1_000_000, eI);
    const many = await Promise.all(Array.from({ length: 5 }, () =>
      http("POST", `/api/patients/${pI}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })));
    same("ط. خمس ضغطات متزامنة ⟶ نجاح واحد", many.filter((r) => r.status === 201).length, 1);
    same("   والباقي 409", many.filter((r) => r.status === 409).length, 4);
    check(!many.some((r) => JSON.stringify(r.body ?? "").includes("duplicate key")),
      "   بلا تسريب خطأ قاعدة بيانات", JSON.stringify(many.map((r) => r.body?.error)));
    const mI = await money(pI);
    same("   وأمرٌ واحد", (await ordersOf(pI)).length, 1);
    same("   وقيدٌ واحد", mI.entries.length, 1);
    same("   ومجموعٌ واحد", mI.total, 1_000_000);
    same("   وخيطٌ واحد", mI.cases[0]?.cost, 1_000_000);
    same("   والحلقة «قيد التصنيع»", (await epRow(eI))?.status, "in_manufacturing");

    // ══ ظ. بيعان متزامنان على خيطين — لا فقدان تحديث ══════════════════
    //  قفل الخيط يُسلسل حلقات النوع الواحد ولا يُسلسل نوعين: الطرف والمسند
    //  يقفلان خيطين مختلفين ويتقدّمان معاً. فالكتابة المطلقة
    //  «المقروء + الفرق» تجعل آخرَهما يمحو بيعَ الأول.
    console.log("\n── بيعان متزامنان ──");
    const pZ = await mkPatient("ظ. خيطان", 0);
    await q(`UPDATE patients SET is_medical_support = true WHERE id=$1`, [pZ]);
    const cZp = await mkCase(pZ, 0, "prosthetic");
    const cZs = await mkCase(pZ, 0, "medical_support");
    const eZp = await mkEpisode(pZ, cZp, 1, "examined", 0);
    const eZs = await mkEpisode(pZ, cZs, 1, "examined", 0);
    await mkExam(pZ, cZp, 1_000_000, eZp);
    await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
             doctor_name, diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
             VALUES ($1,$2,'medical_support',1,$3,'د. فلان','تشخيص','{}'::jsonb,$4,1,NOW(),$5)`,
      [pZ, cZs, DOCTOR, 600_000, eZs]);

    const bothSales = await Promise.all([
      http("POST", `/api/patients/${pZ}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 }),
      http("POST", `/api/patients/${pZ}/assign-manufacturing`, S.reception,
        { expertUserId: EXPERT, serviceType: "medical_support", cost: 0 }),
    ]);
    same("ظ. البيعان نجحا معاً", bothSales.map((r) => r.status), [201, 201]);
    const mZ = await money(pZ);
    same("   **والمجموع ١٬٦٠٠٬٠٠٠ — لا بيع ضاع**", mZ.total, 1_600_000);
    same("   وكل خيط بسعره",
      mZ.cases.map((c: any) => [c.case_type, c.cost]),
      [["medical_support", 600_000], ["prosthetic", 1_000_000]]);
    same("   وكل حلقة بسعرها",
      [(await epRow(eZp))?.agreed_cost, (await epRow(eZs))?.agreed_cost], [1_000_000, 600_000]);
    same("   وقيدان اثنان لا أكثر", mZ.entries.length, 2);
    same("   كلٌّ بفرق حلقته وموسومٌ بها",
      mZ.entries.map((e: any) => [Number(e.amount), Number(e.device_episode_id)]).sort((a: any, b: any) => a[0] - b[0]),
      [[600_000, eZs], [1_000_000, eZp]]);
    same("   وأمران مرتبطان بحلقتيهما",
      (await ordersOf(pZ)).map((o: any) => Number(o.device_episode_id)).sort((a: number, b: number) => a - b),
      [eZp, eZs].sort((a, b) => a - b));

    // ══ غ. القراءة البائتة «لا حلقة» لا تدخل المسار القديم ═════════════
    //  المحاكاة دقيقة: نمرّر `deviceEpisodeId = null` (وهو ما تمرّره النقطة
    //  حين تقرأ «لا حلقة») بينما حلقةٌ مفتوحة موجودة فعلاً وقت المعاملة.
    console.log("\n── القراءة البائتة ──");
    const pY = await mkPatient("غ. قراءة بائتة", 0);
    const cY = await mkCase(pY, 0);
    const eY = await mkEpisode(pY, cY, 1, "examined", 0);
    await mkExam(pY, cY, 800_000, eY);
    const beforeY = { money: await money(pY), ep: await epRow(eY), orders: await ordersOf(pY) };
    const staleNull = await refused(() => storage.assignManufacturing({
      patientId: pY, serviceType: "prosthetic", fields: {}, cost: 800_000,
      expertUserId: EXPERT, assignedBy: MANAGER, deviceEpisodeId: null,
    }));
    same("غ. المسار القديم مرفوض ما دامت حلقةٌ مفتوحة", staleNull?.status, 409);
    check(/حدّث الصفحة/.test(staleNull?.msg ?? ""), "   برسالة تدلّ على التحديث", staleNull?.msg);
    same("   ولا أمر يتيم أُنشئ", await ordersOf(pY), beforeY.orders);
    same("   ولا مال تحرّك", await money(pY), beforeY.money);
    same("   ولا الحلقة تغيّرت", await epRow(eY), beforeY.ep);

    //  ونفسه لنقطة الأمر العامة — الحارس داخل المعاملة لا في النقطة وحدها.
    const staleGeneric = await refused(() => mfg.createWorkOrderForExisting({
      patientId: pY, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER, purpose: "initial_build",
    }));
    same("   وإنشاء الأمر العام مرفوض داخل المعاملة", staleGeneric?.status, 409);
    same("   ولا أمر أُنشئ", (await ordersOf(pY)).length, 0);
    //  والصيانة تمرّ كما هي — لا يحرسها هذا الحارس.
    const mntOk = await mfg.createWorkOrderForExisting({
      patientId: pY, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: MANAGER, purpose: "maintenance",
    });
    same("   والصيانة تمرّ بلا مساس", mntOk.purpose, "maintenance");
    same("   والحلقة ما زالت مُعايَنة", (await epRow(eY))?.status, "examined");

    //  السباق الحقيقي: إنشاء أمرٍ قديم مقابل بدء حلقة — لا حالة نصفية.
    const pX2 = await mkPatient("ء. سباق حقيقي", 0);
    const cX2 = await mkCase(pX2, 0);
    const raced = await Promise.allSettled([
      mfg.createWorkOrderForExisting({
        patientId: pX2, branchId: 1, serviceType: "prosthetic",
        expertUserId: EXPERT, assignedBy: MANAGER, purpose: "initial_build",
      }),
      episodes.startDeviceEpisode({ patientId: pX2, serviceType: "prosthetic", createdBy: MANAGER }),
    ]);
    const ordersX = await ordersOf(pX2);
    const epsX = await q(`SELECT id, status FROM patient_device_episodes WHERE case_id=$1`, [cX2]);
    const unlinkedBuild = ordersX.filter((o: any) => o.purpose === "initial_build" && o.device_episode_id === null);
    const openEps = epsX.filter((e: any) => !["delivered", "cancelled"].includes(e.status));
    check(!(unlinkedBuild.length > 0 && openEps.length > 0),
      "ء. لا تجتمع حلقةٌ مفتوحة مع أمر بناءٍ يتيم أبداً",
      `orders=${JSON.stringify(ordersX)} eps=${JSON.stringify(epsX)}`);
    check(raced.some((r) => r.status === "fulfilled"), "   وأحد الطريقين نجح فعلاً");

    // ══ ي. التسليم ═════════════════════════════════════════════════════
    console.log("\n── نهاية الدورة ──");
    const moneyBeforeDeliver = await money(pB);
    const [oB] = await ordersOf(pB);
    await deliverOrder(Number(oB.id));
    const [oBAfter] = await ordersOf(pB);
    same("ي. الأمر اكتمل", oBAfter.status, "completed");
    same("   والحلقة «مُسلَّمة»", (await epRow(eB))?.status, "delivered");
    same("   وختم تسليمها هو ختم اكتمال أمرها بعينه",
      new Date((await epRow(eB))!.delivered_at).toISOString(),
      new Date(oBAfter.completed_at).toISOString());
    same("   ولا حركة مالية ثانية عند التسليم", await money(pB), moneyBeforeDeliver);

    // ══ ك. الإلغاء ═════════════════════════════════════════════════════
    const moneyBeforeCancel = await money(pC);
    const [oC] = await ordersOf(pC);
    await mfg.cancelOrder({
      order: (await mfg.getRawOrder(Number(oC.id))) as any,
      note: "عدل المريض عن الشراء", performedBy: MANAGER,
    });
    same("ك. الأمر أُلغي", (await ordersOf(pC))[0].status, "cancelled");
    const epC = await epRow(eC);
    same("   والحلقة «ملغاة»", epC?.status, "cancelled");
    check(!!epC?.cancelled_at, "   بختم زمني");
    same("   وبسبب الإلغاء المكتوب", epC?.cancel_reason, "عدل المريض عن الشراء");
    same("   ولا عكس مالي مخترَع", await money(pC), moneyBeforeCancel);
    same("   والسعر المتفق عليه باقٍ كما هو", epC?.agreed_cost, 1_500_000);

    //  **الصيانة لا تُنهي حلقة.** والاختبار على حلقةٍ **حيّة** لا مسلَّمة:
    //  المسلَّمة يحميها شرط الحالة وحده، فلا تكشف غياب حارس الغرض.
    const pMnt = await mkPatient("ص. صيانة على حلقة حيّة", 0);
    const cMnt = await mkCase(pMnt, 0);
    const eMnt = await mkEpisode(pMnt, cMnt, 1, "in_manufacturing", 500_000);
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
             purpose, status, device_episode_id) VALUES ($1,1,$2,'prosthetic','maintenance','active',$3)`,
      [pMnt, EXPERT, eMnt]);
    const [mntOrder] = await q(`SELECT id FROM prosthetic_work_orders WHERE patient_id=$1 AND purpose='maintenance'`, [pMnt]);
    await mfg.cancelOrder({
      order: (await mfg.getRawOrder(Number(mntOrder.id))) as any, note: "لا حاجة", performedBy: MANAGER,
    });
    same("   وإلغاء صيانةٍ لا يُلغي حلقةً حيّة", (await epRow(eMnt))?.status, "in_manufacturing");
    same("   ولا يضع لها ختم إلغاء", (await epRow(eMnt))?.cancelled_at, null);

    //  وإنجاز صيانةٍ كذلك لا يُسلّم الحلقة.
    const pMnt2 = await mkPatient("ض. إنجاز صيانة", 0);
    const cMnt2 = await mkCase(pMnt2, 0);
    const eMnt2 = await mkEpisode(pMnt2, cMnt2, 1, "in_manufacturing", 500_000);
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
             purpose, status, current_stage, device_episode_id)
             VALUES ($1,1,$2,'prosthetic','maintenance','active','new_assignment',$3)`,
      [pMnt2, EXPERT, eMnt2]);
    const [mnt2] = await q(`SELECT id FROM prosthetic_work_orders WHERE patient_id=$1 AND purpose='maintenance'`, [pMnt2]);
    await mfg.updateStage({
      order: (await mfg.getRawOrder(Number(mnt2.id))) as any,
      toStage: "maintenance_cast_done", performedBy: MANAGER,
    });
    same("   وإنجاز صيانةٍ لا يُسلّم حلقةً حيّة", (await epRow(eMnt2))?.status, "in_manufacturing");
    same("   ولا يضع لها ختم تسليم", (await epRow(eMnt2))?.delivered_at, null);

    // ══ ل. لا التفاف من نقطة الأمر العامة ══════════════════════════════
    const pJ = await mkPatient("ل. التفاف", 0);
    const cJ = await mkCase(pJ, 0);
    const eJ = await mkEpisode(pJ, cJ, 1, "examined", 0);
    await mkExam(pJ, cJ, 500_000, eJ);
    const bypass = await http("POST", `/api/manufacturing/orders`, S.manager,
      { patientId: pJ, serviceType: "prosthetic", expertUserId: EXPERT, purpose: "initial_build" });
    same("ل. إنشاء بناءٍ أولي مباشرةً ⟶ 409", bypass.status, 409);
    check(/تخصيص وإسناد خبير/.test(bypass.body?.error ?? ""), "   ويدلّ على المسار الصحيح", bypass.body?.error);
    same("   ولا أمر أُنشئ", (await ordersOf(pJ)).length, 0);
    same("   والحلقة كما هي", (await epRow(eJ))?.status, "examined");

    // ══ م. حذف نوع الحالة يُرفض متى ملك الخيط حلقة ══════════════════════
    const pK = await mkPatient("م. حذف بحلقة منتظرة", 0);
    const cK = await mkCase(pK, 0);
    await mkEpisode(pK, cK, 1, "awaiting_exam", 0);
    const delK = await refused(() => storage.deleteCaseType(pK, "prosthetic"));
    check(!!delK && /سجل أجهزة/.test(delK.msg), "م. حذف خيطٍ بحلقة منتظرة مرفوض", delK?.msg);
    same("   والخيط باقٍ", (await q(`SELECT count(*)::int n FROM patient_cases WHERE id=$1`, [cK]))[0].n, 1);

    const pL = await mkPatient("ن. حذف بحلقة مسلَّمة", 0);
    const cL = await mkCase(pL, 0);
    await mkEpisode(pL, cL, 1, "delivered", 0);
    const delL = await refused(() => storage.deleteCaseType(pL, "prosthetic"));
    check(!!delL && /سجل أجهزة/.test(delL.msg), "ن. وحذف خيطٍ بحلقة مسلَّمة مرفوض كذلك", delL?.msg);
    same("   والحلقة باقية", (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE case_id=$1`, [cL]))[0].n, 1);

    // ══ التاريخ ════════════════════════════════════════════════════════
    console.log("\n── التاريخ ──");
    const historyAfter = await q(
      `SELECT id, patient_id, case_id, sequence_number, status, agreed_cost, delivered_at,
              cancelled_at, cancel_reason, created_at, updated_at
         FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')
        ORDER BY id`);
    same("الحلقات التاريخية خارج الاختبار كما هي بايتاً ببايت", historyAfter, historyBefore);
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
