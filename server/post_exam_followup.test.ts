// متابعةُ ما بعد المعاينة واعتمادُ البيع — حيّاً على Postgres وعلى النقاط نفسها.
// قاعدة محلّية: `npm run test:followup`.
//
// ══ لماذا على النقاط لا على المخزن ══════════════════════════════════════
// المُختبَر هنا **ما يفعله الخادم بطلبٍ يصله**: مَن يُقبل، وبأي صلاحية، وفي
// أي فرع، وماذا يحدث حين يضغط اثنان معاً. فالواجهة قد تخفي زرّاً، والاختبار
// يسأل ماذا لو لم تخفِه.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **توقيعُ المعاينة يفتح متابعةً واحدة** — والتكرار لا يضاعفها.
// (٢) **ولا يبدأ تصنيعاً**: الحلقة تبقى `examined` ولا أمرَ يُولد.
// (٣) **المال بابٌ واحد**: مديرُ الفرع يتابع ولا يعتمد سعراً ولا شراءً.
// (٤) **ولا التفافَ من نقطةٍ قديمة**: `PUT /patients/:id` و`PATCH /cases`
//     و«تخصيص» كلّها تحترم السعر المعتمد بعد التوقيع.
// (٥) **اعتمادُ السعر ليس شراءً**، وموافقةُ المريض ليست اعتماداً.
// (٦) **والضغطة المزدوجة لا تُنتج أمرين** — لا حالةً قديمة تُكتب فوق جديدة.
// (٧) **ولا إغلاقَ تلقائي**، ولا حذفَ تاريخ، ولا حلقةَ تُعاد.

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

const PORT = 6841;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-متابعة-ما-بعد-المعاينة";
const ADMIN = 9861, RECV = 9862, MGR = 9863, DOC = 9864, DOC2 = 9865;
const EXPERT = 9866, RECV_B2 = 9867, DOC_B2 = 9868;
const EXPERT2 = 9869, ACCT = 9870, PHYSIO = 9871;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, DOC2, EXPERT, RECV_B2, DOC_B2,
  EXPERT2, ACCT, PHYSIO];

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  //  طبيبٌ آخر بنفس الاختصاص — ليُثبَت أن الاعتماد ليس حكراً على المعاين.
  doc2: { userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. الزميل", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {} },
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: { canViewPatients: true, canAddPatients: true } },
  docB2: { userId: DOC_B2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. الفرع ٢", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
  expert2: { userId: EXPERT2, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير الثاني", permissions: {} },
  //  **يحملان `canAddPatients`** عمداً: البوّابة بالدور لا بالقدرة، وهذان
  //  هما مَن كانت القدرةُ وحدها تفتح لهما ملفّ المتابعة.
  acct: { userId: ACCT, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب",
    permissions: { canViewPatients: true, canAddPatients: true, canManageAccounting: true } },
  physio: { userId: PHYSIO, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مُدخِل الجلسات",
    permissions: { canViewPatients: true, canEditPatients: true, canEnterSessions: true } },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    //  الترويسات Latin-1، وأسماءُ المستخدمين عربية — فتُرمَّز base64.
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

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','بتر',$3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}

/** يوقّع معاينةً **عبر نقطتها الحقيقية** — فالمتابعة تُفتح كما تُفتح إنتاجاً. */
async function signExam(patientId: number, session: any, opts: {
  caseType?: string; deviceCost?: number;
} = {}) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: opts.caseType ?? "prosthetic",
    diagnosis: "بتر تحت الركبة",
    deviceCost: opts.deviceCost ?? 1_500_000,
    prescription: {},
  });
}

/** متابعةُ مريضٍ الحيّة كما تصل الواجهة. */
async function followupOf(patientId: number, session: any = S.admin) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, session);
  const list = Array.isArray(r.body) ? r.body : [];
  return list[0] ?? null;
}

