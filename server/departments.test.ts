// الأقسامُ الثلاثة حيّاً — على النقاط وعلى Postgres.
// قاعدة محلّية: `npm run test:departments`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الأطرافُ تُفصَل عن المساند** في المبيعات والمقبوض معاً — وكانا دلواً
//     واحداً اسمُه «أجهزة».
// (٢) و«الأجهزة» = القسمان جمعاً، و«الإجمالي» = الثلاثة + غير المبوَّب —
//     مصالَحةً إلى الدينار مع الأرقام المرجعية.
// (٣) **ولا كتابةَ عملٍ جديدة تصير غير مبوَّبة**: كلُّ مسارٍ يومي يحمل قسمه.
// (٤) والقديمُ الغامض يبقى ظاهراً «غير مبوَّب» — لا يُخمَّن ولا يُدسّ.
// (٥) والتقريرُ اليومي يحترم اليومَ المختار ونطاقَ الفرع بالضبط.
// (٦) وتصنيفُ المريض إلزاميٌّ للكتابة الجديدة، ولا يُخمَّن للقديم.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

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

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الأقسام-الثلاثة";
const ADMIN = 9981, RECV = 9982, DOC = 9983, EXPERT = 9984, RECV_B2 = 9985;
const ALL = [ADMIN, RECV, DOC, EXPERT, RECV_B2];

