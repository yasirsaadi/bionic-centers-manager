// التقريرُ اليومي للمرضى — الفترةُ (من/إلى) والأقسامُ (واحدٌ أو اثنان أو الكلّ) حيّاً على النقطة الحقيقية (§4.az).
// قاعدة محلّية: `npm run test:daily-report-scope`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (١) الفترةُ يومان شاملان **بتوقيت بغداد**: زيارةٌ ٢٣:٣٠ بغداد من آخر يوم داخلةٌ، و٠٠:٣٠ بعده خارجة.
// (٢) الأقسامُ ترشّح الزيارات بقسم خيطها، وزيارةٌ بلا قسمٍ لا تُنسَب لقسمٍ مختار (تظهر مع الكلّ).
// (٣) مالُ الاختيار = مجموعُ أقسامه من مصدر الحقيقة المحاسبي نفسِه — مطابقٌ لأرقامٍ معروفةٍ مسبقاً إلى الدينار.
// (٤) المصاريف: أجهزةٌ للقسمين معاً، وعلاجٌ طبيعي له، ولا تنفصل لقسمٍ واحدٍ من الأجهزة؛ والمشتركُ لا يُطرَح.
// (٥) والكلُّ بلا ترشيح = الاستجابةُ القديمة حرفاً (`date` وحده يعمل كما كان).
// (٦) ونطاقُ الفرع للموظّف كما كان.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";
import { parseReportRange, parseReportServices, scopeDepartmentMoney } from "@shared/daily_report_scope";

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

const PORT = 6883;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-نطاق-التقرير-اليومي";
const BR = 7, BR_OTHER = 8;
const ADMIN = 9991, RECV = 9992, RECV_OTHER = 9993;
const ALL = [ADMIN, RECV, RECV_OTHER];
const perms = { canViewPatients: true, canViewReports: true, canManageAccounting: true };
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [BR, BR_OTHER],
    displayName: "adm", permissions: perms },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: BR, accessibleBranches: [BR],
    displayName: "استعلامات", permissions: perms },
  recvOther: { userId: RECV_OTHER, role: "reception", isAdmin: false, branchId: BR_OTHER, accessibleBranches: [BR_OTHER],
    displayName: "استعلامات ٢", permissions: perms },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(path: string, session: any) {
  const res = await fetch(BASE + path, {
    headers: { "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM cost_entries WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM visits WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exam_cancellations WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM expenses WHERE notes = '${MARK}'`);
}

//  توقيتُ بغداد إلى `timestamp` بلا منطقة (UTC كما تخزّنه الشيفرة): ٢٠٠١-٠٣-١٠ ١٠:٠٠ بغداد = ٠٧:٠٠ UTC.
const bg = (day: string, hhmm: string) => {
  const [y, m, d] = day.split("-").map(Number);
  const [h, mi] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, h - 3, mi)).toISOString().replace("T", " ").replace("Z", "");
};
const D1 = "2001-03-10", D2 = "2001-03-11", D3 = "2001-03-12", D4 = "2001-03-13";

async function mkPatient(label: string, branchId = BR) {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',$3,false,false,false,0,'new') RETURNING id`,
    [`${MARK} ${label}`, MARK, branchId]);
  return r.id;
}
async function mkCase(pid: number, type: string, branchId = BR) {
  const [r] = await q<{ id: number }>(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, status) VALUES ($1,$2,$3,'active') RETURNING id`,
    [pid, branchId, type]);
  return r.id;
}
async function visit(pid: number, caseId: number | null, at: string, details: string, branchId = BR) {
  const [r] = await q<{ id: number }>(
    `INSERT INTO visits (patient_id, branch_id, case_id, visit_date, details) VALUES ($1,$2,$3,$4::timestamp,$5) RETURNING id`,
    [pid, branchId, caseId, at, details]);
  return r.id;
}
const pay = (pid: number, caseId: number | null, amount: number, at: string, branchId = BR) =>
  q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, date) VALUES ($1,$2,$3,$4,$5::timestamp)`,
    [pid, branchId, caseId, amount, at]);
const cost = (pid: number, caseId: number | null, amount: number, source: string, at: string, branchId = BR) =>
  q(`INSERT INTO cost_entries (patient_id, branch_id, case_id, amount, source, created_at) VALUES ($1,$2,$3,$4,$5,$6::timestamp)`,
    [pid, branchId, caseId, amount, source, at]);
