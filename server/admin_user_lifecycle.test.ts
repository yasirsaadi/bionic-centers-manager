// دورةُ حياة حساب الموظّف — تعطيلٌ لا حذفٌ فعليّ (تصحيحٌ إنتاجيّ ٢٠٢٦-٠٩-١٢).
// `npm run test:admin-user-lifecycle`.
//
// ══ العطبُ الذي يحرسه ═══════════════════════════════════════════════════
// `DELETE /api/admin/users/:id` كان يحذف صفّ `system_users` فعلياً. أيّ
// موظّفٍ حقيقيّ يحمل تاريخاً (سجلّ تدقيق، تقدّمَ تدريب، …) يملك واحداً على
// الأقلّ من ٣٢ قيداً أجنبياً `NO ACTION` يشير إلى صفّه، فيُرفَض الحذفُ
// بخطأ قيدٍ — وذلك الخطأ كان يُرمى من معالجٍ غير متزامن (`throw err`) بدل
// `next(err)`، فلا يصل وسيطَ الأخطاء أبداً (Express 4 لا يلتقط رفضَ الوعود
// تلقائياً)، فيبقى طلبُ الحذف معلَّقاً بلا ردٍّ إلى الأبد.
//
// الإصلاح: المسارُ العاديّ يُعطّل الحسابَ (`is_active=false`) عبر نقطة
// PATCH الموجودة أصلاً (نفسُ منطق تحديث المستخدم، بلا تكرار)، ونقطةُ
// DELETE القديمة تفعل الشيء نفسه توافقاً رجعياً — لا حذفَ فعليّ في أيّ
// مسارٍ بعد اليوم. وكلا المعالجَين يُمرِّران أيّ خطأٍ غير متوقَّع عبر
// `next(err)` فلا يتعلّق طلبٌ أبداً مهما كان الخطأ.
//
// يشغّل تطبيقَ Express الحقيقيّ (مثل `ai_knowledge.test.ts`) فيختبر
// **المسار الحقيقيّ** لا دالّةً معزولة.

const DBURL = process.env.DATABASE_URL || "";
if (!/test|localhost|127\.0\.0\.1/.test(DBURL)) {
  console.error("Refusing to run: point DATABASE_URL at a LOCAL TEST database.");
  process.exit(1);
}

//  ══ يفحص تسجيلَ الدخول الحقيقيّ عبر HTTP — لا حقنَ جلسةٍ مُحاكاة هنا ═══
//  فيحتاج سرّاً حقيقياً لوسيط الجلسة قبل أن يُحمَّل `./routes` أصلاً.
process.env.SESSION_SECRET ||= "diag-admin-user-lifecycle-test-secret";

import express from "express";
import { createServer } from "http";
import bcrypt from "bcryptjs";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import { createArticle } from "./ai/knowledge/store";

let failures = 0;
function check(cond: boolean, msg: string, detail = "") {
  if (!cond) failures++;
  console.log(`${cond ? "✅" : "❌ FAIL"}  ${msg}${cond ? "" : `\n      ${detail}`}`);
}
function same(msg: string, got: unknown, expected: unknown) {
  check(JSON.stringify(got) === JSON.stringify(expected), msg,
    `expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(got)}`);
}

const PORT = 6920;
const BASE = `http://127.0.0.1:${PORT}`;

//  نطاقُ معرّفاتٍ محجوزٌ لهذا الملفّ وحده — لا تعارض مع ملفّاتٍ أخرى.
const B1 = 9945;
const ADMIN = 9946;
const EMPLOYEE = 9947; // المسارُ الجديد: PATCH {isActive:false}
const EMPLOYEE2 = 9948; // المسارُ القديم توافقاً رجعياً: DELETE
const MARK = "اختبار-دورة-حياة-الموظّف";
const PLAINTEXT_PASSWORD = "TestPass1234";

async function q(sqlText: string, params: any[] = []) {
  return pool.query(sqlText, params);
}

function sessionHeader(s: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(s)).toString("base64");
}

async function cleanup() {
  //  ══ الترتيبُ ملزم — عكسُ ترتيب الإنشاء تماماً ══════════════════════
  //  employee_training_progress يشير إلى training_modules/training_tracks
  //  فيُحذَف قبلهما، لا بعدهما (نفسُ الدرس الذي يحرسه هذا الفرعُ كلُّه:
  //  قيدٌ أجنبيّ NO ACTION يرفض حذفَ المُشار إليه قبل المُشير).
  await q(`DELETE FROM employee_training_progress WHERE user_id = ANY($1::int[])`, [[EMPLOYEE, EMPLOYEE2]]);
  await q(`DELETE FROM training_modules WHERE title LIKE $1`, [`${MARK}%`]);
  await q(`DELETE FROM training_tracks WHERE title LIKE $1`, [`${MARK}%`]);
  await q(`DELETE FROM ai_knowledge_articles WHERE title LIKE $1`, [`${MARK}%`]);
  await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [[ADMIN, EMPLOYEE, EMPLOYEE2]]);
  await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [[ADMIN, EMPLOYEE, EMPLOYEE2]]);
  await q(`DELETE FROM branches WHERE id = $1`, [B1]);
}

