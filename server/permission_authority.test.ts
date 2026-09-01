// الصلاحياتُ المخزَّنة سلطةٌ حيّة — لا الدور (إصلاحٌ 2026-09-01).
// حيّاً على Postgres وعلى النقاط الحقيقية. `npm run test:permission-authority`.
//
// ══ العطبُ الذي يغلقه ═══════════════════════════════════════════════════
// كان دورُ «مدير الفرع» يمنح كلَّ الصلاحيات الوظيفية تلقائياً (`grantAll`)
// عند تسجيل الدخول — بصرف النظر عمّا هو مخزَّنٌ فعلاً على صفّه، وبصرف
// النظر عن أيّ تعديلٍ لاحق من شاشة المستخدمين. فسحبُ صلاحيةٍ من مدير فرعٍ
// بعينه كان بلا أثر، والمنحُ نفسُه كان مُلقَطاً في الجلسة لحظةَ الدخول —
// تعديلٌ من الشاشة لا يسري إلا بخروجٍ وعودة.
//
// وما يُثبته هنا (السيناريوهات الخمسة المطلوبة تحديداً):
//   (١) **العَلَمُ مُطفَأٌ ⟶ مديرُ فرعٍ يُرفَض** — رغم دوره.
//   (٢) **العَلَمُ مُشعَلٌ ⟶ دورٌ آخر (استقبال) يُقبَل** — العَلَمُ لا الدور.
//   (٣) **عزلُ الفرع باقٍ كما هو** — صلاحيةٌ صحيحة لا تفتح فرعاً آخر.
//   (٤) **المسؤولُ العام بلا قيد** — حتى لو كان صفّه الشخصيّ يحمل كلَّ
//       الأعلام مُطفَأة صراحةً في القاعدة.
//   (٥) **سريانُ التغيير فوراً بلا خروجٍ وعودة** — نفسُ الجلسة (الهيدر)
//       بلا أيّ تعديل، والقاعدةُ وحدها تتغيّر بين الطلبين.
//
// وبابان مختلفان يثبتان معاً أن الإصلاح يعمل بنمطَيه:
//   **الفصل أ** — `GET /api/patients/:id/cases` (`canViewPatients`): كان
//   الفحصُ `isAdmin || role==='branch_manager' || canViewPatients` — أُزيل
//   منحُ الدور.
//   **الفصل ب** — `PUT /api/patients/:id` (`canEditPatients`): كان الفحصُ
//   نطاقَ الفرع فقط بلا أيّ عَلَمٍ إطلاقاً — أُضيف الشرطُ من الصفر.
//
// ══ لماذا الهيدرُ بلا `permissions` عمداً ═════════════════════════════════
// لو حمل هيدرُ الجلسة صلاحياتٍ جاهزة، لَما ثبت شيء: قد تكون هذه القيمُ هي
// ما يفتح الباب لا القاعدة. فكلُّ جلسةٍ غير إداريةٍ هنا **بلا** `permissions`
// إطلاقاً — فلا سبيل للنجاح إلا أن يُعيد الخادمُ بناءها حيّاً من صفّ
// `system_users` نفسِه على كل طلب (المِعترِضةُ الجديدة في `routes.ts`).

import express from "express";
import { createServer } from "http";
import { pool } from "./db";
import { registerRoutes } from "./routes";

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

const PORT = 6871;
const BASE = `http://127.0.0.1:${PORT}`;
const MARK = "اختبار-سلطة-الصلاحيات";
const TOKEN = "صلاحياتحيّة";
const ADMIN = 9931, MGR_NO = 9932, RECEPTION_YES = 9933, LIVE_USER = 9934;
const USERS = [ADMIN, MGR_NO, RECEPTION_YES, LIVE_USER];

