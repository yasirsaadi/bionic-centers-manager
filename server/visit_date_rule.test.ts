// §4.ar البند ٢٦ — إضافةُ الزيارة بصلاحية زرّها، وتاريخُها بالقاعدة (قرارُ المالك ٢٠٢٦-٠٩-٢٩).
// قاعدة محلّية: `npm run test:visit-date-rule`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) القاعدةُ الخالصة: اليومُ وحتى ٣ أيامٍ قبله للموظّف · أقدمُ للمسؤول العام وحده · المستقبلُ مرفوضٌ للجميع.
// (ب) `POST /api/visits`: بلا `canAddPatients` ⟵ ٤٠٣ · اليومَ و٣ أيام ⟵ تُسجَّل · ٤ أيام ⟵ ٤٠٣ برسالة المسؤول · والمسؤولُ يسجّلها ·
//     والمستقبلُ ⟵ ٤٠٠ حتى للمسؤول. (ج) تعديلُ التاريخ (`PATCH`) بالقاعدة نفسِها.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { checkVisitDate, VISIT_BACKDATE_MESSAGE, VISIT_FUTURE_MESSAGE, baghdadTodayYmd } from "@shared/visit_date";

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
const PORT = 6883;
const MARK = "اختبار-تاريخ-الزيارة";
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const RECV = 9951, VIEWER = 9952, EDITOR = 9953, ADMIN = 9954;
const USERS = [RECV, VIEWER, EDITOR, ADMIN];
const sess = (userId: number, role: string, isAdmin = false) => ({ userId, role, isAdmin, branchId: 1, accessibleBranches: [1],
  displayName: `موظف ${userId}`, permissions: {} });
async function http(method: string, path: string, s: any, body?: any) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method, headers: { "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(s), "utf8").toString("base64") },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
const ago = (n: number) => {
  const t = baghdadTodayYmd();
  const d = new Date(Date.UTC(+t.slice(0, 4), +t.slice(5, 7) - 1, +t.slice(8, 10)) - n * 86_400_000);
  return d.toISOString().slice(0, 10);
};

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source='${MARK}'`;
  for (const t of ["visits", "patient_events", "patient_contacts", "patient_notification_deliveries", "patient_cases"]) {
    await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`).catch(() => {});
  }
  await q(`DELETE FROM patients WHERE referral_source='${MARK}'`);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
}

async function main() {
  console.log("── أ. القاعدةُ الخالصة ──");
  const T = "2026-09-29";
  same("أ١. اليومُ و٣ أيام للموظّف", [checkVisitDate(T, false).ok, checkVisitDate("2026-09-26", false).ok], [true, true]);
  same("أ٢. **٤ أيام ⟵ للمسؤول العام وحده**", [checkVisitDate("2026-09-25", false, T), checkVisitDate("2026-09-25", true, T)],
    [{ ok: false, status: 403, message: VISIT_BACKDATE_MESSAGE }, { ok: true }]);
  same("أ٣. **المستقبلُ مرفوضٌ حتى للمسؤول**", checkVisitDate("2026-09-30", true, T), { ok: false, status: 400, message: VISIT_FUTURE_MESSAGE });
  same("أ٤. وفارغٌ = اليوم", checkVisitDate(null, false, T), { ok: true });

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  for (const [id, role, add, edit] of [[RECV, "reception", true, false], [VIEWER, "reception", false, false],
    [EDITOR, "reception", true, true], [ADMIN, "admin", true, true]] as any[]) {
    await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,
               can_view_patients,can_add_patients,can_edit_visits)
             VALUES ($1,$2,'x','موظف',$3,1,'[1]'::jsonb,true,true,$4,$5)
             ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, is_active=true, can_add_patients=EXCLUDED.can_add_patients,
               can_edit_visits=EXCLUDED.can_edit_visits, can_view_patients=true`, [id, `vd_u${id}`, role, add, edit]);
  }
  await cleanup();
  const pid = Number((await q(`INSERT INTO patients (name, phone, referral_source, age, medical_condition, branch_id,
      is_physiotherapy, total_cost, patient_classification)
    VALUES ($1,'07700000000',$2,'40','physiotherapy',1,true,0,'new') RETURNING id`, [`${MARK} مريض`, MARK]))[0].id);

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) } : {};
    r.session.destroy = (cb: () => void) => cb();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) =>
    (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app);
  await registerRoutes(srv, app);
  srv.listen(PORT);
  await new Promise((r) => srv.once("listening", r));
  const visit = (s: any, customDate: string | null) =>
    http("POST", "/api/visits", s, { patientId: pid, branchId: 1, notes: "زيارة", treatmentType: "روبوت", customDate });
  const visits = async () => (await q(`SELECT count(*)::int n FROM visits WHERE patient_id=$1`, [pid]))[0].n;

  try {
    console.log("\n── ب. إضافةُ الزيارة ──");
    same("ب١. **بلا صلاحية «إضافة مرضى» ⟵ ٤٠٣ ولا زيارة**", [(await visit(sess(VIEWER, "reception"), null)).status, await visits()], [403, 0]);
    same("ب٢. الاستقبالُ يسجّل اليوم", (await visit(sess(RECV, "reception"), ago(0))).status, 201);
    same("ب٣. **وقبل ٣ أيام**", (await visit(sess(RECV, "reception"), ago(3))).status, 201);
    const old = await visit(sess(RECV, "reception"), ago(4));
    same("ب٤. **وقبل ٤ أيام ⟵ ٤٠٣: «من صلاحية المسؤول العام فقط»**", [old.status, old.body?.message], [403, VISIT_BACKDATE_MESSAGE]);
    same("ب٥. **والمسؤولُ العامّ يسجّلها** — ولو قبل عشرة أيام", (await visit(sess(ADMIN, "admin", true), ago(10))).status, 201);
    same("ب٦. **والمستقبلُ مرفوضٌ حتى للمسؤول**", (await visit(sess(ADMIN, "admin", true), ago(-1))).status, 400);
    same("   ولم يُكتب إلّا المقبول (٣)", await visits(), 3);

    console.log("\n── ج. تعديلُ التاريخ ──");
    const vid = Number((await q(`SELECT id FROM visits WHERE patient_id=$1 ORDER BY id LIMIT 1`, [pid]))[0].id);
    same("ج١. **مُعدِّلُ الزيارات يُرجعها ٥ أيام ⟵ ٤٠٣**", (await http("PATCH", `/api/visits/${vid}`, sess(EDITOR, "reception"), { customDate: ago(5) })).status, 403);
    same("ج٢. وإلى أمس يمرّ", (await http("PATCH", `/api/visits/${vid}`, sess(EDITOR, "reception"), { customDate: ago(1) })).status, 200);
    same("ج٣. والمسؤولُ يُرجعها ٥ أيام", (await http("PATCH", `/api/visits/${vid}`, sess(ADMIN, "admin", true), { customDate: ago(5) })).status, 200);
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await cleanup();
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
