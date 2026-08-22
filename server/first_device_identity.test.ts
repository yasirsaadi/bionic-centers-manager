// هويّةُ الجهاز الأول — حيّاً على Postgres وعلى النقاط نفسها.
// قاعدة محلّية: `npm run test:first-device-identity`.
//
// ══ الثغرةُ التي وُلد لها هذا الملفّ (المريض WB-02243) ═══════════════════
// ترحيلُ ٠٥٠ أعطى أوامرَ البناء التاريخية حلقاتِها — **مرّةً واحدة**.
// والمسارُ الحيّ ظلّ يبيع **الجهازَ الأول** بلا حلقة حين لا يفتح له
// الاستعلاماتُ «طلبَ جهاز» صراحةً. فمريضٌ جديد سُجّل بعد ٠٥٠، عُويِن
// واشترى وبدأ تصنيعُه — **وُلد صفُّه «تاريخياً» لحظةَ ولادته**، فيُردّ
// عليه تصحيحُ السعر بعد البيع (٢٣٩) بحجّة «مسارٌ قديم بلا هويّة جهاز».
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) **الثابتُ الجديد**: كلُّ بيعِ جهازٍ أولٍّ ينشئه التطبيقُ الحيّ يخرج
//     من معاملته بحلقةٍ دقيقة — المتابعةُ والأمرُ وقيدُ الكلفة عليها.
// (ب) **والمريضُ العائد لا يُمَسّ**: حلقةٌ واحدة لا ثانيةَ فوقها.
// (ج) **والإصلاحُ (٠٦٣) يعالج ما وقع قبل الإغلاق** — هويّةً فقط، بلا
//     دينارٍ ولا معاينةٍ تُفتح، وidempotent يُشغَّل مرّتين.
// (د) **ثمّ يمضي تصحيحُ ٢٣٩** على الملفّ المُصلَح كما لو وُلد سليماً.
// (هـ) **والملتبسُ حقاً يبقى ملتبساً** — لا يُخمَّن له جهاز.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as episodes from "./device_episodes/store";
import { sql as repairSql, name as repairName } from "./migrations/063_sold_device_identity_repair";

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

const PORT = 6857;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-هوية-الجهاز-الأول";
const ADMIN = 9891, RECV = 9892, MGR = 9893, DOC = 9894, EXPERT = 9895;
const ALL_USERS = [ADMIN, RECV, MGR, DOC, EXPERT];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول",
    permissions: { canViewPatients: true, canAddPatients: true, canDeletePatients: true },
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: { canViewPatients: true, canAddPatients: true },
  },
  mgr: {
    userId: MGR, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مدير الفرع", permissions: { canViewPatients: true, canAddPatients: true },
  },
  doc: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. المعاين", permissions: { canViewPatients: true, canWriteMedicalExam: true },
  },
  expert: {
    userId: EXPERT, role: "prosthetics_expert", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "الخبير", permissions: {},
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

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id,
       is_amputee, is_medical_support, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',
             'احادي - طرف سفلي - يمين - تحت الركبة',$3,true,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
  return r[0].id;
}
async function signExam(patientId: number, session: any, deviceCost = 1_700_000) {
  return await http("POST", `/api/medical/patients/${patientId}/exams`, session, {
    caseType: "prosthetic", diagnosis: "بتر تحت الركبة", deviceCost, prescription: {},
  });
}
async function followupsOf(patientId: number) {
  const r = await http("GET", `/api/followups/patient/${patientId}`, S.admin);
  return Array.isArray(r.body) ? r.body : [];
}
const followupOf = async (p: number) => (await followupsOf(p))[0] ?? null;
const examIdOf = async (patientId: number) =>
  (await q<{ id: number }>(
    `SELECT id FROM medical_exams WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`,
    [patientId]))[0].id;

/** الصورةُ الكاملة لهويّة جهازِ مريضٍ ومالِه — ما يجب أن يتّسق كلُّه. */
async function shape(patientId: number) {
  const eps = await q(
    `SELECT id, case_id, sequence_number, status, agreed_cost::int AS cost, requested_item
       FROM patient_device_episodes WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const [f] = await q(
    `SELECT id, device_episode_id, converted_work_order_id, approved_price::int AS price, status
       FROM post_exam_followups WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [patientId]);
  const wos = await q(
    `SELECT id, device_episode_id, purpose, status FROM prosthetic_work_orders
      WHERE patient_id=$1 ORDER BY id`, [patientId]);
  const [p] = await q(`SELECT total_cost::int AS total FROM patients WHERE id=$1`, [patientId]);
  const [c] = await q(
    `SELECT cost::int AS cost FROM patient_cases WHERE patient_id=$1 AND case_type='prosthetic'`,
    [patientId]);
  const entries = await q(
    `SELECT amount::int AS amount, source, device_episode_id FROM cost_entries
      WHERE patient_id=$1 ORDER BY id`, [patientId]);
  return { eps, f, wos, total: p?.total ?? 0, caseCost: c?.cost ?? 0, entries };
}

