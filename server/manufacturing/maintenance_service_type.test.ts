// صيانة المريض الذي يحمل طرفاً ومسنداً — اختبار حيّ عبر النقطة الحقيقية.
// قاعدة محلّية: `npm run test:maintenance-service`.
//
// ══ العطب الذي يحرسه ═══════════════════════════════════════════════════
// كانت نقطة الصيانة تحسم نوع الجهاز بسطر واحد:
//   `patient.isAmputee ? "prosthetic" : "medical_support"`
// فمريضٌ يحمل **الاثنين** تُقيَّد صيانة مسنده على خيط الأطراف دائماً —
// أجورها تُنسَب لحالة الأطراف، وحارسُ «أمرٌ نشط واحد لكل خدمة» يمنع صيانة
// المسند لأن للأطراف أمراً مفتوحاً. والأولوية لم تكن قراراً بل أوّلَ شرطٍ
// في تعبيرٍ ثلاثي.
//
// ══ وما لم يتغيّر ═══════════════════════════════════════════════════════
// صاحبُ نوعٍ واحد لا يُسأل ولا يتغيّر عنده شيء، ومراحل الصيانة ومحاسبتها
// ومنطق أمرها كما هي حرفاً. ويُفحَص هنا أيضاً أن `add-case-type` بقي
// **بلا مال وبلا أمر تصنيع** — فذاك عقدُ الخيار الآخر في الموزِّع.

import express from "express";
import { pool, db } from "../db";
import { isAuthenticated } from "../replit_integrations/auth/replitAuth";
import { registerManufacturingRoutes } from "./routes";
import { storage } from "../storage";
import { prostheticWorkOrders as WO, patientCases, costEntries, payments } from "@shared/schema";
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

const PORT = 6799;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-صيانة-نوع-الجهاز";
const EXPERT = 9601, MANAGER = 9602;

const S = {
  manager: {
    userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1,
    accessibleBranches: [1], permissions: { canViewPatients: true, canAddPatients: true },
  },
};

async function req(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json", "x-test-session": JSON.stringify(session) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, json };
}

/** مريضٌ بأعلامٍ محدَّدة — فالنوع في الصيانة يُشتقّ منها. */
async function mkPatient(name: string, flags: {
  amputee?: boolean; support?: boolean; physio?: boolean;
}): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age, medical_condition,
       branch_id, is_amputee, is_medical_support, is_physiotherapy)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','amputee',1,$3,$4,$5) RETURNING id`,
    [name, MARK, !!flags.amputee, !!flags.support, !!flags.physio]);
  return rows[0].id;
}