const perms = { canViewPatients: true, canAddPatients: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { ...perms, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. فلان", permissions: { ...perms, canWriteMedicalExam: true } },
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: perms },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const t of [
    "medical_review_requests", "post_exam_followup_events", "price_change_requests",
    "post_exam_followups", "patient_code_aliases", "patient_notification_deliveries",
  ]) await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM expenses WHERE notes = '${MARK}'`);
  //  جهاتُ واتساب تُنشأ تلقائياً مع كلّ مريضٍ يُسجَّل بالنقطة الحقيقية
  //  (الرايةُ مرفوعةٌ افتراضاً)، فحذفُ المريض بـSQL خام يصطدم بمفتاحها.
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** مريضٌ بلا أعلام — الحالاتُ تُضاف عبر النقاط كي يُختبَر المسار الحقيقي. */
//  الطولُ والوزن يُملآن هنا عمداً: هذا الملفّ يختبر **قاعدة التصنيف**،
//  وقاعدةُ «أكمِل المقاسات عند التعديل» (ترحيل ٠٦٠) لها اختبارها المستقلّ.
//  وخلطُهما كان سيجعل فشلَ إحداهما يُقرأ فشلاً للأخرى.
async function mk(label: string, branchId = 1, classification = "new") {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,false,false,false,0,$4) RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, classification]);
  return r[0].id;
}
const TODAY = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, "[]"], [RECV, "reception", 1, "[]"],
    [DOC, "doctor", 1, '["prosthetic","medical_support","physiotherapy"]'],
    [EXPERT, "prosthetics_expert", 1, "[]"], [RECV_B2, "reception", 2, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','مستخدم',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
    [id, `dp_u${id}`, role, b, JSON.stringify([b]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  const deptOfEntries = async (patientId: number) =>
    (await q(`SELECT c.case_type, e.source, e.amount::int AS amount
                FROM cost_entries e
                LEFT JOIN patient_cases c ON c.id = e.case_id
               WHERE e.patient_id = $1 ORDER BY e.id`, [patientId]))
      .map((r: any) => [r.case_type, r.source, Number(r.amount)]);

  try {
    // ══ ١. كلُّ قسمٍ يحمل قسمَه — والأطرافُ تفترق عن المساند ═══════════
    console.log("\n── ١. إسنادُ كلّ قسم ──");
    const pPro = await mk("أطراف");
    same("١. إضافةُ حالة أطراف تنجح",
      (await http("POST", `/api/patients/${pPro}/add-case-type`, S.recv,
        { caseType: "amputee", serviceCost: 1_000_000,
          amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة", height: "170", weight: "70" })).status, 200);
    same("   **وقيدُ كلفتها مبوَّبٌ أطرافاً**", await deptOfEntries(pPro),
      [["prosthetic", "add_case_type", 1_000_000]]);

    const pSup = await mk("مساند");
    await http("POST", `/api/patients/${pSup}/add-case-type`, S.recv,
      { caseType: "medical_support", serviceCost: 250_000 });
    same("   **وقيدُ المساند مبوَّبٌ مساندَ لا «أجهزة»**", await deptOfEntries(pSup),
      [["medical_support", "add_case_type", 250_000]]);

    const pPhy = await mk("علاج");
    await http("POST", `/api/patients/${pPhy}/add-case-type`, S.recv,
      { caseType: "physiotherapy", serviceCost: 300_000 });
    same("   وقيدُ العلاج الطبيعي مبوَّبٌ كذلك", await deptOfEntries(pPhy),
      [["physiotherapy", "add_case_type", 300_000]]);

    // ══ ٢. «خدمة جديدة» — الاستشارةُ وغيرُها علاجٌ طبيعي مالياً ═════════
    console.log("\n── ٢. خدمةٌ جديدة ⟶ علاجٌ طبيعي ──");
    //  **المبلغُ المدفوع الآن إلزاميٌّ الآن** (تصحيحٌ تشغيليّ — الجهوزيةُ
    //  الماليةُ) لكلّ خدمةٍ غيرِ مجّانية موجبة الكلفة — فصار `initialPayment`
    //  يرافق `serviceCost` هنا؛ هذا القسمُ يفحص تبويبَ القيود لا حارسَ الدفع.
    const cons = await http("POST", `/api/patients/${pPhy}/new-service`, S.recv,
      { serviceType: "consultation", serviceCost: 40_000, paidAmount: 0, initialPayment: 40_000 });
    check(cons.status === 200 || cons.status === 201, "٢. الاستشارة تُسجَّل", String(cons.status));
    const other = await http("POST", `/api/patients/${pPhy}/new-service`, S.recv,
      { serviceType: "other", serviceCost: 60_000, paidAmount: 0, initialPayment: 60_000 });
    check(other.status === 200 || other.status === 201, "   و«خدمة أخرى» كذلك", String(other.status));
    const newSvcRows = (await q(
      `SELECT c.case_type FROM cost_entries e
         LEFT JOIN patient_cases c ON c.id = e.case_id
        WHERE e.patient_id = $1 AND e.source = 'new_service'`, [pPhy]))
      .map((r: any) => r.case_type);
    same("   **وكلتاهما مبوَّبةٌ علاجاً طبيعياً — لا «غير مبوَّب»**",
      newSvcRows, ["physiotherapy", "physiotherapy"]);
    // ══ ٢ب. الخيطُ يُفتح قبل المال ═══════════════════════════════════════
    //  **مريضُ أطرافٍ يشتري استشارة**: الاستشارةُ علاجٌ طبيعي بحكم التصنيف،
    //  فتُفتح له حالةُ علاجٍ طبيعي **قبل أن يتحرّك دينار** ويُقيَّد المال
    //  عليها وحدها. وحالةُ أطرافه لا تُمسّ. وكان القيدُ قبلَ هذا يُحَلّ
    //  بترتيبٍ عامّ فيقع **على قسم الأطراف** — استشارةٌ تُحسَب بيعَ أطراف.
    console.log("\n── ٢ب. الخيطُ يُفتح قبل المال ──");
    const proCostBefore = Number((await q(
      `SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [pPro]))[0].cost);
    const consOnPro = await http("POST", `/api/patients/${pPro}/new-service`, S.recv,
      { serviceType: "consultation", serviceCost: 25_000, paidAmount: 0, initialPayment: 25_000 });
    check(consOnPro.status === 200 || consOnPro.status === 201,
      "٢ب. استشارةٌ لمريض أطرافٍ فقط تُسجَّل", String(consOnPro.status));
    same("   **وتُفتح له حالةُ علاجٍ طبيعي**", consOnPro.body?.openedPhysiotherapyCase, true);
    same("   **وقيدُها علاجٌ طبيعي لا أطراف**",
      (await q(`SELECT c.case_type FROM cost_entries e
                  LEFT JOIN patient_cases c ON c.id = e.case_id
                 WHERE e.patient_id = $1 AND e.source = 'new_service'`, [pPro]))
        .map((r: any) => r.case_type), ["physiotherapy"]);
    same("   **وحالةُ أطرافه لم تُمَسّ كلفتُها**",
      Number((await q(`SELECT cost FROM patient_cases
                        WHERE patient_id=$1 AND case_type='prosthetic'`, [pPro]))[0].cost),
      proCostBefore);
    //  **الأربعةُ على حالةٍ واحدة**: القيدُ والكلفةُ والزيارةُ والدفعة.
    const physioCaseOfPro = Number((await q(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='physiotherapy'`, [pPro]))[0].id);
    same("   **والزيارةُ والدفعةُ على الحالة نفسها**", [
      (await q(`SELECT case_id FROM visits WHERE patient_id=$1 AND details='خدمة جديدة'`, [pPro]))
        .map((r: any) => Number(r.case_id)),
      (await q(`SELECT case_id FROM payments WHERE patient_id=$1 AND notes LIKE 'استشارة%'`, [pPro]))
        .map((r: any) => Number(r.case_id)),
    ], [[physioCaseOfPro], [physioCaseOfPro]]);
    same("   وكلفةُ حالة العلاج الطبيعي هي المبلغ بعينه",
      Number((await q(`SELECT cost FROM patient_cases WHERE id=$1`, [physioCaseOfPro]))[0].cost), 25_000);

    //  **مريضُ مساندَ فقط يشتري «خدمة أخرى»** — نفسُ القاعدة، ولا يُنسَب
    //  دينارٌ منها للمساند.
    const supCostBefore = Number((await q(
      `SELECT cost FROM patient_cases WHERE patient_id=$1 AND case_type='medical_support'`, [pSup]))[0].cost);
    const otherOnSup = await http("POST", `/api/patients/${pSup}/new-service`, S.recv,
      { serviceType: "other", serviceCost: 30_000, paidAmount: 0, initialPayment: 30_000 });
    check(otherOnSup.status === 200 || otherOnSup.status === 201,
      "٢ج. «خدمة أخرى» لمريض مساندَ فقط تُسجَّل", String(otherOnSup.status));
    same("   **وقيدُها علاجٌ طبيعي لا مساند**",
      (await q(`SELECT c.case_type FROM cost_entries e
                  LEFT JOIN patient_cases c ON c.id = e.case_id
                 WHERE e.patient_id = $1 AND e.source = 'new_service'`, [pSup]))
        .map((r: any) => r.case_type), ["physiotherapy"]);
    same("   **وحالةُ مسنده لم تُمَسّ كلفتُها**",
      Number((await q(`SELECT cost FROM patient_cases
                        WHERE patient_id=$1 AND case_type='medical_support'`, [pSup]))[0].cost),
      supCostBefore);

    //  **ومريضٌ بلا أيّ حالة**: الخيطُ يُفتح أولاً، فلا قيدَ غيرَ مبوَّب.
    const pBare = await mk("بلا حالة");
    const consBare = await http("POST", `/api/patients/${pBare}/new-service`, S.recv,
      { serviceType: "consultation", serviceCost: 15_000, paidAmount: 0, initialPayment: 15_000 });
    check(consBare.status === 200 || consBare.status === 201,
      "٢د. استشارةٌ لمريضٍ بلا حالةٍ إطلاقاً تُسجَّل", String(consBare.status));
    same("   **وحالةُ العلاج الطبيعي أُنشئت قبل المال**", await deptOfEntries(pBare),
      [["physiotherapy", "new_service", 15_000]]);
    same("   **والعلمُ يُرفع معها فيتّسق الملفّ**",
      (await q(`SELECT is_physiotherapy FROM patients WHERE id=$1`, [pBare]))[0].is_physiotherapy, true);

    // ══ ٣. الصيانةُ تُبوَّب على قسم جهازها ══════════════════════════════
    //  ⚠ (المرحلة الثالثة) — البابُ الحيّ صار `/api/no-exam/maintenance`
    //  بعقدها الجديد؛ والتبويبُ محلُّ هذا الفحص لم يتغيّر بحرف.
    console.log("\n── ٣. الصيانة ──");
    const mv = await http("POST", "/api/no-exam/maintenance", S.recv, {
      maintenanceComponent: "knee",
      patientId: pPro, expertUserId: EXPERT, serviceType: "prosthetic",
      originalPrice: 75_000, discountAmount: 0, paidNow: 0,
      legacyUnrecordedDevice: true, note: "صيانة",
    });
    same("٣. فتحُ الصيانة ينجح", mv.status, 201);
    same("   **وأجورُها مبوَّبةٌ أطرافاً**",
      (await q(`SELECT c.case_type FROM cost_entries e
                  LEFT JOIN patient_cases c ON c.id = e.case_id
                 WHERE e.patient_id = $1 AND e.source = 'maintenance'`, [pPro]))
        .map((r: any) => r.case_type), ["prosthetic"]);

    // ══ ٤. لا كتابةَ عملٍ جديدة بلا تبويب ═══════════════════════════════
    console.log("\n── ٤. لا غيرَ مبوَّبٍ من المسارات اليومية ──");
    const unclassifiedNew = await q(
      `SELECT e.source, e.amount::int AS amount FROM cost_entries e
         JOIN patients p ON p.id = e.patient_id
        WHERE p.referral_source = $1 AND e.case_id IS NULL`, [MARK]);
    same("٤. **ولا قيدَ واحدٍ بلا قسم من كل ما سبق**",
      unclassifiedNew.map((r: any) => [r.source, Number(r.amount)]), []);

    // ══ ٥. المحاسبة: ثلاثةٌ منفصلة + تجميعان يصالحان ═══════════════════
    console.log("\n── ٥. تقسيمُ المحاسبة ──");
    //  دفعاتٌ لكل قسمٍ كي يُختبَر المقبوض مستقلاً عن المبيعات.
    const caseOf = async (pid: number, t: string) =>
      Number((await q(`SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type=$2`,
        [pid, t]))[0].id);
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, notes)
             VALUES ($1,1,$2,$3,'دفعة')`, [pPro, await caseOf(pPro, "prosthetic"), 400_000]);
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, notes)
             VALUES ($1,1,$2,$3,'دفعة')`, [pSup, await caseOf(pSup, "medical_support"), 100_000]);
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, notes)
             VALUES ($1,1,$2,$3,'دفعة')`, [pPhy, await caseOf(pPhy, "physiotherapy"), 275_000]);

    //  **مريضٌ واحدٌ في قسمين** — وهو الحالةُ التي وُضع لها `case_id` أصلاً:
    //  أعلامُ صاحبِ المعاملة لا تقول شيئاً عن **هذه** المعاملة، والربطُ
    //  على المريض بدل الحالة يضرب كلَّ قيدٍ في كلّ حالةٍ له فيتضاعف المال.
    const pBoth = await mk("قسمان معاً");
    await http("POST", `/api/patients/${pBoth}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 500_000,
        amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة", height: "170", weight: "70" });
    await http("POST", `/api/patients/${pBoth}/add-case-type`, S.recv,
      { caseType: "medical_support", serviceCost: 150_000 });
    //  ودفعتُه موسومةٌ بحالةِ أطرافه وحدها — فإن رُبط المقبوضُ بالمريض بدل
    //  الحالة ظهر نفسُ الدينار في القسمين معاً.
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, notes)
             VALUES ($1,1,$2,$3,'دفعة')`,
      [pBoth, Number((await q(`SELECT id FROM patient_cases
                                 WHERE patient_id=$1 AND case_type='prosthetic'`, [pBoth]))[0].id),
        90_000]);

    const acct = await storage.getAccountingSummary(1, TODAY, TODAY, { baghdadDays: true });
    const d = acct.byDepartment;
    same("٥. **الأطرافُ قسمٌ مستقلّ**",
      [d.prosthetic.revenue, d.prosthetic.paid], [1_575_000, 490_000]);
    same("   **والمساندُ قسمٌ مستقلّ لا يُجمع معه**",
      [d.medical_support.revenue, d.medical_support.paid], [400_000, 100_000]);
    same("   والعلاجُ الطبيعي ثالثُها",
      [d.physiotherapy.revenue, d.physiotherapy.paid], [470_000, 300_000]);
    same("   **ومريضُ القسمين يقع نصفُه هنا ونصفُه هناك — لا مضاعفةَ**",
      await deptOfEntries(pBoth),
      [["prosthetic", "add_case_type", 500_000], ["medical_support", "add_case_type", 150_000]]);
    same("٦. **والأطراف+المساند = جمعُ القسمين**",
      acct.rollups.devicesCombined,
      { revenue: 1_575_000 + 400_000, paid: 590_000 });
    //  المصالحةُ إلى الدينار مع الأرقام المرجعية — شرطُ صحّة التقسيم.
    same("٧. **والإجماليُّ يصالِح المرجعَ إلى الدينار**",
      [acct.rollups.grandTotal.revenue - acct.totalRevenue,
        acct.rollups.grandTotal.paid - acct.totalPaid], [0, 0]);
    check(acct.rollups.grandTotal.paid !== acct.rollups.grandTotal.revenue,
      "٨. **والمقبوضُ يُصالِح مستقلاً عن المبيعات** — لا يُشتقّ أحدهما من الآخر",
      `${acct.rollups.grandTotal.paid} vs ${acct.rollups.grandTotal.revenue}`);

    // ══ ٦. القديمُ الغامض يبقى ظاهراً ═══════════════════════════════════
    console.log("\n── ٦. القديمُ الغامض ──");
    const pLegacy = await mk("قديمٌ غامض");
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, notes)
             VALUES ($1,1,$2,'opening','قيد افتتاحي')`, [pLegacy, 90_000]);
    const acct2 = await storage.getAccountingSummary(1, TODAY, TODAY, { baghdadDays: true });
    same("٩. **قيدٌ بلا حالةٍ يظهر «غير مبوَّب» ولا يُدسّ في قسم**",
      acct2.byDepartment.unclassified.revenue
        - acct.byDepartment.unclassified.revenue, 90_000);
    same("   ولا يتضخّم به العلاجُ الطبيعي",
      acct2.byDepartment.physiotherapy.revenue, acct.byDepartment.physiotherapy.revenue);
    same("   ويبقى الإجماليُّ مصالِحاً",
      acct2.rollups.grandTotal.revenue - acct2.totalRevenue, 0);

    // ══ ٦ب. سلَّمُ الأدلّة على القديم ═══════════════════════════════════
    //  **صفوفُ ما قبل ترحيل ٠٥٦ كلُّها `case_id IS NULL`.** فلو قرأ التقسيمُ
    //  `case_id` وحده لانهار كلُّ تبويبٍ تاريخيّ كان `main` يقوله صحيحاً
    //  وصار «غير مبوَّب» — تراجعٌ لا تحسين. فالسلَّم يحفظه بدليلٍ مهيكل:
    //    ٢) حلقةُ الجهاز ⟶ الطرفُ أو المسندُ **يقيناً**
    //    ٣) مصدرُ علاجٍ قاطع ⟶ علاجٌ طبيعي
    //    ٤) مصدرُ أجهزةٍ قاطع بلا إثباتِ نوع ⟶ **أجهزةٌ غير مقسَّمة**
    //    ٥) وما عدا ذلك ⟶ غيرُ مبوَّبٍ ظاهراً
    console.log("\n── ٦ب. سلَّمُ الأدلّة على القديم ──");
    const pHist = await mk("تاريخيّ");
    //  حلقةُ جهازٍ حقيقية على حالة مساند — دليلٌ بنيويٌّ يحسم النوع.
    await http("POST", `/api/patients/${pHist}/add-case-type`, S.recv,
      { caseType: "medical_support", serviceCost: 0 });
    const histSupCase = Number((await q(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='medical_support'`, [pHist]))[0].id);
    const histEpisode = Number((await q(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status)
       VALUES ($1,$2,1,1,'delivered') RETURNING id`, [pHist, histSupCase]))[0].id);
    //  والصفوفُ تُزرَع **بلا `case_id`** — تماماً كصفوف ما قبل الترحيل.
    const seedLegacy = async (source: string, amount: number, episodeId: number | null = null) =>
      q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, device_episode_id, case_id)
         VALUES ($1,1,$2,$3,$4,NULL)`, [pHist, amount, source, episodeId]);
    await seedLegacy("physio_pricing", 200_000);
    await seedLegacy("session_backfill", 50_000);
    //  **و`new_service` قاطعةٌ بحكم التاريخ**: PR #172 حصر النقطةَ في
    //  ثلاثةِ أنواعٍ كلُّها علاجٌ طبيعي (٢٠٢٦-٠٧-٢٨ ٠٤:٥٠)، وأُنشئ جدولُ
    //  `cost_entries` نفسُه بعده بسبع ساعاتٍ ونصف (١٢:٢٠). فلا صفَّ
    //  `new_service` واحدٌ في الدفتر كُتب قبل الحصر — لا ترجيحَ بل يقين.
    await seedLegacy("new_service", 120_000);
    await seedLegacy("assign_manufacturing", 800_000, histEpisode); // نوعُه مُثبَت
    await seedLegacy("assign_manufacturing", 600_000);              // مؤكَّدٌ غيرُ مُثبَت
    await seedLegacy("maintenance", 40_000);                        // مؤكَّدٌ غيرُ مُثبَت
    await seedLegacy("opening", 33_000);                            // غامضٌ فعلاً

    const acct3 = await storage.getAccountingSummary(1, TODAY, TODAY, { baghdadDays: true });
    const dd = (k: keyof typeof acct3.byDepartment) =>
      (acct3.byDepartment[k] as any).revenue - (acct2.byDepartment[k] as any).revenue;
    same("١٠. **تاريخُ العلاج الطبيعي القاطع يبقى علاجاً طبيعياً**",
      dd("physiotherapy"), 370_000);
    same("   **و`new_service` القديمةُ منه** — ١٢٠ ألفاً لا تسقط في المجهول",
      dd("physiotherapy") - 250_000, 120_000);
    same("١١. **وحلقةُ الجهاز تحسم النوع يقيناً** — مساندُ لا «أجهزة»",
      [dd("prosthetic"), dd("medical_support")], [0, 800_000]);
    same("١٢. **ومالُ الأجهزة المؤكَّد بلا إثباتِ نوعٍ يبقى أجهزةً غير مقسَّمة**",
      dd("legacyDevicesUnsplit"), 640_000);
    same("   **ولا يُقسَّم بين الطرف والمسند بالتخمين**",
      [dd("prosthetic"), dd("medical_support")], [0, 800_000]);
    same("   **ولا يُدسّ في العلاج الطبيعي**", dd("physiotherapy"), 370_000);
    //  **والغامضُ وحده** — و`new_service` ليست منه بعد اليوم: ٣٣ ألفاً
    //  للقيد الافتتاحي فقط، ولو تسرّبت الخدمةُ الجديدة إليه لصار ١٥٣.
    same("١٣. **والغامضُ فعلاً يبقى غيرَ مبوَّبٍ ظاهراً**", dd("unclassified"), 33_000);
    //  والقيمةُ الرجعية: «الأجهزة» في الشكل القديم = ما كان `main` يعدّه
    //  أجهزةً (تخصيص + صيانة) وقد بقي كاملاً، والتوافقُ في **الرقم**.
    same("١٤. **و`bySection.devices` لا تتراجع قيمتُها**",
      acct3.bySection.devices.revenue - acct2.bySection.devices.revenue,
      800_000 + 600_000 + 40_000);
    same("   **و`bySection.physio` تزيد بالخدمة الجديدة القديمة**",
      acct3.bySection.physio.revenue - acct2.bySection.physio.revenue, 370_000);
    same("١٥. **والإجماليُّ المرجعي يصالِح إلى الدينار مع كلّ ذلك**",
      [acct3.rollups.grandTotal.revenue - acct3.totalRevenue,
        acct3.rollups.grandTotal.paid - acct3.totalPaid], [0, 0]);
    //  «المعروف» أصغرُ من الإجمالي بمقدار غير المحسوم — والفرقُ قياسُ المشكلة.
    same("١٦. **و«مجموع المعروف» أصغرُ بمقدار غير المحسوم بالضبط**",
      acct3.rollups.grandTotal.revenue - acct3.rollups.classifiedTotal.revenue,
      acct3.byDepartment.legacyDevicesUnsplit.revenue + acct3.byDepartment.unclassified.revenue);
    same("   **ومجموعُ الأجهزة يضمّ غيرَ المقسَّم** فلا تتراجع قيمتُه",
      acct3.rollups.devicesCombined.revenue,
      acct3.byDepartment.prosthetic.revenue + acct3.byDepartment.medical_support.revenue
        + acct3.byDepartment.legacyDevicesUnsplit.revenue);

    // ══ ٦ج. ترتيبُ السلَّم يُختبَر بصفٍّ يناقض نفسه ═══════════════════
    //  **صفُّ `new_service` على حالة أطراف صريحة.** المصدرُ يقول «علاجٌ
    //  طبيعي» و`case_id` يقول «أطراف» — والرتبةُ الأولى تسبق الثالثة،
    //  فالحالةُ تفوز. وبلا هذا الاختبار قد يُعاد ترتيبُ الشروط يوماً فتغلب
    //  قاعدةُ المصدر على علاقةٍ صريحة **ويُساء تبويبُ كلّ صفٍّ جديد**.
    console.log("\n── ٦ج. ترتيبُ السلَّم ──");
    const proCaseOfHist = Number((await q(
      `INSERT INTO patient_cases (patient_id, branch_id, case_type, status, cost)
       VALUES ($1,1,'prosthetic','active',0) RETURNING id`, [pHist]))[0].id);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, amount, source, case_id)
             VALUES ($1,1,$2,'new_service',$3)`, [pHist, 77_000, proCaseOfHist]);
    const acct4 = await storage.getAccountingSummary(1, TODAY, TODAY, { baghdadDays: true });
    same("١٧. **`case_id` يسبق المصدر** — الحالةُ الصريحة تفوز",
      acct4.byDepartment.prosthetic.revenue - acct3.byDepartment.prosthetic.revenue, 77_000);
    same("   **ولا يُنسَب للعلاج الطبيعي رغم أن مصدرَه `new_service`**",
      acct4.byDepartment.physiotherapy.revenue, acct3.byDepartment.physiotherapy.revenue);
    same("   ويبقى الإجماليُّ مصالِحاً إلى الدينار",
      [acct4.rollups.grandTotal.revenue - acct4.totalRevenue,
        acct4.rollups.grandTotal.paid - acct4.totalPaid], [0, 0]);
    //  وحلقةُ الجهاز (الرتبة الثانية) تسبق المصدرَ كذلك — مُثبَتٌ أعلاه في
    //  ١١: صفُّ `assign_manufacturing` بحلقةٍ صار مساندَ بعينه لا «أجهزة».

    //  **ونقدٌ حقيقيّ بلا تبويب**: دفعةٌ قديمة بلا حالةٍ ولا وسم. وجودُها
    //  شرطُ اختبارِ الصافي أدناه — بدونها يتساوى «المعروف» بالمرجع فيمرّ
    //  الخطأُ مختبئاً خلف تساوٍ عارض.
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, notes,
                                   payment_treatment_type)
             VALUES ($1,1,NULL,$2,'دفعة قديمة بلا تبويب',NULL)`, [pLegacy, 120_000]);
    const acctGap = await storage.getAccountingSummary(1, TODAY, TODAY, { baghdadDays: true });
    same("١٦ب. **ونقدٌ مقبوضٌ بلا تبويب يظهر «غير مبوَّب» ولا يُنسَب لقسم**",
      acctGap.byDepartment.unclassified.paid - acct3.byDepartment.unclassified.paid, 120_000);
    check(acctGap.rollups.classifiedTotal.paid < acctGap.rollups.grandTotal.paid,
      "   **فيفترق «المعروف» عن المرجع** — وهذا ما يجعل حارسَ الصافي ذا معنى",
      `${acctGap.rollups.classifiedTotal.paid} < ${acctGap.rollups.grandTotal.paid}`);

    // ══ ٧. التقريرُ اليومي: تاريخٌ ونطاقُ فرع ══════════════════════════
    console.log("\n── ٧. التقرير اليومي ──");
    const rep = await http("GET", `/api/reports/daily-patient-report?date=${TODAY}`, S.admin);
    same("١٠. التقريرُ يُرجع جدولَ الزيارات وملخّصَه المالي",
      [rep.status, Array.isArray(rep.body?.visits), typeof rep.body?.financial],
      [200, true, "object"]);
    const acctAll = await storage.getAccountingSummary(undefined, TODAY, TODAY, { baghdadDays: true });
    same("   وأرقامُه من مصدر الحقيقة نفسه",
      rep.body?.financial?.rollups?.grandTotal?.paid, acctAll.rollups.grandTotal.paid);
    //  **الصافي النقدي من الإجماليّ المرجعي لا من «المعروف»**: مالٌ قُبض
    //  فعلاً لا يُحذف من الصافي لأن تبويبَه ناقص — وإلّا عرضت الشاشة رقماً
    //  أصغرَ من الحقيقة وبدا الفرعُ خاسراً بمشكلةِ بيانات.
    same("١٠ب. **الصافي النقدي = كلُّ المقبوض − المصاريف**",
      rep.body?.financial?.netCash,
      acctAll.rollups.grandTotal.paid - acctAll.totalExpenses);
    same("   وكلُّ المقبوض = المرجعُ نفسه بلا نقصان",
      acctAll.rollups.grandTotal.paid, acctAll.totalPaid);
    check(acctAll.rollups.classifiedTotal.paid <= acctAll.rollups.grandTotal.paid,
      "   و«المعروف» لا يتجاوز المرجع أبداً",
      `${acctAll.rollups.classifiedTotal.paid} vs ${acctAll.rollups.grandTotal.paid}`);
    //  يومٌ آخر ⟶ أرقامٌ أخرى: التاريخُ محترَم لا مُهمَل.
    const other日 = "2001-01-02";
    const repOld = await http("GET", `/api/reports/daily-patient-report?date=${other日}`, S.admin);
    same("١١. **ويومٌ آخر يُرجع أصفاراً — التاريخُ محترَم**",
      repOld.body?.financial?.rollups?.grandTotal, { revenue: 0, paid: 0 });
    //  ونطاقُ الفرع: محاسبُ ذي قار لا يرى مالَ بغداد — ومَن يملك المال
    //  هو مَن يُختبَر به الحجبُ الجغرافي، وإلّا اختلط حاجزُ الفرع بحاجز
    //  الصلاحية فمرّ أحدُهما مختبئاً خلف الآخر.
    const repB2 = await http("GET", `/api/reports/daily-patient-report?date=${TODAY}`,
      { ...S.recvB2, permissions: { ...perms, canManageAccounting: true } });
    same("١٢. **ونطاقُ الفرع محترَم — لا يرى محاسبُ ذي قار مالَ بغداد**",
      repB2.body?.financial?.rollups?.grandTotal, { revenue: 0, paid: 0 });
    same("   ولا زياراتِه", (repB2.body?.visits ?? []).length, 0);

    //  والمالُ محجوبٌ بنفس بوّابته: جدولُ الزيارات نقطةٌ يقرأها كلُّ موظّف،
    //  فإلحاقُ المال بها بلا شرطٍ كان سيفتح أرقامَ الأقسام للاستقبال من
    //  بابٍ خلفيّ يتجاوز صفحةَ المحاسبة كلَّها.
    const repRecv = await http("GET", `/api/reports/daily-patient-report?date=${TODAY}`, S.recv);
    same("١٢ب. **والاستقبالُ بلا صلاحية محاسبة لا يرى المال**",
      [repRecv.status, repRecv.body?.financial], [200, null]);
    check((repRecv.body?.visits ?? []).length > 0,
      "   **لكنّ جدولَ زياراته يبقى كاملاً** — الحجبُ للمال وحده",
      String((repRecv.body?.visits ?? []).length));
    const repAcct = await http("GET", `/api/reports/daily-patient-report?date=${TODAY}`,
      { ...S.recv, permissions: { ...perms, canManageAccounting: true } });
    check(typeof repAcct.body?.financial === "object" && repAcct.body?.financial !== null,
      "   ومَن يملك `canManageAccounting` يراه — ولا دورَ جديدٌ اختُرع",
      JSON.stringify(repAcct.body?.financial));

    // ══ ٨. تصنيفُ المريض ═══════════════════════════════════════════════
    console.log("\n── ٨. تصنيف المريض ──");
    //  الطولُ والوزن إلزاميّان منذ هذا الترحيل — الطرفُ يُصنَع عليهما.
    const classOfEarly = async (id: number) =>
      (await q(`SELECT patient_classification c FROM patients WHERE id=$1`, [id]))[0]?.c ?? null;
    const base = {
      name: `${MARK} بلا تصنيف`, age: "30", height: "170", weight: "70",
      medicalCondition: "x",
      referralSource: MARK, branchId: 1, phone: "07709999999",
    };
    //  ══ **ولم يعد التسجيلُ يسأله أصلاً** (ترحيل ٠٦٥) ═══════════════════
    //  كان جوابُه الإداريُّ يقرّر إعفاءً سريرياً عبر `isLegacyPatient`. فصار
    //  السؤالُ السريريُّ على الحلقة (`servicePath`)، وصارت الواقعةُ الإدارية
    //  مربّعاً صريحاً (`hadPriorCenterHistory`). والعمودُ يبقى للتقارير،
    //  ويختمه الخادمُ `'new'` — صدقاً (الصفُّ أُنشئ اليوم) وأماناً (`'past'`
    //  كانت ستمنح كلَّ مسجَّلٍ جديد إعفاءَ المعاينة).
    const okNew = await http("POST", "/api/patients", S.recv, base);
    check(okNew.status === 200 || okNew.status === 201,
      "١٣. **إنشاءُ مريضٍ بلا تصنيف يمرّ** — لم يعد يُسأل", String(okNew.status));
    same("   والخادمُ ختمه «جديد»", await classOfEarly(Number(okNew.body?.id)), "new");
    //  **ولا يُقبل من العميل في أيّ اتجاه**: «قديم» في جسم الطلب كانت
    //  ستدّعي إعفاءً لم يقرّره أحد.
    const okPast = await http("POST", "/api/patients", S.recv,
      { ...base, name: `${MARK} قديم`, phone: "07708888888", patientClassification: "past" });
    check(okPast.status === 200 || okPast.status === 201,
      "١٤. و«قديم» في جسم الطلب لا يُردّ", String(okPast.status));
    same("   **لكنّه لا يُكتب** — الخادمُ يختم «جديد»",
      await classOfEarly(Number(okPast.body?.id)), "new");
    same("   وقيمةٌ مخترَعة لا تُكتب كذلك",
      await (async () => {
        const r = await http("POST", "/api/patients", S.recv,
          { ...base, name: `${MARK} مخترَع`, phone: "07707777777",
            patientClassification: "unspecified" });
        return await classOfEarly(Number(r.body?.id));
      })(), "new");
    //  ══ **والواقعةُ الإدارية تُحفَظ كما قالها الموظّف — ولا تفعل شيئاً** ══
    const okPrior = await http("POST", "/api/patients", S.recv,
      { ...base, name: `${MARK} سبق تعامله`, phone: "07706666666",
        hadPriorCenterHistory: true });
    check(okPrior.status === 200 || okPrior.status === 201,
      "١٤أ. **ومربّعُ «سبق أن تعامل مع المركز» يُقبل**", String(okPrior.status));
    same("   والقيمةُ حُفظت",
      (await q(`SELECT had_prior_center_history h FROM patients WHERE id=$1`,
        [Number(okPrior.body?.id)]))[0].h, true);
    same("   **وتصنيفُه مع ذلك «جديد»** — الواقعةُ لا تُغيّر العمود",
      await classOfEarly(Number(okPrior.body?.id)), "new");
    same("   **والافتراضُ `false` لمن لم يُؤشَّر**",
      (await q(`SELECT had_prior_center_history h FROM patients WHERE id=$1`,
        [Number(okNew.body?.id)]))[0].h, false);
    //  والصفوفُ القديمة الفارغة **لا تُخمَّن ولا تُملأ**.
    const pNull = await mk("تصنيفٌ فارغ");
    await q(`UPDATE patients SET patient_classification = NULL WHERE id = $1`, [pNull]);
    //  و«إضافة نوع حالة» صارت **تجمع تعريفَ البتر في مسارها** (تصحيحُ
    //  المالك): لا تُرفَع رايةُ البتر بلا موقعه، فلا يُولَد ملفٌّ نصفُ
    //  مكتمل يُترك إكمالُه لتعديلٍ لاحقٍ لا يقع.
    await http("POST", `/api/patients/${pNull}/add-case-type`, S.recv,
      { caseType: "amputee", amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" });
    same("١٥. **والصفُّ القديم الفارغ يبقى فارغاً — لا يُخمَّن**",
      (await q(`SELECT patient_classification FROM patients WHERE id=$1`, [pNull]))[0]
        .patient_classification, null);

    // ══ ٨ب. التصنيفُ على **التعديل** ═══════════════════════════════════
    //  الإنشاءُ يُلزم، والتعديلُ يحرس ما بُني — وإلّا فُتح بابٌ خلفيّ يفرّغ
    //  كلَّ ما ألزمناه به.
    console.log("\n── ٨ب. التصنيف على التعديل ──");
    const classOf = async (id: number) =>
      (await q(`SELECT patient_classification c FROM patients WHERE id=$1`, [id]))[0].c;
    const pClass = Number(okNew.body?.id);
    const edit = (id: number, body: any) => http("PUT", `/api/patients/${id}`, S.admin, body);

    same("١٥أ. **«جديد ⟶ قديم» تصحيحٌ مشروع**",
      (await edit(pClass, { patientClassification: "past" })).status, 200);
    same("   والقيمةُ حُفظت فعلاً", await classOf(pClass), "past");
    same("   **و«قديم ⟶ جديد» كذلك**",
      (await edit(pClass, { patientClassification: "new" })).status, 200);
    same("   والقيمةُ حُفظت فعلاً", await classOf(pClass), "new");

    same("١٥ب. **ولا يُمحى تصنيفٌ قائم**",
      (await edit(pClass, { patientClassification: "" })).status, 400);
    same("   ولا بـ`null`", (await edit(pClass, { patientClassification: null })).status, 400);
    same("   **والقيمةُ لم تتغيّر بعد الرفض**", await classOf(pClass), "new");
    same("١٥ج. **وقيمةٌ مخترَعة تُردّ ولو كانت غير فارغة**",
      (await edit(pClass, { patientClassification: "غير محدد" })).status, 400);
    same("   ولا `unspecified`",
      (await edit(pClass, { patientClassification: "unspecified" })).status, 400);
    same("   **والقيمةُ لم تتغيّر بعد الرفض**", await classOf(pClass), "new");

    //  والملفُّ القديم الفارغ: النموذجُ الكامل يعيد إرسال الحقل فارغاً،
    //  فلو رددنا الطلب لتعذّر تعديلُ هاتفٍ على آلاف الملفات القديمة.
    same("١٥د. **وملفٌّ قديم فارغُ التصنيف يُعدَّل بلا إجبار**",
      (await edit(pNull, { phone: "07701112233", patientClassification: "" })).status, 200);
    same("   **والفراغُ بقي فراغاً — لا يُخمَّن**", await classOf(pNull), null);
    same("   والتعديلُ المطلوب نُفِّذ فعلاً",
      (await q(`SELECT phone FROM patients WHERE id=$1`, [pNull]))[0].phone, "07701112233");
    same("   وتعديلٌ لا يذكر الحقل أصلاً يمرّ كذلك",
      (await edit(pNull, { address: "عنوانٌ ما" })).status, 200);
    same("   والفراغُ ما زال فراغاً", await classOf(pNull), null);
    same("١٥هـ. **وقيمةٌ صحيحة صريحة تُصنِّف الملفَّ القديم أخيراً**",
      (await edit(pNull, { patientClassification: "past" })).status, 200);
    same("   والقيمةُ حُفظت", await classOf(pNull), "past");
    same("   **وبعدها لا تُمحى** — صار له تصنيفٌ يُحرَس",
      (await edit(pNull, { patientClassification: "" })).status, 400);

    // ══ ٨ج. الانتماءُ بالدليل: الحالةُ تتكلّم ولو صمتَ العلم ════════════
    console.log("\n── ٨ج. أقسامُ المريض بالدليل ──");
    //  حالةٌ تُخلَق أيضاً من أمر تصنيع أو دفعةٍ موسومة (`case_signals`)، فمريضٌ
    //  بلا أعلام قد يحمل حالةً حقيقية. وعَدُّه «بلا قسم» إنذارُ جودةٍ كاذب —
    //  ولذلك تُرسِل `/api/patients` أنواعَ الحالات لا الأعلامَ وحدها.
    const pCaseOnly = await mk("حالةٌ بلا علم");
    await q(`INSERT INTO patient_cases (patient_id, case_type, status)
             VALUES ($1,'medical_support','active')`, [pCaseOnly]);
    const list = await http("GET", "/api/patients", S.admin);
    const rowCaseOnly = (list.body ?? []).find((p: any) => p.id === pCaseOnly);
    same("١٥و. **`/api/patients` تُرسل أنواعَ الحالات دليلاً للقسم**",
      rowCaseOnly?.caseTypes, ["medical_support"]);
    same("   ولا علمَ واحدٌ مرفوع — فالأعلامُ وحدها كانت ستقول «بلا قسم»",
      [rowCaseOnly?.isAmputee, rowCaseOnly?.isMedicalSupport, rowCaseOnly?.isPhysiotherapy],
      [false, false, false]);
    same("   ومريضٌ بلا حالةٍ ولا علمٍ يبقى بلا قسم — لا يُدسّ في العلاج الطبيعي",
      (list.body ?? []).find((p: any) => p.id === pNull)?.caseTypes, ["prosthetic"]);

    // ══ ٩. حذفٌ ودمجٌ مع العمود الجديد ═════════════════════════════════
    console.log("\n── ٩. الحذف والدمج ──");
    const pDel = await mk("للحذف");
    await http("POST", `/api/patients/${pDel}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 120_000,
        amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" });
    //  **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨): والكاسكيدُ الهادمُ
    //  بابُه الوحيد «حذف نهائي» من داخل السلّة. فتُنفَّذ الخطوتان معاً
    //  كي تبقى **تغطيةُ الكاسكيد كما كانت** بحرفها.
    await http("DELETE", `/api/patients/${pDel}`, S.admin,
      { reason: "اختبار الكاسكيد" });
    //  **والحذفُ النهائيُّ مقفلٌ حتى تنقضي مهلةُ الاستعادة** (المراجعة
    //  الأخيرة، القسم أ): فتُدفَع المهلةُ إلى الماضي كي يختبر هذا القسمُ
    //  الكاسكيدَ نفسَه لا بوّابةَ الانتظار.
    await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
               restore_until = NOW() - interval '10 days' WHERE id=$1`, [pDel]);
    const del = await http("POST", `/api/patient-trash/${pDel}/purge`,
      S.admin, { reason: "اختبار الكاسكيد" });
    check(del.status === 200 || del.status === 204,
      "١٦. **حذفُ مريضٍ بقيدٍ مبوَّب ينجح**", String(del.status));
    same("   ولا قيدَ يتيم",
      (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pDel])).length, 0);

    const mSrc = await mk("مصدر الدمج");
    const mDst = await mk("هدف الدمج");
    await http("POST", `/api/patients/${mSrc}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 200_000,
        amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" });
    await http("POST", `/api/patients/${mDst}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 100_000,
        amputationSite: "احادي - طرف سفلي - يمين - تحت الركبة" });
    await storage.mergePatients(mSrc, mDst);
    check(true, "١٧. **والدمج ينجح**");
    same("   **وقسمُ القيد المنقول محفوظٌ لا مُفرَّغ**",
      (await q(`SELECT c.case_type FROM cost_entries e
                  JOIN patient_cases c ON c.id = e.case_id
                 WHERE e.patient_id = $1 AND e.source = 'add_case_type'`, [mDst]))
        .map((r: any) => r.case_type), ["prosthetic", "prosthetic"]);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`, [ALL]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL]);
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
