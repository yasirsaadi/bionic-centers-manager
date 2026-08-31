// اتساقُ كلفة المريض بين مدخلَي التعديل — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:cost-ledger-parity`.
//
// ══ العطبُ الذي يحرسه هذا الملفّ ═══════════════════════════════════════
// كانا مدخلَين لتغيير الكلفة: «تعديل مريض» (`PUT /api/patients/:id`
// ⟶ `storage.updatePatient`) وقلمُ التعديل بجانب الكلفة في ملفّ المريض
// (`PATCH /api/patients/:id/cases/:caseId` ⟶ `storage.updateCaseCost`).
// الأوّلُ كان يكتب `patients.total_cost` بدلتا موقَّعة في `cost_entries`
// (المصدر `manual_edit`) بشكلٍ سليم. **والثاني كان استبدالاً صِرفاً**
// لعمود `patient_cases.cost` وحده — لا يلمس `patients.total_cost`، ولا
// يكتب قيداً، فينحرف الاثنان: مريضٌ تُعدَّل كلفةُ حالته من القلم يبقى
// إجماليُّه القديم، وحسابُ جلسات العلاج الطبيعي (يقرأ `patient_cases.cost`
// حين توجد حالة) يرى رقماً لا يطابق `total_cost` الذي تراه بقيةُ الشاشة.
//
// **والإصلاح** جعل `updateCaseCost` ذرّياً ومضيفاً (دلتا) لا كاتباً فوق:
// يقفل صفَّ الحالة، يحسب الفرقَ عن القيمة الحالية، يزيد `total_cost` بنفس
// الفرق، ويكتب قيد `cost_entries` (المصدر `case_cost_edit`) — **نفسُ نمط
// «تصحيحُ سعر جهازٍ بعد البيع» في CLAUDE.md**: بالجمع لا بالكتابة فوق.
//
// ══ ما يثبته هذا الملفّ ═══════════════════════════════════════════════
// A. الصلاحياتُ لم تتغيّر (استقبال مرفوض، مديرُ فرعٍ آخر مرفوض، مديرُ
//    الفرع نفسه والمسؤول مقبولان) — **لم أعدّل هذا الحارس إطلاقاً**.
// B. المدخلاتُ غير الصالحة ما زالت تُرفض (سالبة/غير رقمية).
// C-E. القيدُ يزيد وينقص ويتجاهل التعديل بلا تغيير (دلتا صفر لا يكتب صفّاً).
// F. حالةٌ غير موجودة تُردّ ٤٠٤.
// G-H. **المدخلان معاً**: تعديلٌ من «تعديل مريض» ثم تعديلٌ من القلم يقرأ
//    الرصيدَ الحاليّ الحقيقيّ (لا لقطةً بائتة) — هذا هو الاختبارُ الحاسم
//    الذي كان سيفشل مع الكتابة فوق القديمة.
// I. الثابتُ نفسُه الذي يحرسه كاشفُ الشذوذ: SUM(cost_entries.amount) =
//    patients.total_cost في كل خطوة.

import { pool } from "./db";
import { registerRoutes } from "./routes";
import express from "express";
import { createServer } from "http";

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

const PORT = 6940;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-اتساق-الكلفة";
const ADMIN = 9941, MANAGER = 9942, MANAGER_OTHER_BRANCH = 9943, RECV = 9944;

const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1, 2], displayName: "المسؤول" },
  manager: { userId: MANAGER, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "مدير بغداد" },
  managerOther: { userId: MANAGER_OTHER_BRANCH, role: "branch_manager", isAdmin: false, branchId: 2, accessibleBranches: [2], displayName: "مدير فرعٍ آخر" },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "الاستقبال" },
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

