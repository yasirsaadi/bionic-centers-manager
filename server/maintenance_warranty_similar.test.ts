// **إكمالُ ملفّ الصيانة** (المرحلةُ الثانية من تبسيط الصيانة، ترحيل ٠٨٣ —
// ٢٠٢٦-٠٩-١٨) — حيّاً على Postgres وعلى النقطتين الحقيقيتين
// `/api/no-exam/maintenance` و`/api/no-exam/maintenance/similar`.
// قاعدة محلّية: `npm run test:maintenance-warranty`.
//
// ══ الثابتان اللذان يحرسهما ══════════════════════════════════════════════
// ① **تنبيهُ الصيانة المشابهة معلوماتيٌّ لا حارس**: يُقرأ قبل الحفظ، ولا
//    يمنع شيئاً، ولا يحجز تذكرةَ الإرسال، ولا يعيد أيّ قيدٍ رفعه ٠٨٢.
// ② **«ضمن الضمان» حالةٌ مهيكلةٌ مستقلّة**: أجرٌ صفرٌ بقرار التزامٍ سابق —
//    تُحفَظ صراحةً على أمر العمل، **ولا تُقرأ من `price_kind = 'free'`**.
//
// وما يُثبته، بندَ بندٍ:
//   • **أ**: حالةُ القاعدة — العمودُ والقيدان، والترحيلُ idempotent ومسجَّل.
//   • **ب**: لا مشابهَ ⟶ الحفظُ مباشر.
//   • **ج**: يوجد مشابهٌ ⟶ التنبيهُ يظهر و**لا كتابةَ قبل قرار الموظّف**.
//   • **د**: الرجوعُ ⟶ صفرُ كتابة.
//   • **هـ**: المتابعةُ ⟶ أمرُ صيانةٍ ثانٍ مستقلٌّ كامل بكلّ آثاره.
//   • **و**: اختلافُ الجهاز ⟶ لا تنبيه.   • **ز**: اختلافُ الجزء ⟶ لا تنبيه.
//   • **ح**: اختلافُ الخبير ⟶ **يبقى** التنبيه.
//   • **ط**: اختلافُ السعر ⟶ **يبقى** التنبيه. والفرعُ كذلك ليس تشابهاً.
//   • **ي**: جهازٌ قديمٌ غير مسجَّل ⟶ تنبيهٌ **بلا اختراع هويّة**.
//   • **ك**: صيانةُ ضمانٍ — الأصليُّ محفوظ · النهائيُّ صفر · العلمُ صريح ·
//     لا كلفةَ ولا قيدَ ولا دفعةَ ولا دَين · وأمرُ العمل والزيارةُ موجودان.
//   • **ل**: والمجّانيُّ العاديُّ **يبقى مميَّزاً** عن صيانة الضمان.
//   • **م**: تذكرتان ⟶ ضمانان مستقلّان · وتذكرةٌ واحدة ⟶ لا تكرار.
//   • **ن**: خصمٌ مع الضمان ⟶ ٤٠٠ بصفر كتابة · وعلمٌ غيرُ بوليان ⟶ ٤٠٠.
//   • **س**: العاديُّ والخصمُ والمجّانيُّ — **دلالاتُها كما كانت بحرفها**.
//   • **ع**: الصلاحيةُ والنطاقُ على نقطة التنبيه.
//   • **ف**: عقدُ الشاشة وحارسٌ معماريّ — لا قيدَ يعود، ولا كتابةَ في الفحص.
//   • **ص**: المنطقُ الخالص — الاشتقاقُ والوصفُ وقرارُ عرض النافذة.

import express from "express";
import { readFileSync } from "fs";
import { join } from "path";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { sql as MIG083, name as NAME083 } from "./migrations/083_maintenance_warranty";
import {
  deriveMaintenanceTerms, describeSimilarMaintenance, shouldPromptSimilarMaintenance,
  parseMaintenanceUnderWarranty, MAINTENANCE_WARRANTY_NO_DISCOUNT_ERROR,
  MAINTENANCE_WARRANTY_FLAG_ERROR, type SimilarMaintenanceOrder,
} from "@shared/maintenance";

const STORE_SRC = readFileSync(join(process.cwd(), "server/pending_charges/store.ts"), "utf8");
const ROUTES_SRC = readFileSync(join(process.cwd(), "server/pending_charges/routes.ts"), "utf8");
const MFG_SRC = readFileSync(join(process.cwd(), "server/manufacturing/store.ts"), "utf8");
/** مصدرُ النافذة بلا تعليقات — فلا يمرّ فحصُ العقد على ذكرٍ بدل كود. */
const DIALOG_SRC = readFileSync(
  join(process.cwd(), "client/src/components/NoExamOperationDialog.tsx"), "utf8")
  .split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
