// التصحيحُ الإداريّ لعمليةِ جهازٍ خاطئة — حيّاً على Postgres وعلى النقاط.
// قاعدة محلّية: `npm run test:administrative-reversal`.
//
// ══ الواقعةُ التي وُلد لها (المريض «علي نزار» — شكلاً لا صفّاً) ══════════
// مريضُ أطرافٍ قديم عاد ليشتري **قالباً** — جزءاً لا طرفاً كاملاً. فرُدّ
// أوّلاً لنقصٍ في ملفّه (وهو ردٌّ صحيح، لكنّه ظهر JSON خاماً)، ثمّ تعجّل
// الموظّفُ وضغط «تم الشراء» قبل أن يكتمل المسارُ الصحيح. فوُلدت حالةٌ
// تجاريةٌ وتصنيعية، ثمّ رُدّ إلغاءُ المعاينة لأن بيعاً وقع — **وبقي الملفُّ
// محبوساً في خطأ بلا مخرج**.
//
// ══ ما يحرسه هذا الملفّ ═══════════════════════════════════════════════
// (أ) **التراجعُ عن الشراء وحده** يعيد ما قبل الضغطة ويُبقي المعاينة.
// (ب) **والإلغاءُ الكامل** يُبطل العمليةَ كلَّها ويفتح الطريقَ للطلب الصحيح.
// (ج) **ولا يُمحى تاريخ**: الدفعةُ والتسليمُ وسجلُّ التصنيع والمعاينةُ تبقى.
// (د) **والمالُ يُعكَس بقيدٍ معاكس** — والأصلُ لا يُمَسّ.
// (هـ) **والسلطةُ إدارية**: المسؤولُ مطلقاً، ومديرُ الفرع في فرعه، ولا أحدَ غيرهما.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import { readFileSync } from "fs";

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

const PORT = 6861;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-التصحيح-الإداري";
const ADMIN = 9901, RECV = 9902, MGR = 9903, DOC = 9904, EXPERT = 9905;
const ACCT = 9906, MGR_B2 = 9907, DOC_B2 = 9908, EXPERT_B2 = 9909;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT, ACCT, MGR_B2, DOC_B2, EXPERT_B2];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true },
  },
  mgrB2: {
    userId: MGR_B2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "مدير الفرع ٢", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {},
  },
  docB2: {
    userId: DOC_B2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. الفرع ٢", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  recvB2: {
    userId: MGR_B2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "مدير الفرع ٢", permissions: { canViewPatients: true, canAddPatients: true },
  },
  acct: {
    userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canAddPatients: true, canManageAccounting: true },
  },
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

