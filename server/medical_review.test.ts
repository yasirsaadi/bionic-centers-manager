// مراجعةُ الطبيب للأطراف والمساند — حيّاً على النقاط وPostgres.
// قاعدة محلّية: `npm run test:medical-review`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **كلُّ زيارةِ أطرافٍ أو مساندَ ذات معنى تصل الطبيب**: الجديد والقديم،
//     وطالبُ الجهاز والعائدُ للصيانة. وهذا هو العطبُ الذي جاء الملفّ يصلحه:
//     `patient_classification = 'past'` كانت تُخفي المريض، والصيانة لم تكن
//     تصل الطبيب إطلاقاً.
// (٢) **والموافقة السريعة ليست معاينة**: لا صفَّ يُكتب في `medical_exams`
//     ولا يتغيّر تسلسلُ المعاينات — يُتحقَّق بالعدّ قبل وبعد.
// (٣) **والإحالة تدخل الطابور القائم**: «معاينة كاملة» تُظهر المريضَ في
//     قائمة عمل الطبيب مهما كان تصنيفُه.
// (٤) **العلاج الطبيعي لا يتأثّر بحرف**: لا يقبله الجدول ولا الطابور.
// (٥) **والفرع حاجز**: طلبٌ في فرعٍ آخر لا يُقرأ ولا يُقرَّر عليه.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

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
const MARK = "اختبار-مراجعة-الطبيب";
const ADMIN = 9971, RECV1 = 9972, RECV2 = 9973, DOC1 = 9974, DOC2 = 9975, EXPERT = 9976;

const perms = { canViewPatients: true, canAddPatients: true, canEnterSessions: true };
//  حذفُ المريض يحتاج القدرة صراحةً حتى للمسؤول — نقطتُه تفحصها لا الدور.
const adminPerms = { ...perms, canDeletePatients: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: adminPerms },
  recv1: { userId: RECV1, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "r1", permissions: perms },
  recv2: { userId: RECV2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "r2", permissions: perms },
  doc1: { userId: DOC1, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. فرع١", permissions: { ...perms, canWriteMedicalExam: true } },
  doc2: { userId: DOC2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. فرع٢", permissions: { ...perms, canWriteMedicalExam: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "خبير", permissions: { canViewPatients: true } },
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

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** مريضٌ بحالةٍ نشطة من نوعٍ محدَّد — التصنيف يُمرَّر ليُختبَر «القديم» صراحةً. */
async function mk(name: string, opts: {
  branchId?: number; classification?: string;
  prosthetic?: boolean; support?: boolean; physio?: boolean;
  createdDaysAgo?: number;
}): Promise<number> {
  const branchId = opts.branchId ?? 1;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, referral_source, age, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification,
       created_at)
     VALUES ($1,$2,'40','x',$3,$4,$5,$6,0,$7, NOW() - ($8 || ' days')::interval)
     RETURNING id`,
    [name, MARK, branchId, Boolean(opts.prosthetic), Boolean(opts.support),
      Boolean(opts.physio), opts.classification ?? "new", String(opts.createdDaysAgo ?? 0)]);
  const id = r[0].id;
  for (const [flag, type] of [
    [opts.prosthetic, "prosthetic"], [opts.support, "medical_support"],
    [opts.physio, "physiotherapy"],
  ] as [boolean | undefined, string][]) {
    if (flag) {
      await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
               VALUES ($1,$2,'active',$3) ON CONFLICT DO NOTHING`, [id, type, branchId]);
    }
  }
  return id;
}

const createReq = (session: any, body: any) =>
  http("POST", "/api/medical-review/requests", session, body);
const queue = (session: any) => http("GET", "/api/medical-review/queue", session);
const decide = (session: any, id: number, decision: string, doctorNote?: string) =>
  http("POST", `/api/medical-review/requests/${id}/decide`, session, { decision, doctorNote });

