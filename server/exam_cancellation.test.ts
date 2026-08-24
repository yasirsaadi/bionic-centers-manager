// إلغاءُ معاينةٍ موقّعة — حيّاً على النقاط وPostgres.
// قاعدة محلّية: `npm run test:exam-cancellation`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **لا حذفَ إطلاقاً**: الصفُّ الأصلي ونسخُه وملاحقُه تبقى **موجودةً
//     فعلياً** بعد الإلغاء — يُتحقَّق بالعدّ قبل وبعد، وبقراءة الصفّ نفسه.
// (٢) **والملغاةُ ليست سلطةً سريرية**: لا تفتح بوّابةَ التصنيع، ولا تعطي
//     سعراً ولا مواصفات، ولا شارةَ «تم تحديد»، ولا تُخرج المريضَ من الطابور.
// (٣) **وقبل البيع تُعاد الحلقةُ إلى «بانتظار المعاينة»** — الطلبُ باقٍ،
//     والمعاينةُ سقطت. فتُوقَّع مصحَّحةٌ تطالب الحلقةَ نفسَها.
// (٤) **وبعد البيع أو التصنيع يُردّ الإلغاء ٤٠٩** — ولا دينارَ يُلمس.
// (٥) **والحصرُ بالجهاز بعينه**: خصمٌ معلَّقٌ على جهازٍ آخر لا يمنع.

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

const PORT = 6883;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إلغاء-المعاينة";
const ADMIN = 9901, RECV = 9902, MGR = 9903, MGR2 = 9904, DOC = 9905, DOC2 = 9906, EXPERT = 9907;

const perms = { canViewPatients: true, canAddPatients: true, canEnterSessions: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { ...perms, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "recv", permissions: perms },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "mgr", permissions: perms },
  mgr2: { userId: MGR2, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "mgr2", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "doc", permissions: { ...perms, canWriteMedicalExam: true } },
  doc2: { userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "doc2", permissions: { ...perms, canWriteMedicalExam: true } },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "exp", permissions: { canViewPatients: true } },
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
  await q(`DELETE FROM medical_exam_cancellations WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (SELECT id FROM journal_entries WHERE source_type='payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids})))`);
  await q(`DELETE FROM journal_entries WHERE source_type='payment' AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function mk(name: string, opts: {
  branchId?: number; prosthetic?: boolean; support?: boolean; physio?: boolean;
} = {}): Promise<number> {
  const branchId = opts.branchId ?? 1;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, referral_source, age, height, weight, amputation_site,
       medical_condition, branch_id, is_amputee, is_medical_support, is_physiotherapy,
       total_cost, patient_classification)
     VALUES ($1,$2,'40','172','78','احادي - طرف سفلي - يمين - تحت الركبة','x',
             $3,$4,$5,$6,0,'new')
     RETURNING id`,
    [name, MARK, branchId, Boolean(opts.prosthetic), Boolean(opts.support), Boolean(opts.physio)]);
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

const startEpisode = (patientId: number, serviceType: string) =>
  http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
    { servicePath: "exam", serviceType, requestedItem: "full_device" });

const signExam = (patientId: number, caseType: string, extra: any = {}, session: any = S.doc) =>
  http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType, diagnosis: "تشخيص", plan: "خطة", ...extra,
  });

const cancel = (examId: number, reason: string, session: any = S.doc) =>
  http("POST", `/api/medical/exams/${examId}/cancel`, session, { reason });

const listExams = (patientId: number, session: any = S.doc) =>
  http("GET", `/api/medical/patients/${patientId}/exams`, session);

