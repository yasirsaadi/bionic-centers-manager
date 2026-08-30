// «عاد للشراء» — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:return-to-purchase`.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════
// مريضٌ طلب جهازاً، عايَنه طبيب، سجّل الاستقبالُ «لم يشترِ». بعد أسابيع
// يعود يريد **الجهازَ نفسَه**. لا مريضَ جديداً، ولا حالةً جديدة، ولا حلقةَ
// جديدة، ولا محوَ التاريخ القديم — حلقةٌ واحدة تعود `awaiting_exam` فتُوقَّع
// لها معاينةٌ ثانية، والمتابعةُ القديمة `closed_without_purchase` تبقى
// كما هي بسببها وتاريخها.
//
// ══ ما يحرسه هذا الملفّ ═══════════════════════════════════════════════
// (١) الخيارُ غائبٌ بلا تاريخٍ مؤهَّل، وحاضرٌ لحلقةٍ حقيقية.
// (٢) الحلقةُ نفسُها تُستأنَف — لا مريضَ ولا حالةَ ولا حلقةَ جديدة.
// (٣) تعدّدُ المؤهَّلين يفرض اختياراً دقيقاً — لا تخمينَ للأحدث.
// (٤) طلبُ المراجعة `full`/`return_to_purchase` بالضبط.
// (٥) قائمةُ عمل الطبيب تُظهر «عاد للشراء» صراحةً.
// (٦) الضغطةُ المزدوجة لا تُضاعِف الطلب.
// (٧) المعاينةُ الثانية تفتح متابعةً جديدة، والقديمةُ تبقى سليمةً بتاريخها.
// (٨) بلا أثرٍ ماليّ إطلاقاً قبل إتمام البيع.
// (٩) البابُ العام «إعادة الفتح» يُردّ على هذا المسار بعينه، والصفوفُ
//     الموروثة (بلا حلقة) تبقى على حالها.
// (١٠) إتمامُ البيع القائم يعمل بعد ذلك كالمعتاد.
// (١١) العلاجُ الطبيعي بمعزل تامّ، وحدودُ الفرع مفروضة.

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

const PORT = 6931;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عاد-للشراء";
const ADMIN = 9931, RECV = 9932, MGR = 9933, DOC = 9934, EXPERT = 9935, RECV_B2 = 9936;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT, RECV_B2];

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
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {} },
  //  استقبالُ فرعٍ آخر — لإثبات أن الأهليّةَ والتنفيذَ محكومان بالفرع.
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: { canViewPatients: true, canAddPatients: true } },
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
      "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

/** مريضٌ ببياناتٍ إلزامية كاملة — **بدءُ حلقة جهاز يشترطها**. */
async function mkPatient(label: string, flags: {
  isAmputee?: boolean; isMedicalSupport?: boolean; isPhysiotherapy?: boolean;
} = {}, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,$4,$5,$6,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId,
      flags.isAmputee ?? false, flags.isMedicalSupport ?? false, flags.isPhysiotherapy ?? false]);
  return r[0].id;
}
/**
 * **idempotent**: توقيعُ معاينةٍ لقسمٍ واحد قد يُزامِن (`syncPatientCases`)
 * حالةَ القسم الآخر تلقائياً إن كان علمُه مرفوعاً على المريض — فمريضٌ
 * بعلمَي «أطراف» و«مساند» معاً قد يجد حالةَ المساند موجودةً بالفعل قبل أن
 * يطلبها هذا الاختبارُ صراحةً.
 */
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const existing = await q<{ id: number }>(
    `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type=$2`, [patientId, caseType]);
  if (existing[0]) return existing[0].id;
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}

/** يوقّع معاينةً **عبر نقطتها الحقيقية** — فالحلقةُ والمتابعةُ تُبنيان كما تُبنيان إنتاجاً. */
async function signExam(patientId: number, session: any, caseType: "prosthetic" | "medical_support") {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType, diagnosis: "بتر تحت الركبة", prescription: {},
  });
}

/**
 * **الدورةُ الكاملة**: فتحُ حلقةٍ على مسار المعاينة ⟵ توقيعٌ ⟵ «لم يشترِ».
 * تُعيد هويّةَ الحلقة والمتابعة القديمة — الحالةُ الابتدائية لكلّ سيناريو.
 */
