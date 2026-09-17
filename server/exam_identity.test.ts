// هويّةُ الجهاز في توقيع المعاينة — حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:exam-identity`.
//
// ══ الواقعة (تدقيق ٢٠٢٦-٠٩-١٢: INT-02 / RTP-2 / MULTI-1 / MULTI-3 / RTP-3 / RTP-1) ══
// بعد ترحيل ٠٧٣ صار للخيط الواحد أكثرُ من طلبِ جهازٍ منتظرٍ قانونياً. وكانت
// المعاينةُ تُربَط بـ`LIMIT 1` بلا ترتيب — بأيّ حلقةٍ صادفها ترتيبُ الصفوف —
// ثمّ تُغلق **كلَّ** طلبات (مريض، اختصاص) بمعاينةٍ فحصت جهازاً واحداً؛ وقائمةُ
// «معايناتي» كانت تكرّر المريضَ بلا هويّة حلقة وتضع أقدمَ طلبٍ على كلّ صفّ؛
// و«عاد للشراء» كان يظهر بتاريخ فتح الطلب القديم فيُدفَن آخرَ الصفحات.
//
// ══ الثابتُ الذي يحرسه هذا الملفّ ══════════════════════════════════════
//   صفُّ عملٍ ⟶ طلبُ مراجعةٍ بعينه ⟶ حلقةٌ بعينها ⟶ النافذة ⟶ POST ⟶ قفلُ
//   الحلقة بعينها ⟶ معاينةٌ مختومة عليها ⟶ إغلاقُ طلبها هي ⟶ متابعتُها هي.
//   ولا اختيارَ بين حلقتين بـLIMIT/first/أحدث/ترتيبٍ فيزيائيّ/(مريض+خدمة).

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

const PORT = 6947;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-هوية-الجهاز";
const ADMIN = 99470, RECV = 99471, DOC = 99472, DOC2 = 99473, EXPERT = 99474, RECV_B2 = 99475, DOC_B2 = 99476;
type Svc = "prosthetic" | "medical_support";

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
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

