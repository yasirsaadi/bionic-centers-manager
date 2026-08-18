// «خدمة جديدة» — حارس الجلسات الإضافية وتذكرة منع التكرار.
// قاعدة محلّية: `npm run test:new-service`.
//
// ══ لماذا يُركَّب جدول النقاط كاملاً هنا ═════════════════════════════════
// النقطة تعيش في `server/routes.ts` داخل `registerRoutes`، فلا تُستورَد
// وحدها. والتركيب الكامل هو الطريقة الوحيدة لفحصها **كما تعمل فعلاً**:
// بحُرّاسها وترتيبها وقاعدتها. ووسيط الجلسات وحده يُتخطّى (فهو يستبدل
// `req.session` بجلسةٍ من مخزنٍ حقيقي فتضيع الجلسة المحقونة)، وما عداه
// يعمل كما في الإنتاج.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) «جلسات علاج إضافية» لمريضٍ بلا حالة علاج طبيعي **تُردّ** — ثابتُ عملٍ
//     لا يعتمد على تعطيل زرٍّ في الواجهة.
// (٢) **تذكرة الإرسال تمنع التكرار فعلاً** — وهو ما كان يسقط بصمت لو
//     وصلت فارغةً من النافذة المُدارة.

import express from "express";
import { createServer } from "http";
import { pool, db } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { payments, patientCases } from "@shared/schema";
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

const PORT = 6803;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-خدمة-جديدة";
const MANAGER = 9701;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], displayName: "branch-manager-test",
    permissions: { canViewPatients: true, canAddPatients: true },
  },
};

async function req(path: string, session: any, body: any) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

