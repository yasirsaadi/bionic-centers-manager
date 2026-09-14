// **«إلغاء المعاينة» — طلبٌ لم تبدأ معاينتُه يُلغى، وما بدأ لا يُمَسّ.**
// حيّاً على Postgres وعلى النقاط الحقيقية: `npm run test:exam-request-cancel`.
//
// ══ الثابتُ الذي يحرسه ════════════════════════════════════════════════════
// زرٌّ في «معايناتي» بجانب «كتابة معاينة» و«ملف المريض». إن لم تبدأ معاينةٌ:
// يُسحَب الطلبُ وتُلغى السقالةُ غير المستخدَمة، ويخرج المريضُ من القائمة
// فيبقى في سجلّ المرضى وحده — **بلا سجلّ معاينةٍ ملغاة وبلا أشباح**.
//
// وما يُثبته، بندَ بندٍ (أ–ن)، **للأطراف والمساند معاً**:
//   أ.  المسارُ الطبيعيّ: طلبُ جهازٍ خاطئ يُلغى، فيخرج الصفُّ ويبقى الملفّ.
//   ب.  **ولا معاينةَ تُخلَق ولا تُلغى**: صفرُ `medical_exams` وصفرُ شواهد.
//   ج.  الصفُّ **بلا حلقة** (طلبٌ على مستوى الاختصاص) يُلغى بسحب طلبه.
//   د.  **وبلا أشباح**: لا شارةَ انتظار، ولا طلبٌ معلَّق، والمرساةُ تتحرّر
//       فيقبل الخادمُ طلباً جديداً صحيحاً بعده.
//   هـ. **وما بدأت معاينتُه لا يُلغى**: حلقةٌ `examined` تُردّ ٤٠٩ بصفر كتابة.
//   و.  **والحلقةُ الأخرى لا تُمَسّ**: جهازان منتظران، يُلغى واحدٌ ويبقى الآخر.
//   ز.  **والتاريخُ الحقيقيّ مطابقٌ بايتاً**: معاينةٌ وأمرٌ ودفعةٌ قبل وبعد.
//   ح.  **وإحالةُ الطبيب لا تُمحى**: `escalated` تُردّ وتدلّ على بابها.
//   ط.  الصلاحيةُ: الاختصاصُ والفرعُ — والاستقبالُ والخبيرُ والمحاسبُ يُردّون.
//   ي.  **وضغطتان متزامنتان** تُنتجان إلغاءً واحداً.
//   ك.  السببُ إلزاميّ، والملفُّ في السلّة يُردّ، ومسارُ «بلا معاينة» يُردّ.
//   ل.  **والشكلُ المشوَّه يُردّ** ولا يسقط صامتاً إلى «بلا جهاز».
//   م.  **ويُقال ما جرى**: `stillListed` صادقٌ حين يبقى الصفُّ لقاعدةٍ أخرى.
//   ع.  **إتاحةٌ بلا نقل ثمّ نقلُ مسؤولية**: الإتاحةُ وحدها لا تنقل طابوراً،
//       ونقلُ المسؤولية ينقل فرعَ الحلقة فيتبعه الطابورُ والإلغاءُ معاً.
//   ف.  **وسطرُ التدقيق نوعُه يتبع معرّفَه**: الحلقةُ بحلقتها والطلبُ بطلبه.
//   ن.  عقدُ الشاشة، وحارسٌ معماريّ: لا كتابةَ معاينةٍ في مسار الإلغاء.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as medicalStore from "./medical/store";

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

const PORT = 6977;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إلغاء-طلب-المعاينة";
const ADMIN = 99760, MGR = 99761, RECV = 99762, DOC = 99763, EXPERT = 99764,
  DOC2 = 99765, ACC = 99766, DOCB2 = 99767;

type Svc = "prosthetic" | "medical_support";

const perms = { canViewPatients: true, canAddPatients: true, canEditPatients: true };
const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: perms },
  mgr: { userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير بغداد", permissions: perms },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: perms },
  acc: { userId: ACC, role: "accountant", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "المحاسب", permissions: perms },
  expert: { userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: perms },
  /** طبيبٌ باختصاصَي الأجهزة — صاحبُ القائمة. */
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. سعد", permissions: { ...perms, canWriteMedicalExam: true } },
  /** طبيبُ علاجٍ طبيعي وحده — لا يلمس طلبَ جهاز. */
  doc2: { userId: DOC2, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. علاج طبيعي", permissions: { ...perms, canWriteMedicalExam: true } },
  /** طبيبُ أجهزةٍ في فرعٍ آخر. */
  docB2: { userId: DOCB2, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "د. الفرع الثاني", permissions: { ...perms, canWriteMedicalExam: true } },
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

// ── بناءُ الحالات ────────────────────────────────────────────────────────
let phoneSeq = 0;
const nextPhone = () => `0772${String(4_000_000 + (phoneSeq += 1))}`;

async function mkPatient(label: string, kind: Svc, opts: { branch?: number } = {}) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, support_type, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,$8,$2,'40','172','78','بتر',$3,$4,$5,$6,$7,false,0,'new')
     RETURNING id`,
    [`${MARK} ${label}`, MARK,
      kind === "prosthetic" ? "احادي - طرف سفلي - يمين - تحت الركبة" : null,
      kind === "medical_support" ? "مسند ركبة" : null,
      opts.branch ?? 1, kind === "prosthetic", kind === "medical_support", nextPhone()]);
  return r[0].id;
}
const mkCase = async (patientId: number, caseType: string, branch = 1, createdAt?: string) =>
  (await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status, created_at)
     VALUES ($1,$3,$2,0,'manual','active',COALESCE($4::timestamp, NOW())) RETURNING id`,
    [patientId, caseType, branch, createdAt ?? null]))[0].id;

/** طلبٌ عارٍ على مستوى الاختصاص — ما تُنشئه «إضافة نوع حالة» و«عاد للشراء». */
const mkBareRequest = async (
  patientId: number, caseId: number, svc: Svc,
  opts: { status?: string; branch?: number; kind?: string } = {},
) => (await q<{ id: number }>(
  `INSERT INTO medical_review_requests
     (patient_id, service_type, case_id, branch_id, device_episode_id,
      requested_path, review_kind, created_by, status, decision, decided_at, decided_by)
   VALUES ($1,$2,$3,$5,NULL,'full',$6,${RECV},$4,
           CASE WHEN $4 = 'escalated' THEN 'require_full_exam' ELSE NULL END,
           CASE WHEN $4 = 'pending' THEN NULL ELSE NOW() END,
           CASE WHEN $4 = 'pending' THEN NULL ELSE ${DOC} END)
   RETURNING id`,
  [patientId, svc, caseId, opts.status ?? "pending", opts.branch ?? 1,
    opts.kind ?? "new_device"]))[0].id;

