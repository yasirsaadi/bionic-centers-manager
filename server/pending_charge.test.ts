// **المراجعةُ المالية لعملياتِ «بلا معاينة»** — حيّاً على Postgres وعلى
// النقاط الحقيقية. قاعدة محلّية: `npm run test:pending-charge`.
//
// ══ الثابتُ الذي يحرسه ═════════════════════════════════════════════════════
// **العمليةُ تمضي. والمالُ لا يدخل المحاسبة حتى يعتمده طبيبٌ مخوَّل.**
//
// وما يُثبته هنا، بندَ بندٍ (أ–أح):
//   • قبلَ الاعتماد: `patients.total_cost` و`patient_cases.cost` و
//     `cost_entries` و`payments` و`journal_lines` **صفرٌ حرفياً**.
//   • وبعدَه: تتحرّك كلُّها **مرّةً واحدة بالضبط** بالكاتب القانونيّ نفسِه.
//   • والإعادةُ لا تحذف عمليةً ولا تحرّك ديناراً، والسببُ إلزاميّ.
//   • والمُعادُ يُصحَّح على **الصفّ نفسِه** ويعود إلى مراجعة الطبيب.
//   • وأهليّةُ المراجعة **اختصاصٌ × فرع** تُقرأ من القاعدة عند كلّ طلب.
//   • وضغطتان متزامنتان تُنتجان **قيدَ كلفةٍ واحداً**.
//   • وحذفُ المريض الكامل ودمجُ ملفّين يعملان (القاعدةُ الملزمة في CLAUDE.md).

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  parsePendingAmount, canOperateNoExam, canCorrectReturned, mayReviewShape,
  isEditableByReception, isTerminalCharge, PENDING_CHARGE_STATUSES,
  PENDING_CHARGE_STATUS_LABELS, PENDING_CHARGE_ACTIONS, REVIEW_QUEUE_TITLE,
  RETURNED_QUEUE_TITLE,
} from "@shared/pending_charge";
import { NO_EXAM_PENDING_BOUNDARY } from "@shared/service_path";
import { NO_EXAM_FULL_PROSTHESIS_REFUSAL } from "@shared/prosthetic_parts";
import {
  DEVICE_ORIGINS, DEVICE_ORIGIN_LABELS, isDeviceOrigin, originHasEpisode,
  parseDeviceOrigin,
} from "@shared/device_origin";

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

