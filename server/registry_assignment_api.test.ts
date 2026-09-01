// إسنادُ الخبير كما يقرأه سجلّ المرضى — حيّاً على Postgres وعلى النقطة نفسها.
// قاعدة محلّية: `npm run test:registry-assignment-api`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// المنطقُ الذي يقرّر ظهورَ الزرّ والشارة في الواجهة مُختبَرٌ خالصاً في
// `client/src/pages/patient_registry_assignment.test.ts`. وهذا الملفّ يحرس
// **الطرف الآخر**: أن ما يصل الواجهةَ هو ما تفترضه بالضبط.
//
// (١) **أمرُ بناءٍ فعّال يظهر باسم خبيره** — لا رقماً ولا فراغاً.
// (٢) **الصيانة ليست إسناداً**: لها خبير أيضاً، لكنها عملٌ على جهازٍ قائم.
//     فلو احتُسبت هنا لاختفى زرُّ التخصيص عن مريضٍ ينتظره.
// (٣) **المنتهي لا يُحتسب**: المكتمل والملغى ليسا إسناداً قائماً.
// (٤) **لكلّ خدمةٍ حالتها**: مريضٌ أُسنِد طرفُه وبقي مسندُه ينتظر يرجع
//     بإسنادٍ واحد لا بعَلَمٍ يغطّي الاثنين.
// (٥) **القديم لا يُستثنى من الحقيقة**: إعفاؤه يرفع شرطَ المعاينة، ولا
//     يخفي عن الواجهة أمراً قائماً — وإلّا أعاد الموظّفُ تخصيصه.
// (٦) **استعلامٌ واحد للصفحة لا واحدٌ لكلّ صفّ**: عددُ استعلامات الطلب
//     نفسه لصفحةٍ فيها مريضٌ واحد ولصفحةٍ فيها ستّة.

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

const PORT = 6833;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سجل-الإسناد";
const TOKEN = "سجلإسناد";              // يُبحث به فتقتصر الصفحة على مرضى الاختبار
const ADMIN = 9871, EXPERT = 9872, EXPERT2 = 9873, DOCTOR = 9874;
const EXPERT_NAME = "الخبير حسن", EXPERT2_NAME = "الخبير كريم";

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "adm", permissions: { canViewPatients: true, canAddPatients: true } },
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

