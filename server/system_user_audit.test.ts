// أثرُ تعديل حسابات الموظّفين في `audit_log` (٢٠٢٦-٠٩-٢٥).
// `npm run test:system-user-audit`.
//
// ══ ما يحرسه ═══════════════════════════════════════════════════════════
// حسابُ أيوب فقد ذي قار وحسابُ عناد فقد الموصل، ولم يُعرَف مَن ولا متى:
// نافذةُ إدارة المستخدمين (إنشاءٌ · تعديلٌ · تعطيل) لم تكتب سطرَ تدقيقٍ واحداً.
// فصار كلُّ حفظٍ يكتب ما تغيّر فعلاً بقيمته قبل وبعد — **وكلمةُ المرور لا
// تُكتب أبداً**، يُكتب أنها تغيّرت وحدَه.
//
// حيٌّ على Postgres وعلى النقاط الحقيقية (`registerRoutes`) بجلسةٍ محقونة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}
process.env.SESSION_SECRET ||= "system-user-audit-test-secret";

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { userAuditDiff, auditableUser } from "./system_user_audit";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6841;
const BASE = `http://127.0.0.1:${PORT}`;
//  نطاقٌ محجوزٌ لهذا الملفّ وحده.
const B1 = 8840, B2 = 8841;
const ADMIN = 8842, EMP = 8843, EMP2 = 8844, BOSS = 8845, MGR = 8846;
const NEW_USERNAME = "sua-created";
const OLD_PASSWORD = "OldPass1234";
const NEW_PASSWORD = "NewSecret9876";

async function q(sqlText: string, params: any[] = []) { return pool.query(sqlText, params); }
const header = (s: Record<string, unknown>) => Buffer.from(JSON.stringify(s)).toString("base64");

