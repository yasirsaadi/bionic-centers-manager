// **سلّةُ المرضى واستعادتُهم خلال ثلاثين يوماً** — حيّاً على Postgres وعلى
// النقاط الحقيقية. قاعدة محلّية: `npm run test:patient-trash`.
//
// ══ الثابتُ الذي يحرسه ═════════════════════════════════════════════════════
// **الحذفُ العاديّ لم يعد يهدم شيئاً.** الملفُّ يخرج من النظام الفعّال، وكلُّ
// صفوفه تبقى كما هي بايتاً، ويعود بضغطةٍ خلال ثلاثين يوماً.
//
// وما يُثبته هنا، بندَ بندٍ (أ–ن):
//   • **لا صفَّ تابعاً يُحذف**: المعرّفاتُ والمبالغُ نفسُها قبل الحذف وبعده.
//   • ويختفي من **ستّةَ عشرَ سطحاً** — قوائمَ وبحثاً وطوابيرَ ومحاسبةً.
//   • ومالُه يخرج من المجاميع الفعّالة **بمقداره بالضبط**، ويعود كما كان.
//   • والاستعادةُ تُعيد **الصفوفَ نفسَها بمعرّفاتها** ورمزَ المريض نفسَه.
//   • وبعد انقضاء المدّة تسقط **الاستعادةُ وحدها** — ولا يُمحى شيءٌ آلياً.
//   • والصلاحيةُ روليّةٌ صريحة، والالتزامُ الماليُّ يرفع القرارَ للمسؤول.
//   • وضغطتان متزامنتان تُنتجان حذفاً واحداً واستعادةً واحدة.
//   • والحذفُ النهائيُّ ينادي الكاسكيدَ المُختبَر نفسَه، مدقَّقاً قبل الهدم.
//   • والدمجُ يرفض ملفّاً في السلّة، ولا يستعيده ضمناً.
//   • ولا رسالةَ واتساب تُرسَل لمحذوف، وصفُّها يبقى `pending` بلا محاولة.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import {
  RESTORE_WINDOW_DAYS, TRASH_TITLE, DELETE_REASON_LABEL, RESTORE_LABEL,
  PURGE_LABEL, RESTORE_EXPIRED_MESSAGE, GLOBAL_ADMIN_REQUIRED_MESSAGE,
  PURGE_BEFORE_EXPIRY_MESSAGE,
  PATIENT_IN_TRASH_ERROR, IN_TRASH_HINT, IN_TRASH_ESCALATION,
  canTrashPatients, canRestorePatients, canPurgePatients,
  requiresGlobalAdmin, globalAdminReasons, daysLeft, isRestorable, parseReason,
  EMPTY_SNAPSHOT,
} from "@shared/patient_trash";

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
const MARK = "اختبار-سلة-المرضى";
const ADMIN = 9951, MGR = 9952, MGR2 = 9953, DOC = 9954, RECV = 9955;
const ACC = 9956, EXPERT = 9957, THERAPIST = 9958, SURVEYOR = 9959, DOC2 = 9960;
const USERS = [ADMIN, MGR, MGR2, DOC, RECV, ACC, EXPERT, THERAPIST, SURVEYOR, DOC2];

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  /** مديرُ الفرع الثاني — لا يمسّ ملفَّ الفرع الأول. */
  mgr2: {
    userId: MGR2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "مدير الفرع الثاني",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  /** طبيبُ فرعٍ آخر — الدورُ يصحّ والنطاقُ لا. */
  doc2: {
    userId: DOC2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. ليلى",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  /**
   * الاستقبالُ — **ومعه `canDeletePatients: true` عمداً**: العَلَمُ القديم
   * لم يعد بابَ هذا المسار، والاختبارُ يثبت أنه لا يفتحه.
   */
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    //  `canAddPayments: true` — الافتراضُ الحقيقيّ لحساب استقبال (مطابقٌ
    //  لعمود `system_users.can_add_payments` الذي قيمتُه الافتراضية
    //  TRUE)، ولازمٌ الآن كي يبلغ طلبُ الدفعة في قسم «ز» حارسَ السلّة
    //  أصلاً بدل أن يُردّ ٤٠٣ من بوّابة الصلاحية قبله.
    permissions: {
      canViewPatients: true, canAddPatients: true, canDeletePatients: true,
      canAddPayments: true,
    },
  },
  acc: {
    userId: ACC, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canManageAccounting: true, canDeletePatients: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير",
    permissions: { canViewPatients: true, canWorkAsExpert: true, canDeletePatients: true },
  },
  therapist: {
    userId: THERAPIST, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المعالج",
    permissions: { canViewPatients: true, canEnterSessions: true, canDeletePatients: true },
  },
  surveyor: {
    userId: SURVEYOR, role: "surveyor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المسّاح",
    permissions: { canViewPatients: true, canDeletePatients: true },
  },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
/** أترفض القاعدةُ هذه الكتابة؟ — يُستعمَل لإثبات قيود CHECK مباشرةً (قسم ع). */
async function violates(text: string, params: any[] = []): Promise<boolean> {
  try { await q(text, params); return false; } catch { return true; }
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

async function mkPatient(label: string, opts: { branch?: number; cost?: number } = {}) {
  const r = await q<{ id: number; patient_code: string }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, total_cost,
       patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,true,$4,'new')
     RETURNING id, patient_code`,
    [`${MARK} ${label}`, MARK, opts.branch ?? 1, opts.cost ?? 0]);
  return r[0];
}
const mkCase = async (patientId: number, caseType = "prosthetic", branch = 1, cost = 0) =>
  (await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$3,$2,$4,'manual','active') RETURNING id`,
    [patientId, caseType, branch, cost]))[0].id;

const del = (id: number, session: any, reason: any = "طلب المالك") =>
  http("DELETE", `/api/patients/${id}`, session, { reason });
const restore = (id: number, session: any) =>
  http("POST", `/api/patient-trash/${id}/restore`, session);
const purge = (id: number, session: any, reason: any = "ملف مكرر مؤكَّد") =>
  http("POST", `/api/patient-trash/${id}/purge`, session, { reason });
const preview = (id: number, session: any) =>
  http("GET", `/api/patient-trash/delete-preview/${id}`, session);
const trashList = (session: any, search?: string) =>
  http("GET", `/api/patient-trash${search ? `?search=${encodeURIComponent(search)}` : ""}`, session);

const trashState = async (id: number) => {
  const [r] = await q(`SELECT deleted_at, restore_until, deleted_by_user_id::int by_user,
      deleted_by_name, deleted_by_role, deleted_reason, deleted_total_cost::int dcost,
      deleted_total_paid::int dpaid, deleted_remaining::int drem,
      deleted_pending_json dpending, deleted_needed_admin dadmin
    FROM patients WHERE id=$1`, [id]);
  return r ?? null;
};

/** **بصمةُ كلّ ما يتبع المريض** — معرّفاتٌ ومبالغُ لا عدَدٌ وحده. */
async function fingerprint(patientId: number) {
  const [r] = await q(`SELECT
      (SELECT COALESCE(json_agg(json_build_object('id',id,'a',amount) ORDER BY id),'[]')
         FROM payments WHERE patient_id=$1) AS payments,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'a',amount) ORDER BY id),'[]')
         FROM cost_entries WHERE patient_id=$1) AS cost_entries,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'c',cost) ORDER BY id),'[]')
         FROM patient_cases WHERE patient_id=$1) AS cases,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'s',status) ORDER BY id),'[]')
         FROM patient_device_episodes WHERE patient_id=$1) AS episodes,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'s',status) ORDER BY id),'[]')
         FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT COALESCE(json_agg(json_build_object('id',id) ORDER BY id),'[]')
         FROM medical_exams WHERE patient_id=$1) AS exams,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'s',status) ORDER BY id),'[]')
         FROM post_exam_followups WHERE patient_id=$1) AS followups,
      (SELECT COALESCE(json_agg(json_build_object('id',id,'s',status) ORDER BY id),'[]')
         FROM pending_service_charges WHERE patient_id=$1) AS charges,
      (SELECT COALESCE(json_agg(json_build_object('id',id) ORDER BY id),'[]')
         FROM visits WHERE patient_id=$1) AS visits,
      (SELECT COALESCE(json_agg(json_build_object('id',id) ORDER BY id),'[]')
         FROM patient_contacts WHERE patient_id=$1) AS contacts,
      (SELECT total_cost::int FROM patients WHERE id=$1) AS total_cost,
      (SELECT patient_code FROM patients WHERE id=$1) AS code`, [patientId]);
  return r;
}

