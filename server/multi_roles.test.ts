// أكثرُ من دورٍ للحساب (ترحيل ١٠٥، §4.ch — ٢٠٢٦-١٠-٠٧).
// `npm run test:multi-roles` — على النقاط الحقيقية بتطبيق Express الحقيقيّ، ومعها القواعدُ الخالصة.
//
// يحرس:
//   أ  التطبيعُ: المسؤولُ حصريّ، والمشمولُ يسقط، والأعلى يصير `role`، والمجهولُ يُرفض.
//   ب  نافذةُ المستخدم: `roles` تُنشئ وتعدّل، و`role` وحده يُبقي الإضافية، و`extraRoles` لا تُقبل من الطلب مباشرةً.
//   ج  الجلسةُ الحيّة تحمل الأدوارَ كلَّها بلا خروج.
//   د  **منحٌ** بدورٍ إضافيّ: محاسبٌ هو طبيبٌ أيضاً يكتب المعاينة؛ واستقبالٌ هو محاسبٌ أيضاً يفتح دفترَ القاصة؛
//      ومحاسبٌ هو خبيرٌ أيضاً يظهر في قائمة خبراء فرعه.
//   هـ **حصرٌ** لا يضيّق على مَن له دورٌ آخر: الاستقبالُ وحده يُدخل جلساتِ اليوم فقط، ومحاسبٌ هو استقبالٌ أيضاً لا يُقيَّد.
//   و  القواعدُ المشتركة: القدراتُ، وأنواعُ التنبيهات، ولقطةُ الدور، وشاشةُ البدء.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "multi-roles-test-secret";

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { normalizeRoles, coveredBy, rolesOf, hasRole, onlyRoles, landingPathOf, hidesDashboard } from "@shared/user_roles";
import { capabilitiesFor } from "@shared/ai_capabilities";
import { eligibleStaffEvents } from "@shared/staff_notifications";
import { actorRoleSnapshotOf } from "@shared/decision_queue";
import { canWriteCashBook } from "@shared/cash_book";
import { canViewFollowup } from "@shared/followup";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6987;
const BASE = `http://127.0.0.1:${PORT}`;
const B1 = 9631;
const ADMIN = 9632;
const USERNAMES = ["mr-fadel", "mr-rec", "mr-acc-doc", "mr-acc-exp", "mr-mgr", "mr-bad", "mr-direct"];