const openDevice = (p: number, svc: Svc, session: any = S.recv) =>
  http("POST", `/api/patients/${p}/device-episodes`, session,
    { serviceType: svc, servicePath: "exam" });

let keySeq = 0;
const signExam = (p: number, svc: Svc, episodeId: number | null, session: any = S.doc) =>
  http("POST", `/api/medical/patients/${p}/exams`, session, {
    caseType: svc, deviceEpisodeId: episodeId, diagnosis: "تشخيص", plan: "خطة",
    idempotencyKey: `cancelreq-${Date.now()}-${keySeq += 1}`,
  });

const cancelRequest = (
  p: number, svc: string, episodeId: number | null, session: any = S.doc,
  reason: any = "لا يحتاج معاينة — أُضيف بالخطأ",
) => http("POST", "/api/medical/worklist/cancel-request", session,
  { patientId: p, caseType: svc, deviceEpisodeId: episodeId, reason });

// ── قراءةُ الحال ─────────────────────────────────────────────────────────
const worklist = async (session: any = S.doc) =>
  (await http("GET", "/api/medical/worklist", session)).body?.rows ?? [];
const myRows = async (p: number, session: any = S.doc) =>
  (await worklist(session)).filter((r: any) => r.patientId === p);
const pendingMap = async (session: any = S.doc) =>
  (await http("GET", "/api/medical/pending", session)).body ?? {};

const epRows = (p: number) =>
  q(`SELECT id, case_id, status, cancel_reason FROM patient_device_episodes
      WHERE patient_id=$1 ORDER BY id`, [p]);
const reqRows = (p: number) =>
  q(`SELECT id, status, decision, device_episode_id, case_id, doctor_note
       FROM medical_review_requests WHERE patient_id=$1 ORDER BY id`, [p]);
const examRows = (p: number) =>
  q(`SELECT id, case_type, device_episode_id FROM medical_exams WHERE patient_id=$1 ORDER BY id`, [p]);
const examCancelRows = (p: number) =>
  q(`SELECT c.id FROM medical_exam_cancellations c
      JOIN medical_exams e ON e.id = c.exam_id WHERE e.patient_id=$1`, [p]);
const caseRows = (p: number) =>
  q(`SELECT id, case_type, status, cost FROM patient_cases WHERE patient_id=$1 ORDER BY id`, [p]);
const patientRow = async (p: number) =>
  (await q(`SELECT id, name, deleted_at, total_cost FROM patients WHERE id=$1`, [p]))[0] ?? null;

