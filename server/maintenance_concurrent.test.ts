// **أوامرُ صيانةٍ متزامنة بلا حدّ** (المرحلةُ الأولى من تبسيط الصيانة،
// ترحيل ٠٨٢ — ٢٠٢٦-٠٩-١٧) — حيّاً على Postgres وعلى النقطة الحقيقية
// `/api/no-exam/maintenance`.
// قاعدة محلّية: `npm run test:maintenance-concurrent`.
//
// ══ الثابتُ الذي يحرسه ═══════════════════════════════════════════════════
// **أيُّ عددٍ من أوامر الصيانة مفتوحةٌ معاً — حتى لنفس الجهاز ونفس القطعة
// ونفس الخبير.** كلُّ أمرٍ عمليةٌ مستقلّة بأمرها وزيارتها وقيدِ كلفتها، ولا
// يُحسَب أمرٌ على أمرٍ آخر ولا يُقيَّد مبلغٌ مرّتين.
//
// ══ **وبناءُ الجهاز الأوّليّ لم يُمَسّ بحرف** ═════════════════════════════
// `uq_pwo_one_open_build_per_episode` و`uq_pwo_one_open_legacy_build` (٠٧٣)
// قائمان، وحارسُهما في `createWorkOrderForExisting` كما كان — وهذا مُثبَتٌ
// هنا **بالعكس**: بناءان يُردّان فعلاً بينما صيانتان تمرّان.
//
// وما يُثبته، بندَ بندٍ (أ–ز):
//   • **أ**: حالةُ القاعدة — فهرسا الصيانة مرفوعان، وفهرسا البناء قائمان،
//     والترحيلُ idempotent ومسجَّلٌ في المُشغِّل.
//   • **ب**: **سيناريو المالك بالحرف** — صيانتان متتاليتان لنفس الجهاز
//     ونفس القطعة ونفس الخبير: أمران مستقلّان، كلاهما مفتوح.
//   • **ج**: والمتزامنتان فعلاً (`Promise.all`) — كلتاهما تنجح.
//   • **د**: وجهازٌ قديم غير مسجَّل — صيانتان متزامنتان بلا حلقة.
//   • **هـ**: **وبناءان ما زالا مرفوضين** — في القاعدة وفي منطق التطبيق.
//   • **و**: كلُّ أمرٍ بمبلغه — لا قيدَ مزدوجٌ ولا قيدٌ ضائع.
//   • **ز**: حارسٌ معماريّ — لا فرعَ صيانةٍ عاد إلى شرط المزاحمة.
//
// ══ **وتذكرةُ الإرسال — المنعُ التقنيُّ للتكرار** (٢٠٢٦-٠٩-١٨) ═════════════
// رفعُ الحدّ أعلاه أزال ما كان يمسك التكرارَ **صدفةً**، فصار لا بدّ من منعٍ
// **يفرّق بدقّة** بين ضغطتين لعمليةٍ واحدة وعمليتين حقيقيتين متطابقتين.
// و`submission_tokens` (ترحيل ٠٤٠) هو ذاك التفريق — بلا ترحيلٍ جديد، وبلا
// أيّ قيدٍ تجاريّ يعود:
//   • **ح**: **نفسُ الرمز** + نفسُ الطلب + إرسالان متزامنان ⟶ **عمليةٌ واحدة
//     بكلّ آثارها**: أمرٌ · زيارةٌ · قيدُ كلفةٍ · دفعةٌ · سطرا تدقيقٍ — واحدٌ
//     من كلٍّ بالضبط، والثانيةُ تُردّ نجاحاً آمناً بصفر كتابة.
//   • **ط**: **رمزان مختلفان** + نفسُ البيانات + إرسالان متزامنان ⟶
//     **عمليتان مستقلّتان بكلّ آثارهما**. وهذا هو الثابتُ الذي لا يجوز أن
//     يكسره منعُ التكرار.
//   • **ي**: **وفشلُ المعاملة يُرجع حجزَ الرمز معها** — فتُعاد المحاولةُ
//     بالرمز عينه وتنجح، ولا يُقرأ «مسجَّلة سابقاً» كذباً على عمليةٍ لم تقع.
//   • **ك**: **والتذكرةُ إلزاميةٌ على النقطة العامّة** (٢٠٢٦-٠٩-١٨) — طلبٌ
//     بلا رمزٍ (بأشكال غيابه الخمسة) يُردّ ٤٠٠ **بصفر كتابةٍ تشغيلية أو
//     مالية**: لا أمرَ ولا زيارةَ ولا قيدَ كلفةٍ ولا دفعةَ ولا تدقيق. ومعه
//     عقدُ الشاشة: زرُّ الحفظ لا يجهز قبل أن تُسكّ التذكرة.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as mfg from "./manufacturing/store";
import { sql as MIG082, name as NAME082 } from "./migrations/082_concurrent_maintenance_orders";
import { MAINTENANCE_TOKEN_REQUIRED_MESSAGE } from "@shared/maintenance";