const PORT = 6853;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-بلا-معاينة";
const ADMIN = 9931, MANAGER = 9932, DOC = 9933, DOCSUP = 9934, DOCPHYS = 9935;
const RECV = 9936, RECV2 = 9937, EXPERT = 9938, ACC = 9939, EXPERT2 = 9940;
const USERS = [ADMIN, MANAGER, DOC, DOCSUP, DOCPHYS, RECV, RECV2, EXPERT, ACC, EXPERT2];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true },
  },
  /** طبيبُ أطرافٍ ومساند في الفرع ١. */
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "سعد",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  /** طبيبُ مساندَ وحدها — لا يراجع مبلغَ أطراف. */
  docSup: {
    userId: DOCSUP, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ليلى",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  /** طبيبُ علاجٍ طبيعي — لا يراجع جهازاً إطلاقاً. */
  docPhys: {
    userId: DOCPHYS, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "أمير",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  /** طبيبُ أطرافٍ في **فرعٍ آخر** — الاختصاصُ يصحّ والفرعُ لا. */
  docOther: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "سعد",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  /** زميلٌ في الفرع نفسِه — يصحّح ما أعاده الطبيبُ ولو غاب صاحبُه. */
  recv2: {
    userId: RECV2, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "زهراء",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  /** استقبالُ فرعٍ آخر — لا يصحّح عمليةَ فرعٍ ليس له. */
  recvOther: {
    userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "زهراء",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  acc: {
    userId: ACC, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canManageAccounting: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير",
    permissions: { canViewPatients: true, canWorkAsExpert: true },
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, opts: { support?: boolean; branch?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $5,$3,$4,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, opts.support !== true, opts.support === true,
      opts.branch ?? 1]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType = "prosthetic", branch = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$3,$2,0,'manual','active') RETURNING id`, [patientId, caseType, branch]);
  return r[0].id;
}

/** طلبُ جهازٍ على **مسار «بلا معاينة»** — البابُ الحقيقي (ترحيل ٠٦٥). */
const startNoExam = (patientId: number, serviceType = "prosthetic", item = "socket",
  session: any = S.recv) =>
  http("POST", `/api/patients/${patientId}/device-episodes`, session,
    { serviceType, requestedItem: item, servicePath: "no_exam" });

const startExamPath = (patientId: number, serviceType = "prosthetic", item = "full_device") =>
  http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { serviceType, requestedItem: item, servicePath: "exam" });

const sale = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/device-sale", session, body);
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, body);

/**
 * **الثابتُ المحاسبيّ** — كلُّ ما يُفترَض أن يبقى صفراً قبل الاعتماد.
 *
 * ولا يُقاس بحقلٍ واحد: مسارٌ ينسى `cost_entries` ويكتب `total_cost` يكذب
 * على الدفتر بالضبط كما يكذب العكس.
 */
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE patient_id=$1) AS paid,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payment_rows,
      (SELECT count(*)::int FROM journal_lines WHERE patient_id=$1) AS journal_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM service_discount_requests WHERE patient_id=$1) AS discounts,
      (SELECT count(*)::int FROM medical_exams WHERE patient_id=$1) AS exams,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}

/**
 * **الثابتُ قبل الاعتماد — والعملُ ليس منه.**
 *
 * أمرُ التصنيع يُفتَح لحظةَ تسجيل العملية (**العمليةُ تمضي**)، فلا يُقاس
 * ضمن ما يجب أن يبقى صفراً. والمقياسُ هو المالُ وحده.
 */
async function moneyOnly(patientId: number) {
  const m = await moneyOf(patientId);
  return {
    total: m.total, case_cost: m.case_cost, ledger: m.ledger,
    ledger_rows: m.ledger_rows, paid: m.paid, payment_rows: m.payment_rows,
    journal_rows: m.journal_rows, discounts: m.discounts, exams: m.exams,
    reviews: m.reviews,
  };
}
const ZERO_MONEY_ONLY = {
  total: 0, case_cost: 0, ledger: 0, ledger_rows: 0, paid: 0, payment_rows: 0,
  journal_rows: 0, discounts: 0, exams: 0, reviews: 0,
};

const orderOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, branch_id::int b, service_type st,
      purpose, status, device_episode_id::int de, expert_user_id::int ex,
      maintenance_component mc, device_origin origin,
      no_exam_no_charge nocharge, admin_void_reversal_id voided
    FROM prosthetic_work_orders WHERE id=$1`, [id]);
  return r ?? null;
};
const historyCount = (workOrderId: number) =>
  q(`SELECT count(*)::int n FROM prosthetic_work_history WHERE work_order_id=$1`,
    [workOrderId]).then((r) => r[0].n);
const ZERO_MONEY = {
  total: 0, case_cost: 0, ledger: 0, ledger_rows: 0, paid: 0, payment_rows: 0,
  journal_rows: 0, orders: 0, discounts: 0, exams: 0, reviews: 0,
};

async function chargeRow(id: number) {
  const [r] = await q(`SELECT status, amount::int amount, applied_at, reviewed_by,
      returned_by, return_reason, applied_work_order_id, work_order_id,
      device_episode_id, sale_expert_user_id, device_origin origin, operation_kind,
      requested_item, maintenance_component, case_id
    FROM pending_service_charges WHERE id=$1`, [id]);
  return r ?? null;
}
const eventsOf = (id: number) =>
  q(`SELECT event_type, from_status, to_status, reason, payload FROM
       pending_service_charge_events WHERE charge_id=$1 ORDER BY id`, [id]);
const episodeOf = async (id: number) => {
  const [r] = await q(`SELECT status, service_path, requested_item FROM
    patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
};

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM pending_service_charge_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  //  **الأسماءُ المستعارة قبل الصفّ نفسِه**: الدمجُ يكتب صفَّ اسمٍ مستعار
  //  على الملفّ الهدف، فحذفُ المريض قبله يصطدم بمفتاحه.
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name, branch] of [
    [ADMIN, "admin", "null", "المسؤول", 1],
    [MANAGER, "branch_manager", "null", "مدير الفرع", 1],
    [DOC, "doctor", '["prosthetic","medical_support"]', "سعد", 1],
    [DOCSUP, "doctor", '["medical_support"]', "ليلى", 1],
    [DOCPHYS, "doctor", '["physiotherapy"]', "أمير", 1],
    [RECV, "reception", "null", "ريام", 1],
    [RECV2, "reception", "null", "زهراء", 1],
    [EXPERT, "prosthetics_expert", "null", "الخبير", 1],
    [EXPERT2, "prosthetics_expert", "null", "الخبير الثاني", 1],
    [ACC, "accountant", "null", "المحاسب", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$5,$3,$6,'[1,2]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               medical_specialties=EXCLUDED.medical_specialties,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `pc_u${id}`, role, spec, name, branch]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
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
    //  العقدُ الخالص — بلا قاعدة بيانات
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٠. العقدُ الخالص ──");
    same("حالاتٌ ثلاثٌ لا أكثر", [...PENDING_CHARGE_STATUSES],
      ["pending_review", "returned", "approved"]);
    same("وفعلان لا ثالث", [...PENDING_CHARGE_ACTIONS], ["approve", "return"]);
    same("وعناوينُها بالعربية",
      PENDING_CHARGE_STATUSES.map((s) => PENDING_CHARGE_STATUS_LABELS[s]),
      ["بانتظار المراجعة", "مُعادة للتصحيح", "معتمدة"]);
    check(REVIEW_QUEUE_TITLE.includes("بلا معاينة") && RETURNED_QUEUE_TITLE.includes("مُعادة"),
      "وعناوينُ الشاشتين تقولان ما فيهما");

    same("(ن) **الصفرُ ليس «مجّانياً»**: بلا أجر ⟶ لا صفَّ",
      parsePendingAmount({ charged: false, amount: 0 }), { ok: true, amount: null });
    same("   وبلا أجرٍ ومعه رقمٌ ⟶ يبقى بلا صفّ",
      parsePendingAmount({ charged: false, amount: 250_000 }), { ok: true, amount: null });
    check(!parsePendingAmount({ charged: true, amount: 0 }).ok,
      "   ومبلغٌ حاضرٌ بصفر ⟶ يُردّ صراحةً");
    check(!parsePendingAmount({ charged: true, amount: -5 }).ok, "   والسالبُ يُردّ");
    check(!parsePendingAmount({ charged: true, amount: 1.5 }).ok, "   والكسرُ يُردّ");
    same("   والموجبُ الصحيح يمرّ",
      parsePendingAmount({ charged: true, amount: 250_000 }), { ok: true, amount: 250_000 });

    check(canOperateNoExam(S.recv as any) && canOperateNoExam(S.manager as any)
      && canOperateNoExam(S.admin as any), "وبوّابةُ الإنشاء: استقبال · مدير · مسؤول");
    check(!canOperateNoExam(S.doc as any) && !canOperateNoExam(S.expert as any)
      && !canOperateNoExam(S.acc as any), "   ولا طبيبَ ولا خبيرَ ولا محاسب");
    check(canCorrectReturned === canOperateNoExam,
      "**والتصحيحُ للفرع لا للموظّف** — البوّابةُ نفسُها حرفياً");
    check(mayReviewShape(S.doc as any) && mayReviewShape(S.admin as any),
      "وشكلُ المراجعة: طبيبٌ مخوَّل · مسؤول");
    check(!mayReviewShape(S.recv as any) && !mayReviewShape(S.manager as any)
      && !mayReviewShape(S.acc as any), "   ولا استقبالَ ولا مديرَ فرعٍ ولا محاسب");
    check(isEditableByReception("returned") && !isEditableByReception("pending_review")
      && !isEditableByReception("approved"),
      "**وبانتظارُ المراجعة مقروءٌ لا يُعدَّل** — فيُغلَق سباقُ «اعتُمد أ وقد صار ب»");
    check(isTerminalCharge("approved") && !isTerminalCharge("returned"),
      "والمعتمَدةُ نهائيّة");

    // ══════════════════════════════════════════════════════════════════
    //  أ. بيعُ جزءٍ بلا معاينة — العمليةُ تُسجَّل، والمالُ صفرٌ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ–ج. بيعُ جزءٍ: تُسجَّل العملية ولا يتحرّك دينار ──");
    const p1 = await mkPatient("بيع القالب");
    await mkCase(p1);
    const ep1 = await startNoExam(p1, "prosthetic", "socket");
    check(ep1.status === 201, "أ. طلبُ «بلا معاينة» يُفتَح بالباب القائم",
      JSON.stringify(ep1.body));
    const epId1 = ep1.body?.id;
    same("   ومسارُه مسجَّلٌ صراحةً وطلبُه القالب",
      await episodeOf(epId1),
      { status: "awaiting_exam", service_path: "no_exam", requested_item: "socket" });

    const c1 = await sale({
      patientId: p1, serviceType: "prosthetic", deviceEpisodeId: epId1,
      expertUserId: EXPERT, charged: true, amount: 300_000, note: "قالب بديل",
    });
    check(c1.status === 201 && c1.body?.charge?.id > 0, "ب. **العمليةُ تُسجَّل**",
      JSON.stringify(c1.body));
    const ch1 = c1.body?.charge?.id;

    // ══ (أ) **العملُ يبدأ قبل الاعتماد** — وهذا معنى المسار ═══════════
    const wo1 = Number(c1.body?.workOrderId);
    check(wo1 > 0, "أ١. **أمرُ التصنيع مفتوحٌ الآن** — المريضُ لا ينتظر الطبيب",
      JSON.stringify(c1.body));
    const o1 = await orderOf(wo1);
    same("أ٢. وبخبيره وحلقته وفرعه وغرضه بالضبط",
      [Number(o1.p), Number(o1.ex), Number(o1.de), o1.st, o1.purpose, o1.status],
      [p1, EXPERT, epId1, "prosthetic", "initial_build", "active"]);
    same("أ٣. والحلقةُ صارت قيد التصنيع",
      (await episodeOf(epId1)).status, "in_manufacturing");
    check((await historyCount(wo1)) >= 1, "أ٤. وسجلُّ العمل مكتوب");
    same("ج. **ولا دينارَ يدخل المحاسبة** — المالُ كلُّه صفر",
      await moneyOnly(p1), ZERO_MONEY_ONLY);
    same("   **والحلقةُ لم تُقيَّد بعد** — `agreed_cost` يعني «كم قُيِّد»",
      (await q(`SELECT agreed_cost::int c FROM patient_device_episodes WHERE id=$1`,
        [epId1]))[0].c, 0);
    same("   والصفُّ بانتظار المراجعة بمبلغه وخبيره",
      (({ status, amount, applied_at, sale_expert_user_id, operation_kind, requested_item }) =>
        ({ status, amount, applied_at, sale_expert_user_id, operation_kind, requested_item }))
        (await chargeRow(ch1)),
      { status: "pending_review", amount: 300_000, applied_at: null,
        sale_expert_user_id: EXPERT, operation_kind: "device_sale", requested_item: "socket" });
    check(c1.body?.message?.includes("بانتظار"), "   والرسالةُ تقول الحقيقةَ للموظّف",
      String(c1.body?.message));
    same("   وحدثُ الإنشاء مسجَّل",
      (await eventsOf(ch1)).map((e: any) => e.event_type), ["created"]);

    // ══════════════════════════════════════════════════════════════════
    //  د. لا تخصيصَ ولا تصنيعَ من البابين الآخرين
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. والبابان الماليّان يبقيان مغلقين على هذا المسار ──");
    //  ولمريضٍ آخر على المسار نفسِه **لم تُسجَّل عمليتُه بعد** — فالبابان
    //  يُردّان على الطلب لا على أمرٍ قائم.
    const pB = await mkPatient("حدّ البابين");
    await mkCase(pB);
    const epB = (await startNoExam(pB, "prosthetic", "tube")).body?.id;
    const assign = await http("POST", `/api/patients/${pB}/assign-manufacturing`, S.manager,
      { serviceType: "prosthetic", cost: 300_000, expertUserId: EXPERT });
    same("د. «تخصيص وإسناد خبير» يُردّ ٤٠٩",
      [assign.status, assign.body?.error], [409, NO_EXAM_PENDING_BOUNDARY]);
    check(NO_EXAM_PENDING_BOUNDARY.includes("بيع بلا معاينة"),
      "   **والرسالةُ تدلّ على البابِ الحقيقيّ** لا تقول «لم يُبنَ بعد»");
    const direct = await http("POST", "/api/manufacturing/orders", S.manager,
      { patientId: pB, serviceType: "prosthetic", expertUserId: EXPERT });
    same("   و«بدء التصنيع» كذلك", [direct.status, direct.body?.error],
      [409, NO_EXAM_PENDING_BOUNDARY]);
    same("   ولا أثرَ على مريض الحدّ",
      (({ total, ledger_rows, orders }) => [total, ledger_rows, orders])(await moneyOf(pB)),
      [0, 0, 0]);
    void epB;
    same("   **ولا أثرَ مالياً من المحاولتين**", await moneyOnly(p1), ZERO_MONEY_ONLY);

    // ══════════════════════════════════════════════════════════════════
    //  هـ–ز. الطابور: اختصاصٌ × فرع
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ–ز. طابورُ المراجعة: اختصاصٌ × فرع ──");
    const qDoc = await http("GET", "/api/no-exam/review", S.doc);
    check((qDoc.body?.rows ?? []).some((r: any) => r.id === ch1),
      "هـ. طبيبُ الأطراف في الفرع يراها");
    const qSup = await http("GET", "/api/no-exam/review", S.docSup);
    check(!(qSup.body?.rows ?? []).some((r: any) => r.id === ch1),
      "و. **وطبيبُ المساند لا يراها** — الاختصاصُ يفصل");
    const qPhys = await http("GET", "/api/no-exam/review", S.docPhys);
    same("   وطبيبُ العلاج الطبيعي لا يرى شيئاً من هذا الطابور إطلاقاً",
      [(qPhys.body?.rows ?? []).length, qPhys.body?.specialties], [0, []]);
    const qOther = await http("GET", "/api/no-exam/review", S.docOther);
    check(!(qOther.body?.rows ?? []).some((r: any) => r.id === ch1),
      "ز. **وطبيبُ فرعٍ آخر لا يراها** — الفرعُ يفصل");
    const qRecv = await http("GET", "/api/no-exam/review", S.recv);
    same("   والاستقبالُ ليس مراجعاً", (qRecv.body?.rows ?? []).length, 0);

    // ══════════════════════════════════════════════════════════════════
    //  ح–ط. الصلاحيةُ على الفعل نفسِه — لا على الشاشة وحدها
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح–ط. والفعلُ محروسٌ في الخادم ──");
    same("ح. الاستقبالُ لا يعتمد مبلغَ نفسِه",
      (await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.recv, {})).status, 403);
    same("   ولا مديرُ الفرع",
      (await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.manager, {})).status, 403);
    same("   ولا المحاسب",
      (await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.acc, {})).status, 403);
    same("   ولا الخبير",
      (await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.expert, {})).status, 403);
    const wrongSpec = await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.docSup, {});
    same("ط. **وطبيبُ اختصاصٍ آخر يُردّ ٤٠٣**", wrongSpec.status, 403);
    check(String(wrongSpec.body?.error).includes("اختصاصاتك"),
      "   برسالةٍ تقول السبب", String(wrongSpec.body?.error));
    same("   وطبيبُ الاختصاص من فرعٍ آخر كذلك",
      (await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.docOther, {})).status, 403);
    same("   **ولا أثرَ مالياً من كلّ المحاولات المرفوضة**",
      await moneyOnly(p1), ZERO_MONEY_ONLY);

    // ══════════════════════════════════════════════════════════════════
    //  ي–ك. الاعتماد — مرّةً واحدة بالضبط، بالكاتب القانونيّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي–ل. الاعتماد: يُقيَّد مرّةً واحدة بالضبط ──");
    const ap1 = await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.doc, {});
    check(ap1.status === 200 && ap1.body?.workOrderId > 0, "ي. الطبيبُ المخوَّل يعتمد",
      JSON.stringify(ap1.body));
    const m1 = await moneyOf(p1);
    same("ك. **والمالُ يدخل الآن — قيدٌ واحد وأمرٌ واحد**",
      [m1.total, m1.case_cost, m1.ledger, m1.ledger_rows, m1.orders],
      [300_000, 300_000, 300_000, 1, 1]);
    same("   **ومجموعُ قيود الدفتر = كلفةُ المريض** (الثابتُ الملزم)",
      m1.ledger, m1.total);
    same("   ولا دفعةَ اختُرعت ولا خصمَ ولا معاينةَ ولا طلبَ مراجعةٍ سريرية",
      [m1.payment_rows, m1.discounts, m1.exams, m1.reviews], [0, 0, 0, 0]);
    const row1 = await chargeRow(ch1);
    check(row1.status === "approved" && row1.applied_at !== null
      && Number(row1.reviewed_by) === DOC
      && Number(row1.applied_work_order_id) === Number(ap1.body.workOrderId),
      "   والصفُّ معتمَدٌ مطبَّقٌ منسوبٌ إلى أمره", JSON.stringify(row1));
    same("   والحلقةُ صارت قيد التصنيع بهويّتها",
      (await episodeOf(epId1)).status, "in_manufacturing");
    const [woAfter] = await q(`SELECT device_episode_id::int de, purpose FROM
      prosthetic_work_orders WHERE id=$1`, [ap1.body.workOrderId]);
    same("   **والأمرُ يرث هويّةَ الجهاز** — لا أمرَ يتيم",
      [Number(woAfter.de), woAfter.purpose ?? "initial_build"], [epId1, "initial_build"]);

    const ap2 = await http("POST", `/api/no-exam/charges/${ch1}/approve`, S.doc, {});
    same("ل. **واعتمادٌ ثانٍ يُردّ ٤٠٩**", ap2.status, 409);
    check(String(ap2.body?.error).includes("اعتُمدت بالفعل"),
      "   برسالةٍ تقول ما جرى لا «تغيّرت الحالة» عارية", String(ap2.body?.error));
    const m1b = await moneyOf(p1);
    same("   **ولا قيدَ ثانٍ ولا أمرَ ثانٍ**",
      [m1b.total, m1b.ledger_rows, m1b.orders], [300_000, 1, 1]);
    same("   **ولا أمرَ تصنيعٍ ثانٍ** — المالُ نزل على الأمر القائم",
      Number(ap1.body.workOrderId), wo1);
    same("   ولا إعادةَ بعد الاعتماد",
      (await http("POST", `/api/no-exam/charges/${ch1}/return`, S.doc,
        { reason: "متأخّر" })).status, 409);

    // ══════════════════════════════════════════════════════════════════
    //  م–ع. الإعادةُ للتصحيح
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م–ع. الإعادةُ للتصحيح: لا هدمَ ولا دينار ──");
    const p2 = await mkPatient("إعادة");
    await mkCase(p2);
    const epId2 = (await startNoExam(p2, "prosthetic", "knee")).body?.id;
    const ch2 = (await sale({
      patientId: p2, serviceType: "prosthetic", deviceEpisodeId: epId2,
      expertUserId: EXPERT, charged: true, amount: 900_000,
    })).body?.charge?.id;

    const noReason = await http("POST", `/api/no-exam/charges/${ch2}/return`, S.doc, {});
    same("م. **إعادةٌ بلا سببٍ تُردّ ٤٠٠**", noReason.status, 400);
    check(String(noReason.body?.error).includes("سبب"), "   برسالةٍ صريحة");
    same("   وبفراغٍ كذلك",
      (await http("POST", `/api/no-exam/charges/${ch2}/return`, S.doc,
        { reason: "   " })).status, 400);

    const ret = await http("POST", `/api/no-exam/charges/${ch2}/return`, S.doc,
      { reason: "المبلغ لا يطابق سعر الركبة المعتمد" });
    check(ret.status === 200, "ن. وبسببٍ ⟶ تُعاد", JSON.stringify(ret.body));
    const row2 = await chargeRow(ch2);
    same("س. **والعمليةُ قائمةٌ لم تُحذَف، ولا دينارَ تحرّك**",
      [row2.status, row2.amount, row2.applied_at], ["returned", 900_000, null]);
    same("   والثابتُ المحاسبيُّ ما زال صفراً", await moneyOnly(p2), ZERO_MONEY_ONLY);
    //  **والعملُ لم يتوقّف**: الإعادةُ للمبلغ لا للعمل — الخبيرُ يواصل.
    same("   **والعملُ مستمرٌّ** — الإعادةُ للمبلغ لا للعمل",
      (await episodeOf(epId2)).status, "in_manufacturing");
    same("   وأمرُ التصنيع قائمٌ فعّال",
      (await orderOf(Number((await chargeRow(ch2)).work_order_id))).status, "active");
    check(String(row2.return_reason).includes("الركبة") && Number(row2.returned_by) === DOC,
      "   والسببُ ومَن أعاد محفوظان على الصفّ");
    check(!(await http("GET", "/api/no-exam/review", S.doc)).body?.rows
      ?.some((r: any) => r.id === ch2), "ع. **وتخرج من طابور الطبيب**");

    // ── طابورُ الاستقبال والشارة ───────────────────────────────────────
    console.log("\n── ف–ص. طابورُ الاستقبال: دائمٌ بعددٍ ظاهر ──");
    const rq = await http("GET", "/api/no-exam/returned", S.recv);
    const rrow = (rq.body?.rows ?? []).find((r: any) => r.id === ch2);
    check(Boolean(rrow), "ف. تظهر في طابور «مُعادة للتصحيح»");
    check(rrow?.returnReason?.includes("الركبة") && rrow?.returnedByName === "سعد",
      "   **والسببُ ظاهرٌ في الصفّ** ومعه مَن أعاده", JSON.stringify(rrow?.returnReason));
    check(rrow?.createdByName === "ريام", "   ومُنشئُها مُبرَزٌ فيه");
    const cnt = await http("GET", "/api/no-exam/returned/count", S.recv);
    same("ص. **وشارةٌ بعددٍ** — للفرع ولصاحبها",
      [cnt.body?.branch, cnt.body?.mine], [1, 1]);
    const cnt2 = await http("GET", "/api/no-exam/returned/count", S.recv2);
    same("   **والزميلُ يراها للفرع** ولو لم ينشئها هو",
      [cnt2.body?.branch, cnt2.body?.mine], [1, 0]);
    same("   وفرعٌ آخر لا يرى شيئاً",
      (await http("GET", "/api/no-exam/returned", S.recvOther)).body?.rows?.length, 0);
    same("   والطبيبُ ليس صاحبَ هذا الطابور",
      (await http("GET", "/api/no-exam/returned", S.doc)).body?.rows?.length, 0);

    // ── التصحيحُ وإعادةُ الإرسال ──────────────────────────────────────
    console.log("\n── ق–ر. التصحيحُ على الصفّ نفسِه ──");
    same("ق. واستقبالُ فرعٍ آخر لا يصحّحها",
      (await http("POST", `/api/no-exam/charges/${ch2}/resubmit`, S.recvOther,
        { amount: 700_000 })).status, 403);
    same("   ولا الطبيبُ يصحّح مبلغاً ليس له",
      (await http("POST", `/api/no-exam/charges/${ch2}/resubmit`, S.doc,
        { amount: 700_000 })).status, 403);
    same("   وصفرٌ يُردّ",
      (await http("POST", `/api/no-exam/charges/${ch2}/resubmit`, S.recv,
        { amount: 0 })).status, 400);

    const res2 = await http("POST", `/api/no-exam/charges/${ch2}/resubmit`, S.recv2,
      { amount: 700_000, note: "السعر المعتمد للركبة" });
    check(res2.status === 200, "ر. **والزميلُ في الفرع يصحّح ولو غاب صاحبُها**",
      JSON.stringify(res2.body));
    const row2b = await chargeRow(ch2);
    same("   والصفُّ نفسُه عاد للمراجعة بالمبلغ الجديد",
      [row2b.status, row2b.amount], ["pending_review", 700_000]);
    same("   **ولا صفَّ ثانٍ يُستنسَخ** فيُحسَب البيعُ مرّتين",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [p2]))[0].n, 1);
    same("   والثابتُ المحاسبيُّ ما زال صفراً", await moneyOnly(p2), ZERO_MONEY_ONLY);

    // ── الرحلةُ كاملةً ─────────────────────────────────────────────────
    console.log("\n── ش. الرحلةُ محفوظةٌ سطراً سطراً ──");
    const ev2 = await eventsOf(ch2);
    same("ش. أُنشئ · أُعيد · صُحّح · أُعيد إرسالُه",
      ev2.map((e: any) => e.event_type),
      ["created", "returned", "corrected", "resubmitted"]);
    check(String(ev2[1].reason).includes("الركبة"),
      "   **وسببُ الإعادة محفوظٌ في حدثه** فلا يمحوه سببٌ بعده");
    same("   والمبلغُ القديم والجديد كلاهما",
      [ev2[2].payload?.oldAmount, ev2[2].payload?.newAmount], [900_000, 700_000]);
    check(String(ev2[3].reason).includes("الركبة"),
      "   وإعادةُ الإرسال تحمل سببَ إعادتها معها");

    const ap3 = await http("POST", `/api/no-exam/charges/${ch2}/approve`, S.doc, {});
    check(ap3.status === 200, "   ثمّ يُعتمَد المصحَّح", JSON.stringify(ap3.body));
    const m2 = await moneyOf(p2);
    same("ت. **والمُقيَّدُ هو المصحَّحُ لا القديم**",
      [m2.total, m2.ledger, m2.ledger_rows], [700_000, 700_000, 1]);
    same("   ومجموعُ القيود = كلفةُ المريض", m2.ledger, m2.total);

    // ══════════════════════════════════════════════════════════════════
    //  ث–خ. الصيانة — العملُ يقع الآن والأجرُ ينتظر
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ث–خ. الصيانة: يقع العملُ وينتظر الأجر ──");
    const p3 = await mkPatient("صيانة");
    await mkCase(p3);
    const mt = await maint({
      patientId: p3, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "foot", deviceOrigin: "external",
      charged: true, amount: 120_000, notes: "تبديل قدم",
    });
    check(mt.status === 201 && mt.body?.workOrderId > 0,
      "ث. **أمرُ الصيانة يُفتَح فوراً** — العملُ يجري الآن", JSON.stringify(mt.body));
    const ch3 = mt.body?.charge?.id;
    const m3 = await moneyOf(p3);
    same("ج2. **والأجرُ خارج المحاسبة تماماً** — أمرٌ بلا قيد",
      [m3.total, m3.case_cost, m3.ledger_rows, m3.payment_rows, m3.orders],
      [0, 0, 0, 0, 1]);
    const row3 = await chargeRow(ch3);
    same("   والصفُّ صيانةٌ بجزئها وبلقطةِ منشأ الجهاز",
      [row3.operation_kind, row3.maintenance_component, row3.origin,
        Number(row3.work_order_id)],
      ["maintenance", "foot", "external", Number(mt.body.workOrderId)]);
    same("   **والمنشأُ على السجلّ التشغيليّ** — لا على صفّ المال وحده",
      (await orderOf(Number(mt.body.workOrderId))).origin, "external");
    same("   ولا حلقةَ اختُرعت للجهاز الخارجيّ",
      (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`,
        [p3]))[0].n, 0);

    same("ح2. **وجزءُ الصيانة إلزاميٌّ للأطراف**",
      (await maint({
        patientId: p3, serviceType: "prosthetic", expertUserId: EXPERT,
        deviceOrigin: "external", charged: true, amount: 50_000,
      })).status, 400);
    same("   **والمنشأُ إلزاميٌّ كذلك** — ولا يُخمَّن عن الموظّف",
      (await maint({
        patientId: p3, serviceType: "prosthetic", expertUserId: EXPERT,
        maintenanceComponent: "knee", charged: true, amount: 50_000,
      })).status, 400);

    const ap4 = await http("POST", `/api/no-exam/charges/${ch3}/approve`, S.doc, {});
    check(ap4.status === 200, "خ. ثمّ يُعتمَد الأجر", JSON.stringify(ap4.body));
    const m3b = await moneyOf(p3);
    same("   **ويُقيَّد بالكاتب القانونيّ للصيانة** — قيدٌ واحد بلا أمرٍ ثانٍ",
      [m3b.total, m3b.case_cost, m3b.ledger, m3b.ledger_rows, m3b.orders],
      [120_000, 120_000, 120_000, 1, 1]);
    const [ce3] = await q(`SELECT source, notes FROM cost_entries WHERE patient_id=$1`, [p3]);
    same("   **وبمصدر «maintenance» نفسِه** — لا مصدرَ ثانٍ يخترعه هذا المسار",
      [ce3.source, ce3.notes], ["maintenance", "أجور صيانة"]);

    // ══════════════════════════════════════════════════════════════════
    //  ذ–ض. عمليةٌ بلا أجر — لا صفَّ ولا اعتمادَ مسرحيّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ذ–ض. عمليةٌ بلا أجر: تُحفَظ وتنتهي ──");
    const p4 = await mkPatient("بلا أجر");
    await mkCase(p4);
    const mtFree = await maint({
      patientId: p4, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "tube", deviceOrigin: "center_unrecorded", charged: false,
    });
    check(mtFree.status === 201 && mtFree.body?.charge === null,
      "ذ. **العمليةُ تُحفَظ ولا صفَّ معلَّقاً** — ولا اعتمادَ مسرحيٌّ لصفر",
      JSON.stringify(mtFree.body));
    same("   والثابتُ المحاسبيُّ صفرٌ والأمرُ قائم",
      (({ total, ledger_rows, orders }) => [total, ledger_rows, orders])(await moneyOf(p4)),
      [0, 0, 1]);
    //  ══ (ن) **والمنشأُ يبقى ولو لم يُنشَأ صفُّ مبلغ** ═══════════════
    same("ن. **منشأُ الجهاز محفوظٌ على الأمر** رغم غياب الصفّ المعلَّق",
      (await orderOf(Number(mtFree.body.workOrderId))).origin, "center_unrecorded");
    same("   ولا تظهر في طابورٍ لأحد",
      (await http("GET", "/api/no-exam/review", S.doc)).body?.rows
        ?.filter((r: any) => r.patientId === p4).length, 0);
    same("ض. ومبلغٌ حاضرٌ بصفر يُردّ ٤٠٠ صراحةً",
      (await sale({
        patientId: p4, serviceType: "prosthetic", deviceEpisodeId: 1,
        expertUserId: EXPERT, charged: true, amount: 0,
      })).status, 400);

    // ══════════════════════════════════════════════════════════════════
    //  ظ–غ. الحدودُ التي لا تُخترَق
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ظ–غ. الحدود ──");
    const p5 = await mkPatient("مسار المعاينة");
    await mkCase(p5);
    const epExam = (await startExamPath(p5)).body?.id;
    const wrongPath = await sale({
      patientId: p5, serviceType: "prosthetic", deviceEpisodeId: epExam,
      expertUserId: EXPERT, charged: true, amount: 100_000,
    });
    same("ظ. **وطلبٌ على مسار المعاينة لا يمرّ من هذا الباب**", wrongPath.status, 409);
    check(String(wrongPath.body?.error).includes("مسار المعاينة"),
      "   برسالةٍ تدلّ على بابه", String(wrongPath.body?.error));
    same("   ولا أثرَ مالياً",
      (({ total, ledger_rows }) => [total, ledger_rows])(await moneyOf(p5)), [0, 0]);

    const p6 = await mkPatient("مريضٌ آخر");
    await mkCase(p6);
    const crossPatient = await sale({
      patientId: p6, serviceType: "prosthetic", deviceEpisodeId: epId1,
      expertUserId: EXPERT, charged: true, amount: 100_000,
    });
    same("غ. **وحلقةُ مريضٍ آخر تُردّ** — الهويّةُ تُتحقَّق تحت القفل",
      crossPatient.status, 409);

    const p7 = await mkPatient("فرعٌ آخر", { branch: 2 });
    await mkCase(p7, "prosthetic", 2);
    same("   واستقبالُ الفرع ١ لا يفتح عمليةً لمريض الفرع ٢",
      (await http("POST", `/api/patients/${p7}/device-episodes`, S.recv,
        { serviceType: "prosthetic", requestedItem: "socket", servicePath: "no_exam" }))
        .status, 403);
    same("   والطبيبُ ليس مَن يُنشئ العملية",
      (await sale({
        patientId: p6, serviceType: "prosthetic", deviceEpisodeId: 1,
        expertUserId: EXPERT, charged: true, amount: 1000,
      }, S.doc)).status, 403);

    // ══ خبيرٌ إلزاميٌّ ومحقَّق ═══════════════════════════════════════════
    const epId6 = (await startNoExam(p6, "prosthetic", "foot")).body?.id;
    same("   **والبيعُ يسمّي خبيرَه** — لا اعتمادَ يُسنِد إلى مجهول",
      (await sale({
        patientId: p6, serviceType: "prosthetic", deviceEpisodeId: epId6,
        charged: true, amount: 100_000,
      })).status, 400);
    same("   وخبيرٌ غيرُ موجودٍ يُردّ",
      (await sale({
        patientId: p6, serviceType: "prosthetic", deviceEpisodeId: epId6,
        expertUserId: 999_999, charged: true, amount: 100_000,
      })).status, 400);

    // ══════════════════════════════════════════════════════════════════
    //  التزامن — ضغطتان تُنتجان قيداً واحداً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── التزامن ──");
    const p8 = await mkPatient("تزامن");
    await mkCase(p8);
    const epId8 = (await startNoExam(p8, "prosthetic", "adapter")).body?.id;
    const ch8 = (await sale({
      patientId: p8, serviceType: "prosthetic", deviceEpisodeId: epId8,
      expertUserId: EXPERT, charged: true, amount: 450_000,
    })).body?.charge?.id;
    const race = await Promise.all([
      http("POST", `/api/no-exam/charges/${ch8}/approve`, S.doc, {}),
      http("POST", `/api/no-exam/charges/${ch8}/approve`, S.admin, {}),
    ]);
    same("**ضغطتان متزامنتان ⟶ نجاحٌ واحد**",
      race.filter((r) => r.status === 200).length, 1);
    const m8 = await moneyOf(p8);
    same("   **وقيدُ كلفةٍ واحد وأمرٌ واحد**",
      [m8.total, m8.ledger, m8.ledger_rows, m8.orders], [450_000, 450_000, 1, 1]);
    same("   ومجموعُ القيود = كلفةُ المريض", m8.ledger, m8.total);

    // ── واعتمادٌ وإعادةٌ متزامنان ──
    const p9 = await mkPatient("تزامن ٢");
    await mkCase(p9);
    const epId9 = (await startNoExam(p9, "prosthetic", "silicone")).body?.id;
    const ch9 = (await sale({
      patientId: p9, serviceType: "prosthetic", deviceEpisodeId: epId9,
      expertUserId: EXPERT, charged: true, amount: 200_000,
    })).body?.charge?.id;
    const race2 = await Promise.all([
      http("POST", `/api/no-exam/charges/${ch9}/approve`, S.doc, {}),
      http("POST", `/api/no-exam/charges/${ch9}/return`, S.admin, { reason: "راجعه" }),
    ]);
    same("**واعتمادٌ وإعادةٌ معاً ⟶ أحدُهما فقط**",
      race2.filter((r) => r.status === 200).length, 1);
    const row9 = await chargeRow(ch9);
    const m9 = await moneyOf(p9);
    check(
      (row9.status === "approved" && m9.ledger_rows === 1 && m9.total === 200_000)
      || (row9.status === "returned" && m9.ledger_rows === 0 && m9.total === 0),
      "   **والمالُ يطابق الحالةَ الفائزة بالضبط**",
      `${row9.status} / ${JSON.stringify(m9)}`);

    // ── صفٌّ معلَّقٌ واحد لكلّ عملية ──
    const p10 = await mkPatient("تكرار");
    await mkCase(p10);
    const epId10 = (await startNoExam(p10, "prosthetic", "knee")).body?.id;
    const dbl = await Promise.all([
      sale({ patientId: p10, serviceType: "prosthetic", deviceEpisodeId: epId10,
        expertUserId: EXPERT, charged: true, amount: 800_000 }),
      sale({ patientId: p10, serviceType: "prosthetic", deviceEpisodeId: epId10,
        expertUserId: EXPERT, charged: true, amount: 800_000 }),
    ]);
    same("**وضغطتان على الحفظ ⟶ صفٌّ معلَّقٌ واحد**",
      dbl.filter((r) => r.status === 201).length, 1);
    same("   والفهرسُ الجزئيّ يفرضها في القاعدة",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [p10]))[0].n, 1);

    // ══════════════════════════════════════════════════════════════════
    //  العلاجُ الطبيعي معزولٌ تماماً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── العلاجُ الطبيعي معزول ──");
    const pPhys = await mkPatient("علاج طبيعي");
    await q(`UPDATE patients SET is_amputee=false, is_physiotherapy=true WHERE id=$1`, [pPhys]);
    await mkCase(pPhys, "physiotherapy");
    same("لا مسارَ «بلا معاينة» للعلاج الطبيعي إطلاقاً",
      (await sale({
        patientId: pPhys, serviceType: "physiotherapy", deviceEpisodeId: 1,
        expertUserId: EXPERT, charged: true, amount: 100_000,
      })).status, 400);
    same("   ولا صيانةَ له",
      (await maint({
        patientId: pPhys, serviceType: "physiotherapy", expertUserId: EXPERT,
        charged: true, amount: 100_000,
      })).status, 400);
    same("   **والقيدُ في القاعدة يمنعه** ولو التُفَّ على النقطة",
      (await q(`SELECT pg_get_constraintdef(oid) d FROM pg_constraint
                 WHERE conname='psc_service_check'`))[0].d,
      "CHECK ((service_type = ANY (ARRAY['prosthetic'::text, 'medical_support'::text])))");
    {
      const src = readFileSync(join(process.cwd(), "shared/pricing.ts"), "utf8");
      check(!/pending_service_charges|pendingServiceCharge/.test(src),
        "   ولا ذكرَ للمبالغ المعلّقة في تسعير العلاج الطبيعي");
      const ns = readFileSync(join(process.cwd(), "server/new_service/store.ts"), "utf8");
      check(!/pending_service_charges|pendingServiceCharge/.test(ns),
        "   ولا في «خدمة جديدة»");
    }

    // ══════════════════════════════════════════════════════════════════
    //  المساندُ الطبية — بلا قائمةِ أجزاءٍ مخترَعة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── المساندُ الطبية: بلا قائمةِ أجزاءٍ مخترَعة ──");
    const pSup = await mkPatient("مسند", { support: true });
    await mkCase(pSup, "medical_support");
    same("**وجزءُ طرفٍ على مسندٍ يُردّ لا يُصحَّح**",
      (await startNoExam(pSup, "medical_support", "knee")).status, 400);
    const epSup = (await startNoExam(pSup, "medical_support", "full_device")).body?.id;
    const chSup = (await sale({
      patientId: pSup, serviceType: "medical_support", deviceEpisodeId: epSup,
      expertUserId: EXPERT, charged: true, amount: 250_000,
    })).body?.charge?.id;
    check(chSup > 0, "والمسندُ الكاملُ يمرّ");
    check((await http("GET", "/api/no-exam/review", S.docSup)).body?.rows
      ?.some((r: any) => r.id === chSup), "**وطبيبُ المساند يراه هو**");
    check(!(await http("GET", "/api/no-exam/review", S.docSup)).body?.rows
      ?.some((r: any) => r.operationKind === "device_sale" && r.serviceType === "prosthetic"),
      "   ولا يرى الأطراف");
    const apSup = await http("POST", `/api/no-exam/charges/${chSup}/approve`, S.docSup, {});
    check(apSup.status === 200, "   ويعتمده", JSON.stringify(apSup.body));
    const mSup = await moneyOf(pSup);
    same("   ويُقيَّد مرّةً واحدة", [mSup.total, mSup.ledger, mSup.ledger_rows],
      [250_000, 250_000, 1]);

    // ══════════════════════════════════════════════════════════════════
    //  التدقيقُ وبطاقةُ الملفّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── التدقيقُ والملفّ ──");
    const audits = await q(`SELECT action FROM audit_log
      WHERE entity_type='pending_service_charge' AND user_id = ANY($1::int[])
      ORDER BY id`, [USERS]);
    check(audits.length >= 6 && audits.some((a: any) => a.action === "create")
      && audits.some((a: any) => a.action === "update"),
      "كلُّ إنشاءٍ وقرارٍ مدقَّقٌ في `audit_log`", JSON.stringify(audits.length));
    const card = await http("GET", `/api/patients/${p2}/pending-charges`, S.recv);
    check((card.body?.rows ?? []).some((r: any) => r.id === ch2),
      "وبطاقةُ الملفّ تقرأ مبالغ المريض");
    same("   ولا يقرؤها فرعٌ آخر",
      (await http("GET", `/api/patients/${p2}/pending-charges`, S.recvOther)).status, 403);
    const hist = await http("GET", `/api/no-exam/charges/${ch2}/events`, S.recv);
    same("والرحلةُ تُقرأ من النقطة كاملةً — بلا حذفِ سطرٍ منها",
      (hist.body?.events ?? []).map((e: any) => e.eventType),
      ["approved", "resubmitted", "corrected", "returned", "created"]);

    // ══════════════════════════════════════════════════════════════════
    //  حذفُ المريض ودمجُه — القاعدةُ الملزمة في CLAUDE.md
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── حذفُ المريض ودمجُه ──");
    //  **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨): والكاسكيدُ الهادمُ
    //  بابُه الوحيد «حذف نهائي» من داخل السلّة. فتُنفَّذ الخطوتان معاً
    //  كي تبقى **تغطيةُ الكاسكيد كما كانت** بحرفها.
    await http("DELETE", `/api/patients/${p2}`, S.admin,
      { reason: "اختبار الكاسكيد" });
    const del = await http("POST", `/api/patient-trash/${p2}/purge`,
      S.admin, { reason: "اختبار الكاسكيد" });
    check(del.status === 200 || del.status === 204,
      "**حذفُ مريضٍ يحمل صفوفاً معلّقة ينجح**", JSON.stringify(del.body));
    same("   ولا صفَّ يتيمٌ يبقى",
      (await q(`SELECT
          (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) c,
          (SELECT count(*)::int FROM pending_service_charge_events WHERE patient_id=$1) e`,
        [p2]))[0], { c: 0, e: 0 });

    const pKeep = await mkPatient("دمج - الهدف");
    const keepCase = await mkCase(pKeep);
    const pDrop = await mkPatient("دمج - المصدر");
    await mkCase(pDrop);
    const epDrop = (await startNoExam(pDrop, "prosthetic", "socket")).body?.id;
    const chDrop = (await sale({
      patientId: pDrop, serviceType: "prosthetic", deviceEpisodeId: epDrop,
      expertUserId: EXPERT, charged: true, amount: 333_000,
    })).body?.charge?.id;
    const merged = await http("POST", "/api/admin/patients/merge", S.admin,
      { sourceId: pDrop, targetId: pKeep });
    check(merged.status === 200 || merged.status === 201,
      "**ودمجُ ملفّين ينقل الصفوف المعلّقة**", JSON.stringify(merged.body));
    const [mrow] = await q(`SELECT patient_id::int p, case_id::int c FROM
      pending_service_charges WHERE id=$1`, [chDrop]);
    same("   إلى الملفّ الهدف وحالته", [mrow?.p, mrow?.c], [pKeep, keepCase]);
    same("   وأحداثُه معها",
      (await q(`SELECT count(*)::int n FROM pending_service_charge_events
                 WHERE charge_id=$1 AND patient_id=$2`, [chDrop, pKeep]))[0].n, 1);

    // ══════════════════════════════════════════════════════════════════
    //  (هـ) بيعُ جزءٍ **بلا أجر** — العملُ يكتمل ولا صفَّ ولا مراجعة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. بيعٌ بلا أجر: يبدأ العملُ ولا ينتظر أحداً ──");
    const pF = await mkPatient("بيع بلا أجر");
    await mkCase(pF);
    const epF = (await startNoExam(pF, "prosthetic", "foam_cover")).body?.id;
    const saleFree = await sale({
      patientId: pF, serviceType: "prosthetic", deviceEpisodeId: epF,
      expertUserId: EXPERT, charged: false,
    });
    check(saleFree.status === 201 && saleFree.body?.charge === null
      && saleFree.body?.workOrderId > 0,
      "هـ١. **العملُ يبدأ ولا صفَّ معلَّقاً** — ولا اعتمادَ مسرحيٌّ لصفر",
      JSON.stringify(saleFree.body));
    same("هـ٢. **والحلقةُ لا تبقى معلَّقة** — تدخل التصنيع كأيّ بيع",
      (await episodeOf(epF)).status, "in_manufacturing");
    same("هـ٣. والمالُ صفرٌ كلُّه", await moneyOnly(pF), ZERO_MONEY_ONLY);
    same("هـ٤. ولا تظهر في طابور الطبيب",
      (await http("GET", "/api/no-exam/review", S.doc)).body?.rows
        ?.filter((r: any) => r.patientId === pF).length, 0);
    same("هـ٥. ولا صفَّ في الجدول أصلاً",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pF]))[0].n, 0);

    //  (و) والمسندُ الكاملُ بلا أجر — المبدأُ نفسُه حيث يقبله النموذج.
    const pSF = await mkPatient("مسند بلا أجر", { support: true });
    await mkCase(pSF, "medical_support");
    const epSF = (await startNoExam(pSF, "medical_support", "full_device")).body?.id;
    const supFree = await sale({
      patientId: pSF, serviceType: "medical_support", deviceEpisodeId: epSF,
      expertUserId: EXPERT, charged: false,
    });
    check(supFree.status === 201 && supFree.body?.charge === null
      && supFree.body?.workOrderId > 0,
      "و. **والمسندُ الكاملُ بلا أجر كذلك**", JSON.stringify(supFree.body));
    same("   والمالُ صفر", await moneyOnly(pSF), ZERO_MONEY_ONLY);

    // ══════════════════════════════════════════════════════════════════
    //  (ز–ي) حارسُ الطرف الكامل
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز–ي. الطرفُ الكاملُ لا يُباع بلا معاينة ──");
    const pG = await mkPatient("طرف كامل");
    await mkCase(pG);
    const fullEp = await startNoExam(pG, "prosthetic", "full_device");
    same("ز. **فتحُ طلبِ طرفٍ كامل بلا معاينة يُردّ ٤٠٠**",
      [fullEp.status, fullEp.body?.error], [400, NO_EXAM_FULL_PROSTHESIS_REFUSAL]);
    check(NO_EXAM_FULL_PROSTHESIS_REFUSAL.includes("معاينة")
      && NO_EXAM_FULL_PROSTHESIS_REFUSAL.includes("تصحيح"),
      "   **والرسالةُ تدلّ على البابين**: مسارُ المعاينة أو التصحيحُ الإداريّ");
    same("   ولا حلقةَ وُلدت", (await q(
      `SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pG]))[0].n, 0);

    //  (ي) **وحلقةٌ موروثة** فُتحت قبل هذا الحارس (المرحلةُ الأولى كانت
    //  تسمح باختيار المسار) — تُحقَن مباشرةً كما لو كانت من قبله.
    const legacyCase = (await q(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
      [pG]))[0].id;
    const legacyEp = (await q(
      `INSERT INTO patient_device_episodes
         (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
          requested_item, component, service_path, created_at, updated_at)
       VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',NULL,'no_exam',NOW(),NOW())
       RETURNING id`, [pG, legacyCase]))[0].id;
    const legacySale = await sale({
      patientId: pG, serviceType: "prosthetic", deviceEpisodeId: legacyEp,
      expertUserId: EXPERT, charged: true, amount: 1_500_000,
    });
    same("ي. **والموروثةُ لا تُباع من هنا** — تُردّ ٤٠٩ برسالتها",
      [legacySale.status, legacySale.body?.error],
      [409, NO_EXAM_FULL_PROSTHESIS_REFUSAL]);
    same("   **ولا يُغيَّر مسارُها بصمت** — تبقى كما وُجدت",
      await episodeOf(legacyEp),
      { status: "awaiting_exam", service_path: "no_exam", requested_item: "full_device" });
    same("   ولا أثرَ مالياً ولا أمرَ تصنيع",
      (({ total, ledger_rows, orders }) => [total, ledger_rows, orders])(await moneyOf(pG)),
      [0, 0, 0]);

    // ══════════════════════════════════════════════════════════════════
    //  (ك–س) منشأُ الجهاز — ثلاثةٌ متمايزةٌ بعد إعادة القراءة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك–س. منشأُ الجهاز: ثلاثُ حقائق لا اثنتان ──");
    same("العقدُ الخالص: ثلاثُ قيمٍ لا غير", [...DEVICE_ORIGINS],
      ["registered", "center_unrecorded", "external"]);
    check(originHasEpisode("registered") && !originHasEpisode("center_unrecorded")
      && !originHasEpisode("external"), "والمسجَّلُ وحده يحمل حلقة");
    check(!parseDeviceOrigin("").ok && !parseDeviceOrigin("legacy").ok
      && !parseDeviceOrigin(undefined).ok, "**والمجهولُ يُردّ لا يُصحَّح بصمت**");
    check(DEVICE_ORIGIN_LABELS.center_unrecorded.includes("المركز")
      && DEVICE_ORIGIN_LABELS.external.includes("خارج"),
      "وعناوينُهما تفرّقهما بالعربية");

    //  (ك) جهازٌ مسجَّل — بحلقته المسلَّمة بعينها.
    const pK = await mkPatient("منشأ مسجَّل");
    const caseK = await mkCase(pK);
    const epK = (await q(
      `INSERT INTO patient_device_episodes
         (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
          requested_item, service_path, delivered_at, created_at, updated_at)
       VALUES ($1,$2,1,1,'delivered',0,'full_device','exam',NOW(),NOW(),NOW())
       RETURNING id`, [pK, caseK]))[0].id;
    const mK = await maint({
      patientId: pK, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "knee", deviceOrigin: "registered",
      deviceEpisodeId: epK, charged: true, amount: 90_000,
    });
    check(mK.status === 201, "ك. جهازٌ مسجَّل يمرّ بحلقته", JSON.stringify(mK.body));
    const oK = await orderOf(Number(mK.body.workOrderId));
    same("   **والمنشأُ `registered` والحلقةُ محفوظةٌ بعينها**",
      [oK.origin, Number(oK.de)], ["registered", epK]);
    same("   و«مسجَّل» بلا جهازٍ مختار يُردّ",
      (await maint({
        patientId: pK, serviceType: "prosthetic", expertUserId: EXPERT,
        maintenanceComponent: "foot", deviceOrigin: "registered", charged: false,
      })).status, 400);

    //  (ل) جهازُنا القديمُ غير المسجَّل — **وليس خارجياً**.
    const pL = await mkPatient("منشأ من المركز");
    await mkCase(pL);
    const mL = await maint({
      patientId: pL, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "socket", deviceOrigin: "center_unrecorded",
      charged: true, amount: 60_000,
    });
    check(mL.status === 201, "ل. جهازُنا القديمُ غير المسجَّل يمرّ", JSON.stringify(mL.body));
    const oL = await orderOf(Number(mL.body.workOrderId));
    same("   **ووسمُه `center_unrecorded` — لا `external`**", oL.origin, "center_unrecorded");
    same("   ولا حلقةَ ولا أمرَ تاريخيٍّ اختُرع له",
      (await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`,
        [pL]))[0].n, 0);
    same("   وحلقتُه على الأمر فارغةٌ صدقاً", oL.de, null);

    //  (م) جهازٌ صُنع خارجنا.
    const pM = await mkPatient("منشأ خارجي");
    await mkCase(pM);
    const mM = await maint({
      patientId: pM, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "adapter", deviceOrigin: "external",
      charged: true, amount: 40_000,
    });
    const oM = await orderOf(Number(mM.body.workOrderId));
    same("م. **والخارجيُّ `external`**", oM.origin, "external");
    same("   ولا حلقةَ ولا تاريخَ تصنيعٍ من عندنا",
      [(await q(`SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`,
        [pM]))[0].n, oM.de], [0, null]);

    //  (س) **والاثنان يفترقان بعد إعادة القراءة** — وهو بيتُ القصيد.
    same("س. **صنعناه ≠ صُنع خارجنا — بعد إعادة القراءة**",
      [(await orderOf(Number(mL.body.workOrderId))).origin,
        (await orderOf(Number(mM.body.workOrderId))).origin],
      ["center_unrecorded", "external"]);
    same("   ولا يُقرأ المنشأُ من تاريخ المريض إطلاقاً",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders
                 WHERE device_origin IS NOT NULL AND patient_id IN
                   (SELECT id FROM patients WHERE had_prior_center_history IS TRUE
                      AND referral_source = $1)`, [MARK]))[0].n, 0);

    // ══════════════════════════════════════════════════════════════════
    //  (ع–ت) إعادةُ التحقّق لحظةَ الاعتماد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ع–ت. الاعتمادُ يعيد القراءة تحت القفل ──");
    //  (ع) خبيرٌ أُوقف بين الإرسال والاعتماد.
    const pP = await mkPatient("خبير موقوف");
    await mkCase(pP);
    const epP = (await startNoExam(pP, "prosthetic", "silicone")).body?.id;
    const chP = (await sale({
      patientId: pP, serviceType: "prosthetic", deviceEpisodeId: epP,
      expertUserId: EXPERT, charged: true, amount: 500_000,
    })).body?.charge?.id;
    await q(`UPDATE system_users SET is_active=false WHERE id=$1`, [EXPERT]);
    const apP = await http("POST", `/api/no-exam/charges/${chP}/approve`, S.doc, {});
    same("ع. **خبيرٌ صار غيرَ فعّال ⟶ يُردّ ٤٠٩**", apP.status, 409);
    check(String(apP.body?.error).includes("فعّال"), "   برسالةٍ تقول السبب",
      String(apP.body?.error));
    same("   **ولا دينارَ يُقيَّد**", await moneyOnly(pP), ZERO_MONEY_ONLY);
    same("   والصفُّ ما زال بانتظار المراجعة", (await chargeRow(chP)).status, "pending_review");
    await q(`UPDATE system_users SET is_active=true WHERE id=$1`, [EXPERT]);

    //  (ف) خبيرٌ لم يعد صالحاً لفرع العملية.
    await q(`UPDATE system_users SET branch_id=2, branch_ids='[2]'::jsonb WHERE id=$1`, [EXPERT]);
    const apQ = await http("POST", `/api/no-exam/charges/${chP}/approve`, S.doc, {});
    same("ف. **وخبيرٌ خرج من فرع العملية ⟶ يُردّ ٤٠٩**", apQ.status, 409);
    same("   ولا دينار", await moneyOnly(pP), ZERO_MONEY_ONLY);
    await q(`UPDATE system_users SET branch_id=1, branch_ids='[1,2]'::jsonb WHERE id=$1`, [EXPERT]);
    const apR = await http("POST", `/api/no-exam/charges/${chP}/approve`, S.doc, {});
    check(apR.status === 200, "   ثمّ يمرّ حين يعود صالحاً", JSON.stringify(apR.body));
    same("   ويُقيَّد مرّةً واحدة",
      (({ total, ledger, ledger_rows }) => [total, ledger, ledger_rows])(await moneyOf(pP)),
      [500_000, 500_000, 1]);

    //  (ص) تناقضُ الفرع بين الصفّ وأمرِ العمل.
    const pR2 = await mkPatient("تناقض فرع");
    await mkCase(pR2);
    const epR2 = (await startNoExam(pR2, "prosthetic", "tube")).body?.id;
    const chR2 = (await sale({
      patientId: pR2, serviceType: "prosthetic", deviceEpisodeId: epR2,
      expertUserId: EXPERT, charged: true, amount: 300_000,
    })).body?.charge?.id;
    await q(`UPDATE pending_service_charges SET branch_id=2 WHERE id=$1`, [chR2]);
    const apS = await http("POST", `/api/no-exam/charges/${chR2}/approve`, S.admin, {});
    same("ص. **فرعُ الصفّ ≠ فرعُ أمر العمل ⟶ ٤٠٩**", apS.status, 409);
    same("   **ولا مالَ يُنسَب إلى فرعٍ آخر بصمت**", await moneyOnly(pR2), ZERO_MONEY_ONLY);
    await q(`UPDATE pending_service_charges SET branch_id=1 WHERE id=$1`, [chR2]);

    //  (ق) تناقضُ هويّةِ الحلقة أو أمرِ العمل.
    //  أمرُ مريضٍ آخر **اعتُمد صفُّه سلفاً**، فلا يصطدم بفهرس «معلَّقٌ واحد».
    await q(`UPDATE pending_service_charges SET work_order_id=$2 WHERE id=$1`,
      [chR2, wo1]);
    const apT = await http("POST", `/api/no-exam/charges/${chR2}/approve`, S.admin, {});
    same("ق. **أمرُ عملٍ لمريضٍ آخر ⟶ ٤٠٩**", apT.status, 409);
    same("   ولا دينار", await moneyOnly(pR2), ZERO_MONEY_ONLY);
    await q(`UPDATE pending_service_charges SET device_episode_id=NULL WHERE id=$1`, [chR2]);
    const apU = await http("POST", `/api/no-exam/charges/${chR2}/approve`, S.admin, {});
    same("   وحلقةٌ لا تطابق ⟶ ٤٠٩", apU.status, 409);
    same("   ولا دينار", await moneyOnly(pR2), ZERO_MONEY_ONLY);

    //  (ت) نُقل المريضُ فرعاً بينما عمليتُه من فرعه القديم معلَّقة.
    const pT = await mkPatient("نقل فرع");
    await mkCase(pT);
    const epT = (await startNoExam(pT, "prosthetic", "foot")).body?.id;
    const chT = (await sale({
      patientId: pT, serviceType: "prosthetic", deviceEpisodeId: epT,
      expertUserId: EXPERT, charged: true, amount: 250_000,
    })).body?.charge?.id;
    await q(`UPDATE patients SET branch_id=2 WHERE id=$1`, [pT]);
    const apV = await http("POST", `/api/no-exam/charges/${chT}/approve`, S.admin, {});
    check(apV.status === 200, "ت. **العمليةُ تُعتمَد على فرعِها هي**",
      JSON.stringify(apV.body));
    const [ceT] = await q(`SELECT branch_id::int b FROM cost_entries WHERE patient_id=$1`, [pT]);
    same("   **والقيدُ على فرعِ العملية لا على فرع المريض الجديد**", Number(ceT.b), 1);

    // ══════════════════════════════════════════════════════════════════
    //  (١) **الاعتمادُ بعد أن يكتمل العملُ ويُسلَّم الجهاز**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ١. العملُ قد يسبق المراجعَ — والمالُ يلحقه ──");
    const pD = await mkPatient("تسليم قبل الاعتماد");
    await mkCase(pD);
    const epD = (await startNoExam(pD, "prosthetic", "knee")).body?.id;
    const cD = await sale({
      patientId: pD, serviceType: "prosthetic", deviceEpisodeId: epD,
      expertUserId: EXPERT, charged: true, amount: 850_000,
    });
    const chD = cD.body?.charge?.id;
    const woD = Number(cD.body?.workOrderId);

    //  **العملُ يمضي إلى نهايته** بينما المبلغُ ما زال ينتظر: الأمرُ يكتمل
    //  والحلقةُ تُسلَّم — وهذا بالضبط ما يعنيه «العمليةُ تمضي».
    await q(`UPDATE prosthetic_work_orders SET status='completed',
             completed_at=NOW() WHERE id=$1`, [woD]);
    await q(`UPDATE patient_device_episodes SET status='delivered',
             delivered_at=NOW() WHERE id=$1`, [epD]);
    same("١أ. الحلقةُ مسلَّمةٌ والأمرُ مكتمل", 
      [(await episodeOf(epD)).status, (await orderOf(woD)).status],
      ["delivered", "completed"]);
    same("١ب. **والمالُ ما زال صفراً** — لم يُقيَّد شيء", 
      await moneyOnly(pD), ZERO_MONEY_ONLY);
    same("   والصفُّ ما زال بانتظار المراجعة", (await chargeRow(chD)).status, "pending_review");

    const apD = await http("POST", `/api/no-exam/charges/${chD}/approve`, S.doc, {});
    check(apD.status === 200,
      "١ج. **والطبيبُ يعتمد بعد التسليم** — العملُ لا يُعاقَب لأنه أسرعُ من المراجع",
      JSON.stringify(apD.body));
    const mD = await moneyOf(pD);
    same("١د. ويُقيَّد على **الأمر نفسِه** مرّةً واحدة",
      [mD.total, mD.ledger, mD.ledger_rows, mD.orders, Number(apD.body.workOrderId)],
      [850_000, 850_000, 1, 1, woD]);
    same("   ومجموعُ القيود = كلفةُ المريض", mD.ledger, mD.total);
    same("   **والتسليمُ يبقى تسليماً** — لا تعود الحلقةُ إلى التصنيع",
      (await episodeOf(epD)).status, "delivered");

    // ══════════════════════════════════════════════════════════════════
    //  (٢) **الخبيرُ الحاليُّ على الأمر هو السلطة**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٢. الخبيرُ الحاليُّ على الأمر لا لقطةُ الإنشاء ──");
    //  (أ) إعادةُ إسنادٍ مشروعة بعد الإرسال ⟶ الاعتمادُ يمضي.
    const pE = await mkPatient("إعادة إسناد");
    await mkCase(pE);
    const epE = (await startNoExam(pE, "prosthetic", "socket")).body?.id;
    const cE = await sale({
      patientId: pE, serviceType: "prosthetic", deviceEpisodeId: epE,
      expertUserId: EXPERT, charged: true, amount: 400_000,
    });
    const chE = cE.body?.charge?.id, woE = Number(cE.body?.workOrderId);
    await q(`UPDATE prosthetic_work_orders SET expert_user_id=$2 WHERE id=$1`, [woE, EXPERT2]);
    const apE = await http("POST", `/api/no-exam/charges/${chE}/approve`, S.doc, {});
    check(apE.status === 200,
      "٢أ. **أُسنِد الأمرُ لخبيرٍ آخر ⟶ الاعتمادُ يمضي**", JSON.stringify(apE.body));
    same("   ويُقيَّد مرّةً واحدة",
      (({ total, ledger_rows }) => [total, ledger_rows])(await moneyOf(pE)), [400_000, 1]);
    same("   **ولقطةُ الإنشاء تبقى للتدقيق ولا تُعاد كتابتُها**",
      Number((await chargeRow(chE)).sale_expert_user_id), EXPERT);

    //  (ب) الخبيرُ الحاليُّ غيرُ فعّال ⟶ يُردّ.
    const pE2 = await mkPatient("خبير حالي موقوف");
    await mkCase(pE2);
    const epE2 = (await startNoExam(pE2, "prosthetic", "foot")).body?.id;
    const cE2 = await sale({
      patientId: pE2, serviceType: "prosthetic", deviceEpisodeId: epE2,
      expertUserId: EXPERT, charged: true, amount: 300_000,
    });
    const chE2 = cE2.body?.charge?.id, woE2 = Number(cE2.body?.workOrderId);
    await q(`UPDATE prosthetic_work_orders SET expert_user_id=$2 WHERE id=$1`, [woE2, EXPERT2]);
    await q(`UPDATE system_users SET is_active=false WHERE id=$1`, [EXPERT2]);
    const apE2 = await http("POST", `/api/no-exam/charges/${chE2}/approve`, S.doc, {});
    same("٢ب. **والخبيرُ الحاليُّ غيرُ الفعّال يُردّ ٤٠٩**", apE2.status, 409);
    same("   ولا دينار", await moneyOnly(pE2), ZERO_MONEY_ONLY);
    await q(`UPDATE system_users SET is_active=true WHERE id=$1`, [EXPERT2]);

    //  (ج) الخبيرُ الحاليُّ خارجَ فرع الأمر ⟶ يُردّ.
    await q(`UPDATE system_users SET branch_id=2, branch_ids='[2]'::jsonb WHERE id=$1`, [EXPERT2]);
    const apE3 = await http("POST", `/api/no-exam/charges/${chE2}/approve`, S.doc, {});
    same("٢ج. **وخارجَ فرع الأمر يُردّ ٤٠٩**", apE3.status, 409);
    same("   ولا دينار", await moneyOnly(pE2), ZERO_MONEY_ONLY);
    await q(`UPDATE system_users SET branch_id=1, branch_ids='[1,2]'::jsonb WHERE id=$1`, [EXPERT2]);

    // ══════════════════════════════════════════════════════════════════
    //  (٣) **هويّةُ الصيانة تُعاد قراءتُها قبل الدينار**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٣. الصيانة: مطابقةٌ قبل القيد ──");
    const mkMaint = async (label: string, amount = 100_000) => {
      const pid = await mkPatient(label);
      await mkCase(pid);
      const out = await maint({
        patientId: pid, serviceType: "prosthetic", expertUserId: EXPERT,
        maintenanceComponent: "knee", deviceOrigin: "external",
        charged: true, amount,
      });
      return { pid, chargeId: out.body?.charge?.id, woId: Number(out.body?.workOrderId) };
    };

    //  (د) صيانةٌ اكتملت قبل الاعتماد ⟶ يمضي.
    const mD2 = await mkMaint("صيانة مكتملة");
    await q(`UPDATE prosthetic_work_orders SET status='completed', completed_at=NOW()
             WHERE id=$1`, [mD2.woId]);
    const apM = await http("POST", `/api/no-exam/charges/${mD2.chargeId}/approve`, S.doc, {});
    check(apM.status === 200, "٣د. **صيانةٌ اكتملت ⟶ الاعتمادُ يمضي**",
      JSON.stringify(apM.body));
    same("   ويُقيَّد مرّةً واحدة بمصدره",
      (({ total, ledger_rows }) => [total, ledger_rows])(await moneyOf(mD2.pid)), [100_000, 1]);

    //  (هـ) صيانةٌ أُلغيت ⟶ تُردّ.
    const mE = await mkMaint("صيانة ملغاة");
    await q(`UPDATE prosthetic_work_orders SET status='cancelled' WHERE id=$1`, [mE.woId]);
    const apMe = await http("POST", `/api/no-exam/charges/${mE.chargeId}/approve`, S.doc, {});
    same("٣هـ. **وصيانةٌ ملغاة تُردّ ٤٠٩**", apMe.status, 409);
    same("   **ولا دينار**", await moneyOnly(mE.pid), ZERO_MONEY_ONLY);
    //  والمُبطَلُ إدارياً كذلك.
    await q(`UPDATE prosthetic_work_orders SET status='active', admin_void_reversal_id=1
             WHERE id=$1`, [mE.woId]);
    same("   والمُبطَلُ إدارياً كذلك",
      (await http("POST", `/api/no-exam/charges/${mE.chargeId}/approve`, S.doc, {})).status, 409);
    same("   ولا دينار", await moneyOnly(mE.pid), ZERO_MONEY_ONLY);
    await q(`UPDATE prosthetic_work_orders SET admin_void_reversal_id=NULL WHERE id=$1`, [mE.woId]);

    //  (و) فرعُ الصفّ ≠ فرعُ أمر الصيانة ⟶ يُردّ.
    const mF = await mkMaint("صيانة فرع مختلف");
    await q(`UPDATE pending_service_charges SET branch_id=2 WHERE id=$1`, [mF.chargeId]);
    same("٣و. **فرعُ الصفّ ≠ فرعُ الأمر ⟶ ٤٠٩**",
      (await http("POST", `/api/no-exam/charges/${mF.chargeId}/approve`, S.admin, {})).status, 409);
    same("   ولا دينار", await moneyOnly(mF.pid), ZERO_MONEY_ONLY);
    await q(`UPDATE pending_service_charges SET branch_id=1 WHERE id=$1`, [mF.chargeId]);

    //  (ز) منشأُ الصفّ ≠ منشأُ الأمر ⟶ يُردّ.
    await q(`UPDATE pending_service_charges SET device_origin='center_unrecorded'
             WHERE id=$1`, [mF.chargeId]);
    same("٣ز. **ومنشأٌ لا يطابق السجلَّ التشغيليّ ⟶ ٤٠٩**",
      (await http("POST", `/api/no-exam/charges/${mF.chargeId}/approve`, S.admin, {})).status, 409);
    same("   ولا دينار", await moneyOnly(mF.pid), ZERO_MONEY_ONLY);
    await q(`UPDATE pending_service_charges SET device_origin='external' WHERE id=$1`,
      [mF.chargeId]);

    //  (ح) أمرُ صيانةٍ لمريضٍ آخر ⟶ يُردّ.
    await q(`UPDATE pending_service_charges SET work_order_id=$2 WHERE id=$1`,
      [mF.chargeId, mD2.woId]);
    same("٣ح. **وأمرٌ لمريضٍ آخر ⟶ ٤٠٩**",
      (await http("POST", `/api/no-exam/charges/${mF.chargeId}/approve`, S.admin, {})).status, 409);
    same("   ولا دينار", await moneyOnly(mF.pid), ZERO_MONEY_ONLY);
    //  والجزءُ كذلك: صفٌّ يقول «قدم» وأمرٌ يقول «ركبة».
    await q(`UPDATE pending_service_charges SET work_order_id=$2,
             maintenance_component='foot' WHERE id=$1`, [mF.chargeId, mF.woId]);
    same("   وجزءٌ لا يطابق ⟶ ٤٠٩",
      (await http("POST", `/api/no-exam/charges/${mF.chargeId}/approve`, S.admin, {})).status, 409);
    same("   ولا دينار", await moneyOnly(mF.pid), ZERO_MONEY_ONLY);

    // ══════════════════════════════════════════════════════════════════
    //  (٤) **«بلا أجر» واقعةٌ محفوظة لا غيابُ صفّ**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٤. «بلا أجر» تُقال على السجلّ ──");
    same("٤ط. **بيعٌ بلا أجر ⟶ الأمرُ يقولها صراحةً**",
      (await orderOf(Number(saleFree.body.workOrderId))).nocharge, true);
    same("   ولا صفَّ معلَّقاً", (await q(
      `SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`, [pF]))[0].n, 0);
    same("   والمالُ صفر", await moneyOnly(pF), ZERO_MONEY_ONLY);
    same("٤ي. **وصيانةٌ بلا أجر كذلك**",
      (await orderOf(Number(mtFree.body.workOrderId))).nocharge, true);
    same("٤ك. **والمدفوعُ يقول `false` صراحةً** — لا يُترك فارغاً",
      (await orderOf(woD)).nocharge, false);
    check((await q(`SELECT count(*)::int n FROM pending_service_charges
                     WHERE work_order_id=$1`, [woD]))[0].n === 1,
      "   وله صفُّه المعلَّق");
    //  (ل) والقديمُ يبقى `NULL` — لا قيمةَ افتراضية تكتب عليه معنىً.
    const [legacyWo] = await q(`SELECT id FROM prosthetic_work_orders
      WHERE no_exam_no_charge IS NULL LIMIT 1`);
    check(Boolean(legacyWo), "٤ل. **وأوامرُ المسارات الأخرى تبقى NULL** — لم تُسأل");

    // ══════════════════════════════════════════════════════════════════
    //  (٥) **فرعُ الحلقة ≠ فرعُ المريض الحاليّ ⟶ لا عملية ولا مال**
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ٥. حلقةٌ من فرعٍ آخر لا تبدأ هنا ──");
    const pN = await mkPatient("نقل قبل البدء");
    await mkCase(pN);
    const epN = (await startNoExam(pN, "prosthetic", "tube")).body?.id;
    await q(`UPDATE patients SET branch_id=2 WHERE id=$1`, [pN]);
    await q(`UPDATE patient_cases SET branch_id=2 WHERE patient_id=$1`, [pN]);
    const saleN = await sale({
      patientId: pN, serviceType: "prosthetic", deviceEpisodeId: epN,
      expertUserId: EXPERT2, charged: true, amount: 220_000,
    }, S.admin);
    same("٥م. **حلقةُ الفرع ١ ومريضٌ صار في الفرع ٢ ⟶ ٤٠٩**", saleN.status, 409);
    check(String(saleN.body?.error).includes("فرعٍ آخر"),
      "   برسالةٍ تدلّ على التصحيح الإداريّ", String(saleN.body?.error));
    same("   **ولا أمرَ ولا صفَّ ولا دينار**",
      (await q(`SELECT
          (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) o,
          (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) c,
          (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) l`,
        [pN]))[0], { o: 0, c: 0, l: 0 });

    //  (ن) خيطُ الصفّ ≠ خيطُ الحلقة ⟶ الاعتمادُ يُردّ.
    const pO = await mkPatient("خيط مختلف");
    await mkCase(pO);
    const epO = (await startNoExam(pO, "prosthetic", "adapter")).body?.id;
    const chO = (await sale({
      patientId: pO, serviceType: "prosthetic", deviceEpisodeId: epO,
      expertUserId: EXPERT, charged: true, amount: 150_000,
    })).body?.charge?.id;
    const otherCase = await mkCase(pO, "medical_support");
    await q(`UPDATE pending_service_charges SET case_id=$2 WHERE id=$1`, [chO, otherCase]);
    same("٥ن. **خيطُ الصفّ ≠ خيطُ الحلقة ⟶ ٤٠٩**",
      (await http("POST", `/api/no-exam/charges/${chO}/approve`, S.admin, {})).status, 409);
    same("   ولا دينار", await moneyOnly(pO), ZERO_MONEY_ONLY);

    //  والحلقةُ الملغاةُ لا تُقيَّد عليها.
    const pP2 = await mkPatient("حلقة ملغاة");
    await mkCase(pP2);
    const epP2 = (await startNoExam(pP2, "prosthetic", "foam_cover")).body?.id;
    const chP2 = (await sale({
      patientId: pP2, serviceType: "prosthetic", deviceEpisodeId: epP2,
      expertUserId: EXPERT, charged: true, amount: 70_000,
    })).body?.charge?.id;
    await q(`UPDATE patient_device_episodes SET status='cancelled', cancelled_at=NOW()
             WHERE id=$1`, [epP2]);
    same("   **وحلقةٌ ملغاة ⟶ ٤٠٩**",
      (await http("POST", `/api/no-exam/charges/${chP2}/approve`, S.doc, {})).status, 409);
    same("   ولا دينار", await moneyOnly(pP2), ZERO_MONEY_ONLY);

    // ══════════════════════════════════════════════════════════════════
    //  عقدُ الشاشات — بلا مشغّل DOM
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── عقدُ الشاشات ──");
    {
      const review = readFileSync(join(process.cwd(),
        "client/src/pages/NoExamReview.tsx"), "utf8");
      check(review.includes("no-exam-approve-") && review.includes("no-exam-return-"),
        "طابورُ الطبيب: فعلان لا أكثر");
      check(!/reject|data-testid=\"?no-exam-reject/.test(review)
        && !/>\s*رفض/.test(review),
        "**ولا زرَّ رفضٍ إطلاقاً** — العمليةُ وقعت فعلاً");
      check(/disabled=\{[^}]*!reason\.trim\(\)/.test(review),
        "والإعادةُ محبوسةٌ حتى يُكتَب السبب");
      check(review.includes("لم يدخل أيٌّ منها المحاسبة بعد"),
        "والشاشةُ تقول الحقيقةَ المالية");

      const returned = readFileSync(join(process.cwd(),
        "client/src/pages/ReturnedCharges.tsx"), "utf8");
      check(returned.includes("returned-reason-") && returned.includes("RETURN_REASON_LABEL"),
        "وطابورُ الاستقبال يُبرِز سببَ الإعادة");
      check(returned.includes("returned-mine-"),
        "ومُنشئُها مُبرَزٌ في صفّه — بلا قفلِ التصحيح عليه");
      check(returned.includes("إعادة الإرسال للمراجعة"),
        "وفعلُه: تصحيحٌ ثمّ إعادةُ إرسال");

      const sidebar = readFileSync(join(process.cwd(),
        "client/src/components/Sidebar.tsx"), "utf8");
      //  ══ **القائمةُ لا تضيق عن الخادم** ═══════════════════════════════
      //  شرطُ الخادم شكلاً: مسؤولٌ · دورُه طبيب · أو `canWriteMedicalExam`.
      //  فاشتراطُ `canWriteMedicalExam` وحدها في القائمة كان يُخفي الشاشةَ
      //  عن طبيبٍ يقبله الخادم.
      const reviewItem = (sidebar.match(/\{[^\n]*href: "\/no-exam-review"[^\n]*\}/) ?? [""])[0];
      check(reviewItem.includes('permission: null'),
        "**والمراجعةُ المالية لا تشترط صلاحيةَ كتابة المعاينة في القائمة**",
        reviewItem);
      check(/roles: \["doctor"\]/.test(reviewItem),
        "   ودورُ الطبيب يراها");
      check(/noExamReviewBypass[\s\S]{0,120}permissions\.canWriteMedicalExam/.test(sidebar),
        "   ومَن يحمل العَلَمَ يراها ولو كان دورُه شيئاً آخر — كما يقبله الخادم");
      {
        //  **والطرفان يقرآن القاعدةَ نفسَها**: كلُّ جلسةٍ يقبلها الخادمُ
        //  شكلاً تراها القائمة، والعكسُ بالعكس.
        const menuSees = (x: any) => Boolean(x.isAdmin) || x.role === "doctor"
          || x.permissions?.canWriteMedicalExam === true;
        const cases = [S.admin, S.doc, S.docSup, S.docPhys, S.recv, S.manager, S.acc, S.expert];
        same("**ولا خلافَ بين القائمة والخادم على أيّ جلسة**",
          cases.map((c) => menuSees(c) === mayReviewShape(c as any)),
          cases.map(() => true));
      }
      check(sidebar.includes("/api/no-exam/returned/count")
        && sidebar.includes("badge: returnedCount"),
        "**والشارةُ على القائمة** — فيُعرَف أن هناك ما ينتظر بلا فتح الصفحة");
      check(/returnedData\?\.branch/.test(sidebar),
        "   وعددُ **الفرع** هو الحاكم لا عددُ الموظّف");

      const dialog = readFileSync(join(process.cwd(),
        "client/src/components/NoExamOperationDialog.tsx"), "utf8");
      check(dialog.includes("PROSTHETIC_COMPONENTS") && dialog.includes("COMPONENT_LABELS"),
        "**ونافذةُ الاستقبال تقرأ قائمةَ الأجزاء القائمة** — لا قائمةَ ثانية");
      check(/serviceType === "prosthetic" && PROSTHETIC_COMPONENTS\.map/.test(dialog),
        "   **والأجزاءُ للأطراف وحدها** — لا تُخترَع للمساند");
      //  **(ح) والطرفُ الكاملُ لا يُعرَض في بيع الأطراف بلا معاينة.**
      check(/serviceType === "medical_support" && \(\s*<SelectItem value=\{FULL_DEVICE\}/.test(dialog),
        "**(ح) والجهازُ الكاملُ للمساند وحدها** — لا يُعرَض للأطراف إطلاقاً");
      check(dialog.includes("الطرف الصناعي الكامل يحتاج معاينة"),
        "   والشاشةُ تقول لماذا وتدلّ على بابه");
      //  ومنشأُ الجهاز ثلاثةٌ في القائمة، بلا خيارٍ يجمع اثنين.
      check(dialog.includes("DEVICE_ORIGINS") && dialog.includes("DEVICE_ORIGIN_LABELS"),
        "**ومنشأُ الجهاز من القائمة الواحدة** — ثلاثةٌ لا اثنان");
      check(!/خارج المركز أو غير مسجَّل/.test(dialog),
        "   **ولا خيارَ يجمع «صنعناه» بـ«صُنع خارجنا»**");
      check(/origin === "registered" &&/.test(dialog),
        "   والمسجَّلُ وحده يُسأل عن جهازه بعينه");
      check(dialog.includes("no-exam-op-no-charge"),
        "ومربّعُ «بلا أجور» صريحٌ — فالصفرُ لا يقول «مجّاناً» بالصمت");
      check(dialog.includes("يبدأ العمل الآن") && dialog.includes("والمبلغ وحده ينتظر"),
        "**والنافذةُ تقول الحقيقةَ**: العملُ يبدأ والمبلغُ ينتظر");
      check(/بلا أجور[\s\S]{0,200}يبدأ العمل/.test(dialog),
        "   و«بلا أجور» لا تَعِد بتوقّفٍ لا يقع");
    }

    // ══════════════════════════════════════════════════════════════════
    //  الحارسُ المعماريّ — كاتبٌ قانونيٌّ واحد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── الحارسُ المعماريّ ──");
    {
      const store = readFileSync(join(process.cwd(),
        "server/pending_charges/store.ts"), "utf8");
      check(!/INSERT\s+INTO\s+cost_entries/i.test(store)
        && !/costEntries\)?\.values/.test(store),
        "**ولا قيدَ كلفةٍ يُكتب في منسّق المبالغ** — الكاتبُ القانونيّ وحده");
      check(!/UPDATE\s+patients[\s\S]{0,80}total_cost/i.test(store),
        "   ولا `total_cost` يُلمَس مباشرةً");
      check(store.includes("postMaintenanceFee")
        && store.includes("applyDeviceSaleFinancialsTx")
        && store.includes("startDeviceSaleOperationallyTx"),
        "   بل يُنادى الكاتبان القائمان بنصفَيهما");
      //  **ولا `assignManufacturing` في الاعتماد**: كانت تفتح أمراً ثانياً
      //  وحلقةً ثانية على عمليةٍ بدأت سلفاً.
      //  **نداءً** لا ذكراً في تعليق: `assignManufacturing` كانت تفتح أمراً
      //  ثانياً وحلقةً ثانية على عمليةٍ بدأت سلفاً.
      check(!/\b(storage|store)\.assignManufacturing\s*\(/.test(store),
        "**ولا أمرَ تصنيعٍ ثانٍ عند الاعتماد** — النصفُ الماليُّ وحده");
      check(!/service_discount_requests|submitDiscount/.test(store),
        "**ولا صفَّ خصمٍ يُنشأ لهذا المسار** — مفهومٌ واحد لا اعتمادان");
      check(!/medical_exams|INSERT INTO medical_exam/.test(store),
        "**ولا معاينةَ تُنشأ** — المراجعةُ ماليّةٌ لا سريرية");
      check(!/service_path\s*=/.test(store),
        "   ولا `service_path` يتغيّر");

      const mfg = readFileSync(join(process.cwd(),
        "server/manufacturing/store.ts"), "utf8");
      const feeBody = mfg.slice(mfg.indexOf("export async function postMaintenanceFee"));
      check((feeBody.match(/INSERT INTO cost_entries|insert\(costEntries\)/g) ?? []).length <= 1,
        "وحسابُ أجور الصيانة في مكانٍ واحد — بابان ونداءٌ واحد");
    }

    // ══ ولا تغيير في ترحيلٍ قائم ══════════════════════════════════════
    {
      const runner = readFileSync(join(process.cwd(),
        "server/migrations/runner.ts"), "utf8");
      check(runner.includes("migration067"), "وترحيل ٠٦٧ مسجَّلٌ في المشغّل");
      const m067 = readFileSync(join(process.cwd(),
        "server/migrations/067_pending_service_charges.ts"), "utf8");
      //  **جملاً** لا كلماتٍ في تعليق: «لا DROP» في شرحٍ ليست `DROP TABLE`.
      check(!/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX|SCHEMA)\b/i.test(m067)
        && !/\bDELETE\s+FROM\b/i.test(m067) && !/\bTRUNCATE\b/i.test(m067),
        "**وهو إضافيٌّ بالكامل** — لا DROP ولا DELETE ولا TRUNCATE");
      check(/CREATE TABLE IF NOT EXISTS/.test(m067)
        && /ADD COLUMN IF NOT EXISTS/.test(m067),
        "   وقابلٌ للتشغيل مرّتين");
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص «بلا معاينة» نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