async function cleanup() {
  const created = await q(`SELECT id FROM system_users WHERE username = $1`, [NEW_USERNAME]);
  const ids = [ADMIN, EMP, EMP2, BOSS, MGR, ...created.rows.map((r: any) => r.id)];
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])
           OR (entity_type = 'system_user' AND entity_id = ANY($1::int[]))`, [ids]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [ids]);
  await q(`DELETE FROM branches WHERE id = ANY($1::int[])`, [[B1, B2]]);
}

async function auditRows(entityId: number) {
  const r = await q(`SELECT * FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1 ORDER BY id`, [entityId]);
  return r.rows.map((row: any) => ({
    ...row,
    old: row.old_values ? JSON.parse(row.old_values) : null,
    new: row.new_values ? JSON.parse(row.new_values) : null,
  }));
}

async function main() {
  // ══ أ. الدالّةُ الخالصة ══════════════════════════════════════════════════
  console.log("\n── أ. الفرقُ منطقاً ──");
  {
    const before = { id: 1, displayName: "أيوب", branchIds: [1, 2, 3], role: "prosthetics_expert",
      passwordHash: "h1", passwordPlain: "p1", updatedAt: "t1" };
    const after = { ...before, branchIds: [1, 3], updatedAt: "t2" };
    const d = userAuditDiff(before, after);
    same("أ.١ الفروعُ وحدها تُكتب — قبل وبعد", [d.oldValues, d.newValues],
      [{ branchIds: [1, 2, 3] }, { branchIds: [1, 3] }]);
    check(userAuditDiff(before, { ...before, updatedAt: "t9" }).empty,
      "أ.٢ حفظٌ بلا تغيير (والطابعُ وحده تغيّر) ⟶ لا شيء");
    check(userAuditDiff(before, { ...before, branchIds: [1, 2, 3] }).empty,
      "أ.٣ المصفوفةُ نفسُها بمرجعٍ جديد ليست تغييراً");
    const pw = userAuditDiff(before, { ...before, passwordHash: "h2", passwordPlain: "p2" });
    same("أ.٤ كلمةُ المرور ⟶ `passwordChanged` وحدَه", [pw.oldValues, pw.newValues], [{}, { passwordChanged: true }]);
    const flat = JSON.stringify([pw, auditableUser(before)]);
    check(!flat.includes("h1") && !flat.includes("h2") && !flat.includes("p1") && !flat.includes("p2"),
      "أ.٥ ولا تجزئةَ ولا نصَّ كلمة مرورٍ في أيّ ناتج", flat);
  }

  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'ذي قار اختبار'), ($2, 'بغداد اختبار')`, [B1, B2]);
  const hash = await bcrypt.hash(OLD_PASSWORD, 10);
  await q(`INSERT INTO system_users (id, username, password_hash, password_plain, display_name, role, branch_id, branch_ids, is_active)
           VALUES ($1, 'sua-admin', $5, $6, 'مسؤول الاختبار', 'admin', NULL, '[]'::jsonb, true),
                  ($2, 'sua-ayoub', $5, $6, 'أيوب الاختبار', 'prosthetics_expert', $7, $8::jsonb, true),
                  ($3, 'sua-anad', $5, $6, 'عناد الاختبار', 'prosthetics_expert', $7, $9::jsonb, true),
                  ($4, 'sua-boss', $5, $6, 'مسؤولٌ محميّ', 'admin', NULL, '[]'::jsonb, true),
                  ($10, 'sua-mgr', $5, $6, 'مديرٌ فعّال', 'branch_manager', $7, $9::jsonb, true)`,
    [ADMIN, EMP, EMP2, BOSS, hash, OLD_PASSWORD, B1, JSON.stringify([B1, B2]), JSON.stringify([B1]), MGR]);

  const adminS = header({ userId: ADMIN, displayName: "مسؤول الاختبار", role: "admin", branchId: null, isAdmin: true, permissions: {} });
  const mgrS = header({ userId: MGR, displayName: "ليس مسؤولاً", role: "branch_manager", branchId: B1, isAdmin: false,
    accessibleBranches: [B1], permissions: { canManageUsers: true } });

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
  const call = async (method: string, path: string, s: string, body?: unknown) => {
    const res = await fetch(BASE + path, {
      method, headers: { "content-type": "application/json", "x-test-session": s },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let json: any = null; try { json = await res.json(); } catch { /* empty */ }
    return { status: res.status, body: json };
  };
  const secretsAbsent = (rows: any[]) => {
    const flat = JSON.stringify(rows);
    return !flat.includes(OLD_PASSWORD) && !flat.includes(NEW_PASSWORD) && !flat.includes("$2") &&
      !/password(Hash|Plain)|password_(hash|plain)/.test(JSON.stringify(rows.map((r) => [r.old, r.new])));
  };

  try {
    // ══ ب. الإنشاء ══════════════════════════════════════════════════════════
    console.log("\n── ب. إنشاءُ حساب ──");
    const created = await call("POST", "/api/admin/users", adminS, {
      username: NEW_USERNAME, password: OLD_PASSWORD, displayName: "موظّفٌ جديد", role: "reception", branchIds: [B2],
    });
    same("ب.١ أُنشئ الحساب", created.status, 200);
    const newId = created.body?.id;
    const cRows = await auditRows(newId);
    same("ب.٢ سطرٌ واحد «create» باسم المسؤول ورقمه", cRows.map((r) => [r.action, r.user_id, r.user_name]),
      [["create", ADMIN, "مسؤول الاختبار"]]);
    same("ب.٣ وفيه الحسابُ كما حُفظ: الاسمُ والدورُ والفروع", [cRows[0]?.new?.username, cRows[0]?.new?.role, cRows[0]?.new?.branchIds],
      [NEW_USERNAME, "reception", [B2]]);
    check(secretsAbsent(cRows), "ب.٤ **ولا كلمةَ مرورٍ ولا تجزئتَها** في السطر", JSON.stringify(cRows));

    // ══ ج. واقعةُ أيوب: فرعٌ يُزال ═════════════════════════════════════════
    console.log("\n── ج. إزالةُ فرع (واقعةُ أيوب) ──");
    const p1 = await call("PATCH", `/api/admin/users/${EMP}`, adminS, { branchIds: [B2] });
    same("ج.١ حُفظ التعديل", p1.status, 200);
    const r1 = await auditRows(EMP);
    same("ج.٢ **سطرٌ يقول مَن ومتى**: «update» باسم المسؤول ورقمه", r1.map((r) => [r.action, r.user_id, r.user_name]),
      [["update", ADMIN, "مسؤول الاختبار"]]);
    check(!!r1[0]?.created_at, "ج.٣ وبوقته");
    same("ج.٤ **الفروعُ قبل وبعد** — ذي قار زالت", [r1[0]?.old?.branchIds, r1[0]?.new?.branchIds], [[B1, B2], [B2]]);
    same("ج.٥ والفرعُ الأساسيّ المطبَّع تغيّر معها فكُتب", [r1[0]?.old?.branchId, r1[0]?.new?.branchId], [B1, B2]);
    same("ج.٦ **ولا حقلَ لم يتغيّر**", Object.keys(r1[0]?.new ?? {}).sort(), ["branchId", "branchIds"]);

    // ══ د. حفظٌ بلا تغيير ═══════════════════════════════════════════════════
    console.log("\n── د. حفظٌ بلا تغيير ──");
    await call("PATCH", `/api/admin/users/${EMP}`, adminS, { branchIds: [B2], displayName: "أيوب الاختبار" });
    same("د.١ **لا سطرَ جديد** — لا ضجيجَ في السجلّ", (await auditRows(EMP)).length, 1);

    // ══ هـ. كلمةُ المرور ════════════════════════════════════════════════════
    console.log("\n── هـ. كلمةُ المرور ──");
    await call("PATCH", `/api/admin/users/${EMP}`, adminS, { password: NEW_PASSWORD });
    const r2 = await auditRows(EMP);
    same("هـ.١ سطرٌ يقول «تغيّرت» وحدَه", [r2.length, r2[1]?.old, r2[1]?.new], [2, {}, { passwordChanged: true }]);
    check(secretsAbsent(r2), "هـ.٢ **ولا الكلمةُ القديمة ولا الجديدة ولا تجزئتُهما**", JSON.stringify(r2[1]));

    // ══ و. الدورُ والصلاحيات ═══════════════════════════════════════════════
    console.log("\n── و. الدورُ والصلاحيات ──");
    await call("PATCH", `/api/admin/users/${EMP}`, adminS, { role: "branch_manager", canViewPayments: false, branchIds: [B2] });
    const r3 = (await auditRows(EMP))[2];
    same("و.١ الدورُ والصلاحيةُ معاً، قبل وبعد", [r3?.old?.role, r3?.new?.role, r3?.old?.canViewPayments, r3?.new?.canViewPayments],
      ["prosthetics_expert", "branch_manager", true, false]);

    // ══ ز. التعطيل — البابان ═══════════════════════════════════════════════
    console.log("\n── ز. التعطيل ──");
    await call("PATCH", `/api/admin/users/${EMP}`, adminS, { isActive: false });
    const r4 = (await auditRows(EMP))[3];
    same("ز.١ من نافذة التعديل: isActive صحيحٌ ⟵ خطأ", [r4?.old, r4?.new], [{ isActive: true }, { isActive: false }]);
    const del = await call("DELETE", `/api/admin/users/${EMP2}`, adminS);
    same("ز.٢ والبابُ القديم (DELETE) يُعطّل", del.status, 200);
    const r5 = await auditRows(EMP2);
    same("ز.٣ **ويكتب السطرَ نفسَه**", r5.map((r) => [r.action, r.user_id, r.old, r.new]),
      [["update", ADMIN, { isActive: true }, { isActive: false }]]);

    // ══ ح. المرفوضُ لا يكتب ═══════════════════════════════════════════════
    console.log("\n── ح. المرفوضُ لا يكتب ──");
    const denied = await call("PATCH", `/api/admin/users/${EMP2}`, mgrS, { branchIds: [B2] });
    same("ح.١ غيرُ المسؤول ⟶ ٤٠٣", denied.status, 403);
    same("ح.٢ ولا سطر", (await auditRows(EMP2)).length, 1);
    const prot = await call("PATCH", `/api/admin/users/${BOSS}`, adminS, { isActive: false });
    same("ح.٣ تعطيلُ حساب المسؤول العام ⟶ ٤٠٣", prot.status, 403);
    same("ح.٤ ولا سطر", (await auditRows(BOSS)).length, 0);

    // ══ ط. نافذةٌ قديمة لا تكتب فوق الجديد (٢٠٢٦-٠٩-٢٦) ══════════════════
    //  السيناريو بعينه: الحاسوبُ فتح القائمةَ، ثمّ أُضيف فرعٌ من الهاتف، ثمّ
    //  غيّر الحاسوبُ كلمةَ المرور من صفحته القديمة.
    console.log("\n── ط. النافذةُ القديمة ──");
    const listStamp = async (uid: number) =>
      ((await call("GET", "/api/admin/users", adminS)).body as any[]).find((u) => u.id === uid)?.updatedAt;
    const branchesOf = async (uid: number) =>
      (await q(`SELECT branch_ids b FROM system_users WHERE id=$1`, [uid])).rows[0]?.b;
    const onComputer = await listStamp(MGR);
    check(!!onComputer, "ط.١ (الإعداد: القائمةُ تحمل وقتَ آخر حفظ)", String(onComputer));
    const phone = await call("PATCH", `/api/admin/users/${MGR}`, adminS,
      { branchIds: [B1, B2], branchId: B1, expectedUpdatedAt: await listStamp(MGR) });
    same("ط.٢ الهاتفُ يضيف فرعاً", [phone.status, await branchesOf(MGR)], [200, [B1, B2]]);
    const rowsBefore = (await auditRows(MGR)).length;
    const stale = await call("PATCH", `/api/admin/users/${MGR}`, adminS,
      { password: NEW_PASSWORD, expectedUpdatedAt: onComputer });
    same("ط.٣ **حفظُ الحاسوب من صفحته القديمة يُردّ ٤٠٩**", [stale.status, stale.body?.code], [409, "stale_user_edit"]);
    same("ط.٤ **والفرعُ المضاف باقٍ** ولا سطرَ تدقيقٍ كُتب",
      [await branchesOf(MGR), (await auditRows(MGR)).length], [[B1, B2], rowsBefore]);
    const pwOnly = await call("PATCH", `/api/admin/users/${MGR}`, adminS,
      { password: NEW_PASSWORD, expectedUpdatedAt: await listStamp(MGR) });
    same("ط.٥ **وبعد إعادة الفتح: كلمةُ المرور وحدها تُحفَظ والفروعُ لا تُمَسّ**",
      [pwOnly.status, await branchesOf(MGR)], [200, [B1, B2]]);
    const roleOnly = await call("PATCH", `/api/admin/users/${MGR}`, adminS,
      { role: "reception", expectedUpdatedAt: await listStamp(MGR) });
    same("ط.٦ **تغييرُ الدور وحده يُقبَل** — الفرعُ يُقرأ من المخزَّن لا يُطلَب ثانيةً",
      [roleOnly.status, (await q(`SELECT role FROM system_users WHERE id=$1`, [MGR])).rows[0]?.role],
      [200, "reception"]);
    const noBranch = await call("PATCH", `/api/admin/users/${MGR}`, adminS,
      { branchIds: [], branchId: null, expectedUpdatedAt: await listStamp(MGR) });
    same("ط.٧ وإفراغُ الفروع لغير المسؤول ما زال يُردّ", noBranch.status, 400);
  } finally {
    await new Promise((r) => httpServer.close(() => r(null)));
    await cleanup();
    await pool.end();
  }

  console.log(`\n${failures === 0 ? "✅ كل الفحوص نجحت" : `❌ ${failures} فحصٌ فاشل`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(2); });