/** مريضٌ كاملُ البيانات — فلا يُردّ لنقصٍ حين لا يكون النقصُ هو المُختبَر. */
async function mkPatient(label: string, branchId = 1, complete = true) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,$3,$4,$5,'بتر',$6,$7,true,false,0,'past') RETURNING id`,
    [`${MARK} ${label}`, MARK,
      complete ? "40" : "", complete ? "172" : "", complete ? "78" : "",
      complete ? "احادي - طرف سفلي - يمين - تحت الركبة" : "احادي - طرف سفلي - يمين",
      branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
async function signExam(patientId: number, deviceCost: number, session: any = S.doc) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", deviceCost, prescription: {},
  });
}
async function followupOf(patientId: number) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  const list = Array.isArray(r.body) ? r.body : [];
  return list[0] ?? null;
}
const examIdOf = async (patientId: number) =>
  (await q<{ id: number }>(
    `SELECT id FROM medical_exams WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`,
    [patientId]))[0]?.id ?? null;

/** الصورةُ الكاملة — كلُّ ما يجب أن يتّسق أو يبقى. */
async function shape(patientId: number) {
  const eps = await q(
    `SELECT id, sequence_number, status, agreed_cost::int AS cost, requested_item,
            admin_void_reversal_id, delivered_at
       FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const fus = await q(
    `SELECT id, status, device_episode_id, converted_work_order_id,
            approved_price::int AS price, closed_reason
       FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const wos = await q(
    `SELECT id, status, current_stage, device_episode_id, expert_user_id,
            admin_void_reversal_id, completed_at
       FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [c] = await q(
    `SELECT cost::int AS cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
    [patientId]);
  const entries = await q(
    `SELECT amount::int AS amount, source FROM cost_entries WHERE patient_id=$1 ORDER BY id`,
    [patientId]);
  const pays = await q(
    `SELECT id, amount::int AS amount FROM payments WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const exams = await q(
    `SELECT id, version FROM medical_exams WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const cancels = await q(
    `SELECT exam_id, reason FROM medical_exam_cancellations
      WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const revs = await q(
    `SELECT id, mode, financial_delta::int AS delta, requires_financial_settlement AS settle,
            preserved_paid_amount::int AS paid, reason_code
       FROM administrative_operation_reversals WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const hist = await q(
    `SELECT h.notes FROM prosthetic_work_history h
       JOIN prosthetic_work_orders w ON w.id = h.work_order_id
      WHERE w.patient_id=$1 ORDER BY h.id`, [patientId]);
  return { eps, fus, wos, total: p?.total ?? 0, caseCost: c?.cost ?? 0,
    entries, pays, exams, cancels, revs, hist };
}

/** يبني عمليةً مباعة: طلبٌ ⟶ معاينةٌ موقّعة ⟶ شراءٌ ⟶ أمرُ تصنيع. */
async function soldOperation(label: string, price: number, opts: {
  requestedItem?: string; branchId?: number;
} = {}) {
  const branchId = opts.branchId ?? 1;
  const patientId = await mkPatient(label, branchId);
  const caseId = await mkCase(patientId, branchId);
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR,
    requestedItem: (opts.requestedItem ?? "full_device") as any,
  });
  const episodeId = Number((ep as any).id ?? ep);
  const b2 = branchId !== 1;
  await signExam(patientId, price, b2 ? S.docB2 : S.doc);
  const f = await followupOf(patientId);
  const staff = b2 ? S.recvB2 : S.recv;
  await http("POST", `/api/followups/${f.id}/expert`, staff,
    { expertUserId: b2 ? EXPERT_B2 : EXPERT });
  const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, staff, {});
  const examId = await examIdOf(patientId);
  const [wo] = await q(
    `SELECT id FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`,
    [patientId]);
  return { patientId, caseId, episodeId, followupId: Number(f.id), examId,
    workOrderId: Number(wo?.id ?? 0), buy };
}

const preview = (target: any, session: any = S.admin) =>
  http("POST", "/api/admin/operation-reversal/preview", session, target);
/** ينفّذ كما يصل من الشاشة — بلا لمسٍ للجسم. للاختبارات السالبة. */
const executeRaw = (body: any, session: any = S.admin) =>
  http("POST", "/api/admin/operation-reversal/execute", session, body);
/**
 * ينفّذ **بعد مراجعة الأثر** — وهو المسارُ المؤسّسيّ الوحيد.
 *
 * الختمُ صار إلزامياً، فالمساعدُ يجلب المعاينةَ الحيّة ما لم يُمرَّر ختمٌ
 * صراحةً — فتبقى الاختباراتُ تصف نيّتَها لا آليّةَ العقد.
 */
async function execute(body: any, session: any = S.admin) {
  if (body?.stateStamp !== undefined) return await executeRaw(body, session);
  const pv = await preview({
    followupId: body?.followupId ?? null,
    workOrderId: body?.workOrderId ?? null,
    episodeId: body?.episodeId ?? null,
  }, S.admin);
  return await executeRaw({ ...body, stateStamp: pv.body?.stateStamp }, session);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [MGR, "branch_manager", "مدير الفرع", 1, "[]"],
    //  والعلاجُ الطبيعيّ معه: يلزم للبرهان السالب في (ي٢) — معاينةٌ سريريةٌ
    //  حقيقيّة لا عمليةَ جهازٍ لها، فلا يظهر عليها بابُ التصحيح.
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support","physiotherapy"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [ACCT, "accountant", "المحاسب", 1, "[]"],
    [MGR_B2, "branch_manager", "مدير الفرع ٢", 2, "[]"],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic","medical_support"]'],
    [EXPERT_B2, "prosthetics_expert", "خبير الفرع ٢", 2, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `ar_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session-b64"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══════════════════════════════════════════════════════════════════
    //  أ) **تراجعٌ عن الشراء وحده** — الضغطةُ الخاطئة قبل بدء العمل.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ) تراجع عن الشراء فقط ──");
    {
      const d = await soldOperation("تراجع عن الشراء", 750_000, { requestedItem: "socket" });
      same("١. (البيعُ وقع وأمرُ التصنيع فُتح)", d.buy.status, 200);
      const before = await shape(d.patientId);
      same("   (الحالُ قبل التصحيح)",
        [before.total, before.eps[0].status, before.fus[0].status, before.wos.length],
        [750_000, "in_manufacturing", "converted", 1]);

      const pv = await preview({ followupId: d.followupId });
      same("٢. **المعاينةُ المسبقة تقرأ العمليةَ كاملة**",
        [pv.status, pv.body?.saleAmount, pv.body?.paidAmount, pv.body?.availableModes],
        [200, 750_000, 0, ["purchase_only", "full_operation"]]);
      check(String(JSON.stringify(pv.body?.impact?.purchase_only)).includes("عكس كلفة 750,000"),
        "٣. **وتقول الأثرَ بالدينار قبل التنفيذ**",
        JSON.stringify(pv.body?.impact?.purchase_only));

      const r = await execute({
        followupId: d.followupId, mode: "purchase_only",
        reasonCode: "purchase_recorded_by_mistake",
        reasonNote: "ضُغط الشراء قبل إكمال المسار",
        stateStamp: pv.body?.stateStamp,
      });
      same("٤. **التراجعُ ينفَّذ**", r.status, 200);

      const s = await shape(d.patientId);
      same("٥. **أمرُ التصنيع أُلغي إدارياً** — ولا أمرَ ثانٍ",
        [s.wos.length, s.wos[0].status, s.wos[0].admin_void_reversal_id !== null],
        [1, "cancelled", true]);
      same("٦. **وسجلُّ الأمر باقٍ** — خبيرُه ومرحلتُه",
        [Number(s.wos[0].expert_user_id), s.wos[0].current_stage === before.wos[0].current_stage],
        [EXPERT, true]);
      same("٧. **والحلقةُ عادت «مُعايَنة»** — الطلبُ باقٍ ولم تُفتح ثانية",
        [s.eps.length, s.eps[0].status, s.eps[0].requested_item],
        [1, "examined", "socket"]);
      same("٨. **والمتابعةُ عادت «بانتظار قرار المريض»** — بلا رابط شراء",
        [s.fus[0].status, s.fus[0].converted_work_order_id],
        ["awaiting_patient_decision", null]);
      same("٩. **والسعرُ المعتمد باقٍ** — يُشترى لاحقاً بشكل صحيح",
        s.fus[0].price, 750_000);
      same("١٠. **والمعاينةُ فعّالة كما هي** — لا شاهدةَ إلغاء",
        [s.exams.length, s.cancels.length], [1, 0]);
      same("١١. **والكلفةُ عُكست بقيدٍ معاكس — والأصلُ باقٍ**",
        s.entries.map((e: any) => [e.amount, e.source]),
        [[750_000, "assign_manufacturing"], [-750_000, "administrative_reversal"]]);
      same("١٢. **ومجموعُ المريض وكلفةُ القسم رجعا بالضبط**",
        [s.total, s.caseCost], [0, 0]);
      same("١٣. **وصفُّ تصحيحٍ واحدٌ يجمع كلَّ ما تحرّك**",
        [s.revs.length, s.revs[0].mode, s.revs[0].delta, s.revs[0].settle],
        [1, "purchase_only", -750_000, false]);
      check(s.hist.some((h: any) => String(h.notes).includes("إلغاء إداري للعملية")),
        "١٤. **وسطرُ تاريخٍ على الأمر يقول ما جرى**", JSON.stringify(s.hist));

      //  **ويُشترى بعدها بشكل صحيح** — وهو الغرضُ من هذا الوضع.
      const again = await http("POST", `/api/followups/${d.followupId}/confirm-purchase`,
        S.recv, {});
      same("١٥. **ثمّ يُشترى الطلبُ نفسُه بشكل صحيح**", again.status, 200);
      const s2 = await shape(d.patientId);
      same("١٦. **بلا حلقةٍ ثانية ولا معاينةٍ ثانية**",
        [s2.eps.length, s2.exams.length, s2.fus.length], [1, 1, 1]);
      same("١٦-ب. **والمالُ عاد بالضبط** — الحلقةُ رجعت بسعرها لا بحالتها وحدها",
        [s2.total, Number(s2.eps[0].cost)], [750_000, 750_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب) **إلغاءُ العملية بالكامل** — واقعةُ «علي نزار» بشكلها.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب) إلغاء العملية بالكامل — ثمّ الطلب الصحيح ──");
    {
      //  مريضُ أطرافٍ قديم **بجهازٍ سُلِّم تاريخياً** — لا يُمَسّ.
      const patientId = await mkPatient("علي — شكلاً");
      const caseId = await mkCase(patientId);
      const oldEp = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes
           (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
            requested_item, created_at, delivered_at)
         VALUES ($1,$2,1,1,'delivered',2000000,'full_device',
                 NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years') RETURNING id`,
        [patientId, caseId]);
      const oldEpId = Number(oldEp[0].id);
      await q(`INSERT INTO prosthetic_work_orders
                 (patient_id, branch_id, expert_user_id, service_type, status, current_stage,
                  purpose, device_episode_id, assigned_by, created_at, completed_at)
               VALUES ($1,1,$2,'prosthetic','completed','delivery','initial_build',$3,$4,
                       NOW() - INTERVAL '2 years', NOW() - INTERVAL '2 years')`,
        [patientId, EXPERT, oldEpId, MGR]);

      //  واليومَ يريد **قالباً**، فيُفتح له طلبٌ خاطئ (طرفٌ كامل) ويُشترى.
      const ep = await episodes.startDeviceEpisode({
        patientId, serviceType: "prosthetic", createdBy: MGR, requestedItem: "full_device" as any,
      });
      const wrongEpId = Number((ep as any).id ?? ep);
      await signExam(patientId, 1_500_000);
      const f = await followupOf(patientId);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      same("١٧. (البيعُ الخاطئ وقع)",
        (await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {})).status, 200);
      const wrongExam = await examIdOf(patientId);
      const before = await shape(patientId);
      const wrongWo = Number(before.wos.find((w: any) =>
        Number(w.device_episode_id) === wrongEpId)?.id);

      //  **وإلغاءُ المعاينة بالباب الطبيعيّ يُردّ** — البيعُ وقع.
      const plainCancel = await http("POST", `/api/medical/exams/${wrongExam}/cancel`,
        S.admin, { reason: "خطأ" });
      same("١٨. **البابُ الطبيعيّ لإلغاء المعاينة يبقى بحُرّاسه** (٤٠٩)",
        plainCancel.status, 409);

      const pv = await preview({ followupId: f.id });
      same("١٩. (المعاينةُ المسبقة تقرأ البيعَ الخاطئ)", pv.body?.saleAmount, 1_500_000);
      const r = await execute({
        followupId: f.id, mode: "full_operation",
        reasonCode: "wrong_service_or_device",
        reasonNote: "المريض يريد قالباً لا طرفاً كاملاً",
        stateStamp: pv.body?.stateStamp,
      });
      same("٢٠. **الإلغاءُ الكامل ينفَّذ**", r.status, 200);

      const s = await shape(patientId);
      same("٢١. **المعاينةُ موجودةٌ فيزيائياً** — ولها شاهدةُ إلغاءٍ واحدة",
        [s.exams.length, s.cancels.length, Number(s.cancels[0].exam_id)],
        [1, 1, Number(wrongExam)]);
      check(String(s.cancels[0].reason).includes("إلغاء إداري للعملية"),
        "٢٢. **والشاهدةُ تقول سببَها الحقيقيّ**", String(s.cancels[0].reason));
      const wrongWoRow = s.wos.find((w: any) => Number(w.id) === wrongWo);
      same("٢٣. **الأمرُ الخاطئ أُلغي إدارياً وسجلُّه باقٍ**",
        [wrongWoRow?.status, wrongWoRow?.admin_void_reversal_id !== null],
        ["cancelled", true]);
      const wrongEpRow = s.eps.find((e: any) => Number(e.id) === wrongEpId);
      same("٢٤. **والحلقةُ الخاطئة ملغاة**",
        [wrongEpRow?.status, wrongEpRow?.admin_void_reversal_id !== null],
        ["cancelled", true]);
      same("٢٥. **والمتابعةُ طرفيّةٌ إدارية** — لا «مغلق بدون شراء»",
        [s.fus[0].status, s.fus[0].closed_reason], ["closed_admin_void", "admin_void"]);
      same("٢٦. **وقيدٌ سالبٌ واحد بالضبط**",
        s.entries.filter((e: any) => e.source === "administrative_reversal")
          .map((e: any) => e.amount), [-1_500_000]);
      same("٢٧. **ومجموعُ المريض رجع** — والجهازُ القديم لم يُمَسّ",
        [s.total, s.eps.find((e: any) => Number(e.id) === oldEpId)?.status,
          s.eps.find((e: any) => Number(e.id) === oldEpId)?.cost],
        [before.total - 1_500_000, "delivered", 2_000_000]);
      same("٢٨. **ولا دفعةَ حُذفت**", s.pays.length, 0);
      same("٢٩. **وهويّةٌ واحدة تجمع التصحيح**",
        [s.revs.length, s.revs[0].mode], [1, "full_operation"]);

      // ── ثمّ الطلبُ الصحيح: **قالب** ────────────────────────────────────
      const socket = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
        serviceType: "prosthetic", requestedItem: "socket",
      });
      check(socket.status < 300, "٣٠. **ويُفتح الطلبُ الصحيح فوراً — قالب**",
        JSON.stringify(socket.body));
      const s3 = await shape(patientId);
      const fresh = s3.eps.filter((e: any) =>
        Number(e.id) !== oldEpId && Number(e.id) !== wrongEpId);
      same("٣١. **حلقةٌ جديدةٌ بما طُلب فعلاً**",
        [fresh.length, fresh[0]?.requested_item, fresh[0]?.status],
        [1, "socket", "awaiting_exam"]);
      same("٣٢. **والجهازُ القديم المسلَّم باقٍ تاريخاً لا حاجزاً**",
        s3.eps.find((e: any) => Number(e.id) === oldEpId)?.status, "delivered");
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج) **تصنيعٌ تقدّم** — يُصحَّح، وسجلُّ التنفيذ يبقى.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج) تصنيعٌ تقدّم ──");
    {
      const d = await soldOperation("تصنيعٌ تقدّم", 900_000);
      await q(`UPDATE prosthetic_work_orders SET current_stage='casting', started_at=NOW()
                WHERE id=$1`, [d.workOrderId]);
      await q(`INSERT INTO prosthetic_work_history
                 (work_order_id, action_type, from_stage, to_stage, notes, performed_by)
               VALUES ($1,'stage_change','measurement','casting','تم القياس',$2)`,
        [d.workOrderId, EXPERT]);
      const pv = await preview({ workOrderId: d.workOrderId });
      check(JSON.stringify(pv.body?.impact?.full_operation).includes("بدأ العمل على هذا الأمر"),
        "٣٣. **المعاينةُ المسبقة تنبّه أن العمل بدأ** — ولا تمنع",
        JSON.stringify(pv.body?.impact?.full_operation));
      same("٣٤. **والتصحيحُ ينفَّذ رغم تقدّم العمل**",
        (await execute({
          workOrderId: d.workOrderId, mode: "full_operation",
          reasonCode: "work_order_created_by_mistake", reasonNote: "أمرٌ خاطئ",
          stateStamp: pv.body?.stateStamp,
        })).status, 200);
      const s = await shape(d.patientId);
      check(s.hist.some((h: any) => String(h.notes).includes("تم القياس")),
        "٣٥. **وسجلُّ التنفيذ باقٍ بحرفه**", JSON.stringify(s.hist));
      same("٣٦. (والمرحلةُ لم تُمحَ)", s.wos[0].current_stage, "casting");
    }

    // ══════════════════════════════════════════════════════════════════
    //  د) **جهازٌ سُلِّم** — التاريخُ لا يُعاد كتابتُه.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د) جهازٌ مسلَّم ──");
    {
      const d = await soldOperation("مسلَّم", 1_100_000);
      await q(`UPDATE prosthetic_work_orders SET status='completed', completed_at=NOW()
                WHERE id=$1`, [d.workOrderId]);
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW()
                WHERE id=$1`, [d.episodeId]);
      const pv = await preview({ followupId: d.followupId });
      check(JSON.stringify(pv.body?.impact?.full_operation).includes("مسجَّل كمسلَّم"),
        "٣٧. **التنبيهُ يقول إن الجهاز مسلَّم**",
        JSON.stringify(pv.body?.impact?.full_operation));
      same("٣٨. **والمسؤولُ يصحّح رغم التسليم** — لا يُقال له «لا يمكنك»",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "other", reasonNote: "تصحيح إداري",
          stateStamp: pv.body?.stateStamp,
        })).status, 200);
      const s = await shape(d.patientId);
      same("٣٩. **الأمرُ يبقى مكتملاً بختمه** — ويخرج بالوسم لا بالحالة",
        [s.wos[0].status, s.wos[0].completed_at !== null,
          s.wos[0].admin_void_reversal_id !== null],
        ["completed", true, true]);
      same("٤٠. **والحلقةُ تبقى مسلَّمةً بتاريخها**",
        [s.eps[0].status, s.eps[0].delivered_at !== null,
          s.eps[0].admin_void_reversal_id !== null],
        ["delivered", true, true]);
      same("٤١. **والمالُ عُكس مرّةً واحدة بالضبط**",
        s.entries.filter((e: any) => e.source === "administrative_reversal")
          .map((e: any) => e.amount), [-1_100_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ) **دفعةٌ قائمة** — تبقى، ويصير للمريض رصيدٌ يحتاج تسوية.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ) دفعةٌ محفوظة ورصيدٌ للمريض ──");
    {
      const d = await soldOperation("دفعةٌ محفوظة", 750_000);
      await q(`INSERT INTO payments (patient_id, branch_id, amount,
                 device_episode_id, case_id, notes)
               VALUES ($1,1,300000,$2,$3,'دفعة أولى')`,
        [d.patientId, d.episodeId, d.caseId]);
      const pv = await preview({ followupId: d.followupId });
      same("٤٢. **المعاينةُ المسبقة تقول الدفعةَ بالدينار**",
        [pv.body?.paidAmount, pv.body?.requiresFinancialSettlement], [300_000, true]);
      check(JSON.stringify(pv.body?.impact?.full_operation).includes("لم تُحذف"),
        "٤٣. **وتقول صراحةً إنها لن تُحذف**",
        JSON.stringify(pv.body?.impact?.full_operation));
      same("٤٤. (التصحيحُ ينفَّذ)",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "wrong_service_or_device", reasonNote: "خدمةٌ خاطئة",
          stateStamp: pv.body?.stateStamp,
        })).status, 200);
      const s = await shape(d.patientId);
      same("٤٥. **الدفعةُ باقيةٌ بحرفها** — ولا ردَّ اختُرع",
        [s.pays.length, s.pays[0].amount], [1, 300_000]);
      same("٤٦. **والكلفةُ عُكست فصار للمريض رصيد**",
        [s.total, s.pays[0].amount - s.total], [0, 300_000]);
      same("٤٧. **والتصحيحُ موسومٌ بأنه يحتاج تسوية مالية**",
        [s.revs[0].settle, s.revs[0].paid], [true, 300_000]);
      same("٤٨. **ولا قيدَ ردٍّ ولا دفعةَ سالبة**",
        s.entries.filter((e: any) => e.source === "administrative_reversal").length, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و) **مريضٌ بجهازين** — يُصحَّح المقصودُ وحده.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و) عزلُ الجهاز المقصود ──");
    {
      const d = await soldOperation("جهازان", 500_000);
      //  جهازٌ ثانٍ: يُسلَّم الأول ثمّ يُفتح الثاني ويُباع.
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW()
                WHERE id=$1`, [d.episodeId]);
      await q(`UPDATE prosthetic_work_orders SET status='completed', completed_at=NOW()
                WHERE id=$1`, [d.workOrderId]);
      const ep2 = await episodes.startDeviceEpisode({
        patientId: d.patientId, serviceType: "prosthetic", createdBy: MGR,
        requestedItem: "knee" as any,
      });
      const ep2Id = Number((ep2 as any).id ?? ep2);
      await signExam(d.patientId, 400_000);
      const all = await q(
        `SELECT id, device_episode_id FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`,
        [d.patientId]);
      const f2 = all.find((x: any) => Number(x.device_episode_id) === ep2Id);
      await http("POST", `/api/followups/${f2.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f2.id}/confirm-purchase`, S.recv, {});
      const before = await shape(d.patientId);

      same("٤٩. (جهازان: أولٌ مسلَّم وثانٍ مباع)",
        [before.eps.length, before.total], [2, 900_000]);
      same("٥٠. **تصحيحُ الثاني ينفَّذ**",
        (await execute({
          followupId: Number(f2.id), mode: "full_operation",
          reasonCode: "wrong_service_or_device", reasonNote: "ركبةٌ خاطئة",
        })).status, 200);
      const s = await shape(d.patientId);
      const first = s.eps.find((e: any) => Number(e.id) === d.episodeId);
      const second = s.eps.find((e: any) => Number(e.id) === ep2Id);
      same("٥١. **والأولُ لم يُمَسّ إطلاقاً**",
        [first?.status, first?.cost, first?.admin_void_reversal_id],
        ["delivered", 500_000, null]);
      same("٥٢. **والثاني وحدَه أُلغي**",
        [second?.status, second?.admin_void_reversal_id !== null], ["cancelled", true]);
      same("٥٣. **والمجموعُ نقص بسعر الثاني وحده**", s.total, 500_000);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز) **لا تصحيحان لعمليةٍ واحدة** — ولا قيدٌ سالبٌ ثانٍ.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز) لا تصحيح مرّتين ──");
    {
      const d = await soldOperation("تصحيحٌ مكرّر", 600_000);
      await execute({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "الأول",
      });
      const again = await execute({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "الثاني",
      });
      same("٥٤. **الثاني يُردّ ٤٠٩**", again.status, 409);
      check(String(again.body?.error ?? "").includes("ملغاة إدارياً بالفعل"),
        "٥٥. **برسالةٍ تقول إنها ملغاة**", String(again.body?.error));
      const s = await shape(d.patientId);
      same("٥٦. **ولا قيدَ سالبٌ ثانٍ ولا صفُّ تصحيحٍ ثانٍ**",
        [s.entries.filter((e: any) => e.source === "administrative_reversal").length,
          s.revs.length, s.total],
        [1, 1, 0]);
    }
    //  والضغطةُ المزدوجة المتزامنة كذلك.
    {
      const d = await soldOperation("ضغطتان", 300_000);
      const body = {
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "متزامن",
      };
      const [a, b] = await Promise.all([execute(body), execute(body)]);
      same("٥٧. **ضغطتان متزامنتان ⟶ واحدةٌ تنجح**",
        [a.status, b.status].sort((x, y) => x - y).map((s) => s === 200 ? "ok" : "refused"),
        ["ok", "refused"]);
      const s = await shape(d.patientId);
      same("٥٨. **وصفُّ تصحيحٍ واحد وقيدٌ واحد**",
        [s.revs.length, s.entries.filter((e: any) => e.source === "administrative_reversal").length],
        [1, 1]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح) **ختمٌ بائت ⟶ ٤٠٩** — لا كتابةَ فوق ما تغيّر.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح) ختمٌ بائت ──");
    {
      const d = await soldOperation("ختمٌ بائت", 800_000);
      const pv = await preview({ followupId: d.followupId });
      //  يتغيّر الملفُّ بعد فتح النافذة: دفعةٌ تُسجَّل.
      await q(`INSERT INTO payments (patient_id, branch_id, amount,
                 device_episode_id, case_id, notes)
               VALUES ($1,1,100000,$2,$3,'دفعة بعد المعاينة')`,
        [d.patientId, d.episodeId, d.caseId]);
      const stale = await execute({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "بختمٍ قديم",
        stateStamp: pv.body?.stateStamp,
      });
      same("٥٩. **التنفيذُ بختمٍ بائت يُردّ ٤٠٩**", stale.status, 409);
      check(String(stale.body?.error ?? "").includes("حدّث الصفحة"),
        "٦٠. **برسالةٍ تطلب تحديثَ الأثر**", String(stale.body?.error));
      const s = await shape(d.patientId);
      same("٦١. **ولا شيءَ تغيّر**", [s.revs.length, s.total, s.fus[0].status],
        [0, 800_000, "converted"]);
      //  وبختمٍ حديثٍ يمضي.
      const pv2 = await preview({ followupId: d.followupId });
      same("٦٢. **وبالأثر المحدَّث ينفَّذ**",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "other", reasonNote: "بعد التحديث",
          stateStamp: pv2.body?.stateStamp,
        })).status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط) **الصلاحية** — سلطةٌ إدارية لا سريرية ولا تنفيذية.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط) الصلاحية ──");
    {
      const d = await soldOperation("الصلاحية", 450_000);
      const body = {
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "محاولة",
      };
      for (const [who, sess] of [["الاستقبال", S.recv], ["المحاسب", S.acct],
        ["الخبير", S.expert], ["الطبيب الموقِّع", S.doc]] as any[]) {
        same(`٦٣. **${who} يُردّ ٤٠٣**`, (await execute(body, sess)).status, 403);
        same(`   (وحتى المعاينة المسبقة تُردّ عليه)`,
          (await preview({ followupId: d.followupId }, sess)).status, 403);
      }
      same("٦٤. **ومديرُ فرعٍ آخر يُردّ**",
        (await execute(body, S.mgrB2)).status, 403);
      const s = await shape(d.patientId);
      same("٦٥. **ولا شيءَ تحرّك بأيٍّ منها**",
        [s.revs.length, s.total], [0, 450_000]);
      same("٦٦. **ومديرُ الفرع نفسِه يمرّ**", (await execute(body, S.mgr)).status, 200);
    }
    {
      //  والمسؤولُ يصحّح في كلّ الفروع.
      const d = await soldOperation("فرعٌ آخر", 350_000, { branchId: 2 });
      same("٦٧. **والمسؤولُ العامّ يصحّح في أيّ فرع**",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "other", reasonNote: "عبر الفروع",
        }, S.admin)).status, 200);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز٢) **هويّةُ التصحيح صفقةٌ لا متابعةٌ مدى الحياة** — نقضُ القفل الأبديّ.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز٢) التصحيح يتبع الصفقة لا المتابعة ──");
    {
      const d = await soldOperation("صفقتان على متابعةٍ واحدة", 800_000);
      //  ① تراجعٌ عن الشراء الأول.
      same("٨٥. (تراجعٌ عن الشراء الأول)",
        (await execute({
          followupId: d.followupId, mode: "purchase_only",
          reasonCode: "purchase_recorded_by_mistake", reasonNote: "ضغطةٌ خاطئة",
        })).status, 200);
      //  ② ثمّ يُشترى **بشكلٍ صحيح** فيولد أمرٌ ثانٍ.
      same("٨٦. (ثمّ يُشترى بشكل صحيح فيولد أمرٌ ثانٍ)",
        (await http("POST", `/api/followups/${d.followupId}/confirm-purchase`,
          S.recv, {})).status, 200);
      const s1 = await shape(d.patientId);
      same("   (أمران: الأولُ ملغى والثاني حيّ)",
        [s1.wos.length, s1.wos[0].status, s1.wos[1].status],
        [2, "cancelled", "active"]);
      const wo2 = Number(s1.wos[1].id);

      //  ③ **والمعاينةُ المسبقة لا تقول «ملغاة» للصفقة الثانية**.
      const pv = await preview({ followupId: d.followupId });
      same("٨٧. **الصفقةُ الثانية ليست مصحَّحة** — التصحيحُ القديم لا يقفلها",
        [pv.body?.alreadyReversed, pv.body?.workOrderId], [false, wo2]);
      //  ④ وتصحيحُها ينفَّذ.
      same("٨٨. **وتصحيحُ الأمر الثاني ينفَّذ** — لا قفلَ أبديّ على المتابعة",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "other", reasonNote: "الثانية أيضاً خاطئة",
        })).status, 200);
      const s2 = await shape(d.patientId);
      same("٨٩. **وصفّا تصحيحٍ: واحدٌ لكلّ صفقة**",
        s2.revs.map((r: any) => [r.mode, r.delta]),
        [["purchase_only", -800_000], ["full_operation", -800_000]]);
      same("٩٠. **وقيدان سالبان — واحدٌ لكلّ بيعٍ وقع فعلاً**",
        [s2.entries.filter((e: any) => e.source === "administrative_reversal").length,
          s2.total],
        [2, 0]);
    }
    //  **وإبطالٌ كاملٌ بعد التراجع مباشرةً** — قبل إعادة الشراء.
    {
      const d = await soldOperation("إبطالٌ بعد التراجع", 500_000);
      await execute({
        followupId: d.followupId, mode: "purchase_only",
        reasonCode: "purchase_recorded_by_mistake", reasonNote: "ضغطةٌ خاطئة",
      });
      const mid = await shape(d.patientId);
      same("٩١. (المالُ رجع، والطلبُ قائمٌ بلا أمر)",
        [mid.total, mid.fus[0].status, mid.fus[0].converted_work_order_id],
        [0, "awaiting_patient_decision", null]);
      const pv = await preview({ followupId: d.followupId });
      same("٩٢. **ووضعُ التراجع لم يعد متاحاً** — لا بيعَ قائم",
        pv.body?.availableModes, ["full_operation"]);
      same("٩٣. **والإبطالُ الكامل ينفَّذ بعده** — الطلبُ نفسُه كان خطأً",
        (await execute({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "wrong_service_or_device", reasonNote: "الطلبُ نفسُه خاطئ",
        })).status, 200);
      const s = await shape(d.patientId);
      same("٩٤. **وبلا عكسٍ ماليٍّ ثانٍ** — البيعُ عُكس مرّةً واحدة",
        [s.entries.filter((e: any) => e.source === "administrative_reversal").length,
          s.revs[1].delta, s.total],
        [1, 0, 0]);
      same("٩٥. **والمعاينةُ سُحبت سلطتُها والحلقةُ أُلغيت**",
        [s.cancels.length, s.eps[0].status, s.fus[0].status],
        [1, "cancelled", "closed_admin_void"]);
    }
    //  **وتصحيحُ الأمر نفسِه مرّتين يُردّ** — والضغطتان المتزامنتان كذلك.
    {
      const d = await soldOperation("أمرٌ واحد مرّتين", 400_000);
      const pv = await preview({ workOrderId: d.workOrderId });
      await executeRaw({
        workOrderId: d.workOrderId, mode: "full_operation",
        reasonCode: "other", reasonNote: "الأول", stateStamp: pv.body?.stateStamp,
      });
      const again = await execute({
        workOrderId: d.workOrderId, mode: "full_operation",
        reasonCode: "other", reasonNote: "الثاني",
      });
      same("٩٦. **تصحيحُ الأمر نفسِه ثانيةً يُردّ ٤٠٩**", again.status, 409);
      const s = await shape(d.patientId);
      same("٩٧. **وصفٌّ واحدٌ وقيدٌ واحد**",
        [s.revs.length,
          s.entries.filter((e: any) => e.source === "administrative_reversal").length],
        [1, 1]);
    }
    {
      const d = await soldOperation("ضغطتان على أمرٍ واحد", 350_000);
      const pv = await preview({ workOrderId: d.workOrderId });
      const body = {
        workOrderId: d.workOrderId, mode: "full_operation",
        reasonCode: "other", reasonNote: "متزامن", stateStamp: pv.body?.stateStamp,
      };
      const [a, b] = await Promise.all([executeRaw(body), executeRaw(body)]);
      same("٩٨. **وضغطتان متزامنتان على الأمر نفسِه ⟶ واحدةٌ تنجح**",
        [a.status, b.status].sort((x, y) => x - y).map((c) => c === 200 ? "ok" : "refused"),
        ["ok", "refused"]);
      const s = await shape(d.patientId);
      same("٩٩. **بصفٍّ واحدٍ وقيدٍ واحد** — يحسمه فهرسُ القاعدة",
        [s.revs.length,
          s.entries.filter((e: any) => e.source === "administrative_reversal").length],
        [1, 1]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ح٢) **المسلَّمُ لا يقبل «تراجعاً عن الشراء»** — وضعٌ يستحيل معناه.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح٢) المسلَّم: إلغاءٌ كاملٌ لا تراجعٌ عن شراء ──");
    {
      const d = await soldOperation("مسلَّمٌ ووضعٌ واحد", 950_000);
      await q(`UPDATE prosthetic_work_orders SET status='completed', completed_at=NOW()
                WHERE id=$1`, [d.workOrderId]);
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW()
                WHERE id=$1`, [d.episodeId]);
      const pv = await preview({ followupId: d.followupId });
      same("١٠٠. **وضعٌ واحدٌ يُعرَض للمسلَّم**",
        pv.body?.availableModes, ["full_operation"]);
      //  **والخادمُ يفرضها ولو صُنع الطلبُ بيد** — لا يُنفَّذ نصفُه.
      const crafted = await executeRaw({
        followupId: d.followupId, mode: "purchase_only",
        reasonCode: "other", reasonNote: "طلبٌ مصنوع",
        stateStamp: pv.body?.stateStamp,
      });
      same("١٠١. **وطلبٌ مصنوعٌ بـ«تراجع عن الشراء» يُردّ ٤٠٩**", crafted.status, 409);
      check(String(crafted.body?.error ?? "").includes("سُلّم أو انتهى أمره"),
        "١٠٢. **برسالةٍ تدلّ على الوضع الصحيح**", String(crafted.body?.error));
      const s = await shape(d.patientId);
      same("١٠٣. **ولا شيءَ تغيّر** — لا نصفَ تصحيح",
        [s.revs.length, s.total, s.eps[0].status, s.wos[0].status],
        [0, 950_000, "delivered", "completed"]);
    }
    //  **وتغيّرُ الحلقة بين المعاينة والتنفيذ ⟶ لا تصحيحَ نصفيّ**.
    {
      const d = await soldOperation("تغيّرت الحلقة", 700_000);
      const pv = await preview({ followupId: d.followupId });
      same("١٠٤. (وضعان متاحان قبل التسليم)",
        pv.body?.availableModes, ["purchase_only", "full_operation"]);
      //  يُسلَّم الجهازُ بعد فتح النافذة.
      await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW()
                WHERE id=$1`, [d.episodeId]);
      await q(`UPDATE prosthetic_work_orders SET status='completed', completed_at=NOW()
                WHERE id=$1`, [d.workOrderId]);
      const stale = await executeRaw({
        followupId: d.followupId, mode: "purchase_only",
        reasonCode: "other", reasonNote: "بأثرٍ بائت",
        stateStamp: pv.body?.stateStamp,
      });
      check(stale.status === 409, "١٠٥. **التنفيذُ على حالٍ تغيّرت يُردّ ٤٠٩**",
        String(stale.status));
      const s = await shape(d.patientId);
      same("١٠٦. **ولا صفَّ تصحيحٍ ولا قيدَ ولا حالةً تحرّكت**",
        [s.revs.length, s.total, s.eps[0].status, s.wos[0].status],
        [0, 700_000, "delivered", "completed"]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ط٢) **الإذنُ والختمُ يُفرَضان داخل المعاملة**.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط٢) الإذن تحت القفل والختم الإلزاميّ ──");
    {
      const d = await soldOperation("نقلُ الفرع", 600_000);
      const pv = await preview({ followupId: d.followupId }, S.mgr);
      same("١٠٧. (مديرُ الفرع يقرأ الأثر في فرعه)", pv.status, 200);
      //  يُنقَل المريضُ إلى فرعٍ آخر **بعد** فتح النافذة.
      await q(`UPDATE patients SET branch_id=2 WHERE id=$1`, [d.patientId]);
      const moved = await executeRaw({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "بعد النقل", stateStamp: pv.body?.stateStamp,
      }, S.mgr);
      same("١٠٨. **ومديرُ الفرع يُردّ ٤٠٣ بعد نقل المريض** — الفحصُ تحت القفل",
        moved.status, 403);
      const s = await shape(d.patientId);
      same("١٠٩. **ولا شيءَ تغيّر**", [s.revs.length, s.total], [0, 600_000]);
      //  والمسؤولُ يمرّ على الحال نفسِها.
      const pv2 = await preview({ followupId: d.followupId }, S.admin);
      same("١١٠. **والمسؤولُ العامّ يمرّ** — سلطتُه في كلّ الفروع",
        (await executeRaw({
          followupId: d.followupId, mode: "full_operation",
          reasonCode: "other", reasonNote: "المسؤول", stateStamp: pv2.body?.stateStamp,
        }, S.admin)).status, 200);
    }
    {
      const d = await soldOperation("بلا ختم", 550_000);
      const noStamp = await executeRaw({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "بلا مراجعة",
      });
      same("١١١. **وتنفيذٌ بلا ختمٍ يُردّ ٤٠٠**", noStamp.status, 400);
      check(String(noStamp.body?.error ?? "").includes("أعد فتح نافذة التصحيح"),
        "١١٢. **برسالةٍ تطلب مراجعةَ الأثر أوّلاً**", String(noStamp.body?.error));
      const empty = await executeRaw({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "ختمٌ فارغ", stateStamp: "",
      });
      same("١١٣. **وختمٌ فارغ كذلك**", empty.status, 400);
      const s = await shape(d.patientId);
      same("١١٤. **ولا كتابةَ واحدة**", [s.revs.length, s.total], [0, 550_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي) **بيانات المريض الناقصة** — الحراسةُ تبقى، والردُّ يصير مفهوماً.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي) الملفّ الناقص ──");
    {
      const p = await mkPatient("ملفٌّ ناقص", 1, false);
      await mkCase(p);
      const r = await http("POST", `/api/patients/${p}/device-episodes`, S.recv, {
        serviceType: "prosthetic", requestedItem: "socket",
      });
      same("٦٨. **الحراسةُ لم تُضعَف** — الملفُّ الناقص يُردّ ٤٠٠", r.status, 400);
      check(Array.isArray(r.body?.missing) && r.body.missing.includes("amputationLevel"),
        "٦٩. **والردُّ منظَّمٌ تقرؤه الشاشة** — لا نصٌّ حرّ",
        JSON.stringify(r.body));
      same("٧٠. **ولا حلقةَ فُتحت**",
        (await q(`SELECT count(*)::int AS n FROM patient_device_episodes WHERE patient_id=$1`,
          [p]))[0].n, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ي٢) **بابُ بطاقة المعاينة** — والخادمُ هو مَن يقول متى يُفتَح.
    //
    //  البطاقةُ أحدُ الأبواب الثلاثة، **لكنّ معاينةً سريريةً ليست عمليةَ
    //  جهاز**. فالشرطُ ليس دورَ الناظر بل **وجودُ المتابعة** — الرابطُ
    //  الذي كتبه التوقيعُ نفسُه، لا قرينةٌ تُخمَّن في الشاشة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي٢) بابُ بطاقة المعاينة ──");
    {
      const d = await soldOperation("بابُ المعاينة", 400_000);
      const r = await http("GET", `/api/medical/patients/${d.patientId}/exams`, S.admin);
      same("١١٥. (نقطةُ المعاينات تستجيب)", r.status, 200);
      const exam = (r.body?.exams ?? []).find((e: any) => Number(e.id) === d.examId);
      check(!!exam, "١١٦. (معاينةُ الجهاز موجودة)", JSON.stringify(r.body?.exams ?? []));
      same("١١٧. **ومعاينةُ الجهاز تحمل هويّةَ عمليتها**",
        Number(exam?.reversalFollowupId), d.followupId);

      //  **والهويّةُ تفتح النافذةَ فعلاً** — لا رقمٌ يُعرَض ولا يُقبَل.
      const pv = await preview({ followupId: exam?.reversalFollowupId }, S.admin);
      same("١١٨. **وبها تُقرأ العمليةُ نفسُها بلا نقطةٍ ثانية**",
        [pv.status, Number(pv.body?.workOrderId)], [200, d.workOrderId]);

      //  ومعاينةٌ سريريةٌ بلا عمليةِ جهاز ⟶ لا زرَّ عليها إطلاقاً.
      const phys = await mkPatient("معاينةٌ سريرية", 1);
      await q(`UPDATE patients SET is_physiotherapy=true, is_amputee=false WHERE id=$1`, [phys]);
      await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, status, cost)
               VALUES ($1, 1, 'physiotherapy', 'active', 0)`, [phys]);
      const signed = await http("POST", `/api/medical/patients/${phys}/exams`, S.doc, {
        caseType: "physiotherapy", chiefComplaint: "ألم", clinicalFindings: "—",
        diagnosis: "—", plan: "—",
      });
      same("١١٩. (معاينةُ علاجٍ طبيعي وُقّعت)", signed.status < 300, true);
      const pr = await http("GET", `/api/medical/patients/${phys}/exams`, S.admin);
      same("١٢٠. **ومعاينةُ العلاج الطبيعي بلا عملية** — فلا بابَ عليها",
        (pr.body?.exams ?? []).map((e: any) => e.reversalFollowupId), [null]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ك) **الحذفُ الكامل ما زال يعمل** — القاعدة الملزمة في CLAUDE.md.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك) كاسكيد حذف المريض ──");
    {
      const d = await soldOperation("للحذف", 250_000);
      await execute({
        followupId: d.followupId, mode: "full_operation",
        reasonCode: "other", reasonNote: "قبل الحذف",
      });
      same("٧١. (صفُّ تصحيحٍ موجود)",
        (await q(`SELECT count(*)::int AS n FROM administrative_operation_reversals
                   WHERE patient_id=$1`, [d.patientId]))[0].n, 1);
      const del = await http("DELETE", `/api/patients/${d.patientId}`, S.admin);
      same("٧٢. **حذفُ مريضٍ له تصحيحٌ إداريّ ينجح**", del.status < 300, true);
      same("٧٣. **ولا صفَّ تصحيحٍ يتيمٌ بقي**",
        (await q(`SELECT count(*)::int AS n FROM administrative_operation_reversals
                   WHERE patient_id=$1`, [d.patientId]))[0].n, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ل) **عقدُ الشاشة** — بلا قاعدة بيانات.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل) عقد الشاشة ──");
    {
      //  التعليقاتُ **ومساراتُ الاستيراد** خارج الفحص: لا يراهما موظّف،
      //  واسمُ الوحدة `@shared/administrative_reversal` مسارُ ملفٍّ لا نصٌّ
      //  يُعرَض. والمقصودُ ما يُرسَم على الشاشة.
      const strip = (s: string) =>
        s.split("\n")
          .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
          .filter((l) => !/^\s*(import\b|\}\s*from\s*")/.test(l))
          .join("\n");
      const dlg = strip(readFileSync(
        "client/src/components/AdministrativeReversalDialog.tsx", "utf8"));
      check(dlg.includes("تصحيح / إلغاء العملية"),
        "٧٤. **العنوانُ المؤسّسيّ لا «حذف»**", "");
      check(dlg.includes("تأكيد التصحيح") && !/window\.confirm|[^.]\bconfirm\(/.test(dlg),
        "٧٥. **وتأكيدٌ في نافذةٍ لا `confirm()` المتصفّح**", "");
      check(dlg.includes("سبب التصحيح"),
        "٧٦. **والسببُ إلزاميٌّ بحقله**", "");
      check(dlg.includes("operation-reversal/preview") && dlg.includes("operation-reversal/execute"),
        "٧٧. **والأثرُ يُقرأ من الخادم لا يُستنتَج**", "");
      //  **المفتاحُ الداخليّ لا يُعرَض** — والفحصُ على ما يُرسَم لا على ذكرِ
      //  الاسم: مقارنةٌ (`mode === "purchase_only"`) و`data-testid` لا
      //  يراهما الموظّف، وحقنُ `{mode}` نصّاً هو ما يراه.
      check(!/administrative_reversal|closed_admin_void/.test(dlg),
        "٧٨-أ. **ولا اسمَ حدثٍ ولا حالةٍ داخلية في الشاشة إطلاقاً**", "");
      check(!/>\s*\{\s*(mode|reasonCode|m|c)\s*\}\s*</.test(dlg),
        "٧٨-ب. **ولا مفتاحٌ يُحقَن نصّاً** — العناوينُ من جداول الترجمة", "");
      check(dlg.includes("REVERSAL_MODE_LABELS[m]")
        && dlg.includes("REVERSAL_REASON_LABELS[c]"),
      "٧٨-ج. **وما يُعرَض يأتي من العقد المشترك**", "");

      const req = strip(readFileSync(
        "client/src/components/RequiredPatientDataDialog.tsx", "utf8"));
      check(req.includes("ملف المريض يحتاج استكمال"),
        "٧٩. **ونافذةُ الملفّ الناقص بعنوانها**", "");
      check(req.includes("إكمال البيانات الآن"),
        "٨٠. **وزرُّها يفتح تعديلَ المريض**", "");
      check(!req.includes("amputationLevel") && !req.includes("HTTP 400"),
        "٨١. **ولا اسمَ حقلٍ إنجليزيّ ولا رمزَ حالة يصل الشاشة**", "");
      check(req.includes("FIELD_LABELS") || req.includes("fieldLabel"),
        "٨٢. **والعناوينُ من المصدر المشترك**", "");

      const modal = strip(readFileSync("client/src/components/NewDeviceEpisodeModal.tsx", "utf8"));
      check(modal.includes("RequiredPatientDataDialog"),
        "٨٣. **ونافذةُ الجهاز الجديد تعرضها بدل الـJSON**", "");
      //  ══ **الاختيارُ يبقى — لكن ليس في النافذة** ═══════════════════════
      //  «إكمال البيانات الآن» يغيّر المسارَ إلى شاشة تعديل المريض، فتُفكَّك
      //  النافذةُ والموزِّعُ والصفحةُ معاً. فحالةٌ محلّية هنا وعدٌ يموت مع
      //  أوّل تغيّرِ مسار — وقد كان يموت فعلاً.
      //
      //  فالنافذةُ **تُسلّم** اختيارَها إلى مالكِ الحالة و**تُملأ** منه،
      //  والحفظُ في `sessionStorage` عند الموزِّع. وتفصيلُ المنطق مُختبَرٌ
      //  حيّاً في `npm run test:device-flow-resume`.
      check(modal.includes("onEditPatient(item)"),
        "٨٤. **وتسلّم اختيارَ الموظّف إلى مَن يبقى بعد تغيّر المسار**", "");
      check(modal.includes("initialRequestedItem"),
        "٨٤-ب. **وتُملأ منه عند العودة**", "");
      const launcher = strip(readFileSync("client/src/components/PatientServiceLauncher.tsx", "utf8"));
      check(launcher.includes("saveDeviceFlowResume")
        && launcher.includes("takeDeviceFlowResume")
        && /setLocation\(`\/patients\/\$\{patient\.id\}\/edit/.test(launcher),
      "٨٤-ج. **والموزِّعُ يحفظ ويفتح شاشةَ التعديل القائمة ثمّ يستأنف**", "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
