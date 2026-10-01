// البند ١٧ — معاينةُ العلاج الطبيعي إلزاميةٌ للجديد، والدفعُ لا ينتظرها، والقديمُ مُعفى (§4.bi).
// قاعدة محلّية: `npm run test:physio-exam-mandatory`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// كانت ثلاثُ قواعد لثلاث شاشات: سجلُّ المرضى يُعفي العلاجَ الطبيعي، وملفُّ المريض و«معايناتي» لا يُعفيانه — فيعلق مريضٌ في قائمة
// الطبيب بلا طلبٍ يُلغى. قرارُ المالك: إلزاميةٌ كالأطراف والمساند، والدفعُ لا يُشترط له شيء، وكلُّ ما سبق ٢٠٢٦-١٠-٠٢ مُعفى.
// أ. قسمٌ جديد ⟵ ينتظر في الشاشات الثلاث، والدفعُ يمرّ.   ب. قسمٌ قديم ⟵ لا ينتظر في أيٍّ منها، ويبقى في القائمة الاختيارية.
// ج. معاينةٌ موقّعة ⟵ يخرج من الثلاث.

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { PHYSIO_EXAM_MANDATORY_FROM } from "./medical/store";

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

const PORT = 6895;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-معاينة-العلاج-الإلزامية";
const DOC = 9971, RECV = 9972;
const S = {
  doc: { userId: DOC, role: "doctor", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "د. علاج" },
  recv: { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "الاستقبال",
    permissions: { canViewPatients: true, canAddPatients: true, canAddPayments: true } },
};

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM journal_lines WHERE patient_id IN (${ids})`).catch(() => {});
  await q(`DELETE FROM payments WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_exams WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM medical_review_requests WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_contacts WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function physioPatient(name: string, caseCreatedAt: Date) {
  const [p] = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id,
       is_amputee, is_medical_support, is_physiotherapy, total_cost, patient_classification)
     VALUES ($1,'07701234567',$2,'40','170','70','x',1,false,false,true,200000,'new') RETURNING id`, [`${MARK} ${name}`, MARK]);
  await q(`INSERT INTO patient_cases (patient_id, branch_id, case_type, cost, status, created_at)
           VALUES ($1,1,'physiotherapy',200000,'active',$2)`, [p.id, caseCreatedAt]);
  return p.id;
}
async function screens(pid: number) {
  const reg = await http("GET", "/api/medical/pending", S.recv);
  const card = await http("GET", `/api/medical/patients/${pid}/exams`, S.recv);
  const wl = await http("GET", "/api/medical/worklist", S.doc);
  const rows: any[] = Array.isArray(wl.body) ? wl.body : (wl.body?.rows ?? []);
  return {
    registry: (reg.body?.pending?.[pid] ?? []).includes("physiotherapy"),
    optional: (reg.body?.optional?.[pid] ?? []).includes("physiotherapy"),
    card: (card.body?.pending ?? []).includes("physiotherapy"),
    worklist: rows.some((r) => Number(r.patientId ?? r.patient_id) === pid),
  };
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'فرع ١') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids, medical_specialties, can_write_medical_exam, is_active)
           VALUES ($1,'pem_doc','x','doctor','د. علاج',1,'[1]'::jsonb,'["physiotherapy"]'::jsonb,true,true)
           ON CONFLICT (id) DO UPDATE SET role='doctor', medical_specialties=EXCLUDED.medical_specialties, can_write_medical_exam=true, is_active=true`, [DOC]);
  await q(`INSERT INTO system_users (id, username, password_hash, role, display_name, branch_id, branch_ids, can_view_patients, can_add_payments, is_active)
           VALUES ($1,'pem_recv','x','reception','الاستقبال',1,'[1]'::jsonb,true,true,true)
           ON CONFLICT (id) DO UPDATE SET role='reception', can_view_patients=true, can_add_payments=true, is_active=true`, [RECV]);
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
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    same("٠. الحدّ: بدايةُ ٢٠٢٦-١٠-٠٢ ببغداد", PHYSIO_EXAM_MANDATORY_FROM.toISOString(), "2026-10-01T21:00:00.000Z");
    const after = new Date(PHYSIO_EXAM_MANDATORY_FROM.getTime() + 60_000);
    const before = new Date(PHYSIO_EXAM_MANDATORY_FROM.getTime() - 60_000);

    console.log("\n── أ. مريضُ علاجٍ طبيعيّ جديد ──");
    const a = await physioPatient("جديد", after);
    const sa = await screens(a);
    same("أ١. **ينتظر في الشاشات الثلاث** (سجلّ المرضى · ملفّه · «معايناتي»)", [sa.registry, sa.card, sa.worklist], [true, true, true]);
    check(!sa.optional, "أ٢. ولا يقع في القائمة الاختيارية — هو في الطابور");
    const pay = await http("POST", "/api/payments", S.recv, {
      patientId: a, branchId: 1, amount: 50_000, paymentTreatmentType: "روبوت", sessionCount: 2, notes: MARK });
    same("أ٣. **والدفعُ يمرّ قبل المعاينة**", pay.status, 201);

    console.log("\n── ب. مريضٌ سبق ٢٠٢٦-١٠-٠٢ ──");
    const b = await physioPatient("قديم", before);
    const sb = await screens(b);
    same("ب١. **لا ينتظر في أيٍّ من الثلاث**", [sb.registry, sb.card, sb.worklist], [false, false, false]);
    check(sb.optional, "ب٢. ويبقى في القائمة الاختيارية — يجوز أن يُعايَن");

    console.log("\n── ج. بعد المعاينة ──");
    await q(`INSERT INTO medical_exams (patient_id, case_type, doctor_id, doctor_name, branch_id, diagnosis)
             VALUES ($1,'physiotherapy',$2,'د. علاج',1,'تشخيص')`, [a, DOC]);
    const sc = await screens(a);
    same("ج١. **معاينةٌ موقّعة ⟵ يخرج من الثلاث**", [sc.registry, sc.card, sc.worklist], [false, false, false]);
  } finally {
    await cleanup();
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1)`, [[DOC, RECV]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1)`, [[DOC, RECV]]).catch(() => {});
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