async function declinedDevice(patientId: number, caseType: "prosthetic" | "medical_support") {
  //  الخيطُ شرطُ وجودٍ لفتح جهاز — لا يُفتَح على اختصاصٍ لم يُصنَّف بعد.
  await mkCase(patientId, 1, caseType);
  const ep = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv, {
    serviceType: caseType, servicePath: "exam",
  });
  if (ep.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${ep.status} ${JSON.stringify(ep.body)}`);
  const episodeId = Number(ep.body.id);

  const exam = await signExam(patientId, S.doc, caseType);
  if (exam.status >= 300) throw new Error(`فشل التوقيع: ${exam.status} ${JSON.stringify(exam.body)}`);

  const fRows = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE device_episode_id = $1 ORDER BY id DESC LIMIT 1`,
    [episodeId]);
  const followupId = fRows[0].id;

  const close = await http("POST", `/api/followups/${followupId}/not-bought`, S.recv, {
    reason: "السعر غالٍ على المريض حالياً",
  });
  if (close.status >= 300) throw new Error(`فشل «لم يشترِ»: ${close.status} ${JSON.stringify(close.body)}`);

  return { episodeId, followupId, examId: Number(exam.body.id) };
}

async function eligibleRows(patientId: number, session: any = S.recv) {
  const r = await http("GET", `/api/followups/patient/${patientId}/return-to-purchase-eligible`, session);
  return { status: r.status, rows: Array.isArray(r.body?.rows) ? r.body.rows : [] };
}

