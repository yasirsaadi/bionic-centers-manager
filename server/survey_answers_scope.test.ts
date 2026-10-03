// إجاباتُ الاستبيان لا تُقرأ برقمها من فرعٍ آخر — آخرُ ما تُرك من §4.bo. حيّاً على Postgres وعلى النقطة الحقيقية.
// قاعدة محلّية: `npm run test:survey-answers-scope`.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6961;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-إجابات-الاستبيان";
const S = {
  surv1: { userId: 9971, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استبيانات بغداد",
    permissions: { canViewPatients: true, canManageSurveys: true } },
  plain1: { userId: 9972, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال بغداد",
    permissions: { canViewPatients: true } },
  admin: { userId: 9973, role: "admin", isAdmin: true, branchId: 1, accessibleBranches: [1], displayName: "المسؤول",
    permissions: {} },
};
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
async function http(method: string, path: string, session: any) {
  const res = await fetch(BASE + path, {
    method, headers: { "x-test-session-b64": Buffer.from(JSON.stringify(session), "utf8").toString("base64") },
  });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM survey_answers WHERE response_id IN (SELECT id FROM survey_responses WHERE patient_id IN (${ids}))`);
  await q(`DELETE FROM survey_responses WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء') ON CONFLICT DO NOTHING`);
  //  الحسابات تُقرأ حيّاً في كلّ طلب (§4.ar البند ٧) — فتُكتب صفوفُها. والمسؤولُ بلا صفّ يمرّ كما هو.
  for (const [id, surveys] of [[9971, true], [9972, false]] as const) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
               can_view_patients, can_manage_surveys)
             VALUES ($1,$2,'x',$3,'reception',1,'[1]'::jsonb,true,true,$4)
             ON CONFLICT (id) DO UPDATE SET role='reception', branch_id=1, branch_ids='[1]'::jsonb, is_active=true,
               can_view_patients=true, can_manage_surveys=EXCLUDED.can_manage_surveys`,
      [id, `sas_u${id}`, `مستخدم ${id}`, surveys]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {};
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
  await new Promise<void>((r) => httpServer.once("listening", r));

  try {
    const tpl = (await q<{ id: number }>(`SELECT id FROM survey_templates ORDER BY id LIMIT 1`))[0].id;
    const qid = (await q<{ id: number }>(`SELECT id FROM survey_questions WHERE template_id = $1 ORDER BY id LIMIT 1`, [tpl]))[0].id;
    const patient = async (label: string, branch: number) => (await q<{ id: number }>(
      `INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07701112233',$2,'40','170','70','x',$3,0,'new') RETURNING id`, [`${MARK} ${label}`, MARK, branch]))[0].id;
    const survey = async (pid: number, branch: number) => {
      const rid = (await q<{ id: number }>(
        `INSERT INTO survey_responses (template_id, patient_id, branch_id, total_score, max_score, percentage)
         VALUES ($1,$2,$3,8,10,80) RETURNING id`, [tpl, pid, branch]))[0].id;
      await q(`INSERT INTO survey_answers (response_id, question_id, rating_value) VALUES ($1,$2,8)`, [rid, qid]);
      return rid;
    };
    const own = await survey(await patient("بغداد", 1), 1);
    const foreign = await survey(await patient("كربلاء", 2), 2);
    const sharedPid = await patient("كربلاء مُتاح لبغداد", 2);
    await q(`INSERT INTO patient_branch_access (patient_id, branch_id) VALUES ($1, 1)`, [sharedPid]);
    const shared = await survey(sharedPid, 2);

    console.log("\n── إجاباتُ الاستبيان بالرقم ──");
    const a1 = await http("GET", `/api/survey-responses/${own}/answers`, S.surv1);
    same("١. استبيانُ فرعِ الجلسة يُقرأ كما كان", [a1.status, a1.body?.length, a1.body?.[0]?.ratingValue], [200, 1, 8]);
    const a2 = await http("GET", `/api/survey-responses/${foreign}/answers`, S.surv1);
    same("٢. استبيانُ فرعٍ آخر لملفٍّ لا يصله ⟵ 404 بلا إجابات", [a2.status, Array.isArray(a2.body)], [404, false]);
    const a3 = await http("GET", `/api/survey-responses/${shared}/answers`, S.surv1);
    same("٣. استبيانُ ملفٍّ مُتاحٍ لفرع الجلسة يُقرأ (كنقطة استبيانات المريض)", [a3.status, a3.body?.length], [200, 1]);
    const a4 = await http("GET", `/api/survey-responses/${foreign}/answers`, S.admin);
    same("٤. المسؤولُ يقرأ كلَّ الفروع", [a4.status, a4.body?.length], [200, 1]);
    same("٥. رقمٌ غير موجود ⟵ 404", (await http("GET", `/api/survey-responses/99999999/answers`, S.surv1)).status, 404);
    same("٦. بلا صلاحية الاستبيانات ⟵ 403 كما كان", (await http("GET", `/api/survey-responses/${own}/answers`, S.plain1)).status, 403);
  } finally {
    await cleanup();
    httpServer.close();
  }

  console.log(`\n${failures === 0 ? "✅ كل فحوص إجابات الاستبيان نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((err) => { console.error(err); process.exit(1); });
