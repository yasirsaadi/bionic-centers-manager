// اختبارُ المراجعة اليومية — حيّاً على Postgres وعلى النقطة الحقيقية.
// قاعدة محلّية: `npm run test:daily-review`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// `GET /api/daily-review` **قراءةٌ فقط**: لا كتابةَ من هذه النقطة إطلاقاً.
// الكتابةُ الفعلية (تسجيلٌ، توقيعُ معاينة، إتمامُ بيع، فتحُ صيانة، بيعُ
// جزء، حركاتُ التصنيع، الدفعات) تمرّ من الأبواب القانونية القائمة نفسِها —
// هذا الملفّ يثبت أن المراجعةَ اليومية **تقرأ أثرها بصدق**، لا أكثر.

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

const PORT = 6921;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-المراجعة-اليومية";
const ADMIN = 9961, MANAGER = 9962, RECV = 9963, EXPERT = 9964, EXPERT2 = 9965, DOC = 9966;

const S: Record<string, any> = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "مدير الفرع",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد",
    permissions: { canViewPatients: true, canAddPatients: true, canWriteMedicalExam: true },
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

// ── تثبيتُ زمنٍ محدَّد على سطر تدقيق/سجلّ، لتحكّمٍ دقيق بالفلترة والترتيب ──
async function stampAuditAt(entityType: string, entityId: number, at: Date) {
  await q(`UPDATE audit_log SET created_at=$1
            WHERE entity_type=$2 AND entity_id=$3 AND action='create'`,
    [at, entityType, entityId]);
}
async function stampPatientCreatedAt(patientId: number, at: Date) {
  await q(`UPDATE patients SET created_at=$1 WHERE id=$2`, [at, patientId]);
}
async function stampHistoryAt(workOrderId: number, actionType: string, at: Date) {
  await q(`UPDATE prosthetic_work_history SET created_at=$1
            WHERE work_order_id=$2 AND action_type=$3`, [at, workOrderId, actionType]);
}
async function stampPaymentAuditAt(paymentId: number, at: Date) {
  await stampAuditAt("payment", paymentId, at);
}

// ── فتحُ مريضٍ **بلا** المرور بنقطة `POST /api/patients` — فلا سطرَ تدقيقٍ
//    يُكتب له تلقائياً. هذا هو مصدرُ حالة «سجلٌّ قديم» بذاته، لا محاكاةً لها.
async function mkPatientRaw(label: string, opts: {
  isAmputee?: boolean; isMedicalSupport?: boolean; isPhysiotherapy?: boolean; branchId?: number;
} = {}) {
  const amputationSite = opts.isAmputee ? "احادي - طرف سفلي - يمين - تحت الركبة" : null;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$3,$4,$5,$6,$7,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, amputationSite, opts.branchId ?? 1,
      opts.isAmputee ?? false, opts.isMedicalSupport ?? false, opts.isPhysiotherapy ?? false]);
  return r[0].id;
}

/** يمنح مريضاً سطرَ تدقيقِ تسجيلٍ **معروف الفاعل** — يدوياً، لا عبر النقطة. */
async function mkRegistrationAudit(patientId: number, branchId: number, byName: string, byUserId: number) {
  await q(`INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id)
           VALUES ('patient',$1,'create',$2,$3,$4)`, [patientId, byUserId, byName, branchId]);
}

async function mkCase(patientId: number, branchId: number, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}

const signExam = (patientId: number, opts: { caseType?: string; chiefComplaint?: string } = {}) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    caseType: opts.caseType ?? "prosthetic",
    chiefComplaint: opts.chiefComplaint ?? "ألمٌ في موضع البتر",
    diagnosis: "تشخيصٌ سريريّ", plan: "خطّة",
  });

async function followupOf(patientId: number): Promise<number> {
  const [r] = await q(`SELECT id FROM post_exam_followups WHERE patient_id=$1
                        ORDER BY id DESC LIMIT 1`, [patientId]);
  return Number(r?.id ?? 0);
}