const RUNNER_SRC = readFileSync(join(process.cwd(), "server/migrations/runner.ts"), "utf8");

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

const PORT = 6874;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-الضمان-والتشابه";
const TOK = "mw-tok-";
const ADMIN = 9881, RECV = 9882, EXPERT = 9883, EXPERT2 = 9884, DOC = 9885;
const USERS = [ADMIN, RECV, EXPERT, EXPERT2, DOC];

const S = {
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canAddPatients: true },
  },
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: {},
  },
  doctor: {
    userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "الطبيب", permissions: { canWriteMedicalExam: true, canAddPatients: true },
  },
  other: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استقبال فرع آخر", permissions: { canAddPatients: true },
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

let autoTok = 0;
/** رمزٌ فريدٌ لكلّ نداء — وهو بالضبط ما ترسله ضغطتان مستقلّتان من نافذتين. */
const newTok = () => `${TOK}${++autoTok}`;
const maint = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance", session, {
    paidNow: 0,
    ...(body && Object.prototype.hasOwnProperty.call(body, "submissionToken")
      ? body : { ...body, submissionToken: newTok() }),
  });
/** **الفحصُ المعلوماتيّ — بلا تذكرةٍ إطلاقاً**، فهو قراءةٌ فقط. */
const similar = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/maintenance/similar", session, body);

async function runMigration083() {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(MIG083);
    await c.query("INSERT INTO _migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING",
      [NAME083]);
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}