const MFG_STORE_SRC = readFileSync(
  join(process.cwd(), "server/manufacturing/store.ts"), "utf8");
/** مصدرُ نافذة العملية — بلا تعليقات، فلا يمرّ فحصُ العقد على ذكرٍ بدل كود. */
const DIALOG_SRC = readFileSync(
  join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8")
  .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const RUNNER_SRC = readFileSync(
  join(process.cwd(), "server/migrations/runner.ts"), "utf8");

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
async function refused(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e: any) { return String(e?.message ?? e); }
}

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الصيانة-المتزامنة";
/** بادئةُ تذاكر هذا الاختبار — تُنظَّف وحدها، ولا تُلمَس تذكرةُ غيره. */
const TOK = "mc-tok-";
const ADMIN = 9871, RECV = 9872, EXPERT = 9873;
const USERS = [ADMIN, RECV, EXPERT];

const S = {
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canAddPatients: true },
  },
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1],
    displayName: "المسؤول", permissions: {},
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
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
/**
 * **الطلبُ كما يُكتب حرفياً** — بلا تذكرةٍ تُحقَن. يستعمله القسمُ الذي غيابُ
 * الرمز فيه **هو** موضوعُ الاختبار (ك).
 */
const maintRaw = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, { paidNow: 0, ...body });

/**
 * **والطلبُ المعتاد — بتذكرةٍ فريدةٍ لكلّ نداء** ما لم يحملها الجسمُ صراحةً.
 *
 * التذكرةُ صارت **إلزاميةً** على هذه النقطة (٢٠٢٦-٠٩-١٨)، وأقسامُ ترحيل ٠٨٢
 * (أ–ز) موضوعُها الفهارسُ لا التذكرة: عملياتُ صيانةٍ **حقيقيةٌ مستقلّة**،
 * لكلٍّ ضغطتُها الخاصّة. **ورمزٌ فريدٌ لكلّ نداء هو بالضبط ما ترسله ضغطتان
 * مستقلّتان** من نافذتين — فحقنُه هنا يحاكي الواقعَ ولا يخفّف حارساً.
 * وأقسامُ التذكرة (ح · ط · ي · ك) تمرّر رمزَها صراحةً فلا يُحقَن لها شيء.
 */
let autoTok = 0;
const maint = (body: any, session: any = S.recv) =>
  maintRaw(
    body && Object.prototype.hasOwnProperty.call(body, "submissionToken")
      ? body
      : { ...body, submissionToken: `${TOK}auto-${++autoTok}` },
    session);

//  ترحيلُ ٠٨٢ يُطبَّق هنا بنفسه (`DROP INDEX IF EXISTS`) — فالاختبارُ يعمل
//  على قاعدةٍ بُنيت من قالبٍ سابقٍ له كما على قاعدةٍ سرى عليها المُشغِّل.
//  وتطبيقُه مرّتين هو إثباتُ الـidempotency نفسُه.
async function runMigration082() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(MIG082);
    await c.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [NAME082]);
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}

