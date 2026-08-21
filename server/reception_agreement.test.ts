// اتفاقُ الاستقبال ومراجعةُ المشرف — حيّاً على النقاط وPostgres.
// قاعدة محلّية: `npm run test:reception-agreement`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) **السعرُ الكامل يمضي فوراً** — بلا طلبِ اعتماد. خمسون مريضاً في اليوم
//     لا يمرّون بطابور، والطابورُ للاستثناء وحده.
// (ب) **والمخفَّضُ لا أثرَ له قبل الاعتماد** — لا كلفة، ولا دفعة، ولا جلسة
//     مشتراة، ولا قيدَ دفتر، ولا سطرَ يومية. الصفُّ المعلَّق هو الأثرُ الوحيد.
// (ج) **والاعتمادُ ينفّذ الخدمةَ مرّةً واحدة بالسعر المعتمد** — بنداءِ
//     الدالّة القانونية نفسها التي يناديها المسارُ الكامل، لا بنسخةٍ منها.
// (د) **واعتمادٌ ثانٍ لا يُنشئ خدمةً ثانية.**
// (هـ) **والرفضُ لا يُنشئ خدمةً ولا يشحن السعرَ الكامل.**
// (و) **والمجّانيُّ خدمةٌ حقيقية بقيمةٍ صفر** — جلسةٌ تُعدّ، وبلا دينار.
// (ز–ل) **والمراجعةُ الإشرافية قدرةٌ منفصلة عن التوقيع**، بحدود الفرع،
//     وبإرجاعٍ يُخرج الطلبَ من الطابور ويسمح ببديلٍ مصحَّح.

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

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-اتفاق-الاستقبال";
const ADMIN = 9941, RECV = 9942, MGR = 9943, MGR2 = 9944, DOC = 9945, RECV2 = 9946;

const perms = { canViewPatients: true, canAddPatients: true, canEnterSessions: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { ...perms, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "recv", permissions: perms },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "recv2", permissions: perms },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "mgr", permissions: perms },
  mgr2: { userId: MGR2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "mgr2", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "doc", permissions: { ...perms, canWriteMedicalExam: true } },
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

const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type = 'payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids})))`);
  await q(`DELETE FROM journal_entries WHERE source_type = 'payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM submission_tokens WHERE token LIKE 'tok-agreement-%'`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mk(name: string, opts: {
  branchId?: number; physio?: boolean; prosthetic?: boolean; classification?: string;
} = {}): Promise<number> {
  const branchId = opts.branchId ?? 1;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, referral_source, age, height, weight, amputation_site,
       medical_condition, branch_id, is_amputee, is_physiotherapy, total_cost,
       patient_classification)
     VALUES ($1,$2,'40','172','78','احادي - طرف سفلي - يمين - تحت الركبة','x',
             $3,$4,$5,0,$6)
     RETURNING id`,
    [name, MARK, branchId, Boolean(opts.prosthetic), Boolean(opts.physio),
      opts.classification ?? "new"]);
  const id = r[0].id;
  for (const [flag, type] of [
    [opts.physio, "physiotherapy"], [opts.prosthetic, "prosthetic"],
  ] as [boolean | undefined, string][]) {
    if (flag) {
      await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
               VALUES ($1,$2,'active',$3) ON CONFLICT DO NOTHING`, [id, type, branchId]);
    }
  }
  return id;
}

/** لقطةُ كلِّ ما يجب ألّا يتحرّك قبل الاعتماد. */
async function money(patientId: number) {
  const one = async (sqlText: string) =>
    Number((await q<{ c: number }>(sqlText, [patientId]))[0].c);
  return {
    totalCost: Number((await q(`SELECT total_cost c FROM patients WHERE id=$1`, [patientId]))[0].c),
    payments: await one(`SELECT COUNT(*)::int c FROM payments WHERE patient_id=$1`),
    paid: await one(`SELECT COALESCE(SUM(amount),0)::int c FROM payments WHERE patient_id=$1`),
    sessions: await one(`SELECT COALESCE(SUM(session_count),0)::int c FROM payments WHERE patient_id=$1`),
    costEntries: await one(`SELECT COUNT(*)::int c FROM cost_entries WHERE patient_id=$1`),
    caseCost: await one(`SELECT COALESCE(SUM(cost),0)::int c FROM patient_cases WHERE patient_id=$1`),
    visits: await one(`SELECT COUNT(*)::int c FROM visits WHERE patient_id=$1 AND deleted_at IS NULL`),
    journal: await one(
      `SELECT COUNT(*)::int c FROM journal_entries
        WHERE source_type = 'payment'
          AND source_id IN (SELECT id FROM payments WHERE patient_id=$1)`),
  };
}

const newService = (session: any, patientId: number, body: any) =>
  http("POST", `/api/patients/${patientId}/new-service`, session, body);

/** طلبُ جلسةٍ واحدة «أجهزة علاج طبيعي» — سعرُها القياسي ٢٥,٠٠٠. */
const sessionBody = (token: string, extra: any = {}) => ({
  serviceType: "additional_therapy",
  serviceCost: 25000,
  initialPayment: 25000,
  submissionToken: token,
  treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 }],
  paymentTreatmentType: "أجهزة علاج طبيعي",
  sessionCount: 1,
  ...extra,
});

const pendingFor = async (patientId: number) =>
  await q(`SELECT * FROM service_discount_requests WHERE patient_id=$1 ORDER BY id DESC`, [patientId]);

