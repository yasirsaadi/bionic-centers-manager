// §4.ar البند ٧ — ما يتغيّر في حساب الموظّف يسري على جلسته في الطلب التالي، لا بعد خروجٍ ودخول.
// قاعدة محلّية: `npm run test:session-refresh`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// (أ) سحبُ فرعٍ نشط ⟵ الجلسةُ تنتقل إلى فرعٍ باقٍ، والتبديلُ إلى المسحوب يُردّ.
// (ب) تغييرُ الدور يسري. (ج) **تخفيضُ المسؤول** يسقط صلاحياتِ المسؤول فوراً، والترقيةُ تمنحها.
// (د) **سحبُ آخر فرعٍ يُنهي الجلسة** — لا يتركها على `0` («كلُّ الفروع» لغير المسؤول).
// (هـ) مسؤولٌ بلا صفّ (جلسةُ اختبار/طوارئ) يمرّ كما كان.
import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { accessibleBranchesOf } from "./auth/session_refresh";

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
const PORT = 6877;
const q = async (t: string, p: any[] = []) => (await pool.query(t, p)).rows as any[];
const RECV = 9971, ADM = 9972, RECV2 = 9973, GHOST = 9979;

//  **جلساتٌ تبقى بين الطلبات** كمتصفّحٍ حقيقيّ — مفتاحُها ترويسة، و`destroy` يمحوها.
const store = new Map<string, any>();
async function call(key: string, method: string, path: string, body?: any) {
  const r = await fetch(`http://127.0.0.1:${PORT}${path}`, {
    method, headers: { "content-type": "application/json", "x-sid": key },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let j: any = null; try { j = await r.json(); } catch { /* empty */ }
  return { status: r.status, body: j };
}
const perms = { canViewPatients: true };

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد'),(2,'ذي قار') ON CONFLICT DO NOTHING`);
  const mkUser = (id: number, role: string, branchIds: number[]) => q(
    `INSERT INTO system_users (id,username,password_hash,display_name,role,branch_id,branch_ids,is_active,can_view_patients)
     VALUES ($1,$2,'x','موظف',$3,$4,$5::jsonb,true,true)
     ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true`,
    [id, `sr_u${id}`, role, branchIds[0] ?? null, JSON.stringify(branchIds)]);
  await mkUser(RECV, "reception", [1, 2]);
  await mkUser(ADM, "admin", [1]);
  await mkUser(RECV2, "reception", [1]);

  store.set("recv", { branchSession: { userId: RECV, role: "reception", isAdmin: false, branchId: 2, accessibleBranches: [1, 2], displayName: "موظف", permissions: perms } });
  store.set("adm", { branchSession: { userId: ADM, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [1], displayName: "مسؤول", permissions: perms } });
  store.set("recv2", { branchSession: { userId: RECV2, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1], displayName: "موظف", permissions: perms } });
  store.set("ghost", { branchSession: { userId: GHOST, role: "admin", isAdmin: true, branchId: 0, displayName: "طوارئ", permissions: perms } });

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const key = String(r.headers["x-sid"] ?? "");
    const sess = store.get(key) ?? {};
    sess.destroy = (cb: () => void) => { store.delete(key); cb(); };
    r.session = sess;
    next();
  });
  const realUse = app.use.bind(app);
  (app as any).use = (...a: any[]) =>
    (a.length === 1 && typeof a[0] === "function" && a[0].name === "session") ? app : realUse(...(a as [any]));
  const srv = createServer(app);
  await registerRoutes(srv, app);
  srv.listen(PORT);
  await new Promise((r) => srv.once("listening", r));

  const me = async (k: string) => {
    const r = await call(k, "GET", "/api/auth/user");
    return r.status === 200 ? [r.body.branchId, r.body.accessibleBranches, r.body.isAdmin, r.body.role, r.body.branchName] : r.status;
  };
  try {
    same("هـ٠. قاعدةُ الفروع: `branch_ids` وإلّا `[branch_id]`",
      [accessibleBranchesOf({ branchId: 3, branchIds: [] }), accessibleBranchesOf({ branchId: 3, branchIds: [1, 2] }), accessibleBranchesOf({ branchId: null, branchIds: null })],
      [[3], [1, 2], []]);

    console.log("\n── أ. سحبُ فرعٍ نشط ──");
    // §4.ay: نطاقُ العمل الفرعُ النشط وحده، وفروعُ الحساب كلُّها في `assignedBranches` للمبدِّل.
    same("أ٠. قبل السحب: على ذي قار — نطاقُه الفرعُ النشط، وفروعُ حسابه للمبدِّل", [await me("recv"), (await call("recv", "GET", "/api/auth/user")).body.assignedBranches], [[2, [2], false, "reception", null], [1, 2]]);
    await q(`UPDATE system_users SET branch_ids='[1]'::jsonb WHERE id=$1`, [RECV]);
    same("أ١. **الطلبُ التالي: انتقل إلى بغداد، وذي قار خرجت من فروعه**", await me("recv"), [1, [1], false, "reception", "بغداد"]);
    same("أ٢. **والتبديلُ إلى الفرع المسحوب يُردّ**", (await call("recv", "POST", "/api/auth/switch-branch", { branchId: 2 })).status, 403);

    console.log("\n── ب. تغييرُ الدور ──");
    await q(`UPDATE system_users SET role='doctor' WHERE id=$1`, [RECV]);
    same("ب١. الدورُ الجديد يسري", (await me("recv") as any[])[3], "doctor");

    console.log("\n── ج. تخفيضُ المسؤول وترقيتُه ──");
    same("ج٠. قبل: مسؤول", (await call("adm", "GET", "/api/admin/settings")).status, 200);
    await q(`UPDATE system_users SET role='reception' WHERE id=$1`, [ADM]);
    same("ج١. **بعد التخفيض: الطلبُ التالي يُردّ عن إعدادات المسؤول**", (await call("adm", "GET", "/api/admin/settings")).status, 403);
    same("   وجلستُه صارت استقبالاً على فرعه", await me("adm"), [1, [1], false, "reception", "بغداد"]);
    await q(`UPDATE system_users SET role='admin' WHERE id=$1`, [RECV2]);
    same("ج٢. والترقيةُ تمنحها فوراً", [(await call("recv2", "GET", "/api/admin/settings")).status, (await me("recv2") as any[])[0]], [200, 0]);

    console.log("\n── د. سحبُ آخر فرع ──");
    await q(`UPDATE system_users SET branch_ids='[]'::jsonb, branch_id=NULL WHERE id=$1`, [ADM]);
    same("د١. **الجلسةُ تُنهى — لا «فرع صفر» يفتح كلَّ الفروع**", [(await call("adm", "GET", "/api/auth/user")).status, store.has("adm")], [401, false]);

    console.log("\n── هـ. مسؤولٌ بلا صفّ ──");
    same("هـ١. يمرّ كما كان", (await call("ghost", "GET", "/api/admin/settings")).status, 200);
  } finally {
    await new Promise((r) => srv.close(() => r(null)));
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[RECV, ADM, RECV2]]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[RECV, ADM, RECV2]]);
    await pool.end();
  }
  console.log(failures === 0 ? "\n✅ كل الاختبارات نجحت" : `\n❌ ${failures} فشل`);
  process.exit(failures === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(2); });
