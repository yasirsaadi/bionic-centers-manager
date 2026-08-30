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
// (٣) **المبلغُ المدفوع الآن إلزاميٌّ وموجبٌ لكلّ خدمةٍ غير مجّانية بكلفةٍ
//     موجبة** (تصحيحٌ تشغيليّ — الجهوزيةُ الماليةُ): فراغٌ أو صفرٌ يُردّ
//     ٤٠٠ برسالةٍ صريحة بلا كتابةٍ إطلاقاً — سواءٌ للجلسات الإضافية أو
//     غيرها. **والاستثناءُ الوحيد**: تبرّعٌ صريحٌ (`isFree`) أو خدمةٌ
//     لا كلفةَ فيها أصلاً (استشارةٌ طبية). ودفعٌ جزئيٌّ موجبٌ يبقى مقبولاً
//     كما كان — لا اشتراطَ أن يكون مضاعفَ سعر الجلسة.

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
  //  قسمُ «الفشلُ بعد سكّ التذكرة لا يُقفلها» يُنجح خصماً حقيقياً فعلاً —
  //  فيترك صفَّ خصمٍ حياً يشير إلى المريض، يُمسح قبل صفّه هو.
  await pool.query(`DELETE FROM service_discount_requests WHERE patient_id IN (${ids})`);
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

    //  **بالسعر القياسيّ**: روبوتٌ ٥٠,٠٠٠ للجلسة × جلستين = ١٠٠,٠٠٠.
    //  كانت هذه الحمولة تطلب جلستين بـ٥٠,٠٠٠ — أي **نصفَ القياسيّ بلا
    //  خصم**، وهو بالضبط الالتفافُ الذي صار الخادمُ يردّه (2026-08-21).
    //  فصارت متّسقةً مع نفسها: الحارسُ المُختبَر هنا هو حالةُ العلاج
    //  الطبيعي، لا السعر.
    const pYes = await mkPatient("مريض علاج طبيعي", true);
    r = await req(`/api/patients/${pYes}/new-service`, S.manager, {
      serviceType: "additional_therapy", serviceCost: 100000, initialPayment: 100000,
      sessionCount: 2, paymentTreatmentType: "روبوت",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      submissionToken: token(),
    });
    same("١٤. ولمريض العلاج الطبيعي ⇒ تُقبَل", r.status, 200);
    same("والكلفة قُيِّدت", (await storage.getPatient(pYes))?.totalCost, 100000);
    const payYes = await db.select().from(payments).where(eq(payments.patientId, pYes));
    same("ودفعةٌ بجلساتها", payYes.map((p) => [p.amount, p.sessionCount]), [[100000, 2]]);

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

    // ══ ٩-١٢. **الفشلُ بعد سكّ التذكرة لا يُقفلها** (تصحيحٌ تشغيليّ) ═══════
    //  ══ العطبُ الذي يغلقه ═════════════════════════════════════════════
    //  كان سكُّ التذكرة يقع **قبل** فتح المعاملة، وخارجَها تماماً: نداءٌ
    //  مستقلّ يلتزم فوراً. فإن فشلت العمليةُ التي تليه — خصمٌ بلا سببٍ صالح
    //  مثلاً — بقيت التذكرةُ محجوزةً إلى الأبد بلا أن تحمل خدمةً وقعت. وإعادةُ
    //  الإرسال بنفس التذكرة بعد تصحيح الخطأ كانت تُقرأ «مسجَّلة سابقاً»
    //  **كذباً** — الخدمةُ لم تقع قطّ.
    //
    //  فصار سكُّ التذكرة وتنفيذُ الكتابة (الخصمُ أو السعرُ الكامل) **معاملةً
    //  واحدة**: فشلٌ في أيّ خطوةٍ يرجع الاثنين معاً — لا صفَّ توكنٍ يتيماً،
    //  ولا نصفَ كتابة.
    console.log("\n── الفشلُ بعد سكّ التذكرة لا يُقفلها ──");
    const pFail = await mkPatient("مريض فشلٍ بعد التذكرة", true);
    const tFail = token();
    const discountedBody = (reason?: string) => ({
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      serviceCost: 80000,
      //  **سببٌ غائبٌ = فشلٌ حتميّ وحاسم** — `applyDiscountImmediately` يرفض
      //  بعد سكّ التذكرة وبعد فتح المعاملة، قبل أيّ إدراجٍ في
      //  `service_discount_requests`. مرشَّحٌ حتميّ لا عشوائيّ التوقيت.
      discount: reason ? { finalPrice: 80000, reason } : { finalPrice: 80000 },
      //  **مقبوضٌ كاملٌ صريح** — هذا القسمُ يفحص سلوكَ التذكرة لا حارسَ
      //  الدفع (المفحوصَ أدناه بتفصيلٍ)، فلا يمرّ به بلا داعٍ.
      initialPayment: 80000,
      submissionToken: tFail,
    });

    // — A. الطلبُ الأوّل: يفشل عمداً بعد سكّ التذكرة —
    const failed = await req(`/api/patients/${pFail}/new-service`, S.manager, discountedBody());
    same("٩. أ. الطلبُ الفاشل يُردّ ٤٠٠", failed.status, 400);
    check(String(failed.json?.message ?? "").includes("سبب الخصم"),
      "برسالةٍ تسمّي السببَ الناقص", JSON.stringify(failed.json));
    same("**ولا كلفةَ تحرّكت**", (await storage.getPatient(pFail))?.totalCost ?? 0, 0);
    same("ولا دفعة", (await db.select().from(payments).where(eq(payments.patientId, pFail))).length, 0);
    const visitsAfterFail = await pool.query(`SELECT id FROM visits WHERE patient_id = $1`, [pFail]);
    same("ولا زيارة", visitsAfterFail.rowCount ?? 0, 0);
    const sdrAfterFail = await pool.query(
      `SELECT id FROM service_discount_requests WHERE patient_id = $1`, [pFail]);
    same("**ولا صفَّ خصمٍ يتيمٌ بقي** — الإدراجُ رجع مع فشل التنفيذ",
      sdrAfterFail.rowCount ?? 0, 0);
    const tokenAfterFail = await pool.query(
      `SELECT token FROM submission_tokens WHERE token = $1`, [tFail]);
    same("**والأهمّ: التذكرةُ لم تُقفَل — رجعت مع كلّ شيء** (كانت هذه هي الثغرة)",
      tokenAfterFail.rowCount ?? 0, 0);

    // — B. الطلبُ الثاني بنفس التذكرة، مصحَّحاً: يجب أن ينجح فعلاً —
    const corrected = await req(`/api/patients/${pFail}/new-service`, S.manager,
      discountedBody("negotiation"));
    same("١٠. ب. **وبنفس التذكرة، مصحَّحاً، ينجح فعلاً**", corrected.status, 201);
    same("success:true لا وسمَ تكرارٍ كاذب", corrected.json?.success, true);
    check(!corrected.json?.duplicate,
      "**وبلا `duplicate:true` — هذه أوّلُ كتابةٍ حقيقية لا تكرار**",
      JSON.stringify(corrected.json));
    check(typeof corrected.json?.discountRequestId === "number" && corrected.json.discountRequestId > 0,
      "ومعه رقمُ طلب خصمٍ حقيقيّ", JSON.stringify(corrected.json));
    same("والكلفةُ قُيِّدت بالسعر المعتمَد", (await storage.getPatient(pFail))?.totalCost, 80000);
    const sdrAfterOk = await pool.query(
      `SELECT status FROM service_discount_requests WHERE patient_id = $1`, [pFail]);
    same("**وصفُّ خصمٍ واحدٌ معتمَد**", sdrAfterOk.rows.map((r: any) => r.status), ["approved"]);

    // — C. الطلبُ الثالث بنفس التذكرة بعد النجاح: تكرارٌ حقيقيّ الآن —
    const dupAfterOk = await req(`/api/patients/${pFail}/new-service`, S.manager,
      discountedBody("negotiation"));
    same("١١. ج. **وبعد النجاح، نفسُ التذكرة تُردّ تكراراً حقيقياً بلا كتابة**",
      dupAfterOk.status, 200);
    same("duplicate:true", dupAfterOk.json?.duplicate, true);
    same("**والكلفةُ لم تتغيّر ثانيةً**", (await storage.getPatient(pFail))?.totalCost, 80000);
    const sdrAfterDup = await pool.query(
      `SELECT id FROM service_discount_requests WHERE patient_id = $1`, [pFail]);
    same("**وصفُّ الخصم لا يزال واحداً — لا ثانياً**", sdrAfterDup.rowCount ?? 0, 1);
    same("ودفعةٌ واحدة لا اثنتان",
      (await db.select().from(payments).where(eq(payments.patientId, pFail))).length, 1);

    // — والسعرُ الكامل بلا خصم: التكرارُ الناجح يبقى كما كان (١٢) —
    console.log("\n── والسعرُ الكامل: التكرارُ الناجح لم يتأثّر ──");
    const pFullDup = await mkPatient("مريض تكرارٍ بالسعر الكامل", false);
    const tFull = token();
    const fullBody = { serviceType: "consultation", serviceCost: 15000, initialPayment: 15000, submissionToken: tFull };
    const f1 = await req(`/api/patients/${pFullDup}/new-service`, S.manager, fullBody);
    same("١٢. الأولى تمرّ بالسعر الكامل", f1.status, 200);
    const f2 = await req(`/api/patients/${pFullDup}/new-service`, S.manager, fullBody);
    same("والثانية بنفس التذكرة تُردّ تكراراً بلا كتابة ثانية", f2.json?.duplicate, true);
    same("والكلفةُ مرّةً واحدة", (await storage.getPatient(pFullDup))?.totalCost, 15000);

    // ══ حقيقةُ الدفع في الجلسات الإضافية (الجهوزيةُ المالية) ═══════════
    //  ══ العطبُ الذي يغلقه ═════════════════════════════════════════════
    //  كانت النافذةُ تُخفي حقلَ «المبلغ المدفوع الآن» عن الجلسات الإضافية
    //  وترسل `paidNow = serviceCost` دائماً، ثمّ كانت `executeNewService`
    //  تكتب حصّةَ كلّ بندٍ من **الكلفة** بوصفها **دفعتَه** — أي أن خصماً أو
    //  موافقةً على السعر كانا يُقرآن قبضاً كاملاً بصرف النظر عمّا وصل فعلاً.
    //  فصار المبلغُ المدفوع حقلاً حقيقياً، والكلفةُ والمقبوضُ حقيقتين
    //  منفصلتين تماماً: الكلفةُ (وتوزيعُها على البنود) كما كانت بحرفها،
    //  والمقبوضُ الفعليّ وحده يُوزَّع تناسبياً على صفوف الدفعات.
    console.log("\n── حقيقةُ الدفع في الجلسات الإضافية ──");

    // — A. **(تصحيحٌ تشغيليّ لاحق — الجهوزيةُ الماليةُ)** كلفةٌ ٥٠,٠٠٠
    //      ومقبوضٌ صفرٌ صريح ⟶ تُرفَض ٤٠٠ بصفر كتابةٍ كامل —
    //      ══════════════════════════════════════════════════════════════
    //      كان هذا يمرّ بنجاح (٢٠٠) ويقيّد الكلفةَ كاملةً ديناً «بلا إيرادٍ
    //      موجب» — بلا أن يقرّر أحدٌ ذلك عمداً ولا أن يكتب رقماً. صار
    //      الفراغُ/الصفرُ لخدمةٍ حقيقية غير مجّانية يُوقَف عند الباب،
    //      والحارسُ في `executeNewService` نفسِها — لا في نقطةٍ واحدة
    //      يلتفّ عليها بابٌ آخر.
    const pA = await mkPatient("أ — مقبوضٌ صفرٌ مرفوض", true);
    const rA = await req(`/api/patients/${pA}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 1, cost: 50000 }],
      serviceCost: 50000, initialPayment: 0, submissionToken: token(),
    });
    same("أ. **صفرٌ صريحٌ ⟶ ٤٠٠**", rA.status, 400);
    check(String(rA.json?.message ?? "").includes("أدخل المبلغ المدفوع الآن"),
      "برسالةٍ صريحة تسمّي المطلوب", JSON.stringify(rA.json));
    same("**ولا كلفةَ تحرّكت**", (await storage.getPatient(pA))?.totalCost ?? 0, 0);
    same("ولا دفعة", (await db.select().from(payments).where(eq(payments.patientId, pA))).length, 0);
    const visitsA = await pool.query(`SELECT id FROM visits WHERE patient_id = $1`, [pA]);
    same("ولا زيارة — صفرُ كتابةٍ كامل قبل فتح المعاملة أصلاً", visitsA.rowCount ?? 0, 0);

    // — A.ب نفسُ الحالة بالحقل **غائباً تماماً** (لا صفراً مكتوباً) — نفسُ
    //      الرفض، فلا فرقَ بين موظّفٍ نسي الحقلَ وآخرَ كتب صفراً —
    const pAb = await mkPatient("أ.ب — بلا حقل دفعٍ إطلاقاً", true);
    const rAb = await req(`/api/patients/${pAb}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 1, cost: 50000 }],
      serviceCost: 50000, submissionToken: token(),
      // بلا initialPayment إطلاقاً — لا `undefined` صريحاً حتى.
    });
    same("أ.ب. **والغيابُ التامّ للحقل مرفوضٌ كذلك ٤٠٠**", rAb.status, 400);
    same("ولا كلفةَ تحرّكت", (await storage.getPatient(pAb))?.totalCost ?? 0, 0);

    // — A.ج ونفسُ الرفض لخدمةٍ ليست جلساتٍ (استشارة) بكلفةٍ موجبة — الحارسُ
    //      عامٌّ لكلّ أنواع «خدمة جديدة» لا الجلسات الإضافية وحدها —
    const pAc = await mkPatient("أ.ج — استشارةٌ بلا دفع", false);
    const rAc = await req(`/api/patients/${pAc}/new-service`, S.manager, {
      serviceType: "consultation", serviceCost: 20000, submissionToken: token(),
    });
    same("أ.ج. **واستشارةٌ بكلفةٍ موجبة بلا دفعٍ تُرفَض كذلك ٤٠٠**", rAc.status, 400);
    same("ولا كلفةَ تحرّكت", (await storage.getPatient(pAc))?.totalCost ?? 0, 0);

    // — B. نفسُ الكلفة، مقبوضٌ ٢٠,٠٠٠ ⟶ الدفعةُ ٢٠,٠٠٠ بالضبط لا ٥٠,٠٠٠ —
    const pB = await mkPatient("ب — مقبوضٌ جزئيّ", true);
    const rB = await req(`/api/patients/${pB}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 1, cost: 50000 }],
      serviceCost: 50000, initialPayment: 20000, submissionToken: token(),
    });
    same("ب. تُقبَل", rB.status, 200);
    same("والكلفةُ الكاملة ٥٠,٠٠٠ — لا علاقةَ لها بالمقبوض", (await storage.getPatient(pB))?.totalCost, 50000);
    const payB = await db.select().from(payments).where(eq(payments.patientId, pB));
    same("**والدفعةُ ٢٠,٠٠٠ بالضبط — لا كلفةَ البند كاملةً**",
      payB.map((p) => [p.amount, p.sessionCount]), [[20000, 1]]);

    // — C. نفسُ الكلفة، مقبوضٌ كاملٌ ٥٠,٠٠٠ ⟶ السلوكُ القديم يبقى صحيحاً —
    const pC = await mkPatient("ج — مقبوضٌ كامل", true);
    const rC = await req(`/api/patients/${pC}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 1, cost: 50000 }],
      serviceCost: 50000, initialPayment: 50000, submissionToken: token(),
    });
    same("ج. تُقبَل", rC.status, 200);
    const payC = await db.select().from(payments).where(eq(payments.patientId, pC));
    same("**والدفعةُ الكاملة كما كانت** — لا ارتدادَ في الحالة الشائعة",
      payC.map((p) => [p.amount, p.sessionCount]), [[50000, 1]]);

    // — D. بندان، مقبوضٌ جزئيّ ⟶ الجلساتُ كلُّها محفوظة، ومجموعُ الدفعات
    //      يساوي المقبوضَ بالضبط، موزَّعاً تناسبياً لا على البند الأوّل وحده —
    const pD = await mkPatient("د — بندان بمقبوضٍ جزئيّ", true);
    const rD = await req(`/api/patients/${pD}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [
        { treatmentType: "روبوت", sessionCount: 2, cost: 100000 },
        { treatmentType: "أجهزة علاج طبيعي", sessionCount: 1, cost: 25000 },
      ],
      serviceCost: 125000, initialPayment: 50000, submissionToken: token(),
    });
    same("د. تُقبَل", rD.status, 200);
    same("والكلفةُ الكاملة ١٢٥,٠٠٠", (await storage.getPatient(pD))?.totalCost, 125000);
    const payD = await db.select().from(payments).where(eq(payments.patientId, pD));
    const sessionsD = payD.map((p) => p.sessionCount).sort((a, b) => (a ?? 0) - (b ?? 0));
    same("**وكلا البندين محفوظُ الجلسات** — ١ و٢ معاً لا أحدُهما فقط", sessionsD, [1, 2]);
    const sumD = payD.reduce((s, p) => s + (p.amount || 0), 0);
    same("**ومجموعُ الدفعات ٥٠,٠٠٠ بالضبط — لا ١٢٥,٠٠٠**", sumD, 50000);
    check(payD.every((p) => (p.amount || 0) >= 0), "ولا مبلغَ سالباً في أيّ صفّ");

    // — E. خصمٌ على الجلسات الإضافية: الكلفةُ النهائية تبقى مستقلّةً عن
    //      المقبوض الفعليّ — ٤٠,٠٠٠ كلفةً و١٠,٠٠٠ مقبوضاً، لا ١٠٠,٠٠٠ ولا ٤٠,٠٠٠ —
    const pE = await mkPatient("هـ — خصمٌ ومقبوضٌ جزئيّ", true);
    const rE = await req(`/api/patients/${pE}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      serviceCost: 100000,
      discount: { finalPrice: 40000, reason: "negotiation" },
      initialPayment: 10000, submissionToken: token(),
    });
    same("هـ. تُقبَل ٢٠١ (مسارُ الخصم الفوريّ)", rE.status, 201);
    same("**والكلفةُ النهائيةُ المعتمَدة ٤٠,٠٠٠**", (await storage.getPatient(pE))?.totalCost, 40000);
    const payE = await db.select().from(payments).where(eq(payments.patientId, pE));
    same("**والمقبوضُ الفعليّ ١٠,٠٠٠ فقط — لا ٤٠,٠٠٠ ولا ١٠٠,٠٠٠**",
      payE.map((p) => [p.amount, p.sessionCount]), [[10000, 2]]);

    // — F. مجّانيٌّ يبقى صفراً فعلاً — ولو أُرسل مقبوضٌ (خاطئ) غيرَ صفر —
    const pF = await mkPatient("و — مجّانيّ", true);
    const rF = await req(`/api/patients/${pF}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 1, cost: 50000 }],
      serviceCost: 50000,
      discount: { isFree: true },
      initialPayment: 999999, submissionToken: token(),
    });
    same("و. تُقبَل ٢٠١", rF.status, 201);
    same("**والكلفةُ صفرٌ — تبرّعٌ حقيقيّ**", (await storage.getPatient(pF))?.totalCost, 0);
    const payF = await db.select().from(payments).where(eq(payments.patientId, pF));
    same("**والدفعةُ صفرٌ ومَوسومةٌ مجّانيةً — ولو أُرسل مقبوضٌ زائف**",
      payF.map((p) => [p.amount, p.sessionCount, p.isFreeSessions]), [[0, 1, true]]);

    // — ز. **خصمٌ مخفَّضٌ غيرُ مجّانيّ (١٠٠,٠٠٠ ⟵ ٨٠,٠٠٠) بمقبوضٍ صفرٍ أو
    //      غائب ⟶ يُرفَض كالسعر الكامل بالضبط** (تصحيحٌ لاحق) ══════════════
    //  ══ العطبُ الذي يغلقه ═════════════════════════════════════════════
    //  خصمٌ حقيقيٌّ ليس مجّانياً: المريضُ لا يزال يدفع مبلغاً موجباً له.
    //  والحارسُ هنا في `executeNewService` نفسِها لا يعرف شيئاً عن مصدر
    //  السعر (مباشرٌ أم عبر مسار الخصم) — فيُطبَّق بحرفه على الحالتين معاً.
    //  (قارِن مع «هـ» أعلاه: نفسُ الخصم، بمقبوضٍ **موجب** ١٠,٠٠٠ ⟶ ينجح.)
    const pZ = await mkPatient("ز — خصمٌ بمقبوضٍ صفر", true);
    const rZ = await req(`/api/patients/${pZ}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      serviceCost: 100000,
      discount: { finalPrice: 80000, reason: "negotiation" },
      initialPayment: 0, submissionToken: token(),
    });
    same("ز. **خصمٌ غيرُ مجّانيّ بمقبوضٍ صفرٍ صريح ⟶ ٤٠٠**", rZ.status, 400);
    check(String(rZ.json?.message ?? "").includes("أدخل المبلغ المدفوع الآن"),
      "برسالةٍ صريحة", JSON.stringify(rZ.json));
    same("**ولا كلفةَ تحرّكت**", (await storage.getPatient(pZ))?.totalCost ?? 0, 0);
    same("ولا دفعة", (await db.select().from(payments).where(eq(payments.patientId, pZ))).length, 0);
    const sdrZ = await pool.query(
      `SELECT id FROM service_discount_requests WHERE patient_id = $1`, [pZ]);
    same("**ولا صفَّ خصمٍ يتيمٌ بقي** — الإدراجُ رجع مع فشل التنفيذ", sdrZ.rowCount ?? 0, 0);

    //  ونفسُ الطلب **بلا** حقل `initialPayment` إطلاقاً — نفسُ الرفض.
    const pZb = await mkPatient("ز.ب — خصمٌ بلا حقل دفعٍ إطلاقاً", true);
    const rZb = await req(`/api/patients/${pZb}/new-service`, S.manager, {
      serviceType: "additional_therapy",
      treatmentEntries: [{ treatmentType: "روبوت", sessionCount: 2, cost: 100000 }],
      serviceCost: 100000,
      discount: { finalPrice: 80000, reason: "negotiation" },
      submissionToken: token(),
    });
    same("ز.ب. **والحقلُ الغائبُ تماماً مرفوضٌ كذلك ٤٠٠**", rZb.status, 400);
    same("ولا كلفةَ تحرّكت", (await storage.getPatient(pZb))?.totalCost ?? 0, 0);
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
