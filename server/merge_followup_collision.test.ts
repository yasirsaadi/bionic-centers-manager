// دمجُ ملفّين ومتابعاتُ ما بعد المعاينة — **لا قرارَ يُختلَق، ولا نصفُ دمج**.
// قاعدة محلّية: `npm run test:merge-followup-collision`.
//
// ══ الواقعة ═══════════════════════════════════════════════════════════════
// ملفّان مكرّران لنفس الشخص، لكلٍّ منهما متابعةٌ حيّة لنفس الخدمة. فكان
// الدمجُ **يُغلق متابعةَ المصدر `closed_without_purchase`** ويُلحق بها حدثاً
// يقول إنها أُغلقت عند الدمج.
//
// **و«لم يشترِ» واقعةٌ قالها المريض** — تظهر في «تم الحسم» (§4.l) قرارَ شراءٍ
// حقيقياً يقرؤه الموظّفُ والتقارير. ودمجُ ملفّين إجراءٌ إداريّ لا يقول عن
// رغبة المريض شيئاً. فكان النظامُ **يختلق قراراً لم يقع**.
//
// ══ القاعدةُ التي يحرسها هذا الملفّ ═══════════════════════════════════════
// (أ) **لا تُغلَق متابعةٌ بسبب الدمج إطلاقاً** — ولا يُلحَق حدثُ إغلاق.
// (ب) **والحلقاتُ المختلفة تتعايش**: متابعتان لحلقتين مختلفتين تبقيان حيّتين
//     معاً بعد الدمج — `uq_pef_active_episode` فريدٌ على الحلقة لا على المريض.
// (ج) **والتصادمُ الحقيقيُّ وحدَه يُرفَض**: متابعتان حيّتان **بلا حلقة** لنفس
//     الخدمة (`uq_pef_active_legacy`) ⟶ يُردّ الدمجُ كلُّه **بصفر كتابة**.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";

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

const PORT = 6877;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-دمج-المتابعات";
const ADMIN = 9971, RECV = 9972, MGR = 9973, DOC = 9974, EXPERT = 9975;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول",
    permissions: {
      canViewPatients: true, canAddPatients: true, canEditPatients: true,
      canDeletePatients: true, canViewPayments: true,
    },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين",
    permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
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

let phoneSeq = 0;
async function mkPatient(label: string) {
  const phone = `0770${String(4300000 + (phoneSeq++)).padStart(7, "0")}`;
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,$3,$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',1,true,false,0,'past') RETURNING id`,
    [`${MARK} ${label}`, MARK, phone]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function signExam(patientId: number, deviceEpisodeId?: number) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, S.doc, {
    idempotencyKey: crypto.randomUUID(),
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
    ...(deviceEpisodeId ? { deviceEpisodeId } : {}),
  });
}

/** ملفٌّ بمتابعةٍ حيّةٍ **مرتبطةٍ بحلقة**. */
async function fileWithEpisodeFollowup(label: string) {
  const patientId = await mkPatient(label);
  const caseId = await mkCase(patientId);
  const ep = await episodes.startDeviceEpisode({
    patientId, serviceType: "prosthetic", createdBy: MGR,
    requestedItem: "full_device" as any,
  });
  const episodeId = Number((ep as any).id ?? ep);
  const exam = await signExam(patientId, episodeId);
  return { patientId, caseId, episodeId, examOk: exam.status < 300 };
}

/**
 * ملفٌّ بمتابعةٍ حيّةٍ **بلا حلقة** — توقيعُ معاينةٍ قبل أن يُفتَح طلبُ جهاز.
 * مسارٌ قائمٌ ومدعوم (§4.p: «صفرٌ = معاينةٌ بلا جهاز»).
 */
async function fileWithLegacyFollowup(label: string) {
  const patientId = await mkPatient(label);
  const caseId = await mkCase(patientId);
  const exam = await signExam(patientId);
  return { patientId, caseId, examOk: exam.status < 300 };
}

