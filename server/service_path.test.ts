// **مسارُ العملية** و**تاريخُ المريض السابق** — حيّاً على Postgres.
// قاعدة محلّية: `npm run test:service-path`.
//
// ══ الثابتُ الواحد الذي يحرسه هذا الملفّ ═════════════════════════════════
// **«أتحتاج هذه العمليةُ معاينةً؟» سؤالٌ عن العملية، لا عن المريض.**
//
// كان الجوابُ يُستخرَج من `patients.patient_classification` («جديد/قديم») —
// حقلٍ إداريٍّ في ظاهره، يقرّر في باطنه إعفاءً سريرياً عبر `isLegacyPatient`.
// فموظّفةُ الاستقبال تُسأل عن ملفٍّ وتُجيب عن معاينة.
//
// فصار السؤالان اثنين:
//   ① `patients.had_prior_center_history` — واقعةٌ إدارية **لا تفعل شيئاً**.
//   ② `patient_device_episodes.service_path` — قرارُ التوجيه، **لكلّ عملية**.
//
// وما يُثبته هذا الملفّ:
//   • التسجيلُ لم يعد يسأل «جديد/قديم»، والخادمُ يختم `'new'`.
//   • رايةُ التاريخ السابق **لا تُعفي** ولا تُنشئ كياناً واحداً.
//   • مسارُ العملية يحسم الطابور والبوّابة — **ولا يعلو عليه تصنيفُ المريض**.
//   • **وحلقةُ ما قبل ٠٦٥ (`NULL`) تسلك سلوكَها القديم حرفاً بحرف.**
//   • والحدُّ المؤقّت لمسار «بلا معاينة» يُردّ **قبل أيّ أثرٍ ماليّ**.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  SERVICE_PATHS, isServicePath, parseServicePath, examRequirementOf,
  operationNeedsExam, NO_EXAM_PENDING_BOUNDARY,
} from "@shared/service_path";

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

const PORT = 6844;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-مسار-العملية";
const MANAGER = 9891, DOCTOR = 9892, EXPERT = 9893, RECEPTION = 9894, OTHER = 9895;

