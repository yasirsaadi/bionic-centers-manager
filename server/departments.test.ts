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
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** مريضٌ بلا أعلام — الحالاتُ تُضاف عبر النقاط كي يُختبَر المسار الحقيقي. */
async function mk(label: string, branchId = 1, classification = "new") {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','x',$3,false,false,false,0,$4) RETURNING id`,
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
        { caseType: "amputee", serviceCost: 1_000_000 })).status, 200);
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
    const cons = await http("POST", `/api/patients/${pPhy}/new-service`, S.recv,
      { serviceType: "consultation", serviceCost: 40_000, paidAmount: 0 });
    check(cons.status === 200 || cons.status === 201, "٢. الاستشارة تُسجَّل", String(cons.status));
    const other = await http("POST", `/api/patients/${pPhy}/new-service`, S.recv,
      { serviceType: "other", serviceCost: 60_000, paidAmount: 0 });
    check(other.status === 200 || other.status === 201, "   و«خدمة أخرى» كذلك", String(other.status));
    const newSvcRows = (await q(
      `SELECT c.case_type FROM cost_entries e
         LEFT JOIN patient_cases c ON c.id = e.case_id
        WHERE e.patient_id = $1 AND e.source = 'new_service'`, [pPhy]))
      .map((r: any) => r.case_type);
    same("   **وكلتاهما مبوَّبةٌ علاجاً طبيعياً — لا «غير مبوَّب»**",
      newSvcRows, ["physiotherapy", "physiotherapy"]);
    //  ومريضُ الأطراف الذي يشتري استشارةً: القيدُ يتبع المال حيث ذهب —
    //  حالةُ أطرافه، وهي التي ارتفعت كلفتُها. رقمُ التقرير ورقمُ الحالة
    //  يقولان الشيء نفسه، ولا يقول القسمُ شيئاً والكلفةُ شيئاً آخر.
    const consOnPro = await http("POST", `/api/patients/${pPro}/new-service`, S.recv,
      { serviceType: "consultation", serviceCost: 25_000, paidAmount: 0 });
    check(consOnPro.status === 200 || consOnPro.status === 201,
      "   واستشارةٌ لمريض أطراف تُسجَّل", String(consOnPro.status));
    same("   **وقيدُها يتبع الحالة التي استقبلت كلفتَها — لا «غير مبوَّب»**",
      (await q(`SELECT c.case_type FROM cost_entries e
                  LEFT JOIN patient_cases c ON c.id = e.case_id
                 WHERE e.patient_id = $1 AND e.source = 'new_service'`, [pPro]))
        .map((r: any) => r.case_type), ["prosthetic"]);

    // ══ ٣. الصيانةُ تُبوَّب على قسم جهازها ══════════════════════════════
    console.log("\n── ٣. الصيانة ──");
    const mv = await http("POST", "/api/manufacturing/maintenance-visit", S.recv, {
      patientId: pPro, expertUserId: EXPERT, serviceType: "prosthetic",
      cost: 75_000, legacyUnrecordedDevice: true, notes: "صيانة",
      reviewPath: "quick", reviewKind: "maintenance",
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
      { caseType: "amputee", serviceCost: 500_000 });
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
      [d.prosthetic.revenue, d.prosthetic.paid], [1_600_000, 490_000]);
    same("   **والمساندُ قسمٌ مستقلّ لا يُجمع معه**",
      [d.medical_support.revenue, d.medical_support.paid], [400_000, 100_000]);
    same("   والعلاجُ الطبيعي ثالثُها",
      [d.physiotherapy.revenue, d.physiotherapy.paid], [400_000, 275_000]);
    same("   **ومريضُ القسمين يقع نصفُه هنا ونصفُه هناك — لا مضاعفةَ**",
      await deptOfEntries(pBoth),
      [["prosthetic", "add_case_type", 500_000], ["medical_support", "add_case_type", 150_000]]);
    same("٦. **والأطراف+المساند = جمعُ القسمين**",
      acct.rollups.devicesCombined,
      { revenue: 1_600_000 + 400_000, paid: 590_000 });
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

    // ══ ٧. التقريرُ اليومي: تاريخٌ ونطاقُ فرع ══════════════════════════
    console.log("\n── ٧. التقرير اليومي ──");
    const rep = await http("GET", `/api/reports/daily-patient-report?date=${TODAY}`, S.admin);
    same("١٠. التقريرُ يُرجع جدولَ الزيارات وملخّصَه المالي",
      [rep.status, Array.isArray(rep.body?.visits), typeof rep.body?.financial],
      [200, true, "object"]);
    same("   وأرقامُه من مصدر الحقيقة نفسه",
      rep.body?.financial?.rollups?.grandTotal?.paid,
      (await storage.getAccountingSummary(undefined, TODAY, TODAY, { baghdadDays: true })).rollups.grandTotal.paid);
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
    const base = {
      name: `${MARK} بلا تصنيف`, age: "30", medicalCondition: "x",
      referralSource: MARK, branchId: 1, phone: "07709999999",
    };
    same("١٣. **إنشاءُ مريضٍ بلا تصنيف يُردّ**",
      (await http("POST", "/api/patients", S.recv, base)).status, 400);
    same("   وبقيمةٍ مخترَعة يُردّ كذلك",
      (await http("POST", "/api/patients", S.recv,
        { ...base, patientClassification: "unspecified" })).status, 400);
    const okNew = await http("POST", "/api/patients", S.recv,
      { ...base, patientClassification: "new" });
    check(okNew.status === 200 || okNew.status === 201,
      "١٤. **و«جديد» يُقبل**", String(okNew.status));
    const okPast = await http("POST", "/api/patients", S.recv,
      { ...base, name: `${MARK} قديم`, phone: "07708888888", patientClassification: "past" });
    check(okPast.status === 200 || okPast.status === 201,
      "   و«قديم» يُقبل", String(okPast.status));
    //  والصفوفُ القديمة الفارغة **لا تُخمَّن ولا تُملأ**.
    const pNull = await mk("تصنيفٌ فارغ");
    await q(`UPDATE patients SET patient_classification = NULL WHERE id = $1`, [pNull]);
    await http("POST", `/api/patients/${pNull}/add-case-type`, S.recv, { caseType: "amputee" });
    same("١٥. **والصفُّ القديم الفارغ يبقى فارغاً — لا يُخمَّن**",
      (await q(`SELECT patient_classification FROM patients WHERE id=$1`, [pNull]))[0]
        .patient_classification, null);

    // ══ ٨ب. الانتماءُ بالدليل: الحالةُ تتكلّم ولو صمتَ العلم ════════════
    console.log("\n── ٨ب. أقسامُ المريض بالدليل ──");
    //  حالةٌ تُخلَق أيضاً من أمر تصنيع أو دفعةٍ موسومة (`case_signals`)، فمريضٌ
    //  بلا أعلام قد يحمل حالةً حقيقية. وعَدُّه «بلا قسم» إنذارُ جودةٍ كاذب —
    //  ولذلك تُرسِل `/api/patients` أنواعَ الحالات لا الأعلامَ وحدها.
    const pCaseOnly = await mk("حالةٌ بلا علم");
    await q(`INSERT INTO patient_cases (patient_id, case_type, status)
             VALUES ($1,'medical_support','active')`, [pCaseOnly]);
    const list = await http("GET", "/api/patients", S.admin);
    const rowCaseOnly = (list.body ?? []).find((p: any) => p.id === pCaseOnly);
    same("١٥ب. **`/api/patients` تُرسل أنواعَ الحالات دليلاً للقسم**",
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
      { caseType: "amputee", serviceCost: 120_000 });
    const del = await http("DELETE", `/api/patients/${pDel}`, S.admin);
    check(del.status === 200 || del.status === 204,
      "١٦. **حذفُ مريضٍ بقيدٍ مبوَّب ينجح**", String(del.status));
    same("   ولا قيدَ يتيم",
      (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pDel])).length, 0);

    const mSrc = await mk("مصدر الدمج");
    const mDst = await mk("هدف الدمج");
    await http("POST", `/api/patients/${mSrc}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 200_000 });
    await http("POST", `/api/patients/${mDst}/add-case-type`, S.recv,
      { caseType: "amputee", serviceCost: 100_000 });
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