const examCount = async (patientId: number) =>
  Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [patientId]))[0].c);

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, null], [RECV1, "reception", 1, null], [RECV2, "reception", 2, null],
    [DOC1, "doctor", 1, JSON.stringify(["prosthetic", "medical_support"])],
    [DOC2, "doctor", 2, JSON.stringify(["prosthetic", "medical_support"])],
    [EXPERT, "prosthetics_expert", 1, null],
  ] as any[]) {
    await q(`INSERT INTO system_users
             (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
              medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
      [id, `mr_u${id}`, role, b, JSON.stringify([b]), spec]);
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

    // ══ ١. المرضى الأربعة يصلون الطبيب — جديدهم وقديمهم ═══════════════
    console.log("\n── ١. الجديد والقديم · أطراف ومساند ──");
    const newPros = await mk("سجاد الجديد", { prosthetic: true });
    const pastPros = await mk("كاظم القديم", { prosthetic: true, classification: "past", createdDaysAgo: 900 });
    const newSup = await mk("زينب الجديدة", { support: true });
    const pastSup = await mk("هدى القديمة", { support: true, classification: "past", createdDaysAgo: 900 });

    const r1 = await createReq(S.recv1, {
      patientId: newPros, serviceType: "prosthetic",
      requestedPath: "full", reviewKind: "new_device", receptionNote: "جهاز أول",
    });
    same("١. مريضُ أطرافٍ جديد — الطلب يُنشأ", r1.status, 201);
    const r2 = await createReq(S.recv1, {
      patientId: pastPros, serviceType: "prosthetic",
      requestedPath: "quick", reviewKind: "maintenance", receptionNote: "تبديل حزام",
    });
    same("   **ومريضُ أطرافٍ قديم — يُنشأ كذلك (كان يُقصى)**", r2.status, 201);
    const r3 = await createReq(S.recv1, {
      patientId: newSup, serviceType: "medical_support",
      requestedPath: "full", reviewKind: "new_device",
    });
    same("   ومريضُ مساندَ جديد", r3.status, 201);
    const r4 = await createReq(S.recv1, {
      patientId: pastSup, serviceType: "medical_support",
      requestedPath: "quick", reviewKind: "adjustment",
    });
    same("   **ومريضُ مساندَ قديم**", r4.status, 201);

    const qd = await queue(S.doc1);
    const ids = (qd.body?.rows ?? []).map((x: any) => x.patientId);
    check([newPros, pastPros, newSup, pastSup].every((p) => ids.includes(p)),
      "   والأربعة في طابور الطبيب", JSON.stringify(ids));
    same("   والطبيبُ مخوَّلٌ للقرار", qd.body?.canDecide, true);

    // ══ ٢. بطاقةُ القرار تحمل ما يكفي ═════════════════════════════════
    console.log("\n── ٢. بطاقة القرار ──");
    const card = (qd.body?.rows ?? []).find((x: any) => x.patientId === pastPros);
    check(Boolean(card?.patientName), "٢. اسم المريض");
    check(typeof card?.patientCode === "string" && card.patientCode.startsWith("WB-"), "   ورمزُه");
    same("   وفرعُه", card?.branchName, "بغداد");
    same("   وخدمتُه", card?.serviceType, "prosthetic");
    same("   وسببُ زيارته", card?.reviewKind, "maintenance");
    same("   وتصنيفُ الاستقبال", card?.requestedPath, "quick");
    same("   وملاحظتُه", card?.receptionNote, "تبديل حزام");
    same("   ومَن أرسله", card?.createdByName, "موظّف");
    same("   وأنه مريضٌ قديم", card?.patientClassification, "past");

    // ══ ٣. الموافقة السريعة ليست معاينة ═══════════════════════════════
    console.log("\n── ٣. موافقةٌ سريعة ──");
    const before = await examCount(pastPros);
    const dec = await decide(S.doc1, r2.body.id, "approve", "لا مانع");
    same("٣. القرار يُقبل", dec.status, 200);
    same("   والحالة صارت موافقة", dec.body?.status, "approved");
    same("   والقرار محفوظ", dec.body?.decision, "approve");
    same("   وصاحبُه", dec.body?.decidedBy, DOC1);
    check(Boolean(dec.body?.decidedAt), "   ووقتُه");
    same("   وملاحظتُه", dec.body?.doctorNote, "لا مانع");
    same("   والاختصاص محفوظ", dec.body?.serviceType, "prosthetic");
    same("   وتصنيفُ الاستقبال محفوظ", dec.body?.requestedPath, "quick");
    same("   **ولا معاينةً زائفة كُتبت**", await examCount(pastPros), before);
    same("   وخرج من الطابور",
      ((await queue(S.doc1)).body?.rows ?? []).some((x: any) => x.id === r2.body.id), false);
    //  والتدقيق يحمله.
    const audit = await q(
      `SELECT action FROM audit_log WHERE entity_type='medical_review_request' AND entity_id=$1
       ORDER BY id`, [r2.body.id]);
    same("   وسجلُّ التدقيق يحمل الإنشاء والقرار",
      audit.map((a: any) => a.action), ["create", "update"]);

    // ══ ٤. الإحالة إلى معاينة كاملة تدخل الطابور القائم ═══════════════
    console.log("\n── ٤. إحالةٌ إلى معاينة كاملة ──");
    //  المريضُ القديم لم يكن يظهر في قائمة عمل الطبيب إطلاقاً قبل الإحالة.
    const wlBefore = await http("GET", "/api/medical/worklist", S.doc1);
    same("٤. المريض القديم ليس في قائمة المعاينة قبل الإحالة",
      (wlBefore.body?.rows ?? []).some((x: any) => x.patientId === pastSup), false);
    const esc = await decide(S.doc1, r4.body.id, "require_full_exam", "أحتاج فحصاً");
    same("   القرار يُقبل", esc.status, 200);
    same("   والحالة إحالة", esc.body?.status, "escalated");
    const wlAfter = await http("GET", "/api/medical/worklist", S.doc1);
    check((wlAfter.body?.rows ?? []).some(
      (x: any) => x.patientId === pastSup && x.caseType === "medical_support"),
      "   **وبعدها يدخل قائمة المعاينة القائمة رغم أنه مريضٌ قديم**",
      JSON.stringify((wlAfter.body?.rows ?? []).map((x: any) => [x.patientId, x.caseType])));
    const pend = await http("GET", "/api/medical/pending", S.doc1);
    check((pend.body?.pending?.[String(pastSup)] ?? []).includes("medical_support"),
      "   ووسمُ «بانتظار معاينة» يظهر له",
      JSON.stringify(pend.body?.pending?.[String(pastSup)]));

    // ══ ٥. الإعادة إلى الاستقبال ══════════════════════════════════════
    console.log("\n── ٥. إعادةٌ إلى الاستقبال ──");
    const ret = await decide(S.doc1, r3.body.id, "return_to_reception", "وضّح الشكوى");
    same("٥. القرار يُقبل", ret.status, 200);
    same("   والحالة إعادة", ret.body?.status, "returned");
    same("   وخرج من الطابور",
      ((await queue(S.doc1)).body?.rows ?? []).some((x: any) => x.id === r3.body.id), false);
    same("   **ولا معاينةً كُتبت**", await examCount(newSup), 0);
    //  والاستقبال يُرسل من جديد بعد التوضيح — فالإعادة ليست طريقاً مسدوداً.
    const again = await createReq(S.recv1, {
      patientId: newSup, serviceType: "medical_support",
      requestedPath: "full", reviewKind: "new_device", receptionNote: "الشكوى: ألم",
    });
    same("   والاستقبال يُرسل من جديد", again.status, 201);

    // ══ ٦. قرارٌ واحد لكلّ طلب ════════════════════════════════════════
    console.log("\n── ٦. لا قرارَ ثانٍ ──");
    same("٦. القرار الثاني على نفس الطلب يُردّ",
      (await decide(S.doc1, r2.body.id, "approve")).status, 409);

    // ══ ٧. الصيانة تصل الطبيب — مرساةً على أمرها ══════════════════════
    console.log("\n── ٧. الصيانة ──");
    const maint = await mk("عباس الصيانة", { prosthetic: true, classification: "past", createdDaysAgo: 700 });
    const wo = await q<{ id: number }>(
      `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
         purpose, status, current_stage)
       VALUES ($1,1,$2,'prosthetic','maintenance','active','order_received') RETURNING id`,
      [maint, EXPERT]);
    const mreq = await createReq(S.recv1, {
      patientId: maint, serviceType: "prosthetic", requestedPath: "quick",
      reviewKind: "maintenance", workOrderId: wo[0].id, receptionNote: "صوت في المفصل",
    });
    same("٧. طلبُ صيانةٍ مربوطٌ بأمره", mreq.status, 201);
    same("   والمرساة محفوظة", mreq.body?.workOrderId, wo[0].id);
    const mcard = ((await queue(S.doc1)).body?.rows ?? []).find((x: any) => x.id === mreq.body.id);
    same("   والبطاقة تحمل سياق أمر الصيانة", mcard?.workOrder?.purpose, "maintenance");
    same("   وخبيرَه", mcard?.workOrder?.expertName, "موظّف");
    //  والتفرّد: طلبٌ معلَّقٌ واحد لكلّ أمر.
    same("   وطلبٌ ثانٍ على نفس الأمر يُردّ",
      (await createReq(S.recv1, {
        patientId: maint, serviceType: "prosthetic", requestedPath: "quick",
        reviewKind: "maintenance", workOrderId: wo[0].id,
      })).status, 409);

    // ══ ٨. نفس المريض يعود لاحقاً لمراجعةٍ أخرى ═══════════════════════
    console.log("\n── ٨. عودةٌ لاحقة ──");
    await decide(S.doc1, mreq.body.id, "approve");
    const later = await createReq(S.recv1, {
      patientId: maint, serviceType: "prosthetic", requestedPath: "quick",
      reviewKind: "follow_up", workOrderId: wo[0].id, receptionNote: "متابعة بعد شهر",
    });
    same("٨. **بعد البتّ يُقبل طلبٌ جديد على نفس الحدث**", later.status, 201);
    const hist = await http("GET", `/api/medical-review/patients/${maint}/requests`, S.recv1);
    same("   وتاريخُ المريض يحمل الطلبين", (hist.body ?? []).length, 2);
    //  ومعاينةٌ موقّعة سابقة لا تكتم طلباً جديداً.
    await q(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_id, doctor_name)
             VALUES ($1,'prosthetic',1,$2,'د. سابق')`, [pastPros, DOC1]);
    const afterExam = await createReq(S.recv1, {
      patientId: pastPros, serviceType: "prosthetic", requestedPath: "quick",
      reviewKind: "adjustment",
    });
    same("   **ومعاينةٌ موقّعة سابقة لا تمنع طلباً جديداً**", afterExam.status, 201);

    // ══ ٩. العلاج الطبيعي خارج هذا كلّه ═══════════════════════════════
    console.log("\n── ٩. العلاج الطبيعي ──");
    const physio = await mk("منتهى العلاج", { physio: true });
    const phy = await createReq(S.recv1, {
      patientId: physio, serviceType: "physiotherapy", requestedPath: "quick", reviewKind: "follow_up",
    });
    same("٩. **طلبُ علاجٍ طبيعي يُردّ**", phy.status, 400);
    same("   ولا صفَّ كُتب",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_review_requests WHERE patient_id=$1`,
        [physio]))[0].c), 0);
    same("   ولا يظهر في طابور المراجعة",
      ((await queue(S.doc1)).body?.rows ?? []).some((x: any) => x.patientId === physio), false);
    //  وقائمةُ عمل الطبيب لعلاجه لم تتغيّر: لا وسمَ إلزاميّاً له كما كان.
    const phyPend = await http("GET", "/api/medical/pending", S.doc1);
    same("   ووسمُ الانتظار الإلزامي لا يشمله كما كان",
      (phyPend.body?.pending?.[String(physio)] ?? []).includes("physiotherapy"), false);
    check((phyPend.body?.optional?.[String(physio)] ?? []).includes("physiotherapy"),
      "   ويبقى في القائمة الاختيارية كما كان",
      JSON.stringify(phyPend.body?.optional?.[String(physio)]));
    //  والقاعدة نفسها ترفضه حتى بالإدراج المباشر.
    let dbRejected = false;
    try {
      await q(`INSERT INTO medical_review_requests
                 (patient_id, service_type, requested_path, review_kind)
               VALUES ($1,'physiotherapy','quick','follow_up')`, [physio]);
    } catch { dbRejected = true; }
    check(dbRejected, "   **والقاعدة ترفضه بقيد CHECK لا الشيفرة وحدها**");

    // ══ ١٠. الصلاحيات ═════════════════════════════════════════════════
    console.log("\n── ١٠. الصلاحيات ──");
    const expertTry = await createReq(S.expert, {
      patientId: newPros, serviceType: "prosthetic", requestedPath: "quick", reviewKind: "follow_up",
    });
    same("١٠. خبيرُ الأطراف لا يُنشئ طلباً", expertTry.status, 403);
    const openReq = (await queue(S.doc1)).body?.rows?.[0];
    check(Boolean(openReq), "   وثمّة طلبٌ معلَّق للاختبار");
    same("   والاستقبالُ لا يقرّر",
      (await decide(S.recv1, openReq.id, "approve")).status, 403);
    same("   **والمسؤول العام لا يقرّر بحكم منصبه**",
      (await decide(S.admin, openReq.id, "approve")).status, 403);
    //  وسحبُ الصلاحية يسري فوراً — تُقرأ من القاعدة لا من الجلسة.
    await q(`UPDATE system_users SET is_active=false WHERE id=$1`, [DOC1]);
    same("   وطبيبٌ عُطِّل حسابُه لا يقرّر ولو حملت جلستُه القديم",
      (await decide(S.doc1, openReq.id, "approve")).status, 403);
    await q(`UPDATE system_users SET is_active=true WHERE id=$1`, [DOC1]);

    // ══ ١١. الفرع حاجز ════════════════════════════════════════════════
    console.log("\n── ١١. حدود الفرع ──");
    const other = await mk("مريض ذي قار", { prosthetic: true, branchId: 2 });
    same("١١. استقبالُ فرع ١ لا يُنشئ طلباً لمريض فرع ٢",
      (await createReq(S.recv1, {
        patientId: other, serviceType: "prosthetic", requestedPath: "quick", reviewKind: "follow_up",
      })).status, 403);
    const otherReq = await createReq(S.recv2, {
      patientId: other, serviceType: "prosthetic", requestedPath: "quick", reviewKind: "follow_up",
    });
    same("   واستقبالُ فرعه يُنشئه", otherReq.status, 201);
    same("   وطبيبُ فرع ١ لا يراه في طابوره",
      ((await queue(S.doc1)).body?.rows ?? []).some((x: any) => x.patientId === other), false);
    check(((await queue(S.doc2)).body?.rows ?? []).some((x: any) => x.patientId === other),
      "   وطبيبُ فرعه يراه");
    same("   **وطبيبُ فرع ١ لا يقرّر عليه**",
      (await decide(S.doc1, otherReq.body.id, "approve")).status, 403);
    same("   وطبيبُ فرعه يقرّر",
      (await decide(S.doc2, otherReq.body.id, "approve")).status, 200);

    // ══ ١٢. الاختصاص يُرشَّح في الخادم ════════════════════════════════
    console.log("\n── ١٢. اختصاصُ الطبيب ──");
    await q(`UPDATE system_users SET medical_specialties=$2::jsonb WHERE id=$1`,
      [DOC1, JSON.stringify(["prosthetic"])]);
    const narrowed = (await queue(S.doc1)).body?.rows ?? [];
    same("١٢. طبيبُ الأطراف لا يرى طلبَ مساند",
      narrowed.some((x: any) => x.serviceType === "medical_support"), false);
    check(narrowed.every((x: any) => x.serviceType === "prosthetic"),
      "   وكلُّ ما يراه أطراف", JSON.stringify(narrowed.map((x: any) => x.serviceType)));
    await q(`UPDATE system_users SET medical_specialties=$2::jsonb WHERE id=$1`,
      [DOC1, JSON.stringify(["prosthetic", "medical_support"])]);

    // ══ ١٣. المرساةُ تُتحقَّق من انتمائها ═════════════════════════════
    console.log("\n── ١٣. المرساة ──");
    same("١٣. أمرُ تصنيعٍ لمريضٍ آخر يُردّ",
      (await createReq(S.recv1, {
        patientId: newPros, serviceType: "prosthetic", requestedPath: "quick",
        reviewKind: "maintenance", workOrderId: wo[0].id,
      })).status, 400);

    // ══ ١٤. حذفُ المريض يبقى ممكناً (القاعدة الملزمة) ═════════════════
    console.log("\n── ١٤. كاسكيد الحذف ──");
    const doomed = await mk("مريض للحذف", { prosthetic: true });
    const dreq = await createReq(S.recv1, {
      patientId: doomed, serviceType: "prosthetic", requestedPath: "quick", reviewKind: "follow_up",
    });
    same("١٤. له طلبُ مراجعة", dreq.status, 201);
    const del = await http("DELETE", `/api/patients/${doomed}`, S.admin);
    check(del.status === 200 || del.status === 204,
      "   **وحذفُه ينجح رغم الجدول الجديد**", String(del.status));
    same("   ولا صفَّ مراجعةٍ يتيم",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_review_requests WHERE patient_id=$1`,
        [doomed]))[0].c), 0);

    // ══ ١٥. دمجُ ملفّين — التصادم المشروع ═════════════════════════════
    //  `uq_mrr_pending_bare` معلَّقٌ واحد بلا مرساة لكلّ (مريض، اختصاص).
    //  فملفّان لشخصٍ واحدٍ يحمل كلٌّ منهما طلباً معلَّقاً للاختصاص نفسه:
    //  إعادةُ التوجيه وحدها تنتهك الفهرس وتُسقط الدمج. والمطلوب أن ينجح
    //  الدمج، وأن يبقى **معلَّقٌ واحد**، وألّا يضيع تاريخُ المصدر.
    console.log("\n── ١٥. الدمج ──");
    const mSrc = await mk("ملفٌّ مكرَّر", { prosthetic: true });
    const mDst = await mk("الملفُّ الباقي", { prosthetic: true });
    const srcReq = await createReq(S.recv1, {
      patientId: mSrc, serviceType: "prosthetic", requestedPath: "quick", reviewKind: "maintenance",
    });
    const dstReq = await createReq(S.recv1, {
      patientId: mDst, serviceType: "prosthetic", requestedPath: "full", reviewKind: "new_device",
    });
    same("١٥. لكلّ ملفٍّ طلبٌ معلَّق للاختصاص نفسه",
      [srcReq.status, dstReq.status].join(","), "201,201");
    const srcCase = Number((await q(
      `SELECT case_id FROM medical_review_requests WHERE id=$1`, [srcReq.body.id]))[0].case_id);
    await storage.mergePatients(mSrc, mDst);
    check(true, "   **والدمج ينجح رغم الفهرس الجزئي**");
    const after = await q<{ id: number; status: string; case_id: number | null; decided_by: number | null }>(
      `SELECT id, status, case_id, decided_by FROM medical_review_requests
        WHERE patient_id=$1 ORDER BY id`, [mDst]);
    same("   والطلبان كلاهما على الملفّ الباقي", after.length, 2);
    same("   ولا صفَّ بقي على المصدر",
      Number((await q(`SELECT COUNT(*)::int c FROM medical_review_requests WHERE patient_id=$1`,
        [mSrc]))[0].c), 0);
    same("   **ومعلَّقٌ واحد لا اثنان**",
      after.filter((r) => r.status === "pending").length, 1);
    same("   والباقي معلَّقاً هو طلبُ الملفّ الهدف", after.find((r) => r.status === "pending")?.id, dstReq.body.id);
    same("   وطلبُ المصدر أُعيد إلى الاستقبال محفوظاً",
      after.find((r) => r.id === srcReq.body.id)?.status, "returned");
    same("   بلا طبيبٍ منسوبٍ إليه — الإغلاق إداريّ",
      after.find((r) => r.id === srcReq.body.id)?.decided_by, null);
    const remapped = after.find((r) => r.id === srcReq.body.id)?.case_id;
    check(remapped !== null && remapped !== srcCase,
      "   **وحالتُه رُمِّمت إلى حالة الهدف** (وإلا سقط الدمج على المفتاح)",
      `قبل ${srcCase} بعد ${remapped}`);
    same("   وهي حالةُ أطرافِ الملفّ الباقي",
      Number((await q(`SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
        [mDst]))[0].id), remapped);
  } finally {
    await cleanup();
    //  صفوفُ التدقيق تشير إلى المستخدم، وهي تاريخٌ يبقى — فتُفصَل لا تُحذف.
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`,
      [[ADMIN, RECV1, RECV2, DOC1, DOC2, EXPERT]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV1, RECV2, DOC1, DOC2, EXPERT]]);
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
