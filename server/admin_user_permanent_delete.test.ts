// تبسيطُ إدارة الموظّفين — تعطيلٌ وتفعيلٌ وحذفٌ نهائيّ (٢٠٢٦-٠٩-١٨).
// `npm run test:admin-user-permanent-delete`.
//
// ══ ما يثبته، ولا شيءَ غيره ══════════════════════════════════════════════
//   (١) **تعطيلُ موظّفٍ فعّال** — الصفُّ باقٍ و`is_active=false`.
//   (٢) **إعادةُ تفعيله** — بنفس الباب، بقيمةٍ معاكسة.
//   (٣) **حذفٌ نهائيٌّ لموظّفٍ بلا تاريخ** — الصفُّ يزول فعلاً.
//   (٤) **ورفضُه لموظّفٍ له تاريخ** — ٤٠٩ بالرسالة العربية المطلوبة حرفياً،
//       **والصفُّ وتاريخُه باقيان بلا مسّ** (لا كاسكيد ولا تنظيف).
//   (٥) **وحسابُ المسؤول العام لا يُعطَّل ولا يُحذَف** من أيٍّ من الأبواب
//       الثلاثة (PATCH · DELETE القديم · DELETE /permanent).
//
// ══ ولماذا `/permanent` بابٌ ثانٍ ════════════════════════════════════════
// `DELETE /api/admin/users/:id` يُعطّل ولا يحذف (تصحيحٌ إنتاجيّ ٢٠٢٦-٠٩-١٢،
// يحرسه `test:admin-user-lifecycle`) — **ولم يُمَسّ بحرف هنا**. والحذفُ
// النهائيُّ نيّةٌ صريحة لها مسارُها باسمها، فلا تقع بالسهو.
//
// يشغّل تطبيقَ Express الحقيقيّ وينادي النقاطَ الحقيقية — لا دالّةً معزولة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

process.env.SESSION_SECRET ||= "admin-user-permanent-delete-test-secret";

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes } from "./routes";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6931;
const BASE = `http://127.0.0.1:${PORT}`;

//  نطاقُ معرّفاتٍ محجوزٌ لهذا الملفّ وحده.
const B1 = 9955;
const ADMIN = 9956;
const CLEAN = 9957;   // موظّفٌ بلا أيّ تاريخ — يُحذَف فعلاً
const HISTORIC = 9958; // موظّفٌ له سطرُ تدقيق — يُرفَض حذفُه
const ACTIVE_ONE = 9959; // يبقى فعّالاً — لإثبات حارس «عطّل أولاً»
const USERS = [ADMIN, CLEAN, HISTORIC, ACTIVE_ONE];

//  الرسالةُ المطلوبة حرفياً — تُقارَن بايتاً لا «تحتوي».
const FK_REFUSAL =
  "لا يمكن حذف هذا الموظف نهائياً لوجود سجل مرتبط به. يمكنك إبقاء الحساب معطلاً.";

async function q(sqlText: string, params: any[] = []) {
  return pool.query(sqlText, params);
}
function sessionHeader(s: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(s)).toString("base64");
}

/**
 * جسمُ الردّ إن كان JSON، و`{}` إن لم يكن.
 *
 * **ولماذا لا `res.json()` مباشرةً**: ردُّ خطأٍ غيرُ متوقَّع قد يصل صفحةَ
 * Express الافتراضية (HTML)، فيرمي `json()` ويُسقط `main()` كلَّها قبل أن
 * يُطبَع الملخّص — فيبدو الاختبارُ «متعطّلاً» بدل أن يقول أيُّ تأكيدٍ سقط.
 */
async function body(res: Response): Promise<any> {
  try { return await res.json(); } catch { return {}; }
}

