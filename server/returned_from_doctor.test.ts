// **«المُرجَعون من الطبيب»** — §4.ar، تكملةُ البند ١٨ (طلبُ المالك ٢٠٢٦-٠٩-٣٠).
// `npm run test:returned-from-doctor` — حيٌّ على Postgres وعلى النقاط الحقيقية.
//
// الطلبُ المُرجَع يظهر في القائمة وعدّادها لمن يرسل ولمن يعاين، في فرعه وحده،
// ويخرج بإعادة الإرسال أو بتوقيع معاينة أو بإلغاء الطلب.

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

const PORT = 6961;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-المرجعين";
const ADMIN = 99610, RECV = 99611, DOC = 99612, EXPERT = 99614, RECV_B2 = 99615, DOC_B2 = 99616;
type Svc = "prosthetic" | "medical_support";

const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true } },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true } },
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

async function returned(session: any) {
  const r = await http("GET", "/api/medical-review/returned", session);
  return { status: r.status, rows: (Array.isArray(r.body?.rows) ? r.body.rows : []) as any[] };
}
async function returnedOf(p: number, session: any = S.recv) {
  return (await returned(session)).rows.filter((r) => r.patientId === p);
}
async function count(session: any) {
  const r = await http("GET", "/api/medical-review/returned/count", session);
  return Number(r.body?.count ?? -1);
}
async function doReturn(requestId: number, reason: string) {
  const r = await http("POST", `/api/medical-review/requests/${requestId}/return`, S.doc, { reason });
  if (r.status >= 300) throw new Error(`فشل الإرجاع: ${r.status} ${JSON.stringify(r.body)}`);
}
async function resend(p: number, svc: Svc, episodeId: number | null) {
  return await http("POST", "/api/medical-review/requests", S.recv, {
    patientId: p, serviceType: svc, requestedPath: "full", reviewKind: "new_device",
    receptionNote: "صُحّحت البيانات", ...(episodeId !== null ? { deviceEpisodeId: episodeId } : {}),
  });
}
async function worklistEpisodes(p: number) {
  const r = await http("GET", "/api/medical/worklist", S.doc);
  return ((r.body?.rows ?? []) as any[]).filter((x) => x.patientId === p).map((x) => x.episodeId);
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

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, spec] of [
    [ADMIN, "admin", "المسؤول", 1, "[]"],
    [RECV, "reception", "استعلامات", 1, "[]"],
    [DOC, "doctor", "د. المعاين", 1, '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", 1, "[]"],
    [RECV_B2, "reception", "استعلامات ٢", 2, "[]"],
    [DOC_B2, "doctor", "د. الفرع ٢", 2, '["prosthetic","medical_support"]'],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `rfd_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
  }
  //  الخبيرُ بلا «إضافة مريض» ولا «كتابة معاينة» — صفُّه يطابق جلستَه.
  await q(`UPDATE system_users SET can_add_patients = false WHERE id = $1`, [EXPERT]);
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
    const svc: Svc = "prosthetic";
    console.log("\n── أ. الإرجاعُ يُدخله القائمة ──");
    const p = await mkPatient("علي", svc);
    await mkCase(p, svc);
    const A = await openEpisode(p, svc);
    same("أ١. (الإعداد) قبل الإرجاع: لا شيء في القائمة", (await returnedOf(p)).length, 0);
    const c0 = await count(S.recv);
    await doReturn(A.requestId!, "جهة البتر خطأ — صحّحوها");
    const rowsR = await returnedOf(p);
    same("أ٢. **يظهر للاستعلامات** بسبب الطبيب واسمه وحلقته",
      rowsR.map((r) => [r.requestId, r.doctorNote, r.decidedByName, r.deviceEpisodeId, r.episodeAwaiting]),
      [[A.requestId, "جهة البتر خطأ — صحّحوها", "د. المعاين", A.episodeId, true]]);
    same("أ٣. **والعدّادُ زاد واحداً**", await count(S.recv), c0 + 1);
    same("أ٤. **ويظهر للطبيب أيضاً**", (await returnedOf(p, S.doc)).length, 1);
    same("أ٥. ولا يظهر لفرعٍ آخر (استعلامات ٢ · طبيب ٢)",
      [(await returnedOf(p, S.recvB2)).length, (await returnedOf(p, S.docB2)).length], [0, 0]);
    const ex = await returned(S.expert);
    same("أ٦. والخبيرُ ليس منهم ⟵ ٤٠٣ وعدّاده صفر", [ex.status, await count(S.expert)], [403, 0]);
    same("أ٧. (والبند ١٨) خرج من «معايناتي»", await worklistEpisodes(p), []);

    console.log("\n── ب. إعادةُ الإرسال تُخرجه ──");
    const rs = await resend(p, svc, A.episodeId);
    check(rs.status < 300, "ب١. الاستعلاماتُ يعيد الإرسال على الحلقة نفسها", JSON.stringify(rs.body));
    same("ب٢. **خرج من القائمة** والعدّادُ رجع", [(await returnedOf(p)).length, await count(S.recv)], [0, c0]);
    same("ب٣. **وعاد إلى «معايناتي»**", await worklistEpisodes(p), [A.episodeId]);

    console.log("\n── ج. توقيعُ معاينةٍ يُخرجه ──");
    await doReturn(Number(rs.body.id), "ناقص قياس الطول");
    same("ج١. (الإعداد) أُرجع ثانيةً ⟵ في القائمة", (await returnedOf(p)).length, 1);
    const sig = await signExam(p, S.doc, svc, { deviceEpisodeId: A.episodeId });
    check(sig.status < 300, "ج٢. الطبيبُ يعاينه رغم الإرجاع", JSON.stringify(sig.body));
    same("ج٣. **خرج من القائمة**", (await returnedOf(p)).length, 0);

    console.log("\n── د. إعادةُ إرسالٍ عارية (من صفحة المريض) تُخرجه أيضاً ──");
    const p2 = await mkPatient("حسن", svc);
    await mkCase(p2, svc);
    const B = await openEpisode(p2, svc);
    await doReturn(B.requestId!, "الاسم ناقص");
    same("د١. (الإعداد) في القائمة", (await returnedOf(p2)).length, 1);
    const bare = await resend(p2, svc, null);
    check(bare.status < 300, "د٢. إرسالٌ بلا حلقة (النافذةُ من صفحة المريض)", JSON.stringify(bare.body));
    same("د٣. **خرج من القائمة**", (await returnedOf(p2)).length, 0);

    console.log("\n── هـ. إلغاءُ الطلب يُخرجه ──");
    const p3 = await mkPatient("زيد", svc);
    await mkCase(p3, svc);
    const C = await openEpisode(p3, svc);
    await doReturn(C.requestId!, "ليس مريض أطراف");
    same("هـ١. (الإعداد) في القائمة", (await returnedOf(p3)).length, 1);
    const cx = await http("POST", "/api/medical/worklist/cancel-request", S.doc, {
      patientId: p3, caseType: svc, deviceEpisodeId: C.episodeId, reason: "ليس مريض أطراف",
    });
    same("هـ٢. **أُلغي طلبُه ⟵ خرج**", (await returnedOf(p3)).length, 0);

    //  وطلبُ الجهاز أُلغي من بابٍ آخر (الحلقةُ `cancelled`) والطلبُ المُرجَع باقٍ كما هو.
    const p5 = await mkPatient("كريم", svc);
    await mkCase(p5, svc);
    const E = await openEpisode(p5, svc);
    await doReturn(E.requestId!, "خطأ");
    same("هـ٣. (الإعداد) في القائمة", (await returnedOf(p5)).length, 1);
    await q(`UPDATE patient_device_episodes SET status='cancelled' WHERE id=$1`, [E.episodeId]);
    same("هـ٤. **حلقتُه أُلغيت ⟵ خرج**", (await returnedOf(p5)).length, 0);

    console.log("\n── و. المحذوفُ في السلّة خارجها ──");
    const p4 = await mkPatient("سلمان", svc);
    await mkCase(p4, svc);
    const D = await openEpisode(p4, svc);
    await doReturn(D.requestId!, "خطأ");
    same("و١. (الإعداد) في القائمة", (await returnedOf(p4)).length, 1);
    const del = await http("DELETE", `/api/patients/${p4}`, S.admin, { reason: "اختبار السلّة" });
    check(del.status < 300, "و٢. (الإعداد) نُقل إلى السلّة", `${del.status} ${JSON.stringify(del.body)}`);
    same("و٣. **في السلّة ⟵ خارج القائمة**", (await returnedOf(p4)).length, 0);
  } finally {
    await cleanup();
    await q(`UPDATE system_users SET is_active = false WHERE id = ANY($1::int[])`,
      [[ADMIN, RECV, DOC, EXPERT, RECV_B2, DOC_B2]]);
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