const expense = (section: string | null, amount: number, day: string, branchId = BR) =>
  q(`INSERT INTO expenses (branch_id, category, section, amount, expense_date, notes) VALUES ($1,'أخرى',$2,$3,$4,$5)`,
    [branchId, section, amount, day, MARK]);

async function main() {
  // ══ أ. المنطقُ الخالص ══════════════════════════════════════════════
  console.log("── أ. المنطق الخالص ──");
  same("أ١. الأقسام: الثلاثة أو لا شيء أو غريبٌ = الكلّ (null)",
    [parseReportServices("prosthetic,medical_support,physiotherapy"), parseReportServices(""), parseReportServices("x"), parseReportServices(undefined)],
    [null, null, null, null]);
  same("أ٢. وقسمان بترتيبٍ ثابت، والغريبُ يسقط",
    parseReportServices("physiotherapy,x,prosthetic"), ["prosthetic", "physiotherapy"]);
  same("أ٣. الفترة: from/to · date القديم · طرفٌ واحد · مقلوبان · تاريخٌ مستحيل ⟵ اليوم",
    [parseReportRange({ from: D1, to: D3 }, D4), parseReportRange({ date: D2 }, D4), parseReportRange({ to: D2 }, D4),
     parseReportRange({ from: D3, to: D1 }, D4), parseReportRange({ from: "2001-02-30" }, D4)],
    [{ from: D1, to: D3 }, { from: D2, to: D2 }, { from: D2, to: D2 }, { from: D1, to: D3 }, { from: D4, to: D4 }]);

  await q(`INSERT INTO branches (id,name) VALUES (${BR},'فرع اختبار التقرير'),(${BR_OTHER},'فرع آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, b] of [[ADMIN, "admin", BR], [RECV, "reception", BR], [RECV_OTHER, "reception", BR_OTHER]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
               can_view_patients,can_view_reports,can_manage_accounting)
             VALUES ($1,$2,'x','مستخدم',$3,$4,$5::jsonb,true,true,true,true)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id,
               branch_ids=EXCLUDED.branch_ids, is_active=true, can_view_patients=true,
               can_view_reports=true, can_manage_accounting=true`,
      [id, `drs_u${id}`, role, b, JSON.stringify([b])]);
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

  try {
    // ══ الفِكستشر — أرقامٌ معروفةٌ مسبقاً ══════════════════════════════
    const A = await mkPatient("أحمد");       // أطراف + علاج طبيعي
    const B = await mkPatient("بشرى");       // مساند
    const C = await mkPatient("فرعٌ آخر", BR_OTHER);
    const aPro = await mkCase(A, "prosthetic"), aPhy = await mkCase(A, "physiotherapy");
    const bSup = await mkCase(B, "medical_support");
    const cPhy = await mkCase(C, "physiotherapy", BR_OTHER);

    const v1 = await visit(A, aPro, bg(D1, "10:00"), "قياس طرف");          // D1 أطراف
    const v2 = await visit(B, bSup, bg(D1, "11:00"), "استلام مسند");       // D1 مساند
    const v3 = await visit(A, aPhy, bg(D2, "09:00"), "جلسة علاج");          // D2 علاج طبيعي
    const v4 = await visit(A, null, bg(D3, "23:30"), "زيارة قديمة بلا قسم"); // D3 آخرُ يومٍ بتوقيت بغداد
    const v5 = await visit(A, aPhy, bg(D4, "00:30"), "بعد الفترة");          // D4 خارجها
    //  صفوفٌ ليست حضوراً — شراءُ جلسات وعلامةٌ إدارية (تقريرُ مدير ذي قار: ٦٧ بدل ٥٤). لا تُعدّ.
    const mk1 = await visit(A, aPhy, bg(D1, "10:30"), "خدمة جديدة");
    const mk2 = await visit(A, aPhy, bg(D2, "09:05"), "خدمة جديدة");
    const mk3 = await visit(B, bSup, bg(D2, "12:05"), "إضافة نوع حالة");
    await visit(C, cPhy, bg(D2, "10:00"), "فرعٌ آخر", BR_OTHER);

    await pay(A, aPro, 100_000, bg(D1, "10:05"));
    await pay(B, bSup, 50_000, bg(D2, "12:00"));
    await pay(A, aPhy, 30_000, bg(D2, "09:10"));
    await pay(A, null, 7_000, bg(D3, "13:00"));            // غيرُ موسوم ⟵ غيرُ مصنَّف
    await pay(A, aPhy, 999_000, bg(D4, "00:30"));          // خارج الفترة
    await pay(C, cPhy, 444_000, bg(D2, "10:00"), BR_OTHER); // فرعٌ آخر
    await cost(A, aPro, 500_000, "assign_manufacturing", bg(D1, "10:01"));
    await cost(B, bSup, 200_000, "assign_manufacturing", bg(D2, "12:01"));
    await cost(A, aPhy, 60_000, "physio_pricing", bg(D2, "09:01"));
    await cost(A, null, 90_000, "maintenance", bg(D3, "14:00"));  // أجهزةٌ قديمة غيرُ مفصولة
    await expense("prosthetic", 20_000, D1);
    await expense("physio", 5_000, D2);
    await expense(null, 1_000, D3);                                // مشترك
    await expense("physio", 777_000, D4);                          // خارج الفترة
    //  معايناتٌ — «بعد الفحص» (فُحصوا · باشروا يومَ المباشرة · لم يباشروا).
    const exam = async (pid: number, type: string, at: string) =>
      (await q<{ id: number }>(`INSERT INTO medical_exams (patient_id, case_type, branch_id, doctor_name, signed_at)
         VALUES ($1,$2,$3,'د. اختبار',($4::timestamp AT TIME ZONE 'UTC')) RETURNING id`, [pid, type, BR, at]))[0].id;
    const C2 = await mkPatient("كريم");          // فُحص ولم يباشر
    const F = await mkPatient("فرح");            // فُحصت وأخذت جلساتٍ مجّانية
    const fPhy = await mkCase(F, "physiotherapy");
    await exam(A, "physiotherapy", bg(D1, "09:00"));      // يباشر D2 (دفعةُ ٣٠ ألفاً)
    await exam(B, "medical_support", bg(D1, "11:00"));    // يباشر D2 (دفعةُ ٥٠ ألفاً)
    await exam(C2, "physiotherapy", bg(D2, "10:00"));     // لم يباشر
    await exam(A, "prosthetic", bg(D3, "09:00"));         // لا دفعةَ أطرافٍ بعدها — لم يباشر
    await exam(F, "physiotherapy", bg(D3, "08:00"));      // مجّانيّ D3 ⟵ باشر
    await q(`INSERT INTO payments (patient_id, branch_id, case_id, amount, is_free_sessions, date) VALUES ($1,$2,$3,0,true,$4::timestamp)`,
      [F, BR, fPhy, bg(D3, "10:00")]);
    const exCancel = await exam(B, "physiotherapy", bg(D2, "13:00"));   // ملغاة — لا تُعدّ
    await q(`INSERT INTO medical_exam_cancellations (exam_id, patient_id, reason) VALUES ($1,$2,'خطأ')`, [exCancel, B]);

    const url = (qs: string) => `/api/reports/daily-patient-report?branchId=${BR}&${qs}`;
    const ids = (r: any) => (r.body?.visits ?? []).map((v: any) => v.visitId).sort((a: number, b: number) => a - b);
    const sort = (a: number[]) => a.slice().sort((x, y) => x - y);

    // ══ ب. الفترة ══════════════════════════════════════════════════════
    console.log("\n── ب. الفترة ──");
    const all3 = await http(url(`from=${D1}&to=${D3}`), S.admin);
    same("ب١. **من D1 إلى D3: زياراتُ الأيام الثلاثة — ومنها ٢٣:٣٠ بغداد من آخرها، لا ٠٠:٣٠ بعده**",
      [all3.status, ids(all3)], [200, sort([v1, v2, v3, v4])]);
    same("ب٢. والاستجابةُ تقول فترتَها", [all3.body?.from, all3.body?.to, all3.body?.services], [D1, D3, null]);
    same("ب٣. **`date` القديم وحده = يومٌ واحد كما كان**", ids(await http(url(`date=${D2}`), S.admin)), [v3]);
    same("ب٤. وطرفان مقلوبان يُرتَّبان", ids(await http(url(`from=${D3}&to=${D1}`), S.admin)), sort([v1, v2, v3, v4]));

    // ══ ج. الأقسام في الجدول ═══════════════════════════════════════════
    console.log("\n── ج. الأقسام في الجدول ──");
    const rng = `from=${D1}&to=${D3}`;
    same("ج١. أطرافٌ وحدها", ids(await http(url(`${rng}&services=prosthetic`), S.admin)), [v1]);
    same("ج٢. مساندُ وحدها", ids(await http(url(`${rng}&services=medical_support`), S.admin)), [v2]);
    same("ج٣. علاجٌ طبيعيّ وحده", ids(await http(url(`${rng}&services=physiotherapy`), S.admin)), [v3]);
    same("ج٤. قسمان: أطراف + علاج", ids(await http(url(`${rng}&services=prosthetic,physiotherapy`), S.admin)), sort([v1, v3]));
    same("ج٥. **والزيارةُ بلا قسمٍ تظهر مع الكلّ فقط** — لا تُنسَب بالتخمين",
      [ids(await http(url(`${rng}&services=prosthetic,medical_support,physiotherapy`), S.admin)).includes(v4),
       ids(await http(url(`${rng}&services=prosthetic,medical_support`), S.admin)).includes(v4)], [true, false]);
    same("ج٦. وكلُّ صفٍّ يحمل قسمَه بالعربية",
      (await http(url(`${rng}&services=medical_support`), S.admin)).body?.visits?.map((v: any) => v.serviceType), ["مساند طبية"]);

    // ══ د. المال — أرقامٌ معروفة مسبقاً ═══════════════════════════════
    console.log("\n── د. المال ──");
    const f = all3.body?.financial;
    same("د١. **الكلّ: الأقسامُ بأرقام الفِكستشر إلى الدينار**",
      [f?.byDepartment?.prosthetic, f?.byDepartment?.medical_support, f?.byDepartment?.physiotherapy,
       f?.byDepartment?.legacyDevicesUnsplit, f?.byDepartment?.unclassified],
      [{ revenue: 500000, paid: 100000 }, { revenue: 200000, paid: 50000 }, { revenue: 60000, paid: 30000 },
       { revenue: 90000 }, { revenue: 0, paid: 7000 }]);
    same("د٢. والإجماليّ والمصاريفُ والصافي (١٨٧٬٠٠٠ − ٢٦٬٠٠٠) — ولا اختيارَ جزئيّ",
      [f?.rollups?.grandTotal, f?.expenses, f?.netCash, f?.scoped], [{ revenue: 850000, paid: 187000 }, 26000, 161000, null]);
    const acct = await storage.getAccountingSummary(BR, D1, D3, { baghdadDays: true });
    same("د٣. ومن مصدر الحقيقة نفسِه", f?.rollups?.grandTotal, acct.rollups.grandTotal);

    const sc = async (svc: string) => (await http(url(`${rng}&services=${svc}`), S.admin)).body?.financial?.scoped;
    same("د٤. **علاجٌ طبيعيّ وحده: ماله ومصروفُه وصافيه، والمشتركُ يُذكر ولا يُطرَح**",
      await sc("physiotherapy"),
      { selected: { revenue: 60000, paid: 30000 }, expenses: 5000, sharedExpenses: 1000, netCash: 25000 });
    same("د٥. **أطرافٌ وحدها: ماله، والمصاريفُ لا تنفصل عن المساند (null) — لا رقمٌ مخترَع**",
      await sc("prosthetic"),
      { selected: { revenue: 500000, paid: 100000 }, expenses: null, sharedExpenses: 1000, netCash: null });
    same("د٦. **الأطرافُ والمساند معاً: ومعهما الأجهزةُ القديمة، ومصروفُ الأجهزة**",
      await sc("prosthetic,medical_support"),
      { selected: { revenue: 790000, paid: 150000 }, expenses: 20000, sharedExpenses: 1000, netCash: 130000 });
    same("د٧. مساندُ + علاج: لا تنفصل (المساندُ وحدها من الأجهزة)",
      await sc("medical_support,physiotherapy"),
      { selected: { revenue: 260000, paid: 80000 }, expenses: null, sharedExpenses: 1000, netCash: null });
    same("د٨. **ويطابق دالّةَ الجمع على أرقام المصدر**",
      await sc("prosthetic,medical_support"),
      scopeDepartmentMoney(["prosthetic", "medical_support"], acct.byDepartment, acct.expensesBySection));
    same("د٩. ويومٌ واحد (D2) يأخذ مالَ يومه وحده",
      (await http(url(`from=${D2}&to=${D2}`), S.admin)).body?.financial?.rollups?.grandTotal, { revenue: 260000, paid: 80000 });

    // ══ و. حسب اليوم (§4.az) ═══════════════════════════════════════════
    console.log("\n── و. حسب اليوم ──");
    const dly = all3.body?.daily;
    same("و١. **صفٌّ لكلّ يوم بأرقام الفِكستشر** — ومنها زيارةُ ٢٣:٣٠ بغداد في يومها",
      dly?.days, [
        { day: D1, visits: 2, patients: 2, paid: 100000, revenue: 500000, corrections: 0, expenses: 20000, net: 80000 },
        { day: D2, visits: 1, patients: 1, paid: 80000, revenue: 260000, corrections: 0, expenses: 5000, net: 75000 },
        { day: D3, visits: 1, patients: 1, paid: 7000, revenue: 90000, corrections: 0, expenses: 1000, net: 6000 },
      ]);
    same("و٢. **والمجموع = الملخّصُ المالي للفترة نفسِها وعددُ زياراتها**",
      dly?.total, { visits: all3.body?.visits?.length, patients: all3.body?.patientsCount, paid: f?.rollups?.grandTotal?.paid, revenue: f?.rollups?.grandTotal?.revenue,
        corrections: 0, expenses: f?.expenses, net: f?.netCash });
    const dPhy = (await http(url(`${rng}&services=physiotherapy`), S.admin)).body;
    same("و٣. **وبقسمٍ مختار: أيامُه بماله وحده، ومجموعُها = مالُ الاختيار**",
      [dPhy?.daily?.days?.map((r: any) => [r.day, r.paid, r.expenses, r.visits]),
       { paid: dPhy?.daily?.total?.paid, revenue: dPhy?.daily?.total?.revenue, expenses: dPhy?.daily?.total?.expenses, net: dPhy?.daily?.total?.net }],
      [[[D1, 0, 0, 0], [D2, 30000, 5000, 1], [D3, 0, 0, 0]],
       { paid: dPhy?.financial?.scoped?.selected?.paid, revenue: dPhy?.financial?.scoped?.selected?.revenue,
         expenses: dPhy?.financial?.scoped?.expenses, net: dPhy?.financial?.scoped?.netCash }]);
    same("و٤. وأطرافٌ وحدها: المصاريفُ والصافي لا ينفصلان يوماً ولا مجموعاً (null)",
      (await http(url(`${rng}&services=prosthetic`), S.admin)).body?.daily?.total,
      { visits: 1, patients: 1, paid: 100000, revenue: 500000, corrections: 0, expenses: null, net: null });
    same("و٥. ويومٌ واحد بلا تفصيل", (await http(url(`date=${D2}`), S.admin)).body?.daily, null);
    same("و٦. وفترةٌ أطولُ من ٩٢ يوماً تُقال لا تُحسب",
      (await http(url(`from=2001-01-01&to=2001-06-01`), S.admin)).body?.daily, { tooLong: true, maxDays: 92 });
    //  الصلاحياتُ تُقرأ حيّةً من صفّ المستخدم (المِعترِضة) — فتُسحَب منه ثمّ تُعاد.
    await q(`UPDATE system_users SET can_manage_accounting = false WHERE id = $1`, [RECV]);
    const noMoney = await http(url(rng), { ...S.recv, permissions: { canViewPatients: true, canViewReports: true } });
    await q(`UPDATE system_users SET can_manage_accounting = true WHERE id = $1`, [RECV]);
    same("و٧. **وبلا صلاحية المال: اليومُ وعددُ زياراته وحدهما**",
      [noMoney.body?.financial, noMoney.body?.daily?.withMoney, noMoney.body?.daily?.days, noMoney.body?.daily?.total],
      [null, false, [{ day: D1, visits: 2, patients: 2 }, { day: D2, visits: 1, patients: 1 }, { day: D3, visits: 1, patients: 1 }],
       { visits: 4, patients: 2 }]);

    // ══ وب. التصحيحاتُ عمودُها (قرارُ المالك ٢٠٢٦-١٠-٠٣ — يومُ ٢١ أيلول في بغداد) ══
    console.log("\n── وب. التصحيحات ──");
    await cost(A, aPhy, -40_000, "case_cost_edit", bg(D2, "15:00"));
    const cor = (await http(url(`from=${D1}&to=${D3}`), S.admin)).body?.daily;
    same("وب١. **قلمُ الكلفة السالب في عمود التصحيحات**، والمبيعاتُ الصافية كما في الملخّص",
      cor?.days?.map((r: any) => [r.day, r.revenue, r.corrections]), [[D1, 500000, 0], [D2, 220000, -40000], [D3, 90000, 0]]);
    same("وب٢. والمجموع", [cor?.total?.revenue, cor?.total?.corrections], [810000, -40000]);
    const corPhy = (await http(url(`from=${D1}&to=${D3}&services=physiotherapy`), S.admin)).body?.daily;
    same("وب٣. وبقسم العلاج الطبيعي: تصحيحُه وحده", corPhy?.days?.map((r: any) => [r.day, r.revenue, r.corrections]),
      [[D1, 0, 0], [D2, 20000, -40000], [D3, 0, 0]]);
    same("وب٤. والأطرافُ لا تحمله", (await http(url(`from=${D1}&to=${D3}&services=prosthetic`), S.admin)).body?.daily?.total?.corrections, 0);
    await q(`DELETE FROM cost_entries WHERE amount = -40000 AND patient_id = $1`, [A]);

    // ══ ز. الحضورُ لا الشراء (تقريرُ مدير ذي قار ٢٠٢٦-١٠-٠١) ═══════════════
    console.log("\n── ز. الحضور ──");
    same("ز١. **«خدمة جديدة» و«إضافة نوع حالة» خارج الجدول والعدد** — ولو بقسمٍ مختار",
      [ids(all3).filter((i: number) => [mk1, mk2, mk3].includes(i)),
       ids(await http(url(`${rng}&services=physiotherapy`), S.admin))], [[], [v3]]);
    same("ز٢. **وتبقى في سجلّ زيارات المريض** (لا تُحذَف)",
      (await q(`SELECT COUNT(*)::int AS n FROM visits WHERE id = ANY($1::int[]) AND deleted_at IS NULL`, [[mk1, mk2, mk3]]))[0].n, 3);
    same("ز٣. **والمرضى الذين حضروا: كلُّ مريضٍ مرّةً في الفترة** — أحمد ثلاثةَ أيام وبشرى يوماً = ٢، والزيارات ٤",
      [all3.body?.patientsCount, all3.body?.visits?.length], [2, 4]);

    // ══ ط. بعد الفحص (قرارُ المالك ٢٠٢٦-١٠-٠١) ═══════════════════════════════
    console.log("\n── ط. بعد الفحص ──");
    const ae = async (qs: string) => (await http(url(qs), S.admin)).body?.afterExam;
    same("ط١. **D1–D3: فُحص ٤ (والملغاة لا تُعدّ) · باشر ٣ (والمجّانيُّ باشر) · لم يباشر ٢**",
      await ae(rng), { examined: 4, started: 3, notStarted: 2 });
    same("ط٢. **يومُ الفحص D1: فُحص ٢ ولم يباشر أحد — ولا يتغيّر حين يدفعان D2**",
      await ae(`date=${D1}`), { examined: 2, started: 0, notStarted: 2 });
    same("ط٣. **يومُ المباشرة D2: باشر ٢ (فُحصا D1)، وفُحص كريم ولم يباشر**",
      await ae(`date=${D2}`), { examined: 1, started: 2, notStarted: 1 });
    same("ط٤. وبالقسم: علاجٌ طبيعيّ وحده", await ae(`${rng}&services=physiotherapy`), { examined: 3, started: 2, notStarted: 1 });

    // ══ هـ. الفرع ══════════════════════════════════════════════════════
    console.log("\n── هـ. نطاقُ الفرع ──");
    const rv = await http(`/api/reports/daily-patient-report?${rng}&branchId=${BR_OTHER}`, S.recv);
    same("هـ١. **موظّفُ الفرع على فرعه ولو طلب غيرَه** — زياراتُه وماله",
      [ids(rv), rv.body?.financial?.rollups?.grandTotal], [sort([v1, v2, v3, v4]), { revenue: 850000, paid: 187000 }]);
    const ro = await http(`/api/reports/daily-patient-report?${rng}&services=physiotherapy`, S.recvOther);
    same("هـ٢. وموظّفُ الفرع الآخر يرى فرعَه وحده",
      [(ro.body?.visits ?? []).length, ro.body?.financial?.scoped?.selected], [1, { revenue: 0, paid: 444000 }]);
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