/** يُشغّل ترحيلَ الإصلاح كما يشغّله المُشغّل — جملةً واحدة في معاملة. */
async function runRepair() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(repairSql);
    await client.query("COMMIT");
  } catch (e) { await client.query("ROLLBACK"); throw e; } finally { client.release(); }
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
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
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
  await q(`DELETE FROM audit_log WHERE entity_type='medical_exam' AND entity_id IN
             (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
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
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x',$3,$4,$5,$6::jsonb,true,$7::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids,
               medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
      [id, `fdi_u${id}`, name, role, branch, JSON.stringify([branch]), spec]);
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
    // ══════════════════════════════════════════════════════════════════
    //  أ) **الثابتُ الجديد**: مريضٌ جديد يشتري جهازَه الأول بلا أن يفتح
    //     أحدٌ «طلبَ جهاز» صراحةً — ومع ذلك يخرج بهويّةٍ كاملة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ) الجهاز الأول: هويّةٌ تُماديَ عند البيع ──");
    let firstEpisodeId = 0;
    {
      const p = await mkPatient("جهازٌ أول");
      const caseId = await mkCase(p);
      //  **بلا نداءٍ لـ`POST /api/patients/:id/device-episodes` إطلاقاً.**
      await signExam(p, S.doc, 1_700_000);
      const f = await followupOf(p);
      same("١. (متابعةٌ فُتحت بسعر المعاينة، وبلا حلقة)",
        [f?.approvedPrice, f?.deviceEpisodeId], [1_700_000, null]);

      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const buy = await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      same("٢. **البيعُ يمرّ**", buy.status, 200);

      const s = await shape(p);
      firstEpisodeId = Number(s.eps[0]?.id ?? 0);
      same("٣. **وحلقةٌ واحدةٌ وُلدت تلقائياً** — على خيط المريض بعينه",
        [s.eps.length, Number(s.eps[0]?.case_id), Number(s.eps[0]?.sequence_number)],
        [1, caseId, 1]);
      same("٤. **حالتُها `in_manufacturing` وسعرُها سعرُ البيع**",
        [s.eps[0]?.status, s.eps[0]?.cost], ["in_manufacturing", 1_700_000]);
      same("٥. **وجهازٌ كامل** — ولا جزءٌ يُخترَع",
        s.eps[0]?.requested_item, "full_device");
      same("٦. **والمتابعةُ تشير إليها**",
        Number(s.f?.device_episode_id), firstEpisodeId);
      same("٧. **وأمرُ التصنيع الوحيد يشير إليها هي**",
        [s.wos.length, Number(s.wos[0]?.device_episode_id), s.wos[0]?.purpose],
        [1, firstEpisodeId, "initial_build"]);
      same("٨. **وقيدُ كلفة البيع موسومٌ بها**",
        s.entries.filter((e: any) => e.source === "assign_manufacturing")
          .map((e: any) => [e.amount, Number(e.device_episode_id)]),
        [[1_700_000, firstEpisodeId]]);
      same("٩. (والمالُ كما كان دائماً)", [s.total, s.caseCost],
        [1_700_000, 1_700_000]);
    }

    //  **وتصحيحُ ٢٣٩ يمضي على هذا المريض فوراً** — وهو الغرضُ كلُّه.
    {
      const p = await mkPatient("جهازٌ أول ثمّ تصحيح");
      await mkCase(p);
      await signExam(p, S.doc, 1_700_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      const examId = await examIdOf(p);
      const r = await http("PATCH", `/api/medical/exams/${examId}`, S.doc, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
        deviceCost: 1_750_000, priceCorrectionReason: "خطأ في إدخال السعر أثناء المعاينة",
      });
      same("١٠. **وتصحيحُ ما بعد البيع يُقبل فوراً** — لا «مسارٌ قديم»", r.status, 200);
      const s = await shape(p);
      same("١١. **والمال كلُّه تبعه**",
        [Number(s.eps[0]?.cost), s.f?.price, s.total, s.caseCost],
        [1_750_000, 1_750_000, 1_750_000, 1_750_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ب) **المريضُ العائد لا يُمَسّ** — حلقتُه الصريحة هي المستعملة.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب) المريض العائد: حلقةٌ واحدة لا ثانية ──");
    {
      const p = await mkPatient("عائدٌ بطلبٍ صريح");
      await mkCase(p);
      const ep = await episodes.startDeviceEpisode({
        patientId: p, serviceType: "prosthetic", createdBy: MGR,
      });
      const epId = (ep as any).id ?? ep;
      await signExam(p, S.doc, 900_000);
      const f = await followupOf(p);
      same("١٢. (المعاينةُ طالبت الحلقةَ الصريحة)",
        Number(f?.deviceEpisodeId), Number(epId));
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      same("١٣. (والبيعُ مرّ)",
        (await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {})).status, 200);
      const s = await shape(p);
      same("١٤. **حلقةٌ واحدة فقط** — لا ثانيةَ فُتحت فوق الصريحة",
        [s.eps.length, Number(s.eps[0]?.id)], [1, Number(epId)]);
      same("١٥. **والثلاثةُ عليها**: المتابعة والأمر والقيد",
        [Number(s.f?.device_episode_id), Number(s.wos[0]?.device_episode_id),
          Number(s.entries.find((e: any) => e.source === "assign_manufacturing")?.device_episode_id)],
        [Number(epId), Number(epId), Number(epId)]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ج) **الضغطةُ المزدوجة لا تُنتج حلقتين** (§٩).
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج) ضغطتان متزامنتان ──");
    {
      const p = await mkPatient("ضغطتان");
      await mkCase(p);
      await signExam(p, S.doc, 1_200_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      const [a, b] = await Promise.all([
        http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {}),
        http("POST", `/api/followups/${f.id}/confirm-purchase`, S.mgr, {}),
      ]);
      same("١٦. **واحدةٌ تنجح والأخرى تُردّ**",
        [a.status, b.status].sort((x, y) => x - y).map((s) => s === 200 ? "ok" : "refused"),
        ["ok", "refused"]);
      const s = await shape(p);
      same("١٧. **وحلقةٌ واحدة وأمرٌ واحد** — لا ازدواج",
        [s.eps.length, s.wos.length], [1, 1]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  د) **ترحيلُ الإصلاح ٠٦٣** — الشكلُ الإنتاجيّ بالضبط (WB-02243).
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د) إصلاحُ ما وقع قبل الإغلاق (٠٦٣) ──");
    {
      const p = await mkPatient("شكلُ الإنتاج");
      const caseId = await mkCase(p);
      await signExam(p, S.doc, 1_700_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      //  **يُعاد الملفُّ إلى الشكل الإنتاجيّ بالضبط**: بيعٌ حقيقيّ وأمرٌ
      //  حقيقيّ، ثمّ تُنزَع الهويّةُ من الطرفين وتُحذف الحلقة — كما لو
      //  أن البيعَ جرى قبل إغلاق الباب.
      const before = await shape(p);
      const woId = Number(before.wos[0].id);
      await q(`UPDATE post_exam_followups SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await q(`UPDATE prosthetic_work_orders SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await q(`UPDATE cost_entries SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await q(`DELETE FROM patient_device_episodes WHERE patient_id=$1`, [p]);
      const legacy = await shape(p);
      same("١٨. (الشكلُ الإنتاجيّ: بيعٌ وأمرٌ بلا هويّة)",
        [legacy.eps.length, legacy.f?.device_episode_id, legacy.wos[0]?.device_episode_id,
          legacy.f?.status, legacy.total],
        [0, null, null, "converted", 1_700_000]);
      const examBefore = (await q(
        `SELECT version, device_cost::int AS c, device_episode_id, edited_at
           FROM medical_exams WHERE patient_id=$1`, [p]))[0];

      await runRepair();

      const s = await shape(p);
      same("١٩. **حلقةٌ واحدةٌ بالضبط أُنشئت**", s.eps.length, 1);
      same("٢٠. **على الخيط الصحيح وبرقمٍ متسلسل**",
        [Number(s.eps[0].case_id), Number(s.eps[0].sequence_number)], [caseId, 1]);
      same("٢١. **سعرُها سعرُ المتابعة الدقيق** — لا مجموعُ المريض",
        s.eps[0].cost, 1_700_000);
      same("٢٢. **وحالتُها `in_manufacturing`** — من دورة حياة الأمر",
        s.eps[0].status, "in_manufacturing");
      same("٢٣. **والمتابعةُ تشير إليها**",
        Number(s.f?.device_episode_id), Number(s.eps[0].id));
      same("٢٤. **والأمرُ نفسُه يشير إليها** — ولا أمرَ ثانٍ",
        [s.wos.length, Number(s.wos[0].id), Number(s.wos[0].device_episode_id)],
        [1, woId, Number(s.eps[0].id)]);
      same("٢٥. **ولا دينارَ تحرّك**: مجموعُ المريض وكلفةُ الخيط كما كانا",
        [s.total, s.caseCost], [1_700_000, 1_700_000]);
      same("٢٦. **ولا قيدَ كلفةٍ زائد ولا مبلغٌ تغيّر**",
        s.entries.map((e: any) => [e.amount, e.source]),
        legacy.entries.map((e: any) => [e.amount, e.source]));
      same("٢٧. **ولا دفعةَ**",
        (await q(`SELECT count(*)::int AS n FROM payments WHERE patient_id=$1`, [p]))[0].n, 0);
      const examAfter = (await q(
        `SELECT version, device_cost::int AS c, device_episode_id, edited_at
           FROM medical_exams WHERE patient_id=$1`, [p]))[0];
      same("٢٨. **والمعاينةُ المختومة لم تُمَسّ بحرف** — ولا عمودُ هويّتها",
        JSON.stringify(examAfter), JSON.stringify(examBefore));

      //  ══ idempotent: تشغيلٌ ثانٍ لا يغيّر شيئاً ══════════════════════
      await runRepair();
      const twice = await shape(p);
      same("٢٩. **وتشغيلُه مرّةً ثانية لا يغيّر شيئاً** — لا حلقةَ مكرّرة",
        JSON.stringify({ eps: twice.eps, f: twice.f, wos: twice.wos,
          total: twice.total, caseCost: twice.caseCost }),
        JSON.stringify({ eps: s.eps, f: s.f, wos: s.wos,
          total: s.total, caseCost: s.caseCost }));

      //  ══ ثمّ يمضي تصحيحُ ٢٣٩ على الملفّ المُصلَح ═════════════════════
      const examId = await examIdOf(p);
      const r = await http("PATCH", `/api/medical/exams/${examId}`, S.doc, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
        deviceCost: 1_750_000, priceCorrectionReason: "خطأ في إدخال السعر أثناء المعاينة",
      });
      same("٣٠. **وتصحيحُ ٢٣٩ يُقبل بعد الإصلاح** — والمعاينةُ بلا هويّة جهاز",
        r.status, 200);
      const fin = await shape(p);
      same("٣١. **والستّةُ تحرّكت معاً**",
        [Number(fin.eps[0].cost), fin.f?.price, fin.total, fin.caseCost,
          (await q(`SELECT device_cost::int AS c FROM medical_exams WHERE id=$1`, [examId]))[0].c],
        [1_750_000, 1_750_000, 1_750_000, 1_750_000, 1_750_000]);
      same("٣٢. **وقيدُ تصحيحٍ واحدٌ بالفرق، موسومٌ بالحلقة**",
        fin.entries.filter((e: any) => e.source === "exam_price_correction")
          .map((e: any) => [e.amount, Number(e.device_episode_id)]),
        [[50_000, Number(fin.eps[0].id)]]);
      same("٣٣. **وأمرُ التصنيع نفسُه باقٍ** — لا ثانيَ له",
        [fin.wos.length, Number(fin.wos[0].id)], [1, woId]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  هـ) **الحالاتُ الجزئية** (§٤).
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ) الحالات الجزئية ──");
    //  (أ) المتابعةُ بلا حلقة والأمرُ يحملها — وهو ما خلّفه ٠٥٠.
    {
      const p = await mkPatient("أمرٌ يحمل والمتابعةُ لا");
      await mkCase(p);
      await signExam(p, S.doc, 800_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      const s0 = await shape(p);
      const epId = Number(s0.eps[0].id);
      await q(`UPDATE post_exam_followups SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await runRepair();
      const s = await shape(p);
      same("٣٤. **(أ) تُربَط المتابعةُ بحلقة أمرِها** — ولا حلقةَ جديدة",
        [s.eps.length, Number(s.f?.device_episode_id)], [1, epId]);
    }
    //  (ب) المتابعةُ تحملها والأمرُ لا.
    {
      const p = await mkPatient("المتابعةُ تحمل والأمرُ لا");
      await mkCase(p);
      await signExam(p, S.doc, 700_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      const s0 = await shape(p);
      const epId = Number(s0.eps[0].id);
      await q(`UPDATE prosthetic_work_orders SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await runRepair();
      const s = await shape(p);
      same("٣٥. **(ب) يُربَط الأمرُ بحلقة متابعته**",
        [s.eps.length, Number(s.wos[0]?.device_episode_id)], [1, epId]);
    }
    //  (د) كلٌّ على حلقةٍ مختلفة ⟶ **لا يُمَسّ أحدُهما**.
    {
      const p = await mkPatient("حلقتان مختلفتان");
      const caseId = await mkCase(p);
      await signExam(p, S.doc, 600_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      const s0 = await shape(p);
      const epA = Number(s0.eps[0].id);
      const other = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes
           (patient_id, case_id, branch_id, sequence_number, status, agreed_cost)
         VALUES ($1,$2,1,9,'delivered',0) RETURNING id`, [p, caseId]);
      const epB = Number(other[0].id);
      await q(`UPDATE prosthetic_work_orders SET device_episode_id=$1 WHERE patient_id=$2`,
        [epB, p]);
      await runRepair();
      const s = await shape(p);
      same("٣٦. **(د) الاختلافُ لا يُمَسّ ولا يُخمَّن** — كلٌّ كما هو",
        [Number(s.f?.device_episode_id), Number(s.wos[0]?.device_episode_id)], [epA, epB]);
    }

    // ══════════════════════════════════════════════════════════════════
    //  و) **الملتبسُ حقاً يبقى ملتبساً** (§٥) — بلا رابطٍ حتميّ لا إصلاح.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و) الملتبسُ لا يُخمَّن ──");
    {
      const p = await mkPatient("ملتبسٌ بلا رابط");
      await mkCase(p);
      await signExam(p, S.doc, 500_000);
      const f = await followupOf(p);
      await http("POST", `/api/followups/${f.id}/expert`, S.recv, { expertUserId: EXPERT });
      await http("POST", `/api/followups/${f.id}/confirm-purchase`, S.recv, {});
      await q(`UPDATE post_exam_followups
                  SET device_episode_id=NULL, converted_work_order_id=NULL
                WHERE patient_id=$1`, [p]);
      await q(`UPDATE prosthetic_work_orders SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await q(`UPDATE cost_entries SET device_episode_id=NULL WHERE patient_id=$1`, [p]);
      await q(`DELETE FROM patient_device_episodes WHERE patient_id=$1`, [p]);
      const before = await shape(p);
      await runRepair();
      const s = await shape(p);
      same("٣٧. **بلا `converted_work_order_id` لا حلقةَ تُخترَع**",
        [s.eps.length, s.f?.device_episode_id], [0, null]);
      same("٣٨. **ولا شيءَ تحرّك إطلاقاً**",
        [s.total, s.caseCost, s.wos[0]?.device_episode_id],
        [before.total, before.caseCost, null]);
      const examId = await examIdOf(p);
      const r = await http("PATCH", `/api/medical/exams/${examId}`, S.doc, {
        caseType: "prosthetic", diagnosis: "بتر تحت الركبة", prescription: {},
        deviceCost: 550_000, priceCorrectionReason: "تصحيح",
      });
      same("٣٩. **و٢٣٩ يبقى يردّ ٤٠٩ على الملتبس حقاً** — لا تخمين", r.status, 409);
    }

    // ══════════════════════════════════════════════════════════════════
    //  ز) **الترحيلُ مسجَّلٌ في المُشغّل** — وإلّا لم يجرِ على الإنتاج.
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز) تسجيلُ الترحيل ──");
    {
      const { readFileSync } = await import("fs");
      const runner = readFileSync("server/migrations/runner.ts", "utf8");
      check(runner.includes("063_sold_device_identity_repair")
        && /migration062,\s*migration063\]/.test(runner),
      "٤٠. **٠٦٣ مستورَدٌ ومُدرَجٌ في نهاية القائمة**", "");
      same("٤١. (واسمُه كما يسجّله المُشغّل)", repairName, "063_sold_device_identity_repair");
      check(!repairSql.includes("DROP ") && !repairSql.includes("ALTER TABLE")
        && !repairSql.includes("DELETE FROM")
        && !repairSql.includes("medical_exams")
        && !repairSql.includes("payments")
        && !repairSql.includes("total_cost")
        && !repairSql.includes("allow_exam_edit"),
      "٤٢. **ولا عمليةَ هدم ولا مالٍ ولا معاينةٍ في نصّه**", "");
      check(!repairSql.includes("`"),
        "٤٣. **ولا علامة اقتباس خلفية داخل نصّ الترحيل**", "");
    }
  } finally {
    server.close();
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [ALL_USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL_USERS]);
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصاً فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
