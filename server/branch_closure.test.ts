// الفرعُ المغلقُ مؤقتاً (ترحيل ٠٩٤، §4.bw) — حيّاً على Postgres وعلى النقاط الحقيقية. `npm run test:branch-closure`.
import express from "express";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { sql as m094 } from "./migrations/094_branch_temporarily_closed";
import { invalidateClosedBranches } from "./branches/closure";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6961, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-إغلاق-الفرع";
const ADMIN = 9951, KIRK = 9952, MULTI = 9953, USERS = [ADMIN, KIRK, MULTI];
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
const S = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1, 2, 3, 4, 5], displayName: "المسؤول", permissions: {} },
  kirk: { userId: KIRK, role: "reception", isAdmin: false, branchId: 5, accessibleBranches: [5], assignedBranches: [5], displayName: "استقبال كركوك", permissions: { canViewPatients: true } },
  multi: { userId: MULTI, role: "reception", isAdmin: false, branchId: 5, accessibleBranches: [5], assignedBranches: [1, 5], displayName: "استقبال بغداد وكركوك", permissions: { canViewPatients: true } },
};
async function http(method: string, path: string, session: any | null, body?: any) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (session) headers["x-test-session-b64"] = Buffer.from(JSON.stringify(session), "utf8").toString("base64");
  const res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  let json: any = null; try { json = await res.json(); } catch { /* */ }
  return { status: res.status, body: json, set: res.headers.get("x-session-out") };
}
const login = (branchKey: string, username: string) => http("POST", "/api/verify-branch", null, { branchKey, username, password: "pw-123" });
async function cleanup() {
  await q(`DELETE FROM patient_branch_access WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patient_cases WHERE patient_id IN (SELECT id FROM patients WHERE referral_source = '${MARK}')`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[]) OR (entity_type = 'branch' AND action IN ('branch_temporarily_closed','branch_reopened'))`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
  await q(`UPDATE branches SET temporarily_closed = false, closed_at = NULL, closed_by = NULL`);
}

async function main() {
  await q(m094);
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'كربلاء'),(3,'ذي قار'),(4,'الموصل'),(5,'كركوك') ON CONFLICT DO NOTHING`);
  await cleanup();
  const hash = await bcrypt.hash("pw-123", 4);
  for (const [id, u, role, b, ids] of [[ADMIN, "bc_admin", "admin", null, []], [KIRK, "bc_kirk", "reception", 5, [5]], [MULTI, "bc_multi", "reception", 1, [1, 5]]] as any[]) {
    await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active, can_view_patients, can_add_patients)
             VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,true,true,true)`, [id, u, hash, `مستخدم ${id}`, role, b, JSON.stringify(ids)]);
  }
  const kirkPatient = (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07701110000',$2,'40','170','70','x',5,0,'new') RETURNING id`, [`${MARK} كركوكي`, MARK]))[0].id;
  const bagPatient = (await q(`INSERT INTO patients (name, phone, referral_source, age, height, weight, medical_condition, branch_id, total_cost, patient_classification)
       VALUES ($1,'07701110001',$2,'40','170','70','x',1,0,'new') RETURNING id`, [`${MARK} بغدادي`, MARK]))[0].id;

  const app = express(); app.use(express.json());
  app.use((req: any, res, next) => {
    const raw = req.headers["x-test-session-b64"];
    const bs = raw ? JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) : undefined;
    req.session = { ...(bs ? { branchSession: bs } : {}), destroy(cb: () => void) { res.setHeader("x-session-out", "1"); cb(); } };
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") return app;
    return realUse(...(args as [any]));
  };
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));
  try {
    console.log("\n── أ. قبل الإغلاق ──");
    same("أ١. موظّفُ كركوك يدخل", (await login("kirkuk", "bc_kirk")).status, 200);
    same("أ٢. ولا فرعَ مغلقاً في قائمة الدخول", (await http("GET", "/api/public/closed-branches", null)).body?.ids, []);

    console.log("\n── ب. المفتاح ──");
    same("ب١. غيرُ المسؤول لا يغلق", (await http("POST", "/api/admin/branches/5/closure", S.multi, { closed: true })).status, 403);
    same("ب٢. وجسمٌ غيرُ صالح ⟵ ٤٠٠", (await http("POST", "/api/admin/branches/5/closure", S.admin, { closed: "yes" })).status, 400);
    const c = await http("POST", "/api/admin/branches/5/closure", S.admin, { closed: true });
    same("ب٣. المسؤولُ يغلق كركوك", [c.status, c.body?.changed], [200, true]);
    const row = (await q(`SELECT temporarily_closed, closed_at IS NOT NULL AS at, closed_by FROM branches WHERE id = 5`))[0];
    same("ب٤. ومتى ومَن على الصفّ", [row.temporarily_closed, row.at, row.closed_by], [true, true, ADMIN]);
    same("ب٥. وسطرُ تدقيق", (await q(`SELECT action FROM audit_log WHERE entity_type='branch' AND entity_id=5 ORDER BY id`)).map((a) => a.action), ["branch_temporarily_closed"]);
    same("ب٦. وقائمةُ الدخول تُخفيه", (await http("GET", "/api/public/closed-branches", null)).body?.ids, [5]);
    same("ب٧. و/api/branches تقول إنه مغلق", (await http("GET", "/api/branches", S.admin)).body?.find((b: any) => b.id === 5)?.temporarilyClosed, true);

    console.log("\n── ج. الموظّفون ──");
    const k = await login("kirkuk", "bc_kirk");
    same("ج١. موظّفُ كركوك وحدها لا يدخل", [k.status, /مغلق مؤقتاً/.test(k.body?.message ?? "")], [401, true]);
    same("ج٢. ومَن له بغداد وكركوك لا يدخل كركوك", (await login("kirkuk", "bc_multi")).status, 401);
    const m = await login("baghdad", "bc_multi");
    same("ج٣. ويدخل بغداد، وكركوك خارجَ فروعه", [m.status, m.body?.branchId, m.body?.assignedBranches], [200, 1, [1]]);
    const live = await http("GET", "/api/branches", S.kirk);
    same("ج٤. وجلسةُ كركوك القائمة تنتهي في الطلب التالي", [live.status, live.set, /مغلق مؤقتاً/.test(live.body?.message ?? "")], [401, "1", true]);
    same("ج٥. وجلسةُ متعدّد الفروع على كركوك تنتقل ولا تنتهي", (await http("GET", "/api/branches", S.multi)).status, 200);
    same("ج٦. ولا يبدّل إليها", (await http("POST", "/api/auth/switch-branch", { ...S.multi, branchId: 1, accessibleBranches: [1] }, { branchId: 5 })).status, 403);

    console.log("\n── د. العملُ الجديد والتاريخ ──");
    const np = await http("POST", "/api/patients", S.admin, { name: `${MARK} جديد`, phone: "07701110002", branchId: 5, age: "30", referralSource: MARK });
    same("د١. لا مريضَ جديدٌ في كركوك", [np.status, /مغلق مؤقتاً/.test(np.body?.message ?? "")], [400, true]);
    const acc = await http("GET", `/api/patients/${bagPatient}/branch-access`, S.admin);
    same("د٢. ولا إتاحةَ لها (القائمة)", (acc.body?.eligibleBranches ?? []).map((b: any) => b.id).includes(5), false);
    same("د٣. ولا إتاحةَ لها (المنح)", (await http("POST", `/api/patients/${bagPatient}/branch-access`, S.admin, { branchId: 5 })).status, 400);
    same("د٤. وملفُّ مريض كركوك يبقى مقروءاً للمسؤول", (await http("GET", `/api/patients/${kirkPatient}`, S.admin)).status, 200);
    same("د٥. والمسؤولُ يبدّل إليها ليراجع تاريخها", (await http("POST", "/api/auth/switch-branch", S.admin, { branchId: 5 })).status, 200);

    console.log("\n── هـ. إعادةُ الفتح ──");
    const o = await http("POST", "/api/admin/branches/5/closure", S.admin, { closed: false });
    same("هـ١. المسؤولُ يعيد فتحها", [o.status, o.body?.changed], [200, true]);
    same("هـ٢. والتكرارُ لا يكتب", (await http("POST", "/api/admin/branches/5/closure", S.admin, { closed: false })).body?.changed, false);
    same("هـ٣. وموظّفُها يدخل فوراً", (await login("kirkuk", "bc_kirk")).status, 200);
    same("هـ٤. وقائمةُ الدخول تعرضها", (await http("GET", "/api/public/closed-branches", null)).body?.ids, []);
    same("هـ٥. وتدقيقُ الفتح", (await q(`SELECT action FROM audit_log WHERE entity_type='branch' AND entity_id=5 ORDER BY id`)).map((a) => a.action),
      ["branch_temporarily_closed", "branch_reopened"]);
  } finally {
    await cleanup(); invalidateClosedBranches(); srv.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل فحوص إغلاق الفرع نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
