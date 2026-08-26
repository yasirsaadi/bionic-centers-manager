// **عملياتُ «بلا معاينة»** — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:pending-charge`.
//
// ══ الثابتُ الذي يحرسه (قرارُ المالك — يُلغي ما قبله) ══════════════════════
// **العمليةُ والمالُ يمضيان من الاستعلامات، والطبيبُ يراجع الحركةَ إشرافياً
// فقط.**
//
// وما يُثبته هنا، بندَ بندٍ (أ–ل):
//   • **أ–ج**: بيعُ جزءٍ وصيانةُ طرفٍ ومسندٍ بمبلغ ⟶ المالُ يقع **لحظتَه**
//     بالكاتب القانونيّ نفسِه، مرّةً واحدة بالضبط، **وبلا صفٍّ معلَّقٍ واحد**.
//   • **د**: و«بلا أجور» ⟶ عملٌ يكتمل بلا دينار، وسجلٌّ يقول ذلك.
//   • **هـ**: والتكرارُ والتزامنُ ⟶ لا مالَ مرّتين ولا أمرَ ثانٍ ولا سجلَّ ثانٍ.
//   • **و**: و«تمت المراجعة» اعترافٌ ⟶ لا كلفةَ ولا قيدَ ولا أمرَ يتغيّر.
//   • **ز**: والصفوفُ الموروثة تبقى بايتاً بايت، ويُنهيها الاستقبالُ ومديرُ
//     الفرع والمسؤول ضمن نطاقهم — **والطبيبُ يُردّ ٤٠٣**.
//   • **ح**: وحارسُ الجهاز الكامل (٢٥٠) باقٍ في القسمين.
//   • **ط**: والعلاجُ الطبيعي معزولٌ تماماً.
//   • **ي**: وحذفُ المريض الكامل يعمل (القاعدةُ الملزمة في CLAUDE.md).
//   • **ك–ل**: وعقدُ الشاشات والحارسُ المعماريّ — ولا محاسبةَ ثانية.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  parsePendingAmount, canOperateNoExam, canFinalizeLegacyCharge,
  PENDING_CHARGE_STATUSES, PENDING_CHARGE_STATUS_LABELS, PENDING_CHARGE_ACTIONS,
  LEGACY_QUEUE_TITLE, LEGACY_QUEUE_HINT, RETURNED_QUEUE_TITLE,
  SAVED_CHARGED_MESSAGE, SAVED_NO_CHARGE_MESSAGE,
} from "@shared/pending_charge";
import { noExamSaleRefusal } from "@shared/prosthetic_parts";

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

    //  **ورسائلُ الحفظ تقول ما وقع** — ولا «ينتظر» فيها.
    same("٢. **رسالةُ الحفظ بمبلغ**", SAVED_CHARGED_MESSAGE,
      "تم حفظ العملية وتسجيل المبلغ على حساب المريض.");
    same("   ورسالةُ «بلا أجور»", SAVED_NO_CHARGE_MESSAGE, "تم حفظ العملية بلا أجور.");
    for (const bad of ["ينتظر", "بانتظار", "اعتماد", "مراجعة"]) {
      check(!SAVED_CHARGED_MESSAGE.includes(bad) && !SAVED_NO_CHARGE_MESSAGE.includes(bad),
        `   ولا «${bad}» في أيٍّ منهما`);
    }

    //  **والمبلغُ الموجبُ وحده** — والصفرُ ليس «مجّاناً» (قاعدةُ ٠٦٦).
    same("٣. «بلا أجور» ⟶ لا مبلغ",
      parsePendingAmount({ charged: false, amount: 99 }), { ok: true, amount: null });
    same("   والصفرُ يُردّ لا يُقرأ مجّاناً",
      parsePendingAmount({ charged: true, amount: 0 }).ok, false);
    same("   والموجبُ يمرّ",
      parsePendingAmount({ charged: true, amount: 25000 }), { ok: true, amount: 25000 });

    //  ══ **الصلاحية: مَن يسجّل هو مَن يقيّد** ═══════════════════════════
    console.log("\n── ٠.ب الصلاحية: لا معتمِدَ طبّيّ للمال ──");
    check(canOperateNoExam(S.recv as any) && canOperateNoExam(S.manager as any)
      && canOperateNoExam(S.admin as any),
    "٤. **الاستقبالُ ومديرُ الفرع والمسؤول يسجّلون العملية ومبلغَها**");
    check(!canOperateNoExam(S.acc as any) && !canOperateNoExam(S.expert as any),
      "   ولا محاسبَ ولا خبير");
    //  **والطبيبُ بدوره وحده لا يملك مالاً** — ولو حمل `canWriteMedicalExam`.
    check(!canOperateNoExam(S.doc as any),
      "٥. **والطبيبُ بدوره وحده لا يقيّد مالاً** — `canWriteMedicalExam` ليست ماليّة");
    //  **وإكمالُ الموروث بالبوّابة نفسِها حرفاً** — لا ثالثة تنحرف.
    check(PENDING_MODULE.includes("canFinalizeLegacyCharge = canOperateNoExam"),
      "٦. **وإكمالُ الموروث بالبوّابة نفسِها** — لا بوّابةَ ثالثة");
    for (const s of [S.recv, S.manager, S.admin]) {
      check(canFinalizeLegacyCharge(s as any), `   ويُنهيه ${s.displayName}`);
    }
    check(!canFinalizeLegacyCharge(S.doc as any) && !canFinalizeLegacyCharge(S.acc as any),
      "   ولا طبيبَ ولا محاسب");
    //  **ولا أثرَ لـ`mayReviewShape` في المستودع** — السلطةُ الطبيةُ للمال أُزيلت.
    check(!PENDING_MODULE.includes("mayReviewShape"),
      "٧. **ولا `mayReviewShape` باقيةٌ في العقد** — لا شيفرةً ميتة تُغري بالعودة");
    check(!CHARGE_ROUTES.includes("doctorSpecialties"),
      "   ولا اختصاصٌ طبّيٌّ يُقرأ في نقاط المال");

    // ══════════════════════════════════════════════════════════════════
    //  (أ) بيعُ جزءٍ بمبلغ — المالُ يقع لحظتَه
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. بيعُ جزءٍ بمبلغ: العملُ والمالُ معاً ──");
    const pA = await mkPatient("بيع جزء بمبلغ");
    const caseA = await mkCase(pA);
    const epA = (await startNoExam(pA, "prosthetic", "socket")).body?.id;
    same("أ٠. **والمالُ صفرٌ قبل العملية**", await moneyOnly(pA), ZERO_MONEY_ONLY);

    const saleA = await sale({
      patientId: pA, serviceType: "prosthetic", deviceEpisodeId: epA,
      expertUserId: EXPERT, charged: true, amount: 300_000,
    });
    check(saleA.status === 201 && saleA.body?.workOrderId > 0,
      "أ١. **العمليةُ تُسجَّل ويُفتَح أمرُ التصنيع**", JSON.stringify(saleA.body));
    same("أ٢. **ورسالتُها تقول إن المبلغ سُجِّل**", saleA.body?.message, SAVED_CHARGED_MESSAGE);
    same("أ٣. **ولا صفَّ معلَّقٌ في الردّ**", saleA.body?.charge, null);

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
    const [epRowA] = await q(`SELECT status, agreed_cost::int ac FROM
      patient_device_episodes WHERE id=$1`, [epA]);
    same("أ٨. **والحلقةُ في التصنيع بكلفتها المقيَّدة**",
      [epRowA?.status, epRowA?.ac], ["in_manufacturing", 300_000]);
    //  **وأمرُ العمل واحدٌ بخبيره** — ولا ثانيَ.
    same("أ٩. **وأمرُ تصنيعٍ واحد**",
      (await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`,
        [pA]))[0].n, 1);
    const ordA = await orderOf(saleA.body.workOrderId);
    same("   بخبيره وحلقته وغرضه", [ordA?.ex, ordA?.de, ordA?.purpose],
      [EXPERT, epA, "initial_build"]);

    //  ══ **والسجلُّ الاسترجاعيُّ للطبيب** ══════════════════════════════
    same("أ١٠. **وسجلٌّ استرجاعيٌّ واحد للطبيب**", mA.reviews, 1);
    same("   وقد وُجِّه بنجاح", saleA.body?.reviewRouted, true);
    const [revA] = await q(`SELECT service_type st, review_kind rk, requested_path rp,
        status, reception_note note, work_order_id::int wo, device_episode_id::int de
      FROM medical_review_requests WHERE patient_id=$1`, [pA]);
    same("أ١١. **بتصنيفٍ صادقٍ لا مخترَع** — `other` سريعٌ معلَّق",
      [revA?.st, revA?.rk, revA?.rp, revA?.status],
      ["prosthetic", "other", "quick", "pending"]);
    same("   ومربوطٌ بأمرِ العملية وحلقتها", [revA?.wo, revA?.de],
      [saleA.body.workOrderId, epA]);
    for (const frag of ["الأطراف الصناعية", "بيع بلا معاينة", "القالب", "الخبير",
      "300,000", "مسجَّل على حساب المريض"]) {
      check(String(revA?.note ?? "").includes(frag),
        `أ١٢. وحقائقُه إنسانية — «${frag}»`, String(revA?.note));
    }

    // ══════════════════════════════════════════════════════════════════
    //  (ب) صيانةُ أطرافٍ بمبلغ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. صيانةُ أطرافٍ بمبلغ ──");
    const pB = await mkPatient("صيانة أطراف");
    const caseB = await mkCase(pB);
    const maintB = await maint({
      patientId: pB, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "knee", deviceOrigin: "external",
      deviceEpisodeId: null, charged: true, amount: 75_000,
    });
    check(maintB.status === 201 && maintB.body?.workOrderId > 0,
      "ب١. **الصيانةُ تُفتَح بأمرها**", JSON.stringify(maintB.body));
    same("ب٢. ورسالتُها تقول إن المبلغ سُجِّل", maintB.body?.message, SAVED_CHARGED_MESSAGE);
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
    same("ب٦. **وسجلٌّ استرجاعيٌّ بتصنيف الصيانة الصادق**", mB.reviews, 1);
    const [revB] = await q(`SELECT review_kind rk, requested_path rp, reception_note note
      FROM medical_review_requests WHERE patient_id=$1`, [pB]);
    same("   `maintenance` · `quick`", [revB?.rk, revB?.rp], ["maintenance", "quick"]);
    for (const frag of ["الركبة", "صيانة بلا معاينة", "75,000"]) {
      check(String(revB?.note ?? "").includes(frag), `   وفيه «${frag}»`, String(revB?.note));
    }

    // ══════════════════════════════════════════════════════════════════
    //  (ج) صيانةُ مسندٍ بمبلغ — السلوكُ نفسُه
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. صيانةُ مسندٍ بمبلغ ──");
    const pC = await mkPatient("صيانة مسند", { support: true });
    await mkCase(pC, "medical_support");
    const maintC = await maint({
      patientId: pC, serviceType: "medical_support", expertUserId: EXPERT,
      maintenanceComponent: null, deviceOrigin: "center_unrecorded",
      deviceEpisodeId: null, charged: true, amount: 40_000,
    });
    check(maintC.status === 201, "ج١. **صيانةُ المسند تمضي**", JSON.stringify(maintC.body));
    same("ج٢. **ZERO pending charges**",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pC]))[0].n, 0);
    const mC = await moneyOf(pC);
    same("ج٣. **والمالُ فوريٌّ مرّةً واحدة**",
      [mC.total, mC.case_cost, mC.ledger_rows], [40_000, 40_000, 1]);
    same("ج٤. **وسجلٌّ استرجاعيٌّ لطبيب المساند**", mC.reviews, 1);
    const [revC] = await q(`SELECT service_type st, reception_note note
      FROM medical_review_requests WHERE patient_id=$1`, [pC]);
    same("   على اختصاصه هو", revC?.st, "medical_support");
    check(String(revC?.note ?? "").includes("المساند الطبية"),
      "   وبعنوان قسمه", String(revC?.note));

    // ══════════════════════════════════════════════════════════════════
    //  (د) عمليةٌ بلا أجر — عملٌ بلا دينار، وسجلٌّ يقول ذلك
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. بلا أجور: عملٌ بلا دينار ──");
    const pD = await mkPatient("بلا أجور");
    await mkCase(pD);
    const epD = (await startNoExam(pD, "prosthetic", "foam_cover")).body?.id;
    const saleD = await sale({
      patientId: pD, serviceType: "prosthetic", deviceEpisodeId: epD,
      expertUserId: EXPERT, charged: false,
    });
    check(saleD.status === 201 && saleD.body?.workOrderId > 0,
      "د١. **العملُ يبدأ ويكتمل تسجيله**", JSON.stringify(saleD.body));
    same("د٢. ورسالتُها «بلا أجور»", saleD.body?.message, SAVED_NO_CHARGE_MESSAGE);
    same("د٣. **ولا قيدَ ولا كلفةَ ولا دينار**", await moneyOnly(pD),
      { ...ZERO_MONEY_ONLY, reviews: 1 });
    same("د٤. **ولا صفَّ معلَّقاً**",
      (await q(`SELECT count(*)::int n FROM pending_service_charges WHERE patient_id=$1`,
        [pD]))[0].n, 0);
    same("د٥. **و«بلا أجر» واقعةٌ محفوظةٌ على الأمر**",
      (await orderOf(saleD.body.workOrderId))?.nocharge, true);
    same("د٦. **والحلقةُ تدخل التصنيع بكلفةٍ صفر صادقة**",
      (await q(`SELECT status, agreed_cost::int ac FROM patient_device_episodes WHERE id=$1`,
        [epD]))[0], { status: "in_manufacturing", ac: 0 });
    //  **والسجلُّ الاسترجاعيُّ موجودٌ ويقول «بلا أجور»** — لا يختفي بغياب المال.
    const [revD] = await q(`SELECT reception_note note FROM medical_review_requests
      WHERE patient_id=$1`, [pD]);
    check(String(revD?.note ?? "").includes("بلا أجور"),
      "د٧. **والسجلُّ الاسترجاعيُّ قائمٌ ويقول «بلا أجور»**", String(revD?.note));

    // ══════════════════════════════════════════════════════════════════
    //  (هـ) التكرار والتزامن — لا مالَ مرّتين ولا أمرَ ثانٍ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. التكرار والتزامن ──");
    //  (هـ١) **إعادةُ الإرسال على الحلقة نفسِها** — الهويّةُ تمنع الثاني.
    const retryA = await sale({
      patientId: pA, serviceType: "prosthetic", deviceEpisodeId: epA,
      expertUserId: EXPERT, charged: true, amount: 300_000,
    });
    check(retryA.status === 409, "هـ١. **إعادةُ الإرسال تُردّ ٤٠٩**", JSON.stringify(retryA.body));
    const mA2 = await moneyOf(pA);
    same("هـ٢. **ولا دينارَ ثانٍ ولا أمرَ ثانٍ ولا سجلَّ ثانٍ**",
      [mA2.total, mA2.ledger_rows, mA2.orders, mA2.reviews],
      [300_000, 1, 1, 1]);

    //  (هـ٣) **ضغطتان متزامنتان على بيعٍ جديد** — واحدةٌ تكتب والأخرى تُردّ.
    const pE = await mkPatient("تزامن البيع");
    await mkCase(pE);
    const epE = (await startNoExam(pE, "prosthetic", "knee")).body?.id;
    const bodyE = {
      patientId: pE, serviceType: "prosthetic", deviceEpisodeId: epE,
      expertUserId: EXPERT, charged: true, amount: 120_000,
    };
    const raceE = await Promise.all([sale(bodyE), sale(bodyE)]);
    same("هـ٣. **ضغطتان ⟶ نجاحٌ واحد**",
      raceE.filter((r) => r.status === 201).length, 1);
    const mE = await moneyOf(pE);
    same("هـ٤. **وقيدُ كلفةٍ واحد وأمرٌ واحد وسجلٌّ واحد**",
      [mE.total, mE.ledger_rows, mE.orders, mE.reviews], [120_000, 1, 1, 1]);

    //  (هـ٥) **وضغطتان على الصيانة** — فهرسُ ٠٥١ يمنع أمراً مفتوحاً ثانياً.
    const pF = await mkPatient("تزامن الصيانة");
    await mkCase(pF);
    const bodyF = {
      patientId: pF, serviceType: "prosthetic", expertUserId: EXPERT,
      maintenanceComponent: "tube", deviceOrigin: "external",
      deviceEpisodeId: null, charged: true, amount: 30_000,
    };
    const raceF = await Promise.all([maint(bodyF), maint(bodyF)]);
    same("هـ٥. **وصيانتان متزامنتان ⟶ واحدةٌ تمرّ**",
      raceF.filter((r) => r.status === 201).length, 1);
    const mF = await moneyOf(pF);
    same("هـ٦. **وأجرٌ واحد وأمرٌ واحد**",
      [mF.total, mF.ledger_rows, mF.orders], [30_000, 1, 1]);

    // ══════════════════════════════════════════════════════════════════
    //  (و) اعترافُ الطبيب لا يحرّك ديناراً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. «تمت المراجعة» اعترافٌ لا إذن ──");
    const beforeAck = await moneyOf(pA);
    const ordBeforeAck = await orderOf(saleA.body.workOrderId);
    const ack = await http("POST", `/api/medical-review/requests/${revA.id ?? 0}/decide`,
      S.doc, { decision: "approve" });
    //  المعرّفُ يُقرأ من الصفّ — والنقطةُ القائمة بحرفها.
    const [revARow] = await q(`SELECT id FROM medical_review_requests WHERE patient_id=$1`, [pA]);
    const ack2 = ack.status === 200 ? ack
      : await http("POST", `/api/medical-review/requests/${revARow.id}/decide`,
        S.doc, { decision: "approve" });
    check(ack2.status === 200, "و١. **الطبيبُ يؤشّر «تمت المراجعة»**",
      JSON.stringify(ack2.body));
    same("و٢. **ولا كلفةَ تغيّرت ولا قيدَ زِيد أو نُقص**",
      (({ total, case_cost, ledger, ledger_rows }) => [total, case_cost, ledger, ledger_rows])(
        await moneyOf(pA)),
      [beforeAck.total, beforeAck.case_cost, beforeAck.ledger, beforeAck.ledger_rows]);
    same("و٣. **ولا أمرُ التصنيع تغيّر**",
      await orderOf(saleA.body.workOrderId), ordBeforeAck);
    same("و٤. **ولا معاينةَ أُنشئت**",
      (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [pA]))[0].n, 0);
    same("و٥. **ولا مسارُ الحلقة تغيّر**",
      (await q(`SELECT service_path FROM patient_device_episodes WHERE id=$1`, [epA]))[0]
        .service_path, "no_exam");

    // ══════════════════════════════════════════════════════════════════
    //  (ز) الصفوفُ الموروثة — تبقى، ويُنهيها الاستقبالُ لا الطبيب
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. الصفوفُ الموروثة ──");
    //  صفٌّ موروثٌ يُحقَن كما لو أُنشئ قبل التغيير: عمليةٌ وقعت وأمرُها قائم
    //  ومالُها لم يُقيَّد بعد. **ولا ترحيلَ يلمسه.**
    const pG = await mkPatient("صفٌّ موروث");
    const caseG = await mkCase(pG);
    const epG = (await startNoExam(pG, "prosthetic", "adapter")).body?.id;
    const saleG = await sale({
      patientId: pG, serviceType: "prosthetic", deviceEpisodeId: epG,
      expertUserId: EXPERT, charged: false,
    });
    const woG = saleG.body.workOrderId;
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
    //  والمحاسبُ كذلك.
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
    const epH = (await startNoExam(pH, "prosthetic", "foot")).body?.id;
    const woH = (await sale({
      patientId: pH, serviceType: "prosthetic", deviceEpisodeId: epH,
      expertUserId: EXPERT, charged: false,
    })).body.workOrderId;
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
    //  (ح) حارسُ ٢٥٠ باقٍ — الجهازُ الكاملُ لا يُباع بلا معاينة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حارسُ الجهاز الكامل (٢٥٠) ──");
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
    //  **وحلقةٌ موروثة بجهازٍ كامل تُردّ عند البيع** — ٤٠٩ بلا دينار.
    const caseI = (await q(
      `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
      [pI]))[0].id;
    const legacyFullEp = (await q(`INSERT INTO patient_device_episodes
        (patient_id, case_id, branch_id, sequence_number, status, agreed_cost,
         requested_item, component, service_path, created_at, updated_at)
       VALUES ($1,$2,1,1,'awaiting_exam',0,'full_device',NULL,'no_exam',NOW(),NOW())
       RETURNING id`, [pI, caseI]))[0].id;
    const legacyFullSale = await sale({
      patientId: pI, serviceType: "prosthetic", deviceEpisodeId: legacyFullEp,
      expertUserId: EXPERT, charged: true, amount: 1_500_000,
    });
    same("ح٣. **والموروثةُ تُردّ ٤٠٩ عند البيع**",
      [legacyFullSale.status, legacyFullSale.body?.error],
      [409, noExamSaleRefusal("prosthetic", "full_device")]);
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
        patientId: pK, serviceType: "physiotherapy", deviceEpisodeId: 1,
        expertUserId: EXPERT, charged: true, amount: 10_000,
      })).status, 400);
    same("ط٢. **ولا صيانة**",
      (await maint({
        patientId: pK, serviceType: "physiotherapy", expertUserId: EXPERT,
        maintenanceComponent: null, deviceOrigin: "external",
        deviceEpisodeId: null, charged: true, amount: 10_000,
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
    const epL = (await startNoExam(pL, "prosthetic", "silicone")).body?.id;
    await sale({
      patientId: pL, serviceType: "prosthetic", deviceEpisodeId: epL,
      expertUserId: EXPERT, charged: true, amount: 50_000,
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
    //  (ك) عقدُ الشاشات والحارسُ المعماريّ
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
    check(dialogCode.includes("المبلغ يُسجَّل مباشرةً"),
      "ك٢. **بل تقول إن المبلغ يُسجَّل مباشرةً**");
    check(dialogCode.includes("SAVED_CHARGED_MESSAGE")
      && dialogCode.includes("SAVED_NO_CHARGE_MESSAGE"),
    "ك٣. **ورسالتا الحفظ من المصدر المشترك** — لا نصَّ منسوخ");
    check(!dialogCode.includes("SAVED_PENDING_MESSAGE"),
      "   ولا أثرَ للرسالة القديمة");

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

    console.log("\n── الحارسُ المعماريّ ──");
    //  (ل) **ولا محاسبةَ ثانية في منسّق العمليات** — الكُتّابُ القانونيّون وحدهم.
    check(!/INSERT\s+INTO\s+cost_entries/i.test(PENDING_STORE),
      "ل١. **ولا `INSERT INTO cost_entries` في منسّق العمليات**");
    check(!/UPDATE\s+patients[\s\S]{0,80}total_cost/i.test(PENDING_STORE),
      "ل٢. ولا لمسَ `total_cost` مباشرةً");
    check(PENDING_STORE.includes("applyDeviceSaleFinancialsTx"),
      "ل٣. **بل ينادي `applyDeviceSaleFinancialsTx`** للبيع");
    check(PENDING_STORE.includes("createMaintenanceOrderWithVisit")
      && PENDING_STORE.includes("cost: p.amount ?? 0"),
    "ل٤. **ويمرّر الأجرَ إلى الكاتب القانونيّ للصيانة**");
    //  (ل٥) **ولا `INSERT INTO pending_service_charges` في مسار الإنشاء**.
    check(!/INSERT INTO pending_service_charges/i.test(PENDING_STORE),
      "ل٥. **ولا صفَّ معلَّقٌ يُكتب في المخزن إطلاقاً** — لا مسارَ يعيده");
    check(!PENDING_STORE.includes("insertCharge"),
      "   ولا دالّةُ كتابته باقيةٌ ميتة");
    //  (ل٦) **والسجلُّ الاسترجاعيُّ بعد المعاملة لا داخلها** — إخبارٌ لا بوّابة.
    check(CHARGE_ROUTES.includes("routeRetrospectiveReview")
      && !PENDING_STORE.includes("routeServiceToDoctorReview"),
    "ل٦. **والتوجيهُ في النقطة بعد المعاملة — لا داخل المخزن**");
    check(/catch \(err\) \{[\s\S]{0,200}return \{ routed: false \}/.test(CHARGE_ROUTES),
      "ل٧. **وفشلُه يُبتلَع مسجَّلاً** — لا يُبطل بيعاً وقع");
    //  (ل٨) **ولا معاينةَ تُنشأ من هذا المسار**.
    check(!/INSERT INTO medical_exams|insertExam|createExam/.test(CHARGE_ROUTES)
      && !/INSERT INTO medical_exams/.test(PENDING_STORE),
    "ل٨. **ولا معاينةَ تُنشأ من منسّق العمليات**");
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