async function mkPatient(label: string, opts: {
  isAmputee?: boolean; isMedicalSupport?: boolean; classification?: string;
} = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,$3,$4,0,$5) RETURNING id`,
    [`${TOKEN} ${label}`, MARK, opts.isAmputee ?? true, opts.isMedicalSupport ?? false,
      opts.classification ?? "new"]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,$2,0,'manual','active') RETURNING id`, [patientId, caseType]);
  return r[0].id;
}
async function mkExam(patientId: number, caseId: number, caseType = "prosthetic") {
  await q(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name,
       diagnosis, prescription, version, signed_at)
     VALUES ($1,$2,$3,1,$4,'د. فلان','تشخيص','{}'::jsonb,1,NOW())`,
    [patientId, caseId, caseType, DOCTOR]);
}
/**
 * معاينةٌ موقّعة **لحلقةٍ بعينها** — الرابطُ الذي يكتبه التوقيعُ الحقيقيّ
 * (`medical_exams.device_episode_id`، بلا مفتاحٍ أجنبيّ عمداً كما في
 * `medical/store.ts`). المريضُ ذو الحلقتين هنا يحتاج معاينةً مستقلّة لكلٍّ
 * منهما — نفسَ ما يقع فعلياً حين يعاين الطبيبُ جهازين منفصلين.
 */
async function mkExamForEpisode(
  patientId: number, caseId: number, episodeId: number, caseType = "prosthetic",
) {
  await q(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id, doctor_name,
       diagnosis, prescription, version, signed_at, device_episode_id)
     VALUES ($1,$2,$3,1,$4,'د. فلان','تشخيص','{}'::jsonb,1,NOW(),$5)`,
    [patientId, caseId, caseType, DOCTOR, episodeId]);
}
async function mkEpisode(patientId: number, caseId: number, seq: number, status: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by, delivered_at)
     VALUES ($1,$2,1,$3,$4,0,$5,CASE WHEN $4='delivered' THEN NOW() ELSE NULL END) RETURNING id`,
    [patientId, caseId, seq, status, ADMIN]);
  return r[0].id;
}
/**
 * أمرٌ يُكتب مباشرةً بالحالة المطلوبة.
 *
 * النقطةُ المُختبَرة هنا **قراءةٌ خالصة**، وما يهمّها صفٌّ بغرضٍ وحالة —
 * لا الطريقُ الذي وُلد منه. فالحالات التي لا تصنعها نقطةُ التخصيص (صيانةٌ
 * فعّالة، أمرٌ ملغى) تُكتب هنا، وأمّا حالةُ التخصيص نفسها فتمرّ بنقطتها
 * الحقيقية أدناه.
 */
async function mkOrder(patientId: number, opts: {
  serviceType?: string; purpose?: string; status?: string;
  episodeId?: number | null; expert?: number;
} = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
       purpose, status, device_episode_id)
     VALUES ($1,1,$2,$3,$4,$5,$6) RETURNING id`,
    [patientId, opts.expert ?? EXPERT, opts.serviceType ?? "prosthetic",
      opts.purpose ?? "initial_build", opts.status ?? "active", opts.episodeId ?? null]);
  return r[0].id;
}

