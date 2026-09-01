// عملياتٌ متوازية مستقلّة على أجهزة المريض (ترحيل ٠٧٣) — حيّاً على Postgres
// وعلى النقطة الحقيقية `/api/no-exam/device-sale`.
// قاعدة محلّية: `npm run test:parallel-device-operations`.
//
// ══ القاعدةُ التجارية الجديدة (قرارُ المالك) ═══════════════════════════════
// لمريضٍ واحد **أيّ عددٍ** من عمليات الأجهزة المستقلّة في آنٍ واحد — نفسُ
// الخدمة، نفسُ الخبير، نفسُ الجزء، حتى عمليتان متطابقتان عمداً. الحمايةُ
// الباقية ضيّقة: أمرا عملٍ مفتوحان **لنفس حلقة الجهاز بعينها** وحده.
//
// ══ حادثةُ موسى — إعادةُ إنتاجٍ كاملة (قسم أ) ═══════════════════════════
// مريضٌ يملك طرفاً كاملاً قيد التصنيع من فرعه القديم، يُنقَل إلى فرعٍ آخر،
// ثمّ يشتري **قالباً** كعمليةٍ مستقلّة تماماً باختيار «لا» على سؤال
// الإلحاق. كان `startDeviceEpisodeTx` يرفض والفرعُ الجديد لم يكن يصل
// العمليةَ الجديدة أصلاً (`patient_cases.branch_id` بقي على القديم بعد
// `transferPatientToBranch`) — كلاهما مُصلَحٌ هنا ومُثبَتٌ معاً.
//
// وما يُثبته، بندَ بندٍ:
//   • أ: حادثةُ موسى الكاملة — النقلُ يحرّك خيط الحالات، البيعُ الجديد
//     ينجح، حلقةٌ وأمرٌ جديدان في الفرع **الحاليّ**، الكلفةُ تُضاف مرّةً،
//     بلا دفعةٍ مخترَعة، والعمليةُ القديمة بلا مساس.
//   • ب: ثلاث عملياتٍ مستقلّة — نفس المريض/الخدمة/الخبير/الجزء — تنجح معاً.
//   • ج: الإلحاقُ الصريح («نعم») باقٍ كما كان — يضيف للحلقة المختارة وحدها.
//   • د: تعدّدُ مُرشَّحي الإلحاق — الخادمُ يحسم بالمعرّف الصريح لا بالتخمين،
//     ولا يُفضَّل أحدُهما تلقائياً.
//   • هـ: أمرا عملٍ مفتوحان لنفس الحلقة بعينها — يبقيان مرفوضَين (القيدان
//     الجديدان معاً: الهويّةُ المحدَّدة، والموروثُ بلا حلقة).

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { patientCases } from "@shared/schema";
import { eq } from "drizzle-orm";

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
/** تُرجع رسالة الخطأ إن رفضت القاعدة، أو `null` إن قبلت. */
async function refused(fn: () => Promise<unknown>): Promise<string | null> {
  try { await fn(); return null; } catch (e: any) { return String(e?.message ?? e); }
}

const PORT = 6862;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-عمليات-متوازية";
const ADMIN = 9991, RECV = 9992, EXPERT = 9993, EXPERT2 = 9994, EXPERT_B2 = 9995;
const USERS = [ADMIN, RECV, EXPERT, EXPERT2, EXPERT_B2];