async function mkPatient(label: string) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             1,true,false,0,'new') RETURNING id`, [`${MARK} ${label}`, MARK]);
  return r[0].id;
}
async function mkCase(patientId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,1,'prosthetic',0,'manual','active') RETURNING id`, [patientId]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number, status = "delivered") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by, delivered_at)
     VALUES ($1,$2,1,$3,$4,0,$5,CASE WHEN $4='delivered' THEN NOW() ELSE NULL END) RETURNING id`,
    [patientId, caseId, seq, status, ADMIN]);
  return r[0].id;
}
async function rawOrder(patientId: number, purpose: string, episodeId: number | null) {
  const r = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id, service_type,
       purpose, status, device_episode_id)
     VALUES ($1,1,$2,'prosthetic',$3,'active',$4) RETURNING id`,
    [patientId, EXPERT, purpose, episodeId]);
  return r[0].id;
}
async function ordersOf(patientId: number) {
  return await q(`SELECT id::int, purpose, status, device_episode_id::int de,
      expert_user_id::int ex, maintenance_component mc,
      maintenance_original_price::int mop, maintenance_final_price::int mfp,
      maintenance_price_kind mpk, no_exam_no_charge nocharge
    FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
}
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM visits WHERE patient_id=$1) AS visits,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payments,
      (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE patient_id=$1) AS paid,
      (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) AS pending,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}

/**
 * **سطورُ التدقيق لهذا المريض بعينه** — تُحسَب بالمعرّف لا بحقلٍ داخل
 * `new_values`: الصفُّ يشير إلى أمرِ عملٍ أو دفعةٍ حقيقية، فإن وقع تكرارٌ
 * ظهر صفٌّ ثانٍ حتماً.
 */
async function auditOf(patientId: number) {
  const [r] = await q(`SELECT
      (SELECT count(*)::int FROM audit_log
        WHERE entity_type='no_exam_operation'
          AND entity_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id=$1)) AS ops,
      (SELECT count(*)::int FROM audit_log
        WHERE entity_type='payment'
          AND entity_id IN (SELECT id FROM payments WHERE patient_id=$1)) AS pays`,
    [patientId]);
  return { ops: Number(r?.ops ?? 0), pays: Number(r?.pays ?? 0) };
}

/** كم صفّاً لهذا الرمز بعينه، وبأيّ نطاق. */
async function tokenRows(token: string) {
  return await q<{ token: string; scope: string }>(
    `SELECT token, scope FROM submission_tokens WHERE token = $1`, [token]);
}

/** كم تذكرةً في الجدول كلِّه — للإثبات أن طلباً مردوداً لم يحجز شيئاً. */
async function tokenCount() {
  const [r] = await q(`SELECT count(*)::int n FROM submission_tokens`);
  return Number(r?.n ?? 0);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM pending_service_charge_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM pending_service_charges WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE entry_id IN (
             SELECT id FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}]))`);
  await q(`DELETE FROM journal_entries WHERE created_by = ANY(ARRAY[${USERS.join(",")}])`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM price_change_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followups WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_code_aliases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM submission_tokens WHERE token LIKE '${TOK}%'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, name] of [
    [ADMIN, "admin", "المسؤول"],
    [RECV, "reception", "ريام"],
    [EXPERT, "prosthetics_expert", "الخبير"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,1,'[1]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `mc_u${id}`, role, name]);
  }
  await cleanup();

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

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. حالةُ القاعدة: فهرسا الصيانة مرفوعان، وفهرسا البناء قائمان ──");
    // ══════════════════════════════════════════════════════════════════
    await runMigration082();
    await runMigration082();   // idempotent: مرّتان بلا خطأ
    const idx = (await q<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE tablename='prosthetic_work_orders'
         AND indexname LIKE 'uq_pwo%' ORDER BY indexname`)).map((i) => i.indexname);
    check(!idx.includes("uq_pwo_one_open_maint_per_episode"),
      "أ١. «uq_pwo_one_open_maint_per_episode» رُفع", idx.join(", "));
    check(!idx.includes("uq_pwo_one_open_legacy_maint"),
      "أ٢. و«uq_pwo_one_open_legacy_maint» رُفع", idx.join(", "));
    check(idx.includes("uq_pwo_one_open_build_per_episode"),
      "أ٣. **وفهرسُ البناء بالحلقة قائمٌ كما هو**", idx.join(", "));
    check(idx.includes("uq_pwo_one_open_legacy_build"),
      "أ٤. **وفهرسُ البناء بلا حلقةٍ قائمٌ كما هو**", idx.join(", "));
    check(/migration082/.test(RUNNER_SRC) && /082_concurrent_maintenance_orders/.test(RUNNER_SRC),
      "أ٥. والترحيلُ مسجَّلٌ في المُشغِّل ومستورَدٌ فيه");
    check(!/DROP\s+TABLE|DROP\s+COLUMN|DELETE\s+FROM|TRUNCATE|UPDATE\s+/i.test(MIG082),
      "أ٦. ولا `DROP TABLE` ولا `DROP COLUMN` ولا `DELETE` ولا `UPDATE` في الترحيل", MIG082);
    check(!/uq_pwo_one_open_build/i.test(MIG082),
      "أ٧. ولا يذكر فهرسَي البناء في SQL إطلاقاً — لا إنشاءً ولا إسقاطاً");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. سيناريو المالك: نفسُ الجهاز، نفسُ القطعة، نفسُ الخبير ──");
    // ══════════════════════════════════════════════════════════════════
    const pB = await mkPatient("ب. نفسُ كلّ شيء");
    const cB = await mkCase(pB);
    const eB = await mkEpisode(pB, cB, 1);
    const bodyB = {
      patientId: pB, serviceType: "prosthetic", deviceEpisodeId: eB,
      maintenanceComponent: "socket", expertUserId: EXPERT,
      originalPrice: 100_000, discountAmount: 0, note: "صيانة قالب",
    };
    const m1 = await maint(bodyB);
    same("ب١. الصيانةُ الأولى تمرّ", m1.status, 201);
    const m2 = await maint(bodyB);
    same("ب٢. **والثانية تمرّ أيضاً — نفسُ الجهاز والقطعة والخبير**", m2.status, 201,
      JSON.stringify(m2.body));

    const obs = await ordersOf(pB);
    same("ب٣. وأمران لا أمر", obs.length, 2);
    //  لا يُقرأ صفٌّ غائب: اختبارٌ ينهار على حالةٍ غير متوقَّعة يُخفي بقيّةَ
    //  ما كان سيفشل معه، فيبدو العطبُ أضيقَ ممّا هو.
    same("ب٤. **وهما أمران مستقلّان بمعرّفين مختلفين**",
      new Set(obs.map((o: any) => o.id)).size, obs.length);
    same("ب٥. وكلاهما مفتوحٌ فعلاً (لا مكتملٌ ولا ملغى)",
      obs.filter((o: any) => !["completed", "cancelled"].includes(o.status)).length, 2);
    same("ب٦. وكلاهما صيانةٌ على الجهاز نفسِه",
      obs.map((o: any) => [o.purpose, o.de]), [["maintenance", eB], ["maintenance", eB]]);
    same("ب٧. وكلاهما القطعةُ نفسُها والخبيرُ نفسُه",
      obs.map((o: any) => [o.mc, o.ex]), [["socket", EXPERT], ["socket", EXPERT]]);
    same("ب٨. وشروطُهما التجارية مُهيكَلةٌ لكلٍّ على حدة",
      obs.map((o: any) => [o.mop, o.mfp, o.mpk]),
      [[100_000, 100_000, "normal"], [100_000, 100_000, "normal"]]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. والمتزامنتان فعلاً ──");
    // ══════════════════════════════════════════════════════════════════
    const pC = await mkPatient("ج. تزامن");
    const cC = await mkCase(pC);
    const eC = await mkEpisode(pC, cC, 1);
    const bodyC = {
      patientId: pC, serviceType: "prosthetic", deviceEpisodeId: eC,
      maintenanceComponent: "knee", expertUserId: EXPERT,
      originalPrice: 50_000, discountAmount: 0,
    };
    const raced = await Promise.all([maint(bodyC), maint(bodyC)]);
    same("ج١. **ضغطتان متزامنتان ⟶ كلتاهما تنجح**",
      raced.map((r) => r.status).sort(), [201, 201],
      JSON.stringify(raced.map((r) => r.body)));
    const ocs = await ordersOf(pC);
    same("ج٢. وأمران مستقلّان", ocs.length, 2);
    same("ج٣. وكلاهما مفتوح",
      ocs.filter((o: any) => !["completed", "cancelled"].includes(o.status)).length, 2);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. وجهازٌ قديم غير مسجَّل — بلا حلقة ──");
    // ══════════════════════════════════════════════════════════════════
    const pD = await mkPatient("د. بلا حلقة");
    await mkCase(pD);
    const bodyD = {
      patientId: pD, serviceType: "prosthetic", legacyUnrecordedDevice: true,
      maintenanceComponent: "foot", expertUserId: EXPERT,
      originalPrice: 30_000, discountAmount: 0,
    };
    const racedD = await Promise.all([maint(bodyD), maint(bodyD)]);
    same("د١. **صيانتان متزامنتان بلا حلقةٍ مسجَّلة ⟶ كلتاهما تنجح**",
      racedD.map((r) => r.status).sort(), [201, 201],
      JSON.stringify(racedD.map((r) => r.body)));
    const ods = await ordersOf(pD);
    same("د٢. وأمران بلا حلقة", ods.map((o: any) => o.de), [null, null]);
    same("د٣. وكلاهما مفتوح",
      ods.filter((o: any) => !["completed", "cancelled"].includes(o.status)).length, 2);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. **وبناءان ما زالا مرفوضين** — القاعدةُ والتطبيقُ معاً ──");
    // ══════════════════════════════════════════════════════════════════
    const pE = await mkPatient("هـ. بناءان");
    const cE = await mkCase(pE);
    const eE = await mkEpisode(pE, cE, 1, "in_manufacturing");
    await rawOrder(pE, "initial_build", eE);
    const dupBuild = await refused(() => rawOrder(pE, "initial_build", eE));
    check(!!dupBuild && /uq_pwo_one_open_build_per_episode|duplicate key/.test(dupBuild),
      "هـ١. بناءان مفتوحان لنفس الحلقة ⟶ **القاعدة ترفض**", String(dupBuild));

    const pE2 = await mkPatient("هـ. بناءان بلا حلقة");
    await mkCase(pE2);
    await rawOrder(pE2, "initial_build", null);
    const dupLegacy = await refused(() => rawOrder(pE2, "initial_build", null));
    check(!!dupLegacy && /uq_pwo_one_open_legacy_build|duplicate key/.test(dupLegacy),
      "هـ٢. وبناءان مفتوحان بلا حلقةٍ لنفس (مريض، خدمة) ⟶ **القاعدة ترفض**",
      String(dupLegacy));

    //  وحارسُ التطبيق نفسُه — `createWorkOrderForExisting` بحرفه.
    const pE3 = await mkPatient("هـ. حارسُ التطبيق");
    await mkCase(pE3);
    const okBuild = await mfg.createWorkOrderForExisting({
      patientId: pE3, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: ADMIN, purpose: "initial_build",
    });
    check(!!okBuild?.id, "هـ٣. بناءٌ أوليٌّ أوّل يمرّ");
    const refusedBuild = await refused(() => mfg.createWorkOrderForExisting({
      patientId: pE3, branchId: 1, serviceType: "prosthetic",
      expertUserId: EXPERT, assignedBy: ADMIN, purpose: "initial_build",
    }));
    check(!!refusedBuild && /active order exists/.test(refusedBuild),
      "هـ٤. **والثاني يُردّ في منطق التطبيق كما كان** (`ActiveOrderError`)",
      String(refusedBuild));
    same("هـ٥. ولا أمرَ ثانٍ أُنشئ", (await ordersOf(pE3)).length, 1);
    //  والصيانةُ من البابِ نفسِه لم تعد تُحرَس — عملان مستقلّان.
    //  (لا يُترَك النداءُ عارياً: ارتدادُ الحارس يجب أن **يُبلَّغ** لا أن
    //  يُسقط الاختبارَ فيُخفي ما بعده.)
    const mnts: any[] = [];
    let mntErr: string | null = null;
    for (const n of [1, 2]) {
      try {
        mnts.push(await mfg.createWorkOrderForExisting({
          patientId: pE3, branchId: 1, serviceType: "prosthetic",
          expertUserId: EXPERT, assignedBy: ADMIN, purpose: "maintenance",
        }));
      } catch (e: any) { mntErr = `#${n}: ${String(e?.message ?? e)}`; }
    }
    check(mnts.length === 2 && new Set(mnts.map((o) => o.id)).size === 2,
      "هـ٦. **وصيانتان من البابِ العامّ نفسِه تمرّان** — بلا حارس",
      mntErr ?? JSON.stringify(mnts.map((o) => o.id)));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و. كلُّ أمرٍ بمبلغه — لا قيدَ مزدوجٌ ولا ضائع ──");
    // ══════════════════════════════════════════════════════════════════
    const mB = await moneyOf(pB);
    same("و١. أمران · زيارتان · قيدا كلفة",
      [mB.orders, mB.visits, mB.ledger_rows], [2, 2, 2]);
    same("و٢. والمجموعُ ضِعفُ الأجر بالضبط", mB.total, 200_000);
    same("و٣. وكلفةُ الحالة تطابقه", mB.case_cost, 200_000);
    same("و٤. **والثابتُ المحاسبيّ**: مجموعُ القيود = `total_cost`",
      mB.ledger, mB.total);
    same("و٥. وصفرٌ في الطوابير القديمة ومراجعة الطبيب",
      [mB.pending, mB.reviews], [0, 0]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. حارسٌ معماريّ — لا فرعَ صيانةٍ عاد إلى شرط المزاحمة ──");
    // ══════════════════════════════════════════════════════════════════
    const filterBody = MFG_STORE_SRC.slice(
      MFG_STORE_SRC.indexOf("function buildCompetitionFilter"),
      MFG_STORE_SRC.indexOf("**هل لهذا المريض جهازٌ سابق"));
    check(filterBody.length > 100, "ز٠. قُرئ جسمُ `buildCompetitionFilter`");
    check(!/'maintenance'|"maintenance"/.test(filterBody),
      "ز١. **ولا ذكرَ للصيانة في شرط المزاحمة إطلاقاً**", filterBody);
    const maintFn = MFG_STORE_SRC.slice(
      MFG_STORE_SRC.indexOf("export async function createMaintenanceOrderWithVisit"));
    const maintBody = maintFn.slice(0, maintFn.indexOf("\nexport "));
    check(maintBody.length > 100, "ز٢. قُرئ جسمُ `createMaintenanceOrderWithVisit`");
    check(!/hasOpenOrderTx|ActiveOrderError/.test(maintBody),
      "ز٣. **ولا حارسَ أمرٍ مفتوحٍ فيه بعد اليوم**");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. **نفسُ الرمز + إرسالان متزامنان ⟶ عمليةٌ واحدة بكلّ آثارها** ──");
    // ══════════════════════════════════════════════════════════════════
    const pH = await mkPatient("ح. تذكرةٌ واحدة");
    const cH = await mkCase(pH);
    const eH = await mkEpisode(pH, cH, 1);
    const tokH = `${TOK}same-1`;
    //  **بقبضٍ فعليّ** — فالدفعةُ واقعةٌ تُعَدّ: تكرارٌ يقيّد مالاً مرّتين لا
    //  يُصحَّح بعد وقوعه، وهو أخطرُ ما يحرسه هذا القسم.
    const bodyH = {
      patientId: pH, serviceType: "prosthetic", deviceEpisodeId: eH,
      maintenanceComponent: "socket", expertUserId: EXPERT,
      originalPrice: 80_000, discountAmount: 0, paidNow: 80_000,
      submissionToken: tokH,
    };
    const racedH = await Promise.all([maint(bodyH), maint(bodyH)]);
    same("ح١. **واحدةٌ تُنشئ (٢٠١) والأخرى تُردّ نجاحاً آمناً (٢٠٠)**",
      racedH.map((r) => r.status).sort(), [200, 201],
      JSON.stringify(racedH.map((r) => r.body)));
    const dupH = racedH.find((r) => r.status === 200);
    const madeH = racedH.find((r) => r.status === 201);
    check(dupH?.body?.ok === true && dupH?.body?.duplicate === true,
      "ح٢. والمردودةُ تقول صراحةً إنها مكرَّرة — **نجاحٌ لا فشل**",
      JSON.stringify(dupH?.body));
    check(typeof dupH?.body?.message === "string" && dupH!.body.message.includes("سابقاً"),
      "ح٣. وبرسالةٍ تدلّ أن العملية مسجَّلةٌ سلفاً", JSON.stringify(dupH?.body?.message));
    check(typeof madeH?.body?.workOrderId === "number" && !madeH?.body?.duplicate,
      "ح٤. والمنشِئةُ وحدها تحمل رقمَ أمر العمل", JSON.stringify(madeH?.body));

    const mH = await moneyOf(pH);
    same("ح٥. **أمرٌ واحد · زيارةٌ واحدة · قيدُ كلفةٍ واحد · دفعةٌ واحدة**",
      [mH.orders, mH.visits, mH.ledger_rows, mH.payments], [1, 1, 1, 1]);
    same("ح٦. والمجموعُ أجرٌ واحد لا اثنان",
      [mH.total, mH.case_cost, mH.ledger], [80_000, 80_000, 80_000]);
    same("ح٧. والمقبوضُ مرّةً واحدة", mH.paid, 80_000);
    same("ح٨. **وسطرُ تدقيقٍ واحدٌ للعملية وواحدٌ للدفعة**",
      await auditOf(pH), { ops: 1, pays: 1 });
    same("ح٩. وصفُّ تذكرةٍ واحدٌ بنطاق `maintenance`",
      await tokenRows(tokH), [{ token: tokH, scope: "maintenance" }]);
    same("ح١٠. وصفرٌ في الطوابير القديمة ومراجعة الطبيب",
      [mH.pending, mH.reviews], [0, 0]);

    //  وإرسالٌ ثالثٌ **متتالٍ** — بعد أن التزمت الأولى يقيناً، لا سباقاً.
    const thirdH = await maint(bodyH);
    same("ح١١. وإرسالٌ ثالثٌ بالرمز عينه ⟶ نجاحٌ آمنٌ أيضاً", thirdH.status, 200,
      JSON.stringify(thirdH.body));
    const mH2 = await moneyOf(pH);
    same("ح١٢. **ولا شيءَ تحرّك** — الأرقامُ كما هي",
      [mH2.orders, mH2.visits, mH2.ledger_rows, mH2.payments, mH2.total, mH2.paid],
      [1, 1, 1, 1, 80_000, 80_000]);
    same("ح١٣. ولا سطرَ تدقيقٍ ثالث", await auditOf(pH), { ops: 1, pays: 1 });

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. **رمزان مختلفان + نفسُ البيانات ⟶ عمليتان مستقلّتان** ──");
    // ══════════════════════════════════════════════════════════════════
    //  **الثابتُ الذي لا يجوز أن يكسره منعُ التكرار**: عملان حقيقيان
    //  متطابقان تماماً — نفسُ الجهاز والقطعة والخبير والسعر — يمضيان كلاهما.
    const pT = await mkPatient("ط. رمزان مختلفان");
    const cT = await mkCase(pT);
    const eT = await mkEpisode(pT, cT, 1);
    const baseT = {
      patientId: pT, serviceType: "prosthetic", deviceEpisodeId: eT,
      maintenanceComponent: "socket", expertUserId: EXPERT,
      originalPrice: 60_000, discountAmount: 0, paidNow: 60_000,
    };
    const tokT1 = `${TOK}diff-1`, tokT2 = `${TOK}diff-2`;
    const racedT = await Promise.all([
      maint({ ...baseT, submissionToken: tokT1 }),
      maint({ ...baseT, submissionToken: tokT2 }),
    ]);
    same("ط١. **كلتاهما تُنشئ فعلاً (٢٠١ و٢٠١)**",
      racedT.map((r) => r.status).sort(), [201, 201],
      JSON.stringify(racedT.map((r) => r.body)));
    same("ط٢. ولا واحدةَ قُرئت «مكرَّرة»",
      racedT.map((r) => r.body?.duplicate ?? null), [null, null]);
    const otT = await ordersOf(pT);
    same("ط٣. وأمران مستقلّان بمعرّفين مختلفين",
      [otT.length, new Set(otT.map((o: any) => o.id)).size], [2, 2]);
    same("ط٤. وكلاهما مفتوحٌ على الجهاز نفسِه بالقطعة نفسِها",
      otT.map((o: any) => [o.purpose, o.de, o.mc]),
      [["maintenance", eT, "socket"], ["maintenance", eT, "socket"]]);
    const mT = await moneyOf(pT);
    same("ط٥. **أمران · زيارتان · قيدا كلفة · دفعتان**",
      [mT.orders, mT.visits, mT.ledger_rows, mT.payments], [2, 2, 2, 2]);
    same("ط٦. والمجموعُ ضِعفُ الأجر",
      [mT.total, mT.case_cost, mT.ledger], [120_000, 120_000, 120_000]);
    same("ط٧. والمقبوضُ مرّتين", mT.paid, 120_000);
    same("ط٨. **وسطرا تدقيقٍ للعمليتين وسطرا دفعة**",
      await auditOf(pT), { ops: 2, pays: 2 });
    same("ط٩. وصفّا تذكرةٍ لا صفّ",
      [(await tokenRows(tokT1)).length, (await tokenRows(tokT2)).length], [1, 1]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. **وفشلُ المعاملة يُرجع حجزَ الرمز معها** ──");
    // ══════════════════════════════════════════════════════════════════
    //  مريضٌ يحمل عَلَمَ الأطراف **بلا حالةٍ نشطة**: يمرّ فحوصَ النقطة كلَّها
    //  ثمّ يُردّ من **داخل** المعاملة (الحارسُ الأوّل) — أي بعد أن يكون
    //  الرمزُ قد حُجز فيها. فإن لم يرتدّ الحجزُ معها، حُبس الرمزُ إلى الأبد
    //  وقُرئت إعادةُ المحاولة «مسجَّلة سابقاً» **كذباً** على عمليةٍ لم تقع.
    const pY = await mkPatient("ي. ارتدادُ التذكرة");
    const tokY = `${TOK}rollback-1`;
    const bodyY = {
      patientId: pY, serviceType: "prosthetic", legacyUnrecordedDevice: true,
      maintenanceComponent: "foot", expertUserId: EXPERT,
      originalPrice: 40_000, discountAmount: 0, paidNow: 0,
      submissionToken: tokY,
    };
    const failY = await maint(bodyY);
    same("ي١. الطلبُ يُردّ لأن لا حالةَ نشطة على الملفّ", failY.status, 400,
      JSON.stringify(failY.body));
    same("ي٢. **ولا صفَّ تذكرةٍ بقي** — الحجزُ ارتدّ مع المعاملة",
      (await tokenRows(tokY)).length, 0);
    const mY0 = await moneyOf(pY);
    same("ي٣. وصفرُ كتابةٍ تشغيلية أو مالية",
      [mY0.orders, mY0.visits, mY0.ledger_rows, mY0.payments, mY0.total],
      [0, 0, 0, 0, 0]);

    //  ثمّ يُصحَّح الملفُّ وتُعاد المحاولةُ **بالرمز عينه** — وهذا هو المقصود.
    await mkCase(pY);
    const retryY = await maint(bodyY);
    same("ي٤. **وإعادةُ المحاولة بالرمز نفسِه تنجح**", retryY.status, 201,
      JSON.stringify(retryY.body));
    const mY1 = await moneyOf(pY);
    same("ي٥. وعمليةٌ واحدة كاملة",
      [mY1.orders, mY1.visits, mY1.ledger_rows], [1, 1, 1]);
    same("ي٦. وصارت التذكرةُ محجوزةً الآن", (await tokenRows(tokY)).length, 1);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. **وطلبٌ بلا تذكرةٍ يُردّ ٤٠٠ بصفر كتابة** ──");
    // ══════════════════════════════════════════════════════════════════
    //  التذكرةُ **إلزاميةٌ على النقطة العامّة**: نافذةُ الصيانة تسكّها عند
    //  كلّ فتحٍ ولا تُفعِّل زرَّ الحفظ قبلها، **فطلبٌ يصل بلا رمزٍ عميلٌ
    //  بائتٌ** في متصفّح الموظّف. ولو قُرئ «بلا تذكرة» بصمتٍ لبقي بابُ
    //  التكرار مفتوحاً على مصراعيه لكلّ صفحةٍ سابقةٍ لهذه المرحلة — وهو
    //  بعينه ما رفعُ حدِّ ٠٨٢ جعله ممكناً.
    const pK = await mkPatient("ك. بلا تذكرة");
    const cK = await mkCase(pK);
    const eK = await mkEpisode(pK, cK, 1);
    const baseK = {
      patientId: pK, serviceType: "prosthetic", deviceEpisodeId: eK,
      maintenanceComponent: "socket", expertUserId: EXPERT,
      originalPrice: 50_000, discountAmount: 0, paidNow: 50_000,
    };
    const tokensBeforeK = await tokenCount();
    //  **خمسةُ أشكالٍ للغياب لا واحد** — والمشوَّهُ يُردّ ولا يُصحَّح بصمت.
    const shapesK: [string, any][] = [
      ["المفتاحُ غائبٌ تماماً", baseK],
      ["نصٌّ فارغ", { ...baseK, submissionToken: "" }],
      ["بياضٌ وحده", { ...baseK, submissionToken: "   " }],
      ["رقمٌ لا نصّ", { ...baseK, submissionToken: 12345 }],
      ["`null` صريحة", { ...baseK, submissionToken: null }],
    ];
    for (let i = 0; i < shapesK.length; i++) {
      const [label, body] = shapesK[i];
      const r = await maintRaw(body);
      same(`ك١.${i + 1} ${label} ⟶ ٤٠٠`, r.status, 400, JSON.stringify(r.body));
      same(`ك٢.${i + 1} ${label} — وبرسالةٍ تطلب تحديثَ الصفحة وإعادة المحاولة`,
        r.body?.error, MAINTENANCE_TOKEN_REQUIRED_MESSAGE);
    }

    const mK = await moneyOf(pK);
    same("ك٣. **صفرُ كتابةٍ تشغيلية أو مالية** — لا أمرَ ولا زيارةَ ولا قيدَ كلفةٍ ولا دفعة",
      [mK.orders, mK.visits, mK.ledger_rows, mK.payments, mK.total, mK.paid],
      [0, 0, 0, 0, 0, 0]);
    same("ك٤. **ولا سطرَ تدقيقٍ واحد**", await auditOf(pK), { ops: 0, pays: 0 });
    same("ك٥. ولا تذكرةَ حُجزت", await tokenCount(), tokensBeforeK);
    same("ك٦. وصفرٌ في الطوابير القديمة ومراجعة الطبيب",
      [mK.pending, mK.reviews], [0, 0]);

    //  **والجسمُ عينه بتذكرةٍ صالحة ينجح** — فالردُّ كان للتذكرة وحدها، لا
    //  لعيبٍ آخر في الطلب. (بلا هذا البند يمرّ القسمُ على طلبٍ باطلٍ أصلاً.)
    const tokK = `${TOK}required-1`;
    const okK = await maintRaw({ ...baseK, submissionToken: tokK });
    same("ك٧. **والجسمُ عينه بتذكرةٍ صالحة ينجح (٢٠١)**", okK.status, 201,
      JSON.stringify(okK.body));
    const mK2 = await moneyOf(pK);
    same("ك٨. وعمليةٌ واحدة كاملة",
      [mK2.orders, mK2.visits, mK2.ledger_rows, mK2.payments], [1, 1, 1, 1]);
    same("ك٩. وتذكرةٌ واحدة حُجزت الآن", (await tokenRows(tokK)).length, 1);

    //  ── عقدُ الشاشة: زرُّ الحفظ لا يجهز قبل أن تُسكّ التذكرة ──
    check(/const\s+maintenanceTokenUnready\s*=\s*kind === "maintenance"\s*&&\s*!submissionToken;/
      .test(DIALOG_SRC),
      "ك١٠. **والشاشةُ تعدّ الصيانةَ غيرَ جاهزةٍ بلا تذكرة** — وللصيانة وحدها");
    check(/const ready = [^;]*!maintenanceTokenUnready/.test(DIALOG_SRC),
      "ك١١. **والشرطُ موصولٌ فعلاً بـ`ready`** الذي يعطّل زرَّ الحفظ");
    check(/disabled=\{!ready \|\| save\.isPending\}/.test(DIALOG_SRC),
      "ك١٢. وزرُّ الحفظ معطَّلٌ بـ`ready` كما كان");

    // ══════════════════════════════════════════════════════════════════
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص الصيانة المتزامنة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