async function main() {
  await cleanup();

  await q(`INSERT INTO branches (id, name) VALUES ($1, 'فرع اختبار دورة الحياة') ON CONFLICT (id) DO NOTHING`, [B1]);

  const passwordHash = await bcrypt.hash(PLAINTEXT_PASSWORD, 10);
  await q(
    `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id, is_active)
     VALUES
       ($1, 'lc-admin', $4, 'مسؤول اختبار', 'admin', NULL, true),
       ($2, 'lc-employee', $4, 'موظّفٌ فعّال', 'reception', $5, true),
       ($3, 'lc-employee2', $4, 'موظّفٌ فعّالٌ آخر', 'reception', $5, true)
     ON CONFLICT (id) DO UPDATE SET is_active = true, password_hash = EXCLUDED.password_hash`,
    [ADMIN, EMPLOYEE, EMPLOYEE2, passwordHash, B1],
  );

  // ══ تاريخٌ حقيقيّ لـEMPLOYEE — ثلاثُ عائلاتِ قيودٍ أجنبية مختلفة ═══════
  // (أ) audit_log — مفتاحٌ مُختَبَرٌ سابقاً بأنه المُسبِّب الحتميّ للتعليق.
  const auditRow = await q(
    `INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id)
     VALUES ('patient', 1, 'create', $1, 'موظّفٌ فعّال', $2) RETURNING id`,
    [EMPLOYEE, B1],
  );
  // (ب) employee_training_progress — يحتاج مسار/وحدة تدريبٍ حقيقيَّين.
  const track = await q(
    `INSERT INTO training_tracks (title, description, created_by_name, approved_by_name)
     VALUES ($1, 'وصفٌ', 'مسؤول اختبار', 'مسؤول اختبار') RETURNING id`,
    [`${MARK} — مسار`],
  );
  const trackId = track.rows[0].id;
  const module_ = await q(
    `INSERT INTO training_modules (track_id, title, description) VALUES ($1, $2, 'وصفٌ') RETURNING id`,
    [trackId, `${MARK} — وحدة`],
  );
  const moduleId = module_.rows[0].id;
  await q(
    `INSERT INTO employee_training_progress (user_id, track_id, module_id, status)
     VALUES ($1, $2, $3, 'started')`,
    [EMPLOYEE, trackId, moduleId],
  );
  // (ج) ai_knowledge_articles.created_by — عائلةٌ ثالثة، بلا فهرس، وممثِّلةٌ
  // لأيّ عمودِ "created_by" آخر من الـ٢٧ غير المفهرسة.
  const article = await createArticle({
    title: `${MARK} — مقالة`, body: "متنٌ",
    scope: "general", branchId: null,
    actor: { userId: EMPLOYEE, name: "موظّفٌ فعّال", role: "reception", branchId: B1 },
  });

  const adminHeader = sessionHeader({ userId: ADMIN, displayName: "مسؤول اختبار", role: "admin", branchId: null, isAdmin: true, permissions: {} });

  const app = express();
  app.use(express.json());
  //  ══ جلسةٌ مُحاكاة — نفسُ حيلة ai_knowledge.test.ts، مع دالّة `destroy`
  //  حقيقية (وسيطُ «تحديث الصلاحيات حيّاً» ينادي `req.session.destroy` فعلياً
  //  عند حسابٍ عُطِّل، وهذا يحتاج كائناً يحمل الدالّة لا كائناً عادياً). ═══
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
    // ══ أ. تسجيلُ الدخول ينجح قبل التعطيل — خطُّ الأساس ═══════════════════
    console.log("\n── أ. تسجيلُ الدخول ينجح قبل التعطيل ──");
    const loginBefore = await fetch(`${BASE}/api/verify-branch`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchKey: "lc-employee", username: "lc-employee", password: PLAINTEXT_PASSWORD }),
    });
    check(loginBefore.status === 200, "أ.١ الموظّفُ الفعّال يدخل بنجاح قبل أيّ تعطيل", `status=${loginBefore.status}`);

    // ══ ب. التعطيلُ عبر المسار الجديد (PATCH {isActive:false}) ═══════════
    console.log("\n── ب. تعطيلُ EMPLOYEE عبر PATCH — المسارُ العاديّ الجديد ──");
    const patchRes = await fetch(`${BASE}/api/admin/users/${EMPLOYEE}`, {
      method: "PATCH", headers: { "content-type": "application/json", "x-test-session": adminHeader },
      body: JSON.stringify({ isActive: false }),
    });
    check(patchRes.status === 200, "ب.١ **الفعلُ يعود بنجاح — لا تعليق ولا خطأ**", `status=${patchRes.status}`);
    const patchBody = await patchRes.json();
    same("ب.٢ isActive صار false في الاستجابة", patchBody.isActive, false);

    // ══ ج. الصفّ نفسُه باقٍ، وكلُّ التاريخ سليم ═══════════════════════════
    console.log("\n── ج. صفّ system_users باقٍ، والتاريخ الثلاثيّ سليمٌ بلا مسّ ──");
    const [row] = (await q(`SELECT id, is_active, username FROM system_users WHERE id = $1`, [EMPLOYEE])).rows;
    check(!!row, "ج.١ **صفّ system_users لا يزال موجوداً** — لم يُحذَف");
    same("ج.٢ is_active = false فعلياً في القاعدة", row?.is_active, false);
    same("ج.٣ اسمُ المستخدم لم يتغيّر (لا محو ولا تحوير)", row?.username, "lc-employee");

    const [auditStill] = (await q(`SELECT id FROM audit_log WHERE id = $1`, [auditRow.rows[0].id])).rows;
    check(!!auditStill, "ج.٤ **سطرُ audit_log التاريخيّ باقٍ بلا مسّ**");
    const [trainingStill] = (await q(`SELECT id FROM employee_training_progress WHERE user_id = $1`, [EMPLOYEE])).rows;
    check(!!trainingStill, "ج.٥ **سطرُ employee_training_progress باقٍ بلا مسّ**");
    const [articleStill] = (await q(`SELECT id, created_by FROM ai_knowledge_articles WHERE id = $1`, [article.id])).rows;
    check(!!articleStill && articleStill.created_by === EMPLOYEE, "ج.٦ **مقالةُ المعرفة لا تزال تنسب إنشاءها للموظّف نفسِه**");

    // ══ د. لا قيدَ أجنبيّاً انتُهِك — لا استثناءَ سُجِّل، لا نصفَ كتابة ═══
    console.log("\n── د. لا خطأ قيدٍ أجنبيّ وقع إطلاقاً ──");
    check(true, "د.١ (مُثبَتٌ ضمنياً بنجاح ب.١ نفسِه — استجابةُ ٢٠٠ لا ٤٠٩/٥٠٠ تعني عدم وقوع 23503)");

    // ══ هـ. تسجيلُ الدخول يُرفَض بعد التعطيل — نفسُ بيانات الاعتماد بالضبط ═
    console.log("\n── هـ. تسجيلُ الدخول يُرفَض بعد التعطيل بنفس بيانات الاعتماد ──");
    const loginAfter = await fetch(`${BASE}/api/verify-branch`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchKey: "lc-employee", username: "lc-employee", password: PLAINTEXT_PASSWORD }),
    });
    check(loginAfter.status === 401, "هـ.١ **نفسُ اسم المستخدم وكلمة المرور يُرفَضان الآن (٤٠١)**", `status=${loginAfter.status}`);

    // ══ و. جلسةٌ مفتوحةٌ سلفاً تُقطَع فوراً على أوّل طلبٍ لاحق ═══════════
    // («تحديثُ الصلاحيات حيّاً» — آليّةٌ قائمة، غير معدَّلة في هذه المهمّة —
    // تعيد قراءة الصفّ قبل كلّ نقطة API وتقطع الجلسة إن صار isActive=false).
    console.log("\n── و. جلسةٌ سابقة لنفس الموظّف تُقطَع فوراً بعد التعطيل ──");
    const staleSessionHeader = sessionHeader({
      userId: EMPLOYEE, displayName: "موظّفٌ فعّال", role: "reception", branchId: B1, isAdmin: false, permissions: {},
    });
    //  ══ وسيطُ «تحديث الصلاحيات حيّاً» (registerRoutes، قبل أيّ مسار) يفحص
    //  كلَّ طلب /api بصرف النظر عن وجود مسارٍ مطابق له لاحقاً — فأيّ نقطةٍ
    //  حقيقية تكفي؛ نستعمل نقطة المستخدمين نفسَها (موجودةٌ يقيناً). ولو كانت
    //  الجلسةُ حيّةً فعلاً كانت النقطةُ سترُدّ ٤٠٣ (ليس مسؤولاً) لا ٤٠١ —
    //  فالفرقُ بين الرمزين هو الدليل، لا مجرّد فشل الطلب.
    const staleRes = await fetch(`${BASE}/api/admin/users`, { headers: { "x-test-session": staleSessionHeader } });
    check(staleRes.status === 401,
      "و.١ **الجلسةُ المفتوحة سلفاً تُقطَع الآن (٤٠١) — لا ٤٠٣ (الذي كان يعني جلسةً حيّةً بلا صلاحية إدارية فقط)**",
      `status=${staleRes.status}`);

    // ══ ز. التفعيلُ مجدداً يعمل — القدرةُ موجودةٌ أصلاً في نقطة PATCH ════
    console.log("\n── ز. إعادةُ تفعيل الحساب عبر نفس نقطة PATCH ──");
    const reactivateRes = await fetch(`${BASE}/api/admin/users/${EMPLOYEE}`, {
      method: "PATCH", headers: { "content-type": "application/json", "x-test-session": adminHeader },
      body: JSON.stringify({ isActive: true }),
    });
    check(reactivateRes.status === 200, "ز.١ إعادةُ التفعيل تنجح", `status=${reactivateRes.status}`);
    const loginAfterReactivate = await fetch(`${BASE}/api/verify-branch`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ branchKey: "lc-employee", username: "lc-employee", password: PLAINTEXT_PASSWORD }),
    });
    check(loginAfterReactivate.status === 200, "ز.٢ **ويستطيع الدخول مجدداً بنفس بيانات الاعتماد**", `status=${loginAfterReactivate.status}`);

    // ══ ح. المسارُ القديم DELETE — توافقٌ رجعيّ، تعطيلٌ لا حذف ═══════════
    console.log("\n── ح. DELETE القديم على موظّفٍ آخر له تاريخٌ — يُعطِّل لا يحذف ──");
    const auditRow2 = await q(
      `INSERT INTO audit_log (entity_type, entity_id, action, user_id, user_name, branch_id)
       VALUES ('patient', 1, 'create', $1, 'موظّفٌ فعّالٌ آخر', $2) RETURNING id`,
      [EMPLOYEE2, B1],
    );
    const deleteRes = await fetch(`${BASE}/api/admin/users/${EMPLOYEE2}`, {
      method: "DELETE", headers: { "x-test-session": adminHeader },
    });
    check(deleteRes.status === 200, "ح.١ **الفعلُ القديم يعود بنجاح — لا تعليق ولا خطأ**", `status=${deleteRes.status}`);
    const deleteBody = await deleteRes.json();
    same("ح.٢ الاستجابةُ تصرّح أن الفعل تعطيلٌ لا حذف", deleteBody.deactivated, true);
    const [row2] = (await q(`SELECT id, is_active FROM system_users WHERE id = $1`, [EMPLOYEE2])).rows;
    check(!!row2, "ح.٣ **صفّ system_users الثاني باقٍ أيضاً — DELETE لم يحذفه فعلياً**");
    same("ح.٤ is_active = false له أيضاً", row2?.is_active, false);
    const [auditStill2] = (await q(`SELECT id FROM audit_log WHERE id = $1`, [auditRow2.rows[0].id])).rows;
    check(!!auditStill2, "ح.٥ وسطرُ التدقيق التاريخيّ للموظّف الثاني باقٍ بلا مسّ");

    // ══ ط. حارسٌ معماريّ — لا db.delete(systemUsers) في مسار DELETE العاديّ
    console.log("\n── ط. حارسٌ معماريّ: لا استدعاءَ حذفٍ فعليّ في مسار DELETE ──");
    const fs = await import("fs");
    const src = fs.readFileSync(new URL("./routes.ts", import.meta.url), "utf8");
    const deleteHandlerIdx = src.indexOf('app.delete("/api/admin/users/:id"');
    const nextHandlerIdx = src.indexOf("app.", deleteHandlerIdx + 10);
    const deleteHandlerBody = src.slice(deleteHandlerIdx, nextHandlerIdx > -1 ? nextHandlerIdx : undefined);
    check(deleteHandlerIdx > -1, "ط.١ عُثر على معالج DELETE في المصدر");
    check(!deleteHandlerBody.includes("deleteSystemUser"),
      "ط.٢ **ولا يستدعي storage.deleteSystemUser إطلاقاً** — العملية الآن تعطيلٌ فقط");
    check(deleteHandlerBody.includes("updateSystemUser") && deleteHandlerBody.includes("isActive: false"),
      "ط.٣ **ويكتب isActive:false عبر updateSystemUser صراحةً**");
    check(deleteHandlerBody.includes("next(err)") && !/catch \(err\) \{\s*throw err;/.test(deleteHandlerBody),
      "ط.٤ **ويُمرِّر أيّ خطأٍ غير متوقَّع عبر next(err) — لا throw من معالجٍ غير متزامن**");
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