async function cleanup() {
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM audit_log WHERE entity_type = 'system_user' AND entity_id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

/** حالةُ الصفّ الآن: موجودٌ؟ وفعّال؟ — بلا افتراضٍ عن أيّهما. */
async function rowState(id: number): Promise<{ exists: boolean; isActive: boolean | null }> {
  const { rows } = await q(`SELECT is_active FROM system_users WHERE id = $1`, [id]);
  return rows.length === 0
    ? { exists: false, isActive: null }
    : { exists: true, isActive: rows[0].is_active };
}

async function main() {
  await cleanup();
  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار إدارة الموظّفين') ON CONFLICT (id) DO NOTHING`, [B1]);

  const passwordHash = await bcrypt.hash("TestPass1234", 10);
  await q(
    `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active)
     VALUES
       ($1, 'pd-admin',    $5, 'مسؤول اختبار',      'admin',     NULL, true),
       ($2, 'pd-clean',    $5, 'موظّفٌ بلا تاريخ',   'reception', $6,   true),
       ($3, 'pd-historic', $5, 'موظّفٌ له تاريخ',    'reception', $6,   true),
       ($4, 'pd-active',   $5, 'موظّفٌ يبقى فعّالاً', 'reception', $6,   true)
     ON CONFLICT (id) DO UPDATE SET is_active = true`,
    [ADMIN, CLEAN, HISTORIC, ACTIVE_ONE, passwordHash, B1],
  );

  //  تاريخٌ حقيقيّ لـHISTORIC: سطرُ تدقيقٍ يشير إلى صفّه بقيدٍ أجنبيّ
  //  `NO ACTION` — وهو بعينه ما يجعل القاعدةَ ترفض الحذف بـ23503.
  const historyRow = await q(
    `INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id)
     VALUES ('patient', 1, 'create', $1, 'موظّفٌ له تاريخ', $2) RETURNING id`,
    [HISTORIC, B1],
  );
  const historyId = historyRow.rows[0].id;

  const adminHeader = sessionHeader({
    userId: ADMIN, displayName: "مسؤول اختبار", role: "admin",
    branchId: null, isAdmin: true, permissions: {},
  });
  const call = (method: string, path: string, body?: any) =>
    fetch(`${BASE}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-test-session": adminHeader },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const header = req.get("x-test-session");
    if (header) {
      try {
        const branchSession = JSON.parse(Buffer.from(header, "base64").toString("utf8"));
        req.session = { branchSession, destroy: (cb: () => void) => cb() };
      } catch { /* ignore */ }
    }
    next();
  });

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise<void>((r) => httpServer.once("listening", () => r()));

  try {
    // ══ أ. تعطيلُ موظّفٍ فعّال ═══════════════════════════════════════════
    console.log("\n── أ. تعطيلُ موظّفٍ فعّال ──");
    const beforeDeactivate = await rowState(CLEAN);
    same("أ.١ يبدأ فعّالاً", [beforeDeactivate.exists, beforeDeactivate.isActive], [true, true]);

    const deact = await call("PATCH", `/api/admin/users/${CLEAN}`, { isActive: false });
    same("أ.٢ **التعطيل ينجح (٢٠٠)**", deact.status, 200);
    const afterDeactivate = await rowState(CLEAN);
    same("أ.٣ **والصفُّ باقٍ ومُعطَّل فعلاً في القاعدة**",
      [afterDeactivate.exists, afterDeactivate.isActive], [true, false]);

    // ══ ب. إعادةُ تفعيله ═══════════════════════════════════════════════
    console.log("\n── ب. إعادةُ تفعيل موظّفٍ معطَّل ──");
    const react = await call("PATCH", `/api/admin/users/${CLEAN}`, { isActive: true });
    same("ب.١ **التفعيل ينجح (٢٠٠)**", react.status, 200);
    const afterReactivate = await rowState(CLEAN);
    same("ب.٢ **و`is_active` عاد true في القاعدة**",
      [afterReactivate.exists, afterReactivate.isActive], [true, true]);

    // ══ ج. الحذفُ النهائيّ يشترط التعطيل أوّلاً ══════════════════════════
    console.log("\n── ج. حسابٌ فعّال لا يُحذَف نهائياً قبل تعطيله ──");
    const tooSoon = await call("DELETE", `/api/admin/users/${ACTIVE_ONE}/permanent`);
    same("ج.١ **يُردّ ٤٠٩ — عطّله أوّلاً**", tooSoon.status, 409);
    const activeStill = await rowState(ACTIVE_ONE);
    same("ج.٢ **والصفُّ باقٍ فعّالاً بلا مسّ — صفرُ كتابة**",
      [activeStill.exists, activeStill.isActive], [true, true]);

    // ══ د. حذفٌ نهائيٌّ لموظّفٍ بلا تاريخ ════════════════════════════════
    console.log("\n── د. حذفٌ نهائيٌّ لموظّفٍ بلا أيّ سجلٍّ مرتبط ──");
    await call("PATCH", `/api/admin/users/${CLEAN}`, { isActive: false });
    const wiped = await call("DELETE", `/api/admin/users/${CLEAN}/permanent`);
    same("د.١ **الحذف ينجح (٢٠٠)**", wiped.status, 200);
    same("د.٢ والاستجابةُ تصرّح أنه حذفٌ لا تعطيل", (await body(wiped)).deleted, true);
    const goneRow = await rowState(CLEAN);
    same("د.٣ **وصفُّ system_users زال فعلاً من القاعدة**", goneRow.exists, false);

    const { rows: auditRows } = await q(
      `SELECT action FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1`, [CLEAN]);
    same("د.٤ **وسطرُ تدقيقٍ واحدٌ يشهد على الفعل الذي لا رجعةَ فيه**",
      auditRows.map((r: any) => r.action), ["delete"]);

    // ══ هـ. ورفضُه لموظّفٍ له تاريخ — بلا حذفٍ وبلا تنظيف ═══════════════
    console.log("\n── هـ. موظّفٌ له سجلٌّ مرتبط: يُرفَض الحذف ولا يُمَسّ شيء ──");
    await call("PATCH", `/api/admin/users/${HISTORIC}`, { isActive: false });
    const refused = await call("DELETE", `/api/admin/users/${HISTORIC}/permanent`);
    same("هـ.١ **يُردّ ٤٠٩**", refused.status, 409);
    same("هـ.٢ **بالرسالة العربية المطلوبة حرفياً — لا نصَّ قاعدةِ بياناتٍ خام**",
      (await body(refused)).message, FK_REFUSAL);

    const historicStill = await rowState(HISTORIC);
    same("هـ.٣ **والصفُّ باقٍ معطَّلاً — لا نصفَ حذف**",
      [historicStill.exists, historicStill.isActive], [true, false]);
    const { rows: historyStill } = await q(`SELECT id FROM audit_log WHERE id = $1`, [historyId]);
    same("هـ.٤ **وسطرُ التاريخ المرتبط باقٍ بلا مسّ — لا كاسكيد ولا تنظيف**",
      historyStill.length, 1);
    const { rows: noDeleteAudit } = await q(
      `SELECT id FROM audit_log WHERE entity_type = 'system_user' AND entity_id = $1`, [HISTORIC]);
    same("هـ.٥ **ولا سطرَ «حذف» كُتب لحذفٍ لم يقع**", noDeleteAudit.length, 0);

    // ══ و. حسابُ المسؤول العام — لا يُعطَّل ولا يُحذَف من أيّ باب ════════
    console.log("\n── و. حسابُ المسؤول العام محميٌّ في الأبواب الثلاثة ──");
    const adminPatch = await call("PATCH", `/api/admin/users/${ADMIN}`, { isActive: false });
    same("و.١ **PATCH {isActive:false} على المسؤول ⟶ ٤٠٣**", adminPatch.status, 403);

    const adminLegacyDelete = await call("DELETE", `/api/admin/users/${ADMIN}`);
    same("و.٢ **والبابُ القديم (تعطيل) ⟶ ٤٠٣**", adminLegacyDelete.status, 403);

    const adminPermanent = await call("DELETE", `/api/admin/users/${ADMIN}/permanent`);
    same("و.٣ **والحذفُ النهائيّ ⟶ ٤٠٣**", adminPermanent.status, 403);

    const adminRow = await rowState(ADMIN);
    same("و.٤ **وحسابُ المسؤول باقٍ فعّالاً بعد المحاولات الثلاث**",
      [adminRow.exists, adminRow.isActive], [true, true]);

    // ══ ز. البابُ للمسؤول العام وحده ═══════════════════════════════════
    console.log("\n── ز. غيرُ المسؤول لا يفتح بابَ الحذف النهائيّ ──");
    await call("PATCH", `/api/admin/users/${ACTIVE_ONE}`, { isActive: false });
    const staffHeader = sessionHeader({
      userId: HISTORIC, displayName: "موظّفٌ له تاريخ", role: "branch_manager",
      branchId: B1, isAdmin: false, permissions: {},
    });
    const byStaff = await fetch(`${BASE}/api/admin/users/${ACTIVE_ONE}/permanent`, {
      method: "DELETE", headers: { "x-test-session": staffHeader },
    });
    check(byStaff.status === 403 || byStaff.status === 401,
      "ز.١ **مديرُ فرعٍ يُردّ (٤٠٣/٤٠١) — لا يحذف حساباً**", `status=${byStaff.status}`);
    const survived = await rowState(ACTIVE_ONE);
    same("ز.٢ **والصفُّ باقٍ — صفرُ كتابة**", survived.exists, true);
  } finally {
    await cleanup();
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