const decideDiscount = (session: any, id: number, body: any) =>
  http("POST", `/api/discounts/${id}/decide`, session, body);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, null], [RECV, "reception", 1, null], [RECV2, "reception", 1, null],
    [MGR, "branch_manager", 1, null], [MGR2, "branch_manager", 2, null],
    [DOC, "doctor", 1, JSON.stringify(["prosthetic", "medical_support"])],
  ] as any[]) {
    await q(`INSERT INTO system_users
             (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
              medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
      [id, `ra_u${id}`, role, b, JSON.stringify([b]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  await new Promise<void>((r) => httpServer.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. السعرُ الكامل يمضي فوراً ═══════════════════════════════════
    console.log("\n── أ. السعر الكامل ──");
    const pA = await mk("أ — سعر كامل", { physio: true });
    const rA = await newService(S.recv, pA, sessionBody("tok-agreement-a"));
    same("أ. الخدمةُ تُسجَّل فوراً", rA.status, 200);
    same("   ولا طلبَ اعتمادٍ أُنشئ", (await pendingFor(pA)).length, 0);
    const mA = await money(pA);
    same("   والكلفةُ ٢٥,٠٠٠", mA.totalCost, 25000);
    same("   ودفعةٌ واحدة بها", [mA.payments, mA.paid], [1, 25000]);
    same("   وجلسةٌ واحدة مشتراة", mA.sessions, 1);
    check(mA.costEntries === 1, "   وقيدُ كلفةٍ واحد", String(mA.costEntries));
    same("   وكلفةُ الحالة تساوي كلفةَ المريض", mA.caseCost, 25000);
    check(mA.visits === 1, "   وزيارةٌ واحدة", String(mA.visits));

    // ══ ب. المخفَّضُ ينتظر بلا أثرٍ ماليّ ═════════════════════════════
    console.log("\n── ب. الخصم قبل الاعتماد ──");
    const pB = await mk("ب — خصم", { physio: true });
    const before = await money(pB);
    const rB = await newService(S.recv, pB, sessionBody("tok-agreement-b", {
      discount: { finalPrice: 12500, isFree: false, reason: "humanitarian", note: "اتفقنا على النصف" },
    }));
    same("ب. الطلبُ أُنشئ معلَّقاً", rB.status, 201);
    same("   والاستجابةُ تقول «بانتظار الاعتماد»", rB.body?.pendingApproval, true);
    const reqsB = await pendingFor(pB);
    same("   صفٌّ واحد معلَّق", [reqsB.length, reqsB[0]?.status], [1, "pending"]);
    same("   بالسعرين الصحيحين",
      [Number(reqsB[0].original_price), Number(reqsB[0].proposed_final_price)], [25000, 12500]);
    same("   وبنسبةِ خصمٍ ٥٠٪", Number(reqsB[0].discount_percentage), 50);
    check(String(reqsB[0].payload?.kind) === "new_service",
      "   وحمولتُه «خدمة جديدة»", JSON.stringify(reqsB[0].payload));
    check(reqsB[0].payload?.finalPrice === undefined
      && reqsB[0].payload?.serviceCost === undefined,
    "   **ولا سعرَ داخل الحمولة** — الصفُّ هو المصدر", JSON.stringify(reqsB[0].payload));
    const afterB = await money(pB);
    same("   **ولا أثرَ ماليّاً إطلاقاً قبل الاعتماد**", afterB, before);

    //  ورمزُ الإرسالة يمنع طلباً ثانياً من الضغطة نفسها.
    const dupB = await newService(S.recv, pB, sessionBody("tok-agreement-b", {
      discount: { finalPrice: 12500, isFree: false, reason: "humanitarian" },
    }));
    same("   وإعادةُ الإرسال بنفس الرمز لا تُنشئ طلباً ثانياً",
      [dupB.body?.duplicate, (await pendingFor(pB)).length], [true, 1]);

    //  ══ **والسعرُ الأصليُّ يُحسب في الخادم لا يُقبل من العميل** ═══════
    //  عميلٌ يعلن أصلاً ملفَّقاً منخفضاً يجعل الخصمَ يبدو صغيراً، فيمرّ
    //  على المعتمِد ما لم يكن ليمرّ. والجدولُ المشترك هو الحكم.
    const pB2 = await mk("ب.ب — أصلٌ ملفَّق", { physio: true });
    await newService(S.recv, pB2, sessionBody("tok-agreement-b2", {
      serviceCost: 8000,
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 8000 }],
      discount: { finalPrice: 4000, isFree: false, reason: "humanitarian" },
    }));
    const reqB2 = (await pendingFor(pB2))[0];
    same("ب.ب **والأصلُ المسجَّل ٢٥,٠٠٠ لا ٨,٠٠٠ التي أعلنها العميل**",
      Number(reqB2?.original_price), 25000);
    same("   والخصمُ يُحسب على الأصل الحقيقيّ (٨٤٪)",
      Number(reqB2?.discount_percentage), 84);

    // ══ ج. الاعتمادُ ينفّذ الخدمةَ بالسعر المعتمد ════════════════════
    console.log("\n── ج. الاعتماد ──");
    const okC = await decideDiscount(S.mgr, Number(reqsB[0].id), { decision: "approve" });
    same("ج. الاعتمادُ يمرّ", okC.status, 200);
    const mC = await money(pB);
    same("   والكلفةُ صارت ١٢,٥٠٠ لا ٢٥,٠٠٠", mC.totalCost, 12500);
    same("   ودفعةٌ واحدة بها", [mC.payments, mC.paid], [1, 12500]);
    same("   **وجلسةٌ واحدة بالضبط**", mC.sessions, 1);
    same("   وكلفةُ الحالة تساوي كلفةَ المريض", mC.caseCost, 12500);
    check(mC.visits === 1, "   وزيارةٌ واحدة", String(mC.visits));
    //  **الثابتُ الملزم**: مجموعُ قيود الدفتر = كلفةُ المريض.
    const ledgerC = Number((await q(
      `SELECT COALESCE(SUM(amount),0)::int c FROM cost_entries WHERE patient_id=$1`, [pB]))[0].c);
    same("   **ومجموعُ قيود الدفتر = الكلفة**", ledgerC, 12500);

    // ══ د. اعتمادٌ ثانٍ لا يُكرّر ═════════════════════════════════════
    console.log("\n── د. الاعتماد المكرَّر ──");
    const twice = await decideDiscount(S.mgr, Number(reqsB[0].id), { decision: "approve" });
    same("د. الثاني يُردّ ٤٠٩", twice.status, 409);
    same("   **ولا خدمةَ ولا دفعةَ ولا جلسةَ ثانية**", await money(pB), mC);

    // ══ هـ. الرفضُ لا يُنشئ شيئاً ═════════════════════════════════════
    console.log("\n── هـ. الرفض ──");
    const pE = await mk("هـ — رفض", { physio: true });
    const beforeE = await money(pE);
    await newService(S.recv, pE, sessionBody("tok-agreement-e", {
      discount: { finalPrice: 5000, isFree: false, reason: "humanitarian" },
    }));
    const reqE = (await pendingFor(pE))[0];
    same("هـ. الرفضُ يمرّ",
      (await decideDiscount(S.mgr, Number(reqE.id), { decision: "reject" })).status, 200);
    same("   **ولا خدمةَ وقعت ولا سعرٌ كاملٌ شُحن**", await money(pE), beforeE);
    same("   والصفُّ مرفوض",
      String((await pendingFor(pE))[0].status), "rejected");

    // ══ و. المجّانيُّ الصريح ══════════════════════════════════════════
    console.log("\n── و. مجّاني صريح ──");
    const pF = await mk("و — مجّاني", { physio: true });
    const rF = await newService(S.recv, pF, sessionBody("tok-agreement-f", {
      discount: { finalPrice: 0, isFree: true, reason: "" },
    }));
    same("و. الطلبُ معلَّق", [rF.status, rF.body?.pendingApproval], [201, true]);
    const reqF = (await pendingFor(pF))[0];
    same("   بسعرٍ أصليٍّ موجبٍ ونهائيٍّ صفر",
      [Number(reqF.original_price), Number(reqF.proposed_final_price), reqF.is_free],
      [25000, 0, true]);
    same("   **ولا أثرَ ماليّاً قبل الاعتماد**", (await money(pF)).totalCost, 0);
    same("   والاعتمادُ يمرّ",
      (await decideDiscount(S.mgr, Number(reqF.id), { decision: "approve" })).status, 200);
    const mF = await money(pF);
    same("   **الجلسةُ حقيقيةٌ وقيمتُها صفر**", [mF.sessions, mF.paid, mF.totalCost], [1, 0, 0]);
    check(mF.visits === 1, "   وزيارةٌ واحدة", String(mF.visits));
    const freeRow = await q(
      `SELECT is_free_sessions f, session_count s FROM payments WHERE patient_id=$1`, [pF]);
    same("   والدفعةُ موسومةٌ «جلسات مجّانية»",
      [freeRow.length, freeRow[0]?.f, Number(freeRow[0]?.s)], [1, true, 1]);

    // ══ الصفرُ وحده ليس تبرّعاً ═══════════════════════════════════════
    const pF2 = await mk("و.ب — صفر بلا إعلان", { physio: true });
    const zero = await newService(S.recv, pF2, sessionBody("tok-agreement-f2", {
      discount: { finalPrice: 0, isFree: false, reason: "humanitarian" },
    }));
    same("و.ب والصفرُ بلا إعلانِ تبرّعٍ يُردّ", zero.status, 400);
    same("   ولا طلبَ ولا مال", (await pendingFor(pF2)).length, 0);

    // ══ م. السعرُ القياسيُّ لا يُلتفّ عليه من حقل الكلفة ═══════════════
    console.log("\n── م. لا التفافَ على الاعتماد ──");
    const pM = await mk("م — التفاف", { physio: true });
    const beforeM = await money(pM);
    const sneak = await newService(S.recv, pM, sessionBody("tok-agreement-m", {
      serviceCost: 12500,   // القياسيُّ ٢٥,٠٠٠ — وبلا حقل خصمٍ إطلاقاً
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 12500 }],
      initialPayment: 12500,
    }));
    same("م. **مبلغٌ أقلُّ من القياسيّ بلا خصمٍ يُردّ ٤٠٠**", sneak.status, 400);
    check(String(sneak.body?.message ?? "").includes("خصم أو خدمة مجّانية"),
      "   برسالةٍ تدلّ على الباب الصحيح", String(sneak.body?.message));
    same("   **ولا خدمةَ ولا مال ولا جلسة**", await money(pM), beforeM);
    same("   ولا طلبَ خصمٍ أُنشئ", (await pendingFor(pM)).length, 0);

    //  وكلفةُ السطر المضخَّمة لا تُصدَّق: القياسيُّ يحكم، والحسابُ لا ينحرف.
    const pM2 = await mk("م.ب — سطرٌ مضخَّم", { physio: true });
    const inflated = await newService(S.recv, pM2, sessionBody("tok-agreement-m2", {
      serviceCost: 25000,
      treatmentEntries: [{ treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 100000 }],
      initialPayment: 25000,
    }));
    same("م.ب والخدمةُ تمرّ بالقياسيّ", inflated.status, 200);
    const mM2 = await money(pM2);
    same("   **وكلفةُ السطر ١٠٠,٠٠٠ لم تُصدَّق**",
      [mM2.totalCost, mM2.caseCost, mM2.paid], [25000, 25000, 25000]);

    // ══ ن. الخصمُ على نوعين يحفظ جلسات النوعين ════════════════════════
    console.log("\n── ن. نوعان مع خصم ──");
    //  روبوت ٥٠,٠٠٠ + أجهزة ٢٥,٠٠٠ = ٧٥,٠٠٠ قياسيّاً.
    const twoTypes = (token: string, extra: any = {}) => ({
      serviceType: "additional_therapy",
      serviceCost: 75000,
      initialPayment: 75000,
      submissionToken: token,
      treatmentEntries: [
        { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
        { treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 },
      ],
      paymentTreatmentType: "روبوت، أجهزة علاج طبيعي",
      sessionCount: 2,
      ...extra,
    });
    const typesOf = async (patientId: number) =>
      (await q<{ t: string; s: number }>(
        `SELECT payment_treatment_type t, session_count s FROM payments
          WHERE patient_id=$1 ORDER BY payment_treatment_type`, [patientId]))
        .map((r) => `${r.t}:${r.s}`);

    //  ن.أ — بالسعر الكامل: النوعان مسجَّلان.
    const pN1 = await mk("ن.أ — نوعان كامل", { physio: true });
    same("ن.أ الخدمةُ تمرّ", (await newService(S.recv, pN1, twoTypes("tok-agreement-n1"))).status, 200);
    same("   والنوعان مسجَّلان بجلستيهما",
      await typesOf(pN1), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    same("   والكلفةُ ٧٥,٠٠٠", (await money(pN1)).totalCost, 75000);

    //  ن.ب — بخصمٍ إلى ٤٠,٠٠٠: **النوعان يبقيان**، والمجموعُ يطابق المعتمَد.
    const pN2 = await mk("ن.ب — نوعان بخصم", { physio: true });
    await newService(S.recv, pN2, twoTypes("tok-agreement-n2", {
      discount: { finalPrice: 40000, isFree: false, reason: "humanitarian" },
    }));
    const reqN2 = (await pendingFor(pN2))[0];
    same("ن.ب الطلبُ معلَّقٌ بأصلٍ ٧٥,٠٠٠", Number(reqN2?.original_price), 75000);
    same("   والاعتمادُ يمرّ",
      (await decideDiscount(S.mgr, Number(reqN2.id), { decision: "approve" })).status, 200);
    same("   **والنوعان باقيان بجلستيهما رغم الخصم**",
      await typesOf(pN2), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    const mN2 = await money(pN2);
    same("   ومجموعُ الدفعات = المعتمَد بالضبط", mN2.paid, 40000);
    same("   وكلفةُ المريض = كلفةُ الحالة = المعتمَد",
      [mN2.totalCost, mN2.caseCost], [40000, 40000]);
    same("   ومجموعُ الجلسات اثنتان", mN2.sessions, 2);
    same("   ومجموعُ قيود الدفتر = الكلفة", Number((await q(
      `SELECT COALESCE(SUM(amount),0)::int c FROM cost_entries WHERE patient_id=$1`,
      [pN2]))[0].c), 40000);
    //  والتوزيعُ تناسبيّ: ٥٠/٧٥ × ٤٠,٠٠٠ ≈ ٢٦,٦٦٧ و٢٥/٧٥ ≈ ١٣,٣٣٣.
    const linesN2 = (await q<{ a: number; t: string }>(
      `SELECT amount a, payment_treatment_type t FROM payments
        WHERE patient_id=$1 ORDER BY amount DESC`, [pN2])).map((r) => Number(r.a));
    same("   والتوزيعُ تناسبيٌّ مجموعُه المعتمَد", [linesN2, linesN2[0] + linesN2[1]],
      [[26667, 13333], 40000]);

    //  ن.ج — إعادةُ الاعتماد لا تُكرّر شيئاً.
    same("ن.ج الاعتمادُ الثاني يُردّ ٤٠٩",
      (await decideDiscount(S.mgr, Number(reqN2.id), { decision: "approve" })).status, 409);
    same("   **ولا جلساتٍ مكرّرة**", await money(pN2), mN2);

    //  ن.هـ — **بندٌ نصيبُه من المال صفر تبقى جلستُه**.
    //  خطُّ دفاعٍ ثانٍ خلف التوزيع التناسبيّ: بندٌ سعرُه الأصليّ صفر
    //  (استشارة) يحمل جلسات ⟶ نصيبُه صفرٌ مهما كان المعتمَد. وقبل الإصلاح
    //  كان شرطُ `cost > 0` يُسقط صفَّه، فتضيع جلساتُه من العدّاد نهائياً.
    const pN4 = await mk("ن.هـ — بندٌ بلا سعر", { physio: true });
    await newService(S.recv, pN4, {
      serviceType: "additional_therapy",
      serviceCost: 50000,
      initialPayment: 50000,
      submissionToken: "tok-agreement-n4",
      treatmentEntries: [
        { treatmentType: "روبوت", sessionCount: 1, cost: 50000 },
        { treatmentType: "استشارة طبية", sessionCount: 2, cost: 0 },
      ],
      paymentTreatmentType: "روبوت، استشارة طبية",
      sessionCount: 3,
      discount: { finalPrice: 30000, isFree: false, reason: "humanitarian" },
    });
    const reqN4 = (await pendingFor(pN4))[0];
    same("ن.هـ الاعتمادُ يمرّ",
      (await decideDiscount(S.mgr, Number(reqN4.id), { decision: "approve" })).status, 200);
    same("   **والبندُ الذي نصيبُه صفر بقيت جلساتُه**",
      await typesOf(pN4), ["استشارة طبية:2", "روبوت:1"]);
    const mN4 = await money(pN4);
    same("   ومجموعُ الدفعات = المعتمَد", mN4.paid, 30000);
    same("   ومجموعُ الجلسات ثلاث", mN4.sessions, 3);

    //  ن.د — تبرّعٌ صريح على نوعين: الجلستان تبقيان بقيمةٍ صفر.
    const pN3 = await mk("ن.د — نوعان مجّاناً", { physio: true });
    await newService(S.recv, pN3, twoTypes("tok-agreement-n3", {
      discount: { finalPrice: 0, isFree: true, reason: "" },
    }));
    const reqN3 = (await pendingFor(pN3))[0];
    same("ن.د الاعتمادُ يمرّ",
      (await decideDiscount(S.mgr, Number(reqN3.id), { decision: "approve" })).status, 200);
    same("   **والنوعان باقيان بجلستيهما**",
      await typesOf(pN3), ["أجهزة علاج طبيعي:1", "روبوت:1"]);
    const mN3 = await money(pN3);
    same("   وبقيمةٍ ماليّة صفر", [mN3.paid, mN3.totalCost, mN3.caseCost], [0, 0, 0]);
    same("   والجلستان معدودتان", mN3.sessions, 2);

    // ══ ز. مديرُ الفرع يؤشّر «تمت المراجعة» ═══════════════════════════
    console.log("\n── ز. المراجعة الإشرافية ──");
    const pG = await mk("ز — مراجعة", { prosthetic: true });
    const mkReq = async (session: any, patientId: number, path: "quick" | "full") =>
      await http("POST", "/api/medical-review/requests", session, {
        patientId, serviceType: "prosthetic", requestedPath: path, reviewKind: "maintenance",
      });
    const reqG = (await mkReq(S.recv, pG, "quick")).body;
    check(Boolean(reqG?.id), "ز. طلبٌ سريعٌ أُنشئ", JSON.stringify(reqG));
    const ackG = await http("POST", `/api/medical-review/requests/${reqG.id}/decide`, S.mgr,
      { decision: "approve" });
    same("ز. **مديرُ الفرع يؤشّر «تمت المراجعة»**", ackG.status, 200);
    same("   والحالةُ صارت معترَفاً بها", String(ackG.body?.status), "approved");
    same("   **ولا معاينةً كُتبت**",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pG]))[0].c), 0);

    // ══ ح. والإشرافُ لا يمنح توقيعاً ═════════════════════════════════
    console.log("\n── ح. الإشراف ≠ التوقيع ──");
    const pH = await mk("ح — توقيع", { prosthetic: true });
    const signTry = await http("POST", `/api/medical/patients/${pH}/exams`, S.mgr, {
      caseType: "prosthetic", diagnosis: "محاولة", plan: "خطة",
    });
    check(signTry.status === 403,
      "ح. **مديرُ الفرع لا يوقّع معاينةً ولو راجع إشرافياً**", String(signTry.status));
    same("   ولا صفَّ معاينةٍ وُلد",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pH]))[0].c), 0);
    const reqH = (await mkReq(S.recv, pH, "quick")).body;
    same("   **ولا يطلب معاينةً كاملة — قرارٌ سريريّ**",
      (await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
        { decision: "require_full_exam" })).status, 403);

    // ══ ط. إرجاعُ الطلب السريع ثمّ بديلٌ مصحَّح ═══════════════════════
    console.log("\n── ط. إرجاع السريع ──");
    const noReason = await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
      { decision: "return_to_reception" });
    same("ط. الإرجاعُ بلا سببٍ يُردّ", noReason.status, 400);
    const retI = await http("POST", `/api/medical-review/requests/${reqH.id}/decide`, S.mgr,
      { decision: "return_to_reception", doctorNote: "جهة البتر غير صحيحة — عدّلها وأعد الإرسال" });
    same("   وبالسببِ يمرّ", retI.status, 200);
    same("   والسببُ محفوظٌ في السجلّ",
      String(retI.body?.doctorNote), "جهة البتر غير صحيحة — عدّلها وأعد الإرسال");
    const qAfter = await http("GET", "/api/medical-review/queue", S.mgr);
    check(!(qAfter.body?.rows ?? []).some((r: any) => r.id === reqH.id),
      "   **وخرج من الطابور النشط**");
    const again = await mkReq(S.recv, pH, "quick");
    check(again.status === 201 && again.body?.id !== reqH.id,
      "   **والاستعلاماتُ ترسل بديلاً مصحَّحاً بلا ٤٠٩**",
      `${again.status} ${JSON.stringify(again.body)}`);

    // ══ ي. إرجاعُ طلبِ المعاينة الكاملة من «معايناتي» ════════════════
    console.log("\n── ي. إرجاع الكامل ──");
    //  مريضٌ قديمٌ بحالةٍ نشطة: لا يدخل القائمةَ إلّا بطلبِه الكامل، فخروجُه
    //  منها بعد الإرجاع دليلٌ على أن الطلبَ هو ما أخرجه.
    const pJ = await mk("ي — كامل", { prosthetic: true, classification: "past" });
    const reqJ = (await mkReq(S.recv, pJ, "full")).body;
    check(Boolean(reqJ?.id), "ي. طلبُ معاينةٍ كاملة أُنشئ", JSON.stringify(reqJ));
    const wl1 = await http("GET", "/api/medical/worklist", S.doc);
    check((wl1.body?.rows ?? []).some((r: any) => r.patientId === pJ),
      "   والمريضُ في قائمة «معايناتي»");
    const selfTry = await http("POST", `/api/medical-review/requests/${reqJ.id}/return`, S.recv,
      { reason: "أُصحّحه بنفسي" });
    same("   والاستقبالُ لا يُرجع أصلاً — ليس مشرفاً", selfTry.status, 403);

    //  **ولا يُرجِع المشرفُ طلبَ نفسه**: مديرُ الفرع يملك القدرة كاملةً،
    //  فلو أنشأ طلباً ثم سحبه بنفسه لصار البابُ طريقاً لمحو الأثر. والفحصُ
    //  هنا هو الوحيد الذي يصل الحارسَ فعلاً — الاستقبالُ يسقط قبله.
    const pJ2 = await mk("ي.ب — طلب المدير", { prosthetic: true, classification: "past" });
    const reqJ2 = (await mkReq(S.mgr, pJ2, "full")).body;
    check(Boolean(reqJ2?.id), "   ومديرُ الفرع أنشأ طلباً كاملاً", JSON.stringify(reqJ2));
    same("   **ولا يُرجِع المشرفُ طلبَ نفسه ولو ملك القدرة**",
      (await http("POST", `/api/medical-review/requests/${reqJ2.id}/return`, S.mgr,
        { reason: "سحبٌ ذاتيّ" })).status, 403);
    same("   والطلبُ باقٍ معلَّقاً",
      String((await q(`SELECT status FROM medical_review_requests WHERE id=$1`,
        [reqJ2.id]))[0].status), "pending");
    same("   وغيرُه يستطيع إرجاعَه",
      (await http("POST", `/api/medical-review/requests/${reqJ2.id}/return`, S.doc,
        { reason: "الاختصاص غير صحيح" })).status, 200);
    const retJ = await http("POST", `/api/medical-review/requests/${reqJ.id}/return`, S.doc,
      { reason: "الاختصاص غير صحيح — أعد الإرسال على المساند" });
    same("   وطبيبُ الاختصاص يُرجعه", retJ.status, 200);
    const wl2 = await http("GET", "/api/medical/worklist", S.doc);
    check(!(wl2.body?.rows ?? []).some((r: any) => r.patientId === pJ),
      "   **وخرج من قائمة «معايناتي»**");
    same("   **ولا معاينةً أُنشئت ولا حُذفت**",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [pJ]))[0].c), 0);
    const againJ = await mkReq(S.recv, pJ, "full");
    check(againJ.status === 201,
      "   **والاستعلاماتُ ترسل طلباً جديداً على المرساة نفسها**",
      `${againJ.status} ${JSON.stringify(againJ.body)}`);

    //  ══ **ولا إرجاعَ بعد التوقيع** — خطُّ دفاعٍ ثانٍ ═══════════════════
    //  توقيعُ المعاينة يُغلق الطلبَ بنفسه (`closeRequestsAwaitingExam`)،
    //  لكنّ ذلك الإغلاق **يبتلع خطأه عمداً** كي لا يُسقط توقيعَ سجلٍّ
    //  سريري. فلو سقط، بقي صفٌّ يقول «معلَّق» ومعاينتُه موقّعة — وإرجاعُه
    //  حينئذٍ يزوّر تسلسلاً وقع. لذا يُعاد الصفُّ إلى حاله يدوياً هنا:
    //  هذه هي الحالةُ التي وُضع لها الحارس بالضبط.
    const signed = await http("POST", `/api/medical/patients/${pJ}/exams`, S.doc, {
      caseType: "prosthetic", diagnosis: "تشخيص", plan: "خطة",
    });
    same("   وتوقيعُ المعاينة يمرّ", signed.status, 200);
    await q(`UPDATE medical_review_requests
                SET status='pending', decision=NULL, decided_at=NULL, exam_id=NULL
              WHERE id=$1`, [againJ.body.id]);
    const afterSign = await http("POST", `/api/medical-review/requests/${againJ.body.id}/return`,
      S.doc, { reason: "محاولة إرجاع بعد التوقيع" });
    same("   **ولا يُرجَع طلبٌ وُقّعت معاينتُه — ٤٠٩**", afterSign.status, 409);

    // ══ س. الاختصاصُ يُفرَض في الخادم لا في الشاشة ════════════════════
    console.log("\n── س. حدود الاختصاص ──");
    //  طبيبُ أطرافٍ فقط — يعرف رقمَ طلبِ مسندٍ ويحاول البتّ فيه مباشرةً.
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic"]), DOC]);
    const pS = await mk("س — مساند", { prosthetic: true });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pS]);
    const supportReq = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pS, serviceType: "medical_support", requestedPath: "quick",
      reviewKind: "maintenance",
    })).body;
    check(Boolean(supportReq?.id), "س. طلبُ مساندٍ أُنشئ", JSON.stringify(supportReq));
    same("س. **طبيبُ الأطراف لا يبتّ في طلبِ مساند ولو عرف رقمَه**",
      (await http("POST", `/api/medical-review/requests/${supportReq.id}/decide`, S.doc,
        { decision: "approve" })).status, 403);
    //  ومريضٌ ثانٍ للطلب الكامل: فهرسُ التفرّد يسمح بمعلَّقٍ واحدٍ بلا مرساة
    //  لكلّ (مريض، اختصاص) — فطلبان على المريض نفسه يُردّ ثانيهما ٤٠٩.
    const pS2 = await mk("س.ب — مساند كامل", { prosthetic: true, classification: "past" });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pS2]);
    const supportFull = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pS2, serviceType: "medical_support", requestedPath: "full",
      reviewKind: "new_device",
    })).body;
    check(Boolean(supportFull?.id), "   وطلبُ معاينةٍ كاملة للمساند أُنشئ",
      JSON.stringify(supportFull));
    same("   ولا يُرجع طلبَ معاينةٍ كاملة في اختصاصٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${supportFull.id}/return`, S.doc,
        { reason: "محاولة" })).status, 403);
    //  وفي اختصاصه يمرّ — فالحارسُ يميّز ولا يحجب الجميع.
    const prosReq = (await mkReq(S.recv, pS, "quick")).body;
    same("   **وفي اختصاصه يمرّ**",
      (await http("POST", `/api/medical-review/requests/${prosReq.id}/decide`, S.doc,
        { decision: "approve" })).status, 200);
    //  ومديرُ الفرع إشرافُه إداريّ فلا يُرشَّح باختصاص — الاثنان في نطاقه.
    same("   **ومديرُ الفرع يؤشّر على المساند أيضاً — إشرافُه إداريّ**",
      (await http("POST", `/api/medical-review/requests/${supportReq.id}/decide`, S.mgr,
        { decision: "approve" })).status, 200);
    same("   والمسؤولُ العام يُرجع المساند في فرعٍ يصله",
      (await http("POST", `/api/medical-review/requests/${supportFull.id}/return`, S.admin,
        { reason: "بيانٌ خاطئ" })).status, 200);
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic", "medical_support"]), DOC]);

    // ══ ع. بابُ المدير إلى الطلبات المنتظرة ═══════════════════════════
    console.log("\n── ع. سطح إشراف المدير ──");
    const pO = await mk("ع — منتظر", { prosthetic: true, classification: "past" });
    const reqO = (await mkReq(S.recv, pO, "full")).body;
    check(Boolean(reqO?.id), "ع. طلبُ معاينةٍ كاملة أُنشئ", JSON.stringify(reqO));
    //  «معايناتي» تبقى للطبيب: المديرُ يقرؤها فارغة — وهذا هو العطبُ الذي
    //  فتح له بابٌ آخر بدل أن تُحوَّل قائمةُ الطبيب إلى قائمة مدير.
    const wlMgr = await http("GET", "/api/medical/worklist", S.mgr);
    same("   و«معايناتي» تبقى فارغةً للمدير — لم تُحوَّل إلى قائمة مدير",
      (wlMgr.body?.rows ?? []).length, 0);
    const qMgr = await http("GET", "/api/medical-review/queue", S.mgr);
    const waiting = (qMgr.body?.awaitingFull ?? []) as any[];
    check(waiting.some((r) => r.id === reqO.id),
      "ع. **والطلبُ يصل المديرَ في قسم «بانتظار الطبيب»**",
      JSON.stringify(waiting.map((r) => r.id)));
    same("   والمديرُ يُرجعه بسبب",
      (await http("POST", `/api/medical-review/requests/${reqO.id}/return`, S.mgr,
        { reason: "الاختصاص غير صحيح — أعد الإرسال" })).status, 200);
    const qAfterO = await http("GET", "/api/medical-review/queue", S.mgr);
    check(!((qAfterO.body?.awaitingFull ?? []) as any[]).some((r) => r.id === reqO.id),
      "   **وخرج من القسم بعد الإرجاع**");
    //  ولا يُعرَض للاستقبال إطلاقاً.
    const qRecv = await http("GET", "/api/medical-review/queue", S.recv);
    same("   ولا يُعرَض القسمُ للاستقبال",
      [(qRecv.body?.awaitingFull ?? []).length, qRecv.body?.canSupervise], [0, false]);

    // ══ ف. الدورُ يسبق الاختصاص في سطح الإشراف ════════════════════════
    console.log("\n── ف. الدور يسبق الاختصاص ──");
    //  **العطب**: مسؤولٌ أو مديرٌ يحمل منحاً سريرياً في الأطراف كان
    //  يُحجَب عنه المساند — فيُضيَّق عليه بسبب صلاحيةٍ زائدة لا ناقصة.
    await q(`UPDATE system_users
                SET can_write_medical_exam = true, medical_specialties = $1::jsonb
              WHERE id = ANY($2::int[])`,
    [JSON.stringify(["prosthetic"]), [ADMIN, MGR]]);

    //  مريضان منتظران: أحدهما أطراف والآخر مساند — ليُقاس ما يصل كلَّ دور.
    const pRolePros = await mk("ف — أطراف", { prosthetic: true, classification: "past" });
    const reqF1 = (await mkReq(S.recv, pRolePros, "full")).body;
    const pRoleSup = await mk("ف — مساند", { prosthetic: true, classification: "past" });
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pRoleSup]);
    const reqF2 = (await http("POST", "/api/medical-review/requests", S.recv, {
      patientId: pRoleSup, serviceType: "medical_support", requestedPath: "full",
      reviewKind: "new_device",
    })).body;
    check(Boolean(reqF1?.id) && Boolean(reqF2?.id), "ف. طلبان أُنشئا (أطراف ومساند)",
      `${JSON.stringify(reqF1)} ${JSON.stringify(reqF2)}`);

    const specsOf = async (session: any) => {
      const r = await http("GET", "/api/medical-review/queue", session);
      return {
        specialties: [...(r.body?.specialties ?? [])].sort(),
        awaiting: ((r.body?.awaitingFull ?? []) as any[]).map((x) => x.id).sort(),
      };
    };

    //  أ) مسؤولٌ عام بمنحٍ سريريٍّ في الأطراف ⟶ الاثنان.
    const adm = await specsOf(S.admin);
    same("ف.أ **المسؤولُ ذو المنح السريريّ يشرف على الاختصاصين**",
      adm.specialties, ["medical_support", "prosthetic"]);
    check(adm.awaiting.includes(reqF1.id) && adm.awaiting.includes(reqF2.id),
      "   والطلبان المنتظران يصلانه معاً", JSON.stringify(adm.awaiting));

    //  ب) مديرُ فرعٍ بالمنح نفسه ⟶ الاثنان داخل نطاقه.
    const mg = await specsOf(S.mgr);
    same("ف.ب **ومديرُ الفرع كذلك — إشرافُه إداريّ لا مهنيّ**",
      mg.specialties, ["medical_support", "prosthetic"]);
    check(mg.awaiting.includes(reqF1.id) && mg.awaiting.includes(reqF2.id),
      "   والطلبان يصلانه في فرعه", JSON.stringify(mg.awaiting));

    //  ج) طبيبُ أطرافٍ فقط ⟶ الأطراف وحدها.
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic"]), DOC]);
    const dc = await specsOf(S.doc);
    same("ف.ج **والطبيبُ باختصاصه المسجَّل وحده**", dc.specialties, ["prosthetic"]);
    check(dc.awaiting.includes(reqF1.id) && !dc.awaiting.includes(reqF2.id),
      "   فيصله طلبُ الأطراف ولا يصله المساند", JSON.stringify(dc.awaiting));

    //  د) والفرعُ يبقى حاجزاً فوق ذلك كلِّه.
    const mg2 = await specsOf(S.mgr2);
    same("ف.د ومديرُ الفرع الآخر يشرف على الاختصاصين — في فرعه هو",
      mg2.specialties, ["medical_support", "prosthetic"]);
    same("   **ولا يصله شيءٌ من فرعٍ ليس له**", mg2.awaiting, []);

    await q(`UPDATE system_users
                SET can_write_medical_exam = false, medical_specialties = NULL
              WHERE id = ANY($1::int[])`, [[ADMIN, MGR]]);
    await q(`UPDATE system_users SET medical_specialties = $1::jsonb WHERE id = $2`,
      [JSON.stringify(["prosthetic", "medical_support"]), DOC]);

    // ══ ك. الفرعُ حاجز ═══════════════════════════════════════════════
    console.log("\n── ك. حدود الفرع ──");
    const reqK = (await mkReq(S.recv, pG, "quick")).body ?? {};
    const pKfull = await mk("ك — كامل", { prosthetic: true, classification: "past" });
    const reqKfull = (await mkReq(S.recv, pKfull, "full")).body;
    same("ك. مديرُ فرعٍ آخر لا يؤشّر على طلبِ فرعٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${reqK.id ?? reqH.id}/decide`, S.mgr2,
        { decision: "approve" })).status, 403);
    same("   ولا يُرجع طلبَ معاينةٍ كاملة في فرعٍ ليس له",
      (await http("POST", `/api/medical-review/requests/${reqKfull.id}/return`, S.mgr2,
        { reason: "محاولة" })).status, 403);

    // ══ ل. الاستقبالُ العاديّ ليس مشرفاً ═════════════════════════════
    console.log("\n── ل. الاستقبال ليس مشرفاً ──");
    same("ل. الاستقبالُ لا يؤشّر «تمت المراجعة»",
      (await http("POST", `/api/medical-review/requests/${reqK.id ?? reqH.id}/decide`, S.recv2,
        { decision: "approve" })).status, 403);
    same("   ولا يُرجع طلبَ معاينةٍ كاملة",
      (await http("POST", `/api/medical-review/requests/${reqKfull.id}/return`, S.recv2,
        { reason: "محاولة" })).status, 403);
    same("   والطلبُ باقٍ كما كان",
      String((await q(`SELECT status FROM medical_review_requests WHERE id=$1`,
        [reqKfull.id]))[0].status), "pending");
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, RECV2, MGR, MGR2, DOC]]);
    httpServer.close();
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