/** مريضٌ + حالة + طلبُ جهازٍ على مسار المعاينة + معاينةٌ موقّعة = متابعةٌ جاهزة. */
async function readySale(label: string, opts: { branchId?: number; chiefComplaint?: string } = {}) {
  const branchId = opts.branchId ?? 1;
  const pid = await mkPatientRaw(label, { isAmputee: true, branchId });
  await mkCase(pid, branchId, "prosthetic");
  const ep = await http("POST", `/api/patients/${pid}/device-episodes`, S.manager,
    { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
  if (ep.status !== 201) throw new Error(`startEpisode failed: ${JSON.stringify(ep.body)}`);
  const ex = await signExam(pid, { chiefComplaint: opts.chiefComplaint });
  if (ex.status >= 300) throw new Error(`signExam failed: ${JSON.stringify(ex.body)}`);
  return { pid, fid: await followupOf(pid), examId: ex.body?.id as number };
}

async function dailyReview(session: any, params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString();
  return http("GET", `/api/daily-review${qs ? `?${qs}` : ""}`, session);
}
function rowsOf(body: any): any[] { return (body?.rows ?? []) as any[]; }
function rowsFor(body: any, patientId: number): any[] {
  return rowsOf(body).filter((r) => Number(r.patientId) === patientId);
}
function familyRow(body: any, patientId: number, family: string): any | undefined {
  return rowsFor(body, patientId).find((r) => r.family === family);
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
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${RECV},${EXPERT},${EXPERT2},${DOC}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${ADMIN},${MANAGER},${RECV},${EXPERT},${EXPERT2},${DOC}])`);
  await q(`DELETE FROM audit_log WHERE entity_type='payment' AND entity_id IN (
             SELECT id FROM payments WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM audit_log WHERE entity_type='patient' AND entity_id IN (${ids})`);
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
  for (const [id, role, branchId, branchIds, name] of [
    [ADMIN, "admin", 1, "[1,2]", "المسؤول"],
    [MANAGER, "branch_manager", 1, "[1]", "مدير الفرع"],
    [RECV, "reception", 1, "[1]", "ريام"],
    [EXPERT, "prosthetics_expert", 1, "[1]", "الخبير الأول"],
    [EXPERT2, "prosthetics_expert", 2, "[2]", "خبيرُ الفرع الآخر"],
    [DOC, "doctor", 1, "[1]", "د. سعد"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true,
               ${role === "doctor" ? `'["prosthetic","medical_support"]'::jsonb` : "'null'::jsonb"})
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, display_name=EXCLUDED.display_name, is_active=true`,
      [id, `dr_u${id}`, role, name, branchId, branchIds]);
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

  // «اليوم» بتوقيت بغداد — الثابتُ الذي يُفلتَر عليه طوال الملفّ.
  const TODAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
  // لحظةٌ داخل يوم بغداد المطلوب بالساعة المطلوبة **بتوقيت بغداد نفسِه** —
  // منتصفُ ليل بغداد (٠٠:٠٠) = ٢١:٠٠ UTC للتاريخ السابق، ومنه نُضيف الساعات.
  // بناءُ نصٍّ مباشرٍ («T22:00:00Z») كان يخطئ قرب منتصف الليل: ٢٢ بغداد
  // بعد إضافة الإزاحة تتجاوز إلى اليوم التالي فعلياً.
  const baghdadMidnightUtcMs = new Date(`${TODAY}T00:00:00Z`).getTime() - 3 * 3600 * 1000;
  const todayAt = (baghdadHour: number) => new Date(baghdadMidnightUtcMs + baghdadHour * 3600 * 1000);
  const YESTERDAY_UTC = new Date(Date.now() - 26 * 3600 * 1000); // يقيناً أمسِ بغداد أيضاً

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. الصلاحية — للمسؤول العام حصراً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const asRecv = await dailyReview(S.recv);
      check(asRecv.status === 403, "١. الاستقبال ⟶ ٤٠٣", JSON.stringify(asRecv.body));
      const asManager = await dailyReview(S.manager);
      check(asManager.status === 403, "٢. مديرُ الفرع ⟶ ٤٠٣ (ليست صلاحيةً بل سلطةُ المسؤول وحده)",
        JSON.stringify(asManager.body));
      const asAdmin = await dailyReview(S.admin, { date: TODAY });
      check(asAdmin.status === 200, "٣. المسؤولُ العام ⟶ ٢٠٠", JSON.stringify(asAdmin.body));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. التسجيل — الزمنُ الموثوق، والفاعلُ من audit_log وحده ──");
    // ══════════════════════════════════════════════════════════════════
    let pKnown = 0, pLegacy = 0, pBackdated = 0, pYesterday = 0, pPhysioOnly = 0;
    {
      // معروفُ الفاعل، اليوم.
      pKnown = await mkPatientRaw("تسجيل-معروف", { isAmputee: true });
      await mkRegistrationAudit(pKnown, 1, "ريام", RECV);
      await stampAuditAt("patient", pKnown, todayAt(10));
      await stampPatientCreatedAt(pKnown, todayAt(10));

      // مجهولُ الفاعل — بلا سطر تدقيقٍ إطلاقاً (سجلٌّ قديم حقيقيّ).
      pLegacy = await mkPatientRaw("تسجيل-قديم", { isAmputee: true });
      await stampPatientCreatedAt(pLegacy, todayAt(11));

      // تسجيلٌ بتاريخٍ تجاريٍّ متأخّر (أمس) لكنّ الفعلَ الحقيقيّ اليوم —
      // الزمنُ الموثوق audit_log.created_at، لا patients.created_at.
      pBackdated = await mkPatientRaw("تسجيل-بأثر-رجعي", { isAmputee: true });
      await mkRegistrationAudit(pBackdated, 1, "المحاسب", RECV);
      await stampPatientCreatedAt(pBackdated, YESTERDAY_UTC); // تاريخٌ تجاريٌّ سابق
      await stampAuditAt("patient", pBackdated, todayAt(9)); // والفعلُ اليوم فعلاً

      // تسجيلٌ حقيقيٌّ أمس بالكامل — لا يظهر اليوم.
      pYesterday = await mkPatientRaw("تسجيل-أمس", { isAmputee: true });
      await mkRegistrationAudit(pYesterday, 1, "ريام", RECV);
      await stampPatientCreatedAt(pYesterday, YESTERDAY_UTC);
      await stampAuditAt("patient", pYesterday, YESTERDAY_UTC);

      // علاجٌ طبيعيٌّ محضٌ — خارج النطاق كلياً، مهما كان زمنُه.
      pPhysioOnly = await mkPatientRaw("علاج-طبيعي-فقط", { isPhysiotherapy: true });
      await mkRegistrationAudit(pPhysioOnly, 1, "ريام", RECV);
      await stampPatientCreatedAt(pPhysioOnly, todayAt(12));
      await stampAuditAt("patient", pPhysioOnly, todayAt(12));

      const r = await dailyReview(S.admin, { date: TODAY });
      const known = familyRow(r.body, pKnown, "registration");
      check(!!known, "٤. المعروفُ فاعلُه يظهر اليوم");
      check(known?.registeredByName === "ريام", "٥. اسمُ المسجِّل من audit_log بالضبط",
        String(known?.registeredByName));
      check(known?.registeredByUnknownLegacy === false, "٦. ليس «سجلاً قديماً»");

      const legacy = familyRow(r.body, pLegacy, "registration");
      check(!!legacy, "٧. مجهولُ الفاعل يظهر اليوم أيضاً (بديل الزمن: patients.created_at)");
      check(legacy?.registeredByName === null, "٨. اسمُ المسجِّل `null` — لا تخمين",
        String(legacy?.registeredByName));
      check(legacy?.registeredByUnknownLegacy === true, "٩. عُلِّم «سجلٌّ قديم» صراحةً");

      const backdated = familyRow(r.body, pBackdated, "registration");
      check(!!backdated,
        "١٠. **الحاسم**: audit_log.created_at (اليوم) لا patients.created_at (أمس) — يظهر اليوم");
      check(backdated?.registeredByName === "المحاسب", "١١. والفاعلُ معروفٌ رغم التاريخ التجاريّ الماضي");

      check(!familyRow(r.body, pYesterday, "registration"), "١٢. تسجيلُ الأمس الحقيقيّ لا يظهر اليوم");
      check(!familyRow(r.body, pPhysioOnly, "registration"),
        "١٣. **صفرُ تسرّبٍ للعلاج الطبيعي** — لا يظهر مهما كان زمنُه");
      check(rowsFor(r.body, pPhysioOnly).length === 0, "١٤. ولا في أيّ أسرةٍ أخرى لهذا المريض إطلاقاً");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. الفرعُ والخدمة — فلترةٌ حقيقية ──");
    // ══════════════════════════════════════════════════════════════════
    let pBranch2 = 0;
    {
      pBranch2 = await mkPatientRaw("فرعٌ-آخر", { isMedicalSupport: true, branchId: 2 });
      await mkRegistrationAudit(pBranch2, 2, "خبيرُ الفرع الآخر", EXPERT2);
      await stampPatientCreatedAt(pBranch2, todayAt(13));
      await stampAuditAt("patient", pBranch2, todayAt(13));

      const all = await dailyReview(S.admin, { date: TODAY });
      check(!!familyRow(all.body, pBranch2, "registration"), "١٥. بلا فلترةِ فرعٍ ⟶ يظهر");

      const b1 = await dailyReview(S.admin, { date: TODAY, branchId: "1" });
      check(!familyRow(b1.body, pBranch2, "registration"), "١٦. فلترةُ فرع ١ ⟶ لا يظهر مريضُ فرع ٢");
      check(!!familyRow(b1.body, pKnown, "registration"), "١٧. ويبقى مريضُ فرع ١ ظاهراً");

      const b2 = await dailyReview(S.admin, { date: TODAY, branchId: "2" });
      check(!!familyRow(b2.body, pBranch2, "registration"), "١٨. فلترةُ فرع ٢ ⟶ يظهر مريضُه");

      const svcProsthetic = await dailyReview(S.admin, { date: TODAY, serviceType: "prosthetic" });
      check(!familyRow(svcProsthetic.body, pBranch2, "registration"),
        "١٩. فلترةُ «أطراف» ⟶ لا يظهر مريضُ المساند");
      const svcSupport = await dailyReview(S.admin, { date: TODAY, serviceType: "medical_support" });
      check(!!familyRow(svcSupport.body, pBranch2, "registration"),
        "٢٠. فلترةُ «مساند» ⟶ يظهر مريضُ المساند");
      check(!familyRow(svcSupport.body, pKnown, "registration"),
        "٢١. وتُخفي مريضَ الأطراف الصِّرف");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الترتيبُ — الأحدثُ أوّلاً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const r = await dailyReview(S.admin, { date: TODAY });
      const times = rowsOf(r.body).map((x) => x.eventAt);
      const sorted = [...times].sort().reverse();
      same("٢٢. الصفوفُ مرتَّبةٌ تنازلياً بالزمن بالضبط", times, sorted);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. معاينةٌ طبية — سببُ الحضور والطبيب ──");
    // ══════════════════════════════════════════════════════════════════
    {
      // بلا تحكّمٍ يدويّ بزمن التوقيع: `signed_at` يُختَم `NOW()` عند
      // التوقيع نفسِه (ختمُ ٠٢٨ يرفض أيّ UPDATE لاحقٍ عليه)، وهذا يقع
      // اليوم فعلاً بحكم تشغيل الاختبار — لا حاجةَ لتثبيته.
      const { pid } = await readySale("معاينة-١", { chiefComplaint: "تآكل القالب القديم" });

      const r = await dailyReview(S.admin, { date: TODAY });
      const exam = familyRow(r.body, pid, "exam");
      check(!!exam, "٢٣. صفُّ المعاينة يظهر");
      check(exam?.whyTheyCame === "تآكل القالب القديم", "٢٤. سببُ الحضور = chiefComplaint بالضبط",
        String(exam?.whyTheyCame));
      check(exam?.doctorName === "د. سعد", "٢٥. اسمُ الطبيب موجود", String(exam?.doctorName));
      check(exam?.serviceType === "prosthetic", "٢٦. القسمُ صحيح");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. حسمُ ما بعد المعاينة — اشترى/لم يشترِ، والمال ──");
    // ══════════════════════════════════════════════════════════════════
    {
      // بخصم.
      const s1 = await readySale("حسم-خصم");
      const c1 = await http("POST", `/api/followups/${s1.fid}/complete-sale`, S.recv, {
        originalPrice: 1_000_000, discountAmount: 200_000, expertUserId: EXPERT,
      });
      check(c1.status === 200, "٢٧. إتمامُ البيع بخصمٍ ينجح", JSON.stringify(c1.body));

      // مجّانيّ.
      const s2 = await readySale("حسم-مجاني");
      const c2 = await http("POST", `/api/followups/${s2.fid}/complete-sale`, S.recv, {
        originalPrice: 500_000, discountAmount: 500_000, expertUserId: EXPERT,
      });
      check(c2.status === 200, "٢٨. إتمامُ البيع مجّاناً ينجح", JSON.stringify(c2.body));

      // سعرٌ كاملٌ بلا خصم.
      const s3 = await readySale("حسم-كامل");
      const c3 = await http("POST", `/api/followups/${s3.fid}/complete-sale`, S.recv, {
        originalPrice: 300_000, discountAmount: 0, expertUserId: EXPERT,
      });
      check(c3.status === 200, "٢٩. إتمامُ البيع بالسعر الكامل ينجح", JSON.stringify(c3.body));

      // لم يشترِ.
      const s4 = await readySale("حسم-رفض");
      const c4 = await http("POST", `/api/followups/${s4.fid}/not-bought`, S.recv,
        { reason: "غيّر المريضُ رأيه" });
      check(c4.status === 200, "٣٠. تسجيلُ «لم يشترِ» ينجح", JSON.stringify(c4.body));

      const r = await dailyReview(S.admin, { date: TODAY });

      const d1 = familyRow(r.body, s1.pid, "post_exam_decision");
      check(d1?.purchaseDecision === "bought", "٣١. بخصمٍ ⟶ purchaseDecision='bought'");
      check(d1?.money?.originalPrice === 1_000_000, "٣٢. السعرُ الأصليّ صحيح");
      check(d1?.money?.finalPrice === 800_000, "٣٣. السعرُ النهائيّ = أصليّ − خصم");
      check(d1?.money?.discount === 200_000, "٣٤. الخصمُ محسوبٌ بالضبط");
      check(d1?.money?.priceKind === "discount", "٣٥. النوعُ discount");
      check(d1?.expertName === "الخبير الأول", "٣٦. اسمُ الخبير ظاهر", String(d1?.expertName));

      const d2 = familyRow(r.body, s2.pid, "post_exam_decision");
      check(d2?.money?.priceKind === "free", "٣٧. مجّانيٌّ صراحةً ⟶ priceKind='free'");
      check(d2?.money?.finalPrice === 0, "٣٨. النهائيُّ صفرٌ صريح");
      check(d2?.money?.originalPrice === 500_000, "٣٩. والأصليُّ يبقى محفوظاً رغم المجّانيّة");

      const d3 = familyRow(r.body, s3.pid, "post_exam_decision");
      check(d3?.money?.priceKind === "normal", "٤٠. بلا خصمٍ ⟶ priceKind='normal'");
      check(d3?.money?.discount === 0, "٤١. الخصمُ صفرٌ لا `null`");

      const d4 = familyRow(r.body, s4.pid, "post_exam_decision");
      check(d4?.purchaseDecision === "not_bought", "٤٢. لم يشترِ ⟶ purchaseDecision='not_bought'");
      check(d4?.notBoughtReason === "غيّر المريضُ رأيه", "٤٣. السببُ محفوظٌ كما كُتب");
      check(d4?.money === null, "٤٤. لا حقيقةَ ماليةً لصفٍّ لم يُشترَ");
      check(d4?.doctorName === null, "٤٥. لا سلطةَ طبّيةً على القرار التجاريّ — لا يُعرَض طبيب");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. فتحُ صيانة — بلا ازدواجٍ مع حركة «فتح» ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatientRaw("صيانة-١", { isAmputee: true });
      const cid = await mkCase(pid, 1, "prosthetic");
      void cid;
      const m = await http("POST", "/api/no-exam/maintenance", S.recv, {
        patientId: pid, serviceType: "prosthetic", legacyUnrecordedDevice: true,
        expertUserId: EXPERT, maintenanceComponent: "socket",
        originalPrice: 150_000, discountAmount: 50_000,
      });
      check(m.status === 201, "٤٦. فتحُ الصيانة ينجح", JSON.stringify(m.body));
      const workOrderId = Number(m.body?.workOrderId ?? 0);
      await stampHistoryAt(workOrderId, "created", todayAt(16));

      const r = await dailyReview(S.admin, { date: TODAY });
      const mo = familyRow(r.body, pid, "maintenance_opened");
      check(!!mo, "٤٧. صفُّ فتح الصيانة يظهر");
      check(mo?.whyTheyCame === "socket", "٤٨. سببُ الحضور = الجزءُ المُصان", String(mo?.whyTheyCame));
      check(mo?.expertName === "الخبير الأول", "٤٩. اسمُ الخبير ظاهر");
      check(mo?.doctorName === null, "٥٠. لا طبيبَ على الصيانة المبسّطة إطلاقاً");
      check(mo?.money?.originalPrice === 150_000 && mo?.money?.finalPrice === 100_000
        && mo?.money?.discount === 50_000 && mo?.money?.priceKind === "discount",
        "٥١. الحقيقةُ الماليةُ الكاملة صحيحة", JSON.stringify(mo?.money));

      const dup = rowsFor(r.body, pid).find(
        (x) => x.family === "manufacturing_movement");
      check(!dup, "٥٢. **لا ازدواج**: لا صفَّ حركةٍ لسطر «created» نفسِه في أسرة الحركات");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. بيعُ جزءٍ بلا معاينة — بلا ازدواجٍ أيضاً ──");
    // ══════════════════════════════════════════════════════════════════
    let componentSalePid = 0, componentSaleWorkOrderId = 0;
    {
      componentSalePid = await mkPatientRaw("بيع-جزء-١", { isAmputee: true });
      await mkCase(componentSalePid, 1, "prosthetic");
      const s = await http("POST", "/api/no-exam/device-sale", S.recv, {
        patientId: componentSalePid, expertUserId: EXPERT, component: "socket",
        originalPrice: 400_000, discountAmount: 0,
      });
      check(s.status === 201, "٥٣. بيعُ الجزء ينجح", JSON.stringify(s.body));
      componentSaleWorkOrderId = Number(s.body?.workOrderId ?? 0);
      await stampHistoryAt(componentSaleWorkOrderId, "created", todayAt(17));

      const r = await dailyReview(S.admin, { date: TODAY });
      const cs = familyRow(r.body, componentSalePid, "component_sale_opened");
      check(!!cs, "٥٤. صفُّ بيع الجزء يظهر");
      check(cs?.whyTheyCame === "socket", "٥٥. سببُ الحضور = المطلوب");
      check(cs?.doctorName === null, "٥٦. لا طبيبَ على هذا المسار إطلاقاً");
      check(cs?.money?.priceKind === "normal" && cs?.money?.finalPrice === 400_000,
        "٥٧. السعرُ الكاملُ بلا خصم صحيح", JSON.stringify(cs?.money));

      const dup = rowsFor(r.body, componentSalePid).find((x) => x.family === "manufacturing_movement");
      check(!dup, "٥٨. **لا ازدواج** هنا أيضاً");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. حركةُ تصنيعٍ لاحقة — تُعرَض، بتسميةٍ عربية واضحة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const cancel = await http("POST",
        `/api/manufacturing/orders/${componentSaleWorkOrderId}/cancel`, S.admin,
        { note: "طلبَ المريضُ إلغاءه" });
      check(cancel.status === 200, "٥٩. إلغاءُ الأمر ينجح", JSON.stringify(cancel.body));
      await stampHistoryAt(componentSaleWorkOrderId, "status_change", todayAt(18));

      const r = await dailyReview(S.admin, { date: TODAY });
      const mv = familyRow(r.body, componentSalePid, "manufacturing_movement");
      check(!!mv, "٦٠. حركةُ الإلغاء تظهر كصفٍّ مستقلّ");
      check(mv?.whatHappened === "إلغاء الأمر", "٦١. **تسميةٌ عربيةٌ واضحة — لا 'status_change' خام**",
        String(mv?.whatHappened));
      check(mv?.performedByName === "المسؤول", "٦٢. مَن أدّى الحركةَ بعينها");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. دفعاتُ الأجهزة — الحقيقةُ من تدقيق الدفعة، لا تخمين ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatientRaw("دفعة-جهاز", { isAmputee: true });
      const cid = await mkCase(pid, 1, "prosthetic");
      // رصيدٌ متبقٍّ حقيقيّ يسمح بدفعةٍ — نقطةُ الحراسة «لا دفعة فوق
      // المتبقّي» تطبَّق دائماً، بصرف النظر عن مصدر الكلفة.
      await q(`UPDATE patients SET total_cost=1000000 WHERE id=$1`, [pid]);
      const pay = await http("POST", "/api/payments", S.recv, {
        patientId: pid, branchId: 1, amount: 250_000, paymentTreatmentType: "أطراف صناعية",
        notes: "دفعةٌ على الجهاز",
      });
      check(pay.status === 201, "٦٣. تسجيلُ الدفعة ينجح", JSON.stringify(pay.body));
      const paymentId = Number(pay.body?.id ?? 0);
      await stampPaymentAuditAt(paymentId, todayAt(19));

      const r = await dailyReview(S.admin, { date: TODAY });
      const dp = familyRow(r.body, pid, "device_payment");
      check(!!dp, "٦٤. صفُّ الدفعة يظهر");
      check(dp?.actualAmountPaid === 250_000, "٦٥. المبلغُ الفعليُّ = payments.amount بالضبط");
      check(dp?.paymentActorDirect === true, "٦٦. القابضُ مُثبَتٌ **مباشرةً** من تدقيق الدفعة");
      check(dp?.paymentActorName === "ريام", "٦٧. اسمُ القابض صحيح", String(dp?.paymentActorName));
      check(dp?.serviceType === "prosthetic", "٦٨. القسمُ من الحالة المرتبطة، لا تخميناً");

      // دفعةٌ غامضة — بلا حالةٍ مرتبطة إطلاقاً. لا تُصنَّف، لا تظهر.
      const [amb] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, notes)
         VALUES ($1,1,100000,'دفعةٌ بلا تصنيف') RETURNING id`, [pid]);
      await q(`UPDATE payments SET date=$1 WHERE id=$2`, [todayAt(20), amb.id]);

      const r2 = await dailyReview(S.admin, { date: TODAY });
      const devicePaymentsForPid = rowsFor(r2.body, pid).filter((x) => x.family === "device_payment");
      check(devicePaymentsForPid.length === 1,
        "٦٩. **الدفعةُ الغامضةُ لا تُخمَّن قسماً — تبقى مستبعَدةً كلياً** (صفٌّ واحدٌ لا اثنان)",
        String(devicePaymentsForPid.length));

      // دفعةٌ على حالة علاج طبيعي — خارج النطاق تماماً.
      const physioCase = await mkCase(pid, 1, "physiotherapy");
      const [physioPay] = await q<{ id: number }>(
        `INSERT INTO payments (patient_id, branch_id, amount, case_id, notes, date)
         VALUES ($1,1,80000,$2,'جلسةُ علاجٍ طبيعي',$3) RETURNING id`,
        [pid, physioCase, todayAt(21)]);
      void physioPay;
      const r3 = await dailyReview(S.admin, { date: TODAY });
      const stillOne = rowsFor(r3.body, pid).filter((x) => x.family === "device_payment");
      check(stillOne.length === 1, "٧٠. ودفعةُ العلاج الطبيعي كذلك — لا تدخل أسرة دفعات الأجهزة أبداً");
      void cid;
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. سعرٌ قديمٌ غيرُ مسجَّل — يبقى غائباً، لا صفراً ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatientRaw("صيانة-قديمة-بلا-سعر", { isAmputee: true });
      const [wo] = await q<{ id: number }>(
        `INSERT INTO prosthetic_work_orders
           (patient_id, branch_id, expert_user_id, service_type, purpose, status, current_stage,
            maintenance_component)
         VALUES ($1,1,$2,'prosthetic','maintenance','active','order_received','socket')
         RETURNING id`, [pid, EXPERT]);
      await q(`INSERT INTO prosthetic_work_history
                 (work_order_id, action_type, from_stage, to_stage, notes, performed_by, created_at)
               VALUES ($1,'created',NULL,'order_received','فتح صيانة (سجلٌّ قديم)',$2,$3)`,
        [wo.id, RECV, todayAt(22)]);

      const r = await dailyReview(S.admin, { date: TODAY });
      const mo = familyRow(r.body, pid, "maintenance_opened");
      check(!!mo, "٧١. الصفُّ القديمُ يظهر رغم غياب الحقول التجارية المُهيكَلة");
      check(mo?.money?.legacyUnrecorded === true, "٧٢. `legacyUnrecorded=true` صراحةً");
      check(mo?.money?.originalPrice === null && mo?.money?.finalPrice === null,
        "٧٣. **`null` لا `0`** — غيابُ تسجيلٍ لا مجّانيّةً ولا صفراً", JSON.stringify(mo?.money));
    }

    console.log(
      "\nملاحظة: آليّةُ إتمام البيع نفسِها (المالكية، اشتقاقُ السعر، التزامن…) "
      + "مُختبَرةٌ بتفصيلٍ في server/reception_sale.test.ts؛ الصيانةُ وبيعُ الجزء في "
      + "server/simplified_maintenance.test.ts و server/component_sale.test.ts — "
      + "هذا الملفُّ يثبت أن المراجعةَ اليومية تقرأ أثرها بصدقٍ فقط.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`,
      [[ADMIN, MANAGER, RECV, EXPERT, EXPERT2, DOC]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, MANAGER, RECV, EXPERT, EXPERT2, DOC]]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص المراجعة اليومية نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
