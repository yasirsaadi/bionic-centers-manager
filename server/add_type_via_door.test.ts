// §4.ar البند ٢ — «تعديل مريض» لا يضيف قسماً، وعَلَمٌ بلا قسمٍ يُكمَل من «إضافة نوع حالة».
// قاعدة محلّية: `npm run test:add-type-via-door`. (منفصلٌ عن `test:departments` لأن تلك الحزمة
// تتوقّف عند ٢ب على قاعدةٍ بلا صندوق فرع — متطابقةً على `main` — فلا يصل فحصٌ بعدها.)
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) **الأطرافُ تُفصَل عن المساند** في المبيعات والمقبوض معاً — وكانا دلواً
//     واحداً اسمُه «أجهزة».
// (٢) و«الأجهزة» = القسمان جمعاً، و«الإجمالي» = الثلاثة + غير المبوَّب —
//     مصالَحةً إلى الدينار مع الأرقام المرجعية.
// (٣) **ولا كتابةَ عملٍ جديدة تصير غير مبوَّبة**: كلُّ مسارٍ يومي يحمل قسمه.
// (٤) والقديمُ الغامض يبقى ظاهراً «غير مبوَّب» — لا يُخمَّن ولا يُدسّ.
// (٥) والتقريرُ اليومي يحترم اليومَ المختار ونطاقَ الفرع بالضبط.
// (٦) وتصنيفُ المريض إلزاميٌّ للكتابة الجديدة، ولا يُخمَّن للقديم.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";


//  ══ **تذكرةُ إرسالٍ فريدةٌ لكلّ نداء** (٢٠٢٦-٠٩-١٨) ═══════════════════════
//  `/api/no-exam/maintenance` صارت **تشترط** `submissionToken` غيرَ فارغ:
//  ضغطةٌ واحدة = عمليةُ صيانةٍ واحدة. وكلُّ نداءٍ في هذا الملفّ عمليةٌ مستقلّة
//  بضغطتها الخاصّة، **فرمزٌ فريدٌ لكلّ نداء هو بالضبط ما يرسله الواقع**.
//  والطابعُ الزمنيُّ في البادئة يجعل إعادةَ تشغيل الملفّ على القاعدة نفسِها
//  تنجح — رمزٌ ثابتٌ كان سيُقرأ «مسجَّلاً سابقاً» في التشغيلة الثانية.
const MAINT_TOK = `mtok-${Date.now().toString(36)}`;
let maintTokN = 0;
const maintTok = () => `${MAINT_TOK}-${++maintTokN}`;

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

const PORT = 6873;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-باب-القسم";
const ADMIN = 9961, RECV = 9962, DOC = 9963, EXPERT = 9964, RECV_B2 = 9965;
const ALL = [ADMIN, RECV, DOC, EXPERT, RECV_B2];