/** المجاميعُ الفعّالة للفرع — من نقطة التقارير الحقيقية. */
const overall = async (session: any) => (await http("GET", "/api/reports/overall", session)).body;

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM pending_service_charge_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  //  وقيودُ اليومية التي أنشأها مستخدمو الاختبار — وإلّا منع مفتاحُها
  //  حذفَ صفوفهم في النهاية.
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE followup_id IN (SELECT id FROM post_exam_followups WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
  await q(`DELETE FROM visits_forensic_log WHERE patient_id IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = visits_forensic_log.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name, branch] of [
    [ADMIN, "admin", "null", "المسؤول", 1],
    [MGR, "branch_manager", "null", "مدير بغداد", 1],
    [MGR2, "branch_manager", "null", "مدير الفرع الثاني", 2],
    [DOC, "doctor", '["prosthetic","medical_support"]', "د. سعد", 1],
    [DOC2, "doctor", '["prosthetic"]', "د. ليلى", 2],
    [RECV, "reception", "null", "ريام", 1],
    [ACC, "accountant", "null", "المحاسب", 1],
    [EXPERT, "prosthetics_expert", "null", "الخبير", 1],
    [THERAPIST, "therapist", "null", "المعالج", 1],
    [SURVEYOR, "surveyor", "null", "المسّاح", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$5,$3,$6,'[1,2]'::jsonb,true,$4::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               medical_specialties=EXCLUDED.medical_specialties,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `pt_u${id}`, role, spec, name, branch]);
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

    // ══ أ. المنطقُ الخالص — العقدُ المشترك ════════════════════════════════
    console.log("\n── أ. العقدُ المشترك (بلا قاعدة) ──");
    same("أ١. المدّةُ ثلاثون يوماً", RESTORE_WINDOW_DAYS, 30);
    same("أ٢. عنوانُ الصفحة «المحذوفات»", TRASH_TITLE, "المحذوفات");
    same("أ٣. «سبب الحذف» و«استعادة» و«حذف نهائي»",
      [DELETE_REASON_LABEL, RESTORE_LABEL, PURGE_LABEL],
      ["سبب الحذف", "استعادة", "حذف نهائي"]);
    check(canTrashPatients({ isAdmin: true }), "أ٤. المسؤولُ العام يحذف");
    check(canTrashPatients({ role: "branch_manager" }), "أ٥. ومديرُ الفرع");
    check(canTrashPatients({ role: "doctor" }), "أ٦. والطبيب");
    check(!canTrashPatients({ role: "reception" }), "أ٧. **ولا الاستقبال**");
    check(!canTrashPatients({ role: "accountant" }), "أ٨. ولا المحاسب");
    check(!canTrashPatients({ role: "prosthetics_expert" }), "أ٩. ولا الخبير");
    check(!canTrashPatients({ role: "therapist" }), "أ١٠. ولا المعالج");
    check(!canTrashPatients({ role: "surveyor" }), "أ١١. ولا المسّاح");
    check(!canTrashPatients({ role: "reception", permissions: { canWriteMedicalExam: true } }),
      "أ١٢. **ولا يفتحها `canWriteMedicalExam`** — تلك صلاحيةٌ سريرية");
    check(!canTrashPatients({ role: "reception", permissions: { canDeletePatients: true } }),
      "أ١٣. ولا العَلَمُ القديم `canDeletePatients`");
    check(canRestorePatients === canTrashPatients, "أ١٤. والاستعادةُ لمن يحذف — الطرفُ نفسُه");
    check(canPurgePatients({ isAdmin: true }) && !canPurgePatients({ role: "branch_manager" })
      && !canPurgePatients({ role: "doctor" }),
      "أ١٥. **والحذفُ النهائيُّ للمسؤول وحده**");
    check(!requiresGlobalAdmin(EMPTY_SNAPSHOT), "أ١٦. ملفٌّ مسدَّدٌ بلا معلَّقات لا يحتاج المسؤول");
    check(requiresGlobalAdmin({ ...EMPTY_SNAPSHOT, remaining: 1 }), "أ١٧. ودَينٌ يحتاجه");
    check(requiresGlobalAdmin({ ...EMPTY_SNAPSHOT, remaining: -1 }),
      "أ١٨. **ورصيدُ المريض كذلك** — كلاهما التزامٌ قائم");
    for (const k of ["pendingCharges", "pendingDiscounts", "pendingPriceRequests",
      "openFollowups", "openSettlements"] as const) {
      check(requiresGlobalAdmin({ ...EMPTY_SNAPSHOT, [k]: 1 }), `أ١٩. و${k} تحتاجه`);
    }
    same("أ٢٠. وأسبابُ الاشتراط تُقال بالعربية",
      globalAdminReasons({ ...EMPTY_SNAPSHOT, remaining: -500 }), ["رصيد للمريض: 500 د.ع"]);
    const now = new Date("2026-08-24T10:00:00Z");
    same("أ٢١. الأيامُ الباقية تُحسَب بالأعلى", daysLeft("2026-08-26T09:00:00Z", now), 2);
    same("أ٢٢. والمنقضيةُ صفر", daysLeft("2026-08-20T09:00:00Z", now), 0);
    check(!isRestorable("2026-08-20T09:00:00Z", now) && isRestorable("2026-09-20T09:00:00Z", now),
      "أ٢٣. و`isRestorable` تتبعها");
    check(parseReason("  ").ok === false && parseReason(" حقيقي ").ok === true,
      "أ٢٤. **والسببُ إلزاميّ** — والفراغُ ليس سبباً");
    same("أ٢٥. ويُشذَّب", (parseReason(" حقيقي ") as any).value, "حقيقي");

    // ══ ب. الصلاحيةُ حيّاً على النقطة ═════════════════════════════════════
    console.log("\n── ب. مَن يحذف ومَن يُردّ ──");
    const p1 = await mkPatient("مسدَّد");
    await mkCase(p1.id);
    for (const [key, label] of [["recv", "الاستقبال"], ["acc", "المحاسب"],
      ["expert", "الخبير"], ["therapist", "المعالج"], ["surveyor", "المسّاح"]] as const) {
      const r = await del(p1.id, S[key]);
      check(r.status === 403, `ب. ${label} يُردّ ٤٠٣ ولو حمل \`canDeletePatients\``,
        `${r.status} ${JSON.stringify(r.body)}`);
    }
    same("ب٦. وبلا سبب ⟶ ٤٠٠", (await del(p1.id, S.mgr, "  ")).status, 400);
    same("ب٧. وبجسمٍ بلا حقلِ سبب ⟶ ٤٠٠",
      (await http("DELETE", `/api/patients/${p1.id}`, S.mgr, {})).status, 400);
    same("ب٨. ومديرُ فرعٍ آخر ⟶ ٤٠٣", (await del(p1.id, S.mgr2)).status, 403);
    same("ب٩. وطبيبُ فرعٍ آخر ⟶ ٤٠٣", (await del(p1.id, S.doc2)).status, 403);
    check((await trashList(S.recv)).status === 403, "ب١٠. والاستقبالُ لا يرى السلّة");
    same("ب١١. وشارتُه صفرٌ لا خطأ",
      (await http("GET", "/api/patient-trash/count", S.recv)).body, { count: 0 });

    // ══ ج. الحذفُ الناعم — ولا صفَّ تابعاً يُمَسّ ══════════════════════════
    console.log("\n── ج. ملفٌّ كاملٌ يُحذف ولا يُهدَم ──");
    const rich = await mkPatient("ملفٌّ كامل");
    const richCase = await mkCase(rich.id, "prosthetic", 1, 1_000_000);
    await q(`UPDATE patients SET total_cost=1000000 WHERE id=$1`, [rich.id]);
    const [ep] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
         status, agreed_cost, requested_item, service_path)
       VALUES ($1,$2,1,1,'in_manufacturing',1000000,'full_device','exam') RETURNING id`,
      [rich.id, richCase]);
    const [wo] = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, purpose,
         current_stage, status, expert_user_id, device_episode_id, assigned_by)
       VALUES ($1,1,'prosthetic','build','measurement','in_progress',$2,$3,$4) RETURNING id`,
      [rich.id, EXPERT, ep.id, MGR]);
    await q(`INSERT INTO prosthetic_work_history (work_order_id, action_type, performed_by)
             VALUES ($1,'created',$2)`, [wo.id, MGR]);
    const [exam] = await q<{ id: number }>(
      `INSERT INTO medical_exams (patient_id, case_type, doctor_id, doctor_name,
         diagnosis, plan, branch_id)
       VALUES ($1,'prosthetic',$2,'د. سعد','بتر تحت الركبة','طرف صناعي',1) RETURNING id`,
      [rich.id, DOC]);
    const [pay] = await q<{ id: number }>(
      `INSERT INTO payments (patient_id, branch_id, amount, date, case_id)
       VALUES ($1,1,1000000,NOW(),$2) RETURNING id`, [rich.id, richCase]);
    const [ce] = await q<{ id: number }>(
      `INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source)
       VALUES ($1,1,$2,1000000,'assignment') RETURNING id`, [rich.id, richCase]);
    const [vis] = await q<{ id: number }>(
      `INSERT INTO visits (patient_id, branch_id, case_id, visit_date, created_by)
       VALUES ($1,1,$2,NOW(),$3) RETURNING id`, [rich.id, richCase, MGR]);
    const [contact] = await q<{ id: number }>(
      `INSERT INTO patient_contacts (patient_id, channel, external_id, relation)
       VALUES ($1,'whatsapp','9647701234567','self') RETURNING id`, [rich.id]);

    const before = await fingerprint(rich.id);
    const overallBefore = await overall(S.admin);

    //  مسدَّدٌ تماماً (١,٠٠٠,٠٠٠ كلفة و١,٠٠٠,٠٠٠ مدفوع) ⟶ لا التزامَ قائم.
    const pv = await preview(rich.id, S.mgr);
    same("ج١. المعاينةُ تقرأ الكلفةَ والمدفوع من الخادم",
      [pv.body?.snapshot?.totalCost, pv.body?.snapshot?.totalPaid, pv.body?.snapshot?.remaining],
      [1_000_000, 1_000_000, 0]);
    check(pv.body?.mayDelete === true && pv.body?.needsGlobalAdmin === false,
      "ج٢. ومسدَّدٌ بلا معلَّقات ⟶ مديرُ الفرع يحذفه");
    same("ج٣. ومهلةُ الاستعادة معلنةٌ في المعاينة", pv.body?.restoreWindowDays, 30);

    const d1 = await del(rich.id, S.mgr, "تكرار ملف — دُمج يدوياً");
    same("ج٤. الحذفُ ينجح", d1.status, 200);
    const st = await trashState(rich.id);
    check(st?.deleted_at !== null, "ج٥. وخُتم الصفُّ محذوفاً");
    check(st?.deleted_reason === "تكرار ملف — دُمج يدوياً", "ج٦. والسببُ محفوظٌ كما كُتب");
    same("ج٧. ومَن حذف ودورُه", [st?.by_user, st?.deleted_by_name, st?.deleted_by_role],
      [MGR, "مدير بغداد", "branch_manager"]);
    const [win] = await q<{ d: string }>(
      `SELECT (EXTRACT(EPOCH FROM (restore_until - deleted_at))/86400)::int d
         FROM patients WHERE id=$1`, [rich.id]);
    same("ج٨. **والمهلةُ ثلاثون يوماً يولّدها الخادم**", Number(win.d), 30);
    same("ج٩. واللقطةُ المالية محفوظةٌ للتدقيق",
      [st?.dcost, st?.dpaid, st?.drem, st?.dadmin], [1_000_000, 1_000_000, 0, false]);

    const after = await fingerprint(rich.id);
    same("ج١٠. **ولا صفَّ تابعاً واحداً تغيّر** — المعرّفاتُ والمبالغُ نفسُها",
      after, before);
    const idsOf = (o: any) => [Number(o.payments[0].id), Number(o.cost_entries[0].id),
      Number(o.orders[0].id), Number(o.exams[0].id), Number(o.episodes[0].id),
      Number(o.visits[0].id), Number(o.contacts[0].id)];
    same("ج١١. والمعرّفاتُ هي هي بعينها", idsOf(after),
      [pay.id, ce.id, wo.id, exam.id, ep.id, vis.id, Number(contact.id)].map(Number));
    same("ج١٢. **ولا صفَّ في السجلّ الجنائي للزيارات** — الحذفُ الناعم لا يمسّها",
      (await q(`SELECT count(*)::int n FROM visits_forensic_log WHERE patient_id=$1`,
        [rich.id]))[0].n, 0);
    same("ج١٣. ولا في الجنائي للمعاينات",
      (await q(`SELECT count(*)::int n FROM medical_exams_forensic_log WHERE patient_id=$1`,
        [rich.id]))[0].n, 0);
    const [audit] = await q(`SELECT action, notes, old_values, new_values FROM audit_log
       WHERE entity_type='patient' AND entity_id=$1 ORDER BY id DESC LIMIT 1`, [rich.id]);
    same("ج١٤. وسطرُ التدقيق يقول «حذف ناعم»", audit?.action, "soft_delete");
    check(String(audit?.notes ?? "").includes("تكرار ملف"), "ج١٥. ويحمل السبب");

    // ══ د. ستّةَ عشرَ سطحاً يختفي منها ════════════════════════════════════
    console.log("\n── د. الاختفاءُ من الأسطح الفعّالة ──");
    const surfaces: Array<[string, () => Promise<boolean>]> = [
      ["د١. قائمة `/api/patients`", async () =>
        !(await http("GET", "/api/patients", S.admin)).body?.some?.((x: any) => x.id === rich.id)],
      ["د٢. سجلّ المرضى (الصفوف)", async () =>
        !(await http("GET", "/api/patients/registry?pageSize=500", S.admin))
          .body?.rows?.some?.((x: any) => x.id === rich.id)],
      ["د٣. والبحثُ بالاسم فيه", async () =>
        !(await http("GET", `/api/patients/registry?search=${encodeURIComponent(MARK)}&pageSize=500`, S.admin))
          .body?.rows?.some?.((x: any) => x.id === rich.id)],
      ["د٤. والبحثُ برمز المريض", async () =>
        !(await http("GET", `/api/patients/registry?search=${encodeURIComponent(rich.patient_code)}&pageSize=500`, S.admin))
          .body?.rows?.some?.((x: any) => x.id === rich.id)],
      ["د٥. وصفحةُ المريض ⟶ ٤٠٤", async () =>
        (await http("GET", `/api/patients/${rich.id}`, S.admin)).status === 404],
      ["د٦. وخريطةُ «بانتظار معاينة»", async () => {
        const b = (await http("GET", "/api/medical/pending", S.doc)).body;
        return !JSON.stringify(b ?? {}).includes(`"${rich.id}"`);
      }],
      ["د٧. وقائمةُ عمل الطبيب", async () =>
        !(await http("GET", "/api/medical/worklist", S.doc)).body?.rows
          ?.some?.((x: any) => x.patientId === rich.id)],
      ["د٨. وطابورُ المتابعات", async () =>
        !JSON.stringify((await http("GET", "/api/followups", S.mgr)).body ?? {})
          .includes(`"patientId":${rich.id}`)],
      ["د٩. ومراجعةُ الطبيب الإشرافية", async () =>
        !JSON.stringify((await http("GET", "/api/medical-review/queue", S.doc)).body ?? {})
          .includes(`"patientId":${rich.id}`)],
      ["د١٠. ومراجعةُ مبالغ «بلا معاينة»", async () =>
        !JSON.stringify((await http("GET", "/api/no-exam/review", S.doc)).body ?? {})
          .includes(`"patientId":${rich.id}`)],
      ["د١١. وطابورُ المُعادات", async () =>
        !JSON.stringify((await http("GET", "/api/no-exam/returned", S.recv)).body ?? {})
          .includes(`"patientId":${rich.id}`)],
      ["د١٢. ولوحةُ التصنيع", async () =>
        !(await http("GET", "/api/manufacturing/orders", S.admin)).body
          ?.some?.((x: any) => x.patientId === rich.id)],
      ["د١٣. وصفحةُ أمرِ تصنيعه ⟶ ٤٠٤", async () =>
        (await http("GET", `/api/manufacturing/orders/${wo.id}`, S.admin)).status === 404],
      ["د١٤. وطابورُ اعتماد الخصومات", async () =>
        !JSON.stringify((await http("GET", "/api/discounts", S.admin)).body ?? {})
          .includes(`"patientId":${rich.id}`)],
      ["د١٥. وعدّادُ سجلّ المرضى", async () => {
        const b = (await http("GET", "/api/patients/registry?pageSize=1", S.admin)).body;
        const rows = (await http("GET", "/api/patients/registry?pageSize=500", S.admin)).body?.rows ?? [];
        return Number(b?.total ?? -1) === rows.length;
      }],
      ["د١٦. وبحثُ «مرضى اليوم»", async () => {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
        return !(await http("GET", `/api/patients/registry?visitDate=${today}&pageSize=500`, S.admin))
          .body?.rows?.some?.((x: any) => x.id === rich.id);
      }],
    ];
    for (const [label, fn] of surfaces) check(await fn(), label);

    // ══ هـ. المال — يخرج بمقداره بالضبط ثم يعود ═══════════════════════════
    console.log("\n── هـ. المالُ يخرج من المجاميع الفعّالة ──");
    const overallAfter = await overall(S.admin);
    same("هـ١. المبيعاتُ نقصت بكلفته بالضبط",
      Number(overallBefore.sold) - Number(overallAfter.sold), 1_000_000);
    same("هـ٢. والوارِدُ نقص بمدفوعه بالضبط",
      Number(overallBefore.paid) - Number(overallAfter.paid), 1_000_000);
    same("هـ٣. وعددُ المرضى نقص واحداً",
      Number(overallBefore.totalPatients) - Number(overallAfter.totalPatients), 1);
    const accAfter = (await http("GET", "/api/accounting/summary", S.admin)).body;
    check(accAfter !== null, "هـ٤. والملخّصُ المحاسبيّ يُقرأ بلا خطأ");
    //  والصفوفُ نفسُها ما زالت في القاعدة — المالُ لم يُمحَ، خرج من القراءة.
    same("هـ٥. **والدفعةُ ما زالت في `payments` بمبلغها**",
      (await q(`SELECT amount::int a FROM payments WHERE id=$1`, [pay.id]))[0]?.a, 1_000_000);
    same("هـ٦. وقيدُ الكلفة ما زال في الدفتر",
      (await q(`SELECT amount::int a FROM cost_entries WHERE id=$1`, [ce.id]))[0]?.a, 1_000_000);
    same("هـ٧. **ولا دفعةً سالبةً اختُرعت**",
      (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1 AND amount < 0`,
        [rich.id]))[0].n, 0);
    same("هـ٨. ولا قيدَ عكسيّ",
      (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1 AND amount < 0`,
        [rich.id]))[0].n, 0);

    // ══ و. السلّةُ نفسُها ═════════════════════════════════════════════════
    console.log("\n── و. صفحةُ المحذوفات ──");
    const tl = await trashList(S.mgr);
    const row = tl.body?.rows?.find((x: any) => x.id === rich.id);
    check(row !== undefined, "و١. الصفُّ ظاهرٌ في السلّة");
    same("و٢. بسببه ومَن حذفه", [row?.deletedReason, row?.deletedByName],
      ["تكرار ملف — دُمج يدوياً", "مدير بغداد"]);
    check(row?.restorable === true && row?.daysLeft === 30, "و٣. وبقيت ثلاثون يوماً");
    same("و٤. وباللقطة المالية", [row?.totalCost, row?.totalPaid, row?.remaining],
      [1_000_000, 1_000_000, 0]);
    same("و٥. ومديرُ الفرع لا يملك «حذف نهائي»", tl.body?.mayPurge, false);
    same("و٦. والمسؤولُ يملكه", (await trashList(S.admin)).body?.mayPurge, true);
    check((await trashList(S.mgr2)).body?.rows?.every((x: any) => x.id !== rich.id) === true,
      "و٧. **والنطاقُ يُحترَم** — مديرُ الفرع الثاني لا يراه");
    check((await trashList(S.mgr, rich.patient_code)).body?.rows
      ?.some?.((x: any) => x.id === rich.id) === true,
      "و٨. والبحثُ داخلها بالرمز يجده");
    check((await trashList(S.mgr, "اسمٌ لا وجود له")).body?.rows?.length === 0,
      "و٩. وبحثٌ لا يطابق يعطي فراغاً");
    same("و١٠. وشارةُ العدّاد تطابق الصفوف",
      (await http("GET", "/api/patient-trash/count", S.mgr)).body?.count,
      (await trashList(S.mgr)).body?.rows?.length);

    // ══ ز. لا عملَ على ملفٍّ في السلّة ═════════════════════════════════════
    console.log("\n── ز. الأبوابُ التشغيلية مغلقة ──");
    const epTry = await http("POST", `/api/patients/${rich.id}/device-episodes`, S.recv,
      { serviceType: "medical_support", requestedItem: "full_device", servicePath: "exam" });
    same("ز١. طلبُ جهازٍ جديد يُردّ ٤٠٩", epTry.status, 409);
    same("ز٢. **ولا يُقال «غير موجود»** — بابُه الاستعادة",
      epTry.body?.error ?? epTry.body?.message, PATIENT_IN_TRASH_ERROR);
    const payTry = await http("POST", "/api/payments", S.recv,
      { patientId: rich.id, branchId: 1, amount: 1000 });
    same("ز٣. ودفعةٌ جديدة تُردّ ٤٠٩ برسالة السلّة",
      [payTry.status, payTry.body?.message], [409, PATIENT_IN_TRASH_ERROR]);
    const visTry = await http("POST", "/api/visits", S.recv,
      { patientId: rich.id, branchId: 1 });
    same("ز٣ب. وزيارةٌ جديدة كذلك",
      [visTry.status, visTry.body?.message], [409, PATIENT_IN_TRASH_ERROR]);
    same("ز٤. وتوقيعُ معاينةٍ يُردّ",
      (await http("POST", `/api/medical/patients/${rich.id}/exams`, S.doc,
        { caseType: "prosthetic", diagnosis: "x", plan: "y" })).status >= 400, true);

    // ══ ح. كشفُ التكرار — تنبيهٌ بلا كشف ══════════════════════════════════
    console.log("\n── ح. تكرارُ التسجيل ──");
    const lkMgr = await http("GET",
      `/api/patients/lookup-by-name?name=${encodeURIComponent(MARK)}`, S.mgr);
    check(lkMgr.body?.inTrashCount > 0, "ح١. المخوَّلُ يُنبَّه أن في السلّة مطابقاً");
    same("ح٢. **وبرسالتها الصريحة**", lkMgr.body?.trashNotice, IN_TRASH_HINT);
    check(lkMgr.body?.inTrash?.some?.((x: any) => x.id === rich.id) === true,
      "ح٣. ويرى الصفَّ ليقرّر: استعادةً أو ملفّاً جديداً");
    const lkRecv = await http("GET",
      `/api/patients/lookup-by-name?name=${encodeURIComponent(MARK)}`, S.recv);
    check(lkRecv.body?.inTrashCount > 0, "ح٤. والاستقبالُ يعرف أن هناك ما يوقفه");
    same("ح٥. **ولا يُكشَف له بيان**", lkRecv.body?.inTrash, []);
    same("ح٦. ويُقال له ما يكفي ليسأل", lkRecv.body?.trashNotice, IN_TRASH_ESCALATION);
    check(lkRecv.body?.matches?.every?.((x: any) => x.id !== rich.id) === true,
      "ح٧. والمحذوفُ ليس في «المطابقات» العادية");

    // ══ ط. الاستعادة — الصفوفُ نفسُها تعود ════════════════════════════════
    console.log("\n── ط. الاستعادة ──");
    same("ط١. الاستقبالُ لا يستعيد", (await restore(rich.id, S.recv)).status, 403);
    same("ط٢. ومديرُ فرعٍ آخر لا يستعيد", (await restore(rich.id, S.mgr2)).status, 403);
    same("ط٣. والطبيبُ في نطاقه يستعيد", (await restore(rich.id, S.doc)).status, 200);
    const restored = await trashState(rich.id);
    same("ط٤. وحالةُ الحذف مُسحت بالكامل",
      [restored?.deleted_at, restored?.restore_until, restored?.deleted_reason,
        restored?.by_user, restored?.deleted_by_name, restored?.deleted_by_role,
        restored?.dcost, restored?.dpaid, restored?.drem, restored?.dpending,
        restored?.dadmin],
      [null, null, null, null, null, null, null, null, null, null, null]);
    same("ط٥. **والصفوفُ نفسُها بمعرّفاتها ومبالغها**",
      await fingerprint(rich.id), before);
    same("ط٦. **ورمزُ المريض هو هو**",
      (await q(`SELECT patient_code c FROM patients WHERE id=$1`, [rich.id]))[0].c,
      rich.patient_code);
    same("ط٧. ولا اسمَ بديلٍ اختُرع",
      (await q(`SELECT count(*)::int n FROM patient_code_aliases WHERE patient_id=$1`,
        [rich.id]))[0].n, 0);
    check((await http("GET", `/api/patients/${rich.id}`, S.admin)).status === 200,
      "ط٨. وصفحتُه تُفتَح كما كانت");
    const overallBack = await overall(S.admin);
    same("ط٩. **والمالُ عاد إلى المجاميع كما كان**",
      [Number(overallBack.sold), Number(overallBack.paid), Number(overallBack.totalPatients)],
      [Number(overallBefore.sold), Number(overallBefore.paid), Number(overallBefore.totalPatients)]);
    const [ra] = await q(`SELECT action, notes, old_values FROM audit_log
       WHERE entity_type='patient' AND entity_id=$1 ORDER BY id DESC LIMIT 1`, [rich.id]);
    same("ط١٠. وسطرُ تدقيقٍ للاستعادة", ra?.action, "restore");
    check(String(ra?.old_values ?? "").includes("تكرار ملف"),
      "ط١١. **يحمل سياقَ الحذف السابق** — فلا يضيع «مَن ولماذا» بمسح الأعمدة");
    check((await http("GET", "/api/manufacturing/orders", S.admin)).body
      ?.some?.((x: any) => x.patientId === rich.id) === true,
      "ط١٢. وأمرُ تصنيعه عاد إلى اللوحة");

    // ══ ي. الالتزامُ الماليُّ القائم ══════════════════════════════════════
    console.log("\n── ي. متى يلزم المسؤولُ العام ──");
    const debt = await mkPatient("عليه دَين", { cost: 500_000 });
    const debtCase = await mkCase(debt.id, "prosthetic", 1, 500_000);
    const pvDebt = await preview(debt.id, S.mgr);
    same("ي١. المعاينةُ تقول «لا» ولماذا", pvDebt.body?.mayDelete, false);
    same("ي٢. برسالة الالتزام", pvDebt.body?.blockedMessage, GLOBAL_ADMIN_REQUIRED_MESSAGE);
    check((pvDebt.body?.reasons ?? []).some((r: string) => r.includes("500,000")),
      "ي٣. وبالدينار لا بعبارةٍ عامّة", JSON.stringify(pvDebt.body?.reasons));
    const dDebt = await del(debt.id, S.mgr);
    same("ي٤. والخادمُ يردّ ٤٠٩ بالرسالة نفسِها", [dDebt.status, dDebt.body?.message],
      [409, GLOBAL_ADMIN_REQUIRED_MESSAGE]);
    same("ي٥. والطبيبُ كذلك", (await del(debt.id, S.doc)).status, 409);
    check((await preview(debt.id, S.admin)).body?.mayDelete === true,
      "ي٦. **والمسؤولُ لا يُمنَع أبداً** — هو المخرجُ لا الحاجز");
    same("ي٧. ويحذفه", (await del(debt.id, S.admin, "قرار المالك")).status, 200);
    check((await trashState(debt.id))?.dadmin === true,
      "ي٨. ويُختَم الصفُّ بأنه لزمه المسؤول");

    //  رصيدٌ للمريض (دفع أكثر من كلفته) — التزامٌ في الاتجاه الآخر.
    const credit = await mkPatient("له رصيد", { cost: 100_000 });
    await mkCase(credit.id, "prosthetic", 1, 100_000);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date)
             VALUES ($1,1,150000,NOW())`, [credit.id]);
    const pvCredit = await preview(credit.id, S.mgr);
    same("ي٩. **ورصيدُ المريض التزامٌ أيضاً**", pvCredit.body?.mayDelete, false);
    check((pvCredit.body?.reasons ?? []).some((r: string) => r.includes("رصيد للمريض")),
      "ي١٠. ويُقال رصيداً لا «متبقّي سالب»");

    //  متابعةٌ حيّةٌ بقرارٍ لم يُحسَم.
    const openF = await mkPatient("متابعةٌ مفتوحة");
    const ofCase = await mkCase(openF.id);
    const [ofEp] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
         status, requested_item, service_path)
       VALUES ($1,$2,1,1,'examined','full_device','exam') RETURNING id`, [openF.id, ofCase]);
    const [ofExam] = await q<{ id: number }>(
      `INSERT INTO medical_exams (patient_id, case_type, doctor_id, doctor_name, diagnosis, plan, branch_id)
       VALUES ($1,'prosthetic',$2,'د. سعد','x','y',1) RETURNING id`, [openF.id, DOC]);
    await q(`INSERT INTO post_exam_followups (patient_id, branch_id, service_type,
               medical_exam_id, device_episode_id, status)
             VALUES ($1,1,'prosthetic',$2,$3,'awaiting_patient_decision')`,
      [openF.id, ofExam.id, ofEp.id]);
    same("ي١١. ومتابعةٌ لم يُحسَم قرارُها تحتاج المسؤول",
      (await preview(openF.id, S.mgr)).body?.mayDelete, false);
    check(((await preview(openF.id, S.mgr)).body?.reasons ?? [])
      .some((r: string) => r.includes("متابعات بيع")), "ي١٢. ويُقال ذلك صراحةً");

    //  مبلغٌ «بلا معاينة» معلَّق.
    const pend = await mkPatient("مبلغٌ معلَّق");
    const pendCase = await mkCase(pend.id);
    const [pEp] = await q<{ id: number }>(
      `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
         status, requested_item, component, service_path)
       VALUES ($1,$2,1,1,'in_manufacturing','socket','socket','no_exam') RETURNING id`,
      [pend.id, pendCase]);
    const [pWo] = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, purpose,
         current_stage, status, expert_user_id, device_episode_id, assigned_by, device_origin)
       VALUES ($1,1,'prosthetic','build','measurement','in_progress',$2,$3,$4,'registered')
       RETURNING id`, [pend.id, EXPERT, pEp.id, RECV]);
    await q(`INSERT INTO pending_service_charges (patient_id, case_id, branch_id, service_type,
               operation_kind, amount, status, created_by, work_order_id, device_episode_id,
               sale_expert_user_id, requested_item, device_origin)
             VALUES ($1,$2,1,'prosthetic','device_sale',250000,'pending_review',$3,$4,$5,$6,'socket','registered')`,
      [pend.id, pendCase, RECV, pWo.id, pEp.id, EXPERT]);
    same("ي١٣. ومبلغٌ بانتظار مراجعة الطبيب يحتاج المسؤول",
      (await preview(pend.id, S.mgr)).body?.mayDelete, false);
    same("ي١٤. ويحذفه المسؤول", (await del(pend.id, S.admin, "قرار")).status, 200);
    same("ي١٥. **وصفُّ المبلغ باقٍ بحاله** — يعود بعينه عند الاستعادة",
      (await q(`SELECT status FROM pending_service_charges WHERE patient_id=$1`, [pend.id]))[0]?.status,
      "pending_review");
    check(!JSON.stringify((await http("GET", "/api/no-exam/review", S.doc)).body ?? {})
      .includes(`"patientId":${pend.id}`), "ي١٦. وخرج من طابور الطبيب");
    same("ي١٧. **وأمرُ تصنيعه لم يُلغَ**",
      (await q(`SELECT status FROM prosthetic_work_orders WHERE id=$1`, [pWo.id]))[0]?.status,
      "in_progress");
    await restore(pend.id, S.admin);
    check(JSON.stringify((await http("GET", "/api/no-exam/review", S.doc)).body ?? {})
      .includes(`"patientId":${pend.id}`), "ي١٨. والاستعادةُ تعيده إلى الطابور نفسِه");

    // ══ ك. المهلةُ تنقضي فتسقط الاستعادةُ وحدها ═══════════════════════════
    console.log("\n── ك. انقضاءُ المدّة ──");
    const old = await mkPatient("مهلةٌ منقضية");
    await mkCase(old.id);
    await del(old.id, S.mgr, "قديم");
    //  يُدفَع الختمُ إلى الماضي: حُذف قبل أربعين يوماً ومهلتُه انقضت بعشرة.
    await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
               restore_until = NOW() - interval '10 days' WHERE id=$1`, [old.id]);
    const expired = await restore(old.id, S.mgr);
    same("ك١. الاستعادةُ تُردّ ٤٠٩ برسالتها", [expired.status, expired.body?.message],
      [409, RESTORE_EXPIRED_MESSAGE]);
    check((await q(`SELECT deleted_at FROM patients WHERE id=$1`, [old.id]))[0].deleted_at !== null,
      "ك٢. **والصفُّ باقٍ كما هو** — لا محوَ آلياً في اليوم الثلاثين");
    const oldRow = (await trashList(S.mgr)).body?.rows?.find((x: any) => x.id === old.id);
    check(oldRow?.restorable === false && oldRow?.daysLeft === 0,
      "ك٣. والسلّةُ تعرضه «انقضت مدّته»");

    // ══ ل. التزامنُ — ضغطتان تُنتجان واحدة ════════════════════════════════
    console.log("\n── ل. الضغطةُ المزدوجة ──");
    const race = await mkPatient("سباق");
    await mkCase(race.id);
    const [r1, r2] = await Promise.all([del(race.id, S.mgr, "أ"), del(race.id, S.admin, "ب")]);
    const codes = [r1.status, r2.status].sort();
    same("ل١. حذفٌ واحدٌ ينجح والآخرُ يُردّ ٤٠٩", codes, [200, 409]);
    same("ل٢. وصفٌّ واحدٌ محذوف",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1 AND deleted_at IS NOT NULL`,
        [race.id]))[0].n, 1);
    const [s1, s2] = await Promise.all([restore(race.id, S.mgr), restore(race.id, S.admin)]);
    same("ل٣. واستعادةٌ واحدةٌ تنجح", [s1.status, s2.status].sort(), [200, 409]);

    // ══ م. الدمجُ يرفض ملفّاً في السلّة ═══════════════════════════════════
    console.log("\n── م. الدمج ──");
    const src = await mkPatient("مصدرُ دمج");
    const dst = await mkPatient("هدفُ دمج");
    await mkCase(src.id); await mkCase(dst.id);
    await del(src.id, S.admin, "للدمج");
    const m1 = await http("POST", "/api/admin/patients/merge", S.admin,
      { sourceId: src.id, targetId: dst.id });
    check(m1.status >= 400 && String(m1.body?.message ?? "").includes("المحذوفات"),
      "م١. مصدرٌ في السلّة ⟶ يُردّ", `${m1.status} ${JSON.stringify(m1.body)}`);
    check((await trashState(src.id))?.deleted_at !== null,
      "م٢. **ولا استعادةَ ضمنية** — بقي محذوفاً");
    await restore(src.id, S.admin);
    await del(dst.id, S.admin, "للدمج");
    const m2 = await http("POST", "/api/admin/patients/merge", S.admin,
      { sourceId: src.id, targetId: dst.id });
    check(m2.status >= 400, "م٣. وهدفٌ في السلّة ⟶ يُردّ كذلك");
    await restore(dst.id, S.admin);

    // ══ ن. الإشعاراتُ لا تُرسَل لمحذوف ════════════════════════════════════
    console.log("\n── ن. واتساب ──");
    const notif = await mkPatient("إشعار");
    await mkCase(notif.id);
    const [nContact] = await q<{ id: number }>(
      `INSERT INTO patient_contacts (patient_id, channel, external_id, relation)
       VALUES ($1,'whatsapp','9647701234599','self') RETURNING id`, [notif.id]);
    const [nDel] = await q<{ id: number }>(
      `INSERT INTO patient_notification_deliveries (patient_id, patient_contact_id,
         channel, notification_type, status, attempt_count, next_attempt_at, payload)
       VALUES ($1,$2,'whatsapp','registration_welcome','pending',0,NOW(),'{}'::jsonb)
       RETURNING id`, [notif.id, nContact.id]);
    const outbox = await import("./patient_notifications/outbox");
    await del(notif.id, S.mgr, "اختبار الإشعار");
    const claimed = await outbox.claimDue(50);
    check(claimed.every((c: any) => Number(c.id) !== Number(nDel.id)),
      "ن١. **صفُّ المحذوف لا يُحجَز أصلاً**");
    const [nState] = await q(`SELECT status, attempt_count::int a FROM
       patient_notification_deliveries WHERE id=$1`, [nDel.id]);
    same("ن٢. ويبقى `pending` بلا محاولة", [nState.status, nState.a], ["pending", 0]);
    await q(`UPDATE patient_notification_deliveries SET status='pending', locked_at=NULL
              WHERE id = ANY($1::int[])`, [claimed.map((c: any) => Number(c.id))]);
    await restore(notif.id, S.mgr);
    const claimed2 = await outbox.claimDue(50);
    check(claimed2.some((c: any) => Number(c.id) === Number(nDel.id)),
      "ن٣. وبعد الاستعادة يُرسَل **الصفُّ نفسُه** بلا تدخّل");
    await q(`UPDATE patient_notification_deliveries SET status='pending', locked_at=NULL
              WHERE id = ANY($1::int[])`, [claimed2.map((c: any) => Number(c.id))]);

    // ══ س. الحذفُ النهائيّ ════════════════════════════════════════════════
    console.log("\n── س. الحذفُ النهائيّ ──");
    const kill = await mkPatient("للحذف النهائي");
    const killCase = await mkCase(kill.id, "prosthetic", 1, 300_000);
    await q(`UPDATE patients SET total_cost=300000 WHERE id=$1`, [kill.id]);
    const [killVisit] = await q<{ id: number }>(
      `INSERT INTO visits (patient_id, branch_id, case_id, visit_date, created_by)
       VALUES ($1,1,$2,NOW(),$3) RETURNING id`, [kill.id, killCase, MGR]);
    const [killExam] = await q<{ id: number }>(
      `INSERT INTO medical_exams (patient_id, case_type, doctor_id, doctor_name, diagnosis, plan, branch_id)
       VALUES ($1,'prosthetic',$2,'د. سعد','x','y',1) RETURNING id`, [kill.id, DOC]);
    await q(`INSERT INTO payments (patient_id, branch_id, amount, date, case_id)
             VALUES ($1,1,300000,NOW(),$2)`, [kill.id, killCase]);
    await q(`INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source)
             VALUES ($1,1,$2,300000,'assignment')`, [kill.id, killCase]);

    same("س١. الحذفُ النهائيُّ على ملفٍّ فعّال ⟶ ٤٠٩",
      (await purge(kill.id, S.admin)).status, 409);
    await del(kill.id, S.admin, "ملف تجريبي");

    // ══ **بوّابةُ المهلة — لا يتخطّاها أحد** ═══════════════════════════════
    //  حذفٌ نهائيّ فوريٌّ بعد النقل إلى السلّة مباشرةً — والمهلةُ ثلاثون
    //  يوماً لم تنقضِ بعد. **ولا يُستثنى المسؤولُ العام**: لو استطاع
    //  تجاوزَها لصار «حذف نهائي» بابَ حذفٍ فوريّ بزيّ سلّة، والوعدُ الذي
    //  تراه الشاشةُ («يمكن استعادته خلال ثلاثين يوماً») كذباً.
    const freshPurge = await purge(kill.id, S.admin, "محاولة مبكّرة");
    same("س٢. **وحذفٌ نهائيّ فوريّ يُردّ ٤٠٩** — المهلةُ لم تنقضِ",
      [freshPurge.status, freshPurge.body?.message],
      [409, PURGE_BEFORE_EXPIRY_MESSAGE]);
    same("س٣. **والصفُّ باقٍ في السلّة** — لم يُهدَم شيء",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1 AND deleted_at IS NOT NULL`,
        [kill.id]))[0].n, 1);

    same("س٤. ومديرُ الفرع لا يملك الحذف النهائي أصلاً — بصرف النظر عن المهلة",
      (await purge(kill.id, S.mgr)).status, 403);
    same("س٥. والطبيبُ كذلك", (await purge(kill.id, S.doc)).status, 403);
    same("س٦. وبلا سبب ⟶ ٤٠٠", (await purge(kill.id, S.admin, "  ")).status, 400);

    // ══ والمهلةُ تنقضي — البابُ يُفتَح الآن حصراً ═══════════════════════════
    await q(`UPDATE patients SET deleted_at = NOW() - interval '40 days',
               restore_until = NOW() - interval '10 days' WHERE id=$1`, [kill.id]);

    same("س٧. **وحتى بعد الانقضاء لا يملكه مديرُ الفرع**",
      (await purge(kill.id, S.mgr)).status, 403);
    same("س٨. ولا الطبيب", (await purge(kill.id, S.doc)).status, 403);

    const pg = await purge(kill.id, S.admin, "ملف تجريبي — يُحذف نهائياً");
    same("س٩. **والمسؤولُ ينفّذه بعد انقضاء المهلة**", pg.status, 200);
    same("س١٠. **والصفُّ ذهب فعلاً**",
      (await q(`SELECT count(*)::int n FROM patients WHERE id=$1`, [kill.id]))[0].n, 0);
    same("س١١. وتوابعُه معه — الكاسكيدُ المُختبَر نفسُه",
      [(await q(`SELECT count(*)::int n FROM visits WHERE patient_id=$1`, [kill.id]))[0].n,
      (await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [kill.id]))[0].n,
      (await q(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [kill.id]))[0].n,
      (await q(`SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [kill.id]))[0].n,
      (await q(`SELECT count(*)::int n FROM patient_cases WHERE patient_id=$1`, [kill.id]))[0].n],
      [0, 0, 0, 0, 0]);
    const [pgAudit] = await q(`SELECT action, notes FROM audit_log
       WHERE entity_type='patient' AND entity_id=$1 AND action='purge' ORDER BY id DESC LIMIT 1`,
      [kill.id]);
    check(pgAudit !== undefined && String(pgAudit.notes ?? "").includes("حذف نهائي"),
      "س١٢. **والتدقيقُ كُتب قبل الهدم** — فبقي بعده");
    same("س١٣. **والسجلُّ الجنائيُّ للزيارات التقط الحذف الحقيقي**",
      (await q(`SELECT count(*)::int n FROM visits_forensic_log WHERE visit_id=$1`,
        [killVisit.id]))[0].n, 1);
    same("س١٤. والجنائيُّ للمعاينات كذلك",
      (await q(`SELECT count(*)::int n FROM medical_exams_forensic_log WHERE exam_id=$1`,
        [killExam.id]))[0].n, 1);

    // ══ ع. الترحيلُ ٠٦٨ ═══════════════════════════════════════════════════
    console.log("\n── ع. الترحيل ──");
    {
      const runner = readFileSync(join(process.cwd(), "server/migrations/runner.ts"), "utf8");
      check(runner.includes("migration068"), "ع١. ترحيلُ ٠٦٨ مسجَّلٌ في المشغّل");
      const m = readFileSync(join(process.cwd(),
        "server/migrations/068_patient_trash.ts"), "utf8");
      //  **الفحصُ على جسم الـSQL وحده**: رأسُ الملفّ يشرح أنه «بلا DROP ولا
      //  DELETE ولا TRUNCATE»، فقراءةُ الملفّ كلِّه تُمسك كلماتِ الشرح لا
      //  الجُملَ المنفَّذة — وهذا حارسٌ يصرخ على نفسه.
      const body = m.slice(m.indexOf("export const sql"));
      //  **DROP CONSTRAINT مستثنًى من قائمة الهدم**: لا يمحو بياناً — يُزال
      //  به قيدٌ ليُعاد تعريفُه فوراً بصياغةٍ أدقّ (تشديدُ الشكل، القسم ز).
      //  الهدمُ الحقيقيُّ الذي يُحظَر هنا هو TABLE/COLUMN/INDEX/SCHEMA.
      check(!/\bDROP\s+(TABLE|COLUMN|INDEX|SCHEMA)\b/i.test(body)
        && !/\bDELETE\s+FROM\b/i.test(body) && !/\bTRUNCATE\b/i.test(body)
        && !/\bUPDATE\s+patients\s+SET\b/i.test(body),
        "ع٢. **وهو إضافيٌّ بالكامل** — لا DROP جدولٍ أو عمودٍ أو فهرسٍ، ولا DELETE ولا TRUNCATE ولا كتابةَ على صفٍّ قائم");
      //  **وكلُّ DROP CONSTRAINT في الملفّ مقرونٌ فوراً بـADD CONSTRAINT
      //  بالاسم نفسِه** — إعادةُ تعريفٍ لا إزالة، ولا نافذةَ زمنيةٍ بلا قيد.
      //  **العدُّ على الجملة المنفَّذة فعلاً** (`ALTER TABLE ... DROP
      //  CONSTRAINT`) لا على أيّ ذكرٍ للعبارة — وإلّا أمسك شرحَ هذا القسم
      //  نفسِه («DROP CONSTRAINT IF EXISTS» داخل تعليقٍ توثيقيّ) بوصفه جملةً.
      const allDrops = (body.match(/\bALTER\s+TABLE\s+\w+\s+DROP\s+CONSTRAINT\b/gi) ?? []).length;
      const pairedDrops = [...body.matchAll(
        /ALTER TABLE \w+ DROP CONSTRAINT IF EXISTS (\w+);\s*\n\s*ALTER TABLE \w+ ADD CONSTRAINT \1\b/g,
      )].length;
      check(allDrops === 2 && pairedDrops === allDrops,
        "ع٢ب. **وكلُّ DROP CONSTRAINT (اثنان بالضبط) مقرونٌ بـADD CONSTRAINT بالاسم نفسِه فوراً** — لا إزالةَ صِرفة");
      check(/ADD COLUMN IF NOT EXISTS/.test(m) && /CREATE INDEX IF NOT EXISTS/.test(m),
        "ع٣. وقابلٌ للتشغيل مرّتين");
      check(!/DEFAULT/i.test(body.slice(body.indexOf("ALTER TABLE patients"),
        body.indexOf("COMMENT ON"))),
        "ع٤. **ولا `DEFAULT`** يكتب معنىً على ملفٍّ لم يُحذف");
      const cols = await q<{ n: string }>(
        `SELECT column_name n FROM information_schema.columns
          WHERE table_name='patients' AND (column_name LIKE 'deleted%' OR column_name='restore_until')`);
      same("ع٥. والأعمدةُ الأحدَ عشرَ قائمة", cols.length, 11);
      const cons = await q<{ n: string }>(
        `SELECT conname n FROM pg_constraint WHERE conrelid='patients'::regclass
          AND conname IN ('patients_deleted_shape_check','patients_active_clean_check',
                           'patients_deleted_financial_snapshot_check')`);
      same("ع٦. والقيودُ الثلاثةُ تحرس الشكل", cons.length, 3);
      //  والقاعدةُ نفسُها ترفض الحالةَ المستحيلة، لا الشيفرةُ وحدها.
      let rejected = false;
      const guinea = await mkPatient("قيدُ القاعدة");
      try {
        await q(`UPDATE patients SET deleted_at=NOW() WHERE id=$1`, [guinea.id]);
      } catch { rejected = true; }
      check(rejected, "ع٧. **صفٌّ محذوفٌ بلا سببٍ ولا مهلة تردّه القاعدة**");
      let rejected2 = false;
      try {
        await q(`UPDATE patients SET restore_until=NOW() WHERE id=$1`, [guinea.id]);
      } catch { rejected2 = true; }
      check(rejected2, "ع٨. ومهلةُ استعادةٍ على ملفٍّ فعّال تُردّ كذلك");
      const idx = await q<{ n: string }>(
        `SELECT indexname n FROM pg_indexes WHERE tablename='patients'
          AND indexname IN ('ix_patients_active_branch','ix_patients_trash',
                            'ix_patients_trash_branch','ix_patients_restore_until')`);
      same("ع٩. والفهارسُ الأربعةُ الجزئية قائمة", idx.length, 4);

      //  ── تشديدُ الشكل (مراجعة القسم ز) — أشكالٌ مستحيلةٌ تُردّها القاعدةُ
      //     نفسُها، لا مراجعةُ كودٍ لاحقة ────────────────────────────────
      //  «guinea» ما زال فعّالاً (deleted_at IS NULL) — عمودان كانا مكشوفين
      //  تماماً في الصياغة الأولى للقيد (أربعةٌ من أحدَ عشر فقط).
      check(await violates(`UPDATE patients SET deleted_by_role='admin' WHERE id=$1`, [guinea.id]),
        "ع١٠. **وعمودٌ لم يكن محروساً إطلاقاً** (`deleted_by_role`) على ملفٍّ فعّال يُردّ الآن");
      check(await violates(`UPDATE patients SET deleted_total_cost=5000 WHERE id=$1`, [guinea.id]),
        "ع١١. وكذلك أيُّ حقلٍ من اللقطة المالية الخمسة (`deleted_total_cost` مثالاً)");

      //  ومريضٌ محذوفٌ فعلياً عبر المسار الحقيقي — لا سطراً مصطنعاً — لنُثبت
      //  أن اللقطةَ لا تُنقَص حقلاً واحداً بعد كتابتها الصحيحة الكاملة.
      const shapeP = await mkPatient("تشديدُ الشكل");
      const delRes = await del(shapeP.id, S.mgr, "لاختبار قيود الشكل");
      same("ع١٢. الحذفُ الحقيقيُّ ينجح فيُنشئ لقطةً كاملةً صحيحة", delRes.status, 200);
      const before = await trashState(shapeP.id);

      check(await violates(`UPDATE patients SET deleted_total_paid=NULL WHERE id=$1`, [shapeP.id]),
        "ع١٣. **ولا يُنقَص `deleted_total_paid` وحده من لقطةٍ مكتوبة** — نصفُ لقطةٍ مرفوض");
      check(await violates(`UPDATE patients SET deleted_total_cost=NULL WHERE id=$1`, [shapeP.id]),
        "ع١٤. ولا `deleted_total_cost` وحده");
      check(await violates(`UPDATE patients SET deleted_remaining=NULL WHERE id=$1`, [shapeP.id]),
        "ع١٥. ولا `deleted_remaining` وحده");
      check(await violates(`UPDATE patients SET deleted_pending_json=NULL WHERE id=$1`, [shapeP.id]),
        "ع١٦. ولا `deleted_pending_json` وحده");
      check(await violates(`UPDATE patients SET deleted_needed_admin=NULL WHERE id=$1`, [shapeP.id]),
        "ع١٧. ولا `deleted_needed_admin` وحده");

      //  ومساواةُ الحساب نفسِها مفروضة — لا مجرّدَ «موجودة أم لا».
      check(await violates(
        `UPDATE patients SET deleted_remaining = deleted_remaining + 1 WHERE id=$1`, [shapeP.id]),
        "ع١٨. **ومساواةُ الحساب مفروضة**: `remaining` مخالفٌ لـ`cost − paid` يُردّ رغم عدم NULL");

      //  وشكلُ الـJSON كاملٌ لا شبهُ اكتمال: `{}` تمرّ من `IS NOT NULL` وحدَه
      //  ولا تمرّ من فحص المفاتيح الخمسة.
      check(await violates(`UPDATE patients SET deleted_pending_json='{}'::jsonb WHERE id=$1`,
        [shapeP.id]),
        "ع١٩. **و`{}` فارغةٌ ترُدّها القاعدة** رغم أنها ليست NULL");
      check(await violates(`UPDATE patients SET deleted_pending_json=
        '{"pendingCharges":0,"pendingDiscounts":0,"pendingPriceRequests":0,"openFollowups":0}'::jsonb
        WHERE id=$1`, [shapeP.id]),
        "ع٢٠. وناقصةٌ مفتاحاً واحداً من خمسة (`openSettlements` غائب) تُردّ كذلك");

      //  وبعد كلّ هذه المحاولات المرفوضة، الصفُّ **سليمٌ بلا خدش** — كلُّ
      //  محاولةٍ عولجت بمعاملتها الخاصة وتراجعت وحدها.
      const after = await trashState(shapeP.id);
      same("ع٢١. **والصفُّ بعد كلّ المحاولات المرفوضة نفسُه حرفياً**", after, before);

      //  وكتابةٌ صحيحةٌ كاملة — حتى من خارج مسار التطبيق — تنجح: القيدُ
      //  حقيقةُ شكلٍ في القاعدة، لا حارسٌ يثق بمصدر الكتابة.
      const manual = await mkPatient("كتابةٌ يدويّةٌ صحيحة", { cost: 9000 });
      const validWrite = !(await violates(`UPDATE patients SET
          deleted_at = NOW(), restore_until = NOW() + interval '30 days',
          deleted_reason = 'كتابةٌ يدويّةٌ لاختبار الشكل الصحيح',
          deleted_by_user_id = $2, deleted_by_name = 'يدويّ', deleted_by_role = 'admin',
          deleted_total_cost = 9000, deleted_total_paid = 3000, deleted_remaining = 6000,
          deleted_pending_json = '{"pendingCharges":0,"pendingDiscounts":0,
            "pendingPriceRequests":0,"openFollowups":0,"openSettlements":0}'::jsonb,
          deleted_needed_admin = true
        WHERE id=$1`, [manual.id, ADMIN]));
      check(validWrite, "ع٢٢. **وكتابةٌ يدويّةٌ مطابقةُ الشكل تماماً تنجح** — القيدُ لا يرفض الصحيح");
    }

    // ══ ف. عقدُ الشاشات ═══════════════════════════════════════════════════
    console.log("\n── ف. عقدُ الشاشات ──");
    {
      const page = readFileSync(join(process.cwd(), "client/src/pages/PatientTrash.tsx"), "utf8");
      const dialog = readFileSync(join(process.cwd(),
        "client/src/components/DeletePatientDialog.tsx"), "utf8");
      const sidebar = readFileSync(join(process.cwd(), "client/src/components/Sidebar.tsx"), "utf8");
      const app = readFileSync(join(process.cwd(), "client/src/App.tsx"), "utf8");
      check(app.includes('path="/patient-trash"'), "ف١. الصفحةُ مسجَّلةٌ في المسارات");
      check(sidebar.includes("/patient-trash") && sidebar.includes("canTrashPatients"),
        "ف٢. **والقائمةُ تطابق الخادمَ شكلاً** — نفسُ دالّة الصلاحية");
      check(page.includes("canTrashPatients") && page.includes("canPurgePatients"),
        "ف٣. والصفحةُ تقرأ العقدَ المشترك لا شرطاً منسوخاً");
      check(dialog.includes("delete-preview") && !dialog.includes("canDeletePatients"),
        "ف٤. والنافذةُ تقرأ الأثرَ من الخادم، ولا تعتمد العَلَمَ القديم");
      check(dialog.includes("DELETE_REASON_LABEL"), "ف٥. وتطلب السببَ بمسمّاه المشترك");
      const details = readFileSync(join(process.cwd(),
        "client/src/pages/PatientDetails.tsx"), "utf8");
      check(details.includes("DeletePatientDialog")
        && !/permissions\.canDeletePatients/.test(details),
        "ف٦. وصفحةُ المريض تفتح النافذةَ الجديدة ولا تحرس بالعَلَم القديم");
      //  **حارسٌ معماريّ**: لا كاسكيدَ هادمٌ في مسار الحذف العاديّ — لا
      //  الغلافُ العامّ `deletePatient` ولا الجسمُ الذرّيُّ `deletePatientTx`.
      const routes = readFileSync(join(process.cwd(), "server/routes.ts"), "utf8");
      const delBlock = routes.slice(routes.indexOf("app.delete(api.patients.delete.path"),
        routes.indexOf("app.delete(api.patients.delete.path") + 1400);
      check(!/storage\.deletePatient\w*\s*\(/.test(delBlock),
        "ف٧. **ولا `storage.deletePatient` (ولا `deletePatientTx`) في نقطة الحذف العاديّ**");
      const trashStore = readFileSync(join(process.cwd(),
        "server/patients/trash_store.ts"), "utf8");
      //  **والكاسكيدُ الذرّيُّ يُنادى من «الحذف النهائي» وحده، بعد سطر
      //  التدقيق، ومن معاملته المفتوحة هو** — لا `storage.deletePatient`
      //  (الغلافُ الذي يفتح معاملةً ثانية مستقلّة) بل `deletePatientTx`
      //  مباشرةً بتمرير `tx` نفسِها (مراجعة الذرّية ٢٠٢٦-٠٨-٢٤).
      check(/storage\.deletePatientTx\s*\(\s*tx\s*,/.test(trashStore)
        && !/storage\.deletePatient\s*\(/.test(trashStore)
        && trashStore.indexOf("logAudit") < trashStore.lastIndexOf("storage.deletePatientTx("),
        "ف٨. والكاسكيدُ الذرّيُّ يُنادى من «الحذف النهائي» وحده، بعد سطر التدقيق، ومن معاملته هو");
      //  **والزرُّ لا يُعرَض إلّا بعد انقضاء المهلة** — الخادمُ سيردّه لو
      //  ضُغط أثناءها، فالشاشةُ لا تعرض ما سيُردّ.
      check(/mayPurge\s*&&\s*!r\.restorable/.test(page),
        "ف٩. **وزرُّ «حذف نهائي» مشروطٌ بانقضاء المهلة** — لا يُعرَض أثناءها");
      //  **ولا زرَّ «فتح الملف»** — الوجهةُ `/patients/:id` تُردّ ٤٠٤ عمداً
      //  لملفٍّ محذوف، فزرٌّ يعد بفتحها وعدٌ كاذب (القسمُ F من المراجعة).
      //  **والفحصُ على الكودِ الفعليّ لا على النصّ**: تعليقُ الشرح أعلاه
      //  يذكر العبارةَ نفسَها فلا يصحّ فحصُ سلسلةٍ نصّية بسيطة.
      check(!page.includes("data-testid={`button-open-")
        && !/href=\{`\/patients\/\$\{r\.id\}`\}/.test(page)
        && !page.includes('import { Link } from "wouter"'),
        "ف١٠. **ولا زرَّ «فتح الملف»** — وجهتُه تُردّ ٤٠٤ حتماً لملفٍّ محذوف");
      //  **والبوّابةُ نفسُها موثَّقةٌ في مخزن السلّة** — رسالتُها المشتركة.
      const trashStoreGate = trashStore.includes("PURGE_BEFORE_EXPIRY_MESSAGE")
        && trashStore.includes("window_expired");
      check(trashStoreGate,
        "ف١١. ومخزنُ السلّة يفرض بوّابةَ المهلة بالرسالة المشتركة نفسِها");

      //  ══ حارسٌ معماريّ على ذرّية «الحذف النهائي» (مراجعة ٢٠٢٦-٠٨-٢٤) ═══
      //  الفحصُ على جسم `purgePatient` وحده — لا الملفّ كلّه — فلا تُمسك
      //  به عباراتُ الشرح في التعليقات التوثيقية أعلى الدالّة.
      const purgeStart = trashStore.indexOf("export async function purgePatient");
      const purgeEnd = trashStore.indexOf("\n// ── ⑦", purgeStart);
      const purgeBody = trashStore.slice(purgeStart, purgeEnd > 0 ? purgeEnd : purgeStart + 4000);
      check(/FOR UPDATE/.test(purgeBody),
        "ف١٢. **`purgePatient` يقفل صفّ المريض بـ`FOR UPDATE`** — لا قراءةً عارية قبل القرار");
      check(/await\s+db\.transaction\s*\(/.test(purgeBody),
        "ف١٣. **وكلُّ ذلك داخل معاملةٍ واحدة** (`db.transaction`) — لا معاملاتٍ متعدّدة");
      //  **والفحصُ على المقطع الفعليّ لنداء `logAudit`** — من بداية النداء
      //  إلى القوسِ الذي يُغلقه (`});` بعد `tx,`) — لا رجماً بتخمين نمطٍ
      //  عامّ قد يلتقط أو يفوت حسب صياغة الحقول الأخرى.
      const logAuditStart = purgeBody.indexOf("logAudit({");
      const logAuditEnd = purgeBody.indexOf("});", logAuditStart);
      const logAuditCall = logAuditStart >= 0 && logAuditEnd >= 0
        ? purgeBody.slice(logAuditStart, logAuditEnd) : "";
      check(/storage\.getPatientAnyState\s*\(\s*patientId\s*,\s*tx\s*\)/.test(purgeBody)
        && /computeSnapshot\s*\(\s*patientId\s*,\s*tx\s*\)/.test(purgeBody)
        && /(^|[^a-zA-Z])tx\s*,?\s*$/.test(logAuditCall.trimEnd()),
        "ف١٤. وقراءةُ الحال ولقطتُه المالية وسطرُ التدقيق كلُّها بمعاملة القفل نفسِها");
      //  والترتيبُ الفعليّ داخل الجسم: استعلامُ القفل (وفيه الفحصُ معاً —
      //  جملةٌ واحدة) ⟵ اللقطةُ ⟵ التدقيقُ ⟵ الكاسكيدُ — كلُّ سابقٍ قبل
      //  لاحقه حرفياً في نصّ الدالّة. («window_expired» جزءُ عمود السطر
      //  الذي يحمل «FOR UPDATE» نفسِه، فلا ترتيبَ بينهما يُفحَص.)
      const order = ["FOR UPDATE", "computeSnapshot", "logAudit",
        "storage.deletePatientTx"].map((m) => purgeBody.indexOf(m));
      check(order.every((idx) => idx >= 0) && order.every((idx, i) => i === 0 || idx > order[i - 1]),
        "ف١٥. **والترتيبُ الفعليّ في الكود** قفلٌ ثمّ لقطةٌ ثمّ تدقيقٌ ثمّ كاسكيد");
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص سلّة المرضى نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