/** صفُّ مريضٍ بعينه من ردّ السجلّ. */
async function registryRow(patientId: number) {
  const r = await http("GET", `/api/patients/registry?search=${encodeURIComponent(TOKEN)}&pageSize=50`, S.admin);
  check(r.status === 200, "  (السجلّ يستجيب)", JSON.stringify(r.body));
  return (r.body?.rows ?? []).find((row: any) => row.id === patientId) ?? null;
}
/** الإسنادات مجرَّدةً من الأرقام المتغيّرة، فيبقى المقارَنُ ما يعني الواجهة. */
function assignmentsOf(row: any) {
  return (row?.activeDeviceAssignments ?? []).map((a: any) => ({
    serviceType: a.serviceType, expertName: a.expertName, status: a.status,
  }));
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
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${EXPERT},${EXPERT2},${DOCTOR}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${EXPERT},${EXPERT2},${DOCTOR}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [EXPERT, "prosthetics_expert", EXPERT_NAME, "[]"],
    [EXPERT2, "prosthetics_expert", EXPERT2_NAME, "[]"],
    [DOCTOR, "doctor", "د. فلان", '["prosthetic","medical_support"]'],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `ra_u${id}`, name, role, spec]);
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

    //  لقطةٌ لكلّ أمرٍ قائم قبل أن يوجد مريضُ اختبارٍ واحد، تُقارَن في الآخر.
    const ordersBefore = await q(
      `SELECT id, status, purpose, expert_user_id, device_episode_id
         FROM prosthetic_work_orders ORDER BY id`);

    // ══ أ. ما قبل التخصيص ═════════════════════════════════════════════
    console.log("\n── قبل التخصيص وبعده ──");
    const pPlain = await mkPatient("بلا أمر");
    await mkCase(pPlain);
    same("أ. مريضٌ بلا أمرٍ ⟶ لا إسناد", assignmentsOf(await registryRow(pPlain)), []);

    // ══ ب. التخصيص عبر نقطته الحقيقية ═════════════════════════════════
    const pAssigned = await mkPatient("مُخصَّص");
    const cAssigned = await mkCase(pAssigned);
    await mkExam(pAssigned, cAssigned);
    const assign = await http("POST", `/api/patients/${pAssigned}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    same("ب. «تخصيص وإسناد خبير» نجح", assign.status, 201);
    const rowAssigned = await registryRow(pAssigned);
    same("   والسجلّ يرجع الإسناد **باسم خبيره**", assignmentsOf(rowAssigned),
      [{ serviceType: "prosthetic", expertName: EXPERT_NAME, status: "active" }]);
    const one = (rowAssigned?.activeDeviceAssignments ?? [])[0];
    same("   ومعه رقمُ أمره ورقمُ خبيره ومرحلته",
      [Number(one?.workOrderId) > 0, one?.expertUserId, typeof one?.currentStage],
      [true, EXPERT, "string"]);

    // ══ ج. المنتهي لا يُحتسب ═══════════════════════════════════════════
    console.log("\n── المنتهي ──");
    const pDone = await mkPatient("أمرٌ مكتمل");
    await mkCase(pDone);
    await mkOrder(pDone, { status: "completed" });
    same("ج. أمرُ بناءٍ **مكتمل** ⟶ ليس إسناداً قائماً",
      assignmentsOf(await registryRow(pDone)), []);

    const pCancelled = await mkPatient("أمرٌ ملغى");
    await mkCase(pCancelled);
    await mkOrder(pCancelled, { status: "cancelled" });
    same("   وأمرُ بناءٍ **ملغى** كذلك",
      assignmentsOf(await registryRow(pCancelled)), []);

    // ══ د. الصيانة ليست إسناداً ════════════════════════════════════════
    console.log("\n── الصيانة ──");
    const pMaint = await mkPatient("صيانةٌ فعّالة");
    const cMaint = await mkCase(pMaint);
    const eMaint = await mkEpisode(pMaint, cMaint, 1, "delivered");
    await mkOrder(pMaint, { purpose: "maintenance", episodeId: eMaint, expert: EXPERT2 });
    same("د. **صيانةٌ فعّالة بخبيرها ⟶ لا تُحتسب إسناداً**",
      assignmentsOf(await registryRow(pMaint)), []);
    same("   (والأمرُ موجودٌ فعلاً ومفتوح)",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders
                 WHERE patient_id=$1 AND purpose='maintenance'
                   AND status NOT IN ('completed','cancelled')`, [pMaint]))[0].n, 1);

    //  وصيانةُ القديم لا تحجب بناءَ الجديد: الاثنان معاً، والبناء وحده يظهر.
    await mkOrder(pMaint, { purpose: "initial_build", expert: EXPERT });
    same("   وحين يُبنى جهازٌ جديد بينما القديم يُصان ⟶ **البناء وحده يظهر**",
      assignmentsOf(await registryRow(pMaint)),
      [{ serviceType: "prosthetic", expertName: EXPERT_NAME, status: "active" }]);

    // ══ هـ. لكلّ خدمةٍ حالتها ══════════════════════════════════════════
    console.log("\n── الخدمتان معاً ──");
    const pDual = await mkPatient("طرفٌ ومسند", { isAmputee: true, isMedicalSupport: true });
    const cDualP = await mkCase(pDual, "prosthetic");
    await mkCase(pDual, "medical_support");
    await mkExam(pDual, cDualP, "prosthetic");
    const assignDual = await http("POST", `/api/patients/${pDual}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    same("هـ. تخصيص الطرف وحده نجح", assignDual.status, 201);
    same("   **والسجلّ يرجع الطرف فقط — والمسند يبقى بلا إسناد**",
      assignmentsOf(await registryRow(pDual)),
      [{ serviceType: "prosthetic", expertName: EXPERT_NAME, status: "active" }]);

    // ══ و. القديم لا يُستثنى من الحقيقة ═══════════════════════════════
    console.log("\n── المريض القديم ──");
    const pLegacy = await mkPatient("قديم", { classification: "past" });
    await mkCase(pLegacy);
    const legacyAssign = await http("POST", `/api/patients/${pLegacy}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT2, serviceType: "prosthetic", cost: 0 });
    same("و. القديم يُخصَّص **بلا معاينة** كما كان", legacyAssign.status, 201);
    same("   ومع ذلك يصل السجلَّ إسنادُه — فلا يُخصَّص مرّتين",
      assignmentsOf(await registryRow(pLegacy)),
      [{ serviceType: "prosthetic", expertName: EXPERT2_NAME, status: "active" }]);

    // ══ ز. خبيرٌ عُطِّل حسابه بعد الإسناد ═══════════════════════════════
    //  حالةٌ واقعية: خبيرٌ يترك العمل فيُعطَّل حسابه وأمرُه مفتوح. لو سقط
    //  إسنادُه من السجلّ لعاد الزرُّ فأنشأ الموظّفُ أمراً ثانياً يردّه
    //  الفهرسُ الفريد — خطأٌ بلا سبب مفهوم.
    console.log("\n── خبيرٌ مُعطَّل ──");
    const pLeft = await mkPatient("خبيرٌ ترك العمل");
    const cLeft = await mkCase(pLeft);
    await mkExam(pLeft, cLeft);
    const leftAssign = await http("POST", `/api/patients/${pLeft}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 });
    same("ز. أُسنِد وهو فعّال", leftAssign.status, 201);
    await q(`UPDATE system_users SET is_active = false WHERE id = $1`, [EXPERT]);
    same("   ثم عُطِّل حسابه ⟶ **الإسناد يبقى ظاهراً باسمه**",
      assignmentsOf(await registryRow(pLeft)),
      [{ serviceType: "prosthetic", expertName: EXPERT_NAME, status: "active" }]);
    await q(`UPDATE system_users SET is_active = true WHERE id = $1`, [EXPERT]);

    // ══ ط. حلقتان مؤهَّلتان لخدمةٍ واحدة — عمليتان مستقلّتان (ترحيل ٠٧٣) ══
    //  **هذا سيناريو التقرير بعينه**: المريض يملك حلقتَي طرفٍ صناعيّ، كلتاهما
    //  `examined` بمعاينتها الموقّعة الخاصّة. إسنادُ إحداهما صراحةً بمعرّفها
    //  يجب ألّا يمسّ الأخرى، وألّا يُخفيها عن «تم تحديد» ولا عن السجلّ — ثم
    //  إسنادُ الثانية يُنتج أمرَ عملٍ **مستقلّاً ثانياً**، كلٌّ على حلقته.
    console.log("\n── حلقتان مؤهَّلتان معاً (ترحيل ٠٧٣) ──");
    const pTwo = await mkPatient("حلقتان مؤهَّلتان");
    const cTwo = await mkCase(pTwo);
    const e1 = await mkEpisode(pTwo, cTwo, 1, "examined");
    const e2 = await mkEpisode(pTwo, cTwo, 2, "examined");
    await mkExamForEpisode(pTwo, cTwo, e1);
    await mkExamForEpisode(pTwo, cTwo, e2);

    same("ط. قبل أيّ إسناد ⟶ لا إسنادَ في السجلّ بعد",
      assignmentsOf(await registryRow(pTwo)), []);
    const pendingBefore = await http("GET", "/api/medical/pending", S.admin);
    check((pendingBefore.body?.decided?.[pTwo] ?? []).includes("prosthetic"),
      "   و«تم تحديد» تشمل الخدمة — حلقتان examined معاً",
      JSON.stringify(pendingBefore.body?.decided?.[pTwo]));

    //  إسنادُ الحلقة الأولى صراحةً بمعرّفها.
    const assignFirst = await http("POST", `/api/patients/${pTwo}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 500_000, deviceEpisodeId: e1 });
    same("ط٢. إسنادُ الحلقة الأولى صراحةً بمعرّفها ⟶ ينجح", assignFirst.status, 201);

    //  **والحلقةُ الثانية تبقى مؤهَّلة**: إسنادٌ واحدٌ فقط في السجلّ، على
    //  الحلقة الأولى بعينها، و«تم تحديد» ما زالت تذكر الخدمة.
    const rowAfterFirst = await registryRow(pTwo);
    same("ط٣. **والسجلّ يُظهر إسناداً واحداً على الحلقة الأولى بعينها**",
      (rowAfterFirst?.activeDeviceAssignments ?? []).map((a: any) => ({
        serviceType: a.serviceType, deviceEpisodeId: a.deviceEpisodeId, expertName: a.expertName,
      })),
      [{ serviceType: "prosthetic", deviceEpisodeId: e1, expertName: EXPERT_NAME }]);
    const pendingAfterFirst = await http("GET", "/api/medical/pending", S.admin);
    check((pendingAfterFirst.body?.decided?.[pTwo] ?? []).includes("prosthetic"),
      "   **و«تم تحديد» تبقى تذكر الخدمة — الحلقةُ الثانية ما زالت examined**",
      JSON.stringify(pendingAfterFirst.body?.decided?.[pTwo]));
    same("   وحالتا الحلقتين: الأولى انتقلت والثانية بلا مساس",
      await q(`SELECT id, status FROM patient_device_episodes WHERE id = ANY($1::int[]) ORDER BY id`,
        [[e1, e2]]),
      [{ id: e1, status: "in_manufacturing" }, { id: e2, status: "examined" }]);

    //  ولا معرّفٍ صريح الآن وقد بقيت حلقةٌ واحدةٌ فقط `examined` (الثانية)
    //  ⟶ تُحسم تلقائياً بلا سؤال (مسارُ التوافق مع مريضٍ ذي حلقةٍ واحدة).
    const rowAfterFirstNoticeStillOne = await q<{ id: number }>(
      `SELECT id FROM patient_device_episodes WHERE case_id=$1 AND status='examined'`, [cTwo]);
    same("   وحلقةٌ واحدة examined متبقّية الآن", rowAfterFirstNoticeStillOne.map((r) => r.id), [e2]);

    //  إسنادُ الحلقة الثانية صراحةً بمعرّفها — **عمليةٌ ثانية مستقلّة**.
    const assignSecond = await http("POST", `/api/patients/${pTwo}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT2, serviceType: "prosthetic", cost: 700_000, deviceEpisodeId: e2 });
    same("ط٤. **وإسنادُ الحلقة الثانية بعدها ⟶ ينجح أيضاً**", assignSecond.status, 201);

    //  **وأمران مستقلّان بالضبط الآن — كلٌّ على حلقته بعينها**، والأوّل بلا
    //  مساسٍ إطلاقاً (خبيرُه وكلفتُه كما استقرّا في ط٢).
    const rowAfterBoth = await registryRow(pTwo);
    same("ط٥. **وأمران مستقلّان بالضبط الآن — كلٌّ على حلقته بعينها**",
      (rowAfterBoth?.activeDeviceAssignments ?? []).map((a: any) => ({
        serviceType: a.serviceType, deviceEpisodeId: a.deviceEpisodeId, expertName: a.expertName,
      })).sort((a: any, b: any) => (a.deviceEpisodeId ?? 0) - (b.deviceEpisodeId ?? 0)),
      [{ serviceType: "prosthetic", deviceEpisodeId: e1, expertName: EXPERT_NAME },
        { serviceType: "prosthetic", deviceEpisodeId: e2, expertName: EXPERT2_NAME }]);
    same("   وكلتا الحلقتين قيد التصنيع الآن، كلٌّ بكلفتها المستقلّة",
      await q(`SELECT id, status, agreed_cost FROM patient_device_episodes
                 WHERE id = ANY($1::int[]) ORDER BY id`, [[e1, e2]]),
      [{ id: e1, status: "in_manufacturing", agreed_cost: 500_000 },
        { id: e2, status: "in_manufacturing", agreed_cost: 700_000 }]);
    const ordersOfTwo = await q<{ device_episode_id: number; status: string }>(
      `SELECT device_episode_id, status FROM prosthetic_work_orders
        WHERE patient_id=$1 AND purpose='initial_build' ORDER BY device_episode_id`, [pTwo]);
    same("   **وصفّا أمرٍ مستقلّان في القاعدة، كلٌّ بحلقته بعينها**",
      ordersOfTwo, [{ device_episode_id: e1, status: "active" }, { device_episode_id: e2, status: "active" }]);

    //  **وبعد إسناد كلتيهما ⟶ الخدمةُ تختفي من «تم تحديد» كما كانت قبل
    //  تعدّد الحلقات** — لم يبقَ فيها ما يستحقّ الزرّ.
    const pendingAfterBoth = await http("GET", "/api/medical/pending", S.admin);
    check(!(pendingAfterBoth.body?.decided?.[pTwo] ?? []).includes("prosthetic"),
      "   وبعد إسناد الحلقتين معاً ⟶ الخدمة تختفي من «تم تحديد»",
      JSON.stringify(pendingAfterBoth.body?.decided?.[pTwo]));

    //  والالتباسُ لا يُحسَم بصمت: بلا معرّفٍ صريح الآن وكلتا الحلقتين حيّتان
    //  (`in_manufacturing`)، فمحاولةُ إسنادٍ ثالثة بلا تحديد تُرفَض ٤٠٩.
    const thirdNoId = await http("POST", `/api/patients/${pTwo}/assign-manufacturing`, S.admin,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 100 });
    same("ط٦. وبلا معرّفٍ صريح بعد إسناد الاثنتين ⟶ ٤٠٩ لا كتابةٌ ثالثة",
      thirdNoId.status, 409);
    same("   وما زال أمران فقط", (await q(
      `SELECT count(*)::int n FROM prosthetic_work_orders
        WHERE patient_id=$1 AND purpose='initial_build'`, [pTwo]))[0].n, 2);

    // ══ ح. استعلامٌ واحد للصفحة، لا واحدٌ لكلّ صفّ ═════════════════════
    console.log("\n── كلفة الاستعلام ──");
    const realQuery = pool.query.bind(pool);
    let counted = 0;
    (pool as any).query = (...args: any[]) => { counted++; return (realQuery as any)(...args); };
    counted = 0;
    await http("GET", `/api/patients/registry?search=${encodeURIComponent(TOKEN)}&pageSize=1`, S.admin);
    const forOne = counted;
    counted = 0;
    await http("GET", `/api/patients/registry?search=${encodeURIComponent(TOKEN)}&pageSize=50`, S.admin);
    const forMany = counted;
    (pool as any).query = realQuery;

    const pageRows = (await http("GET", `/api/patients/registry?search=${encodeURIComponent(TOKEN)}&pageSize=50`, S.admin))
      .body?.rows?.length ?? 0;
    check(pageRows >= 6, "ح. الصفحة الكبيرة فيها ستّة مرضى فأكثر", String(pageRows));
    same("   **وعددُ الاستعلامات لا يتغيّر بعددهم**", forMany, forOne);
    check(forOne > 0 && forOne <= 8, "   وهو عددٌ ثابتٌ صغير", `${forOne}`);

    // ══ ولا صفَّ تاريخيّاً تغيّر ═══════════════════════════════════════
    same("ولا أمرَ خارج الاختبار تغيّر",
      await q(`SELECT id, status, purpose, expert_user_id, device_episode_id
                 FROM prosthetic_work_orders
                WHERE patient_id NOT IN (SELECT id FROM patients WHERE referral_source='${MARK}')
                ORDER BY id`), ordersBefore);
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, EXPERT, EXPERT2, DOCTOR]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, EXPERT, EXPERT2, DOCTOR]]);
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