async function followups(patientId: number) {
  return await q<{ id: number; status: string; ep: number | null; reason: string | null }>(
    `SELECT id, status, device_episode_id AS ep, closed_reason AS reason
       FROM post_exam_followups WHERE patient_id=$1 ORDER BY id`, [patientId]);
}
async function closeEvents(patientIds: number[]) {
  return await q(
    `SELECT followup_id, event_type FROM post_exam_followup_events
      WHERE patient_id = ANY($1::int[])
        AND event_type = 'closed_without_purchase' ORDER BY id`, [patientIds]);
}
/** لقطةٌ كاملة لإثبات «صفر كتابة» عند الرفض. */
async function snapshot(ids: number[]) {
  const pats = await q(
    `SELECT id, name, total_cost::int AS total, deleted_at
       FROM patients WHERE id = ANY($1::int[]) ORDER BY id`, [ids]);
  const cases = await q(
    `SELECT id, patient_id, case_type, cost::int AS cost FROM patient_cases
      WHERE patient_id = ANY($1::int[]) ORDER BY id`, [ids]);
  const fus = await q(
    `SELECT id, patient_id, status, device_episode_id, closed_reason, last_note
       FROM post_exam_followups WHERE patient_id = ANY($1::int[]) ORDER BY id`, [ids]);
  const evs = await q(
    `SELECT id, followup_id, event_type FROM post_exam_followup_events
      WHERE patient_id = ANY($1::int[]) ORDER BY id`, [ids]);
  const eps = await q(
    `SELECT id, patient_id, case_id, status, sequence_number FROM patient_device_episodes
      WHERE patient_id = ANY($1::int[]) ORDER BY id`, [ids]);
  const exams = await q(
    `SELECT id, patient_id, device_episode_id FROM medical_exams
      WHERE patient_id = ANY($1::int[]) ORDER BY id`, [ids]);
  return { pats, cases, fus, evs, eps, exams };
}