async function cleanup() {
  await q(`DELETE FROM cost_entries WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await q(`DELETE FROM patients WHERE referral_source = $1`, [MARK]);
}

async function mkPatient(branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر',$3,true,0,'new') RETURNING id`,
    [`${MARK} مريض`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active') RETURNING id`, [patientId, branchId]);
  return r[0].id;
}
async function ledgerSum(patientId: number): Promise<number> {
  const r = await q<{ sum: string | null }>(
    `SELECT SUM(amount)::text AS sum FROM cost_entries WHERE patient_id = $1`, [patientId]);
  return Number(r[0]?.sum ?? 0);
}
async function ledgerCount(patientId: number): Promise<number> {
  const r = await q<{ n: string }>(`SELECT COUNT(*)::text AS n FROM cost_entries WHERE patient_id = $1`, [patientId]);
  return Number(r[0].n);
}
async function patientTotalCost(patientId: number): Promise<number> {
  const r = await q<{ total_cost: number }>(`SELECT total_cost FROM patients WHERE id = $1`, [patientId]);
  return r[0].total_cost;
}
async function caseRow(caseId: number) {
  const r = await q<{ cost: number; cost_source: string }>(
    `SELECT cost, cost_source FROM patient_cases WHERE id = $1`, [caseId]);
  return r[0];
}

async function main() {
  await q(
    `INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids)
     VALUES ($1,$2,'x','admin',$3,1,'[1,2]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id`,
    [ADMIN, "clp_admin", "المسؤول"]);
  await q(
    `INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids)
     VALUES ($1,$2,'x','branch_manager',$3,1,'[1]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, branch_id = EXCLUDED.branch_id`,
    [MANAGER, "clp_mgr", "مدير بغداد"]);

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
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    // ══════════════════════════════════════════════════════════════════
    //  A. الصلاحياتُ كما كانت
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── أ. الصلاحيات ──");
    const pA = await mkPatient(1);
    const cA = await mkCase(pA, 1);

    let r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.recv, { cost: 100_000 });
    same("١. الاستقبالُ مرفوض (٤٠٣)", r.status, 403);

    r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.managerOther, { cost: 100_000 });
    same("٢. مديرُ فرعٍ آخر مرفوض (٤٠٣)", r.status, 403);

    r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.manager, { cost: 0 });
    same("٣. مديرُ الفرع نفسه مقبول (٢٠٠)", r.status, 200);

    // ══════════════════════════════════════════════════════════════════
    //  B. مدخلاتٌ غير صالحة — كما كانت
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ب. التحقّق ──");
    r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.admin, { cost: -5 });
    same("٤. سالبٌ مرفوض (٤٠٠)", r.status, 400);
    r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.admin, { cost: "abc" });
    same("٥. غيرُ رقميّ مرفوض (٤٠٠)", r.status, 400);

    // ══════════════════════════════════════════════════════════════════
    //  C-F. القيدُ يزيد وينقصُ ويتجاهل الصفرَ ويرفض غير الموجود
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ج-و. الدفتر عبر القلم وحده ──");
    const pB = await mkPatient(1);
    const cB = await mkCase(pB, 1);

    r = await http("PATCH", `/api/patients/${pB}/cases/${cB}`, S.admin, { cost: 500_000 });
    same("٦. الاستجابةُ تحمل الإجماليّ الجديد", r.body?.totalCost, 500_000);
    same("٧. **`patients.total_cost` تحرّك بالزيادة**", await patientTotalCost(pB), 500_000);
    same("٨. وسطرٌ واحدٌ في الدفتر بمصدره الصحيح",
      (await q(`SELECT amount, source, case_id, branch_id FROM cost_entries WHERE patient_id=$1`, [pB]))
        .map((x: any) => ({ amount: x.amount, source: x.source, case_id: x.case_id, branch_id: x.branch_id })),
      [{ amount: 500_000, source: "case_cost_edit", case_id: cB, branch_id: 1 }]);
    let cr = await caseRow(cB);
    same("٩. وصفُّ الحالة نفسُه محدَّث (`cost_source='manual'`)", [cr.cost, cr.cost_source], [500_000, "manual"]);

    r = await http("PATCH", `/api/patients/${pB}/cases/${cB}`, S.admin, { cost: 300_000 });
    same("١٠. **والنقصان دلتا سالبة لا كتابةً فوق**", r.body?.totalCost, 300_000);
    same("١١. `total_cost` عكس النقصان بدقّة", await patientTotalCost(pB), 300_000);
    same("١٢. سطرٌ ثانٍ لا استبدالَ الأوّل", await ledgerCount(pB), 2);
    same("١٣. ومجموعُ الدفتر يطابق `total_cost`", await ledgerSum(pB), 300_000);

    r = await http("PATCH", `/api/patients/${pB}/cases/${cB}`, S.admin, { cost: 300_000 });
    same("١٤. **تعديلٌ بلا تغيير (دلتا صفر) لا يكتب قيداً جديداً**", await ledgerCount(pB), 2);
    same("١٥. و`total_cost` لا يتحرّك", await patientTotalCost(pB), 300_000);

    r = await http("PATCH", `/api/patients/${pB}/cases/999999`, S.admin, { cost: 10 });
    same("١٦. حالةٌ غير موجودة ⟶ ٤٠٤", r.status, 404);

    // ══════════════════════════════════════════════════════════════════
    //  G-H. **المدخلان معاً** — الاختبارُ الحاسم لجذر العطب
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز-ح. المدخلان معاً (تعديل مريض + القلم) ──");
    //  حالةُ pB الآن: total_cost=300,000 (من القلم وحده).
    //  «تعديل مريض» يرفع الإجماليَّ لسببٍ لا يخصّ هذه الحالة (تصحيحٌ إداريّ
    //  عامّ) — محاكاةُ المدخل الأوّل حيّاً عبر نقطته الحقيقية.
    r = await http("PUT", `/api/patients/${pB}`, S.admin, { totalCost: 450_000 });
    same("١٧. «تعديل مريض» ينجح ويكتب الإجماليَّ الجديد", [r.status, r.body?.totalCost], [200, 450_000]);
    same("١٨. **ومصدرُه `manual_edit` بلا ربط حالة**",
      (await q(`SELECT amount, source, case_id FROM cost_entries WHERE patient_id=$1 ORDER BY id`, [pB]))[2],
      { amount: 150_000, source: "manual_edit", case_id: null });
    same("١٩. ودفترُه ما زال يطابق `total_cost`", await ledgerSum(pB), 450_000);

    //  والآن القلمُ يعدّل نفسَ الحالة مجدداً — **يجب أن يقرأ ٤٥٠,٠٠٠ الحاليّ
    //  لا ٣٠٠,٠٠٠ القديم**. لو بقي العطبُ الأصليّ (كتابةٌ فوق `total_cost`
    //  بمعزلٍ عن آخر قراءة)، لكانت النتيجةُ ٦٠٠,٠٠٠ (٣٠٠,٠٠٠ + ٣٠٠,٠٠٠ دلتا)
    //  لا ٧٥٠,٠٠٠ (٤٥٠,٠٠٠ + ٣٠٠,٠٠٠ دلتا) — وهذا بالضبط ما يفحصه هذا السطر.
    r = await http("PATCH", `/api/patients/${pB}/cases/${cB}`, S.admin, { cost: 600_000 });
    same("٢٠. **والقلمُ يقرأ الرصيدَ الحيّ لا لقطةً بائتة**", r.body?.totalCost, 750_000,
      `لو عاد العطبُ القديم لظهرت هنا ٦٠٠٬٠٠٠ بدل ٧٥٠٬٠٠٠`);
    same("٢١. `patients.total_cost` في القاعدة يطابق الاستجابة", await patientTotalCost(pB), 750_000);
    cr = await caseRow(cB);
    same("٢٢. وصفُّ الحالة يحمل قيمتَه الجديدة", cr.cost, 600_000);

    // ══════════════════════════════════════════════════════════════════
    //  I. الثابتُ الذي يحرسه كاشفُ الشذوذ (`cost_ledger_mismatch`)
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ط. الثابتُ المحاسبيّ ──");
    same("٢٣. **مجموعُ قيود الدفتر = `total_cost`** — الثابتُ الملزم بعد كلّ خطوة",
      await ledgerSum(pB), await patientTotalCost(pB));
    same("٢٤. وأربعةُ قيودٍ بالضبط (لا صفَّ زائد ولا ناقص)", await ledgerCount(pB), 4);
  } finally {
    httpServer.close();
    await cleanup();
  }

  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} اختباراً فشل`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
