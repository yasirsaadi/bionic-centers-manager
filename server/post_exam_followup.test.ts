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
const ALL_USERS = [ADMIN, RECV, MGR, DOC, DOC2, EXPERT, RECV_B2, DOC_B2];

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

    // ══ ١٠. موافقةُ المريض ⟶ بانتظار اعتماد الشراء فقط ════════════════
    console.log("\n── موافقة المريض ثم اعتماد الشراء ──");
    const accepted = await http("POST", `/api/followups/${f1.id}/accept-price`, S.recv, {});
    same("١٠. موافقةُ المريض ⟶ «بانتظار اعتماد الشراء» **فقط**",
      accepted.body?.status, "purchase_approval_pending");
    same("   **ولا تصنيعَ بدأ**",
      (await q(`SELECT 1 FROM prosthetic_work_orders WHERE patient_id = $1`, [p1])).length, 0);

    same("١١. **الاستعلامات لا يعتمد الشراء**",
      (await http("POST", `/api/followups/${f1.id}/approve-purchase`, S.recv,
        { expertUserId: EXPERT })).status, 403);
    same("١٢. **ومديرُ الفرع لا يعتمد الشراء**",
      (await http("POST", `/api/followups/${f1.id}/approve-purchase`, S.mgr,
        { expertUserId: EXPERT })).status, 403);

    // ══ ١٥. الضغطة المزدوجة ═══════════════════════════════════════════
    //  اعتمادان **متزامنان** — وأحدهما فقط يجوز أن يُنشئ أمراً.
    const [a1, a2] = await Promise.all([
      http("POST", `/api/followups/${f1.id}/approve-purchase`, S.doc,
        { expertUserId: EXPERT }),
      http("POST", `/api/followups/${f1.id}/approve-purchase`, S.doc2,
        { expertUserId: EXPERT }),
    ]);
    const okCount = [a1, a2].filter((r) => r.status === 200).length;
    same("١٣. **طبيبٌ يعتمد الشراء** — واحدٌ فقط نجح", okCount, 1);
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
    check(eventTypes(f1c).includes("purchase_approved") && eventTypes(f1c).includes("converted"),
      "   وسجلُّ الاعتماد والتحويل موجودان معاً", JSON.stringify(eventTypes(f1c)));

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

    //  و«تخصيص» نفسها: مديرٌ يمرّر رقماً آخر ⟶ يُحجَز السعر المعتمد.
    const mgrAssign = await http("POST", `/api/patients/${p2}/assign-manufacturing`, S.mgr,
      { expertUserId: EXPERT, serviceType: "prosthetic", cost: 111_111 });
    same("   و«تخصيص» بسعرٍ مخالف ⟶ يُقبل الطلب", mgrAssign.status, 201);
    same("   **لكن المحجوز هو السعر المعتمد لا ما أرسله**",
      Number((await q(`SELECT total_cost FROM patients WHERE id = $1`, [p2]))[0].total_cost),
      900_000);

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
    same("   وطبيبُ بغداد لا يعتمد شراء ذي قار",
      (await http("POST", `/api/followups/${fB2.id}/approve-purchase`, S.doc,
        { expertUserId: EXPERT })).status, 403);
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
    same("**وطابورُ مديرِ الفرع فارغٌ — لا يعتمد شيئاً**",
      [qMgr?.mayApprove, qMgr?.priceApprovals?.length, qMgr?.purchaseApprovals?.length],
      [false, 0, 0]);

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
