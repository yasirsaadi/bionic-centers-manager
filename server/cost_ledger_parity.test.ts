// اتساقُ كلفة المريض بين مدخلَي التعديل — حيّاً على Postgres وعلى النقاط
// الحقيقية. قاعدة محلّية: `npm run test:cost-ledger-parity`.
//
// ══ العطبُ الأصليّ (كان يحرسه هذا الملفّ) ═══════════════════════════════
// قلمُ التعديل بجانب الكلفة في ملفّ المريض (`PATCH /api/patients/:id/cases/
// :caseId` ⟶ `storage.updateCaseCost`) كان استبدالاً صِرفاً لعمود
// `patient_cases.cost` وحده — لا يلمس `patients.total_cost` ولا يكتب قيداً.
// **عولج**: صار ذرّياً ومضيفاً (دلتا)، يقفل صفَّ الحالة، يحسب الفرقَ، يزيد
// `total_cost` بنفس الفرق، ويكتب قيد `cost_entries` (المصدر `case_cost_edit`).
//
// ══ العطبُ الثاني — الاتجاهُ المعاكس (تصحيحٌ لاحقٌ، 2026-08-31) ═══════════
// «تعديل مريض» (`PUT /api/patients/:id` ⟶ `storage.updatePatient`) يكتب
// `patients.total_cost` بدلتا موقَّعة في `cost_entries` بشكلٍ سليم — **لكنّه
// لا يلمس `patient_cases.cost` إطلاقاً**. فبطاقةُ الحالة في ملفّ المريض
// تبقى على رقمها القديم بعد تعديل الإجماليّ من «تعديل مريض»، بينما الإجماليُّ
// نفسُه (الذي يراه رأسُ الصفحة) صار مختلفاً — نفسُ الانحراف بالاتجاه الآخر.
//
// **والإصلاح**: `storage.updatePatient` يقبل علماً اختيارياً
// `syncSoleCaseCost` — يرفعه `PUT /api/patients/:id` وحده. حين يتغيّر
// `totalCost` ويملك المريضُ **حالةً نشطةً واحدة لا غير**، تُكتَب كلفةُ تلك
// الحالة **مساويةً للإجماليّ الجديد حرفياً** (كتابةٌ فوق لا جمعاً — عكسَ
// بقيّة كتّاب `patient_cases.cost` عمداً: هذا الحقل في هذا المسار قيمةٌ
// مطلقة كتبها الموظّف، فلمريضٍ بحالةٍ واحدة الإجماليُّ **هو** كلفةُ تلك
// الحالة، ولا فرقَ يُضاف). ولمريضٍ بأكثر من حالةٍ نشطة — **لا تُمَسّ أيُّ
// حالة**؛ يعود `caseCostSync: "ambiguous"` من `storage.ts` فيُترجَم في
// `routes.ts` إلى `costNote` يقرؤه العميل (`EditPatient.tsx`) توستاً
// إعلامياً. ولمريضٍ بلا حالاتٍ نشطة — لا شيءَ يُسوَّى ولا ملاحظة (غيابُ
// موضوعٍ لا غموض).
//
// ══ ما يثبته هذا الملفّ ═══════════════════════════════════════════════
// A. الصلاحياتُ لم تتغيّر (استقبال مرفوض، مديرُ فرعٍ آخر مرفوض، مديرُ
//    الفرع نفسه والمسؤول مقبولان) — **لم أعدّل هذا الحارس إطلاقاً**.
// B. المدخلاتُ غير الصالحة ما زالت تُرفض (سالبة/غير رقمية).
// C-E. القيدُ يزيد وينقص ويتجاهل التعديل بلا تغيير (دلتا صفر لا يكتب صفّاً).
// F. حالةٌ غير موجودة تُردّ ٤٠٤.
// G. **حالةٌ واحدة**: «تعديل مريض» يزامن كلفة الحالة الوحيدة تلقائياً —
//    المدخلان **يتّفقان دائماً** بعد كلّ خطوة من أيّهما، جيئةً وذهاباً.
// H. **حالتان نشطتان**: «تعديل مريض» يحرّك الإجماليَّ **ولا يمسّ أيَّ
//    حالة** — لا تخمينَ ولا كتابةً فوق الاثنتين معاً. والقلمُ بعدها يقرأ
//    الرصيدَ الحيَّ الحقيقيَّ لا لقطةً بائتة — هذا الاختبارُ الحاسم الذي
//    كان سيفشل مع الكتابة فوق القديمة، منقولٌ هنا لأنه سيناريو الغموض
//    الحقيقيّ الوحيد الذي يبقى فيه المدخلان بلا تزامنٍ تلقائي.
// I. **بلا حالاتٍ إطلاقاً**: لا شيءَ يُسوَّى ولا ملاحظة.
// J. الثابتُ نفسُه الذي يحرسه كاشفُ الشذوذ: SUM(cost_entries.amount) =
//    patients.total_cost في كل خطوة، لكلّ سيناريوهات هذا الملفّ.

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
async function mkCase(patientId: number, branchId = 1, caseType = "prosthetic") {
  const r = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,$3,0,'manual','active') RETURNING id`, [patientId, branchId, caseType]);
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
    //  G. حالةٌ واحدة — «تعديل مريض» يزامن كلفتَها تلقائياً
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ز. حالةٌ واحدة: المدخلان يتّفقان دائماً ──");
    //  pA يحمل حالةً واحدة (cA)، من قسم «أ» أعلاه: total_cost=0, cA.cost=0.
    r = await http("PUT", `/api/patients/${pA}`, S.admin, { totalCost: 700_000 });
    same("١٧. «تعديل مريض» ينجح", [r.status, r.body?.totalCost], [200, 700_000]);
    same("١٨. **والاستجابةُ تُقرّ بالمزامنة صراحةً**", r.body?.caseCostSync, "synced");
    check(!r.body?.costNote, "١٩. وبلا ملاحظةٍ — لا غموضَ هنا", JSON.stringify(r.body?.costNote));
    same("٢٠. **وقيدُ الدفتر يبقى بلا ربط حالة** (لم أغيّر إسناد القيد، فقط زامنتُ البطاقة)",
      (await q(`SELECT case_id FROM cost_entries WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pA]))[0]?.case_id,
      null);
    cr = await caseRow(cA);
    same("٢١. **وكلفةُ الحالة الوحيدة صارت مساويةً للإجماليّ الجديد حرفياً**",
      [cr.cost, cr.cost_source], [700_000, "manual"]);

    //  والآن القلمُ يعدّل نفسَ الحالة — يجب أن يقرأ ٧٠٠,٠٠٠ الحيّ (المُزامَن
    //  للتوّ) لا رقماً بائتاً، وأن يُبقي الاثنين متساويين بعد الحفظ أيضاً.
    r = await http("PATCH", `/api/patients/${pA}/cases/${cA}`, S.admin, { cost: 800_000 });
    same("٢٢. القلمُ يرفع الإجماليَّ بنفس الفرق (١٠٠,٠٠٠) من الرصيد الحيّ", r.body?.totalCost, 800_000);
    same("٢٣. **والاثنان لا يزالان متساويين بعد تعديل القلم أيضاً**",
      [await patientTotalCost(pA), (await caseRow(cA)).cost], [800_000, 800_000]);

    //  وتعديلٌ ثانٍ من «تعديل مريض» — التزامن ليس أثراً لمرّةٍ واحدة.
    r = await http("PUT", `/api/patients/${pA}`, S.admin, { totalCost: 1_000_000 });
    same("٢٤. ومزامنةٌ ثانية تنجح كذلك (لا تقتصر على أوّل نداء)",
      [r.status, r.body?.caseCostSync, (await caseRow(cA)).cost], [200, "synced", 1_000_000]);
    same("٢٥. والإجماليّان متساويان دائماً لمريضٍ بحالةٍ واحدة", await patientTotalCost(pA), 1_000_000);

    // ══════════════════════════════════════════════════════════════════
    //  H. حالتان نشطتان — لا تخمين، ولا كتابةٌ فوق الاثنتين
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ح. حالتان نشطتان: لا يُمَسّ أيّهما ──");
    const pC = await mkPatient(1);
    const c1 = await mkCase(pC, 1, "prosthetic");
    const c2 = await mkCase(pC, 1, "medical_support");

    r = await http("PATCH", `/api/patients/${pC}/cases/${c1}`, S.admin, { cost: 500_000 });
    same("٢٦. تمهيد: القلمُ يسعّر الحالة الأولى", r.body?.totalCost, 500_000);
    r = await http("PATCH", `/api/patients/${pC}/cases/${c1}`, S.admin, { cost: 300_000 });
    same("٢٧. وينقصها إلى ٣٠٠,٠٠٠", r.body?.totalCost, 300_000);

    //  الآن «تعديل مريض» يحرّك الإجماليَّ لسببٍ لا يخصّ حالةً بعينها —
    //  ومع وجود حالتين نشطتين، **لا حالةَ تُمَسّ إطلاقاً**.
    r = await http("PUT", `/api/patients/${pC}`, S.admin, { totalCost: 450_000 });
    same("٢٨. «تعديل مريض» ينجح ويحرّك الإجماليَّ", [r.status, r.body?.totalCost], [200, 450_000]);
    same("٢٩. **والاستجابةُ تُقرّ بالغموض صراحةً**", r.body?.caseCostSync, "ambiguous");
    check(typeof r.body?.costNote === "string" && r.body.costNote.length > 0,
      "٣٠. **وملاحظةٌ صريحة تصل العميل** — لا صمتَ عن التعارض", JSON.stringify(r.body?.costNote));
    const c1After = await caseRow(c1), c2After = await caseRow(c2);
    same("٣١. **الحالةُ الأولى لم تُمَسّ** (لا كتابةَ فوق عشوائية)", c1After.cost, 300_000);
    same("٣٢. **ولا الثانية أيضاً** (لا كتابةَ فوق الاثنتين معاً)", c2After.cost, 0);
    same("٣٣. ومصدرُ قيد الدفتر يبقى `manual_edit` بلا ربط حالة",
      (await q(`SELECT case_id FROM cost_entries WHERE patient_id=$1 ORDER BY id DESC LIMIT 1`, [pC]))[0]?.case_id,
      null);

    //  والقلمُ بعدها **يقرأ الرصيدَ الحيَّ الحقيقيَّ لا لقطةً بائتة** — هذا
    //  هو الاختبارُ الحاسم لجذر العطب الأصليّ، وهنا وحده (حالتان نشطتان)
    //  يبقى المدخلان بلا مزامنةٍ تلقائية فيصلح سيناريو إثباتٍ حقيقياً:
    //  لو كانت القراءةُ لقطةً بائتة (٣٠٠,٠٠٠) لا الرصيدَ الحيّ (٤٥٠,٠٠٠)،
    //  لكانت النتيجةُ ٦٠٠,٠٠٠ (٣٠٠,٠٠٠+٣٠٠,٠٠٠) لا ٧٥٠,٠٠٠ (٤٥٠,٠٠٠+٣٠٠,٠٠٠).
    r = await http("PATCH", `/api/patients/${pC}/cases/${c1}`, S.admin, { cost: 600_000 });
    same("٣٤. **والقلمُ يقرأ الرصيدَ الحيّ لا لقطةً بائتة**", r.body?.totalCost, 750_000,
      `لو قرأ لقطةً بائتة لظهرت هنا ٦٠٠٬٠٠٠ بدل ٧٥٠٬٠٠٠`);
    same("٣٥. `patients.total_cost` في القاعدة يطابق الاستجابة", await patientTotalCost(pC), 750_000);
    same("٣٦. وصفُّ الحالة الأولى يحمل قيمتَه الجديدة، والثانية بلا تغيير",
      [(await caseRow(c1)).cost, (await caseRow(c2)).cost], [600_000, 0]);

    // ══════════════════════════════════════════════════════════════════
    //  I. بلا حالاتٍ إطلاقاً — لا شيءَ يُسوَّى ولا ملاحظة
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ي. بلا حالاتٍ إطلاقاً ──");
    const pD = await mkPatient(1); // بلا أيّ صفٍّ في patient_cases
    r = await http("PUT", `/api/patients/${pD}`, S.admin, { totalCost: 200_000 });
    same("٣٧. «تعديل مريض» ينجح رغم غياب أيّ حالة", [r.status, r.body?.totalCost], [200, 200_000]);
    check(!r.body?.caseCostSync, "٣٨. **`caseCostSync` غائبةٌ — غيابُ موضوعٍ لا قرار**",
      JSON.stringify(r.body?.caseCostSync));
    check(!r.body?.costNote, "٣٩. وبلا ملاحظة", JSON.stringify(r.body?.costNote));
    same("٤٠. والدفترُ ما زال يطابق `total_cost` رغم غياب الحالات", await ledgerSum(pD), 200_000);

    // ══════════════════════════════════════════════════════════════════
    //  J. الثابتُ الذي يحرسه كاشفُ الشذوذ (`cost_ledger_mismatch`) — لكلّ
    //     مريضٍ في هذا الملفّ
    // ══════════════════════════════════════════════════════════════════
    console.log("\n── ك. الثابتُ المحاسبيّ لكلّ سيناريو ──");
    for (const [label, pid, expectedEntries] of [
      ["pA (حالةٌ واحدة)", pA, 3], ["pB (القلمُ وحده)", pB, 2],
      ["pC (حالتان)", pC, 4], ["pD (بلا حالات)", pD, 1],
    ] as [string, number, number][]) {
      same(`٤١. مجموعُ قيود الدفتر = total_cost — ${label}`,
        await ledgerSum(pid), await patientTotalCost(pid));
      same(`    وعددُ القيود متوقَّعٌ بالضبط — ${label}`, await ledgerCount(pid), expectedEntries);
    }
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