async function mkPatient(name: string, physio: boolean): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition,
       branch_id, is_amputee, is_physiotherapy, total_cost)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,$3,$4,0) RETURNING id`,
    [name, MARK, !physio, physio]);
  if (physio) {
    await pool.query(
      `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,'physiotherapy',0)`,
      [rows[0].id]);
  }
  return rows[0].id;
}

const TOKENS: string[] = [];
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM journal_lines WHERE entry_id IN (
     SELECT id FROM journal_entries WHERE source_type = 'payment'
       AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids})))`);
  await pool.query(`DELETE FROM journal_entries WHERE source_type = 'payment'
     AND source_id IN (SELECT id FROM payments WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await pool.query(`DELETE FROM submission_tokens WHERE token LIKE 'ns-guard-%'`);
}

/** تذكرة موسومة كي تُنظَّف، ومفردة كي لا تصطدم بتشغيلٍ سابق. */
let seq = 0;
function token(): string {
  const t = `ns-guard-${process.pid}-${++seq}`;
  TOKENS.push(t);
  return t;
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await pool.query(
    `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
     VALUES ($1,$2,'x','مدير','branch_manager',1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
    [MANAGER, `ns_u${MANAGER}`]);
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  // وسيط الجلسات وحده يُتخطّى — يُعرَف باسم دالّته `session`. وما عداه
  // يُركَّب كما هو، فالنقطة تُفحَص بحُرّاسها الحقيقية لا بنسخةٍ منها.
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
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب، ووسيط الجلسات وحده متخطّى", String(skipped));

    // ══ ١٣-١٤. حارس «جلسات علاج إضافية» ═════════════════════════════════
    console.log("\n── الجلسات الإضافية تلزمها حالة علاج ──");
    const pNo = await mkPatient("مريض بلا علاج طبيعي", false);
    let r = await req(`/api/patients/${pNo}/new-service`, S.manager, {
      serviceType: "additional_therapy", serviceCost: 50000, initialPayment: 50000,
      sessionCount: 2, paymentTreatmentType: "روبوت",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 50000 }],
      submissionToken: token(),
    });
    same("١٣. جلسات إضافية لمريض بلا علاج طبيعي ⇒ 400", r.status, 400);
    check(String(r.json?.message ?? "").includes("يجب تفعيل حالة العلاج الطبيعي"),
      "برسالةٍ تسمّي الخطوة الأولى", JSON.stringify(r.json));
    same("**ولم يُحرَّك دينارٌ واحد**", (await storage.getPatient(pNo))?.totalCost ?? 0, 0);
    same("ولا دفعة", (await db.select().from(payments).where(eq(payments.patientId, pNo))).length, 0);

    const pYes = await mkPatient("مريض علاج طبيعي", true);
    r = await req(`/api/patients/${pYes}/new-service`, S.manager, {
      serviceType: "additional_therapy", serviceCost: 50000, initialPayment: 50000,
      sessionCount: 2, paymentTreatmentType: "روبوت",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 50000 }],
      submissionToken: token(),
    });
    same("١٤. ولمريض العلاج الطبيعي ⇒ تُقبَل", r.status, 200);
    same("والكلفة قُيِّدت", (await storage.getPatient(pYes))?.totalCost, 50000);
    const payYes = await db.select().from(payments).where(eq(payments.patientId, pYes));
    same("ودفعةٌ بجلساتها", payYes.map((p) => [p.amount, p.sessionCount]), [[50000, 2]]);

    // ولا يتغيّر شيءٌ في الاستشارة و«خدمة أخرى» — لم تُمَسّا بالحارس.
    for (const [st, label] of [["consultation", "استشارة"], ["other", "خدمة أخرى"]] as [string, string][]) {
      const p = await mkPatient(`مريض ${label}`, false);
      const res = await req(`/api/patients/${p}/new-service`, S.manager, {
        serviceType: st, serviceCost: 20000, initialPayment: 20000, submissionToken: token(),
      });
      same(`و«${label}» لمريضٍ بلا علاج طبيعي ⇒ تُقبَل كما كانت`, res.status, 200);
      same("والكلفة قُيِّدت", (await storage.getPatient(p))?.totalCost, 20000);
    }

    // ══ ٦-٨. استشارةٌ لمريض علاج **ليست جلسات** ═════════════════════════
    // هذا ما ترسله النافذة بعد الإصلاح: بلا `treatmentEntries` ولا وسمٍ ولا
    // عدد. والنقطة تقبله وتقيّده خدمةً عادية — لا شراءَ جلساتٍ في خطّته.
    console.log("\n── استشارة لمريض علاج طبيعي: خدمة عادية ──");
    const pPhysio = await mkPatient("مريض علاج + استشارة", true);
    r = await req(`/api/patients/${pPhysio}/new-service`, S.manager, {
      serviceType: "consultation", serviceCost: 25000, initialPayment: 25000,
      treatmentEntries: undefined, paymentTreatmentType: null, sessionCount: null,
      submissionToken: token(),
    });
    same("٦. استشارةٌ لمريض علاج ⇒ 200", r.status, 200);
    const pay = await db.select().from(payments).where(eq(payments.patientId, pPhysio));
    same("٧. ودفعتها بلا وسم جلسات ولا عدد",
      pay.map((p) => [p.paymentTreatmentType, p.sessionCount]), [[null, null]]);
    same("**ولا خطّة جلسات كُتبت على الملفّ**",
      (await storage.getPatient(pPhysio))?.physioPlan ?? null, null);
    const pcases = await db.select().from(patientCases).where(eq(patientCases.patientId, pPhysio));
    same("والكلفة على المريض", (await storage.getPatient(pPhysio))?.totalCost, 25000);
    check(pcases.length >= 1, "وحالته باقية كما هي", JSON.stringify(pcases.map((c) => c.caseType)));

    // ══ ٤. التذكرة تمنع التكرار فعلاً ═══════════════════════════════════
    console.log("\n── تذكرة الإرسال ──");
    const pDup = await mkPatient("مريض الضغطة المكرَّرة", false);
    const t1 = token();
    const body = {
      serviceType: "consultation", serviceCost: 30000, initialPayment: 30000,
      submissionToken: t1,
    };
    const first = await req(`/api/patients/${pDup}/new-service`, S.manager, body);
    same("٤. الأولى تمرّ", first.status, 200);
    same("وبلا وسم تكرار", first.json?.duplicate ?? false, false);
    const second = await req(`/api/patients/${pDup}/new-service`, S.manager, body);
    same("والثانية بالتذكرة نفسها تُردّ نجاحاً بلا كتابة", second.status, 200);
    same("**وموسومةً تكراراً**", second.json?.duplicate, true);
    same("**والكلفة مرّةً واحدة لا مرّتين**", (await storage.getPatient(pDup))?.totalCost, 30000);
    same("ودفعةٌ واحدة",
      (await db.select().from(payments).where(eq(payments.patientId, pDup))).length, 1);

    // وتذكرةٌ جديدة (فتحٌ جديد) تمرّ — فالمريض الذي يشتري خدمتين متطابقتين
    // فعلاً لا يُمنَع. وهذا ما تضمنه دالّة التذكرة الخالصة عند كل فتح.
    const third = await req(`/api/patients/${pDup}/new-service`, S.manager,
      { ...body, submissionToken: token() });
    same("وفتحٌ جديد بتذكرةٍ جديدة يمرّ", third.status, 200);
    same("والكلفة صارت مرّتين — لا منعَ لخدمةٍ حقيقية",
      (await storage.getPatient(pDup))?.totalCost, 60000);

    // **والفارغة لا تحمي**: هذا هو العطب الذي كانت النافذة المُدارة تقع فيه،
    // ويُثبَت هنا حيّاً كي يبقى معلوماً لماذا سكّ التذكرة إلزامي.
    const pEmpty = await mkPatient("مريض بلا تذكرة", false);
    const bodyEmpty = { serviceType: "consultation", serviceCost: 10000, initialPayment: 10000, submissionToken: "" };
    await req(`/api/patients/${pEmpty}/new-service`, S.manager, bodyEmpty);
    await req(`/api/patients/${pEmpty}/new-service`, S.manager, bodyEmpty);
    same("**وبتذكرةٍ فارغة تُكتَب مرّتين** — ولذلك سكّها إلزامي",
      (await storage.getPatient(pEmpty))?.totalCost, 20000);
  } finally {
    httpServer.close();
  }

  await cleanup();
  await pool.query(`DELETE FROM audit_log WHERE user_id = $1`, [MANAGER]);
  await pool.query(`DELETE FROM system_users WHERE id = $1`, [MANAGER]);
  console.log(failures === 0 ? "\n✅ all new-service-guard cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