async function mkPatient(label: string, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, is_medical_support,
       total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,false,0,'new') RETURNING id`, [`${MARK} ${label}`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active') RETURNING id`, [patientId, branchId]);
  return r[0].id;
}
async function mkEpisode(patientId: number, caseId: number, seq: number, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, created_by, delivered_at)
     VALUES ($1,$2,$3,$4,'delivered',0,$5,NOW()) RETURNING id`,
    [patientId, caseId, branchId, seq, ADMIN]);
  return r[0].id;
}

async function ordersOf(patientId: number) {
  return await q(`SELECT id::int, purpose, status, device_episode_id::int de,
      expert_user_id::int ex, branch_id::int br, maintenance_component mc,
      maintenance_original_price::int mop, maintenance_final_price::int mfp,
      maintenance_price_kind mpk, maintenance_under_warranty warranty,
      no_exam_no_charge nocharge
    FROM prosthetic_work_orders WHERE patient_id=$1 ORDER BY id`, [patientId]);
}
/** بصمةُ الملفّ كلِّه — تشغيلياً ومالياً وتدقيقياً وتذكرةً. */
async function snap(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM prosthetic_work_history WHERE work_order_id IN
        (SELECT id FROM prosthetic_work_orders WHERE patient_id=$1)) AS history,
      (SELECT count(*)::int FROM visits WHERE patient_id=$1) AS visits,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payments,
      (SELECT COALESCE(SUM(amount),0)::int FROM payments WHERE patient_id=$1) AS paid,
      (SELECT count(*)::int FROM pending_service_charges WHERE patient_id=$1) AS pending,
      (SELECT count(*)::int FROM medical_review_requests WHERE patient_id=$1) AS reviews,
      (SELECT count(*)::int FROM audit_log WHERE entity_type='no_exam_operation'
        AND entity_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id=$1)) AS audit,
      (SELECT count(*)::int FROM submission_tokens WHERE token LIKE '${TOK}%') AS tokens`,
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
  await q(`DELETE FROM submission_tokens WHERE token LIKE '${TOK}%'`);
  await q(`DELETE FROM patient_code_aliases a
            WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.id = a.patient_id)`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  for (const [id, role, name] of [
    [ADMIN, "admin", "المسؤول"],
    [RECV, "reception", "ريام"],
    [EXPERT, "prosthetics_expert", "الخبير الأول"],
    [EXPERT2, "prosthetics_expert", "الخبير الثاني"],
    [DOC, "doctor", "الطبيب"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,1,'[1,2]'::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `mw_u${id}`, role, name]);
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
    console.log("\n── أ. حالةُ القاعدة: عمودُ الضمان وقيداه ──");
    // ══════════════════════════════════════════════════════════════════
    await runMigration083();
    await runMigration083();   // idempotent: مرّتان بلا خطأ
    const [col] = await q<{ n: string; nullable: string; def: string | null }>(
      `SELECT column_name n, is_nullable nullable, column_default def
         FROM information_schema.columns
        WHERE table_name='prosthetic_work_orders' AND column_name='maintenance_under_warranty'`);
    check(!!col, "أ١. العمودُ `maintenance_under_warranty` موجود");
    check(col?.nullable === "YES", "أ٢. **ويقبل `NULL`** — «لم يُسأل» صدقٌ لا نقص", col?.nullable);
    check(col?.def === null, "أ٣. **وبلا `DEFAULT`** — لا معنى يُكتب على أمرٍ قديم", String(col?.def));
    const cons = (await q<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname LIKE 'maintenance_warranty%' ORDER BY conname`))
      .map((c) => c.conname);
    same("أ٤. والقيدان قائمان", cons,
      ["maintenance_warranty_purpose_check", "maintenance_warranty_shape_check"]);
    check(/migration083/.test(RUNNER_SRC) && /083_maintenance_warranty/.test(RUNNER_SRC),
      "أ٥. والترحيلُ مسجَّلٌ في المُشغِّل ومستورَدٌ فيه");
    check(!/DROP\s+TABLE|DROP\s+COLUMN|DELETE\s+FROM|TRUNCATE|UPDATE\s+\w/i.test(MIG083),
      "أ٦. ولا `DROP TABLE` ولا `DROP COLUMN` ولا `DELETE` ولا `UPDATE` في الترحيل");

    //  المريضُ وجهازاه المسلَّمان.
    const P = await mkPatient("أ");
    const C = await mkCase(P);
    const EP1 = await mkEpisode(P, C, 1);
    const EP2 = await mkEpisode(P, C, 2);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. لا مشابهَ ⟶ الحفظُ مباشر ──");
    // ══════════════════════════════════════════════════════════════════
    const base = {
      patientId: P, serviceType: "prosthetic", deviceEpisodeId: EP1,
      maintenanceComponent: "knee", expertUserId: EXPERT,
    };
    const s0 = await similar({ ...base });
    check(s0.status === 200, "ب١. نقطةُ التنبيه تُجيب ٢٠٠", JSON.stringify(s0.body));
    same("ب٢. **ولا مشابهَ على ملفٍّ نظيف**", s0.body?.similar, []);
    const before0 = await snap(P);
    same("ب٣. وصفرُ أثرٍ من الفحص نفسِه", before0.orders, 0);
    const m1 = await maint({ ...base, originalPrice: 50000, discountAmount: 0, paidNow: 50000 });
    check(m1.status === 201, "ب٤. والحفظُ يمضي مباشرةً ٢٠١", JSON.stringify(m1.body));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. يوجد مشابهٌ ⟶ تنبيهٌ، ولا كتابةَ قبل قرار الموظّف ──");
    // ══════════════════════════════════════════════════════════════════
    const beforeAlert = await snap(P);
    const s1 = await similar({ ...base });
    check(s1.status === 200 && (s1.body?.similar ?? []).length === 1,
      "ج١. **التنبيهُ يظهر** — صفٌّ واحدٌ مشابه", JSON.stringify(s1.body));
    const row: SimilarMaintenanceOrder = (s1.body?.similar ?? [])[0];
    same("ج٢. وهو أمرُ العمل بعينه", row?.workOrderId, m1.body?.workOrderId);
    same("ج٣. ويحمل الجزءَ والجهاز", [row?.maintenanceComponent, row?.deviceEpisodeId],
      ["knee", EP1]);
    same("ج٤. ويحمل الخبيرَ والفرعَ باسميهما",
      [row?.expertName, row?.branchName], ["الخبير الأول", "بغداد"]);
    check(typeof row?.createdAt === "string" && row.createdAt.length > 0,
      "ج٥. وتاريخَه", String(row?.createdAt));
    same("ج٦. **وصفرُ كتابة — البصمةُ كما هي بايتاً**", await snap(P), beforeAlert);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. الرجوع ⟶ صفرُ كتابة ──");
    // ══════════════════════════════════════════════════════════════════
    //  «رجوع» في الشاشة **لا يرسل شيئاً أصلاً**: الفحصُ وقع، والموظّفُ أغلق
    //  النافذة. فالإثباتُ أن الحالةَ بعد الفحص = الحالةُ قبله، ولم يُحجَز رمز.
    same("د١. البصمةُ بعد الرجوع كما كانت", await snap(P), beforeAlert);
    same("د٢. **ولا تذكرةَ حُجزت للفحص**", beforeAlert.tokens, 1);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. المتابعة ⟶ أمرُ صيانةٍ ثانٍ مستقلٌّ كامل ──");
    // ══════════════════════════════════════════════════════════════════
    const m2 = await maint({ ...base, originalPrice: 50000, discountAmount: 0, paidNow: 50000 });
    check(m2.status === 201, "هـ١. المتابعةُ تنجح ٢٠١", JSON.stringify(m2.body));
    check(m2.body?.workOrderId !== m1.body?.workOrderId,
      "هـ٢. **وأمرُ عملٍ ثانٍ مستقلٌّ** لا الأوّل", JSON.stringify(m2.body));
    const afterTwo = await snap(P);
    same("هـ٣. أمران · زيارتان · قيدا كلفة · دفعتان · سطرا تدقيق",
      [afterTwo.orders, afterTwo.visits, afterTwo.ledger_rows, afterTwo.payments, afterTwo.audit],
      [2, 2, 2, 2, 2]);
    same("هـ٤. والمالُ مجموعُ العمليتين", [afterTwo.total, afterTwo.ledger, afterTwo.paid],
      [100000, 100000, 100000]);
    const twoOpen = (await ordersOf(P)).filter((o: any) => o.status === "active");
    same("هـ٥. **وكلاهما مفتوح** — ولا قيدَ يعود", twoOpen.length, 2);
    const s2 = await similar({ ...base });
    same("هـ٦. والتنبيهُ التالي يرى الاثنين", (s2.body?.similar ?? []).length, 2);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── و/ز. اختلافُ الجهاز أو الجزء ⟶ لا تنبيه ──");
    // ══════════════════════════════════════════════════════════════════
    const sDev = await similar({ ...base, deviceEpisodeId: EP2 });
    same("و١. **جهازٌ آخر ⟶ لا تنبيه**", sDev.body?.similar, []);
    const sComp = await similar({ ...base, maintenanceComponent: "socket" });
    same("ز١. **جزءٌ آخر ⟶ لا تنبيه**", sComp.body?.similar, []);
    const sLegacy = await similar({
      patientId: P, serviceType: "prosthetic", maintenanceComponent: "knee",
      legacyUnrecordedDevice: true,
    });
    same("ز٢. وجهازٌ غير مسجَّل لا يُقابَل بجهازٍ مسجَّل", sLegacy.body?.similar, []);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح/ط. الخبيرُ والسعرُ والفرعُ ليست تشابهاً ──");
    // ══════════════════════════════════════════════════════════════════
    const sExp = await similar({ ...base, expertUserId: EXPERT2 });
    same("ح١. **خبيرٌ آخر ⟶ التنبيهُ يبقى**", (sExp.body?.similar ?? []).length, 2);
    const sPrice = await similar({ ...base, originalPrice: 999999, discountAmount: 5000 });
    same("ط١. **وسعرٌ آخر ⟶ التنبيهُ يبقى**", (sPrice.body?.similar ?? []).length, 2);
    //  والفرعُ كذلك: أمرٌ مفتوحٌ في فرعٍ آخر لنفس الجهاز والجزء **يُنبَّه عليه**.
    await q(`INSERT INTO prosthetic_work_orders (patient_id, branch_id, expert_user_id,
        service_type, purpose, status, device_episode_id, maintenance_component)
      VALUES ($1,2,$2,'prosthetic','maintenance','active',$3,'knee')`, [P, EXPERT2, EP1]);
    const sBranch = await similar({ ...base });
    same("ط٢. **وفرعٌ آخر ⟶ التنبيهُ يبقى** — الفرعُ ليس هويّةَ عمل",
      (sBranch.body?.similar ?? []).length, 3);
    //  والمنتهي والملغى ليسا عملاً قائماً.
    await q(`UPDATE prosthetic_work_orders SET status='completed' WHERE id=$1`,
      [m1.body?.workOrderId]);
    await q(`UPDATE prosthetic_work_orders SET status='cancelled' WHERE id=$1`,
      [m2.body?.workOrderId]);
    const sClosed = await similar({ ...base });
    same("ط٣. والمكتملُ والملغى يخرجان من التنبيه", (sClosed.body?.similar ?? []).length, 1);
    await q(`DELETE FROM prosthetic_work_orders WHERE patient_id=$1 AND branch_id=2`, [P]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. جهازٌ قديمٌ غير مسجَّل ⟶ تنبيهٌ بلا اختراع هويّة ──");
    // ══════════════════════════════════════════════════════════════════
    const PL = await mkPatient("ي");
    await mkCase(PL);
    const legacyBody = {
      patientId: PL, serviceType: "prosthetic", legacyUnrecordedDevice: true,
      maintenanceComponent: "socket", expertUserId: EXPERT,
    };
    same("ي١. لا مشابهَ أوّلاً", (await similar(legacyBody)).body?.similar, []);
    const l1 = await maint({ ...legacyBody, originalPrice: 30000, discountAmount: 0, paidNow: 0 });
    check(l1.status === 201, "ي٢. وصيانةُ جهازٍ غير مسجَّل تمضي", JSON.stringify(l1.body));
    const sl = await similar(legacyBody);
    const lrow: SimilarMaintenanceOrder = (sl.body?.similar ?? [])[0];
    same("ي٣. **والتنبيهُ يظهر لغير المسجَّل**", (sl.body?.similar ?? []).length, 1);
    same("ي٤. **وبلا اختراع هويّة** — الحلقةُ `null` كما هي", lrow?.deviceEpisodeId, null);
    same("ي٥. والصفُّ المحفوظ نفسُه بلا حلقة",
      (await ordersOf(PL))[0]?.de, null);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. صيانةُ ضمان: الأصليُّ محفوظ، والنهائيُّ صفر، والعلمُ صريح ──");
    // ══════════════════════════════════════════════════════════════════
    const PW = await mkPatient("ك");
    const CW = await mkCase(PW);
    const EPW = await mkEpisode(PW, CW, 1);
    const wBody = {
      patientId: PW, serviceType: "prosthetic", deviceEpisodeId: EPW,
      maintenanceComponent: "foot", expertUserId: EXPERT,
    };
    const w1 = await maint({ ...wBody, originalPrice: 75000, underWarranty: true });
    check(w1.status === 201, "ك١. صيانةُ الضمان تُحفَظ ٢٠١", JSON.stringify(w1.body));
    same("ك٢. والردُّ يقول: أصليٌّ محفوظ · نهائيٌّ صفر · ضمانٌ صريح",
      [w1.body?.originalPrice, w1.body?.finalPrice, w1.body?.priceKind,
        w1.body?.discountAmount, w1.body?.underWarranty],
      [75000, 0, "free", 0, true]);
    const wOrders = await ordersOf(PW);
    same("ك٣. **والعلمُ محفوظٌ على أمر العمل**", wOrders[0]?.warranty, true);
    same("ك٤. والأرقامُ في القاعدة: ٧٥٠٠٠ ⟵ ٠، بنوع `free`",
      [wOrders[0]?.mop, wOrders[0]?.mfp, wOrders[0]?.mpk], [75000, 0, "free"]);
    same("ك٥. وأمرُ العمل صيانةٌ مفتوحة", [wOrders[0]?.purpose, wOrders[0]?.status],
      ["maintenance", "active"]);
    const wSnap = await snap(PW);
    same("ك٦. **ولا كلفةَ ولا قيدَ ولا دفعةَ ولا دَين**",
      [wSnap.total, wSnap.case_cost, wSnap.ledger_rows, wSnap.payments, wSnap.paid],
      [0, 0, 0, 0, 0]);
    same("ك٧. **وأمرُ العمل والزيارةُ موجودان** — عملٌ حقيقيٌّ بقيمة صفر",
      [wSnap.orders, wSnap.visits, wSnap.history], [1, 1, 1]);
    same("ك٨. ولا صفَّ معلَّقٌ ولا مراجعةٌ طبية", [wSnap.pending, wSnap.reviews], [0, 0]);
    const [wAudit] = await q<{ nv: any; notes: string | null }>(
      `SELECT new_values nv, notes FROM audit_log WHERE entity_type='no_exam_operation'
         AND entity_id=$1`, [w1.body?.workOrderId]);
    //  `logAudit` يُسلسِل الحمولةَ نصّاً — فتُقرأ كما كُتبت.
    const wNv = typeof wAudit?.nv === "string" ? JSON.parse(wAudit.nv) : wAudit?.nv;
    same("ك٩. وسطرُ التدقيق يحمل العلمَ صراحةً", wNv?.underWarranty, true);
    same("ك٩ب. وأرقامَه", [wNv?.originalPrice, wNv?.discountAmount, wNv?.finalPrice],
      [75000, 0, 0]);
    check(/ضمن الضمان/.test(String(wAudit?.notes)) && /بلا أجور/.test(String(wAudit?.notes)),
      "ك٩ج. **وسطرُه المقروء يقول «ضمن الضمان»** لا «مجّاني»", String(wAudit?.notes));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ل. والمجّانيُّ العاديُّ يبقى مميَّزاً عن الضمان ──");
    // ══════════════════════════════════════════════════════════════════
    const f1 = await maint({
      ...wBody, maintenanceComponent: "tube", originalPrice: 40000, discountAmount: 40000,
    });
    check(f1.status === 201, "ل١. والمجّانيُّ العاديُّ يُحفَظ كما كان", JSON.stringify(f1.body));
    same("ل٢. بنوع `free` و**بعلمِ ضمانٍ `false`**",
      [f1.body?.priceKind, f1.body?.finalPrice, f1.body?.underWarranty], ["free", 0, false]);
    const rowsPW = await ordersOf(PW);
    const freeRow = rowsPW.find((o: any) => o.id === f1.body?.workOrderId);
    const warrRow = rowsPW.find((o: any) => o.id === w1.body?.workOrderId);
    same("ل٣. **والصفّان يفترقان في القاعدة** — نوعُهما واحدٌ وعلمُهما مختلف",
      [freeRow?.mpk, freeRow?.warranty, warrRow?.mpk, warrRow?.warranty],
      ["free", false, "free", true]);
    const [warrantyCount] = await q<{ n: number }>(
      `SELECT count(*)::int n FROM prosthetic_work_orders
        WHERE patient_id=$1 AND maintenance_under_warranty IS TRUE`, [PW]);
    same("ل٤. وسؤالُ «كم صيانةَ ضمانٍ لهذا المريض؟» له جوابٌ واحد",
      Number(warrantyCount?.n), 1);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── م. تذكرتان ⟶ ضمانان مستقلّان · وتذكرةٌ واحدة ⟶ لا تكرار ──");
    // ══════════════════════════════════════════════════════════════════
    const PT = await mkPatient("م");
    const CT = await mkCase(PT);
    const EPT = await mkEpisode(PT, CT, 1);
    const tBody = {
      patientId: PT, serviceType: "prosthetic", deviceEpisodeId: EPT,
      maintenanceComponent: "knee", expertUserId: EXPERT, originalPrice: 60000,
      underWarranty: true,
    };
    const t1 = await maint({ ...tBody });
    const t2 = await maint({ ...tBody });
    check(t1.status === 201 && t2.status === 201,
      "م١. **ضمانان متطابقان برمزين مختلفين ⟶ ينجحان**",
      `${t1.status}/${t2.status}`);
    const tSnap = await snap(PT);
    same("م٢. وأمران وزيارتان — كلٌّ بعلمِ ضمانه", [tSnap.orders, tSnap.visits], [2, 2]);
    const bothWarranty = (await ordersOf(PT)).every((o: any) => o.warranty === true);
    check(bothWarranty, "م٣. وكلاهما `maintenance_under_warranty = TRUE`");
    const sharedTok = newTok();
    const t3 = await maint({ ...tBody, submissionToken: sharedTok });
    const t4 = await maint({ ...tBody, submissionToken: sharedTok });
    same("م٤. **ونفسُ التذكرة ⟶ عمليةٌ واحدة**",
      [t3.status, t4.status, t4.body?.duplicate === true], [201, 200, true]);
    same("م٥. فثلاثةُ أوامرٍ لا أربعة", (await snap(PT)).orders, 3);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ن. خصمٌ مع الضمان ⟶ ٤٠٠ بصفر كتابة ──");
    // ══════════════════════════════════════════════════════════════════
    const PN = await mkPatient("ن");
    const CN = await mkCase(PN);
    const EPN = await mkEpisode(PN, CN, 1);
    const nBody = {
      patientId: PN, serviceType: "prosthetic", deviceEpisodeId: EPN,
      maintenanceComponent: "knee", expertUserId: EXPERT, originalPrice: 50000,
    };
    const beforeN = await snap(PN);
    const bad1 = await maint({ ...nBody, underWarranty: true, discountAmount: 10000 });
    same("ن١. خصمٌ مع الضمان يُردّ ٤٠٠ برسالته",
      [bad1.status, bad1.body?.error], [400, MAINTENANCE_WARRANTY_NO_DISCOUNT_ERROR]);
    const bad2 = await maint({ ...nBody, underWarranty: "yes" });
    same("ن٢. وعلمٌ غيرُ بوليان يُردّ ٤٠٠ ولا يُصحَّح بصمت",
      [bad2.status, bad2.body?.error], [400, MAINTENANCE_WARRANTY_FLAG_ERROR]);
    const bad3 = await maint({ ...nBody, underWarranty: true, originalPrice: 0 });
    check(bad3.status === 400, "ن٣. وضمانٌ بلا سعرٍ أصليٍّ موجب يُردّ ٤٠٠",
      JSON.stringify(bad3.body));
    same("ن٤. **وصفرُ كتابةٍ في الثلاثة**", await snap(PN), beforeN);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── س. العاديُّ والخصمُ والمجّانيُّ — دلالاتُها كما كانت ──");
    // ══════════════════════════════════════════════════════════════════
    const n1 = await maint({ ...nBody, discountAmount: 0, paidNow: 50000 });
    same("س١. **عاديّ**: نهائيٌّ = أصليّ، نوعُه `normal`، وبلا ضمان",
      [n1.body?.finalPrice, n1.body?.priceKind, n1.body?.underWarranty],
      [50000, "normal", false]);
    const n2 = await maint({
      ...nBody, maintenanceComponent: "tube", discountAmount: 20000, paidNow: 0,
    });
    same("س٢. **بخصم**: ٥٠٠٠٠ − ٢٠٠٠٠ = ٣٠٠٠٠ بنوع `discount`",
      [n2.body?.originalPrice, n2.body?.discountAmount, n2.body?.finalPrice,
        n2.body?.priceKind, n2.body?.underWarranty],
      [50000, 20000, 30000, "discount", false]);
    const n3 = await maint({
      ...nBody, maintenanceComponent: "foot", discountAmount: 50000,
    });
    same("س٣. **مجّانيّ**: نهائيٌّ صفرٌ والأصليُّ محفوظ، بنوع `free` وبلا ضمان",
      [n3.body?.originalPrice, n3.body?.finalPrice, n3.body?.priceKind,
        n3.body?.underWarranty],
      [50000, 0, "free", false]);
    const nSnap = await snap(PN);
    same("س٤. والمالُ: ٥٠٠٠٠ + ٣٠٠٠٠ مقيَّدان، والمجّانيُّ صفر",
      [nSnap.total, nSnap.ledger, nSnap.paid], [80000, 80000, 50000]);
    const nRows = await ordersOf(PN);
    same("س٥. وثلاثةُ أوامرٍ بأعلامِ ضمانٍ `false` صريحة",
      nRows.map((o: any) => o.warranty), [false, false, false]);
    same("س٦. و`no_exam_no_charge` كما كان: المجّانيُّ وحده `true`",
      nRows.map((o: any) => o.nocharge), [false, false, true]);

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ع. الصلاحيةُ والنطاقُ على نقطة التنبيه ──");
    // ══════════════════════════════════════════════════════════════════
    const docCheck = await similar({ ...base }, S.doctor);
    check(docCheck.status === 403, "ع١. **الطبيبُ يُردّ ٤٠٣** — لا سلطةَ له على الصيانة",
      JSON.stringify(docCheck.body));
    const outOfScope = await similar({ ...base }, S.other);
    check(outOfScope.status === 403, "ع٢. وفرعٌ خارج النطاق يُردّ ٤٠٣",
      JSON.stringify(outOfScope.body));
    const adminCheck = await similar({ ...base }, S.admin);
    check(adminCheck.status === 200, "ع٣. والمسؤولُ يقرأ", JSON.stringify(adminCheck.body));
    const noPatient = await similar({ ...base, patientId: 99999999 });
    check(noPatient.status === 404, "ع٤. ومريضٌ لا وجود له ⟶ ٤٠٤", String(noPatient.status));
    const badShape = await similar({ patientId: P, serviceType: "prosthetic" });
    check(badShape.status === 400,
      "ع٥. وشكلٌ ناقص (بلا جهازٍ ولا إقرار) يُردّ ٤٠٠ ولا يُخمَّن", String(badShape.status));

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ف. عقدُ الشاشة وحارسٌ معماريّ ──");
    // ══════════════════════════════════════════════════════════════════
    const simFn = STORE_SRC.slice(STORE_SRC.indexOf("export async function listSimilarOpenMaintenance"));
    const simBody = simFn.slice(0, simFn.indexOf("\n}\n"));
    check(!/INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM/i.test(simBody),
      "ف١. **قراءةٌ فقط**: لا `INSERT` ولا `UPDATE` ولا `DELETE` في فحص التشابه");
    check(!/submission_tokens/i.test(simBody),
      "ف٢. **ولا تلمس تذكرةَ الإرسال** إطلاقاً");
    const simRoute = ROUTES_SRC.slice(ROUTES_SRC.indexOf('app.post("/api/no-exam/maintenance/similar"'));
    const simRouteBody = simRoute.slice(0, simRoute.indexOf("\n  });"));
    check(!/createMaintenanceOperation|logAudit|submissionToken/.test(simRouteBody),
      "ف٣. ونقطةُ التنبيه لا تسجّل عمليةً ولا تدقيقاً ولا تطلب تذكرة");
    check(/canCompleteMaintenance\(chargeSession\(req\)\)/.test(simRouteBody),
      "ف٤. وتحرسها بوّابةُ الصيانة نفسُها");
    check(!/hasOpenOrder|uq_pwo_one_open_maint/i.test(simBody + simRouteBody),
      "ف٥. **ولا حارسَ أمرٍ مفتوحٍ يعود** ولا فهرسٌ فريدٌ يُذكَر");
    check(/maintenanceUnderWarranty:\s*params\.underWarranty \?\? null/.test(MFG_SRC),
      "ف٦. والكاتبُ القانونيُّ يكتب العلمَ، و`undefined` تبقى `NULL`");
    //  ── عقدُ الشاشة ──
    check(/"\/api\/no-exam\/maintenance\/similar"/.test(DIALOG_SRC),
      "ف٧. والشاشةُ تسأل نقطةَ التنبيه قبل الحفظ");
    check(/if \(rows\.length > 0\) \{ setSimilarRows\(rows\); return; \}/.test(DIALOG_SRC),
      "ف٨. **وتتوقّف قبل `save.mutate()`** حين يوجد مشابه");
    check(/const continueDespiteSimilar = \(\) => \{[\s\S]*?setSimilarAck\(true\);[\s\S]*?save\.mutate\(\);/
      .test(DIALOG_SRC), "ف٩. و«متابعة» تحفظ **بالتذكرة نفسِها**");
    check(/data-testid="no-exam-op-similar-back"[\s\S]*?onClick=\{\(\) => setSimilarRows\(null\)\}/
      .test(DIALOG_SRC), "ف١٠. و«رجوع» لا تحفظ شيئاً");
    check(/data-testid="no-exam-op-warranty"/.test(DIALOG_SRC),
      "ف١١. ومربّعُ «ضمن الضمان» في نافذة الصيانة");
    check(/\.\.\.\(warrantyOn \? \{ underWarranty: true \} : \{ discountAmount \}\)/.test(DIALOG_SRC),
      "ف١٢. **ولا خصمَ يُرسَل مع الضمان**");
    check(/\{!warrantyOn && \([\s\S]*?no-exam-op-discount-amount/.test(DIALOG_SRC),
      "ف١٣. وحقلُ الخصم يختفي مع الضمان");
    check(/no-exam-op-paid-now-warranty/.test(DIALOG_SRC),
      "ف١٤. وحقلُ المبلغ المدفوع كذلك");
    check(/submissionToken,/.test(DIALOG_SRC),
      "ف١٥. وتذكرةُ الإرسال ما زالت تُرسَل مع الحفظ كما كانت");

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ص. المنطقُ الخالص ──");
    // ══════════════════════════════════════════════════════════════════
    const tNormal = deriveMaintenanceTerms({ originalPrice: 50000, discountAmount: 0 });
    same("ص١. بلا ضمان: عاديٌّ كما كان",
      [tNormal.ok, tNormal.kind, tNormal.finalPrice, tNormal.underWarranty],
      [true, "normal", 50000, false]);
    const tWarr = deriveMaintenanceTerms({
      originalPrice: 50000, discountAmount: 0, underWarranty: true,
    });
    same("ص٢. وبالضمان: أصليٌّ محفوظ · نهائيٌّ صفر · خصمٌ صفر · علمٌ صريح",
      [tWarr.ok, tWarr.originalPrice, tWarr.finalPrice, tWarr.discountAmount,
        tWarr.kind, tWarr.underWarranty],
      [true, 50000, 0, 0, "free", true]);
    const tFree = deriveMaintenanceTerms({ originalPrice: 50000, discountAmount: 50000 });
    same("ص٣. **والمجّانيُّ العاديُّ يفترق عنه بالعلم وحده**",
      [tFree.kind, tFree.finalPrice, tFree.underWarranty], ["free", 0, false]);
    same("ص٤. وخصمٌ مع الضمان يُردّ",
      deriveMaintenanceTerms({ originalPrice: 50000, discountAmount: 1, underWarranty: true }).error,
      MAINTENANCE_WARRANTY_NO_DISCOUNT_ERROR);
    same("ص٥. وعلمٌ غيرُ بوليان يُردّ",
      parseMaintenanceUnderWarranty("true"), { ok: false, error: MAINTENANCE_WARRANTY_FLAG_ERROR });
    same("ص٦. والغيابُ = «لا»", parseMaintenanceUnderWarranty(undefined), { ok: true, value: false });
    const desc = describeSimilarMaintenance({
      workOrderId: 12, createdAt: "2026-09-18T07:00:00.000Z", branchId: 1,
      branchName: "بغداد", expertUserId: 3, expertName: "فلان",
      maintenanceComponent: "knee", deviceEpisodeId: 5, status: "active",
    });
    check(desc.includes("#12") && desc.includes("2026-09-18") && desc.includes("فلان")
      && desc.includes("بغداد"), "ص٧. والوصفُ يقول الرقمَ والتاريخَ والخبيرَ والفرع", desc);
    const bare = describeSimilarMaintenance({
      workOrderId: 7, createdAt: null, branchId: null, branchName: null,
      expertUserId: null, expertName: null, maintenanceComponent: null,
      deviceEpisodeId: null, status: "active",
    });
    same("ص٨. **وما غاب يُحذَف ولا يُقال «—»**", bare, "أمر العمل #7");
    same("ص٩. والنافذةُ تُعرَض بصفوفٍ ولم يُقرَّر بعد",
      [shouldPromptSimilarMaintenance({ rows: [], acknowledged: false }),
        shouldPromptSimilarMaintenance({ rows: [{} as any], acknowledged: false }),
        shouldPromptSimilarMaintenance({ rows: [{} as any], acknowledged: true }),
        shouldPromptSimilarMaintenance({ rows: null, acknowledged: false })],
      [false, true, false, false]);

    // ══════════════════════════════════════════════════════════════════
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص الضمان وتنبيه التشابه نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