const S = {
  admin: {
    userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "المسؤول", permissions: {},
  },
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "ريام", permissions: { canAddPatients: true },
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

async function mkPatient(label: string, branch = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, total_cost,
       patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branch]);
  return r[0].id;
}
async function mkCase(patientId: number, branch = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active') RETURNING id`, [patientId, branch]);
  return r[0].id;
}
/** يزرع «عمليةً موجودة» (حلقة + أمر عمل) كما لو وُلدت من مسار المعاينة يوماً. */
async function mkExistingFullDevice(
  patientId: number, caseId: number, branch: number, seq: number, expert = EXPERT,
) {
  const [ep] = await q<{ id: number }>(
    `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
       status, agreed_cost, requested_item, component, service_path, created_by)
     VALUES ($1,$2,$3,$4,'in_manufacturing',1750000,'full_device',NULL,'exam',$5) RETURNING id`,
    [patientId, caseId, branch, seq, RECV]);
  const [wo] = await q<{ id: number }>(
    `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
       status, current_stage, purpose, device_episode_id, assigned_by)
     VALUES ($1,$2,'prosthetic',$3,'active','mold','initial_build',$4,$5) RETURNING id`,
    [patientId, branch, expert, ep.id, RECV]);
  return { episodeId: ep.id, workOrderId: wo.id };
}
const episodeOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, case_id::int c, branch_id::int b,
      status, agreed_cost::int ac, requested_item ri, sequence_number::int seq
    FROM patient_device_episodes WHERE id=$1`, [id]);
  return r ?? null;
};
const orderOf = async (id: number) => {
  const [r] = await q(`SELECT id, patient_id::int p, branch_id::int b, purpose, status,
      device_episode_id::int de, expert_user_id::int ex, current_stage cs
    FROM prosthetic_work_orders WHERE id=$1`, [id]);
  return r ?? null;
};
async function moneyOf(patientId: number) {
  const [p] = await q(`SELECT total_cost::int t FROM patients WHERE id=$1`, [patientId]);
  const [n] = await q(`SELECT
      (SELECT COALESCE(SUM(cost),0)::int FROM patient_cases WHERE patient_id=$1) AS case_cost,
      (SELECT COALESCE(SUM(amount),0)::int FROM cost_entries WHERE patient_id=$1) AS ledger,
      (SELECT count(*)::int FROM cost_entries WHERE patient_id=$1) AS ledger_rows,
      (SELECT count(*)::int FROM prosthetic_work_orders WHERE patient_id=$1) AS orders,
      (SELECT count(*)::int FROM patient_device_episodes WHERE patient_id=$1) AS episodes,
      (SELECT count(*)::int FROM payments WHERE patient_id=$1) AS payments`,
    [patientId]);
  return { total: Number(p?.t ?? 0), ...n };
}

const sale = (body: any, session: any = S.recv) =>
  http("POST", "/api/no-exam/device-sale", session, { paidNow: 0, ...body });

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM post_exam_followup_events WHERE patient_id IN (${ids})`);
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
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, branchIds] of [
    [ADMIN, "admin", "المسؤول", 1, [1, 2]],
    [RECV, "reception", "ريام", 1, [1]],
    [EXPERT, "prosthetics_expert", "الخبير", 1, [1]],
    [EXPERT2, "prosthetics_expert", "الخبير الثاني", 1, [1]],
    [EXPERT_B2, "prosthetics_expert", "خبير الفرع الآخر", 2, [2]],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
             VALUES ($1,$2,'x',$4,$3,$5,$6::jsonb,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role,
               display_name=EXCLUDED.display_name, is_active=true,
               branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids`,
      [id, `pdo_u${id}`, role, name, branch, JSON.stringify(branchIds)]);
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
    console.log("\n── أ. حادثةُ موسى — إعادةُ إنتاجٍ كاملة ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("أ-موسى", 1);
      const caseId = await mkCase(pid, 1);
      // «طرفٌ كاملٌ قيد التصنيع بالفعل من الفرع القديم».
      const original = await mkExistingFullDevice(pid, caseId, 1, 1, EXPERT);

      // «تُنقَل المريضةُ/المريض إلى فرعٍ آخر».
      const transferred = await storage.transferPatientToBranch(pid, 2);
      check(!!transferred && transferred.branchId === 2, "أ١. النقلُ ينجح ويحدّث فرع المريض", String(transferred?.branchId));
      const caseAfter = (await db.select().from(patientCases).where(eq(patientCases.id, caseId)))[0];
      same("أ٢. **وخيطُ الحالات ينتقل معه** — إصلاحٌ مطلوب لهذه الحادثة بعينها",
        caseAfter.branchId, 2);
      const origEpBefore = await episodeOf(original.episodeId);
      const origWoBefore = await orderOf(original.workOrderId);
      same("أ٣. **والعمليةُ القديمة تبقى بفرعها التاريخيّ** — لا يُعاد كتابة تاريخٍ",
        [origEpBefore.b, origWoBefore.b], [1, 1]);

      // «يشتري قالباً كعمليةٍ مستقلّة، اختيار الإلحاق = لا (بلا attachToDeviceEpisodeId)».
      const r = await sale({
        patientId: pid, component: "socket", expertUserId: EXPERT_B2,
        originalPrice: 40_000, discountAmount: 0, paidNow: 0,
      }, S.admin);
      check(r.status === 201, "أ٤. **البيعُ الجديد ينجح** — لا يُرفَض لوجود عمليةٍ أخرى مفتوحة",
        JSON.stringify(r.body));
      check(r.body.deviceEpisodeId !== original.episodeId && r.body.workOrderId !== original.workOrderId,
        "أ٥. **حلقةٌ وأمرٌ جديدان** — لا العمليةُ القديمة نفسُها", JSON.stringify(r.body));
      const newEp = await episodeOf(r.body.deviceEpisodeId);
      const newWo = await orderOf(r.body.workOrderId);
      same("أ٦. **والجديدان في الفرع الحاليّ (٢) لا القديم (١)** — أثرُ إصلاح النقل مباشرةً",
        [newEp.b, newWo.b], [2, 2]);
      same("    والحلقةُ الجديدة: نفسُ الخيط · in_manufacturing · socket",
        [newEp.c, newEp.status, newEp.ri], [caseId, "in_manufacturing", "socket"]);
      const m = await moneyOf(pid);
      same("أ٧. **الكلفةُ أُضيفت مرّةً واحدة** — ٤٠,٠٠٠ فقط، وحلقتان وأمران بالضبط",
        [m.total, m.ledger, m.ledger_rows, m.episodes, m.orders], [40_000, 40_000, 1, 2, 2]);
      same("أ٨. **وبلا دفعةٍ مخترَعة** — paidNow=0 لا يكتب صفّاً", m.payments, 0);
      const origEpAfter = await episodeOf(original.episodeId);
      const origWoAfter = await orderOf(original.workOrderId);
      same("أ٩. **والعمليةُ الأولى (الطرف العلويّ/الكامل) بلا مساس تماماً**",
        [origEpAfter.status, origEpAfter.ac, origEpAfter.seq, origWoAfter.status, origWoAfter.cs, origWoAfter.ex],
        [origEpBefore.status, origEpBefore.ac, origEpBefore.seq, origWoBefore.status, origWoBefore.cs, origWoBefore.ex]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. ثلاث عملياتٍ مستقلّة — نفس المريض/الخدمة/الخبير/الجزء ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ب-ثلاث-عمليات", 1);
      await mkCase(pid, 1);
      const ids: { ep: number; wo: number }[] = [];
      for (let i = 0; i < 3; i++) {
        const r = await sale({
          patientId: pid, component: "socket", expertUserId: EXPERT,
          originalPrice: 30_000, discountAmount: 0, paidNow: 0,
        });
        check(r.status === 201, `ب${i + 1}. العمليةُ المستقلّة رقم ${i + 1} تنجح رغم مثيلاتها المفتوحة`,
          JSON.stringify(r.body));
        ids.push({ ep: r.body.deviceEpisodeId, wo: r.body.workOrderId });
      }
      const distinctEp = new Set(ids.map((x) => x.ep));
      const distinctWo = new Set(ids.map((x) => x.wo));
      same("ب٤. **الثلاثُ حلقاتٍ وأوامرَ متمايزة** — نفسُ الجزء عمداً مرّتين وأكثر، بلا دمج",
        [distinctEp.size, distinctWo.size], [3, 3]);
      const m = await moneyOf(pid);
      same("ب٥. وثلاثُ حلقاتٍ وأوامرَ بالضبط، وكلفةٌ تراكمت ٩٠,٠٠٠",
        [m.episodes, m.orders, m.total], [3, 3, 90_000]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج. الإلحاقُ الصريح («نعم») باقٍ كما كان ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("ج-إلحاق-صريح", 1);
      const caseId = await mkCase(pid, 1);
      const target = await mkExistingFullDevice(pid, caseId, 1, 1, EXPERT);
      const r = await sale({
        patientId: pid, component: "knee", attachToDeviceEpisodeId: target.episodeId,
        originalPrice: 60_000, discountAmount: 0, paidNow: 0,
      });
      check(r.status === 201, "ج١. الإلحاقُ الصريح ينجح", JSON.stringify(r.body));
      same("ج٢. **بلا حلقةٍ ولا أمرٍ جديدَين** — يُلحَق بالحلقة المختارة نفسِها",
        [r.body.deviceEpisodeId, r.body.workOrderId], [target.episodeId, target.workOrderId]);
      const m = await moneyOf(pid);
      same("ج٣. حلقةٌ وأمرٌ واحدٌ بالضبط بعد الإلحاق", [m.episodes, m.orders], [1, 1]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── د. تعدّدُ مُرشَّحي الإلحاق — لا اختيارَ عشوائيّاً من الخادم ──");
    // ══════════════════════════════════════════════════════════════════
    {
      const pid = await mkPatient("د-مرشحون-متعددون", 1);
      const caseId = await mkCase(pid, 1);
      const first = await mkExistingFullDevice(pid, caseId, 1, 1, EXPERT);
      const second = await mkExistingFullDevice(pid, caseId, 1, 2, EXPERT2);
      //  **مقصودٌ الثاني لا الأوّل** — لو كان الخادمُ يختار «الحلقةَ المفتوحة»
      //  ضمناً (بلا هويّةٍ صريحة) لالتبس الاثنان؛ الهويّةُ الصريحة تحسم.
      const r = await sale({
        patientId: pid, component: "tube", attachToDeviceEpisodeId: second.episodeId,
        originalPrice: 20_000, discountAmount: 0, paidNow: 0,
      });
      check(r.status === 201, "د١. الإلحاقُ بالهويّة الصريحة الثانية ينجح", JSON.stringify(r.body));
      same("د٢. **ويُلحَق بالثاني بعينه لا الأوّل** — لا تفضيلَ ضمنيّاً لأقدم مُرشَّح",
        [r.body.deviceEpisodeId, r.body.workOrderId], [second.episodeId, second.workOrderId]);
      const firstAfter = await episodeOf(first.episodeId);
      const firstWoAfter = await orderOf(first.workOrderId);
      same("د٣. **والمُرشَّحُ الأوّل بلا مساس** — لم يُختَر ولم يُمَسّ",
        [firstAfter.status, firstAfter.ac, firstWoAfter.status], ["in_manufacturing", 1750000, "active"]);
      const m = await moneyOf(pid);
      same("د٤. حلقتان وأمران فقط — لا حلقةَ ثالثةً اخترعها الخادمُ لعدم اليقين",
        [m.episodes, m.orders], [2, 2]);
    }

    // ══════════════════════════════════════════════════════════════════
    console.log("\n── هـ. أمرا عملٍ مفتوحان لنفس الحلقة بعينها — يبقيان مرفوضَين ──");
    // ══════════════════════════════════════════════════════════════════
    {
      //  الحمايةُ الضيّقة الباقية: `uq_pwo_one_open_build_per_episode` —
      //  حلقةٌ محدَّدة الهويّة، أمرا بناءٍ مفتوحان معاً عليها بعينها.
      const pid = await mkPatient("هـ-نفس-الحلقة", 1);
      const caseId = await mkCase(pid, 1);
      const [ep] = await q<{ id: number }>(
        `INSERT INTO patient_device_episodes (patient_id, case_id, branch_id, sequence_number,
           status, agreed_cost, requested_item, component, service_path, created_by)
         VALUES ($1,$2,1,1,'in_manufacturing',0,'full_device',NULL,'exam',$3) RETURNING id`,
        [pid, caseId, RECV]);
      await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','mold','initial_build',$3,$4)`,
        [pid, EXPERT, ep.id, RECV]);
      const dupSameEpisode = await refused(() => q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','mold','initial_build',$3,$4)`,
        [pid, EXPERT2, ep.id, RECV]));
      check(!!dupSameEpisode && /uq_pwo_one_open_build_per_episode|duplicate key/.test(dupSameEpisode),
        "هـ١. **أمرا عملٍ مفتوحان لنفس الحلقة المحدَّدة بعينها ⟶ يُرفَض**", String(dupSameEpisode));

      //  والقيدُ الموروث (`device_episode_id IS NULL`) لا يزال يمنع بناءً
      //  أوّلياً موروثاً ثانياً مفتوحاً لنفس (مريض، خدمة) بلا حلقة.
      const pidLegacy = await mkPatient("هـ-موروث-بلا-حلقة", 1);
      await q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','mold','initial_build',NULL,$3)`,
        [pidLegacy, EXPERT, RECV]);
      const dupLegacy = await refused(() => q(
        `INSERT INTO prosthetic_work_orders (patient_id, branch_id, service_type, expert_user_id,
           status, current_stage, purpose, device_episode_id, assigned_by)
         VALUES ($1,1,'prosthetic',$2,'active','mold','initial_build',NULL,$3)`,
        [pidLegacy, EXPERT2, RECV]));
      check(!!dupLegacy && /uq_pwo_one_open_legacy_build|duplicate key/.test(dupLegacy),
        "هـ٢. **وبناءٌ أوّليٌّ موروثٌ ثانٍ بلا حلقة لنفس (مريض، خدمة) ⟶ يبقى مرفوضاً**",
        String(dupLegacy));

      //  وحلقتان مستقلّتان (لا نفس الحلقة) على المريض نفسه ⟶ مقبولتان —
      //  الفرقُ الدقيق بين «نفس الحلقة» (مرفوض) و«حلقتان مختلفتان» (مقبول).
      const secondEpisode = await mkExistingFullDevice(pid, caseId, 1, 2, EXPERT2);
      check(secondEpisode.episodeId !== ep.id,
        "هـ٣. **وحلقةٌ ثانية مستقلّة على المريض نفسه تُفتَح بلا مشكلة**", String(secondEpisode.episodeId));
    }
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    httpServer.close();
  }

  console.log(`\n${failures === 0
    ? "✅ كل فحوص العمليات المتوازية المستقلّة نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
