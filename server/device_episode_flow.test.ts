// الجهاز الجديد الحيّ — بدؤه، وربط معاينته به. حيّاً على Postgres.
// قاعدة محلّية: `npm run test:episode-flow`.
//
// ══ لماذا يُركَّب جدول النقاط كاملاً ═════════════════════════════════════
// النقاط تعيش داخل `registerRoutes`، ووسيط الجلسات وحده يُتخطّى. فتُفحَص
// بحُرّاسها الحقيقية وترتيبها وقاعدتها، لا بنسخةٍ منها.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **العائد بعد سنتين لا يُسجَّل من جديد**: تُفتح حلقة #٢ على خيطه
//     القائم، ولو كان #١ مسلَّماً أو ملغى.
// (٢) **شراءٌ مفتوحٌ واحد**: محاولة ثانية تُردّ بـ409 — من الحالات الثلاث
//     المفتوحة كلّها.
// (٣) **السباق**: طلبان متزامنان ⟶ حلقة واحدة، بلا تسلسل مكرَّر.
// (٤) **المعاينة تعرف جهازها**: التوقيع على حلقة منتظرة يكتب `deviceEpisodeId`
//     ويحرّك الحلقة إلى `examined` — في معاملة واحدة.
// (٥) **الإعفاء التاريخي لا يعفي جهازاً جديداً**: مريض «قديم» طلب جهازاً
//     اليوم يظهر منتظراً وفي قائمة عمل الطبيب — ومعاينته القديمة لا تُغني.
// (٦) **مخرج الإلغاء حقيقي**: قبل التصنيع فقط، بسبب إلزامي، ثم يُستأنف
//     التسلسل.
// (٧) **لا دينار يتحرّك**، و**الحلقات التاريخية لا تُمَسّ**.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import * as medical from "./medical/store";

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
async function refused(fn: () => Promise<unknown>): Promise<{ msg: string; status: number } | null> {
  try { await fn(); return null; }
  catch (e: any) { return { msg: String(e?.message ?? e), status: Number(e?.status ?? 0) }; }
}

