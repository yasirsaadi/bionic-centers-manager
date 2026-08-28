// **عملياتُ «بلا معاينة»** — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:pending-charge`.
//
// ⚠ **(المرحلة الرابعة، ٢٠٢٦-٠٨-٢٨)** — القاعدةُ التاريخية أدناه («الطبيبُ
// يراجع الحركةَ إشرافياً») **لم تعد سارية لبيع الجزء أيضاً**: التغطيةُ
// الشاملةُ الجديدة (حفظٌ واحد، `originalPrice`/`discountAmount`،
// `canCompleteComponentSale`، **بلا طبيبٍ إطلاقاً — لا حيّاً ولا استرجاعياً**)
// في `server/component_sale.test.ts` (٩٦ تأكيداً). والصيانةُ صار لها عقدٌ
// وسلوكٌ مبسّطان منذ المرحلة الثالثة (`server/simplified_maintenance.test.ts`).
// **وما بقي هنا** يثبت أموراً لم تمسّها المرحلتان الثالثة والرابعة: الطابورَ
// الموروث (ز)، وحارسَ الجهاز الكامل (ح)، وعزلَ العلاج الطبيعي (ط)، وحذفَ
// المريض (ي)، وعقدَ الشاشات المتبقّي (ك)، وثوابتَ `ensureReviewRouting`
// نفسِها (م — التي يستعملها مسارُ المعاينة، لا بيعُ الجزء بعد اليوم)،
// والحارسَ المعماريّ (ل) — مُحدَّثاً ليقول الحقيقةَ الجديدة.
//
// ══ الثابتُ الذي يحرسه اليوم ═══════════════════════════════════════════════
// **بيعُ الجزء والمالُ يقعان لحظتَهما من الاستعلامات، ولا معتمِدَ طبّيٌّ
// للمال إطلاقاً — لا حيّاً ولا استرجاعياً.**
//
// وما يُثبته هنا، بندَ بندٍ:
//   • **أ–ج**: بيعُ جزءٍ (بعقده الجديد) وصيانةُ طرفٍ ومسندٍ ⟶ المالُ يقع
//     **لحظتَه** بالكاتب القانونيّ نفسِه، مرّةً واحدة بالضبط، **وبلا صفٍّ
//     معلَّقٍ واحد، وبلا سجلِّ مراجعةٍ طبّية واحد**.
//   • **د**: و«مجّانيّ» (خصمٌ = الأصل) ⟶ عملٌ يكتمل بلا دينار، والواقعةُ
//     محفوظةٌ على الأمر صراحةً.
//   • **هـ**: والتكرارُ والتزامنُ ⟶ لا مالَ مرّتين ولا أمرَ ثانٍ.
//   • **و**: و«تمت المراجعة» (على سجلٍّ تاريخيّ) اعترافٌ ⟶ لا كلفةَ ولا
//     قيدَ ولا أمرَ يتغيّر — خاصّيةٌ في نقطة المراجعة نفسِها، مستقلّةٌ عمّن
//     أنشأ السجلّ.
//   • **ز**: والصفوفُ الموروثة تبقى بايتاً بايت، ويُنهيها الاستقبالُ ومديرُ
//     الفرع والمسؤول ضمن نطاقهم — **والطبيبُ يُردّ ٤٠٣**.
//   • **ح**: وحارسُ الجهاز الكامل باقٍ — عند فتح الطلب وعند البيع معاً.
//   • **ط**: والعلاجُ الطبيعي معزولٌ تماماً.
//   • **ي**: وحذفُ المريض الكامل يعمل (القاعدةُ الملزمة في CLAUDE.md).
//   • **ك**: وعقدُ الشاشات المتبقّي — طابورُ القائمة الجانبية وصفحتُه.
//   • **م**: وثوابتُ `ensureReviewRouting` (التفرّدُ على المرساة) — تخدم
//     مسارَ المعاينة اليوم، لا بيعَ الجزء.
//   • **ن**: وبطاقةُ المشرف — بيعُ الجزء **لا يصل** طابورَ الطبيب إطلاقاً
//     بعد اليوم (كالصيانة تماماً)، وصياغةُ الصفحة التاريخية لم تُمَسّ.
//   • **الحارسُ المعماريّ**: لا محاسبةَ ثانية، ولا استدعاءَ مراجعةٍ
//     استرجاعية من بيع الجزء بعد اليوم.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  canFinalizeLegacyCharge,
  PENDING_CHARGE_STATUSES, PENDING_CHARGE_STATUS_LABELS, PENDING_CHARGE_ACTIONS,
  LEGACY_QUEUE_TITLE, LEGACY_QUEUE_HINT, RETURNED_QUEUE_TITLE,
  PENDING_CHARGE_KINDS,
} from "@shared/pending_charge";
import { noExamSaleRefusal } from "@shared/prosthetic_parts";
import { MAINTENANCE_SUCCESS_MESSAGE } from "@shared/maintenance";
import { canCompleteComponentSale, COMPONENT_SALE_SUCCESS_MESSAGE } from "@shared/component_sale";

/** مصادرُ الحقيقة التي يقرؤها الحارسُ المعماريّ — مرّةً واحدة. */
const PENDING_MODULE = readFileSync(
  join(process.cwd(), "shared/pending_charge.ts"), "utf8");
const PENDING_STORE = readFileSync(
  join(process.cwd(), "server/pending_charges/store.ts"), "utf8");
const CHARGE_ROUTES = readFileSync(
  join(process.cwd(), "server/pending_charges/routes.ts"), "utf8");

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

/**
 * **بيعُ جزءٍ — العقدُ الجديد** (المرحلة الرابعة): حفظٌ واحد يفتح الحلقةَ
 * ويبيعها معاً. لا `startNoExam` قبله ولا `deviceEpisodeId`/`charged`/
 * `amount` — `component`/`originalPrice`/`discountAmount` وحدها، أو
 * `existingEpisodeId` لاستئناف حلقةٍ موروثة.
 */
const sale = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/device-sale", session, body);
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, body);

/**
 * **زرعٌ مباشر بالـSQL لعمليةٍ «تشغيليةٍ فقط»** — حلقةٌ في التصنيع وأمرُ
 * عملٍ قائمان، **بلا دينارٍ مقيَّد بعد**. هذا هو الشكلُ الذي كان يتركه
 * الشكلُ القديم ذو النداءين خلفه حين ينجح النداءُ الأوّل (فتحُ الحلقة) ولا
 * يُستكمَل الثاني (تسجيلُ المبلغ) — ولا بابَ حيّاً يُنتجه اليوم (المرحلة
 * الرابعة تكتب الاثنين معاً ذرّياً)، فقصّة «صفٍّ موروثٍ ينتظر مالَه» (القسم
 * ز) تُستأنَف بزرعه هكذا لا بمحاولة إعادة إنتاجه عبر بابٍ حيّ.
 */