/** بصمةُ كلّ ما لا يجوز أن يتغيّر. */
async function fingerprint(p: number) {
  return JSON.stringify({
    exams: await examRows(p),
    orders: await q(`SELECT id, status, current_stage, device_episode_id
                       FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [p]),
    payments: await q(`SELECT id, amount, case_id FROM payments WHERE patient_id=$1 ORDER BY id`, [p]),
    costs: await q(`SELECT id, amount, source FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [p]),
    followups: await q(`SELECT id, status FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [p]),
    total: (await patientRow(p))?.total_cost,
  });
}
/** لقطةٌ لكلّ ما قد يكتبه الإلغاء — لإثبات «صفر كتابة» عند الرفض. */
async function writable(p: number) {
  return JSON.stringify({
    eps: await epRows(p), reqs: await reqRows(p), cases: await caseRows(p),
    exams: await examRows(p),
  });
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const s of [
    `DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`,
    `DELETE FROM price_change_requests WHERE followup_id IN
       (SELECT id FROM post_exam_followups WHERE patient_id IN (${ids}))`,
    `DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`,
    `DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`,
    `DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`,
    `DELETE FROM medical_exam_cancellations WHERE exam_id IN
       (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exam_revisions WHERE exam_id IN
       (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`,
    `DELETE FROM medical_exams WHERE patient_id IN (${ids})`,
    `DELETE FROM prosthetic_work_history WHERE work_order_id IN
       (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`,
    `DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`,
    `DELETE FROM cost_entries WHERE patient_id IN (${ids})`,
    `DELETE FROM payments WHERE patient_id IN (${ids})`,
    `DELETE FROM visits WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_cases WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_contacts WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`,
    `DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`,
    `DELETE FROM patients WHERE referral_source = '${MARK}'`,
    //  **وسطورُ تدقيقِ هذه النقطة من مستخدمي هذا الاختبار وحدهم** — وإلّا
    //  تراكمت عبر التشغيلات فصارت تشير إلى صفوفٍ نظّفها تشغيلٌ سابق، ففشل
    //  ثابتُ «كلُّ سطرٍ يشير إلى صفٍّ موجود» لسببٍ لا علاقةَ له بالكود.
    `DELETE FROM audit_log WHERE action = 'update'
       AND notes LIKE 'إلغاء طلب معاينة%'
       AND user_id IN (${DOC}, ${DOC2}, ${DOCB2}, ${ADMIN}, ${MGR})`,
  ]) await q(s);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, spec, name, branch] of [
    [ADMIN, "admin", "null", "المسؤول", 1],
    [MGR, "branch_manager", "null", "مدير بغداد", 1],
    [RECV, "reception", "null", "ريام", 1],
    [ACC, "accountant", "null", "المحاسب", 1],
    [DOC, "doctor", '["prosthetic","medical_support"]', "د. سعد", 1],
    [DOC2, "doctor", '["physiotherapy"]', "د. علاج طبيعي", 1],
    [DOCB2, "doctor", '["prosthetic","medical_support"]', "د. الفرع الثاني", 2],
    [EXPERT, "prosthetics_expert", "null", "الخبير", 1],
  ] as any[]) {
    await q(`INSERT INTO system_users
               (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$4,$3,$6,$7::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               is_active=true, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties`,
      [id, `erc_u${id}`, role, name, spec, branch, JSON.stringify([branch])]);
  }
  await cleanup();
  //  **لحظةُ البدء من القاعدة** — يُحصَر بها ثابتُ التدقيق في «ف» على سطور
  //  هذا التشغيل وحده، فلا يحكم على سطورٍ كتبها تشغيلٌ سابق.
  const runStart = (await q<{ t: string }>(`SELECT NOW()::timestamp AS t`))[0].t;

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
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

    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      const L = svc === "prosthetic" ? "أطراف" : "مساند";
      console.log(`\n═══════════════ ${L} ═══════════════`);

      // ══ أ+ب. المسارُ الطبيعيّ، وبلا سجلّ معاينةٍ ملغاة ═════════════════
      console.log(`\n── أ. المسارُ الطبيعيّ (${L}) ──`);
      {
        const p = await mkPatient(`أ-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await openDevice(p, svc);
        same("أ١. الاستقبالُ يفتح طلبَ الجهاز", ep.status, 201);
        const epId = Number(ep.body?.id);

        const before = await myRows(p);
        check(before.length === 1 && before[0].episodeId === epId,
          "أ٢. والصفُّ يظهر في «معايناتي» بهويّة جهازه", JSON.stringify(before));

        const res = await cancelRequest(p, svc, epId);
        same("أ٣. الإلغاء ينجح", res.status, 200);
        same("أ٤. ويقول أيَّ حلقةٍ أُلغيت", res.body?.cancelledEpisodeId, epId);
        check(Array.isArray(res.body?.cancelledRequestIds) && res.body.cancelledRequestIds.length === 1,
          "أ٥. ويقول أيَّ طلبِ مراجعةٍ سُحب", JSON.stringify(res.body?.cancelledRequestIds));
        same("أ٦. ويقول إن الصفَّ خرج فعلاً", res.body?.stillListed, false);

        same("أ٧. والصفُّ خرج من «معايناتي»", (await myRows(p)).length, 0);

        const eps = await epRows(p);
        check(eps.length === 1 && eps[0].status === "cancelled"
          && String(eps[0].cancel_reason ?? "").includes("أُضيف بالخطأ"),
          "أ٨. والحلقةُ ملغاةٌ بسببها المكتوب", JSON.stringify(eps));
        const reqs = await reqRows(p);
        check(reqs.length === 1 && reqs[0].status === "cancelled",
          "أ٩. وطلبُ المراجعة مسحوبٌ لا ممحوّ", JSON.stringify(reqs));
        check(String(reqs[0].doctor_note ?? "").includes("د. سعد"),
          "أ١٠. والملاحظةُ تقول مَن سحب", String(reqs[0].doctor_note));
        //  **وبلا تكرارٍ في الصدر**: كان المُنادي والكاتبُ يصدّران العبارةَ
        //  نفسَها فتُقرأ «أُلغي طلبُ الجهاز: أُلغي طلبُ الجهاز: …».
        same("أ١١. والعبارةُ غيرُ مكرَّرة",
          (String(reqs[0].doctor_note ?? "").match(/أُلغي طلبُ الجهاز:/g) ?? []).length, 1);

        // ── ب. بلا سجلّ معاينةٍ ملغاة ─────────────────────────────────────
        same("ب١. ولا معاينةَ أُنشئت", (await examRows(p)).length, 0);
        same("ب٢. ولا شاهدةَ إلغاءِ معاينة", (await examCancelRows(p)).length, 0);

        // ── ويبقى في سجلّ المرضى ─────────────────────────────────────────
        const pat = await patientRow(p);
        check(pat !== null && pat.deleted_at === null,
          "ب٣. والمريضُ باقٍ في سجلّ المرضى", JSON.stringify(pat));
        const cases = await caseRows(p);
        check(cases.length === 1 && cases[0].status === "active",
          "ب٤. وحالتُه باقيةٌ نشطةً — الحذفُ بابُ الإدارة لا هذا الزرّ",
          JSON.stringify(cases));
        same("ب٥. ولا ديناراً تحرّك", Number(pat.total_cost ?? 0), 0);
      }

      // ══ ج. الصفُّ بلا حلقة — طلبٌ على مستوى الاختصاص ═══════════════════
      console.log(`\n── ج. صفٌّ بلا حلقة (${L}) ──`);
      {
        const p = await mkPatient(`ج-${svc}`, svc);
        const c = await mkCase(p, svc);
        const rid = await mkBareRequest(p, c, svc);
        const before = await myRows(p);
        check(before.length === 1 && before[0].episodeId === null,
          "ج١. الصفُّ يظهر بلا هويّة جهاز", JSON.stringify(before));

        const res = await cancelRequest(p, svc, null);
        same("ج٢. الإلغاء ينجح", res.status, 200);
        same("ج٣. ولا حلقةَ أُلغيت", res.body?.cancelledEpisodeId, null);
        same("ج٤. والطلبُ العاري هو ما سُحب", res.body?.cancelledRequestIds, [rid]);
        same("ج٥. والصفُّ خرج", (await myRows(p)).length, 0);
        same("ج٦. ولا حلقةَ اختُرعت", (await epRows(p)).length, 0);
        same("ج٧. ولا معاينة", (await examRows(p)).length, 0);
      }

      // ══ د. بلا أشباح — الشارةُ والمرساة ═══════════════════════════════
      console.log(`\n── د. بلا أشباح (${L}) ──`);
      {
        const p = await mkPatient(`د-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await openDevice(p, svc);
        const epId = Number(ep.body?.id);
        const pendBefore = await pendingMap();
        check(Array.isArray(pendBefore.pending?.[String(p)])
          && pendBefore.pending[String(p)].includes(svc),
          "د١. الشارةُ الكهرمانية ظاهرةٌ قبل الإلغاء",
          JSON.stringify(pendBefore.pending?.[String(p)]));

        same("د٢. الإلغاء ينجح", (await cancelRequest(p, svc, epId)).status, 200);

        const pendAfter = await pendingMap();
        same("د٣. والشارةُ اختفت من سجلّ المرضى", pendAfter.pending?.[String(p)], undefined);
        const live = (await reqRows(p)).filter((r: any) =>
          r.status === "pending" || r.status === "escalated");
        same("د٤. ولا طلبَ معلَّقٌ باقٍ", live.length, 0);

        //  **والمرساةُ تحرّرت**: الاستقبالُ يرسل طلباً جديداً صحيحاً بعده.
        const again = await openDevice(p, svc);
        same("د٥. والاستقبالُ يفتح طلباً جديداً بلا ٤٠٩", again.status, 201);
        const rows2 = await myRows(p);
        check(rows2.length === 1 && rows2[0].episodeId === Number(again.body?.id),
          "د٦. فيعود الصفُّ بجهازه الجديد وحده", JSON.stringify(rows2));
      }

      // ══ هـ. ما بدأت معاينتُه لا يُلغى ═════════════════════════════════
      console.log(`\n── هـ. المعاينةُ بدأت (${L}) ──`);
      {
        const p = await mkPatient(`هـ-${svc}`, svc);
        await mkCase(p, svc);
        const ep = await openDevice(p, svc);
        const epId = Number(ep.body?.id);
        //  نقطةُ التوقيع تردّ ٢٠٠ (`res.json`) لا ٢٠١ — عقدُها القائم.
        same("هـ١. توقيعُ المعاينة ينجح", (await signExam(p, svc, epId)).status, 200);

        const before = await writable(p);
        const res = await cancelRequest(p, svc, epId);
        same("هـ٢. والإلغاءُ بعده يُردّ ٤٠٩", res.status, 409);
        same("هـ٣. برمزِ البيات", res.body?.code, "device_episode_stale");
        same("هـ٤. وبصفر كتابة", await writable(p), before);
        const exams = await examRows(p);
        check(exams.length === 1, "هـ٥. والمعاينةُ الموقّعة كما هي", JSON.stringify(exams));
        same("هـ٦. ولا شاهدةَ إلغاء", (await examCancelRows(p)).length, 0);
      }

      // ══ و. الحلقةُ الأخرى لا تُمَسّ ═══════════════════════════════════
      console.log(`\n── و. جهازان منتظران (${L}) ──`);
      {
        const p = await mkPatient(`و-${svc}`, svc);
        await mkCase(p, svc);
        const a = Number((await openDevice(p, svc)).body?.id);
        const b = Number((await openDevice(p, svc)).body?.id);
        check(a > 0 && b > 0 && a !== b, "و١. حلقتان منتظرتان على الخيط نفسه", `${a}/${b}`);
        same("و٢. وصفّان في القائمة", (await myRows(p)).length, 2);

        same("و٣. إلغاءُ الأولى ينجح", (await cancelRequest(p, svc, a)).status, 200);
        const rows = await myRows(p);
        check(rows.length === 1 && rows[0].episodeId === b,
          "و٤. ويبقى صفُّ الثانية وحدها", JSON.stringify(rows));
        const eps = await epRows(p);
        const second = eps.find((e: any) => Number(e.id) === b);
        same("و٥. والحلقةُ الثانية ما زالت منتظرة", String(second?.status), "awaiting_exam");
        const liveReqs = (await reqRows(p)).filter((r: any) => r.status === "pending");
        check(liveReqs.length === 1 && Number(liveReqs[0].device_episode_id) === b,
          "و٦. وطلبُها هي وحده الباقي معلَّقاً", JSON.stringify(liveReqs));
      }

      // ══ ز. التاريخُ الحقيقيّ مطابقٌ بايتاً ════════════════════════════
      console.log(`\n── ز. التاريخُ لا يُمَسّ (${L}) ──`);
      {
        const p = await mkPatient(`ز-${svc}`, svc);
        const c = await mkCase(p, svc);
        //  جهازٌ سابقٌ مُعايَنٌ ومُسلَّم، ودفعةٌ عليه — ثمّ طلبٌ جديد يُلغى.
        const old = Number((await openDevice(p, svc)).body?.id);
        await signExam(p, svc, old);
        await q(`UPDATE patient_device_episodes SET status='delivered', delivered_at=NOW() WHERE id=$1`, [old]);
        await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, payment_treatment_type, date)
                 VALUES ($1,1,$2,250000,'دفعة اختبار',NOW())`, [p, c]);
        const fresh = Number((await openDevice(p, svc)).body?.id);

        const before = await fingerprint(p);
        same("ز١. إلغاءُ الطلب الجديد ينجح", (await cancelRequest(p, svc, fresh)).status, 200);
        same("ز٢. وبصمةُ التاريخ مطابقةٌ بايتاً", await fingerprint(p), before);
        const eps = await epRows(p);
        const oldRow = eps.find((e: any) => Number(e.id) === old);
        same("ز٣. والجهازُ المسلَّم ما زال مسلَّماً", String(oldRow?.status), "delivered");
      }

      // ══ ح. إحالةُ الطبيب لا تُمحى ═════════════════════════════════════
      console.log(`\n── ح. الإحالة (${L}) ──`);
      {
        const p = await mkPatient(`ح-${svc}`, svc);
        const c = await mkCase(p, svc);
        await mkBareRequest(p, c, svc, { status: "escalated" });
        check((await myRows(p)).length === 1, "ح١. المُحالُ يظهر في القائمة");
        const before = await writable(p);
        const res = await cancelRequest(p, svc, null);
        same("ح٢. والإلغاءُ يُردّ ٤٠٩", res.status, 409);
        same("ح٣. برمزِ الإحالة", res.body?.code, "request_escalated");
        check(String(res.body?.error ?? "").includes("إرجاع للاستعلامات"),
          "ح٤. والرسالةُ تدلّ على البابِ الصحيح", String(res.body?.error));
        same("ح٥. وبصفر كتابة", await writable(p), before);
      }

      // ══ ط. الصلاحية ══════════════════════════════════════════════════
      console.log(`\n── ط. الصلاحية (${L}) ──`);
      {
        const p = await mkPatient(`ط-${svc}`, svc);
        await mkCase(p, svc);
        const epId = Number((await openDevice(p, svc)).body?.id);
        const before = await writable(p);
        for (const [who, label] of [
          ["recv", "الاستقبال"], ["acc", "المحاسب"], ["expert", "الخبير"], ["mgr", "مدير الفرع"],
        ] as [string, string][]) {
          same(`ط. ${label} يُردّ ٤٠٣`, (await cancelRequest(p, svc, epId, S[who])).status, 403);
        }
        same("ط. طبيبُ العلاج الطبيعي يُردّ (ليس اختصاصَه)",
          (await cancelRequest(p, svc, epId, S.doc2)).status, 403);
        same("ط. وطبيبُ فرعٍ آخر يُردّ", (await cancelRequest(p, svc, epId, S.docB2)).status, 403);
        //  **والحسابُ المعطَّل**: يُردّ قبل النقطة أصلاً بوسيط الصلاحيات
        //  الحيّ (٤٠١ + إنهاءُ الجلسة) — ولا يُنفَّذ في هذا الهيكل لأن جلسةَ
        //  الاختبار كائنٌ عاديّ بلا `destroy`. والحارسُ الثاني داخل النقطة
        //  هو `doctorSpecialties`، ويُثبَت هنا مباشرةً: تعطيلُ الحساب يُفرغ
        //  اختصاصاتِه فوراً، فلا يمرّ شرطُ الاختصاص.
        same("ط. وحسابٌ معطَّل لا اختصاصَ له (الحارسُ داخل النقطة)",
          await (async () => {
            await q(`UPDATE system_users SET is_active=false WHERE id=$1`, [DOC]);
            const specs = await medicalStore.doctorSpecialties(DOC);
            await q(`UPDATE system_users SET is_active=true WHERE id=$1`, [DOC]);
            return specs.length;
          })(), 0);
        same("ط. ولا كتابةَ من أيٍّ منهم", await writable(p), before);
        same("ط. والطبيبُ صاحبُ الاختصاص يمضي", (await cancelRequest(p, svc, epId, S.doc)).status, 200);
      }

      // ══ ي. التزامن ═══════════════════════════════════════════════════
      console.log(`\n── ي. ضغطتان متزامنتان (${L}) ──`);
      {
        const p = await mkPatient(`ي-${svc}`, svc);
        await mkCase(p, svc);
        const epId = Number((await openDevice(p, svc)).body?.id);
        const [r1, r2] = await Promise.all([
          cancelRequest(p, svc, epId), cancelRequest(p, svc, epId),
        ]);
        const codes = [r1.status, r2.status].sort();
        same("ي١. واحدةٌ تنجح والأخرى تُردّ", codes, [200, 409]);
        const eps = await epRows(p);
        check(eps.length === 1 && eps[0].status === "cancelled",
          "ي٢. وحلقةٌ واحدةٌ ملغاة لا أكثر", JSON.stringify(eps));
        const reqs = await reqRows(p);
        check(reqs.length === 1 && reqs[0].status === "cancelled",
          "ي٣. وطلبٌ واحدٌ مسحوب", JSON.stringify(reqs));
      }

      // ══ ك. السببُ والسلّةُ ومسارُ «بلا معاينة» ════════════════════════
      console.log(`\n── ك. الحُرّاس (${L}) ──`);
      {
        const p = await mkPatient(`ك-${svc}`, svc);
        await mkCase(p, svc);
        const epId = Number((await openDevice(p, svc)).body?.id);
        const before = await writable(p);

        same("ك١. سببٌ فارغ يُردّ ٤٠٠", (await cancelRequest(p, svc, epId, S.doc, "   ")).status, 400);
        same("ك٢. وسببٌ غيرُ نصٍّ يُردّ ٤٠٠", (await cancelRequest(p, svc, epId, S.doc, 7)).status, 400);
        same("ك٣. واختصاصٌ مجهول يُردّ ٤٠٠",
          (await http("POST", "/api/medical/worklist/cancel-request", S.doc,
            { patientId: p, caseType: "dentistry", deviceEpisodeId: epId, reason: "س" })).status, 400);
        same("ك٤. ومعرّفُ جهازٍ مشوَّه يُردّ ٤٠٠ ولا يُقرأ «بلا جهاز»",
          (await cancelRequest(p, svc, "abc" as any, S.doc)).status, 400);
        same("ك٥. وبصفر كتابة", await writable(p), before);

        //  **والملفُّ في السلّة بالمسار الحقيقيّ** (ترحيل ٠٦٨) لا بحقنٍ يدويّ:
        //  لقطتُه المالية يفرضها قيدٌ في القاعدة، وحقنُها بيدٍ يكتب حالةً
        //  لا ينتجها التطبيق.
        const trashDel = await http("DELETE", `/api/patients/${p}`, S.admin,
          { reason: "اختبار السلّة" });
        same("ك٦. نقلُ الملفّ إلى السلّة ينجح", trashDel.status, 200);
        const trashed = await cancelRequest(p, svc, epId);
        same("ك٧. وملفٌّ في السلّة يُردّ ٤٠٩", trashed.status, 409);
        same("ك٨. برمزه", trashed.body?.code, "patient_in_trash");
        same("ك٩. والاستعادةُ تنجح",
          (await http("POST", `/api/patient-trash/${p}/restore`, S.admin, {})).status, 200);

        //  مسارُ «بلا معاينة»
        await q(`UPDATE patient_device_episodes SET service_path='no_exam' WHERE id=$1`, [epId]);
        const noExam = await cancelRequest(p, svc, epId);
        same("ك١٠. ومسارُ «بلا معاينة» يُردّ ٤٠٩", noExam.status, 409);
        same("ك١١. برمزه", noExam.body?.code, "no_exam_path");
      }

      // ══ ل. صفٌّ لا شيءَ فيه يُلغى ═════════════════════════════════════
      console.log(`\n── ل. لا شيءَ يُلغى (${L}) ──`);
      {
        const p = await mkPatient(`ل-${svc}`, svc);
        await mkCase(p, svc);
        const res = await cancelRequest(p, svc, null);
        same("ل١. صفٌّ بلا حلقةٍ ولا طلبٍ يُردّ ٤٠٩", res.status, 409);
        same("ل٢. برمزه", res.body?.code, "nothing_to_cancel");
        //  ومريضُ فرعٍ آخر لا يُلمَس ولو كان الطبيبُ مسؤولاً عن اختصاصه
        const far = await mkPatient(`ل-بعيد-${svc}`, svc, { branch: 2 });
        await mkCase(far, svc, 2);
        same("ل٣. ومريضُ فرعٍ خارج النطاق يُردّ ٤٠٣",
          (await cancelRequest(far, svc, null, S.doc)).status, 403);
      }
    }

    // ══ م. `stillListed` صادقٌ حين يبقى الصفُّ لقاعدةٍ أخرى ═════════════
    console.log(`\n── م. ويُقال ما جرى ──`);
    {
      //  خيطٌ سابقٌ لحقبة المسار: القاعدةُ القديمة تُبقيه «ينتظر معاينة» ولو
      //  سُحب طلبُه كلُّه — وبابُه الإدارة لا هذا الزرّ. فيُقال ذلك صراحةً.
      const era = (await q<{ applied_at: string }>(
        `SELECT applied_at FROM _migrations WHERE name='065_service_path_and_prior_history'`))[0];
      check(!!era, "م٠. حقبةُ المسار معروفةٌ في هذه القاعدة", JSON.stringify(era));
      const p = await mkPatient("م-قديم", "prosthetic");
      const c = await mkCase(p, "prosthetic", 1, "2020-01-01 10:00:00");
      const rid = await mkBareRequest(p, c, "prosthetic");
      check((await myRows(p)).length === 1, "م١. الصفُّ ظاهر");
      const res = await cancelRequest(p, "prosthetic", null);
      same("م٢. الإلغاء ينجح", res.status, 200);
      same("م٣. والطلبُ سُحب فعلاً", res.body?.cancelledRequestIds, [rid]);
      same("م٤. ويقول بصدق إن الصفَّ ما زال قائماً", res.body?.stillListed, true);
      check((await myRows(p)).length === 1,
        "م٥. وهو كذلك فعلاً — القاعدةُ القديمة لا هذا الزرّ", JSON.stringify(await myRows(p)));
      const reqs = await reqRows(p);
      check(reqs.length === 1 && reqs[0].status === "cancelled",
        "م٦. ومع ذلك سُحب الطلبُ فعلاً", JSON.stringify(reqs));
    }

    // ══ س. العلاجُ الطبيعي معزولٌ — ولا زرَّ له أصلاً ═══════════════════
    console.log(`\n── س. العلاجُ الطبيعي ──`);
    {
      //  **لا حلقاتِ أجهزةٍ له ولا طلباتِ مراجعة**: `reviewServiceOfCaseType`
      //  تُرجع `null` للعلاج الطبيعي، فصفُّه يقف على القاعدة القديمة وحدها.
      //  فالخادمُ لا يجد ما يُلغى، **والشاشةُ لا تعرض الزرَّ أصلاً**.
      const p = await mkPatient("س-فيزيو", "prosthetic");
      await q(`UPDATE patients SET is_amputee=false, is_physiotherapy=true,
                 amputation_site=NULL WHERE id=$1`, [p]);
      await mkCase(p, "physiotherapy");
      const rows = await myRows(p, S.doc2);
      check(rows.length === 1 && rows[0].caseType === "physiotherapy",
        "س١. صفُّ علاجٍ طبيعي في قائمة طبيبه", JSON.stringify(rows));
      const before = await writable(p);
      const res = await cancelRequest(p, "physiotherapy", null, S.doc2);
      same("س٢. والإلغاءُ لا يجد ما يُلغى", res.status, 409);
      same("س٣. برمزه", res.body?.code, "nothing_to_cancel");
      same("س٤. وبصفر كتابة", await writable(p), before);
      same("س٥. ولا حلقةَ أجهزةٍ له إطلاقاً", (await epRows(p)).length, 0);
      same("س٦. ولا طلبَ مراجعة", (await reqRows(p)).length, 0);
    }

    // ══ ع. إتاحةٌ بلا نقل · ثمّ نقلُ المسؤولية فعلاً ═══════════════════
    console.log(`\n── ع. إتاحةٌ بلا نقل · ثمّ نقلُ المسؤولية ──`);
    for (const svc of ["prosthetic", "medical_support"] as Svc[]) {
      const L = svc === "prosthetic" ? "أطراف" : "مساند";
      //  **الفرقُ بين إتاحةِ ملفٍّ ونقلِ مسؤوليةِ عملية** (ترحيل ٠٨٠):
      //  الإتاحةُ رؤيةٌ وحدها — لا تحرّك فرعَ حلقةٍ ولا تنقل طابوراً.
      //  ونقلُ المسؤولية ينقل `ep.branch_id`، **فيصير الجهازُ عملَ الفرع
      //  الجديد**: يظهر في طابور طبيبه ويخرج من طابور الأوّل.
      //
      //  وطابورُ الطبيب وحارسُ هذا الإلغاء **يقرآن فرعَ الحلقة نفسَه**، فلا
      //  يبقى صفٌّ ظاهرٌ لا يُلغى — وهو العطبُ الذي وُضع له هذا القسم.
      const p = await mkPatient(`ع-مُتاح-${svc}`, svc);
      const c = await mkCase(p, svc, 1);
      const ep = await openDevice(p, svc, S.recv);
      same(`ع١. طلبُ جهازٍ في الفرع ١ (${L})`, ep.status, 201);
      const epId = Number(ep.body?.episode?.id ?? ep.body?.id);

      // ① **إتاحةٌ بلا نقلِ مسؤولية** — رؤيةٌ فقط.
      const grant = await http("POST", `/api/patients/${p}/branch-access`, S.admin,
        { branchId: 2, moveOpenOperations: false });
      same("ع٢. إتاحةُ الملفّ للفرع ٢ بلا نقلِ مسؤولية تنجح", grant.status, 201);
      //  **ولا صفَّ يُعاد كتابةُ فرعه** — لا المريضُ ولا الحالةُ ولا الحلقة.
      const stayed = (await q<{ p_branch: number; c_branch: number; e_branch: number }>(
        `SELECT p.branch_id AS p_branch, c.branch_id AS c_branch, e.branch_id AS e_branch
           FROM patients p
           JOIN patient_cases c ON c.id = $2
           JOIN patient_device_episodes e ON e.id = $3
          WHERE p.id = $1`, [p, c, epId]))[0];
      same("ع٣. وفرعُ المريض والحالةِ والحلقةِ يبقى ١ كما هو",
        [stayed?.p_branch, stayed?.c_branch, stayed?.e_branch], [1, 1, 1]);
      //  **والإتاحةُ وحدها لا تنقل الطابور** — هذا قرارٌ صريح لا أثرٌ جانبيّ.
      check((await myRows(p, S.docB2)).length === 0,
        "ع٤. **والإتاحةُ وحدها لا تُدخل الصفَّ طابورَ طبيب الفرع ٢**");
      const early = await cancelRequest(p, svc, epId, S.docB2);
      same("ع٥. ولا تفتح له الإلغاء", early.status, 403);
      same("ع٦. برمزه", early.body?.code, "branch_out_of_scope");
      check((await myRows(p, S.doc)).length === 1,
        "ع٧. والصفُّ ما زال في طابور طبيب الفرع ١");

      // ② **ثمّ نقلُ المسؤولية فعلاً** — الحلقةُ تنتقل، ومعها الطابور.
      const moveOp = await http("POST", `/api/patients/${p}/branch-access`, S.admin,
        { branchId: 2, moveOpenOperations: true });
      same("ع٨. نقلُ مسؤولية العملية إلى الفرع ٢ ينجح", moveOp.status, 200);
      const movedRow = (await q<{ p_branch: number; e_branch: number }>(
        `SELECT p.branch_id AS p_branch, e.branch_id AS e_branch
           FROM patients p JOIN patient_device_episodes e ON e.id = $2
          WHERE p.id = $1`, [p, epId]))[0];
      same("ع٩. **فرعُ الحلقة صار ٢ وفرعُ تسجيل المريض ما زال ١**",
        [movedRow?.p_branch, movedRow?.e_branch], [1, 2]);

      const seen = await myRows(p, S.docB2);
      check(seen.length === 1, "ع١٠. وطبيبُ الفرع ٢ يرى الصفَّ **بنقل المسؤولية**",
        JSON.stringify(seen));
      //  **وهويّةُ فرع العملية على الصفّ نفسِه** — رقماً واسماً.
      same("ع١١. **وصفُّه يحمل رقمَ فرع الحلقة واسمَه**",
        [seen[0]?.branchId, seen[0]?.branchName], [2, "فرعٌ آخر"]);
      check((await myRows(p, S.doc)).length === 0,
        "ع١٢. **وخرج من طابور طبيب الفرع ١** — المسؤوليةُ انتقلت لا نُسخت");

      // ③ **والتوقيعُ يُسجَّل بفرع الحلقة** — معاينةً ومتابعةً.
      const pS = await mkPatient(`ع-توقيعٌ-منقول-${svc}`, svc);
      await mkCase(pS, svc, 1);
      const epS = Number((await openDevice(pS, svc, S.recv)).body?.episode?.id);
      await http("POST", `/api/patients/${pS}/branch-access`, S.admin,
        { branchId: 2, moveOpenOperations: true });
      const signed = await signExam(pS, svc, epS, S.docB2);
      same("ع١٣. طبيبُ الفرع ٢ يوقّع معاينةَ الجهاز المنقول", signed.status, 200);
      const exBranch = (await q<{ branch_id: number }>(
        `SELECT branch_id FROM medical_exams WHERE patient_id=$1`, [pS]))[0];
      const fuBranch = (await q<{ branch_id: number }>(
        `SELECT branch_id FROM post_exam_followups WHERE patient_id=$1`, [pS]))[0];
      same("ع١٤. **والمعاينةُ والمتابعةُ تُسجَّلان بفرع الحلقة لا فرع التسجيل**",
        [Number(exBranch?.branch_id), Number(fuBranch?.branch_id)], [2, 2]);

      // ④ **والإتاحةُ وحدها لا توقّع حلقةَ فرعٍ آخر.**
      const pB = await mkPatient(`ع-توقيعٌ-محجوب-${svc}`, svc);
      await mkCase(pB, svc, 1);
      const epB = Number((await openDevice(pB, svc, S.recv)).body?.episode?.id);
      await http("POST", `/api/patients/${pB}/branch-access`, S.admin,
        { branchId: 2, moveOpenOperations: false });
      const blocked = await signExam(pB, svc, epB, S.docB2);
      same("ع١٥. **الإتاحةُ وحدها لا تفتح توقيعَ حلقةِ فرعٍ آخر**", blocked.status, 403);
      same("ع١٦. برمزه", blocked.body?.code, "episode_branch_out_of_scope");
      same("ع١٧. وبصفر معاينة", (await examRows(pB)).length, 0);

      const res = await cancelRequest(p, svc, epId, S.docB2);
      same("ع١٨. **ويستطيع إلغاءه** — لا صفَّ ظاهرٌ لا يُلغى", res.status, 200);
      same("ع١٩. والحلقةُ المُلغاة هي هي", res.body?.cancelledEpisodeId, epId);
      same("ع٢٠. والصفُّ خرج فعلاً", res.body?.stillListed, false);
      //  **وتدقيقُ الإلغاء بفرع الحلقة** — الحدثُ وقع حيث كان العمل.
      const auditBranch = (await q<{ branch_id: number }>(
        `SELECT branch_id FROM audit_log
          WHERE entity_type='patient_device_episode' AND entity_id=$1
          ORDER BY id DESC LIMIT 1`, [epId]))[0];
      same("ع٢١. **وسطرُ تدقيق الإلغاء بفرع الحلقة**",
        Number(auditBranch?.branch_id), 2);
      check((await myRows(p, S.docB2)).length === 0, "ع٢٢. وخرج من قائمة طبيب الفرع ٢");

      //  **والعزلُ لم يضعف بحرف**: مريضُ الفرع ١ **بلا إتاحةٍ ولا نقل** يبقى
      //  مغلقاً على طبيب الفرع ٢ تماماً كما كان.
      const home = await mkPatient(`ع-مقيم-${svc}`, svc);
      const hc = await mkCase(home, svc, 1);
      await mkBareRequest(home, hc, svc, { branch: 1 });
      const before = await writable(home);
      const denied = await cancelRequest(home, svc, null, S.docB2);
      same("ع٢٣. وطبيبُ الفرع ٢ لا يلمس مريضَ الفرع ١", denied.status, 403);
      same("ع٢٤. برمزه", denied.body?.code, "branch_out_of_scope");
      same("ع٢٥. وبصفر كتابة", await writable(home), before);
    }

    // ══ ف. سطرُ التدقيق — النوعُ يتبع معرّفَه ═══════════════════════════
    console.log(`\n── ف. هويّةُ سطرِ التدقيق ──`);
    {
      const auditOf = (t: string, id: number) =>
        q<{ id: number; notes: string }>(
          `SELECT id, notes FROM audit_log
            WHERE entity_type=$1 AND entity_id=$2 AND action='update'
              AND notes LIKE 'إلغاء طلب معاينة%' ORDER BY id DESC`, [t, id]);

      //  ① صفٌّ بحلقة ⟶ `patient_device_episode` بمعرّف الحلقة — **نفسُ عقد
      //  نقطة إلغاء الجهاز**. وأرقامُ الطلبات المسحوبة في الملاحظة كما تفعل هي.
      const p1 = await mkPatient("ف-بحلقة", "prosthetic");
      await mkCase(p1, "prosthetic");
      same("ف٠. فتحُ طلبِ جهاز", (await openDevice(p1, "prosthetic")).status, 201);
      const ep = (await epRows(p1))[0] as any;
      const r1 = await cancelRequest(p1, "prosthetic", ep.id);
      same("ف١. الإلغاء ينجح", r1.status, 200);
      same("ف٢. والحلقةُ هي المُلغاة", r1.body?.cancelledEpisodeId, ep.id);
      const epAudit = await auditOf("patient_device_episode", ep.id);
      check(epAudit.length === 1,
        "ف٣. وسطرُ التدقيق `patient_device_episode` بمعرّف الحلقة",
        JSON.stringify(epAudit));
      //  **والعطبُ بعينه**: لا سطرَ يقول «طلبُ مراجعة» ويحمل رقمَ حلقة.
      //
      //  **ويُقاس بسطور هذه العملية نفسِها لا بمطابقةِ رقمٍ عبر جدولين**:
      //  أوّلُ صياغةٍ سألت «أثمّة سطرٌ من نوع طلبِ مراجعة يحمل الرقم
      //  `ep.id`؟» — وذاك سؤالٌ عن **تصادفِ أرقام**: تسلسلا الجدولين
      //  مستقلّان، فرقمُ حلقةٍ قد يساوي رقمَ طلبٍ حقيقيٍّ آخر، فيُدان سطرٌ
      //  صحيحٌ تماماً. والسؤالُ الصحيح: **ماذا كتبت هذه العمليةُ بالضبط؟**
      //  ورقمُ المريض في الملاحظة يحسمها بلا أيّ مقارنةٍ بين الجدولين.
      const writtenFor = (pid: number) =>
        q<{ entity_type: string; entity_id: number }>(
          `SELECT entity_type, entity_id FROM audit_log
            WHERE action='update' AND notes LIKE $1 ORDER BY id`,
          [`إلغاء طلب معاينة%للمريض #${pid} —%`]);
      same("ف٤. وسطرٌ واحدٌ لهذه العملية، بنوع الحلقة ومعرّفها — ولا سطرَ طلبِ مراجعة",
        await writtenFor(p1), [{ entity_type: "patient_device_episode", entity_id: ep.id }]);

      //  ② صفٌّ بلا حلقة ⟶ `medical_review_request` بمعرّف الطلب المسحوب.
      const p2 = await mkPatient("ف-بلا-حلقة", "medical_support");
      const c2 = await mkCase(p2, "medical_support");
      const rid2 = await mkBareRequest(p2, c2, "medical_support");
      const r2 = await cancelRequest(p2, "medical_support", null);
      same("ف٥. الإلغاء ينجح", r2.status, 200);
      same("ف٦. ولا حلقةَ فيه", r2.body?.cancelledEpisodeId, null);
      const reqAudit = await auditOf("medical_review_request", rid2);
      check(reqAudit.length === 1,
        "ف٧. وسطرُه `medical_review_request` بمعرّف الطلب", JSON.stringify(reqAudit));
      //  ③ **والثابتُ العامّ**: كلُّ سطرٍ كتبته هذه النقطةُ يشير إلى صفٍّ
      //  موجودٍ **من نوعه هو**. هذا هو العطبُ بعينه محسوماً حتمياً لا
      //  بتصادفِ أرقام: رقمُ حلقةٍ تحت نوع «طلب مراجعة» يُنسَب إلى طلبٍ آخر
      //  إن وُجد بذلك الرقم، ويغيب عن تاريخ الحلقة التي أُلغيت فعلاً.
      const written = await q<{ entity_type: string; entity_id: number; notes: string }>(
        `SELECT entity_type, entity_id, notes FROM audit_log
          WHERE action='update' AND notes LIKE 'إلغاء طلب معاينة%'
            AND created_at >= $1
            AND entity_type IN ('medical_review_request','patient_device_episode')`,
        [runStart]);
      check(written.length > 0, "ف٨. النقطةُ كتبت سطورَ تدقيق فعلاً", String(written.length));
      const dangling: string[] = [];
      for (const row of written) {
        const table = row.entity_type === "medical_review_request"
          ? "medical_review_requests" : "patient_device_episodes";
        const hit = await q(`SELECT 1 FROM ${table} WHERE id=$1`, [row.entity_id]);
        if (hit.length === 0) dangling.push(`${row.entity_type}#${row.entity_id}`);
      }
      same("ف٩. وكلُّ سطرٍ يشير إلى صفٍّ موجودٍ من نوعه هو", dangling, []);
      //  والحاسمُ: **الصفُّ المُشار إليه هو الصفُّ الذي عملت عليه النقطة**
      //  — يُقاس **داخل جدول نوعه وحده**: لمريض الملاحظة نفسِه، وحالتُه
      //  `cancelled` أي أثرُ هذه النقطة بعينه.
      //
      //  **ولا تُقارَن أرقامُ جدولين**: أوّلُ صياغةٍ جمعت أرقامَ الحلقات
      //  الملغاة ثمّ سألت أيقع رقمُ سطرِ «طلب مراجعة» بينها — فحمرّت على
      //  **تصادفِ رقم** (طلبٌ رقمُه ٢ وحلقةٌ رقمُها ٢)، وهما صفّان صحيحان
      //  لا علاقةَ لأحدهما بالآخر. والسطرُ المغلوطُ حقاً يسقط هنا أيضاً:
      //  إمّا لا صفَّ بذلك الرقم في جدوله (ف٩)، أو صفٌّ لمريضٍ آخر.
      const crossed: string[] = [];
      for (const row of written) {
        const pid = Number(/للمريض #(\d+)/.exec(row.notes ?? "")?.[1] ?? NaN);
        const table = row.entity_type === "medical_review_request"
          ? "medical_review_requests" : "patient_device_episodes";
        const [hit] = await q<{ patient_id: number; status: string }>(
          `SELECT patient_id, status FROM ${table} WHERE id=$1`, [row.entity_id]);
        if (!hit || hit.patient_id !== pid || hit.status !== "cancelled") {
          crossed.push(`${row.entity_type}#${row.entity_id}`
            + ` (مريضُ السطر ${pid} · الصفّ ${hit ? `${hit.patient_id}/${hit.status}` : "غائب"})`);
        }
      }
      same("ف١٠. وكلُّ سطرٍ يشير إلى صفِّ مريضِه المُلغى في جدول نوعه", crossed, []);
    }

    // ══ ن. عقدُ الشاشة والحارسُ المعماريّ ══════════════════════════════
    console.log(`\n── ن. عقدُ الشاشة ──`);
    {
      const ui = readFileSync(join(process.cwd(), "client/src/pages/MyExams.tsx"), "utf8");
      check(ui.includes("إلغاء المعاينة"), "ن١. الزرُّ في «معايناتي»");
      check(ui.includes("/api/medical/worklist/cancel-request"),
        "ن٢. وينادي النقطةَ الحقيقية");
      check(/cancel-exam-\$\{key\}|cancel-exam-/.test(ui), "ن٣. وله وسمُ اختبار");
      check(ui.includes("كتابة معاينة") && ui.includes("الملف"),
        "ن٤. وبجانب «كتابة معاينة» و«الملف» — لا بدلاً عنهما");
      check(/deviceEpisodeId:\s*(cancelling|target)?\.?/.test(ui) || ui.includes("deviceEpisodeId"),
        "ن٥. ويرسل هويّةَ الجهاز من الصفّ");
      check(ui.includes("سبب الإلغاء"), "ن٦. وبسببٍ إلزاميّ كأخيه «إرجاع للاستعلامات»");
      //  **وللأجهزة وحدها** — بالدالّة القانونية لا بقائمةٍ مكتوبةٍ هنا.
      check(ui.includes("isDeviceServiceKind(r.caseType)")
        && ui.includes('from "@shared/prosthetic_parts"'),
        "ن٦ب. ولا يُعرَض على صفّ علاجٍ طبيعي (بالدالّة المشتركة)");

      const src = readFileSync(join(process.cwd(), "server/medical/cancel_exam_request.ts"), "utf8");
      check(!/INSERT\s+INTO\s+medical_exams?\b/i.test(src),
        "ن٧. ولا معاينةَ تُكتب في مسار الإلغاء إطلاقاً");
      //  **والمطابقةُ على استعمالٍ حقيقيّ لا على شرحٍ يذكر الاسم** — درسُ
      //  المرحلة الثالثة: حارسٌ يلتقط تعليقَ نفسِه ليس حارساً.
      check(!/(INTO|FROM|UPDATE|JOIN)\s+medical_exam_cancellations/i.test(src),
        "ن٨. ولا شاهدةَ إلغاءِ معاينة");
      check(!/DELETE\s+FROM/i.test(src), "ن٩. ولا حذفَ صفٍّ واحد");
      check(!/UPDATE\s+patient_cases|UPDATE\s+patients\b/i.test(src),
        "ن١٠. ولا مسَّ لصفّ الحالة ولا المريض");
      check(!/cost_entries|total_cost|INSERT\s+INTO\s+payments/i.test(src),
        "ن١١. ولا لمسَ مالٍ من أيّ نوع");
      check(src.includes("cancelPreManufacturingDeviceEpisodeTx")
        && src.includes("cancelScaffoldRequestsById"),
        "ن١٢. والكتابةُ بالدالّات القانونية القائمة وحدها");
    }
  } finally {
    await cleanup();
    httpServer.close();
    await pool.end();
  }

  console.log(failures === 0
    ? "\n🎉 كل الفحوص نجحت."
    : `\n❌ ${failures} فحصاً فشل.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