const PORT = 6811;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الجهاز-الجديد";
const MANAGER = 9821, DOCTOR = 9822, EXPERT = 9823, RECEPTION = 9824;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr-test",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doctor: {
    userId: DOCTOR, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc-test",
    permissions: { canViewPatients: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "exp-test",
    permissions: { canViewPatients: true },
  },
  otherBranch: {
    userId: RECEPTION, role: "reception", isAdmin: false, branchId: 2,
    accessibleBranches: [2], displayName: "recv-test",
    permissions: { canViewPatients: true, canAddPatients: true },
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
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

async function mkPatient(name: string, opts: { legacy?: boolean; branchId?: number } = {}) {
  const rows = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',$3,true,0,$4) RETURNING id`,
    [name, MARK, opts.branchId ?? 1, opts.legacy ? "past" : "new"]);
  return rows[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic", branchId = 1) {
  const rows = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status)
     VALUES ($1,$2,$3,0,'active') RETURNING id`, [patientId, branchId, caseType]);
  return rows[0].id;
}
/** حلقة تاريخية بحالة نهائية — كما تركتها 050. */
async function mkHistoricalEpisode(
  patientId: number, caseId: number, seq: number, status: string, agreedCost = 0,
) {
  const rows = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes
       (patient_id, case_id, branch_id, sequence_number, status, agreed_cost, created_by)
     VALUES ($1,$2,1,$3,$4,$5,$6) RETURNING id`,
    [patientId, caseId, seq, status, agreedCost, MANAGER]);
  return rows[0].id;
}
async function mkExam(patientId: number, caseId: number | null, opts: {
  caseType?: string; deviceCost?: number | null; prescription?: any; episodeId?: number | null;
} = {}) {
  const rows = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
       doctor_name, diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,$3,1,$4,'د. فلان','تشخيص',$5::jsonb,$6,1,NOW(),$7) RETURNING id`,
    [patientId, caseId, opts.caseType ?? "prosthetic", DOCTOR,
     JSON.stringify(opts.prescription ?? {}), opts.deviceCost ?? null, opts.episodeId ?? null]);
  return rows[0].id;
}

async function episodeRow(id: number) {
  const r = await q(`SELECT id, patient_id, case_id, sequence_number, status, agreed_cost,
                            delivered_at, cancelled_at, cancel_reason, created_by
                       FROM patient_device_episodes WHERE id = $1`, [id]);
  return r[0] ?? null;
}
async function moneySnapshot() {
  const [r] = await q(`SELECT
      (SELECT COALESCE(sum(total_cost),0) FROM patients)  AS patients_total_cost,
      (SELECT COALESCE(sum(cost),0) FROM patient_cases)   AS cases_cost,
      (SELECT COALESCE(sum(amount),0) FROM cost_entries)  AS ce_sum,
      (SELECT count(*) FROM cost_entries)                 AS ce_n,
      (SELECT COALESCE(sum(amount),0) FROM payments)      AS pay_sum,
      (SELECT count(*) FROM payments)                     AS pay_n`);
  return r;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
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
  //  متابعةُ ما بعد المعاينة (ترحيل ٠٥٣) تشير إلى الحلقة — فتسبقها هنا
  //  كما تسبقها في كاسكيد `storage.deletePatient`.
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, extra] of [
    [MANAGER, "branch_manager", ""], [DOCTOR, "doctor", ""],
    [EXPERT, "prosthetics_expert", ""], [RECEPTION, "reception", ""],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, medical_specialties = EXCLUDED.medical_specialties`,
      [id, `de_f${id}`, role, id === DOCTOR ? '["prosthetic","medical_support"]' : "null"]);
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
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب، ووسيط الجلسات وحده متخطّى", String(skipped));

    //  الحلقات التاريخية خارج هذا الاختبار — لقطة تُقارَن في النهاية.
    const historyBefore = await q(
      `SELECT id, patient_id, case_id, sequence_number, status, agreed_cost, delivered_at,
              cancelled_at, cancel_reason, created_at, updated_at
         FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}')
        ORDER BY id`);
    const money0 = await moneySnapshot();

    // ══ أ. العائد بعد جهازٍ مسلَّم ════════════════════════════════════
    console.log("\n── بدء جهاز جديد ──");
    const pA = await mkPatient("أ. عائد بعد تسليم");
    const cA = await mkCase(pA);
    const hA = await mkHistoricalEpisode(pA, cA, 1, "delivered", 750000);
    const eA = await episodes.startDeviceEpisode({ patientId: pA, serviceType: "prosthetic", createdBy: MANAGER });
    same("أ. جهازٌ مسلَّم #١ ⟶ الجديد #٢ بانتظار المعاينة",
      [eA.sequenceNumber, eA.status], [2, "awaiting_exam"]);
    same("   وسعره المتفق عليه صفر", eA.agreedCost, 0);
    same("   ونوع خدمته مشتقٌّ من الخيط لا مخزَّن", eA.serviceType, "prosthetic");
    same("   والحلقة التاريخية لم تُمَسّ",
      [(await episodeRow(hA))?.status, (await episodeRow(hA))?.agreed_cost], ["delivered", 750000]);

    // ══ ب. بعد جهازٍ ملغى ═════════════════════════════════════════════
    const pB = await mkPatient("ب. عائد بعد إلغاء");
    const cB = await mkCase(pB);
    await mkHistoricalEpisode(pB, cB, 1, "cancelled");
    const eB = await episodes.startDeviceEpisode({ patientId: pB, serviceType: "prosthetic", createdBy: MANAGER });
    same("ب. جهازٌ ملغى #١ ⟶ الجديد #٢", [eB.sequenceNumber, eB.status], [2, "awaiting_exam"]);

    // ══ ج. خيط بلا حلقات ══════════════════════════════════════════════
    const pC = await mkPatient("ج. أول جهاز");
    const cC = await mkCase(pC);
    const eC = await episodes.startDeviceEpisode({ patientId: pC, serviceType: "prosthetic", createdBy: MANAGER });
    same("ج. خيطٌ بلا حلقات ⟶ الأولى #١", [eC.sequenceNumber, eC.status], [1, "awaiting_exam"]);

    // ══ د/هـ/و. شراءٌ مفتوحٌ واحد لكل خيط ══════════════════════════════
    console.log("\n── شراءٌ مفتوحٌ واحد ──");
    const dupD = await refused(() =>
      episodes.startDeviceEpisode({ patientId: pC, serviceType: "prosthetic", createdBy: MANAGER }));
    same("د. حلقة `awaiting_exam` مفتوحة ⟶ الثانية مرفوضة بـ409", dupD?.status, 409);
    check(/قيد الإجراء/.test(dupD?.msg ?? ""), "   برسالة عربية صريحة", dupD?.msg);

    const pE = await mkPatient("هـ. حلقة معاينة");
    const cE2 = await mkCase(pE);
    await mkHistoricalEpisode(pE, cE2, 1, "examined");
    same("هـ. حلقة `examined` مفتوحة ⟶ مرفوضة",
      (await refused(() => episodes.startDeviceEpisode({ patientId: pE, serviceType: "prosthetic", createdBy: MANAGER })))?.status, 409);

    const pF = await mkPatient("و. حلقة تصنيع");
    const cF = await mkCase(pF);
    const hF = await mkHistoricalEpisode(pF, cF, 1, "in_manufacturing");
    same("و. حلقة `in_manufacturing` مفتوحة ⟶ مرفوضة",
      (await refused(() => episodes.startDeviceEpisode({ patientId: pF, serviceType: "prosthetic", createdBy: MANAGER })))?.status, 409);

    // ══ ز. خيط غير موجود ══════════════════════════════════════════════
    const pG = await mkPatient("ز. بلا خيط");
    const noCase = await refused(() =>
      episodes.startDeviceEpisode({ patientId: pG, serviceType: "prosthetic", createdBy: MANAGER }));
    check(!!noCase && /حالة من هذا النوع/.test(noCase.msg), "ز. خيطٌ غير موجود ⟶ لا حلقة", noCase?.msg);
    same("   ولا صفّ أُنشئ",
      (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pG]))[0].n, 0);

    // ══ ح. السباق ═════════════════════════════════════════════════════
    console.log("\n── السباق ──");
    const pH = await mkPatient("ح. سباق");
    const cH = await mkCase(pH);
    //  ستّة متزامنين لا اثنان: طلبان قد يتسلسلان بالصدفة فيمرّ غياب القفل
    //  دون أن يُكشَف. الضغط الأعلى يجعل التداخل حقيقياً لا محتملاً.
    const both = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        episodes.startDeviceEpisode({ patientId: pH, serviceType: "prosthetic", createdBy: MANAGER })),
    );
    const ok = both.filter((r) => r.status === "fulfilled").length;
    const rows = await q<{ n: number }>(`SELECT count(*)::int n FROM patient_device_episodes WHERE case_id=$1`, [cH]);
    same("ح. طلبان متزامنان ⟶ نجاح واحد فقط", ok, 1);
    same("   وحلقة واحدة في القاعدة", rows[0].n, 1);
    const seqs = await q<{ sequence_number: number }>(
      `SELECT sequence_number FROM patient_device_episodes WHERE case_id=$1`, [cH]);
    same("   بتسلسل ١ بلا تكرار", seqs.map((s) => s.sequence_number), [1]);
    //  الفهرس وحده يمنع الفساد حتى بلا قفل — لكن الخاسر عندئذٍ يتلقّى
    //  «duplicate key» خاماً أي 500. القفل هو ما يجعله خطأ عملٍ مفهوماً.
    const losers: any[] = both.filter((r) => r.status === "rejected").map((r: any) => r.reason);
    same("   وكل الخاسرين تلقّوا خطأ عملٍ نظيفاً (409)",
      losers.map((e) => Number(e?.status ?? 0)), losers.map(() => 409));
    check(!losers.some((e) => /duplicate key/i.test(String(e?.message ?? ""))),
      "   بلا رسالة قاعدة بيانات مسرَّبة",
      losers.map((e) => String(e?.message).slice(0, 60)).join(" | "));

    // ══ ط/ي. الإعفاء التاريخي لا يعفي جهازاً جديداً ════════════════════
    console.log("\n── الإعفاء التاريخي والجهاز الجديد ──");
    const pI = await mkPatient("ط. قديم بجهاز جديد", { legacy: true });
    const cI = await mkCase(pI);
    check(await medical.isLegacyPatient(pI), "ط. المريض مصنَّف «قديم» فعلاً");
    same("   وقبل طلب الجهاز لا ينتظر شيئاً", await medical.getPendingForPatient(pI), []);
    const eI = await episodes.startDeviceEpisode({ patientId: pI, serviceType: "prosthetic", createdBy: MANAGER });
    same("   وبعد طلب جهازٍ جديد يصير منتظراً", await medical.getPendingForPatient(pI), ["prosthetic"]);
    const pendMap = await medical.getPendingExams([1], false);
    check(pendMap.some((r) => r.patientId === pI && r.caseType === "prosthetic"),
      "   ويظهر في خريطة الانتظار الإلزامية (الشارة الكهرمانية)");
    const wl = await medical.getWorklist(["prosthetic"], [1]);
    const mine = wl.filter((r) => r.patientId === pI);
    same("   وفي قائمة عمل الطبيب — صفٌّ واحد لا أكثر", mine.length, 1);
    same("   وانتظاره يبدأ من فتح الحلقة لا من إنشاء الخيط",
      mine[0]?.waitingSince ? new Date(mine[0].waitingSince).toISOString() : null,
      eI.createdAt ? new Date(eI.createdAt).toISOString() : null);

    const pJ = await mkPatient("ي. قديم بلا جهاز", { legacy: true });
    await mkCase(pJ);
    same("ي. والقديم بلا حلقة يبقى معفى كما كان", await medical.getPendingForPatient(pJ), []);
    check(!(await medical.getPendingExams([1], false)).some((r) => r.patientId === pJ),
      "   ولا يظهر في الخريطة الإلزامية");
    check(!(await medical.getWorklist(["prosthetic"], [1])).some((r) => r.patientId === pJ),
      "   ولا في قائمة عمل الطبيب");

    // ══ ك. المعاينة القديمة لا تُغني عن الجهاز الجديد ══════════════════
    const pK = await mkPatient("ك. معاينة قديمة + جهاز مسلَّم");
    const cK = await mkCase(pK);
    const hK = await mkHistoricalEpisode(pK, cK, 1, "delivered");
    await mkExam(pK, cK, { episodeId: hK });
    same("ك. قبل الطلب الجديد لا ينتظر", await medical.getPendingForPatient(pK), []);
    await episodes.startDeviceEpisode({ patientId: pK, serviceType: "prosthetic", createdBy: MANAGER });
    same("   وبعد طلب جهازٍ جديد ينتظر — رغم معاينته القديمة",
      await medical.getPendingForPatient(pK), ["prosthetic"]);
    check((await medical.getWorklist(["prosthetic"], [1])).some((r) => r.patientId === pK),
      "   ويظهر في قائمة عمل الطبيب");

    // ══ ل. التوقيع يربط المعاينة بالحلقة ═══════════════════════════════
    console.log("\n── المعاينة تعرف جهازها ──");
    const pL = await mkPatient("ل. توقيع على حلقة منتظرة");
    const cL = await mkCase(pL);
    const eL = await episodes.startDeviceEpisode({ patientId: pL, serviceType: "prosthetic", createdBy: MANAGER });
    same("ق. وقبل المعاينة `hasSignedExamForEpisode` = false",
      await medical.hasSignedExamForEpisode(eL.id), false);
    const signed = await http("POST", `/api/medical/patients/${pL}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "بتر تحت الركبة", deviceCost: 900000,
      prescription: { prostheticType: "تحت الركبة" },
    });
    same("ل. التوقيع نجح", signed.status, 200);
    same("   والمعاينة تحمل معرّف الحلقة", signed.body?.deviceEpisodeId, eL.id);
    same("   والحلقة صارت `examined`", (await episodeRow(eL.id))?.status, "examined");
    same("ق. وبعدها `hasSignedExamForEpisode` = true",
      await medical.hasSignedExamForEpisode(eL.id), true);
    same("ع. و`latestDeviceCostForEpisode` يقرأ سعر معاينتها",
      await medical.latestDeviceCostForEpisode(eL.id), 900000);
    same("ف. و`prescribedSpecsForEpisode` يقرأ وصفتها",
      await medical.prescribedSpecsForEpisode(eL.id, "prosthetic"), { prostheticType: "تحت الركبة" });
    same("   ولم تعد منتظرة", await medical.getPendingForPatient(pL), []);

    //  والحلقة الأخرى لا ترى شيئاً من ذلك — لا رجوع إلى (مريض، اختصاص).
    same("ع. وحلقة المريض الأخرى لا ترث سعره", await medical.latestDeviceCostForEpisode(eA.id), null);
    same("ف. ولا وصفته", await medical.prescribedSpecsForEpisode(eA.id, "prosthetic"), {});
    same("ق. ولا توقيعه", await medical.hasSignedExamForEpisode(eA.id), false);

    // ══ م. حلقة من مريض/خيط آخر لا تُربَط ══════════════════════════════
    const pM = await mkPatient("م. حلقة غريبة");
    const cM = await mkCase(pM);
    const exM = await medical.createExam({
      patientId: pM, caseId: cC, caseType: "prosthetic", branchId: 1,   // خيط المريض ج
      doctorId: DOCTOR, doctorName: "د. فلان", prescription: {}, deviceCost: null,
      proposedExpertUserId: null, chiefComplaint: null, clinicalFindings: null,
      diagnosis: "غير مطابق", plan: null, notes: null,
    });
    same("م. معاينةٌ على خيط مريضٍ آخر ⟶ بلا ربط", exM.deviceEpisodeId, null);
    same("   وحلقة ذلك الخيط بقيت منتظرة", (await episodeRow(eC.id))?.status, "awaiting_exam");

    // ══ ن. معاينة عادية بلا حلقة مفتوحة ════════════════════════════════
    const pN = await mkPatient("ن. معاينة متابعة");
    const cN = await mkCase(pN);
    const exN = await http("POST", `/api/medical/patients/${pN}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "متابعة عادية",
    });
    same("ن. معاينةٌ بلا حلقة مفتوحة ⟶ نجحت", exN.status, 200);
    same("   وبقيت بلا ربط", exN.body?.deviceEpisodeId, null);
    same("   ولم تُنشئ حلقة من تلقائها",
      (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pN]))[0].n, 0);

    // ══ تعديل معاينة مرتبطة لا يغيّر اختصاصها ══════════════════════════
    //  التعديل يعيد كتابة caseType ويعيد حلّ caseId — لكنّ deviceEpisodeId
    //  يسمّي جهازاً واحداً على خيطٍ واحد ولا يتبعهما. فمعاينة «مساند» تشير
    //  إلى حلقة «أطراف» ليست حقلاً بائتاً بل سجلاً سريرياً كاذباً.
    console.log("\n── اختصاص المعاينة المرتبطة ──");
    //  خيط «أطراف» وحده عمداً: لو نفّذ applyDecision أثره على الطلب المرفوض
    //  لأنشأ خيط «مساند» جديداً ورفع علمه على المريض — تغييرٌ صارخ لا يمكن
    //  أن يمرّ في المقارنة.
    const pV = await mkPatient("ص. تعديل معاينة مرتبطة");
    const cV = await mkCase(pV);
    const eV = await episodes.startDeviceEpisode({ patientId: pV, serviceType: "prosthetic", createdBy: MANAGER });
    const signV = await http("POST", `/api/medical/patients/${pV}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "تشخيص أوّل", prescription: { prostheticType: "فوق الركبة" },
    });
    same("والمعاينة ارتبطت بحلقتها", signV.body?.deviceEpisodeId, eV.id);

    const revSame = await http("PATCH", `/api/medical/exams/${signV.body.id}`, S.doctor, {
      caseType: "prosthetic", diagnosis: "تشخيص مصحَّح", prescription: { prostheticType: "فوق الركبة" },
    });
    same("أ. التعديل بنفس الاختصاص ينجح", revSame.status, 200);
    same("   والرابط بالجهاز كما هو", revSame.body?.deviceEpisodeId, eV.id);
    same("   والنسخة صارت ٢", revSame.body?.version, 2);
    same("   والتشخيص تحدَّث", revSame.body?.diagnosis, "تشخيص مصحَّح");

    //  لقطة كاملة بـ`SELECT *` لكل ما قد يلمسه المسار المرفوض: صفّ المريض
    //  بكل أعلامه وحقوله السريرية، وكل خيوطه، وكل حلقاته، والمعاينة ونسخها.
    const snapAll = async () => ({
      patient: await q(`SELECT * FROM patients WHERE id=$1`, [pV]),
      cases: await q(`SELECT * FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [pV]),
      eps: await q(`SELECT * FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [pV]),
      exam: await q(`SELECT * FROM medical_exams WHERE id=$1`, [signV.body.id]),
      revs: await q(`SELECT * FROM medical_exam_revisions WHERE exam_id=$1 ORDER BY id`, [signV.body.id]),
    });
    const before = await snapAll();
    same("   وللمريض خيطٌ واحد قبل الطلب المرفوض", before.cases.length, 1);

    //  الوصفة تحمل مواصفات مساند حقيقية: لو نفّذ applyDecision لكتبها على
    //  المريض وأنشأ خيطها ورفع علمها.
    const revSwitch = await http("PATCH", `/api/medical/exams/${signV.body.id}`, S.doctor, {
      caseType: "medical_support", diagnosis: "نقل الاختصاص",
      prescription: { supportType: "مسند ظهر", injuryArea: "الظهر", injurySide: "يمين" },
    });
    same("ب. وتغيير الاختصاص على معاينة مرتبطة مرفوض بـ409", revSwitch.status, 409);
    check(/ألغِ طلب الجهاز/.test(revSwitch.body?.error ?? ""), "   برسالة تدلّ على المسار الصحيح", revSwitch.body?.error);

    const after = await snapAll();
    same("   وصفّ المريض بكل أعلامه وحقوله كما هو بايتاً ببايت", after.patient, before.patient);
    same("   ولم يُنشَأ خيط «مساند» — applyDecision لم ينفّذ أثره", after.cases, before.cases);
    same("   والحلقات كما هي", after.eps, before.eps);
    same("   والمعاينة لم تتغيّر بحرف", after.exam, before.exam);
    same("   ولا نسخة جديدة كُتبت", after.revs, before.revs);
    same("   وما زال خيطاً واحداً", after.cases.length, 1);
    same("   وعلم «مساند» لم يُرفع", after.patient[0]?.is_medical_support ?? false, before.patient[0]?.is_medical_support ?? false);

    const pW = await mkPatient("ض. معاينة بلا حلقة");
    const cW = await mkCase(pW);
    await mkCase(pW, "medical_support");
    const exW = await http("POST", `/api/medical/patients/${pW}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "بلا جهاز",
    });
    same("ج. ومعاينةٌ بلا حلقة تُنقَل بين الاختصاصات كما كانت",
      (await http("PATCH", `/api/medical/exams/${exW.body.id}`, S.doctor, {
        caseType: "medical_support", diagnosis: "بعد النقل",
      })).status, 200);
    same("   واختصاصها تغيّر فعلاً",
      (await q(`SELECT case_type FROM medical_exams WHERE id=$1`, [exW.body.id]))[0].case_type,
      "medical_support");

    // ══ شارة «تم تحديد» تتبع الحلقة لا التاريخ ═════════════════════════
    console.log("\n── شارة «تم تحديد» ──");
    const decided = async (patientId: number, caseType = "prosthetic") =>
      (await medical.getDecidedExams([1])).some(
        (r) => r.patientId === patientId && r.caseType === caseType);

    //  د. نمط ٠٥٠: حلقة تاريخية مسلَّمة بلا معاينة مرتبطة ⟶ السلوك القديم
    const pD1 = await mkPatient("د. نمط ٠٥٠");
    const cD1 = await mkCase(pD1);
    await mkHistoricalEpisode(pD1, cD1, 1, "delivered");
    await mkExam(pD1, cD1);                       // معاينة قديمة بلا ربط
    same("د. حلقة ٠٥٠ التاريخية + معاينة غير مرتبطة ⟶ «تم تحديد» كما كان",
      await decided(pD1), true);

    //  هـ. حلقة جديدة منتظرة + معاينة قديمة ⟶ ليست محدَّدة
    const pD2 = await mkPatient("هـ. منتظرة + معاينة قديمة");
    const cD2 = await mkCase(pD2);
    await mkExam(pD2, cD2);
    await episodes.startDeviceEpisode({ patientId: pD2, serviceType: "prosthetic", createdBy: MANAGER });
    same("هـ. حلقة منتظرة + معاينة قديمة ⟶ ليست محدَّدة", await decided(pD2), false);

    //  و/ز. معاينة مرتبطة ⟶ محدَّدة، وبعد الإلغاء ⟶ لا
    const pD3 = await mkPatient("و. مرتبطة ثم ملغاة");
    const cD3 = await mkCase(pD3);
    const eD3 = await episodes.startDeviceEpisode({ patientId: pD3, serviceType: "prosthetic", createdBy: MANAGER });
    await http("POST", `/api/medical/patients/${pD3}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "قرار الجهاز",
    });
    same("و. حلقة `examined` بمعاينتها ⟶ محدَّدة", await decided(pD3), true);
    await episodes.cancelPreManufacturingDeviceEpisode({
      patientId: pD3, episodeId: eD3.id, reason: "اعتذر المريض" });
    same("ز. وبعد إلغائها ⟶ لم تعد محدَّدة رغم بقاء معاينتها", await decided(pD3), false);

    //  ح. حلقة سُلّمت ومعاينتها مرتبطة ⟶ ليست محدَّدة (لا جهاز قيد الطلب)
    const pD4 = await mkPatient("ح. مرتبطة ثم مسلَّمة");
    const cD4 = await mkCase(pD4);
    const eD4 = await episodes.startDeviceEpisode({ patientId: pD4, serviceType: "prosthetic", createdBy: MANAGER });
    await http("POST", `/api/medical/patients/${pD4}/exams`, S.doctor, {
      caseType: "prosthetic", diagnosis: "قرار الجهاز",
    });
    await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW() WHERE id=$1`, [eD4.id]);
    same("ح. حلقة مسلَّمة بمعاينة مرتبطة ⟶ ليست محدَّدة", await decided(pD4), false);

    //  ط. خيط لم يدخل النظام الجديد إطلاقاً ⟶ السلوك القديم
    const pD5 = await mkPatient("ط. بلا حلقات إطلاقاً");
    const cD5 = await mkCase(pD5);
    await mkExam(pD5, cD5);
    same("ط. خيط بلا حلقات ⟶ «تم تحديد» بالسلوك القديم", await decided(pD5), true);

    // ══ ر/ش/ت/ث. الإلغاء قبل التصنيع ═══════════════════════════════════
    console.log("\n── الإلغاء قبل التصنيع ──");
    const pR = await mkPatient("ر. إلغاء منتظرة");
    const cR = await mkCase(pR);
    const eR = await episodes.startDeviceEpisode({ patientId: pR, serviceType: "prosthetic", createdBy: MANAGER });
    const noReason = await refused(() => episodes.cancelPreManufacturingDeviceEpisode({
      patientId: pR, episodeId: eR.id, reason: "   " }));
    check(!!noReason && /سبب/.test(noReason.msg), "ر. الإلغاء بلا سبب مرفوض", noReason?.msg);
    const cancelled = await episodes.cancelPreManufacturingDeviceEpisode({
      patientId: pR, episodeId: eR.id, reason: "  عدل المريض عن الشراء  " });
    const rRow = await episodeRow(eR.id);
    same("   وبالسبب يُلغى", rRow?.status, "cancelled");
    check(!!rRow?.cancelled_at, "   بختم زمني");
    same("   وبسببٍ مشذَّب", rRow?.cancel_reason, "عدل المريض عن الشراء");
    same("   ولم يعد منتظراً", await medical.getPendingForPatient(pR), []);

    same("ش. وإلغاء حلقة `examined` مسموح",
      (await episodes.cancelPreManufacturingDeviceEpisode({
        patientId: pL, episodeId: eL.id, reason: "تغيّر القرار" })).status, "cancelled");

    const inMfg = await refused(() => episodes.cancelPreManufacturingDeviceEpisode({
      patientId: pF, episodeId: hF, reason: "محاولة" }));
    same("ت. وإلغاء حلقة `in_manufacturing` مرفوض", inMfg?.status, 409);
    check(/أمر التصنيع/.test(inMfg?.msg ?? ""), "   ويدلّ على المسار الصحيح", inMfg?.msg);
    same("   والحلقة لم تتغيّر", (await episodeRow(hF))?.status, "in_manufacturing");

    const foreign = await refused(() => episodes.cancelPreManufacturingDeviceEpisode({
      patientId: pR, episodeId: eB.id, reason: "محاولة" }));
    same("   وحلقةُ مريضٍ آخر لا تُلغى من مساره", foreign?.status, 404);

    // ══ ث. التسلسل يُستأنف بعد الإلغاء ═════════════════════════════════
    const eU = await episodes.startDeviceEpisode({ patientId: pR, serviceType: "prosthetic", createdBy: MANAGER });
    same("ث. وبعد الإلغاء تُفتح التالية بتسلسل ٢", [eU.sequenceNumber, eU.status], [2, "awaiting_exam"]);

    // ══ النقاط عبر HTTP ════════════════════════════════════════════════
    console.log("\n── النقاط وصلاحياتها ──");
    const pX = await mkPatient("خ. عبر النقاط");
    await mkCase(pX, "medical_support");
    const started = await http("POST", `/api/patients/${pX}/device-episodes`, S.manager,
      { serviceType: "medical_support" });
    same("النقطة تبدأ الجهاز وتعيد 201", started.status, 201);
    same("   بالحلقة المنشأة", [started.body?.sequenceNumber, started.body?.status, started.body?.agreedCost],
      [1, "awaiting_exam", 0]);
    const again = await http("POST", `/api/patients/${pX}/device-episodes`, S.manager,
      { serviceType: "medical_support" });
    same("والثانية تُردّ بـ409", again.status, 409);
    same("   برسالة عربية", again.body?.error, "لدى المريض جهاز من هذا النوع قيد الإجراء بالفعل");

    const badType = await http("POST", `/api/patients/${pX}/device-episodes`, S.manager,
      { serviceType: "physiotherapy" });
    same("والعلاج الطبيعي ليس جهازاً", badType.status, 400);

    same("وخبير الأطراف لا يبدأ جهازاً بنفسه",
      (await http("POST", `/api/patients/${pX}/device-episodes`, S.expert, { serviceType: "prosthetic" })).status, 403);
    same("ولا موظّف فرعٍ آخر",
      (await http("POST", `/api/patients/${pX}/device-episodes`, S.otherBranch, { serviceType: "prosthetic" })).status, 403);

    const list = await http("GET", `/api/patients/${pX}/device-episodes`, S.manager);
    same("والقراءة تعيد الحلقات بحقولها المحدودة", list.status, 200);
    same("   بنوع الخدمة المشتقّ", list.body?.episodes?.[0]?.serviceType, "medical_support");
    same("   وبلا أي حقل سريري أو مالي زائد",
      Object.keys(list.body?.episodes?.[0] ?? {}).sort(),
      ["agreedCost", "branchId", "cancelReason", "cancelledAt", "caseId", "createdAt",
       "deliveredAt", "id", "sequenceNumber", "serviceType", "status"]);
    same("ولا يقرأها موظّف فرعٍ آخر",
      (await http("GET", `/api/patients/${pX}/device-episodes`, S.otherBranch)).status, 403);

    const cancelHttp = await http("POST",
      `/api/patients/${pX}/device-episodes/${started.body.id}/cancel`, S.manager, { reason: "اعتذر المريض" });
    same("والإلغاء عبر النقطة ينجح", cancelHttp.status, 200);
    same("   بحالة ملغاة", cancelHttp.body?.status, "cancelled");
    same("والإلغاء بلا سبب مرفوض",
      (await http("POST", `/api/patients/${pX}/device-episodes/${started.body.id}/cancel`, S.manager, { reason: "" })).status, 400);

    // ══ لم يتحرّك دينار ════════════════════════════════════════════════
    console.log("\n── المال والتاريخ ──");
    same("لا مبلغ تغيّر عبر البدء والتوقيع والإلغاء كلّها", await moneySnapshot(), money0);
    const nonZero = await q<{ n: number }>(
      `SELECT count(*)::int n FROM patient_device_episodes e
        JOIN patients p ON p.id = e.patient_id
       WHERE p.referral_source = '${MARK}' AND e.agreed_cost <> 0 AND e.id <> $1`, [hA]);
    same("ولا حلقة جديدة بسعر غير صفر", nonZero[0].n, 0);

    const historyAfter = await q(
      `SELECT id, patient_id, case_id, sequence_number, status, agreed_cost, delivered_at,
              cancelled_at, cancel_reason, created_at, updated_at
         FROM patient_device_episodes
        WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}')
        ORDER BY id`);
    same("والحلقات التاريخية خارج الاختبار كما هي بايتاً ببايت", historyAfter, historyBefore);

    const oldExams = await q<{ n: number }>(
      `SELECT count(*)::int n FROM medical_exams me
        WHERE me.device_episode_id IS NOT NULL
          AND me.patient_id NOT IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
    same("ولا معاينة تاريخية رُبِطت بحلقة", oldExams[0].n, 0);
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