async function episodeStatus(episodeId: number): Promise<string> {
  const r = await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [episodeId]);
  return r[0]?.status ?? "";
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
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
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `rtp_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw
      ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) }
      : {};
    next();
  });
  //  `registerRoutes` تسجّل جلسةَ express-session الحقيقية — تُتخطّى هنا
  //  فلا تتصادم مع الجلسة المزيَّفة أعلاه.
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((resolve) => httpServer.once("listening", resolve));

  try {
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. غيابُ الخيار — بلا تاريخٍ مؤهَّل ──");
    // ══════════════════════════════════════════════════════════════════
    {
      // ١) مريضٌ بلا أيّ حالة ولا معاينة إطلاقاً.
      const pNone = await mkPatient("بلا-تاريخ", { isAmputee: true });
      const { status: s1, rows: r1 } = await eligibleRows(pNone);
      check(s1 === 200, "١. النقطةُ تردّ ٢٠٠ لمريضٍ بلا تاريخ", String(s1));
      same("٢. **ولا صفوفَ مؤهَّلة**", r1.length, 0);

      // ٢) معاينةٌ موقّعة لكن **بلا قرار بعد** — لا تظهر أهليّةً.
      const pActive = await mkPatient("قرار-معلّق", { isAmputee: true });
      await mkCase(pActive, 1, "prosthetic");
      await http("POST", `/api/patients/${pActive}/device-episodes`, S.recv,
        { serviceType: "prosthetic", servicePath: "exam" });
      await signExam(pActive, S.doc, "prosthetic");
      const { rows: r2 } = await eligibleRows(pActive);
      same("٣. **ومعاينةٌ بلا قرار «لم يشترِ» لا تظهر أهليّةً**", r2.length, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. المسارُ الكامل — حلقةٌ واحدة مؤهَّلة ──");
    // ══════════════════════════════════════════════════════════════════
    let pMain: number, deviceMain: { episodeId: number; followupId: number; examId: number };
    let reviewRequestId: number;
    {
      pMain = await mkPatient("المسار-الكامل", { isAmputee: true });
      deviceMain = await declinedDevice(pMain, "prosthetic");

      const before = await q<{ n: string }>(
        `SELECT (SELECT count(*)::int FROM patients WHERE id=$1) AS n`, [pMain]);
      same("٤. مريضٌ واحد قبل العملية", Number(before[0].n), 1);

      const { status: eStatus, rows } = await eligibleRows(pMain);
      check(eStatus === 200, "٥. النقطةُ تردّ ٢٠٠");
      same("٦. **حلقةٌ واحدة مؤهَّلة بالضبط**", rows.length, 1);
      check(rows[0]?.episodeId === deviceMain.episodeId,
        "٧. **وهي الحلقةُ نفسُها** — بمعرّفها بعينه", JSON.stringify(rows[0]));
      same("٨. سببُ عدم الشراء محفوظٌ كما كُتب",
        rows[0]?.notBoughtReasonText, "السعر غالٍ على المريض حالياً");

      const casesBefore = await q<{ n: string }>(
        `SELECT count(*)::int n FROM patient_cases WHERE patient_id=$1`, [pMain]);
      const episodesBefore = await q<{ n: string }>(
        `SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pMain]);

      const exec = await http("POST", "/api/followups/return-to-purchase", S.recv, {
        patientId: pMain, deviceEpisodeId: deviceMain.episodeId,
      });
      check(exec.status === 201, "٩. التنفيذُ ينجح", JSON.stringify(exec.body));
      reviewRequestId = Number(exec.body?.reviewRequestId);
      check(Number.isFinite(reviewRequestId) && reviewRequestId > 0, "١٠. ويعيد معرّفَ طلب المراجعة");

      const patientsAfter = await q<{ n: string }>(`SELECT count(*)::int n FROM patients WHERE id=$1`, [pMain]);
      same("١١. **لا مريضَ جديداً**", Number(patientsAfter[0].n), 1);
      const casesAfter = await q<{ n: string }>(
        `SELECT count(*)::int n FROM patient_cases WHERE patient_id=$1`, [pMain]);
      same("١٢. **ولا حالةً جديدة**", Number(casesAfter[0].n), Number(casesBefore[0].n));
      const episodesAfter = await q<{ n: string }>(
        `SELECT count(*)::int n FROM patient_device_episodes WHERE patient_id=$1`, [pMain]);
      same("١٣. **ولا حلقةَ جديدة** — نفسُ العدد بالضبط",
        Number(episodesAfter[0].n), Number(episodesBefore[0].n));

      same("١٤. **الحلقةُ نفسُها عادت `awaiting_exam`**",
        await episodeStatus(deviceMain.episodeId), "awaiting_exam");

      const mrr = await q<{
        review_kind: string; requested_path: string; status: string;
        device_episode_id: number; patient_id: number; service_type: string;
      }>(`SELECT review_kind, requested_path, status, device_episode_id, patient_id, service_type
            FROM medical_review_requests WHERE id=$1`, [reviewRequestId]);
      same("١٥. **الطلبُ `full`**", mrr[0]?.requested_path, "full");
      same("١٦. **وبسببِ `return_to_purchase` بالضبط**", mrr[0]?.review_kind, "return_to_purchase");
      same("١٧. حالتُه `pending`", mrr[0]?.status, "pending");
      same("١٨. **مرساتُه الحلقةُ نفسُها**", Number(mrr[0]?.device_episode_id), deviceMain.episodeId);
      same("١٩. لهذا المريض بعينه", Number(mrr[0]?.patient_id), pMain);
      same("٢٠. بخدمة الأطراف", mrr[0]?.service_type, "prosthetic");

      //  والمتابعةُ القديمة لم تُمَسّ حرفاً — لا تزال «لم يشترِ» بسببها.
      const oldF = await q<{ status: string; not_bought_reason_text: string | null }>(
        `SELECT status, not_bought_reason_text FROM post_exam_followups WHERE id=$1`, [deviceMain.followupId]);
      same("٢١. **المتابعةُ القديمة لا تزال `closed_without_purchase`**",
        oldF[0]?.status, "closed_without_purchase");
      same("٢٢. وسببُها القديم محفوظٌ كما هو",
        oldF[0]?.not_bought_reason_text, "السعر غالٍ على المريض حالياً");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. تعدّدُ المؤهَّلين — اختيارٌ دقيق لا تخمين ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  قسمان مختلفان لنفس المريض — كلٌّ منهما يؤهَّل باستقلال، وهو الشكلُ
      //  الوحيد الذي يعيد فيه النظامُ أكثرَ من مؤهَّلٍ لمريضٍ واحد (حلقتان
      //  في القسم نفسه غيرُ ممكنتين معاً — `uq_pde_case_open`).
      const pMulti = await mkPatient("تعدّد-مؤهَّلين", { isAmputee: true, isMedicalSupport: true });
      const pros = await declinedDevice(pMulti, "prosthetic");
      const supp = await declinedDevice(pMulti, "medical_support");

      const { rows } = await eligibleRows(pMulti);
      same("٢٣. **مؤهَّلان بالضبط**", rows.length, 2);
      const ids = rows.map((r: any) => r.episodeId).sort((a: number, b: number) => a - b);
      same("٢٤. وهما الحلقتان بعينهما",
        ids, [pros.episodeId, supp.episodeId].sort((a, b) => a - b));

      //  التنفيذُ يطلب معرّفاً صريحاً دائماً — فتنفيذٌ على الأطراف لا يمسّ
      //  المساند، ولا تخمينَ للأحدث.
      const exec = await http("POST", "/api/followups/return-to-purchase", S.recv, {
        patientId: pMulti, deviceEpisodeId: pros.episodeId,
      });
      check(exec.status === 201, "٢٥. التنفيذُ على حلقة الأطراف تحديداً ينجح", JSON.stringify(exec.body));
      same("٢٦. **حلقةُ الأطراف عادت `awaiting_exam`**",
        await episodeStatus(pros.episodeId), "awaiting_exam");
      same("٢٧. **وحلقةُ المساند لم تُمَسّ — تبقى `examined`**",
        await episodeStatus(supp.episodeId), "examined");
      const supF = await q<{ status: string }>(
        `SELECT status FROM post_exam_followups WHERE id=$1`, [supp.followupId]);
      same("٢٨. ومتابعتُها لا تزال `closed_without_purchase` بلا مساس",
        supF[0]?.status, "closed_without_purchase");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. قائمةُ عمل الطبيب — «عاد للشراء» ظاهرة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const wl = await http("GET", "/api/medical/worklist", S.doc);
      check(wl.status === 200, "٢٩. النقطةُ تردّ ٢٠٠");
      const row = (wl.body?.rows ?? []).find(
        (r: any) => Number(r.patientId) === pMain && r.caseType === "prosthetic");
      check(!!row, "٣٠. **المريضُ يظهر في قائمة عمل الطبيب**", JSON.stringify(wl.body?.rows));
      same("٣١. **وسببُ الزيارة `return_to_purchase` صراحةً**", row?.reviewKind, "return_to_purchase");
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. الضغطةُ المزدوجة لا تُضاعِف الطلب ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pDbl = await mkPatient("ضغطة-مزدوجة", { isAmputee: true });
      const dev = await declinedDevice(pDbl, "prosthetic");
      const [r1, r2] = await Promise.all([
        http("POST", "/api/followups/return-to-purchase", S.recv,
          { patientId: pDbl, deviceEpisodeId: dev.episodeId }),
        http("POST", "/api/followups/return-to-purchase", S.recv,
          { patientId: pDbl, deviceEpisodeId: dev.episodeId }),
      ]);
      const succeeded = [r1.status, r2.status].filter((s) => s === 201).length;
      same("٣٢. **نجاحٌ واحدٌ بالضبط من الضغطتين المتزامنتين** — لا نجاحان معاً",
        succeeded, 1);
      //  **بسببِ `return_to_purchase` تحديداً** — فتحُ الحلقة نفسُه يزرع
      //  طلبَ `new_device` مستقلّاً (`routeServiceToDoctorReview`، أغلقه
      //  توقيعُ المعاينة إلى `examined`)، وهو مشروعٌ ولا صلةَ له بهذا العدّ.
      const mrrCount = await q<{ n: string }>(
        `SELECT count(*)::int n FROM medical_review_requests
          WHERE device_episode_id=$1 AND review_kind='return_to_purchase'`, [dev.episodeId]);
      same("٣٣. **وطلبُ «عاد للشراء» واحدٌ بالضبط**", Number(mrrCount[0].n), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. المعاينةُ الثانية — متابعةٌ جديدة، والقديمةُ سليمة ──");
    // ══════════════════════════════════════════════════════════════════
    let secondFollowupId: number;
    {
      const exam2 = await signExam(pMain, S.doc, "prosthetic");
      check(exam2.status < 300, "٣٤. المعاينةُ الثانية تُوقَّع بنجاح", JSON.stringify(exam2.body));
      same("٣٥. **وتستعمل الحلقةَ نفسَها** — `deviceEpisodeId` نفسُه",
        Number(exam2.body?.deviceEpisodeId), deviceMain!.episodeId);
      same("٣٦. **والحلقةُ عادت `examined`**",
        await episodeStatus(deviceMain!.episodeId), "examined");

      const mrrAfter = await q<{ status: string; exam_id: number | null }>(
        `SELECT status, exam_id FROM medical_review_requests WHERE id=$1`, [reviewRequestId!]);
      same("٣٧. **طلبُ «عاد للشراء» أُغلق `examined`**", mrrAfter[0]?.status, "examined");
      same("٣٨. ومربوطٌ بالمعاينة الجديدة بعينها", Number(mrrAfter[0]?.exam_id), Number(exam2.body?.id));

      const list = await http("GET", `/api/followups/patient/${pMain}`, S.admin);
      const rows: any[] = Array.isArray(list.body) ? list.body : [];
      same("٣٩. **متابعتان بالضبط على هذا المريض**", rows.length, 2);
      const fresh = rows.find((f) => f.status === "awaiting_patient_decision");
      const old = rows.find((f) => f.id === deviceMain!.followupId);
      check(!!fresh, "٤٠. **متابعةٌ جديدة نشطة**", JSON.stringify(rows));
      same("٤١. بحالة `awaiting_patient_decision` بالضبط", fresh?.status, "awaiting_patient_decision");
      same("٤٢. وعلى الحلقة نفسِها", Number(fresh?.deviceEpisodeId), deviceMain!.episodeId);
      check(!!old, "٤٣. **والمتابعةُ القديمة لا تزال موجودة**");
      same("٤٤. **بحالتها القديمة كما هي** — `closed_without_purchase`",
        old?.status, "closed_without_purchase");
      same("٤٥. وسببُها القديم لم يُمحَ", old?.notBoughtReasonText, "السعر غالٍ على المريض حالياً");
      secondFollowupId = Number(fresh.id);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. بلا أثرٍ ماليّ إطلاقاً قبل إتمام البيع ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pay = await q<{ n: string }>(`SELECT count(*)::int n FROM payments WHERE patient_id=$1`, [pMain!]);
      same("٤٦. **لا دفعةَ واحدة**", Number(pay[0].n), 0);
      const cost = await q<{ n: string }>(
        `SELECT count(*)::int n FROM cost_entries WHERE patient_id=$1`, [pMain!]);
      same("٤٧. **ولا قيدَ كلفةٍ واحد**", Number(cost[0].n), 0);
      const wo = await q<{ n: string }>(
        `SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [pMain!]);
      same("٤٨. **ولا أمرَ تصنيعٍ واحد**", Number(wo[0].n), 0);
      const tc = await q<{ total_cost: number }>(`SELECT total_cost FROM patients WHERE id=$1`, [pMain!]);
      same("٤٩. **ومجموعُ المريض ما زال صفراً**", Number(tc[0]?.total_cost), 0);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. البابُ العام «إعادة الفتح» يُردّ على هذا المسار ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pReopen = await mkPatient("إعادة-فتح-مسدودة", { isAmputee: true });
      const dev = await declinedDevice(pReopen, "prosthetic");
      const reopenAttempt = await http("POST", `/api/followups/${dev.followupId}/reopen`, S.recv, {});
      same("٥٠. **إعادةُ الفتح المباشرة تُردّ ٤٠٩**", reopenAttempt.status, 409);
      same("٥١. **والحلقةُ لم تتحرّك** — تبقى `examined`",
        await episodeStatus(dev.episodeId), "examined");
      const fRow = await q<{ status: string }>(
        `SELECT status FROM post_exam_followups WHERE id=$1`, [dev.followupId]);
      same("٥٢. **والمتابعةُ لم تُفتح** — تبقى `closed_without_purchase`",
        fRow[0]?.status, "closed_without_purchase");

      //  **والصفُّ الموروث (بلا حلقة) يبقى على `reopen` كما كان بحرفه** —
      //  هذا الحارسُ خاصٌّ بمسار المعاينة وحده.
      const pLegacy = await mkPatient("متابعة-موروثة", { isAmputee: true });
      const caseIdLegacy = await mkCase(pLegacy, 1, "prosthetic");
      const [legacyF] = await q<{ id: number }>(
        `INSERT INTO post_exam_followups
           (patient_id, case_id, device_episode_id, branch_id, service_type, status,
            approved_price, price_source, closed_reason, closed_at, created_by)
         VALUES ($1,$2,NULL,1,'prosthetic','closed_without_purchase',
                 0,'exam','other',NOW(),$3)
         RETURNING id`, [pLegacy, caseIdLegacy, RECV]);
      const legacyReopen = await http("POST", `/api/followups/${legacyF.id}/reopen`, S.recv, {});
      check(legacyReopen.status < 300,
        "٥٣. **والمتابعةُ الموروثة (بلا حلقة) تُعاد فتحها كما كانت دائماً**",
        JSON.stringify(legacyReopen.body));
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. إتمامُ البيع القائم يعمل بعد ذلك كالمعتاد ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const sale = await http("POST", `/api/followups/${secondFollowupId!}/complete-sale`, S.recv, {
        originalPrice: 1_200_000, discountAmount: 0, expertUserId: EXPERT,
      });
      check(sale.status === 200, "٥٤. **إتمامُ البيع الحقيقيّ ينجح بعد «عاد للشراء»**",
        JSON.stringify(sale.body));
      same("٥٥. **الحلقةُ دخلت التصنيع**",
        await episodeStatus(deviceMain!.episodeId), "in_manufacturing");
      const woAfter = await q<{ n: string }>(
        `SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [pMain!]);
      same("٥٦. وأمرُ تصنيعٍ واحدٌ فُتح", Number(woAfter[0].n), 1);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. العلاجُ الطبيعي بمعزلٍ تامّ ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pPhysio = await mkPatient("علاج-طبيعي-معزول", { isPhysiotherapy: true });
      const { status, rows } = await eligibleRows(pPhysio);
      check(status === 200, "٥٧. النقطةُ تردّ ٢٠٠ لمريض علاجٍ طبيعي");
      same("٥٨. **وصفرُ صفوفٍ مؤهَّلة** — لا حلقاتِ أجهزةٍ للعلاج الطبيعي إطلاقاً",
        rows.length, 0);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. حدودُ الفرع مفروضة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pBranch = await mkPatient("حدود-الفرع", { isAmputee: true }, 1);
      const dev = await declinedDevice(pBranch, "prosthetic");

      const { status: sB2, rows: rowsB2 } = await eligibleRows(pBranch, S.recvB2);
      check(sB2 === 200, "٥٩. النقطةُ تردّ ٢٠٠ (لا خطأً) لاستقبال فرعٍ آخر");
      same("٦٠. **وقائمةٌ فارغة** — لا تُعرَض حلقةُ فرعٍ آخر", rowsB2.length, 0);

      const execB2 = await http("POST", "/api/followups/return-to-purchase", S.recvB2, {
        patientId: pBranch, deviceEpisodeId: dev.episodeId,
      });
      same("٦١. **والتنفيذُ من فرعٍ آخر يُردّ ٤٠٣**", execB2.status, 403);
      same("٦٢. **ولا شيءَ تحرّك** — تبقى الحلقةُ `examined`",
        await episodeStatus(dev.episodeId), "examined");

      //  ونفسُ الاستقبال ضمن فرعه الصحيح ينجح بلا عائق.
      const execOk = await http("POST", "/api/followups/return-to-purchase", S.recv, {
        patientId: pBranch, deviceEpisodeId: dev.episodeId,
      });
      check(execOk.status === 201, "٦٣. **واستقبالُ الفرع الصحيح ينجح بلا عائق**",
        JSON.stringify(execOk.body));
    }

    console.log(
      "\nملاحظة: آليّةُ إتمام البيع نفسِها (المالكية، اشتقاقُ السعر، التزامن…) "
      + "مُختبَرةٌ بتفصيلٍ في server/reception_sale.test.ts؛ توقيعُ المعاينة ومتابعةُ ما بعدها "
      + "في server/post_exam_followup.test.ts وserver/medical_review.test.ts — هذا الملفُّ يثبت "
      + "أنّ «عاد للشراء» يربط الثلاثةَ بصدقٍ وذرّيةٍ فقط.");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص «عاد للشراء» نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
