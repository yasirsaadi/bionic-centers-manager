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

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import * as mfg from "./manufacturing/store";
import { sql as MIG082, name as NAME082 } from "./migrations/082_concurrent_maintenance_orders";

const MFG_STORE_SRC = readFileSync(
  join(process.cwd(), "server/manufacturing/store.ts"), "utf8");
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
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, { paidNow: 0, ...body });

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
      (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) AS pending,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
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