const S = {
  admin: {
    userId: MANAGER, role: "admin", isAdmin: true, branchId: 1,
    accessibleBranches: [1, 2], displayName: "adm",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "mgr",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  recv: {
    userId: RECEPTION, role: "reception", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "recv",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOCTOR, role: "doctor", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "doc",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
  },
  otherBranch: {
    userId: OTHER, role: "reception", isAdmin: false, branchId: 2,
    accessibleBranches: [2], displayName: "recv2",
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
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** مريضٌ بـSQL خام — للحالات التي تحتاج تصنيفاً أو ختمَ إنشاءٍ بعينه. */
async function mkPatient(label: string, opts: {
  classification?: string | null; support?: boolean; physio?: boolean;
  prior?: boolean; branch?: number;
} = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       is_physiotherapy, total_cost, patient_classification, had_prior_center_history)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,$4,$5,$6,0,$7,$8) RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.branch ?? 1, opts.physio !== true,
      opts.support === true, opts.physio === true,
      opts.classification === undefined ? "new" : opts.classification,
      opts.prior === true]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic", branch = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branch, caseType]);
  return r[0].id;
}
/** حلقةٌ **بلا مسار** — الشكلُ الحرفيّ لصفوف ما قبل ترحيل ٠٦٥. */
async function mkLegacyEpisode(patientId: number, caseId: number, seq = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, requested_item, created_by)
     VALUES ($1,$2,1,$3,'awaiting_exam',0,'full_device',$4) RETURNING id`,
    [patientId, caseId, seq, MANAGER]);
  return r[0].id;
}
async function epRow(id: number) {
  const [r] = await q(
    `SELECT id, sequence_number, status, requested_item, component, service_path
       FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
}
/** كلُّ ما قد «يخترعه» فعلٌ ما على ملفّ مريض — صفراً يعني «لم يُخترَع شيء». */
async function footprintOf(patientId: number) {
  const [n] = await q(`SELECT
      (SELECT count(*)::int FROM patient_device_episodes WHERE patient_id=$1) AS episodes,
      (SELECT count(*)::int FROM prosthetic_work_orders  WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM payments               WHERE patient_id=$1) AS payments,
      (SELECT count(*)::int FROM medical_exams          WHERE patient_id=$1) AS exams,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews,
      (SELECT count(*)::int FROM visits WHERE patient_id=$1 AND deleted_at IS NULL) AS visits,
      (SELECT count(*)::int FROM post_exam_followups    WHERE patient_id=$1) AS followups`,
    [patientId]);
  return n;
}
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS cost_entries,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders`, [patientId]);
  return { total: Number(p?.total ?? 0), ...n };
}
const pendingOf = async (session: any, patientId: number) => {
  const r = await http("GET", "/api/medical/pending", session);
  return {
    pending: r.body?.pending?.[patientId] ?? null,
    optional: r.body?.optional?.[patientId] ?? null,
  };
};
const worklistHas = async (patientId: number, caseType: string) => {
  const r = await http("GET", "/api/medical/worklist", S.doc);
  return (r.body?.rows ?? []).some((x: any) =>
    Number(x.patientId) === patientId && x.caseType === caseType);
};
/** معاينةٌ موقّعة على حلقةٍ بعينها. */
async function mkExam(patientId: number, caseId: number, episodeId: number | null,
  caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
       doctor_name, diagnosis, prescription, device_cost, version, signed_at, device_episode_id)
     VALUES ($1,$2,$3,1,$4,'د. فلان','تشخيص','{}'::jsonb,1200000,1,NOW(),$5) RETURNING id`,
    [patientId, caseId, caseType, DOCTOR, episodeId]);
  return r[0].id;
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries
              WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION},${OTHER}]))`);
  await q(`DELETE FROM journal_entries
            WHERE created_by = ANY(ARRAY[${MANAGER},${DOCTOR},${EXPERT},${RECEPTION},${OTHER}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec] of [
    [MANAGER, "branch_manager", "null"], [DOCTOR, "doctor", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "null"], [RECEPTION, "reception", "null"],
    [OTHER, "reception", "null"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$5,$6::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, medical_specialties=EXCLUDED.medical_specialties,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `sp_u${id}`, role, spec, id === OTHER ? 2 : 1, id === OTHER ? "[2]" : "[1]"]);
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

    // ══════════════════════════════════════════════════════════════════
    //  ٠. العقدُ الخالص — قبل أيّ قاعدةِ بيانات
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٠. عقدُ المسار (خالص) ──");
    same("١. القيمتان اثنتان لا ثالثة", [...SERVICE_PATHS], ["exam", "no_exam"]);
    same("٢. والمخترَعُ يُردّ",
      [isServicePath("exam"), isServicePath("no_exam"), isServicePath("maybe"), isServicePath(null)],
      [true, true, false, false]);
    same("٣. و`parseServicePath` تُنظّف إلى `null` ولا تُخمّن",
      [parseServicePath("exam"), parseServicePath(""), parseServicePath(undefined)],
      ["exam", null, null]);
    //  **ثلاثُ حالاتٍ لا اثنتان**: «لا يحتاج» ≠ «لا نعلم».
    same("٤. **و«لم تُسأل» حالةٌ ثالثةٌ صريحة**",
      [examRequirementOf("exam"), examRequirementOf("no_exam"), examRequirementOf(null)],
      ["required", "not_required", "legacy_rule"]);
    same("٥. **والمسارُ المسجَّل يعلو على القاعدة القديمة في الاتجاهين**",
      [
        operationNeedsExam({ servicePath: "exam", legacyRuleRequiresExam: false }),
        operationNeedsExam({ servicePath: "no_exam", legacyRuleRequiresExam: true }),
      ], [true, false]);
    same("٦. **وبلا مسارٍ تُقرأ القاعدةُ القديمة حرفاً — لا إعفاءَ مخترَع**",
      [
        operationNeedsExam({ servicePath: null, legacyRuleRequiresExam: true }),
        operationNeedsExam({ servicePath: null, legacyRuleRequiresExam: false }),
      ], [true, false]);

    // ══════════════════════════════════════════════════════════════════
    //  أ. التسجيل — بلا «جديد/قديم»، ومع رايةِ التاريخ السابق
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. التسجيل ──");
    const regBody = {
      name: `${MARK} تسجيلٌ جديد`, age: "33", height: "170", weight: "70",
      medicalCondition: "physiotherapy", isPhysiotherapy: true, isAmputee: false,
      referralSource: MARK, branchId: 1, phone: "07701110001",
    };
    const regA = await http("POST", "/api/patients", S.recv, regBody);
    check(regA.status === 200 || regA.status === 201,
      "٧. **(أ) التسجيلُ لا يسأل «جديد/قديم» ولا يُردّ بدونه**", String(regA.status));
    const pA = Number(regA.body?.id);
    const rowOf = async (id: number) => (await q(
      `SELECT patient_classification c, had_prior_center_history h FROM patients WHERE id=$1`,
      [id]))[0];
    same("٨. والخادمُ يختمه «جديد» — صدقاً وأماناً", (await rowOf(pA)).c, "new");
    same("٩. **(ب) ورايةُ التاريخ السابق `false` بلا تأشير**", (await rowOf(pA)).h, false);

    const regB = await http("POST", "/api/patients", S.recv, {
      ...regBody, name: `${MARK} سبق تعامله`, phone: "07701110002",
      hadPriorCenterHistory: true,
    });
    const pB = Number(regB.body?.id);
    same("١٠. **(ج) والتأشيرُ يُحفَظ كما قاله الموظّف**", (await rowOf(pB)).h, true);
    same("١١. **ولا يغيّر التصنيف** — واقعةٌ لا قرار", (await rowOf(pB)).c, "new");
    //  **(هـ) ولا يُشتقّ منها كيانٌ واحد.**
    same("١٢. **(هـ) ولا تُنشئ الرايةُ شيئاً**: لا حلقةَ ولا أمرَ ولا دفعةَ ولا معاينة",
      await footprintOf(pB),
      { episodes: 0, orders: 0, payments: 0, exams: 0, reviews: 0, visits: 0, followups: 0 });

    // ══════════════════════════════════════════════════════════════════
    //  ب. الرايةُ لا تُعفي من المعاينة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. الرايةُ لا تُعفي ──");
    {
      const p = await mkPatient("رايةٌ بلا إعفاء", { prior: true });
      await mkCase(p, "prosthetic");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
      same("١٣. الطلبُ يُفتَح", r.status, 201);
      const assign = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 1000000 });
      same("١٤. **(د) ومَن سبق تعاملُه ما زال يحتاج معاينةَ هذا الجهاز**",
        assign.status, 409);
      check(String(assign.body?.error ?? "").includes("بانتظار معاينة"),
        "   برسالةٍ تقول ذلك", JSON.stringify(assign.body));
      same("   **ولا أثرَ ماليّ**", await moneyOf(p), { total: 0, cost_entries: 0, orders: 0 });
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج. مريضٌ جديد — بمعاينة وبلا معاينة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. مريضٌ جديد ──");
    let noExamEpisode = 0, noExamPatient = 0;
    {
      const p = await mkPatient("جديد + معاينة");
      await mkCase(p, "prosthetic");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
      same("١٥. **(و) جديد + مسارُ المعاينة**", r.status, 201);
      same("   والمسارُ محفوظٌ على الحلقة", (await epRow(r.body?.id))?.service_path, "exam");
      same("   ويظهر في طابور الانتظار", (await pendingOf(S.recv, p)).pending, ["prosthetic"]);
      check(await worklistHas(p, "prosthetic"), "   وفي قائمة عمل الطبيب");
      same("   **ويُرسَل له طلبُ معاينةٍ كاملة**",
        (await q(`SELECT count(*)::int n FROM medical_review_requests
                   WHERE patient_id=$1 AND requested_path='full'`, [p]))[0].n, 1);
    }
    {
      const p = await mkPatient("جديد + بلا معاينة");
      await mkCase(p, "prosthetic");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "knee", servicePath: "no_exam" });
      same("١٦. **(ز) جديد + مسارٌ بلا معاينة**", r.status, 201);
      same("   والمسارُ محفوظٌ كما قيل", (await epRow(r.body?.id))?.service_path, "no_exam");
      same("   **ولا يظهر في الطابور** — لا الإلزاميّ ولا الهادئ",
        await pendingOf(S.recv, p), { pending: null, optional: null });
      check(!(await worklistHas(p, "prosthetic")),
        "   **ولا في قائمة عمل الطبيب** — لا تُغرَق بما لا قرارَ له فيه");
      same("   **ولا طلبَ مراجعةٍ يُخلَق**",
        (await q(`SELECT count(*)::int n FROM medical_review_requests WHERE patient_id=$1`, [p]))[0].n, 0);
      noExamEpisode = Number(r.body?.id); noExamPatient = p;
    }

    // ══════════════════════════════════════════════════════════════════
    //  د. **الحدُّ المؤقّت** — يُردّ قبل أيّ أثرٍ ماليّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الحدُّ المؤقّت لمسار «بلا معاينة» ──");
    {
      const before = await moneyOf(noExamPatient);
      const assign = await http("POST", `/api/patients/${noExamPatient}/assign-manufacturing`,
        S.recv, { expertUserId: EXPERT, serviceType: "prosthetic", cost: 750000 });
      same("١٧. **التخصيصُ يُردّ ٤٠٩**", assign.status, 409);
      same("   **برسالةٍ عربيةٍ تقول الحدَّ صراحةً**", assign.body?.error, NO_EXAM_PENDING_BOUNDARY);
      same("   **ولا يُلتفّ عليه ولو كان المريضُ «قديماً»**", before, { total: 0, cost_entries: 0, orders: 0 });
      same("   **ولا دينارَ ولا أمرَ ولا قيدَ بعد الردّ**",
        await moneyOf(noExamPatient), { total: 0, cost_entries: 0, orders: 0 });
      //  والبابُ الثاني (أمرُ تصنيعٍ مباشر) يقول الرسالةَ نفسَها لا «بعد المعاينة».
      const direct = await http("POST", "/api/manufacturing/orders", S.manager, {
        patientId: noExamPatient, expertUserId: EXPERT, serviceType: "prosthetic",
      });
      same("١٨. **وأمرُ التصنيع المباشر يُردّ بالرسالة نفسِها**",
        [direct.status, direct.body?.error], [409, NO_EXAM_PENDING_BOUNDARY]);
      same("   ولا أثرَ بعده كذلك",
        await moneyOf(noExamPatient), { total: 0, cost_entries: 0, orders: 0 });
      void noExamEpisode;
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ. **التصنيفُ لم يعد يحكم** — «قديم» بمسار معاينة، و«جديد» بلا
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. التصنيفُ لا يحكم العملية ──");
    {
      const p = await mkPatient("قديمٌ يطلب بمعاينة", { classification: "past" });
      await mkCase(p, "prosthetic");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
      same("١٩. **(ح) «مريض قديم» + مسارُ المعاينة ⟶ يُفحَص**", r.status, 201);
      same("   ويظهر في الطابور رغم تصنيفه", (await pendingOf(S.recv, p)).pending, ["prosthetic"]);
      check(await worklistHas(p, "prosthetic"), "   وفي قائمة عمل الطبيب رغم تصنيفه");
      const assign = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 900000 });
      same("٢٠. **والتخصيصُ يُردّ حتى تُوقَّع معاينةُ هذا الطلب**", assign.status, 409);
    }
    {
      const p = await mkPatient("قديمٌ يطلب بلا معاينة", { classification: "past" });
      await mkCase(p, "prosthetic");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "foot", servicePath: "no_exam" });
      same("٢١. **(ط) «قديم» + بلا معاينة ⟶ خارج الطابور**", r.status, 201);
      same("   لا إلزاميّ ولا هادئ", await pendingOf(S.recv, p), { pending: null, optional: null });
      check(!(await worklistHas(p, "prosthetic")), "   ولا في قائمة عمل الطبيب");
    }

    // ══════════════════════════════════════════════════════════════════
    //  و. المساندُ الطبية — التمييزُ نفسُه حرفاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. المساند الطبية ──");
    {
      const p = await mkPatient("مسندٌ بمعاينة", { support: true });
      await mkCase(p, "medical_support");
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "medical_support", servicePath: "exam" });
      same("٢٢. **(ي) المسندُ بمسار المعاينة**", r.status, 201);
      same("   ويظهر في طابوره", (await pendingOf(S.recv, p)).pending, ["medical_support"]);
      const p2 = await mkPatient("مسندٌ بلا معاينة", { support: true });
      await mkCase(p2, "medical_support");
      const r2 = await http("POST", `/api/patients/${p2}/device-episodes`, S.recv,
        { serviceType: "medical_support", servicePath: "no_exam" });
      same("٢٣. **والمسندُ بلا معاينة خارجَه**", r2.status, 201);
      same("   لا إلزاميّ ولا هادئ", await pendingOf(S.recv, p2), { pending: null, optional: null });
      check(!(await worklistHas(p2, "medical_support")), "   ولا في قائمة عمل الطبيب");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز. **العلاجُ الطبيعي معزولٌ تماماً**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. العلاج الطبيعي ──");
    {
      const p = await mkPatient("علاجٌ طبيعي", { physio: true });
      await mkCase(p, "physiotherapy");
      const bad = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "physiotherapy", servicePath: "exam" });
      same("٢٤. **(ك) لا حلقةَ جهازٍ للعلاج الطبيعي — ولا مسارَ يُسأل عنه**",
        [bad.status, bad.body?.error], [400, "نوع الجهاز غير صالح"]);
      same("   ولا صفَّ حلقةٍ وُلد",
        (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [p]))[0].n, 0);
      //  ومسارُه في الطابور كما كان: اختياريٌّ دائماً، بلا شارةٍ إلزامية.
      same("٢٥. **وطابورُه لم يتغيّر** — اختياريٌّ كما كان",
        await pendingOf(S.recv, p), { pending: null, optional: ["physiotherapy"] });
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح. **حلقةُ ما قبل ٠٦٥** — سلوكُها القديم حرفاً بحرف
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حلقةٌ بلا مسار (ما قبل ٠٦٥) ──");
    {
      const p = await mkPatient("حلقةٌ بلا مسار");
      const c = await mkCase(p, "prosthetic");
      const ep = await mkLegacyEpisode(p, c);
      same("٢٦. **(م) الصفُّ يقبل `NULL` — غيابُ سؤالٍ لا قيمةٌ ثالثة**",
        (await epRow(ep))?.service_path, null);
      same("٢٧. **ويبقى في الطابور كما كان** — الغيابُ ليس إعفاءً",
        (await pendingOf(S.recv, p)).pending, ["prosthetic"]);
      check(await worklistHas(p, "prosthetic"), "   وفي قائمة عمل الطبيب كما كان");
      const assign = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 800000 });
      same("٢٨. **والتخصيصُ يطلب معاينةَ هذا الطلب كما كان**", assign.status, 409);
      //  ...ويمرّ بمعاينةٍ موقّعةٍ عليه، تماماً كما كان قبل هذه المرحلة.
      await mkExam(p, c, ep);
      await q(`UPDATE patient_device_episodes SET status='examined' WHERE id=$1`, [ep]);
      const ok = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 800000 });
      check(ok.status === 200 || ok.status === 201,
        "٢٩. **وبمعاينةٍ موقّعةٍ عليه يمضي** — المسارُ القديم لم يُمَسّ",
        JSON.stringify({ s: ok.status, b: ok.body }));
    }
    //  والملفُّ القديم المصنَّف «قديم» بلا حلقةٍ أصلاً يبقى معفياً كما كان.
    {
      const p = await mkPatient("قديمٌ بلا حلقة", { classification: "past" });
      await mkCase(p, "prosthetic");
      const ok = await http("POST", `/api/patients/${p}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 700000 });
      check(ok.status === 200 || ok.status === 201,
        "٣٠. **والإعفاءُ التاريخيّ لخيطٍ بلا حلقةٍ باقٍ حرفاً**",
        JSON.stringify({ s: ok.status, b: ok.body }));
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط. التصنيفُ التاريخيّ يبقى مقروءاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. التصنيفُ التاريخيّ ──");
    {
      const past = await mkPatient("صفٌّ تاريخيّ قديم", { classification: "past" });
      const empty = await mkPatient("صفٌّ تاريخيّ فارغ", { classification: null });
      const list = await http("GET", "/api/patients", S.admin);
      const byId = (id: number) => (list.body ?? []).find((x: any) => Number(x.id) === id);
      same("٣١. **(ل) القيمُ التاريخية تُقرأ كما هي — لا تُمحى ولا تُخمَّن**",
        [byId(past)?.patientClassification, byId(empty)?.patientClassification], ["past", null]);
      same("٣٢. **وتعديلُها يبقى بابَ الإدارة**",
        (await http("PUT", `/api/patients/${empty}`, S.admin,
          { patientClassification: "past" })).status, 200);
      same("   والقيمةُ حُفظت",
        (await q(`SELECT patient_classification c FROM patients WHERE id=$1`, [empty]))[0].c, "past");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي. ما لم يتغيّر — الصلاحية، والتفرّد، والتسلسل، والتصنيف
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. ما لم يتغيّر ──");
    {
      const p = await mkPatient("ثوابتُ الحلقة");
      await mkCase(p, "prosthetic");
      same("٣٣. **(ن) وموظّفُ فرعٍ آخر يُردّ ٤٠٣ كما كان**",
        (await http("POST", `/api/patients/${p}/device-episodes`, S.otherBranch,
          { serviceType: "prosthetic", servicePath: "exam" })).status, 403);
      //  **(س) الصلاحيةُ لا تتوسّع بالمسار**: «لا» توجيهٌ لا قرارٌ سريريّ.
      const first = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "socket", servicePath: "no_exam" });
      same("٣٤. **(س) والاستقبالُ يختار المسار — ولا يكتسب صلاحيةً طبية**",
        first.status, 201);
      same("   ولا معاينةَ يقدر أن يكتبها",
        (await http("POST", `/api/medical/patients/${p}/exams`, S.recv,
          { caseType: "prosthetic", diagnosis: "x" })).status, 403);
      same("٣٥. **(ع) وحلقةٌ مفتوحةٌ واحدة لا اثنتان**",
        (await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: "prosthetic", requestedItem: "knee", servicePath: "exam" })).status, 409);
      //  **(ف) والتسلسلُ يتقدّم بعد الإلغاء — لا يُعاد استعمالُ رقم.**
      await http("POST", `/api/patients/${p}/device-episodes/${first.body?.id}/cancel`,
        S.manager, { reason: "اعتذر المريض" });
      const second = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "knee", servicePath: "exam" });
      same("٣٦. **(ف) والتسلسلُ سليم بعد الإلغاء**",
        [second.status, (await epRow(second.body?.id))?.sequence_number], [201, 2]);
      same("   **(ص) وتصنيفُ ما طُلب لم يتغيّر** — المخترَعُ يُردّ",
        (await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: "prosthetic", requestedItem: "elbow", servicePath: "exam" })).status, 400);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك. **المسارُ إلزاميٌّ على الكتابة الجديدة** — ولا يُخمَّن
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. المسارُ إلزاميّ ──");
    {
      const p = await mkPatient("مسارٌ ناقص");
      await mkCase(p, "prosthetic");
      const missing = await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "full_device" });
      same("٣٧. **الغيابُ يُردّ ٤٠٠ ولا يُقرأ افتراضاً في أيّ اتجاه**", missing.status, 400);
      check(String(missing.body?.error ?? "").includes("معاينة طبية"),
        "   برسالةٍ تسأل السؤالَ نفسَه", JSON.stringify(missing.body));
      same("٣٨. **والقيمةُ المخترَعة تُردّ كذلك**",
        (await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
          { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "maybe" })).status, 400);
      same("   **ولا صفَّ حلقةٍ وُلد من محاولةٍ مردودة**",
        (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [p]))[0].n, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ل. القاعدةُ تحرس القيمَ بنفسها
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. حراسةُ القاعدة ──");
    {
      const p = await mkPatient("قيدُ القاعدة");
      const c = await mkCase(p, "prosthetic");
      const ep = await mkLegacyEpisode(p, c);
      let rejected = false;
      try {
        await q(`UPDATE patient_device_episodes SET service_path='maybe' WHERE id=$1`, [ep]);
      } catch { rejected = true; }
      check(rejected, "٣٩. **قيمةٌ مخترَعة تُردّ في القاعدة لا في التطبيق وحده**");
      same("   والقيمتان تُقبلان",
        await (async () => {
          for (const v of SERVICE_PATHS) {
            await q(`UPDATE patient_device_episodes SET service_path=$2 WHERE id=$1`, [ep, v]);
          }
          await q(`UPDATE patient_device_episodes SET service_path=NULL WHERE id=$1`, [ep]);
          return (await epRow(ep))?.service_path ?? null;
        })(), null);
    }

    // ══════════════════════════════════════════════════════════════════
    //  م. حذفُ المريض كاملاً — القاعدةُ الملزمة في CLAUDE.md
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. حذفُ المريض ──");
    {
      const p = await mkPatient("حذفٌ كامل", { prior: true });
      await mkCase(p, "prosthetic");
      await http("POST", `/api/patients/${p}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "tube", servicePath: "no_exam" });
      const del = await http("DELETE", `/api/patients/${p}`, S.admin);
      check(del.status === 200 || del.status === 204,
        "٤٠. **حذفُ مريضٍ يحمل حلقةً بمسارٍ ينجح** — لا عمودَ جديد يكسر الكاسكيد",
        JSON.stringify({ s: del.status, b: del.body }));
      same("   ولا صفَّ يتيمٌ بقي",
        (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [p]))[0].n, 0);
    }
    // ══════════════════════════════════════════════════════════════════
    //  ن. **عقدُ الشاشات** — ما يراه الموظّفُ فعلاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. عقدُ الشاشات ──");
    {
      const read = (...parts: string[]) =>
        readFileSync(join(import.meta.dirname, "..", ...parts), "utf8");
      const create = read("client", "src", "pages", "CreatePatient.tsx");
      const edit = read("client", "src", "pages", "EditPatient.tsx");
      const modal = read("client", "src", "components", "NewDeviceEpisodeModal.tsx");

      check(!create.includes("select-patient-classification"),
        "٤١. **(أ) نموذجُ التسجيل لم يعد يسأل «جديد/قديم»**");
      check(!/name="patientClassification"/.test(create),
        "   ولا حقلَ تصنيفٍ فيه إطلاقاً");
      check(create.includes("checkbox-prior-center-history"),
        "٤٢. **(ب) وفيه مربّعُ «سبق أن تعامل مع المركز» وحده**");
      check(create.includes("PRIOR_CENTER_HISTORY_LABEL")
        && create.includes("PRIOR_CENTER_HISTORY_HINT"),
        "   بنصٍّ من المصدر المشترك لا مكتوبٍ مرّتين");

      //  **وبابُ التصحيح الإداريّ لم يُغلَق**: الصفوفُ التاريخية تحتاج مَن
      //  يصنّفها، والملفُّ يُصحَّح من «تعديل مريض» كما كان دائماً.
      check(/name="patientClassification"/.test(edit),
        "٤٣. **(ل) و«تعديل مريض» يبقى بابَ التصنيف التاريخيّ**");
      check(edit.includes("checkbox-prior-center-history"),
        "   وفيه مربّعُ التاريخ السابق كذلك — لرايةٍ بلا بابِ تصحيحٍ فخّ");

      check(modal.includes("select-service-path")
        && modal.includes("SERVICE_PATH_QUESTION"),
        "٤٤. **والسؤالُ يُطرَح عند فتح كلّ طلبِ جهاز**");
      check(modal.includes("SERVICE_PATH_HELP"),
        "   بالتلميح الذي طلبه المالك حرفاً");
      check(/servicePath: path/.test(modal),
        "٤٥. **وما يُرسَل هو ما اختاره الموظّف — لا قيمةٌ افتراضية**");
      check(/\|\| !path/.test(modal),
        "   ولا يُحفَظ الطلبُ قبل أن يُجاب");

      //  ══ **(ي) والعلاجُ الطبيعي معزولٌ في الشيفرة لا في النيّة** ══════
      for (const f of [
        ["client", "src", "components", "PhysioPlanDialog.tsx"],
        ["client", "src", "components", "PhysioPricingDialog.tsx"],
        ["shared", "pricing.ts"],
        ["server", "new_service", "store.ts"],
      ]) {
        const body = read(...f);
        check(!/service_path|servicePath|ServicePath/.test(body),
          `٤٦. **ولا أثرَ للمسار في ${f[f.length - 1]}** — العلاجُ الطبيعي لم يُمَسّ`);
      }
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION, OTHER]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[MANAGER, DOCTOR, EXPERT, RECEPTION, OTHER]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص المسار نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
