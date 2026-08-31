// شارةُ «معايناتي» — عددُ الصفوف المنتظرة **من قائمة العمل الحقيقية نفسها**،
// لا حسابٌ موازٍ. حيّاً على Postgres وعلى النقاط الحقيقية.
// قاعدة محلّية: `npm run test:worklist-count`.
//
// ══ ما يحرسه (تحكّمُ شارات الشريط الجانبي، 2026-08-31) ══════════════════
// `GET /api/medical/worklist/count` **ينادي `store.getWorklist` نفسَها**
// ويُرجع طولها — لا `COUNT(*)` مستقلّاً يمكن أن ينحرف عن القائمة الفعلية.
// وهذه شارةُ **عملٍ غير منجَز**: لا تُقرأ من `localStorage`، ولا تُصفَّر
// بفتح الصفحة — تبقى حتى تُحسَم الحالة (تُعايَن أو تُلغى).
//
// A. طبيبٌ باختصاصٍ مطابقٍ وفرعٍ مطابق ⟶ يرى الحالةَ المنتظرة.
// B. اختصاصٌ غيرُ مطابق (نفسُ الطبيب لو مُنح اختصاصاً آخر) ⟶ صفر.
// C. فرعٌ غيرُ مطابق ⟶ صفر (نفسُ نطاق `/api/medical/worklist`).
// D. مَن ليس طبيباً ولا يحمل `canWriteMedicalExam` ⟶ صفرٌ بلا خطأ (٢٠٠).
// E. **العددُ يطابق طولَ القائمة الحقيقية دائماً** — لا مصدرَ حقيقةٍ ثانٍ.

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

const PORT = 6942;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-شارة-قائمة-الطبيب";
const DOC_MATCH = 9961, DOC_WRONG_SPECIALTY = 9962, DOC_WRONG_BRANCH = 9963, RECV = 9964;

const S: Record<string, any> = {
  recv: {
    userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "الاستقبال", permissions: { canAddPatients: true },
  },
  docMatch: { userId: DOC_MATCH, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "د. مطابق" },
  docWrongSpecialty: { userId: DOC_WRONG_SPECIALTY, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "د. اختصاصٌ آخر" },
  docWrongBranch: { userId: DOC_WRONG_BRANCH, role: "doctor", isAdmin: false, branchId: 2, accessibleBranches: [2], displayName: "د. فرعٌ آخر" },
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
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await q(`DELETE FROM patient_device_episodes WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = $1)`, [MARK]);
  await q(`DELETE FROM patients WHERE referral_source = $1`, [MARK]);
}
async function mkPatient(branchId = 1) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight,
       medical_condition, amputation_site, branch_id, is_amputee, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','172','78','بتر','احادي - طرف سفلي - يمين - تحت الركبة',
             $3,true,0,'new') RETURNING id`,
    [`${MARK} مريض`, MARK, branchId]);
  return r[0].id;
}
async function mkCase(patientId: number, branchId = 1) {
  await q(
    `INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, cost_source, status)
     VALUES ($1,$2,'prosthetic',0,'manual','active')`, [patientId, branchId]);
}

async function main() {
  const mkDoctor = (id: number, username: string, specialties: string[], branchId: number) => q(
    `INSERT INTO system_users
       (id, username, password_hash, role, display_name, branch_id, branch_ids, medical_specialties, is_active)
     VALUES ($1,$2,'x','doctor',$3,$4,to_jsonb(ARRAY[$4]::int[]),$5::jsonb,true)
     ON CONFLICT (id) DO UPDATE SET role='doctor', branch_id=EXCLUDED.branch_id,
       medical_specialties=EXCLUDED.medical_specialties, is_active=true`,
    [id, username, `طبيب ${username}`, branchId, JSON.stringify(specialties)]);
  await mkDoctor(DOC_MATCH, "wl_doc_match", ["prosthetic"], 1);
  await mkDoctor(DOC_WRONG_SPECIALTY, "wl_doc_wrong_spec", ["medical_support"], 1);
  await mkDoctor(DOC_WRONG_BRANCH, "wl_doc_wrong_branch", ["prosthetic"], 2);
  await q(
    `INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids)
     VALUES ($1,$2,'x','reception',$3,1,'[1]'::jsonb)
     ON CONFLICT (id) DO UPDATE SET role='reception'`,
    [RECV, "wl_recv", "الاستقبال"]);

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
    const patientId = await mkPatient(1);
    await mkCase(patientId, 1);

    //  طلبُ جهازٍ على مسار المعاينة — يفتح حلقةً `awaiting_exam` فتدخل
    //  قائمةَ عمل الطبيب فوراً (الشرطُ الأوّل غيرُ المشروط بتاريخ التفعيل).
    const openEp = await http("POST", `/api/patients/${patientId}/device-episodes`, S.recv,
      { serviceType: "prosthetic", requestedItem: "full_device", servicePath: "exam" });
    check(openEp.status === 200 || openEp.status === 201,
      "تمهيد: فتحُ طلب الجهاز نجح", `status=${openEp.status} body=${JSON.stringify(openEp.body)}`);

    console.log("\n── أ. اختصاصٌ وفرعٌ مطابقان ──");
    let r = await http("GET", "/api/medical/worklist/count", S.docMatch);
    same("١. الطبيبُ المطابق يرى حالةً واحدة", r.body?.count, 1);

    console.log("\n── ب. اختصاصٌ غيرُ مطابق ──");
    r = await http("GET", "/api/medical/worklist/count", S.docWrongSpecialty);
    same("٢. اختصاصٌ آخر ⟶ صفر", r.body?.count, 0);

    console.log("\n── ج. فرعٌ غيرُ مطابق ──");
    r = await http("GET", "/api/medical/worklist/count", S.docWrongBranch);
    same("٣. فرعٌ آخر ⟶ صفر (نفسُ نطاق /api/medical/worklist)", r.body?.count, 0);

    console.log("\n── د. بلا صلاحية طبّية إطلاقاً ──");
    r = await http("GET", "/api/medical/worklist/count", S.recv);
    same("٤. الاستقبالُ يرى صفراً بلا خطأ", [r.status, r.body?.count], [200, 0]);

    console.log("\n── هـ. العددُ يطابق القائمة الحقيقية ──");
    const list = await http("GET", "/api/medical/worklist", S.docMatch);
    r = await http("GET", "/api/medical/worklist/count", S.docMatch);
    check(Array.isArray(list.body?.rows),
      "تمهيد: القائمةُ عادت بشكلها المعروف (`rows`)",
      JSON.stringify(list.body).slice(0, 200));
    const listLength = (list.body?.rows ?? []).length;
    same("٥. **العددُ = طولُ القائمة الحقيقية بالضبط** — لا حسابَ ثانياً",
      r.body?.count, listLength);
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