const q = (t: string, p: any[] = []) => pool.query(t, p);
const hdr = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const ids = (await q(`SELECT id FROM system_users WHERE username = ANY($1::text[]) OR id = $2`, [USERNAMES, ADMIN])).rows.map((r) => r.id);
  await q(`DELETE FROM audit_log WHERE (entity_type = 'system_user' AND entity_id = ANY($1::int[])) OR user_id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM session_counts WHERE daily_session_id IN (SELECT id FROM daily_sessions WHERE branch_id = $1)`, [B1]).catch(() => {});
  await q(`DELETE FROM daily_sessions WHERE branch_id = $1`, [B1]).catch(() => {});
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  // ══ أ. التطبيع — قواعدُ خالصة ════════════════════════════════════════════
  console.log("\n── أ. التطبيع ──");
  same("أ.١ محاسبٌ واستقبال ⟵ الأعلى «محاسب» والإضافيُّ «استقبال»",
    normalizeRoles(["reception", "accountant"]), { role: "accountant", extraRoles: ["reception"] });
  same("أ.٢ المسؤولُ حصريّ — يُسقط ما معه", normalizeRoles(["reception", "admin", "doctor"]), { role: "admin", extraRoles: [] });
  same("أ.٣ مديرُ الفرع يشمل الاستقبالَ والمحاسب فيسقطان", normalizeRoles(["reception", "branch_manager", "accountant"]),
    { role: "branch_manager", extraRoles: [] });
  same("أ.٤ والأخصائيُّ يشمل المعالج", normalizeRoles(["therapist", "physio_specialist"]), { role: "physio_specialist", extraRoles: [] });
  same("أ.٥ ومديرٌ وطبيب يبقيان معاً", normalizeRoles(["doctor", "branch_manager"]), { role: "branch_manager", extraRoles: ["doctor"] });
  same("أ.٦ دورٌ مجهول ⟵ رفض", normalizeRoles(["reception", "boss"]), null);
  same("أ.٧ ولا أدوار ⟵ رفض", normalizeRoles([]), null);
  same("أ.٨ والمكرّرُ مرّةً واحدة", normalizeRoles(["reception", "reception"]), { role: "reception", extraRoles: [] });
  same("أ.٩ «يشمله» للعرض", [coveredBy(["branch_manager"], "accountant"), coveredBy(["admin"], "doctor"), coveredBy(["accountant"], "reception")],
    ["branch_manager", "admin", null]);
  same("أ.١٠ rolesOf: الجلسة (`roles`) وصفُّ الحساب (`extraRoles`)",
    [rolesOf({ role: "accountant", roles: ["accountant", "reception"] }), rolesOf({ role: "accountant", extraRoles: ["reception"] }), rolesOf({ role: "doctor" })],
    [["accountant", "reception"], ["accountant", "reception"], ["doctor"]]);

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار الأدوار المتعدّدة')`, [B1]);
  await q(`INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'mr-admin', 'x', 'مسؤول', 'admin', NULL, '[]', true)`, [ADMIN]);
  const admin = hdr({ userId: ADMIN, displayName: "مسؤول", role: "admin", branchId: null, isAdmin: true, permissions: {} });

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
  const create = (username: string, body: Record<string, unknown>) =>
    call("POST", "/api/admin/users", admin, { username, password: "pass1234", displayName: username, branchId: B1, branchIds: [B1], ...body });
  const row = async (id: number) => (await q(`SELECT role, extra_roles FROM system_users WHERE id = $1`, [id])).rows[0];
  //  جلسةُ موظّفٍ بأقلّ ما يلزم — والمِعترِضةُ الحيّة تملأ الدورَ والأدوارَ والصلاحياتِ من صفّه.
  const sess = (id: number) => hdr({ userId: id, displayName: "x", role: "reception", branchId: B1, accessibleBranches: [B1], isAdmin: false, permissions: {} });

  try {
    // ══ ب. نافذةُ المستخدم ════════════════════════════════════════════════
    console.log("\n── ب. نافذةُ المستخدم ──");
    const fadel = await create("mr-fadel", { roles: ["reception", "accountant"], canEnterSessions: true });
    same("ب.١ فاضل: محاسبٌ واستقبال يُنشأ", fadel.status, 200);
    same("ب.٢ …والأعلى «محاسب» والإضافيُّ «استقبال»", await row(fadel.json?.id), { role: "accountant", extra_roles: ["reception"] });
    const mgr = await create("mr-mgr", { roles: ["branch_manager", "reception"] });
    same("ب.٣ مديرٌ واستقبال ⟵ المديرُ وحده (يشمله)", await row(mgr.json?.id), { role: "branch_manager", extra_roles: [] });
    same("ب.٤ دورٌ مجهول في المصفوفة ⟵ ٤٠٠", (await create("mr-bad", { roles: ["accountant", "boss"] })).status, 400);
    const direct = await create("mr-direct", { role: "reception", extraRoles: ["admin"] });
    same("ب.٥ `extraRoles` من الطلب مباشرةً لا تُقبل — لا طريقَ خلفيّاً إلى المسؤول", await row(direct.json?.id), { role: "reception", extra_roles: [] });
    same("ب.٦ وتعديلُ `role` وحده (القارئ القديم) يُبقي الإضافية",
      (await call("PATCH", `/api/admin/users/${fadel.json?.id}`, admin, { role: "accountant" })).status, 200);
    same("ب.٧ …فتبقى «استقبال»", await row(fadel.json?.id), { role: "accountant", extra_roles: ["reception"] });
    same("ب.٨ وتعديلُ `roles` يستبدلها كلَّها",
      (await call("PATCH", `/api/admin/users/${direct.json?.id}`, admin, { roles: ["reception", "surveyor"] })).status, 200);
    same("ب.٩ …استقبالٌ واستبيانات", await row(direct.json?.id), { role: "reception", extra_roles: ["surveyor"] });
    same("ب.١٠ و`extraRoles` مع PATCH لا تُقبل",
      (await call("PATCH", `/api/admin/users/${direct.json?.id}`, admin, { extraRoles: ["admin"] })).status, 200);
    same("ب.١١ …فلا يتغيّر شيء", await row(direct.json?.id), { role: "reception", extra_roles: ["surveyor"] });
    const audits = (await q(`SELECT new_values FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1`, [direct.json?.id])).rows
      .map((a) => (typeof a.new_values === "string" ? JSON.parse(a.new_values) : a.new_values));
    check(audits.some((a) => JSON.stringify(a?.extraRoles) === JSON.stringify(["surveyor"])), "ب.١٢ تغييرُ الأدوار مكتوبٌ في سجلّ التدقيق", JSON.stringify(audits));

    // ══ ج. الجلسةُ الحيّة ════════════════════════════════════════════════
    console.log("\n── ج. الجلسةُ الحيّة ──");
    const me = (await call("GET", "/api/auth/user", sess(fadel.json?.id))).json;
    same("ج.١ `/api/auth/user` يحمل الأدوارَ كلَّها، الأعلى أوّلاً", [me?.role, me?.roles], ["accountant", ["accountant", "reception"]]);

    // ══ د. منحٌ بدورٍ إضافيّ ══════════════════════════════════════════════
    console.log("\n── د. منحٌ بدورٍ إضافيّ ──");
    const rec = await create("mr-rec", { roles: ["reception"], canEnterSessions: true });
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    same("د.١ استقبالٌ وحده لا يفتح دفترَ القاصة ⟵ ٤٠٣",
      (await call("GET", `/api/cash-book?branchId=${B1}&book=devices&date=${today}`, sess(rec.json?.id))).status, 403);
    check((await call("GET", `/api/cash-book?branchId=${B1}&book=devices&date=${today}`, sess(fadel.json?.id))).status !== 403,
      "د.٢ وفاضل (محاسبٌ واستقبال) يفتحه");
    //  الطبيبُ والخبيرُ أعلى رتبةً من المحاسب فيصيران الأساسيَّين — فالدورُ الإضافيُّ يُختبَر تحت مدير فرع.
    const accDoc = await create("mr-acc-doc", { roles: ["branch_manager", "doctor"], canWriteMedicalExam: false });
    same("د.٣أ مديرٌ هو طبيبٌ أيضاً: «طبيب» إضافيّ", await row(accDoc.json?.id), { role: "branch_manager", extra_roles: ["doctor"] });
    same("د.٣ …ويكتب المعاينة من دوره الإضافيّ (بلا علَمٍ مخزَّن)",
      (await call("GET", "/api/auth/user", sess(accDoc.json?.id))).json?.permissions?.canWriteMedicalExam, true);
    const accExp = await create("mr-acc-exp", { roles: ["branch_manager", "prosthetics_expert"], canWorkAsExpert: false });
    same("د.٤أ مديرٌ هو خبيرٌ أيضاً: «خبير» إضافيّ", await row(accExp.json?.id), { role: "branch_manager", extra_roles: ["prosthetics_expert"] });
    const experts = (await call("GET", `/api/manufacturing/experts?branchId=${B1}`, admin)).json ?? [];
    check(Array.isArray(experts) && experts.some((e: any) => e.id === accExp.json?.id),
      "د.٤ ويظهر في قائمة خبراء فرعه (بدوره الإضافيّ، بلا علَم)", JSON.stringify(experts));
    check(!experts.some((e: any) => e.id === fadel.json?.id), "د.٥ ولا يظهر فيها مَن ليس خبيراً");
    const mePerms = (await call("GET", "/api/auth/user", sess(accExp.json?.id))).json?.permissions;
    same("د.٦ وقدرةُ الخبير في جلسته", mePerms?.canWorkAsExpert, true);

    // ══ هـ. حصرٌ لا يضيّق على مَن له دورٌ آخر ═══════════════════════════════
    console.log("\n── هـ. حصرٌ ──");
    const yesterday = new Date(Date.now() - 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Baghdad" });
    const pastBody = { branchId: B1, sessionDate: yesterday, shift: "morning", counts: [] };
    same("هـ.١ الاستقبالُ وحده لا يُدخل جلساتِ الأمس ⟵ ٤٠٣",
      (await call("POST", "/api/session-tracking/daily/upsert", sess(rec.json?.id), pastBody)).status, 403);
    const fadelPast = await call("POST", "/api/session-tracking/daily/upsert", sess(fadel.json?.id), pastBody);
    check(fadelPast.status !== 403, "هـ.٢ وفاضل (محاسبٌ واستقبال) لا يُقيَّد بيوم اليوم", JSON.stringify(fadelPast));

    // ══ و. القواعدُ المشتركة ══════════════════════════════════════════════
    console.log("\n── و. القواعدُ المشتركة ──");
    const s = (role: string, extra: string[] = []) => ({ isAdmin: false, role, roles: [role, ...extra], permissions: {} });
    check(capabilitiesFor(s("accountant", ["doctor"])).has("medical"), "و.١ القدرات: محاسبٌ طبيبٌ يحمل «طبّي»");
    check(capabilitiesFor({ isAdmin: false, role: "accountant", extraRoles: ["branch_manager"], permissions: {} }).has("manager"),
      "و.٢ …ومن صفّ الحساب (`extraRoles`) كذلك");
    check(eligibleStaffEvents({ role: "accountant", extraRoles: ["doctor"] }).includes("exam_request"), "و.٣ تنبيهاتُ الطبيب تصل محاسباً طبيباً");
    same("و.٤ لقطةُ الدور في الطابور: الأعلى الذي له لقطة", actorRoleSnapshotOf(s("doctor", ["reception"])), "reception");
    check(canWriteCashBook(s("reception", ["accountant"])) && !canWriteCashBook(s("reception")), "و.٥ دفترُ القاصة بالمنح");
    check(canViewFollowup(s("surveyor", ["accountant"])), "و.٦ المتابعةُ بالمنح");
    same("و.٧ شاشةُ البدء: استقبالٌ وحده ⟵ سجلّ المرضى، ومعه محاسب ⟵ اللوحة",
      [landingPathOf(s("reception")), landingPathOf(s("accountant", ["reception"])), landingPathOf(s("doctor", ["reception"]))],
      ["/patients", null, "/my-exams"]);
    same("و.٨ والشريطُ يُخفي اللوحةَ بالقاعدة نفسِها", [hidesDashboard(s("reception")), hidesDashboard(s("accountant", ["reception"]))], [true, false]);
    same("و.٩ hasRole منحٌ وonlyRoles حصر",
      [hasRole(s("accountant", ["reception"]), "reception"), onlyRoles(s("accountant", ["reception"]), ["reception"]), onlyRoles(s("reception"), ["reception"])],
      [true, false, true]);
  } finally {
    httpServer.close();
    await cleanup();
    await pool.end();
  }
  console.log(failures ? `\n❌ ${failures} فشل` : "\n✅ كلُّ التأكيدات نجحت");
  process.exit(failures ? 1 : 0);
}
main().catch(async (e) => { console.error(e); process.exit(1); });
