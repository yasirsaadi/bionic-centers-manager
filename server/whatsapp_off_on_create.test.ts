// التسجيلُ بلا موافقة واتساب (§4.bu، قرارُ المالك ٢٠٢٦-١٠-٠٣): الترحيبُ عبر تلغرام بمسح الرمز.
// قاعدة محلّية: `npm run test:whatsapp-off-on-create`.
import express from "express";
import { createServer } from "http";
import { readFileSync } from "fs";
import { pool } from "./db";
import { registerRoutes } from "./routes";

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) { console.error("Refusing to run: LOCAL TEST database only."); process.exit(1); }
let failures = 0;
function same(msg: string, got: unknown, expected: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✅" : "❌ FAIL"}  ${msg}${ok ? "" : `\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`}`);
}
const PORT = 6959, BASE = `http://127.0.0.1:${PORT}`, MARK = "اختبار-واتساب-مطفأ", RECV = 9951;
const S = { userId: RECV, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "استقبال",
  permissions: { canViewPatients: true, canAddPatients: true, canEditPatients: true } };
const q = async <T = any>(t: string, p: any[] = []) => (await pool.query(t, p)).rows as T[];
async function http(method: string, path: string, body?: any) {
  const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json",
    "x-test-session-b64": Buffer.from(JSON.stringify(S), "utf8").toString("base64") }, body: body === undefined ? undefined : JSON.stringify(body) });
  let json: any = null; try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}
const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
async function cleanup() {
  for (const t of ["patient_notification_deliveries", "patient_events", "patient_contacts", "patient_link_tokens",
    "patient_code_aliases", "cost_entries", "patient_cases"]) await q(`DELETE FROM ${t} WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}
async function main() {
  //  الواجهة: لا مربّع، والقيمةُ المُرسَلة `false` صراحةً.
  const src = readFileSync("client/src/pages/CreatePatient.tsx", "utf8");
  same("١. نموذجُ التسجيل بلا مربّع واتساب", /checkbox-whatsapp-consent|label-whatsapp-consent/.test(src), false);
  same("٢. ويرسل whatsappNotificationsEnabled: false صراحةً",
    /sessionCount: 0,[\s\S]{0,200}whatsappNotificationsEnabled: false,\s*\};\s*mutate\(submitData/.test(src), true);

  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active,
             can_view_patients, can_add_patients, can_edit_patients)
           VALUES ($1,'wof_u','x','استقبال','reception',1,'[1]'::jsonb,true,true,true,true)
           ON CONFLICT (id) DO UPDATE SET is_active=true, can_view_patients=true, can_add_patients=true, can_edit_patients=true`, [RECV]);
  await cleanup();
  const app = express(); app.use(express.json());
  app.use((req: any, _r, next) => { const raw = req.headers["x-test-session-b64"];
    req.session = raw ? { branchSession: JSON.parse(Buffer.from(String(raw), "base64").toString("utf8")) } : {}; next(); });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) => (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app); await registerRoutes(srv, app); srv.listen(PORT);
  await new Promise<void>((r) => srv.once("listening", r));
  try {
    const r = await http("POST", "/api/patients", { name: `${MARK} ١`, phone: "07701239876", referralSource: MARK,
      age: "40", height: "172", weight: "78", medicalCondition: "x", branchId: 1, totalCost: 0,
      patientClassification: "new", isPhysiotherapy: true, whatsappNotificationsEnabled: false });
    same("٣. التسجيلُ ينجح", r.status, 201);
    const p = (await q(`SELECT whatsapp_notifications_enabled AS e, whatsapp_consent_at AS at FROM patients WHERE id=$1`, [r.body?.id]))[0];
    same("٤. لا موافقةَ واتساب ولا ختم", [p?.e, p?.at], [false, null]);
    await new Promise((res) => setTimeout(res, 300));
    const wa = await q(`SELECT 1 FROM patient_notification_deliveries WHERE patient_id=$1 AND channel='whatsapp'`, [r.body?.id]);
    same("٥. ولا ترحيبَ واتساب في الطابور", wa.length, 0);
  } finally {
    await cleanup(); await q(`DELETE FROM audit_log WHERE user_id=$1`, [RECV]); await q(`DELETE FROM system_users WHERE id=$1`, [RECV]); srv.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