// ══ جلساتٌ بلا `permissions` — القاعدةُ وحدها يجب أن تقرّر (انظر أعلاه) ══
const S: Record<string, any> = {
  admin: { userId: ADMIN, role: "admin", isAdmin: true, branchId: 0, accessibleBranches: [],
    displayName: "المسؤول" },
  mgrNo: { userId: MGR_NO, role: "branch_manager", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "مديرٌ بلا صلاحية مخزَّنة" },
  receptionYes: { userId: RECEPTION_YES, role: "reception", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "استقبالٌ بصلاحية مخزَّنة" },
  liveUser: { userId: LIVE_USER, role: "therapist", isAdmin: false, branchId: 1, accessibleBranches: [1],
    displayName: "معالجٌ — تعديلٌ حيّ" },
};

async function q<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const { rows } = await pool.query(text, params);
  return rows as T[];
}
async function http(method: string, path: string, session: any, body?: any) {
  //  ══ base64 — الأسماءُ العربية في الجلسة لا تصلح قيمةَ هيدرٍ مباشرة ══
  const res = await fetch(BASE + path, {
    method,
    headers: {
      "content-type": "application/json",
      "x-test-session": Buffer.from(JSON.stringify(session), "utf8").toString("base64"),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

async function mkPatient(label: string, branchId: number) {
  const r = await q<{ id: number }>(
    `INSERT INTO patients (name, phone, phone_e164, phone_status, referral_source, age,
       medical_condition, branch_id, total_cost, patient_classification)
     VALUES ($1,'07701234567','+9647701234567','ok',$2,'40','قبل الاختبار',$3,0,'new')
     RETURNING id`,
    [`${TOKEN} ${label}`, MARK, branchId]);
  return r[0].id;
}

async function setStoredFlags(userId: number, flags: { canView: boolean; canEdit: boolean }) {
  await q(
    `UPDATE system_users SET can_view_patients=$2, can_edit_patients=$3 WHERE id=$1`,
    [userId, flags.canView, flags.canEdit]);
}

async function cleanup() {
  const ids = `SELECT id FROM patients WHERE referral_source = '${MARK}'`;
  await q(`DELETE FROM patient_cases WHERE patient_id IN (${ids})`);
  await q(`DELETE FROM patients WHERE referral_source = '${MARK}'`);
}

async function main() {
  await q(`INSERT INTO branches (id,name) VALUES (1,'بغداد') ON CONFLICT DO NOTHING`);
  await q(`INSERT INTO branches (id,name) VALUES (2,'فرعٌ آخر') ON CONFLICT DO NOTHING`);
  for (const [id, role, name, branch, canView, canEdit] of [
    // المسؤولُ العام يحمل صفّاً شخصياً بأعلامٍ **مُطفَأة صراحةً** — ليثبت
    // القسمُ (د) أن `isAdmin` وحدَه يكفي، لا الأعلامَ المخزَّنة.
    [ADMIN, "admin", "المسؤول", 1, false, false],
    // مديرُ الفرع بلا الأعلام — كان الدورُ وحده يفتح البابَ قبل الإصلاح.
    [MGR_NO, "branch_manager", "مديرٌ بلا صلاحية مخزَّنة", 1, false, false],
    // استقبالٌ يحمل الأعلامَ صراحةً — يثبت أن العَلَمَ لا الدور هو الحَكَم.
    [RECEPTION_YES, "reception", "استقبالٌ بصلاحية مخزَّنة", 1, true, true],
    // يبدأ بلا الأعلام؛ يُبدَّل حيّاً أثناء الاختبار (القسم هـ).
    [LIVE_USER, "therapist", "معالجٌ — تعديلٌ حيّ", 1, false, false],
  ] as any[]) {
    await q(
      `INSERT INTO system_users (id, username, password_hash, display_name, role, branch_id,
         branch_ids, is_active, can_view_patients, can_edit_patients)
       VALUES ($1,$2,'x',$3,$4,$5,'[1]'::jsonb,true,$6,$7)
       ON CONFLICT (id) DO UPDATE SET role=EXCLUDED.role, display_name=EXCLUDED.display_name,
         branch_id=EXCLUDED.branch_id, branch_ids=EXCLUDED.branch_ids, is_active=true,
         can_view_patients=EXCLUDED.can_view_patients, can_edit_patients=EXCLUDED.can_edit_patients`,
      [id, `perm_auth_u${id}`, name, role, branch, canView, canEdit]);
  }
  await cleanup();

  const app = express();
  app.use(express.json());
  app.use((r: any, _res, next) => {
    const h = r.headers["x-test-session"];
    r.session = h
      ? { branchSession: JSON.parse(Buffer.from(String(h), "base64").toString("utf8")) }
      : {};
    next();
  });
  const realUse = app.use.bind(app);
  let skipped = 0;
  (app as any).use = (...args: any[]) => {
    if (args.length === 1 && typeof args[0] === "function" && args[0].name === "session") { skipped++; return app; }
    return realUse(...(args as [any]));
  };
  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  httpServer.listen(PORT);
  await new Promise((r) => httpServer.once("listening", r));

  try {
    check(skipped === 1, "جدول النقاط الحقيقي مُركَّب", String(skipped));

    const pBranch1 = await mkPatient("مريضٌ في الفرع الأول", 1);
    const pBranch2 = await mkPatient("مريضٌ في الفرع الثاني", 2);

    // ══ أ. `canViewPatients` وحدها — لا منحَ دورٍ (GET /cases) ══════════
    console.log("\n── أ. GET /api/patients/:id/cases — canViewPatients لا الدور ──");
    const viewDenied = await http("GET", `/api/patients/${pBranch1}/cases`, S.mgrNo);
    same("أ١. **مديرُ فرعٍ بلا canViewPatients مخزَّنة ⟶ ٤٠٣** رغم دوره",
      viewDenied.status, 403);

    const viewAllowed = await http("GET", `/api/patients/${pBranch1}/cases`, S.receptionYes);
    same("أ٢. **واستقبالٌ بـ canViewPatients=true مخزَّنة ⟶ ٢٠٠** — العَلَمُ لا الدور",
      viewAllowed.status, 200);

    // ══ ب. `canEditPatients` — بابٌ جديد كلّياً (PUT /api/patients/:id) ═══
    console.log("\n── ب. PUT /api/patients/:id — canEditPatients لا الدور (شرطٌ جديد) ──");
    const editDenied = await http("PUT", `/api/patients/${pBranch1}`, S.mgrNo,
      { medicalCondition: "محاولةُ مديرٍ بلا صلاحية" });
    same("ب١. **مديرُ فرعٍ بلا canEditPatients مخزَّنة ⟶ ٤٠٣** رغم دوره",
      editDenied.status, 403);
    const stillOld1 = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch1]))[0];
    same("ب٢. **ولم يتغيّر شيء في القاعدة**", stillOld1?.medical_condition, "قبل الاختبار");

    const editAllowed = await http("PUT", `/api/patients/${pBranch1}`, S.receptionYes,
      { medicalCondition: "عدّله الاستقبال بصلاحيته" });
    same("ب٣. **واستقبالٌ بـ canEditPatients=true مخزَّنة ⟶ ٢٠٠**", editAllowed.status, 200);
    const changedRow = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch1]))[0];
    same("ب٤. **والحقلُ تغيّر فعلاً**", changedRow?.medical_condition, "عدّله الاستقبال بصلاحيته");

    // ══ ج. عزلُ الفرع باقٍ كما هو ═══════════════════════════════════════
    console.log("\n── ج. عزلُ الفرع لم يضعف ──");
    const crossBranch = await http("PUT", `/api/patients/${pBranch2}`, S.receptionYes,
      { medicalCondition: "محاولةُ عبور فرع" });
    same("ج١. **واستقبالٌ بصلاحيةٍ صحيحة لمريضٍ خارج فرعه ⟶ ٤٠٣**", crossBranch.status, 403);
    const untouchedBranch2 = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pBranch2]))[0];
    same("ج٢. **ولم يتغيّر شيء**", untouchedBranch2?.medical_condition, "قبل الاختبار");

    // ══ د. المسؤولُ العام بلا قيد — ولو كان صفّه الشخصيّ يقول «لا» ═══════
    console.log("\n── د. المسؤولُ بلا قيدٍ رغم أعلامه الشخصية المُطفَأة ──");
    const [adminRow] = await q<{ can_view_patients: boolean; can_edit_patients: boolean }>(
      `SELECT can_view_patients, can_edit_patients FROM system_users WHERE id=$1`, [ADMIN]);
    same("   تمهيد: صفُّ المسؤول نفسُه يحمل الأعلامَ مُطفَأةً صراحةً في القاعدة",
      [adminRow.can_view_patients, adminRow.can_edit_patients], [false, false]);

    const adminView = await http("GET", `/api/patients/${pBranch2}/cases`, S.admin);
    same("د١. **والمسؤولُ يرى حتى مع أعلامٍ مُطفَأة على صفّه ⟶ ٢٠٠**", adminView.status, 200);
    const adminEdit = await http("PUT", `/api/patients/${pBranch2}`, S.admin,
      { medicalCondition: "عدّله المسؤول" });
    same("د٢. **ويعدّل كذلك ⟶ ٢٠٠**", adminEdit.status, 200);

    // ══ هـ. سريانُ التغيير فوراً — بلا خروجٍ وعودة ═══════════════════════
    console.log("\n── هـ. سريانُ التغيير بلا إعادة تسجيل دخول ──");
    const pLive = await mkPatient("مريضُ الاختبار الحيّ", 1);

    const before = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "محاولةٌ أولى" });
    same("هـ١. **بادئ ذي بدء: العَلَمُ مُطفَأٌ في القاعدة ⟶ ٤٠٣**", before.status, 403);

    // نفسُ الجلسة (`S.liveUser`) بلا أيّ تعديل — القاعدةُ وحدها تتغيّر،
    // تماماً كما يفعل المسؤول من شاشة المستخدمين بينما المستخدم لا يزال
    // في جلسته الحالية.
    await setStoredFlags(LIVE_USER, { canView: true, canEdit: true });
    const after = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "نجحت بعد تفعيل العَلَم" });
    same("هـ٢. **ونفسُ الجلسة بالضبط، فوراً بعد التفعيل ⟶ ٢٠٠ — بلا خروجٍ ولا دخول**",
      after.status, 200);
    const liveRowAfterOn = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pLive]))[0];
    same("هـ٣. **والتعديلُ نفذ فعلاً**", liveRowAfterOn?.medical_condition, "نجحت بعد تفعيل العَلَم");

    // والاتجاهُ المعاكس أيضاً — سحبُ الصلاحية يسري فوراً كذلك.
    await setStoredFlags(LIVE_USER, { canView: true, canEdit: false });
    const afterOff = await http("PUT", `/api/patients/${pLive}`, S.liveUser,
      { medicalCondition: "محاولةٌ بعد سحب الصلاحية" });
    same("هـ٤. **وسحبُ الصلاحية يسري فوراً أيضاً ⟶ ٤٠٣ من جديد، بنفس الجلسة**",
      afterOff.status, 403);
    const liveRowAfterOff = (await q<{ medical_condition: string }>(
      `SELECT medical_condition FROM patients WHERE id=$1`, [pLive]))[0];
    same("هـ٥. **ولم يتغيّر شيء بعد السحب**",
      liveRowAfterOff?.medical_condition, "نجحت بعد تفعيل العَلَم");
  } finally {
    await cleanup();
    await q(`DELETE FROM audit_log WHERE user_id = ANY($1::int[])`, [USERS]);
    await q(`DELETE FROM system_users WHERE id = ANY($1::int[])`, [USERS]);
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