async function mkPatient(label: string, svc: Svc, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة', $5, $3,$4,$6,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, svc === "prosthetic", svc === "medical_support" ? "مسند ركبة" : null,
      svc === "medical_support"]);
  return r[0].id;
}
async function mkCase(patientId: number, caseType: string, branchId = 1) {
  const existing = await q<{ id: number }>(
    `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type=$2`, [patientId, caseType]);
  if (existing[0]) return existing[0].id;
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
/** يفتح طلبَ جهازٍ على مسار المعاينة **عبر نقطته الحقيقية** ويعيد الحلقةَ وطلبَ مراجعتها. */
async function openEpisode(patientId: number, svc: Svc, requestedItem?: string, session: any = S.recv) {
  const r = await http("POST", `/api/patients/${patientId}/device-episodes`, session, {
    serviceType: svc, servicePath: "exam", ...(requestedItem ? { requestedItem } : {}),
  });
  if (r.status >= 300) throw new Error(`فشل فتحُ الحلقة: ${r.status} ${JSON.stringify(r.body)}`);
  const episodeId = Number(r.body.id);
  const req = await q<{ id: number }>(
    `SELECT id FROM medical_review_requests WHERE device_episode_id=$1 AND status='pending'`, [episodeId]);
  return { episodeId, requestId: req[0]?.id ?? null };
}
async function signExam(patientId: number, session: any, svc: string,
  extra: Record<string, unknown> = {}) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    idempotencyKey: crypto.randomUUID(),
    caseType: svc, diagnosis: `معاينة ${svc}`, prescription: {},
    ...extra,
  });
}
async function worklist(session: any = S.doc) {
  const r = await http("GET", "/api/medical/worklist", session);
  return { status: r.status, rows: (Array.isArray(r.body?.rows) ? r.body.rows : []) as any[] };
}
async function rowsOf(patientId: number, session: any = S.doc) {
  return (await worklist(session)).rows.filter((r) => r.patientId === patientId);
}
async function worklistCount(session: any = S.doc) {
  const r = await http("GET", "/api/medical/worklist/count", session);
  return Number(r.body?.count ?? -1);
}
async function episodeStatus(id: number) {
  return (await q<{ status: string }>(`SELECT status FROM patient_device_episodes WHERE id=$1`, [id]))[0]?.status;
}
async function requestRow(id: number) {
  return (await q(`SELECT id, status, exam_id, device_episode_id, review_kind, created_at FROM medical_review_requests WHERE id=$1`, [id]))[0];
}
async function examEpisodeOf(episodeId: number) {
  const r = await q<{ n: number }>(
    `SELECT count(*)::int n FROM medical_exams WHERE device_episode_id=$1`, [episodeId]);
  return r[0]?.n ?? 0;
}
async function episodeRow(id: number) {
  const r = await q<{ j: any }>(`SELECT row_to_json(e) j FROM patient_device_episodes e WHERE id=$1`, [id]);
  return r[0]?.j ?? null;
}
async function caseTypesOf(patientId: number) {
  return (await q<{ t: string }>(
    `SELECT case_type t FROM patient_cases WHERE patient_id=$1 ORDER BY case_type`, [patientId]))
    .map((c) => c.t);
}
async function deviceFlagsOf(patientId: number) {
  return (await q<{ a: boolean; s: boolean; site: string | null; sup: string | null }>(
    `SELECT is_amputee a, is_medical_support s, amputation_site site, support_type sup
       FROM patients WHERE id=$1`, [patientId]))[0];
}
/** خريطةُ «بانتظار معاينة» كما يقرؤها سجلُّ المرضى وصفحةُ المريض. */
async function pendingSpecialtiesOf(patientId: number, session: any = S.doc) {
  const r = await http("GET", "/api/medical/pending", session);
  const map = (r.body?.pending ?? {}) as Record<string, string[]>;
  return (map[String(patientId)] ?? []).slice().sort();
}
async function episodeCaseType(id: number) {
  const r = await q<{ t: string }>(
    `SELECT c.case_type t FROM patient_device_episodes e
       JOIN patient_cases c ON c.id = e.case_id WHERE e.id=$1`, [id]);
  return r[0]?.t ?? null;
}
async function examEpisode(examId: number) {
  return (await q<{ e: number | null }>(`SELECT device_episode_id AS e FROM medical_exams WHERE id=$1`, [examId]))[0]?.e ?? null;
}
async function followupsOfEpisode(episodeId: number) {
  return await q(`SELECT id, status FROM post_exam_followups WHERE device_episode_id=$1 ORDER BY id`, [episodeId]);
}
async function patientSnapshot(patientId: number) {
  const p = await q(`SELECT row_to_json(p) j FROM patients p WHERE id=$1`, [patientId]);
  const e = await q(`SELECT id, status, awaiting_since FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const r = await q(`SELECT id, status, exam_id FROM medical_review_requests WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const x = await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id=$1`, [patientId]);
  const f = await q(`SELECT count(*)::int n FROM post_exam_followups WHERE patient_id=$1`, [patientId]);
  return JSON.stringify({ p: p[0].j, e, r, x: x[0].n, f: f[0].n });
}
/** الدورةُ الكاملة: فتحٌ ⟵ توقيعٌ ⟵ «لم يشترِ». */
async function declinedDevice(patientId: number, svc: Svc) {
  const { episodeId, requestId } = await openEpisode(patientId, svc);
  const exam = await signExam(patientId, S.doc, svc, { deviceEpisodeId: episodeId });
  if (exam.status >= 300) throw new Error(`فشل التوقيع: ${exam.status} ${JSON.stringify(exam.body)}`);
  const f = await q<{ id: number }>(
    `SELECT id FROM post_exam_followups WHERE device_episode_id=$1 ORDER BY id DESC LIMIT 1`, [episodeId]);
  const close = await http("POST", `/api/followups/${f[0].id}/not-bought`, S.recv, { reason: "غالٍ" });
  if (close.status >= 300) throw new Error(`فشل «لم يشترِ»: ${close.status} ${JSON.stringify(close.body)}`);
  return { episodeId, requestId, examId: Number(exam.body.id), followupId: f[0].id };
}
async function rtp(patientId: number, episodeId: number) {
  const r = await http("POST", "/api/followups/return-to-purchase", S.recv, {
    patientId, deviceEpisodeId: episodeId,
  });
  if (r.status !== 201) throw new Error(`فشل «عاد للشراء»: ${r.status} ${JSON.stringify(r.body)}`);
  return Number(r.body.reviewRequestId);
}
async function backdate(episodeId: number, days: number) {
  await q(`UPDATE patient_device_episodes
              SET created_at = NOW() - ($2 || ' days')::interval,
                  awaiting_since = NOW() - ($2 || ' days')::interval
            WHERE id=$1`, [episodeId, String(days)]);
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
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
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

/**
 * مستخدمو هذا الملفّ يُعطَّلون بعد الانتهاء — لا يُحذَفون (صفوفُ التدقيق تشير
 * إليهم)، لكنّ خبيراً فعّالاً باقياً في الفرع ١ كان يظهر في قوائم خبراء
 * الحزم الأخرى التي تشارك القاعدةَ نفسَها (`test:reception-sale`).
 */
async function deactivateTestUsers() {
  await q(`UPDATE system_users SET is_active = false WHERE id = ANY($1::int[])`,
    [[ADMIN, RECV, DOC, DOC2, EXPERT, RECV_B2, DOC_B2]]);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [DOC2, "doctor", "د. الزميل", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]"],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic","medical_support"]'],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `exid_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
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
    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      const part = svc === "prosthetic" ? "socket" : undefined; // المساندُ بلا أجزاء
      console.log(`\n════════ ${svc} ════════`);

      // ══ أ. حلقةٌ واحدة — الصفُّ يحمل هويّتَه والتوقيعُ يصل إليها ═══════════
      console.log("\n── أ. حلقةٌ واحدة ──");
      {
        const p = await mkPatient(`أ-${svc}`, svc);
        await mkCase(p, svc);
        const { episodeId, requestId } = await openEpisode(p, svc);
        const rows = await rowsOf(p);
        same("١. صفٌّ واحد في قائمة الطبيب", rows.length, 1);
        same("٢. **ويحمل معرّفَ الحلقة بعينها**", rows[0]?.episodeId, episodeId);
        same("   وترتيبَ الجهاز ومطلوبَه", [rows[0]?.sequenceNumber, rows[0]?.requestedItem], [1, "full_device"]);
        same("٣. **وطلبَ مراجعته هو**", rows[0]?.returnableRequestId, requestId);
        check(typeof rows[0]?.waitingSince === "string"
          && Date.now() - new Date(rows[0].waitingSince).getTime() < 60_000,
          "٤. وينتظر منذ الآن (awaiting_since)", String(rows[0]?.waitingSince));

        const ex = await signExam(p, S.doc, svc, { deviceEpisodeId: episodeId });
        check(ex.status === 200 || ex.status === 201, "٥. التوقيعُ بالمعرّف ينجح", JSON.stringify(ex.body));
        same("٦. **المعاينةُ مختومةٌ على الحلقة بعينها**", await examEpisode(Number(ex.body.id)), episodeId);
        same("٧. والحلقةُ صارت examined", await episodeStatus(episodeId), "examined");
        const rr = await requestRow(requestId);
        same("٨. وطلبُها أُغلق بهذه المعاينة", [rr.status, Number(rr.exam_id)], ["examined", Number(ex.body.id)]);
        same("٩. والمتابعةُ على الحلقة نفسِها", (await followupsOfEpisode(episodeId)).length, 1);
        same("١٠. وخرج من القائمة", (await rowsOf(p)).length, 0);
      }

      // ══ ب. حلقتان متوازيتان — صفّان بهويّتين، وتوقيعُ B لا يمسّ A ═════════
      console.log("\n── ب. حلقتان متوازيتان ──");
      {
        const p = await mkPatient(`ب-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const B = await openEpisode(p, svc, part);
        const before = await worklistCount();
        const rows = await rowsOf(p);
        same("١١. صفّان لمريضٍ بجهازين", rows.length, 2);
        same("١٢. **بمعرّفَي الحلقتين — لا تكرارٌ بلا هويّة**",
          rows.map((r) => r.episodeId).sort((a, b) => a - b), [A.episodeId, B.episodeId].sort((a, b) => a - b));
        const rowA = rows.find((r) => r.episodeId === A.episodeId);
        const rowB = rows.find((r) => r.episodeId === B.episodeId);
        same("١٣. **وكلُّ صفٍّ يحمل طلبَ مراجعته هو** لا أقدمَ طلبٍ على الخيط",
          [rowA?.returnableRequestId, rowB?.returnableRequestId], [A.requestId, B.requestId]);
        same("١٤. والعدّادُ يعدّ الجهازين", before, (await worklistCount()));

        // نفحص «معايناتي»؟ لا — نوقّع B بعينها.
        const exB = await signExam(p, S.doc, svc, { deviceEpisodeId: B.episodeId });
        check(exB.status === 200 || exB.status === 201, "١٥. توقيعُ B ينجح", JSON.stringify(exB.body));
        same("١٦. **مختومةٌ على B**", await examEpisode(Number(exB.body.id)), B.episodeId);
        same("١٧. **وA بقيت awaiting_exam**", await episodeStatus(A.episodeId), "awaiting_exam");
        const ra = await requestRow(A.requestId);
        same("١٨. **وطلبُ A لم يُغلَق بمعاينة B**", [ra.status, ra.exam_id], ["pending", null]);
        const rb = await requestRow(B.requestId);
        same("١٩. وطلبُ B أُغلق بمعاينة B", [rb.status, Number(rb.exam_id)], ["examined", Number(exB.body.id)]);
        same("٢٠. ومتابعةُ B على B، ولا متابعةَ على A",
          [(await followupsOfEpisode(B.episodeId)).length, (await followupsOfEpisode(A.episodeId)).length], [1, 0]);
        const after = await rowsOf(p);
        same("٢١. وبقي صفُّ A وحده بطلبه هو", [after.length, after[0]?.episodeId, after[0]?.returnableRequestId],
          [1, A.episodeId, A.requestId]);

        //  حارسُ الإرجاع بالحلقة: معاينةُ B لا تحبس إرجاعَ طلب A، وتحبس إرجاعَ B.
        const retB = await http("POST", `/api/medical-review/requests/${B.requestId}/return`, S.doc, { reason: "خطأ" });
        same("٢٢. إرجاعُ طلب B بعد توقيعه ⟵ ٤٠٠/٤٠٩ (أُنجز)", retB.status >= 400, true);
        const retA = await http("POST", `/api/medical-review/requests/${A.requestId}/return`, S.doc, { reason: "بيانٌ خاطئ" });
        same("٢٣. **وإرجاعُ طلب A ممكنٌ — معاينةُ B ليست معاينتَه**", retA.status, 200);
        same("   والطلبُ صار returned", (await requestRow(A.requestId)).status, "returned");
        //  ثمّ يُوقَّع A بعينه — والطلبُ المُرجَع لا يُقلَب examined.
        const exA = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        check(exA.status === 200 || exA.status === 201, "٢٤. توقيعُ A بعد الإرجاع ينجح", JSON.stringify(exA.body));
        same("٢٥. مختومةٌ على A", await examEpisode(Number(exA.body.id)), A.episodeId);
        same("٢٦. والطلبُ المُرجَع يبقى returned", (await requestRow(A.requestId)).status, "returned");
      }

      // ══ ج. بلا معرّف + حلقتان ⟵ ٤٠٩ التباسٌ وصفرُ كتابة ══════════════════
      console.log("\n── ج. الالتباسُ يُردّ بصفر كتابة ──");
      {
        const p = await mkPatient(`ج-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const B = await openEpisode(p, svc, part);
        const snap = await patientSnapshot(p);
        const ex = await signExam(p, S.doc, svc, { prescription: { supportType: "مسند جديد", amputationType: "احادي" } });
        same("٢٧. **بلا معرّفٍ وحلقتان ⟵ ٤٠٩**", [ex.status, ex.body?.code], [409, "device_episode_ambiguous"]);
        same("٢٨. **مع المرشَّحين بمعرّفيهما**",
          (ex.body?.candidates ?? []).map((c: any) => c.id).sort((a: number, b: number) => a - b),
          [A.episodeId, B.episodeId].sort((a, b) => a - b));
        same("٢٩. **وصفرُ كتابة**: لا معاينةَ ولا متابعةَ ولا تغيّرَ في الملفّ أو الحلقات أو الطلبات",
          await patientSnapshot(p), snap);
        const bad = await signExam(p, S.doc, svc, { deviceEpisodeId: "abc" });
        same("٣٠. ومعرّفٌ مشوَّه ⟵ ٤٠٠ لا تخمين", [bad.status, bad.body?.code], [400, "device_episode_invalid"]);
        const other = await mkPatient(`ج٢-${svc}`, svc);
        await mkCase(other, svc);
        const foreign = await signExam(other, S.doc, svc, { deviceEpisodeId: A.episodeId });
        same("٣١. ومعرّفُ حلقةِ مريضٍ آخر ⟵ ٤٠٩ بائت", [foreign.status, foreign.body?.code], [409, "device_episode_stale"]);
        same("   ولا معاينةَ كُتبت للمريضين", Number((await q(`SELECT count(*)::int n FROM medical_exams WHERE patient_id IN ($1,$2)`, [p, other]))[0].n), 0);
      }

      // ══ د. بلا معرّف + حلقةٌ واحدة ⟵ توافقٌ رجعيّ ════════════════════════
      console.log("\n── د. عميلٌ قديم بحلقةٍ واحدة ──");
      {
        const p = await mkPatient(`د-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const ex = await signExam(p, S.doc, svc);
        check(ex.status === 200 || ex.status === 201, "٣٢. بلا معرّفٍ وحلقةٌ واحدة ⟵ ينجح", JSON.stringify(ex.body));
        same("٣٣. ويُربَط بالوحيدة", await examEpisode(Number(ex.body.id)), A.episodeId);
        same("٣٤. وطلبُها أُغلق", (await requestRow(A.requestId)).status, "examined");
      }

      // ══ هـ. «عاد للشراء» A + B منتظرة — بالترتيبين ══════════════════════
      for (const bFirst of [true, false]) {
        console.log(`\n── هـ. عاد للشراء A + B منتظرة (${bFirst ? "B قبل العودة" : "B بعد العودة"}) ──`);
        const p = await mkPatient(`هـ-${svc}-${bFirst ? 1 : 2}`, svc);
        await mkCase(p, svc);
        const A = await declinedDevice(p, svc);
        await backdate(A.episodeId, 60);
        const createdBefore = (await q(`SELECT created_at FROM patient_device_episodes WHERE id=$1`, [A.episodeId]))[0].created_at;
        let B: { episodeId: number; requestId: number | null } | null = null;
        if (bFirst) B = await openEpisode(p, svc, part);
        const rtpReq = await rtp(p, A.episodeId);
        if (!bFirst) B = await openEpisode(p, svc, part);
        const rows = await rowsOf(p);
        same("٣٥. صفّان: العائدُ وB", rows.length, 2);
        const rowA = rows.find((r) => r.episodeId === A.episodeId);
        const rowB = rows.find((r) => r.episodeId === B!.episodeId);
        same("٣٦. **صفُّ العائد يحمل «عاد للشراء» وطلبَ عودته هو**",
          [rowA?.reviewKind, rowA?.returnableRequestId], ["return_to_purchase", rtpReq]);
        same("٣٧. **وصفُّ B يحمل طلبَه هو**", [rowB?.reviewKind, rowB?.returnableRequestId], ["new_device", B!.requestId]);
        check(Date.now() - new Date(rowA!.waitingSince).getTime() < 120_000,
          "٣٨. **والعائدُ ينتظر منذ العودة لا منذ ٦٠ يوماً**", String(rowA?.waitingSince));
        const createdAfter = (await q(`SELECT created_at FROM patient_device_episodes WHERE id=$1`, [A.episodeId]))[0].created_at;
        same("٣٩. **و`created_at` لم يُعَد كتابتُه**", String(createdAfter), String(createdBefore));

        const exA = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        check(exA.status === 200 || exA.status === 201, "٤٠. توقيعُ العائد ينجح", JSON.stringify(exA.body));
        same("٤١. **مختومةٌ على العائد**", await examEpisode(Number(exA.body.id)), A.episodeId);
        same("٤٢. وطلبُ العودة أُغلق بها", [(await requestRow(rtpReq)).status, Number((await requestRow(rtpReq)).exam_id)],
          ["examined", Number(exA.body.id)]);
        same("٤٣. **وطلبُ B لم يُمَسّ**", (await requestRow(B!.requestId!)).status, "pending");
        same("٤٤. وB ما زالت awaiting_exam", await episodeStatus(B!.episodeId), "awaiting_exam");
        same("٤٥. ومتابعةٌ جديدة على العائد والقديمةُ باقية",
          (await followupsOfEpisode(A.episodeId)).map((f: any) => f.status), ["closed_without_purchase", "awaiting_patient_decision"]);
      }

      // ══ و. «عاد للشراء» A + B معايَنة ═══════════════════════════════════
      console.log("\n── و. عاد للشراء A + B معايَنة ──");
      {
        const p = await mkPatient(`و-${svc}`, svc);
        await mkCase(p, svc);
        const A = await declinedDevice(p, svc);
        const B = await openEpisode(p, svc, part);
        const exB = await signExam(p, S.doc, svc, { deviceEpisodeId: B.episodeId });
        check(exB.status < 300, "٤٦. B تُعايَن", JSON.stringify(exB.body));
        await rtp(p, A.episodeId);
        const rows = await rowsOf(p);
        same("٤٧. صفٌّ واحد: العائدُ وحده", [rows.length, rows[0]?.episodeId], [1, A.episodeId]);
        const exA = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        same("٤٨. ويُوقَّع عليه بعينه", [exA.status < 300, await examEpisode(Number(exA.body.id))], [true, A.episodeId]);
        same("٤٩. وB بقيت examined بمتابعتها", [await episodeStatus(B.episodeId), (await followupsOfEpisode(B.episodeId)).length], ["examined", 1]);
      }

      // ══ ز. «عاد للشراء» A + B قيد التصنيع ═══════════════════════════════
      console.log("\n── ز. عاد للشراء A + B قيد التصنيع ──");
      {
        const p = await mkPatient(`ز-${svc}`, svc);
        await mkCase(p, svc);
        const A = await declinedDevice(p, svc);
        const B = await openEpisode(p, svc, part);
        const exB = await signExam(p, S.doc, svc, { deviceEpisodeId: B.episodeId });
        const fB = (await followupsOfEpisode(B.episodeId))[0];
        const sale = await http("POST", `/api/followups/${fB.id}/complete-sale`, S.recv,
          { originalPrice: 500_000, discountAmount: 0, expertUserId: EXPERT });
        check(sale.status === 200, "٥٠. B تُباع وتدخل التصنيع", JSON.stringify(sale.body));
        same("   وحالتُها in_manufacturing", await episodeStatus(B.episodeId), "in_manufacturing");
        const ordersBefore = Number((await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [p]))[0].n);
        await rtp(p, A.episodeId);
        const rows = await rowsOf(p);
        same("٥١. صفٌّ واحد للعائد", [rows.length, rows[0]?.episodeId], [1, A.episodeId]);
        const exA = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        same("٥٢. ويُوقَّع عليه بعينه", [exA.status < 300, await examEpisode(Number(exA.body.id))], [true, A.episodeId]);
        same("٥٣. ولا أمرَ تصنيعٍ جديد ولا مالَ", [
          Number((await q(`SELECT count(*)::int n FROM prosthetic_work_orders WHERE patient_id=$1`, [p]))[0].n),
          Number((await q(`SELECT total_cost FROM patients WHERE id=$1`, [p]))[0].total_cost),
        ], [ordersBefore, 500_000]);
        void exB;
      }

      // ══ ح. فجوةٌ تاريخية طويلة — ترتيبُ «الأحدث أولاً» ═══════════════════
      console.log("\n── ح. فجوةٌ تاريخية ٤٠٠ يوم ──");
      {
        const p = await mkPatient(`ح-${svc}`, svc);
        await mkCase(p, svc);
        const A = await declinedDevice(p, svc);
        await backdate(A.episodeId, 400);
        const fresh = await mkPatient(`ح-جديد-${svc}`, svc);
        await mkCase(fresh, svc);
        const F = await openEpisode(fresh, svc);
        await new Promise((r) => setTimeout(r, 30));
        const rtpReq = await rtp(p, A.episodeId);
        const rtpAt = new Date((await requestRow(rtpReq)).created_at ?? Date.now()).getTime();
        const rows = (await worklist()).rows.filter((r) => r.patientId === p || r.patientId === fresh);
        const rowA = rows.find((r) => r.episodeId === A.episodeId);
        const rowF = rows.find((r) => r.episodeId === F.episodeId);
        check(new Date(rowA!.waitingSince).getTime() >= new Date(rowF!.waitingSince).getTime(),
          "٥٤. **العائدُ اليوم أحدثُ انتظاراً من طلبٍ فُتح قبله بلحظات** — يتصدّر «الأحدث أولاً»",
          `A=${rowA?.waitingSince} F=${rowF?.waitingSince}`);
        check(Math.abs(new Date(rowA!.waitingSince).getTime() - rtpAt) < 5_000 || rtpAt === 0,
          "٥٥. وانتظارُه = لحظةُ العودة", String(rowA?.waitingSince));
      }

      // ══ ط. سباقُ توقيعين على الحلقة نفسِها ═════════════════════════════════
      console.log("\n── ط. سباقُ الحلقة الواحدة ──");
      {
        const p = await mkPatient(`ط-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        //  وصفتان مختلفتان عمداً: ملفُّ المريض يجب أن يحمل وصفةَ **الفائز**
        //  وحده — لا وصفةَ الخاسر الذي رُدّ قبل أن يكتب (ترتيبُ الكتابة:
        //  الادّعاءُ المقفول قبل `applyDecision`، مراجعة المرحلة الأولى P1-C1).
        const [specKey, specCol] = svc === "prosthetic" ? ["footType", "foot_type"] : ["supportType", "support_type"];
        const [r1, r2] = await Promise.all([
          signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId, prescription: { [specKey]: "وصفة-الطبيب-الأول" } }),
          signExam(p, S.doc2, svc, { deviceEpisodeId: A.episodeId, prescription: { [specKey]: "وصفة-الطبيب-الثاني" } }),
        ]);
        const codes = [r1.status, r2.status].sort();
        same("٥٦. **واحدٌ يمضي والآخر يُردّ ٤٠٩ بائتاً**", [codes[0] < 300, codes[1]], [true, 409]);
        same("٥٧. ومعاينةٌ واحدة على الحلقة",
          Number((await q(`SELECT count(*)::int n FROM medical_exams WHERE device_episode_id=$1`, [A.episodeId]))[0].n), 1);
        same("٥٨. ومتابعةٌ واحدة", (await followupsOfEpisode(A.episodeId)).length, 1);
        const winner = r1.status < 300 ? "وصفة-الطبيب-الأول" : "وصفة-الطبيب-الثاني";
        same("٥٨.ب **وملفُّ المريض يحمل وصفةَ الفائز وحده** — الخاسرُ لم يكتب حرفاً",
          (await q<{ v: string | null }>(`SELECT ${specCol} AS v FROM patients WHERE id=$1`, [p]))[0]?.v, winner);
      }

      // ══ ي. توقيعان متزامنان على حلقتين مختلفتين ═════════════════════════
      console.log("\n── ي. توقيعان متزامنان على حلقتين ──");
      {
        const p = await mkPatient(`ي-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const B = await openEpisode(p, svc, part);
        const [rA, rB] = await Promise.all([
          signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId }),
          signExam(p, S.doc2, svc, { deviceEpisodeId: B.episodeId }),
        ]);
        same("٥٩. كلاهما ينجح", [rA.status < 300, rB.status < 300], [true, true]);
        same("٦٠. **وكلٌّ مختومٌ على حلقته**",
          [await examEpisode(Number(rA.body.id)), await examEpisode(Number(rB.body.id))], [A.episodeId, B.episodeId]);
        same("٦١. وكلُّ طلبٍ أُغلق بمعاينته هو",
          [Number((await requestRow(A.requestId)).exam_id), Number((await requestRow(B.requestId)).exam_id)],
          [Number(rA.body.id), Number(rB.body.id)]);
      }

      // ══ ك. شاشةٌ بائتة: أُلغيت الحلقة / وقّعها زميل ═══════════════════════
      console.log("\n── ك. شاشةٌ بائتة ──");
      {
        const p = await mkPatient(`ك-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const B = await openEpisode(p, svc, part);
        const cancel = await http("POST", `/api/patients/${p}/device-episodes/${A.episodeId}/cancel`, S.recv, { reason: "فُتح بالخطأ" });
        same("٦٢. إلغاءُ A", cancel.status, 200);
        const rows = await rowsOf(p);
        same("٦٣. **والقائمةُ تعرض B وحدها** — لا صفَّ شبحاً للملغاة", [rows.length, rows[0]?.episodeId], [1, B.episodeId]);
        const snap = await patientSnapshot(p);
        const stale = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        same("٦٤. **توقيعٌ على الملغاة ⟵ ٤٠٩ بائت**", [stale.status, stale.body?.code], [409, "device_episode_stale"]);
        same("٦٥. بصفر كتابة", await patientSnapshot(p), snap);
        const exB = await signExam(p, S.doc, svc, { deviceEpisodeId: B.episodeId });
        check(exB.status < 300, "٦٦. وتوقيعُ B ينجح", JSON.stringify(exB.body));
        same("٦٧. **وطلبُ الملغاة لم يُغلَق بمعاينة B**", (await requestRow(A.requestId)).exam_id, null);
        const again = await signExam(p, S.doc2, svc, { deviceEpisodeId: B.episodeId });
        same("٦٨. وتوقيعٌ ثانٍ على B بعد زميل ⟵ ٤٠٩ بائت", [again.status, again.body?.code], [409, "device_episode_stale"]);
      }

      // ══ ل. مريضٌ قديم — لا استثناءَ لجهازٍ يُطلَب اليوم ══════════════════
      console.log("\n── ل. مريضٌ قديم ──");
      {
        const p = await mkPatient(`ل-${svc}`, svc);
        await q(`UPDATE patients SET patient_classification='past', created_at = NOW() - interval '900 days' WHERE id=$1`, [p]);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const rows = await rowsOf(p);
        same("٦٩. القديمُ يظهر بجهازه", [rows.length, rows[0]?.episodeId], [1, A.episodeId]);
        const ex = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        same("٧٠. ويُوقَّع عليه بعينه", [ex.status < 300, await examEpisode(Number(ex.body.id))], [true, A.episodeId]);
      }

      // ══ م. عزلُ الفرع ═══════════════════════════════════════════════════
      console.log("\n── م. عزلُ الفرع ──");
      {
        const p = await mkPatient(`م-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        same("٧١. طبيبُ الفرع الآخر لا يرى الصفّ", (await rowsOf(p, S.docB2)).length, 0);
        const ex = await signExam(p, S.docB2, svc, { deviceEpisodeId: A.episodeId });
        same("٧٢. **ولا يوقّع عليه ولو حمل معرّفَه** ⟵ ٤٠٣", ex.status, 403);
        same("   والحلقةُ كما هي", await episodeStatus(A.episodeId), "awaiting_exam");
      }

      // ══ ن. الأجهزةُ المنتظرة في `GET exams` — لمنتقي النافذة ═══════════════
      console.log("\n── ن. منتقي النافذة ──");
      {
        const p = await mkPatient(`ن-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const B = await openEpisode(p, svc, part);
        const g = await http("GET", `/api/medical/patients/${p}/exams`, S.doc);
        same("٧٣. النقطةُ تعيد الجهازين المنتظرين بهويّتهما",
          (g.body?.awaitingEpisodes ?? []).map((e: any) => [e.id, e.caseType, e.sequenceNumber]),
          [[A.episodeId, svc, 1], [B.episodeId, svc, 2]]);
        void A; void B;
      }

      // ══ ص. طلبٌ على مستوى الاختصاص — مراجعة المرحلة الأولى LEG-01/INV-01 ═══
      // طلبُ معاينةٍ كاملة مرساتُه جهازٌ حيّ **لا ينتظر** (زيارةُ متابعةٍ على
      // مسلَّم أُحيلت إلى معاينة كاملة) أو عارٍ من الهويّة: يُدرج المريضَ في
      // القائمة، ويُغلقه أيُّ توقيعٍ للاختصاص بعده — داخل معاملة التوقيع.
      console.log("\n── ص. طلبٌ على مستوى الاختصاص ──");
      {
        const p = await mkPatient(`ص-${svc}`, svc);
        await mkCase(p, svc);
        const A = await openEpisode(p, svc);
        const ex0 = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
        check(ex0.status < 300, "٧٣.أ توقيعُ A ثمّ تسليمُه", JSON.stringify(ex0.body));
        await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW() WHERE id=$1`, [A.episodeId]);
        same("   ولا صفَّ قبل الطلب", (await rowsOf(p)).length, 0);
        const rq = await http("POST", "/api/medical-review/requests", S.recv, {
          patientId: p, serviceType: svc, requestedPath: "full", reviewKind: "adjustment",
          deviceEpisodeId: A.episodeId, receptionNote: "تعديلٌ على الجهاز المسلَّم",
        });
        same("٧٣.ب طلبُ معاينةٍ كاملة مرساتُه المسلَّم ⟵ ٢٠١", rq.status, 201);
        const reqId = Number(rq.body?.id);
        const rows = await rowsOf(p);
        same("٧٣.ج **يظهر للطبيب صفّاً بلا حلقة، بهويّة طلبه وسببِه**",
          [rows.length, rows[0]?.episodeId, rows[0]?.returnableRequestId, rows[0]?.reviewKind],
          [1, null, reqId, "adjustment"]);
        const ex = await signExam(p, S.doc, svc);
        same("٧٣.د وتوقيعٌ بلا معرّف يمضي ولا يُختَم على جهاز (لا حلقةَ تنتظر)",
          [ex.status < 300, await examEpisode(Number(ex.body?.id))], [true, null]);
        const rr = await requestRow(reqId);
        same("٧٣.هـ **والطلبُ أُغلق بها**", [rr.status, Number(rr.exam_id)], ["examined", Number(ex.body?.id)]);
        same("   والمسلَّمُ كما هو", await episodeStatus(A.episodeId), "delivered");
        same("   وخرج المريضُ من القائمة", (await rowsOf(p)).length, 0);

        // ص.٢ عارٍ مُحال (escalated) ثمّ جهازٌ يُفتَح: توقيعُ الجهاز يغلق كليهما
        const p2 = await mkPatient(`ص٢-${svc}`, svc);
        await mkCase(p2, svc);
        const quick = await http("POST", "/api/medical-review/requests", S.recv, {
          patientId: p2, serviceType: svc, requestedPath: "quick", reviewKind: "adjustment",
        });
        same("٧٣.و طلبٌ سريع عارٍ", quick.status, 201);
        const qid = Number(quick.body?.id);
        const esc = await http("POST", `/api/medical-review/requests/${qid}/decide`, S.doc2, { decision: "require_full_exam" });
        same("٧٣.ز يحيله الطبيبُ إلى معاينةٍ كاملة", [esc.status, (await requestRow(qid)).status], [200, "escalated"]);
        const rowsBare = await rowsOf(p2);
        same("٧٣.ح الصفُّ العاري يحمل الطلبَ المُحال",
          [rowsBare.length, rowsBare[0]?.episodeId, rowsBare[0]?.returnableRequestId], [1, null, qid]);
        const B = await openEpisode(p2, svc);
        const rowsB = await rowsOf(p2);
        same("٧٣.ط وبفتح جهازٍ يصير صفّاً واحداً بهويّة الحلقة **وطلبِها هي** لا العاري",
          [rowsB.length, rowsB[0]?.episodeId, rowsB[0]?.returnableRequestId], [1, B.episodeId, B.requestId]);
        const exB = await signExam(p2, S.doc, svc, { deviceEpisodeId: B.episodeId });
        check(exB.status < 300, "٧٣.ي توقيعُ B", JSON.stringify(exB.body));
        same("٧٣.ك **يغلق طلبَ B والعاريَ معاً** — الاختصاصُ عُويِن بعدهما",
          [(await requestRow(B.requestId)).status, (await requestRow(qid)).status], ["examined", "examined"]);
        same("   وخرج المريضُ من القائمة", (await rowsOf(p2)).length, 0);
      }
    }

    // ══ س. حلقةٌ على مسار «بلا معاينة» لا تظهر ولا تُخمَّن ═══════════════════
    console.log("\n── س. مسار «بلا معاينة» ──");
    {
      const p = await mkPatient("س-no-exam", "prosthetic");
      await mkCase(p, "prosthetic");
      const A = await openEpisode(p, "prosthetic");
      const ne = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number, status, requested_item, component, service_path)
         VALUES ($1,(SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'),1,2,'awaiting_exam','socket','socket','no_exam') RETURNING id`, [p]);
      const rows = await rowsOf(p);
      same("٧٤. القائمةُ تعرض حلقةَ المعاينة وحدها", [rows.length, rows[0]?.episodeId], [1, A.episodeId]);
      const g = await http("GET", `/api/medical/patients/${p}/exams`, S.doc);
      same("٧٤.ب ومنتقي النافذة لا يعرض حلقةَ «بلا معاينة» خياراً",
        (g.body?.awaitingEpisodes ?? []).map((e: any) => e.id), [A.episodeId]);
      const snap = await patientSnapshot(p);
      const onNoExam = await signExam(p, S.doc, "prosthetic", { deviceEpisodeId: ne[0].id });
      same("٧٥. **وتوقيعٌ صريح على حلقة «بلا معاينة» يُردّ ٤٠٩** — لا تُوقَّع من هنا",
        [onNoExam.status, onNoExam.body?.code], [409, "device_episode_stale"]);
      same("   بصفر كتابة", await patientSnapshot(p), snap);
      //  حلقةُ «بلا معاينة» ليست مرشَّحاً أصلاً (مراجعة المرحلة الأولى REF-2/INV-04):
      //  فحلقةُ المعاينة الوحيدة تُحسَم بلا التباس ولو غاب المعرّف.
      const ex = await signExam(p, S.doc, "prosthetic");
      same("٧٦. وبلا معرّفٍ تُحسَم حلقةُ المعاينة الوحيدة — لا التباسَ مع ما ليس مرشَّحاً",
        [ex.status < 300, await examEpisode(Number(ex.body?.id))], [true, A.episodeId]);
      same("   وحلقةُ «بلا معاينة» لم تُمَسّ", await episodeStatus(ne[0].id), "awaiting_exam");
    }

    // ══ غ. **الطبيبُ يبدّل الاختصاصَ على طلبِ جهازٍ مُرسَل** ═══════════════
    //  سيناريو المالك بالحرف: الاستعلاماتُ ترسل «مسند طبي»، والطبيبُ يراه
    //  فيقرّر أنه **طرفٌ صناعي**. فتُحفَظ المعاينةُ أطرافاً، **ولا تبقى
    //  مربوطةً بجهاز المسند الخاطئ**.
    //
    //  **وهذا الشكلُ لا خيطَ فيه للاختصاص الجديد** — فلا طلبَ مستقلّاً يمكن
    //  أن يُختطف أصلاً، ويتولّاه مسارُ §4.b القائم بحرفه: الوصفةُ تُنشئ الخيطَ
    //  الجديد ويُسحَب الوحيدُ السابق. والشاشةُ ترسل الرايةَ (§4.y) والخادمُ
    //  **يُسقطها هنا** لهذا السبب بعينه، فالمُحاكاةُ بلا معرّفٍ تُعطي النتيجةَ
    //  نفسَها — والقسمُ ف يحرس الشكلَ الذي يوجد فيه طلبٌ آخر.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── غ. تبديلُ الاختصاص على طلبٍ مُرسَل ──");
    {
      //  مريضٌ سجّله الاستعلاماتُ **مسنداً**، وفتح له طلبَ مسندٍ صريحاً.
      const p = await mkPatient("غ-switch", "medical_support");
      await mkCase(p, "medical_support");
      const support = await openEpisode(p, "medical_support");
      same("٧٩. (الإعدادُ: طلبُ مسندٍ مفتوحٌ بانتظار المعاينة، وطلبُ مراجعته معلَّق)",
        [await episodeStatus(support.episodeId),
         (await requestRow(support.requestId!) as any)?.status],
        ["awaiting_exam", "pending"]);

      //  الطبيبُ يبدّل إلى «طرف صناعي» — فالنافذةُ لا ترسل معرّفَ المسند.
      const ex = await signExam(p, S.doc, "prosthetic");
      check(ex.status < 300, "٨٠. **المعاينةُ تُحفَظ أطرافاً** رغم أن الطلبَ كان مسنداً",
        JSON.stringify(ex.body));
      const examId = Number(ex.body?.id);
      same("٨١. **ولا تُربَط بجهاز المسند الخاطئ**", await examEpisode(examId), null);
      same("   واختصاصُها المحفوظ هو ما وقّعه الطبيب",
        (await q<{ c: string }>(`SELECT case_type c FROM medical_exams WHERE id=$1`, [examId]))[0]?.c,
        "prosthetic");

      //  **ومنطقُ تصحيح الاختصاص القائم هو الذي عمل** (§4.b «تبديل النوع لا
      //  إضافته»): خيطُ المسند كان وحيداً فسُحب، وخيطُ الأطراف قائم — ولا
      //  مسارَ ثانٍ اخترعناه هنا.
      const cases = await q<{ t: string; st: string }>(
        `SELECT case_type t, status st FROM patient_cases WHERE patient_id=$1 ORDER BY case_type`, [p]);
      same("٨٢. **والخيطُ صار أطرافاً بمنطق التبديل القائم** — لا خيطان",
        cases.map((c) => c.t), ["prosthetic"]);

      //  والمتابعةُ المولودةُ عن التوقيع لا تحمل هويّةَ جهاز المسند.
      const fu = await q<{ e: number | null }>(
        `SELECT device_episode_id e FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [p]);
      check(fu.every((f) => f.e !== support.episodeId),
        "٨٣. **ولا متابعةَ تشير إلى جهاز المسند**", JSON.stringify(fu));

      //  ══ **ومصيرُ الطلب القديم يُقال صريحاً، لا يُترَك مفترَضاً** ═══════
      //  النافذةُ كانت تَعِد الطبيبَ بأن «الطلبَ يبقى كما هو بانتظار
      //  معاينته» — **وهذا ليس ما يفعله الخادم** في هذا الشكل: خيطُ المسند
      //  كان وحيداً، فمنطقُ التبديل القائم (`retireSupersededCase` ⟶
      //  `storage.deleteCaseType`، §4.b) سحبه عبر مسار السحب في §4.r —
      //  فحلقتُه السقالية **تُحذَف فيزيائياً** وطلبُ مراجعتها **يُلغى**
      //  ومرساتاه تُحرَّران. فالبنودُ التالية تثبت السلوكَ الفعليَّ كما هو،
      //  ولا تدّعي بقاءً لم يقع.
      same("٨٣.أ **وحلقةُ المسند السقالية حُذفت** — لا تبقى منتظرةً",
        await q<{ n: number }>(
          `SELECT count(*)::int n FROM patient_device_episodes WHERE id=$1`, [support.episodeId]),
        [{ n: 0 }]);
      const supReq: any = await requestRow(support.requestId!);
      same("٨٣.ب **وطلبُ مراجعتها أُلغي ومرساتاه حُرِّرتا** — لا `pending` شبحاً",
        [supReq?.status, supReq?.device_episode_id, supReq?.exam_id],
        ["cancelled", null, null]);
      same("٨٣.ج **فلا يبقى للمريض صفٌّ مسندٍ في قائمة عمل الطبيب**",
        (await rowsOf(p)).filter((r) => r.caseType === "medical_support").length, 0);

      //  ولو أصرّ عميلٌ بائتٌ وأرسل المعرّفَ الخاطئ صراحةً ⟶ الخادمُ يردّه.
      const p2 = await mkPatient("غ-explicit", "medical_support");
      await mkCase(p2, "medical_support");
      const sup2 = await openEpisode(p2, "medical_support");
      const snap2 = await patientSnapshot(p2);
      const wrong = await signExam(p2, S.doc, "prosthetic", { deviceEpisodeId: sup2.episodeId });
      same("٨٤. **ومعرّفُ جهازِ اختصاصٍ آخر يُردّ ٤٠٩** — ولهذا لا ترسله الشاشة",
        [wrong.status, wrong.body?.code], [409, "device_episode_stale"]);
      same("   بصفر كتابة", await patientSnapshot(p2), snap2);

      //  **وبقاءُ الاختصاص كما أرسله الاستعلامات لا يغيّر شيئاً** — المسارُ
      //  القائم بحرفه: المعرّفُ يُرسَل، والمعاينةُ تُختَم على جهازها.
      const p3 = await mkPatient("غ-unchanged", "medical_support");
      await mkCase(p3, "medical_support");
      const sup3 = await openEpisode(p3, "medical_support");
      const same3 = await signExam(p3, S.doc, "medical_support", { deviceEpisodeId: sup3.episodeId });
      same("٨٥. **وبلا تبديلٍ: المسارُ كما كان** — تُختَم على جهازها هو",
        [same3.status < 300, await examEpisode(Number(same3.body?.id))], [true, sup3.episodeId]);
      same("   والحلقةُ صارت مُعايَنة", await episodeStatus(sup3.episodeId), "examined");
    }

    // ══ ف. **التبديلُ يصحّح الطلبَ نفسَه ولا يختطف طلباً آخرَ مستقلّاً** ═══
    //  سيناريو المالك بالحرف:
    //    • طلبُ المسند **«أ»** هو الصفُّ الذي فتحه الطبيب.
    //    • وللمريض طلبُ أطرافٍ آخرُ **مستقلّ «ب»** بانتظار المعاينة.
    //    • فيغيّر الطبيبُ نوعَ الصفّ «أ» من مسندٍ إلى أطراف.
    //
    //  **الثابتُ المطلوب**: يُصحَّح «أ» نفسُه **بهويّته**، ولا تُربَط المعاينةُ
    //  بـ«ب» ولا يتغيّر «ب» بأيّ شكل. و«إسقاطُ هويّة أ» ليس حلّاً: التوقيعُ
    //  بلا معرّف يلتقط «الوحيدةَ المنتظرة» — وهي «ب» بعينه.
    //
    //  والشاشةُ ترسل **معرّفَ «أ» ورايةَ التصحيح** (§4.y)، وهو ما يُحاكى هنا.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── ف. تصحيحُ النوع مع طلبِ أطرافٍ آخرَ مستقلّ ──");
    {
      const p = await mkPatient("ف-independent", "medical_support");
      await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [p]);
      await mkCase(p, "medical_support");
      await mkCase(p, "prosthetic");

      //  «أ» — صفُّ الطبيب: طلبُ المسند الذي أرسله الاستعلامات.
      const A = await openEpisode(p, "medical_support");
      //  «ب» — طلبُ أطرافٍ آخرُ **مستقلّ** بانتظار معاينته.
      const B = await openEpisode(p, "prosthetic");
      const beforeA = await episodeRow(A.episodeId);
      const beforeB = await episodeRow(B.episodeId);

      same("٨٦. (الإعدادُ: «أ» مسندٌ منتظر · و«ب» أطرافٌ منتظرٌ مستقلٌّ بطلبٍ معلَّق)",
        [await episodeStatus(A.episodeId), await episodeStatus(B.episodeId),
         (await requestRow(B.requestId!) as any)?.status],
        ["awaiting_exam", "awaiting_exam", "pending"]);

      //  الطبيبُ يبدّل نوعَ الصفّ «أ» إلى «أطراف» — بهويّته لا بإسقاطها.
      const ex = await signExam(p, S.doc, "prosthetic",
        { deviceEpisodeId: A.episodeId, retypeDeviceEpisode: true });
      const examId = ex.status < 300 ? Number(ex.body?.id) : null;
      const linked = examId === null ? null : await examEpisode(examId);

      check(ex.status < 300, "٨٧. المعاينةُ تُحفَظ أطرافاً",
        `الحالة: ${ex.status} · جسمُ الردّ: ${JSON.stringify(ex.body)}`);

      const afterA = await episodeRow(A.episodeId);
      same("٨٧.أ **و«أ» نفسُه هو المُعايَن** — بمعرّفه، وقد صار أطرافاً",
        [linked, await episodeCaseType(A.episodeId), await episodeStatus(A.episodeId)],
        [A.episodeId, "prosthetic", "examined"]);
      //  **الهويّةُ محفوظة**: ما لا علاقةَ له بالنوع لا يتغيّر بحرف.
      same("٨٧.ب **وهويّتُه كما هي** — المطلوبُ والجزءُ والفرعُ والمسارُ والتواريخ",
        [afterA?.id, afterA?.patient_id, afterA?.requested_item, afterA?.component,
         afterA?.branch_id, afterA?.service_path, afterA?.created_at, afterA?.awaiting_since,
         afterA?.agreed_cost],
        [beforeA?.id, beforeA?.patient_id, beforeA?.requested_item, beforeA?.component,
         beforeA?.branch_id, beforeA?.service_path, beforeA?.created_at, beforeA?.awaiting_since,
         beforeA?.agreed_cost]);
      //  وطلبُ مراجعته تبعه: صار أطرافاً وأُغلق **بهذه المعاينة هي**.
      const aReq: any = await requestRow(A.requestId!);
      same("٨٧.ج **وطلبُ مراجعة «أ» تبعه وأُغلق بمعاينته**",
        [aReq?.status, aReq?.exam_id, aReq?.device_episode_id],
        ["examined", examId, A.episodeId]);
      same("   ونوعُه صار أطرافاً لا مسنداً",
        (await q<{ s: string }>(
          `SELECT service_type s FROM medical_review_requests WHERE id=$1`, [A.requestId]))[0]?.s,
        "prosthetic");

      check(linked !== B.episodeId,
        "٨٨. **ولا تُربَط المعاينة بالطلب «ب»**",
        `«ب» = ${B.episodeId} · والمربوطُ فعلاً = ${JSON.stringify(linked)}`);

      //  و«ب» لم يفحصه أحد، فيبقى منتظراً بطلبِ مراجعته كما كان.
      const bReq: any = await requestRow(B.requestId!);
      same("٨٩. **و«ب» يبقى بانتظار معاينته** — لا حالتُه ولا طلبُه يتغيّران",
        [await episodeStatus(B.episodeId), bReq?.status, bReq?.exam_id],
        ["awaiting_exam", "pending", null]);
      same("٨٩.أ **وصفُّ «ب» مطابقٌ بايتاً قبل وبعد**",
        await episodeRow(B.episodeId), beforeB);

      //  والمتابعةُ تُولَد عن معاينة جهازها هو — على «أ» لا على «ب».
      same("٩٠. **ولا متابعةَ تُولَد على «ب»**",
        (await followupsOfEpisode(B.episodeId)).length, 0);
      same("٩٠.أ **والمتابعةُ وُلدت على «أ»**",
        (await followupsOfEpisode(A.episodeId)).length, 1);
      //  ══ **ولا يبقى للمساند أثرٌ تشغيليّ** (قرارُ المالك ٢٠٢٦-٠٩-١٦) ═══
      //  الطلبُ الوحيد على خيط المساند كان «أ»، وقد صار أطرافاً. فبقاءُ
      //  الخيط أثرُ خطأِ إدخالٍ لا خدمةٌ يحتاجها المريض: يُرفَع، فتصير
      //  العمليةُ أطرافاً **كما لو سُجّلت أطرافاً من أوّلها**.
      same("٩٠.ب **وخيطُ المساند رُفع** — لا يبقى إلّا الأطراف",
        await caseTypesOf(p), ["prosthetic"]);
      const flags = await deviceFlagsOf(p);
      same("٩٠.ج **ولا تصنيفَ مساندٍ على الملفّ ولا عمودَ تفاصيله**",
        [flags?.s, flags?.sup], [false, null]);
      //  والشارةُ الباقيةُ **صادقة**: «ب» طلبُ أطرافٍ حقيقيٌّ ما زال ينتظر
      //  معاينتَه. المطلوبُ اختفاءُ **المساند** لا إفراغُ الخريطة.
      same("٩٠.د **ولا شارةَ «بانتظار معاينة مساند»** — والأطرافُ تبقى لأن «ب» ينتظر",
        await pendingSpecialtiesOf(p), ["prosthetic"]);
      same("٩٠.هـ ولا صفَّ مسندٍ في قائمة عمل الطبيب",
        (await rowsOf(p)).filter((r) => r.caseType === "medical_support").length, 0);
    }

    // ══ ك. **وعمليةُ المساند المستقلّةُ الحقيقية لا تُمَسّ** ════════════════
    //  نفسُ الخطأ، لكنّ للمريض **طلبَ مسندٍ ثانياً حقيقياً**: فيُصحَّح «أ»
    //  وحده، **ويبقى خيطُ المساند بطلبه الثاني وتصنيفِه كما هو**.
    //
    //  وهذا ما يمنعه الحارسُ الأوّل تحديداً: `classifyCaseDisposal` تعدّ
    //  الحلقةَ `awaiting_exam` **سقالةً** (وهو صوابُها في بابها)، فلولا شرطُ
    //  «أيُّ طلبٍ باقٍ ⟶ لا يُمَسّ» لهدم التنظيفُ طلبَ مسندٍ ينتظر طبيبَه.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── ش. عمليةُ المساند المستقلّة لا تُمَسّ ──");
    {
      const p = await mkPatient("ك-other-support", "medical_support");
      await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [p]);
      await mkCase(p, "medical_support");
      await mkCase(p, "prosthetic");
      const A = await openEpisode(p, "medical_support");   // الخطأ
      const C = await openEpisode(p, "medical_support");   // مسندٌ حقيقيٌّ آخر
      const beforeC = await episodeRow(C.episodeId);

      const ex = await signExam(p, S.doc, "prosthetic",
        { deviceEpisodeId: A.episodeId, retypeDeviceEpisode: true });
      check(ex.status < 300, "٩٩. المعاينةُ تُحفَظ أطرافاً",
        `الحالة: ${ex.status} · ${JSON.stringify(ex.body)}`);
      same("٩٩.أ **و«أ» وحده صار أطرافاً**",
        [await episodeCaseType(A.episodeId), await episodeCaseType(C.episodeId)],
        ["prosthetic", "medical_support"]);
      same("١٠٠. **وخيطُ المساند باقٍ بطلبه الثاني**",
        await caseTypesOf(p), ["medical_support", "prosthetic"]);
      same("١٠٠.أ **وصفُّ «ج» مطابقٌ بايتاً**", await episodeRow(C.episodeId), beforeC);
      const cReq: any = await requestRow(C.requestId!);
      const cSvc = (await q<{ s: string }>(
        `SELECT service_type s FROM medical_review_requests WHERE id=$1`, [C.requestId]))[0]?.s;
      same("١٠٠.ب **وطلبُ مراجعته ما زال معلَّقاً مسنداً**",
        [cReq?.status, cSvc, cReq?.exam_id, cReq?.device_episode_id],
        ["pending", "medical_support", null, C.episodeId]);
      const f2 = await deviceFlagsOf(p);
      same("١٠٠.ج **والتصنيفُ باقٍ** — المريضُ يحتاج مسنداً فعلاً", f2?.s, true);
      same("١٠٠.د وتبقى شارةُ «بانتظار معاينة مساند» وحدها",
        await pendingSpecialtiesOf(p), ["medical_support"]);
    }

    // ══ ق. **الاتجاهُ العكسيّ — والرفضُ بصفر كتابة بدل اختيار طلبٍ آخر** ═══
    //  نفسُ الشكل مقلوباً: «أ» طلبُ أطراف، و«ب» طلبُ مسندٍ مستقلّ، والطبيبُ
    //  يبدّل «أ» إلى مسند. ثمّ: «أ» لم يعد صالحاً لحظةَ الحفظ ⟶ **٤٠٩ بصفر
    //  كتابة**، ولا يُلتقَط «ب» بديلاً عنه.
    // ══════════════════════════════════════════════════════════════════════
    console.log("\n── ق. الاتجاهُ العكسيّ، والرفضُ بصفر كتابة ──");
    {
      const p = await mkPatient("ق-reverse", "prosthetic");
      await q(`UPDATE patients SET is_medical_support=true, support_type='مسند ركبة' WHERE id=$1`, [p]);
      await mkCase(p, "prosthetic");
      await mkCase(p, "medical_support");

      const A = await openEpisode(p, "prosthetic");
      const B = await openEpisode(p, "medical_support");
      const beforeA = await episodeRow(A.episodeId);
      const beforeB = await episodeRow(B.episodeId);

      same("٩١. (الإعدادُ: «أ» أطرافٌ منتظر · و«ب» مسندٌ منتظرٌ مستقلٌّ بطلبٍ معلَّق)",
        [await episodeStatus(A.episodeId), await episodeStatus(B.episodeId),
         (await requestRow(B.requestId!) as any)?.status],
        ["awaiting_exam", "awaiting_exam", "pending"]);

      const ex = await signExam(p, S.doc, "medical_support",
        { deviceEpisodeId: A.episodeId, retypeDeviceEpisode: true });
      const examId = ex.status < 300 ? Number(ex.body?.id) : null;
      const linked = examId === null ? null : await examEpisode(examId);
      check(ex.status < 300, "٩٢. المعاينةُ تُحفَظ مسنداً",
        `الحالة: ${ex.status} · جسمُ الردّ: ${JSON.stringify(ex.body)}`);
      const afterA = await episodeRow(A.episodeId);
      same("٩٢.أ **و«أ» نفسُه هو المُعايَن** — بمعرّفه، وقد صار مسنداً",
        [linked, await episodeCaseType(A.episodeId), await episodeStatus(A.episodeId)],
        [A.episodeId, "medical_support", "examined"]);
      same("٩٢.ب **وهويّتُه كما هي**",
        [afterA?.id, afterA?.requested_item, afterA?.component, afterA?.branch_id,
         afterA?.service_path, afterA?.created_at, afterA?.awaiting_since],
        [beforeA?.id, beforeA?.requested_item, beforeA?.component, beforeA?.branch_id,
         beforeA?.service_path, beforeA?.created_at, beforeA?.awaiting_since]);
      check(linked !== B.episodeId, "٩٣. **ولا تُربَط المعاينة بالطلب «ب»**",
        `«ب» = ${B.episodeId} · والمربوطُ فعلاً = ${JSON.stringify(linked)}`);
      const bReq: any = await requestRow(B.requestId!);
      same("٩٤. **و«ب» كما هو** — منتظراً بطلبه، وصفُّه مطابقٌ بايتاً",
        [await episodeStatus(B.episodeId), bReq?.status, bReq?.exam_id,
         JSON.stringify(await episodeRow(B.episodeId)) === JSON.stringify(beforeB)],
        ["awaiting_exam", "pending", null, true]);
      same("٩٤.أ ولا متابعةَ على «ب»", (await followupsOfEpisode(B.episodeId)).length, 0);
      //  وبالمقلوب أيضاً: خيطُ الأطراف الذي غادره «أ» لا يبقى له أثر.
      same("٩٤.ب **وخيطُ الأطراف رُفع** — لا يبقى إلّا المساند",
        await caseTypesOf(p), ["medical_support"]);
      const revFlags = await deviceFlagsOf(p);
      same("٩٤.ج **ولا تصنيفَ أطرافٍ ولا موقعَ بترٍ على الملفّ**",
        [revFlags?.a, revFlags?.site], [false, null]);
      same("٩٤.د ولا شارةَ «بانتظار معاينة أطراف» — والمساندُ يبقى لأن «ب» ينتظر",
        await pendingSpecialtiesOf(p), ["medical_support"]);

      //  ══ **«أ» لم يعد صالحاً ⟶ يُردّ، ولا يُختار «ب» بديلاً** ═════════════
      const p2 = await mkPatient("ق-stale", "medical_support");
      await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [p2]);
      await mkCase(p2, "medical_support");
      await mkCase(p2, "prosthetic");
      const A2 = await openEpisode(p2, "medical_support");
      const B2 = await openEpisode(p2, "prosthetic");
      //  زميلٌ سحب طلبَ «أ» بين فتح النافذة والحفظ.
      const cancelled = await http("POST", "/api/medical/worklist/cancel-request", S.doc, {
        patientId: p2, caseType: "medical_support", deviceEpisodeId: A2.episodeId,
        reason: "أُلغي الطلب قبل الحفظ",
      });
      check(cancelled.status < 300, "٩٥. (الإعدادُ: سُحب طلبُ «أ» قبل الحفظ)",
        `${cancelled.status} ${JSON.stringify(cancelled.body)}`);
      const snap2 = await patientSnapshot(p2);
      const stale = await signExam(p2, S.doc, "prosthetic",
        { deviceEpisodeId: A2.episodeId, retypeDeviceEpisode: true });
      same("٩٦. **يُردّ ٤٠٩ بائتاً — ولا يُختار طلبٌ آخر بديلاً عنه**",
        [stale.status, stale.body?.code], [409, "device_episode_stale"]);
      same("٩٦.أ بصفر كتابة", await patientSnapshot(p2), snap2);
      same("٩٦.ب **و«ب٢» لم يُمَسّ** — منتظراً بلا معاينة",
        [await episodeStatus(B2.episodeId), await examEpisodeOf(B2.episodeId)],
        ["awaiting_exam", 0]);

      //  ورايةُ تصحيحٍ بلا هويّةِ الطلب المقصود تفتح البابَ الذي جاءت لتغلقه.
      const bare = await signExam(p2, S.doc, "prosthetic", { retypeDeviceEpisode: true });
      same("٩٧. **ورايةٌ بلا معرّف تُردّ ٤٠٠** — لا تُقرأ إذناً باختيار طلبٍ ما",
        [bare.status, bare.body?.code], [400, "retype_without_episode"]);
      same("٩٧.أ بصفر كتابة", await patientSnapshot(p2), snap2);

      //  **وبلا الراية يبقى معرّفُ خيطٍ آخر بائتاً كما كان** — دلالةُ أيّ
      //  طلبٍ قائم لم تتغيّر بهذه المرحلة.
      const p3 = await mkPatient("ق-noflag", "medical_support");
      await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [p3]);
      await mkCase(p3, "medical_support");
      await mkCase(p3, "prosthetic");
      const A3 = await openEpisode(p3, "medical_support");
      await openEpisode(p3, "prosthetic");
      const snap3 = await patientSnapshot(p3);
      const noflag = await signExam(p3, S.doc, "prosthetic", { deviceEpisodeId: A3.episodeId });
      same("٩٨. **وبلا الراية: ٤٠٩ كما كان بحرفه**",
        [noflag.status, noflag.body?.code], [409, "device_episode_stale"]);
      same("٩٨.أ بصفر كتابة", await patientSnapshot(p3), snap3);
    }

    // ══ ت. تصحيحُ النوع **بلا خيطٍ هدفٍ قائم** — الطلبُ يُصحَّح ولا يُهدَم ══
    //  شكلُ المالك الأشيع: الاستعلاماتُ سجّلت «مساند» بالخطأ وليس للمريض خيطُ
    //  أطرافٍ أصلاً. كان التصحيحُ يُسقَط فيتولّاه مسارُ §4.b: يُنشئ الخيطَ
    //  الجديد **ويهدم** القديمَ بما فيه الطلبُ نفسُه — فيخرج المريضُ بلا طلبِ
    //  جهازٍ إطلاقاً، ومعاينتُه ومتابعتُه بلا هويّة.
    console.log("\n── ت. تصحيحُ النوع بلا خيطٍ هدفٍ قائم ──");
    {
      //  ت.١ — سيناريو المالك بالحرف: مساندٌ وحده ⟶ أطراف.
      const p = await mkPatient("ت-simple", "medical_support");
      await mkCase(p, "medical_support");
      const A = await openEpisode(p, "medical_support");
      const beforeA = await episodeRow(A.episodeId);

      same("١٠١. (الإعدادُ: خيطُ مساندٍ وحده — ولا خيطَ أطرافٍ على الملفّ)",
        [await caseTypesOf(p), await episodeStatus(A.episodeId)],
        [["medical_support"], "awaiting_exam"]);

      const ex = await signExam(p, S.doc, "prosthetic",
        { deviceEpisodeId: A.episodeId, retypeDeviceEpisode: true });
      const examId = ex.status < 300 ? Number(ex.body?.id) : null;
      check(ex.status < 300, "١٠٢. المعاينةُ تُحفَظ أطرافاً",
        `الحالة: ${ex.status} · ${JSON.stringify(ex.body)}`);

      //  **الطلبُ باقٍ بمعرّفه** — لا مهدوماً ولا مُستبدَلاً بآخر.
      const afterA = await episodeRow(A.episodeId);
      same("١٠٣. **والطلبُ نفسُه باقٍ وصار أطرافاً مُعايَناً** — لا يُهدَم",
        [afterA === null ? "محذوف" : afterA.id, await episodeCaseType(A.episodeId),
         await episodeStatus(A.episodeId)],
        [A.episodeId, "prosthetic", "examined"]);
      same("١٠٣.أ **وهويّتُه كما هي بايتاً** — المطلوبُ والفرعُ والمسارُ والتواريخُ والكلفة",
        [afterA?.requested_item, afterA?.component, afterA?.branch_id, afterA?.service_path,
         afterA?.created_at, afterA?.awaiting_since, afterA?.agreed_cost, afterA?.sequence_number],
        [beforeA?.requested_item, beforeA?.component, beforeA?.branch_id, beforeA?.service_path,
         beforeA?.created_at, beforeA?.awaiting_since, beforeA?.agreed_cost, beforeA?.sequence_number]);
      same("١٠٣.ب **والمعاينةُ مختومةٌ عليه** — لا معاينةً بلا هويّة",
        examId === null ? null : await examEpisode(examId), A.episodeId);
      same("١٠٣.ج **ومتابعةُ قرار الشراء مربوطةٌ به** — فبابُها المبسَّط يفتح عليها",
        (await followupsOfEpisode(A.episodeId)).length, 1);
      const aReq: any = await requestRow(A.requestId!);
      same("١٠٣.د وطلبُ مراجعته تبعه وأُغلق بمعاينته",
        [aReq?.status, aReq?.exam_id, aReq?.device_episode_id], ["examined", examId, A.episodeId]);
      const reqTyped = (await q<{ s: string; c: number | null }>(
        `SELECT service_type s, case_id c FROM medical_review_requests WHERE id=$1`, [A.requestId]))[0];
      same("   ونوعُه وخيطُه صارا أطرافاً — لا `case_id` فارغاً",
        [reqTyped?.s, reqTyped?.c],
        ["prosthetic", (await q<{ id: number }>(
          `SELECT id FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`, [p]))[0]?.id]);

      //  **ولا أثرَ تشغيليٍّ للمساند** — وهو المطلوبُ الثاني بعينه.
      same("١٠٤. **وخيطُ المساند رُفع** — لا يبقى إلّا الأطراف",
        await caseTypesOf(p), ["prosthetic"]);
      const flags = await deviceFlagsOf(p);
      same("١٠٤.أ **ولا تصنيفَ مساندٍ ولا عمودَ تفاصيله على الملفّ**",
        [flags?.a, flags?.s, flags?.sup], [true, false, null]);
      same("١٠٤.ب **ولا شارةَ «بانتظار معاينة مساند»**", await pendingSpecialtiesOf(p), []);
      same("١٠٤.ج **ولا صفَّ مساندٍ في قائمة عمل الطبيب**",
        (await rowsOf(p)).map((r: any) => r.caseType), []);

      //  ت.٢ — الاتجاهُ العكسيّ بالبساطة نفسِها.
      const p2 = await mkPatient("ت-simple-rev", "prosthetic");
      await mkCase(p2, "prosthetic");
      const A2 = await openEpisode(p2, "prosthetic");   //  جهازٌ كامل — يصلح للنوعين
      const ex2 = await signExam(p2, S.doc, "medical_support",
        { deviceEpisodeId: A2.episodeId, retypeDeviceEpisode: true });
      check(ex2.status < 300, "١٠٥. والاتجاهُ العكسيّ كذلك: المعاينةُ تُحفَظ مسنداً",
        `${ex2.status} ${JSON.stringify(ex2.body)}`);
      same("١٠٥.أ والطلبُ نفسُه باقٍ وصار مسنداً مُعايَناً",
        [await episodeCaseType(A2.episodeId), await episodeStatus(A2.episodeId),
         ex2.status < 300 ? await examEpisode(Number(ex2.body?.id)) : null],
        ["medical_support", "examined", A2.episodeId]);
      same("١٠٥.ب وخيطُ الأطراف رُفع ولا تصنيفَ له", await caseTypesOf(p2), ["medical_support"]);
      same("١٠٥.ج ولا شارةَ «بانتظار معاينة أطراف»", await pendingSpecialtiesOf(p2), []);

      //  **وما لا يصحّ للنوع الجديد لا يُصحَّح** — جزءٌ للأطراف لا يصير مسنداً
      //  (§4.e: المساندُ بلا أجزاء)، ولا خيطَ مساندٍ يُفتَح له.
      const p2b = await mkPatient("ت-part-rev", "prosthetic");
      await mkCase(p2b, "prosthetic");
      const part = await openEpisode(p2b, "prosthetic", "socket");
      const snapPart = await patientSnapshot(p2b);
      const casesPart = await caseTypesOf(p2b);
      const badPart = await signExam(p2b, S.doc, "medical_support",
        { deviceEpisodeId: part.episodeId, retypeDeviceEpisode: true });
      same("١٠٥.د **وطلبُ «قالب» لا يصير مسنداً** — ٤٠٩ بصفر كتابة",
        [badPart.status, badPart.body?.code], [409, "device_episode_stale"]);
      same("١٠٥.هـ ولا خيطَ مساندٍ يُفتَح له",
        [await patientSnapshot(p2b), await caseTypesOf(p2b)], [snapPart, casesPart]);

      //  ت.٣ — **والعمليةُ المستقلّةُ الحقيقية لا تُمَسّ** ولو لم يوجد خيطٌ هدف.
      const p3 = await mkPatient("ت-other-real", "medical_support");
      await mkCase(p3, "medical_support");
      const A3 = await openEpisode(p3, "medical_support");
      const C3 = await openEpisode(p3, "medical_support");   //  طلبُ مساندٍ ثانٍ حقيقيّ
      const beforeC = await episodeRow(C3.episodeId);
      const ex3 = await signExam(p3, S.doc, "prosthetic",
        { deviceEpisodeId: A3.episodeId, retypeDeviceEpisode: true });
      check(ex3.status < 300, "١٠٦. تصحيحُ «أ» يمضي ومعه طلبُ مساندٍ ثانٍ حقيقيّ",
        `${ex3.status} ${JSON.stringify(ex3.body)}`);
      same("١٠٦.أ و«أ» وحدَه صار أطرافاً", await episodeCaseType(A3.episodeId), "prosthetic");
      same("١٠٧. **وخيطُ المساند باقٍ بطلبه الثاني** — لا يُرفَع",
        await caseTypesOf(p3), ["medical_support", "prosthetic"]);
      same("١٠٧.أ **وصفُّ «ج» مطابقٌ بايتاً**", await episodeRow(C3.episodeId), beforeC);
      const cReq = (await q<{ s: string; st: string }>(
        `SELECT service_type s, status st FROM medical_review_requests WHERE id=$1`, [C3.requestId]))[0];
      same("١٠٧.ب وطلبُ مراجعته ما زال معلَّقاً مسنداً", [cReq?.s, cReq?.st],
        ["medical_support", "pending"]);
      same("١٠٧.ج وتبقى شارةُ «بانتظار معاينة مساند» وحدها",
        await pendingSpecialtiesOf(p3), ["medical_support"]);

      //  ت.٤ — **والرفضُ بصفر كتابة: لا خيطَ هدفٍ يُفتَح لطلبٍ بائت.**
      const p4 = await mkPatient("ت-stale", "medical_support");
      await mkCase(p4, "medical_support");
      const A4 = await openEpisode(p4, "medical_support");
      const pulled = await http("POST", "/api/medical/worklist/cancel-request", S.doc, {
        patientId: p4, caseType: "medical_support", deviceEpisodeId: A4.episodeId,
        reason: "أُلغي الطلب قبل الحفظ",
      });
      check(pulled.status < 300, "١٠٨. (الإعدادُ: سُحب الطلبُ قبل الحفظ)",
        `${pulled.status} ${JSON.stringify(pulled.body)}`);
      const snap4 = await patientSnapshot(p4);
      const cases4 = await caseTypesOf(p4);
      const stale4 = await signExam(p4, S.doc, "prosthetic",
        { deviceEpisodeId: A4.episodeId, retypeDeviceEpisode: true });
      same("١٠٩. **يُردّ ٤٠٩ بائتاً**", [stale4.status, stale4.body?.code],
        [409, "device_episode_stale"]);
      same("١٠٩.أ بصفر كتابة", await patientSnapshot(p4), snap4);
      same("١٠٩.ب **ولا خيطَ أطرافٍ يُفتَح** — الصفُّ داخل المعاملة يتراجع معها",
        await caseTypesOf(p4), cases4);
    }

    // ══ ث. التصحيحُ إلى خيطٍ يحمل طلباً مستقلّاً — «ب» لا تُمَسّ ═══════════
    //  شكلُ المالك (٢٠٢٦-٠٩-١٧): فُتحت النافذةُ على طلب مساندٍ «أ»، وللمريض
    //  طلبُ أطرافٍ مستقلٌّ «ب»، فبدّل الطبيبُ إلى أطراف. فتُصحَّح «أ» **وتُنقَل
    //  إلى خيطٍ غيرِ فارغ** — وهذا أوّلُ تصحيحٍ هدفُه خيطٌ يحمل حلقةً أصلاً.
    console.log("\n── ث. التصحيحُ إلى خيطٍ يحمل طلباً مستقلّاً ──");
    {
      const p = await mkPatient("ث-both", "medical_support");
      await mkCase(p, "medical_support");
      await mkCase(p, "prosthetic");
      await q(`UPDATE patients SET is_amputee=true WHERE id=$1`, [p]);
      const A = await openEpisode(p, "medical_support");           // «أ» الخاطئة
      const B = await openEpisode(p, "prosthetic", "socket");      // «ب» المستقلّة
      const beforeB = await episodeRow(B.episodeId);
      const reqB = await requestRow(B.requestId!);

      const ex = await signExam(p, S.doc, "prosthetic",
        { deviceEpisodeId: A.episodeId, retypeDeviceEpisode: true });
      check(ex.status < 300, "١١٠. المعاينةُ تُحفَظ أطرافاً", JSON.stringify(ex.body));

      const afterA = await episodeRow(A.episodeId);
      same("١١١. **«أ» نفسُها صارت أطرافاً مُعايَنةً** — بمعرّفها",
        [afterA?.id, await episodeCaseType(A.episodeId), afterA?.status],
        [A.episodeId, "prosthetic", "examined"]);
      same("١١١.أ وهويّتُها كما هي بايتاً",
        [afterA?.requested_item, afterA?.branch_id, afterA?.service_path, afterA?.agreed_cost],
        [beforeB && "full_device", 1, "exam", 0]);
      same("١١١.ب والمعاينةُ مختومةٌ عليها", await examEpisode(Number(ex.body.id)), A.episodeId);

      // ══ **و«ب» لم تُمَسّ بحرف** — بصمةٌ كاملةٌ قبل وبعد ═══════════════
      same("١١٢. **«ب» مطابقةٌ بايتاً بعد التصحيح**",
        await episodeRow(B.episodeId), beforeB);
      same("١١٢.أ وطلبُ مراجعتها ما زال معلَّقاً بلا معاينة",
        await requestRow(B.requestId!), reqB);
      same("١١٢.ب ولا معاينةَ عليها إطلاقاً", await examEpisodeOf(B.episodeId), 0);

      // ══ والخيطُ يحمل الاثنتين بتسلسلين مختلفين — لا تصادم ═════════════
      const seqs = await q<{ id: number; n: number }>(
        `SELECT e.id, e.sequence_number n FROM patient_device_episodes e
           JOIN patient_cases c ON c.id=e.case_id
          WHERE e.patient_id=$1 AND c.case_type='prosthetic' ORDER BY e.id`, [p]);
      same("١١٣. الخيطُ يحمل الطلبين بتسلسلين متمايزين",
        [seqs.length, new Set(seqs.map((r) => Number(r.n))).size], [2, 2]);

      //  والمريضُ يبقى في الطابور بطلب «ب» وحدها — «أ» خرجت بمعاينتها.
      const rows = await rowsOf(p);
      same("١١٤. وقائمةُ الطبيب تُظهر «ب» وحدها",
        rows.map((r) => r.episodeId), [B.episodeId]);
      same("١١٤.أ وشارةُ الانتظار للأطراف وحدها (المساندُ رُفع)",
        await pendingSpecialtiesOf(p), ["prosthetic"]);
      const flags = await deviceFlagsOf(p);
      same("١١٥. **ولا أثرَ تشغيليٌّ للمساند** — الخيطُ والعَلَمُ والعمود",
        [await caseTypesOf(p), flags.s, flags.sup], [["prosthetic"], false, null]);
    }

    // ══ ع. عزلُ العلاج الطبيعي ══════════════════════════════════════════════
    console.log("\n── ع. العلاجُ الطبيعي ──");
    {
      const p = await mkPatient("ع-physio", "prosthetic");
      await q(`UPDATE patients SET is_amputee=false, is_physiotherapy=true WHERE id=$1`, [p]);
      await mkCase(p, "physiotherapy");
      await q(`UPDATE system_users SET medical_specialties='["prosthetic","medical_support","physiotherapy"]'::jsonb WHERE id=$1`, [DOC]);
      const ex = await signExam(p, S.doc, "physiotherapy");
      check(ex.status < 300, "٧٧. معاينةُ العلاج الطبيعي تُوقَّع كما كانت", JSON.stringify(ex.body));
      const withId = await signExam(p, S.doc, "physiotherapy", { deviceEpisodeId: 1 });
      same("٧٨. ومعرّفُ جهازٍ عليها ⟵ ٤٠٩ بائت (لا حلقةَ للعلاج الطبيعي)", withId.status, 409);
      await q(`UPDATE system_users SET medical_specialties='["prosthetic","medical_support"]'::jsonb WHERE id=$1`, [DOC]);
    }
  } finally {
    await cleanup();
    await deactivateTestUsers();
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