async function ordersOf(patientId: number) {
  return db.select().from(WO).where(eq(WO.patientId, patientId));
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  //  طلباتُ مراجعة الطبيب (٠٥٥) تشير إلى الأمر والحلقة والزيارة — تُمسح أوّلاً.
  await pool.query(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await pool.query(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await pool.query(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  // لا مفتاح أجنبي من اليومية إلى الدفعات (تربطهما source_type/source_id)،
  // فلا تمنع الحذف — وتُنظَّف بمعرّفاتها لا أكثر.
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
}

async function main() {
  await pool.query(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role] of [[EXPERT, "prosthetics_expert"], [MANAGER, "branch_manager"]] as any[]) {
    await pool.query(
      `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
       VALUES ($1,$2,'x','موظّف',$3,1,'[1]'::jsonb,true) ON CONFLICT (id) DO NOTHING`,
      [id, `ms_u${id}`, role]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.headers["x-test-session"];
    req.session = h ? { branchSession: JSON.parse(h) } : {};
    next();
  });
  registerManufacturingRoutes(app, isAuthenticated);
  const server = app.listen(PORT);
  await new Promise((r) => server.once("listening", r));

  try {
    // ══ ١٣. طرفٌ فقط ⇒ prosthetic تلقائياً — بلا سؤال ولا تغيير سلوك ═══
    console.log("\n── صاحب نوعٍ واحد: كما كان تماماً ──");
    const pPro = await mkPatient("مريض طرف فقط", { amputee: true });
    let r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pPro, expertUserId: EXPERT, cost: 0 });
    same("١٣. طرفٌ فقط ⇒ 201 بلا تحديد نوع", r.status, 201);
    let ords = await ordersOf(pPro);
    same("ونوع الخدمة prosthetic", ords.map((o) => o.serviceType), ["prosthetic"]);
    same("وغرضه صيانة", ords.map((o) => o.purpose), ["maintenance"]);

    // ══ ١٤. مسندٌ فقط ⇒ medical_support تلقائياً ═════════════════════════
    const pSup = await mkPatient("مريض مسند فقط", { support: true });
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pSup, expertUserId: EXPERT, cost: 0 });
    same("١٤. مسندٌ فقط ⇒ 201 بلا تحديد نوع", r.status, 201);
    same("ونوعه medical_support", (await ordersOf(pSup)).map((o) => o.serviceType), ["medical_support"]);

    // ══ ١٥. الاثنان معاً ⇒ **يُطلَب التحديد** ولا يُخمَّن ════════════════
    console.log("\n── صاحب الاثنين: لا تخمين ──");
    const pDual = await mkPatient("مريض طرف ومسند", { amputee: true, support: true });
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pDual, expertUserId: EXPERT, cost: 0 });
    same("١٥. الاثنان بلا تحديد ⇒ 400", r.status, 400);
    check(String(r.json?.error ?? "").includes("حدّد نوع الجهاز"), "برسالةٍ تطلب التحديد", JSON.stringify(r.json));
    same("**ولا أمر صيانة أُنشئ بالتخمين**", (await ordersOf(pDual)).length, 0);
    same("ولا زيارة", (await pool.query(`SELECT COUNT(*)::int AS n FROM visits WHERE patient_id = $1`, [pDual])).rows[0].n, 0);

    // ١٦. اختيار الطرف ⇒ prosthetic.
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pDual, expertUserId: EXPERT, cost: 0, serviceType: "prosthetic" });
    same("١٦. اختيار الطرف ⇒ 201", r.status, 201);
    same("وأمرٌ واحد نوعه prosthetic", (await ordersOf(pDual)).map((o) => o.serviceType), ["prosthetic"]);

    // ١٧. اختيار المسند ⇒ medical_support — **وهذا ما كان مستحيلاً قبلاً**:
    // الحارس يمنع أمراً ثانياً لنفس الخدمة، وبالتعبير القديم كانت صيانة
    // المسند تُبنى على `prosthetic` فتصطدم بأمر الأطراف المفتوح.
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pDual, expertUserId: EXPERT, cost: 0, serviceType: "medical_support" });
    same("١٧. اختيار المسند ⇒ 201 مع وجود أمر أطراف مفتوح", r.status, 201);
    same("وأمران بخدمتين مستقلّتين",
      (await ordersOf(pDual)).map((o) => o.serviceType).sort(), ["medical_support", "prosthetic"]);
    check(String(r.json?.error ?? "") === "", "ولا رسالة تعارض", JSON.stringify(r.json));

    // والحارس نفسه لم يضعف: أمرٌ ثانٍ لنفس الخدمة ما زال مرفوضاً.
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pDual, expertUserId: EXPERT, cost: 0, serviceType: "prosthetic" });
    same("وحارس «أمرٌ نشط واحد لكل خدمة» كما هو ⇒ 409", r.status, 409);

    // ══ ١٨. نوعٌ لا يملكه المريض يُرفَض ═════════════════════════════════
    console.log("\n── التحقّق من الملكية ──");
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pPro, expertUserId: EXPERT, cost: 0, serviceType: "medical_support" });
    same("١٨. طلبُ مسندٍ لمريض أطراف فقط ⇒ 400", r.status, 400);
    check(String(r.json?.error ?? "").includes("غير مفعّل"), "برسالة «غير مفعّل على ملف المريض»", JSON.stringify(r.json));
    same("ولا أمر مسند أُنشئ", (await ordersOf(pPro)).filter((o) => o.serviceType === "medical_support").length, 0);

    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pSup, expertUserId: EXPERT, cost: 0, serviceType: "prosthetic" });
    same("والعكس كذلك ⇒ 400", r.status, 400);

    // وقيمةٌ لا يعرفها النظام أصلاً — لا تُقبل بحجّة أنها «مذكورة».
    const pPhysio = await mkPatient("مريض علاج فقط", { physio: true });
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pPhysio, expertUserId: EXPERT, cost: 0, serviceType: "physiotherapy" });
    same("ومريض علاجٍ فقط لا صيانة له ⇒ 400", r.status, 400);
    check(String(r.json?.error ?? "").includes("الأطراف والمساند"), "بالرسالة القائمة نفسها", JSON.stringify(r.json));
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pDual, expertUserId: EXPERT, cost: 0, serviceType: "orthosis" });
    same("وقيمةٌ مخترَعة ⇒ 400", r.status, 400);

    // ══ ٢١. أجور الصيانة ومحاسبتها لم تتغيّر — وتذهب لحالتها الصحيحة ═══
    // وهذا **الأثر المالي للإصلاح**: صيانة مسندِ مريضٍ يحمل الاثنين كانت
    // تُقيَّد على حالة الأطراف. والشكل نفسه لم يُمَسّ: الكلفة على الحالة
    // (`manual`) وعلى `total_cost`، وقيدٌ واحد بمصدر `maintenance`، ولا
    // دفعة تُخترَع هنا — تُسجَّل كالمعتاد بعدُ.
    console.log("\n── المحاسبة كما هي، والأجور على حالتها ──");
    const pFee = await mkPatient("مريض أجور الصيانة", { amputee: true, support: true });
    for (const ct of ["prosthetic", "medical_support"]) {
      await pool.query(
        `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,$2,0)`, [pFee, ct]);
    }
    r = await req("POST", "/api/manufacturing/maintenance-visit", S.manager,
      { patientId: pFee, expertUserId: EXPERT, cost: 40000, serviceType: "medical_support", notes: "صيانة مسند" });
    same("٢١. الصيانة بأجور ⇒ 201", r.status, 201);
    const feePatient = await storage.getPatient(pFee);
    same("والكلفة قُيِّدت على المريض", feePatient?.totalCost, 40000);
    const feeCosts = await db.select().from(costEntries).where(eq(costEntries.patientId, pFee));
    same("وقيدٌ واحد بمصدر maintenance", feeCosts.map((c) => [c.amount, c.source]), [[40000, "maintenance"]]);
    same("ولا دفعة تُخترَع — تُسجَّل كالمعتاد بعدُ",
      (await db.select().from(payments).where(eq(payments.patientId, pFee))).length, 0);
    const feeCases = await db.select().from(patientCases).where(eq(patientCases.patientId, pFee));
    same("**والأجور على حالة المسند لا الأطراف**",
      feeCases.map((c) => [c.caseType, c.cost]).sort(), [["medical_support", 40000], ["prosthetic", 0]]);
    same("وبمصدر كلفة يدويّ كما كان",
      feeCases.filter((c) => c.caseType === "medical_support").map((c) => c.costSource), ["manual"]);
    const supportCaseId = feeCases.find((c) => c.caseType === "medical_support")!.id;
    same("والزيارة نُسبت لحالة المسند كذلك",
      (await pool.query(`SELECT case_id FROM visits WHERE patient_id = $1`, [pFee])).rows.map((v: any) => v.case_id),
      [supportCaseId]);

    // ══ ١٩. `add-case-type` بلا مال وبلا أمر تصنيع ══════════════════════
    // خيار «أطراف صناعية» في الموزِّع يذهب إلى هذا المسار بالحمولة نفسها
    // التي ترسلها النافذة اليوم: `serviceCost: 0, paidNow: 0, skipWorkOrder`.
    console.log("\n── إضافة نوع حالة: قرارٌ لا مال ──");
    const pCase = await mkPatient("مريض إضافة نوع", { physio: true });
    const before = await storage.getPatient(pCase);
    const added = await storage.addPatientCaseType({
      patientId: pCase, caseType: "amputee", fields: {},
      serviceCost: 0, paidNow: 0,
      expertUserId: null, expectedDeliveryDate: null,
      skipWorkOrder: true, performedBy: MANAGER,
    });
    check(!!added.patient.isAmputee, "١٩. العلم فُعِّل على الملف");
    same("**ولا أمر تصنيع**", added.workOrderId, null);
    same("ولا أمر في الجدول", (await ordersOf(pCase)).length, 0);
    same("**ولا تحرّكت الكلفة**", added.patient.totalCost ?? 0, before?.totalCost ?? 0);
    same("ولا قيد كلفة", (await db.select().from(costEntries).where(eq(costEntries.patientId, pCase))).length, 0);
    same("ولا دفعة", (await db.select().from(payments).where(eq(payments.patientId, pCase))).length, 0);
    const cases = await db.select().from(patientCases).where(eq(patientCases.patientId, pCase));
    same("وحالة الأطراف أُنشئت بكلفة صفر",
      cases.filter((c) => c.caseType === "prosthetic").map((c) => c.cost), [0]);

    // ══ ٧. الحالة القائمة لا تُنشأ ثانيةً — والقاعدة نفسها تمنع ═════════
    let dup = false;
    try {
      await pool.query(
        `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,'prosthetic',0)`,
        [pCase]);
    } catch { dup = true; }
    check(dup, "٧. والقاعدة ترفض حالةً ثانية من النوع نفسه");
    same("فتبقى حالة أطراف واحدة",
      (await db.select().from(patientCases).where(eq(patientCases.patientId, pCase)))
        .filter((c) => c.caseType === "prosthetic").length, 1);
  } finally {
    server.close();
  }

  await cleanup();
  // التدقيق يشير إلى الفاعل بمفتاح أجنبي — فيُنظَّف قبله وإلا امتنع الحذف.
  await pool.query(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
  await pool.query(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[EXPERT, MANAGER]]);
  console.log(failures === 0 ? "\n✅ all maintenance-service-type cases pass" : `\n❌ ${failures} case(s) failed`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
