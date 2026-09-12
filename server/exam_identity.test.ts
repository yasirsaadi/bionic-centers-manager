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
