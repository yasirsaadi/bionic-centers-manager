// أدوارُ العلاج الطبيعي وعلَما «المشرف العام» و«الإبر الجافة» (ترحيل ١٠٤، §4.cg — ٢٠٢٦-١٠-٠٧).
// `npm run test:physio-roles` — على النقاط الحقيقية بتطبيق Express الحقيقيّ.
//
// يحرس: (أ) الأدوارُ الثلاثة الجديدة تُنشأ وتُعدَّل من نقطتَي المستخدم — والقائمةُ واحدةٌ لهما؛ (ب) دورٌ مجهول
// يُرفض في الاثنتين؛ (ج) العلَمان يُخزَّنان ويصلان الجلسةَ حيّاً، ونصُّ "false" لا يُشعلهما؛ (د) لا يمنحهما دور:
// مديرُ الفرع والأخصائيّ بلا علَم لا يحملانهما، والمسؤولُ يحمل الإشرافَ وحده بسلطته؛ (هـ) غيرُ المسؤول لا يضبطهما؛
// (و) تغييرُ الدور والعلَم يكتب سطرَ تدقيق؛ (ز) قدرةُ «العلاج الطبيعي» في المساعد لأدوار القسم الأربعة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "physio-roles-test-secret";

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { capabilitiesFor } from "@shared/ai_capabilities";
import { USER_ROLES, PHYSIO_ROLES } from "@shared/user_roles";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6985;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9621;
const ADMIN = 9622;
const MANAGER = 9623; // سليم: مدير فرع يحمل الإشراف
const USERNAMES = ["pr-spec", "pr-tech", "pr-train", "pr-bad", "pr-str"];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const ids = (await q(`SELECT id FROM system_users WHERE username = ANY($1::text[]) OR id = ANY($2::int[])`,
    [USERNAMES, [ADMIN, MANAGER]])).rows.map((r) => r.id);
  await q(`DELETE FROM audit_log WHERE (entity_type = 'system_user' AND entity_id = ANY($1::int[])) OR user_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار أدوار العلاج الطبيعي')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'pr-admin', $5, 'مسؤول', 'admin', NULL, '[]', true),
                  ($2, 'pr-manager', 'x', 'سليم', 'branch_manager', $3, $4::jsonb, true)`,
    [ADMIN, MANAGER, B1, JSON.stringify([B1]), await bcrypt.hash("pass1234", 4)]);

  const admin = hdr({ userId: ADMIN, displayName: "مسؤول", role: "admin", branchId: null, isAdmin: true, permissions: {} });
  const managerSess = (perms: Record<string, unknown> = {}) =>
    hdr({ userId: MANAGER, displayName: "سليم", role: "branch_manager", branchId: B1, isAdmin: false, permissions: perms });

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const h = req.get("x-test-session");
    if (h) {
      try { req.session = { branchSession: JSON.parse(Buffer.from(h, "base64").toString("utf8")), destroy: (cb: () => void) => cb() }; }
      catch { /* ignore */ }
    }
    next();
  });
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  const call = async (method: string, path: string, session: string, body?: unknown) => {
    const r = await fetch(`${BASE}${path}`, {
      method, headers: { "content-type": "application/json", "x-test-session": session },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let json: any = null;
    try { json = await r.json(); } catch { /* */ }
    return { status: r.status, json };
  };
  const create = (username: string, role: string, extra: Record<string, unknown> = {}) =>
    call("POST", "/api/admin/users", admin, { username, password: "pass1234", displayName: username, role, branchId: B1, branchIds: [B1], ...extra });
  const permsOf = async (id: number, role: string) =>
    (await call("GET", "/api/auth/user", hdr({ userId: id, displayName: "x", role, branchId: B1, isAdmin: false, permissions: {} }))).json?.permissions ?? {};
  const row = async (id: number) =>
    (await q(`SELECT role, can_supervise_physio, can_dry_needle FROM system_users WHERE id = $1`, [id])).rows[0];

  try {
    console.log("\n── أ. الأدوارُ الثلاثة الجديدة تُنشأ ──");
    const spec = await create("pr-spec", "physio_specialist", { canDryNeedle: true });
    const tech = await create("pr-tech", "physio_technician");
    const train = await create("pr-train", "physio_trainer");
    same("أ.١ الأخصائيّ يُنشأ", spec.status, 200);
    same("أ.٢ التقنيّ يُنشأ", tech.status, 200);
    same("أ.٣ المدرّب يُنشأ", train.status, 200);
    same("أ.٤ دورُ الأخصائيّ مخزَّنٌ بحرفه، والإبرُ الجافة مُشعلة", await row(spec.json?.id),
      { role: "physio_specialist", can_supervise_physio: false, can_dry_needle: true });
    same("أ.٥ التقنيّ بلا علَمٍ إن لم يُرسَل", await row(tech.json?.id),
      { role: "physio_technician", can_supervise_physio: false, can_dry_needle: false });

    console.log("\n── ب. دورٌ مجهول يُرفض في النقطتين ──");
    same("ب.١ إنشاءٌ بدورٍ مجهول ⟵ ٤٠٠", (await create("pr-bad", "physio_boss")).status, 400);
    same("ب.٢ تعديلٌ إلى دورٍ مجهول ⟵ ٤٠٠",
      (await call("PATCH", `/api/admin/users/${tech.json?.id}`, admin, { role: "physio_boss" })).status, 400);
    same("ب.٣ والدورُ لم يتغيّر", (await row(tech.json?.id))?.role, "physio_technician");
    same("ب.٤ تعديلُ التقنيّ إلى مدرّب ينجح", (await call("PATCH", `/api/admin/users/${tech.json?.id}`, admin, { role: "physio_trainer" })).status, 200);
    same("ب.٥ وتعديلُ معالجٍ إلى أخصائيّ (حالُ مصطفى) ينجح",
      (await call("PATCH", `/api/admin/users/${tech.json?.id}`, admin, { role: "physio_specialist" })).status, 200);
    same("ب.٦ وكلُّ دورٍ في القائمة الواحدة له تسمية", PHYSIO_ROLES.every((r) => (USER_ROLES as readonly string[]).includes(r)), true);

    console.log("\n── ج. «المشرف العام» لمدير الفرع — مخزَّنٌ ويصل الجلسةَ حيّاً ──");
    same("ج.١ قبل الإشعال: مديرُ الفرع لا يحمل الإشراف (لا يمنحه الدور)", (await permsOf(MANAGER, "branch_manager")).canSupervisePhysio, false);
    same("ج.٢ نصُّ \"false\" لا يُشعله",
      (await call("PATCH", `/api/admin/users/${MANAGER}`, admin, { canSupervisePhysio: "false" })).status, 200);
    same("ج.٣ …فيبقى مُطفأً في القاعدة", (await row(MANAGER))?.can_supervise_physio, false);
    same("ج.٤ الإشعالُ ينجح", (await call("PATCH", `/api/admin/users/${MANAGER}`, admin, { canSupervisePhysio: true })).status, 200);
    same("ج.٥ ويصل الجلسةَ حيّاً بلا خروج", (await permsOf(MANAGER, "branch_manager")).canSupervisePhysio, true);
    same("ج.٦ ودورُه باقٍ مدير فرع", (await row(MANAGER))?.role, "branch_manager");
    same("ج.٧ والإبرُ الجافة لا تأتي معه", (await permsOf(MANAGER, "branch_manager")).canDryNeedle, false);

    console.log("\n── د. لا يمنحهما الدور ──");
    const sp2 = await create("pr-str", "physio_specialist", { canDryNeedle: "false" });
    same("د.١ أخصائيٌّ بنصّ \"false\" لا يحمل الإبر الجافة", (await row(sp2.json?.id))?.can_dry_needle, false);
    //  Postgres نفسُه يقبل 'on'/'yes'/'1' صادقةً — فالتطبيعُ في الخادم هو ما يجعل `true` الصريحةَ وحدها تُشعل.
    same("د.١ب نصُّ \"on\" لا يُشعل الإبر الجافة",
      (await call("PATCH", `/api/admin/users/${sp2.json?.id}`, admin, { canDryNeedle: "on" })).status, 200);
    same("د.١ج …فتبقى مُطفأة", (await row(sp2.json?.id))?.can_dry_needle, false);
    same("د.٢ ولا الإشرافَ من دوره", (await permsOf(sp2.json?.id, "physio_specialist")).canSupervisePhysio, false);
    same("د.٣ والأخصائيُّ الذي أُشعل له العلَم يحمل الإبر الجافة في جلسته", (await permsOf(spec.json?.id, "physio_specialist")).canDryNeedle, true);
    //  المسؤولُ بدخولٍ حقيقيّ — صلاحياتُه تُبنى عند الدخول (`applyFreshUser` لا يعيد بناءها لمسؤولٍ بقي مسؤولاً).
    const login = await fetch(`${BASE}/api/verify-branch`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchKey: "pr-admin", username: "pr-admin", password: "pass1234" }),
    });
    same("د.٣أ المسؤولُ يدخل", login.status, 200);
    //  ردُّ الدخول يحمل صلاحياتِ الجلسة نفسَها التي تُخزَّن (والكعكةُ `secure` لا تُرسَل على http في الاختبار).
    const adminPerms = (await login.json())?.permissions ?? {};
    same("د.٤ المسؤولُ يحمل الإشرافَ بسلطته", adminPerms.canSupervisePhysio, true);
    same("د.٥ ولا يحمل الإبرَ الجافة ضمناً — ليست قراراً إدارياً", adminPerms.canDryNeedle, false);

    console.log("\n── هـ. غيرُ المسؤول لا يضبطهما ──");
    const mgr = managerSess({ canManageUsers: true });
    same("هـ.١ مديرُ الفرع لا يُشعل الإبرَ لنفسه ⟵ ٤٠٣",
      (await call("PATCH", `/api/admin/users/${MANAGER}`, mgr, { canDryNeedle: true })).status, 403);
    same("هـ.٢ والقاعدةُ لم تتغيّر", (await row(MANAGER))?.can_dry_needle, false);

    console.log("\n── و. سطرُ التدقيق ──");
    const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v) as any;
    const audits = (await q(`SELECT old_values, new_values FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1 ORDER BY id`, [MANAGER])).rows
      .map((a) => ({ old_values: parse(a.old_values), new_values: parse(a.new_values) }));
    check(audits.some((a) => a.new_values?.canSupervisePhysio === true && a.old_values?.canSupervisePhysio === false),
      "و.١ إشعالُ الإشراف يكتب سطرَ تدقيقٍ بالقديم والجديد", JSON.stringify(audits));
    const roleAudits = (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1`, [tech.json?.id])).rows
      .map((a) => ({ new_values: parse(a.new_values) }));
    check(roleAudits.some((a) => a.new_values?.role === "physio_specialist"), "و.٢ تغييرُ الدور إلى أخصائيّ مكتوبٌ في التدقيق", JSON.stringify(roleAudits));

    console.log("\n── ز. قدرةُ «العلاج الطبيعي» في المساعد ──");
    for (const r of PHYSIO_ROLES) {
      check(capabilitiesFor({ role: r, isAdmin: false, permissions: {} }).has("physio"), `ز.${r} يحمل قدرةَ physio`);
    }
    check(!capabilitiesFor({ role: "reception", isAdmin: false, permissions: {} }).has("physio"), "ز.reception لا يحملها بدوره");
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّ التأكيدات نجحت");
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); process.exit(1); });