const perms = { canViewPatients: true, canAddPatients: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2],
    displayName: "adm", permissions: { ...perms, canDeletePatients: true } },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استعلامات", permissions: perms },
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "د. فلان", permissions: { ...perms, canWriteMedicalExam: true } },
  recvB2: { userId: RECV_B2, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [2],
    displayName: "استعلامات ٢", permissions: perms },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
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

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  for (const t of [
    "medical_review_requests", "post_exam_followup_events", "price_change_requests",
    "post_exam_followups", "patient_code_aliases", "patient_notification_deliveries",
  ]) await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_addenda WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exam_revisions WHERE exam_id IN (SELECT id FROM medical_exams WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_events WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM prosthetic_work_history WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_rework_events WHERE work_order_id IN (SELECT id FROM prosthetic_work_orders WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM prosthetic_work_orders WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM expenses WHERE notes = '${MARK}'`);
  //  جهاتُ واتساب تُنشأ تلقائياً مع كلّ مريضٍ يُسجَّل بالنقطة الحقيقية
  //  (الرايةُ مرفوعةٌ افتراضاً)، فحذفُ المريض بـSQL خام يصطدم بمفتاحها.
  await q(`DELETE FROM patient_notification_deliveries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

/** مريضٌ بلا أعلام — الحالاتُ تُضاف عبر النقاط كي يُختبَر المسار الحقيقي. */
//  الطولُ والوزن يُملآن هنا عمداً: هذا الملفّ يختبر **قاعدة التصنيف**،
//  وقاعدةُ «أكمِل المقاسات عند التعديل» (ترحيل ٠٦٠) لها اختبارها المستقلّ.
//  وخلطُهما كان سيجعل فشلَ إحداهما يُقرأ فشلاً للأخرى.
async function mk(label: string, branchId = 1, classification = "new") {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,false,false,false,0,$4) RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId, classification]);
  return r[0].id;
}
const TODAY = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().split("T")[0];

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  for (const [id, role, b, spec] of [
    [ADMIN, "admin", 1, "[]"], [RECV, "reception", 1, "[]"],
    [DOC, "doctor", 1, '["prosthetic","medical_support","physiotherapy"]'],
    [EXPERT, "prosthetics_expert", 1, "[]"], [RECV_B2, "reception", 2, "[]"],
  ] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,
               branch_ids,is_active,medical_specialties)
             VALUES ($1,$2,'x','مستخدم',$3,$4,$5::jsonb,true,$6::jsonb)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, medical_specialties=EXCLUDED.medical_specialties,
               is_active=true`,
    [id, `atd_u${id}`, role, b, JSON.stringify([b]), spec]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")) } : {};
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session")
      ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  const deptOfEntries = async (patientId: number) =>
    (await q(`SELECT c.case_type, e.source, e.amount::int AS amount
                FROM cost_entries e
                LEFT JOIN patient_cases c ON c.id = e.case_id
               WHERE e.patient_id = $1 ORDER BY e.id`, [patientId]))
      .map((r: any) => [r.case_type, r.source, Number(r.amount)]);

  try {
    // ══ ١٨. **تعديلُ الملفّ لا يضيف قسماً — وعَلَمٌ بلا قسمٍ يُكمَل من بابه** (§4.ar البند ٢) ══
    //  كان «تعديل مريض» يرفع العَلَم وحده: لا حالةَ ولا طلبَ معاينة، ثمّ «إضافة نوع حالة» تردّ «مفعّل أصلاً».
    console.log("\n── ١٨. تعديلُ الملفّ لا يضيف قسماً ──");
    const pEd = await mk("تعديل يضيف قسماً");
    await q(`UPDATE patients SET is_physiotherapy = true WHERE id = $1`, [pEd]);
    await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost) VALUES ($1,1,'physiotherapy',0)`, [pEd]);
    const addViaEdit = await http("PUT", `/api/patients/${pEd}`, S.admin, { isPhysiotherapy: true, isMedicalSupport: true });
    same("١٨أ. **رفعُ عَلَم قسمٍ جديد من «تعديل مريض» يُردّ ٤٠٩** ويسمّي الباب",
      [addViaEdit.status, addViaEdit.body?.code], [409, "ADD_TYPE_VIA_DOOR"]);
    same("   **ولا نصفَ قسم**: العَلَمُ منخفض ولا صفَّ حالة",
      [(await q(`SELECT is_medical_support f FROM patients WHERE id=$1`, [pEd]))[0].f,
        (await q(`SELECT COUNT(*)::int n FROM patient_cases WHERE patient_id=$1 AND case_type='medical_support'`, [pEd]))[0].n],
      [false, 0]);
    same("١٨ب. **وتعديلُ ملفٍّ بأقسامه القائمة يمرّ كما كان** (النموذجُ يعيد العَلَم المرفوع)",
      (await http("PUT", `/api/patients/${pEd}`, S.admin, { isPhysiotherapy: true, address: "عنوان" })).status, 200);

    const pStuck = await mk("عَلَمٌ بلا قسم");
    await q(`UPDATE patients SET is_medical_support = true WHERE id = $1`, [pStuck]);
    const fix = await http("POST", `/api/patients/${pStuck}/add-case-type`, S.recv, { caseType: "medical_support" });
    same("١٨ج. **مريضٌ عالق (عَلَمٌ بلا قسم) يُكمَل من «إضافة نوع حالة»** — لا «مفعّل أصلاً»", fix.status, 200);
    same("   **فيُنشأ قسمُه ويصل الطبيب** (طلبُ معاينةٍ معلَّق على القسم نفسِه)",
      [(await q(`SELECT COUNT(*)::int n FROM patient_cases WHERE patient_id=$1 AND case_type='medical_support'`, [pStuck]))[0].n,
        (await q(`SELECT COUNT(*)::int n FROM medical_review_requests r JOIN patient_cases c ON c.id = r.case_id
                   WHERE r.patient_id=$1 AND c.case_type='medical_support' AND r.status='pending'`, [pStuck]))[0].n],
      [1, 1]);
    same("   **وقسمٌ قائمٌ فعلاً يبقى «مفعّلاً أصلاً»**",
      (await http("POST", `/api/patients/${pStuck}/add-case-type`, S.recv, { caseType: "medical_support" })).status, 409);

  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1::int[])`, [ALL]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ALL]);
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e);
  try { await cleanup(); await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