const eventTypes = (f: any) => (f?.events ?? []).map((e: any) => e.eventType);

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
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
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [DOC2, "doctor", "د. الزميل", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]"],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic"]'],
    [EXPERT2, "prosthetics_expert", "الخبير الثاني", 1, "[]"],
    [ACCT, "accountant", "المحاسب", 1, "[]"],
    [PHYSIO, "therapist", "مُدخِل الجلسات", 1, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `fu_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
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

    // ══ ١. التوقيع يفتح متابعةً واحدة — ولا يبدأ تصنيعاً ═══════════════
    console.log("\n── التوقيع يفتح المتابعة ──");
    const p1 = await mkPatient("الأول");
    await mkCase(p1);
    const ex1 = await signExam(p1, S.doc, { deviceCost: 1_500_000 });
    same("١. توقيع المعاينة نجح", ex1.status, 200);
    const f1 = await followupOf(p1);
    same("   وفُتحت متابعةٌ بحالة «بانتظار قرار المريض»",
      [f1?.status, f1?.approvedPrice, f1?.priceSource],
      ["awaiting_patient_decision", 1_500_000, "exam"]);
    same("   وسعرُها من كلفة المعاينة", f1?.approvedPrice, 1_500_000);
    same("   وحدثُ الإنشاء مسجَّل", eventTypes(f1), ["followup_created"]);

    //  التكرار: معاينةٌ ثانية لنفس المريض والخدمة **لا تضاعف المتابعة**.
    await signExam(p1, S.doc, { deviceCost: 1_500_000 });
    const dup = await q<{ n: number }>(
      `SELECT count(*)::int n FROM post_exam_followups WHERE patient_id = $1`, [p1]);
    same("   **ومعاينةٌ ثانية لا تُنشئ متابعةً ثانية** (idempotent)", dup[0].n, 1);

    same("٢. **ولا أمرَ تصنيعٍ وُلد**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p1])).length, 0);
    same("   ولا كلفةَ تحرّكت على المريض",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p1]))[0].total_cost), 0);

    // ══ ٣. صلاحيةُ تسجيل القرار ═══════════════════════════════════════
    console.log("\n── مَن يسجّل القرار ──");
    const defer = await http("POST", `/api/followups/${f1.id}/defer`, S.recv, {
      reason: "waiting_salary_or_finance", note: "ينتظر راتبه",
      nextFollowUpAt: "2026-09-01T09:00:00Z",
    });
    same("٣. **الاستعلامات يسجّل قرار المريض في فرعه**", defer.status, 200);
    same("   والحالة صارت «مؤجَّل»", defer.body?.status, "follow_up");
    same("   والسببُ والموعدُ محفوظان",
      [defer.body?.lastReason, String(defer.body?.nextFollowUpAt).slice(0, 10)],
      ["waiting_salary_or_finance", "2026-09-01"]);

    same("١٦. **و«مؤجَّل» بلا موعدٍ ولا استثناءٍ صريح يُردّ**",
      (await http("POST", `/api/followups/${f1.id}/defer`, S.recv,
        { reason: "needs_time" })).status, 400);
    const noSched = await http("POST", `/api/followups/${f1.id}/defer`, S.recv,
      { reason: "needs_time", noScheduledFollowUp: true });
    same("   والاستثناءُ الصريح يُقبل",
      [noSched.status, noSched.body?.noScheduledFollowUp], [200, true]);

    // ══ ٤. السعر: مَن يطلب ومَن يعتمد ═════════════════════════════════
    console.log("\n── تعديل السعر ──");
    const pr = await http("POST", `/api/followups/${f1.id}/price-request`, S.recv, {
      proposedPrice: 1_200_000, reason: "price", note: "ساوم على السعر",
    });
    same("٤. الاستعلامات **يطلب** تعديل السعر", pr.status, 200);
    same("   والحالة «بانتظار اعتماد السعر»", pr.body?.followup?.status, "price_approval_pending");
    same("   **والسعر المعتمد لم يتحرّك بعد**", pr.body?.followup?.approvedPrice, 1_500_000);
    const reqId = pr.body?.requestId;

    same("   **وطلبٌ ثانٍ معلَّق يُردّ**",
      (await http("POST", `/api/followups/${f1.id}/price-request`, S.recv,
        { proposedPrice: 1_000_000, reason: "price" })).status, 409);

    same("٥. **الاستعلامات لا يعتمد السعر**",
      (await http("POST", `/api/price-requests/${reqId}/decide`, S.recv,
        { decision: "approve" })).status, 403);
    same("٦. **ومديرُ الفرع لا يعتمد السعر**",
      (await http("POST", `/api/price-requests/${reqId}/decide`, S.mgr,
        { decision: "approve" })).status, 403);
    same("   ولا الخبير",
      (await http("POST", `/api/price-requests/${reqId}/decide`, S.expert,
        { decision: "approve" })).status, 403);

    //  والاعتماد لطبيبٍ **غير المعاين** — عمداً.
    const approve = await http("POST", `/api/price-requests/${reqId}/decide`, S.doc2,
      { decision: "approve", note: "موافق" });
    same("٧. **طبيبٌ آخر بنفس الاختصاص يعتمد** — لا حكرَ على المعاين", approve.status, 200);
    same("   والسعرُ المعتمد صار الجديد",
      [approve.body?.followup?.approvedPrice, approve.body?.followup?.priceSource],
      [1_200_000, "approved_change"]);
    same("٩. **والاعتماد ليس شراءً**: «بانتظار تأكيد المريض»",
      approve.body?.followup?.status, "price_approved_waiting_patient");
    same("   **ولا أمرَ تصنيعٍ وُلد باعتماد السعر**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p1])).length, 0);

    const f1b = await followupOf(p1);
    const approvedEvent = (f1b?.events ?? []).find((e: any) => e.eventType === "price_approved");
    same("٨. **والسعرُ القديم محفوظٌ في التاريخ**",
      [approvedEvent?.payload?.oldPrice, approvedEvent?.payload?.newApprovedPrice],
      [1_500_000, 1_200_000]);
    same("   ولقطتُه في الطلب أيضاً",
      (f1b?.priceRequests ?? [])[0]?.currentPrice, 1_500_000);
    same("   ومعاينةُ الطبيب **بقيت بسعرها الأصلي مختومة**",
      Number((await q(`SELECT device_cost FROM medical_exams WHERE patient_id = $1 ORDER BY id LIMIT 1`, [p1]))[0].device_cost),
      1_500_000);

    // ══ ١٠. الخبيرُ شرطٌ، ثم يؤكّد الموظّف فيقع البيع ═════════════════
    console.log("\n── تأكيد الشراء من الاستقبال مباشرةً ──");
    //  بلا خبير: يُردّ برسالةٍ تقول ما يُفعَل، ولا تصنيعَ يبدأ.
    const noExpertYet = await http("POST", `/api/followups/${f1.id}/confirm-purchase`, S.recv, {});
    same("١٠. **بلا خبيرٍ لا يُؤكَّد الشراء**", noExpertYet.status, 409);
    same("    ولا أمرَ وُلد",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p1])).length, 0);

    same("١١. (الاستعلامات تختار الخبير)",
      (await http("POST", `/api/followups/${f1.id}/expert`, S.recv,
        { expertUserId: EXPERT })).status, 200);

    // ══ ١٢. السعرُ لا يُهرَّب من جسم الطلب ═════════════════════════════
    //  الخادم يقرأ `approved_price` من الصفّ تحت القفل، فرقمٌ في الجسم
    //  يُتجاهَل كأنه لم يُرسَل.
    const smuggledPrice = await http("POST", `/api/followups/${f1.id}/confirm-purchase`, S.recv,
      { approvedPrice: 1, cost: 1, price: 1, expertUserId: EXPERT2 });
    same("١٢. تأكيدُ الاستعلامات ينجح **بلا اعتمادِ أحد**", smuggledPrice.status, 200);

    // ══ ١٣. الضغطة المزدوجة ═══════════════════════════════════════════
    //  تأكيدان **متزامنان** — وأحدهما فقط يجوز أن يُنشئ أمراً. والأوّل وقع
    //  أعلاه، فهذان يصطدمان بـ`converted` ويُردّان.
    const [a1, a2] = await Promise.all([
      http("POST", `/api/followups/${f1.id}/confirm-purchase`, S.recv, {}),
      http("POST", `/api/followups/${f1.id}/confirm-purchase`, S.mgr, {}),
    ]);
    const okCount = [smuggledPrice, a1, a2].filter((r) => r.status === 200).length;
    same("١٣. **الاستقبال يؤكّد الشراء** — واحدٌ فقط نجح", okCount, 1);
    check([a1, a2].some((r) => r.status === 409),
      "١٥. **والثاني رُدّ بتعارضٍ صريح لا بصمت**",
      JSON.stringify([a1.status, a2.status]));
    const orders = await q(
      `SELECT id, purpose, status, expert_user_id FROM prosthetic_work_orders WHERE patient_id = $1`, [p1]);
    same("   **ولا أمرَي بناءٍ وُلدا**", orders.length, 1);

    const f1c = await followupOf(p1);
    same("١٤. والمتابعة صارت `converted` مربوطةً بأمرها",
      [f1c?.status, f1c?.convertedWorkOrderId === Number(orders[0].id)],
      ["converted", true]);
    same("   **والسعرُ المحجوز هو المعتمد لا سعر المعاينة**",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p1]))[0].total_cost),
      1_200_000);
    same("   وقيدُ الكلفة كُتب بالسعر المعتمد",
      Number((await q(`SELECT COALESCE(SUM(amount),0)::int s FROM cost_entries WHERE patient_id = $1`, [p1]))[0].s),
      1_200_000);
    check(eventTypes(f1c).includes("purchase_confirmed") && eventTypes(f1c).includes("converted"),
      "   وسجلُّ التأكيد والتحويل موجودان معاً", JSON.stringify(eventTypes(f1c)));
    same("   **والخبيرُ هو المحفوظ لا ما هُرِّب في الجسم**",
      Number(orders[0].expert_user_id), EXPERT);

    // ══ ٢٢. النقطة القديمة لا تلتفّ على الاعتماد ══════════════════════
    console.log("\n── لا التفاف على الاعتماد ──");
    const p2 = await mkPatient("الالتفاف");
    const c2 = await mkCase(p2);
    await signExam(p2, S.doc, { deviceCost: 900_000 });
    const f2 = await followupOf(p2);
    same("(متابعةٌ حيّة بسعر ٩٠٠ ألف)", f2?.approvedPrice, 900_000);

    const mgrCase = await http("PATCH", `/api/patients/${p2}/cases/${c2}`, S.mgr, { cost: 300_000 });
    same("٢٢. **مديرُ الفرع لا يعدّل كلفة الحالة بعد التوقيع**", mgrCase.status, 409);
    same("   والكلفة لم تتغيّر",
      Number((await q(`SELECT cost FROM patient_cases WHERE id = $1`, [c2]))[0].cost), 0);

    const mgrTotal = await http("PUT", `/api/patients/${p2}`, S.mgr,
      { name: `${MARK} الالتفاف`, totalCost: 250_000, branchId: 1 });
    same("   **ولا يعدّل `total_cost` من «تعديل مريض»**",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p2]))[0].total_cost), 0);
    check(typeof mgrTotal.body?.costNote === "string",
      "   ويُبلَّغ بأن الكلفة لم تُعدَّل — لا إسقاطٌ صامت", JSON.stringify(mgrTotal.body?.costNote));

    //  والمسؤولُ العام **ليس مستثنى**: صلاحيةُ الاعتماد لا تعني تخطّي التاريخ.
    const admCase = await http("PATCH", `/api/patients/${p2}/cases/${c2}`, S.admin, { cost: 400_000 });
    same("ب٤. **والمسؤول العام كذلك لا يعدّل كلفة الحالة مباشرةً**", admCase.status, 409);
    const admTotal = await http("PUT", `/api/patients/${p2}`, S.admin,
      { name: `${MARK} الالتفاف`, totalCost: 400_000, branchId: 1 });
    same("   **ولا `total_cost` من «تعديل مريض»**",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p2]))[0].total_cost), 0);
    check(typeof admTotal.body?.costNote === "string",
      "   ويُبلَّغ صراحةً — لا إسقاطٌ صامت", JSON.stringify(admTotal.body?.costNote));

    //  …لكنه يستطيع بالطريق الرسمي، والتاريخ يحفظ القيمتين.
    const admReq = await http("POST", `/api/followups/${f2.id}/price-request`, S.admin,
      { proposedPrice: 400_000, reason: "price" });
    same("   والمسؤول **يستطيع** بالطريق الرسمي: يطلب…", admReq.status, 200);
    const admDecide = await http("POST", `/api/price-requests/${admReq.body.requestId}/decide`,
      S.admin, { decision: "approve" });
    same("   …ويعتمد بنفسه", [admDecide.status, admDecide.body?.followup?.approvedPrice],
      [200, 400_000]);
    const f2hist = await followupOf(p2);
    const admEv = (f2hist?.events ?? []).find((e: any) => e.eventType === "price_approved");
    same("   **والتاريخ يحفظ القديم والجديد**",
      [admEv?.payload?.oldPrice, admEv?.payload?.newApprovedPrice], [900_000, 400_000]);

    // ══ ب١. لا تجاوز لاعتماد الشراء من النقاط القديمة ══════════════════
    console.log("\n── لا تجاوز من النقاط القديمة ──");
    const bypassBody = { expertUserId: EXPERT, serviceType: "prosthetic", cost: 111_111 };
    //  الثلاثةُ الأُوَل تصل النقطتين فعلاً، فيوقفها حارسُ المتابعة بـ409.
    //  والطبيبُ لا يصلهما أصلاً (403 من التخويل القائم) — والنتيجة واحدة:
    //  لا بناءَ يبدأ من خارج المسار، والاختبار يفرّق بين الطبقتين لا يخلطهما.
    for (const [who, sess] of [["الاستقبال", S.recv], ["مدير الفرع", S.mgr],
      ["المسؤول العام", S.admin]] as any[]) {
      same(`ب١. **${who} لا يبدأ تصنيعاً من «تخصيص» ومتابعةٌ حيّة**`,
        (await http("POST", `/api/patients/${p2}/assign-manufacturing`, sess, bypassBody)).status,
        409);
      same(`     ولا من /api/manufacturing/orders`,
        (await http("POST", "/api/manufacturing/orders", sess,
          { patientId: p2, ...bypassBody })).status, 409);
    }
    const docBypass = [
      (await http("POST", `/api/patients/${p2}/assign-manufacturing`, S.doc, bypassBody)).status,
      (await http("POST", "/api/manufacturing/orders", S.doc, { patientId: p2, ...bypassBody })).status,
    ];
    check(docBypass.every((st) => st === 403 || st === 409),
      "ب١. **والطبيبُ كذلك لا يبدأ منهما** (يُردّ بالتخويل القائم أصلاً)",
      JSON.stringify(docBypass));
    same("     **ولا أمرَ تصنيعٍ وُلد من أيٍّ منها**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p2])).length, 0);
    same("     ولا كلفةَ تحرّكت",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p2]))[0].total_cost), 0);

    //  والمسارُ الوحيد يعمل: خبير ⟶ تأكيدُ الاستقبال. **بلا طبيبٍ ولا مسؤول.**
    await http("POST", `/api/followups/${f2.id}/expert`, S.recv, { expertUserId: EXPERT });
    const onlyPath = await http("POST", `/api/followups/${f2.id}/confirm-purchase`, S.recv, {});
    same("     **والمسار الرسمي وحده يُنشئ البناء** — بضغطة الاستقبال", onlyPath.status, 200);
    same("     ولم يمرّ بحالة اعتمادٍ إطلاقاً",
      (await q(`SELECT 1 FROM post_exam_followup_events
                 WHERE followup_id = $1 AND to_status = 'purchase_approval_pending'`,
      [f2.id])).length, 0);
    const p2orders = await q(
      `SELECT id, expert_user_id FROM prosthetic_work_orders WHERE patient_id = $1`, [p2]);
    same("     أمرٌ واحد بالسعر المعتمد",
      [p2orders.length,
        Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p2]))[0].total_cost)],
      [1, 400_000]);

    //  ومريضٌ **بلا متابعة حيّة** يبقى على سلوكه القديم حرفاً بحرف.
    const pLegacy = await mkPatient("بلا متابعة");
    await mkCase(pLegacy);
    await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_id,
               doctor_name, diagnosis, prescription, device_cost, version, signed_at)
             VALUES ($1,'prosthetic',1,$2,'د. قديم','تشخيص','{}'::jsonb,250000,1,NOW())`,
      [pLegacy, DOC]);
    same("     (ولا متابعةَ لهذا — كُتبت المعاينة مباشرةً)",
      (await q(`SELECT 1 FROM post_exam_followups WHERE patient_id=$1`, [pLegacy])).length, 0);
    same("ب١. **ومريضٌ بلا متابعة حيّة يبقى على المسار القديم**",
      (await http("POST", `/api/patients/${pLegacy}/assign-manufacturing`, S.recv,
        { expertUserId: EXPERT, serviceType: "prosthetic", cost: 0 })).status, 201);

    // ══ ١٧–١٩. الإغلاق وإعادة الفتح ═══════════════════════════════════
    console.log("\n── الإغلاق وإعادة الفتح ──");
    const p3 = await mkPatient("المغلق");
    await mkCase(p3);
    await signExam(p3, S.doc, { deviceCost: 800_000 });
    const f3 = await followupOf(p3);

    same("١٨. الإغلاق بلا سبب يُردّ",
      (await http("POST", `/api/followups/${f3.id}/close`, S.recv, {})).status, 400);
    const closed = await http("POST", `/api/followups/${f3.id}/close`, S.recv,
      { reason: "chose_other_center", note: "ذهب لمركز آخر" });
    same("   والإغلاق بسببٍ منظَّم يُقبل",
      [closed.status, closed.body?.status, closed.body?.closedReason],
      [200, "closed_without_purchase", "chose_other_center"]);

    const f3closed = await followupOf(p3);
    same("١٨. **والتاريخ كلّه محفوظ بعد الإغلاق**",
      eventTypes(f3closed).includes("followup_created"), true);
    same("   والمعاينةُ والحالةُ باقيتان",
      [(await q(`SELECT 1 FROM medical_exams WHERE patient_id=$1`, [p3])).length,
        (await q(`SELECT 1 FROM patient_cases WHERE patient_id=$1`, [p3])).length], [1, 1]);
    const codeBefore = (await q(`SELECT patient_code FROM patients WHERE id=$1`, [p3]))[0].patient_code;

    const eventsBeforeReopen = (f3closed?.events ?? []).length;
    const reopened = await http("POST", `/api/followups/${f3.id}/reopen`, S.recv,
      { toStatus: "awaiting_patient_decision", note: "عاد المريض" });
    same("١٩. إعادةُ الفتح ⟶ «بانتظار قرار المريض»",
      [reopened.status, reopened.body?.status], [200, "awaiting_patient_decision"]);
    const f3re = await followupOf(p3);
    check((f3re?.events ?? []).length === eventsBeforeReopen + 1,
      "   **وحدثٌ جديد يُضاف — لا القديم يُعدَّل**",
      `${eventsBeforeReopen} ⟶ ${(f3re?.events ?? []).length}`);
    check(eventTypes(f3re).includes("reopened") && eventTypes(f3re).includes("closed_without_purchase"),
      "   والإغلاقُ السابق باقٍ في السرد", JSON.stringify(eventTypes(f3re)));
    same("   ورمزُ المريض لم يتغيّر",
      (await q(`SELECT patient_code FROM patients WHERE id=$1`, [p3]))[0].patient_code, codeBefore);

    // ══ الحالةُ القديمة لا تُكتب فوق الجديدة ══════════════════════════
    //  هذا ما يعزل حارسَ المتابعة نفسه: حارسُ «تخصيص» القائم يمنع أمرين،
    //  لكنه لا يعرف شيئاً عن انتقالٍ من حالةٍ بائتة. فمَن فتح الصفحة قبل
    //  الإغلاق ثم ضغط «تأجيل» يجب أن يُردّ — لا أن يُحيي متابعةً مغلقة.
    console.log("\n── لا كتابةَ فوق حالةٍ تغيّرت ──");
    const pStale = await mkPatient("البائت");
    await mkCase(pStale);
    await signExam(pStale, S.doc, { deviceCost: 650_000 });
    const fStale = await followupOf(pStale);
    await http("POST", `/api/followups/${fStale.id}/close`, S.recv, { reason: "not_convinced" });
    const staleDefer = await http("POST", `/api/followups/${fStale.id}/defer`, S.recv,
      { reason: "needs_time", noScheduledFollowUp: true });
    same("**تأجيلٌ على متابعةٍ أُغلقت للتوّ ⟶ تعارضٌ صريح**", staleDefer.status, 409);
    same("   ولم تُحيَ المتابعة المغلقة",
      (await followupOf(pStale))?.status, "closed_without_purchase");
    check(String(staleDefer.body?.error ?? "").includes("حدّث الصفحة"),
      "   والرسالة تطلب تحديث الصفحة لا تصمت", JSON.stringify(staleDefer.body));

    //  وضغطتان **متزامنتان** على انتقالين متنافيين: واحدةٌ تفوز لا كلتاهما.
    const pRace = await mkPatient("السباق");
    await mkCase(pRace);
    await signExam(pRace, S.doc, { deviceCost: 550_000 });
    const fRace = await followupOf(pRace);
    const [r1, r2] = await Promise.all([
      http("POST", `/api/followups/${fRace.id}/accept-price`, S.recv, {}),
      http("POST", `/api/followups/${fRace.id}/accept-price`, S.recv, {}),
    ]);
    same("**وقبولان متزامنان ⟶ واحدٌ فقط ينجح**",
      [r1, r2].filter((r) => r.status === 200).length, 1);
    check([r1, r2].some((r) => r.status === 409),
      "   والثاني تعارضٌ صريح لا صمت", JSON.stringify([r1.status, r2.status]));
    const fRaceEnd = await followupOf(pRace);
    same("   والحالة انتقلت مرّةً واحدة", fRaceEnd?.status, "purchase_approval_pending");
    same("   **وحدثُ القبول كُتب مرّةً واحدة لا مرّتين**",
      eventTypes(fRaceEnd).filter((t: string) => t === "patient_accepted_price").length, 1);

    // ══ ٢٠. لا حلقةَ تُعاد للتأجيل أو الرفض أو إعادة الفتح ═════════════
    same("٢٠. **ولا حلقةُ جهازٍ أُنشئت خلال ذلك كلّه**",
      (await q(`SELECT 1 FROM patient_device_episodes WHERE patient_id = $1`, [p3])).length, 0);

    // ══ ١٧. لا إغلاق تلقائي ═══════════════════════════════════════════
    const p4 = await mkPatient("المتروك");
    await mkCase(p4);
    await signExam(p4, S.doc, { deviceCost: 700_000 });
    const f4 = await followupOf(p4);
    await http("POST", `/api/followups/${f4.id}/defer`, S.recv,
      { reason: "needs_time", nextFollowUpAt: "2020-01-01T09:00:00Z" });
    const f4after = await followupOf(p4);
    same("١٧. **موعدٌ فات بسنوات ولا إغلاقَ تلقائي**", f4after?.status, "follow_up");
    check((await http("GET", "/api/followups?filter=overdue", S.admin)).body
      ?.some((r: any) => r.id === f4.id),
      "   ويظهر في «متأخّر عن المتابعة» بدل أن يُغلق", "");

    // ══ ٢١. عزل الفروع ════════════════════════════════════════════════
    console.log("\n── عزل الفروع ──");
    const pB2 = await mkPatient("مريض ذي قار", 2);
    await mkCase(pB2, 2);
    await signExam(pB2, S.docB2, { deviceCost: 600_000 });
    const fB2 = await followupOf(pB2, S.admin);
    check(fB2 !== null, "(متابعةُ الفرع ٢ فُتحت)", JSON.stringify(fB2));

    same("٢١. **موظّف بغداد لا يقرأ متابعة ذي قار**",
      (await http("GET", `/api/followups/patient/${pB2}`, S.recv)).status, 403);
    same("   ولا يسجّل عليها قراراً",
      (await http("POST", `/api/followups/${fB2.id}/defer`, S.recv,
        { reason: "needs_time", noScheduledFollowUp: true })).status, 403);
    same("   **واستعلاماتُ بغداد لا تؤكّد شراء ذي قار**",
      (await http("POST", `/api/followups/${fB2.id}/confirm-purchase`, S.recv, {})).status, 403);
    same("   ولا مديرُ فرعها",
      (await http("POST", `/api/followups/${fB2.id}/confirm-purchase`, S.mgr, {})).status, 403);
    const listRecv = (await http("GET", "/api/followups", S.recv)).body ?? [];
    check(!listRecv.some((r: any) => r.patientId === pB2),
      "   **وشاشةُ المتابعة لا تعبر الفرع**", JSON.stringify(listRecv.map((r: any) => r.patientId)));
    check((await http("GET", "/api/followups", S.admin)).body?.some((r: any) => r.patientId === pB2),
      "   والمسؤول يرى الفروع كلّها", "");

    // ══ طابور «بانتظار موافقتي» ═══════════════════════════════════════
    console.log("\n── طابور الاعتماد ──");
    const qDoc = (await http("GET", "/api/followups/approvals", S.doc)).body;
    same("طابورُ الطبيب مفتوح", qDoc?.mayApprove, true);
    const qMgr = (await http("GET", "/api/followups/approvals", S.mgr)).body;
    same("**وطابورُ مديرِ الفرع فارغٌ — لا يعتمد سعراً**",
      [qMgr?.mayApprove, qMgr?.priceApprovals?.length], [false, 0]);
    //  **والشراءُ لم يعد فيه إطلاقاً**: خرج من طابور الاعتماد، فلا مهامَّ
    //  روتينية تُغرق شاشة الطبيب. والحقلُ نفسه لم يعد يُرجَع.
    same("**ولا حقلَ «اعتماد شراء» في الطابور أصلاً**",
      Object.prototype.hasOwnProperty.call(qDoc ?? {}, "purchaseApprovals"), false);

    // ══ رفضُ السعر لا يترك حالةً ميتة ═════════════════════════════════
    console.log("\n── رفض تعديل السعر ──");
    const p5 = await mkPatient("المرفوض");
    await mkCase(p5);
    await signExam(p5, S.doc, { deviceCost: 500_000 });
    const f5 = await followupOf(p5);
    const pr5 = await http("POST", `/api/followups/${f5.id}/price-request`, S.recv,
      { proposedPrice: 100_000, reason: "price" });
    const rej = await http("POST", `/api/price-requests/${pr5.body.requestId}/decide`, S.doc,
      { decision: "reject", note: "تخفيضٌ كبير" });
    same("الرفضُ يُقبل من الطبيب", rej.status, 200);
    same("   **والسعر المعتمد لم يتغيّر**", rej.body?.followup?.approvedPrice, 500_000);
    same("   **والحالة حيّةٌ لا ميتة**", rej.body?.followup?.status, "awaiting_patient_decision");
    const afterReject = await http("POST", `/api/followups/${f5.id}/accept-price`, S.recv, {});
    same("   فيستطيع الموظّف قبول السعر الحالي بعده",
      [afterReject.status, afterReject.body?.status], [200, "purchase_approval_pending"]);
    const f5ev = await followupOf(p5);
    check(eventTypes(f5ev).includes("price_rejected"),
      "   والرفضُ مسجَّل في التاريخ", JSON.stringify(eventTypes(f5ev)));

    same("**واعتمادُ طلبٍ حُسم يُردّ بتعارض**",
      (await http("POST", `/api/price-requests/${pr5.body.requestId}/decide`, S.doc,
        { decision: "approve" })).status, 409);

    // ══ ٢٥. لا backfill تاريخي ════════════════════════════════════════
    console.log("\n── لا backfill ──");
    const pOld = await mkPatient("قديمٌ بمعاينة");
    const cOld = await mkCase(pOld);
    await q(`INSERT INTO medical_exams (patient_id, case_id, case_type, branch_id, doctor_id,
               doctor_name, diagnosis, prescription, device_cost, version, signed_at)
             VALUES ($1,$2,'prosthetic',1,$3,'د. قديم','تشخيص','{}'::jsonb,400000,1,NOW() - interval '2 years')`,
      [pOld, cOld, DOC]);
    same("٢٥. **معاينةٌ كُتبت مباشرةً في القاعدة لا تُولّد متابعة**",
      (await q(`SELECT 1 FROM post_exam_followups WHERE patient_id = $1`, [pOld])).length, 0);
    same("   والمريض القديم لا يظهر في الطوابير",
      ((await http("GET", "/api/followups", S.admin)).body ?? [])
        .filter((r: any) => r.patientId === pOld).length, 0);

    // ══ ٢٣–٢٤. الخبير: قبل بدء العمل وبعده ════════════════════════════
    console.log("\n── تغيير الخبير ──");
    const woId = Number(orders[0].id);
    const before = await http("PATCH", `/api/manufacturing/orders/${woId}/reassign`, S.recv,
      { newExpertUserId: EXPERT, reason: "تبديل" });
    same("٢٣. **الاستعلامات يغيّر الخبير قبل بدء العمل**", before.status, 200);
    await q(`UPDATE prosthetic_work_orders SET started_at = NOW() WHERE id = $1`, [woId]);
    const after = await http("PATCH", `/api/manufacturing/orders/${woId}/reassign`, S.recv,
      { newExpertUserId: EXPERT, reason: "تبديل بعد البدء" });
    same("٢٤. **وبعد بدء العمل يُردّ** — بدلالة النظام لا بمرحلةٍ مخترَعة",
      after.status, 409);
    same("   والمدير يبقى قادراً (مخرج الإدارة)",
      (await http("PATCH", `/api/manufacturing/orders/${woId}/reassign`, S.mgr,
        { newExpertUserId: EXPERT, reason: "قرار إداري" })).status, 200);

    // ══ ب٢. الخبير: اقتراحُ الطبيب يُبذَر، والاستعلامات تقرّر ═════════
    console.log("\n── الخبير ──");
    const pExp = await mkPatient("الخبير");
    await mkCase(pExp);
    await http("POST", `/api/medical/patients/${pExp}/exams`, S.doc, {
      caseType: "prosthetic", diagnosis: "بتر", deviceCost: 700_000,
      prescription: {}, proposedExpertUserId: EXPERT,
    });
    const fExp = await followupOf(pExp);
    same("ب٢. **خبيرُ الطبيب المقترَح يُبذَر في المتابعة**",
      fExp?.selectedExpertUserId, EXPERT);
    check(typeof fExp?.selectedExpertName === "string",
      "     ويصل الواجهة باسمه لا برقمه", JSON.stringify(fExp?.selectedExpertName));

    const chg = await http("POST", `/api/followups/${fExp.id}/expert`, S.recv,
      { expertUserId: EXPERT2 });
    same("     **والاستعلامات تغيّره**",
      [chg.status, chg.body?.selectedExpertUserId], [200, EXPERT2]);
    same("     **ولا تصنيعَ بدأ بالتغيير**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pExp])).length, 0);
    const fExpEv = await followupOf(pExp);
    const expEv = (fExpEv?.events ?? []).find((e: any) => e.eventType === "expert_selected");
    same("     والحدث يحفظ القديم والجديد",
      [expEv?.payload?.oldExpertUserId, expEv?.payload?.newExpertUserId], [EXPERT, EXPERT2]);
    same("     وخبيرٌ من فرعٍ آخر يُردّ",
      (await http("POST", `/api/followups/${fExp.id}/expert`, S.recv,
        { expertUserId: DOC_B2 })).status, 400);

    await http("POST", `/api/followups/${fExp.id}/accept-price`, S.recv, {});
    //  **الاعتماد لا يقبل خبيراً من الجسم**: يُهرَّب EXPERT فيُتجاهَل.
    const smuggle = await http("POST", `/api/followups/${fExp.id}/approve-purchase`, S.doc,
      { expertUserId: EXPERT });
    same("ب٢. اعتماد الشراء نجح", smuggle.status, 200);
    const expOrder = await q(
      `SELECT expert_user_id FROM prosthetic_work_orders WHERE patient_id=$1`, [pExp]);
    same("     **والمُسنَد هو المحفوظ لا المهرَّب في الطلب**",
      Number(expOrder[0].expert_user_id), EXPERT2);
    same("     وبعد التحويل لا يُغيَّر الخبير من المتابعة",
      (await http("POST", `/api/followups/${fExp.id}/expert`, S.recv,
        { expertUserId: EXPERT })).status, 409);

    //  ومتابعةٌ بلا خبير: الاعتماد يُردّ ويطلب اختياره.
    const pNoExp = await mkPatient("بلا خبير");
    await mkCase(pNoExp);
    await signExam(pNoExp, S.doc, { deviceCost: 300_000 });
    const fNoExp = await followupOf(pNoExp);
    same("     (بلا خبيرٍ مقترَح)", fNoExp?.selectedExpertUserId, null);
    await http("POST", `/api/followups/${fNoExp.id}/accept-price`, S.recv, {});
    const noExpApprove = await http("POST", `/api/followups/${fNoExp.id}/approve-purchase`,
      S.doc, {});
    same("ب٢. **ولا اعتمادَ بلا خبيرٍ مختار**", noExpApprove.status, 409);
    same("     ولا أمرَ وُلد",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pNoExp])).length, 0);

    // ══ ب٣. قراءةُ المتابعة لمسؤوليها وحدهم ═══════════════════════════
    console.log("\n── مَن يقرأ المتابعة ──");
    for (const [who, sess] of [["خبير الأطراف", S.expert], ["المحاسب", S.acct],
      ["مُدخِل الجلسات", S.physio]] as any[]) {
      same(`ب٣. **${who} لا يقرأ لوحة المتابعة**`,
        (await http("GET", "/api/followups", sess)).status, 403);
      same(`     ولا ملفَّ متابعةِ مريض`,
        (await http("GET", `/api/followups/patient/${pExp}`, sess)).status, 403);
    }
    for (const [who, sess] of [["الاستقبال", S.recv], ["مدير الفرع", S.mgr],
      ["الطبيب", S.doc], ["المسؤول", S.admin]] as any[]) {
      same(`     و${who} يقرأ ضمن نطاقه`,
        (await http("GET", "/api/followups", sess)).status, 200);
    }

    // ══ ب٥. ليست كلُّ معاينةٍ نيّةَ شراء ══════════════════════════════
    console.log("\n── المعاينة الروتينية ──");
    const pRoutine = await mkPatient("الروتيني");
    const cRoutine = await mkCase(pRoutine);
    //  جهازٌ سُلّم له سابقاً — أمرُ بناءٍ مكتمل في تاريخه.
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
               service_type, purpose, status, current_stage)
             VALUES ($1,1,$2,'prosthetic','initial_build','completed','delivered')`,
      [pRoutine, EXPERT]);
    await signExam(pRoutine, S.doc, { deviceCost: 800_000 });
    same("ب٥. **معاينةٌ روتينية لمريضٍ له جهازٌ سابق ⟶ لا متابعةَ بيع**",
      (await q(`SELECT 1 FROM post_exam_followups WHERE patient_id=$1`, [pRoutine])).length, 0);

    //  …حتى يفتح الاستعلامات حلقةً صراحةً، فتُفتح متابعةٌ لها.
    const ep = await http("POST", `/api/patients/${pRoutine}/device-episodes`, S.recv,
      { serviceType: "prosthetic" });
    check(ep.status === 200 || ep.status === 201,
      "     (وفُتحت حلقةُ جهازٍ جديد صراحةً)", JSON.stringify({ s: ep.status, b: ep.body }));
    await signExam(pRoutine, S.doc, { deviceCost: 950_000 });
    const fRoutine = await followupOf(pRoutine);
    same("ب٥. **وبعد فتح الحلقة، معاينتُها تفتح متابعة**",
      [fRoutine?.status, fRoutine?.approvedPrice],
      ["awaiting_patient_decision", 950_000]);
    same("     ومربوطةٌ بالحلقة نفسها",
      Number(fRoutine?.deviceEpisodeId) > 0, true);

    // ══ ج١. الملفُّ المغلق لا يفتح النقاط القديمة ══════════════════════
    console.log("\n── المغلق لا يتجاوز الاعتماد ──");
    const pShut = await mkPatient("المغلق ثم العائد");
    await mkCase(pShut);
    await signExam(pShut, S.doc, { deviceCost: 600_000 });
    const fShut = await followupOf(pShut);
    await http("POST", `/api/followups/${fShut.id}/close`, S.recv,
      { reason: "not_interested_now" });
    same("(أُغلق بلا شراء)", (await followupOf(pShut))?.status, "closed_without_purchase");

    const shutBody = { expertUserId: EXPERT, serviceType: "prosthetic", cost: 500_000 };
    for (const [who, sess] of [["الاستقبال", S.recv], ["مدير الفرع", S.mgr],
      ["المسؤول العام", S.admin]] as any[]) {
      same(`ج١. **${who}: «تخصيص» على ملفٍّ مغلق ⟶ يُردّ**`,
        (await http("POST", `/api/patients/${pShut}/assign-manufacturing`, sess, shutBody)).status,
        409);
      same(`     ولا من /api/manufacturing/orders`,
        (await http("POST", "/api/manufacturing/orders", sess,
          { patientId: pShut, ...shutBody })).status, 409);
    }
    const shutRes = await http("POST", `/api/patients/${pShut}/assign-manufacturing`,
      S.recv, shutBody);
    check(String(shutRes.body?.error ?? "").includes("أعِد فتحه"),
      "     والرسالة تدلّ على إعادة الفتح لا «ممنوع» عامّة",
      JSON.stringify(shutRes.body?.error));
    same("     **ولا أمرَ تصنيعٍ وُلد**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pShut])).length, 0);
    same("     ولا كلفةَ تحرّكت",
      [Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pShut]))[0].total_cost),
        (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pShut])).length], [0, 0]);

    //  والعودة الصحيحة: إعادة فتح ⟶ خبير ⟶ تأكيد.
    await http("POST", `/api/followups/${fShut.id}/reopen`, S.recv,
      { toStatus: "awaiting_patient_decision" });
    await http("POST", `/api/followups/${fShut.id}/expert`, S.recv, { expertUserId: EXPERT });
    const shutApprove = await http("POST", `/api/followups/${fShut.id}/confirm-purchase`,
      S.recv, {});
    same("ج١. **والمسار الرسمي بعد إعادة الفتح ينجح**", shutApprove.status, 200);
    same("     بأمرٍ واحد وبالسعر المعتمد",
      [(await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pShut])).length,
        Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pShut]))[0].total_cost)],
      [1, 600_000]);
    //  وبعد التحويل لا يحكم الحارسُ شيئاً — الجهاز مرّ رسمياً وانتهى.
    same("     **و`converted` لا تحكم بعدها**",
      (await http("POST", `/api/patients/${pShut}/assign-manufacturing`, S.recv, shutBody)).status,
      409);
    check(!String((await http("POST", `/api/patients/${pShut}/assign-manufacturing`,
      S.recv, shutBody)).body?.error ?? "").includes("متابعة"),
      "     (والردّ من حارس «أمرٌ نشط» القائم لا من حارس المتابعة)", "");

    // ══ ج٢. إغلاق الملفّ **إلغاءٌ لا رفضُ سعر** ════════════════════════
    console.log("\n── الإلغاء ليس رفضاً ──");
    for (const [who, sess] of [["الاستقبال", S.recv], ["مدير الفرع", S.mgr]] as any[]) {
      const pC = await mkPatient(`إلغاء ${who}`);
      await mkCase(pC);
      await signExam(pC, S.doc, { deviceCost: 450_000 });
      const fC = await followupOf(pC);
      const rq = await http("POST", `/api/followups/${fC.id}/price-request`, sess,
        { proposedPrice: 300_000, reason: "price" });
      same(`   (${who} طلب تعديلاً)`, rq.status, 200);
      await http("POST", `/api/followups/${fC.id}/close`, sess, { reason: "chose_other_center" });
      const row = (await q(`SELECT status, decided_by, decision_note
                              FROM price_change_requests WHERE id=$1`, [rq.body.requestId]))[0];
      same(`ج٢. **${who} يُغلق ⟶ الطلب \`cancelled\` لا \`rejected\`**`, row.status, "cancelled");
      same(`     والمُلغي مسجَّل`, Number(row.decided_by), sess.userId);
      check(String(row.decision_note ?? "").includes("إغلاق"),
        "     ومعه سببُ الإلغاء", String(row.decision_note));
      const fCev = await followupOf(pC);
      check(eventTypes(fCev).includes("price_request_cancelled"),
        "     وحدثُ الإلغاء مسجَّل", JSON.stringify(eventTypes(fCev)));
      check(!eventTypes(fCev).includes("price_rejected"),
        "     **ولا حدثَ رفضٍ إطلاقاً**", JSON.stringify(eventTypes(fCev)));
    }
    //  و`rejected` لا يخرج إلّا من نقطة القرار بيد طبيبٍ أو مسؤول.
    const rejRows = await q(`SELECT r.decided_by FROM price_change_requests r
      JOIN patients p ON p.id = r.patient_id
      WHERE p.referral_source = $1 AND r.status = 'rejected'`, [MARK]);
    same("ج٢. **وكلُّ `rejected` قرارُ معتمِد** — لا استقبالٍ ولا مدير",
      rejRows.filter((r: any) => ![DOC, DOC2, ADMIN].includes(Number(r.decided_by))), []);
    check(rejRows.length > 0, "     (ووُجد رفضٌ حقيقي في المجموعة)", String(rejRows.length));

    // ══ ٢٧. مديرُ الفرع يؤكّد الشراء مباشرةً ══════════════════════════
    //  كان مستثنى صراحةً من `canApprove`، فكان أعجزَ من أن يبيع في فرعه.
    console.log("\n── تبسيطُ ما بعد المعاينة ──");
    const pMgr = await mkPatient("بيعُ المدير");
    await mkCase(pMgr);
    await signExam(pMgr, S.doc, { deviceCost: 700_000 });
    const fMgr = await followupOf(pMgr);
    same("٢٧. الحالةُ الأولى «بانتظار قرار المريض»", fMgr?.status, "awaiting_patient_decision");
    await http("POST", `/api/followups/${fMgr.id}/expert`, S.mgr, { expertUserId: EXPERT });
    const mgrBuy = await http("POST", `/api/followups/${fMgr.id}/confirm-purchase`, S.mgr, {});
    same("   **ومديرُ الفرع يؤكّد الشراء ويبدأ التصنيع**", mgrBuy.status, 200);
    same("   والمتابعة `converted` بأمرها", 
      [mgrBuy.body?.followup?.status, typeof mgrBuy.body?.workOrderId], ["converted", "number"]);
    //  **والمالُ قُيِّد في اللحظة نفسها** — لا يوم الاعتماد.
    same("   **والكلفةُ قُيِّدت فوراً على المريض**",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pMgr]))[0].total_cost),
      700_000);
    same("   وقيدُ الكلفة كُتب بمصدره القائم",
      (await q(`SELECT amount::int a, source FROM cost_entries WHERE patient_id = $1`, [pMgr]))
        .map((r: any) => [Number(r.a), r.source]),
      [[700_000, "assign_manufacturing"]]);
    same("   **ولا حالةَ اعتمادٍ مرّ بها الملفّ**",
      (await q(`SELECT 1 FROM post_exam_followup_events
                 WHERE followup_id = $1 AND to_status = 'purchase_approval_pending'`,
      [fMgr.id])).length, 0);

    // ══ ٢٨. البابُ الوحيد إلى الحالة الملغاة هو النقطةُ المتروكة ══════
    //  لا يُثبَت هذا بعدّ الصفوف — النقطةُ المتروكة `/accept-price` باقيةٌ
    //  للتوافق وتُنادى في أقسامٍ أخرى. فيُثبَت **بالباب**: كلُّ حدثٍ وجهتُه
    //  تلك الحالة نوعُه `patient_accepted_price` وحده، أي أنه جاء من النقطة
    //  القديمة صراحةً. فلا مسارٌ حيٌّ يقود إليها بعد اليوم.
    const gates = await q(`SELECT DISTINCT e.event_type FROM post_exam_followup_events e
      JOIN patients p ON p.id = e.patient_id
      WHERE p.referral_source = $1 AND e.to_status = 'purchase_approval_pending'`, [MARK]);
    same("٢٨. **ولا بابَ إلى حالة الاعتماد الملغاة سوى النقطة المتروكة**",
      gates.map((r: any) => r.event_type).sort(), ["patient_accepted_price"]);

    // ══ ٢٩. الخبيرُ المعطَّل أو من فرعٍ آخر يمنع التأكيد ═══════════════
    const pBadExp = await mkPatient("خبيرٌ غير صالح");
    await mkCase(pBadExp);
    await signExam(pBadExp, S.doc, { deviceCost: 400_000 });
    const fBad = await followupOf(pBadExp);
    same("٢٩. مَن ليس خبيراً يُردّ عند الاختيار",
      (await http("POST", `/api/followups/${fBad.id}/expert`, S.recv,
        { expertUserId: ACCT })).status, 400);
    //  والخبيرُ الصحيح يُختار، ثم يُعطَّل حسابُه **بعد** الاختيار.
    same("   والخبيرُ الصحيح يُختار", 
      (await http("POST", `/api/followups/${fBad.id}/expert`, S.recv,
        { expertUserId: EXPERT })).status, 200);
    await q(`UPDATE system_users SET is_active = false WHERE id = $1`, [EXPERT]);
    const staleExp = await http("POST", `/api/followups/${fBad.id}/confirm-purchase`, S.recv, {});
    same("   **وخبيرٌ عُطّل بعد اختياره يمنع التأكيد**", staleExp.status, 400);
    same("   ولا أمرَ وُلد ولا كلفةَ قُيِّدت",
      [(await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [pBadExp])).length,
        Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pBadExp]))[0].total_cost)],
      [0, 0]);
    await q(`UPDATE system_users SET is_active = true WHERE id = $1`, [EXPERT]);

    // ══ ٣٠. الصفُّ المحتجز قبل التبسيط يصير قابلاً للعمل ══════════════
    //  يُصنَع بالمسار القديم نفسه (`/accept-price` الباقية للتوافق) — فهو
    //  بالضبط ما تحمله القاعدة اليوم من ملفّاتٍ حبستها البوّابة الملغاة.
    const pStuck = await mkPatient("محتجزٌ قبل التبسيط");
    await mkCase(pStuck);
    await signExam(pStuck, S.doc, { deviceCost: 850_000 });
    const fStuck = await followupOf(pStuck);
    await http("POST", `/api/followups/${fStuck.id}/expert`, S.recv, { expertUserId: EXPERT });
    const legacyAccept = await http("POST", `/api/followups/${fStuck.id}/accept-price`, S.recv, {});
    same("٣٠. (صفٌّ محتجزٌ بالحالة الملغاة)", legacyAccept.body?.status, "purchase_approval_pending");
    const stuckBuy = await http("POST", `/api/followups/${fStuck.id}/confirm-purchase`, S.recv, {});
    same("   **والاستقبال يستأنفه بضغطةٍ واحدة بلا ترحيلِ بيانات**", stuckBuy.status, 200);
    same("   فيتحوّل كغيره ومالُه يُقيَّد",
      [stuckBuy.body?.followup?.status,
        Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pStuck]))[0].total_cost)],
      ["converted", 850_000]);
    //  **وتاريخُه محفوظٌ كاملاً** — بحدث الحالة القديمة وحدثِ التأكيد الجديد.
    const fStuckEnd = await followupOf(pStuck);
    check(eventTypes(fStuckEnd).includes("patient_accepted_price")
      && eventTypes(fStuckEnd).includes("purchase_confirmed"),
    "   وتاريخُه كاملٌ: الحدثُ القديم والجديد معاً", JSON.stringify(eventTypes(fStuckEnd)));

    // ══ ٣١. بعد اعتماد السعر يشتري الاستقبال مباشرةً ══════════════════
    const pDisc = await mkPatient("بعد التخفيض");
    await mkCase(pDisc);
    await signExam(pDisc, S.doc, { deviceCost: 1_000_000 });
    const fDisc = await followupOf(pDisc);
    await http("POST", `/api/followups/${fDisc.id}/expert`, S.recv, { expertUserId: EXPERT });
    const discReq = await http("POST", `/api/followups/${fDisc.id}/price-request`, S.recv,
      { proposedPrice: 750_000, reason: "price" });
    same("٣١. طلبُ التخفيض يُقبل من الاستقبال", discReq.status, 200);
    //  **وسلطةُ اعتماد السعر لم تتغيّر بحرف**: مديرُ الفرع يُردّ كما كان.
    same("   **ومديرُ الفرع لا يعتمد السعر — كما كان**",
      (await http("POST", `/api/price-requests/${discReq.body.requestId}/decide`, S.mgr,
        { decision: "approve" })).status, 403);
    const discOk = await http("POST", `/api/price-requests/${discReq.body.requestId}/decide`,
      S.doc, { decision: "approve" });
    same("   والطبيبُ يعتمده", 
      [discOk.status, discOk.body?.followup?.status, discOk.body?.followup?.approvedPrice],
      [200, "price_approved_waiting_patient", 750_000]);
    //  ثم يعود القرار للاستقبال — بلا عودةٍ إلى الطبيب.
    const discBuy = await http("POST", `/api/followups/${fDisc.id}/confirm-purchase`, S.recv, {});
    same("   **ثم يشتري الاستقبالُ مباشرةً بالسعر المعتمد الجديد**",
      [discBuy.status, discBuy.body?.followup?.status], [200, "converted"]);
    same("   والمقيَّد هو السعرُ المعتمد لا الأصلي",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pDisc]))[0].total_cost),
      750_000);

    // ══ ٣٢. أمرُ تصنيعٍ متعارضٌ يمنع التحويل ══════════════════════════
    const pConf = await mkPatient("تعارضُ التصنيع");
    await mkCase(pConf);
    await signExam(pConf, S.doc, { deviceCost: 600_000 });
    const fConf = await followupOf(pConf);
    await http("POST", `/api/followups/${fConf.id}/expert`, S.recv, { expertUserId: EXPERT });
    //  أمرُ بناءٍ فعّالٌ يُزرَع من خارج المسار — كما لو سبق بيعٌ آخر.
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
               service_type, purpose, status, current_stage)
             VALUES ($1,1,$2,'prosthetic','initial_build','active','order_received')`,
    [pConf, EXPERT]);
    const conflict = await http("POST", `/api/followups/${fConf.id}/confirm-purchase`, S.recv, {});
    same("٣٢. **أمرُ بناءٍ فعّالٌ يمنع التأكيد**", conflict.status, 409);
    same("   ولا كلفةَ تحرّكت",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pConf]))[0].total_cost), 0);
    same("   والمتابعة بقيت حيّةً كما هي",
      (await followupOf(pConf))?.status, "awaiting_patient_decision");

    // ══ ٣٣. العلاجُ الطبيعي لم يتغيّر بحرف ═══════════════════════════
    const pPhy = await mkPatient("العلاج الطبيعي");
    await q(`UPDATE patients SET is_amputee=false, is_physiotherapy=true WHERE id=$1`, [pPhy]);
    await mkCase(pPhy, 1, "physiotherapy");
    //  اختصاصُ الطبيب يُوسَّع مؤقّتاً ليوقّع معاينةَ علاجٍ طبيعي — الحارس
    //  القائم يمنع التوقيع خارج الاختصاص، وليس هو محلَّ الاختبار هنا.
    await q(`UPDATE system_users SET medical_specialties =
               '["prosthetic","medical_support","physiotherapy"]'::jsonb WHERE id = $1`, [DOC]);
    const phyExam = await signExam(pPhy, S.doc, { caseType: "physiotherapy", deviceCost: 0 });
    await q(`UPDATE system_users SET medical_specialties =
               '["prosthetic","medical_support"]'::jsonb WHERE id = $1`, [DOC]);
    check(phyExam.status === 200 || phyExam.status === 201,
      "٣٣. معاينةُ العلاج الطبيعي تُوقَّع كما كانت", String(phyExam.status));
    same("   **ولا متابعةَ قرارِ شراءٍ تُفتح لها إطلاقاً**",
      (await q(`SELECT 1 FROM post_exam_followups WHERE patient_id = $1`, [pPhy])).length, 0);
    same("   ولا كلفةَ تحرّكت",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [pPhy]))[0].total_cost), 0);

    // ══ ٢٦. حذفُ المريض يبقى ممكناً — القاعدة الملزمة ═════════════════
    console.log("\n── الكاسكيد ──");
    const pDel = await mkPatient("للحذف");
    await mkCase(pDel);
    await signExam(pDel, S.doc, { deviceCost: 300_000 });
    const fDel = await followupOf(pDel);
    await http("POST", `/api/followups/${fDel.id}/price-request`, S.recv,
      { proposedPrice: 200_000, reason: "price" });
    check(fDel !== null, "(مريضٌ بمتابعةٍ وطلبِ سعرٍ وأحداث)", "");
    const del = await http("DELETE", `/api/patients/${pDel}`, S.admin);
    check(del.status === 200 || del.status === 204,
      "٢٦. **حذفُ مريضٍ بمتابعةٍ كاملة ينجح** — الكاسكيد يشملها",
      JSON.stringify({ status: del.status, body: del.body }));
    same("   ولا صفَّ متابعةٍ يتيماً بقي",
      (await q(`SELECT 1 FROM post_exam_followups WHERE patient_id = $1`, [pDel])).length, 0);
    same("   ولا حدثاً ولا طلبَ سعر",
      [(await q(`SELECT 1 FROM post_exam_followup_events WHERE patient_id=$1`, [pDel])).length,
        (await q(`SELECT 1 FROM price_change_requests WHERE patient_id=$1`, [pDel])).length],
      [0, 0]);
  } finally {
    httpServer.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
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