async function mkOperationalOnly(
  patientId: number, caseId: number, item: string, expertId = EXPERT,
) {
  const [ep] = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id,
       sequence_number, status, agreed_cost, requested_item, component,
       service_path, created_by)
     VALUES ($1,$2,1,
       (SELECT COALESCE(MAX(sequence_number),0)+1 FROM patient_device_episodes WHERE case_id=$2),
       'in_manufacturing',0,$3,$3,'no_exam',$4)
     RETURNING id`,
    [patientId, caseId, item, RECV]);
  const [wo] = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
       status, current_stage, purpose, device_episode_id, assigned_by)
     VALUES ($1,1,'prosthetic',$2,'active','pending','initial_build',$3,$4) RETURNING id`,
    [patientId, expertId, ep.id, RECV]);
  return { episodeId: ep.id, workOrderId: wo.id };
}

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
const ZERO_MONEY = {
  total: 0, case_cost: 0, ledger: 0, ledger_rows: 0, paid: 0, payment_rows: 0,
  journal_rows: 0, orders: 0, discounts: 0, exams: 0, reviews: 0,
};
void ZERO_MONEY;

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
    same("حالاتٌ ثلاثٌ لا أكثر (للصفوف الموروثة)", [...PENDING_CHARGE_STATUSES],
      ["pending_review", "returned", "approved"]);
    same("وفعلان لا ثالث", [...PENDING_CHARGE_ACTIONS], ["approve", "return"]);
    check(PENDING_CHARGE_STATUS_LABELS.pending_review.includes("بانتظار"),
      "وعناوينُها عربيةٌ مقروءة");

    //  **العنوانُ لم يعد مراجعةً طبية** — والشاشةُ تقول إنها موروثة.
    check(LEGACY_QUEUE_TITLE === "مبالغ سابقة بانتظار الإكمال",
      "١. **الطابورُ الموروث بعنوانه الجديد** — لا «مراجعة» ولا «طبيب»",
      LEGACY_QUEUE_TITLE);
    check(!LEGACY_QUEUE_TITLE.includes("مراجعة") && !LEGACY_QUEUE_TITLE.includes("طبيب"),
      "   ولا يُقدَّم بوصفه مراجعةً سريرية");
    check(LEGACY_QUEUE_HINT.includes("قبل تحديث النظام")
      && LEGACY_QUEUE_HINT.includes("مباشرةً"),
    "   وشرحُه يقول إن الجديدَ لا يمرّ من هنا", LEGACY_QUEUE_HINT);
    check(RETURNED_QUEUE_TITLE.includes("مُعادة"), "   وطابورُ المُعادات كما هو");

    //  ══ **ووصفُ نوعَي العملية صادقٌ بعد ٢٥٠** ═══════════════════════════
    same("١.ب **ونوعان لا ثالث**", [...PENDING_CHARGE_KINDS],
      ["device_sale", "maintenance"]);
    {
      const kindsDoc = PENDING_MODULE.slice(
        PENDING_MODULE.indexOf("`device_sale`"),
        PENDING_MODULE.indexOf("export const PENDING_CHARGE_KINDS"));
      check(!/بيعُ جزءِ طرفٍ صناعيّ أو مسندٍ طبيّ كامل/.test(kindsDoc),
        "١.ج **ولا وصفَ يقول إن البيع يشمل مسنداً كاملاً**", kindsDoc.slice(0, 160));
      check(/بيعُ جزءِ طرفٍ صناعيّ وحده/.test(kindsDoc),
        "١.د **بل «جزءُ طرفٍ صناعيّ وحده»**");
      check(/لم يبقَ للمساند من هذا المسار إلّا \*\*الصيانة\*\*|إلّا \*\*الصيانة\*\*/
        .test(kindsDoc),
      "١.هـ **ويقول إن المساند صيانةٌ وحدها**");
    }

    //  ══ **الصلاحية: مَن يسجّل بيعَ الجزء هو مَن يقيّده** (المرحلة الرابعة) ══
    console.log("\n── ٠.ب الصلاحية: لا معتمِدَ طبّيّ للمال ──");
    check(canCompleteComponentSale(S.recv as any) && canCompleteComponentSale(S.manager as any)
      && canCompleteComponentSale(S.acc as any) && canCompleteComponentSale(S.admin as any),
    "٤. **الاستقبالُ والمحاسبُ ومديرُ الفرع والمسؤول يسجّلون بيعَ الجزء ومبلغَه**");
    check(!canCompleteComponentSale(S.expert as any),
      "   ولا خبير");
    //  **والطبيبُ بدوره وحده لا يملك مالاً** — ولو حمل `canWriteMedicalExam`.
    check(!canCompleteComponentSale(S.doc as any),
      "٥. **والطبيبُ بدوره وحده لا يقيّد مالاً** — `canWriteMedicalExam` ليست ماليّة");
    //  **وإكمالُ الموروث بابُه الخاصّ** — الاستقبالُ ومديرُ الفرع والمسؤول.
    for (const s of [S.recv, S.manager, S.admin]) {
      check(canFinalizeLegacyCharge(s as any), `   ويُنهيه ${s.displayName}`);
    }
    check(!canFinalizeLegacyCharge(S.doc as any) && !canFinalizeLegacyCharge(S.acc as any),
      "   ولا طبيبَ ولا محاسب — إكمالُ الموروث تحديداً بلا محاسب (خلافاً لبيع الجزء الجديد)");
    //  **ولا أثرَ لـ`mayReviewShape` في المستودع** — السلطةُ الطبيةُ للمال أُزيلت.
    check(!PENDING_MODULE.includes("mayReviewShape"),
      "٧. **ولا `mayReviewShape` باقيةٌ في العقد** — لا شيفرةً ميتة تُغري بالعودة");
    check(!CHARGE_ROUTES.includes("doctorSpecialties"),
      "   ولا اختصاصٌ طبّيٌّ يُقرأ في نقاط المال");
    check(!/canOperateNoExam/.test(CHARGE_ROUTES),
      "٨. **(المرحلة الرابعة) ولا `canOperateNoExam` تحرس بيعَ الجزء بعد اليوم**"
      + " — `canCompleteComponentSale` وحدها");

    // ══════════════════════════════════════════════════════════════════
    //  (أ) بيعُ جزءٍ — العملُ والمالُ معاً، بالعقد الجديد
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. بيعُ جزءٍ من طرفٍ صناعي: العملُ والمالُ معاً (العقدُ الجديد) ──");
    const pA = await mkPatient("بيع جزء بمبلغ");
    const caseA = await mkCase(pA);
    same("أ٠. **والمالُ صفرٌ قبل العملية**", await moneyOnly(pA), ZERO_MONEY_ONLY);

    const saleA = await sale({
      patientId: pA, component: "socket", expertUserId: EXPERT,
      originalPrice: 300_000, discountAmount: 0,
    });
    check(saleA.status === 201 && saleA.body?.workOrderId > 0,
      "أ١. **العمليةُ تُسجَّل ويُفتَح أمرُ التصنيع في حفظٍ واحد**", JSON.stringify(saleA.body));
    same("أ٢. **ورسالتُها الموحَّدة**", saleA.body?.message, COMPONENT_SALE_SUCCESS_MESSAGE);
    const epA: number = saleA.body?.deviceEpisodeId;
    same("أ٢.ب **والجزءُ في الردّ يطابق المطلوب**", saleA.body?.component, "socket");

    //  ══ **ولا صفَّ معلَّقٌ في القاعدة إطلاقاً** — هذا هو بيتُ القصيد ══
    same("أ٤. **ZERO pending_service_charges** — لا صفَّ وُلد",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pA]))[0].n, 0);
    same("   ولا حدثَ صفٍّ معلَّق",
      (await q(`SELECT count(*)::int n FROM pending_service_charge_events WHERE patient_id=$1`,
        [pA]))[0].n, 0);

    //  ══ **والمالُ وقع كاملاً، مرّةً واحدة** ═══════════════════════════
    const mA = await moneyOf(pA);
    same("أ٥. **كلفةُ المريض والحالةِ والدفترُ — مرّةً واحدة بالضبط**",
      [mA.total, mA.case_cost, mA.ledger, mA.ledger_rows], [300_000, 300_000, 300_000, 1]);
    same("أ٦. ولا دفعةَ ولا خصمَ ولا معاينة",
      [mA.paid, mA.payment_rows, mA.discounts, mA.exams], [0, 0, 0, 0]);
    //  **وقيدُ الدفتر منسوبٌ إلى حالته وحلقته** — لا قيدٌ يتيم.
    const [ceA] = await q(`SELECT source, case_id::int c, device_episode_id::int de,
        amount::int a FROM cost_entries WHERE patient_id=$1`, [pA]);
    same("أ٧. **والقيدُ منسوبٌ إلى الحالة والحلقة**",
      [ceA?.c, ceA?.de, ceA?.a], [caseA, epA, 300_000]);
    //  **والحلقةُ تحمل ما قُيِّد** — `agreed_cost` = «كم دخل المحاسبة».
    const [epRowA] = await q(`SELECT status, agreed_cost::int ac,
        component_sale_original_price::int csop, component_sale_price_kind cspk
      FROM patient_device_episodes WHERE id=$1`, [epA]);
    same("أ٨. **والحلقةُ في التصنيع بكلفتها المقيَّدة**",
      [epRowA?.status, epRowA?.ac], ["in_manufacturing", 300_000]);
    same("أ٨.ب **والحقيقةُ التجارية المُهيكَلة (ترحيل ٠٧٠) تطابق**",
      [epRowA?.csop, epRowA?.cspk], [300_000, "normal"]);
    //  **وأمرُ العمل واحدٌ بخبيره** — ولا ثانيَ.
    same("أ٩. **وأمرُ تصنيعٍ واحد**",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`,
        [pA]))[0].n, 1);
    const ordA = await orderOf(saleA.body.workOrderId);
    same("   بخبيره وحلقته وغرضه", [ordA?.ex, ordA?.de, ordA?.purpose],
      [EXPERT, epA, "initial_build"]);

    //  ══ **وبلا سجلٍّ استرجاعيٍّ للطبيب** (المرحلة الرابعة تُلغي هذا) ══
    same("أ١٠. **وصفرُ سجلّاتِ مراجعةٍ طبية** — لا مراجعة استرجاعية بعد اليوم",
      mA.reviews, 0);
    check(saleA.body?.reviewRouted === undefined,
      "أ١١. **ولا حقلَ `reviewRouted` في الردّ إطلاقاً**");

    // ══════════════════════════════════════════════════════════════════
    //  (ب) صيانةُ أطرافٍ بمبلغ
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **(المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨)** — الصيانةُ صارت بابها الموحَّد
    //  `/api/no-exam/maintenance` بعقدٍ جديد (`originalPrice`/`discountAmount`
    //  بدل `charged`/`amount`، ونيّةُ جهازٍ صريحة بدل `deviceOrigin`)، **وبلا
    //  سجلٍّ استرجاعيٍّ للطبيب إطلاقاً** — لا سلطةَ له على هذا المسار من
    //  أوّله. التغطيةُ الشاملةُ للعقد الجديد في
    //  `server/simplified_maintenance.test.ts` (١١٤ تأكيداً)؛ وما بقي هنا
    //  يثبت الثابتَ المشترك مع بيعِ الجزء: **ZERO pending_service_charges**
    //  ومحاسبةُ الصيانة بكاتبها القانونيّ نفسِه.
    console.log("\n── ب. صيانةُ أطرافٍ بمبلغ (العقدُ الحاليّ) ──");
    const pB = await mkPatient("صيانة أطراف");
    const caseB = await mkCase(pB);
    const maintB = await maint({
      patientId: pB, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "knee", legacyUnrecordedDevice: true,
      originalPrice: 75_000, discountAmount: 0,
    });
    check(maintB.status === 201 && maintB.body?.workOrderId > 0,
      "ب١. **الصيانةُ تُفتَح بأمرها**", JSON.stringify(maintB.body));
    same("ب٢. ورسالتُها الموحَّدة", maintB.body?.message, MAINTENANCE_SUCCESS_MESSAGE);
    same("ب٣. **ZERO pending_service_charges**",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pB]))[0].n, 0);
    const mB = await moneyOf(pB);
    same("ب٤. **والأجرُ مقيَّدٌ مرّةً واحدة بالكاتب القانونيّ**",
      [mB.total, mB.case_cost, mB.ledger, mB.ledger_rows], [75_000, 75_000, 75_000, 1]);
    const [ceB] = await q(`SELECT source, case_id::int c FROM cost_entries WHERE patient_id=$1`,
      [pB]);
    same("ب٥. **وبمصدر `maintenance` على حالته**", [ceB?.source, ceB?.c],
      ["maintenance", caseB]);
    same("ب٦. **وبلا سجلٍّ استرجاعيٍّ إطلاقاً** — الطبيبُ بلا سلطةٍ على الصيانة",
      mB.reviews, 0);

    // ══════════════════════════════════════════════════════════════════
    //  (ج) صيانةُ مسندٍ بمبلغ — السلوكُ نفسُه
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. صيانةُ مسندٍ بمبلغ (العقدُ الحاليّ) ──");
    const pC = await mkPatient("صيانة مسند", { support: true });
    await mkCase(pC, "medical_support");
    const maintC = await maint({
      patientId: pC, serviceType: "medical_support", expertUserId: EXPERT,
      legacyUnrecordedDevice: true, originalPrice: 40_000, discountAmount: 0,
    });
    check(maintC.status === 201, "ج١. **صيانةُ المسند تمضي**", JSON.stringify(maintC.body));
    same("ج٢. **ZERO pending charges**",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pC]))[0].n, 0);
    const mC = await moneyOf(pC);
    same("ج٣. **والمالُ فوريٌّ مرّةً واحدة**",
      [mC.total, mC.case_cost, mC.ledger_rows], [40_000, 40_000, 1]);
    same("ج٤. **وبلا سجلٍّ استرجاعيٍّ لأيّ طبيب**", mC.reviews, 0);

    // ══════════════════════════════════════════════════════════════════
    //  (د) بيعٌ مجّانيّ صراحةً — عملٌ بلا دينار، والواقعةُ محفوظة
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **(المرحلة الرابعة)** — لا مربّعَ «بلا أجور» بعد اليوم. المجّانيّةُ
    //  خصمٌ = الأصل صراحةً (`shared/commercial.ts: deriveOfferFromDiscount`)
    //  — نفسُ قاعدة الصيانة (المرحلة الثالثة) حرفاً.
    console.log("\n── د. مجّانيّ صراحةً: عملٌ بلا دينار ──");
    const pD = await mkPatient("بيع مجاني");
    await mkCase(pD);
    const saleD = await sale({
      patientId: pD, component: "foam_cover", expertUserId: EXPERT,
      originalPrice: 60_000, discountAmount: 60_000,
    });
    check(saleD.status === 201 && saleD.body?.workOrderId > 0,
      "د١. **العملُ يبدأ ويكتمل تسجيله**", JSON.stringify(saleD.body));
    same("د٢. ورسالتُها الموحَّدة", saleD.body?.message, COMPONENT_SALE_SUCCESS_MESSAGE);
    same("د٢.ب **والنوعُ `free` والنهائيّ صفر**",
      [saleD.body?.priceKind, saleD.body?.finalPrice], ["free", 0]);
    same("د٣. **ولا قيدَ ولا كلفةَ ولا دينار**", await moneyOnly(pD), ZERO_MONEY_ONLY);
    same("د٤. **ولا صفَّ معلَّقاً**",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pD]))[0].n, 0);
    same("د٥. **و«بلا أجر» واقعةٌ محفوظةٌ على الأمر** (`no_exam_no_charge`)",
      (await orderOf(saleD.body.workOrderId))?.nocharge, true);
    same("د٦. **والحلقةُ تدخل التصنيع بكلفةٍ صفر صادقة**",
      (await q(`SELECT status, agreed_cost::int ac FROM patient_device_episodes WHERE id=$1`,
        [saleD.body.deviceEpisodeId]))[0], { status: "in_manufacturing", ac: 0 });

    // ══════════════════════════════════════════════════════════════════
    //  (هـ) التكرار والتزامن — لا مالَ مرّتين ولا أمرَ ثانٍ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. التكرار والتزامن ──");
    //  (هـ١) **إعادةُ الإرسال على الحلقة نفسِها** — استئنافُ حلقةٍ باعها
    //  البيعُ الأصليّ بالفعل (`epA` من القسم أ، صارت `in_manufacturing` لا
    //  `awaiting_exam`) يُردّ ٤٠٩ الآن — نفسُ هويّة الحلقة، معنىً جديد.
    const retryA = await sale({
      patientId: pA, existingEpisodeId: epA, expertUserId: EXPERT,
      originalPrice: 300_000, discountAmount: 0,
    });
    check(retryA.status === 409, "هـ١. **إعادةُ الإرسال على الحلقة نفسِها تُردّ ٤٠٩**",
      JSON.stringify(retryA.body));
    const mA2 = await moneyOf(pA);
    same("هـ٢. **ولا دينارَ ثانٍ ولا أمرَ ثانٍ**",
      [mA2.total, mA2.ledger_rows, mA2.orders],
      [300_000, 1, 1]);

    //  (هـ٣) **ضغطتان متزامنتان على بيعٍ جديد** — واحدةٌ تكتب والأخرى تُردّ.
    const pE = await mkPatient("تزامن البيع");
    await mkCase(pE);
    const bodyE = {
      patientId: pE, component: "knee", expertUserId: EXPERT, originalPrice: 120_000,
      discountAmount: 0,
    };
    const raceE = await Promise.all([sale(bodyE), sale(bodyE)]);
    same("هـ٣. **ضغطتان ⟶ نجاحٌ واحد**",
      raceE.filter((r) => r.status === 201).length, 1);
    const mE = await moneyOf(pE);
    same("هـ٤. **وقيدُ كلفةٍ واحد وأمرٌ واحد**",
      [mE.total, mE.ledger_rows, mE.orders], [120_000, 1, 1]);

    //  (هـ٥) **وضغطتان على الصيانة** — فهرسُ ٠٥١ يمنع أمراً مفتوحاً ثانياً.
    //  بالعقد الحاليّ (المرحلة الثالثة) — التغطيةُ الكاملة للتزامن في
    //  `server/simplified_maintenance.test.ts` (القسم ل).
    const pF = await mkPatient("تزامن الصيانة");
    await mkCase(pF);
    const bodyF = {
      patientId: pF, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "tube", legacyUnrecordedDevice: true,
      originalPrice: 30_000, discountAmount: 0,
    };
    const raceF = await Promise.all([maint(bodyF), maint(bodyF)]);
    same("هـ٥. **وصيانتان متزامنتان ⟶ واحدةٌ تمرّ**",
      raceF.filter((r) => r.status === 201).length, 1);
    const mF = await moneyOf(pF);
    same("هـ٦. **وأجرٌ واحد وأمرٌ واحد**",
      [mF.total, mF.ledger_rows, mF.orders], [30_000, 1, 1]);

    // ══════════════════════════════════════════════════════════════════
    //  (و) «تمت المراجعة» اعترافٌ لا إذن — خاصّيةُ نقطة المراجعة نفسِها
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **(المرحلة الرابعة)** — بيعُ الجزء لم يعد يُنشئ سجلَّ مراجعةٍ
    //  ليُقرّ الطبيبُ بشأنه، فهذا القسمُ يزرع سجلّاً **بالشكل الذي كان
    //  ينتجه المسارُ الاسترجاعيّ القديم** (محاكاةً لسجلٍّ تاريخيّ حيّ في
    //  الإنتاج اليوم) ليثبت أن الإقرارَ عليه **لا يزال** لا يحرّك ديناراً —
    //  خاصّيةٌ في `POST /api/medical-review/requests/:id/decide` نفسِها،
    //  مستقلّةٌ تماماً عمّن أو ماذا أنشأ السجلّ.
    console.log("\n── و. «تمت المراجعة» اعترافٌ لا إذن (على سجلٍّ تاريخيّ محاكًى) ──");
    const pW = await mkPatient("سجلّ مراجعةٍ محاكًى");
    const caseW = await mkCase(pW);
    const { episodeId: epW, workOrderId: woW } = await mkOperationalOnly(pW, caseW, "knee");
    const [revW] = await q<{ id: number }>(
      `INSERT INTO medical_review_requests
         (patient_id, service_type, case_id, branch_id, device_episode_id, work_order_id,
          requested_path, review_kind, reception_note, created_by, status)
       VALUES ($1,'prosthetic',$2,1,$3,$4,'quick','other','بيع بلا معاينة — القالب — محاكاةٌ تاريخية',
               $5,'pending') RETURNING id`,
      [pW, caseW, epW, woW, RECV]);
    const beforeAck = await moneyOf(pW);
    const ordBeforeAck = await orderOf(woW);
    const ack = await http("POST", `/api/medical-review/requests/${revW.id}/decide`,
      S.doc, { decision: "approve" });
    check(ack.status === 200, "و١. **الطبيبُ يؤشّر «تمت المراجعة»**",
      JSON.stringify(ack.body));
    same("و٢. **ولا كلفةَ تغيّرت ولا قيدَ زِيد أو نُقص**",
      (({ total, case_cost, ledger, ledger_rows }) => [total, case_cost, ledger, ledger_rows])(
        await moneyOf(pW)),
      [beforeAck.total, beforeAck.case_cost, beforeAck.ledger, beforeAck.ledger_rows]);
    same("و٣. **ولا أمرُ التصنيع تغيّر**",
      await orderOf(woW), ordBeforeAck);
    same("و٤. **ولا معاينةَ أُنشئت**",
      (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pW]))[0].n, 0);
    same("و٥. **ولا مسارُ الحلقة تغيّر**",
      (await q(`SELECT service_path FROM patient_device_episodes WHERE id=$1`, [epW]))[0]
        .service_path, "no_exam");

    // ══════════════════════════════════════════════════════════════════
    //  (ز) الصفوفُ الموروثة — تبقى، ويُنهيها الاستقبالُ لا الطبيب
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. الصفوفُ الموروثة ──");
    //  صفٌّ موروثٌ يُحقَن كما لو أُنشئ قبل التغيير: عمليةٌ وقعت وأمرُها قائم
    //  ومالُها لم يُقيَّد بعد. **ولا ترحيلَ يلمسه.**
    const pG = await mkPatient("صفٌّ موروث");
    const caseG = await mkCase(pG);
    const { episodeId: epG, workOrderId: woG } = await mkOperationalOnly(pG, caseG, "adapter");
    const legacyCharge = (await q(`INSERT INTO pending_service_charges
        (patient_id, branch_id, case_id, device_episode_id, work_order_id, service_type,
         operation_kind, requested_item, sale_expert_user_id, amount, status,
         created_by, created_by_name)
       VALUES ($1,1,$2,$3,$4,'prosthetic','device_sale','adapter',$5,180000,
               'pending_review',$6,'ريام') RETURNING id`,
    [pG, caseG, epG, woG, EXPERT, RECV]))[0].id;
    const legacyBefore = await chargeRow(legacyCharge);

    //  (ز١) **لا شيءَ مسّه** — لا حذفٌ ولا اعتمادٌ تلقائيّ ولا قيد.
    same("ز١. **الصفُّ الموروث باقٍ كما هو** — بمبلغه وحالته وبلا تطبيق",
      [legacyBefore?.status, legacyBefore?.amount, legacyBefore?.applied_at],
      ["pending_review", 180_000, null]);
    same("   ولا مالَ قُيِّد له", (await moneyOf(pG)).ledger_rows, 0);

    //  (ز٢) **ويظهر في الطابور للاستقبال ومديرِ الفرع والمسؤول**.
    for (const [s, who] of [[S.recv, "الاستقبال"], [S.manager, "مديرُ الفرع"],
      [S.admin, "المسؤول"]] as any[]) {
      const list = await http("GET", "/api/no-exam/review", s);
      check((list.body?.rows ?? []).some((r: any) => r.id === legacyCharge),
        `ز٢. ويراه ${who}`, JSON.stringify(list.status));
    }
    //  (ز٣) **ولا يراه الطبيبُ بدوره** — خرج من هذا المسار.
    const docList = await http("GET", "/api/no-exam/review", S.doc);
    same("ز٣. **ولا يراه الطبيبُ بدوره** — لا صفوفَ له", docList.body?.rows ?? [], []);
    //  ولا فرعٌ آخر.
    const otherList = await http("GET", "/api/no-exam/review", S.recvOther);
    check(!(otherList.body?.rows ?? []).some((r: any) => r.id === legacyCharge),
      "   ولا استقبالُ فرعٍ آخر");

    //  (ز٤) **والطبيبُ يُردّ ٤٠٣ إن حاول الإكمال** — لا معتمِدَ طبّيّ.
    const docApprove = await http("POST",
      `/api/no-exam/charges/${legacyCharge}/approve`, S.doc, {});
    same("ز٤. **والطبيبُ يُردّ ٤٠٣ عند محاولة الإكمال**", docApprove.status, 403);
    same("   ولا دينارَ تحرّك", (await moneyOf(pG)).ledger_rows, 0);
    //  والمحاسبُ كذلك — إكمالُ الموروث خارجَ صلاحيته (خلافاً لبيع الجزء الجديد).
    same("   والمحاسبُ يُردّ",
      (await http("POST", `/api/no-exam/charges/${legacyCharge}/approve`, S.acc, {})).status, 403);
    //  **واستقبالُ فرعٍ آخر يُردّ** — النطاقُ من صفّ العملية.
    same("ز٥. **واستقبالُ فرعٍ آخر يُردّ ٤٠٣**",
      (await http("POST", `/api/no-exam/charges/${legacyCharge}/approve`,
        S.recvOther, {})).status, 403);

    //  (ز٦) **والاستقبالُ يُنهيه — ويُقيَّد المالُ مرّةً واحدة**.
    const finA = await http("POST", `/api/no-exam/charges/${legacyCharge}/approve`,
      S.recv, {});
    check(finA.status === 200, "ز٦. **والاستقبالُ يُنهيه**", JSON.stringify(finA.body));
    const mG = await moneyOf(pG);
    same("ز٧. **ويُقيَّد المبلغُ مرّةً واحدة بالضبط**",
      [mG.total, mG.case_cost, mG.ledger, mG.ledger_rows],
      [180_000, 180_000, 180_000, 1]);
    same("   ولا أمرَ تصنيعٍ ثانٍ", mG.orders, 1);
    const afterFin = await chargeRow(legacyCharge);
    same("ز٨. **والصفُّ صار معتمَداً مطبَّقاً على أمرِ عمله**",
      [afterFin?.status, afterFin?.applied_work_order_id], ["approved", woG]);
    //  (ز٩) **وضغطةٌ ثانية تُردّ بلا دينار ثانٍ**.
    const finTwice = await http("POST", `/api/no-exam/charges/${legacyCharge}/approve`,
      S.recv, {});
    check(finTwice.status === 409, "ز٩. **وضغطةٌ ثانية تُردّ ٤٠٩**",
      JSON.stringify(finTwice.body));
    same("   ولا قيدَ ثانٍ", (await moneyOf(pG)).ledger_rows, 1);

    //  (ز١٠) **والإعادةُ للتصحيح ما زالت تعمل** — بسببٍ إلزاميّ ولا دينار.
    const pH = await mkPatient("موروثٌ يُعاد");
    const caseH = await mkCase(pH);
    const { episodeId: epH, workOrderId: woH } = await mkOperationalOnly(pH, caseH, "foot");
    void epH;
    const legacy2 = (await q(`INSERT INTO pending_service_charges
        (patient_id, branch_id, case_id, device_episode_id, work_order_id, service_type,
         operation_kind, requested_item, sale_expert_user_id, amount, status,
         created_by, created_by_name)
       VALUES ($1,1,$2,$3,$4,'prosthetic','device_sale','foot',$5,90000,
               'pending_review',$6,'ريام') RETURNING id`,
    [pH, caseH, epH, woH, EXPERT, RECV]))[0].id;
    same("ز١٠. **والإعادةُ بلا سببٍ تُردّ ٤٠٠**",
      (await http("POST", `/api/no-exam/charges/${legacy2}/return`, S.recv,
        { reason: "  " })).status, 400);
    const ret = await http("POST", `/api/no-exam/charges/${legacy2}/return`, S.manager,
      { reason: "المبلغ المتفق عليه ٧٥ ألفاً" });
    check(ret.status === 200, "ز١١. **ومديرُ الفرع يُعيدها بسببها**", JSON.stringify(ret.body));
    same("   ولا دينارَ تحرّك", (await moneyOf(pH)).ledger_rows, 0);
    //  والتصحيحُ وإعادةُ الإرسال ثمّ الإكمال — المسارُ كاملاً بلا طبيب.
    const resub = await http("POST", `/api/no-exam/charges/${legacy2}/resubmit`, S.recv2,
      { amount: 75_000, note: "صُحِّح" });
    check(resub.status === 200, "ز١٢. **وزميلٌ في الفرع يصحّح ويعيد الإرسال**",
      JSON.stringify(resub.body));
    const finH = await http("POST", `/api/no-exam/charges/${legacy2}/approve`, S.recv, {});
    check(finH.status === 200, "ز١٣. **ثمّ يُكمَل**", JSON.stringify(finH.body));
    const mH = await moneyOf(pH);
    same("ز١٤. **ويُقيَّد المبلغُ المصحَّح وحده مرّةً واحدة**",
      [mH.total, mH.ledger, mH.ledger_rows], [75_000, 75_000, 1]);
    const evH = await eventsOf(legacy2);
    same("ز١٥. **والرحلةُ كاملةٌ سطراً سطراً**",
      evH.map((e: any) => e.event_type), ["returned", "corrected", "resubmitted", "approved"]);

    // ══════════════════════════════════════════════════════════════════
    //  (ح) حارسُ الجهاز الكامل — عند فتح الطلب وعند البيع معاً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حارسُ الجهاز الكامل ──");
    const pI = await mkPatient("طرف كامل");
    await mkCase(pI);
    const fullEp = await startNoExam(pI, "prosthetic", "full_device");
    same("ح١. **الطرفُ الكاملُ يُردّ ٤٠٠ عند فتح الطلب**",
      [fullEp.status, fullEp.body?.error],
      [400, noExamSaleRefusal("prosthetic", "full_device")]);
    const pJ = await mkPatient("مسند كامل", { support: true });
    await mkCase(pJ, "medical_support");
    same("ح٢. **والمسندُ الكاملُ كذلك**",
      (await startNoExam(pJ, "medical_support", "full_device")).status, 400);
    same("   ولا حلقةَ ولا مالَ لأيٍّ منهما",
      [(await moneyOf(pI)).ledger_rows, (await moneyOf(pJ)).ledger_rows], [0, 0]);
    //  **وحلقةٌ موروثة بجهازٍ كامل تُردّ عند البيع** — ٤٠٩ بلا دينار، عبر
    //  استئنافٍ صريح بمعرّفها (المرحلة الرابعة).
    const caseI = (await q(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
      [pI]))[0].id;
    const legacyFullEp = (await q(`INSERT INTO patient_device_episodes
        (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
         requested_item, component, service_path, created_at, updated_at)
       VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',NULL,'no_exam',NOW(),NOW())
       RETURNING id`, [pI, caseI]))[0].id;
    const legacyFullSale = await sale({
      patientId: pI, existingEpisodeId: legacyFullEp, expertUserId: EXPERT,
      originalPrice: 1_500_000, discountAmount: 0,
    });
    check(legacyFullSale.status === 409,
      "ح٣. **والموروثةُ تُردّ ٤٠٩ عند البيع**", JSON.stringify(legacyFullSale.body));
    check(String(legacyFullSale.body?.error ?? "").includes("الجهازُ الكاملُ لا يُباع من هنا"),
      "   برسالةٍ تدلّ على مسار المعاينة", String(legacyFullSale.body?.error));
    same("   ولا دينارَ ولا أمر",
      (({ ledger_rows, orders }) => [ledger_rows, orders])(await moneyOf(pI)), [0, 0]);

    // ══════════════════════════════════════════════════════════════════
    //  (ط) العلاجُ الطبيعي معزولٌ تماماً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. العلاجُ الطبيعي معزول ──");
    const pK = await mkPatient("علاج طبيعي");
    await mkCase(pK, "physiotherapy");
    same("ط١. **ولا بيعَ بلا معاينة لعلاجٍ طبيعي**",
      (await sale({
        patientId: pK, component: "knee", expertUserId: EXPERT,
        originalPrice: 10_000, discountAmount: 0,
      })).status, 400);
    same("ط٢. **ولا صيانة** (بالعقد الحاليّ)",
      (await maint({
        patientId: pK, serviceType: "physiotherapy", expertUserId: EXPERT,
        maintenanceComponent: null, legacyUnrecordedDevice: true,
        originalPrice: 10_000, discountAmount: 0,
      })).status, 400);
    same("ط٣. ولا مالَ ولا سجلَّ مراجعة", await moneyOnly(pK), ZERO_MONEY_ONLY);
    //  **والقيدُ في القاعدة يمنعه** ولو التُفَّ على النقطة.
    const physBlocked = await q(`SELECT 1 FROM pg_constraint WHERE conname='psc_service_check'`);
    check(physBlocked.length === 1, "ط٤. **والقيدُ في القاعدة باقٍ**");
    //  **ولا حرفَ تغيّر في تسعير العلاج الطبيعي** — حارسٌ معماريّ.
    {
      const pricing = readFileSync(join(process.cwd(), "shared/pricing.ts"), "utf8");
      const ns = readFileSync(join(process.cwd(), "server/new_service/store.ts"), "utf8");
      check(!/pending_service_charges|pendingServiceCharge|no-exam/.test(pricing),
        "ط٥. ولا ذكرَ لهذا المسار في تسعير العلاج الطبيعي");
      check(!/pending_service_charges|pendingServiceCharge|no-exam/.test(ns),
        "   ولا في «خدمة جديدة»");
    }

    // ══════════════════════════════════════════════════════════════════
    //  (ي) حذفُ المريض ودمجُه — القاعدةُ الملزمة في CLAUDE.md
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. حذفُ المريض ودمجُه ──");
    const pL = await mkPatient("يُحذف كاملاً");
    await mkCase(pL);
    await sale({
      patientId: pL, component: "silicone", expertUserId: EXPERT,
      originalPrice: 50_000, discountAmount: 0,
    });
    const del = await http("DELETE", `/api/patients/${pL}`, S.admin,
      { reason: "اختبار الحذف الكامل" });
    check(del.status === 200 || del.status === 204, "ي١. **الحذفُ الناعم يمرّ**",
      JSON.stringify(del.body));
    //  **والهدمُ بعد انقضاء المهلة** — بابُه الوحيد، ومهلتُه تُقاس بساعة
    //  القاعدة. فتُقدَّم هنا صراحةً بدل انتظار ثلاثين يوماً.
    //  والقيدُ `restore_until > deleted_at` يبقى محفوظاً — فيُزاح الاثنان معاً
    //  إلى الماضي، لا تُكسَر الصيغةُ لتقصير المهلة.
    await q(`UPDATE patients SET deleted_at = NOW() - INTERVAL '40 days',
                                 restore_until = NOW() - INTERVAL '10 days'
              WHERE id=$1`, [pL]);
    const purge = await http("POST", `/api/patient-trash/${pL}/purge`, S.admin,
      { reason: "اختبار الهدم النهائي" });
    check(purge.status === 200 || purge.status === 204,
      "ي٢. **والهدمُ النهائيُّ يمرّ بلا انكسار كاسكيد**", JSON.stringify(purge.body));
    same("ي٣. ولا صفَّ باقٍ للمريض",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [pL]))[0].n, 0);

    // ══════════════════════════════════════════════════════════════════
    //  (ك) عقدُ الشاشات — الطابورُ الموروث فقط (النافذةُ ذاتُها في
    //  server/component_sale.test.ts، القسم "س")
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. عقدُ الشاشات ──");
    const DIALOG = readFileSync(join(process.cwd(),
      "client/src/components/NoExamOperationDialog.tsx"), "utf8");
    const REVIEW_PAGE = readFileSync(join(process.cwd(),
      "client/src/pages/NoExamReview.tsx"), "utf8");
    const SIDEBAR = readFileSync(join(process.cwd(),
      "client/src/components/Sidebar.tsx"), "utf8");
    //  تجريدُ التعليقات — فلا يلتقط الشرحُ التاريخيُّ ما نمنعه في الواجهة.
    const strip = (s: string) => s.split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    const dialogCode = strip(DIALOG);

    //  (ك١) **ولا عبارةَ «المال ينتظر الطبيب»** في نافذة العملية.
    for (const banned of ["ينتظر مراجعة", "لم يُقيَّد بعد", "بانتظار اعتماد",
      "طابور مراجعة الطبيب", "حتى يعتمده"]) {
      check(!dialogCode.includes(banned),
        `ك١. **ولا «${banned}» في نافذة العملية**`);
    }
    check(dialogCode.includes("ويُقيَّد") && dialogCode.includes("المبلغُ النهائيّ"),
      "ك٢. **بل تقول إن المبلغ النهائيّ يُقيَّد معاً** (بلا مراجعةٍ لاحقة)");
    check(dialogCode.includes("COMPONENT_SALE_SUCCESS_MESSAGE"),
      "ك٣. **ورسالةُ نجاح بيع الجزء من المصدر المشترك** — لا نصَّ منسوخ (المرحلة الرابعة)");
    check(!dialogCode.includes("SAVED_PENDING_MESSAGE")
      && !dialogCode.includes("SAVED_CHARGED_MESSAGE")
      && !dialogCode.includes("SAVED_NO_CHARGE_MESSAGE"),
    "   ولا أثرَ لرسائل «بلا معاينة» القديمة (charged/no-charge) في هذا الملفّ بعد اليوم");

    //  (ك٤) **وتحديثُ كلّ ما تغيّر** — بطاقةُ التصنيع والمحاسبةُ والملفّ.
    for (const key of ["/device-episodes", "/pending-charges",
      "/api/manufacturing/patient/${patientId}/orders", "/api/patients/${patientId}",
      "/api/medical/pending"]) {
      check(dialogCode.includes(key), `ك٤. ويُحدَّث «${key}»`);
    }

    //  (ك٥) **والطابورُ الموروث بعنوانه، وخارجَ قائمة الطبيب**.
    check(REVIEW_PAGE.includes("LEGACY_QUEUE_TITLE") && !REVIEW_PAGE.includes("REVIEW_QUEUE_TITLE"),
      "ك٥. **وصفحةُ الطابور بعنوانها الموروث**");
    const sidebarLine = SIDEBAR.split("\n").find((l) => l.includes('href: "/no-exam-review"')) ?? "";
    check(sidebarLine.includes("LEGACY_QUEUE_TITLE"),
      "ك٦. **وبندُ القائمة بالعنوان نفسِه**", sidebarLine.trim());
    check(!sidebarLine.includes('"doctor"'),
      "ك٧. **وخرج من أدوار الطبيب في القائمة**", sidebarLine.trim());
    check(sidebarLine.includes('"reception"') && sidebarLine.includes('"branch_manager"'),
      "ك٨. وصار للاستقبال ومدير الفرع", sidebarLine.trim());
    check(/noExamReviewBypass = item\.href === "\/no-exam-review"\s*&&\s*permissions\.canAddPatients/
      .test(strip(SIDEBAR)),
    "ك٩. **ومخرجُه `canAddPatients` لا `canWriteMedicalExam`**");

    // ══════════════════════════════════════════════════════════════════
    //  (م) ثوابتُ `ensureReviewRouting` — تخدم مسارَ المعاينة اليوم
    // ══════════════════════════════════════════════════════════════════
    //  ⚠ **(المرحلة الرابعة)** — كان هذا القسمُ يحاكي فشلاً عابراً في
    //  توجيه المراجعة الاسترجاعية لبيع الجزء (محاولتان ثمّ تحذيرٌ صادق) عبر
    //  بوّابةِ فشلٍ مصطنعة في القاعدة. **وبيعُ الجزء لم يعد ينادي
    //  `ensureReviewRouting`/`routeServiceToDoctorReview` إطلاقاً** — فآليّةُ
    //  «محاولتان ثمّ تحذير» بكاملها تقاعدت معه، ولا سيناريو حيّ يستدعيها من
    //  هذا الباب بعد اليوم (يحرسه القسم "الحارسُ المعماريّ" أدناه، وتفصيلُ
    //  التقاعد في `server/component_sale.test.ts`).
    //
    //  وما بقي حقيقياً: `ensureReviewRouting` **نفسُها** ما زالت الدالّةَ
    //  القانونية التي يستعملها **مسارُ المعاينة** (توجيهُ المعاينة الكاملة
    //  الإلزاميّ عند فتح جهازٍ جديد، القسم الأوّل من هذا الملفّ تاريخياً) —
    //  فتفرّدُها على المرساة (لا يكتب صفّاً ثانياً لنداءٍ مكرَّر) يبقى خاصّيةً
    //  حقيقيةً تستحقّ حراسة، بمُدخَلاتٍ مزروعةٍ بالـSQL بدل الشكل القديم ذي
    //  النداءين.
    console.log("\n── م. ثوابتُ ensureReviewRouting (تخدم مسار المعاينة) ──");
    same("م١. **والصيانةُ لا تُنشئ سجلَّ مراجعةٍ إطلاقاً** — لا بوّابةَ فشلٍ تعنيها",
      (await (async () => {
        const pO = await mkPatient("صيانةٌ بلا سجلّ مراجعة");
        await mkCase(pO);
        const r = await maint({
          patientId: pO, serviceType: "prosthetic", expertUserId: EXPERT,
          maintenanceComponent: "foot", legacyUnrecordedDevice: true,
          originalPrice: 20_000, discountAmount: 0,
        });
        const m = await moneyOf(pO);
        return [r.status, m.total, m.ledger_rows, m.orders, m.reviews];
      })()), [201, 20_000, 1, 1, 0]);
    {
      const { ensureReviewRouting } = await import("./medical_review/store");
      const pP = await mkPatient("تفرّدُ السجلّ");
      const caseP = await mkCase(pP);
      const { episodeId: epP, workOrderId: woP } = await mkOperationalOnly(pP, caseP, "tube");
      await q(`INSERT INTO medical_review_requests
          (patient_id, service_type, case_id, branch_id, device_episode_id, work_order_id,
           requested_path, review_kind, reception_note, created_by, status)
         VALUES ($1,'prosthetic',$2,1,$3,$4,'quick','other','زرعٌ مباشر لاختبار التفرّد',
                 $5,'pending')`,
      [pP, caseP, epP, woP, RECV]);
      const before = (await q(
        `SELECT count(*)::int n FROM medical_review_requests WHERE patient_id=$1`, [pP]))[0].n;
      same("م٢. **صفٌّ واحدٌ مزروع**", before, 1);
      const again = await ensureReviewRouting({
        patientId: pP, serviceType: "prosthetic", reviewKind: "other",
        requestedPath: "quick", receptionNote: "نداءٌ مكرَّر",
        deviceEpisodeId: epP, workOrderId: woP, createdBy: RECV, branchIds: [1],
      });
      same("م٣. **ونداءٌ ثانٍ بنفس المرساة لا يكتب شيئاً**", again.created, false);
      same("م٤. **ويبقى صفٌّ واحد** — لا ازدواج",
        (await q(`SELECT count(*)::int n FROM medical_review_requests WHERE patient_id=$1`,
          [pP]))[0].n, 1);
    }

    // ══════════════════════════════════════════════════════════════════
    //  (ن) بيعُ الجزء لا يصل طابورَ الطبيب إطلاقاً؛ وصياغةُ الصفحة التاريخية
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. بطاقةُ المشرف: غيابُ بيع الجزء والصيانة معاً ──");
    //  **(المرحلة الرابعة)** — بيعُ جزءٍ جديد لا يصل طابورَ «مراجعة حركة
    //  مرضى الأطراف والمساند» إطلاقاً بعد اليوم — كالصيانة تماماً (المرحلة
    //  الثالثة). فالإثباتُ الصحيح غيابُهما معاً، لا حضورُهما.
    const pQ = await mkPatient("بطاقةُ بيع جزء");
    await mkCase(pQ);
    await sale({
      patientId: pQ, component: "silicone", expertUserId: EXPERT,
      originalPrice: 90_000, discountAmount: 0,
    });
    const queue = await http("GET", "/api/medical-review/queue", S.doc);
    const cardQ = (queue.body?.rows ?? []).find((r: any) => r.patientId === pQ);
    same("ن١. **بيعُ الجزء لا يصل طابورَ الطبيب إطلاقاً** — لا سجلَّ له",
      Boolean(cardQ), false);
    const cardB = (queue.body?.rows ?? []).find((r: any) => r.patientId === pB);
    same("ن٢. **وصيانةُ `pB` كذلك لا تصل طابورَ الطبيب** — لا سجلَّ لها",
      Boolean(cardB), false);

    //  **وعقدُ الشاشة التاريخيّ لصفحة المراجعة لم يُمَسّ** — يخدم السجلّاتِ
    //  الحيّةَ من مسار المعاينة والسجلّاتِ التاريخيةَ من بيع الجزء (ما قبل
    //  المرحلة الرابعة) على حدٍّ سواء، بلا فرقٍ في العرض.
    const REVIEW_UI = readFileSync(join(process.cwd(),
      "client/src/pages/MedicalReview.tsx"), "utf8");
    const reviewUiCode = REVIEW_UI.split("\n")
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
    check(reviewUiCode.includes("بيع جزء من طرف صناعي — ${part}"),
      "ن٣. **والعنوانُ التاريخيّ «بيع جزء من طرف صناعي — [الجزء]» باقٍ** (لسجلّاتٍ سابقة)");
    check(reviewUiCode.includes("componentLabel(r.episode?.requestedItem)"),
      "ن٤. **بالعناوين المشتركة من العمود المحروس** — لا معجمٍ ثانٍ");
    check(reviewUiCode.includes('from "@shared/prosthetic_parts"'),
      "ن٥. ومن المصدر القانونيّ للأجزاء");
    check(reviewUiCode.includes('purpose === "maintenance") return `${kind} — أمر صيانة`'),
      "ن٦. **وصياغةُ الصيانة كما كانت حرفاً**");
    check(reviewUiCode.includes("return `${kind} — أمر تصنيع`"),
      "ن٧. **والبناءُ الكاملُ على صيغته القديمة**");
    check(!/receptionNote[\s\S]{0,120}(includes|match|split|indexOf)/.test(reviewUiCode),
      "ن٨. **ولا يُنتزَع الجزءُ من `receptionNote` الحرّ**");
    check(!/"component_sale"|'component_sale'/.test(
      readFileSync(join(process.cwd(), "shared/medical_review.ts"), "utf8")),
    "ن٩. **ولا قيمةٌ جديدة أُضيفت إلى `REVIEW_KINDS`**");

    //  ── وعقدُ نافذة بيع الجزء: بلا صياغةِ تحذيرِ مراجعةٍ بعد اليوم ──
    check(!dialogCode.includes("reviewFailedCopy") && !dialogCode.includes("reviewRouted"),
      "ن١٠. **ولا صياغةَ تحذيرٍ لفشل مراجعةٍ في النافذة** — لا مراجعةَ تُحاوَل أصلاً");

    console.log("\n── الحارسُ المعماريّ ──");
    //  (ل) **ولا محاسبةَ ثانية في منسّق العمليات** — الكُتّابُ القانونيّون وحدهم.
    check(!/INSERT\s+INTO\s+cost_entries/i.test(PENDING_STORE),
      "ل١. **ولا `INSERT INTO cost_entries` في منسّق العمليات**");
    check(!/UPDATE\s+patients[\s\S]{0,80}total_cost/i.test(PENDING_STORE),
      "ل٢. ولا لمسَ `total_cost` مباشرةً");
    check(PENDING_STORE.includes("applyDeviceSaleFinancialsTx"),
      "ل٣. **بل ينادي `applyDeviceSaleFinancialsTx`** للبيع");
    check(PENDING_STORE.includes("startDeviceEpisodeTx"),
      "ل٣.ب **(المرحلة الرابعة) وينادي `startDeviceEpisodeTx` القانونية لفتح الحلقة**"
      + " — لا SQL حلقاتٍ منسوخة");
    //  ⚠ **(المرحلة الثالثة، ٢٠٢٦-٠٨-٢٨)** — `createMaintenanceOperation`
    //  تحوّلت من عقدٍ خامٍ (`amount: number | null`) إلى شروطٍ تجاريةٍ
    //  مُهيكَلة (`originalPrice`/`priceKind`/`finalPrice`، مُشتقّةٌ بـ
    //  `deriveMaintenanceOffer` قبل الوصول إلى هذه الدالّة أصلاً). والفحصُ
    //  هنا يتبع الشكلَ الجديد بحرفه — والجوهرُ لم يتغيّر: الأجرُ الحقيقيّ
    //  يصل الكاتبَ القانونيّ نفسَه، لا صفراً ملفَّقاً. التفصيلُ في
    //  `server/simplified_maintenance.test.ts`.
    check(PENDING_STORE.includes("createMaintenanceOrderWithVisit")
      && PENDING_STORE.includes("cost: p.finalPrice"),
    "ل٤. **ويمرّر المبلغَ النهائيّ إلى الكاتب القانونيّ للصيانة**");
    //  (ل٥) **ولا `INSERT INTO pending_service_charges` في مسار الإنشاء**.
    check(!/INSERT INTO pending_service_charges/i.test(PENDING_STORE),
      "ل٥. **ولا صفَّ معلَّقٌ يُكتب في المخزن إطلاقاً** — لا مسارَ يعيده");
    check(!PENDING_STORE.includes("insertCharge"),
      "   ولا دالّةُ كتابته باقيةٌ ميتة");
    //  (ل٦) **(المرحلة الرابعة) ولا مراجعةَ استرجاعيةً لبيع الجزء بعد اليوم**
    //  — لا تعريفَ للدالّة ولا نداءَ فعليّاً في أيٍّ من الملفّين.
    check(!/(async )?function routeRetrospectiveReview/.test(CHARGE_ROUTES)
      && !/await routeRetrospectiveReview\(/.test(CHARGE_ROUTES),
      "ل٦. **ولا `routeRetrospectiveReview` — لا تعريفَ ولا نداء — في نقاط بيع الجزء**");
    check(!PENDING_STORE.includes("routeServiceToDoctorReview")
      && !CHARGE_ROUTES.includes("import { routeServiceToDoctorReview }"),
    "   ولا استيرادَ لـ`routeServiceToDoctorReview` في أيّ من الملفّين لأجل بيع الجزء");
    //  (ل٧) **ولا معاينةَ تُنشأ من هذا المسار**.
    check(!/INSERT INTO medical_exams|insertExam|createExam/.test(CHARGE_ROUTES)
      && !/INSERT INTO medical_exams/.test(PENDING_STORE),
    "ل٧. **ولا معاينةَ تُنشأ من منسّق العمليات**");
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
