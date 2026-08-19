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
const EXPERT2 = 9869, ACCT = 9870, PHYSIO = 9871, MGR_B2 = 9872;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, DOC2, EXPERT, RECV_B2, DOC_B2,
  EXPERT2, ACCT, PHYSIO, MGR_B2];

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
  //  مديرُ فرعٍ آخر — يعتمد الخصمَ في فرعه ولا يعتمده في غيره.
  mgrB2: { userId: MGR_B2, role: "branch_manager", isAdmin: false, branchId: 2,
    accessibleBranches: [2], displayName: "مدير الفرع ٢",
    permissions: { canViewPatients: true, canAddPatients: true } },
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
    [MGR_B2, "branch_manager", "مدير الفرع ٢", 2, "[]"],
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
    console.log("\n── طلب الخصم ──");
    const disc = (sess: any, body: any, fid = f1.id) =>
      http("POST", `/api/followups/${fid}/discount-request`, sess, body);
    const decide = (sess: any, id: number, body: any) =>
      http("POST", `/api/discount-requests/${id}/decide`, sess, body);

    //  لقطةُ المال **قبل** الطلب — يُقارَن بها بعده حرفاً.
    const moneyOf = async (pid: number) => ({
      totalCost: Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pid]))[0].total_cost),
      caseCost: Number((await q(`SELECT COALESCE(SUM(cost),0) c FROM patient_cases WHERE patient_id=$1`, [pid]))[0].c),
      entries: (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pid])).length,
      payments: (await q(`SELECT 1 FROM payments WHERE patient_id=$1`, [pid])).length,
      orders: (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pid])).length,
    });
    const beforeReq = await moneyOf(p1);

    const pr = await disc(S.recv, {
      discountMode: "amount", discountValue: 300_000,
      reason: "patient_negotiation", note: "ساوم على السعر",
    });
    same("٤. الاستعلامات **يطلب** خصماً", pr.status, 200);
    same("   والحالة «بانتظار اعتماد الخصم»", pr.body?.followup?.status, "price_approval_pending");
    same("   **والسعر المعتمد لم يتحرّك بعد**", pr.body?.followup?.approvedPrice, 1_500_000);
    const reqId = pr.body?.requestId;

    // ══ ٤ب. الطلبُ لا يحرّك ديناراً — **ولا واحداً** ══════════════════
    same("٤ب. **ولا كلفةَ مريضٍ ولا كلفةَ حالة ولا قيد ولا دفعة ولا أمر**",
      await moneyOf(p1), beforeReq);
    //  والصفُّ يحفظ **ما طُلب** لا ما استُنتج منه.
    const savedReq = (await q(
      `SELECT discount_mode, discount_value::float v, discount_amount, current_price, proposed_price
         FROM price_change_requests WHERE id=$1`, [reqId]))[0];
    same("٤ج. **والطلبُ يحفظ ما طُلب بالضبط**",
      [savedReq.discount_mode, Number(savedReq.v), Number(savedReq.discount_amount),
        Number(savedReq.current_price), Number(savedReq.proposed_price)],
      ["amount", 300_000, 300_000, 1_500_000, 1_200_000]);

    // ══ ٤د. الحدود — **كلُّ حالةٍ على متابعةٍ نظيفةٍ خاصّةٍ بها** ═══════
    //  الصيغةُ الأولى كانت ترسل المحاولاتِ إلى متابعةٍ عليها طلبٌ معلَّق
    //  وتقبل ٤٠٠ أو ٤٠٩ — فكان الردّ قد يأتي من حارس «طلبٌ معلَّق بالفعل»
    //  لا من حدود الخصم، **والاختبارُ يمرّ بلا أن يثبت شيئاً**. فصار لكلّ
    //  حالةٍ ملفُّها الخالي، والمطلوبُ ٤٠٠ بعينها، ويُثبَت بعدها أن لا صفَّ
    //  كُتب ولا ديناراً تحرّك.
    const badPrice = 900_000;
    const bad = async (label: string, body: any) => {
      const pB = await mkPatient(`حدٌّ ${label.slice(0, 24)}`);
      await mkCase(pB);
      await signExam(pB, S.doc, { deviceCost: badPrice });
      const fB = await followupOf(pB);
      const r = await disc(S.recv, body, fB.id);
      same(label, r.status, 400);
      //  ولا أثرَ لأيّ نوع: لا طلبَ ولا سعرَ متحرّك ولا مالَ ولا أمر.
      same(`     (ولا أثرَ لها إطلاقاً)`, [
        (await q(`SELECT 1 FROM price_change_requests WHERE followup_id=$1`, [fB.id])).length,
        Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [fB.id]))[0].approved_price),
        (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pB])).length,
        (await q(`SELECT 1 FROM payments WHERE patient_id=$1`, [pB])).length,
        (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pB])).length,
        (await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [fB.id]))[0].status,
      ], [0, badPrice, 0, 0, 0, "awaiting_patient_decision"]);
    };
    await bad("٤د. **قيمةٌ سالبة تُردّ**", { discountMode: "amount", discountValue: -100_000, reason: "other" });
    await bad("والصفرُ يُردّ", { discountMode: "amount", discountValue: 0, reason: "other" });
    await bad("ومبلغٌ يساوي السعر يُردّ", { discountMode: "amount", discountValue: badPrice, reason: "other" });
    await bad("ومبلغٌ يفوق السعر يُردّ", { discountMode: "amount", discountValue: badPrice + 1, reason: "other" });
    await bad("ونسبةُ ١٠٠٪ تُردّ", { discountMode: "percentage", discountValue: 100, reason: "other" });
    await bad("ونسبةٌ فوق المئة تُردّ", { discountMode: "percentage", discountValue: 150, reason: "other" });
    await bad("ونسبةٌ سالبة تُردّ", { discountMode: "percentage", discountValue: -5, reason: "other" });
    await bad("وقيمةٌ غير رقمية تُردّ", { discountMode: "amount", discountValue: "abc", reason: "other" });
    await bad("ومبلغٌ كسريّ يُردّ", { discountMode: "amount", discountValue: 1500.5, reason: "other" });
    await bad("ونوعٌ مخترَع يُردّ", { discountMode: "flat", discountValue: 10, reason: "other" });
    await bad("وبلا نوعٍ يُردّ", { discountValue: 10_000, reason: "other" });
    await bad("**وسببٌ خارج القائمة يُردّ**", { discountMode: "amount", discountValue: 10_000, reason: "لأني أريد" });
    await bad("وبلا سبب يُردّ", { discountMode: "amount", discountValue: 10_000 });
    await bad("**وسببُ تأجيلٍ ليس سببَ خصم**", { discountMode: "amount", discountValue: 10_000, reason: "needs_time" });
    //  ══ ومنزلةٌ عشريّةٌ ثالثة تُردّ ولا تُقرَّب صامتةً ══
    //  العمودُ `NUMERIC(14,2)`: ما يزيد يُقرَّب في القاعدة، فيُخزَّن رقمٌ لم
    //  يكتبه أحد ويصير المبلغُ المحفوظ مخالفاً للنسبة المحفوظة.
    await bad("**ونسبةٌ بثلاث منازل تُردّ**",
      { discountMode: "percentage", discountValue: 12.345, reason: "other" });
    await bad("وكسرٌ طويلٌ يُردّ كذلك",
      { discountMode: "percentage", discountValue: 33.3333, reason: "other" });

    same("   **وطلبٌ ثانٍ معلَّق يُردّ**",
      (await disc(S.recv, { discountMode: "amount", discountValue: 100_000, reason: "other" })).status, 409);

    // ══ ٥. مَن لا يعتمد ══════════════════════════════════════════════
    same("٥. **الاستقبال لا يعتمد الخصم**",
      (await decide(S.recv, reqId, { decision: "approve" })).status, 403);
    same("   ولا الخبير", (await decide(S.expert, reqId, { decision: "approve" })).status, 403);
    same("   ولا المحاسب", (await decide(S.acct, reqId, { decision: "approve" })).status, 403);
    same("   ولا مُدخِلُ الجلسات", (await decide(S.physio, reqId, { decision: "approve" })).status, 403);
    //  ونطاقُ الفرع: مديرٌ/طبيبٌ من فرعٍ آخر يُردّ ولو كان مخوَّلاً.
    same("٦. **ومديرُ فرعٍ آخر لا يعتمد** — النطاقُ يُقرأ من صفّ المتابعة",
      (await decide(S.mgrB2, reqId, { decision: "approve" })).status, 403);
    same("   ولا طبيبُ فرعٍ آخر",
      (await decide(S.docB2, reqId, { decision: "approve" })).status, 403);

    //  والاعتماد لمخوَّلٍ **غير صاحب الطلب** — وطبيبٍ **غير المعاين**.
    const approve = await decide(S.doc2, reqId, { decision: "approve", note: "موافق" });
    same("٧. **طبيبٌ آخر بنفس الاختصاص يعتمد** — لا حكرَ على المعاين", approve.status, 200);
    //  **ومصدرُ السعر `approved_discount` لا `approved_change`**: الأخيرةُ
    //  تعني «اعتُمد تعديلُ سعرٍ سابق» وقد يكون رفعاً. وبعد الحسم لا يبقى
    //  إلّا هذا العمود شاهداً على أيّهما وقع.
    same("   والسعرُ المعتمد صار المخفَّض — ومصدرُه **خصمٌ معتمد**",
      [approve.body?.followup?.approvedPrice, approve.body?.followup?.priceSource],
      [1_200_000, "approved_discount"]);
    same("٩. **والاعتماد ليس شراءً**: «بانتظار قرار المريض»",
      approve.body?.followup?.status, "price_approved_waiting_patient");
    same("   **ولا أمرَ تصنيعٍ وُلد باعتماد الخصم**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p1])).length, 0);
    //  **والاعتمادُ نفسُه لا يُنشئ كلفةً على المريض** — يغيّر سعراً معتمداً فقط.
    same("٩ب. **والاعتماد لا يقيّد كلفةً ولا دفعة**",
      (({ entries, payments, totalCost }) => ({ entries, payments, totalCost }))(await moneyOf(p1)),
      (({ entries, payments, totalCost }) => ({ entries, payments, totalCost }))(beforeReq));
    same("   **ولا يُعتمَد الطلبُ مرّتين**",
      (await decide(S.admin, reqId, { decision: "approve" })).status, 409);

    const f1b = await followupOf(p1);
    const approvedEvent = (f1b?.events ?? []).find((e: any) => e.eventType === "discount_approved");
    same("٨. **والسعرُ القديم محفوظٌ في التاريخ**",
      [approvedEvent?.payload?.oldPrice, approvedEvent?.payload?.newApprovedPrice],
      [1_500_000, 1_200_000]);
    same("   **وقيمةُ الخصم المهيكلة في الحدث**",
      [approvedEvent?.payload?.discountMode, Number(approvedEvent?.payload?.discountAmount)],
      ["amount", 300_000]);
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

    //  …لكنه يستطيع بالطريق الرسمي — **ولا يعتمد طلبَ نفسه ولو كان المسؤول**.
    const admReq = await http("POST", `/api/followups/${f2.id}/discount-request`, S.admin,
      { discountMode: "amount", discountValue: 500_000, reason: "management_exception" });
    same("   والمسؤول **يستطيع** بالطريق الرسمي: يطلب…", admReq.status, 200);
    same("   **…ولا يعتمد طلبَ نفسه ولو كان المسؤول العام**",
      (await http("POST", `/api/discount-requests/${admReq.body.requestId}/decide`,
        S.admin, { decision: "approve" })).status, 403);
    same("   **ولا يرفضه** — المطلوب رأيٌ ثانٍ لا نتيجةٌ بعينها",
      (await http("POST", `/api/discount-requests/${admReq.body.requestId}/decide`,
        S.admin, { decision: "reject" })).status, 403);
    same("   والسعرُ لم يتحرّك بالمحاولتين",
      Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [f2.id]))[0].approved_price),
      900_000);
    //  ومخوَّلٌ آخر يقرّره — وهنا مديرُ الفرع، وهذا ما تغيّر بهذه المرحلة.
    const admDecide = await http("POST", `/api/discount-requests/${admReq.body.requestId}/decide`,
      S.mgr, { decision: "approve" });
    same("   **…ويعتمده مديرُ الفرع** — الخصمُ قرارٌ تجاري",
      [admDecide.status, admDecide.body?.followup?.approvedPrice], [200, 400_000]);
    const f2hist = await followupOf(p2);
    const admEv = (f2hist?.events ?? []).find((e: any) => e.eventType === "discount_approved");
    same("   **والتاريخ يحفظ القديم والجديد**",
      [admEv?.payload?.oldPrice, admEv?.payload?.newApprovedPrice], [900_000, 400_000]);
    same("   ومَن طلب ومَن قرّر كلاهما مسجَّل",
      [Number(admEv?.payload?.requestedBy), admEv?.actorName], [ADMIN, S.mgr.displayName]);

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
    same("**وطابورُ مديرِ الفرع مفتوحٌ أيضاً** — الخصمُ قرارٌ تجاري",
      qMgr?.mayApprove, true);
    //  ومَن لا يعتمد يرى قائمةً فارغة لا 403 — الشاشةُ تُعرض للجميع.
    const qRecv = (await http("GET", "/api/followups/approvals", S.recv)).body;
    same("   **وطابورُ الاستقبال مغلقٌ وفارغ**",
      [qRecv?.mayApprove, qRecv?.priceApprovals?.length], [false, 0]);
    same("   ولا الخبير ولا المحاسب",
      [(await http("GET", "/api/followups/approvals", S.expert)).body?.mayApprove,
        (await http("GET", "/api/followups/approvals", S.acct)).body?.mayApprove],
      [false, false]);
    //  **والشراءُ لم يعد فيه إطلاقاً**: خرج من طابور الاعتماد، فلا مهامَّ
    //  روتينية تُغرق شاشة الطبيب. والحقلُ نفسه لم يعد يُرجَع.
    same("**ولا حقلَ «اعتماد شراء» في الطابور أصلاً**",
      Object.prototype.hasOwnProperty.call(qDoc ?? {}, "purchaseApprovals"), false);

    // ══ رفضُ السعر لا يترك حالةً ميتة ═════════════════════════════════
    console.log("\n── رفض الخصم ──");
    const p5 = await mkPatient("المرفوض");
    await mkCase(p5);
    await signExam(p5, S.doc, { deviceCost: 500_000 });
    const f5 = await followupOf(p5);
    const pr5 = await http("POST", `/api/followups/${f5.id}/discount-request`, S.recv,
      { discountMode: "amount", discountValue: 400_000, reason: "patient_negotiation" });
    const rej = await http("POST", `/api/discount-requests/${pr5.body.requestId}/decide`, S.doc,
      { decision: "reject", note: "تخفيضٌ كبير" });
    same("الرفضُ يُقبل من الطبيب", rej.status, 200);
    same("   **والسعر المعتمد لم يتغيّر**", rej.body?.followup?.approvedPrice, 500_000);
    same("   **والحالة حيّةٌ لا ميتة**", rej.body?.followup?.status, "awaiting_patient_decision");
    const afterReject = await http("POST", `/api/followups/${f5.id}/accept-price`, S.recv, {});
    same("   فيستطيع الموظّف قبول السعر الحالي بعده",
      [afterReject.status, afterReject.body?.status], [200, "purchase_approval_pending"]);
    const f5ev = await followupOf(p5);
    check(eventTypes(f5ev).includes("discount_rejected"),
      "   والرفضُ مسجَّل في التاريخ", JSON.stringify(eventTypes(f5ev)));
    //  **والمرفوضُ لا يُعتمَد لاحقاً** — لا هو ولا الملغى.
    same("**واعتمادُ طلبٍ حُسم يُردّ بتعارض**",
      (await http("POST", `/api/discount-requests/${pr5.body.requestId}/decide`, S.mgr,
        { decision: "approve" })).status, 409);
    same("   ورفضُه ثانيةً كذلك",
      (await http("POST", `/api/discount-requests/${pr5.body.requestId}/decide`, S.mgr,
        { decision: "reject" })).status, 409);

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
      const rq = await http("POST", `/api/followups/${fC.id}/discount-request`, sess,
        { discountMode: "amount", discountValue: 150_000, reason: "patient_negotiation" });
      same(`   (${who} طلب خصماً)`, rq.status, 200);
      await http("POST", `/api/followups/${fC.id}/close`, sess, { reason: "chose_other_center" });
      const row = (await q(`SELECT status, decided_by, decision_note
                              FROM price_change_requests WHERE id=$1`, [rq.body.requestId]))[0];
      same(`ج٢. **${who} يُغلق ⟶ الطلب \`cancelled\` لا \`rejected\`**`, row.status, "cancelled");
      //  **والملغى لا يُعتمَد بعدها أبداً** — والمقرِّرُ طبيبٌ كي لا يختلط
      //  ردُّ «حُسم بالفعل» بردِّ «لا تعتمد طلبَ نفسك» في دورة المدير.
      same(`     **والملغى لا يُعتمَد لاحقاً**`,
        (await http("POST", `/api/discount-requests/${rq.body.requestId}/decide`, S.doc,
          { decision: "approve" })).status, 409);
      same(`     والمُلغي مسجَّل`, Number(row.decided_by), sess.userId);
      check(String(row.decision_note ?? "").includes("إغلاق"),
        "     ومعه سببُ الإلغاء", String(row.decision_note));
      const fCev = await followupOf(pC);
      check(eventTypes(fCev).includes("discount_cancelled"),
        "     وحدثُ الإلغاء مسجَّل", JSON.stringify(eventTypes(fCev)));
      check(!eventTypes(fCev).includes("discount_rejected"),
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
    //  **بالنسبة هذه المرّة** — ٢٥٪ من مليون = ٧٥٠ ألفاً.
    const discReq = await http("POST", `/api/followups/${fDisc.id}/discount-request`, S.recv,
      { discountMode: "percentage", discountValue: 25, reason: "financial_hardship" });
    same("٣١. طلبُ الخصم بالنسبة يُقبل من الاستقبال", discReq.status, 200);
    same("   **والنسبةُ تُحسَب في الخادم**",
      Number((await q(`SELECT proposed_price FROM price_change_requests WHERE id=$1`,
        [discReq.body.requestId]))[0].proposed_price), 750_000);
    same("   **والسعرُ المعتمد ما زال الأصلي والطلبُ معلَّق**",
      [Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [fDisc.id]))[0].approved_price),
        discReq.body?.followup?.status],
      [1_000_000, "price_approval_pending"]);
    // ══ **ولا شراءَ بالسعر المقترح ما دام الطلب معلَّقاً** ═════════════
    const raceBuy = await http("POST", `/api/followups/${fDisc.id}/confirm-purchase`, S.recv, {});
    same("٣١ب. **ولا يُشترى والطلبُ معلَّق**", raceBuy.status, 409);
    same("   ولا أمرَ تصنيعٍ وُلد بالمحاولة",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pDisc])).length, 0);
    //  **ومديرُ الفرع يعتمد الآن** — وهذا ما تغيّر بهذه المرحلة.
    const discOk = await http("POST", `/api/discount-requests/${discReq.body.requestId}/decide`,
      S.mgr, { decision: "approve" });
    same("   **ومديرُ الفرع يعتمده**",
      [discOk.status, discOk.body?.followup?.status, discOk.body?.followup?.approvedPrice],
      [200, "price_approved_waiting_patient", 750_000]);
    //  ثم يعود القرار للاستقبال — بلا عودةٍ إلى أحد.
    const discBuy = await http("POST", `/api/followups/${fDisc.id}/confirm-purchase`, S.recv, {});
    same("   **ثم يشتري الاستقبالُ مباشرةً بالسعر المخفَّض**",
      [discBuy.status, discBuy.body?.followup?.status], [200, "converted"]);
    // ══ **والمبلغُ المخفَّض نفسُه في كلّ أثرٍ مالي** ═══════════════════
    //  أمرُ التصنيع لا يحمل عموداً للسعر — المالُ يعيش على المريض والحالة
    //  والدفتر. فالإثباتُ أن الثلاثة تحمل المبلغَ عينَه، وأن الأمرَ الذي
    //  وُلد من هذا التأكيد بعينه مربوطٌ بالمتابعة، وأن الحدثَ يشهد بالرقم
    //  الذي مُرِّر إلى `assignManufacturing`.
    const discWoId = discBuy.body?.workOrderId;
    same("٣١ج. **كلفةُ المريض والحالةُ وقيدُ الدفتر — نفسُ المبلغ المخفَّض**", [
      Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [pDisc]))[0].total_cost),
      Number((await q(`SELECT COALESCE(SUM(cost),0) c FROM patient_cases WHERE patient_id=$1`, [pDisc]))[0].c),
      Number((await q(`SELECT COALESCE(SUM(amount),0) a FROM cost_entries
                        WHERE patient_id=$1 AND source='assign_manufacturing'`, [pDisc]))[0].a),
    ], [750_000, 750_000, 750_000]);
    const convEv = (await followupOf(pDisc))?.events?.find((e: any) => e.eventType === "converted");
    same("   **وأمرُ التصنيع مربوطٌ بها، والحدثُ يشهد بالمبلغ نفسِه**", [
      Number((await q(`SELECT converted_work_order_id FROM post_exam_followups WHERE id=$1`,
        [fDisc.id]))[0].converted_work_order_id),
      Number((await q(`SELECT COUNT(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`,
        [pDisc]))[0].n),
      Number(convEv?.payload?.approvedPrice),
    ], [discWoId, 1, 750_000]);
    same("   **ولا أثرَ للسعر الأصلي في أي منها**",
      (await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1 AND amount=1000000`, [pDisc])).length, 0);

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

    // ══ ٣٤. الخصم: ما بقي من الحُرّاس ═══════════════════════════════════
    console.log("\n── الخصم: الحُرّاس الباقية ──");

    //  ── ٣٤أ. مَن طلب لا يقرّر — لكلّ دورٍ مخوَّل على حدة ──
    for (const [who, sess] of [
      ["الطبيب", S.doc], ["مديرُ الفرع", S.mgr], ["المسؤول", S.admin],
    ] as any[]) {
      const pS = await mkPatient(`طلبَ بنفسه ${who}`);
      await mkCase(pS);
      await signExam(pS, S.doc, { deviceCost: 800_000 });
      const fS = await followupOf(pS);
      const rS = await http("POST", `/api/followups/${fS.id}/discount-request`, sess,
        { discountMode: "amount", discountValue: 100_000, reason: "doctor_instruction" });
      same(`٣٤أ. (${who} يطلب — والطلبُ مقبول)`, rS.status, 200);
      same(`     **ولا يعتمد طلبَ نفسه**`,
        (await http("POST", `/api/discount-requests/${rS.body.requestId}/decide`, sess,
          { decision: "approve" })).status, 403);
      same(`     **ولا يرفضه**`,
        (await http("POST", `/api/discount-requests/${rS.body.requestId}/decide`, sess,
          { decision: "reject" })).status, 403);
      same(`     والسعرُ لم يتحرّك`,
        Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [fS.id]))[0].approved_price),
        800_000);
      //  ومخوَّلٌ آخر يقرّره — الطلبُ لا يتجمّد.
      const other = sess === S.doc ? S.mgr : S.doc;
      same(`     **ومخوَّلٌ آخر يقرّره**`,
        (await http("POST", `/api/discount-requests/${rS.body.requestId}/decide`, other,
          { decision: "approve" })).status, 200);
    }
    //  **و«توجيهُ الطبيب» سببٌ لا تفويض**: الطلباتُ الثلاثة أعلاه استعملته
    //  وبقيت كلُّها معلَّقةً حتى قرّرها غيرُ صاحبها.
    check(true, "٣٤ب. **و«توجيه الطبيب» سببٌ موثَّق لا تفويضٌ يتخطّى الاعتماد**");

    //  ── ٣٤ج. سباقُ الاعتماد والرفض — قرارٌ واحد لا اثنان ──
    const pR = await mkPatient("سباقُ القرار");
    await mkCase(pR);
    await signExam(pR, S.doc, { deviceCost: 1_000_000 });
    const fR = await followupOf(pR);
    const rR = await http("POST", `/api/followups/${fR.id}/discount-request`, S.recv,
      { discountMode: "percentage", discountValue: 10, reason: "competitor_price" });
    const [d1, d2] = await Promise.all([
      http("POST", `/api/discount-requests/${rR.body.requestId}/decide`, S.doc, { decision: "approve" }),
      http("POST", `/api/discount-requests/${rR.body.requestId}/decide`, S.mgr, { decision: "reject" }),
    ]);
    const winners = [d1, d2].filter((r) => r.status === 200);
    same("٣٤ج. **اعتمادٌ ورفضٌ متزامنان ⟶ قرارٌ واحد ينفذ**", winners.length, 1);
    same("   والثاني يُردّ بتعارض", [d1, d2].filter((r) => r.status === 409).length, 1);
    const finalR = (await q(`SELECT status FROM price_change_requests WHERE id=$1`,
      [rR.body.requestId]))[0].status;
    check(finalR === "approved" || finalR === "rejected",
      "   والطلبُ في حالةٍ نهائيةٍ واحدة", String(finalR));
    same("   **والسعرُ يتبع القرار الذي نفذ — لا يُخصَم مرّتين**",
      Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [fR.id]))[0].approved_price),
      finalR === "approved" ? 900_000 : 1_000_000);

    //  ── ٣٤د. طلبان متزامنان ⟶ واحدٌ فقط ──
    const pT = await mkPatient("طلبان متزامنان");
    await mkCase(pT);
    await signExam(pT, S.doc, { deviceCost: 600_000 });
    const fT = await followupOf(pT);
    const [t1, t2] = await Promise.all([
      http("POST", `/api/followups/${fT.id}/discount-request`, S.recv,
        { discountMode: "amount", discountValue: 50_000, reason: "patient_negotiation" }),
      http("POST", `/api/followups/${fT.id}/discount-request`, S.mgr,
        { discountMode: "amount", discountValue: 90_000, reason: "management_exception" }),
    ]);
    same("٣٤د. **طلبان متزامنان ⟶ واحدٌ يُقبل**",
      [t1, t2].filter((r) => r.status === 200).length, 1);
    same("   ولا صفَّ معلَّقٌ ثانٍ في القاعدة",
      (await q(`SELECT 1 FROM price_change_requests WHERE followup_id=$1 AND status='pending'`,
        [fT.id])).length, 1);

    //  ── ٣٤هـ. بعد الاعتماد: المريضُ ما زال حرّاً ──
    const pF = await mkPatient("حرٌّ بعد الاعتماد");
    await mkCase(pF);
    await signExam(pF, S.doc, { deviceCost: 700_000 });
    const fF = await followupOf(pF);
    const rF = await http("POST", `/api/followups/${fF.id}/discount-request`, S.recv,
      { discountMode: "amount", discountValue: 200_000, reason: "financial_hardship" });
    await http("POST", `/api/discount-requests/${rF.body.requestId}/decide`, S.mgr,
      { decision: "approve" });
    const defF = await http("POST", `/api/followups/${fF.id}/defer`, S.recv,
      { reason: "needs_time", noScheduledFollowUp: true });
    same("٣٤هـ. **وبعد اعتماد الخصم يستطيع المريضُ التأجيل**",
      [defF.status, defF.body?.status], [200, "follow_up"]);
    same("   والسعرُ المخفَّض محفوظٌ عبر التأجيل",
      Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`, [fF.id]))[0].approved_price),
      500_000);
    const clsF = await http("POST", `/api/followups/${fF.id}/close`, S.recv,
      { reason: "chose_other_center" });
    same("   **ويستطيع الرفضَ نهائياً بعده** — الاعتمادُ ليس بيعاً",
      [clsF.status, clsF.body?.status], [200, "closed_without_purchase"]);
    same("   ولا كلفةَ قُيِّدت عليه إطلاقاً",
      [(await q(`SELECT 1 FROM cost_entries WHERE patient_id=$1`, [pF])).length,
        (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id=$1`, [pF])).length],
      [0, 0]);

    //  ── ٣٤ه٢. والقاعدةُ نفسُها ترفض الخصمَ الكاذب ──
    //  الحدُّ في `computeDiscount` يحرس المسار المدقَّق. وهذا يحرس **ما دونه**:
    //  إدراجٌ مباشر من Console أو سكربتٍ أو خطأٍ برمجيّ يومَ ما.
    const badInsert = async (label: string, cols: string, vals: string) => {
      let rejected = false;
      try {
        await q(`INSERT INTO price_change_requests
                   (followup_id, patient_id, branch_id, reason, status, ${cols})
                 VALUES ($1,$2,1,'other','pending',${vals})`, [fF.id, pF]);
      } catch { rejected = true; }
      check(rejected, label, "مرّ الإدراج ولم يُردّ!");
    };
    await badInsert("٣٤ه٢. **والقاعدةُ ترفض رفعَ سعرٍ متنكّراً في هيئة خصم**",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 600000, 'amount', 100000, -100000");
    await badInsert("     وترفض مبلغَ خصمٍ يخالف الفرقَ بين السعرين",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 400000, 'amount', 100000, 999");
    await badInsert("     وترفض نسبةً بلغت المئة",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 1, 'percentage', 100, 499999");
    await badInsert("     وترفض نوعَ خصمٍ مخترَعاً",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 400000, 'flat', 100000, 100000");
    //  **والصفُّ القديم يمرّ** — القيدُ يعفيه، وهذا شرطُ التوافق الرجعي.
    let legacyPassed = true;
    try {
      await q(`INSERT INTO price_change_requests
                 (followup_id, patient_id, branch_id, current_price, proposed_price,
                  reason, status)
               VALUES ($1,$2,1,500000,600000,'price','cancelled')`, [fF.id, pF]);
    } catch { legacyPassed = false; }
    check(legacyPassed,
      "     **وصفٌّ قديم بلا أعمدة خصمٍ يمرّ** — ولو كان رفعَ سعر", "رُدّ الصفُّ القديم!");

    //  ── ٣٤و. السجلُّ القديم يبقى مقروءاً ──
    //  صفٌّ بلا أعمدة الخصم — تماماً كصفوف ما قبل ترحيل ٠٥٧.
    const pL = await mkPatient("سجلٌّ قديم");
    await mkCase(pL);
    await signExam(pL, S.doc, { deviceCost: 400_000 });
    const fL = await followupOf(pL);
    const legacyId = Number((await q(
      `INSERT INTO price_change_requests
         (followup_id, patient_id, branch_id, current_price, proposed_price, reason, status,
          requested_by, requested_by_name)
       VALUES ($1,$2,1,400000,450000,'price','approved',$3,'موظّف قديم') RETURNING id`,
      [fL.id, pL, RECV]))[0].id);
    const legacyRow = (await followupOf(pL))?.priceRequests?.find((r: any) => r.id === legacyId);
    same("٣٤و. **الصفُّ القديم يُقرأ ويُوسَم «تعديل سعر» لا خصماً**",
      [legacyRow?.isLegacyPriceChange, legacyRow?.discountMode, legacyRow?.discountAmount],
      [true, null, null]);
    same("   **وقيمتاه محفوظتان ولو كان رفعَ سعر** — لا يُعاد كتابةُ تاريخ",
      [legacyRow?.currentPrice, legacyRow?.proposedPrice], [400_000, 450_000]);
    //  والقيدُ الجديد **لا يُطالِبه بشيء**: مرّ الإدراجُ أعلاه وهو دليلُه.
    check(true, "   **والقيدُ الجديد يعفي الصفَّ القديم صراحةً**");
    //  وحدثٌ قديم بأسمائه القديمة يبقى مفهوماً في السجلّ.
    await q(`INSERT INTO post_exam_followup_events
               (followup_id, patient_id, branch_id, event_type, payload)
             VALUES ($1,$2,1,'price_approved','{"oldPrice":400000}'::jsonb)`, [fL.id, pL]);
    check(eventTypes(await followupOf(pL)).includes("price_approved"),
      "   والحدثُ القديم يبقى باسمه في السجلّ", "");
    //  والصفُّ الجديد على نفس المتابعة يحمل الأعمدة كاملة.
    const rL = await http("POST", `/api/followups/${fL.id}/discount-request`, S.recv,
      { discountMode: "percentage", discountValue: 5, reason: "campaign_or_offer" });
    const newRow = (await followupOf(pL))?.priceRequests?.find((r: any) => r.id === rL.body.requestId);
    same("٣٤ز. **والصفُّ الجديد يحمل الخصمَ مهيكلاً**",
      [newRow?.isLegacyPriceChange, newRow?.discountMode, newRow?.discountValue,
        newRow?.discountAmount, newRow?.proposedPrice],
      [false, "percentage", 5, 20_000, 380_000]);

    // ══ ٣٥. الصفُّ القديم يُحكَم بقانون يومه ═══════════════════════════
    console.log("\n── الصفُّ القديم ──");
    //  صفّان قديمان: أحدهما خفضٌ والآخر **رفعُ سعر** — وهو بالضبط ما لا
    //  يجوز أن يصير قابلاً للاعتماد بيدٍ لم تكن تملكه لحظةَ تقديمه.
    const mkLegacyPending = async (label: string, price: number, proposed: number) => {
      const pG = await mkPatient(`قديمٌ معلَّق ${label}`);
      await mkCase(pG);
      await signExam(pG, S.doc, { deviceCost: price });
      const fG = await followupOf(pG);
      const id = Number((await q(
        `INSERT INTO price_change_requests
           (followup_id, patient_id, branch_id, current_price, proposed_price, reason,
            status, requested_by, requested_by_name)
         VALUES ($1,$2,1,$3,$4,'price','pending',$5,'موظّف قديم') RETURNING id`,
        [fG.id, pG, price, proposed, RECV]))[0].id);
      await q(`UPDATE post_exam_followups SET status='price_approval_pending' WHERE id=$1`, [fG.id]);
      return { patientId: pG, followupId: fG.id, requestId: id };
    };
    const legDown = await mkLegacyPending("خفض", 1_000_000, 800_000);
    const legUp = await mkLegacyPending("رفع", 1_000_000, 1_300_000);

    same("٣٥. **الصفُّ القديم يُقرأ قديماً لا خصماً**",
      (await q(`SELECT discount_mode, discount_value, discount_amount
                  FROM price_change_requests WHERE id=$1`, [legUp.requestId]))[0],
      { discount_mode: null, discount_value: null, discount_amount: null });

    //  ── السلطةُ القديمة بحرفها ──
    same("٣٦. **ومديرُ الفرع لا يعتمد صفّاً قديماً** — ولا حتى الخافض",
      (await http("POST", `/api/discount-requests/${legDown.requestId}/decide`, S.mgr,
        { decision: "approve" })).status, 403);
    const upByMgr = await http("POST", `/api/discount-requests/${legUp.requestId}/decide`, S.mgr,
      { decision: "approve" });
    same("   **ولا الرافعَ إطلاقاً** — وهذا هو الخطرُ بعينه", upByMgr.status, 403);
    check(String(upByMgr.body?.error ?? "").includes("قديم"),
      "   ورسالتُه تقول لماذا", String(upByMgr.body?.error));
    same("   ولا يرفضه مديرُ الفرع كذلك",
      (await http("POST", `/api/discount-requests/${legUp.requestId}/decide`, S.mgr,
        { decision: "reject" })).status, 403);
    same("   ولا الاستقبال ولا الخبير", [
      (await http("POST", `/api/discount-requests/${legUp.requestId}/decide`, S.recv,
        { decision: "approve" })).status,
      (await http("POST", `/api/discount-requests/${legUp.requestId}/decide`, S.expert,
        { decision: "approve" })).status,
    ], [403, 403]);
    same("   **والسعرُ لم يتحرّك بكلّ تلك المحاولات**",
      Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`,
        [legUp.followupId]))[0].approved_price), 1_000_000);

    //  ── والطبيبُ والمسؤولُ يقرّرانه، وأحداثُه بلغتها القديمة ──
    const legDoc = await http("POST", `/api/discount-requests/${legDown.requestId}/decide`,
      S.doc, { decision: "approve" });
    same("٣٧. **والطبيبُ المخوَّل يقرّره** — كما كان قبل هذه المرحلة",
      [legDoc.status, legDoc.body?.followup?.approvedPrice], [200, 800_000]);
    const legEvents = eventTypes(await followupOf(legDown.patientId));
    check(legEvents.includes("price_approved"),
      "   **وحدثُه `price_approved` لا `discount_approved`**", JSON.stringify(legEvents));
    check(!legEvents.includes("discount_approved"),
      "   ولا حدثَ خصمٍ إطلاقاً", JSON.stringify(legEvents));
    const legAdm = await http("POST", `/api/discount-requests/${legUp.requestId}/decide`,
      S.admin, { decision: "reject" });
    same("٣٨. **والمسؤولُ يقرّره كذلك**", legAdm.status, 200);
    const legUpEvents = eventTypes(await followupOf(legUp.patientId));
    check(legUpEvents.includes("price_rejected") && !legUpEvents.includes("discount_rejected"),
      "   **وحدثُ رفضِه `price_rejected`**", JSON.stringify(legUpEvents));

    //  ── وطابورُ مديرِ الفرع لا يحمل القديم ──
    const legQ = await mkLegacyPending("للطابور", 700_000, 900_000);
    const qMgr2 = (await http("GET", "/api/followups/approvals", S.mgr)).body;
    const qDoc2 = (await http("GET", "/api/followups/approvals", S.doc)).body;
    const hasIn = (body: any, id: number) =>
      (body?.priceApprovals ?? []).some((a: any) => a.requestId === id);
    same("٣٩. **وطابورُ مديرِ الفرع يستثني القديم**", hasIn(qMgr2, legQ.requestId), false);
    same("   **وطابورُ الطبيب يحمله**", hasIn(qDoc2, legQ.requestId), true);
    same("   والعلَمُ يُقال للواجهة صراحةً",
      [qMgr2?.mayDecideLegacy, qDoc2?.mayDecideLegacy], [false, true]);

    //  ── ولا يُطبَّق منعُ اعتماد النفس بأثرٍ رجعيّ ──
    //  الطبيبُ نفسُه هو مَن قدّم هذا الصفَّ القديم — ويقرّره، لأن القاعدة
    //  لم تكن قائمةً يومَ قُدّم، وتطبيقُها رجعياً قد يجمّده إلى الأبد.
    const legSelf = await mkLegacyPending("طلبه الطبيب", 500_000, 450_000);
    await q(`UPDATE price_change_requests SET requested_by=$1 WHERE id=$2`, [DOC, legSelf.requestId]);
    same("٤٠. **ولا يُطبَّق منعُ اعتماد النفس على صفٍّ قديم**",
      (await http("POST", `/api/discount-requests/${legSelf.requestId}/decide`, S.doc,
        { decision: "approve" })).status, 200);

    // ══ ٤١. النافذةُ القديمة — مُحوِّلٌ حقيقي ══════════════════════════
    console.log("\n── النافذة القديمة ──");
    const pOldWin = await mkPatient("نافذةٌ قديمة");
    await mkCase(pOldWin);
    await signExam(pOldWin, S.doc, { deviceCost: 1_000_000 });
    const fOldWin = await followupOf(pOldWin);
    //  **الحمولةُ القديمة حرفاً** كما ترسلها صفحةُ `main` قبل النشر.
    const staleOk = await http("POST", `/api/followups/${fOldWin.id}/price-request`, S.recv,
      { proposedPrice: 820_000, reason: "price", note: "ساوم" });
    same("٤١. **الحمولةُ القديمة تُقبل وتُحوَّل** — لا 400 «نوع الخصم مطلوب»",
      staleOk.status, 200);
    const staleRow = (await q(
      `SELECT discount_mode, discount_value::float v, discount_amount, current_price,
              proposed_price, reason, note
         FROM price_change_requests WHERE id=$1`, [staleOk.body.requestId]))[0];
    same("   **وصارت خصماً مهيكلاً بالمبلغ**",
      [staleRow.discount_mode, Number(staleRow.v), Number(staleRow.discount_amount),
        Number(staleRow.current_price), Number(staleRow.proposed_price)],
      ["amount", 180_000, 180_000, 1_000_000, 820_000]);
    same("   **والسببُ القديم تُرجم حتمياً** — «السعر» ⟶ مفاوضة المريض",
      staleRow.reason, "patient_negotiation");
    check(String(staleRow.note ?? "").includes("price"),
      "   **والأصلُ محفوظٌ في الملاحظة** — لا يضيع ما قاله الموظّف",
      String(staleRow.note));
    const staleEv = (await followupOf(pOldWin))?.events
      ?.find((e: any) => e.eventType === "discount_requested");
    same("   **وفي حمولة الحدث كذلك، مع وسم المسار**",
      [staleEv?.payload?.legacyReason, staleEv?.payload?.staleClient], ["price", true]);

    //  ── ولا يُبعَث رفعُ السعر من قبرِه ──
    const pOldUp = await mkPatient("نافذةٌ قديمة ترفع");
    await mkCase(pOldUp);
    await signExam(pOldUp, S.doc, { deviceCost: 600_000 });
    const fOldUp = await followupOf(pOldUp);
    for (const [label, proposed] of [["يفوق", 700_000], ["يساوي", 600_000]] as any[]) {
      const r = await http("POST", `/api/followups/${fOldUp.id}/price-request`, S.recv,
        { proposedPrice: proposed, reason: "price" });
      same(`٤٢. **وسعرٌ ${label} المعتمد يُردّ** — لا رفعَ بعد اليوم`, r.status, 400);
      //  والرسالةُ تقول **ما تغيّر وماذا يفعل** — لا «قيمة غير صالحة» عارية.
      //  فالموظّف أمام نافذةٍ قديمة لا يعرف أن القاعدة تبدّلت تحته.
      check(String(r.body?.error ?? "").includes("حدّث الصفحة")
        && String(r.body?.error ?? "").includes("خصم"),
        `     ورسالتُه تقول ما تغيّر وتطلب تحديث الصفحة`, String(r.body?.error));
    }
    same("   **ولا صفَّ طلبٍ كُتب بالمحاولتين**",
      (await q(`SELECT 1 FROM price_change_requests WHERE followup_id=$1`, [fOldUp.id])).length, 0);
    same("   ولا السعرُ تحرّك ولا الحالة",
      [Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`,
        [fOldUp.id]))[0].approved_price),
        (await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [fOldUp.id]))[0].status],
      [600_000, "awaiting_patient_decision"]);
    //  وسببٌ قديمٌ لا يقابله شيءٌ بعينه يقع في «سبب آخر» لا يُخمَّن.
    const staleOther = await http("POST", `/api/followups/${fOldUp.id}/price-request`, S.recv,
      { proposedPrice: 500_000, reason: "health_condition" });
    same("٤٣. **وسببٌ لا يقابله شيء يقع في «سبب آخر»**",
      [staleOther.status,
        (await q(`SELECT reason FROM price_change_requests WHERE id=$1`,
          [staleOther.body.requestId]))[0].reason],
      [200, "other"]);

    // ══ ٤٤. والقاعدةُ تسدّ ثغرةَ الصفّ نصفِ الممتلئ ════════════════════
    console.log("\n── شكلُ الصفّ في القاعدة ──");
    const shape = async (label: string, cols: string, vals: string, shouldPass: boolean) => {
      let ok = true;
      try {
        await q(`INSERT INTO price_change_requests
                   (followup_id, patient_id, branch_id, reason, status, ${cols})
                 VALUES ($1,$2,1,'other','cancelled',${vals})`, [fOldUp.id, pOldUp]);
      } catch { ok = false; }
      same(label, ok, shouldPass);
    };
    await shape("٤٤. **صفٌّ قديمٌ بأعمدةٍ ثلاثةٍ فارغة يمرّ**",
      "current_price, proposed_price", "500000, 600000", true);
    await shape("   **ونوعٌ فارغٌ مع مبلغِ خصمٍ يُردّ** — لا تنكُّرَ بالفراغ",
      "current_price, proposed_price, discount_amount", "500000, 400000, 100000", false);
    await shape("   ونوعٌ فارغٌ مع قيمةِ خصمٍ يُردّ",
      "current_price, proposed_price, discount_value", "500000, 400000, 100000", false);
    await shape("   **وخصمٌ تامٌّ صحيح يمرّ**",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 400000, 'amount', 100000, 100000", true);
    await shape("   **وخصمٌ كاذبٌ يُردّ** — مبلغُه يخالف فرقَ السعرين",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 400000, 'amount', 100000, 7", false);
    // ══ ٤٤ب. **والقيمةُ مربوطةٌ بالمبلغ لا بفرق السعرين وحده** ═══════════
    //  الثغرةُ التي بقيت: صفٌّ يزعم «اخصم عشرة آلاف» ويحمل خصماً بخمسين
    //  ألفاً كان يمرّ — فرقُ السعرين يطابق المبلغَ، والقيمةُ المعلنة لا
    //  تطابق شيئاً. فيُقرأ السجلُّ بعد سنة على غير ما وقع.
    await shape("٤٤ب. **ومبلغاً: قيمةٌ تخالف المبلغَ تُردّ** (١٠٬٠٠٠ تزعم خصماً ٥٠٬٠٠٠)",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 450000, 'amount', 10000, 50000", false);
    await shape("   والمطابقةُ تمرّ",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "500000, 450000, 'amount', 50000, 50000", true);
    //  ونسبةً: المبلغُ **ناتجُ النسبة مقرَّباً** لا رقماً حرّاً.
    await shape("   **ونسبةً: مبلغٌ لا يخرج من النسبة يُردّ** (١٠٪ من مليون ≠ ٣٠٠٬٠٠٠)",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "1000000, 700000, 'percentage', 10, 300000", false);
    await shape("   **والناتجُ الصحيح يمرّ** (١٠٪ من مليون = ١٠٠٬٠٠٠)",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "1000000, 900000, 'percentage', 10, 100000", true);
    //  والمنزلتان تعملان في القاعدة كما في الشاشة — ١٢٫٣٤٪ من مليون.
    await shape("   ومنزلتان عشريّتان تمرّان (١٢٫٣٤٪ = ١٢٣٬٤٠٠)",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "1000000, 876600, 'percentage', 12.34, 123400", true);
    //  ٣٣٫٣٣٪ من ٩٩٩٬٩٩٩ = ٣٣٣٬٢٩٩٫٦٦٧ ⟶ تُقرَّب إلى ٣٣٣٬٣٠٠ في القاعدة
    //  كما في `computeDiscount` سواءً بسواء.
    await shape("   **وتقريبُ القاعدة هو تقريبُ الشاشة** — ٣٣٫٣٣٪ من ٩٩٩٬٩٩٩",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "999999, 666699, 'percentage', 33.33, 333300", true);
    await shape("   **والكسرُ المهمَل يُردّ** — لا يمرّ ناتجٌ غيرُ مقرَّب",
      "current_price, proposed_price, discount_mode, discount_value, discount_amount",
      "999999, 666700, 'percentage', 33.33, 333299", false);

    // ══ ٤٥. **مصدرُ السعر يميّز الخصمَ من التعديل القديم** ═══════════════
    console.log("\n── مصدرُ السعر بعد الاعتماد ──");
    //  الخصمُ الجديد أُثبت أعلاه (٧). وهنا **القديم**: يعتمده الطبيب فيبقى
    //  `approved_change` — ولا يُقرأ رفعُ سعرٍ اعتُمد على أنه «بعد الخصم».
    const srcLeg = await mkLegacyPending("لمصدر السعر", 900_000, 700_000);
    same("٤٥. **والتعديلُ القديم يكتب `approved_change`** — لا `approved_discount`",
      [(await http("POST", `/api/discount-requests/${srcLeg.requestId}/decide`, S.doc,
        { decision: "approve" })).status,
        (await q(`SELECT price_source FROM post_exam_followups WHERE id=$1`,
          [srcLeg.followupId]))[0].price_source],
      [200, "approved_change"]);
    //  ومَن لم يُعتمد عليه شيءٌ يبقى `exam` — ولا يُعاد كتابةُ صفٍّ واحد.
    const pSrcExam = await mkPatient("مصدرُه المعاينة");
    await mkCase(pSrcExam);
    await signExam(pSrcExam, S.doc, { deviceCost: 400_000 });
    same("   **ومَن لا طلبَ عليه يبقى `exam`**",
      (await q(`SELECT price_source FROM post_exam_followups WHERE patient_id=$1`,
        [pSrcExam]))[0].price_source, "exam");
    //  والرفضُ لا يمسّ المصدر أصلاً — لا في الجديد ولا في القديم.
    const srcRej = await mkLegacyPending("مرفوض", 800_000, 600_000);
    await http("POST", `/api/discount-requests/${srcRej.requestId}/decide`, S.doc,
      { decision: "reject" });
    same("   والرفضُ يترك المصدرَ كما كان",
      (await q(`SELECT price_source FROM post_exam_followups WHERE id=$1`,
        [srcRej.followupId]))[0].price_source, "exam");
    //  **ولا صفَّ تاريخيّ أُعيدت كتابتُه**: `approved_change` باقيةٌ قيمةً
    //  صالحة، والقاعدةُ تقبل الثلاثةَ لا اثنين.
    const srcVals = (await q(
      `SELECT DISTINCT price_source FROM post_exam_followups ORDER BY 1`)).map((r: any) => r.price_source);
    check(srcVals.every((v: string) =>
      ["exam", "approved_change", "approved_discount"].includes(v)),
      "   **ولا قيمةَ رابعة في الجدول كلّه**", JSON.stringify(srcVals));
    check(srcVals.includes("approved_change") && srcVals.includes("approved_discount"),
      "   **والقيمتان تتعايشان** — لا ترحيلَ محا إحداهما", JSON.stringify(srcVals));

    // ══ ٤٦. **ونصُّ التدقيق يتبع نوعَ الصفّ** ═══════════════════════════
    console.log("\n── نصُّ التدقيق ──");
    const auditOf = async (rid: number) => (await q(
      `SELECT notes FROM audit_log
        WHERE entity_type='price_change_request' AND entity_id=$1 AND action='update'
        ORDER BY id DESC LIMIT 1`, [rid]))[0]?.notes ?? "";
    const audLegNote = await auditOf(srcLeg.requestId);
    check(audLegNote.includes("اعتماد تعديل سعر") && !audLegNote.includes("خصم"),
      "٤٦. **تدقيقُ الصفّ القديم يقول «تعديل سعر» ولا يقول «خصم»**", audLegNote);
    const audLegRej = await auditOf(srcRej.requestId);
    check(audLegRej.includes("رفض تعديل سعر") && !audLegRej.includes("خصم"),
      "   ورفضُه كذلك", audLegRej);
    const audDisc = await auditOf(reqId);
    check(audDisc.includes("اعتماد خصم"),
      "   **وتدقيقُ الخصم الجديد يقول «خصم»**", audDisc);

    // ══ ٤٧. النافذةُ القديمة — **السببُ إلزاميٌّ لا يبتلعه «سبب آخر»** ══
    console.log("\n── سببُ النافذة القديمة ──");
    const staleBad = async (label: string, body: any) => {
      const pS = await mkPatient(`سببٌ ${label.slice(0, 20)}`);
      await mkCase(pS);
      await signExam(pS, S.doc, { deviceCost: 700_000 });
      const fS = await followupOf(pS);
      const r = await http("POST", `/api/followups/${fS.id}/price-request`, S.recv,
        { proposedPrice: 500_000, ...body });
      same(label, r.status, 400);
      same("     (ولا صفَّ طلبٍ كُتب ولا السعرُ تحرّك)", [
        (await q(`SELECT 1 FROM price_change_requests WHERE followup_id=$1`, [fS.id])).length,
        Number((await q(`SELECT approved_price FROM post_exam_followups WHERE id=$1`,
          [fS.id]))[0].approved_price),
        (await q(`SELECT status FROM post_exam_followups WHERE id=$1`, [fS.id]))[0].status,
      ], [0, 700_000, "awaiting_patient_decision"]);
    };
    await staleBad("٤٧. **وبلا سببٍ يُردّ** — لا يصير «سبباً آخر»", {});
    await staleBad("وسببٌ فارغٌ يُردّ", { reason: "" });
    await staleBad("**وسببٌ مخترَعٌ يُردّ**", { reason: "لأن المدير قال" });
    await staleBad("ونصٌّ إنجليزيٌّ حرٌّ يُردّ", { reason: "because_manager_said" });
    //  ── وسببٌ صحيحٌ من أيّ القائمتين يمرّ ──
    const pS2 = await mkPatient("سببٌ جديدٌ من نافذةٍ قديمة");
    await mkCase(pS2);
    await signExam(pS2, S.doc, { deviceCost: 700_000 });
    const fS2 = await followupOf(pS2);
    const staleNew = await http("POST", `/api/followups/${fS2.id}/price-request`, S.recv,
      { proposedPrice: 600_000, reason: "campaign_or_offer" });
    same("   **وسببُ خصمٍ صحيحٌ يمرّ كما هو** — لعميلٍ نصفِ محدَّث",
      [staleNew.status, (await q(`SELECT reason FROM price_change_requests WHERE id=$1`,
        [staleNew.body.requestId]))[0].reason],
      [200, "campaign_or_offer"]);
    //  وسببٌ قديمٌ صحيحٌ بلا مقابل ⟶ «سبب آخر» **مع حفظ أصله** (٤٣ أثبت
    //  الترجمة؛ وهنا يُثبَت أن الأصل لم يضع).
    const otherRow = (await q(
      `SELECT reason, note FROM price_change_requests WHERE id=$1`,
      [staleOther.body.requestId]))[0];
    check(String(otherRow.note ?? "").includes("health_condition"),
      "   **والأصلُ محفوظٌ ولو وقع في «سبب آخر»**", String(otherRow.note));

    // ══ ٢٦. حذفُ المريض يبقى ممكناً — القاعدة الملزمة ═════════════════
    console.log("\n── الكاسكيد ──");
    const pDel = await mkPatient("للحذف");
    await mkCase(pDel);
    await signExam(pDel, S.doc, { deviceCost: 300_000 });
    const fDel = await followupOf(pDel);
    await http("POST", `/api/followups/${fDel.id}/discount-request`, S.recv,
      { discountMode: "amount", discountValue: 100_000, reason: "patient_negotiation" });
    check(fDel !== null, "(مريضٌ بمتابعةٍ وطلبِ خصمٍ وأحداث)", "");
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