const examRowCount = async (patientId: number) =>
  Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id=$1`, [patientId]))[0].c);
const episodeStatus = async (id: number) =>
  String((await q(`SELECT status FROM patient_device_episodes WHERE id=$1`, [id]))[0]?.status);
const followupOf = async (examId: number) =>
  (await q(`SELECT id, status FROM post_exam_followups WHERE medical_exam_id=$1`, [examId]))[0];

/** لقطةُ ما يجب ألّا يتحرّك إطلاقاً بالإلغاء. */
async function money(patientId: number) {
  const one = async (t: string) => Number((await q<{ c: number }>(t, [patientId]))[0].c);
  return {
    totalCost: await one(`SELECT total_cost c FROM patients WHERE id=$1`),
    payments: await one(`SELECT COUNT(*)::int c FROM payments WHERE patient_id=$1`),
    costEntries: await one(`SELECT COUNT(*)::int c FROM cost_entries WHERE patient_id=$1`),
    orders: await one(`SELECT COUNT(*)::int c FROM prosthetic_work_orders WHERE patient_id=$1`),
    visits: await one(`SELECT COUNT(*)::int c FROM visits WHERE patient_id=$1 AND deleted_at IS NULL`),
  };
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, null], [RECV, "reception", 1, null],
    [MGR, "branch_manager", 1, null], [MGR2, "branch_manager", 2, null],
    [DOC, "doctor", 1, JSON.stringify(["prosthetic", "medical_support", "physiotherapy"])],
    [DOC2, "doctor", 1, JSON.stringify(["prosthetic", "medical_support"])],
    [EXPERT, "prosthetics_expert", 1, null],
  ] as any[]) {
    await q(`INSERT INTO system_users
             (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
              medical_specialties)
             VALUES ($1,$2,'x','موظّف',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
      [id, `xc_u${id}`, role, b, JSON.stringify([b]), spec]);
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
    // ══ أ. المسارُ الكامل: طلبٌ ⟶ معاينة ⟶ إلغاء ⟶ معاينةٌ مصحَّحة ════
    console.log("\n── أ. الطرف الصناعي: إلغاءٌ قبل البيع ──");
    const pA = await mk("أ — طرف", { prosthetic: true });
    const epA = (await startEpisode(pA, "prosthetic")).body;
    check(Boolean(epA?.id), "أ. حلقةُ جهازٍ أُنشئت", JSON.stringify(epA));
    same("   وحالتُها «بانتظار المعاينة»", await episodeStatus(epA.id), "awaiting_exam");

    const exA = (await signExam(pA, "prosthetic", { deviceCost: 3000000 })).body;
    check(Boolean(exA?.id), "   ومعاينةٌ وُقّعت", JSON.stringify(exA)?.slice(0, 120));
    same("   فصارت الحلقةُ «مُعايَنة»", await episodeStatus(epA.id), "examined");
    const fuA = await followupOf(exA.id);
    check(Boolean(fuA?.id), "   ووُلدت متابعةٌ لها", JSON.stringify(fuA));

    const beforeMoney = await money(pA);
    const beforeRows = await examRowCount(pA);

    //  ولا سلطةَ قبل الإلغاء: البوّابةُ مفتوحة والسعرُ مقروء.
    const gateBefore = await http("GET", `/api/patients/${pA}/device-episodes`, S.recv);
    check(gateBefore.status === 200, "   ونقطةُ الحلقات تُقرأ");

    same("أ.١ **الإلغاء يمرّ**", (await cancel(exA.id, "أُدخلت للمريض الخطأ")).status, 200);

    // ── لا حذف ────────────────────────────────────────────────────────
    same("أ.٢ **الصفُّ الأصلي ما زال موجوداً فعلياً**", await examRowCount(pA), beforeRows);
    const still = await q(`SELECT id, doctor_name, signed_at FROM medical_exams WHERE id=$1`, [exA.id]);
    check(still.length === 1 && Boolean(still[0].doctor_name) && Boolean(still[0].signed_at),
      "   بتوقيعه واسم طبيبه وختمه الزمني", JSON.stringify(still[0]));
    const tomb = await q(`SELECT * FROM medical_exam_cancellations WHERE exam_id=$1`, [exA.id]);
    same("أ.٣ وشاهدةُ الإلغاء مكتوبة",
      [tomb.length, String(tomb[0]?.reason), Number(tomb[0]?.cancelled_by)],
      [1, "أُدخلت للمريض الخطأ", DOC]);

    // ── لا تُعرَض في السجلّ الفعّال ────────────────────────────────────
    const afterList = await listExams(pA);
    check(!((afterList.body?.exams ?? []) as any[]).some((e) => e.id === exA.id),
      "أ.٤ **ولا تظهر في السجلّ الفعّال**");

    // ── الحلقةُ رجعت، والمتابعةُ تقاعدت بسببها الحقيقي ────────────────
    same("أ.٥ **والحلقةُ عادت «بانتظار المعاينة»**", await episodeStatus(epA.id), "awaiting_exam");
    same("أ.٦ **والمتابعةُ أُغلقت بسبب إلغاء المعاينة**",
      String((await followupOf(exA.id))?.status), "closed_exam_cancelled");
    const ev = await q(
      `SELECT event_type, note FROM post_exam_followup_events
        WHERE followup_id=$1 ORDER BY id DESC LIMIT 1`, [fuA.id]);
    check(String(ev[0]?.event_type) === "closed_exam_cancelled"
      && String(ev[0]?.note).includes("إلغاء المعاينة"),
    "   وحدثُها يقول السبب — لا «لم يشترِ»", JSON.stringify(ev[0]));

    // ── ولا دينار ────────────────────────────────────────────────────
    same("أ.٧ **ولا دينارَ تحرّك ولا أمرَ تصنيعٍ وُلد**", await money(pA), beforeMoney);

    // ── المريضُ عاد إلى طابور الطبيب ──────────────────────────────────
    const wl = await http("GET", "/api/medical/worklist", S.doc);
    check(((wl.body?.rows ?? []) as any[]).some((r) => r.patientId === pA),
      "أ.٨ **والمريضُ عاد ينتظر معاينة**");

    // ── معاينةٌ مصحَّحة تطالب الحلقةَ نفسها ───────────────────────────
    const exA2 = (await signExam(pA, "prosthetic", { deviceCost: 2500000 })).body;
    check(Boolean(exA2?.id) && exA2.id !== exA.id, "أ.٩ **ومعاينةٌ مصحَّحة تُوقَّع**");
    same("   فتعود الحلقةُ نفسُها «مُعايَنة»", await episodeStatus(epA.id), "examined");
    same("   ومعرّفُها هو الحلقةُ نفسُها لا حلقةٌ ثانية",
      Number(exA2.deviceEpisodeId), Number(epA.id));
    const list2 = await listExams(pA);
    const active = ((list2.body?.exams ?? []) as any[]).map((e) => e.id);
    same("   والسجلُّ الفعّال يحمل المصحَّحة وحدها", active, [exA2.id]);
    check(Boolean(await followupOf(exA2.id)),
      "   **ومتابعةٌ جديدة أمكن إنشاؤها** — المتقاعدة لم تمنعها");

    // ══ ب. المساند — المسارُ نفسه ═════════════════════════════════════
    console.log("\n── ب. المساند ──");
    const pB = await mk("ب — مساند", { support: true });
    const epB = (await startEpisode(pB, "medical_support")).body;
    const exB = (await signExam(pB, "medical_support", { deviceCost: 500000 })).body;
    same("ب. الحلقةُ «مُعايَنة»", await episodeStatus(epB.id), "examined");
    same("   والإلغاء يمرّ", (await cancel(exB.id, "الاختصاص غير صحيح")).status, 200);
    same("ب.١ **والحلقةُ عادت «بانتظار المعاينة»**", await episodeStatus(epB.id), "awaiting_exam");
    same("   والصفُّ باقٍ", (await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE id=$1`, [exB.id]))[0].c, 1);

    // ══ ج. تصنيعٌ جارٍ ⟶ ٤٠٩ ══════════════════════════════════════════
    console.log("\n── ج/د. بعد البيع والتصنيع ──");
    const pC = await mk("ج — قيد التصنيع", { prosthetic: true });
    const epC = (await startEpisode(pC, "prosthetic")).body;
    const exC = (await signExam(pC, "prosthetic", { deviceCost: 1000000 })).body;
    await q(`UPDATE patient_device_episodes SET status='in_manufacturing' WHERE id=$1`, [epC.id]);
    const beforeC = await money(pC);
    const rC = await cancel(exC.id, "محاولة");
    same("ج. **حلقةٌ قيد التصنيع ⟶ ٤٠٩**", rC.status, 409);
    check(String(rC.body?.error ?? "").includes("بعد تنفيذ الخدمة"),
      "   برسالةٍ تدلّ على المسار الصحيح", String(rC.body?.error));
    same("   ولا شاهدةَ إلغاءٍ كُتبت",
      (await q(`SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE exam_id=$1`, [exC.id]))[0].c, 0);
    same("   ولا شيءَ تغيّر", await money(pC), beforeC);
    same("   والحلقةُ كما هي", await episodeStatus(epC.id), "in_manufacturing");

    // ══ د. مُسلَّم ⟶ ٤٠٩ ══════════════════════════════════════════════
    await q(`UPDATE patient_device_episodes SET status='delivered' WHERE id=$1`, [epC.id]);
    same("د. **حلقةٌ مُسلَّمة ⟶ ٤٠٩**", (await cancel(exC.id, "محاولة")).status, 409);

    // ══ هـ. خصمٌ معلَّقٌ على هذه المعاينة ⟶ ٤٠٩ ═══════════════════════
    console.log("\n── هـ/و. الخصم المعلَّق ──");
    const pE = await mk("هـ — خصم معلَّق", { prosthetic: true });
    const epE = (await startEpisode(pE, "prosthetic")).body;
    const exE = (await signExam(pE, "prosthetic", { deviceCost: 2000000 })).body;
    const fuE = await followupOf(exE.id);
    await q(`INSERT INTO service_discount_requests
              (patient_id, branch_id, department, context_ref, original_price,
               proposed_final_price, discount_amount, discount_percentage, is_free,
               reason, status, payload, requested_by)
             VALUES ($1,1,'prosthetic',$2,2000000,1500000,500000,25,false,
                     'humanitarian','pending','{}'::jsonb,$3)`,
      [pE, `followup:${fuE.id}`, RECV]);
    const rE = await cancel(exE.id, "محاولة");
    same("هـ. **خصمٌ معلَّقٌ على هذه المعاينة ⟶ ٤٠٩**", rE.status, 409);
    check(String(rE.body?.error ?? "").includes("طلب خصم أو اعتماد معلّق"),
      "   برسالته الصريحة", String(rE.body?.error));

    // ══ و. وخصمٌ على جهازٍ آخر لا يمنع ════════════════════════════════
    await q(`DELETE FROM service_discount_requests WHERE patient_id=$1`, [pE]);
    //  جهازٌ ثانٍ للمريض نفسه — مساند — بخصمٍ معلَّقٍ عليه هو.
    await q(`INSERT INTO patient_cases (patient_id, case_type, status, branch_id)
             VALUES ($1,'medical_support','active',1) ON CONFLICT DO NOTHING`, [pE]);
    await q(`UPDATE patients SET is_medical_support=true WHERE id=$1`, [pE]);
    const epE2 = (await startEpisode(pE, "medical_support")).body;
    const exE2 = (await signExam(pE, "medical_support", { deviceCost: 400000 })).body;
    const fuE2 = await followupOf(exE2.id);
    await q(`INSERT INTO service_discount_requests
              (patient_id, branch_id, department, context_ref, original_price,
               proposed_final_price, discount_amount, discount_percentage, is_free,
               reason, status, payload, requested_by)
             VALUES ($1,1,'medical_support',$2,400000,300000,100000,25,false,
                     'humanitarian','pending','{}'::jsonb,$3)`,
      [pE, `followup:${fuE2.id}`, RECV]);
    same("و. **وخصمُ الجهاز الآخر لا يمنع إلغاء هذه** — الحصرُ بالجهاز",
      (await cancel(exE.id, "بيانات غير صحيحة")).status, 200);
    same("   والحلقةُ الأولى عادت", await episodeStatus(epE.id), "awaiting_exam");
    same("   **والثانيةُ لم تُمَسّ**", await episodeStatus(epE2.id), "examined");

    // ══ ز. النسخُ والملاحقُ تبقى ══════════════════════════════════════
    console.log("\n── ز. النسخ والملاحق ──");
    const pG = await mk("ز — نسخ وملاحق", { prosthetic: true });
    await startEpisode(pG, "prosthetic");
    const exG = (await signExam(pG, "prosthetic", { deviceCost: 900000 })).body;
    await http("PATCH", `/api/medical/exams/${exG.id}`, S.doc,
      { caseType: "prosthetic", diagnosis: "تشخيص مُعدَّل", plan: "خطة" });
    await http("POST", `/api/medical/exams/${exG.id}/addenda`, S.doc, { body: "ملحق مهم" });
    const revs = Number((await q(`SELECT COUNT(*)::int c FROM medical_exam_revisions WHERE exam_id=$1`, [exG.id]))[0].c);
    const adds = Number((await q(`SELECT COUNT(*)::int c FROM medical_exam_addenda WHERE exam_id=$1`, [exG.id]))[0].c);
    check(revs > 0 && adds > 0, "ز. للمعاينة نسخةٌ وملحق", `rev=${revs} add=${adds}`);
    same("   والإلغاء يمرّ", (await cancel(exG.id, "بيانات غير صحيحة")).status, 200);
    same("ز.١ **والنسخُ والملاحقُ باقيةٌ كلُّها**", [
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exam_revisions WHERE exam_id=$1`, [exG.id]))[0].c),
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exam_addenda WHERE exam_id=$1`, [exG.id]))[0].c),
      Number((await q(`SELECT COUNT(*)::int c FROM medical_exams WHERE id=$1`, [exG.id]))[0].c),
    ], [revs, adds, 1]);
    //  ولا كتابةَ عليها بعد الإلغاء.
    same("ز.٢ ولا تعديلَ لملغاة",
      (await http("PATCH", `/api/medical/exams/${exG.id}`, S.doc,
        { caseType: "prosthetic", diagnosis: "x", plan: "y" })).status, 409);
    same("   ولا ملحقَ عليها",
      (await http("POST", `/api/medical/exams/${exG.id}/addenda`, S.doc, { body: "z" })).status, 409);

    // ══ ح. الملغاةُ لا تُرضي أيَّ بوّابة ═══════════════════════════════
    console.log("\n── ح. البوّابات ──");
    const pH = await mk("ح — بوّابات", { prosthetic: true });
    const epH = (await startEpisode(pH, "prosthetic")).body;
    const exH = (await signExam(pH, "prosthetic", {
      deviceCost: 1234000,
      prescription: { prostheticType: "تحت الركبة", footType: "قدم ديناميكية" },
    })).body;
    const medical = await import("./medical/store");
    same("ح.٠ وقبل الإلغاء: البوّابةُ مفتوحة والسعرُ والمواصفاتُ مقروءة", [
      await medical.hasSignedExamForEpisode(epH.id),
      await medical.latestDeviceCostForEpisode(epH.id),
      Object.keys(await medical.prescribedSpecsForEpisode(epH.id, "prosthetic" as any)).length > 0,
      await medical.hasSignedExam(pH, "prosthetic" as any),
    ], [true, 1234000, true, true]);
    same("   والإلغاء يمرّ", (await cancel(exH.id, "بيانات غير صحيحة")).status, 200);
    same("ح.١ **وبعده لا بوّابةَ ولا سعرَ ولا مواصفات**", [
      await medical.hasSignedExamForEpisode(epH.id),
      await medical.latestDeviceCostForEpisode(epH.id),
      Object.keys(await medical.prescribedSpecsForEpisode(epH.id, "prosthetic" as any)).length,
      await medical.hasSignedExam(pH, "prosthetic" as any),
      await medical.latestDeviceCost(pH, "prosthetic" as any),
      Object.keys(await medical.prescribedSpecs(pH, "prosthetic" as any)).length,
    ], [false, null, 0, false, null, 0]);
    const decided = await medical.getDecidedExams(null);
    check(!decided.some((d: any) => d.patientId === pH),
      "ح.٢ **ولا شارةَ «تم تحديد»**", JSON.stringify(decided.slice(0, 3)));
    const pend = await medical.getPendingForPatient(pH);
    check(pend.includes("prosthetic"),
      "ح.٣ **والمريضُ عاد إلى الانتظار**", JSON.stringify(pend));

    // ══ ط. العلاج الطبيعي ═════════════════════════════════════════════
    console.log("\n── ط. العلاج الطبيعي ──");
    const pI = await mk("ط — علاج طبيعي", { physio: true });
    const exI = (await signExam(pI, "physiotherapy")).body;
    check(Boolean(exI?.id), "ط. معاينةُ علاجٍ طبيعي وُقّعت", JSON.stringify(exI)?.slice(0, 80));
    //  جلساتٌ مستقلّة اشتُريت — لا رابطَ مباشراً بينها وبين المعاينة.
    await q(`INSERT INTO payments (patient_id, branch_id, amount, notes,
               payment_treatment_type, session_count)
             VALUES ($1,1,50000,'جلسات','روبوت',2)`, [pI]);
    const beforeI = await money(pI);
    same("   والإلغاء يمرّ", (await cancel(exI.id, "بيانات غير صحيحة")).status, 200);
    same("ط.١ **والجلساتُ والدفعاتُ لم تُمَسّ**", await money(pI), beforeI);
    const listI = await listExams(pI);
    check(!((listI.body?.exams ?? []) as any[]).some((e) => e.id === exI.id),
      "   والمعاينةُ خرجت من السجلّ الفعّال");

    // ══ ي. الصلاحيات ══════════════════════════════════════════════════
    console.log("\n── ي. الصلاحيات ──");
    const pJ = await mk("ي — صلاحيات", { prosthetic: true });
    await startEpisode(pJ, "prosthetic");
    const mkEx = async () => (await signExam(pJ, "prosthetic", { deviceCost: 100000 })).body;

    let e1 = await mkEx();
    same("ي.١ الاستقبال ⟶ ٤٠٣", (await cancel(e1.id, "x", S.recv)).status, 403);
    same("ي.٢ **وطبيبٌ آخر ⟶ ٤٠٣** — لا يسحب توقيع زميله",
      (await cancel(e1.id, "x", S.doc2)).status, 403);
    same("ي.٣ والخبير ⟶ ٤٠٣", (await cancel(e1.id, "x", S.expert)).status, 403);
    same("ي.٤ ومديرُ فرعٍ آخر ⟶ ٤٠٣", (await cancel(e1.id, "x", S.mgr2)).status, 403);
    same("   ولا شاهدةَ من كلّ ذلك",
      (await q(`SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE exam_id=$1`, [e1.id]))[0].c, 0);
    same("ي.٥ **وصاحبُها ⟶ ينجح**", (await cancel(e1.id, "أُدخلت للمريض الخطأ", S.doc)).status, 200);

    e1 = await mkEx();
    same("ي.٦ **ومديرُ الفرع في نطاقه ⟶ ينجح**", (await cancel(e1.id, "خطأ", S.mgr)).status, 200);
    e1 = await mkEx();
    same("ي.٧ **والمسؤولُ العام ⟶ ينجح**", (await cancel(e1.id, "خطأ", S.admin)).status, 200);

    // ══ ك. الإلغاءُ الثاني ════════════════════════════════════════════
    console.log("\n── ك. الإلغاء المكرَّر ──");
    const rK = await cancel(e1.id, "مرّة ثانية", S.admin);
    same("ك. **الثاني يُردّ ٤٠٩**", rK.status, 409);
    check(String(rK.body?.error ?? "").includes("ملغاة بالفعل"), "   برسالته", String(rK.body?.error));
    same("   **ولا شاهدةَ مكرَّرة**",
      (await q(`SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE exam_id=$1`, [e1.id]))[0].c, 1);

    //  والسببُ إلزاميّ.
    const e2 = await mkEx();
    same("ك.١ وإلغاءٌ بلا سبب يُردّ ٤٠٠", (await cancel(e2.id, "   ", S.admin)).status, 400);

    // ══ ل. لا حذفَ من `medical_exams` في أي مسار ══════════════════════
    console.log("\n── ل. لا حذف ──");
    const allExamRows = Number((await q(
      `SELECT COUNT(*)::int c FROM medical_exams WHERE patient_id IN (${ids})`))[0].c);
    const allCancels = Number((await q(
      `SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE patient_id IN (${ids})`))[0].c);
    check(allExamRows > 0 && allCancels > 0,
      `ل. ${allExamRows} معاينة و${allCancels} شاهدة — **كلُّها موجودةٌ فعلياً**`);
    const forensic = Number((await q(
      `SELECT COUNT(*)::int c FROM medical_exams_forensic_log
        WHERE patient_id IN (${ids})`))[0].c);
    same("ل.١ **والجدولُ الجنائي فارغ** — لم يُحذف صفٌّ واحد", forensic, 0);

    // ══ م. حذفُ المريض كاملاً ما زال يعمل (القاعدة الملزمة) ═══════════
    console.log("\n── م. كاسكيد حذف المريض ──");
    const pM = await mk("م — حذف", { prosthetic: true });
    await startEpisode(pM, "prosthetic");
    const exM = (await signExam(pM, "prosthetic", { deviceCost: 700000 })).body;
    same("م. الإلغاء يمرّ", (await cancel(exM.id, "خطأ", S.admin)).status, 200);
    //  **الحذفُ العاديُّ صار سلّةً** (ترحيل ٠٦٨): والكاسكيدُ الهادمُ
    //  بابُه الوحيد «حذف نهائي» من داخل السلّة. فتُنفَّذ الخطوتان معاً
    //  كي تبقى **تغطيةُ الكاسكيد كما كانت** بحرفها.
    await http("DELETE", `/api/patients/${pM}`, S.admin,
      { reason: "اختبار الكاسكيد" });
    const del = await http("POST", `/api/patient-trash/${pM}/purge`,
      S.admin, { reason: "اختبار الكاسكيد" });
    check(del.status === 200 || del.status === 204,
      "م.١ **وحذفُ المريض الكامل ما زال ينجح**", `${del.status} ${JSON.stringify(del.body)}`);
    same("   ولا صفَّ شاهدةٍ يتيم",
      (await q(`SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE patient_id=$1`, [pM]))[0].c, 0);

    // ══ ن. **سحبُ الاختصاص يسري فوراً — على الإلغاء كما على الكتابة** ══
    //
    //  ══ العطبُ الذي يغلقه ═══════════════════════════════════════════
    //  كان الشرطُ على صاحب المعاينة «أيملك أيَّ اختصاصٍ طبّي؟» لا «أيملك
    //  اختصاصَ هذه المعاينة؟». فطبيبٌ سُحب منه اختصاصُ الأطراف وبقي له
    //  العلاجُ الطبيعي كان يظلّ قادراً على **سحب توقيعٍ لم يعد يملك أن
    //  يكتب مثلَه**. وسحبُ المنح يجب أن يسري في الاتجاهين معاً.
    //
    //  والشرطُ يُقرأ من القاعدة لا من الجلسة: الجلسةُ هنا تحمل
    //  `canWriteMedicalExam: true` طوال الوقت، والقاعدةُ وحدها تتغيّر.
    console.log("\n── ن. سحبُ الاختصاص ──");
    const setSpecialties = (userId: number, list: string[]) =>
      q(`UPDATE system_users SET medical_specialties = $2::jsonb WHERE id = $1`,
        [userId, JSON.stringify(list)]);
    /** ما يقوله الخادمُ للشاشة عن هذه المعاينة — `null` إن لم تعد تُعرَض. */
    const canCancelOf = async (patientId: number, examId: number, session: any) => {
      const r = await listExams(patientId, session);
      const row = ((r.body?.exams ?? []) as any[]).find((e) => e.id === examId);
      return row ? row.canCancel : null;
    };
    const cancelRows = async (examId: number) => Number((await q(
      `SELECT COUNT(*)::int c FROM medical_exam_cancellations WHERE exam_id=$1`, [examId]))[0].c);

    const pN = await mk("ن — سحب الاختصاص", { prosthetic: true });
    const epN = (await startEpisode(pN, "prosthetic")).body;
    //  يوقّعها د.٢ وهو يحمل الأطراف والمساند.
    await setSpecialties(DOC2, ["prosthetic", "medical_support"]);
    const exN = (await signExam(pN, "prosthetic", { deviceCost: 900000 }, S.doc2)).body;
    check(Boolean(exN?.id), "ن. معاينةُ أطرافٍ وقّعها صاحبُ الاختصاص",
      JSON.stringify(exN)?.slice(0, 80));
    same("   وهو يراها قابلةً للإلغاء", await canCancelOf(pN, exN.id, S.doc2), true);
    const epBefore = await episodeStatus(epN.id);
    const fuBefore = await followupOf(exN.id);

    // ── أ. سُحب منه اختصاصُ الأطراف وبقي طبيباً ──────────────────────
    await setSpecialties(DOC2, ["physiotherapy"]);
    same("ن.أ **الزرُّ يختفي فوراً** — `canCancel=false` بلا خروجٍ ودخول",
      await canCancelOf(pN, exN.id, S.doc2), false);
    const rNa = await cancel(exN.id, "لم يعد اختصاصي", S.doc2);
    same("ن.أ.١ **والنقطةُ تردّ ٤٠٣**", rNa.status, 403);
    check(String(rNa.body?.error ?? "").includes("لم تعد تملك اختصاص"),
      "   برسالةٍ تقول أيُّ بابٍ أُغلق", String(rNa.body?.error));
    same("ن.أ.٢ **ولا شاهدةَ إلغاء**", await cancelRows(exN.id), 0);
    same("ن.أ.٣ **ولا الحلقةُ ولا المتابعةُ تحرّكتا**",
      [await episodeStatus(epN.id), (await followupOf(exN.id))?.status],
      [epBefore, fuBefore?.status]);

    // ── ج. اختصاصٌ آخرُ حقيقيّ لا يكفي كذلك ─────────────────────────
    //  وهذا هو ما كان يمرّ: القائمةُ غيرُ فارغة ⟹ كان يُقبل.
    await setSpecialties(DOC2, ["medical_support"]);
    same("ن.ج **ومساندٌ لا يُلغي معاينةَ أطراف** — `canCancel=false`",
      await canCancelOf(pN, exN.id, S.doc2), false);
    same("ن.ج.١ والنقطةُ تردّ ٤٠٣", (await cancel(exN.id, "x", S.doc2)).status, 403);
    same("   ولا شاهدة", await cancelRows(exN.id), 0);

    // ── د. والمديرُ والمسؤولُ لا يمسّهما شيءٌ من ذلك ─────────────────
    //  إذنُهما إداريٌّ لا سريريّ، ولا يحملان اختصاصاً طبّياً أصلاً.
    same("ن.د **مديرُ الفرع في نطاقه يراها قابلةً للإلغاء**",
      await canCancelOf(pN, exN.id, S.mgr), true);
    same("ن.د.١ **والمسؤولُ العام كذلك**",
      await canCancelOf(pN, exN.id, S.admin), true);
    same("   ومديرُ فرعٍ آخر لا يصل إليها أصلاً",
      (await listExams(pN, S.mgr2)).status, 403);

    // ── ب. أُعيد له الاختصاص ⟶ يعود الحقّ فوراً ──────────────────────
    await setSpecialties(DOC2, ["prosthetic"]);
    same("ن.ب **وإعادةُ الاختصاص تعيد الحقّ فوراً**",
      await canCancelOf(pN, exN.id, S.doc2), true);
    same("ن.ب.١ **والإلغاءُ ينجح**",
      (await cancel(exN.id, "كُتبت للمريض الخطأ", S.doc2)).status, 200);
    same("   وشاهدةٌ واحدة", await cancelRows(exN.id), 1);
    same("ن.ب.٢ **والحلقةُ عادت بانتظار المعاينة**", await episodeStatus(epN.id), "awaiting_exam");
    same("   والمتابعةُ تقاعدت بسببها الحقيقي",
      (await followupOf(exN.id))?.status, "closed_exam_cancelled");
    //  وسطرُ السجلّ يقول ذلك بالعربية لا برمزٍ داخليّ.
    const evN = (await q(`SELECT event_type, reason, note FROM post_exam_followup_events
                           WHERE followup_id=$1 ORDER BY id DESC LIMIT 1`, [fuBefore?.id]))[0];
    check(String(evN?.event_type) === "closed_exam_cancelled"
      && String(evN?.note ?? "").includes("كُتبت للمريض الخطأ"),
      "ن.ب.٣ **وحدثُ الإغلاق يحمل سببَ مَن ألغى**", JSON.stringify(evN));

    await setSpecialties(DOC2, ["prosthetic", "medical_support"]);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`,
      [[ADMIN, RECV, MGR, MGR2, DOC, DOC2, EXPERT]]);
    await q(`DELETE FROM journal_entries WHERE created_by = ANY($1::int[])`,
      [[ADMIN, RECV, MGR, MGR2, DOC, DOC2, EXPERT]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, MGR, MGR2, DOC, DOC2, EXPERT]]);
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
