// دخولُ الطوارئ القديم أُغلق — «مسؤول» بكلمة مرورٍ مشتركة بلا حساب (قرارُ المالك ٢٠٢٦-١٠-٠٢، §4.bk).
// قاعدة محلّية: `npm run test:emergency-login-closed`.
//
// أ. «admin» + الكلمةُ المشتركة الصحيحة ⟵ ٤٠١ (كان: جلسةُ مسؤولٍ بلا userId).
// ب. والمسؤولُ بحسابه الشخصيّ يدخل كما كان.
// ج. بوابةُ الصفحات المحمية (`/api/verify-admin`) بالجلسة لا بكود.  د. تغييرُ الكلمة المشتركة ⟵ ٤١٠.

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { storage } from "./storage";

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

const PORT = 6897;
const BASE = `http://127.0.0.1:${PORT}`;
const ADMIN = 9991, RECV = 9992;
const SHARED = "shared-emergency-123";

async function q<T = any>(t: string, p: any[] = []): Promise<T[]> {
  return (await pool.query(t, p)).rows as T[];
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'فرع ١') ON CONFLICT DO NOTHING`);
  const hash = await bcrypt.hash("my-own-pass", 10);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'elc_owner',$2,'المالك','admin',1,'[1]'::jsonb,true)
           ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, role='admin', is_active=true`, [ADMIN, hash]);
  await q(`INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active)
           VALUES ($1,'elc_recv',$2,'استقبال','reception',1,'[1]'::jsonb,true)
           ON CONFLICT (id) DO UPDATE SET password_hash=EXCLUDED.password_hash, is_active=true`, [RECV, hash]);
  const prevHash = await storage.getSystemSetting("admin_password_hash");
  await storage.setSystemSetting("admin_password_hash", await bcrypt.hash(SHARED, 10));

  //  جلسةٌ حقيقيّة في الذاكرة لكلّ «متصفّح» — كي يُختبَر ما تكتبه `verify-branch` في الجلسة ثمّ ما تقرؤه البوابة.
  const jars = new Map<string, any>();
  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const id = String(r.headers["x-jar"] ?? "anon");
    if (!jars.has(id)) jars.set(id, {});
    r.session = jars.get(id);
    r.session.save = (cb?: any) => cb?.();
    r.session.regenerate = (cb?: any) => cb?.();
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...args: any[]) =>
    (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") ? app : realUse(...(args as [any]));
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));
  const call = async (jar: string, method: string, path: string, body?: any) => {
    const res = await fetch(BASE + path, { method, headers: { "content-type": "application/json", "x-jar": jar },
      body: body === undefined ? undefined : JSON.stringify(body) });
    let json: any = null;
    try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  };

  try {
    console.log("\n── أ. دخولُ الطوارئ ──");
    const em = await call("e", "POST", "/api/verify-branch", { branchKey: "admin", username: "admin", password: SHARED });
    same("أ١. **«admin» بالكلمة المشتركة الصحيحة ⟵ ٤٠١**", em.status, 401);
    check(!jars.get("e")?.branchSession, "أ٢. ولا جلسةَ مسؤولٍ وُلدت", JSON.stringify(jars.get("e")));

    console.log("\n── ب. الحسابُ الشخصيّ ──");
    const own = await call("o", "POST", "/api/verify-branch", { branchKey: "admin", username: "elc_owner", password: "my-own-pass" });
    same("ب١. **المسؤولُ بحسابه يدخل**", [own.status, jars.get("o")?.branchSession?.isAdmin, jars.get("o")?.branchSession?.userId], [200, true, ADMIN]);

    console.log("\n── ج. بوابةُ الصفحات المحمية ──");
    same("ج١. جلسةُ المسؤول ⟵ تُفتح (بلا كود)", (await call("o", "POST", "/api/verify-admin", {})).status, 200);
    await call("r", "POST", "/api/verify-branch", { branchKey: "baghdad", username: "elc_recv", password: "my-own-pass" });
    same("ج٢. **وغيرُ المسؤول ⟵ ٤٠٣ ولو أرسل الكودَ المشترك**",
      (await call("r", "POST", "/api/verify-admin", { code: SHARED })).status, 403);

    console.log("\n── د. تغييرُ الكلمة المشتركة ──");
    same("د١. **⟵ ٤١٠**", (await call("o", "POST", "/api/admin/settings/admin-password",
      { currentPassword: SHARED, newPassword: "abcd1234" })).status, 410);
  } finally {
    await storage.setSystemSetting("admin_password_hash", prevHash ?? "");
    await q(`UPDATE audit_log SET user_id = NULL WHERE user_id = ANY($1)`, [[ADMIN, RECV]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1)`, [[ADMIN, RECV]]).catch(() => {});
    httpServer.close();
  }
  console.log(`\n${failures === 0 ? "✅ كل الاختبارات نجحت" : `❌ ${failures} فشل`}`);
  await pool.end();
  process.exit(failures === 0 ? 0 : 1);
}
main().catch(async (e) => {
  console.error(e);
  try { await pool.end(); } catch { /* ignore */ }
  process.exit(1);
});