const merge = (sourceId: number, targetId: number) =>
  http("POST", "/api/admin/patients/merge", S.admin, { sourceId, targetId });

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM administrative_operation_reversals WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
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
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, spec] of [
    [ADMIN, "admin", "المسؤول", "[]"],
    [RECV, "reception", "استعلامات", "[]"],
    [MGR, "branch_manager", "مدير الفرع", "[]"],
    [DOC, "doctor", "د. المعاين", '["prosthetic","medical_support"]'],
    [EXPERT, "prosthetics_expert", "الخبير", "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,1,'[1]'::jsonb,true,$5::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `mfc_u${id}`, name, role, spec]);
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
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const server = createServer(app);
  await registerRoutes(server as any, app as any);
  (app as any).use = realUse;
  await new Promise<void>((r) => server.listen(PORT, "127.0.0.1", () => r()));

  try {
    // ══ أ. الواقعة: ملفّان لكلٍّ متابعةٌ حيّة لنفس الخدمة ════════════════
    console.log("\n── أ. متابعتان حيّتان بحلقتين مختلفتين ──");
    {
      const src = await fileWithEpisodeFollowup("مصدر-حلقة");
      const tgt = await fileWithEpisodeFollowup("هدف-حلقة");
      check(src.examOk && tgt.examOk, "١. وُقّعت معاينةٌ على كلّ ملفّ", "");

      const sBefore = await followups(src.patientId);
      const tBefore = await followups(tgt.patientId);
      same("٢. لكلّ ملفٍّ متابعةٌ حيّةٌ واحدة بحلقتها",
        [sBefore.length, tBefore.length, sBefore[0]?.ep !== null, tBefore[0]?.ep !== null],
        [1, 1, true, true]);
      check(sBefore[0].ep !== tBefore[0].ep, "   والحلقتان مختلفتان", "");

      const res = await merge(src.patientId, tgt.patientId);
      check(res.status < 300, "٣. الدمجُ نجح", JSON.stringify(res.body));

      const after = await followups(tgt.patientId);
      same("٤. **والمتابعتان معاً على الملفّ الباقي**", after.length, 2);
      same("٥. **وكلتاهما حيّة** — لا إغلاقَ بسبب الدمج",
        after.map((f) => f.status).sort(), ["awaiting_patient_decision", "awaiting_patient_decision"]);
      same("٦. **ولا «لم يشترِ» مختلَقة**",
        after.filter((f) => f.status === "closed_without_purchase"), []);
      same("٧. **ولا حدثَ إغلاقٍ أُلحق**",
        await closeEvents([src.patientId, tgt.patientId]), []);
      //  والحلقتان محفوظتان بمعرّفيهما — الهويّةُ لا تُدمَج.
      same("٨. وكلُّ متابعةٍ ما زالت على حلقتها هي",
        after.map((f) => f.ep).sort((a, b) => Number(a) - Number(b)),
        [src.episodeId, tgt.episodeId].sort((a, b) => a - b));
    }

    // ══ ب. متابعةٌ بلا حلقة مع أخرى لها حلقة — تتعايشان ═════════════════
    console.log("\n── ب. بلا حلقة + بحلقة — لا تصادم ──");
    {
      const src = await fileWithLegacyFollowup("مصدر-بلا-حلقة");
      const tgt = await fileWithEpisodeFollowup("هدف-بحلقة");
      const sBefore = await followups(src.patientId);
      same("٩. متابعةُ المصدر بلا حلقة", sBefore[0]?.ep, null);

      const res = await merge(src.patientId, tgt.patientId);
      check(res.status < 300, "١٠. الدمجُ نجح", JSON.stringify(res.body));

      const after = await followups(tgt.patientId);
      same("١١. **والاثنتان حيّتان معاً**",
        [after.length, after.every((f) => f.status === "awaiting_patient_decision")],
        [2, true]);
      same("١٢. **ولا حدثَ إغلاق**",
        await closeEvents([src.patientId, tgt.patientId]), []);
    }

    // ══ ج. التصادمُ الحقيقيّ: متابعتان حيّتان بلا حلقة لنفس الخدمة ═══════
    console.log("\n── ج. التصادمُ الحقيقيّ — يُرفض الدمجُ كلُّه ──");
    {
      const src = await fileWithLegacyFollowup("مصدر-تصادم");
      const tgt = await fileWithLegacyFollowup("هدف-تصادم");
      const sBefore = await followups(src.patientId);
      const tBefore = await followups(tgt.patientId);
      same("١٣. متابعتان حيّتان بلا حلقة لنفس الخدمة",
        [sBefore[0]?.ep, tBefore[0]?.ep, sBefore[0]?.status, tBefore[0]?.status],
        [null, null, "awaiting_patient_decision", "awaiting_patient_decision"]);

      const before = await snapshot([src.patientId, tgt.patientId]);
      const res = await merge(src.patientId, tgt.patientId);
      check(res.status >= 400, "١٤. **والدمجُ يُردّ**", `status=${res.status}`);
      const msg = String(res.body?.message ?? res.body?.error ?? "");
      check(msg.includes("لا يمكن الدمج") && msg.includes("احسم")
        && msg.includes("لم يتغيّر شيء"),
        "١٥. **برسالةٍ تقول السبب والمخرج وأن شيئاً لم يتغيّر**", msg);
      check(msg.includes("طرف صناعي") || msg.includes("أطراف"),
        "   وتسمّي الخدمةَ بالعربية", msg);

      const after = await snapshot([src.patientId, tgt.patientId]);
      same("١٦. **وصفرُ كتابة** — الملفّان كما وُجدا بايتاً", after, before);
      same("   ولا متابعةَ أُغلقت",
        after.fus.filter((f: any) => f.status !== "awaiting_patient_decision"), []);
      same("   ولا حدثَ إغلاقٍ أُلحق",
        await closeEvents([src.patientId, tgt.patientId]), []);

      // ── والمخرجُ يعمل فعلاً: يُحسم أحدُ القرارين ثمّ يمضي الدمج ──
      const closed = await http("POST", `/api/followups/${sBefore[0].id}/close`, S.admin,
        { reason: "other", note: "قرارُ المريض الحقيقيّ" });
      check(closed.status < 300, "١٧. حُسم قرارُ المصدر من بابه", JSON.stringify(closed.body));

      const res2 = await merge(src.patientId, tgt.patientId);
      check(res2.status < 300, "١٨. **ثمّ يمضي الدمج**", JSON.stringify(res2.body));
      const merged = await followups(tgt.patientId);
      same("١٩. والحيّةُ واحدةٌ والمحسومةُ محفوظةٌ بسببها الحقيقيّ",
        [merged.length,
          merged.filter((f) => f.status === "awaiting_patient_decision").length,
          merged.filter((f) => f.status === "closed_without_purchase").length],
        [2, 1, 1]);
    }

    // ══ د. حارسٌ معماريّ: لا إغلاقَ تلقائيّ في مسار الدمج ════════════════
    console.log("\n── د. الحارسُ المعماريّ ──");
    {
      const { readFileSync } = await import("fs");
      const src = readFileSync("server/storage.ts", "utf8");
      const mergeBody = src.slice(src.indexOf("async mergePatients"),
        src.indexOf("async mergePatients") + 26000);
      check(!mergeBody.includes("أُغلقت تلقائياً عند دمج الملفّين"),
        "٢٠. **لا نصَّ إغلاقٍ تلقائيّ بقي في مسار الدمج**", "");
      check(!/SET status = 'closed_without_purchase'/.test(mergeBody),
        "٢١. **ولا كتابةَ `closed_without_purchase` إطلاقاً**", "");
      check(mergeBody.includes("uq_pef_active_legacy"),
        "٢٢. والحارسُ الجديد يشرح الفهرسَ الذي يحميه", "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص دمج المتابعات نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
